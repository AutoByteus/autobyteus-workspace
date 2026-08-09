# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements approved; design package ready for architecture review
- Investigation Goal: Determine whether model-authored XML tool calling should be removed, whether the same rationale applies to all text-embedded formats, and what clean architecture remains.
- Scope Classification: `Large`
- Scope Classification Rationale: The removal crosses three packages, a published package surface, runtime construction/streaming/memory paths, persisted server configuration, UI, durable coverage, and documentation. The obvious source deletion surface is about 5.5 KLOC.
- Scope Summary: Remove XML, JSON-text, and sentinel-text model-to-tool transports and retain provider-native API tool calls plus no-tool pass-through streaming.
- Primary Questions Resolved:
  - What constitutes the legacy path? Model-facing tool manifests/examples, mode selection, textual stream parsing, event-to-invocation text coercion, text-history rendering, text result continuation, configuration/UI, and public exports.
  - Is it reachable? Yes. The server Settings card and settings API can select XML; the server contract accepts all four format values.
  - Is it architecturally healthy? No. One mutable global mode is resolved at different lifecycle boundaries, and valid text modes have prompt/parser mismatches.
  - Does it provide a required capability? It provides an optional fallback for providers/models without native tools, but that capability conflicts with the requested API-only product direction and is not used by the default runtime path.
  - What should remain? Provider API schema adaptation, native delta conversion, native streaming/invocation handling, provider-native history/results, ordered tool continuation, and no-tool pass-through.

## Request Context

The user believes XML parsing has not been used for a long time, is intrinsically less reliable than provider/model-native trained tool protocols, and causes avoidable architectural complexity. The user suggested API tool calling should be the only path and asked for an investigation rather than assuming the removal boundary.

