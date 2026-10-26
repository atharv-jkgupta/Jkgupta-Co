/* Bills to Excel: reads bills (Excel, PDF, image), lets you check them, and writes the register in the INDIA TRADING layout */
const BXH=['DATE','BILL NO','PARTY NAME','GSTIN NO','HSN CODE','QTY','UNIT','TAXABLE AMT','IGST RATE','IGST AMT','CGST RATE','CGST AMT','SGST RATE','SGST AMT','TOTAL'];
const BXGS=/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g;
const bxN=x=>{const n=parseFloat(String(x==null?'':x).replace(/[,\s₹]/g,''));return isNaN(n)?0:n};
const bxC=s=>String(s==null?'':s).replace(/\s+/g,' ').trim();
const bxR2=x=>Math.round(x*100)/100;
function bxGstOk(g){g=String(g||'').trim().toUpperCase();if(!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g))return false;const C='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';let s=0;for(let i=0;i<14;i++){const q=C.indexOf(g[i])*(i%2?2:1);s+=Math.floor(q/36)+q%36}return C[(36-s%36)%36]==g[14]}
const bxLoc=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function bxDate(s){s=bxC(s);let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;return y+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0')}return /^\d{4}-\d\d-\d\d$/.test(s)?s:''}
const BXU={SQM:'SQM',SFT:'SFT',SQFT:'SFT',LTR:'LTR',LTRS:'LTR',LITRE:'LTR',LITRES:'LTR',ROLL:'ROLL',ROLLS:'ROLL',BAG:'BAG',BAGS:'BAG',BOX:'BOX',BOXES:'BOX',NOS:'NOS',NO:'NOS',PCS:'NOS',PC:'NOS',MTR:'MTR',MTRS:'MTR',KG:'KG',KGS:'KG',OTH:'OTH',LS:'LS',LUMPSUM:'LS',SET:'SET',SETS:'SET',JOB:'JOB'};
function bxUnit(u){u=bxC(u);if(!u)return'';const k=u.toUpperCase().replace(/[^A-Z]/g,'');if(BXU[k])return BXU[k];const s=u.replace(/s$/i,'');return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase()}

/* ---------- reading a bill from rows of text (works for Excel cells, PDF lines and scanned text) ---------- */
function bxFromRows(rows,ownG){
 const R=rows.map(r=>(Array.isArray(r)?r:[r]).map(x=>bxC(String(x==null?'':x).replace(/\r?\n/g,'\u0001'))).filter(x=>x!==''&&x!=='\u0001')).filter(r=>r.length),L=R.map(r=>r.join('  ').replace(/\u0001/g,' ')),B={no:'',date:'',party:'',gstin:'',items:[],printed_total:null,warn:[]};
 const own=String(ownG||'').toUpperCase();
 const li=L.findIndex(l=>/invoice\s*no/i.test(l));
 if(li>=0){const m=L[li].match(/invoice\s*no\.?\s*[:;\-\s]*([A-Za-z0-9][A-Za-z0-9\/\-]*)/i);if(m)B.no=m[1];
  for(let k=li;k<=li+1&&k<L.length&&!B.date;k++){const m2=L[k].match(/date\s*[:;]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i);if(m2)B.date=bxDate(m2[1])}}
 if(!B.date){for(let k=0;k<Math.min(L.length,14)&&!B.date;k++){const m=L[k].match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);if(m)B.date=bxDate(m[1])}}
 const bi=L.findIndex(l=>/^\s*(buyer|bill(ed)?\s*to|customer|party|m\/s)\b/i.test(l));
 if(bi>=0){let t=R[bi];let name='';const ix=t.findIndex(c=>/^(buyer|bill(ed)?\s*to|customer|party|m\/s)\s*[:;\-]*$/i.test(c));
  if(ix>=0&&t[ix+1])name=t[ix+1];else name=t.join(' ').replace(/^\s*(buyer|bill(ed)?\s*to|customer|party|m\/s)\s*[:;\-]*\s*/i,'');
  name=name.split('\u0001')[0];name=name.split(/ship\s*to/i)[0];name=name.split(/\bgstin\b/i)[0];
  if(!name||/^\d+[\/,\-\s]|\b(estate|road|marg|nagar|naka|plot|flat|floor|street|society|building|chs|apartment)\b/i.test(name)){let j=bi-1,top=-1;while(j>=0&&!/mame|udyam|e\s*way|tax\s*invoice|original|duplicate|triplicate|invoice\s*no|challan|order\s*no|despatch|vehicle|l\.r\.|^\s*gstin\s+\d|e-mail|office|godown/i.test(L[j])){top=j;j--}if(top>=0)name=R[top][0].split('\u0001')[0];else if(!name&&R[bi+1])name=R[bi+1][0]}
  B.party=bxC(name.replace(/\u0001/g,' '))}
 const ba=L.findIndex(l=>/^\s*billing\s*address/i.test(l));
 if(!B.party&&ba>=0&&R[ba+1]){let nm=bxC(R[ba+1][0].split('\u0001')[0]);const w=nm.split(' ').slice(0,2).join(' '),i2=w?nm.indexOf(w,1):-1;if(i2>0)nm=nm.slice(0,i2).trim();B.party=nm}
 const from=bi>=0?bi:(ba>=0?ba:0);let g=(L.slice(from,from+8).join(' ').match(BXGS)||[]).filter(x=>x!=own);if(!g.length)g=(L.join(' ').match(BXGS)||[]).filter(x=>x!=own);B.gstin=g[0]||'';B.kind='sales';
 if(own){const all=L.join(' ').toUpperCase();
  if(!all.includes(own))B.warn.push('Your client\'s GSTIN ('+own+') is not on this bill. Check that you picked the right client sheet.');
  else if((bi>=0||ba>=0)&&L.slice(from,from+8).join(' ').toUpperCase().includes(own)){B.kind='purchase';let sup='';
   for(let k=0;k<Math.min(L.length,12);k++){if(/tax\s*invoice|invoice\s*no|bill\s*of\s*supply/i.test(L[k]))break;const c=R[k][0].split('\u0001')[0];if(/[A-Za-z]{3}/.test(c)&&!/mob|tel|phone|e-?mail|gstin|gst\s*no|original|duplicate|triplicate|www\.|@|^\s*(office|godown)/i.test(c)){sup=bxC(c);break}}
   if(sup)B.party=sup;B.warn.push('This is a PURCHASE bill (your client is the buyer). The supplier name '+(sup?'was taken from the top of the bill':'could not be found')+' - please check it.')}}
 const hi=L.findIndex(l=>/hsn/i.test(l)&&/(qty|quantity)/i.test(l));let ti=-1;
 if(hi>=0){ti=L.findIndex((l,k)=>k>hi&&/^\s*total\b/i.test(l));if(ti<0)ti=L.length}
 if(hi>=0){let last=null;
  for(let k=hi+1;k<ti;k++){const tok=R[k].join(' ').replace(/\u0001/g,' ').split(/\s+/).filter(Boolean);
   let hx=tok.findIndex(t=>/^\d{6}$|^\d{8}$/.test(t));if(hx<0){hx=tok.findIndex((t,j)=>/^\d{4}$/.test(t)&&j>0&&tok.slice(0,j).some(x=>/[A-Za-z]/.test(x)))}
   if(hx>=0){const rest=tok.slice(hx+1);let qi=rest.findIndex(t=>/^[\d,]+(\.\d+)?$/.test(t));let qty=0,unit='',nums=[];
    if(qi>=0){qty=bxN(rest[qi]);const after=rest.slice(qi+1);const ui=after.findIndex(t=>/^[A-Za-z]+\.?$/.test(t));if(ui>=0)unit=after[ui];nums=after.filter(t=>/^[\d,]+(\.\d+)?$/.test(t)).map(bxN)}
    let amt=nums.length?nums[nums.length-1]:0,rate=nums.length>1?nums[nums.length-2]:(nums.length?nums[0]:0);if(!amt&&qty&&rate)amt=bxR2(qty*rate);
    last={hsn:tok[hx],qty,unit:bxUnit(unit),taxable:bxR2(amt),igst:0,cgst:0,sgst:0,desc:tok.slice(0,hx).join(' ').replace(/^\d+\s+/,'')};B.items.push(last)}
   else if(last&&!last.pack){const cs=R[k].map(c=>c.replace(/\u0001/g,' ').match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)\.?$/)).filter(Boolean);if(cs.length)last.pack={qty:+cs[cs.length-1][1],unit:cs[cs.length-1][2]}}
  }
  B.items.forEach(it=>{if(it.pack){it.qty=it.pack.qty;it.unit=bxUnit(it.pack.unit);delete it.pack}})}
 if(hi<0){const h2=L.findIndex(l=>/\bitem\b/i.test(l)&&/\bqty\b/i.test(l)&&/\b(amount|total)\b/i.test(l));
  if(h2>=0){ti=L.findIndex((l,k)=>k>h2&&/^\s*total\b/i.test(l));if(ti<0)ti=L.length;const names=[];
   for(let k=h2+1;k<ti;k++){const tok=R[k].join(' ').replace(/\u0001/g,' ').split(/\s+/).filter(Boolean);
    const qi=tok.findIndex((t,j)=>/^[\d,]+(\.\d+)?$/.test(t)&&/^[A-Za-z]+\.?$/.test(tok[j+1]||'')&&tok.slice(j+2).some(x=>/^[\d,]+(\.\d+)?$/.test(x)));
    if(qi>=0){const nums=tok.slice(qi+2).filter(t=>/^[\d,]+(\.\d+)?$/.test(t)).map(bxN);B.items.push({hsn:'',qty:bxN(tok[qi]),unit:bxUnit(tok[qi+1]),taxable:bxR2(nums[nums.length-1]),igst:0,cgst:0,sgst:0,desc:names.join(', ')});names.length=0}
    else{const nm=tok.join(' ').replace(/^\d+\s+/,'');if(nm&&/[A-Za-z]/.test(nm))names.push(nm)}}
   if(B.items.length)B.warn.push('This bill has no HSN / SAC code. Please type it for each item.')}}
 const rt={};L.forEach(l=>{const re=/(CGST|SGST|IGST|UTGST)[^\d%\n]{0,24}?(\d+(?:\.\d+)?)\s*%/gi;let m;while((m=re.exec(l))){const k=m[1].toUpperCase()=='UTGST'?'SGST':m[1].toUpperCase();(rt[k]=rt[k]||new Set()).add(+m[2]/100)}});
 const one=k=>rt[k]&&rt[k].size==1?[...rt[k]][0]:(rt[k]&&rt[k].size>1?-1:0);
 const c=one('CGST'),s=one('SGST'),ig=one('IGST');
 if(c<0||s<0||ig<0)B.warn.push('This bill has more than one tax rate. Please set the rate on each item.');
 B.items.forEach(it=>{it.cgst=Math.max(c,0);it.sgst=Math.max(s,0);it.igst=Math.max(ig,0)});
 for(let k=L.length-1;k>=0;k--){const m=L[k].match(/^\s*(?:grand\s*)?total\s*(?:amount)?\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)\s*$/i);if(m&&k>ti){B.printed_total=bxN(m[1]);break}}
 if(!B.no)B.warn.push('Bill number not found.');if(!B.date)B.warn.push('Date not found.');if(!B.party)B.warn.push('Party name not found.');if(!B.items.length)B.warn.push('No item lines found.');
 return B}

