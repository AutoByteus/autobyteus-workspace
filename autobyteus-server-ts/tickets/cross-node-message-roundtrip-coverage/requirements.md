# Cross-Node Message Roundtrip Coverage - Requirements

## Status
Design-ready

## Goal / Problem Statement
Add explicit automated coverage that proves cross-node team-member communication works end-to-end (host -> remote member -> reply back to host), and close gaps where transport signing can silently fail on real serialized payloads.

## Scope Triage
- Scope: Small
- Rationale:
  - Focused change in distributed integration tests plus transport client normalization.
  - No schema/API contract changes.
  - Limited code surface in distributed HTTP transport layer.

## In-Scope Use Cases
1. Host routes an inter-agent message to a remote team member through internal HTTP command transport.
2. Worker receives the remote command and uplinks a reply event to host.
3. Host aggregates the remote reply event with expected run/member metadata.
4. Signed transport works with normalized JSON payloads even when optional fields are undefined on in-memory objects.

## Acceptance Criteria
1. A dedicated distributed integration test asserts command forwarding and reply uplink in one roundtrip flow.
2. Test asserts both worker-side received envelope content and host-side aggregated remote event payload.
3. Signing and verification are performed on the exact normalized payload sent over HTTP in both command and event clients.
4. Distributed integration suite passes with the new test included.

## Constraints / Dependencies
- Keep existing distributed runtime architecture unchanged.
- Avoid fake-only unit behavior; verify real internal HTTP routes.
- Preserve existing passing distributed tests.

## Assumptions
- `TeamRoutingPortAdapter` is the correct host entry for inter-agent cross-node routing.
- `registerWorkerDistributedCommandRoutes` and `registerHostDistributedEventRoutes` represent production transport boundaries.

## Risks / Open Questions
- None blocking after transport normalization fix; risk mainly test flakiness from async timing.
