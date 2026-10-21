from tcommon import *
H=['DATE','BILL NO','PARTY NAME','GSTIN NO','HSN CO','QTY','UNIT','TAXABLE AN','IGST RATE','IGST AMT','CGST RATE','CGST AMT','SGST RATE','SGST AMT','TOTAL']
ITEMWISE=[['INDIA TRADING'],['27AABFI1006M1ZM'],[],H,
 ['','','','','40081110',3,'ROLL','11,556.00',0,0,9,1040.04,9,1040.04,''],
 ['','','','','35069190',1,'Tin',1150,0,0,9,103.5,9,103.5,''],
 ['24-08-2026','151/26-27','ACCU-TECH','27AANCA0418J1ZO','','','','12,706.00','','0','','1143.54','','1143.54','14,993.08'],
 ['','','','','40081110',25,'SQM',12625,0,0,9,1136.25,9,1136.25,''],
 ['24-08-2026','152/26-27','ACCU-TECH','27AANCA0418J1ZO','','','',12625,'',0,'',1136.25,'',1136.25,14897.5],
 ['','','','','68061000',15,'BAG',14688,0,0,9,1321.92,9,1321.92,''],
 ['26-08-2026','153/26-27','LEO ENT','27AAZHA5736J1ZN','','','',14000,'',0,'',1260,'',1260,16520],
 ['','','','','99',1,'NOS',500,0,0,9,45,9,45,''],
 [None,'','Grand Total','','','','',40000]]
FLAT=[['Sales'],H[:2]+H[2:4]+['TAXABLE AMT','IGST AMT','CGST AMT','SGST AMT','TOTAL'],
 ['24-08-2026','901','ABC','27AANCA0418J1ZO',1000,0,90,90,1180],['25-08-2026','902','XYZ','27AAZHA5736J1ZN',2000,0,180,180,2360]]
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900});await ctx.add_init_script(MOCK);await ctx.add_init_script("window.showSaveFilePicker=undefined")
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(700)
        await login(pg,'Jkgupta&Co','JKG@2500')
        r=await pg.evaluate("rows=>{const x=rcGstRows(rows,'books',1);return{n:x.rows.length,inv:x.rows.map(o=>[o.inv,o.taxable,o.igst,o.cgst,o.sgst,o.items.length]),notes:x.notes.map(n=>n.lvl+': '+n.msg)}}",ITEMWISE);print(r)
        chk('item-wise: 3 invoices',r['n']==3)
        chk('151/26-27 taxable 12706 (not 25331)',r['inv'][0][1]==12706)
        chk('commas stripped, tax from total row',abs(r['inv'][0][3]-1143.54)<0.01)
        chk('items merged into bill',r['inv'][0][5]==2 and r['inv'][1][5]==1)
        chk('banner says item-wise',any('item-wise' in n for n in r['notes']))
        chk('mismatch warning for 153 (items 14688 vs total 14000)',any('153/26-27' in n and n.startswith('warn') for n in r['notes']))
        chk('trailing item line warned',any('end of the sheet' in n for n in r['notes']))
        chk('no "left out" for item lines',not any('no invoice number' in n for n in r['notes']))
        f=await pg.evaluate("rows=>{const x=rcGstRows(rows,'books',1);return{n:x.rows.length,t:x.rows.map(o=>[o.inv,o.taxable,o.cgst]),notes:x.notes.map(n=>n.msg)}}",FLAT);print(f)
        chk('flat format still works',f['n']==2 and f['t'][0][1]==1000 and f['t'][0][2]==90)
        chk('flat banner',any('one-line-per-bill' in n for n in f['notes']))
        # real sample file through the UI: sales vs GSTR-1
        await pg.evaluate("reco();rcTab('sale')");await pg.wait_for_timeout(300)
        ins=pg.locator('.rcd input[type=file]')
        await ins.nth(0).set_input_files(TD+'india.xlsx');await pg.wait_for_timeout(700)
        await ins.nth(1).set_input_files(TD+'gstr1_india_synth.xlsx');await pg.wait_for_timeout(700)
        info=await pg.evaluate("[RCS.A.n,RCS.A.err,RCS.A.rows.find(x=>x.inv=='151/26-27').taxable,RCS.A.notes.map(n=>n.msg)[0],RCS.B.n,RCS.A.info]");print(info)
        chk('india.xlsx gives 35 invoices',info[0]==35)
        chk('india.xlsx 151/26-27 taxable 12706',info[2]==12706)
        chk('footer total checked against invoices',await pg.evaluate("RCS.A.notes.some(n=>/total line at the bottom/.test(n.msg)&&n.lvl=='okk')"));chk('no stray left-out message',await pg.evaluate("!RCS.A.notes.some(n=>/no invoice number/.test(n.msg))"))
        chk('client detected',info[5] and 'INDIA' in (info[5].get('name') or '') and info[5].get('gstin')=='27AABFI1006M1ZM',info[5])
        await pg.click('text=Run reco');await pg.wait_for_timeout(600)
        S=await pg.evaluate("RCS.R.S");print(S)
        chk('vs synthetic GSTR-1: all 35 match',S['match']==35 and S['mismatch']==0,S)
        txt=await pg.inner_text('#rcres');chk('banner visible on page',await pg.locator('.rcn.okk').count()>=1)
        # expand breakup
        await pg.locator('.rcbka').first.click();await pg.wait_for_timeout(200)
        chk('breakup expands',await pg.locator('.rcbr:visible').count()==1)
        bt=await pg.inner_text('.rcbr:visible');print(bt[:200]);chk('breakup shows % and ₹','%' in bt and '₹' in bt)
        await pg.screenshot(path='out/itemwise.png',full_page=True)
        chk('no JS errors',not errs,errs)
        await b.close();print('ALL OK' if all(res) else 'SOME FAILED')
asyncio.run(main())
