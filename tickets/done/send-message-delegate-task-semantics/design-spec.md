# Design Spec

## Current-State Read

The approved behavior is already present in the deep message and task lifecycles, but the public decision contract and result projections are not coherent end to end.

- A Team-bound prompt is composed once by `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` from `autobyteus-server-ts/src/agent-team-execution/services/member-collaboration-instruction-renderer.ts`. AutoByteus receives that shared content plus native operating guidance; Codex and Claude receive the same shared content through their provider instruction boundaries. The current collaboration section mentions both tools separately but does not state that delegation already delivers the work packet, that the tools are non-interchangeable, or that later task clarification must use the returned exact run identity.
- `send_message_to` has one shared dispatcher and two real delivery owners. Logical `recipient_address` delivery enters `RootTeamRun` and `TeamCommunicationService`; exact `target_agent_run_id` delivery enters `GlobalAgentRunMessageRouter`. Accepted logical delivery already returns the receiving `AgentOperationResult.agentRunId`. Accepted direct delivery already knows the exact target, but the direct success result does not consistently project that ID. `agent-communication-tool-result.ts` then discards all receiver identity and always emits `result:null`.
- `delegate_task` already resolves a logical placement, prepares a fresh task Agent or full task Team subtree, releases the complete work packet only after durable activation, and returns the fresh task ingress as `target_agent_run_id`. Its TypeScript result is a discriminated union, but it has no runtime-owned result schema. Native execution returns JSON text. The Agent Tools MCP adapter currently returns delegation JSON as text only, without `structuredContent`.
- The Agent Tools MCP catalog models only `name`, `description`, and `inputSchema`. The pinned `@modelcontextprotocol/sdk@1.30.0` supports `Tool.outputSchema` and validates matching `structuredContent`, but the repository's custom catalog has no output-schema seam. The server also supports MCP protocol `2025-03-26`, whose official `Tool` contract predates `outputSchema`, as well as `2025-06-18` and `2025-11-25`.
- Exact Agent-facing descriptions are split between the message tool contract, the task manifest, and the collaboration renderer. Each is already shared by native and MCP/provider projections within its own surface, but no cross-tool production contract owns the approved ATC-001 wording.
- Active module documentation contains stale relative-address, direct-child delegation, old delegation-input, and old result-envelope claims. Requirements Engineering correctly classified these as documentation drift rather than current runtime authority.

The assigned worktree is isolated and clean at approved revision `28bfe2d9846f79b8898f6841b31ce86031332d47` on `codex/send-message-delegate-task-semantics`. Its recorded base is `personal` at `9d0fd7c570d58da1af2c7a40279327c8a20a8093`. At architecture investigation time, `personal` had advanced to `d7ad96ab1f24ea6602745b5ee59efe8ebc9852ea`; the task branch was 13 commits ahead and 317 commits behind, with material but compatible Agent Tools MCP and task-tool context changes on the integration branch. Implementation must reconcile the assigned branch with the then-current integration baseline before editing source and must return `Design Impact` if that reconciliation changes the owners or contracts described here.

## Task Size And Architectural Risk (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Size rationale and supporting evidence (file/component scope, affected surfaces, or other concrete basis): The change modifies several files across established Agent Collaboration, Agent Communication, Task Delegation, prompt composition, and Agent Tools MCP projection boundaries, plus focused tests and delivery-owned documentation. It adds no new runtime service, route, persistence owner, provider backend, task lifecycle, or UI. The exact wording inventory is content-heavy, but the structural delta remains bounded to result contracts and the existing MCP catalog/projection seam.
- Architectural risk (`Low`/`High`): `High`
- Risk rationale and supporting evidence: The approved replacement of public `send_message_to.result` with flat `target_agent_run_id` is an external contract break. REQ-016 adds a machine-readable result-schema seam across native serialization and MCP `tools/list`/`tools/call`. MCP protocol-version compatibility, provider parity, exact receiving-run identity, and removal of the old field all have material blast radius even though implementation size is bounded.
- Selected route (`Direct Implementation`/`Architecture Review`): `Architecture Review`
- Escalation trigger if implementation or validation discovers new impact: Return `Design Impact` if current-base reconciliation requires changing a new runtime owner, provider-specific contract, public input, task lifecycle, persistence model, MCP protocol support policy, or schema transport beyond the files and rules below. Return `Requirement Gap` before adding runtime duplicate-message blocking, removing exact-run clarification, changing task statuses, changing message/delegation selectors, or retaining the old result through compatibility behavior.

### Structural Versus Payload Check

