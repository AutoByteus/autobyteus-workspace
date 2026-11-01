# API/E2E Execution Coverage Report — test-and-tooling-hygiene-318 (autobyteus-318)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md`, `API-REV-001`; progress log `api-e2e-test-progress.md`
- Round and trigger: round 1, CRR-001 pass
- Deviations from the plan:
  - API-05's script ran `prompt-builder.test.ts` under the server path; it belongs to `autobyteus-ts` and was rerun there (recorded in the same log).
  - API-06's first `project-manager-ux` run passed but my clean-up removed its `evidence.json` before copying; run 2 kept it.
  - API-07: `token-usage-runtime-graphql.e2e.test.ts` needs its own gate `RUN_RUNTIME_TOKEN_USAGE_E2E=1` (IMP-12's header shows it as "…"); rerun with it and `-t "autobyteus-lmstudio-qwen35"` so no paid Codex/Claude case runs.
  - The full server e2e waited 270 s for another team's parallel vitest run to finish (load 134 → 24), per TESTING.md's one-heavy-run rule.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318/tickets/in-progress/test-and-tooling-hygiene-318/evidence/` (files `API-*`)

## Routing Classification

- Task size `Large`, architectural risk `Low`, input route `Reviewed`, successful-output route `Code Review`, test-code review `Required` (proportional; API/E2E changed no durable test code).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `7c04283722` (last code `ab0027a398`) | macOS 26.5 arm64 | fresh clone `$TMPDIR/ab318-clone.94OVpE6TRY/repo` of the branch: `pnpm install --frozen-lockfile` (no Electron `dist/` afterwards), server `prebuild` + `build`, `test:integration:prepare`; Node 22.23.1, pnpm 10.28.2 | clean env (`env -i PATH HOME=<resolved temp> TMPDIR`) for e2e and gated suites; scripted AGY CLI; LM Studio `qwen/qwen3.6-35b-a3b` (loaded by the run, unloaded after); other teams' parallel runs at times (load noted per case) |
| ENV-2 | `7c04283722` | same | the worktree (AC-014 probe refusals) | — |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-002, AC-003/004 (suites), AC-012 (T-35, T-36), AC-016 (worktree suites) | — | Reused: IMP-24, IMP-25 | (IMP) | Pass | (IMP) | (IMP) | ran on `ab0027a398`, the final code, after the merge |
| API-02 | AC-016, AC-005, AC-001, AC-002, AC-004, AC-010, AC-011, AC-006 (unit/integration parts) | fresh clone, documented order | clone; `pnpm install --frozen-lockfile`; `ls …/electron/dist` (absent); `grep @nuxtjs/apollo` (0); `pnpm -C autobyteus-server-ts prebuild`, `build`, `test:integration:prepare`; `pnpm -C autobyteus-web typecheck`; `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web test:electron --run`; `pnpm -C autobyteus-server-ts test:unit`; `test:integration`; `pnpm -C autobyteus-web test:nuxt --run` | ENV-1 | Pass (FU-004 out of scope) | `API-02-fresh-clone.log` | install `exit: 0`; `ls: …/electron/dist: No such file or directory`; `@nuxtjs/apollo` count 0; web gate `[typecheck] cross-package tests (tsconfig.cross-package-tests.json): 0 errors`, `production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `PASS`; server gate `server src (tsconfig.build.json): 0 errors`, `test-file errors: 1200 in 370 files (baseline 1200 in 370 files)`, `PASS`; `test:electron`: `Downloading Electron binary...` once, `Test Files  51 passed \| 1 skipped (52)`; unit `Test Files  912 passed \| 5 skipped (917)`; integration `Tests  4 failed \| 495 passed \| 69 skipped`; nuxt `Test Files  682 passed (682)` | the 4 integration failures are exactly FU-004 (3 in `agent-run-service.integration.test.ts`, 1 in `agent-team-run-manager.integration.test.ts`), pre-existing at base and recorded by implementation and code review; out of scope. `file-system-watcher.integration.test.ts` passed inside this full run (AC-011) |
| API-03 | AC-010, AC-001, QR-001 | gate negatives | in the clone, each reverted: (a) a call to the removed `ClaudeSdkClient.openStreamingSession` appended to a baselined server test and in a new test file → server gate; (c) `typecheck:update-baseline` with (a) present; (b) a type error in `acceptedInputIdentity.spec.ts` → web gate; (d) a type error in a server `src` file → server gate | ENV-1 | Pass | `API-03-gate-negative-checks.log` | (a) `new test file with errors: tests/unit/zz-api03-removed-method.test.ts (1)`, `more errors than the baseline: …claude-sdk-client.test.ts (19, baseline 18)`, `FAIL`; (c) `FAIL: the baseline only shrinks…`, `baseline unchanged: yes`; (b) `cross-package tests …: 1 errors`, `new test file with errors: services/runHydration/__tests__/acceptedInputIdentity.spec.ts (1)`, `FAIL`; (d) `server src (tsconfig.build.json): 1 errors`, `FAIL`; `git status --short: ''` after each | observation: (d) prints `production errors: 2` for one error, because the tests project also compiles `src` (the error is counted once per project); the gate fails correctly |
| API-04 | AC-014 | probe output dir | each probe importing `probe-output-dir.mjs` (`agent-runtimes-settings`, `diagram-zoom-viewer`, `embedding-settings`, `integrations-page`, `internal-agents`, `model-routing-settings`) with a folder holding `result.json` and `shots/a.png`: `node tests/e2e/<probe>-probe.mjs --skip-server-build --output-dir=<dir>` | ENV-2 | Pass | `API-04-probe-output-dir-refusal.log` | each `exit 1`, `folder unchanged: yes (files 2)`, `Refusing to write probe evidence into …: it is not empty (2 entries), and earlier evidence is never overwritten. Pass a fresh --output-dir…` | six is the full set: the handoff's seventh (the GitHub-card probe) was removed by the `origin/personal` merge and replaced by the integrations-page probe |
| API-05 | AC-012 (AE-006), AC-006 (paid suites load), AC-006 (T-46), AC-008 (T-28, T-47, T-30, T-53), AC-013, AC-009 | full server e2e; gated scripted suites; timing reruns | clean env from the clone: `pnpm test:e2e`; then `/tmp/ab318s/gated.sh` (kept as `API-05-gated-and-timing-reruns.sh.txt`): `RUN_CONTEXT_FILE_PROCESS_E2E=1` T-46; `RUN_AGY_FAILURE_E2E=1` + scripted CLI T-28 ×2 with window evidence; QR-001 ×10; T-47 `-t "one run per burst"` ×20; T-30/T-53 files; T-27's 11 files each with a fresh empty `TMPDIR` | ENV-1 | Pass | `API-05-full-server-e2e.log`, `API-05-gated-and-timing-reruns.log`, `API-05-t28-run1-window.json`, `API-05-t28-run2-window.json` | e2e `Test Files  113 passed \| 110 skipped (223)`, `✓ tests/e2e/token-usage/gemini-native-pricing-graphql.e2e.test.ts (5 tests)`; T-46 `Tests 6 passed (6)`; T-28 `Tests 1 passed (1)` ×2, `quietShutdownMs` 60028–60042, `shutdownAfterEndMs` 60124–60152 (bounds [59750, 75000]); QR-001 10 × `Tests 6 passed \| 1 skipped (7)`; T-47 20 × `Tests 1 passed \| 7 skipped (8)`; T-30/T-53 `Tests 12 passed (12)`; T-27 each file passes and leaves only `node-compile-cache` | `node-compile-cache` is pnpm's own cache (an empty-`TMPDIR` `pnpm -v` creates it; `node -e 1` does not): no test leaves a folder. The 110 skipped e2e files are gated suites, the ported paid suites among them (load and skip) |
| API-06 | AC-012 (T-33, T-34) | run-first probes | from the clone: `node tests/e2e/projects-feature-probe.mjs --skip-server-build --output-dir=<fresh>`; `node tests/e2e/project-manager-ux-probe.mjs …` (run 2 keeps its evidence) | ENV-1 | Pass | `API-06-run-first-probes.log`, `API-06-projects-feature-result.json`, `API-06-project-manager-ux-evidence.json` | projects-feature `result Pass \| cases 17 \| pass 17`, cleanup all terminated, ports released; project-manager-ux `result Pass \| cases 25 \| pass 25 \| browserErrors 0`, PMU-021 `Pass` | |
| API-07 | AC-006 (T-54) | LM Studio suites | `RUN_LMSTUDIO_E2E=1` (+ `RUN_RUNTIME_TOKEN_USAGE_E2E=1 -t "autobyteus-lmstudio-qwen35"` for the token-usage file), one at a time; LM Studio had nothing loaded before; the run's model unloaded after | ENV-1 | Pass | `API-07-t54-lmstudio.log` | `autobyteus-team-runtime-graphql.e2e.test.ts … Tests 5 passed (5)`; `autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts … Tests 4 passed (4)`; token usage `Tests 1 passed \| 3 skipped (4)`, `✓ persists token usage from a real autobyteus-lmstudio-qwen35 runtime turn…`; `after unload: No models are currently loaded.` | |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-02 (cross-package project 0 errors), API-03 (b) | Proven |
| AC-002 | Yes | API-02 (99 in 43; none in components/services/stores per IMP-24), API-01 | Proven |
| AC-003 | Yes | API-01 (IMP-07, IMP-25), API-02 (nuxt and Electron suites) | Proven |
| AC-004 | Yes | API-02 (frozen install, 0 matches, gate and suites pass) | Proven |
| AC-005 | Yes | API-02 (no `dist/` after install; one download; 51 files pass on the first run) | Proven |
| AC-006 | Yes | API-02 (unit), API-05 (T-46; paid suites load and skip in the full e2e), API-07 (T-54), API-01 | Proven |
| AC-007 | No | API-01 (IMP-14), API-02 (suites) | Proven |
| AC-008 | Yes | API-05 (T-28 windows, T-47 20/20, T-30/T-53), API-01 (IMP-17 for T-37) | Proven |
| AC-009 | No | API-05 (T-27, 11 files) | Proven |
| AC-010 | Yes | API-02, API-03 (a), (c), (d) | Proven |
| AC-011 | Yes | API-02 (watcher file passes in the full integration run); latency measurement IMP-21 | Proven |
| AC-012 | Yes | API-06 (T-33, T-34), API-01 (T-35, T-36 via IMP-24), API-05 (AE-006) | Proven |
| AC-013 | Yes | API-05 (QR-001 10/10) | Proven |
| AC-014 | Yes | API-04 (6/6) | Proven |
| AC-015 | No | the implementation handoff's per-item table (read) | Proven |
| AC-016 | Yes | API-02 + API-05 + API-07 | Proven, except FU-004's 4 pre-existing integration cases (out of scope) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | every AC proven on a fresh clone or the final code | FU-004 (pre-existing, out of scope) | FU-004 |
| Changed-boundary execution directness | 90% | 97% | the package scripts and probes themselves, from a fresh clone | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | full server e2e, scripted AGY CLI, LM Studio, real probes | paid suites only load (DEC-011) | user-approved paid runs |
| Environment, configuration, identity, and fixture fidelity | 90% | 96% | fresh clone with no build outputs; clean env; fresh `TMPDIR` per run | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 96% | four gate negatives; probe refusals; timing reruns 10/10, 20/20 | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI change; probes run as regression | — | — |
| Durable regression coverage quality and relevance | 90% | 95% | gate spec (IMP-01), repaired tests, the new server gate | — | — |

- Overall final confidence: 95.8% (simple average of the six applicable categories); no category below 90%; every critical criterion proven (AC-016 apart from FU-004's out-of-scope cases).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Mode: `CLI` (fresh clone, package scripts), `Browser` (probes), `Worker or Distributed` (scripted runtimes, LM Studio). Browser beyond the probes: not needed (no UI change).

## Compatibility / Legacy Scope Check

No compatibility or legacy behaviour in scope; removals (transcription URL, `@nuxtjs/apollo`, the one-off typecheck config) confirmed.

## Durable Coverage Changed In The Codebase

None by API/E2E.

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| fresh clone `$TMPDIR/ab318-clone.94OVpE6TRY` | Yes | `rm -rf` | removed |
| gate injections | Yes | `git checkout` / `rm` | `git status` empty after each |
| probe output folders, run `TMPDIR`s, temp HOMEs, `/tmp/ab318s` | Yes | removed | removed; no `autobyteus-web/test-results/` in the worktree |
| LM Studio model loaded by API-07 | Yes | `lms unload` | `No models are currently loaded.` |

## Observations (non-blocking)

- The server gate counts one `src` error twice in its summary (`production errors: 2`), because the tests project compiles `src` as well; it still fails, so no rule is broken. Code review may judge whether the summary should count by file and line.
- IMP-12's header elides `RUN_RUNTIME_TOKEN_USAGE_E2E=1`, which the token-usage file needs.
- The handoff counts seven probes on the output-dir helper; after the merge there are six (the seventh was removed and replaced by the integrations-page probe, which uses it).

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None` (AC-016 apart from FU-004's pre-existing cases, out of scope; paid suites not run by DEC-011)
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (Pass, Large: proportional test-code review)
