# Investigation Notes - SerpApi Unauthorized Fix

## Problem Statement
The user reports a 403 Unauthorized error when using the `search_web` tool, even after configuring the SerpApi API key in the frontend settings.

## Key Findings
- **Stale Configuration Cache**: `SearchClientFactory` (in `autobyteus-ts/src/tools/search/factory.ts`) is a singleton that caches its `SearchClient` instance in a private field `this.client`.
- **Initialization Timing**: When `createSearchClient()` is called for the first time, it reads `process.env` to determine the provider and API keys. It then creates a `SearchClient` with the corresponding `SearchStrategy`.
- **Constructor-bound Keys**: `SerpApiSearchStrategy` (and other strategies) read their API keys from `process.env` only once in their constructor.
- **Server Update Behavior**: When a user updates the search configuration via the frontend (GraphQL mutation `setSearchConfig`), the backend calls `AppConfig.set`, which updates `process.env` and the `.env` file.
- **The Gap**: Because `SearchClientFactory` caches the `SearchClient` instance, subsequent calls to `createSearchClient()` (from new `Search` tool instances) return the same cached client, which still holds the old strategy with the old/missing API key. The new `process.env` values are never re-evaluated.

## Design Re-evaluation (Stage 1 Re-entry)
- **Question**: Should the client be instantiated on every tool call, or per agent run? The user hypothesized that caching per agent run is the correct boundary.
- **Investigation Result**: 
  - `SearchTool` holds the `SearchClient` as a private property (`this.searchClient`).
  - `SearchTool` is instantiated by `ToolRegistry` exactly **once per Agent instance (i.e. once per agent run)**.
  - In `SearchTool`'s constructor, it calls `SearchClientFactory.createSearchClient()`.
  - Therefore, by removing the cache in the *Singleton Factory*, the `SearchClient` is still effectively **cached per agent run** because it lives in the `SearchTool` instance, not per individual `.execute()` call.
  - This perfectly matches the architecture of `ImageClientFactory`, `AudioClientFactory`, and `LLMFactory`, none of which cache their clients/models. They all return a new instance upon request, leaving the consuming component (the Agent or the Tool instance) to maintain the lifecycle state.
  - *Note*: During the code review, a partial rewrite left `this.client = ...` at the bottom of the factory while removing the property declaration, causing a TypeScript error. This was identified and cleanly fixed.

## Scope Triage
- **Size**: `Small`
- **Impact**: Localized to `SearchClientFactory`.
- **Files touched**: `autobyteus-ts/src/tools/search/factory.ts`.

## Root Cause
The singleton `SearchClientFactory` over-caches the `SearchClient` globally across all agent runs, preventing it from reflecting changes in the environment configuration when new agents are launched.

## Proposed Fix
Remove the `this.client` caching in `SearchClientFactory.createSearchClient()`. This allows each new `SearchTool` (created per agent run) to get a fresh `SearchClient` that captures the latest `process.env`, while maintaining a stable client instance *during* the agent's run via `this.searchClient`.
