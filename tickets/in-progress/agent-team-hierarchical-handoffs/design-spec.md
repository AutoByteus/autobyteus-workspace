# AgentTeam Hierarchical Communication And Handoffs — Design Spec

## Current-State Read

The approved behavior basis is [requirements.md](./requirements.md), supported by the production-path evidence in [investigation-notes.md](./investigation-notes.md) and the normative examples in [agent-team-addressing-handoff-contract.md](./agent-team-addressing-handoff-contract.md).

The current system already has a truthful recursive execution topology. `TeamDefinitionTopologyPlanner` expands nested AgentTeam definitions into `TeamRunConfig.memberTree`; every placement receives a `memberPath` and `memberRouteKey`; `MixedPersistentMemberRegistry` enters a top-level subteam handle for nested selectors; and `MixedSubTeamMemberHandle` strips one path segment at each child boundary. Team events take the reverse route and receive their parent prefix through `prefixMixedSubTeamEvent`.

Agent-facing communication does not use that topology as its namespace. `MemberCommunicationRosterBuilder` projects direct Agents, synthetic child-coordinator representatives, and selected parent Agents into a sender-specific flat roster. `MemberTeamContextBuilder` materializes that projection for instructions, while `TeamMessageRecipientResolver` independently rebuilds it for delivery. This is a duplicated policy boundary: prompt-visible reachability and runtime reachability can drift, same-named leaves cannot be expressed truthfully, and non-coordinator child members cannot navigate upward.

Definition ownership is distributed intentionally. Shared/team-local definitions use `team-definition-config.ts`; application-owned definitions use `application-owned-team-source.ts`; GraphQL owns independent input/output shapes; and the service/graph validator coordinates semantic validation. Run restoration is likewise explicit: current-format `team_run_metadata.json` is normalized by `team-run-metadata-schema.ts`, converted back to `TeamRunConfig`, and then used to reconstruct the mixed runtime. The target design must extend every one of those authorities without adding a parallel schema.

The current public selector split is healthy and remains authoritative. `SendMessageToDispatcher` sends `target_agent_run_id` only through `GlobalAgentRunMessageRouter`, while `recipient_name` enters Team delivery through `MemberTeamContext`. The Team resolver still contains an unreachable second exact-run/task-run branch; the clean replacement removes that branch rather than creating another compatibility route.

Two downstream boundaries are coupled to the current flat model and must be corrected before removal. First, `delegate_task` is itself a second flat recipient authority: its public schema requires `{target:{kind:"member"|"team",name}}`, `DelegationTargetRosterBuilder` advertises direct names, `TaskDelegationInputResolver` matches those names, and Team ingress is converted from `SubTeamMemberTeamDescriptor.representative`. The user explicitly clarified in SR-004 that task delegation and ordinary messaging select the same logical recipient and therefore must share one address model. Second, shared dispatch already returns `AgentOperationResult.code`, including unchanged exact-run router codes, but `AutoByteusSendMessageToTool` and `AgentToolsMcpResultMapper.toolResultFromOperationResult` currently reduce results to message-only text. Removing representatives or merely defining domain errors without correcting these boundaries would break BEH-011 or leave BEH-002/005/007/009 unobservable.

SR-003 corrected an additional prerequisite: current child topology localization is incomplete. `stripMemberPathPrefix` recursively rebases descendant `memberPath` and `memberRouteKey` while preserving nested Team `coordinatorMemberRouteKey` verbatim. `MixedSubTeamRunFactory` then strips only the newly created child's own top-level coordinator route. At three levels, a localized Team can therefore point at `research_team/field_team/field_lead` while its direct Agent is `field_team/field_lead`. Neither the common placement resolver nor task ingress mapping may guess between those shapes; the TeamRun config localization owner must establish one exact local identity at each child boundary.

Current task activation is intentionally run-local: `TaskDelegationService` binds a ledger and activation coordinator to one `TeamRun`, and the mixed task registries activate direct members of that run. A shared root resolver can identify deeper or cross-branch placements, but the user clarification changes addressing rather than task ownership. SR-004 therefore preserves current direct-member/current-TeamRun eligibility as explicit task policy after shared resolution; non-direct resolved placements fail before activation.

`ARCH-REV-003` confirmed that shared resolver and task boundary but found the first proposed placement value too broad. Returning `TeamMemberRunConfig` / `TeamSubTeamMemberRunConfig` through `TeamRun.resolveLogicalPlacement` would leak the exact config internals the facade is meant to hide, while `owningTeamRunId` would name a static root-snapshot run even when a supported task-scoped TeamRun is the active logical owner. No consumer needs those fields: the root mixed manager privately owns delivery config/handles, and the task mapper intentionally obtains execution IDs/settings from the caller's current canonical local config. SR-005 therefore narrows DS-009 to immutable logical coordinates, structural owner-local pairing, and exact Team ingress only.

SR-005 subsequently passed `ARCH-REV-004`, was implemented in commits `2ed26efb9` / `93cc7ed34`, passed code review and API/E2E, and reached delivery checkpoint `c3cafa6a4`. Final user verification then exposed one remaining shared-structure looseness. The implemented `MemberLogicalAddressContext` stores `memberAddress`, `memberPath`, `immediateTeamAddress`, and `immediateTeamPath`; its factory accepts both paths and validates only their lengths. The implemented placement repeats canonical subject address as Agent route key and owner Team/local path/route. Those fields are not independent domain facts: after mounting, the canonical address deterministically yields them.

SR-006 applies the shared design principles' tight-structure rule. The mounted topology remains the identity owner. Each member binding contains only the collaboration-root run ID and one canonical Agent address. The address domain derives segments, parent Team, basename, and root route selector. The one operation-neutral resolver returns only Agent kind/address or Team kind/address plus its configured ingress Agent address. Message delivery derives the private selector from the effective Agent address; task delegation derives direct-parent eligibility and the current-local member name from canonical parent/basename functions before existing exact config/activation logic.

Nested TeamRuns continue to use child-local execution paths/routes and a parent-boundary callback. Those older execution/history/event identities remain private projections and are not a second collaboration address authority. Repository evidence shows that whole-system removal would span dozens of runtime, persistence, status/event, conversation, and task files; it is explicitly deferred to a separate topology-normalization investigation. SR-006 preserves lazy child lifecycle, DS-011 localization, task/token/memory ownership, event prefixing, handoff snapshots, provider envelopes, and all approved observable behavior.

## Intended Change

1. Introduce a runtime-neutral `agent-collaboration` contract for strict logical addresses, handoff edges, and typed contract failures.
2. Extend AgentTeam definition domain, file sources, service validation, and GraphQL with ordered `handoffs: [{from,to,rules}]`.
3. Resolve the recursive definition graph once per validation/launch concern, enforce path-safe case-insensitive sibling uniqueness, and compile deterministic effective handoffs by rebasing each mounted definition.
4. Store the effective handoffs in `TeamRunConfig` and top-level TeamRun metadata; missing fields normalize to `[]`.
5. Replace partial child-path stripping with one strict TeamRun-config localization operation that recursively rebases the created child's coordinator, every descendant member path/route, and every nested Team coordinator route, validating each coordinator against exactly one direct Agent.
6. Replace the flat communication roster and generic `MemberTeamContext.members` with one `MemberLogicalAddressContext` shared by collaboration and task delegation. In SR-006 its exhaustive shape is `{rootTeamRunId,memberAddress}`; outgoing handoffs/delivery and task caller/lifecycle data remain in their own composed contracts.
7. Interpret both `send_message_to.recipient_name` and `delegate_task.recipient_name` exclusively as `/...` or `./...`; derive the caller's immediate Team from `memberAddress`, canonicalize once, and resolve against the root `memberTree` to Agent `{kind,address}` or Team `{kind,address,ingressAddress}` only.
8. Add configured, Team-bound `get_handoff_rules` wrappers for AutoByteus and Agent Tools MCP, backed by one shared read service.
9. Normalize both communication-tool outcomes to one provider-visible `{accepted,code,message,result}` envelope. AutoByteus returns its canonical JSON text; MCP returns the same JSON text and object in `structuredContent`, with `isError` set only for rejection.
10. Change `delegate_task` cleanly from `{target:{kind,name}}` to `recipient_name`; infer Agent versus Team from the resolved placement, derive caller/target parent addresses and target basename, enforce existing direct-target/current-TeamRun eligibility, and map the eligible root placement to exact local task identity/real ingress before existing activation.
11. Replace roster instructions with the caller's canonical Agent address, a derived immediate Team address, shared path grammar, operation-specific Team behavior, and read-before-handoff guidance.
12. Remove synthetic representatives, parent-recipient exposure, bare-name fallback, the task target-name/kind roster and mapper, and the unused Team-local exact-run/task-run resolver branch only after canonical localization, common placement resolution, and exact current-Team task mapping are connected.
13. Remove address-derived paths, immediate-Team fields, route keys, subject wrappers, and owner coordinates from the shared context/placement boundary; do not expand this cleanup into the separately persisted TeamRun execution/history/event identity system.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | R-001–R-006, R-019; AC-001–AC-005, AC-016 | File or GraphQL AgentTeam definition read/write | Investigation §Relevant Existing Behavior, BEH-001 | Every ownership scope round-trips validated ordered handoffs; omission means `[]`. | Definition API/source -> domain -> resolved definition graph -> handoff compiler -> canonical writer/read model (DS-001) |
| BEH-002 | System | R-007–R-010, R-014; AC-006–AC-010 | Team-bound `send_message_to({recipient_name})` | BEH-002 | Only rooted `/`/`./` logical paths are accepted; no roster lookup or fallback. | Runtime tool -> shared dispatcher -> collaboration intent -> root delivery owner -> logical resolver -> member handle (DS-003) |
| BEH-003 | System | R-008–R-010, R-016, R-025; AC-007–AC-011 | Nested/upward/cross-branch Team message | BEH-003 | Any Agent placement can reach any valid placement in the same root; actual sender and final Agent identities are projected. | Child Agent -> unchanged root-bound intent -> parent callback chain -> root resolver -> destination branch handles (DS-003, DS-007) |
| BEH-004 | Contract | R-003, R-005, R-007–R-009, R-017, R-023; AC-003, AC-006–AC-009, AC-014, AC-018 | Team definition validation, TeamRun launch, and child create/restore | BEH-004 | Root recursive paths remain the collaboration authority; each child TeamRun receives a strictly localized tree whose nested coordinator routes exactly match direct local Agents. | Definition graph -> root topology -> `localizeSubTeamRunTopology` at each child factory boundary -> local runtime config; root resolver still consumes root topology (DS-002, DS-011, DS-009) |
| BEH-005 | Contract | R-011–R-013, R-021, R-026; AC-012, AC-013, AC-019 | Configured Team-bound `get_handoff_rules` call | BEH-005, verified absent | Return caller address plus only its outgoing effective edges inside the canonical result envelope; empty is success; non-Team is a coded rejection. | Runtime wrapper/MCP adapter -> shared handoff read service -> member collaboration projection -> provider envelope mapper (DS-004) |
| BEH-006 | System | R-013, R-014, R-023, R-027; AC-013, AC-018, AC-022 | Team member runtime bootstrap/turn | BEH-006 | Render truthful current Agent/Team addresses and one shared recipient grammar for message/task tools; never inline the full rule set or advertise flat target names. | Provider bootstrap -> shared instruction composer -> logical-address/collaboration instruction renderer (DS-004, DS-010) |
| BEH-007 | Contract | R-015, R-026; AC-015, AC-019 | `send_message_to({target_agent_run_id})` | BEH-007 | Preserve the existing global live-only direct route, absence of Team Communication projection, and exact internal code while adding only provider serialization. | Runtime tool -> shared dispatcher -> `GlobalAgentRunMessageRouter` -> active AgentRun -> unchanged code in provider envelope (DS-006) |
| BEH-008 | Operational | R-017, R-018, R-020; AC-014, AC-017 | Create/terminate/restore TeamRun | BEH-008 | Persist and restore the effective handoff snapshot without reading current definitions; absent historical field becomes empty. | Launch config -> metadata mapper/store -> restore mapper -> config/runtime binding (DS-002, DS-005) |
| BEH-009 | Contract | R-021, R-026, R-027; AC-019, AC-022 | Configured server-owned tools on AutoByteus, Codex, or Claude | BEH-009 | All runtimes consume the same tool constants, shared address context/resolver, task schema, communication services, and result-envelope normalizer where applicable. | AutoByteus bound tools or Agent Tools MCP adapters -> shared address/task/communication services -> provider projections (DS-003, DS-004, DS-006, DS-010) |
| BEH-010 | User | R-022; AC-020 | TeamRun user post with no member target | BEH-010 | Root coordinator selection remains unchanged and continues to require a direct Agent coordinator. | User input -> `TeamRun.resolvePostMessageTarget` -> configured coordinator -> AgentRun (preserved outside DS-003) |
| BEH-011 | Contract | R-023, R-027; AC-018, AC-022 | Team-bound `delegate_task({recipient_name})`, result/review, and exact task-run messaging | BEH-011 | Address parsing and placement identity are shared with message delivery; current direct-target eligibility, real Team ingress, lifecycle, and exact task-run routes remain task-owned. Flat kind/name lookup and communication representatives are removed. | Runtime task tool -> shared address context/parser -> root `TeamLogicalPlacementResolver` -> direct-target/local identity mapper -> existing current-TeamRun task lifecycle (DS-009, DS-010, DS-011); exact task-run remains DS-006 |
| BEH-012 | Refactor | R-028–R-031; AC-023–AC-025 | Any persistent/restored/task member uses message or task recipient addressing | Investigation §18 and 2026-08-04 source log | One canonical address is the only shared placement identity; paths, parents, local names, and selectors are derived. Shared context/result fields are contracted without observable behavior change. | Mounted topology -> minimal caller coordinate -> DS-009 minimal placement -> derived message/task policy -> existing delivery/activation/result paths (DS-003, DS-009, DS-010) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| [agent-team-addressing-handoff-contract.md](./agent-team-addressing-handoff-contract.md) | Normative shared message/task grammar, canonical-address derivation, schema, mounting, tool result, error, and scenario contract | R-001–R-031 / AC-001–AC-025 | Defines the public behavior and minimal shared caller/placement boundary that the spines/examples below implement. | `Refined — SR-006 user-approved; ready for architecture re-review` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`, `Feature`, and `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, `Shared Structure Looseness`, and `Legacy Or Compatibility Pressure`.
- Refactor needed now: `Yes`.
- Evidence: SR-005 removed the competing flat authorities, representative coupling, partial localizer, and provider code loss, but the implemented shared context/result still carry redundant address/path/parent/route representations. `createMemberLogicalAddressContext` accepts contradictory path arrays that satisfy its length-only guard, and every placement consumer reconstructs facts already encoded by the canonical address.
- Design response: retain the implemented topology/compiler/resolver/operation boundaries, but contract the shared caller to `{rootTeamRunId,memberAddress}` and placement to Agent `{kind,address}` or Team `{kind,address,ingressAddress}`. Put all segment/parent/basename/selector derivation in the strict collaboration-address domain. Message/task consumers derive only their local needs; no owner DTO survives.
- Refactor rationale: adding handoffs to the roster would create a third policy view and make the later AgentOrg work depend on a known false boundary. The clean refactor is required for correct cross-branch behavior and for stable restoration.
- Intentional deferrals and residual risk: native AgentOrg, dynamic reconciliation, frontend authoring UI, external Agent package configuration, and whole-execution `memberPath`/`memberRouteKey`/coordinator-route normalization remain out of scope. The last item is an older persisted/runtime identity system crossing at least 78/128/34 production files by field name and needs a separate investigation; SR-006 prevents it from leaking into the shared collaboration boundary.

## Terminology

