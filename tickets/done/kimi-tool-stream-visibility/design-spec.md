# Design Spec

- Ticket: `kimi-tool-stream-visibility`
- Revision: `canonical-invocation-identity-refactor`
- Status: `Ready for architecture review`
- Last Updated: `2026-05-14`
- Requirements Basis: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/tickets/done/kimi-tool-stream-visibility/requirements.md` (`Design-ready`)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/tickets/done/kimi-tool-stream-visibility/investigation-notes.md`
- Worktree / Branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility`, branch `codex/kimi-tool-stream-visibility`, base `origin/personal` at `b056b5f809dacb27524e492f3acef16630969e1b`

## Current-State Read

The original Kimi 2.5 bug exposed a broader identity design smell. AutoByteus/Kimi emitted distinct `run_bash:0..4` ids and the browser received later stream events, but the frontend timeline and Activity projection collapsed later invocations because our projection layer treats some colon-suffixed ids as aliases of their base.

Current active alias/cross-stream behavior exists in these places:

- Frontend projection:
  - `autobyteus-web/utils/invocationAliases.ts`
  - `segmentHandler.findSegmentById()` imports `invocationIdsMatch()` for tool-like segments.
  - `toolLifecycleHandler.resolveToolSegmentByAlias()` loops `buildInvocationAliases()`.
  - `toolActivityProjection` uses aliases to detect/update Activity rows.
- Server file-change projection:
  - `agent-run-file-change.ts` exports mirrored `buildInvocationAliases()` / `invocationIdsMatch()` helpers.
  - `file-change-invocation-context-store.ts` records one context under every alias and consumes/deletes by aliases.
  - `run-file-change-types.ts` reexports alias helpers.
- Codex terminal approval adapter:
  - `codex-thread-server-request-handler.ts` can create public ids shaped as `${itemId}:${approvalId}` and record `itemId` as an alias.
  - `codex-thread.ts` stores approval records under aliases and falls back by `split(':')[0]`.
  - `codex-item-event-payload-parser.ts` appends `approval_id` / `approvalId` to resolved invocation ids.

Runtime probes show this alias behavior is not required by the active runtimes:

- AutoByteus/Kimi exact `run_bash:N` ids are preserved through the runtime event boundary.
- Codex MCP exact `call_...` ids are used across segment, lifecycle, approval, result, and log events.
- Claude Agent SDK exact `call_...` ids are used across tool segment, lifecycle, approval, file-change, and result events.
- Codex terminal approval combined ids are produced by our adapter code; they are not a frontend concern and should not shape the public identity model.

The current code therefore has a `Legacy Or Compatibility Pressure` problem and a `Boundary Or Ownership Issue`: projection consumers infer semantic relationships from string suffixes instead of depending on an authoritative runtime/protocol boundary that supplies one canonical id and separate metadata.

## Intended Change

Make tool invocation identity exact and canonical across the in-scope path.

Target rule:

```text
One logical tool invocation has one public invocation id.
Every segment/lifecycle/log/file-change/approval event for that invocation uses that exact id.
Tool name, segment type, approval id, request id, and file-change metadata are separate fields.
No consumer may parse, trim to base, suffix-allowlist, split, or alias invocation ids for correlation.
```

Consequences:

- `run_bash:1` and `run_bash` are different ids.
- `run_bash:1` and `run_bash:4` are different ids.
- `call_3:write_file` and `call_3` are different ids.
- `call_3:edit_file` and `call_3` are different ids.
- `bash-alias-base:approval-1` and `bash-alias-base` are different ids.
- `itemId:approvalId` and `itemId` are different ids.

If a backend/runtime path currently emits `SEGMENT_START.id = call_3` and `TOOL_EXECUTION_STARTED.invocation_id = call_3:write_file` for the same logical tool, that producer is violating the canonical identity invariant and must be fixed at the producer. The frontend/server projection must not silently repair it with aliases.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Refactor` plus `Bug Fix` and `Behavior Change`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Legacy Or Compatibility Pressure`, `Boundary Or Ownership Issue`, `Shared Structure Looseness`, `Duplicated Policy Or Coordination`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`
- Evidence: Kimi live repro; active web/server alias helpers; Codex approval adapter combined-id and fallback code; Codex MCP and Claude runtime logs proving exact ids are sufficient.
- Design response: delete alias helpers and alias-dependent code; move identity responsibility to runtime/adapter boundaries; keep provider/approval details as metadata; make exact id equality the only correlation rule.
- Refactor rationale: A narrowed allowlist is still a compatibility mechanism and still makes every projection consumer own suffix semantics. Exact canonical identity is simpler, safer, and aligned with the no-legacy design rule.
- Intentional deferrals and residual risk, if any: Historical run replay compatibility is intentionally deferred/out of scope. Old events with mismatched ids may render as distinct items after this refactor; that is acceptable because live producers must emit canonical ids.

