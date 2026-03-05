# Implementation Plan

## Ticket

`codex-runtime-image-input-support`

## Scope

`Small`

## Design Basis (Small-Scope Architecture Sketch)

- Keep existing runtime layering unchanged:
  - GraphQL input conversion -> runtime ingress -> runtime adapter -> codex runtime service -> codex user-input mapper.
- Implement URI normalization only inside:
  - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts`
- Add unit tests under codex runtime unit test scope.
- Add one live Codex E2E scenario under runtime GraphQL E2E suite.

## Target Changes

| change_id | type | file | summary |
| --- | --- | --- | --- |
| C-001 | Modify | `src/runtime-execution/codex-app-server/codex-user-input-mapper.ts` | Normalize image context URIs (`/rest/files/*`, `http(s)://.../rest/files/*`, `file://`, `data:image`) into correct Codex input item type (`localImage` vs `image`) with traversal guard. |
| C-002 | Add | `tests/unit/runtime-execution/codex-app-server/codex-user-input-mapper.test.ts` | Verify codex mapper behavior for local media URLs, remote URLs, data URLs, and traversal safety. |
| C-003 | Modify | `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts` | Add live `RUN_CODEX_E2E=1` scenario that creates real PNG fixtures, sends one via `/rest/files/...` URL and one via absolute filesystem path in GraphQL `contextFiles`, and verifies Codex thread history contains both image inputs. |

## Task Breakdown

- `T-001` Implement codex image URI normalization helpers.
- `T-002` Wire normalization into context file mapping loop.
- `T-003` Add/execute unit tests for mapper behavior.
- `T-004` Run targeted codex runtime unit test suite.
- `T-005` Implement live Codex E2E image-input test scenario.
- `T-006` Run live Codex E2E test command with `RUN_CODEX_E2E=1`.

## Requirement Traceability

- `R-001` -> `C-001`, `T-001`, `T-002`, `AV-001`
- `R-002` -> `C-001`, `T-001`, `T-002`, `AV-002`
- `R-003` -> `C-001`, `T-002`, `AV-003`
- `R-004` -> `C-001`, `T-001`, `AV-004`
- `R-005` -> `C-002`, `T-003`, `T-004`, `AV-005`
- `R-006` -> `C-003`, `T-005`, `T-006`, `AV-006`

## Verification Plan

- Unit tests for mapper:
  - local server media URL -> `localImage` absolute path.
  - relative `/rest/files/...` -> `localImage` absolute path.
  - remote HTTPS URL -> `image` URL.
  - data URL -> `image` URL.
  - path traversal payload rejected for local conversion.
- Targeted vitest execution for new test file and adjacent codex runtime tests.
- Live E2E execution:
  - `RUN_CODEX_E2E=1` + targeted codex runtime GraphQL E2E test filter for image-input scenario.

## Modernization/Policy Checks

- No backward-compat wrappers.
- No new runtime coupling across layers.
- No legacy branch retention required for this change.
