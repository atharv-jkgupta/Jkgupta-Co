import asyncio
exec(open('/home/claude/app/build/test_app.py').read().split('async def main')[0]);TD='/home/claude/app/testdata/'
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,x=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,x if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900});await ctx.add_init_script(MOCK)
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(600)
        await login(pg,'Jkgupta&Co','JKG@2500')
        async def parse(fn):
            await pg.evaluate("tlNew()");await pg.locator('#md input[type=file]').set_input_files(TD+fn);await pg.wait_for_timeout(700)
            r=await pg.evaluate("TLS.P?{n:TLS.P.ledgers.length,banks:TLS.P.banks.map(b=>b.name),co:TLS.P.company||'',g:TLS.P.hasGroup,no:TLS.P.banks.map(b=>b.no)}:null");return r
        for fn,exp in [('tally_masters_utf16.xml',['HDFC Bank A/c','SBI OD A/c']),('tally_masters_utf8.xml',['HDFC Bank A/c','SBI OD A/c']),('tally_ledgers_under.xlsx',['HDFC Bank A/c','SBI OD A/c']),('tally_chart_indented.xlsx',['HDFC Bank A/c','ICICI CC A/c','SBI OD A/c'])]:
            r=await parse(fn);print(fn,r);chk(fn+' banks',r and r['banks']==exp,r)
        r=await parse('tally_names_only.xlsx');print(r);chk('names-only guesses banks',r and set(r['banks'])=={'HDFC Bank A/c','Kotak Mahindra Bank CA'},r)
        r=await parse('tally_masters_utf16.xml');chk('xml company + account no',r['co']=='ABC Traders & Co' and r['no'][0]=='50100123456789',r)
        await pg.screenshot(path='out/tally_modal.png')
        await pg.click('text=Create client');await pg.wait_for_timeout(500)
        d=await pg.evaluate("JSON.stringify(DB.clients['ABC Traders & Co'])");print(d[:400])
        c=await pg.evaluate("DB.clients['ABC Traders & Co']");chk('client created w/ 2 banks, 5 ledgers',c and len(c['accounts'])==2 and len(c['ledgers'])==5,c)
        chk('bank label has last4',c['accounts'][0]['label']=='HDFC Bank A/c (6789)',c['accounts'][0]['label'])
        # existing client path
        await pg.evaluate("document.getElementById('nn').value='Second Co';addC()");await pg.wait_for_timeout(300)
        await pg.locator('.tld input[type=file]').set_input_files(TD+'tally_ledgers_under.xlsx');await pg.wait_for_timeout(700)
        await pg.screenshot(path='out/tally_dash.png',full_page=True)
        await pg.click('text=Import >> nth=-1');await pg.wait_for_timeout(500)
        c=await pg.evaluate("DB.clients['Second Co']");chk('existing client import',len(c['accounts'])==2 and len(c['ledgers'])==5,c)
        # re-import same file: banks not duplicated
        await pg.locator('.tld input[type=file]').set_input_files(TD+'tally_ledgers_under.xlsx');await pg.wait_for_timeout(700);await pg.click('text=Import >> nth=-1');await pg.wait_for_timeout(400)
        c=await pg.evaluate("DB.clients['Second Co']");chk('no duplicate banks on re-import',len(c['accounts'])==2,len(c['accounts']))
        chk('no JS errors',not errs);print(errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