## Terminology

- `Canonical invocation id`: the one public id for one logical tool invocation. It is the value used in segment ids, lifecycle `invocation_id`, log `tool_invocation_id`, approval `invocation_id`, and file-change `sourceInvocationId` when those events describe that invocation.
- `Approval metadata`: provider/server fields such as `approvalId`, `requestId`, approval method, response mode, and provider item id when needed at an adapter boundary. These fields are not identity aliases.
- `Projection`: frontend or server code that applies events to transcript, Activity, or file-change views.

## Design Reading Order

Read this design from abstract to concrete:

1. Exact identity data-flow spines.
2. Ownership: runtime adapters produce canonical ids; projection consumers use exact ids; approval owners keep metadata.
3. Removal plan and file responsibility mapping.
4. Migration/refactor sequence and tests/docs guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: delete alias helpers, alias tests, alias reexports, Codex approval alias insertion, Codex approval split fallback, and parser approval-id concatenation.
- This design intentionally rejects all prior positive alias examples, including `call_3:write_file`, `call_3:edit_file`, and `bash-alias-base:approval-1`.
- The design is invalid if implementation keeps a generic alias helper, hidden suffix allowlist, split fallback, or dual-key approval record only to preserve old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Runtime/provider tool event | Frontend transcript and Activity rows | Runtime event/protocol boundary plus web projection handlers | Core Kimi/Codex/Claude visible tool-call behavior. |
| `DS-002` | `Return-Event` | Frontend approve/deny action | Provider/client approval response | Runtime approval owner (`CodexThread`, Claude coordinator, AutoByteus runtime owner as applicable) | Approval must work without encoding approval metadata into ids. |
| `DS-003` | `Return-Event` | Tool/file-change event | Run file-change projection and Files/Artifacts surface | Server file-change event processor/context store | File changes must attach to exact source invocation. |
| `DS-004` | `Bounded Local` | One stream/lifecycle event in web handler | One exact transcript/Activity update | Web agent streaming handlers | Ensures lifecycle-first and segment-first order still merge only exact ids. |
| `DS-005` | `Bounded Local` | Codex app-server approval request | Approval record stored/consumed | `CodexThread` approval record owner | Removes `itemId:approvalId` compatibility inside Codex adapter. |

## Primary Execution Spine(s)

`Runtime/provider tool event -> backend adapter/converter -> AgentRunEvent websocket payload -> web agent streaming handler -> transcript segment + Activity projection`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | A provider/runtime emits a tool id. The backend adapter/converter normalizes it to one canonical public id and emits segment/lifecycle/log messages using that id. The frontend applies those messages by exact id to the transcript and Activity store. | Provider/runtime event; backend converter; AgentRunEvent; web handler; transcript/Activity state | Backend runtime adapter/converter for production of ids; web projection for applying ids | Tool-name inference, segment-type inference, argument/result formatting |
| `DS-002` | The user approves or denies a tool by the public invocation id. The server/runtime approval owner resolves its internal approval record by exact id and sends the provider response with separate approval metadata. | Approval UI action; websocket command; stream handler; runtime approval owner; provider/client response | Runtime approval owner | Approval token metadata, request id, approval id, reason text |
| `DS-003` | File-change-related events carry exact source invocation id. The server context store attaches transient context only by exact key and emits run file-change payloads with that source id. | File-change event; file-change processor; context store; run file-change projection | File-change event processor/context store | Path normalization, artifact type detection, content/status projection |
| `DS-004` | A web handler receives segment or lifecycle events in any order. It finds an existing segment only if the stream identity or lifecycle invocation id exactly equals the incoming id; otherwise it creates a distinct segment/activity. | Web handler; transcript message; Activity store | Web agent streaming handlers | Placeholder tool-name resolution, synthetic segment creation |
| `DS-005` | Codex app-server approval requests may include `itemId`, `approvalId`, and `requestId`. The handler stores one record under `invocationId = itemId`, keeps `approvalId` as metadata, and consumes that exact record on approve/deny. | App-server request; Codex approval record; approve/deny call; app-server response | `CodexThread` | Response mode selection, MCP pending call tracking |

## Spine Actors / Main-Line Nodes

