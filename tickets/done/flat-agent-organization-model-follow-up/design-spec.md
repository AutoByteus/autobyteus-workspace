# Design Spec — Lazy configured-member restore for AgentTeam and AgentOrg

## Solution And Approval Basis
- Package: AORG-FOLLOWUP-20260914-001; design revision DS-REV-003; current solution revision SR-010. DS-REV-001/backend and DS-REV-002/Org recovery remain implemented, reviewed preserved bases.
- Design status: **Ready — F-002 / CRR-005 design correction**. Result: **Architecture Design Complete**, Medium/High. Approved SR-005 unchanged; dependent F-002 implementation requires revised architecture review. F-001 resolved in actual API-REV-002, preserve IR-001/IR-002. Overall API remains Fail/confidence75.0%; no delivery pass.
- Approved requirements: SR-005, REQ-001–005 / AC-001–005 / BEH-001–005 / SCN-001–004 in `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/requirements-doc.md`.
- User approval: “Yeah, I approve” of SR-004 Org basis, plus same-message direction to fix Team too if affected (condition confirmed by INV-R06). User subsequently says “We should fix the problem now. You're ready to go.” No changed intended behavior in this design.
- Source/workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up`, branch `codex/flat-agent-organization-model-follow-up`, base `origin/requirements/flat-agent-organization-model` at 72dee5ad2c2e332272a0c00eb36af1a036bd69fb.
- This is a child correction on an **unreleased feature branch**. Finalization target after delivery gates is `origin/requirements/flat-agent-organization-model`, not personal. No release/deployment or current-data reset authorized.
- Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/investigation-notes.md` (INV-R01–07, AINV-001–015).
- No Product/behavior-defining supplement. ARCH-REV-001/002 and IR-001/002 implement/review preserved DS-REV-001/002. CRR-005 / API-REV-002: F-001 resolved, F-002 open, B02–B04 incomplete; F-003 rejected as acceptance finding. New DS-REV-003 review N/A — not yet produced. Inspected HEAD a269262fd, production IR-0028bc62ce5f; API tested c0bbe9c27. Reviewer personal-task-approval-comparison.md is evidence, not design authority.

## Current-State Read
**Original base / unchanged backend design rationale:** fresh configured creation was already lazy. Restore loaded the strict Team/Org package but then eagerly prepared all configured runtime candidates: direct Org Agents through their registry, mounted Teams and standalone Team through the shared flat factory. The first focused Send therefore activates unrelated members; their actual Idle status is rendered green.
Original-personal source at 5645b49d6 separates root restoration from member readiness. The unreleased refactor's eager policy, later corrected only for fresh creation, causes the regression. This is not a naming defect.
The existing on-demand member handle already selects new/native-restore/external-restore based on current conversation state, serializes concurrent readiness and publishes only after binding acceptance. However its lazy binding callback discards the checked no-conversation replacement discriminator; the eager assembly handled that case separately. Moving all configured restore readiness to first work must preserve this real, current development-run case.

**Preserved backend/F-001 design history:** IR-001/e8db80a9c implements scope-only configured restoration and complete first-work binding changes. Do not redo or discard that work. CRR-003 exposes a separate pre-existing frontend integration gap: lost Org stream requires an active-only checkpoint/socket; an inactive retained root cannot publish a recovered context. Independent history rows go Offline but the focused Agent stays stale Idle. DS-REV-002 corrects this missing lifecycle path, not Agent-owned status or aggregation arithmetic. AINV-007–010 records sources and supplied runtime evidence.

**Current F-002 source:** first mounted task inspection replaces the exact retained Agent conversation/Activity with historical projection after revision checks. A live approval already present before the check is overwritten by less informative parsed history. DS-REV-003 keeps required content hydration while reconciling existing current tool lifecycle at that boundary; no task auto-approval or container status changes. Exact live-frame attribution for the original API failures remains unrecorded, although the source erasure is confirmed by the reviewer probe.

## Task Size And Architectural Risk (Mandatory)
- `task_size`: **Medium**. Bounded correction across existing Team, Org and shared Agent-execution owners; existing 14-file backend design (IR-001 also removed an unused interface) plus a bounded 4-file frontend recovery delta: one inspection reader, streaming service, Org contexts store and history load integration. F-002 adds a bounded two-file frontend delta (existing member hydrator and one pure reconciliation module), plus focused tests/docs. No new subsystem, provider backend, visual surface, schema or bulk conversion.
- `architectural_risk`: **High**. Activation timing and a shared internal binding-commit contract change; first-work provider identity persistence, concurrency, and post-durability failure behavior require independent review. F-001 also changes retained recovery/publication integration across existing service/store ownership and must preserve checkpoint, submission and generation safeguards. F-002 also changes history/current-interaction authority at a tool-approval boundary; terminal-state and exact-command preservation require review. High risk is not based on release status or the amount of historical evidence.
- Payload surfaces: ticket/docs and test fixtures only. Structural surfaces: root assembly switches, readiness planner/handle, callback types, root binding commit, local runtime binding cache; inactive-vs-live recovery selection, retained publication and history-triggered reconciliation.
- Escalation: any new storage shape, migration/reset, provider-specific recreation policy, task activation/settlement change, cross-root routing, or frontend change beyond explicit F-001 preservation/F-002 reconciliation below returns to Solution Designer; new intended behavior requires renewed approval. Do not silently broaden this design.

## Architecture Investigation Evidence
| Evidence | Exact source relative to repo | Supports | Limit |
| --- | --- | --- | --- |
| AINV-001 | `autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts:92-101`; Org registry/directory; flat factory | Separate configured assembly from readiness; preserve task preparation | Source, not live test |
| AINV-002 | `agent-collaboration/execution/backends/configured-agent-activation-planner.ts`; `configured-agent-execution-handle.ts:234-241` | Preserve replacement metadata at first work | Full paths indexed in canonical notes |
| AINV-003 | Team/Org root adoption methods, persistence coordinators and checked replacement mutators | Reuse current root durability boundaries | No new transaction store |
| AINV-004 | `flat-team-execution-context.ts`; handle readiness lock; Org operation gate | Strict local cache update, current-binding planning, failure/stop sequencing | Execution validation required |
| AINV-005 | Team V2/Org V1 stores/loaders, current persisted test fixtures | Direct reuse, no migration | User installation volume unmeasured; no bulk operation needed |
| AINV-006 | complete production callback/caller search, browser composers, test inventory | Bounded backend delta and realistic validation matrix | No tests run by designer |
| AINV-007–010 | CRR-003/API evidence; Org stream/store/history; server inspection and active-only checkpoint; original-personal history source | F-001 cause and corrected inactive recovery ownership | Supplied runtime/probe evidence, independently source-traced; no Designer tests |
| AINV-012–015 | Current member hydrator/stream/handlers/builders; CRR-005 probe; original Aug30/Aug31/Sep11 source | F-002 semantic authority, scoped reconciliation and actual frame limits | No Designer executable tests; preserve actual F-001 resolution |
| AINV-011 | current Team history/stream/store and supplied kept-open Team DOM | Same F-001 not observed for standalone Team; preserve/recheck parity | Full B02 incomplete; no universal robustness claim |