- Payload surfaces: the exact ATC-001 collaboration block; exact `send_message_to` and `delegate_task` summaries; relevant field descriptions; module documentation; exact-copy and scenario fixtures.
- Structural surfaces: the `send_message_to` public result type/mapper/serializer; the accepted exact-run identity invariant; the `delegate_task` runtime result schema; MCP supported-tool definitions, protocol-aware output-schema projection, and structured result projection.
- Persistence/runtime owner impact: no persisted record changes and no new execution or lifecycle owner. `RootTeamRun`, `TeamCommunicationService`, `GlobalAgentRunMessageRouter`, and `TaskDelegationService` retain their current authorities.
- Classification consequence: content volume does not make this `Large`; the external output contract and new schema-projection boundary do make it `High` risk.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Approved requirements and contract read | `tickets/in-progress/send-message-delegate-task-semantics/requirements-doc.md`; `agent-team-collaboration-contract.md`; `orchestration-decision-table.md` | RER-013 and ATC-001 are approved; exact prompt/tool copy and flat message identity are authoritative; DEC-001 Option A is closed | Preserve exact upstream text and behavior; do not redesign intent | None |
| Worktree/base verification | `git status --short --branch`; `git worktree list --porcelain`; `git merge-base HEAD personal`; `git rev-list --left-right --count HEAD...personal` | Dedicated clean worktree; recorded merge base is intact; integration branch moved materially | Keep all artifacts here; require current-base reconciliation before source edits | Future integration head may advance again |
| Shared prompt trace | `autobyteus-server-ts/src/agent-team-execution/services/member-collaboration-instruction-renderer.ts`; `.../team-collaboration-instruction-renderer.ts`; `.../agent-execution/prompt/carpenter-prompt-composer.ts`; provider parity unit test | One renderer feeds shared/native composition and provider parity is pinned | Introduce one production owner for the exact cross-tool LLM copy and have the renderer consume it | None |
| Message contract and output trace | `src/agent-communication/services/send-message-to-tool-contract.ts`; `send-message-to-dispatcher.ts`; `agent-communication-tool-result.ts`; `src/agent-tools/agent-communication/send-message-to.ts`; `src/agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.ts` | Native/MCP descriptions share constants; result mapper is send-only despite a generic name and always emits `result:null` | Replace the loose generic envelope with a send-specific runtime result contract and remove the old field cleanly | None |
| Receiver identity trace | `src/services/team-communication/team-communication-service.ts`; `src/agent-execution/domain/agent-operation-result.ts`; `src/agent-communication/services/global-agent-run-message-router.ts` | Logical delivery returns exact receiver `agentRunId`; direct delivery knows the exact target but does not consistently attach it to accepted results | Make exact accepted receiver identity an invariant before public mapping; do not resolve identity in the projection layer | None |
| Task result trace | `src/agent-team-execution/task-delegation/task-delegation-record.ts`; `task-delegation-service.ts`; `src/agent-tools/task-delegation/task-delegation-tool-manifest.ts`; `delegate-task.ts` | Service returns the approved active/not-started union and complete work is already delivered during activation | Add runtime schema beside the task domain result and reuse it in native/MCP projections; do not change lifecycle | None |
| MCP definition/result trace | `src/agent-tools/mcp/agent-tool-mcp-definition-provider.ts`; `agent-tool-mcp-catalog.ts`; `agent-tools-mcp-schema-mapper.ts`; `agent-tools-mcp-result-mapper.ts`; task/message adapter providers | Internal tool definition has input schema only; send has structured content; delegation has text only | Add optional output schema only to the existing definition/catalog seam and add a reusable structured-JSON transport mapper | None |
| Pinned SDK package probe | `pnpm-lock.yaml`; `npm pack @modelcontextprotocol/sdk@1.30.0`; package `dist/esm/types.js` and `client/index.js` | SDK Tool supports root-object `outputSchema`; clients require and validate `structuredContent` for non-error results when one is declared | Project runtime result schemas as MCP root-object output schemas and always provide matching structured content for declared non-error results | No repository dependencies were installed, so the implementation must execute the tests |
| Official MCP protocol check | `https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-03-26/schema.ts`; `https://modelcontextprotocol.io/specification/2025-06-18/server/tools` | `2025-03-26` has no standard `outputSchema`; `2025-06-18` adds it and requires conforming structured results | Make output-schema advertisement protocol-aware instead of emitting a post-version field unconditionally | Client tolerance of existing pre-2025-06 structured-content extensions is preserved, not expanded |
| Supported protocol trace | `src/agent-tools/mcp/agent-tools-mcp-routes.ts` | Server accepts `2025-03-26`, `2025-06-18`, and `2025-11-25`, defaulting missing header to `2025-03-26` | `tools/list` needs negotiated-version context when projecting optional output schemas | None |
| Active documentation scan | `rg -n -i "send_message_to|delegate_task|direct child|relative address|result" autobyteus-server-ts/docs autobyteus-ts/docs` | Several current module docs contradict absolute/universal addressing and current task results; message docs pin old `{...,result}` | Delivery must perform an active-doc consistency sweep using ATC-001 and implemented code | Historical ticket evidence must remain historical |

## Intended Change

Implement ATC-001 as one coherent collaboration contract without altering the existing message/task lifecycle:

1. Add one cross-tool Agent-facing copy owner under `src/agent-collaboration`. It exports the exact approved collaboration block, exact message/delegation summaries, and the approved relevant field descriptions. The prompt renderer, message tool contract, and task manifest consume their respective constants. Formatting/escaping may differ only at provider serialization boundaries.
2. Replace the send-only generic result envelope with a strict `send_message_to` result contract. A successful branch requires non-empty `target_agent_run_id`; a rejected branch requires `target_agent_run_id:null`. Both branches require `accepted`, `code`, and `message`; no `result` property is accepted or emitted.
3. Make accepted exact-run delivery carry `AgentOperationResult.agentRunId = targetAgentRunId`. Logical Team delivery continues to carry the receiver resolved by `TeamCommunicationService`. The public mapper consumes this owner-provided identity and fails fast on an impossible accepted-without-identity result rather than guessing or emitting a schema-invalid success.
4. Add an authoritative runtime schema for the existing `DelegateTaskResult` union and derive its public TypeScript type from that schema. Validate the result at the task manifest boundary used by both native and MCP execution. Do not change active/not-started fields or task lifecycle.
5. Extend only the existing Agent Tools MCP definition/catalog boundary with optional output-schema support. Convert the authoritative runtime result schema into a root-object JSON Schema. Advertise `outputSchema` for the first-party message/delegation tools when the negotiated protocol supports it (`2025-06-18` and `2025-11-25`); omit it for `2025-03-26`, where no standard field exists. Do not invent schemas for configured/application tools whose owners did not supply one.
6. Reuse one MCP transport helper that derives `structuredContent` from the exact serialized JSON text, preventing text/object drift. `send_message_to` supplies success or typed rejection; `delegate_task` supplies active or not-started results. Existing tool-execution exceptions remain MCP errors and need not fabricate schema-shaped business results.
7. Update deterministic contract tests, provider parity tests, repository/integration coverage, and realistic configured-runtime checks. Delivery updates active documentation after implementation behavior is fixed.

