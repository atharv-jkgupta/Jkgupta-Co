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
        import json
        sh=json.load(open('/home/claude/app/build/combine_rows.json'))
        for mk in (1,0):
            await pg.evaluate("""(sh)=>{DB.clients['TJB']={ver:'Tally 9',accounts:[],ledgers:[...new Set(sh[0].rows.slice(6).map(r=>r[1]).filter(Boolean)),'PURCHASE 18%','INPUT CGST@ 9%','INPUT SGST@ 9%','INPUT CGST@ 2.5%','INPUT SGST@ 2.5%','INPUT CGST@ 6%','INPUT SGST@ 6%','INPUT IGST@ 18%'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('TJB');gst()}""",sh);await pg.wait_for_timeout(300)
            await pg.evaluate("([r])=>gStart(r,C().gs)",[sh]);await pg.wait_for_timeout(500)
            print('MODAL0',(await pg.inner_text('#md'))[:300])
            await pg.evaluate("gNext()");await pg.wait_for_timeout(600)
            print('MODAL1',(await pg.inner_text('#md'))[:300])
            print('V',await pg.evaluate("[S.gx.V.length,S.gx.V.filter(o=>o.err).length,S.gx.V.filter(o=>o.after).length,S.gx.V.filter(o=>o.t).map(o=>o.t).slice(0,1)]"))
            await pg.evaluate("document.querySelectorAll('.gsl').forEach(e=>{if(!e.value)e.value='PURCHASE 18%'})")
            await pg.evaluate("1")
            await pg.evaluate('document.getElementById("gmk3").checked=%s'%('true' if mk else 'false'))
            await pg.evaluate("window.confirm=()=>true;window.__x='';dl=(n,c,m)=>{window.__x=c}")
            await pg.evaluate("(S.addrOK=1,gExport('xml'))");await pg.wait_for_timeout(1500)
            x=await pg.evaluate("window.__x");print('mk',mk,'VOUCHERS in XML',x.count('<VOUCHER '),'LEDGER masters',x.count('<LEDGER '))
            print((await pg.inner_text('#gout'))[:500])
            import re
            print('MASTERS',re.findall(r'<LEDGER NAME="([^"]*)"',x)[-12:]);print(re.findall(r'<LEDGER NAME="INPUT CGST@ 6%".*?</LEDGER>',x)[:1]);print(re.findall(r'<LEDGER NAME="PURCHASE 18%".*?</LEDGER>',x)[:1])
            import xml.etree.ElementTree as ET;ET.fromstring(x)
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
