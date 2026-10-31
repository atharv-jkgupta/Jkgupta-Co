from tcommon import *
import json
P=json.load(open('/tmp/claude-0/-home-claude/d5a9b3f9-0ac2-5c00-8f48-f8515116be89/scratchpad/cng_items.json'))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900});await ctx.add_init_script(MOCK)
        await ctx.add_init_script("window.alert=m=>{window.__alerts=(window.__alerts||[]).concat([m])}")
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(600)
        await login(pg,'Jkgupta&Co','JKG@2500')
        await pg.evaluate("""(P)=>{DB.bx={sheets:[{id:'s1',company:'MUMBAI CNG POINT',gstin:'27AWLPP9005H1Z7',month:'2026-10-01',bills:[]}],cur:'s1'};bx();bxPdfPages=async()=>({P,pdf:null})}""",P)
        await pg.evaluate("async()=>{await bxAdd([new File([new Uint8Array([37,80,68,70])],'sales_data_month_of_oct26.pdf')])}");await pg.wait_for_timeout(500)
        n=await pg.evaluate("BXP.length");chk('34 bills read from the one PDF',n==34,str(n))
        info=await pg.evaluate("BXP.map(b=>[b.no,b.date,b.party,b.items.length,b.items.map(i=>[i.hsn,i.cgst,i.sgst,i.igst].join('/')).join(';')])")
        chk('all have no, date, party',all(x[0] and x[1] and x[2] for x in info))
        chk('rates are CGST9 SGST9 IGST0 everywhere',all(all(h.split('/')[1:]==['0.09','0.09','0'] for h in x[4].split(';')) for x in info))
        await pg.evaluate("bxAll()");await pg.wait_for_timeout(500)
        k=await pg.evaluate("bxCur().bills.length");print('in sheet',k,(await pg.evaluate("document.body.innerText")).count('already in the sheet'))
        chk('34 bills in the sheet',k==34,str(k))
        print('ERRS',errs[:3]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
