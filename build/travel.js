/* Travel mode: for staff who are away from the office server. Work is kept in a folder on their own laptop; later it is merged into the office server. */
const TV={h:null,name:'',t:{},snap:{},bk:''};
const trvIdb=(m,k,v)=>new Promise((ok,no)=>{try{const q=indexedDB.open('jkgtravel',1);q.onupgradeneeded=()=>q.result.createObjectStore('k');q.onerror=()=>no(q.error);
 q.onsuccess=()=>{const t=q.result.transaction('k',m=='get'?'readonly':'readwrite'),s=t.objectStore('k'),r=m=='get'?s.get(k):s.put(v,k);t.oncomplete=()=>ok(r.result);t.onerror=()=>no(t.error)}}catch(e){no(e)}});
const trvFn=n=>'jkg-travel-'+String(n).toLowerCase().replace(/[^a-z0-9._-]/g,'_')+'.json';
const trvIso=()=>new Date().toISOString();
async function trvPerm(h,ask){try{if(!h.queryPermission)return true;let p=await h.queryPermission({mode:'readwrite'});if(p!='granted'&&ask)p=await h.requestPermission({mode:'readwrite'});return p=='granted'}catch(e){return false}}
async function trvRead(h,name){try{const f=await(await h.getFileHandle(name)).getFile();return JSON.parse(await f.text())}catch(e){return null}}
async function trvPut(h,name,txt){const w=await(await h.getFileHandle(name,{create:true})).createWritable();await w.write(txt);await w.close()}
const trvFileObj=(user,rows)=>({v:1,user,saved:trvIso(),keys:rows});
function trvRows(){const all=LS.travData(),o={};Object.keys(all).forEach(k=>{if(k=='jkgpw')return;if(TV.snap[k]!==all[k]){TV.t[k]=trvIso();TV.snap[k]=all[k]}o[k]={v:all[k],t:TV.t[k]||trvIso()}});return o}
async function trvSave(){if(!TV.h)return;try{const txt=JSON.stringify(trvFileObj(TV.name,trvRows()));await trvPut(TV.h,trvFn(TV.name),txt);
  const day=trvIso().slice(0,10);if(TV.bk!=day){await trvPut(TV.h,trvFn(TV.name).replace('.json','-backup-'+day+'.json'),txt);TV.bk=day;
   try{const old=[];for await(const [n] of TV.h.entries())if(n.startsWith(trvFn(TV.name).replace('.json','-backup-')))old.push(n);old.sort();while(old.length>14)await TV.h.removeEntry(old.shift())}catch(e){}}
  LS.travDone(true)}catch(e){LS.travDone(false,'Not saved - check the folder');clearTimeout(trvSave.r);trvSave.r=setTimeout(trvSave,5000)}}
LS.travSave=trvSave;
function trvHelp(){modal('<h3>Travel mode</h3><p>Use this when you are away from the office server. Everything you do is saved in a folder on <b>this laptop</b>.</p><p>When you are back in the office, open the office address, sign in as usual and use <b>Travel data</b> in the menu to send your work to the server. Nothing is lost and the server work is not overwritten.</p><p>Use Chrome or Edge on a laptop.</p>')}
function trvLoginHtml(){let n='';try{n=NATIVE.getItem('jkgtvn')||''}catch(e){}
 return '<h3>Travel mode</h3><div class="sbl"><p style="font-size:13px;opacity:.8">Works without the office server. Your work is saved in a folder on this laptop.</p><label>Your username<input id="tvn" value="'+E(n)+'" autocapitalize="none" spellcheck="false" onkeydown="if(event.key==\'Enter\')trvOpen()"></label>'
 +'<button class="go" onclick="trvOpen()">Open my travel folder</button><div id="le"></div>'+(HYBRID?'<p style="font-size:12px;opacity:.75;margin:8px 0">The office server was not found, so you are in Travel mode. When you are back in the office, open this app again and it connects by itself.</p><div class="fg"><a onclick="location.reload()">Try the office server again</a> · <a onclick="hybChange()">Change server address</a> · ':'<div class="fg">')+'<a onclick="trvHelp()">How does this work?</a></div></div>'}
(function(){const o=window.sbLogin;window.sbLogin=function(){if(TRAVELBUILD&&!LS.on)return trvLoginHtml();return o.apply(this,arguments)+(HYBRID?'<div class="sbl" style="font-size:12px;opacity:.75;margin-top:6px">● Connected to the office server</div>':'')}})();
async function trvOpen(){const n=((document.getElementById('tvn')||{}).value||'').trim().toLowerCase(),e=document.getElementById('le');
 if(!n){if(e)e.textContent='Type your username.';return}
 if(n==ADMIN){if(e)e.textContent='Travel mode is for staff logins, not the admin.';return}
 if(typeof window.showDirectoryPicker!='function'){modal('<h3>Please use Chrome or Edge</h3><p>This browser cannot save into a folder. Open this page in Chrome or Edge on your laptop.</p>');return}
 TV.name=n;try{NATIVE.setItem('jkgtvn',n)}catch(x){}
 let h=null;try{h=await trvIdb('get','h')}catch(x){}
 if(h&&await trvPerm(h,false)){return trvUse(h)}
 trvAsk(h)}
