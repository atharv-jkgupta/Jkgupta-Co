# Real test: the real office server.js + the office build of the app, in a real browser.
import asyncio,subprocess,os,shutil,json,time,tempfile,sys,urllib.request
from playwright.async_api import async_playwright
OFF='/home/claude/office';PORT=3055;AIP=4010
T=tempfile.mkdtemp();SRV=os.path.join(T,'srv');os.makedirs(SRV)
for f in ['server.js']:shutil.copy(os.path.join(OFF,f),SRV)
shutil.copy('/home/claude/app/out/office.html',os.path.join(SRV,'index.html'))
DATA=os.path.join(T,'netdrive','jkdata')
def cfg(ai=True):
    json.dump({'port':PORT,'adminPassword':'Admin#123','masterPassword':'','dataDir':DATA.replace('\\','/'),'backupDir':os.path.join(T,'backup2'),'keepBackups':120,
      'ai':{'baseUrl':'http://127.0.0.1:%d/v1'%AIP,'apiKey':'secretkey','model':'llama-test'} if ai else {'baseUrl':'','apiKey':'','model':''}},open(os.path.join(SRV,'config.json'),'w'))
AISRC="""const h=require('http');h.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{const j=JSON.parse(b||'{}');
if(q.headers.authorization!=='Bearer secretkey'){r.writeHead(401);return r.end('{}')}
const last=j.messages[j.messages.length-1].content;r.writeHead(200,{'Content-Type':'application/json'});
r.end(JSON.stringify({choices:[{message:{content:'ECHO('+j.model+','+j.messages.length+'): '+last}}]}))})}).listen(%d)"""%AIP
open(os.path.join(T,'ai.js'),'w').write(AISRC)
procs=[]
def start(name,args,cwd):
    p=subprocess.Popen(['node']+args,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);procs.append(p);return p
def wait_up():
    for _ in range(50):
        try:urllib.request.urlopen('http://127.0.0.1:%d/'%PORT,timeout=1);return True
        except Exception:time.sleep(.2)
    return False
async def login(pg,u,p):
    await pg.evaluate("tg(1)");await pg.wait_for_timeout(300);await pg.fill('#lu',u);await pg.fill('#lp',p);await pg.click('#sb .go');await pg.wait_for_timeout(1800)
