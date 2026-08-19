# Design Spec

## Current-State Read

The AgentTeam universal-delegation refactor introduced `TeamExecutionViewState` as the canonical owner of the Team execution tree, focused AgentRun identity, and member `AgentContext` registry. That owner and its public getters are the correct boundary. The local defect is inside `associate()`: the registry is shallow-reactive, the nested `AgentContext.state` is converted to a Vue proxy, but the top-level `AgentContext` inserted as the registry value remains raw.

Shared composer consumers correctly rely on the active owner to provide an observable `AgentContext`. Standalone Agent contexts satisfy that contract through Pinia; Team contexts do not. As documented by `BEH-001`–`BEH-005`, this produces one split state object: conversation/status updates react, while `requirement`, `contextFilePaths`, and `submissionPending` mutations remain invisible until an unrelated dependency invalidates the UI. The existing text, voice, attachment planner, Team streaming, backend member-input, event projection, and rendering modules remain healthy and constrain the target to a local owner correction.

## Intended Change

Complete the existing Team context association invariant at its sole owner:

1. keep the current conversion of `entry.agentContext.state` before association because snapshot validation can retain and later mutate the planned raw context's nested state;
2. create one Vue reactive proxy for the whole `AgentContext` after that nested-state conversion;
3. store that proxy—not the raw context—as the canonical value in `contexts`;
4. continue returning the stored value through every view getter/list method;
5. apply the same `associate()` path to initial, snapshot-discovered, and task-event-discovered members.

No public API, data model, wire contract, component, voice service, backend service, or event type changes. Durable tests will observe the real view-associated proxy through computed/shared-store consumers and will preserve focused contract tests for attachment transport.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | `REQ-001`, `REQ-005`, `REQ-006`; `AC-001`, `AC-005`, `AC-007` | Enter/Send on focused AgentTeam member | Investigation `BEH-001`; real-view probe | Local event, text clear, and pending state become observable from one associated context; pre/post-admission behavior preserved | Composer -> active facade -> Team send owner -> local submission -> reactive Team context -> composer/event monitor (`DS-002`, `DS-001`) |
| `BEH-002` | User | `REQ-002`, `REQ-005`, `REQ-006`; `AC-002`, `AC-005`–`AC-007` | Successful Speak/Stop transcript for captured Team member | Investigation `BEH-002`; unchanged voice store | Existing captured-context mutation becomes visible; no auto-send or voice behavior change | Voice result -> captured Team context -> active facade mutation -> reactive requirement -> composer (`DS-003`, `DS-001`) |
| `BEH-003` | User | `REQ-003`, `REQ-005`, `REQ-006`; `AC-003`, `AC-005`–`AC-007` | Remove/Clear all in Team attachment tray | Investigation `BEH-003`; real-view probe | Visible projection and authoritative member attachments remain equal after successful mutation; delete-failure retention preserved | Tray -> attachment composer -> reactive member attachments -> computed tray (`DS-004`, `DS-001`) |
| `BEH-004` | User / Contract | `REQ-004`–`REQ-006`; `AC-004`–`AC-007` | Team send with retained or removed attachment | Investigation `BEH-004`; 24 passing focused web/server tests | Existing retained attachment path preserved; removed state is no longer visually misrepresented | Team composer -> Team send -> finalizer/planner -> Team stream -> server ContextFile/event -> event monitor (`DS-005`, `DS-004`) |
| `BEH-005` | User | `REQ-005`, `REQ-006`; `AC-006`, `AC-007` | Standalone Agent send/voice | User comparison; Pinia ownership evidence | Preserve unchanged; no standalone production files need modification | Standalone composer -> active facade -> standalone run owner -> Pinia context -> composer (`DS-006`) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-agent-input-controls-regression/tickets/in-progress/electron-agent-input-controls-regression/ui-ux-spec.md` | Approved Team composer interactions and visible states | `REQ-001`–`REQ-006`; `AC-001`–`AC-007` | Defines observable outcomes each spine must produce | Approved by user on 2026-08-18 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-agent-input-controls-regression/tickets/in-progress/electron-agent-input-controls-regression/design-use-case-validation.md` | Static design self-validation across every approved journey | `REQ-001`–`REQ-006`; `AC-001`–`AC-007` | Demonstrates spine span, state owner, identity, and proof coverage | Design evidence; approval `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No`
- Root cause classification: `Local Implementation Defect`
- Refactor needed now: `No`
- Evidence: `TeamExecutionViewState` already provides one canonical Team aggregate and one association function for all member origins. Shared input modules use a thin active-context facade and have a working standalone implementation. The defect is one omitted top-level proxy conversion, confirmed by executable dependency-tracking evidence.
- Design response: complete the association conversion once and validate the behavior through real associated contexts.
- Refactor rationale: no ownership, API, identity, file placement, or subsystem change is required. Creating a Team-only composer store or moving composer policy out of `AgentContext` would duplicate working shared behavior.
- Intentional deferrals and residual risk: none for the reported behavior. Packaged Electron validation remains a downstream execution choice, not an architectural gap.

