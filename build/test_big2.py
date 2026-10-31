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
        import random;random.seed(3)
        rows=[]
        for i in range(400):
            p=i%60;g=gstin('27AAGCE%04dM1Z'%(1000+p)) if False else gstin('36AABCA%04dP1Z'%(1000+p))
            tx=1000+i;ig=0;c=round(tx*.09,2);s=c
            if i%7==0: ig=round(tx*.18,2);c=s=0
            rows.append(G(g,'PARTY %d PVT LTD'%p,'INV/%d'%i,'%02d/%02d/2026'%(1+i%28,4+i%3),str(round(tx+ig+c+s,2)),str(tx),str(ig),str(c),str(s)))
        out=[];run=0
        for i,r in enumerate(rows):
            out.append(r);run+=float(r[8])
            if i%100==99:
                z=['']*20;z[8]=str(run)
                if i==99: z[1]='Sub Total'
                out.append(z)
        out.insert(5,G(gstin('36AABCA9999P1Z'),'Total Solutions Pvt Ltd','TS/1','05/04/2026','1180','1000','0','90','90'))
        rows=out
        S1=sheet(rows)
        await pg.evaluate("""()=>{DB.clients['TJB']={ver:'Tally Prime',accounts:[],ledgers:['PURCHASE 18%','INPUT CGST@ 9%','INPUT SGST@ 9%','INPUT IGST@ 18%'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('TJB');gst()}""");await pg.wait_for_timeout(300)
        await pg.evaluate("([r])=>gStart([{name:'Sheet1',rows:r}],C().gs)",[S1]);await pg.wait_for_timeout(500)
        print('READ',await pg.evaluate('typeof S.gx'),await pg.evaluate('document.body.innerText.slice(0,300)'))
        await pg.evaluate("gNext()");await pg.wait_for_timeout(500)
        print('PARTYBOXES',await pg.evaluate("document.querySelectorAll('.gpl').length"),await pg.evaluate("[...document.querySelectorAll('.gpl')].filter(e=>!e.value).length"))
        await pg.evaluate("document.querySelectorAll('.gsl').forEach(e=>{if(!e.value)e.value='PURCHASE 18%'})")
        await pg.evaluate("window.confirm=()=>true")
        await pg.evaluate("window.__x='';dl=(n,c,m)=>{window.__x=c}")
        await pg.evaluate("(S.addrOK=1,gExport('xml'))");await pg.wait_for_timeout(1500)
        x=await pg.evaluate("window.__x");print('VOUCHERS in XML',x.count('<VOUCHER '))
        print((await pg.inner_text('#gout'))[:300]);print('MODAL',(await pg.inner_text('#md'))[:300])
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
