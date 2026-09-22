# API/E2E Revision Record

The current `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` are authoritative. This record preserves concise completed-round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `implementation_engineer`; `implementation-handoff.md`; round 1 | `SR-001`, `SR-002`, `IR-001`; architecture/code review N/A | `N/A` | `Pass` / `97%` |

## Revision Entries

### API-REV-001 — Exact Astra/Fable catalog-to-summary baseline

- Triggering role, report path, and round: `implementation_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/implementation-handoff.md`; initial API/E2E round.
- Triggering finding or scenario IDs: `BEH-001`–`BEH-004`; `SCN-001`–`SCN-004`; no upstream failure finding.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `SR-002`, `IR-001`; architecture review `N/A`; code review `N/A`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: First completed independent validation result for the direct low-risk implementation; establishes explicit result/confidence rather than inferring from missing prior records.
- Coverage decisions or durable test paths changed: Added `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/autobyteus-server-ts/tests/e2e/token-usage/astra-fable-token-usage-accounting-graphql.e2e.test.ts`; no test updated or removed.
- Scenarios added, changed, removed, or rechecked: Added durable `API-SCN-001` Astra catalog-to-summary, `API-SCN-002` Fable cache catalog-to-summary, and `API-SCN-003` fail-closed near-match proof; rechecked shared catalog/request coverage, price policy/tier math, static model-list, GPT-5.6 preservation, token-usage E2E, builds, docs, and known baselines.
- Commands, environment, fixture, or broader-validation delta: Used credential-free Vitest and production builds on macOS/Node 22 with test-owned SQLite/Prisma; built required workspace contracts; no browser, desktop, live provider, API key, or paid inference. Broader validation decision `Not Required` after direct repository E2E.

#### Prior Failure Resolution

None — `API-REV-001` has no prior API/E2E result.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` execution results/scorecard/decision; `api-e2e-test-case-ledger.md`; `api-e2e-execution-coverage-report.md`; this revision record; `api-e2e-evidence/API-REV-001/`.
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass` / `97%`
- New or remaining failure IDs: None. Unrelated repository baselines: stale Gemini 3.5 factory expectation; server TS6059 typecheck configuration; parallel shared-database interference in full token-usage E2E directory. All target checks and production builds pass.
- Recommended recipient: `/software_engineering_team/delivery_engineer`; proportional test-code review `Not Required — direct low-risk route`.
- Remaining risks, blocked evidence, or untested scope: Provider facts may change after 2026-09-22; account-specific runtime visibility and non-Standard pricing variants remain external/out of scope; paid target inference remains prohibited and was not run.
