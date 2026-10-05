# Implementation Handoff — IR-014 (DR-003 latest-base integration Local Fix)

**Local Fix complete. Ready for independent source review.**

- Merge commit **`e94d83538`**: parents `b6755585a` (IR-013 `b61b8452f` + API-REV-020 checkpoint) and origin/personal `fc79fad14`.
- Delivery's stash `76b8fd003` is untouched. Untracked `dist/` and `electron-dist/` stay unstaged.
- Large / High / Reviewed, confirmed unchanged.

## IR-014 summary

- **Trigger:** DR-003 (`delivery-evidence/dr-003/integration-attempt.md`). Upstream `1b83c8f88` extracted the AgentRun termination lifecycle into `AgentRunTermination`. The ticket's `AgentRun.forceReleaseRuntime()` still called the removed `createTerminationPreparation()`.
- **Fix:**
  - Keep upstream's `termination: AgentRunTermination` owner, with the ticket's `executionAdmissionFence` field beside it.
  - Add `AgentRunTermination.forceTerminate()`, which runs the same `createTerminationPreparation().commit().finish()` chain without the quiescence wait. A failed finish stays retryable because the owner's `finishing` memo clears.
  - `forceReleaseRuntime()` still closes the admission fence and fences input first.
  - The `AgentRun` API is unchanged, so `agent-run-manager.ts` and `configured-agent-execution-handle.ts` need no change. Approved behavior is unchanged.
- **Other merge content:** upstream only. The registry and bootstrapper test auto-merged with the Daily Assistant rename; the Project Task Manager entries are untouched.
- **Local checks** (`implementation-evidence/ir-014/local-check-commands.md`):
  - Typecheck exit 0.
  - The Claude/Codex input-terminal-release suites, `AgentRun`, the termination service, the configured handle and the terminal-publication suites pass. The only failures are pre-existing baseline ones.
  - Wide run: 4785 Pass / 82 Fail, failing names identical to the pre-existing baseline.
  - Upstream's general-agent-identity e2e passes.
- **Downstream:** source review, then the API-REV-020 startup-migration e2e on a rebuilt build (API/E2E), then the Delivery docs resync.
- **Revision record:** `implementation-revision-record.md`, entry IR-014.

The IR-013 content below remains the cumulative feature description. The archived copy is at `implementation-evidence/ir-013/implementation-handoff-ir-013-archived.md`.

---

## Cumulative feature handoff (IR-013)

