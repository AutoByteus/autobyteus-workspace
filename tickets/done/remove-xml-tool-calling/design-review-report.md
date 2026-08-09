# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/legacy-tool-calling-removal-inventory.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Initial architecture review requested by `solution_designer` after user approval of the API-only removal scope on 2026-08-09.
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: Superrepo base `7f0fc49965950d9689726a048371f2e2b78eef31`; direct review of the current agent turn, streaming-handler, native converter, invocation, memory/continuation, provider-renderer, package-export, server-config/settings, and web-settings sources; upstream focused baseline evidence of 37 passing tests; and the current removal-inventory/source-search evidence.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: The approved business decision is a clean-cut removal of XML, JSON-text, and sentinel-text model-to-tool transports. Provider-native API tool calling is the only supported invocation transport; no textual fallback or compatibility surface is retained.
- Relevant existing behavior and evidence confirmed: The default native path is real and provider-normalized; the server settings UI/API makes the legacy selector reachable; selection currently occurs at multiple lifecycle boundaries; native continuation persists structured calls/results and uses provider-owned renderers; AutoByteus conversation payloads have no native tool channel.
- Approved change, preserved behavior, and outside scope understood: Preserve native schema adapters, normalized deltas, invocation/execution and approval behavior, ordered native continuation, no-tool content/reasoning/media streaming, and unrelated XML/JSON/sentinel uses. Remove only model-facing text invocation machinery and its controls/exports.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System / Contract | Pass | Pass — tool-equipped runtime turns reach `LlmPhase`, the handler factory, provider schema/adapters, normalized `ToolCallDelta`, native handler, `ToolPhase`, memory, and native renderers. | Pass — `DS-001`, `DS-002`, `DS-004`, and `DS-005` preserve the full execution and return lifecycle while removing format selection. | Confirmed | None |
| BEH-002 | User / Operational | Pass | Pass — the Basics settings card and server settings service currently write the exact selector into `AppConfig`/`process.env`, establishing supported reachability. | Pass — `DS-006` removes the surface and retires only the exact key; `DS-001`/`DS-003` have no text parser. | Confirmed | None |
| BEH-003 | System | Pass | Pass — active native batches are deferred by the result processor, ingested in order by the continuation builder, projected by memory, and rendered through provider-native contracts. | Pass — `DS-002` makes active-batch deferral, ordered ingestion, native continuation metadata, request assembly, and provider rendering unconditional. | Confirmed | None |
| BEH-004 | System | Pass | Pass — zero configured tools selects the pass-through handler and sends no schemas. | Pass — `DS-003`/`DS-004` preserve ordinary text, reasoning, media, usage, interruption, failure, and completion behavior without invocation creation. | Confirmed | None |
| BEH-005 | Contract | Pass | Pass — root/nested indices and broad package subpaths currently expose parser, adapter, formatter, manifest, text-renderer, and selector contracts. | Pass — the removal plan deletes files and exports rather than aliasing them, while retaining canonical segment/native schema/handler surfaces. | Confirmed | None |
| BEH-006 | System / Contract | Pass | Pass — `AutobyteusLLM` sends role/content/media payloads, ignores tool schemas, emits no normalized native calls, and currently text-encodes stored tool payloads. | Pass — `DS-003` keeps ordinary AutoByteus chat/media and removes XML/text tool emulation without inventing a new transport. | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `legacy-tool-calling-removal-inventory.md` | Pass | Pass | Pass | Pass | Pass — current evidence/context; approval N/A | None |