## Terminology

- **Associated Team context**: the canonical reactive `AgentContext` proxy stored by `TeamExecutionViewState` for one exact AgentRun ID.
- **Raw context**: the `AgentContext` instance supplied to association before Vue proxying.
- **Local admission**: `beginLocalUserSubmission` appending the optimistic user event and resetting the composer before transport completes.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no historical runtime path exists in scope. Replace raw Team registry values with associated proxies cleanly.
- Do not retain a raw-versus-reactive branch, compatibility wrapper, fallback invalidation counter, or dual Team composer state.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: none; the affected fields are live frontend session state on one `AgentContext` per Team AgentRun.
- Relevant code-model, serialization, semantic, or physical-store change: none; proxy ownership changes only Vue observation.
- Normal reader/writer behavior and representative evidence: existing shared stores/components already read/write the fields; raw values mutate correctly in the probe.
- Required semantics and invariants under direct use: unchanged values, identity, and attachment shapes; only reactive visibility is restored.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: production profile remains untouched.
- Decision: `Not Affected`.
- Decision rationale: there is no persisted representation or transformation benefit, so migration I/O and rollout mechanics are inapplicable.
- Acceptance criteria or design constraints supported by this decision: `AC-001`–`AC-007`; no schema/migration changes are permitted by this design.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Bounded Local | `BEH-001`–`BEH-004` | Validated initial/snapshot/task member entry | Canonical reactive member context in registry | `TeamExecutionViewState` | Establishes the one invariant that repairs every Team composer symptom |
| `DS-002` | Primary End-to-End | `BEH-001` | AgentTeam textarea Enter/Send | Cleared composer plus one locally admitted event/pending state | Team run submission flow, using Team view as state owner | Spans the actual reported send journey, not only proxy creation |
| `DS-003` | Return-Event | `BEH-002` | Successful voice transcription result | Visible merged draft on captured Team member | `voiceInputStore` for capture lifecycle; Team view for target state | Proves the existing async return targets observable Team state |
| `DS-004` | Primary End-to-End | `BEH-003` | Team attachment remove/Clear all control | Visible-authoritative attachment equality | Attachment composer using Team view-owned state | Covers both successful mutation and existing delete-failure retention |
| `DS-005` | Primary End-to-End | `BEH-004` | Team send with retained/removed attachment | Correct wire payload and submitted event representation | `agentTeamRunStore` for submission sequencing | Separates transport preservation from the stale tray defect |
| `DS-006` | Primary End-to-End | `BEH-005` | Standalone Agent text/voice action | Existing visible clear/transcript behavior | Standalone Agent run/Pinia context owners | Explicit no-regression comparison |

## Primary Execution Spine(s)