The investigation confirms the broader recommendation: remove every text-embedded invocation mode, not XML alone. Keeping JSON-text or sentinel-text would preserve the same model-training mismatch, distributed policy, prompt injection, parsing machinery, and fallback architecture.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling`
- Current Branch: `codex/remove-xml-tool-calling`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-09; task branch was created from refreshed `origin/personal` at `7f0fc49965950d9689726a048371f2e2b78eef31`.
- Task Branch: `codex/remove-xml-tool-calling`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The top-level superrepo is the Git root. `autobyteus-ts/` is the primary package, with required source integration removals in `autobyteus-server-ts/` and `autobyteus-web/`.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/legacy-tool-calling-removal-inventory.md` | Durable removal inventory for source, config, docs, tests, and quantitative scope | Candidate legacy-only groups, current inconsistencies, 74-file/5,469-line source opportunity, obvious coverage impact | Requirements, investigation notes, future design spec | REQ-002, REQ-005, REQ-007, REQ-008, REQ-009; AC-003, AC-004, AC-008, AC-009, AC-010, AC-011 | Current | Evidence/context; approval N/A | Keep aligned with design/review findings. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-09 | Command / Setup | `git -C autobyteus-ts rev-parse --show-toplevel`; `git status --short --branch`; `git remote -v`; `git symbolic-ref refs/remotes/origin/HEAD`; `git fetch origin --prune`; `git worktree add -b codex/remove-xml-tool-calling /Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling origin/personal` | Resolve repository/base and isolate the ticket | Git root is the superrepo; remote default and target are `personal`; task worktree is at refreshed commit `7f0fc499...` | No |
| 2026-08-09 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` and artifact templates | Apply team design/behavior/transition standards | Requires behavior map, full spines, clean-cut removal, ownership analysis, and explicit persisted-data outcome | No |
| 2026-08-09 | Command | `rg -n --hidden -S ... '(XML|Xml|xml|tool.?call.?format|tool_call|toolCalls|native tool|function.?call)' autobyteus-ts` | Discover the initial surface | Found four advertised modes; default is API; legacy parsing, prompt, history, test, and docs surfaces are extensive | No |
| 2026-08-09 | Code | `autobyteus-ts/src/utils/tool-call-format.ts` | Verify current selector/default | Accepts `xml`, `json`, `sentinel`, `api_tool_call`; defaults invalid/unset to API | No |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts`; `parsing-streaming-response-handler.ts`; `api-tool-call-streaming-response-handler.ts`; `pass-through-streaming-response-handler.ts` | Trace handler construction and invocation creation | With tools, factory branches native vs parsing; without tools, pass-through. Native handler normalizes mixed text/tool deltas and specialized file streams | No |
| 2026-08-09 | Code | Entire `autobyteus-ts/src/agent/streaming/parser/` and `src/agent/streaming/adapters/` dependency map | Identify legacy ownership and shared dependencies | Parser subtree is isolated from production native code except a shared invocation adapter whose legacy parsing responsibilities can be eliminated | No |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/context/agent-config.ts`; system-prompt processor registry/loader; `ToolManifestProvider`; `ToolFormattingRegistry` | Trace model-facing instructions | Non-API modes keep mandatory manifest injection; API removes it. Registry can mismatch JSON parser with tool-specific XML formatters; sentinel has no matching manifest grammar | No |
| 2026-08-09 | Code | Provider API adapters and `autobyteus-ts/src/tools/usage/providers/tool-schema-provider.ts` | Verify current native support and schema path | Current adapters consume schemas and normalize tool calls for OpenAI-compatible/Responses, Anthropic, Gemini, Mistral, Ollama; ToolSchemaProvider owns three provider schema shapes | No |
| 2026-08-09 | Code | `autobyteus-ts/src/llm/prompt-renderers/provider-tool-history-renderer-selection.ts` and provider constructors | Trace history mode selection | Five provider constructors choose native vs text renderers at LLM construction; LM Studio repeats the branch locally | No |
| 2026-08-09 | Code | `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts`; continuation metadata/input pipeline; memory ingest processors | Trace return spine | Native and legacy result modes branch in multiple components; native path defers active batch results and emits structured history continuation | No |
| 2026-08-09 | Code | `autobyteus-ts/src/llm/api/autobyteus-llm.ts`; `autobyteus-prompt-renderer.ts`; `autobyteus-conversation-payload.ts` | Determine whether AutoByteus provider has a native tool channel | Payload contains only role/content/media, `kwargs.tools` is ignored, stream emits no `tool_calls`; renderer text-encodes stored tool payloads as XML | Approval should acknowledge non-tool-only outcome. |
| 2026-08-09 | Code / Product Path | `autobyteus-server-ts/src/config/stream-parser-setting.ts`; `server-settings-service.ts`; `autobyteus-web/components/settings/StreamingParserCard.vue`; `ServerSettingsBasicsPanel.vue` | Verify reachability and cross-package controls | XML is a supported UI toggle; server accepts all values and mutates process env for future code reads | Remove with runtime selector. |
| 2026-08-09 | Command | Cross-workspace `rg` excluding tickets/node_modules/dist for legacy imports and `AUTOBYTEUS_STREAM_PARSER` | Identify consumers | No external source imports parser/formatter classes; server/web consume the setting contract; active docs contain many mode references | No |
| 2026-08-09 | Test / Setup | Temporary symlinks to the base checkout's installed `node_modules`; `pnpm --dir autobyteus-ts exec vitest --run tests/unit/utils/tool-call-format.test.ts tests/unit/agent/streaming/handlers/streaming-handler-factory.test.ts tests/unit/agent/context/agent-config.test.ts tests/unit/llm/prompt-renderers/provider-native-tool-history-renderers.test.ts`; symlinks then removed | Confirm current behavior without installing dependencies in the ticket worktree | 4 files / 37 tests passed. Tests confirmed API default, XML/API handler selection, manifest filtering, and native history/invocation behavior | Downstream will run integrated coverage. |
| 2026-08-09 | Command / Repo | `git log -S'DEFAULT_TOOL_CALL_FORMAT'`; `git log -S'AUTOBYTEUS_STREAM_PARSER'`; file history for XML integration and native history commits | Establish chronology | API default exists at least since 2026-02-26 baseline; XML integration last materially changed April; native history/continuation strengthened May/June; settings card was added May 8 | No |
| 2026-08-09 | Command | Candidate-file `find`/`wc -l`; obvious legacy test `find`/`wc -l` | Quantify simplification | 74 obvious source candidates / ~5,469 lines; 37 obvious tests / ~5,073 lines | Counts are planning evidence, not removal quotas. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System / Contract | Tool-equipped AutoByteus runtime agent with unset/invalid/`api_tool_call` parser setting and a provider emitting native tool calls | Agent/server launch -> `AgentTurnRunner` -> `LlmPhase` -> `StreamingResponseHandlerFactory` -> `ToolSchemaProvider` -> provider API adapter -> normalized `ChunkResponse.tool_calls` -> `ApiToolCallStreamingResponseHandler` -> `ToolInvocation` -> `ToolPhase` -> result/memory/continuation -> provider native renderer | Provider schema is API data; native call identity/arguments/context become tool invocations; ordered results return through provider-native history | `llm-phase.ts`, factory/native handler, provider adapters/converters, schema provider, memory/renderer tests |
| BEH-002 | User / Operational | Settings user toggles “Use XML streaming parser,” GraphQL caller updates the predefined key, or process environment sets any accepted mode | Settings card -> server settings store/GraphQL -> `ServerSettingsService.updateSetting` -> `AppConfig.set` -> `process.env` -> later config/renderer/handler/result reads | XML/JSON/sentinel assistant text may be interpreted as executable tool invocations; setting is presented as applying to new streamed responses | Server config/service, Vue card, server/web tests, format resolver/factory |
| BEH-003 | System | Tool execution completes within an active turn | `ToolPhase` -> tool-result processors -> `ToolResultContinuationBuilder` -> memory batch ingestion -> `AgentInputPipeline` -> `LlmPhase.prepareToolContinuationRequest` -> provider renderer | Native mode preserves structured assistant tool calls and matching tool results; legacy modes use text-history continuation | Continuation builder, metadata, input pipeline, memory ingest, provider renderers |
| BEH-004 | System | Agent has zero configured tools | `LlmPhase.resolveTurnToolNames` -> factory -> `PassThroughStreamingResponseHandler` -> segment events -> final memory/response | Normal content is streamed; no schemas or invocations | Factory/pass-through handler and tests |
| BEH-005 | Contract | Package consumer imports root or broad subpaths | `src/index.ts` and nested index files -> parser/handler/format resolver/formatter registry exports | Legacy parsing and formatting are part of the published TypeScript surface | Package exports and index files; no internal external-package callers found |
| BEH-006 | System / Contract | AutoByteus conversation provider renders messages that contain tool payload records | `AutobyteusLLM` -> `AutobyteusPromptRenderer` -> XML/text content -> AutoByteus conversation API | Tool records are represented as assistant/user text because the API payload has no native tool fields | AutoByteus API/renderer/payload source |

## Design Health Assessment Evidence

- Change posture: `Refactor` / `Cleanup` / `Behavior Change`
- Candidate root cause classification: `Legacy Or Compatibility Pressure`, `Duplicated Policy Or Coordination`, and `Boundary Or Ownership Issue`
- Refactor posture evidence summary: Refactor is required now. Merely deleting XML states leaves JSON/sentinel variants, prompt/history branches, mutable global selection, server UI, and public compatibility surface in place.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Global selector callers | Format is independently resolved in AgentConfig, handler factory, provider renderers, result processor, continuation builder, and formatting registry | No single owner governs one agent's tool protocol; lifecycle-time mismatch is reachable | Remove selector and branches. |
| Server setting path | User updates process env without reconstructing existing AgentConfig/LLM renderer | Subsequent handler creation can disagree with already-constructed prompt/renderer | Remove live control. |
| Tool formatting registry | Tool-specific formatter lookup precedes format override | `json` parser can receive XML-instructed write/edit calls | Delete text manifest system. |
| Sentinel parser/manifest | Parser grammar is `[[SEG_START ...]]`; manifest generator has no matching sentinel formatter | Advertised mode lacks a coherent prompt-to-parser contract | Delete mode. |
| Parser/adapters | Thousands of lines parse model-authored strings and reconstruct invocation arguments | Complexity exists only to emulate provider APIs and duplicates native streaming/file handling | Remove and make native arguments authoritative. |
| Provider history selection | Constructor-time format selection chooses parallel renderer classes | History behavior duplicates provider-native renderers solely for legacy modes | Directly instantiate native renderers. |
| AutoByteus conversation provider | Text-only payload cannot carry native tools | Text emulation is the only reason for XML tool records here | Remove tool emulation; retain chat/media. |
| Package exports | Legacy internals are publicly re-exported and broad subpaths exist | Removal is intentionally breaking; wrappers would retain the bad boundary | Remove exports/files cleanly. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Main LLM/tool stream orchestration | Supplies tools/schema result and consumes handler invocations | Remains main spine caller; should not know parser formats/schema resolvers. |
| `.../streaming/handlers/streaming-handler-factory.ts` | Chooses pass-through/native/parser handlers and builds schemas | Correct construction boundary, but overloaded by obsolete format policy | Retain as thin construction owner with only tools/no-tools split. |
| `.../handlers/api-tool-call-streaming-response-handler.ts` | Accumulates native deltas, emits events, creates invocations via shared adapter | Healthy authoritative native stream owner; invocation reconstruction currently detours through legacy-capable adapter | Keep and make final accumulated native args authoritative/direct. |
| `.../handlers/pass-through-streaming-response-handler.ts` | Streams ordinary content with no tools | Healthy and independent of legacy | Preserve. |
| `.../streaming/parser/` | FSM for XML/JSON/sentinel text | Entire subtree serves removed transport | Remove. |
| `.../streaming/adapters/` | Parses/coerces text and adapts segment events to invocations | Mixes legacy string parsing with native event projection | Remove legacy adapters; native handler owns final invocation projection. |
| `autobyteus-ts/src/tools/usage/providers/tool-schema-provider.ts` | Builds provider API schema objects | Correct native schema owner | Preserve/tighten with only three native schema adapters. |
| `.../tool-manifest-provider.ts` and formatting registry/examples | Builds model-facing text tool instructions | Obsolete and internally inconsistent | Remove. |
| `.../agent/context/agent-config.ts` | Constructs agent processing config | Filters a mandatory manifest based on global mode | Remove manifest default and mode branch. |
| `.../llm/prompt-renderers/provider-tool-history-renderer-selection.ts` | Selects native vs text history | Obsolete parallel policy | Remove; provider constructors select native renderer directly. |
| `.../tool-result-continuation-builder.ts` | Ingests ordered results and builds same-turn continuation | Correct owner but branches native/text | Collapse to native behavior. |
| `.../memory-ingest-tool-result-processor.ts` | Avoids duplicate active-batch ingestion | Correct invariant incorrectly conditional on global mode | Make active-batch deferral unconditional. |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` / renderer | AutoByteus conversation API | No tools field or native deltas; tool payloads are XML/text | Retain chat/media, remove tool text emulation. |
| `autobyteus-server-ts/src/config/stream-parser-setting.ts` | Cross-package setting contract | Exists only for removed mode | Remove. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server configuration catalog/persistence | Makes legacy path operationally reachable | Remove registration; discard retired managed key at config boundary. |
| `autobyteus-web/components/settings/StreamingParserCard.vue` | XML/API toggle | Meaningless after sole-path change | Remove card, tests, translations. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-09 | Test / Setup | Temporary dependency symlinks; focused `vitest --run` command listed in Source Log; symlinks removed afterward | 37/37 current tests passed. API is the default; explicit XML retains manifest; API uses native handler/history | Current baseline is stable and confirms branch behavior before removal. |
| 2026-08-09 | Static trace | Settings toggle -> GraphQL/service -> process env -> constructor/handler reads | Existing agents can keep constructor-time prompt/renderer state while later handlers see a new mode | Live mode switching has a reachable split-ownership flaw. |
| 2026-08-09 | Static probe | Compare formatter precedence with parser selection | `write_file`/`edit_file` tool pairs remain XML even when JSON override selects JSON parsing | Text path is contractually inconsistent, not just unused. |
| 2026-08-09 | Static probe | Compare sentinel parser grammar with manifest formatter outputs | No model prompt formatter emits the sentinel parser's required segment framing | Sentinel success depends on out-of-band model behavior/manual prompting. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required. The task is an internal architecture/removal decision, and current repository provider adapters/SDK integration are the governing implementation evidence.
- Version / tag / commit / freshness: Repository base `7f0fc499...` on 2026-08-09.
- Relevant contract, behavior, or constraint learned: N/A beyond repository code.
- Why it matters: No claim is made that every external model supports native tools; providers/models without a native contract intentionally receive no text fallback.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation and focused unit probes.
- Required config, feature flags, env vars, or accounts: Focused tests mutate/restore `AUTOBYTEUS_STREAM_PARSER`; no real provider credentials used.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation; temporary dependency symlinks to the base checkout for one focused Vitest run.
- Cleanup notes for temporary investigation-only setup: Both `node_modules` symlinks were removed; `git status` afterward contained only the new ticket artifacts.