No runtime classifier or duplicate-call blocker is introduced. The approved duplicate-dispatch rule is taught through prompt/tool metadata and verified through representative orchestration behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001–REQ-003, REQ-011, REQ-012; AC-001, AC-011, AC-012 | Team-bound Agent prompt/tool exposure | Investigation SRC-004, SRC-010–SRC-012 | Keep both tools intrinsic; present the intent-first non-interchangeability rule and prohibit same-packet double dispatch without a forced-tool policy or runtime classifier | Team launch -> shared contract composition -> provider prompt/tool catalog -> LLM choice; DS-001 |
| BEH-002 | System / Contract | REQ-001, REQ-007, REQ-014; AC-002, AC-008, AC-014 | `send_message_to` with logical or exact selector | SRC-005, SRC-006, SRC-023–SRC-027 | Preserve ordinary delivery and no-task effect; replace `result` with exact accepting existing AgentRun identity | Tool call -> dispatcher -> logical/exact owner -> target AgentRun -> send result contract; DS-002, DS-003 |
| BEH-003 | System / Contract | REQ-002, REQ-003, REQ-006, REQ-007, REQ-013, REQ-015, REQ-016; AC-003, AC-005, AC-007, AC-008, AC-013, AC-015, AC-016 | `delegate_task` with valid logical target or activation failure | SRC-007–SRC-009, SRC-021–SRC-026 | Preserve spawned fresh Agent/full Team creation, complete-packet delivery, four-case ingress identity, and `not_started` without message fallback; add authoritative schema and MCP structured parity | Tool call -> RootTeamRun -> TaskDelegationService -> fresh execution or not-started result -> result contract; DS-004, DS-005 |
| BEH-004 | Contract | REQ-004; AC-004 | Successful delegation followed by genuinely new clarification | SRC-003, SRC-005, SRC-008, SRC-009, SRC-031 | Preserve exact-run clarification using returned task ingress; logical address remains mounted placement, not task alias | Delegation result -> caller retains exact ID -> later exact `send_message_to`; DS-005 -> DS-002 |
| BEH-005 | Contract | REQ-005; AC-006 | Task assignee submits or delegator reviews | SRC-002, SRC-003, SRC-013 | Preserve formal `submit_task_result`/`review_task_result`; message wording has no lifecycle effect | Task execution -> formal submission -> review -> active/accepted; DS-006 |
| BEH-006 | Operational | REQ-008, REQ-016, REQ-017; AC-009, AC-016, AC-017 | AutoByteus/Codex/Claude materialization | SRC-004, SRC-010–SRC-012, SRC-029–SRC-030 | One semantic contract, exact descriptions, result field parity, and supported-protocol schema projection | Shared owners -> native tool or Agent Tools MCP -> provider runtime; DS-001, DS-003, DS-005 |
| BEH-007 | Contract | REQ-009; AC-010 | Maintainer reads active docs/tests | SRC-014 and architecture doc scan | Replace active contradictory guidance; preserve clearly historical evidence | Implemented contract -> delivery docs audit -> durable current docs; validation concern attached to all spines |
| BEH-008 | Contract | REQ-014–REQ-016; AC-014–AC-016 | Successful/rejected message and delegation results | SRC-023–SRC-029 | Flat message existing-run identity; existing delegate fresh-ingress identity; native/MCP text/structured parity | Delivery/activation outcome -> runtime result schema -> native/MCP projection; DS-003, DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/agent-team-collaboration-contract.md` | Exact prompt, tool copy, field semantics, result shapes, four-case matrix | REQ-001–REQ-017; AC-001–AC-017 | Normative content and behavior authority; production constants must match it exactly | Approved ATC-001 / RER-013 |
| `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/orchestration-decision-table.md` | Positive/negative operation examples | REQ-001–REQ-007, REQ-010; AC-001–AC-008 | Drives representative orchestration test cases | Approved |
| `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-brief.md` | Requirements visualization scenarios | REQ-001–REQ-007, REQ-010 | Scenario context only; does not define production UI or architecture | Delivered, non-normative for UI |
| `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-review.md` | VIS-R04 explanatory evidence | REQ-001–REQ-007, REQ-010; DEC-001 | Confirms the distinction was understandable; no production code reuse | Exploratory evidence |
| `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/validation-evidence.md` | Visualizer validation evidence | DEC-001 support | Evidence limitation reminder; does not validate runtime behavior | Exploratory evidence |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Duplicated Policy Or Coordination`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`
- Evidence: Cross-tool decision semantics are separately authored in the prompt renderer, message contract, and task manifest; the send-only result uses a falsely generic envelope and discards owner-provided identity; the task union has a static type but no runtime schema; the custom MCP catalog cannot expose result schemas; active docs repeat stale policies.
- Design response: Centralize only the approved Agent-facing copy, keep operation-specific result authority with each operation, add one narrow output-schema seam to the existing MCP catalog, and replace the generic structured result mapper with one transport-only JSON helper.
- Refactor rationale: These refactors are necessary to make the approved external contract single-purpose and verifiable. Leaving `AgentCommunicationToolResultEnvelope<TResult>` or ad hoc native/MCP result construction would preserve the exact ambiguity and projection drift the requirements target.
- Intentional deferrals and residual risk, if any: No runtime mechanism guarantees probabilistic LLM compliance; realistic evaluation remains required. Core `autobyteus-ts ToolDefinition` is not expanded with an unused provider-native output-schema API because native provider manifests have no current output-schema channel; native JSON is instead validated at the public tool result boundary. If a future native provider adds such a channel, it should consume the same runtime schemas rather than define another schema.

## Terminology

- **Agent-facing collaboration copy owner:** Production constants containing the exact approved shared prompt/tool metadata. It owns wording, not message or task runtime behavior.
- **Runtime result schema:** A strict schema used to validate the actual public tool result and derive its TypeScript type and MCP JSON Schema.
- **Existing ingress:** The existing mounted AgentRun selected by messaging; for an AgentTeam logical address, its existing configured coordinator.
- **Fresh task ingress:** The newly spawned task AgentRun or newly spawned task Team coordinator AgentRun returned by successful delegation.
- **Protocol-aware output-schema projection:** Advertising MCP `outputSchema` only for negotiated protocol versions that define that field while retaining one runtime result contract.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Delete the `result` field and generic result-envelope type; do not retain `result:null`, duplicate the identity under both fields, accept both output shapes, or add a fallback mapper. Replace the send-specific MCP mapper with the shared structured-JSON transport helper. Remove stale prompt/description strings and stale active documentation claims in the same delivery.
- Decision rule: All current in-scope producers, tests, and docs move to the approved flat result atomically. Historical ticket artifacts remain untouched as historical evidence.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Existing Team communication messages and task delegation ledgers under root TeamRun persistence; no stored shape is changed.
- Relevant code-model, serialization, semantic, or physical-store change: Public transient tool-result schemas and prompt/tool metadata only.
- Normal reader/writer behavior and representative evidence: `TeamCommunicationService` continues to persist accepted messages; `TaskDelegationService` continues to persist the same task records and statuses. Public result mapping occurs after those owners complete.
- Required semantics and invariants under direct use: Existing task/message records, execution identities, message history, task status, submissions, reviews, and settlement remain byte/meaning compatible.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No store rewrite, data loss, reset, or rebuild is authorized.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: The changed result exists only in transient tool-call output. A migration would provide no benefit and would introduce prohibited historical-shape handling.
- Acceptance criteria or design constraints supported by this decision: AC-011 and QR-001; input, routing, persistence, and lifecycle behavior stay unchanged.

### Migration Plan

N/A — no persisted data or external stored representation changes.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-006 | Team-member prompt/tool materialization | LLM receives prompt and tool definitions | Agent-facing collaboration copy owner plus existing composer/catalog boundaries | Determines correct tool choice before execution |
| DS-002 | Primary End-to-End | BEH-002, BEH-004 | `send_message_to` call | Existing target AgentRun accepts input | `SendMessageToDispatcher`, then logical or exact delivery owner | Preserves existing-execution communication and exact identity |
| DS-003 | Return-Event | BEH-002, BEH-006, BEH-008 | Accepted/rejected message outcome | Native JSON or MCP text/structured result | Send result contract | Carries flat existing-run identity or typed rejection |
| DS-004 | Primary End-to-End | BEH-003 | `delegate_task` call | Fresh task Agent/Team ingress receives the packet | `RootTeamRun` / `TaskDelegationService` | Preserves one-call creation and delivery |
| DS-005 | Return-Event | BEH-003, BEH-004, BEH-006, BEH-008 | Active/not-started delegation outcome | Native JSON or MCP text/structured result | Delegate result contract at task manifest boundary | Carries task ID/status and fresh ingress without projection drift |
| DS-006 | Primary End-to-End | BEH-005 | Task assignee result submission | Delegator review yields active or accepted task | Existing `TaskDelegationService` | Keeps formal lifecycle separate from messaging |

## Primary Execution Spine(s)

- DS-001: `Team member launch -> Carpenter shared prompt composition -> AgentTeam collaboration renderer -> native prompt or provider system instruction -> native/MCP tool catalog -> LLM tool choice`
- DS-002 logical: `LLM tool call -> native/MCP send adapter -> SendMessageToDispatcher -> RootTeamRun recipient resolution -> TeamCommunicationService -> existing AgentRun input`
- DS-002 exact: `LLM tool call -> native/MCP send adapter -> SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> active AgentRun lookup -> exact existing AgentRun input`
- DS-004: `LLM tool call -> native/MCP delegation adapter -> TaskDelegationToolService -> RootTeamRun placement/authorization -> TaskDelegationService -> fresh task Agent or fresh task Team coordinator input`
- DS-006: `Task execution -> submit_task_result -> TaskDelegationService -> awaiting_review -> review_task_result -> active or accepted`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | One exact collaboration block is composed with dynamic addressing; one exact description set is consumed by both native and MCP catalogs. Provider adapters project, but do not rewrite, the contract. | collaboration copy, renderer, composer, tool catalog | Cross-tool copy owner; existing composer/catalog own placement | exact-copy tests, field descriptions, provider parity |
| DS-002 | The dispatcher validates one selector, then hands logical delivery to the root Team owner or exact delivery to the global live-run owner. The accepting owner returns the exact receiver identity. | dispatcher, RootTeamRun/GlobalRouter, target AgentRun | Route-specific delivery owner | selector parser, grants, persistence/event publication |
| DS-003 | The send result contract maps owner output into one strict success/failure object, serializes it once, and uses that serialization for native JSON plus MCP text/structured content. | send result contract, native wrapper/MCP adapter | Send result contract | output-schema conversion, MCP protocol gating |
| DS-004 | Delegation validates one logical target, prepares one fresh execution, commits lifecycle state, releases the already-complete work packet, and returns the fresh ingress. | RootTeamRun, TaskDelegationService, prepared task execution | TaskDelegationService | reference validation, persistence commit, identity allocation |
| DS-005 | The existing active/not-started union is runtime-validated at the shared manifest boundary and serialized identically for native/MCP. | delegate result schema, manifest, adapter | Delegate result contract | MCP structured JSON and output schema |
| DS-006 | Formal task result/review tools continue to mutate lifecycle state; message prose remains ordinary input only. | task execution, TaskDelegationService, review owner | TaskDelegationService | notifications and settlement |

## Spine Actors / Main-Line Nodes

| Node | Direct Role |
| --- | --- |
| Agent-facing collaboration copy contract | Supplies approved prompt/tool metadata without runtime behavior |
| Carpenter prompt composer / member renderer | Places the shared contract in Team-bound prompts |
| Native tool / Agent Tools MCP catalog | Exposes operation-specific schema and descriptions |
| `SendMessageToDispatcher` | Selects logical versus exact message route after input validation |
| `RootTeamRun` / `TeamCommunicationService` | Resolve and deliver logical messages to existing configured ingress |
| `GlobalAgentRunMessageRouter` | Delivers exact-run messages to a currently active AgentRun |
| Send result contract | Enforces and serializes flat existing-run identity |
| `RootTeamRun` / `TaskDelegationService` | Authorize, activate, persist, and release one fresh task execution |
| Delegate result contract / manifest | Enforces the active/not-started public result |
| Native/MCP result projector | Carries already-owned results to providers without semantic mutation |

## Ownership Map

- Agent Collaboration owns cross-tool Agent-facing wording and the identity distinction, not delivery or task lifecycle.
- Agent Communication owns `send_message_to` selectors, dispatch, public result semantics, exact-run routing, and its output validation.
- `RootTeamRun` plus `TeamCommunicationService` own logical target resolution/delivery and the exact receiving AgentRun identity.
- `GlobalAgentRunMessageRouter` owns live exact-run lookup/delivery and must attach the selected accepted receiver identity.
- Task Delegation owns new execution preparation, work-packet release, task state, and its result union.
- Agent Tools MCP owns protocol/tool definition projection and MCP result envelopes; it must not infer business result fields or receiver identities.
- Delivery owns current documentation synchronization after implementation and validation evidence are available.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AutoByteusSendMessageToTool` | `SendMessageToDispatcher` and send result contract | Native BaseTool binding | target resolution, identity guessing, provider-specific shape |
| `SendMessageToMcpAdapterProvider` | Same send owners | MCP availability/transport binding | message semantics or duplicate-dispatch policy |
| `DelegateTaskTool` | `TaskDelegationService` through tool service/root | Native BaseTool binding | task state or fresh identity allocation |
| `TaskDelegationToolsMcpAdapterProvider` | Task manifest/service | MCP availability/transport binding | task lifecycle, schema redefinition |
| `renderMemberCollaborationInstruction` | exact copy contract plus dynamic address template | Compose Addressing and Collaboration sections | provider-specific rewording |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AgentCommunicationToolResultEnvelope<TResult>` and `result:null` | The generic slot has no payload user and contradicts ATC-001 | Strict send result schema/type | In This Change | No alias or dual field |
| `agent-communication-tool-result.ts` generic filename/responsibility | It is used only by `send_message_to` | `send-message-to-tool-result-contract.ts` | In This Change | Git move/clean replacement |
| Send-specific `agent-communication-mcp-result-mapper.ts` | Structured JSON mapping is transport-generic and needed by delegation too | MCP structured-JSON result helper | In This Change | Operation schemas remain outside helper |
| Current collaboration prompt lines | They omit the approved choice/identity rules | Exact ATC-001 collaboration block constant | In This Change | Addressing section remains |
| Current terse send/delegate descriptions and relevant field copy | They underspecify operation effects/results | Exact cross-tool copy contract | In This Change | Preserve unrelated field descriptions |
| Stale active documentation claims | They contradict current/approved behavior | Delivery-updated current docs | In This Change | Historical ticket docs remain untouched |

## Return Or Event Spine(s) (If Applicable)

- DS-003 send return: `Delivery owner AgentOperationResult -> strict send result schema -> one serialized JSON string -> native result OR MCP content + parsed structuredContent -> LLM/provider event projection`.
- DS-005 delegation return: `TaskDelegationService active/not_started outcome -> manifest runtime schema -> one serialized JSON string -> native result OR MCP content + parsed structuredContent -> LLM/provider event projection`.
- Provider event/run-history normalization remains downstream of MCP and is unchanged; it consumes the effective result already exposed by the Agent Tools MCP boundary.

## Bounded Local / Internal Spines (If Applicable)

N/A — no event loop, worker cycle, state machine, or queue behavior is changed. Existing task mutation serialization and AgentRun input queues remain behind their current owners.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime result schemas | DS-003, DS-005 | send/delegate result owners | Validate fields and derive TS/MCP types | Prevent prose/type/wire drift | Transport starts defining business outcomes |
| MCP schema mapper | DS-001, DS-003, DS-005 | MCP catalog | Convert owned runtime schemas to protocol JSON Schema | One protocol projection rule | Operation modules duplicate protocol rules |
| Structured-JSON MCP helper | DS-003, DS-005 | MCP adapters | Parse exact serialized text into structured content | Guarantees text/object equality | Generic result mapper guesses business fields |
| Exact-copy/parity tests | All | contract owners | Pin ATC-001, provider parity, no duplicate block | Detect drift | Runtime code grows test-only branching |
| Active-doc audit | All | Delivery | Remove current contradictory guidance | Maintainer contract parity | Documentation becomes runtime authority |
| Realistic model evaluation | DS-001 | API/E2E validation | Exercise message/task/clarification/failure/lifecycle choices | Prose compliance is probabilistic | Production adds unapproved heuristics |

## Ownership Boundaries

The cross-tool copy contract is authoritative only for LLM-facing wording. Calls must still enter the operation owner: message calls through `SendMessageToDispatcher`, task calls through the task service/root boundary. Neither prompt rendering nor MCP projection may resolve recipients, create task state, or synthesize target identities.

Runtime result schemas belong beside the operation whose outcome they describe. The MCP layer may convert and advertise those schemas, but it cannot duplicate them as hand-written protocol-only schemas. Conversely, operation owners must not embed MCP protocol-version logic; the catalog/dispatcher owns whether the negotiated protocol can advertise `outputSchema`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SendMessageToDispatcher.dispatch` | selector parsing/validation, logical intent construction, exact router selection | native and MCP send adapters | adapters call RootTeamRun or AgentRunManager directly | enrich dispatcher/owner result, not adapter logic |
| `RootTeamRun.deliverInterAgentMessage` | topology resolution, Team communication commit/input | dispatcher logical route | mapper derives coordinator from address | return exact accepted `agentRunId` from owner |
| `GlobalAgentRunMessageRouter.deliver` | live lookup, grants, direct input/event | dispatcher exact route | mapper trusts requested ID without accepted delivery | return accepted target identity explicitly |
| `RootTeamRun.delegateTask` / task service | target authorization, activation, persistence, packet release | native/MCP delegation adapters | adapters prepare task executions | strengthen service result, not transport |
| Runtime result contract | schema, type, validation/serialization | native and MCP projections | separate hand-written native and MCP output types | extend the contract export |
| Agent Tools MCP catalog | protocol definition projection | `tools/list` dispatcher | operation modules emit protocol-version fields | pass negotiated version into catalog projection |

