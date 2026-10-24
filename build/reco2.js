
/* ====================================================================
   RECO v2  -  tells you what is wrong and how to fix it, lets you pick the
   columns yourself, shows the client name
   ==================================================================== */
const RCFIELDS={
 gst:[['inv','Invoice number'],['date','Invoice date'],['gstin','GSTIN'],['party','Party name'],['taxable','Taxable value'],['igst','IGST'],['cgst','CGST'],['sgst','SGST / UTGST'],['val','Invoice / gross total'],['rate','Tax rate %']],
 bank:[['date','Date'],['desc','Narration / particulars'],['ref','Reference / cheque no.'],['debit','Debit'],['credit','Credit'],['amount','Single amount column']]};
const rcNote=(lvl,msg,fix)=>({lvl,msg,fix});
function rcAnyHead(rows){for(let i=0;i<Math.min(rows.length,40);i++){const r=(rows[i]||[]).filter(c=>String(c==null?'':c).trim()!=='');if(r.length>=4&&r.every(c=>isNaN(rcN(c))||/[A-Za-z]/.test(String(c))))return i}return -1}
function rcApplyOv(m,ov,n){Object.keys(ov||{}).forEach(f=>{const v=ov[f];if(v==null)return;if(v<0||v>=n)delete m[f];else m[f]=v});return m}

RCF.gst.hsn=/^hsn|\bhsn\b|\bsac\b/i;RCF.gst.qty=/^qty|quantity/i;RCF.gst.unit=/^unit|^uom/i;
const rcRate=x=>{let s=String(x==null?'':x).trim(),p=/%/.test(s),v=rcN(s.replace('%',''));if(!p&&v>0&&v<=0.5)v*=100;return rcR(v)};
const rcRateOf=(rate,amt,t)=>t>0&&amt>0?rcR(amt/t*100):rcRate(rate);

/* GST portal files (2A, 2B, GSTR-1) have the headings in TWO rows: a group row (Invoice Details, Tax Amount)
   and a detail row (Invoice number, Integrated Tax ...). Join them into one heading row. */
function rcJoin2(rows,hi){if(hi<0||hi>=rows.length)return rows;const F=RCF.gst,hits=r=>Object.keys(F).filter(k=>(r||[]).some(c=>c!==''&&F[k].test(String(c)))).length,txt=r=>(r||[]).filter(c=>String(c).trim()!=='').length;
 const num=r=>(r||[]).some(c=>typeof c=='number'||/^-?\d[\d,]*\.?\d*$/.test(String(c).trim())&&String(c).trim().length>1);
 let a=-1,b=hi;const up=rows[hi-1],dn=rows[hi+1];
 if(hi>0&&up&&txt(up)>=2&&!num(up)&&hits(up)>=1)a=hi-1;
 else if(dn&&txt(dn)>=3&&!num(dn)&&hits(dn)>=2&&!/\d{2}[A-Z]{5}\d{4}/.test(dn.join(' ').toUpperCase())){a=hi;b=hi+1}
 if(a<0)return rows;
 const A=rows[a].map(x=>String(x==null?'':x).trim()),B=rows[b].map(x=>String(x==null?'':x).trim()),n=Math.max(A.length,B.length),m=[];
 for(let j=0;j<n;j++){const x=A[j]||'',y=B[j]||'';m.push(x&&y&&x!==y?x+' '+y:(y||x))}
 const out=rows.slice();out[b]=m;if(a!==b)out[a]=[];return out}
function rcMapG(h0,ov){const h=h0.map(x=>String(x).replace(/\s+/g,' ').trim()),m=rcMap(h,'gst'),used=new Set(Object.values(m));
 ['igst','cgst','sgst'].forEach(f=>{if(m[f]!=null&&/\brate\b|%/i.test(h[m[f]])){m[f+'R']=m[f];delete m[f];used.delete(m[f+'R']);
   const j=h.findIndex((c,i)=>!used.has(i)&&c!==''&&RCF.gst[f].test(String(c))&&!/\brate\b|%/i.test(String(c)));if(j>=0){m[f]=j;used.add(j)}else used.add(m[f+'R'])}
  else if(m[f]!=null){const j=h.findIndex((c,i)=>!used.has(i)&&/\brate\b|%/i.test(String(c))&&RCF.gst[f].test(String(c)));if(j>=0){m[f+'R']=j;used.add(j)}}});
 ['hsn','qty','unit'].forEach(k=>{const j=h.findIndex((c,i)=>!used.has(i)&&c!==''&&RCF.gst[k].test(String(c).trim()));if(j>=0){m[k]=j;used.add(j)}});
 return rcApplyOv(m,ov,h.length)}
