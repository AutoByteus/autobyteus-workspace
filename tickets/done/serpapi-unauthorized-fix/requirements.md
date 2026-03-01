# Requirements - SerpApi Unauthorized Fix

- Status: `Design-ready`
- Goal: Fix the "Unauthorized" error when using `search_web` tool after configuring the SerpApi key in the frontend.
- Triage: `Small` (Localized fix in `SearchClientFactory`)

## Goal / Problem Statement
The user reports that even after configuring the SerpApi API key in the frontend settings, the `search_web` tool fails with a 403 Unauthorized error. Investigation reveals that the `SearchClientFactory` is a singleton that caches the `SearchClient` (and thus the `SearchStrategy` with its API key) and does not re-evaluate `process.env` when it changes.

## In-Scope Use Cases
- `UC-1`: User configures SerpApi key in the web settings.
- `UC-2`: Agent executes `search_web` tool.
- `UC-3`: Search tool uses the user-configured API key to make requests to SerpApi.

## Acceptance Criteria
- `AC-001`: The user-set SerpApi API key must be correctly saved/persisted (already handled by `AppConfig.set` updating `.env` and `process.env`).
- `AC-002`: When `search_web` is called, the backend must use the latest configured SerpApi key, even if it was changed after the server started.
- `AC-003`: Changes to the default search provider (e.g., switching from Serper to SerpApi) must take effect immediately for new tool executions without requiring a server restart.
- `AC-004`: Successful search results are returned when a valid key is provided.

## Constraints / Dependencies
- Must work with the existing singleton pattern in `SearchClientFactory` but fix the over-caching.
- Must not expose the API key in logs.

## Assumptions
- The frontend correctly sends the API key to the backend via GraphQL.
- The backend correctly updates `process.env` via `AppConfig.set`.

## Requirement Coverage Map
| Requirement ID | Use Case | Description | Expected Outcome |
| --- | --- | --- | --- |
| R-001 | UC-1, UC-3 | Key update propagation | Tool uses the *new* key immediately after it is set in settings. |
| R-002 | UC-2, UC-3 | Provider update propagation | Tool uses the *new* provider immediately after it is changed in settings. |

## Acceptance Criteria Coverage Map
| AC ID | Requirement ID | Verification Scenario |
| --- | --- | --- |
| AC-002 | R-001 | Set key A, run tool (fail/success), set key B, run tool (verifies key B is sent). |
| AC-003 | R-002 | Set provider X, run tool, set provider Y, run tool (verifies provider Y is used). |
