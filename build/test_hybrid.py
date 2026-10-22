import asyncio,subprocess,os,shutil,json,time,tempfile,urllib.request,hashlib
from playwright.async_api import async_playwright
OFF='/home/claude/office';OUT='/home/claude/app/out';PORT=3057;MOCKGH=8098
T=tempfile.mkdtemp();SRV=os.path.join(T,'srv');os.makedirs(SRV);shutil.copy(OFF+'/server.js',SRV);shutil.copy(OUT+'/office.html',SRV+'/index.html');shutil.copy(OUT+'/hybrid.html',SRV+'/hybrid.html')
cfg=lambda extra={}:json.dump(dict({'port':PORT,'adminPassword':'Admin#123','dataDir':os.path.join(T,'data'),'autoUpdate':False},**extra),open(SRV+'/config.json','w'))
sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
procs=[subprocess.Popen(['python3','-m','http.server','8097','-d',OFF],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)]
def srv_start(extra={},port=PORT):
    cfg(extra);p=subprocess.Popen(['node','server.js'],cwd=SRV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);procs.append(p)
    for _ in range(40):
        try:urllib.request.urlopen('http://127.0.0.1:%d/ping'%port,timeout=1);return p
        except Exception:time.sleep(.2)
def rpc(f,b,port=PORT):
    q=urllib.request.Request('http://127.0.0.1:%d/rest/v1/rpc/%s'%(port,f),json.dumps(b).encode(),{'Content-Type':'application/json'});return json.load(urllib.request.urlopen(q))
res=[]
def chk(n,c):res.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n)
INIT="window.showDirectoryPicker=async()=>{const r=await navigator.storage.getDirectory();return r.getDirectoryHandle('travel1',{create:true})};try{localStorage.setItem('jkgsrv','http://127.0.0.1:%d')}catch(e){}"%PORT
async def login(pg,u,p):
    await pg.evaluate("tg(1)");await pg.wait_for_timeout(300);await pg.fill('#lu',u);await pg.fill('#lp',p);await pg.click('#sb .go');await pg.wait_for_timeout(2200)
async def main():
    s=srv_start()
    a=rpc('jkg_login',{'p_u':'jkgupta&co','p_h':sha('jkg2|jkgupta&co|Admin#123'),'p_m':''});
    rpc('kv_put',{'p_t':a['token'],'p_k':'jkgusers','p_v':json.dumps({'ravi':sha('jkg2|ravi|pass1')})})
    # CORS preflight like a browser from file://
    q=urllib.request.Request('http://127.0.0.1:%d/rest/v1/rpc/jkg_login'%PORT,method='OPTIONS',headers={'Origin':'null','Access-Control-Request-Method':'POST'});r=urllib.request.urlopen(q)
    chk('server answers browser pre-check (CORS)',r.status==204 and r.headers.get('Access-Control-Allow-Origin')=='*')
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[]
        ctx=await b.new_context(viewport={'width':1280,'height':800});await ctx.add_init_script(INIT)
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort());await pg.route('**vercel.app**',lambda r:r.abort())
        L='http://localhost:8097/JK-Launcher.html'
        await pg.goto(L);await pg.wait_for_timeout(2500)
        chk('launcher started the app (from the office server)',await pg.evaluate("typeof LS")=='object')
        chk('server found -> server mode',await pg.evaluate("LS.on")==True)
        chk('shows connected',  'Connected to the office server' in await pg.inner_text('#sb'))
        await login(pg,'ravi','pass1');chk('login through the server from the file',await pg.evaluate('USER')=='ravi')
        await pg.evaluate("document.getElementById('nn').value='Acme';addC()");await pg.wait_for_timeout(900)
        chk('banner asks for travel folder',await pg.locator('#hybbn').count()==1)
        await pg.click('#hybbn button');await pg.wait_for_timeout(1500)
        names=await pg.evaluate("(async()=>{const r=await navigator.storage.getDirectory(),h=await r.getDirectoryHandle('travel1');const o=[];for await(const [n] of h.entries())o.push(n);return o})()")
        chk('travel copy written to laptop folder at the office','jkg-travel-ravi.json' in names)
        chk('banner gone',await pg.locator('#hybbn').count()==0)
        # ---- leave the office: server off
        s.terminate();s.wait()
        try:urllib.request.urlopen('http://127.0.0.1:%d/ping'%PORT,timeout=1);print('SERVER STILL UP')
        except Exception as e:print('server down ok')
        await pg.goto(L);await pg.wait_for_timeout(7000)
        chk('no server -> cached app still starts',await pg.evaluate("typeof LS")=='object')
        print(repr((await pg.inner_html('#sb'))[:300]),await pg.evaluate('LS.on'));await pg.evaluate('tg(1)');await pg.wait_for_timeout(300);chk('travel mode shown','not found' in await pg.inner_text('#sb'))
        await pg.evaluate('tg(1)');await pg.wait_for_timeout(300);await pg.click('#sb .go');await pg.wait_for_timeout(1500)
        chk('works from the travel folder',await pg.evaluate('USER')=='ravi' and await pg.evaluate("Object.keys(DB.clients).join()")=='Acme')
        await pg.evaluate("DB.clients['Acme'].note='from the road';save()");await pg.wait_for_timeout(700)
        await pg.evaluate("document.getElementById('nn').value='Gamma';addC()");await pg.wait_for_timeout(500)
        await pg.evaluate("attIn()");await pg.wait_for_timeout(900)
        # ---- back in the office
        s=srv_start()
        await pg.goto(L);await pg.wait_for_timeout(3000)
        chk('server back -> server mode again',await pg.evaluate("LS.on")==True)
        await login(pg,'ravi','pass1');await pg.wait_for_timeout(2500)
        chk('travel work merged automatically (Gamma)',await pg.evaluate("'Gamma' in DB.clients"))
        chk('travel edit merged (Acme note)',await pg.evaluate("DB.clients['Acme'].note")=='from the road')
        t=rpc('jkg_login',{'p_u':'ravi','p_h':sha('jkg2|ravi|pass1'),'p_m':''})['token']
        rows={x['k']:x['v'] for x in rpc('kv_open',{'p_t':t,'p_since':None})['rows']}
        chk('server really holds it','Gamma' in rows['jkg_ravi'] and 'att_ravi' in rows)
        chk('no JS errors',not errs);print(errs)
        await b.close()
    s.terminate();s.wait()
    # ---- auto update from "GitHub"
    GH=os.path.join(T,'gh');os.makedirs(GH)
    new=open(OUT+'/office.html',encoding='utf-8').read().replace('</body>','<!--v2--></body>');open(GH+'/index.html','w',encoding='utf-8').write(new)
    open(GH+'/hybrid.html','w').write('<html>broken</html>')
    ms=subprocess.Popen(['python3','-m','http.server',str(MOCKGH),'-d',GH],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);procs.append(ms);time.sleep(1)
    srv_start({'autoUpdate':True,'updateUrl':'http://127.0.0.1:%d/'%MOCKGH});time.sleep(6)
    chk('server updated its own app file from the internet source','<!--v2-->' in open(SRV+'/index.html',encoding='utf-8').read())
    chk('broken download rejected',os.path.getsize(SRV+'/hybrid.html')>200000)
    for p in procs:
        try:p.terminate()
        except Exception:pass
    bad=[n for n,c in res if not c];print('ALL OK' if not bad else 'SOME FAILED: '+str(bad))
asyncio.run(main())
