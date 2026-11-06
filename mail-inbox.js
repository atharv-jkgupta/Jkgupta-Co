/* JK Gupta & Co. - Live inbox for the Notice Intelligence dashboard.
   Shows the emails the Gmail reader has read (notices, deadlines, summaries, section-wise reply packs)
   and runs the approval chain: staff submit -> chosen reviewer approves -> owner confirms.
   Nothing here can send an email. The owner sends by hand, then records it as sent. */
(function () {
  'use strict';
  if (window.__miLoaded) return; window.__miLoaded = true;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var tok = function () { try { return (JSON.parse(sessionStorage.getItem('jkgc') || 'null') || {}).t || ''; } catch (e) { return ''; } };
  var todayIso = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var daysTo = function (iso) { if (!iso) return null; return Math.round((Date.parse(iso.slice(0, 10) + 'T00:00:00') - Date.parse(todayIso() + 'T00:00:00')) / 86400000); };
  var fmt = function (iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; };
  var when = function (iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  async function rpc(fn, body) {
    var h = { apikey: CLOUD.key, 'Content-Type': 'application/json' };
    if (/^eyJ/.test(CLOUD.key)) h.Authorization = 'Bearer ' + CLOUD.key;
    var r = await fetch(CLOUD.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('The server answered ' + r.status);
    var j = await r.json();
    if (j && j.ok === false) throw new Error(j.err === 'login' ? 'Your login has expired. Please log in again.' : (j.err || 'The server refused this'));
    return j;
  }

  var ST = { items: [], state: {}, me: {}, err: '', filter: 'All', q: '', loaded: false, timer: null };
  var STAGE = { draft_ready: 'Draft ready, staff to review', awaiting_review: 'Waiting for the reviewer', awaiting_owner: 'Waiting for the owner', rejected: 'Sent back for changes', confirmed_ready_to_send: 'Confirmed: owner sends by hand', sent_manually: 'Recorded as sent' };
  var STATUSES = ['New', 'In progress', 'Waiting for client', 'Reply drafted', 'Filed', 'Completed'];
  var isAdmin = function () { return ST.me && ST.me.role === 'admin'; };
  var people = function () {
    var a = []; try { if (typeof U === 'function') a = Object.keys(U() || {}); } catch (e) { }
    if (ST.me && ST.me.role === 'admin' && ST.me.u && a.indexOf(ST.me.u) < 0) a.unshift(ST.me.u);
    return a;
  };

  /* ---------- styles ---------- */
  function css() {
    if ($('mi-css')) return;
    var s = document.createElement('style'); s.id = 'mi-css';
    s.textContent = [
      '.mi-pills{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.mi-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:30px;border:1px solid var(--n-border,#30455e);background:var(--n-card2,#1c2d43);color:var(--n-muted,#a9b8ca);font-size:10px;font-weight:800;white-space:nowrap}',
      '.mi-pill.u{background:#7a1f2b33;border-color:#c0475a;color:#ff9fae}.mi-pill.h{background:#8a5a1633;border-color:#c98a3a;color:#f2c47c}.mi-pill.n{}.mi-pill.l{opacity:.7}.mi-pill.ok{background:#1f6a4d33;border-color:#3fa07c;color:#8fe0bf}.mi-pill.bad{background:#7a1f2b33;border-color:#c0475a;color:#ff9fae}',
      '.mi-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:12px 0;border-top:1px solid var(--n-border,#30455e);cursor:pointer}.mi-row:first-child{border-top:0}.mi-row:hover .mi-t{text-decoration:underline}',
      '.mi-t{font-size:12px;font-weight:800;color:var(--n-text,#edf2f8);line-height:1.4}.mi-s{font-size:10px;color:var(--n-muted,#a9b8ca);margin-top:3px;line-height:1.5}.mi-d{font-size:11px;color:var(--n-muted,#a9b8ca);margin-top:5px;line-height:1.5}',
      '.mi-r{text-align:right;font-size:10px;color:var(--n-muted,#a9b8ca);white-space:nowrap}.mi-days{font:700 15px Georgia,serif;color:var(--n-text,#edf2f8)}.mi-days.red{color:#ff8a9a}.mi-days.amber{color:#f2c47c}',
      '.mi-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.mi-bar .ni-field{flex:1;min-width:140px}',
      '#mi-modal{position:fixed;inset:0;z-index:99999;background:#050a12cc;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:22px 10px;--n-bg:#101b2b;--n-card:#17263a;--n-card2:#1c2d43;--n-border:#30455e;--n-text:#edf2f8;--n-muted:#a9b8ca;--n-gold:#cbb078;--n-green:#4da986}',
      '[data-theme=light] #mi-modal{--n-bg:#f5f7fa;--n-card:#fff;--n-card2:#f8fafc;--n-border:#dce3ec;--n-text:#18283b;--n-muted:#65758a;--n-gold:#a7833f;--n-green:#237c5d}',
      '#mi-modal .box{width:min(980px,100%);background:var(--n-card);color:var(--n-text);border:1px solid var(--n-border);border-radius:16px;padding:20px;font:13px/1.55 Inter,system-ui,sans-serif}',
      '#mi-modal h3{margin:0 0 4px;font:600 18px Georgia,serif}#mi-modal h4{margin:16px 0 7px;font-size:12px;letter-spacing:.8px;text-transform:uppercase;color:var(--n-gold)}',
      '#mi-modal .g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#mi-modal .g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}@media(max-width:700px){#mi-modal .g2,#mi-modal .g3{grid-template-columns:1fr}}',
      '#mi-modal label{display:block;font-size:10px;font-weight:800;color:var(--n-muted);margin:0 0 3px}#mi-modal input,#mi-modal select,#mi-modal textarea{width:100%;box-sizing:border-box;background:var(--n-bg);color:var(--n-text);border:1px solid var(--n-border);border-radius:8px;padding:8px 9px;font:inherit}#mi-modal textarea{min-height:120px;resize:vertical}',
      '#mi-modal .card{background:var(--n-card2);border:1px solid var(--n-border);border-radius:11px;padding:11px 13px}#mi-modal .facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}#mi-modal .facts div{background:var(--n-card2);border:1px solid var(--n-border);border-radius:9px;padding:7px 10px;font-size:11px;word-break:break-word}#mi-modal .facts b{display:block;font-size:9px;color:var(--n-muted);letter-spacing:.6px;text-transform:uppercase}',
      '#mi-modal ul{margin:5px 0 0 18px;padding:0}#mi-modal li{margin:3px 0}#mi-modal .warn{border-color:#c98a3a;background:#8a5a1626}#mi-modal .bad{border-color:#c0475a;background:#7a1f2b2e}#mi-modal .good{border-color:#3fa07c;background:#1f6a4d26}',
      '#mi-modal .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#mi-modal pre{white-space:pre-wrap;word-break:break-word;font:11px/1.5 ui-monospace,Consolas,monospace;background:var(--n-bg);border:1px solid var(--n-border);border-radius:9px;padding:10px;max-height:260px;overflow:auto;margin:0}',
      '#mi-modal .steps{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}#mi-modal .steps span{font-size:10px;font-weight:800;padding:4px 9px;border-radius:30px;border:1px solid var(--n-border);color:var(--n-muted)}#mi-modal .steps span.on{background:var(--n-gold);color:#13263a;border-color:var(--n-gold)}#mi-modal .steps span.done{border-color:#3fa07c;color:#8fe0bf}',
      '#mi-modal .x{float:right}#mi-modal .log{font-size:11px;color:var(--n-muted)}#mi-modal .log div{padding:3px 0;border-top:1px solid var(--n-border)}#mi-modal details{margin-top:8px}#mi-modal summary{cursor:pointer;font-size:11px;font-weight:800;color:var(--n-muted)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- panel on the dashboard ---------- */
  function counts() {
    var a = ST.items, act = a.filter(function (x) { return x.requires_action && !/^(filed|completed)$/i.test(x.case_status || ''); });
    return { all: a.length, act: act.length, urg: a.filter(function (x) { return x.priority === 'Urgent' && !/^(filed|completed)$/i.test(x.case_status || ''); }).length, notices: a.filter(function (x) { return /notice/i.test(x.category || ''); }).length };
  }
  function shown() {
    var q = ST.q.toLowerCase(), f = ST.filter;
    var src = (f === 'All' || f === 'Notices') ? ST.items.slice().sort(function (a, b) { return new Date(b.received_at || 0) - new Date(a.received_at || 0); }) : ST.items;
    return src.filter(function (x) {
      var open = !/^(filed|completed)$/i.test(x.case_status || '');
      if (f === 'Action needed' && !(x.requires_action && open)) return false;
      if (f === 'Urgent' && !(x.priority === 'Urgent' && open)) return false;
      if (f === 'Notices' && !/notice/i.test(x.category || '')) return false;
      if (f === 'Drafts waiting' && !(x.draft && /awaiting/.test(x.draft.stage || ''))) return false;
      if (q && (x.subject + ' ' + x.from_address + ' ' + x.from_name + ' ' + x.summary + ' ' + JSON.stringify(x.facts || {})).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function rowHtml(x) {
    var due = x.confirmed_due || x.proposed_due, d = daysTo(due), pc = x.priority === 'Urgent' ? 'u' : x.priority === 'High' ? 'h' : x.priority === 'Low' ? 'l' : 'n';
    var att = (x.attachments || []).length ? ((x.facts && x.facts.read_attachment_text) ? '<span class="mi-pill ok">PDF read</span>' : (x.facts && x.facts.details_in_attachment ? '<span class="mi-pill bad">PDF not read</span>' : '<span class="mi-pill">' + x.attachments.length + ' attachment(s)</span>')) : '';
    var st = x.draft && x.draft.stage ? '<span class="mi-pill">' + esc(STAGE[x.draft.stage] || x.draft.stage) + '</span>' : '';
    return '<div class="mi-row" onclick="miOpen(\'' + esc(x.message_id).replace(/'/g, '') + '\')"><div><div class="mi-pills"><span class="mi-pill ' + pc + '">' + esc(x.priority) + '</span><span class="mi-pill">' + esc(x.category) + '</span>' + att + st + (x.verified ? '<span class="mi-pill ok">Verified</span>' : '') + '</div>' +
      '<div class="mi-t">' + esc(x.subject || '(no subject)') + '</div><div class="mi-s">' + esc((x.from_name ? x.from_name + ' · ' : '') + x.from_address) + ' · ' + esc(when(x.received_at)) + (x.assigned_to ? ' · Assigned: ' + esc(x.assigned_to) : ' · Not assigned') + (x.reviewer ? ' · Reviewer: ' + esc(x.reviewer) : '') + '</div>' +
      '<div class="mi-d">' + esc((x.summary || '').slice(0, 260)) + '</div></div><div class="mi-r">' + (due ? '<div class="mi-days ' + (d !== null && d <= 3 ? 'red' : d !== null && d <= 7 ? 'amber' : '') + '">' + (d === null ? '' : d < 0 ? Math.abs(d) + ' days late' : d === 0 ? 'Today' : d + ' days') + '</div>' + (x.confirmed_due ? 'Due ' : 'Est. due ') + fmt(due) : 'No date') + (x.hearing_date ? '<br>Hearing ' + fmt(x.hearing_date) : '') + '</div></div>';
  }
  function status() {
    var s = ST.state || {}, seen = s.worker_seen_at ? (Date.now() - Date.parse(s.worker_seen_at)) / 60000 : null;
    if (!s.connected) return '<span class="mi-pill bad">Gmail reader not connected yet</span>';
    if (seen !== null && seen > 20) return '<span class="mi-pill bad">Gmail reader silent for ' + Math.round(seen) + ' min</span>';
    return '<span class="mi-pill ok">Gmail reader running · last check ' + esc(when(s.worker_seen_at)) + '</span>' + (s.last_error ? '<span class="mi-pill bad">Last error: ' + esc(String(s.last_error).slice(0, 80)) + '</span>' : '');
  }
  function paint() {
    var p = $('mi-body'); if (!p) return;
    var c = counts(), list = shown();
    $('mi-head').innerHTML = status() + '<span class="ni-count">' + c.urg + ' URGENT · ' + c.act + ' NEED ACTION · ' + c.all + ' TOTAL</span>';
    p.innerHTML = (ST.err ? '<div class="mi-pill bad" style="margin-bottom:8px">' + esc(ST.err) + '</div>' : '') +
      (!ST.state.connected && !ST.items.length ? '<div class="ni-empty"><div class="ni-item-title">Waiting for the Gmail reader</div><div class="ni-item-sub">Do the one-time Google setup (SETUP-STEPS file). New emails, notices and PDF attachments will appear here by themselves, even when nobody has this page open.</div></div>' :
        list.length ? list.map(rowHtml).join('') : '<div class="ni-empty"><div class="ni-item-title">Nothing here</div><div class="ni-item-sub">No email matches this filter.</div></div>');
  }
  function mount() {
    var ni = document.querySelector('.ni'); if (!ni || $('mi-panel')) return;
    css();
    var anchor = ni.querySelector('.ni-layout'), sec = document.createElement('section');
    sec.className = 'ni-panel'; sec.id = 'mi-panel'; sec.style.margin = '0 0 14px';
    sec.innerHTML = '<div class="ni-panel-head"><div><div class="ni-panel-title">Live inbox (read from Gmail)</div><div class="ni-panel-sub">Notices, deadlines and section-wise reply drafts prepared by the system. Nothing is ever sent automatically.</div></div><button class="ni-btn alt" onclick="miLoad(true)">Refresh</button></div><div class="mi-pills" id="mi-head"></div>' +
      '<div class="mi-bar"><input class="ni-field" id="mi-q" placeholder="Search subject, sender, GSTIN, PAN, DIN…" oninput="miQ(this.value)"><select class="ni-field" id="mi-f" onchange="miF(this.value)">' + ['Action needed', 'Urgent', 'Notices', 'Drafts waiting', 'All'].map(function (o) { return '<option' + (o === ST.filter ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div><div id="mi-body"></div>';
    if (anchor) anchor.parentNode.insertBefore(sec, anchor); else ni.appendChild(sec);
    $('mi-q').value = ST.q; paint(); load(false);
    if (!ST.timer) ST.timer = setInterval(function () { if ($('mi-panel') && !document.hidden && !$('mi-modal')) load(false); }, 60000);
  }
  async function load(manual) {
    if (!tok()) return;
    try { var r = await rpc('mail_list', { p_t: tok(), p_limit: 500 }); ST.items = r.items || []; ST.state = r.state || {}; ST.me = r.me || {}; ST.err = ''; ST.loaded = true; }
    catch (e) { ST.err = 'Could not load the inbox: ' + e.message; }
    paint();
  }

  /* ---------- detail window ---------- */
  var CUR = null;
  function chips(label, v) { return v ? '<div><b>' + esc(label) + '</b>' + esc(v) + '</div>' : ''; }
  function flow(stage) {
    var order = ['draft_ready', 'awaiting_review', 'awaiting_owner', 'confirmed_ready_to_send', 'sent_manually'], names = ['1 Draft', '2 Reviewer approves', '3 Owner confirms', '4 Owner sends by hand', '5 Recorded as sent'], i = order.indexOf(stage === 'rejected' ? 'draft_ready' : stage);
    return '<div class="steps">' + names.map(function (n, k) { return '<span class="' + (k < i ? 'done' : k === i ? 'on' : '') + '">' + n + '</span>'; }).join('') + '</div>';
  }
  function list(a) { return a && a.length ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<div class="log">None</div>'; }
  function opts(arr, cur, blank) { return (blank ? '<option value="">' + blank + '</option>' : '') + arr.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); }
  function detailHtml(m) {
    var f = m.facts || {}, d = m.draft || {}, r = d.response || null, stage = d.stage || '', me = ST.me.u, admin = isAdmin();
    var ppl = people(), canEdit = d.stage && !/confirmed_ready|sent_manually/.test(stage);
    var h = '<div class="box"><button class="ni-btn alt x" onclick="miClose()">Close</button><h3>' + esc(m.subject || '(no subject)') + '</h3><div class="log">' + esc((m.from_name ? m.from_name + ' · ' : '') + m.from_address) + ' · received ' + esc(when(m.received_at)) + '</div>' +
      '<div class="mi-pills" style="margin-top:8px"><span class="mi-pill ' + (m.priority === 'Urgent' ? 'u' : m.priority === 'High' ? 'h' : 'n') + '">' + esc(m.priority) + '</span><span class="mi-pill">' + esc(m.category) + '</span></div><div id="mi-msg"></div>';
    if (/suspicious/i.test(m.category)) h += '<div class="card bad"><b>May be fake.</b> The sender is not a government address. Do not click links or share details. Check the real notice on the official portal.</div>';
    h += '<h4>What the system understood</h4><div class="card">' + esc(m.summary) + (f.due_source ? '<div class="log" style="margin-top:6px">Reply date: ' + esc(f.due_source) + '</div>' : '') + '</div>';
    if (f.details_in_attachment) h += '<div class="card warn" style="margin-top:8px">A PDF is attached but its text could not be read. Open the PDF and read the notice yourself.</div>';
    if (f.pdf_locked) h += '<div class="card warn" style="margin-top:8px">A PDF attachment is password protected. Open it manually (often PAN in capitals + date of birth).</div>';
    var fx = chips('Notice type', f.notice_type) + chips('Authority', f.authority) + chips('GSTIN', f.gstin) + chips('PAN', f.pan) + chips('Assessment year', f.assessment_year) + chips('Financial year', f.financial_year) + chips('Reference', f.reference) + chips('DIN', f.din) + chips('Notice date', f.notice_date ? fmt(f.notice_date) : '') + chips('Sections cited', (f.sections_cited || []).join(', ')) + chips('Amounts', (f.amounts || []).map(function (x) { return 'Rs ' + Number(x).toLocaleString('en-IN'); }).join(', '));
    if (fx) h += '<h4>Details found</h4><div class="facts">' + fx + '</div>';
    if (f.issues_raised && f.issues_raised.length) h += '<h4>Points raised in the notice</h4>' + list(f.issues_raised);
    if (f.documents_requested && f.documents_requested.length) h += '<h4>Information / documents the notice asks for</h4>' + list(f.documents_requested);
    h += '<h4>Tasks</h4>' + (m.requested_actions && m.requested_actions.length ? '<ul>' + m.requested_actions.map(function (a) { return '<li>' + esc(a.action) + (a.due ? ' <span class="log">(by ' + fmt(a.due) + ')</span>' : '') + '</li>'; }).join('') + '</ul>' : '<div class="log">No task found.</div>');
    h += '<h4>Dates and people</h4><div class="g3"><div><label>Estimated reply date (system)</label><input value="' + esc(m.proposed_due ? fmt(m.proposed_due) : 'none') + '" disabled></div><div><label>Confirmed due date (you decide)</label><input type="date" id="mi-due" value="' + esc(m.confirmed_due || '') + '"></div><div><label>Hearing date</label><input value="' + esc(m.hearing_date ? fmt(m.hearing_date) : 'none') + '" disabled></div>' +
      '<div><label>Assigned to</label><select id="mi-as">' + opts(ppl.concat(m.assigned_to && ppl.indexOf(m.assigned_to) < 0 ? [m.assigned_to] : []), m.assigned_to, 'Not assigned') + '</select></div><div><label>Reviewer (must be someone else)</label><select id="mi-rv">' + opts(ppl.concat(m.reviewer && ppl.indexOf(m.reviewer) < 0 ? [m.reviewer] : []), m.reviewer, 'Choose reviewer') + '</select></div><div><label>Status</label><select id="mi-st">' + opts(STATUSES, m.case_status) + '</select></div></div>' +
      '<label style="margin-top:9px;display:flex;gap:7px;align-items:center"><input type="checkbox" id="mi-vf" style="width:auto"' + (m.verified ? ' checked' : '') + '> I checked the notice and the details above are correct</label><div class="btns"><button class="ni-btn" onclick="miSave()">Save these details</button></div>';
    if (r) {
      h += '<h4>Reply pack: ' + esc(r.title) + '</h4><div class="card"><b>Where to reply:</b> ' + esc(r.how_to_reply) + '<br><b>Time limit:</b> ' + esc(r.time_limit) + (r.legal_basis && r.legal_basis.length ? '<br><b>Law:</b> ' + esc(r.legal_basis.join(' · ')) : '') + '</div>' +
        '<div class="g2" style="margin-top:8px"><div><h4 style="margin-top:6px">Options</h4>' + list(r.options) + '<h4>Documents to collect</h4>' + list(r.documents) + '</div><div><h4 style="margin-top:6px">Points to examine</h4>' + list(r.points) + '<h4>Cautions</h4>' + list(r.cautions) + '</div></div>';
    }
    if (!/confirmed_ready|sent_manually/.test(stage)) h += '<h4>Prepare a reply</h4><div class="card">Choose the format. The draft is filled in below and then goes through your review and approval steps. Nothing is sent by this system.<div class="btns"><button class="ni-btn" onclick="miMake(\'email\')">Make email reply</button><button class="ni-btn alt" onclick="miMake(\'letter\')">Make formal letter</button></div>' + (d.stage ? '<div class="log">Making a new draft replaces the text in the boxes below and clears earlier approvals.</div>' : '') + '</div>';
    if (d.stage) {
      h += '<h4>Reply drafts and approval</h4>' + flow(stage) + '<div class="card ' + (stage === 'rejected' ? 'warn' : stage === 'confirmed_ready_to_send' ? 'good' : '') + '"><b>' + esc(STAGE[stage] || stage) + '</b>' + (d.submitted_by ? ' · submitted by ' + esc(d.submitted_by) : '') + (d.reviewed_by ? ' · approved by ' + esc(d.reviewed_by) : '') + (d.confirmed_by ? ' · confirmed by ' + esc(d.confirmed_by) : '') + (d.reject_note ? '<br>Sent back because: ' + esc(d.reject_note) : '') + '<div class="log">' + esc(d.note || '') + ' Nothing is sent by this system: after the owner confirms, the owner sends the reply by hand and records it here.</div></div>';
      if (r || d.reply_text) h += '<label style="margin-top:9px">Reply letter to the authority (for the portal / letter). Fill the [brackets].</label><textarea id="mi-lt" style="min-height:260px"' + (canEdit ? '' : ' disabled') + '>' + esc(d.reply_text || r.reply_text || '') + '</textarea>';
      h += '<div class="g2" style="margin-top:9px"><div><label>Email to client / sender: To</label><input id="mi-to" value="' + esc((d.to || []).join(', ')) + '"' + (canEdit ? '' : ' disabled') + '></div><div><label>Subject</label><input id="mi-sj" value="' + esc(d.subject || '') + '"' + (canEdit ? '' : ' disabled') + '></div></div><label style="margin-top:9px">Email text</label><textarea id="mi-bd"' + (canEdit ? '' : ' disabled') + '>' + esc(d.body || '') + '</textarea>';
      var b = '';
      if (canEdit) b += '<button class="ni-btn alt" onclick="miStep(\'edit\')">Save draft changes</button>';
      if (/draft_ready|rejected/.test(stage)) b += '<button class="ni-btn" onclick="miStep(\'submit\')">Submit to reviewer</button>';
      if (stage === 'awaiting_review' && me && me === m.reviewer) b += '<button class="ni-btn" onclick="miStep(\'approve\')">Approve as reviewer</button>';
      if ((stage === 'awaiting_review' && (admin || me === m.reviewer)) || (stage === 'awaiting_owner' && admin)) b += '<button class="ni-btn alt" onclick="miReject()">Send back</button>';
      if (stage === 'awaiting_owner' && admin) b += '<button class="ni-btn" onclick="miStep(\'confirm\')">Owner: final confirmation</button>';
      if (stage === 'confirmed_ready_to_send' && admin) b += '<button class="ni-btn" onclick="miStep(\'mark_sent\')">I sent it by hand: record</button>';
      b += '<button class="ni-btn alt" onclick="miCopy()">Copy letter</button><button class="ni-btn alt" onclick="miDownload()">Download letter (.txt)</button>';
      h += '<div class="btns">' + b + '</div>';
    }
    h += '<details><summary>Email text as received</summary><pre>' + esc(m.body_text || '') + '</pre></details>';
    if (m.attachment_text) h += '<details><summary>Text read from the PDF attachment(s)</summary><pre>' + esc(m.attachment_text) + '</pre></details>';
    h += '<h4>History</h4><div class="log">' + (m.activity || []).slice().reverse().map(function (a) { return '<div>' + esc(when(a.at)) + ' · ' + esc(a.by) + ': ' + esc(a.what) + '</div>'; }).join('') + '</div></div>';
    return h;
  }
  async function open(id) {
    css(); var el = $('mi-modal'); if (!el) { el = document.createElement('div'); el.id = 'mi-modal'; document.body.appendChild(el); }
    el.innerHTML = '<div class="box">Loading…</div>';
    try { var r = await rpc('mail_get', { p_t: tok(), p_id: id }); CUR = r.item; el.innerHTML = detailHtml(CUR); }
    catch (e) { el.innerHTML = '<div class="box"><button class="ni-btn alt x" onclick="miClose()">Close</button><div class="mi-pill bad">' + esc(e.message) + '</div></div>'; }
  }
  function msg(t, bad) { var m = $('mi-msg'); if (m) m.innerHTML = '<div class="card ' + (bad ? 'bad' : 'good') + '" style="margin-top:8px">' + esc(t) + '</div>'; var b = document.querySelector('#mi-modal .box'); if (b) b.scrollIntoView({ block: 'start' }); }
  async function reopen(note) { var id = CUR.message_id; await open(id); if (note) msg(note, false); load(false); }
  async function save() {
    var patch = { assigned_to: $('mi-as').value, reviewer: $('mi-rv').value, case_status: $('mi-st').value, confirmed_due: $('mi-due').value, verified: $('mi-vf').checked };
    try { await rpc('mail_update', { p_t: tok(), p_id: CUR.message_id, p_patch: patch }); await reopen('Saved.'); } catch (e) { msg(e.message, true); }
  }
  async function step(action, extra) {
    var edit = null;
    if (action === 'edit' || action === 'submit') {
      edit = { subject: $('mi-sj') ? $('mi-sj').value : undefined, body: $('mi-bd') ? $('mi-bd').value : undefined, to: $('mi-to') ? $('mi-to').value.split(',').map(function (x) { return x.trim(); }).filter(String) : undefined };
      if ($('mi-lt')) edit.reply_text = $('mi-lt').value;
      if (action === 'submit') {
        // save any edits first (this clears old approvals), then submit
        var d = CUR.draft || {}; var changed = (edit.subject !== d.subject) || (edit.body !== d.body) || (edit.reply_text !== undefined && edit.reply_text !== (d.reply_text || '')) || (edit.to && edit.to.join(', ') !== (d.to || []).join(', '));
        try { await rpc('mail_update', { p_t: tok(), p_id: CUR.message_id, p_patch: { assigned_to: $('mi-as').value, reviewer: $('mi-rv').value } }); if (changed) await rpc('mail_draft_step', { p_t: tok(), p_id: CUR.message_id, p_action: 'edit', p_edit: edit }); } catch (e) { return msg(e.message, true); }
        edit = null;
      }
    } else if (extra) edit = extra;
    try { await rpc('mail_draft_step', { p_t: tok(), p_id: CUR.message_id, p_action: action, p_edit: edit }); await reopen({ edit: 'Draft saved. Earlier approvals were cleared.', submit: 'Submitted to the reviewer.', approve: 'Approved. Now waiting for the owner.', confirm: 'Confirmed. Send it by hand, then press "I sent it by hand".', mark_sent: 'Recorded as sent.', reject: 'Sent back.' }[action] || 'Done.'); }
    catch (e) { msg(e.message, true); }
  }
  async function make(fmt, force) {
    if (!CUR) return;
    var d = CUR.draft || {};
    if (!force && d.stage && (d.edited_by || d.submitted_by) && !confirm('This replaces the current draft text and clears earlier approvals. Continue?')) return;
    msg('Preparing the ' + (fmt === 'letter' ? 'letter' : 'email') + '… this can take up to a minute.', false);
    try {
      var r = await fetch(CLOUD.url.replace(/\/+$/, '') + '/functions/v1/mail-reply', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-token': tok() }, body: JSON.stringify({ message_id: CUR.message_id, format: fmt, force: !!force }) });
      var j = await r.json();
      if (r.status === 401) throw new Error('Your login has expired. Please log in again.');
      if (j.blocked) { msg(j.reason, true); return; }
      if (j.no_reply_needed) { if (confirm(j.reason + '\n\nMake a draft anyway?')) return make(fmt, true); msg(j.reason, true); return; }
      if (!j.ok) throw new Error(j.error || 'Could not prepare the draft.');
      await reopen(j.applied ? 'Draft ready below. Check it, fill the [brackets], then submit it for review.' : 'The draft is locked after the owner confirmed it, so it was not changed.');
    } catch (e) { msg(e.message, true); }
  }
  function reject() { var n = prompt('Why is it being sent back? (the staff will see this)'); if (n === null) return; step('reject', { note: n }); }
  function letterText() { return ($('mi-lt') ? $('mi-lt').value : '') || ($('mi-bd') ? $('mi-bd').value : ''); }
  function copy() { var t = letterText(); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { msg('Copied.', false); }, function () { msg('Could not copy. Select the text and copy it.', true); }); }
  function download() { var t = letterText(), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = 'reply-' + (CUR.message_id || 'draft') + '.txt'; document.body.appendChild(a); a.click(); a.remove(); }

  window.miOpen = open; window.miClose = function () { var e = $('mi-modal'); if (e) e.remove(); CUR = null; };
  window.miMake = make; window.miSave = save; window.miStep = step; window.miReject = reject; window.miCopy = copy; window.miDownload = download;
  window.miLoad = load; window.miQ = function (v) { ST.q = v; paint(); }; window.miF = function (v) { ST.filter = v; paint(); };

  /* the dashboard redraws itself often: put the panel back whenever it is missing */
  var app = document.getElementById('app') || document.body;
  new MutationObserver(function () { if (document.querySelector('.ni') && !$('mi-panel')) mount(); }).observe(app, { childList: true, subtree: false });
  mount();
})();
