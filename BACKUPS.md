# Backups & Disaster Recovery

This is the runbook for backing up and restoring the Laxmi Computers database.
The application is stateless — all valuable data lives in Supabase (Postgres).
Code is in git. The thing you can't replace is the database.

---

## Threat model

What you're protecting against, in rough order of likelihood:

1. **Operator error** — someone runs the wrong UPDATE in SQL Editor and wipes
   a column, or accidentally deletes a customer that had 50 invoices linked.
2. **App bug** — a buggy migration corrupts data (e.g. a NOT NULL added when
   the column had nulls, or a misplaced status reset).
3. **Supabase region outage** — rare but happens; affects all customers on a
   region for hours.
4. **Account compromise** — somebody guesses an admin password and starts
   deleting things. Audit log helps detect but doesn't recover.
5. **Vendor failure** — Supabase deletes your project, goes bankrupt, etc.
   Lowest probability, highest impact.

The recovery strategy needs to cover all five.

---

## Layer 1 — Supabase Point-in-Time Recovery (PITR)

**Cost**: Pro plan ($25/month) or higher.
**What it does**: continuous WAL backup; lets you restore the entire database
to any second in the last 7 days (Pro) or 14 / 28 days (higher tiers).
**Covers**: operator error, app bug, account compromise.
**Doesn't cover**: vendor failure, region outage if you can't reach the
dashboard.

### Enable it

1. Open https://supabase.com/dashboard → your project → **Database** → **Backups**.
2. If your project is on Free plan, upgrade to Pro. (Free has daily backups only,
   7-day retention, and no PITR — restoring loses up to 24 hours of work.)
3. PITR is automatic once on Pro. No config needed.

### Restore from PITR

1. Dashboard → **Database** → **Backups** → **Restore**.
2. Pick a target time (e.g. "10 minutes before that bad migration").
3. Supabase creates a new project from that snapshot. The original is unaffected.
4. Verify the new project has the data you expect.
5. Swap the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
   `.env.local` (and Vercel env vars if deployed) to point to the new project.
6. Redeploy. The app is now talking to the restored database.

**Important**: a PITR restore creates a *new* project. The URL/keys change.
Plan for the redeploy step — without it, the app keeps using the broken DB.

---

## Layer 2 — Weekly off-site `pg_dump`

PITR depends on Supabase being available. If Supabase deletes your project
(billing dispute, terms violation, account compromise), PITR is gone too.
A `pg_dump` exported to a different cloud is your insurance against that.

### One-time setup

1. Install the Supabase CLI:
   ```powershell
   scoop install supabase
   ```
   (or grab the binary from https://github.com/supabase/cli/releases)
2. `supabase login` and `supabase link --project-ref <ref>` in this repo.
3. Find the direct DB connection string in Dashboard → **Project Settings** →
   **Database** → **Connection string** → **URI**. Save it as
   `$env:SUPABASE_DB_URL` locally. **It contains the database password — don't
   commit it.**

### Weekly manual dump

Run this on a Sunday night (or whenever you can spare 30 seconds):

```powershell
$timestamp = Get-Date -Format "yyyy-MM-dd"
pg_dump $env:SUPABASE_DB_URL `
  --no-owner --no-privileges --clean --if-exists `
  --schema=public --schema=auth `
  --file="laxmi-$timestamp.sql"
```

The output is a plain-text SQL file (a few MB for a small shop). Compress it:

```powershell
Compress-Archive "laxmi-$timestamp.sql" "laxmi-$timestamp.zip"
```

Then copy it to **somewhere that isn't Supabase**:

- Google Drive folder (manual)
- A second cloud storage account (S3, R2, Backblaze)
- A USB drive in the shop (offline = immune to compromise)

Rule of thumb: keep at least one copy off all your usual machines and out
of the Supabase tenancy.

### Automating it

When you're tired of remembering, add a scheduled task:

- **Windows**: Task Scheduler → New task → trigger weekly → action: run a
  PowerShell script with the dump + upload commands.
- **Better**: a GitHub Actions workflow on a `schedule:` trigger that runs
  `pg_dump` and uploads to an external store via that store's CLI. The
  `SUPABASE_DB_URL` goes in Actions secrets.

### Restoring from a dump

```powershell
# Create a fresh empty Supabase project, then:
psql $NEW_DB_URL --file="laxmi-2026-05-23.sql"
```

This loads the schema + data. The dump uses `--clean --if-exists` so it drops
existing objects first if you're restoring into a project that already has
some schema.

---

## Layer 3 — Auth / user account safety

The `auth.users` table is owned by Supabase, not you. If somebody compromises
your Supabase login, they can delete users wholesale.

- **Enable MFA on your Supabase account** (Dashboard → Account → Security).
- **Don't share the Supabase project's owner login.** Add other teammates as
  *organization members* with restricted roles instead.
- The audit log in this app catches role/user changes inside the app, but
  it doesn't catch direct DB operations from the Supabase dashboard.

---

## Layer 4 — Test the restore

A backup you've never restored from is a backup that probably doesn't work.
Once a quarter:

1. Take a fresh dump (or pick a recent PITR point).
2. Restore it into a new Supabase project (free tier is fine for the test).
3. Point a local checkout of this repo at the restored project (`.env.local`
   change + `npm run dev`).
4. Verify: log in as admin, open `/admin/audit` (should show recent activity),
   create a test invoice (proves write path works), check the GSTR-1 CSV
   downloads.
5. Delete the test project.

Twenty minutes once a quarter. The day you actually need it, you'll be
grateful you've done it before under low stress.

---

## What's NOT backed up by this plan

These live outside Supabase and need their own thought:

- **Uploaded files** (none right now — `image_url` is just text). If you start
  using Supabase Storage for product images, those buckets need separate
  backup. `supabase storage cp --recursive` works.
- **Auth provider settings** (email templates, SMTP config) — these live in
  Supabase project settings, not the DB dump. Keep a screenshot or `supabase
  config dump`.
- **`.env` secrets** (Supabase keys, GST credentials when added) — these
  aren't in the DB. Keep a password-manager copy.

---

## Quick recovery cheat sheet

| Scenario                              | Action                                                     | Time   |
|---------------------------------------|------------------------------------------------------------|--------|
| Bad UPDATE wiped a column             | PITR restore to 5 min ago into new project, swap env vars   | 30 min |
| Migration broke schema                | PITR to before the migration, redeploy                       | 30 min |
| Supabase project deleted              | `psql` last weekly dump into a new project                   | 60 min |
| Account compromise (someone in DB)    | Rotate Supabase credentials, then PITR to pre-compromise     | 1-2 hr |
| Whole region down                     | Wait (Supabase fixes it) — your dump is your bargaining chip | hours  |