function rcGstRows(rows,src,sign,ov){const notes=[];let hi=rcHead(rows,'gst');rows=rcJoin2(rows,hi);
 if(hi<0){hi=rcAnyHead(rows);if(hi<0)return{err:'Could not find a row with column headings.',fix:'Open the file in Excel and make sure one row has headings such as GSTIN, Invoice No, Invoice Date, Taxable Value, CGST, SGST. Then save and upload again.',rows:[],notes}
  notes.push(rcNote('warn','I could not recognise the headings, so I guessed row '+(hi+1)+'.','Check the "Columns I used" box below and choose the right column for each item.'))}
 const h=(rows[hi]||[]).map(c=>String(c==null?'':c)),m=rcMapG(h,ov),out=[];
 if(m.inv==null)return{err:'No "Invoice number" column found in this file.',fix:'Open "Columns I used" below and pick the column that has the invoice / bill numbers.',rows:[],notes,h,m,hi}
 const noTax=m.igst==null&&m.cgst==null&&m.sgst==null&&m.rate==null&&m.igstR==null&&m.cgstR==null,deriveT=m.taxable==null&&m.val!=null,noT=m.taxable==null&&m.val==null;
 if(m.gstin==null)notes.push(rcNote('warn','No GSTIN column found. Invoices can only be matched by number, so results may be wrong.','In "Columns I used" choose the GSTIN column. In Tally, add the party GSTIN column in the register (F12 Configure) before exporting.'));
 if(m.date==null)notes.push(rcNote('info','No invoice date column found.','Matching still works. Choose a date column under "Columns I used" if there is one.'));
 if(noTax)notes.push(rcNote('bad','No tax columns found (IGST, CGST, SGST).','In "Columns I used" choose the tax columns. In Tally, show the tax ledger columns in the register before exporting.'));
 if(deriveT)notes.push(rcNote('info','No taxable value column, so I worked it out as invoice total minus tax.','If the numbers look wrong, choose the Taxable value column under "Columns I used".'));
 if(noT)notes.push(rcNote('warn','No taxable value or invoice total column found. Only the tax amount is compared.','Choose the Taxable value column under "Columns I used" for a stricter check.'));
 let skipNoInv=0,noG=0,lines=0,merged=0,buf=[];const wsum=[],foot=[];
 const cell=(r,k)=>m[k]==null?'':r[m[k]];
 for(let i=hi+1;i<rows.length;i++){const r=rows[i]||[];if(!r.length)continue;const inv=String(r[m.inv]==null?'':r[m.inv]).trim();let g=m.gstin!=null?String(r[m.gstin]||'').toUpperCase().replace(/\s/g,''):'';
  if(!g){const f=r.map(String).join(' ').toUpperCase().match(GSTINRX);if(f)g=f[0]}
  let sg=sign;if(m.note!=null&&/credit/i.test(String(r[m.note])))sg=-1;
  const ns=m.igst==null&&m.cgst==null&&m.sgst==null&&m.rate!=null;let t=m.taxable!=null?rcN(r[m.taxable])*sg:0;let ig=rcN(r[m.igst])*sg,cg=rcN(r[m.cgst])*sg,sc=rcN(r[m.sgst])*sg;const ce=rcN(r[m.cess])*sg;
  const rI0=rcRate(cell(r,'igstR')),rC0=rcRate(cell(r,'cgstR')),rS0=rcRate(cell(r,'sgstR'));
  if(m.igst==null&&m.igstR!=null)ig=rcR(t*rI0/100);if(m.cgst==null&&m.cgstR!=null)cg=rcR(t*rC0/100);if(m.sgst==null&&m.sgstR!=null)sc=rcR(t*rS0/100);
  const rI=rcRateOf(rI0,ig*sg,t*sg),rC=rcRateOf(rC0,cg*sg,t*sg),rS=rcRateOf(rS0,sc*sg,t*sg);
  if(ns)ig=rcR(t*rcN(r[m.rate])/100);
  if(deriveT){const gv=rcN(r[m.val])*sg;t=rcR(gv-ig-cg-sc-ce)}
  const hs=m.hsn!=null?String(r[m.hsn]==null?'':r[m.hsn]).trim():'';
  if(!inv&&hs&&t&&!/total/i.test(String(cell(r,'party')))){lines++;buf.push({hsn:hs,qty:String(cell(r,'qty')==null?'':cell(r,'qty')).trim(),unit:String(cell(r,'unit')==null?'':cell(r,'unit')).trim(),taxable:t,igstR:rI,cgstR:rC,sgstR:rS,igst:ig,cgst:cg,sgst:sc});continue}
  if(!inv||/^total|^grand/i.test(inv)){if(inv===''&&(t||ig||cg||sc)&&!/total/i.test(r.map(String).join(' '))){if(!String(cell(r,'party')).trim()&&!String(cell(r,'date')).trim()&&t>0){foot.push(t);continue}skipNoInv++}continue}
  if(!t&&!ig&&!cg&&!sc&&!buf.length)continue;if(!g)noG++;lines++;
  let items=buf;buf=[];if(items.length){merged+=items.length;const sT=rcR(items.reduce((a,x)=>a+x.taxable,0)),sI=rcR(items.reduce((a,x)=>a+x.igst,0)),sC=rcR(items.reduce((a,x)=>a+x.cgst,0)),sS=rcR(items.reduce((a,x)=>a+x.sgst,0));
   if(!t&&sT){t=sT;wsum.push('Bill '+inv+': the total row has no taxable value, so the item lines were added up ('+rcMoney(sT)+').')}
   else if(Math.abs(sT-t)>1)wsum.push('Bill '+inv+': item lines add up to '+rcMoney(sT)+' but the total row shows '+rcMoney(t)+'. Total row used.');
   if(!ig&&!cg&&!sc&&(sI||sC||sS)){ig=sI;cg=sC;sc=sS}}
  else if(hs&&t)items=[{hsn:hs,qty:String(cell(r,'qty')==null?'':cell(r,'qty')).trim(),unit:String(cell(r,'unit')==null?'':cell(r,'unit')).trim(),taxable:t,igstR:rI,cgstR:rC,sgstR:rS,igst:ig,cgst:cg,sgst:sc}];
  out.push({src,ns,nt:noT,row:i+1,gstin:g,party:m.party!=null?String(r[m.party]||'').replace(/\s+/g,' ').trim():'',inv,date:rcDate(r[m.date]),taxable:t,igst:ig,cgst:cg,sgst:sc,cess:ce,items,itc:m.itc!=null?String(r[m.itc]||''):'',vc:m.note!=null?String(r[m.note]||''):''})}
 if(foot.length&&out.length){const sT=rcR(out.reduce((q,x)=>q+x.taxable,0)),fT=foot[foot.length-1];notes.push(Math.abs(sT-fT)<=1?rcNote('okk','The total line at the bottom of the sheet ('+rcMoney(fT)+') matches the invoices read.',''):rcNote('warn','The total line at the bottom of the sheet shows '+rcMoney(fT)+' but the invoices add up to '+rcMoney(sT)+'.','Some bills may be missing or counted twice. Check the file against Tally.'))}
 if(merged)notes.unshift(rcNote('okk','Detected item-wise format: '+out.length+' invoices from '+lines+' lines ('+merged+' HSN item lines merged).','Each bill is counted once, using the taxable value on its total row.'));
 else if(out.length)notes.unshift(rcNote('okk','Detected one-line-per-bill format: '+out.length+' invoices.',''));
 wsum.slice(0,5).forEach(x=>notes.push(rcNote('warn',x,'Check the bill in Tally. The total row is what is compared with the other file.')));if(wsum.length>5)notes.push(rcNote('warn','…and '+(wsum.length-5)+' more bills where item lines and the total row differ.','Check these bills in Tally.'));
 if(buf.length)notes.push(rcNote('warn',buf.length+' item line(s) at the end of the sheet have no bill total row after them and were left out.','Export the register again with the total row of the last bill included.'));
 if(skipNoInv)notes.push(rcNote('info',skipNoInv+' row(s) with an amount but no invoice number were left out.','This is normal for blank or summary rows. If they are real invoices, choose the right Invoice number column.'));
 if(noG&&m.gstin!=null&&out.length)notes.push(rcNote('info',noG+' invoice(s) have no GSTIN (unregistered customers).','These are matched on invoice number only.'));
 if(!out.length)notes.push(rcNote('bad','No invoices could be read from this sheet.','Check the "Columns I used" box. Invoice number and at least one amount column are needed.'));
 return{rows:out,notes,h,m,hi}}

