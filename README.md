# Iron Path web

The web application for [Iron Path](https://github.com/ConnorFitzgerald17/iron-path), an Old School RuneScape iron-account progress journal. The companion RuneLite plugin lives in [`iron-path-runelite`](https://github.com/ConnorFitzgerald17/iron-path-runelite).

## Local development

```sh
npm install
npm run dev
```

Without environment variables the app uses a persisted browser demo. Copy `.env.example` to `.env.local` and fill in Supabase values to enable real accounts, Wiki-backed goal creation, account-aware recommendations, chained banked-XP calculations, Collection Log showcases, and RuneLite linking.

Linked RuneLite clients refresh dashboard state every 15 seconds while automatic sync is enabled. Goal completion and reopening can be initiated from either surface without overwriting other goal settings.

To preview a Collection Log achievement through the real local queue and Discord channel without earning a new item in game, run:

```sh
pnpm discord:simulate -- --character "Your RSN"
```

The simulator uses the character's newest synced recent item, labels the result as test data, and refuses to run against a hosted Supabase URL. Pass `--item-id 4151` to preview a specific item already present in the character's Collection Log data.

Each web account can hold up to five journals. Link every RuneScape character once from its selected journal; RuneLite then keeps the RSN, exact account mode, combat level, total level, skills, quests, items, loot, and Collection Log isolated by RuneScape profile.

To sync the Collection Log, open it in RuneLite and use its native **Search** button once. Iron Path captures the authoritative item-count transmission, queues each section against the active RuneScape profile, and exposes only skills, sections, or individual obtained items selected in Showcase settings. Skill stats remain private unless the player enables all stats or chooses individual skills.

## Supabase

1. Create a Supabase project.
2. Apply the SQL files in `supabase/migrations` in numeric order, including `0003_multiple_characters_authoritative_sync.sql`.
3. Enable the email OTP provider.
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
- [`docs/REMAINING_WORK.md`](docs/REMAINING_WORK.md) — completed MVP scope, launch hardening, and later product work.

## Verification

```sh
npm test
npm run build
```
