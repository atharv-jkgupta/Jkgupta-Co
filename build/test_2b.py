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
                  G('27AAGCE5476M1Z1','ESTELLE MODA WORLDWIDE PRIVATE LIMITED','EM/1','10/04/2026','11800','10000','1800','0','0'),
                  G(KAR,'NO ITC TRADERS','N/1','11/04/2026','1180','1000','0','90','90','No','Yes')])
        for ver in ['Tally Prime','Tally ERP 9']:
            await pg.evaluate("""([v])=>{DB.clients['T2B']={ver:v,accounts:[],ledgers:['A.AHMEDALLY & CO (PVT) LTD','PURCHASE 18%','PURCHASE 9%','INPUT CGST@ 9%','INPUT SGST@ 9%','INPUT IGST@ 18%'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('T2B');gst()}""",[ver]);await pg.wait_for_timeout(300)
            await pg.evaluate("([r])=>gStart([{name:'Sheet1',rows:r}],C().gs)",[S1]);await pg.wait_for_timeout(300)
            if ver=='Tally Prime':
                t=await pg.inner_text('#gr');chk('2B sheet recognised, set to Purchase',await pg.evaluate("document.querySelector('#gt0')&&document.querySelector('#gt0').value")=='Purchase',t[:300])
                await pg.evaluate("gNext()");await pg.wait_for_timeout(300)
                v=await pg.evaluate("S.gx.V.map(o=>[o.no,o.pf,o.gs,o.a,o.q,o.cg,o.sg,o.ig,o.err,o.w.join('|')])");print(v)
                chk('3 bills read, no errors',len(v)==3 and all(not x[8] for x in v))
                chk('rate worked out from tax',v[0][4]==0.18 and v[0][5]==324 or v[0][4]==.18)
                chk('intra bill: CGST+SGST',v[0][5]==324 and v[0][6]==324 and v[0][7]==0,str(v[0]))
                chk('inter bill: IGST',v[1][7]==1800 and v[1][5]==0,str(v[1]))
                chk('ITC / reverse charge warnings',('ITC NOT AVAILABLE' in v[2][9]) and ('REVERSE CHARGE' in v[2][9]),v[2][9])
                chk('no noisy notes',all('NOTE IN YOUR FILE' not in x[9] for x in v))
            if ver!='Tally Prime':await pg.evaluate("gNext()");await pg.wait_for_timeout(300)
            await pg.evaluate("document.querySelectorAll('.gsl').forEach(e=>{if(!e.value)e.value='PURCHASE 18%'})")
            xml=await dlx("(S.addrOK=1,gExport('xml'))")
            if ver=='Tally Prime':
                chk('Prime ledger master has state + GSTIN + type','<LEDSTATENAME>Maharashtra</LEDSTATENAME>' in xml and '<GSTIN>27AAGCE5476M1Z1</GSTIN>' in xml and '<GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>' in xml and '<PARTYGSTIN>27AAGCE5476M1Z1</PARTYGSTIN>' in xml)
                chk('state from GSTIN code (29 = Karnataka)','<LEDSTATENAME>Karnataka</LEDSTATENAME>' in xml)
                import xml.etree.ElementTree as ET;ET.fromstring(xml);chk('XML well-formed',True)
                chk('purchase vouchers',xml.count('VCHTYPE="Purchase"')==3)
            else:
                chk('ERP 9 master stays the old simple layout','LEDSTATENAME' not in xml and '<PARTYGSTIN>27AAGCE5476M1Z1</PARTYGSTIN>' in xml)
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