- Runtime/provider event source: supplies the provider's tool-call/item id.
- Backend adapter/converter/parser: owns translating provider event shape into AutoByteus public event shape.
- AgentRunEvent / websocket payload: carries the public protocol contract.
- Web agent streaming handlers: own applying stream events into local conversation and Activity state.
- Runtime approval owner: owns provider-specific approval records and response sequencing.
- Server file-change processor/context store: owns transient source-invocation context for file-change projection.

## Ownership Map

| Node | Owns |
| --- | --- |
| Runtime/provider adapter/converter | Canonicalizing provider ids into public `invocation_id`; preserving provider metadata as separate fields; never asking projection consumers to infer provider semantics from ids. |
| AgentRunEvent protocol | Public event field names and identity contract: exact ids only. |
| Web streaming handlers | Exact application of segment/lifecycle/log events to transcript and Activity state; no identity normalization beyond equality. |
| `CodexThread` / Codex request handler | Codex approval record lifecycle, provider request/response ids, `approvalId`/`requestId` metadata, and exact approval lookup. |
| File-change event processor/context store | Exact transient context keyed by source invocation id and file-change payload construction. |
| Docs/tests | Durable expression of exact identity invariant and negative coverage for old alias shapes. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamingService.approveTool()` / `denyTool()` | Server stream handler and runtime approval owner | Frontend command wrapper for approval/denial | Provider approval id parsing or alias matching |
| `TeamStreamingService.approveTool()` / `denyTool()` | Team approval token owner plus server team stream handler | Team-specific approval command wrapper | Generic invocation alias semantics |
| `run-file-change-types.ts` | File-change domain/service owners | Reexport stable file-change types | Invocation alias helpers |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils/invocationAliases.ts` | Alias behavior is legacy and boundary-violating | Exact equality in web projection handlers | `In This Change` | Delete file. |
| `autobyteus-web/utils/__tests__/invocationAliases.spec.ts` | Tests encode unsupported behavior | Exact-id negative cases in handler/projection tests | `In This Change` | Remove or replace with source-local exact-id tests; do not keep alias helper test. |
| `buildInvocationAliases()` / `invocationIdsMatch()` in `agent-run-file-change.ts` | Not part of file-change domain after exact identity | Exact context keys in `FileChangeInvocationContextStore` | `In This Change` | Keep file-change path/id helpers. |
| Alias reexports from `run-file-change-types.ts` | No alias helper remains | No replacement | `In This Change` | Source search should be clean. |
| `FileChangeInvocationContext.aliases` field | Stored context no longer has multiple keys | Single exact `invocationId` key or no stored id if map key is enough | `In This Change` | Delete multi-alias delete logic. |
| `toolLifecycleHandler.resolveToolSegmentByAlias()` | Lifecycle resolution is exact-only | Rename to exact `resolveToolSegmentById()` or inline exact lookup | `In This Change` | The old alias-named helper must not remain. |
| Activity alias expansion in `toolActivityProjection` | Activity rows are keyed by exact id | Exact upsert/update by `invocationId` | `In This Change` | Do not update multiple rows for aliases. |
| Codex `resolveApprovalInvocationCandidates()` alias output / combined primary id | `approvalId` is metadata, not identity | Replace with `resolveApprovalIdentity()` returning canonical `invocationId = itemId` plus metadata | `In This Change` | The `Candidates` concept must disappear because there are no aliases. |
| `CodexThread.recordApprovalRecord(record, aliases)` alias parameter | Approval records have one exact key | `recordApprovalRecord(record)` | `In This Change` | Store exactly once. |
| `CodexThread.findApprovalRecord()` colon split fallback | Hidden compatibility lookup | Exact `Map.get(invocationId)` | `In This Change` | `item:approval` must not find `item`. |
| `CodexThread.deleteApprovalRecord()` dual delete by `record.invocationId` and `record.itemId` | Dual-key storage removed | Delete exact `record.invocationId` only | `In This Change` | If `itemId` field is removed, this becomes straightforward. |
| `CodexItemEventPayloadParser.resolveInvocationId()` approval-id append | Produces non-canonical ids | Return provider/item/call id exactly; keep approval metadata out of this method | `In This Change` | No suffix appending. |
| Positive alias docs/examples | Contradict exact identity invariant | Exact-only docs | `In This Change` | Docs must call aliases unsupported. |

## Return Or Event Spine(s) (If Applicable)

### `DS-002` Approval Return Spine

`Frontend approve/deny command with exact invocation_id -> server stream handler -> AgentRun.approve/denyToolInvocation -> runtime approval owner exact record lookup -> provider/client approval response -> TOOL_APPROVED / TOOL_DENIED event with same exact invocation_id`

Design rules:

