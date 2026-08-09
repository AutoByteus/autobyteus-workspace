# Requirements Doc

## Status

`Refined`

## Goal / Problem Statement

Make provider-native API tool calling the only supported model-to-tool invocation mechanism in `autobyteus-ts`. Remove the XML, JSON-text, and sentinel-text tool-call modes and their configuration, prompt injection, parsers, history emulation, public exports, and cross-package UI/server controls. Simplify the remaining runtime around one native tool-call path without changing normal provider-native tool execution, no-tool response streaming, or unrelated XML/JSON functionality.

The removal is intentional rather than a deprecation: models/providers should use the tool protocol on which their API integration is trained and supported. A provider without a native tool-call channel must not be given a model-authored textual emulation fallback.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | With tools configured and `AUTOBYTEUS_STREAM_PARSER` unset/invalid/`api_tool_call`, the runtime builds provider-specific tool schemas, passes them through the provider API, normalizes native tool-call deltas, emits stream segments, creates invocations, executes tools, and renders provider-native tool history/results. | This becomes the sole supported tool-invocation path and no longer depends on a format selector. | Tool identity, argument payloads, execution/approval behavior, live tool/file segments, ordered result ingestion, provider-native history, and same-turn continuation outcomes remain supported. | REQ-001, REQ-002, REQ-003, REQ-004; AC-001, AC-002, AC-005, AC-006 |
| BEH-002 | A user can enable XML through the server Settings card; GraphQL/custom settings or environment values can select XML, JSON, or sentinel parsing for future handler construction. These paths inject model-facing tool manifests and parse assistant text into invocations. | The setting and all text-embedded invocation modes are removed. Assistant text that resembles XML/JSON/sentinel tool syntax remains ordinary assistant text and never causes tool execution. | Generic server-settings behavior unrelated to this key remains unchanged. | REQ-001, REQ-005, REQ-007; AC-003, AC-004, AC-008, AC-009 |
| BEH-003 | Tool prompt/history/continuation policy branches on a mutable process-global format at several lifecycle times; provider constructors may choose text-history renderers, `AgentConfig` may retain a manifest injector, and tool results may use text-history continuation labels. | Tool schemas are supplied only through provider APIs; provider-native history/result rendering and ordered native continuation are unconditional for tool calls. No tool manifest or text-history renderer remains. | Context-file tool results still reach the next request through the established context-file carrier, and display summaries remain available to users. | REQ-002, REQ-003, REQ-004; AC-002, AC-005, AC-006 |
| BEH-004 | When an agent has no configured tools, the runtime uses pass-through text streaming and does not send tool schemas. | Unchanged. | Text, reasoning, media, token usage, interruption, failure, and completion events for no-tool responses remain supported. | REQ-006; AC-007 |
| BEH-005 | `autobyteus-ts` publicly exports parser factories/state types, text parsing handlers, formatter registries, manifest injection, and the tool-call-format resolver. `ToolDefinition` also exposes XML/text-manifest usage helpers. | Legacy contracts and files are removed without aliases, wrappers, fallback imports, or deprecated re-exports. The supported public surface contains only provider-native schema/streaming contracts. | Unrelated tool registry, schema definition, tool execution, segment event, and provider-native classes remain available where already supported. | REQ-007, REQ-008; AC-004, AC-010 |
| BEH-006 | `AutobyteusLLM`'s conversation renderer can encode stored tool calls/results into model-facing XML/text even though that endpoint neither forwards `kwargs.tools` nor emits normalized native `tool_calls`. | The AutoByteus conversation path remains chat/media-only unless its API later gains a native tool contract; it does not emulate tool invocation or tool history with XML/text. | Ordinary AutoByteus conversation content and media behavior remain unchanged. | REQ-009; AC-011 |

## Investigation Findings

