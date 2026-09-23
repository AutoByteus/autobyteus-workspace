# Investigation — Offline Org Team Workspace

## Current package state
- Current solution revision: SR-006. Requirements Approved SR-002 unchanged. SR-006 is an evidence-only design-principles audit of unchanged SR-005 technical design; ARCH-REV-003 Pass remains applicable. Downstream IR-003 corrected API-F001 and CRR-003 passed source review; API/E2E owns current revalidation. Prior status entries below are historical.
- Technical design authority: `design-spec.md`. Current cumulative handoff: `solution-handoff.md`. Earlier status entries below are chronological evidence.

## Bootstrap
- Package: `OFFLINE-ORG-TEAM-WORKSPACE-20260922`
- Date: 2026-09-22
- Mode: Git; isolated task authoring worktree.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`
- Branch: `codex/offline-org-team-workspace`
- Base: refreshed `origin/personal`, `da86efe07f7f71e7455db6a866286af0bf0debd7`.
- Finalization target: `origin/personal`; no implementation, merge, or release requested.
- Main checkout was `personal` at `5c7991090`, with existing unrelated dirty/untracked files; left untouched.
- `git fetch origin` succeeded before worktree creation.
- Located historical `tickets/done/stopped-org-whole-config` and `tickets/done/hierarchical-team-run-launch-config`; no existing package for this request found.
- Applicable instructions: Solution Designer skill, requirements engineering reference, server/web AGENTS.md. No subagent work.

## Original request
User requests analysis of editing the internal Team workspace in a stopped AgentOrg after launch, with inheritance to children and use on subsequent messages; user suspects no migration is needed.

## Initial status
Current behavior and technical feasibility investigation in progress. Requirements unapproved. Architecture design not started. Product Design not requested.

## Current findings — SR-001
Investigation complete for a requirements baseline. Evidence is repository source at the pinned refreshed base plus one isolated in-memory probe; no browser reproduction, actual run mutation, provider invocation, or executable feature validation was performed.

### Product/domain understanding and supported scenarios
- An AgentOrg is a coordinator-free root containing direct configured Agents and mounted flat Teams. A Team has configured Agent children, including its coordinator; this is not arbitrary recursively nested configured Teams.
- The existing stopped Org Settings gear opens one whole-Org form from either a configured direct Agent or a mounted Team Agent. Workspace is displayed but locked. This is deliberate prior scope, not just a missing input handler.
- At launch, the supported UI permits a root workspace and mounted-Team workspace overrides. All UI-authored Agents in a Team inherit that Team's workspace, independently of model/runtime overrides. A per-Agent workspace selector is not presently offered.
- The public launch resolver can accept per-Agent workspace overrides, and stored schema can represent distinct child paths. Their treatment during the new edit must therefore be explicit; proposal follows the user's “all children” wording and changes all configured children of the selected Team. Approval pending.
- Offline means the enclosing Org is authoritatively inactive/not managed, not disconnected internet, an idle agent, or an offline leaf under an active Org.
- Existing task executions are separate execution records rather than configured children. Fresh delegation derives from the then-current configured recipient. Historical tasks should not be rewritten by a configured-Team workspace edit.

### Evidence-backed behavior inventory
| ID | Trigger / current product path | Current outcome | Evidence / confidence |
| --- | --- | --- | --- |
| BEH-001 | Launch Org with root workspace; optionally customize a mounted Team workspace | Root → Team → Agent inheritance resolved before persistence; each saved scope has an effective path | E02–E04; high |
| BEH-002 | Stopped configured Agent gear → whole-Org Settings → Save | Model/parameter edits only; workspace stays locked; retained view rejects workspace drift | E01, E05–E08, E16; high |
| BEH-003 | Ordinary Send to stopped Org member → restore root → lazy member activation | Saved execution tree read; each configured Agent's saved path becomes its workspace and runtime cwd | E09–E13; high for repository wiring, unverified real cross-directory provider resume |
| BEH-004 | Stop/save/reopen existing Org | Identity-scoped memory separate from working directory; model save already has whole-root exclusion, one write and canonical readback | E06, E14–E15; high |
| BEH-005 | New task delegated to configured Team/Agent after restore | Source node comes from current configured tree, while historical task records have their own launch snapshots | E17; high |
| BEH-006 | New desired action: change Team workspace in stopped Org | No current supported save behavior; proposed extension only | User request and E05–E08 |

### Source log and technical facts
All paths below are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`. Consulted 2026-09-22 using `rg -n`, `sed -n`, and `cat`.

