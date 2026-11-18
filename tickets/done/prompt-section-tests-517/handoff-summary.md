# Handoff Summary

## Summary Meta

- Ticket: `prompt-section-tests-517` (Project Task `autobyteus-517`, item 1; delegated by `/project_task_manager`)
- Date: `2026-11-18`
- Classification: `task_size: Small`, `architectural_risk: Low`; route: direct low-risk (design SR-001; implementation IR-001; API/E2E `API-REV-001` Pass, final confidence 95.8%; independent architecture review, code review and test-code review `Not Applicable`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/prompt-section-tests-517`, base `origin/personal` @ `2e9ac1e65b` at bootstrap and at delivery (no new base commits; `Already current`). No product code changed.

## Delivery Summary

- Delivered scope (tests and `TESTING.md` only):
  - `configured-skill-on-demand-loading.e2e.test.ts` expects `## Long-Running Commands` between `## File And Directory Practice` and `## Skills` (the failure that was waived for beta.9 and beta.10).
  - Three more suites that read a run's composed prompt were stale since autobyteus-483 and now match the product: `agent-semantic-memory.e2e.test.ts` and `agent-semantic-memory-live.e2e.test.ts` (implementation: they cut the prompt before the Long-Running Commands section, and check that nothing follows it), and `collaboration-prompt-wording.e2e.test.ts` (API/E2E: the collaboration part now ends at Working Environment or Long-Running Commands, whichever comes first).
  - `TESTING.md` "Choosing the path" has a row for a change to a runtime's system prompt: run the prompt unit tests plus every test in any layer, gated suites included, that reads a run's composed prompt (search terms named), each file found, because a test that checks how a prompt ends or cuts it at a heading goes stale too. Committed on its own as `docs(testing): …` (`914cb5da97`).
- Docs synced (`docs-sync-report.md`): `TESTING.md` (by its owner, confirmed by delivery). `DESIGN.md`, `RELEASE.md` and the prompt module doc need no change.
- Durable coverage: the four corrected suites. No new meta-test, by decision DEC-001: the TESTING.md row is the chosen check.

## Verification Summary

- Verified from evidence by delivery; no user check is needed. AC-001 and AC-002 (critical) are directly proven, AC-003 (the row) is present, short and global; the critical evidence files were opened (`release-deployment-report.md`, Verification).
- Final confidence 95.8% (target 95% met), no applicable category below 95%.
- Key evidence:
  - `evidence/IMP-00-repro-before.log` (`configured-skill-on-demand-loading.e2e.test.ts:291:70`, 1 failed of 4) and `evidence/API-01-prompt-reading-suites/vitest.log` (the same suite `✓ (4 tests)`).
  - Same log: 16 files that read a run's prompt without a provider; `collaboration-prompt-wording` CPW-P1..P3 failed on `+ ## Long-Running Commands` before the fix (`collaboration-prompt-wording-before-fix-rerun.log`) and `Tests 14 passed (14)` after (`collaboration-prompt-wording-after-fix.log`).
  - `evidence/API-02-semantic-memory-live-codex/vitest.log`: the live Codex cases `SML-WRITE`, `SML-CODEX-TEAM`, `SML-CODEX-OFF` pass 3/3; the recorded `baseInstructions` show Semantic Memory followed by `## Long-Running Commands`.
  - `evidence/IMP-04-prompt-unit-and-parity.log`: prompt unit and parity tests 164/164. `evidence/API-04-typechecks.log`: both typechecks at baseline after the test edit.
- Integrated-state check: not needed; the ticket branch is not behind `origin/personal`.
- Secret Gate and artifact hygiene: recorded in `release-deployment-report.md`.

## Residual Risks For The User

- Two timing failures under machine load (load average about 50) showed in the broad run and are outside this ticket (`FU-001`): `agent-package-definitions-live-refresh` DCF-E2E-002 (a file event reached GraphQL in 9992 ms against a 5000 ms budget) and `grok-build-runtime-replay` `afterAll` (10 s hook timeout; its 6 tests passed). They do not read the prompt.
- The TESTING.md row is a rule, not an automatic check (DEC-001): a later change that does not follow it can again leave a suite stale. The row now names the search and the reason.
- Live suites for other runtimes that read the prompt only through `toContain` were not run; by reading, an added last section cannot stale them.

## Follow-ups

- `follow-ups.md`: `FU-001` (two timing budgets under load; added by API/E2E). Delivery added none.

## Release

- No release: the founder has not asked for one, and RELEASE.md's default is no release. A release is available. No `release-notes.md`: the change has no user-visible effect (tests and a testing guideline only).
