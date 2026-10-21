
/* ====================================================================
   JK Gupta & Co. - interface, client tracker, attendance, staff control
   (added on top of the original program; everything above is unchanged)
   ==================================================================== */
const BUILD='__BUILD__';
let CURP='';
const $id=i=>document.getElementById(i);
const jkP2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+jkP2(d.getMonth()+1)+'-'+jkP2(d.getDate());
const hhmm=d=>jkP2(d.getHours())+':'+jkP2(d.getMinutes());
const MONN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const mLabel=m=>MONN[+m.slice(5)-1]+' '+m.slice(0,4);
const mShift=(m,n)=>{const d=new Date(+m.slice(0,4),+m.slice(5)-1+n,1);return d.getFullYear()+'-'+jkP2(d.getMonth()+1)};
const svg=p=>'<svg viewBox="0 0 24 24">'+p+'</svg>';
const IC={
 home:svg('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
 users:svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>'),
 check:svg('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5M9 3V2h6v1"/>'),
 clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
 wallet:svg('<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19v14H5.5A2.5 2.5 0 0 1 3 16.5z"/><path d="M19 9h-4a2 2 0 0 0 0 4h4"/>'),
 bolt:svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
 shield:svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
 sun:svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
 moon:svg('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
 help:svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>'),
 down:svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
 up:svg('<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>'),
 key:svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>'),
 out:svg('<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>'),
 menu:svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
 dots:svg('<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>'),
 scale:svg('<path d="M12 3v18M6 21h12M5 7h14"/><path d="M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z"/>'),
 tick:svg('<path d="M5 12.5l4.5 4.5L19 7"/>')
};

/* ---------------- theme ---------------- */
function updTm(){const b=$id('tm');if(!b)return;const d=document.documentElement.dataset.theme==='dark';b.innerHTML=d?IC.sun:IC.moon;b.title=d?'Switch to light mode':'Switch to dark mode';b.setAttribute('aria-label',b.title)}
function theme(t){const h=document.documentElement;t=t||(h.dataset.theme==='dark'?'light':'dark');h.dataset.theme=t;try{NATIVE.setItem('jkgtheme',t)}catch(e){}
 const m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='dark'?'#0b1017':'#0f2742';updTm()}

/* ---------------- small helpers ---------------- */
function toast(msg,btn,fn,ms){let c=$id('toasts');if(!c){c=document.createElement('div');c.id='toasts';document.body.appendChild(c)}
 const t=document.createElement('div');t.className='toast';t.innerHTML='<span>'+E(msg)+'</span>'+(btn?'<button>'+E(btn)+'</button>':'');
 if(btn)t.querySelector('button').onclick=()=>{try{fn&&fn()}finally{t.remove()}};c.appendChild(t);if(ms!==0)setTimeout(()=>t.remove(),ms||4500);return t}
let ATI=0;
function pgIn(n){if(typeof mhHide=='function')mhHide(n);clearInterval(ATI);const same=app.dataset.v===n;app.dataset.v=n||'';app.classList.toggle('still',same);
 if(!same){app.classList.remove('pgin');void app.offsetWidth;app.classList.add('pgin')}return same}
function countUp(root){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;(root||app).querySelectorAll('[data-n]').forEach(e=>{const to=+e.dataset.n;if(!(to>0))return;const t0=performance.now();
 const f=t=>{const k=Math.min(1,(t-t0)/700);e.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)})}
const curPg=()=>{const f=app.firstElementChild;return f&&f.dataset&&f.dataset.pg||''};
const typing=()=>{const a=document.activeElement;return !!a&&app.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)};
const modalOpen=()=>$id('md').classList.contains('o');

/* ---------------- sidebar ---------------- */
function sbLogin(){return '<h3>Staff login</h3><div class="sbl"><label>Username<input id="lu" autocomplete="username" autocapitalize="none" spellcheck="false" onkeydown="if(event.key==\'Enter\')document.getElementById(\'lp\').focus()"></label>'
 +'<label>Password<div class="pw"><input id="lp" type="password" autocomplete="current-password" onkeydown="if(event.key==\'Enter\')login()"><button type="button" onclick="pwEye(this)">Show</button></div></label>'
 +'<button class="go" onclick="login()">Sign in</button><div id="le"></div><div class="fg"><a onclick="forgot()">Forgot password?</a></div></div>'}
function sb(){const el=$id('sb');if(!USER){el.innerHTML=sbLogin();return}
 const N=Object.keys(DB.clients),A=(id,ic,t,fn,x)=>'<a class="li'+(CURP==id?' act':'')+'" onclick="'+fn+'">'+IC[ic]+'<span>'+t+'</span>'+(x||'')+'</a>';
 el.innerHTML='<div class="me"><span class="av">'+E((ADM()?'A':(USER[0]||'?')).toUpperCase())+'</span><div><b>'+E(ADM()?'Admin':USER)+'</b><small>'+(ADM()?'Full access':'Staff')+(VIEW?' · viewing '+E(VIEW):'')+'</small></div></div>'
  +A('home','home','Home','exitView();tg(0)')
  +A('trk','check','Client tracker','trk()')
  +A('reco','scale','Reco · GSTR-2B &amp; Bank','reco()')
  +(atOK()?A('att','clock','Attendance','att()'):'')
  +(pcOK()?A('pc','wallet','Petty cash book','pc()'):'')
  +A('loop','bolt','JK Loop · Statement to XML','loop()')
  +A('gx','shield','GSTIN / HSN check','gchk()')
  +(ADM()?A('stf','users','Staff &amp; access','staffF()'):'')
  +'<h3>'+(VIEW?E(VIEW)+'\'s clients':'My clients')+'</h3>'
  +(N.map((n,i)=>'<a class="li cl" onclick="pickI('+i+')"><span>'+E(n)+'</span></a>').join('')||'<small style="padding:0 12px">None yet</small>')
  +'<h3>Add client</h3><input id="nn" placeholder="Client name" onkeydown="if(event.key==\'Enter\')addC()"><select id="nv"><option>Tally Prime</option><option>Tally ERP 9</option></select><button onclick="addC()">Add client</button><a class="li" style="margin-top:8px" onclick="tlNew();tg(0)"><span>Or create from a Tally file</span></a>'}

/* ---------------- login ---------------- */
function pwEye(b){const i=$id('lp');const s=i.type==='password';i.type=s?'text':'password';b.textContent=s?'Hide':'Show'}
async function login(){const u=v('lu').trim().toLowerCase(),p=v('lp'),e=$id('le'),b=document.querySelector('#sb .go');
 if(!u||!p){e.textContent='Enter your username and password.';return}
 e.textContent='';b.disabled=true;b.textContent='Signing in...';let un=null;
 try{
  if(LS.on){const r=await LS.login(u,await hs(u+'|'+p),await hs('master|'+p));
   if(!r.ok){e.textContent=r.err=='locked'?'Too many wrong tries. This login is locked for 10 minutes.':r.err=='setup'?'The online database is not ready yet. Ask the admin to finish the Supabase setup.':r.err=='net'?'Cannot reach the online database. Check the internet and try again.':'Wrong username or password.';return}
   un=r.role=='admin'?ADMIN:r.user}
  else{const us=U();
   if(u==ADMIN){if((await hs(u+'|'+p))===(LS.getItem('jkgadm')||AH))un=ADMIN}else{const k=us[u]?u:Object.keys(us).find(x=>x.toLowerCase()==u);if(k&&us[k]===await hs(k+'|'+p))un=k}
   if(!un&&MH&&(await hs('master|'+p))===MH){const k=u==ADMIN?ADMIN:staffNames().find(x=>x.toLowerCase()==u);if(k)un=k}
   if(!un){e.textContent='Wrong username or password.';return}}
 }finally{b.disabled=false;b.textContent='Sign in'}
 USER=un;VIEW='';sessionStorage.setItem('jkgu',un);let d=null;try{d=JSON.parse(LS.getItem('jkg_'+un)||'null')}catch(z){}
 DB=d&&d.clients?d:{clients:{}};Object.values(DB.clients).forEach(fixN);save();tg(0);afterLogin();home()}
function afterLogin(){try{tkSync()}catch(e){}verCheck()}
function loginPage(){const seen=sessionStorage.getItem('jkgseen');try{sessionStorage.setItem('jkgseen','1')}catch(e){}
 app.innerHTML='<div class="lg intro'+(seen?' fast':'')+'" data-pg="login"><div class="sig" onclick="replay()" title="Click to replay">JK Gupta &amp; Co.</div><div class="loc">CHARTERED ACCOUNTANTS</div><button class="cta" onclick="tg()">LOGIN</button></div>'+BG;
 app.dataset.v='login';clearTimeout(loginPage.t);
 loginPage.t=setTimeout(()=>{if(USER||innerWidth<=900)return;$id('sb').classList.add('o');const x=$id('lu');if(x)x.focus()},seen?350:4300)}

/* ---------------- home ---------------- */
function home(){CURP='home';S={};window.onscroll=null;sb();dls();document.body.classList.toggle('out',!USER);
 if(!USER){loginPage();return}
 const N=Object.keys(DB.clients);let A=0,O=0,P=0;N.forEach(n=>{const c=DB.clients[n];P+=c.pending||0;c.accounts.forEach(a=>{A++;const d=days(a.lastImport);if(d==null||d>30)O++})});
 const T=tkStats(),q=(ic,t,s,fn)=>'<div class="qa" onclick="'+fn+'"><i>'+IC[ic]+'</i><div><b>'+t+'</b><small>'+s+'</small></div></div>';
 let ql=q('check','Client tracker',T.t?(T.d+' of '+T.t+' complete this month'):'Track the work client by client','trk()');
 if(atOK())ql+=q('clock','Attendance',attLine(),'att()');
 if(pcOK())ql+=q('wallet','Petty cash book','Record and export expenses','pc()');
 ql+=q('scale','Reco','GSTR-2B and bank reconciliation','reco()');
 ql+=q('shield','GSTIN / HSN check','Validate in one tap','gchk()');
 if(ADM()&&!VIEW)ql+=q('users','Staff &amp; access','Add staff, set permissions','staffF()');
 const same=pgIn('home');
 app.innerHTML='<i data-pg="home" hidden></i>'+(VIEW?vbar():'')+hero()
  +'<div class="stats hs"><div><b data-n="'+N.length+'">'+N.length+'</b>Clients</div><div><b data-n="'+A+'">'+A+'</b>Bank accounts</div><div><b class="'+(O?'w':'')+'" data-n="'+O+'">'+O+'</b>Need import (30+ days)</div><div><b data-n="'+P+'">'+P+'</b>Pending entries</div></div>'
  +(N.length==0&&!VIEW?'<div class="card empty big"><b>Welcome! Let\'s add your first client</b><small>Drop a Tally export and the client, bank accounts and ledgers are set up for you.</small><div><button onclick="tlNew()">Create client from Tally file</button><button class="g" onclick="tg(1)">Add by hand</button></div></div>':'')+'<div class="ql">'+ql+'</div>'
  +(ADM()&&!VIEW?stfP():'')+kdHtml()
  +'<div class="toolbar" style="margin-bottom:0"><button onclick="tlNew()">+ Create client from Tally file</button></div><h3>'+(VIEW?E(VIEW)+'\'s clients':ADM()?'Admin\'s own clients':'Clients')+'</h3><input id="q" class="sq" placeholder="Search clients..." oninput="clearTimeout(window._qt);window._qt=setTimeout(cards,120)"><div id="cl" class="cg"></div>';
 cards();if(!same)countUp()}

/* ---------------- top menu ---------------- */
function dm(e){e.stopPropagation();const d=$id('dd');if(d.classList.contains('o')){d.classList.remove('o');return}
 const A=(ic,t,fn,c)=>'<a'+(c?' class="'+c+'"':'')+' onclick="'+fn+'">'+IC[ic]+t+'</a>';
 d.innerHTML=A('help','Help and how to use','help()')+(USER?A('scale','Reco (GSTR-2B / Bank)','reco()')+A('shield','GSTIN / HSN check','gchk()')+(ADM()?A('users','Staff &amp; access','staffF()'):'')+'<hr>'
  +A('down','Download backup',"dl('JK-backup-'+USER+'.json',JSON.stringify(DB),'application/json')")+A('up','Load backup',"document.getElementById('lb').click()")+A('key','Change password','chpw()')+'<hr>'+A('out','Log out','logout()','dg'):'');
 d.classList.add('o')}

/* ---------------- change password ---------------- */
async function chpw2(){const o=v('cp0'),a=v('cp1'),b=v('cp2'),e=$id('cpe');
 if(a.length<4){e.textContent='The new password must be at least 4 characters.';return}
 if(a!==b){e.textContent='The two new passwords do not match.';return}
 const k=ADM()?ADMIN:USER,oh=await hs(k+'|'+o);let ok;
 if(LS.on)ok=await LS.pwcheck(oh);else ok=oh===(ADM()?(LS.getItem('jkgadm')||AH):U()[USER]);
 if(!ok){e.textContent='Your current password is wrong.';return}
 const h=await hs(k+'|'+a);if(ADM())LS.setItem('jkgadm',h);else{const us=U();us[USER]=h;LS.setItem('jkgusers',JSON.stringify(us));pwSet(USER,a)}
 modal();toast('Password changed. Use the new one next time you sign in.')}

/* ====================================================================
   CLIENT TRACKER  (one record per client; month by month ticks + note)
   key  trk_<owner>|<client>   value {o:owner,n:name,s:shared?,m:{'2026-10':{g,b,t,n,u,at}},b:[banks],ver}
   ==================================================================== */
const TKP='trk_',TKS={m:'',f:'all',q:''};let TKL=[];
const tkKey=(o,n)=>TKP+o+'|'+n;
const tkBanks=c=>(c.accounts||[]).map(a=>({l:a.label,g:a.ledger,i:a.lastImport||'',t:a.lastTxn||''}));
const tkMonth=()=>TKS.m||(TKS.m=ymd(new Date()).slice(0,7));
function tkLoad(){const rows=new Map();
 LS.keys().forEach(k=>{if(k.indexOf(TKP))return;let t;try{t=JSON.parse(LS.getItem(k))}catch(e){return}
  if(!t||t.del||!t.n)return;if(!ADM()&&t.o!==USER&&!t.s)return;rows.set(k,{k,t,virt:0})});
 const addV=(o,db)=>Object.keys(db.clients||{}).forEach(n=>{const k=tkKey(o,n);if(!rows.has(k)){const c=db.clients[n];rows.set(k,{k,t:{o,n,s:false,m:{},b:tkBanks(c),ver:c.ver},virt:1})}});
 if(ADM()){staffNames().forEach(u=>addV(u,ldU(u)));addV(ADMIN,ldU(ADMIN))}else addV(USER,DB);
 return[...rows.values()].sort((a,b)=>a.t.n.toLowerCase()<b.t.n.toLowerCase()?-1:1)}
const tkX=r=>(r.t.m&&r.t.m[tkMonth()])||{};
const tkDone=r=>{const x=tkX(r);return !!(x.g&&x.b&&x.t)};
function tkStats(){let t=0,d=0;try{tkLoad().forEach(r=>{t++;if(tkDone(r))d++})}catch(e){}return{t,d}}
function tkSave(r){r.t.at=Date.now();LS.setItem(r.k,JSON.stringify(r.t));r.virt=0}
function tkSet(i,f,val){const r=TKL[i];if(!r)return;const m=(r.t.m=r.t.m||{}),mo=tkMonth(),x=(m[mo]=m[mo]||{});
 if(f=='n')x.n=val;else x[f]=val?1:0;x.u=USER;x.at=Date.now();if(!x.g&&!x.b&&!x.t&&!x.n)delete m[mo];tkSave(r)}
function tkTick(btn,i,f){const on=!btn.classList.contains('on');btn.classList.toggle('on',on);btn.setAttribute('aria-pressed',on);tkSet(i,f,on);
 const row=btn.closest('.tkr');if(row)row.classList.toggle('done',tkDone(TKL[i]));tkMeters()}
let _tkn={};function tkNote(i,val){const r=TKL[i];if(!r)return;const m=(r.t.m=r.t.m||{}),mo=tkMonth(),x=(m[mo]=m[mo]||{});x.n=val;x.u=USER;x.at=Date.now();
 clearTimeout(_tkn[i]);_tkn[i]=setTimeout(()=>{if(!x.g&&!x.b&&!x.t&&!x.n)delete m[mo];tkSave(r)},350)}
function tkShare(i,on){const r=TKL[i];if(!r)return;r.t.s=!!on;tkSave(r);const l=document.querySelector('.tkr[data-i="'+i+'"] .sw span');if(l)l.textContent=on?'Shared with team':'Private'}
function tkOpen(i){const r=TKL[i];if(!r)return;const me=VIEW||USER;
 if(r.t.o===me){pick(r.t.n);return}
 if(ADM()){const k=staffNames().indexOf(r.t.o);if(r.t.o===ADMIN){exitView();pick(r.t.n);return}if(k>=0){viewAs(k);pick(r.t.n)}}}
function tkSyncLater(){clearTimeout(tkSyncLater.t);tkSyncLater.t=setTimeout(()=>{try{tkSync()}catch(e){}},1500)}
function tkSync(){if(!USER)return;const o=VIEW||USER;Object.keys(DB.clients||{}).forEach(n=>{const c=DB.clients[n],k=tkKey(o,n);let t=null;try{t=JSON.parse(LS.getItem(k)||'null')}catch(e){}
 const b=tkBanks(c);if(!t||t.del){LS.setItem(k,JSON.stringify({o,n,s:false,m:{},b,ver:c.ver,at:Date.now()}));return}
 if(JSON.stringify(t.b)!==JSON.stringify(b)||t.ver!==c.ver){t.b=b;t.ver=c.ver;LS.setItem(k,JSON.stringify(t))}})}
function tkDrop(n){try{const o=VIEW||USER;LS.setItem(tkKey(o,n),JSON.stringify({o,n,del:true,s:false}))}catch(e){}}
function tkFilter(){const q=TKS.q.toLowerCase(),me=VIEW||USER;
 return TKL.map((r,i)=>[r,i]).filter(([r])=>{
  if(q&&!(r.t.n.toLowerCase().includes(q)||String(r.t.o).toLowerCase().includes(q)))return false;
  if(TKS.f=='mine')return r.t.o===(ADM()?ADMIN:USER);if(TKS.f=='shared')return !!r.t.s;if(TKS.f=='todo')return !tkDone(r);return true})}
function tkMeters(){const L=tkFilter(),n=L.length,c=k=>L.filter(([r])=>tkX(r)[k]).length,
 M3=[['g','GST working'],['b','Bank data received'],['t','Entries done in Tally']],e=$id('tkm');if(!e)return;
 e.innerHTML=M3.map(([k,t])=>{const x=c(k),p=n?Math.round(x/n*100):0;return '<div class="mt"><div><span>'+t+'</span><b>'+x+'<small style="font:600 14px var(--sans)"> / '+n+'</small></b></div><div class="tr2"><i style="width:'+p+'%"></i></div></div>'}).join('')}
function tkBankLine(t){const b=t.b||[];return(t.ver?E(t.ver)+' · ':'')+(b.length?b.map(x=>E(x.l)+(x.i?' (imported '+fd(x.i)+')':'')).join(' · '):'No bank account added')}
function tkRows(){const L=tkFilter(),box=$id('tkl');if(!box)return;const me=VIEW||USER,still=app.classList.contains('still');
 if(!L.length){box.innerHTML='<div class="card" style="text-align:center;padding:36px"><b>No clients to show</b><br><small>'+(TKL.length?'Try another filter or search.':'Add a client from the menu and it will appear here.')+'</small></div>';tkMeters();return}
 box.innerHTML='<div class="tkh"><span>Client</span><span>GST working</span><span>Bank data received</span><span>Entries in Tally</span><span>Note</span><span></span></div>'
 +L.map(([r,i],j)=>{const t=r.t,x=tkX(r),own=t.o===me||t.o===USER,can=own||ADM(),openable=t.o===me||ADM();
  const bt=(f,lbl)=>'<div class="tkc"><button class="tkb'+(x[f]?' on':'')+'" aria-pressed="'+(x[f]?1:0)+'" aria-label="'+lbl+'" title="'+lbl+(x[f]&&x.u?' · '+E(x.u):'')+'" onclick="tkTick(this,'+i+',\''+f+'\')">'+IC.tick+'</button><small>'+lbl+'</small></div>';
  return '<div class="tkr'+(tkDone(r)?' done':'')+'" data-i="'+i+'" style="animation-delay:'+(still?0:Math.min(j,14)*35)+'ms"><div class="tkn"><b'+(openable?' style="cursor:pointer" onclick="tkOpen('+i+')" title="Open client"':'')+'>'+E(t.n)+(t.o!==USER?'<span class="own">'+(t.o===ADMIN?'Admin':E(t.o))+'</span>':'')+'</b><small>'+tkBankLine(t)+'</small></div>'
  +bt('g','GST working')+bt('b','Bank data received')+bt('t','Entries in Tally')
  +'<div class="tkx"><input value="'+E(x.n||'')+'" maxlength="300" placeholder="Add a note..." oninput="tkNote('+i+',this.value)"></div>'
  +'<div class="tks">'+(can?'<label class="sw"><input type="checkbox" '+(t.s?'checked ':'')+'onchange="tkShare('+i+',this.checked)"><i></i><span>'+(t.s?'Shared with team':'Private')+'</span></label>':'<span class="tag info">Shared</span>')+'</div></div>'}).join('');
 tkMeters()}
function trk(){if(!USER)return home();CURP='trk';sb();tg(0);const same=pgIn('trk'),mo=tkMonth();TKL=tkLoad();
 app.innerHTML='<i data-pg="trk" hidden></i><div class="ch"><h2 style="margin:0">Client tracker</h2></div><small>Tick off the work for each client, month by month. Make a client <b>Shared</b> if the rest of the team should see it too.</small>'
  +'<div class="toolbar"><div class="mo"><button onclick="tkMo(-1)" aria-label="Previous month">&lsaquo;</button><b>'+mLabel(mo)+'</b><button onclick="tkMo(1)" aria-label="Next month">&rsaquo;</button></div>'
  +'<div class="seg">'+[['all','All'],['mine',ADM()?'Admin\'s':'Mine'],['shared','Shared'],['todo','To do']].map(([k,t])=>'<button class="'+(TKS.f==k?'on':'')+'" onclick="TKS.f=\''+k+'\';trk()">'+t+'</button>').join('')+'</div></div>'
  +'<input class="sq" id="tkq" placeholder="Search client or staff..." value="'+E(TKS.q)+'" oninput="TKS.q=this.value;clearTimeout(window._tq);window._tq=setTimeout(tkRows,120)">'
  +'<div class="meters" id="tkm"></div><div id="tkl"></div>';tkRows()}
function tkMo(n){TKS.m=mShift(tkMonth(),n);trk()}

/* ====================================================================
   ATTENDANCE  (key att_<user>: {d:{'2026-10-20':{s,i,o,n}}} ; jkgatg = who may check in)
   ==================================================================== */
const ATM={P:['Present','ok'],H:['Half day','warn'],L:['Leave','info'],A:['Absent','bad'],W:['Week off','']};
const ATS={m:'',L:[],pick:''};
const ATG=()=>{try{return JSON.parse(LS.getItem('jkgatg')||'[]')}catch(e){return[]}};
const atOK=()=>!!USER&&(USER===ADMIN||ATG().includes(USER));
const attGet=u=>{try{const o=JSON.parse(LS.getItem('att_'+u)||'null');return o&&o.d?o:{d:{}}}catch(e){return{d:{}}}};
const attSave=(u,o)=>LS.setItem('att_'+u,JSON.stringify(o));
const attMonth=()=>ATS.m||(ATS.m=ymd(new Date()).slice(0,7));
const hrs=r=>{if(!r||!r.i||!r.o)return 0;const a=r.i.split(':'),b=r.o.split(':'),m=(+b[0]*60+ +b[1])-(+a[0]*60+ +a[1]);return m>0?m/60:0};
const hfmt=h=>Math.floor(h)+'h '+jkP2(Math.round((h%1)*60))+'m';
function attTot(o,mo){const t={P:0,H:0,L:0,A:0,W:0,h:0};Object.keys(o.d).forEach(d=>{if(d.slice(0,7)!==mo)return;const r=o.d[d];if(t[r.s]!=null)t[r.s]++;t.h+=hrs(r)});return t}
function attLine(){try{if(ADM()){const L=Object.keys(U()),td=ymd(new Date());const n=L.filter(u=>{const r=attGet(u).d[td];return r&&(r.s=='P'||r.s=='H'||r.i)}).length;return L.length?n+' of '+L.length+' in today':'No staff added yet'}
 const r=attGet(USER).d[ymd(new Date())];return r&&r.i?('Checked in at '+r.i+(r.o?' · out '+r.o:'')):'Not checked in yet'}catch(e){return''}}
function att(){if(!USER)return home();if(!atOK()){toast('Attendance is not enabled for your login.');return}CURP='att';sb();tg(0);ADM()?attAdmin():attSelf()}
function attRender(){if(!USER||!atOK())return;ADM()?attAdmin():attSelf()}
function attMo(n){ATS.m=mShift(attMonth(),n);attRender()}
function attTick(){const e=$id('clk');if(!e)return;const d=new Date();e.textContent=jkP2(d.getHours())+':'+jkP2(d.getMinutes())+':'+jkP2(d.getSeconds())}
function attIn(){const o=attGet(USER),td=ymd(new Date()),r=o.d[td]=o.d[td]||{};if(r.i){toast('Already checked in at '+r.i);return}r.i=hhmm(new Date());if(!r.s||r.s=='A')r.s='P';attSave(USER,o);toast('Checked in at '+r.i);attSelf()}
function attOut(){const o=attGet(USER),td=ymd(new Date()),r=o.d[td];if(!r||!r.i){toast('Check in first.');return}r.o=hhmm(new Date());attSave(USER,o);toast('Checked out at '+r.o+' · worked '+hfmt(hrs(r)));attSelf()}
function attSelf(){const same=pgIn('att'),o=attGet(USER),now=new Date(),td=ymd(now),r=o.d[td]||{},mo=attMonth(),T=attTot(o,mo),isCur=mo==td.slice(0,7);
 const y=+mo.slice(0,4),mm=+mo.slice(5)-1,first=new Date(y,mm,1).getDay(),dim=new Date(y,mm+1,0).getDate();
 let cells='';['S','M','T','W','T','F','S'].forEach(x=>cells+='<div class="h">'+x+'</div>');for(let i=0;i<first;i++)cells+='<div class="c e"></div>';
 for(let d=1;d<=dim;d++){const k=mo+'-'+jkP2(d),x=o.d[k],dow=new Date(y,mm,d).getDay();
  cells+='<div class="c'+(x&&x.s?' st-'+x.s:'')+(k==td?' today':'')+(dow==0?' sun':'')+'"><b>'+d+'</b>'+(x?'<span>'+(x.s?ATM[x.s][0]:'')+'</span>'+(x.i?'<span>'+x.i+(x.o?' – '+x.o:'')+'</span>':'')+(x.n?'<span title="'+E(x.n)+'">&#9998; note</span>':''):'')+'</div>'}
 app.innerHTML='<i data-pg="att" hidden></i><div class="clock"><div><small>Today</small><div class="t" id="clk">--:--:--</div><div class="d">'+now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</div>'
  +'<div class="d" style="margin-top:8px">'+(r.i?('In at <b>'+r.i+'</b>'+(r.o?' · Out at <b>'+r.o+'</b> · '+hfmt(hrs(r)):' · still working')):'You have not checked in yet.')+'</div></div>'
  +'<div class="btns"><button onclick="attIn()"'+(r.i?' disabled':'')+'>Check in</button><button class="g" onclick="attOut()"'+(!r.i||r.o?' disabled':'')+'>Check out</button></div></div>'
  +'<div class="toolbar"><div class="mo"><button onclick="attMo(-1)" aria-label="Previous month">&lsaquo;</button><b>'+mLabel(mo)+'</b><button onclick="attMo(1)" aria-label="Next month">&rsaquo;</button></div><button class="g" onclick="attXlsSelf()">Download my attendance (Excel)</button></div>'
  +'<div class="stats"><div><b>'+T.P+'</b>Present</div><div><b>'+T.H+'</b>Half days</div><div><b>'+T.L+'</b>Leave</div><div><b>'+hfmt(T.h)+'</b>Hours worked</div></div>'
  +'<div class="card"><div class="cal">'+cells+'</div></div><small>The admin can correct any day. Times come from this computer\'s clock.</small>';
 attTick();ATI=setInterval(attTick,1000)}
function attAdmin(){const same=pgIn('att'),L=Object.keys(U()),mo=attMonth(),y=+mo.slice(0,4),mm=+mo.slice(5)-1,dim=new Date(y,mm+1,0).getDate(),td=ymd(new Date()),atg=ATG();ATS.L=L;
 const head='<th>Staff</th>'+Array.from({length:dim},(_,i)=>{const dow=new Date(y,mm,i+1).getDay();return '<th class="'+(dow==0?'sun':'')+'">'+(i+1)+'<br><small>'+'SMTWTFS'[dow]+'</small></th>'}).join('')+'<th>P</th><th>H</th><th>L</th><th>A</th><th>Days</th>';
 const rows=L.map((u,si)=>{const o=attGet(u),T=attTot(o,mo);return '<tr><td><b>'+E(u)+'</b><br><label class="sw" title="Allow this person to check in themselves"><input type="checkbox" '+(atg.includes(u)?'checked ':'')+'onchange="atSet('+si+',this.checked)"><i></i><span>Self check-in</span></label></td>'
  +Array.from({length:dim},(_,i)=>{const k=mo+'-'+jkP2(i+1),x=o.d[k],dow=new Date(y,mm,i+1).getDay();return '<td class="a'+(dow==0?' sun':'')+(x&&x.s?' st-'+x.s:'')+'" onclick="attDay('+si+',\''+k+'\')" title="'+(x?(x.s?ATM[x.s][0]:'')+(x.i?' '+x.i+(x.o?'–'+x.o:''):'')+(x.n?' · '+E(x.n):''):'Click to mark')+'">'+(x&&x.s?x.s:'')+'</td>'}).join('')
  +'<td class="tot">'+T.P+'</td><td class="tot">'+T.H+'</td><td class="tot">'+T.L+'</td><td class="tot">'+T.A+'</td><td class="tot">'+(T.P+T.H/2)+'</td></tr>'}).join('');
 const who=L.map(u=>{const r=attGet(u).d[td];const st=r&&r.i?(r.o?'out':'in'):'';return '<div class="wc '+st+'"><i></i><div><b>'+E(u)+'</b><small>'+(r&&r.i?(r.o?'Left '+r.o+' · '+hfmt(hrs(r)):'In since '+r.i):(r&&r.s&&ATM[r.s]?ATM[r.s][0]:'Not in yet'))+'</small></div></div>'}).join('');
 app.innerHTML='<i data-pg="att" hidden></i><div class="ch"><h2 style="margin:0">Attendance</h2><button class="g" onclick="attXls()">Download Excel</button></div><small>Click any day to mark or correct it. Switch on <b>Self check-in</b> for the people who should check themselves in.</small>'
  +'<div class="toolbar"><div class="mo"><button onclick="attMo(-1)" aria-label="Previous month">&lsaquo;</button><b>'+mLabel(mo)+'</b><button onclick="attMo(1)" aria-label="Next month">&rsaquo;</button></div></div>'
  +(L.length?'<h3>Today</h3><div class="who">'+who+'</div><h3>'+mLabel(mo)+'</h3><div class="leg">'+Object.entries(ATM).map(([k,x])=>'<span class="st-'+k+'">'+k+' = '+x[0]+'</span>').join('')+'</div><div class="agrid"><table><tr>'+head+'</tr>'+rows+'</table></div>'
   :'<div class="card" style="text-align:center;padding:34px"><b>No staff yet</b><br><small>Add staff under Staff &amp; access, then they will appear here.</small><br><button onclick="staffF()">Add staff</button></div>')}
function atSet(si,on){const u=ATS.L[si],g=ATG().filter(x=>x!=u);if(on)g.push(u);LS.setItem('jkgatg',JSON.stringify(g));toast(on?u+' can now check in.':u+' can no longer check in.')}
function atTog(i){const u=UN(i),g=ATG(),k=g.indexOf(u);k<0?g.push(u):g.splice(k,1);LS.setItem('jkgatg',JSON.stringify(g));staffF()}
function attDay(si,d){const u=ATS.L[si];if(u==null)return;const r=attGet(u).d[d]||{};ATS.pick=r.s||'';ATS.cur=[si,d];
 modal('<h3>'+E(u)+' · '+fd(d)+'</h3><div class="seg" id="adS" style="flex-wrap:wrap">'+Object.entries(ATM).map(([k,x])=>'<button class="'+(ATS.pick==k?'on':'')+'" onclick="attPick(\''+k+'\',this)">'+x[0]+'</button>').join('')+'</div>'
  +'<div class="pf"><label>In<input type="time" id="adi" value="'+(r.i||'')+'"></label><label>Out<input type="time" id="ado" value="'+(r.o||'')+'"></label><label class="wd">Note<input id="adn" maxlength="200" value="'+E(r.n||'')+'"></label></div>'
  +'<button onclick="attDaySave()">Save</button><button class="g" onclick="attDayClear()">Clear this day</button>')}
function attPick(k,b){ATS.pick=ATS.pick==k?'':k;document.querySelectorAll('#adS button').forEach(x=>x.classList.remove('on'));if(ATS.pick)b.classList.add('on')}
function attDaySave(){const[si,d]=ATS.cur,u=ATS.L[si],o=attGet(u),i=v('adi'),ot=v('ado'),n=v('adn').trim();let s=ATS.pick;if(!s&&(i||ot))s='P';
 if(!s&&!n&&!i&&!ot)delete o.d[d];else o.d[d]={s,i,o:ot,n};attSave(u,o);modal();attAdmin()}
function attDayClear(){const[si,d]=ATS.cur,u=ATS.L[si],o=attGet(u);delete o.d[d];attSave(u,o);modal();attAdmin()}
function attSheet(a,sh,nm){if(window.XLSX){const wb=XLSX.utils.book_new();sh.forEach(([n,r])=>{const w=XLSX.utils.aoa_to_sheet(r);w['!cols']=r[0].map((_,i)=>({wch:Math.min(38,Math.max(8,...r.map(x=>String(x[i]==null?'':x[i]).length+2)))}));XLSX.utils.book_append_sheet(wb,w,n)});XLSX.writeFile(wb,nm+'.xlsx')}
 else{const q=r=>r.map(x=>x.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(',')).join('\r\n');dl(nm+'.csv','\uFEFF'+sh.map(([n,r])=>'## '+n+'\r\n'+q(r)).join('\r\n\r\n'),'text/csv')}}
function attDetail(u,mo){const o=attGet(u),dim=new Date(+mo.slice(0,4),+mo.slice(5),0).getDate(),R=[];
 for(let d=1;d<=dim;d++){const k=mo+'-'+jkP2(d),x=o.d[k]||{},dow=new Date(+mo.slice(0,4),+mo.slice(5)-1,d).getDay();R.push([fd(k),'Sun Mon Tue Wed Thu Fri Sat'.split(' ')[dow],x.s?ATM[x.s][0]:(dow==0?'Week off':''),x.i||'',x.o||'',x.i&&x.o?Math.round(hrs(x)*100)/100:'',x.n||''])}
 return R}
function attXlsSelf(){const mo=attMonth(),T=attTot(attGet(USER),mo),R=[['Date','Day','Status','In','Out','Hours','Note']].concat(attDetail(USER,mo));
 R.push([],['Present',T.P],['Half days',T.H],['Leave',T.L],['Absent',T.A],['Days worked',T.P+T.H/2],['Hours worked',Math.round(T.h*100)/100]);
 attSheet(0,[[mLabel(mo).slice(0,28),R]],'JK-Attendance-'+USER+'-'+mo)}
function attXls(){const L=Object.keys(U()),mo=attMonth(),dim=new Date(+mo.slice(0,4),+mo.slice(5),0).getDate();
 const R=[['Staff'].concat(Array.from({length:dim},(_,i)=>i+1),['Present','Half day','Leave','Absent','Days worked','Hours'])];
 L.forEach(u=>{const o=attGet(u),T=attTot(o,mo);R.push([u].concat(Array.from({length:dim},(_,i)=>{const x=o.d[mo+'-'+jkP2(i+1)];return x&&x.s?x.s:''}),[T.P,T.H,T.L,T.A,T.P+T.H/2,Math.round(T.h*100)/100]))});
 const D=[['Staff','Date','Day','Status','In','Out','Hours','Note']];L.forEach(u=>attDetail(u,mo).forEach(r=>D.push([u].concat(r))));
 attSheet(0,[['Summary',R],['Daily details',D]],'JK-Attendance-'+mo)}

/* ====================================================================
   STAFF & ACCESS  (admin only)
   ==================================================================== */
function staffF(){if(!ADM())return;CURP='stf';sb();tg(0);$id('dd').classList.remove('o');const same=pgIn('stf'),us=Object.keys(U()),pcg=PG(),atg=ATG(),SN=staffNames();
 const rows=us.map((u,i)=>'<div class="sfr"><div><b>'+E(u)+'</b><small>'+(()=>{const r=attGet(u).d[ymd(new Date())];return r&&r.i?'In at '+r.i:'Staff login'})()+'</small></div>'
  +'<label class="sw"><input type="checkbox" '+(pcg.includes(u)?'checked ':'')+'onchange="pcTog('+i+')"><i></i><span>Petty cash</span></label>'
  +'<label class="sw"><input type="checkbox" '+(atg.includes(u)?'checked ':'')+'onchange="atTog('+i+')"><i></i><span>Attendance</span></label>'
  +'<div class="ac"><button class="sm" onclick="viewAs('+SN.indexOf(u)+')">Open work</button><span style="display:inline-flex;align-items:center;gap:4px"><span id="pw'+i+'" style="font-family:ui-monospace,Consolas,monospace">••••••</span><button class="g sm" onclick="pwShow('+i+')">Show</button></span><button class="g sm" onclick="rstU('+i+')">Reset password</button><button class="g sm" onclick="delU('+i+')" style="color:var(--bad)">Delete</button></div></div>').join('');
 app.innerHTML='<i data-pg="stf" hidden></i><h2>Staff &amp; access</h2><small>Add staff, reset their passwords and decide who can use petty cash and attendance. Changes apply straight away on every PC.</small>'
  +'<div class="card"><b>Add a staff login</b><div class="addf" style="margin-top:10px"><label>Username<input id="au" autocomplete="off" autocapitalize="none" placeholder="e.g. ravi"></label><label>Password<input id="ap" type="text" autocomplete="off" placeholder="At least 4 characters"></label><button onclick="addU()">Add staff</button></div></div>'
  +'<h3>Team ('+us.length+')</h3>'+(us.length?'<div class="sf">'+rows+'</div>':'<div class="card" style="text-align:center;padding:30px"><b>No staff yet</b><br><small>Add the first login above.</small></div>')
  +'<small style="display:block;margin-top:14px">"Show" displays a password only on the PC where it was set. If it says not recorded, press Reset password once.</small>'}

/* ====================================================================
   GSTIN / HSN CHECKER
   ==================================================================== */
const PANT={P:'Individual',C:'Company',H:'Hindu Undivided Family',F:'Firm / LLP',A:'Association of Persons',T:'Trust',B:'Body of Individuals',L:'Local Authority',J:'Artificial Juridical Person',G:'Government'};
const GCH='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function gchk(){CURP='gx';sb();tg(0);$id('dd').classList.remove('o');pgIn('gx');
 let H=[];try{H=JSON.parse(NATIVE.getItem('jkgghist')||'[]')}catch(e){}
 app.innerHTML='<i data-pg="gx" hidden></i><div class="gx"><div class="gxh"><h2>GSTIN &amp; HSN checker</h2><p>Instant check of the format, state and check character. Works offline.</p></div>'
  +'<div class="card"><label>GSTIN<input id="gg" class="gxi" maxlength="15" placeholder="Type or paste a 15-character GSTIN" oninput="gv()" autocomplete="off" spellcheck="false" style="margin-top:6px"></label><div class="gxs" id="gxs"></div><div id="gor"></div>'
  +(H.length?'<div class="gxh2" id="gxh">'+H.map(x=>'<button class="g sm" onclick="gSet(\''+x+'\')">'+x+'</button>').join('')+'</div>':'')+'</div>'
  +'<div class="card"><label>HSN / SAC code<input id="gh" class="gxi" maxlength="8" inputmode="numeric" placeholder="HSN or SAC code" oninput="gv()" autocomplete="off" style="margin-top:6px"></label><div id="hor"></div></div>'
  +'<small>This checks the format and the check character only. It cannot tell whether a GSTIN is active, which needs the GST portal.</small></div>';gv()}
