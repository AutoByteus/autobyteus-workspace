# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`; `code-review-report.md`; API/E2E round 1 | SR-001, SR-002, ARCH-REV-001, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 97% |

## Revision Entries

### API-REV-001 — Live stale-link reconciliation and activation-surface baseline

- Triggering role/report/round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/code-review-report.md`; round 1.
- Triggering scenarios: API-SC-001 through API-SC-009.
- Related upstream revision IDs: SR-001, SR-002, ARCH-REV-001, ARCH-REV-002, IR-001, CRR-001.
- Why recorded: first completed API/E2E result for implementation commit `902bd4d2e`.
- Coverage decisions/durable paths changed: added the real Codex discoverable-name plus broken-canonical-link scenario and updated the current live fixture contract in `codex-thread-bootstrapper.integration.test.ts`; updated the current AgentRunService fixture contract and generic-error/private-cause assertions in `agent-websocket.integration.test.ts`.
- Scenarios rechecked: full state/lifecycle matrix, unresolved missing/broken omission, live collisions, final release/new acquire, occurrence rollback and exact error identity, Codex/Claude profiles, Luna pass-through, manager diagnostics, package-to-Codex projection, WebSocket failure envelope, production TypeScript.
- Execution delta: enabled `RUN_CODEX_E2E=1` with codex-cli 0.149.0, executed all three live app-server cases, and ran an isolated temporary Claude profile probe.

#### Prior Failure Resolution

None — this is the initial API/E2E baseline. Intermediate local fixture failures discovered and corrected within the same round are preserved in raw evidence and the execution report.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; `evidence/api-e2e/`.
- Prior result/confidence: N/A.
- Current result/confidence: Pass / 97% (`96.6%` calculated).
- New or remaining failure IDs: none for ticket scope. Non-blocking unrelated broader-suite fixture failures remain documented.
- Recommended recipient: `/code_reviewer` for proportional durable-test review.
- Remaining risks: no post-fix packaged Electron rerun; no live Claude inference turn because reconciliation is pre-session; delivery-owned remote-base refresh; unrelated broader test-fixture debt.
