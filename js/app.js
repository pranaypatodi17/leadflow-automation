/* LeadFlow – application shell: routing, chrome, global search, notifications, delegated events */
(function () {
  const LF = (window.LF = window.LF || {});
  LF.pages = LF.pages || {};
  LF.actions = LF.actions || {};
  const { esc, fmt, icon } = { esc: LF.esc, fmt: LF.fmt, icon: LF.icon };
  const q = LF.q, ui = LF.ui;
  const App = (LF.app = {});

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }, { id: 'leads', label: 'Leads', icon: 'users' }, { id: 'tasks', label: 'Follow-Up Tasks', icon: 'tasks' },
    { id: 'automation', label: 'Automation Rules', icon: 'zap' }, { id: 'templates', label: 'Email Templates', icon: 'mail' }, { id: 'team', label: 'Team Members', icon: 'user' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'chart' }, { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  App.NAV = NAV;

  App.route = function () {
    const raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    const qi = raw.indexOf('?'), path = qi >= 0 ? raw.slice(0, qi) : raw;
    const params = Object.fromEntries(new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : ''));
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const name = LF.pages[parts[0]] ? parts[0] : 'dashboard';
    return { name, id: parts[1] || null, parts, params };
  };
  App.go = (hash) => { if (location.hash === hash) App.render(); else location.hash = hash; };

  /* ---------- chrome ---------- */
  function renderSidebar() {
    const r = App.route(), u = q.user(), co = LF.S.settings.company;
    const overdue = LF.S.tasks.filter((t) => q.taskState(t) === 'Overdue').length;
    const newLeads = LF.S.leads.filter((l) => l.status === 'New').length;
    document.getElementById('sidebar').innerHTML =
      '<div class="sb-brand">' + LF.logo(30) + '<b>LeadFlow</b></div>' +
      '<div class="sb-ws" title="Current workspace"><div class="ws-ic">' + esc(fmt.initials(co.name)) + '</div><div class="ws-t"><b>' + esc(co.name) + '</b><span>' + esc((co.workspace || '').split('·')[1] || 'Workspace').trim() + '</span></div></div>' +
      '<nav class="sb-nav">' + NAV.map((n) => {
        const badge = n.id === 'tasks' && overdue ? '<span class="nav-count">' + overdue + '</span>' : n.id === 'leads' && newLeads ? '<span class="nav-count soft">' + newLeads + ' new</span>' : '';
        return '<a class="nav-item' + (r.name === n.id ? ' active' : '') + '" href="#/' + n.id + '" data-tip="' + esc(n.label) + '" data-action="nav-click">' + icon(n.icon) + '<span class="nl">' + n.label + '</span>' + badge + '</a>';
      }).join('') + '</nav>' +
      '<div class="sb-foot"><div class="sb-demo"><b>' + icon('info', 'sm') + ' Demo Mode</b>Sample data only. No real emails are sent.</div>' +
      '<div class="sb-user">' + ui.avatar(u.name) + '<div class="ut"><b>' + esc(u.name) + '</b><span>' + esc(u.role) + '</span></div></div></div>';
  }
  function renderBanner() {
    document.getElementById('demo-banner').innerHTML = '<span class="dot"></span><span><b>Demo Mode</b> — you are exploring sample data for ' + esc(LF.S.settings.company.name) + '. <span class="hide-xs">Changes are saved in this browser only and no real emails are sent.</span></span> <button data-action="reset-demo">Reset demo data</button>';
  }
  function renderTopbar() {
    const u = q.user();
    document.getElementById('topbar').innerHTML =
      '<button class="btn icon ghost mobile-only" data-action="open-mobile-nav" aria-label="Open menu">' + icon('menu') + '</button>' +
      '<button class="btn icon ghost desktop-only" data-action="toggle-sidebar" aria-label="Collapse sidebar" title="Collapse sidebar">' + icon('sidebar') + '</button>' +
      '<div class="search-wrap">' + icon('search') + '<input id="global-search" type="search" placeholder="Search leads, team, pages…" autocomplete="off" aria-label="Global search"><kbd>/</kbd><div class="search-results" id="search-results"></div></div>' +
      '<div class="grow"></div>' +
      '<div class="dd" id="dd-range"><button class="btn range-btn" data-action="dd-toggle" aria-label="Select date range">' + icon('calendar') + '<span id="range-label"></span>' + icon('chevron-down', 'sm') + '</button><div class="dd-menu">' +
      [7, 30, 90].map((d) => '<button class="dd-item" data-action="set-range" data-days="' + d + '">Last ' + d + ' days</button>').join('') + '</div></div>' +
      '<div class="dd" id="dd-notif"><button class="btn icon ghost" data-action="dd-toggle" aria-label="Notifications" style="position:relative">' + icon('bell') + '<span class="bell-dot" id="bell-dot"></span></button><div class="dd-menu wide" id="notif-menu"></div></div>' +
      '<button class="btn icon ghost help-btn" data-action="open-help" aria-label="Help">' + icon('help') + '</button>' +
      '<div class="dd" id="dd-user"><button class="btn ghost" data-action="dd-toggle" style="padding:0 6px" aria-label="User menu">' + ui.avatar(u.name, 'sm') + '<span class="hide-sm">' + esc(u.name.split(' ')[0]) + '</span>' + icon('chevron-down', 'sm') + '</button><div class="dd-menu">' +
      '<div style="padding:10px 10px 8px"><b>' + esc(u.name) + '</b><div class="muted sm">' + esc(u.email) + '</div></div><div class="dd-sep"></div>' +
      '<a class="dd-item" href="#/settings">' + icon('settings') + 'Settings</a><a class="dd-item" href="#/team">' + icon('users') + 'Team members</a><button class="dd-item" data-action="open-help">' + icon('help') + 'Help & demo guide</button><div class="dd-sep"></div>' +
      '<button class="dd-item danger" data-action="reset-demo">' + icon('refresh') + 'Reset demo data</button></div></div>';
    bindSearch();
  }
  const NOTIF_IC = { lead: 'user-plus', reminder: 'clock', alert: 'alert', win: 'check-circle' };
  function updateChrome() {
    renderSidebar();
    const rl = document.getElementById('range-label'); if (rl) rl.textContent = 'Last ' + LF.S.ui.range + ' days';
    document.querySelectorAll('#dd-range .dd-item').forEach((b) => b.classList.toggle('on', Number(b.dataset.days) === LF.S.ui.range));
    const unread = LF.S.notifications.filter((n) => !n.read).length;
    const bd = document.getElementById('bell-dot'); if (bd) { bd.textContent = unread > 9 ? '9+' : unread; bd.style.display = unread ? '' : 'none'; }
    const nm = document.getElementById('notif-menu');
    if (nm) nm.innerHTML = '<div class="dd-h"><span>Notifications</span><button class="btn sm ghost" data-action="notif-read-all" data-keep="1">Mark all read</button></div><div class="notif-list">' +
      (LF.S.notifications.length ? LF.S.notifications.slice(0, 10).map((n) => '<button class="notif ' + (n.read ? '' : 'unread') + '" data-action="notif-open" data-id="' + n.id + '"><div class="ni ' + (n.kind || '') + '">' + icon(NOTIF_IC[n.kind] || 'bell', 'sm') + '</div><div><p>' + esc(n.text) + '</p><span>' + fmt.rel(n.t) + '</span></div></button>').join('') : ui.empty('bell', 'All caught up', 'No notifications yet.')) + '</div>';
    document.getElementById('app').classList.toggle('collapsed', !!LF.S.ui.sidebarCollapsed);
  }
  App.updateChrome = updateChrome;

  /* ---------- global search ---------- */
  function bindSearch() {
    const inp = document.getElementById('global-search'), res = document.getElementById('search-results');
    let sel = -1;
    const items = () => [...res.querySelectorAll('.sr-item')];
    const run = () => {
      const v = inp.value.trim().toLowerCase();
      if (!v) { res.classList.remove('open'); res.innerHTML = ''; return; }
      const leads = LF.S.leads.filter((l) => [l.name, l.email, l.phone, l.property, l.id, l.source].join(' ').toLowerCase().includes(v)).slice(0, 5);
      const team = LF.S.team.filter((m) => (m.name + ' ' + m.role + ' ' + m.email).toLowerCase().includes(v)).slice(0, 2);
      const pages = NAV.filter((n) => n.label.toLowerCase().includes(v)).slice(0, 3);
      let h = '';
      if (leads.length) h += '<div class="sr-group">Leads</div>' + leads.map((l) => '<button class="sr-item" data-action="search-go" data-href="#/leads/' + l.id + '">' + ui.avatar(l.name, 'sm') + '<div class="t"><b>' + esc(l.name) + '</b><span>' + esc(l.property) + ' · ' + esc(l.status) + '</span></div></button>').join('');
      if (team.length) h += '<div class="sr-group">Team</div>' + team.map((m) => '<button class="sr-item" data-action="search-go" data-href="#/team">' + ui.avatar(m.name, 'sm') + '<div class="t"><b>' + esc(m.name) + '</b><span>' + esc(m.role) + '</span></div></button>').join('');
      if (pages.length) h += '<div class="sr-group">Pages</div>' + pages.map((n) => '<button class="sr-item" data-action="search-go" data-href="#/' + n.id + '">' + icon(n.icon) + '<div class="t"><b>' + n.label + '</b></div></button>').join('');
      if (leads.length) h += '<button class="sr-item" data-action="search-all" style="color:var(--brand-ink);font-weight:600">' + icon('search') + ' See all lead results for “' + esc(inp.value.trim()) + '”</button>';
      res.innerHTML = h || ui.empty('search', 'No results', 'Try a name, email, phone number or property.');
      res.classList.add('open'); sel = -1;
    };
    inp.addEventListener('input', run);
    inp.addEventListener('focus', run);
    inp.addEventListener('keydown', (e) => {
      const it = items();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!it.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + it.length) % it.length; it.forEach((x, i) => x.classList.toggle('sel', i === sel)); it[sel].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); if (sel >= 0 && it[sel]) it[sel].click(); else if (inp.value.trim()) LF.actions['search-all'](); }
      else if (e.key === 'Escape') { res.classList.remove('open'); inp.blur(); }
    });
  }
  LF.actions['search-go'] = (el) => { closeSearch(true); location.hash = el.dataset.href; };
  LF.actions['search-all'] = () => {
    const inp = document.getElementById('global-search'); LF.view = LF.view || {}; LF.view.leads = Object.assign(LF.view.leads || {}, { q: inp.value.trim(), page: 1, status: '', source: '', owner: '' });
    closeSearch(true); App.go('#/leads');
  };
  function closeSearch(clear) { const inp = document.getElementById('global-search'), res = document.getElementById('search-results'); if (res) res.classList.remove('open'); if (clear && inp) { inp.value = ''; inp.blur(); } }

  /* ---------- rendering ---------- */
  App.render = function (keepScroll) {
    const r = App.route(), page = LF.pages[r.name], view = document.getElementById('view');
    const y = window.scrollY;
    LF.charts.destroyAll();
    view.innerHTML = page.render(r);
    document.title = (page.title ? (typeof page.title === 'function' ? page.title(r) : page.title) + ' · ' : '') + 'LeadFlow';
    updateChrome();
    if (page.mount) page.mount(r);
    window.scrollTo(0, keepScroll ? y : 0);
    document.getElementById('app').classList.remove('nav-open');
  };
  App.refresh = () => App.render(true);

  /* ---------- global actions ---------- */
  const A = LF.actions;
  A['goto'] = (el) => { location.hash = el.dataset.href; };
  A['nav-click'] = () => { document.getElementById('app').classList.remove('nav-open'); };
  A['open-mobile-nav'] = () => document.getElementById('app').classList.add('nav-open');
  A['close-mobile-nav'] = () => document.getElementById('app').classList.remove('nav-open');
  A['toggle-sidebar'] = () => { LF.S.ui.sidebarCollapsed = !LF.S.ui.sidebarCollapsed; LF.save(); updateChrome(); setTimeout(() => Object.values(LF.charts.inst).forEach((c) => c.resize()), 260); };
  A['set-range'] = (el) => { LF.S.ui.range = Number(el.dataset.days); LF.save(); App.refresh(); ui.toast('Date range set to last ' + LF.S.ui.range + ' days', 'info'); };
  A['notif-read-all'] = () => { LF.S.notifications.forEach((n) => (n.read = true)); LF.save(); updateChrome(); document.getElementById('dd-notif').classList.add('open'); };
  A['notif-open'] = (el) => { const n = LF.S.notifications.find((x) => x.id === el.dataset.id); if (!n) return; n.read = true; LF.save(); if (n.leadId && q.lead(n.leadId)) location.hash = '#/leads/' + n.leadId; else updateChrome(); };
  A['reset-demo'] = () => ui.confirm({ title: 'Reset demo data?', message: 'This restores the original Horizon Realty sample data and discards every change you have made in this browser.', confirmLabel: 'Reset demo', danger: true, onConfirm: () => { LF.resetData(); location.hash = '#/dashboard'; App.render(); ui.toast('Demo data restored'); } });
  A['open-help'] = () => {
    ui.modal({
      title: 'Help & demo guide', subtitle: 'How to explore LeadFlow in two minutes', size: 'md',
      body: '<div class="stack" style="gap:14px">' + [
        ['play', 'Run the live simulation', 'On the Dashboard, click <b>Simulate New Enquiry</b> and watch a website enquiry become a lead, an email, an assignment and a follow-up in seconds.'],
        ['users', 'Work a lead', 'Open any lead to change status, reassign, add notes, schedule follow-ups or send a simulated email. Every action appears in the activity timeline.'],
        ['zap', 'Edit the automation', 'In <b>Automation Rules</b> turn rules on and off, change the workflow, then run the simulation again to see the effect.'],
        ['chart', 'Check the numbers', 'Dashboard, Team and Reports all read from the same sample data, so every change flows through.'],
      ].map((s) => '<div class="row" style="align-items:flex-start"><div class="type-ic green">' + icon(s[0]) + '</div><div><b>' + s[1] + '</b><p class="muted sm">' + s[2] + '</p></div></div>').join('') + '</div>' +
        '<div class="dd-sep" style="margin:16px 0"></div><p class="lbl" style="margin-bottom:8px">Shortcuts</p><div class="row wrap sm"><span class="badge">/</span> focus search <span class="badge">Esc</span> close dialogs and menus</div>' +
        '<p class="muted sm" style="margin-top:14px">All data is fictional and stored in your browser (localStorage). No emails, SMS or notifications are ever sent.</p>',
      footer: '<button class="btn" data-action="modal-close">Close</button><button class="btn primary" data-action="sim-open">' + icon('play', 'sm') + ' Run live demo</button>',
    });
  };

  /* ---------- event delegation ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t.closest('.dd')) ui.closeDropdowns();
    if (!t.closest('.search-wrap')) { const r = document.getElementById('search-results'); if (r) r.classList.remove('open'); }
    const el = t.closest('[data-action]'); if (!el || el.disabled) return;
    const fn = A[el.dataset.action];
    if (!fn) { console.warn('Unhandled action', el.dataset.action); return; }
    if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').startsWith('#')) { fn(el, e); ui.closeDropdowns(); return; }
    fn(el, e);
    if (el.closest('.dd-menu') && el.dataset.action !== 'dd-toggle' && !el.dataset.keep) ui.closeDropdowns();
  });
  document.addEventListener('submit', (e) => { const f = e.target.closest('form[data-submit]'); if (f) { e.preventDefault(); const fn = A[f.dataset.submit]; if (fn) fn(f, e); } });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-change]'); if (el && A[el.dataset.change]) A[el.dataset.change](el, e); });
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-input]'); if (el && A[el.dataset.input]) A[el.dataset.input](el, e); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (ui.isModalOpen()) { const m = document.querySelector('#modal-root .modal'); if (!m.querySelector('[data-no-esc]')) ui.closeModal(); } ui.closeDropdowns(); }
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && !['input', 'textarea', 'select'].includes(tag) && !ui.isModalOpen()) { e.preventDefault(); const s = document.getElementById('global-search'); if (s) s.focus(); }
  });
  window.addEventListener('hashchange', () => { ui.closeDropdowns(); if (ui.isModalOpen()) ui.closeModal(true); App.render(); });

  /* ---------- scheduled rule checks ---------- */
  App.runChecks = function (silent) {
    const out = LF.engine.checkScheduled();
    if (out.reminders || out.escalations) {
      if (!silent) ui.toast('Automation: ' + [out.reminders && out.reminders + ' reminder' + (out.reminders > 1 ? 's' : '') + ' sent', out.escalations && out.escalations + ' lead' + (out.escalations > 1 ? 's' : '') + ' escalated'].filter(Boolean).join(', '), 'info', 4200);
      if (!ui.isModalOpen()) App.refresh(); else updateChrome();
    }
    return out;
  };

  /* ---------- boot ---------- */
  function boot() {
    LF.init();
    renderBanner(); renderTopbar();
    if (!location.hash) history.replaceState(null, '', '#/dashboard');
    App.render();
    App.runChecks(true);
    setInterval(() => App.runChecks(false), 30000);
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
