from tcommon import *
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900});await ctx.add_init_script(MOCK)
        await ctx.add_init_script("window.showSaveFilePicker=undefined")
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(800)
        chk('language button exists',await pg.locator('#lgb').count()==1)
        await login(pg,'Jkgupta&Co','JKG@2500')
        await pg.evaluate("""DB.clients['Test Co']={ver:'Prime',accounts:[{label:'HDFC',ledger:'HDFC Bank A/c',lastImport:'',lastTxn:''}],ledgers:['HDFC Bank A/c'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('Test Co');start(0)""");await pg.wait_for_timeout(500)
        n=await pg.locator('#app .hli').count();print('i buttons on bank import page',n);chk('i buttons present',n>=5)
        await pg.locator('#app .hli').first.click();await pg.wait_for_timeout(200);chk('popover shows',await pg.locator('.hlpop').count()==1);print(await pg.inner_text('.hlpop'))
        await pg.keyboard.press('Escape');chk('popover closes',await pg.locator('.hlpop').count()==0)
        await pg.click('#lgb');await pg.wait_for_timeout(500)
        body=await pg.inner_text('#app');chk('page turns Hindi','तारीख' in body or 'बैलेंस' in body,body[:200])
        await pg.locator('#app .hli').first.click();await pg.wait_for_timeout(200);p=await pg.inner_text('.hlpop');print(p);chk('help in Hindi',any('ऀ'<=c<='ॿ' for c in p))
        await pg.keyboard.press('Escape')
        # user data is not translated
        chk('client name untouched',await pg.evaluate("document.body.innerText.includes('Test Co')"))
        # navigating while Hindi stays Hindi
        await pg.evaluate("home()");await pg.wait_for_timeout(500);chk('home Hindi',await pg.evaluate("/क्लाइंट ट्रैकर/.test(document.body.innerText)"),(await pg.inner_text('#app'))[:700]+str(await pg.evaluate('[LNG.get(),TRB]')))
        print(await pg.evaluate("(()=>{try{trAll();return 'ok '+document.querySelector('#app').innerText.slice(0,60)}catch(e){return 'ERR '+e.stack}})()"))
        await pg.screenshot(path='out/hindi_home.png')
        # problem popup
        await pg.evaluate("alert('Nothing is ready to export yet.')");await pg.wait_for_timeout(300);t=await pg.inner_text('#md');print(t);chk('problem shows fix',('क्या करें' in t) and 'लेजर' in t)
        await pg.click('#md button');await pg.click('#lgb');await pg.wait_for_timeout(500)
        chk('back to English',await pg.evaluate("/My clients|Client tracker/.test(document.body.innerText)")); 
        await pg.evaluate("alert('Client already exists.')");await pg.wait_for_timeout(200);t=await pg.inner_text('#md');chk('English problem+fix','What to do' in t and 'different name' in t,t)
        await pg.click('#md button')
        await pg.evaluate("setTimeout(()=>{Promise.reject(new Error('boom test'))},10)");await pg.wait_for_timeout(400);chk('unexpected error explained',await pg.evaluate("document.getElementById('md').innerText.includes('What to do')"))
        await pg.click('#md button')
        # reco & gst pages have i buttons
        for js,sel in [("reco()",8),("pick('Test Co');gst()",3),("loop()",1),("pc()",1)]:
            await pg.evaluate(js);await pg.wait_for_timeout(400);print(js,await pg.locator('.hli').count())
        chk('no JS errors',[e for e in errs if 'boom' not in e]==[],errs)
        await b.close();print('ALL OK' if all(res) else 'SOME FAILED')
asyncio.run(main())
