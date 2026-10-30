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
                  G('36AABCA4938P1Z8','A AHMEDALLY & CO (PVT) LTD','DB/164','10/04/2026','2124','1800','0','162','162'),
                  G('27AAGCE5476M1Z1','ESTELLE MODA WORLDWIDE PRIVATE LIMITED','EM/1','10/04/2026','11800','10000','1800','0','0')])
        await pg.evaluate("""()=>{DB.clients['TJB']={ver:'Tally Prime',accounts:[],ledgers:['A AHMEDALLY & CO (PVT) LTD','ESTELLE MODA WORLDWIDE PRIVATE LIMITED','PURCHASE 18%','PURCHASE 9%','INPUT CGST@ 9%','INPUT SGST@ 9%','INPUT IGST@ 18%','REPAIR EXPENSES','TRAVEL EXPENSES'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('TJB');gst()}""");await pg.wait_for_timeout(300)
        await pg.evaluate("([r])=>gStart([{name:'Sheet1',rows:r}],C().gs)",[S1]);await pg.wait_for_timeout(300)
        await pg.evaluate("gNext()");await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelectorAll('.gsl').forEach(e=>{if(!e.value)e.value='PURCHASE 18%'})")
        h=await pg.evaluate("[...document.querySelectorAll('table')].map(t=>t.rows[0].innerText.replace(/\\s+/g,' '))")
        print(h)
        chk('GST table has CGST SGST IGST columns',any('CGST LEDGER' in x and 'SGST LEDGER' in x and 'IGST LEDGER' in x for x in h))
        rows=await pg.evaluate("[...document.querySelectorAll('.gtl')].map(e=>e.dataset.k+'='+e.value)")
        print(rows)
        chk('one row per rate: 3 inputs for 9%+... ', len(rows)==3, str(rows))
        n=await pg.evaluate("[...document.querySelectorAll('table')].filter(t=>t.rows[0].innerText.includes('CGST LEDGER'))[0].rows.length")
        chk('2 body rows (18% total with intra and inter... )', n==2, str(n))
        # bill numbers expand
        await pg.evaluate("document.querySelectorAll('details.bnd').forEach(d=>d.open=true)")
        txt=await pg.evaluate("[...document.querySelectorAll('details.bnd')].map(d=>d.innerText).join('|')")
        chk('invoice numbers visible',all(x in txt for x in ['DB/163','DB/164','EM/1']),txt)
        await pg.evaluate('window.confirm=()=>true')
        await pg.evaluate("window.__x='';dl=(n,c,m)=>{window.__x=c;window.__n=n}")
        await pg.evaluate("(S.addrOK=1,gExport('xml'))");await pg.wait_for_timeout(800)
        xml=await pg.evaluate("window.__x");print('N',await pg.evaluate("window.__n"),len(xml))
        import xml.etree.ElementTree as ET
        ET.fromstring(xml)
        chk('xml has intra CGST+SGST and inter IGST ledgers','INPUT CGST@ 9%' in xml and 'INPUT SGST@ 9%' in xml and 'INPUT IGST@ 18%' in xml)
        # ledger names
        await pg.evaluate("BRO=1;dash();BRO=0");await pg.wait_for_timeout(200)
        await pg.fill('#lsq','repair');await pg.wait_for_timeout(100)
        r=await pg.inner_text('#lsr');chk('search finds REPAIR EXPENSES only','REPAIR EXPENSES' in r and 'TRAVEL' not in r,r)
        pg.once('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.evaluate("window.confirm=()=>true")
        await pg.evaluate("lsDelAll()");await pg.wait_for_timeout(200)
        chk('list cleared, backup kept',await pg.evaluate("C().ledgers.length==0&&C().ledgersPrev.l.length==9"))
        chk('restore button shown','Restore 9 cleared' in await pg.evaluate("document.body.textContent"))
        await pg.evaluate("lsRestore()");await pg.wait_for_timeout(200)
        chk('restored',await pg.evaluate("C().ledgers.length==9"))
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
