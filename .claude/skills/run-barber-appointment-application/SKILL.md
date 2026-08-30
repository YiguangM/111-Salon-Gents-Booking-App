---
name: run-barber-appointment-application
description: Build, run, and drive the barbershop booking app (Next.js + Prisma/SQLite). Use when asked to start the app, seed its database, take a screenshot of its UI, or confirm the public booking flow / admin dashboard actually works end-to-end (not just that tests pass).
---

This is a Next.js 16 web app (App Router) with a Prisma/SQLite database.
It's driven with a committed Playwright script,
`.claude/skills/run-barber-appointment-application/driver.mjs`, which
launches a real headless Chromium, books an appointment through the
public site, then logs into the admin dashboard — screenshotting each
step and cleaning up the appointment it created.

All paths below are relative to the repo root.

## Prerequisites

Node 20+ (developed and verified on Node v24.20.0 / npm 11.19.0, on
Windows — nothing here is platform-specific).

## Setup

```bash
npm install                       # installs playwright as a devDependency too
npx playwright install chromium   # downloads the browser binary (~200MB, one-time)
npm run db:seed                   # creates prisma/dev.db and seeds services/barbers/admin user
```

`npm run db:seed` is idempotent (upserts), so it's safe to re-run.

## Build

Not required to run the driver (Next dev mode compiles routes on
demand). `npm run build` works if you need a production build check.

## Run (agent path)

Start the dev server in the background, wait for it to actually serve,
then run the driver:

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
node .claude/skills/run-barber-appointment-application/driver.mjs smoke
```

The driver:
1. Screenshots the homepage.
2. Goes through `/book`: picks the first service, "Any available
   barber," then **probes forward day-by-day** (see Gotchas) until it
   finds a day with open slots, picks the first slot, fills in the
   details form, and confirms — screenshotting each step plus the
   final confirmation.
3. Logs into `/admin/login` with the seeded admin credentials, then
   screenshots the dashboard, the barbers list, and the first barber's
   schedule editor (weekly hours + time-off blocks).
4. Deletes the test appointment it created via the admin UI, so
   repeated runs don't pollute the appointments list.
5. Prints a `PASS` / browser-console-errors summary and exits non-zero
   on either a thrown step or a console error.

Screenshots land in
`.claude/skills/run-barber-appointment-application/screenshots/`,
numbered in the order they're taken (overwritten each run).

Admin credentials come from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`),
defaulting to `admin@example.com` / `ChangeMe123!` — the driver reads
the same env vars, so a custom `.env` still works without editing the
script.

Stop the dev server when done: find its port's listener and kill it
(see Troubleshooting — `npm run dev &`'s `$!` is only the npm wrapper,
not the actual `next-server` process).

## Run (human path)

```bash
npm run dev
```

Open http://localhost:3000 for the site, http://localhost:3000/admin/login
for the admin dashboard. Ctrl-C to stop.

## Test

```bash
npm run lint
npm run build
```

No unit/integration test suite exists yet — `lint` + `build` are the
only automated checks. The driver above is the closest thing to an
end-to-end test.

## Gotchas

- **Hours vary by day** (split Sat–Thu shifts with a midday break, shorter
  Friday hours starting mid-afternoon) and admin-added time-off blocks can
  close out a whole day, so booking a hardcoded "today" can legitimately
  show zero slots — that's correct behavior, not a bug. The driver handles
  this by trying up to 8 consecutive days and using the first one with
  open slots; don't hardcode a date when extending the driver.
- **`npm run dev &` leaves an orphaned process on port 3000 if you kill
  the wrong PID.** `next dev` prints `Port 3000 is in use by process
  <PID>` and switches to 3001 if something is already bound — that's
  usually a previous run's server still alive, not a real conflict.
  Prefer reusing the existing server (check `curl localhost:3000`
  first) over stacking a second one.
- **The booking form uses controlled React inputs.** Playwright's
  `.fill()` works correctly (fires React's `onChange`); don't use
  `el.value = ...` via `.evaluate()` — it won't register and the
  "Continue"/"Confirm Booking" buttons will stay disabled.
- **Buttons, not links, drive the wizard steps** (service/barber/slot
  selection are `<button>` elements, not navigation) — `page.goto()`
  won't work mid-flow, only `.click()`.

## Troubleshooting

- **`Another next dev server is already running` / port 3001 fallback**:
  a prior `npm run dev` is still alive on 3000. Either reuse it
  (`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`
  should print `200`) or find and stop the real process — the PID Next
  prints (`next dev`'s own child), not the shell job number from `&`.
- **Driver throws `No open slots found in the next 8 days`**: the
  seeded working hours or seeded barbers got wiped — re-run
  `npm run db:seed`.
- **`Cannot find module 'playwright'` when running the driver directly**:
  run `npm install` from the repo root first — the driver resolves
  `playwright` via normal Node module resolution up to the root
  `node_modules`, so it must be installed there, not just in some
  other temp/scratch directory.
