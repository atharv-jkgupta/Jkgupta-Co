from tcommon import *
G=lambda g,nm,inv,dt,val,tx,i,c,s:[g,nm,inv,'Regular',dt,val,'Telangana','No',tx,i,c,s,0,"Apr'26",'09/05/2026','Yes','','100%','','']
def sheet(rows):
    top=[['Goods and Services','']+['']*18,['']*20,['']*20,['Taxable inward supplies received from registered persons']+['']*19,
     ['GSTIN of supplier','Trade/Legal name','Invoice Details','','','','Place of supply','Supply Attract Reverse Charge','Taxable Value (₹)','Tax Amount','','','','GSTR-1/IFF/GSTR-5 Period','GSTR-1/IFF/GSTR-5 Filing Date','ITC Availability','Reason','Applicable % of Tax Rate','Source','IRN'],
     ['','','Invoice number','Invoice type','Invoice Date','Invoice Value(₹)','','','','Integrated Tax(₹)','Central Tax(₹)','State/UT Tax(₹)','Cess(₹)','','','','','','','']]
    return top+rows+[['']*20]
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        pg=await b.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(600)
        S1=sheet([G('08ABXPG5266G1Z6','VIBRANT TECHNIK','VT/1','30/04/2026','302183','256087.5','46095.76','0','0'),G('36AABCA4938P1Z8','A AHMEDALLY','DB/163','09/04/2026','4248','3600','0','324','324')])
        S3=sheet([G('27BELPP1353M1Z1','AUM ARCH','44/26-27','23/04/2026','7223','6121','0','550.89','550.89')])
        r=await pg.evaluate("""([a,b])=>{const sh=[{name:'Sheet1',rows:a},{name:'Sheet3',rows:b}],p=rcPick(sh,'gst');let all=[],err=[];p.main.forEach(s=>{const x=rcGstRows(s.rows,'gstr',1);if(x.err)err.push(x.err);all=all.concat(x.rows)});
          return{sheets:p.main.map(s=>s.name),err,all:all.map(x=>[x.gstin,x.party,x.inv,x.date,x.taxable,x.igst,x.cgst,x.sgst,x.itc])}}""",[S1,S3])
        print(r)
        chk('both sheets used (no sheet named B2B)',r['sheets']==['Sheet1','Sheet3'])
        chk('no error',not r['err'])
        chk('3 invoices',len(r['all'])==3)
        a=r['all']
        chk('taxable from the Taxable Value column',a[0][4]==256087.5 and a[1][4]==3600 and a[2][4]==6121,str(a))
        chk('tax columns',a[0][5]==46095.76 and a[1][6]==324 and a[1][7]==324 and a[2][6]==550.89)
        chk('supplier name + ITC read',a[0][1]=='VIBRANT TECHNIK' and a[0][8]=='Yes')
        chk('date read',a[1][3]=='2026-04-09',a[1][3])
        print('ERRS',errs[:2]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
