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
        S1=sheet([G('36AABCA4938P1Z8','A AHMEDALLY & CO (PVT) LTD','DB/163','09/04/2026','4248','3600','0','324','324'),
                  G('27AAGCE5476M1Z1','ESTELLE MODA WORLDWIDE PRIVATE LIMITED','EM/1','10/04/2026','11800','10000','1800','0','0')])
        await pg.evaluate("""()=>{DB.clients['TJV']={ver:'Tally Prime',accounts:[],ledgers:['A AHMEDALLY & CO (PVT) LTD','ESTELLE MODA WORLDWIDE PRIVATE LIMITED','PURCHASE 18%','PURCHASE 9%','INPUT CGST@ 9%','INPUT SGST@ 9%','INPUT IGST@ 18%','REPAIR EXPENSES'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('TJV');gst()}""");await pg.wait_for_timeout(300)
        await pg.evaluate("([r])=>gStart([{name:'Sheet1',rows:r}],C().gs)",[S1]);await pg.wait_for_timeout(300)
        await pg.evaluate("gNext()");await pg.wait_for_timeout(300)
        chk('Journal column shown for each party',await pg.evaluate("document.querySelectorAll('.gjv').length")==2)
        await pg.evaluate("document.querySelectorAll('.gsl').forEach(e=>{if(!e.value)e.value='PURCHASE 18%'})")
        await pg.evaluate("document.querySelectorAll('.gjv')[0].value='repair expenses'")
        xml=await dlx("(S.addrOK=1,gExport('xml'))")
        import re,xml.etree.ElementTree as ET
        ET.fromstring(xml);chk('XML well-formed',True)
        v=re.findall(r'<VOUCHER .*?</VOUCHER>',xml,re.S)
        jv=[x for x in v if 'VCHTYPE="Journal"' in x];pu=[x for x in v if 'VCHTYPE="Purchase"' in x]
        chk('one Journal, one Purchase',len(jv)==1 and len(pu)==1,str([x[:60] for x in v]))
        chk('Journal has no party tag, uses head REPAIR EXPENSES (name auto-fixed)','<PARTYLEDGERNAME>' not in jv[0] and 'REPAIR EXPENSES' in jv[0],jv[0][:500])
        ent=re.findall(r'<ISDEEMEDPOSITIVE>(\w+)</ISDEEMEDPOSITIVE>.*?<LEDGERNAME>(.*?)</LEDGERNAME><AMOUNT>(.*?)</AMOUNT>',jv[0],re.S)
        print(ent)
        d={n.replace('&amp;','&'):(a,x) for a,n,x in ent}
        chk('Journal: head Dr, input GST Dr, party Cr and it balances',d['REPAIR EXPENSES'][0]=='Yes' and d['INPUT CGST@ 9%'][0]=='Yes' and d['A AHMEDALLY & CO (PVT) LTD'][0]=='No' and abs(sum(float(x.replace(' ','')) for _,x in d.values()))<0.01,str(ent))
        chk('Purchase voucher unchanged (has party tag)','<PARTYLEDGERNAME>ESTELLE' in pu[0])
        chk('head remembered for the party',await pg.evaluate("Object.values(C().jvmap||{})")==['REPAIR EXPENSES'])
        await pg.evaluate("gS2()");await pg.wait_for_timeout(200)
        chk('head pre-filled next time',await pg.evaluate("[...document.querySelectorAll('.gjv')].some(e=>e.value=='REPAIR EXPENSES')"))
        await pg.evaluate("document.querySelectorAll('.gjv').forEach(e=>e.value='')")
        xml2=await dlx("(S.addrOK=1,gExport('xml'))");chk('empty head = normal vouchers again','VCHTYPE="Journal"' not in xml2 and xml2.count('VCHTYPE="Purchase"')==2)
        chk('forgotten when emptied',await pg.evaluate("Object.keys(C().jvmap||{}).length")==0)
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
