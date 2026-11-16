/* JK Gupta & Co. - JKG Box
   One simple place for all mail and notices read from Gmail. Newest first.
   Uses the live site's own colours. Nothing here can send an email.
   Needs /mail-inbox.js (loaded by itself when a mail is opened).
   If that file cannot load, a built-in summary window opens instead, so a tap never does nothing. */
(function () {
  'use strict';
  if (window.__jkgLoaded) return; window.__jkgLoaded = true;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var tok = function () { try { return (JSON.parse(sessionStorage.getItem('jkgc') || 'null') || {}).t || ''; } catch (e) { return ''; } };
  var todayIso = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var daysTo = function (iso) { if (!iso) return null; return Math.round((Date.parse(iso.slice(0, 10) + 'T00:00:00') - Date.parse(todayIso() + 'T00:00:00')) / 86400000); };
  var when = function (iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  async function rpc(fn, body) {
    var h = { apikey: CLOUD.key, 'Content-Type': 'application/json' };
    if (/^eyJ/.test(CLOUD.key)) h.Authorization = 'Bearer ' + CLOUD.key;
    var r = await fetch(CLOUD.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('The server answered ' + r.status);
    var j = await r.json();
    if (j && j.ok === false) throw new Error(j.err === 'login' ? 'Your login has expired. Please log in again.' : (j.err || 'The server refused this'));
    return j;
  }

  var ST = { items: [], state: {}, me: {}, err: '', tab: 'all', q: '', loaded: false, at: 0, timer: null, loading: false };
  var RANK = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
  var isOpen = function (x) { return !/^(filed|completed)$/i.test(x.case_status || ''); };
  var byNew = function (a, b) { return new Date(b.received_at || 0) - new Date(a.received_at || 0); };
  var rank = function (x) { return RANK[x.priority] === undefined ? 2 : RANK[x.priority]; };

  var isDel = function (x) { return !!x.deleted_at; };
  var isAdm = function () { return !!(ST.me && ST.me.role === 'admin'); };
  var isNotice = function (x) { return /notice/i.test(x.category || '') && !/^suspicious/i.test(x.category || ''); };
  function counts() {
    var a = ST.items.filter(function (x) { return !isDel(x); });
    return {
      all: a.length,
      act: a.filter(function (x) { return x.requires_action && isOpen(x); }).length,
      notice: a.filter(isNotice).length,
      del: ST.items.length - a.length
    };
  }
  function shown() {
    var q = ST.q.toLowerCase();
    var a = ST.items.filter(function (x) {
      if (ST.tab === 'del') { if (!isDel(x)) return false; } else if (isDel(x)) return false;
      if (ST.tab === 'act' && !(x.requires_action && isOpen(x))) return false;
      if (ST.tab === 'notice' && !isNotice(x)) return false;
      if (q && (x.subject + ' ' + x.from_address + ' ' + x.from_name + ' ' + x.summary + ' ' + JSON.stringify(x.facts || {})).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    a.sort(ST.tab === 'act' ? function (m, n) { return rank(m) - rank(n) || byNew(m, n); } : byNew);
    return a;
  }

  /* ---------- look: the live site's own colours ---------- */
  function css() {
    if ($('jkg-css')) return;
    var s = document.createElement('style'); s.id = 'jkg-css';
    s.textContent = [
      '.jb-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin:6px 0 14px}',
      '.jb-top h1{margin:0;font:700 28px var(--serif,Georgia,serif);color:var(--ink)}.jb-top p{margin:3px 0 0;color:var(--mute);font-size:14px}',
      '.jb-act{display:flex;gap:8px;flex-wrap:wrap}',
      '.jb-btn{font:600 14px var(--sans,Inter,system-ui,sans-serif);padding:10px 16px;min-height:42px;border-radius:10px;border:1px solid var(--line);background:var(--s1);color:var(--ink);cursor:pointer}',
      '.jb-btn.p{background:var(--pri);color:var(--priink);border-color:var(--pri)}',
      '.jb-st{font-size:12.5px;color:var(--mute);margin:0 0 10px}.jb-st b{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--ok);margin-right:6px}.jb-st.bad b{background:var(--warn)}',
      '.jb-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}',
      '.jb-tab{font:600 14px var(--sans,Inter,system-ui,sans-serif);padding:9px 16px;border-radius:30px;border:1px solid var(--line);background:var(--s1);color:var(--ink);cursor:pointer}',
      '.jb-tab.on{background:var(--pri);color:var(--priink);border-color:var(--pri)}.jb-tab i{font-style:normal;opacity:.75;margin-left:6px;font-weight:500}',
      '.jb-list{border:1px solid var(--line);border-radius:14px;background:var(--s1);overflow:hidden}',
      '.jb-row{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:12px;padding:14px 16px;border-top:1px solid var(--line);cursor:pointer;align-items:start}',
      '.jb-row:first-child{border-top:0}.jb-row:hover{background:var(--s2)}',
      '.jb-dot{width:10px;height:10px;border-radius:50%;margin-top:6px;background:var(--line2,var(--line))}.jb-dot.u{background:#e5484d}.jb-dot.h{background:#f0a23a}',
      '.jb-t{font-weight:700;font-size:15px;color:var(--ink);line-height:1.35}.jb-s{font-size:12.5px;color:var(--mute);margin-top:2px}',
      '.jb-d{font-size:13px;color:var(--mute);margin-top:4px;line-height:1.45;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.jb-r{text-align:right;font-size:12.5px;color:var(--mute);white-space:nowrap}.jb-r b{display:block;font-size:14px;color:var(--ink)}.jb-r b.red{color:#e5484d}.jb-r b.amber{color:#d98a1c}',
      '.jb-tag{display:inline-block;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:20px;border:1px solid var(--line);color:var(--mute);margin-right:6px}',
      '.jb-empty{padding:28px 16px;text-align:center;color:var(--mute)}',
      '.jb-home{display:flex;align-items:center;gap:14px;width:100%;text-align:left;margin:0 0 16px;padding:16px 18px;border-radius:14px;border:2px solid var(--pri);background:var(--s1);color:var(--ink);cursor:pointer}',
      '.jb-home .jb-ic{width:46px;height:46px;border-radius:12px;background:var(--pri);color:var(--priink);display:grid;place-items:center;font-size:22px;flex:none}',
      '.jb-home .jb-tx{flex:1;min-width:0}.jb-home b{display:block;font-size:19px}.jb-home small{display:block;color:var(--mute);font-size:13px;margin-top:2px}.jb-home .jb-go{font-weight:700;color:var(--pri)}',
      /* buttons inside the opened mail */
      '#mi-modal .ni-btn{font:600 14px var(--sans,Inter,system-ui,sans-serif);padding:10px 16px;min-height:42px;border-radius:10px;border:1px solid var(--pri);background:var(--pri);color:var(--priink);cursor:pointer}',
      '#mi-modal .ni-btn.alt{background:var(--s1);color:var(--ink);border-color:var(--line)}',
      '#mi-modal .ni-btn:disabled{opacity:.5;cursor:default}',
      '.jb-btn.dz{color:var(--bad,#e5484d)}',
      '@media(max-width:560px){.jb-row{grid-template-columns:12px minmax(0,1fr)}.jb-r{grid-column:2;text-align:left}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- the page ---------- */
  function statusLine() {
    var s = ST.state || {}, seen = s.worker_seen_at ? (Date.now() - Date.parse(s.worker_seen_at)) / 60000 : null;
    if (!s.connected) return '<div class="jb-st bad"><b></b>Gmail reader not connected yet</div>';
    if (seen !== null && seen > 20) return '<div class="jb-st bad"><b></b>Gmail reader silent for ' + Math.round(seen) + ' min</div>';
    return '<div class="jb-st"><b></b>Gmail reader running · last check ' + esc(when(s.worker_seen_at)) + '</div>';
  }
  function rowHtml(x) {
    var due = x.confirmed_due || x.proposed_due, d = daysTo(due);
    var pc = x.priority === 'Urgent' ? 'u' : x.priority === 'High' ? 'h' : '';
    var right = due && d !== null
      ? '<b class="' + (d <= 3 ? 'red' : d <= 7 ? 'amber' : '') + '">' + (d < 0 ? Math.abs(d) + ' days late' : d === 0 ? 'Today' : d + ' days left') + '</b>' + esc(when(x.received_at))
      : esc(when(x.received_at));
    var tag = isNotice(x) ? '<span class="jb-tag">Notice</span>' : /^suspicious/i.test(x.category || '') ? '<span class="jb-tag">May be fake</span>' : '';
    var who = x.from_name || x.from_address || '';
    return '<div class="jb-row" role="button" tabindex="0" data-id="' + esc(x.message_id) + '"><span class="jb-dot ' + pc + '"></span><div><div class="jb-t">' + esc(x.subject || '(no subject)') + '</div>' +
      '<div class="jb-s">' + tag + esc(who) + '</div>' +
      (x.summary && x.requires_action ? '<div class="jb-d">' + esc(String(x.summary).slice(0, 140)) + '</div>' : '') + '</div><div class="jb-r">' + right + '</div></div>';
  }
  function paint() {
    var l = $('jb-list'); if (!l) return;
    var c = counts(), a = shown();
    if (ST.cnt) { c.all = ST.cnt.total; c.act = ST.cnt.act; c.notice = ST.cnt.notice; c.del = ST.cnt.deleted; }
    var sub = $('jb-sub');
    if (sub && ST.loaded) sub.innerHTML = '<b>' + c.all + '</b> mails · <b>' + c.notice + '</b> notices · <b>' + c.act + '</b> need action' + (ST.cnt && ST.cnt.today !== undefined ? ' · <b>' + ST.cnt.today + '</b> today' : '') + (ST.cnt && ST.cnt.total > ST.items.length ? '<br><small>Showing the latest ' + ST.items.length + ' of ' + ST.cnt.total + '. Use search to find older mail.</small>' : '');
    var tabs = [['all', 'All mail', c.all], ['act', 'Needs action', c.act], ['notice', 'Notices', c.notice]];
    if (isAdm() || c.del) tabs.push(['del', 'Deleted', c.del]);
    var act = $('jb-act');
    if (act) act.innerHTML = '<button type="button" class="jb-btn" onclick="jkgRefresh()">Refresh</button>' +
      (window.LS && LS.role === 'admin' ? '<button type="button" class="jb-btn" onclick="jkgPingSettings()">Ping settings</button>' : '') +
      '<button type="button" class="jb-btn p" onclick="jkgOld()">+ Add notice</button>';
    $('jb-tabs').innerHTML = tabs.map(function (t) { return '<button type="button" class="jb-tab' + (ST.tab === t[0] ? ' on' : '') + '" onclick="jkgTab(\'' + t[0] + '\')">' + t[1] + '<i>' + t[2] + '</i></button>'; }).join('');
    $('jb-status').innerHTML = statusLine() + (ST.err ? '<div class="jb-st bad"><b></b>' + esc(ST.err) + '</div>' : '');
    l.innerHTML = a.length ? a.map(rowHtml).join('') : '<div class="jb-empty">' + (ST.loaded ? (ST.tab === 'del' ? 'Nothing in Deleted.' : 'No mail here.') : 'Loading…') + '</div>';
    if (isAdm() && a.length) l.innerHTML += '<div style="padding:14px;text-align:right">' + (ST.tab === 'del' ? '<button type="button" class="jb-btn" onclick="jkgTrashAll(true)">Restore all (' + a.length + ')</button>' : '<button type="button" class="jb-btn dz" onclick="jkgTrashAll(false)">Delete all in this list (' + a.length + ')</button>') + '</div>';
  }
  async function load(force) {
    if (!tok()) { ST.err = 'You are not logged in. Please log in again.'; paint(); return; }
    if (ST.loading) return;
    if (!force && ST.loaded && Date.now() - ST.at < 20000) return;
    ST.loading = true;
    try { var r = await rpc('mail_list', { p_t: tok(), p_limit: 500 }); ST.items = r.items || []; ST.state = r.state || {}; ST.me = r.me || {}; ST.err = ''; ST.loaded = true; ST.at = Date.now(); try { var k = await rpc('mail_counts', { p_t: tok() }); if (k && k.ok) ST.cnt = k; } catch (e2) { }
    }
    catch (e) { ST.err = 'Could not load the mail: ' + e.message; }
    ST.loading = false;
    paint(); badge();
  }
  function badge() {
    var b = $('jb-hn'); if (!b || !ST.loaded) return;
    var c = counts(); if (ST.cnt) { c.act = ST.cnt.act; c.all = ST.cnt.total; } b.textContent = c.act + ' need action · ' + c.all + ' mails · newest first';
  }

  window.jkgbox = function () {
    if (typeof USER !== 'undefined' && !USER) return typeof home === 'function' ? home() : undefined;
    if (typeof VIEW !== 'undefined' && VIEW) return alert('JKG Box is private to each login. Open your own login to use it.');
    var app = $('app'); if (!app) return;
    window.__jkgInOld = false;
    try { CURP = 'jkgbox'; } catch (e) { }
    try { if (typeof sb === 'function') sb(); if (typeof pgIn === 'function') pgIn('jkgbox'); window.TBF = null; } catch (e) { }
    css();
    app.innerHTML = '<i data-pg="jkgbox" hidden></i>' +
      '<div class="jb-top"><div><h1>JKG Box</h1><p id=jb-sub>All your mail and notices in one place, newest first.</p></div>' +
      '<div class="jb-act" id="jb-act"></div></div>' +
      '<div id="jb-status"></div><div class="jb-tabs" id="jb-tabs"></div>' +
      '<input id="jb-q" class="sq" aria-label="Search mail" placeholder="Search subject, sender, GSTIN, PAN…" oninput="jkgQ(this.value)">' +
      '<div class="jb-list" id="jb-list"></div>';
    $('jb-q').value = ST.q;
    var L = $('jb-list');
    L.addEventListener('click', function (e) { var r = e.target.closest && e.target.closest('.jb-row'); if (r) window.jkgOpen(r.getAttribute('data-id')); });
    L.addEventListener('keydown', function (e) { if (e.key !== 'Enter' && e.key !== ' ') return; var r = e.target.closest && e.target.closest('.jb-row'); if (r) { e.preventDefault(); window.jkgOpen(r.getAttribute('data-id')); } });
    paint(); load(true);
    if (!ST.timer) ST.timer = setInterval(function () { if ($('jb-list') && !document.hidden && !$('mi-modal')) load(true); }, 60000);
    try { window.scrollTo(0, 0); } catch (e) { }
  };
  window.jkgTab = function (t) { ST.tab = t; paint(); };
  window.jkgQ = function (v) { ST.q = v; paint(); };
  window.jkgRefresh = function () { load(true); };
  window.jkgTrashAll = async function (restore) {
    var a = shown(); if (!a.length || !isAdm()) return;
    var what = ST.q ? ' that match your search' : (ST.tab === 'act' ? ' in "Needs action"' : ST.tab === 'notice' ? ' in "Notices"' : ST.tab === 'del' ? ' in "Deleted"' : '');
    var q = restore ? 'This brings ' + a.length + ' mail(s)' + what + ' back to the list. Continue?'
      : 'This moves ' + a.length + ' mail(s)' + what + ' to "Deleted". Nothing is erased: you can restore them from the Deleted tab. Continue?';
    if (!confirm(q)) return;
    try {
      var r = await rpc('mail_trash', { p_t: tok(), p_ids: a.map(function (x) { return x.message_id; }), p_restore: !!restore });
      ST.err = ''; await load(true);
      var b = $('jb-status'); if (b) b.insertAdjacentHTML('beforeend', '<div class="jb-st"><b></b>' + (restore ? 'Restored ' : 'Moved to Deleted: ') + (r.changed || 0) + '</div>');
    } catch (e) { ST.err = 'Could not do this: ' + e.message; paint(); }
  };
  window.addEventListener('jkg-mail-changed', function () { load(true); });
  window.jkgOld = function () { window.__jkgInOld = true; if (typeof window.__ntOld === 'function') window.__ntOld(); };

  /* opening a mail uses the existing mail window (summary, reply drafts, approvals) */
  function ensureMail() {
    return new Promise(function (ok, no) {
      if (window.miOpen) return ok();
      var done = false, t = setTimeout(function () { if (!done) { done = true; no(new Error('the mail window took too long to load')); } }, 8000);
      var s = document.createElement('script'); s.src = '/mail-inbox.js?v=' + encodeURIComponent(typeof BUILD !== 'undefined' ? BUILD : '');
      s.onload = function () { if (done) return; done = true; clearTimeout(t); window.miOpen ? ok() : no(new Error('mail window missing')); };
      s.onerror = function () { if (done) return; done = true; clearTimeout(t); no(new Error('could not load the mail window')); };
      document.head.appendChild(s);
    });
  }
  /* built-in summary window: used only if the full mail window cannot open. Uses what the list already holds. */
  function lineList(a) { return a && a.length ? '<ul style="margin:4px 0 0 18px;padding:0">' + a.map(function (x) { return '<li>' + esc(typeof x === 'string' ? x : (x && (x.action || x.text)) || JSON.stringify(x)) + '</li>'; }).join('') + '</ul>' : ''; }
  function fallbackOpen(id, why) {
    var x = null; ST.items.forEach(function (m) { if (m.message_id === id) x = m; });
    var el = $('jb-modal'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'jb-modal';
    el.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:rgba(5,10,18,.7);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:18px 10px');
    var f = (x && x.facts) || {}, due = x && (x.confirmed_due || x.proposed_due);
    var chips = ['notice_type', 'authority', 'gstin', 'pan', 'assessment_year', 'financial_year', 'reference'].filter(function (k) { return f[k]; }).map(function (k) { return '<div><b>' + esc(k.replace(/_/g, ' ')) + ':</b> ' + esc(f[k]) + '</div>'; }).join('');
    el.innerHTML = '<div style="width:min(760px,100%);background:var(--s1,#fff);color:var(--ink,#18283b);border:1px solid var(--line,#dce3ec);border-radius:16px;padding:18px;font:14px/1.55 var(--sans,Inter,system-ui,sans-serif)">' +
      '<button type="button" class="jb-btn" style="float:right" onclick="document.getElementById(\'jb-modal\').remove()">Close</button>' +
      (x ? '<h3 style="margin:0 0 4px;font:700 18px var(--serif,Georgia,serif)">' + esc(x.subject || '(no subject)') + '</h3><div style="color:var(--mute,#65758a);font-size:12.5px">' + esc((x.from_name ? x.from_name + ' · ' : '') + x.from_address) + ' · ' + esc(when(x.received_at)) + '</div>' +
        '<div style="margin-top:8px"><span class="jb-tag">' + esc(x.priority || '') + '</span><span class="jb-tag">' + esc(x.category || '') + '</span></div>' +
        '<h4 style="margin:14px 0 4px;font-size:12px;letter-spacing:.8px;text-transform:uppercase">Summary</h4><div>' + esc(x.summary || 'No summary yet.') + '</div>' +
        (due ? '<div style="margin-top:8px"><b>Reply date:</b> ' + esc(String(due).slice(0, 10)) + '</div>' : '') +
        (chips ? '<h4 style="margin:14px 0 4px;font-size:12px;letter-spacing:.8px;text-transform:uppercase">Details found</h4>' + chips : '') +
        (x.requested_actions && x.requested_actions.length ? '<h4 style="margin:14px 0 4px;font-size:12px;letter-spacing:.8px;text-transform:uppercase">Tasks</h4>' + lineList(x.requested_actions) : '')
        : '<p>This mail is no longer in the list. Press Refresh and try again.</p>') +
      '<p style="margin:14px 0 0;color:var(--mute,#65758a);font-size:12.5px">Simple view. The full window (reply drafts and approvals) could not open' + (why ? ': ' + esc(why) : '') + '. Press Refresh and tap the mail again.</p></div>';
    el.addEventListener('click', function (e) { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
  }
  window.jkgOpen = async function (id) {
    if (!id || window.__jkgOpening) return;
    window.__jkgOpening = true;
    try {
      await ensureMail();
      if (!window.__jkgMe && window.miLoad) { try { await window.miLoad(false); } catch (e) { } window.__jkgMe = 1; }
      await window.miOpen(id);
    } catch (e) { fallbackOpen(id, e && e.message); }
    window.__jkgOpening = false;
  };

  /* ---------- home screen: JKG Box at the very top, old Notices tile removed ---------- */
  function homeCard() {
    var app = $('app'); if (!app || !app.querySelector('i[data-pg="home"]')) return;
    css();
    app.querySelectorAll('[onclick="notices()"]').forEach(function (b) { b.remove(); });
    if (!$('jb-home')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'jb-home'; b.className = 'jb-home'; b.setAttribute('onclick', 'jkgbox()');
      b.innerHTML = '<span class="jb-ic">✉</span><span class="jb-tx"><b>JKG Box</b><small id="jb-hn">Mail &amp; notices, newest first</small></span><span class="jb-go">Open ›</span>';
      var anchor = app.querySelector('.dbar') || app.querySelector('.dgs');
      if (anchor) anchor.parentNode.insertBefore(b, anchor); else app.appendChild(b);
    }
    badge(); load(false);
  }
  function hook() {
    if (typeof window.home === 'function' && !window.home.__jkg) {
      var h0 = window.home, h1 = function () { window.__jkgInOld = false; var r = h0.apply(this, arguments); try { homeCard(); } catch (e) { } return r; };
      h1.__jkg = true; window.home = h1;
    }
    if (typeof window.notices === 'function' && !window.notices.__jkg) {
      window.__ntOld = window.notices;
      var n1 = function () { return window.__jkgInOld ? window.__ntOld.apply(this, arguments) : window.jkgbox(); };
      n1.__jkg = true; window.notices = n1;
    }
  }
  /* ---------- ping: tells one staff member about each new notice or important mail ----------
     Works while that person is logged in on the site (any page, any tab). The admin chooses who, and turns it on or off, with the Ping settings button in this page. */
  var PING_DEFAULT = { on: true, users: ['amit'], scope: 'important' }; /* used until the admin saves settings */
  function pingCfg() { try { var c = JSON.parse(LS.getItem('jkgping') || 'null'); if (c && typeof c === 'object') return { on: c.on !== false, users: Array.isArray(c.users) ? c.users : [], scope: c.scope === 'all' ? 'all' : 'important' }; } catch (e) { } return PING_DEFAULT; }
  function pingSetup() {
    var KEY = 'jkg_ping_seen', n = 0, busy = false;
    var seen = function () { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
    var keep = function (a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-600))); } catch (e) { } };
    var important = function (x) { if (x.deleted_at || /^(filed|completed)$/i.test(x.case_status || '')) return false; return pingCfg().scope === 'all' || x.requires_action || x.priority === 'Urgent' || x.priority === 'High'; };
    var ask = function () { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { } document.removeEventListener('click', ask); };
    document.addEventListener('click', ask);
    async function check() {
      if (busy || document.hidden || !tok()) return; busy = true;
      try {
        var r = await rpc('mail_list', { p_t: tok(), p_limit: 60 }), me = String((r.me && r.me.u) || '').toLowerCase();
        var cf = pingCfg(); if (!me || !cf.on || cf.users.map(function (u) { return String(u).toLowerCase(); }).indexOf(me) < 0) return;
        var items = (r.items || []).filter(important), old = seen(), ids = items.map(function (x) { return x.message_id; });
        if (!old) { keep(ids); return; } /* first time on this computer: note what is already there, do not ping for it */
        var fresh = items.filter(function (x) { return old.indexOf(x.message_id) < 0; });
        if (!fresh.length) return;
        keep(old.concat(fresh.map(function (x) { return x.message_id; })));
        n += fresh.length; document.title = '(' + n + ') ' + document.title.replace(/^\(\d+\)\s*/, '');
        var f = fresh[0], txt = fresh.length > 1 ? fresh.length + ' new mails need attention' : 'New ' + (f.priority === 'Urgent' ? 'URGENT ' : '') + 'mail: ' + (f.subject || '(no subject)');
        try { if (typeof toast === 'function') toast(txt, 'Open', function () { ensureMail().then(function () { window.miOpen(f.message_id); }).catch(function () { }); }, 20000); } catch (e) { }
        try { if ('Notification' in window && Notification.permission === 'granted') new Notification('JK Gupta & Co', { body: txt }); } catch (e) { }
      } catch (e) { } finally { busy = false; }
    }
    window.addEventListener('focus', function () { n = 0; document.title = document.title.replace(/^\(\d+\)\s*/, ''); check(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
    setTimeout(check, 4000); setInterval(check, 60000);
  }
  try { pingSetup(); } catch (e) { }
  window.jkgPingSettings = function () {
    if (!(window.LS && LS.role === 'admin')) return alert('Only the admin can change ping settings.');
    var names = []; try { names = Object.keys(U() || {}); } catch (e) { }
    var c = pingCfg(); c.users.forEach(function (u) { if (names.map(function (x) { return x.toLowerCase(); }).indexOf(String(u).toLowerCase()) < 0) names.push(u); });
    var el = $('jb-modal'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'jb-modal';
    el.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:rgba(5,10,18,.7);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:18px 10px');
    el.innerHTML = '<div style="width:min(520px,100%);background:var(--s1,#fff);color:var(--ink,#18283b);border:1px solid var(--line,#dce3ec);border-radius:16px;padding:18px;font:14px/1.55 var(--sans,Inter,system-ui,sans-serif)">' +
      '<button type="button" class="jb-btn" style="float:right" onclick="document.getElementById(\'jb-modal\').remove()">Close</button>' +
      '<h3 style="margin:0 0 6px;font:700 18px var(--serif,Georgia,serif)">Ping settings</h3>' +
      '<div style="color:var(--mute,#65758a);font-size:12.5px;margin-bottom:10px">The people ticked below get a pop-up for each new mail while they are logged in on the site.</div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="pg-on"' + (c.on ? ' checked' : '') + ' style="width:auto"> <b>Pings are ON</b></label>' +
      '<div style="margin:10px 0 4px"><b>Who gets pinged</b></div>' +
      (names.length ? names.map(function (n, i) { return '<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" class="pg-u" value="' + esc(n) + '"' + (c.users.map(function (u) { return String(u).toLowerCase(); }).indexOf(n.toLowerCase()) >= 0 ? ' checked' : '') + ' style="width:auto"> ' + esc(n) + '</label>'; }).join('') : '<div>No staff logins found.</div>') +
      '<div style="margin:12px 0 4px"><b>What to ping for</b></div>' +
      '<select id="pg-sc" style="width:100%;padding:8px"><option value="important"' + (c.scope === 'important' ? ' selected' : '') + '>Notices, urgent or action-needed mails only</option><option value="all"' + (c.scope === 'all' ? ' selected' : '') + '>Every new mail</option></select>' +
      '<div style="margin-top:14px"><button type="button" class="jb-btn p" onclick="jkgPingSave()">Save</button></div><div id="pg-m" style="margin-top:8px"></div></div>';
    document.body.appendChild(el);
  };
  window.jkgPingSave = function () {
    if (!(window.LS && LS.role === 'admin')) return;
    var us = [].slice.call(document.querySelectorAll('.pg-u')).filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
    LS.setItem('jkgping', JSON.stringify({ on: !!$('pg-on').checked, users: us, scope: $('pg-sc').value }));
    var m = $('pg-m'); if (m) m.textContent = 'Saved.';
    setTimeout(function () { var e = $('jb-modal'); if (e) e.remove(); }, 700);
  };
  hook();
  try { homeCard(); } catch (e) { }
})();
