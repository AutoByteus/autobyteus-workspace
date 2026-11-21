# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (Medium / Low, direct route)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **The round ends in `Fail` (API-05, AC-008 / REQ-008).** Server integration (API-07) and the whole server E2E suite (API-08) are `Next Round`: the fix changes server code the E2E suite runs at every start (runtime probes). The web suite, rendered probe, desktop journey and server unit suite ran now: the fix cannot change what they prove (the unit suite's probe tests rerun with the fix).
  - API-01 first ran without the Brief Studio package (this new worktree had none); `test:integration:prepare` was run and the file rerun.
  - API-05 got a temporary diagnostic (API-05b) in `probe-time-bound.ts` to see the timer's real firing time and the child's exit; restored.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-follow-ups-576/tickets/in-progress/memory-follow-ups-576/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery`
- Proportional test-code review decision: not this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `56c61c3ecb` (code `8850dc3f99` + `570aab87d2`) | macOS 26.5.2 ARM64, shared host, load 8–88 | Node v22.23.1; server `dist/` built at API-00 | `env -i PATH HOME=<temp> TMPDIR USER`; `fseventsd` 152–209% CPU, 24 GB resident; a raw `fs.watch` got its write event in 1.8–6.0 s or not within 30 s (measured before each run) |
| ENV-2 | same | same | rendered probe: built server, Nuxt dev, Chrome (Playwright) | probe-owned data |
| ENV-3 | same | same | isolated desktop instance of this worktree (`isolated-app start --build`, `electron-dist/mac-arm64/AutoByteus.app`), driven over its CDP port with Playwright | own data root, seeded `server-data/memory/semantic-global/{index.md,b/c.md}` and `memory/outside.md`; stopped, data root removed |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log` | `Sanitized built-module/bootstrap smoke passed`, `exit 0` | — |
| API-01 | AC-001 (S-1) | IC-03, a bundled member at 274 bytes | `test:integration:prepare`; `env -i … vitest run tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` | ENV-1 | Pass | `API-01-ac001-ic03.log` | after prepare: `Tests  3 passed (3)`, `✓ IC-03` | first run: `Brief Studio importable package missing` (setup, not product); unit AC-001 reused IMP-01 |
| API-02 | AC-005 | `package-personal-settings` | the file alone, three times | ENV-1 | Pass | `API-02-ac005-personal-settings-x3.log` | three times `Tests  7 passed (7)`, `exit 0`; `fseventsd` 152–159% | — |
| API-03 | AC-006 | SM-12 (scripted AGY) as `normy` uid 501 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs vitest run tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` | ENV-1 | Pass | `API-03-ac006-sm12.log` | rerun `Tests  10 passed (10)`, `✓ SM-12` | first run: SM-04 failed and its error was not captured (my log filter kept only the test line); rerun 10/10. AGY discovery uses the probe bound of API-05: recheck after the fix |
| API-04 | AC-007 | DCF-E2E-007 (scripted AGY) | the live-refresh file alone, three times | ENV-1 | **Not Proven (environment)** | `API-04-ac007-live-refresh-x3.log` | each run `Error: ENVIRONMENT: the OS delivered no file event for agents/apar-fresh-scout within 30000 ms`; before each run the raw `fs.watch` measurement `no event in 30000ms` | the test now fails for the right reason: the OS delivered no event, measured independently of the product before every run (`fseventsd` 160–167%). DCF-E2E-002/-003 end the same way on the same waits. The cause (REQ-007) is recorded with evidence by IMP-08, which also passed the file on Linux |
| API-05 | **AC-008 / REQ-008** | the Grok and AGY probes under load (S-3) | `grok-build-runtime-replay`, `grok-build-compaction-replay`, `own-stream-turns-read-once` (scripted AGY), each alone; the Grok catalog test repeated with a temporary diagnostic | ENV-1 | **Fail** | `API-05-ac008-probes-under-load.log`, `API-05b-grok-catalog-bound-diagnostic.log` | `× lists the Grok Build catalog…`, `Grok Build model discovery timed out`; diagnostic run 2: `PTBDIAG {"command":"fake-grok-cli-…/grok --version","boundMs":3000,"firedAfterMs":7720,"exitCode":null,"exitSeenAt":null}` then `PTBDIAG-LATER {…"exitSeenAt":7730,"exitCode":0…}` | compaction replay 3/3 and own-stream 2/2 pass; see Preliminary Classification |
| API-06 | all (server) | whole server unit suite | `env -i … pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-06-server-unit-suite.log` | `Test Files  1039 passed \| 5 skipped (1044)`, `Tests  8626 passed` | the probe unit tests pass: they do not build the failing order |
| API-07 | all | server integration | — | — | Next Round | — | — | after the fix |
| API-08 | all | whole server E2E | — | — | Next Round | — | — | after the fix |
| API-09 | AC-002, AC-003 | whole web unit suite | `env -i … pnpm -C autobyteus-web test:nuxt run`, then `test:electron run`; the failing file alone twice | ENV-1 | Pass for this change | `API-09-web-unit-full.log` | nuxt `Test Files  790 passed (790)`, `Tests  5954 passed`; electron `1 failed \| 535 passed`; alone `Tests  11 passed (11)` twice | `PortOwnerInspectorFaults` "real 1000ms deadline": `ENOENT … child-pid` at line 81: the shell child was killed by its 1000 ms deadline before writing its receipt under suite load (the hazard its comment names); no Electron file changed in this ticket |
| API-10 | AC-001, AC-002, REQ-007 of 554 | rendered probe | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir evidence/API-10-probe` | ENV-2 | Pass | `API-10-rendered-probe.log`, `API-10-probe/evidence.json`, `API-10-probe/FU-002-*.png` | `Pass (41/41 checks)`; SMV-100 `"encodedBytes": 274` shortened; SMV-103/104/105 `True`; SMV-091 only `chat-workspace-option-temp` | — |
| API-11 | AC-002 (S-2) | the desktop app | `isolated-app start --build --data-root <own, seeded>`; Playwright over CDP: Memory → Global → `index.md` → links; `isolated-app stop` | ENV-3 | Pass | `API-11-desktop-journey.log`, `API-11-desktop/evidence.json`, `API-11-desktop/EL-*.png` | `desktop journey: Pass (5/5 checks)`; EL-003 `{"navigations":[],"url":"#/memory?view=home&section=browse&node=global"}`; stop `"controlPortReleased": true`, `"serverPortReleased": true`; `data root removed: yes`; `instance still listed: 0` | in Electron the click reaches the renderer's handler and the window never navigates; the linked file opens in a preview tab, a missing one shows the viewer's message, a link out of the folder opens nothing |
| API-12 | — | typechecks | Reused IMP-09, IMP-10 (`8850dc3f99`; since then a comment reflow and docs) | — | Pass (reused) | handoff | baselines 1006/315 and 86/36 | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-01 (reused), API-01 (IC-03), API-10 (SMV-100 at 274 bytes) | Proven | — |
| AC-002 | Yes | IMP-06 (reused), API-09, API-10 (SMV-103…105), API-11 (desktop) | Proven | — |
| AC-003 | Yes | IMP-05 (reused), API-09 | Proven | — |
| AC-004 | — | — | Not applicable this round (DEC-004 waits for the founder) | the founder's decision |
| AC-005 | Yes | API-02 | Proven (three passes alone on this host) | — |
| AC-006 | Yes | API-03 | Proven (normal user; regular-file setup) | — |
| AC-007 | Yes | API-04, IMP-08 | **Not Proven** on this host: the OS delivered no file event in 30 s in every run, measured independently; the cause is recorded (IMP-08) and the file passes on Linux (IMP-08) | — |
| AC-008 | Yes | IMP-02 (reused, unit), API-05 | **Fail**: under load the bound reports a time-out for a child that had exited (see below) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 60% | 60% | AC-001…AC-003, AC-005, AC-006 proven | AC-008 fails in its real-world case; AC-007 not reachable on this host | the fix; a healthy host or an agreed Linux proof for AC-007 |
| Changed-boundary execution directness | 85% | 90% | real server, real page, real desktop app | integration and E2E suites next round | API-07, API-08 |
| Cross-boundary integration realism and mock gap | 80% | 85% | scripted CLIs through real child processes | the probe unit tests miss the blocked-loop order | a unit that builds it |
| Environment, configuration, identity, and fixture fidelity | 85% | 85% | clean env, own data, isolated instance | FSEvents unusable on this host (measured) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 60% | 60% | missing and out-of-folder links; real time-outs reported as time-outs | an exited child still read as a time-out | the fix |
| User-surface, browser, and desktop-shell confidence | 95% | 96% | probe 41/41; desktop journey 5/5 | mobile file viewer not rendered (same component) | — |
| Durable regression coverage quality and relevance | 80% | 80% | each item has durable tests | AC-008's unit misses the failing order | a unit for it |

