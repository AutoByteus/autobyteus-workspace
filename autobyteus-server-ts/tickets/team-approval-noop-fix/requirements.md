# Requirements - team-approval-noop-fix

## Goal / Problem
Fix team-member tool approval no-op behavior where clicking `Approve` in a team conversation appears to do nothing, while single-agent approval works.

## Scope Triage
- Size: `Small`
- Rationale: targeted command-path hardening in team approval ingress/streaming (no schema/storage changes), plus focused tests.

## In-Scope Use Cases
1. Team approval succeeds when websocket payload contains a valid approval token.
2. Team approval succeeds when token is missing but invocation + target are resolvable from active run.
3. Team approval succeeds when token versions are serialized as strings.
4. Team approval does not fail due to frontend route-key vs token-target mismatch.

## Acceptance Criteria
1. `APPROVE_TOOL` team command dispatches to orchestrator in all in-scope use cases above.
2. Backend no longer silently no-ops on missing token when active-run fallback is possible.
3. Frontend team approval payload uses canonical token target member name when available.
4. Integration/unit tests cover fallback and canonical-target behavior.

## Constraints / Dependencies
- Keep current team approval token model and concurrency policy contract.
- Keep frontend/backed protocol (`APPROVE_TOOL`/`DENY_TOOL`) unchanged.

## Assumptions
- Active team run exists when user approves an in-flight tool approval request.
- Invocation and target member identity remain stable during approval interaction.

## Open Questions / Risks
- Fallback token issuance for missing token uses invocation version default semantics; acceptable for this fix but should be monitored.
