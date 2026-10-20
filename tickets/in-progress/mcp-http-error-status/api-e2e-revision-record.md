# API/E2E Revision Record — mcp-http-error-status

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: status text proven on preview, discover and a native agent run

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001, code `bb1d3cd28c`), round 1
- Triggering finding or case IDs: N/A (initial validation)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, IR-001; no architecture or code review (direct Small / Low route)
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: the implementation-authored `mcp-http-error-status.e2e.test.ts` was reviewed and extended (empty-body 404, refused, stdio exit, token/output scan); the redirect e2e now asserts `HTTP 307`; the auth MCP helper can revoke its credential; the runtime agent tool-call e2e gained a native revoked-token case
- Cases added, changed, removed, or rechecked: API-00…API-11 (API-01/02/03/10 reused from IMP-02/04/05/08)
- Commands, environment, fixture, or broader-validation delta: clean-env built-server e2e; gated scripted AGY and native LM Studio runs; full `autobyteus-ts` suite, server unit and integration suites

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `follow-ups.md` (FU-001)
- Prior result and confidence (`N/A` for `API-REV-001`): N/A
- Current result and confidence: Pass, 95.4%
- New or remaining failure IDs: None. Follow-up FU-001: the Agent Tools MCP endpoint answers every configured-MCP tool error with `Internal error`. It predates this change and lies outside it.
- Recommended owner: delivery engineer (next stage)
- Remaining risks, blocked evidence, or untested scope: the HTTP/2 empty reason phrase is covered by reading only; Codex/Claude live runs were not run (same Agent Tools MCP path as AGY, see FU-001)
