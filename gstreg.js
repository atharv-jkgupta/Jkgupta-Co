/* ====================================================================
   GST LOGINS REGISTER  (one record per client, key gsr_<id>; settings in gsrmeta)
   row  {id,o,name,biz,handle,lid,pw,ct,rt,cr,g1,x:{<extra column>:value},u,at}
   Everyone can add rows, import and edit the ordinary fields.
   Only the admin can change or clear a saved password, delete a row, or delete all.
   The same rules are enforced by the server (supabase/schema.sql and office/server.js).
   ==================================================================== */
const GRGP='gsr_',GRGM='gsrmeta';
const GRGS={rt:'all',ct:'all',g1:'all',q:''};let GRGL=[];
const gsDmy=d=>jkP2(d.getDate())+'-'+jkP2(d.getMonth()+1)+'-'+d.getFullYear();
function gsMeta(){try{const m=JSON.parse(LS.getItem(GRGM)||'null');if(m&&typeof m=='object')return{cols:Array.isArray(m.cols)?m.cols.filter(x=>typeof x=='string'&&x):[],crd:typeof m.crd=='string'?m.crd:''}}catch(e){}return{cols:[],crd:''}}
const gsMetaSave=m=>LS.setItem(GRGM,JSON.stringify(m));
const gsCrd=()=>gsMeta().crd||gsDmy(new Date());
function gsGet(id){try{const t=JSON.parse(LS.getItem(GRGP+id)||'null');return t&&t.id?t:null}catch(e){return null}}
function gsLoad(){const out=[];LS.keys().forEach(k=>{if(k.indexOf(GRGP))return;let t;try{t=JSON.parse(LS.getItem(k))}catch(e){return}if(t&&t.id&&typeof t=='object'&&!t.del)out.push(t)});
 return out.sort((a,b)=>(a.o||0)-(b.o||0))}
const gsNewId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const gsTen=v=>{v=String(v==null?'':v).trim();return /^q/i.test(v)?'Quarterly':/^m/i.test(v)?'Monthly':''};
function gsSave(t){t.u=USER;t.at=Date.now();LS.setItem(GRGP+t.id,JSON.stringify(t))}
/* ordinary edit of one field. Always works on the newest saved copy so a password changed on another PC is never overwritten. */
let _gsT={};
function gsF(id,f,val,x){if(!USER)return;if(f=='pw'&&!ADM())return;
 clearTimeout(_gsT[id+'|'+f+x]);_gsT[id+'|'+f+x]=setTimeout(()=>{const t=gsGet(id);if(!t)return;if(x!=null){t.x=t.x||{};t.x[x]=val}else t[f]=f=='rt'?gsTen(val):val;gsSave(t);
  if(f=='rt'||f=='ct'||f=='g1')gsMeters()},f=='rt'?0:350)}
function gsCrdSet(v){v=String(v||'').trim();const m=gsMeta();m.crd=v;gsMetaSave(m)}
function gsFilter(){const q=GRGS.q.trim().toLowerCase(),M=gsMeta();
 return GRGL.map((t,i)=>[t,i+1]).filter(([t])=>{
  if(GRGS.rt!='all'&&gsTen(t.rt)!=GRGS.rt)return false;
  const hc=!!String(t.ct||'').trim();if(GRGS.ct=='with'&&!hc)return false;if(GRGS.ct=='without'&&hc)return false;
  const hg=!!String(t.g1||'').trim();if(GRGS.g1=='done'&&!hg)return false;if(GRGS.g1=='pending'&&hg)return false;
  if(q){const s=[t.name,t.biz,t.handle,t.lid,t.ct,t.rt,t.cr,t.g1].concat(M.cols.map(c=>(t.x||{})[c])).join(' ').toLowerCase();if(!s.includes(q))return false}
  return true})}
function gsMeters(){const e=$id('gsm');if(!e)return;const L=gsFilter(),n=GRGL.length,m=GRGL.filter(t=>gsTen(t.rt)=='Monthly').length,q=GRGL.filter(t=>gsTen(t.rt)=='Quarterly').length;
 e.textContent='Showing '+L.length+' of '+n+' · Monthly '+m+' · Quarterly '+q+(n-m-q?' · Not set '+(n-m-q):'')}
