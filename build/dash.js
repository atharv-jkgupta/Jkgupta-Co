/* ===== New dashboard (clear, grouped, AA contrast) ===== */
IC.plus=svg('<path d="M12 5v14M5 12h14"/>');
IC.sheet=svg('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>');
IC.search=svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>');
const dkCr=(a,b)=>{const x=thLum(a),y=thLum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
function dkFix(dark){const rs=document.documentElement.style,cs=getComputedStyle(document.documentElement),nz=h=>{h=h.trim();return /^#[0-9a-f]{3}$/i.test(h)?'#'+h.slice(1).split('').map(c=>c+c).join(''):h},g=k=>nz(cs.getPropertyValue(k)),hx=h=>/^#[0-9a-f]{6}$/i.test(h);
 const s1=g('--s1'),bg=g('--bg'),pri=g('--pri');if(!hx(s1)||!hx(bg)||!hx(pri))return;
 let ink=g('--priink');if(!hx(ink)||dkCr(pri,ink)<4.8){ink=dkCr(pri,'#000000')>=dkCr(pri,'#ffffff')?'#000000':'#ffffff';rs.setProperty('--priink',ink)}
 let acc=pri;const to=dark?'#ffffff':'#000000';
 const ok=c=>[s1,bg,thMix(s1,c,.14)].every(b=>dkCr(c,b)>=4.8);
 for(let i=0;i<20&&!ok(acc);i++)acc=thMix(acc,to,.1);
 rs.setProperty('--dk-acc',acc);rs.setProperty('--link',acc)}
const dkTile=(ic,t,d,fn)=>'<button type="button" class="dt" onclick="'+fn+'"><i>'+IC[ic]+'</i><b>'+t+'</b><span>'+d+'</span></button>';
const dkGrp=(h,L)=>L.length?'<section class="dg"><h2>'+h+'</h2><div class="dtg">'+L.join('')+'</div></section>':'';
function dkHero(){const K=kdata(),h=new Date().getHours(),g=h<12?'Good morning':h<17?'Good afternoon':'Good evening',N=[...K.G,...K.T].sort((a,b)=>a[3]-b[3])[0];
 return '<div class="dh"><div class="dhl"><div class="dhd">'+K.t.toLocaleString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</div><h1>'+g+(USER?', '+E(PNAME(VIEW?'Admin':ADM()?'Admin':USER)):'')+'</h1><p>JK Gupta &amp; Co. · Chartered Accountants</p></div>'
  +(N?'<div class="dn"><span>Next deadline</span><b>'+N[3]+' '+(N[3]==1?'day':'days')+'</b><em>'+E(N[1])+' · '+dFmt(N[0])+'</em></div>':'')+'</div>'}
function home(){CURP='home';S={};window.onscroll=null;sb();dls();document.body.classList.toggle('out',!USER);
 if(!USER){loginPage();return}
 const N=Object.keys(DB.clients);let A=0,O=0,P=0;N.forEach(n=>{const c=DB.clients[n];P+=c.pending||0;c.accounts.forEach(a=>{A++;const d=days(a.lastImport);if(d==null||d>30)O++})});
 const T=tkStats(),first=N.length==0&&!VIEW,same=pgIn('home');
 const chips=[[N.length,'client'+(N.length==1?'':'s'),''],[A,'bank account'+(A==1?'':'s'),''],[O,'need import (30+ days)','w'],[P,'pending entr'+(P==1?'y':'ies'),'w']].filter(x=>x[0]>0).map(x=>'<span class="dc '+x[2]+'"><b>'+x[0]+'</b> '+x[1]+'</span>').join('');
 const grp=[
  dkGrp('Clients',[dkTile('check','Client tracker',T.t?(T.d+' of '+T.t+' done this month'):'Track the work client by client','trk()'),dkTile('search','Find a client','Jump to the client list','var q=$id(\'q\');if(q){q.scrollIntoView({behavior:\'smooth\',block:\'center\'});q.focus()}')].concat(arcOK()?[dkTile('folder','Saved clients (folder)','Find a saved client and bring him back','arcFind()')]:[]).concat(atOK()?[dkTile('clock','Attendance',attLine(),'att()')]:[])),
  dkGrp('Entries and imports',[].concat(pcOK()?[dkTile('wallet','Petty cash book','Record and export expenses','pc()')]:[]).concat(typeof bx=='function'?[dkTile('sheet','Bills to Excel','Turn bills into the India layout sheet','bx()')]:[])),
  dkGrp('Checks',[dkTile('scale','Reco','GSTR-2B and bank reconciliation','reco()'),dkTile('shield','GSTIN / HSN check','Check a number in one tap','gchk()')]),
  dkGrp(ADM()&&!VIEW?'Admin':'Help and backup',[].concat(ADM()&&!VIEW?[dkTile('users','Staff &amp; access','Add staff, set permissions','staffF()')]:[]).concat([dkTile('down','Download backup','Save a copy of your data',"dl('JK-backup-'+USER+'.json',JSON.stringify(DB),'application/json')"),dkTile('help','Help','How to use each part','help()')]))].join('');
 const firstBox='<div class="dfirst"><h2>Welcome! Let\'s add your first client</h2><p>Drop a Tally export and the client, bank accounts and ledgers are set up for you.</p><div class="dfb"><button type="button" class="dprim" onclick="tlNew()">'+IC.plus+' Create client from Tally file</button><button type="button" class="g" onclick="tg(1)">Add by hand</button></div></div>';
 app.innerHTML='<i data-pg="home" hidden></i>'+(VIEW?vbar():'')+dkHero()+(first?firstBox:'<div class="dbar"><button type="button" class="dprim" onclick="tlNew()">'+IC.plus+' Create client from Tally file</button><div class="dcs">'+chips+'</div></div>')+'<div class="dgs">'+grp+'</div>'
  +(ADM()&&!VIEW?stfP():'')+kdHtml()
  +(first?'':'<h2 class="dsec">'+(VIEW?E(VIEW)+'\'s clients':ADM()?'Admin\'s own clients':'Clients')+'</h2><input id="q" class="sq" aria-label="Search clients" placeholder="Search clients..." oninput="clearTimeout(window._qt);window._qt=setTimeout(cards,120)"><div id="cl" class="cg"></div>');
 if(!first)cards()}

/* ===== match typed names to the client's ledger names ===== */
function lgNorm(s){return String(s||'').toLowerCase().replace(/&/g,' and ').replace(/\b(debtors?|creditors?)\b/g,' ').replace(/\b(pvt|private|ltd|limited|co|company|m\/s|ms)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function lgDice(a,b){if(a==b)return 1;if(a.length<2||b.length<2)return 0;const g=s=>{const m=new Map();for(let i=0;i<s.length-1;i++){const k=s.slice(i,i+2);m.set(k,(m.get(k)||0)+1)}return m},A=g(a),B=g(b);let n=0;A.forEach((v,k)=>{if(B.has(k))n+=Math.min(v,B.get(k))});return 2*n/(a.length+b.length-2)}
function lgMatch(name,L){name=String(name||'').trim();if(!name||!L||!L.length)return{n:name,how:''};
 if(L.includes(name))return{n:name,how:''};
 const low=name.toLowerCase().replace(/\s+/g,' '),e1=L.filter(x=>x.toLowerCase().replace(/\s+/g,' ')==low);if(e1.length==1)return{n:e1[0],how:'same name, different capitals or spaces'};
 const nn=lgNorm(name);if(!nn)return{n:name,how:''};
 const e2=L.filter(x=>lgNorm(x)==nn);if(e2.length==1)return{n:e2[0],how:'same name, different dots, commas or Ltd/Pvt'};if(e2.length>1)return{n:name,how:'',amb:e2};
 const sc=L.map(x=>[x,lgDice(nn,lgNorm(x))]).sort((a,b)=>b[1]-a[1]);
 if(sc[0]&&sc[0][1]>=.9&&(!sc[1]||sc[0][1]-sc[1][1]>=.05))return{n:sc[0][0],how:'very close spelling ('+Math.round(sc[0][1]*100)+'%)'};
 return{n:name,how:''}}
function lgFix(n,L){try{const m=lgMatch(n,L);return m.how?m.n:n}catch(e){return n}}

/* ===== new party ledgers: state + GSTIN (+ registration type) for Tally Prime ===== */
const GSTATE={'01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','26':'Dadra & Nagar Haveli and Daman & Diu','27':'Maharashtra','29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman & Nicobar Islands','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh','97':'Other Territory'};
const gStateOf=g=>GSTATE[String(g||'').slice(0,2)]||'';
function gMasterXml(m){const nm=E(m.n),par=m.parent,gs=m.gs?E(m.gs):'';
 const old='<TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="'+nm+'" ACTION="Create"><NAME.LIST><NAME>'+nm+'</NAME></NAME.LIST><PARENT>'+par+'</PARENT><ISBILLWISEON>Yes</ISBILLWISEON>'+(gs?'<PARTYGSTIN>'+gs+'</PARTYGSTIN>':'')+'</LEDGER></TALLYMESSAGE>';
 let prime=false;try{prime=/prime/i.test(C().ver||'')}catch(e){}
 if(!prime)return old;
 const st=gStateOf(m.gs),stx=st?E(st):'',rt=gs?'Regular':(st?'Unregistered/Consumer':'');
 return '<TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="'+nm+'" ACTION="Create"><NAME.LIST><NAME>'+nm+'</NAME></NAME.LIST><PARENT>'+par+'</PARENT><ISBILLWISEON>Yes</ISBILLWISEON>'
  +'<COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>'+(stx?'<LEDSTATENAME>'+stx+'</LEDSTATENAME>':'')+(rt?'<GSTREGISTRATIONTYPE>'+rt+'</GSTREGISTRATIONTYPE>':'')+(gs?'<PARTYGSTIN>'+gs+'</PARTYGSTIN>':'')
  +'<LEDMAILINGDETAILS.LIST><APPLICABLEFROM>20170701</APPLICABLEFROM><MAILINGNAME>'+nm+'</MAILINGNAME>'+(stx?'<STATE>'+stx+'</STATE>':'')+'<COUNTRY>India</COUNTRY></LEDMAILINGDETAILS.LIST>'
  +(rt?'<LEDGSTREGDETAILS.LIST><APPLICABLEFROM>20170701</APPLICABLEFROM><GSTREGISTRATIONTYPE>'+rt+'</GSTREGISTRATIONTYPE>'+(stx?'<PLACEOFSUPPLY>'+stx+'</PLACEOFSUPPLY>':'')+(gs?'<GSTIN>'+gs+'</GSTIN>':'')+'</LEDGSTREGDETAILS.LIST>':'')
  +'</LEDGER></TALLYMESSAGE>'}
