/* LeadFlow – Dashboard */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, { DAY, HOUR, MIN } = LF.T;
  LF.pages = LF.pages || {};

  const ACT = {
    lead_received: ['user-plus', ''], email_sent: ['mail', 'green'], assigned: ['users', 'violet'], followup_scheduled: ['calendar', 'amber'],
    reminder: ['bell', 'amber'], escalation: ['alert', 'red'], converted: ['check-circle', 'green'], status: ['refresh', 'gray'],
  };
  LF.actIcon = (type) => { const a = ACT[type] || ['zap', 'gray']; return '<div class="type-ic ' + a[1] + '">' + icon(a[0], 'sm') + '</div>'; };

  LF.nextTask = (leadId) => LF.S.tasks.filter((t) => t.leadId === leadId && t.status === 'Pending').sort((a, b) => a.due - b.due)[0];
  LF.nextFollowCell = function (leadId) {
    const t = LF.nextTask(leadId); if (!t) return '<span class="faint">—</span>';
    const st = q.taskState(t);
    return '<span class="' + (st === 'Overdue' ? 'badge overdue' : '') + '">' + (st === 'Overdue' ? icon('clock', 'xs') + ' ' : '') + fmt.dayTime(t.due) + '</span>';
  };

  function delta(cur, prev, o) {
    o = o || {};
    if (!prev && !o.abs) return '<span class="delta flat">new</span>';
    const d = o.abs ? cur - prev : ((cur - prev) / prev) * 100;
    if (Math.abs(d) < 0.05) return '<span class="delta flat">no change</span>';
    const good = o.invert ? d < 0 : d > 0;
    return '<span class="delta ' + (good ? 'up' : 'down') + '">' + icon(d > 0 ? 'arrow-up' : 'arrow-down', 'xs') + (o.fmt ? o.fmt(Math.abs(d)) : Math.abs(d).toFixed(0) + '%') + '</span>';
  }

  LF.dashStats = function () {
    const r = q.range(), cur = q.leadsInRange(r), prev = q.leadsPrevRange(r), today0 = LF.sod(Date.now());
    const pend = q.pendingTasks(), od = pend.filter((t) => q.taskState(t) === 'Overdue');
    return {
      r, cur, prev, total: cur.length, newToday: LF.S.leads.filter((l) => l.createdAt >= today0).length, pending: pend.length,
      dueToday: pend.filter((t) => q.taskState(t) === 'Today').length, overdue: od.length, rate: q.rate(cur), prevRate: q.rate(prev),
      resp: q.avgResponse(cur), prevResp: q.avgResponse(prev), converted: cur.filter((l) => l.status === 'Converted').length,
    };
  };

  function kpis(s) {
    const k = (cls, ic, label, val, sub, href) => '<div class="kpi link ' + cls + '" data-action="goto" data-href="' + href + '" role="link" tabindex="0"><div class="kl">' + icon(ic) + label + '</div><div class="kv">' + val + '</div><div class="ks">' + sub + '</div></div>';
    return '<div class="kpis" id="kpis">' +
      k('', 'users', 'Total Leads', s.total, delta(s.total, s.prev.length) + ' <span>vs previous ' + s.r.days + ' days</span>', '#/leads') +
      k('', 'user-plus', 'New Leads Today', s.newToday, '<span>' + LF.S.leads.filter((l) => l.createdAt >= LF.sod(Date.now()) && l.ownerId).length + ' auto-assigned</span>', '#/leads') +
      k('', 'tasks', 'Pending Follow-Ups', s.pending, '<span>' + s.dueToday + ' due today</span>', '#/tasks') +
      k('', 'target', 'Conversion Rate', fmt.pct(s.rate), delta(s.rate, s.prevRate, { abs: true, fmt: (v) => v.toFixed(1) + ' pts' }) + ' <span>' + s.converted + ' converted</span>', '#/reports') +
      k(s.overdue ? 'warn' : '', 'alert', 'Overdue Follow-Ups', s.overdue, '<span>' + (s.overdue ? 'Needs attention' : 'All on track') + '</span>', '#/tasks?tab=overdue') +
      k('', 'clock', 'Avg Response Time', fmt.dur(s.resp), (s.prevResp ? delta(s.resp, s.prevResp, { invert: true, abs: true, fmt: (v) => fmt.dur(v) }) : '') + ' <span>baseline ' + fmt.dur(LF.S.settings.baselineResponseMins) + '</span>', '#/reports') +
      '</div>';
  }

  function recentLeads() {
    const rows = LF.S.leads.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Lead</th><th class="hide-md">Email</th><th class="hide-md">Phone</th><th>Source</th><th class="hide-sm">Assigned to</th><th>Status</th><th class="hide-sm">Received</th><th class="hide-sm">Next follow-up</th></tr></thead><tbody>' +
      rows.map((l) => {
        const o = q.owner(l);
        return '<tr class="clickable ' + (l.flagged ? 'flagged' : '') + '" data-action="goto" data-href="#/leads/' + l.id + '"><td><div class="cell-user">' + ui.avatar(l.name) + '<div><b>' + esc(l.name) + '</b><span>' + esc(l.property) + '</span></div></div></td>' +
          '<td class="hide-md">' + esc(l.email) + '</td><td class="hide-md nowrap">' + esc(l.phone) + '</td><td>' + ui.sourceDot(l.source) + '</td>' +
          '<td class="hide-sm">' + (o ? '<div class="row">' + ui.avatar(o.name, 'sm') + esc(o.name) + '</div>' : '<span class="faint">Unassigned</span>') + '</td><td>' + ui.statusPill(l.status) + '</td>' +
          '<td class="hide-sm nowrap">' + fmt.date(l.createdAt) + '<div class="muted xs">' + fmt.time(l.createdAt) + '</div></td><td class="hide-sm nowrap">' + LF.nextFollowCell(l.id) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function upcoming() {
    const now = Date.now();
    const rows = q.pendingTasks().filter((t) => t.due >= now).sort((a, b) => a.due - b.due).slice(0, 6);
    if (!rows.length) return ui.empty('calendar', 'No upcoming follow-ups', 'Scheduled follow-ups will appear here.');
    return rows.map((t) => {
      const l = q.lead(t.leadId), o = q.member(t.ownerId);
      return '<div class="list-item clickable" data-action="goto" data-href="#/leads/' + l.id + '"><div class="type-ic">' + icon(LF.C.TASK_ICON[t.type], 'sm') + '</div><div class="li-t"><b>' + esc(l.name) + '</b><span>' + esc(t.type) + ' · ' + esc(o ? o.name : '') + '</span></div><div class="right nowrap"><b style="font-weight:600">' + fmt.dayLabel(t.due) + '</b><div class="muted sm">' + fmt.time(t.due) + '</div></div></div>';
    }).join('');
  }
  function feed(newIds) {
    return '<div class="feed">' + LF.S.activities.slice(0, 9).map((a) => '<div class="feed-item ' + (newIds && newIds.has(a.id) ? 'new' : '') + '">' + LF.actIcon(a.type) + '<div><p>' + (a.leadId && q.lead(a.leadId) ? '<a class="link" href="#/leads/' + a.leadId + '" style="font-weight:550">' + esc(a.text) + '</a>' : esc(a.text)) + '</p><span>' + fmt.rel(a.t) + '</span></div></div>').join('') + '</div>';
  }
  function impact(s) {
    const runs = LF.S.runs.filter((r) => r.t >= s.r.start), steps = runs.reduce((a, r) => a + r.steps.filter((x) => x.ok).length, 0);
    const emails = LF.S.comms.filter((c) => c.automated && c.t >= s.r.start).length;
    const base = LF.S.settings.baselineResponseMins, now = s.resp;
    const hrs = (steps * 3) / 60;
    const stat = (v, l) => '<div><div style="font-size:20px;font-weight:650;letter-spacing:-.01em">' + v + '</div><div class="muted sm">' + l + '</div></div>';
    return '<div class="grid g2" style="gap:14px">' + stat(runs.length, 'automations run') + stat(emails, 'instant acknowledgements') + stat(fmt.dur(now), 'avg first response (was ' + fmt.dur(base) + ')') + stat('≈ ' + hrs.toFixed(0) + ' hrs', 'admin time saved*') + '</div>' +
      '<div class="bar mt"><i style="width:' + Math.min(100, Math.max(6, 100 - (now / base) * 100)).toFixed(0) + '%"></i></div><p class="muted xs" style="margin-top:6px">' + Math.round(100 - (now / base) * 100) + '% faster first response than before automation. *Estimated at 3 min of manual work per automated action.</p>';
  }

  LF.pages.dashboard = {
    title: 'Dashboard',
    render() {
      const u = q.user(), s = LF.dashStats(), h = new Date().getHours();
      const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
      return '<div class="page-h"><div><h1>' + hello + ', ' + esc(u.name.split(' ')[0]) + '</h1><p>' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + esc(LF.S.settings.company.workspace) + '</p></div>' +
        '<div class="acts"><a class="btn" href="#/leads">' + icon('users', 'sm') + ' View all leads</a></div></div>' +
        '<div class="hero"><div style="position:relative;z-index:1"><h2>Capture a new enquiry</h2><p>Log a website enquiry and LeadFlow creates the lead, sends an acknowledgement email, assigns a salesperson and schedules the first follow-up.</p>' +
        '<div class="hero-steps"><span>1 Lead received</span><span>2 Record created</span><span>3 Email sent</span><span>4 Salesperson assigned</span><span>5 Follow-up scheduled</span><span>6 Team notified</span></div></div>' +
        '<button class="btn lg" id="simulate-btn" data-action="sim-open">' + icon('play', 'sm') + ' New Enquiry</button></div>' +
        kpis(s) +
        '<div class="grid g-main"><div class="stack" style="gap:16px">' +
        ui.card('Lead overview', '<div class="chart-box"><canvas id="ch-overview" aria-label="Lead overview chart"></canvas></div>', { sub: 'New, contacted and converted leads · ' + s.r.label.toLowerCase() }) +
        ui.card('Recent leads', recentLeads(), { bodyCls: 'flush', actions: '<a class="btn sm" href="#/leads">View all</a>' }) +
        '</div><div class="stack" style="gap:16px">' +
        ui.card('Lead sources', '<div class="row" style="gap:16px;align-items:center"><div class="chart-box xs" style="width:130px;flex:none"><canvas id="ch-sources" aria-label="Lead sources chart"></canvas></div><div class="grow" id="src-legend"></div></div>', { sub: s.r.label }) +
        ui.card('Upcoming follow-ups', upcoming(), { bodyCls: 'flush', actions: '<a class="btn sm" href="#/tasks">All tasks</a>' }) +
        ui.card('Automation activity', '<div id="act-feed">' + feed() + '</div>', { bodyCls: 'flush', actions: '<a class="btn sm" href="#/automation">Rules</a>' }) +
        ui.card('Automation impact', impact(s), {}) +
        '</div></div>';
    },
    mount() {
      const s = LF.dashStats(), r = s.r;
      // chart buckets
      const weekly = r.days > 30, step = weekly ? 7 * DAY : DAY, n = Math.ceil((LF.sod(Date.now()) + DAY - r.start) / step);
      const labels = [], nw = [], ct = [], cv = [];
      for (let i = 0; i < n; i++) { const a = r.start + i * step; labels.push(weekly ? 'Wk of ' + fmt.date(a) : fmt.date(a)); nw.push(0); ct.push(0); cv.push(0); }
      const idx = (t) => Math.floor((t - r.start) / step);
      LF.S.leads.forEach((l) => {
        if (l.createdAt >= r.start && idx(l.createdAt) < n) nw[idx(l.createdAt)]++;
        if (l.contactedAt && l.contactedAt >= r.start && idx(l.contactedAt) < n) ct[idx(l.contactedAt)]++;
        if (l.convertedAt && l.convertedAt >= r.start && idx(l.convertedAt) < n) cv[idx(l.convertedAt)]++;
      });
      LF.charts.mount('ch-overview', {
        type: 'line', data: { labels, datasets: [
          { label: 'New leads', data: nw, borderColor: LF.colors.blue, backgroundColor: 'rgba(59,111,224,.10)', fill: true, tension: .35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
          { label: 'Contacted', data: ct, borderColor: LF.colors.violet, tension: .35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
          { label: 'Converted', data: cv, borderColor: LF.colors.brand, tension: .35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4 }] },
        options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } }, tooltip: LF.charts.tooltip }, scales: LF.charts.gridOpts() },
      });
      const counts = LF.C.SOURCES.map((sr) => s.cur.filter((l) => l.source === sr).length), tot = counts.reduce((a, b) => a + b, 0) || 1;
      LF.charts.mount('ch-sources', { type: 'doughnut', data: { labels: LF.C.SOURCES, datasets: [{ data: counts, backgroundColor: LF.C.SOURCES.map((x) => LF.sourceColor[x]), borderWidth: 2, borderColor: '#fff' }] }, options: { cutout: '66%', plugins: { legend: { display: false }, tooltip: LF.charts.tooltip } } });
      document.getElementById('src-legend').innerHTML = LF.C.SOURCES.map((sr, i) => '<div class="row between" style="padding:4px 0;font-size:13px;white-space:nowrap;gap:8px">' + ui.sourceDot(sr) + '<span><b style="font-weight:600">' + counts[i] + '</b> <span class="muted">· ' + Math.round((counts[i] / tot) * 100) + '%</span></span></div>').join('');
    },
  };
})();
