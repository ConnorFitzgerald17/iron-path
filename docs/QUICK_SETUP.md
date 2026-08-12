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

### Local Docker stack

Docker can run an isolated local Supabase stack, including Postgres, Auth,
PostgREST, Studio, and a test email inbox. It never connects to or mutates the
hosted Supabase project.

```sh
npm run db:start
npm run db:status
npm run db:reset
npm run db:test
```

The first start downloads the required Docker images. `db:status` prints the
local API URL, publishable key, service-role key, database URL, Studio URL, and
email-inbox URL. Copy the API URL and keys into `.env.local` using the existing
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` names, then restart `npm run dev`. Use
`npm run db:stop` when finished.

`npm run db:reset` is destructive only to the local Docker database. It replays
every file in `supabase/migrations` and then `supabase/seed.sql`. Do not add
`--linked` to this command unless you explicitly intend to reset a remote
development project.

### Hosted project

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
FF_SIGNUPS_ENABLED=false
DISCORD_APPLICATION_ID=your-discord-application-id
DISCORD_PUBLIC_KEY=your-discord-application-public-key
DISCORD_BOT_TOKEN=your-server-only-bot-token
```

Never expose the service-role key to browser code or commit `.env.local`. Restart the dev server after changing environment variables.

## Discord achievements

Create an application in the Discord Developer Portal and set its Interactions
Endpoint URL to `https://your-iron-path-origin/api/discord/interactions`. Put the
application ID, public key, and bot token in `.env.local`, then register the
global command:

```sh
npm run discord:register
```

Install the app to a server with permission to send messages, embed links, and
attach files. A clan admin runs `/ironpath setup`, and each player runs
`/ironpath link` followed by `/ironpath join`. Schedule an authenticated POST to
`/api/cron/discord-dispatch` to deliver queued achievements.

Keep `FF_SIGNUPS_ENABLED=false` while the RuneLite plugin is awaiting approval. Existing users can still sign in and use verified journals, but the app login flow will not create new auth users and first-character enrollment is blocked. Set it to `true` and restart or redeploy when registrations should open.

## Import the Wiki catalog

With the server running:

```sh
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/catalog/sync
```

A successful import creates a completed `catalog_sync_runs` row and populates items, quests, monsters, and drops. The first import can take several minutes.

## Test the web MVP

1. Sign in with email.
2. Copy the verification code, paste it into the Iron Path RuneLite plugin, and connect while logged into the character.
3. Wait for the first snapshot to create the verified journal.
4. Select **New goal**.
5. Search a quest, or search a monster and select a target drop.
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
2. During first-time setup, copy the ten-minute verification code shown by the web app. For an existing journal, select **Plugin** to generate a relink code.
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
