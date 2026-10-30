/* LeadFlow – Reports & analytics (all figures derive from the same lead/task data as the dashboard) */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions, { DAY, HOUR, MIN } = LF.T;
  LF.pages = LF.pages || {};

  function data() {
    const r = q.range(), cur = q.leadsInRange(r), prev = q.leadsPrevRange(r), now = Date.now();
    const tasks = LF.S.tasks.filter((t) => t.due >= r.start && t.due <= now && t.status !== 'Cancelled' && q.lead(t.leadId));
    const done = tasks.filter((t) => t.status === 'Completed'), late = done.filter((t) => t.completedAt > t.due + 30 * MIN), overdue = tasks.filter((t) => t.status === 'Pending');
    const stages = [['Leads received', () => true], ['Contacted', (l) => l.reached >= 1], ['Qualified', (l) => l.reached >= 2], ['Proposal sent', (l) => l.reached >= 3], ['Negotiation', (l) => l.reached >= 4], ['Converted', (l) => l.status === 'Converted']].map(([n, f]) => [n, cur.filter(f).length]);
    return { r, cur, prev, tasks, done, late, overdue, stages, lost: cur.filter((l) => l.status === 'Lost'), conv: cur.filter((l) => l.status === 'Converted') };
  }
  const kpi = (ic, l, v, sub) => '<div class="kpi"><div class="kl">' + icon(ic) + l + '</div><div class="kv">' + v + '</div><div class="ks">' + (sub || '') + '</div></div>';

  function funnel(d) {
    const top = d.stages[0][1] || 1;
    return d.stages.map((s, i) => {
      const w = Math.max(8, (s[1] / top) * 100), prev = i ? d.stages[i - 1][1] : null;
      return '<div style="margin-bottom:10px"><div class="row between sm wrap" style="margin-bottom:4px;gap:2px 10px"><b style="font-weight:600">' + s[0] + '</b><span><b style="font-weight:600">' + s[1] + '</b> <span class="muted">· ' + Math.round((s[1] / top) * 100) + '%' + (prev ? ' · ' + (prev ? Math.round((s[1] / prev) * 100) : 0) + '% of previous' : '') + '</span></span></div><div class="bar" style="height:22px;border-radius:6px;margin:0 auto;width:' + w + '%;background:none"><i style="width:100%;border-radius:6px;background:' + ['#3b6fe0', '#4f86d9', '#6a9cc9', '#4fb092', '#2aa882', '#0f9f77'][i] + '"></i></div></div>';
    }).join('');
  }
  function sourceRows(d) {
    return LF.C.SOURCES.map((s) => {
      const ls = d.cur.filter((l) => l.source === s), cv = ls.filter((l) => l.status === 'Converted');
      return { s, n: ls.length, cv: cv.length, rate: ls.length ? (cv.length / ls.length) * 100 : 0, rev: cv.reduce((a, l) => a + l.value, 0), avg: ls.length ? ls.reduce((a, l) => a + l.value, 0) / ls.length : 0, resp: q.avgResponse(ls) };
    });
  }
  function personRows(d) {
    return LF.S.team.filter((m) => m.active || d.cur.some((l) => l.ownerId === m.id)).map((m) => {
      const ls = d.cur.filter((l) => l.ownerId === m.id), cv = ls.filter((l) => l.status === 'Converted'), tk = d.tasks.filter((t) => t.ownerId === m.id), dn = tk.filter((t) => t.status === 'Completed').length;
      return { m, n: ls.length, open: ls.filter(q.isOpen).length, cv: cv.length, rate: ls.length ? (cv.length / ls.length) * 100 : 0, resp: q.avgResponse(ls), comp: tk.length ? (dn / tk.length) * 100 : 100, rev: cv.reduce((a, l) => a + l.value, 0) };
    });
  }

  LF.pages.reports = {
    title: 'Reports & Analytics',
    render() {
      const d = data(), { r } = d, rate = q.rate(d.cur), prevRate = q.rate(d.prev), resp = q.avgResponse(d.cur);
      const compRate = d.done.length + d.overdue.length ? (d.done.length / (d.done.length + d.overdue.length)) * 100 : 100;
      const src = sourceRows(d), ppl = personRows(d);
      const lostVal = d.lost.reduce((a, l) => a + l.value, 0), won = d.conv.reduce((a, l) => a + l.value, 0);
      return '<div class="page-h"><div><h1>Reports & Analytics</h1><p>' + r.label + ' · ' + fmt.date(r.start) + ' – ' + fmt.date(r.end) + ' · use the date selector in the top bar to change the period</p></div><div class="acts"><button class="btn" data-action="report-export">' + icon('download', 'sm') + ' Export report CSV</button></div></div>' +
        '<div class="kpis">' + kpi('users', 'Leads received', d.cur.length, d.prev.length ? 'vs ' + d.prev.length + ' previous period' : '') + kpi('target', 'Conversion rate', fmt.pct(rate), d.conv.length + ' converted' + (d.prev.length ? ' · prev ' + fmt.pct(prevRate) : '')) +
        kpi('clock', 'Avg response time', fmt.dur(resp), 'baseline ' + fmt.dur(LF.S.settings.baselineResponseMins)) + kpi('check-circle', 'Follow-up completion', fmt.pct(compRate, 0), d.done.length + ' done · ' + d.overdue.length + ' overdue') +
        kpi('x-circle', 'Lost leads', d.lost.length, fmt.moneyK(lostVal) + ' potential value') + kpi('dollar', 'Revenue won', fmt.moneyK(won), d.conv.length + ' deals closed') + '</div>' +
        '<div class="grid g2"><section class="card"><header class="card-h"><div><h3>Leads received over time</h3><p class="muted sm">New leads per ' + (r.days > 30 ? 'week' : 'day') + '</p></div></header><div class="card-b"><div class="chart-box"><canvas id="rp-time"></canvas></div></div></section>' +
        ui.card('Lead conversion funnel', funnel(d), { sub: 'Furthest stage reached by leads received in this period' }) + '</div>' +
        '<div class="grid g-main mt"><section class="card"><header class="card-h"><div><h3>Lead source performance</h3><p class="muted sm">Which channels produce customers, not just enquiries</p></div></header><div class="card-b flush"><div class="table-wrap"><table class="tbl"><thead><tr><th>Source</th><th class="right">Leads</th><th class="right">Converted</th><th class="right">Conv. rate</th><th class="right hide-sm">Avg value</th><th class="right">Revenue</th></tr></thead><tbody>' +
        src.map((x) => '<tr><td>' + ui.sourceDot(x.s) + '</td><td class="right">' + x.n + '</td><td class="right">' + x.cv + '</td><td class="right"><b style="font-weight:600">' + fmt.pct(x.rate) + '</b></td><td class="right hide-sm">' + fmt.moneyK(x.avg) + '</td><td class="right">' + fmt.moneyK(x.rev) + '</td></tr>').join('') + '</tbody></table></div></div></section>' +
        ui.card('Conversion rate by source', '<div class="chart-box sm"><canvas id="rp-src"></canvas></div>') + '</div>' +
        '<div class="grid g2 mt"><section class="card"><header class="card-h"><div><h3>Salesperson performance</h3><p class="muted sm">Leads assigned vs converted</p></div></header><div class="card-b"><div class="chart-box"><canvas id="rp-ppl"></canvas></div></div></section>' +
        '<section class="card"><header class="card-h"><div><h3>Salesperson comparison</h3></div></header><div class="card-b flush"><div class="table-wrap"><table class="tbl"><thead><tr><th>Salesperson</th><th class="right">Leads</th><th class="right">Won</th><th class="right">Rate</th><th class="right">Response</th><th class="right">Follow-ups</th></tr></thead><tbody>' +
        ppl.map((x) => '<tr><td><div class="row">' + ui.avatar(x.m.name, 'sm') + esc(x.m.name) + '</div></td><td class="right">' + x.n + '</td><td class="right">' + x.cv + '</td><td class="right"><b style="font-weight:600">' + fmt.pct(x.rate, 0) + '</b></td><td class="right">' + fmt.dur(x.resp) + '</td><td class="right">' + fmt.pct(x.comp, 0) + '</td></tr>').join('') + '</tbody></table></div></div></section></div>' +
        '<div class="grid g2 mt"><section class="card"><header class="card-h"><div><h3>Average response time</h3><p class="muted sm">Minutes to first contact, by week received — dashed line is your pre-automation baseline</p></div></header><div class="card-b"><div class="chart-box sm"><canvas id="rp-resp"></canvas></div></div></section>' +
        '<section class="card"><header class="card-h"><div><h3>Follow-up completion</h3><p class="muted sm">Tasks due in this period</p></div></header><div class="card-b"><div class="row wrap" style="gap:16px"><div class="chart-box sm" style="width:180px;flex:none"><canvas id="rp-fu"></canvas></div><div class="grow" id="fu-legend" style="min-width:200px"></div></div></div></section></div>' +
        '<div class="grid g-main mt"><section class="card"><header class="card-h"><div><h3>Lost lead analysis</h3><p class="muted sm">' + d.lost.length + ' lead' + (d.lost.length === 1 ? '' : 's') + ' lost · ' + fmt.money(lostVal) + ' potential value</p></div></header><div class="card-b">' +
        (d.lost.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Lead</th><th>Source</th><th>Reason</th><th class="hide-sm">Reached</th><th class="right">Value</th></tr></thead><tbody>' + d.lost.sort((a, b) => b.lostAt - a.lostAt).map((l) => '<tr class="clickable" data-action="goto" data-href="#/leads/' + l.id + '"><td><b style="font-weight:600">' + esc(l.name) + '</b><div class="muted xs">' + esc(q.ownerName(l)) + '</div></td><td>' + ui.sourceDot(l.source) + '</td><td>' + esc(l.lostReason) + '</td><td class="hide-sm">' + LF.C.STATUSES[l.reached] + '</td><td class="right">' + fmt.moneyK(l.value) + '</td></tr>').join('') + '</tbody></table></div>' : ui.empty('check-circle', 'No lost leads', 'No leads were lost in this period.')) + '</div></section>' +
        ui.card('Why leads are lost', d.lost.length ? '<div class="chart-box"><canvas id="rp-lost"></canvas></div>' : ui.empty('chart', 'Nothing to analyse', 'Lost reasons will appear here.')) + '</div>';
    },
    mount() {
      const d = data(), { r } = d, T = LF.charts.tooltip;
      const weekly = r.days > 30, step = weekly ? 7 * DAY : DAY, n = Math.ceil((LF.sod(Date.now()) + DAY - r.start) / step), labels = [], vals = [];
      for (let i = 0; i < n; i++) { labels.push(fmt.date(r.start + i * step)); vals.push(0); }
      d.cur.forEach((l) => { const i = Math.floor((l.createdAt - r.start) / step); if (vals[i] != null) vals[i]++; });
      LF.charts.mount('rp-time', { type: 'bar', data: { labels, datasets: [{ label: 'Leads', data: vals, backgroundColor: LF.colors.blue, borderRadius: 4, maxBarThickness: 22 }] }, options: { plugins: { legend: { display: false }, tooltip: T }, scales: LF.charts.gridOpts() } });
      const src = sourceRows(d);
      LF.charts.mount('rp-src', { type: 'bar', data: { labels: src.map((x) => x.s), datasets: [{ data: src.map((x) => +x.rate.toFixed(1)), backgroundColor: src.map((x) => LF.sourceColor[x.s]), borderRadius: 6, maxBarThickness: 40 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: Object.assign({ callbacks: { label: (c) => c.parsed.x + '% converted' } }, T) }, scales: { x: { beginAtZero: true, grid: { color: '#eef1f6' }, border: { display: false }, ticks: { callback: (v) => v + '%' } }, y: { grid: { display: false }, border: { display: false } } } } });
      const ppl = personRows(d);
      LF.charts.mount('rp-ppl', { type: 'bar', data: { labels: ppl.map((x) => x.m.name.split(' ')[0]), datasets: [{ label: 'Leads assigned', data: ppl.map((x) => x.n), backgroundColor: '#cbd9f5', borderRadius: 5, maxBarThickness: 28 }, { label: 'Converted', data: ppl.map((x) => x.cv), backgroundColor: LF.colors.brand, borderRadius: 5, maxBarThickness: 28 }] }, options: { plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } }, tooltip: T }, scales: LF.charts.gridOpts() } });
      // response-time trend: weekly for last 8 weeks (all leads)
      const wk = 7 * DAY, base = LF.sod(Date.now()) - 7 * wk + DAY, rl = [], rv = [];
      for (let i = 0; i < 8; i++) { const a = base + i * wk, ls = LF.S.leads.filter((l) => l.createdAt >= a && l.createdAt < a + wk && l.responseMins != null); rl.push(fmt.date(a)); rv.push(ls.length ? Math.round(q.avgResponse(ls)) : null); }
      LF.charts.mount('rp-resp', { type: 'line', data: { labels: rl, datasets: [{ label: 'Avg response (min)', data: rv, borderColor: LF.colors.brand, backgroundColor: 'rgba(15,159,119,.1)', fill: true, tension: .3, borderWidth: 2.5, pointRadius: 3, spanGaps: true }, { label: 'Baseline before automation', data: rl.map(() => LF.S.settings.baselineResponseMins), borderColor: LF.colors.gray, borderDash: [5, 5], pointRadius: 0, borderWidth: 1.5 }] }, options: { plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } }, tooltip: T }, scales: LF.charts.gridOpts() } });
      const ontime = d.done.length - d.late.length, up = 0, fu = [ontime, d.late.length, d.overdue.length], fl = ['Completed on time', 'Completed late', 'Overdue'], fc = [LF.colors.brand, LF.colors.amber, LF.colors.red], tot = fu.reduce((a, b) => a + b, 0) || 1;
      LF.charts.mount('rp-fu', { type: 'doughnut', data: { labels: fl, datasets: [{ data: fu, backgroundColor: fc, borderWidth: 2, borderColor: '#fff' }] }, options: { cutout: '68%', plugins: { legend: { display: false }, tooltip: T } } });
      document.getElementById('fu-legend').innerHTML = fl.map((l, i) => '<div class="row between" style="padding:5px 0"><span class="src"><i style="background:' + fc[i] + '"></i>' + l + '</span><span><b style="font-weight:600">' + fu[i] + '</b> <span class="muted">· ' + Math.round((fu[i] / tot) * 100) + '%</span></span></div>').join('');
      if (d.lost.length) {
        const reasons = LF.C.LOST_REASONS.map((x) => [x, d.lost.filter((l) => l.lostReason === x).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
        LF.charts.mount('rp-lost', { type: 'bar', data: { labels: reasons.map((x) => x[0]), datasets: [{ data: reasons.map((x) => x[1]), backgroundColor: '#94a3b8', borderRadius: 6, maxBarThickness: 26 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: T }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef1f6' }, border: { display: false } }, y: { grid: { display: false }, border: { display: false } } } } });
      }
    },
  };

  A['report-export'] = function () {
    const d = data(), rows = [['LeadFlow report', LF.S.settings.company.name, d.r.label], [], ['Source', 'Leads', 'Converted', 'Conversion rate %', 'Revenue']];
    sourceRows(d).forEach((x) => rows.push([x.s, x.n, x.cv, x.rate.toFixed(1), x.rev]));
    rows.push([], ['Salesperson', 'Leads', 'Converted', 'Conversion rate %', 'Avg response (min)', 'Follow-up completion %']);
    personRows(d).forEach((x) => rows.push([x.m.name, x.n, x.cv, x.rate.toFixed(1), Math.round(x.resp), x.comp.toFixed(0)]));
    rows.push([], ['Funnel stage', 'Leads']); d.stages.forEach((s) => rows.push(s));
    ui.downloadCSV('leadflow-report-' + d.r.days + 'd.csv', rows); ui.toast('Report exported');
  };
})();
