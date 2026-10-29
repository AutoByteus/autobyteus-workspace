# API/E2E Revision Record — mcp-http-auth-headers

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Baseline: server, restart and four-runtime proof of remote MCP credentials

- Triggering role, report path, and round: Implementation Engineer, `tickets/in-progress/mcp-http-auth-headers/implementation-handoff.md`, round 1 (direct low-risk route)
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-001 (requirements and design), IR-001 (implementation); architecture and code review N/A
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - added `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts`;
  - added `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts`;
  - added `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` (gated per runtime).
- Cases added, changed, removed, or rechecked: API-01..08 and API-01M added; API-R01..R05 reuse IMP-02/04/05/06/08/09/10.
- Commands, environment, fixture, or broader-validation delta:
  - built server with restart (`startBuiltTestServer`);
  - in-process studio server with the scripted AGY CLI, LM Studio (native), live Codex and live Claude;
  - broader validation `Required`, executed.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all sections), `api-e2e-execution-coverage-report.md` (all sections), `api-e2e-test-progress.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.3% overall; no category below 90%
- New or remaining failure IDs: none. Two first attempts failed on test setup and were fixed before the passing runs: API-03 (AGY fake case not set) and API-05 (model picker).
- Recommended owner: Delivery Engineer (next stage)
- Remaining risks, blocked evidence, or untested scope:
  - cosmetic rendering of the token hint at narrow widths or in the dark theme;
  - plain-text credential storage (accepted R-001, FU-2);
  - real third-party servers not used (REQ-007).