**Implementation complete. Ready for independent source review.** This is not API/E2E acceptance or Delivery completion. Date: 2026-10-05.

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`.
- Development commit **`b61b8452f`** on `4b04d9097`.
- Preserved, unstaged and unedited: Delivery's 8 uncommitted docs/TESTING.md paths, and the API/E2E engineer's uncommitted `tests/e2e/projects/projects-startup-no-write.e2e.test.ts`.
- The prior handoff is archived at `implementation-evidence/ir-012/implementation-handoff-ir-012-archived.md`.

## Upstream Artifact Package

All paths below are under `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/`.

- Upstream review applicability and handoff-rule result: independent architecture review applies (Large/High). **ARCH-REV-010** passed SR-023 and **ARCH-REV-011** passed SR-024. The returned handoff rule is recorded below.
- Requirements doc: `requirements-doc.md` (**REQ-BL-009**, SD-AP-003, C-2/C-3/C-4 amended).
- Data model: `data-model-draft.md` (authoritative).
- Investigation notes: `investigation-notes.md` (E-084–E-100).
- Solution revision record: `solution-revision-record.md` (SR-023, SR-024).
- Design spec: `design-spec.md` (cumulative SR-023 + SR-024). Carried-forward sections are in `solution-history/sr-023-prior/design-spec.sr-022a-final.md`.
- Supplemental task artifacts:
  - `solution-design-handoff.md`
  - `solution-scope-clarification.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/docs/design/data_migration_guideline.md`
- Design review report: `design-review-report.md` (ARCH-REV-011); history in `architecture-review-history/`.
- Architecture review revision record: `architecture-review-revision-record.md`.
- Triggering rework report: `code-review-report.md` and `code-review-revision-record.md` (CRR-026, data-model review).

## Current Implementation Summary

- Implementation cycle: Rework.
- Implementation revision record: `implementation-revision-record.md`, current **IR-013**.
- Related revisions: SR-023/024; ARCH-REV-010/011; CRR-026; API-REV N/A (the IR-012 recheck is paused); DR-002 hold.
- Triggering finding IDs: CR26-F01–F03; AR9-F01/F02a/F02b; N2, N4–N9.

What was built:

1. **Task-free runtime (C-1).**
   - Removed: the lifetime gate, closure listener, reports, `recordCleanup`, tree stamps (record type, schema, projection), the adapters' and indexes' Task methods, and SR-022a acceptance recording.
   - The runtime asks the neutral `TaskAgentResourcePort` (`agent-collaboration/execution/task/task-agent-resource-port.ts`) through a stateless `RootTaskAgentResourceScope`. Ownership comes from the agent's containment chain (`adapter.ownershipChainFor`: index chain, or pre-commit registrations). Agents outside task copies are never checked.
2. **Link before register.** `dispatchTaskCopy` runs plan → `linkAgentRun` (`starting`) → `isOpen` + register at the queue head → prepare → commit → seed, checking `isOpen` after every await. It then calls `markStarted` (at commit for `broughtIn`, at seed acceptance for others), or `markFailed` before acceptance.
   - Owned senders passing `task_id` reject `TASK_AGENT_RESOURCE_OWNED_SENDER` (N2).
   - Description-only delegation by a non-owned sender is rejected before any planning while any Task data is unreadable (Q-3, N4 `assertResourceDataReadable`).
3. **Release.** `releaseTaskAgentResources(agentRuns)` on the root boundary:
   - verifies each agent run is closed;
   - cancels the registration and the committed copy before any await;
   - invokes every retained exact authority regardless of liveness;
   - reports `stopped` only when every invoked release is accepted or the root holds no authority (AR9-F02b).
   - Results are only logged (Q-1).
4. **Task side.**
   - `TaskAgentResourceService` is the sole authority over every `<projectId>/tasks/<taskId>/agent_run_resources.json`. It keeps the in-memory view and the damaged set, and serializes per Task. Write preconditions run in the `updateJsonFile` updater, and the view is swapped in `onCommitted` (AR9-F02a).
   - `ProjectTaskService` implements the port. DONE runs closeTask → `task.json` → stop per host root; repeated DONE re-requests the stop. Assignment links re-check the status under serialization.
5. **Per-Project folders (C-3).**
   - `ProjectsLayout` is the single path owner with safe segments (N5).
   - The per-folder `ProjectStore` lists by valid `project.json`/`task.json` and admits a Task only under a valid parent (N7). It writes one file at a time atomically, with a catalog lock that keeps name uniqueness.
   - Delete removes metadata, context and drafts, and keeps every `agent_run_resources.json`.
   - The existence-only `PROJECTS_MIGRATION_PENDING` gate is evaluated per operation (N9).
   - The context store uses the new paths.
6. **Migration `projects-per-folder-v1`** (registered, `requiredOnStartup`, STARTUP_ONLY).
   - The frozen `released-projects-array-v1.ts` reader skips the dev `{taskLifetimes}` residue silently. An invalid row, Task or unsafe id (N8) is skipped with a warning; a duplicate project keeps the first.
   - It writes `task.json` files and then `project.json`, and renames the context and draft directories through contained-directory checks.
   - Output is validated with the current readers. Only then is `projects.json` retired to `projects.pre-folders.json` and the old directories removed if empty.
   - Statuses: SUCCEEDED / SUCCEEDED_WITH_WARNINGS / FAILED. A retry recognizes completed targets.
7. **Composition.** `compositions/project-task-agent-resource-composition.ts` loads the view once after migrations (taking `appDataDir` explicitly) and binds the port and the stop request. Both hosts compose it and release it on close and on rollback.
8. **Tool read (Q-2).** `list_project_tasks` returns open `assigned` entries as `{targetAgentRunId, kind, assignedBy, outcome}`, or `assignmentsUnavailable: true`. The tool description is in business wording (N6).

## Routing Classification (Mandatory)

- Task size **Large**, architectural risk **High**. **Confirmed** against design-spec "Task Size And Architectural Risk": a persisted ownership model change, migration of released user data, and concurrency-sensitive dispatch/release.
- Selected route: **Code Review**.
- Lightweight self-review for the direct route: Not Applicable.
- New design impact or escalation trigger: **None.** I checked the design's escalation conditions:
  - Every Task-owned copy goes through link before register: owned delegation, bring-in and assignment all link first.
  - No supported path needs ownership before the view is loaded: composition awaits `load()` before the supervisor exists.
  - The only released source shape is covered.

## Reviewed Behavior Implementation Trace

| ID | Implementation outcome |
| --- | --- |
| BEH-003/004 | `delegate` → `resolveAssignment` (saved packet; unknown, DONE or damaged rejected) → link `assigned` before register → seed → `markStarted`. |
| BEH-005 | One file per Task; the Manager reads current assignments (Q-2); the `starting` record is written before resources (B-6). |
| BEH-006/007 | DONE closes first (fences at once), then status, then exact stop per host root; repeat DONE retries; closed forever across restart and Delete. |
| BEH-008 | Delete removes `task.json`/`context/` (and `project.json`/`drafts/`), keeps `agent_run_resources.json`. |
| BEH-009 | `delegated`/`broughtIn` link only under an open creator (checked under the file lock); per-Task helper via `taskExecutionAt(address, openAgentRuns(taskId, "broughtIn"))`; cross-Task messaging rejected `TASK_AGENT_RESOURCE_CONFLICT`. |
| BEH-001/002/010 | Same Projects APIs and errors over the per-folder store; business-only Manager and LLM contract unchanged. |

Changes stayed within the requirements doc's Scope Guardrail: **Yes**.

## Key Files Or Areas

Paths are relative to `autobyteus-server-ts/src/`; the full list is in the commit.

- **Added:**
  - `agent-collaboration/execution/task/{task-agent-resource-port.ts,root-task-agent-resource-scope.ts}`
  - `projects/stores/{projects-layout.ts,task-agent-resource-schema.ts,task-agent-resource-store.ts}`
  - `projects/domain/task-agent-resources.ts`
  - `projects/services/task-agent-resource-service.ts`
  - `projects/runtime/task-agent-resource-release.ts`
  - `compositions/project-task-agent-resource-composition.ts`
  - `app-data-migrations/migrations/projects-per-folder-v1/*`
- **Deleted:**
  - the gate, the lifetime contract and the lifetime scope;
  - `projects/{domain/project-task-execution*.ts, stores/project-{state,metadata}-schema.ts, runtime/project-task-runtime-release.ts, context/project-task-context-layout.ts}`;
  - `compositions/project-task-lifetime-composition.ts`.
- **Reverted to the released base** (Task-free): the tree shared records and schema, `task-execution-tree-projection.ts`, and the three execution indexes.
- **Rewritten or modified:** lifecycle, dispatch and adapter interface; the three adapters; recipient routing; facades and directory; supervisor and builders; `ProjectStore`, `ProjectService`, `ProjectTaskService`, context store; tool manifest/contract; migration registry; both hosts.
- **Tests:**
  - New: dispatch, tree-scope, per-folder store, agent run resources, migration (with committed released-shape fixtures), and a runtime port fixture.
  - Retargeted: lifecycle, quiet-generation, recipient routing, Projects unit, Task tools, Native/Task integration, the two Projects e2e files, architecture, supervisor/host, and the projection tests (dev-residue stamps are dropped).

## Important Assumptions

- **Naming.** The port follows the data model's `agentRun` naming (`linkAgentRun`, `openAgentRuns`, `TaskAgentResourceStopResult.agentRun`) rather than the interface sketch's `run`. The error codes follow the design (`TASK_AGENT_RESOURCE_CLOSED` / `_CONFLICT` / `_OWNED_SENDER` / `_NOT_CLOSED`, `TASK_AGENT_RESOURCES_UNAVAILABLE`, `PROJECTS_MIGRATION_PENDING`).
- **N4.** `resolveAssignment(taskId)` drops the vestigial `sender` argument, as N4 allows: owned senders are rejected before it is called.
- **Damaged runtime rejections.** Port rejections are `ProjectError`s carrying the coded `code`; the runtime converts them to `TaskDelegationError` with the same code. The UI and tool surfaces show the existing `ProjectError` code and message.
- **Retained original.** If `projects.pre-folders.json` already exists when retiring the source, the migration fails rather than overwriting it. This can only follow manual tampering, and the gate then stays on.

## Known Risks

1. `tests/e2e/projects/projects-startup-no-write.e2e.test.ts` (API/E2E-owned, uncommitted edits present) asserts that startup never rewrites Projects data. That contradicts the approved SR-024 startup migration, and it currently passes only against the stale pre-SR-024 `dist/`. I left it unedited for its owner to retarget.
2. Real-startup and real-upgrade evidence is not run here: both entrypoints on a rebuilt `dist/`, and a stopped-writer disposable copy of an installed profile.
3. Application-platform scoped Team roots receive no port (unchanged from IR-012, accepted in CRR-025): linked work is unavailable there; unlinked work is unchanged.
4. Absolute context paths in past agent conversations keep their old text after the move (E-100, accepted).
5. Released IDs that fail the safe-segment rule stay only in the retained original (N8, warning).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor of a feature under construction, user-directed.
- Reviewed root-cause classification: Boundary Or Ownership Issue (Task ownership had two homes), plus storage granularity.
- Reviewed refactor decision: Refactor Needed Now.
- Implementation matched the reviewed assessment: **Yes.** One owner per fact; net source delta 671 insertions / 1167 deletions.
- If challenged, routed as Design Impact: N/A.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None. Old-shape reading exists only in the frozen migration reader; current code only tests `projects.json` for existence.
- Legacy old-behavior retained in scope: No.
- Dead/obsolete code removed in scope: Yes (see Key Files).
- Shared structures remain tight: Yes. Tagged unions for `agentRun` and `hostRoot`; `assignedBy` exists only for `assigned`; `startError` only for `failed`.
- Canonical shared design guidance reapplied: Yes.
- Changed source files within size guardrails: Yes. The largest changed file has 457 effective lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision: **Migration Required** for released Projects (C-3); **Directly Usable — No Migration** for execution trees (tolerant reader drops dev residue). `agent_run_resources.json` is new.
- Implementation follows the decision without an unapproved migration or version-specific runtime fallback: Yes. The registered `projects-per-folder-v1` migration follows design § Migration Plan and the data migration guideline; there is no runtime dual layout.
- Evidence: committed released-shape fixtures and the migration test (see local checks).
- Deviation: None.

## Environment Or Dependency Notes

No dependency change. `dist/` was not rebuilt here.

## Local Implementation Checks Run

Details are in `implementation-evidence/ir-013/local-check-commands.md`, with the full design-control map. These are local checks only.

- Typecheck exit 0. Greps #1/#2 empty; #3 shows only the gate path.
- Focused set: **53 files / 566 tests Pass**.
- Wide run: **4771 Pass / 82 Fail / 6 Skip**. The failing names are byte-identical to the pre-existing IR-012 baseline (unchanged HEAD `ccb5fbe3`); no new failures.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. No web or renderer change; the Projects UI uses the same GraphQL API and the existing error alert surfaces `PROJECTS_MIGRATION_PENDING` / `TASK_AGENT_RESOURCES_UNAVAILABLE`.

## Downstream Coverage Hints / Suggested Scenarios

- Changed-build API/E2E:
  - Manager journeys on Agent, Team and Org roots: assign, owned delegation and bring-in, DONE fence, repeated DONE stop retry, restart-closed, reopen, Delete.
  - A damaged `agent_run_resources.json` (UI alert, tool error, up-front description-only rejection).
- Upgrade:
  - Both startup entrypoints on a rebuilt build with a released `projects.json` (plus context and drafts): gate before and after, migration status, list identical.
  - Repeat startup.
  - A stopped-writer disposable copy of an installed profile.
- Retarget `projects-startup-no-write.e2e.test.ts` to the SR-024 migration semantics.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent source review comes first, then the API/E2E recheck on the changed build (owned by `/api_e2e_engineer`), then the Delivery docs resync. DR-002 must not finalize `ccb5fbe3` / `4b04d9097`; the current candidate is `b61b8452f`. No push, merge, release or deploy is authorized here.

## Informational Source Review Result — CRR-027
Code Reviewer: **Pass, CRR-027 (9.3/10)** on `b61b8452f`; all flagged items were accepted or routed to API/E2E.

Future obligation: before changing the current Projects readers or `ProjectsLayout`, repoint the `projects-per-folder-v1` retry classifier and target paths to frozen copies.

The API/E2E recheck on the changed build is now with `/api_e2e_engineer`. No implementation action is required.

## Informational Source Review Result — CRR-030
Code Reviewer: **Pass, CRR-030** (targeted delta, 9.3 carried) on `e94d83538`. The API/E2E validation on the changed build is now with `/api_e2e_engineer`. No implementation action is required.

---

# IR-015 Addendum — SR-026 / REQ-BL-010 (Small / Low, direct route)

**Implementation complete.** Commit **`335f78c20`** on `e94d83538`.

- **Change:** `codex-app-server-launch-config.ts`. `parseArgs()` now always appends `-c features.multi_agent=false -c features.multi_agent_v2=false` after the default or env-overridden app-server args. It uses `-c`, not `--disable`, per E-103. The user's `~/.codex/config.toml` is never edited.
- **Delta classification:** Small / Low, confirmed (one function and one constant; no new owner, contract or persistence). The cumulative package stays Large/High with its reviewed parts untouched.
- **Lightweight self-review:** done; see revision record IR-015.
- **Local checks:**
  - New unit test (5 cases); Codex suites 23 files / 303 tests Pass; typecheck 0.
  - Real codex-cli 0.160.0 smoke in an isolated `CODEX_HOME`: the override args start cleanly, and the `--disable <unknown>` control fails with `Unknown feature flag`.
- **Frontend rendered check:** Not Applicable (server launch arguments only).
- **Downstream:** AC-017 API/E2E with the user-level feature on; Codex journeys regression.