| Evidence | Exact path / source | Finding / requirement implication |
| --- | --- | --- |
| E01 | `autobyteus-web/docs/agent_orgs.md:289-307`; `tickets/done/stopped-org-whole-config/requirements-doc.md` | Current product policy explicitly locks workspace; authorizes whole-Org model editing only. Prior artifact is historical evidence, not approval of this new behavior. |
| E02 | `autobyteus-server-ts/src/agent-collaboration/services/collaboration-launch-configuration-resolver.ts`, `merge` and `resolveOrg` | Launch merges root→Team→Agent; override field presence controls workspace inheritance. Result is effective configurations, not retained inheritance markers. |
| E03 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-planner.ts:57-91` | Persists root/Team defaultLaunchConfiguration and every Agent launchConfiguration separately in schema v1. |
| E04 | `autobyteus-web/utils/editableAgentOrgRunFormModel.ts:72-86,145-226`; `autobyteus-web/stores/agentOrgRunConfigStore.ts` | Launch UI assigns Team workspace then projects children against it; workspace inheritance is distinct from other overrides. |
| E05 | `autobyteus-web/components/workspace/config/AgentOrgRunConfigForm.vue:1-50`; `TeamScopeConfigEditor.vue:53-70,202-219`; `services/runConfigEditing/existingAgentOrgRunFormModel.ts:20-69` | Existing mode supplies stored-only workspace display with historical path; no workspace edit draft. |
| E06 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts:205-288` | Manager serializes update with restore, rejects managed/active, archived, application-owned and closed-admission edits; validates all model targets, writes once and readbacks. Good existing safety boundary, currently model-only. |
| E07 | `autobyteus-server-ts/src/api/graphql/types/agent-org-run.ts:82-91,129-134`; `src/agent-org-execution/domain/agent-org-run-model-config.ts` | `updateStoppedAgentOrgRunModelConfigs` payload only models/parameters plus scope identity. Workspace needs an intentional contract extension/change, not an extra client field alone. |
| E08 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-model-config-mutator.ts`, `replaceLaunchConfiguration` and `applyAgentOrgRunModelConfigPatches` | Only patches explicitly selected scopes; only replaces model fields. Does not recalculate inheritance. |
| E09 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts:107-125`; `agent-org-execution-scope-builder.ts:116-131` | Restore reloads saved package and projects configured source nodes; does not re-resolve current launch defaults. |
| E10 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-runtime-config-projector.ts:9-34`; `src/agent-team-execution/local/flat-team-execution-factory.ts` | Team projector copies Team defaults and each child's own launch config, without re-inheritance. Configured Teams are flat. |
| E11 | `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts:274-302`; `configured-agent-activation-planner.ts:56-116` | Activation resolves workspace from saved Agent execution path, obtains identity-based memoryDir, preserves external binding on real conversation restore. |
| E12 | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:208-245`; `codex/thread/codex-thread-manager.ts:189-211` | Restore rebuilds workingDirectory from current config.workspaceId and passes it as `cwd` alongside existing threadId. Not proof the real provider resumes a cross-directory thread correctly. |
| E13 | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts:61-80`; `src/runtime-management/claude/client/claude-sdk-client.ts:398-423`; `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:232-272,307-341` | Claude rebuilds cwd and passes new cwd plus retained resume UUID; native restores retained memory with newly built workspace config. Real external cross-directory resume remains a validation item, especially provider lookup of old sessions. |
| E14 | `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts:40-47,110-125`; `src/agent-collaboration/execution/services/rooted-agent-memory-locator.ts` | Local memory layout uses Org/Team/Agent run IDs below configured memory root, not workspaceRootPath. Changing working directory does not require moving conversation/history files. |
| E15 | `autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts:68-90`; `agent-org-run-execution-tree-store.ts` | Existing exact launch schema already includes workspaceRootPath, string or null. Store validates then performs normal atomic package-file replacement. No new stored field/version inherently necessary. |
| E16 | `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:152-190`; `__tests__/agentOrgRunModelConfigAdoption.spec.ts:61-73`; `agentOrgContextHydration.ts:54-78,85-96` | Canonical model adoption rejects non-model drift, including workspace, and only publishes model fields. Hydration resolves saved path to workspace metadata. Workspace adoption and explorer target need coordinated updates without losing conversation/composer state. |
| E17 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-task-lifecycle-adapter.ts:61-90`; `agent-org-runtime-config-projector.ts:36-58` | New delegation gets current configured source. Existing task execution snapshots are separate and must not be swept into configured-child propagation. |
| E18 | `autobyteus-web/services/runConfigEditing/existingAgentOrgModelConfigDraft.ts:24-28`; `existingHierarchicalModelConfigDraft.ts` | Current linked-child policy compares runtime/model/parameters, not workspace. Reusing its linkage flag would wrongly prevent workspace changes for children with distinct model settings. |
| E19 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts:127-145`; `src/workspaces/workspace-manager.ts:90-99` | Launch requires per-placement workspace and uses workspace-path owner; model validation is also workspace-context-sensitive. Must investigate correct post-change workspace validation/cache invalidation in architecture phase. |

### Runtime/probe findings
- Command: `node --experimental-strip-types --input-type=module` importing the existing `agent-org-run-model-config-mutator.ts` and `agent-org-runtime-config-projector.ts` into an in-memory fixture; Node v22.23.1.
- Probe checks (passed): adding an extra workspace property to a current model patch does not change the stored workspace; a Team-only `/old`→`/new` path change projects Team `/new` but child `/old`.
- Evidence: `evidence/current-owner-probe.json`.
- Classification: synthetic feasibility evidence only, not a supported API request and not a feature/E2E test. No live user files or saved runs changed.
- Browser rendering, save API extension, real cwd command, history-preserving cross-directory Codex/Claude resume: not executed. These remain implementation/validation gates, not claimed passes.

## Structural and payload surface inventory
- Existing payload: schema-v1 `agent-org-run-execution-tree.json`; root default, mounted Team default, configured Agent launch paths, separately retained task execution snapshots.
- Readers/writers: planner, strict tree schema/store, stopped-config manager, runtime projector, context hydration/adoption, new-task source projector.
- Potential impacts: public stopped-config API payload, frontend draft and canonical adoption, configured descendant path propagation, same-root lifecycle gate, workspace-contextual model options and explorer metadata.
- No demonstrated need for new storage schema, startup migration, memory relocation, runtime family change, or new subsystem. This is feasibility evidence, not final architecture approval/classification.
- Runtime config is captured when an Org scope is restored: do not support editing under an active Org or rely on a leaf's offline appearance.

## Persisted data/state and migration assessment
- Stored subject: one existing execution-tree JSON per stopped Org in identity-scoped memory storage. Paths occur once per configured scope and also in separate historical task snapshots. Volume of real user runs was not inventoried and no bulk inventory is needed for this proposal.
- Stored shape already represents the desired workspace values; exact-key validators accept the same field with a new string. No inheritance metadata is stored.
- Feasibility conclusion: no application schema migration or file/history move is expected. A normal explicit Save must change the selected Team's default and applicable children in the same persisted tree. This per-run update is not a release/startup migration.
- Preserve IDs, provider bindings for existing conversations, messages/history, tasks/handoffs, statuses/archive/application state, unchanged models and runtime/tool/skill policy.
- Existing working files remain where they are. A new workspace is not automatically populated from the old one. Historical messages/attachments/absolute paths are not rewritten; conversation may still mention the old directory. Normal runtime skill setup in the new workspace is not moving the user's project.
- External provider data layout was not inspected; real cross-directory session restoration must be tested before an unconditional no-provider-adjustment promise. If the existing restore adapter fails, determine its cause without silently resetting history or inventing a migration obligation.

## Product Design and supplements
- Product Design request: Not stated. No prototyper request, UI/UX spec, or normative screenshot exists for this task; all such paths N/A — not applicable.
- Existing launch/stopped form is the product evidence; no redesign is proposed before approval.
- Supplement: `evidence/current-owner-probe.json`, Solution Designer owned, current-owner feasibility evidence for BEH-001–003/REQ-001–003; not behavior-defining and not separately approval-required.
- Historical tickets are read-only background, not incorporated approved supplements.

## Unknowns and requirement implications
| ID | Type | Description | Resolution / status |
| --- | --- | --- | --- |
| DEC-001 | Intended behavior | Interpret “all children” as every configured Agent in selected mounted Team, not historical task executions, even if a separately persisted child path exists. | Proposed explicitly in requirements SR-001; user approval pending. |
| DEC-002 | Scope | Interpret “global config for agent team” as mounted Team's default, not root Org workspace or reusable Team definition/global launch preferences. | Root stays fixed in proposed focused scope; confirm with user. |
| RISK-001 | Runtime uncertainty | Real cross-directory provider resume may have provider-specific session lookup behavior not established by adapter wiring. | Preserve-history real validation required; architecture to investigate further after approval. |
| RISK-002 | User expectation | Old project files and path references stay in old workspace; saved conversation can refer to old files. | Explicit no-file-move requirement and user-facing explanation. |
| RISK-003 | Technical | Context adoption currently rejects workspace changes; stale workspace metadata could retain wrong explorer/terminal target. | Include observable correct workspace publication; design owner investigates exact consumer path. |
| RISK-004 | Technical | Model options depend on workspace; changing cwd can change local configuration. | Verify validation/invalidation behavior without silently changing model selection. |

## Architecture-phase input (not target design)
After explicit requirements approval, investigate the bounded extension of existing stopped-Org save ownership, child propagation independent of model overrides, workspace validation, same-root race exclusion, provider cwd/history restoration, canonical UI metadata publication, and relevant tests. Final API naming, structure, route, task_size and architectural_risk require a completed design and are not classified here.

## SR-002 — User-confirmed UI location and approval
- Read screenshot before action. Original: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_9fb4abd41bd947279726c8b8587be5ed/solution_designer_407d35b9c35d49e0890cd8422707bc55/context_files/ctx_5ff18368d3d8__image.png`.
- Durable copy: `evidence/user-subteam-workspace-control.png`. Shows `/marketing_team` expanded, `/software_engineering_team` sibling, Workspace Directory Existing/New selector and folder picker greyed, saved path and historical-option warning. Does not prove real filesystem unavailability.
- User confirms Team-global workspace changes propagate to Agents inside that Team; “continue please” resumes following interrupted screenshot read. Requirements SR-002 approval reference USER-20260922-SCOPE.
- Screenshot owner: user; retained by Solution Designer; related REQ-001/002 and AC-001/002; status accepted scope/surface evidence. Fixture labels/model/path and disabled appearance are current-state evidence, not desired final visuals. Product request remains not stated.
- Earlier pending DEC-001/002 entries describe SR-001; resolved in SR-002 requirements. No standalone/root scope expansion.
- Workspace reconfirmed: codex/offline-org-team-workspace, HEAD da86efe07f7f71e7455db6a866286af0bf0debd7; only this package untracked; no interrupted writes from previous turn.

