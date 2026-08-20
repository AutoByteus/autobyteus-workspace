# Docs Sync Report

## Scope

- Ticket: `token-statistics-persistence`
- Trigger: Implementation source review `CRR-001` Pass at `9.6/10`
  (`95.8/100`), API/E2E `API-REV-001` Pass at `97.3%`, and proportional
  durable-test review `CRR-002` Pass with no findings. Current correction
  authority supersedes that baseline: `CRR-004` source Pass at `96.2/100`,
  `API-REV-003` Pass at `98.3%`, and `CRR-005` durable-test Pass with no
  findings on implementation commit `0ce9d17b7`.
- Bootstrap base reference: `origin/personal` at
  `1b2e9b94d1de3b7f38aa2803082e0166a469a978`.
- Initial integrated base reference used for docs sync: refreshed
  `origin/personal` at `3b81b5ebdc4c5eae64e221aff9c578adc7e7fb74`,
  merged without conflict into the ticket branch as
  `f0ddf442569b6bd9eecd590516506bc0bccd9bbc`.
- Later handoff refresh: `origin/personal` advanced again to
  `fc5ce18bc202012280dcbf5b4bcd6c5c52948ad6`. Delivery checkpointed its docs
  and package handoff as `d057fb7ab`, merged the ten new commits without
  conflict as `6076fb2d0d192b5da38877a18c8c10e1abab3d58`, and confirmed the incoming
  Team Task Conversation documentation coexists with the Token Meter updates.
- Post-integration verification reference:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/done/token-statistics-persistence/delivery-evidence/dr-001-integration-refresh.txt`
  and
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/done/token-statistics-persistence/delivery-evidence/dr-001-post-integration-web-focused.log`.
- Second-refresh verification reference:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/done/token-statistics-persistence/delivery-evidence/dr-003-post-second-integration-web-focused.log`
  — the combined Token Meter and incoming Team UI suite passed 9 files / 51
  tests.
- Corrected-state DR-004 refresh: `git fetch origin personal` left the target
  unchanged at `fc5ce18bc202012280dcbf5b4bcd6c5c52948ad6`; corrected HEAD
  `0ce9d17b75195b0142abadc4593f6fea47893be0` remained 6 ahead / 0 behind with
  the target as its exact merge base. No post-merge rerun was needed because no
  merge occurred and API-REV-003 had validated that exact HEAD. Evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/done/token-statistics-persistence/delivery-evidence/dr-004-corrected-state-initial-refresh.log`.

## Why Docs Were Updated

- Summary: The long-lived Token Meter docs still described an individual cache
  as accepting live deltas as complete hydration and a record-backed Team total
  as being extended blindly by later live contributions. The integrated
  implementation instead admits only complete GraphQL or post-persist
  cumulative snapshots for standalone/member caches, orders them with
  `usageReportCount`, keys Team members by exact TeamRun/AgentRun identity, and
  refreshes Team aggregates until a stable generation is observed.
- Why this should live in long-lived project docs: These are governing cache,
  transport, and concurrency invariants for future token-usage changes. Leaving
  the former live-delta description in canonical server/frontend docs would
  invite the same restart/reopen defect, stale response overwrite, cross-Team
  identity leakage, or double-counted Team totals.