- **Collaboration address**: canonical logical path beginning with `/`; `/` denotes the outermost Team placement.
- **Runtime address input**: either a collaboration-root absolute address (`/...`) or an immediate-Team-relative address (`./...`).
- **Canonical member address**: the one mounted absolute Agent address stored in caller collaboration identity. Its segment path, basename, parent Team, and root selector are derived values.
- **Team placement**: a Team node mounted at a collaboration address; targeting it means coordinator ingress.
- **Agent placement**: an executable Agent leaf at a collaboration address.
- **Definition mount path**: the effective collaboration path at which one reusable AgentTeam definition is placed.
- **Effective handoff**: an authored `{from,to,rules}` edge after its definition-local endpoints have been rebased under the mount path.
- **Member collaboration context**: the focused per-Agent projection containing minimal caller coordinate, outgoing edges, and Team delivery wiring. It is composed by, but not synonymous with, `MemberTeamContext`.
- **Member logical-address context**: exactly the root TeamRun ID plus canonical caller Agent address shared by recipient-oriented operations; it contains no derived path/parent/route, handoff rules, target roster, delivery mechanism, or task lifecycle state.
- **Resolved Team logical placement**: the single typed result of canonical root traversal: Agent kind/address or Team kind/address plus exact configured ingress Agent address; it contains no subject wrapper, owner/path/route coordinate, config, handle, runtime setting, or run/member lifecycle ID.
- **Task target mapper**: task-owned conversion from a resolved logical placement into `TaskDelegationMemberIdentity` or `TaskDelegationTeamIdentity`; it performs task eligibility and never parses an address or searches a flat roster.
- **Subteam run topology localization**: the one-way transformation from a Team member config expressed in its parent TeamRun namespace to the canonical configuration of the child TeamRun, including all descendant member and coordinator routes.
- **Provider-visible communication result envelope**: `{accepted:boolean, code:string, message:string, result:object|null}` serialized identically by AutoByteus and MCP for `send_message_to` and `get_handoff_rules`.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope behavior: bare logical recipient names; case-insensitive/global leaf guessing; flat allowed-recipient rosters; `delegate_task` caller-supplied `{kind,name}` and direct target roster lookup; child-coordinator representatives; coordinator-only parent exposure; Team-local exact-run/task-run resolution; parent-boundary participant rewriting used only for synthetic representation.
- Required action: delete those structures and tests once the rooted common placement path and exact current-Team task mapper are connected. Do not keep hidden message or task fallbacks behind `recipient_name`.
- Current data compatibility is not legacy runtime compatibility. Missing optional `handoffs` remains valid current data and normalizes to `[]`; malformed or old flat recipient input is rejected.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  - AgentTeam `team-config.json` in shared, team-local, and application-owned sources; observed repository data contains a small set of current configs with path-safe members and no `handoffs`.
  - Top-level TeamRun `<memoryDir>/agent_teams/<teamRunId>/team_run_metadata.json`; volume is user-specific, and current records contain recursive `memberTree` but no handoff field.
  - Existing `task_delegation_records.json` records persist structured sender/receiver `ConversationTargetAddress` plus `receiverTargetKind`; they do not persist the live `{target:{kind,name}}` tool selector.
- Relevant code-model, serialization, semantic, or physical-store change: add optional authored definition handoffs and optional effective run-metadata handoffs. Existing member topology/run identity and persisted task record fields do not change meaning; the live `delegate_task` input changes without a task-record rewrite.
- Normal reader/writer behavior and representative evidence: definition and metadata readers already construct current records field-by-field; writers reconstruct canonical JSON. Extending each reader with `missing -> []` and each writer with the new canonical array preserves current data directly.
- Required semantics and invariants under direct use: omission must mean no native handoff edges; rule order/text on present valid edges must be preserved; restored runs must retain their stored snapshot; existing member paths/run IDs must remain unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: existing atomic JSON writes remain sufficient. Handoff prose is user-authored policy data but introduces no new secret store. No downtime, bulk I/O, destructive rewrite, or quarantine is justified.
- Decision: `Directly Usable — No Migration`.
- Decision rationale: current records have all required meaning. Rewriting every definition/history record would add I/O and corruption/recovery risk without changing semantics. Normal future writes may include `handoffs: []`, but no migration command or version branch is introduced.
- Acceptance criteria or design constraints supported by this decision: AC-001, AC-002, AC-014, AC-016, AC-017; R-001, R-017–R-020.

### Migration Plan

N/A — the decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Team config / GraphQL create-update | Canonical definition persistence/read model | `AgentTeamDefinitionService` | Establishes one authored handoff contract across all definition surfaces. |
| DS-002 | Primary End-to-End | BEH-004, BEH-008 | TeamRun create request | Immutable `TeamRunConfig` plus stored metadata | `TeamRunService` with topology planner | Compiles topology and effective handoffs at the launch boundary. |
| DS-003 | Primary End-to-End | BEH-002, BEH-003, BEH-009, BEH-012 | `send_message_to.recipient_name` | Exact recipient AgentRun input and code-preserving provider envelope | Root `MixedTeamManager` / delivery coordinator | Consumes the minimal shared placement, derives its private selector from the effective Agent address, then preserves lazy nested transport and the public result span. |
| DS-004 | Primary End-to-End | BEH-005, BEH-006, BEH-009 | `get_handoff_rules` or runtime bootstrap | Caller-only handoff envelope / protocol instructions | `GetHandoffRulesService` and instruction composer | Separates rule retrieval from prompting while keeping provider serialization canonical. |
| DS-005 | Primary End-to-End | BEH-008 | Stored TeamRun metadata | Restored root collaboration snapshot and lazy child bindings | `TeamRunMetadataMapper` | Prevents mutable definitions from changing historical runs. |
| DS-006 | Primary End-to-End | BEH-007, BEH-011 | `target_agent_run_id` | Active exact AgentRun and unchanged-code provider envelope | `GlobalAgentRunMessageRouter` | Preserves the distinct exact-run subject/codes and prevents topology leakage. |
| DS-007 | Return-Event | BEH-002, BEH-003 | Recipient acceptance/member event | Root Team Communication/history/stream projection | `TeamMemberDeliveryCoordinator` / Team event bridge | Records real source/final Agent identities exactly once. |
| DS-008 | Bounded Local | BEH-001, BEH-004, BEH-008 | Resolved definition graph | Ordered effective handoff array | `TeamHandoffCompiler` | Rebases child edges and rejects invalid/duplicate composed edges deterministically. |
| DS-009 | Bounded Local Shared | BEH-002, BEH-003, BEH-011, BEH-012 | `/...` or `./...` plus `{rootTeamRunId,memberAddress}` | Agent `{kind,address}` or Team `{kind,address,ingressAddress}` | `TeamLogicalPlacementResolver` | Makes message and task recipient identity literally identical without carrying derived paths, routes, owners, or operation policy. |
| DS-010 | Primary End-to-End | BEH-011, BEH-012 | `delegate_task.recipient_name` | Existing current-TeamRun task-Agent/task-Team lifecycle for an eligible resolved placement | `TaskDelegationService` with `TaskDelegationTargetMapper` | Derives direct-target eligibility and exact local-name mapping from canonical addresses after DS-009, then reuses existing activation/lifecycle without flat lookup. |
| DS-011 | Bounded Local | BEH-004, BEH-011 | Parent-context-prefixed `TeamSubTeamMemberRunConfig` | Canonical child coordinator route plus recursively localized child `memberTree` | `localizeSubTeamRunTopology` in `team-run-config.ts` | Establishes one truthful local identity shape before persistent/restored/task child runtime or exact task ingress mapping. |

## Primary Execution Spine(s)

