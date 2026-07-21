# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-agent-communication-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-backend-websocket-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-communication-boundaries.md`
- Current Review Round: `9`
- Trigger: fresh review of the user-approved desktop-only package after the round-8 gate invalidation and removal of the unsupported paired-mobile credential premise.
- Prior Review Round Reviewed: `8`
- Latest Authoritative Round: `9`
- Current-State Evidence Basis: repository source at recorded `HEAD` `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`, read with `git show HEAD:<path>` because the worktree intentionally preserves stopped partial implementation. Existing binding/orchestration/runtime/terminal, iframe/bootstrap, manifest/bundle/exposure, Gateway/Engine/worker, notification, artifact, and native-socket behavior was rechecked from that basis. The user's product clarification establishes that the application menu and hosted application UI are desktop-only; unrelated paired-mobile infrastructure is technical evidence only, not a supported application caller path. The six solution-designer-owned artifacts pass links, fences, final-newline, whitespace, and continuous-ID checks; 24 Mermaid outputs exist under `/tmp/application-agent-communication-mermaid-desktop/out-v2`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial direct-frontend output proposal | N/A | `DR-001`–`DR-004` | Fail — Design Impact | No | Superseded basis. |
| 2 | Mandatory application-backend proxy rewrite | `DR-001`–`DR-004` | `DR-005`–`DR-007` | Fail — Design Impact | No | Superseded basis. |
| 3 | Projection/lifecycle/spine correction | `DR-005`–`DR-007` | `DR-008` | Fail — Design Impact | No | Superseded basis. |
| 4 | Backend-proxy establishment/sequence correction | `DR-006`, `DR-008` | None | Pass, later obsoleted | No | User replaced the primary path. |
| 5 | Standard application-bound agent communication | Prior history reclassified | `DR-009`–`DR-011` | Fail — Design Impact | No | READY commit, custom WebSocket authority, and binding exports required correction. |
| 6 | Bounded `DR-009`–`DR-011` correction | `DR-009`–`DR-011` | `DR-012` | Fail — Design Impact | No | `DR-009`/`DR-011` resolved; `DR-010` narrowed; unsupported mobile premise opened. |
| 7 | Exposure authority and credential/query proposal | `DR-010`, `DR-012` | None | Pass, later obsoleted | No | Subsequent user clarification invalidated the mobile premise before implementation. |
| 8 | Desktop-only scope clarification | `MP-R6-001`, `DR-012`, round-7 gate | None | Blocked — Requirement Gap | No | Stale package returned for removal of unsupported machinery. |
| 9 | Corrected desktop-only package | `MP-R6-001`, `DR-010`, `DR-012`, round-8 gap | None | Pass | Yes | Product-reachability gate applied; no mobile/application-credential machinery remains. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 5–9 | `DR-009` | High | Resolved and rechecked | Streaming returns `ACTIVE_PAUSED`; Communication owns the synchronous READY/terminal/cancel/transport serializer; exact settlement, event disposition, and six-barrier tests remain aligned. | Supported desktop connect/close and binding-terminal paths make these races product-reachable. |
| 5–9 | `DR-010` | High, later Medium | Resolved and rechecked | Exact `ApplicationManifestV4 → ApplicationBackendBundleManifestV1 → ApplicationBackendDefinition v4 → derived ApplicationBackendExposureSummary` chain; one seven-flag authority; exact v4/v4 compatibility; strict stale-package rejection. | Requirements, design, supplement section 8, file mapping, built-ins, devkit, generated output, and tests agree. |
| 5–9 | `DR-011` | Medium | Resolved and rechecked | Only `ApplicationAgentBinding` and `ApplicationAgentTeamBinding` are public; common composition remains private; mixed results use the explicit union. | Export/removal tests remain required. |
| 6–9 | `DR-012` / `MP-R6-001` | High | Obsolete / Not Reachable | The user confirmed no application feature exists on paired mobile/phone. The active package removes credential selection/injection, token query/collision behavior, mobile errors/coverage, and authentication-composer ownership. | Existing mobile files cannot drive application architecture without a supported product entry path. |
| 8 | Desktop-only requirement gap | N/A | Resolved | `BEH-010`, `REQ-004`/`REQ-007`, `AC-005`/`AC-007`, both WebSocket contracts, `DS-003`/`DS-008`, file mapping, examples, and coverage now consistently use trusted desktop application scope with no application authentication surface. | External platform/network security remains unchanged and outside this contract. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: a standard desktop application-bound agent connection, two precise bindings, optional backend observation/custom WebSockets, exact provider-neutral events, strict v4 cutover, plane separation, and no migration.
- Relevant existing behavior and evidence confirmed: binding creation/control, lifecycle terminal writers, native raw-ID sockets, worker IPC, bootstrap/Gateway, notifications/artifacts, and manifest/bundle exposure ownership were confirmed at recorded `HEAD`.
- Approved change, preserved behavior, and outside scope understood: the standard path is direct and excludes Gateway/Engine/worker; backend observation/custom WebSockets remain optional; mobile/phone application access, application-client authentication, replay, migration, new identity/grants, and expanded native commands are excluded.
- Remaining material ambiguity, if any: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | System/Contract | Pass | Pass | Pass | Confirmed | None |
| `BEH-002` | User/Contract | Pass | Pass | Pass | Confirmed | None |
| `BEH-003` | Preserved Contract | Pass | Pass | Pass | Confirmed | None |
| `BEH-004` | System/Contract | Pass | Pass | Pass | Confirmed | None |
| `BEH-005` | Event/Contract | Pass | Pass | Pass | Confirmed | None |
| `BEH-006` | Preserved Event | Pass | Pass | Pass | Confirmed | None |
| `BEH-007` | Preserved Durable | Pass | Pass | Pass | Confirmed | None |
| `BEH-008` | Structure/Contract | Pass | Pass | Pass | Confirmed | None |
| `BEH-009` | System/Lifecycle | Pass | Pass | Pass | Confirmed | None |
| `BEH-010` | Scope/Contract | Pass | Pass | Pass | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `application-agent-communication-contract.md` | Pass | Pass | Pass | Pass | Pass | None |
| `application-backend-websocket-contract.md` | Pass | Pass | Pass | Pass | Pass | None |
| `application-communication-boundaries.md` | Pass | Pass | Pass | Pass | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Larger requirement plus refactor is explicit. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership, duplicated coordination, and shared-structure looseness are tied to real current/stopped-proposal paths. | None |
| Refactor decision is explicit | Pass | Focused refactor is required now; unsupported identity/mobile and other extensions are deferred or excluded. | None |
| Refactor decision is reflected in concrete design | Pass | Communication, Streaming, Orchestration, Gateway, Host, contracts, files, removal, and sequencing are actionable. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Binding creation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Address handoff | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-003` | Desktop standard connection/READY | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Standard input | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Standard event return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | Binding-terminal close | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | Backend observer | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | Optional custom WebSocket | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-009` | Notifications | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-010` | Durable artifacts | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-011`–`DS-016` | Bounded local state/queue/session | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Desktop host/bootstrap/frontend transport | Pass | Pass | Pass | Pass | Fixed application-scoped bases; no client auth or application-scope selector. |
| Standard connection / Communication | Pass | Pass | Pass | Pass | Fixed SDK connection; no raw runtime/socket API. |
| Streaming / Orchestration | Pass | Pass | Pass | Pass | Streaming consumes one authorized lease; no store/hub/runtime bypass. |
| Backend observer adapter | Pass | Pass | Pass | Pass | Optional worker adapter over the same target/projector authority. |
| Custom WebSocket / Gateway / Backend Host | Pass | Pass | Pass | Pass | Normalized business request and trusted application scope cross the process boundary. |
| Manifest/bundle/definition/summary | Pass | Pass | Pass | Pass | One declared authority; actual declarations and derived observation remain distinct. |
| Notification/artifact planes | Pass | Pass | Pass | Pass | Preserved independent owners. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Standard adapter → Communication → Streaming → Orchestration | Pass | Pass | Pass | Pass | No Gateway/Engine/worker/native shortcut. |
| Communication → Orchestration input | Pass | Pass | Pass | Pass | Target authority remains in Orchestration. |
| Backend observer → Engine Host → Streaming | Pass | Pass | Pass | Pass | Optional adapter only. |
| Custom WebSocket → Gateway → Engine Host → Backend Host | Pass | Pass | Pass | Pass | Separate custom business protocol. |
| Desktop host → standard target codec / custom path-query transport | Pass | Pass | Pass | Pass | No artificial authentication composer or shared semantic blob. |
| Terminal writers → transition owner → lifecycle hub | Pass | Pass | Pass | Pass | Supported causes converge once. |

