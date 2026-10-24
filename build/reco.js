
/* ====================================================================
   RECO  -  GSTR-2B vs purchase register, and bank reconciliation (BRS)
   Everything runs in the browser. Files are never uploaded anywhere.
   ==================================================================== */
const RCS={tab:'gst',tol:1,win:5,A:null,B:null,R:null,fl:'all',q:'',client:''};
const rcN=x=>{if(typeof x==='number')return isFinite(x)?x:0;let s=String(x==null?'':x).trim();if(!s)return 0;let neg=/^\(.*\)$/.test(s)||/-\s*$/.test(s)||/\bcr\b/i.test(s)&&false;s=s.replace(/[₹,\s()]|rs\.?|inr|dr|cr/gi,'').replace(/-$/,'');const n=parseFloat(s);return isNaN(n)?0:(neg&&n>0?-n:n)};
const rcR=x=>Math.round((x+Number.EPSILON)*100)/100;
const rcMON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function rcDate(x){if(x==null||x==='')return'';if(x instanceof Date&&!isNaN(x))return ymd(x);
 if(typeof x==='number'||/^\d{4,6}(\.\d+)?$/.test(String(x).trim())){const n=+x;if(n>20000&&n<80000){const d=new Date(Math.round((n-25569)*864e5));return d.getUTCFullYear()+'-'+jkP2(d.getUTCMonth()+1)+'-'+jkP2(d.getUTCDate())}return''}
 const s=String(x).trim();let m;
 if(m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))return m[1]+'-'+jkP2(m[2])+'-'+jkP2(m[3]);
 if(m=s.match(/^(\d{1,2})[-\/. ]+(\d{1,2})[-\/. ]+(\d{2,4})/)){let y=+m[3];if(y<100)y+=2000;return y+'-'+jkP2(m[2])+'-'+jkP2(m[1])}
 if(m=s.match(/^(\d{1,2})[-\/. ]+([A-Za-z]{3})[a-z]*[-\/. ,]+(\d{2,4})/)){const mo=rcMON[m[2].toLowerCase()];if(!mo)return'';let y=+m[3];if(y<100)y+=2000;return y+'-'+jkP2(mo)+'-'+jkP2(m[1])}
 return''}
const rcDayN=d=>d?Math.round(Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10))/864e5):null;
const rcNorm=s=>String(s==null?'':s).toUpperCase().replace(/[^A-Z0-9]/g,'');
const rcInv=s=>rcNorm(s).replace(/^0+(?=.)/,'');
const rcDig=s=>(String(s).match(/\d+/g)||[]).join('').replace(/^0+(?=.)/,'');
function rcLev(a,b){if(a===b)return 0;if(Math.abs(a.length-b.length)>1)return 2;const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
const GSTINRX=/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/;

/* ---------- reading files ---------- */
async function rcRead(file){const nm=file.name,buf=await file.arrayBuffer();
 if(/\.csv$|\.txt$/i.test(nm)){const t=new TextDecoder('utf-8').decode(buf).replace(/^﻿/,'');return[{name:'CSV',rows:rcCsv(t)}]}
 if(/\.xls$/i.test(nm)&&!/\.xlsx$/i.test(nm)){const u=new Uint8Array(buf);if(u[0]==0xD0&&u[1]==0xCF&&!window.XLSX)throw new Error('Old .xls files need to be saved as .xlsx first (Excel: File, Save As, .xlsx).')}
 return await xlAll(buf)}
function rcCsv(t){const rows=[];let r=[],c='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];
 if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
 else if(ch=='"')q=true;else if(ch==','||ch=='\t'||ch==';'&&false){r.push(c);c=''}
 else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;r.push(c);rows.push(r);r=[];c=''}else c+=ch}
 if(c!==''||r.length){r.push(c);rows.push(r)}return rows}

