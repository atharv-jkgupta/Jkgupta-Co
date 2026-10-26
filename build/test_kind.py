from tcommon import *
def gstin(b):
    ch='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';t=0
    for i,c in enumerate(b):
        d=ch.index(c)*(1 if i%2==0 else 2);t+=d//36+d%36
    return b+ch[(36-t%36)%36]
KAR=gstin('29ABCDE1234F1Z')
G=lambda g,nm,inv,dt,val,tx,i,c,s,itc='Yes',rc='No':[g,nm,inv,'Regular',dt,val,'Telangana',rc,tx,i,c,s,0,"Apr'26",'09/05/2026',itc,'','100%','','']
def sheet(rows):
    return [['Goods and Services']+['']*19,['']*20,['']*20,['Taxable inward supplies received from registered persons']+['']*19,
     ['GSTIN of supplier','Trade/Legal name','Invoice Details','','','','Place of supply','Supply Attract Reverse Charge','Taxable Value (₹)','Tax Amount','','','','GSTR-1/IFF/GSTR-5 Period','GSTR-1/IFF/GSTR-5 Filing Date','ITC Availability','Reason','Applicable % of Tax Rate','Source','IRN'],
     ['','','Invoice number','Invoice type','Invoice Date','Invoice Value(₹)','','','','Integrated Tax(₹)','Central Tax(₹)','State/UT Tax(₹)','Cess(₹)','','','','','','','']]+rows+[['']*20]
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900},accept_downloads=True);await ctx.add_init_script(MOCK)
        await ctx.add_init_script("window.showSaveFilePicker=undefined;window.alert=m=>{window.__alerts=(window.__alerts||[]).concat([m])}")
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(600)
        await login(pg,'Jkgupta&Co','JKG@2500')
        async def dlx(js):
            async with pg.expect_download(timeout=8000) as d: await pg.evaluate(js)
            x=await d.value;p=await x.path();return open(p,'rb').read().decode('latin-1')
        await pg.evaluate("""()=>{DB.bx={sheets:[{id:'sA',company:'PS ENTERPRISES',gstin:'27ANTPR2552C1ZR',month:'2026-09-01',bills:[]}],cur:'sA'};save();bx()}""");await pg.wait_for_timeout(300)
        mk=lambda no,k,party:{"kind":k,"no":no,"date":"2026-09-02","party":party,"gstin":"27AAKCB2584K1Z9","items":[{"hsn":"9954","qty":1,"unit":"LS","taxable":1000,"igst":0,"cgst":0.09,"sgst":0.09}],"warn":[]}
        await pg.evaluate("([a,b])=>{BXP=[a,b];bxDraw()}",[mk('S1','sales','BLOOMBAY'),mk('P1','purchase','SUPPLIER X')]);await pg.wait_for_timeout(200)
        chk('bill card has Sales/Purchase choice',await pg.evaluate("document.querySelectorAll('.bxc select').length")==2)
        await pg.evaluate("bxAll()");await pg.wait_for_timeout(300)
        r=await pg.evaluate("DB.bx.sheets.map(s=>[s.kind||'sales',s.bills.map(b=>b.no).join(',')])")
        chk('sales bill stays in sales sheet, purchase goes to its own sheet',r==[['sales','S1'],['purchase','P1']],str(r))
        chk('purchase sheet has same company, GSTIN, month',await pg.evaluate("(()=>{const p=DB.bx.sheets[1],s=DB.bx.sheets[0];return p.company==s.company&&p.gstin==s.gstin&&p.month==s.month})()"))
        await pg.evaluate("([a])=>{BXP=[a];bxDraw()}",[mk('P2','purchase','SUPPLIER X')]);await pg.evaluate("bxAll()");await pg.wait_for_timeout(200)
        r=await pg.evaluate("DB.bx.sheets.map(s=>[s.kind||'sales',s.bills.map(b=>b.no).join(',')])")
        chk('second purchase bill reuses the purchase sheet',r==[['sales','S1'],['purchase','P1,P2']],str(r))
        await pg.evaluate("DB.bx.cur=DB.bx.sheets[1].id;save();bxDraw()")
        await pg.evaluate("([a])=>{BXP=[a];bxDraw()}",[mk('S2','sales','BLOOMBAY')]);await pg.evaluate("bxAll()");await pg.wait_for_timeout(200)
        r=await pg.evaluate("DB.bx.sheets.map(s=>[s.kind||'sales',s.bills.map(b=>b.no).join(',')])")
        chk('from the purchase sheet, a sales bill goes to the sales sheet',r==[['sales','S1,S2'],['purchase','P1,P2']],str(r))
        x=await pg.evaluate("bxSheetXml(DB.bx.sheets[1]).sheet");chk('purchase sheet title says PURCHASE','PS ENTERPRISES - PURCHASE' in x)
        x=await pg.evaluate("bxSheetXml(DB.bx.sheets[0]).sheet");chk('sales sheet title unchanged','PURCHASE' not in x)
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
