# Design Spec — atomic-agent-run-creation (autobyteus-349)

## Solution And Approval Basis
- Current solution revision ID: `SR-003`.
- Approved requirements: `requirements-doc.md` SR-002, approved by **the user** on 2026-10-31 (DEC-001 = A with the
  content check).
- User approval of the design: **Obtained**. The user approved the presented solution (undo a failed start at once;
  remove only content-free never-started runs at startup; drop the 24 h rule), and this spec realizes exactly that.
- Design status: `Ready`.
- Authorities read (in this conversation): `architecture-design.md`, `design-principles.md`, `ticket-scope.md`;
  `DESIGN.md` (rule 7: contain bad data, never delete unreadable data); the Data Migration Guideline (not a migration:
  a routine startup removal of content-free records, no stored shape changes).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation`, branch
  `codex/atomic-agent-run-creation`, base `origin/personal` @ `e87e6bb2b1`.

## Current-State Read
- `AgentRunService.createAgentRun` (`agent-run-service.ts:245-250`): prepare (persists) → `activate`, with no
  rollback (F-01).
- `AgentRunProvisioningService.cancelPreparedAgentRun` (`agent-run-provisioning-service.ts:120-129`) →
  `AgentRunHistoryCatalogService.cancelPreparedRun` (`:310-361`). It refuses while a command is outstanding or a
  runtime is active, and refuses a started run. It removes the row and the folder, and excludes the run from readiness.
- `cleanupStalePreparedRuns` (`agent-run-provisioning-service.ts:131-157`, wrapper `agent-run-service.ts:271-273`): the
  24 h rule, which judges by `preparedAt && !startedAt` only. Its only caller is a unit test. **Unsafe:** on the user's
  data it would delete 11 real May conversations (investigation notes, the read-only count).
- Startup: `server-runtime.ts`. The readiness index is rebuilt at `:183`; `buildStudioServer` binds the process
  `AgentRunService`; `prepareBeforeListen` runs at `:208`; then `listen`.

## Task Size And Architectural Risk (Mandatory)
- **Task size: `Small`.** Two methods in the existing run-creation owners, one startup stage, and tests.
- **Architectural risk: `High`.** Persisted user data is deleted at every startup, so a wrong "empty" test loses
  conversations. The startup sequence gains a stage.
- **Escalation trigger:** any case where the content check is unclear (for example a run folder with only empty
  subfolders, or files written outside the run folder).

## Intended Change
- **D1, atomic one-call creation (REQ-001).** `createAgentRun`: on an activation error, call
  `provisioningService.cancelPreparedAgentRun(runId)`. If it reports failure, log a warning with the run ID and the
  reason. Then rethrow the original activation error.
- **D2, content-free cleanup at startup (REQ-002).** Replace `cleanupStalePreparedRuns` with
  `AgentRunProvisioningService.removeEmptyNeverStartedRuns(): Promise<RemovedRun[]>`. For each folder under the
  standalone root:
  1. read the record (`metadataService.readMetadata`). If it is unreadable or missing, log it and skip;
  2. require `preparedAt` set and `startedAt` absent;
  3. require **that the folder holds no file besides `run_metadata.json`**, walking it recursively; empty subfolders
     do not count as content;
  4. skip active runs and runs with outstanding commands (defensive; there are none at startup);
  5. `cancelPreparedAgentRun(runId)` and log `Removed empty never-started run '<id>' ('<title>')`.
  - It never throws to its caller: a failure is logged, and startup continues.
- **Startup wiring.** One stage in `server-runtime.ts` after `buildStudioServer` (the process `AgentRunService` and
  the history catalog are bound) and before `listen`: `await shutdown.stage(() =>
  getAgentRunService().removeEmptyNeverStartedRuns())`. It sits before `prepareBeforeListen`, so no request can create
  a run during it.

## Change Scope (Mandatory)
- In scope: `agent-run-service.ts` (D1; the wrapper renamed), `agent-run-provisioning-service.ts` (D2),
  `server-runtime.ts` (one stage), and their tests.
- Deliberately left alone:
  - the web app's own cancel;
  - remote delegation's two-step creation;
  - `cancelPreparedRun`'s rules;
  - Team and Org runs;
  - `preparedExpiresAt` on the wire (FU-002);
  - Project start records on cancel (FU-001);
  - any periodic removal (DEC-002).
- Follow-ups: FU-001, FU-002, FU-003 (periodic removal on long-running nodes, if ever needed).

## Persisted Data / State Transition Decision
- **`Discard` of content-free never-started runs**, at each startup:
  - Why: a run with no file besides its record holds no conversation; it is debris from a failed or cut start.
  - Evidence: the read-only count (6 such runs on the user's data).
  - It is not a migration: no stored shape changes; old records are read as they are.
  - Every run with content is kept, including the May runs that lack `startedAt`.

## Data-Flow Spines
- DS-001: `GraphQL / application / Model Routing → AgentRunService.createAgentRun → prepare (persist) → activate → [error] → cancelPreparedAgentRun → rethrow`
- DS-002: `server start → … → buildStudioServer → ★ removeEmptyNeverStartedRuns (read record → never started? → no content? → cancelPreparedRun → log) → prepareBeforeListen → listen`

## Ownership
- `AgentRunService` owns the one-call create sequence.
- `AgentRunProvisioningService` owns prepared runs and the "empty never-started" rule.
- The history catalog owns removal (`cancelPreparedRun`).
- `server-runtime.ts` owns the startup order.

## Removal / Decommission Plan (Mandatory)
| Item | Replaced by | Scope |
| --- | --- | --- |
| `AgentRunProvisioningService.cleanupStalePreparedRuns`, `AgentRunService.cleanupStalePreparedRuns`, their test (`agent-run-provisioning-service.test.ts:~186-210`) | `removeEmptyNeverStartedRuns` and its tests | In this change |
| `PREPARED_RUN_TTL_MS` | — | Kept: it still computes the `preparedExpiresAt` the wire returns (FU-002) |

## Final File Responsibility Mapping
| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Modify | D1; `removeEmptyNeverStartedRuns` wrapper in place of `cleanupStalePreparedRuns` |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Modify | D2 |
| `autobyteus-server-ts/src/server-runtime.ts` | Modify | One startup stage |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-provisioning-service.test.ts` | Modify | AC-003 cases on a temporary data root: empty never-started run removed; the May shape (`activationState`, no `startedAt`, a raw trace) kept; only a context file kept; started kept; unreadable record skipped and logged |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-service*.test.ts` (existing or new) | Modify/Add | AC-001/AC-002: activation throws → cancel called, original error rethrown; cancel refused → warning logged, original error rethrown |
| A server-runtime test (the existing startup-gate test) | Modify | The stage runs before listen; a failure is logged and startup continues |
| `autobyteus-server-ts/docs/modules/agent_execution.md` (run creation) | Modify | D1 and D2 rules |

## Concrete Examples
| Topic | Good | Avoided |
| --- | --- | --- |
| Create | `try { return { runId: (await this.activate(id)).run.runId } } catch (e) { const r = await this.provisioningService.cancelPreparedAgentRun(id).catch(x => ({ success: false, message: String(x) })); if (!r.success) logger.warn(...); throw e }` | Swallowing the activation error; cancelling a started run |
| Empty test | the folder's files, recursively, minus `run_metadata.json`, is empty | `preparedAt && !startedAt` alone (it deletes the May conversations); an age limit |

## Backward-Compatibility Rejection Log
| Candidate | Decision |
| --- | --- |
| Keep the 24 h rule beside the new one | Rejected (unsafe, F-10) |

## Change / Refactor Sequence
1. D1 plus tests.
2. D2 plus tests (the May shape first).
3. The startup stage plus its test.
4. Docs.
5. Validation (API/E2E), on a temporary data root only:
   - AC-001: force an activation failure through the real server (for example, the API-02 shape around SIGTERM, or a
     runtime that cannot start) and check that history has no empty run;
   - AC-003: a startup on a data root seeded with the five shapes (a copy-free synthetic seed; **never the user's
     data**);
   - AC-004: 339's API-02 shape, then relaunch: no empty run.

## Risks
- A new kind of run content stored outside the run folder would not count. None is known (`Read`): context files,
  traces, journals and file changes all live inside it.
- First start after the update on the user's data removes the 6 content-free runs. That is approved and logged.

## Guidance For Implementation
- Never use `preparedAt`/`startedAt` alone as the removal test.
- Never touch the user's real data in tests; seed temporary roots.
