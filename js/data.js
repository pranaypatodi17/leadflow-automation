/* LeadFlow – constants, default templates and the Horizon Realty demo data generator */
(function () {
  const LF = (window.LF = window.LF || {});
  const { DAY, HOUR, MIN } = LF.T;

  LF.C = {
    STATUSES: ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Converted', 'Lost'],
    SOURCES: ['Website enquiry', 'Facebook Ads', 'Google Ads', 'Instagram', 'Referral'],
    TASK_TYPES: ['Initial call', 'Follow-up call', 'Email', 'WhatsApp reminder', 'Meeting'],
    PRIORITIES: ['High', 'Medium', 'Low'],
    SERVICES: ['Buying a home', 'Selling my property', 'Renting a property', 'Property valuation', 'Investment advice', 'Commercial property'],
    LOST_REASONS: ['Price too high', 'Bought elsewhere', 'No response', 'Not ready to buy', 'Financing declined', 'Chose a competing agent'],
    AVAILABILITY: ['Available', 'Busy', 'Away', 'On leave'],
    ROLES: ['Sales Manager', 'Senior Sales Agent', 'Sales Agent', 'Junior Sales Agent'],
    TASK_ICON: { 'Initial call': 'phone', 'Follow-up call': 'phone', Email: 'mail', 'WhatsApp reminder': 'chat', Meeting: 'calendar' },
  };
  LF.C.RANK = { New: 0, Contacted: 1, Qualified: 2, 'Proposal Sent': 3, Negotiation: 4, Converted: 5, Lost: -1 };

  LF.VARIABLES = [
    { k: 'lead_name', d: 'Lead full name' }, { k: 'first_name', d: 'Lead first name' }, { k: 'salesperson_name', d: 'Assigned salesperson' },
    { k: 'salesperson_phone', d: 'Salesperson phone' }, { k: 'company_name', d: 'Company name' }, { k: 'company_phone', d: 'Company phone' },
    { k: 'company_website', d: 'Company website' }, { k: 'property_interest', d: 'Property interest' }, { k: 'meeting_time', d: 'Next meeting time' },
  ];

  LF.DEFAULT_TEMPLATES = [
    {
      id: 't1', name: 'New enquiry acknowledgement', desc: 'Sent instantly when a website enquiry arrives', icon: 'inbox',
      subject: 'Thanks for your enquiry, {{first_name}} — {{company_name}}',
      body: "Hi {{first_name}},\n\nThank you for getting in touch with {{company_name}}. We've received your enquiry about {{property_interest}} and one of our property advisors will call you within 30 minutes during business hours.\n\nIn the meantime, you can browse our latest listings at {{company_website}}.\n\nWarm regards,\nThe {{company_name}} Team\n{{company_phone}}",
    },
    {
      id: 't2', name: 'Follow-up after initial contact', desc: 'Recap sent after the first conversation', icon: 'phone',
      subject: 'Great speaking with you, {{first_name}}',
      body: "Hi {{first_name}},\n\nIt was a pleasure speaking with you today about {{property_interest}}. As discussed, I'll shortlist properties that match your criteria and send them over within 24 hours.\n\nIf anything changes in the meantime, just reply to this email or call me directly on {{salesperson_phone}}.\n\nBest regards,\n{{salesperson_name}}\n{{company_name}}",
    },
    {
      id: 't3', name: 'Meeting confirmation', desc: 'Confirms a viewing or consultation', icon: 'calendar',
      subject: 'Your appointment is confirmed — {{meeting_time}}',
      body: "Hi {{first_name}},\n\nThis is a confirmation of your appointment with {{salesperson_name}} on {{meeting_time}} regarding {{property_interest}}.\n\nPlease bring a photo ID, and let us know if you'd like to add anyone to the visit. If you need to reschedule, reply to this email or call {{salesperson_phone}}.\n\nSee you soon,\n{{salesperson_name}}\n{{company_name}}",
    },
    {
      id: 't4', name: 'Follow-up reminder', desc: 'Gentle nudge when a lead goes quiet', icon: 'clock',
      subject: 'Quick follow-up on {{property_interest}}',
      body: "Hi {{first_name}},\n\nI wanted to follow up on your recent enquiry about {{property_interest}}. Are you still looking, and is there anything I can help with — pricing, availability or arranging a viewing?\n\nA short call takes five minutes and I'm happy to work around your schedule.\n\nKind regards,\n{{salesperson_name}}\n{{company_name}} · {{salesperson_phone}}",
    },
    {
      id: 't5', name: 'Re-engagement email', desc: 'Win back leads that have gone cold', icon: 'refresh',
      subject: 'Still looking for {{property_interest}}, {{first_name}}?',
      body: "Hi {{first_name}},\n\nIt's been a little while since we last spoke about {{property_interest}}. The market has moved since then and we have several new listings that may suit you.\n\nWould you like me to send over a fresh shortlist? Just reply \"yes\" and I'll get it to you today.\n\nBest wishes,\n{{salesperson_name}}\n{{company_name}}",
    },
  ];

  LF.DEFAULT_SETTINGS = function () {
    return {
      company: { name: 'Horizon Realty', workspace: 'Horizon Realty · Austin Office', email: 'hello@horizonrealty.example', phone: '(512) 555-0100', website: 'www.horizonrealty.example', address: '210 Congress Ave, Suite 1400, Austin, TX 78701', timezone: 'America/Chicago (CT)', industry: 'Real estate' },
      form: {
        title: 'Enquire about a property', subtitle: "Tell us what you're looking for and an advisor will be in touch shortly.", button: 'Send enquiry',
        success: 'Thank you! Your enquiry has been received and one of our advisors will call you within 30 minutes.',
        fields: { name: { enabled: true, required: true, label: 'Full name' }, email: { enabled: true, required: true, label: 'Email address' }, phone: { enabled: true, required: true, label: 'Phone number' }, service: { enabled: true, required: true, label: 'Service interested in' }, message: { enabled: true, required: false, label: 'Message' } },
      },
      assignment: { method: 'round_robin', onlyAvailable: true, includeManager: false, maxActive: 15, fallbackId: 'u1' },
      notifications: { email: true, inApp: true, digest: true, overdue: true, escalation: true, reminderLead: 15 },
      automation: { paused: false, businessHoursOnly: false, hoursStart: 9, hoursEnd: 18, defaultDelay: 30 },
      baselineResponseMins: 192,
    };
  };

  /* ---------------- default automation rules ---------------- */
  LF.DEFAULT_RULES = function () {
    return [
      { id: 'r1', builtin: true, name: 'Instant Enquiry Acknowledgement', description: 'Acknowledge every new website enquiry within seconds, assign it to an available salesperson and book the first follow-up call.', enabled: true,
        trigger: { type: 'enquiry_received' },
        actions: [{ type: 'create_lead', params: {} }, { type: 'send_email', params: { templateId: 't1' } }, { type: 'assign_lead', params: {} }, { type: 'schedule_followup', params: { followType: 'Initial call', delay: 30, priority: 'High' } }, { type: 'notify_salesperson', params: {} }] },
      { id: 'r2', builtin: true, name: 'Lead Follow-Up Reminder', description: 'Remind salespeople before a scheduled follow-up is due so nothing slips through the cracks.', enabled: true,
        trigger: { type: 'followup_due', minutes: 15 },
        actions: [{ type: 'send_reminder', params: {} }, { type: 'highlight_followup', params: {} }, { type: 'update_timeline', params: { text: 'Follow-up reminder sent to the assigned salesperson' } }] },
      { id: 'r3', builtin: true, name: 'Uncontacted Lead Escalation', description: 'Escalate leads that nobody has contacted within 24 hours so the sales manager can step in.', enabled: true,
        trigger: { type: 'uncontacted', hours: 24 },
        actions: [{ type: 'flag_overdue', params: {} }, { type: 'notify_manager', params: {} }, { type: 'create_escalation_task', params: {} }] },
      { id: 'r4', builtin: true, name: 'Lead Conversion', description: 'When a lead converts, stop pending reminders, record the win and refresh dashboard statistics.', enabled: true,
        trigger: { type: 'status_changed', status: 'Converted' },
        actions: [{ type: 'stop_reminders', params: {} }, { type: 'record_conversion', params: {} }, { type: 'update_dashboard', params: {} }] },
    ];
  };

  /* ---------------- sample enquiries for the live demo ---------------- */
  LF.SAMPLE_ENQUIRIES = [
    { name: 'Jonathan Reyes', email: 'jonathan.reyes@gmail.com', phone: '(512) 555-0188', service: 'Buying a home', message: "Hi, we're relocating from Denver in January and love the 4-bed listing in Cedar Park. Could someone call me about a viewing this weekend?" },
    { name: 'Meredith Caldwell', email: 'meredith.caldwell@outlook.com', phone: '(737) 555-0142', service: 'Selling my property', message: "I'd like a valuation for my townhouse in Round Rock and to understand how quickly it could sell." },
    { name: 'Tariq Hussain', email: 'tariq.hussain@icloud.com', phone: '(512) 555-0167', service: 'Investment advice', message: 'Looking for a duplex or small multi-family property in East Austin, budget around $650k. What is currently available?' },
    { name: 'Camila Duarte', email: 'camila.duarte@gmail.com', phone: '(512) 555-0121', service: 'Renting a property', message: 'Two-bedroom apartment near downtown from December 1st, pet friendly please.' },
    { name: 'Gregory Whitfield', email: 'g.whitfield@proton.me', phone: '(737) 555-0109', service: 'Commercial property', message: 'We run a coffee roastery and need a small retail unit on South Congress. Can you share what is on the market?' },
  ];

  /* ---------------- seeded RNG ---------------- */
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  LF.seed = function (now) {
    const rnd = mulberry32(20261030);
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    const sod = LF.sod, fmt = LF.fmt;
    let seq = 0; const uid = (p) => p + (++seq).toString(36) + Math.floor(rnd() * 1e4).toString(36);

    const settings = LF.DEFAULT_SETTINGS();
    const team = [
      { id: 'u1', name: 'Sarah Mitchell', email: 'sarah.mitchell@horizonrealty.example', phone: '(512) 555-0111', role: 'Sales Manager', availability: 'Available', active: true, joined: '2021-03-08', manager: true },
      { id: 'u2', name: 'Daniel Okafor', email: 'daniel.okafor@horizonrealty.example', phone: '(512) 555-0112', role: 'Senior Sales Agent', availability: 'Available', active: true, joined: '2021-09-20' },
      { id: 'u3', name: 'Priya Nair', email: 'priya.nair@horizonrealty.example', phone: '(512) 555-0113', role: 'Sales Agent', availability: 'Available', active: true, joined: '2022-02-14' },
      { id: 'u4', name: 'Marcus Webb', email: 'marcus.webb@horizonrealty.example', phone: '(512) 555-0114', role: 'Sales Agent', availability: 'Busy', active: true, joined: '2022-11-01' },
      { id: 'u5', name: 'Elena Rossi', email: 'elena.rossi@horizonrealty.example', phone: '(512) 555-0115', role: 'Junior Sales Agent', availability: 'Away', active: true, joined: '2024-01-22' },
    ];
    const owners = ['u2', 'u3', 'u4', 'u5', 'u2', 'u3', 'u1', 'u4', 'u5', 'u3', 'u2'];

    const names = ['James Carter', 'Olivia Bennett', 'Rahul Mehta', 'Sophia Nguyen', 'Ethan Brooks', 'Amelia Foster', 'Carlos Ramirez', 'Hannah Kim', "Liam O'Connor", 'Isabella Rossi', 'Noah Patel', 'Grace Thompson', 'Mateo Alvarez', 'Chloe Anderson', 'Benjamin Hayes', 'Zoe Martinez', 'Samuel Adeyemi', 'Emily Watson', 'Lucas Fernandes', 'Ava Johansson', 'Daniel Cho', 'Mia Sullivan', 'Omar Haddad', 'Charlotte Reed', 'Ryan Gallagher', 'Natalie Brooks', 'Lily Tran', 'Jack Donovan', 'Sofia Petrova', 'Tyler Jenkins', 'Aisha Rahman', 'Nathan Lee', 'Victoria Clarke', 'Andre Williams', 'Megan Walsh', 'Priyanka Sharma', 'Owen Fitzgerald', 'Hailey Morgan', 'Diego Castillo', 'Rebecca Stone', 'Kevin Zhang', 'Laura Bianchi', 'Jordan Ellis', 'Fatima Khan', 'Peter Novak', 'Annabelle Price'];
    const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'gmail.com', 'proton.me', 'gmail.com', 'hotmail.com'];

    const props = [
      { p: '3-bed family home, Cedar Park', lo: 485, hi: 640, s: 'Buying a home' }, { p: '2-bed condo, Downtown Austin', lo: 360, hi: 520, s: 'Buying a home' },
      { p: '4-bed home with pool, Westlake', lo: 1100, hi: 1750, s: 'Buying a home' }, { p: 'Townhouse, Round Rock', lo: 340, hi: 450, s: 'Buying a home' },
      { p: 'Investment duplex, East Austin', lo: 520, hi: 780, s: 'Investment advice' }, { p: 'Acreage lot, Dripping Springs', lo: 290, hi: 600, s: 'Buying a home' },
      { p: 'Lakefront villa, Lake Travis', lo: 1400, hi: 1900, s: 'Buying a home' }, { p: 'First-home 2-bed, Pflugerville', lo: 310, hi: 400, s: 'Buying a home' },
      { p: 'Penthouse, Rainey Street', lo: 1200, hi: 1900, s: 'Buying a home' }, { p: 'Retail unit, South Congress', lo: 650, hi: 1100, s: 'Commercial property' },
      { p: '4-bed new build, Leander', lo: 520, hi: 700, s: 'Buying a home' }, { p: 'Rental portfolio (3 units), Georgetown', lo: 900, hi: 1400, s: 'Investment advice' },
      { p: 'Home valuation & listing, Hyde Park', lo: 480, hi: 820, s: 'Selling my property' }, { p: 'Listing a 3-bed in Mueller', lo: 560, hi: 760, s: 'Selling my property' },
    ];
    const messages = {
      'Buying a home': ['Hi, I saw the listing online and would love to arrange a viewing this weekend.', "We're pre-approved and looking to move within 60 days. Can someone call me?", 'Interested in this area for a growing family. What similar homes do you have?'],
      'Selling my property': ["I'd like a valuation and to understand how quickly I could sell.", 'Thinking of listing in spring. What would you recommend for pricing?'],
      'Investment advice': ['Looking for a cash-flowing property. What yields are you seeing locally?', "I'm interested in small multi-family deals under $800k."],
      'Commercial property': ['Need retail space with good foot traffic. What do you have available?'],
    };
    const noteBank = {
      Contacted: ['Spoke for 8 minutes. Pre-approved for a mortgage; wants to move within 3 months.', 'Prefers calls after 5pm. Has two children, school district matters.', 'Relocating for work, flexible on timing. Needs 3+ bedrooms.'],
      Qualified: ['Budget confirmed with lender. Shortlisted three properties, viewing booked.', 'Cash buyer, decision maker is the lead plus spouse. Wants to see properties together.', 'Needs to sell current home first. Timeline is 4–6 months.'],
      'Proposal Sent': ['Sent comparable listings and a draft offer range. Awaiting feedback.', 'Shared valuation report and marketing plan. Comparing with one other agent.'],
      Negotiation: ['Offer submitted at 3% under asking. Seller counter expected within 48 hours.', 'Negotiating closing costs and inspection period.'],
      Converted: ['Contract signed. Handover to closing coordinator completed.', 'Offer accepted. Referral bonus candidate — great experience so far.'],
    };

    const statuses = ['New', 'New', 'New', 'Contacted', 'New', 'New', 'Contacted', 'Contacted', 'Qualified', 'Converted', 'Qualified', 'Proposal Sent', 'Converted', 'Lost', 'Qualified', 'Negotiation', 'Converted', 'Proposal Sent', 'Qualified', 'Lost', 'Converted', 'Converted', 'Negotiation', 'Proposal Sent', 'Lost',
      'Converted', 'Lost', 'Negotiation', 'Converted', 'Lost', 'Qualified', 'Converted', 'Lost', 'Proposal Sent', 'Contacted', 'Lost', 'Converted', 'Proposal Sent', 'Negotiation', 'Lost', 'Qualified', 'Lost', 'Contacted', 'Proposal Sent', 'Lost', 'Converted'];
    const ages = [0, 0, 0, 0, 1, 1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 15, 16, 18, 19, 21, 23, 25, 27, 29, 30, 31, 33, 34, 36, 37, 38, 40, 41, 42, 44, 45, 47, 48, 50, 52, 53, 54, 56, 57, 59];
    const srcPools = {
      Converted: ['Referral', 'Referral', 'Referral', 'Referral', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Google Ads', 'Google Ads', 'Facebook Ads'],
      Lost: ['Facebook Ads', 'Facebook Ads', 'Facebook Ads', 'Facebook Ads', 'Instagram', 'Instagram', 'Instagram', 'Google Ads', 'Google Ads', 'Website enquiry'],
      Open: ['Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Website enquiry', 'Facebook Ads', 'Facebook Ads', 'Facebook Ads', 'Facebook Ads', 'Google Ads', 'Google Ads', 'Google Ads', 'Google Ads', 'Google Ads', 'Instagram', 'Instagram', 'Referral', 'Referral'],
    };
    Object.values(srcPools).forEach(shuffle);

    const leads = [], tasks = [], comms = [], activities = [], runs = [], notifications = [];
    const today0 = sod(now);
    const addAct = (t, type, text, leadId) => activities.push({ id: uid('a'), t, type, text, leadId });

    const mkLead = (i) => {
      const status = statuses[i];
      const age = ages[i];
      const name = names[i];
      const [fn, ln] = name.split(' ');
      const slugName = (fn + '.' + ln).toLowerCase().replace(/[^a-z.]/g, '');
      const pr = pick(props);
      const value = Math.round(ri(pr.lo, pr.hi) / 5) * 5000;
      let createdAt;
      if (age === 0) createdAt = Math.max(today0 + 2 * MIN, now - [18, 55, 130, 200][i] * MIN);
      else if (i === 4 || i === 5) createdAt = now - (i === 4 ? 26 : 31) * HOUR - ri(5, 40) * MIN;
      else createdAt = today0 - age * DAY + ri(8, 18) * HOUR + ri(0, 59) * MIN;
      const source = (status === 'Converted' ? srcPools.Converted : status === 'Lost' ? srcPools.Lost : srcPools.Open).pop();
      const ownerId = owners[i % owners.length];
      const open = !['Converted', 'Lost'].includes(status);
      const reached = status === 'Lost' ? pick([1, 1, 2, 2, 3, 3, 4]) : LF.C.RANK[status];
      const lead = {
        id: 'L-' + (1000 + (46 - i)), name, email: slugName + '@' + domains[(i * 3) % domains.length], phone: '(' + (i % 3 === 0 ? '737' : '512') + ') 555-01' + String(10 + i * 2).padStart(2, '0'),
        source, status, ownerId, interest: pr.s, property: pr.p, value, createdAt, contactedAt: null, convertedAt: null, lostAt: null, lostReason: null,
        responseMins: null, reached, flagged: false, message: pick(messages[pr.s] || messages['Buying a home']), notes: [], timeline: [],
      };
      const tl = (t, type, text, by) => lead.timeline.push({ id: uid('e'), t, type, text, by: by || 'LeadFlow Automation' });
      const owner = team.find((m) => m.id === ownerId);
      const first = fn;

      // automation chain at creation
      tl(createdAt, 'created', 'Lead received from ' + (source === 'Website enquiry' ? 'the website enquiry form' : source));
      const ackTpl = LF.DEFAULT_TEMPLATES[0];
      const bounced = i === 5;
      const mkComm = (c) => { comms.push(Object.assign({ id: uid('c'), leadId: lead.id, dir: 'out', status: 'Delivered', automated: false }, c)); };
      const ackR = LF.renderTemplateRaw(ackTpl, { lead, owner: null });
      mkComm({ channel: 'email', t: createdAt + 38000, subject: ackR.subject, body: ackR.body, templateId: 't1', by: 'system', automated: true, status: bounced ? 'Bounced' : (rnd() < 0.7 ? 'Opened' : 'Delivered') });
      tl(createdAt + 38000, bounced ? 'alert' : 'email', bounced ? 'Acknowledgement email bounced (mailbox does not exist)' : 'Acknowledgement email sent automatically');
      tl(createdAt + 46000, 'assigned', 'Assigned to ' + owner.name + ' (round robin)');
      const firstDue = createdAt + 30 * MIN;
      tl(createdAt + 52000, 'task', 'Initial call scheduled for ' + fmt.dayTime(firstDue));
      addAct(createdAt, 'lead_received', 'New lead received: ' + name + ' (' + source + ')', lead.id);
      addAct(createdAt + 38000, 'email_sent', 'Acknowledgement email sent to ' + name, lead.id);
      addAct(createdAt + 46000, 'assigned', name + ' assigned to ' + owner.name, lead.id);
      addAct(createdAt + 52000, 'followup_scheduled', 'Follow-up scheduled: Initial call at ' + fmt.time(firstDue), lead.id);
      runs.push({ id: uid('x'), ruleId: 'r1', t: createdAt, leadId: lead.id, status: bounced ? 'Warning' : 'Success', durationMs: ri(2800, 5200), steps: [
        { label: 'Lead record created', ok: true, detail: name + ' · ' + source }, { label: 'Acknowledgement email sent', ok: !bounced, detail: bounced ? 'Bounced: invalid mailbox' : 'Delivered to ' + lead.email },
        { label: 'Lead assigned', ok: true, detail: owner.name + ' (round robin)' }, { label: 'First follow-up scheduled', ok: true, detail: 'Initial call, ' + fmt.dayTime(firstDue) }, { label: 'Salesperson notified', ok: true, detail: owner.name + ' · push + email' }] });

      let lastT = createdAt + 52000;
      const mkTask = (o) => { const t = Object.assign({ id: uid('k'), leadId: lead.id, ownerId, status: 'Completed', priority: 'Medium', note: '', highlighted: false, reminded: false, createdAt: lastT }, o); tasks.push(t); return t; };

      // contact
      if (reached >= 1 && status !== 'New') {
        let resp = rnd() < 0.82 ? ri(5, 32) : rnd() < 0.8 ? ri(40, 95) : ri(120, 240);
        if (i === 32) resp = 25 * 60 + 40;
        if (age === 0) resp = Math.min(resp, Math.max(6, Math.floor((now - createdAt) / MIN) - 4));
        lead.responseMins = resp; lead.contactedAt = createdAt + resp * MIN;
        const callMins = ri(4, 14);
        tl(lead.contactedAt, 'call', 'Initial call completed — spoke with ' + first + ' (' + callMins + ' min)', owner.name);
        tl(lead.contactedAt + MIN, 'status', 'Status changed: New → Contacted', owner.name);
        mkComm({ channel: 'call', t: lead.contactedAt, subject: 'Outbound call · ' + callMins + ' min', body: 'Introduced the team, confirmed requirements for ' + pr.p + ' and agreed next steps.', by: owner.id });
        const r2 = LF.renderTemplateRaw(LF.DEFAULT_TEMPLATES[1], { lead, owner });
        mkComm({ channel: 'email', t: lead.contactedAt + 14 * MIN, subject: r2.subject, body: r2.body, templateId: 't2', by: owner.id, status: rnd() < 0.6 ? 'Opened' : 'Delivered' });
        tl(lead.contactedAt + 14 * MIN, 'email', 'Follow-up email sent: "' + r2.subject + '"', owner.name);
        mkTask({ type: 'Initial call', due: firstDue, priority: 'High', completedAt: lead.contactedAt, createdAt, reminded: rnd() < 0.5 });
        lastT = lead.contactedAt + 14 * MIN;
        if (resp > 24 * 60) {
          tl(createdAt + 24 * HOUR, 'escalation', 'Escalated to sales manager — uncontacted for 24 hours');
          runs.push({ id: uid('x'), ruleId: 'r3', t: createdAt + 24 * HOUR, leadId: lead.id, status: 'Success', durationMs: 1900, steps: [{ label: 'Lead flagged as overdue', ok: true, detail: '24h without contact' }, { label: 'Sales manager notified', ok: true, detail: 'Sarah Mitchell' }, { label: 'Escalation task created', ok: true, detail: 'Follow-up call, High priority' }] });
          addAct(createdAt + 24 * HOUR, 'escalation', name + ' escalated to Sarah Mitchell (24h uncontacted)', lead.id);
        }
        // progression
        const endT = Math.min(now - 3 * HOUR, (lead.contactedAt + Math.max(2 * DAY, (now - lead.contactedAt) * 0.92)));
        const steps = [];
        const stageNames = ['Qualified', 'Proposal Sent', 'Negotiation', 'Converted'];
        const upTo = status === 'Lost' ? reached : LF.C.RANK[status];
        let from = 'Contacted';
        for (let s = 2; s <= upTo; s++) steps.push(s === 5 ? 'Converted' : stageNames[s - 2]);
        // a Lost lead stops at reached stage; Converted passes through all stages
        const span = Math.max(HOUR * 6, endT - lead.contactedAt);
        steps.forEach((st, k) => {
          const t = lead.contactedAt + Math.round(span * ((k + 1) / (steps.length + (status === 'Lost' ? 1.4 : 0.2))));
          tl(t, 'status', 'Status changed: ' + from + ' → ' + st, owner.name);
          if (st === 'Qualified') {
            const mt = t + 2 * DAY; const r3 = LF.renderTemplateRaw(LF.DEFAULT_TEMPLATES[2], { lead, owner, meetingTime: fmt.dt(mt) });
            if (mt < now) {
              mkComm({ channel: 'email', t: t + 20 * MIN, subject: r3.subject, body: r3.body, templateId: 't3', by: owner.id });
              tl(t + 20 * MIN, 'email', 'Meeting confirmation sent for ' + fmt.dt(mt), owner.name);
              mkTask({ type: 'Meeting', due: mt, priority: 'Medium', completedAt: mt + 30 * MIN, createdAt: t, note: 'Property viewing' });
            }
          }
          if (st === 'Proposal Sent') {
            mkComm({ channel: 'email', t: t + 10 * MIN, subject: 'Proposal & comparable listings — ' + pr.p, body: 'Hi ' + first + ',\n\nAs promised, attached are the comparable listings and our recommended offer range for ' + pr.p + '. Happy to walk through them on a call.\n\n' + owner.name + '\nHorizon Realty', by: owner.id, status: 'Opened' });
            tl(t + 10 * MIN, 'email', 'Proposal email sent with comparable listings', owner.name);
            mkTask({ type: 'Follow-up call', due: t + DAY, priority: 'Medium', completedAt: t + DAY + ri(10, 200) * MIN, createdAt: t });
          }
          if (st === 'Negotiation') { mkTask({ type: 'Follow-up call', due: t + 20 * HOUR, priority: 'High', completedAt: t + 20 * HOUR + ri(0, 90) * MIN, createdAt: t }); tl(t + 30 * MIN, 'call', 'Offer discussion call with ' + first, owner.name); }
          if (st === 'Converted') { lead.convertedAt = t; tl(t + MIN, 'converted', 'Converted — deal value ' + fmt.money(value), owner.name); }
          if (st !== 'Qualified' && st !== 'Proposal Sent' && st !== 'Negotiation' && st !== 'Converted') { /* noop */ }
          from = st; lastT = Math.max(lastT, t);
        });
        if (status === 'Lost') {
          lead.lostAt = Math.min(now - 2 * HOUR, lastT + ri(1, 5) * DAY); lead.lostReason = (i === 13 || i === 32) ? 'No response' : pick(LF.C.LOST_REASONS);
          tl(lead.lostAt, 'lost', 'Marked as lost — ' + lead.lostReason, owner.name);
          lastT = lead.lostAt;
        }
        // notes
        const nb = noteBank[status] || noteBank.Contacted;
        lead.notes.push({ id: uid('n'), t: lead.contactedAt + 20 * MIN, by: owner.id, text: pick(noteBank.Contacted) });
        if (reached >= 2 && status !== 'Lost') lead.notes.push({ id: uid('n'), t: Math.min(now - HOUR, lastT), by: owner.id, text: pick(nb) });
        if (status === 'Lost') lead.notes.push({ id: uid('n'), t: lead.lostAt, by: owner.id, text: 'Closed as lost: ' + lead.lostReason.toLowerCase() + '. Keep on re-engagement list.' });
        lead.notes.forEach((n) => { lead.timeline.push({ id: uid('e'), t: n.t, type: 'note', text: 'Note added: ' + n.text, by: team.find((m) => m.id === n.by).name }); });
        if (rnd() < 0.3) { mkComm({ channel: 'email', dir: 'in', t: lead.contactedAt + ri(2, 9) * HOUR, subject: 'Re: ' + r2.subject, body: 'Thanks ' + owner.name.split(' ')[0] + ', that works for us. Looking forward to the shortlist!', by: lead.id, status: 'Received' }); }
      }
      return { lead, open, owner, resp: lead.responseMins, lastT };
    };

    const built = [];
    for (let i = 0; i < 46; i++) built.push(mkLead(i));
    built.forEach((b) => leads.push(b.lead));
    leads.sort((a, b) => a.createdAt - b.createdAt);

    /* pending follow-ups for open leads */
    const planDue = [0.2, -2.1, 3.5, 1, 5, 2.2, 0.5, -1.2, 4, 7, 1.6, 3, -0.8, 6, 2, 8, 0.8, 4.5, 9, 3.2, 1.3, 5.5];
    let pi = 0;
    built.forEach((b, i) => {
      const lead = b.lead;
      if (!b.open) return;
      const owner = b.owner;
      let due, type = 'Follow-up call', priority = pick(['High', 'Medium', 'Medium', 'Low']);
      if (lead.status === 'New') {
        type = 'Initial call'; priority = 'High';
        if (i <= 2) due = lead.createdAt + 30 * MIN; else due = lead.createdAt + 30 * MIN;
        if (i === 0) due = now + 12 * MIN;
      } else {
        const d = planDue[pi++ % planDue.length];
        const hr = ri(9, 17);
        due = d <= 0.6 && d > 0 ? Math.max(now + 20 * MIN, today0 + hr * HOUR) : today0 + Math.round(d) * DAY + hr * HOUR + (d % 1 > 0.4 ? 30 * MIN : 0);
        if (d < 0) due = today0 + Math.floor(d) * DAY + hr * HOUR;
        type = lead.status === 'Qualified' ? pick(['Meeting', 'Follow-up call', 'WhatsApp reminder']) : lead.status === 'Proposal Sent' ? pick(['Email', 'Follow-up call']) : lead.status === 'Negotiation' ? 'Follow-up call' : pick(['Follow-up call', 'WhatsApp reminder', 'Email']);
        if (lead.status === 'Contacted' && i > 30) { type = 'Email'; due = today0 - 3 * DAY + 11 * HOUR; priority = 'Medium'; }
      }
      const task = { id: uid('k'), leadId: lead.id, ownerId: lead.ownerId, type, due, priority, status: 'Pending', completedAt: null, note: '', highlighted: false, reminded: false, createdAt: Math.min(now - 30000, b.lastT) };
      const overdue = due < now;
      const soon = due > now && due < now + 70 * MIN;
      if (overdue || soon || (due < today0 + DAY && due > now)) task.reminded = due - 15 * MIN < now;
      if (task.reminded) { task.highlighted = overdue; runs.push({ id: uid('x'), ruleId: 'r2', t: Math.min(now - 2 * MIN, due - 15 * MIN), leadId: lead.id, status: 'Success', durationMs: 1200, steps: [{ label: 'Reminder sent to salesperson', ok: true, detail: owner.name }, { label: 'Follow-up highlighted', ok: true, detail: type + ' · ' + fmt.dayTime(due) }, { label: 'Activity timeline updated', ok: true, detail: 'Reminder logged' }] }); addAct(Math.min(now - 2 * MIN, due - 15 * MIN), 'reminder', 'Reminder triggered: ' + type + ' with ' + lead.name + ' due ' + fmt.time(due), lead.id); lead.timeline.push({ id: uid('e'), t: Math.min(now - 2 * MIN, due - 15 * MIN), type: 'reminder', text: 'Reminder sent to ' + owner.name + ' for ' + type.toLowerCase() + ' at ' + fmt.time(due), by: 'LeadFlow Automation' }); }
      lead.timeline.push({ id: uid('e'), t: task.createdAt, type: 'task', text: type + ' scheduled for ' + fmt.dayTime(due), by: owner.name });
      tasks.push(task);
      if (lead.status === 'New' && due < now - 1 * HOUR && i >= 4) {
        // uncontacted > 24h: escalation
        lead.flagged = true; const et = Math.min(lead.createdAt + 24 * HOUR, now - 10 * MIN);
        tasks.push({ id: uid('k'), leadId: lead.id, ownerId: 'u1', type: 'Follow-up call', due: today0 + 10 * HOUR + (i % 2) * 3 * HOUR, priority: 'High', status: 'Pending', completedAt: null, note: 'Escalation: lead uncontacted for 24 hours', highlighted: true, reminded: false, createdAt: et, escalation: true });
        lead.timeline.push({ id: uid('e'), t: et, type: 'escalation', text: 'Flagged overdue and escalated to Sarah Mitchell — uncontacted for 24 hours', by: 'LeadFlow Automation' });
        runs.push({ id: uid('x'), ruleId: 'r3', t: et, leadId: lead.id, status: 'Success', durationMs: 1800, steps: [{ label: 'Lead flagged as overdue', ok: true, detail: '24h without contact' }, { label: 'Sales manager notified', ok: true, detail: 'Sarah Mitchell' }, { label: 'Escalation task created', ok: true, detail: 'Follow-up call, High priority' }] });
        addAct(et, 'escalation', lead.name + ' escalated to Sarah Mitchell (24h uncontacted)', lead.id);
        notifications.push({ id: uid('n'), t: et, text: 'Escalation: ' + lead.name + ' has not been contacted for 24 hours', leadId: lead.id, read: i === 5, kind: 'alert' });
      }
    });
    // conversion runs
    leads.filter((l) => l.convertedAt).forEach((l) => {
      runs.push({ id: uid('x'), ruleId: 'r4', t: l.convertedAt + MIN, leadId: l.id, status: 'Success', durationMs: 900, steps: [{ label: 'Pending reminders stopped', ok: true, detail: 'Open follow-ups cancelled' }, { label: 'Conversion recorded', ok: true, detail: LF.fmt.money(l.value) }, { label: 'Dashboard statistics updated', ok: true, detail: 'KPIs recalculated' }] });
      addAct(l.convertedAt + MIN, 'converted', l.name + ' converted — ' + LF.fmt.money(l.value), l.id);
    });
    // reminders for some completed tasks
    tasks.filter((t) => t.status === 'Completed' && t.type !== 'Initial call' && rnd() < 0.5 && t.due - 15 * MIN < now).forEach((t) => {
      const lead = leads.find((l) => l.id === t.leadId), ow = team.find((m) => m.id === t.ownerId);
      runs.push({ id: uid('x'), ruleId: 'r2', t: t.due - 15 * MIN, leadId: t.leadId, status: 'Success', durationMs: 1100, steps: [{ label: 'Reminder sent to salesperson', ok: true, detail: ow.name }, { label: 'Follow-up highlighted', ok: true, detail: t.type }, { label: 'Activity timeline updated', ok: true, detail: 'Reminder logged' }] });
      if (t.due > now - 6 * DAY) addAct(t.due - 15 * MIN, 'reminder', 'Reminder triggered: ' + t.type + ' with ' + lead.name, t.leadId);
    });
    // initial-call reminders (rule 2) for leads flagged reminded
    tasks.filter((t) => t.status === 'Completed' && t.reminded && t.type === 'Initial call').forEach((t) => {
      const ow = team.find((m) => m.id === t.ownerId);
      runs.push({ id: uid('x'), ruleId: 'r2', t: t.due - 5 * MIN, leadId: t.leadId, status: 'Success', durationMs: 1000, steps: [{ label: 'Reminder sent to salesperson', ok: true, detail: ow.name }, { label: 'Follow-up highlighted', ok: true, detail: 'Initial call' }, { label: 'Activity timeline updated', ok: true, detail: 'Reminder logged' }] });
    });

    leads.forEach((l) => l.timeline.sort((a, b) => a.t - b.t));
    runs.sort((a, b) => b.t - a.t); activities.sort((a, b) => b.t - a.t); comms.sort((a, b) => a.t - b.t);
    activities.length = Math.min(activities.length, 160);

    // a few recent notifications
    const recent = leads.filter((l) => l.createdAt > now - DAY).slice(-3);
    recent.forEach((l) => notifications.push({ id: uid('n'), t: l.createdAt + 50000, text: 'New lead assigned: ' + l.name + ' (' + l.source + ')', leadId: l.id, read: false, kind: 'lead' }));
    tasks.filter((t) => t.status === 'Pending' && t.reminded).slice(0, 2).forEach((t) => notifications.push({ id: uid('n'), t: Math.min(now - 5 * MIN, t.due - 30 * MIN), text: 'Reminder: ' + t.type.toLowerCase() + ' with ' + leads.find((l) => l.id === t.leadId).name + ' ' + (t.due < now ? 'is overdue' : 'is due at ' + fmt.time(t.due)), leadId: t.leadId, read: false, kind: 'reminder' }));
    const conv = leads.filter((l) => l.convertedAt).sort((a, b) => b.convertedAt - a.convertedAt)[0];
    if (conv) notifications.push({ id: uid('n'), t: conv.convertedAt, text: conv.name + ' converted — ' + fmt.money(conv.value), leadId: conv.id, read: true, kind: 'win' });
    notifications.sort((a, b) => b.t - a.t);

    return {
      v: 1, meta: { anchor: today0, seededAt: now }, settings, team, leads, tasks, comms, activities, runs, notifications,
      rules: LF.DEFAULT_RULES(), templates: LF.DEFAULT_TEMPLATES.map((t) => ({ id: t.id, name: t.name, desc: t.desc, icon: t.icon, subject: t.subject, body: t.body, edited: false, updatedAt: null })),
      ui: { range: 30, sidebarCollapsed: false },
    };
  };
})();
