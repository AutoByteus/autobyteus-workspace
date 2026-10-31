# Code Review Report — atomic-agent-run-creation (autobyteus-349)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/`.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved by the user, SR-002: REQ-001 to REQ-003, DEC-001 = A with the content check, DEC-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (F-01 to F-09; the read-only count: 6 empty never-started runs, 11 May runs with conversations)
- Solution Revision Record Reviewed As Context: SR-001 to SR-004
- Design Spec Reviewed As Context: `design-spec.md` (SR-004; the user's approval of the design: Obtained)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001 to FU-004)
- Relevant Solution Revision IDs: SR-002, SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 `Pass`; N-1 to N-4). It is untracked in the worktree and owned by the architecture reviewer.
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (untracked, same owner)
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation engineer, IR-001 (code `c533fc0b5b`, guard entry `93fa105819`, handoff and evidence `ded1b718e5`)
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Small`. Architectural risk: `High`. Selected route: `Implementation Review`. Independent source review required: `Yes`.
- Classification confirmed:
  - The change is small, in its existing owners.
  - The risk is `High` because persisted user data is deleted at every startup, so a wrong "empty" test would lose conversations.
  - It also adds a startup stage.

## Review Scope

- Reviewed:
  - D1: `AgentRunService.createAgentRun` with undo on a failed activation.
  - D2: `AgentRunProvisioningService.removeEmptyNeverStartedRuns` and `holdsOnlyItsRecord`, replacing `cleanupStalePreparedRuns` and its wrapper.
  - The startup stage in `server-runtime.ts`.
  - The architecture-guard entry (`93fa105819`).
  - The tests and `agent_execution.md`.
- Context read, unchanged:
  - `AgentRunMetadataStore.readMetadataState` (`agent-run-metadata-store.ts:129-154`, including G1: a task agent's file reads as `missing`);
  - `AgentMemoryLayout` (standalone root `<memory>/agents`; task agents and agent-root collaboration packages under `agents/<id>`);
  - `server-runtime.ts:175-227` (readiness rebuild → `buildStudioServer` → stage → `prepareBeforeListen` → listen → `recoverAfterListen` → `scheduleStudioBackgroundTasks`).
- Exclusions:
  - AC-004 (the server-level probe) and N-4's timing are validation's.
  - I reran no checks: IMP-01 to IMP-05 ran on `c533fc0b5b` and `93fa105819`.

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`. No new behavior.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | `createAgentRun`: `prepareAgentRun` (persists) → `try activate` → on error, `cancelPreparedAgentRun(runId)`. A rejection becomes `{ success: false }` and a failure is logged "Run '<id>' failed to activate and was kept: <reason>". The original error is rethrown. `cancelPreparedRun` refuses a started run, a run with an active runtime and a run with outstanding commands, so a started run is never undone (AC-002). |
| BEH-002 | Confirmed | Stage after `buildStudioServer` and before `prepareBeforeListen`. Listen, recovery and background tasks all come later, so no request, peer delegation or background task can prepare a run during it. For each directory under `agents/`, the sequence is: (1) `readMetadataState`: `missing` (including task-agent files, G1) is counted and kept, `unreadable` is logged and kept; (2) `preparedAt` set and `startedAt` absent; (3) `holdsOnlyItsRecord`; (4) active or outstanding-command skip; (5) title from the catalog row, then `cancelPreparedAgentRun`, which removes the row and folder; a refusal is logged and the run kept. Each run has its own try/catch, and the root read tolerates ENOENT, so it never throws. |
| BEH-003 | Confirmed (preserved) | The two-step prepare and activate, remote delegation and the web app's own cancel are untouched. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | BEH-001, AC-001, AC-002 | Contract | GraphQL client, application, Model Routing | Create and start a run in one call | `createAgentRun` | Normal (an activation failure is a supported edge: closed admission, a runtime that cannot start) | DS-001 | No debris; the caller gets the error | F-01; 339 API-02 | Supported Normal Scenario | Use |
| SCN-B | BEH-002, AC-003, AC-004 | Operational | Server startup | Clean debris from failed or cut starts | Startup | Normal | DS-002 | Only content-free never-started runs removed | F-05; the read-only count | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CR-C1 | Data-loss path: could any folder holding a conversation pass the "empty" test? | Reject (verified safe) | Only a directory with a present standalone record, `preparedAt`, no `startedAt`, and a no-follow walk finding only directories plus the top-level regular `run_metadata.json` is removed. `Dirent` types come from `lstat` semantics (Node falls back to `lstat` for an unknown `d_type`), so a symlink counts as content. Any walk error keeps the run. A task agent (G1 `missing`) is never touched. An agent root's package lives in `agents/<id>/collaboration` with files, so it counts as content and is kept. The mutations prove the guards: `preparedAt && !startedAt` alone fails 5; following symlinks fails 1; reading an error as empty fails 2. |
| CR-C2 | Implementer point 1: an architecture-guard allowlist entry for `server-runtime.ts:getAgentRunService` | Accept | `server-runtime.ts` is the process startup root and owns the startup order (design § Ownership). The ambient service is bound by `buildStudioServer` before the call. The entry carries its reason and mirrors the Model Routing composition root. The alternative, returning the run service from `buildStudioServer`, would widen that return shape for one call, so it is not better. The guard's purpose (no host or run-authority bypass from general modules) is not weakened: the call uses a public service method, not run authority. |
| CR-C3 | Implementer point 2: missing records are logged as a single count, not per folder | Accept | The design says "unreadable or missing: log it and skip". The intent (log, never delete) holds. A missing record is the normal state of every task-agent folder (G1), so one line per folder at every startup would be noise. Unreadable records, the case that matters for DESIGN rule 7, are still logged one by one. Using `readMetadataState` instead of the design's `readMetadata` is required to tell missing from unreadable, since `readMetadata` returns `null` for both. |
| CR-C4 | N-4: the stage reads every standalone record at startup (global work on the startup path, DESIGN rule 3) | Reject (as a finding) | One small JSON read per run folder, sequential. Only never-started runs are walked, and the walk stops at the first content. Accepted in ARCH-REV-002 N-4; validation records the time. If it measures large on a big data root, that is a follow-up. |
| CR-C5 | A two-step web preparation cut by a restart is removed, so the later send fails | Reject | It was accepted in DEC-001 (the user) and N-3: the failure is visible. |
| CR-C6 | A removed empty run loses its catalog title | Reject | Approved (N-1); the title is logged. |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment preserved | Pass | Missing Invariant in two owners. The unsafe dead rule is replaced, not kept beside the new one. |
| Matches behavior-defining supplements | Pass | None are behavior-defining. |
| Data-flow spines | Pass | DS-001 and DS-002 match the code. |
| Ownership boundaries | Pass | `AgentRunService` owns the create sequence. `AgentRunProvisioningService` owns the "empty never-started" rule. The history catalog owns removal through `cancelPreparedRun`. `server-runtime.ts` owns startup order. |
| Off-spine concerns | Pass | Logging stays inside the owners. |
| Existing capability reuse | Pass | `cancelPreparedAgentRun` and `readMetadataState` are reused; nothing else deletes. |
| Reusable owned structures | Pass | `RemovedEmptyNeverStartedRun` is a two-field result. |
| Data-model tightness | Pass | — |
| Repeated coordination | Pass | — |
| Empty indirection | Pass | The `AgentRunService` wrapper is the service's public surface for the stage, the same pattern as `cancelPreparedAgentRun`. |
| Separation of concerns / file responsibility | Pass | `holdsOnlyItsRecord` is a private module function of its only user. |
| Dependency direction | Pass | `server-runtime` → the run service (allowlisted, CR-C2). |
| Authoritative Boundary Rule | Pass | The stage calls the service, not provisioning or the catalog directly. |
| File placement | Pass | — |
| Layout | Pass | — |
| Interface clarity | Pass | `removeEmptyNeverStartedRuns(): Promise<RemovedEmptyNeverStartedRun[]>` never throws, by contract. |
| Naming / one vocabulary | Pass | "Empty never-started run" is stated once and used consistently in the code, logs and docs. |
| No unjustified duplication | Pass | — |
| Patch-on-patch control | Pass | — |
| Dead code removed (Principle 7) | Pass | Both `cleanupStalePreparedRuns` methods and their test are removed; no reference remains in src, tests or docs. `PREPARED_RUN_TTL_MS` is kept on purpose: it still computes the `preparedExpiresAt` the wire returns (FU-002). |
| Tests requirement-aligned | Pass | AC-003 runs on the real metadata store and catalog on a temporary root, with the May shape first, plus symlinks to a file and to a directory, an unreadable subfolder and an injected `readdir` failure. AC-001 and AC-002 run on real provisioning and catalog (5 fail on base). Unit tests cover undo, refusal, undo throws and no undo on success. The startup order and a cancel during the stage are in the gate test. |
| Fixtures coherent | Pass | `seedPrepared`, `writeFile`, `catalogRunIds`. |
| No stale tests | Pass | The 24 h test is removed. |
| API/E2E readiness | Pass | The handoff names AC-004 (339's API-02 shape, then relaunch) and N-4 timing. |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | 256 | 306 | Pass | Pass (+50) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | 318 | 329 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/server-runtime.ts` | 219 | 222 | Pass | Pass | Pass | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | The 24 h rule is removed, not kept beside the new one. |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | `Discard` of content-free never-started runs only. No shape change, and old records are read as they are (the May shape is kept). |
| No version-specific reads | Pass | — |
| Transition mechanics match | Pass | It is not a migration; each removal is logged and goes through the existing cancel. |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining.

## Docs-Impact Verdict

- Docs impact: `Yes`, done: `agent_execution.md` describes both rules, including that `preparedExpiresAt` is written but not enforced. `docs/design-cases.md` was updated by the Solution Designer.

## Additional Material Premise Validation

- Upstream premises (ARCH-REV-001 and ARCH-REV-002, including AR-002, a walk error keeps the run): Confirmed in the code and tests. No new premises.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; for trend only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | `Data-Flow Spine Inventory and Clarity` | 9.5 | Both spines as designed | — | — |
| 2 | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Removal goes only through the catalog's cancel | — | — |
| 3 | `API / Interface / Query / Command Clarity` | 9.5 | A never-throws contract with an explicit result | — | — |
| 4 | `Separation of Concerns and File Placement` | 9.5 | — | — | — |
| 5 | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | — | — | — |
| 6 | `Naming Quality and Local Readability` | 9.4 | Clear names and comments; every keep path logs a reason | — | — |
| 7 | `API/E2E Readiness` | 9.4 | Deterministic coverage with mutations | AC-004 and N-4 pending (validation) | — |
| 8 | `Runtime Correctness And Behavioral Fidelity` | 9.5 | The data-loss guards are verified one by one (CR-C1) | — | — |
| 9 | `No Backward-Compatibility / No Legacy Retention` | 9.6 | The unsafe rule is removed | — | — |
| 10 | `Cleanup Completeness` | 9.5 | — | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-001 to FU-004 stand. FU-004 is `cancelPreparedRun` still accepting a never-started run with content; the startup rule never calls it for one.

## Classification

N/A: the review passes.

## Recommended Recipient

- API/E2E engineer (primary pass rule); then an informational notice to the implementation engineer.

## Residual Risks

- AC-004 (339's API-02 shape, then relaunch: no empty run) and N-4's startup time are owned by validation, on a temporary data root only.
- On the user's data, the first start after the update removes the 6 content-free runs, each logged. That is approved (DEC-001).
- Content stored outside the run folder is not counted (design § Risks; none known).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 / 10; every category ≥ 9.2
- Recommended Recipient: API/E2E engineer
- Notes:
  - Reviewed code `c533fc0b5b` and guard entry `93fa105819`.
  - Both implementer points were accepted: the guard entry (CR-C2) and the missing-record count line (CR-C3).
