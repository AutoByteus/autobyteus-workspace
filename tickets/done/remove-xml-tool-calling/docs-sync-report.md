# Docs Sync Report

## Scope

- Ticket: `remove-xml-tool-calling`
- Trigger: `CRR-002` Pass after `API-REV-001`, followed by the mandatory delivery-stage base refresh.
- Bootstrap base reference: recorded `origin/personal` at `7f0fc49965950d9689726a048371f2e2b78eef31`.
- Integrated base reference used for docs sync: refreshed `origin/personal` at `3edb88bc6f7e15d074474f51c870a13d69d5d7b7`, merged into the ticket branch as `91c9eac86e60a3b4454486d68b9e237f8e3964fe`.
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/remove-xml-tool-calling/delivery-integration-evidence.log` — 3 files / 29 tests passed.

## Why Docs Were Updated

- Summary: The implementation removes three model-authored text tool transports, their public package surface, server setting, and Settings UI. Existing long-lived docs still described selector-driven XML/JSON/sentinel parsing, prompt manifests, text history, and deleted owners. The docs were synchronized to the integrated provider-native-only runtime.
- Why this should live in long-lived project docs: Tool schema transport, invocation authority, same-turn result continuation, provider history, package surface, and server configuration are durable runtime/operator contracts. Leaving the mixed-mode descriptions would direct maintainers and external consumers toward deleted, unsupported behavior.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Root setup/feature summary might expose the retired setting. | `No change` | No retired selector, parser-mode, or text-call instructions were present. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Canonical tool schema/streaming/continuation design. | `Updated` | Rewritten as the provider-native-only authority. |
| `autobyteus-ts/docs/api_tool_call_file_streaming_design.md` | File delta projection and invocation ownership. | `Updated` | Corrected to final native JSON authority and handler-owned invocations. |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Tool definition-to-provider schema flow. | `Updated` | Removed text manifests/custom formatting registry; documented retained native formatters. |
| `autobyteus-ts/docs/llm_module_design.md` | Provider renderers and native continuation history. | `Updated` | Removed mode-aware/text-history selection and documented content/media-only AutoByteus behavior. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Node/provider wire-format counterpart. | `Updated` | Removed resolver/text-history behavior and documented direct native renderer ownership. |
| `autobyteus-ts/docs/agent_processor_and_engine_design.md` | Processor/tool boundaries. | `Updated` | Removed manifest injection and text parsing; documented native schemas/deltas. |
| `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | Turn phases, continuation, and partial-call failure behavior. | `Updated` | Removed adapter/text-mode claims; documented native-only ingestion and suppression. |
| `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md` | Invocation/result lifecycle table. | `Updated` | Replaced parsed/text-mode split with native invocation and continuation ownership. |
| `autobyteus-ts/docs/turn_terminology.md` | `ToolInvocationBatch` continuation semantics. | `Updated` | Removed legacy batch branch; documented ordered native continuation. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Live mixed-runtime command exposed the retired environment value. | `Updated` | Removed `AUTOBYTEUS_STREAM_PARSER` from the command. |
| `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` | Entire document described removed prompt formatting/text parsing. | `Updated` | Retired/deleted; current native truth lives in `api_tool_call_streaming_design.md` and `tool_schema_and_configuration.md`. |
| `autobyteus-ts/docs/streaming_parser_design.md` | Entire document described the deleted parser FSM. | `Updated` | Retired/deleted; no parser replacement exists because assistant text is not executable. |
| Other long-lived Markdown under `docs/`, `autobyteus-ts/docs`, `autobyteus-server-ts/docs`, and `autobyteus-web/docs` | Check for additional obsolete identifiers/settings. | `No change` | Static scan found no other reference to deleted runtime classes/paths. Uses of “manifest” for current server/media/team contracts are unrelated. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Rewrite | Sole native transport, schema factory, normalized deltas, segments, invocation authority, continuation/history, removals. | Establish the canonical current runtime design. |
| `autobyteus-ts/docs/api_tool_call_file_streaming_design.md` | Rewrite | Display-only projector, buffering, final JSON authority, end-before-invocation ordering. | Replace obsolete adapter/parser assumptions. |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Targeted update | Native-only `ToolSchemaProvider` flow and provider-owned extensions. | Remove deleted prompt schema/example owners. |
| `autobyteus-ts/docs/llm_module_design.md` | Targeted update | Direct native renderer selection; no text history; AutoByteus no emulation. | Match provider constructor and history behavior. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Targeted update | Removed format resolver/text-mode branches; retained provider-native wire shapes. | Keep the Node implementation reference truthful. |
| `autobyteus-ts/docs/agent_processor_and_engine_design.md` | Targeted update | Non-tool prompt processors, native schemas/deltas, current request flow. | Remove deleted manifest/parser architecture. |
| `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | Targeted update | Native-only handler and ordered continuation; failure drops partial calls. | Match surviving loop owners. |
| `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md` | Targeted update | Native invocation and continuation lifecycle entries. | Remove legacy lifecycle branch. |
| `autobyteus-ts/docs/turn_terminology.md` | Targeted update | Native batch source and `tool_history_only` behavior. | Clarify one continuation path. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Command correction | Removed retired environment selector. | Prevent operators from configuring a nonexistent control. |
| `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` | Retirement | Deleted obsolete mixed-mode design. | The implementation intentionally has no formatter/parser subsystem. |
| `autobyteus-ts/docs/streaming_parser_design.md` | Retirement | Deleted obsolete parser FSM design. | There is no text parser replacement or compatibility mode. |
| `tickets/done/remove-xml-tool-calling/release-notes.md` | Archived release/handoff note | Recorded behavior, breaking surfaces, config disposition, validation, and residual risks. | Preserve the intentional removal details after verification without publishing a release. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Sole invocation transport | Only normalized provider-native deltas create tools; tool-looking assistant text remains text. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `api_tool_call_streaming_design.md`, `agent_processor_and_engine_design.md` |
| Schema/setup ownership | Factory chooses tools/no-tools; `ToolSchemaProvider` builds provider-native schemas; no prompt manifest. | `design-spec.md`, `implementation-handoff.md` | `api_tool_call_streaming_design.md`, `tool_schema_and_configuration.md` |
| File invocation authority | Live path/content extraction is UI projection only; final provider JSON creates the invocation after segment end. | `design-spec.md`, `code-review-report.md`, `api-e2e-test-review-report.md` | `api_tool_call_file_streaming_design.md` |
| Native continuation/history | Ordered results are ingested once and replayed through provider-native history without aggregate synthetic user text. | `requirements.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `api_tool_call_streaming_design.md`, LLM/runtime/lifecycle/turn docs |
| Non-native provider behavior | A provider without a normalized native tool channel remains ordinary chat/media-only and receives no local text fallback. | `requirements.md`, `design-spec.md` | `api_tool_call_streaming_design.md`, `llm_module_design*.md` |
| Retired setting | The server retains the exact old key only for idempotent discard/rejection; it cannot select runtime behavior. | `requirements.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `api_tool_call_streaming_design.md`, `release-notes.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| XML/JSON/sentinel parser states, strategies, syntax adapters, and parsing handler | No replacement; assistant text is non-executable | `api_tool_call_streaming_design.md` |
| Tool manifest/example formatters, registry, provider, and bootstrap injector | Provider-native `ToolSchemaProvider` and retained native schema formatters | `tool_schema_and_configuration.md` |
| Tool-call format selector and server/web Streaming Parser control | Unconditional native tool path; exact retired-key discard/rejection only | `api_tool_call_streaming_design.md`, `release-notes.md` |
| Text-history renderers and text result continuation | Direct provider-native renderers plus ordered native continuation | `llm_module_design.md`, `llm_module_design_nodejs.md`, `agent_runtime_loop_and_interrupt.md` |
| Text parser/formatter public exports and direct package subpaths | Supported provider-native schema/streaming contracts; no aliases | `api_tool_call_streaming_design.md`, `release-notes.md` |
| `tool_call_formatting_and_parsing.md` and `streaming_parser_design.md` | Current provider-native design docs | `api_tool_call_streaming_design.md`, `api_tool_call_file_streaming_design.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: `None` — user verification, repository finalization, target push, archive, and task cleanup are complete.
- Notes: Release notes were required because the change intentionally removes public subpaths and provider fallback behavior. They were prepared and archived but were not published because the user explicitly requested no new release.
