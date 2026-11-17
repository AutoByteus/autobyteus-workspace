# Handoff Summary

## Summary Meta

- Ticket: `member-runtime-lost-508` (Project Task `autobyteus-508`)
- Date: 2026-11-17
- Route: `task_size=Small`, `architectural_risk=Low`, direct low-risk route. No architecture review and no source code review (both `N/A — not applicable`); implementation self-review, API/E2E validation and delivery verification applied.
- Current status: verified from the evidence; finalized into `origin/personal` (commits in the release/deployment report). No release: none was asked for. REQ-004 (release before 461 reaches a stable release) stays open and is the founder's decision; see Release Notes Status.
- Solution revision: SR-001 (requirements approved by the founder, 2026-11-17)

## Delivery Summary

- Delivered scope:
  - The 461 data conversion (`20261111_delegated_runs_own_runs_v1`, and the `20261114_*` follow-ups that reuse it) now turns a delegated run's saved Settings edit into the run's own launch whole: the edit's agent runtime when it names one (else the runtime the run started with), its model and its model settings. A member switched to Codex App Server + gpt-6.1-terra stays on Codex App Server. One production file changed: `autobyteus-server-ts/src/app-data-migrations/migrations/delegated-runs-own-runs-v1/run-file-conversion.ts` (one `withEdit` rule used by the team-member, team-level-edit and delegated-agent-run paths).
  - Every edited run or member records the Settings source (`{ origin: "settings", fallbacks: [] }`), as a live Settings save does, so Settings no longer shows it as "Inherited from the run". Unedited members keep their recorded source; pending runtime switches are kept beside the new runtime so the next input makes the switch real.
  - Same migration IDs, no new migration, no registry change: installations that have not converted yet are corrected; installations that already finished the conversion are not reconverted (data migration guideline section 7).
  - Tests: new released-shape fixtures and migration cases for AC-001…AC-006 (`tests/app-data-migrations/delegated-runs-own-runs-v1/`), and a new durable startup case DRO-4 in `tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts` that starts the built server on a test-owned data root and reads each edited run back through its GraphQL rows.
- Deferred / not delivered:
  - Repair of the founder's already-converted records (node 8001 and the desktop's own node): the founder does it himself in Settings (stop the member, choose runtime and model, Save) — his decision DEC-003, 2026-11-17. The team did not read or change his data.
  - FU-001 (non-urgent, in `follow-ups.md`): show a stored model its runtime does not offer in Settings and refuse its activation with one clear message. Only the founder's converted data can hold such a pair after this fix.
- Key architectural or ownership changes: none. The conversion's edit rule now lives once, in the migration folder; no application code, schema, reader or registry changed.
- Removed / decommissioned items: `withSelection` and the inline agent-run mapping in the conversion (replaced by `withEdit`).

## Verification Summary

- Verified from the evidence by delivery (no user check was needed or asked): see the release/deployment report's Verification table.
- API/E2E: `Pass`, final confidence 96.3%, `API-REV-001`, no category below 95%. Main proof: DRO-4 starts a fresh `dist/app.js` on an install where every earlier migration had completed, with hand-built ≤ beta.6 runtime edits assigned through Tasks; each edited run and member shows the chosen runtime, model and settings, source `settings`, `ownSource: true`, in the manager's `runTree` rows; the unedited member keeps `agent_default`; a second start changes nothing (`evidence/API-06-07-startup-e2e.log`: `Tests  3 passed (3)`; JSON key `dro4`). The same case run against a build of the conversion before the fix fails with the founder's exact symptom, `claude_agent_sdk` + `gpt-6.1-terra`, source null, `ownSource: false` (`evidence/API-07R-dro4-red-on-old-conversion.log`). A probe shows each converted record equals what a live Settings save writes from the same launch, and that the activation's commit accepts a converted pending switch (`evidence/API-08-live-save-equivalence-probe.log`).
- Delivery: no new base commit, so no integrated-state rerun was needed (`origin/personal` still at the commit the branch was cut from). Delivery opened the code diff, the key log lines and the `dro4` JSON, and judged them sufficient.
- Residual risk: a converted Codex run was not woken live (TESTING.md forbids waking a converted run against real runtime sessions); the commit path is unchanged code, and API-08 covers the shape it receives.

## Documentation Sync Summary

- Docs sync artifact: `docs-sync-report.md`
- Docs result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/run_history.md` (what the conversion does with a Settings edit), `TESTING.md` (migration fixtures change every field of a combined released value), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (section 10 lesson row)

## Release Notes Status

- Release notes required: `No`. No release was requested and the release guide's default is no release. There is nothing users must do.
- **Open release gate REQ-004 (for the founder):** the corrected conversion must be released before 461 reaches a stable release, so stable users convert once and correctly; only the founder's own installations hold wrong data today (beta.7 carries the first version of the conversion). Release only on his word. The latest tag is `v1.5.13-beta.7`. A beta or stable release is available on request and follows `RELEASE.md` ("Cutting The Release" including recording the `RELEASED` migration set; the release smoke check). A release adds no migration, so `RELEASED` stays as it is.
- If it ships, its notes should say, in user terms: delegated runs and team members you had switched to another agent runtime in Settings keep that runtime when you upgrade, and show as your own Settings edit. Installations that already upgraded to a beta containing the first version are not changed by the fix (see the next item).
- Rollback note for any release notes: the conversion is one-time and its output is not rolled back; the fix applies only to installations that have not yet run it.

## User Verification Hold

- Waiting for explicit user verification: `No`
- Why: API/E2E proved every critical acceptance criterion through the built server and a live-save equivalence probe, nothing was marked for the user, and the behavior is settled by the approved requirements. The founder's own repair of his converted records (DEC-003) is his task and does not gate this delivery.

## Finalization Record

See `release-deployment-report.md` (Repository Finalization, Post-Finalization Cleanup) and `delivery-revision-record.md` DR-001.
