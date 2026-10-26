import asyncio,json
from playwright.async_api import async_playwright
def ld(n):return json.load(open('/home/claude/app/build/testdata_'+n+'.json'))
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();pg=await b.new_page();res=[]
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**cdnjs**',lambda r:r.abort())
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(500)
        def chk(n,c,x=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,'' if c else x)
        async def rd(n,g,nm):return await pg.evaluate("([r,g,n])=>bxFromRows(r,g,n)",[ld(n),g,nm])
        r=await rd('radius','27CGLPK2503F2ZL','Malvika Bajaj')
        chk('radius sales: no, date, buyer',r['no']=='9/2026-27' and r['date']=='2026-09-02' and r['party'].startswith('Ali Abbas') and r['gstin']=='27ABPFA6257K1ZV',str(r))
        chk('radius sales: SAC, taxable, rates, total',r['items'][0]['hsn']=='998391' and r['items'][0]['taxable']==50000 and r['items'][0]['cgst']==.09 and r['items'][0]['sgst']==.09 and r['printed_total']==59000 and r['kind']=='sales' and not r['warn'],str(r))
        r=await rd('radius','27ABPFA6257K1ZV','Ali Abbas Zafar Films LLP')
        chk('radius as purchase: supplier is party',r['kind']=='purchase' and r['party']=='Malvika Bajaj' and r['gstin']=='27CGLPK2503F2ZL',str(r))
        r=await rd('ps','27ANTPR2552C1ZR','PS ENTERPRISES')
        chk('ps sales',r['kind']=='sales' and r['no']=='005-2026-27-A' and r['party'].startswith('Bloombay') and r['items'][0]['taxable']==18646.5 and r['items'][0]['unit']=='LS' and r['printed_total']==22002.88,str(r))
        r=await rd('ps','27AAKCB2584K1Z9','Bloombay Enterprises Private Limited')
        chk('ps as purchase',r['kind']=='purchase' and r['party']=='PS ENTERPRISES',str(r))
        r=await rd('accutech','27AABFI1006M1ZM','INDIA TRADING COMPANY')
        chk('accutech sales',r['kind']=='sales' and r['no']=='151/26-27' and r['gstin']=='27AANCA0418J1ZO' and len(r['items'])==2 and r['printed_total']==14993 and not r['warn'],str(r))
        r=await rd('accutech','27AANCA0418J1ZO','ACCU-TECH AIRCOOL Pvt Ltd')
        chk('accutech as purchase',r['kind']=='purchase',str(r))
        chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