function trvAsk(h){modal('<h3>Where should your work be kept?</h3><p>Choose a folder on this laptop, for example <b>Documents &gt; JK Travel</b>. Your clients and attendance are saved there, so nothing depends on the office server.</p>'
 +(h?'<p><button onclick="trvAgain()">Use the same folder as before: <b>'+E(h.name||'folder')+'</b></button></p>':'')
 +'<p><button onclick="trvPick()">Choose a folder…</button></p><p style="font-size:13px">First time? If you brought a data file from the office, pick it here (optional):<br><input type="file" id="tvseed" accept=".json"></p>');}
async function trvAgain(){let h=null;try{h=await trvIdb('get','h')}catch(x){}if(!h)return trvPick();if(await trvPerm(h,true))trvUse(h);else toast('Permission was not given for that folder.')}
async function trvPick(){let h;try{h=await window.showDirectoryPicker({mode:'readwrite',id:'jkgtravel'})}catch(e){return}
 try{await trvIdb('put','h',h)}catch(e){}trvUse(h)}
async function trvUse(h){const n=TV.name;let f=await trvRead(h,trvFn(n)),seedFile=(document.getElementById('tvseed')||{}).files;seedFile=seedFile&&seedFile[0];
 if(!f&&seedFile){try{f=JSON.parse(await seedFile.text())}catch(e){modal('<h3>That file could not be read</h3><p>Please pick the travel data file you downloaded from the office.</p>');return}
  if(!f||!f.keys||String(f.user||'').toLowerCase()!=n){modal('<h3>That file is for a different login</h3><p>It belongs to <b>'+E((f&&f.user)||'someone else')+'</b>, not <b>'+E(n)+'</b>.</p>');return}}
 const rows={};TV.t={};TV.snap={};if(f&&f.keys)Object.keys(f.keys).forEach(k=>{rows[k]=f.keys[k].v;TV.snap[k]=f.keys[k].v;TV.t[k]=f.keys[k].t});
 TV.h=h;LS.travStart(rows);
 const g=(()=>{try{return JSON.parse(LS.getItem('jkgatg')||'[]')}catch(e){return[]}})();if(!g.includes(n)){g.push(n);LS.setItem('jkgatg',JSON.stringify(g))}
 modal();USER=n;VIEW='';let d=null;try{d=JSON.parse(LS.getItem('jkg_'+n)||'null')}catch(z){}
 DB=d&&d.clients?d:{clients:{}};Object.values(DB.clients).forEach(fixN);save();tg(0);afterLogin();home();trvSave()}
/* remember when each client was last changed (so the merge can tell which copy is newer) */
function trvHash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return String(h)}
(function(){const si=LS.setItem.bind(LS);LS.setItem=function(k,v){try{if(/^jkg_/.test(k)&&k!='jkg_pw'&&k!='jkgpw'){const o=JSON.parse(v);if(o&&o.clients){o.__m=o.__m||{};o.__h=o.__h||{};
  Object.keys(o.clients).forEach(n=>{const h=trvHash(JSON.stringify(o.clients[n]));if(o.__h[n]&&o.__h[n]!=h)o.__m[n]=trvIso();o.__h[n]=h});
  Object.keys(o.__h).forEach(n=>{if(!o.clients[n]){delete o.__h[n];delete o.__m[n]}});
  if(typeof DB!='undefined'&&DB&&k=='jkg_'+(VIEW||USER)){DB.__m=o.__m;DB.__h=o.__h}v=JSON.stringify(o)}}}catch(e){}return si(k,v)}})();
/* merge */
const trvJ=s=>{try{return JSON.parse(s)}catch(e){return null}};
function trvMergeDB(o,t,st){if(!o||!o.clients)return t;const R=JSON.parse(JSON.stringify(o));R.__m=R.__m||{};R.__h=R.__h||{};
 Object.keys(t.clients||{}).forEach(n=>{const tc=t.clients[n],oc=R.clients[n];
  if(!oc){R.clients[n]=tc;R.__m[n]=(t.__m||{})[n]||'';R.__h[n]=(t.__h||{})[n];st.add++;return}
  if(JSON.stringify(tc)===JSON.stringify(oc))return;
  const tm=(t.__m||{})[n]||'',om=R.__m[n]||'';
  if(tm>om){R.clients[n]=tc;R.__m[n]=tm;R.__h[n]=(t.__h||{})[n];st.upd++}
  else if(om>tm)st.keep++;
  else{R.clients[n+' (travel copy)']=tc;R.__m[n+' (travel copy)']=tm;R.__h[n+' (travel copy)']=(t.__h||{})[n];st.copy++}});
 Object.keys(t).forEach(k=>{if(k!='clients'&&k!='__m'&&k!='__h'&&R[k]===undefined)R[k]=t[k]});return R}