- The frontend sends the same public invocation id it received.
- Runtime approval owners may keep provider metadata internally, but must look up records by exact public id.
- `approvalId` and `requestId` must not be encoded into `invocation_id`.

### `DS-003` File-Change Event Spine

`Tool/file-change event with exact invocation id -> FileChangeEventProcessor -> FileChangeInvocationContextStore exact key -> RunFileChangeService/projection -> Files/Artifacts surface`

Design rules:

- The context store does not repair mismatched ids.
- A mismatch between lifecycle id and file-change source id is a producer bug or separate event, not a context-store alias case.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: web streaming handlers.
  - Chain: `incoming event -> exact segment lookup -> exact Activity lookup -> update or create one item`.
  - Why it matters: preserves lifecycle-first/segment-first ordering without collapsing different ids.
- Parent owner: `CodexThread` approval records.
  - Chain: `approval request -> store exact record -> approve/deny exact lookup -> respond/delete exact record`.
  - Why it matters: removes dual ids while preserving provider approval flow.
- Parent owner: `FileChangeInvocationContextStore`.
  - Chain: `record exact context -> find/consume exact context -> delete exact context`.
  - Why it matters: prevents file-change metadata from crossing invocations.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Tool-name/segment-type inference | `DS-001`, `DS-004` | Web projection handlers | Infer whether a generic tool is terminal/write/edit for rendering | UI needs display type even when lifecycle arrives before segment | If mixed with identity, tool names become ids again. |