function rcAgg(L){const M=new Map();L.forEach(x=>{const k=(x.gstin||'?')+'|'+rcInv(x.inv);let a=M.get(k);if(!a){a=Object.assign({},x,{n:1,keyInv:rcInv(x.inv),rows:[x.row],items:(x.items||[]).slice()});M.set(k,a)}else{if(x.ns)a.ns=true;['taxable','igst','cgst','sgst','cess'].forEach(f=>a[f]+=x[f]);a.n++;a.rows.push(x.row);if(!a.date)a.date=x.date;if(!a.party)a.party=x.party;a.items=a.items.concat(x.items||[])}});
 return[...M.values()].map(a=>{['taxable','igst','cgst','sgst','cess'].forEach(f=>a[f]=rcR(a[f]));a.tax=rcR(a.igst+a.cgst+a.sgst);return a})}
const rcPct=x=>(x==null?'':(Math.round(x*100)/100)+'%');
function rcBrkHtml(items){return '<div class="rcbk-w"><b>HSN breakup</b><table class="rcbk"><tr><th>HSN</th><th class="n">Qty</th><th>Unit</th><th class="n">Taxable</th><th class="n">IGST</th><th class="n">CGST</th><th class="n">SGST</th></tr>'+items.map(x=>'<tr><td>'+E(x.hsn)+'</td><td class="n">'+E(x.qty)+'</td><td>'+E(x.unit)+'</td><td class="n">₹'+rcMoney(x.taxable)+'</td>'+[['igst','igstR'],['cgst','cgstR'],['sgst','sgstR']].map(([a,b])=>'<td class="n">'+(x[b]||x[a]?rcPct(x[b])+' · ₹'+rcMoney(x[a]):'—')+'</td>').join('')+'</tr>').join('')+'</table></div>'}
function rcBrk(i){const e=document.getElementById('rcbr'+i);if(e)e.style.display=e.style.display=='none'?'table-row':'none'}

