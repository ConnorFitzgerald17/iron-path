# Iron Path web

The web application for [Iron Path](https://github.com/ConnorFitzgerald17/iron-path), an Old School RuneScape iron-account progress journal. The companion RuneLite plugin lives in [`iron-path-runelite`](https://github.com/ConnorFitzgerald17/iron-path-runelite).

## Local development

```sh
npm install
npm run dev
```

Without environment variables the app uses a persisted browser demo and the plugin API accepts `demo-device-token`. Copy `.env.example` to `.env.local` and fill in Supabase values to enable real accounts and persistence.

## Supabase

1. Create a Supabase project.
2. Apply `supabase/migrations/0001_iron_path.sql`.
3. Enable Discord and email OTP providers.
4. Add local and production callback URLs ending in `/auth/callback`.
5. Set the publishable and service-role keys in Vercel.

The service-role key is used only by server route handlers. Browser access is protected by row-level security. Profiles and goals remain private until explicitly published.

## Wiki catalog

Set a descriptive `IRON_PATH_WIKI_USER_AGENT`, then invoke:

```sh
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/catalog/sync
```

The importer reads the Quest, Infobox Monster, and Dropsline Bucket datasets, `Module:Questreq/data`, and the real-time price mapping. It preserves raw quest requirements whenever safe normalization is not possible.

## Documentation

- [`docs/QUICK_SETUP.md`](docs/QUICK_SETUP.md) — local demo, Supabase, Wiki import, and optional RuneLite setup.
- [`docs/REMAINING_WORK.md`](docs/REMAINING_WORK.md) — launch blockers, follow-up work, delivery order, and MVP acceptance criteria.

## Verification

```sh
npm test
npm run build
```
