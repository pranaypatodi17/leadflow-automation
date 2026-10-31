# LeadFlow — Lead Follow-Up Automation 

A static, front-end-only app for **Horizon Realty** showing how website enquiries are captured, acknowledged, assigned to a salesperson and followed up — automatically.

> Data lives in your browser's `localStorage`. There is no backend; emails and notifications are logged, not sent.

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## The 2-minute tour

1. **Dashboard → Simulate New Enquiry** — submit the sample enquiry and watch the 6-step automation run live (lead created → acknowledgement email → salesperson assigned → follow-up scheduled → team notified). The lead, email, task and execution history appear everywhere afterwards.
2. **Automation Rules** — toggle, edit or create rules in the visual workflow builder, then simulate again to see the effect (disable Rule 1 to see what a missed enquiry looks like).
3. **Leads → any lead** — change status, reassign, add notes, schedule follow-ups, send a simulated email, mark converted/lost.
4. **Follow-Up Tasks** — table and calendar views; complete, reschedule, re-prioritise.
5. **Reports / Team** — every figure is computed from the same sample data.

Use **Reset demo data** (banner or user menu) to restore the original data set.

## Structure

```
index.html            app shell
css/styles.css        design system and layout
vendor/chart.umd.js   Chart.js 4.4.1 (vendored, MIT)
js/icons.js           inline SVG icons
js/ui.js              formatting, modal, toast, dropdowns, chart helpers
js/data.js            constants, default templates/rules, seeded Horizon Realty data generator
js/store.js           state, localStorage persistence, queries, template rendering
js/engine.js          automation engine: triggers, action catalog, rule execution, lead/task operations
js/pages/*.js         one module per page (dashboard, leads, lead-detail, tasks, automation, templates, team, reports, settings)
js/simulation.js      "Simulate New Enquiry" live demo
js/app.js             router, shell, global search, notifications, event delegation
```

Rules are data (`trigger` + ordered `actions`) executed by one engine, so the four predefined rules and any rule you build behave the same way.