- `DS-002`: `AgentUserInputTextArea -> activeContextStore -> agentTeamRunStore -> beginLocalUserSubmission -> TeamExecutionViewState-associated AgentContext -> textarea + event monitor`
- `DS-004`: `ContextFilePathInputArea -> useContextAttachmentComposer -> associated Team AgentContext.contextFilePaths -> displayedItems computed -> attachment tray`
- `DS-005`: `AgentTeam composer -> activeContextStore -> agentTeamRunStore -> attachment finalizer/planner -> TeamStreamingService -> server Team stream handler -> member-input event projector/handler -> UserMessage`
- `DS-006`: `Standalone composer -> activeContextStore -> agentRunStore/voiceInputStore -> Pinia AgentContext -> standalone composer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Each validated Team member enters one association function. Nested state remains proxied for raw planned-state writes; the complete context is then proxied and stored as the canonical registry value. | member entry, AgentContext, AgentRun ID registry | `TeamExecutionViewState` | Vue proxy conversion, validation |
| `DS-002` | Shared input resolves the exact focused Team context, submission admits one local event, and clearing/pending mutations flow through the stored proxy so both composer and event monitor react. | draft, local user message, pending state | Team submission flow + Team view | history presentation and attachment finalization stay unchanged |
| `DS-003` | Voice capture retains its existing target context. The successful transcript writes through the active facade to that proxy; member focus determines when it is visible, not where it is stored. | captured member draft, transcript | voice lifecycle + Team view | Electron transcription and toasts stay unchanged |
| `DS-004` | The existing attachment composable commits a new collection into the target proxy. The computed display invalidates from that collection and matches successful or failed deletion outcome. | Team member attachment collection | Team view | upload/delete API and previews stay unchanged |
| `DS-005` | Authoritative attachments are finalized and split into existing image/path fields, become server ContextFiles, and return as the existing member-input event attachment projection. | retained attachment, wire command, member-input event | Team submission coordinator | transport adapters and event rendering |
| `DS-006` | Standalone Agent flow remains on its existing Pinia-proxied context and requires no changed node. | standalone AgentContext | standalone stores | existing tests only |

## Spine Actors / Main-Line Nodes

- Shared composer surfaces initiate text/voice/attachment actions; they own local interaction only.
- `activeContextStore` is a thin selection-aware facade; it resolves the exact active context and delegates.
- `TeamExecutionViewState` owns Team AgentRun identity, focus, registry membership, and the associated-context invariant.
- `agentTeamRunStore` owns Team submission sequencing and transport coordination.
- `voiceInputStore` owns recording/transcription lifecycle and captured target selection.
- `useContextAttachmentComposer` owns stage/remove/clear sequencing for the target it receives.
- Existing streaming/server/event nodes own their unchanged contracts.

## Ownership Map

`TeamExecutionViewState` is the only governing owner changed. Its public getters/list methods must never expose a raw context after association. `activeContextStore` remains a thin facade and must not cache a parallel Team draft. Shared components must not know whether the context came from Pinia standalone ownership or the Team view; they consume the same observable `AgentContext` contract.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `activeContextStore` | Standalone context store or `TeamExecutionViewState`, selected by run type | Shared composer API across Agent and Team | Duplicate drafts, manual Team invalidation, Team identity policy |
| `agentTeamContextsStore` getters | `TeamExecutionViewState` | Pinia integration and current-Team lookup | Member context creation or proxy conversion |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Raw top-level `AgentContext` value in Team registry | Violates shared observable-context contract | Reactive context stored by `TeamExecutionViewState.associate()` | In This Change | Clean replacement; no fallback |
| Disposable expected-staleness probe | Investigation-only evidence | Durable positive regression tests | In This Change | Already removed; do not commit it |
| Component-specific invalidation workaround proposals | One owner fix covers all consumers | Canonical association invariant | In This Change | Forbidden rather than existing source removal |

## Return Or Event Spine(s) (If Applicable)

- `DS-003`: `Electron transcription result -> voiceInputStore result validation -> captured Team AgentContext -> activeContextStore.updateRequirementForContext -> reactive requirement -> textarea`
- Attachment/event return within `DS-005`: `server member-input event -> Team execution projector/stream -> frontend member-input handler -> reactive conversation -> UserMessage`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TeamExecutionViewState`.
- `DS-001`: `validateAssociation -> proxy nested state -> proxy whole AgentContext -> store by exact AgentRun ID -> expose same proxy through getters/list`.
- It matters because every supported member origin funnels through this path. Snapshot planning may hold the raw context until commit, so the existing nested-state proxying remains before whole-context association.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Vue dependency tracking | `DS-001`–`DS-004` | Team view | Observe top-level and nested mutations | Shared UI uses computed refs | Component workarounds and duplicated state |
| Exact member identity | all Team spines | Team view | Bind AgentRun ID to member address/context | Prevent cross-member drafts | Transcript/attachment leakage |
| Draft attachment upload/delete | `DS-004`, `DS-005` | attachment composer | Persist/delete draft bytes before state commit | Existing uploaded attachment lifecycle | False removal or storage leak |
| Attachment planning | `DS-005` | Team submission coordinator | Split retained attachments into executable image/path fields | Existing backend contract | Protocol duplication in UI |
| Event-monitor presentation | `DS-002`, `DS-005` | local/event projection owners | Present admitted/returned messages | Immediate and canonical feedback | Composer owner absorbing event policy |

