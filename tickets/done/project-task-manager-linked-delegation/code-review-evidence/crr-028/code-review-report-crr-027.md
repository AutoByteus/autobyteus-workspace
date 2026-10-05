# Code Review Report — CRR-027 (IR-013 Source Review: Task-Free Runtime, Agent Run Resources, Per-Project Folders)

## Latest Authoritative Result (summary)
**Pass — 9.3/10 (93/100).** IR-013 (commit `b61b8452f` on `4b04d9097`) implements the user-approved REQ-BL-009 (SD-AP-003; C-1–C-4, B-1–B-7, Q-1–Q-3) as designed in SR-023/SR-024 (ARCH-REV-010/011). It resolves CRR-026 F01–F03.

The data model now has one owner per fact:
- **Execution trees** carry no Task information.
- **Each Task's `agent_run_resources.json`** is the sole record of which agent runs belong to it: role, host root, run reference, start outcome, `closedAt`.
- **Shutdown state** is never persisted.
- **Projects** live in per-Project/Task folders, reached by a one-time startup migration.

No blocking findings. One future obligation (migration repointing) and the API/E2E-owned stale test are recorded below.

Prior CRR-025/026 report archived at `code-review-evidence/crr-027/prior-code-review-report-crr-025-026.md`.

## Review Round Meta
- Entry point: `Implementation Review`, round 27. Prior: CRR-026 (Fail — Design Impact, data model) and CRR-025 (Pass, IR-012 code).
- Scope: **Full Review of the changed model.** Persisted data, the port, runtime ownership, composition and migration all changed, so all structural checks and the full scorecard were rerun over `git diff 4b04d9097 b61b8452f` (94 files, +2958 / −2159), plus the unchanged spine it plugs into. Unchanged provider-private teardown keeps its CRR-022/024 basis.
- Basis: REQ-BL-009 replaces REQ-BL-008 where they differ; otherwise REQ-BL-008 carries forward. SR-023 + SR-024; data-model-draft.md; ARCH-REV-010/011; repo `DESIGN.md`; `docs/design/data_migration_guideline.md`; `.claude/skills/code-reviewer/design-principles.md`.
- Classification: Large / High / Reviewed, preserved.
- Untouched in this commit (correct): Delivery's 8 docs/TESTING.md paths, and the API/E2E engineer's uncommitted `projects-startup-no-write.e2e`.

## Prior-Finding Recheck
| Finding | Status | Evidence |
| --- | --- | --- |
| CR26-F01 runtime run state stored in the Task file | **Resolved** | No release/cleanup/pending state or release errors persisted. `TaskAgentResourceRelease` logs failures and repeat DONE re-requests the stop (Q-1). Only Task-level facts are stored: `start` with its own `startError`, and `closedAt`. |
| CR26-F02 Task file duplicating the runtime tree | **Resolved (by user decision C-1/C-2)** | There is now a single holder. Tree stamps are deleted from run-history schemas (residue grep for `taskLifetime`/`lifetimeId` is empty), and the Task side is the only record of membership. The user chose to record every run (assigned/delegated/broughtIn) on the Task side rather than only tree tops; that satisfies single ownership. |
| CR26-F03 overloaded and unintuitive fields | **Resolved** | Separate `startError`; the mixed Projects array is gone (per-folder files); vocabulary per C-4/B-7: `agentRunResources`, `agentRun`, `role: assigned/delegated/broughtIn`, `hostRoot`, tagged run with `coordinatorAgentRunId` only for Teams, `closedAt`. |
| CR25 observations (SR-022 wording, app-platform unbound) | Superseded | The gate, readExecutionDispatch and acceptance recording were removed by C-1. |

## Upstream Behavior Basis Confirmation
**Confirmed.** No contradicted or newly discovered behavior.

