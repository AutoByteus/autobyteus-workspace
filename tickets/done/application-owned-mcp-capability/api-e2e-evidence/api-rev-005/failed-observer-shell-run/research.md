Brief context: {"briefId":"brief-ed4d6b1f-46a8-4d32-b4d3-4491ea068433","title":"API REV 005 TOKENLESS PROOF 2026-08-28 11:51 UTC","observedStatus":"blocked"}
API REV 005 TOKENLESS PROOF 2026-08-28 11:51 UTC

Key findings

- Tokenless API access can be credible only when the request carries verifiable context through an authenticated runtime, binding, or narrowly scoped session, rather than relying on a caller-supplied token.
- A strong proof separates identity from authorization: the application binding establishes which brief is in scope, while the artifact and handoff rules constrain what each role may publish or claim.
- Exact marker preservation is an effective integrity check because it ties the research file, writer handoff, and final brief to the same brief identity without exposing routing parameters.
- Durable reviewability depends on publishing an existing workspace-relative file, then carrying the complete research body in the team message so the writer does not need cross-workspace access.

Risks or open questions

The principal risk is confusing tokenless transport with unauthenticated access. A system may omit explicit tokens from prompts while still depending on hidden application credentials; those credentials need lifecycle, audience, and revocation controls. Another open question is how the backend reconciles a published final brief with its review state, especially when observed status is already blocked. Artifact replacement, duplicate publication, or stale context could also create ambiguity unless the marker is checked byte-for-byte. Finally, logs should avoid leaking binding metadata while retaining enough evidence to audit who created and published each artifact.

Recommendations or next steps

Treat tokenlessness as a presentation and routing property, not as a security guarantee. Validate the application binding server-side, derive brief identity there, and reject caller-provided identity fields. Enforce exact relative paths, atomic file creation, and publication checks before handoff. Require the writer to quote a complete research bullet verbatim, preserving provenance while keeping the message self-contained. Add automated tests for malformed markers, mismatched brief IDs, failed publication, blocked reconciliation, and retry behavior; record immutable event IDs and timestamps for each successful checkpoint.