function rcBankRows(rows,src,ov){const notes=[];let hi=rcHead(rows,'book');
 if(hi<0){hi=rcAnyHead(rows);if(hi<0)return{err:'Could not find a row with column headings.',fix:'Open the file in Excel and make sure one row has headings such as Date, Narration, Debit (Withdrawal), Credit (Deposit). Then save and upload again.',rows:[],notes}
  notes.push(rcNote('warn','I could not recognise the headings, so I guessed row '+(hi+1)+'.','Check the "Columns I used" box below and choose the right column for each item.'))}
 const h=(rows[hi]||[]).map(c=>String(c==null?'':c)),m=rcApplyOv(rcMap(h,'book',src),ov,h.length);
 if(m.date==null)return{err:'No Date column found.',fix:'Open "Columns I used" below and pick the Date column.',rows:[],notes,h,m,hi};
 if(m.debit==null&&m.credit==null&&m.amount==null)return{err:'No Debit / Credit or Amount column found.',fix:'Open "Columns I used" below and pick the Debit and Credit columns (for a bank statement: Withdrawal and Deposit).',rows:[],notes,h,m,hi};
 if(m.debit!=null&&m.credit==null||m.credit!=null&&m.debit==null)notes.push(rcNote('warn','Only one of Debit / Credit was found.','Choose the other one under "Columns I used", otherwise half the entries are missing.'));
 const out=[];let badDate=0;for(let i=hi+1;i<rows.length;i++){const r=rows[i]||[];if(!r.length)continue;const d=rcDate(r[m.date]);
  let dr=m.debit!=null?rcN(r[m.debit]):0,cr=m.credit!=null?rcN(r[m.credit]):0,amt=0;
  if(m.debit==null&&m.credit==null)amt=rcN(r[m.amount]);else amt=src=='books'?(dr-cr):(cr-dr);
  if(!d){if(amt&&String(r[m.date]||'').trim()!==''&&!/total|balance|brought|carried/i.test(r.map(String).join(' ')))badDate++;continue}
  if(!amt)continue;const desc=m.desc!=null?String(r[m.desc]||'').trim():'',ref=m.ref!=null?String(r[m.ref]||'').trim():'';
  out.push({src,row:i+1,date:d,day:rcDayN(d),desc,ref,amt:rcR(amt),toks:rcToks(ref+' '+desc),bal:m.bal!=null?rcN(r[m.bal]):null})}
 if(badDate)notes.push(rcNote('warn',badDate+' row(s) were left out because the date could not be read.','Make sure the Date column holds real dates (for example 05/04/2026). Fix them in Excel or choose another Date column.'));
 if(!out.length)notes.push(rcNote('bad','No transactions could be read from this sheet.','Check the "Columns I used" box: Date and Debit/Credit are needed.'));
 return{rows:out,notes,h,m,hi}}