## SR-003 — Additional architecture investigation
Performed after SR-002 approval; source revision unchanged. Commands: `cat`, `sed -n`, `rg -n` over paths below. No new provider, browser or implementation tests run.

| Evidence | Source | Observation and design implication |
| --- | --- | --- |
| E20 | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue:137-205,265-305`; `types/workspace/WorkspaceSelectionState.ts` | Selector already has editable/stored discriminated modes, Existing/New/picker UI, and autoSelectDefault=false support. Stored mode itself disables interaction, independently of parent disabled flag. New denotes a supplied workspace path; it does not itself imply file relocation. |
| E21 | `autobyteus-web/stores/existingRunModelConfigStore.ts:80-132,200-260,324-356,414-434`; `types/agent/ExistingRunModelConfigDraft.ts` | Shared editor state owns load/save/reconcile/generations and all three subject kinds; Org branch contains canonical tree plus model planner only. Dirty/canSave currently consider only model patches. Workspace draft must compose into that branch, not create another competing save store. |
| E22 | `autobyteus-web/stores/agentOrgContextsStore.ts:271-305`; `services/agentOrgExecution/agentOrgExecutionContext.ts:152-190` | Org facade guards exact context/view/window binding and submissions, and owns the configuration operation lock. Context publication synchronously updates existing Agent context objects after whole-tree verification. New async metadata lookups need stale checks after awaiting. |
| E23 | `autobyteus-web/stores/workspaceMetadataActions.ts:92-139`; `stores/runHistoryLoadActions.ts:370-384`; `services/agentOrgExecution/agentOrgContextHydration.ts:54-96` | Workspace owner can resolve/cache metadata from root path without file explorer acquisition. History wrapper swallows resolution error to null. Agent config holds workspaceId and workspaceMetadata, not a separate raw root path; canonical execution tree retains raw path. Failed metadata lookup must clear old metadata for changed paths rather than leave old explorer routing. |
| E24 | `autobyteus-server-ts/src/workspaces/workspace-manager.ts:51-99`; `filesystem-workspace.ts:35-90`; `workspace-path-utils.ts:12-20` | Existing workspace registration is metadata-only and canonicalizes path. It does not check physical existence/writability or copy project files. Do not mistake successful registration for guaranteed future filesystem access or add a new absolute/existing-directory policy silently. |
| E25 | `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts:32-77,83-128`; `agent-org-execution/services/agent-org-run-service.ts:66-82` | Model catalog/capacity validation is workspace-aware; validateMany shares evidence per runtime+cwd for that request only. For workspace edits validate all affected final selections in the proposed destination, even when model ID stays unchanged. Org option query currently knows only saved paths. |
| E26 | `autobyteus-web/services/runConfigEditing/existingRunModelOptionsClient.ts`; `components/launch-config/RuntimeModelConfigFields.vue:180-210,250-315` | Existing replacement options query uses only Org ID. Generic display/schema catalog is runtime-scoped. Destination preview needs correct replacement-option context; server remains final schema/model authority. Do not expand into a whole model-catalog redesign. |
| E27 | `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts:211-225`; `agent-org-execution/services/agent-org-run-manager.ts:25-58` | WorkspaceManager is already in process composition and scope builder; stopped-config manager currently only receives model validator. Inject its existing workspace capability into the manager rather than service-level pre-save registration outside the root gate. |
| E28 | `autobyteus-server-ts/tests/fixtures/current-agent-org-run-fixtures.ts:10-79`; `tests/unit/agent-org-execution/agent-org-run-model-config.test.ts:23-96`; `src/run-history/store/run-execution-tree-shared-record-schemas.ts:68-90` | Representative schema-v1 fixture and real store tests contain workspaceRootPath at every configured scope and current strict reader/writer already accepts it. No field removal/addition or version change is required. No production user-data inventory needed or performed. |
| E29 | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:140-169`; `backends/codex/thread/codex-thread-manager.ts:108-150,189-211`; `backends/claude/session/claude-session-manager.ts:86-103` | Restore checks the exact provider binding; current provider managers use configured cwd and retained session identity, not a fixed old workspace binding. External cross-directory behavior remains an integration validation risk, not grounds to implement a session reset/migration fallback. |
| E30 | `autobyteus-web/services/runConfigEditing/existingRunModelConfigMutationClient.ts:1-87`; `graphql/queries/runModelOptionsQueries.ts`; `src/api/graphql/types/agent-org-run.ts:82-134` | Org read and mutation contracts are named model-only and duplicate shape across client layers. Broaden the Org-specific boundary cleanly; keep standalone Agent/Team model APIs and the actual model-only planner valid and unchanged. |

