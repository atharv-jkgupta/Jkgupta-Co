/* AI chat box: asks the office server (/api/ai) with the login token */
let AIMSG=[],AIBUSY=0,AIERR='';
try{AIMSG=JSON.parse(sessionStorage.getItem('jkai')||'[]')}catch(e){AIMSG=[]}
function aiFmt(t){return E(t).replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>')}
function aiSave(){try{sessionStorage.setItem('jkai',JSON.stringify(AIMSG.slice(-30)))}catch(e){}}
function aiCopy(i){const t=(AIMSG[i]||{}).content||'';let ok=false;try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t);ok=true}}catch(e){}if(!ok)ok=gCopyFb(t);toast(ok?'Copied':'Copy not available here')}
function aiNew(){AIMSG=[];AIERR='';aiSave();aiDraw(1)}
async function aiSend(){const i=document.getElementById('aii'),q=((i&&i.value)||'').trim();if(!q||AIBUSY)return;
 AIMSG.push({role:'user',content:q});AIERR='';AIBUSY=1;aiSave();aiDraw(1);
 try{const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','x-token':LS.token||''},body:JSON.stringify({messages:AIMSG.slice(-20)})});
  let j={};try{j=await r.json()}catch(e){}
  if(j&&j.reply)AIMSG.push({role:'assistant',content:j.reply});
  else AIERR=(j&&j.error)||('The office server gave an unexpected answer ('+r.status+').')}
 catch(e){AIERR='Cannot reach the office server. Check that the server window is open on the main PC.'}
 AIBUSY=0;aiSave();aiDraw(1)}
function aiDraw(open){let w=document.getElementById('aiw');if(!w){w=document.createElement('div');w.id='aiw';w.className='notranslate';document.body.appendChild(w)}
 const o=open||w.dataset.o=='1';w.dataset.o=o?'1':'0';
 if(!o){w.innerHTML='<button class="aib" onclick="aiDraw(1)" aria-label="Ask AI">Ask AI</button>';return}
 const keep=(document.getElementById('aii')||{}).value||'';
 w.innerHTML='<div class="aip" role="dialog" aria-label="AI Assistant"><div class="aih"><b>AI Assistant</b><span><button onclick="aiNew()" title="Start a new chat">New chat</button><button onclick="document.getElementById(\'aiw\').dataset.o=0;aiDraw()" aria-label="Close">×</button></span></div>'
 +'<div class="aim" id="aim">'+(AIMSG.length?'':'<div class="aig bot">Hi! Ask me anything: a message or email to a client, a quick calculation, GST, income tax, Tally, Excel or a computer problem.</div>')
 +AIMSG.map((m,k)=>'<div class="aig '+(m.role=='user'?'me':'bot')+'">'+aiFmt(m.content)+(m.role=='user'?'':'<button class="aic" onclick="aiCopy('+k+')">Copy</button>')+'</div>').join('')
 +(AIBUSY?'<div class="aig bot aiw2">Thinking…</div>':'')+(AIERR?'<div class="aig err">'+E(AIERR)+'</div>':'')+'</div>'
 +'<div class="aif"><textarea id="aii" rows="2" placeholder="Type your question… (Enter to send)" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();aiSend()}">'+E(keep)+'</textarea><button onclick="aiSend()"'+(AIBUSY?' disabled':'')+'>Send</button></div></div>';
 const m=document.getElementById('aim');if(m)m.scrollTop=m.scrollHeight;const t=document.getElementById('aii');if(t&&!AIBUSY)t.focus()}
setInterval(()=>{const w=document.getElementById('aiw'),on=!!(typeof USER!='undefined'&&USER&&LS.on&&LS.token);
 if(on&&!w)aiDraw(0);else if(!on&&w){w.remove();AIMSG=[];AIERR='';try{sessionStorage.removeItem('jkai')}catch(e){}}},700);
document.addEventListener('keydown',e=>{if(e.key=='Escape'){const w=document.getElementById('aiw');if(w&&w.dataset.o=='1'){w.dataset.o=0;aiDraw()}}});
