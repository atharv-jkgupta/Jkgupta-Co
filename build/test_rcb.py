import asyncio,json
from playwright.async_api import async_playwright
# books: (date, particulars, vch no/ref, debit, credit) -- Tally bank ledger; Credit = payment out
bk=[['Date','Particulars','Vch No.','Debit','Credit'],
 ['02/04/2026','RAMESH TRADERS','CHQ 100234','','5000'],
 ['03/04/2026','SURESH TRADERS','CHQ 100235','','5000'],
 ['04/04/2026','MAHESH TRADERS','CHQ 100236','','5000'],
 ['05/04/2026','NAYAN TRADERS','','','5000'],
 ['10/04/2026','SALES RECEIPT ABC','NEFT','12000',''],
 ['10/04/2026','SALES RECEIPT XYZ','NEFT','12000',''],
 ['15/04/2026','ELECTRICITY','','','2500'],
 ['20/04/2026','CASH DEPOSIT','','8000',''],
]
# bank: cheques clear a few days later, in different order
bn=[['Date','Narration','Chq/Ref','Withdrawal','Deposit','Balance'],
 ['05/04/2026','CHQ 100236 MAHESH','100236','5000','',''],
 ['06/04/2026','CHQ 100234 RAMESH','100234','5000','',''],
 ['07/04/2026','CHQ 100235 SURESH','100235','5000','',''],
 ['08/04/2026','NEFT NAYAN TRADERS','UTR998877','5000','',''],
 ['11/04/2026','NEFT-XYZ ENTERPRISES-SALES','UTR1','','12000',''],
 ['12/04/2026','NEFT-ABC CORP','UTR2','','12000',''],
 ['16/04/2026','BSES ELECTRICITY','','2500','',''],
 ['21/04/2026','CASH DEP','','','8000',''],
 ['25/04/2026','BANK CHARGES','','118','','']]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page()
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(500)
        res=await pg.evaluate("""([bk,bn])=>{const B=rcBankRows(bk,'books'),K=rcBankRows(bn,'bank');const R=rcBank(B.rows,K.rows,5);
          return {err:[B.err,K.err],R:R.map(r=>[r.st,r.how||'',(r.books||[]).map(x=>x.desc+'|'+x.ref+'|'+x.date+'|'+x.amt).join(' + '),(r.bank||[]).map(x=>x.desc+'|'+x.date+'|'+x.amt).join(' + ')])}}""",[bk,bn])
        print(res['err'])
        for r in res['R']:print(r)
        await b.close()
asyncio.run(main())
