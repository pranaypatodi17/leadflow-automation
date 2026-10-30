/* LeadFlow – shared UI helpers: formatting, avatars, pills, modal, toast, dropdowns, charts */
(function () {
  const LF = (window.LF = window.LF || {});
  const ui = (LF.ui = {});
  const DAY = 864e5, HOUR = 36e5, MIN = 6e4;
  LF.T = { DAY, HOUR, MIN };

  LF.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  const esc = LF.esc;

  /* ---------- date / number formatting ---------- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  LF.sod = sod;
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (LF.fmt = {
    date(t) {
      const d = new Date(t), y = new Date().getFullYear();
      return MONTHS[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== y ? ', ' + d.getFullYear() : '');
    },
    time(t) {
      const d = new Date(t); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
      return h + ':' + pad(d.getMinutes()) + ' ' + ap;
    },
    dt(t) { return fmt.date(t) + ', ' + fmt.time(t); },
    dayLabel(t) {
      const diff = Math.round((sod(t) - sod(Date.now())) / DAY);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff === -1) return 'Yesterday';
      return fmt.date(t);
    },
    dayTime(t) { return fmt.dayLabel(t) + ', ' + fmt.time(t); },
    rel(t) {
      const diff = t - Date.now(), a = Math.abs(diff);
      let s;
      if (a < MIN) s = 'moments';
      else if (a < HOUR) s = Math.round(a / MIN) + ' min';
      else if (a < DAY) s = Math.round(a / HOUR) + ' hr';
      else if (a < 14 * DAY) s = Math.round(a / DAY) + ' day' + (Math.round(a / DAY) > 1 ? 's' : '');
      else return fmt.date(t);
      if (s === 'moments') return diff >= 0 ? 'in a moment' : 'just now';
      return diff >= 0 ? 'in ' + s : s + ' ago';
    },
    money(v) { return '$' + Math.round(v || 0).toLocaleString('en-US'); },
    moneyK(v) {
      v = v || 0;
      if (v >= 1e6) return '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 2).replace(/\.?0+$/, '') + 'M';
      if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
      return '$' + Math.round(v);
    },
    dur(mins) {
      if (mins == null || isNaN(mins)) return '—';
      mins = Math.round(mins);
      if (mins < 60) return mins + ' min';
      const h = Math.floor(mins / 60), m = mins % 60;
      if (h < 24) return h + 'h' + (m ? ' ' + m + 'm' : '');
      const d = Math.floor(h / 24);
      return d + 'd ' + (h % 24) + 'h';
    },
    pct(v, d) { return (isFinite(v) ? v : 0).toFixed(d == null ? 1 : d).replace(/\.0$/, '') + '%'; },
    inputDate(t) { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    inputTime(t) { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    parseInput(date, time) {
      const [y, m, d] = date.split('-').map(Number); const [hh, mm] = (time || '09:00').split(':').map(Number);
      return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
    },
    initials(name) { return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join(''); },
    clock(t) { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); },
  });

  /* ---------- colours ---------- */
  LF.colors = {
    brand: '#0f9f77', brandSoft: '#d9f3ea', blue: '#3b6fe0', blueSoft: '#dbe6fb', navy: '#0f1b33', slate: '#64748b', line: '#e6eaf0',
    amber: '#e0a21a', red: '#d6483f', violet: '#7a62d6', sky: '#2fa3d6', gray: '#94a3b8',
  };
  LF.statusColor = { New: '#3b6fe0', Contacted: '#2fa3d6', Qualified: '#7a62d6', 'Proposal Sent': '#e0a21a', Negotiation: '#e07a2e', Converted: '#0f9f77', Lost: '#94a3b8' };
  LF.sourceColor = { 'Website enquiry': '#0f9f77', 'Facebook Ads': '#3b6fe0', 'Google Ads': '#e0a21a', Instagram: '#c2589a', Referral: '#7a62d6' };

  /* ---------- avatar / pills ---------- */
  const AV = [['#e3f4ee', '#0b7a5b'], ['#e4ecfb', '#2f58b8'], ['#f1e8fa', '#6a47b5'], ['#fdf0dc', '#a56b0a'], ['#fbe7ea', '#b23a4a'], ['#e2f3f8', '#1f7894']];
  ui.avatar = function (name, size, cls) {
    let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const [bg, fg] = AV[h % AV.length];
    return '<span class="avatar ' + (size || '') + ' ' + (cls || '') + '" style="background:' + bg + ';color:' + fg + '">' + esc(fmt.initials(name)) + '</span>';
  };
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z]+/g, '-');
  ui.statusPill = (s) => '<span class="pill st-' + slug(s) + '"><i></i>' + esc(s) + '</span>';
  ui.priorityPill = (p) => '<span class="pill pr-' + slug(p) + '">' + esc(p) + '</span>';
  ui.sourceDot = (s) => '<span class="src"><i style="background:' + (LF.sourceColor[s] || '#94a3b8') + '"></i>' + esc(s) + '</span>';
  ui.badge = (text, kind) => '<span class="badge ' + (kind || '') + '">' + esc(text) + '</span>';
  ui.empty = function (icon, title, text, actionHtml) {
    return '<div class="empty">' + '<div class="empty-ic">' + LF.icon(icon, 'lg') + '</div><h4>' + esc(title) + '</h4><p>' + esc(text || '') + '</p>' + (actionHtml || '') + '</div>';
  };
  ui.opts = function (list, selected) {
    return list.map((o) => {
      const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  };
  ui.card = function (title, body, opts) {
    opts = opts || {};
    return '<section class="card ' + (opts.cls || '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
      (title ? '<header class="card-h"><div><h3>' + title + '</h3>' + (opts.sub ? '<p class="muted sm">' + opts.sub + '</p>' : '') + '</div>' + (opts.actions ? '<div class="card-actions">' + opts.actions + '</div>' : '') + '</header>' : '') +
      '<div class="card-b ' + (opts.bodyCls || '') + '">' + body + '</div></section>';
  };

  ui.pager = function (total, page, size, action) {
    const pages = Math.max(1, Math.ceil(total / size));
    if (pages <= 1) return total ? '<div class="pager"><span class="muted sm">Showing ' + total + ' of ' + total + '</span></div>' : '';
    const from = (page - 1) * size + 1, to = Math.min(total, page * size);
    const nums = [];
    for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
    return '<div class="pager"><span class="muted sm">Showing ' + from + '–' + to + ' of ' + total + '</span><div class="pager-btns">' +
      '<button class="btn icon sm" data-action="' + action + '" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' + LF.icon('chevron-left') + '</button>' +
      nums.map((n) => n === '…' ? '<span class="muted">…</span>' : '<button class="btn sm ' + (n === page ? 'primary-soft' : 'ghost') + '" data-action="' + action + '" data-page="' + n + '">' + n + '</button>').join('') +
      '<button class="btn icon sm" data-action="' + action + '" data-page="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + ' aria-label="Next page">' + LF.icon('chevron-right') + '</button></div></div>';
  };

  /* ---------- CSV ---------- */
  ui.downloadCSV = function (filename, rows) {
    const q = (v) => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const csv = rows.map((r) => r.map(q).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  };

  /* ---------- toast ---------- */
  ui.toast = function (msg, kind, ms) {
    const root = document.getElementById('toasts'); if (!root) return;
    const el = document.createElement('div'); el.className = 'toast ' + (kind || 'success');
    el.innerHTML = LF.icon(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check-circle') + '<span>' + esc(msg) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); }, ms || 3200);
  };

  /* ---------- modal ---------- */
  let modalOnClose = null;
  ui.modal = function (o) {
    const root = document.getElementById('modal-root');
    modalOnClose = o.onClose || null;
    root.innerHTML = '<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal ' + (o.size || 'md') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title || 'Dialog') + '">' +
      '<header class="modal-h"><div><h3>' + (o.title || '') + '</h3>' + (o.subtitle ? '<p class="muted sm">' + o.subtitle + '</p>' : '') + '</div>' +
      (o.noClose ? '' : '<button class="btn icon ghost" data-action="modal-close" aria-label="Close">' + LF.icon('x') + '</button>') + '</header>' +
      '<div class="modal-b">' + o.body + '</div>' + (o.footer ? '<footer class="modal-f">' + o.footer + '</footer>' : '') + '</div></div>';
    document.body.classList.add('modal-open');
    const first = root.querySelector('[autofocus],input:not([type=hidden]):not([type=checkbox]),select,textarea');
    if (first && !o.noFocus) setTimeout(() => first.focus(), 30);
    if (o.onMount) o.onMount(root.querySelector('.modal'));
    return root.querySelector('.modal');
  };
  ui.closeModal = function (silent) {
    const root = document.getElementById('modal-root'); if (!root || !root.firstChild) return;
    root.innerHTML = ''; document.body.classList.remove('modal-open');
    const cb = modalOnClose; modalOnClose = null;
    if (cb && !silent) cb();
  };
  ui.isModalOpen = () => !!document.querySelector('#modal-root .modal');
  let confirmCb = null;
  ui.confirm = function (o) {
    confirmCb = o.onConfirm;
    ui.modal({
      title: o.title, size: 'sm',
      body: '<p class="confirm-text">' + o.message + '</p>' + (o.extra || ''),
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-action="confirm-yes">' + esc(o.confirmLabel || 'Confirm') + '</button>',
    });
  };
  LF.actions = LF.actions || {};
  LF.actions['confirm-yes'] = function () {
    const cb = confirmCb; const m = document.querySelector('#modal-root .modal'); confirmCb = null;
    const extra = {}; if (m) m.querySelectorAll('[name]').forEach((el) => (extra[el.name] = el.value));
    ui.closeModal(true); if (cb) cb(extra);
  };
  LF.actions['modal-close'] = () => ui.closeModal();
  LF.actions['modal-backdrop'] = (el, ev) => { if (ev.target === el && !el.querySelector('[data-no-esc]')) ui.closeModal(); };

  /* ---------- dropdown menus ---------- */
  ui.closeDropdowns = function (except) {
    document.querySelectorAll('.dd.open').forEach((d) => { if (d !== except) d.classList.remove('open'); });
  };
  LF.actions['dd-toggle'] = function (el) {
    const dd = el.closest('.dd'); const was = dd.classList.contains('open');
    ui.closeDropdowns(); if (!was) dd.classList.add('open');
  };

  /* ---------- charts ---------- */
  const charts = (LF.charts = { inst: {} });
  charts.destroyAll = function () { Object.values(charts.inst).forEach((c) => { try { c.destroy(); } catch (e) { /* ignore */ } }); charts.inst = {}; };
  charts.mount = function (id, config) {
    const cv = document.getElementById(id); if (!cv) return null;
    if (!window.Chart) { cv.parentNode.innerHTML = '<div class="empty small">Chart library unavailable</div>'; return null; }
    if (charts.inst[id]) charts.inst[id].destroy();
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748b';
    config.options = Object.assign({ responsive: true, maintainAspectRatio: false }, config.options || {});
    charts.inst[id] = new Chart(cv, config);
    return charts.inst[id];
  };
  charts.gridOpts = function (extra) {
    return Object.assign({
      x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 14 } },
      y: { beginAtZero: true, grid: { color: '#eef1f5' }, border: { display: false }, ticks: { precision: 0, padding: 6 } },
    }, extra || {});
  };
  charts.tooltip = { backgroundColor: '#0f1b33', padding: 10, cornerRadius: 8, titleFont: { weight: '600' }, boxPadding: 4 };
})();
