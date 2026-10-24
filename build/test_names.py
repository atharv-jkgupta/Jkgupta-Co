from tcommon import *
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900},accept_downloads=True);await ctx.add_init_script(MOCK)
        await ctx.add_init_script("window.showSaveFilePicker=undefined;window.alert=m=>{window.__alerts=(window.__alerts||[]).concat([m])}")
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
        await pg.evaluate("""DB.clients['Test Co']={ver:'Prime',accounts:[],ledgers:['ABC Customers','Sales 18%','Output CGST@9%','Output SGST@9%','Output IGST@18%','Cash'],rules:[],hist:[],pending:0,ledgerUpdated:''};save();pick('Test Co');gst()""");await pg.wait_for_timeout(300)
        await pg.set_input_files('#gf',TD+'sales_register.xlsx');await pg.evaluate("gRead()");await pg.wait_for_timeout(1500)
        print((await pg.inner_text('#gr'))[:400])
        chk('sheets listed',await pg.locator('#gr table').count()>=1)
        await pg.evaluate("gNext()");await pg.wait_for_timeout(500)
        print(await pg.evaluate("[S.gx.V.length,S.gx.V.filter(o=>o.err).length]"))
        chk('rows read',await pg.evaluate("S.gx.V.length>0"))
        async def dlx(js):
            async with pg.expect_download(timeout=8000) as d: await pg.evaluate(js)
            x=await d.value;p=await x.path();return x.suggested_filename,open(p,'rb').read()
        await pg.evaluate("document.querySelectorAll('.gsl').forEach(e=>{if(!e.value)e.value='Sales 18%'});document.querySelectorAll('.gpl').forEach(e=>{if(!e.value)e.value='Cash'})")
        fn,xml=await dlx("gExport('xml')")
        try:
            root=ET.fromstring(xml);vs=root.findall('.//VOUCHER');chk('GST XML well-formed',len(vs)>0,len(vs))
            ok=True
            for v in vs:
                am=[float(e.find('AMOUNT').text.replace(' ','')) for e in v.findall('ALLLEDGERENTRIES.LIST')];ok&=abs(sum(am))<0.02
            chk('GST vouchers balance',ok)
        except Exception as e:chk('GST XML parse',False,str(e))
        fn,x=await dlx("gExport('tpl')");print(fn)
        chk('GST template is .xlsm',fn.endswith('.xlsm') and b'vbaProject' in x)
        open('/home/claude/app/out/gst_tpl.xlsm','wb').write(x)
        fn,x=await dlx("gRes()");chk('check report CSV','Sheet' in x.decode())
        # fallback template w/o macros (ExcelJS blocked)
        try:
            fn,x=await dlx("gTpl(S.gv,new Map(),new Set())");print(fn);chk('plain template fallback',len(x)>20)
        except Exception as e:chk('plain template fallback',False,str(e)[:80])
        L="['A.AHMEDALLY & CO (PVT) LTD','A.AHMEDALLY & CO (PVT) LTD- Debtors','AARUSH PLYLAM STUDIO','ABHILASH ROADLINES','Sales 18%','Output CGST@9%','Output SGST@9%']"
        await pg.evaluate("DB.clients['Test Co'].ledgers="+L+";save();gst()")
        csvt=("DATE,VOUCHER TYPE,VOUCHER NO,PARTY LEDGER,SALES / PURCHASE LEDGER,TAXABLE AMOUNT,GST RATE,SUPPLY,NARRATION\r\n"
         "15-06-2026,Sales,A1,Aarush Plylam Studio.,sales 18%,1000,18%,Intra,\r\n"
         "15-06-2026,Sales,A2,AARUSH PLYLAM STUDIO,Sales 18%,1000,18%,Intra,\r\n"
         "15-06-2026,Sales,A3,A Ahmedally & Co Pvt Ltd,Sales 18%,1000,18%,Intra,\r\n"
         "15-06-2026,Sales,A4,Abhilash Roadlines Ltd,Sales 18%,1000,18%,Intra,\r\n"
         "15-06-2026,Sales,A5,Zed Corp,Sales 18%,1000,18%,Intra,\r\n")
        open('/home/claude/app/testdata/gst_names.csv','w').write(csvt)
        await pg.set_input_files('#gf',TD+'gst_names.csv');await pg.evaluate("gRead()");await pg.wait_for_timeout(600)
        v=await pg.evaluate("S.gv.map(o=>[o.p,o.l])");print(v)
        chk('typed name -> ledger name',v[0]==['AARUSH PLYLAM STUDIO','Sales 18%'],str(v[0]))
        chk('exact kept',v[1]==['AARUSH PLYLAM STUDIO','Sales 18%'])
        chk('ambiguous left alone',v[2][0]=='A Ahmedally & Co Pvt Ltd')
        chk('Ltd dropped matches',v[3][0]=='ABHILASH ROADLINES',str(v[3]))
        chk('unknown left alone',v[4][0]=='Zed Corp')
        t=await pg.inner_text('#gr');chk('change list shown','I changed 3 name' in t and 'could be' in t,t[:500])
        print('ERRS',errs[:2])
    await b.close()
asyncio.run(main())