## Intended Change
1. Reconstruct/admit the full configured Team/Org scope with every configured Agent unstarted on both fresh creation and restore. Keep the input mode `restore` for resumed contexts; never pretend an existing conversation is fresh.
2. Let existing exact-member input/command admission invoke the shared readiness handle only when work actually needs that Agent. Unrelated configured members remain genuinely Offline, irrespective of old history or bindings.
3. Carry the planner's complete discriminated binding change to the owning root and commit it before runtime publication or accepted input. Existing no-conversation replacement remains available **at first work**, with expected-old checking; no old-version compatibility mechanism is added.
4. Preserve task preparation/release, loader task-reopen repair, exact identities, current context/history, provider selection, fresh behavior and status projection. No frontend status masking or backend renaming.
5. Preserve live task tool decisions during exact first-inspection history hydration under the F-002 protocol below; history must not downgrade a received live approval or resurrect a terminal tool. Keep manual/auto configuration.
6. Reconcile retained Org state after lost transport through validated read-only inspection when inactive, retaining active-only checkpoint verification when active. Publish status/history/continuation through the existing Org context owner, without refocus or provider startup; preserve unknown-state safety.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Kind | REQ / AC | Approved trigger | Existing evidence | Target / spines |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | 001 / 001 | SCN-001 kept-open Org restart, retained focus then Send | INV-R01–03; AINV-007–010/F-001 | DS-002/DS-005 reconcile retained inactivity before continuation → DS-004, only recipient readies |
| BEH-002 | User/System | 002 / 002 | SCN-002 subsequent legitimate human/peer message | AINV-001 | DS-003 → DS-004, unrelated recipients remain lazy |
| BEH-003 | Contract | 003 / 003 | Continuation/accepted input and ordinary manual delegated-task completion under SCN-001–004 | AINV-002–005,012–015 | DS-004, DS-007 and existing task protocol; preserve history, current control and exact provider semantics |
| BEH-004 | User/System | 004 / 004 | SCN-003 standalone Team focused Send after restart | INV-R06 | DS-001 → DS-004 → DS-005 |
| BEH-005 | User/System | 005 / 005 | SCN-004 fresh configured launch / first work | INV-R05–06 | DS-006; retain lazy fresh creation and work-bearing task startup |

## Relevant Supplemental Task Artifacts
All paths below are under `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/`:
- `restart-resume-analysis.md`: source chain/parity/chronology; supports REQ-001–005; evidence only.
- `team-backend-abstraction-analysis.md`: user-deferred naming/wrapper investigation; contextual exclusion, not a refactor instruction.
- `bootstrap-handoff.md`: historical workspace provenance; finalization target is now confirmed by requirements, not its earlier provisional wording.
- `solution-revision-record.md`: cumulative approval/design history.
Historical `tickets/done/flat-agent-organization-model` and `tickets/done/collaboration-follow-up-fixes` requirements/design/reports are preserved evidence only. Their eager-restore policy is superseded for this correction by approved SR-005; no historical results rewritten.

## Task Design Health Assessment (Mandatory)
- Posture: Bug Fix; design issue: Yes; root cause: Missing Invariant / Boundary Or Ownership Issue.
- Missing invariant: configured-scope admission is not equivalent to every member's runtime activation.
- F-001 adds a Missing Invariant / Boundary Or Ownership Issue: a retained inactive Org must not require live-only admission to reconcile its context. Earlier design/review reuse claim omitted that branch.
- Refactor needed now: **Yes, bounded**. Correct three scheduling entrypoints and tighten the existing shared binding callback so lazy continuation can express the same safe replacement already handled eagerly. Do not add a second planner/persistence owner or per-root ad hoc provider policies.
- F-002 root cause: historical completeness and live decision authority are conflated. Refactor needed now: reconcile detached candidate tool lifecycle at existing hydrator, retain history and current guards, not bypass inspection.
- Existing owners remain correct: root owns durable identity/tree, shared handle owns provider readiness, planner owns conversation-based decision, local context owns cached runtime binding.
- Deferred: Mixed/Flat naming and forwarding-wrapper simplification per user. Residual readability overhead is independent of this bug and does not prevent correct lifecycle behavior.

## Terminology
Configured Agent = persistent member of Team or direct/mounted member of Org. Scope admission = validated root/membership/history available for routing. Runtime readiness = actual AgentRun/backend prepared and published. Replacement = existing current-format no-conversation binding replacement, not migration of released data. A task Agent/Team already has assigned work; it is not an unused configured member.

## Design Reading Order
Read current evidence/approval, DS-001–007 and owner map, then preserved backend/F-001 protocols and mandatory F-002 DS-REV-003 section. The latest section and current metadata supersede historical pending-status wording; no prior implemented behavior is undone. Tables reuse the same owner map rather than proposing additional layers.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove replaced in-scope paths. Delete configured-root eager-restore branches and obsolete root-assembly binding staging/reduction that only supported that eager path. Replace the old binding-only callback at its complete production/test callsites, with no optional fallback or parallel legacy method. Keep task preparation/staged results where still used. Do not revive nested-Team machinery or rename backends in this fix.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
**Directly Usable — No Migration.** This unreleased feature uses current Team V2 `agent_teams/<root>/team_run_execution_tree.json` and Org V1 `agent_orgs/<root>/agent_org_run_execution_tree.json`, plus existing task/message sidecars and per-Agent conversation state. Stored members retain exact address/run IDs, launch config and nullable provider binding.
Normal stores validate these same shapes; loaders preserve the existing task-reopen repair. Current persisted fixture examples (AINV-005) cover null binding, history-backed binding and bound/no-conversation state. The planner already reads those meanings; this design changes **when** it runs, not how the data is encoded. Existing readers/mutators handle the ordinary single-member binding change in the same schema.
No inventory scan, transformation, file-family rename, version bump, reset, replay or backfill. Installed development volume is unknown and not needed for a no-bulk-operation decision; ordinary first-work tree commits remain O(existing tree), as existing adoption. Preserve current run history and contents, not unnecessary runtime sessions. Current no-conversation replacement does not promise preserving an empty provider thread's ID.
No release/upgrade machinery: user confirms feature branch unreleased. Any later discovery of incompatible stored meaning returns as a design/requirement gap, not an improvised migration.
### Migration Plan (Only When Decision Is `Migration Required`)
N/A — no schema/path/format transition is needed or authorized.

## Data-Flow Spine Inventory
| ID | Scope | Behaviors | Start → End | Owner / importance |
| --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | 004,003 | Team retained composer → selected member response | Team root, no all-member activation |
| DS-002 | Primary end-to-end | 001,003 | Kept-open Org loses stream → verified retained state → eligible composer → selected member response | Org streaming/store + server root; includes mounted-Team/direct placements |
| DS-003 | Primary end-to-end | 002 | Legitimate peer/human input → another member response | Existing subject routing and shared readiness |
| DS-004 | Bounded local | 001–005 | Agent readiness request → durable binding → runtime publication/input | Shared handle + root commit; protects continuation |
| DS-005 | Return/event | 001,002,004,005 | Runtime event OR inactive inspection → Org publication → retained header/history/continuation | Runtime status unchanged; inactive branch explicitly specified below |
| DS-007 | Primary plus bounded projection return | 003,004,005 | Frontend manual delegate approval → live task request → first task selection/hydration → frontend tool approval → one submission/review/settlement | Agent current tool state and member hydration owner; preserves required history without erasing decisions |
| DS-006 | Preserved primary | 005,003 | Fresh launch or real task assignment → existing work lifecycle | Root assembly/task lifecycle, no task scheduling redesign |

## Primary Execution Spine(s)
- DS-001: retained Team composer → RestoreAgentTeamRun → Team manager/package loader → root materializer (no configured readiness) → exact-member Send → Team local handle → DS-004 → provider response.
- DS-002: kept-open browser loses Org stream → existing bounded recovery → validated read-only inspection → inactive candidate staged/published, or active checkpointed stream → retained Org composer → restoreAgentOrgRun → Org manager/package loader → full scope builder (no configured readiness) → exact direct/mounted member Send → shared handle → DS-004 → provider response.
- DS-003: existing authenticated logical/exact recipient command → subject-owned resolver/admission → configured member input reservation → shared readiness → existing accepted-message commit/release → response. No receiver-active precondition may be added for configured members just to avoid laziness.
- DS-007: frontend Team lead Send → visible parent delegate_task Approve → actual task Agent input/manual tool request → exact stream dispatch into unselected AgentContext → task click/inspectMountedTeamMember → exact historical projection + current-tool reconciliation → guarded commit/focus → visible Approve/Deny → existing exact Team tool command → backend pending gate → one task submission → ordinary review/settlement.
- DS-006: fresh root config/launch → existing full-scope assembly → no configured worker start → first selected input follows DS-004. Real task assignment continues existing prepare → durable task publication → releaseWork; settled tasks are not restarted.

## Spine Narratives (Mandatory)
DS-001/002 load and validate the whole root and existing recovery state, admit routing structure and expose Offline statuses without contacting every member's provider. The selected input then takes the existing member path; no provider session is created merely to populate a snapshot. DS-003 reaches other configured Agents using ordinary supported commands, retaining authorization and exact placement. DS-004 chooses correct continuation, persists the binding decision under the subject root, then publishes the candidate and accepts input. DS-005 reports resulting per-Agent status without changing untouched members during live work; verified root inactivity reconciles every retained runtime status to Offline through the existing Org owner. Unknown transport alone does not establish inactivity. DS-006 preserves fresh and task behavior rather than sharing an accidental global "disable activation" switch.

