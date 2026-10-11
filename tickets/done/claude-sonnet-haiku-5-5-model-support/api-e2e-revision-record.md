# API/E2E Revision Record

- Package: `claude-sonnet-haiku-5-5-model-support`

## Revision Index

| ID | Implementation | Result | Confidence |
| --- | --- | --- | --- |
| API-REV-001 | IR-001 `22c3c89fa` | Pass | 95% |
| API-REV-002 | IR-001 `22c3c89fa` (+ test commit `30541612c`) | Pass | 96% |
| API-REV-003 | IR-002 `b38d0a909` on `228cd9b5e` (+ header commit `31132efcf`) | Pass | 95% |

## Revision Entries

### API-REV-003 — SR-007 rework validation after the rebase

- Trigger: implementation handoff IR-002 (SR-007, from independent code review CRR-001). Direct low-risk route, `Small` / `Low`.
- Scope:
  - D-SR7-1..3: policy union, model-named errors, explicit Sonnet 4.6 row, removed unsupported-ID tests and docs.
  - D-SR7-4: rebase and `TESTING.md`.
  - D-SR7-5 (owned here): both live-test headers.
- Durable coverage: commit `31132efcf` adds the exact run command to both live-suite headers. It also corrects the Claude 5.5 suite's size and cost to about 22 calls, one ~240K-gross Haiku call costing about $0.24 (CR-006, CR-001 command move). The IR-002 unit-test changes were reviewed and accepted.
- Result: `Pass`, confidence 95%.
  - Repository checks: `tests/unit/llm` 524/524; `tsc` clean; server token-usage 111/111; both live suites skip cleanly with gates unset; existing Anthropic tests unchanged; merge clean.
  - Live re-run `Not Required`: no payload change, and no origin change touches DS-001..DS-003.
  - Test review: `Not Required — direct low-risk route`.
- Rerun delta vs API-REV-002:
  - Confidence goes from 96% to 95%. The user-surface score drops from 100 to 95 because the desktop proof was taken on the pre-rebase build. Origin's web changes are unrelated to the picker, so I did not re-run the desktop journeys.

#### Prior Failure Resolution

No open failures. CRR-001's API/E2E items (CR-006 and the CR-001 command move) are resolved in `31132efcf`.

### API-REV-001 — Baseline live validation of Sonnet 5.5 / Haiku 5.5 support

- Trigger: implementation handoff IR-001, direct low-risk route (Medium/Low).
- Scope: catalog, per-model request shaping through the real server, signed-thinking replay, Token Meter tiers, rendered picker and Thinking menu, Opus 5.5 regression.
- Durable coverage: added `autobyteus-claude-5-5-live.e2e.test.ts`; updated the prompt-caching live E2E and TESTING.md (commit `30541612c`).
- Result: `Pass`. Broader validation `Required` and executed. Test review `Not Required — direct low-risk route`.
- Artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`.

#### Prior Failure Resolution

N/A (first round). Within the round, the browser probe's first attempt failed on its own assertion and was corrected (not a product issue).

### API-REV-002 — Real-user desktop validation on an isolated packaged instance

- Trigger: user request ("start the test electron instance do tests like a real user").
- Scope: C55-DT-001..006 on a packaged worktree build driven through the UI. The journeys covered picking each model, Thinking Off/On with display preselection, tool turns, a follow-up turn, Token Statistics, and app restart → reopen → continue.
- Durable coverage: no change (journeys executed through the isolated-app + browser-automation workflow; evidence in `api-e2e-evidence/desktop/`).
- Result: `Pass`; confidence 96%. No prior failures to resolve.
