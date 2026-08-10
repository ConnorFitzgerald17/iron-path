# Iron Path: Post-MVP Work

The manual web MVP is complete. Authenticated players can manage multiple RuneScape characters, build goals from the imported OSRS Wiki catalog, update progress manually, connect RuneLite, and publish selected progress. This document now tracks launch hardening and later product work rather than missing MVP functionality.

## MVP delivered

- Email authentication plus creation, switching, and deletion for up to five character journals.
- Supabase-backed characters, goals, manual progress, and visibility.
- Wiki-backed quest search with skill, subquest, item, icon, and guide data.
- Wiki-backed monster/drop search with NPC IDs and drop rates.
- Manual skill levels, required item quantities, quest states, grind KC, and notable drops.
- Quest-blocker recommendations that create linked skill, prerequisite-quest, and item grinds.
- Skill goals with RuneLite-derived completion and editable target levels.
- Chain-aware banked-XP planning for Herblore, Prayer, Construction, Crafting, Smithing, Fletching, Cooking, Firemaking, Farming, and Runecraft.
- Goal deletion, account sign-out, and permanent account-data deletion.
- Generated ten-minute RuneLite linking codes and plugin snapshot/loot ingestion.
- RuneLite-authoritative RSN, account mode, combat level, total level, and profile-scoped skill synchronization.
- Reversible goal completion with 15-second dashboard/RuneLite status synchronization.
- Server-enforced public profiles and per-goal, per-drop, per-section, and per-Collection-Log-item showcase controls.
- Profile-scoped, offline-safe Collection Log ingestion from RuneLite's authoritative native search results.
- Local demo fallback when Supabase environment variables are absent.

## Before a public launch

- Deploy the web app over HTTPS and configure the production Supabase Site URL and callback allow-list.
- Set a real contact value in `IRON_PATH_WIKI_USER_AGENT` and schedule the catalog sync.
- Add rate limits to authentication-sensitive, linking, snapshot, loot, and catalog endpoints.
- Add error monitoring, structured logs, backups, privacy policy, and terms.
- Run browser-level tests against a separate Supabase test project.
- Exercise a full RuneLite link, snapshot, logout, reconnect, and duplicate-loot sequence on a real account.
- Test keyboard navigation and current Chrome, Firefox, Safari, and mobile widths.

## Product follow-ups

- Character rename history, manual reordering, and linked-device management across journals.
- Goal rename, duplicate, drag-to-reorder, archive, and richer completion history.
- Quest-item alternative editing and importer warning review tools.
- Additional niche banked-XP methods, player-defined conversion recipes, and explicit drag-to-prioritize controls.
- Historical KC/loot charts, Collection Log change history, and configurable notable-drop filters.
- Social preview images and optional vanity showcase URLs.
- Plugin Hub submission metadata, screenshots, support links, and review fixes.

## MVP acceptance check

The implemented flow supports:

1. Sign in, create multiple characters, and switch between isolated journals.
2. Add a Wiki quest and view levels, subquests, and required items.
3. Manually update those requirements and keep the changes after reload.
4. Create an item grind, set baseline KC, record drops, and choose visible trophies.
5. Follow a quest recommendation into a linked skill goal and review the calculated banked path.
6. Create a banked-XP target, select compatible methods, and verify intermediate resources are consumed once.
7. Sync a Collection Log from RuneLite and publish only selected sections or obtained items at `/showcase/[slug]`.
8. Link each RuneScape profile once and verify RuneLite updates its correct journal and detected account mode.
9. Delete one journal without affecting the others, or permanently delete the entire account.