/* ---------- who is the client ---------- */
function rcInfo(sh){let name='',gstin='',title='';
 sh.slice(0,6).forEach(s=>{(s.rows||[]).slice(0,16).forEach((r,ri)=>{(r||[]).forEach((c,ci)=>{const t=String(c==null?'':c).trim();if(!t)return;
  if(/^(legal|trade)\s*name|taxpayer\s*name|name\s*of\s*(the\s*)?(registered|taxpayer)|^name$/i.test(t)&&!name){const v=(r||[]).slice(ci+1).map(x=>String(x==null?'':x).trim()).find(Boolean);if(v&&!/^\d/.test(v))name=v}
  if(!gstin){const f=t.toUpperCase().match(GSTINRX);if(f&&((r||[]).some(x=>/gstin|taxpayer/i.test(String(x)))||(ri<4&&f[0]===t.toUpperCase())))gstin=f[0]}
  if(!title&&ri<3&&ci==0&&!/\d{2}[-\/]\d{2}|register|statement|ledger|list|summary|goods|date|bank a\/c/i.test(t)&&t.length>3)title=t})})});
 return{name:name||title,gstin,title}}

/* ---------- reading a file (again, when columns change) ---------- */
function rcFriendly(e){const m=(e&&e.message)||String(e||'');
 if(/old \.xls/i.test(m))return[m,'In Excel: File, Save As, choose "Excel Workbook (.xlsx)", then upload that file.'];
 if(/could not be opened as an excel|zip|central directory|End of data/i.test(m))return['This file could not be opened as an Excel file.','It may be damaged, password-protected or not really .xlsx. Open it in Excel, remove the password, Save As .xlsx and upload again.'];
 if(/utf|decode/i.test(m))return['The text in this file could not be read.','Open it in Excel and Save As .xlsx, then upload again.'];
 return[m||'This file could not be read.','Try saving the file as .xlsx from Excel and upload it again. If it still fails, take a screenshot of this message and send it to me.']}
function rcParse(key){const o=RCS[key],sh=o.sh,ov=o.ov||{},bank=RCS.tab=='bank';let rows=[],notes=[],h=null,m=null,err='',fix='';
 if(!bank){const p=rcPick(sh,'gst'),src=key=='A'?'books':'gstr';
  p.main.forEach(s=>{const r=rcGstRows(s.rows,src,1,ov);if(r.err){err=r.err;fix=r.fix}notes=notes.concat(r.notes||[]);if(r.h&&!h){h=r.h;m=r.m}rows=rows.concat(r.rows)});
  p.cdn.forEach(s=>{const r=rcGstRows(s.rows,'gstr',-1);rows=rows.concat(r.rows)});
  if(key=='A'&&sh.length>1&&!rows.length){for(const s of sh){const r=rcGstRows(s.rows,'books',1,ov);if(r.rows.length){rows=r.rows;err='';fix='';notes=r.notes||[];h=r.h;m=r.m;break}}}}
 else{for(const s of sh){const r=rcBankRows(s.rows,key=='A'?'books':'bank',ov);if(r.rows.length){rows=r.rows;err='';fix='';notes=r.notes||[];h=r.h;m=r.m;break}err=r.err||err;fix=r.fix||fix;if(r.h&&!h){h=r.h;m=r.m}notes=notes.concat(r.notes||[])}}
 o.rows=rows;o.n=rows.length;o.h=h;o.m=m;o.notes=notes;o.err=rows.length?'':(err||'No rows could be read from this file.');o.fix=rows.length?'':(fix||'Open "Columns I used" below to pick the right columns, or check that you chose the right file.');RCS.R=null}
