import asyncio,json,datetime,openpyxl,re,random
from playwright.async_api import async_playwright
random.seed(5)
f='/mnt/user-data/attachments/d5a9b3f9-0ac2-5c00-8f48-f8515116be89/f4c84701-1793428038780_2b_COMBINE_up.xlsx'
ws=openpyxl.load_workbook(f,data_only=True).active
rows2b=[['' if x is None else (x.strftime('%d/%m/%Y') if isinstance(x,datetime.datetime) else x) for x in r] for r in ws.iter_rows(values_only=True)]
data=[r for r in rows2b[6:] if r[0]]
mode=__import__('sys').argv[1] if len(__import__('sys').argv)>1 else 'nogstin'
books=[['Date','Particulars','Voucher No.','Supplier Invoice No.','GSTIN/UIN','Taxable Value','Central Tax','State Tax','Integrated Tax','Gross Total']]
exp={}
for i,r in enumerate(data):
    gs,nm,inv,_,dt,val,_,_,tx,ig,cg,sg=r[:12]
    d=dt
    name=nm.title() if i%3==0 else nm
    iv=inv
    if mode=='fmt' and i%4==0: iv=re.sub(r'/26-27','',inv)
    if mode=='fmt' and i%5==0: iv=inv.replace('/','-')
    books.append([d,name,i+1,iv,gs if mode!='nogstin' else '',tx,cg,sg,ig,round(tx+cg+sg+ig)])
# planned differences
books[3][5]+=500   # taxable differs
books.pop(10)      # missing in books -> missG? (missing in books = in 2B only)
books.append(['15/04/2026','EXTRA SUPPLIER','X/1','X/1','27ABCDE1234F1Z5',1000,90,90,0,1180])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page()
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(500)
        res=await pg.evaluate("""([bk,tb])=>{const B=rcGstRows(bk,'books',1),G=rcGstRows(tb,'gstr',1);const R=rcGst(B.rows,G.rows,1);const S=rcGstSum(R);
          return {err:[B.err,G.err],nb:B.rows.length,ng:G.rows.length,S,odd:R.filter(r=>r.st!='match').map(r=>[r.st,r.why,r.b&&r.b.inv,r.b&&r.b.party,r.g&&r.g.inv,r.g&&r.g.party,(r.diff||[]).map(d=>d.l+d.x).join(',')])}}""",[books,rows2b])
        print(mode,{k:res[k] for k in ('err','nb','ng','S')})
        for o in res['odd'][:25]:print(o)
        await b.close()
asyncio.run(main())