function gsRows(){const box=$id('gsl');if(!box)return;const L=gsFilter(),M=gsMeta(),adm=ADM();
 const th=['Sr.','Name','Business name','Handle','Login ID','Password','Contact','Return tenure'].map(x=>'<th>'+x+'</th>').join('')
  +'<th>Call remark <input class="gsd" value="'+E(gsCrd())+'" maxlength="12" title="Date of this call round" aria-label="Call remark date" onchange="gsCrdSet(this.value);gsRows()"></th><th>GSTR-1</th>'
  +M.cols.map(c=>'<th>'+E(c)+'</th>').join('')+(adm?'<th></th>':'');
 const inp=(t,f,ph)=>'<td><input value="'+E(t[f]||'')+'" placeholder="'+ph+'" maxlength="200" oninput="gsF(\''+t.id+'\',\''+f+'\',this.value)"></td>';
 const body=L.map(([t,sr])=>{const tn=gsTen(t.rt);
  return '<tr data-id="'+t.id+'"><td class="gsn">'+sr+'</td>'+inp(t,'name','Client name')+inp(t,'biz','Business name')+inp(t,'handle','Handled by')+inp(t,'lid','Login ID')
  +'<td class="gsp"><span id="gp_'+t.id+'" class="gsv">••••••</span><button class="g sm" onclick="gsShow(\''+t.id+'\')">Show</button><button class="g sm" onclick="gsCopy(\''+t.id+'\')">Copy</button>'+(adm?'<button class="g sm" onclick="gsPwEdit(\''+t.id+'\')">Change</button>':'')+'</td>'
  +inp(t,'ct','Mobile / phone')
  +'<td><select onchange="gsF(\''+t.id+'\',\'rt\',this.value)" aria-label="Return tenure"><option value=""'+(tn?'':' selected')+'>Not set</option><option'+(tn=='Monthly'?' selected':'')+'>Monthly</option><option'+(tn=='Quarterly'?' selected':'')+'>Quarterly</option></select></td>'
  +inp(t,'cr','Remark')+inp(t,'g1','Status')
  +M.cols.map(c=>'<td><input value="'+E((t.x||{})[c]||'')+'" maxlength="200" oninput="gsF(\''+t.id+'\',\'x\',this.value,'+E(JSON.stringify(c))+')"></td>').join('')
  +(adm?'<td><button class="g sm" style="color:var(--bad)" onclick="gsDel(\''+t.id+'\')">Delete</button></td>':'')+'</tr>'}).join('');
 box.innerHTML=L.length?'<div class="gsw"><table class="gst"><thead><tr>'+th+'</tr></thead><tbody>'+body+'</tbody></table></div>'
  :'<div class="card" style="text-align:center;padding:36px"><b>'+(GRGL.length?'Nothing matches these filters':'No GST logins yet')+'</b><br><small>'+(GRGL.length?'Clear a filter or the search box.':'Press Add entry, or Import from Excel.')+'</small></div>';
 gsMeters()}
function gsEnsureCss(){if($id('gscss'))return;const s=document.createElement('style');s.id='gscss';
 s.textContent='.gsw{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:var(--s1);box-shadow:var(--shadow)}.gst{border-collapse:collapse;width:100%;min-width:1280px}'
 +'.gst th{position:sticky;top:0;background:var(--s3);color:var(--mute);font:700 11px var(--sans);text-transform:uppercase;letter-spacing:.08em;text-align:left;padding:10px 8px;white-space:nowrap;border-bottom:1px solid var(--line)}'
 +'.gst td{padding:4px 6px;border-bottom:1px solid var(--line);vertical-align:middle}.gst tr:hover td{background:var(--s3)}'
 +'.gst input,.gst select{width:100%;min-width:118px;margin:0;padding:7px 8px;font-size:14px;background:transparent;border:1px solid transparent;border-radius:8px;color:var(--ink)}'
 +'.gst input:hover,.gst select:hover{border-color:var(--line2)}.gst input:focus,.gst select:focus{background:var(--s1);border-color:var(--gold);outline:0}'
 +'.gst th .gsd{width:104px;min-width:0;margin-left:4px;padding:3px 6px;font-size:12px;background:var(--s1);border:1px solid var(--line2);text-transform:none;letter-spacing:0}'
 +'.gst td.gsn{text-align:center;color:var(--mute);width:44px}.gsp{white-space:nowrap}.gsp .sm{padding:5px 9px;margin:2px;font-size:12px}.gsv{font-family:ui-monospace,Consolas,monospace;display:inline-block;min-width:78px}'
 +'.gsb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:12px 0}.gsb .sp{flex:1}.gsf{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0}.gsf small{color:var(--mute)}'
 +'.gsa{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.gsa label{display:block;font-size:13px}.gsa input,.gsa select{width:100%;margin-top:4px}';
 document.head.appendChild(s)}
