# Implementation Handoff — atomic-agent-run-creation (autobyteus-349)

## Upstream Artifact Package

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/`.

- Upstream review applicability and handoff-rule result: independent architecture review selected (Small / High); ARCH-REV-002 `Pass`. Next: Code Reviewer, per `get_handoff_rules`.
- Requirements doc: `requirements-doc.md` (SR-002, approved by the user; DEC-001 = A with the content check)
- Investigation notes: `investigation-notes.md` (F-01 to F-12; the read-only count of the user's data)
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-004; user approval of the design: Obtained)
- Supplemental task artifacts: `follow-ups.md` (FU-001 to FU-004)
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-004 (design), SR-002 (approval)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A
- Branch `codex/atomic-agent-run-creation`; base `origin/personal` @ `e87e6bb2b1`; code commits `c533fc0b5b` (on `3a317675ca`) and `93fa105819` (architecture-guard entry); docs and evidence in the following commit.

**D1 (REQ-001).** `AgentRunService.createAgentRun` (`agent-run-service.ts`): prepare, then `try { activate } catch (error) { cancel; throw error }`. The cancel is `provisioningService.cancelPreparedAgentRun(runId)`; if it rejects, its error becomes `{ success: false, message }`. A failed or refused cancel logs `Run '<id>' failed to activate and was kept: <reason>`. The original activation error is always rethrown. `prepareAgentRun`, `activatePreparedRun` and the web app's two-step flow are untouched (BEH-003).

**D2 (REQ-002).** `AgentRunProvisioningService.removeEmptyNeverStartedRuns(): Promise<RemovedEmptyNeverStartedRun[]>` (`{ runId, title }`), replacing `cleanupStalePreparedRuns` (removed here and its `AgentRunService` wrapper; the wrapper is now `removeEmptyNeverStartedRuns`). `PREPARED_RUN_TTL_MS` stays (FU-002). For each directory under `agents/`:
1. `metadataService.readMetadataState(runId)`: `unreadable` → warn `Kept run '<id>': its record could not be read: …` and skip; `missing` → skip (counted; see below).
2. Require `preparedAt` set and `startedAt` absent (null or no key).
3. `holdsOnlyItsRecord(runDir)`: `fs.readdir(..., { withFileTypes: true })`, recursive, never following symbolic links (a `Dirent` for a symlink is neither a directory nor a file). Only directories and the top-level regular `run_metadata.json` are allowed; anything else (file, symlink, socket, unknown type) is content. Any error in the walk → warn `Kept never-started run '<id>': its folder could not be fully read: …` and keep.
4. Skip active runs and runs with outstanding commands.
5. Title = the catalog row's `summary` (`getCatalogRow`); `cancelPreparedAgentRun(runId)`; on success log `Removed empty never-started run '<id>' ('<title>')`; on refusal warn and keep.

Each run is checked inside its own `try/catch` (warn `Kept run '<id>': empty never-started check failed: …`), and an unreadable `agents/` root is logged, so it never throws. `preparedAt`/`startedAt` alone is never the removal test.

**Startup.** `server-runtime.ts`: `await shutdown.stage(() => getAgentRunService().removeEmptyNeverStartedRuns())` after `buildStudioServer` (the process `AgentRunService` is bound there) and the existing `checkpoint()`, before `prepareBeforeListen`. As a `stage`, a shutdown during it cancels the later stages.

**One choice beyond the design text:** the design says to log a missing record. Task agents keep their own `run_metadata.json` under the same `agents/` root, and those read as `missing` for a standalone reader (`agent-run-metadata-store.ts`, G1). One warning per such folder would print on every startup for every task agent, so missing records are logged as one count line: `Empty never-started run removal skipped <n> folder(s) without a standalone run record`. Unreadable records are still logged one by one.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: two methods in their existing owners, one startup stage, tests. High stays: persisted user data is deleted at every startup, so the content test must be exact.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High route)
- New design impact or escalation trigger: `None`. Empty subfolders are allowed (the design says so); no content written outside the run folder was found.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001) | A failed activation leaves no run | `createAgentRun` → `cancelPreparedAgentRun` → rethrow | Real catalog on a temp root: no row, no folder, the caller gets the activation error (IMP-02) |
| BEH-001 (AC-002) | A started run is not removed; the refusal is logged | same; the catalog refuses a started run | Real catalog: run and row kept, warning with ID and reason (IMP-02); unit cases for refusal and a throwing cancel (IMP-02) |
| BEH-002 (REQ-002; AC-003) | Only content-free never-started runs are removed at startup | `removeEmptyNeverStartedRuns`; startup stage | Real catalog on a temp root: the May shape kept; empty run (with empty subfolders) removed with row and logged; context-only, started and unreadable kept; symlinks kept; an unreadable subfolder and an injected `readdir` failure keep the run (IMP-01). Mutations caught (IMP-01). Stage order and cancellation (IMP-03) |
| BEH-003 (REQ-003; AC-005) | Web first message and remote delegation unchanged | not touched | Existing suites green (IMP-05) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` — Modify (D1; wrapper renamed)
- `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` — Modify (D2; `cleanupStalePreparedRuns` removed)
- `autobyteus-server-ts/src/server-runtime.ts` — Modify (one stage)
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-empty-never-started-removal.test.ts` — Add (AC-003, AR-002)
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-create-undo.test.ts` — Add (AC-001, AC-002 on a temp root)
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-create-service.test.ts` — Modify (4 D1 unit cases)
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-provisioning-service.test.ts` — Modify (old 24 h test removed)
- `autobyteus-server-ts/tests/unit/server-runtime-app-data-migration-gate.test.ts` — Modify (stage order; cancel during the stage)
- `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` — Modify (one allowlist entry for `server-runtime.ts`, with its reason)
- `autobyteus-server-ts/docs/modules/agent_execution.md` — Modify

