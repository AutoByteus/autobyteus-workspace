# API/E2E Execution Coverage Report — autobyteus-343 (stored-runtime-names)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after source review CRR-001 (Pass, no findings)
- Prior round reviewed: `N/A`
- Deviations from the plan: API-02/03 went beyond the planned clean/warnings split by adding a leftover temporary file next to an already-current manifest (mutation M2 showed the first fixture could not tell whether the cleanup ran). API-06 gained a third step (a later rotation changes the manifest again and the hub accepts it) to cover the hub's reaction to a changed existing manifest. API-08 ran Grok live only; live AGY was not run (see Not Tested). API-07 was run before API-06 got its third step; API-06's final run is after.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names/tickets/in-progress/stored-runtime-names/evidence/` (files start with `API-`; commit named in the handoff message)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed` (architecture review ARCH-REV-001 and source review CRR-001)
- Successful-output route: `Code Review` (test-code review of the durable test changes)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `dd56f6de6c` (code unchanged since `f5f9ee3221`; tests at `b65c6c2220`) | macOS Darwin 25.5.0, Apple silicon, Node 22 via pnpm | vitest from source (unit, in-process E2E) | `env -i`, throwaway HOME, test-owned temp roots |
| ENV-2 | same | same | built server `autobyteus-server-ts/dist/app.js` of this worktree (`pnpm -C autobyteus-server-ts build`, exit 0, at `dd56f6de6c`), spawned as separate processes | `--data-dir` temp root, private HOME and sqlite database, ephemeral loopback ports, `APP_ENV=test`; synthesized memory roots only |
| ENV-3 | same | same | scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (case `auto_compaction`, reports 1.2.16) and the recorded-traffic Grok fake (`createFakeGrokCommand`, real Grok 1.0.46 traffic), real server in-process | `RUN_AGY_FAILURE_E2E=1`, throwaway HOME |
| ENV-4 | same | same | live `grok` 1.0.70 with the suite's temporary `GROK_HOME` (user's `auth.json` symlinked, never written) | `RUN_GROK_E2E=1`, real HOME/USER/LOGNAME as TESTING.md requires; model `grok-4.7`, effort `low`; the run adds a session to Grok's own history |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…005, 007, 008 | migration/boundary/source-check/writer unit suites (server), library memory suite | `env -i … pnpm exec vitest run tests/app-data-migrations tests/architecture tests/unit/agent-memory tests/unit/agent-execution/backends tests/unit/services/agent-streaming --no-watch` (server); `pnpm exec vitest run tests/unit/memory --no-watch` (library) | ENV-1 | Pass | `API-01-focused-rerun.log` | `Test Files  203 passed \| 4 skipped (207)`, `Tests  2076 passed \| 6 skipped (2082)`; library `Test Files  42 passed (42)`, `Tests  312 passed (312)` | Identical counts to IMP-03; reran because it is cheap. IMP-01 (typecheck), IMP-02 (full unit), IMP-04 (isolated run) and IMP-05 are reused below |
| API-02 | AC-002, AC-003, AC-007, REQ-002/003/007, SCN-002/003/A1/A2 | built server startup on a synthesized root, Settings API (`getAppDataMigrations`), second start | `env -i … pnpm exec vitest run tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-02-03-startup-e2e.log`, `API-02-03-mutation-checks.md` | `✓ … converts this node's own manifests once, keeps everything else byte-identical, and does nothing on the next start`; in the test: record `SUCCEEDED`, summary `Scanned 11; migrated 9; skipped 2; failed 0.`, attempts 1 | Each old label, null, missing key, already-current, pending, extra unknown key, three families converted exactly (compact JSON equals expected, other keys and order intact); current manifests, `imports/` manifest and its `sync-manifest.json`, wrong-depth manifest, legacy `.backup-*`, traces byte-identical; two leftover `.tmp` files (beside a convertible and an already-current manifest) gone; both layout migrations completed before this one started; second start: attempts 1, snapshot and mtimes unchanged. Mutations M1 (wrong target), M2 (cleanup off), S2 (imports visited) fail it |
| API-03 | AC-004, REQ-004, SCN-006/A3 | same, second root with unusable manifests | same file | ENV-2 | Pass | `API-02-03-startup-e2e.log` | `✓ … keeps an unusable manifest as it is and says why, converts the rest, and ends with warnings`; record `SUCCEEDED_WITH_WARNINGS`, summary `Scanned 6; migrated 1; skipped 5; failed 0.` | Unknown value, invalid JSON, no `segments`, non-text value, non-object entry: each byte-identical and named with run and reason in the migration log (`"itemId":"agents/run_unknown_value" … unknown runtime_kind value`, …); the server answered GraphQL meanwhile; second start: attempts 1, nothing changed. Mutation M3 (warnings off) fails it |
| API-04 | AC-001, BEH-001, REQ-001 | scripted AGY compaction through the real server: payload and archive manifest | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-compaction-rotation-transport.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-04-agy-compaction-before-update.log` (unmodified test passes), `API-04-agy-compaction-transport.log` (with the new manifest assertion) | `Tests  1 passed (1)` in both | Durable update: the test now reads `<data>/memory/agents/<run>/raw_traces_manifest.json` and asserts `segments[0].runtime_kind` equals the live payload's value and `"antigravity_cli"`. Source mutation (payload spells `"ANTIGRAVITY"`) fails it |
| API-05 | AC-001, BEH-001, REQ-001 | Grok recorded-traffic replay through the real server | `env -i … pnpm exec vitest run tests/e2e/runtime/grok-build-compaction-replay.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-05-grok-replay-before-update.log`, `API-05-grok-replay.log` | `Tests  3 passed (3)` | Durable update: three auto compactions archive three segments and the manifest holds `["grok_build","grok_build","grok_build"]`. Source mutation (payload spells `"GROK_BUILD"`) fails all 3 tests |
| API-06 | design F-09, DEC-2 (preserved Memory Sync) | hub + source as two real built server processes | `env -i … pnpm exec vitest run tests/e2e/memory-sync/raw-trace-manifest-runtime-names-sync.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-06-memory-sync-converted-manifest.log`, `API-02-03-mutation-checks.md` (S1, S2) | `✓ … uploads the converted manifest once; the hub mirrors the converted file; an older import stays as it is` | Source starts with an old-label manifest and its own migration converts it (`SUCCEEDED`); sync 1: `committedBatches 1`, `changedFiles 4`, the hub's import equals the converted manifest and its `sync-manifest.json` lists the converted file's sha256; sync 2: `changedFiles 0`, no batch; a later rotation changes the manifest (2 files changed, 1 batch) and the hub's copy is replaced; the hub's own older import (old spelling, started with the hub) is byte-identical. Mutations S1 and S2 fail it |
| API-07 | preserved Memory Sync | existing memory-sync suites | `env -i … pnpm exec vitest run tests/e2e/memory-sync --no-watch` | ENV-2 | Pass | `API-07-memory-sync-suites.log` | `Test Files  3 passed (3)`, `Tests  3 passed (3)` | The existing multi-process test rebuilds `dist` with tsc itself; run before API-06's third step was added |
| API-08 | AC-001 on a real provider | live Grok compaction (changed assertion `runtime_kind: "grok_build"`) | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR RUN_GROK_E2E=1 pnpm exec vitest run tests/e2e/runtime/grok-build-compaction-live.e2e.test.ts --no-watch` | ENV-4 | Pass (on rerun; first run failed) | `API-08-grok-live-compaction.log` (first run, fail), `API-08-grok-live-compaction-rerun.log` (pass) | first: `Timed out waiting for automatic compaction start: AGENT_STATUS,… TURN_COMPLETED,AGENT_STATUS,`; rerun: `✓ closes an interrupted automatic compaction as failed, then archives automatic and manual compactions  95124ms` | The first run failed at "automatic compaction start" after data dump B, before the changed assertion: no `COMPACTION_STATUS` event reached the server's stream at all, so the recorder, the manifest and `runtime_kind` were not reached. I could not isolate why the live CLI did not compact that time (a diagnostic rerun passed and the evidence folder was not produced because the test passed; Rule 9 says a rerun pass is not a cause). TESTING.md: "a live failure alone is not a defect" for live compaction, whose outcome depends on the model. The passing run proves the live payload and the manifest assertion of the suite. Treat as unexplained live-provider variation, not as a product finding |
| API-09 | AC-001 for Claude, Codex, native | writers at converter/library level | not run as a server E2E (no scripted E2E exists; `codex-interrupted-compaction` is a live suite) | — | Not Tested (as E2E); unit evidence reused | — | — | `claude-session-event-converter`, `codex-thread-event-converter`, `runtime-memory-event-accumulator` (values stored; old labels and garbage not recorded), library `run-memory-file-store.test.ts` / `raw-trace-archive-manager.test.ts` (`runtime_kind: 'autobyteus'`), all inside API-01 |
| API-10 | AC-001 on live AGY | live AGY compaction (host login, about 5 turns of ~90K tokens) | not run | — | Not Tested | — | — | see Dependencies / Latest Result |
| IMP-01 (reused) | all | `pnpm -C autobyteus-server-ts typecheck`, clean clone | see handoff row IMP-01 | — | Pass (reused) | handoff row IMP-01 | `typecheck exit 0` | ran on `f5f9ee3221`; `git diff --name-only f5f9ee3221 HEAD -- autobyteus-server-ts autobyteus-ts autobyteus-web` is empty (later commits are tickets/evidence; my commit adds tests only) |
| IMP-02 (reused) | AC-008 | full server unit suite | see handoff row IMP-02 | — | Pass (reused) | handoff row IMP-02 | `Test Files  3 failed \| 880 passed` then folder rerun green after the registry-tail fix `f5f9ee3221` | the new E2E files are outside `test:unit`; the registry-tail tests were in API-01 (`tests/app-data-migrations`) |
| IMP-04 (reused) | AC-006, AC-002, AC-003, AC-007 | runner over 962 real-shaped manifests (read-only copy of only the manifest files) | see handoff row IMP-04 | — | Pass (reused) | `evidence/IMP-04-isolated-run-report.json` | `"summary": "Scanned 825; migrated 825; skipped 0; failed 0."`, `contentDiffersFromExpected 0`, `importsChanged 0`, `secondRunMigrated 0` | I did not repeat it (TESTING.md: no conversion on real data or a copy); API-02/03 add the real server around the same code on synthesized data |
| IMP-05 (reused) | AC-001, AC-008 | library `tests/unit`, web `agentStatusHandler.spec.ts`, narrow e2e | see handoff row IMP-05 | — | Pass (reused) | handoff row IMP-05 | `Tests 2090 passed`, `Tests 30 passed`, `Tests 12 passed \| 1 skipped` | same reasoning |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 writers write the `RuntimeKind` value | Yes | API-04 (AGY payload + manifest), API-05 (Grok payload + 3 manifest entries), API-08 (Grok live payload), API-01 (Claude, Codex, native, recorder) | Proven | — |
| AC-002 conversion keeps everything else | Yes | API-02 (built server), API-01 (fixtures per label, key order, unknown keys) | Proven | — |
| AC-003 idempotent, restart-safe | Yes | API-02 (second start, leftover `.tmp`), API-01 (partial attempt, leftover temp) | Proven | — |
| AC-004 unusable kept, reported, status policy | Yes | API-03 (built server), API-01 (ten shapes, failed write → `FAILED`, walk error) | Proven | — |
| AC-005 no label or mapping outside migrations | Yes | API-01 (`runtime-labels-source-check`), reviewed in CRR-001 | Proven | — |
| AC-006 real-shaped isolated copy | Yes | IMP-04 (reused) | Proven | The user's own first start on his real data (his backup is his choice, DEC-3) |
| AC-007 bounded cost, no re-audit | Yes | API-02 (only manifests touched, second start no work; imports/wrong depth never visited, S2) | Proven | — |
| AC-008 preserved suites | Yes | API-01, API-07, IMP-02 | Proven | — |
| Memory Sync effect (design F-09, DEC-2) | No | API-06, API-07 | Proven | — |