### Architecture assessment
- Root lifecycle/persistence authority is already correct; the new capability changes editable field ownership/contracts and publication. Localized contract/draft/context refactor, not a new runtime architecture.
- Save can normalize Team path intent, expand configured children server-side, validate the combined proposed model/workspace state, register selected workspaces, write one existing schema tree and verify canonical readback within the same Org transition gate.
- Workspace registration is outside the Org tree's atomic transaction: a newly registered descriptor can remain after a failed run-config write. It must never move/delete user files or be rolled back destructively; this is not partial Team configuration success. Describe this limit truthfully.
- Candidate old metadata must never be retained for a changed path. Preserve Agent context identity and conversation/composer state while replacing permitted configuration fields. Historical tasks stay unchanged.
- Existing canonical parse and root gate are reused; no version-specific reader or bulk migration is needed.
- Validation limits: real Codex/Claude cross-directory resume and rendered browser/Electron selector behavior have not been executed. Tests are specified in design for implementation/API-E2E owners; do not claim passes.

### Completed SR-003 design classification
- Medium implementation delta within existing Org/configuration and web editing owners; High architectural risk due to contract, persisted-path propagation, UI workspace targeting and unverified provider cross-directory continuation.
- Persisted transition: Directly Usable — No Migration, evidence E14–15/E28. Runtime receives existing schema fields; no global data scan/version branches.
- Architecture work complete; executable implementation/API-E2E tests and review are not claimed.
- Supplements retained: current-owner-probe.json and user-subteam-workspace-control.png. No external Product or prior independent review artifacts.