/* ---------- reading files ---------- */
async function bxZip(){if(!window.JSZip)await loadJs('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');return window.JSZip}
async function bxXlsxLib(){if(!window.XLSX)await loadJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');return window.XLSX}
async function bxLines(P){const L=[];P.forEach(pg=>{const ln=[];pg.forEach(i=>{let l=ln.find(o=>Math.abs(o.y-i.y)<=3);if(!l)ln.push(l={y:i.y,it:[]});l.it.push(i)});ln.sort((a,b)=>b.y-a.y).forEach(l=>{l.it.sort((a,b)=>a.x-b.x);const out=[];l.it.forEach(i=>{const q=out[out.length-1];if(q&&i.x-q.r<6){q.t+=' '+i.t;q.r=i.x+i.w}else out.push({t:i.t,r:i.x+i.w})});L.push(out.map(o=>o.t))})});return L}
async function bxPdfPages(buf){const B='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
 if(!window.pdfjsLib){await loadJs(B+'pdf.min.js');const w=await(await fetch(B+'pdf.worker.min.js')).text();pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([w],{type:'text/javascript'}))}
 const pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise,P=[];
 for(let n=1;n<=pdf.numPages;n++){const tc=await(await pdf.getPage(n)).getTextContent();P.push(tc.items.filter(i=>i.str.trim()).map(i=>({x:i.transform[4],y:Math.round(i.transform[5]),w:i.width,t:i.str.trim()})))}
 return{pdf,P}}
