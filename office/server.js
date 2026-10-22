// JK & Co office server. Run: node server.js  (needs Node.js 18 or newer). No other install needed.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const D=__dirname,CF=path.join(D,'config.json');
const cfg=Object.assign({port:3000,adminPassword:'',masterPassword:'',dataDir:'',backupDir:'',keepBackups:120,ai:{baseUrl:'',apiKey:'',model:''}},fs.existsSync(CF)?JSON.parse(fs.readFileSync(CF,'utf8')):{});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const ADMIN='jkgupta&co',AH=cfg.adminPassword?sha('jkg2|'+ADMIN+'|'+cfg.adminPassword):'',MH=cfg.masterPassword?sha('jkg2|master|'+cfg.masterPassword):'';
const KV=cfg.dataDir?path.join(cfg.dataDir,'kv'):path.join(D,'data','kv');
try{fs.mkdirSync(KV,{recursive:true});fs.accessSync(KV,fs.constants.W_OK)}catch(e){console.log('\nCANNOT USE THE DATA FOLDER: '+KV+'\n'+e.message+'\nCheck that the network drive is connected (open it in File Explorer) and that dataDir in config.json is right.\n');process.exit(1)}
const M=new Map(),S=new Map(),F=new Map();let dirty=false;
fs.readdirSync(KV).forEach(f=>{try{const o=JSON.parse(fs.readFileSync(path.join(KV,f),'utf8'));M.set(o.k,{v:o.v,t:o.t})}catch(e){}});
const fn=k=>path.join(KV,sha(k).slice(0,32)+'.json');
const put=(k,v)=>{const t=new Date().toISOString(),f=fn(k);fs.writeFileSync(f+'.tmp',JSON.stringify({k,v,t}));fs.renameSync(f+'.tmp',f);M.set(k,{v,t});dirty=true};
const del=k=>{try{fs.unlinkSync(fn(k))}catch(e){if(e.code!='ENOENT')throw e}M.delete(k);dirty=true};
const users=()=>{try{return JSON.parse((M.get('jkgusers')||{}).v||'{}')}catch(e){return{}}};
const admHash=()=>(M.get('jkgadm')||{}).v||AH;
const sess=t=>{const s=S.get(t);if(!s||s.exp<Date.now()){S.delete(t);return null}s.exp=Date.now()+12*36e5;return s};
const can=(s,k)=>s.role=='admin'||(k!='jkgadm'&&!(k.startsWith('jkg_')&&k!='jkg_'+s.u)&&!(k.startsWith('att_')&&k!='att_'+s.u));
const rpc={
 jkg_login({p_u,p_h,p_m}){const u=String(p_u||'').toLowerCase(),f=F.get(u)||{n:0,until:0};if(f.until>Date.now())return{ok:false,err:'locked'};
  let user=null,role;
  if(u==ADMIN){const h=admHash();if(!h&&!MH)return{ok:false,err:'setup'};if((h&&p_h===h)||(MH&&p_m===MH)){user=ADMIN;role='admin'}}
  else{const us=users(),k=Object.keys(us).find(x=>x.toLowerCase()==u);if(k&&((us[k]&&us[k]===p_h)||(MH&&p_m===MH))){user=k;role='staff'}}
  if(!user){if(++f.n>=5){f.until=Date.now()+6e5;f.n=0}F.set(u,f);return{ok:false,err:'bad'}}
  F.delete(u);const token=crypto.randomBytes(24).toString('hex');S.set(token,{u:user,role,exp:Date.now()+12*36e5});return{ok:true,token,user,role}},
 kv_open({p_t,p_since}){const s=sess(p_t);if(!s)return{ok:false,err:'session'};const rows=[];
  M.forEach((o,k)=>{if(!can(s,k)||(p_since&&o.t<=p_since))return;let v=o.v;
   if(k=='jkgusers'&&s.role!='admin'){try{const m=JSON.parse(v);Object.keys(m).forEach(x=>{if(x!=s.u)m[x]=''});v=JSON.stringify(m)}catch(e){}}
   rows.push({k,v,t:o.t})});return{ok:true,rows}},
 kv_put({p_t,p_k,p_v}){const s=sess(p_t);if(!s)return{ok:false,err:'session'};const k=String(p_k);if(!can(s,k))return{ok:false,err:'denied'};let v=String(p_v);
  if(k=='jkgusers'&&s.role!='admin'){const cur=users();try{const inc=JSON.parse(v);if(inc[s.u]&&cur[s.u]!==undefined)cur[s.u]=inc[s.u]}catch(e){return{ok:false,err:'bad'}}v=JSON.stringify(cur)}
  put(k,v);return{ok:true}},
 kv_del({p_t,p_k}){const s=sess(p_t);if(!s)return{ok:false,err:'session'};const k=String(p_k);if(!can(s,k)||(k=='jkgusers'&&s.role!='admin'))return{ok:false,err:'denied'};del(k);return{ok:true}},
 kv_pwcheck({p_t,p_h}){const s=sess(p_t);if(!s)return false;return p_h===(s.role=='admin'?admHash():users()[s.u])},
 kv_logout({p_t}){S.delete(p_t);return{ok:true}}
};
const SYS="You are a helpful assistant for staff of JK Gupta & Co, a chartered accountant office in India. Help with drafting messages and emails to clients, quick conversions and calculations, GST, income tax, Tally, Excel and computer problems. Be short and practical. When you are not sure about a rate, date or rule, say so and tell them to verify it.";
async function ai(b){const a=cfg.ai||{};if(!a.baseUrl||!a.model)return{error:'The AI is not set up yet. Ask the admin to fill the ai section in config.json.'};
 const msgs=(Array.isArray(b.messages)?b.messages:[]).slice(-20).map(m=>({role:m.role=='assistant'?'assistant':'user',content:String(m.content||'').slice(0,6000)}));
 const r=await fetch(a.baseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},a.apiKey?{Authorization:'Bearer '+a.apiKey}:{}),body:JSON.stringify({model:a.model,messages:[{role:'system',content:SYS}].concat(msgs)}),signal:AbortSignal.timeout(90000)});
 if(!r.ok)return{error:'The AI service returned an error ('+r.status+').'};const j=await r.json();return{reply:(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||''}}
