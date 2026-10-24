/* ===== Client archive folder: save a client to a folder, find him later, bring him back ===== */
IC.folder=svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>');
const ARC={h:null};
const arcOK=()=>typeof window.showDirectoryPicker=='function';
const arcFn=(n,o)=>'Client - '+String(n).replace(/[\\\/:*?"<>|]+/g,'_').trim()+' ('+String(o).replace(/[\\\/:*?"<>|]+/g,'_')+').json';
async function arcFolder(ask){if(!arcOK()){modal('<h3>Please use Chrome or Edge</h3><p>This browser cannot save into a folder. Open the site in Chrome or Edge on your computer.</p>');return null}
 let h=ARC.h;if(!h){try{h=await trvIdb('get','arc')}catch(e){}}
 if(h&&await trvPerm(h,true)){ARC.h=h;return h}
 if(!ask)return null;
 try{h=await window.showDirectoryPicker({mode:'readwrite',id:'jkgarchive'})}catch(e){return null}
 try{await trvIdb('put','arc',h)}catch(e){}ARC.h=h;return h}
async function arcChange(){try{await trvIdb('put','arc',null)}catch(e){}ARC.h=null;const h=await window.showDirectoryPicker({mode:'readwrite',id:'jkgarchive'}).catch(()=>null);if(h){try{await trvIdb('put','arc',h)}catch(e){}ARC.h=h}return ARC.h}
function arcPack(n){const o=VIEW||USER,c=DB.clients[n];let t=null;try{t=JSON.parse(LS.getItem(tkKey(o,n))||'null')}catch(e){}
 return{app:'jkg-client-archive',v:1,saved:new Date().toISOString(),owner:o,name:n,client:c,tracker:(t&&!t.del)?t:null}}
function arcOpen(){const n=S.c;if(!n||!DB.clients[n])return;
 modal('<h3>Save "'+E(n)+'" to a folder</h3><p>Everything the site has on this client is written to <b>one file</b> in a folder you choose (your computer or the server drive). You can bring it back any time.</p>'
 +'<p><button onclick="arcSave(0)">Save to folder (keep on the site)</button></p>'
 +'<p><button class="g" onclick="arcSave(1)">Save to folder, then remove from the site</button><br><small>It is removed only after I read the file back and it matches exactly. This frees space.</small></p>'
 +'<p><button class="g" onclick="arcFind()">Find or bring back a client…</button></p>')}
async function arcSave(rem){const n=S.c;if(!DB.clients[n])return;const h=await arcFolder(true);if(!h)return;
 const rec=arcPack(n),txt=JSON.stringify(rec,null,1),fn=arcFn(n,rec.owner);
 try{const w=await(await h.getFileHandle(fn,{create:true})).createWritable();await w.write(txt);await w.close();
  const back=await(await(await h.getFileHandle(fn)).getFile()).text();
  if(back!==txt)throw new Error('The saved file did not match')}catch(e){modal('<h3>Could not save</h3><p>'+E(e.message||String(e))+'</p><p>Nothing was removed from the site.</p>');return}
 if(rem){tkDrop(n);delete DB.clients[n];save();S={};home();toast('Saved to the folder and removed from the site: '+n,'',null,8000)}
 else{modal('<h3>Saved</h3><p>File: <b>'+E(fn)+'</b><br>Folder: <b>'+E(h.name||'')+'</b></p><p>Checked: the file was read back and matches.</p>')}}
async function arcList(h){const out=[];for await(const [nm,fh] of h.entries()){if(fh.kind!='file'||!/^Client - .*\.json$/i.test(nm))continue;
  try{const f=await fh.getFile(),j=JSON.parse(await f.text());if(j&&j.app=='jkg-client-archive'&&j.name)out.push({file:nm,name:j.name,owner:j.owner,saved:j.saved,banks:((j.client||{}).accounts||[]).length,ledgers:((j.client||{}).ledgers||[]).length})}catch(e){}}
 return out.sort((a,b)=>a.name.toLowerCase()<b.name.toLowerCase()?-1:1)}
let ARCL=[];
async function arcFind(){const h=await arcFolder(true);if(!h)return;modal('<h3>Looking in the folder…</h3>');
 try{ARCL=await arcList(h)}catch(e){modal('<h3>Could not read the folder</h3><p>'+E(e.message||String(e))+'</p>');return}
 modal('<h3>Saved clients in "'+E(h.name||'folder')+'"</h3><input id="arq" class="sq" placeholder="Type part of the client name..." oninput="arcShow()" style="width:100%"><div id="arl" style="max-height:50vh;overflow:auto;margin:10px 0"></div><button class="g" onclick="arcChange().then(arcFind)">Use a different folder</button>');arcShow()}
function arcShow(){const q=(($id('arq')||{}).value||'').toLowerCase(),e=$id('arl');if(!e)return;const L=ARCL.map((x,i)=>[x,i]).filter(([x])=>!q||x.name.toLowerCase().includes(q)||String(x.owner).toLowerCase().includes(q));
 e.innerHTML=L.length?L.map(([x,i])=>'<div class="card" style="margin:6px 0"><b>'+E(x.name)+'</b> <small>(login: '+E(x.owner)+')</small><br><small>Saved '+E(String(x.saved||'').slice(0,10))+' · '+x.banks+' bank account(s) · '+x.ledgers+' ledger name(s)</small><br><button onclick="arcBack('+i+')">Bring back to the site</button></div>').join(''):'<p>'+(ARCL.length?'No client matches that name.':'No saved clients in this folder yet.')+'</p>'}
async function arcBack(i){const x=ARCL[i],h=ARC.h;if(!x||!h)return;let j;try{j=JSON.parse(await(await(await h.getFileHandle(x.file)).getFile()).text())}catch(e){modal('<h3>Could not read that file</h3>');return}
 const me=VIEW||USER;if(String(j.owner).toLowerCase()!=String(me).toLowerCase()&&!confirm('This client was saved from the login "'+j.owner+'". Bring it back into "'+me+'" instead?'))return;
 let nm=j.name;if(DB.clients[nm]){if(!confirm('"'+nm+'" is already on the site. Bring the saved copy back as "'+nm+' (restored)"? Nothing will be overwritten.'))return;nm=nm+' (restored)'}
 DB.clients[nm]=j.client;if(j.tracker){const t=Object.assign({},j.tracker,{o:me,n:nm,del:false,at:Date.now()});try{LS.setItem(tkKey(me,nm),JSON.stringify(t))}catch(e){}}
 save();try{tkSync()}catch(e){}modal();home();toast('Brought back: '+nm)}
