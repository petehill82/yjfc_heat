# Squad Manager

A small web app for running a kids' football squad: player records, fixtures,
picking teams for matchday, printable/shareable team sheets, match stats, and
a season dashboard. Built to run for free: a static site on **GitHub Pages**
talking directly to a **Supabase** (Postgres + Auth) backend - no server to
host or pay for.

- **Front end:** plain HTML/CSS + Vue 3, loaded from a CDN via an import map.
  No build step, no Node.js required - works from any machine with a browser
  and a text editor.
- **Back end:** Supabase free tier. Postgres holds the data; Supabase Auth
  handles coach logins; Row Level Security enforces who can see/edit what.
- **Branding:** orange theme (`css/theme.css`), placeholder club badge
  (`assets/badge.svg`) - swap it for your real one, see "Branding" below.
- **Squad name:** stored per season (`seasons.squad_name`) since it changes
  every year as the age group moves up - edit it from the Admin screen.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. Open the **SQL Editor** and run these files **in order**, pasting each
   file's contents and clicking Run:
   1. `supabase/001_schema.sql` - tables and enums
   2. `supabase/002_auth.sql` - login trigger, `is_admin()`, Row Level Security
   3. `supabase/003_views.sql` - dashboard reporting views
   4. *(optional)* `supabase/seed.sql` - 30 fake players + a season + sample
      fixtures, useful for trying the app out before your real squad is in.
3. **Authentication -> Providers**: make sure Email is enabled.
4. **Authentication -> Settings**: turn **off** "Allow new users to sign up" -
   coaches are invite-only.
5. **Authentication -> URL Configuration**: set the Site URL and add a
   Redirect URL for wherever you'll host this (e.g.
   `https://yourname.github.io/squad-manager/`) and also
   `http://localhost:8000` for local testing.
6. **Authentication -> Users -> Invite user**: invite yourself with your own
   email. Check your inbox and set a password.
7. Back in the **SQL Editor**, promote yourself to admin (one-off):
   ```sql
   update profiles set role = 'admin' where id = auth.uid();
   ```
   Run this *while signed in as yourself* via the SQL editor's "Run as" user
   picker, or simply find your row in **Table editor -> profiles** and set
   `role` to `admin` directly.

## 2. Connect the app to your project

Open **Settings -> API** in Supabase, copy the **Project URL** and the
**anon public key**, and paste them into `js/config.js`:

```js
export const SUPABASE_URL = "https://xxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJ...";
```

This key is safe to publish - it has no special power on its own. Access is
controlled entirely by the Row Level Security policies in `002_auth.sql`.

## 3. Run it locally

No install needed - any static file server works:

```bash
/home/phill/.conda/envs/claude/bin/python -m http.server 8000
```

Then open `http://localhost:8000`. Sign in with the coach account you
invited above.

## 4. Deploy for free on GitHub Pages

```bash
git init
git add .
git commit -m "Initial squad manager"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then on GitHub: **Settings -> Pages -> Build and deployment -> Deploy from a
branch**, pick `main` and `/ (root)`. Your site appears at
`https://<you>.github.io/<repo>/` within a minute or two.

Add that URL to Supabase's **Authentication -> URL Configuration** (Site URL
and Redirect URLs) or login will fail after deployment.

> The repo must be public for free GitHub Pages. That's fine - there are no
> secrets in this codebase (see above); all player data lives in Supabase,
> not in the repo.

### Inviting other coaches

From the Supabase dashboard: **Authentication -> Users -> Invite user**. New
coaches get the `coach` role automatically (can pick teams, enter stats, mark
availability/attendance) and cannot add/remove players or promote anyone -
only an `admin` can, from the app's **Admin** screen.

### Keeping the free database awake

Supabase free projects pause after 7 days of no activity. Using the app
weekly keeps it awake; if it does pause, one click of "Restore" in the
Supabase dashboard brings it straight back (data is untouched).

## Branding

- **Badge:** replace `assets/badge.svg` with your club's real badge (same
  filename), or add a new file and change `badge_path` on the **Admin ->
  Club branding** screen. Also regenerate `assets/icon-192.png` and
  `assets/icon-512.png` (used for "Add to Home Screen" on phones) from your
  real badge with any image tool.
- **Colour:** the orange theme lives in `css/theme.css` as a handful of CSS
  variables - change `--club-orange` / `--club-orange-dark` there.
- **Squad name:** each season has its own `squad_name` (e.g. "Lions U11s"),
  edited on the **Admin** screen - update it once a year when the age group
  changes.

## Project layout

```
index.html          entry point, import map for CDN libraries
manifest.webmanifest "Add to Home Screen" support
assets/              badge + icons
css/                 theme.css (colours) + app.css (layout, print styles)
js/
  config.js          your Supabase URL/key
  supabase.js         Supabase client + auth helpers
  store.js            small shared reactive state (session, seasons, club settings)
  main.js              router + app bootstrap
  api/                 one file per table - all Supabase queries live here
  views/                one file per screen
  components/          NavBar, PlayerPicker, StatTile, ConfirmDialog
supabase/            SQL to run in the Supabase SQL editor (see above)
```

## Data model notes

- A **matchday** is just every fixture sharing the same `match_date` - so a
  weekend where the squad splits into two or three teams against different
  opponents is handled with no extra concept: create one fixture per team per
  opponent, all on the same date, and the **Matchday** screen shows them side
  by side and flags any player selected for more than one.
- `fixtures.team_name` is only used to tell *our* teams apart on a split
  matchday (e.g. "Orange" vs "Black"); leave it blank when only one team
  plays. The season's `squad_name` is the actual team name shown everywhere
  else.
- `appearances` holds one row per player per fixture, covering both team
  selection (before the game) and stats (after it) - selected, starting,
  shirt number, position, minutes played, minutes in goal, goals, assists,
  rating, player of the match.
- Only what's needed for coaching is stored about children: no addresses,
  year of birth rather than full date of birth, no guardian contact details.

## Verification checklist

- [ ] Sign in locally against your real Supabase project.
- [ ] Add a season (or check the seeded one), confirm it shows as "current".
- [ ] Add/import 30 players.
- [ ] Create 2-3 fixtures on the same date (mix of home/away), pick teams on
      the Matchday screen, confirm the double-booking warning appears if you
      select the same player twice.
- [ ] Print a team sheet to PDF and check it looks right in black & white.
- [ ] Enter match stats including minutes in goal, save, and confirm the
      dashboard's leaderboard, minutes-fairness and goalkeeping charts update.
- [ ] Mark a player unavailable and confirm it's flagged when picking teams.
- [ ] Take training attendance and confirm the season attendance % appears.
- [ ] Sign in as a non-admin coach: confirm player add/delete and the Admin
      screen are unavailable, but fixtures/teams/stats/availability work.
- [ ] Open the deployed GitHub Pages URL on a phone, add to home screen.
