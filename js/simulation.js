/* LeadFlow – Live demo: "Simulate New Enquiry" end-to-end automation sequence */
(function () {
  const LF = window.LF, q = LF.q, fmt = LF.fmt, esc = LF.esc, icon = LF.icon, ui = LF.ui, A = LF.actions, E = LF.engine;
  let idx = 0, running = false, summaryHtml = '', summaryFooter = '', result = null;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function liveRule() { return LF.S.rules.find((r) => r.trigger.type === 'enquiry_received' && E.ruleLive(r)); }

  A['sim-open'] = function () {
    if (running) return;
    const sample = LF.SAMPLE_ENQUIRIES[idx % LF.SAMPLE_ENQUIRIES.length];
    const off = !liveRule();
    ui.modal({ title: 'New website enquiry', subtitle: 'This is the form your website visitors fill in.', size: 'md',
      body: (off ? '<div class="flag-banner" style="background:var(--amber-soft);border-color:#f3dfae;color:#7a5300">' + icon('alert') + '<div><b>The enquiry automation is switched off.</b> The lead will be saved but nobody will be notified, no email will be sent and nothing will be scheduled — exactly how enquiries get missed.</div></div>' : '') +
        '<div class="row wrap" style="margin-bottom:12px;gap:6px"><span class="muted sm">Prefill:</span>' + LF.SAMPLE_ENQUIRIES.map((s, i) => '<button type="button" class="btn sm" data-action="sim-sample" data-i="' + i + '">' + esc(s.name.split(' ')[0]) + '</button>').join('') + '</div>' +
        LF.enquiryFormHtml(sample, { submit: 'sim-submit' }),
      footer: '<button class="btn" data-action="modal-close">Cancel</button><button class="btn primary lg" type="submit" form="enq-form">' + icon('send', 'sm') + ' ' + esc(LF.S.settings.form.button) + '</button>' });
  };
  A['sim-sample'] = function (el) {
    const s = LF.SAMPLE_ENQUIRIES[Number(el.dataset.i)]; idx = Number(el.dataset.i);
    ['name', 'email', 'phone', 'service', 'message'].forEach((k) => { const f = document.getElementById('enq-' + k); if (f) f.value = s[k]; });
    document.querySelectorAll('#enq-form .field').forEach((f) => f.classList.remove('invalid'));
  };

  function stepRow(i, label, sub) {
    return '<div class="sim-step" id="ss-' + i + '"><div class="sn">' + (i + 1) + '</div><div><b>' + esc(label) + '</b><span id="ss-sub-' + i + '">' + esc(sub || 'Waiting…') + '</span></div></div>';
  }
  function setStep(i, state, sub) {
    const el = $('ss-' + i); if (!el) return;
    el.className = 'sim-step ' + state;
    el.querySelector('.sn').innerHTML = state === 'ok' ? icon('check', 'sm') : state === 'bad' ? icon('x', 'sm') : state === 'skip' ? '–' : state === 'run' ? '' : String(i + 1);
    if (sub != null) $('ss-sub-' + i).textContent = sub;
  }
  function log(html, cls) {
    const box = $('sim-log'); if (!box) return;
    const d = document.createElement('div'); d.innerHTML = '<span class="ts">' + fmt.clock(Date.now()) + '</span><span class="' + (cls || '') + '">' + html + '</span>';
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
  const progress = (done, total) => { const p = $('sim-progress'); if (p) p.style.width = Math.round((done / total) * 100) + '%'; };

  A['sim-submit'] = async function (form) {
    if (running) return;
    const data = LF.readEnquiry(form); if (!data) return;
    running = true; idx++;
    const enquiry = { name: data.name, email: data.email, phone: data.phone, service: data.service || 'Buying a home', message: data.message, source: 'Website enquiry', by: 'LeadFlow Automation' };
    const rule = liveRule();
    const labels = rule ? [{ label: 'New enquiry received', sub: 'Website form submission' }].concat(rule.actions.map((a) => ({ label: E.actionLabel(a), sub: E.ACTIONS[a.type].desc }))) : [{ label: 'New enquiry received', sub: 'Website form submission' }, { label: 'Lead record created', sub: 'Saved without automation' }];
    const total = labels.length, t0 = performance.now();
    ui.modal({ title: 'Processing enquiry…', subtitle: esc(data.name) + ' · ' + esc(enquiry.service), size: 'lg', noClose: true,
      body: '<div data-no-esc></div><div class="progress"><i id="sim-progress"></i></div><div class="sim-grid"><div class="sim-steps">' + labels.map((l, i) => stepRow(i, l.label, l.sub)).join('') + '</div><div class="sim-log" id="sim-log" aria-live="polite" aria-label="Live activity feed"></div></div>' });

    let ctx = { enquiry }, run = null, done = 0;
    log('Incoming POST ' + esc(LF.S.settings.company.website) + '/contact', 'y');
    setStep(0, 'run', 'Receiving form submission…'); await sleep(750);
    log('✔ Enquiry received from <b>' + esc(data.name) + '</b> &lt;' + esc(data.email) + '&gt;', 'g');
    setStep(0, 'ok', esc(data.name) + ' via website form'); progress(++done, total);

    if (rule) {
      const st = E.stepper(rule, ctx);
      for (let i = 0; i < rule.actions.length; i++) {
        setStep(i + 1, 'run', 'Working…'); await sleep(i === 0 ? 700 : 850);
        const s = st.next();
        setStep(i + 1, s.ok ? 'ok' : 'bad', s.detail);
        log((s.ok ? '✔ ' : '✖ ') + esc(s.label) + ' — ' + esc(s.detail), s.ok ? 'g' : 'r'); progress(++done, total);
      }
      run = st.finish();
      if (!ctx.lead) { log('✖ No lead was created — rule is missing a “Create lead record” action', 'r'); }
    } else {
      setStep(1, 'run', 'Saving…'); await sleep(700);
      ctx.lead = E.newLead(enquiry); E.timeline(ctx.lead, 'automation', 'Automation off — lead saved without acknowledgement, assignment or follow-up'); LF.save();
      setStep(1, 'ok', ctx.lead.id + ' saved'); log('✔ Lead saved as ' + ctx.lead.id, 'g'); progress(++done, total);
      log('⚠ Automation disabled: no email, assignment or follow-up', 'y');
    }
    log('Done in ' + ((performance.now() - t0) / 1000).toFixed(1) + 's', 'y');
    await sleep(500);
    LF.save();
    result = { ctx, run, rule, secs: (performance.now() - t0) / 1000 };
    running = false;
    showSummary(data);
    LF.app.refresh(); LF.app.updateChrome();
    document.querySelectorAll('#kpis .kpi').forEach((k, i) => { if (i < 3) k.classList.add('shake'); });
  };

  function showSummary(data) {
    const { ctx, run, rule, secs } = result, l = ctx.lead, ok = !!(l && run && run.status === 'Success'), o = l && q.owner(l);
    const task = ctx.task, email = ctx.email, base = LF.S.settings.baselineResponseMins;
    const box = (t, inner) => '<div class="result-box"><small>' + t + '</small>' + inner + '</div>';
    const none = '<span class="muted">Not created — automation did not run this step</span>';
    summaryHtml =
      '<div class="result-banner ' + (ok ? '' : 'warn') + '"><div class="big">' + icon(ok ? 'check' : 'alert', 'lg') + '</div><div><b style="font-size:15px">' + (ok ? 'Enquiry fully processed in ' + secs.toFixed(1) + ' seconds' : l ? 'Enquiry saved — automation incomplete' : 'Enquiry not saved') + '</b><div class="sm" style="opacity:.85">' +
      (ok ? 'Manual handling typically takes about ' + fmt.dur(base) + ' to first response. LeadFlow acknowledged this lead instantly and booked the follow-up.' : 'Review the automation rule — some steps were skipped or failed, which is how enquiries slip through the cracks.') + '</div></div></div>' +
      '<div class="result-grid">' +
      box('Lead record', l ? '<div class="row">' + ui.avatar(l.name) + '<div><b>' + esc(l.name) + '</b><div class="muted sm">' + l.id + ' · ' + esc(l.source) + ' · ' + ui.statusPill(l.status) + '</div></div></div>' : none) +
      box('Assigned salesperson', o ? '<div class="row">' + ui.avatar(o.name) + '<div><b>' + esc(o.name) + '</b><div class="muted sm">' + esc(o.role) + ' · ' + esc(o.availability) + '</div></div></div>' : none) +
      box('Acknowledgement email', email ? '<b>' + esc(email.subject) + '</b><div class="muted sm">To ' + esc(email.to) + ' · ' + ui.badge('Delivered', 'green') + '</div>' : none) +
      box('Follow-up scheduled', task ? '<div class="row"><div class="type-ic">' + icon(LF.C.TASK_ICON[task.type], 'sm') + '</div><div><b>' + esc(task.type) + '</b><div class="muted sm">' + fmt.dayTime(task.due) + ' · ' + ui.priorityPill(task.priority) + '</div></div></div>' : none) +
      box('Salesperson notified', ctx.notified ? '<b>' + esc(ctx.notified.name) + '</b><div class="muted sm">Push + email notification sent</div>' : none) +
      box('Visitor sees', '<div class="muted sm" style="font-style:italic">“' + esc(LF.S.settings.form.success) + '”</div>') + '</div>' +
      '<p class="lbl" style="margin-bottom:8px">Updated across LeadFlow</p><div class="row wrap" style="gap:8px">' +
      (l ? '<a class="btn sm" href="#/leads/' + l.id + '" data-action="sim-goto" data-href="#/leads/' + l.id + '">' + icon('users', 'xs') + ' Lead in Leads</a>' : '') + '<a class="btn sm" href="#/dashboard" data-action="sim-goto" data-href="#/dashboard">' + icon('dashboard', 'xs') + ' Dashboard stats</a>' +
      (email ? '<button class="btn sm" data-action="sim-view-email">' + icon('mail', 'xs') + ' Generated email</button>' : '') + (task ? '<a class="btn sm" href="#/tasks" data-action="sim-goto" data-href="#/tasks?tab=' + (task.due < LF.sod(Date.now()) + LF.T.DAY ? 'today' : 'upcoming') + '">' + icon('tasks', 'xs') + ' Follow-up tasks</a>' : '') +
      (run ? '<a class="btn sm" href="#/automation" data-action="sim-goto" data-href="#/automation">' + icon('zap', 'xs') + ' Execution history</a>' : '') + '</div>';
    summaryFooter = '<button class="btn" data-action="modal-close">Close</button><button class="btn" data-action="sim-again">' + icon('refresh', 'sm') + ' Add another</button>' + (l ? '<button class="btn primary" data-action="sim-goto" data-href="#/leads/' + l.id + '">Open lead profile ' + icon('arrow-right', 'sm') + '</button>' : '');
    renderSummary();
  }
  function renderSummary() {
    const m = document.querySelector('#modal-root .modal'); if (!m) return;
    m.querySelector('.modal-h h3').textContent = 'Enquiry processed';
    m.querySelector('.modal-b').innerHTML = summaryHtml;
    let f = m.querySelector('.modal-f'); if (!f) { f = document.createElement('footer'); f.className = 'modal-f'; m.appendChild(f); }
    f.innerHTML = summaryFooter;
    if (!m.querySelector('.modal-h .btn')) m.querySelector('.modal-h').insertAdjacentHTML('beforeend', '<button class="btn icon ghost" data-action="modal-close" aria-label="Close">' + icon('x') + '</button>');
    m.querySelector('.modal-h p').textContent = result.ctx.lead ? result.ctx.lead.name + ' · ' + result.ctx.lead.id : '';
  }
  A['sim-view-email'] = function () {
    const l = result.ctx.lead, c = LF.S.comms.filter((x) => x.leadId === l.id && x.automated).sort((a, b) => b.t - a.t)[0], m = document.querySelector('#modal-root .modal'); if (!c || !m) return;
    m.querySelector('.modal-b').innerHTML = LF.emailFrame({ to: l.email, subject: c.subject, body: c.body, date: c.t });
    m.querySelector('.modal-f').innerHTML = '<button class="btn" data-action="sim-back">' + icon('arrow-left', 'sm') + ' Back to summary</button><button class="btn primary" data-action="sim-email-log">Open email activity</button>';
  };
  A['sim-email-log'] = function () { LF.view.tpl = Object.assign(LF.view.tpl || {}, { tab: 'log', page: 1, q: '', kind: '' }); ui.closeModal(true); location.hash = '#/templates'; LF.app.render(); };
  A['sim-back'] = renderSummary;
  A['sim-again'] = () => { ui.closeModal(true); A['sim-open'](); };
  A['sim-goto'] = function (el) { ui.closeModal(true); location.hash = el.dataset.href || el.getAttribute('href'); };
})();
