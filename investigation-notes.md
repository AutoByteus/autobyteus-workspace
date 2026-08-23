# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated current-base ticket worktree created.
- Current Status: Investigation and SR-004 requirement-gap rework are complete. `ARCH-REV-001` passed the live/cold topology, migration, and retry design but exposed one omitted supported observer: Memory Sync v1. The user explicitly approved preserving the simple migration and documenting the existing replace-only/no-delete residue as a bounded `SUCCEEDED_WITH_WARNINGS` outcome. SR-004 is ready for renewed architecture review.
- Investigation Goal: Reproduce and localize nested-member conversation/Activity history loss across Docker restart, verify whether data is actually durable, identify the exact writer/reader identity and path contract, determine runtime breadth, and classify the existing-data transition.
- Scope Classification: `Medium`
- Scope Classification Rationale: The source defect is localized, but a complete repair crosses mixed-team runtime construction, recursive configured/task execution, canonical memory layout, startup migration, public history projection, and browser-visible cold hydration. Memory Sync adds an approved preserved-production-path assertion and docs/coverage, not a new implementation subsystem.
- Scope Summary: Correct nested team-member memory scope and recover existing affected directories; preserve direct-root history, root Team Communication, and Memory Sync v1; no UI, trace-schema, orchestration, or sync-protocol redesign.
- Primary Questions Resolved:
  - Relevant data is persisted and survives Docker restart.
  - The frontend is receiving and faithfully rendering a successful empty backend projection.
  - The writer drops physical TeamRun ancestry; current readers retain it.
  - Both configured nested members and delegated task-team members are affected.
  - The defect is runtime/model independent (verified with Codex/GPT-5.6 and AutoByteus/DeepSeek V4 Flash; architecture is shared by Claude as well).
  - Existing affected data is semantically valid but physically misplaced, so `Migration Required` is the correct persisted-data outcome.
  - Memory Sync is a recursive physical replication observer, but local and imported semantic memory reads still resolve the canonical V1 path. The approved v1 no-delete limitation may retain both physical paths without presenting two current runs.

## Request Context

The user reported a Docker-backed AutoByteus node at `http://localhost:8001`. A Software Development Department run using Codex/GPT-5.6 had visible nested-agent activity before Docker shutdown. After restart, the historical run and relative age remained in the workspace tree, but selecting a nested member such as `product_prototyper` showed a blank conversation. The user clarified that the missing surface was raw-trace-backed history and asked for a browser reproduction using a genuinely nested private AgentTeam fixture, AutoByteus runtime, and DeepSeek V4 Flash if available.

The supplied Team-panel screenshots initially suggested Team messages might also be involved. Direct probing disproved that part: the affected root still returns all 6 persisted Team Communication messages. The defect is specifically the per-AgentRun memory location used by conversation, Activity/Event Monitor, file changes, working context, and other member-scoped readers.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration`
- Current Branch: `codex/nested-team-history-restart-hydration`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration`
- Bootstrap Base Branch: refreshed `origin/personal` at `7edfb162559ec5a6eb4c00c23a929920eabe3dc1` (`2026-08-23T06:25:56+02:00`)
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-23.
- Task Branch: `codex/nested-team-history-restart-hydration`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` was used only to execute existing installed dependencies and temporary frontend/browser investigation. Authoritative task artifacts and later changes belong in this dedicated worktree.

### Docker Node

- Container: `autobyteus-server-0`
- Image: `autobyteus/autobyteus-server:latest`
- Port mapping: `8001:8000`
- Restart policy: `unless-stopped`
- Durable volume: `autobyteus-server-0-data` mounted at `/home/autobyteus/data`
- Workspace bind: `/Users/normy/.autobyteus/docker-server/shared-workspace/nodes/autobyteus-server-0` mounted at `/home/autobyteus/workspace`
- Health endpoint: `http://127.0.0.1:8001/rest/health`
- Controlled restarts: the container was restarted twice during requested testing; health recovered in five seconds each time. Final observed `StartedAt` was `2026-08-23T05:16:28.631077424Z`.

### Private Fixture Availability

The private agent package was already imported in the Docker node; no duplicate import was performed.

