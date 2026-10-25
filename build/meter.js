
/* ===== Storage meter (admin only) ===== */
const mtBytes=b=>{b=+b||0;return b>=1073741824?(b/1073741824).toFixed(2)+' GB':b>=10485760?Math.round(b/1048576)+' MB':(b/1048576).toFixed(1)+' MB'};
const mtWhen=t=>{if(!t)return 'No backup yet';const d=new Date(t);if(isNaN(d))return 'No backup yet';
 try{return d.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}catch(e){return d.toISOString().slice(0,16).replace('T',' ')}};
window._mt={t:0,d:null,err:'',busy:0};
function mtBox(){const m=window._mt;
 if(m.err&&!m.d)return '<section class="sto sto-err" id="stometer" aria-live="polite"><div class="stoh"><h2>Storage</h2><button type="button" class="g" onclick="mtLoad(1)">Try again</button></div><p>Could not read the storage figures. '+E(m.err)+'</p></section>';
 if(!m.d)return '<section class="sto" id="stometer" aria-live="polite"><div class="stoh"><h2>Storage</h2></div><p>Reading storage figures...</p></section>';
 const d=m.d,used=+d.db_bytes||0,lim=+d.limit_bytes||0,pct=lim>0?used/lim*100:0,pr=pct>=10?Math.round(pct):Math.round(pct*10)/10,
  k=pct<60?'ok':pct<=85?'warn':'bad',
  msg=k=='ok'?'Plenty of space':k=='warn'?'Getting full. Please plan for more space.':'Almost full. Please act soon.';
 return '<section class="sto sto-'+k+'" id="stometer" aria-live="polite"><div class="stoh"><h2>Storage</h2><button type="button" class="g" onclick="mtLoad(1)">Refresh</button></div>'
  +'<div class="ston"><b>'+mtBytes(used)+'</b> used of <b>'+mtBytes(lim)+'</b> <span class="stop">'+pr+'%</span></div>'
  +'<div class="stobar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.min(100,Math.round(pct))+'" aria-label="Storage used"><i style="width:'+Math.min(100,Math.max(pct>0?1:0,pct))+'%"></i></div>'
  +'<div class="stos">'+msg+'</div>'
  +'<div class="stor"><div><span>Last backup</span><b>'+E(mtWhen(d.last_backup))+'</b></div><div><span>Backups take</span><b>'+mtBytes(d.backup_table_bytes)+'</b><em>'+(+d.backups_kept||0)+' kept</em></div></div></section>'}
function mtPaint(){const e=document.getElementById('stometer');if(!e)return;const t=document.createElement('div');t.innerHTML=mtBox();e.replaceWith(t.firstChild)}
async function mtLoad(force){const m=window._mt;if(!(typeof LS!='undefined'&&LS.on&&LS.role=='admin'&&LS.stats))return;
 if(m.busy)return;if(!force&&m.d&&Date.now()-m.t<60000)return;m.busy=1;
 try{const r=await LS.stats();if(r&&r.ok){m.d=r;m.t=Date.now();m.err=''}else{m.err=r&&r.err=='denied'?'Only the admin can see this.':'Please sign in again and try again.';if(r&&r.err=='denied')m.d=null}}
 catch(e){m.err='The network or database did not answer.'}
 m.busy=0;mtPaint()}
(()=>{const h0=home;
 home=function(){const r=h0.apply(this,arguments);
  try{if(typeof USER!='undefined'&&USER&&ADM()&&!VIEW&&CURP=='home'&&LS.on&&LS.role=='admin'&&!LS.trav){
    const a=document.getElementById('app');if(a&&!document.getElementById('stometer')){const t=document.createElement('div');t.innerHTML=mtBox();const ref=a.querySelector('.dgs')||a.querySelector('.dfirst');if(ref)ref.parentNode.insertBefore(t.firstChild,ref);else a.appendChild(t.firstChild);mtLoad()}}}catch(e){}
  return r}})();