The investigation notes contain the canonical supplement inventory, and the requirements and design spec both link the supplement where it materially supports removal scope.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The spec classifies the work as behavior change, refactor, and cleanup. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Mutable mode policy is independently resolved in agent config, provider construction, handler setup, result ingestion, continuation, server config, and UI; JSON/sentinel prompt/parser contracts are also inconsistent. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `Refactor needed now: Yes`; XML-only deletion is explicitly rejected. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The spines, ownership map, file contraction, removal plan, dependency rules, and change sequence implement one native path and name the intentionally deferred capability-discovery question. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary native tool execution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Native tool-result return/continuation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary no-tool/ordinary-provider response | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Live stream event return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Bounded native call aggregation | Pass | Pass | N/A — the handler is the governing local owner | Pass | Pass | Pass | Pass |
| DS-006 | Primary retired-config discard/write rejection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `StreamingResponseHandlerFactory.create` | Pass | Pass | Pass | Pass | `LlmPhase` receives handler plus schemas and must not call the schema provider or constructors separately. |
| Provider `BaseLLM.streamMessages` implementation | Pass | Pass | Pass | Pass | SDK objects remain provider-owned; agent streaming consumes normalized chunks only. |
| `ApiToolCallStreamingResponseHandler` | Pass | Pass | Pass | Pass | File streamers are projections; accumulated native arguments, identity, and context stay authoritative inside the handler. |
| `MemoryManager` request projection | Pass | Pass | Pass | Pass | Canonical call/result records remain the source of truth; provider renderers adapt them without stored parallel text history. |
| `AppConfig.initialize` / `set` | Pass | Pass | Pass | Pass | Exact-key disposal/rejection stays in the current config owner; server settings/UI do not manipulate runtime protocol behavior. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent turn and LLM phase | Pass | Pass | Pass | Pass | `AgentTurnRunner -> LlmPhase -> factory`; no selector/parser/schema-resolver dependency remains. |
| Handler factory | Pass | Pass | Pass | Pass | May construct native/pass-through handlers and use the schema provider only. |
| Provider adapters | Pass | Pass | Pass | Pass | Own SDK request legality, native renderer, and delta conversion; handler imports only normalized types. |
| Native streaming handler | Pass | Pass | Pass | Pass | May use file projectors and `ToolInvocation`; cannot use parser states, registries, XML coercion, or the legacy adapter. |
| Continuation and memory | Pass | Pass | Pass | Pass | Depend on canonical native records and never read a tool-call format or render text protocols. |
| Server config and web settings | Pass | Pass | Pass | Pass | `AppConfig` alone retains the exact retired-key rule; no agent protocol selector remains above it. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `StreamingResponseHandlerFactory.create(options)` | Pass | Pass | Pass | Low | Pass |
| `ToolSchemaProvider.buildSchema(toolNames, provider)` | Pass | Pass | Pass | Low | Pass |
| `StreamingResponseHandler.feed(chunk)` | Pass | Pass | Pass | Low | Pass |
| `ApiToolCallStreamingResponseHandler.finalize()` | Pass | Pass | Pass | Low | Pass |
| `BaseLLM.streamMessages(...)` provider implementations | Pass | Pass | Pass | Low | Pass |
| `ToolResultContinuationBuilder.build(events, {context, turn})` | Pass | Pass | Pass | Low | Pass |
| `AppConfig.initialize()` / `set(key, value)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider schema mapping | Pass | Pass | N/A | Pass | Retain/tighten `ToolSchemaProvider` and the three native schema adapters. |
| Provider-native delta normalization | Pass | Pass | N/A | Pass | Existing provider converters remain the SDK boundary. |
| Live file argument projection | Pass | Pass | N/A | Pass | Existing write/edit streamers remain internal UI projections. |
| Provider-native history rendering | Pass | Pass | N/A | Pass | Existing native renderer classes are directly constructed. |
| Retired setting disposal | Pass | Pass | Pass | Pass | Extending `AppConfig` is proportionate; no migration subsystem is created. |
| Replacement parser/protocol manager | Pass | Pass | N/A | Pass | The design explicitly rejects a new generic abstraction. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent turn / LLM loop | Pass | Pass | Pass | Pass | Reuse and remove selector/schema-resolver leakage. |
| Streaming handlers | Pass | Pass | Pass | Pass | Contract to native and pass-through owners; delete parser/adapters. |
| LLM provider adapters | Pass | Pass | Pass | Pass | Reuse native request/render/converter boundaries. |
| Tool schema usage | Pass | Pass | Pass | Pass | Contract to provider API schemas only. |
| Memory / continuation | Pass | Pass | Pass | Pass | Reuse one ordered native batch path. |
| Server config | Pass | Pass | Pass | Pass | Extend current configuration authority for exact-key retirement. |
| Web settings | Pass | Pass | Pass | Pass | Contract the Basics panel by deleting the obsolete card. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ToolCallDelta` | Pass | Pass | Pass | Pass | Retained as provider-neutral native delta; no parser fields are added. |
| `SegmentEvent` | Pass | Pass | Pass | Pass | Exported from the canonical segments owner rather than a parser alias. |
| Native schema formatter contract | Pass | Pass | Pass | Pass | `base-formatter.ts` is tightened to the common provider schema responsibility only. |
| Retired config-key set | Pass | Pass | Pass | Pass | Small local `AppConfig` invariant; not promoted into compatibility infrastructure. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ToolCallDelta` | Pass | Pass | Pass | Pass | Pass | Identity, name, argument delta, and provider-native context remain singular. |
| `SegmentEvent` | Pass | Pass | Pass | N/A | Pass | Events remain outward/live projections and cannot become invocation authority. |
| `BaseSchemaFormatter` | Pass | Pass | Pass | Pass | Pass | Example/XML usage contracts are removed rather than kept as optional fields. |
| `ToolContinuationMode` | Pass | Pass | Pass | N/A | Pass | Retains only the native metadata value; the separate request mode `tool_history_only` remains a request-assembly concern. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `streaming-handler-factory.ts` | Pass | Pass | Pass | Pass | One tools/no-tools construction decision plus schema bundle. |
| `api-tool-call-streaming-response-handler.ts` | Pass | Pass | Pass | Pass | One bounded native aggregation/event/invocation lifecycle. |
| `pass-through-streaming-response-handler.ts` | Pass | Pass | N/A | Pass | No-tool content lifecycle remains separate. |
| `segments/segment-events.ts` | Pass | Pass | Pass | Pass | Canonical public event contract. |
| `tool-schema-provider.ts` and native schema formatters | Pass | Pass | Pass | Pass | Only provider API schema mapping remains. |
| Native provider prompt renderers | Pass | Pass | N/A | Pass | One provider request-history contract per renderer. |
| `tool-result-continuation-builder.ts` / metadata | Pass | Pass | Pass | Pass | One ordered native continuation concern. |
| `autobyteus-prompt-renderer.ts` | Pass | Pass | Pass | Pass | Ordinary AutoByteus content/media only; tool-text emulation is removed. |
| `app-config.ts` | Pass | Pass | Pass | Pass | Exact retired-key handling joins the existing load/write owner. |
| `server-settings-service.ts` / `ServerSettingsBasicsPanel.vue` | Pass | Pass | N/A | Pass | They retain only current settings/catalog/card composition. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent/streaming/handlers/` | Pass | Pass | Low | Pass | Contains only supported handler lifecycle owners. |
| `agent/streaming/api-tool-call/` | Pass | Pass | Low | Pass | Native file projectors remain internal off-spine utilities. |
| `agent/streaming/segments/` | Pass | Pass | Low | Pass | Shared outward event contract has a canonical owner. |
| `tools/usage/providers/` and `formatters/` | Pass | Pass | Low after contraction | Pass | Established native schema locations remain; manifest/examples are removed. |
| `llm/prompt-renderers/` | Pass | Pass | Low | Pass | Provider-native renderers remain; selector/text variants are removed. |
| `server-ts/src/config/app-config.ts` | Pass | Pass | Low | Pass | Exact retirement belongs to current config authority. |
| Parser/adapters and web parser card paths | Pass | Pass | Low | Pass | Deleted because no supported owner remains. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| XML/JSON/sentinel parser FSM, strategies, adapters, handlers, coercion, diagnostic | Pass | Pass | Pass | Pass | Whole legacy parsing surface and exports are removed. |
| Tool manifests, examples, registries, usage conveniences | Pass | Pass | Pass | Pass | Provider API schema owner remains; no model-facing manifest survives. |
| Text tool-history renderers and selection | Pass | Pass | Pass | Pass | Existing native renderers are directly constructed, including LM Studio's OpenAI-chat path. |
| Runtime selector and lifecycle branches | Pass | Pass | Pass | Pass | Agent config, factory, result ingestion, metadata, continuation, and constructors collapse to native behavior. |
| AutoByteus tool-text emulation | Pass | Pass | Pass | Pass | Ordinary content/media renderer remains. |
| Public root/nested contracts and legacy-only files | Pass | Pass | Pass | Pass | No alias, deprecated re-export, or fallback subpath is allowed. |
| Server setting/startup requirement and web card/translations | Pass | Pass | Pass | Pass | `AppConfig` exact-key rule is the only retained key knowledge. |
| Stale durable tests and docs | Pass | Pass | Pass | Pass | Coverage investigation belongs to API/E2E after initial code review; integrated documentation sync belongs to delivery. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Invocation selector and text parsers | No | Pass | Pass | No always-API resolver or hybrid fallback remains. |
| Public parser/formatter/renderer contracts | No | Pass | Pass | Removed files/exports are absent rather than aliased. |
| Provider/model fallback | No | Pass | Pass | Lack of native support means lack of local tool invocation. |
| AutoByteus history | No | Pass | Pass | Existing canonical tool records are not converted to a substitute text protocol. |
| Retired server key | No runtime compatibility path | Pass | Pass | Exact discard/rejection is an approved current-config invariant, not an agent behavior reader. |
| Old explicit `ToolManifestInjector` processor name | No wrapper | Pass | Pass | The generic current processor resolver may skip an unavailable name; no replacement mapping exists. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Managed/process `AUTOBYTEUS_STREAM_PARSER` scalar and obsolete explicit processor name | `Discard or Rebuild` | Pass | Pass | N/A | Pass | `AppConfig` already owns exact-key in-memory/process/file deletion and tolerates an unwritable file by making the change session-local; `set` rejects only the exact retired key. Generic processor resolution already skips unavailable names. No unrelated config, agent definition, memory, or tool history is rewritten. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Native handler and factory contraction | Pass | Pass — no compatibility seam is permitted | Pass | Pass |
| Continuation/provider-renderer collapse | Pass | Pass — native renderer classes and metadata remain during contraction | Pass | Pass |
| Tool schema/public-surface cleanup | Pass | Pass — native schema contract is tightened before legacy exports/files disappear | Pass | Pass |
| Server/web exact-key retirement | Pass | Pass — config deletion/rejection lands with control removal | Pass | Pass |
| Coverage and documentation synchronization | Pass | Pass — ownership and stage routing are explicit | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tools/no-tools factory | Yes | Pass | Pass | Pass | Short factory code makes the contracted boundary unambiguous. |
| Provider normalization boundary | Yes | Pass | Pass | Pass | SDK delta to normalized delta is contrasted with importing SDK objects into the handler. |
| Invocation authority vs live file projection | Yes | Pass | Pass | Pass | Final accumulated JSON is authoritative; segment text is explicitly non-authoritative. |
| Text-like assistant output | Yes | Pass | Pass | Pass | The good shape remains text-only and rejects zero-native-call fallback execution. |
| Exact retired-key handling | Yes | Pass | Pass | Pass | Exact deletion/rejection is contrasted with retaining an always-API resolver. |

