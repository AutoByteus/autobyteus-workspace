# Docs Sync

## Result

- Status: `Updated`

## Updated Files

- `autobyteus-web/docs/messaging.md`
- `autobyteus-web/docs/settings.md`

## Summary

- Updated messaging setup docs to describe `AGENT` vs `TEAM` binding selection.
- Documented that TEAM bindings target team definitions plus saved team launch presets.
- Documented that inbound team messages lazily create and later reuse the cached team run.
- Documented the coordinator or entry-node-only reply policy for team bindings.
- Stronger Stage 7 verification did not require additional user-facing docs beyond the updates above.
- The member-runtime TEAM reply-bridge fix did not require additional user-facing docs beyond the coordinator-only reply policy that is already documented.
- The untouched-member projection/logging hardening slice did not change user-visible product behavior, so no further docs updates were required.
- The TEAM live-stream external-user-message fix restores expected open-run UI parity and did not require further docs updates beyond the existing messaging/team guidance.
- The TEAM history-selection refresh fix restores stale reopen behavior in the web client and did not require further docs updates beyond the existing messaging/team guidance.
- The latest lifecycle clarification is now documented: cached agent/team runs are reused only while the bot-owned run remains live in the current server session; after restart or inactive cached state, the next inbound message starts a fresh bound run.
- The new work in this slice is test-only coverage, so no additional docs updates were required.
- The latest callback-verification slice on top of the merged personal branch added only a one-line build regression fix and stronger server-side regression timing, so no additional user-facing docs updates were required.
- The AGENT callback symmetry slice added only test coverage, so no additional user-facing docs updates were required.
- The final broader deep review pass found no new user-facing behavior beyond what is already documented for TEAM binding selection, coordinator-only replies, and active-only cached-run reuse.
- The live TEAM reselection parity fix restores expected workspace behavior but does not change the documented user-facing messaging or setup contract, so no further docs updates were required.
- The reasoning-burst streaming fix only restores expected in-turn segmentation of existing live output and does not change the documented messaging/setup contract, so no further docs updates were required.
- The typed frontend segment-identity helper is an internal cleanup only and does not change the documented messaging/setup contract, so no further docs updates were required.
- The selective TEAM callback-propagation fix only preserves coordinator reply continuity for already bot-origin conversations and does not change the documented coordinator-only outward reply contract, so no further docs updates were required.
- The v5 active-runtime synchronization refactor changes internal workspace state ownership only; it does not change the documented user-facing messaging setup or reply contract, so no further docs updates were required.

## Notes

- Added `autobyteus-server-ts/prisma/migrations/20260310153000_add_channel_binding_team_definition_id/migration.sql` so SQL-backed environments match the checked-in TEAM binding schema used by setup and ingress.
- `autobyteus-web/generated/graphql.ts` was manually synchronized for the affected messaging setup operations because live-schema codegen was not available in this environment.
- No server-side public API docs required separate updates for this slice beyond the checked-in GraphQL contract changes.
