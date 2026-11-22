# API/E2E Coverage Investigation — grok-release-smoke-551

## Investigation Meta

- Requirements Doc: `tickets/in-progress/grok-release-smoke-551/requirements-doc.md` (approved SR-001)
- Investigation Notes: `tickets/in-progress/grok-release-smoke-551/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/grok-release-smoke-551/solution-revision-record.md` (SR-001, SR-002)
- Design Spec: `tickets/in-progress/grok-release-smoke-551/design-spec.md` (SR-002)
- Supplemental Task Artifacts: `evidence/SD-probes-2026-11-22.md` and its probe scripts (P1–P17)
- Design Review Report: `tickets/in-progress/grok-release-smoke-551/design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `tickets/in-progress/grok-release-smoke-551/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/grok-release-smoke-551/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/grok-release-smoke-551/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/grok-release-smoke-551/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `tickets/in-progress/grok-release-smoke-551/code-review-revision-record.md`
- API/E2E Revision Record: `tickets/in-progress/grok-release-smoke-551/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (reviewed route, Medium/High)
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 (AC-001, AC-002): Grok discovery and Grok run start-up wait at least 90 s for `initialize` (`AGENT_START_TIMEOUT_MS`, `DISCOVERY_TIMEOUT_MS`); other ACP requests 30 s; session opens 120 s; Grok CLI probes 10 s. A Grok that never answers still fails with the current error.
- REQ-002 (AC-003, AC-004): discovery keeps Grok up to 3 s after `initialize` for `_x.ai/models/update` and offers the announced list (listener attached before `initialize`; the wait never becomes a time-out).
- REQ-003 (AC-005): Grok run processes get `GROK_FOLDER_TRUST=0`; discovery and billing do not; `--trust` never passed; the user's `~/.grok/trusted_folders.toml` unchanged (QR-002).
- REQ-004 (AC-006): two `release_smoke.py` runs at load ≥ 40 made by a concurrent build/test run pass the Grok cases; Grok's start-up times from its log (`phase`, `elapsed_ms` only).
- DEC-004 (Solution Designer, decided): a live Grok start-up above 30 s cannot be produced on demand; the scripted proof of the bounds plus the loaded live smoke is accepted; a live > 30 s start-up, if one occurs, is recorded as live proof. AC-003's stale live case falls under DEC-004 too if the ≥ 6 h idle period cannot be arranged.
- QR-003: no Grok credential file read; evidence log lines carry no token/key fields.

## Supported Scenarios And Real Usage

- SCN-001..005 of the requirements.
- Real-use detail added: the stale catalog occurs only on Grok's first start after ≥ 6 h without Grok use (P15). The run-start path and the model-list path are separate reads: a run's creation opens the run's own Grok process (30 s → 90 s bound), while each model-list read is a fresh discovery (15 s → 90 s), with no cache (`grok-build-model-catalog.ts`).
- Contrived/unsupported: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002 start-up bounds | Changed | REQ-001 | unit (IMP-01, fake clock); new scripted E2E through the real server with a 35 s late `initialize`, plus a base control |
| BEH-003 announced catalog | Changed | REQ-002 | unit (IMP-01); live fresh case (IMP-04); live stale case in the first smoke (Grok log) |
| BEH-004 run trust | Changed | REQ-003, DEC-003 | unit (IMP-01); live AC-104 ×3 + trust-list hash (IMP-03); the smoke's AC-104 case |
| ACP connection listener + renamed bounds (Grok and DeepSeek) | Changed | design | Grok replay suites; DeepSeek scripted provider |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | discovery helper, Grok capability, launch profile | IMP-01 | — | — |
| API / transport / contract | Yes | ACP connection (bounds, connection-wide notification listener) | IMP-01 | real-server path with a late agent | scripted E2E (API-01) |
| Process / lifecycle | Yes | Grok process start under load | unit (fake clock) | live Grok under load | release smoke at load (API-04) |
| Security | Yes | per-process trust for runs | unit; IMP-03 | — | smoke's AC-104 case; trust-list hash |
| External integration | Yes | Grok 1.0.92 catalog announcement, trust env | IMP-03, IMP-04 | stale catalog live | first smoke after ≥ 6 h idle |
| Frontend | No | — | — | — | — |
| Persisted data | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-release-smoke-551`, branch `codex/grok-release-smoke-551`, code `5054f97a17`, HEAD `ab1eaf376b` (documents), then this round's test commit `83488cecb9`.
- Testing guideline: `TESTING.md`; `RELEASE.md` "Release smoke check" (`python3 scripts/release_smoke.py` from the repository root after `pnpm install` and `prebuild`; Grok free tier ≈ two runs per 24 h; a quota refusal is a runtime that cannot run).
- Conflict noted: TESTING.md "One heavy run at a time" vs AC-006's "load made by a concurrent build/test run": AC-006 governs for the two smoke runs (the load is the condition under test).
- Changed build-input paths: None → no fresh-start build.
- Secrets: signed-in `claude`, `codex`, `grok` (host logins); no credential file read.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/runtime-management/acp/acp-client-connection.test.ts`, `acp-discovery-handshake.test.ts`, `grok/grok-build-capability.test.ts`, `grok/grok-build-launch-profile.test.ts` | bounds, listener, announcement, trust env | AC-001..003, AC-005 | Still Valid | IMP-01 (+ base controls) | Reused |
| `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` | Grok runtime through the real server, scripted | AC-001, AC-002 | Needs Update | no case with a late `initialize` through the server | add one (API-01) |
| `grok-build-compaction-replay.e2e`, `deepseek-harness-scripted-provider.e2e` | ACP suites (shared connection and 90 s start bound) | REQ-005-like preservation (BEH-002 preserved column) | Still Valid | not run upstream | API-02 |
| `tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` (live, the smoke's live suite) | AC-104 and the skill-link cases | AC-005, AC-006 | Still Valid | IMP-03 | run through the smoke (API-04) |
| `tests/e2e/runtime/grok-build-live-runtime.e2e.test.ts` (org `ROOT_LIFECYCLE` 15 s wait) | live Grok parity | — | Still Valid by reading; not in the smoke | review note | not run (Grok quota reserved for AC-006) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001..003, AC-005 (unit) | connection, discovery, capability, launch profile | Reused | IMP-01, IMP-02 | same code commit |
| API-R2 | AC-005, QR-002 | live AC-104 ×3, trust-list hash | Reused | IMP-03 | same code |
| API-R3 | AC-003 (fresh), QR-001 | live discovery timing | Reused | IMP-04 | same code |
| API-01 | AC-001, AC-002 | real server + scripted Grok answering `initialize` after 35 s; base control | Durable (add) | `vitest run tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` | the bounds end to end without depending on Grok's random slowness |
| API-02 | BEH-002 preserved; shared connection | Grok compaction replay; DeepSeek scripted provider (real dsh) | Existing Test | the two files | the connection and start bound are shared |
| API-03 | — | typechecks | Existing Test | both | test edit |
| API-04 | AC-006, AC-003 (stale), AC-004, AC-005 | release smoke ×2 at load ≥ 40 (concurrent `test:unit`), Grok log extract (allow-listed fields) | Journey | `evidence/API-04-smoke-run.sh`; run 1 after ≥ 6 h of Grok idle (last use 08:16:48Z → not before 14:17Z) | the ticket's goal |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` ("waits for a Grok that answers initialize after 35 s …") | the release-smoke failure mode (15 s / 30 s) reproduced deterministically; fails on the base source |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| A live Grok start-up above 30 s | Grok's slow step cannot be produced on demand (DEC-004) | covered by API-01 and units; recorded live if it occurs | No | DEC-004 (decided) |
| `grok-build-live-runtime.e2e` org `ROOT_LIFECYCLE` 15 s wait | not part of the smoke; Grok quota reserved for AC-006 | Low (predates the change; a ~3 s longer start) | No | noted for delivery |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-01)
- Reroute Required: `No`
