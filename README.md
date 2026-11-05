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




## Notice Intelligence preview branch

Preview launcher: `/notice-preview.html` on the feature-branch Vercel deployment. It fetches the existing workspace as the top-level page and adds `notice-intelligence.js`; it does not frame the app or change production `main`.

Included in this preview:
- Manual capture of pasted email or notice text.
- Rule-based category suggestion for Income Tax, GST, court/tribunal, client/document requests, accounts/payment and general communication.
- Basic PAN, assessment year, section and date suggestions with source context.
- Separate confirmed statutory deadline and hearing-date fields, requiring human verification.
- Owner/reviewer fields, status, checklist, internal office milestones, timeline and CSV export.
- Editable unsent starter reply drafts saved within the application. There is no send control in this preview.

Not included yet:
- Automatic Gmail monitoring from the deployed website.
- Retrieval/processing of Gmail attachments and scanned-PDF OCR.
- AI-generated legal replies. The existing AI route has no production `AI_API_KEY` configured in the inspected environment, so this preview uses a transparent starter template only.
- Durable 24×7 email worker, Gmail OAuth/Pub/Sub watch renewal and retry/reconciliation.

The ChatGPT Gmail connector is not automatically available to the deployed website. Automatic monitoring requires separate website OAuth authorization and a backend worker. Do not rely on extracted dates until staff verifies the original notice.
