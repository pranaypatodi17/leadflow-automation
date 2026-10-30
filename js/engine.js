/* LeadFlow – simulated automation engine: triggers, action catalog, rule execution */
(function () {
  const LF = (window.LF = window.LF || {});
  const { DAY, HOUR, MIN } = LF.T;
  const fmt = LF.fmt, q = LF.q;
  const E = (LF.engine = {});
  const S = () => LF.S;

  /* ---------------- low-level record helpers ---------------- */
  E.timeline = function (lead, type, text, by) {
    lead.timeline.push({ id: LF.uid('e'), t: Date.now(), type, text, by: by || 'LeadFlow Automation' });
  };
  E.activity = function (type, text, leadId) {
    S().activities.unshift({ id: LF.uid('a'), t: Date.now(), type, text, leadId });
    if (S().activities.length > 220) S().activities.length = 220;
  };
  E.notify = function (text, leadId, kind) {
    S().notifications.unshift({ id: LF.uid('n'), t: Date.now(), text, leadId, read: false, kind: kind || 'lead' });
    if (S().notifications.length > 60) S().notifications.length = 60;
  };
  E.addComm = function (c) {
    const comm = Object.assign({ id: LF.uid('c'), dir: 'out', status: 'Delivered', automated: false, t: Date.now() }, c);
    S().comms.push(comm); return comm;
  };
  E.addTask = function (o) {
    const t = Object.assign({ id: LF.uid('k'), status: 'Pending', priority: 'Medium', note: '', highlighted: false, reminded: false, completedAt: null, createdAt: Date.now() }, o);
    S().tasks.push(t); return t;
  };

  const VALUE_BY_SERVICE = { 'Buying a home': 520000, 'Selling my property': 610000, 'Renting a property': 32000, 'Property valuation': 480000, 'Investment advice': 690000, 'Commercial property': 820000 };
  E.newLead = function (d) {
    const ls = S().leads;
    const maxId = ls.reduce((m, l) => Math.max(m, parseInt(l.id.slice(2), 10) || 0), 1000);
    let h = 0; for (const c of d.name || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const base = VALUE_BY_SERVICE[d.service] || 450000;
    const lead = {
      id: 'L-' + (maxId + 1), name: d.name.trim(), email: (d.email || '').trim(), phone: (d.phone || '').trim(), source: d.source || 'Website enquiry', status: 'New', ownerId: d.ownerId || null,
      interest: d.service || 'Buying a home', property: d.property || d.service || 'General enquiry', value: d.value != null && d.value !== '' ? Number(d.value) : Math.round((base * (0.85 + (h % 30) / 100)) / 5000) * 5000,
      createdAt: Date.now(), contactedAt: null, convertedAt: null, lostAt: null, lostReason: null, responseMins: null, reached: 0, flagged: false,
      message: d.message || '', notes: [], timeline: [],
    };
    ls.push(lead);
    E.timeline(lead, 'created', 'Lead received from ' + (lead.source === 'Website enquiry' ? 'the website enquiry form' : lead.source), d.by);
    E.activity('lead_received', 'New lead received: ' + lead.name + ' (' + lead.source + ')', lead.id);
    return lead;
  };

  /* round-robin / least-loaded assignment honouring availability settings */
  E.pickOwner = function (method) {
    const a = S().settings.assignment;
    method = method && method !== 'default' ? method : a.method;
    let pool = S().team.filter((m) => m.active && (a.includeManager || !m.manager));
    if (a.onlyAvailable) pool = pool.filter((m) => m.availability === 'Available');
    pool = pool.filter((m) => q.openLeadsOf(m.id) < a.maxActive);
    if (!pool.length) return null;
    if (method === 'least_loaded') return pool.slice().sort((x, y) => q.openLeadsOf(x.id) - q.openLeadsOf(y.id))[0];
    const order = S().team.map((m) => m.id), last = order.indexOf(S().meta.lastAssignedId);
    const sorted = pool.slice().sort((x, y) => ((order.indexOf(x.id) - last - 1 + order.length) % order.length) - ((order.indexOf(y.id) - last - 1 + order.length) % order.length));
    return sorted[0];
  };
  E.assign = function (lead, member, how, by) {
    const prev = q.owner(lead);
    lead.ownerId = member ? member.id : null;
    if (member) S().meta.lastAssignedId = member.id;
    return prev;
  };

  /* ---------------- trigger & action catalogs ---------------- */
  E.TRIGGERS = {
    enquiry_received: { label: 'New website enquiry received', icon: 'inbox', desc: 'Fires when a visitor submits the website enquiry form.', params: [] },
    followup_due: { label: 'Follow-up deadline approaching', icon: 'clock', desc: 'Fires shortly before a scheduled follow-up is due.', params: [{ key: 'minutes', label: 'Minutes before due', type: 'number', def: 30 }] },
    uncontacted: { label: 'Lead remains uncontacted', icon: 'alert', desc: 'Fires when a new lead has not been contacted for a set time.', params: [{ key: 'hours', label: 'Hours without contact', type: 'number', def: 24 }] },
    status_changed: { label: 'Lead status changes', icon: 'refresh', desc: 'Fires when a lead moves to a specific status.', params: [{ key: 'status', label: 'New status', type: 'status', def: 'Converted' }] },
  };
  E.triggerText = function (tr) {
    if (tr.type === 'followup_due') return 'Follow-up due in ' + (tr.minutes || 30) + ' min';
    if (tr.type === 'uncontacted') return 'Uncontacted for ' + (tr.hours || 24) + ' hours';
    if (tr.type === 'status_changed') return 'Status changes to ' + (tr.status || 'Converted');
    return E.TRIGGERS[tr.type] ? E.TRIGGERS[tr.type].label : tr.type;
  };

  const A = (E.ACTIONS = {});
  const def = (key, o) => { A[key] = Object.assign({ key, params: [] }, o); };

  def('create_lead', { label: () => 'Create lead record', icon: 'user-plus', desc: 'Creates a new lead from the enquiry.', triggers: ['enquiry_received'],
    run(ctx) { if (!ctx.enquiry) return { ok: false, detail: 'No enquiry data' }; const l = E.newLead(ctx.enquiry); ctx.lead = l; return { ok: true, detail: l.id + ' · ' + l.name + ' · ' + l.source }; } });

  def('send_email', { label: (p) => { const t = q.template(p.templateId); return 'Send email: ' + (t ? t.name : 'template'); }, icon: 'mail', desc: 'Sends an email using one of your templates.',
    params: [{ key: 'templateId', label: 'Email template', type: 'template', def: 't1' }],
    run(ctx, p) {
      const lead = ctx.lead, tpl = q.template(p.templateId);
      if (!lead || !tpl) return { ok: false, detail: 'Missing lead or template' };
      if (!lead.email || !/^\S+@\S+\.\S+$/.test(lead.email)) return { ok: false, detail: 'No valid email address' };
      const r = LF.renderTemplateRaw(tpl, { lead, owner: q.owner(lead) });
      E.addComm({ leadId: lead.id, channel: 'email', subject: r.subject, body: r.body, templateId: tpl.id, by: 'system', automated: true, status: 'Delivered' });
      E.timeline(lead, 'email', 'Email sent: "' + r.subject + '"');
      E.activity('email_sent', (tpl.id === 't1' ? 'Acknowledgement' : tpl.name) + ' email sent to ' + lead.name, lead.id);
      ctx.email = { subject: r.subject, to: lead.email, templateName: tpl.name };
      return { ok: true, detail: 'Delivered to ' + lead.email };
    } });

  def('assign_lead', { label: () => 'Assign to available salesperson', icon: 'users', desc: 'Picks a salesperson using your assignment settings.',
    params: [{ key: 'method', label: 'Method', type: 'select', options: [{ v: 'default', l: 'Use assignment settings' }, { v: 'round_robin', l: 'Round robin' }, { v: 'least_loaded', l: 'Least active leads' }], def: 'default' }],
    run(ctx, p) {
      const lead = ctx.lead; if (!lead) return { ok: false, detail: 'No lead' };
      if (lead.ownerId) return { ok: true, detail: q.ownerName(lead) + ' (pre-assigned)' };
      let m = E.pickOwner(p.method), note = '';
      const method = (p.method && p.method !== 'default' ? p.method : S().settings.assignment.method) === 'least_loaded' ? 'least active leads' : 'round robin';
      if (!m) { m = q.member(S().settings.assignment.fallbackId) || q.manager(); note = ' — nobody available, sent to manager'; }
      E.assign(lead, m);
      E.timeline(lead, 'assigned', 'Assigned to ' + m.name + (note ? ' (fallback owner)' : ' (' + method + ')'));
      E.activity('assigned', lead.name + ' assigned to ' + m.name, lead.id);
      return { ok: true, detail: m.name + (note || ' · ' + method) };
    } });

  E.nextBusinessSlot = function (t) {
    const a = S().settings.automation; if (!a.businessHoursOnly) return t;
    const d = new Date(t), h = d.getHours() + d.getMinutes() / 60;
    if (h >= a.hoursStart && h < a.hoursEnd) return t;
    if (h >= a.hoursEnd) d.setDate(d.getDate() + 1);
    d.setHours(a.hoursStart, 0, 0, 0);
    return d.getTime();
  };
  def('schedule_followup', { label: (p) => 'Schedule ' + (p.followType || 'follow-up').toLowerCase() + ' in ' + (p.delay || 30) + ' min', icon: 'calendar', desc: 'Creates a follow-up task for the lead owner.',
    params: [{ key: 'followType', label: 'Follow-up type', type: 'select', options: LF.C.TASK_TYPES, def: 'Initial call' }, { key: 'delay', label: 'Minutes from now', type: 'number', def: 30 }, { key: 'priority', label: 'Priority', type: 'select', options: LF.C.PRIORITIES, def: 'High' }],
    run(ctx, p) {
      const lead = ctx.lead; if (!lead) return { ok: false, detail: 'No lead' };
      const raw = Date.now() + (Number(p.delay) || 30) * MIN, due = E.nextBusinessSlot(raw);
      const ownerId = lead.ownerId || S().settings.assignment.fallbackId;
      const t = E.addTask({ leadId: lead.id, ownerId, type: p.followType || 'Follow-up call', due, priority: p.priority || 'High', note: 'Created by automation' });
      ctx.task = t;
      E.timeline(lead, 'task', t.type + ' scheduled for ' + fmt.dayTime(due) + (due !== raw ? ' (next business slot)' : ''));
      E.activity('followup_scheduled', 'Follow-up scheduled: ' + t.type + ' with ' + lead.name + ' at ' + fmt.time(due), lead.id);
      return { ok: true, detail: t.type + ', ' + fmt.dayTime(due) + (due !== raw ? ' · next business hours' : '') };
    } });

  def('notify_salesperson', { label: () => 'Notify assigned salesperson', icon: 'bell', desc: 'Sends a push + email notification to the owner.',
    run(ctx) {
      const lead = ctx.lead, o = q.owner(lead); if (!o) return { ok: false, detail: 'Lead has no owner' };
      E.notify('New lead assigned to ' + o.name + ': ' + lead.name + (ctx.task ? ' — call by ' + fmt.time(ctx.task.due) : ''), lead.id, 'lead');
      E.timeline(lead, 'notify', o.name + ' notified of new lead (push + email)');
      ctx.notified = o;
      return { ok: true, detail: o.name + ' · push + email' };
    } });

  def('send_reminder', { label: () => 'Send reminder to salesperson', icon: 'bell', desc: 'Reminds the task owner about the upcoming follow-up.', triggers: ['followup_due'],
    run(ctx) {
      const t = ctx.task, lead = ctx.lead; if (!t) return { ok: false, detail: 'No task' };
      const o = q.member(t.ownerId);
      E.notify('Reminder: ' + t.type.toLowerCase() + ' with ' + lead.name + (t.due < Date.now() ? ' is overdue' : ' is due at ' + fmt.time(t.due)), lead.id, 'reminder');
      E.activity('reminder', 'Reminder triggered: ' + t.type + ' with ' + lead.name + ' due ' + fmt.time(t.due), lead.id);
      t.reminded = true; return { ok: true, detail: (o ? o.name : 'Owner') + ' · ' + t.type };
    } });
  def('highlight_followup', { label: () => 'Highlight pending follow-up', icon: 'flag', desc: 'Highlights the follow-up in task lists.', triggers: ['followup_due'],
    run(ctx) { if (!ctx.task) return { ok: false, detail: 'No task' }; ctx.task.highlighted = true; return { ok: true, detail: ctx.task.type + ' · ' + fmt.dayTime(ctx.task.due) }; } });
  def('update_timeline', { label: () => 'Update activity timeline', icon: 'list', desc: 'Adds an entry to the lead timeline.',
    params: [{ key: 'text', label: 'Timeline entry', type: 'text', def: 'Automation rule executed' }],
    run(ctx, p) { if (!ctx.lead) return { ok: false, detail: 'No lead' }; E.timeline(ctx.lead, ctx.task ? 'reminder' : 'automation', LF.renderString(p.text || 'Automation rule executed', LF.templateVars({ lead: ctx.lead, owner: q.owner(ctx.lead) }))); return { ok: true, detail: 'Timeline entry added' }; } });
  def('flag_overdue', { label: () => 'Flag lead as overdue', icon: 'flag', desc: 'Marks the lead as overdue for contact.',
    run(ctx) { if (!ctx.lead) return { ok: false, detail: 'No lead' }; ctx.lead.flagged = true; E.timeline(ctx.lead, 'escalation', 'Lead flagged as overdue — no contact made'); return { ok: true, detail: ctx.lead.name + ' flagged' }; } });
  def('notify_manager', { label: () => 'Notify sales manager', icon: 'bell', desc: 'Alerts the sales manager.',
    run(ctx) { const m = q.manager(); E.notify('Escalation: ' + ctx.lead.name + ' has not been contacted for ' + Math.max(1, Math.floor((Date.now() - ctx.lead.createdAt) / HOUR)) + ' hours', ctx.lead.id, 'alert'); E.activity('escalation', ctx.lead.name + ' escalated to ' + m.name + ' (uncontacted)', ctx.lead.id); return { ok: true, detail: m.name }; } });
  def('create_escalation_task', { label: () => 'Create escalation task', icon: 'tasks', desc: 'Creates a high-priority task for the manager.',
    run(ctx) { const m = q.manager(); const t = E.addTask({ leadId: ctx.lead.id, ownerId: m.id, type: 'Follow-up call', due: Date.now() + HOUR, priority: 'High', note: 'Escalation: lead uncontacted', highlighted: true, escalation: true }); E.timeline(ctx.lead, 'task', 'Escalation task created for ' + m.name); return { ok: true, detail: 'Follow-up call for ' + m.name + ' · High priority' }; } });
  def('stop_reminders', { label: () => 'Stop pending follow-up reminders', icon: 'power', desc: 'Cancels open follow-ups for the lead.',
    run(ctx) { const open = S().tasks.filter((t) => t.leadId === ctx.lead.id && t.status === 'Pending'); open.forEach((t) => { t.status = 'Cancelled'; }); if (open.length) E.timeline(ctx.lead, 'automation', open.length + ' pending follow-up' + (open.length > 1 ? 's' : '') + ' cancelled'); return { ok: true, detail: open.length + ' follow-up' + (open.length === 1 ? '' : 's') + ' cancelled' }; } });
  def('record_conversion', { label: () => 'Record conversion activity', icon: 'check-circle', desc: 'Logs the win on the timeline and activity feed.',
    run(ctx) { const l = ctx.lead; E.timeline(l, 'converted', 'Converted — deal value ' + fmt.money(l.value)); E.activity('converted', l.name + ' converted — ' + fmt.money(l.value), l.id); E.notify(l.name + ' converted — ' + fmt.money(l.value), l.id, 'win'); return { ok: true, detail: fmt.money(l.value) + ' recorded' }; } });
  def('update_dashboard', { label: () => 'Update dashboard statistics', icon: 'chart', desc: 'Recalculates KPIs and reports.',
    run() { S().meta.statsAt = Date.now(); return { ok: true, detail: 'KPIs recalculated' }; } });

  E.actionLabel = (a) => (A[a.type] ? A[a.type].label(a.params || {}) : a.type);

  /* ---------------- rule execution ---------------- */
  E.ruleLive = (rule) => rule.enabled && !S().settings.automation.paused;

  /* Stepper lets the simulation animate one action at a time; execRule runs all at once */
  E.stepper = function (rule, ctx) {
    const steps = [], started = Date.now(); let i = 0;
    return {
      total: rule.actions.length,
      next() {
        const a = rule.actions[i++]; if (!a) return null;
        let res;
        try { res = A[a.type].run(ctx, a.params || {}); } catch (e) { res = { ok: false, detail: String(e.message || e) }; }
        const step = { label: E.actionLabel(a), ok: res.ok, detail: res.detail, icon: A[a.type].icon, type: a.type };
        steps.push(step); return step;
      },
      finish() {
        const okc = steps.filter((s) => s.ok).length;
        const run = { id: LF.uid('x'), ruleId: rule.id, t: started, leadId: ctx.lead ? ctx.lead.id : null, status: okc === steps.length ? 'Success' : okc ? 'Warning' : 'Failed', durationMs: Date.now() - started + 900 + Math.floor(Math.random() * 600), steps: steps.map(({ label, ok, detail }) => ({ label, ok, detail })) };
        S().runs.unshift(run); LF.save(); return run;
      },
    };
  };
  E.execRule = function (rule, ctx) { const s = E.stepper(rule, ctx); while (s.next()); return s.finish(); };
  E.fire = function (type, ctx, match) {
    const runs = [];
    S().rules.filter((r) => E.ruleLive(r) && r.trigger.type === type && (!match || match(r))).forEach((r) => runs.push(E.execRule(r, ctx)));
    LF.save(); return runs;
  };

  /* ---------------- lead / task operations ---------------- */
  E.setStatus = function (lead, status, o) {
    o = o || {};
    if (lead.status === status) return [];
    const prev = lead.status, by = o.by || q.user().name, now = Date.now();
    lead.status = status;
    E.timeline(lead, 'status', 'Status changed: ' + prev + ' → ' + status, by);
    const rank = LF.C.RANK[status];
    if (rank > lead.reached) lead.reached = rank;
    if (status !== 'Lost') { lead.lostAt = null; lead.lostReason = null; }
    if (status !== 'Converted') lead.convertedAt = null;
    if (status !== 'New' && !lead.contactedAt && status !== 'Lost') { lead.contactedAt = now; lead.responseMins = Math.max(1, Math.round((now - lead.createdAt) / MIN)); }
    if (status !== 'New') lead.flagged = false;
    if (o.value != null && !isNaN(o.value)) lead.value = Number(o.value);
    let runs = [];
    if (status === 'Converted') { lead.convertedAt = now; }
    if (status === 'Lost') {
      lead.lostAt = now; lead.lostReason = o.reason || 'Not ready to buy';
      E.timeline(lead, 'lost', 'Marked as lost — ' + lead.lostReason, by);
      S().tasks.filter((t) => t.leadId === lead.id && t.status === 'Pending').forEach((t) => { t.status = 'Cancelled'; });
    }
    E.activity('status', lead.name + ': ' + prev + ' → ' + status, lead.id);
    runs = E.fire('status_changed', { lead }, (r) => r.trigger.status === status);
    LF.save(); return runs;
  };
  E.completeTask = function (task) {
    if (task.status !== 'Pending') return;
    const lead = q.lead(task.leadId), by = q.member(task.ownerId);
    task.status = 'Completed'; task.completedAt = Date.now();
    const verb = { 'Initial call': 'Initial call completed', 'Follow-up call': 'Follow-up call completed', Email: 'Follow-up email sent', 'WhatsApp reminder': 'WhatsApp reminder sent', Meeting: 'Meeting completed' }[task.type];
    E.timeline(lead, task.type.includes('call') ? 'call' : task.type === 'Email' ? 'email' : task.type === 'Meeting' ? 'meeting' : 'chat', verb + (task.note ? ' — ' + task.note : ''), by ? by.name : q.user().name);
    const channel = task.type.includes('call') ? 'call' : task.type === 'Email' ? 'email' : task.type === 'Meeting' ? 'meeting' : 'whatsapp';
    if (channel !== 'email') E.addComm({ leadId: lead.id, channel, subject: verb, body: task.note || 'Logged from follow-up task.', by: task.ownerId });
    if (lead.status === 'New' && !task.escalation) E.setStatus(lead, 'Contacted', { by: by ? by.name : undefined });
    else if (task.escalation && lead.status === 'New') E.setStatus(lead, 'Contacted', { by: by ? by.name : undefined });
    LF.save();
  };
  E.reschedule = function (task, due) {
    task.due = due; task.reminded = false; task.highlighted = false; task.fired = {};
    const lead = q.lead(task.leadId);
    E.timeline(lead, 'task', task.type + ' rescheduled to ' + fmt.dayTime(due), q.user().name);
    LF.save();
  };
  E.createTask = function (o) {
    const t = E.addTask(o); const lead = q.lead(t.leadId);
    E.timeline(lead, 'task', t.type + ' scheduled for ' + fmt.dayTime(t.due), q.user().name);
    E.activity('followup_scheduled', 'Follow-up scheduled: ' + t.type + ' with ' + lead.name + ' at ' + fmt.time(t.due), lead.id);
    LF.save(); return t;
  };
  E.deleteLead = function (lead) {
    const S_ = S(); S_.leads = S_.leads.filter((l) => l.id !== lead.id); S_.tasks = S_.tasks.filter((t) => t.leadId !== lead.id);
    S_.comms = S_.comms.filter((c) => c.leadId !== lead.id); S_.activities = S_.activities.filter((a) => a.leadId !== lead.id);
    S_.notifications = S_.notifications.filter((n) => n.leadId !== lead.id); S_.runs.forEach((r) => { if (r.leadId === lead.id) r.leadName = lead.name; r.leadGone = r.leadId === lead.id ? true : r.leadGone; });
    LF.save();
  };

  /* Scheduled checks – rules 2 & 3. Called every minute and from the "Run checks now" button */
  E.checkScheduled = function () {
    const out = { reminders: 0, escalations: 0 }, now = Date.now();
    S().rules.filter((r) => E.ruleLive(r) && r.trigger.type === 'followup_due').forEach((rule) => {
      const lead_ms = (Number(rule.trigger.minutes) || 30) * MIN;
      S().tasks.filter((t) => t.status === 'Pending' && !t.reminded && !(t.fired && t.fired[rule.id]) && t.due - lead_ms <= now).forEach((t) => {
        const lead = q.lead(t.leadId); if (!lead) return;
        t.fired = t.fired || {}; t.fired[rule.id] = true;
        E.execRule(rule, { lead, task: t }); out.reminders++;
      });
    });
    S().rules.filter((r) => E.ruleLive(r) && r.trigger.type === 'uncontacted').forEach((rule) => {
      const ms = (Number(rule.trigger.hours) || 24) * HOUR;
      S().leads.filter((l) => l.status === 'New' && !l.contactedAt && !l.flagged && !(l.fired && l.fired[rule.id]) && now - l.createdAt >= ms).forEach((l) => {
        l.fired = l.fired || {}; l.fired[rule.id] = true;
        E.execRule(rule, { lead: l }); out.escalations++;
      });
    });
    if (out.reminders || out.escalations) LF.save();
    return out;
  };

  /* Add a lead through the manual form, optionally running the enquiry automation */
  E.addManualLead = function (d, automate) {
    const rule = S().rules.find((r) => r.trigger.type === 'enquiry_received' && E.ruleLive(r));
    if (automate && rule) {
      const ctx = { enquiry: Object.assign({ by: q.user().name }, d) };
      const run = E.execRule(rule, ctx); LF.save(); return { lead: ctx.lead, run };
    }
    const lead = E.newLead(Object.assign({ by: q.user().name }, d));
    if (!lead.ownerId) { const m = E.pickOwner(); if (m) { E.assign(lead, m); E.timeline(lead, 'assigned', 'Assigned to ' + m.name + ' (' + (S().settings.assignment.method === 'least_loaded' ? 'least active leads' : 'round robin') + ')'); } }
    else E.timeline(lead, 'assigned', 'Assigned to ' + q.ownerName(lead), q.user().name);
    LF.save(); return { lead, run: null };
  };
})();
