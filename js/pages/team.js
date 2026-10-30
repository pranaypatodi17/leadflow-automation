/* LeadFlow – Team management and individual performance */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions, E = LF.engine, { DAY, HOUR, MIN } = LF.T;
  LF.pages = LF.pages || {};

  function card(m) {
    const s = q.memberStats(m.id), av = m.active ? m.availability : 'Inactive';
    return '<article class="card team-card ' + (m.active ? '' : 'inactive') + '"><div class="team-top">' + ui.avatar(m.name, 'lg') + '<div class="grow"><div class="row wrap" style="gap:8px"><h3>' + esc(m.name) + '</h3>' + (m.manager ? ui.badge('Manager', 'violet') : '') + (m.active ? '' : ui.badge('Inactive', 'red')) + '</div>' +
      '<div class="muted">' + esc(m.role) + '</div><div class="muted sm">' + esc(m.email) + ' · ' + esc(m.phone) + '</div></div></div>' +
      '<div class="row between"><span class="avail ' + av.replace(' ', '-') + '"><i></i>' + av + '</span>' + (m.active ? '<select class="input" style="width:auto;height:30px;font-size:12.5px" data-change="member-avail" data-id="' + m.id + '" aria-label="Availability for ' + esc(m.name) + '">' + ui.opts(LF.C.AVAILABILITY, m.availability) + '</select>' : '') + '</div>' +
      '<div class="team-stats"><div><b>' + s.total + '</b><span>Assigned</span></div><div><b>' + s.active + '</b><span>Active</span></div><div><b>' + s.converted + '</b><span>Converted</span></div><div><b>' + fmt.pct(s.rate, 0) + '</b><span>Conv. rate</span></div></div>' +
      '<div><div class="row between sm muted" style="margin-bottom:5px"><span>Conversion rate</span><span>' + fmt.pct(s.rate) + '</span></div><div class="bar"><i style="width:' + Math.min(100, s.rate * 2.5) + '%"></i></div></div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn sm primary-soft" data-action="member-perf" data-id="' + m.id + '">' + icon('chart', 'xs') + ' Performance</button><button class="btn sm" data-action="member-edit" data-id="' + m.id + '">' + icon('edit', 'xs') + ' Edit</button>' +
      '<button class="btn sm ' + (m.active ? 'danger-ghost' : '') + '" data-action="member-toggle" data-id="' + m.id + '">' + icon('power', 'xs') + (m.active ? ' Deactivate' : ' Activate') + '</button></div></article>';
  }

  LF.pages.team = {
    title: 'Team Members',
    render() {
      const t = LF.S.team, act = t.filter((m) => m.active), avail = act.filter((m) => m.availability === 'Available').length;
      const conv = LF.S.leads.filter((l) => l.status === 'Converted').length, rate = (conv / (LF.S.leads.length || 1)) * 100;
      const stat = (ic, l, v) => '<div class="kpi"><div class="kl">' + icon(ic) + l + '</div><div class="kv">' + v + '</div></div>';
      return '<div class="page-h"><div><h1>Team Members</h1><p>Your sales team, their workload and results. Figures cover all leads assigned to each person.</p></div><div class="acts"><button class="btn primary" data-action="member-add">' + icon('user-plus', 'sm') + ' Add team member</button></div></div>' +
        '<div class="grid g4" style="margin-bottom:16px">' + stat('users', 'Team members', act.length + ' <span class="muted" style="font-size:14px;font-weight:500">active of ' + t.length + '</span>') + stat('check-circle', 'Available now', avail) + stat('target', 'Team conversion rate', fmt.pct(rate)) + stat('dollar', 'Open pipeline', fmt.moneyK(LF.S.leads.filter(q.isOpen).reduce((a, l) => a + l.value, 0))) + '</div>' +
        '<div class="grid g3">' + t.map(card).join('') + '</div>';
    },
  };

  A['member-avail'] = function (el) { const m = q.member(el.dataset.id); m.availability = el.value; LF.save(); LF.app.refresh(); ui.toast(m.name + ' is now ' + m.availability.toLowerCase() + (m.availability !== 'Available' ? ' — new leads will skip them' : ''), 'info'); };

  function formHtml(m) {
    m = m || {};
    return '<div class="form-row"><div class="field"><label for="m-name">Full name <span class="req">*</span></label><input id="m-name" name="name" type="text" value="' + esc(m.name || '') + '" autocomplete="off"><span class="err">Please enter a name</span></div><div class="field"><label for="m-email">Work email <span class="req">*</span></label><input id="m-email" name="email" type="email" value="' + esc(m.email || '') + '"><span class="err" id="m-email-err">Enter a valid, unused email address</span></div></div>' +
      '<div class="form-row"><div class="field"><label for="m-phone">Phone</label><input id="m-phone" name="phone" type="tel" value="' + esc(m.phone || '') + '" placeholder="(512) 555-0100"></div><div class="field"><label for="m-role">Role</label><select id="m-role" name="role">' + ui.opts(LF.C.ROLES, m.role || 'Sales Agent') + '</select></div></div>' +
      '<div class="field"><label for="m-av">Availability</label><select id="m-av" name="availability">' + ui.opts(LF.C.AVAILABILITY, m.availability || 'Available') + '</select><span class="hint">Only available team members receive new leads from automatic assignment.</span></div>';
  }
  function readForm(form, id) {
    form.querySelectorAll('.field').forEach((f) => f.classList.remove('invalid'));
    const d = Object.fromEntries(new FormData(form).entries()); let ok = true;
    if (!d.name.trim()) { form.name.closest('.field').classList.add('invalid'); ok = false; }
    const dupe = LF.S.team.some((m) => m.id !== id && m.email.toLowerCase() === d.email.trim().toLowerCase());
    if (!/^\S+@\S+\.\S+$/.test(d.email.trim()) || dupe) { form.email.closest('.field').classList.add('invalid'); ok = false; }
    return ok ? d : null;
  }
  A['member-add'] = () => ui.modal({ title: 'Add team member', subtitle: 'They will join the lead rotation straight away if available', size: 'md', body: '<form id="member-form" data-submit="member-add-submit" novalidate>' + formHtml() + '</form>', footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="member-form">Add member</button>' });
  A['member-add-submit'] = function (form) {
    const d = readForm(form); if (!d) return;
    LF.S.team.push({ id: LF.uid('u'), name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim() || LF.S.settings.company.phone, role: d.role, availability: d.availability, active: true, joined: fmt.inputDate(Date.now()) });
    LF.save(); ui.closeModal(true); LF.app.refresh(); ui.toast(d.name.trim() + ' added to the team');
  };
  A['member-edit'] = function (el) {
    const m = q.member(el.dataset.id);
    ui.modal({ title: 'Edit team member', subtitle: esc(m.name), size: 'md', body: '<form id="member-form" data-submit="member-edit-submit" data-id="' + m.id + '" novalidate>' + formHtml(m) + '</form>', footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="member-form">Save changes</button>' });
  };
  A['member-edit-submit'] = function (form) {
    const m = q.member(form.dataset.id), d = readForm(form, m.id); if (!d) return;
    Object.assign(m, { name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), role: d.role, availability: d.availability });
    LF.save(); ui.closeModal(true); LF.app.refresh(); ui.toast('Team member updated');
  };
  A['member-toggle'] = function (el) {
    const m = q.member(el.dataset.id);
    if (!m.active) { m.active = true; LF.save(); LF.app.refresh(); ui.toast(m.name + ' reactivated'); return; }
    if (LF.S.team.filter((x) => x.active).length <= 1) { ui.toast('At least one team member must stay active', 'error'); return; }
    const open = LF.S.leads.filter((l) => l.ownerId === m.id && q.isOpen(l)).length;
    ui.confirm({ title: 'Deactivate ' + esc(m.name) + '?', message: 'They will no longer receive new leads or notifications.' + (open ? ' They currently have <b>' + open + ' open lead' + (open > 1 ? 's' : '') + '</b>.' : ''),
      extra: open ? '<div class="field" style="margin-top:14px"><label for="m-re">Reassign open leads and follow-ups to</label><select id="m-re" name="reassign"><option value="auto">Distribute automatically</option>' + ui.opts(LF.S.team.filter((x) => x.active && x.id !== m.id).map((x) => ({ v: x.id, l: x.name })), '') + '<option value="keep">Keep with ' + esc(m.name.split(' ')[0]) + '</option></select></div>' : '',
      confirmLabel: 'Deactivate', danger: true,
      onConfirm: (vals) => {
        m.active = false; let moved = 0;
        if (open && vals.reassign !== 'keep') {
          LF.S.leads.filter((l) => l.ownerId === m.id && q.isOpen(l)).forEach((l) => {
            const to = vals.reassign === 'auto' ? (E.pickOwner() || q.manager()) : q.member(vals.reassign);
            E.assign(l, to); E.timeline(l, 'assigned', 'Reassigned from ' + m.name + ' to ' + to.name + ' (team change)', q.user().name);
            LF.S.tasks.filter((t) => t.leadId === l.id && t.status === 'Pending' && t.ownerId === m.id).forEach((t) => { t.ownerId = to.id; }); moved++;
          });
        }
        LF.save(); LF.app.refresh(); ui.toast(m.name + ' deactivated' + (moved ? ' · ' + moved + ' leads reassigned' : ''), 'info');
      } });
  };

  A['member-perf'] = function (el) {
    const m = q.member(el.dataset.id), s = q.memberStats(m.id), ls = LF.S.leads.filter((l) => l.ownerId === m.id);
    const stat = (l, v, sub) => '<div class="kpi"><div class="kl">' + l + '</div><div class="kv">' + v + '</div>' + (sub ? '<div class="ks">' + sub + '</div>' : '') + '</div>';
    ui.modal({ title: ui.avatar(m.name, 'sm') + ' ' + esc(m.name), subtitle: esc(m.role) + ' · all-time performance', size: 'xl',
      body: '<div class="grid g4" style="margin-bottom:16px">' + stat('Leads assigned', s.total, s.active + ' active') + stat('Conversion rate', fmt.pct(s.rate), s.converted + ' converted · ' + s.lost + ' lost') + stat('Avg response time', fmt.dur(s.avgResponse), 'team ' + fmt.dur(q.avgResponse(LF.S.leads))) + stat('Follow-up completion', fmt.pct(s.completion, 0), s.tasksOverdue + ' overdue') + '</div>' +
        '<div class="grid g2" style="margin-bottom:16px"><div class="card"><div class="card-h"><h3>Leads by status</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="perf-a"></canvas></div></div></div><div class="card"><div class="card-h"><h3>Leads received · last 8 weeks</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="perf-b"></canvas></div></div></div></div>' +
        '<div class="row between wrap" style="margin-bottom:8px"><h4>Open leads</h4><span class="muted sm">Pipeline ' + fmt.money(s.pipeline) + ' · Revenue won ' + fmt.money(s.revenue) + '</span></div>' +
        (ls.filter(q.isOpen).length ? '<div class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th>Lead</th><th>Status</th><th class="right">Value</th><th>Next follow-up</th></tr></thead><tbody>' + ls.filter(q.isOpen).sort((a, b) => b.value - a.value).slice(0, 6).map((l) => '<tr class="clickable" data-action="goto" data-href="#/leads/' + l.id + '"><td><b style="font-weight:600">' + esc(l.name) + '</b></td><td>' + ui.statusPill(l.status) + '</td><td class="right">' + fmt.money(l.value) + '</td><td>' + LF.nextFollowCell(l.id) + '</td></tr>').join('') + '</tbody></table></div></div>' : '<p class="muted">No open leads assigned.</p>'),
      footer: '<button class="btn" data-action="modal-close">Close</button><a class="btn primary" href="#/leads" data-action="team-leads" data-id="' + m.id + '">View their leads</a>',
      onMount() {
        LF.charts.mount('perf-a', { type: 'bar', data: { labels: LF.C.STATUSES, datasets: [{ data: LF.C.STATUSES.map((st) => ls.filter((l) => l.status === st).length), backgroundColor: LF.C.STATUSES.map((st) => LF.statusColor[st]), borderRadius: 6, maxBarThickness: 36 }] }, options: { plugins: { legend: { display: false }, tooltip: LF.charts.tooltip }, scales: LF.charts.gridOpts() } });
        const wk = 7 * DAY, base = LF.sod(Date.now()) - 7 * wk + DAY, labels = [], data = [];
        for (let i = 0; i < 8; i++) { const a = base + i * wk; labels.push(fmt.date(a)); data.push(ls.filter((l) => l.createdAt >= a && l.createdAt < a + wk).length); }
        LF.charts.mount('perf-b', { type: 'line', data: { labels, datasets: [{ data, borderColor: LF.colors.brand, backgroundColor: 'rgba(15,159,119,.12)', fill: true, tension: .35, borderWidth: 2, pointRadius: 3 }] }, options: { plugins: { legend: { display: false }, tooltip: LF.charts.tooltip }, scales: LF.charts.gridOpts() } });
      } });
  };
  A['team-leads'] = function (el) { LF.view.leads = Object.assign(LF.view.leads || {}, { q: '', status: '', source: '', owner: el.dataset.id, sort: 'newest', page: 1, size: 10 }); ui.closeModal(true); };
})();