- Overall final confidence: 79% (simple average)
- Every critical acceptance criterion directly proven: `No` (AC-007, AC-008)
- Any final applicable category below `90%`: `Yes`
- Default target met: `No`

## Broader Validation Decision (Mandatory)

- Decision: `Required`; executed: rendered probe, isolated desktop instance; server integration and E2E next round
- Browser validation needed: yes; done (API-10)

## Persisted-Data Transition Checks

- FU-009 `Not Affected` (554 unreleased); API-01 and API-10 run with the 255 rule; no fallback observed

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

None this round (the implementation added the item tests; reviewed as listed above).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Grok, AGY CLIs | scripted fakes as real child processes | the probes' child-process handling is what is tested | none for this failure: it reproduces with the fakes |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `probe-time-bound.ts` diagnostic (API-05b, and one earlier passing run) | Yes | file copied back | restored (`git diff` of `src` empty) |
| targeted-run, Grok diagnostic and desktop scripts in `/tmp` | Yes | `rm` | removed |
| isolated desktop instance `iso-60023-8603` and its data root | Yes | `isolated-app stop`; `rm -rf` | stopped (ports released), root removed, not listed |
| `electron-dist/` in the worktree | Yes (build output of `--build`) | left (ignored build output) | — |
| Brief Studio importable package (`test:integration:prepare`) | Yes | left (ignored build output the e2e files need) | — |

