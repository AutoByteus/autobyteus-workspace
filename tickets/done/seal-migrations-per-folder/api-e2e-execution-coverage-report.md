# API/E2E Execution Coverage Report

Ticket `seal-migrations-per-folder` (autobyteus-280). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder`, branch `codex/seal-migrations-per-folder`.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1. Code review CRR-002 Pass (IR-002, head `6170227e3b`, code `9b013fcc09`), message from `/software_engineering_team/code_reviewer`.
- Prior round reviewed: N/A
- Plan by impact (TESTING.md):
  - The implementation's checks ran on `8b091176bf` (IMP-01..07) and on `9b013fcc09` (IMP-01 r2, IMP-02 r2, IMP-08).
  - IR-002 changed a migration (the 205 repair), and migrations are a shared foundation (rule 4). So the server unit, integration and library suites were rerun on `9b013fcc09`, after a rebuild.
  - The typecheck and the architecture boundary test had already run on `9b013fcc09`, and `6170227e3b` adds only ticket documents, so both are reused.
- Deviations from the investigation's plan, and why:
  - **API-09: the failure chain.** A read-only `llm/` folder makes the custom-provider readable-identity migration's prerequisite fail first: the V1 secret migration, with `CUSTOM_PROVIDER_V1_RESET_UNAVAILABLE`. The readable migration then stays `NOT_RUN`, not `FAILED`. That is the real outcome of this failure, and the capability is pending either way. The case therefore asserts both statuses and retries both migrations in Settings order. I found this with a one-off status dump in a development run; the dump was removed and not committed.
  - **API-12: one failure, caused by the machine.** RA-04 of `agent-runtimes-running-agents.e2e.test.ts` failed in the full run because the Mac went into idle sleep during it (cause below). The file passed when rerun alone (one run per case per round).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder/tickets/in-progress/seal-migrations-per-folder/evidence/` (the handoff gives the commit that holds it)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (two e2e files changed)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `6170227e3b` (code `9b013fcc09`) | macOS 26.5.2 (darwin arm64) | Node v22.23.1, pnpm 10.28.2, vitest 4.1.12; server `dist` rebuilt in API-04 | clean env `env -i PATH HOME=<temp> TMPDIR`; repository test isolation for unit/integration |
| ENV-2 | same + the e2e changes committed with this report | same | built server `dist/app.js` through its real entrypoint (`startBuiltTestServer`, `studio` spawns), in-process studio servers for the other e2e | test-owned runtime roots and SQLite databases; synthesized fixtures only (released V2 provider file, the 205 fixture module, a local `/v1/models` discovery fixture); never the user's data or `~/.autobyteus`; heavy runs only when no other heavy run was active on the machine |

## Cases

