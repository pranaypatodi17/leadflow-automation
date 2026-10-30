/* LeadFlow – Automation rules: list, inspector, workflow builder, execution history */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions, E = LF.engine, { DAY, HOUR, MIN } = LF.T;
  LF.pages = LF.pages || {};
  LF.view = LF.view || {};
  LF.view.auto = LF.view.auto || { tab: 'rules', rule: '', status: '', page: 1 };
  const V = () => LF.view.auto;

  const ruleRuns = (id) => LF.S.runs.filter((r) => r.ruleId === id);
  const runBadge = (s) => ui.badge(s, s === 'Success' ? 'green' : s === 'Warning' ? 'amber' : 'red');

  function miniFlow(rule) {
    return '<div class="mini-flow"><span class="mf trg">' + icon(E.TRIGGERS[rule.trigger.type].icon, 'xs') + E.triggerText(rule.trigger) + '</span>' +
      rule.actions.map((a) => '<span class="seg"><span class="arr">→</span><span class="mf">' + icon(E.ACTIONS[a.type].icon, 'xs') + esc(E.actionLabel(a).replace(/^Send email: .*/, 'Send email')) + '</span></span>').join('') + '</div>';
  }
  function toggle(rule) {
    return '<label class="switch" title="' + (rule.enabled ? 'Disable' : 'Enable') + ' rule"><input type="checkbox" data-change="rule-toggle" data-id="' + rule.id + '" ' + (rule.enabled ? 'checked' : '') + ' aria-label="Enable ' + esc(rule.name) + '"><span></span></label>';
  }
  function ruleCard(r) {
    const runs = ruleRuns(r.id), ok = runs.filter((x) => x.status === 'Success').length, last = runs[0];
    return '<article class="card rule-card ' + (r.enabled ? '' : 'off') + '"><div class="rule-top"><div><div class="row wrap" style="gap:8px"><h3>' + esc(r.name) + '</h3>' + (r.enabled ? ui.badge('Active', 'green') : ui.badge('Paused')) + (r.builtin ? '' : ui.badge('Custom', 'violet')) + '</div><p class="muted" style="margin-top:4px">' + esc(r.description || 'No description') + '</p></div>' + toggle(r) + '</div>' +
      miniFlow(r) + '<div class="rule-meta"><span><b>' + runs.length + '</b> executions</span><span><b>' + (runs.length ? Math.round((ok / runs.length) * 100) : 100) + '%</b> success</span><span>Last run: <b>' + (last ? fmt.rel(last.t) : 'never') + '</b></span></div>' +
      '<div class="row wrap" style="gap:8px"><a class="btn sm primary-soft" href="#/automation/' + r.id + '">' + icon('eye', 'xs') + ' Inspect workflow</a><button class="btn sm" data-action="rule-edit" data-id="' + r.id + '">' + icon('edit', 'xs') + ' Edit</button><a class="btn sm" href="#/automation/' + r.id + '?tab=history">' + icon('clock', 'xs') + ' History</a>' + (r.builtin ? '' : '<button class="btn sm danger-ghost" data-action="rule-delete" data-id="' + r.id + '">' + icon('trash', 'xs') + ' Delete</button>') + '</div></article>';
  }

  function historyTable(ruleId, withRuleCol) {
    const v = V(), size = 12;
    let runs = LF.S.runs.filter((r) => (!ruleId || r.ruleId === ruleId) && (!v.rule || r.ruleId === v.rule || ruleId) && (!v.status || r.status === v.status));
    if (!runs.length) return ui.empty('clock', 'No executions found', 'Run the live simulation to generate execution history.');
    const pages = Math.max(1, Math.ceil(runs.length / size)); if (v.page > pages) v.page = pages;
    const rows = runs.slice((v.page - 1) * size, v.page * size);
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Time</th>' + (withRuleCol ? '<th>Rule</th>' : '') + '<th>Lead</th><th>Result</th><th class="hide-sm">Steps</th><th class="hide-sm">Duration</th><th></th></tr></thead><tbody>' +
      rows.map((r) => {
        const rule = q.rule(r.ruleId), l = r.leadId && q.lead(r.leadId);
        return '<tr class="clickable" data-action="run-view" data-id="' + r.id + '"><td class="nowrap">' + fmt.dt(r.t) + '<div class="muted xs">' + fmt.rel(r.t) + '</div></td>' + (withRuleCol ? '<td><b style="font-weight:600">' + esc(rule ? rule.name : 'Deleted rule') + '</b></td>' : '') +
          '<td>' + (l ? esc(l.name) : '<span class="faint">—</span>') + '</td><td>' + runBadge(r.status) + '</td><td class="hide-sm">' + r.steps.filter((s) => s.ok).length + ' / ' + r.steps.length + '</td><td class="hide-sm">' + (r.durationMs / 1000).toFixed(1) + 's</td><td class="right">' + icon('chevron-right', 'sm') + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="tbl-foot">' + ui.pager(runs.length, v.page, size, 'hist-page') + '</div>';
  }

  /* ---------- workflow visual ---------- */
  function wfView(rule) {
    return '<div class="wf"><div class="wf-card trigger"><div class="wi">' + icon(E.TRIGGERS[rule.trigger.type].icon) + '</div><div class="wt"><small>Trigger</small><b>' + esc(E.triggerText(rule.trigger)) + '</b><span>' + esc(E.TRIGGERS[rule.trigger.type].desc) + '</span></div></div>' +
      rule.actions.map((a, i) => '<div class="wf-conn"></div><div class="wf-card"><span class="wn">' + (i + 1) + '</span><div class="wi">' + icon(E.ACTIONS[a.type].icon) + '</div><div class="wt"><small>Action ' + (i + 1) + '</small><b>' + esc(E.actionLabel(a)) + '</b><span>' + esc(E.ACTIONS[a.type].desc) + paramSummary(a) + '</span></div></div>').join('') + '</div>';
  }
  function paramSummary(a) {
    const def = E.ACTIONS[a.type]; if (!def.params.length) return '';
    const bits = def.params.map((p) => { let v = (a.params || {})[p.key]; if (v == null || v === '') return null; if (p.type === 'template') { const t = q.template(v); v = t ? t.name : v; } if (p.key === 'method') v = ({ default: 'assignment settings', round_robin: 'round robin', least_loaded: 'least active leads' })[v] || v; return p.label + ': ' + v; }).filter(Boolean);
    return bits.length ? ' · ' + esc(bits.join(' · ')) : '';
  }

  LF.pages.automation = {
    title: (r) => (r && r.id && q.rule(r.id) ? q.rule(r.id).name : 'Automation Rules'),
    render(r) {
      if (r && r.id) return detail(r);
      const v = V(), rules = LF.S.rules, active = rules.filter((x) => x.enabled).length, range = q.range();
      const runsIn = LF.S.runs.filter((x) => x.t >= range.start), ok = runsIn.filter((x) => x.status === 'Success').length;
      const paused = LF.S.settings.automation.paused;
      return '<div class="page-h"><div><h1>Automation Rules</h1><p>Rules run automatically in the background so every enquiry gets an instant reply and a follow-up.</p></div><div class="acts"><button class="btn" data-action="auto-run-checks">' + icon('refresh', 'sm') + ' Run scheduled checks</button><button class="btn" data-action="sim-open">' + icon('play', 'sm') + ' Simulate enquiry</button><button class="btn primary" data-action="rule-new">' + icon('plus', 'sm') + ' Create rule</button></div></div>' +
        (paused ? '<div class="flag-banner" style="background:var(--amber-soft);border-color:#f3dfae;color:#7a5300">' + icon('alert') + '<div style="flex:1"><b>All automations are paused.</b> No rules will run until you resume them.</div><button class="btn sm" data-action="auto-resume">Resume automation</button></div>' : '') +
        '<div class="grid g3" style="margin-bottom:16px"><div class="kpi"><div class="kl">' + icon('zap') + 'Active rules</div><div class="kv">' + active + ' <span class="muted" style="font-size:15px;font-weight:500">/ ' + rules.length + '</span></div></div><div class="kpi"><div class="kl">' + icon('play') + 'Executions · ' + range.label.toLowerCase() + '</div><div class="kv">' + runsIn.length + '</div></div><div class="kpi"><div class="kl">' + icon('check-circle') + 'Success rate</div><div class="kv">' + fmt.pct(runsIn.length ? (ok / runsIn.length) * 100 : 100) + '</div></div></div>' +
        '<div class="tabs"><button class="' + (v.tab === 'rules' ? 'on' : '') + '" data-action="auto-tab" data-tab="rules">' + icon('layers', 'sm') + ' Rules <span class="cnt">' + rules.length + '</span></button><button class="' + (v.tab === 'history' ? 'on' : '') + '" data-action="auto-tab" data-tab="history">' + icon('clock', 'sm') + ' Execution history <span class="cnt">' + LF.S.runs.length + '</span></button></div>' +
        (v.tab === 'rules' ? (rules.length ? '<div class="grid g2">' + rules.map(ruleCard).join('') + '</div>' : ui.card('', ui.empty('zap', 'No automation rules', 'Create your first rule to automate follow-ups.', '<button class="btn primary" data-action="rule-new">Create rule</button>'))) :
          '<section class="card"><div class="toolbar"><select id="hf-rule" data-change="hist-filter" aria-label="Rule">' + ui.opts([{ v: '', l: 'All rules' }].concat(rules.map((x) => ({ v: x.id, l: x.name }))), v.rule) + '</select><select id="hf-status" data-change="hist-filter" aria-label="Result">' + ui.opts([{ v: '', l: 'All results' }, 'Success', 'Warning', 'Failed'], v.status) + '</select></div><div id="hist-body">' + historyTable(null, true) + '</div></section>');
    },
  };

  function detail(r) {
    const rule = q.rule(r.id);
    if (!rule) return ui.card('', ui.empty('zap', 'Rule not found', 'It may have been deleted.', '<a class="btn primary" href="#/automation">Back to rules</a>'));
    const runs = ruleRuns(rule.id), ok = runs.filter((x) => x.status === 'Success').length, avg = LF.q.avg(runs.map((x) => x.durationMs)) / 1000;
    const tab = (r.params && r.params.tab) || 'workflow';
    const tryBtn = rule.trigger.type === 'enquiry_received' ? '<button class="btn" data-action="sim-open">' + icon('play', 'sm') + ' Try with a sample enquiry</button>' : (rule.trigger.type === 'status_changed' || !rule.builtin) ? '' : '<button class="btn" data-action="auto-run-checks">' + icon('refresh', 'sm') + ' Run checks now</button>';
    return '<button class="crumb" data-action="goto" data-href="#/automation">' + icon('arrow-left', 'sm') + ' Automation Rules</button>' +
      '<div class="detail-h"><div><div class="row wrap" style="gap:10px"><h1>' + esc(rule.name) + '</h1>' + (rule.enabled ? ui.badge('Active', 'green') : ui.badge('Paused')) + '</div><p class="muted" style="max-width:640px;margin-top:4px">' + esc(rule.description) + '</p></div><div class="row">' + tryBtn + '<button class="btn" data-action="rule-edit" data-id="' + rule.id + '">' + icon('edit', 'sm') + ' Edit workflow</button><div class="row" style="gap:8px;padding-left:6px"><span class="muted sm">Enabled</span>' + toggle(rule) + '</div></div></div>' +
      '<div class="grid g3" style="margin-bottom:16px"><div class="kpi"><div class="kl">Executions</div><div class="kv">' + runs.length + '</div></div><div class="kpi"><div class="kl">Success rate</div><div class="kv">' + fmt.pct(runs.length ? (ok / runs.length) * 100 : 100) + '</div></div><div class="kpi"><div class="kl">Avg run time</div><div class="kv">' + (runs.length ? avg.toFixed(1) + 's' : '—') + '</div></div></div>' +
      '<div class="tabs"><button class="' + (tab === 'workflow' ? 'on' : '') + '" data-action="goto" data-href="#/automation/' + rule.id + '">' + icon('layers', 'sm') + ' Workflow</button><button class="' + (tab === 'history' ? 'on' : '') + '" data-action="goto" data-href="#/automation/' + rule.id + '?tab=history">' + icon('clock', 'sm') + ' Execution history <span class="cnt">' + runs.length + '</span></button></div>' +
      (tab === 'history' ? '<section class="card">' + historyTable(rule.id, false) + '</section>' : ui.card('Trigger & action sequence', wfView(rule), { sub: 'Actions run in order, top to bottom, each time the trigger fires.' }));
  }

  /* ---------- actions ---------- */
  A['auto-tab'] = (el) => { V().tab = el.dataset.tab; V().page = 1; LF.app.refresh(); };
  A['hist-filter'] = () => { const v = V(); v.rule = document.getElementById('hf-rule').value; v.status = document.getElementById('hf-status').value; v.page = 1; document.getElementById('hist-body').innerHTML = historyTable(null, true); };
  A['hist-page'] = (el) => { V().page = Number(el.dataset.page); LF.app.refresh(); };
  A['auto-resume'] = () => { LF.S.settings.automation.paused = false; LF.save(); LF.app.refresh(); ui.toast('Automation resumed'); };
  A['auto-run-checks'] = function () {
    const out = LF.app.runChecks(true);
    if (!out.reminders && !out.escalations) { ui.toast('Checks complete — no follow-ups or leads currently match a trigger', 'info'); LF.app.refresh(); }
    else ui.toast('Checks complete: ' + out.reminders + ' reminder(s) sent, ' + out.escalations + ' escalation(s)');
  };
  A['rule-toggle'] = function (el) {
    const r = q.rule(el.dataset.id); r.enabled = el.checked; LF.save();
    E.activity('status', 'Automation rule “' + r.name + '” ' + (r.enabled ? 'enabled' : 'disabled')); LF.app.refresh();
    ui.toast(r.name + (r.enabled ? ' enabled' : ' disabled'), r.enabled ? 'success' : 'info');
  };
  A['rule-delete'] = function (el) {
    const r = q.rule(el.dataset.id);
    ui.confirm({ title: 'Delete rule?', message: 'Delete <b>' + esc(r.name) + '</b>? Its execution history is kept.', confirmLabel: 'Delete rule', danger: true, onConfirm: () => { LF.S.rules = LF.S.rules.filter((x) => x.id !== r.id); LF.save(); if (location.hash.includes('/automation/')) location.hash = '#/automation'; else LF.app.refresh(); ui.toast('Rule deleted', 'info'); } });
  };
  A['run-view'] = function (el) {
    const run = LF.S.runs.find((x) => x.id === el.dataset.id), rule = q.rule(run.ruleId), l = run.leadId && q.lead(run.leadId);
    ui.modal({ title: 'Execution details', subtitle: esc(rule ? rule.name : 'Deleted rule') + ' · ' + fmt.dt(run.t), size: 'md',
      body: '<div class="row wrap" style="margin-bottom:14px">' + runBadge(run.status) + '<span class="muted sm">' + (run.durationMs / 1000).toFixed(1) + 's · ' + run.steps.length + ' steps' + (l ? ' · Lead: <a class="link" href="#/leads/' + l.id + '" data-action="modal-close">' + esc(l.name) + '</a>' : '') + '</span></div>' +
        (rule ? '<div class="note" style="margin-bottom:14px"><b style="font-weight:600">Trigger:</b> ' + esc(E.triggerText(rule.trigger)) + '</div>' : '') +
        '<div class="step-log">' + run.steps.map((s, i) => '<div><span class="' + (s.ok ? 'run-ok' : 'run-bad') + '">' + icon(s.ok ? 'check-circle' : 'x-circle') + '</span><div><b>' + (i + 1) + '. ' + esc(s.label) + '</b><span>' + esc(s.detail || '') + '</span></div></div>').join('') + '</div>',
      footer: '<button class="btn" data-action="modal-close">Close</button>' });
  };

  /* ---------- workflow builder (create / edit) ---------- */
  let draft = null, adding = false, errors = [];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function defaultParams(type) { const p = {}; (E.ACTIONS[type].params || []).forEach((x) => { p[x.key] = x.def; if (x.key === 'delay') p[x.key] = LF.S.settings.automation.defaultDelay || x.def; }); return p; }
  function paramInput(p, val, attrs) {
    if (p.type === 'select') return '<select ' + attrs + '>' + ui.opts(p.options, val) + '</select>';
    if (p.type === 'template') return '<select ' + attrs + '>' + ui.opts(LF.S.templates.map((t) => ({ v: t.id, l: t.name })), val) + '</select>';
    if (p.type === 'status') return '<select ' + attrs + '>' + ui.opts(LF.C.STATUSES, val) + '</select>';
    if (p.type === 'number') return '<input type="number" min="1" ' + attrs + ' value="' + esc(val) + '">';
    return '<input type="text" ' + attrs + ' value="' + esc(val) + '">';
  }
  function editor() {
    const trg = E.TRIGGERS[draft.trigger.type];
    const trigParams = trg.params.map((p) => '<div class="field" style="margin:8px 0 0"><label class="xs">' + p.label + '</label>' + paramInput(p, draft.trigger[p.key] != null ? draft.trigger[p.key] : p.def, 'data-change="wf-tparam" data-k="' + p.key + '"') + '</div>').join('');
    const cards = draft.actions.map((a, i) => {
      const def = E.ACTIONS[a.type];
      return '<div class="wf-conn"></div><div class="wf-card" style="align-items:flex-start"><span class="wn">' + (i + 1) + '</span><div class="wi">' + icon(def.icon) + '</div><div class="wt"><small>Action ' + (i + 1) + '</small><b>' + esc(E.actionLabel(a)) + '</b><span>' + esc(def.desc) + '</span>' +
        def.params.map((p) => '<div class="field" style="margin:8px 0 0"><label class="xs">' + p.label + '</label>' + paramInput(p, (a.params || {})[p.key] != null ? a.params[p.key] : p.def, 'data-change="wf-param" data-i="' + i + '" data-k="' + p.key + '" data-t="' + p.type + '"') + '</div>').join('') + '</div>' +
        '<div class="wa"><button type="button" class="btn icon sm ghost" aria-label="Move up" data-action="wf-move" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + '>' + icon('arrow-up', 'sm') + '</button><button type="button" class="btn icon sm ghost" aria-label="Move down" data-action="wf-move" data-i="' + i + '" data-d="1"' + (i === draft.actions.length - 1 ? ' disabled' : '') + '>' + icon('arrow-down', 'sm') + '</button><button type="button" class="btn icon sm ghost danger-ghost" aria-label="Remove action" data-action="wf-remove" data-i="' + i + '">' + icon('trash', 'sm') + '</button></div></div>';
    }).join('');
    const avail = Object.values(E.ACTIONS).filter((d) => !d.triggers || d.triggers.includes(draft.trigger.type));
    return (errors.length ? '<div class="flag-banner">' + icon('alert') + '<div>' + errors.map(esc).join('<br>') + '</div></div>' : '') +
      '<div class="wf"><div class="wf-card trigger" style="align-items:flex-start"><div class="wi">' + icon(trg.icon) + '</div><div class="wt"><small>Trigger — when this happens</small><select data-change="wf-trigger" aria-label="Trigger" style="margin-top:4px">' + ui.opts(Object.keys(E.TRIGGERS).map((k) => ({ v: k, l: E.TRIGGERS[k].label })), draft.trigger.type) + '</select>' + trigParams + '</div></div>' + cards +
      '<div class="wf-conn"></div>' + (adding ? '<div style="width:100%"><p class="lbl" style="margin-bottom:8px">Choose an action to add</p><div class="add-action-grid">' + avail.map((d) => '<button type="button" data-action="wf-add" data-type="' + d.key + '"><span class="type-ic" style="width:30px;height:30px">' + icon(d.icon, 'sm') + '</span><div><b style="font-weight:600">' + esc(d.label(defaultParams(d.key))) + '</b><span>' + esc(d.desc) + '</span></div></button>').join('') + '</div><div class="center" style="margin-top:8px"><button type="button" class="btn sm ghost" data-action="wf-add-toggle">Cancel</button></div></div>' : '<button type="button" class="btn wf-add" data-action="wf-add-toggle">' + icon('plus', 'sm') + ' Add action</button>') + '</div>';
  }
  function syncMeta() { const n = document.getElementById('rn-name'), d = document.getElementById('rn-desc'); if (n) draft.name = n.value; if (d) draft.description = d.value; }
  function redraw() { syncMeta(); document.getElementById('wf-edit').innerHTML = editor(); }
  function openEditor(rule) {
    adding = false; errors = [];
    draft = rule ? clone(rule) : { id: null, name: '', description: '', enabled: true, trigger: { type: 'enquiry_received' }, actions: [{ type: 'create_lead', params: {} }] };
    ui.modal({ title: rule ? 'Edit automation rule' : 'Create automation rule', subtitle: 'Build the workflow by choosing a trigger and the actions that follow', size: 'lg', noFocus: !!rule,
      body: '<form id="rule-form" data-submit="rule-save" novalidate><div class="form-row"><div class="field"><label for="rn-name">Rule name <span class="req">*</span></label><input id="rn-name" type="text" value="' + esc(draft.name) + '" placeholder="e.g. High-value lead alert"></div><div class="field"><label for="rn-desc">Description</label><input id="rn-desc" type="text" value="' + esc(draft.description) + '" placeholder="What does this rule do?"></div></div><div id="wf-edit" style="background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:16px">' + editor() + '</div></form>',
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="rule-form">' + icon('save', 'sm') + ' ' + (rule ? 'Save changes' : 'Create rule') + '</button>' });
  }
  A['rule-new'] = () => openEditor(null);
  A['rule-edit'] = (el) => openEditor(q.rule(el.dataset.id));
  A['wf-add-toggle'] = () => { adding = !adding; redraw(); };
  A['wf-add'] = (el) => { draft.actions.push({ type: el.dataset.type, params: defaultParams(el.dataset.type) }); adding = false; errors = []; redraw(); };
  A['wf-remove'] = (el) => { draft.actions.splice(Number(el.dataset.i), 1); redraw(); };
  A['wf-move'] = (el) => { const i = Number(el.dataset.i), j = i + Number(el.dataset.d); [draft.actions[i], draft.actions[j]] = [draft.actions[j], draft.actions[i]]; redraw(); };
  A['wf-param'] = (el) => { const a = draft.actions[Number(el.dataset.i)]; a.params = a.params || {}; a.params[el.dataset.k] = el.dataset.t === 'number' ? Number(el.value) : el.value; redraw(); };
  A['wf-tparam'] = (el) => { const p = E.TRIGGERS[draft.trigger.type].params.find((x) => x.key === el.dataset.k); draft.trigger[el.dataset.k] = p.type === 'number' ? Number(el.value) : el.value; redraw(); };
  A['wf-trigger'] = (el) => {
    const t = el.value, trg = E.TRIGGERS[t]; draft.trigger = { type: t }; trg.params.forEach((p) => (draft.trigger[p.key] = p.def));
    const before = draft.actions.length; draft.actions = draft.actions.filter((a) => !E.ACTIONS[a.type].triggers || E.ACTIONS[a.type].triggers.includes(t));
    if (t === 'enquiry_received' && !draft.actions.some((a) => a.type === 'create_lead')) draft.actions.unshift({ type: 'create_lead', params: {} });
    redraw(); if (draft.actions.length < before) ui.toast('Removed actions that do not apply to this trigger', 'info');
  };
  A['rule-save'] = function () {
    syncMeta(); errors = [];
    if (!draft.name.trim()) errors.push('Give the rule a name.');
    if (!draft.actions.length) errors.push('Add at least one action.');
    if (draft.trigger.type === 'enquiry_received' && draft.actions.length && draft.actions[0].type !== 'create_lead') errors.push('For enquiry rules, “Create lead record” must be the first action.');
    if (draft.actions.some((a, i) => a.type === 'send_email' && !q.template((a.params || {}).templateId))) errors.push('Choose an email template for every email action.');
    if (errors.length) { redraw(); document.getElementById('wf-edit').scrollIntoView({ block: 'nearest' }); return; }
    draft.name = draft.name.trim(); draft.description = draft.description.trim();
    if (draft.id) { const r = q.rule(draft.id); Object.assign(r, { name: draft.name, description: draft.description, trigger: draft.trigger, actions: draft.actions }); ui.toast('Rule updated'); }
    else { LF.S.rules.push({ id: LF.uid('r'), builtin: false, enabled: true, name: draft.name, description: draft.description, trigger: draft.trigger, actions: draft.actions }); ui.toast('Rule created and enabled'); }
    LF.save(); ui.closeModal(true); LF.app.refresh();
  };
})();