## SR-004 — Design-impact recovery from ARCH-REV-001 / AR-F001
- Incoming report/handoff and approved basis read before correction. Finding: Medium blocking Design Impact, REQ-005 / AC-005 / BEH-004, DS-002 Files consumer boundary. Prior review accepted the other design decisions and Medium / High classification.
- Independent source reinspection in the same isolated worktree, branch `codex/offline-org-team-workspace`, unchanged HEAD `da86efe07f7f71e7455db6a866286af0bf0debd7`. Commands: `sed -n`, `cat`, `rg -n` on the sources below; `git status --short`, `git rev-parse HEAD`. Source unchanged; only package documents authored. No browser, executable regression, provider call or live Save performed.

| Evidence | Source | Observation / relevance |
| --- | --- | --- |
| E31 | `design-review-report.md`, ARCH-REV-001 / AR-F001 / AR-P001; approved `requirements-doc.md` REQ-005 / AC-005 / BEH-004 | The canonical-filesystem-target contract already requires unavailable B not be replaced by unrelated draft A. Review requests technical completion only; no approved behavior change. Report is source-traced, not a claimed live reproduction. |
| E32 | `autobyteus-web/components/layout/RightSideTabs.vue:29-40,108-109,135-139`; `components/fileExplorer/FileExplorerLayout.vue:1-40`; `types/workspace/activeAgentWorkspaceTarget.ts` | Parent converts null ID to undefined. Layout has a string-only optional ID and unconditionally creates both FileExplorer and FileExplorerTabs. Parent caches visited Files via v-show; availability needs an actual descendant mount gate, not merely hiding/deactivating it. Existing target union distinguishes four Org variants from standalone targets. `rg` finds RightSideTabs as the only production layout caller. |
| E33 | `autobyteus-web/components/fileExplorer/FileExplorer.vue:76-79,118-126,165-205`; `composables/useWorkspaceFileExplorer.ts:8-19`; `components/fileExplorer/FileExplorerTabs.vue:227-236,414-430` | Missing ID selects global metadata/activeWorkspace; composable explicitly documents null/undefined fallback. Editor Save uses fallback currentWorkspaceId. Preventing only tree rendering does not prevent editor writes. |
| E34 | `autobyteus-web/composables/useWorkspaceHistorySubjectActions.ts:47-71`; `stores/activeContextStore.ts:103-106`; `stores/workspace.ts:407-454` | Normal History selects the retained Org and clears standalone run selection, not launch drafts. Org route has its own active target, but the global workspace getter's unselected branch uses agentRunConfigStore or teamRunConfigStore. A retained draft at A therefore remains a real fallback despite an Org target with unavailable metadata at B. |
| E35 | `autobyteus-web/components/fileExplorer/FileExplorer.vue` `suspendInactiveWork` and `onUnmounted` (~260); `components/fileExplorer/FileExplorerTabs.vue:395-430`; `components/workspace/tools/TerminalPanel.vue:38-67` | Tree unmount reuses release/search/listener cleanup; editor before-unmount detaches global shortcuts. Terminal already distinguishes undefined defaulting from explicit null. A layout-level null gate can cover tree and editor without rewriting their lower optional-target contract or Terminal. This does not prove cancellation of a previously issued file write. |
| E36 | `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts:103-114,185-218,249-299`; `components/fileExplorer/__tests__/FileExplorer.spec.ts`, `FileExplorerTabs.spec.ts`; `rg -n FileExplorerLayout autobyteus-web --glob '*.vue'` | Existing parent tests shallow-stub layout; no colocated FileExplorerLayout.spec.ts found. A parent prop assertion alone cannot prove the retained-draft consumer behavior. Need layout tri-state/lifecycle tests and a composed parent/layout/tree/editor regression with production fallback getter and retained A draft. Unrelated direct Files consumers need not change. |