- **DS-001 — definition authoring:** `File/GraphQL input -> source-shape parser/converter -> AgentTeamDefinition -> AgentTeamDefinitionService -> resolved definition graph + handoff validation -> canonical source writer / GraphQL output`
- **DS-002 — launch compilation:** `CreateTeamRun -> TeamDefinitionTopologyPlanner -> TeamDefinitionGraphResolver -> TeamHandoffCompiler -> TeamRunConfig(memberTree,effectiveHandoffs) -> run identity assignment -> AgentTeamRunManager -> metadata store`
- **DS-003 — hierarchical delivery:** `Runtime tool/MCP -> SendMessageToDispatcher -> {rootTeamRunId,memberAddress} -> root MixedTeamManager.resolveLogicalPlacement (DS-009) -> message recipient policy (Team -> ingressAddress; self rejection) -> address-derived private selector -> top-level member handle -> child handle(s) -> recipient AgentRun -> AgentOperationResult -> AgentCommunicationToolResultEnvelope -> AutoByteus JSON or MCP text/structuredContent`
- **DS-004 — rule retrieval:** `Runtime tool/MCP -> GetHandoffRulesService -> MemberCollaborationContext.outgoingHandoffs -> AgentCommunicationToolResultEnvelope -> AutoByteus JSON or MCP text/structuredContent`
- **DS-005 — restore:** `team_run_metadata.json -> schema normalizer -> TeamRunMetadataMapper -> TeamRunConfig(memberTree,effectiveHandoffs) -> root collaboration runtime context -> lazy child MemberCollaborationContext projections`
- **DS-006 — preserved exact route:** `Runtime tool/MCP -> SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> active AgentRun -> original AgentOperationResult.code -> AgentCommunicationToolResultEnvelope`
- **DS-009 — shared logical placement:** `message delivery or task tool -> root MixedTeamManager.resolveLogicalPlacement (direct internal call or root TeamRun/backend facade) -> strict AgentCollaborationAddress parser -> derive parent(caller.memberAddress) for ./ expansion -> root TeamRunConfig.memberTree traversal by memberName -> minimal Agent/Team placement + exact Team ingressAddress`
- **DS-010 — hierarchical task delegation:** `Runtime task tool/MCP -> {rootTeamRunId,memberAddress} -> DS-009 -> derive parent(caller), parent(target), basename(target), and Team ingress basename -> TaskDelegationTargetMapper exact direct current-local identity/ingress -> current TeamRun task-Agent/task-Team activation -> existing ledger/submission/review/settlement lifecycle`
- **DS-011 — child topology localization:** `Parent TeamRun subteam config -> localizeSubTeamRunTopology -> localized root coordinator + recursive member tree -> MixedSubTeamRunFactory TeamRunConfig -> persistent/restored/task child exact local runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Source adapters parse the tight handoff shape without changing valid text/order. The definition service resolves the graph and validates semantic endpoints before a normal write or successful API result. | Definition source, `AgentTeamDefinition`, resolved definition graph | `AgentTeamDefinitionService` | GraphQL mapping, source-specific ref localization, typed error projection |
| DS-002 | Launch resolves the reusable definition tree, hydrates member launch configs, compiles all mounted handoffs in deterministic preorder, assigns runtime IDs, and persists the resulting effective snapshot. | Definition graph, Team topology, run config | `TeamRunService` | ID assignment, metadata serialization, cache freshness |
| DS-003 | Shared resolution returns the same typed placement available to task delegation. Message policy converts a Team placement to its exact ingress Agent, rejects effective self, and asks the root mixed manager to traverse existing handles to that Agent. The resulting `AgentOperationResult` is normalized without changing its code and serialized through the collaboration-specific provider mapper. | Caller address context, resolved placement, recipient AgentRun, provider result envelope | Root `MixedTeamManager` for delivery; `AgentCommunicationToolResultMapper` for public projection | Lazy child startup, reference files, communication events |
| DS-004 | The service reads an already caller-filtered launch snapshot and returns a coded envelope with the data under `result`; missing context returns the same envelope shape with `result:null`. AutoByteus and MCP wrappers only serialize/project that envelope; instructions advertise the protocol but not rule contents. | Member collaboration projection, outgoing handoffs, provider result envelope | `GetHandoffRulesService` and `AgentCommunicationToolResultMapper` | Configuration gating, MCP structured result, AutoByteus JSON rendering |
| DS-005 | Restore accepts an absent snapshot as empty or uses the stored effective edges exactly; it never consults current definitions for handoff meaning. Child contexts inherit the restored root binding when started. | TeamRun metadata, run config, runtime collaboration binding | `TeamRunMetadataMapper` | Strict schema normalization, atomic persistence |
| DS-006 | Exact live run IDs bypass Team collaboration resolution exactly as today. The provider mapper copies router success/rejection codes exactly; it does not translate them to collaboration codes. | Sender AgentRun, exact target AgentRun, provider envelope | `GlobalAgentRunMessageRouter`; public projection by result mapper | grants, active-run lookup, direct event projection |
| DS-007 | Recipient acceptance triggers one root-owned Team Communication payload; nested member-input/runtime events continue to prefix through the existing child event bridge. | Delivery request, communication event, member input event | `TeamMemberDeliveryCoordinator` | IDs/dedupe, address projection, history subscribers |
| DS-008 | For each mounted definition, authored endpoints resolve inside that definition subtree, receive the mount prefix, preserve edge/rule order, and join one root array; conflicts fail the compile. | Mounted definition, authored edge, effective edge | `TeamHandoffCompiler` | address parser, coordinator lookup, error typing |
| DS-009 | The resolver parses once, derives the caller's immediate Team from `memberAddress`, expands `./`, and walks the root `memberTree` by exact sibling `memberName`. Its private cursor tracks the visited canonical address and configured Team coordinator; it returns only Agent kind/address or Team kind/address/ingressAddress and applies no operation. | Minimal caller coordinate, canonical address, root topology, minimal placement | `TeamLogicalPlacementResolver` | strict syntax errors, address derivation, Team ingress validation |
| DS-010 | The task tool accepts only `recipient_name`. Before task ID reservation or ledger mutation, the mapper derives caller/target parent addresses and requires equality, rejects self/root Team, derives the target basename, and matches exactly one direct current-local config of the resolved kind. For Team targets it proves ingress parent equals Team address and maps the ingress basename to the exact configured direct coordinator Agent. Existing activation/lifecycle then runs unchanged. | Minimal placement, derived address views, current local run config, task target identity, task execution | `TaskDelegationTargetMapper` with `TaskDelegationService` | tool schema/parser, task reference files, task IDs, lifecycle notifications |
| DS-011 | The localizer takes one subteam config in its parent TeamRun namespace and its mount path as the sole prefix. It recursively requires descendant paths under that prefix, derives every localized route from the localized path, pairs each source Team coordinator with exactly one direct source Agent, and assigns that Agent's localized route to the localized Team. The factory uses the returned root coordinator/tree unchanged for create or restore. | Parent subteam config, source direct coordinator, localized child topology | `localizeSubTeamRunTopology`; lifecycle caller `MixedSubTeamRunFactory` | invariant errors, runtime IDs, restore runtime state |

## Spine Actors / Main-Line Nodes

| Node | Role On Spine |
| --- | --- |
| `AgentTeamDefinitionService` | Authoritative create/update semantic boundary. |
| `TeamDefinitionGraphResolver` | Produces one truthful reusable definition-placement tree and enforces topology/member invariants. |
| `TeamHandoffCompiler` | Owns authored endpoint resolution, mounting/rebasing, composition, and duplicate/self validation. |
| `TeamRunService` | Governs launch/restore orchestration and supplies the immutable run snapshot. |
| Root `TeamRun.resolveLogicalPlacement` | Public execution facade that lets task tooling call the same root manager placement method used internally by message delivery, without exposing config internals. |
| `MemberLogicalAddressContext` | Caller-specific `{rootTeamRunId,memberAddress}` shared by message and task tools; not a resolver, path cache, or operation context. |
| `MemberCollaborationContext` | Outgoing handoff and message-delivery binding composed around the shared address context. |
| `SendMessageToDispatcher` | Thin public selector boundary that preserves exact-run vs Team logical-route separation. |
| Root `MixedTeamManager` | Governs the single runtime placement-resolution method plus active root Team delivery; message delivery calls it internally and the TeamRun/backend facade exposes it to task tooling. |
| `TeamLogicalPlacementResolver` | Owns strict parsing/root traversal and returns the one typed Agent-or-Team placement consumed by both operations. |
| `TeamMemberDeliveryCoordinator` | Owns accepted recipient delivery sequencing and Team Communication publication. |
| `GetHandoffRulesService` | Owns sender-only handoff retrieval result semantics. |
| `AgentCommunicationToolResultMapper` | Owns canonical `{accepted,code,message,result}` normalization and stable JSON serialization for both communication tools. |
| `TaskDelegationTargetMapper` | Owns task eligibility and typed task identity/ingress mapping from a resolved placement. |
| `localizeSubTeamRunTopology` | Owns the one-way recursive parent-namespace-to-child-namespace TeamRun topology transformation, including all coordinator routes. |
| `GlobalAgentRunMessageRouter` | Preserved exact-run owner. |

## Ownership Map

- `AgentTeamDefinitionService` coordinates semantic validation and persistence; source providers parse/write their physical formats but do not decide endpoint meaning.
- `TeamDefinitionGraphResolver` owns definition-reference traversal, cycle detection, path-safe member identity, case-insensitive sibling uniqueness, direct-Agent coordinator invariants, and resolved placement paths. It does not hydrate runtime launch settings or deliver messages.
- `TeamHandoffCompiler` owns definition-local endpoint resolution, mount rebasing, source/target subject rules, rule validation, effective edge ordering, self-after-ingress rejection, and duplicate effective pair rejection.
- `TeamDefinitionTopologyPlanner` remains the launch topology/launch-config hydration owner, now consuming the resolved graph and compiler instead of independently rediscovering definition structure.
- `TeamRunConfig.memberTree` remains the runtime topology authority. `effectiveHandoffs` is complementary policy guidance, never a second topology or ACL.
- `MemberLogicalAddressContext` owns only the current member's root TeamRun ID and one canonical absolute `memberAddress`. `MemberCollaborationContext` composes it with filtered outgoing edges and logical delivery wiring. Task tool context composes the same address identity with the current TeamRun ID and task caller/instance state. Paths, names, parent Teams, and route selectors are derived through `collaboration-logical-address.ts`; `MemberTeamContext` owns neither address resolution nor target lists.
- `SendMessageToDispatcher` remains a thin selector facade. It delegates exact IDs to the global router and logical paths to the member collaboration boundary; it must not parse topology.
- Root `MixedTeamManager` owns the single active-runtime call into `TeamLogicalPlacementResolver` and the private post-policy conversion from an effective Agent address into config/participant/registry-handle delivery data; `TeamMemberDeliveryCoordinator` owns delivery sequencing. Non-root managers only forward root-bound message intents and do not resolve partial namespaces.
- `TeamLogicalPlacementResolver` consumes the shared caller address context and root run config privately. It returns only `{kind:"agent",address}` or `{kind:"team",address,ingressAddress}`; the Team ingress is retained because it is a configured topology fact rather than a syntactic derivative. It does not return paths, route keys, owner coordinates, config references, or lifecycle IDs; decide message/task self policy; create/start runs; publish events; or inspect handoffs.
- Root `TeamRun.resolveLogicalPlacement` is the public facade over the root manager's DS-009 method. Task tool routing uses this facade; root message delivery calls the same manager method internally. The mixed backend delegates without exposing `TeamRun.config`, and both paths return the identical immutable placement type.
- `GetHandoffRulesService` reads the bound member projection and returns data. Runtime adapters do not filter or interpret rules.
- `AgentCommunicationToolResultMapper` is the only collaboration provider-result normalizer. It copies a supplied internal code exactly, fills only documented absent-code defaults, orders the envelope fields, and supplies the canonical JSON serializer. MCP-specific mapping consumes the normalized envelope and must not pass collaboration results through the generic code-dropping operation mapper.
- `TaskDelegationTargetMapper` consumes `ResolvedTeamLogicalPlacement`, caller address/task identity, and the current canonical local `TeamRunConfig.memberTree`. It owns direct-parent/self eligibility and conversion to `TaskDelegationMemberIdentity` or `TaskDelegationTeamIdentity`. It derives the caller Team and target owner Team from their canonical addresses, requires exact parent equality before deriving the target basename, and only then matches exactly one direct current-local config of the resolved kind. It does not parse raw request input, traverse root topology, or inspect communication/handoff state. Persistent and task-scoped instances of the same logical Team therefore use the same address without any shared run-ID claim.
- `TaskDelegationService` remains scoped to the caller's current TeamRun. After shared root resolution and mapper eligibility, it invokes its existing activation, ledger, review, notification, and settlement owners unchanged. A resolved placement owned by another TeamRun is rejected rather than routed across managers in Ticket 1.
- `team-run-config.ts` owns subteam topology localization because the transformation changes `TeamRunMemberConfig` identity consistently across lifecycle consumers. `localizeSubTeamRunTopology` returns both the child root `coordinatorMemberRouteKey` and full localized `memberTree`; it does not know task delegation, collaboration mounts, handles, or restore state.
- `MixedSubTeamRunFactory` is the sole lifecycle adapter for persistent create, persistent restore, and task Team child runs. It calls the localizer once and passes its result into `TeamRunConfig` without a second `stripRoutePrefix`, route normalization guess, or nested repair.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL AgentTeam resolver | `AgentTeamDefinitionService` | Transport mapping and typed GraphQL error projection | Definition graph traversal or handoff semantics |
| File source adapters | `AgentTeamDefinitionService` plus graph/compiler validation | Physical JSON/Markdown parsing and writing | Cross-definition endpoint policy |
| `SendMessageToDispatcher` | Global router or Team delivery owner, depending on selector | One public tool contract and selector split | Root topology traversal, Team event publication |
| Root `TeamRun.resolveLogicalPlacement` | Root `MixedTeamManager.resolveLogicalPlacement` through the backend | Expose the same minimal placement method used by root message delivery to task tooling | Operation policy, task activation, message delivery, config/handle exposure, or run/member lifecycle identity |
| AutoByteus `get_handoff_rules` tool | `GetHandoffRulesService` | Native local tool wrapper | Rule filtering/evaluation |
| Agent Tools MCP handoff adapter | `GetHandoffRulesService` | MCP exposure/serialization | Provider-specific handoff behavior |
| AutoByteus `send_message_to` tool | `SendMessageToDispatcher` + result mapper | Native wrapper and canonical JSON projection | Rewording/dropping dispatcher codes |
| Communication-specific MCP adapters | shared communication services + result mapper | MCP text/structured projection | Generic operation-result mapping or code translation |
| AutoByteus/MCP `delegate_task` adapters | Root placement query facade + caller's current `TaskDelegationService` | Parse the one `recipient_name` field and project the existing task result/error contract | Address parsing, kind inference, flat target lookup, or target-manager routing |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `services/member-communication-roster-builder.ts` | Flat recipient derivation is no longer authoritative. | `MemberLogicalAddressContext` + `TeamLogicalPlacementResolver` | In This Change | Delete file and all production imports. |
| `services/member-team-roster-manifest.ts` | Prompt must describe grammar/identity, not a synthetic roster. | `member-collaboration-instruction-renderer.ts` using `MemberLogicalAddressContext` | In This Change | The same instruction states that `delegate_task.recipient_name` uses the same grammar. |
| `communicationRecipients`, `allowedRecipientNames`, `MemberTeamRecipientDescriptor`, and recipient-scope unions | These encode the removed flat projection. | `MemberCollaborationContext` | In This Change | Do not retain deprecated aliases. |
| `SubTeamRepresentativeDescriptor`, `AgentMemberTeamDescriptor`, `SubTeamMemberTeamDescriptor`, generic `MemberTeamContext.members`, representative builders, and representative fields | Generic member descriptors feed both flat message and task target views. | `MemberLogicalAddressContext` + `TeamLogicalPlacementResolver`; task identity from `TaskDelegationTargetMapper`. | In This Change | Connect common resolution and exact Team ingress before deletion. |
| Parent-boundary `parentMembers`, `parentTeamName`, `parentTeamDefinitionId`, and `representedSubTeam` communication projection | Root-bound intents no longer need an exposed parent roster or sender rewriting. | Minimal parent runtime boundary (`parentTeamRunId`, memory scope, delivery callback) plus root collaboration binding | In This Change | Retain only fields still used by memory/lifecycle transport. |
| `mixed-parent-boundary-delivery-intent.ts` | Sender identities are root-canonical before forwarding. | Unchanged root-bound forwarding in `MixedTeamManager` | In This Change | No compatibility normalization. |
| `InterAgentMessageParticipant.representedSubTeam` and related invariants/projection branches | Synthetic representation no longer exists. | Actual Agent placement identity | In This Change | Task-team address segments remain in their own `ConversationTargetAddress` logic. |
| Exact-run/task-run/parent-boundary branches and recovery-cache dependencies in `team-message-recipient-resolver.ts` | Public exact IDs already bypass Team delivery; parent lookup was roster-specific. | `GlobalAgentRunMessageRouter` and rooted logical resolver | In This Change | Tightens intent subject to logical Team address only. |
| Bare-name/representative tests and docs | They assert behavior explicitly replaced by the ticket. | Rooted path, ingress, cross-branch, and failure scenarios | In This Change | Coverage edit decisions remain API/E2E-owned after implementation review. |
| `DelegateTaskTargetInput`, `{target:{kind,name}}` schemas/parsers/descriptions, `TASK_TARGET_KIND_*` validation, and direct `memberName` target lookup | They expose a second public address authority and make callers repeat topology-owned kind. | `delegate_task.recipient_name` -> shared parser/resolver -> `TaskDelegationTargetMapper` | In This Change | No deprecated alias, dual schema, or kind/name fallback. |
| `DelegationTargetRosterBuilder` flat `targetName` authority and direct task target list in native/MCP context | Shared root addressing makes copied target names stale and incomplete. | Shared address instruction; optionally a non-authoritative canonical-address discovery manifest derived from root topology | In This Change | If retained for display, rename and emit canonical absolute addresses only; resolver never consumes it. |
| `task-delegation-context-member-mapper.ts` Team/subteam target mapping and native `representative` fallback | They translate the removed generic/communication-shaped descriptors into task identities. | Shared caller address-context mapper plus post-resolution `TaskDelegationTargetMapper`; native input carries caller/root identity only. | In This Change | A narrowly named caller identity mapper may remain. |
| `stripMemberPathPrefix` and `MixedSubTeamRunFactory.stripRoutePrefix` | Splitting member and coordinator localization across permissive helpers leaves nested Team coordinators stale. | Strict `localizeSubTeamRunTopology` in `team-run-config.ts` | In This Change | No alias/wrapper or root/local fallback remains. |

## Return Or Event Spine(s) (If Applicable)

**DS-007:** `Recipient AgentRun accepts input -> leaf member handle invokes root callback -> TeamMemberDeliveryCoordinator publishes one TeamRun COMMUNICATION event with actual sender/final Agent addresses -> TeamCommunicationService/history/WS subscribers -> frontend/event consumers`

The requested Team address is routing input only. The communication receiver remains the resolved coordinator Agent for Team ingress; no synthetic Team-as-Agent participant is emitted. Rejected resolution produces neither recipient input nor an accepted communication event.

Task return/event behavior remains on the existing current-TeamRun task spine: after an eligible target starts, task records continue to expose structured logical conversation addresses and typed receiver kind, and existing submission/review/notification/settlement ownership is unchanged. A resolution or eligibility rejection creates no starting execution and no activation event.

## Bounded Local / Internal Spines (If Applicable)

- **DS-008 parent owner:** `TeamHandoffCompiler`.
  - Chain: `Mounted definition -> validate authored edge -> resolve local from/to -> prefix mount -> resolve target ingress for self check -> deduplicate effective pair -> append immutable edge`.
  - Importance: mounting and composition are the non-trivial local compile cycle; making it explicit prevents launch and definition validation from implementing subtly different rebasing rules.
- **DS-009 parent owner:** `TeamLogicalPlacementResolver`.
  - Chain: `Runtime recipient input -> strict parse -> derive caller parent from canonical memberAddress -> caller-relative root normalization -> private root segment walk -> intermediate-Team enforcement -> canonical Agent/Team address -> exact configured ingress address if Team -> immutable minimal construction`.
  - Importance: message and task selection are identical only when this complete typed result, not just parser syntax, is shared. Operation-specific self/activation behavior remains downstream.
- **DS-010 bounded task owner:** `TaskDelegationTargetMapper` under the current TeamRun task service.
  - Chain: `Resolved placement -> derive caller/target parents -> exact direct-parent/self eligibility -> derive target basename -> exact current-local config pairing -> validate/derive Team ingress basename -> task identity/ingress -> existing activation`.
  - Importance: task semantics stay separate without reintroducing a second address lookup or silently expanding cross-TeamRun task ownership.
- **DS-011 parent owner:** `localizeSubTeamRunTopology`.
  - Chain: `Parent-local subteam config -> validate mount-prefix descendants -> recursively localize paths/routes -> resolve each source direct-Agent coordinator -> assign paired localized coordinator route -> return child root coordinator/tree`.
  - Importance: current-Team task ingress and task-Team materialization are exact only if every child config has one canonical local namespace at every recursive level.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Physical config parsing/writing | DS-001 | Definition service | Preserve canonical JSON shape across source scopes | Multiple legitimate source formats exist | Endpoint policy would drift by source. |
| GraphQL conversion/error projection | DS-001 | Definition service | Map inputs/outputs and typed `extensions.code` | Transport contract | Resolver would become a second validator. |
| Run ID assignment | DS-002 | TeamRunService | Attach root/member/child run IDs after compile | Runtime identity is launch-owned | Handoff compiler would depend on ephemeral IDs. |
| Metadata schema normalization | DS-002, DS-005 | Metadata mapper | Missing handoffs -> `[]`, strict present shape | Current-data direct use | Runtime would branch on metadata versions. |
| Tool configuration gating | DS-003, DS-004, DS-010 | Runtime tool exposure | Expose selected tools; handoff/task address tools additionally require Team address context | Existing server-owned policy | Providers would diverge. |
| MCP/native serialization | DS-003, DS-004 | Shared services | Serialize the same result for each runtime | Runtime wire differences | Adapters would interpret/filter rules. |
| Lazy subteam startup | DS-003, DS-010 | Mixed subteam and task-team member handles | Message delivery creates/restores only the traversed destination; an eligible direct Team delegation uses the existing task-Team child activation path | Existing lifecycle contract | Resolver would become a lifecycle manager. |
| Message delivery endpoint materialization | DS-003 | Root `MixedTeamManager` | Convert the chosen Agent coordinate to exact config, participant fields, registry handle, and downward selector without exporting them | Delivery needs rich active-runtime mechanics after operation-neutral resolution | Shared placement/facade would leak config and lifecycle identity. |
| Reference-file rendering/dedupe IDs | DS-003, DS-007 | Delivery coordinator | Preserve current recipient input and event integrity | Existing message contract | Address resolver would collect unrelated duties. |
| Task execution identity | DS-010 | Task delegation subsystem | Apply direct-target eligibility, pair root placement with current-local config, and preserve task Agent/Team execution identity | Address identity is common; execution identity is not | Message delivery could become a task lifecycle owner. |
| Subteam topology localization | DS-011 | TeamRun config / child factory | Convert parent-local mounted topology to canonical child-local topology for all lifecycle modes | Nested local runtime needs different route scope than root addressing | Owning-Team ingress/materialization would be forced to guess between shapes. |
| Collaboration provider envelope projection | DS-003, DS-004, DS-006 | Communication services | Preserve code/message/result across AutoByteus and MCP | Existing generic adapters drop codes | Typed errors would stop before the user/LLM boundary. |
| Instruction rendering | DS-004 | Member instruction composer | Render stable protocol based on configured exposure | Prompt lifecycle differs by runtime | Rule data would be copied into prompts. |

## Ownership Boundaries

The `agent-collaboration` domain is the reusable contract boundary: it may be imported by AgentTeam definition, execution, communication, and tools, but it imports none of those higher-level subsystems. It owns strict address and handoff value semantics only.

The AgentTeam definition boundary owns authoring and recursive definition validity. Execution consumes its resolved graph/compiled result but does not reinterpret authored `from`/`to` strings.

The outermost `TeamRunConfig.memberTree` is the root recipient-address topology. Each child TeamRun's `TeamRunConfig.memberTree` is its DS-011-derived local execution topology; `MemberLogicalAddressContext` retains the root TeamRun ID and the member's canonical root address. The effective handoff array never authorizes routes or substitutes for either topology, and every Team placement includes the coordinator found by exact identity in canonical topology.

`MemberTeamContext` remains the composite bridge into an AgentRun. Both message and task tools read `memberTeamContext.addressing`; collaboration alone reads outgoing handoffs/delivery wiring, while task delegation alone reads task caller/instance state. Token consumers keep existing fields. Generic `members`, `allowedRecipientNames`, and task target lists are removed, so no tool can recreate a flat address projection.

The shared addressing boundary owns syntax and placement only. Message delivery consumes a resolved placement through message-specific recipient/self policy. Task delegation owns `TaskDelegationMemberIdentity`, `TaskDelegationTeamIdentity`, `TaskDelegationTeamIngressIdentity`, eligibility, activation, ledger, and task lifecycle. It consumes the same placement directly; communication does not import task identity and task delegation does not inspect handoffs or communication events.

Task delegation preserves its current TeamRun ownership. The mapper first derives `callerTeamAddress = parentAddress(caller.memberAddress)` and `targetOwnerAddress = parentAddress(placement.address)` and requires exact equality. A null parent (the root Team) or unequal parent is ineligible. Only after that proof may it derive `basename(placement.address)` and match exactly one direct current-local config of the resolved kind. No task lifecycle component follows the root placement into another manager in this ticket.

Provider-visible result projection is a public communication boundary. Shared dispatch/read services produce semantic operation outcomes; `AgentCommunicationToolResultMapper` turns them into the canonical envelope. AutoByteus and MCP wrappers may differ only in transport container, never in envelope content or code selection.

The public send dispatcher remains the only selector-splitting boundary. Team execution must never receive or attempt to resolve `target_agent_run_id`; the global router must never consult Team topology.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentTeamDefinitionService.create/update` | graph resolver, handoff compiler, source provider | GraphQL and definition-management callers | writing a definition then separately validating handoffs in the caller | enrich service result/error, not caller-side traversal |
| `TeamDefinitionTopologyPlanner.buildPlan` | resolved graph hydration and handoff compilation | `TeamRunService` launch/preset paths | caller compiling handoffs from raw definitions again | return the effective snapshot in the plan |
| `SendMessageToDispatcher.dispatch` | selector parsing and route choice | all runtime wrappers/MCP adapters | provider directly invoking Team manager/global router | extend dispatcher/service contracts |
| Root `TeamRun.resolveLogicalPlacement` | backend delegation to the root manager's minimal placement query | `TaskDelegationToolRunRouter` and other out-of-backend placement consumers | reading `TeamRun.config`, returning config nodes, or adding task lifecycle IDs to the facade result | enrich the coordinate-only result if placement meaning is incomplete; keep operation state private |
| Root `MixedTeamManager.resolveLogicalPlacement` | strict resolver invocation over the root run config | root message delivery internally and root TeamRun/backend facade | message policy or task tooling invoking the resolver/config independently | enrich the minimal shared coordinate value rather than adding caller-side lookup |
| `TeamLogicalPlacementResolver.resolve` | private config traversal, strict parse/normalization, canonical placement address, configured Team ingress | root `MixedTeamManager.resolveLogicalPlacement` only | returning derived paths/routes/owners, config references, handles, settings, or run/member lifecycle IDs | convert the private traversal cursor through `resolved-team-logical-placement.ts` constructors |
| Root `MixedTeamManager.deliverInterAgentMessage` | shared placement, private delivery-endpoint lookup, member registry, delivery coordinator | member collaboration callbacks | child manager resolving a partial namespace or exporting its private endpoint/config | forward unchanged until root; keep endpoint conversion inside manager |
| `GetHandoffRulesService.readForSender` | Team-context guard and outgoing result clone | AutoByteus/MCP wrappers | adapter filtering the global handoff list | add result projection to service |
| `TaskDelegationTargetMapper.fromPlacement` | derived direct-parent eligibility and current-local Agent/Team execution identity mapping | current-TeamRun `TaskDelegationService` | task resolver traversing root topology or searching names without first proving exact parent equality | enrich the canonical address helpers or task mapper contract |
| `localizeSubTeamRunTopology(subTeamConfig)` | strict recursive member/coordinator localization | `MixedSubTeamRunFactory` only | calling `stripMemberPathPrefix` plus separately stripping one coordinator | extend the returned localized topology, not factory string surgery |
| `AgentCommunicationToolResultMapper.fromOperation/fromHandoffResult` | required envelope fields, code fallback, canonical JSON | both AutoByteus communication wrappers and both MCP communication adapters | message-only formatting or generic MCP operation mapping | extend the shared envelope mapper, not provider branches |
| `TeamRunMetadataMapper` | metadata/config conversion | create/restore/history services | restore rereading definitions for handoffs | extend metadata contract |

