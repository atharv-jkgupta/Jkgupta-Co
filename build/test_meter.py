from tcommon import *
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];res=[]
        def chk(n,c,extra=''):res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n,extra if not c else '')
        ctx=await b.new_context(viewport={'width':1280,'height':900});await ctx.add_init_script(MOCK)
        pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
        await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(600)
        await pg.evaluate("window.__mk=u=>({ok:true,db_bytes:u*1048576,limit_bytes:500*1048576,kv_rows:15,kv_bytes:50000,backup_table_bytes:200000,last_backup:'2026-10-24T20:30:00Z',backups_kept:3});LS.stats=()=>Promise.resolve(window.__mk(window.__u||11))")
        await login(pg,'Jkgupta&Co','JKG@2500');await pg.wait_for_timeout(300)
        await pg.evaluate("window.__u=11;LS.stats=()=>Promise.resolve(__mk(window.__u));window._mt={t:0,d:null,err:'',busy:0};home()");await pg.wait_for_timeout(600)
        for u,cls in [(11,'sto-ok'),(350,'sto-warn'),(450,'sto-bad')]:
            await pg.evaluate("([u])=>{window.__u=u;mtLoad(1)}",[u]);await pg.wait_for_timeout(400)
            c=await pg.evaluate("(document.querySelector('#stometer')||{}).className||''");t=await pg.inner_text('#stometer')
            chk('meter '+cls,cls in c,c+' | '+t[:90])
        chk('shows used of 500 MB + percent + last backup','500 MB' in t and '%' in t and 'Last backup' in t,t)
        print('ERRS',errs[:2]);chk('no JS errors',not errs)
        print('ALL OK' if all(res) else 'SOME FAILED');await b.close()
asyncio.run(main())
