# Implementation Handoff — run-file-change-live-cache-race (autobyteus-180)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route. The design is `Small` / `Low`, so there is no independent architecture review. After implementation, `get_handoff_rules` matches the "Small or Medium and Low, self-review complete" rule, which goes to `/software_engineering_team/api_e2e_engineer`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/`
- Requirements doc: `requirements-doc.md` (Approved, SR-002)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-002, `Ready`)
- Supplemental task artifacts: `probes/race-disk-probe.test.ts.txt`, `probes/race-disk-probe-run1.txt`; Task attachment `ctx_d2a07083e8fc__API-08-run-file-change-cache-race.probe.test.ts.txt` (evidence only)
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable` (direct route)
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race`, branch `codex/run-file-change-live-cache-race`, base `origin/personal` @ `87732d5504`.
  - `c2bd6991b0` fix(server): keep a running agent's recorded files when a first read overlaps
  - Ticket documents and evidence: the docs commit that follows (its hash is in the handoff message).

`RunFileChangeService.load` now fills the live cache after its stored read only if the cache is still empty. Otherwise it returns a copy of the newer cache. If the run was detached meanwhile, it returns the stored projection without caching it (the existing guard). Reads still never wait for the event queue. Because `handle` gets the current cache from `load`, the next FILE_CHANGE no longer writes a stale projection to `file_changes.json`. Three regression unit tests were added. The owner-scoped E2E no longer waits for the stored record: it reads members live as soon as they write.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - One private method changed: 14 lines in `run-file-change-service.ts`.
  - No API, persistence-shape, ownership or deployment change, and no new lock or queue.
  - Only `load`, `handle` and `clear` touch `projections`, so no other writer exists, and reads do not wait on the queue. Neither escalation trigger fired.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`, see "Lightweight Self-Review" below.
- New design impact or escalation trigger: `None`

## Lightweight Self-Review

- The fill rule matches the design's Concrete Examples line for line: stored read, then the detach guard, then the newer cache, then the fill.
- **Every interleaving of a read and the first event, after the change:**
  - Event before read: the read hits the cache.
  - Read misses, event fills the cache and records, then the read returns: the read returns the newer cache. This is the AC-001 case.
  - The event's own `load` misses while a read's stored read fills the cache first: the event's `load` returns that cache, upserts and persists, so nothing is lost.
  - Two reads miss together: the first to return fills the cache and the second returns it. Tested.
- **Detach:** the guard in `load` is kept, and the guard in `handle` is unchanged. The existing tests "does not re-cache a run whose FILE_CHANGE handling finishes after detach" and "drops the live projection when the run is detached" pass.
- **R-001 (re-attach within one disk read):** still accepted as contrived, per the design.
- `handle`, `enqueue`, `attachToRun`, `clear` and the reader APIs are unchanged. There are no new fields, branches for old shapes, or compatibility paths.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | A first read that overlaps the first file change no longer hides the file (REQ-001) | `RunFileChangeService.load`: after `readStored`, returns the cache if it is already filled; fills it only when empty | Implemented. Unit test AC-001 fails on base and passes now. The E2E without the wait passed 20/20 runs; with the old `load` it failed 3/10 |
| BEH-002 | The next file change persists every entry (REQ-002) | `handle` → `load` (now never stale) → upsert → cache → `writeProjection` | Implemented. Unit test AC-002: on base the saved record held only the second file; now it holds both, as do the live list and a fresh read after detach |
| BEH-003 | Behavior without overlap is preserved (REQ-004) | Unchanged paths | Existing service, projection-service and integration tests pass (see Checks Run) |
| BEH-004 | Detach handling is preserved (REQ-004) | Detach guard kept in `load`; `handle` unchanged | Existing detach tests pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. There is no client store change, no change to other caches, and no repair of past losses.

## Key Files Or Areas

- `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`: `load` fill rule and its doc comment.
- `autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-service.test.ts`: new describe block "a first read that overlaps the first FILE_CHANGE (autobyteus-180)" with three tests (AC-001, AC-002, and two concurrent first reads). The first stored read is gated, as in the probes. The reader is started before the event, so it is always the first caller, which makes the test deterministic.
- `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts`:
  - The workaround comment, `storedChangesOf` and `recordedOnDisk` are removed, along with the unused `fsp` import.
  - The wait before each member's list is removed; the existing list poll covers it.
  - The two waits before delegation are replaced with `listedLive`, a poll of the owner's live list. They still keep the scripted agent's write turn before its delegate call, and the first live read now overlaps the first file change, which is exactly the case the fix covers.

## Important Assumptions

- The two waits before delegation were there to order the scripted agent's turns (its write finishes before it delegates), not only as the race workaround. So they are replaced with a live-list wait instead of being dropped. The design said to remove the helper's call sites, and I recorded this choice here.

## Known Risks

- R-001 (accepted): a run detached and re-attached within one disk read.
- R-002: entries lost before the fix cannot be restored. The release-notes line is delivery's job.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the invariant ("while attached, the cache is never replaced by an older stored read") is now enforced at the one fill point.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The E2E workaround is removed.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (`storedChangesOf`, `recordedOnDisk`, the `fsp` import)
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (delta of 14 lines)
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`. The `file_changes.json` shape and its reader are unchanged.
- Direct-use evidence or discard/rebuild result, when applicable: existing records are read as before (the existing unattached-read and detach tests pass).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install` and server `prebuild` were already done (by the Solution Designer). I ran `test:integration:prepare` before the integration test.
- The gated E2E uses the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`) with no inference, a fresh temporary `HOME` for each run, and `env -i`, as the test header says.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/run-file-changes/run-file-change-service.test.ts --no-watch` before the fix (red) | base `87732d5504` src + new tests (working tree) | macOS, node v22 | `RunFileChangeService.load`/`handle` | AC-001, AC-002 | Fail as expected (3 new tests) | `evidence/IMP-01-regression-tests-red-on-base.log` | `Tests  3 failed \| 8 passed (11)`; `expected [ 'src/two.txt' ] to deeply equal [ 'src/one.txt', 'src/two.txt' ]` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | `c2bd6991b0` | macOS | server `src` | — | Pass | `evidence/IMP-02-server-typecheck.log` | `exit=0` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | `c2bd6991b0` | macOS, test isolation | all server unit tests, including the 3 new regression tests and the existing service/detach tests | AC-001, AC-002, AC-004 | Pass | `evidence/IMP-03-server-test-unit.log` | `Test Files  742 passed \| 4 skipped (746)`, `Tests  6082 passed \| 7 skipped (6089)`, `exit=0` |
| IMP-04 | Gated owner-scoped E2E ×20 in sequence (command in the log header) | `c2bd6991b0` | macOS, `env -i`, fresh temporary HOME per run, scripted AGY CLI | real Studio HTTP/GraphQL with Team and Org roots; live member reads overlapping first file changes | AC-003 | Pass | `evidence/IMP-04-owner-scoped-e2e-loop-20.log` | `SUMMARY: 20 passed, 0 failed of 20 consecutive runs` |
| IMP-05 | Control: the IMP-04 loop ×10 with the base `load` temporarily restored (restored afterwards) | E2E from `c2bd6991b0`, service file from `87732d5504` | same | same | AC-003 sensitivity | Fails as expected (3/10) | `evidence/IMP-05-owner-scoped-e2e-loop-control-unfixed.log` | `SUMMARY: 7 passed, 3 failed of 10 runs on the unfixed load`; `Timed out waiting for Team running: configured member /mate (pending): listed` |
| IMP-06 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/run-file-changes-api.integration.test.ts --no-watch` (after `test:integration:prepare`) | `c2bd6991b0` | macOS, test isolation | run-file-changes GraphQL/REST, including the active-run live-read regression case | AC-004 | Pass | `evidence/IMP-06-server-integration-run-file-changes.log` | `Test Files  1 passed (1)`, `Tests  6 passed (6)`, `exit=0` |

- Not run, and why:
  - The full server integration suite: the change is limited to one service method. AC-004 names the run-file-changes integration tests, which ran in IMP-06.
  - Other gated E2E files: they are not affected and are left to API/E2E.
  - The web: not affected.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: this is a server-only change. The visible effect (files no longer missing from a running agent's Artifacts list) flows through unchanged web code.

## Downstream Coverage Hints / Suggested Scenarios

- Re-run the IMP-04 loop on the API/E2E side if desired. It is fast, about 20 s per run.
- Desktop or browser journey: a running team member writes its first file while its Artifacts list is open or hydrating. The file shows and stays listed. After the next file and a stop, both files are in the saved list.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E validation of AC-001..AC-004 at their level. The implementation checks above (including the E2E loop) are implementation-scoped evidence, not API/E2E sign-off.
