# API/E2E Revision Record — claude-sdk-canonical-model-ids

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / `implementation-handoff.md` / round 1 | SR-003, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial baseline: canonical Claude model IDs validated live

- Triggering role, report path, and round: `implementation_engineer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/implementation-handoff.md`, round 1
- Triggering finding or scenario IDs: N/A (initial)
- Related revision IDs: SR-003 (solution), IR-001 (implementation); architecture/code review N/A (direct Medium/Low route)
- Why recorded: first completed API/E2E validation result
- Coverage decisions / durable test paths changed: updated `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts` (API-S01). It had a stale hard-coded `opus` alias requirement, and IR-001's canonical assertion was too weak. Now: live Opus row selection, canonical ID ≠ alias for `default`, `selectionPresentation` fold invariants via GraphQL.
- Scenarios: API-S01; E2E-01..08 (browser + live server + real Claude CLI)
- Commands / environment: see the coverage investigation's execution table and the report's "Broader Validation Decision And Execution". The temp server was isolated with `env -i` + explicit `DATABASE_URL` after the first instance was found using the user's live DB (one accepted token-usage row, id 66933).

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none (pre-existing unrelated failures identical on base: 6 server, 2 web, 1 Gemini env)
- Recommended recipient: `/delivery_engineer`
- Remaining risks / untested scope: application launch-profile picker not browser-exercised (same chain, component-tested); §4c fallback unit-only; dark mode/narrow viewport not inspected; the durable test update is uncommitted
