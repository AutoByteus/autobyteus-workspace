# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-004, IR-001 | N/A | Pass / 95% |
| API-REV-002 | Delivery Engineer, release smoke failure before tagging v1.5.13-beta.8, round 2 | SR-004, IR-001, the delivery round | Pass / 95% (round-1 regression score not earned) | Pass / 95% |

## Revision Entries

### API-REV-001 — `search_memory` for every run, proven on real runtimes

- Triggering role, report path, and round: Implementation Engineer, `tickets/in-progress/search-memory-default-tool-496/implementation-handoff.md`, round 1 (direct low-risk route)
- Triggering finding or case IDs: none (baseline)
- Related revision IDs: SR-004 (solution), IR-001 (implementation)
- Why this baseline was recorded: the first completed validation of the platform-given `search_memory`
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts`, gated with `SEARCH_MEMORY_LIVE_E2E=<runtime>`. It has scripted-AGY cases that cost nothing and paid cases for native, Claude, Codex and Grok.
- Cases added, changed, removed, or rechecked: API-01…03 reused (IMP-02, IMP-05, IMP-01); API-04…09 run; API-05N negative control added; API-10 Not Tested (Grok quota)
- Commands, environment, fixture, or broader-validation delta: live API runs on an in-process Studio server with fresh data roots, the test vault, host CLI logins, a throwaway `CODEX_HOME`, and the deterministic embedding stand-in

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: Grok live (account quota) and DeepSeek Harness live (`dsh` not installed) were not run. Their ACP backend reaches the same shared rule (unit-proven) and the same runtime-independent Agent Tools MCP endpoint.

### API-REV-002 — stale exact tool lists outside the unit suite, caught by the release smoke

- Triggering role, report path, and round: Delivery Engineer, release smoke (`python3 scripts/release_smoke.py` on `a8ac226e65`, summary `/tmp/release-1.5.13-beta.8/release-smoke.log`), round 2, in the release worktree `release-v1.5.13-beta.8`
- Triggering finding or case IDs: `other keeps ordinary native tools and configured skill reads explicit in the same active run FAIL`; API-11 to API-18
- Related revision IDs: SR-004, IR-001, the delivery round of v1.5.13-beta.8
- Why this revision was recorded: three tests outside the unit suite still asserted the native or Agent Tools tool lists from before `search_memory` was platform-given. Round 1 ran neither the ungated server E2E nor the whole `test:integration`, so it did not see them.
- Coverage decisions or durable test paths changed (`6aa25d9191`):
  - `configured-skill-on-demand-loading.e2e.test.ts`: the native run's tool instances;
  - `project-task-boundaries.e2e.test.ts`: `enabledTools` and `tools/list`; its `beforeAll` failed, which skipped all 18 cases;
  - `autobyteus-agent-run-backend-factory.integration.test.ts`: passed only because its registry lacked the memory tools; it now registers them as a server start does.
  - Each spreads `PLATFORM_GIVEN_TOOL_NAMES`.
- Prevention (`8af6082a52`): `TESTING.md`, Choosing the path: a change to the tools a run gets runs the whole unit, `test:integration` and server E2E suites, plus a search of the gated suites, and tool-list assertions spread `PLATFORM_GIVEN_TOOL_NAMES`. No release-guide step: the failure was reproducible locally (API-11).
- Cases added, changed, removed, or rechecked: API-11 to API-18 added; API-01 to API-10 unchanged (the code under test is unchanged).
- Commands, environment, fixture, or broader-validation delta: the whole `test:integration`, the whole `pnpm test:e2e`, a gated-suite search plus one gated run, both typechecks, and two release smoke runs. The machine was heavily loaded by other sessions throughout.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| Release smoke `other` failure, `configured-skill-on-demand-loading.e2e` (delivery, `a8ac226e65`) | Stale test expectation (this ticket's work; the behavior is approved REQ-001) | Fixed in `6aa25d9191` | API-11 (reproduced), API-13, API-17, API-18 |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (Round, Environments ENV-7, Cases API-11 to API-18, AC proof, scorecard, Durable Coverage, Latest Result), `api-e2e-test-progress.md`, `follow-ups.md` (FU-006), `evidence/API-11` to `API-18`
- Prior result and confidence: Pass, 95% (its regression-coverage score was not earned)
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none caused by this ticket. Release smoke `other` AGY timing failures and integration/E2E timing failures happen under machine load; they pass alone and run no code changed since v1.5.13-beta.7.
- Recommended owner: Delivery Engineer (resume the release; rerun the smoke when the machine is quieter if a clean verdict is wanted)
- Remaining risks, blocked evidence, or untested scope: Grok live (waived); FU-006 (latent hook timeout in provider-secret-lifecycle)
