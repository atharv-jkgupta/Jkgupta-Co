import asyncio
exec(open('/home/claude/app/build/test_app.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,x=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,x if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900});await ctx.add_init_script(MOCK)
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:(errs.append('NATIVE DIALOG '+d.message),asyncio.ensure_future(d.accept())))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(500);await login(pg,'Jkgupta&Co','JKG@2500')
        chk('empty home shows welcome card',await pg.locator('.card.empty.big').count()==1)
        await pg.evaluate("DB.clients['Pratap & Sons']={ver:'Tally Prime',accounts:[{label:'HDFC BANK A\\\\C NO. - 4673',ledger:'HDFc',lastImport:'',lastTxn:''},{label:'ICICI BANK A/C NO-005233',ledger:'icic',lastImport:'2026-10-10',lastTxn:'2026-10-09'}],ledgers:[],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('Pratap & Sons')")
        await pg.wait_for_timeout(500);await pg.screenshot(path='out/bank_cards.png',full_page=True)
        chk('2 bank cards',await pg.locator('.bk2').count()==2)
        chk('no red Delete text button on rows',await pg.locator('.bk2 button:has-text("Delete")').count()==0)
        await pg.locator('.bk2 .ib2').first.click();await pg.wait_for_timeout(300);chk('confirm modal shown',await pg.locator('#md.o button.danger').count()==1)
        await pg.screenshot(path='out/del_modal.png')
        await pg.click('#md button.danger');await pg.wait_for_timeout(500)
        chk('account removed',await pg.locator('.bk2').count()==1)
        await pg.click('.toast button');await pg.wait_for_timeout(400);chk('undo restores',await pg.locator('.bk2').count()==2)
        # delete client needs typed name
        await pg.evaluate('delC()');await pg.wait_for_timeout(200);chk('delete-client button disabled until name typed',await pg.locator('#dcb').is_disabled())
        await pg.fill('#dcn','pratap & sons');chk('enabled after typing',not await pg.locator('#dcb').is_disabled())
        await pg.click('#dcb');await pg.wait_for_timeout(500);chk('client deleted',await pg.evaluate("!DB.clients['Pratap & Sons']"))
        await pg.click('.toast button');await pg.wait_for_timeout(500);chk('client undo',await pg.evaluate("!!DB.clients['Pratap & Sons']"))
        # staff delete
        await pg.evaluate('staffF()');await pg.fill('#au','ravi');await pg.fill('#ap','pass1');await pg.click('.addf button');await pg.wait_for_timeout(400)
        await pg.click('text=Delete >> nth=0');await pg.wait_for_timeout(300);chk('staff delete is typed confirm',await pg.locator('#dub').is_disabled())
        await pg.fill('#dun','ravi');await pg.click('#dub');await pg.wait_for_timeout(500);chk('staff deleted',await pg.evaluate("!('ravi' in U())"))
        await pg.click('.toast button');await pg.wait_for_timeout(500);chk('staff undo',await pg.evaluate("'ravi' in U()"))
        chk('no JS errors / native dialogs',not errs);print(errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
