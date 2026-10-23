# Bills to Excel: real bills (Excel + the same bills as PDF text), real office server, real browser.
import asyncio,subprocess,os,shutil,json,time,tempfile,urllib.request,hashlib,glob,sys
from playwright.async_api import async_playwright
OFF='/home/claude/office';OUT='/home/claude/app/out';PORT=3058
UP='/root/.claude/uploads/d5a9b3f9-0ac2-5c00-8f48-f8515116be89/';BILLS=sorted(glob.glob(UP+'*________*.xlsx'))
T=tempfile.mkdtemp();SRV=os.path.join(T,'srv');os.makedirs(SRV);shutil.copy(OFF+'/server.js',SRV);shutil.copy(OUT+'/office.html',SRV+'/index.html')
json.dump({'port':PORT,'adminPassword':'Admin#123','dataDir':os.path.join(T,'data'),'autoUpdate':False},open(SRV+'/config.json','w'))
sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
srv=subprocess.Popen(['node','server.js'],cwd=SRV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for _ in range(40):
    try:urllib.request.urlopen('http://127.0.0.1:%d/ping'%PORT,timeout=1);break
    except Exception:time.sleep(.2)
def rpc(f,b):
    q=urllib.request.Request('http://127.0.0.1:%d/rest/v1/rpc/%s'%(PORT,f),json.dumps(b).encode(),{'Content-Type':'application/json'});return json.load(urllib.request.urlopen(q))
a=rpc('jkg_login',{'p_u':'jkgupta&co','p_h':sha('jkg2|jkgupta&co|Admin#123'),'p_m':''});rpc('kv_put',{'p_t':a['token'],'p_k':'jkgusers','p_v':json.dumps({'ravi':sha('jkg2|ravi|pass1')})})
res=[]
def chk(n,c,extra=''):res.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n+(' '+str(extra) if (extra and not c) else ''))
# tiny xlsx reader standing in for SheetJS (SheetJS cannot be downloaded in this sandbox)
SHIM="""window.XLSX={read:(u8)=>({__u8:u8,SheetNames:['s'],Sheets:{s:{__u8:u8}}}),utils:{sheet_to_json:(ws,o)=>window.__rows(ws.__u8,o)}};
window.__rows=function(u8,o){return window.__rowsP(u8,o)};"""
SHIM2="""
window.XLSX={read:(u8)=>({SheetNames:['s'],Sheets:{s:{u8}}}),utils:{sheet_to_json:(ws,o)=>ws.rows}};
const _read=window.XLSX.read;
window.XLSX.readAsync=async(u8)=>{const z=await JSZip.loadAsync(u8),ss=[];const sst=z.file('xl/sharedStrings.xml');
 if(sst){const x=new DOMParser().parseFromString(await sst.async('string'),'text/xml');x.querySelectorAll('si').forEach(si=>ss.push([...si.querySelectorAll('t')].map(t=>t.textContent).join('')))}
 const sx=new DOMParser().parseFromString(await z.file('xl/worksheets/sheet1.xml').async('string'),'text/xml'),rows=[];
 sx.querySelectorAll('row').forEach(r=>{const ri=+r.getAttribute('r')-1;const arr=[];r.querySelectorAll('c').forEach(c=>{const ref=c.getAttribute('r'),col=ref.replace(/\\d+/g,'').split('').reduce((a,ch)=>a*26+ch.charCodeAt(0)-64,0)-1,t=c.getAttribute('t'),v=c.querySelector('v');let val='';
   if(t=='s')val=ss[+v.textContent];else if(t=='inlineStr')val=[...c.querySelectorAll('t')].map(x=>x.textContent).join('');else if(t=='str')val=v?v.textContent:'';else if(v)val=+v.textContent;arr[col]=val});
  for(let i=0;i<arr.length;i++)if(arr[i]===undefined)arr[i]='';rows[ri]=arr});
 for(let i=0;i<rows.length;i++)if(!rows[i])rows[i]=[];return rows};
0;
"""
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[]
        ctx=await b.new_context(viewport={'width':1280,'height':900},accept_downloads=True);pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort())
        await pg.route('**/jszip.min.js',lambda r:r.fulfill(path='/opt/npm-tools/node_modules/jszip/dist/jszip.min.js',content_type='text/javascript'))
        await pg.route('**/xlsx.full.min.js',lambda r:r.fulfill(body='/*shim*/',content_type='text/javascript'))
        await pg.route('**cdnjs**pdf**',lambda r:r.abort())
        await pg.goto('http://127.0.0.1:%d/'%PORT);await pg.wait_for_timeout(800)
        # SheetJS stand-in: reading is async in the real library? No - sync. So pre-read each file in the test and serve rows synchronously.
        await pg.evaluate("window.JSZip||0")
        await pg.evaluate("tg(1)");await pg.fill('#lu','ravi');await pg.fill('#lp','pass1');await pg.click('#sb .go');await pg.wait_for_timeout(2000)
        chk('logged in',await pg.evaluate('USER')=='ravi')
        chk('sidebar has Bills → Excel',await pg.locator('.bxl').count()==1)
        await pg.evaluate('bx()');await pg.wait_for_timeout(400)
        await pg.evaluate('bxNew()');await pg.fill('#bxc','INDIA TRADING');await pg.fill('#bxg','27AABFI1006M1ZM');await pg.fill('#bxm','2026-09');await pg.evaluate('bxMake()');await pg.wait_for_timeout(500)
        chk('sheet created',await pg.evaluate("bxCur().company")=='INDIA TRADING')
        # --- read the 7 real Excel bills
        await pg.evaluate("document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'}))");await pg.wait_for_timeout(600)
        await pg.evaluate(SHIM2)
        # real SheetJS read is sync; stand-in: pre-read all files then let XLSX.read return them in order
        names=[os.path.basename(f) for f in BILLS]
        rows_all=[]
        for f in BILLS:
            data=list(open(f,'rb').read())
            rows_all.append(await pg.evaluate("(async d=>{const r=await XLSX.readAsync(new Uint8Array(d));return r})",data))
        await pg.evaluate("(R)=>{let n=0;window.XLSX.read=()=>({SheetNames:['s'],Sheets:{s:{rows:R[n++%R.length]}}});window.XLSX.utils.sheet_to_json=(ws,o)=>o&&o.blankrows===false?ws.rows.filter(r=>r.some(x=>x!==''&&x!=null)):ws.rows}",rows_all)
        await pg.set_input_files('#bxin',BILLS);await pg.wait_for_timeout(2500)
        got=await pg.evaluate("BXP.map(b=>({src:b.src,no:b.no,date:b.date,party:b.party,gstin:b.gstin,warn:b.warn,pt:b.printed_total,items:b.items.map(i=>[i.hsn,i.qty,i.unit,i.taxable,i.cgst,i.sgst,i.igst])}))")
        base={x['no']:x for x in json.load(open('/home/claude/jkg-sheets/data/india-trading-2026-09-baseline.json'))['bills']}
        chk('7 bills read',len(got)==7,len(got))
        byno={g['no']:g for g in got}
        for no in ['151/26-27','153/26-27','156/26-27']:
            g=byno.get(no);o=base[no]
            same=g and g['party']==o['party'] and g['gstin']==o['gstin'] and g['date']==o['date'] and [[i[0],i[1],i[2].upper() if i[2].upper() in('ROLL','SQM','BAG','SFT','LTR') else i[2],i[3],i[4],i[5],i[6]] for i in g['items']]==[[x['hsn'],x['qty'],x['unit'].upper() if x['unit'].upper() in('ROLL','SQM','BAG','SFT','LTR') else x['unit'],x['taxable'],x['cgst'],x['sgst'],x['igst']] for x in o['items']]
            chk('bill %s equals your sheet exactly'%no,same,(g,o) if not same else '')
        for g in got:print('  read:',g['no'],g['date'],'|',g['party'],'|',g['gstin'],'|',g['items'],g['warn'],g['pt'])
        chk('bill 152 party is RSR TECHNICAL SERVICES',byno['152/26-27']['party'].upper().startswith('RSR TECHNICAL'))
        chk('bill 152 GSTIN read from the bill',byno['152/26-27']['gstin']=='27AZAPR8972M1ZH')
        chk('bill 155: bill says 2 Rolls (your sheet says 3 ROLL)',byno['155/26-27']['items'][0][1]==2)
        chk('bill 157 party name clean (no address)',byno['157/26-27']['party']=='PARAG ENGINEERING PRODUCTS Pvt. Ltd',byno['157/26-27']['party'])
        chk('all printed totals found',all(g['pt'] for g in got))
        # --- add all, download
        await pg.evaluate('bxAll()');await pg.wait_for_timeout(500)
        chk('7 bills in sheet',await pg.evaluate("bxCur().bills.length")==7)
        async with pg.expect_download() as d:await pg.evaluate('bxDown()')
        dl=await d.value;xf=os.path.join(T,'out.xlsx');await dl.save_as(xf)
        import openpyxl
        wb=openpyxl.load_workbook(xf);ws=wb.active
        chk('xlsx opens, header row like the sample',[c.value for c in ws[4]][:15]==['DATE','BILL NO','PARTY NAME','GSTIN NO','HSN CODE','QTY','UNIT','TAXABLE AMT','IGST RATE','IGST AMT','CGST RATE','CGST AMT','SGST RATE','SGST AMT','TOTAL'])
        chk('title rows',ws['A1'].value=='INDIA TRADING' and ws['A2'].value=='27AABFI1006M1ZM' and ws['A1'].font.name=='Times New Roman' and ws['A1'].font.sz==18)
        chk('merged title rows + total row',{'A1:O1','A2:O2','A3:O3'}<={str(m) for m in ws.merged_cells.ranges})
        # compare with the python sheet kit (same data) cell by cell
        sys.path.insert(0,'/home/claude/jkg-sheets');import sheetkit
        data=await pg.evaluate("bxCur()");ref=os.path.join(T,'ref.xlsx');sheetkit.build(data,ref);w2=openpyxl.load_workbook(ref).active
        diffs=[]
        for r in range(1,max(ws.max_row,w2.max_row)+1):
            for c in range(1,16):
                if r==4:continue
                a,b2=ws.cell(r,c),w2.cell(r,c)
                va,vb=a.value,b2.value
                if hasattr(vb,'date'):vb=vb.date()
                if hasattr(va,'date'):va=va.date()
                if va!=vb:diffs.append((a.coordinate,va,vb))
                elif r>=4:
                    fa=(a.font.name,a.font.sz,bool(a.font.b),a.number_format.replace('mm-dd-yy','mm-dd-yy'),a.alignment.horizontal,bool(a.fill.fill_type),tuple(getattr(a.border,s).style for s in('left','right','top','bottom')))
                    fb=(b2.font.name,b2.font.sz,bool(b2.font.b),b2.number_format,b2.alignment.horizontal,bool(b2.fill.fill_type),tuple(getattr(b2.border,s).style for s in('left','right','top','bottom')))
                    if fa!=fb:diffs.append((a.coordinate,'style',fa,fb))
        chk('same values, formulas and styles as the sheet kit',not diffs,diffs[:6])
        # LibreOffice recalculation
        subprocess.run(['soffice','--headless','--convert-to','csv','--outdir',T,xf],capture_output=True,timeout=120)
        csv=open(os.path.join(T,'out.csv'),encoding='utf-8').read().splitlines()
        tot=csv[-1].split(',');print('  LO total row:',csv[-1][:140])
        exp=sum(sum(i['taxable']*(1+i['cgst']+i['sgst']+i['igst']) for i in b['items']) for b in data['bills'])
        chk('LibreOffice recalculated grand total matches',abs(float(tot[14].replace('"','').replace(',',''))-exp)<0.5,(tot[14],exp))
        # --- continue from the downloaded sheet
        await pg.evaluate("window.XLSX.read=()=>({SheetNames:['s'],Sheets:{s:{rows:window.__back}}})")
        back=await pg.evaluate("(d)=>XLSX.readAsync(new Uint8Array(d))",list(open(xf,'rb').read()))
        await pg.evaluate("(r)=>{window.__back=r}",back)
        await pg.evaluate("bxCont({name:'x.xlsx',arrayBuffer:async()=>new ArrayBuffer(1)})");await pg.wait_for_timeout(500)
        chk('continue from the Excel file: all 7 bills come back',await pg.evaluate("bxCur().bills.length")==7)
        chk('continued sheet has same totals',abs(await pg.evaluate("bxCur().bills.reduce((a,b)=>a+bxFig(b)[4],0)")-exp)<0.01)
        # remembered on the server
        c2=await b.new_context();p2=await c2.new_page();await p2.route('**/fonts.g*/**',lambda r:r.abort());await p2.goto('http://127.0.0.1:%d/'%PORT)
        await p2.evaluate("tg(1)");await p2.fill('#lu','ravi');await p2.fill('#lp','pass1');await p2.click('#sb .go');await p2.wait_for_timeout(2000)
        print('  DB keys on 2nd login:',await p2.evaluate("USER+' '+Object.keys(DB)+' '+(DB.bx?DB.bx.sheets.length:'nobx')"))
        chk('sheets remembered on the server (second login)',await p2.evaluate("DB.bx&&DB.bx.sheets.length")==2)
        # --- the same bills as PDFs
        pages=json.load(open('/tmp/bpdf/pages.json'))
        out=await pg.evaluate("""async(pages)=>{const o={};for(const k of Object.keys(pages)){const rows=await bxLines(pages[k]);const b=bxFromRows(rows,'27AABFI1006M1ZM');o[k]={no:b.no,date:b.date,party:b.party,gstin:b.gstin,warn:b.warn,pt:b.printed_total,items:b.items.map(i=>[i.hsn,i.qty,i.unit,i.taxable,i.cgst,i.sgst])}}return o}""",pages)
        ok=True
        for k,v in out.items():
            e=byno.get(v['no']);same=e and v['party']==e['party'] and v['gstin']==e['gstin'] and v['date']==e['date'] and [[x[0],x[1],x[2],x[3],x[4],x[5]] for x in v['items']]==[[x[0],x[1],x[2],x[3],x[4],x[5]] for x in e['items']]
            if not same:ok=False;print('  PDF differs:',k,v,e)
        chk('the 7 PDF versions read the same as the Excel versions',ok)
        chk('no JS errors',not errs);print(errs)
        await b.close()
    srv.terminate()
    bad=[n for n,c in res if not c];print('ALL OK' if not bad else 'SOME FAILED: '+str(bad))
asyncio.run(main())
