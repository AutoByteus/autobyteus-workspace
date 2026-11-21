# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history (round 1: `API-REV-001`, Fail).

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (sections "Planned Cases" and "Round 2")
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, IR-002 (SR-002: FU-008's bound revised after CRR-001 CR-001 / API-REV-001), direct route
- Prior round reviewed: round 1 (`API-REV-001`, Fail on AC-008). **Prior failure resolved:** the Grok catalog test passes with the bound firing late (API-05).
- Deviations from the investigation's plan, and why:
  - API-05's diagnostic run kept a temporary print in `probe-time-bound.ts` (restored) to show the late timer firings the fix must survive.
  - A baseline fix (TESTING.md rule 9): `grok-build-compaction-replay`'s `afterAll` failed once on its 10 s default while closing the in-process server; measured (API-05d) and given the TESTING.md limit (`adda171de8`, API-05e).
  - Added API-13 (Linux container) to give AC-007 and the file-event-dependent files my own run where the OS delivers events, since this Mac delivers none.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-follow-ups-576/tickets/in-progress/memory-follow-ups-576/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 1 `56c61c3ecb`; round 2 code `3b39828501` (records `a4ed4455fa`), then `adda171de8` (baseline fix) | macOS 26.5.2 ARM64, shared host, load 7–88 | Node v22.23.1; server `dist/` rebuilt at API-00 round 2 | `env -i PATH HOME=<temp> TMPDIR USER`; `fseventsd` 99–209% CPU; a raw `fs.watch` got its event in 1.8–6.0 s or not within 30 s |
| ENV-2 | round 1 | same | rendered probe (built server, Nuxt dev, Chrome via Playwright) | probe-owned data |
| ENV-3 | round 1 | same | isolated desktop instance of this worktree (`isolated-app start --build`), Playwright over CDP | own seeded data root; stopped, removed |
| ENV-4 | `adda171de8` via `git archive` | Linux, Docker `node:22-bookworm` (Node v22.23.5), test-owned container, removed | frozen install, `prepare:source` (no server build) | raw `fs.watch` event in 21 ms |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log`, `API-00-server-build-round2.log` | `exit 0` | — |
| API-01 | AC-001 (S-1) | IC-03 at 274 bytes | `test:integration:prepare`; `env -i … vitest run tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` | ENV-1 | Pass (round 1, still valid) | `API-01-ac001-ic03.log` | `Tests  3 passed (3)`, `✓ IC-03` | unit IMP-01 reused |
| API-02 | AC-005 | `package-personal-settings` | alone, three times | ENV-1 | Pass (round 1, still valid) | `API-02-ac005-personal-settings-x3.log` | three times `Tests  7 passed (7)` | — |
| API-03 | AC-006, CF-05 | `agent-semantic-memory` (SM-04, SM-12), scripted AGY, as `normy` uid 501 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs vitest run tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts`, three times, errors kept | ENV-1 | Pass | `API-03-ac006-sm12.log`, `API-03-round2-sm04.log` | round 2: three times `Tests  10 passed (10)` | round 1's SM-04 failure (error not kept) did not recur in four runs |
| API-04 | AC-007 (DEC-005, this host) | DCF-E2E-007 on macOS | alone, three times | ENV-1 | Pass per DEC-005 (the named failure) | `API-04-ac007-live-refresh-x3.log` | each `Error: ENVIRONMENT: the OS delivered no file event for agents/apar-fresh-scout within 30000 ms`; independent raw `fs.watch` before each run `no event in 30000ms` | never a product assertion |
| API-13 | AC-007 (DEC-005, a host with events) | the file-event-dependent files in Linux | test-owned `node:22-bookworm` container, `git archive HEAD`, frozen install, `prepare:source`; live-refresh ×3, websocket-lifecycle ×3 (scripted AGY) | ENV-4 | Pass (live-refresh); websocket-lifecycle: my setup | `API-13-linux-container-file-events.log`, `API-13b-linux-websocket-lifecycle-errors.log` | raw `fs.watch` `event 21ms`; live-refresh three times `Tests  10 passed (10)`; websocket-lifecycle `WATCHER_UNAVAILABLE` | websocket-lifecycle's watcher runtime forks `dist/…/watcher-runtime-process.js` (`watcher-runtime-entrypoint.ts`) and the container had no server build: my setup, not the product; on macOS the file passes alone (API-08b). `container removed: 0 left` |
| API-05 | **AC-008 / REQ-008** (prior failure) | Grok and AGY probes under load | the Grok catalog test ×10 with a temporary print of each bound firing; then Grok runtime replay, Grok compaction replay and own-stream (scripted AGY) each alone ×3 | ENV-1 | Pass | `API-05c-grok-catalog-late-timer-diagnostic.log`, `API-05-round2-probes-under-load.log`; round 1 `API-05b-…` (the failure) | 10/10 `exit 0`; 7 late firings, e.g. `{"boundMs":3000,"firedAfterMs":15260,"exitedAtFire":false,"exitedAtDecision":true}`; clean: runtime replay `10 passed` ×3, own-stream `2 passed` ×3 | each late firing is the round 1 failure's order (exit not yet seen when the timer runs); the deferred decision saw it every time. Compaction ×3: `3 passed` each, suite hook failed once: API-05d/e |
| API-05d/e | — (baseline fix) | `grok-build-compaction-replay` `afterAll` | per-step timing with a temporary print and raised limit ×4; then the fix and ×3 | ENV-1 | Pass | `API-05d-compaction-afterall-diagnostic.log`, `API-05e-compaction-baseline-fix.log` | `appClose` 721–7900 ms with `eventLoopMaxGapDuringClose` 716–7858 ms; after the fix three times `Tests  3 passed (3)` | commit `adda171de8`: `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS` (TESTING.md "File watching on a busy Mac"), as FU-005 |
| API-06 | all (server) | whole server unit suite | `env -i … pnpm -C autobyteus-server-ts test:unit` (round 1) + IMP-11/IMP-12 for the revised bound | ENV-1 | Pass | `API-06-server-unit-suite.log`; IMP-11, IMP-12 | `Tests  8626 passed`; IMP-11 `64/64`, IMP-12 `778` | the only server change since is `probe-time-bound.ts`, whose unit and consumers IMP-11/12 ran |
| API-07 | all | server integration | `env -i … pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass for this change | `API-07-server-integration.log` | `Tests  9 failed \| 505 passed`; 8 in `file-system-watcher` labelled by the test itself `ENVIRONMENT: the OS delivered no file event within 10 s` or `INCONCLUSIVE`; `package-auto-refresh` AC-012 `last value: "FOLDER_MISSING"` (the restore event never came) | all nine wait on OS file events, which this host does not deliver (API-04's independent measurement); neither file runs code this ticket changed |
| API-08 | all | whole server E2E | root `env -i … pnpm test:e2e`; the failing files one at a time; the secret file alone ×2 | ENV-1 | Pass for this change | `API-08-server-e2e-suite.log`, `API-08b-failing-files-rerun.log`, `API-08c-secret-lifecycle-alone.log` | `Test Files  10 failed \| 118 passed`; the two `RUNTIME_PROBE_TIMED_OUT` lines are `available-agent-runtimes-graphql`'s deliberate AGY `hang` (that file passed); one at a time: update-notifications, task-search-model-unavailable, node-files, search-files pass | Still failing, none on a path this ticket changed (the bound is used only by the AGY and Grok capability probes): live-refresh and websocket-lifecycle wait on OS file events; request-origin, embedding-settings, node-locality failed alike on base in 554; provider-secret-lifecycle's custom-provider case takes 4,756 ms passing and over 5,000 ms failing against vitest's 5 s default. Follow-up FU-002 |
| API-09 | AC-002, AC-003 | whole web unit suite | `test:nuxt run`, `test:electron run` (round 1) | ENV-1 | Pass for this change | `API-09-web-unit-full.log` | `790 passed`, `5954` tests; electron `1 failed \| 535 passed`, alone `11 passed` ×2 | `PortOwnerInspectorFaults`: `ENOENT … child-pid`, its shell child killed by the 1000 ms deadline before writing its receipt under suite load |
| API-10 | AC-001, AC-002 | rendered probe | round 1 | ENV-2 | Pass | `API-10-rendered-probe.log`, `API-10-probe/` | `Pass (41/41 checks)` | no web change since |
| API-11 | AC-002 (S-2) | desktop app | round 1 | ENV-3 | Pass | `API-11-desktop-journey.log`, `API-11-desktop/` | `desktop journey: Pass (5/5 checks)` | no web change since |
| API-12 | — | typechecks | IMP-09/10 (reused), server typecheck with the baseline fix | ENV-1 | Pass | `API-12b-server-typecheck-round2.log` | `1006 in 315 files (baseline 1006 in 315 files)`, `PASS` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-01, API-01, API-10 (SMV-100) | Proven | — |
| AC-002 | Yes | IMP-06, API-09, API-10 (SMV-103…105), API-11 (desktop) | Proven | — |
| AC-003 | Yes | IMP-05, API-09 | Proven | — |
| AC-004 | — | — | Waits for DEC-004 (the founder) | the founder's decision |
| AC-005 | Yes | API-02 | Proven | — |
| AC-006 | Yes | API-03 | Proven | — |
| AC-007 | Yes | IMP-08 (cause), API-13 (Linux, three passes), API-04 (this host: the named `ENVIRONMENT` failure, an independent raw watch also gets no event) | Proven (DEC-005) | — |
| AC-008 | Yes | IMP-11 (real order, negative controls), API-05 (10/10 with 7 late firings; replay and AGY files ×3), API-03 (SM-04 ×3) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | every applicable criterion directly proven; AC-008's real-world order observed and survived seven times | AC-004 waits for the founder | — |
| Changed-boundary execution directness | 95% | 95% | real server, real child processes, real page, real desktop app | — | — |
| Cross-boundary integration realism and mock gap | 93% | 94% | scripted CLIs run as real child processes, so the bound's timing is real | real Grok and Antigravity binaries not run (their output is not what changed) | — |
| Environment, configuration, identity, and fixture fidelity | 88% | 93% | clean env, own data; Linux container with working file events | this Mac's FSEvents leaves watcher-dependent files unprovable here | a healthy `fseventsd` |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 96% | late bounds, hanging children (deliberate hang mode), missing and out-of-folder links | — | — |
| User-surface, browser, and desktop-shell confidence | 96% | 96% | probe 41/41; desktop app 5/5 | mobile file viewer not rendered (same component) | — |
| Durable regression coverage quality and relevance | 94% | 95% | IMP-11 builds the failing order with negative controls; each item has durable tests; baseline fix | — | — |

- Overall final confidence: 95.0% (simple average)
- Every critical acceptance criterion directly proven: `Yes` (AC-004 waits for DEC-004 and has no code)
- Any final applicable category below `90%`: `No`
- Default target met: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed: rendered probe, isolated desktop instance, Linux container for file events
- Residual risk: watcher-dependent files on this Mac; mobile viewer not rendered

## Persisted-Data Transition Checks

- FU-009 `Not Affected` (554 unreleased); no fallback observed

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-compaction-replay.e2e.test.ts` | Updated (`adda171de8`, baseline fix): `afterAll` limit `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS` | API-05d/e | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Grok, AGY CLIs | scripted fakes as real child processes | the probes' child-process timing is what changed | real binaries' output not exercised (unchanged) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `probe-time-bound.ts` prints (round 1 API-05b; round 2 API-05c) | Yes | copied back | `git diff` of `src` empty |
| compaction `afterAll` timing print (API-05d) | Yes | copied back | restored before the baseline fix |
| Linux containers `u576-api-e2e-linux`, `-linux2` | Yes | `docker rm -f` | `0 left`; the founder's `autobyteus-server-*` untouched |
| isolated desktop instance and data root (round 1) | Yes | `isolated-app stop`; `rm -rf` | stopped, removed |
| scripts in `/tmp` | Yes | `rm` | removed |
| `electron-dist/`, Brief Studio package | Yes (ignored build output) | left | — |

## Latest Authoritative Result

- Result: `Pass`
- Prior failure: resolved (API-05)
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (direct route, Medium / Low)
- Residuals: this Mac's file events (watcher-dependent files only provable on Linux here); FU-002 (E2E files at default limits on a busy Mac, outside this ticket); AC-004 waits for DEC-004; FU-001 (implementation's).
