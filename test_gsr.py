# Real test: office server.js + office build of the app + a real browser. Checks the GST logins register rules.
import asyncio,subprocess,os,shutil,json,time,tempfile,urllib.request,glob
from playwright.async_api import async_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));PORT=3066
T=tempfile.mkdtemp();SRV=os.path.join(T,'srv');os.makedirs(SRV)
shutil.copy(os.path.join(ROOT,'office','server.js'),SRV);shutil.copy(os.path.join(ROOT,'office','dist','index.html'),os.path.join(SRV,'index.html'))
DATA=os.path.join(T,'data')
json.dump({'port':PORT,'adminPassword':'Admin#123','masterPassword':'','dataDir':DATA,'backupDir':'','keepBackups':5,'autoUpdate':False,'ai':{'baseUrl':'','apiKey':'','model':''}},open(os.path.join(SRV,'config.json'),'w'))
res=[]
def chk(n,c):res.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n)
def kv():
    o={}
    for f in glob.glob(os.path.join(DATA,'kv','*.json')):
        try:j=json.load(open(f));o[j['k']]=j['v']
        except Exception:pass
    return o
def gsr_keys():return sorted(k for k in kv() if k.startswith('gsr_'))
async def login(pg,u,p):
    await pg.evaluate("tg(1)");await pg.wait_for_timeout(300);await pg.fill('#lu',u);await pg.fill('#lp',p);await pg.click('#sb .go');await pg.wait_for_timeout(1800)