## Dependency Rules

1. `agent-collaboration/domain` may depend only on language/runtime primitives; it must not import AgentTeam, TeamRun, GraphQL, providers, or tools.
2. AgentTeam definition domain uses the collaboration handoff value type. Source providers may normalize physical values but semantic endpoint validation goes through the definition graph/compiler boundary.
3. `TeamDefinitionGraphResolver` may depend on scoped Agent/Team ref resolution and lookup interfaces; it must not depend on launch configs or mixed runtime code.
4. `TeamHandoffCompiler` consumes only the resolved definition graph and collaboration address/handoff contracts; it must not read files, caches, or runtime contexts.
5. Team execution may import the collaboration domain and compiled edges. It must not import GraphQL or source-provider records.
6. `MemberTeamContext` composes one exact `MemberLogicalAddressContext {rootTeamRunId,memberAddress}` with collaboration and task lifecycle fields. Generic `members`, direct target lists, representative-bearing descriptors, path arrays, immediate-Team fields, and route selectors are removed from this shared boundary. Both operations may consume the address context; neither may consume the other's operation state.
7. Root `MixedTeamManager.resolveLogicalPlacement` is the only active-runtime invocation boundary for placement and delegates to `TeamLogicalPlacementResolver`, the sole raw-input parser/topology-traversal owner. Root message delivery calls that manager method internally; task tooling reaches it only through root `TeamRun.resolveLogicalPlacement` and its backend delegate. The resolver may traverse root `TeamRunConfig.memberTree` privately but must convert the cursor into the exact immutable Agent-or-Team placement before return; neither the result value nor its type file imports/carries derived paths/routes/owners, configs, handles, settings, or run/member lifecycle IDs. It may not create handles, start runs, publish events, read definitions, consult handoffs as ACLs, or apply operation-specific self policy. Task adapters must not read `TeamRun.config` directly.
8. Non-root mixed managers may forward root-bound message delivery through their existing parent boundary, but they do not resolve or route task targets. `TaskDelegationToolRunRouter` resolves the caller's current TeamRun service as today and separately obtains the root TeamRun named by `MemberLogicalAddressContext.rootTeamRunId`; only that root facade invokes DS-009.
9. `TaskDelegationTargetMapper` may consume `ResolvedTeamLogicalPlacement`, task caller identity, the pure canonical-address derivation functions, and the caller's current local `TeamRunConfig`. It must derive caller/target parent addresses, require exact equality, derive the target basename, and then match exactly one direct config of the resolved kind. It must not import communication roster/event/provider types, parse raw request strings, traverse the root config or descendants, perform a global leaf-name search, or accept caller-supplied kind.
10. `localizeSubTeamRunTopology` depends only on TeamRun config/path identity helpers. Its input is parent-context-prefixed, never "root or local"; it must reject a member path outside the subteam mount and reject a coordinator that is not exactly one direct Agent in the source Team config.
11. `TaskDelegationTargetMapper` must reject a null target parent or a target parent address that differs from `parentAddress(callerAddressing.memberAddress)`. For an eligible placement it may inspect only the current TeamRun's direct local configs, using exact kind plus `basename(placement.address)` after the parent proof. For a Team it must additionally require `parentAddress(placement.ingressAddress) === placement.address` and match `basename(placement.ingressAddress)` to exactly one configured direct Agent child. It must not traverse into another manager, strip/retry prefixes, guess between root/local routes, or repair topology.
12. Runtime wrappers depend on shared communication/handoff services and `AgentCommunicationToolResultMapper`. Provider-specific code must not filter rules, implement address parsing, translate supplied codes, or invent envelope fields.
13. The collaboration MCP adapters must return an explicit MCP tool result built from the canonical envelope and must not use `toAgentToolMcpOperationResult` / `AgentToolsMcpResultMapper.toolResultFromOperationResult`. That generic path remains unchanged for unrelated tools.
14. Exact-run routing remains `SendMessageToDispatcher -> GlobalAgentRunMessageRouter`; Team collaboration code must not import the active-run router, and the public envelope mapper must copy exact-run codes unchanged.
15. `delegate_task` does not accept `target_agent_run_id`; exact task AgentRun communication and task result/review routing remain task-owned identities outside logical recipient selection.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentTeamDefinition.handoffs` | authored AgentTeam guidance | Ordered definition-local edges | absolute definition-root `from`/`to`; opaque `rules[]` | Defaults to `[]`. |
| GraphQL `AgentTeamHandoff` / `AgentTeamHandoffInput` | definition transport | Round-trip `from`, `to`, `rules` | same authored strings | Update omission preserves; `[]` clears. |
| `TeamDefinitionGraphResolver.resolve(root)` | definition placement graph | Resolve references and topology invariants | root definition ID/object plus lookup | Returns mounted tree, not run config. |
| `TeamHandoffCompiler.compile(graph)` | effective handoff snapshot | Validate/rebase/compose | resolved graph | Deterministic parent-first/member-order traversal. |
| `TeamRunConfig.effectiveHandoffs` | launch-time guidance snapshot | Carry immutable effective edges | canonical absolute addresses | Not an ACL/topology. |
| `MemberLogicalAddressContext` | current Agent recipient-address origin | Root TeamRun ID plus one canonical absolute Agent address | `{rootTeamRunId,memberAddress}` | Shared by message and task tools; path, basename, parent Team, and route key are derived rather than stored. |
| `MemberCollaborationContext` | current Agent handoff/message binding | Shared address context, outgoing edges, delivery callback | `MemberLogicalAddressContext` + immutable handoffs | Does not own address traversal. |
| `localizeSubTeamRunTopology(subTeamConfig)` | child TeamRun topology | One-way recursive namespace localization | parent-context-prefixed `TeamSubTeamMemberRunConfig` | Returns `{coordinatorMemberRouteKey, memberTree}`; never accepts an alternative prefix. |
| `send_message_to.recipient_name` | Team logical target | Request Team-route delivery | `/`, `/a/...`, `./`, `./a/...` only | Public field name retained. |
| `send_message_to.target_agent_run_id` | exact active AgentRun | Direct message | exact active run ID | Unchanged, mutually exclusive. |
| `TeamRun.resolveLogicalPlacement(input,caller)` | root logical placement query | Delegate to the root manager's shared placement method and return its coordinate-only immutable placement | runtime address + `MemberLogicalAddressContext` | Task-tool facade over the same root method message delivery uses internally; exposes no config or lifecycle ID. |
| `delegate_task.recipient_name` | logical task recipient | Select Agent or Team placement before task activation | same `/`, `/a/...`, `./`, `./a/...` as send | Replaces `{target:{kind,name}}`; no exact-run selector. |
| `TeamLogicalPlacementResolver.resolve(config,input,caller)` | root placement target | Strict parse/normalize/traverse privately and return canonical placement plus configured Team ingress | runtime address + `MemberLogicalAddressContext` | Returns the minimal `ResolvedTeamLogicalPlacement`; applies no operation and returns no derived owner/route or config reference. |
| `ResolvedTeamLogicalPlacement` | cross-operation logical placement | Carry immutable canonical placement identity and the one non-derived Team ingress fact | Agent `{kind,address}` or Team `{kind,address,ingressAddress}` | Exhaustive field boundary; no path/route/owner/config/handle/setting/definition/run/member lifecycle identity. |
| `TaskDelegationTargetMapper.fromPlacement(placement,caller,currentConfig)` | task execution target | Derive exact direct-parent eligibility and construct current-local Agent/Team identity | resolved placement + caller address/task identity + current local config | No raw-input parse/root traversal/global name search; basename matching occurs only after exact parent equality. |
| `get_handoff_rules()` | caller guidance | Return caller address/outgoing edges | no arguments; active member collaboration context | Canonical envelope; no incoming edges or evaluation. |
| `AgentCommunicationToolResultEnvelope<TResult>` | provider-visible communication outcome | Preserve acceptance, code, explanation, optional success data | `{accepted,code,message,result}` | `result` is `null` for send and every rejection; handoff success contains the data object. |
| TeamRun metadata `handoffs` | persisted effective snapshot | Restore launch-time guidance | array of canonical effective edges | Missing -> `[]`; stored field name is `handoffs`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| AgentTeam handoff field | Yes | Yes | Low | Strict absolute definition parser and graph compiler. |
| `send_message_to` | Yes at public delivery level; two explicit selector subjects | Yes | Low | Preserve mutually exclusive fields and dispatch before Team logic; project either result through the same envelope. |
| `TeamLogicalPlacementResolver` | Yes | Yes | Low | One parser/traversal/result is consumed by both message and task policies. |
| `ResolvedTeamLogicalPlacement` | Yes | Yes | Low | Minimal address-only discriminated union; config-independent constructors/clones enforce the exhaustive field set. |
| `TeamRun.resolveLogicalPlacement` | Yes | Yes | Low | Facade exposes the resolver result without exposing config/backend internals. |
| `get_handoff_rules` | Yes | N/A (caller-bound) | Low | Reject missing collaboration context with the same envelope shape. |
| `delegate_task` | Yes | Yes | Low | Accept only `recipient_name`; infer kind from shared placement and reject legacy target objects. |
| Task target mapper and tool run router | Yes | Yes | Low | Mapper applies task policy; the existing router obtains the current task service plus the root placement facade without reparsing or cross-Team task routing. |
| Subteam topology localizer | Yes | Yes | Low | Input shape is parent-context-prefixed; output is child-local; strict validation forbids mixed shapes. |
| `MemberTeamContext` | Composite by design | Yes | Low | Compose one shared address context with named collaboration/task lifecycle fields; remove generic `members` and target lists. |
| Provider result envelope | Yes | Yes | Low | One mapper and serializer; MCP text and `structuredContent` must be equal. |

## Typed Error Contract

`CollaborationContractError` carries the stable `COLLABORATION_*` codes below. Definition file/API failures preserve the code on the error (`GraphQLError.extensions.code` for GraphQL). Communication runtime failures map the same code into the provider-visible envelope; task adapters preserve the code in their existing task error projection. The `TASK_*` rows remain owned by the task-delegation error contract and apply only after common placement resolution. Messages include the rejected address/member/edge context without exposing stack details.

| Code | Cause | Boundary / Required Effect |
| --- | --- | --- |
| `COLLABORATION_ADDRESS_INVALID` | Missing `/` or `./`, `../`, repeated/trailing separator, backslash, reserved/empty segment, or otherwise non-canonical address | Shared runtime parsing for message/task; no topology traversal, delivery, or activation |
| `COLLABORATION_MEMBER_NAME_INVALID` | Blank/untrimmed/reserved/slash-containing member name or case-insensitive sibling collision | Definition graph resolution; definition/launch rejected |
| `COLLABORATION_TARGET_NOT_FOUND` | A syntactically valid segment is absent | Compile or shared runtime traversal; no delivery/activation/event |
| `COLLABORATION_TRAVERSAL_INVALID` | An Agent appears before the final segment | Compile or shared runtime traversal; no delivery/activation/event |
| `COLLABORATION_TEAM_INGRESS_INVALID` | Final Team/root lacks a valid direct Agent coordinator | Definition compile or shared runtime resolution; no delivery/activation/event |
| `COLLABORATION_SELF_TARGET_REJECTED` | Message effective Agent recipient equals the caller after Team ingress | Message policy after shared placement; no delivery/event |
| `COLLABORATION_HANDOFF_SOURCE_INVALID` | Authored `from` is `/` or resolves to a Team rather than an Agent | Definition validation/launch compile rejected |
| `COLLABORATION_HANDOFF_RULE_INVALID` | `rules` is absent/empty or contains a blank or non-trimmed entry | Physical parse/domain validation rejected |
| `COLLABORATION_HANDOFF_DUPLICATE` | Two composed edges have the same canonical effective `(from,to)` pair | Definition validation/launch compile rejected; no precedence/merge |
| `COLLABORATION_CONTEXT_REQUIRED` | A logical recipient operation or `get_handoff_rules` is invoked without active member address/collaboration context | Tool returns typed rejection; tools are normally not exposed outside Team context |
| `TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED` | Resolved task Agent placement is the caller's logical Agent placement | Task mapper rejects before task ID activation/ledger event |
| `TASK_DELEGATION_TARGET_NOT_ELIGIBLE` | Resolved placement is not a direct Agent/child Team owned by the caller's immediate Team | Task mapper rejects before task identity/activation; common resolution remains authoritative |
| `TASK_TEAM_TARGET_INGRESS_NOT_FOUND` | A resolved Team task placement lacks the exact direct Agent ingress required by task identity/materialization | Shared resolver or task mapper rejects; no fallback or activation |

The existing exact-run errors such as `TARGET_AGENT_RUN_NOT_ACTIVE` remain owned by `GlobalAgentRunMessageRouter` and are not renamed to collaboration codes.

The shared parser/resolver emits the same collaboration code for the same malformed or missing placement regardless of whether the caller invoked `send_message_to` or `delegate_task`. Each tool keeps its established outer result container: the canonical communication envelope applies to `send_message_to`/`get_handoff_rules`, while task tools keep their task result/error payload. Sharing codes and placement does not merge unrelated provider result contracts.

### Provider-Visible Communication Result Contract

`AgentCommunicationToolResultEnvelope<TResult>` is a discriminated public value with fields in canonical serialization order:

```ts
type AgentCommunicationToolResultEnvelope<TResult extends object | null = null> =
  | { accepted: true; code: string; message: string; result: TResult }
  | { accepted: false; code: string; message: string; result: null };