## Findings From Code / Docs / Data / Logs

1. **API is already the normal path.** `resolveToolCallFormat()` returns `api_tool_call` for unset and invalid values. Current integration tests explicitly set the same value, often redundantly.
2. **Legacy mode is still a supported product path.** The Settings basics page renders a dedicated XML toggle; the server exposes validation for all mode values and persists them.
3. **The setting cannot safely govern one existing agent.** `AgentConfig` and provider renderers resolve at construction, while a streaming handler/result processor resolves later. A settings update does not reconstruct those owners.
4. **Text parser modes are not reliably paired to prompts.** Tool-specific XML formatters override JSON selection; sentinel selection has no corresponding prompt grammar.
5. **Native code has a clear real spine.** Provider-native schemas and `ToolCallDelta` normalization already isolate SDK differences. The API handler owns live aggregation/file projection and only needs its legacy adapter dependency removed.
6. **Legacy code dominates the surface.** Parser states, schema coercion, prompt examples, manifest registries, renderer variants, selectors, exports, and tests are all removable once text invocation is unsupported.
7. **Public API compatibility is the main non-runtime risk.** Root/nested exports expose legacy classes. No in-repo production consumer uses them, so aliases would only retain an undesirable contract.
8. **AutoByteus conversation is not a native tool provider.** Its renderer's XML is emulation. API-only means keeping that provider for chat/media, not local tool calls.
9. **Unrelated XML must be protected.** `ContextFileType.XML` and generic file/media handling are independent; queue sentinels and provider JSON schemas are also not legacy transports.
10. **Documentation currently treats modes as peers.** Delivery must rewrite/retire those docs after implementation rather than leaving configuration instructions for removed behavior.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Zero or one `AUTOBYTEUS_STREAM_PARSER=<xml|json|sentinel|api_tool_call>` value in process environment and server-managed `.env`; small string value. Agent definitions normally persist only optional processors because mandatory names are filtered.
- Relevant code-model, serialization, semantic, or physical-store change: Remove the key as a meaningful managed setting and remove `ToolManifestInjector` from the mandatory processor registry.
- Normal readers and writers, including unknown/extra-field behavior: `AppConfig` loads env keys generically; `ServerSettingsService` presents persisted keys and can write/delete them. Without an explicit discard/rejection boundary, the obsolete key could reappear as a custom setting even though runtime no longer reads it.
- Representative direct-read or compatibility evidence: `AppConfig.get()` reads process/config values; `set()` persists to process/env file; `delete()` removes both and edits the writable env file. This provides an idempotent discard mechanism.
- Required semantics and invariants preserved by direct use: `No` for presenting the key as a current setting; its value is obsolete and safe to discard. All unrelated config must remain unchanged.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: The value is non-sensitive and disposable. Externally supplied read-only environment sources cannot necessarily be rewritten, but after runtime readers are deleted such values are inert.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration is required. A targeted idempotent discard/rejection at the server configuration boundary prevents misleading custom-setting visibility; risk is limited to accidentally deleting another key, prevented by exact-key handling.
- Existing migration framework or lifecycle constraints, only if migration may be required: `AppConfig.delete()` already handles in-memory/process/writable-env removal. No bulk store or maintenance window exists.