- Corrected-state addition: The implementation failure exposed a second durable
  boundary rule: the public current-run summary builder must explicitly narrow
  the broader statistics aggregate. Spreading the aggregate leaks internal
  `observed_*` diagnostics and causes fail-closed strict Team transport
  rejection even though persistence succeeds.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/docs/modules/token_usage.md` | Canonical server token persistence, GraphQL, live-event, frontend-contract, and operational documentation. | `Updated` | Records `run_summary_after_event` authority plus the corrected exact public-summary projection that excludes statistics-only `observed_*` diagnostics. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/docs/agent_execution_architecture.md` | Canonical runtime-sidecar architecture for the Token Meter. | `Updated` | Documents the record-backed cache/generation model, exact builder narrowing before transport branching, fail-closed DTO rule, and production-builder regression seam. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/docs/settings.md` | Durable settings/runtime architecture mirror containing the same Token Meter section. | `Updated` | Kept synchronized with `agent_execution_architecture.md`, including the corrected exact-projection rule. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/docs/modules/README.md` | Token Usage module discovery and common persistence-owner summary. | `No change` | It already points to the canonical module doc and accurately states the one-current-row, migration-only legacy boundary. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/README.md` and subproject READMEs | User setup, build, release, and general persistence guidance. | `No change` | This change does not alter setup, commands, schema deployment, configuration, packaging, or release operation. Detailed runtime truth belongs in the existing Token Usage architecture docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/docs/modules/token_usage.md` | Server architecture/runtime contract | Documents the post-persist cumulative snapshot, missing/unsafe fallback, explicit canonical field projection, exclusion of aggregate-only diagnostics, exact identity, monotonic generations, stable Team refresh, and built-process direct-use evidence. | Align the canonical server/frontend boundary with corrected implementation `0ce9d17b7` and the `Directly Usable — No Migration` decision. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture | Documents record-backed caches, exact builder narrowing before transport branching, fail-closed strict DTOs, production-builder seam coverage, higher-only generations, exact member identity, and Team convergence. | Prevent recurrence of the real Team red-rejection defect as well as cache-readiness/race regressions. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/docs/settings.md` | Frontend architecture mirror | Applies the same corrected Token Meter runtime and coverage wording. | Avoid contradictory durable documentation for the same store. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Post-persist event authority | `run_summary_after_event` is the complete cumulative current-record projection after a successful fold, not a new-process delta. Missing/unavailable projections do not become complete cache entries. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`, both web architecture docs |
| Individual cache readiness | Standalone and member summaries are hydrated only by GraphQL or a valid cumulative event snapshot; Team members require exact TeamRun/AgentRun identity. | Same package plus `api-e2e-test-review-report.md` | Both web architecture docs; server frontend contract |
| Snapshot ordering | `usageReportCount` is the monotonic generation; equal or older individual summaries cannot replace a newer record-backed entry. | `design-spec.md`, implementation/review/test artifacts | Both web architecture docs; server frontend contract |
| Team aggregate convergence | Before hydration, events can form `live_partial`; after hydration, live traffic creates `refresh_required`, and one in-flight GraphQL path repeats until a stable generation can become `record_backed`. | `design-spec.md`, `implementation-handoff.md`, API/E2E browser race/concurrency evidence | Both web architecture docs; server frontend contract |
| Exact public summary projection | The public summary builder explicitly selects canonical summary fields from the broader aggregate. Statistics-only observation arrays remain internal and strict DTOs are not loosened to accept them. Durable Team transport coverage must use the production builder chain and final strict parser. | `implementation-handoff.md` IR-002, `code-review-report.md` CRR-004, `api-e2e-execution-coverage-report.md` API-REV-003, `api-e2e-test-review-report.md` CRR-005 | Server Token Usage module doc and both web architecture mirrors |
| Existing persisted data | Current `token_usage_run_records` remain directly usable through restart; no schema/data migration, row rewrite, or duplicate fold is required. | `requirements.md` AC-009, `design-spec.md` persisted-data decision, API-TS-006 evidence | `autobyteus-server-ts/docs/modules/token_usage.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Any individual live-created delta entry being treated as durable hydration | Record-backed-only standalone/member caches fed by GraphQL or strict post-persist cumulative snapshots | Server Token Usage module doc and both web architecture docs |
| Unconditional GraphQL/live replacement | Higher-only `usageReportCount` generation admission | Server Token Usage module doc and both web architecture docs |
| Team member cache keyed without the complete root-Team identity | Compound TeamRun/AgentRun member identity validation | Server Token Usage module doc and both web architecture docs |
| Blindly adding later live deltas to a record-backed Team aggregate | Refresh-required transition plus stable-generation, single-flight GraphQL convergence | Server Token Usage module doc and both web architecture docs |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — material durable documentation changes were required.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Present the integrated handoff for explicit user
  verification and hold repository finalization, archival, release, deployment,
  and cleanup until that signal is received.
- Notes: Docs were synchronized only after the initial latest-base merge. When
  the target later advanced again, the two touched architecture mirrors merged
  cleanly with the incoming Team UI documentation, retained all Token Meter
  invariants, and passed the combined 51/51 focused post-integration check.
  DR-004 then revalidated the corrected reviewed/API-tested HEAD against the
  unchanged target and added the exact public-projection/runtime-test rule
  exposed by the resolved CR-001 failure.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A.
- Recommended recipient: N/A.
- Why docs could not be finalized truthfully: N/A; docs sync completed.