## Dependency Rules

- Prompt renderer, message tool contract, and task manifest may depend on the shared Agent Collaboration copy contract. The copy contract must not import runtime adapters, dispatchers, or services.
- Message result mapping may depend on `AgentOperationResult`; `AgentOperationResult` and delivery owners must not depend on tool transport or MCP.
- Task result schema lives in Task Delegation and may be re-exported by the existing record contract; MCP imports the schema, never the reverse.
- MCP adapter definitions may reference operation-owned output schemas. MCP catalog/schema mapper owns JSON Schema conversion and protocol gating.
- Native and MCP adapters must call the same dispatcher/service and serialize the same validated result. Provider-specific result rewording or schema forks are forbidden.
- Configured/application MCP tool definitions remain unaffected unless their own owners explicitly provide output schemas; do not infer schemas from observed results.
- No dependency may read requirements Markdown at runtime. Tests compare production exports with approved expected literals/fields.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `send_message_to` | ordinary message | Deliver to one existing execution | exactly one of logical `recipient_address` or exact active `target_agent_run_id` | Inputs unchanged |
| `SendMessageToResultSchema` | message tool outcome | Validate success/rejection and exact existing receiver | success string; rejection null | No `result` property |
| `delegate_task` | new tracked task | Spawn one fresh Agent/Team and deliver packet | logical `recipient_address` only | Inputs unchanged |
| `DelegateTaskResultSchema` | delegation activation outcome | Validate active/not-started union | active has fresh ingress; not-started has no ingress | `task_id` remains lifecycle identity |
| `AgentToolMcpSupportedToolDefinition.outputSchema?` | first-party MCP result metadata | Carry an operation-owned schema source | schema object, not tool input | Optional because not every tool/version supplies it |
| `listMcpToolsForSession(session, protocolVersion)` | MCP tool list | Project definitions legal for negotiated protocol | session + supported protocol version | No provider-specific semantic differences |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `send_message_to` input | Yes | Yes | Medium | Keep exclusive selector validation and clarify operation effect |
| send result | Yes after change | Yes | Low | Strict discriminated runtime schema; exact owner identity |
| `delegate_task` input | Yes | Yes | Low | Preserve logical-only selector and complete packet fields |
| delegate result | Yes | Yes | Low | Derive TS/MCP projection from runtime schema |
| MCP supported definition | Yes | Yes | Low | Keep input and output schema properties separate and optional as protocol requires |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Cross-tool wording | `agent-team-collaboration-llm-contract.ts` | Yes | Low | Do not call it a generic helper |
| Message public outcome | `send-message-to-tool-result-contract.ts` | Yes | Low | Remove generic AgentCommunication envelope name |
| Delegation outcome | `task-delegation-result-contract.ts` | Yes | Low | Keep result separate from persisted task records |
| MCP transport utility | `agent-tools-mcp-structured-json-result.ts` | Yes | Low | Must not own operation schemas |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Cross-tool collaboration semantics | `agent-collaboration` | Extend | Already owns collaboration addresses/errors shared by message/task paths | N/A |
| Message dispatch/result | `agent-communication` | Extend | Existing authoritative public send boundary | N/A |
| Task activation/result | `agent-team-execution/task-delegation` and task tool manifest | Extend | Existing lifecycle and result owners | N/A |
| MCP output metadata/result | `agent-tools/mcp` | Extend | Existing custom catalog/schema/result projection | N/A |
| Provider prompt composition | existing Carpenter renderer/composer | Reuse | Already shared across AutoByteus/Codex/Claude | N/A |
| Runtime duplicate prevention | None | Do not create | Not approved; guidance/evaluation is required instead | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Collaboration | Exact approved cross-tool LLM copy | DS-001 | prompt/tool contract owners | Extend | Static contract only |
| Agent Communication | Send dispatch, accepted receiver invariant, public result | DS-002, DS-003 | existing target AgentRun | Extend | No task behavior |
| Task Delegation | Fresh execution lifecycle and public result schema | DS-004–DS-006 | RootTeamRun/TaskDelegationService | Extend | No lifecycle changes |
| Agent Tools MCP | Output-schema and structured-result projection | DS-001, DS-003, DS-005 | operation result owners | Extend | Protocol-aware projection |
| Prompt Engineering | Composition placement | DS-001 | Carpenter composer | Reuse | Consumes contract, does not rewrite |
| Documentation | Current maintainer guidance | All | Delivery | Extend | Delivery-owned phase |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Agent Collaboration | cross-tool content owner | Exact prompt, summaries, relevant field descriptions | One approved LLM decision contract | N/A |
| `src/agent-communication/services/send-message-to-tool-result-contract.ts` | Agent Communication | send public output | Strict schema, inferred type, mapping, serialization | One operation/result subject | Uses `AgentOperationResult` |
| `src/agent-team-execution/task-delegation/task-delegation-result-contract.ts` | Task Delegation | delegate public output | Active/not-started runtime schema and inferred type | One task outcome subject | Re-exported through record contract |
| `src/agent-tools/mcp/agent-tools-mcp-structured-json-result.ts` | Agent Tools MCP | transport projection | Text-to-structured object parity helper | Reused by two operation adapters | Yes |
| Existing contract/manifest/renderer files | respective subsystem | thin projection | Consume centralized copy and owned schemas | Preserve established public entry files | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Exact collaboration prompt/tool semantics | `agent-team-collaboration-llm-contract.ts` | Agent Collaboration | Three production projections implement one approved mental model | Yes | Yes | runtime orchestration service |
| MCP JSON text + structured object mapping | `agent-tools-mcp-structured-json-result.ts` | Agent Tools MCP | Same transport invariant for send/delegate | Yes | Yes | generic business-result mapper |
| Target AgentRun identity field name | Operation result schemas | Operation owners | Same field name, different existing/fresh semantics | Yes | Yes | shared kitchen-sink result base |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Send result schema | Yes | Yes | Low | Disallow `result`; discriminate accepted success/rejection |
| Delegate result schema | Yes | Yes | Low | Active requires fresh ingress; not-started omits it |
| MCP supported definition | Yes | Yes | Low | Separate `inputSchema` and optional `outputSchema` |
| Cross-tool LLM copy contract | Yes | Yes | Medium | Export named operation-specific constants, not one mutable text bag |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Agent Collaboration | Agent-facing copy owner | Exact ATC-001 prompt/tool/field text | Semantically one collaboration decision contract | N/A |
| `.../agent-team-execution/services/member-collaboration-instruction-renderer.ts` | Team prompt composition | thin renderer | Dynamic Addressing + imported exact Collaboration block | Existing composition boundary | copy contract |
| `.../agent-communication/services/send-message-to-tool-contract.ts` | Agent Communication | send metadata facade | Name plus re-export/use of approved send copy and stable unrelated field descriptions | Keeps callers operation-local | copy contract |
| `.../agent-communication/services/send-message-to-tool-result-contract.ts` | Agent Communication | send output owner | Runtime schema/type/map/serialize | Replaces generic envelope | `AgentOperationResult` |
| `.../agent-communication/services/global-agent-run-message-router.ts` | Agent Communication | exact delivery owner | Attach exact accepted receiver identity | Owner already knows identity | N/A |
| `.../agent-tools/agent-communication/send-message-to.ts` | Native adapter | thin facade | Consume new result contract | No business logic | send contract |
| `.../agent-team-execution/task-delegation/task-delegation-result-contract.ts` | Task Delegation | task output owner | Runtime schema and inferred union | Separate transient result from persistence records | N/A |
| `.../agent-team-execution/task-delegation/task-delegation-record.ts` | Task Delegation | existing contract facade | Re-export result type; keep input/other result types | Limits import churn | result contract |
| `.../agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Task tool contract | manifest | Approved delegate copy, result schema, shared execution validation | Native/MCP consume one entry | copy/result contracts |
| `.../agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Task tool contract | input metadata | Approved field descriptions only | Existing input schema owner | copy contract |
| `.../agent-tools/mcp/agent-tool-mcp-definition-provider.ts` | MCP | internal definition | Optional output-schema source | Existing definition seam | operation schema |
| `.../agent-tools/mcp/agent-tools-mcp-schema-mapper.ts` | MCP | schema projector | Runtime schema -> root-object MCP JSON schema | Existing schema owner | Zod source |
| `.../agent-tools/mcp/agent-tool-mcp-catalog.ts` | MCP | tools/list owner | Protocol-aware outputSchema projection | Existing catalog owner | schema mapper |
| `.../agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` | MCP | JSON-RPC dispatch | Pass negotiated protocol to tool list | Already owns protocol context | catalog |
| `.../agent-tools/mcp/agent-tools-mcp-structured-json-result.ts` | MCP | transport helper | One serialized JSON -> text + structured content | Shared transport invariant | N/A |
| `.../agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.ts` | MCP adapter | thin send facade | Attach schema and project validated result | Existing adapter | send/result contracts |
| `.../agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.ts` | MCP adapter | thin task facade | Attach delegate schema and structured result | Existing adapter | manifest/result helper |