The AC-006 user-only part is not a gap: the criterion is a real-shaped isolated copy, proven by IMP-04. The only thing nobody but the user can check is the conversion on his own real node when he updates; TESTING.md forbids me from running it there. I tried deeper synthesized and built-server evidence instead (API-02/03).

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | all eight ACs proven by at least two cases; mutations fail the matching cases | AC-006 is a runner-level run on real-shaped data, not the user's node | the user's own first start |
| Changed-boundary execution directness | 96% | 96% | API-02/03 run the registered migration through the runner, GraphQL and restart on the built server; API-04/05/08 run the real writers and recorder | — | — |
| Cross-boundary integration realism and mock gap | 91% | 94% | built server, real hub+source, real Grok live; scripted AGY, recorded Grok traffic | Claude, Codex and native compaction not run through a server (converter/library level only); live AGY not run; Memory Sync hub exercised on loopback only | scripted Claude/Codex compaction E2E (none exists) or live runs |
| Environment, configuration, identity, and fixture fidelity | 94% | 95% | fixtures follow the released compact shape; census of 962 real-shaped manifests found 4 labels and 1 shape; isolated roots and HOME | `GROK_BUILD` has no real manifest sample (U-2); only the shapes the census and design list were synthesized | a real `GROK_BUILD` manifest after the update |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 95% | unusable shapes, leftover temp, second start, warnings terminal, changed manifest re-synced; interrupted attempt and failed write covered by IMP/API-01 fixtures | killing the server mid-migration on the built server was not done (timing); SCN-004 is unit level | a kill-during-migration journey |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI change: the Settings page lists migrations generically and was not changed; its server side (`getAppDataMigrations`) is exercised | a rendered Settings page was not viewed | — |
| Durable regression coverage quality and relevance | 94% | 96% | two new durable E2E files, two updated suites; mutation-checked; failure of a weak fixture (M2) led to a stronger one | gated live suites stay gated | — |