| Approval metadata storage | `DS-002`, `DS-005` | Runtime approval owner | Keep `approvalId`, `requestId`, method, response mode, tool name | Provider response requires metadata beyond public id | If exposed as id suffix, projection must parse provider internals. |
| File path/artifact normalization | `DS-003` | File-change processor/service | Normalize paths and artifact types | Files UI needs stable path identity independent of invocation identity | If mixed with invocation identity, file paths/ids can become alias keys. |
| Runtime debug logging | `DS-001`, `DS-002` | Runtime adapters/tests | Show raw and converted ids | Needed for validation and regression triage | If treated as business logic, debug trace shape may drive protocol. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Transcript/Activity exact projection | `autobyteus-web/services/agentStreaming/handlers` | `Reuse/Modify` | Existing handlers own event application | N/A |
| Provider id normalization | Runtime backend event converters/parsers | `Reuse/Modify` | Existing adapters already translate provider events | N/A |
| Approval record lifecycle | `CodexThread` and runtime tool-use coordinators | `Reuse/Modify` | Existing runtime owners hold approval state | N/A |
| File-change source context | File-change event processor/context store | `Reuse/Modify` | Existing store owns transient context | N/A |
| Shared alias helper | Current `utils/invocationAliases.ts` / server copy | `Remove` | The concern should not exist | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Web agent streaming projection | Exact event application to transcript and Activity | `DS-001`, `DS-004` | Web streaming handlers | `Modify` | Remove alias helper dependency. |
| Server runtime adapter/converter layer | Public event id canonicalization | `DS-001`, `DS-002` | Backend adapter/converter/parser | `Modify` | Especially Codex approval/id parser. |
| Codex thread approval state | Approval record lifecycle and provider response | `DS-002`, `DS-005` | `CodexThread` | `Modify` | Exact records only. |
| Server file-change projection | Source invocation context and file-change payloads | `DS-003` | File-change event processor/context store | `Modify` | Exact source ids only. |
| Documentation and tests | Durable invariant and regression coverage | All | Project maintainers | `Modify` | Old alias positives become negatives. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `segmentHandler.ts` | Web agent streaming projection | Transcript projection | Find/update segments by exact stream identity or exact lifecycle id | Existing transcript owner | No shared alias structure. |
| `toolLifecycleHandler.ts` | Web agent streaming projection | Tool lifecycle projection | Resolve/create tool segment by exact id and apply lifecycle state | Existing lifecycle owner | No. |
| `toolActivityProjection.ts` | Web agent streaming projection | Activity projection | Upsert/update one Activity row by exact invocation id | Existing Activity projection owner | No. |
| `agent-run-file-change.ts` | Server file-change domain | File-change domain helpers | File-change statuses/types/path/id helpers only | Alias logic is outside domain and should be removed | No. |
| `file-change-invocation-context-store.ts` | Server file-change projection | Exact invocation context store | Record/find/consume/delete transient context by one exact key | Existing local store owner | No. |
| `run-file-change-types.ts` | Run-file-change service public types | Reexport facade | Reexport only file-change types/helpers | Existing facade; remove alias exports | No. |
| `codex-thread-server-request-handler.ts` | Codex runtime adapter | App-server request translator | Resolve canonical approval identity and metadata; emit approval request | Existing request owner | No. |
| `codex-thread.ts` | Codex runtime thread | Approval record lifecycle | Exact approval record store/find/delete | Existing runtime state owner | `CodexApprovalRecord`. |
| `codex-approval-record.ts` | Codex runtime thread | Approval record type | Tight record with canonical invocation id plus metadata | Existing type file | Yes, but only within Codex approval. |
| `codex-item-event-payload-parser.ts` | Codex event parser | Codex event id parser | Resolve public ids without approval-id concatenation | Existing parser owner | No. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Generic invocation aliasing | None | N/A | Not a valid reusable concern | `Yes` | `Yes` | A new `canonicalInvocationId` helper that secretly parses suffixes. |
| Codex approval record shape | `codex-approval-record.ts` | Codex runtime thread | Shared between request handler and thread state only | `Yes` | `Yes` | A public protocol model with optional fields for unrelated runtimes. |
| Exact id equality | Inline equality / local predicate if needed | Local owner | Too simple and concern-local for shared utility | `Yes` | `Yes` | A shared matcher that starts collecting compatibility rules. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexApprovalRecord` | `Yes` after refactor | `Yes` | `Medium` currently because `invocationId` and `itemId` both represent identity | Store canonical `invocationId`; remove stored `itemId`; keep `approvalId` separate; derive emitted `itemId` from `invocationId` at response boundaries that still include that metadata field. |
| Agent stream tool lifecycle payloads | `Yes` | `Yes` | `Low` if exact id invariant is enforced | Do not add alias fields. |
| File-change payload `sourceInvocationId` | `Yes` | `Yes` | `Low` after alias helper removal | Treat as exact optional source id only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Web agent streaming projection | Transcript projection | Exact segment lookup/update; no alias imports | Keeps transcript state logic in one existing owner | No. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Web agent streaming projection | Tool lifecycle projection | Exact tool segment resolution/creation and lifecycle state application | Existing lifecycle state owner remains cohesive | No. |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Web agent streaming projection | Activity projection | Exact Activity upsert/update/log/result by invocation id | Existing Activity projection remains cohesive | No. |
| `autobyteus-web/utils/invocationAliases.ts` | N/A | N/A | Deleted | Obsolete legacy helper | N/A. |
| `autobyteus-web/utils/__tests__/invocationAliases.spec.ts` | N/A | N/A | Deleted/replaced by handler negative tests | Obsolete legacy tests | N/A. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts` | Server file-change domain | File-change domain helpers | File-change payload/status/type/path/id helpers only | Restores file's domain responsibility | No. |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-invocation-context-store.ts` | Server file-change projection | Exact source context store | Single-key record/find/consume/delete | Store owns transient contexts only | No. |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-types.ts` | Run-file-change service facade | Type reexport facade | Reexport file-change types/helpers only | Thin facade remains clean | No. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Codex runtime adapter | App-server request translator | Resolve canonical approval identity and metadata; record exact approval; emit event | Existing boundary with app-server requests | `CodexApprovalRecord`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Codex runtime thread | Runtime approval state owner | Exact approval record Map operations | Thread owns Codex state/lifecycle | `CodexApprovalRecord`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-approval-record.ts` | Codex runtime thread | Approval record type | Tight canonical record shape | Keeps Codex approval metadata local | N/A. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Codex event parser | Event id parser | Resolve item/call id exactly; never append approval id | Existing parser owner | No. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Docs | Frontend streaming architecture | Exact-id projection docs | Existing frontend doc | N/A. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Docs | Server artifacts docs | Exact source invocation docs | Existing server doc | N/A. |

## Ownership Boundaries

- Runtime adapters are the authoritative boundary for converting external provider ids into AutoByteus public ids. If a provider exposes separate item id and approval id, the adapter must keep them separate.
- Web projection handlers are authoritative for UI state application, but not for provider identity normalization. They may compare ids for exact equality; they must not parse provider id strings.
- `CodexThread` is authoritative for Codex approval record lifecycle. Higher layers send exact public ids; they do not inspect `approvalId` or `requestId`.
- File-change context store is authoritative for transient file-change correlation, but not for repairing mismatched invocation ids.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Runtime adapter/converter public event boundary | Provider id extraction, metadata mapping | Websocket stream, frontend projection, docs/tests | Frontend/server projection parsing suffixes to infer provider semantics | Add explicit metadata fields or fix adapter output. |
| `CodexThread` approval owner | Approval record Map, requestId, approvalId, response mode | Agent stream handler, frontend approve/deny path | Caller sends or matches `itemId:approvalId` as fallback identity | Expose exact approval command by public invocation id and keep metadata internal. |
| File-change context store | Context Map and consume/delete lifecycle | File-change event processor | Store one context under multiple aliases | Emit correct source invocation id from producer. |
| Web streaming handlers | Conversation and Activity state | Components/renderers | Components compensating for collapsed/mismatched ids | Fix handler projection logic. |