## Material Premise Validation (Only When Needed)

None. The only exceptional mechanism, exact-key configuration retirement, is directly required by approved BEH-002/REQ-005/AC-009 and supported by the current settings UI/API/environment path and `AppConfig` reader/writer lifecycle. No finding or new machinery depends on an additional assumed production, failure, or lifecycle scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

The upstream behavior basis is confirmed. The design is actionable in the current codebase, contracts the correct cross-package boundaries, assigns final native invocation construction to the normalized stream owner, preserves provider-owned history and ordered continuation, retires only the exact obsolete config key, and rejects all residual compatibility/fallback paths.

## Findings

None.

## Classification

`N/A` — Pass; no requirement gap, design impact, or unclear blocker remains.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- External consumers of removed broad subpaths may break; this is an approved clean-cut contract removal and requires release-note visibility, not a compatibility wrapper.
- Direct invocation construction must keep call ID, name, final normalized arguments, provider-native context, `onToolInvocation`, interruption/failure suppression, and parallel-call ordering while file streamers remain live projections only.
- Native write/edit file delta streaming and every retained provider-native history renderer need downstream regression coverage, including ordered parallel results and context-file continuations.
- Models/providers without usable native tool support may reject schemas or emit no calls; no text fallback is allowed.
- AutoByteus histories containing canonical tool payloads will no longer be text-encoded for that provider; ordinary content/media must remain intact.
- Exact-key cleanup must remain idempotent and tolerant of an unwritable external source while leaving all unrelated config untouched.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-001` establishes the initial passing baseline for `SR-001`; implementation may proceed with no compatibility seam.
