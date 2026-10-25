# Delivery / Release / Deployment Report: autobyteus-273 Claude runtime one-hour prompt cache

## Release / Publication / Deployment Scope

Finalize `codex/claude-prompt-cache-ttl` on `personal`, then cut a beta (`v1.5.9-beta.8`, the next unused beta per `scripts/release_versions.py next-beta`) at the user's request. The beta is also where the user checks AC-001 on API billing. `task_size` Small, `architectural_risk` Low, direct route.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `a0c7275db8` (merged into the ticket branch as `69ef2596ca`).
- Deviations from the guide and why: `None`.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/claude-prompt-cache-ttl/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/claude-prompt-cache-ttl/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written on the integrated, checked state `69ef2596ca`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `d8df12435c`
- Latest tracked remote base reference checked: `origin/personal` @ `a0c7275db8` (2026-10-25)
- Base advanced since bootstrap or previous refresh: `Yes` (339 commits)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the validated state `3c085a8cbd` was committed; tree clean apart from untracked `*/dist/`)
- Integration method: `Merge` (`69ef2596ca`)
- Integration result: `Completed`. Two conflicts were resolved: `autobyteus-web/docs/settings.md` (both sections kept) and `autobyteus-server-ts/tests/unit/projects/project-task-index-status.test.ts` (both sides widened the same window; kept 400 ms and the comment that matches the product timer).
- Post-integration executable checks rerun: `Yes`
  - DEL-01: focused server unit tests, 123/123.
  - DEL-02: server typecheck, exit 0.
  - DEL-03: web focused tests, 110/110.
  - DEL-04: web guards, exit 0.
  - DEL-05: GraphQL settings e2e, 12/12.
  - DEL-06: live subscription cases CPC-E2E-004…006 with real Claude Code, 3/3.
  - DEL-07: full server unit suite, 6902 passed and 7 skipped, exit 0.
  - Logs: `evidence/delivery/`.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (checked again before the final merge; see Repository Finalization)

## Verification

- Evidence judged: `Sufficient` for everything provable without the user. AC-001's API-billed bucket effect is a user check, by the user's decision.
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (API-REV-002, final confidence 95%, no category below 95%), the files below opened and checked, and the integrated-state reruns DEL-01…07. Nothing was mocked; the Claude CLI 2.1.308, the Agent SDK, the Anthropic API (subscription) and the browser stack are real.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001 | API-10 `CPC-E2E-004.json`; DEL-06 `CPC-E2E-004.json`; API-07 `API-07-10-live-suite.log`, `API-07-blocker-anthropic-key-check.log`; API-01 (IMP-01) | Spawned CLI `oneHourVariable "1"` (both runs). API-billed cases: `[live provider skip] … Credit balance is too low`; key check: `"Your credit balance is too low to access the Anthropic API"` (two request IDs, 2026-10-22 and 2026-10-25) | Proven: the variable reaches the real spawn in every auth mode. The API-billed bucket effect: User Check (the user's decision, 2026-10-25) |
| AC-002 | API-14 `CPC-E2E-006.json`; DEL-06 `CPC-E2E-006.json`; API-11 P-04 | `oneHourVariable "1"` with `cacheCreation5m 14855 / 1h 0` (DEL-06: 7359 / 0) | Proven |
| AC-003 | API-10, API-13 (`CPC-E2E-004/005.json`), DEL-06 | 1h only, 5m 0, with the toggle on and off | Proven |
| AC-004 | API-11 `result.json` breakdowns, `API-11-P-05-breakdown-run-C.png`; API-03 | `"Cache write 1h"` / `"Cache write 5m"` rows with tokens and costs that match Haiku prices; `browserErrors []` | Proven |
| AC-005 | API-12; docs sync on the merged state | Docs match the measured behavior; one sentence widened after the merge | Proven |
| AC-006 | API-06 `API-06-server-settings-graphql-e2e.log`, DEL-05 (12/12); API-13 / DEL-06 `CPC-E2E-005.json` (`setting "false"`, `oneHourVariable null`); API-11 P-01…P-04 | Only `true`/`false` accepted; the next spawn follows the saved value without a restart | Proven |

- More evidence requested: `None`.
- User check needed: `Yes`. API/E2E tried api-key mode through the product, the core client with the same key, and a recheck on 2026-10-25. Each was refused for the test-vault key's credit balance. No other API-billed account may be used for tests (TESTING.md rule 4); the only funded API billing is the user's own account. The user decided on 2026-10-25: "We let it pass and we release a new beta", checking on that beta.
- User check reference: execution report, Acceptance-Criteria Proof, AC-001 row; `handoff-summary.md` "The User's Check". A 5m result is a `Design Impact` for the Solution Designer.
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `Beta`
- Decided by: the user, 2026-10-25 (recorded in `api-e2e-revision-record.md` API-REV-002): "We let it pass and we release a new beta."

## Docs Sync Result

- Docs sync artifact: `tickets/done/claude-prompt-cache-ttl/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/llm_management.md` (spawn list after the merge); `autobyteus-web/docs/settings.md` (merge resolution). The implementation wrote the ticket's docs (`llm_management.md`, `token_usage.md`, web `settings.md`, `agent_execution_architecture.md`).

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/done/claude-prompt-cache-ttl/` (on `personal` after the merge)

## Version / Tag / Release Commit

Pending at archive time; recorded after finalization in DR-001's delivery record commit on `personal`.

## Repository Finalization

Pending at archive time; recorded after finalization in DR-001's delivery record commit on `personal`.

## Release / Publication / Deployment

Pending at archive time; recorded after finalization in DR-001's delivery record commit on `personal`.

## Post-Finalization Cleanup

Pending at archive time; recorded after finalization in DR-001's delivery record commit on `personal`.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: none. A beta uses GitHub generated notes (RELEASE.md), so `release-notes.md` is not required.
- Archived release notes artifact used for release/publication: not applicable
- Release notes status: `Not required`

## Deployment Steps

None: this repository deploys no hosted service. The server rollout is the published Docker image (`autobyteus/autobyteus-server:1.5.9-beta.8`, and `:beta` when it is the newest tag). Desktop installs with **Receive beta updates** on get the beta through the auto-updater.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` (a new optional server setting; absent = on; existing token records already hold the 5m/1h split).
- Delivery action required: `None`
- Result and evidence: API-11 P-01 and API-06 (a fresh data root without the key behaves as on).

## Verification Checks

- Before tagging, on the merged `personal` state: `python3 scripts/check_licensing.py` and `python3 scripts/check_repository_artifact_hygiene.py` (results under Repository Finalization).
- After tagging: the four release workflows and the 17 GitHub release assets (results under Release / Publication / Deployment).

## Rollback Criteria

- Roll back if Claude-runtime sessions fail to start or behave differently because of the spawn environment. Per RELEASE.md: revert the merge on `personal` and cut a new beta. There is no data migration, so rollback is possible.
- A faster mitigation needs no release: switch **Claude runtime → One-hour prompt cache** off in Server Settings. AutoByteus then adds nothing, as before this change.
- If the user's check shows 5m writes on API billing, that is not a rollback case: nothing breaks. It is a `Design Impact` for the Solution Designer.

## Final Status

Pending at archive time; recorded after finalization in DR-001's delivery record commit on `personal`.