function gsr(){if(!USER)return home();gsEnsureCss();CURP='gsr';sb();tg(0);pgIn('gsr');GRGL=gsLoad();const adm=ADM(),seg=(k,items)=>'<div class="seg">'+items.map(([v,t])=>'<button class="'+(GRGS[k]==v?'on':'')+'" onclick="GRGS.'+k+'=\''+v+'\';gsr()">'+t+'</button>').join('')+'</div>';
 app.innerHTML='<i data-pg="gsr" hidden></i><div class="ch"><h2 style="margin:0">GST logins &amp; returns</h2></div><small>Portal logins, return tenure and filing status for every GST client. Anyone can add an entry or import a sheet and fill in the ordinary columns. Only the admin can change a saved password or delete entries.</small>'
  +'<div class="gsb"><button onclick="gsAdd()">Add entry</button><button class="g" onclick="$id(\'gsfile\').click()">Import Excel / CSV</button><button class="g" onclick="gsXls()">Download Excel</button><span class="sp"></span>'
  +(adm?'<button class="g" style="color:var(--bad)" onclick="gsDelAll()">Delete all</button>':'')+'<input id="gsfile" type="file" accept=".xlsx,.xls,.csv,text/csv" hidden onchange="gsImportFile(this)"></div>'
  +'<div class="gsf"><small>Return tenure</small>'+seg('rt',[['all','All'],['Monthly','Monthly'],['Quarterly','Quarterly']])
  +'<small>Contact</small>'+seg('ct',[['all','All'],['with','Has contact'],['without','No contact']])
  +'<small>GSTR-1</small>'+seg('g1',[['all','All'],['done','Filled'],['pending','Empty']])+'</div>'
  +'<input class="sq" id="gsq" placeholder="Search name, business, handle, login ID, contact..." value="'+E(GRGS.q)+'" oninput="GRGS.q=this.value;clearTimeout(window._gq);window._gq=setTimeout(gsRows,120)">'
  +'<small id="gsm" style="display:block;margin-bottom:8px"></small><div id="gsl"></div>';gsRows()}
function gsRefresh(){GRGL=gsLoad();gsRows()}
/* ---- password cell ---- */
function gsShow(id){const t=GRGL.find(x=>x.id==id),e=$id('gp_'+id);if(!t||!e)return;const b=e.nextElementSibling;
 if(b.textContent=='Hide'){e.textContent='••••••';b.textContent='Show';return}e.textContent=t.pw?t.pw:'(empty)';b.textContent='Hide'}
function gsCopy(id){const t=gsGet(id);if(!t||!t.pw){toast('No password saved for this entry.');return}gCopy(t.pw)}
function gsPwEdit(id){if(!ADM())return;const t=gsGet(id);if(!t)return;const p=prompt('New password for '+(t.name||t.biz||t.lid||'this entry')+' (leave empty to clear):',t.pw||'');if(p===null)return;t.pw=p;gsSave(t);gsRefresh();toast('Password changed.')}
/* ---- add ---- */
function gsAdd(){gsEnsureCss();
 modal('<h3>Add GST entry</h3><div class="gsa"><label>Name<input id="ga_name" autocomplete="off"></label><label>Business name<input id="ga_biz" autocomplete="off"></label><label>Handle<input id="ga_handle" autocomplete="off" placeholder="Handled by"></label><label>Login ID<input id="ga_lid" autocomplete="off"></label>'
  +'<label>Password<input id="ga_pw" autocomplete="off"></label><label>Contact<input id="ga_ct" autocomplete="off" placeholder="Mobile / phone"></label><label>Return tenure<select id="ga_rt"><option value="">Not set</option><option>Monthly</option><option>Quarterly</option></select></label>'
  +'<label>Call remark<input id="ga_cr" autocomplete="off"></label><label>GSTR-1<input id="ga_g1" autocomplete="off" placeholder="Status"></label></div>'
  +'<small>'+(ADM()?'':'You can set the password now. After saving, only the admin can change it. ')+'</small><br><button onclick="gsAddDo()">Save entry</button>')}
function gsAddDo(){if(!USER)return;const g=i=>($id('ga_'+i)||{value:''}).value.trim(),t={id:gsNewId(),o:Date.now()*1000,name:g('name'),biz:g('biz'),handle:g('handle'),lid:g('lid'),pw:$id('ga_pw').value,ct:g('ct'),rt:gsTen(g('rt')),cr:g('cr'),g1:g('g1'),x:{}};
 if(!t.name&&!t.biz&&!t.lid){toast('Enter at least a name, business name or login ID.');return}
 if(t.lid&&gsLoad().some(x=>String(x.lid||'').trim().toLowerCase()==t.lid.toLowerCase())){toast('An entry with this Login ID already exists.');return}
 gsSave(t);modal();gsr();toast('Entry added.')}
