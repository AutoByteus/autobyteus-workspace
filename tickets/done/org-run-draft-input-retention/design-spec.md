# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline / revision and user-approval reference: `SR-002`, explicitly approved by the user with `approve` on 2026-09-22.
- Behavior-defining supplements and their approval references: N/A — the three supplied screenshots are factual evidence; no separate UI/UX specification governs this behavior.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/investigation-notes.md`
- Canonical requirements path: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/requirements-doc.md`
- Workspace / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention` / `codex/org-run-draft-input-retention`
- Resolved base / finalization target: `origin/personal` at `d883f5620a0abaed147209ad0e42a8960df70e68` / `origin/personal`

## Current-State Read

Standalone Agent and Agent Team use session-retained context collections. Selection changes which retained context is presented; ordinary view unmount does not remove prior contexts. Explicit archive/delete invokes `removeRun` or `removeTeamContext` only after authoritative backend success.

Agent Org already has the corresponding multi-root owner in `agentOrgContextsStore`: `contexts` is keyed by exact `orgRunId`, each `AgentOrgExecutionContext` owns exact per-`agentRunId` `AgentContext` objects, and `services` is also keyed by root. Verified inspection/stream replacement calls `adoptLocalContexts`, retaining composer object identity and its `requirement` / `contextFilePaths` fields.

The defect is that `AgentOrgWorkspaceView` calls the store's public `disconnect` on root change and unmount. Despite its name, that method does not merely detach transport: it invalidates inspection, retires the stream, and deletes retained root context, errors and focus. Reopening then hydrates a fresh server projection whose unsent composer fields initialize empty. This makes the view an accidental destructive lifecycle owner.

The target must keep existing exact identity, stream recovery, submission, attachment finalization, stop/continuation and archive/delete behavior. It must not create a separate draft cache or server persistence path.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: The production delta is bounded to the Agent Org workspace lifecycle, active-context facade, Agent Org context-store release boundary and post-success history cleanup. Several focused unit/integration tests and cleanup call sites require a clean-cut API rename. No backend or cross-package runtime change is required.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: The design restores an ownership invariant already implemented by the existing Agent, Team and Agent Org retained-context collections. It adds no new runtime owner, external contract, persistence, security boundary, migration, deployment step or new concurrency mechanism. Existing Agent Org `publish`/`adoptLocalContexts`, stream recovery, exact owner and deferred release mechanisms remain authoritative.
- Escalation trigger if implementation or validation discovers new impact: Reclassify and return a Design Impact if retaining an opened Org root requires a new resource-eviction policy, changes stream/submission concurrency, requires cross-restart persistence, changes attachment ownership/TTL, or exposes a second authoritative composer-state representation.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Agent Org view lifecycle | `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue:107-149` | Root change and unmount invoke destructive `disconnectAgentOrg` | Remove release behavior from ordinary navigation | None |
| Agent Org root owner | `autobyteus-web/stores/agentOrgContextsStore.ts:46-176` | Multi-root contexts/services already exist; verified replacement adopts prior exact local contexts | Retain the existing root/context objects; do not add draft storage | None |
| Agent Org release path | `agentOrgContextsStore.ts:99-115,224-229,303-305` | `disconnect` is full release and can defer disposal across pending operations | Clean-cut rename to an explicit release boundary | Final identifier may follow local implementation naming, but semantics are fixed |
| Agent Team comparison | `agentTeamContextsStore.ts:11-79`; `TeamWorkspaceView.vue:23-87` | Team contexts remain resident across navigation and are removed explicitly | Align Agent Org lifecycle invariant with Team | None |
| Standalone comparison | `agentContextsStore.ts:19-33,71-163`; `AgentWorkspaceView.vue` | New/temp and existing Agent contexts remain resident across selection | Preserve and regression-test current behavior | None |
| Authoritative cleanup | `runHistoryMutationActions.ts:45-105,234-294` | Archive/delete removes contexts only after backend success | Route Agent Org release only through post-success cleanup | None |
| Runtime reproduction and focused tests | Investigation notes, Runtime Findings | Full disconnect reproduces loss; 41 + 82 related tests pass before change | Add missing navigation retention coverage while preserving hardened behavior | None |

## Intended Change

Make Agent Org match the established Agent/Team **session lifecycle invariant**:

1. Opening or selecting a different run changes the presented target but does not release the prior root context.
2. The existing `AgentOrgExecutionContext` and its exact member `AgentContext` objects remain the sole in-session composer authority.
3. Opened active Org streams remain owned by the store during the session, as existing Agent/Team run streams do. Existing inactive/stop/recovery paths may retire or replace transport without discarding local composer objects.
4. Full release is explicit, destructively named, and used only after successful archive/delete or test/session teardown.
5. No draft copy, serialization, API, database or TTL change is introduced.

This is similar to Agent Team in lifecycle behavior, not a mechanical copy of the Team implementation. Agent Org keeps its stricter root inspection, stream generation and exact-member adoption machinery.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003 / AC-001, AC-002 | Navigate away from and back to an Org member with an unsent draft | View calls full disconnect; reproduction loses draft | Ordinary navigation retains exact text/files | Composer -> retained Org root -> route selection -> same context restored (`DS-001`) |
| BEH-002 | Contract | REQ-002 / AC-001, AC-003, AC-004 | Exact Org root/member selection and async attachment owner | Exact `{orgRunId, agentRunId}` ownership already passes | Preserve strict isolation and captured async target | Exact member context / owner path (`DS-001`, `DS-004`) |
| BEH-003 | User/System | REQ-004 / AC-005-AC-007 | Send, failure, stop/continue, recovery | Submission and recovery suites pass | Preserve clearing, restoration, newer-edit and continuation semantics | Submission/recovery paths remain unchanged (`DS-002`, `DS-004`) |
| BEH-004 | User | REQ-001, REQ-005 / AC-009 | Navigate among new/existing Agent and Team runs | Central maps already retain contexts | Preserve and explicitly regression-test parity | Existing Agent/Team selection paths (`DS-005`) |
| BEH-005 | Operational | REQ-003, REQ-006 / AC-008 | Successful archive/delete or session teardown | Current Agent Org `disconnect` is used for both navigation and cleanup | Reserve full release for authoritative cleanup only | Mutation success -> explicit root release (`DS-003`) |
| BEH-006 | User/System | REQ-004, REQ-006 / AC-010 | Reopen sent conversation | Server projection rehydrates sent history | Preserve unchanged; unsent drafts remain local only | Existing inspection/hydration (`DS-002`) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_68d55dcb2023__image.png` | Empty composer after navigation | REQ-001 / AC-001 | Confirms visible failure state | Evidence only |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_62d7b3dc8112__image.png` | Populated composer before navigation | REQ-001 / AC-001 | Confirms text + attachment draft | Evidence only |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_132f5fd25b04__image.png` | Other Org/member selection | REQ-002 / AC-001 | Confirms cross-root navigation context | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` with a bounded lifecycle-boundary refactor.
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: A route/view component calls a store method named like transport disconnection that actually deletes the authoritative retained context. Agent and Team views do not own destructive context lifecycle.
- Design response: Remove destructive cleanup from the view; keep context lifecycle in `agentOrgContextsStore`; expose an explicitly destructive release method only to authoritative cleanup callers.
- Refactor rationale: Merely deleting two call sites while retaining `disconnectAgentOrg` on the active UI facade leaves the same boundary trap available. A clean-cut rename/removal makes the ownership rule structural and testable.
- Intentional deferrals and residual risk: Cross-restart autosave and bounded-memory eviction are out of scope. Retained opened roots consume session memory and active roots may keep their established streams; this matches current Agent/Team session behavior and ends on stop/release/session teardown.

## Terminology

- **Retained root context:** The `AgentOrgExecutionContext` stored under one exact `orgRunId` for the current app session.
- **Ordinary navigation:** Selecting another run/member/surface without archiving or deleting the owning run.
- **Release:** Destructive removal of one retained root plus its transport/inspection/error/focus bookkeeping.
- **Transport retirement:** Private stream shutdown used by stop/inactive/recovery/release logic; it is not synonymous with context release.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the view-level unmount/root-change release calls, remove `disconnectAgentOrg` from `activeContextStore`, and replace public `agentOrgContextsStore.disconnect` with the explicit release API. Update all call sites; do not retain aliases.
- Compatibility wrappers, dual draft stores and fallback rehydration of unsent state are prohibited.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Sent conversation and finalized attachments remain in current server stores; draft attachment bytes remain in existing `draft_context_files/agent-org-runs/<orgRunId>/agent-runs/<agentRunId>/context_files`. Composer text and attachment descriptors remain in-memory `AgentContext` fields.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader/writer behavior and representative evidence: Server inspection continues to hydrate sent projections; context-file services keep current owner locators and 24-hour cleanup; composer continues writing directly to `AgentContext`.
- Required semantics and invariants under direct use: Exact owner isolation, sent/unsent separation, attachment finalization, TTL and history semantics remain unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No additional persisted data or retention period; in-memory lifetime extends only across navigation in the current session.
- Decision: `Not Affected`
- Decision rationale: The defect is deletion of an existing in-memory owner. Retaining that owner requires no stored-data transformation, I/O, downtime, rollout or recovery path.
- Acceptance criteria or design constraints supported by this decision: AC-001-AC-004, AC-008-AC-010.

### Migration Plan

N/A — no persisted schema or stored meaning changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | User edits an Org member composer | Same exact draft renders after leaving and returning | `agentOrgContextsStore` retained root/member contexts | Core bug-fix path |
| DS-002 | Return-Event | BEH-003, BEH-006 | Inspection/stream produces a verified server candidate | Candidate publishes while prior exact local composer objects survive | `agentOrgContextsStore.publish` + `AgentOrgExecutionContext.adoptLocalContexts` | Prevents recovery from becoming another draft-loss path |
| DS-003 | Primary End-to-End | BEH-005 | Backend archive/delete succeeds | Exact retained root and transport are released | Run-history mutation cleanup invoking Org context owner | Preserves authoritative destruction boundary |
| DS-004 | Return-Event | BEH-002, BEH-003 | Attachment upload or submission starts for exact member | Completion/failure mutates only captured owner with current recovery semantics | Composer/upload store + Org submission owner | Preserves async identity and newer edits |
| DS-005 | Primary End-to-End | BEH-004 | User switches standalone Agent/Team run | Prior exact draft renders on return | Existing Agent/Team context stores | Required parity regression surface |

## Primary Execution Spine(s)

- `DS-001`: `Shared composer -> exact member AgentContext -> agentOrgContextsStore retained root map -> workspace route selects another target -> route reselects original root/member -> activeContextStore target -> shared composer renders same AgentContext`
- `DS-003`: `Archive/Delete UI -> server mutation -> successful exact-root result -> runHistoryMutationActions cleanup -> agentOrgContextsStore.releaseContext -> stream/inspection retired + retained root removed`
- `DS-005`: `Shared composer -> Agent/Team central context map -> selection changes -> exact prior run/member selected -> shared composer renders retained context`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Composer writes directly to one member context. Navigation changes presentation only. Returning resolves the same retained root/member object, so no draft reconstruction occurs. | Composer, `AgentContext`, Org root context map, route selection | `agentOrgContextsStore` | UI focus, stream updates |
| DS-002 | Verified inspection/stream state may replace the root projection, but publication adopts matching prior `AgentContext` objects only after identity validation. | Stream/inspection, staged root, publish, adopted member contexts | `agentOrgContextsStore` | Activity commit, errors, focus |
| DS-003 | Only an authoritative successful destructive mutation asks the store to release the root. Release coordinates pending operations, transport, inspection and local maps. | Mutation result, cleanup, release | Run-history mutation owner + Org context owner | Selection/history refresh |
| DS-004 | Async file/upload/send operations retain the captured exact owner and existing failure/newer-edit rules independently of visible navigation. | Composer target, upload owner, submission, ACK/failure | Existing upload/submission owners | File finalization, dedupe |
| DS-005 | Agent and Team selections continue to reference their existing central maps; no production change is needed. | Context map, selection, composer | Agent/Team context stores | Regression tests only |

## Spine Actors / Main-Line Nodes

- User and shared composer: initiate draft edits and navigation.
- Exact `AgentContext`: owns one agent execution's local composer fields.
- `AgentOrgExecutionContext`: owns exact per-member contexts and selection for one root.
- `agentOrgContextsStore`: authoritative session owner for all opened Org roots, inspections, streams, operations and submissions.
- Workspace route/view: presents one root/member and requests opening; it does not release state.
- Run-history mutation cleanup: initiates full release only after authoritative backend success.

## Ownership Map

- `AgentOrgWorkspaceView`: present route-selected Org content, request inspection/opening, synchronize route focus/mode, and switch center modes. It owns no retained-state destruction.
- `activeContextStore`: thin common workspace facade for active target/composer capabilities and Org open/select queries. It must not expose destructive Org release to the view.
- `agentOrgContextsStore`: sole owner of retained Org roots, exact member contexts, root services, inspections, pending focus, operations, submissions and release sequencing.
- `AgentOrgExecutionContext`: owns per-root identity index, selection, projection state and adoption of exact local member contexts.
- `runHistoryMutationActions`: owns post-success local cleanup orchestration for archive/delete.
- Shared composer/context-file stores: retain existing exact target and file-owner responsibilities.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `activeContextStore.inspectAgentOrg` | `agentOrgContextsStore.openForInspection` | Keeps workspace surfaces behind common context facade | Retained-root destruction |
| `activeContextStore.selectAgentOrg` | `agentOrgContextsStore.select` | Routes exact Org selection from the view | Draft copying or identity fallback |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `AgentOrgWorkspaceView` unmount/root-change disconnect calls | Navigation is not a release boundary | Retained roots in `agentOrgContextsStore` | In This Change | Keep `open()` on mount/root change |
| `activeContextStore.disconnectAgentOrg` | Destructive lifecycle must not be available through the presentation facade | Direct explicit release from history cleanup to Org context owner | In This Change | No compatibility alias |
| `agentOrgContextsStore.disconnect` public name | Name conflates stream detachment with full state deletion | `releaseContext(orgRunId)` (semantic name fixed; exact local spelling may follow convention) | In This Change | Update production and tests cleanly |
| Test expectation that view unmount destroys an Org root | Encodes defective behavior | Navigation retention/no-release assertions | In This Change | Preserve explicit release tests separately |

## Return Or Event Spine(s) (If Applicable)

- `DS-002`: `WebSocket/inspection response -> strict staging/verification -> publish -> adoptLocalContexts(previous) -> reactive target/composer update`.
- `DS-004`: `Upload/send completion -> captured exact owner -> attachment finalization or failure recovery -> retained member context`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `agentOrgContextsStore` release sequencing.
- Chain: `releaseContext requested -> pending operation/submission? defer release : invalidate generation/inspection -> retireStream -> delete exact context/error/focus -> clear deferral`.
- Why it matters: Archive/delete cleanup must remain safe without allowing ordinary navigation into this destructive path.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Stream recovery | DS-001, DS-002 | Org context owner | Recover sequence/socket failure and publish verified candidates | Keeps server projection current | A view-owned recovery could overwrite or delete drafts |
| Context-file upload/finalization | DS-001, DS-004 | Exact member context/submission | Preserve captured owner and finalize on send | Files are asynchronous | Global draft storage would leak identities |
| Activity/history refresh | DS-002, DS-003 | Run history | Reflect active/inactive and mutation outcomes | Navigation tree correctness | Must not become draft authority |
| Center chat/config mode | DS-001 | Workspace view | Present existing modes | UI-only concern | Must not trigger state release |

## Ownership Boundaries

The authoritative boundary for Agent Org session state is `agentOrgContextsStore`. Workspace components may open, query and select through the active facade, but they may not call a destructive release API. `AgentOrgExecutionContext` remains internal owned state and its member map must not be bypassed by a parallel draft map.

Run-history cleanup may call the explicit release boundary only after exact backend success. Stream retirement remains private to the Org store and streaming service; callers do not manage raw service instances.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `agentOrgContextsStore` | contexts, services, inspections, generations, operations, submissions, focus, errors | active facade, history cleanup, Org coordinators | View deletes context or disconnects raw service | Add a semantically specific store operation, not direct map/service access |
| `AgentOrgExecutionContext` | member map, identity index, selection, local-context adoption | Org context store | Separate member draft map keyed only by address | Extend exact root/member APIs |
| Context-file upload store | uploaded descriptor lifecycle and exact owners | shared composer/submission | View rewrites locators or owner IDs | Extend owner-specific upload/finalization API |

## Dependency Rules

- `AgentOrgWorkspaceView` may depend on `activeContextStore` open/select/query capabilities; it must not depend on Org release or raw services.
- `activeContextStore` may depend on `agentOrgContextsStore` for active target/open/select/error queries; it must not re-own lifecycle collections.
- `runHistoryMutationActions` may invoke `agentOrgContextsStore.releaseContext` only after confirmed archive/delete success.
- `agentOrgContextsStore` alone coordinates root release, stream retirement and deferred disposal.
- Shared composer components continue depending on the exact active `AgentContext`; no Org-specific draft adapter is allowed.
- No compatibility alias from `disconnect` to `releaseContext`; all callers move atomically.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `openForInspection(orgRunId, intent?)` | Org root opening/recovery | Ensure a coherent retained root and live/historical state | Exact non-empty `orgRunId`; optional current intent | Existing behavior |
| `select(orgRunId, selection)` | Org root/member focus | Select exact address or agent execution within exact root | `orgRunId` + `OrgWorkspaceSelection|string|null` | Existing behavior |
| `releaseContext(orgRunId)` | Full local Org root lifecycle | Retire/cancel owned work and remove retained root bookkeeping | Exact `orgRunId` | New name for existing destructive semantics; not exposed to view |
| `contextFor(orgRunId)` | Retained root query | Return exact retained root or null | Exact `orgRunId` | Existing behavior |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `openForInspection` | Yes | Yes | Low | None |
| `select` | Yes | Yes | Low | Preserve exact agentRunId/address validation |
| Current `disconnect` | No (name implies transport; implementation releases all state) | Yes | High | Replace with `releaseContext`; keep `retireStream` private |
| `contextFor` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Retained Org collection owner | `agentOrgContextsStore` | Yes | Low | None |
| Destructive root removal | Current `disconnect`; proposed `releaseContext` | Proposed: Yes | Current: High | Clean-cut rename |
| Transport shutdown | Private `retireStream` | Yes | Low | Keep private |
| Member composer owner | `AgentContext` | Yes | Low | Do not duplicate |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Session draft retention | `AgentContext` inside central run/root context stores | Reuse | Already authoritative for text/files across all composer surfaces | N/A |
| Root/member identity isolation | `AgentOrgExecutionContext` + view index | Reuse | Exact run IDs and addresses already validated | N/A |
| Recovery without draft loss | `publish` + `adoptLocalContexts` | Reuse | Already preserves exact local objects on verified replacement | N/A |
| Full root cleanup | Agent Org context store deferred disposal | Extend | Semantics exist; public naming/caller boundary is wrong | N/A |
| Cross-restart autosave | None | Do not create | Explicitly out of scope | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace presentation | Route-selected Org surface and open/select requests | DS-001 | Workspace view | Reuse | Remove destruction only |
| Agent Org execution state | Retained roots, exact members, streams, inspection, release | DS-001-DS-004 | Org context store | Extend | Clarify release boundary |
| Run history mutation | Authoritative post-success cleanup | DS-003 | History mutation actions | Reuse | Call explicit release |
| Shared composer/context files | Draft edits and exact attachment ownership | DS-001, DS-004, DS-005 | `AgentContext` / upload store | Reuse | No code-model change |
| Agent/Team contexts | Existing session retention | DS-005 | Agent/Team stores | Reuse | Test-only impact expected |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/org/AgentOrgWorkspaceView.vue` | Workspace presentation | Org route view | Open/select/present without releasing | Existing view owner | Yes, active facade |
| `stores/activeContextStore.ts` | Workspace facade | Common active target | Remove destructive Org wrapper | Existing facade owner | Yes |
| `stores/agentOrgContextsStore.ts` | Org execution state | Retained root lifecycle | Explicit release API; existing retained maps | Existing single authority | Yes, `AgentContext`/Org context |
| `stores/runHistoryMutationActions.ts` | History mutation | Post-success cleanup | Invoke explicit release | Existing cleanup owner | Yes |
| Focused specs | Verification | Corresponding production owners | Navigation retention, isolation, release, parity | Co-locate with behavior owner | Test fixtures |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Draft text/files | Existing `types/agent/AgentContext.ts` | Agent context model | Already shared by Agent, Team and Org composers | Yes | Yes | A second route-keyed draft cache |
| Org identity/index | Existing `AgentOrgExecutionContext` / index | Org execution | Already exact and reused by hydration/stream/selection | Yes | Yes | Address-only fallback map |