## Ownership Boundaries

- Only `TeamExecutionViewState.associate()` converts and registers a Team member context. Callers supply validated identity/context entries but do not store or proxy them independently.
- View getters return the canonical stored proxy; consumers must mutate that returned context or a captured reference derived from it.
- Shared input facades/components continue to use public Team/active-context boundaries and do not reach into the registry map.
- Streaming and backend contracts remain below `agentTeamRunStore`; UI state must not encode wire fields directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamExecutionViewState` context getters/list | `contexts`, addresses, association/proxy conversion | Team context store, run store, event dispatch, UI selectors | Holding a separately authoritative raw Team context | Strengthen view API, not Pinia duplication |
| `activeContextStore` composer API | selection of standalone versus focused Team context | Shared textarea/voice/context surfaces | Component directly switching on Agent versus Team | Extend the facade only for real shared composer need |
| `agentTeamRunStore.sendMessageToFocusedMember` | local admission, finalization, planning, streaming | active context facade | UI calling TeamStreamingService and local submission separately | Strengthen Team send command |

## Dependency Rules

- `TeamExecutionViewState` may depend on Vue reactivity and `AgentContext`; it must not depend on components, voice, or attachment UI.
- `agentTeamContextsStore` and `activeContextStore` may consume view getters; they may not access the internal registry.
- Components/composables may use the active facade and exact context references; they may not create Team proxy wrappers or revision counters.
- `agentTeamRunStore` may coordinate existing finalizer/planner/stream services; no component may bypass it.
- Standalone stores remain unchanged and must not depend on Team view internals.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `associate(entry)` (private) | Team member context registration | Validate and store one canonical reactive context | `{agentRunId, memberAddress, agentContext}` | Initial and dynamic entries share it |
| `getAgentContext(agentRunId)` | One Team AgentRun context | Return canonical proxy | exact AgentRun ID | Never raw after target change |
| `getFocusedAgentContext()` | Focused Team member context | Return canonical proxy for current focus | view-owned focused AgentRun ID | Used by active facade |
| `listAgentContextEntries()` | Team member context set | Expose exact ID/address/proxy triples | per-entry exact identities | Same proxy instances as getters |
| `updateRequirementForContext(context,text)` | One composer draft | Mutate captured exact context | `AgentContext` reference | Shared Agent/Team API unchanged |
| `sendMessageToFocusedMember(text,attachments)` | One focused Team submission | Admit/finalize/send | focused Team + exact target AgentRun internally | Public signature unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team context getters/list | Yes | Yes | Low | Store/return proxy consistently |
| active context facade | Yes | Yes via selected type + exact context | Low | No change |
| Team send command | Yes | Yes via active root/focused AgentRun | Low | No change |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team aggregate | `TeamExecutionViewState` | Yes | Low | Retain |
| Per-run UI/runtime context | `AgentContext` | Yes | Low | Retain |
| Association mechanism | `associate` | Yes within local scope | Low | Retain; local variable `associatedContext` may clarify stored proxy |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Whole-object observation | Vue `reactive` in Team execution view | Extend | Same mechanism already used for nested state | N/A |
| Text clear/local event | `localUserSubmission` | Reuse | Logic is correct and shared | N/A |
| Transcript merge/targeting | `voiceInputStore` + active facade | Reuse | Unchanged from working released path | N/A |
| Attachment mutation | attachment composer | Reuse | Correct commit semantics | N/A |
| Attachment transport/event | current Team stream/server/event path | Reuse | Focused tests pass | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Team execution view | member association, focus, canonical context registry | `DS-001`–`DS-005` | `TeamExecutionViewState` | Extend | Only production code change |
| Shared composer | text/control rendering | `DS-002`, `DS-003` | active context owner | Reuse | No production edits expected |
| Context attachments | stage/remove/finalize/plan | `DS-004`, `DS-005` | attachment composer / Team submission | Reuse | Add proof only if needed |
| Team streaming/server events | wire and return projection | `DS-005` | existing service owners | Reuse | No source edits |
| Standalone Agent state | working Agent path | `DS-006` | Agent stores | Reuse | Preservation coverage |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `services/teamExecution/teamExecutionViewState.ts` | Team execution view | Team aggregate | Store whole-context proxy at association | Association already lives here | `AgentContext` |
| `services/teamExecution/__tests__/teamExecutionViewState.spec.ts` | Team execution view tests | Owner invariant | Initial/dynamic reactive association | Co-located owner contract | Current fixtures |
| `stores/__tests__/activeContextStore.spec.ts` | Shared facade tests | Active context facade | Team computed visibility, member isolation, voice-result boundary | Existing real Team fixture tests live here | Current Team fixtures |
| `stores/__tests__/agentTeamRunStore.spec.ts` | Team submission tests | Team send owner | Local clear/pending/event and retained/removed attachment send | Existing exact focused send tests live here | Current Team fixtures |

## Reusable Owned Structures Check

No new repeated structure, normalizer, schema, or helper is needed. Extracting `makeReactiveAgentContext` into a shared file would create empty indirection for one owner and is rejected.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentContext` | Yes | N/A | Low after proxy correction | Keep one object authoritative; no Team mirror |
| `TeamAgentContextEntry` | Yes | N/A | Low | Retain exact ID/address/context triple |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Team execution view | `TeamExecutionViewState` | Complete reactive association and preserve snapshot nested-state semantics | Sole registry owner | Yes |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionViewState.spec.ts` | Team execution view tests | Association invariant | Prove computed observation for initial and task-discovered contexts plus nested state | Co-located | Yes |
| `autobyteus-web/stores/__tests__/activeContextStore.spec.ts` | Shared facade tests | `activeContextStore` | Prove exact focused Team draft/attachment visibility and member isolation; model voice result via existing facade boundary | Existing path | Yes |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Team submission tests | `agentTeamRunStore` | Prove local clear/pending/event and retained attachment wire arguments with a real associated Team context | Existing path | Yes |
| Existing attachment/stream/server/event tests | Respective existing subsystems | Existing owners | Remain unchanged unless downstream coverage investigation finds one precise missing retained/removed assertion | Already cover contracts | Yes |

## Applied Patterns (If Any)

- **Registry**: existing exact AgentRun-ID context registry in `TeamExecutionViewState`; target ensures every value satisfies one associated-context invariant.
- **Facade**: existing `activeContextStore`; remains selection-aware and thin.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | File | Team execution aggregate | Raw entry validation, nested-state proxy preservation, whole-context proxy storage | Existing canonical registry owner | UI callbacks, voice/attachment policy, backend protocol |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionViewState.spec.ts` | File | Team execution aggregate tests | Direct reactive association proof | Co-located with owner | Component mocks as sole proof |
| `autobyteus-web/stores/__tests__/activeContextStore.spec.ts` | File | Active facade tests | Real Team proxy consumption and exact-member isolation | Existing integration level | Electron audio capture |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | File | Team send tests | Submission observation and existing wire call | Existing coordinator suite | Backend implementation duplication |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/teamExecution` | Main-Line Domain-Control | Yes | Low | Association belongs to existing Team aggregate |
| `stores/__tests__` | Mixed Justified | Yes | Low | Each suite tests its existing store boundary; no new folder needed |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Association | `state = reactive(state); associatedContext = reactive(rawContext); contexts.set(id, associatedContext)` | `contexts.set(id, rawContext)` plus component `forceUpdate()` | Preserves snapshot raw-state writes and makes all public composer fields observable once |
| Consumer | `view.getFocusedAgentContext().requirement = text` through shared facade | Copying Team requirement into another Pinia field | Keeps one authoritative member context |
| Coverage | Prime computed from a real view context, mutate text/attachments/pending, assert new values | Build `reactive({requirement...})` mock and call it Team coverage | Only the real association can reproduce the regression |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Raw and reactive Team contexts selected by caller | Might minimize association edit | Rejected | Every associated context is reactive and canonical |
| Manual composer revision counter | Could invalidate stale computed refs | Rejected | Repair context owner once |
| Team-specific draft mirror in Pinia | Would mimic standalone path | Rejected | Team view remains single owner; expose proxy |
| Voice/attachment component special cases for Team | Could patch visible symptoms | Rejected | Shared components remain unaware of owner type |

## Derived Layering (If Useful)

`Shared UI -> thin active-context facade -> Team execution view / Team submission owner -> existing transport/event layers`. The target does not add a layer; it repairs the state contract at the existing Team owner.

## Change / Refactor Sequence

1. Add failing positive regression assertions around initial and dynamically associated Team contexts: computed observation of text, attachment collection, pending state, and nested status.
2. In `associate()`, retain nested-state proxy conversion, then create/store one whole-context reactive proxy.
3. Prove getter/list identity returns that same canonical proxy and rerun snapshot/task association tests.
4. Extend active-context tests with real Team fixtures for transcript-style requirement mutation, attachment replacement, focus isolation, and standalone preservation.
5. Extend Team send tests to prime reactive observations before actual local submission and assert text/attachments clear, pending becomes visible, one local event exists, and retained attachment planner output reaches the mocked Team stream while removed input is absent.
6. Run existing shared input, voice, context attachment, Team stream, member-input event, renderer, and server projection suites. Do not edit healthy production modules merely to make tests convenient.
7. Leave final browser/API/E2E coverage selection to the downstream coverage investigation, using the approved isolated-data constraint.

## Key Tradeoffs

- Retaining the existing explicit nested-state proxy assignment may look redundant after whole-object `reactive()`, but it is necessary for current snapshot planning: `validatedStatuses` can retain the raw planned context and write its nested state after commit. Keeping it avoids a separate snapshot refactor while producing one shared nested-state proxy.
- Storing a proxy in a shallow registry is deliberate: membership remains shallow while each explicit value is already the canonical reactive object.
- Focused behavior tests are preferred over a broad packaged-Electron dependency because the defect is deterministic Vue state observation and the user's live process must remain untouched.

## Risks

- If implementation removes the nested-state conversion instead of extending it, snapshot-created status updates may mutate a raw nested state and become invisible. Tests must cover snapshot or task-discovered contexts and nested status.
- Tests that read a computed value only after mutation may miss caching behavior. Prime the computed before mutation, then assert invalidation.
- A test that uses only manually reactive mocks will pass before the fix and is not acceptable as the regression proof.

## Guidance For Implementation

- Make the production diff local to `TeamExecutionViewState.associate()` unless test evidence reveals a directly related issue.
- Use Vue's existing `reactive`; do not add watchers, force updates, version counters, proxy wrappers, or a new store.
- Preserve exact AgentRun/member identity and return the same proxy through focused lookup, ID lookup, and list entries.
- Test both initially supplied and later created contexts.
- Prime observable/computed values before mutation so the prior defect would fail.
- Do not touch attachment protocol/backend, voice capture/transcription, event rendering, standalone Agent ownership, data schema, or migration code without new failing evidence.
