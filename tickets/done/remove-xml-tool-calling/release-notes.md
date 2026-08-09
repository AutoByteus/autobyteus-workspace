# Release Notes — Provider-Native Tool Calling Only

> Archived delivery notes only. The user verified the local Electron build and
> requested repository finalization without a new version or release. These
> notes are not being published.

## Summary

AutoByteus now supports provider-native API tool calls as the only
model-to-tool invocation transport. XML, JSON-text, and sentinel-text invocation
modes and their runtime configuration have been removed rather than deprecated.

## Behavior Changes

- Tool-equipped agents send provider-appropriate schemas through the provider's
  native tool API and construct invocations only from normalized native call
  deltas.
- Assistant text that resembles a former XML, JSON, sentinel, or `[TOOL_CALL]`
  shape remains ordinary assistant text and cannot execute a tool.
- Provider-native call identity, final arguments, parallel ordering, live file
  projection, tool execution, ordered result ingestion, and provider-native
  continuation/history remain supported.
- Agents with no configured tools continue through ordinary pass-through
  streaming without tool schemas.
- Providers without a normalized native tool channel no longer receive a local
  text-encoded fallback. The AutoByteus conversation provider remains available
  for ordinary content/media behavior but does not emulate tool calls or tool
  history in text.

## Removed Configuration and UI

- Removed the server/web Streaming Parser setting and XML toggle.
- Removed predefined-setting and GraphQL exposure for
  `AUTOBYTEUS_STREAM_PARSER`.
- On server configuration initialization, the exact retired key is discarded
  from managed configuration when writable and is ignored for the active
  session otherwise; later writes to that exact key are rejected.
- No migration or maintenance window is required. Unrelated server settings and
  externally managed inert environment data are not rewritten.

## Breaking Package Surface

Legacy parser states/strategies, parsing handlers, invocation adapters, tool
manifest/example formatters, formatting registries, text-history renderers,
format resolution, and related public exports/direct subpaths were deleted.
There are no compatibility aliases or deprecated wrappers. External package
consumers of those intentionally removed paths must move to supported
provider-native schema and streaming contracts.

## Documentation

- Replaced the old mixed-mode streaming design with an authoritative
  provider-native schema/streaming/continuation description.
- Updated file-streaming, tool schema, LLM renderer, agent processor/runtime,
  lifecycle, turn terminology, and server mixed-team validation docs.
- Retired the obsolete text-call formatting/parsing and streaming parser design
  documents.

## Validation

- Source review: `CRR-001` Pass, 95/100.
- API/E2E: `API-REV-001` Pass at 97% confidence, including 1 added, 39 updated,
  and 65 removed durable test paths; full core unit coverage passed 1,512 tests.
- Durable coverage review: `CRR-002` Pass with no findings.
- Real validation included a clean DeepSeek native tool/compaction/continuation
  run, an OpenAI no-tool run, and populated browser Settings checks.
- After merging the latest `origin/personal`, a focused integration check passed
  3 files / 29 tests across the native handler, ordered continuation, and the
  refreshed base's tool-protocol recovery boundary.

## Bounded Residual Risks

- External compactor output can vary; the initial DeepSeek attempt observed
  invalid compactor JSON, while an immediate clean rerun passed.
- AutoByteus remote model discovery was unavailable, so its live ordinary-chat
  scenario remains explicitly Not Tested.
- Not every supported provider made a live tool call.
- Consumers of intentionally removed package subpaths outside this repository
  cannot be enumerated locally.
