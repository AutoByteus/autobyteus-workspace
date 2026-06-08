# Design Spec

## Current-State Read

The base branch has already made server `TeamRun -> MixedTeamManager -> AgentRunManager -> runtime AgentRun backend` the universal team execution spine. Codex and Claude team members already route `send_message_to` through server-owned runtime adapters, shared server argument parsing, `MemberTeamContext` recipient resolution, and `MixedTeamManager.deliverInterAgentMessage`.

AutoByteus remains split:

```text
AutoByteus LLM tool call
  -> autobyteus-ts SendMessageTo BaseTool
  -> native TeamCommunicationContext from customData.teamContext
  -> native InterAgentMessageRequestEvent
  -> server-built native-compatible dispatch closure
  -> server MemberTeamContext delivery request builder
  -> MixedTeamManager.deliverInterAgentMessage
```

That split means `autobyteus-ts` still owns a native team package, native team communication context, native send-message routing tool, and native team prompt injector even though server team execution no longer needs native `AgentTeam` orchestration.

Important current evidence:

- `autobyteus-ts/src/agent-team/**` contains 51 source files.
- Native `autobyteus-ts` agent-team unit/integration tests contain 34 files.
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` imports native `InterAgentMessageRequestEvent` and native `TeamCommunicationContext` only to bridge the native tool back into server delivery.
- `team-local-definition-id` is used by server definition providers/tests but currently lives under the native team package path.
- `MixedTeamManager.deliverInterAgentMessage` is already the canonical communication event/delivery owner for runtime-agnostic team messages.

## Intended Change

Move AutoByteus `send_message_to` to the same server-owned model as Codex and Claude, then delete the native AutoByteus team package from `autobyteus-ts`.

Target flow:

```text
Any runtime member tool call
  -> runtime-specific server adapter / server-owned AutoByteus BaseTool
  -> shared server send_message_to parser + validator
  -> TeamMessageTargetSelector(recipient_name OR target_agent_run_id)
  -> server delivery intent builder
  -> MemberTeamContext.deliverInterAgentMessage / TeamRun delivery boundary
  -> MixedTeamManager / TeamMemberDeliveryCoordinator
  -> target resolver validates logical recipient or exact reachable AgentRun
  -> target MixedTeamMemberHandle / task-agent handle
  -> target AgentRun.postUserMessage(server-built AgentInputUserMessage)