### Supported premise and bounded correction
AR-P001 is a **Supported Explicit Edge Scenario** within SCN-001/004 and the existing target-correctness contract: user prepares a new Agent draft at A, switches through History to a stopped Org, changes the mounted Team to B, then Files is used while B metadata lookup is unavailable. Independent source trace confirms the retained-draft branch; metadata lookup failure is governed by the existing unavailable-context contract. No artificial persisted-tree mutation, contradictory user intent or new product capability is needed. Frequency/live reproduction is not established and not claimed.

The technical defect in SR-003 was stopping DS-002 at cleared context fields. Revised design chooses the existing layout boundary: RightSideTabs maps a selected Org's missing ID to explicit null, FileExplorerLayout consumes null by omitting/unmounting both children, while intentional omitted-ID defaults remain unchanged. No global draft clearing, workspace-getter rewrite, new recovery owner, schema migration or provider reset. Retained context/canonical-save semantics remain as approved; recovery reads may retry unresolved B metadata without Save replay.

### Supplements / authority inventory update
- `design-review-report.md`: Architecture Reviewer owned; ARCH-REV-001 Fail on SR-003; AR-F001 / AR-P001 technical input for REQ-005 / AC-005 / BEH-004. No separate intended-behavior approval needed. Read-only, unchanged by Solution Designer.
- `architecture-review-revision-record.md`: Architecture Reviewer owned review history; current independent finding remains open until re-review. Read-only, unchanged.
- Existing screenshot, feasibility probe and historical analysis remain relevant with their previously recorded ownership/authority. Product artifacts remain N/A — not applicable.

