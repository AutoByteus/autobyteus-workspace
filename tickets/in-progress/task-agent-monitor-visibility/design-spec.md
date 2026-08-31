# Design Spec

## Current-State Read

Node 8001 already stores and serves the exact task AgentRun's retained conversation and Activity. A clean detached baseline at `80e2bd195` reproduced the reported defect through a supported live nested delegation three times. In the strongest round, node 8001 held five exact conversation entries and three Activity items more than six seconds before selection. The task row, navigation focus, execution-view focus, and focused local context ID all converged on `student_two_617e…`, yet the header read `student_two · Offline`, the center remained empty, and no exact projection request occurred through ten seconds after click. A fresh-open control issued the exact query and rendered the task content. The core root cause is therefore not missing server data or necessarily a parent/task focus-ID mismatch: a live execution-tree update materializes the exact task as a default `Offline`/empty shell, and mounted selection treats `hasAgentRun(exactId)` as sufficient while the function named `focusTeamMemberAndEnsureHydratedForStore` only focuses and patches navigation.

Two frontend focus representations remain an independently reachable convergence weakness. `TeamExecutionViewState` owns execution containment and focused `agentRunId`; `RunHistoryNavigationProjectionState` also stores a directly patchable focused ID. The tree reads the latter, while the header and monitor read the former. They aligned in the deterministic root reproduction, so split focus is not used as proof of that trigger. However, live task/snapshot/settlement paths mutate or repair the execution view without a structural-navigation effect, and selection mutates/commits the representations non-atomically. The approved cross-surface invariant still requires navigation to derive from the view.

Full Team hydration replaces conversation and clears/rebuilds the global per-run Activity store. That operation cannot be reused against a mounted context with only `eventMonitorPresentationRevision`: a normal `SYSTEM_INSTRUCTIONS_SUPPLIED` event upserts Activity while publishing `eventMonitor: NONE`, so the presentation revision does not advance and a stale clear/rebuild can erase the new item. `agentActivityStore` also owns tool/compaction mutations and retention eviction without a monotonic content witness. Ordinary Team-stream reconnect can apply a snapshot to an existing context without replaying retained member projections, so safe late exact hydration is a supported production need.

The separate fresh/non-mounted path is also unsafe on target failure. `hydrateLiveTeamRunContext` resolves every exact projection under `best_effort`; if the requested target fetch fails, `openTeamRun` can still mount, focus, and outer-select an empty candidate. The required focus must be resolved and fetched exact before any candidate mount/selection, while nonfocused members may remain explicitly best-effort.

The formal task record remaining `active` is valid because the LLM did not formally submit. Per the user's explicit scope clarification, Agent prompt clarity, LLM tool choice, collaboration tools, backend task services, persistence, and lifecycle transitions are not defects or change targets. The frontend must display whatever exact-run content the backend retained/streamed and render the backend lifecycle truthfully without inferring completion.

## Intended Change

1. Replace the misleading focus helper with one coherent frontend selection operation that branches explicitly: an already-mounted root uses `TeamMemberInspectionCoordinator`; an unmounted root uses `TeamRunOpenCoordinator`. A live-created local context is non-authoritative merely by existing; neither branch commits target focus/current-row/outer selection until the exact target projection is authoritative.
2. Make `TeamExecutionViewState` the sole exact focused-member authority and rebuild navigation focus from it; remove direct Team-focus patching.
3. Add guarded, single-flight exact member-projection hydration for mounted contexts. Stage conversation and Activity without side effects, then compare the exact Team/Agent context identity, `eventMonitorPresentationRevision`, and a new monotonic per-run Activity-content revision before a synchronous all-or-no-write apply.
4. Make `agentActivityStore` the exclusive Activity-content mutation owner. Advance its per-run revision on every successful content mutation and retention eviction; replace clear-then-add projection hydration with an atomic revision-checked batch replacement that preserves a surviving highlight and recomputes derived approval state.
5. Make fresh Team open resolve the requested/fallback focus before projection fan-out, fetch that target exact/fail-fast, keep other member fetches best-effort, stage the candidate without mounting or changing the Activity store, and validate target authority before one synchronous candidate commit. Failure preserves the previously selected workspace.
6. Carry the shared Activity-writer replacement through standalone `runContextHydrationService` and `agentRunOpenCoordinator`: return a staged `RunContextHydrationCandidate`, use store-owned revisioned replacement only on projection-replace paths, preserve `KEEP_LIVE_CONTEXT` without Activity replacement, and keep context/file hydration before selection and stream policy. Remove the proven-unused `teamRunMemberStatusHydration.ts` instead of preserving a bypass.
7. Make stream task/snapshot changes explicitly reconcile navigation. Activation may associate a new exact task shell and must mark it projection-non-authoritative without stealing focus; reconnect snapshots also invalidate retained-projection authority and trigger focused-run reconciliation. Do not infer projection completeness from context creation or task activation.
8. Reuse one derived task lifecycle presentation model across task detail, execution rows, selected header, and accessibility copy; show lifecycle and Agent execution separately.
9. Make exact task conversation/Activity visibility independent of lifecycle state and LLM collaboration-tool choice. Make no backend, prompt, tool, persistence, or lifecycle change.

## Material Premise And Deterministic Reproduction Evidence

| Premise ID | Status | Supported Trigger / Initial Conditions | Ordered Production Path To The Contradiction | Durable Evidence | Design Consequence |
| --- | --- | --- | --- | --- | --- |
| `MP-006` | `Reachable — reproduced 3/3` | Clean baseline frontend `80e2bd195` against Docker node 8001; active/mounted Nested Classroom root; Teacher initially focused; Codex runtime; GPT-5.6 Luna; user message → Teacher delegates to nested task Team → student_one delegates to sibling student_two; live stream adds the row; round 3 waits 20 seconds before click | execution-tree update → `TeamExecutionViewState.planContextAssociations` → `createTeamAgentContext` default Offline/empty shell → row click → mounted `hasAgentRun(exactId)` branch → false `focusTeamMemberAndEnsureHydratedForStore` focus/navigation patch → exact row/view focus becomes current with Offline/0/0 local content and zero exact projection requests | `deterministic-reproduction-summary.json`; round-3 browser/store JSON and PNG; round-3 backend projection/topology; fresh-open control | Mounted task inspection must not treat context presence or activation as projection authority. Fetch/stage/guard/commit the exact projection before committing current focus; preserve the previous coherent selection on failure. |