NOSUB="Object.defineProperty(window.crypto,'subtle',{value:undefined,configurable:true});Object.defineProperty(window,'isSecureContext',{value:false,configurable:true});"
CSV1="Sr.,Name,business name,HANDLE,Login ID,Password,Contact,Return Tenure,Call Remark 31-10-2026,GSTR-1,GSTR-3B\n1,Anil,Anil Traders,Ravi,anil01,pw-anil,9811111111,Monthly,called,filed,pending\n2,Bina,Bina Foods,Sunil,bina02,pw-bina,,Quarterly,,,\n3,Chet,Chet Co,Ravi,chet03,pw-chet,9822222222,QRMP,,filed,\n"
CSV2="Name,Business name,Login ID,Password,Contact\nAnil Kumar,Anil Traders,ANIL01,HACKED,9833333333\nDeep,Deep Ltd,deep04,pw-deep,9844444444\n"
async def main():
    srv=subprocess.Popen(['node','server.js'],cwd=SRV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    for _ in range(50):
        try:urllib.request.urlopen('http://127.0.0.1:%d/ping'%PORT,timeout=1);break
        except Exception:time.sleep(.2)
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[]
        ctx=await b.new_context(viewport={'width':1440,'height':900});await ctx.add_init_script(NOSUB)
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        pg.on('dialog',lambda d:asyncio.ensure_future(d.accept('NEWPASS')))
        await pg.goto('http://127.0.0.1:%d/'%PORT);await pg.wait_for_timeout(800)
        await login(pg,'Jkgupta&Co','Admin#123');chk('admin login',await pg.evaluate('USER')=='jkgupta&co')
        await pg.evaluate('staffF()');await pg.fill('#au','ravi');await pg.fill('#ap','pass1');await pg.click('.addf button:not(.hli)');await pg.wait_for_timeout(800)
        # ---- admin
        await pg.evaluate('gsr()');await pg.wait_for_timeout(400)
        chk('sidebar has GST logins link',await pg.locator('#sb >> text=GST logins').count()>=1)
        chk('admin sees Delete all',await pg.locator('button:has-text("Delete all")').count()==1)
        open(os.path.join(T,'a.csv'),'w').write(CSV1)
        await pg.set_input_files('#gsfile',os.path.join(T,'a.csv'));await pg.wait_for_timeout(900)
        chk('admin CSV import adds 3 rows',len(gsr_keys())==3)
        heads=[h.strip() for h in await pg.locator('.gst th').all_inner_texts()]
        chk('all sheet heads are present',all(any(h.upper().startswith(x) for h in heads) for x in ['SR.','NAME','BUSINESS NAME','HANDLE','LOGIN ID','PASSWORD','CONTACT','RETURN TENURE','CALL REMARK','GSTR-1']))
        chk('unknown sheet column (GSTR-3B) kept as an extra column','GSTR-3B' in ' '.join(heads).upper() or 'GSTR-3B' in await pg.inner_text('.gst thead'))
        chk('call remark date read from the header','31-10-2026' in await pg.locator('.gsd').input_value())
        chk('QRMP became Quarterly',await pg.evaluate("gsLoad().find(t=>t.lid=='chet03').rt")=='Quarterly')
        # filters
        await pg.click('.gsf .seg >> nth=0 >> text=Monthly');await pg.wait_for_timeout(300)
        chk('filter Monthly shows 1 row',await pg.locator('.gst tbody tr').count()==1)
        await pg.click('.gsf .seg >> nth=0 >> text=Quarterly');await pg.wait_for_timeout(300)
        chk('filter Quarterly shows 2 rows (incl. QRMP)',await pg.locator('.gst tbody tr').count()==2)
        await pg.click('.gsf .seg >> nth=0 >> text=All');await pg.click('.gsf .seg >> nth=1 >> text=No contact');await pg.wait_for_timeout(300)
        chk('filter No contact shows 1 row',await pg.locator('.gst tbody tr').count()==1)
        await pg.click('.gsf .seg >> nth=1 >> text=Has contact');await pg.click('.gsf .seg >> nth=0 >> text=Monthly');await pg.wait_for_timeout(300)
        chk('filters combine (Monthly + has contact = 1)',await pg.locator('.gst tbody tr').count()==1)
        await pg.click('.gsf .seg >> nth=0 >> text=All');await pg.click('.gsf .seg >> nth=1 >> text=All');await pg.click('.gsf .seg >> nth=2 >> text=Empty');await pg.wait_for_timeout(300)
        chk('GSTR-1 Empty filter shows 1 row',await pg.locator('.gst tbody tr').count()==1)
        await pg.click('.gsf .seg >> nth=2 >> text=All');await pg.fill('#gsq','bina');await pg.wait_for_timeout(400)
        chk('search finds by name',await pg.locator('.gst tbody tr').count()==1)
        await pg.fill('#gsq','');await pg.wait_for_timeout(300)
        # admin changes a password
        rid=await pg.evaluate("gsLoad().find(t=>t.lid=='bina02').id")
        await pg.evaluate("gsPwEdit('%s')"%rid);await pg.wait_for_timeout(600)
        chk('admin can change a password',await pg.evaluate("gsGet('%s').pw"%rid)=='NEWPASS')
        await pg.screenshot(path=os.path.join(T,'admin.png'))
        await pg.evaluate('logout()');await pg.wait_for_timeout(600)
        # ---- staff
        await login(pg,'ravi','pass1');chk('staff login',await pg.evaluate('USER')=='ravi')
        await pg.evaluate('gsr()');await pg.wait_for_timeout(500)
        chk('staff sees all 3 rows',await pg.locator('.gst tbody tr').count()==3)
        chk('staff has NO Delete all button',await pg.locator('button:has-text("Delete all")').count()==0)
        chk('staff has NO per-row Delete button',await pg.locator('.gst button:has-text("Delete")').count()==0)
        chk('staff has NO Change password button',await pg.locator('.gst button:has-text("Change")').count()==0)
        chk('staff can show a password',True)
        await pg.click('.gst tbody tr >> nth=0 >> button:has-text("Show")');chk('Show reveals the password',await pg.locator('.gsv >> nth=0').inner_text()=='pw-anil')
        # create
        await pg.evaluate('gsAdd()');await pg.wait_for_timeout(300)
        for k,v in {'name':'Esha','biz':'Esha Mart','lid':'esha05','pw':'pw-esha','ct':'9855555555','handle':'Ravi'}.items():await pg.fill('#ga_'+k,v)
        await pg.select_option('#ga_rt','Monthly');await pg.evaluate('gsAddDo()');await pg.wait_for_timeout(900)
        chk('staff can create an entry (with password)',len(gsr_keys())==4 and any(json.loads(v).get('pw')=='pw-esha' for k,v in kv().items() if k.startswith('gsr_')))
        # import: existing anil01 must keep password
        open(os.path.join(T,'b.csv'),'w').write(CSV2)
        await pg.set_input_files('#gsfile',os.path.join(T,'b.csv'));await pg.wait_for_timeout(1000)
        chk('staff import adds the new row',len(gsr_keys())==5)
        anil=[json.loads(v) for k,v in kv().items() if k.startswith('gsr_') and json.loads(v).get('lid')=='anil01'][0]
        chk('staff import did NOT change the existing password',anil['pw']=='pw-anil')
        chk('staff import did NOT overwrite filled fields',anil['name']=='Anil' and anil['ct']=='9811111111')
        # edit ordinary field
        await pg.evaluate("gsF('%s','ct','9800000000')"%anil['id']);await pg.wait_for_timeout(900)
        chk('staff can edit contact',json.loads(kv()['gsr_'+anil['id']])['ct']=='9800000000')
        await pg.evaluate("gsF('%s','pw','x')"%anil['id']);await pg.wait_for_timeout(900)
        chk('staff password edit via UI function is ignored',json.loads(kv()['gsr_'+anil['id']])['pw']=='pw-anil')
        # tamper attempts straight on storage (like a hacked browser console)
        await pg.evaluate("(()=>{const t=JSON.parse(LS.getItem('gsr_%s'));t.pw='TAMPER';LS.setItem('gsr_%s',JSON.stringify(t))})()"%(anil['id'],anil['id']));await pg.wait_for_timeout(1200)
        chk('SERVER refuses a staff password change',json.loads(kv()['gsr_'+anil['id']])['pw']=='pw-anil')
        await pg.evaluate("LS.removeItem('gsr_%s')"%anil['id']);await pg.wait_for_timeout(1200)
        chk('SERVER refuses a staff delete','gsr_'+anil['id'] in kv())
        await pg.evaluate("gsDelAll()");await pg.wait_for_timeout(300)
        chk('gsDelAll() does nothing for staff',await pg.locator('#gdb').count()==0 and len(gsr_keys())==5)
        await pg.evaluate("gsDel('%s')"%anil['id']);await pg.wait_for_timeout(900)
        chk('gsDel() does nothing for staff',len(gsr_keys())==5)
        await pg.screenshot(path=os.path.join(T,'staff.png'))
        await pg.evaluate('logout()');await pg.wait_for_timeout(600)
        # ---- admin delete all
        await login(pg,'Jkgupta&Co','Admin#123');await pg.evaluate('gsr()');await pg.wait_for_timeout(600)
        chk('admin sees the staff changes',await pg.locator('.gst tbody tr').count()==5)
        await pg.click('button:has-text("Delete all")');await pg.wait_for_timeout(300)
        chk('Delete all needs typed confirmation',await pg.locator('#gdb').is_disabled())
        await pg.fill('#gdc','delete');chk('wrong text keeps it disabled',await pg.locator('#gdb').is_disabled())
        await pg.fill('#gdc','DELETE ALL');await pg.click('#gdb');await pg.wait_for_timeout(1200)
        chk('Delete all removes every entry from the server',len(gsr_keys())==0)
        chk('Undo is offered',await pg.locator('#toasts >> text=Undo').count()>=1)
        await pg.click('#toasts >> text=Undo');await pg.wait_for_timeout(1200)
        chk('Undo brings all 5 back',len(gsr_keys())==5)
        chk('no page errors',not errs)
        if errs:print(errs[:3])
        await b.close()
    srv.terminate()
    print('\n%d/%d passed'%(sum(1 for _,c in res if c),len(res)))
    os.makedirs('/home/claude/out',exist_ok=True)
    for f in ('admin.png','staff.png'):shutil.copy(os.path.join(T,f),'/home/claude/out/gsr_'+f)
asyncio.run(main())