function trvMergeAtt(o,t,st){const R=o&&o.d?JSON.parse(JSON.stringify(o)):{d:{}};const sc=r=>(r&&r.o?2:r&&r.i?1:0);
 Object.keys((t&&t.d)||{}).forEach(d=>{const a=R.d[d],b=t.d[d];if(!a){R.d[d]=b;st.att++}else if(sc(b)>sc(a)){R.d[d]=b;st.att++}});return R}
function trvMergeTrk(o,t){if(!o)return t;if(t&&t.del&&!o.del)return o;const R=JSON.parse(JSON.stringify(o));R.m=Object.assign({},o.m||{},t.m||{});if(t.s&&!o.s&&o.m&&!Object.keys(o.m).length)R.s=t.s;return R}
function trvApply(f,who,st){const u=String(f.user||'').toLowerCase(),keys=f.keys||{};
 Object.keys(keys).forEach(k=>{const tv=trvJ(keys[k].v);if(!tv)return;
  if(k=='jkg_'+u){const o=trvJ(LS.getItem(k));const R=trvMergeDB(o,tv,st);LS.setItem(k,JSON.stringify(R));if(USER==u&&!VIEW){DB=R;Object.values(DB.clients).forEach(fixN)}}
  else if(k=='att_'+u){LS.setItem(k,JSON.stringify(trvMergeAtt(trvJ(LS.getItem(k)),tv,st)))}
  else if(k.startsWith(TKP+u+'|')){LS.setItem(k,JSON.stringify(trvMergeTrk(trvJ(LS.getItem(k)),tv)))}})}
function trvSendUI(){modal('<h3>Travel data</h3><p><b>1. Send my travel work to the office</b><br>Choose the travel folder from your laptop (the one you picked in Travel mode):<br><input type="file" id="tvf" webkitdirectory multiple onchange="trvSend(this.files)"></p>'
 +'<p style="font-size:13px">Or choose just the file (jkg-travel-….json):<br><input type="file" id="tvf2" accept=".json" onchange="trvSend(this.files)"></p><hr>'
 +'<p><b>2. Take my office data with me</b><br>Saves a file. In Travel mode, pick it the first time you choose a folder.<br><button onclick="trvTake()">Download my data file</button></p><div id="tvr"></div>')}
function trvDown(name,obj){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj)],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function trvTake(){const u=USER,rows={};LS.keys().forEach(k=>{if(k=='jkg_'+u||k=='att_'+u||k.startsWith(TKP+u+'|'))rows[k]={v:LS.getItem(k),t:trvIso()}});trvDown(trvFn(u),trvFileObj(u,rows));toast('Saved. Keep this file safe.')}
async function trvSend(files){const r=document.getElementById('tvr');files=[...files||[]].filter(f=>/^jkg-travel-.*\.json$/i.test(f.name)&&!/-backup-/.test(f.name)||(f.name.endsWith('.json')&&files.length==1));
 if(!files.length){r.innerHTML='<p style="color:#b45309">No travel file found in what you chose. Pick the travel folder or the jkg-travel-….json file.</p>';return}
 const st={add:0,upd:0,keep:0,copy:0,att:0};let done=0,bad=[];
 for(const fl of files){let f=null;try{f=JSON.parse(await fl.text())}catch(e){}
  if(!f||!f.keys||!f.user){bad.push(fl.name);continue}
  const u=String(f.user).toLowerCase();if(!ADM()&&u!=String(USER).toLowerCase()){bad.push(fl.name+' (belongs to '+f.user+')');continue}
  trvApply(f,u,st);done++}
 r.innerHTML=done?'<p style="color:#047857"><b>Sent to the office server.</b><br>New clients: '+st.add+' · Updated from travel: '+st.upd+' · Office copy kept (it was newer): '+st.keep+(st.copy?' · Kept both versions: '+st.copy+' (look for "(travel copy)")':'')+' · Attendance days added: '+st.att+'</p><p style="font-size:13px">Tip: use "Download my data file" before your next trip so your laptop starts with the latest office data.</p>':'';
 if(bad.length)r.innerHTML+='<p style="color:#b45309">Skipped: '+bad.map(E).join(', ')+'</p>';
 if(done){try{home()}catch(e){}}}