## Applied Patterns (If Any)

- **Thin facade:** native and MCP adapters bind context/transport and delegate to existing owners.
- **Adapter:** MCP schema/result projectors translate operation-owned contracts into protocol shapes.
- **Discriminated union:** send acceptance and delegate activation statuses define mutually exclusive public result branches.
- **Single-source contract constants:** exact Agent-facing wording is authored once and consumed without provider-local rewriting.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | File | cross-tool collaboration contract | Approved static copy | Shared by both operation families and prompt | dispatch or lifecycle code |
| `autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-result-contract.ts` | File | send output | Strict message result | Public send adapter concern | task results or MCP protocol logic |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-result-contract.ts` | File | delegate output | Strict delegate result | Task lifecycle domain owns meaning | provider adapters |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-structured-json-result.ts` | File | MCP transport | JSON text/structured equivalence | Shared MCP projection concern | send/delegate field definitions |
| Existing files named in final responsibility mapping | File | established owners | Focused modifications | No new folder is needed | mixed ownership or compatibility paths |

The existing layout remains flatter because each affected capability already has a clear folder and the change adds one focused file per real owner. Creating a new multi-level “collaboration contract framework” would over-split a bounded contract change.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-collaboration/domain` | Main-Line Domain-Control | Yes | Low | Shared semantic contract, no execution |
| `src/agent-communication/services` | Main-Line Domain-Control | Yes | Medium | Contains dispatch/result concerns for one public operation; use precise file names |
| `src/agent-team-execution/task-delegation` | Main-Line Domain-Control | Yes | Low | Existing lifecycle owner |
| `src/agent-tools/mcp` | Transport | Yes | Low | Protocol projection only |
| `src/agent-tools/mcp/providers` | Transport | Yes | Low | Thin adapters only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Send result | `{accepted:true,code:"DELIVERED",message:"...",target_agent_run_id:"existing-run"}` | `{...,result:null}` or `{...,result:{target_agent_run_id:"..."}}` | Pins the approved flat clean cut |
| Rejected send | `{accepted:false,code:"...",message:"...",target_agent_run_id:null}` | success with null identity or rejected result with a guessed ID | Preserves exact acceptance meaning |
| Delegate active result | `{task_id:"task-1",status:"active",target_agent_run_id:"fresh-ingress"}` | returning TeamRun ID or logical address as task ingress | Keeps execution and lifecycle identity distinct |
| Result ownership | delivery owner returns exact ID -> result schema validates -> MCP projects | MCP adapter resolves address or infers target | Prevents boundary bypass |
| MCP schema | operation Zod schema -> mapper -> root-object `outputSchema` for supported protocol | separate hand-written MCP-only JSON schema | Prevents type/schema drift |
| Clarification | later `send_message_to(target_agent_run_id=delegation.target_agent_run_id)` with new content | resend original packet to logical `recipient_address` | Implements DEC-001 Option A without aliasing |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `result:null` beside new field | Existing consumers/tests assert it | Rejected | Update all in-scope producers/consumers/tests/docs atomically |
| Nest ID under `result` | Existing envelope slot exists | Rejected | Flat `target_agent_run_id` per DEC-002 |
| Emit old/new shape by provider | Reduce rollout break | Rejected | One operation result across native/MCP/providers |
| Runtime duplicate-message classifier/blocker | Enforce prose rule deterministically | Rejected | Exact guidance plus representative evaluation; no new behavior |
| Treat logical address as delegated task alias | Simplify follow-up | Rejected | Use returned exact active task ingress only |
| Advertise post-2025-03 `outputSchema` unconditionally | Simplify catalog code | Rejected | Protocol-aware tools/list projection from one runtime schema |

## Derived Layering (If Useful)

`Approved semantic copy and operation result contracts -> existing orchestration/delivery owners -> thin native/MCP adapters -> provider/runtime projection -> tests/docs/evaluation`.

This is explanatory only. Dependency direction is governed by the ownership rules above, not by a generic layered framework.

## Change / Refactor Sequence

1. In the assigned worktree, reconcile the task branch with the then-current `personal` integration baseline using repository-approved Git practice. Re-run the affected-path diff. Stop with `Design Impact` if current owners or public contracts materially differ.
2. Add the Agent Collaboration LLM contract constants from approved ATC-001. Update the member renderer, send contract, task manifest, and task parameter descriptions to consume them. First pin exact production values and provider-shared single-block composition.
3. Add the strict send result contract, rename/remove the generic envelope file, and update native/MCP imports. Update `GlobalAgentRunMessageRouter` so every accepted exact-run delivery carries the exact target `agentRunId`. Validate success/failure mapping and remove every source/test reference to the public `result` field.
4. Add the delegate runtime result schema and derived type. Re-export it through the current task record contract as needed and validate `delegate_task` results at the shared manifest boundary. Do not touch other task result schemas unless compilation requires import adjustment.
5. Extend the internal MCP supported definition and schema mapper with optional output schema. Add protocol-aware catalog projection and pass the negotiated protocol version from the method dispatcher. Use the official root-object constraint and do not add output schemas to unrelated configured/application tools.
6. Replace the send-specific MCP result mapper with the reusable structured-JSON helper. Use it for send and for schema-bearing `delegate_task` results so native JSON, MCP text, and MCP structured content derive from the same validated object. Preserve task tool exceptions and unrelated tool adapters.
7. Update focused unit/integration tests, then run typecheck/build and the affected/broader server suites. Confirm MCP `2025-03-26` omits outputSchema while later supported versions advertise a valid schema and receive matching structured content.
8. API/E2E validates the four Agent/AgentTeam outcomes, exact-run clarification, not-started behavior, formal lifecycle separation, provider parity, and representative model tool choice with event/task counts proving no duplicate assignment.
9. Delivery synchronizes active documentation, removes stale current claims, requests explicit user verification, and performs final repository integration/finalization. No successful terminal result is sent before those gates complete.

## Key Tradeoffs

- Centralizing exact Agent-facing copy reduces drift, but prompt and tool descriptions remain distinct named constants because the approved text is context-specific; generating one from another would alter exact copy and reduce readability.
- Zod/runtime schemas become the result authority and MCP JSON Schema is derived. This adds a small conversion rule for discriminated unions but avoids parallel TypeScript/JSON schema definitions.
- The MCP output schema is advertised only when the negotiated protocol defines it. This preserves protocol correctness while server-side/native validation and result payload semantics remain identical. Older protocol clients still receive the same JSON text and current structured-result behavior, but cannot receive a standard field that their protocol does not define.
- The core `autobyteus-ts ToolDefinition` is not broadened. This keeps the change within the server-owned first-party tool boundary and avoids an unused workspace-wide API. The tradeoff is that native schema discoverability is through the public result contract/tests rather than a provider-native tool definition field.
- No runtime prevention is added for duplicate dispatch. That leaves probabilistic model risk, but it preserves approved composability and avoids a text-classification policy outside scope.

## Risks

| Risk | Consequence | Mitigation / Gate |
| --- | --- | --- |
| Current-base reconciliation changes MCP/task tool owners | Stale design or conflicts | Reconcile first; return Design Impact on material change |
| Accepted exact route omits or misstates receiver ID | Schema-invalid or misleading success | Owner-level ID invariant and direct/logical tests |
| Zod-to-JSON conversion produces non-object root | Invalid MCP Tool definition | Explicit root-object conversion/guard plus official `ToolSchema` validation |
| Output schema emitted for 2025-03 | Protocol incompatibility | Version-aware tools/list tests for every supported protocol |
| MCP text and structured content drift | Provider-dependent result meaning | Derive structured object by parsing the exact serialized text |
| Prompt is exact but model still uses both tools | Duplicate assignment persists | Representative configured-runtime evaluation with task/message counts |
| Active docs retain stale relative/direct-child/old result claims | Maintainer and model-author confusion | Delivery-owned `rg` audit and docs sync |
| External consumer expects `result:null` | Breaking contract | Approved clean cut; release note/docs; no compatibility wrapper |
| Over-centralized shared contract starts owning runtime behavior | Boundary erosion | Static constants only; operation owners retain execution/results |

## Guidance For Implementation

- Treat `agent-team-collaboration-contract.md` as exact-copy authority. Do not “improve” or shorten approved production wording during implementation.
- Use strict schemas. Success must require a non-blank exact ID; rejection must require null; delegate active/not-started branches must preserve current omission rules. Do not allow extra `result` fields.
- Prefer type inference from the runtime schema for the two in-scope public results. Do not maintain a second hand-written union that can drift.
- Ensure `GlobalAgentRunMessageRouter` attaches the exact target only after accepted delivery. Never expose a receiver identity for rejected delivery.
- Keep schema conversion in MCP. The operation contracts must not import MCP protocol types or inspect protocol versions.
- For discriminated-union JSON Schema, satisfy MCP's root `type:"object"` requirement without weakening branch constraints. Fail construction/tests if an output schema is not object-rooted.
- Include `outputSchema` only for `send_message_to` and `delegate_task` in this change. Preserve unrelated catalog definitions byte-for-byte except for type plumbing needed to support the optional field.
- `delegate_task` `status:"not_started"` is a valid tool result, not a fabricated active execution and not an invitation to send a fallback message. It should be structured and schema-valid when the protocol declares an output schema.
- Preserve `isError:true` for rejected `send_message_to`; preserve existing task exception mapping. Do not convert formal task outcomes into ordinary message results.
- Focused durable coverage must include exact prompt copy, exact tool/field descriptions, no internal requirement IDs/placeholders, no public `result`, native/MCP parity, protocol-version tool definitions, logical Agent/AgentTeam receiver identities, exact-run success/rejection, active/not-started delegation, and full Team delegation coordinator identity.
- Realistic validation must observe tool invocations and task/message events, not only final prose. One bounded assignment must create one task and no repeated logical-address message; genuine later clarification must target the returned exact task ingress.
- Do not create `implementation-handoff.md` during architecture work; Implementation Engineer owns it.