- The provider-native path is already the repository default and has active adapters for OpenAI Chat/Responses and OpenAI-compatible providers, Anthropic, Gemini, Mistral, and Ollama.
- The legacy modes are not merely dormant: the web Settings card and server settings API make XML reachable, and the server accepts all four advertised values.
- The mutable format is resolved separately at agent-config construction, LLM renderer construction, response-handler creation, result ingestion, and continuation building. Updating it for an existing agent can make those components disagree.
- Advertised text modes are internally inconsistent. `json` can retain tool-specific XML prompt formatters for `write_file`/`edit_file`, and `sentinel` has no corresponding manifest generator for its `[[SEG_START ...]]` grammar.
- The parser/manifest/text-history surface is large: 74 obvious source-file deletion candidates total about 5,469 lines; 37 obvious legacy-focused test files total about 5,073 lines, before mixed-mode assertions are counted.
- No non-test source outside `autobyteus-ts` directly imports the legacy parser/formatter implementations. Cross-package dependencies are limited to the server setting and web card, which must be removed with the runtime selector.
- Repository history shows provider-native mode has been the default since at least the flattened TypeScript source baseline on 2026-02-26. XML-specific integration work was last materially changed in April 2026, while subsequent May/June work strengthened native history/continuation behavior.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/legacy-tool-calling-removal-inventory.md` | Investigation inventory of candidate source, configuration, docs, and coverage removals | REQ-002, REQ-005, REQ-007, REQ-008, REQ-009 | AC-003, AC-004, AC-008, AC-009, AC-010, AC-011 | Evidence/context; approval N/A | Supports removal breadth and quantitative simplification; this requirements doc remains authoritative for intended behavior. |

## Design Health Assessment (Mandatory)

- Change posture: `Refactor` / `Cleanup` / `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Legacy Or Compatibility Pressure` and `Duplicated Policy Or Coordination`, with a resulting `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: Four invocation modes distribute one global policy across prompt construction, schema formatting, provider rendering, stream parsing, invocation assembly, memory ingestion, continuation construction, server configuration, and UI. Text-mode prompt/parser contracts disagree for valid settings, and a runtime setting change can split one agent across modes.
- Requirement or scope impact: A local XML parser deletion is insufficient. The clean target must remove all text-embedded modes and their cross-package controls, collapse mode branches, and retain one provider-native owner/path.

## Recommendations

1. Approve a clean-cut removal of all three text-embedded modes (`xml`, `json`, `sentinel`), not XML alone.
2. Keep `StreamingResponseHandlerFactory` as the setup owner but reduce it to the real behavior split: no tools -> pass-through; tools -> provider-native schema plus native handler.
3. Make provider-native accumulated arguments authoritative. Keep incremental file-content extraction only for live display; do not re-parse emitted segment text into invocations.
4. Remove model-facing tool manifests, example formatters, text-history renderers, global format resolution, server setting, and Settings card.
5. Remove public legacy exports/contracts without compatibility wrappers.
6. Explicitly keep providers without a native tool API as non-tool-capable rather than preserving text emulation.

## Scope Classification

`Large`

The behavior target is conceptually simple, but the removal crosses `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`, affects a published package surface, and invalidates a substantial legacy coverage/doc set.

## In-Scope Use Cases

- UC-001: A tool-equipped AutoByteus runtime agent invokes one or more tools through a provider-native API and continues the same turn with native tool results/history.
- UC-002: A tool-equipped provider emits mixed assistant text/reasoning and native tool-call deltas; users receive the same live segment/tool lifecycle outcomes.
- UC-003: An agent with no tools streams a normal response through the pass-through handler.
- UC-004: An assistant emits text resembling any removed tool syntax; the text is treated only as assistant output.
- UC-005: A server operator opens settings or attempts to configure the retired stream parser; no meaningful parser selector remains.
- UC-006: Library callers build/use provider-native tool schemas and streaming behavior without legacy parser/formatter exports.
- UC-007: A provider integration without a native tool channel performs normal chat/media requests but does not emulate local tools through text.

## Out of Scope

- Adding a native tool API to the AutoByteus conversation service.
- Introducing per-model native-tool capability metadata or automatic provider capability discovery.
- Adding another textual fallback, hybrid parser, repair parser, or prompt-only tool protocol.
- Changing tool approval, execution, result semantics, tool schemas, file editing semantics, or provider-specific native request legality rules except as required to remove mode selection.
- Removing XML as a context-file/media type, XML used by unrelated external protocols, JSON Schema, JSON argument payloads, queue sentinel objects, or internal diagnostic log labels.
- Preserving external consumer compatibility with removed public subpaths/classes.
- Proving historical production frequency; the supported setting path establishes reachability, while telemetry is not available in the repository.

## Functional Requirements

