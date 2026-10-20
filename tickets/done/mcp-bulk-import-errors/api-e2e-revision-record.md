# API/E2E Revision Record — mcp-bulk-import-errors

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 95.9% |

## Revision Entries

### API-REV-001 — Baseline: bulk import reasons and own-format import, through the packaged app

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md`, round 1 (direct route)
- Related revision IDs: SR-001, IR-001
- Coverage decisions or durable test paths changed: none by API/E2E
- Cases:
  - API-R01 reused;
  - API-01 GraphQL e2e (3 files);
  - API-02 full server e2e;
  - API-03 full web suite;
  - API-04/05 two-install desktop journey (cross-install `mcps.json` import, mixed, none, whole-input, restart);
  - API-06 safety.

#### Prior Failure Resolution

None.

- Current result and confidence: Pass, 95.9%
- New or remaining failure IDs: none for this ticket
- Recommended owner: Delivery Engineer
- Remaining risks:
  - O-1: two e2e files fail on `origin/personal` because of autobyteus-197's required `source` field (follow-up);
  - O-2: stray files from other tests and the build;
  - O-3: the `generated/graphql.ts` drift.