- Overall post-repository confidence: 94.7%
- Overall final confidence: 95.3%
- Calculation method: simple average of the six applicable categories, post (95+96+91+94+94+94)/6, final (96+96+94+95+95+96)/6
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes` (95.3%)
- Confidence-limiting residual risks: (1) Claude, Codex and native compaction writers are proven at converter/library level, not through a running server; (2) live AGY compaction not run; the first live Grok run failed unexplained before reaching the code (the rerun passed); (3) the user's real node is first converted when he updates (no backup by his decision DEC-3); (4) Memory Sync was exercised on loopback with a test-owned hub, and the hub accepted the changed manifest; the real hub of the user's setup is not available to me.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (built-server startup/restart), `Worker or Distributed` (hub + source), `Live API` (Grok)
- Confidence gap or residual risk it addresses, and the expected gain: the migration had never run inside the real server (registry wiring, prerequisites, GraphQL record, restart), nor had the sync path met a converted manifest; post-repository score 94.7% → final 95.3%.
- Browser validation needed: No. No UI changed.
- If `Required`: done as API-02, API-03, API-06, API-08.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required`
- Representative existing data used: synthesized manifests in the released compact shape (all old labels, null, missing, current, pending, extra key, unusable shapes); IMP-04's census of real-shaped manifests (reused)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-02 (conversion, completion, idempotence on a second start, leftover temp), API-03 (preserved exclusions, warnings status), API-06 (the converted file syncs), IMP-04
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`. The recorder accepts only a valid `RuntimeKind`; the only table of old labels is inside the sealed migration (source check passes; read in CRR-001).
- Residual untested persisted-data risk: an unfinished attempt on the built server (kill mid-run) is unit-level; a real `GROK_BUILD` manifest; the user's node.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No` (the new tests cover the sealed migration itself, which is the required transition)
- Reroute classification / recipient: `N/A`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts` | Added (2 tests) | API-02, API-03 | — |
| `autobyteus-server-ts/tests/e2e/memory-sync/raw-trace-manifest-runtime-names-sync.e2e.test.ts` | Added (1 test) | API-06 | — |
| `autobyteus-server-ts/tests/e2e/runtime/agy-compaction-rotation-transport.e2e.test.ts` | Updated (manifest assertion, gated) | API-04 | — |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-compaction-replay.e2e.test.ts` | Updated (manifest assertion) | API-05 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: no removals

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI | scripted `agy-failure-cli.mjs` (`auto_compaction`) | no paid model; deterministic | step shape follows AGY 1.2.16, not a live AGY |
| Grok CLI in API-05 | recorded-fixture fake CLI replaying real Grok 1.0.46 traffic | zero cost | live Grok covered by API-08 |
| Memory Sync hub | test-owned real server process on loopback | the user's hub must not be used | real hub's deployment not exercised |
| User data | synthesized released-shape manifests | TESTING.md | see residual risk 3 |
| Claude, Codex, native compaction | unit/converter tests only | paid logins, huge contexts; no scripted E2E exists | see residual risk 1 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Source mutations (AGY and Grok payload builders) | Yes | `git checkout` right after each run | `git status --short -- src` clean |
| Compiled-migration mutations M1–M3, S1, S2 in untracked `dist/` | Yes | originals saved to /tmp and restored, `cmp` confirmed each time | `dist` identical to the build of `dd56f6de6c` |
| Server child processes, temp roots, throwaway HOMEs | Yes | stopped/removed by the tests and by me | no vitest/server process left after the runs |
| Live Grok sessions | Yes (by the suite) | suite terminates its run and removes its temp `GROK_HOME` (never writes the user's `auth.json`) | the two runs' sessions remain in Grok's own history (recorded) |
| `/tmp/grok-e2e-evidence` (requested, not created) | Yes | none needed | absent |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): the conversion of the user's own real node (part of AC-006) is his first start after updating; delivery's release notes carry the facts (rollback works; imports keep the old spelling; label copies inside old records stay)
- Next recipient: Code Review (proportional test-code review of the added and updated durable tests; High risk)
- Notes: (1) Live AGY compaction was not run: it needs about five turns of ~90K-token dumps on the host `agy` login and adds a conversation to the user's history, and TESTING.md says a live compaction run is not required proof; the scripted AGY run (API-04) and the live Grok run (API-08) both assert the same payload value and the manifest. (2) The first live Grok run failed before reaching any code of this ticket and its cause is unknown; do not read it as a product defect (TESTING.md), do not read it as proven benign either. (3) FU-001 (three team-member fixtures spelled `'AUTOBYTEUS'`) is unchanged and not a blocker.