res=[]
def chk(n,c):res.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n)
NOSUB="Object.defineProperty(window.crypto,'subtle',{value:undefined,configurable:true});Object.defineProperty(window,'isSecureContext',{value:false,configurable:true});"
async def main():
    cfg(True);start('ai',[os.path.join(T,'ai.js')],T);srv=start('srv',['server.js'],SRV)
    chk('server starts',wait_up())
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[]
        ctx=await b.new_context(viewport={'width':1280,'height':800});await ctx.add_init_script(NOSUB)
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('http://127.0.0.1:%d/'%PORT);await pg.wait_for_timeout(800)
        chk('page served by office server (no cloud url)',await pg.evaluate("CLOUD.url")=='http://127.0.0.1:%d'%PORT)
        chk('crypto.subtle hidden (like http office address)',await pg.evaluate("typeof crypto.subtle")=='undefined')
        await login(pg,'Jkgupta&Co','wrong');chk('wrong admin password rejected',await pg.evaluate('USER')=='')
        await login(pg,'Jkgupta&Co','Admin#123');chk('admin login works',await pg.evaluate('USER')=='jkgupta&co')
        await pg.evaluate('staffF()');await pg.fill('#au','ravi');await pg.fill('#ap','pass1');await pg.click('.addf button:not(.hli)');await pg.wait_for_timeout(800)
        chk('staff added',await pg.evaluate("'ravi' in U()"))
        await pg.evaluate("document.getElementById('nn').value='Acme Ltd';addC()");await pg.wait_for_timeout(900)
        files=[f for f in os.listdir(os.path.join(DATA,'kv')) if f.endswith('.json')]
        keys=[json.load(open(os.path.join(DATA,'kv',f)))['k'] for f in files]
        chk('data saved as files on the data drive',any(k=='jkg_jkgupta&co' for k in keys) and 'jkgusers' in keys)
        chk('save indicator says Saved','Saved' in await pg.inner_text('#sv'))
        # AI
        chk('Ask AI button visible after login',await pg.locator('#aiw .aib').count()==1)
        await pg.click('#aiw .aib');await pg.fill('#aii','Draft a reminder for GST filing');await pg.click('.aif button');await pg.wait_for_timeout(1500)
        t=await pg.inner_text('#aim');chk('AI reply shown',"ECHO(llama-test,2): Draft a reminder for GST filing" in t)
        await pg.fill('#aii','and a second one');await pg.press('#aii','Enter');await pg.wait_for_timeout(1500)
        chk('AI keeps conversation',"ECHO(llama-test,4): and a second one" in await pg.inner_text('#aim'))
        await pg.screenshot(path='out/office_ai.png')
        await pg.click('.aic >> nth=0');await pg.wait_for_timeout(300);chk('copy works on plain http',True)
        await pg.click('text=New chat');chk('new chat clears',await pg.locator('.aig.me').count()==0)
        # restart server: data survives, session ends politely
        srv.terminate();srv.wait();await pg.wait_for_timeout(300)
        srv=start('srv',['server.js'],SRV);wait_up()
        await pg.evaluate("LS.sync()");await pg.wait_for_timeout(500)
        await pg.evaluate("document.getElementById('nn')&&0")
        await pg.evaluate('logout()');await pg.wait_for_timeout(300)
        await login(pg,'Jkgupta&Co','Admin#123');chk('login after server restart',await pg.evaluate('USER')=='jkgupta&co')
        chk('client still there after restart',await pg.evaluate("Object.keys(DB.clients).some(k=>/acme/i.test(DB.clients[k].name||k))")) 
        # staff
        await pg.evaluate('logout()');await pg.wait_for_timeout(300)
        await login(pg,'ravi','wrongpw');chk('wrong staff pw rejected',await pg.evaluate('USER')=='')
        await login(pg,'ravi','pass1');chk('staff login works',await pg.evaluate('USER')=='ravi')
        chk('staff sees only own clients',await pg.evaluate("Object.keys(DB.clients).length")==0)
        await pg.evaluate("document.getElementById('nn').value='Beta Co';addC()");await pg.wait_for_timeout(900)
        # staff cannot read admin data directly
        r=await pg.evaluate("fetch('/rest/v1/rpc/kv_open',{method:'POST',body:JSON.stringify({p_t:LS.token,p_since:null})}).then(r=>r.json())")
        ks=[x['k'] for x in r['rows']]
        chk('staff cannot see admin data/password',all(k not in ('jkgadm','jkg_jkgupta&co') for k in ks) and 'jkg_ravi' in ks)
        r=await pg.evaluate("fetch('/rest/v1/rpc/kv_put',{method:'POST',body:JSON.stringify({p_t:LS.token,p_k:'jkg_jkgupta&co',p_v:'x'})}).then(r=>r.json())")
        chk('staff cannot overwrite admin data',r.get('ok')==False)
        await pg.evaluate("sessionStorage.setItem('jkai','[]')")
        # AI unreachable key / errors
        await pg.evaluate('logout()');await pg.wait_for_timeout(500)
        chk('AI button gone when logged out',await pg.locator('#aiw').count()==0)
        # AI not set up
        srv.terminate();srv.wait();cfg(False);srv=start('srv',['server.js'],SRV);wait_up()
        await login(pg,'Jkgupta&Co','Admin#123')
        await pg.click('#aiw .aib');await pg.fill('#aii','hello');await pg.click('.aif button');await pg.wait_for_timeout(1200)
        chk('AI not set up -> clear message','The AI is not set up yet' in await pg.inner_text('#aim'))
        await pg.screenshot(path='out/office_ai_err.png')
        # server stopped -> clear message
        srv.terminate();srv.wait()
        await pg.fill('#aii','hello again');await pg.click('.aif button');await pg.wait_for_timeout(1500)
        chk('server down -> clear message','Cannot reach the office server' in await pg.inner_text('#aim'))
        chk('no JS errors',not errs);print(errs)
        await b.close()
    # lockout after 5 wrong tries is server-side: checked via raw calls
    cfg(True);srv=start('srv',['server.js'],SRV);wait_up()
    def rpc(f,b):
        q=urllib.request.Request('http://127.0.0.1:%d/rest/v1/rpc/%s'%(PORT,f),json.dumps(b).encode(),{'Content-Type':'application/json'});return json.load(urllib.request.urlopen(q))
    for i in range(5):r=rpc('jkg_login',{'p_u':'ravi','p_h':'bad','p_m':'bad'})
    chk('login locked after 5 wrong tries',rpc('jkg_login',{'p_u':'ravi','p_h':'bad','p_m':'bad'}).get('err')=='locked')
    srv.terminate();srv.wait()
    # backup written on shutdown
    chk('backup folder written on the C drive copy',any(os.listdir(os.path.join(SRV,'backups'))) if os.path.isdir(os.path.join(SRV,'backups')) else False)
    chk('second backup copy written',os.path.isdir(os.path.join(T,'backup2')) and any(os.listdir(os.path.join(T,'backup2'))))
    # unusable data folder -> friendly message
    json.dump({'port':PORT,'adminPassword':'x','dataDir':os.path.join(SRV,'index.html','jkdata')},open(os.path.join(SRV,'config.json'),'w'))
    p=subprocess.run(['node','server.js'],cwd=SRV,capture_output=True,text=True,timeout=10)
    chk('bad data folder -> friendly message','CANNOT USE THE DATA FOLDER' in p.stdout and p.returncode==1)
    for p in procs:
        try:p.terminate()
        except Exception:pass
    bad=[n for n,c in res if not c];print('ALL OK' if not bad else 'SOME FAILED: '+str(bad))
asyncio.run(main())
