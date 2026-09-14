# Design Spec — Lazy configured-member restore for AgentTeam and AgentOrg

## Solution And Approval Basis
- Package: AORG-FOLLOWUP-20260914-001; design revision DS-REV-001; current solution revision SR-007.
- Design status: **Ready**. Result: **Architecture Design Complete**.
- Approved requirements: SR-005, REQ-001–005 / AC-001–005 / BEH-001–005 / SCN-001–004 in `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/requirements-doc.md`.
- User approval: “Yeah, I approve” of SR-004 Org basis, plus same-message direction to fix Team too if affected (condition confirmed by INV-R06). User subsequently says “We should fix the problem now. You're ready to go.” No changed intended behavior in this design.
- Source/workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up`, branch `codex/flat-agent-organization-model-follow-up`, base `origin/requirements/flat-agent-organization-model` at 72dee5ad2c2e332272a0c00eb36af1a036bd69fb.
- This is a child correction on an **unreleased feature branch**. Finalization target after delivery gates is `origin/requirements/flat-agent-organization-model`, not personal. No release/deployment or current-data reset authorized.
- Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/investigation-notes.md` (INV-R01–07, AINV-001–006).
- No Product/behavior-defining supplement. Historical reviews of the base do not review this design; current independent review artifact is N/A — not yet produced.

## Current-State Read
Fresh configured creation is already lazy. Restore loads the strict Team/Org package but then eagerly prepares all configured runtime candidates: direct Org Agents through their registry, mounted Teams and standalone Team through the shared flat factory. The first focused Send therefore activates unrelated members; their actual Idle status is rendered green.
Original-personal source at 5645b49d6 separates root restoration from member readiness. The unreleased refactor's eager policy, later corrected only for fresh creation, causes the regression. This is not a naming defect.
The existing on-demand member handle already selects new/native-restore/external-restore based on current conversation state, serializes concurrent readiness and publishes only after binding acceptance. However its lazy binding callback discards the checked no-conversation replacement discriminator; the eager assembly handled that case separately. Moving all configured restore readiness to first work must preserve this real, current development-run case.

## Task Size And Architectural Risk (Mandatory)
- `task_size`: **Medium**. Bounded correction across existing Team, Org and shared Agent-execution owners; 14 production files plus focused tests/docs. No new subsystem, provider backend, UI surface, schema or bulk conversion.
- `architectural_risk`: **High**. Activation timing and a shared internal binding-commit contract change; first-work provider identity persistence, concurrency, and post-durability failure behavior require independent review. High risk is not based on release status or the amount of historical evidence.
- Payload surfaces: ticket/docs and test fixtures only. Structural surfaces: root assembly switches, readiness planner/handle, callback types, root binding commit, local runtime binding cache.
- Escalation: any new storage shape, migration/reset, provider-specific recreation policy, task activation/settlement change, cross-root routing, or broader frontend fix returns to Solution Designer; new intended behavior requires renewed approval. Do not silently broaden this design.

## Architecture Investigation Evidence
| Evidence | Exact source relative to repo | Supports | Limit |
| --- | --- | --- | --- |
| AINV-001 | `autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts:92-101`; Org registry/directory; flat factory | Separate configured assembly from readiness; preserve task preparation | Source, not live test |
| AINV-002 | `agent-collaboration/execution/backends/configured-agent-activation-planner.ts`; `configured-agent-execution-handle.ts:234-241` | Preserve replacement metadata at first work | Full paths indexed in canonical notes |
| AINV-003 | Team/Org root adoption methods, persistence coordinators and checked replacement mutators | Reuse current root durability boundaries | No new transaction store |
| AINV-004 | `flat-team-execution-context.ts`; handle readiness lock; Org operation gate | Strict local cache update, current-binding planning, failure/stop sequencing | Execution validation required |
| AINV-005 | Team V2/Org V1 stores/loaders, current persisted test fixtures | Direct reuse, no migration | User installation volume unmeasured; no bulk operation needed |
| AINV-006 | complete production callback/caller search, browser composers, test inventory | Bounded delta and realistic validation matrix | No tests run by designer |

## Intended Change
1. Reconstruct/admit the full configured Team/Org scope with every configured Agent unstarted on both fresh creation and restore. Keep the input mode `restore` for resumed contexts; never pretend an existing conversation is fresh.
2. Let existing exact-member input/command admission invoke the shared readiness handle only when work actually needs that Agent. Unrelated configured members remain genuinely Offline, irrespective of old history or bindings.
3. Carry the planner's complete discriminated binding change to the owning root and commit it before runtime publication or accepted input. Existing no-conversation replacement remains available **at first work**, with expected-old checking; no old-version compatibility mechanism is added.
4. Preserve task preparation/release, loader task-reopen repair, exact identities, current context/history, provider selection, fresh behavior and status projection. No frontend status masking or backend renaming.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Kind | REQ / AC | Approved trigger | Existing evidence | Target / spines |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | 001 / 001 | SCN-001 Org focused Send after server restart | INV-R01–03 | DS-002 → DS-004 → DS-005, only recipient readies |
| BEH-002 | User/System | 002 / 002 | SCN-002 subsequent legitimate human/peer message | AINV-001 | DS-003 → DS-004, unrelated recipients remain lazy |
| BEH-003 | Contract | 003 / 003 | Continuation/accepted input under SCN-001–004 | AINV-002–005 | DS-004 and existing task protocol, preserve history and exact provider semantics |
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
- Refactor needed now: **Yes, bounded**. Correct three scheduling entrypoints and tighten the existing shared binding callback so lazy continuation can express the same safe replacement already handled eagerly. Do not add a second planner/persistence owner or per-root ad hoc provider policies.
- Existing owners remain correct: root owns durable identity/tree, shared handle owns provider readiness, planner owns conversation-based decision, local context owns cached runtime binding.
- Deferred: Mixed/Flat naming and forwarding-wrapper simplification per user. Residual readability overhead is independent of this bug and does not prevent correct lifecycle behavior.