| Behavior | Status | Implementation evidence |
| --- | --- | --- |
| B-1 membership; N2 | Confirmed | `delegate`: an owned sender with `task_id` → `TASK_AGENT_RESOURCE_OWNED_SENDER`. Owned description-only → `delegated` (creator = owner run). `ensureTaskHelper` → `broughtIn`. Team members are covered through the containment chain (`ownerOf(chain)`). A run is never linked twice (`owners` map plus the file precondition). |
| B-2 hosting | Confirmed | `hostRoot` comes from `plan.target.root`; release is grouped per host root. |
| B-3 DONE / closed forever | Confirmed | `updateTask(DONE)` order: `closeTask` (closes every open entry under the file lock, view swapped on commit) → `task.json` status → `release(closedByHostRoot)`. All closed runs, including older periods, are re-requested. Fences read the in-memory view synchronously (`assertInputAllowed`, `assertMessageScope`, `acquireLiveLease`, dispatch `isOpen` after every await). The view is loaded from files at startup, so closed stays closed after a restart. |
| B-4 reopen | Confirmed | A new `assigned` entry opens; old entries stay closed; the Manager view shows only open `assigned` entries. |
| B-5 delete | Confirmed | `deleteTask` and `deleteProject` remove metadata and context and keep `agent_run_resources.json`; `TaskAgentResourceStore.list` enumerates independently of metadata. |
| B-6 never missed | Confirmed | `linkAgentRun` is written before `beginActivation`. An assigned link is serialized with `closeTask` and rechecks status. An inherited link checks the creator is open under the file lock. Release cancels the registered activation and invokes every retained exact authority regardless of liveness (AR9-F02b). |
| B-7 vocabulary | Confirmed | as above. |
| Q-1 | Confirmed | Nothing persisted; failures logged; no background retry. |
| Q-2 | Confirmed | `list_project_tasks` returns `assignments` `{targetAgentRunId, kind, assignedBy, outcome}`, or `assignmentsUnavailable`. |
| Q-3 | Confirmed | A damaged file marks only that Task (`damaged` map; non-fatal load). Assign and DONE for that Task fail clearly. Description-only delegation by a non-owned sender is rejected up front via `assertResourceDataReadable`. No self-repair. |
| C-3 migration / no lockout | Confirmed | `projects-per-folder-v1` is STARTUP_ONLY with a frozen released reader. Sources are retained (`projects.pre-folders.json`). Conflicts are preserved with warnings. The existence-only `PROJECTS_MIGRATION_PENDING` gate affects only Projects. App-data migrations run before composition (`server-runtime.ts:178` before `buildStudioServer`:239; standalone host `runPending` before compose). |

## Candidate Finding And Mechanism Gate
| Candidate | Observation | Scenario / contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| CR27-CAND-01 | The migration's retry classifier (`targetState`: is the target "already current?") and its output paths use **current** `readProjectFile`/`readTaskFile` and `ProjectsLayout` | data_migration_guideline §3/§4: a migration may import current code only to validate output; a released migration's classifiers are frozen; repoint before changing a current schema | **Reject as finding; recorded future obligation** | Design §Migration Plan states "current reader validates" output and the "already validates" rule explicitly (ARCH-REV-010 passed). The comparison is against the migration's own expected output, so it is output validation. Obligation: **before any future change to `ProjectsLayout`, `readProjectFile` or `readTaskFile`, repoint `projects-per-folder-v1` to frozen copies** (guideline §4). Recommended to note in the docs sync. |
| CR27-CAND-02 (flagged 1) | Port uses `agentRun` naming; `resolveAssignment` drops the sender arg | C-4 naming | Reject | Matches the user-approved vocabulary; the sender was vestigial (N4). |
| CR27-CAND-03 (flagged 2) | Coded `ProjectError` → `TaskDelegationError` with the same code | port contract | Reject | Allowlisted codes only (`asTaskDelegationError`); other errors pass unchanged. |
| CR27-CAND-04 (flagged 3) | `projects-startup-no-write.e2e` (API/E2E-owned, uncommitted) asserts "no startup rewrite", contradicting SR-024; passes only against stale `dist/` | API/E2E test ownership | **Route to API/E2E (their Local Fix)** | Not implementation source; the next owner corrects it with a rebuilt dist. |
| CR27-CAND-05 (flagged 4) | Real startup entrypoints on a rebuilt dist and stopped-writer real-upgrade evidence not run | TESTING.md | API/E2E scope | Executable validation is owned downstream. |
| CR27-CAND-06 | `ProjectTaskService` port methods `ownerOf/isOpen/openAgentRuns/markStarted/markFailed/assertResourceDataReadable` forward to `TaskAgentResourceService` | Empty-indirection check | Reject | The facade owns real logic for `resolveAssignment` and assigned `linkAgentRun` (Task status/serialization); a single port implementer keeps the runtime boundary simple. Pure forwarding is limited to read accessors. |
| CR27-CAND-07 | Repeat DONE rewrites `agent_run_resources.json` with identical content (data model says "no file change") | data-model-draft Operations | Reject | Byte-identical atomic rewrite with no observable consequence; optional polish (skip the write when there are no open entries). |
| CR27-CAND-08 | Two `ProjectsLayout` instances (composition: `appDataDir`; store singleton: `appConfigProvider`) | N5 single path owner | Reject | One path-owning class with the same configured root; instances are not owners. |

