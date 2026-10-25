# API/E2E Test Progress: autobyteus-273

- Execution coverage report: `api-e2e-execution-coverage-report.md` (this folder)
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-22 21:25 | API-01..API-05 | Completed | Pass | Reused IMP-01/02/04/05/06; diffs since their commits touch only `tickets/` and one unrelated unit test |
| 2026-10-22 21:26 | API-06 | Started | — | server-settings GraphQL e2e with the new Claude case, `env -i`, from `autobyteus-server-ts` |
| 2026-10-22 21:01 | API-06 | Completed | Pass | 12/12 incl. new Claude case; log evidence/API-06-server-settings-graphql-e2e.log. (Times above were mis-stamped; real start about 20:58 local.) |
| 2026-10-22 21:01 | API-10 | Started | — | Harness shake-out on the subscription case first (no credits): live suite -t CPC-E2E-004 |
| 2026-10-22 21:01 | API-10 | Checkpoint | — | Shake-out -t CPC-E2E-004 passed (17,904 1h writes, CLI env has the variable); scratch output /tmp/cpc-shakeout (not evidence). Full suite run follows |
| 2026-10-22 21:01 | API-07..API-10 | Started | — | Full live suite in background (task bw2q3tckk), evidence evidence/API-07-10-claude-cache-ttl-live/; ~7 min (6 min gap) |
| 2026-10-22 21:04 | API-07..API-10 | Completed | Blocked (API-07..09) / Pass (API-10) | Run 1: CPC-001..003 ended in run status error after ~3 s; CPC-004 passed. Log kept as API-07-10-live-suite-run1-api-runs-error.log |
| 2026-10-22 21:04 | API-07 | Checkpoint | — | Cause: CLAUDE_RUNTIME_RESULT_ERROR "Credit balance is too low" (rerun -t CPC-E2E-002, scratch). Core AnthropicLLM with the same vault key: 400 "Your credit balance is too low" (evidence/API-07-blocker-anthropic-key-check.log). Missing dependency: credits on the vault key |
| 2026-10-22 21:04 | API-07..API-10 | Checkpoint | — | Suite updated: provider refusal -> skip with reason (strict: fail); added CPC-005 (subscription, toggle off) and CPC-006 (subscription, promptCacheTtl 5m). Rerun full suite next |
| 2026-10-22 21:06 | API-07..API-10, API-13, API-14 | Completed | API-07/08/09 Blocked (skip: quota_or_billing_blocked); API-10, API-13, API-14 Pass | Run 3 log evidence/API-07-10-claude-cache-ttl-live/API-07-10-live-suite.log + CPC-E2E-004/005/006.json (run 2 misclassified one refusal as rate_limited from an id substring; fixed, superseded by run 3) |
| 2026-10-22 21:06 | API-11 | Started | — | Writing probe script evidence/scripts/claude-cache-ttl-live-probe.mjs (subscription/cli mode, since API billing is blocked) |
| 2026-10-22 21:07 | API-11 | Checkpoint | — | Probe running (build + stack + 3 subscription turns), output evidence/API-11-claude-cache-ttl-live-probe/ |
| 2026-10-22 21:09 | API-11 | Checkpoint | — | Attempt 1 Fail from a probe defect (counted the connect-time idle as the turn end; no calls captured); kept as evidence/API-11-attempt1-probe-harness-defect/. Fixed; rerun with --skip-server-build (dist built in attempt 1) |
| 2026-10-22 21:09 | API-11 | Checkpoint | — | Attempt 2: P-01, P-02 Pass; P-03 Fail from a probe defect (run A's still-alive CLI counted for run B; run B's own CLI had no variable). Kept as evidence/API-11-attempt2-probe-harness-defect/. Fixed to judge only new CLI pids; rerun |
| 2026-10-22 21:12 | API-11 | Checkpoint | — | Attempt 3: P-01..P-04 Pass; P-05 Fail: Run details 'No agent or team usage found' with the default range ending today. Cause: end date 'YYYY-MM-DD' parsed as 00:00 UTC, inclusive lte (statistics-provider/listRunsCreatedInRange) -> today's runs excluded; pre-existing, FU-005. Kept as evidence/API-11-attempt3-run-details-default-range/. Probe now ends the range tomorrow; rerun |
| 2026-10-22 21:14 | API-11 | Completed | Pass | Attempt 4: P-01..P-05 Pass, browserErrors [], cleanup removed/terminated, spawnedCliLeft 0; evidence/API-11-claude-cache-ttl-live-probe/ |
| 2026-10-22 21:14 | API-12 | Completed | Pass | Docs diff reviewed against REQ-005 |
| 2026-10-22 21:14 | API-15 | Completed | Pass | tsc on the two changed test files: 0 errors in them |
| 2026-10-25 05:53 | API-07 | Checkpoint | — | Recheck after 3 days: vault key still refused, 400 'Your credit balance is too low' (appended to evidence/API-07-blocker-anthropic-key-check.log). Writing report; result Blocked |
| 2026-10-25 05:55 | — | Checkpoint | — | Report and revision record written (result Blocked, 86%); committing |
| 2026-10-25 11:41 | API-07 | Checkpoint | — | User decision 2026-10-25: let it pass, check API billing after the next beta. API-REV-002: AC-001's API-billed part is a user-only check; result Pass 95%. Committing and handing off to delivery |
