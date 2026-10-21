
/* ====================================================================
   THEMES (5, random on load, switcher top right) + FAQ HELP WIDGET
   ==================================================================== */
const THEMES=[
 {id:'emerald',name:'Emerald Pro',primary:'#10b981',onPrimary:'#04281c',secondary:'#34d399',dot:'rgba(16,185,129,0.18)',titles:['GST Reco Studio','TaxSync Pro']},
 {id:'navy-gold',name:'Navy & Gold',primary:'#0f172a',onPrimary:'#ffffff',secondary:'#f59e0b',dot:'rgba(245,158,11,0.18)',titles:['GST Hub','RecoFlow']},
 {id:'charcoal-mint',name:'Charcoal & Mint',primary:'#1f2937',onPrimary:'#ffffff',secondary:'#6ee7b7',dot:'rgba(110,231,183,0.18)',titles:['GST Match','Smart Reconciler']},
 {id:'purple',name:'Purple',primary:'#7c3aed',onPrimary:'#ffffff',secondary:'#a78bfa',dot:'rgba(124,58,237,0.16)',titles:['TaxSync','GST Matcher']},
 {id:'orange-slate',name:'Orange Slate',primary:'#f97316',onPrimary:'#2a1204',secondary:'#475569',dot:'rgba(249,115,22,0.18)',titles:['Reco Pro','GST Reconciler']}];