## Dependency Rules

Allowed:

- Runtime adapters may depend on provider-specific metadata and convert it into public stream payloads.
- Frontend handlers may depend on public `id`, `invocation_id`, and `tool_invocation_id` fields and compare them exactly.
- Codex thread request handler may create `CodexApprovalRecord` with canonical `invocationId` plus `approvalId` metadata.
- File-change processor may pass exact invocation ids into context store and output `sourceInvocationId`.

Forbidden:

- No frontend or server projection code may call `buildInvocationAliases()`, `invocationIdsMatch()`, or any replacement that parses suffixes.
- No approval code may store the same record under both `itemId` and `itemId:approvalId`.
- No Codex parser may append approval ids to invocation ids.
- No test may assert old alias-positive behavior as supported.
- No docs may describe alias suffixes as intended behavior.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SEGMENT_START.payload.id` / `SEGMENT_END.payload.id` | Stream segment for a tool invocation | Public segment identity | Exact canonical invocation id for tool segments | Must equal lifecycle id for same tool. |
| `TOOL_EXECUTION_* payload.invocation_id` | Tool lifecycle invocation | Public lifecycle identity | Exact canonical invocation id | No suffix metadata. |
| `TOOL_LOG.payload.tool_invocation_id` | Tool log source invocation | Public log identity | Exact canonical invocation id | Attach to one exact tool. |
| `TOOL_APPROVAL_REQUESTED.payload.invocation_id` | Approval target invocation | Public approval identity | Exact canonical invocation id | Approval metadata separate. |
| Frontend `approveTool(invocationId, ...)` / `denyTool(invocationId, ...)` | Approval command target | Send user's decision | Exact canonical invocation id received in approval event | Team approval token remains separate metadata when present. |
| `CodexApprovalRecord.invocationId` | Codex approval record key | Exact record key and public id | Exact `itemId` / tool item id | `approvalId` separate field. |
| `FileChangeInvocationContextStore.record/find/consume` | File-change transient context | Context lifecycle | Exact invocation id | No aliases. |
| `AgentRunFileChangePayload.sourceInvocationId` | File-change source | Optional exact source id | Exact canonical invocation id or `null` | Not a query alias. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Tool stream payload ids | `Yes` | `Yes` | `Low` after refactor | Document exact-id invariant. |
| Frontend approval commands | `Yes` | `Yes` | `Low` after refactor | Keep token metadata separate. |
| Codex approval record | `Yes` after tightening | `Yes` | `Medium` currently | Remove dual-key/combined-id logic. |
| File-change context store | `Yes` after tightening | `Yes` | `Medium` currently | Remove aliases and `aliases` field. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Invocation identity | `canonical invocation id` | `Yes` | `Low` | Use consistently in docs/tests. |
| Alias helper | `invocationAliases` | `No` for target design | `High` | Delete. |
| Codex approval identity resolver | Current `resolveApprovalInvocationCandidates`; proposed `resolveApprovalIdentity` | `Yes` after rename | `Medium` | Remove `Candidates` because there are no aliases/candidates. |
| File-change context | `FileChangeInvocationContext` | `Yes` | `Low` after removing `aliases` | Keep source/tool/path fields only. |

## Applied Patterns (If Any)

- Adapter: runtime/Codex/Claude/AutoByteus converters translate provider event shapes into public event shapes. Identity canonicalization belongs here.
- Repository-like local store: `FileChangeInvocationContextStore` and Codex approval record Map are local state stores. They should be exact-key stores, not compatibility routers.
- Projection: frontend streaming handlers project public events into UI state by exact public identity.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers/` | Folder | Web streaming projection | Exact transcript/lifecycle/Activity projection | Existing projection subsystem | Provider id parsing, alias compatibility. |
| `autobyteus-web/utils/invocationAliases.ts` | File | N/A | Deleted | Utility is obsolete | Any replacement allowlist. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Folder | Codex runtime thread/approval owner | Codex app-server request and approval lifecycle | Existing Codex boundary | Public id concatenation/fallback aliasing. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/` | Folder | Codex event parser/converter | Resolve public ids from Codex item events | Existing adapter boundary | Approval-id suffix appending. |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/` | Folder | Server file-change projection | Exact file-change source context | Existing file-change processor subsystem | Alias matching. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts` | File | File-change domain | File-change payload/types/path helpers | Existing domain file | Invocation alias helpers. |
| `autobyteus-web/docs/` and `autobyteus-server-ts/docs/modules/` | Folder | Project docs | Exact identity documentation | Existing docs locations | Legacy alias examples. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers` | `Main-Line Domain-Control` for frontend projection | `Yes` | `Low` after alias deletion | Keep exact projection logic in current handlers; no new shared folder. |
| `autobyteus-web/utils` | `Shared/Utility` | `Yes` | `High` if alias helper remains | Delete alias helper; exact equality is not enough to justify shared utility. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread` | `Runtime Adapter / Main-Line Domain-Control` | `Yes` | `Medium` currently due approval dual ids | Tighten Codex approval record ownership. |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change` | `Off-Spine Concern` serving file-change projection | `Yes` | `Low` after exact store | Keep local context store. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Kimi ids | `run_bash:1` creates one segment/activity; `run_bash:4` creates another | `invocationIdsMatch('run_bash:1','run_bash:4') === true` | Prevents the original bug. |
| File-write ids | If lifecycle id is `call_3`, segment id is also `call_3`; metadata has `tool_name: 'write_file'` | Segment `call_3`, lifecycle `call_3:write_file`, frontend aliases them | Producer must be canonical; frontend must not repair. |
| Approval ids | `invocation_id: 'item_123'`, `approvalId: 'approval-1'`, `requestId: 7` | `invocation_id: 'item_123:approval-1'` with fallback to `item_123` | Separates identity from approval metadata. |
| Context store | `record(run, 'call_1')`; `consume(run, 'call_1')` succeeds; `consume(run, 'call_1:write_file')` misses | Store same context under `call_1` and `call_1:write_file` | Prevents cross-invocation leakage. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `invocationAliases.ts` with narrower suffix allowlist | Prior design attempted to preserve historical `write_file`/`edit_file`/`approval-N` cases | `Rejected` | Delete helper; exact id only. |
| Keep server file-change alias helper for old context shapes | Could preserve old file-change correlation | `Rejected` | Exact context store; producer must emit correct source id. |
| Keep Codex approval records under both `itemId` and `itemId:approvalId` | Could preserve old approval command ids | `Rejected` | Store exact `itemId`; keep `approvalId` metadata. |
| Keep `findApprovalRecord()` colon split fallback | Could approve old `itemId:approvalId` commands | `Rejected` | Exact lookup; mismatched command id fails rather than hiding bug. |
| Keep Codex parser appending `approvalId` | Could preserve old event id shape | `Rejected` | Parser returns item/call id exactly. |
| Add a new `canonicalizeInvocationId()` helper that strips known suffixes | Tempting as a renamed alias utility | `Rejected` | No suffix stripping anywhere in projection/correlation. |

