# Implementation Plan - SerpApi Unauthorized Fix

- Status: `Draft`
- Scope: `Small`

## Solution Sketch
The fix involves removing the internal caching of the `SearchClient` in `SearchClientFactory`. This ensures that every time `createSearchClient()` is called (which happens in the `Search` tool constructor), the factory re-evaluates the environment variables to determine the current search provider and their respective API keys.

### Architecture Sketch
- **Layer**: Tooling / Search Infrastructure
- **Module**: `autobyteus-ts/src/tools/search/factory.ts`
- **Change**: Modify `createSearchClient()` to remove dependency on `this.client` cache.

### Proposed Changes
| Change ID | Type | File | Description |
| --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-ts/src/tools/search/factory.ts` | Remove `this.client` caching in `createSearchClient()`. |

## Implementation Tasks
| Task ID | Description | Requirement / AC |
| --- | --- | --- |
| T-001 | Create reproduction unit test for configuration drift. | R-001, R-002 |
| T-002 | Remove `this.client` caching in `SearchClientFactory`. | AC-002, AC-003 |
| T-003 | Verify with unit tests. | AC-002, AC-003 |

## Verification Plan
### Unit Tests
- New test in `autobyteus-ts/tests/unit/tools/search/factory_drift.test.ts` (or similar) to verify that `createSearchClient` reflects `process.env` changes.
- Run existing tests: `pnpm exec vitest tests/unit/tools/search/factory.test.ts`

### Integration Tests
- Verify `search_web` tool picks up changes in a simulated environment if possible.