```

- `accepted`, `code`, `message`, and `result` are always present.
- `send_message_to` always uses `result: null`; its useful outcome is its operation code/message.
- `get_handoff_rules` success uses code `HANDOFF_RULES_RETRIEVED` and `result: {member_address, handoffs}`. Missing collaboration context uses `COLLABORATION_CONTEXT_REQUIRED` and `result: null`.
- A communication wrapper invoked without any bound Agent sender context returns `AGENT_COMMUNICATION_SENDER_CONTEXT_REQUIRED`; this is distinct from a bound non-Team sender using `recipient_name`, which retains the dispatcher's existing `TEAM_CONTEXT_REQUIRED`, and from a bound non-Team caller of `get_handoff_rules`, which uses `COLLABORATION_CONTEXT_REQUIRED`.
- `AgentCommunicationToolResultMapper.fromOperationResult` copies `AgentOperationResult.code` exactly. Only an omitted code receives `DELIVERED` for accepted send or `SEND_MESSAGE_TO_FAILED` for rejected send. It similarly fills a missing message with the tool contract's fixed fallback, never by inspecting provider/runtime identity.
- AutoByteus `_execute` returns `AgentCommunicationToolResultMapper.serialize(envelope)`, which is compact JSON with the field order above. It does not prepend `Error:` and does not return message-only success.
- Both communication MCP providers create an explicit `mcp_tool_result`: `content[0]` is `{type:"text",text:serialize(envelope)}`, `structuredContent` is a clone of the same envelope, and `isError` is present/true exactly when `accepted` is false. They bypass the generic operation-result mapper, which remains unchanged for non-communication tools.
- Exact-run dispatch and Team logical dispatch remain selected before normalization. The normalizer has no access to target selectors and therefore cannot change routing or rename exact-run codes.

Examples:

```json
{"accepted":false,"code":"COLLABORATION_TARGET_NOT_FOUND","message":"Collaboration target '/missing' was not found.","result":null}
```

```json
{"accepted":false,"code":"TARGET_AGENT_RUN_NOT_ACTIVE","message":"Target AgentRun 'run-x' is not active.","result":null}
```

```json
{"accepted":true,"code":"HANDOFF_RULES_RETRIEVED","message":"Retrieved 1 outgoing handoff rule edge.","result":{"member_address":"/code_reviewer","handoffs":[{"from":"/code_reviewer","to":"/implementation_engineer","rules":["When a bounded local implementation defect is found."]}]}}
```

### Subteam Run Topology Localization Contract

`localizeSubTeamRunTopology(subTeamConfig)` replaces both `stripMemberPathPrefix` and `MixedSubTeamRunFactory`'s private `stripRoutePrefix`. It lives in `src/agent-team-execution/domain/team-run-config.ts` beside the config types and returns:

```ts
type LocalizedSubTeamRunTopology = {
  coordinatorMemberRouteKey: string;
  memberTree: TeamRunMemberConfig[];
};
```

Its input is exactly one `TeamSubTeamMemberRunConfig` expressed in its **parent TeamRun's canonical namespace**. `subTeamConfig.memberPath` is the sole mount prefix; the function never receives a caller-selected prefix and never tests whether values "look local."

The localizer performs one recursive source-to-output walk:

1. Require every direct/descendant source `memberPath` to begin with the mount path and to be a strict descendant. Slice that one prefix, then derive `memberRouteKey` only from the resulting path.
2. For the outer `subTeamConfig` and for every nested `memberKind:"agent_team"`, resolve its source `coordinatorMemberRouteKey` by exact equality to exactly one direct source `memberKind:"agent"` child. Do not search descendants or leaf names.
3. Pair source children with their recursively produced localized children during the same walk. Set the localized Team's coordinator key to the paired localized Agent's `memberRouteKey`; do not strip the coordinator string independently.
4. Preserve definition IDs, member/child run IDs, runtime settings, role/description, and member order. Clone all path/tree arrays.
5. After construction, assert every output Team coordinator key equals exactly one direct localized Agent route. A path outside the mount fails with `TEAM_RUN_LOCALIZATION_PREFIX_INVALID`; a missing/ambiguous/non-Agent coordinator fails with `TEAM_RUN_COORDINATOR_INVALID`. No partial output is returned.

`MixedSubTeamRunFactory.createOrRestore` calls this function before constructing `TeamRunConfig`, uses the returned root coordinator and `memberTree` unchanged, and then applies only lifecycle concerns such as child run ID and restored runtime context. Both `MixedSubTeamMemberHandle` and `MixedTaskTeamMemberHandle` already enter the same factory, so persistent create, persistent restore, and task-child creation share this one correction.

### Shared Logical Placement And Task Delegation Contract

`MemberLogicalAddressContext` is the provider-neutral caller origin shared by message and task tools:

```ts
type MemberLogicalAddressContext = Readonly<{
  rootTeamRunId: string;
  memberAddress: CanonicalCollaborationAddress; // canonical absolute Agent placement
}>;
```

This is the exhaustive shared caller coordinate. It is immutable and contains no path array, member name, immediate-Team address/path, route key, target roster, handoffs, delivery callback, task list, or provider data. `segments(memberAddress)`, `basename(memberAddress)`, `parentAddress(memberAddress)`, and `routeKey(memberAddress)` are pure derivatives owned by `collaboration-logical-address.ts`; provider adapters never reconstruct or transmit parallel copies. `MemberCollaborationContext` composes this coordinate with outgoing handoffs and message delivery. `TaskDelegationToolContext` composes it with the current TeamRun ID and caller/task-instance identity only.

`TeamLogicalPlacementResolver.resolve(rootConfig, recipientName, callerAddressing)` is invoked by the root execution boundary for both `send_message_to` and `delegate_task`. It returns one of:

```ts
type ResolvedAgentPlacement = Readonly<{
  kind: "agent";
  address: CanonicalCollaborationAddress;
}>;

type ResolvedAgentTeamPlacement = Readonly<{
  kind: "team";
  address: CanonicalCollaborationAddress;        // "/" for root Team
  ingressAddress: CanonicalCollaborationAddress; // exact configured coordinator Agent
}>;

type ResolvedTeamLogicalPlacement =
  | ResolvedAgentPlacement
  | ResolvedAgentTeamPlacement;
