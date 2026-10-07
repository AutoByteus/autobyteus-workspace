# API/E2E Revision Record — `reactivate-done-task-runs`

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` CRR-001 Pass; round 1 | SR-002, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: reactivation proven in real roots, a real browser, real restarts, real models and a real desktop journey

- Trigger: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/code-review-report.md`, round 1 (Pass)
- Triggering finding or case IDs: N/A. Coverage hints came from the handoff and CRR-001 residual risks: AC-001..015, AC-011, AC-004 restart, AC-015, QR-001/002, AC-012, and the never-run `mixed-task-delegation.e2e.test.ts`.
- Related revision IDs: SR-002, ARCH-REV-002, IR-001, CRR-001
- Why recorded: the first completed API/E2E result.
- Durable coverage changed:
  - added `autobyteus-server-ts/tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts`;
  - updated `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` (BR-008..BR-011);
  - updated `TESTING.md`.
- Cases:
  - E2E-RA-AGENT/TEAM/ORG/RACE/LIVE-CLAUDE;
  - BR-008..BR-011 and BR-ALL;
  - USER-JOURNEY (added at the user's request: an isolated desktop instance with a test agent package and real models, driven through the UI);
  - LIVE-MIXED;
  - repository suites.
- Environment delta: attach-only CDP helper (browser-automation launcher absent); `CODEX_E2E_TOOL_MODEL=gpt-5.6-luna` for the live mixed suite.

#### Prior Failure Resolution

None.

- Canonical artifacts updated:
  - `api-e2e-coverage-investigation.md`;
  - `api-e2e-execution-coverage-report.md`;
  - `api-e2e-test-case-ledger.md`;
  - `api-e2e-evidence/`.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 96%
- New or remaining failure IDs: none. In-run test defects were corrected (ledger events 6, 7, 10, 20); none was a product defect.
- Recommended owner: `/code_reviewer` for proportional test-code review
- Remaining risks:
  - AC-009 and two refusal codes are unit-only end to end;
  - O-1 race-result wording (informational);
  - Team/Org roots were not driven in the desktop journey (they are covered by the probe and server E2E).
