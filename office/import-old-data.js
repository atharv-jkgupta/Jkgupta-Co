// One-time import of the old online data (Supabase) into the office server.
// Run with import-old-data.bat while the server window is CLOSED.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),readline=require('readline');
const URL0=process.env.JKG_OLD_URL||'https://mengenwaiutfamrqksxw.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbmdlbndhaXV0ZmFtcnFrc3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMzA3MTUsImV4cCI6MjEwNzkwNjcxNX0.0KZ0oloeEiFW7hO330o1zWhESEvBlH8BXOTzbKLPQYk';
const D=__dirname,CF=path.join(D,'config.json');
const cfg=fs.existsSync(CF)?JSON.parse(fs.readFileSync(CF,'utf8')):{};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const KV=cfg.dataDir?path.join(cfg.dataDir,'kv'):path.join(D,'data','kv');
const rpc=async(f,b)=>{const r=await fetch(URL0+'/rest/v1/rpc/'+f,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw new Error('The old online database answered with error '+r.status);return r.json()};
const ask=q=>new Promise(ok=>{const i=readline.createInterface({input:process.stdin,output:process.stdout});i.question(q,a=>{i.close();ok(a.trim())})});
(async()=>{
 console.log('\nThis copies ALL data from the old online database into the office server.\nData folder: '+KV+'\n');
 fs.mkdirSync(KV,{recursive:true});
 const have=fs.readdirSync(KV).filter(f=>f.endsWith('.json')).length;
 if(have&&process.argv[2]!='--again'){console.log('The office server already holds '+have+' items, so nothing was copied (to protect them).\nIf you really want to copy again (older items with the same name are replaced), run:  node import-old-data.js --again\n');return}
 const pw=await ask('Type the ADMIN password of the OLD online app, then press Enter: ');
 const r=await rpc('jkg_login',{p_u:'jkgupta&co',p_h:sha('jkg2|jkgupta&co|'+pw),p_m:sha('jkg2|master|'+pw)});
 if(!r||!r.ok){console.log('\nLogin to the old online database failed ('+((r&&r.err)||'unknown')+'). Check the password and try again.\n');return}
 const o=await rpc('kv_open',{p_t:r.token,p_since:null});
 if(!o||!o.ok){console.log('\nCould not read the old data.\n');return}
 let n=0;
 for(const x of o.rows){const f=path.join(KV,sha(x.k).slice(0,32)+'.json');fs.writeFileSync(f+'.tmp',JSON.stringify({k:x.k,v:x.v,t:x.t}));fs.renameSync(f+'.tmp',f);n++}
 try{await rpc('kv_logout',{p_t:r.token})}catch(e){}
 console.log('\nDONE. Copied '+n+' items. Now start the server with start.bat and log in as usual.\n')
})().catch(e=>console.log('\nSomething went wrong: '+e.message+'\nCheck the PC is connected to the internet and try again.\n'));