async function rcFile(inp,key){const f=inp.files[0];if(!f)return;const o={name:f.name,n:0,ov:{},sh:[],notes:[]};RCS[key]=o;RCS.R=null;RCS.mapOpen=RCS.mapOpen||{};
 try{o.sh=await rcRead(f);o.info=rcInfo(o.sh);rcParse(key)}catch(e){const fr=rcFriendly(e);o.err=fr[0];o.fix=fr[1]}
 if(o.n&&o.notes.some(n=>n.lvl!='info'&&n.lvl!='okk'))RCS.mapOpen[key]=true;
 recoPage(true)}
function rcRemap(key,f,v){const o=RCS[key];if(!o)return;o.ov=o.ov||{};o.ov[f]=+v;RCS.mapOpen[key]=true;rcParse(key);recoPage(true)}
function rcMapReset(key){const o=RCS[key];if(!o)return;o.ov={};rcParse(key);recoPage(true)}

function rcNotesHtml(L){return L.map(n=>'<div class="rcn '+n.lvl+'"><i>'+(n.lvl=='bad'?'!':n.lvl=='warn'?'!':'i')+'</i><div><b>'+E(n.msg)+'</b>'+(n.fix?'<span>What to do: '+E(n.fix)+'</span>':'')+'</div></div>').join('')}
function rcDrop(id,lbl,hint,key){const f=RCS[key],bank=RCS.tab=='bank',F=bank?RCFIELDS.bank:RCFIELDS.gst;
 let h='<div class="rcd"><b>'+lbl+'</b><small>'+hint+'</small><label class="dz" id="dz'+key+'"><span>'+(f?'<b>'+E(f.name)+'</b> · '+f.n+' rows read · click to change':(bank?'Drop the file here or click to choose':E(RCT.upload)))+'</span><input type="file" hidden accept=".xlsx,.xlsm,.xls,.csv" onchange="rcFile(this,\''+key+'\')"></label>';
 if(f&&f.err)h+='<div class="rcn bad"><i>!</i><div><b>'+E(f.err)+'</b><span>What to do: '+E(f.fix||'')+'</span></div></div>';
 if(f&&f.n&&!bank)h+='<div class="rcsx">✓ '+E(RCT.success.replace('{n}',f.n))+'</div>';
 if(f&&f.notes&&f.notes.length)h+=rcNotesHtml(f.notes);
 if(f&&f.h&&f.m){const open=!!(RCS.mapOpen&&RCS.mapOpen[key]);
  h+='<details class="rcmap"'+(open?' open':'')+' ontoggle="RCS.mapOpen=RCS.mapOpen||{};RCS.mapOpen[\''+key+'\']=this.open"><summary>Columns I used <small>(check these)</small></summary><div class="rcmg">'
   +F.map(([k,l])=>'<label>'+l+'<select onchange="rcRemap(\''+key+'\',\''+k+'\',this.value)"><option value="-1">— not in this file —</option>'+f.h.map((c,i)=>'<option value="'+i+'"'+(f.m[k]===i?' selected':'')+'>'+E(c||('Column '+(i+1)))+'</option>').join('')+'</select></label>').join('')
   +'</div><button class="g sm" onclick="rcMapReset(\''+key+'\')">Reset to automatic</button></details>'}
 return h+'</div>'}

