# Iron Path: Quick Setup

The quickest way to review Iron Path is local demo mode. It requires Node.js only and stores changes in the browser. Supabase and RuneLite setup are optional until you want real accounts or sync.

## 1. Run the local web demo

Requirements:

- Node.js 20.9 or newer.
- npm 10 or newer.

From the repository root:

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment file is required for demo mode.

Useful checks:

```sh
npm test
npm run lint
npm run build
npm audit --omit=dev
```

The production build intentionally uses Next.js's webpack builder because it is reliable in restricted local and CI environments.

## 2. Configure Supabase

Skip this section if you only need the browser-local demo.

1. Create a Supabase project.
2. Open its SQL editor and run `supabase/migrations/0001_iron_path.sql`.
3. In Authentication, enable Discord and/or email OTP.
4. Add callback URLs ending in `/auth/callback`, including:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.example/auth/callback`
5. Copy the web environment template:

```sh
cp .env.example .env.local
```

6. Fill in the values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
CRON_SECRET=generate-a-long-random-secret
IRON_PATH_API_ORIGIN=http://localhost:3000
IRON_PATH_WIKI_USER_AGENT=IronPath/0.1 (https://your-domain.example/contact)
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit `.env.local`.

Restart the development server after changing environment variables.

## 3. Import the OSRS Wiki catalog

With the configured web server running:

```sh
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/catalog/sync
```

The import may take several minutes. It retrieves quest, monster, drop, price-mapping, requirement, and icon metadata from the OSRS Wiki. Review the resulting `catalog_sync_runs` row and server logs after the first import.

For a hosted environment, schedule this authenticated endpoint using the platform's cron service.

## 4. Optional RuneLite development setup

The manual web MVP does not require RuneLite.

Requirements:

- JDK 11.
- Gradle 8.x, or a generated compatible Gradle wrapper.

Run the plugin tests:

Clone the separate plugin repository, then run:

```sh
git clone https://github.com/ConnorFitzgerald17/iron-path-runelite.git
cd iron-path-runelite
gradle test
```

Launch RuneLite developer mode:

```sh
gradle run
```

In the Iron Path plugin settings:

1. Set **API origin** to `http://localhost:3000`.
2. Open the web connection dialog and copy its demo linking code.
3. Paste the code into RuneLite.
4. Select **Connect account**, then run a manual sync.

The plugin stores its token and offline queue against the active RuneScape profile. It never needs Jagex, RuneLite, Discord, or email credentials.

The current browser dialog uses a bundled demo code. The authenticated endpoint for real expiring codes is implemented, but wiring that endpoint into the dashboard is part of the remaining production work.

## 5. Production checklist

Before deploying:

- Use a supported Node.js LTS runtime.
- Set all environment variables in the hosting provider.
- Apply the database migration before starting the application.
- Set correct Supabase site and callback URLs.
- Run `npm test`, `npm run lint`, `npm run build`, and `npm audit --omit=dev`.
- Protect the Wiki sync endpoint with a strong cron secret.
- Use HTTPS for the website and plugin API.
- Review [Remaining Work](REMAINING_WORK.md), especially the persistence, RLS, throttling, and integration-test sections.

## Common issues

### The app always shows Iron Vale

That is expected in local demo mode. Configure Supabase to enable real authentication, then complete the database-backed dashboard work listed in the remaining-work document.

### Wiki images do not load

Confirm that `oldschool.runescape.wiki` is reachable and that redirects are allowed. Icons use the Wiki's `Special:FilePath` endpoint.

### The catalog endpoint returns 401

The `Authorization` bearer value must exactly match `CRON_SECRET` in the running server environment.

### RuneLite cannot connect locally

Confirm the web server is running, the plugin API origin is `http://localhost:3000`, and no proxy or firewall is blocking localhost access.