## Spine Actors / Main-Line Nodes
Existing Team/Org composers (input/focus), task inspection coordinator (selection), member hydrator (content plus current-tool reconciliation), subject manager/loader (root restore), scope builder/materializer (configured assembly), subject root (routing/identity/durable state), configured handle/planner (one runtime readiness), AgentRun/backend (provider execution). F-001 adds existing Org streaming recovery and retained-context publication owners to DS-002/005; the new inspection reader is off-spine query/validation, not a new main-line coordinator.

## Ownership Map
| Owner | Owns | Must not own |
| --- | --- | --- |
| Team/Org root assembly | Validate/create structural scope, mode, registration | Prepare every unused runtime |
| ConfiguredAgentExecutionHandle | One readiness attempt, candidate lifecycle, committed binding cache | Write root files or choose root family by guessing |
| ConfiguredAgentActivationPlanner | Decide new/restore/checked replacement from actual activity | Admit scope or persist/change authoritative tree |
| RootTeamRun / AgentOrgRun | Apply exact binding change against current tree through existing serialized persistence | Call providers while holding tree persistence queue |
| FlatAgentExecutionContext | Strict committed local binding cache | Authorize replacement or override durable tree |
| Team member hydrator | Exact historical content plus preservation of existing current tool state at guarded commit | Authorize tools, infer awaiting state from parsed trace or replay events |
| Agent tool handlers / Activity projection | Current received tool lifecycle and normal transitions | Mark complete history hydrated just because one live event exists |
| Existing task engine | Task preparation/records/release/settlement | Be rewritten as unused configured readiness |
| Org streaming service | Transport recovery selection, checkpoint/snapshot barrier, socket generation and bounded attempts | Infer inactive from errors or start providers |
| Org contexts store | Retained publication/focus/submissions/history activity and service registry | Delegate leaf mutation to history loader |
| Org inspection reader | Read-only query and existing DTO/root validation | Retry, publish contexts or maintain a second liveness cache |

## Thin Entry Facades / Public Wrappers (If Applicable)
GraphQL/services remain request boundaries, not new activation policy owners. Existing TeamRun/FlatTeamRunBackend remain local execution access boundaries; removal/rename explicitly deferred. They must not acquire restore loops or persistence writes.

## Removal / Decommission Plan (Mandatory)
| Remove | Replacement | Scope |
| --- | --- | --- |
| mode != fresh eager configured preparation at Team/Org root assembly | scope-only assembly for fresh AND restore | This change |
| direct Org configured activation plan staging; root-assembly binding adoption/replacement reductions now unreachable | first-work root commit | This change; retain shared/task candidate APIs still used |
| binding-only callback and loss of replacement discriminator | typed commitPlatformBindingChange callback | This change, no compatibility overload |
| planner's stale constructor binding capture | current binding supplied to each prepare attempt | This change |
| tests requiring eager configured restore | tests requiring lazy restore plus equivalent first-work durability | This change; preserve the assertions' meaningful safety coverage |
| Mixed/Flat facade naming/wrapper | Nothing in this ticket | Deferred by user |

## Return Or Event Spine(s) (If Applicable)
DS-005: handle/AgentRun publishes existing status/event → Team or Org root publisher → existing execution view/stream → exact member context → existing status dot. Unprepared configured handles report Offline. Green continues to mean actual Idle. No synthetic all-Offline override based on message count; members doing peer/task work remain truthful. Existing status projection/focus/hydration primitives are reused, but the retained Org restart path is corrected by the mandatory F-001 protocol below. DS-005 now includes verified inactive inspection → staged Org context → the same publication owner → focused header/history/continuation. Unknown transport is not inactivity.

## Bounded Local / Internal Spines (If Applicable)
### DS-004 — first-work binding protocol (authoritative technical delta)
1. Keep shared handle's one `readinessAttempt`, shutdown fence and active-run reuse. Read current committed binding for each planning attempt; remove planner constructor's immutable copy. Proposed planner API: `prepare(config, currentPlatformAgentRunId: string | null)`; mode and exact identity remain constructor inputs.
2. Extract existing planner return union into `CollaborationAgentPlatformBindingChange` in existing `collaboration-agent-platform-binding.ts`:
   - `{ kind: "adopt_or_retain", binding: CollaborationAgentPlatformBinding }`
   - `{ kind: "replace_without_conversation", replacement: CollaborationAgentNoConversationBindingReplacement }`.
   No extra optional previous-ID field or duplicated identity: each variant already contains exact root/member identity. Native no-binding remains null at the planner result, not a callback no-op variant.
3. Replace `acceptPlatformBinding(member, binding)` with required `commitPlatformBindingChange(change): Promise<void>` in both existing callback contracts and all construction adapters. Validate change identity equals the handle identity. Preserve the whole variant; never unwrap replacement into adoption.
4. Rename/extend existing root methods to `commitAgentPlatformBindingChange(change)` (one subject method per root class, not a global selector API). Under existing admission/persistence coordination, adoption uses existing adoption mutator; replacement uses existing checked replacement mutator against **current** root tree with expected-old binding and exact identity. Team normalizes the binding using its existing converter before its mutator. Org uses its own mutator. Existing validators and current-schema stores remain unchanged. For Team adoption preserve requiresWrite = outcome === adopted; for an accepted replacement requiresWrite is true. Build both against current tree inside the existing persistence preparation callback, not from a stale pre-await snapshot.
5. Root method updates tree/index only after durable write. Keep existing fail-stop handling for post-rename uncertainty/live-finalization failure. No provider preparation while persistence lock is held. Callback adapter normalizes known indeterminate persistence outcomes to existing `CollaborationAgentActivationError` with `indeterminate: true`, preserving cause/code; do not swallow a generic error as success.
6. Flat-team wrapper validates its local change identity and replacement expected-old value **before** awaiting the root. After root callback resolves, apply deterministic local cache mutation: adoption retains strict old behavior; new explicit checked replacement method in FlatAgentExecutionContext changes only the expected old ID. Do not relax ordinary adopt to arbitrary overwrite. Root-direct handles have no separate Flat context.
7. Shared handle updates its committed binding after successful callback, then calls candidate.commitPublication, binds runtime events and stores AgentRun. For either failure after root commit (local finalization/candidate publication), do not roll back the durable tree or retry with the stale original binding: surface indeterminate/nonretryable readiness until safe root reopen. Keep actual candidate abort/quarantine handling. Track whether durability succeeded so a subsequent error is never misclassified as a clean pre-durability failure.
8. On definite pre-durability failure: abort candidate, leave tree/local binding unchanged, permit existing retry only after cleanup is confirmed and root admission remains open. On unreadable activity or real history without provider binding: preserve failure-closed errors, never create a fresh conversation as fallback. One same-member concurrent input shares readiness; different members serialize only their root mutations, not provider startup. Normal message reservation/deduplication/commit remains existing code.
The two-stage prepared activation API remains for genuine task work. Its staged arrays are not replaced by callbacks before the new task identity exists durably.

## Off-Spine Concerns Around The Spine
| Concern | Serves | Existing capability | Constraint |
| --- | --- | --- | --- |
| Conversation activity inspection | DS-004 planner | AgentConversationActivityInspector | No history loss or synthetic zero-message masking |
| Durable binding and recovery | DS-004 roots | current mutators/persistence coordinators | expected-old compare inside serialized current-tree preparation |
| Memory/workspace identity | handle | RootedAgentMemoryLocator / WorkspaceManager | no root-family path guesses or installation reset |
| Shutdown/failure cleanup | handle/root | existing fences, candidate abort/quarantine, root gates | no runtime published after disallowed/uncertain commit |
| Task reopen repair | DS-001/002 | existing package loaders and shared task-reopen repair | unchanged policy and retained records |
| Status/history projection | DS-005 | existing subject publishers and frontend contexts | actual per-Agent status, no color patch |

## Ownership Boundaries
Only subject root changes its durable tree/index. The shared callback carries an explicit root-tagged change, not direct file access. Shared planner determines legitimate no-conversation replacement from current activity; ordinary callers cannot request arbitrary binding replacement via public GraphQL. Internal Flat wrapper updates only its cache after root success. Task engine continues publishing prepared task identity before releaseWork.