/* ---------- checks after the run: explain problems and the fix ---------- */
function rcSpan(L){const d=L.map(x=>x.date||'').filter(Boolean).sort();return d.length?[d[0],d[d.length-1]]:null}
function rcDiag(){const X=RCS.R;if(!X)return;const N=[];
 if(X.t=='gst'){const S=X.S,pairs=S.match+S.mismatch,tot=X.R.length,A=RCS.A,B=RCS.B,sl=rcSl()?'GSTR-1':'GSTR-2B';
  const sA=rcSpan(A.rows),sB=rcSpan(B.rows);
  if(sA&&sB&&(sA[1]<sB[0]||sB[1]<sA[0]))N.push(rcNote('bad','The two files cover different periods: your books '+fd(sA[0])+' to '+fd(sA[1])+', '+sl+' '+fd(sB[0])+' to '+fd(sB[1])+'.','Export both files for the same month (or the same period) and run again.'));
  if(pairs>=5&&S.mismatch/pairs>0.6){const zero=A.rows.reduce((s,x)=>s+Math.abs(x.taxable),0)===0||B.rows.reduce((s,x)=>s+Math.abs(x.taxable),0)===0;
   N.push(rcNote('warn',zero?'Taxable value reads as 0 in one of the files, so almost every invoice shows a mismatch.':'Most invoices match by number but the amounts differ.','This usually means a wrong column was picked. Open "Columns I used" under each file and check Taxable value, IGST, CGST and SGST.'+(zero?' If your Tally register has no taxable column, choose the "Invoice / gross total" column and I will work it out.':'')))}
  if(tot>=8&&(S.missG+S.missB)/tot>0.5&&!(sA&&sB&&(sA[1]<sB[0]||sB[1]<sA[0])))N.push(rcNote('warn','More than half the invoices are in only one of the two files.','Check that both files are for the same business (GSTIN) and the same period, and that the GSTIN and Invoice number columns are right.'));
  const ia=A.info||{},ib=B.info||{};if(ia.gstin&&ib.gstin&&ia.gstin!==ib.gstin)N.push(rcNote('bad','The two files seem to belong to different GSTINs ('+ia.gstin+' and '+ib.gstin+').','Upload the files of the same client.'));
  if(S.probable)N.push(rcNote('info',S.probable+' probable match(es) need your OK.','Check each one and confirm it if it is the same invoice.'));
  if(tot&&!S.mismatch&&!S.missG&&!S.missB&&!S.probable)N.push(rcNote('ok','Everything matched.',''))}
 else{const S=X.S,A=RCS.A,B=RCS.B;const sA=rcSpan(A.rows),sB=rcSpan(B.rows);
  if(sA&&sB&&(sA[1]<sB[0]||sB[1]<sA[0]))N.push(rcNote('bad','The ledger and the statement cover different dates: ledger '+fd(sA[0])+' to '+fd(sA[1])+', statement '+fd(sB[0])+' to '+fd(sB[1])+'.','Export both for the same period.'));
  if(S.nM===0&&(S.nB||S.nK))N.push(rcNote('warn','Nothing matched.','Check that the Debit / Credit columns are not swapped, and that the files are for the same bank account and period. In the ledger, Debit means money received; in the statement, Deposit means money received.'));
  else if((S.nB+S.nK)>S.nM&&S.nM>0)N.push(rcNote('info','Many entries are unmatched.','Try a larger date window (for example 7 to 10 days) if cheques clear slowly.'));
  if(S.gap!=null&&Math.abs(S.gap)>=0.01)N.push(rcNote('warn','The reconciliation statement is out by '+rcMoney(S.gap)+'.','Check the two closing balances you typed, and look for entries that appear twice or are missing in the unmatched lists below.'))}
 X.diag=N}
const rcCN=()=>{const A=RCS.A&&RCS.A.info||{},B=RCS.B&&RCS.B.info||{};const sel=RCS.client||'';
 return{name:sel||(rcSl()?(B.name||A.name):(RCS.tab=='bank'?(A.title||B.title):(B.name||A.name)))||'',gstin:(B.gstin||A.gstin)||''}}
const rcClientLine=()=>{const c=rcCN();return (c.name||'(not given)')+(c.gstin?' · GSTIN '+c.gstin:'')};
function rcHeadHtml(){const c=rcCN(),X=RCS.R;let h='';
 if(c.name||c.gstin)h+='<div class="rccl"><span>Client</span><b>'+E(c.name||'Not given')+'</b>'+(c.gstin?'<small>GSTIN '+E(c.gstin)+'</small>':'')+'<small>'+(rcSl()?'GSTR-1 vs Sales register':RCS.tab=='gst'?'GSTR-2B vs Purchase register':'Bank reconciliation')+'</small></div>';
 if(X.diag&&X.diag.length)h+='<div class="rcdg"><b>Things to check</b>'+rcNotesHtml(X.diag.map(n=>n.lvl=='ok'?Object.assign({},n,{lvl:'okk'}):n))+'</div>';
 return h}
function rcResHtml(){return rcHeadHtml()+rcResHtml0()}