## Interface Boundary Verdict

| Interface / API / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Two binding returns and explicit mixed union | Pass | Pass | Pass | Low | Pass |
| `ApplicationAgentTargetAddress` | Pass | Pass | Pass | Low | Pass |
| `agentCommunication.connect` / standard wire | Pass | Pass | Pass | Low | Pass |
| Backend input/subscription / Orchestration lease | Pass | Pass | Pass | Low | Pass |
| `backend.connectWebSocket` / frame/error contract | Pass | Pass | Pass | Low | Pass |
| `webSocketRoutes[].open` / request/session/handler | Pass | Pass | Pass | Low | Pass |
| Desktop bootstrap / fixed bases | Pass | Pass | Pass | Low | Pass |
| Manifest/bundle/definition/exposure summary | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Binding/target/input authority | Pass | Pass | N/A | Pass | Extend Orchestration. |
| Runtime sources/provider evidence | Pass | Pass | N/A | Pass | Reuse listeners/evidence, not the native public protocol. |
| Desktop application host/bootstrap | Pass | Pass | N/A | Pass | Extend fixed application transport bases without adding auth. |
| Standard Communication/shared Streaming | Pass | Pass | Pass | Pass | Distinct real lifecycles justify both owners. |
| Generic backend WebSocket | Pass | Pass | Pass | Pass | Optional escape hatch is fully specified. |
| Paired-mobile infrastructure | Pass | Pass | N/A | Pass | Deliberately not reused: no supported application product path reaches it. |
| Durable artifacts/notifications | Pass | Pass | N/A | Pass | Preserved separately. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared contracts / frontend SDK / desktop host | Pass | Pass | Pass | Pass | Exact contracts, fixed bases, target codec, and custom path/query remain distinct. |
| Agent Communication | Pass | Pass | Pass | Pass | Standard session/READY/input/network owner. |
| Agent Streaming | Pass | Pass | Pass | Pass | Shared event consumer/projector/FIFO owner. |
| Application Orchestration | Pass | Pass | Pass | Pass | Application/binding/target/lifecycle/input authority. |
| Backend Gateway / Engine / Backend Host | Pass | Pass | Pass | Pass | Custom and advanced backend adapters only. |
| Manifests/devkit/generated packages | Pass | Pass | Pass | Pass | Exact v4/v1/v4 chain and clean rejection are mapped. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Two bindings/private field composition | Pass | Pass | Pass | Pass | No public generic binding. |
| Address/path codec/input/public event/agent frames | Pass | Pass | Pass | Pass | Tight shared subjects. |
| Custom frame/request/session/route contract | Pass | Pass | Pass | Pass | One normative authority. |
| Standard target URL vs custom path/query | Pass | Pass | Pass | Pass | Shared only where semantics match; no authentication abstraction. |
| Exposure declaration/discovery | Pass | Pass | Pass | Pass | Bundle authority, definition declarations, derived summary. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Agent/team bindings | Pass | Pass | Pass | Pass | Pass | Exact two-type public model. |
| Agent address/input/event/wire | Pass | Pass | Pass | Pass | Pass | Adapter-neutral and closed. |
| Custom WebSocket public/backend types | Pass | Pass | Pass | Pass | Pass | Network and handler responsibilities remain distinct. |
| Desktop application scope | Pass | Pass | Pass | Pass | Pass | Trusted host/route scope is not conflated with an application credential. |
| Package exposure structures | Pass | Pass | Pass | Pass | Pass | No manifest or summary authority copy. |

