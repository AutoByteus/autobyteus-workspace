# Requirements

## Metadata

- Ticket: `default-temp-workspace-run-config`
- Status: `Design-ready`
- Last Updated: `2026-04-03`
- Scope Classification: `Small`

## Goal / Problem Statement

Ensure that when a user opens the run configuration for a new agent run or new team run, the backend-managed temp workspace is available through the normal workspace-listing flow and becomes the default existing workspace shown in the UI.

## In-Scope Use Cases

| Use Case ID | Summary |
| --- | --- |
| UC-001 | New run configuration fetches workspaces and receives `temp_ws_default` even when no previous startup side effect has created it yet |
| UC-002 | Existing frontend selector logic auto-selects the returned temp workspace for new agent and team runs |

## Requirements

| Requirement ID | Description | Acceptance Criteria ID(s) |
| --- | --- | --- |
| R-001 | The backend workspace-listing contract must guarantee the backend-managed temp workspace is present for new run configuration discovery. | AC-001, AC-002 |
| R-002 | The temp workspace must still be discoverable when no user-created workspaces exist. | AC-003 |
| R-003 | The returned temp workspace path must remain backend-selected and backend-owned. | AC-004 |
| R-004 | The regression must be covered by targeted executable validation in the responsible backend/UI path. | AC-005 |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Criterion |
| --- | --- | --- |
| AC-001 | R-001 | Opening run configuration for a new agent run shows the backend-managed temp workspace in the `Existing` workspace area by default. |
| AC-002 | R-001 | Opening run configuration for a new team run shows the backend-managed temp workspace in the `Existing` workspace area by default. |
| AC-003 | R-002 | The default temp workspace is present even when no user-created workspaces exist. |
| AC-004 | R-003 | The UI uses the backend-selected temp workspace path rather than a client-generated placeholder path. |
| AC-005 | R-004 | Targeted regression coverage proves the workspace-listing contract exposes the temp workspace without relying on a prior manual temp-workspace creation step. |

## Constraints / Dependencies

- The temp workspace should remain backend-owned and use the backend-configured path returned from the server.
- The fix should preserve existing behavior for explicitly selected existing workspaces and for creating new workspaces.
- The solution should avoid introducing duplicate client-side temp-workspace creation logic.
- The fix should stay on the existing GraphQL workspace discovery path instead of adding a separate run-config-only API.

## Assumptions

- The current frontend selector behavior is already correct when `temp_ws_default` is present in the fetched workspace store.
- Agent and team run configuration panels share the same workspace discovery contract through common workspace store and selector logic.

## Open Questions / Risks

- Exact desktop timing for the user’s screenshot is not fully reproduced, but the backend resolver contract is still weak and can be strengthened without relying on the timing root cause.
- Standalone backend startup requires a valid `AUTOBYTEUS_SERVER_HOST` URL and `.env` presence for reproduction, but that is separate from this run-config regression.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered By Use Case ID(s) |
| --- | --- |
| R-001 | UC-001, UC-002 |
| R-002 | UC-001 |
| R-003 | UC-001 |
| R-004 | UC-001, UC-002 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Planned Scenario Intent |
| --- | --- |
| AC-001 | Query workspaces through backend contract and confirm temp workspace is discoverable for new run configuration |
| AC-002 | Same backend contract applies to team run configuration because the selector/store path is shared |
| AC-003 | Validate temp workspace is returned when no user-created workspaces exist |
| AC-004 | Assert returned `absolutePath` equals backend-selected temp workspace path |
| AC-005 | Update executable regression coverage so the query itself proves temp-workspace exposure |