## Boundary Encapsulation Map
| Boundary | Internal mechanism | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| commitAgentPlatformBindingChange on each root | current-tree mutator + existing persistence coordinator | root-wired callback | handle writing tree files or replacing root index itself |
| configured handle input/readiness | planner + AgentRunManager candidate | exact Team/Org delivery owners | root loops preparing all configured workers |
| root manager restore | loader/repair + scope assembly | existing GraphQL/service | UI directly restarting member providers |

## Dependency Rules
Use existing domain → shared typed callback → subject root assembly wiring. Shared handle cannot import concrete Team/Org managers/stores. Callback change is internal-only and required; migrate all production/test providers in one cut. No source compatibility shim. Root methods reuse existing coordinator concurrency/error ownership. No new backend/facade/enum renames. Do not alter factory default/task scheduling as a shortcut.

## Interface Boundary Mapping
| Interface | Subject/identity | Responsibility |
| --- | --- | --- |
| CollaborationAgentPlatformBindingChange | existing compound root kind/id + exact member address/run ID, carried once | preserve adoption vs checked replacement meaning |
| commitPlatformBindingChange(change) | same compound member identity | root-wired durable commit before readiness publication |
| each root's commitAgentPlatformBindingChange(change) | own Team or Org; reject foreign root | serialize correct current-tree mutation |
| planner.prepare(config, currentBinding) | constructor-fixed member identity/mode, attempt-current binding | new/restore decision without stale snapshot |
| local checked replacement method | one already-correlated Flat Agent context, expected-old/new binding | update committed cache without relaxing adoption |

## Interface Boundary Check
All changed interfaces have one binding/readiness responsibility and explicit identities; selector ambiguity Low. No union of Team-vs-Org request meanings guessed from a bare ID. Compound root identity already exists. Existing unrelated Team backend interface is untouched.

## Main Domain Subject Naming Check
Keep TeamRun, AgentOrgRun and current Flat/Mixed symbols. New `commitPlatformBindingChange` describes its actual responsibility; "change" is limited to the existing two binding variants. No generic recovery coordinator or compatibility manager.

## Existing Capability / Subsystem Reuse Check
Reuse planner, candidate registry, task staging, activity inspector, current subject mutators/stores, root persistence locks, error classes and status projections. The original backend delta extends callback semantics/current-binding input. F-001 additionally reuses existing inspection, staging/adoption and stream recovery, extracting only shared Org query/validation. No new subsystem or runtime owner is needed.

## Subsystem / Capability-Area Allocation
Shared collaboration execution owns binding-change value and single-Agent readiness. Team local execution owns configured member construction and local cache. Standalone Team/Org root owners own scope assembly and durable binding commits. Frontend Org store owns retained context/focus/publication, stream service owns bounded transport recovery, and history loading triggers that owner only. F-001 preserves the four-file integration below; F-002 adds exact member history/current-tool reconciliation inside existing hydration ownership. No visual/status-engine redesign.

## Draft File Responsibility Mapping
Initial grouping: (a) configured root scheduling, (b) shared binding/change readiness, (c) root durable commit adapters, (d) local binding cache, (e) tests/docs. Reuse existing binding-change value variants and mutators rather than duplicating per-root planners. Final concrete inventory below supersedes this draft grouping.

## Reusable Owned Structures Check
The planner's existing inline two-case bindingChange union becomes one named exported type in its existing binding domain file. Reuse it through callbacks/root methods; no copied Team/Org change unions. Reuse existing Team conversion where required by its mutator. Existing native null outcome remains absence, not another persistent state.

## Shared Structure / Data Model Tightness Check
One meaning per field: binding.execution carries root/member identity; binding.platformAgentRunId is provider identity; replacement.expectedPreviousPlatformAgentRunId is compare-and-replace precondition. No duplicate member argument in the new callback. Shared type is internal and not serialized as a new disk schema. Do not broaden the base with optional task/migration fields.

## Final File Responsibility Mapping
Paths below are relative to `autobyteus-server-ts/src/`.
| File | Action and exact responsibility |
| --- | --- |
| `agent-team-execution/services/team-root-materializer.ts` | Modify: pass prepareConfiguredAgents false for configured root fresh/restore; retain activationMode; wire new root commit callback; remove obsolete eager root binding reductions/imports |
| `agent-org-execution/services/agent-org-root-agent-execution-registry.ts` | Modify: configured creation reserves/publishes handle without preparing candidate in either mode; simplify configured plan; wire typed callback into shared handle. Keep prepareTask eager |
| `agent-org-execution/services/agent-org-team-execution-directory.ts` | Modify: configured mounted Team passes false; keep task preparation enabled |
| `agent-org-execution/services/agent-org-execution-scope-builder.ts` | Modify: scope assembly plans only local registration/abort, not configured provider binding staging; wire new root commit callback; preserve mode/context/event/root registration |
| `agent-collaboration/execution/domain/collaboration-agent-platform-binding.ts` | Modify: named tight binding-change union using existing values |
| `agent-collaboration/execution/domain/root-agent-execution-callbacks.ts` | Modify: required binding-change callback replacing old binding-only callback |
| `agent-team-execution/local/flat-team-execution-callbacks.ts` | Modify: same shared change value/contract through Team plane |
| `agent-collaboration/execution/backends/configured-agent-activation-planner.ts` | Modify: export/import named result union, pass attempt-current binding instead of constructor snapshot; preserve activity-based decisions |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | Modify: pass current binding; commit complete change; ordered local update/publication; preserve readiness coalescing and cleanup; mark postcommit failure indeterminate |
| `agent-team-execution/local/flat-team-agent-execution-handle.ts` | Modify: identity/expected-old validation, forward full change and apply committed cache only after root success |
| `agent-team-execution/local/flat-team-execution-context.ts` | Modify: explicit checked committed replacement method; ordinary adoption remains strict |
| `agent-team-execution/services/team-flat-execution-callbacks.ts` | Modify: wire complete change to Team-root boundary; preserve event/context duties and map indeterminate failures without losing cause |
| `agent-team-execution/domain/root-team-run.ts` | Modify: evolve existing adoption method into change commit; reuse mutation serialization/correlation/error behavior and checked replacement mutator |
| `agent-org-execution/domain/agent-org-run.ts` | Modify: equivalent Org-owned change commit behind operation/persistence gates; no nested provider calls in commit lock |
No new backend production folder/class required. F-001 adds one frontend Org-owned inspection reader and modifies three existing files, detailed below. Existing factory/manager/prepared result APIs used by task execution remain; update only type imports if compiler requires, no behavioral default change. Tests and long-lived docs are additional artifacts, not new production owners.

## Applied Patterns (If Any)
Existing factory/registry for scope, per-Agent coalesced readiness for single activation, discriminated value for mutation semantics, root persistence transaction for identity. No new general-purpose pattern or abstraction.

## Target Subsystem / Folder / File Mapping
Use the existing folders in the final inventory: root scope and adapters stay in subject services; root mutation entrypoints remain subject domain owners; shared callback/value/handle stay under collaboration execution; Flat context/adapter remain local Team execution. Add focused tests under existing unit/integration directories. No renamed backend files, legacy folder revival or migration directory.

## Folder Boundary Check
Existing domain/control, callback, local execution and persistence-provider boundaries remain readable. No transport/provider write mixed into scope constructors; no new one-file folders. A local shared type in its already-owned binding file is clearer than a new generic contracts subsystem.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
- Org has direct Alice plus Team Bob/Carol. After server restart, restoring the Org exposes all three Offline. Sending Alice a message readies only Alice. Alice's allowed peer message to Carol readies Carol; Bob remains Offline.
- Standalone Team has coordinator + worker. Resuming worker does not prepare coordinator merely to populate the tree; explicit Team-directed work retains coordinator routing when required.
- Old provider binding `thread-A`, confirmed no conversation: no provider call on root restore. At first targeted work planner prepares candidate `thread-B`; root compares persisted A → writes B → local cache updates → candidate publishes → input accepted. Avoid passing bare B into ordinary adopt or changing restore to fresh.
- Two rapid messages to the same offline member share one readiness attempt. The ordinary input reservation/dedupe protocol handles message multiplicity; no duplicate candidate from competing first inputs.

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision | Reason / replacement |
| --- | --- | --- |
| Preserve eager restore behind feature flag | Rejected | direct unreleased-branch correction; one configured lifecycle invariant |
| Old/new binding callback overload | Rejected | migrate all internal producers/consumers to complete change contract |
| Fresh-mode fallback for retained history | Rejected | preserve original restore semantics and strict errors |
| Released-version migration/reset | N/A / not authorized | base is unreleased and current formats remain directly usable |
| Paint all unmessaged agents gray | Rejected | runtime truth, not hidden activation |

