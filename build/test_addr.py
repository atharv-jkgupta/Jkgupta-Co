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
        S1=sheet([G('27AAGCE5476M1Z1','ESTELLE MODA WORLDWIDE PRIVATE LIMITED','EM/1','10/04/2026','11800','10000','1800','0','0')])
        await pg.evaluate("""()=>{DB.clients['TAD']={ver:'Tally Prime',accounts:[],ledgers:['PURCHASE 18%','INPUT IGST@ 18%'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('TAD');gst()}""");await pg.wait_for_timeout(300)
        await pg.evaluate("([r])=>gStart([{name:'Sheet1',rows:r}],C().gs)",[S1]);await pg.wait_for_timeout(300)
        await pg.evaluate("gNext()");await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelectorAll('.gsl').forEach(e=>{if(!e.value)e.value='PURCHASE 18%'})")
        await pg.evaluate("gExport('xml')");await pg.wait_for_timeout(300)
        chk('address card shown first',await pg.evaluate("!!document.getElementById('gad0')"))
        chk('ledger list NOT changed yet',await pg.evaluate("C().ledgers.length")==2)
        await pg.fill('#gad0','Plot 5, Andheri East\nMumbai');await pg.fill('#gpn0','400093')
        xml=await dlx("gAdSave(false)")
        chk('address in XML','<ADDRESS>Plot 5, Andheri East</ADDRESS>' in xml and '<ADDRESS>Mumbai</ADDRESS>' in xml and '<PINCODE>400093</PINCODE>' in xml,xml[:400])
        import xml.etree.ElementTree as ET;ET.fromstring(xml);chk('XML well-formed',True)
        chk('new ledger added to client list',await pg.evaluate("C().ledgers.includes('ESTELLE MODA WORLDWIDE PRIVATE LIMITED')"))
        chk('old ledgers kept',await pg.evaluate("C().ledgers.includes('PURCHASE 18%')&&C().ledgers.length==3"))
        chk('address remembered',await pg.evaluate("!!(C().paddr||{})['27AAGCE5476M1Z1']"))
        await pg.evaluate("DB.clients['TAD'].ledgers=['PURCHASE 18%','INPUT IGST@ 18%'];save()")
        await pg.evaluate("gExport('xml')");await pg.wait_for_timeout(200);chk('no address box when already remembered',await pg.evaluate("!document.getElementById('gad0')"));xml2=await dlx("gAdSave(false)")
        chk('second time no card, address reused','<PINCODE>400093</PINCODE>' in xml2)
        await pg.evaluate("DB.clients['TAD'].paddr={};DB.clients['TAD'].ledgers=['PURCHASE 18%','INPUT IGST@ 18%'];save()")
        await pg.evaluate("gExport('xml')");await pg.wait_for_timeout(200)
        xml3=await dlx("gAdSave(true)")
        chk('skip works, no address tags','<ADDRESS>' not in xml3 and 'LEDSTATENAME' in xml3)
        await pg.evaluate("DB.clients['TAD'].ledgers=['PURCHASE 18%','INPUT IGST@ 18%'];save()")
        await pg.evaluate("gExport('xml')");await pg.wait_for_timeout(200)
        await pg.check('#gno')
        xml4=await dlx("gAdSave(true)")
        import re
        led=re.search(r'<LEDGER NAME="ESTELLE.*?</LEDGER>',xml4,re.S).group(0)
        chk('name-only: no GSTIN, no state in new ledger','GSTIN' not in led and 'LEDSTATENAME' not in led and '<PARENT>Sundry Creditors</PARENT>' in led,led[:300])
        ET.fromstring(xml4);chk('name-only XML well-formed',True)
        t=await pg.inner_text('#gout');chk('GSTIN list shown','27AAGCE5476M1Z1' in t and 'Alt+L' in t,t[:300])
        csv=await dlx("gNoList()");chk('GSTIN list csv','27AAGCE5476M1Z1' in csv and 'ESTELLE' in csv,csv[:200])
        chk('switch remembered',await pg.evaluate("C().nameOnly===true"))
        await pg.evaluate("DB.clients['TAD'].ledgers=['PURCHASE 18%','INPUT IGST@ 18%'];save()")
        await pg.evaluate("gExport('xml')");await pg.wait_for_timeout(200)
        chk('switch pre-ticked next time',await pg.evaluate("document.getElementById('gno').checked"))
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
