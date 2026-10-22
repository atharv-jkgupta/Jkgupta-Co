import re, sys
SRC, OUT, URL, KEY, BUILD = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
h = open(SRC, encoding='utf-8').read()
css = open('/home/claude/app/build/theme.css', encoding='utf-8').read()
shim = open('/home/claude/app/build/shim.js', encoding='utf-8').read().replace("'__URL__'", 'location.origin' if URL == 'office' else repr('' if URL in ('travel', 'hybrid') else URL)).replace('__KEY__', 'office' if URL in ('office', 'hybrid') else KEY).replace('__TB__', 'true' if URL in ('travel', 'hybrid') else 'false').replace('__HB__', 'true' if URL == 'hybrid' else 'false').replace('get user(){','get token(){return sess&&sess.t},get user(){')

def sub1(pat, rep, s, flags=0):
    n = len(re.findall(pat, s, flags))
    assert n == 1, (pat[:60], n)
    return re.sub(pat, lambda m: rep, s, flags=flags)

def rep1(a, b, s):
    assert s.count(a) == 1, (a[:70], s.count(a))
    return s.replace(a, b)

feat = open('/home/claude/app/build/sha.js', encoding='utf-8').read() + open('/home/claude/app/build/features.js', encoding='utf-8').read().replace('__BUILD__', BUILD) + open('/home/claude/app/build/reco.js', encoding='utf-8').read() + open('/home/claude/app/build/reco2.js', encoding='utf-8').read() + open('/home/claude/app/build/tally.js', encoding='utf-8').read() + open('/home/claude/app/build/attx.js', encoding='utf-8').read() + open('/home/claude/app/build/help.js', encoding='utf-8').read() + open('/home/claude/app/build/themes.js', encoding='utf-8').read() + open('/home/claude/app/build/aichat.js', encoding='utf-8').read() + open('/home/claude/app/build/travel.js', encoding='utf-8').read()
HEAD = ('<meta name="description" content="JK Gupta &amp; Co. client accounting workspace"><meta name="robots" content="noindex,nofollow">'
        '<meta name="theme-color" content="#0f2742"><meta name="jkg-build" content="' + BUILD + '">'
        '<script>try{var t=localStorage.getItem("jkgtheme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}</script>'
        '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 rx=%2714%27 fill=%27%230f2742%27/%3E%3Ctext x=%2732%27 y=%2742%27 font-size=%2734%27 font-family=%27Georgia,serif%27 font-weight=%27700%27 text-anchor=%27middle%27 fill=%27%23e9d9ae%27%3EJK%3C/text%3E%3C/svg%3E">'
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@500;600;700&display=swap">')
h = sub1(r'<style>.*?</style></head><body>', HEAD + '<style>\n' + css + '</style></head><body class="out">', h, re.S)
h = sub1(r'<div id="top">.*?</div></div></div>\n',
 '<div id="top"><div class="tl"><button id="mb" class="ib" onclick="tg()" aria-label="Menu">&#9776;</button><div class="brandR" onclick="logo()" title="JK Gupta &amp; Co.">JK<span>&amp;</span>CO.<small>CHARTERED ACCOUNTANTS</small></div></div>'
 '<div class="tr"><span id="sv"></span><button id="tm" class="ib" onclick="theme()" aria-label="Theme"></button><button id="dm" class="ib" onclick="dm(event)" aria-label="More">&#8942;</button></div></div>\n', h, re.S)
h = rep1('<main id="app"></main>', '<main id="app"><div class="boot">Loading...</div></main>', h)

h = rep1('id="lb" accept=".json"', 'id="lb" accept=".json,application/json,text/plain,*/*"', h)
tag = '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n'
i = h.index(tag) + len(tag)
head, main = h[:i], h[i:]
main = main.replace('localStorage', 'LS')
assert main.count("'jkg|'") == 2
main = main.replace("'jkg|'", "'jkg2|'")
main = sub1(r"MH='[0-9a-f]{64}'", "MH=''", main)
main = sub1(r"AH='[0-9a-f]{64}'", "AH=''", main)
main = sub1(r"const gchk=\(\)=>modal\(.*?\);\n", "", main, re.S)
main = rep1("catch(e){alert('Could not save data in this browser.')}};", "catch(e){alert('Could not save data in this browser.')}if(typeof tkSyncLater=='function')tkSyncLater()};", main)
main = rep1("delete DB.clients[S.c];save();home()", "if(typeof tkDrop=='function')tkDrop(S.c);delete DB.clients[S.c];save();home()", main)
main = rep1("sessionStorage.removeItem('jkgu');home()}", "sessionStorage.removeItem('jkgu');LS.close();home()}", main)
main = rep1("(S.df||'')+'_'+(S.dt||'')", "(S.df&&S.dt?S.df+'_to_'+S.dt:'all')", main)
main = sub1(r"else if\(f=='tpl'\)\{const R=.*?\}\n else\{const R=\[\['Date'", "else if(f=='tpl'){lpXlsm(V,mvl().m.map(x=>x.n),nm+'-Tally-Auto-Entry.xlsm').then(ok=>{if(!ok)alert('Could not load the helper library. Please check the internet and try again.')})}\n else{const R=[['Date'", main, re.S)
main = rep1("function dl(n,t,m){if(/\\.xml$/i.test(n)){sv(", "function dl(n,t,m){if(/\\.xml$/i.test(n)){t=xmlSafe(t);sv(", main)
main = rep1("choose <b>Staff logins</b> and press", "choose <b>Staff &amp; access</b> and press", main)
main = rep1("function loop(){tg(0);", "function loop(){CURP='loop';sb();pgIn('loop');tg(0);", main)
main = rep1("function dash(){const c=C();", "function dash(){CURP='';pgIn('dash');const c=C();", main)
main = rep1("function pc(){", "function pc(){CURP='pc';sb();pgIn('pc');", main)
main = rep1("function gst(){fixN(C());", "function gst(){CURP='';pgIn('gst');fixN(C());", main)
main = rep1("S={c:n};dls();sb();tg(0);dash()", "S={c:n};CURP='';dls();sb();tg(0);dash()", main)
main = sub1(r'<table><tr><th>Bank account</th>.*?</table>\n <div class="stats">', '${bankCards(c)}\n <div class="stats">', main, re.S)
main = rep1("<details><summary>Add bank account</summary>", "<details open><summary>Import from Tally (Excel or XML)</summary>${tlBox()}</details>\n <details><summary>Add bank account</summary>", main)
main = rep1("This changes the admin password on this PC only.", "This changes the admin password for every PC.", main)
main = rep1("This replaces all data on this PC with the backup.", "This replaces all data of this login with the backup.", main)
main = main.replace("E(ADM()?'Admin':USER)", "E(PNAME(ADM()?'Admin':USER))")
main = rep1("E(VIEW?'Admin':ADM()?'Admin':USER)", "E(PNAME(VIEW?'Admin':ADM()?'Admin':USER))", main)
main = rep1("return btoa('jkg2|'+t)}", "return sha256hex('jkg2|'+t)}", main)
main = main.replace("Their saved clients stay in this browser but cannot be opened.", "Their saved clients stay saved but cannot be opened.")

a = main.index("const su=sessionStorage.getItem('jkgu');")
end = "home();\n</script>"
b = main.index(end, a)
boot = ("LS.onSync=onSyncKeys;LS.onExpire=()=>{USER='';VIEW='';DB={clients:{}};sessionStorage.removeItem('jkgu');home();toast('Your session ended. Please sign in again.')};\n"
        "(async()=>{try{if(typeof hybInit=='function')await hybInit()}catch(e){}const su=sessionStorage.getItem('jkgu');let okr=!LS.on;if(su&&LS.on)okr=!!(await LS.resume()).ok;"
        "if(su&&okr&&(LS.on||su==ADMIN||U()[su])){USER=su;try{DB=JSON.parse(LS.getItem('jkg_'+su))||{clients:{}}}catch(e){DB={clients:{}}}if(!DB.clients)DB={clients:{}};afterLogin()}"
        "updTm();home()})();\n</script>")
main = main[:a] + feat + "\n" + boot + main[b + len(end):]
out = head + shim + main
if URL == 'office':
    out = out.replace('the online database', 'the office server').replace('online database', 'office server')
open(OUT, 'w', encoding='utf-8').write(out)
print('built', len(out))
