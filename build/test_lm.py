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
        xml="<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA><TALLYMESSAGE xmlns:UDF=\"TallyUDF\"><LEDGER NAME=\"A &amp; B TRADERS\" RESERVEDNAME=\"\"><NAME.LIST><NAME>A &amp; B TRADERS</NAME></NAME.LIST><PARENT>Sundry Creditors</PARENT></LEDGER></TALLYMESSAGE><TALLYMESSAGE><LEDGER NAME=\"NEW PARTY\"><PARENT>Sundry Debtors</PARENT></LEDGER></TALLYMESSAGE><TALLYMESSAGE><LEDGER NAME=\"Old One\"><PARENT>X&#4; </PARENT></LEDGER></TALLYMESSAGE><TALLYMESSAGE><GROUP NAME=\"Not A Ledger\"></GROUP></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>"
        await pg.evaluate("""()=>{DB.clients['LM']={ver:'Tally Prime',accounts:[],ledgers:['old one','KEEP ME'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('LM')}""");await pg.wait_for_timeout(300)
        async def up(bytes_,name):
            await pg.evaluate("window.__alerts=[]")
            await pg.evaluate("async([a,n])=>{const f=new File([new Uint8Array(a)],n);loadM({files:[f],value:'x'});await new Promise(r=>setTimeout(r,600))}",[list(bytes_),name])
            return await pg.evaluate("document.body.innerText")
        al=await up(xml.encode('utf-8'),'Master.xml')
        L=await pg.evaluate("C().ledgers")
        chk('xml: new names added, old kept',L==['old one','KEEP ME','A & B TRADERS','NEW PARTY'],str(L)+str(al))
        chk('xml: message says added/already there','2 new' in str(al) and 'Nothing was removed' in str(al),str(al)[-300:])
        al=await up(b'\xff\xfe'+xml.encode('utf-16-le'),'Master2.xml')
        L=await pg.evaluate("C().ledgers");chk('utf-16 xml (Tally ERP 9 style) reads, nothing duplicated',L==['old one','KEEP ME','A & B TRADERS','NEW PARTY'],str(L)+str(al))
        al=await up(b'Name\nCSV ONE\nCSV TWO\n','names.csv');L=await pg.evaluate("C().ledgers");chk('csv adds',('CSV ONE' in L) and len(L)==6,str(L)+str(al))
        al=await up(b'<html>nothing</html>','bad.xml');L=await pg.evaluate("C().ledgers");chk('bad xml: message, list unchanged',len(L)==6 and 'Could not read' in str(al),str(al)[-300:])
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
