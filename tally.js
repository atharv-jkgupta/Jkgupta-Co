
/* ====================================================================
   IMPORT FROM TALLY  -  ledger names and bank accounts from a Tally
   export (Excel or XML), so nothing has to be typed by hand
   ==================================================================== */
const TLS={P:null,new:false};
const TL_BANKG=/^(bank\s*accounts?|bank\s*o\/?d.*|bank\s*occ.*|bank\s*od.*|bank\s*overdraft.*|cash\/bank.*|banks?)$/i;
const TL_BANKN=/\bbank\b|\b(hdfc|sbi|icici|axis|kotak|pnb|bob|canara|idfc|yes|indusind|federal|bandhan|uco|iob|boi|rbl|dcb|baroda|punjab|union|central|indian)\b/i;
const tlClean=s=>String(s==null?'':s).replace(/[   ]/g,' ').replace(/\s+/g,' ').trim();
function tlText(buf){const u=new Uint8Array(buf);let t;
 if(u[0]==0xFF&&u[1]==0xFE)t=new TextDecoder('utf-16le').decode(u.subarray(2));
 else if(u[0]==0xFE&&u[1]==0xFF)t=new TextDecoder('utf-16be').decode(u.subarray(2));
 else if(u.length>3&&u[1]==0&&u[3]==0)t=new TextDecoder('utf-16le').decode(u);
 else t=new TextDecoder('utf-8').decode(u);
 /* Tally writes control characters as &#4; which XML parsers reject */
 return t.replace(/^﻿/,'').replace(/&#(\d+);/g,(m,n)=>(+n<32&&n!=9&&n!=10&&n!=13)?'':m).replace(/&#x([0-9a-f]+);/gi,(m,h)=>(parseInt(h,16)<32&&![9,10,13].includes(parseInt(h,16)))?'':m).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')}
const tlRawName=s=>{s=String(s==null?'':s);return tlClean(s)?s:''};
function tlXml(t){t=t.replace(/(<LEDGER\b[^>]*?\sNAME=")([^"]*)(")/g,(m,a,b,c)=>a+b.replace(/\r/g,'&#13;').replace(/\n/g,'&#10;').replace(/\t/g,'&#9;')+c);const d=new DOMParser().parseFromString(t,'text/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('This XML file could not be read. Export again from Tally as XML (Data Interchange) or Excel.');
 const out=[],first=(el,tags)=>{for(const g of tags){const x=el.getElementsByTagName(g)[0];if(x&&tlClean(x.textContent))return tlClean(x.textContent)}return''};
 [...d.getElementsByTagName('LEDGER')].forEach(l=>{let name=tlRawName(l.getAttribute('NAME'));if(!name){const nl=l.getElementsByTagName('NAME')[0];name=nl?tlRawName(nl.textContent):''}if(!name)return;
  const parent=first(l,['PARENT']),ob=first(l,['OPENINGBALANCE']),ac=first(l,['BANKACCOUNTNUMBER','ACCOUNTNUMBER','ACCOUNTNO']),ifsc=first(l,['IFSCODE','IFSCCODE','IFSC']),bn=first(l,['BANKNAME','BANKINGCONFIGBANK']);
  out.push({name,group:parent,no:ac,ifsc,bank:bn,ob})});
 let co='';const c1=d.getElementsByTagName('SVCURRENTCOMPANY')[0]||d.getElementsByTagName('CURRENTCOMPANY')[0];if(c1)co=tlClean(c1.textContent);
 if(!co){const c2=d.getElementsByTagName('COMPANY')[0];if(c2){const n=c2.getElementsByTagName('NAME')[0];co=tlClean(c2.getAttribute('NAME')||(n&&n.textContent)||'')}}
 return{ledgers:out,company:co,hasGroup:out.some(x=>x.group)}}
/* Excel / CSV: either Name + Under columns, or one column with the groups and ledgers indented under them */
function tlRows(rows){const NAMEH=/^(name|ledger name|ledger|particulars|account name|name of ledger|name of master)$/i,GRPH=/^(under|parent|group|group name|primary group|under group)$/i;
 let hi=-1,ni=-1,gi=-1,ai=-1,ii=-1,bi=-1;
 for(let i=0;i<Math.min(rows.length,30);i++){const r=(rows[i]||[]).map(tlClean);const n=r.findIndex(c=>NAMEH.test(c));if(n>=0){hi=i;ni=n;gi=r.findIndex(c=>GRPH.test(c));ai=r.findIndex(c=>/account\s*(no|number)|a\/c\s*no/i.test(c));ii=r.findIndex(c=>/ifsc/i.test(c));bi=r.findIndex(c=>/^bank\s*name$/i.test(c));break}}
 if(hi<0){/* no heading: use column A below any title rows */hi=0;ni=0;let k=rows.findIndex(r=>tlClean((r||[])[0]));hi=Math.max(0,k-1)}
 const out=[];
 if(gi>=0){for(let i=hi+1;i<rows.length;i++){const r=rows[i]||[],name=tlClean(r[ni]);if(!name||/^(grand total|total)$/i.test(name))continue;out.push({name,group:tlClean(r[gi]),no:ai>=0?tlClean(r[ai]):'',ifsc:ii>=0?tlClean(r[ii]):'',bank:bi>=0?tlClean(r[bi]):''})}
  return{ledgers:out,hasGroup:true}}
 /* hierarchy by indentation */
 const raw=[];for(let i=hi+1;i<rows.length;i++){const c=(rows[i]||[])[ni];const s=String(c==null?'':c).replace(/[   ]/g,' ');const name=tlClean(s);if(!name||/^(grand total|total|opening balance|closing balance)$/i.test(name))continue;raw.push({name,ind:s.length-s.replace(/^\s+/,'').length,row:rows[i]||[]})}
 const inds=[...new Set(raw.map(x=>x.ind))].sort((a,b)=>a-b);
 if(inds.length>1){const st=[];raw.forEach(x=>{while(st.length&&st[st.length-1].ind>=x.ind)st.pop();const isLeafLike=true;out.push({name:x.name,group:st.length?st[st.length-1].name:'',no:'',ifsc:'',bank:'',ind:x.ind});st.push(x)});
  /* a row that has children is a group, not a ledger */
  const par=new Set(out.map(x=>x.group));const led=out.filter(x=>!par.has(x.name));
  /* the group of a ledger = the nearest ancestor that is a bank-type group, else its direct parent */
  const byName=new Map(out.map(x=>[x.name,x]));led.forEach(x=>{let g=x.group,n=0;while(g&&!TL_BANKG.test(g)&&byName.get(g)&&byName.get(g).group&&n++<8)g=byName.get(g).group;if(g&&TL_BANKG.test(g))x.group=g});
  return{ledgers:led,hasGroup:true}}
 raw.forEach(x=>out.push({name:x.name,group:'',no:'',ifsc:'',bank:''}));return{ledgers:out,hasGroup:false}}
async function tlRead(file){const nm=file.name,buf=await file.arrayBuffer();
 if(/\.xml$/i.test(nm)||(()=>{const u=new Uint8Array(buf.slice(0,4));return u[0]==0x3c||(u[0]==0xFF&&u[1]==0xFE)})()&&!/\.xls|\.csv/i.test(nm))return tlXml(tlText(buf));
 if(/\.csv$|\.txt$/i.test(nm))return tlRows(rcCsv(new TextDecoder('utf-8').decode(buf).replace(/^﻿/,'')));
 const sh=await xlAll(buf);let best=null;for(const s of sh){const r=tlRows(s.rows);if(r.ledgers.length&&(!best||(r.hasGroup&&!best.hasGroup)||(r.hasGroup==best.hasGroup&&r.ledgers.length>best.ledgers.length)))best=r}
 if(!best)throw new Error('No ledger names were found in this file.');return best}
function tlFind(P){const banks=[];P.ledgers.forEach(x=>{let b=false;if(P.hasGroup)b=TL_BANKG.test(x.group||'');else b=TL_BANKN.test(x.name);if(b)banks.push(x)});return banks}
function tlLabel(x){const last=String(x.no||'').replace(/\D/g,'').slice(-4);return x.name+(last?' ('+last+')':'')}
function tlLedgerNames(P){const bankSet=new Set();return[...new Set(P.ledgers.map(x=>x.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}

/* ---------- screens ---------- */
function tlBox(){return '<p>Export from Tally and drop the file here: <b>Excel</b> (Masters, Ledgers, Alt+E) or <b>XML</b> (Data Interchange). Bank accounts and all ledger names are picked up for you.</p>'
 +'<label class="dz tld"><span>Drop the Tally file here or click to choose</span><input type="file" hidden accept=".xlsx,.xlsm,.xls,.csv,.xml" onchange="tlPick(this,0)"></label><div id="tlr"></div>'}
async function tlPick(inp,isNew){const f=inp.files[0];if(!f)return;const box=$id('tlr');box.innerHTML='<div class="card">Reading '+E(f.name)+'…</div>';
 try{const P=await tlRead(f);P.file=f.name;P.banks=tlFind(P);P.pick=P.banks.map(()=>1);TLS.P=P;TLS.new=!!isNew;box.innerHTML=tlPrev(P)}
 catch(e){box.innerHTML='<div class="card bad"><b>Could not read this file.</b><br>'+E(e.message||String(e))+'<br><small>Tip: in Tally press Alt+E (Export), choose Excel or XML, and export the list of ledgers (Masters → Ledgers).</small></div>'}}
function tlPrev(P){const c=!TLS.new&&S.c?C():null,have=c?new Set(c.accounts.map(a=>lk(a.ledger))):new Set(),nm=P.company||P.file.replace(/\.\w+$/,'').replace(/[_\-]+/g,' ').trim();
 return '<div class="card ok"><b>'+P.ledgers.length+' ledgers</b> found'+(P.banks.length?' and <b>'+P.banks.length+' bank account'+(P.banks.length>1?'s':'')+'</b>':', but no bank accounts could be told apart')+'.'+(P.hasGroup?'':' <small>(This file has no group column, so banks are guessed from the names. Tick the right ones.)</small>')+'</div>'
 +(TLS.new?'<label class="tll">Client name<input id="tln" value="'+E(nm)+'"></label><label class="tll">Tally version<select id="tlv"><option>Tally Prime</option><option>Tally ERP 9</option></select></label>':'')
 +(P.banks.length?'<h4>Bank accounts</h4>'+P.banks.map((b,i)=>'<label class="tlb"><input type="checkbox" '+(P.pick[i]&&!have.has(lk(b.name))?'checked ':'')+(have.has(lk(b.name))?'disabled ':'')+'onchange="TLS.P.pick['+i+']=this.checked?1:0"><span><b>'+E(tlLabel(b))+'</b><small>Tally ledger: '+E(b.name)+(b.ifsc?' · IFSC '+E(b.ifsc):'')+(have.has(lk(b.name))?' · already added':'')+'</small></span></label>').join(''):'<p><small>You can still import the ledger names, and add the bank account by hand afterwards.</small></p>')
 +(!TLS.new&&c&&c.ledgers.length?'<label class="tll"><input type="checkbox" id="tlrep"> Replace the existing ledger list (otherwise new names are added to it)</label>':'')
 +'<button onclick="tlApply()">'+(TLS.new?'Create client':'Import')+'</button>'}
function tlApply(){const P=TLS.P;if(!P)return;let c,name='';
 if(TLS.new){name=qc(v('tln'));if(!name)return alert('Please type the client name.');if(DB.clients[name])return alert('A client with this name already exists.');DB.clients[name]={ver:v('tlv'),accounts:[],ledgers:[],rules:[],hist:[],pending:0,ledgerUpdated:''};c=DB.clients[name]}else c=C();
 if(!c)return;const names=tlLedgerNames(P),rep=$id('tlrep')&&$id('tlrep').checked;
 const bankLedgers=new Set(P.banks.map(b=>b.name));
 c.ledgers=rep||TLS.new?[...new Set(names)]:lgMerge(c.ledgers,names);c.ledgerUpdated=ymd(new Date());
 let added=0;const have=new Set(c.accounts.map(a=>lk(a.ledger)));
 P.banks.forEach((b,i)=>{if(!P.pick[i]||have.has(lk(b.name)))return;c.accounts.push({label:tlLabel(b),ledger:qc(b.name),lastImport:'',lastTxn:'',no:b.no||'',ifsc:b.ifsc||'',bank:b.bank||''});added++});
 TLS.P=null;save();
 if(TLS.new){modal();S={c:name};CURP='';sb();dash()}else dash();
 toast(names.length+' ledgers loaded'+(added?' and '+added+' bank account'+(added>1?'s':'')+' added.':'.'))}
function tlNew(){TLS.new=true;TLS.P=null;modal('<h3>Create a client from a Tally file</h3><p>Export the list of ledgers from Tally (Excel or XML) and drop it here. The client, its bank accounts and its ledger names are created for you.</p><label class="dz tld"><span>Drop the Tally file here or click to choose</span><input type="file" hidden accept=".xlsx,.xlsm,.xls,.csv,.xml" onchange="tlPick(this,1)"></label><div id="tlr"></div>')}
