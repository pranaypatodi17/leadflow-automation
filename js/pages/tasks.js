/* LeadFlow – Follow-up task management (table + calendar views) */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions, E = LF.engine, { DAY, HOUR, MIN } = LF.T;
  LF.pages = LF.pages || {};
  LF.view = LF.view || {};
  LF.view.tasks = LF.view.tasks || { tab: 'today', mode: 'table', owner: '', type: '', priority: '', calMonth: Date.now(), calSel: null, limit: 25 };
  const V = () => LF.view.tasks;

  const inToday = (t) => { const s = LF.sod(Date.now()); return t.due >= s && t.due < s + DAY; };
  function pool() {
    const v = V();
    return LF.S.tasks.filter((t) => (!v.owner || t.ownerId === v.owner) && (!v.type || t.type === v.type) && (!v.priority || t.priority === v.priority) && q.lead(t.leadId));
  }
  function groups() {
    const p = pool();
    const pend = p.filter((t) => t.status === 'Pending');
    return {
      today: pend.filter(inToday).sort((a, b) => a.due - b.due),
      upcoming: pend.filter((t) => t.due >= LF.sod(Date.now()) + DAY).sort((a, b) => a.due - b.due),
      overdue: pend.filter((t) => t.due < Date.now()).sort((a, b) => a.due - b.due),
      completed: p.filter((t) => t.status === 'Completed').sort((a, b) => b.completedAt - a.completedAt),
    };
  }
  function statusBadge(t) {
    const s = q.taskState(t);
    return s === 'Overdue' ? ui.badge('Overdue', 'overdue') : s === 'Today' ? ui.badge('Due today', 'today') : s === 'Upcoming' ? ui.badge('Scheduled', 'upcoming') : s === 'Completed' ? ui.badge('Completed', 'done') : ui.badge('Cancelled');
  }

  function table(list) {
    const v = V();
    if (!list.length) {
      const msg = { today: ['No follow-ups due today', 'You are all caught up. Create a new follow-up or check upcoming tasks.'], upcoming: ['Nothing scheduled ahead', 'Schedule follow-ups to keep every lead moving.'], overdue: ['No overdue tasks', 'Great work — every follow-up is on time.'], completed: ['No completed tasks yet', 'Completed follow-ups will be listed here.'] }[v.tab];
      return ui.empty(v.tab === 'overdue' ? 'check-circle' : 'tasks', msg[0], msg[1], '<button class="btn primary" data-action="task-new">' + icon('plus', 'sm') + ' New follow-up</button>');
    }
    const shown = list.slice(0, v.tab === 'completed' ? v.limit : 500);
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th style="width:44px"></th><th>Lead</th><th class="hide-sm">Salesperson</th><th>Date & time</th><th>Type</th><th>Priority</th><th>Status</th><th class="right">Actions</th></tr></thead><tbody>' +
      shown.map((t) => {
        const l = q.lead(t.leadId), o = q.member(t.ownerId), done = t.status === 'Completed';
        return '<tr class="' + (t.highlighted && !done ? 'hl' : '') + '"><td>' + (done ? '<span class="type-ic green" style="width:26px;height:26px">' + icon('check', 'xs') + '</span>' : '<button class="btn icon sm" style="border-radius:50%" title="Mark complete" aria-label="Mark complete" data-action="task-complete" data-id="' + t.id + '">' + icon('check', 'xs') + '</button>') + '</td>' +
          '<td><a class="cell-user" href="#/leads/' + l.id + '">' + ui.avatar(l.name) + '<div><b>' + esc(l.name) + '</b><span>' + esc(t.note || l.property) + '</span></div></a></td><td class="hide-sm"><div class="row">' + (o ? ui.avatar(o.name, 'sm') + esc(o.name) : '—') + '</div></td>' +
          '<td class="nowrap">' + (done ? '<span class="muted xs">Done </span>' + fmt.dayTime(t.completedAt) : fmt.dayTime(t.due)) + '</td><td><span class="row" style="gap:7px">' + icon(LF.C.TASK_ICON[t.type], 'sm') + esc(t.type) + '</span></td>' +
          '<td>' + (done ? ui.priorityPill(t.priority) : '<select class="input" style="height:28px;width:98px;font-size:12.5px;padding:0 24px 0 8px" data-change="task-priority" data-id="' + t.id + '" aria-label="Priority">' + ui.opts(LF.C.PRIORITIES, t.priority) + '</select>') + '</td>' +
          '<td>' + statusBadge(t) + (t.highlighted && !done ? ' ' + ui.badge('Reminder sent', 'amber') : '') + '</td>' +
          '<td class="right nowrap">' + (done ? '' : '<button class="btn sm icon ghost" title="Reschedule" aria-label="Reschedule" data-action="task-reschedule" data-id="' + t.id + '">' + icon('calendar', 'sm') + '</button>') + '<a class="btn sm icon ghost" title="Open lead" aria-label="Open lead" href="#/leads/' + l.id + '">' + icon('arrow-right', 'sm') + '</a><button class="btn sm icon ghost" title="Details" aria-label="Task details" data-action="task-view" data-id="' + t.id + '">' + icon('more', 'sm') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>' + (v.tab === 'completed' && list.length > v.limit ? '<div class="center" style="padding:12px"><button class="btn sm" data-action="tasks-more">Show more (' + (list.length - v.limit) + ' remaining)</button></div>' : '');
  }

  function calendar() {
    const v = V(), m = new Date(v.calMonth), y = m.getFullYear(), mo = m.getMonth();
    const first = new Date(y, mo, 1), startOff = first.getDay(), gridStart = new Date(y, mo, 1 - startOff).getTime();
    const p = pool().filter((t) => t.status !== 'Cancelled'), today = LF.sod(Date.now());
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d0 = new Date(gridStart); d0.setDate(d0.getDate() + i); const s = LF.sod(d0.getTime()), e = s + DAY;
      if (i >= 35 && d0.getMonth() !== mo) break;
      const ts = p.filter((t) => { const x = t.status === 'Completed' ? t.due : t.due; return x >= s && x < e; }).sort((a, b) => a.due - b.due);
      cells += '<button class="day ' + (d0.getMonth() !== mo ? 'out ' : '') + (s === today ? 'today ' : '') + (v.calSel === s ? 'sel' : '') + '" data-action="cal-day" data-day="' + s + '" aria-label="' + d0.toDateString() + ', ' + ts.length + ' tasks"><span class="dn">' + d0.getDate() + '</span>' +
        ts.slice(0, 3).map((t) => '<span class="chip ' + t.priority + ' ' + (t.status === 'Completed' ? 'done' : q.taskState(t) === 'Overdue' ? 'overdue' : '') + '" data-action="task-view" data-id="' + t.id + '" title="' + esc(t.type + ' · ' + q.lead(t.leadId).name) + '"><span>' + fmt.time(t.due).replace(':00', '') + ' </span>' + esc(q.lead(t.leadId).name.split(' ')[0]) + '</span>').join('') + (ts.length > 3 ? '<span class="more-chip">+' + (ts.length - 3) + ' more</span>' : '') + '</button>';
    }
    let panel = '';
    if (v.calSel) {
      const ts = p.filter((t) => t.due >= v.calSel && t.due < v.calSel + DAY).sort((a, b) => a.due - b.due);
      panel = '<div style="border-top:1px solid var(--line)"><div class="row between" style="padding:12px 18px"><b>' + fmt.date(v.calSel) + ' · ' + ts.length + ' task' + (ts.length === 1 ? '' : 's') + '</b><button class="btn sm" data-action="task-new" data-day="' + v.calSel + '">' + icon('plus', 'xs') + ' Add follow-up</button></div>' +
        (ts.length ? ts.map((t) => { const l = q.lead(t.leadId); return '<div class="list-item clickable" data-action="task-view" data-id="' + t.id + '"><div class="type-ic">' + icon(LF.C.TASK_ICON[t.type], 'sm') + '</div><div class="li-t"><b>' + esc(l.name) + '</b><span>' + esc(t.type) + ' · ' + fmt.time(t.due) + ' · ' + esc((q.member(t.ownerId) || {}).name || '') + '</span></div>' + ui.priorityPill(t.priority) + statusBadge(t) + '</div>'; }).join('') : '<p class="muted sm" style="padding:0 18px 16px">Nothing scheduled for this day.</p>') + '</div>';
    }
    return '<div class="cal-head"><div class="row"><button class="btn icon sm" data-action="cal-nav" data-d="-1" aria-label="Previous month">' + icon('chevron-left', 'sm') + '</button><button class="btn icon sm" data-action="cal-nav" data-d="1" aria-label="Next month">' + icon('chevron-right', 'sm') + '</button><h3 style="min-width:140px">' + m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</h3></div><button class="btn sm" data-action="cal-nav" data-d="0">Today</button></div>' +
      '<div class="cal">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => '<div class="dow">' + d + '</div>').join('') + cells + '</div>' + panel;
  }

  function body() {
    const v = V(), g = groups();
    if (v.mode === 'calendar') return calendar();
    return table(g[v.tab]);
  }
  function rerender() { const el = document.getElementById('tasks-body'); if (el) el.innerHTML = body(); }

  LF.pages.tasks = {
    title: 'Follow-Up Tasks',
    render(r) {
      const v = V();
      if (r && r.params && ['today', 'upcoming', 'overdue', 'completed'].includes(r.params.tab)) { v.tab = r.params.tab; v.mode = 'table'; }
      const g = groups();
      const tab = (id, label, ic, cls) => '<button class="stat-tab ' + (v.tab === id && v.mode === 'table' ? 'on ' : '') + (cls || '') + '" data-action="tasks-tab" data-tab="' + id + '"><div class="l">' + icon(ic, 'sm') + label + '</div><div class="n">' + g[id].length + '</div></button>';
      return '<div class="page-h"><div><h1>Follow-Up Tasks</h1><p>Never miss a follow-up. Tasks are created automatically and reminders fire before they are due.</p></div><div class="acts"><div class="seg" role="group" aria-label="View"><button class="' + (v.mode === 'table' ? 'on' : '') + '" data-action="tasks-mode" data-mode="table">' + icon('list', 'sm') + ' Table</button><button class="' + (v.mode === 'calendar' ? 'on' : '') + '" data-action="tasks-mode" data-mode="calendar">' + icon('calendar', 'sm') + ' Calendar</button></div><button class="btn primary" data-action="task-new">' + icon('plus', 'sm') + ' New follow-up</button></div></div>' +
        '<div class="stat-tabs">' + tab('today', "Today's follow-ups", 'clock') + tab('upcoming', 'Upcoming', 'calendar') + tab('overdue', 'Overdue', 'alert', g.overdue.length ? 'red' : '') + tab('completed', 'Completed', 'check-circle') + '</div>' +
        '<section class="card"><div class="toolbar"><select id="tf-owner" data-change="tasks-filter" aria-label="Salesperson">' + ui.opts([{ v: '', l: 'All salespeople' }].concat(LF.S.team.map((m) => ({ v: m.id, l: m.name }))), v.owner) + '</select>' +
        '<select id="tf-type" data-change="tasks-filter" aria-label="Type">' + ui.opts([{ v: '', l: 'All types' }].concat(LF.C.TASK_TYPES), v.type) + '</select>' +
        '<select id="tf-priority" data-change="tasks-filter" aria-label="Priority">' + ui.opts([{ v: '', l: 'All priorities' }].concat(LF.C.PRIORITIES), v.priority) + '</select>' +
        '<span class="grow"></span><span class="muted sm">' + (v.mode === 'table' ? g[v.tab].length + ' task' + (g[v.tab].length === 1 ? '' : 's') : 'Showing all tasks by due date') + '</span></div><div id="tasks-body">' + body() + '</div></section>';
    },
  };

  A['tasks-tab'] = (el) => { V().tab = el.dataset.tab; V().mode = 'table'; V().limit = 25; history.replaceState(null, '', '#/tasks'); LF.app.refresh(); };
  A['tasks-mode'] = (el) => { V().mode = el.dataset.mode; history.replaceState(null, '', '#/tasks'); LF.app.refresh(); };
  A['tasks-more'] = () => { V().limit += 25; rerender(); };
  A['tasks-filter'] = () => { const v = V(); v.owner = document.getElementById('tf-owner').value; v.type = document.getElementById('tf-type').value; v.priority = document.getElementById('tf-priority').value; LF.app.refresh(); };
  A['cal-nav'] = (el) => { const d = Number(el.dataset.d), v = V(); if (d === 0) { v.calMonth = Date.now(); v.calSel = LF.sod(Date.now()); } else { const m = new Date(v.calMonth); v.calMonth = new Date(m.getFullYear(), m.getMonth() + d, 1).getTime(); } rerender(); };
  A['cal-day'] = (el, ev) => { if (ev.target.closest('.chip')) return; V().calSel = Number(el.dataset.day); rerender(); };

  A['task-complete'] = function (el) {
    const t = LF.S.tasks.find((x) => x.id === el.dataset.id), l = q.lead(t.leadId), was = l.status;
    E.completeTask(t); ui.closeModal(true); LF.app.refresh();
    ui.toast(t.type + ' with ' + l.name + ' completed' + (was === 'New' && l.status === 'Contacted' ? ' · lead moved to Contacted' : ''));
  };
  A['task-priority'] = function (el) { const t = LF.S.tasks.find((x) => x.id === el.dataset.id); t.priority = el.value; E.timeline(q.lead(t.leadId), 'task', t.type + ' priority set to ' + el.value, q.user().name); LF.save(); ui.toast('Priority changed to ' + el.value); };

  A['task-view'] = function (el) {
    const t = LF.S.tasks.find((x) => x.id === el.dataset.id); if (!t) return;
    const l = q.lead(t.leadId), o = q.member(t.ownerId), done = t.status === 'Completed';
    ui.modal({ title: t.type + ' · ' + esc(l.name), subtitle: statusBadge(t) + ' ' + ui.priorityPill(t.priority), size: 'sm',
      body: '<dl class="kv-list"><div><dt>Lead</dt><dd><a class="link" href="#/leads/' + l.id + '" data-action="modal-close">' + esc(l.name) + '</a></dd></div><div><dt>Salesperson</dt><dd>' + esc(o ? o.name : '—') + '</dd></div><div><dt>' + (done ? 'Completed' : 'Due') + '</dt><dd>' + fmt.dt(done ? t.completedAt : t.due) + '</dd></div><div><dt>Contact</dt><dd>' + esc(l.phone) + '</dd></div>' + (t.note ? '<div><dt>Note</dt><dd>' + esc(t.note) + '</dd></div>' : '') + '</dl>',
      footer: '<button class="btn danger-ghost" data-action="task-delete" data-id="' + t.id + '" style="margin-right:auto">' + icon('trash', 'sm') + ' Delete</button>' + (done ? '' : '<button class="btn" data-action="task-reschedule" data-id="' + t.id + '">Reschedule</button><button class="btn primary" data-action="task-complete" data-id="' + t.id + '">' + icon('check', 'sm') + ' Complete</button>') });
  };
  A['task-delete'] = function (el) {
    const t = LF.S.tasks.find((x) => x.id === el.dataset.id); LF.S.tasks = LF.S.tasks.filter((x) => x.id !== t.id);
    E.timeline(q.lead(t.leadId), 'task', t.type + ' follow-up removed', q.user().name); LF.save(); ui.closeModal(true); LF.app.refresh(); ui.toast('Follow-up deleted', 'info');
  };

  A['task-reschedule'] = function (el) {
    const t = LF.S.tasks.find((x) => x.id === el.dataset.id), l = q.lead(t.leadId), base = Math.max(t.due, Date.now());
    ui.modal({ title: 'Reschedule follow-up', subtitle: esc(t.type) + ' · ' + esc(l.name), size: 'sm',
      body: '<form id="resched-form" data-submit="task-reschedule-submit" data-id="' + t.id + '"><div class="form-row"><div class="field"><label for="r-date">Date</label><input id="r-date" name="date" type="date" value="' + fmt.inputDate(base) + '" required></div><div class="field"><label for="r-time">Time</label><input id="r-time" name="time" type="time" value="' + fmt.inputTime(base) + '" required></div></div>' +
        '<div class="row wrap" style="gap:6px"><span class="muted sm">Quick:</span><button type="button" class="btn sm" data-action="resched-quick" data-h="1">+1 hour</button><button type="button" class="btn sm" data-action="resched-quick" data-h="tomorrow">Tomorrow 9am</button><button type="button" class="btn sm" data-action="resched-quick" data-h="72">In 3 days</button></div></form>',
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="resched-form">Reschedule</button>' });
  };
  A['resched-quick'] = function (el) {
    let t; if (el.dataset.h === 'tomorrow') { const d = new Date(Date.now() + DAY); d.setHours(9, 0, 0, 0); t = d.getTime(); } else t = Date.now() + Number(el.dataset.h) * HOUR;
    document.getElementById('r-date').value = fmt.inputDate(t); document.getElementById('r-time').value = fmt.inputTime(t);
  };
  A['task-reschedule-submit'] = function (form) {
    const t = LF.S.tasks.find((x) => x.id === form.dataset.id), due = fmt.parseInput(form.date.value, form.time.value);
    if (isNaN(due)) { ui.toast('Choose a valid date and time', 'error'); return; }
    E.reschedule(t, due); ui.closeModal(true); LF.app.refresh(); ui.toast('Rescheduled to ' + fmt.dayTime(due));
  };

  A['task-new'] = function (el) {
    const lead = el && el.dataset && el.dataset.lead, day = el && el.dataset && el.dataset.day;
    const leads = LF.S.leads.filter((l) => q.isOpen(l) || l.id === lead).sort((a, b) => a.name.localeCompare(b.name));
    let when = Date.now() + HOUR; if (day) { const d = new Date(Number(day)); d.setHours(10, 0, 0, 0); when = d.getTime(); }
    const rounded = Math.ceil(when / (15 * MIN)) * 15 * MIN;
    ui.modal({ title: 'New follow-up', subtitle: 'Schedule a task for a lead', size: 'md',
      body: '<form id="task-form" data-submit="task-new-submit" novalidate><div class="field"><label for="n-lead">Lead <span class="req">*</span></label><select id="n-lead" name="leadId" data-change="task-new-lead">' + ui.opts([{ v: '', l: 'Select a lead…' }].concat(leads.map((l) => ({ v: l.id, l: l.name + ' · ' + l.status }))), lead || '') + '</select><span class="err">Choose a lead</span></div>' +
        '<div class="form-row"><div class="field"><label for="n-type">Type</label><select id="n-type" name="type">' + ui.opts(LF.C.TASK_TYPES, 'Follow-up call') + '</select></div><div class="field"><label for="n-pri">Priority</label><select id="n-pri" name="priority">' + ui.opts(LF.C.PRIORITIES, 'Medium') + '</select></div></div>' +
        '<div class="form-row three"><div class="field"><label for="n-owner">Salesperson</label><select id="n-owner" name="ownerId">' + ui.opts(LF.S.team.filter((m) => m.active).map((m) => ({ v: m.id, l: m.name })), lead && q.lead(lead).ownerId) + '</select></div><div class="field"><label for="n-date">Date</label><input id="n-date" name="date" type="date" value="' + fmt.inputDate(rounded) + '" required></div><div class="field"><label for="n-time">Time</label><input id="n-time" name="time" type="time" value="' + fmt.inputTime(rounded) + '" required></div></div>' +
        '<div class="field"><label for="n-note">Note</label><input id="n-note" name="note" type="text" placeholder="e.g. Confirm viewing time"></div></form>',
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="task-form">Create follow-up</button>' });
  };
  A['task-new-lead'] = function (el) { const l = q.lead(el.value); if (l && l.ownerId) document.getElementById('n-owner').value = l.ownerId; };
  A['task-new-submit'] = function (form) {
    const fld = form.leadId.closest('.field'); fld.classList.toggle('invalid', !form.leadId.value); if (!form.leadId.value) return;
    const due = fmt.parseInput(form.date.value, form.time.value); if (isNaN(due)) { ui.toast('Choose a valid date and time', 'error'); return; }
    const t = E.createTask({ leadId: form.leadId.value, ownerId: form.ownerId.value, type: form.type.value, priority: form.priority.value, due, note: form.note.value.trim() });
    ui.closeModal(true); if (V().mode === 'table') V().tab = t.due < Date.now() ? 'overdue' : t.due < LF.sod(Date.now()) + DAY ? 'today' : 'upcoming';
    if (location.hash.startsWith('#/tasks')) LF.app.refresh(); else LF.app.refresh();
    ui.toast('Follow-up scheduled for ' + fmt.dayTime(due));
  };
})();