No new reusable file is warranted.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentContext.requirement` / `contextFilePaths` | Yes | Yes | Low if context is retained | Keep as sole composer authority |
| `AgentOrgExecutionContext` member map | Yes | Yes | Low | Preserve exact agentRunId identity and adoption |
| Proposed route-local draft store | N/A | N/A | High | Reject; do not create |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue` | Workspace presentation | Org route view | Open route roots and present exact targets; no release on navigation/unmount | Keeps UI lifecycle local without owning state lifetime | Yes |
| `autobyteus-web/stores/activeContextStore.ts` | Workspace facade | Common target facade | Expose Org inspect/select/query only; remove destructive wrapper | Prevents mixed-level lifecycle access | Yes |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | Org execution state | Authoritative session root owner | Retain roots and expose explicitly destructive `releaseContext` | Existing owner already coordinates all internal maps/services | Yes |
| `autobyteus-web/stores/runHistoryMutationActions.ts` | History mutations | Cleanup orchestrator | Release exact Org root only after mutation success | Matches Agent/Team cleanup placement | Yes |
| `autobyteus-web/components/workspace/org/__tests__/AgentOrgWorkspaceView.spec.ts` | Workspace tests | View lifecycle | Assert root changes/unmount do not request destructive cleanup | Replaces defective expectation | Yes |
| `autobyteus-web/stores/__tests__/agentOrgContextsStore.spec.ts` and/or focused new Org retention spec | Org store tests | Root lifecycle | Prove A/X and B/Y draft isolation, return identity, explicit release | Store is behavior owner | Yes |
| Existing Agent/Team context specs | Regression tests | Existing stores | Explicitly verify new/existing run/member draft retention across selection | Approved parity contract | Yes |
| Existing Agent Org submission/context/recovery/inspection/history specs | Regression tests | Existing owners | Update release API calls and preserve hardened semantics | Clean-cut rename touches cleanup calls | Yes |

