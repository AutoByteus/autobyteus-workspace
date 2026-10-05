# Solution Designer Result — SR-021 Lifetime Authority / Composition Revision

## Outcome
- Package **project-task-manager-linked-delegation**, Solution Designer, **SR-021**, 2026-10-05.
- Classification: **Architecture Design Complete (revised)** — `task_size` **Large**, `architectural_risk` **High**, route **Reviewed**.
- Trigger: **CRR-024** from `/code_reviewer`, Fail — Design Impact F04–F07, plus Local Fixes F01–F03. The user explicitly authorized sending it to the Solution Designer. Score 8.8; no runtime-correctness defect on the business spine.
- Intended behavior unchanged: **REQ-BL-008 = SD-AP-001 + scoped SD-AP-002**, Approved. No renewed user approval needed. ARCH-REV-005 reviewed SR-014, not this delta, so a fresh independent architecture review of SR-021 is required before implementation.

## What changed in the design (authoritative: design-spec.md, section "SR-021 Lifetime Authority, Membership And Composition")
| Finding | Decision |
| --- | --- |
| F04 — three closure holders | **One process `TaskLifetimeGate`** (`agent-collaboration/execution/task/task-lifetime-gate.ts`) is the only runtime closure owner, derived from durable `completedAt`. It is latched by the Task commit callback through a neutral `TaskLifetimeClosureListener`, or by a durable read. Removed: the Task-service private gate and the `RootTaskLifetimeScope.closed`/`fences`. Synchronous input checks call `gate.assertOpen` (CLOSED / UNAVAILABLE). The port becomes durable-only: `readLifetimeClosure` replaces `acquireAdmission`/`assertOpen`/`assertClosed`. |
| F05 — unused count/drain | **Remove** `count`/`drained`/`drain()` and `TaskLifetimeAdmission.release` (7 call sites). DS-003 now says: latch + cancel + exact force release, with no drain. Continuations fail their next `assertOpen` and clean up their own control. |
| F06 — two-way dependency | **One composition binding**: `src/compositions/project-task-lifetime-composition.ts`, called by `build-studio-server.ts` and `start-standalone-application-host.ts`. It creates the gate, initializes the Task service process instance (listener + active-root-directory release request) and passes a neutral `TaskLifetimeRuntime {port, gate}` through `createGeneralProcessRunSupervisor` to the three builders. Runtime imports nothing from Projects; Projects imports only neutral contracts. Grep checks are specified. |
| F07 — two membership sources | **Durable link = membership authority**; the tree stamp is its runtime projection (written after reservation, validated on admission/restore). Root release returns `TaskLifetimeReleaseReport {requested, unrequested}`. The Task service reconciles: an unrequested outcome updates an existing link; an unlinked stamp gets a bounded `TASK_LIFETIME_UNLINKED_EXECUTION` warning and no invented link. Registered unreserved attempts stay owned by the dispatch operation. |
| F01–F03 (Local Fixes, same round) | Untrack the 64 SDK `dist/` files; remove lifecycle/fence/helper-ownership sentences from the shared LLM contract (keep the work-source rule + the business follow-up-after-DONE note); one recipient-resolution algorithm (reuse or delete `resolveInRunRecipient`, retarget its tests). |

Design health: an ownership/boundary correction that removes unused machinery. Net deletion of state owners. No new subsystem, persisted data, migration, scheduler or behavior.

## Expected next actions
1. Independent architecture review of the SR-021 delta.
2. Implementation of F01–F07 following the SR-021 sequence (§6), including the specified self-check controls and dependency greps.
3. Independent source re-review.
4. Proportionate API/E2E recheck on a changed build: DONE fence, retry, restart-closed, helper scope.
5. Delivery re-integration.

**Delivery DR-002 must not finalize the pre-SR-021 candidate (HEAD `ccb5fbe3`).**

## Workspace / context
- Isolated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`.
- HEAD `ccb5fbe3ca63b3542fa6538e035a4b1428c80788`; base origin/personal `10fb69504f`; finalization target origin/personal.
- Delivery's uncommitted docs sync (8 docs + TESTING.md) is present and untouched.
- The Designer made no source, test or Git change.

## Artifacts (absolute)
- Requirements (Approved, status line only): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/requirements-doc.md`
- Investigation (E-079–E-082 added): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/investigation-notes.md`
- Design (SR-021 section + in-place row edits): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/design-spec.md`
- Revision index (SR-021 entry): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-revision-record.md`
- Prior five Designer documents archived byte-exact: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-history/sr-021-prior/`
- Triggering review (externally owned): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/code-review-report.md`, `code-review-revision-record.md`, `code-review-evidence/crr-024/`
- Prior architecture review (historical SR-014 basis): `design-review-report.md`, `architecture-review-revision-record.md` (same ticket folder)
- Implementation, API/E2E and Delivery artifacts in the same ticket folder remain externally owned. No Product artifacts (N/A).

## Open risks
- Only the restored-owned-work path is assumed to run a synchronous input check before an in-process `admit`. Any other such path found during implementation is Design Impact (do not re-add per-root state).
- Provider-private teardown internals were not re-traced by CRR-024; the earlier API/provider limits stand.

## Routing
`get_handoff_rules` returned three rules, and only one matches:
- **Matches:** "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review; requirements currently explicitly approved" → `/architecture_reviewer`.
- **Does not match:** the Small/Medium + Low direct-implementation rule (this package is Large/High).
- **Does not match:** the Delivery receipt-gap rule (no Delivery Completed receipt was received).

Single handoff: `/architecture_reviewer`. No other recipient is notified. The DR-002 non-finalization note is carried in this package.

### SR-021 confirmed handoff
`send_message_to` → `/architecture_reviewer` confirmed accepted=true / DELIVERED (run `architecture_reviewer_600715b440b947e3810057bdf0971a3e`), with solution-design-handoff.md attached. No other recipient. Solution Designer stops.