```

These fields are exhaustive for the shared result. `address` is the one canonical placement identity used for operation-neutral equality/self comparison. `ingressAddress` remains only on a Team because the coordinator is selected by Team configuration and cannot be derived from the Team address. All syntactic or structural views are deliberately omitted: no path arrays, basename, parent/immediate-Team coordinate, route key, subject wrapper, or owner coordinate. The value also contains no `TeamRunConfig`, member config, handle, provider/runtime setting, role/description, Team definition ID, `memberRunId`, `teamRunId`, or owning/template run ID.

`resolved-team-logical-placement.ts` owns constructors/cloners that validate canonical strings and freeze the result. It imports no TeamRun config type. The resolver may hold visited segments, config nodes, and route keys only in a private traversal cursor and must discard them when constructing the result. The resolver:

1. parses `recipientName` with the strict collaboration address parser;
2. derives `parentAddress(callerAddressing.memberAddress)`, expands `./` from that Team, and leaves `/` root-based;
3. walks the root `memberTree` once, requiring every intermediate placement to be a Team;
4. returns the final Agent or Team canonical address without collapsing a Team into an Agent;
5. for a Team, resolves `coordinatorMemberRouteKey` to exactly one direct Agent in that Team and returns only that Agent's canonical `ingressAddress`; and
6. applies no message/task self rule and performs no lifecycle operation.

Message/task placement equality is exact value equality over this exhaustive union: Agent `kind/address`, or Team `kind/address/ingressAddress`. Tests compare those values and prove the forbidden fields are absent; config object identity, path/route projections, active/static run identity, and private delivery-endpoint identity are never part of equality.

Message policy consumes the result as follows: Agent -> `address`; Team -> `ingressAddress`; then reject if the effective Agent address equals the caller. Inside the root mixed manager only, `routeKey(effectiveAgentAddress)` derives the selector needed to locate the config, runtime participant fields, registry handle, and downward delivery path. That transient endpoint never crosses `TeamRun.resolveLogicalPlacement` and is not a second address resolver or operation-visible placement shape.

The public task input becomes:

```ts
type DelegateTaskInput = {
  recipient_name: string;
  description: string;
  reference_files?: string[];
};
```

`TaskDelegationTargetMapper.fromPlacement(placement, callerAddressing, currentConfig)` performs no raw-input parsing or root-topology search:

1. Derive `callerTeamAddress = parentAddress(callerAddressing.memberAddress)` and `targetOwnerAddress = parentAddress(placement.address)`. Reject a null target parent or unequal parents as outside current direct-target eligibility.
2. Reject an Agent placement whose `address` equals `callerAddressing.memberAddress`.
3. Only after parent equality, derive `targetName = basename(placement.address)` and match exactly one direct current-local config with that exact `memberName` and the resolved `kind`. This is not a global leaf-name lookup: the canonical parent proof fixes the namespace first.
4. Agent placement -> construct `TaskDelegationMemberIdentity` from that direct current-local Agent config.
5. Team placement -> additionally require `parentAddress(placement.ingressAddress) === placement.address`, derive `ingressName = basename(placement.ingressAddress)`, and require the exact direct Team config's configured coordinator to identify exactly one direct Agent child with that name. Construct `TaskDelegationTeamIdentity` from the current-local Team/Agent configs.
6. Preserve task-specific runtime IDs, role/description, and Team definition ID from the current-local config. Missing required IDs or ingress fail before activation.
7. Never accept a caller-supplied kind, retry a local/root route, guess between address shapes, inspect handoffs, or fall back to an unscoped name search.

`TaskDelegationToolRunRouter` keeps current service routing for review/submit. For delegation it exposes a distinct route containing (a) the service for the caller's active current TeamRun and (b) the root TeamRun resolved from `callerAddressing.rootTeamRunId`. The root facade verifies that bound root ID, then produces DS-009. `TaskDelegationService.delegateTask` receives the immutable placement and invokes `TaskDelegationTargetMapper.fromPlacement(placement, callerAddressing, currentConfig)` before reserving a task ID or mutating the ledger. The mapper derives the structural views above from the two canonical addresses, obtains runtime IDs/settings only from the caller's current local config, and then invokes the existing current-TeamRun activation coordinator, task registries, ledger, submission/review/notification, and settlement paths unchanged.

The mapper never strips prefixes, retries root/local shapes, searches leaf names outside a proven direct parent, or repairs configs. DS-009 supplies one canonical placement and DS-011 guarantees the current local Team/config coordinator invariant. A resolved deeper/cross-branch placement is a valid address but an ineligible task target; Ticket 1 does not introduce cross-TeamRun task execution routing.

Existing task Agent/Team instance identities, directories, task IDs, work packets, persisted `TaskDelegationRecord`, result/review tools, and exact task execution messaging retain their current observable contracts. Historical task records already persist canonical `ConversationTargetAddress` and receiver kind rather than the removed live selector, so no task-record migration or dual input reader is needed. Adapters clone caller addressing and task-instance identity only; they do not receive a complete target tree.

The task tool adapter preserves any `CollaborationContractError.code` produced by DS-009 in the existing task error projection. It does not translate a malformed or missing path to a legacy `TASK_TARGET_KIND_*`, flat-name, or provider-specific code. Thus the same raw address and caller context produce the same syntax/topology code for message and task even though their outer result containers remain distinct.

If a target discovery manifest is kept for prompting, it is derived from the root topology and emits canonical absolute `recipient_name` values. It has no lookup API and the resolver never consumes it. The existing direct `DelegationTargetRosterBuilder` and `targetName` contract are removed.
## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Authored/effective edge | `CollaborationHandoff` | Yes | Low | Same tight `{from,to,rules}` shape in both states; context distinguishes authored/effective. |
| Definition tree | `ResolvedTeamDefinitionGraph` | Yes | Low | Do not call it generic graph/run topology. |
| Shared per-Agent address binding | `MemberLogicalAddressContext` | Yes | Low | Keep handoffs, delivery, target lists, and task lifecycle fields outside it. |
| Message/handoff binding | `MemberCollaborationContext` | Yes | Low | Compose shared addressing; keep task fields outside it. |
| Runtime resolver | `TeamLogicalPlacementResolver` | Yes | Low | Name the typed subject; do not call it message recipient resolver or reuse permissive route normalization. |
| Shared resolved value | `ResolvedTeamLogicalPlacement` | Yes | Low | Keep only Agent `kind/address` or Team `kind/address/ingressAddress`; never grow derived paths/routes/owners, configs, or lifecycle identity into it. |
| Task execution mapper | `TaskDelegationTargetMapper` | Yes | Low | Maps a resolved placement; must not grow address lookup. |
| Root delivery owner | `MixedTeamManager` | Existing name acceptable | Medium | Document that only root instance resolves; child instances forward. |
| Public selector | `recipient_name` | Historical name but contract-approved | Medium | Tool description explicitly says hierarchical logical address; no alias rename in this ticket. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Recursive placement identity | AgentTeam execution topology | Reuse / tighten | `memberTree`, paths, selectors, and handles already carry the real structure. | N/A |
| Definition graph traversal | AgentTeam definition validator/planner | Extend / consolidate | Existing traversal understands scoped refs and cycles. | N/A |
| Runtime-neutral address/handoff values | None with strict public semantics | Create New | Internal route-key normalization is permissive and Team-specific roster types are false. | New `agent-collaboration/domain` is a bounded capability, not generic shared. |
| Team message delivery/events | Mixed delivery coordinator/member handles | Reuse / simplify | Lazy downward transport and accepted-event sequencing are correct. | N/A |
| Server-owned tools | Agent communication + Agent Tools MCP | Extend | Existing gating/session/dispatcher patterns already provide cross-runtime parity. | N/A |
| Run snapshot persistence | TeamRun metadata schema/mapper | Extend | Existing current-format record is the authoritative restore boundary. | N/A |
| Task delegation | Task delegation subsystem | Extend / decouple | It already owns direct-target eligibility, identities/lifecycle/ingress, but public `{kind,name}` lookup duplicates addressing and communication representatives supply ingress. | Replace lookup with shared placement consumption plus exact current-local mapping; retain current TeamRun lifecycle services. |
| Child TeamRun topology localization | `team-run-config.ts` + `MixedSubTeamRunFactory` | Replace / consolidate | Current helper localizes paths recursively but coordinators only one level; all child lifecycle modes share the factory. | Replace partial helper/private string strip with one strict recursive config-domain localizer. |
| Provider-visible collaboration results | Shared dispatcher plus provider adapters | Extend with focused mapper | Internal operation codes already exist; only cross-provider projection is missing. | A collaboration-specific envelope avoids changing unrelated generic MCP results. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/domain` | strict canonical-address grammar plus `segments`/`basename`/`parentAddress`/`routeKey` derivation, handoff value, typed errors | DS-001–DS-005, DS-008–DS-010 | Definition, run, communication, tools | Create New | Future AgentOrg may reuse without an AgentOrg dependency. |
| `agent-team-definition` | authored field, resolved definition graph, semantic compile validation | DS-001, DS-002, DS-008 | Definition service/topology planner | Extend | All ownership scopes remain explicit. |
| `agent-team-execution/domain/services` | effective snapshot, strict subteam topology localization, shared member address binding, rooted typed placement resolution | DS-002–DS-005, DS-009, DS-011 | TeamRun/root manager/child factory | Extend | Shared identity only; message/task operation policy stays outside. |
| `agent-team-execution/task-delegation` | direct-target eligibility, current-local task identity/ingress mapping, existing lifecycle/ledger | DS-006, DS-010 | Current TeamRun task service | Extend | Consume shared placement; no target roster or communication representatives. |
| `agent-team-execution/backends/mixed` | root placement resolution for tools, message delivery/event publication, existing run-local task activation | DS-003, DS-007, DS-009, DS-010 | Root/current MixedTeamManager | Extend / simplify | Remove representatives; do not add cross-Team task routing. |
| `agent-communication` | public tool contracts, selector dispatch, handoff read service, canonical envelope/result mapper | DS-003, DS-004, DS-006 | Shared public tool boundaries | Extend | Exact route remains separate; mapper preserves its codes. |
| `agent-tools` / Agent Tools MCP | native/MCP wrappers and configuration gating | DS-003, DS-004, DS-006, DS-010 | Shared communication/task services | Extend | No provider-owned semantics; collaboration providers bypass generic operation mapping. |
| `run-history` | effective snapshot schema and normalizer | DS-002, DS-005 | Metadata mapper | Extend | Missing optional field is current empty data. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/domain/collaboration-logical-address.ts` | Collaboration | strict address value | parse/format member segments and runtime/definition forms | One grammar authority | N/A |
| `agent-collaboration/domain/collaboration-handoff.ts` | Collaboration | handoff value | tight shape, clone/normalization | Shared across storage/runtime/tool | Yes |
| `agent-collaboration/domain/collaboration-contract-error.ts` | Collaboration | error contract | stable codes/error class | Prevent string-only divergence | Yes |
| `agent-team-definition/services/team-definition-graph-resolver.ts` | Definition | resolved graph | references, cycles, paths, coordinators | One graph subject | Yes |
| `agent-team-definition/services/team-handoff-compiler.ts` | Definition | handoff compile | endpoint semantics/rebase/compose | Focused bounded local spine | Yes |
| `agent-team-execution/domain/member-logical-address-context.ts` | Execution | shared per-member address origin | exactly root TeamRun ID plus canonical absolute member address | Tight cross-operation projection; all structural views derive from the address | collaboration address |
| `agent-team-execution/domain/member-collaboration-context.ts` | Execution | message/handoff binding | shared address context, outgoing edges, handler | Tight collaboration projection | address context |
| `agent-team-execution/services/team-logical-placement-resolver.ts` | Execution | shared runtime placement resolver | walk root `memberTree`; return Agent address or Team address/configured ingress address | No operation/lifecycle/event duties and no derived owner/route result | Yes |
| `agent-team-execution/task-delegation/task-delegation-target-mapper.ts` | Task delegation | task target mapping | derived direct-parent/self eligibility and exact current-local identity/ingress from resolved placement | One post-resolution mapping boundary | placement + address derivatives + local config + task identities |
| `agent-team-execution/domain/team-run-config.ts` localization helper | Execution domain | child topology identity | recursive path/route/coordinator localization and strict invariants | Same TeamRun config subject; avoids mixed factory policy | TeamRun config/path helpers |
| `agent-communication/services/get-handoff-rules-service.ts` | Communication | read boundary | context guard and result | Shared runtime behavior | Yes |
| `agent-communication/services/agent-communication-tool-result.ts` | Communication | public result value/mapper | envelope normalization, absent-code defaults, canonical JSON | Shared by both tools/providers | operation results |
| Native/MCP wrapper files | Tools | adapters | expose/serialize shared service through envelope | Runtime wire containers differ | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `{from,to,rules}` across config/domain/GraphQL/run/tool | `collaboration-handoff.ts` for domain value; transport records map explicitly | Collaboration | Same semantics across boundaries | Yes | Yes | Transport-decorator kitchen sink |
| Address parsing/formatting in validation, intent, prompt, resolver | `collaboration-logical-address.ts` | Collaboration | One canonical grammar | Yes | Yes | Permissive route-key normalizer |
| Error codes across definition/GraphQL/tool/runtime | `collaboration-contract-error.ts` | Collaboration | Stable machine-readable failures | Yes | Yes | Generic application error registry |
| Definition traversal in validator/planner/compiler | `team-definition-graph-resolver.ts` | Definition | One resolved placement graph | Yes | Yes | Run lifecycle manager |
| Member/coordinator localization across child factory levels | `localizeSubTeamRunTopology` in `team-run-config.ts` | Execution domain | One parent-to-child TeamRun config transformation | Yes | Yes | General permissive path utility |
| Caller root/member identity across message/task tools/prompts | `member-logical-address-context.ts` | Execution | One run scope plus one canonical placement identity | Yes | Yes | Derived path/parent/route cache, target roster, or operation context |
| Typed target placement across message/task policies | `resolved-team-logical-placement.ts` beside resolver | Execution | Same minimal immutable address result for both operations; Team ingress is the only non-derived addition | Yes | Yes | Derived path/route/owner projection, config snapshot, lifecycle identity carrier, task/message kitchen sink, or persisted duplicate topology |
| `{accepted,code,message,result}` across communication providers | `agent-communication-tool-result.ts` | Communication | Same public semantics across AutoByteus and MCP | Yes | Yes | Generic all-tool result framework |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CollaborationHandoff` | Yes | Yes | Low | Exactly `from`, `to`, `rules`; no resolved-agent or ACL flags. |
| `ResolvedTeamDefinitionGraph` | Yes | Yes | Low | Store placements/definitions needed for compile; no launch settings/run IDs. |
| `TeamRunConfig.memberTree + effectiveHandoffs` | Yes | Yes | Low | `memberTree` is topology; handoffs are guidance only. Do not copy topology into the edge snapshot. |
| `LocalizedSubTeamRunTopology` | Yes | Yes | Low | Contains only root coordinator plus member tree in one child-local namespace; source/root mount is not retained in output. |
| `MemberLogicalAddressContext` | Yes | Yes | Low | Store exactly root TeamRun ID plus canonical member address; derive path, basename, parent Team, and route selector. |
| `ResolvedTeamLogicalPlacement` | Yes | Yes | Low | Agent carries only `kind/address`; Team carries only `kind/address/ingressAddress`. No subject wrapper, path, route, owner, config, handle, setting, definition, member-run, or TeamRun identity is carried. |
| `MemberCollaborationContext` | Yes | Yes | Low | Compose shared address context and only outgoing edges/delivery. |
| `MemberTeamContext` composition | Yes | Yes | Low | Shared `addressing` plus named collaboration/task-instance/token fields replace generic members/recipients. |
| `AgentCommunicationToolResultEnvelope` | Yes | Yes | Low | Required fixed fields; `result` is tool-specific data or null, never a second error/code channel. |
| `InterAgentMessageDeliveryIntent` | Yes after tightening | Yes | Low | Carry logical Team address only; exact run IDs never enter it. |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-collaboration/domain/collaboration-contract-error.ts` | Collaboration | shared error contract | stable codes and error type | Small singular value/error concern | N/A |
| `src/agent-collaboration/domain/collaboration-logical-address.ts` | Collaboration | canonical address contract | segment invariant, strict definition/runtime parse, absolute format/rebase, `segments`, `basename`, `parentAddress`, `routeKey` | Every consumer needs identical identity and derivation rules | error contract |
| `src/agent-collaboration/domain/collaboration-handoff.ts` | Collaboration | edge value | type, immutable clone, physical-shape normalization helpers | Keeps exact shape reusable | address/error contracts |
| `src/agent-team-definition/domain/models.ts` | Definition | definition model | add handoffs to definition/update | Existing domain owner | collaboration edge |
| `src/agent-team-definition/services/team-definition-graph-resolver.ts` | Definition | resolved graph owner | scoped refs, cycles, placement paths, member/coordinator invariants | Replaces repeated graph discovery | address segment rules |
| `src/agent-team-definition/services/team-definition-graph-validator.ts` | Definition | validation facade | assert resolver+compiler success for create/update | Existing service-facing boundary remains thin | resolver/compiler |
| `src/agent-team-definition/services/team-handoff-compiler.ts` | Definition | compile owner | local endpoint lookup, rebase, compose, self/duplicate validation | Explicit DS-008 owner | collaboration edge/address/error |
| `src/agent-team-execution/domain/team-run-config.ts` | Execution | run snapshot and child topology identity | add immutable `effectiveHandoffs`; add `LocalizedSubTeamRunTopology` and strict recursive localizer; remove partial path stripper | Existing config identity owner | collaboration edge + path helpers |
| `src/agent-team-execution/domain/member-logical-address-context.ts` | Execution | shared caller origin | exact immutable `{rootTeamRunId,memberAddress}` value; validate canonical address | Same minimal recipient origin for message and task | collaboration address |
| `src/agent-team-execution/domain/member-collaboration-context.ts` | Execution | message/handoff projection | shared address context, outgoing edges, delivery handler | Keeps operation-specific state separate | address context + handoffs |
| `src/agent-team-execution/domain/member-team-context.ts` | Execution | composite AgentRun context | compose `addressing`, `collaboration`, task-instance/token state; remove generic members/flat recipients/representatives/target lists | Existing cross-runtime context owner | named tight contracts |
| `src/agent-team-execution/services/member-team-context-builder.ts` | Execution | composite context builder | derive one root-canonical address context and collaboration projection; preserve task caller state | Existing construction seam | address/collaboration contracts |
| `src/agent-team-execution/task-delegation/task-delegation-target-mapper.ts` | Task delegation | post-resolution target owner | derive parent/basename; direct-parent/self eligibility; exact current-local Agent/Team config and ingress mapping | Explicit DS-010 mapping owner | placement + address derivatives + local config + task identities |
| `src/agent-team-execution/services/member-collaboration-instruction-renderer.ts` | Execution | protocol renderer | stable identity/grammar/read guidance | Replaces roster renderer cleanly | collaboration address |
| `src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.ts` | Execution | Team intent builder | copy the raw logical `recipient_name` with canonical sender addressing for root delivery | Existing intent seam; DS-009 remains the only parser/canonicalizer | member collaboration/address |
| `src/agent-team-execution/services/team-logical-placement-resolver.ts` | Execution | shared root placement resolver | strict parse/relative normalization, private root-config traversal, and minimal address/Team-ingress construction | Explicit DS-009 owner | address/error + TeamRun config internally; minimal placement output |
| `src/agent-team-execution/services/resolved-team-logical-placement.ts` | Execution | shared placement value | exact Agent `{kind,address}` / Team `{kind,address,ingressAddress}` types plus immutable constructors | Shared result imports no TeamRun config or operation type | canonical collaboration address only |
| `src/agent-team-execution/domain/team-run.ts`; `backends/team-run-backend.ts` | Execution | shared placement facade | add `resolveLogicalPlacement` without exposing config | Existing public run/backend boundary | address context + resolved placement |
| `src/agent-team-execution/backends/mixed/delivery/team-logical-message-delivery-policy.ts` | Mixed runtime | message policy adapter | consume DS-009; Team -> `ingressAddress`, effective-self rejection, request manager-private endpoint | Renamed from the old sender-specific resolver so it cannot become a second address authority | resolved placement |
| `src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` | Mixed runtime | delivery/event owner | deliver resolved logical Agent and publish once | Existing correct owner | resolver adapter |
| `src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed runtime | root orchestration | expose the one minimal placement method, call it from message delivery, derive a private selector from the effective Agent address, materialize delivery config/participant/handle, and forward child message requests without reparsing | Existing lifecycle owner | root ID binding + placement; private registry/config mechanics stay here |
| `src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | Mixed runtime | child lifecycle adapter | call config localizer once for persistent/create/restore/task child and consume returned coordinator/tree unchanged | Shared child construction seam | localizer; no string prefix helper |
| `src/agent-communication/services/agent-communication-tool-result.ts` | Communication | provider result contract | envelope type, exact-code copying, absent-code/message defaults, canonical serializer | Same public result for both communication tools | `AgentOperationResult` |
| `src/agent-communication/services/get-handoff-rules-service.ts` | Communication | read owner | context-required/empty/sender-only envelope result | Shared across runtimes | member collaboration + result contract |
| `src/agent-communication/services/get-handoff-rules-tool-contract.ts` | Communication | public tool contract | name, description, result type/serialization | Parallels send contract without sharing semantics | collaboration edge |
| `src/agent-tools/agent-communication/send-message-to.ts` | Tools | AutoByteus wrapper | map dispatcher result and return canonical envelope JSON | Native tool boundary | dispatcher + result contract |
| `src/agent-tools/agent-communication/get-handoff-rules.ts` | Tools | AutoByteus wrapper | bound no-arg local tool and canonical envelope JSON | Native tool boundary | read service + result contract |
| `src/agent-tools/mcp/agent-communication-mcp-result-mapper.ts` | Tools MCP | collaboration MCP projection | envelope -> matching text/`structuredContent`/`isError` | Focused adapter avoids broad generic mapper changes | result contract |
| `src/agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.ts` | Tools MCP | MCP send wrapper | dispatcher -> envelope -> explicit MCP result | Existing send provider | dispatcher + MCP result mapper |
| `src/agent-tools/mcp/providers/get-handoff-rules-mcp-adapter-provider.ts` | Tools MCP | MCP handoff wrapper | Team-only availability, read envelope, explicit MCP result | MCP wire boundary | read service + MCP result mapper |
| `src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.ts` | AutoByteus runtime | native Team context adapter | clone only `{rootTeamRunId,memberAddress}` plus task caller/instance state; remove target members/representative/derived addressing | Existing native context owner | address context |
| `src/agent-tools/task-delegation/task-delegation-autobyteus-context.ts` | Task tools | untrusted native parser | accept only root TeamRun ID and canonical member address plus task caller identity; no derived address fields/target list/representative | Clean task context boundary | address + task caller identity |
| `src/agent-tools/task-delegation/task-delegation-tool-{parameter-schemas,input-parsers,manifest}.ts` | Task tools | public task input | replace target object with required `recipient_name`; share description of `/`/`./` grammar | Existing provider-neutral tool manifest | collaboration address contract |
| `src/agent-tools/task-delegation/task-delegation-tool-service.ts` | Task tools | task service adapter | obtain shared resolved placement and pass it with caller/current TeamRun context to existing task service | Existing shared task boundary | address/task caller context |
| `src/agent-team-execution/services/delegation-target-roster-builder.ts` | Task guidance | obsolete flat roster | remove; optional replacement may render canonical root addresses for discovery only | Flat target names are not authority | N/A |
| `tests/unit/agent-team-execution/team-run-config-localization.test.ts` | Execution tests | DS-011 contract seam | three-level success plus prefix/coordinator invariant failures | New focused pure-domain seam | localizer only |
| `tests/unit/agent-team-execution/mixed-sub-team-run-factory-localization.test.ts` | Mixed runtime tests | child lifecycle seam | capture persistent create, restore-runtime-context, and task-identity config construction from the shared factory | New focused factory seam | DS-011 result |
| `tests/unit/agent-team-execution/team-logical-placement-resolver.test.ts` | Execution tests | DS-009 common identity seam | same minimal message/task placement for absolute/relative Agent/Team paths; exact ingress, immutability, forbidden-field absence, and typed failures | New focused shared resolver seam | address/root config input; address-only placement output |
| `tests/unit/agent-team-execution/task-delegation-target-mapper.test.ts` | Task tests | DS-010 policy seam | Agent/Team current-local mapping, exact ingress, self/non-direct rejection, no parsing/kind fallback | New focused mapper seam | resolved placement + local config |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Task integration | DS-010/DS-011 preserved behavior | direct Agent/child Team `recipient_name`, non-direct eligibility rejection, existing result/review/settlement, and three-level exact ingress after representative removal | Existing durable task lifecycle seam | shared resolver + localizer + task mapper |
| Existing definition providers/GraphQL/metadata files | Their existing subsystems | physical/API/persistence boundaries | map the canonical handoff array explicitly | Avoid hidden generic serializer | collaboration edge |

## Applied Patterns (If Any)

- **Compiler:** `TeamHandoffCompiler` turns reusable authored edges into one immutable effective snapshot at launch. It owns no runtime delivery.
- **Adapter:** AutoByteus and MCP wrappers adapt shared communication services through one result envelope; definition source and GraphQL files adapt physical/API shapes to one domain value.
- **Facade:** `SendMessageToDispatcher` remains a thin selector facade over two different authoritative owners.
- **Repository/store pattern (existing):** Team config and TeamRun metadata stores remain persistence boundaries; no orchestration moves into them.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/domain/` | Folder | Runtime-neutral collaboration contract | Address, handoff, error values | Reusable by future AgentOrg without Team runtime dependency | TeamRun, GraphQL, providers, tool adapters |
| `.../collaboration-contract-error.ts` | File | Error contract | Stable typed failure codes | Pure domain value | HTTP/GraphQL result construction |
| `.../collaboration-logical-address.ts` | File | Address contract | Strict grammar, segment validation, canonical formatting | One parser authority | Topology traversal/lifecycle |
| `.../collaboration-handoff.ts` | File | Handoff value | Tight edge shape/clone/normalization | Same semantics across boundaries | Rule evaluation or ACL state |
| `src/agent-team-definition/domain/models.ts` | File | AgentTeam definition | Add `handoffs` to definition/update | Existing owner | Runtime-effective mount state |
| `src/agent-team-definition/providers/team-definition-config.ts` | File | shared/team-local JSON adapter | Parse/write optional `handoffs` | Existing source schema owner | Cross-definition resolution |
| `src/agent-team-definition/providers/application-owned-team-source.ts` | File | application JSON adapter | Parse/write same handoff shape | Separate legitimate source owner | Divergent semantics |
| `src/agent-team-definition/services/team-definition-graph-resolver.ts` | File | definition graph | Resolve placements and invariants | Shared validation/launch evidence | Launch config hydration |
| `src/agent-team-definition/services/team-handoff-compiler.ts` | File | compile owner | Compose effective edges | Focused bounded compile spine | File writes/run IDs |
| `src/agent-team-definition/services/team-definition-graph-validator.ts` | File | service facade | Assert graph/compiler validity | Existing public validation seam | Duplicate traversal logic |
| `src/api/graphql/types/agent-team-definition.ts` | File | GraphQL definition API | Handoff object/input fields and typed errors | Existing API boundary | Semantic compiler logic |
| `src/api/graphql/converters/agent-team-definition-converter.ts` | File | GraphQL output adapter | Edge mapping | Existing converter | Normalization policy |
| `src/agent-team-execution/domain/team-run-config.ts` | File | run snapshot / child topology identity | `effectiveHandoffs`; strict `localizeSubTeamRunTopology`; remove partial stripper | Existing runtime config owner | Definition-local addresses, lifecycle, task policy |
| `src/agent-team-execution/domain/member-logical-address-context.ts` | File | shared per-member addressing | exact root TeamRun ID + canonical member address | One recipient origin for both operations; every structural view is derived | Targets, handoffs, delivery, task lifecycle, paths, parent fields, route keys |
| `src/agent-team-execution/domain/member-collaboration-context.ts` | File | per-member collaboration | compose shared addressing with outgoing handoffs/delivery | Avoids bloating `MemberTeamContext` | Task/token/delegation policy |
| `src/agent-team-execution/services/team-definition-topology-planner.ts` | File | launch topology | Consume resolved graph, hydrate config, attach compiled edges | Existing launch planner | Handoff parser internals |
| `src/agent-team-execution/services/member-team-context-builder.ts` | File | AgentRun context construction | Compose shared addressing, collaboration, and task caller/instance state | Existing construction point | Recipient/target roster derivation |
| `src/agent-team-execution/task-delegation/task-delegation-target-mapper.ts` | File | Task target policy | Derived direct-parent/self eligibility and exact current-local identity/ingress mapping from shared placement | Existing task subsystem owns execution meaning | Raw request parsing/root traversal/unscoped name search/provider/cross-Team routing |
| `src/agent-team-execution/services/member-run-instruction-composer.ts` | File | shared instructions | Compose collaboration renderer with preserved task guidance | Existing cross-runtime owner | Full handoff rules |
| `src/agent-team-execution/services/member-collaboration-instruction-renderer.ts` | File | collaboration prompt projection | Current absolute/member Team protocol | Replaces false roster | Rule content/topology list |
| `src/agent-team-execution/services/team-logical-placement-resolver.ts` | File | shared root placement resolution | Strict parse/normalize/private config traversal, then minimal Agent address or Team address/configured ingress address | Domain-level runtime resolver | Message/task policy, startup/events, derived owner/route projections, or config references in its return value |
| `src/agent-team-execution/services/resolved-team-logical-placement.ts` | File | shared placement value | Exact address-only result variants plus immutable constructors | Prevent operation-specific parallel shapes without leaking resolver internals | Paths, routes, owners, TeamRun/member configs, handles, settings, roles, definition IDs, or run/member lifecycle IDs |
| `src/agent-team-execution/domain/team-run.ts`; `backends/team-run-backend.ts` | Files | root placement query facade | expose the minimal address-only `resolveLogicalPlacement` through existing run/backend ownership | Prevent task tools bypassing run boundary | Derived coordinates, config-bearing return values, handles, settings, active/template lifecycle IDs, or task/message operation policy |
| `src/agent-team-execution/backends/mixed/delivery/team-logical-message-delivery-policy.ts` | File | mixed adapter | Consume shared placement, choose subject/ingress, reject effective self, and request a manager-private endpoint | Keeps message policy explicit without a second resolver | Address parsing, public config-bearing placement, exact-run/global routing |
| `src/agent-team-execution/backends/mixed/mixed-team-run-context.ts` | File | active runtime context | Add root collaboration run binding; minimize parent boundary | Existing runtime owner | Flat recipients/representatives |
| `src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | File | root placement/message boundary | Resolve minimal address-only placement at root; privately derive the selected Agent route and convert it into delivery config/participant/handle; preserve recursive delivery and expose only placement through the facade | Existing recursive manager authority | Address parsing duplication, private endpoint leakage, or cross-Team task routing |
| `src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | File | child run factory | Use one localized coordinator/tree for persistent create/restore/task child; inherit root collaboration binding | Existing child creation seam shared by both handles | Definition recompilation, route string surgery |
| `src/agent-team-execution/backends/mixed/members/mixed-{sub-team,task-team}-member-handle.ts` | Files | lazy child lifecycle | Pass truthful child mount/root binding; remove representative descriptors | Existing lifecycle owners | Roster projection |
| `src/agent-communication/services/send-message-to-{dispatcher,tool-contract}.ts` | Files | public delivery contract | Path wording/context use; preserve exact route | Existing shared boundary | Topology walk |
| `src/agent-communication/services/agent-communication-tool-result.ts` | File | public communication result | Required envelope, code preservation/defaults, canonical JSON | Shared semantic result boundary | MCP container/provider branching |
| `src/agent-communication/services/get-handoff-rules-{service,tool-contract}.ts` | Files | public read contract | Shared read/envelope semantics | Natural home beside agent communication | Provider behavior |
| `src/agent-tools/agent-communication/` | Folder | native wrappers | Register/bind both communication tools and return envelope JSON | Existing capability area | Business semantics/code translation |
| `src/agent-tools/mcp/agent-communication-mcp-result-mapper.ts` | File | MCP collaboration result | Equal text/structured envelope and error flag | MCP transport boundary | Operation semantics |
| `src/agent-tools/mcp/providers/` | Folder | MCP adapters | Adapt both communication tools explicitly | Existing provider registry | Rule interpretation/generic operation mapping |
| `src/agent-tools/task-delegation/task-delegation-tool-{parameter-schemas,input-parsers,manifest}.ts` | Files | public task input | `recipient_name` contract shared across AutoByteus/MCP | Existing provider-neutral manifest | Flat target kind/name schema |
| `src/agent-tools/task-delegation/task-delegation-tool-{service,run-router}.ts` | Files | task tool routing | Build caller address context, obtain shared placement, and retain current TeamRun service routing | Existing shared server boundary | Independent target lookup or cross-Team manager routing |
| `src/run-history/store/team-run-metadata-{types,schema}.ts` | Files | persisted run schema | Optional effective `handoffs` and strict normalization | Existing current-format authority | Definition reads/migration branches |
| `src/agent-team-execution/services/team-run-metadata-mapper.ts` | File | config/metadata adapter | Map effective edges both ways | Existing restore seam | Recompile from definitions |

