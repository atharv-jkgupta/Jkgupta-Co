from tcommon import *
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900},accept_downloads=True);await ctx.add_init_script(MOCK)
        await ctx.add_init_script("window.showSaveFilePicker=undefined")
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort())
        async def cdn(r):
            u=r.request.url
            if 'jszip' in u:await r.fulfill(body=JSZ,content_type='application/javascript')
            elif 'xlsx' in u:await r.fulfill(body=XSHIM,content_type='application/javascript')
            else:await r.abort()
        await pg.route('**/cdnjs**',cdn)
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(600)
        await login(pg,'Jkgupta&Co','JKG@2500')
        await pg.evaluate("""DB.clients['Test Co']={ver:'Prime',accounts:[{label:'HDFC',ledger:'HDFC Bank A/c',lastImport:'',lastTxn:''}],ledgers:['HDFC Bank A/c','ABC Customers','Rent','Suspense A/c'],rules:[{k:'rent',l:'Rent'}],hist:[],pending:0,ledgerUpdated:''};save();pick('Test Co')""");await pg.wait_for_timeout(300)
        # ---- bank flow
        await pg.evaluate("start(0)");await pg.wait_for_timeout(200)
        await pg.check('#ok1');await pg.evaluate("setP('','')")
        await pg.set_input_files('#sf',TD+'bank_statement.xlsx')
        await pg.evaluate("readF(0)");await pg.wait_for_timeout(1500)
        print(await pg.evaluate("[S.T&&S.T.length,S.bad&&S.bad.length,document.getElementById('msg')&&document.getElementById('msg').innerText]"))
        chk('statement read',await pg.evaluate("S.T&&S.T.length>3"))
        await pg.evaluate("if(typeof review=='function')review()");await pg.wait_for_timeout(300)
        await pg.evaluate("S.T.forEach(t=>{if(!t.l&&!t.out)t.l='Suspense A/c'})")
        async def dlx(js):
            async with pg.expect_download(timeout=8000) as d: await pg.evaluate(js)
            x=await d.value;p=await x.path();return x.suggested_filename,open(p,'rb').read()
        fn,xml=await dlx("ex('xml')");print(fn)
        try:
            chk('Tally XML starts with ENVELOPE, no extra declaration, no BOM',xml.startswith(b'<ENVELOPE>'));root=ET.fromstring(xml);vs=root.findall('.//VOUCHER');chk('XML well-formed with vouchers',len(vs)>=3,len(vs))
            tot=0;okb=True
            for v in vs:
                ent=v.findall('ALLLEDGERENTRIES.LIST');am=[float(e.find('AMOUNT').text) for e in ent]
                okb&=abs(sum(am))<0.005 and len(ent)==2 and re.fullmatch(r'\d{8}',v.find('DATE').text) is not None
            chk('every voucher balances (Dr = Cr), date YYYYMMDD',okb)
        except Exception as e:chk('XML parses',False,str(e))
        fn,csvb=await dlx("ex('csv')");chk('CSV has header+rows',csvb.decode().count('\n')>=3 and 'Debit Ledger' in csvb.decode())
        fn,x=await dlx("ex('xlsx')");d=json.loads(x);chk('Normal Excel columns',d[0][1][0]==['Date','Voucher Type','Debit Ledger','Credit Ledger','Amount','Narration'],d[0][1][0])
        # template: must be a real macro template
        try:
            fn,x=await dlx("ex('tpl')");print('tpl file',fn,len(x))
            chk('template is .xlsm with macros',fn.endswith('.xlsm') and b'vbaProject' in x)
            if fn.endswith('.xlsm'):
                open('out/tpl_test.xlsm','wb').write(x);z=zipfile.ZipFile(io.BytesIO(x));s=z.read('xl/worksheets/sheet1.xml').decode();chk('template has data rows',s.count('<row')>=4,s.count('<row'))
        except Exception as e:chk('template export',False,str(e)[:100])
        # ---- JK Loop flow (excel)
        await pg.evaluate("loop();lpTab('xls')");await pg.wait_for_timeout(300)
        await pg.set_input_files('#jf',TD+'bank_statement.xlsx');await pg.wait_for_timeout(200)
        await pg.evaluate("lpNext()");await pg.wait_for_timeout(200)
        await pg.fill('#jb','HDFC Bank A/c');await pg.evaluate("lpRead()");await pg.wait_for_timeout(1500)
        print(await pg.evaluate("[LP.T&&LP.T.length,LP.step]"));chk('loop reads',await pg.evaluate("LP.T&&LP.T.length>3"))
        fn,xml=await dlx("lpDl('xml')");chk('loop XML ok',len(ET.fromstring(xml).findall('.//VOUCHER'))>=3)
        fn,x=await dlx("lpDl('xlsn')");d=json.loads(x);chk('loop normal Excel',d[0][1][0][0]=='Date',d[0][1][0])
        try:
            fn,x=await dlx("lpDl('xls')");chk('loop template .xlsm',fn.endswith('.xlsm') and b'vbaProject' in x,fn)
        except Exception as e:chk('loop template',False,str(e)[:100])
        chk('no JS errors',not errs,errs);print(errs)
        await b.close();print('ALL OK' if all(res) else 'SOME FAILED')
asyncio.run(main())