## Derived Layering (If Useful)
N/A as separate architecture: existing subject roots → typed local execution → per-Agent provider readiness is sufficient. Preserve authority rather than introduce another wrapper layer.

## Change / Refactor Sequence
1. Add focused failing regressions on real configured scope assembly (not fake root factory only) for both root families; preserve existing source before altering expectations.
2. Introduce named change value/current-binding planner input and migrate required callback contracts/adapters, root commit methods and local cache semantics. Keep old method names only during local editing, not final source.
3. Prove first-work adoption/restoration/replacement and pre/post-durability failure handling with both subject roots; preserve task staging.
4. Switch configured root/mounted/direct assembly to scope-only; delete dead eager root staging code. Preserve activationMode restore.
5. Run targeted and broader implementation checks, update docs, then independent source/test review and API/E2E per routing. Do not mark original eager tests passed merely by removing them; relocate their durability intent to first work.
6. Delivery verifies user outcome and merges completed child correction into the feature base, subject to fresh integration check and normal gates. No personal merge/release/deployment.

## Key Tradeoffs
A flag-only change is smaller but loses legitimate binding replacement and cache consistency. The bounded internal contract correction is necessary for approved continuation safety. One readiness path for all configured first work avoids duplicated Team/Org provider logic. Keeping current backend wrappers respects user scope, even though separate naming/indirection improvements remain possible.

## Risks
- Concurrent first messages and shutdown/persistence uncertainty can expose runtime-before-durability bugs; explicit tests required.
- Shared handle also serves task execution; preserve eager task candidate staging and task lifecycle tests.
- Test doubles may not model true provider activation; owner-level provider spies and real browser/server verification must complement mocks.
- First-work scope restoration makes an unused member's provider failure deferred until that member is addressed; root schema/task-package validation remains eager. Do not add new root-wide provider preflight to compensate.
- Exact user deployment/runtime not reproduced yet. Native and external runtime binding cases require coverage; lack of credentials must be reported, not faked.
- Existing base whole-repo validation failures may remain; establish current baseline and report attribution, never silently claim clean global typecheck.

## Guidance For Implementation
DS-REV-003 adds F-002 protocol/coverage below; retain completed IR-001/002 and actual F-001 acceptance. F-002 is not closed by source changes alone; preserve all API-owned tests/fixtures.
Implement only approved Team/Org restore correction and necessary binding protocol support. Do not rename Mixed/Flat classes, change schemas, repair live user data or restart shared sessions.
Required executable coverage (map outcomes to ACs):
1. Real Team/Org root materialization with stubbed AgentRun provider boundary: restore makes **zero** configured prepareNew/prepareRestore calls; full topology and Offline snapshots exist; first input starts exactly selected member. Include direct Org, mounted-Team and standalone Team, previously used and never used.
2. Same-member concurrent first work produces one candidate; later peer/human work starts only the new receiver. Existing sender/receiver authorization and task-vs-configured identity remain.
3. Matrix: native retained history, native no history, external retained history with valid binding, external no-history/null binding, existing external no-conversation non-null binding requiring checked replacement, unreadable activity and missing required binding. Error rows are supported continuation-safety tests, not new recovery scope.
4. Hold root write pending: no candidate publication/input acceptance/local binding mutation. Definite failed write aborts and can safely retry after confirmed cleanup. Expected-old mismatch rejects. Post-rename or postcommit failure is nonretryable/fail-stopped as appropriate; no rollback of committed tree or duplicated provider session.
5. Reload current tree after successful first work and continue same history. Retained task/message/attachment records unaffected; settled tasks not relaunched; existing reopen repair and new work-bearing task preparation/release still correct.
6. Preserve fresh configured Team/Org zero-work Offline behavior; real first work and task assignments retain existing lifecycle.
7. Browser validation on an isolated test-owned server: keep website open, restart that server, focus/send in a retained Team and Org; inspect backend active candidate/run counts **and** status rows before/after first and later peer input. No actual desktop launch needed for web-equivalent behavior. Do not stop user's current server or mutate their provider conversations.
Primary existing tests to extend: `tests/unit/agent-collaboration/configured-agent-activation-planner.test.ts`, `configured-agent-execution-handle.test.ts`; `tests/unit/agent-org-execution/agent-org-execution-scope-builder.test.ts`; `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`; add focused current-root binding/first-work integration cases in those owner directories as needed. Update all typed callback fixture implementations; run affected task/durability/architecture guards. Follow server AGENTS test commands with vitest run --no-watch and web test:nuxt --run. API/E2E Engineer owns independent executable coverage/realistic validation after implementation route; this document does not claim any test was executed.
Expected docs sync: current `autobyteus-server-ts/docs/modules/agent_team_execution.md`, applicable Org execution docs located during implementation, and web Team/Org behavior docs. Describe fresh AND restored configured scope as lazy, not unchanged restore eager policy. Historical done-ticket records remain intact.


## F-001 — Retained Org Recovery Protocol (DS-REV-002, Preserved)

**Current status:** implemented IR-002, reviewed ARCH-REV-002/CRR-004 and resolved in actual API-REV-002. Keep this protocol and regression coverage. Its original implementation/validation sequence below is historical; new work follows F-002/TASK-01–06 first, with F-001 preservation, not reimplementation.

### Approved basis and correction scope
SCN-001 / BEH-001,003 / REQ/AC-001–003; DS-002/005. An already used mounted or direct Agent stays focused across ordinary server restart. Once the inactive root is authoritatively inspected and its retained view hydrated, that same header, member rows and root activity must agree without refocus/reload/input. Later deliberate Send uses existing continuation. This realizes existing truthful-status/continuity intent, not a new availability, retry, provider or product policy. Team parity and IR-001 backend design remain unchanged.

### One coherent ownership path
- `AgentOrgStreamingService`: owns retained transport recovery scheduling, active checkpoint verification, socket generations and readiness/command settlement. It selects live versus inactive recovery from a validated inspection, not from errors.
- `agentOrgContextsStore`: sole publication/retention owner for focus, AgentContext identity, submissions, history activity and stream retirement. Service candidates use its existing `publish` callback; manual inspection uses the same path. History callers must not mutate its internals.
- `agentOrgRunInspection.ts` (new, in existing Org service folder): owns only network-only inspection query, GraphQL error rejection and full DTO/root identity validation. Return the existing typed Org view, not a new state enum or duplicated DTO. Store manual inspection and stream recovery both use this reader; remove the embedded duplicate query/validation from the store.
- Server inspection remains authoritative and unchanged: manager transition-gated active snapshot or validated inactive current package. Checkpoint and WebSocket remain active-only. No backend contract changes or provider startup for observation.