- **REQ-001 — Sole invocation transport:** The runtime shall create tool invocations only from normalized provider-native tool-call data, never from assistant text content.
- **REQ-002 — One tool-call setup path:** Tool-equipped LLM phases shall always build provider-specific API schemas and use the provider-native streaming handler; the runtime shall have no invocation-format selector or mode registry.
- **REQ-003 — Native streaming fidelity:** The surviving handler shall preserve normalized tool identity, call identity, final argument JSON, provider-native context, mixed assistant text, specialized live write/edit file content projection, and segment lifecycle behavior.
- **REQ-004 — Native result continuation:** Ordered batch result ingestion, memory projection, context-file handling, and provider-native tool history/result rendering shall be the only tool continuation path. Text-history continuation modes and renderers shall be removed.
- **REQ-005 — Remove operational control:** The server and web application shall remove the stream-parser setting definition, validation, dedicated card, translations, and docs. The retired key shall not affect runtime behavior; managed persisted copies are disposable and shall be discarded at the server configuration boundary.
- **REQ-006 — Preserve no-tool streaming:** Agents with no configured tools shall continue using pass-through streamed response handling without tool schemas.
- **REQ-007 — Remove legacy implementation:** XML, JSON-text, and sentinel parser states/strategies/adapters, tool manifest injection, text-call schema/example formatting, text-history renderers, format branching, and dead diagnostics shall be deleted.
- **REQ-008 — Remove legacy public contracts:** Package exports, convenience APIs, and direct module files whose only purpose is a removed text invocation mode shall be removed without compatibility aliases or wrappers.
- **REQ-009 — No text emulation for non-native providers:** Provider integrations that do not expose normalized native tool calls shall not receive model-facing XML/JSON/sentinel tool instructions or text-encoded tool history as a local-tool substitute; their ordinary non-tool behavior shall remain available.
- **REQ-010 — Preserve unrelated formats:** XML/JSON/sentinel concepts unrelated to model-to-tool invocation shall remain unchanged.
- **REQ-011 — Project synchronization:** Source, package builds, server/web integration, durable coverage, and durable documentation shall describe and validate an API-only tool-call architecture after the change.

## Acceptance Criteria

- **AC-001 (UC-001):** Given a configured tool and a provider-native tool call, the runtime sends the provider-appropriate schema, produces exactly the normalized invocation(s), executes them through the existing tool phase, records ordered results, and makes matching native tool history/results available to the continuation request.
- **AC-002 (UC-002):** Mixed text/reasoning plus native tool deltas preserve assistant output, reasoning output, tool IDs/names/arguments/native context, live file-content segments, and interruption/failure/finalization behavior.
- **AC-003 (UC-004):** XML blocks, JSON text-call shapes, sentinel blocks, and legacy `[TOOL_CALL]`-looking assistant text produce zero tool invocations unless the provider also emits a native tool call.
- **AC-004 (UC-006):** No production source or package export retains `resolveToolCallFormat`, `AUTOBYTEUS_STREAM_PARSER` handling, parsing handler/factory contracts, parser state/strategy contracts, tool-manifest injection, text-history renderer selection, or XML/text-call formatter registries.
- **AC-005 (UC-001):** Tool-result continuation has one native mode; results belonging to the active native batch are deferred/ingested in order exactly once, and context-file continuations still append the required carrier message when applicable.
- **AC-006 (UC-001/UC-006):** Provider constructors select native prompt/history renderers directly; no process-global setting can make a handler, prompt, renderer, and continuation disagree.
- **AC-007 (UC-003):** With zero configured tools, no tool schema is sent, ordinary streamed content and media/reasoning/token events remain available, and no invocation is produced.
- **AC-008 (UC-005):** The Settings basics UI has no stream-parser/XML toggle, the server has no predefined stream-parser setting, and the removed key cannot change subsequent agent behavior.
- **AC-009 (UC-005):** A managed persisted `AUTOBYTEUS_STREAM_PARSER` value is safe to discard and is removed/ignored at configuration initialization without affecting any other server setting; no data migration or compatibility read is required.
- **AC-010 (UC-006):** Importing supported provider-native tool/schema/streaming surfaces still builds, while removed legacy subpaths/exports are absent rather than aliased.
- **AC-011 (UC-007):** The AutoByteus conversation provider still sends/streams ordinary content and media, but its renderer no longer emits XML/text tool-call or tool-result records.
- **AC-012 (all):** `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web` build/typecheck successfully, and the downstream coverage investigation classifies/removes stale legacy tests while retaining or expanding provider-native/no-tool coverage.
- **AC-013 (UC-001/UC-003):** Unrelated XML context-file classification, JSON Schema generation for provider APIs, queue termination sentinels, and internal tool lifecycle log labels remain operational.

