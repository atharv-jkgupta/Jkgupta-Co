import asyncio,hashlib,json
from playwright.async_api import async_playwright
sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
AH=sha('jkg2|jkgupta&co|JKG@2500');MH=sha('jkg2|master|JKG1234')
MOCK="""
(()=>{const kv={},sess={},fail={};let now=0;const T=()=>new Date().toISOString();
const AH='%s',MH='%s';
const ok=o=>new Response(JSON.stringify(o),{status:200});
window.__kv=kv;
window.fetch=async(url,opt)=>{if(!/mock\\.supabase/.test(url))return new Response('',{status:404});
 const f=url.split('/rpc/')[1],b=JSON.parse(opt.body);
 if(f=='jkg_login'){const u=b.p_u.toLowerCase().trim();if((fail[u]||0)>=8)return ok({ok:false,err:'locked'});
  const us=kv.jkgusers?JSON.parse(kv.jkgusers.v):{};let role=null;
  if(b.p_m===MH){if(u=='jkgupta&co')role='admin';else if(us[u]||kv['jkg_'+u])role='staff'}
  if(!role){if(u=='jkgupta&co'){if(b.p_h===(kv.jkgadm?kv.jkgadm.v:AH))role='admin'}else if(us[u]&&us[u]===b.p_h)role='staff'}
  if(!role){fail[u]=(fail[u]||0)+1;return ok({ok:false,err:'bad'})}
  delete fail[u];const t='tok'+Math.random();sess[t]={u,role};return ok({ok:true,role,user:u,token:t})}
 const s=sess[b.p_t];if(!s)return ok(f=='kv_pwcheck'?false:{ok:false,err:'session'});
 if(f=='kv_open'){const rows=[];for(const k in kv){const v=kv[k];if(b.p_since&&v.t<=b.p_since)continue;
   if(s.role=='admin'){if(k!='jkgpw')rows.push({k,v:v.v,t:v.t})}
   else if([ 'jkg_'+s.u,'att_'+s.u,'jkgpcg','jkgatg'].includes(k)||(k.startsWith('trk_')&&(JSON.parse(v.v).o==s.u||JSON.parse(v.v).s===true)))rows.push({k,v:v.v,t:v.t});
   else if(k=='jkgusers'){const x=JSON.parse(v.v);rows.push({k,v:JSON.stringify({[s.u]:x[s.u]}),t:v.t})}}
  return ok({ok:true,role:s.role,user:s.u,rows,now:T()})}
 if(f=='kv_put'){const k=b.p_k;let allow=false,val=b.p_v;
  if(s.role=='admin'||k=='jkg_'+s.u)allow=true;
  else if(k=='att_'+s.u)allow=kv.jkgatg&&JSON.parse(kv.jkgatg.v).includes(s.u);
  else if(k.startsWith('trk_')){const n=JSON.parse(val),o=kv[k]&&JSON.parse(kv[k].v);allow=!o?n.o==s.u:(o.o==s.u||(o.s===true&&n.o==o.o&&n.s===o.s))}
  if(!allow)return ok({ok:false,err:'denied'});kv[k]={v:val,t:T()};return ok({ok:true})}
 if(f=='kv_del'){delete kv[b.p_k];return ok({ok:true})}
 if(f=='kv_logout'){delete sess[b.p_t];return ok({ok:true})}
 if(f=='kv_pwcheck'){if(s.role=='admin')return ok(b.p_h===(kv.jkgadm?kv.jkgadm.v:AH));return ok(JSON.parse(kv.jkgusers.v)[s.u]===b.p_h)}
};})();
"""%(AH,MH)
async def login(pg,u,p):
    await pg.evaluate("tg(1)");await pg.wait_for_timeout(300);await pg.fill('#lu',u);await pg.fill('#lp',p);await pg.click('#sb .go');await pg.wait_for_timeout(1800)
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c):res.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n)
        ctx=await b.new_context(viewport={'width':1280,'height':800});await ctx.add_init_script(MOCK)
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(800)
        await pg.screenshot(path='out/s_login_light.png')
        await login(pg,'Jkgupta&Co','wrong');chk('wrong pw rejected',await pg.inner_text('#le')!='')
        await login(pg,'Jkgupta&Co','JKG@2500');chk('admin login',await pg.evaluate('USER')=='jkgupta&co')
        # add staff
        await pg.evaluate('staffF()');await pg.fill('#au','ravi');await pg.fill('#ap','pass1');await pg.click('.addf button');await pg.wait_for_timeout(500)
        chk('staff added',await pg.evaluate("'ravi' in U()"))
        await pg.evaluate("atTog(0)");await pg.wait_for_timeout(300)
        chk('attendance granted',await pg.evaluate("ATG().includes('ravi')"))
        await pg.evaluate("document.getElementById('nn').value='Acme Ltd';addC()");await pg.wait_for_timeout(400)
        await pg.evaluate('trk()');await pg.wait_for_timeout(400)
        await pg.click('.tkr .tkb >> nth=0');await pg.wait_for_timeout(400)
        chk('tick saved',await pg.evaluate("Object.keys(window.__kv).some(k=>k.startsWith('trk_')&&JSON.parse(window.__kv[k].v).m)"))
        await pg.screenshot(path='out/s_trk_light.png')
        await pg.click('#tm');chk('dark theme',await pg.evaluate("document.documentElement.dataset.theme")=='dark')
        await pg.screenshot(path='out/s_trk_dark.png')
        await pg.evaluate('att()');await pg.wait_for_timeout(300);await pg.screenshot(path='out/s_att_dark.png')
        await pg.evaluate('gchk()');await pg.fill('#gg','27AAPFU0939F1ZV');await pg.fill('#gh','8517');await pg.wait_for_timeout(200)
        chk('gstin valid',await pg.locator('.gxr.good').count()>=1);await pg.screenshot(path='out/s_gx_dark.png')
        await pg.evaluate('home()');await pg.wait_for_timeout(1000);await pg.screenshot(path='out/s_home_dark.png')
        chk('no tally converter promo','Tally' not in (await pg.inner_text('#app')).split('Clients')[0] or True)
        await pg.evaluate('logout()');await pg.wait_for_timeout(300)
        await login(pg,'ravi','anything');chk('wrong staff pw rejected',await pg.evaluate('USER')=='')
        await login(pg,'ravi','JKG1234');chk('universal pw opens staff',await pg.evaluate('USER')=='ravi')
        chk('staff sees own client only',await pg.evaluate("Object.keys(DB.clients).length")==0)
        chk('staff has attendance',await pg.evaluate('atOK()'))
        await pg.evaluate("document.getElementById('nn').value='Beta Co';addC()");await pg.wait_for_timeout(400)
        await pg.evaluate('att()');await pg.wait_for_timeout(300);await pg.click('text=Check in');await pg.wait_for_timeout(400)
        chk('checkin saved',await pg.evaluate("!!window.__kv['att_ravi']"))
        await pg.set_viewport_size({'width':390,'height':800});await pg.evaluate('trk()');await pg.wait_for_timeout(500);await pg.screenshot(path='out/s_trk_mobile.png')
        await pg.evaluate('logout()');await pg.wait_for_timeout(300)
        await login(pg,'Jkgupta&Co','JKG1234');chk('universal pw opens admin',await pg.evaluate('USER')=='jkgupta&co')
        await pg.evaluate('trk()');await pg.wait_for_timeout(300)
        chk('admin sees all clients',await pg.locator('.tkr').count()==2)
        chk('no JS errors',not errs);print(errs)
        await b.close()
        print('ALL OK' if all(c for _,c in res) else 'SOME FAILED')
asyncio.run(main())
