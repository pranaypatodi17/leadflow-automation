/* LeadFlow – state, persistence (localStorage) and query helpers */
(function () {
  const LF = (window.LF = window.LF || {});
  const { DAY, HOUR, MIN } = LF.T;
  const KEY = 'leadflow-demo-v1';
  LF.S = null;

  let saveTimer = null;
  LF.save = function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(LF.saveNow, 120);
  };
  LF.saveNow = function () {
    try { localStorage.setItem(KEY, JSON.stringify(LF.S)); } catch (e) { /* storage unavailable: demo still works in-memory */ }
  };
  let idc = Date.now() % 1e6;
  LF.uid = (p) => (p || 'id') + (++idc).toString(36) + Math.floor(Math.random() * 1296).toString(36);

  /* shift every timestamp forward by whole days so the demo always looks "current" */
  const TS_KEYS = new Set(['createdAt', 'contactedAt', 'convertedAt', 'lostAt', 't', 'due', 'completedAt', 'updatedAt']);
  function shiftAll(node, ms) {
    if (Array.isArray(node)) { node.forEach((n) => shiftAll(n, ms)); return; }
    if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (TS_KEYS.has(k) && typeof v === 'number' && v > 1e12) node[k] = v + ms;
        else if (v && typeof v === 'object') shiftAll(v, ms);
      }
    }
  }

  LF.init = function () {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || s.v !== 1) { s = LF.seed(Date.now()); LF.S = s; LF.saveNow(); return; }
    const today = LF.sod(Date.now());
    const diff = Math.round((today - s.meta.anchor) / DAY);
    if (diff >= 1) {
      const ms = diff * DAY;
      ['leads', 'tasks', 'comms', 'activities', 'runs', 'notifications'].forEach((c) => shiftAll(s[c], ms));
      s.templates.forEach((t) => { if (t.updatedAt) t.updatedAt += ms; });
      s.meta.anchor = today;
    }
    LF.S = s; LF.saveNow();
  };
  LF.resetData = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    LF.S = LF.seed(Date.now()); LF.saveNow();
  };

  /* ---------- queries ---------- */
  const q = (LF.q = {});
  q.user = () => LF.S.team.find((m) => m.id === 'u1') || LF.S.team[0];
  q.lead = (id) => LF.S.leads.find((l) => l.id === id);
  q.member = (id) => LF.S.team.find((m) => m.id === id);
  q.owner = (lead) => (lead && lead.ownerId ? q.member(lead.ownerId) : null);
  q.ownerName = (lead) => { const o = q.owner(lead); return o ? o.name : 'Unassigned'; };
  q.manager = () => LF.S.team.find((m) => m.manager && m.active) || LF.S.team.find((m) => m.active) || LF.S.team[0];
  q.template = (id) => LF.S.templates.find((t) => t.id === id);
  q.rule = (id) => LF.S.rules.find((r) => r.id === id);
  q.isOpen = (l) => l.status !== 'Converted' && l.status !== 'Lost';
  q.openLeadsOf = (id) => LF.S.leads.filter((l) => l.ownerId === id && q.isOpen(l)).length;
  q.leadTasks = (id) => LF.S.tasks.filter((t) => t.leadId === id).sort((a, b) => a.due - b.due);
  q.leadComms = (id) => LF.S.comms.filter((c) => c.leadId === id).sort((a, b) => b.t - a.t);
  q.pendingTasks = () => LF.S.tasks.filter((t) => t.status === 'Pending');
  q.taskState = function (t) {
    if (t.status === 'Completed') return 'Completed';
    if (t.status === 'Cancelled') return 'Cancelled';
    const now = Date.now();
    if (t.due < now) return 'Overdue';
    const eod = LF.sod(now) + DAY;
    return t.due < eod ? 'Today' : 'Upcoming';
  };
  q.range = function () {
    const days = LF.S.ui.range, end = Date.now(), start = LF.sod(end) - (days - 1) * DAY;
    return { days, start, end, prevStart: start - days * DAY, label: 'Last ' + days + ' days' };
  };
  q.inRange = (t, r) => t >= r.start && t <= r.end;
  q.leadsInRange = (r) => { r = r || q.range(); return LF.S.leads.filter((l) => l.createdAt >= r.start && l.createdAt <= r.end); };
  q.leadsPrevRange = (r) => { r = r || q.range(); return LF.S.leads.filter((l) => l.createdAt >= r.prevStart && l.createdAt < r.start); };
  q.avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  q.avgResponse = (leads) => q.avg(leads.filter((l) => l.responseMins != null).map((l) => l.responseMins));
  q.rate = (leads) => (leads.length ? (leads.filter((l) => l.status === 'Converted').length / leads.length) * 100 : 0);
  q.memberStats = function (id) {
    const ls = LF.S.leads.filter((l) => l.ownerId === id);
    const conv = ls.filter((l) => l.status === 'Converted');
    const lost = ls.filter((l) => l.status === 'Lost');
    const open = ls.filter(q.isOpen);
    const tasks = LF.S.tasks.filter((t) => t.ownerId === id);
    const done = tasks.filter((t) => t.status === 'Completed').length;
    const overdue = tasks.filter((t) => q.taskState(t) === 'Overdue').length;
    return {
      total: ls.length, active: open.length, converted: conv.length, lost: lost.length, rate: ls.length ? (conv.length / ls.length) * 100 : 0,
      pipeline: open.reduce((a, l) => a + (l.value || 0), 0), revenue: conv.reduce((a, l) => a + (l.value || 0), 0), avgResponse: q.avgResponse(ls),
      tasksDone: done, tasksOverdue: overdue, completion: done + overdue ? (done / (done + overdue)) * 100 : 100,
    };
  };

  /* ---------- template rendering ---------- */
  LF.templateVars = function (ctx) {
    const co = LF.S ? LF.S.settings.company : LF.DEFAULT_SETTINGS().company;
    const lead = ctx.lead || { name: 'Alex Morgan', property: '3-bed family home, Cedar Park', interest: 'Buying a home' };
    const o = ctx.owner;
    let meeting = ctx.meetingTime;
    if (!meeting && LF.S && lead.id) {
      const m = LF.S.tasks.filter((t) => t.leadId === lead.id && t.type === 'Meeting' && t.status === 'Pending').sort((a, b) => a.due - b.due)[0];
      if (m) meeting = LF.fmt.dayTime(m.due);
    }
    return {
      lead_name: lead.name, first_name: String(lead.name).split(' ')[0], salesperson_name: o ? o.name : 'your Horizon Realty advisor',
      salesperson_phone: o ? o.phone : co.phone, company_name: co.name, company_phone: co.phone, company_website: co.website,
      property_interest: lead.property || lead.interest || 'your property search', meeting_time: meeting || '[date & time to be confirmed]',
    };
  };
  LF.renderString = function (str, vars) { return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); };
  LF.renderTemplateRaw = function (tpl, ctx) {
    const v = LF.templateVars(ctx);
    return { subject: LF.renderString(tpl.subject, v), body: LF.renderString(tpl.body, v) };
  };
})();