## Applied Patterns (If Any)

- **Session-retained context registry:** Existing `Map`/record keyed by exact root/run identity; selection does not control object lifetime.
- **Identity-preserving projection adoption:** Verified server candidates adopt matching local `AgentContext` objects rather than copying UI fields.
- **Explicit destructive boundary:** Archive/delete cleanup invokes a method whose name and ownership communicate full release.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/org/` | Folder | Org presentation | Route/view presentation and tests | Existing feature surface | Root lifecycle deletion |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | File | Org execution session owner | Retained roots, exact members, stream/inspection/release | Existing authoritative store | Route-specific UI policy or second draft representation |
| `autobyteus-web/stores/activeContextStore.ts` | File | Thin workspace facade | Active target and non-destructive Org operations | Existing common composer boundary | Destructive release exposure |
| `autobyteus-web/stores/runHistoryMutationActions.ts` | File | Mutation cleanup | Post-success explicit release | Existing family cleanup orchestration | Ordinary navigation handling |
| Existing corresponding `__tests__` folders | Folder | Verification owners | Lifecycle, identity and regression coverage | Co-located with production concerns | Duplicated production helpers |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/org` | Transport/presentation | Yes after change | Low | Remove destructive store lifecycle call |
| `stores` | Main-Line Domain-Control | Yes | Low | Existing store owns session lifecycle |
| `services/agentOrgExecution` | Main-Line domain/projection | Yes | Low | No structural change needed |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Navigation | `route A -> route B -> route A`, while `contexts[A]` and `contexts[B]` remain | `onBeforeUnmount -> disconnect(A) -> delete contexts[A]` | Navigation must change presentation, not lifetime |
| Release API | `archive success -> releaseContext(A)` | `view unmount -> disconnectAgentOrg(A)` | Makes destructive authority explicit |
| Draft owner | `contexts[A].getAgentContext(X).requirement` | `draftsByRoute['A/X']` copied beside `AgentContext` | Prevents competing state and leakage |
| Recovery | `candidate.adoptLocalContexts(previous)` after exact identity validation | Rehydrate and manually copy only text | Preserves all existing local invariants/fields |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `disconnect` as alias of `releaseContext` | Reduce test/caller edits | Rejected | Rename all callers atomically |
| Add a route-keyed draft cache while keeping destructive view cleanup | Could reconstruct lost text/files | Rejected | Retain the authoritative `AgentContext` instead |
| Persist drafts to server/local storage for navigation | Would survive context deletion | Rejected | Fix in-memory lifecycle; cross-restart persistence is out of scope |
| Disconnect transport on navigation but retain a copied draft | Attempts resource cleanup | Rejected | Keep existing root/service ownership; current stop/recovery paths already retire transport safely |

