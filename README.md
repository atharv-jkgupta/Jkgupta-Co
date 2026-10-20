# JK Gupta & Co. workspace

Live: https://jkgupta-co.vercel.app  (Vercel auto-deploys from `main`)

* `index.html`     the finished app (this is what Vercel serves). Built from the files below.
* `version.txt`    build stamp; open pages check it and offer "Update now".
* `supabase/schema.sql`  database (run once in Supabase SQL Editor). Passwords are NOT in the repo: the admin and universal password fingerprints live in the locked table `jkg_conf` (rows `ah`, `mh`).
* `source/JK-Gupta-Co.original.html`  the original single-file program (password fingerprints blanked).
* `build/`  `build.py` patches the original and adds `features.js` (UI, tracker, attendance, staff, safer deletes), `reco.js` (GSTR-2B / GSTR-1 / bank reco), `tally.js` (import from Tally Excel/XML), `shim.js` (Supabase storage), `theme.css`.

Rebuild:
```
python3 build/build.py source/JK-Gupta-Co.original.html index.html <SUPABASE_URL> <SUPABASE_ANON_KEY> b$(date +%y%m%d%H%M)
echo b<same stamp> > version.txt
```
Then commit and push; Vercel deploys by itself.