### DS-002/005 production sequence
1. Actual socket loss or strict stream failure follows existing fail-closed/close flow: retained context becomes `reopen_required`, old generation retires, pending command promises reject, normal bounded recovery schedules. Last-known context remains available with existing recovery/read-only presentation; unknown transport must not be converted to Offline.
2. At a transparent recovery attempt with retained context and no active socket generation, call the shared inspection reader for the exact Org. Retain `ownsOperation(null)`/released checks across every await. Task-triggered checkpoint replacement on a still-current socket retains the existing active path; a failure there flows through fail-closed into this inspection-first disconnected recovery.
3. **Validated active inspection:** do not publish its partially hydrated/live view or mark stream ready. Continue existing `reopenOwned` checkpoint-before → new socket CONNECTED → full staged snapshot → checkpoint-after/sequence-window validation → publish. Keep existing open-work logic. A root changing after inspection may make checkpoint/socket fail; retry later using a fresh inspection, not error-string classification or fresh provider restore. Historical inspection sequence0 must never be compared with a previous live generation's checkpoint.
4. **Validated inactive inspection:** clear obsolete recovery-checkpoint metadata for this attempt; stage its entire view using `stageAgentOrgExecutionContext({source:'inspection', ...})` with ownership guards. No checkpoint query and no new WebSocket for this branch. Stage conversations and activities before publication; failure or revision conflict publishes no partial candidate and remains non-ready. Root/member/tree/projection correlation is mandatory. Inactive server package has no live statuses, so staged members initialize Offline; reuse `setActive(false)` on the candidate before adoption where normalization is necessary, not an ad hoc leaf loop.
5. On successful inactive staging, preserve current selection, wrap candidate as existing shallow-reactive context, and invoke the same store `publish(candidate, commitActivities)`. The store validates identities, reconciles tracked pending message projection, commits activities, adopts existing AgentContext objects and pending focus, clears errors, and updates history activity false. Retire the service through existing `onInactive`/`markHistorical` and disconnect cleanup. Do not set stream ready or resolve readiness successfully for an inactive root. No code after the retirement callback may reopen a socket or resurrect service state. Cancel timers/clear stale recovery metadata and settle waiters with the existing non-ready/released outcome.
6. The same focused AgentContext is retained; its state now reflects authoritative historical conversation and Offline status. Org phase historical / isActive false permits only the existing configured-member `continuable` capability; task contexts remain read-only. Later Send alone performs restore → ready stream → existing exact input. No command replay or automatic Send from observation.
7. Successful history refresh (both full-tree and Org-only) also prompts the existing Org owner to reconcile *already retained* roots. This closes the missing original-personal parity path when the backend returns after the bounded stream retry window. History provides exact returned Org IDs as a reconciliation trigger, not leaf status authority. Do not infer inactivity from omitted IDs, failed queries, partial results or history strings.

### Bounded history integration, not a second recovery engine
Add `reconcileRetainedHistory(orgRunIds)` on the Org contexts store. Both successful, current-generation Org history publication sites invoke it with parsed returned root IDs. For each existing context that is `reopen_required`, and not under a local continuation/stop, request recovery from its existing service. If no service exists, reuse coalesced `openForInspection`/`readInspection` rather than creating a parallel hydrator. Do not create contexts for every history row. Historical settled contexts, ready live contexts, in-flight inspections and active local operations are left to their existing owner.
Add a small public `requestRecovery()` to the service using its existing scheduler: no-op if released, ready, a socket/generation is already connecting, or an attempt is scheduled/in flight. If a retained reopen is idle/exhausted, allow one fresh bounded recovery cycle. A successful later history refresh is the external trigger; no new poller, infinite timer, per-leaf retry or duplicate pending operation. Do not clear the visible recovery error until a valid publication succeeds. Store fallback inspection promises must be caught/reported through existing error ownership, not leak an unhandled rejection or convert successful history retrieval into false inactivity. This adapts original personal's authoritative observation → retained-owner reconciliation principle without copying nested-Team or checkpoint machinery.

### Identity, submission and stale-result safeguards
- Reuse service socket-generation/release checks, store inspection generations/selection intent and activity-content revision gates. Disconnect/stop/replacement invalidates old work before it can publish. History only calls the store boundary, never `setActive`, Agent state or service maps directly.
- No extra concurrency subsystem. Existing recovery scheduled/in-flight flags coalesce history and transport triggers. Manual inspection retires the old service; its pending recovery observes released and cannot publish. Continuation/stop suppresses history-triggered work; service readiness can still recover to fulfill the current operation under existing ownership.
- Preserve `AgentContext.requirement`, draft attachment paths and pending selection through existing adoption. Keep same AgentContext identity for matching root/address/run IDs; reject mismatches rather than reassign focus or remount.
- Store `submissions` remains the authority for pending local submission. `setActive(false)` cleanup must not accidentally clear its in-flight exclusion: after historical cleanup/publication reassert `submissionPending` for entries still tracked, until existing submit catch/finally settles them. Guard access/submission against any tracked pending entry if needed within that owner. Do not have status reconciliation resolve, delete, acknowledge or resend a submission. Socket pending rejection and existing failure/draft restoration remain responsible. Preserve submitted message identity/attachments exactly once through the existing publication merge, not a new message log.
- Errors, missing/malformed/mismatched inspection packages, authorization failures and unreachable servers all stay unknown/non-ready under existing bounded retry/error contracts. No query exception means inactive. Last-known state under `reopen_required` is not a new live-status claim; no new color/status vocabulary here.

### Clean-cut reuse/removal and interfaces
| File (relative to `autobyteus-web/`) | Action / responsibility |
| --- | --- |
| `services/agentOrgExecution/agentOrgRunInspection.ts` | Add: shared exact-root read-only query/DTO validator; no side effects, retries, store publication or new schema |
| `services/agentOrgExecution/agentOrgStreamingService.ts` | Modify: inspect-first disconnected retained recovery; stage/publish inactive using existing callback; preserve active checkpoint path; bounded public recovery trigger and stale-result cleanup |
| `stores/agentOrgContextsStore.ts` | Modify: reuse shared reader, retain sole publication/retirement ownership; expose history reconciliation; preserve tracked submission exclusion across historical cleanup |
| `stores/runHistoryLoadActions.ts` | Modify: after each successful current-generation Org history result, call Org store boundary with returned IDs; no direct leaf setters or active/inactive inference |
Remove unconditional active-checkpoint prerequisite from disconnected retained recovery; retain it for live verification. Remove duplicated embedded inspection query/validation from the store. Do not add parallel error-catching fallback hydrators, new backend endpoints, remount keys, frontend status masks, aggregation rewrites or Team historical cleanup rewrites. Existing context/hydrator/local submission implementations are reused; no change anticipated outside the four-file delta absent demonstrated necessity.
The new reader returns the existing `AgentOrgExecutionViewDto`; it rejects missing/foreign envelopes using `RootExecutionViewDtoSchema`. `requestRecovery():void` schedules existing work only. `reconcileRetainedHistory(readonly string[]):void` owns scheduling/reporting only. No optional callback fallback is introduced.

### Persisted state and task policy
F-001 persisted state is **Not Affected**; the cumulative backend design remains **Directly Usable — No Migration**. The inspected server method validates current tree/task/message stores under the existing transition gate; it does not run restore/task repair. Existing projection readers supply conversation and attachment references. Runtime active checkpoint contract remains strict. No format, version, path, reset, data scan, task-settlement, provider binding or release change.

### Required durable coverage and implementation sequence
Implementation Engineer acknowledged hold and reports no F-001 edits/tests/commits; preserve IR-001 and incoming API work. CRR-002 assignment is superseded, not duplicated; dependent work resumes only after revised design review. Add a durable failing retained-recovery test before correction, reusing reviewer diagnostics as evidence but not counting their reproduction assertions as acceptance. Then extract the shared reader, implement disconnected recovery branching/retirement, wire bounded history trigger and verify preservation. Retain active checkpoint tests and all IR-001 readiness tests. Synchronize current Team/Org behavior docs with verified recovery behavior; do not rewrite historical evidence.