## Derived Layering (If Useful)

`Workspace presentation -> active target facade -> Agent Org session owner -> AgentOrgExecutionContext/member AgentContext -> streaming/inspection and context-file services`.

Run-history mutation cleanup enters the Agent Org session owner directly for explicit release after backend success. It does not pass through the presentation facade.

## Change / Refactor Sequence

1. Add/rename the Agent Org store's destructive boundary to `releaseContext` (or an equivalently explicit local name) while preserving current deferred-release, generation invalidation, inspection cleanup, stream retirement and exact map deletion semantics.
2. Update post-success Agent Org archive/delete cleanup and test teardown callers to use the new boundary; remove the old `disconnect` name with no alias.
3. Remove `disconnectAgentOrg` from `activeContextStore` exports and delete Agent Org view calls on root change/unmount. Keep inspection/open on initial mount and changed root.
4. Replace the view test that expects unmount disposal with assertions that normal root change/unmount never invokes release and that the new root still opens.
5. Add store/integration coverage for A/X draft + attachment -> B/Y draft -> return A/X, including exact object/draft isolation and explicit release behavior.
6. Add or tighten standalone Agent and Agent Team selection-retention tests for new and existing contexts without changing their production paths.
7. Run focused view/store/composer/context-file/submission/recovery/inspection/termination/history suites, then full frontend typecheck/test gates appropriate to the repository.
8. Perform realistic browser validation of the user's reported navigation sequence and Agent/Team parity.