/* ---------- finding the header row and the columns ---------- */
const RCF={
 gst:{gstin:/gstin|gst\s*no|gst\s*in|\buin\b|gst\s*reg/i,party:/trade|legal|party|supplier|vendor|particulars|ledger|name/i,inv:/invoice\s*(no|num)|inv\.?\s*(no|num|#)|bill\s*(no|num)|document\s*(no|num)|note\s*(no|num)|supplier\s*inv|vch\s*ref|reference\s*no|ref\.?\s*no|voucher\s*no|^invoice$|^inv$|^bill$/i,
  date:/invoice\s*date|note\s*date|inv\.?\s*date|bill\s*date|document\s*date|^date$|voucher\s*date/i,val:/invoice\s*value|gross\s*total|bill\s*value|total\s*(value|amount)|^total$/i,taxable:/taxable/i,igst:/integrated|igst/i,cgst:/central|cgst/i,sgst:/state\s*\/?\s*ut|sgst|state\s*tax|utgst/i,cess:/cess/i,rate:/^rate(\b|\s|\()/i,itc:/itc\s*avail|eligib/i,note:/note\s*type|document\s*type|voucher\s*type/i},
 book:{date:/^date$|txn\s*date|trans\w*\s*date|voucher\s*date|value\s*date|post\w*\s*date|^dt$/i,desc:/particulars|narration|description|remarks|details|ledger|party/i,ref:/vch\s*no|voucher\s*no|chq|cheque|ref|instrument|utr|transaction\s*id|^no\.?$/i,debit:/debit|\bdr\b|^dr\.?$|payment|withdraw/i,credit:/credit|\bcr\b|^cr\.?$|receipt|deposit/i,amount:/^amount$|^amt$|txn\s*amount/i,bal:/balance/i}};
function rcHead(rows,kind){const F=kind=='gst'?RCF.gst:RCF.book;const keys=Object.keys(F);let best=-1,bi=0;
 for(let i=0;i<Math.min(rows.length,40);i++){const r=rows[i]||[];let sc=0;keys.forEach(k=>{if(r.some(c=>c!==''&&F[k].test(String(c))))sc++});if(sc>best){best=sc;bi=i}}
 return best>=2?bi:-1}
function rcMap(h,kind,side){const F=kind=='gst'?RCF.gst:RCF.book,m={},used=new Set();const order=kind=='gst'?['gstin','inv','date','taxable','rate','igst','cgst','sgst','cess','val','itc','note','party']:['date','ref','debit','credit','amount','bal','desc'];
 order.forEach(k=>{let j=h.findIndex((c,i)=>!used.has(i)&&c!==''&&F[k].test(String(c)));if(k=='debit'||k=='credit'){if(side=='bank'&&false)j=j}if(j>=0){m[k]=j;used.add(j)}});
 if(kind=='book'&&side=='bank'){/* bank statement: withdrawal = out, deposit = in */}
 return m}
function rcPick(sheets,kind){let s=null;if(kind=='gst'){s=sheets.filter(x=>/^b2b(\b|$)/i.test(x.name)&&!/b2ba|cdn/i.test(x.name));if(!s.length){const ok=sheets.filter(x=>x&&x.rows&&rcHead(rcJoin2(x.rows,rcHead(x.rows,'gst')),'gst')>=0&&!/b2ba|cdn|summary|read|help/i.test(x.name));s=ok.length?ok:[sheets[0]]}const cd=sheets.filter(x=>/cdn/i.test(x.name)&&!/cdna/i.test(x.name));return{main:s,cdn:cd}}
 return{main:[sheets[0]],cdn:[]}}

/* ---------- GST rows ---------- */
function rcGstRows(rows,src,sign){const hi=rcHead(rows,'gst');if(hi<0)return{err:'Could not find the column headings (GSTIN, Invoice number, Date, Taxable value, tax).',rows:[]};
 const h=(rows[hi]||[]).map(c=>String(c==null?'':c)),m=rcMap(h,'gst'),out=[];
 if(m.inv==null)return{err:'No "Invoice number" column found.',rows:[]};
 for(let i=hi+1;i<rows.length;i++){const r=rows[i]||[];if(!r.length)continue;const inv=String(r[m.inv]==null?'':r[m.inv]).trim();let g=m.gstin!=null?String(r[m.gstin]||'').toUpperCase().replace(/\s/g,''):'';
  if(!g){const f=r.map(String).join(' ').toUpperCase().match(GSTINRX);if(f)g=f[0]}
  if(!inv||/^total|^grand/i.test(inv))continue;
  let sg=sign;if(m.note!=null&&/credit/i.test(String(r[m.note])))sg=-1;
  const ns=m.igst==null&&m.cgst==null&&m.sgst==null&&m.rate!=null;const t=rcN(r[m.taxable])*sg;let ig=rcN(r[m.igst])*sg,cg=rcN(r[m.cgst])*sg,sc=rcN(r[m.sgst])*sg;const ce=rcN(r[m.cess])*sg;if(ns)ig=rcR(t*rcN(r[m.rate])/100);
  if(!t&&!ig&&!cg&&!sc)continue;
  out.push({src,ns,row:i+1,gstin:g,party:m.party!=null?String(r[m.party]||'').trim():'',inv,date:rcDate(r[m.date]),taxable:t,igst:ig,cgst:cg,sgst:sc,cess:ce,itc:m.itc!=null?String(r[m.itc]||''):'',vc:m.note!=null?String(r[m.note]||''):''})}
 return{rows:out,cols:h.filter((_,i)=>Object.values(m).includes(i)).length}}
function rcAgg(L){const M=new Map();L.forEach(x=>{const k=(x.gstin||'?')+'|'+rcInv(x.inv);let a=M.get(k);if(!a){a=Object.assign({},x,{n:1,keyInv:rcInv(x.inv),rows:[x.row]});M.set(k,a)}else{if(x.ns)a.ns=true;['taxable','igst','cgst','sgst','cess'].forEach(f=>a[f]+=x[f]);a.n++;a.rows.push(x.row);if(!a.date)a.date=x.date;if(!a.party)a.party=x.party}});
 return[...M.values()].map(a=>{['taxable','igst','cgst','sgst','cess'].forEach(f=>a[f]=rcR(a[f]));a.tax=rcR(a.igst+a.cgst+a.sgst);return a})}

/* ---------- GST matching ---------- */
function rcDiff(b,g,tol){const d=[];if(b.ns||g.ns){const x=rcR(b.taxable-g.taxable),y=rcR(b.tax-g.tax);if(Math.abs(x)>tol)d.push({f:'taxable',l:'Taxable',x});if(Math.abs(y)>tol)d.push({f:'tax',l:'Tax',x:y});return d}[['taxable','Taxable'],['igst','IGST'],['cgst','CGST'],['sgst','SGST']].forEach(([f,l])=>{const x=rcR(b[f]-g[f]);if(Math.abs(x)>tol)d.push({f,l,x})});return d}
function rcGst(books,gstr,tol){const B=rcAgg(books),G=rcAgg(gstr),res=[],gmap=new Map(),usedB=new Set(),usedG=new Set();
 G.forEach((g,i)=>gmap.set((g.gstin||'?')+'|'+g.keyInv,i));
 const pair=(bi,gi,kind,why)=>{usedB.add(bi);usedG.add(gi);const b=B[bi],g=G[gi],d=rcDiff(b,g,tol);
  let st=kind;if(kind=='exact')st=d.length?'mismatch':'match';else st=d.length?'mismatch':'probable';
  res.push({st,why:why||'',b,g,diff:d,acc:0})};
 B.forEach((b,bi)=>{const gi=gmap.get((b.gstin||'?')+'|'+b.keyInv);if(gi!=null&&!usedG.has(gi))pair(bi,gi,'exact','')});
 const byG=new Map();G.forEach((g,gi)=>{if(usedG.has(gi))return;const k=g.gstin||'?';(byG.get(k)||byG.set(k,[]).get(k)).push(gi)});
 const close=(b,g)=>Math.abs(b.taxable-g.taxable)<=tol&&Math.abs(b.tax-g.tax)<=tol;
 B.forEach((b,bi)=>{if(usedB.has(bi))return;const c=(byG.get(b.gstin||'?')||[]).filter(gi=>!usedG.has(gi));let hit=-1,why='';
  for(const gi of c){const g=G[gi];const dB=rcDig(b.inv),dG=rcDig(g.inv);
   if(b.keyInv.length>=3&&g.keyInv.length>=3&&(b.keyInv.endsWith(g.keyInv)||g.keyInv.endsWith(b.keyInv))){hit=gi;why='Invoice number written differently';break}
   if(dB&&dB===dG&&close(b,g)){hit=gi;why='Same digits in invoice number';break}
   if(b.keyInv.length>=5&&g.keyInv.length>=5&&rcLev(b.keyInv,g.keyInv)<=1){hit=gi;why='Invoice number differs by one character';break}}
  if(hit<0)for(const gi of c){const g=G[gi];if(close(b,g)&&b.date&&b.date===g.date){hit=gi;why='Same date and amount, invoice number differs';break}}
  if(hit>=0)pair(bi,hit,'prob',why)});
 /* same invoice number and amount but a different GSTIN */
 const byInv=new Map();G.forEach((g,gi)=>{if(usedG.has(gi)||g.keyInv.length<3)return;(byInv.get(g.keyInv)||byInv.set(g.keyInv,[]).get(g.keyInv)).push(gi)});
 B.forEach((b,bi)=>{if(usedB.has(bi))return;const c=(byInv.get(b.keyInv)||[]).filter(gi=>!usedG.has(gi)&&close(b,G[gi]));if(c.length)pair(bi,c[0],'prob','GSTIN differs, check the supplier GSTIN in books')});
 B.forEach((b,bi)=>{if(!usedB.has(bi))res.push({st:'missG',why:'',b,g:null,diff:[],acc:0})});
 G.forEach((g,gi)=>{if(!usedG.has(gi))res.push({st:'missB',why:'',b:null,g,diff:[],acc:0})});
 return res}
function rcGstSum(R){const S={match:0,mismatch:0,probable:0,missG:0,missB:0,itcB:0,itcG:0,risk:0,extra:0};R.forEach(r=>{const st=r.acc&&r.st=='probable'?'match':r.st;S[st]++;
  if(r.b)S.itcB+=r.b.tax;if(r.g)S.itcG+=r.g.tax;
  if(r.st=='missG')S.risk+=r.b.tax;if(r.st=='missB')S.extra+=r.g.tax;
  if(r.st=='mismatch'){const d=r.b.tax-r.g.tax;if(d>0)S.risk+=d;else S.extra+=-d}});
 Object.keys(S).forEach(k=>{if(/itc|risk|extra/.test(k))S[k]=rcR(S[k])});return S}

/* ---------- bank rows ---------- */
function rcBankRows(rows,src){const hi=rcHead(rows,'book');if(hi<0)return{err:'Could not find the column headings (Date, Particulars, Debit, Credit).',rows:[]};
 const h=(rows[hi]||[]).map(c=>String(c==null?'':c)),m=rcMap(h,'book',src);if(m.date==null)return{err:'No Date column found.',rows:[]};
 if(m.debit==null&&m.credit==null&&m.amount==null)return{err:'No Debit/Credit or Amount column found.',rows:[]};
 const out=[];for(let i=hi+1;i<rows.length;i++){const r=rows[i]||[];if(!r.length)continue;const d=rcDate(r[m.date]);if(!d)continue;
  let dr=m.debit!=null?rcN(r[m.debit]):0,cr=m.credit!=null?rcN(r[m.credit]):0,amt=0;
  /* books (Tally): Debit = money in.  Bank statement: Debit/Withdrawal = money out. */
  if(m.debit==null&&m.credit==null)amt=rcN(r[m.amount]);else amt=src=='books'?(dr-cr):(cr-dr);
  if(!amt)continue;const desc=m.desc!=null?String(r[m.desc]||'').trim():'',ref=m.ref!=null?String(r[m.ref]||'').trim():'';
  out.push({src,row:i+1,date:d,day:rcDayN(d),desc,ref,amt:rcR(amt),toks:rcToks(ref+' '+desc),bal:m.bal!=null?rcN(r[m.bal]):null})}
 return{rows:out}}
function rcToks(s){return[...new Set((String(s).match(/\d{4,}/g)||[]).map(x=>x.replace(/^0+/,'')).filter(x=>x.length>=1))]}

/* ---------- bank matching ---------- */
function rcBank(books,bank,win){const used=new Set(),usedK=new Set(),res=[];const B=books.map((x,i)=>Object.assign({i},x)),K=bank.map((x,i)=>Object.assign({i},x));
 const add=(bs,ks,how)=>{bs.forEach(b=>used.add(b.i));ks.forEach(k=>usedK.add(k.i));res.push({st:'match',how,books:bs,bank:ks})};
 const share=(a,b)=>a.toks.some(t=>b.toks.includes(t));
 /* pass 1 reference + amount, pass 2 amount + nearest date, within the window */
 [1,2].forEach(pass=>{K.forEach(k=>{if(usedK.has(k.i))return;let best=null,bd=1e9;B.forEach(b=>{if(used.has(b.i)||Math.abs(b.amt-k.amt)>0.005)return;const dd=Math.abs(b.day-k.day);
   if(pass==1){if(!share(b,k)||dd>60)return}else if(dd>win)return;if(dd<bd){bd=dd;best=b}});
  if(best)add([best],[k],pass==1?'Reference and amount':'Amount and date')})});
 /* pass 3 many to one: several entries add up to one line on the other side (same sign, within the window) */
 const grp=(A,Bx,flip)=>{Bx.forEach(x=>{if(flip?used.has(x.i):usedK.has(x.i))return;
   const c=A.filter(a=>!(flip?usedK.has(a.i):used.has(a.i))&&Math.sign(a.amt)==Math.sign(x.amt)&&Math.abs(a.day-x.day)<=win).slice(0,14);if(c.length<2)return;
   const n=c.length;let found=null;for(let mask=3;mask<(1<<n)&&!found;mask++){let cnt=0,s=0;for(let j=0;j<n;j++)if(mask>>j&1){cnt++;s+=c[j].amt}if(cnt>=2&&cnt<=5&&Math.abs(s-x.amt)<0.005)found=c.filter((_,j)=>mask>>j&1)}
   if(found){if(flip)add([x],found,'Several bank lines = one book entry');else add(found,[x],'Several book entries = one bank line')}})};
 grp(B,K,false);grp(K,B,true);
 B.forEach(b=>{if(!used.has(b.i))res.push({st:'bOnly',books:[b],bank:[]})});K.forEach(k=>{if(!usedK.has(k.i))res.push({st:'kOnly',books:[],bank:[k]})});
 return res}
function rcBrs(R,bk,bn){const S={bkIn:0,bkOut:0,knIn:0,knOut:0,nB:0,nK:0,nM:0};R.forEach(r=>{if(r.st=='match')S.nM++;
  if(r.st=='bOnly'){S.nB++;const a=r.books[0].amt;a>0?S.bkIn+=a:S.bkOut+=-a}if(r.st=='kOnly'){S.nK++;const a=r.bank[0].amt;a>0?S.knIn+=a:S.knOut+=-a}});
 Object.keys(S).forEach(k=>{if(/Out|In/.test(k))S[k]=rcR(S[k])});
 S.calc=(bk===''||bk==null)?null:rcR(+bk+S.knIn-S.knOut+S.bkOut-S.bkIn);S.bank=(bn===''||bn==null)?null:+bn;S.gap=S.calc!=null&&S.bank!=null?rcR(S.bank-S.calc):null;return S}

/* ====================================================================
   screens
   ==================================================================== */
const RC_IC='<svg viewBox="0 0 24 24"><path d="M4 7h13l-3-3M20 17H7l3 3"/><path d="M4 7a3 3 0 0 0 0 0M17 7v0M7 17v0"/></svg>';
const rcMoney=x=>x==null?'':(x<0?'-':'')+Math.abs(x).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
function rcDrop(id,lbl,hint,key){const f=RCS[key];return '<div class="rcd"><b>'+lbl+'</b><small>'+hint+'</small><label class="dz" id="dz'+key+'"><span>'+(f?'<b>'+E(f.name)+'</b> · '+f.n+' rows read · click to change':'Drop the file here or click to choose')+'</span><input type="file" hidden accept=".xlsx,.xlsm,.xls,.csv" onchange="rcFile(this,\''+key+'\')"></label>'+(f&&f.err?'<div class="rce">'+E(f.err)+'</div>':'')+'</div>'}
function rcDz(){document.querySelectorAll('.rcd .dz').forEach(z=>{['dragover','dragenter'].forEach(e=>z.addEventListener(e,ev=>{ev.preventDefault();z.classList.add('ov')}));['dragleave','drop'].forEach(e=>z.addEventListener(e,ev=>{ev.preventDefault();z.classList.remove('ov')}));
 z.addEventListener('drop',ev=>{const f=ev.dataTransfer.files[0],i=z.querySelector('input');if(f&&i){const dt=new DataTransfer();dt.items.add(f);i.files=dt.files;i.dispatchEvent(new Event('change'))}})})}
async function rcFile(inp,key){const f=inp.files[0];if(!f)return;const o={name:f.name,n:0};RCS[key]=o;RCS.R=null;
 try{const sh=await rcRead(f);let rows=[],cdn=[],err='';
  if(RCS.tab!='bank'){const p=rcPick(sh,'gst'),sign=1;p.main.forEach(s=>{const r=rcGstRows(s.rows,key=='A'?'books':'gstr',sign);if(r.err)err=r.err;rows=rows.concat(r.rows)});p.cdn.forEach(s=>{const r=rcGstRows(s.rows,'gstr',-1);cdn=cdn.concat(r.rows)});rows=rows.concat(cdn);
   if(key=='A'&&sh.length>1&&!rows.length){/* books file may keep the register on any sheet */for(const s of sh){const r=rcGstRows(s.rows,'books',1);if(r.rows.length){rows=r.rows;err='';break}}}}
  else{for(const s of sh){const r=rcBankRows(s.rows,key=='A'?'books':'bank');if(r.rows.length){rows=r.rows;err='';break}err=r.err||err}}
  o.rows=rows;o.n=rows.length;if(!rows.length)o.err=err||'No rows could be read from this file.'}catch(e){o.err=e.message||'This file could not be read.'}
 recoPage(true)}
function rcSet(k,v){RCS[k]=v}
function rcTab(t){RCS.tab=t;RCS.A=RCS.B=RCS.R=null;RCS.fl='all';recoPage()}
function reco(){if(!USER)return home();CURP='reco';sb();tg(0);recoPage()}
function recoPage(keep){CURP='reco';sb();pgIn('reco');const g=RCS.tab!='bank',cl=Object.keys(DB.clients),A=RCS.A,B=RCS.B,ready=A&&B&&A.rows&&B.rows&&A.rows.length&&B.rows.length;
 app.innerHTML='<i data-pg="reco" hidden></i><div class="rch"><div><h2 style="margin:0">'+rcTitle()+'</h2><small>Match two sets of records and see exactly what differs. Files stay in your browser.</small></div></div>'
  +'<div class="seg" style="margin:14px 0"><button class="'+(RCS.tab=='gst'?'on':'')+'" onclick="rcTab(\'gst\')">GSTR-2B vs Purchase register</button><button class="'+(RCS.tab=='sale'?'on':'')+'" onclick="rcTab(\'sale\')">GSTR-1 vs Sales register</button><button class="'+(RCS.tab=='bank'?'on':'')+'" onclick="rcTab(\'bank\')">Bank reco (BRS)</button></div>'
  +'<div class="card rcc"><div class="rcg">'+(g?(rcSl()?rcDrop('a','1. Sales register','From Tally: Gateway, Display, Sales Register, export to Excel. Any column order works.','A')+rcDrop('b','2. GSTR-1','The Excel file downloaded from the GST portal or the GSTR-1 offline tool (B2B sheet is read, credit notes too).','B'):rcDrop('a','1. Purchase register','From Tally: Gateway, Display, Purchase Register, export to Excel. Any column order works.','A')+rcDrop('b','2. GSTR-2B','The Excel file downloaded from the GST portal (B2B sheet is read, credit notes too).','B'))
   :rcDrop('a','1. Bank ledger from Tally','Export the bank ledger (Ledger Vouchers) to Excel. Debit = money received.','A')+rcDrop('b','2. Bank statement','Excel or CSV from the bank. Needs Date, Debit/Withdrawal, Credit/Deposit.','B'))+'</div>'
  +'<div class="rco"><label>Client (optional)<select id="rcc" onchange="RCS.client=this.value"><option value="">General</option>'+cl.map(n=>'<option'+(RCS.client==n?' selected':'')+'>'+E(n)+'</option>').join('')+'</select></label>'
  +(g?'<label>Rounding tolerance (₹)<input type="number" min="0" step="0.5" value="'+RCS.tol+'" onchange="RCS.tol=Math.max(0,+this.value||0)"></label>':'<label>Date window (days)<input type="number" min="0" max="30" value="'+RCS.win+'" onchange="RCS.win=Math.max(0,Math.min(30,+this.value||0))"></label><label>Closing balance per books (₹)<input id="rbk" type="number" step="0.01" placeholder="optional" value="'+(RCS.bk==null?'':RCS.bk)+'" onchange="RCS.bk=this.value"></label><label>Closing balance per bank (₹)<input id="rbn" type="number" step="0.01" placeholder="optional" value="'+(RCS.bn==null?'':RCS.bn)+'" onchange="RCS.bn=this.value"></label>')
  +'<button onclick="rcRun()"'+(ready?'':' disabled')+'>Run reco</button></div></div><div id="rcres">'+(RCS.R?rcResHtml():'')+'</div><div style="height:84px"></div>';rcDz();if(typeof mhMount=='function')mhMount()}
function rcRun(){if(!(RCS.A&&RCS.B))return;const g=RCS.tab!='bank';
 if(g){const R=rcGst(RCS.A.rows,RCS.B.rows,RCS.tol);RCS.R={t:'gst',k:RCS.tab,R,S:rcGstSum(R)}}
 else{const R=rcBank(RCS.A.rows,RCS.B.rows,RCS.win);RCS.R={t:'bank',R,S:rcBrs(R,RCS.bk,RCS.bn)}}
 rcDiag();RCS.fl='all';RCS.q='';rcSave();$id('rcres').innerHTML=rcResHtml();$id('rcres').scrollIntoView({behavior:'smooth',block:'start'})}
function rcSave(){const c=RCS.client&&DB.clients[RCS.client];if(!c)return;c.rc=c.rc||{};const S=RCS.R.S;c.rc[RCS.R.t]={at:new Date().toISOString(),S};save()}
const RCL0={match:['Matched','ok'],mismatch:['Value mismatch','bad'],probable:['Probable match','warn'],missG:['In books, not in 2B','bad'],missB:['In 2B, not in books','info']};
const RCL1={match:['Matched','ok'],mismatch:['Value mismatch','bad'],probable:['Probable match','warn'],missG:['In books, not in GSTR-1','bad'],missB:['In GSTR-1, not in books','info']};
const RCL=new Proxy({},{get:(_,k)=>(RCS.tab=='sale'?RCL1:RCL0)[k]});
const rcSl=()=>RCS.tab=='sale';
function rcFlt(f){RCS.fl=f;$id('rcres').innerHTML=rcResHtml()}
function rcQ(v){RCS.q=v;clearTimeout(rcQ.t);rcQ.t=setTimeout(()=>{const t=$id('rcl');if(t)t.innerHTML=rcTable()},150)}
function rcAcc(i){const r=RCS.R.R[i];if(r)r.acc=r.acc?0:1;RCS.R.S=rcGstSum(RCS.R.R);$id('rcres').innerHTML=rcResHtml()}
function rcResHtml0(){const X=RCS.R;if(!X)return'';if(X.t=='gst'){const S=X.S;const tiles=[['match','Matched',S.match,'ok'],['mismatch','Value mismatch',S.mismatch,'bad'],['probable','Probable',S.probable,'warn'],['missG','Not in '+(rcSl()?'GSTR-1':'2B'),S.missG,'bad'],['missB','Not in books',S.missB,'info']];
  return '<h3>Result</h3><div class="rcs">'+tiles.map(t=>'<button class="rct '+t[3]+(RCS.fl==t[0]?' on':'')+'" onclick="rcFlt(\''+(RCS.fl==t[0]?'all':t[0])+'\')"><b>'+t[2]+'</b><span>'+t[1]+'</span></button>').join('')+'</div>'
  +'<div class="rcm"><div><small>'+(rcSl()?'Tax as per books':'ITC as per books')+'</small><b>₹ '+rcMoney(S.itcB)+'</b></div><div><small>'+(rcSl()?'Tax as per GSTR-1':'ITC as per GSTR-2B')+'</small><b>₹ '+rcMoney(S.itcG)+'</b></div><div class="w"><small>'+(rcSl()?'In books, not reported in GSTR-1':'ITC at risk (claimed, not in 2B)')+'</small><b>₹ '+rcMoney(S.risk)+'</b></div><div class="g"><small>'+(rcSl()?'In GSTR-1, not in books':'ITC available, not booked')+'</small><b>₹ '+rcMoney(S.extra)+'</b></div></div>'
  +'<div class="toolbar"><input class="sq" style="flex:1;min-width:200px;margin:0" placeholder="Search party, GSTIN or invoice..." value="'+E(RCS.q)+'" oninput="rcQ(this.value)"><button onclick="rcXls()">Download Excel</button></div><div id="rcl">'+rcTable()+'</div>'}
 const S=X.S,gap=S.gap;
 return '<h3>Result</h3><div class="rcs"><button class="rct ok'+(RCS.fl=='match'?' on':'')+'" onclick="rcFlt(\''+(RCS.fl=='match'?'all':'match')+'\')"><b>'+S.nM+'</b><span>Matched</span></button><button class="rct warn'+(RCS.fl=='bOnly'?' on':'')+'" onclick="rcFlt(\''+(RCS.fl=='bOnly'?'all':'bOnly')+'\')"><b>'+S.nB+'</b><span>In books, not in bank</span></button><button class="rct bad'+(RCS.fl=='kOnly'?' on':'')+'" onclick="rcFlt(\''+(RCS.fl=='kOnly'?'all':'kOnly')+'\')"><b>'+S.nK+'</b><span>In bank, not in books</span></button></div>'
  +'<div class="card brs"><b>Bank reconciliation statement</b><table><tr><td>Balance as per books</td><td class="n">'+(RCS.bk===''||RCS.bk==null?'<small>enter above</small>':rcMoney(+RCS.bk))+'</td></tr>'
  +'<tr><td>Add: credited by bank, not yet in books</td><td class="n">'+rcMoney(S.knIn)+'</td></tr><tr><td>Less: debited by bank, not yet in books</td><td class="n">- '+rcMoney(S.knOut)+'</td></tr>'
  +'<tr><td>Add: cheques issued, not yet cleared</td><td class="n">'+rcMoney(S.bkOut)+'</td></tr><tr><td>Less: deposits in books, not yet credited by bank</td><td class="n">- '+rcMoney(S.bkIn)+'</td></tr>'
  +'<tr class="t"><td>Balance as per bank (calculated)</td><td class="n">'+(S.calc==null?'<small>enter books balance</small>':rcMoney(S.calc))+'</td></tr>'
  +(S.bank!=null?'<tr><td>Balance as per bank statement</td><td class="n">'+rcMoney(S.bank)+'</td></tr><tr class="'+(gap==null?'':Math.abs(gap)<0.01?'okr':'badr2')+'"><td>Difference</td><td class="n">'+(gap==null?'':Math.abs(gap)<0.01?'Reconciled ✓':rcMoney(gap))+'</td></tr>':'')+'</table></div>'
  +'<div class="toolbar"><input class="sq" style="flex:1;min-width:200px;margin:0" placeholder="Search narration, reference or amount..." value="'+E(RCS.q)+'" oninput="rcQ(this.value)"><button onclick="rcXls()">Download Excel</button></div><div id="rcl">'+rcTable()+'</div>'}
function rcTable(){const X=RCS.R,q=RCS.q.toLowerCase();if(X.t=='gst'){
  const L=X.R.map((r,i)=>[r,i]).filter(([r,i])=>{const st=r.acc&&r.st=='probable'?'match':r.st;if(RCS.fl!='all'&&st!=RCS.fl&&r.st!=RCS.fl)return false;if(!q)return true;const o=r.b||r.g;return(o.inv+' '+o.gstin+' '+o.party+' '+(r.g?r.g.party:'')).toLowerCase().includes(q)});
  if(!L.length)return'<div class="card" style="text-align:center;padding:26px"><b>Nothing to show here</b></div>';
  const cell=(x,k)=>x?rcMoney(x[k]):'';
  return '<div class="rct-w"><table class="rctb"><tr><th>Status</th><th>'+(rcSl()?'Customer':'Supplier')+'</th><th>Invoice</th><th>Date</th><th class="n">Taxable (books)</th><th class="n">Taxable ('+(rcSl()?'GSTR-1':'2B')+')</th><th class="n">Tax (books)</th><th class="n">Tax ('+(rcSl()?'GSTR-1':'2B')+')</th><th>Note</th></tr>'
  +L.slice(0,1500).map(([r,i])=>{const o=r.b||r.g,st=r.acc&&r.st=='probable'?'match':r.st,l=RCL[st];
   const note=r.st=='mismatch'?r.diff.map(d=>d.l+' '+(d.x>0?'+':'')+rcMoney(d.x)).join(', '):r.why;
   return '<tr class="st-'+st+'"><td><span class="tag '+l[1]+'">'+l[0]+'</span></td><td><b>'+E(o.party||'')+'</b><br><small>'+E(o.gstin)+'</small></td><td>'+(r.b&&r.b.items&&r.b.items.length?'<a class="rcbka" onclick="rcBrk('+i+')" title="Show HSN lines">'+E(o.inv)+' ▾</a>':E(o.inv))+(r.b&&r.g&&r.b.inv!==r.g.inv?'<br><small>'+(rcSl()?'GSTR-1':'2B')+': '+E(r.g.inv)+'</small>':'')+'</td><td>'+fd(o.date)+'</td><td class="n">'+cell(r.b,'taxable')+'</td><td class="n">'+cell(r.g,'taxable')+'</td><td class="n">'+cell(r.b,'tax')+'</td><td class="n">'+cell(r.g,'tax')+'</td><td>'+E(note)+(r.st=='probable'?' <button class="g sm" onclick="rcAcc('+i+')">'+(r.acc?'Undo':'Accept')+'</button>':'')+(!rcSl()&&r.g&&r.g.itc&&/^n/i.test(r.g.itc)?' <span class="tag bad">ITC not available</span>':'')+'</td></tr>'+(r.b&&r.b.items&&r.b.items.length?'<tr class="rcbr" id="rcbr'+i+'" style="display:none"><td colspan="9">'+rcBrkHtml(r.b.items)+'</td></tr>':'')}).join('')+'</table></div>'+(L.length>1500?'<small>Showing the first 1500 rows. The Excel file has all of them.</small>':'')}
 const L=X.R.filter(r=>{if(RCS.fl!='all'&&r.st!=RCS.fl)return false;if(!q)return true;return[...r.books,...r.bank].map(x=>x.desc+' '+x.ref+' '+x.amt).join(' ').toLowerCase().includes(q)});
 if(!L.length)return'<div class="card" style="text-align:center;padding:26px"><b>Nothing to show here</b></div>';
 const nm={match:['Matched','ok'],bOnly:['In books only','warn'],kOnly:['In bank only','bad']};
 const part=a=>a.map(x=>'<div>'+fd(x.date)+' · <b>'+rcMoney(x.amt)+'</b><br><small>'+E((x.ref?x.ref+' · ':'')+x.desc).slice(0,90)+'</small></div>').join('');
 return '<div class="rct-w"><table class="rctb"><tr><th>Status</th><th>Books (Tally)</th><th>Bank statement</th><th>How / what to do</th></tr>'+L.slice(0,1500).map(r=>{const l=nm[r.st],a=r.books[0]||r.bank[0],todo=r.st=='match'?r.how:r.st=='bOnly'?(a.amt<0?'Cheque issued, not yet cleared':'Deposit not yet credited'):(a.amt<0?'Bank debit (charges, EMI?). Enter it in Tally':'Bank credit. Enter it in Tally');
  return '<tr class="st-'+r.st+'"><td><span class="tag '+l[1]+'">'+l[0]+'</span></td><td>'+part(r.books)+'</td><td>'+part(r.bank)+'</td><td>'+E(todo)+'</td></tr>'}).join('')+'</table></div>'}

/* ---------- Excel export ---------- */
function rcXls(){const X=RCS.R,nm=(RCS.client||'Reco').replace(/[^\w\- ]/g,'')+(X.t=='gst'?(rcSl()?'-GSTR1-Reco':'-GSTR2B-Reco'):'-Bank-Reco'),sh=[];
 if(X.t=='gst'){const S=X.S,W=rcSl()?'GSTR-1':'2B',hd=['Status',rcSl()?'Customer':'Supplier','GSTIN','Invoice (books)','Invoice ('+W+')','Date','Taxable (books)','Taxable ('+W+')','IGST (books)','IGST ('+W+')','CGST (books)','CGST ('+W+')','SGST (books)','SGST ('+W+')','Tax (books)','Tax ('+W+')','Note'];
  const row=r=>{const o=r.b||r.g,st=r.acc&&r.st=='probable'?'match':r.st,b=r.b||{},g=r.g||{};return[RCL[st][0],o.party||'',o.gstin,b.inv||'',g.inv||'',o.date,b.taxable??'',g.taxable??'',b.igst??'',g.igst??'',b.cgst??'',g.cgst??'',b.sgst??'',g.sgst??'',b.tax??'',g.tax??'',r.st=='mismatch'?r.diff.map(d=>d.l+' '+d.x).join('; '):r.why]};
  sh.push(['Summary',[[rcSl()?'GSTR-1 vs Sales register':'GSTR-2B vs Purchase register'],['Client',rcClientLine()],['Run on',new Date().toLocaleString('en-IN')],[],['Matched',S.match],['Value mismatch',S.mismatch],['Probable match',S.probable],[RCL['missG'][0],S.missG],[RCL['missB'][0],S.missB],[],[rcSl()?'Tax as per books':'ITC as per books',S.itcB],[rcSl()?'Tax as per GSTR-1':'ITC as per GSTR-2B',S.itcG],[rcSl()?'In books, not in GSTR-1':'ITC at risk',S.risk],[rcSl()?'In GSTR-1, not in books':'ITC available, not booked',S.extra]]]);
  [['Matched',r=>(r.acc&&r.st=='probable')||r.st=='match'],['Mismatch',r=>r.st=='mismatch'],['Probable',r=>r.st=='probable'&&!r.acc],[rcSl()?'Not in GSTR-1':'Not in 2B',r=>r.st=='missG'],['Not in books',r=>r.st=='missB']].forEach(([n,f])=>sh.push([n,[hd].concat(X.R.filter(f).map(row))]));
  const V={};X.R.forEach(r=>{const o=r.b||r.g,k=o.gstin||o.party;const v=V[k]=V[k]||{p:o.party||'',g:o.gstin,b:0,n:0,m:0,x:0};if(r.b)v.b+=r.b.tax;if(r.g)v.n+=r.g.tax;if(r.st=='missG')v.m++;if(r.st=='missB'||r.st=='mismatch')v.x++});
  sh.push([rcSl()?'Customer-wise':'Supplier-wise',[[rcSl()?'Customer':'Supplier','GSTIN','Tax books','Tax '+W,'Difference','Invoices not in '+W,'Invoices to check']].concat(Object.values(V).sort((a,b)=>Math.abs(b.b-b.n)-Math.abs(a.b-a.n)).map(v=>[v.p,v.g,rcR(v.b),rcR(v.n),rcR(v.b-v.n),v.m,v.x]))])}
 else{const S=X.S,hd=['Status','Date (books)','Narration (books)','Ref (books)','Amount (books)','Date (bank)','Narration (bank)','Ref (bank)','Amount (bank)','How'];
  const row=r=>{const b=r.books[0]||{},k=r.bank[0]||{};return[r.st=='match'?'Matched':r.st=='bOnly'?'In books only':'In bank only',b.date||'',b.desc||'',b.ref||'',r.books.length?r.books.reduce((s,x)=>s+x.amt,0):'',k.date||'',k.desc||'',k.ref||'',r.bank.length?r.bank.reduce((s,x)=>s+x.amt,0):'',r.how||(r.st=='bOnly'?(b.amt<0?'Cheque issued, not cleared':'Deposit not credited'):r.st=='kOnly'?'Enter in Tally':'')]};
  sh.push(['BRS',[['Bank reconciliation statement'],[],['Balance as per books',RCS.bk===''||RCS.bk==null?'':+RCS.bk],['Add: credited by bank, not in books',S.knIn],['Less: debited by bank, not in books',-S.knOut],['Add: cheques issued, not cleared',S.bkOut],['Less: deposits not yet credited',-S.bkIn],['Balance as per bank (calculated)',S.calc??''],['Balance as per bank statement',S.bank??''],['Difference',S.gap??'']]]);
  [['Matched',r=>r.st=='match'],['In books only',r=>r.st=='bOnly'],['In bank only',r=>r.st=='kOnly']].forEach(([n,f])=>sh.push([n,[hd].concat(X.R.filter(f).map(row))]))}
 if(window.XLSX){const wb=XLSX.utils.book_new();sh.forEach(([n,a])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(a),n));XLSX.writeFile(wb,nm+'.xlsx')}
 else{const q=a=>a.map(r=>r.map(x=>'"'+String(x==null?'':x).replace(/"/g,'""')+'"').join(',')).join('\r\n');dl(nm+'.csv',sh.map(([n,a])=>'## '+n+'\r\n'+q(a)).join('\r\n\r\n'),'text/csv')}}
