# Iron Path: Remaining Work

This document separates what is already usable from what still needs to be completed before Iron Path is ready for real players. The current build is an MVP prototype: the interface and domain calculations work in browser-local demo mode, while the persistence and RuneLite integration foundations are present but still need an end-to-end production pass.

## Current baseline

Already implemented:

- Responsive quest, item-grind, banked-XP, and showcase interfaces.
- Browser-local manual tracking with persisted demo data.
- Quest readiness calculations for skills, required items, and prerequisite quests.
- Grind kill count, drop-rate progress, notable drop visibility, and showcase controls.
- Banked-XP calculations and an initial activity catalog.
- Supabase schema, row-level security policies, authentication pages, and plugin API routes.
- OSRS Wiki catalog importer for quests, monsters, drops, prices, and icons.
- RuneLite companion project for snapshots, loot events, linking, and offline retry.
- Automated calculation/catalog tests, production web build, and RuneLite compilation tests.

## MVP launch blockers

These are the highest-priority tasks for making the web MVP genuinely usable with real accounts.

### 1. Connect the dashboard to Supabase

The main dashboard currently reads and writes its profile through `localStorage`. Replace that adapter with authenticated Supabase queries while retaining local demo mode for development.

- Load the signed-in user's characters and active character.
- Create the first character during onboarding.
- Persist goal creation, editing, ordering, completion, and visibility.
- Persist manual kill-count adjustments and notable drops.
- Persist manual bank quantities and quest-state overrides.
- Add loading, empty, error, retry, and offline states.
- Add optimistic updates or clear save feedback.

### 2. Finish real goal creation and editing

The current quick-add experience demonstrates goal types but is not yet a complete editor.

- Add a searchable quest picker backed by `catalog_quests`.
- Generate quest skill, item, and prerequisite requirements from the Wiki catalog.
- Allow manual correction of ambiguous requirements and alternatives.
- Add a monster/drop picker backed by `catalog_monsters` and `catalog_drops`.
- Let players choose which drops count as notable.
- Add complete banked-XP goal configuration: target level, methods, outputs, secondaries, and level restrictions.
- Add rename, archive, delete, duplicate, and reorder actions.

### 3. Validate and harden Wiki imports

The importer and parsers are implemented and unit-tested, but the full dataset needs a production import rehearsal.

- Run the initial catalog sync against a configured Supabase project.
- Review parser exceptions for alternative items, tool requirements, quest variants, and untradeables.
- Resolve item names to canonical item IDs wherever possible.
- Store import warnings for requirements that need manual review.
- Add incremental updates, retry/backoff, and sync observability.
- Schedule the catalog refresh and document the expected cadence.
- Replace the placeholder Wiki user-agent contact value.

### 4. Complete authentication and onboarding

- Configure Discord OAuth and email magic-link authentication in Supabase.
- Build first-run character creation and account-type selection.
- Add sign-out, session-expired, and account-deletion flows.
- Add character switching and multiple-character management.
- Confirm production callback and redirect URLs.

### 5. Complete public showcases

- Load `/showcase/[slug]` from public Supabase data instead of demo data.
- Enforce character and per-goal visibility on the server.
- Add a share/copy-link action and social metadata.
- Add a useful private/not-found state without leaking profile existence.
- Decide whether individual drop visibility is supported independently of its grind.

## RuneLite integration follow-up

The companion project exists ahead of the web-only MVP so the API contract is explicit. Before Plugin Hub submission:

- Exercise linking against a deployed HTTPS environment.
- Replace the demo linking flow with generated, expiring one-time codes in the dashboard.
- Validate bank, inventory, equipment, quest, XP, profile-switching, and loot behavior in RuneLite developer mode.
- Confirm NPC ID coverage and how KC is reconciled when a player already has external kill count.
- Add API contract/integration tests covering retries, stale snapshots, duplicate events, revoked tokens, and rate limits.
- Add token rotation and a visible list of linked devices.
- Add configurable notable-drop filters and clear queue/sync diagnostics.
- Audit RuneLite deprecations reported during compilation.
- Prepare Plugin Hub metadata, screenshots, support links, and review requirements.

## Security and reliability

- Review all RLS policies against authenticated and anonymous access scenarios.
- Add request throttling to linking, snapshot, loot, and catalog endpoints.
- Add maximum body sizes and stricter validation for snapshot collections.
- Add structured server logging and error monitoring.
- Add database backups and a recovery rehearsal.
- Add privacy policy, terms, data export, and account deletion documentation.
- Verify that service-role credentials never enter browser bundles or logs.
- Establish retention rules for raw loot events and snapshots.

## Quality and delivery

- Add browser-level tests for manual tracking and showcase visibility.
- Add a Supabase-backed integration-test environment.
- Test current Chrome, Firefox, Safari, and common mobile widths.
- Add accessibility checks for keyboard navigation, dialogs, labels, contrast, and reduced motion.
- Add CI for web tests, lint, build, dependency audit, and Java tests.
- Add preview deployments and production environment validation.
- Add product analytics for onboarding, first goal, first completed requirement, and shared showcase.

## Suggested delivery order

1. Provision Supabase and run the catalog migration/import.
2. Implement authenticated character onboarding.
3. Replace local dashboard storage with the database adapter.
4. Finish quest and grind creation/editing.
5. Connect and secure public showcases.
6. Add integration tests, monitoring, throttling, and CI.
7. Deploy the web MVP and test it with a small group of iron players.
8. Resume in-client RuneLite testing and prepare the Plugin Hub submission.

## MVP acceptance checklist

The manual web MVP is ready for an external test when a new player can:

- Sign in and create an iron character.
- Add a Wiki-backed quest and see accurate skills, subquests, and item requirements.
- Manually update levels, quest states, and bank quantities with changes surviving a new browser session.
- Create an item grind, update KC, and record/showcase important drops.
- Create a banked-XP goal and understand its projected level.
- Publish only explicitly selected profile content through a stable share URL.
- Delete their data and sign out cleanly.
