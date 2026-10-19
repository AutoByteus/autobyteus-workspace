# API/E2E Revision Record — mcp-real-server-test-fixtures

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 95.2% |

## Revision Entries

### API-REV-001 — Baseline: real-server MCP integration tests across layouts, cache states and user-kind servers

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md`, round 1 (direct route)
- Triggering finding or case IDs: none (initial)
- Related revision IDs: SR-001, IR-001
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: none by API/E2E (the ticket's own tests were validated)
- Cases: API-R01, API-R02 reused; API-01…API-10 added
- Commands, environment, fixture, or broader-validation delta:
  - a test-owned non-worktree clone;
  - fresh, offline, empty and hidden `uv`;
  - opt-in on pptx-mcp, yt-dlp-mcp and a restored video-audio-mcp (call path);
  - product src mutations;
  - a live Claude matrix cell.

#### Prior Failure Resolution

None.

- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.2%
- New or remaining failure IDs: none
- Recommended owner: Delivery Engineer
- Remaining risks:
  - O-1: `uv` environment location depends on product env delivery (low);
  - O-2: truncated skip reason (cosmetic);
  - O-3: REQ-005 wording;
  - O-4: pre-existing unit-test leftovers.
