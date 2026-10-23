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
  dkGrp('Clients',[dkTile('check','Client tracker',T.t?(T.d+' of '+T.t+' done this month'):'Track the work client by client','trk()'),dkTile('search','Find a client','Jump to the client list','var q=$id(\'q\');if(q){q.scrollIntoView({behavior:\'smooth\',block:\'center\'});q.focus()}')].concat(atOK()?[dkTile('clock','Attendance',attLine(),'att()')]:[])),
  dkGrp('Entries and imports',[].concat(pcOK()?[dkTile('wallet','Petty cash book','Record and export expenses','pc()')]:[]).concat(typeof bx=='function'?[dkTile('sheet','Bills to Excel','Turn bills into the India layout sheet','bx()')]:[])),
  dkGrp('Checks',[dkTile('scale','Reco','GSTR-2B and bank reconciliation','reco()'),dkTile('shield','GSTIN / HSN check','Check a number in one tap','gchk()')]),
  dkGrp(ADM()&&!VIEW?'Admin':'Help and backup',[].concat(ADM()&&!VIEW?[dkTile('users','Staff &amp; access','Add staff, set permissions','staffF()')]:[]).concat([dkTile('down','Download backup','Save a copy of your data',"dl('JK-backup-'+USER+'.json',JSON.stringify(DB),'application/json')"),dkTile('help','Help','How to use each part','help()')]))].join('');
 const firstBox='<div class="dfirst"><h2>Welcome! Let\'s add your first client</h2><p>Drop a Tally export and the client, bank accounts and ledgers are set up for you.</p><div class="dfb"><button type="button" class="dprim" onclick="tlNew()">'+IC.plus+' Create client from Tally file</button><button type="button" class="g" onclick="tg(1)">Add by hand</button></div></div>';
 app.innerHTML='<i data-pg="home" hidden></i>'+(VIEW?vbar():'')+dkHero()+(first?firstBox:'<div class="dbar"><button type="button" class="dprim" onclick="tlNew()">'+IC.plus+' Create client from Tally file</button><div class="dcs">'+chips+'</div></div>')+'<div class="dgs">'+grp+'</div>'
  +(ADM()&&!VIEW?stfP():'')+kdHtml()
  +(first?'':'<h2 class="dsec">'+(VIEW?E(VIEW)+'\'s clients':ADM()?'Admin\'s own clients':'Clients')+'</h2><input id="q" class="sq" aria-label="Search clients" placeholder="Search clients..." oninput="clearTimeout(window._qt);window._qt=setTimeout(cards,120)"><div id="cl" class="cg"></div>');
 if(!first)cards()}
