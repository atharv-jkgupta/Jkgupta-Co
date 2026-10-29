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
        await pg.evaluate("""()=>{DB.clients['RL']={ver:'Tally Prime',accounts:[],ledgers:['STAFF WELFARE','OFFICE EXPENSES','RENT PAID'],rules:[{k:'swiggy',l:'Drawings'},{k:'gift',l:'Gifts'}],hist:[],pending:0,ledgerUpdated:''};save();pick('RL')}""");await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
        chk('search box shown',await pg.evaluate("!!document.getElementById('rsq')"))
        await pg.fill('#rsq','gif');await pg.wait_for_timeout(100)
        vis=await pg.evaluate("[...document.querySelectorAll('#rtb tr')].filter(r=>r.style.display!='none').map(r=>r.textContent)")
        chk('search shows only matching rule',len(vis)==1 and 'gift' in vis[0],str(vis))
        chk('search count text','Showing 1 of 2' in await pg.inner_text('#rsc'))
        await pg.fill('#rsq','');await pg.wait_for_timeout(100)
        chk('clearing search shows all',await pg.evaluate("[...document.querySelectorAll('#rtb tr')].every(r=>r.style.display!='none')"))
        async def up(name,data):
            await pg.evaluate("async([a,n])=>{const f=new File([new Uint8Array(a)],n);loadR({files:[f],value:'x'});await new Promise(r=>setTimeout(r,700))}",[list(data),name])
            return await pg.evaluate("document.body.innerText")
        xl=open('/tmp/claude-0/-home-claude/d5a9b3f9-0ac2-5c00-8f48-f8515116be89/scratchpad/rules.xlsx','rb').read()
        t=await up('rules.xlsx',xl)
        R=await pg.evaluate("C().rules.map(r=>r.k+'='+r.l)")
        chk('xlsx: new rules added, existing kept untouched',R==['swiggy=Drawings','gift=Gifts','amazon=office exp','rent=RENT PAID'],str(R))
        chk('message: 2 added, 1 already there, nothing removed','2 new rule' in t and '1 already there' in t and 'Nothing was removed' in t and 'not in this client' in t,t[-400:])
        t=await up('again.csv',b'keyword,ledger\nrent,Something Else\nnewone,Gifts\n')
        R=await pg.evaluate("C().rules.map(r=>r.k+'='+r.l)")
        chk('csv: only the new keyword added',R[-1]=='newone=Gifts' and len(R)==5 and 'rent=RENT PAID' in R,str(R))
        t=await up('x.txt',b'foo = Bar\ngift = other\n')
        R=await pg.evaluate("C().rules.map(r=>r.k+'='+r.l)")
        chk('txt works',('foo=Bar' in R) and ('gift=Gifts' in R) and len(R)==6,str(R))
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