| Test obligation | Boundary / observable result |
| --- | --- |
| RET-01 / F-001 / SCN-001 | Real streaming service + Org store + context/hydrator + mounted Team header; mock only Apollo/socket/time boundaries. Begin ready with same focused used worker Idle, close socket, return inactive inspection + projections. Same AgentContext/header/rows Offline, root historical, configured continuation available, identity/history/draft retained; no refocus/reload/Send, no checkpoint/new socket on inactive branch. Include direct Org placement. |
| RET-02 / active recovery | Valid active inspection followed by before/after checkpoint and stream snapshot preserves existing window/open-work/sequence/correlation tests; inspection alone never authorizes live commands. Active→inactive change during recovery retries into inactive branch without string parsing. |
| RET-03 / unknown | Failed, missing, malformed, foreign-root inspection and projection failure do not publish inactive/live readiness; bounded error and read-only retained state remain. No provider/restore call. |
| RET-04 / history parity | Exhaust original retry window, then successful current-generation full and Org-only history refresh; retained recovery runs without selection. No duplicate loop for scheduled/in-flight work. Failed/stale/partial history does not classify inactive; absent rows do not close contexts; root inspection determines actual state. No context allocation for unretained rows. |
| RET-05 / ownership | Late inspection/projection after disconnect, manual selection or stop cannot overwrite current owner. Publication adopts same AgentContext and latest focus; drafts/attachments and tracked pending submission remain owned, settle once and are never replayed. Activity revision conflicts fail closed. Current controlled timing cases exercise existing gates, not a new concurrency feature. |
| RET-07 / standalone Team parity | Same kept-open Team worker before/after test-owned restart must reconcile header/member and truthful root activity after authoritative observation without refocus/input, preserve identity/drafts and normal terminal Error policy, keep providers unstarted, then continue correctly on deliberate Send. Verify failed history does not falsely clean status and strict active-recovery safeguards remain. Existing source has this reconciliation route; supplied API worker headers are Offline. No Team production change assumed; B02 still requires complete validation. |
| RET-06 / actual acceptance | API/E2E keeps actual mounted-worker browser focus across test-owned restart. Before refocus/input, wait for verified recovery: same header/row Offline, root Stopped, no exhausted error after success, backend active/pending/candidates/events empty. Later explicit Send resumes exact conversation and starts only required member. Repeat direct placement and keep standalone Team parity checks. This test must not merely invoke setActive(false). |

Extend existing `services/agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts`, `stores/__tests__/agentOrgContextsStore.spec.ts` and history-load tests; add an integration-style retained-recovery spec in the existing web test directories using real context/hydration/store/header. Add reader unit coverage if needed. Use test:nuxt --run; do not run user's server. Implementation-scoped tests are not the API live acceptance.
API must recheck F-001 first after revised design, implementation and source review, then finish B02–B04: actual native continuation, bound-empty replacement, duplicate/replay/uncertainty, task repair/settled/new task once-release. Previously successful real Codex identity/attachment evidence remains supporting evidence, not a full Pass. Missing execution is not automatically a new defect. No Designer tests or browser reruns claimed.

### Tradeoff and remaining risk
An extra read-only inspection during disconnected recovery costs a query but uses an already-authoritative inactive-capable contract; it avoids a new liveness API or weakening active checkpoint/stream admission. Full staging preserves coherent conversation/activity publication rather than patching only the status header. History-triggered retries reuse the existing bounded owner and do not promise unlimited availability while unreachable. Publication/race/pending-submission preservation requires review and durable tests. Earlier ARCH-REV-001/CRR-001 passes did not cover this missing branch; they do not approve DS-REV-002.

### Standalone Team disposition after user parity request
**API-REV-002 clarification:** a normal Team WebSocket resolves/restores its container via TeamRunService.resolveActiveTeamRun202–206; the root may correctly be Active with every member provider Offline. Preserve this existing behavior, not force root Stopped. F-002 concerns task tool projection, not this root lifecycle.
AINV-011 finds Team's successful history reconciliation already marks the retained root inactive and cleans the same leaf contexts independently of live checkpoints. Supplied API DOM shows Offline on the retained worker in both restart snapshots; the same Org F-001 false-Idle header is not established for Team. Its checkpoint recovery remains active-only, so this is not a claim that every recovery situation is identical or defect-free. Retain current Team implementation and error-preservation semantics; require RET-07 and complete B02. Any actual approved Team failure returns on evidence for a proportionate correction rather than a speculative shared reconnect rewrite.

## F-002 — Historical Content and Current Tool Decisions (DS-REV-003, Mandatory)

### Scenario, approved intent and boundary
Supported ordinary manual task completion under preserved REQ/AC-003,005 and Team004: user approves lead's delegate_task through the frontend, remains focused on lead while the assigned worker requests submit_task_result, then selects that new task and approves/denies its pending tool. Auto-start uses recipient autoExecuteTools unchanged; manual=false is not silently changed. F-001 stays resolved. This is an extension of the authoritative technical preservation design, not new product policy or a new requirement ID.
DS-007 spans actual creation, exact unfocused delivery, selection/hydration, rendering, command and ordinary settlement—not just the edited mapper. The correction addresses the confirmed erasure mechanism. Actual pre-selection frame delivery in the two API failures was not captured; acceptance must observe it as specified below. No new server pending-decision store/endpoint or transport policy is justified by that uncertainty alone.

### Ownership and data authority
- Agent runtime emits tool lifecycle; existing stream/handler updates the exact AgentContext and per-run Activity. Team is a routing/container boundary, not a new tool-status owner. The task's current tool state remains on the Agent, not a Team approval registry.
- `teamMemberProjectionHydrationService` owns exact content hydration and its guarded publication. It must compose historical content with current retained tool state before commit. The existing authoritativeContexts marker means content has been hydrated; it must not mean history overrides every live control detail. Rename local comments/variable to content-oriented wording if necessary, but no public authority API rename is required.
- New pure `teamMemberToolStateReconciliation.ts` in the same runHydration folder owns only detached candidate reconciliation for that hydrator. It receives current and projected conversation/Activity for one exact run, returns reconciled existing shapes. No Pinia calls, subscriptions, commands, persistent map, event replay or new lifecycle enum. The hydrator remains the only publication owner.
- Historical projection supplies retained text, attachments, system instructions and other content within existing recent-window contracts. An incomplete parsed tool is evidence of a call, not evidence that no permission is pending. Current observed awaiting-approval/approved/executing state must not be downgraded by it. Explicit terminal outcome from either source must not be made pending again. Use `isTerminalToolInvocationStatus`, not a generic max-rank merge (live executing→awaiting is supported).

### Applicability and guarded sequence
1. Existing inspect-before-focus remains. ExactMountedContext validates same root, AgentRun and containing Team/address; keep selection-intent, presentation/activity revisions, coalescing and MAX_CONFLICT_ATTEMPTS unchanged. Do not skip hydration merely because the Agent has live content: this reintroduces blank/incomplete task monitors.
2. At each attempt capture current presentation/activity revisions and whether this is the same live member in an active, non-recovery Team with a ready stream (existing `useAgentTeamRunStore().isTeamStreamReady(root)` boundary plus view live-member identity). Do not equate AgentStatus Running with stream authority. Query/build historical conversation/Activity exactly as now, without side effects.
3. After the await revalidate exact mounted identity, selection and revisions plus the relevant member/root/readiness applicability. If that live applicability changes during the attempt, do not commit that candidate as though the initial live authority survived; return the existing conflict/superseded result for retry or existing failure. Do not restore scope, attach a socket or add an epoch/poller solely to hydrate. Normal retired/historical inspection still loads content; it does not carry forward actionable live state from an inactive/disconnected context.
4. When applicability and revisions remain valid, read current tool segments/Activity from that same AgentContext and stage the reconciled candidate synchronously. These are current model values already established by handlers; do not query the Team tracker as a competing state authority. Never require a non-null approvalTarget or turn ID: current parser legitimately sets target null, and exact target is supplied by existing Team command path. Preserve optional metadata where present, do not fabricate it.
5. Complete all reconciliation validation before `replaceProjectionActivitiesIfRevisions`. Commit returned activities through that existing check, then conversation, earlier-trace flag, presentation revision/baseline and content-authoritative marker exactly as the current synchronous section. No await, external callbacks or mutating lifecycle-handler replay between guards and commit. Any failed query/identity/selection/revision/reconciliation check leaves existing conversation/Activity/control state unmodified. Reuse existing bounded retries; no partial promotion to authoritative.
6. Selection commit follows completed content hydration. Same AgentContext, draft and config stay retained; only conversation/Activity candidate changes. Existing stream remains attached and normal later tool lifecycle events update the reconciled exact invocation. Existing ToolCallIndicator renders controls and existing store/service submits the exact selected AgentRun/invocation. Do not create a new Activity approval UI or auto-send/approve from reconciliation.