## File Responsibility Mapping Verdict

| File / Group | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner? | Re-Tightened After Shared Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Binding/address/event/connection contracts | Pass | Pass | Pass | Pass | Subject-led contract files. |
| Communication/Streaming/Orchestration lifecycle files | Pass | Pass | Pass | Pass | State, event, and authority split is actionable. |
| Custom frontend/Gateway/Engine/worker files | Pass | Pass | Pass | Pass | Complete end-to-end mapping. |
| Host bootstrap and application WS adapters | Pass | Pass | Pass | Pass | Fixed desktop bases and thin route validation; no auth composer. |
| Manifest/bundle/definition/validator files | Pass | Pass | Pass | Pass | Exact version/authority/regeneration path. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-agent-communication/` | Pass | Pass | Low | Pass | Standard session owner. |
| `application-agent-streaming/` | Pass | Pass | Low | Pass | Shared event-consumer owner. |
| Orchestration services | Pass | Pass | Medium | Pass | Focused internals behind the host facade. |
| Backend Gateway/Engine/worker WebSocket files | Pass | Pass | Medium | Pass | Each process boundary owns distinct state. |
| SDK contracts/frontend/desktop-host transport | Pass | Pass | Low | Pass | Contract, codec, transport, and bootstrap responsibilities are clear. |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Mandatory custom agent proxy / flat API / v3 iframe | Pass | Pass | Pass | Pass | Clean replacement. |
| Generic binding aliases/old binding summary export | Pass | Pass | Pass | Pass | Two public bindings only. |
| Old notification/worker owners and stopped partial shapes | Pass | Pass | Pass | Pass | Selective retain/rewrite/discard is explicit. |
| Temporary mobile-credential/application-auth additions | Pass | N/A | Pass | Pass | Remove rather than salvage; unrelated platform security stays untouched. |
| Six-flag/stale v3 generated packages | Pass | Pass | Pass | Pass | Regenerate or reject; no defaults. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual Path Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Iframe/frontend/backend definition current contracts | No | Pass | Pass | Strict v4 only. |
| Bundle exposure record | No | Pass | Pass | Seven required booleans; stale payloads rejected. |
| Standard versus optional custom path | No | Pass | Pass | Separate current capabilities, not fallback. |
| Native sockets | No | Pass | Pass | Preserved native product APIs, not application compatibility. |
| Persistence/replay/grants/auth | No | Pass | Pass | Explicitly excluded. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Reader / Semantic Evidence Sufficient? | Choice Is Proportionate? | Migration Safety If Required | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Binding rows, artifacts, application data | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Stored fields and meaning do not change. |
| Connection/subscription/request/queue/sequence state | Not persisted | Pass | Pass | N/A | Pass | Live/no-replay memory state only. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Dirty partial source reconciliation | Pass | Pass | Pass | Pass |
| Contracts, two bindings, strict v4 propagation | Pass | Pass | Pass | Pass |
| Orchestration/Streaming/Communication/backend observer | Pass | Pass | Pass | Pass |
| Generic backend WebSocket | Pass | Pass | Pass | Pass |
| Desktop bootstrap/standard/custom URL cutover | Pass | Pass | Pass | Pass |
| Removal of unsupported mobile/auth partials | Pass | Pass | Pass | Pass |
| Built-in/generated/package rebuild | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Needed? | Present And Clear? | Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent/team/member standard connection | Yes | Pass | Pass | Pass | Canonical usage is clear. |
| Provider/team projection | Yes | Pass | Pass | Pass | Closed-field examples cover exact projection. |
| READY/terminal interleaving | Yes | Pass | Pass | Pass | Winner, settlement, and FIFO disposition are explicit. |
| Optional custom backend WebSocket | Yes | Pass | Pass | Pass | Frontend/backend and failure behavior are covered. |
| Desktop fixed-base/target/custom path handling | Yes | Pass | Pass | Pass | Exact fixed mounts, target suffixes, business query, and no-auth surface are testable. |
| Manifest/exposure authority | Yes | Pass | Pass | Pass | Exact types and validation chain are shown. |

## Material Premise Validation (Only When Needed)

### `MP-R6-001` — Paired-mobile application WebSocket access

- Related approved requirement or established contract: desktop-only `BEH-010`, `REQ-007`/`AC-007`, and explicit scope exclusion.
- Relevant behavior ID(s): `BEH-002`, `BEH-008`, `BEH-010`.
- Product-supported initiating trigger or governing contract, with evidence: none. The user confirmed applications are absent from the mobile product surface. Existing mobile credential code serves other product surfaces and is not an application entry point.
- Concrete current or approved target production caller/event path: none from a paired mobile/phone UI into either standard or custom application WebSocket capability.
- Lifecycle preconditions and material consequence: the initiating application journey is absent, so no application session can reach the proposed token/collision/leak states through supported product behavior.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: mobile credential injection, token composition/collision handling, mobile errors, and mobile coverage do not drive this design and are explicitly removed. Pure technical URL construction or unrelated source existence is insufficient.

### `MP-R9-001` — A standard desktop connection can close while target attachment is pending

- Related approved requirement or established contract: `REQ-003`, `REQ-013`, `REQ-014` and `UC-001`–`UC-003`.
- Relevant behavior ID(s): `BEH-002`, `BEH-009`.
- Product-supported initiating trigger or governing contract, with evidence: a desktop application calls `agentCommunication.connect(address)` and receives a connecting object before asynchronous active-application/binding/runtime attachment completes.
- Concrete current or approved target production caller/event path: desktop application UI → SDK connect → standard adapter → Communication pending session → Streaming/Orchestration attach; user close, `AbortSignal`, iframe disposal, or transport close can occur before attachment returns.
- Lifecycle preconditions and material consequence: the supported connect is pending; a late attach without cancellation would leave a live listener/session after the user-visible connection closed.
- Reachability: `Reachable`
- Review consequence / proportionate response: pending registration, cancellation, first-cause serialization, and late-result release are justified; persistence or a global coordinator is not.

### `MP-R9-002` — A binding can terminate while a supported connection/subscription is pending or active

- Related approved requirement or established contract: `REQ-014`, `AC-013`/`AC-014`, existing binding lifecycle.
- Relevant behavior ID(s): `BEH-001`, `BEH-009`.
- Product-supported initiating trigger or governing contract, with evidence: application business can call terminate; existing run observers and recovery can record terminated/orphaned bindings.
- Concrete current or approved target production caller/event path: active desktop connection or backend subscription → Orchestration lifecycle lease; concurrently app terminate, run-observer terminal, or recovery orphan → terminal transition owner → lifecycle hub → Streaming/Communication close path.
- Lifecycle preconditions and material consequence: a consumer is pending/active for that binding; missing serialized terminal delivery could expose READY/events after binding end or leak listeners.
- Reachability: `Reachable`
- Review consequence / proportionate response: keyed terminal serialization, listener-before-final-read lease, paused READY commit, terminal drain, and exactly-once release are proportionate.

### `MP-R9-003` — A supported consumer can be slower than an agent-team event source

- Related approved requirement or established contract: `REQ-014`, `AC-014`/`AC-015`, `UC-002`/`UC-007`.
- Relevant behavior ID(s): `BEH-005`, `BEH-009`.
- Product-supported initiating trigger or governing contract, with evidence: whole-team events can originate from root, members, and task agents while frontend/network or backend observers process asynchronously.
- Concrete current or approved target production caller/event path: bound TeamRun event source → exact projector → one consumer FIFO → desktop WebSocket or Engine/worker observer transport → application listener.
- Lifecycle preconditions and material consequence: an authorized live consumer is connected and its downstream transport/listener falls behind; without a bound, runtime callbacks or memory could be blocked/unbounded.
- Reachability: `Reachable`
- Review consequence / proportionate response: one bounded Streaming FIFO per consumer, transport-specific bounds, synchronous no-throw acceptance, and isolated close are justified; a second event backlog is forbidden.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — the user-approved desktop-only behavior basis is confirmed, the `DR-010` contract correction remains complete, the unsupported `DR-012` mobile premise is removed, and every retained failure/lifecycle mechanism has a supported production witness. The cumulative design is ready for selective implementation reconciliation.

## Findings

None.

## Classification

`Pass`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The dirty partial implementation is extensive and spans superseded proxy and temporary mobile/auth assumptions. Classify every changed/untracked file as retain, rewrite, or discard; do not resume it wholesale.
- Queue, frame, input, metadata, context-file, and socket-buffer limits remain implementation-owned; centralize them, test below/equal/above boundaries, and record them in the implementation handoff.
- Exact provider-neutral projection and whole-team/task-agent attribution require exhaustive fixtures across every declared event family.
- Strict v4 propagation spans contracts, parsers, devkit, built-ins, vendor/importable copies, and generated output; stale v3 or six-flag artifacts must fail rather than default.
- Raw custom request URLs require boundary discipline: only normalized path, params, business query, sanitized headers, and trusted application scope should cross Gateway/worker boundaries.
- API/E2E must exercise real desktop browser WebSocket READY/input/event/terminal ordering, custom text/binary/worker races, repeated business query, backpressure, and cleanup. Mobile credential execution is not part of this application feature.
- This is a static architecture review; no implementation build or source test result is claimed.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — `MP-R6-001` is `Not Reachable` and drives no machinery; retained cancellation, terminal, and backpressure mechanisms have supported desktop/product caller paths.
- Notes: round 8 is resolved. `DR-009`–`DR-011` remain resolved; `DR-012` is obsolete on the clarified product basis; implementation may begin only through the reviewed selective-reconciliation sequence.