Files removed or renamed are listed in the removal plan. Existing `TeamMemberSelector`, `memberPath`, `memberRouteKey`, member handles, event bridge, task delegation, and global exact-run files remain in their current capability areas.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-collaboration/domain` | Main-Line Domain-Control | Yes | Low | Three pure value/grammar files form a real reusable boundary, not a generic shared folder. |
| `src/agent-team-definition/services` | Main-Line Domain-Control | Yes | Medium | Resolver/compiler/validator are distinct owners; keep physical adapters in `providers`. |
| `src/agent-team-execution/domain` | Main-Line Domain-Control | Yes | Low | TeamRun config owns the strict recursive parent-to-child topology identity transformation; mixed factory only invokes it. |
| `src/agent-team-execution/services` | Main-Line Domain-Control / off-spine projection | Yes | Medium | Address resolver and instruction renderer have singular concerns; mixed lifecycle stays under `backends/mixed`. |
| `src/agent-team-execution/task-delegation` | Primary + Bounded Local Domain-Control | Yes | Medium | Existing task lifecycle owns post-resolution target mapping; the shared resolver and root placement facade remain outside this folder. |
| `src/agent-team-execution/backends/mixed/delivery` | Main-Line Domain-Control | Yes | Low | Adapts root resolution into existing delivery/event sequencing. |
| `src/agent-communication/services` | Transport/public facade | Yes | Low | Shared public tool behavior, not Team execution internals. |
| `src/agent-tools/mcp/providers` | Transport | Yes | Low | Runtime wire adapters only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Runtime path canonicalization | Caller binding `{rootTeamRunId:"R",memberAddress:"/research_team/research_lead"}` + `./field_team` -> derive parent `/research_team` -> canonical target `/research_team/field_team` before forwarding. | Store `memberPath`, `immediateTeamAddress`, and `immediateTeamPath` beside the canonical address or let every child manager rewrite sender/target incrementally. | One root target and one sender identity survive arbitrary nesting without contradictory caches. |
| Team ingress | Resolver finds `/research_team` as Team, reads its full coordinator route `/research_team/research_lead`, and returns that real Agent participant. | Project `research_lead` as a fake direct parent member. | Keeps topology and event identity truthful. |
| Root delivery | Deep child intent has `rootTeamRunId=R`, sender `/research_team/field_team/interviewer`; child managers forward unchanged until manager `R`, which resolves `/design_team/team_lead` then sends down handles. | Resolve against immediate-parent rosters and permit upward access only from coordinators. | Demonstrates cross-branch reachability without a new transport. |
| Handoff composition | Child edge `/research_lead -> /field_team` mounted at `/research_team` becomes `/research_team/research_lead -> /research_team/field_team`; parent cross-edge composes in the same array. | Teach current runtime to understand both child-local and parent-effective edge shapes. | Launch snapshot is current and canonical. |
| Context split | `MemberTeamContext { ..., addressing: MemberLogicalAddressContext, collaboration:{addressing,outgoingHandoffs,deliver}, taskAgentInstance, tokenUsageExecutionScope }`; task adapters clone `addressing` plus caller state. | Add topology, generic `members`, target lists, parent roster, and parser methods directly to `MemberTeamContext`. | One tight identity is shared while operation state remains separated. |
| Selector separation | `recipient_name -> Team logical intent`; `target_agent_run_id -> GlobalAgentRunMessageRouter`. | Pass both kinds to `TeamMessageRecipientResolver` and guess their subject. | Preserves explicit identity meaning. |
| Shared message/task placement | For root caller `/product_manager`, both `send_message_to({recipient_name:"/design_team"})` and `delegate_task({recipient_name:"/design_team",...})` receive one `ResolvedAgentTeamPlacement` for the direct child `/design_team` with ingress `/design_team/team_lead`; message policy delivers to ingress, task policy starts a task-Team. | Message resolver collapses Team to Agent while task resolver separately matches `{kind:"team",name:"design_team"}`. | Proves same addressing means same typed subject, not merely similar string syntax. |
| Minimal shared placement | `/design_team` returns `{kind:"team",address:"/design_team",ingressAddress:"/design_team/team_lead"}`. | Attach subject wrappers, parent/owner coordinates, path arrays, route keys, `teamConfig`, `memberConfig`, `memberRunId`, `owningTeamRunId`, provider settings, or a handle. | Demonstrates the exact cross-operation field boundary: the address is canonical, while Team ingress is the only configured non-derived fact. |
| Task-owned execution | For root caller `/product_manager`, derive caller Team `/` and target parent `/` from the two canonical addresses; only then derive `design_team`, match the root TeamRun's exact direct Team config, and validate configured ingress `team_lead`. | Keep `SubTeamRepresentativeDescriptor`, a stored owner coordinate, or derive task target from a flat communication/task roster. | Removes false and redundant identity while preserving current direct-target task ownership. |
| Three-level child localization | Parent-local `/research_team` config localizes nested `field_team.coordinatorMemberRouteKey` from `research_team/field_team/field_lead` to `field_team/field_lead`; localizing `field_team` again yields `field_lead`. | Rebase member routes but leave the nested coordinator root-prefixed, or let DS-010 try both strings. | Persistent, restored, and task child runs receive one exact local identity at every level. |
| Provider-visible typed result | AutoByteus returns `{"accepted":false,"code":"TARGET_AGENT_RUN_NOT_ACTIVE","message":"...","result":null}`; MCP text parses to that exact object and `structuredContent` equals it. | AutoByteus returns `Error: ...` while MCP returns message-only content, or an adapter renames the exact-run code. | Proves code integrity crosses both public boundaries rather than stopping at `AgentOperationResult`. |

### Three-Level Persistent / Restore / Task-Child Example

The root TeamRun contains this parent-namespace topology (slashes below are route-key separators, not public address prefixes):

```text
research_team                         Team; coordinator research_team/research_lead
├── research_team/research_lead       Agent
└── research_team/field_team          Team; coordinator research_team/field_team/field_lead
    └── research_team/field_team/field_lead  Agent
