/* LeadFlow – Settings and the configurable website enquiry form */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions, E = LF.engine;
  LF.pages = LF.pages || {};
  LF.view = LF.view || {};
  LF.view.settings = LF.view.settings || { tab: 'company' };

  /* ---------- configurable enquiry form (also used by the live simulation) ---------- */
  LF.enquiryFormHtml = function (vals, o) {
    vals = vals || {}; o = o || {};
    const co = LF.S.settings.company, f = LF.S.settings.form, F = f.fields;
    const fld = (key, inner) => F[key].enabled ? '<div class="field"><label for="enq-' + key + '">' + esc(F[key].label) + (F[key].required ? ' <span class="req">*</span>' : '') + '</label>' + inner + '<span class="err"></span></div>' : '';
    return '<div class="card web-form" style="box-shadow:none"><div class="web-form-chrome"><div class="dots"><i></i><i></i><i></i></div><div class="url">' + esc(co.website) + '/contact</div></div><div class="web-form-body"><h2>' + esc(f.title) + '</h2><p class="muted" style="margin-bottom:16px">' + esc(f.subtitle) + '</p>' +
      '<form id="enq-form" data-submit="' + o.submit + '" novalidate>' +
      fld('name', '<input id="enq-name" name="name" type="text" value="' + esc(vals.name || '') + '" autocomplete="off">') +
      '<div class="' + (F.email.enabled && F.phone.enabled ? 'form-row' : '') + '">' + fld('email', '<input id="enq-email" name="email" type="email" value="' + esc(vals.email || '') + '">') + fld('phone', '<input id="enq-phone" name="phone" type="tel" value="' + esc(vals.phone || '') + '">') + '</div>' +
      fld('service', '<select id="enq-service" name="service"><option value="">Select a service…</option>' + ui.opts(LF.C.SERVICES, vals.service || '') + '</select>') +
      fld('message', '<textarea id="enq-message" name="message" rows="3" placeholder="Tell us about the property you are looking for…">' + esc(vals.message || '') + '</textarea>') +
      (o.extra || '') + '</form></div></div>';
  };
  LF.readEnquiry = function (form) {
    const F = LF.S.settings.form.fields, d = {}; let ok = true;
    form.querySelectorAll('.field').forEach((x) => { x.classList.remove('invalid'); });
    ['name', 'email', 'phone', 'service', 'message'].forEach((k) => {
      const el = form.elements[k]; d[k] = el ? el.value.trim() : '';
      if (!F[k].enabled) return;
      const fieldEl = el.closest('.field'), err = fieldEl.querySelector('.err'); let msg = '';
      if (F[k].required && !d[k]) msg = k === 'service' ? 'Please choose a service' : 'This field is required';
      else if (k === 'email' && d[k] && !/^\S+@\S+\.\S+$/.test(d[k])) msg = 'Enter a valid email address';
      else if (k === 'phone' && d[k] && d[k].replace(/\D/g, '').length < 7) msg = 'Enter a valid phone number';
      if (msg) { fieldEl.classList.add('invalid'); err.textContent = msg; ok = false; }
    });
    if (!ok) { const bad = form.querySelector('.field.invalid input, .field.invalid select, .field.invalid textarea'); if (bad) bad.focus(); }
    return ok ? d : null;
  };

  /* ---------- sections ---------- */
  const sw = (name, on, extra) => '<label class="switch"><input type="checkbox" name="' + name + '" ' + (on ? 'checked' : '') + ' ' + (extra || '') + '><span></span></label>';
  const row = (title, desc, ctl) => '<div class="setting-row"><div><b>' + title + '</b><div class="d">' + desc + '</div></div>' + ctl + '</div>';
  const saveBar = (id) => '<div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn primary" type="submit" form="' + id + '">' + icon('save', 'sm') + ' Save changes</button></div>';

  const TABS = [['company', 'Company profile', 'building'], ['form', 'Website enquiry form', 'globe'], ['assignment', 'Lead assignment', 'users'], ['notifications', 'Notifications', 'bell'], ['automation', 'Automation preferences', 'zap'], ['data', 'Data', 'refresh']];

  function company() {
    const c = LF.S.settings.company, tz = ['America/Chicago (CT)', 'America/New_York (ET)', 'America/Denver (MT)', 'America/Los_Angeles (PT)'];
    return ui.card('Company profile', '<form id="set-form-c" data-submit="set-company" novalidate><div class="form-row"><div class="field"><label for="c-name">Company name</label><input id="c-name" name="name" type="text" value="' + esc(c.name) + '" required></div><div class="field"><label for="c-ws">Workspace name</label><input id="c-ws" name="workspace" type="text" value="' + esc(c.workspace) + '"><span class="hint">Shown in the sidebar. Use “Company · Office” format.</span></div></div>' +
      '<div class="form-row"><div class="field"><label for="c-email">Business email</label><input id="c-email" name="email" type="email" value="' + esc(c.email) + '" required></div><div class="field"><label for="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" value="' + esc(c.phone) + '"></div></div>' +
      '<div class="form-row"><div class="field"><label for="c-web">Website</label><input id="c-web" name="website" type="text" value="' + esc(c.website) + '"></div><div class="field"><label for="c-tz">Time zone</label><select id="c-tz" name="timezone">' + ui.opts(tz, c.timezone) + '</select></div></div>' +
      '<div class="field"><label for="c-addr">Office address</label><input id="c-addr" name="address" type="text" value="' + esc(c.address) + '"></div>' + saveBar('set-form-c') + '</form>', { sub: 'Used in email templates, the sidebar and the enquiry form.' });
  }
  function formTab() {
    const f = LF.S.settings.form, F = f.fields, locked = (k) => k === 'name' || k === 'email';
    return ui.card('Website enquiry form', '<form id="set-form-f" data-submit="set-form" novalidate><div class="form-row"><div class="field"><label for="f-title">Form heading</label><input id="f-title" name="title" type="text" value="' + esc(f.title) + '"></div><div class="field"><label for="f-btn">Submit button label</label><input id="f-btn" name="button" type="text" value="' + esc(f.button) + '"></div></div>' +
      '<div class="field"><label for="f-sub">Intro text</label><input id="f-sub" name="subtitle" type="text" value="' + esc(f.subtitle) + '"></div>' +
      '<div class="field"><label for="f-succ">Success message</label><textarea id="f-succ" name="success" rows="2">' + esc(f.success) + '</textarea><span class="hint">Shown to the visitor after they submit the form.</span></div>' +
      '<label class="lbl">Form fields</label><div class="field-config" style="margin-top:8px"><span class="h">Field label</span><span class="h">Show</span><span class="h">Required</span>' +
      ['name', 'email', 'phone', 'service', 'message'].map((k) => '<input type="text" name="label_' + k + '" value="' + esc(F[k].label) + '" aria-label="Label for ' + k + '"><label class="switch" title="' + (locked(k) ? 'Always shown' : '') + '"><input type="checkbox" name="en_' + k + '" ' + (F[k].enabled ? 'checked' : '') + (locked(k) ? ' disabled' : '') + '><span></span></label><label class="switch" title="' + (locked(k) ? 'Always required' : '') + '"><input type="checkbox" name="rq_' + k + '" ' + (F[k].required ? 'checked' : '') + (locked(k) ? ' disabled' : '') + '><span></span></label>').join('') + '</div>' +
      '<div class="row between wrap" style="margin-top:20px"><button type="button" class="btn" data-action="form-preview">' + icon('eye', 'sm') + ' Preview enquiry form</button><button class="btn primary" type="submit">' + icon('save', 'sm') + ' Save changes</button></div></form>', { sub: 'Choose which fields appear on your website and which are mandatory.' });
  }
  function assignment() {
    const a = LF.S.settings.assignment, next = E.pickOwner();
    const elig = LF.S.team.filter((m) => m.active && (a.includeManager || !m.manager) && (!a.onlyAvailable || m.availability === 'Available'));
    return ui.card('Lead assignment', '<form id="set-form-a" data-submit="set-assign"><div class="field"><label for="a-method">Assignment method</label><select id="a-method" name="method">' + ui.opts([{ v: 'round_robin', l: 'Round robin — rotate through available salespeople' }, { v: 'least_loaded', l: 'Least active leads — balance workload' }], a.method) + '</select></div>' +
      row('Only assign to available salespeople', 'Skip anyone who is Busy, Away or On leave.', sw('onlyAvailable', a.onlyAvailable)) + row('Include sales manager in rotation', 'Let the manager receive new leads.', sw('includeManager', a.includeManager)) +
      '<div class="form-row" style="margin-top:14px"><div class="field"><label for="a-max">Max active leads per person</label><input id="a-max" name="maxActive" type="number" min="1" max="100" value="' + a.maxActive + '"></div><div class="field"><label for="a-fb">Fallback owner</label><select id="a-fb" name="fallbackId">' + ui.opts(LF.S.team.filter((m) => m.active).map((m) => ({ v: m.id, l: m.name })), a.fallbackId) + '</select><span class="hint">Receives leads when nobody is eligible.</span></div></div>' +
      '<div class="note" style="margin-top:4px"><b style="font-weight:600">Next lead goes to:</b> ' + (next ? esc(next.name) : 'Fallback owner (nobody eligible)') + '<br><span class="muted sm">Eligible now: ' + (elig.length ? elig.map((m) => esc(m.name)).join(', ') : 'none') + '</span></div>' + saveBar('set-form-a') + '</form>', { sub: 'Controls how the “Assign to available salesperson” action picks an owner.' });
  }
  function notifications() {
    const n = LF.S.settings.notifications;
    return ui.card('Notification preferences', '<form id="set-form-n" data-submit="set-notif">' +
      row('Email notifications', 'Email the salesperson when a lead is assigned.', sw('email', n.email)) + row('In-app notifications', 'Show alerts in the notification bell.', sw('inApp', n.inApp)) + row('Daily digest', 'Morning summary of new leads and tasks due.', sw('digest', n.digest)) +
      row('Overdue follow-up alerts', 'Alert when a follow-up passes its due time.', sw('overdue', n.overdue)) + row('Escalation alerts to manager', 'Notify the sales manager about uncontacted leads.', sw('escalation', n.escalation)) +
      '<div class="field" style="margin-top:14px;max-width:320px"><label for="n-lead">Reminder lead time</label><select id="n-lead" name="reminderLead">' + ui.opts([{ v: 15, l: '15 minutes before due' }, { v: 30, l: '30 minutes before due' }, { v: 60, l: '1 hour before due' }, { v: 120, l: '2 hours before due' }], n.reminderLead) + '</select><span class="hint">Updates the “Lead Follow-Up Reminder” rule.</span></div>' + saveBar('set-form-n') + '</form>', { sub: 'Choose how your team is kept informed.' });
  }
  function automationPrefs() {
    const a = LF.S.settings.automation;
    return ui.card('Automation preferences', '<form id="set-form-u" data-submit="set-auto">' +
      row('Pause all automation', 'Temporarily stop every rule. New enquiries will be saved but not acknowledged or assigned.', sw('paused', a.paused)) + row('Schedule follow-ups in business hours only', 'Outside these hours, first follow-ups move to the next opening time.', sw('businessHoursOnly', a.businessHoursOnly)) +
      '<div class="form-row three" style="margin-top:14px"><div class="field"><label for="u-start">Opens (hour)</label><input id="u-start" name="hoursStart" type="number" min="0" max="23" value="' + a.hoursStart + '"></div><div class="field"><label for="u-end">Closes (hour)</label><input id="u-end" name="hoursEnd" type="number" min="1" max="24" value="' + a.hoursEnd + '"></div><div class="field"><label for="u-delay">First follow-up after (min)</label><input id="u-delay" name="defaultDelay" type="number" min="5" max="1440" value="' + a.defaultDelay + '"></div></div>' +
      '<p class="muted sm">The first-follow-up delay updates the “Instant Enquiry Acknowledgement” rule and is the default for new rules.</p>' + saveBar('set-form-u') + '</form>');
  }
  function dataTab() {
    let size = 0; try { size = (localStorage.getItem('leadflow-demo-v1') || '').length; } catch (e) { /* ignore */ }
    return ui.card('Data', '<p class="muted" style="margin-bottom:14px">' + LF.S.leads.length + ' leads, ' + LF.S.tasks.length + ' tasks and ' + LF.S.runs.length + ' automation runs, stored in this browser (' + (size / 1024).toFixed(0) + ' KB).</p><div class="row wrap"><button class="btn" data-action="data-export">' + icon('download', 'sm') + ' Download data (JSON)</button><button class="btn danger-ghost" data-action="reset-demo">' + icon('refresh', 'sm') + ' Reset data</button></div>');
  }

  LF.pages.settings = {
    title: 'Settings',
    render() {
      const t = LF.view.settings.tab, body = { company, form: formTab, assignment, notifications, automation: automationPrefs, data: dataTab }[t]();
      return '<div class="page-h"><div><h1>Settings</h1><p>Configure ' + esc(LF.S.settings.company.name) + '’s workspace, enquiry form and automation behaviour.</p></div></div><div class="settings-layout"><nav class="settings-nav" aria-label="Settings sections">' +
        TABS.map((x) => '<button class="' + (x[0] === t ? 'on' : '') + '" data-action="set-tab" data-tab="' + x[0] + '">' + icon(x[2], 'sm') + x[1] + '</button>').join('') + '</nav><div>' + body + '</div></div>';
    },
  };
  A['set-tab'] = (el) => { LF.view.settings.tab = el.dataset.tab; LF.app.refresh(); };

  const saved = (msg) => { LF.save(); LF.app.updateChrome(); LF.app.refresh(); ui.toast(msg || 'Settings saved'); };
  A['set-company'] = function (form) {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.name.trim()) { ui.toast('Company name is required', 'error'); return; }
    if (!/^\S+@\S+\.\S+$/.test(d.email)) { ui.toast('Enter a valid business email', 'error'); return; }
    Object.assign(LF.S.settings.company, Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim()]))); saved('Company profile saved');
  };
  A['set-form'] = function (form) {
    const d = Object.fromEntries(new FormData(form).entries()), f = LF.S.settings.form;
    if (!d.title.trim() || !d.button.trim() || !d.success.trim()) { ui.toast('Heading, button label and success message cannot be empty', 'error'); return; }
    Object.assign(f, { title: d.title.trim(), subtitle: d.subtitle.trim(), button: d.button.trim(), success: d.success.trim() });
    ['name', 'email', 'phone', 'service', 'message'].forEach((k) => { f.fields[k].label = (d['label_' + k] || '').trim() || f.fields[k].label; if (k !== 'name' && k !== 'email') { f.fields[k].enabled = 'en_' + k in d; f.fields[k].required = f.fields[k].enabled && 'rq_' + k in d; } });
    saved('Enquiry form saved');
  };
  A['form-preview'] = function () {
    // preview uses unsaved-looking state from saved settings; save first if inputs changed
    const form = document.getElementById('set-form-f'); if (form) A['set-form-silent'](form);
    ui.modal({ title: 'Enquiry form preview', subtitle: 'This is how the form appears on your website. Submitting here does not create a lead.', size: 'md', body: LF.enquiryFormHtml({}, { submit: 'enq-preview-submit' }), footer: '<button class="btn" data-action="modal-close">Close preview</button><button class="btn primary" type="submit" form="enq-form">' + esc(LF.S.settings.form.button) + '</button>' });
  };
  A['set-form-silent'] = function (form) {
    const d = Object.fromEntries(new FormData(form).entries()), f = LF.S.settings.form;
    if (!d.title.trim() || !d.button.trim() || !d.success.trim()) return;
    Object.assign(f, { title: d.title.trim(), subtitle: d.subtitle.trim(), button: d.button.trim(), success: d.success.trim() });
    ['name', 'email', 'phone', 'service', 'message'].forEach((k) => { f.fields[k].label = (d['label_' + k] || '').trim() || f.fields[k].label; if (k !== 'name' && k !== 'email') { f.fields[k].enabled = 'en_' + k in d; f.fields[k].required = f.fields[k].enabled && 'rq_' + k in d; } });
    LF.save();
  };
  A['enq-preview-submit'] = function (form) {
    const d = LF.readEnquiry(form); if (!d) return;
    const m = document.querySelector('#modal-root .modal-b');
    m.innerHTML = '<div class="success-msg"><div class="big">' + icon('check', 'lg') + '</div><h3 style="margin-bottom:6px">Enquiry submitted</h3><p class="muted" style="max-width:420px;margin:0 auto">' + esc(LF.S.settings.form.success) + '</p></div>';
    document.querySelector('#modal-root .modal-f').innerHTML = '<button class="btn" data-action="modal-close">Close</button><button class="btn primary" data-action="sim-open">' + icon('play', 'sm') + ' Submit as real enquiry</button>';
  };
  A['set-assign'] = function (form) {
    const d = Object.fromEntries(new FormData(form).entries()), a = LF.S.settings.assignment;
    Object.assign(a, { method: d.method, onlyAvailable: 'onlyAvailable' in d, includeManager: 'includeManager' in d, maxActive: Math.max(1, Number(d.maxActive) || 15), fallbackId: d.fallbackId }); saved('Assignment settings saved');
  };
  A['set-notif'] = function (form) {
    const d = Object.fromEntries(new FormData(form).entries()), n = LF.S.settings.notifications;
    Object.assign(n, { email: 'email' in d, inApp: 'inApp' in d, digest: 'digest' in d, overdue: 'overdue' in d, escalation: 'escalation' in d, reminderLead: Number(d.reminderLead) });
    const r2 = LF.S.rules.find((r) => r.trigger.type === 'followup_due' && r.builtin); if (r2) r2.trigger.minutes = n.reminderLead; saved('Notification preferences saved');
  };
  A['set-auto'] = function (form) {
    const d = Object.fromEntries(new FormData(form).entries()), a = LF.S.settings.automation, s = Number(d.hoursStart), e = Number(d.hoursEnd);
    if (!(e > s)) { ui.toast('Closing hour must be after opening hour', 'error'); return; }
    Object.assign(a, { paused: 'paused' in d, businessHoursOnly: 'businessHoursOnly' in d, hoursStart: s, hoursEnd: e, defaultDelay: Math.max(5, Number(d.defaultDelay) || 30) });
    const r1 = LF.S.rules.find((r) => r.id === 'r1'); const act = r1 && r1.actions.find((x) => x.type === 'schedule_followup'); if (act) act.params.delay = a.defaultDelay;
    saved(a.paused ? 'Automation paused' : 'Automation preferences saved');
  };
  A['data-export'] = function () {
    const blob = new Blob([JSON.stringify(LF.S, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'leadflow-data.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200); ui.toast('Data downloaded');
  };
})();
