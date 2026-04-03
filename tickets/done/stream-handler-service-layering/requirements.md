# Requirements

- Ticket: `stream-handler-service-layering`
- Status: `Design-ready`
- Last Updated: `2026-04-01T15:57:46Z`

## User Intent

Refactor the stream-handler architecture so stream handlers preserve service layering. In particular, the user called out that `AgentStreamHandler` appears to hold both `AgentRunService` and `AgentRunManager`, which violates the intended design principle that callers using a service boundary should not also reach through to the underlying manager. The same issue may also exist in the team stream-handler path and should be investigated and corrected if present.

## Requirements

1. Investigate `AgentStreamHandler` and related factories/callers to identify where service and manager responsibilities are mixed.
2. Investigate the equivalent team stream-handler path for the same layering issue.
3. Refactor the design so stream handlers depend on authoritative service APIs rather than bypassing them through managers for the same responsibility.
4. If the current services prove insufficient during implementation, extend the services rather than keeping manager leakage in the handlers.
5. Preserve existing user-visible stream behavior while simplifying the dependency boundary.
6. Add or update validation so the refactor is covered by focused tests or equivalent executable checks.

## Acceptance Criteria

1. `AgentStreamHandler` no longer imports or depends on `AgentRunManager`; it resolves runs through `AgentRunService` and operates on the returned `AgentRun` subject.
2. `AgentTeamStreamHandler` no longer imports or depends on `AgentTeamRunManager`; it resolves runs through `TeamRunService` and operates on the returned `TeamRun` subject.
3. Approval-target resolution in the team stream handler uses service-resolved run data rather than backend-owned team-manager state.
4. No new empty service pass-through layer is introduced unless the implementation proves a real service-boundary gap.
5. The refactor passes focused validation for the touched stream-handler and service paths.

## Requirement Notes

1. Current investigation indicates that no new service API is required for the handler responsibilities in scope.
2. The handlers may call methods on `AgentRun` and `TeamRun` after resolving those subjects through their respective services. That does not violate the service boundary because the run subject is the returned domain owner, not an internal service mechanism.

## Open Questions

1. None at this stage.