- Package ID: `local:%2Fhome%2Fautobyteus%2Fworkspace%2Fautobyteus-private-agents`
- Container path: `/home/autobyteus/workspace/autobyteus-private-agents`
- Host source: `/Users/normy/autobyteus_org/autobyteus-private-agents`
- Controlled fixture: `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test`
- Fixture topology: root `/Teacher`; configured subteam `/StudentStudyGroup`; nested agents `/StudentStudyGroup/student_one` and `/StudentStudyGroup/student_two`.
- Requested model availability: provider settings reported `deepseek-v4-flash` configured for AutoByteus.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/nested-team-restart-reproduction.md` | Durable reproduction package | Existing Codex run, controlled AutoByteus run, exact IDs/paths, restart, GraphQL, logs, and conclusion | Requirements, investigation, later design/review | REQ-001–REQ-006; AC-001–AC-012 | Complete | Evidence; approval N/A | Keep aligned if design changes migration scope |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/root-member-history-control.png` | Browser capture: direct-root control after restart | Direct member conversation and 1 Activity event still visible | Requirements, investigation | REQ-004; AC-003 | Complete | Evidence; approval N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/affected-codex-nested-member-post-restart.png` | Browser capture: affected user run after restart | Nested product prototyper is blank with 0 Activity events | Requirements, investigation | REQ-001, REQ-002; AC-001 | Complete | Evidence; approval N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/controlled-autobyteus-nested-member-post-restart.png` | Browser capture: controlled private fixture after restart | Nested `student_one` is present in the historical tree but blank with 0 Activity events | Requirements, investigation | REQ-001–REQ-003, REQ-006; AC-002, AC-010, AC-012 | Complete | Evidence; approval N/A | None |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_f69ba7836a55__image.png` | User screenshot: affected department tree and populated Team panel | Original nested hierarchy and 6 Team messages | Requirements, investigation | REQ-004; AC-004 | Retained user evidence | Evidence; approval N/A | None |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_57a57720cadc__image.png` | User screenshot: configured remote node | `http://localhost:8001`, remote-ready state | Investigation | REQ-002 | Retained user evidence | Evidence; approval N/A | None |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_26ddbd968b85__image.png` | User screenshot: populated historical Team panel | Team messages and reference files survive independently | Requirements, investigation | REQ-004; AC-004 | Retained user evidence | Evidence; approval N/A | None |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/ctx_73e4b305a940__image.png` | User screenshot: nested classroom symptom | Old nested member present but raw-trace-backed history empty | Requirements, investigation | REQ-001–REQ-003; AC-001, AC-002 | Retained user evidence | Evidence; approval N/A | Superseded for causality by controlled reproduction, retained for context |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-23 | Other | User report and four supplied screenshot paths | Establish reported behavior, node, and suspected nested scope | Historical tree survives restart; nested member content can be blank; Team panel had 6 messages | Resolved by probes |
| 2026-08-23 | Command | `git fetch origin --prune`; `git symbolic-ref refs/remotes/origin/HEAD`; `git worktree list --porcelain` | Resolve fresh base and isolation | `origin/personal` is tracked integration base; shared checkout is not task-dedicated | No |
| 2026-08-23 | Setup | `git worktree add -b codex/nested-team-history-restart-hydration /Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration origin/personal` | Create authoritative ticket worktree | Worktree created at current base `7edfb1625` | No |
| 2026-08-23 | Command | `docker ps`, `docker inspect autobyteus-server-0`, `docker volume inspect autobyteus-server-0-data`, `curl /rest/health` | Verify node lifecycle and persistence | Node live on 8001; durable data volume retained `/home/autobyteus/data` | No |
| 2026-08-23 | Data | GraphQL package/definition queries against `http://127.0.0.1:8001/graphql` | Verify private package and fixture before mutation | Private package already imported; 9 team definitions; no import needed | No |
| 2026-08-23 | Code | `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test/**` | Verify intended nested delegation flow | Fixture deliberately creates nested task-team execution with `student_one` coordinator | No |
| 2026-08-23 | Setup | Shared `autobyteus-web`: `BACKEND_NODE_BASE_URL=http://localhost:8001 pnpm dev --host 127.0.0.1 --port 3001` | Use current browser client against requested Docker node | Frontend loaded remote node through normal workspace flow | Cleanup required/completed at stage close |
| 2026-08-23 | Repro | Browser `open_tab` on `http://127.0.0.1:3001`, workspace DOM selection, screenshots | Reproduce exact user journey | Affected nested member blank; direct root works; Activity shows 0 vs 1 | No |
| 2026-08-23 | Command | Two `docker restart autobyteus-server-0` operations plus health polling | Establish actual cold process/container boundary | Data survives; post-restart false empty repeats | No |
| 2026-08-23 | Trace | GraphQL `getTeamMemberRunProjection` for affected root and nested member | Separate backend projection from frontend state | Direct root 3 conversation/1 activity; nested product 0/0 with no error | No |
| 2026-08-23 | Trace | GraphQL `getTeamCommunicationMessages` for affected root | Test whether Team messages share failing path | 6 messages still returned; root-scoped separate store works | No |
| 2026-08-23 | Data | `find`, `stat`, `wc`, `tail` under `/home/autobyteus/data/memory/agent_teams/...` | Verify durable trace existence and physical location | Affected nested traces are flat under root; canonical hierarchical target missing | No |
| 2026-08-23 | Log | `docker logs --since ... \| rg 'Memory file missing'` | Observe backend requested path | Logs name exact missing hierarchy derived from execution tree | No |
| 2026-08-23 | Repro | Browser-run private Nested Classroom team; runtime AutoByteus; model `deepseek-v4-flash`; delegated token `NESTED_CLASSROOM_RESTART_OK` | Prove fresh/runtime-independent task-team case | `student_one` wrote 5 trace events to flat path; cold projection/browser returned empty after restart | No |
| 2026-08-23 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` lines 416–446 | Trace writer location | `buildAgentRunConfig()` hard-codes `ancestorTeamRunIds: []` | Design must remove substitution |
| 2026-08-23 | Code | `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts` lines 166–189 | Trace cold reader location | Reader derives ordered root-exclusive ancestor TeamRun IDs from V1 tree | Preserve as canonical contract |
| 2026-08-23 | Code | `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts`; `services/agent-memory-location-service.ts` | Verify shared path primitive | Layout/service support ancestry-aware team paths and validate segments | Reuse; do not duplicate path joining |
| 2026-08-23 | Code | `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`; `projection/providers/local-memory-run-view-projection-provider.ts` | Trace projection to raw files | Member location becomes explicit `memoryDir`; local provider reads active raw traces and Event Monitor pages from it | No frontend source-policy change needed |
| 2026-08-23 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Trace UI hydration | UI fetches exact projection and applies returned conversation/activities; successful empty payload is not treated as error | No frontend workaround |
| 2026-08-23 | Code | `mixed-team-run-backend-factory.ts`, `mixed-sub-team-run-factory.ts`, `mixed-sub-team-member-handle.ts`, `mixed-task-agent-execution-registry.ts`, `mixed-task-team-execution-registry.ts` | Identify scope propagation boundary | `TeamRunContext` has root/current IDs but no physical memory ancestry; all configured/task handles reuse it | Targeted context/factory refactor likely |
| 2026-08-23 | Code | `agent-team-execution/domain/root-team-run.ts` lines 204–228; `services/team-execution-index.ts` | Verify authoritative ancestry already exists | Root aggregate derives exact ancestor list for any configured/task AgentRun | Target must align live context with same invariant |
| 2026-08-23 | Doc | `autobyteus-server-ts/docs/modules/run_history.md` (projection and member path sections) | Determine canonical released contract | Docs specify nested hierarchy `<root>/<childTeamRunId>/<agentRunId>` and local raw trace projection | Keep hierarchy |
| 2026-08-23 | Test | `pnpm exec vitest --run tests/unit/agent-memory/agent-memory-location-service.test.ts` | Verify reader contract | 3/3 tests pass, including configured and task ancestry | Preserve/update coverage |
| 2026-08-23 | Test | `pnpm test --run tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts tests/unit/agent-memory/agent-memory-location-service.test.ts` | Compare writer and reader tests | Reader 3 pass; both writer tests fail at stale external activation fixture before path assertion, and nested assertion expects defective `[]` | Replace stale invariant/fixture; not a valid baseline pass |
| 2026-08-23 | Repo | `git blame` on writer/reader; `git show -s 3f3aafa7cf...` | Locate regression introduction | Commit `3f3aafa7cfacdc1cfadd497882bf52aab0fac9e9` on 2026-08-15 introduced the current execution-tree reader while changing the existing ancestry-aware writer to an empty scope, creating the contradiction | Inspect the pre-commit writer and test history |
| 2026-08-23 | Repo history | `git show 3f3aafa7^:autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`; focused `git diff` for the writer and writer-invariant test | Test the user's recollection that nested memory worked before the current regression | Immediately before the 2026-08-15 universal-delegation checkpoint, the same handle derived and wrote the exact ordered ancestor TeamRun IDs; its nested writer test required `['sub-team-run']`. The checkpoint removed that derivation, substituted `[]`, and reversed the test expectation while ancestry-aware readers/docs remained | Treat this as a proven regression, not a new storage-policy choice |
| 2026-08-23 | Repo history | `git blame` / `git log -S` for `autobyteus-web/docs/memory.md`, `AgentMemoryLayout`, the mixed factory, and the nested writer invariant | Establish duration and evolution of the documented storage contract | The current root-hierarchical nested layout was documented and implemented through `teamRunPath` propagation in the mixed factory on 2026-06-11. The rooted-identity refactor moved derivation into the member writer on 2026-08-05 and retained it until the 2026-08-15 removal | Keep the current documented hierarchy |
| 2026-08-23 | Repo history | `git show 0e68304db5^` for `TeamMemberMemoryLayout`, the mixed factory, and `TeamMemberRunViewProjectionService` | Distinguish still-current hierarchy from older working behavior | Before the 2026-06-11 identity/layout change, writer and reader used an older root-plus-member-run-id layout consistently. That older era can explain successful nested restoration but is not today's canonical identity/storage contract | Do not revive the predecessor layout or add dual reads |
| 2026-08-23 | Code | `autobyteus-server-ts/src/app-data-migrations/**`; `app-data-migration-registry.ts` | Assess transition boundary | Required startup migrations are registered, ordered, recorded, and can report item-level warnings | Add isolated required migration |
| 2026-08-23 | Code | `autobyteus-server-ts/src/server-runtime.ts` lines 247–315 | Verify startup ordering relative to public access | `runPending()` and TeamRun V1 catalog rebuild complete before `buildApp()` exposes the server | Migration can repair layout before GraphQL/history access |
| 2026-08-23 | Script | Read-only Node scan of 30 current V1 roots in Docker volume | Quantify affected/current states | Before controlled run: 52 nested executions, 3 flat affected dirs, 1 canonical nested dir, no source/target pair conflict. Controlled run added one affected task-member dir | Migration must be item-local and mixed-state safe |
| 2026-08-23 | Code | `agent-team-execution/domain/team-run-context.ts`; `backends/mixed/mixed-team-run-backend-factory.ts`; `mixed-sub-team-run-factory.ts`; configured/task child callers | Complete the architecture-level current-state read after approval | The parent `TeamRunContext` is already present at every child-materialization boundary, but callers unpack and repeat root/handoff/application facts while omitting the one physical path fact required by direct AgentRuns | Make the parent context the child-scope derivation input and append the child TeamRun ID exactly once in the subteam factory |
| 2026-08-23 | Code | `agent-team-execution/services/team-execution-index.ts`; `domain/root-team-run.ts` lines 204–228; `run-history/services/team-run-execution-tree-location-service.ts` lines 166–189 | Identify a single cold/topology scope owner and duplicated derivation | `TeamExecutionIndex` already owns validated TeamRun parentage, while two consumers independently reverse, root-trim, and map its ancestor list | Add one exact physical-scope query to the index and remove the duplicate derivations |
| 2026-08-23 | Code | `app-data-migrations/migrations/team-run-migration-state-classifier.ts`; V1 migration constants and definition | Determine safe migration admission and prerequisite | The shared classifier distinguishes validated `CURRENT_V1`, predecessor, historical residue, and invalid roots; a current package includes the validated execution tree needed by `TeamExecutionIndex` | Reuse the classifier; relocate only agents enumerated by `CURRENT_V1`; require `20260814_team_run_execution_tree_v1` first |
| 2026-08-23 | Code | `run-history/store/team-run-file-commit-writer.ts`; migration runner/types; runtime-memory snapshot migrations | Determine physical commit and retry semantics | Existing code distinguishes pre-rename failure from post-rename directory-sync indeterminacy; startup-only failed migrations retry on restart, while succeeded-with-warning migrations do not. Location-sensitive snapshot migrations use canonical tree-derived locations | The initial proposal to reuse file-writer finalization mechanics was superseded by the canonical migration-convention audit below; directory move uses the simpler normal-attempt contract |
| 2026-08-23 | Doc | `autobyteus-server-ts/README.md` lines 127–208, especially `Production migration practice` | Audit SR-001 after the user identified the canonical convention | Requires deterministic known-source-to-fixed-target migration; one writer/stable attempt assumptions; forward-only runtime; final-current-state status; bounded evidence; no bespoke mechanical-failure recovery | SR-001's directory-sync/post-rename state and global readiness gate are over-designed and must be removed |
| 2026-08-23 | Doc | `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` (complete document) | Apply the authoritative reachability, abrupt-termination, warning, recovery, and review rules | Abrupt termination is one ordinary incomplete attempt retried by the runner; unsupported OS/device/concurrent-writer premises add no machinery; warnings require independently valid current target plus inert residue; diagnostics must be bounded/capped | Produce SR-002 with one atomic rename, ordinary rerun/idempotence, bounded reason counts/examples, and no special shutdown matrix |
| 2026-08-23 | Code | `app-data-migrations/domain/app-data-migration-types.ts`; `app-data-migration-summary-formatter.ts`; runner recovery-action logic | Verify convention-compliant bounded reporting can use current framework | Summary counters are explicit numeric fields and the DB summary is a fixed opaque sentence; attempt-log `details` need not be one entry per scanned item. `STARTUP_ONLY` failure already publishes restart-to-retry | Count every disposition, but retain only aggregate reason details with capped path examples; no framework redesign |
| 2026-08-23 | Code | Semantic exact-path owners: `TeamRunExecutionTreeLocationService`, `AgentMemoryLocationService`, `AgentMemoryLayout`, imported `TeamMemoryExplorerService`, file-change/context/external-reply readers | Determine whether preserved flat conflict residue competes with the current semantic target | These owners resolve exact V1-tree-derived canonical paths and never choose the flat source. Memory Sync is a separate physical replication observer, inventoried below | A real canonical target remains the only semantic current result; separately classify sync-visible retention instead of calling the residue inert |
| 2026-08-23 | Code | `app-data-migration-runner.ts` `classifyRecoveryAction()` / `runMigration()`; `api/graphql/types/app-data-migrations.ts` retry mutation | Verify the user's requested clickable retry without startup impact | An `ANYTIME` definition returns `MANUAL_RETRY` for every non-`SUCCEEDED` record, including `FAILED` and `SUCCEEDED_WITH_WARNINGS`; `canRetry` is true and the existing mutation executes the same definition. `STARTUP_ONLY` instead disables manual retry and advertises restart | New migration must be required on startup but use `ANYTIME`, not `STARTUP_ONLY` |
| 2026-08-23 | UI / Doc | `autobyteus-web/components/settings/ServerMigrationsManager.vue`; `autobyteus-web/docs/settings.md` `Server Migrations: Recovery Actions` | Confirm a real existing clickable action and whether frontend work is needed | Settings already enables Retry exactly when `canRetry` is true and dispatches the current mutation; no new frontend behavior is required | Record AC-014 and reuse unchanged UI |
| 2026-08-23 | Convention check | `production_data_migration_conventions.md`, `Classify The Final Current State` | Reconcile the user's “success with warning” wording with truthful non-blocking behavior | Missing required current target is `FAILED` even when only one capability is affected; application availability is a separate decision. This check initially considered semantic exact-path owners only | Preserve non-blocking `FAILED` + `MANUAL_RETRY` for move failure; conflict-residue wording is superseded by the later MP-001/MP-002 investigation and explicit approval |
| 2026-08-23 | Review | `design-review-report.md` `ARCH-RG-001`; `architecture-review-revision-record.md` `ARCH-REV-001` | Evaluate the architecture review's sole blocker | All live/cold topology, migration, retry, prerequisite, and diagnostic design passed. The warning premise omitted supported Memory Sync paths MP-001/MP-002 | Obtain explicit user disposition and preserve the passing architecture |
| 2026-08-23 | Code / Doc | `memory-sync/source/local-memory-export-scanner.ts`; `memory-file-change-planner.ts`; `memory-sync-service.ts`; `docs/features/memory_sync.md`; `autobyteus-web/docs/memory.md` | Verify MP-001 and MP-002 | Scanner recursively exports every stable nonexcluded file under `memory/agent_teams`; planner emits replace only; documented v1 protocol sends no deletes. Sync-before-upgrade then sync-after-rename can leave both hub paths | Include Memory Sync as a current physical observer; do not call residue inert |
| 2026-08-23 | Code | `agent-memory/services/team-memory-explorer-service.ts`; `team-memory-member-target-builder.ts`; `TeamRunExecutionTreeLocationService`; `memory-explorer-source-service.ts` | Determine whether remote physical residue becomes two semantic runs | Imported explorer reads the imported root through the same V1 tree and canonical member-target derivation as local explorer. A flat residue is stored/exported but is not an alternative current member location | User can approve physical retention as bounded nonfatal without dual current readers |
| 2026-08-23 | User approval | User response approving the solution designer recommendation after `ARCH-RG-001` | Resolve required Memory Sync product disposition | Preserve simple migration; accept/document Memory Sync v1 no-delete limitation; keep `SUCCEEDED_WITH_WARNINGS`; application and Memory Sync continue | Add BEH-006, REQ-008, AC-015/AC-016 and produce SR-004; reject filtering, tombstones, cleanup, or gating in this ticket |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Reopen/select a nested configured or task-team member from workspace history after server restart | Workspace tree -> `teamRunContextHydrationService` -> `GetTeamMemberRunProjection` -> `TeamRunHistoryResolver` -> `TeamMemberRunViewProjectionService` -> `TeamRunExecutionTreeLocationService` -> `AgentMemoryLayout` -> `LocalMemoryRunViewProjectionProvider` -> raw trace replay -> UI state | Location service derives hierarchy, file is missing there, memory store returns empty, GraphQL succeeds with empty arrays, UI renders legitimate-empty presentation | Both browser reproductions; GraphQL; missing-path logs |
| BEH-002 | System | Activate any direct AgentRun within a mixed TeamRun | root/team service -> mixed backend/factory -> configured/task registry -> `MixedAgentMemberHandle.buildAgentRunConfig()` -> `AgentMemoryLocationService.getTeamAgentRunLocation()` -> AgentRun memory store writes traces/snapshot/file changes | Handle always supplies `ancestorTeamRunIds: []`; nested AgentRun data is written flat. Runtime kind only changes AgentRun provider, not this path | Source; Codex data; AutoByteus controlled data |
| BEH-003 | User | Reopen a direct-root team member | Same cold read path as BEH-001, but execution-tree ancestor list is legitimately empty | Writer and reader paths coincide; conversation/Activity restore correctly | Root screenshots and 3/1, 13/5 GraphQL controls |
| BEH-004 | User | Open Team panel for a historical root TeamRun | workspace hydration -> `GetTeamCommunicationMessages` -> root-scoped Team Communication projection -> `<root>/team_communication_messages.json` | 6 messages persist and restore; not member-memory scoped | User screenshots; GraphQL count 6; source service uses root directory |
| BEH-005 | Operational | Start a node containing runs produced by the defective writer | Startup migration runner currently has no migration for flat-current nested member directories; current V1 package is admitted and normal reader runs | Existing traces remain durable but unreachable through current canonical reader | Current registry/classifier; physical scan; controlled restart |
| BEH-006 | User / Operational | Configure Nodes -> Memory Sync and click Sync now before and/or after upgrade | GraphQL manual sync -> `MemorySyncService` -> recursive `LocalMemoryExportScanner` -> replace-only planner -> hub import; imported explorer -> V1 execution tree -> canonical member target | Both local conflict paths may be exported, and a pre-upgrade flat hub file may remain after local relocation because v1 sends no deletes. Semantic imported reads still use only the canonical target | `ARCH-RG-001` MP-001/MP-002; Memory Sync source/planner/docs; imported explorer source |

## Design Health Assessment Evidence

- Change posture: `Bug Fix`
- Candidate root cause classification: `Boundary Or Ownership Issue`
- Refactor posture evidence summary: A targeted refactor is needed now. `TeamRunContext` owns root/current topology for all direct configured/task executions but lacks the physical scope its AgentRun handles require. Hard-coding empty ancestry in the leaf handle is responsibility drift. Reader-side ancestry is consistently derived from the authoritative V1 tree across history, context files, external reply recovery, runtime snapshot classification, and file changes. Fixing only one reader or adding fallback would preserve the unhealthy split.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Writer and reader source | Same shared layout service receives contradictory scopes | Missing invariant at TeamRun-to-AgentRun activation boundary | Design explicit scope ownership and propagation |
| Recursive configured/task factories | Child TeamRuns are materialized from parent contexts without ancestry | All recursive execution kinds need one shared propagation rule | Inventory root/configured/task paths in design |
| `RootTeamRun.getAgentExecution()` and `TeamExecutionIndex` | Exact ancestry is already a first-class derived property | Do not invent leaf-name or flat-ID policy | Align live construction and persisted tree semantics |
| Docs, reader tests, existing canonical stored run | Hierarchical path is released/current contract | Reader is not the regression target | Keep canonical path; migrate defect output |
| Git history across the 2026-08-15 checkpoint | The writer previously derived the exact TeamRun ancestry and its test required that hierarchy; both were changed to an empty ancestry while readers/docs remained unchanged | The user-observed earlier success is historically supported, and the present failure is a one-sided writer regression | Restore the shared invariant rather than choose a third layout |
| Successful-empty API result | Missing files are normalized as empty history | UI cannot diagnose a path bug and should not be made to | Correct persistence; preserve genuine empty behavior |
| Mixed stored population | Valid current data exists at both canonical and defective paths | Migration must decide per execution item, not per installation | Design safe item-level plan/conflict handling |
| Memory Sync v1 and imported explorer | Scanner physically enumerates both paths; protocol has no delete; semantic explorer derives one canonical location from V1 | Residue is sync-visible, not inert, but the user approved it as bounded nonfatal physical retention | Preserve sync code, expose bounded warning, document limitation, and test semantic canonical resolution |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts` | Immutable context for one concrete TeamRun | Contains root/current TeamRun IDs and node but no root-exclusive physical memory ancestry | Natural owner for immutable direct-member memory scope or its derivation input |
| `.../backends/mixed/mixed-team-run-backend-factory.ts` | Creates root and child mixed TeamRun contexts/managers | Root and child builders use same input shape; no ancestry propagation | Root establishes empty path; child creation must append exact TeamRun ID once |
| `.../backends/mixed/mixed-sub-team-run-factory.ts` | Materializes configured/task child TeamRuns | Accepts root ID and node only | Must carry parent-derived physical scope through recursive creation |
| `.../members/mixed-sub-team-member-handle.ts` | Lazy configured child materialization | Has owning parent context at child creation | Can pass parent-owned child scope without global lookup |
| `.../members/mixed-task-team-execution-registry.ts` | Creates delegated task TeamRuns and materializes subtree | Uses same subteam factory from any owning TeamRun | Must use identical child-scope rule for task teams |
| `.../members/mixed-task-agent-execution-registry.ts` | Creates direct delegated task AgentRuns | Reuses owning TeamRun context and `MixedAgentMemberHandle` | Correct context scope automatically fixes direct task agents |
| `.../members/mixed-agent-member-handle.ts` | Builds `AgentRunConfig` and activates any mixed member/task AgentRun | Hard-codes empty ancestry at lines 442–446 | Consume owner-provided scope; do not derive topology or special-case runtime here |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts` | Canonical location DTO and layout delegation | Correctly accepts root plus ordered ancestor list | Reuse unchanged unless a semantically tighter scope helper is needed |
| `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | Safe team/standalone path joining | Hierarchy-aware and path-segment safe | Remains canonical physical path owner |
| `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts` | Resolves current/stored AgentRun location from V1 tree | Correct root-exclusive ancestor derivation | Preserve; use as post-migration/read oracle |
| `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | Public team-member conversation/Activity/Event Monitor projection | Uses located explicit `memoryDir` | No source-policy change needed |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Converts local raw traces to replay bundle/page | Empty missing directory produces empty result downstream | Preserve genuine-empty policy; corrected path supplies data |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Loads exact per-AgentRun projections and applies them to UI | Faithfully applies successful empty arrays | No frontend change required by approved scope |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | Reads member file-change projection | Uses same execution-tree location | Whole directory migration preserves this sibling state |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-location-classifier.ts` | Classifies runtime working-context snapshots | Uses canonical member locations from tree | Whole directory move restores snapshot discovery too |
| `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts` | Resolves final context-file owner memory directory | Uses canonical located ancestor list | Confirms shared memory scope beyond conversation |
| `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | Reads team member raw traces for channel reply recovery | Uses `RootTeamRun.getAgentExecution().ancestorTeamRunIds` | Preserve same invariant |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Orders required startup migrations | Existing TeamRun V1 migration precedes trace/snapshot migrations | New current-layout repair needs explicit ordering/prerequisite analysis |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/**` | Validates/promotes current V1 packages and retains backup evidence | Current V1 roots are skipped as complete; does not relocate current defective member dirs | New migration should consume validated current V1 trees, not expand predecessor conversion |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts` | Intended writer memory invariant | Nested test explicitly expects `ancestorTeamRunIds: []`; external activation fixture now fails before assertion | Replace with direct/nested/deep/configured/task scope tests |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-location-service.test.ts` | Current reader/layout invariant | Passing tests expect hierarchical configured/task locations | Preserve and extend as shared contract evidence |
| `autobyteus-server-ts/docs/modules/run_history.md` | Durable run-history architecture | Explicitly documents nested hierarchical physical layout | Documentation is already aligned with target; delivery likely records no behavior-doc change beyond clarification if needed |
| `autobyteus-server-ts/README.md`; `docs/design/production_data_migration_conventions.md` | Canonical production migration policy | Requires deterministic fixed target, normal-attempt assumptions, forward-only runtime, truthful current-state status, bounded diagnostics, and proportionate retry | Governs and simplifies SR-002 migration mechanics; supersedes SR-001's speculative failure machinery |
| `autobyteus-server-ts/src/app-data-migrations/domain/app-data-migration-summary-formatter.ts` | Formats compact DB summary from explicit counters | Does not require counters to be derived from retained detail-array length | Migration can count every candidate while keeping attempt-log examples capped by reason |
| `autobyteus-server-ts/src/memory-sync/source/local-memory-export-scanner.ts` | Recursively enumerates local `agents` and `agent_teams` files | It observes/exports flat conflict residue and canonical files without V1 filtering | Preserve unchanged under approved v1 behavior; migration warning must call residue sync-visible |
| `autobyteus-server-ts/src/memory-sync/source/memory-file-change-planner.ts`; `memory-sync-service.ts` | Plans and sends changed files | Replace-only operations; absent local paths do not produce remote deletion | Preserve unchanged; no tombstone/delete scope |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-explorer-service.ts`; `team-memory-member-target-builder.ts` | Lists local/imported teams and resolves member memory | Uses V1 tree and exact canonical target even when storage contains flat residue | Semantic imported-history control for AC-015/AC-016 |
| `autobyteus-server-ts/docs/features/memory_sync.md`; `autobyteus-web/docs/memory.md` | Durable Memory Sync contract | Already states recursive roots and no delete propagation, but does not name migration-induced dual physical paths | Delivery documentation must explicitly disclose approved conflict/pre-upgrade residue |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-23 | Repro | Browser select affected `product_prototyper` after restart | Blank conversation; Activity `0 Events` | User symptom reproduced |
| 2026-08-23 | Probe | GraphQL projection for user root direct vs nested IDs | Root 3/1; nested 0/0; no errors | Backend false empty, not frontend query failure |
| 2026-08-23 | Probe | `stat`/`find` affected product directory | Active/rotated traces and manifest exist at flat path | Data was flushed and durable |
| 2026-08-23 | Log | Missing-memory lines after selection | Reader requests `<root>/<nestedTeamRunId>/<agentRunId>/raw_traces_active.jsonl` | Exact scope mismatch confirmed |
| 2026-08-23 | Probe | Team Communication GraphQL | 6 messages returned | BEH-004 preserved; remove Team panel from failing path |
| 2026-08-23 | Repro | Browser launch Nested Classroom with AutoByteus / `deepseek-v4-flash` | Nested task TeamRun created; student raw trace written flat | Runtime-independent fresh reproduction |
| 2026-08-23 | Trace | Controlled `student_one` raw file | 5 events, 10,297 bytes: system, task user input, reasoning, assistant, `submit_task_result` call | Sufficient non-empty history exists before restart |
| 2026-08-23 | Repro | Terminate controlled run, restart Docker, reload browser, select `student_one` | Historical nested member visible but blank; Activity 0 | Exact requested cold-reopen scenario reproduced |
| 2026-08-23 | Probe | Post-restart controlled GraphQL | Teacher 13/5; nested student 0/0, no errors | Same root/nested split with AutoByteus |
| 2026-08-23 | Script | Scan current V1 execution trees and physical dirs | 30 V1 roots; 52 nested executions before controlled run; 3 affected flat dirs; 1 canonical nested dir; controlled run adds affected task member | Existing installs may have mixed states; migration required |
| 2026-08-23 | Test | `pnpm exec vitest --run tests/unit/agent-memory/agent-memory-location-service.test.ts` | 3/3 pass | Reader/layout contract stable |
| 2026-08-23 | Test | Combined writer/reader focused test command | Writer file 2 failures due stale activation fixture; reader passes | Baseline writer test is not trustworthy and also asserts defect |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: The defect is fully explained by local code, local durable data, public local GraphQL behavior, and browser reproduction.
- Why it matters: No upstream runtime/provider workaround or internet-sourced compatibility behavior belongs in the design.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: existing `autobyteus-server-0`; current repository frontend; already-imported private Nested Classroom fixture.
- Required config, feature flags, env vars, or accounts: frontend backend base URL `http://localhost:8001`; existing configured DeepSeek provider. No secret values were read or copied into artifacts.
- External repos, samples, or artifacts cloned/downloaded for investigation: None. The user-supplied private package was read in place and already mounted/imported by Docker.
- Setup commands that materially affected the investigation:
  - Started temporary frontend on port 3001 pointing to node 8001.
  - Created and terminated controlled TeamRun `nested_classroom_test_team_a08b28dae0b44777975057b34312cd64`.
  - Restarted only `autobyteus-server-0` and waited for health.
- Cleanup notes for temporary investigation-only setup:
  - Controlled run was terminated before final restart.
  - No package, provider configuration, secret, user history, or Docker volume content was manually modified/deleted.
  - Temporary frontend process on port 3001 was stopped and the browser tab was closed after evidence capture.

## Findings From Code / Docs / Data / Logs

1. **The durable data is present.** The user's nested product prototyper active trace is 505,163 bytes with a 1,070,029-byte rotated segment. The controlled nested student trace is 10,297 bytes. Both remain after container restart.
2. **The current writer is wrong for every nested execution kind.** `MixedAgentMemberHandle` is shared by configured and delegated task AgentRuns across AutoByteus, Codex, and Claude. It always requests a location with `ancestorTeamRunIds: []`.
3. **The current reader is internally consistent.** `TeamExecutionIndex` and `TeamRunExecutionTreeLocationService` traverse configured members, task agents, task teams, and task-team nested members and derive the root-exclusive TeamRun chain. The same semantics are used by other memory consumers.
4. **Direct-root success is an accidental equality, not a separate feature path.** The correct root-exclusive ancestor list is empty, matching the writer's hard-coded value.
5. **Restart reveals loss of in-memory/live state, not loss of disk data.** Cold hydration is local raw-trace authoritative; it requests the canonical path and returns a successful empty bundle when the file is missing.
6. **Team messages are a separate root-scoped store.** They remain available and must be treated as a regression control, not migrated with member directories.
7. **The canonical layout is ancestry-aware.** Layout service, reader tests, docs, external-channel recovery, snapshot classifier, and an existing stored Northstar nested member all use `<root>/<ancestorTeamRunIds...>/<agentRunId>`.
8. **A reader fallback would be the wrong transition.** It would create two current layouts, leave sibling member state split, make ambiguity/conflict policy part of every read, and contradict the clean-cut migration principle. Existing affected directories can be mapped from validated execution trees at startup.
9. **The physical unit is the full member directory.** Affected directories contain combinations of `raw_traces_active.jsonl`, rotated segments, `raw_traces_manifest.json`, `file_changes.json`, and `working_context_snapshot.json`. Moving only active traces would leave other current readers broken.
10. **The migration population is mixed.** Current roots may have canonical nested data, affected flat data, unmaterialized agents with no directory, or unrelated historical residue. The migration must evaluate each concrete nested AgentRun and preserve ambiguous evidence.
11. **Repository history supports the user's recollection.** The topology-reflecting layout was both documented and implemented on 2026-06-11: `MixedTeamRunBackendFactory` recursively appended each child TeamRun ID to `teamRunPath` before assigning an Agent's `memoryDir`. The 2026-08-05 rooted-identity refactor preserved the same rule by making `MixedAgentMemberHandle` walk parent AgentTeam addresses and resolve their concrete TeamRun IDs. Immediately before commit `3f3aafa7cfacdc1cfadd497882bf52aab0fac9e9` on 2026-08-15, the focused nested writer test still required `['sub-team-run']`. That checkpoint deleted the ancestry method and changed only the writer-side expectation to `[]`; ancestry-aware readers and durable documentation remained in place.
12. **An even older working layout does not override the current contract.** Before the 2026-06-11 centralized run-identity change, team member writer and reader paths used an older root-plus-member-run-id model consistently. Nested history could therefore work in that era as well. The lesson is that one authoritative writer/read layout is essential; it is not evidence for reintroducing the predecessor layout after the current system adopted concrete TeamRun ancestry.
13. **Memory Sync is a supported physical observer that the first design inventory omitted.** Its scanner recursively enumerates both local paths and its planner emits replace-only operations, so source-plus-target residue is not physically inert and pre-upgrade flat imports can survive a clean local rename.
14. **Imported semantic reads remain canonical.** The imported Memory Explorer uses the same V1 execution-tree and member-location services as local exploration. The extra hub path is retained physical data, not a second semantic current-run authority.
15. **The product disposition is now explicit.** The user approved keeping Memory Sync available and documenting the v1 no-delete limitation rather than adding scanner filtering, tombstones, remote cleanup, or a migration-status gate. A real canonical target plus sync-visible residue remains a bounded warning; a missing/invalid target remains failed.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume:
  - Root: `memory/agent_teams/<rootTeamRunId>`.
  - Defective nested source: `<root>/<agentRunId>/`.
  - Canonical nested target: `<root>/<ordered root-exclusive ancestorTeamRunIds...>/<agentRunId>/`.
  - User example: 1.58 MB of active/rotated product-prototyper traces plus manifest/file changes.
  - Controlled example: 10,297-byte active trace plus working-context snapshot for a delegated task-team coordinator.
  - Read-only node scan before the controlled run: 30 current V1 roots, 52 nested Agent executions, 3 affected flat materialized directories, 1 already-canonical materialized nested directory, 0 simultaneous source/target pairs. The controlled test adds one affected flat task-member directory.
- Relevant code-model, serialization, semantic, or physical-store change: No event/schema transformation is required. Only the owning directory's physical parent chain is wrong. The execution tree already contains exact source AgentRun IDs and target TeamRun ancestry.
- Normal readers and writers, including unknown/extra-field behavior:
  - Writer: AgentRun writes all memory using the explicit `AgentRunConfig.memoryDir` supplied by the handle.
  - Readers: history, Event Monitor, file changes, context-file ownership, external reply recovery, and snapshot classification resolve the ancestry-aware directory.
  - Physical replication observer: Memory Sync recursively scans all stable nonexcluded files under `memory/agent_teams`, so it may export both paths; its v1 protocol does not delete a previously imported flat path after local relocation.
  - Imported semantic reader: Memory Explorer rebuilds member targets from the imported V1 tree and reads only the canonical path.
  - Missing raw trace files yield empty projection rather than a GraphQL error.
- Representative direct-read or compatibility evidence: Directly reading the flat raw traces produces valid replay-source events; placing the same directory at the canonical location would make normal readers consume it without event conversion. However direct use **in place** is not possible under the single current canonical reader.
- Required semantics and invariants preserved by direct use: `No` for physical direct use; `Yes` for bytes after relocation. Evidence: exact path mismatch and successful raw JSONL inspection.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints:
  - Keep all generated source/target paths under `AgentMemoryLayout`; arbitrary filesystem tampering/corruption is not a supported migration premise.
  - Do not merge or overwrite an existing target.
  - Do not move directories for root-direct agents, missing/unmaterialized agents, malformed/non-admitted roots, or historical residue outside current V1 admission.
  - Preserve entire directory bytes and report item-level status through the migration framework.
- Concrete benefit, cost, and risk of migration:
  - Benefit: restores existing user history and all sibling member state while keeping one clean runtime/read layout.
  - Cost: one startup scan of admitted V1 roots plus item-level safe directory relocation and migration tests.
  - Risk: a supported version sequence can leave both a flat source and canonical target. Preserve both and report bounded sync-visible warning evidence after validating the canonical target's physical shape; never merge or prefer content. Memory Sync may mirror both or retain the earlier flat import, consuming trusted-hub storage without creating a second semantic current run.
- Existing migration framework or lifecycle constraints:
  - `AppDataMigrationRegistry` orders required startup migrations and validates prerequisites.
  - `AppDataMigrationRunner` records status and item summaries; `requiredOnStartup` schedules the automatic startup attempt, while an `ANYTIME` definition also remains publicly/manual retryable.
  - `TeamRunExecutionTreeV1AppDataMigration` already classifies/adopts V1 packages and is registered before raw-trace/snapshot migrations.
  - The new transition should be a separate current-layout repair, not folded into predecessor conversion, with ordering that guarantees validated V1 topology and canonical member placement before normal restore/read.
- Persisted data outcome: `Migration Required`.

## Constraints / Dependencies / Compatibility Facts

- The V1 execution tree is the authoritative current topology and identity source.
- Root TeamRun ID plus ordered root-exclusive physical ancestor TeamRun IDs plus concrete AgentRun ID is the canonical memory scope.
- Runtime kind and model/provider do not participate in path selection.
- Docker volume retention is functioning and must remain the only operational requirement across restart/recreation.
- Current frontend GraphQL and hydration contracts are sufficient once the backend supplies the correct data; no new API/UI contract is required.
- Pending app-data migrations and V1 catalog rebuild execute before the Fastify application is built, so normal public history access cannot race the startup transition.
- Current `AgentMemoryLayout` safety checks should remain the only path-joining policy.
- Clean cut: no dual-read fallback, no compatibility wrapper, and no long-lived flat-current writer path after migration.
- Canonical migration convention: one deterministic transform under one writer/stable normal attempt; no journal, duplicate backup/quarantine, parent-directory sync protocol, post-rename failure state machine, global readiness gate, or arbitrary mechanical-failure coverage.
- Migration attempt evidence must be bounded: exact aggregate counts plus capped example paths per reason; do not append one warning detail for every candidate.
- A required migration may remain `ANYTIME`: startup attempts it automatically, while `FAILED` or warning status truthfully maps to existing `MANUAL_RETRY` and an enabled Settings Retry button. Status does not control application startup availability.
- Approved Memory Sync disposition: v1 recursive replace-only/no-delete behavior remains unchanged; a canonical target plus sync-visible residue is explicitly nonfatal and documented. No sync filter, tombstone/delete operation, imported-corpus cleanup, status gate, or new UI is authorized.

## Open Unknowns / Risks

- SR-001 migration mechanics were superseded by the user's convention-alignment direction. SR-002 removed directory `fsync`, post-rename-indeterminate modeling, global listener gating, exhaustive mechanical-failure tests, and the planner/relocator over-split; SR-003 preserves that simplification and supersedes only SR-002's restart-only recovery choice.
- Registration remains immediately after V1 with the V1 prerequisite and before not-yet-run canonical-location snapshot migrations. Existing successful migration records are not reset.
- The current writer-invariant test needs its stale activation fixture corrected in addition to reversing the defective nested expectation; baseline failure must be recorded rather than misrepresented as caused by the implementation.
- A production volume can contain an existing target and flat source due manual intervention/interrupted historical work even though representative data did not. The migration must preserve both and report conflict rather than infer a merge.
- Memory Sync may export both preserved local paths, and a hub can retain a pre-upgrade flat path after local relocation. The user explicitly accepts this bounded v1 storage/retention limitation; imported semantic readers remain canonical. Future delete propagation or remote cleanup requires a separate approved change.
- The migration convention treats a stable process/power/device, normal filesystem, sufficient permissions, and one writer as prerequisites. Unsupported mechanical or concurrent-writer premises remain outside scope and receive no dedicated recovery design.
- User-visible retry requires `ANYTIME`; `STARTUP_ONLY` would contradict the approved clickable-retry outcome. No migration runner, GraphQL, store, Settings component, or localization change is needed.
- A failed folder move cannot be labeled `SUCCEEDED_WITH_WARNINGS` merely to keep startup available: current framework already keeps startup available, while `FAILED` truthfully means the required target is missing and still supplies manual Retry.
- Requirements approval is complete, including the post-`ARCH-RG-001` Memory Sync disposition. Architecture review must retain the approved topology-reflecting scope, simple migration boundary, non-blocking retry, sync availability, and documented v1 no-delete limitation.

## Notes For Architecture Reviewer

- Requirements were explicitly approved on 2026-08-23. After `ARCH-RG-001`, the user explicitly approved preserving/documenting the Memory Sync v1 no-delete outcome; review SR-004 against that locked basis rather than reopening the disposition.
- Focus on the immutable live memory-scope owner, recursive configured/task propagation, absence of reader fallback, one convention-aligned whole-directory rename, independently valid canonical-target warnings, bounded diagnostics, V1-first migration ordering, and the explicit physical-observer-versus-semantic-reader distinction.
- Verify `requiredOnStartup: true` plus `executionPolicy: "ANYTIME"`, non-blocking `FAILED` move outcome, existing `MANUAL_RETRY`/Settings Retry reuse, and the approved `SUCCEEDED_WITH_WARNINGS` result for a real canonical target plus sync-visible residue.
- Memory Sync production code remains unchanged by approval: no filter, tombstone/delete protocol, remote cleanup, sync gate, or new UI. Durable docs and coverage must make the accepted retention behavior explicit.
- `ARCH-RG-001` was material because it traced to two supported production paths. Further review comments must meet the same product-reachability standard; purely mechanical or speculative filesystem/sync failure stories do not authorize additional migration machinery.
- Treat the passing ancestry-aware reader tests/docs as current contract and the writer test's `ancestorTeamRunIds: []` nested expectation as the defect, not competing product behavior.
- Preserve root Team Communication and frontend empty-state behavior as explicit controls.
