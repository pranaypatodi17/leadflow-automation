/* LeadFlow – Email templates editor, live preview and email activity log */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions;
  LF.pages = LF.pages || {};
  LF.view = LF.view || {};
  LF.view.tpl = LF.view.tpl || { tab: 'templates', sel: 't1', lead: '', dirty: false, page: 1, q: '', kind: '' };
  const V = () => LF.view.tpl;
  let lastField = 'tpl-body';
  document.addEventListener('focusin', (e) => { if (e.target.id === 'tpl-subject' || e.target.id === 'tpl-body') lastField = e.target.id; });

  /* shared email mock-up used by templates, lead detail and the simulation */
  LF.emailFrame = function (o) {
    const co = LF.S.settings.company;
    const safe = (s) => esc(s).replace(/\{\{\s*(\w+)\s*\}\}/g, '<span class="unresolved">{{$1}}</span>');
    return '<div class="email-frame"><div class="email-meta"><div><label>From</label><span>' + esc(o.from || co.name + ' <' + co.email + '>') + '</span></div><div><label>To</label><span>' + esc(o.to) + '</span></div>' + (o.date ? '<div><label>Date</label><span>' + fmt.dt(o.date) + '</span></div>' : '') + '<div class="subj">' + safe(o.subject) + '</div></div>' +
      '<div class="email-body-wrap"><div class="email-paper"><div class="email-brand">' + LF.logo(24) + '<span>' + esc(co.name) + '</span></div><div class="email-text">' + safe(o.body) + '</div><div class="email-foot">' + esc(co.name) + ' · ' + esc(co.address) + '<br>You are receiving this email because you submitted an enquiry on ' + esc(co.website) + '. <u>Unsubscribe</u></div></div></div></div>';
  };

  function previewCtx() {
    const v = V(), l = v.lead && q.lead(v.lead);
    return l ? { lead: l, owner: q.owner(l) } : { lead: { name: 'Alex Morgan', property: '3-bed family home, Cedar Park', interest: 'Buying a home', email: 'alex.morgan@example.com' }, owner: q.member('u2') };
  }
  function previewHtml() {
    const s = document.getElementById('tpl-subject'), b = document.getElementById('tpl-body'), t = q.template(V().sel), ctx = previewCtx();
    const vars = LF.templateVars(ctx), subj = LF.renderString(s ? s.value : t.subject, vars), body = LF.renderString(b ? b.value : t.body, vars);
    return LF.emailFrame({ to: ctx.lead.email || 'alex.morgan@example.com', subject: subj, body });
  }
  function refreshPreview() { const el = document.getElementById('tpl-preview'); if (el) el.innerHTML = previewHtml(); }

  function emailLog() {
    const v = V(), s = v.q.trim().toLowerCase();
    let cs = LF.S.comms.filter((c) => c.channel === 'email' && c.dir === 'out' && q.lead(c.leadId)).filter((c) => (!s || (c.subject + ' ' + q.lead(c.leadId).name).toLowerCase().includes(s)) && (!v.kind || (v.kind === 'auto' ? c.automated : !c.automated))).sort((a, b) => b.t - a.t);
    const all = LF.S.comms.filter((c) => c.channel === 'email' && c.dir === 'out');
    const opened = all.filter((c) => c.status === 'Opened').length, bounced = all.filter((c) => c.status === 'Bounced').length, auto = all.filter((c) => c.automated).length;
    const size = 12, pages = Math.max(1, Math.ceil(cs.length / size)); if (v.page > pages) v.page = pages;
    const rows = cs.slice((v.page - 1) * size, v.page * size);
    const stat = (n, l) => '<div class="kpi"><div class="kl">' + l + '</div><div class="kv">' + n + '</div></div>';
    return '<div class="grid g4" style="margin-bottom:16px">' + stat(all.length, 'Emails sent') + stat(fmt.pct(all.length ? (auto / all.length) * 100 : 0, 0), 'Sent automatically') + stat(fmt.pct(all.length ? (opened / all.length) * 100 : 0, 0), 'Open rate') + stat(bounced, 'Bounced') + '</div>' +
      '<section class="card"><div class="toolbar"><div class="search">' + icon('search', 'sm') + '<input id="el-q" type="search" placeholder="Search subject or recipient" value="' + esc(v.q) + '" data-input="email-filter" aria-label="Search emails"></div><select id="el-kind" data-change="email-filter" aria-label="Type">' + ui.opts([{ v: '', l: 'All emails' }, { v: 'auto', l: 'Automated' }, { v: 'manual', l: 'Sent manually' }], v.kind) + '</select></div><div id="email-log-body">' + emailRows(rows, cs.length) + '</div></section>';
  }
  function emailRows(rows, total) {
    if (!rows.length) return ui.empty('mail', 'No emails found', 'Emails sent by automations and your team appear here.');
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Sent</th><th>Recipient</th><th>Subject</th><th class="hide-sm">Template</th><th>Sent by</th><th>Status</th></tr></thead><tbody>' +
      rows.map((c) => { const l = q.lead(c.leadId), t = c.templateId && q.template(c.templateId), by = c.by === 'system' ? null : q.member(c.by);
        return '<tr class="clickable" data-action="comm-view" data-id="' + c.id + '"><td class="nowrap">' + fmt.dt(c.t) + '</td><td><div class="cell-user">' + ui.avatar(l.name, 'sm') + '<div><b>' + esc(l.name) + '</b><span>' + esc(l.email) + '</span></div></div></td><td style="max-width:320px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.subject) + '</div></td><td class="hide-sm">' + (t ? esc(t.name) : '<span class="faint">Custom</span>') + '</td><td>' + (c.automated ? ui.badge('Automation', 'green') : esc(by ? by.name : 'Team')) + '</td><td>' + ui.badge(c.status, c.status === 'Bounced' ? 'red' : c.status === 'Opened' ? 'green' : '') + '</td></tr>'; }).join('') + '</tbody></table></div><div class="tbl-foot">' + ui.pager(total, V().page, 12, 'email-page') + '</div>';
  }

  LF.pages.templates = {
    title: 'Email Templates',
    render() {
      const v = V(), t = q.template(v.sel) || LF.S.templates[0]; v.sel = t.id;
      const emails = LF.S.comms.filter((c) => c.channel === 'email' && c.dir === 'out').length;
      const head = '<div class="page-h"><div><h1>Email Templates</h1><p>Customise the messages LeadFlow sends on your behalf. Changes apply to every automation using the template.</p></div></div>' +
        '<div class="tabs"><button class="' + (v.tab === 'templates' ? 'on' : '') + '" data-action="tpl-tab" data-tab="templates">' + icon('edit', 'sm') + ' Templates <span class="cnt">' + LF.S.templates.length + '</span></button><button class="' + (v.tab === 'log' ? 'on' : '') + '" data-action="tpl-tab" data-tab="log">' + icon('send', 'sm') + ' Email activity <span class="cnt">' + emails + '</span></button></div>';
      if (v.tab === 'log') return head + emailLog();
      const leads = LF.S.leads.slice().sort((a, b) => a.name.localeCompare(b.name));
      return head + '<div class="tpl-layout"><section class="card"><div class="card-b" style="padding:10px">' + LF.S.templates.map((x) => '<button class="tpl-item ' + (x.id === t.id ? 'on' : '') + '" data-action="tpl-select" data-id="' + x.id + '"><span class="type-ic ' + (x.id === t.id ? 'green' : 'gray') + '">' + icon(x.icon || 'mail', 'sm') + '</span><div><b>' + esc(x.name) + (x.edited ? ' <span class="badge violet" style="margin-left:4px">Edited</span>' : '') + '</b><span>' + esc(x.desc) + '</span></div></button>').join('') + '</div></section>' +
        '<section class="card"><header class="card-h"><div><h3>' + esc(t.name) + '</h3><p class="muted sm" id="tpl-state">' + (t.updatedAt ? 'Last edited ' + fmt.dt(t.updatedAt) : 'Default template') + '</p></div></header><div class="card-b"><form id="tpl-form" data-submit="tpl-save" novalidate>' +
        '<div class="field"><label for="tpl-subject">Subject line</label><input id="tpl-subject" type="text" value="' + esc(t.subject) + '" data-input="tpl-change"></div>' +
        '<div class="field"><label for="tpl-body">Email body</label><textarea id="tpl-body" rows="13" data-input="tpl-change">' + esc(t.body) + '</textarea></div>' +
        '<div class="field"><label>Insert dynamic variable</label><div class="var-chips">' + LF.VARIABLES.map((x) => '<button type="button" class="var-chip" data-action="tpl-var" data-k="' + x.k + '" title="' + esc(x.d) + '">{{' + x.k + '}}</button>').join('') + '</div><span class="hint">Click a variable to insert it where your cursor is. Variables are replaced with real lead details when the email is sent.</span></div>' +
        '<div class="row between wrap" style="margin-top:6px"><button type="button" class="btn danger-ghost" data-action="tpl-reset" data-id="' + t.id + '">' + icon('refresh', 'sm') + ' Reset to default</button><button type="submit" class="btn primary" id="tpl-save-btn" ' + (v.dirty ? '' : 'disabled') + '>' + icon('save', 'sm') + ' Save changes</button></div></form></div></section>' +
        '<section class="card tpl-preview"><header class="card-h"><div><h3>Email preview</h3><p class="muted sm">Exactly what the recipient sees</p></div></header><div class="card-b"><div class="field"><label for="tpl-lead">Preview with lead</label><select id="tpl-lead" data-change="tpl-lead"><option value="">Sample lead — Alex Morgan</option>' + ui.opts(leads.map((l) => ({ v: l.id, l: l.name })), v.lead) + '</select></div><div id="tpl-preview">' + '</div></div></section></div>';
    },
    mount() { if (V().tab === 'templates') refreshPreview(); },
  };

  const withGuard = (fn) => (el, ev) => {
    if (V().dirty) ui.confirm({ title: 'Discard unsaved changes?', message: 'You have unsaved edits to this template.', confirmLabel: 'Discard', danger: true, onConfirm: () => { V().dirty = false; fn(el, ev); } });
    else fn(el, ev);
  };
  A['tpl-tab'] = withGuard((el) => { V().tab = el.dataset.tab; V().page = 1; LF.app.refresh(); });
  A['tpl-select'] = withGuard((el) => { V().sel = el.dataset.id; LF.app.refresh(); });
  A['tpl-change'] = function () { V().dirty = true; const b = document.getElementById('tpl-save-btn'); if (b) b.disabled = false; const s = document.getElementById('tpl-state'); if (s) s.textContent = 'Unsaved changes'; refreshPreview(); };
  A['tpl-lead'] = function (el) { V().lead = el.value; refreshPreview(); };
  A['tpl-var'] = function (el) {
    const f = document.getElementById(lastField) || document.getElementById('tpl-body'), tok = '{{' + el.dataset.k + '}}', s = f.selectionStart == null ? f.value.length : f.selectionStart, e = f.selectionEnd == null ? s : f.selectionEnd;
    f.value = f.value.slice(0, s) + tok + f.value.slice(e); f.focus(); f.setSelectionRange(s + tok.length, s + tok.length); A['tpl-change']();
  };
  A['tpl-save'] = function () {
    const t = q.template(V().sel), subj = document.getElementById('tpl-subject').value.trim(), body = document.getElementById('tpl-body').value.trim();
    if (!subj || !body) { ui.toast('Subject and body cannot be empty', 'error'); return; }
    const def = LF.DEFAULT_TEMPLATES.find((x) => x.id === t.id);
    t.subject = subj; t.body = body; t.updatedAt = Date.now(); t.edited = !def || def.subject !== subj || def.body !== body; V().dirty = false; LF.save(); LF.app.refresh(); ui.toast('Template saved');
  };
  A['tpl-reset'] = function (el) {
    const t = q.template(el.dataset.id), def = LF.DEFAULT_TEMPLATES.find((x) => x.id === t.id);
    ui.confirm({ title: 'Reset to default?', message: 'Restore the original wording of <b>' + esc(t.name) + '</b>? Your edits will be lost.', confirmLabel: 'Reset template', danger: true, onConfirm: () => { t.subject = def.subject; t.body = def.body; t.edited = false; t.updatedAt = null; V().dirty = false; LF.save(); LF.app.refresh(); ui.toast('Template reset to default'); } });
  };
  A['email-filter'] = function () { const v = V(); v.q = document.getElementById('el-q').value; v.kind = document.getElementById('el-kind').value; v.page = 1; const keep = document.activeElement && document.activeElement.id; const main = document.getElementById('view'); LF.app.refresh(); if (keep) { const e = document.getElementById(keep); if (e) { e.focus(); if (e.setSelectionRange && e.type !== 'search') { /* noop */ } else if (e.value != null && e.type === 'search') e.setSelectionRange(e.value.length, e.value.length); } } };
  A['email-page'] = (el) => { V().page = Number(el.dataset.page); LF.app.refresh(); };
})();
