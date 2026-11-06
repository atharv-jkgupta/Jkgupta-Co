/* JK Gupta & Co. - JKG Box
   One simple place for all mail and notices read from Gmail. Newest first.
   Uses the live site's own colours. Nothing here can send an email.
   Needs /mail-inbox.js (loaded by itself when a mail is opened). */
(function () {
  'use strict';
  if (window.__jkgLoaded) return; window.__jkgLoaded = true;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var tok = function () { try { return (JSON.parse(sessionStorage.getItem('jkgc') || 'null') || {}).t || ''; } catch (e) { return ''; } };
  var todayIso = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var daysTo = function (iso) { if (!iso) return null; return Math.round((Date.parse(iso.slice(0, 10) + 'T00:00:00') - Date.parse(todayIso() + 'T00:00:00')) / 86400000); };
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

  var ST = { items: [], state: {}, err: '', tab: 'all', q: '', loaded: false, at: 0, timer: null, loading: false };
  var RANK = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
  var isOpen = function (x) { return !/^(filed|completed)$/i.test(x.case_status || ''); };
  var byNew = function (a, b) { return new Date(b.received_at || 0) - new Date(a.received_at || 0); };
  var rank = function (x) { return RANK[x.priority] === undefined ? 2 : RANK[x.priority]; };

  function counts() {
    var a = ST.items;
    return {
      all: a.length,
      act: a.filter(function (x) { return x.requires_action && isOpen(x); }).length,
      notice: a.filter(function (x) { return /notice/i.test(x.category || ''); }).length
    };
  }
  function shown() {
    var q = ST.q.toLowerCase();
    var a = ST.items.filter(function (x) {
      if (ST.tab === 'act' && !(x.requires_action && isOpen(x))) return false;
      if (ST.tab === 'notice' && !/notice/i.test(x.category || '')) return false;
      if (q && (x.subject + ' ' + x.from_address + ' ' + x.from_name + ' ' + x.summary + ' ' + JSON.stringify(x.facts || {})).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    a.sort(ST.tab === 'act' ? function (m, n) { return rank(m) - rank(n) || byNew(m, n); } : byNew);
    return a;
  }

  /* ---------- look: the live site's own colours ---------- */
  function css() {
    if ($('jkg-css')) return;
    var s = document.createElement('style'); s.id = 'jkg-css';
    s.textContent = [
      '.jb-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin:6px 0 14px}',
      '.jb-top h1{margin:0;font:700 28px var(--serif,Georgia,serif);color:var(--ink)}.jb-top p{margin:3px 0 0;color:var(--mute);font-size:14px}',
      '.jb-act{display:flex;gap:8px;flex-wrap:wrap}',
      '.jb-btn{font:600 14px var(--sans,Inter,system-ui,sans-serif);padding:10px 16px;min-height:42px;border-radius:10px;border:1px solid var(--line);background:var(--s1);color:var(--ink);cursor:pointer}',
      '.jb-btn.p{background:var(--pri);color:var(--priink);border-color:var(--pri)}',
      '.jb-st{font-size:12.5px;color:var(--mute);margin:0 0 10px}.jb-st b{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--ok);margin-right:6px}.jb-st.bad b{background:var(--warn)}',
      '.jb-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}',
      '.jb-tab{font:600 14px var(--sans,Inter,system-ui,sans-serif);padding:9px 16px;border-radius:30px;border:1px solid var(--line);background:var(--s1);color:var(--ink);cursor:pointer}',
      '.jb-tab.on{background:var(--pri);color:var(--priink);border-color:var(--pri)}.jb-tab i{font-style:normal;opacity:.75;margin-left:6px;font-weight:500}',
      '.jb-list{border:1px solid var(--line);border-radius:14px;background:var(--s1);overflow:hidden}',
      '.jb-row{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:12px;padding:14px 16px;border-top:1px solid var(--line);cursor:pointer;align-items:start}',
      '.jb-row:first-child{border-top:0}.jb-row:hover{background:var(--s2)}',
      '.jb-dot{width:10px;height:10px;border-radius:50%;margin-top:6px;background:var(--line2,var(--line))}.jb-dot.u{background:#e5484d}.jb-dot.h{background:#f0a23a}',
      '.jb-t{font-weight:700;font-size:15px;color:var(--ink);line-height:1.35}.jb-s{font-size:12.5px;color:var(--mute);margin-top:2px}',
      '.jb-d{font-size:13px;color:var(--mute);margin-top:4px;line-height:1.45;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.jb-r{text-align:right;font-size:12.5px;color:var(--mute);white-space:nowrap}.jb-r b{display:block;font-size:14px;color:var(--ink)}.jb-r b.red{color:#e5484d}.jb-r b.amber{color:#d98a1c}',
      '.jb-tag{display:inline-block;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:20px;border:1px solid var(--line);color:var(--mute);margin-right:6px}',
      '.jb-empty{padding:28px 16px;text-align:center;color:var(--mute)}',
      '.jb-home{display:flex;align-items:center;gap:14px;width:100%;text-align:left;margin:0 0 16px;padding:16px 18px;border-radius:14px;border:2px solid var(--pri);background:var(--s1);color:var(--ink);cursor:pointer}',
      '.jb-home .jb-ic{width:46px;height:46px;border-radius:12px;background:var(--pri);color:var(--priink);display:grid;place-items:center;font-size:22px;flex:none}',
      '.jb-home .jb-tx{flex:1;min-width:0}.jb-home b{display:block;font-size:19px}.jb-home small{display:block;color:var(--mute);font-size:13px;margin-top:2px}.jb-home .jb-go{font-weight:700;color:var(--pri)}',
      /* buttons inside the opened mail */
      '#mi-modal .ni-btn{font:600 13px Inter,system-ui,sans-serif;padding:9px 14px;border-radius:9px;border:1px solid var(--n-gold,#c9a45c);background:var(--n-gold,#c9a45c);color:#17202e;cursor:pointer}',
      '#mi-modal .ni-btn.alt{background:transparent;color:var(--n-text,#edf2f8);border-color:var(--n-border,#30455e)}',
      '#mi-modal .ni-btn:disabled{opacity:.5;cursor:default}',
      '@media(max-width:560px){.jb-row{grid-template-columns:12px minmax(0,1fr)}.jb-r{grid-column:2;text-align:left}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- the page ---------- */
  function statusLine() {
    var s = ST.state || {}, seen = s.worker_seen_at ? (Date.now() - Date.parse(s.worker_seen_at)) / 60000 : null;
    if (!s.connected) return '<div class="jb-st bad"><b></b>Gmail reader not connected yet</div>';
    if (seen !== null && seen > 20) return '<div class="jb-st bad"><b></b>Gmail reader silent for ' + Math.round(seen) + ' min</div>';
    return '<div class="jb-st"><b></b>Gmail reader running · last check ' + esc(when(s.worker_seen_at)) + '</div>';
  }
  function rowHtml(x) {
    var due = x.confirmed_due || x.proposed_due, d = daysTo(due);
    var pc = x.priority === 'Urgent' ? 'u' : x.priority === 'High' ? 'h' : '';
    var right = due && d !== null
      ? '<b class="' + (d <= 3 ? 'red' : d <= 7 ? 'amber' : '') + '">' + (d < 0 ? Math.abs(d) + ' days late' : d === 0 ? 'Today' : d + ' days left') + '</b>' + esc(when(x.received_at))
      : esc(when(x.received_at));
    var tag = /notice/i.test(x.category || '') ? '<span class="jb-tag">Notice</span>' : '';
    return '<div class="jb-row" onclick="jkgOpen(\'' + esc(x.message_id).replace(/'/g, '') + '\')"><span class="jb-dot ' + pc + '"></span><div><div class="jb-t">' + esc(x.subject || '(no subject)') + '</div>' +
      '<div class="jb-s">' + tag + esc((x.from_name ? x.from_name + ' · ' : '') + x.from_address) + '</div>' +
      (x.summary ? '<div class="jb-d">' + esc(String(x.summary).slice(0, 240)) + '</div>' : '') + '</div><div class="jb-r">' + right + '</div></div>';
  }
  function paint() {
    var l = $('jb-list'); if (!l) return;
    var c = counts(), a = shown();
    var tabs = [['all', 'All mail', c.all], ['act', 'Needs action', c.act], ['notice', 'Notices', c.notice]];
    $('jb-tabs').innerHTML = tabs.map(function (t) { return '<button type="button" class="jb-tab' + (ST.tab === t[0] ? ' on' : '') + '" onclick="jkgTab(\'' + t[0] + '\')">' + t[1] + '<i>' + t[2] + '</i></button>'; }).join('');
    $('jb-status').innerHTML = statusLine() + (ST.err ? '<div class="jb-st bad"><b></b>' + esc(ST.err) + '</div>' : '');
    l.innerHTML = a.length ? a.map(rowHtml).join('') : '<div class="jb-empty">' + (ST.loaded ? 'No mail here.' : 'Loading…') + '</div>';
  }
  async function load(force) {
    if (!tok() || ST.loading) return;
    if (!force && ST.loaded && Date.now() - ST.at < 20000) return;
    ST.loading = true;
    try { var r = await rpc('mail_list', { p_t: tok(), p_limit: 500 }); ST.items = r.items || []; ST.state = r.state || {}; ST.err = ''; ST.loaded = true; ST.at = Date.now(); }
    catch (e) { ST.err = 'Could not load the mail: ' + e.message; }
    ST.loading = false;
    paint(); badge();
  }
  function badge() {
    var b = $('jb-hn'); if (!b || !ST.loaded) return;
    var c = counts(); b.textContent = c.act + ' need action · ' + c.all + ' mails · newest first';
  }

  window.jkgbox = function () {
    if (typeof USER !== 'undefined' && !USER) return typeof home === 'function' ? home() : undefined;
    if (typeof VIEW !== 'undefined' && VIEW) return alert('JKG Box is private to each login. Open your own login to use it.');
    var app = $('app'); if (!app) return;
    window.__jkgInOld = false;
    try { CURP = 'jkgbox'; } catch (e) { }
    try { if (typeof sb === 'function') sb(); if (typeof pgIn === 'function') pgIn('jkgbox'); window.TBF = null; } catch (e) { }
    css();
    app.innerHTML = '<i data-pg="jkgbox" hidden></i><button type="button" class="jb-btn" onclick="home()">← Back to home</button>' +
      '<div class="jb-top"><div><h1>JKG Box</h1><p>All your mail and notices in one place, newest first.</p></div>' +
      '<div class="jb-act"><button type="button" class="jb-btn" onclick="jkgRefresh()">Refresh</button><button type="button" class="jb-btn p" onclick="jkgOld()">+ Add notice</button></div></div>' +
      '<div id="jb-status"></div><div class="jb-tabs" id="jb-tabs"></div>' +
      '<input id="jb-q" class="sq" aria-label="Search mail" placeholder="Search subject, sender, GSTIN, PAN…" oninput="jkgQ(this.value)">' +
      '<div class="jb-list" id="jb-list"></div>';
    $('jb-q').value = ST.q; paint(); load(true);
    if (!ST.timer) ST.timer = setInterval(function () { if ($('jb-list') && !document.hidden && !$('mi-modal')) load(true); }, 60000);
    try { window.scrollTo(0, 0); } catch (e) { }
  };
  window.jkgTab = function (t) { ST.tab = t; paint(); };
  window.jkgQ = function (v) { ST.q = v; paint(); };
  window.jkgRefresh = function () { load(true); };
  window.jkgOld = function () { window.__jkgInOld = true; if (typeof window.__ntOld === 'function') window.__ntOld(); };

  /* opening a mail uses the existing mail window (summary, reply drafts, approvals) */
  function ensureMail() {
    return new Promise(function (ok, no) {
      if (window.miOpen) return ok();
      var s = document.createElement('script'); s.src = '/mail-inbox.js'; s.onload = function () { window.miOpen ? ok() : no(new Error('mail window missing')); }; s.onerror = function () { no(new Error('could not load the mail window')); };
      document.head.appendChild(s);
    });
  }
  window.jkgOpen = async function (id) {
    try {
      await ensureMail();
      if (!window.__jkgMe && window.miLoad) { await window.miLoad(false); window.__jkgMe = 1; }
      window.miOpen(id);
    } catch (e) { alert('Could not open this mail: ' + e.message); }
  };

  /* ---------- home screen: JKG Box at the very top, old Notices tile removed ---------- */
  function homeCard() {
    var app = $('app'); if (!app || !app.querySelector('i[data-pg="home"]')) return;
    css();
    app.querySelectorAll('[onclick="notices()"]').forEach(function (b) { b.remove(); });
    if (!$('jb-home')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'jb-home'; b.className = 'jb-home'; b.setAttribute('onclick', 'jkgbox()');
      b.innerHTML = '<span class="jb-ic">✉</span><span class="jb-tx"><b>JKG Box</b><small id="jb-hn">Mail &amp; notices, newest first</small></span><span class="jb-go">Open ›</span>';
      var anchor = app.querySelector('.dbar') || app.querySelector('.dgs');
      if (anchor) anchor.parentNode.insertBefore(b, anchor); else app.appendChild(b);
    }
    badge(); load(false);
  }
  function hook() {
    if (typeof window.home === 'function' && !window.home.__jkg) {
      var h0 = window.home, h1 = function () { window.__jkgInOld = false; var r = h0.apply(this, arguments); try { homeCard(); } catch (e) { } return r; };
      h1.__jkg = true; window.home = h1;
    }
    if (typeof window.notices === 'function' && !window.notices.__jkg) {
      window.__ntOld = window.notices;
      var n1 = function () { return window.__jkgInOld ? window.__ntOld.apply(this, arguments) : window.jkgbox(); };
      n1.__jkg = true; window.notices = n1;
    }
  }
  hook();
  try { homeCard(); } catch (e) { }
})();