The round-3 exact projection had five conversation entries and three Activity items, including delivered `STUDENT_TWO_TASK_STARTED` and a visible `run_bash`, with `lastActivityAt=2026-08-31T15:15:27.915Z`; pre-click capture was `15:15:34.281Z`. Immediately after click and through `15:15:44.462Z`, both focus IDs and the local context ID equaled the task exact run, while status/conversation/Activity remained `Offline`/0/0. This timing rules out a race where the UI was clicked before any task data existed. A fresh open requested and rendered the projection, which is the masking control.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Acceptance Criteria | Approved Trigger / Contract | Existing Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | R-001–R-003, R-006, R-010; AC-001–AC-003, AC-006–AC-007 | Select transient task Agent row | F-001–F-004, F-014, F-017; `MP-006`; deterministic summary/control | Tree/header/monitor/Activity use authoritative state for the same exact task run | Row → mounted inspection or fresh candidate open → authoritative exact target → view focus → derived navigation; DS-001, DS-005, DS-007 |
| BEH-002 | User/System | R-002–R-004; AC-003, AC-006, AC-010 | Select locally present run without authoritative retained monitor | F-004, F-009–F-010, F-013–F-014, F-017; `MP-006` | Honest loading/error/true-empty; no context-presence shortcut and no live overwrite | Mounted registry → exact query → composite-witness apply/retry, or fresh exact-target candidate → commit; DS-002, DS-005, DS-007 |
| BEH-003 | System | R-001–R-004, R-009; AC-001–AC-006, AC-009 | Activation, task update, settlement, snapshot, reconnect, reopen | F-002, F-005, F-009 | Navigation derives from execution view and preserves valid focus | Stream → view mutation → structural effect → topology/focused reconcile; DS-003, DS-006 |
| BEH-004 | User | R-005–R-006, R-010; AC-004–AC-005, AC-011 | Observe task row/header | F-006, F-011 | Visible derived lifecycle and exact execution state stay distinct | Task record/status → shared presentation → UI; DS-004 |
| BEH-005 | User/System | R-003, R-007–R-008; AC-003, AC-008, AC-012–AC-014 | Exact task has work/messages without formal transition | F-001, F-007, F-017; round-3 node/UI evidence | Exact content remains visible while lifecycle remains truthfully `active`; backend/Agent behavior unchanged | Exact projection/stream → exact context → monitor; DS-001–DS-005 |
| BEH-006 | User/System | R-001, R-009; AC-007, AC-015 | Parent/repeated tasks share logical address | F-001, F-008 | Exact executions remain isolated; stored records unchanged | Compound root/run identity → exact context/projection → independent rows; DS-001–DS-005 |
| PB-001 | Preserved User/System | Requirements Preserved Behavior Boundary `PB-001`; established standalone open/history/recovery behavior | Open/recover standalone Agent run from history, workspace deep link, or active discovery | F-015; current open strategy/tests | `KEEP_LIVE_CONTEXT` never replaces live Activity; projection replacement commits context/Activity/files before selection/stream without clear/add bypass | Standalone candidate → strategy → keep-live or guarded replace → selection → stream policy; DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `ui-ux-spec.md` | Exact-selection journey, dual status, loading/error/empty, accessibility | R-001–R-011; AC-001–AC-015 | Governs observable frontend behavior | Refined/user-approved scope |
| `investigation-evidence/live-node-8001/live-selection-comparison.json` | Exact parent/task DOM, requests, counts, errors | R-001–R-004, R-007, R-009 | Browser baseline and identity assertions | Evidence; approval N/A |
| `investigation-evidence/live-node-8001/configured-parent-selected.png` | Legitimate parent Offline/empty state | R-001, R-009 | Visual isolation baseline | Evidence; approval N/A |
| `investigation-evidence/live-node-8001/task-run-selected.png` | Exact task Idle/51-event state | R-001–R-004, R-007, R-009 | Visual task-content baseline | Evidence; approval N/A |
| `investigation-evidence/live-node-8001/deterministic-reproduction/deterministic-reproduction-summary.json` | Clean-baseline supported live reproduction, exact frontend/backend timing/identity, production path, repeatability, and fresh-open control | R-001–R-004, R-007–R-009; AC-001–AC-003, AC-007–AC-010, AC-012–AC-015 | Resolves `ARCH-F-006`/`MP-006` and governs current root-cause reachability | Complete evidence; approval N/A |
| `investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-after-click.png` | Exact selected task with blank center, Offline header, one Team message, and In-progress task | R-001–R-007, R-010 | Visual deterministic contradiction | Complete evidence; approval N/A |
| `investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control-after-click.png` | Fresh-open exact projection/rendering control | R-001–R-004, R-007, R-009 | Proves full hydration masks the live-created-shell defect | Complete evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (frontend only).
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Missing Invariant`, and `Shared Structure Looseness`; the proven primary defect is missing exact projection authority for a live-created local task shell.
- Refactor needed now: `Yes`.
- Evidence: deterministic `MP-006` proves a live-created exact task shell is selected without an exact query and remains Offline/0/0 despite pre-existing backend content. The same boundary also has an incomplete Activity mutation witness. Independently supported adjacent paths show two writable focus representations, non-atomic selection, best-effort requested-target fresh open, structural changes without navigation effects, duplicated/partly dropped lifecycle presentation, and shared mutating Activity-writer consumers plus an unused legacy helper.
- Design response: one focus authority; separate mounted-inspection and unmounted-candidate branches with identical target-authority semantics; composite conversation/Activity mutation witnessing; structural convergence effects; and one task presentation structure.
- Refactor rationale: reload/CSS/status-copy workarounds leave supported long-lived/reconnect paths contradictory.
- Intentional deferrals/residual risk: no redesign of the whole navigation cache or event-monitor model. Guarded hydration returns a retryable error if stable application cannot be obtained. Agent prompt/tool/lifecycle concerns are explicitly out of scope, not deferred implementation work.

## Terminology

- **Exact member identity:** `{ rootTeamRunId, agentRunId }`; logical address is placement/presentation only.
- **Focused-member authority:** `focusedAgentRunId` owned by one `TeamExecutionViewState`.
- **Authoritative projection state:** the exact retained projection was successfully committed to the same mounted `AgentContext` under the required identity/revision witness. Mere context creation, live task activation, row visibility, or receipt of task/team metadata does not establish monitor authority.
- **Mounted inspection:** exact selection against a root Team context already held by `agentTeamContextsStore`; it never replaces that root context.
- **Fresh-open candidate:** an unmounted `AgentTeamContext` plus staged projection content and freshness metadata; it is not visible/current until its required focus is exact and the open coordinator commits it.
- **Activity-content revision:** monotonic per-run counter owned by `agentActivityStore`, stored independently from clearable Activity state and advanced once for every successful logical Activity-content mutation, including retention removal. `clearActivities` is an invalidation boundary and advances even when already empty; highlight-only selection is excluded because replacement reads/preserves the current surviving highlight rather than overwriting it.
- **Mounted hydration witness:** `{ mountedTeamContext, agentContext, eventMonitorPresentationRevision, activityContentRevision }`; both revisions and both identities must still match at commit.
- **Inspection operation:** makes an exact member monitor authoritative and, for user selection, commits focus.
- **Standalone run hydration candidate:** staged exact Agent run config, conversation, built `RunActivity[]`, file changes, and expected Activity revision. `agentRunOpenCoordinator` pairs it with the context identity captured before loading to preserve open strategy/order.
- **Task display lifecycle:** derived UI value; `revision_requested` comes from `active` plus the latest revision review, not a stored status.

## Design Reading Order

Read the behavior map, health/persistence decisions, DS-001–DS-008 spines and ownership boundaries, then the file map/change sequence. The UI supplement governs observable presentation; this spec governs frontend ownership/sequencing.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove direct navigation Team-focus patch API and its tests/fixture calls.
- Remove/replace `focusTeamMemberAndEnsureHydratedForStore`; no wrapper with its false name/boolean contract.
- Remove raw/unused `taskStatus` row propagation after adopting shared derived task presentation.
- Remove projection Activity clear-then-add application and its mutating `hydrateActivitiesFromProjection` export; no Team or standalone candidate path may expose partial replacement.
- Remove the production-unreferenced `teamRunMemberStatusHydration.ts` and its stale test mocks; do not migrate an unreachable writer.
- No dual focus source, old/new hydration path, parent/task data copy, lifecycle inference, or compatibility fallback.
- No server-side replacement is designed because server/prompt/tool/lifecycle code is outside scope and remains unchanged, not because a legacy path is retained.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject/location: Team execution tree, task records, communication history, per-AgentRun traces/projections.
- Relevant change: frontend in-memory focus/hydration/read-model/presentation only; no stored/DTO field change.
- Normal behavior/evidence: current readers load exact records and GraphQL returns the rich task projection; the fresh UI renders it.
- Required invariants: exact IDs, containment, ordering, lifecycle, messages, references, timestamps; no prose-based status inference.
- Operational constraints: no rewrite or maintenance window.
- Decision: `Directly Usable — No Migration`.
- Rationale: all required meaning already exists; rewriting would add risk and could falsely formalize historical messages.
- Supported criteria: R-009; AC-007, AC-013, AC-015, plus the authoritative requirements Persisted Data Outcome. No superseded standalone no-migration IDs remain in current operative references.

### Migration Plan

N/A — no persisted transformation.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-005–BEH-006 | Row activation | Coherent selected-member workspace | Run-history selection adapter with branch coordinator | One observable target-authority contract across mounted and fresh paths |
| DS-002 | Primary End-to-End | BEH-002, BEH-005 | Need authoritative mounted projection | Authoritative monitor or retryable error | Projection hydration service | Prevent false empty/stale overwrite |
| DS-003 | Return-Event | BEH-003 | Accepted Team stream task/snapshot event | Rebuilt navigation and optional focused reconcile | View + stream effect dispatcher | Long-lived convergence |
| DS-004 | Primary End-to-End | BEH-004–BEH-005 | Task record + exact Agent status | Visible row/header/accessibility labels | Task presentation mapper | Separate lifecycle/execution truthfully |
| DS-005 | Bounded Local | BEH-001–BEH-002, BEH-005–BEH-006 | Mounted hydration attempt | Single-flight composite-witness apply/retry | Projection hydration service + Activity store | Protect conversation and every Activity mutation |
| DS-006 | Bounded Local | BEH-003 | View topology/focus mutation | Preserved/repaired valid focus | `TeamExecutionViewState` | Keep repair inside authority |
| DS-007 | Primary End-to-End | BEH-001–BEH-002, BEH-006 | Select member of unmounted Team | Exact-target-authoritative mounted candidate or failure | `TeamRunOpenCoordinator` | Prevent fresh-open false empty and pre-commit side effects |
| DS-008 | Bounded Existing-Behavior Preservation | PB-001 | Standalone Agent projection load/open | Preserved live context or coherent replacement before selection/stream | `agentRunOpenCoordinator` + `runContextHydrationService` | Complete shared-writer removal without regressing Agent open/history/recovery |

## Primary Execution Spine(s)

- **DS-001 / mounted branch:** `Workspace row → RunHistory selection adapter (root mounted) → TeamMemberInspectionCoordinator → TeamMemberProjectionHydrationService → TeamExecutionViewState.focusAgent → derived navigation rebuild → outer selection metadata → Team workspace surfaces`
- **DS-001 / fresh branch (DS-007):** `Workspace row → RunHistory selection adapter (root unmounted) → TeamRunOpenCoordinator → hydrateLiveTeamRunContext(required focus exact; others best-effort) → validate/focus unmounted candidate → staged Activity batch commit → mount → derived navigation/outer selection → stream connect`
- **DS-002:** `Mounted inspection/reconnect → context/freshness validation → GetTeamMemberRunProjection → pure conversation/Activity staging → composite-witness guarded application → authoritative/error state`
- **DS-004:** `TaskDelegationRecordDto + exact AgentStatus → TaskDelegationPresentation → row/header view model → visible/accessibility UI`
- **DS-008:** `history/deep link/active discovery → standalone hydration candidate (pure Activity build + expected revision) → current-context/stream strategy → KEEP_LIVE_CONTEXT metadata/file merge OR revision-checked projection replacement → selection if requested → connect/disconnect policy`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 mounted | When the root context exists, row selection always uses inspection (not full context replacement). Hydration succeeds before view focus. Navigation rebuild and outer selection commit synchronously; failure preserves prior focus/selection. | row, selection adapter, inspection, focus, navigation | Inspection coordinator | loading/error, config clearing |
| DS-001/DS-007 fresh | When the root is absent, live hydration resolves/validates the requested focus first, fetches it exact, stages all projection content, and marks successful members authoritative. `TeamRunOpenCoordinator` rechecks that the root is still unmounted and the target authoritative, commits staged Activity, mounts/focuses/selects, then connects the stream. Any expected failure occurs before mount/selection. | row, open coordinator, hydration candidate, context store | Team-run open coordinator | best-effort nonfocus members, workspaces |
| DS-002/DS-005 | Exact mounted context is single-flighted. The service captures both context identities and both revisions, fetches/stages without writes, then in one no-`await` commit revalidates all witnesses and atomically replaces Activity before assigning the staged conversation/baseline. A mismatch writes nothing and retries/errors. | registry, GraphQL, staging, Activity store, context | Hydration service | event-monitor baseline, highlight preservation |
| DS-003/DS-006 | Stream mutates view first. Task/snapshot/root-active change emits topology effect. Snapshot invalidates projection authority and schedules focused reconciliation; activation marks a newly created task context non-authoritative and preserves valid focus. Later selection uses DS-002 rather than trusting the shell. | stream, view, repair, effects | View/stream | navigation cache |
| DS-004 | One mapper derives display lifecycle/task context. Direct task row combines lifecycle/execution; focused task-Team member header combines inherited lifecycle with exact execution. | task record, presentation, UI | Presentation mapper | localization/truncation |
| DS-008 | Capture expected context identity and Activity revision before loading. Build Activity purely. After load, recompute the open strategy: subscribed active context keeps live Activity/conversation and only receives the current permitted config/file merge; replacement requires unchanged/absent expected context and Activity batch success, then commits projection context, baseline, and files before selection and stream policy. Background hydration asserts the context stayed absent and returns before its caller connects. | candidate loader, strategy, Activity store, context/file stores, selection, stream | Agent-run open + run hydration | active discovery, workspace deep links |

## Spine Actors / Main-Line Nodes

- `WorkspaceTransientExecutionRow`: starts inspection; owns neither focus nor hydration.
- Run-history selection adapter: branches on mounted root-context identity, not target presence; it never falls from a mounted root into full replacement.
- `TeamMemberInspectionCoordinator`: mounted validate → hydrate → focus → rebuild sequencing and typed result.
- `TeamRunOpenCoordinator`: fresh candidate validation, staged commit, mount, outer selection, and post-mount stream connection. It rejects an already-mounted root; user/deep-link entries branch before calling it.
- `TeamMemberProjectionHydrationService`: mounted freshness, exact query, single-flight, pure staging, composite-witness apply/invalidate.
- `teamRunContextHydrationService`: resolves required fresh focus before fetch; exact target plus best-effort nonfocus candidate construction.
- `runContextHydrationService`: captures standalone expected Activity revision and builds a side-effect-free `RunContextHydrationCandidate`; background absent-run hydration commits through the same store boundary.
- `agentRunOpenCoordinator`: owns standalone context/stream strategy, guarded replacement, selection timing, and connect/disconnect ordering; live subscribed contexts do not replace Activity.
- `agentActivityStore`: exclusive Activity-content writer, monotonic per-run revision, atomic revision-checked projection replacement.
- `TeamExecutionViewState`: containment, current focus, topology mutation, focus repair.
- `RunHistoryNavigationProjection`: derived read model only.
- `TaskDelegationPresentation`: raw task record to display lifecycle/context.
- Workspace row/header/monitor: render projected exact identity, content, status, and attempt state.

## Ownership Map

| Owner | Owns |
| --- | --- |
| `TeamExecutionViewState` | exact containment, live tree/tasks/messages/status association, focused ID, repair, navigation rows |
| `agentActivityStore` | per-run Activity content, retention, awaiting-approval derivation, surviving highlight, monotonic mutation revision, atomic revision-checked projection batch |
| Mounted projection hydration service | context freshness, compound identity, single-flight, staging, complete witness revalidation, retained projection commit/retry |
| `teamRunContextHydrationService` | unmounted Team candidate construction, pre-fetch focus resolution, exact required projection, best-effort nonfocus projections, staged freshness metadata |
| Inspection coordinator | mounted atomic inspection sequencing; delegates domain state to owners above |
| Standalone run hydration service | pure candidate load/build, expected Activity revision, absent-context background commit |
| Standalone Agent open coordinator | pre-load context identity, post-load strategy, keep-live preservation, guarded projection commit, selection and stream ordering |
| `TeamRunOpenCoordinator` | unmounted candidate validation/commit/mount/selection/stream ordering; mounted-root rejection |
| Run-history store | reactive attempt/error plus cached navigation read model; not focus authority |
| `TeamStreamingService` | ordered transport admission/effect execution; not focus policy |
| Task presentation mapper | one derived lifecycle and task-context shape |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| Run-history `inspectTeamMember` action | Inspection coordinator | Pinia/UI entry and reactive attempt publication | focus policy/projection parsing |
| `GetTeamMemberRunProjection` client query | Mounted/fresh hydration services | existing transport boundary | selection/focus |

## Removal / Decommission Plan (Mandatory)

| Remove | Why | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `applyRunNavigationTeamFocusToProjection` | second writable focus authority | full derived rebuild from view | In This Change | remove tests/fixture use |
| `applyRunNavigationTeamFocusForStore` + public action | duplicate store patch | inspection success topology refresh | In This Change | no alias |
| `focusTeamMemberAndEnsureHydratedForStore` | false hydration name/ambiguous boolean | typed inspection coordinator/action | In This Change | caller handles failure |
| local lifecycle derivation in `teamDelegatedTaskEntries.ts` | duplicate policy | shared mapper | In This Change | retain lifecycle item construction |
| raw nullable row `taskStatus` | raw/dropped representation | `task: TeamExecutionTaskPresentation \| null` | In This Change | derived status only |
| `hydrateActivitiesFromProjection` clear-then-add writer/export | partial/unwitnessed replacement | pure builder + Activity-store atomic batch | In This Change | update Team and standalone production consumers |
| `teamRunMemberStatusHydration.ts` | no production imports/callers; retains removed writer | delete file and stale `runHistoryStore.spec.ts` mocks | In This Change | reachability proven by repository-wide search |
| `loadRunContextHydrationPayload` raw-Activity shape | permits caller-owned writer sequencing | `loadRunContextHydrationCandidate` with built Activity + expected revision | In This Change | update Agent-open tests/mocks |

## Return Or Event Spine(s) (If Applicable)

**DS-003:** `WebSocket → TeamExecutionViewState.apply* → structural/freshness effect → TeamStreamingService.applyEffects → derived navigation/focused hydration → UI`.

## Bounded Local / Internal Spines (If Applicable)

- **DS-005 / mounted hydration:** `lookup mounted Team+Agent contexts → authoritative/single-flight fast path → capture {teamContext, agentContext, eventMonitorPresentationRevision, activityContentRevision} → exact fetch → pure stage conversation+Activity → revalidate root/run/contexts/revisions → revision-checked Activity replacement + conversation/baseline assignment in one synchronous call → authoritative or retry`. No context/store mutation happens before final validation; a conflict writes nothing; capped automatic retries end in Retry UI.
- **DS-006 / focus repair:** `apply validated tree/task mutation → associate contexts → commit tree/tasks/status → preserve focused run if visible else coordinator/first visible fallback → structural effect`.
- **DS-007 / fresh candidate:** `load resume/tree/tasks/messages/workspaces → resolve and validate required focus → exact target fetch + best-effort others → pure stage candidate content/freshness → focus candidate → recheck root still unmounted + required target authoritative + Activity batch revisions → synchronous Activity batch/mount/navigation/outer selection → connect stream`. Any normal fetch/identity/conflict failure occurs before mount and leaves the previous workspace current.
- **DS-008 / standalone Agent candidate:** `capture current AgentContext identity + Activity revision → fetch projection/resume/files → pure build conversation+Activity → recompute strategy → (KEEP_LIVE: patch locked config + merge files + prime; no Activity replace) OR (REPLACE: verify expected/absent context + revision batch, upsert projection context, prime baseline, hydrate files) → selection if requested → stream connect/disconnect`. The replacement commit contains no `await`; conflict leaves prior context/selection/stream unchanged. `hydrateLiveRunContext` uses only the absent-context replacement subpath and its history caller connects after return. Preserved caller ordering means that the coherent projection context, Activity, and file state all exist before selection and stream policy; inside the synchronous replacement block the Activity CAS executes first so a conflict aborts before any context/file write, with no observable intermediate render.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Misplacement Risk |
| --- | --- | --- | --- | --- | --- |
| Inspection UI state | DS-001–DS-002 | inspection | compound-key loading/error/retry | reactive UI | store becomes focus authority |
| Projection adapter | DS-002/DS-005/DS-007/DS-008 | hydration | pure conversation/Activity builders plus baseline coordination | avoid parser duplication and pre-commit writes | UI/store mutation leaks into staging |
| Read-model retention | DS-001/DS-003 | navigation | retain equal nodes | reduce DOM churn | cache becomes authority |
| Localization | DS-004 | UI | labels/a11y copy | translation | mapper depends on Vue `$t` |

## Ownership Boundaries

Execution view is authoritative for exact focus/topology; navigation only derives. Mounted hydration may mutate one exact monitor only after the complete witness matches, but cannot choose focus. Fresh hydration constructs an unmounted candidate and cannot mount/select; the open coordinator alone commits a validated exact-target candidate. `agentActivityStore` is the sole Activity-content writer; projection adapters return staged values and never clear/add directly. Inspection sequences mounted boundaries but cannot parse projections or repair topology. Components consume shared task presentation/attempt state and cannot derive lifecycle from prose or dots. Standalone Agent candidate loading cannot write Activity; its open coordinator alone chooses keep-live versus replacement and keeps selection/stream after the coherent commit. Backend/Agent behavior stays outside every changed boundary.

## Boundary Encapsulation Map

| Boundary | Internals | Callers | Forbidden Bypass | Fix Thin API By |
| --- | --- | --- | --- | --- |
| `TeamExecutionViewState` | contexts/tree/tasks/focus/repair | inspection, stream, surfaces | direct navigation focus patch | add exact view query/mutation |
| `agentActivityStore` | activity arrays/derived flags/revisions/atomic batch | stream handlers, hydration commit, UI readers | direct mutation of returned Activity objects; clear-then-add projection | readonly read surface + revisioned actions |
| Mounted hydration service | GraphQL/freshness/staging/composite guard | inspection/snapshot/activation reconcile | component fetch/apply; presentation-revision-only CAS | add ensure/invalidate; authority only after guarded commit |
| Fresh context hydration | resume/focus resolution/exact target/best-effort others/staged candidate | Team-run open/recovery | mount/select or Activity writes while hydrating | return validated candidate + authority metadata |
| Inspection coordinator | mounted transaction sequence | run-history selection | focus then hydrate/commit anyway | enrich typed result |
| `TeamRunOpenCoordinator` | fresh commit/mount/selection/stream sequence | history/deep link/recovery | mount false-empty target; clear previous selection early | require exact target authority |
| Standalone run hydration | projection/resume/files/pure Activity build/expected revision | background hydration, Agent open | raw Activity writer or selection/stream policy | return candidate; absent-context guarded commit only |
| `agentRunOpenCoordinator` | context identity/strategy/guarded commit/selection/stream | history, workspace deep link, active recovery | replace live subscribed Activity; select/connect before coherent commit | consume full candidate + store batch |
| Task presentation mapper | lifecycle derivation | selectors/detail/header | each component interprets raw updates | reusable presentation fields |

## Dependency Rules

1. Components → run-history facade/read model → branch adapter → mounted inspection coordinator or fresh Team-run open coordinator.
2. Navigation reads view focus/rows; it never accepts Team-focus patch.
3. If a root Team context is mounted, selection never calls full `openTeamRun` replacement; it uses mounted inspection and returns a typed error if the exact target is not yet visible.
4. Mounted hydration keys by compound root/run identity, stages without writes, and validates the same Team context, Agent context, event-monitor revision, and Activity-content revision before commit.
5. All Activity-content writes use `agentActivityStore` actions. Successful adds/upserts/tool mutations/retention/replacements advance the per-run revision; `clearActivities` always advances as an invalidation boundary; other rejected/no-op actions do not. Revision state survives Activity clear to prevent ABA. Highlight selection is UI-only, does not advance the content revision, and is preserved at replacement when its ID survives.
6. Fresh hydration resolves one required focus before projection fan-out; that projection is exact/fail-fast. Nonfocused projections may be `null` but remain explicitly non-authoritative. Hydration cannot mount or select.
7. `TeamRunOpenCoordinator` commits only while the root remains unmounted and the required focus is authoritative; Activity batch, mount, derived navigation, and selection are synchronous with no network/await gap. Stream connection follows mount.
8. Standalone candidate loading builds `RunActivity[]` without store writes and carries the pre-request Activity revision. `KEEP_LIVE_CONTEXT` never calls replacement; a projection-replace branch revalidates the captured AgentContext identity/revision and commits Activity/context/files before selection or stream policy.
9. The unused `teamRunMemberStatusHydration.ts` is deleted; no wrapper or alternate clear/add writer remains.
10. Streaming executes view-produced effects; it does not calculate focus repair or lifecycle labels.
11. Task UI uses shared presentation, never message text or raw `active` alone.
12. Forbidden: address-only lookup, parent/task aliasing, blind mounted-context replacement, presentation-revision-only CAS, projection clear-then-add, navigation focus patching, content gating by lifecycle/tool choice, or frontend completion inference.
13. No changed frontend module may require a server prompt/tool/lifecycle modification.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `inspectTeamMember(input)` | mounted UI inspection | exact hydrate then focus/rebuild/outer commit | `{rootTeamRunId, agentRunId}` | typed result; root must already be mounted |
| `ensureAuthoritativeTeamMemberProjection(input)` | mounted monitor | exact fetch/stage/composite-witness apply | compound identity + exact Team/Agent context | authoritative/retryable failure |
| `getActivityContentRevision(runId)` | Activity witness | read monotonic content version | exact `agentRunId` | stored outside clearable Activity state |
| `replaceProjectionActivitiesIfRevisions(replacements)` | Activity projection commit | validate every expected revision, then replace all or none | exact run IDs | recompute awaiting; preserve valid highlight; one increment/run |
| `buildActivitiesFromProjection(entries)` | projection staging | DTO entries → validated `RunActivity[]` | none | pure; no Pinia access |
| `hydrateLiveTeamRunContext(input)` | fresh candidate | resolve required focus, exact target, best-effort others, stage context | root + requested/resolved exact focus | no mount, outer selection, stream connect, or Activity write |
| `openTeamRun(input)` | fresh open | require absent root; validate candidate/authority; synchronous commit then connect | root + exact required focus | failure keeps prior selection/context; mounted callers branch elsewhere |
| `loadRunContextHydrationCandidate(input)` | standalone projection | capture expected revision; fetch/validate; build conversation/Activity/files | exact `runId` | no context/Activity/file/selection/stream write |
| `hydrateLiveRunContext(input)` | absent active standalone run | candidate + absent-context/revision guard + coherent projection commit | exact `runId` | caller connects only after success |
| `openAgentRun(input)` | standalone run open | capture context identity; choose keep-live/replace; select then stream policy | exact `runId` | keep-live never replaces Activity |
| `invalidateTeamMemberProjection(...)` | freshness | mark snapshot or newly associated live task context non-authoritative | compound identity/context | no content deletion; activation is not authority |
| `focusAgent(agentRunId)` | view focus | validate visible run/mutate focus | exact run in bound root | existing result |
| `getFocusedNavigationRow()` | focused presentation | row/task context for header | bound root | no component task search |
| `deriveTaskDelegationPresentation(task)` | task display | record → tight presentation | exact DTO | description/display lifecycle |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Action |
| --- | --- | --- | --- | --- |
| mounted inspection | Yes | Yes | Low | reject root/target mismatch before write |
| mounted hydration | Yes | Yes | Low | composite Team/Agent/revision witness |
| Activity replacement | Yes | per-run batch | Low | precheck all revisions; no partial batch |
| fresh hydration/open | Yes, two-stage candidate/commit | required focus exact | Low | no mount/selection until authoritative |
| standalone hydration/open | Yes, candidate + strategy owner | exact run/context/revision | Low | preserve keep-live and commit ordering |
| view focus | Yes | bound root + exact run | Low | remove patch peer |
| task presentation | Yes | exact record | Low | one mapper |

## Main Domain Subject Naming Check

| Subject | Name | Clear? | Risk | Action |
| --- | --- | --- | --- | --- |
| exact selection transaction | `TeamMemberInspectionCoordinator` | Yes | Low | inspection also supports non-focus reconcile |
| retained mounted monitor authority | `TeamMemberProjectionHydrationService` | Yes | Low | keep fetch/stage/guarded apply here |
| fresh exact-target open | `TeamRunOpenCoordinator` | Yes | Low | keep candidate commit/mount here |
| Activity mutation witness | `AgentActivityStore` content revision | Yes | Low | keep revision beside Activity owner |
| standalone projection payload | `RunContextHydrationCandidate` | Yes | Low | replace raw-Activity payload name/shape |
| task UI shape | `TeamExecutionTaskPresentation` | Yes | Low | exclude raw redundant status |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| exact projection query/builders | run hydration | Extend | existing GraphQL/conversation builder; make Activity builder pure |
| complete Activity mutation witness/replace | `agentActivityStore` | Extend | existing exclusive store actions and retention owner |
| mounted target authority | run hydration | Add focused service over existing query/builders | current local path does not hydrate |
| fresh target authority/open sequencing | `teamRunContextHydrationService` + `TeamRunOpenCoordinator` | Extend | existing full-open path; correct target fetch/commit semantics rather than duplicate |
| standalone run hydration/open | `runContextHydrationService` + `agentRunOpenCoordinator` | Extend | existing supported strategy/order; migrate shared writer without policy change |
| unreferenced Team status helper | `teamRunMemberStatusHydration.ts` | Remove | no production caller; retaining it leaves a forbidden writer import |
| focus/topology | team execution view | Extend | existing authority |
| display lifecycle | task utilities/team execution | Extract/Extend | existing duplicated derivation |
| backend task behavior | server task delegation/prompt | Reuse unchanged | explicitly out of scope and already serves required data |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spines | Owner | Decision |
| --- | --- | --- | --- | --- |
| Frontend team execution | containment/focus/row-task projection/effects | DS-001, DS-003–DS-004, DS-006 | view | Extend |
| Frontend Activity | exact-run content/revision/atomic replacement | DS-002, DS-005, DS-007 | Activity store | Extend |
| Frontend mounted hydration | exact projection/inspection/composite CAS | DS-001–DS-002, DS-005 | service/coordinator | Extend |
| Frontend fresh hydration/open | exact required focus/candidate/commit | DS-001, DS-007 | existing hydration/open coordinators | Extend |
| Frontend history/UI | branch/attempt state/derived navigation/rendering | DS-001, DS-003–DS-004, DS-007 | stores/components | Extend |
| Frontend standalone Agent open | staged projection/keep-live/replacement/selection/stream | DS-008 | hydration + Agent-open coordinator | Extend/Preserve |
| Server task/prompt/tool stack | existing data/lifecycle | N/A | existing owners | No Change |

## Draft File Responsibility Mapping

| Candidate File | Area | Owner | Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `agentActivityStore.ts` | Activity | store | mutation revision + atomic replacement | current content owner | yes |
| `runProjectionActivityHydration.ts` | hydration | adapter | pure projection staging | one conversion concern | yes |
| `teamMemberProjectionHydrationService.ts` | hydration | service | freshness/single-flight/composite guarded exact apply | one mounted projection concern | projection builders/store |
| `teamRunContextHydrationService.ts` | hydration | service | required-focus exact candidate | existing full hydration | projection builders |
| `teamRunOpenCoordinator.ts` | run open | coordinator | validate/commit/mount/select/connect | existing fresh sequence | candidate/result |
| `runContextHydrationService.ts` | hydration | service | standalone candidate + background guarded commit | current production owner | builder/store |
| `agentRunOpenCoordinator.ts` | run open | coordinator | keep-live/replacement/selection/stream order | current production owner | candidate/store |
| `teamRunMemberStatusHydration.ts` | hydration | none | remove unreferenced helper | no production reachability | no |
| `teamMemberInspectionCoordinator.ts` | run open | coordinator | mounted hydrate/focus/rebuild result | one mounted transaction | identity/result |
| `taskDelegationPresentation.ts` | team execution | mapper | derived lifecycle/task context | shared policy | yes |
| `teamExecutionViewState.ts` | team execution | view | focused-row query/structural effects | existing owner | presentation type |

## Reusable Owned Structures Check

| Logic | Shared File | Owner | Why | Redundancy Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| lifecycle derivation/description | `taskDelegationPresentation.ts` | team execution | detail/rows/header | Yes | Yes | localized component bag |
| task presentation fields | same | team execution | replace scattered taskId/status | Yes | Yes | full record clone |
| inspection result/state | coordinator file or focused models file if needed | run open | store/UI/tests | Yes | Yes | generic async framework |
| projection Activity staging | `runProjectionActivityHydration.ts` | hydration | mounted/fresh/recovery | Yes | Yes | store writer |
| Activity revision/batch replace | `agentActivityStore.ts` | Activity | stream + hydration serialization | Yes | Yes | generic transaction system |
| standalone projection candidate | `runContextHydrationService.ts` | hydration | background/open/recovery | Yes | Yes | raw DTO bag |

## Shared Structure / Data Model Tightness Check

| Structure | Clear? | Redundancy Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `TeamExecutionTaskPresentation {taskId, description, displayStatus}` | Yes | Yes | Low | do not also expose raw `taskStatus` |
| `TeamMemberInspectionIdentity {rootTeamRunId, agentRunId}` | Yes | Yes | Low | no address |
| inspection UI state | Yes | Yes | Low | compound key, not address |
| `ActivityProjectionReplacement {runId, expectedRevision, activities}` | Yes | Yes | Low | store-owned batch; no context/focus fields |
| fresh hydration authority map | Yes | Yes | Low | successful projection = authoritative; null = non-authoritative |
| `TeamRunHydrationCandidate` | Yes | root + required exact focus | Low | carries unmounted context, staged Activity revisions, and authority; cannot be silently reduced to context |
| `RunContextHydrationCandidate` | Yes | exact run + expected Activity revision | Low | built Activity/files/config/conversation; no side-effect callbacks |

## Final File Responsibility Mapping

| File | Area | Owner | Concern | Why | Shared? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentActivityStore.ts` | Activity | store | monotonic per-run revision; readonly ownership; atomic revision-checked batch | complete Activity witness | yes |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | hydration | adapter | pure Activity staging; remove clear/add | safe reuse | yes |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` | hydration | service | standalone pure candidate; absent-context revisioned commit | live history consumer of removed writer | yes |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | run open | coordinator | preserve keep-live; guarded replacement before selection/stream | history/deep-link/recovery consumer | yes |
| `autobyteus-web/services/runHydration/teamRunMemberStatusHydration.ts` | hydration | remove | delete unreachable writer/status helper | no production imports/callers | no |
| `autobyteus-web/services/runHydration/teamMemberProjectionHydrationService.ts` (add) | hydration | service | mounted exact fetch/freshness/composite witness | cohesive authority | yes |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | hydration | service | early required-focus resolution, exact target, best-effort others, unmounted candidate/staging | complete fresh path | yes |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | run open | coordinator | candidate authority/CAS validation, mount/select/connect ordering | existing fresh owner | yes |
| `autobyteus-web/services/runOpen/teamMemberInspectionCoordinator.ts` (add) | run open | coordinator | mounted atomic inspection | cohesive sequence | yes |
| `autobyteus-web/services/teamExecution/taskDelegationPresentation.ts` (add) | team execution | mapper | derived lifecycle/task shape | policy owner | yes |
| `teamExecutionViewModels.ts`, `teamExecutionTreeSelectors.ts`, `teamExecutionViewState.ts` | team execution | view/models | task presentation/focused row/effects | existing owners | yes |
| `TeamStreamingService.ts` | streaming | dispatcher | consume topology/freshness effects | ordered boundary | yes |
| `runHistoryNavigationStoreActions.ts`, `runHistorySelectionActions.ts`, `runHistoryStore.ts`, `runHistoryNavigationPatches.ts` | history | facade/read model | mounted-vs-fresh branch, attempt state, remove focus patch | existing boundary | yes |
| `autobyteus-web/services/workspace/workspaceNavigationService.ts` | deep-link entry | navigation | route Team-member links through the same mounted-vs-fresh selection facade | prevent mounted replacement bypass | yes |
| `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts` | recovery caller | recovery | keep Agent open delegation after existing-context checks; no direct Activity write | preserves Agent-open policy boundary | no/verify |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | background load | history | consume Team candidate before add/stream and preserve standalone hydrate-then-connect | direct Team/Agent hydration caller | yes |
| `autobyteus-web/stores/agentTeamRunStore.ts` | launch/restore | runtime | consume staged candidate for launch and guarded inactive-context replacement | direct hydration caller | yes |
| `runHistoryTeamExecutionRows.ts`, `runHistoryTypes.ts` | history | UI projection | task presentation/inspection state | existing map | yes |
| `WorkspaceTransientExecutionRow.vue`, `TeamWorkspaceView.vue`, `AgentTeamEventMonitor.vue` | UI | components | dual status/task/loading/error/empty | surface rendering | yes |
| `utils/teamDelegatedTaskEntries.ts` | task detail | item builder | consume shared status derivation | existing detail | yes |
| `stores/__tests__/agentActivityStore.spec.ts`; `services/runHydration/__tests__/runProjectionActivityHydration.spec.ts` | tests | store/adapter | every mutation advances revision; batch conflict/no-partial apply; pure staging | ARCH-F-001 race basis | no |
| `services/runHydration/__tests__/runContextHydrationService.spec.ts` (add); `services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts`; `agentRunOpenCoordinator.integration.spec.ts` | tests | standalone hydration/open | pure build, absent/context/revision conflict, keep-live no replacement, replacement-before-selection/stream ordering | ARCH-F-004 / PB-001 | no |
| `services/runRecovery/__tests__/activeRunRecoveryCoordinator.spec.ts`; `services/workspace/__tests__/workspaceNavigationService.spec.ts` | tests | standalone callers | preserve existing context checks and open delegation; coordinator owns Activity/order | caller-boundary regression | no |
| `stores/__tests__/runHistoryStore.spec.ts` | tests | history | remove stale unused-helper mocks; preserve hydrate-then-connect assertion | helper deletion/background order | no |
| `services/runHydration/__tests__/teamRunContextHydrationService.spec.ts`; `services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts`; `stores/__tests__/runHistorySelectionActions.spec.ts` | tests | hydration/open/history | exact required target/failure before mount; mounted root never full-replaced; live-created exact shell triggers projection authority before focus/current commit | ARCH-F-002 branch plus F-017/MP-006 regression | no |
| mounted hydration/stream tests (adjacent service and `TeamStreamingService.spec.ts`) | tests | hydration/stream | activation-created task context remains non-authoritative; exact projection existing before selection is loaded; system-instruction/tool Activity race; context/revision conflicts; snapshot reconciliation | F-017/MP-006 plus composite guard | no |
| `autobyteus-server-ts/**` | server | existing owners | no changes | explicit scope guardrail | N/A |

## Applied Patterns (If Any)

- Separate coordinators for mounted inspection and fresh Team open, behind one selection branch.
- Pure projection staging followed by guarded synchronous commit.
- Single-flight + composite compare-and-swap for mounted projection application.
- Store-owned monotonic mutation version and all-or-none Activity replacement batch.
- Derived read model for navigation focus/topology.
- Strategy-preserving standalone candidate/commit adapter for the shared Activity boundary.
- Effect dispatch for structural/freshness convergence.

## Target Subsystem / Folder / File Mapping

Existing frontend capability folders remain; no server file is changed and no broad new feature folder is needed.

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentActivityStore.ts` | Modify | Activity | content revision/read boundary/atomic batch | current Activity owner | focus or GraphQL |
| `autobyteus-web/services/runHydration/` | Folder | hydration | projection construction/application | existing area | component state |
| `.../runProjectionActivityHydration.ts` | Modify | adapter | pure Activity builder | current DTO converter | Pinia writes |
| `.../runContextHydrationService.ts` | Modify | hydration | standalone candidate + absent-context commit | current shared-writer consumer | selection/stream policy |
| `.../teamRunMemberStatusHydration.ts` | Remove | N/A | delete unreferenced helper | no production caller | replacement wrapper |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | Modify | Agent open | keep-live/guarded replace/selection/stream | current shared-writer consumer | DTO conversion |
| `.../teamMemberProjectionHydrationService.ts` | Add | hydration | mounted freshness/composite CAS | adjacent to full hydration | focus policy |
| `.../teamRunContextHydrationService.ts` | Modify | hydration | exact required target + unmounted candidate | current full hydration | mount/selection |
| `autobyteus-web/services/runOpen/teamMemberInspectionCoordinator.ts` | Add | inspection | mounted atomic transaction | existing coordinators | parsing |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Modify | fresh open | candidate validation/commit/mount/select/connect | existing owner | projection parsing |
| `autobyteus-web/services/teamExecution/taskDelegationPresentation.ts` | Add | presentation | shared lifecycle/context | task semantics | localization |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Modify | view | effects/focused-row query | existing authority | GraphQL |
| `autobyteus-web/stores/runHistory*` | Modify | UI cache/facade | mounted/fresh branch; remove focus patch; attempt state | existing projection | authoritative focus |
| `autobyteus-web/services/workspace/workspaceNavigationService.ts` | Modify | deep-link entry | use shared exact selection branch | prevents `openTeamRun` mounted bypass | hydration internals |
| `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts` | Verify/No Change | recovery caller | delegate standalone open after absent-context check | existing caller boundary | Activity writes |
| `autobyteus-web/stores/agentTeamRunStore.ts`, `runHistoryLoadActions.ts` | Modify | runtime/background callers | consume full candidate and synchronously commit staged projection with add/replace | direct hydration API callers | context-only discard |
| history/team workspace Vue files | Modify | UI | exact task content/status/states | existing surfaces | alternate identity |
| adjacent tests named in final file map | Modify/Add | coverage | witness/open-branch/convergence/presentation scenarios | existing ownership | backend assertions |
| `autobyteus-server-ts/` | No Change | server owners | preserved backend/prompt/tool/lifecycle | scope boundary | ticket edits |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `services/runHydration` | Main/Off-Spine Shared | Yes | Low | mounted and fresh projection authority |
| `services/runOpen` | Main-Line Control | Yes | Low | inspection sequencing |
| `services/teamExecution` | Main-Line Control | Yes | Low | view/task projection |
| `stores` | Mixed Justified | Yes | Medium | facade/read model only after refactor |
| server folders | Unchanged | Yes | Low | explicitly outside scope |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoid | Why |
| --- | --- | --- | --- |
| Selection branch | mounted root → inspection; absent root → candidate open | mounted root missing target → blind full replacement | protects live root context |
| Mounted witness | capture Team+Agent identities + conversation revision + Activity revision; stage; final synchronous compare/apply | guard only `eventMonitorPresentationRevision` | covers Activity-only live events |
| Activity store | successful `SYSTEM_INSTRUCTIONS_SUPPLIED` upsert increments per-run revision; stale batch returns `conflict` without writes | projection `clearActivities` then `addActivity` loop | no live loss/partial state |
| Standalone keep-live | active subscribed context → patch config + merge files; skip Activity batch | replay fetched Activity over live context | preserves supported live open |
| Standalone replace | pure candidate + unchanged context/revision → batch + context/baseline/files → select → stream | raw Activity writer after selection/connect | preserves coherent ordering |
| Unused helper | delete `teamRunMemberStatusHydration.ts` after zero-caller proof | migrate/wrap unreachable clear-add path | clean-cut boundary |
| Fresh open | resolve target → exact fetch → stage/focus candidate → assert authority → commit/mount/select → connect | best-effort target `null` then current empty row | previous selection preserved |
| Content visibility | active+Idle task still renders its work/tool/handoff events | show empty until awaiting_review | tool/lifecycle independent |
| Task presentation | `{taskId, description, displayStatus}` | raw active + component booleans | one meaning |
| Focus authority | rebuild from `view.getFocusedAgentRunId()` | direct navigation focus patch | no split authority |
| Scope | no `autobyteus-server-ts` edits | prompt/tool workaround for UI bug | follows user clarification |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| keep old focus patch wrapper | fewer call-site edits | Rejected | remove and derive from view |
| parent projection fallback | quickly fill empty monitor | Rejected | exact compound hydration |
| presentation-revision-only guard | reuse existing counter | Rejected | composite Team/Agent + conversation + Activity witness |
| best-effort requested target | keep fresh open resilient | Rejected | exact/fail-fast required focus; best-effort only nonfocus |
| clear/add Activity projection writer | reuse current full hydration | Rejected | pure staging + Activity-store atomic batch |
| keep unused Team status hydration helper | avoid file deletion | Rejected | delete zero-caller file and stale mocks |
| replace Activity in `KEEP_LIVE_CONTEXT` | uniform candidate commit | Rejected | preserve live context and merge only existing permitted metadata/files |
| infer completed from prose/status | explain finished work | Rejected | show content and backend lifecycle independently |
| raw + derived lifecycle fields | incremental UI rollout | Rejected | one task presentation shape |
| server prompt/tool change | influence future task formalization | N/A / Out of Scope | preserve server; fix exact frontend rendering |
| rewrite historical records | align perceived completion | Rejected | no migration |

## Derived Layering (If Useful)

`Vue surfaces → Pinia facade/derived read models → mounted inspection, fresh-Team-open, or standalone-Agent-open coordinator → execution/Agent contexts + hydration services + Activity store → existing GraphQL/stream adapters`. Server remains an unchanged external data/lifecycle boundary for this ticket.

## Change / Refactor Sequence

1. Extend `agentActivityStore` first: add a monotonic revision map independent of clearable Activity state; route every successful content mutation/retention removal through one increment; add readonly ownership expectations and an all-or-none `replaceProjectionActivitiesIfRevisions` action. Lock this invariant with store tests, including clear/ABA, no-op, highlight, and waiting-approval cases.
2. Refactor `runProjectionActivityHydration.ts` into pure `buildActivitiesFromProjection`; remove `hydrateActivitiesFromProjection` and clear-then-add. Repository-wide import search is the completion gate.
3. Migrate standalone consumers before Team callers: make `runContextHydrationService.ts` return/build `RunContextHydrationCandidate` with built Activity and expected revision; use the guarded absent-context commit for background active discovery. Update `agentRunOpenCoordinator.ts` to capture context identity, recompute strategy after loading, skip Activity replacement for `KEEP_LIVE_CONTEXT`, and perform guarded replacement plus context/baseline/files before selection and stream policy. Add/update the standalone hydration/open unit and integration tests. Delete the zero-production-caller `teamRunMemberStatusHydration.ts` and stale `runHistoryStore.spec.ts` mocks; do not add a wrapper.
4. Add mounted context-bound projection freshness and `TeamMemberProjectionHydrationService`. Capture both context identities plus event-monitor and Activity revisions; stage exact projection; apply synchronously only if the composite witness matches. Add the `SYSTEM_INSTRUCTIONS_SUPPLIED` in-flight race, tool-only mutation, context replacement, and capped-retry tests.
5. Correct fresh hydration/open: in `teamRunContextHydrationService.ts`, reject an invalid explicit run, resolve required focus before fan-out, fetch it exact/fail-fast, fetch others best-effort, stage the unmounted candidate, and expose per-member authority. In `teamRunOpenCoordinator.ts`, validate/focus the candidate, recheck the root is still unmounted and target authoritative, commit staged Activity, mount/select, then connect. Update every direct Team hydration caller (`teamRunOpenCoordinator`, stream reopen, `agentTeamRunStore` launch/restore, and `runHistoryLoadActions`) so none discards staged candidate state; route workspace deep links through the shared mounted-vs-fresh selection facade. Test target GraphQL failure/mismatch and Activity revision conflict preserve the previous context/selection.
6. Update `runHistorySelectionActions.ts` to branch on whether the root context is mounted. Mounted roots always use the typed inspection coordinator (including a target-not-yet-visible error); only absent roots use fresh open. Commit selection subject/metadata/config clearing only after branch success.
7. Add shared task display presentation; update task detail/selectors and replace raw row `taskStatus`.
8. Remove Team-focus patch APIs and update frontend tests/E2E fixtures to use view focus plus topology refresh.
9. Add structural/freshness effects to view snapshot/task events and consume them in `TeamStreamingService`; activation leaves/marks new task shells non-authoritative, snapshot invalidates/reconciles focus, and all topology derives from view.
10. Render exact task content/status/context plus loading/error/true-empty states with localization/accessibility.
11. Run frontend unit/component tests and browser validation against node 8001 across standalone keep-live/replacement/conflict, fresh Team open/target failure, already-open activation, `SYSTEM_INSTRUCTIONS_SUPPLIED` during mounted hydration, tool mutation, reconnect snapshot, failed hydration, ordinary-handoff content, and same-address repeated tasks.
12. Confirm `rg "hydrateActivitiesFromProjection|teamRunMemberStatusHydration" autobyteus-web` has no production result, `git diff -- autobyteus-server-ts` is empty, and no prompt/tool/lifecycle/persisted behavior changed.

## Key Tradeoffs

- Full topology rebuild on structural/focus changes is chosen over a specialized focus patch; correctness and one authority outweigh micro-optimization, while equal-node retention limits DOM churn.
- A new Activity-content revision is preferred over trying to broaden `eventMonitorPresentationRevision`: Activity is globally store-owned and includes normal mutations that intentionally have no recent-monitor effect. Keeping the counter with that owner makes the witness complete.
- Atomic replacement is preferred over stable-ID merge because the retained projection is an authoritative bounded window and the repository already has deterministic builders/window policy. The composite CAS prevents overwriting anything newer; conflicts retry instead of guessing event order.
- Fresh target projection is fail-fast while nonfocused projections remain best-effort. This preserves broad context-open resilience without ever calling a selected target's unknown state an authoritative empty state.
- The standalone `KEEP_LIVE_CONTEXT` branch intentionally discards staged conversation/Activity instead of forcing uniform replacement; preserving a subscribed live context outweighs reuse symmetry.
- The unused Team status helper is removed rather than migrated because repository-wide production search proves no caller; wrapping it would preserve a forbidden alternative writer.
- Hydration freshness and mutation revisions remain runtime-only; persisted flags would be stale across clients and require needless migration.
- The UI displays lifecycle and content independently rather than trying to correct Agent behavior it cannot deterministically control.

## Risks

- Continuous task mutation may exhaust automatic mounted-hydration retries. Required outcome is a recoverable error with prior coherent selection, never stale overwrite.
- Every Activity content writer must remain inside `agentActivityStore`; a future direct mutation of getter-returned objects would bypass the witness. Implementation must expose read-only values and add/update writers through revision-advancing actions.
- Fresh candidate commit depends on JS run-to-completion. All network/parsing/identity checks occur before the commit block; it contains no `await`, component callback, or fallible conversion. An Activity batch conflict aborts before mount.
- Standalone Agent open must re-evaluate context identity and stream readiness after network loading. A context that became live/subscribed takes the keep-live path; any other identity/revision conflict preserves the prior context/selection/stream and surfaces failure.
- The live-created-task sequence is deterministically reproduced. Snapshot/reconnect, fresh-open target failure, Activity-only mutation races, and standalone consumers remain separately reachable shared-boundary cases and must not be dropped merely because the primary trigger is now known.
- Task-Team presentation must inherit the nearest owning task without confusing nested tasks.
- Left-tree width is constrained; description truncates first, while lifecycle/execution and accessible full label remain.
- A task may truthfully remain `In progress · Idle` after work-like prose. That is expected under preserved backend behavior, not a frontend failure; the exact work/messages must still be visible.

## Guidance For Implementation

- Treat exact-member APIs as compound-root scoped even when context binds the root.
- Do not set target `aria-current`, active selection, selected Team/member metadata, or clear configs during loading. Keep post-success focus/navigation/selection writes in one synchronous call stack.
- In row and workspace-deep-link selection, root-context presence chooses the branch. Do not use `view.hasAgentRun(target)` as permission to replace a mounted root; return/retry until stream topology exposes the target. `openTeamRun` is fresh-only and rejects if the root appeared while awaiting hydration.
- `selectInitialAgentRunId` must reject a supplied exact run that is absent from the fetched tree; fallback is allowed only when no exact run was requested. Fetch the resolved focus with `fetchExactProjection`; `fetchBestEffortProjection` is for nonfocused members only.
- Fresh candidate staging captures each run's Activity revision before its projection request and carries the expected revisions to the final all-or-none batch; a conflict aborts before mount. The candidate type must remain intact until its coordinator commits; direct hydration callers may not return/use only `hydratedContext`.
- Standalone `loadRunContextHydrationCandidate` captures the Activity revision before network requests and returns built `RunActivity[]`; it performs no Activity/context/file/selection/stream mutation. `openAgentRun` captures the current context identity before awaiting, recomputes `decideRunOpenStrategy` after awaiting, and never applies staged Activity on `KEEP_LIVE_CONTEXT`.
- On standalone replacement, validate context identity and Activity revision before a synchronous block that applies the Activity batch, upserts projection context, primes the baseline, and hydrates file changes. Only then update selection/config and connect/disconnect. Background `hydrateLiveRunContext` requires the context to remain absent and its caller connects after return.
- Delete `teamRunMemberStatusHydration.ts` and stale test mocks. A final production import search must show no `hydrateActivitiesFromProjection` or helper import; no compatibility alias is allowed.
- Stage conversation and Activity completely before mutation. Projection conversion must not import/use the Activity Pinia store.
- Keep `activityContentRevisionByRunId` separate from `activitiesByRunId`; `clearActivities` must not reset the counter and must advance once whenever invoked as an invalidation boundary, including an already-empty run. Increment once for each other successful logical content mutation, including any eviction it causes; other no-op/rejected mutations do not increment. `setHighlightedActivity` remains UI-only and does not advance the content revision.
- The Activity batch action validates all expected revisions before replacing any run. It recomputes `hasAwaitingApproval`, applies the existing window policy, preserves `highlightedActivityId` only if that ID survives, increments once per replaced run, and returns `applied`/`conflict` without partial writes.
- Mounted apply validates payload run ID, mounted Team/Agent context identities, root membership/visibility, unchanged `eventMonitorPresentationRevision`, and unchanged Activity revision. After the final comparison, Activity replacement, conversation assignment, earlier-event flag, baseline reset/prime, and authority marking contain no `await`; a mismatch writes nothing.
- Use context-bound freshness (`WeakMap` or equivalent); context replacement cannot inherit stale authority. Successful fresh projection members become authoritative only when candidate commit succeeds; best-effort `null` members remain non-authoritative.
- Emit topology reconciliation for every task-record change because lifecycle text may change without structure. Invalidate freshness for snapshots/reconnect and mark every newly associated live task context projection-non-authoritative; never mark an activation shell authoritative without an explicit complete exact-projection contract.
- `getFocusedNavigationRow()` supplies header task context; components do not independently search task records.
- Add localization for task marker, lifecycle, combined status, loading, failure, Retry, and true-empty; preserve Enter/Space and exactly one `aria-current`.
- Verify an `active + Idle` task shows its retained work/tool/ordinary-handoff content. Never gate monitor content on `submit_task_result` or infer completion from text.
- Make no changes under `autobyteus-server-ts`; no prompt, LLM tool-choice, collaboration-tool, task-service, persistence, or lifecycle adjustment is authorized.