### Completion and uncertainty
SR-004 design addresses AR-F001 with a complete DS-002 consumer path, tri-state interface, concrete owners/files, suppressed fallback, lifecycle and retained-A regression/recovery guidance. Requirements approval remains SR-002 / USER-20260922-SCOPE. Classification remains Medium / High; this is Architecture Design Complete for re-review, not an independent Pass. Real native/Codex/Claude cross-directory continuation, composed browser/files behavior and all implementation/API-E2E tests remain unexecuted downstream gates.

## SR-005 — Permit the local FileExplorer recovery correction
### Intake, authority and workspace
- Incoming `implementation-handoff.md` and IR-002 scope assessment read first; cumulative requirements/design/history, ARCH-REV-002, CRR-002 and API-REV-001 then read. Finding API-F001, C09/C09-R1, protects REQ-005/007 / AC-005 / BEH-004 / DS-002. CRR-002 confirms implementation-defect origin, not a Requirement Gap. IR-002 asks only to remove the conflicting unchanged-FileExplorer scope restriction, not to change that origin.
- Same isolated worktree/branch, original base `da86efe07f7f71e7455db6a866286af0bf0debd7`; implemented IR-001 source HEAD now `3a52e67ba72ee53497f5d9492f406289f23f28f3`. Incoming implementation artifacts are modified and API/reviewer artifacts/tests untracked. Leave all outside Solution Designer ownership untouched; no commit, cleanup, provider/app change or finalization.
- Commands this round: `cat`, `head`, `tail`, `nl -ba`, `sed -n`, `rg -n`, `git status --short`, `git log -3 --oneline`, and original-base→HEAD diff of the four origin files (empty). No executable test, browser/provider run or live mutation by Solution Designer. Existing reproductions remain attributed to their owners.