function gSet(x){$id('gg').value=x;gv()}
function gPortal(g){gCopy(g);window.open('https://services.gst.gov.in/services/searchtp','_blank','noopener')}
function gCopy(t){try{navigator.clipboard.writeText(t);toast('Copied '+t)}catch(e){toast('Copy not available here')}}
function gv(){const gi=$id('gg'),hi=$id('gh');if(!gi)return;const g=gi.value.trim().toUpperCase().replace(/[^0-9A-Z]/g,'');if(gi.value!==g)gi.value=g;
 const P=[[0,2,'State','s1'],[2,12,'PAN','s2'],[12,13,'Entity','s3'],[13,14,'Z','s4'],[14,15,'Check','s5']];
 $id('gxs').style.gridTemplateColumns='2fr 10fr 1.5fr 1.2fr 1.5fr';
 $id('gxs').innerHTML=P.map(([a,b,l,c])=>'<span class="'+c+(g.length>a?'':' mt0')+'">'+(g.slice(a,b)+'·'.repeat(Math.max(0,b-a-Math.max(0,g.length-a)))).slice(0,b-a)+'<small>'+l+'</small></span>').join('');
 const o=$id('gor');let ok=false,ck=false,f=false;
 if(!g){o.innerHTML='<div class="gxr part"><small>Type a GSTIN above to check it.</small></div>'}
 else if(g.length<15){o.innerHTML='<div class="gxr part"><div class="big"><i>…</i>'+g.length+' of 15 characters</div></div>'}
 else{f=/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g);
  if(f){let s=0;for(let i=0;i<14;i++){const q=GCH.indexOf(g[i])*(i%2?2:1);s+=Math.floor(q/36)+q%36}ck=GCH[(36-s%36)%36]==g[14]}
  if(!f){const why=[];if(!/^\d{2}/.test(g))why.push('The first 2 characters must be the state code (digits).');if(!/^.{2}[A-Z]{5}\d{4}[A-Z]/.test(g))why.push('Characters 3 to 12 must be a PAN: 5 letters, 4 digits, 1 letter.');if(g[13]!='Z')why.push('The 14th character must be Z.');
   o.innerHTML='<div class="gxr badr"><div class="big"><i>✕</i>Wrong format</div><p style="margin:10px 0 0">'+(why.join('<br>')||'The pattern does not match a GSTIN.')+'</p></div>'}
  else if(!ck){o.innerHTML='<div class="gxr badr"><div class="big"><i>✕</i>Check character is wrong</div><p style="margin:10px 0 0">The format is right, so there is a typing error somewhere. The last character should be <b>'+(()=>{let s=0;for(let i=0;i<14;i++){const q=GCH.indexOf(g[i])*(i%2?2:1);s+=Math.floor(q/36)+q%36}return GCH[(36-s%36)%36]})()+'</b> for these first 14 characters.</p></div>'}
  else{ok=true;const pan=g.slice(2,12),st=ST[g.slice(0,2)],en=g[12],n=GCH.indexOf(en);
   o.innerHTML='<div class="gxr good"><div class="big"><i>✓</i>Valid GSTIN</div><div class="gxd"><div><small>State</small><b>'+g.slice(0,2)+' · '+(st?E(st):'Unknown code')+'</b></div><div><small>PAN</small><b>'+pan+'</b></div><div><small>Taxpayer type</small><b>'+(PANT[pan[3]]||'Other')+'</b></div><div><small>Registration no. on this PAN</small><b>#'+n+' in the state</b></div></div>'
   +'<div class="gxh2"><button class="sm" onclick="gCopy(\''+g+'\')">Copy GSTIN</button><button class="g sm" onclick="gCopy(\''+pan+'\')">Copy PAN</button><button class="g sm" onclick="gPortal(\''+g+'\')">Check status on GST portal</button></div><p class="gxn">This tool checks that the number is correctly formed. Whether it is Active, Cancelled or Surrendered, and the registered name, can only be seen on the official GST portal (Search Taxpayer). The button copies the GSTIN and opens it. Paste it there and enter the captcha.</p></div>'+(st?'':'<div class="gxr part"><small>The state code '+g.slice(0,2)+' is not in the list, please double check.</small></div>');
   try{let H=JSON.parse(NATIVE.getItem('jkgghist')||'[]').filter(x=>x!=g);H.unshift(g);NATIVE.setItem('jkgghist',JSON.stringify(H.slice(0,5)))}catch(e){}}}
 const h=(hi.value=hi.value.replace(/\D/g,'')),q=$id('hor');
 if(!h){q.innerHTML='';return}
 const sac=h.startsWith('99'),L=h.length,okL=[2,4,6,8].includes(L),ch=+h.slice(0,2),chOk=ch>=1&&ch<=99&&ch!=77;
 const seg=[['Chapter',h.slice(0,2),'s1'],['Heading',h.slice(2,4),'s2'],['Sub-heading',h.slice(4,6),'s3'],['Tariff item',h.slice(6,8),'s4']].filter(x=>x[1]);
 q.innerHTML='<div class="gxs" style="grid-template-columns:repeat('+seg.length+',1fr);margin-top:14px">'+seg.map(x=>'<span class="'+x[2]+'">'+x[1]+'<small>'+x[0]+'</small></span>').join('')+'</div>'
  +(L==1||L==3||L==5||L==7?'<div class="gxr part"><div class="big"><i>…</i>Keep typing</div><p style="margin:8px 0 0">HSN is 2, 4, 6 or 8 digits.</p></div>'
   :!chOk?'<div class="gxr badr"><div class="big"><i>✕</i>Chapter '+jkP2(ch)+' does not exist</div></div>'
   :'<div class="gxr good"><div class="big"><i>✓</i>'+L+'-digit '+(sac?'SAC (services)':'HSN (goods)')+'</div><div class="gxd"><div><small>Type</small><b>'+(sac?'Services (SAC)':'Goods (HSN)')+'</b></div><div><small>Chapter</small><b>'+jkP2(ch)+'</b></div><div><small>B2B invoices</small><b>4 digits up to ₹5 crore, 6 digits above</b></div></div></div>');
 if(sac&&L!=6&&okL)q.innerHTML+='<div class="gxr part"><small>A SAC is normally 6 digits starting with 99.</small></div>'}