Evidence paths are in `evidence/`. The full logs of API-05, API-06, API-07 and API-12 are committed as excerpts. Their full paths in `/tmp/ab280e2e/` are named in each excerpt's header.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | server typecheck | `Reused` IMP-01 (r2) | — | Pass | (IMP-01 r2) | (IMP-01 r2) | On `9b013fcc09` = current code |
| API-02 | AC-001 | architecture boundary test: sealed area, folder-to-folder rule, `@autobyteus/*`, negative case, unused-frozen report | `Reused` IMP-02 (r2) | — | Pass (FU-001 pre-existing) | (IMP-02 r2) | (IMP-02 r2) | same |
| API-03 | AC-002 (assertions unchanged) | assertion preservation | `Reused` IMP-04 | — | Pass | (IMP-04) | (IMP-04) | IR-002 only added assertions (CRR-002) |
| API-04 | — | server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-04-server-build.log` | `Built-in agents bootstrap smoke check passed.`, `# Exit code: 0` | The previous `dist` predated `9b013fcc09` |
| API-05 | AC-002..AC-005 (unit level), REQ-011 | server unit, incl. every per-migration folder in `tests/app-data-migrations`, the capability readiness test and the GraphQL retry test | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-05-server-unit.excerpt.txt` | `Test Files  797 passed \| 4 skipped (801)`, `Tests  6625 passed \| 7 skipped (6632)`, `# Exit code: 0` | One more test than IMP-03 (6624): IR-002's CR-002 test |
| API-06 | AC-002 | server integration, incl. the per-migration integration files | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass | `API-06-server-integration.excerpt.txt` | `Tests  421 passed \| 69 skipped (490)`, `# Exit code: 0` | |
| API-07 | AC-006 | library without `memory/migration` | `pnpm -C autobyteus-ts build && pnpm -C autobyteus-ts exec vitest run tests/unit && ls autobyteus-ts/src/memory/migration` | ENV-1 | Pass | `API-07-library.excerpt.txt` | `Tests  2041 passed (2041)`, `ls: autobyteus-ts/src/memory/migration: No such file or directory`, `# Exit code: 0` | |
| API-08 | — (baseline for API-10) | the existing case as committed, on the current build | A temporary copy of `HEAD:…/custom-provider-readable-id-startup-migration.e2e.test.ts` (deleted after the run), `-t "fresh recent RUNNING"` | ENV-2 | Fail, as expected | `API-08-original-running-case.log` | `× blocks a fresh recent RUNNING record…`, `Error: READABLE_GATE_FAILURE_TIMEOUT`, `# Exit code: 1` | The old G-1 assertion ("the server exits with `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED`") is obsolete under DEC-003. The server now starts and keeps serving, so the test's wait for an exit times out. The implementation's e2e runs (IMP-06, IMP-08) did not include this file, so the branch carried a red e2e |
| API-09 | AC-004, REQ-006, DS-003 | built server, real startup; GraphQL as Settings and the run launcher use it | In API-12: `custom-provider-readable-id-startup-migration.e2e.test.ts` › "serves while the custom-provider migrations cannot finish…". The setup is a released V2 provider file and a read-only `llm/` folder. Steps:<br>1. the server serves (`/rest/health` 200);<br>2. the V1 prerequisite is `FAILED` (`CUSTOM_PROVIDER_V1_RESET_UNAVAILABLE`, `canRetry`), the readable migration is `NOT_RUN` (`canRetry`), and the V2 file is byte-identical;<br>3. `providerCredentialSettings` lists built-ins only;<br>4. `createCustomProvider` and `deleteCustomProvider` are refused with `CUSTOM_PROVIDERS_MIGRATION_PENDING`, and no secret changes;<br>5. `createAgentRun` with a custom model is refused with the code, while a built-in model run starts (and is terminated);<br>6. write access is restored and `runAppDataMigration` (V1) succeeds, but providers are still pending;<br>7. `runAppDataMigration` (readable) gives `SUCCEEDED`; the file is the empty V3 and the selectors are rewritten;<br>8. without a restart, a custom provider is created against the discovery fixture, its catalog is READY, and a run on its model starts | ENV-2 | Pass | `API-12-server-e2e.excerpt.txt` | `✓ serves while the custom-provider migrations cannot finish: custom providers refuse with the capability code while built-in runs start; Settings retries after the fix make them available without a restart …` | Durable (new case). Skips on root or Windows (mode bits must bind), stated in its name |
| API-10 | AC-004 | built server, fresh `RUNNING` record | In API-12: the same file › "serves while a fresh recent RUNNING record holds custom providers back, then converges through the ordinary stale retry":<br>1. health 200, no `STARTUP_BLOCKED` output, the record `RUNNING`;<br>2. the gate checks of API-09 steps 3 and 4;<br>3. the V2 file and selectors are untouched;<br>4. the record is made stale and the next start converges: `SUCCEEDED`, attempts 2, V3, selectors (unchanged assertions) | ENV-2 | Pass | `API-12-server-e2e.excerpt.txt` | `✓ serves while a fresh recent RUNNING record holds custom providers back, then converges through the ordinary stale retry` | Durable (updated case; obsolete assertions replaced, see "Durable Coverage Changed") |
| API-11 | AC-005, REQ-008 | built server, 205 startup | In API-12: `remove-skill-improvement-data-startup.e2e.test.ts` › SID-2. A beta.5-era compactor run (`launchPurpose: "server_helper"`, its own definition, a history row) is added to the feature data. After the first start, its files are byte-identical, its row is kept and it is listed; after the second start it is still listed. Every earlier SID-2 assertion is unchanged | ENV-2 | Pass | `API-12-server-e2e.excerpt.txt` | `✓ SID-2 deletes exactly the feature's data once, keeps everything else byte-identical, and other runs list and open` | Durable (extended) |
| API-12 | AC-002..AC-005 (system boundary) | every non-gated server e2e on the current build | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR pnpm exec vitest run tests/e2e --no-watch` | ENV-2 | Pass. One failure, RA-04, caused by the machine's sleep; passes alone | `API-12-server-e2e.excerpt.txt`, `API-12-ra04-rerun-alone.log`, `API-12-ra04-sleep-cause.txt` | Full run: `Test Files  1 failed \| 97 passed \| 93 skipped (191)`, `Tests  1 failed \| 422 passed \| 448 skipped (871)`. Every app-data-migration startup suite `✓`, incl. `✓ keeps the server healthy after failed consolidation, admits a new current run…` (G-2: `TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED`, `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`, new run admitted, restart retry). Rerun alone: `Tests  4 passed (4)`. Sleep: `22:13:31 … Entering Sleep state due to 'Idle Sleep' … 906 secs` | RA-04's failure: `Timed out waiting for Codex has an update again` after 918,570 ms, for a 20-second wall-clock `until()`. The power log shows idle sleep from 22:13:31 for 906 s, with the run started at 22:07:17. A frozen process misses its deadline across the sleep. RA-04 tests the runtime update check, which this diff does not touch (`git diff 27f2d2f72d HEAD` has no runtime-update file; `general-process-run-supervisor.ts` only renames `TokenUsageMigrationReadiness` → `TokenUsageCapability`). 93 files skipped are gated live suites |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02 (boundary test incl. negative case; unused-frozen report empty) | Proven | — |
| AC-002 | Yes | API-05, API-06 (every migration suite in its folder), API-03 (assertions unchanged), API-12 (every migration startup e2e on the current build) | Proven | — |
| AC-003 | Yes | API-05 (capability test), API-12 (`team-run-v1-production-upgrade` › "keeps the server healthy after failed consolidation…": history and restore refused with the unchanged codes, a new run admitted, and both work after the restart retry) | Proven | — |
| AC-004 | Yes | API-09 (failed chain, Settings retries without a restart), API-10 (fresh `RUNNING`), API-05 (host and capability units) | Proven | — |
| AC-005 | Yes | API-11 (compactor at a real startup), API-05 (205 unit cases incl. M3 failure and unreadable session), `release-notes.md` carries the REQ-008 sentence (IMP, CRR) | Proven | — |
| AC-006 | Yes | API-07 | Proven | — |
| AC-007 | No | Guideline text (Solution Designer; checked in code review) | Not proven here (document) | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | API-01..07; API-09..12 | — | — |
| Changed-boundary execution directness | 80% | 96% | The gates through a real startup and the same GraphQL Settings and the run launcher use; the retry through `runAppDataMigration` | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | Built server, real runner and registry, real file system (mode bits), local discovery fixture | No real provider (not needed: the gate refuses before any provider call) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Released V2 provider shape; 205 fixture module; test-owned roots | The user's own data (not needed: no stored shape changed, and the 205 repair deletes less) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 96% | Failed prerequisite chain, fresh `RUNNING`, stale convergence, Settings retry without a restart, restart retry (G-2), M3 failure (unit) | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No web or shell change; the Settings page shows GraphQL errors through its existing path | — | — |
| Durable regression coverage quality and relevance | 85% | 95% | One obsolete e2e case replaced; one new case; SID-2 extended; the full e2e folder green apart from the sleep-caused RA-04 | — | — |

- Overall post-repository confidence: 85% (simple average of the applicable categories)
- Overall final confidence: 95.5% (simple average: 96, 96, 95, 95, 96, 95)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: FU-001 (pre-existing failing architecture assertion); the frozen-layer size noted in code review (covered by every migration suite and startup e2e passing).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` + `Live API` (built server, real startups, GraphQL)
- Gap and gain: G-1 and G-2 had been proven only with in-process units. The custom-provider e2e was red on the branch, and the 205 compactor was never started for real. API-08..API-12 close these (85% → 95.5%).
- Browser validation needed: no.
  - There is no web change. The gates are server-side, and the Settings page renders any GraphQL error message through its existing path.
  - API-09 drives the same GraphQL operations the Settings page and run launcher send, on a real server.