## Constraints / Dependencies / Compatibility Facts

- Source changes must remain coordinated across `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`.
- Provider-specific native renderer and tool delta contracts must remain intact.
- OpenAI-compatible/local endpoints may reject/omit native tools; the approved behavior must not fall back to text parsing.
- Broad package subpath exports mean external callers can be broken. This is accepted only if user approves the clean-cut removal.
- Tests that exist solely to validate removed behavior become stale but may be edited/removed only after the mandatory downstream coverage investigation.
- Documentation sync belongs to delivery after branch refresh/integration.

## Open Unknowns / Risks

- External `autobyteus-ts` consumers are not discoverable from this repository.
- No production telemetry was available to quantify mode usage; supported reachability and correctness evidence are sufficient for the design recommendation.
- AutoByteus conversation history with existing tool payloads loses text emulation by design.
- The design assigns the one-key managed-config discard and later-write rejection to `AppConfig`; implementation must preserve the exact-key boundary and tolerate unwritable external environment sources without affecting unrelated configuration.

## Notes For Architecture Reviewer

- Do not approve an XML-only deletion that leaves JSON-text/sentinel, the global mode, or text manifest/history infrastructure.
- Confirm the target factory keeps the real tools/no-tools split without absorbing provider/schema logic into `LlmPhase`.
- Confirm the native handler uses accumulated provider JSON as invocation authority and retains file stream extraction only as a live projection.
- Confirm no compatibility exports/wrappers or hidden text fallback remain.
- Confirm persisted setting handling is a discard at the server configuration boundary, not a runtime compatibility read.
- Requirements were approved by the user on 2026-08-09; review the target design against the all-text-mode removal rather than reconsidering an XML-only scope.
