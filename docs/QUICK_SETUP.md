# Iron Path: Quick Setup

## Run the web app

Requirements: Node.js 20.9+ and npm 10+.

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- With a configured `.env.local`, `/` requires sign-in and loads Supabase data.
- Without Supabase variables, `/` runs the browser-local demo.

## Supabase

1. Create a Supabase project.
2. Run every SQL file in `supabase/migrations` in numeric order in its SQL editor.
3. Enable email OTP in Authentication providers.
4. Add `http://localhost:3000/auth/callback` to the redirect allow-list.
5. Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
CRON_SECRET=generate-a-long-random-secret
IRON_PATH_API_ORIGIN=http://localhost:3000
IRON_PATH_WIKI_USER_AGENT=IronPath/0.1 (your-contact-url-or-email)
```

Never expose the service-role key to browser code or commit `.env.local`. Restart the dev server after changing environment variables.

## Import the Wiki catalog

With the server running:

```sh
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/catalog/sync
```

A successful import creates a completed `catalog_sync_runs` row and populates items, quests, monsters, and drops. The first import can take several minutes.

## Test the manual MVP

1. Sign in with email.
2. Create your first character with its RuneScape name and iron type.
3. Select **New goal**.
4. Search a quest, or search a monster and select a target drop.
5. Use the `−` and `+` controls to update levels, item quantities, KC, and drops.
6. Open **Showcase**, select visible goals/drops, publish, and copy the public link.
7. Reload the page to confirm that the state persists.

## Test the RuneLite plugin

The plugin is a separate repository:

```sh
git clone https://github.com/ConnorFitzgerald17/iron-path-runelite.git
cd iron-path-runelite
./gradlew test
./gradlew run
```

To use a Jagex Account, launch RuneLite through the Jagex Launcher and use the plugin in that RuneLite session. Iron Path does not and should not accept Jagex credentials.

In the Iron Path plugin settings:

1. Set **API origin** to `http://localhost:3000`.
2. In the web journal, select **Plugin** to generate a ten-minute code.
3. Paste the code into the plugin and connect the currently logged-in character.
4. Run a manual sync, then reload the web journal.

The plugin receives only a revocable Iron Path device token. It never receives Jagex, RuneLite, or email credentials.

## Verification

```sh
npm test
npm run lint
npm run build
```

See [Post-MVP Work](REMAINING_WORK.md) for deployment hardening and later features.