function backup(){if(!dirty)return;dirty=false;const n=new Date().toISOString().replace(/[:T]/g,'-').slice(0,16);
 [path.join(D,'backups'),cfg.backupDir].filter(Boolean).forEach(root=>{try{fs.mkdirSync(root,{recursive:true});fs.cpSync(KV,path.join(root,n),{recursive:true});
  const all=fs.readdirSync(root).filter(x=>/^\d{4}-/.test(x)).sort();while(all.length>cfg.keepBackups)fs.rmSync(path.join(root,all.shift()),{recursive:true,force:true})}catch(e){console.log('Backup failed for',root,e.message)}})}
const UPD=cfg.updateUrl||'https://raw.githubusercontent.com/atharv-jkgupta/Jkgupta-Co/main/office/dist/';
async function update(){if(cfg.autoUpdate===false)return;
 for(const n of ['index.html','hybrid.html']){try{const r=await fetch(UPD+n+'?t='+Date.now(),{signal:AbortSignal.timeout(30000)});if(!r.ok)continue;const x=await r.text();
  if(x.length<200000||!/const CLOUD=/.test(x)||!/<\/html>\s*$/.test(x))continue;const f=path.join(D,n);let cur='';try{cur=fs.readFileSync(f,'utf8')}catch(e){}
  if(cur!==x){fs.writeFileSync(f+'.tmp',x);fs.renameSync(f+'.tmp',f);console.log(new Date().toLocaleString()+'  Updated '+n+' to the newest version')}}catch(e){}}}
setTimeout(update,3000);setInterval(update,36e5);
setInterval(backup,36e5);['SIGINT','SIGTERM'].forEach(g=>process.on(g,()=>{backup();process.exit()}));
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, x-token','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Private-Network':'true'};
const send=(res,c,o,t)=>{res.writeHead(c,Object.assign({'Content-Type':t||'application/json','Cache-Control':'no-store'},CORS));res.end(typeof o=='string'?o:JSON.stringify(o))};
http.createServer((q,res)=>{
 if(q.method=='OPTIONS')return send(res,204,'','text/plain');
 if(q.method=='GET'||q.method=='HEAD'){const u=q.url.split('?')[0];if(u=='/ping')return send(res,200,{ok:true,app:'jkg'});const f=path.join(D,u=='/hybrid.html'||u=='/hybrid'?'hybrid.html':'index.html');return fs.existsSync(f)?send(res,200,fs.readFileSync(f,'utf8'),'text/html; charset=utf-8'):send(res,404,'index.html missing','text/plain')}
 if(q.method!='POST')return send(res,405,{});
 let n=0;const ch=[];q.on('data',c=>{n+=c.length;if(n>64e6){q.destroy()}else ch.push(c)});
 q.on('end',async()=>{try{const b=JSON.parse(Buffer.concat(ch).toString()||'{}');
  const m=/^\/rest\/v1\/rpc\/(\w+)$/.exec(q.url);if(m&&rpc[m[1]])return send(res,200,rpc[m[1]](b));
  if(q.url=='/api/ai'){const s=sess(q.headers['x-token']);if(!s)return send(res,401,{error:'Please log in again.'});return send(res,200,await ai(b))}
  send(res,404,{})}catch(e){send(res,500,{error:String(e.message||e)})}})
}).on('error',e=>{console.log('\nCannot start: '+(e.code=='EADDRINUSE'?'the server is already running in another window (or port '+cfg.port+' is used by another program).':e.message)+'\n');process.exit(1)}).listen(cfg.port,'0.0.0.0',()=>{console.log('JK & Co office server is running. Open one of these on any office PC:');
 Object.values(os.networkInterfaces()).flat().filter(i=>i.family=='IPv4'&&!i.internal).forEach(i=>console.log('   http://'+i.address+':'+cfg.port));
 if(!AH&&!MH&&!admHash())console.log('NOTE: set adminPassword in config.json and restart, or nobody can log in as admin.')});