/* ====================================================================
   LIVE UPDATES, AUTO-UPDATE AND SESSION
   ==================================================================== */
function reloadMine(){let d=null;try{d=JSON.parse(LS.getItem('jkg_'+USER)||'null')}catch(e){}DB=d&&d.clients?d:{clients:{}};Object.values(DB.clients).forEach(fixN);S={};home()}
let _synT=0;
function onSyncKeys(ch){if(!USER)return;
 if(!VIEW&&ch.includes('jkg_'+USER)&&!onSyncKeys.w){onSyncKeys.w=toast('Your data was changed on another PC.','Refresh',()=>{onSyncKeys.w=0;reloadMine()},0)}
 clearTimeout(_synT);_synT=setTimeout(()=>{if(modalOpen())return;const pg=curPg(),has=p=>ch.some(k=>k.indexOf(p)==0);
  if(pg=='trk'&&(has(TKP)||has('jkg_'))&&!typing()){TKL=tkLoad();tkRows()}
  else if(pg=='att'&&(has('att_')||has('jkgatg')||has('jkgusers')))attRender();
  else if(pg=='stf'&&(has('jkgusers')||has('jkgpcg')||has('jkgatg')||has('att_')))staffF();
  else if(pg=='home'&&!typing()&&(has('att_')||has(TKP)||has('jkgusers')||has('jkgpcg')||has('jkgatg')||(ADM()&&has('jkg_'))))home()},250)}