No temporary dual path is permitted.

## Key Tradeoffs

- **Keep active opened Org streams vs disconnect/reinspect on every navigation:** Keeping them matches Agent/Team session behavior, avoids new suspend/resume concurrency, and preserves current authoritative live updates. It uses session resources for opened active roots, released by stop/archive/delete/session end.
- **Retain context vs copy drafts elsewhere:** Retention is simpler and safer because `AgentContext` already owns text, files, pending submission and projection relationships. Copying creates synchronization and identity risks.
- **Clean-cut API rename vs minimal call removal:** The rename touches tests but makes the destructive boundary explicit and prevents recurrence.

## Risks

| Risk | Mitigation / Verification |
| --- | --- |
| Opened active Org streams remain alive after switching | This matches existing Agent/Team behavior; stop/inactive/release/session teardown still retire them. Verify no duplicate service per root (`services` map and existing `attach` reuse). |
| Verified recovery replaces a retained root | Existing `publish` + `adoptLocalContexts` retains exact local composer objects; keep and regression-test. |
| Archive/delete no longer clears a root after rename | Update authoritative cleanup and exact-root history tests; assert failed mutations do not release. |
| Async upload/send completes while another root is visible | Existing captured exact owner and submission identity checks remain; run focused suites. |
| A future view regresses by calling release | Do not expose release through `activeContextStore`; view tests assert navigation is non-destructive. |
| Memory grows with roots opened during a long session | Bounded to session and consistent with approved behavior; any eviction/autosave policy is a separate requirement. |

## Guidance For Implementation

- Preserve `AgentContext` as the only composer-state authority. Do not add localStorage, IndexedDB, a Pinia draft mirror, or backend draft records.
- Do not change `adoptLocalContexts`, exact member identity validation, context-file owner shapes, submission dedupe, or failure restoration unless a focused failing test proves a design impact.
- The explicit release method must preserve current pending-operation deferral and exact-root cleanup semantics.
- The view should still call `open()` when first mounted or when `orgRunId` changes; `openForInspection` already returns quickly for a retained historical root or ready live service.
- Update all old method references atomically; do not leave aliases or deprecated wrappers.
- Verification must cover text and attachments, two roots/two members, new and existing runs, same-root members, async captured owners, successful/failed send, stop/continue, archive/delete, recovery, and sent history.
