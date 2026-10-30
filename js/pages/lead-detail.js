/* LeadFlow – Lead detail view and lead actions */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions, E = LF.engine, { DAY, HOUR, MIN } = LF.T;
  const D = (LF.leadDetail = {});
  LF.view = LF.view || {}; LF.view.leadTab = LF.view.leadTab || 'timeline';

  const TL = {
    created: ['user-plus', ''], email: ['mail', 'green'], assigned: ['users', 'violet'], task: ['calendar', 'amber'], status: ['refresh', 'gray'], note: ['note', 'gray'], call: ['phone', ''],
    meeting: ['calendar', ''], chat: ['chat', 'green'], reminder: ['bell', 'amber'], escalation: ['alert', 'red'], converted: ['check-circle', 'green'], lost: ['x-circle', 'gray'],
    notify: ['bell', 'violet'], alert: ['alert', 'red'], edit: ['edit', 'gray'], automation: ['zap', 'green'],
  };
  const CH = { email: ['mail', 'blue'], call: ['phone', 'green'], whatsapp: ['chat', 'green'], meeting: ['calendar', 'amber'] };

  LF.runsToast = function (runs) {
    if (!runs || !runs.length) return;
    const r = runs[0], rule = q.rule(r.ruleId);
    ui.toast('Automation “' + (rule ? rule.name : 'Rule') + '” ran · ' + r.steps.length + ' action' + (r.steps.length > 1 ? 's' : ''), 'info', 4200);
  };

  function timelineHtml(l) {
    const items = l.timeline.slice().sort((a, b) => b.t - a.t);
    let day = '', h = '';
    items.forEach((e) => {
      const d = fmt.dayLabel(e.t);
      if (d !== day) { day = d; h += '<div class="tl-day">' + d + '</div>'; }
      const ic = TL[e.type] || ['zap', 'gray'], auto = e.by === 'LeadFlow Automation';
      h += '<div class="tl-item"><div class="type-ic ' + ic[1] + '">' + icon(ic[0], 'sm') + '</div><div class="tl-b"><p>' + esc(e.text) + (auto ? '<span class="auto-tag">Automated</span>' : '') + '</p><span>' + fmt.time(e.t) + ' · ' + (auto ? 'LeadFlow' : esc(e.by)) + '</span></div></div>';
    });
    return '<div class="timeline">' + h + '</div>';
  }
  function commsHtml(l) {
    const cs = q.leadComms(l.id);
    if (!cs.length) return ui.empty('mail', 'No communication yet', 'Send an email or log a call to start the conversation history.');
    return cs.map((c) => {
      const ic = CH[c.channel] || ['mail', 'blue'], by = c.dir === 'in' ? l.name : c.by === 'system' ? 'LeadFlow (automated)' : (q.member(c.by) || { name: 'Team' }).name;
      return '<div class="comm"><div class="type-ic ' + (ic[1] === 'blue' ? '' : ic[1]) + '">' + icon(ic[0], 'sm') + '</div><div class="cb"><div class="ch"><b>' + esc(c.subject) + '</b>' + (c.dir === 'in' ? ui.badge('Reply', 'violet') : '') + (c.channel === 'email' && c.dir === 'out' ? ui.badge(c.status, c.status === 'Bounced' ? 'red' : c.status === 'Opened' ? 'green' : '') : '') + '</div>' +
        '<div class="muted sm">' + (c.dir === 'in' ? 'From ' : 'By ') + esc(by) + ' · ' + fmt.dt(c.t) + '</div>' + (c.body ? '<div class="cx">' + esc(c.body) + '</div>' : '') +
        (c.channel === 'email' ? '<button class="btn sm ghost" style="margin-top:6px;padding-left:0" data-action="comm-view" data-id="' + c.id + '">' + icon('eye', 'xs') + ' View email</button>' : '') + '</div></div>';
    }).join('');
  }
  function tasksHtml(l) {
    const ts = q.leadTasks(l.id), pend = ts.filter((t) => t.status === 'Pending'), done = ts.filter((t) => t.status === 'Completed').length;
    let h = pend.length ? pend.map((t) => {
      const st = q.taskState(t), o = q.member(t.ownerId);
      return '<div class="list-item" style="padding-inline:0"><div class="type-ic ' + (st === 'Overdue' ? 'red' : '') + '">' + icon(LF.C.TASK_ICON[t.type], 'sm') + '</div><div class="li-t"><b>' + esc(t.type) + '</b><span>' + fmt.dayTime(t.due) + ' · ' + esc(o ? o.name.split(' ')[0] : '') + '</span></div>' +
        (st === 'Overdue' ? ui.badge('Overdue', 'overdue') : '') + '<button class="btn sm icon ghost" title="Mark complete" data-action="task-complete" data-id="' + t.id + '">' + icon('check', 'sm') + '</button><button class="btn sm icon ghost" title="Reschedule" data-action="task-reschedule" data-id="' + t.id + '">' + icon('calendar', 'sm') + '</button></div>';
    }).join('') : '<p class="muted sm" style="padding:6px 0">No pending follow-ups.</p>';
    return h + (done ? '<p class="muted xs" style="margin-top:6px">' + done + ' completed follow-up' + (done > 1 ? 's' : '') + '</p>' : '');
  }

  D.render = function (id) {
    const l = q.lead(id);
    if (!l) return '<div class="card"><div class="card-b">' + ui.empty('search', 'Lead not found', 'This lead may have been deleted.', '<a class="btn primary" href="#/leads">Back to leads</a>') + '</div></div>';
    const o = q.owner(l), open = q.isOpen(l), tab = LF.view.leadTab;
    const rank = LF.C.RANK[l.status], lostCls = l.status === 'Lost';
    const pipe = '<div class="pipeline ' + (lostCls ? 'lost' : '') + '">' + ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Converted'].map((s, i) => '<i class="' + (lostCls ? (i <= l.reached ? 'on' : '') : (i <= rank ? 'on' : '')) + '" title="' + s + '"></i>').join('') + '</div>';
    const notes = l.notes.slice().sort((a, b) => b.t - a.t).map((n) => '<div class="note">' + esc(n.text) + '<span>' + esc((q.member(n.by) || { name: 'Team' }).name) + ' · ' + fmt.dt(n.t) + '</span></div>').join('') || '<p class="muted sm">No notes yet.</p>';
    return '<button class="crumb" data-action="goto" data-href="#/leads">' + icon('arrow-left', 'sm') + ' Leads</button>' +
      '<div class="detail-h"><div class="row" style="gap:14px">' + ui.avatar(l.name, 'xl') + '<div><div class="row wrap" style="gap:10px"><h1>' + esc(l.name) + '</h1>' + ui.statusPill(l.status) + (l.flagged ? ui.badge('Overdue · escalated', 'red') : '') + '</div>' +
      '<p class="muted">' + esc(l.id) + ' · ' + ui.sourceDot(l.source) + ' · Received ' + fmt.dt(l.createdAt) + '</p></div></div>' +
      '<div class="row"><button class="btn" data-action="lead-edit" data-id="' + l.id + '">' + icon('edit', 'sm') + ' Edit</button><button class="btn danger-ghost" data-action="lead-delete" data-id="' + l.id + '">' + icon('trash', 'sm') + ' Delete</button></div></div>' +
      (l.flagged ? '<div class="flag-banner">' + icon('alert') + '<div><b>Uncontacted for 24+ hours.</b> The escalation rule flagged this lead and notified the sales manager. Contact the lead or complete the escalation task to clear this flag.</div></div>' : '') +
      '<section class="card" style="margin-bottom:16px"><div class="card-b" style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">' +
      '<div class="field" style="margin:0;min-width:170px"><label for="ld-status">Status</label><select id="ld-status" data-change="lead-status" data-id="' + l.id + '">' + ui.opts(LF.C.STATUSES, l.status) + '</select></div>' +
      '<div class="field" style="margin:0;min-width:200px"><label for="ld-owner">Assigned to</label><select id="ld-owner" data-change="lead-reassign" data-id="' + l.id + '">' + ui.opts([{ v: '', l: 'Unassigned' }].concat(LF.S.team.filter((m) => m.active || m.id === l.ownerId).map((m) => ({ v: m.id, l: m.name + (m.active ? '' : ' (inactive)') }))), l.ownerId || '') + '</select></div>' +
      '<div class="action-bar" style="flex:1;justify-content:flex-end"><button class="btn" data-action="lead-email" data-id="' + l.id + '">' + icon('mail', 'sm') + ' Send email</button><button class="btn" data-action="task-new" data-lead="' + l.id + '">' + icon('calendar', 'sm') + ' Schedule follow-up</button><button class="btn" data-action="lead-note-focus">' + icon('note', 'sm') + ' Add note</button>' +
      (open ? '<button class="btn primary" data-action="lead-convert" data-id="' + l.id + '">' + icon('check-circle', 'sm') + ' Mark converted</button><button class="btn danger-ghost" data-action="lead-lost" data-id="' + l.id + '">' + icon('x-circle', 'sm') + ' Mark lost</button>' : '<button class="btn" data-action="lead-reopen" data-id="' + l.id + '">' + icon('refresh', 'sm') + ' Reopen lead</button>') + '</div></div></section>' +
      '<div class="detail-grid"><div class="stack" style="gap:16px">' +
      ui.card('Contact & details', '<dl class="kv-list"><div><dt>Email</dt><dd>' + esc(l.email) + '</dd></div><div><dt>Phone</dt><dd>' + esc(l.phone || '—') + '</dd></div><div><dt>Source</dt><dd>' + ui.sourceDot(l.source) + '</dd></div><div><dt>Interested in</dt><dd>' + esc(l.interest) + '</dd></div><div><dt>Property</dt><dd>' + esc(l.property) + '</dd></div>' +
        '<div><dt>Expected deal value</dt><dd>' + fmt.money(l.value) + '</dd></div><div><dt>Salesperson</dt><dd>' + (o ? '<span class="row" style="justify-content:flex-end">' + ui.avatar(o.name, 'sm') + esc(o.name) + '</span>' : 'Unassigned') + '</dd></div>' +
        '<div><dt>First response</dt><dd>' + (l.responseMins != null ? fmt.dur(l.responseMins) : '<span class="badge amber">Awaiting contact</span>') + '</dd></div>' + (l.lostReason ? '<div><dt>Lost reason</dt><dd>' + esc(l.lostReason) + '</dd></div>' : '') + '</dl>' +
        (l.message ? '<div class="note" style="margin:12px 0 0"><b style="font-weight:600">Enquiry message</b><br>' + esc(l.message) + '</div>' : '') + pipe) +
      ui.card('Follow-up schedule', tasksHtml(l), { actions: '<button class="btn sm" data-action="task-new" data-lead="' + l.id + '">' + icon('plus', 'xs') + ' New</button>' }) +
      ui.card('Notes', '<div class="field" style="margin-bottom:10px"><textarea id="note-text" rows="2" placeholder="Add a note about this lead…" aria-label="Add a note"></textarea></div><button class="btn sm primary" data-action="lead-note-add" data-id="' + l.id + '" style="margin-bottom:14px">Add note</button>' + notes) +
      '</div><section class="card"><div class="card-b"><div class="tabs"><button class="' + (tab === 'timeline' ? 'on' : '') + '" data-action="lead-tab" data-tab="timeline">' + icon('list', 'sm') + ' Activity timeline <span class="cnt">' + l.timeline.length + '</span></button><button class="' + (tab === 'comms' ? 'on' : '') + '" data-action="lead-tab" data-tab="comms">' + icon('mail', 'sm') + ' Communication history <span class="cnt">' + q.leadComms(l.id).length + '</span></button></div>' +
      (tab === 'timeline' ? timelineHtml(l) : commsHtml(l)) + '</div></section></div>';
  };
  D.mount = function () {};

  /* ---------- actions ---------- */
  A['lead-tab'] = (el) => { LF.view.leadTab = el.dataset.tab; LF.app.refresh(); };
  A['lead-status'] = function (el) {
    const l = q.lead(el.dataset.id), s = el.value;
    if (s === 'Converted') { el.value = l.status; A['lead-convert']({ dataset: { id: l.id } }); return; }
    if (s === 'Lost') { el.value = l.status; A['lead-lost']({ dataset: { id: l.id } }); return; }
    const runs = E.setStatus(l, s); LF.app.refresh(); ui.toast('Status changed to ' + s); LF.runsToast(runs);
  };
  A['lead-reassign'] = function (el) {
    const l = q.lead(el.dataset.id), m = el.value ? q.member(el.value) : null, prev = q.owner(l);
    if ((prev && prev.id) === (m && m.id)) return;
    E.assign(l, m); E.timeline(l, 'assigned', m ? 'Reassigned from ' + (prev ? prev.name : 'Unassigned') + ' to ' + m.name : 'Unassigned (was ' + (prev ? prev.name : 'nobody') + ')', q.user().name);
    LF.S.tasks.filter((t) => t.leadId === l.id && t.status === 'Pending' && !t.escalation).forEach((t) => { t.ownerId = m ? m.id : t.ownerId; });
    if (m) E.notify('Lead reassigned to ' + m.name + ': ' + l.name, l.id, 'lead');
    LF.save(); LF.app.refresh(); ui.toast(m ? 'Lead reassigned to ' + m.name : 'Lead unassigned');
  };
  A['lead-note-focus'] = () => { const t = document.getElementById('note-text'); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.focus(); } };
  A['lead-note-add'] = function (el) {
    const t = document.getElementById('note-text'), text = t.value.trim();
    if (!text) { ui.toast('Write a note first', 'error'); t.focus(); return; }
    const l = q.lead(el.dataset.id); l.notes.push({ id: LF.uid('n'), t: Date.now(), by: q.user().id, text });
    E.timeline(l, 'note', 'Note added: ' + text, q.user().name); LF.save(); LF.app.refresh(); ui.toast('Note added');
  };
  A['lead-convert'] = function (el) {
    const l = q.lead(el.dataset.id);
    ui.modal({ title: 'Mark as converted', subtitle: l.name, size: 'sm', body: '<form id="conv-form" data-submit="lead-convert-submit" data-id="' + l.id + '"><p class="muted" style="margin-bottom:12px">Congratulations! Confirm the final deal value. The <b>Lead Conversion</b> automation will stop pending reminders and record the win.</p><div class="field"><label for="c-val">Final deal value ($)</label><input id="c-val" name="value" type="number" min="0" step="1000" value="' + l.value + '" required></div></form>',
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="conv-form">' + icon('check-circle', 'sm') + ' Mark converted</button>' });
  };
  A['lead-convert-submit'] = function (form) {
    const l = q.lead(form.dataset.id), v = Number(form.value.value);
    if (!(v >= 0)) return;
    ui.closeModal(true); const runs = E.setStatus(l, 'Converted', { value: v }); LF.app.refresh(); ui.toast(l.name + ' converted — ' + fmt.money(v)); LF.runsToast(runs);
  };
  A['lead-lost'] = function (el) {
    const l = q.lead(el.dataset.id);
    ui.modal({ title: 'Mark as lost', subtitle: l.name, size: 'sm', body: '<form id="lost-form" data-submit="lead-lost-submit" data-id="' + l.id + '"><div class="field"><label for="l-reason">Reason</label><select id="l-reason" name="reason">' + ui.opts(LF.C.LOST_REASONS) + '</select></div><div class="field"><label for="l-note">Note (optional)</label><textarea id="l-note" name="note" rows="2" placeholder="Anything worth remembering?"></textarea></div><p class="muted sm">Pending follow-ups for this lead will be cancelled.</p></form>',
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn danger" type="submit" form="lost-form">Mark as lost</button>' });
  };
  A['lead-lost-submit'] = function (form) {
    const l = q.lead(form.dataset.id), note = form.note.value.trim();
    ui.closeModal(true); if (note) { l.notes.push({ id: LF.uid('n'), t: Date.now(), by: q.user().id, text: note }); E.timeline(l, 'note', 'Note added: ' + note, q.user().name); }
    const runs = E.setStatus(l, 'Lost', { reason: form.reason.value }); LF.app.refresh(); ui.toast(l.name + ' marked as lost', 'info'); LF.runsToast(runs);
  };
  A['lead-reopen'] = function (el) { const l = q.lead(el.dataset.id); E.setStatus(l, 'Contacted'); LF.app.refresh(); ui.toast('Lead reopened as Contacted'); };
  A['lead-delete'] = function (el) {
    const l = q.lead(el.dataset.id);
    ui.confirm({ title: 'Delete this lead?', message: 'This permanently removes <b>' + esc(l.name) + '</b> together with their follow-ups, notes and email history from the demo data.', confirmLabel: 'Delete lead', danger: true, onConfirm: () => { E.deleteLead(l); location.hash = '#/leads'; ui.toast('Lead deleted', 'info'); } });
  };

  /* ---------- send email ---------- */
  A['lead-email'] = function (el) {
    const l = q.lead(el.dataset.id), first = LF.S.templates[1];
    ui.modal({ title: 'Send email', subtitle: 'To ' + esc(l.name) + ' &lt;' + esc(l.email) + '&gt;', size: 'md',
      body: '<div class="flag-banner" style="background:var(--blue-soft);border-color:#c9d9f6;color:#223e86">' + icon('info') + '<div>Demo mode: this email is simulated and will be logged on the lead, but nothing is actually sent.</div></div>' +
        '<form id="email-form" data-submit="lead-email-submit" data-id="' + l.id + '"><div class="field"><label for="e-tpl">Template</label><select id="e-tpl" data-change="lead-email-tpl" data-id="' + l.id + '">' + ui.opts([{ v: '', l: 'Blank email' }].concat(LF.S.templates.map((t) => ({ v: t.id, l: t.name }))), first.id) + '</select></div>' +
        '<div class="field"><label for="e-subj">Subject</label><input id="e-subj" name="subject" type="text" required></div><div class="field"><label for="e-body">Message</label><textarea id="e-body" name="body" rows="9" required></textarea></div></form>',
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="email-form">' + icon('send', 'sm') + ' Send email</button>' });
    A['lead-email-tpl']({ value: first.id, dataset: { id: l.id } });
  };
  A['lead-email-tpl'] = function (el) {
    const l = q.lead(el.dataset.id), t = q.template(el.value), s = document.getElementById('e-subj'), b = document.getElementById('e-body');
    if (!t) { s.value = ''; b.value = ''; return; }
    const r = LF.renderTemplateRaw(t, { lead: l, owner: q.owner(l) }); s.value = r.subject; b.value = r.body;
  };
  A['lead-email-submit'] = function (form) {
    const l = q.lead(form.dataset.id), subj = form.subject.value.trim(), body = form.body.value.trim();
    if (!subj || !body) { ui.toast('Add a subject and message', 'error'); return; }
    const tid = document.getElementById('e-tpl').value;
    E.addComm({ leadId: l.id, channel: 'email', subject: subj, body, templateId: tid || null, by: q.user().id, status: 'Delivered' });
    E.timeline(l, 'email', 'Email sent: "' + subj + '"', q.user().name); E.activity('email_sent', 'Email sent to ' + l.name + ': ' + subj, l.id);
    ui.closeModal(true); LF.view.leadTab = 'comms'; LF.save(); LF.app.refresh(); ui.toast('Email sent to ' + l.email + ' (simulated)');
  };
  A['comm-view'] = function (el) {
    const c = LF.S.comms.find((x) => x.id === el.dataset.id), l = q.lead(c.leadId); if (!c) return;
    const from = c.dir === 'in' ? l.name + ' <' + l.email + '>' : (c.by !== 'system' && q.member(c.by) ? q.member(c.by).name : LF.S.settings.company.name) + ' <' + LF.S.settings.company.email + '>';
    ui.modal({ title: 'Email', subtitle: fmt.dt(c.t) + (c.automated ? ' · sent automatically' : ''), size: 'md', body: LF.emailFrame({ from, to: c.dir === 'in' ? LF.S.settings.company.email : l.email, subject: c.subject, body: c.body, date: c.t }), footer: '<button class="btn" data-action="modal-close">Close</button><a class="btn primary" href="#/leads/' + l.id + '" data-action="modal-close">Open lead</a>' });
  };
})();