## Preliminary Classification (On `Fail`)

- **Failing case:** API-05, `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` › "lists the Grok Build catalog from the agent handshake with the reasoning-effort schema (AC-002)". Criterion: AC-008 / REQ-008 ("when their time bound fires after the child has already exited, wait for its `close` and use its real result").
- **Reproduce:** `pnpm -C autobyteus-server-ts build` once, then on a loaded host `env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" USER="$USER" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts --no-watch -t "lists the Grok Build catalog"` (failed 1 of 2 runs here, also once in API-05).
- **Expected:** the fake `grok --version` exits 0 at once; the catalog is listed.
- **Observed:** `Grok Build model discovery timed out`, logged `RUNTIME_PROBE_TIMED_OUT { runtime: 'grok', command: '…/fake-grok-cli-…/grok --version', boundMs: 3000 }`. The diagnostic shows the 3,000 ms timer ran at **7,720 ms** (the main thread was blocked for over 4.7 s), saw `exitCode: null`, and the child's `exit` event (code 0) was processed **10 ms later**, at 7,730 ms.
- **Why:** `child.exitCode` is set only when Node processes the child's exit. When the event loop is blocked past the bound (the server's folder watchers on this busy host, TESTING.md "File watching on a busy Mac"), the timer and the pending exit are both waiting; the timer runs first and sees `null`, so a child that had already exited is killed and reported as timed out. This is the real-world case FU-008 targets (the 554 catalog failure). The unit tests (IMP-02) set `exitCode` before the timer or hold stdout open, so they never build this order.
- **Preliminary classification:** `Design Impact`. The design prescribes the mechanism ("the bound's timer checks `child.exitCode !== null || child.signalCode !== null`"), and that check cannot see an exit Node has not processed yet; the implementation follows it (moved to one owner). What the bound does when its timer fires late (for example, yield to pending I/O before deciding, or measure lateness) is a design choice that REQ-008 needs.
- **Recommended owner:** failure-origin review by `/code_reviewer`, then the Solution Designer.
- **Also for the owner (not a failure of the code):** AC-007 asks for three passes "on this host", whose OS file events are not delivered at all (measured before each run). The test now reports `ENVIRONMENT` correctly; whether AC-007 is met by IMP-08's Linux pass or waits for a healthy host is a requirement question.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-008 (fails), AC-007 (environment, see above)
- Next Round: API-07, API-08; AC-008's real-world case again (API-05) and SM-04 (API-03) after the fix
- Next recipient from `get_handoff_rules`: `/code_reviewer` (failure-origin review)
- Follow-ups: FU-001 (implementation's, unchanged)
