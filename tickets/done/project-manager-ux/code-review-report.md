# Code Review Report — `project-manager-ux`

## Review Round Meta

> **Latest round: 3, `Implementation Review` / `Targeted Delta Review` of IR-002 (CRR-003). Result: `Pass` → `/api_e2e_engineer`.** See "Implementation Review (Round 3)" below. Round 2 (failure origin) and round 1 (full review) stay as history. Round 1's structural checks and scorecard carry forward, with the round-3 score updates.

- Round 3 (delta review):
  - Trigger: IR-002 Local Fix (commit `8ef467696` on `4d469b0c5`) from `/implementation_engineer`.
  - Review Scope: `Targeted Delta Review`. Evidence for the scope: the change since round 2 touches only the files and behavior of CR-002 and CR-001 (`taskRootPresentation.ts`, `ProjectTaskWorkers.vue`, `TempTaskBoard.vue`, one spec, and a comment move in `task-agent-resource-service.ts`). There are no spine, interface or data-shape changes.
  - Prior review round reviewed: round 2 (CRR-002, `Fail`).

- Round 2 (failure-origin):
  - Trigger: API/E2E `Fail` (API-REV-001) from `/api_e2e_engineer`, 2026-10-07.
  - Failing scenario: F-001 / RELEASE-BUILD.
  - Execution mode: `pnpm -C autobyteus-web build:electron:mac`; reproduced alone with `node autobyteus-web/scripts/audit-localization-literals.mjs`, which exits 1.
  - Coverage investigation: `.../api-e2e-coverage-investigation.md`
  - Execution report: `.../api-e2e-execution-coverage-report.md`
  - API/E2E revision record: `.../api-e2e-revision-record.md` (API-REV-001)
  - Evidence: `.../api-e2e-evidence/electron-build.log`, `.../api-e2e-evidence/l10n-audit.log`
  - Testing guideline applied: root `TESTING.md` (as recorded by the coverage investigation). The governing contract for this failure is `autobyteus-web/docs/localization.md` › "Required Validation".
  - Review Scope: `N/A` (failure-origin round; no new full audit or scorecard)
- Review Entry Point (round 1): `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/requirements-doc.md` (SR-003, Approved 2026-10-07)
- Investigation Notes Reviewed As Context: `.../investigation-notes.md` (A1–A14)
- Solution Revision Record Reviewed As Context: `.../solution-revision-record.md`
- Design Spec Reviewed As Context: `.../design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md` (behavior-defining; TR-001..008 checked against the row/root click behavior)
  - `product-design-request.md` and `product-design-request-r2.md` (context only)