## Desktop Application Validation

- Not applicable. There is no shell change, and the built server entrypoint (`dist/app.js`) that the desktop embeds is the one exercised. The user's running AutoByteus and `~/.autobyteus` were never touched.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`, except REQ-008, which narrows a same-ID repair.
- Representative existing data used: released V2 provider file; 205 fixture module plus the beta.5 compactor run; every migration's released fixtures (API-05, API-06, API-12).
- Approved transition followed without an unnecessary migration: `Yes`.
- Cases proving the outcome:
  - API-05, API-06, API-12: every migration's results unchanged;
  - API-11: the 205 repair deletes less;
  - API-09, API-10: the custom-provider transitions complete after a retry or restart.
- Version-specific runtime branch, dual read/write or compatibility fallback observed: `No`. The custom-provider gate refuses while pending and never reads the old shape.
- Residual: none.

## Compatibility / Legacy Scope Check

- Compatibility in scope: `No`. Compatibility-only behavior observed: `No`. Durable coverage kept only for compatibility: `No`: the obsolete startup-block assertions were replaced, not kept.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts` › "serves while a fresh recent RUNNING record holds custom providers back…" (was "blocks a fresh recent RUNNING record…") | Updated | API-10 | **Obsolete assertions replaced:**<br>- `exitCode 1`, output `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:RUNNING:`, no "Server listening on": the whole-server G-1 block, removed by DEC-003 / REQ-006 / AC-004; the code no longer exists in `src`;<br>- the helper `startExpectingGateFailure` and the import `builtServerEntry`, used only by this case.<br>**Replacement:** the narrowed gate (the server serves; custom providers refuse with `CUSTOM_PROVIDERS_MIGRATION_PENDING`; the V2 file untouched). The convergence assertions are unchanged |
| same file › "serves while the custom-provider migrations cannot finish…" | Added | API-09 | Plus the helpers `graphqlRaw`, `expectCustomProvidersPending`, `startAgentRun`, `terminateRun`, `builtInModelIdentifier`, `modeBitsBind` |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts` › SID-2 | Updated (extended; no assertion changed) | API-11 | The compactor run and its row; header comment |

- Attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| An OpenAI-compatible provider | the e2e's local `/v1/models` discovery fixture | No real provider is needed; the gate refuses before any call, and after the retry discovery is enough to prove availability | No inference (not relevant) |
| A permission problem on the provider folder | `chmod 0555` on the test-owned `llm/` folder | The real-use cause of these migrations failing | POSIX non-root only (the case skips elsewhere) |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| API-08's temporary copy of the committed e2e file | Yes | deleted after the run | Not in the tree |
| A one-off status dump in a development run of API-09 | Yes | removed before the record run | `grep -c TEMP-DIAG` = 0 |
| Test-owned runtime roots, databases, servers | Yes | each test's `afterEach` (`removeOwnedTestRuntime`, server stop); the mode-bit folder restored in `finally` | — |
| `/tmp/ab280e2e/` (scripts, full logs, development runs) | Yes | kept as scratch; the excerpts name the full logs | Kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-007 is a document, not proven here
- Preliminary classification: N/A
- Next recipient: per `get_handoff_rules` (proportional test-code review)
- Notes:
  - The branch carried a red e2e that the implementation's runs did not include: the obsolete G-1 case. It is updated here as owned e2e coverage.
  - RA-04's single failure in the full run was the machine's idle sleep (cause in API-12).