## Constraints / Dependencies

- `autobyteus-server-ts` consumes `autobyteus-ts` source/package exports; removal must be coordinated in the same superrepo change.
- Provider-native request/response contracts and provider-specific history renderers are the governing boundaries.
- OpenAI-compatible/local models may vary in their native tool support; no text fallback is permitted when a selected model rejects or omits native tool calls.
- The published `autobyteus-ts` package uses broad subpath exports. This is an intentional breaking removal; no compatibility guarantee applies to legacy subpaths.
- Durable test edits/removals are owned by `api_e2e_engineer` after initial code review and must follow a coverage investigation.
- Durable documentation sync is owned by `delivery_engineer` against the refreshed integrated state.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Optional `AUTOBYTEUS_STREAM_PARSER=<mode>` in server managed configuration/process environment and writable `.env`; potentially old mandatory `ToolManifestInjector` names in manually authored agent definitions.
- Required outcome: `Discard or Rebuild`
- Existing data to preserve, discard/rebuild, transform, or quarantine: The parser value is disposable and should be discarded at the managed configuration boundary. Normal agent-definition persistence already strips mandatory processors; an unexpected old explicit `ToolManifestInjector` name may be ignored/removed as an unavailable processor rather than mapped to a replacement.
- Unacceptable data loss or corruption: No unrelated environment setting, agent definition, tool list, memory, run history, or provider-native tool record may be deleted or rewritten.
- Relevant availability, maintenance-window, or rollout constraints: No maintenance window or bulk migration. Cleanup is a small idempotent discard during normal server configuration initialization; externally supplied inert environment values may remain outside the application's writable store but have no reader/effect.
- Related requirement and acceptance-criteria IDs: REQ-005, REQ-008; AC-008, AC-009, AC-010.

## Assumptions

- The user's statement that API is the only acceptable path applies to all model-authored text invocation formats, not XML alone.
- It is acceptable for a provider/model without native tool support to be unable to invoke local tools rather than receive a text fallback.
- Removing public legacy exports is acceptable as a clean-cut architectural change.
- Existing provider-native tool execution and no-tool chat behavior are valuable and must remain stable.

## Risks / Open Questions

- Some external package consumers may import broad legacy subpaths; repository search found none, but external consumers cannot be enumerated locally.
- AutoByteus conversation histories containing prior tool payloads will no longer receive textual tool history; this is the intended consequence of prohibiting emulation, but must be clear in release documentation.
- OpenAI-compatible/local endpoints that lack native tool support will no longer have an opt-in text fallback; this is intended and should be release-noted.
- Exact test-file deletion/update decisions remain pending the downstream coverage investigation.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-004 |
| REQ-002 | UC-001, UC-002, UC-006 |
| REQ-003 | UC-001, UC-002 |
| REQ-004 | UC-001, UC-002 |
| REQ-005 | UC-005 |
| REQ-006 | UC-003 |
| REQ-007 | UC-001, UC-004, UC-006 |
| REQ-008 | UC-006 |
| REQ-009 | UC-007 |
| REQ-010 | UC-003, UC-006, UC-007 |
| REQ-011 | UC-001 through UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion ID | Scenario Intent |
| --- | --- |
| AC-001 | Positive provider-native tool loop with schema, invocation, execution, result, and continuation. |
| AC-002 | Native mixed-stream and specialized file projection fidelity. |
| AC-003 | Negative text-invocation safety across all removed syntaxes. |
| AC-004 | Static/source/public-surface confirmation that legacy selection and parsing are gone. |
| AC-005 | Exactly-once ordered native result continuation including context files. |
| AC-006 | Direct native renderer selection and elimination of split-mode lifecycle behavior. |
| AC-007 | No-tool pass-through regression protection. |
| AC-008 | User/operator control removal in server and web. |
| AC-009 | Safe obsolete-setting discard and no unrelated persisted-data impact. |
| AC-010 | Supported public API build plus clean absence of legacy contracts. |
| AC-011 | AutoByteus provider non-tool behavior without XML/text tool emulation. |
| AC-012 | Cross-package build/typecheck and coverage ownership outcome. |
| AC-013 | Explicit protection against over-broad XML/JSON/sentinel removal. |

## Approval Status

Approved by the user on 2026-08-09. The approved basis removes XML, JSON-text, and sentinel-text tool calling together, including the server setting/UI and public legacy exports, and retains provider-native API tool calling as the sole supported invocation transport.