(function(){const o=window.sb;if(typeof o!='function')return;window.sb=function(){o.apply(this,arguments);try{if(!USER||!LS.on||ADM())return;const el=document.getElementById('sb');if(el&&!el.querySelector('.trvl'))el.insertAdjacentHTML('beforeend','<a class="li trvl" onclick="trvSendUI()"><span>Travel data</span></a>')}catch(e){}}})();

/* ---- Hybrid: one app that uses the office server when it can be found, else the travel folder ---- */
const HYB=typeof HYBRID!='undefined'&&HYBRID;
async function hybPing(u){try{const c=new AbortController(),t=setTimeout(()=>c.abort(),2500);const r=await fetch(u.replace(/\/+$/,'')+'/ping',{signal:c.signal,cache:'no-store'});clearTimeout(t);const j=await r.json();return !!(j&&j.app=='jkg')}catch(e){return false}}
function hybNorm(u){u=String(u||'').trim();if(u&&!/^https?:\/\//i.test(u))u='http://'+u;return u.replace(/\/+$/,'')}
async function hybInit(){if(!HYB)return;let u='';try{u=NATIVE.getItem('jkgsrv')||''}catch(e){}
 if(!u&&/^https?:$/.test(location.protocol)&&!/vercel\.app$/.test(location.hostname))u=location.origin;
 if(!u){u=hybNorm(prompt('One-time setup. Type the office server address (your admin has it), for example 192.168.1.25:3000')||'');if(u){try{NATIVE.setItem('jkgsrv',u)}catch(e){}}}
 if(u&&await hybPing(u))LS.useServer(u)}
function hybChange(){const u=hybNorm(prompt('Office server address, for example 192.168.1.25:3000')||'');if(u){try{NATIVE.setItem('jkgsrv',u)}catch(e){}location.reload()}}
function hybBanner(msg,btn,fn){let b=document.getElementById('hybbn');if(!msg){if(b)b.remove();return}
 if(!b){b=document.createElement('div');b.id='hybbn';b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:70;background:#b45309;color:#fff;padding:8px 14px;font:14px sans-serif;display:flex;gap:12px;align-items:center;justify-content:center';document.body.appendChild(b)}
 b.innerHTML='<span>'+E(msg)+'</span><button style="padding:4px 12px;border-radius:8px;border:none;cursor:pointer">'+E(btn)+'</button>';b.querySelector('button').onclick=fn}
const hybKeys=u=>{const o={};LS.keys().forEach(k=>{if(k=='jkg_'+u||k=='att_'+u||k.startsWith(TKP+u+'|'))o[k]={v:LS.getItem(k),t:trvIso()}});return o};
async function hybMirror(){try{if(!USER||ADM()||!LS.on||!TV.h)return;const u=String(USER).toLowerCase();await trvPut(TV.h,trvFn(u),JSON.stringify(trvFileObj(u,hybKeys(USER))))}catch(e){}}
async function hybMerge(h){TV.h=h;const u=String(USER).toLowerCase();let msg='';
 try{const f=await trvRead(h,trvFn(u));if(f&&f.keys&&String(f.user||'').toLowerCase()==u){const st={add:0,upd:0,keep:0,copy:0,att:0};trvApply(f,u,st);
   if(st.add||st.upd||st.copy||st.att){msg='Your travel work was added to the office server: '+st.add+' new clients, '+st.upd+' updated, '+st.att+' attendance days'+(st.copy?', '+st.copy+' kept as "(travel copy)"':'')+'.';try{home()}catch(e){}}}}catch(e){}
 await hybMirror();hybBanner('');if(msg)toast(msg,9000);clearInterval(hybMerge.i);hybMerge.i=setInterval(async()=>{if(USER&&LS.on&&TV.h&&await trvPerm(TV.h,false))hybMirror()},60000)}
async function hybSync(){if(!USER||ADM()||!LS.on||typeof window.showDirectoryPicker!='function')return;TV.name=String(USER).toLowerCase();try{NATIVE.setItem('jkgtvn',TV.name)}catch(e){}let h=null;try{h=await trvIdb('get','h')}catch(e){}
 if(h&&await trvPerm(h,false))return hybMerge(h);
 hybBanner(h?'Allow this app to keep a travel copy of your work on this laptop.':'Choose a folder on this laptop to keep a travel copy of your work.',h?'Allow':'Choose folder',async()=>{
  try{if(h){if(await trvPerm(h,true))return hybMerge(h)}const nh=await window.showDirectoryPicker({mode:'readwrite',id:'jkgtravel'});try{await trvIdb('put','h',nh)}catch(e){}hybMerge(nh)}catch(e){}})}
(function(){const o=window.afterLogin;window.afterLogin=function(){const r=o&&o.apply(this,arguments);if(HYB&&LS.on&&USER&&!ADM())setTimeout(hybSync,400);return r}})();
(function(){const o=window.logout;window.logout=function(){hybBanner('');clearInterval(hybMerge.i);return o.apply(this,arguments)}})();