## Derived Layering (If Useful)

- Provider adapter layer: extracts provider ids and metadata, emits canonical public events.
- Public stream protocol layer: carries exact ids and separate metadata.
- Projection layer: exact event application to UI/server state.
- Runtime approval/file-change local state: exact-key stores with provider/file metadata kept local.

The higher projection layer must not bypass the provider adapter boundary by interpreting provider-specific suffixes.

## Migration / Refactor Sequence

1. **Clean stale alias implementation from web projection.**
   - Delete `autobyteus-web/utils/invocationAliases.ts`.
   - Delete/replace `autobyteus-web/utils/__tests__/invocationAliases.spec.ts`.
   - Remove imports from `segmentHandler.ts`, `toolLifecycleHandler.ts`, and `toolActivityProjection.ts`.
   - Replace alias resolution with exact lookup/update logic.
2. **Tighten frontend tests.**
   - Keep Kimi `run_bash:0..4` regression.
   - Add/adjust negative cases for `call_1` vs `call_1:write_file`, `call_1:edit_file`, `call_1:approval-1`, `run_bash:1`, and `run_bash`.
   - Keep lifecycle-first/segment-first exact-id ordering tests.
3. **Clean server file-change alias copy.**
   - Remove alias helpers from `agent-run-file-change.ts` and `run-file-change-types.ts`.
   - Refactor `FileChangeInvocationContextStore` to one exact key and delete `aliases` from context shape.
   - Update/add exact-only unit tests.