- Relevant Solution Revision IDs: `SR-003` (requirements), `SR-005` (design)
- Design Review Report Reviewed As Context: `.../design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `.../implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: IR-001 ready for source review, from `/implementation_engineer` (2026-10-07)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Failure-origin and delivery fields: N/A
- Reviewed code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux`, branch `codex/project-manager-ux`.
  - Implementation commit: `4d469b0c5`, compared against the package commit `da2f961be`.
  - Base: `origin/personal@7d130309e`.

## Implementation Review (Round 3) — Targeted Delta Review of IR-002

### Prior findings rechecked

| Finding | Status | Verification Evidence |
| --- | --- | --- |
| CR-002 (blocking) | `Resolved` | <ul><li>`TASK_ROOT_STATE_LABEL_KEYS` (running/initializing/idle/error/offline/failed) and `TASK_ROOT_KIND_LABEL_KEYS` (agent/team) are typed `Record`s of literal keys in `utils/projects/taskRootPresentation.ts`.</li><li>`ProjectTaskWorkers.vue` uses them for the status label and the kind fallback name; the same runtime-key pattern in the script was also fixed.</li><li>`TempTaskBoard.vue` uses `LANE_LABEL_KEYS` (open/done).</li><li>Catalog entries and copy are unchanged.</li><li>Reviewer reran: `pnpm guard:localization-boundary` passes; `node scripts/audit-localization-literals.mjs` reports "Passed with zero unresolved findings" (exit 0).</li><li>A scan of every changed web source since `da2f961be` finds no remaining ``t(`…`)`` template-literal keys.</li><li>The new spec checks that every mapped key exists in en and zh-CN.</li><li>`pnpm test:nuxt utils/projects components/projects`: 85/85 pass.</li></ul> |
| CR-001 (non-blocking) | `Resolved` | The `forget()` doc comment is back directly above `forget()`; `latestAssignment` has one doc block |

### Delta checks

- Ownership and placement: the key maps sit beside the presentation rule (`taskRootPresentation.ts`) that defines the states; the lane map is local to the only component with lanes. They are typed by the state, kind and lane unions, so a new state cannot compile without a key.
- No behavior change: labels resolve to the same catalog entries. No other files changed (server `tsc` is clean, per the handoff).
- New observations: none. No candidate needed the scenario gate (pure localization-contract and readability fix).
- Release build: `build:electron:mac` was not rerun here. The gate that failed is now green; the full packaging run belongs to API/E2E's F-001 recheck.

### Scorecard updates (carried from round 1; only affected rows change)

| Category | Round 1 | Round 3 | Reason |
| --- | --- | --- | --- |
| `Naming Quality and Local Readability` | 9.1 | 9.3 | CR-001 fixed |
| `API/E2E Readiness` | 9.3 (corrected below 9.0 in round 2) | 9.3 | The mandatory localization gate is green (verified); the remaining packaging run is API/E2E's to confirm |
| `Cleanup Completeness` | 9.3 | 9.4 | CR-001 fixed; runtime-key pattern removed everywhere in scope |
| All other categories | as round 1 | unchanged | Not affected by the delta |

- Overall: 9.4/10 (simple average); every category ≥ 9.3.

## API/E2E Failure-Origin Review (Round 2)

### Scenario / contract basis

- Supported scenario: the product ships as a packaged desktop app. REQ-010 requires en/zh-CN copy that follows the approved spec, and Projects is a desktop feature (requirements: "Desktop user", "Projects behind `ENABLE_PROJECTS`; desktop only").
- Governing engineering contract: `autobyteus-web/docs/localization.md` › "Required Validation":
  - before shipping new localized UI work, run `pnpm guard:localization-boundary` and `pnpm audit:localization-literals`;
  - both are wired into every `build:electron*` script, so packaged builds fail if the audit regresses (`autobyteus-web/package.json:40-45`).
- The failing test is the product's own release build, not a synthetic test. The scenario is valid and still represents approved behavior.

### Reproduction and evidence

- `node autobyteus-web/scripts/audit-localization-literals.mjs` exits 1 at `4d469b0c5` with exactly:
  - `M-015 components/projects/ProjectTaskWorkers.vue projects.root.status.{{expr}} unresolved`
  - `M-015 components/projects/TempTaskBoard.vue projects.temp.lane.{{expr}} unresolved`
- Source:
  - `ProjectTaskWorkers.vue:37`: ``{{ t(`projects.root.status.${presentation.state}`) }}``
  - `TempTaskBoard.vue:37`: ``{{ t(`projects.temp.lane.${lane}`) }}``
- Both files are new in `4d469b0c5` (`git show --stat`), so the base cannot contain these findings. API/E2E saw the same audit pass with zero findings on the earlier `reactivate-done-task-runs` build.
- The catalog keys exist in en and zh-CN, so the rendered copy is correct. The defect is that the audit cannot resolve keys built at runtime.

### Origin classification

- Origin: `Implementation defect` (bounded). The new components build their localization keys at runtime, which the repository's mandatory literal audit rejects. The IR-001 handoff's local checks list `vue-tsc` and the web suites but not the documented localization checks. The fix is local: resolve each value through statically visible `t('…')` keys, for example a typed `Record` from state to key or an explicit key per value. No design or requirement change is needed.
- Review gap: `Yes`. This was reasonably detectable in source review. `docs/localization.md` names the audit as mandatory for new localized UI, and both template-literal `t(...)` calls were visible in the diff. The round-1 review checked catalog parity and copy against the spec but did not run, or require, the documented localization checks. The affected round-1 rationale is corrected below (CR-002; scorecard notes).
- Not attributed: O-1, a single PMU-002 click that did not open the worker (1 in 15 runs, not reproduced in 14 more). No source evidence ties it to a defect, so it is `Hold for Evidence` and drives no finding. The probe now keeps console output on failure, which will show whether it recurs.
- Remaining validation: everything else API/E2E ran passes. Durable test-code review is deferred until a successful API/E2E run, as the workflow requires.

### Affected round-1 score rationale (updated, not re-scored)

- `API/E2E Readiness` (round 1: 9.3): incorrect. The release build was not ready because a mandatory build-gating audit fails. It is below the 9.0 bar until CR-002 is fixed.
- `Cleanup Completeness` (round 1: 9.3): unchanged apart from CR-001.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required: `Yes`
- Classification evidence or correction required: None. The change spans:
  - a new realtime contract (`/ws/projects`);
  - a persisted optional field;
  - a cross-subsystem status query across three root kinds;
  - a shared contracts export;
  - a rewritten web store with queue/replay;
  - new routes.

## Review Scope

- Changed implementation and behavior reviewed: DS-001..DS-006 and the A-1 clarification.
  - DS-001: the change feed.
  - DS-002: live worker status.
  - DS-003: snapshots with roots and `tasksWithoutProject`.
  - DS-004: root navigation.
  - DS-005: F-006.
  - DS-006: store ordering.
- Files / areas reviewed:
  - Server Projects:
    - `projects/changes/*`
    - `task-root-view-builder.ts`
    - `project-service.ts`, `project-task-service.ts`, `task-agent-resource-service.ts`
    - `ad-hoc-task-store.ts`, `task-agent-resource-schema.ts`
    - `models.ts`, `task-agent-resources.ts`
  - Server collaboration: the lifecycle, adapter interface, scope, dispatch and port, plus `active-collaboration-root-directory.ts`.
  - Server roots: three roots, three adapters, three indexes, and `team-task-execution-service.ts`.
  - Server API and composition: `api/websocket/projects.ts`, GraphQL `project-tasks.ts`, the composition.
  - Contracts: `team-aggregate-status.ts`.
  - Web:
    - `projectChangeFeed.ts` and `useProjectChangeFeed.ts`
    - `projectStore.ts`, `projectTaskStore.ts`
    - `taskRootPresentation.ts`, `useTaskRootNavigation.ts`
    - `ProjectTaskWorkers.vue`, `ProjectTaskRow.vue`
    - `AgentRunTaskRows.vue` and its parent `onSelectRun`
    - `workspaceTeamAggregateStatus.ts`
    - Temp tasks components and routes
  - Docs.
- Reviewer verification run:
  - Server: `tests/unit/projects`, `task-execution-status`, `root-task-reactivation`, `root-task-execution-lifecycle`, `task-agent-resource-dispatch`: 16 files, 191 tests, all pass.
  - Web: `utils/projects`, `services/projects`, `projectLiveChanges`, `projectTaskStore`, `components/projects`, `AgentRunTaskRowsSelect`: 17 files, 115 tests, all pass.
  - The main checkout's `autobyteus-web/generated/graphql.ts` is clean, which confirms the incident restore.
- Explicit exclusions:
  - The regenerated `generated/graphql.ts` and the contracts `dist/` were not reviewed line by line.
  - Rendered evidence was accepted as the implementer's self-check.
  - Real-provider and AC-level validation belong to API/E2E.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (live Projects pages, a Task root with the worker's own status, the openable rule, Temp tasks, F-006).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-002 Pass. AR-001 (Publication Contract) and AR-002 (openable rule) are implemented as specified; AR-003 is honored (`load()` uses `swap` and does not notify).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- A-1 (starting roots): consistent with the design's label rule ("Initializing while `starting`"). It is implemented once, on the server. A start stranded in an inactive host reads Offline instead of a permanent Initializing, which follows from DEC-006 ("the worker's real state"). This does not change the openable rule.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | No Manager surface added | — |
| BEH-002 | Confirmed | Only `ProjectService` (create/update/delete), `ProjectTaskService` (create/update/updateById ad hoc/ad hoc create/delete/ad hoc deletion with a run) and `TaskAgentResourceService.commit()` (link/settle/close/reopen) mark. The publisher marks synchronously, flushes on `setImmediate`, and serializes and coalesces per subject. Hub broadcast → `/ws/projects` → `ProjectChangeFeed` → `projectStore.applyChange` / `projectTaskStore.applyChange` (DS-006 queue/replay; `connected` re-reads) | — |
| BEH-003 | Confirmed | `latestAssignedEntry` → `buildTaskRootView`. Status comes from the composition resolver → `activeRootDirectory.resolve(hostRoot)?.taskExecutionStatus` → lifecycle (`offline` when not accepting) → adapter (agent snapshot / team fold / team-hosted leaf). `onAgentStatus` → scope → port → `rootTaskLocationOf` → status mark. Navigation: agent host `openWorkspaceExecutionLink` + `selectChild` (task Team expanded); team host member link; org host inspect action | — |
| BEH-004 | Confirmed | `closedAt` → `offline` without asking the root. `presentTaskRoot` shows it muted and not openable. TR-007 "no click" holds: the non-openable root is a `div`, and its click is stopped and does nothing | — |
| BEH-005 | Confirmed | `AgentRunTaskRows.select` always emits `select-run`. `onSelectRun` → `selectTreeRun` → `emitRunSelected` navigates; the child is selected first | — |
| BEH-006 | Confirmed | `AdHocTaskStore.list()` (skips damaged folders) → `listTasksWithoutProject` → GraphQL `tasksWithoutProject`. The web Temp list uses the `no_project` scope, Open/Done lanes, and read-only components and routes | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 | BEH-002, REQ-003 | User | Desktop user (agent writes) | Watch agent work appear | Projects pages open while an agent uses the Project tools | Normal | DS-001 | Live list, board and page with highlights | Requirements SR-003; ui-ux TR-001..004 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003, REQ-004/009 | User | Desktop user | Reach the worker | Root line click | Normal | DS-003/DS-002/DS-004 | Worker conversation opens, selected | REQ-009; TR-005 | Supported Normal Scenario | Use |
| SCN-004 | BEH-005, REQ-007/008 | User | Desktop user | Left-panel click from any page | Task row click on `/projects` | Normal | DS-005 | Conversation opens | F-006; TR-008 | Supported Normal Scenario | Use |
| SCN-005 | BEH-004, REQ-004/016 | User | Desktop user (agent DONE / failed start / reactivation) | See the outcome | Board / Task page | Normal | Resource commit → mark → view | Offline / Couldn't start / live again | DEC-006, DEC-008 | Supported Normal Scenario | Use |
| SCN-006 | BEH-006, REQ-011..015 | User | Desktop user | Temp tasks | Temp tasks button | Normal | DS-003/DS-001 `no_project` scope | Live Open/Done, read-only page | Requirements round 2; DEC-010 | Supported Normal Scenario | Use |
| A-1 | REQ-004, DEC-006 | System | Fresh delegation in an active root | Show the worker's status while it is starting | Root line | Normal | `start === "starting"` + active host → `initializing` | Initializing, then the live status | Design label rule; browser finding | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `onAgentStatus` now forwards status changes after the root stops admitting | DS-002; design "Root shutdown announces all its task executions" | Root stop with agents going offline | Marks only. The read goes through `taskExecutionStatus`, which returns `offline` when not accepting, so a root reports Offline consistently. Possible extra duplicate `task_worker_status` frames, which coalescing bounds | `root-task-execution-lifecycle.ts` | Reject | Correct and harmless; matches the design's shutdown announcement |
| C-002 | A-1 `starting` → `initializing` is decided on the server; a resolver `null` means "no active host" | Design label rule; DEC-006 | Fresh delegation | `markStarted` commit → mark → the next build reads the live status | `task-root-view-builder.ts`; composition | Reject | Consistent with the approved rule; avoids both a permanent Initializing and a false Offline |
| C-003 | The row restructure (div + stretched link; root line at `z-10` swallows clicks when not openable) | ui-ux TR-006/TR-007; QR-003 | Click on the root line of a DONE Task | Nothing happens; the rest of the row opens the Task | `ProjectTaskRow.vue`, `ProjectTaskWorkers.vue`; spec TR-007 "no chevron, no click" | Reject | Matches the spec. Focus order is row link, then root button (spec line 244) |
| C-004 | DS-006 replay could apply a stale queued upsert onto a newer snapshot | DS-006 | Event in flight during a read | FIFO socket plus per-subject commit-order emission: every commit emits a later event that is queued or applied after the replay, so the list converges | Publisher contract; store `replayQueued` | Reject | Not reachable as a lasting regression |
| C-005 | Each Task mark also re-publishes its Project, which re-reads the Project's Task folders for counts | DESIGN.md (measure before optimizing); design Risks | Busy agent on a large Project | Measured 64 messages over 7 journeys; status-only marks do not mark the Project | Handoff Known Risks | Reject | Not a demonstrated problem; record as a watch item |
| C-006 | The Standalone and Org adapters carry identical `taskExecutionStatus` bodies | No unjustified duplication | — | 2 × 15 lines | Existing per-root adapter mirroring | Reject | Follows the established adapter structure (as in the prior ticket) |
| C-007 | `TaskAgentResourceService`: the `forget()` doc comment ("Call under `serialize`") is now stacked above `latestAssignment`, leaving `forget` undocumented and `latestAssignment` with two doc blocks | Engineering contract: readability / documented invariants | — | Editor hovers show the wrong text; `forget` loses its "call under serialize" invariant | `task-agent-resource-service.ts:151-152` | Promote (non-blocking, Low) | CR-001. A trivial move; no behavior impact |
| C-008 | The regenerated `generated/graphql.ts` also picks up earlier base schema drift (skill sources) | Generated output contract | — | Generated file matches the current schema | Handoff Environment Notes | Reject | Generated output must reflect the schema; not hand-written code |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Extends the owners; one publisher plus one hub; fold moved; F-006 local fix | — |
| Implementation matches behavior-defining supplements | Pass | Root states (DEC-006 instead of Stopped), TR-005..008, 2.4 s highlight with a reduced-motion static tint, Temp Open/Done, read-only page | — |
| Data-flow spine inventory clarity | Pass | DS-001..006 each map to one path | — |
| Ownership boundary preservation | Pass | Writers mark; the publisher builds; the hub fans out; roots answer status; the web reads through stores | — |
| Off-spine concern clarity | Pass | Root view builder, status resolver, shared fold, presentation rule | — |
| Existing capability reuse | Pass | Remote-access websocket auth, `openWorkspaceExecutionLink`, `selectChild`, Org inspect action, board components | — |
| Reusable owned structures | Pass | `foldTeamAggregateStatus` lives once in contracts and is used by both server and web | — |
| Shared-structure tightness | Pass | `TaskRootView` is minimal; one message union; one scope union | — |
| Repeated coordination ownership | Pass | Only owners mark; no resolver or tool publishes | — |
| Empty indirection | Pass | Root `taskExecutionStatus` methods are the boundary members the design requires | — |
| Separation of concerns / file responsibility | Pass | New files each own one concern | — |
| Ownership-driven dependency | Pass | `projects/*` reaches roots only through the composition-bound resolver; the lifecycle reaches the Task side only through the port | — |
| Authoritative Boundary Rule | Pass | No caller uses both the boundary and its internals | — |
| File placement | Pass | `projects/changes/`, `projects/services/`, `services/projects/`, `utils/projects/` | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | Two explicit queries; scope union; `taskExecutionStatus(reference)` | — |
| Naming quality | Pass | Names match responsibilities. One displaced doc comment (CR-001, non-blocking) | Move the comment |
| No unjustified duplication | Pass | C-006 follows the existing pattern | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead/obsolete cleanup | Pass | Old web fold body, the F-006 guard and stale docs text removed | — |
| Test scenarios clear and requirement-aligned | Pass | AR-001 tests (wake → Running, DONE order, coalescing, no publication during `load()`); AR-002 presentation tests; DS-006 replay; F-006 (all mutation-checked) | — |
| Test fixtures/helpers coherent | Pass | Updated shared fixtures; real registries in `task-execution-status.test.ts` | — |
| No stale/compat-only tests | Pass | Probe selectors updated for the row restructure | — |
| API/E2E readiness | Pass | Coverage hints and the `/ws/projects` contract and auth checks listed | — |

## Source File Size And Structure Audit

All changed implementation-source files are at most 460 effective non-empty lines, and no file grew by more than 220 lines. Largest: `root-team-run.ts` 460 (+5), `standalone-agent-run-root.ts` 405 (+5), `project-task-service.ts` 403 (+60/−4), `agent-org-task-execution-adapter.ts` 386 (+18), `standalone-root-task-execution-adapter.ts` 374 (+18). New files: the publisher 145 lines, `projectTaskStore` ~190. `teamExecutionViewState.ts` was left untouched, as the design asked.

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| All changed sources | ≤ 460 | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Old entries without `recipientAddress` are read as-is: their absence has a truthful meaning (kind-only label), and there is no tree fallback |
| No legacy old-behavior retention | Pass | Manual-only freshness replaced; Refresh stays as an explicit action |
| Dead/obsolete cleanup | Pass | — |
| Persisted-data decision followed (`Directly Usable — No Migration`) | Pass | Optional field; nonblank and only on `assigned`; the writer emits it only when present |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Files updated:
  - server `docs/modules/projects.md` (live feed, roots, `recipientAddress`, `tasksWithoutProject`, the "never persisted" text corrected);
  - web `docs/projects.md` (live pages, root line, Temp tasks, F-006, probe; stale "No polling…" removed).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 (stale Initializing read inside the dispatch) | Confirmed | `setImmediate` flush; the wake → Running test fails with a synchronous flush (mutation check) |
| P-002 (DONE's two publications out of order) | Confirmed | Per-subject serialized, coalesced builds; DONE commit-order test |
| P-003 (`starting` root clicked) | Confirmed | Not openable (`start === "started"` is required) |
| P-004 (host chat deleted) | Confirmed | `isTaskRootHostListed` false → not openable; browser PMU-004 |
| P-005 (`load()` publishes) | Confirmed | `load()` uses `swap` only; test |

New or reclassified premises: None (A-1 is recorded in the scenario gate).

## Review Scorecard (Mandatory)

- Overall score: 9.4/10 (94/100)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001..006 are each traceable in code; the publication contract is documented at the owner | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Marks come only from owners; the status comes only from the hosting root; the composition is the single binding point | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Explicit queries, a scope union, a strict zod message contract, an optional boundary member | `taskExecutionsStatusChanged` keeps an unused `hostRoot` parameter (design-specified) | — |
| 4 | Separation of Concerns and File Placement | 9.4 | New concerns each have one file in the owning area | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | One fold in contracts; `TaskRootView` minimal; the persisted field tight | — | — |
| 6 | Naming Quality and Local Readability | 9.1 | Clear names and contract docs | CR-001: a displaced doc comment hides `forget()`'s serialize invariant; some long single-line expressions (house style) | Move the comment |
| 7 | API/E2E Readiness | 9.3 | Probe PMU-001..007 and PT-E2E-001..016 pass; precise coverage hints | Real-provider status transitions and AC-012/013 breadth are not yet exercised (expected) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | AR-001/AR-002 exact; A-1 truthful; reading never wakes; failures never fail writes | Publication volume is a watch item (measured, acceptable) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | No fallbacks; old entries read truthfully | — | — |
| 10 | Cleanup Completeness | 9.3 | Stale docs and guard removed; fold moved | CR-001 | — |

## Findings

### CR-001 — The `forget()` doc comment is displaced onto `latestAssignment` (non-blocking, Low)

- Basis: engineering contract (readability; documented call invariant). Candidate C-007.
- Evidence: `autobyteus-server-ts/src/projects/services/task-agent-resource-service.ts:151-152`. The comment "Drops a Task whose files were removed from the view … Call under `serialize`." now sits directly above the new `latestAssignment` JSDoc. `forget()` (a few lines below) has no doc comment.
- Consequence: the "call under `serialize`" invariant is no longer attached to `forget()`, and `latestAssignment` carries the wrong extra doc block. No behavior impact.
- Required action: move that comment back directly above `forget()`. Fix it at the next implementation touch of this file, or as a trivial delivery-stage correction. It does not block API/E2E.
- Classification / owner: `Local Fix` (non-blocking) → `/implementation_engineer`

### CR-002 — Runtime-built localization keys fail the mandatory literal audit and block the desktop release build (blocking; new in round 2)

- Basis: engineering contract `autobyteus-web/docs/localization.md` › "Required Validation". The audit is wired into every `build:electron*` script. Supports REQ-010 (en/zh-CN copy) and the desktop product scenario.
- Evidence:
  - `node autobyteus-web/scripts/audit-localization-literals.mjs` exits 1.
  - M-015 is unresolved for ``t(`projects.root.status.${presentation.state}`)`` (`components/projects/ProjectTaskWorkers.vue:37`) and ``t(`projects.temp.lane.${lane}`)`` (`components/projects/TempTaskBoard.vue:37`).
  - `pnpm build:electron:mac` stops there (`api-e2e-evidence/electron-build.log`).
- Consequence: no desktop package can be built with this feature.
- Required action:
  - Replace both runtime-built keys with statically resolvable `t('…')` calls, e.g. a typed state → key map (`running`, `initializing`, `idle`, `error`, `offline`, `failed`) and `open`/`done` lane keys. Keep the existing catalog entries and rendered copy unchanged.
  - Then run `pnpm guard:localization-boundary` and `pnpm audit:localization-literals` (they must pass with zero unresolved findings), plus the affected component specs, and record them in the handoff's local checks.
  - Fix CR-001 in the same pass (move the `forget()` doc comment).
- Classification / owner: `Local Fix` → `/implementation_engineer`. Afterwards it needs source review again, then API/E2E (F-001 recheck, the desktop journey, the full probe and the feed suite).

## Classification

- Round 3: N/A (Pass). CR-001 and CR-002 are resolved.
- Round 2 (history): `Local Fix` (implementation-owned).

## Recommended Recipient

- Round 3: `/api_e2e_engineer`, per `get_handoff_rules`.
- Round 2 routed to `/implementation_engineer`; round 1 routed to `/api_e2e_engineer`.

## Residual Risks

- Publication volume: every Task view mark re-publishes its Project and recomputes counts from its Task folders. This is measured and acceptable; watch large Projects with busy workers.
- Org-hosted root opening was browser-checked once; Org selection edge cases (an Org run not yet hydrated) were not exercised.
- Openability depends on run history listing the host. A host created after page load becomes openable only after the history refresh.
- Not yet exercised: AC-012 (state kept across pages) and AC-013 beyond task-agent rows; worker status transitions with a real provider; two windows and node switching; the `/ws/projects` remote-access auth path.
- Process note: the codegen incident sent one read-only introspection request from the main checkout to an unidentified local server. The touched file was restored; I confirmed the main checkout's `generated/graphql.ts` is clean. No product impact.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, targeted delta review of IR-002)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (O-1 remains held for evidence; it drives nothing)
- Score Summary: 9.4/10; every category ≥ 9.3 (round-3 updates in the round 3 section)
- Failure Origin: N/A this round. The round-2 origin (CR-002, implementation defect plus a round-1 review gap) is resolved.
- Recommended Recipient: `/api_e2e_engineer`
- Round-2 notes (historical): Fail, Local Fix → `/implementation_engineer` for CR-002.
- Round-1 notes (historical):
- Notes:
  - Points the implementer flagged:
    - A-1, the row restructure and the lifecycle forwarding are all accepted.
    - The codegen incident had no product impact.
  - CR-001 is a non-blocking cleanup item.
