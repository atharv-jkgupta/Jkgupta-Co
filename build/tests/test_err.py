from tcommon import *
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900});await ctx.add_init_script(MOCK);await ctx.add_init_script("window.showSaveFilePicker=undefined")
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(700)
        await login(pg,'Jkgupta&Co','JKG@2500')
        await pg.evaluate("""DB.clients['T']={ver:'Prime',accounts:[{label:'H',ledger:'HDFC',lastImport:'',lastTxn:''}],ledgers:['HDFC','Rent'],rules:[{k:'rent',l:'Rent'}],hist:[],pending:0,ledgerUpdated:''};save();pick('T')""")
        async def run(f,tick=True):
            await pg.evaluate("start(0)");await pg.wait_for_timeout(200)
            if tick:await pg.check('#ok1')
            if f:await pg.set_input_files('#sf',TD+f)
            await pg.evaluate("readF(0)");await pg.wait_for_timeout(900);return await pg.inner_text('#msg') if await pg.locator('#msg').count() else ''
        t=await run(None);chk('no file -> asked',len(t)>5,t)
        t=await run('ok.csv',False);chk('not ticked -> asked',len(t)>5,t)
        t=await run('junk.csv');chk('junk -> problem',len(t)>10,t);print(t[:150])
        await pg.click('#msg button');t=await pg.inner_text('#msg');chk('solution shown','What to do' in t,t)
        t=await run('nodrcr.csv');chk('no debit/credit -> problem+solution','Problem' in t,t)
        await pg.click('#msg button');t=await pg.inner_text('#msg');chk('cols solution','Debit' in t)
        await run('ok.csv');chk('csv statement works',await pg.evaluate("S.T&&S.T.length==3"))
        print(await pg.evaluate("S.T.map(t=>[t.date,t.l||'',t.warn?'WARN':''])"))
        chk('balance warning on 3rd row',await pg.evaluate("S.T[2].warn==1"))
        chk('rule applied',await pg.evaluate("S.T[0].l=='Rent'"))
        chk('no JS errors',not errs,errs)
        await b.close();print('ALL OK' if all(res) else 'SOME FAILED')
asyncio.run(main())