| Evidence | Exact source / owner | Observation and implication |
| --- | --- | --- |
| E37 | `implementation-handoff.md`, `implementation-revision-record.md`, `evidence/implementation-ir002-scope-assessment.md`; `code-review-report.md`, `code-review-revision-record.md` | IR-002 correction stopped because SR-004 explicitly prohibited edits to FileExplorer. CRR-002 Fail confirms existing local defect and does not waive that restriction. Bounded scope amendment is needed, not new approval or a new owner. ARCH-REV-002 independently passed SR-004/AR-F001 before this downstream finding. |
| E38 | `autobyteus-web/components/fileExplorer/FileExplorer.vue:118-140,155-220,260-263` | Activation watches a single getter returning a fresh array; metadata-object replacement causes recomputation even with the same ID/active values. Already-registered and absent-metadata returns omit loading settlement after incrementing sequence. The old async finally cannot settle a superseding sequence. Live-session watch also returns a new array. Existing sequence/unmount and lease cleanup must remain. |
| E39 | `autobyteus-web/stores/workspaceMetadataActions.ts:37-54,129-180`; FileExplorer call at 187 | ensure caches a normalized replacement descriptor before registration-task deduplication. Thus transport dedup does not prevent reactive activation feedback. Registration authority is already correct; comparing semantic consumer inputs avoids requiring cache reference stability. Canonical metadata resolution does not insert a client workspace entry. |
| E40 | `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts`; `components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts:159-174` | API C09-R1 uses real Vue/Pinia metadata-only state and delayed external registration, exposing the normal first-recovery path. Existing composed recovery calls register('B') first, bypassing it. Preserve prior safety/retention assertions but remove this recovery proof gap in both initial-unopened and previously mounted cases. |
| E41 | `evidence/implementation-ir002-metadata-reproduction.log`, `implementation-ir002-source-provenance.json`; `evidence/code-review-metadata-activation-failure.log`; original-base→HEAD diff | IR-002 reports exit 1, one failed test plus one unhandled rejection, Maximum recursive updates exceeded in FileExplorer. CRR-002 independently reproduced. Four origin files (FileExplorer, metadata actions, tabs, composable) have identical base/reviewed/current hashes; local diff confirms no original implementation delta there. This is a pre-existing defect exposed by supported recovery, not a post-review source regression. Designer did not rerun it or claim a fix. |
| E42 | `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `evidence/api-browser-recovery-failure.md`, `api-c09-checkpoints.json` | API-REV-001 Fail: first recovery loops/stays Loading after successful metadata/create-workspace requests; null safety holds. Positive sampled native/Codex/Claude continuation, core browser Save/reopen/Send, HTTP/restart and fresh-task results remain API-owned Pass cases, not overall acceptance. Actual native picker unexecuted and baseline parser errors block full web typecheck. |

### Scenario and decision
This is the already-supported AR-P001 recovery continuation: metadata failure → canonical read/reopen makes B metadata available → Files performs client registration and must become usable on the first attempt. It is not an invented race, new editing subject or need to rewrite Resume. The user's intervening clarification explicitly emphasized saving configuration while existing Resume consumes it; the solution continues to do exactly that. SR-002 intended behavior and all approval-dependent supplements remain unchanged.

SR-005 permits only the local FileExplorer activation/terminal-state and relevant live-session watcher correction plus focused regression work. Individual primitive watch sources must include same-ID metadata availability; all current-attempt terminal branches settle Loading/error correctly; stale async/active/unmount guards stay. Registration remains in workspaceMetadataActions/store, the layout stays display-only, explicit-null whole-consumer gating stays, and no fallback/global workspace policy or provider behavior changes. No pre-registration, remount/tab-toggle workaround, clearing draft/composer, or Save replay.

### Ownership, supplement inventory and limits
- Architecture report/history: reviewer owned, ARCH-REV-002 Pass for SR-004, not SR-005. Read-only.
- Implementation handoff/history and implementation-ir002 evidence: Implementation Engineer owned; IR-002 assessment, not fixed source. Read-only to Solution Designer.
- Code report/history and code-review-* evidence: Code Reviewer owned; CRR-002 Fail is current; CRR-001 historical Pass is not a current pass. Read-only.
- API coverage investigation/report/ledger/history, api-* evidence and both durable API tests: API/E2E owner; API-REV-001 Fail, positive cases scoped. Read-only for this design turn. Focused test changes will belong to correction/validation owners under their workflow.
- Original screenshot/probe/analysis remain relevant with prior status; Product and Delivery artifacts N/A. Full absolute-path inventory is in solution-handoff.md and is carried on handoff, including all incoming evidence.
- No new behavior-defining supplement or user decision. Medium / High retained; one existing consumer repair does not create a new subsystem. This completes the authoritative scope amendment, not API-F001 implementation or independent closure. Re-review then implementation/source review/API revalidation remain required.

## SR-006 — User-requested design-principles audit
- Trigger: user asked “make sure the design follows the design principles” after clarification that the earlier unchanged-FileExplorer restriction was a technical design decision, not a user requirement.
- Authority inspected: canonical Solution Designer skill, `design-principles.md`, `references/architecture-design.md`, design template, approved SR-002, cumulative SR-005 design/history/handoff, current reviewer/implementation/code/API artifacts, and current worktree status. No executable test, source edit, browser/provider action or downstream artifact edit by Solution Designer.
- Current chronology observed: ARCH-REV-003 Pass on SR-005; IR-003 local correction commit `cb139904c68b65e3af9f6b07de0e8e5275ed8169`; artifact-only HEAD `66213bd539ed422d39d101bdd218d73760a4100f`; CRR-003 source Pass; API/E2E retains its own current result until revalidation. These are attributed facts, not independently reproduced here.

| Evidence | Source | Observation / design consequence |
| --- | --- | --- |
| E43 | Canonical `solution-designer/design-principles.md`, architecture design standards/template; SR-005 `design-spec.md`; current source/owner evidence E01–E42 | Audited approved-behavior grounding, scenario reachability, DS-001–005 span, bounded local spines, concrete owners, authoritative-boundary/no-bypass rules, off-spine capability reuse, persisted-data decision, refactor proportionality, clean-cut removal, interface tightness, file/folder placement, examples and classification. Technical structure passes. Corrected the ad hoc phrase “Local Reactive Lifecycle Defect” to canonical `Local Implementation Defect`, made `Refactor needed now: No` explicit for SR-005, separated layout availability from FileExplorer/store activation in interface/off-spine mappings, and added the conformance matrix. No technical decision or implementation scope changed. |

### Audit conclusion
- The main feature remains simple at its business boundary: one stopped-Org Save updates the selected mounted Team and all configured children; existing Resume consumes saved configuration.
- Complexity is confined to existing owners that enforce atomicity and truthful filesystem targeting. No new service, framework, migration, provider branch or global fallback policy was introduced for the local recovery fix.
- SR-006 is evidence-only clarification. Approved behavior, supplements, Medium / High classification, SR-005 technical design and ARCH-REV-003 review basis remain unchanged. No renewed approval or repeat architecture review is required. No known design smell remains unresolved by this audit; independent downstream validation still governs implementation acceptance.