## Important Assumptions

- The process `AgentRunService` is bound inside `buildStudioServer`; `getAgentRunService()` throws otherwise, which would surface as the existing startup failure, not a silent skip.
- A `Dirent` whose type the filesystem does not report counts as content (kept), which errs toward keeping.

## Known Risks

- Persisted data is deleted at startup: on the user's data the first start removes the 6 content-free runs (approved, logged with ID and title).
- Content stored outside a run folder would not count; none is known.
- FU-001 (Project start record not undone), FU-002 (`preparedExpiresAt` on the wire), FU-003 (no periodic removal), FU-004 (`cancelPreparedRun` still accepts a never-started run with content).
- N-4: the stage adds one `readdir` per run folder (plus a walk for never-started ones) to startup; validation can note its time.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: both rules live in their owners; the unsafe dead rule is removed, not kept beside the new one.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (`cleanupStalePreparedRuns` and its wrapper and test removed)
- Dead code in the touched files and modules removed: `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` — effective non-empty lines after/before: `agent-run-provisioning-service.ts` 306/256, `agent-run-service.ts` 329/318, `server-runtime.ts` 222/219.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Discard` of content-free never-started runs at each startup
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` (no stored shape changes; older records are read as they are)
- Direct-use evidence or discard/rebuild result: IMP-01 (the May shape kept; only the content-free run removed)
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install` and `pnpm -C autobyteus-server-ts prebuild` were needed before the typecheck.

## Checks Run

Code commits `c533fc0b5b` and `93fa105819` (the architecture-guard entry). Environment: macOS 26 (Darwin 25.5.0), Node 22. Evidence in `evidence/`. Every test uses a temporary data root; none touches the user's data.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-empty-never-started-removal.test.ts --no-watch`; mutations: content check removed (`preparedAt && !startedAt` alone), walk follows symlinks, walk error reads as empty | `93fa105819` | macOS, Node 22; real metadata store and catalog on a temp root | `removeEmptyNeverStartedRuns`, `holdsOnlyItsRecord` | BEH-002, AC-003, AR-002 | Pass (7; both AR-002 cases ran). Mutations fail 5, 1 and 2 | `IMP-01-empty-never-started-removal.log`, `IMP-01-mutation-nocontent.log`, `IMP-01-mutation-follow.log`, `IMP-01-mutation-walkerror.log` | `Tests  7 passed (7)`; `Tests  5 failed \| 2 passed (7)`; `Tests  1 failed \| 6 passed (7)`; `Tests  2 failed \| 5 passed (7)` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-create-undo.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-provisioning-service.test.ts --no-watch`; fail-before: `createAgentRun` body as on base | `93fa105819` | macOS, Node 22; real provisioning and catalog on a temp root for AC-001/AC-002 | `createAgentRun` undo | BEH-001, AC-001, AC-002 | Pass (12; base body fails 5) | `IMP-02-create-undo.log`, `IMP-02-fail-before-base.log` | `Tests  12 passed (12)`; base: `Tests  5 failed \| 4 passed (9)` |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/server-runtime-app-data-migration-gate.test.ts tests/architecture/application-framework-boundaries.test.ts --no-watch`; fail-before: the stage removed | `93fa105819` | macOS, Node 22 | `server-runtime.ts` stage order and cancellation; the ambient run-service guard | BEH-002 (startup) | Pass (41; without the stage 3 fail) | `IMP-03-startup-stage.log`, `IMP-03-fail-before-no-stage.log` | `Tests  41 passed (41)`; `Tests  3 failed \| 18 passed (21)` |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | `93fa105819` content | macOS, Node 22 | server `src` | — | Pass | `IMP-04-server-typecheck.log` | `exit 0` |
| IMP-05 | `pnpm -C autobyteus-server-ts test:unit` (full) | `93fa105819` | macOS, Node 22 | all server unit suites | AC-005 (existing behavior) | Pass | `IMP-05-server-unit-suite-summary.log` | `Tests  7665 passed \| 9 skipped (7674)` |

- The first full run (on `c533fc0b5b`) found the architecture guard `guards the exact SR-011 host definition and public/general run authority` failing: it allowlists the modules that call the ambient `getAgentRunService()`, and the design's stage adds `server-runtime.ts`. `93fa105819` adds that entry with its reason, as Model Routing's composition root has. Please confirm this entry is acceptable.
- Not run, and why: server `test:integration` and E2E (API/E2E's scope; no integration test covers the changed paths beyond the temp-root tests above); AC-001 through a real server, AC-003 as a real server start on a seeded temp root, AC-004 (API-02 shape and relaunch) are API/E2E-owned.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: server-only change; no rendered UI.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: force an activation failure through the real server (for example 339's API-02 shape around SIGTERM, or a runtime that cannot start) and check history has no empty run.
- AC-003: start a real server on a temporary data root seeded with the five shapes (synthetic; never the user's data) and check the log lines and what remains.
- AC-004: 339's API-02 shape, then relaunch: no empty run.
- N-4: note the stage's startup time on a root with many runs.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Design-spec § Change / Refactor Sequence step 5: AC-001, AC-003 and AC-004 on a temporary data root only.