## Terminology
Configured Agent = persistent member of Team or direct/mounted member of Org. Scope admission = validated root/membership/history available for routing. Runtime readiness = actual AgentRun/backend prepared and published. Replacement = existing current-format no-conversation binding replacement, not migration of released data. A task Agent/Team already has assigned work; it is not an unused configured member.

## Design Reading Order
Read evidence/current state and intended change, then behavior map, DS-001–006 and binding protocol, then file/change inventory and validation. Tables reuse the same owner map rather than proposing additional layers.

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
| DS-002 | Primary end-to-end | 001,003 | Org retained composer → selected member response | Org root, includes mounted-Team/direct placements |
| DS-003 | Primary end-to-end | 002 | Legitimate peer/human input → another member response | Existing subject routing and shared readiness |
| DS-004 | Bounded local | 001–005 | Agent readiness request → durable binding → runtime publication/input | Shared handle + root commit; protects continuation |
| DS-005 | Return/event | 001,002,004,005 | Agent runtime/status → root stream → exact frontend row | Existing projections, truthful Offline/Idle |
| DS-006 | Preserved primary | 005,003 | Fresh launch or real task assignment → existing work lifecycle | Root assembly/task lifecycle, no task scheduling redesign |

## Primary Execution Spine(s)
- DS-001: retained Team composer → RestoreAgentTeamRun → Team manager/package loader → root materializer (no configured readiness) → exact-member Send → Team local handle → DS-004 → provider response.
- DS-002: retained Org composer → restoreAgentOrgRun → Org manager/package loader → full scope builder (no configured readiness) → exact direct/mounted member Send → shared handle → DS-004 → provider response.
- DS-003: existing authenticated logical/exact recipient command → subject-owned resolver/admission → configured member input reservation → shared readiness → existing accepted-message commit/release → response. No receiver-active precondition may be added for configured members just to avoid laziness.
- DS-006: fresh root config/launch → existing full-scope assembly → no configured worker start → first selected input follows DS-004. Real task assignment continues existing prepare → durable task publication → releaseWork; settled tasks are not restarted.

## Spine Narratives (Mandatory)
DS-001/002 load and validate the whole root and existing recovery state, admit routing structure and expose Offline statuses without contacting every member's provider. The selected input then takes the existing member path; no provider session is created merely to populate a snapshot. DS-003 reaches other configured Agents using ordinary supported commands, retaining authorization and exact placement. DS-004 chooses correct continuation, persists the binding decision under the subject root, then publishes the candidate and accepts input. DS-005 reports resulting per-Agent status without changing untouched members. DS-006 preserves fresh and task behavior rather than sharing an accidental global "disable activation" switch.

## Spine Actors / Main-Line Nodes
Existing Team/Org composers (input/focus), subject manager/loader (root restore), scope builder/materializer (configured assembly), subject root (routing/identity/durable state), configured handle/planner (one runtime readiness), AgentRun/backend (provider execution). No new main-line service.

## Ownership Map
| Owner | Owns | Must not own |
| --- | --- | --- |
| Team/Org root assembly | Validate/create structural scope, mode, registration | Prepare every unused runtime |
| ConfiguredAgentExecutionHandle | One readiness attempt, candidate lifecycle, committed binding cache | Write root files or choose root family by guessing |
| ConfiguredAgentActivationPlanner | Decide new/restore/checked replacement from actual activity | Admit scope or persist/change authoritative tree |
| RootTeamRun / AgentOrgRun | Apply exact binding change against current tree through existing serialized persistence | Call providers while holding tree persistence queue |
| FlatAgentExecutionContext | Strict committed local binding cache | Authorize replacement or override durable tree |
| Existing task engine | Task preparation/records/release/settlement | Be rewritten as unused configured readiness |

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
DS-005: handle/AgentRun publishes existing status/event → Team or Org root publisher → existing execution view/stream → exact member context → existing status dot. Unprepared configured handles report Offline. Green continues to mean actual Idle. No synthetic all-Offline override based on message count; members doing peer/task work remain truthful. Existing frontend restore/reconnect/focus/hydration is reused and independently checked in browser validation.

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
Reuse planner, candidate registry, task staging, activity inspector, current subject mutators/stores, root persistence locks, error classes and status projections. Extend callback semantics/current-binding input only. No new subsystem or runtime owner is needed.

## Subsystem / Capability-Area Allocation
Shared collaboration execution owns binding-change value and single-Agent readiness. Team local execution owns configured member construction and local cache. Standalone Team/Org root owners own scope assembly and durable binding commits. Frontend owns existing focus/projection; only tests or narrowly required corrections supported by failed approved ACs, not a redesign.

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
No new production folder/class required. Existing factory/manager/prepared result APIs used by task execution remain; update only type imports if compiler requires, no behavioral default change. Tests and long-lived docs are additional artifacts, not new production owners.

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
