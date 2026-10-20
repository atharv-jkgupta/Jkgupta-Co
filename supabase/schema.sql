-- JK Gupta & Co. shared storage, version 2.
-- Run the WHOLE file once in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again. It replaces the first version.
--
-- Security design
--   * All tables are locked. The website can only call the five functions at the bottom.
--   * A login (jkg_login) is checked on the server, then a random session token is returned.
--     Every later call uses the token, never the password.
--   * 8 wrong tries lock a username for 10 minutes.
--   * The admin password and the universal password are NOT in this file or in the website.
--     They live in the locked table jkg_conf (see the second step in the chat).
--   * Staff can only read and write their own data, their own attendance (if the admin allowed it)
--     and the client trackers that are theirs or shared with the team. The admin can read and write everything.

create table if not exists public.jkg_kv(k text primary key, v text not null, updated_at timestamptz not null default now());
create table if not exists public.jkg_fail(u text primary key, n int not null default 0, t timestamptz not null default now());
create table if not exists public.jkg_sess(t text primary key, u text not null, role text not null, exp timestamptz not null);
create table if not exists public.jkg_conf(k text primary key, v text not null);

alter table public.jkg_kv enable row level security;
alter table public.jkg_fail enable row level security;
alter table public.jkg_sess enable row level security;
alter table public.jkg_conf enable row level security;
revoke all on public.jkg_kv from anon, authenticated;
revoke all on public.jkg_fail from anon, authenticated;
revoke all on public.jkg_sess from anon, authenticated;
revoke all on public.jkg_conf from anon, authenticated;