/* ---- delete (admin only) ---- */
function gsDel(id){if(!ADM())return;const t=gsGet(id);if(!t)return;LS.removeItem(GRGP+id);gsRefresh();
 toast('Entry deleted.','Undo',()=>{if(!ADM())return;LS.setItem(GRGP+t.id,JSON.stringify(t));gsRefresh()},12000)}
function gsDelAll(){if(!ADM())return;const n=gsLoad().length;if(!n){toast('There is nothing to delete.');return}
 modal('<h3>Delete all '+n+' GST entries?</h3><p>This removes every row, including saved passwords, for everyone. Download an Excel copy first if you may need it again. Type <b>DELETE ALL</b> to confirm.</p>'
  +'<button class="g" onclick="gsXlsAll()">Download Excel copy</button><br><input id="gdc" autocomplete="off" placeholder="DELETE ALL" oninput="$id(\'gdb\').disabled=this.value.trim()!==\'DELETE ALL\'"><button id="gdb" class="danger" disabled onclick="gsDelAllDo()">Delete all entries</button>')}
function gsDelAllDo(){if(!ADM())return;if(($id('gdc')||{value:''}).value.trim()!=='DELETE ALL')return;const all=gsLoad();all.forEach(t=>LS.removeItem(GRGP+t.id));modal();gsRefresh();
 toast(all.length+' entries deleted.','Undo',()=>{if(!ADM())return;all.forEach(t=>LS.setItem(GRGP+t.id,JSON.stringify(t)));gsRefresh()},15000)}
/* ---- import ---- */
const gsK=h=>String(h==null?'':h).toLowerCase().replace(/[^a-z0-9]/g,'');
function gsCol(h){const k=gsK(h);if(!k)return null;
 if(/^(sr|srno|sno|slno|serial|serialno|no)$/.test(k))return'sr';
 if(/^(name|clientname|partyname|proprietor|ownername)$/.test(k))return'name';
 if(/^(businessname|business|tradename|firmname|legalname|companyname)$/.test(k))return'biz';
 if(/^(handle|handledby|handler|handlingperson)$/.test(k))return'handle';
 if(/^(loginid|login|userid|username|gstuserid|gstusername|loginname)$/.test(k))return'lid';
 if(/^(password|pass|pwd|gstpassword)$/.test(k))return'pw';
 if(/^(contact|contactno|contactnumber|mobile|mobileno|mobilenumber|phone|phoneno)$/.test(k))return'ct';
 if(/^returnten/.test(k)||/^(tenure|tenor|returnperiod|returnfrequency|frequency|monthlyquarterly|quarterlymonthly)$/.test(k))return'rt';
 if(/^callremark/.test(k))return'cr';
 if(/^gstr1(status)?$/.test(k))return'g1';
 return'x'}