async function bxFileRows(f){const nm=f.name.toLowerCase();
 if(/\.(xlsx|xlsm|xls|csv)$/.test(nm)){const X=await bxXlsxLib(),wb=X.read(new Uint8Array(await f.arrayBuffer()),{type:'array',cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]];
  return X.utils.sheet_to_json(ws,{header:1,raw:true,defval:'',blankrows:false}).map(r=>r.map(x=>x instanceof Date?bxLoc(x):x))}
 if(/\.pdf$/.test(nm)){const {pdf,P}=await bxPdfPages(await f.arrayBuffer());if(P.some(x=>x.length))return bxLines(P);
  return bxOcr(Array.from({length:pdf.numPages},(_,k)=>async()=>{const pg=await pdf.getPage(k+1),vp=pg.getViewport({scale:2.5}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;return c}))}
 if(/\.(png|jpe?g|webp|bmp)$/.test(nm))return bxOcr([()=>imgCanvas(f)]);
 throw new Error('This file type is not supported. Use Excel, PDF or an image.')}
async function bxOcr(cvs){if(!window.Tesseract)await loadJs('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
 const me=document.getElementById('bxmsg'),w=await Tesseract.createWorker('eng'),P=[];await w.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
 try{for(let n=0;n<cvs.length;n++){if(me)me.textContent='Scanned file: reading page '+(n+1)+' of '+cvs.length+' (5 to 10 seconds a page)…';const c=await cvs[n]();if(typeof cleanCv=='function')cleanCv(c);const r=await w.recognize(c);P.push(ocrItems(r.data.words,595/c.width))}}finally{await w.terminate()}
 return bxLines(P)}
async function bxAi(rows,sheet){if(!(window.LS&&LS.on&&LS.token))return null;
 const txt=rows.map(r=>(Array.isArray(r)?r:[r]).map(bxC).filter(Boolean).join(' | ')).filter(Boolean).join('\n').slice(0,5500);
 const q='Read this sales bill text and reply with ONLY one JSON object, no other words. The seller is '+(sheet.company||'')+' (GSTIN '+(sheet.gstin||'')+'); I need the CUSTOMER (buyer). Use exactly: {"no":"invoice number","date":"YYYY-MM-DD","party":"buyer name","gstin":"buyer GSTIN or empty","items":[{"hsn":"digits","qty":number,"unit":"unit","taxable":number,"cgst":number,"sgst":number,"igst":number}],"total":number}. cgst, sgst and igst are the tax RATES in percent (for example 9). taxable is the line amount before tax. If a line has a packing line like "3 Rolls", use that qty and unit. Never guess: use empty string or 0 when unreadable.\n\n'+txt;
 try{const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','x-token':LS.token},body:JSON.stringify({messages:[{role:'user',content:q}]})});const j=await r.json();if(!j.reply)return null;
  const m=j.reply.match(/\{[\s\S]*\}/);if(!m)return null;const o=JSON.parse(m[0]);
  return{no:bxC(o.no),date:bxDate(o.date),party:bxC(o.party),gstin:bxC(o.gstin).toUpperCase(),printed_total:o.total?+o.total:null,warn:['Read by AI. Please check every figure against the bill.'],
   items:(o.items||[]).map(i=>({hsn:String(i.hsn||'').replace(/\D/g,''),qty:+i.qty||0,unit:bxUnit(i.unit),taxable:bxR2(+i.taxable||0),igst:(+i.igst||0)/100,cgst:(+i.cgst||0)/100,sgst:(+i.sgst||0)/100}))}}catch(e){return null}}

/* ---------- checks (same rules as the sheet kit) ---------- */
function bxFig(b){let t=0,ig=0,cg=0,sg=0;b.items.forEach(i=>{t+=i.taxable;ig+=i.taxable*(i.igst||0);cg+=i.taxable*(i.cgst||0);sg+=i.taxable*(i.sgst||0)});return[t,ig,cg,sg,t+ig+cg+sg]}
function bxCheck(sheet,bills){const W=[],seen={};(sheet.bills||[]).forEach(b=>seen[b.no]=1);const own=String(sheet.gstin||'').slice(0,2);
 bills.forEach(b=>{const add=(p,f)=>W.push({bill:b.no||'(no number)',party:b.party,problem:p,fix:f});
  if(b.no&&seen[b.no])add('This bill number is already in the sheet.','Check whether it is a repeat. Remove it, or correct the number.');if(b.no)seen[b.no]=1;
  const g=b.gstin;if(g&&!bxGstOk(g))add('GSTIN '+g+' is not valid (format or check character).','Re-read the GSTIN from the bill. A letter O and a zero 0 are often mixed up.');
  if(!g)add('No GSTIN.','Fine for a customer without registration. Otherwise add it from the bill.');
  if(!b.items.length)add('No item lines.','Add at least one item with HSN and taxable value.');
  b.items.forEach(i=>{const h=String(i.hsn);if(!/^\d+$/.test(h)||![4,6,8].includes(h.length))add('HSN/SAC "'+h+'" should be 4, 6 or 8 digits.','Check the HSN printed on the bill.');
   if(!(i.taxable>0))add('Taxable value is zero or negative on HSN '+h+'.','Re-check the amount on the bill.');
   const t=(i.igst||0)+(i.cgst||0)+(i.sgst||0);if(t&&![.05,.12,.18,.28].some(x=>Math.abs(t-x)<1e-9))add('Total GST rate '+(t*100).toFixed(1)+'% is not a standard slab (5/12/18/28).','Check the rate on the bill.');
   if(g&&bxGstOk(g)){const same=g.slice(0,2)==own;if(same&&i.igst)add('IGST charged but the customer is in the same state ('+g.slice(0,2)+').','Within the state it should be CGST + SGST.');if(!same&&(i.cgst||i.sgst))add('CGST/SGST charged but the customer state is '+g.slice(0,2)+' (other state).','Between states it should be IGST.')}
   if(Math.abs((i.cgst||0)-(i.sgst||0))>1e-9)add('CGST rate and SGST rate differ.','They are normally equal. Check the bill.')});
  if(b.printed_total!=null&&b.items.length){const calc=bxFig(b)[4];if(Math.abs(calc-b.printed_total)>1){b.flag=true;add('Printed bill total '+b.printed_total.toFixed(2)+' differs from the sheet total '+calc.toFixed(2)+'.','A difference under about 1 rupee is rounding. Otherwise check amounts, rates or a missing item. The total cell is highlighted yellow.')}}
 });return W}

/* ---------- writing the Excel file (same look and formulas as the INDIA TRADING sample) ---------- */
function bxSerial(iso){const m=String(iso||'').match(/^(\d{4})-(\d\d)-(\d\d)/);return m?Math.round((Date.UTC(+m[1],+m[2]-1,+m[3])-Date.UTC(1899,11,30))/864e5):null}
const bxX=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const BXL=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'];
function bxSheetXml(sh){
 const fonts=[],fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>'],borders=['<border><left/><right/><top/><bottom/><diagonal/></border>'],xfs=[],fmts={};let nf=164;
 const reg=(arr,x)=>{let i=arr.indexOf(x);if(i<0){arr.push(x);i=arr.length-1}return i};
 const fontX=(n,sz,b)=>'<font>'+(b?'<b/>':'')+'<sz val="'+sz+'"/><color theme="1"/><name val="'+n+'"/><family val="1"/></font>';
 const bd=(l,r,t,b)=>'<border>'+['left','right','top','bottom'].map((s,i)=>[l,r,t,b][i]?'<'+s+' style="thin"><color auto="1"/></'+s+'>':'<'+s+'/>').join('')+'<diagonal/></border>';
 const ACC='_ * #,##0.00_ ;_ * \\-#,##0.00_ ;_ * "-"??_ ;_ @_ ';
 const nfid=f=>f=='General'?0:f=='0%'?9:f=='mm-dd-yy'?14:f=='mmm-yy'?17:(fmts[f]||(fmts[f]=nf++));
 const S=(o)=>{o=Object.assign({f:'Calibri',sz:11,b:0,fill:0,bd:[1,1,1,1],nf:'General',h:'center',v:'center'},o);
  const fi=reg(fonts,fontX(o.f,o.sz,o.b)),fl=o.fill?reg(fills,'<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>'):0,bi=reg(borders,bd(...o.bd)),n=nfid(o.nf);
  return reg(xfs,'<xf numFmtId="'+n+'" fontId="'+fi+'" fillId="'+fl+'" borderId="'+bi+'" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="'+o.h+'" vertical="'+o.v+'"/></xf>')};
 reg(fonts,fontX('Calibri',11,0));reg(xfs,'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
 const rows=[];const cell=(r,c,v,st,kind,cached)=>{const ref=BXL[c-1]+r;if(kind=='f')return'<c r="'+ref+'" s="'+st+'"><f>'+bxX(v)+'</f>'+(cached==null?'':'<v>'+cached+'</v>')+'</c>';
  if(v==null||v==='')return'<c r="'+ref+'" s="'+st+'"/>';if(typeof v=='number')return'<c r="'+ref+'" s="'+st+'"><v>'+v+'</v></c>';return'<c r="'+ref+'" s="'+st+'" t="inlineStr"><is><t xml:space="preserve">'+bxX(v)+'</t></is></c>'};
 const mrg=['A1:O1','A2:O2','A3:O3'];
 // title rows
 const tr=(r,v,font,sz,nfm,topB,botB)=>{let x='';for(let c=1;c<=15;c++){const st=S({f:'Times New Roman',sz,b:1,bd:[c==1,c==15,topB,botB],nf:c==1?nfm:'General',v:'bottom'});x+=cell(r,c,c==1?v:null,st)}rows.push('<row r="'+r+'"'+(r==1?' ht="22.5" customHeight="1"':' ht="15.75" customHeight="1"')+'>'+x+'</row>')};
 tr(1,(sh.company||'')+(sh.kind=='purchase'?' - PURCHASE':''),  'x',18,'General',1,0);tr(2,sh.gstin||'','x',12,'General',0,0);
 {let x='';const ms=bxSerial(sh.month);for(let c=1;c<=15;c++){const st=S({f:'Times New Roman',sz:12,b:1,bd:[c==1,c==15,0,1],nf:c==1?'mmm-yy':'General',v:'bottom'});x+=cell(3,c,c==1?ms:null,st)}rows.push('<row r="3" ht="15.75" customHeight="1">'+x+'</row>')}
 {let x='';BXH.forEach((h,i)=>{x+=cell(4,i+1,h,S({b:(i==10||i==12)?0:1}))});rows.push('<row r="4">'+x+'</row>')}
 const sACC=S({nf:ACC,h:'right'}),sP=S({nf:'0%'}),sG=S({}),sD=S({nf:'mm-dd-yy'});
 const bB=S({b:1}),bD=S({b:1,nf:'mm-dd-yy'}),bP=S({b:1,nf:'0%'}),bA=S({b:1,nf:ACC,h:'right'}),bAY=S({b:1,nf:ACC,h:'right',fill:1});
 let r=5;const billRows=[];
 (sh.bills||[]).forEach(b=>{const first=r;let T=0,IG=0,CG=0,SG=0;
  b.items.forEach(it=>{const tx=+it.taxable||0,ig=+it.igst||0,cg=+it.cgst||0,sg=+it.sgst||0;let x='';
   x+=cell(r,1,null,sD)+cell(r,2,null,sG)+cell(r,3,null,sG)+cell(r,4,null,sG);const h=String(it.hsn||'').trim();x+=cell(r,5,/^\d+$/.test(h)?+h:h,sG);
   x+=cell(r,6,it.qty===''||it.qty==null?null:+it.qty,sG)+cell(r,7,it.unit||null,sG)+cell(r,8,tx,sACC);
   x+=cell(r,9,ig,sP)+cell(r,10,'H'+r+'*I'+r,sACC,'f',bxR2(tx*ig))+cell(r,11,cg,sP)+cell(r,12,'H'+r+'*K'+r,sACC,'f',bxR2(tx*cg))+cell(r,13,sg,sP)+cell(r,14,'H'+r+'*M'+r,sACC,'f',bxR2(tx*sg));
   x+=cell(r,15,'H'+r+'+J'+r+'+L'+r+'+N'+r,sACC,'f',bxR2(tx+tx*ig+tx*cg+tx*sg));rows.push('<row r="'+r+'">'+x+'</row>');T+=tx;IG+=tx*ig;CG+=tx*cg;SG+=tx*sg;r++});
  const last=r-1,fy=b.flag,a=fy?bAY:bA,sm=c=>'SUM('+c+first+':'+c+last+')';let x='';
  x+=cell(r,1,bxSerial(b.date),bD)+cell(r,2,b.no||'',bB)+cell(r,3,b.party||'',bB)+cell(r,4,b.gstin||'',bB);[5,6,7].forEach(c=>x+=cell(r,c,null,bB));
  x+=cell(r,8,sm('H'),a,'f',bxR2(T))+cell(r,9,null,bP)+cell(r,10,sm('J'),a,'f',bxR2(IG))+cell(r,11,null,bP)+cell(r,12,sm('L'),a,'f',bxR2(CG))+cell(r,13,null,bP)+cell(r,14,sm('N'),a,'f',bxR2(SG))+cell(r,15,'H'+r+'+J'+r+'+L'+r+'+N'+r,a,'f',bxR2(T+IG+CG+SG));
  rows.push('<row r="'+r+'">'+x+'</row>');billRows.push(r);r++});
 // grand total
 {let x='';const tl=S({f:'Times New Roman',sz:12,b:1,h:'left',v:'bottom'});x+=cell(r,1,'TOTAL',tl)+cell(r,2,null,tl)+cell(r,3,null,tl)+cell(r,4,null,tl);[5,6,7,9,11,13].forEach(c=>x+=cell(r,c,null,bB));
  const tot={8:0,10:0,12:0,14:0,15:0};(sh.bills||[]).forEach(b=>{const f=bxFig(b);tot[8]+=f[0];tot[10]+=f[1];tot[12]+=f[2];tot[14]+=f[3];tot[15]+=f[4]});
  [[8,'H'],[10,'J'],[12,'L'],[14,'N'],[15,'O']].forEach(([c,Lt])=>x+=cell(r,c,'SUMIF($B$5:$B$'+(r-1)+',"<>",'+Lt+'5:'+Lt+(r-1)+')',bA,'f',bxR2(tot[c])));
  rows.push('<row r="'+r+'">'+x+'</row>');mrg.push('A'+r+':D'+r)}
 const W=[14.43,12.71,36.71,20,10.14,6.71,8.14,13.43,9.86,11,10.43,11.71,10.29,11.57,12.57];
 const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:O'+r+'"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A5" sqref="A5"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>'+W.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>'+rows.join('')+'</sheetData><mergeCells count="'+mrg.length+'">'+mrg.map(m=>'<mergeCell ref="'+m+'"/>').join('')+'</mergeCells><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToHeight="0"/></worksheet>';
 const numFmts=Object.keys(fmts).map(k=>'<numFmt numFmtId="'+fmts[k]+'" formatCode="'+bxX(k)+'"/>').join('');
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+(numFmts?'<numFmts count="'+Object.keys(fmts).length+'">'+numFmts+'</numFmts>':'')+'<fonts count="'+fonts.length+'">'+fonts.join('')+'</fonts><fills count="'+fills.length+'">'+fills.join('')+'</fills><borders count="'+borders.length+'">'+borders.join('')+'</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="'+xfs.length+'">'+xfs.join('')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
 return{sheet,styles}}
async function bxXlsx(sh){const Z=await bxZip(),z=new Z(),{sheet,styles}=bxSheetXml(sh);
 z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
 z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 z.file('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24240" windowHeight="13020"/></bookViews><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">Sheet1!$4:$4</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
 z.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
 z.file('xl/styles.xml',styles);z.file('xl/worksheets/sheet1.xml',sheet);
 return z.generateAsync({type:'uint8array',compression:'DEFLATE'})}

/* ---------- reading a sheet made in this layout (to continue it) ---------- */
async function bxReadSheet(f){const X=await bxXlsxLib(),wb=X.read(new Uint8Array(await f.arrayBuffer()),{type:'array',cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]],
 g=X.utils.sheet_to_json(ws,{header:1,raw:true,defval:'',blankrows:true}),iso=x=>x instanceof Date?bxLoc(x):(typeof x=='number'&&x>20000?new Date(Date.UTC(1899,11,30)+x*864e5).toISOString().slice(0,10):bxDate(x));
 const sh={id:'s'+Date.now().toString(36),company:bxC(g[0]&&g[0][0]),gstin:bxC(g[1]&&g[1][0]).toUpperCase(),month:(iso(g[2]&&g[2][0])||'').slice(0,7)+'-01',bills:[]};if(/\s-\s*PURCHASE$/i.test(sh.company)){sh.company=sh.company.replace(/\s-\s*PURCHASE$/i,'');sh.kind='purchase'}let items=[];
 for(let i=4;i<g.length;i++){const r=g[i],a=r[0],b=r[1];if(typeof a=='string'&&/^total$/i.test(a.trim()))continue;
  if(b!==''&&b!=null){sh.bills.push({date:iso(a),no:bxC(b),party:bxC(r[2]),gstin:bxC(r[3]).toUpperCase(),items,flag:false,note:bxC(r[16])});items=[]}
  else if(r[7]!==''&&r[4]!==''&&typeof r[7]=='number'){const rt=c=>typeof r[c]=='number'?r[c]:0;items.push({hsn:String(r[4]).trim(),qty:r[5],unit:bxC(r[6]),taxable:r[7],igst:rt(8),cgst:rt(10),sgst:rt(12)})}}
 return sh}

/* ---------- storage ---------- */
function bxDb(){DB.bx=DB.bx||{sheets:[],cur:''};return DB.bx}
function bxCur(){const d=bxDb();return d.sheets.find(s=>s.id==d.cur)||null}
let BXP=[],BXW=[],BXBUSY=0;
/* ---------- page ---------- */
function bx(){CURP='bx';sb();tg(0);const dd=$id('dd');if(dd)dd.classList.remove('o');pgIn('bx');bxDraw()}
function bxMoney(x){return x.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
function bxDraw(){if(CURP!='bx')return;const d=bxDb(),s=bxCur();
 let h='<i data-pg="bx" hidden></i><div class="bx"><div class="gxh"><h2>Bills to Excel</h2><p>Upload your bills (Excel, PDF or a photo). Check what was read, then download the Excel register in your INDIA TRADING layout.</p></div>';
 h+='<div class="card"><b>Sheet</b><div class="bxr"><select id="bxs" onchange="bxPick(this.value)">'+(d.sheets.length?'':'<option value="">No sheet yet</option>')+d.sheets.map(x=>'<option value="'+E(x.id)+'"'+(x.id==d.cur?' selected':'')+'>'+E(x.company)+(x.kind=='purchase'?' · PURCHASE':'')+' · '+E((x.month||'').slice(0,7))+' ('+x.bills.length+' bills)</option>').join('')+'</select><button onclick="bxNew()">New sheet</button><label class="bxf">Continue from an Excel I made earlier<input type="file" accept=".xlsx,.xls" onchange="bxCont(this.files[0]);this.value=\'\'"></label>'+(s?'<button class="g" onclick="bxDelSheet()">Delete sheet</button>':'')+'</div></div>';
 if(!s)h+='<div class="card">Start with <b>New sheet</b> (company name, GSTIN and month), or continue a sheet from an Excel file you made earlier.</div>';
 else{const f=s.bills.reduce((a,b)=>{const z=bxFig(b);return[a[0]+z[0],a[1]+z[1]+z[2]+z[3],a[2]+z[4]]},[0,0,0]);
  h+='<div class="card"><b>'+E(s.company)+'</b> · '+E(s.gstin)+' · '+E((s.month||'').slice(0,7))+'<div class="bxs"><span>Bills <b>'+s.bills.length+'</b></span><span>Taxable <b>₹'+bxMoney(f[0])+'</b></span><span>GST <b>₹'+bxMoney(f[1])+'</b></span><span>Total <b>₹'+bxMoney(f[2])+'</b></span></div><div class="bxr"><button onclick="bxDown()"'+(s.bills.length?'':' disabled')+'>Download Excel</button><button class="g" onclick="bxList()">See bills in this sheet</button><button class="g" onclick="bxSet()">Change company / month</button></div></div>';
  h+='<div class="card"><b>Add bills</b><p style="margin:6px 0">Choose one or many files. Excel bills are read exactly; PDF and photo bills are read from their text, so check them below.</p><input type="file" id="bxin" multiple accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp" onchange="bxAdd(this.files)"><div id="bxmsg" class="bxm">'+(BXBUSY?'Reading…':'')+'</div></div>'}
 if(BXW.length)h+='<div class="card bxw"><b>Please check</b>'+BXW.map(w=>'<div class="bxwi"><b>'+E(w.bill)+'</b> '+E(w.party||'')+': '+E(w.problem)+'<br><small>What to do: '+E(w.fix)+'</small></div>').join('')+'</div>';
 BXP.forEach((b,i)=>h+=bxCard(b,i));
 if(BXP.length)h+='<div class="card"><button onclick="bxAll()">Add all '+BXP.length+' bills to the sheet</button> <button class="g" onclick="BXP=[];bxDraw()">Discard these</button></div>';
 h+='</div>';app.innerHTML=h}
function bxCard(b,i){const f=bxFig(b);
 const inp=(k,v,w,ph)=>'<input value="'+E(v==null?'':v)+'" style="width:'+w+'" placeholder="'+(ph||'')+'" oninput="bxEd('+i+',\''+k+'\',this.value)">';
 let h='<div class="card bxc"><div class="bxh"><b>'+E(b.src||'Bill')+'</b>'+(b.warn&&b.warn.length?'<span class="bxbad">'+b.warn.length+' to check</span>':'<span class="bxok">Read</span>')+'<select title="Sales or purchase bill" onchange="BXP['+i+'].kind=this.value;bxDraw()"><option value="sales"'+(b.kind=='purchase'?'':' selected')+'>Sales bill</option><option value="purchase"'+(b.kind=='purchase'?' selected':'')+'>Purchase bill</option></select><span class="sp"></span><button class="g sm" onclick="bxAi1('+i+')">Read with AI</button><button class="g sm" onclick="BXP.splice('+i+',1);bxDraw()">Remove</button></div>';
 if(b.warn&&b.warn.length)h+='<div class="bxwn">'+b.warn.map(E).join('<br>')+'</div>';
 h+='<div class="bxg"><label>Date'+inp('date',b.date,'9.5em','YYYY-MM-DD')+'</label><label>Bill no'+inp('no',b.no,'8em')+'</label><label>Party'+inp('party',b.party,'18em')+'</label><label>GSTIN'+inp('gstin',b.gstin,'12em')+'</label></div>';
 h+='<table class="bxt"><tr><th>HSN</th><th>Qty</th><th>Unit</th><th>Taxable ₹</th><th>CGST %</th><th>SGST %</th><th>IGST %</th><th></th></tr>'+b.items.map((it,j)=>'<tr>'+['hsn','qty','unit','taxable'].map(k=>'<td><input value="'+E(it[k]==null?'':it[k])+'" size="'+(k=='taxable'?9:k=='hsn'?9:5)+'" oninput="bxEdI('+i+','+j+',\''+k+'\',this.value)"></td>').join('')+['cgst','sgst','igst'].map(k=>'<td><input value="'+(+(((it[k]||0)*100).toFixed(2)))+'" size="4" oninput="bxEdR('+i+','+j+',\''+k+'\',this.value)"></td>').join('')+'<td><button class="g sm" onclick="BXP['+i+'].items.splice('+j+',1);bxDraw()">×</button></td></tr>').join('')+'</table>';
 h+='<div class="bxr"><button class="g sm" onclick="BXP['+i+'].items.push({hsn:\'\',qty:\'\',unit:\'\',taxable:0,igst:'+(b.items[0]?b.items[0].igst||0:0)+',cgst:'+(b.items[0]?b.items[0].cgst||0:0)+',sgst:'+(b.items[0]?b.items[0].sgst||0:0)+'});bxDraw()">+ Item</button><span class="sp"></span><span>Taxable ₹'+bxMoney(f[0])+' · Total ₹'+bxMoney(f[4])+(b.printed_total!=null?' · Bill says ₹'+bxMoney(b.printed_total):'')+'</span><button onclick="bxOne('+i+')">Add to sheet</button></div></div>';return h}
function bxEd(i,k,v){BXP[i][k]=k=='gstin'?v.toUpperCase().trim():v}
function bxEdI(i,j,k,v){BXP[i].items[j][k]=(k=='qty'||k=='taxable')?(v===''?'':bxN(v)):v}
function bxEdR(i,j,k,v){BXP[i].items[j][k]=bxN(v)/100}
function bxNew(){modal('<h3>New sheet</h3><label>Company name<input id="bxc" value=""></label><label>GSTIN of the company<input id="bxg" maxlength="15" style="text-transform:uppercase"></label><label>Month<input id="bxm" type="month" value="'+new Date().toISOString().slice(0,7)+'"></label><br><button onclick="bxMake()">Create</button><div id="bxe" style="color:#b45309"></div>')}
function bxMake(){const c=bxC($id('bxc').value),g=bxC($id('bxg').value).toUpperCase(),m=$id('bxm').value;if(!c)return $id('bxe').textContent='Type the company name.';if(g&&!bxGstOk(g))return $id('bxe').textContent='That GSTIN is not valid. Please check it.';
 const s={id:'s'+Date.now().toString(36),company:c,gstin:g,month:(m||new Date().toISOString().slice(0,7))+'-01',bills:[]};const d=bxDb();d.sheets.push(s);d.cur=s.id;save();modal();bxDraw()}
function bxSet(){const s=bxCur();if(!s)return;modal('<h3>Change sheet details</h3><label>Company name<input id="bxc" value="'+E(s.company)+'"></label><label>GSTIN<input id="bxg" maxlength="15" value="'+E(s.gstin)+'"></label><label>Month<input id="bxm" type="month" value="'+E((s.month||'').slice(0,7))+'"></label><br><button onclick="bxSet2()">Save</button><div id="bxe" style="color:#b45309"></div>')}
function bxSet2(){const s=bxCur(),g=bxC($id('bxg').value).toUpperCase();if(g&&!bxGstOk(g))return $id('bxe').textContent='That GSTIN is not valid.';s.company=bxC($id('bxc').value)||s.company;s.gstin=g;s.month=($id('bxm').value||(s.month||'').slice(0,7))+'-01';save();modal();bxDraw()}
function bxPick(v){bxDb().cur=v;BXP=[];BXW=[];save();bxDraw()}
function bxDelSheet(){const s=bxCur();if(!s||!confirm('Delete the sheet "'+s.company+'" with its '+s.bills.length+' bills? Download it first if you need it.'))return;const d=bxDb();d.sheets=d.sheets.filter(x=>x.id!=s.id);d.cur=d.sheets[0]?d.sheets[0].id:'';save();bxDraw()}
async function bxCont(f){if(!f)return;try{const s=await bxReadSheet(f);if(!s.bills.length&&!s.company)throw new Error('empty');const d=bxDb();d.sheets.push(s);d.cur=s.id;save();toast('Loaded '+s.bills.length+' bills from '+f.name);bxDraw()}catch(e){alert('I could not read that file as a sheet in this layout. Please pick the Excel file that this page made (or your INDIA TRADING sample).')}}
async function bxAdd(files){const s=bxCur();if(!s||!files.length)return;files=[...files];BXBUSY=1;const me=$id('bxmsg');
 for(let k=0;k<files.length;k++){const f=files[k];if(me)me.textContent='Reading '+(k+1)+' of '+files.length+': '+f.name;
  try{const rows=await bxFileRows(f);let b=bxFromRows(rows,s.gstin);b.src=f.name;b.rows=rows;
   if(!b.items.length||!b.party){const a=await bxAi(rows,s);if(a){a.src=f.name;a.rows=rows;b=a}}
   BXP.push(b)}
  catch(e){BXP.push({src:f.name,no:'',date:'',party:'',gstin:'',items:[],warn:['Could not read this file: '+(e&&e.message||e)+' You can type the bill in below.']})}}
 BXBUSY=0;bxDraw()}
async function bxAi1(i){const s=bxCur(),b=BXP[i];if(!b.rows)return alert('There is no text to read for this bill.');if(!(LS.on&&LS.token))return alert('The AI works only when you are signed in on the office server, and the admin has set it up.');
 const a=await bxAi(b.rows,s);if(!a)return alert('The AI could not read this bill (it may not be set up yet). Please type the details in.');a.src=b.src;a.rows=b.rows;BXP[i]=a;bxDraw()}
function bxClean(b){return{kind:b.kind=='purchase'?'purchase':'sales',date:bxDate(b.date)||b.date||'',no:bxC(b.no),party:bxC(b.party),gstin:bxC(b.gstin).toUpperCase(),printed_total:b.printed_total==null?null:b.printed_total,flag:!!b.flag,
 items:b.items.map(i=>({hsn:String(i.hsn||'').trim(),qty:i.qty===''?'':+i.qty,unit:bxC(i.unit),taxable:bxR2(+i.taxable||0),igst:+i.igst||0,cgst:+i.cgst||0,sgst:+i.sgst||0}))}}
function bxPush(idx){const s0=bxCur(),L=idx.map(i=>bxClean(BXP[i])),d=bxDb(),mine=s0.kind=='purchase'?'purchase':'sales';BXW=[];let ns=0,np=0;
 const want=k=>{if(k==mine)return s0;let t=d.sheets.find(x=>(x.kind=='purchase'?'purchase':'sales')==k&&x.company==s0.company&&x.gstin==s0.gstin&&x.month==s0.month);if(!t){t={id:'s'+Date.now().toString(36)+k[0],company:s0.company,gstin:s0.gstin,month:s0.month,bills:[]};if(k=='purchase')t.kind='purchase';d.sheets.push(t)}return t};
 ['sales','purchase'].forEach(k=>{const G=L.filter(b=>b.kind==k);if(!G.length)return;const t=want(k);BXW=BXW.concat(bxCheck(t,G));G.forEach(b=>t.bills.push(b));t.updated=new Date().toISOString();if(k=='sales')ns=G.length;else np=G.length});
 BXP=BXP.filter((_,i)=>!idx.includes(i));save();bxDraw();toast('Added '+L.length+' bill'+(L.length>1?'s':'')+(np&&ns?' ('+ns+' sales, '+np+' purchase)':np?' to the Purchase sheet':' to the sheet')+'.')}
function bxOne(i){bxPush([i])}
function bxAll(){bxPush(BXP.map((_,i)=>i))}
function bxList(){const s=bxCur();modal('<h3>Bills in this sheet</h3><div style="max-height:60vh;overflow:auto"><table class="bxt"><tr><th>Date</th><th>No</th><th>Party</th><th>Taxable</th><th>Total</th><th></th></tr>'+s.bills.map((b,i)=>{const f=bxFig(b);return'<tr><td>'+E(b.date)+'</td><td>'+E(b.no)+'</td><td>'+E(b.party)+'</td><td>'+bxMoney(f[0])+'</td><td>'+bxMoney(f[4])+(b.flag?' ⚠':'')+'</td><td><button class="g sm" onclick="bxRm('+i+')">Remove</button></td></tr>'}).join('')+'</table></div>')}
function bxRm(i){const s=bxCur();if(!confirm('Remove bill '+s.bills[i].no+' from the sheet?'))return;s.bills.splice(i,1);save();bxList();bxDraw()}
async function bxDown(){const s=bxCur();if(!s)return;try{const u=await bxXlsx(s),nm=(s.company||'Sheet').replace(/[^A-Za-z0-9]+/g,'_')+(s.kind=='purchase'?'_Purchase':'')+'_'+(s.month||'').slice(0,7)+'.xlsx',a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([u],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=nm;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)}catch(e){alert('Could not make the Excel file: '+(e&&e.message||e))}}
(function(){const o=window.sb;if(typeof o!='function')return;window.sb=function(){o.apply(this,arguments);try{if(!USER)return;const el=document.getElementById('sb');if(!el||el.querySelector('.bxl'))return;const a=[...el.querySelectorAll('a.li')].find(x=>/Reco/.test(x.textContent));
 const h='<a class="li bxl'+(CURP=='bx'?' act':'')+'" onclick="bx()"><span>Bills → Excel</span></a>';if(a)a.insertAdjacentHTML('afterend',h);else el.insertAdjacentHTML('beforeend',h)}catch(e){}}})();