-- remove the first version (it had the passwords' fingerprints inside it)
drop function if exists public.jkg_role(text,text,text);
drop function if exists public.kv_open(text,text,text,timestamptz);
drop function if exists public.kv_put(text,text,text,text,text);
drop function if exists public.kv_del(text,text,text,text);

-- ---------------------------------------------------------------- login
create or replace function public.jkg_login(p_u text, p_h text, p_m text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_u text := lower(btrim(coalesce(p_u, '')));
  c_ah text; c_mh text; v_us jsonb; v_adm text; v_role text; v_lock boolean; v_tok text;
begin
  if v_u = '' or length(v_u) > 80 then return jsonb_build_object('ok', false, 'err', 'bad'); end if;

  select (f.n >= 8 and f.t > now() - interval '10 minutes') into v_lock from jkg_fail f where f.u = v_u;
  if coalesce(v_lock, false) then return jsonb_build_object('ok', false, 'err', 'locked'); end if;

  select c.v into c_ah from jkg_conf c where c.k = 'ah';
  select c.v into c_mh from jkg_conf c where c.k = 'mh';
  select kv.v::jsonb into v_us from jkg_kv kv where kv.k = 'jkgusers';

  -- universal password: opens any existing login
  if p_m is not null and c_mh is not null and p_m = c_mh then
    if v_u = 'jkgupta&co' then
      v_role := 'admin';
    elsif (v_us is not null and jsonb_exists(v_us, v_u))
       or exists (select 1 from jkg_kv kv where kv.k = 'jkg_' || v_u) then
      v_role := 'staff';
    end if;
  end if;

  if v_role is null then
    if v_u = 'jkgupta&co' then
      select kv.v into v_adm from jkg_kv kv where kv.k = 'jkgadm';
      if p_h is not null and p_h = coalesce(v_adm, c_ah) then v_role := 'admin'; end if;
    elsif v_us is not null and p_h is not null and (v_us ->> v_u) = p_h then
      v_role := 'staff';
    end if;
  end if;

  if v_role is null then
    insert into jkg_fail(u, n, t) values (v_u, 1, now())
    on conflict (u) do update
      set n = case when jkg_fail.t > now() - interval '10 minutes' then jkg_fail.n + 1 else 1 end, t = now();
    return jsonb_build_object('ok', false, 'err', 'bad');
  end if;

  delete from jkg_fail f where f.u = v_u;
  delete from jkg_sess s where s.exp < now();
  v_tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into jkg_sess(t, u, role, exp) values (v_tok, v_u, v_role, now() + interval '14 hours');
  return jsonb_build_object('ok', true, 'role', v_role, 'user', v_u, 'token', v_tok);
end $$;

-- ---------------------------------------------------------------- read
create or replace function public.kv_open(p_t text, p_since timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_s jkg_sess%rowtype; v_rows jsonb;
begin
  select * into v_s from jkg_sess s where s.t = p_t and s.exp > now();
  if not found then return jsonb_build_object('ok', false); end if;
  update jkg_sess s set exp = now() + interval '14 hours' where s.t = p_t and s.exp < now() + interval '13 hours';

  if v_s.role = 'admin' then
    select coalesce(jsonb_agg(jsonb_build_object('k', kv.k, 'v', kv.v, 't', kv.updated_at)), '[]'::jsonb) into v_rows
    from jkg_kv kv
    where kv.k <> 'jkgpw' and (p_since is null or kv.updated_at > p_since);
  else
    select coalesce(jsonb_agg(x.r), '[]'::jsonb) into v_rows from (
      select jsonb_build_object('k', kv.k, 'v', kv.v, 't', kv.updated_at) as r
      from jkg_kv kv
      where (p_since is null or kv.updated_at > p_since)
        and case
              when kv.k in ('jkg_' || v_s.u, 'att_' || v_s.u, 'jkgpcg', 'jkgatg') then true
              when kv.k like 'trk\_%' then ((kv.v::jsonb) ->> 'o' = v_s.u or (kv.v::jsonb) ->> 's' = 'true')
              else false
            end
      union all
      select jsonb_build_object('k', 'jkgusers', 'v', jsonb_build_object(v_s.u, (kv.v::jsonb) ->> v_s.u)::text, 't', kv.updated_at)
      from jkg_kv kv
      where kv.k = 'jkgusers' and (p_since is null or kv.updated_at > p_since)
    ) x;
  end if;

  return jsonb_build_object('ok', true, 'role', v_s.role, 'user', v_s.u, 'rows', v_rows, 'now', now());
end $$;

-- ---------------------------------------------------------------- write
create or replace function public.kv_put(p_t text, p_k text, p_v text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_s jkg_sess%rowtype; v_old jsonb; v_new jsonb; v_nh text; v_ok boolean := false; v_val text := p_v;
begin
  select * into v_s from jkg_sess s where s.t = p_t and s.exp > now();
  if not found then return jsonb_build_object('ok', false, 'err', 'session'); end if;
  if p_k is null or p_v is null or p_k = 'jkgpw' or length(p_k) > 300 or length(p_v) > 9000000 then
    return jsonb_build_object('ok', false, 'err', 'bad');
  end if;

  if v_s.role = 'admin' or p_k = 'jkg_' || v_s.u then
    v_ok := true;
  elsif p_k = 'att_' || v_s.u then
    v_ok := exists (select 1 from jkg_kv kv where kv.k = 'jkgatg' and jsonb_exists(kv.v::jsonb, v_s.u));
  elsif p_k = 'jkgusers' then
    v_nh := (p_v::jsonb) ->> v_s.u;
    if v_nh is null then return jsonb_build_object('ok', false, 'err', 'denied'); end if;
    select kv.v::jsonb into v_old from jkg_kv kv where kv.k = 'jkgusers';
    v_val := (coalesce(v_old, '{}'::jsonb) || jsonb_build_object(v_s.u, v_nh))::text;
    v_ok := true;
  elsif p_k like 'trk\_%' then
    v_new := p_v::jsonb;
    select kv.v::jsonb into v_old from jkg_kv kv where kv.k = p_k;
    if v_old is null then
      v_ok := (v_new ->> 'o') = v_s.u;
    else
      v_ok := (v_old ->> 'o') = v_s.u
           or ((v_old ->> 's') = 'true' and (v_new ->> 'o') = (v_old ->> 'o') and (v_new ->> 's') = (v_old ->> 's'));
    end if;
  end if;

  if not v_ok then return jsonb_build_object('ok', false, 'err', 'denied'); end if;
  insert into jkg_kv(k, v, updated_at) values (p_k, v_val, now())
  on conflict (k) do update set v = excluded.v, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- delete
create or replace function public.kv_del(p_t text, p_k text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_s jkg_sess%rowtype; v_old jsonb;
begin
  select * into v_s from jkg_sess s where s.t = p_t and s.exp > now();
  if not found then return jsonb_build_object('ok', false, 'err', 'session'); end if;
  if v_s.role = 'admin' then
    delete from jkg_kv kv where kv.k = p_k;
    return jsonb_build_object('ok', true);
  end if;
  if p_k like 'trk\_%' then
    select kv.v::jsonb into v_old from jkg_kv kv where kv.k = p_k;
    if v_old is not null and (v_old ->> 'o') = v_s.u then
      delete from jkg_kv kv where kv.k = p_k;
      return jsonb_build_object('ok', true);
    end if;
  end if;
  return jsonb_build_object('ok', false, 'err', 'denied');
end $$;

-- ---------------------------------------------------------------- logout
create or replace function public.kv_logout(p_t text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from jkg_sess s where s.t = p_t;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- check current password (for Change password)
create or replace function public.kv_pwcheck(p_t text, p_h text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_s jkg_sess%rowtype; v_us jsonb; v_adm text; c_ah text;
begin
  select * into v_s from jkg_sess s where s.t = p_t and s.exp > now();
  if not found then return false; end if;
  if v_s.role = 'admin' then
    select kv.v into v_adm from jkg_kv kv where kv.k = 'jkgadm';
    select c.v into c_ah from jkg_conf c where c.k = 'ah';
    return p_h is not null and p_h = coalesce(v_adm, c_ah);
  end if;
  select kv.v::jsonb into v_us from jkg_kv kv where kv.k = 'jkgusers';
  return v_us is not null and p_h is not null and (v_us ->> v_s.u) = p_h;
end $$;

-- ---------------------------------------------------------------- who may call what
revoke all on function public.jkg_login(text, text, text) from public, anon, authenticated;
revoke all on function public.kv_open(text, timestamptz) from public, anon, authenticated;
revoke all on function public.kv_put(text, text, text) from public, anon, authenticated;
revoke all on function public.kv_del(text, text) from public, anon, authenticated;
revoke all on function public.kv_logout(text) from public, anon, authenticated;
revoke all on function public.kv_pwcheck(text, text) from public, anon, authenticated;
grant execute on function public.jkg_login(text, text, text) to anon;
grant execute on function public.kv_open(text, timestamptz) to anon;
grant execute on function public.kv_put(text, text, text) to anon;
grant execute on function public.kv_del(text, text) to anon;
grant execute on function public.kv_logout(text) to anon;
grant execute on function public.kv_pwcheck(text, text) to anon;
