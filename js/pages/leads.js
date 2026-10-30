/* LeadFlow – Leads list, add/edit lead form, CSV export */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions;
  LF.pages = LF.pages || {};
  LF.view = LF.view || {};
  LF.view.leads = LF.view.leads || { q: '', status: '', source: '', owner: '', sort: 'newest', page: 1, size: 10 };
  const V = () => LF.view.leads;

  LF.leadsFiltered = function () {
    const v = V(), s = v.q.trim().toLowerCase();
    let ls = LF.S.leads.filter((l) =>
      (!s || [l.name, l.email, l.phone, l.property, l.id].join(' ').toLowerCase().includes(s)) &&
      (!v.status || l.status === v.status) && (!v.source || l.source === v.source) &&
      (!v.owner || (v.owner === 'none' ? !l.ownerId : l.ownerId === v.owner)));
    const sorts = { newest: (a, b) => b.createdAt - a.createdAt, oldest: (a, b) => a.createdAt - b.createdAt, value: (a, b) => b.value - a.value, name: (a, b) => a.name.localeCompare(b.name) };
    return ls.sort(sorts[v.sort] || sorts.newest);
  };

  function results() {
    const v = V(), all = LF.leadsFiltered(), pages = Math.max(1, Math.ceil(all.length / v.size));
    if (v.page > pages) v.page = pages;
    const rows = all.slice((v.page - 1) * v.size, v.page * v.size);
    if (!all.length) {
      const filtered = v.q || v.status || v.source || v.owner;
      return ui.empty('search', filtered ? 'No leads match your filters' : 'No leads yet', filtered ? 'Try a different search term or clear the filters.' : 'Add your first lead or capture a website enquiry.', filtered ? '<button class="btn" data-action="leads-clear">Clear filters</button>' : '<button class="btn primary" data-action="lead-add">Add New Lead</button>');
    }
    return '<div class="table-wrap"><table class="tbl"><thead><tr><th>Lead</th><th class="hide-md">Contact</th><th>Source</th><th class="hide-sm">Assigned to</th><th>Status</th><th class="hide-sm right">Value</th><th class="sortable" data-action="leads-sort-date">Received ' + (v.sort === 'newest' ? '↓' : v.sort === 'oldest' ? '↑' : '') + '</th><th class="hide-sm">Next follow-up</th></tr></thead><tbody>' +
      rows.map((l) => {
        const o = q.owner(l);
        return '<tr class="clickable ' + (l.flagged ? 'flagged' : '') + '" data-action="goto" data-href="#/leads/' + l.id + '"><td><div class="cell-user">' + ui.avatar(l.name) + '<div><b>' + esc(l.name) + (l.flagged ? ' <span class="badge red" title="Uncontacted for 24h+">Overdue</span>' : '') + '</b><span>' + esc(l.id) + ' · ' + esc(l.property) + '</span></div></div></td>' +
          '<td class="hide-md"><div>' + esc(l.email) + '</div><div class="muted sm">' + esc(l.phone) + '</div></td><td>' + ui.sourceDot(l.source) + '</td>' +
          '<td class="hide-sm">' + (o ? '<div class="row">' + ui.avatar(o.name, 'sm') + esc(o.name) + '</div>' : '<span class="faint">Unassigned</span>') + '</td><td>' + ui.statusPill(l.status) + '</td>' +
          '<td class="hide-sm right nowrap">' + fmt.money(l.value) + '</td><td class="nowrap">' + fmt.date(l.createdAt) + '<div class="muted xs">' + fmt.time(l.createdAt) + '</div></td><td class="hide-sm nowrap">' + LF.nextFollowCell(l.id) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="tbl-foot">' + ui.pager(all.length, v.page, v.size, 'leads-page') + '</div>';
  }
  function counts() {
    const all = LF.leadsFiltered(); const el = document.getElementById('leads-count');
    if (el) el.textContent = all.length + ' of ' + LF.S.leads.length + ' leads';
  }
  function rerender() { const el = document.getElementById('leads-results'); if (el) el.innerHTML = results(); counts(); }

  LF.pages.leads = {
    title: (r) => (r && r.id && q.lead(r.id) ? q.lead(r.id).name : 'Leads'),
    render(r) {
      if (r && r.id) return LF.leadDetail.render(r.id);
      const v = V();
      const sel = (id, label, opts, val) => '<select id="' + id + '" data-change="leads-filter" aria-label="' + label + '">' + ui.opts([{ v: '', l: label }].concat(opts), val) + '</select>';
      return '<div class="page-h"><div><h1>Leads</h1><p id="leads-count"></p></div><div class="acts"><button class="btn" data-action="leads-export">' + icon('download', 'sm') + ' Export CSV</button><button class="btn primary" data-action="lead-add">' + icon('plus', 'sm') + ' Add New Lead</button></div></div>' +
        '<section class="card"><div class="toolbar"><div class="search">' + icon('search', 'sm') + '<input id="lf-q" type="search" placeholder="Search name, email, phone or property" value="' + esc(v.q) + '" data-input="leads-filter" aria-label="Search leads"></div>' +
        sel('lf-status', 'All statuses', LF.C.STATUSES, v.status) + sel('lf-source', 'All sources', LF.C.SOURCES, v.source) +
        sel('lf-owner', 'All salespeople', LF.S.team.map((m) => ({ v: m.id, l: m.name })).concat([{ v: 'none', l: 'Unassigned' }]), v.owner) +
        '<select id="lf-sort" data-change="leads-filter" aria-label="Sort">' + ui.opts([{ v: 'newest', l: 'Date: newest first' }, { v: 'oldest', l: 'Date: oldest first' }, { v: 'value', l: 'Highest value' }, { v: 'name', l: 'Name A–Z' }], v.sort) + '</select>' +
        '<button class="btn ghost sm" data-action="leads-clear">Clear</button></div><div id="leads-results">' + results() + '</div></section>';
    },
    mount(r) { if (r && r.id) return LF.leadDetail.mount(r.id); counts(); },
  };

  A['leads-filter'] = function () {
    const v = V(); v.q = document.getElementById('lf-q').value; v.status = document.getElementById('lf-status').value; v.source = document.getElementById('lf-source').value;
    v.owner = document.getElementById('lf-owner').value; v.sort = document.getElementById('lf-sort').value; v.page = 1; rerender();
  };
  A['leads-clear'] = function () { LF.view.leads = { q: '', status: '', source: '', owner: '', sort: 'newest', page: 1, size: 10 }; LF.app.render(true); };
  A['leads-page'] = function (el) { V().page = Number(el.dataset.page); rerender(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  A['leads-sort-date'] = function () { V().sort = V().sort === 'newest' ? 'oldest' : 'newest'; document.getElementById('lf-sort').value = V().sort; rerender(); };
  A['leads-export'] = function () {
    const ls = LF.leadsFiltered();
    if (!ls.length) { ui.toast('Nothing to export — no leads match the current filters', 'error'); return; }
    const rows = [['Lead ID', 'Name', 'Email', 'Phone', 'Source', 'Status', 'Assigned to', 'Property interest', 'Expected value', 'Received', 'Contacted', 'Response (min)', 'Lost reason']]
      .concat(ls.map((l) => [l.id, l.name, l.email, l.phone, l.source, l.status, q.ownerName(l), l.property, l.value, new Date(l.createdAt).toISOString(), l.contactedAt ? new Date(l.contactedAt).toISOString() : '', l.responseMins == null ? '' : l.responseMins, l.lostReason || '']));
    ui.downloadCSV('horizon-realty-leads-' + fmt.inputDate(Date.now()) + '.csv', rows);
    ui.toast('Exported ' + ls.length + ' lead' + (ls.length > 1 ? 's' : '') + ' to CSV');
  };

  /* ---------- add / edit lead ---------- */
  function leadFormHtml(l) {
    l = l || {};
    const owners = [{ v: '', l: 'Auto-assign (' + (LF.S.settings.assignment.method === 'least_loaded' ? 'least active leads' : 'round robin') + ')' }].concat(LF.S.team.filter((m) => m.active).map((m) => ({ v: m.id, l: m.name + ' · ' + m.availability })));
    return '<div class="form-row"><div class="field"><label for="f-name">Full name <span class="req">*</span></label><input id="f-name" name="name" type="text" value="' + esc(l.name || '') + '" required autocomplete="off"><span class="err">Please enter a name</span></div>' +
      '<div class="field"><label for="f-email">Email <span class="req">*</span></label><input id="f-email" name="email" type="email" value="' + esc(l.email || '') + '" required><span class="err">Enter a valid email address</span></div></div>' +
      '<div class="form-row"><div class="field"><label for="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" value="' + esc(l.phone || '') + '" placeholder="(512) 555-0123"></div>' +
      '<div class="field"><label for="f-source">Lead source</label><select id="f-source" name="source">' + ui.opts(LF.C.SOURCES, l.source || 'Website enquiry') + '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="f-service">Service interested in</label><select id="f-service" name="service">' + ui.opts(LF.C.SERVICES, l.interest || 'Buying a home') + '</select></div>' +
      '<div class="field"><label for="f-value">Expected deal value ($)</label><input id="f-value" name="value" type="number" min="0" step="1000" value="' + (l.value != null ? l.value : '') + '" placeholder="Auto-estimate"></div></div>' +
      '<div class="field"><label for="f-prop">Property interest</label><input id="f-prop" name="property" type="text" value="' + esc(l.property || '') + '" placeholder="e.g. 3-bed home in Cedar Park"></div>' +
      (l.id ? '' : '<div class="field"><label for="f-owner">Assigned to</label><select id="f-owner" name="ownerId">' + ui.opts(owners, '') + '</select></div>' +
        '<label class="row" style="gap:10px;padding:10px 12px;background:var(--brand-soft);border-radius:10px;cursor:pointer"><input type="checkbox" name="automate" checked><span><b style="font-weight:600">Run enquiry automation</b><br><span class="muted sm">Sends the acknowledgement email, assigns a salesperson and schedules the first follow-up.</span></span></label>');
  }
  function validate(form) {
    let ok = true;
    form.querySelectorAll('.field').forEach((f) => f.classList.remove('invalid'));
    const name = form.name.value.trim(), email = form.email.value.trim();
    if (!name) { form.name.closest('.field').classList.add('invalid'); ok = false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { form.email.closest('.field').classList.add('invalid'); ok = false; }
    return ok;
  }
  A['lead-add'] = function () {
    ui.modal({ title: 'Add new lead', subtitle: 'Create a lead manually, e.g. from a phone call or walk-in', size: 'md',
      body: '<form id="lead-form" data-submit="lead-add-submit" novalidate>' + leadFormHtml() + '</form>',
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="lead-form">Create lead</button>' });
  };
  A['lead-add-submit'] = function (form) {
    if (!validate(form)) return;
    const d = Object.fromEntries(new FormData(form).entries());
    const res = LF.engine.addManualLead({ name: d.name, email: d.email, phone: d.phone, source: d.source, service: d.service, property: d.property || d.service, value: d.value, ownerId: d.ownerId || null }, !!d.automate);
    ui.closeModal(true);
    ui.toast(res.run ? 'Lead created and automation ran (' + res.run.steps.length + ' steps)' : 'Lead created');
    location.hash = '#/leads/' + res.lead.id;
  };
  A['lead-edit'] = function (el) {
    const l = q.lead(el.dataset.id);
    ui.modal({ title: 'Edit lead', subtitle: l.id, size: 'md', body: '<form id="lead-form" data-submit="lead-edit-submit" data-id="' + l.id + '" novalidate>' + leadFormHtml(l) + '</form>',
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" type="submit" form="lead-form">Save changes</button>' });
  };
  A['lead-edit-submit'] = function (form) {
    if (!validate(form)) return;
    const l = q.lead(form.dataset.id), d = Object.fromEntries(new FormData(form).entries());
    Object.assign(l, { name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), source: d.source, interest: d.service, property: d.property.trim() || d.service, value: d.value === '' ? l.value : Number(d.value) });
    LF.engine.timeline(l, 'edit', 'Lead details updated', q.user().name); LF.save(); ui.closeModal(true); LF.app.refresh(); ui.toast('Lead updated');
  };
})();