## Structural / Design Checks
All **Pass**:
- **Spine:** DS assign → link → register → start/fail; DONE → close → status → stop per host root.
- **Ownership:** Task side owns membership/start/closed. Runtime owns liveness and stopping. Execution trees own execution facts only.
- **Authoritative boundary:** runtime → `TaskAgentResourcePort` only; tools/GraphQL/REST → Task/Project services; no store bypass.
- **Dependency direction:** runtime imports no `projects/` (grep empty, reviewer rerun); binding only in `compositions/project-task-agent-resource-composition.ts`.
- **Data-model tightness:** discriminated role/run; iff-rules validated by schema.
- **Reuse:** atomic `updateJsonFile`, the existing migration runner, process-instance pattern.
- **Removal:** gate, lifetime state, stamps, reports, recordCleanup, schema/metadata files and per-root scope all deleted.
- **Naming:** per C-4.
- **Tests:** retargeted; design guidance controls mapped (implementation evidence).
- **API/E2E readiness:** see recipient section.

## Source File Size Audit
All changed sources are < 500 effective lines. The largest new/changed: migration 250 raw, `project-store.ts` ~246, `project-task-service.ts` ~250, `task-agent-resource-service.ts` 170. No structural pressure.

## Legacy / Persisted-Data Verdict
Pass.
- The persisted-data decision (Migration Required, user-directed C-3) is followed. Old-shape reading exists only in the frozen `released-projects-array-v1.ts`.
- Current code only checks `projects.json` existence (gate).
- No dual reader or old-shape fallback.
- The unshipped dev `{taskLifetimes}` row is skipped as residue and kept in the retained original.

## Docs-Impact
Yes, significant. Delivery's 8 uncommitted docs describe the superseded lifetime model, and need a resync to:
- per-Project folders and the migration;
- `agent_run_resources.json`;
- Task-free execution trees;
- Q-1/Q-2/Q-3 behavior;
- the CAND-01 repoint obligation.

## Review Scorecard
Overall **9.3 / 10 (93 / 100)**.

| # | Category | Score | Why | Remaining drag |
| --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.4 | link-before-register and close-then-status-then-stop explicit | — |
| 2 | Ownership & Boundary | 9.5 | one owner per fact; runtime Task-free; single composition binding | — |
| 3 | API / Interface | 9.2 | small neutral port, coded rejections, business-shaped tool read | read accessors forward through the Task facade |
| 4 | SoC & Placement | 9.3 | path owner, store, resource service, release effect separated | — |
| 5 | Data-Model Tightness | 9.4 | discriminated role/run; separate start error; no runtime state | — |
| 6 | Naming & Readability | 9.2 | user vocabulary throughout | dense long lines in places |
| 7 | API/E2E Readiness | 9.1 | reviewer rerun 86 files / 758 tests Pass; tsc clean | stale no-write e2e and real-upgrade journeys pending downstream |
| 8 | Runtime Correctness | 9.3 | race orderings serialized/locked; fences synchronous over the loaded view | provider teardown basis unchanged |
| 9 | No Legacy | 9.2 | frozen source reader; existence-only gate | CAND-01 future repoint obligation |
| 10 | Cleanup | 9.4 | large net removal of superseded machinery | — |

## Findings
None blocking.

## Classification / Recommended Recipient
Pass. Primary recipient: `/api_e2e_engineer`, on a rebuilt changed build per TESTING.md:
1. Released-shape upgrade through both real startup entrypoints: migrate, retain `projects.pre-folders.json`, gate before and after, retry after a partial move, conflict and skip cases.
2. Correct the stale `projects-startup-no-write.e2e` (API/E2E-owned).
3. Assign → `agent_run_resources.json` entries (assigned/delegated/broughtIn) with outcomes.
4. DONE fence in Agent/Team/Org roots, including after a restart and after Task delete.
5. Repeat DONE re-stop.
6. Reopen gives new assigned entries.
7. Damaged-file behavior (Q-3), including up-front rejection of description-only delegation.
8. `list_project_tasks` assignments/unavailable.
9. Unlinked delegation unchanged.

Informational: `/implementation_engineer`. DR-002 must not finalize `ccb5fbe3` / `4b04d9097`.

## Residual Risks
- Provider-private teardown not re-traced (the Claude owner remains Unclear per SR-022).
- Real upgrade on user-shaped data is proven only by fixtures until API/E2E runs it.
- The 82 wide-run failures are an identical pre-existing baseline.

## Latest Authoritative Result
- Review Decision: **Pass**
- Entry point: Implementation Review, round 27, Full Review of the changed model
- Scenario gate: Pass. Material-premise gate: Pass (none new)
- Score: 9.3/10; all categories ≥ 9.0
- Recipients: `/api_e2e_engineer` (primary), `/implementation_engineer` (informational)
