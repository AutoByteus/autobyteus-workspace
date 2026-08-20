# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer; code-review-report.md; round 1 | SR-001, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 97.3% |

## Revision Entries

### API-REV-001 — Initial durable restart and realistic renderer baseline

- Triggering role, report path, and round: code_reviewer; /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-report.md; API/E2E round 1.
- Triggering finding or scenario IDs: No code-review finding. CRR-001 requested evidence for fresh-process standalone/team reopen, compound team/member identity, live-before/during/after GraphQL, and continuous team traffic with maximum one in-flight aggregate request.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, ARCH-REV-001, IR-001, CRR-001; no delivery revision.
- Why this baseline or coverage/execution revision was recorded: This is the first completed API/E2E result for the ticket; no prior result or confidence existed.
- Coverage decisions or durable test paths changed: Added /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts; no durable coverage updated or removed; all inventoried existing coverage remained valid.
- Scenarios added, changed, removed, or rechecked: Added API-TS-006 and temporary BROWSER-TS-001 through BROWSER-TS-007; rechecked API-TS-001 through API-TS-005, current-store integration, GraphQL projections/unit-price/provider semantics, builds, and guards; removed none.
- Commands, environment, fixture, or broader-validation delta: Added built-server stop/start on one isolated migrated SQLite DB; ran Nuxt/Chrome against that backend with deterministic priced standalone and two-team identities; controlled real GraphQL response timing; captured concurrency, DOM, screenshots, logs, and cleanup.

#### Prior Failure Resolution

None. No prior completed API/E2E round existed. Non-authoritative test/probe authoring corrections were resolved before the final result and did not expose a product-source failure.

- Canonical artifacts and sections updated: api-e2e-coverage-investigation.md repository results/confidence/broader decision; api-e2e-execution-coverage-report.md full evidence and latest result; this revision record.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 97.3%.
- New or remaining failure IDs: None.
- Recommended recipient: /code_reviewer for proportional test-code review of the added durable E2E.
- Remaining risks, blocked evidence, or untested scope: Electron-only wrapper and live external provider execution were not tested because they are unchanged/out of scope; no material blocker remains.