```

The public tool name `send_message_to` remains. The team communication capability remains. The native AutoByteus implementation/ownership does not.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Duplicated Policy Or Coordination; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Codex and Claude already use the server communication spine. AutoByteus still uses a native team event/context/tool bridge and the full native `agent-team` package. Server definition code imports a utility from native team package path. Round 5 current-state evidence also shows `recipient_name` is overloaded with dynamic task-agent aliases while the domain already has concrete `AgentRun` identities.
- Design response: Make server team communication authoritative for AutoByteus too; bind a server-owned AutoByteus `send_message_to` tool to `MemberTeamContext`; use an explicit exactly-one selector (`recipient_name` or `target_agent_run_id`); relocate definition utilities; delete native team code and tests.
- Refactor rationale: Adding another bridge or wrapper would preserve the boundary split. The correct modernization is a clean-cut server-owned communication path and native package deletion.
- Intentional deferrals and residual risk, if any: None for native `agent-team` package removal. Runtime-specific tool schema/approval mechanics remain runtime-specific by design, but parsing, target selector validation, recipient/exact-run resolution, and delivery become shared server responsibilities.

## Terminology

- `Team communication spine`: the server-owned path from a member's `send_message_to` call to target member input delivery and communication event projection.
- `Runtime adapter`: runtime-specific exposure/handler code that translates a provider/tool surface into the server communication spine. It must not own recipient resolution or team routing.
- `Server-owned AutoByteus tool`: a `BaseTool` subclass implemented in `autobyteus-server-ts`, using `autobyteus-ts` only as the runtime/tool interface package.
- `Native agent-team package`: `autobyteus-ts/src/agent-team/**`, including native team runtime, native team context, native events, native streaming, native `TeamManifestInjectorProcessor`, and native tests.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove native AutoByteus team package and native `send_message_to` routing rather than preserving compatibility wrappers.
- This design rejects dual-path behavior where AutoByteus can route through either native `TeamCommunicationContext` or server `MemberTeamContext`.
- This design also rejects keeping native `autobyteus-ts/agent-team` public exports as deprecated wrappers.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime member invokes `send_message_to` with exactly one selector | Target logical member or exact reachable `AgentRun` accepts server-built input | `TeamMemberDeliveryCoordinator` under `MixedTeamManager` with `MemberTeamContext`, target resolver, and `TaskAgentDirectory` for task-agent runs | Main cross-runtime, exact-run, and task-agent team communication path |
| DS-002 | Primary End-to-End | Mixed team member bootstrap | AutoByteus `AgentConfig` has server-composed prompt and server-owned tool instance | `AutoByteusAgentRunBackendFactory` | Ensures AutoByteus members join the same server-owned communication model |
| DS-003 | Return-Event | accepted delivery receipt | Team communication projection / websocket / history consumers | `TeamMemberDeliveryCoordinator` + `MixedTeamManager` + team communication services | Preserves visible committed Team Communication messages and reference files |
| DS-004 | Bounded Local | Repository import cleanup | No active native `agent-team` imports or exports | Implementation cleanup sequence | Ensures deletion is complete and not just hidden |

## Primary Execution Spine(s)

DS-001:

```text
Runtime tool call
  -> runtime adapter / server-owned AutoByteus BaseTool
  -> parseSendMessageToToolArguments + validateParsedSendMessageToToolArguments
  -> TeamMessageTargetSelector(kind=recipient_name OR kind=target_agent_run_id)
  -> delivery intent builder
  -> MemberTeamContext.deliverInterAgentMessage
  -> TeamRun.deliverInterAgentMessage
  -> MixedTeamManager.deliverInterAgentMessage
  -> TeamMemberDeliveryCoordinator resolves selector through static roster or exact reachable run resolver
  -> MixedAgentMemberHandle / MixedSubTeamMemberHandle / task-agent handle
  -> AgentRun.postUserMessage(AgentInputUserMessage)
  -> committed Team Communication + member-input projection
```

DS-002:

```text
MixedAgentMemberHandle.ensureReady
  -> AgentRunManager.createAgentRun(runtimeKind=AUTOBYTEUS)
  -> AutoByteusAgentRunBackendFactory.buildAgentConfig
  -> composeAutoByteusMemberSystemPrompt(MemberTeamContext)
  -> create/bind server-owned send_message_to tool when configured and enabled
  -> AgentFactory.createAgentWithId
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A member calls `send_message_to`; the runtime adapter only parses/translates the call into the shared server delivery intent; committed delivery resolves either a logical roster name or an exact reachable target run before publishing Team Communication. | Runtime adapter, `MemberTeamContext`, target selector / delivery intent builder, `TeamRun`, `MixedTeamManager`, `TeamMemberDeliveryCoordinator`, member/task-agent handle, `AgentRun` | `TeamMemberDeliveryCoordinator` under `MixedTeamManager` | Parser/validator, reference-file normalization, exact-run reachability, runtime-specific tool schema |
| DS-002 | A mixed AutoByteus member is started as a normal AgentRun; the AutoByteus backend factory composes the server team prompt and injects server-owned tools instead of native team context/routing. | `MixedAgentMemberHandle`, `AgentRunManager`, `AutoByteusAgentRunBackendFactory`, `AgentFactory` | `AutoByteusAgentRunBackendFactory` for AutoByteus config; `MixedTeamManager` for team lifecycle | Tool registration, configured tool exposure, primitive team customData for task delegation |
| DS-003 | Successful delivery publishes a canonical communication event after target input acceptance; existing projection/streaming services consume that committed event. | `TeamMemberDeliveryCoordinator`, `MixedTeamManager`, team communication projection services, websocket/run-history consumers | `TeamMemberDeliveryCoordinator` for commit ordering; `MixedTeamManager` for event emission; projection services for storage/view shaping | Reference file entries, message IDs, input dedupe IDs |
| DS-004 | Implementation deletes native package paths only after replacement imports/utilities are in place. | Utility relocation, source import cleanup, test cleanup | Implementation sequence | Build/type/test scans |

## Spine Actors / Main-Line Nodes

- `Runtime adapter / server-owned AutoByteus BaseTool`: translates provider/runtime tool invocation into server tool arguments.
- `parseSendMessageToToolArguments` / `validateParsedSendMessageToToolArguments`: shared input normalization and XOR target selector validation owner.
- `MemberTeamContext`: current member identity, communication roster, allowed recipient names, and delivery handler context.
- `TeamMessageTargetSelector` / delivery intent builder: canonical request construction owner before target resolution.
- `TeamMessageRecipientResolver`: canonical logical-name and exact-run target resolution owner inside the reachable team boundary.
- `TeamRun.deliverInterAgentMessage`: thin public team-run delivery entrypoint.
- `MixedTeamManager.deliverInterAgentMessage`: authoritative team delivery and communication event owner.
- `MixedAgentMemberHandle` / `MixedSubTeamMemberHandle`: target member runtime boundary owner.
- `AgentRun.postUserMessage`: member-run input delivery boundary.

## Ownership Map

| Node | Ownership |
| --- | --- |
| Runtime adapter / server-owned AutoByteus tool | Runtime-specific exposure only; must not own team roster, recipient resolution, or routing policy |
| Shared send-message parser/validator | Tool argument normalization, field aliases, reference-file validation, and exactly-one target selector validation; no recipient lookup |
| `MemberTeamContext` | Current member identity, roster, allowed recipient list, delivery handler availability |
| Delivery intent builder / delivery coordinator | Converts tool args and target selector into canonical delivery intent/request; coordinator resolves logical recipients and exact reachable runs before commit |
| `TeamRun` | Thin public run entrypoint for team commands |
| `MixedTeamManager` | Team communication command boundary, parent-boundary routing, event publication after delivery receipt |
| Member handle | Ensures target member/subteam is ready and posts normalized input into the target run |
| `AgentRun` | Runtime-specific member run lifecycle and input acceptance |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `send_message_to` tool name | Server team communication spine | Stable agent-facing tool contract with exactly one selector (`recipient_name` or `target_agent_run_id`) | Runtime-specific routing policy |
| `TeamRun.deliverInterAgentMessage` | `TeamRunBackend` / `MixedTeamManager` | Public team-run command boundary | Member registry internals |
| `AgentRun.postUserMessage` | Runtime backend | Member input command boundary | Team recipient resolution |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/send-message-to.ts` | Native tool duplicates server communication ownership | Server-owned AutoByteus `send_message_to` tool | In This Change | Remove export and registry registration |
| `SendMessageTo` registration in `autobyteus-ts/src/tools/register-tools.ts` | Tool is server-owned | Server tool registration in `autobyteus-server-ts` | In This Change | Keep tool name stable |
| `autobyteus-ts/src/agent-team/**` | Native team runtime is no longer active server architecture | `TeamRun` + `MixedTeamManager` + runtime `AgentRun`s | In This Change | Move only true utility first |
| `TeamManifestInjectorProcessor` | Server prompt composer renders team instruction/roster/protocol | `MemberRunInstructionComposer` / `composeAutoByteusMemberSystemPrompt` | In This Change | No `{{team}}` compatibility path |
| Native `TeamCommunicationContext` and `InterAgentMessageRequestEvent` imports | Native event bridge becomes unnecessary | Shared server parser + delivery request builder | In This Change | Delete bridge dependency |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` native-compatible bridge | It exists only for native tool compatibility | Server managed AutoByteus team context/bound tool factory | In This Change | Replace or rename with no native imports |
| Native agent-team tests under `autobyteus-ts/tests/**/agent-team/**` | Tests cover deleted package | Server-side communication and import-removal tests | In This Change | Do not preserve native tests as skipped legacy tests |
| Native agent-team root exports in `autobyteus-ts/src/index.ts` | Public native team API is removed | Server team run APIs | In This Change | No deprecated re-export |
| `autobyteus-ts/agent-team/utils/team-local-definition-id.js` imports | Utility belongs to server definition ownership | `autobyteus-server-ts/src/agent-team-definition/utils/team-local-definition-id.ts` | In This Change | Update server source/tests |

## Return Or Event Spine(s) (If Applicable)

DS-003:

```text
TeamMemberDeliveryCoordinator delivery receipt
  -> MixedTeamManager.buildCommunicationPayload
  -> publish TeamRunEventSourceType.COMMUNICATION
  -> team communication projection / websocket mapper / run history consumers
  -> UI Team Communication message with reference files
```

Recipient input trace:

```text
communicationPayload.messageId
  -> attachRecipientInputTrace
  -> buildInterAgentDeliveryInputMessage
  -> MixedAgentMemberHandle.publishMemberInput
  -> TeamRunEventSourceType.MEMBER_INPUT
```

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AutoByteusAgentRunBackendFactory`
  - `resolvedToolNames -> configured exposure -> create server-owned bound tool instances -> actualToolNames -> composeAutoByteusMemberSystemPrompt`
  - Why it matters: prompt instructions must only advertise `send_message_to` when the server-owned tool is actually exposed and delivery is configured.

- Parent owner: implementation cleanup sequence
  - `move utility -> add server tool -> refactor AutoByteus backend -> remove native imports -> delete native tree -> source/test scan`
  - Why it matters: deletion should not create a long-lived compatibility wrapper or leave hidden imports.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Send-message argument parser/validator | DS-001 | Runtime adapters | Normalize aliases, validate content/recipient/reference files/task-agent fields | Keeps runtime adapters thin and consistent | Runtime-specific validation drift |
| AutoByteus ParameterSchema builder | DS-001, DS-002 | Server-owned AutoByteus tool | Express shared `send_message_to` schema in AutoByteus tool format | AutoByteus uses `ParameterSchema`; Codex/Claude use JSON/Zod surfaces | Duplicated descriptions/fields |
| Runtime-specific schema builders | DS-001 | Runtime adapters | Codex JSON schema and Claude Zod schema exposure | Provider mechanics differ | Core routing leaking into provider schema code |
| Tool registration loader | DS-002 | Server-owned AutoByteus tool | Register server-owned tool definitions into shared runtime registry | AutoByteus prompt/tool schema uses registry definitions | Startup ordering bugs if hidden |
| Primitive AutoByteus team custom data | DS-002 | Task delegation tools | Provide current member/team IDs for server-owned AutoByteus tools that need context from `customData` | Task delegation already uses this pattern | Recreating native `TeamCommunicationContext` |
| Team communication projection | DS-003 | `MixedTeamManager` | Store/project communication event payloads and references | UI/history visibility | Business routing mixed into projection layer |
| Team-local definition ID utility | DS-004 | Agent/team definition providers | Build/parse scoped local definition IDs | Definition ownership, not runtime ownership | Server imports from deleted native package |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical team delivery | `agent-team-execution/backends/mixed` | Reuse | Already owns universal team delivery | N/A |
| Recipient roster/context | `agent-team-execution/domain` + `services/member-team-context-builder.ts` | Reuse | Already builds `MemberTeamContext` for every runtime member | N/A |
| Send-message parsing and request building | `agent-team-execution/services` | Extend | Parser/request builder already used by Codex/Claude | N/A |
| AutoByteus server-owned tools | `agent-tools/task-delegation` pattern | Extend / create sibling `agent-tools/team-communication` | Server already hosts `BaseTool` subclasses for AutoByteus tools | Needs separate concern from task delegation |
| AutoByteus backend config | `agent-execution/backends/autobyteus` | Extend | Existing owner of AutoByteus `AgentConfig` and tools | N/A |
| Definition scoped IDs | `agent-team-definition/utils` | Create/move | Utility belongs to server definition subsystem | Native runtime package is wrong owner |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution` | Team communication domain, delivery request construction, mixed team delivery | DS-001, DS-003 | `MixedTeamManager` | Reuse/Extend | Add shared tool contract constants if useful |
| `agent-tools/team-communication` | Server-owned AutoByteus `send_message_to` tool and registration | DS-001, DS-002 | Runtime adapter | Create | Mirrors task-delegation server-owned tools |
| `agent-execution/backends/autobyteus` | AutoByteus config, prompt, bound server-owned tool injection, primitive team context | DS-002 | `AutoByteusAgentRunBackendFactory` | Extend | Must not import native `agent-team` |
| `agent-execution/backends/codex` | Codex dynamic tool exposure | DS-001 | Codex runtime backend | Reuse | Use shared contract constants/descriptions |
| `agent-execution/backends/claude` | Claude tool definition/handler | DS-001 | Claude runtime backend | Reuse | Use shared contract constants/descriptions |
| `agent-team-definition` | Scoped definition ID utilities | DS-004 | Definition providers | Extend | Move utility here |
| `autobyteus-ts` runtime package | Agent runtime, tools interface, generic agent input pipeline | DS-002 | Runtime package | Simplify | Remove native team package and native send-message routing |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-contract.ts` | `agent-team-execution` | Shared send-message tool contract | Tool name, common descriptions, field labels | Prevent duplicate constants/descriptions across runtimes | Yes |
| `autobyteus-server-ts/src/agent-tools/team-communication/send-message-to.ts` | `agent-tools/team-communication` | AutoByteus server-owned tool | `BaseTool` implementation bound to `MemberTeamContext` | AutoByteus-specific tool interface only | Yes |
| `autobyteus-server-ts/src/agent-tools/team-communication/send-message-to-parameter-schema.ts` | `agent-tools/team-communication` | AutoByteus schema adapter | Build `ParameterSchema` for AutoByteus tool | Keeps schema format separate from execution | Yes |
| `autobyteus-server-ts/src/agent-tools/team-communication/register-team-communication-tools.ts` | `agent-tools/team-communication` | Tool registration | Register/unregister server-owned team communication tools | Mirrors task-delegation loader pattern | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/team-communication/autobyteus-send-message-tool-factory.ts` | AutoByteus backend | Bound tool factory | Create a per-member `send_message_to` tool bound to `MemberTeamContext` | Avoids function/full context in `customData` | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.ts` | AutoByteus backend | Primitive context builder | Build primitive team context for task-delegation/customData only | Replaces native-compatible bridge | Yes |
| `autobyteus-server-ts/src/agent-team-definition/utils/team-local-definition-id.ts` | `agent-team-definition` | Definition ID utility | Build/parse team-local agent/team IDs | Definition ownership | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `send_message_to` tool name and descriptions | `agent-team-execution/services/send-message-to-tool-contract.ts` | Team execution | Used by Codex, Claude, AutoByteus | Yes | Yes | Kitchen-sink provider config |
| Send-message arg parsing/validation | Existing `send-message-to-tool-argument-parser.ts` | Team execution | Already shared by Codex/Claude; add AutoByteus | Yes | Yes | Runtime adapter |
| Delivery request building | Existing `inter-agent-message-delivery-request-builder.ts` | Team execution | Canonical recipient resolution | Yes | Yes | Native event bridge |
| Team-local definition ID parser | `agent-team-definition/utils/team-local-definition-id.ts` | Team definition | Server definition providers/tests use it | Yes | Yes | Runtime team utility |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SendMessageToToolArguments` | Yes | Yes | Low | Reuse as-is; keep aliases parser-local |
| `InterAgentMessageDeliveryRequest` | Yes | Yes | Low | Reuse as canonical delivery shape |
| AutoByteus managed team customData | Yes if primitive-only | Yes | Medium | Do not include native `communicationContext`; do not include full `MemberTeamContext` unless bound tool factory cannot work |
| Team-local definition ID | Yes | Yes | Low | Move without changing semantics |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-contract.ts` | Team execution | Shared tool contract | `SEND_MESSAGE_TO_TOOL_NAME`, common description, common field descriptions | One source for runtime adapters | N/A |
| `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | Team execution | Parser/validator | Keep existing parser/validator; import shared constant if needed | Already correct owner | Yes |
| `autobyteus-server-ts/src/agent-tools/team-communication/send-message-to.ts` | Server AutoByteus tools | AutoByteus tool adapter | Executes shared parser/builder against bound `MemberTeamContext` | Runtime adapter, not routing owner | Yes |
| `autobyteus-server-ts/src/agent-tools/team-communication/send-message-to-parameter-schema.ts` | Server AutoByteus tools | Schema adapter | Converts shared contract fields to `ParameterSchema` | Avoids schema duplication inside execution file | Yes |
| `autobyteus-server-ts/src/agent-tools/team-communication/register-team-communication-tools.ts` | Server AutoByteus tools | Registry loader | Registers server-owned team communication tool definitions | Startup boundary | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/team-communication/autobyteus-send-message-tool-factory.ts` | AutoByteus backend | Bound tool factory | Ensures registry definition exists and creates per-member bound tool | Keeps binding near AutoByteus config owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.ts` | AutoByteus backend | Custom data adapter | Primitive team context for task delegation/tool context | No native team dependencies | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | AutoByteus backend | Config owner | Uses managed context builder and bound send-message tool factory | Existing config owner | Yes |
| `autobyteus-server-ts/src/agent-team-definition/utils/team-local-definition-id.ts` | Team definition | Definition utility | Moved utility semantics | Correct ownership | N/A |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Runtime package | Input pipeline | Remove native context lookup; use sender id / metadata fallback only for generic `InterAgentMessageReceivedEvent` | Runtime remains team-agnostic | N/A |
| `autobyteus-ts/src/tools/register-tools.ts` | Runtime package | Native tool bootstrap | Remove native `SendMessageTo` import/registration | Runtime no longer owns team communication | N/A |
| `autobyteus-ts/src/index.ts` | Runtime package | Public surface | Remove `agent-team` exports | Native team API removed | N/A |

## Ownership Boundaries

- `MixedTeamManager` is the authoritative owner of team-level communication routing and event emission.
- `MemberTeamContext` is the authoritative member-context/roster source for tool recipient resolution.
- Runtime adapters are not allowed to inspect native team internals or create their own roster semantics.
- `AutoByteusAgentRunBackendFactory` owns AutoByteus runtime configuration, including which tools are actually instantiated and whether prompt instructions should say `send_message_to` is available.
- `autobyteus-ts` owns generic agent runtime mechanics only; it must not own team run orchestration or team communication routing.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MixedTeamManager.deliverInterAgentMessage` | member registry, parent boundary routing, communication payload, recipient input trace | Runtime adapters via `MemberTeamContext.deliverInterAgentMessage` | Runtime adapter directly starts target member or posts to target `AgentRun` by guessed ID | Add/adjust delivery request shape |
| `MemberTeamContext` | current member identity, allowed recipients, delivery handler availability | Tool adapters, prompt composers | Native manifest/TeamCommunicationContext roster lookup | Extend context builder/roster builder |
| `AutoByteusAgentRunBackendFactory` | AutoByteus tools, prompt, customData | Mixed member handle / AgentRunManager | Mixed manager manually mutating AutoByteus `AgentConfig` internals | Add explicit backend factory hook/factory file |
| `agent-team-definition` utilities | scoped local definition IDs | Definition providers/tests | Server imports from `autobyteus-ts/agent-team` | Move utility to server definition subsystem |

## Dependency Rules

Allowed:

- `autobyteus-server-ts` may import `BaseTool`, `ParameterSchema`, and other generic runtime interfaces from `autobyteus-ts`.
- Runtime-specific server adapters may import shared server send-message parser, target-selector helpers, and delivery intent builder.
- AutoByteus backend may create server-owned `BaseTool` instances for AutoByteus agents.
- Team execution services may depend on `MemberTeamContext`, `TeamMessageTargetSelector`, `InterAgentMessageDeliveryRequest` / delivery intent, and `MixedTeamManager` contracts.

Forbidden:

- No source import from `autobyteus-ts/agent-team/**` after this change.
- No native `TeamCommunicationContext` or `InterAgentMessageRequestEvent` in server AutoByteus backend.
- No native `SendMessageTo` registration in `autobyteus-ts`.
- No `TeamManifestInjectorProcessor` in AutoByteus server team prompt construction.
- No compatibility re-export from `autobyteus-ts/src/agent-team/**`.
- No runtime adapter may bypass `MixedTeamManager` and post directly to another team member based on local roster guesses.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `send_message_to({ recipient_name? OR target_agent_run_id?, content, ... })` | Team communication tool contract | Agent-facing team message request | Exactly one target selector: roster `recipient_name` or exact reachable `target_agent_run_id` | Tool name stable across runtimes |
| `parseSendMessageToToolArguments(args)` | Tool arguments | Normalize runtime/provider argument aliases and target-selector fields | raw object | Shared across runtimes |
| delivery intent builder / `TeamMessageTargetSelector` helpers | Delivery request construction | Build canonical unresolved delivery intent | `MemberTeamContext + (recipient_name OR target_agent_run_id)` | Resolver, not builder, owns target lookup |
| `MemberTeamContext.deliverInterAgentMessage(intent/request)` | Current team run communication | Call active `TeamRun` delivery boundary | Delivery intent/request carrying `TeamMessageTargetSelector` | Handler may be null if not configured |
| `TeamRun.deliverInterAgentMessage(intent/request)` | Team run | Public team delivery command | Delivery intent/request carrying `TeamMessageTargetSelector` | Thin entrypoint |
| `AutoByteusSendMessageToolFactory.create(memberTeamContext)` | AutoByteus tool binding | Produce bound tool instance | `MemberTeamContext` | Server-owned adapter only |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `send_message_to` | Yes | Yes | Low | Exactly one of `recipient_name` or `target_agent_run_id`; no precedence behavior |
| delivery intent builder + `TeamMessageRecipientResolver` | Yes | Yes | Low | Builder carries selector; resolver performs roster/exact-run lookup inside team boundary |
| `TeamRun.deliverInterAgentMessage` | Yes | Yes | Low | Keep target selector explicit and unresolved until delivery coordinator resolution |
| Team-local definition ID utility | Yes | Yes | Low | Move to server definition utility path |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Universal team backend | `MixedTeamManager` | Yes per product decision | Low | Keep name |
| AutoByteus server tool | `ServerOwnedSendMessageToTool` or `AutoByteusSendMessageToTool` | Yes | Low | Prefer name that makes server ownership explicit |
| Managed team custom data | `AutoByteusManagedTeamContext` | Yes | Medium | Avoid `StandaloneTeamContext` if it implies native standalone team ownership |
| Native team package | `agent-team` | No longer correct | High | Delete |

## Applied Patterns (If Any)

- Adapter: runtime-specific Codex/Claude/AutoByteus tool surfaces adapt into the shared server communication spine.
- Factory: AutoByteus backend creates a bound server-owned tool instance for the current `MemberTeamContext`.
- Registry: shared `defaultToolRegistry` still provides AutoByteus tool definitions/schema, but routing authority is not in the registry.
- Facade: `TeamRun.deliverInterAgentMessage` remains a thin public entrypoint to backend-owned delivery.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/team-communication/` | Folder | Server-owned AutoByteus team tools | AutoByteus `BaseTool` implementation and registration for team communication | Parallel to task-delegation tools; server owns team communication | Mixed manager internals beyond request builder calls |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/team-communication/` | Folder | AutoByteus runtime backend adapter | Per-agent tool binding and AutoByteus-specific communication adapter mechanics | Runtime backend concern | Shared routing policy |
| `autobyteus-server-ts/src/agent-team-execution/services/` | Folder | Team execution services | Shared send-message parser/contract/target selector and delivery intent builder | Existing owner for team delivery support | Provider-specific schema code |
| `autobyteus-server-ts/src/agent-team-definition/utils/team-local-definition-id.ts` | File | Team definition utility | Scoped definition IDs | Correct definition owner | Runtime/team execution behavior |
| `autobyteus-ts/src/agent-team/` | Folder | Obsolete native team package | Delete | Replaced by server team run architecture | Anything retained |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/backends/mixed` | Main-Line Domain-Control | Yes | Low | Universal team backend owner |
| `agent-team-execution/services` | Off-Spine Concern | Yes | Low | Shared parser/request-builder services serve team execution |
| `agent-tools/team-communication` | Off-Spine Concern | Yes | Low | Runtime tool adapters, not routing owners |
| `agent-execution/backends/autobyteus/team-communication` | Runtime Adapter | Yes | Low | AutoByteus-specific binding only |
| `autobyteus-ts/src/agent-team` | Mixed obsolete | No | High | Delete |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| AutoByteus tool execution | `ServerOwnedSendMessageToTool -> shared parser -> delivery request builder -> memberTeamContext.deliverInterAgentMessage` | `autobyteus-ts SendMessageTo -> native TeamCommunicationContext -> InterAgentMessageRequestEvent -> server bridge` | Shows ownership moves to server while tool name remains |
| Tool binding | `AutoByteusAgentRunBackendFactory creates a bound tool with MemberTeamContext` | Put a native communication context/dispatcher in `customData.teamContext` | Keeps `customData` primitive for task delegation and avoids native bridge recreation |
| Deletion | Move `team-local-definition-id` first, then delete `agent-team/**` | Keep `autobyteus-ts/agent-team/utils` as a compatibility path | Prevents public native package leftovers |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `autobyteus-ts/agent-team` exports as deprecated wrappers | Could reduce import churn | Rejected | Update imports and delete native package |
| Keep native `SendMessageTo` but have it call server parser | Smaller code diff | Rejected | Implement server-owned AutoByteus tool and remove native tool |
| Keep native `TeamCommunicationContext` only for AutoByteus | Existing bridge works | Rejected | Bound server-owned tool uses `MemberTeamContext` directly |
| Keep `TeamManifestInjectorProcessor` for standalone/native teams | Existing tests cover it | Rejected | Server `MemberRunInstructionComposer` is authoritative for team prompts; native team package deleted |
| Keep `team-local-definition-id` under `autobyteus-ts/agent-team/utils` | Avoid moving imports | Rejected | Move to `agent-team-definition/utils` |

## Derived Layering (If Useful)

```text
Agent-facing runtime tool surface
  -> server runtime adapter / AutoByteus server-owned BaseTool
    -> server team communication services
      -> TeamRun / MixedTeamManager
        -> member AgentRun backend
```

This layering is explanatory only. The authoritative boundary is `MixedTeamManager` for team delivery and `MemberTeamContext` for member/recipient context.

## Migration / Refactor Sequence

1. Move `team-local-definition-id` from `autobyteus-ts/src/agent-team/utils/` to `autobyteus-server-ts/src/agent-team-definition/utils/`; update server source/tests and remove the public-surface test dependency.
2. Add shared `send-message-to-tool-contract.ts` for name/descriptions; update Codex/Claude/shared exposure constants to import it.
3. Add server-owned AutoByteus `send_message_to` tool under `agent-tools/team-communication`, using existing shared parser/validator and delivery request builder.
4. Add server team-communication tool registration to `startup/agent-tool-loader.ts`; also make AutoByteus bound tool factory ensure the registry definition exists before prompt/tool schema generation.
5. Refactor `AutoByteusAgentRunBackendFactory`:
   - build primitive managed team customData without native `communicationContext`;
   - create a bound server-owned `send_message_to` tool when the agent definition configures the tool and `MemberTeamContext.sendMessageToEnabled` is true;
   - keep `actualToolNames` aligned with actual instantiated tools so prompt instructions remain accurate.
6. Remove native `SendMessageTo` from `autobyteus-ts` exports and native registry registration.
7. Remove native team context lookup from `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`; for generic `InterAgentMessageReceivedEvent`, fall back to sender ID/metadata only. Server team delivery already posts a preformatted `AgentInputUserMessage`.
8. Delete `autobyteus-ts/src/agent-team/**` and native agent-team tests.
9. Update docs and public-surface/import tests to assert no native agent-team public surface remains.
10. Run targeted validations: AutoByteus backend factory/unit tests, send-message parser tests, mixed manager tests, definition provider tests, and at least one AutoByteus team communication execution path if available.

## Key Tradeoffs

- A bound server-owned AutoByteus tool is slightly more custom than registry-only creation, but it avoids storing server `MemberTeamContext` or dispatch closures in `customData` and keeps routing authority server-side.
- Moving `team-local-definition-id` creates import churn, but leaving it in `autobyteus-ts/agent-team` would prevent clean package deletion.
- Removing native agent-team tests is a large deletion, but keeping skipped legacy tests would contradict the cleanup goal.

## Risks

- Startup ordering risk: AutoByteus prompt/tool schema generation may occur before server-owned `send_message_to` is registered. Mitigation: backend bound tool factory should ensure registration, not rely only on startup loader.
- Import churn risk: many tests import the moved definition ID utility. Mitigation: update all source/tests and add a no-import scan.
- Behavior regression risk: AutoByteus team communication must still publish Team Communication projection events. Mitigation: test server-owned AutoByteus tool through `MixedTeamManager.deliverInterAgentMessage`.
- Generic `postInterAgentMessage` behavior risk: removing native display-name lookup may alter non-server direct `InterAgentMessageReceivedEvent` formatting. Mitigation: keep sender ID fallback; server team delivery path is unaffected because it uses `AgentInputUserMessage`.

## Guidance For Implementation

- Treat removal as first-class: delete native files instead of leaving compatibility shells.
- Keep runtime adapters thin. If the AutoByteus tool starts resolving recipients itself, the implementation is drifting.
- Do not add `{{team}}` or `TeamManifestInjectorProcessor` compatibility.
- Keep `send_message_to` prompt instructions tied to actual tool exposure: configured + registered + `MemberTeamContext.sendMessageToEnabled`.
- Add a final source scan such as `rg -n "autobyteus-ts/agent-team|src/agent-team|TeamManifestInjectorProcessor|TeamCommunicationContext|InterAgentMessageRequestEvent" autobyteus-ts/src autobyteus-server-ts/src autobyteus-ts/tests autobyteus-server-ts/tests` and document expected remaining matches, ideally none outside deleted history/artifacts.

# Historical Round 4 Task-Agent Addendum — Superseded Where It Used Dynamic Aliases (2026-06-08)

The Round 4 simplification remains valid only for these decisions:

- task-agent progress, blocker, completion, and revision/follow-up communication use ordinary `send_message_to`;
- task-specific tools are reduced to `delegate_tasks` and `accept_task`;
- task lifecycle is simplified to `not_started -> active -> accepted`;
- Team Communication projection is committed only after target input acceptance;
- provider same-runtime cohort coordination for Codex/Claude remains in scope.

Round 5 supersedes the Round 4 model-facing dynamic alias proposal. Do **not** implement `recipient_name="worker/task_0001"` as the primary task-agent selector. Use the Round 5 exact-run selector instead:

```ts
send_message_to({
  target_agent_run_id: "<active reachable task-agent run id>",
  content: "...",
});
```

The detailed Round 4 artifact remains historical rationale at:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round4-simplified-task-agent-communication-design.md`

The authoritative current task-agent communication design is Round 5 below plus:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round5-send-message-addressing-design.md`

# Round 5 Send-Message Addressing Addendum (2026-06-08)

## Supersession

This addendum supersedes the model-facing dynamic task-agent alias direction from the Round 4 simplified task-agent addendum. The simplified task lifecycle remains:

```text
delegate_tasks -> task-agent communicates via send_message_to -> original delegator accept_task
```

But task-agent follow-up should now use general exact-run addressing:

```json
{
  "target_agent_run_id": "team_x__worker__task_0001",
  "content": "Please revise this task result."
}
```

not dynamic recipient aliases like:

```json
{
  "recipient_name": "worker/task_0001",
  "content": "Please revise this task result."
}
```

Detailed authoritative addendum:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round5-send-message-addressing-design.md`

## Design Decision

`send_message_to` supports exactly one target selector:

```ts
type TeamMessageTargetSelector =
  | { kind: "recipient_name"; recipientName: string }
  | { kind: "target_agent_run_id"; targetAgentRunId: string };
```

Tool input shape:

```ts
type SendMessageToToolArguments = {
  recipientName: string | null;
  targetAgentRunId: string | null;
  content: string | null;
  messageType: string;
  referenceFiles: string[];
};
```

Validation rule:

```text
Exactly one of recipient_name or target_agent_run_id must be provided.
```

## Round 5 Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| R5-DS-001 | Primary End-to-End | `send_message_to(recipient_name)` | logical member/subteam receives input and committed projection | `TeamMemberDeliveryCoordinator` | Normal roster-name messaging remains simple. |
| R5-DS-002 | Primary End-to-End | `send_message_to(target_agent_run_id)` | exact reachable AgentRun receives input and committed projection | `TeamMemberDeliveryCoordinator` + `TeamMessageRecipientResolver` | Exact run messaging is general and not task-specific. |
| R5-DS-003 | Primary End-to-End | invalid/missing/both selectors | rejected tool result and no committed projection | parser/validator + delivery coordinator | Avoids ambiguous precedence and false-success UI. |
| R5-DS-004 | Primary End-to-End | `delegate_tasks` starts task-agent | delegator receives active task-agent `target_agent_run_id` | `TaskDelegationService` + `TaskAgentDirectory` | Parent can message concrete task-agent runs. |
| R5-DS-005 | Primary End-to-End | task-agent sends report | delegator receives committed input by name or exact run id | `TeamMemberDeliveryCoordinator` | Reports remain ordinary team messages. |
| R5-DS-006 | Primary End-to-End | parent sends feedback to task-agent exact run | same concrete task-agent receives feedback | `TeamMemberDeliveryCoordinator` + `TaskAgentDirectory` | Revisions need no task-specific routing fields. |
| R5-DS-007 | Return/Event | accepted delivery receipt | websocket/history projection with selector metadata | `MixedTeamManager` + projection services | UI/history can explain the delivery target. |
| R5-DS-008 | Bounded Local | roster/prompt construction | model sees clear address-book instructions | `MemberRunInstructionComposer` + roster builder | Prevents model confusion around name vs run-id mode. |
| R5-DS-009 | Primary End-to-End | same-runtime exact-run delivery | correct Codex/Claude session/thread receives input | provider cohort coordinator + delivery coordinator | Exact run addressing composes with same-runtime cohorts. |

## Main Spines

### R5-DS-001 — logical name mode

```text
send_message_to(recipient_name="worker")
  -> runtime adapter
  -> shared parser/validator
  -> target selector kind=recipient_name
  -> TeamRun delivery boundary
  -> TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver.resolveByRecipientName(MemberTeamContext roster)
  -> member/subteam handle
  -> AgentRun.postUserMessage
  -> committed COMMUNICATION + MEMBER_INPUT events
```

### R5-DS-002 — exact run mode

```text
send_message_to(target_agent_run_id="team_x__worker__task_0001")
  -> runtime adapter
  -> shared parser/validator
  -> target selector kind=target_agent_run_id
  -> TeamRun delivery boundary
  -> TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver.resolveByTargetAgentRunId(team communication boundary)
  -> normal member handle or task-agent handle
  -> exact AgentRun.postUserMessage
  -> committed COMMUNICATION + MEMBER_INPUT events
```

Exact-run resolution must validate that the run is active/recoverable and reachable from the sender's team communication boundary. It must not become global arbitrary AgentRun messaging.

### R5-DS-004 / R5-DS-006 — task-agent exact-run communication

```text
delegate_tasks
  -> TaskAgentDirectory records active taskAgentRunId
  -> work packet / activation event exposes target_agent_run_id
  -> parent send_message_to(target_agent_run_id=<task-agent run>)
  -> exact same task-agent run receives feedback
  -> parent accept_task(task_id) when satisfied
  -> task-agent settles and future sends to that run reject
```

## Roster / Address Book Update

The roster remains, but it should be phrased as one addressing mode, not the entire tool target model.

Target prompt wording:

```text
When using send_message_to, choose exactly one target selector:
1. recipient_name: use one exact name from the roster when you want the logical teammate and no exact run id is needed.
2. target_agent_run_id: use an exact run id when a task packet, task event, or prior message gives one and you need that concrete agent run.
Do not provide both.
```

The roster should list:

```text
Recipient names you can use with recipient_name:
- coordinator
- worker
- reviewer
```

Task packets/events/messages provide exact run ids when needed:

```text
Task ID: task_0001
Task-agent target_agent_run_id: team_x__worker__task_0001
Delegator reply recipient_name: coordinator
```

If the delegator is itself a task-agent, the child task packet should provide:

```text
Delegator reply target_agent_run_id: team_x__coordinator__task_0000
```

## File Responsibility Changes

| Path | Round 5 target change |
| --- | --- |
| `send-message-to-tool-contract.ts` | Describe exactly-one `recipient_name` OR `target_agent_run_id`; remove dynamic alias language. |
| `send-message-to-parameter-schema.ts`, Codex/Claude schemas | Add optional `target_agent_run_id`; make `recipient_name` optional; document XOR rule. |
| `send-message-to-tool-argument-parser.ts` | Parse `target_agent_run_id`; validate exactly one selector. |
| `inter-agent-message-delivery-request-builder.ts` | Build a delivery intent/target selector; stop fabricating dynamic participants for unknown recipient names. |
| `inter-agent-message-delivery.ts` | Add/adjust request shape to carry `TeamMessageTargetSelector` before resolution. |
| `team-member-delivery-coordinator.ts` | Resolve by target selector through a dedicated recipient resolver; commit only after accepted input. |
| `team-message-recipient-resolver.ts` | New resolver for roster names and exact reachable run ids. |
| `task-agent-directory.ts` | Resolve active task-agent by `target_agent_run_id`; remove model-facing `taskAgentRecipientName` requirement. |
| `task-agent-recipient-name.ts` | Remove or demote to display-only; it is not the model-facing routing contract. |
| `task-delegation-activation-coordinator.ts` / work packet renderer | Expose task-agent `target_agent_run_id` and delegator reply selector. |
| `member-team-roster-manifest.ts` | Render the two-mode address-book instruction. |
| `member-run-instruction-composer.ts` | Teach exact-one target selector and simplified task protocol. |

## Dependency Rules

Allowed:

- Runtime adapters -> shared parser/validator -> delivery intent builder.
- `TeamMemberDeliveryCoordinator` -> `TeamMessageRecipientResolver` -> roster / task-agent directory / member registry reachability.
- `TaskDelegationService` -> `TaskAgentDirectory` to expose active task-agent `target_agent_run_id`.

Forbidden:

- Runtime adapters directly using `AgentRunManager.getActiveRun(target_agent_run_id)` without team-boundary validation.
- Global arbitrary run messaging outside the current/reachable team boundary.
- `recipient_name` carrying slash-encoded task ids as the main task-agent selector.
- Accepting both selectors with precedence behavior.
- Publishing Team Communication before target input acceptance.

## Validation Additions

- Parser/schema tests accept name-only and run-id-only, reject neither/both.
- Roster/prompt tests no longer say `recipient_name` is mandatory for every message.
- Delivery resolver tests cover logical names, normal member exact run ids, active task-agent exact run ids, settled task-agent run ids, and external run ids.
- Task delegation tests prove activation exposes `target_agent_run_id`, parent feedback uses exact-run addressing, and dynamic alias routing is not required.
- Full live matrix includes mixed task-agent send-message/acceptance with `target_agent_run_id`.

# Round 8 Delivery-Intent Boundary Addendum (2026-06-08)

## Supersession / Clarification

This addendum enforces the Round 5 `send_message_to` target-selector design after code review CR-006 found a remaining boundary violation. It supersedes any design wording that allows runtime adapters or shared request builders to pre-resolve `recipient_name` into a recipient endpoint before the mixed delivery boundary.

Authoritative detailed addendum:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round8-delivery-intent-boundary-design.md`

## Design Decision

The object passed from runtime adapters into `MemberTeamContext.deliverInterAgentMessage` / `TeamRun.deliverInterAgentMessage` is an unresolved delivery intent:

```ts
type InterAgentMessageDeliveryIntent = {
  teamRunId: string;
  sender: InterAgentMessageDeliveryEndpoint;
  target: TeamMessageTargetSelector;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
};
```

It must **not** include `recipient`.

The recipient endpoint exists only after mixed delivery resolves the target:

```ts
type ResolvedInterAgentMessageDeliveryRequest = InterAgentMessageDeliveryIntent & {
  recipient: InterAgentMessageDeliveryEndpoint;
  resolvedTargetKind: "logical_member" | "agent_run" | "task_agent_run";
  targetAgentRunId: string;
  taskId?: string | null;
};
```

## Corrected Data-Flow Spine

```text
runtime send_message_to call
  -> shared parser reads canonical target selector only
  -> delivery intent builder builds sender + target + content only
  -> TeamRun.deliverInterAgentMessage(intent)
  -> MixedTeamManager
  -> TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver resolves target selector inside mixed boundary
  -> resolved local/task-agent target or parent-boundary forward
  -> target AgentRun accepts input
  -> committed Team Communication/member-input projection
```

## Round 8 Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| R8-DS-001 | Primary End-to-End | runtime tool call | unresolved intent enters `TeamRun.deliverInterAgentMessage` | runtime adapter + intent builder | Prevents pre-delivery recipient lookup. |
| R8-DS-002 | Primary End-to-End | `recipient_name` intent | logical recipient resolved/rejected | `TeamMessageRecipientResolver` | Roster-name resolution has one owner. |
| R8-DS-003 | Primary End-to-End | `target_agent_run_id` intent | exact local member/task-agent run resolved/rejected | `TeamMessageRecipientResolver` + `TaskAgentDirectory` | Exact-run resolution stays team-boundary-safe. |
| R8-DS-004 | Primary End-to-End | parent-boundary target | parent receives unresolved normalized intent | child + parent delivery boundaries | Nested teams resolve targets in the correct boundary. |
| R8-DS-005 | Primary End-to-End | hidden target alias | validation failure | parser/validator | Removes compatibility/precedence behavior. |
| R8-DS-006 | Return/Event | target accepts input | committed projection | `TeamMemberDeliveryCoordinator` | Preserves truthful Team Communication. |

## Boundary Rules Added By CR-006

Allowed:

- Runtime adapters -> parser/validator -> `buildInterAgentMessageDeliveryIntent` -> delivery handler.
- Intent builder builds sender endpoint from `MemberTeamContext` because the sender is the current member identity.
- `TeamMessageRecipientResolver` may build/consult the sender-specific roster inside mixed delivery.
- Parent-boundary forwarding normalizes sender and preserves unresolved target selector.

Forbidden:

- Runtime adapters or intent builders reading `memberTeamContext.communicationRecipients` to resolve target.
- Intent builder importing `MemberTeamRecipientDescriptor`.
- Intent builder constructing `recipient` endpoint or placeholder exact-run participant.
- `TeamMessageRecipientResolver.resolveByRecipientName` using `request.recipient.selector`; it must resolve from `intent.target`.
- Parser accepting hidden target selector aliases `recipient`, `recipientName`, or `targetAgentRunId`.

## File Responsibility Updates

| Path | Round 8 target change |
| --- | --- |
| `inter-agent-message-delivery-request-builder.ts` | Replace/rename to intent builder; build sender + target only; no recipient resolution. |
| `inter-agent-message-delivery.ts` | Split unresolved `InterAgentMessageDeliveryIntent` from internal `ResolvedInterAgentMessageDeliveryRequest`; handler accepts intent. |
| `team-message-recipient-resolver.ts` | Resolve directly from `TeamMessageTargetSelector`; own sender roster lookup and exact-run lookup. |
| `team-member-delivery-coordinator.ts` | Convert resolver output into resolved request; commit projection only after target input acceptance. |
| `mixed-parent-boundary-delivery-request.ts` | Normalize unresolved parent-boundary intent sender only; do not normalize recipient endpoint. |
| AutoByteus/Codex/Claude send-message adapters | Submit intent only; no recipient endpoint construction. |
| `send-message-to-tool-argument-parser.ts` | Remove hidden target selector aliases; canonical selector fields only. |

## Validation Additions

- Intent builder tests prove no `recipient` output and no `communicationRecipients` lookup.
- Resolver tests prove strict name lookup lives in `TeamMessageRecipientResolver` and parent-boundary forwarding preserves unresolved target.
- Exact-run tests prove local task-agent/member, parent-boundary, settled, and external target behavior.
- Parser tests prove hidden target aliases fail.
- Source scans prove runtime adapters do not construct recipient endpoints.

# Round 14 Task Tool Configuration Boundary Addendum (2026-06-08)

## Supersession / Clarification

This addendum supersedes the Round 13 proposal to introduce runtime turn-input-context and provider `tool_choice` dampening for `accept_task`. The user clarified that this ticket should keep architecture/invariants correct and should not compensate in low-level implementation for prompt/model/test configuration behavior.

Authoritative detailed correction:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round14-task-tool-configuration-boundary-design.md`

## Design Decision

`delegate_tasks`, `accept_task`, and `send_message_to` are normal configured tools. Runtime adapters expose them when configured. `autoExecuteTools=true` is acceptable for E2E because it only means the framework executes a model-selected tool. Provider `tool_choice` is not part of this ticket's architecture.

Do not add framework code that treats `accept_task` specially at LLM request time. The architecture is correct when these task invariants hold:

```text
delegate_tasks
  -> returns task_id + target_agent_run_id
  -> task-agent reports via send_message_to
  -> parent revises via send_message_to(target_agent_run_id)
  -> original delegator accepts with accept_task(task_id)
  -> task-agent run settles and later exact-run sends reject
```

## Round 14 Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| R14-DS-001 | Configured task tool exposure | agent/member configured tools | runtime exposes configured task tools | runtime adapter/tool resolver | Tool availability is explicit configuration. |
| R14-DS-002 | Delegation | `delegate_tasks` | active task-agent `target_agent_run_id` | `TaskDelegationService` + activation coordinator | Creates the concrete work subject. |
| R14-DS-003 | Task report | task-agent `send_message_to` | delegator receives committed input | `TeamMemberDeliveryCoordinator` | Reports are communication, not lifecycle transitions. |
| R14-DS-004 | Revision feedback | `send_message_to(target_agent_run_id)` | same active task-agent receives input | `TeamMessageRecipientResolver` + `TaskAgentDirectory` | Active task-agent remains reachable until accepted. |
| R14-DS-005 | Acceptance | original delegator `accept_task(task_id)` | ledger accepted and run id tombstoned | `TaskDelegationService` | Terminal mutation remains centralized. |
| R14-DS-006 | Nested task acceptance | task-agent delegator accepts child task | child task accepted/settled | `TaskDelegationService` identity validation | Preserves nested delegation. |
| R14-DS-007 | Settled run rejection | post-accept exact-run send | rejected before projection | `TeamMessageRecipientResolver` | Keeps exact-run safety truthful. |

## Corrected Data-Flow Spine

```text
configured agent tool call delegate_tasks
  -> TaskDelegationService creates task_id
  -> TaskDelegationActivationCoordinator starts task-agent
  -> TaskAgentDirectory records active target_agent_run_id
  -> task-agent reports with send_message_to
  -> delegator can revise with send_message_to(target_agent_run_id)
  -> original delegator accepts with accept_task(task_id)
  -> TaskDelegationService tombstones target_agent_run_id and requests settlement
```

## Boundary Rules Added By Round 14

Allowed:

- E2E configures `delegate_tasks`, `send_message_to`, and `accept_task` on agents that need them.
- E2E uses `autoExecuteTools=true` to validate automatic tool execution.
- Prompt/tool descriptions are improved so a capable model knows when to call `delegate_tasks`, `send_message_to`, or `accept_task`.

Forbidden:

- Adding provider `tool_choice` dampening logic in this ticket.
- Adding runtime code that compensates for weak prompts or low-performing models by forcing/avoiding specific task tools.
- Reintroducing `mark_task_completed`, `mark_task_failed`, awaiting/revision ledger states, or result-tool workflow.
- Weakening settled task-agent exact-run rejection.

## File Responsibility Updates

| Path | Round 14 target change |
| --- | --- |
| `task-delegation-tool-manifest.ts` | Keep `delegate_tasks` and `accept_task`; descriptions clearly explain returned `task_id`, `target_agent_run_id`, and accept-by-`task_id` semantics. |
| `task-delegation-service.ts` | Keep authoritative original-delegator validation and terminal acceptance/tombstoning. |
| `task-agent-directory.ts` | Keep active vs settled exact-run reachability. |
| `task-delegation-work-packet-renderer.ts` | Include task id, task-agent run id, and delegator reply selector clearly. |
| `member-run-instruction-composer.ts` | Explain configured task tools and normal send-message feedback loop. |
| E2E tests | Configure tools, use clear prompts, and classify model/prompt failure separately from architecture invariant failure. |

## Validation Additions

- Configured tool exposure tests for `delegate_tasks` and `accept_task`.
- `delegate_tasks` result/work-packet tests for `task_id` and `target_agent_run_id` clarity.
- `accept_task` authorization tests, including nested task-agent delegator acceptance.
- Mixed task flow proving active exact-run revision succeeds before acceptance and rejects after acceptance.
- Source review proving no Round 13 provider `tool_choice` dampening code is added.