const UPLOAD_TXT=['Drop your Tally Excel here','Upload Sales Register',"Let's match your bills",'Bring your GST files'];
const SUCCESS_TXT=['{n} invoices decoded!','Reco ready!','Files matched!'];
const thPick=a=>a[Math.floor(Math.random()*a.length)];
let TH=THEMES[1],RCT={title:'Reco',upload:UPLOAD_TXT[0],success:SUCCESS_TXT[0]};
const rcTitle=()=>RCT.title;
const thLum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]};
function thMix(a,b,t){const x=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=x(a),B=x(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')}
function applyTheme(t){TH=t||TH;const s=document.documentElement.style,dark=document.documentElement.dataset.theme==='dark';
 let pri=TH.primary,ink=TH.onPrimary,link=TH.primary;
 if(dark&&thLum(pri)<0.12){pri=TH.secondary;ink=thLum(pri)>.35?'#111827':'#ffffff'}     /* dark colours would vanish on a dark page */
 link=dark?(thLum(pri)<.25?thMix(pri,'#ffffff',.55):pri):(thLum(pri)>.45?thMix(pri,'#000000',.45):pri);
 const set=(k,v)=>s.setProperty(k,v);
 set('--pri',pri);set('--pri2',thMix(pri,dark?'#ffffff':'#000000',.2));set('--priink',ink);set('--link',link);
 set('--gold',TH.secondary);set('--gold2',thMix(TH.secondary,dark?'#000000':'#ffffff',.6));set('--goldbg',thMix(TH.secondary,dark?'#000000':'#ffffff',.88));set('--ring',TH.dot.replace(/[\d.]+\)$/,'.45)'));
 set('--theme-primary',pri);set('--theme-on-primary',ink);set('--theme-secondary',TH.secondary);set('--theme-dot',TH.dot);set('--theme-dots','radial-gradient('+TH.dot+' 1.2px, transparent 1.2px)');
 const b=document.getElementById('thb');if(b){b.title='Colour theme: '+TH.name+' (click for next)';b.setAttribute('aria-label',b.title)}}
function thNext(){applyTheme(THEMES[(THEMES.findIndex(x=>x.id===TH.id)+1)%THEMES.length]);RCT.title=thPick(TH.titles);if(CURP=='reco'&&typeof recoPage=='function')recoPage(true);toast('Theme: '+TH.name)}
function updTm(){const b=$id('tm');if(!b)return;const d=document.documentElement.dataset.theme==='dark';b.innerHTML=d?IC.sun:IC.moon;b.title=d?'Switch to light mode':'Switch to dark mode';b.setAttribute('aria-label',b.title);applyTheme()}
function thInit(){const tr=document.querySelector('#top .tr');if(tr&&!document.getElementById('thb')){const b=document.createElement('button');b.id='thb';b.className='ib';b.type='button';b.onclick=thNext;b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.3-1.7-.4-1 .2-2.3 1.4-2.3H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>';tr.insertBefore(b,document.getElementById('lgb')||document.getElementById('tm'))}
 /* a fixed first look, then one random theme picked after the page is up */
 applyTheme(THEMES[1]);const t=thPick(THEMES);RCT={title:thPick(t.titles),upload:thPick(UPLOAD_TXT),success:thPick(SUCCESS_TXT)};applyTheme(t)}
setTimeout(thInit,0);

/* ---------- built-in FAQ helper (no AI, no network) ---------- */
const MHKB=[
 {q:'What is item-wise format?',a:'Item-wise is the normal Tally layout when F12 > Show Inventory Details = YES (needed for HSN reporting). One bill is written as several HSN item lines followed by one total line. The tool merges them, so each bill is counted once.',k:['item','itemwise','item-wise','inventory','f12','format','layout']},
 {q:'Why were rows left out?',a:'Older versions left out HSN item lines because they have no bill number. Now each item line is merged into the next row that has a bill number. If you still see "row(s) left out", those rows have an amount but neither a bill number nor an HSN code. Open "Columns I used" and check that HSN code and Invoice number point to the right columns.',k:['left out','rows','skipped','missing','no invoice','left']},
 {q:'What is an HSN code?',a:'HSN is the goods classification code on a GST invoice. It decides the GST rate and is reported in GSTR-1. A bill with two different goods has two HSN lines. Click a bill number in the results table to see its HSN lines.',k:['hsn','code','goods','classification','breakup']},
 {q:'Is my Tally format normal?',a:'Yes. A blank bill number with an HSN code is an HSN item line. It belongs to the next row that has a bill number, which is the total line. You do not need to change your Tally export. Both this format and one-line-per-bill are accepted.',k:['normal','tally','correct','change','blank','bill no','export']},
 {q:'Will totals be counted twice?',a:'No. The taxable value and tax come from the bill\'s total row; the item lines are never added on top. If the item lines do not add up to the total row you get an amber note and the total row is used.',k:['double','twice','duplicate','total','sum','count','amber','warning']},
 {q:'How is GSTR-1 different?',a:'GSTR-1 is one line per bill, so nothing is merged. Each Tally bill is matched to its GSTR-1 line by GSTIN and invoice number, then the taxable value and the tax are compared.',k:['gstr','gstr-1','gstr1','portal','match','compare']},
 {q:'What do the green and amber notes mean?',a:'Green is information, for example how many invoices were read. Amber is something to check, with what to do under it. Nothing in either colour stops the reco from running.',k:['green','amber','note','banner','colour','color','red']},
 {q:'Rates and amounts: % or ₹?',a:'Rates always carry a % sign (for example 9%) and amounts a rupee sign (for example ₹1,143.54), so they can not be confused. The rate is worked out from the tax amount and the taxable value.',k:['rate','percent','%','rupee','₹','amount']},
 {q:'Can it tell if a GSTIN is cancelled?',a:'No. This tool checks only that a GSTIN is correctly formed. Active, cancelled or surrendered status is shown only on the GST portal. In the GSTIN checker use the "Check status on GST portal" button.',k:['gstin','cancelled','surrendered','active','valid','status']}];
const MHFALL='I only know about the Tally item-wise format, HSN lines and how bills are matched. Try a quick question, or use words like "item-wise", "HSN", "total", "rates" or "GSTR-1".';
const MHT=['GST Assistant','HSN Helper','Reco Guide'];let MHTITLE=thPick(MHT),MHMSG=[];
function mhAns(t){t=t.toLowerCase();let best=null,bs=0;MHKB.forEach(e=>{const s=e.k.reduce((n,k)=>n+(t.includes(k)?1:0),0);if(s>bs){best=e;bs=s}});return best?best.a:MHFALL}
function mhHide(n){if(n!='reco'){const w=document.getElementById('mhw');if(w)w.remove()}}
function mhAsk(q){q=(q||'').trim();if(!q)return;MHMSG.push(['me',q],['bot',mhAns(q)]);const i=document.getElementById('mhi');if(i)i.value='';mhDraw(true)}
function mhDraw(open){let w=document.getElementById('mhw');if(!w){w=document.createElement('div');w.id='mhw';w.className='notranslate';document.body.appendChild(w)}
 const o=open||w.dataset.o=='1';w.dataset.o=o?'1':'0';
 if(!o){w.innerHTML='<button class="mhb" onclick="mhDraw(1)" aria-label="Ask GST Help">Ask GST Help</button>';return}
 w.innerHTML='<div class="mhp" role="dialog" aria-label="'+E(MHTITLE)+'"><div class="mhh"><b>'+E(MHTITLE)+'</b><button onclick="document.getElementById(\'mhw\').dataset.o=0;mhDraw()" aria-label="Close">×</button></div><div class="mhm" id="mhm"><div class="mhg bot">Hi! Ask me about your Tally format, HSN lines or how bills are matched.</div><div class="mhq">'+MHKB.slice(0,4).map((e,i)=>'<button onclick="mhAsk(MHKB['+i+'].q)">'+E(e.q)+'</button>').join('')+'</div>'+MHMSG.map(m=>'<div class="mhg '+m[0]+'">'+E(m[1])+'</div>').join('')+'</div><div class="mhf"><input id="mhi" placeholder="Ask about GST format..." onkeydown="if(event.key===\'Enter\')mhAsk(this.value)"><button onclick="mhAsk(document.getElementById(\'mhi\').value)">Send</button></div></div>';
 const m=document.getElementById('mhm');if(m)m.scrollTop=m.scrollHeight}
function mhMount(){mhDraw(0)}
document.addEventListener('keydown',e=>{if(e.key=='Escape'){const w=document.getElementById('mhw');if(w&&w.dataset.o=='1'){w.dataset.o=0;mhDraw()}}});