4. **Refactor Codex approval identity.**
   - Replace `resolveApprovalInvocationCandidates()` with exact `resolveApprovalIdentity()`.
   - Store approval records by canonical `itemId` only.
   - Remove `aliases` parameter from `recordApprovalRecord()`.
   - Remove colon split fallback from `findApprovalRecord()`.
   - Remove dual delete by `itemId`; delete exact record key only.
   - Tighten `CodexApprovalRecord` so `invocationId` is canonical and `approvalId` is metadata. Remove redundant `itemId` storage; if a response payload still includes `itemId` as metadata, derive `itemId = invocationId` at the response boundary.
5. **Refactor Codex event parser.**
   - Remove approval-id append from `resolveInvocationId()`.
   - If approval metadata extraction is needed, expose a separate parser method or consume existing payload metadata without changing identity.
6. **Update Codex tests.**
   - Update `resolveApprovalInvocationId()` helper in Codex thread integration tests to return `itemId` only.
   - Add direct negative assertion that `findApprovalRecord('item:approval')` does not find `item`.
   - Assert `approvalId` remains separate where present.
7. **Run focused validation.**
   - Web projection tests for Kimi/order/Activity.
   - Server file-change exact-context tests.
   - Codex thread approval tests.
   - Codex MCP and Claude runtime/e2e focused tests if credentials/environment allow.
   - AutoByteus/Kimi stream-boundary test.
8. **Update docs.**
   - Rewrite `autobyteus-web/docs/agent_execution_architecture.md` and `autobyteus-server-ts/docs/modules/agent_artifacts.md` to exact-only identity.
   - Remove prior alias examples and allowlist language.
9. **Final source audit.**
   - `rg "buildInvocationAliases|invocationIdsMatch|invocationAliases" autobyteus-web autobyteus-server-ts` must show no active production references.
   - `rg "split\(\":\"\)|approvalId.*invocation|approval_id.*invocation"` in relevant Codex paths should be reviewed so no hidden id fallback remains.

## Key Tradeoffs

- Exact-only identity may make old historical mismatched events display separately. This is accepted because the project explicitly rejects backward compatibility for in-scope replaced behavior.
- Removing a shared helper means some sites use direct equality inline. This is preferable because equality is the invariant; a shared matcher would invite future compatibility rules.
- Codex approval refactor must be careful because provider metadata still matters. The tradeoff is to keep metadata in `CodexApprovalRecord` instead of overloading public ids.

## Risks

- Codex terminal approval with non-null `approvalId` needs targeted coverage because current live trace did not produce a non-null approval id in that path.
- Existing narrowed-alias uncommitted implementation changes may make diffs confusing; implementation must intentionally remove rather than tweak them.
- Any currently hidden producer that emits mismatched segment/lifecycle ids will surface as separate UI entries after this refactor. That is a correct failure mode and should be fixed at that producer, not in projection.

## Guidance For Implementation

- Do not create a replacement alias utility.
- Prefer direct equality:

```ts
const idsMatch = left === right;
```

- A local helper is acceptable only if it expresses one local exact lookup concern and cannot grow compatibility behavior, for example:

```ts
const hasExactInvocationId = (segment: unknown, invocationId: string): boolean =>
  isProjectableToolSegment(segment) && segment.invocationId === invocationId;
```

- Codex approval identity resolver target shape:

```ts
const resolveApprovalIdentity = (params: JsonObject) => {
  const invocationId = asString(params.itemId);
  const approvalId = asString(params.approvalId) ?? null;
  return { invocationId, approvalId };
};
```

- Codex approval record target shape:

```ts
export interface CodexApprovalRecord {
  requestId: string | number;
  method: string;
  invocationId: string; // canonical public id; for Codex terminal approvals this is itemId
  approvalId: string | null;
  responseMode: 'decision' | 'mcp_tool_call';
  toolName: string | null;
}
```

- `recordApprovalRecord()` target behavior:

```ts
recordApprovalRecord(record: CodexApprovalRecord): void {
  this.approvalRecords.set(record.invocationId, record);
}
```

- `findApprovalRecord()` target behavior:

```ts
findApprovalRecord(invocationId: string): CodexApprovalRecord | null {
  return this.approvalRecords.get(invocationId) ?? null;
}
```

- `CodexItemEventPayloadParser.resolveInvocationId()` must return the first available id field exactly and must not append `approvalId`.
- Test old aliases as unsupported:

```ts
expect(findSegmentById(context, 'call_1:write_file')).not.toBe(findSegmentById(context, 'call_1'));
expect(store.consume(runId, 'call_1:write_file')).toBeNull(); // when only call_1 was recorded
expect(thread.findApprovalRecord('item_1:approval-1')).toBeNull(); // when only item_1 was recorded
```
