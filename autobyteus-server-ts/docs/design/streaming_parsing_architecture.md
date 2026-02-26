# Streaming Parsing Architecture (TypeScript)

## Scope

Describes how streaming model output is parsed and transformed before being persisted and emitted.

## Building Blocks

- Runtime streaming handlers:
  - `src/services/agent-streaming/agent-stream-handler.ts`
  - `src/services/agent-streaming/agent-team-stream-handler.ts`
- Processor pipeline registration:
  - `src/startup/agent-customization-loader.ts`
- Parser and formatter dependencies from `autobyteus-ts`.

## Pipeline

1. User message enters runtime manager.
2. Input processors apply transformations.
3. Model stream events are parsed.
4. Tool invocation/result processors transform artifacts.
5. Response processors persist/normalize outbound content.
6. Transport layer emits stream chunks and completion events.