```

When a persistent `research_team` child is created or restored, `localizeSubTeamRunTopology(researchTeamConfig)` returns:

```text
root coordinator: research_lead
research_lead                         Agent
field_team                            Team; coordinator field_team/field_lead
└── field_team/field_lead             Agent
```

For caller `/research_team/research_lead`, DS-009 resolves `/research_team/field_team` to `{kind:"team",address:"/research_team/field_team",ingressAddress:"/research_team/field_team/field_lead"}`. DS-010 derives `/research_team` as both the caller Team and target parent, then derives basename `field_team` and pairs it with the current `research_team` run's already localized direct config, whose coordinator is exactly `field_team/field_lead`. It also proves that the ingress parent is the resolved Team and derives ingress basename `field_lead`; it never needs an owner coordinate or root route in the shared result. If `field_team` is started as either a persistent/restored child or a task Team child, the same factory invokes the same localizer on the parent-local `field_team` entry and returns:

```text
root coordinator: field_lead
field_lead                            Agent
```

The restore runtime context and task-team identity are lifecycle inputs applied after this config transformation; neither changes route localization. At no point does the localizer, shared placement resolver, task mapper, or tool run router try both `research_team/field_team/field_lead` and `field_team/field_lead`; the mapper derives logical parent/basename from canonical addresses and trusts only the one DS-011-localized current config.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Bare-name fallback after path lookup | Existing Agents/tests use names. | Rejected | Strict parser rejects; external package updates are separate. |
| Global unique leaf-name search | Could make old names appear to work in simple trees. | Rejected | Full path is required; duplicate leaves remain legal. |
| Keep flat roster for prompts but rooted resolver for runtime | Minimizes prompt changes. | Rejected | Delete roster/manifest; render grammar and identity. |
| Keep `delegate_task {target:{kind,name}}` while changing only message addressing | Preserves the current task tool schema. | Rejected | Both tools accept `recipient_name`; one typed placement resolver infers Agent/Team and task mapping occurs afterward. |
| Accept both task selector shapes temporarily | Could ease package/test transition. | Rejected | Parser accepts only `recipient_name`; remove target kind/name types, codes, descriptions, and lookups in the same change. |
| Preserve child representative descriptors for display or task ingress | Existing communication/events/docs mention representatives, and task delegation currently consumes them. | Rejected | Emit actual communication Agent participant; common Team placement carries its exact real ingress for task mapping. |
| Keep native task target members or `representative` as aliases | Could ease internal transition. | Rejected | Managed/native task context carries caller address/task identity only; target identity comes from DS-009 and the task mapper. |
| Let collaboration tools use generic MCP operation-result mapping | Existing provider already uses it. | Rejected | Dedicated collaboration MCP mapping preserves code and structured envelope without changing unrelated tools. |
| Let task mapping try parent-prefixed and child-local coordinator keys | Could tolerate current partial localization. | Rejected | Strict config localizer plus DS-009 root/owner pairing produces exact shapes; inconsistent source/output fails. |
| Keep `stripMemberPathPrefix` as a wrapper around the localizer | Could reduce call-site edits. | Rejected | Replace the misleading partial API and the factory's private coordinator stripper; one named topology operation remains. |
| Resolve relative path separately at each child boundary | Reuses parent normalization. | Rejected | Canonicalize once from the caller binding and resolve once at root. |
| Recompile handoffs from current definitions during restore | Avoids metadata field. | Rejected | Persist optional effective snapshot; missing old field is empty. |
| Embed old/new metadata version branches in runtime | Conventional schema migration approach. | Rejected | Current reader treats missing optional field as current empty data. |
| Use handoff edges as a delivery allowlist | May look safer. | Rejected | Resolver uses topology only; handoffs remain LLM guidance. |

## Derived Layering (If Useful)

The derived shape is: pure collaboration values -> AgentTeam definition graph/compile -> TeamRun snapshot/shared member addressing -> root typed placement -> message delivery or direct-eligible current-local task mapping -> shared tool adapters. Persistence and provider adapters remain off-spine boundaries. This is explanatory only; ownership and the spines above remain authoritative.

## Change / Refactor Sequence

1. Add pure collaboration error, strict address, handoff, and provider-result value contracts with focused unit coverage. The address parser is operation-neutral; the result mapper preserves supplied communication codes and makes absent-code fallbacks explicit.
2. Extend definition domain, shared/team-local and application-owned config adapters, and GraphQL mappings with `handoffs`, preserving omission as empty and update `[]` as clear.
3. Introduce `TeamDefinitionGraphResolver`; route the existing graph validator through it; enforce path-safe case-insensitive sibling names and direct-Agent coordinator invariants.
4. Add `TeamHandoffCompiler`; make definition create/update validate it and make topology planning return `effectiveHandoffs` from the same resolved graph.
5. Add `TeamRunConfig.effectiveHandoffs`; thread it through identity assignment, run manager/backend config copies, metadata types/schema/mapper, create/restore/refresh, and child runtime binding inheritance.
6. In `team-run-config.ts`, replace `stripMemberPathPrefix` with `localizeSubTeamRunTopology`. Implement the strict source-prefix, recursive route derivation, direct-Agent coordinator pairing, postcondition validation, clone, and invariant errors from DS-011. Add the three-level config-domain test before task mapping work.
7. In `MixedSubTeamRunFactory`, replace both the old helper call and private `stripRoutePrefix` with one call to the localizer. Construct `TeamRunConfig` from its returned root coordinator/tree unchanged for persistent create, persistent restore, and task child calls.
8. Contract `MemberLogicalAddressContext` for every persistent, restored, task-Agent, and task-Team AgentRun to exactly `{rootTeamRunId,memberAddress}`. Add/complete canonical `segments`, `basename`, `parentAddress`, and `routeKey` derivations in `collaboration-logical-address.ts`; update all collaboration, prompt, message, and task context consumers atomically. Refactor `MemberCollaborationContext` to compose that identity with outgoing handoffs and message delivery; keep task/token state outside both values. Delete path arrays and immediate-Team fields rather than retaining aliases.
9. Contract `ResolvedTeamLogicalPlacement` to exact Agent `{kind,address}` and Team `{kind,address,ingressAddress}` variants. Update `TeamLogicalPlacementResolver`, root `MixedTeamManager.resolveLogicalPlacement`, and the root `TeamRun`/backend facade together. Unit-test identical Agent/Team results, exact ingress, deep immutability, and collaboration error codes for absolute/relative inputs from root and three-level nested callers. Assert the result and type imports contain no subject wrapper, owner coordinate, path, route key, config, handle, settings, definition/member-run, or TeamRun lifecycle identity; prove root message delivery calls the manager method and task tooling uses the TeamRun facade rather than reading config.
10. Tighten `InterAgentMessageDeliveryIntent` to logical Team address only. Make message delivery consume DS-009, apply Team-to-ingress/effective-self policy, derive the private root route selector from the effective canonical Agent address, and then convert it to config/participant/handle mechanics inside the root manager while reusing root/child handles. Remove address traversal from the old sender-specific message resolver; no private delivery endpoint or selector crosses the shared facade.
11. Change the public `delegate_task` manifest, parameter schema, Zod/native parsers, TypeScript input, descriptions, and runtime instruction from `{target:{kind,name}}` to required `recipient_name`. Do not accept both shapes even temporarily.
12. Refactor `TaskDelegationTargetMapper` to derive caller Team and target parent from their canonical addresses, require exact equality, reject self/root Team, and only then derive the target basename and match exactly one direct current-local config of the resolved kind. For Team targets require ingress parent equality and map the ingress basename to the exact configured direct coordinator Agent. Never localize, retry, guess route shapes, or perform an unscoped name search.
13. Add a delegation-specific route to `TaskDelegationToolRunRouter` that resolves both the caller's current TeamRun service and the root TeamRun placement facade; keep review/submit routing unchanged. Refactor `TaskDelegationInputResolver` and `TaskDelegationService` to accept the immutable shared placement, preserve its collaboration failures unchanged, and map it against the service's current local config before task ID reservation, ledger mutation, or the existing activation coordinator. Keep current service/ledger ownership, task instance identities/directories, task records/events, submission/review, notification, settlement, and exact task-run messaging unchanged.
14. Switch AutoByteus managed Team context, Agent Tools MCP task context, and task wrappers to clone only `{rootTeamRunId,memberAddress}` plus task-instance identity. Remove derived addressing arrays/parent fields, generic target members, Team/subteam target conversion, `representative` fallback, `TASK_TARGET_KIND_*` handling, and pre-resolution direct `memberName` lookup.
15. Remove or replace `DelegationTargetRosterBuilder`: no flat `targetName` manifest remains. If product guidance still needs discovery rows, render only currently eligible canonical absolute addresses from the root topology and keep that display entirely out of resolution.
16. Add task lifecycle coverage before deleting representatives: direct peer Agent and direct child Team by relative/equivalent absolute `recipient_name`, identical minimal DS-009 placement equality with send, canonical parent/basename derivation, three-level current-local task-Team ingress, existing result submission/review/settlement and task-Agent caller chaining, non-direct/deeper/cross-branch eligibility rejection, and every legacy selector/self/error rejection. Add negative shape tests proving the removed context/placement fields cannot reappear.
17. Remove flat communication roster builders/manifests, generic `MemberTeamContext.members`, target lists, all member/representative descriptor types/builders/fields, parent member exposure, parent-boundary sender rewriting, and dead exact/task-run Team message resolver branches. At this point one address context/resolver and one config localizer remain.
18. Add `GetHandoffRulesService`, native tool, MCP adapter, registration/gating, and canonical success/context-error outcomes. Generalize/rename the AutoByteus bound communication-tool factory if necessary so both tools share sender binding without one tool knowing the other.
19. Change `AutoByteusSendMessageToTool` and the new AutoByteus handoff tool to return canonical envelope JSON through `AgentCommunicationToolResultMapper`. A missing bound sender produces a coded envelope, never a raw `Error:` string.
20. Add `agent-communication-mcp-result-mapper.ts`; switch both communication MCP providers to explicit MCP tool results with equal serialized text/`structuredContent` and rejection-only `isError`. Do not change or use the generic operation-result mapper for these tools. Add exact-run adapter tests that assert the router code survives unchanged.
21. Replace runtime roster prose with shared logical-address protocol rendering, including that both message and task tools use `recipient_name`, topology infers Agent/Team, and task eligibility remains direct/current-TeamRun. Wire configured exposure through AutoByteus, Codex, and Claude without injecting rule contents.
22. Update implementation-scoped unit tests and type checks; leave formal durable API/E2E coverage classification/execution to the downstream API/E2E stage.
23. Delivery updates project docs after integrated-state refresh; external Agent package files remain untouched.

No temporary compatibility route may remain after steps 16–17 or 20. DS-011 is connected before current-local Team ingress mapping; DS-009 supplies the only canonical placement and configured Team ingress, while DS-010 derives rather than stores structural views and never compensates for a mixed route shape, old selector, or ineligible cross-Team target. Common resolution and task mapping are proven before representative/target-list deletion; the public communication result mapper is connected before message-only provider behavior is deleted. The reviewable result contains one owner for each canonical address, parse/traversal, placement, operation policy, topology localization, local task mapping, and provider projection.

## Key Tradeoffs

- **Root resolution adds an upward-and-downward traversal for child-local messages.** This is accepted because it creates one authority and reuses lazy handles. The cost is small relative to LLM/runtime work, and it prevents cross-boundary drift.
- **A new top-level `agent-collaboration` domain is added.** This is justified because the address/handoff values are reused across definition, run, communication, tools, and later AgentOrg. Keeping them under a generic `shared` folder or a provider would blur ownership.
- **The resolved definition graph becomes explicit.** This adds a model but removes repeated traversal/validation decisions and gives the handoff compiler a stable input without coupling it to runtime configs.
- **Only outgoing handoffs are bound per member.** This avoids copying the complete snapshot into every AgentRun and makes sender-only retrieval structural. The root `TeamRunConfig` still retains the full persisted effective snapshot.
- **Task delegation loses its direct target projection and uses the shared placement result.** This expands the rooted resolver's consumer set but removes a complete second recipient language and lets topology infer type. Task identity/lifecycle stay separate through the post-resolution mapper rather than a copied roster.
- **Task addressing is root-aware while eligibility remains current-Team-local.** This means a valid cross-branch path can resolve successfully and then receive `TASK_DELEGATION_TARGET_NOT_ELIGIBLE`. The separation is intentional: it gives both tools one identity model without silently broadening task ownership/lifecycle beyond the approved clarification.
- **The collaboration boundary is contracted without rewriting the whole execution identity system.** `TeamRunConfig.memberPath`, `memberRouteKey`, and coordinator routes remain existing internal runtime/history/event projections in SR-006 because they cross at least 78/128/34 production files respectively and may participate in persisted or lifecycle identity. The focused change removes them as shared collaboration authorities and derives what collaboration consumers need from canonical addresses. A whole-execution normalization requires a separate evidence and persisted-data ticket rather than a speculative migration here.
- **Child topology localization becomes a strict config-domain operation rather than a permissive path helper.** This rejects mixed/non-descendant input that current code tolerates, but it establishes one canonical identity and keeps task/runtime consumers simple. Existing current-format topology produced by the planner/metadata mapper is expected to satisfy the invariant; no persisted-data migration is introduced.
- **Collaboration tools bypass the generic MCP operation mapper.** A global change could preserve codes for all tools, but it would also change unrelated provider result shapes outside this ticket. The focused envelope/adapter is safer and still gives both communication tools one public contract.
- **Requested Team address is not added to Team Communication DTOs.** The approved observable participant is the real coordinator Agent. Recording both requested Team and final Agent can be a future independent history/UI requirement.

## Risks

1. **Config-copy omission:** `TeamRunConfig` is reconstructed in several files. Missing one copy would silently lose `effectiveHandoffs`. Implementation must audit every `new TeamRunConfig(...)` call listed in investigation.
2. **Child topology localization:** current helper behavior is permissive for a path outside its prefix. The strict localizer must surface current-data/config violations rather than return a mixed tree; representative current metadata and planner-produced nested configs need focused validation.
3. **Sender event identity:** removing `representedSubTeam` requires verifying `ConversationTargetAddress` still distinguishes task-team/task-agent segments while static nested Agents use their absolute member path.
4. **Definition validation timing:** cached/file-loaded definitions may not pass create/update service validation. Launch compilation must always validate the composed graph and fail before any member AgentRun is started.
5. **Shared address-context completeness:** every AgentRun construction path, including persistent/restored child members, task Agents, and task-Team members, must receive the same root TeamRun ID and canonical absolute member address. A missing or wrongly rooted address would make all derived parent/route views wrong despite a shared resolver.
6. **Task eligibility/local pairing:** DS-009 returns root-canonical placement identity while child task services operate on DS-011-localized configs. The mapper must prove exact canonical parent equality before deriving a basename and matching a direct local config; reversing that order would recreate global leaf-name ambiguity or expand scope.
7. **Provider gating/result parity:** AutoByteus bound local tools and Agent Tools MCP use different materialization paths. `delegate_task` schemas and context must change identically; `get_handoff_rules` must be unavailable outside Team context when normally gated, while direct invocation returns the coded envelope; both communication providers must serialize equal envelopes and preserve exact-run codes.
8. **External configuration transition:** configured external Agents that have not added `get_handoff_rules`, still send bare names, or still call the old task target object will not gain the new behavior automatically. This is intentional but must be documented clearly.
9. **Placement-boundary regression:** the resolver necessarily touches rich root configs, and message delivery necessarily needs runtime participant/handle data. If paths, route keys, owner coordinates, configs, or handles leak into `ResolvedTeamLogicalPlacement`, the shared boundary regains multiple identity authorities and lifecycle coupling. Type-import checks, exact-shape tests, and root-manager-private endpoint coverage are required.
10. **Team ingress validation:** unlike parent/name/route views, Team ingress is configuration-owned. DS-009 must return its canonical Agent address and DS-010 must prove that address is a direct child of the resolved Team before mapping its basename to the localized current config; it must never guess between root and local coordinator routes.
11. **Broader execution-identity debt:** older `memberPath`/`memberRouteKey` projections remain throughout runtime/history/event code. SR-006 deliberately prevents them from crossing the collaboration context/placement boundary but does not claim to normalize or migrate that wider system.

## Guidance For Implementation

- Treat the requirements and contract supplement as normative. Do not weaken the grammar to make legacy tests pass.
- Use strict comparison for stored canonical addresses and member spelling. Reject leading/trailing whitespace and case-insensitive sibling collisions; do not silently normalize authored identity.
- Preserve edge order, rule order, and valid rule text. Copy arrays on domain/config/context boundaries so active snapshots cannot be mutated by later definition refresh.
- Keep `TeamRunConfig.memberTree` the only runtime topology. Do not create a separate member index in persisted data; an ephemeral map inside one resolver call or resolver instance is acceptable.
- Make `TeamHandoffCompiler` deterministic and pure over the resolved graph. Definition validation and launch must consume that same logic.
- Convert `CollaborationContractError.code` to `GraphQLError.extensions.code` at GraphQL boundaries and to the canonical tool envelope at provider boundaries. Do not collapse typed failures into `TARGET_MEMBER_NOT_FOUND` or message-only strings.
- In `MemberLogicalAddressContext`, store exactly `{rootTeamRunId,memberAddress}`. Derive path segments, member name, parent/immediate Team, ancestors, and route selectors through `collaboration-logical-address.ts`; do not cache or reconstruct them in provider adapters.
- Forward a root-bound Team intent unchanged across parent callbacks. If a child manager attempts to resolve before the root run is reached, treat that as an invariant failure rather than a fallback opportunity.
- Build the final recipient participant from the exact Agent run config only inside the root manager's private delivery-endpoint conversion, deriving its private selector from the effective canonical Agent address. Use of the top-level subteam runtime context is only the transport handle choice. Never attach the route key, config, participant, handle, or its run ID to `ResolvedTeamLogicalPlacement`; do not overwrite the leaf participant with wrapper-team identity during sender enrichment.
- Keep Team handoffs separate from task eligibility and exact run IDs. Sharing logical placement identity does not turn handoffs into delegation ACLs, and `delegate_task` does not gain `target_agent_run_id`.
- Make both operations reach the same root `MixedTeamManager.resolveLogicalPlacement` method with the same raw `recipient_name` and `MemberLogicalAddressContext`: message delivery calls it internally, and task tooling uses the root TeamRun/backend facade. Do not share merely the parser while retaining separate message/task topology lookup; assert typed placement equality in tests.
- Keep `TeamLogicalPlacementResolver` operation-neutral: return only Agent `kind/address` or Team `kind/address/ingressAddress` rather than collapsing a Team; apply message effective-self and task derived direct-parent/self eligibility in their own consumers. Private traversal cursors/configs and every derivable path/route/owner projection must be discarded before the shared value is constructed.
- Build task identities only from `ResolvedTeamLogicalPlacement`. Never use a communication participant, collaboration handoff, target manifest, leaf-name search, caller-supplied kind, or synthetic representative.
- Preserve current TeamRun task service/activation ownership. Derive caller and target parent addresses and require exact equality before deriving/matching the target basename; a resolved placement under another Team must fail eligibility before task ID activation. Do not route it to another manager in this ticket.
- Implement localization as a source-to-output structural map, not string repair. Use `subTeamConfig.memberPath` as the only prefix, derive every output route from its output path, and obtain every output coordinator route from the paired localized direct Agent.
- Delete `stripMemberPathPrefix` and the factory's private `stripRoutePrefix`; do not retain aliases or add a task-mapper/coordinator fallback for pre-localized/root-prefixed values.
- Switch server task context, AutoByteus managed context, and MCP task context atomically to the exact two-field shared caller coordinate before deleting generic members and derived path/parent fields. Delete old target-object validation and pre-resolution direct member lookup; retain defensive validation only for task execution identities that can arrive from untrusted native input.
- Treat `{accepted,code,message,result}` as required public fields. AutoByteus returns the canonical JSON string; MCP returns matching text plus `structuredContent` and `isError` only on rejection. Both must serialize the same snake-case handoff payload (`member_address`, `handoffs`) inside `result`.
- Preserve any `AgentOperationResult.code` exactly, especially `target_agent_run_id` grant/active-run codes. Add absent-code defaults only in the shared mapper and never based on selector/provider type.
- Do not route either collaboration MCP provider through `toAgentToolMcpOperationResult` or `AgentToolsMcpResultMapper.toolResultFromOperationResult`; those generic paths are intentionally unchanged for unrelated tools.
- Focused implementation tests must cover: `localizeSubTeamRunTopology` on the three-level source tree, path-outside-prefix and invalid-direct-coordinator rejection, persistent child create, restored nested child, and task-child use of the same factory; exact two-field caller context for persistent/restored/task Agent/Team construction; identical minimal DS-009 message/task Agent and Team placements for absolute/relative paths; immutability and explicit absence of subject/owner/path/route/config/handle/settings/definition/member-run/TeamRun fields; exact root ingress plus derived current-parent `field_team` / ingress `field_lead` mapping with no fallback; root-manager-private route derivation/delivery endpoint resolution from the shared Agent address; task mapper direct Agent/Team identities sourced from current local config, parent-before-basename proof, Team-ingress parent proof, self rejection, and non-direct/deeper/cross-branch eligibility rejection; existing submit/review/settlement after all representative/target-list types are absent; rejection of every old `{target:{kind,name}}` form; result mapper supplied-code preservation and both absent-code defaults; AutoByteus send/handoff JSON success and rejection; MCP send/handoff text-vs-`structuredContent` equality and `isError`; and `target_agent_run_id` success/grant/inactive codes unchanged through both provider forms.
- Do not create `implementation-handoff.md` during solution design; the implementation engineer owns it after code and implementation-scoped checks.