function gsParseCsv(s){const rows=[];let r=[],c='',q=false;s=String(s).replace(/^\uFEFF/,'');
 for(let i=0;i<s.length;i++){const ch=s[i];
  if(q){if(ch=='"'){if(s[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch=='"')q=true;else if(ch==','){r.push(c);c=''}else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&s[i+1]=='\n')i++;r.push(c);c='';rows.push(r);r=[]}else c+=ch}
 if(c!==''||r.length){r.push(c);rows.push(r)}return rows}
/* aoa = array of rows. Returns {add,upd,skip,cols} or {err}. */
function gsImportRows(aoa){if(!USER)return{err:'Sign in first.'};
 let hi=-1,map=null;
 for(let i=0;i<Math.min(aoa.length,15);i++){const m=(aoa[i]||[]).map(gsCol),known=m.filter(x=>x&&x!='x'&&x!='sr');if(known.length>=3&&(known.includes('name')||known.includes('lid')||known.includes('biz'))){hi=i;map=m;break}}
 if(hi<0)return{err:'Could not find the header row. It needs columns such as Name, Business name, Login ID, Password, Contact.'};
 const hdr=aoa[hi],meta=gsMeta(),adm=ADM();let newCols=0;
 hdr.forEach((h,ci)=>{if(map[ci]=='cr'){const d=/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/.exec(String(h));if(d){const y=d[3].length==2?'20'+d[3]:d[3];meta.crd=jkP2(+d[1])+'-'+jkP2(+d[2])+'-'+y}}
  if(map[ci]=='x'){const nm=String(h).trim().slice(0,60);if(nm&&!meta.cols.includes(nm)){meta.cols.push(nm);newCols++}}});
 const all=gsLoad(),byL=new Map(),byN=new Map();
 all.forEach(t=>{const l=String(t.lid||'').trim().toLowerCase();if(l)byL.set(l,t);else byN.set((String(t.name||'')+'|'+String(t.biz||'')).trim().toLowerCase(),t)});
 let add=0,upd=0,skip=0,base=Date.now()*1000;const seen=new Set();
 for(let i=hi+1;i<aoa.length;i++){const row=aoa[i]||[],v={x:{}};
  hdr.forEach((h,ci)=>{const f=map[ci],val=row[ci]==null?'':String(row[ci]).trim();if(!f||f=='sr')return;if(f=='x')v.x[String(h).trim().slice(0,60)]=val;else v[f]=val});
  if(!v.name&&!v.biz&&!v.lid){if(row.some(c=>String(c).trim()))skip++;continue}
  if('rt' in v)v.rt=gsTen(v.rt);
  const l=String(v.lid||'').trim().toLowerCase(),key=l||(String(v.name||'')+'|'+String(v.biz||'')).trim().toLowerCase();
  if(seen.has(key)){skip++;continue}seen.add(key);
  const ex=l?byL.get(l):byN.get(key);
  if(!ex){const t={id:gsNewId(),o:base+i,name:v.name||'',biz:v.biz||'',handle:v.handle||'',lid:v.lid||'',pw:v.pw||'',ct:v.ct||'',rt:v.rt||'',cr:v.cr||'',g1:v.g1||'',x:v.x};gsSave(t);add++;continue}
  /* existing entry: the admin may overwrite; everyone else only fills blanks and never touches the password */
  let ch=false;['name','biz','handle','lid','ct','rt','cr','g1'].forEach(f=>{if(v[f]==null||v[f]==='')return;if(adm||!String(ex[f]||'').trim()){if(ex[f]!==v[f]){ex[f]=v[f];ch=true}}});
  Object.keys(v.x).forEach(c=>{if(v.x[c]==='')return;ex.x=ex.x||{};if(adm||!String(ex.x[c]||'').trim()){if(ex.x[c]!==v.x[c]){ex.x[c]=v.x[c];ch=true}}});
  if(adm&&v.pw!=null&&v.pw!==''&&ex.pw!==v.pw){ex.pw=v.pw;ch=true}
  if(ch){gsSave(ex);upd++}else skip++}
 gsMetaSave(meta);return{add,upd,skip,cols:newCols}}
async function gsImportFile(inp){const f=inp.files&&inp.files[0];inp.value='';if(!f||!USER)return;
 try{let aoa;if(/\.csv$/i.test(f.name)||f.type=='text/csv'){aoa=gsParseCsv(await f.text())}
  else{if(typeof XLSX=='undefined'){toast('The Excel reader did not load. Check the internet, or save the sheet as CSV and import that.');return}
   const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:''})}
  const r=gsImportRows(aoa);if(r.err){toast(r.err);return}gsr();
  toast('Imported: '+r.add+' added, '+r.upd+' updated, '+r.skip+' skipped'+(r.cols?' · '+r.cols+' new column'+(r.cols>1?'s':''):'')+(ADM()?'':'. Saved passwords were not changed.'),null,null,9000)}
 catch(e){toast('Could not read that file. Use .xlsx, .xls or .csv.')}}
/* ---- export ---- */
function gsAoa(list){const M=gsMeta();return[['Sr.','Name','Business name','HANDLE','Login ID','Password','Contact','Return Tenure','Call Remark '+gsCrd(),'GSTR-1'].concat(M.cols)]
 .concat(list.map(([t,sr])=>[sr,t.name||'',t.biz||'',t.handle||'',t.lid||'',t.pw||'',t.ct||'',gsTen(t.rt),t.cr||'',t.g1||''].concat(M.cols.map(c=>(t.x||{})[c]||''))))}
function gsXlsDo(list,name){if(typeof XLSX=='undefined'){toast('The Excel writer did not load. Check the internet and try again.');return}
 const ws=XLSX.utils.aoa_to_sheet(gsAoa(list));ws['!cols']=[{wch:5},{wch:26},{wch:30},{wch:14},{wch:22},{wch:18},{wch:15},{wch:14},{wch:26},{wch:12}];
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'GST logins');XLSX.writeFile(wb,name)}
function gsXls(){if(!USER)return;const L=gsFilter();if(!L.length){toast('Nothing to download.');return}gsXlsDo(L,'GST-logins-'+ymd(new Date())+'.xlsx')}
function gsXlsAll(){if(!ADM())return;GRGL=gsLoad();gsXlsDo(GRGL.map((t,i)=>[t,i+1]),'GST-logins-backup-'+ymd(new Date())+'.xlsx')}

