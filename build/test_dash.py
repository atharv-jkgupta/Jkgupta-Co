from tcommon import *
JS_CR="""()=>{const cs=getComputedStyle(document.documentElement);const L=c=>{let m=c.match(/[\\d.]+/g).map(Number);if(/^color\\(/.test(c))m=m.slice(0,3).map(x=>x*255);const v=m.slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const bgOf=e=>{while(e){const b=getComputedStyle(e).backgroundColor;if(b&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(b))return b;e=e.parentElement}return 'rgb(255,255,255)'};
const out=[];const chk=(n,sel)=>{document.querySelectorAll(sel).forEach((e,i)=>{if(i>2)return;const c=getComputedStyle(e).color;out.push([n,+cr(c,bgOf(e)).toFixed(2),getComputedStyle(e).fontSize])})};
chk('hero title','.dh h1');chk('hero text','.dh p');chk('deadline label','.dn span');chk('deadline big','.dn b');chk('deadline date','.dn em');chk('primary btn','.dprim');chk('tile title','.dt b');chk('tile desc','.dt span');chk('tile icon','.dt i');chk('group h','.dg h2');chk('chip','.dc');chk('first title','.dfirst h2');chk('first text','.dfirst p');chk('body','#app');return out}"""
async def main():
    async with async_playwright() as P:
        b=await P.chromium.launch();errs=[];bad=0
        for mode,w,h in [('desktop',1280,1000),('phone',390,844)]:
            ctx=await b.new_context(viewport={'width':w,'height':h});await ctx.add_init_script(MOCK)
            pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.route('**/fonts.g*/**',lambda r:r.abort());await pg.route('**/cdnjs**',lambda r:r.abort())
            await pg.goto('file:///home/claude/app/out/cloud.html');await pg.wait_for_timeout(600)
            await login(pg,'Jkgupta&Co','JKG@2500');await pg.wait_for_timeout(500)
            for state in ['new','used']:
                if state=='used':
                    await pg.evaluate("DB.clients['Sharma Traders']={ver:'Prime',accounts:[{name:'HDFC',lastImport:'2026-09-01'}],ledgers:[],rules:[],hist:[],pending:3,ledgerUpdated:''};save();home()");await pg.wait_for_timeout(400)
                for dark in ['light','dark']:
                    for i in range(5):
                        await pg.evaluate("([d,i])=>{document.documentElement.dataset.theme=d;applyTheme(THEMES[i])}",[dark,i]);await pg.wait_for_timeout(600)
                        r=await pg.evaluate(JS_CR)
                        low=[x for x in r if x[1]<4.5 and x[0]!='tile icon' or (x[0]=='tile icon' and x[1]<3)]
                        sm=await pg.evaluate("[...document.querySelectorAll('.dt span,.dt b,.dn em,.dh p,.dc,.dfirst p')].filter(e=>parseFloat(getComputedStyle(e).fontSize)<15).length")
                        ov=await pg.evaluate("document.documentElement.scrollWidth>innerWidth+2")
                        tag=f'{mode}/{state}/{dark}/{i}'
                        if low or sm or ov:bad+=1;print('FAIL',tag,low,'small',sm,'hscroll',ov)
                        if i in(1,) and dark in('dark','light') and not(state=='new' and mode=='phone' and False):
                            await pg.screenshot(path=f'/tmp/claude-0/-home-claude/d5a9b3f9-0ac2-5c00-8f48-f8515116be89/scratchpad/shot_{mode}_{state}_{dark}.png',full_page=False)
        print('contrast sample',r[:6]);print('ERRS',errs[:3]);print('BAD',bad)
        await b.close()
asyncio.run(main())
