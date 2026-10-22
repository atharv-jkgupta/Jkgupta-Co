<script>
/* Online storage (Supabase). All PCs share one database. The password is checked once on the server, which hands back a session token; every later call uses only that token. */
const CLOUD={url:'__URL__',key:'__KEY__'};
const TRAVELBUILD=__TB__;
const NATIVE=window.localStorage;
const LS=(()=>{
 const M={},pend={},T={},fail={};
 const on=!!(CLOUD.url&&CLOUD.key);
 let trav=null,sess=null,since=null,poll=null,Q=Promise.resolve(),warned=0,busy=0;
 const hdr={apikey:CLOUD.key,'Content-Type':'application/json'};
 if(/^eyJ/.test(CLOUD.key))hdr.Authorization='Bearer '+CLOUD.key;
 const base=CLOUD.url.replace(/\/+$/,'')+'/rest/v1/rpc/';
 const rpc=(f,b,ka)=>fetch(base+f,{method:'POST',headers:hdr,body:JSON.stringify(b),keepalive:!!ka}).then(r=>{if(!r.ok){const e=new Error('HTTP '+r.status);e.status=r.status;throw e}return r.json()});
 const loc=k=>(!on&&!trav)||k=='jkgpw';
 const el=id=>document.getElementById(id);
 const status=()=>{const e=el('sv');if(!e)return;const n=Object.keys(pend).length,f=Object.keys(fail).length;
  e.className=f?'err':n?'busy':'';e.innerHTML=!sess?'':f?'<i></i>Not saved, retrying':n?'<i></i>Saving':'<i></i>Saved'};
 const banner=(t,act)=>{let b=el('jkgbn');if(!t){if(b)b.remove();return}
  if(!b){b=document.createElement('div');b.id='jkgbn';document.body.appendChild(b)}b.textContent=t};
 const iso=t=>{const d=new Date(t);return isNaN(d)?null:new Date(d.getTime()-3000).toISOString()};
 const apply=rows=>{const ch=[];rows.forEach(r=>{if(!since||r.t>since)since=r.t;if(pend[r.k]||fail[r.k])return;if(M[r.k]!==r.v){M[r.k]=r.v;ch.push(r.k)}});return ch};
 const send=k=>{Q=Q.then(()=>{if(!sess)return;const v=M[k];
   const ka=(v==null?0:v.length)<50000;
   return(v==null?rpc('kv_del',{p_t:sess.t,p_k:k},ka):rpc('kv_put',{p_t:sess.t,p_k:k,p_v:v},ka)).then(r=>{
    if(!r||!r.ok){if(r&&r.err=='session'){expired();return}throw new Error(r&&r.err||'refused')}
    delete fail[k];if(M[k]===v)delete pend[k];status();if(!Object.keys(fail).length&&warned){warned=0;banner('')}})})
  .catch(e=>{fail[k]=1;delete pend[k];status();if(!warned){warned=1;banner('Could not save to the online database ('+e.message+'). Your change is kept on this screen and will retry. Please do not close this page.')}})};
 const put=k=>{if(trav){clearTimeout(trav.T);trav.T=setTimeout(()=>L.travSave&&L.travSave(),250);const e=el('sv');if(e){e.className='busy';e.innerHTML='<i></i>Saving'}return}pend[k]=1;clearTimeout(T[k]);T[k]=setTimeout(()=>send(k),k.indexOf('jkg_')==0?300:100);status()};
 const flush=()=>Object.keys(T).forEach(k=>{if(pend[k]){clearTimeout(T[k]);send(k)}});
 const expired=()=>{if(!sess)return;L.close(1);if(L.onExpire)L.onExpire()};
 const tick=()=>{if(!sess||busy||document.visibilityState=='hidden')return;busy=1;
  Object.keys(fail).forEach(k=>{if(!pend[k]){pend[k]=1;send(k)}});
  rpc('kv_open',{p_t:sess.t,p_since:since?iso(since):null}).then(r=>{busy=0;if(!sess)return;if(!r.ok){expired();return}
    const ch=apply(r.rows);if(ch.length&&L.onSync)L.onSync(ch)}).catch(()=>{busy=0})};
 const clear=()=>{Object.keys(M).forEach(k=>delete M[k]);Object.keys(pend).forEach(k=>delete pend[k]);Object.keys(fail).forEach(k=>delete fail[k]);
  Object.keys(T).forEach(k=>{clearTimeout(T[k]);delete T[k]});clearInterval(poll);poll=null;sess=null;trav=null;since=null;warned=0;busy=0;banner('');status()};
 const start=async(s,rows)=>{clear();sess=s;apply(rows);try{sessionStorage.setItem('jkgc',JSON.stringify(s))}catch(e){}
  poll=setInterval(tick,6000);status()};
 const L={
  on,onSync:null,onExpire:null,
  get user(){return sess&&sess.u},get role(){return sess&&sess.role},
  getItem:k=>loc(k)?NATIVE.getItem(k):(k in M?M[k]:null),
  setItem(k,v){if(loc(k))return NATIVE.setItem(k,v);M[k]=String(v);put(k)},
  removeItem(k){if(loc(k))return NATIVE.removeItem(k);delete M[k];put(k)},
  keys(){if(on||trav)return Object.keys(M);const o=[];for(let i=0;i<NATIVE.length;i++)o.push(NATIVE.key(i));return o},
  key:i=>(on||trav)?(Object.keys(M)[i]||null):NATIVE.key(i),
  get length(){return (on||trav)?Object.keys(M).length:NATIVE.length},
  /* returns {ok,role,user} or {ok:false,err:'bad'|'locked'|'setup'|'net'} */
  async login(u,h,m){if(!on)return{ok:true,role:'local'};
   try{await Q;const r=await rpc('jkg_login',{p_u:u,p_h:h,p_m:m});if(!r.ok)return r;
    const o=await rpc('kv_open',{p_t:r.token,p_since:null});if(!o.ok)return{ok:false,err:'net'};
    await start({t:r.token,u:r.user,role:r.role},o.rows);return{ok:true,role:r.role,user:r.user}}
   catch(e){return{ok:false,err:(e.status==404||e.status==400)?'setup':'net'}}},
  async resume(){if(!on)return{ok:true};await Q;let s=null;try{s=JSON.parse(sessionStorage.getItem('jkgc')||'null')}catch(e){}
   if(!s||!s.t)return{ok:false};
   try{const o=await rpc('kv_open',{p_t:s.t,p_since:null});if(!o.ok){try{sessionStorage.removeItem('jkgc')}catch(e){}return{ok:false}}
    await start(s,o.rows);return{ok:true,role:s.role,user:s.u}}catch(e){return{ok:false,err:'net'}}},
  async pwcheck(h){try{return !!(await rpc('kv_pwcheck',{p_t:sess.t,p_h:h}))}catch(e){return false}},
  sync(){tick()},
  get trav(){return !!trav},
  travStart(rows){clear();trav={T:0};Object.keys(rows||{}).forEach(k=>{M[k]=rows[k]})},
  travData(){return Object.assign({},M)},
  travDone(ok,msg){const e=el('sv');if(e){e.className=ok?'':'err';e.innerHTML='<i></i>'+(ok?'Saved on this laptop':(msg||'Not saved'))}},
  close(quiet){flush();const t=sess&&sess.t;try{sessionStorage.removeItem('jkgc')}catch(e){}
   const q=Q;Q=q.then(()=>t&&!quiet?rpc('kv_logout',{p_t:t}).catch(()=>{}):0).then(clear,clear)}
 };
 addEventListener('pagehide',flush);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='hidden')flush();else tick()});
 return L})();
</script>
