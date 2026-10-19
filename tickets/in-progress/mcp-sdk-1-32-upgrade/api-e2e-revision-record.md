# API/E2E Revision Record — mcp-sdk-1-32-upgrade

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 95.6% |

## Revision Entries

### API-REV-001 — Baseline: SDK 1.32.1 through the product, live runtimes, Docker and packaged Electron

- Triggering role, report path, and round: Implementation Engineer, `tickets/in-progress/mcp-sdk-1-32-upgrade/implementation-handoff.md`, round 1 (direct route)
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-001, IR-001; architecture and code review N/A
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - added `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts`;
  - updated `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` (optional `redirects`, `path` in observations).
- Cases added, changed, removed, or rechecked:
  - API-01..09 and API-01M added;
  - API-R01..R06 reuse IMP-00..IMP-09 (source unchanged since `4923d179c1`);
  - the 179 runtime file ran on native, Codex and Claude (API-03/04/06).
- Commands, environment, fixture, or broader-validation delta:
  - built server;
  - full `pnpm test:e2e`;
  - Docker image built from the worktree and a test-owned container;
  - packaged Electron isolated instance;
  - live LM Studio, Codex and Claude.

#### Prior Failure Resolution

None. One first attempt (API-01) failed on a test expectation and was fixed before the passing run.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.6% overall; no category below 90%
- New or remaining failure IDs: none
- Recommended owner: Delivery Engineer (next stage)
- Remaining risks, blocked evidence, or untested scope:
  - `https` upgrade redirect not exercised locally;
  - 301/302-on-POST not followed (SDK contract; no working path lost);
  - GraphQL bulk import reports only counts (existing contract; follow-up candidate);
  - external-toy integration tests out of scope (implementation follow-up 3).