### Narrow reconciliation rules (one decision applied to both views)
Correlate by the already-validated AgentRun plus exact invocationId, never tool name/address alone or synthetic `history-*` similarity. Work on copied candidate structures; do not mutate Vue live objects during preparation. Reuse `ProjectableToolSegment`/ToolActivity and current clone/build conventions; avoid structuredClone directly on reactive proxies.
- Projected history remains the base for all non-tool content. Collect retained current tool lifecycle segments whose status is beyond parsing/parsed; these include pending approval and its later approved/executing/terminal outcome. Do not turn a current or projected parsed tool into awaiting-approval just because autoExecuteTools is false.
- For an exact matching invocation, if projected conversation or Activity contains an explicit terminal outcome, never replace it with a nonterminal current pending state. If current is terminal and projection nonterminal, preserve current terminal outcome. Agreeing terminal outcomes retain available results/logs; contradictory explicit terminal states or conflicting concrete invocation/tool identity reject the candidate before any publication, rather than silently revive a permission. Placeholder names can be completed using existing conventions; no cross-run borrowing.
- With no terminal evidence, retained current advanced tool state wins over historical inferred nonterminal content, including a legitimate late awaiting-approval after executing. Preserve its actual tool type/arguments/status, optional stream identity/approval target and current logs/result/error fields rather than changing only a CSS/status label. Historical fields may fill missing descriptive content, but cannot overwrite approved arguments or regress lifecycle. Do not use terminal conflict checks to infer a new runtime defect; they are safe candidate rejection at this boundary.
- If the current advanced invocation is absent from the historical candidate (history window/source lag), retain one copied tool segment in a tool-only AI message using the existing source timestamp/metadata, or merge into an unambiguously corresponding existing message. Do not copy an entire live conversation over history or duplicate its text/user inputs. Keep exactly one reconciled tool per invocation in conversation and one Activity entry; preserve deterministic ordering and existing recent-window policy. Ambiguous duplicate candidate tool entries must be safely normalized only when equivalent, otherwise reject, not arbitrarily pick a pending card.
- Build the corresponding Activity from the same selected tool state. Prefer existing matching Activity descriptive data, fill missing representation via existing pure projection builder and copy only actual optional routing data; keep its lifecycle/result/error consistent with the conversation. This must also work when only one current presentation retains the entry due to existing windowing. An Activity-only entry may contribute only its actual advanced state for the same validated live run; parsed Activity cannot synthesize permission. Preserve projected non-tool activities. Use normal store replacement so awaiting indicators and retention are recomputed consistently.
- Do not create a second pending-decision cache. The transient maps used to reconcile one detached candidate do not outlive the attempt. Readiness/listLive applicability ensures history-only retired contexts are not made actionable by copied obsolete decisions. Controls remain subject to existing exact command/backend admission; visual presence alone is never authority to bypass the backend.

### Concrete examples
History has submit_task_result(inv-X) Parsed; current same live task has inv-X awaiting-approval before selection → content hydrates, one inv-X card and Activity remain awaiting-approval, normal frontend Approve targets inv-X in that task. Current inv-X approved/executing/denied/success must not revert to pending from an older projection. History shows explicit success while current still awaiting → final presentation is terminal, no resurrected approval. Historical parsed call with no received live decision stays Parsed; no new Approve button guessed from it.

### Change inventory, dependencies and removals
| Path relative to `autobyteus-web/` | Action / responsibility |
| --- | --- |
| `services/runHydration/teamMemberProjectionHydrationService.ts` | Modify: same-run live-applicability checks through existing Team view/run-store boundary; compose detached historical/current tool candidate; existing guarded atomic publication/content authority remains |
| `services/runHydration/teamMemberToolStateReconciliation.ts` | Add: pure exact-invocation reconciliation of existing conversation/Activity shapes; explicit terminal/pending policy, no stateful coordinator |
No production change intended to toolLifecycleHandler, Activity store, ToolCallIndicator, stream tracker/transport, provider approval, task config/engine, Org hydration or historical projection schema. The hydrator may call the run-store public readiness query only at invocation time, not module initialization or service-map internals; do not introduce module-init Pinia access. Existing callable import cycles must remain safe and be checked by tests/build. If that dependency cannot be accommodated, return a design finding rather than exposing a new backend readiness abstraction.
Replace the unconditional live-tool erasure at candidate publication; do not retain it behind a feature flag. Do not remove exact history hydration, selection guards, current projection builders, or normal lifecycle handlers. No global history mapper rewrite and no new always-auto policy. Same path also serves configured Team members; regression cover their retained content/decisions. Org uses staged whole-root contexts rather than this first-member selection path, so no speculative Org merge change is included.

### Persisted data, classification and sequencing
**F-002 persisted data Not Affected.** Current metadata/trace projection schemas and existing readers remain; only client candidate composition changes. No migration, reset, new field/registry, pending-command protocol or F-003 dedupe machinery. Cumulative design remains Medium/High: two-file local delta inside existing hydration capability, high risk because pending permission/terminal semantics and guarded publication are material interaction contracts. Content volume is not the risk basis.
Preserve IR-001/002. First add durable failing manual-before-selection regression using actual relevant owner boundaries; then implement pure reconciliation and hydrator integration, retain during-query guards/control tests, check existing blank-monitor/terminal/retired/auto paths, and source review. API then verifies F-002 through frontend with actual frame observation and preserves F-001 before remaining B02–B04. No speculative changes for incomplete cases.

### Required executable evidence (DS-007, REQ/AC-003–005)
| Case | Required boundary / outcome |
| --- | --- |
| TASK-01 manual-before-first-focus | Real Team run/context store, TeamStreamingService, view task activation, dispatcher/handlers, member inspection/selection, hydrator, Activity and ToolCallIndicator. Mock only external transport/query/time. Parent stays focused; emit exact task approval, then select through inspection. Historical parsed projection must not erase one pending card/Activity. Click visible Approve, assert exact task AgentRun/invocation command once. No direct ensure-only or status-setter test as substitute. |
| TASK-02 ordering/content | Approval after first hydration control; approval during fetch forces existing retry, and retry preserves it when present before next capture. Empty preexisting shell still loads complete historical content. Projection missing current tool retains it without text duplication. Existing system/attachment/activity content and draft/selection identity preserved. |
| TASK-03 outcomes/manual/auto | Denied, approved, executing, success/error/interrupted before or during query cannot be downgraded or duplicate execution; projected terminal beats current pending; late live executing→awaiting remains valid; no live pending + parsed history never creates approval. AutoExecuteTools=true normal task progresses without manual controls. Exact manual mode remains false. |
| TASK-04 guards/applicability | Retired/inactive/disconnected contexts do not gain live commands. Stale selection/replaced root/changed address/run/revision and readiness loss prevent stale publication. Activity conflict leaves both existing surfaces intact. Configured Team member and existing terminal history tests remain. No dependency initialization regression. |
| TASK-05 actual frontend acceptance | Test-owned real manual Team: frontend Send asks lead delegate_task → visible parent Approve → remain on parent until task's actual pending submit request → record exact inbound frame/owning pre-selection state → select task → visible Approve/Deny → click Approve → exactly one submission/awaiting_review → ordinary frontend review/settlement. Repeat with second task and already-hydrated control; verify configured worker setting unchanged. Backend sidecar/trace corroborates, cannot substitute for UI. |
| TASK-06 remaining attribution | Record test-owned frame/dispatch/pre/post-hydration state for exact task/invocation. If original source mechanism is not traversed or request never arrives, isolate producer→root egress→transport→dispatch boundary and route concrete finding; do not manufacture approval or claim proven transport safety. No production telemetry subsystem needed. |
| Preservation | F-001 actual direct/mounted kept-open recovery and recipient-only continuation; Team Offline providers/possibly Active restored container; full remaining frontend native, bound-empty, pending input/no replay, uncertainty and task repair B02–B04. Existing API native integration and diagnostic settlement not equivalent frontend completion. |
Extend existing hydration/stream exact-address/inspection tests and add a focused real retained task inspection/render integration test (test:nuxt --run). Reviewer crr005 probe is diagnostic inspiration, not a passing acceptance assertion to copy unchanged. Update long-lived current task-monitor docs with history/current-control distinction, not a claim all personal versions identical.

### Residual uncertainty and prohibited shortcuts
Original actual pre-selection frame missing: known source defect can be designed without inventing the frame; final closure requires new real evidence. No inference of absent credentials, no task always-auto switch, no Approve-for-every-Parsed rule, no new Activity controls, no blind Aug30 revert or Sep11 copy, no schema/pending-registry/backend rewrite. Earlier blank-monitor hydration fixed a real problem and stays. F-001 actual resolution stays. Any truly changed intended behavior needs renewed approval; this design preserves existing manual/auto/task behavior under SR-005.