async function verCheck(){if(verCheck.t&&Date.now()-verCheck.t<60000)return;verCheck.t=Date.now();
 try{const r=await fetch('/version.txt?'+Date.now(),{cache:'no-store'});if(!r.ok)return;const t=(await r.text()).trim();if(!/^[0-9a-z]{6,}$/i.test(t))return;
  if(t!==BUILD){if(!USER){location.reload();return}if(!verCheck.u)verCheck.u=toast('A new version is ready.','Update now',()=>location.reload(),0)}}catch(e){}}
setInterval(()=>{if(document.visibilityState==='visible')verCheck()},180000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')verCheck()});

/* ---------------- load backup (more forgiving) ---------------- */
function imp(inp){const f=inp.files&&inp.files[0];if(!f)return;const reset=()=>{try{inp.value=''}catch(e){}};
 const rd=new FileReader();rd.onerror=()=>{reset();alert('This file could not be opened.')};
 rd.onload=()=>{let o=null;try{o=JSON.parse(String(rd.result).replace(/^﻿/,''))}catch(e){reset();return alert('This is not a valid backup file. Use the file made by "Download backup" (it ends with .json).')}
  /* accepted shapes: {clients:{...}} | {jkg_<user>:"{...}"} (a full browser dump) | a JSON string holding either */
  if(typeof o==='string'){try{o=JSON.parse(o)}catch(e){}}
  let d=null;if(o&&o.clients&&typeof o.clients==='object')d=o;
  else if(o&&typeof o==='object'){const k=Object.keys(o).find(x=>x==='jkg_'+(VIEW||USER))||Object.keys(o).find(x=>/^jkg_/.test(x)&&x!=='jkg_conf');if(k){try{const t=typeof o[k]==='string'?JSON.parse(o[k]):o[k];if(t&&t.clients)d=t}catch(e){}}}
  if(!d){reset();return alert('This file does not look like a JK Gupta backup (no clients found in it).')}
  const n=Object.keys(d.clients).length;if(!confirm('This replaces all data of '+(VIEW?VIEW+'\'s':'this')+' login with the backup ('+n+' client'+(n==1?'':'s')+'). Continue?')){reset();return}
  DB=d;Object.values(DB.clients).forEach(fixN);save();reset();S={};home();toast('Backup loaded: '+n+' client'+(n==1?'':'s')+'.')};
 rd.readAsText(f)}

/* ====================================================================
   SAFER DELETES (confirm + undo) and nicer client page
   ==================================================================== */
function delA(i){const c=C(),a=c&&c.accounts[i];if(!a)return;
 modal('<h3>Remove this bank account?</h3><p><b>'+E(a.label)+'</b><br><small>Tally ledger: '+E(a.ledger)+'</small></p><p>Its saved statement history stays. You can undo for a few seconds after removing.</p><button class="danger" onclick="delAdo('+i+')">Yes, remove it</button>')}
function delAdo(i){const c=C(),a=c.accounts[i];if(!a)return;c.accounts.splice(i,1);save();modal();dash();
 toast('Bank account removed.','Undo',()=>{c.accounts.splice(Math.min(i,c.accounts.length),0,a);save();dash()},9000)}
function delC(){const n=S.c;if(!n)return;
 modal('<h3>Delete the client "'+E(n)+'"?</h3><p>This removes its bank accounts, ledger names, rules and history. Type the client name to confirm.</p><input id="dcn" autocomplete="off" placeholder="'+E(n)+'" oninput="document.getElementById(\'dcb\').disabled=this.value.trim().toLowerCase()!==\''+E(n).replace(/'/g,"\\'").toLowerCase()+'\'"><button id="dcb" class="danger" disabled onclick="delCdo()">Delete this client</button>')}
function delCdo(){const n=S.c,cp=DB.clients[n];if(!cp)return;const own=VIEW||USER;modal();tkDrop(n);delete DB.clients[n];save();S={};home();
 toast('Client "'+n+'" deleted.','Undo',()=>{DB.clients[n]=cp;save();try{tkSync()}catch(e){}home()},12000)}
function delU(i){const u=UN(i);if(!u)return;
 modal('<h3>Delete the login "'+E(u)+'"?</h3><p>They will no longer be able to sign in. Their saved clients and attendance stay saved. Type the username to confirm.</p><input id="dun" autocomplete="off" placeholder="'+E(u)+'" oninput="document.getElementById(\'dub\').disabled=this.value.trim().toLowerCase()!==\''+E(u).replace(/'/g,"\\'")+'\'"><button id="dub" class="danger" disabled onclick="delUdo('+i+')">Delete this login</button>')}
function delUdo(i){const u=UN(i);if(!u)return;const us=U(),h=us[u],pg=PG().includes(u),ag=ATG().includes(u);delete us[u];LS.setItem('jkgusers',JSON.stringify(us));LS.setItem('jkgpcg',JSON.stringify(PG().filter(x=>x!=u)));LS.setItem('jkgatg',JSON.stringify(ATG().filter(x=>x!=u)));modal();staffF();
 toast('Login "'+u+'" deleted.','Undo',()=>{const w=U();w[u]=h;LS.setItem('jkgusers',JSON.stringify(w));if(pg){const g=PG();g.push(u);LS.setItem('jkgpcg',JSON.stringify(g))}if(ag){const g=ATG();g.push(u);LS.setItem('jkgatg',JSON.stringify(g))}staffF()},12000)}
function bankCards(c){if(!c.accounts.length)return '<div class="card empty"><b>No bank accounts yet</b><small>Import them from a Tally file below, or add one by hand.</small></div>';
 return '<div class="bkg">'+c.accounts.map((a,i)=>{const d=days(a.lastImport),st=d==null?['Not imported yet','']:d<=15?['Imported '+(d==0?'today':d+'d ago'),'ok']:d<=30?['Imported '+d+'d ago','warn']:['Imported '+d+'d ago','warn'],ini=(a.label||'?').replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase()||'BK';
  return '<div class="bk2"><span class="av">'+ini+'</span><div class="bi"><b>'+E(a.label)+'</b><small>Tally ledger · '+E(a.ledger)+'</small><div class="bt"><span class="tag '+st[1]+'">'+st[0]+'</span>'+(a.lastTxn?'<span class="tag">Last transaction '+fd(a.lastTxn)+'</span>':'')+'</div></div><div class="ba"><button onclick="start('+i+')">Import statement</button><button class="g ib2" title="Remove this bank account" aria-label="Remove this bank account" onclick="delA('+i+')">'+IC.dots+'</button></div></div>'}).join('')+'</div>'}
