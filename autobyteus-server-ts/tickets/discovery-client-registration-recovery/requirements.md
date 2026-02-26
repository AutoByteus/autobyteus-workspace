# Requirements - discovery-client-registration-recovery

## Status
Refined

## Goal / Problem Statement
Discovery must converge regardless of startup order. A client node that starts before the registry (or loses registry-side registration) must self-recover without manual restart.

## Scope Triage
- Size: `Small`
- Rationale: targeted behavior in discovery client registration/heartbeat recovery and focused test coverage updates.

## In-Scope Use Cases
- `UC-001` Client starts before registry and eventually joins peer catalog.
- `UC-002` Registered client receives `HEARTBEAT_UNKNOWN_NODE` and immediately re-registers.
- `UC-003` Existing registry-first startup path remains valid.

## Acceptance Criteria
- `AC-001` Discovery client retries registration after startup register failure via periodic loop.
- `AC-002` Heartbeat rejection `HEARTBEAT_UNKNOWN_NODE` triggers re-registration and heartbeat retry in the same cycle.
- `AC-003` Discovery E2E includes client-first startup order and confirms convergence.
- `AC-004` Unit tests cover both startup registration retry and unknown-node heartbeat recovery.

## Constraints / Dependencies
- No backward-compatibility/legacy path additions.
- No discovery REST schema changes.
- Keep recovery logic inside discovery client responsibility boundary.

## Assumptions
- Registry eventually becomes reachable in normal operation.
- Existing maintenance ticker and peer sync cadence remain unchanged.

## Open Questions / Risks
- Risk: repeated transient failures can create noisy retries.
- Mitigation: keep single-flight registration guard (`registrationInFlight`) to avoid duplicate concurrent registrations.
