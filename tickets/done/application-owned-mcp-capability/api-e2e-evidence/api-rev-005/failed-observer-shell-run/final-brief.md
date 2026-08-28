Brief context: {"briefId":"brief-ed4d6b1f-46a8-4d32-b4d3-4491ea068433","title":"API REV 005 TOKENLESS PROOF 2026-08-28 11:51 UTC","observedStatus":"researching"}

# API REV 005 TOKENLESS PROOF 2026-08-28 11:51 UTC

## Recommendation summary
Adopt tokenless access only as a controlled presentation and routing model, never as a substitute for authentication or authorization. The runtime should derive brief identity from a validated application binding, constrain publishing to exact workspace-relative paths, and require successful artifact checks before any completion claim. Preserve the exact context marker across research, handoff, and final brief to provide a compact, auditable integrity chain.

## Key evidence
- Tokenless API access can be credible only when the request carries verifiable context through an authenticated runtime, binding, or narrowly scoped session, rather than relying on a caller-supplied token.
- A strong proof separates identity from authorization: the application binding establishes which brief is in scope, while the artifact and handoff rules constrain what each role may publish or claim.
- Exact marker preservation is an effective integrity check because it ties the research file, writer handoff, and final brief to the same brief identity without exposing routing parameters.
- Durable reviewability depends on publishing an existing workspace-relative file, then carrying the complete research body in the team message so the writer does not need cross-workspace access.

## Risks or cautions
The central risk is mistaking tokenless transport for unauthenticated access. Hidden application credentials still require lifecycle, audience, and revocation controls. A blocked observed status may complicate reconciliation after final publication, while replacement, duplicate publication, stale context, or malformed markers can undermine reviewability. Logging must support auditability without exposing sensitive binding metadata.

## Next actions
1. Validate application bindings server-side and reject caller-supplied identity fields.
2. Enforce exact relative paths, atomic creation, and publication-success gates.
3. Add tests for marker and brief-ID mismatches, failed publication, blocked reconciliation, and retries.
4. Record immutable event IDs and timestamps for each successful checkpoint, and verify marker equality byte-for-byte before handoff.
