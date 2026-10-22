import asyncio,subprocess,os,shutil,json,time,tempfile,urllib.request
from playwright.async_api import async_playwright
OFF='/home/claude/office';PORT=3056;WEB=8099
T=tempfile.mkdtemp();SRV=os.path.join(T,'srv');os.makedirs(SRV);shutil.copy(os.path.join(OFF,'server.js'),SRV);shutil.copy('/home/claude/app/out/office.html',os.path.join(SRV,'index.html'))
json.dump({'port':PORT,'adminPassword':'Admin#123','dataDir':os.path.join(T,'data')},open(os.path.join(SRV,'config.json'),'w'))
procs=[subprocess.Popen(['node','server.js'],cwd=SRV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT),
       subprocess.Popen(['python3','-m','http.server',str(WEB),'-d','/home/claude/app/out'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)]
for _ in range(40):
    try:urllib.request.urlopen('http://127.0.0.1:%d/'%PORT,timeout=1);break
    except Exception:time.sleep(.2)
res=[]
def chk(n,c):res.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n)
OPFS="window.showDirectoryPicker=async()=>{const r=await navigator.storage.getDirectory();return r.getDirectoryHandle('travel1',{create:true})};"
async def login(pg,u,p):
    await pg.evaluate("tg(1)");await pg.wait_for_timeout(300);await pg.fill('#lu',u);await pg.fill('#lp',p);await pg.click('#sb .go');await pg.wait_for_timeout(1800)
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[]
        def mk(init=''):return b.new_context(viewport={'width':1280,'height':800},accept_downloads=True)
        async def page(ctx,url,init=''):
            if init:await ctx.add_init_script(init)
            pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort());await pg.goto(url);await pg.wait_for_timeout(800);return pg
        # ---- office side: staff ravi with clients Acme + Beta
        co=await mk();po=await page(co,'http://127.0.0.1:%d/'%PORT)
        await login(po,'Jkgupta&Co','Admin#123')
        await po.evaluate('staffF()');await po.fill('#au','ravi');await po.fill('#ap','pass1');await po.click('.addf button:not(.hli)');await po.wait_for_timeout(700)
        await po.evaluate('logout()');await po.wait_for_timeout(300);await login(po,'ravi','pass1')
        chk('Travel data link shown for staff in office',await po.locator('.trvl').count()==1)
        for n in ['Acme','Beta']:
            await po.evaluate("document.getElementById('nn').value='%s';addC()"%n);await po.wait_for_timeout(500)
        await po.evaluate('trvSendUI()')
        async with po.expect_download() as d:await po.click('text=Download my data file')
        dl=await d.value;take=os.path.join(T,'take.json');await dl.save_as(take)
        tk=json.load(open(take));chk('take file has his data',tk['user']=='ravi' and 'jkg_ravi' in tk['keys'])
        # ---- travel side (no server)
        ct=await mk();pt=await page(ct,'http://127.0.0.1:%d/travel.html'%WEB,OPFS)
        chk('travel build shows Travel mode login',await pt.locator('#tvn').count()==1)
        chk('no server calls needed (LS.on off)',await pt.evaluate('LS.on')==False)
        await pt.fill('#tvn','ravi');await pt.click('#sb .go');await pt.wait_for_timeout(500)
        chk('folder popup asks where to keep data','where should your work be kept' in (await pt.inner_text('#md')).lower())
        await pt.set_input_files('#tvseed',take);await pt.click('#md button:has-text("Choose a folder")');await pt.wait_for_timeout(1200)
        chk('logged in as ravi in travel mode',await pt.evaluate('USER')=='ravi')
        chk('office data loaded from take file',await pt.evaluate("Object.keys(DB.clients).sort().join()")=='Acme,Beta')
        # travel edits: Beta first, later Acme, new Gamma, attendance
        await pt.evaluate("DB.clients['Beta'].note='travel edit';save()");await pt.wait_for_timeout(1100)
        await pt.evaluate("document.getElementById('nn').value='Gamma';addC()");await pt.wait_for_timeout(400)
        await pt.evaluate("attIn()");await pt.wait_for_timeout(600)
        await pt.wait_for_timeout(600)
        info=await pt.evaluate("""(async()=>{const r=await navigator.storage.getDirectory(),h=await r.getDirectoryHandle('travel1');const names=[];for await(const [n] of h.entries())names.push(n);
           const f=await(await h.getFileHandle('jkg-travel-ravi.json')).getFile();return {names,txt:await f.text()}})()""")
        chk('data saved as a file in the chosen folder','jkg-travel-ravi.json' in info['names'])
        chk('daily backup file also written',any('-backup-' in n for n in info['names']))
        fj=json.loads(info['txt']);chk('folder file contains Gamma + attendance','Gamma' in fj['keys']['jkg_ravi']['v'] and 'att_ravi' in fj['keys'])
        # reload -> reopen with remembered folder
        await pt.reload();await pt.wait_for_timeout(800)
        await pt.click('#sb .go');await pt.wait_for_timeout(1500)
        if await pt.evaluate("USER")!='ravi':
            await pt.click('#md button:has-text("same folder")');await pt.wait_for_timeout(1200)
        chk('after reload data still there',await pt.evaluate("Object.keys(DB.clients).sort().join()")=='Acme,Beta,Gamma')
        await pt.evaluate("DB.clients['Acme'].note='travel acme';save()");await pt.wait_for_timeout(900)
        info=await pt.evaluate("""(async()=>{const r=await navigator.storage.getDirectory(),h=await r.getDirectoryHandle('travel1');return await(await(await h.getFileHandle('jkg-travel-ravi.json')).getFile()).text()})()""")
        tf=os.path.join(T,'jkg-travel-ravi.json');open(tf,'w').write(info)
        # ---- meanwhile at the office Beta was edited later than the travel edit
        await po.evaluate("DB.clients['Beta'].note='office newer';save()");await po.wait_for_timeout(800)
        # ---- back at the office: send
        await po.evaluate('trvSendUI()');await po.set_input_files('#tvf2',tf);await po.wait_for_timeout(1500)
        t=await po.inner_text('#tvr');print(t)
        chk('send reports success','Sent to the office server' in t)
        chk('new client Gamma arrived',await po.evaluate("'Gamma' in DB.clients"))
        chk('travel edit (Acme) applied',await po.evaluate("DB.clients['Acme'].note")=='travel acme')
        chk('newer office edit (Beta) kept',await po.evaluate("DB.clients['Beta'].note")=='office newer')
        chk('attendance day arrived',await po.evaluate("Object.keys(attGet('ravi').d).length")>=1)
        # data really on the server: fresh login from another browser
        c3=await mk();p3=await page(c3,'http://127.0.0.1:%d/'%PORT);await login(p3,'ravi','pass1')
        chk('server holds merged data',await p3.evaluate("Object.keys(DB.clients).sort().join()")=='Acme,Beta,Gamma')
        # wrong person's file refused
        bad=json.loads(info);bad['user']='someone';open(os.path.join(T,'jkg-travel-someone.json'),'w').write(json.dumps(bad))
        await po.evaluate('trvSendUI()');await po.set_input_files('#tvf2',os.path.join(T,'jkg-travel-someone.json'));await po.wait_for_timeout(800)
        chk('other person file refused','belongs to someone' in await po.inner_text('#tvr'))
        # admin cannot use travel mode
        await pt.evaluate('logout()');await pt.wait_for_timeout(600);await pt.fill('#tvn','jkgupta&co');await pt.click('#sb .go');await pt.wait_for_timeout(300)
        chk('admin name refused in travel mode','not the admin' in await pt.inner_text('#le'))
        chk('no JS errors',not errs);print(errs)
        await b.close()
    for p in procs:p.terminate()
    bad=[n for n,c in res if not c];print('ALL OK' if not bad else 'SOME FAILED: '+str(bad))
asyncio.run(main())
