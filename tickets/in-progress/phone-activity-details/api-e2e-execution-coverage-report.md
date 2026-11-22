# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; `/implementation_engineer` IR-001 (direct route), tree `f411294735`
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: WS-1 first attempt stopped at setup (my build order: the demo build replaced `autobyteus-web/dist/public`, which the probe nodes serve); rebuilt the phone bundle and reran. FS-1 is `Next Round`: the round fails and the fix changes the shared summary.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details/tickets/in-progress/phone-activity-details/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (on this `Fail`, the failure-origin review sees the added cases MSP-97/MSP-98)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `f411294735` + my uncommitted probe cases (MSP-97/98, `root` passed to the cases) | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | server `dist` and phone bundle built from this tree; Chrome (Playwright) 390×844, touch | clean env `env -i PATH HOME=/private/tmp/api590/home TMPDIR=/private/tmp/api590/tmp/`; probe-owned nodes and data roots; scripted AGY CLI |
| ENV-2 | same | same | same; node `lambda` with the test vault (`AUTOBYTEUS_TEST_VAULT=/Users/normy/.autobyteus-test/vault`, read-only), native runtime, `gpt-5.4-mini` | `RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1`; only lambda reads the vault |
| ENV-3 | same | same | `build:mobile-web --demo` output `dist-mobile-demo/` (13M) present | — |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-1 | AC-001 (decision 1) | Summary keys vs. the node's AGY argument names | Read `utils/toolDisplaySummary.ts` (keys), `agy-stream-event-converter.ts:199-208` (arguments pass through), `agent-work-journal/rendering/runtimes/antigravity-translation.ts` (AGY tools and arguments), `tests/fixtures/agy-native-arguments-turn.mjs` | ENV-1 | Fail | `evidence/api-e2e/CR-1-agy-argument-names.md` | `write_to_file`/`replace_file_content` → `TargetFile`; `grep_search` → `Query`, `SearchPath`; `find_by_name` → `Pattern`, `SearchDirectory`; `list_dir` → `DirectoryPath` — none a summary key | `CommandLine`, `Path`, `AbsolutePath` are right; the claim "the only AGY argument names the node's code and recordings show" is not |
| CR-2 | AC-006 | No `contextText` in the web app | `grep -rn contextText` over web source (no build outputs) | ENV-1 | Pass | — | only `services/runHydration/__tests__/runProjectionActivityHydration.spec.ts` (node input; asserts `not.toHaveProperty('contextText')`) | — |
| B-1 | prerequisite | Server dist, phone bundle | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | ENV-1 | Pass | `evidence/api-e2e/B-1-builds.log` | `server exit 0`; `The /mobile build holds no demo code.`; `mobile exit 0` | — |
| MSP-94 | AC-001, AC-002, AC-003, AC-004, REQ-006 | Phone rows/details (scripted AGY `mcp_calls`), en-US + zh-CN | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/api590/msp-94-97 --cases=MSP-94,MSP-95,MSP-96,MSP-97` | ENV-1 | Pass | `evidence/api-e2e/MSP-94-97-round1/` | `[mobile-shell] MSP-94 Pass`; `MSP-94-activity-rows.png` | also Pass in the second run (`MSP-94-98-first-run/`) |
| MSP-95 | AC-004 | Compaction details (`auto_compaction`) | same run | ENV-1 | Pass | same | `MSP-95 Pass`; `MSP-95-compaction-details.png` | — |
| MSP-96 | AC-001, AC-003, AC-005 (decision 2) | AGY background task unfold; running call's details change live | same run | ENV-1 | Pass | same | `MSP-96 Pass`; `MSP-96-background-task-expanded.png` | decision 2 confirmed: the title unclamps on expand (`whitespace-pre-wrap`) |
| MSP-97 | AC-001 (decision 1) | Phone rows for AGY's own tools (`native_arguments`) | same run | ENV-1 | Fail | `evidence/api-e2e/MSP-94-97-round1/MSP-97-native-tool-rows.png`, `mobile-shell-probe.json` | `MSP-97 Fail: AC-001 an Antigravity write_to_file row shows its file (TargetFile); AC-001 an Antigravity replace_file_content row shows its file (TargetFile)`; rows `write_to_file` / `replace_file_content` ×2 / `grep_search` / `find_by_name` / `list_dir` with `"summary":null`; `view_file` → `workspace/marker.txt`, `run_command` → `printf NATIVE_ARGUMENTS_PREFIX_VERIFIED` | F-1. Same result in the second run |
| MSP-98 | AC-003 (logs grow while open) | Phone details of a running native `run_bash` (real model) | `env -i … AUTOBYTEUS_TEST_VAULT=/Users/normy/.autobyteus-test/vault RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1 pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/api590/msp-98 --cases=MSP-98` | ENV-2 | Pass | `evidence/api-e2e/MSP-98-live-tool-logs/` | `MSP-98 Pass`; `MSP-98-live-logs-running.png` "Running", "Logs (1)"; `MSP-98-live-logs-ended.png` "Success", "Logs (3)" with `[TOOL_RESULT] exitCode: 0` | First run failed on my assertion (one-line match on a multi-line log entry; `MSP-94-98-first-run/`), the behavior was already right: 2 lines while running → 33 after |
| TC-1 | AC-007 | Nuxt type project with `dist-mobile-demo/` present | `pnpm -C autobyteus-web build:mobile-web --demo`; `/usr/bin/time -l pnpm -C autobyteus-web typecheck` | ENV-3 | Pass | `evidence/api-e2e/TC-1-demo-build.log`, `TC-1-typecheck-with-demo-build.log` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`; `3814735872  maximum resident set size`; `13M	autobyteus-web/dist-mobile-demo` | — |
| TD-1 | AC-007 | TESTING.md sentence | `git diff 0da6bfbfc1..HEAD -- TESTING.md` | ENV-1 | Pass | — | the "remove it before the typecheck" sentence is gone from the GraphQL/demo row | committed with `nuxt.config.ts` in `767cb3b61a`, not alone as `docs(testing): …` (F-2) |
| U-1 | AC-001…AC-006 (unit) | Whole web unit suite, typecheck, guards | Reused: IMP-03 | — | Pass (reused) | — | — | Tree unchanged since `597f2dc6d6` except docs and my probe files |
| DP-1 | AC-006 | Desktop Activity parity | Reused: IMP-02 | — | Pass (reused) | — | — | desktop components unchanged since `60ee161388` |
| WS-1 | Regression (every case; row markup changed) | Whole `test:e2e:mobile-shell` | `env -i PATH="$PATH" HOME=/private/tmp/api590/home TMPDIR=/private/tmp/api590/tmp/ pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/api590/ws-1` | ENV-1 | Fail (outside this ticket, apart from MSP-97) | `evidence/api-e2e/WS-1-whole-mobile-shell/` | 96 cases, 93 Pass; `MSP-97 Fail` (F-1); `MSP-44 Fail` / `MSP-45 Fail: locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded … a[href="other.md#x"]`; `MSP-98 skipped: set RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1 …`; `unknownBrowserErrors` 0 | First attempt `WS-1-setup-abort/`: `Error: alpha serves the phone bundle at /mobile` (my build order). MSP-44/45: see WS-2 |
| WS-2 | Cause of MSP-44/45 | Heading-links cases alone | same with `--cases=MSP-44,MSP-45 --output-dir=/tmp/api590/msp-44-45`; code read of `mobile-heading-links-cases.mjs` `followNothing` and `8c3810df95` | ENV-1 | Fail (reproduces; base cause) | `evidence/api-e2e/MSP-44-45-alone/` | both fail the same way alone; `followNothing` clicks `other.md` and then looks for `other.md#x` in the same viewer | Since autobyteus-576 (`8c3810df95`, in this base) a relative link in a workspace file's or skill's Markdown preview opens the linked file, so after `other.md` the viewer shows another document and the next link is not there. The cases still assert the pre-576 "a link with no scheme does nothing". This ticket touches neither the renderer nor the previewer: a follow-up (FU candidate), not this ticket |
| FS-1 | build input `nuxt.config.ts` | Fresh-start build | — | — | Next Round | — | — | after the fix |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-94, MSP-96 (pass); MSP-97, CR-1 (fail) | Not Proven | — (F-1: AGY `write_to_file` / `replace_file_content` rows, and the same calls' conversation tool cards, show no file) |
| AC-002 | Yes | MSP-94, MSP-97 (status parts pass), U-1 | Proven | — |
| AC-003 | Yes | MSP-94 (open, Back scroll), MSP-96 (live status), MSP-98 (Logs grow while open), U-1 | Proven | — |
| AC-004 | Yes | MSP-94 (failed call's full error), MSP-95, U-1 | Proven | — |
| AC-005 | Yes | MSP-96, U-1 | Proven | — |
| AC-006 | Yes | DP-1, U-1, CR-2 | Proven | — |
| AC-007 | Yes | TC-1, TD-1 | Proven | — |
| DEC-005 (physical phone) | No | — | Accepted Unverified Risk (DEC-005) | no device; the production phone bundle is the phone evidence |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 80% | MSP-94…98, TC-1, TD-1, CR-2, U-1, DP-1 | AC-001 not met for AGY file tools (MSP-97, CR-1) | F-1 fixed; MSP-97 passing |
| Changed-boundary execution directness | 92% | 95% | MSP-94…98 on the production phone bundle with built nodes | — | — |
| Cross-boundary integration realism and mock gap | 88% | 93% | scripted AGY with real step shapes; MSP-98 with a real model and native runtime | Codex TOOL_LOG not exercised | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | clean env, own nodes, test vault read-only | FS-1 not yet run (build input changed) | FS-1 next round |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 92% | MSP-94 failed call, MSP-96 terminate while open, MSP-98 live logs | — | — |
| User-surface, browser, and desktop-shell confidence | 88% | 85% | phone rows/details screenshots; DP-1 | AGY file-tool rows empty (MSP-97); physical device (DEC-005) | F-1 fix |
| Durable regression coverage quality and relevance | 90% | 93% | MSP-97, MSP-98 added | MSP-98 gated (real model) | — |

- Overall post-repository confidence: 89%
- Overall final confidence: 89.7% (mean of the seven final scores)
- Calculation method: mean of the final category scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `No` (AC-001)
- Any final applicable category below `90%`: `Yes` — requirement proof (80%), user surface (85%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1; FS-1 not run

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (production phone bundle in headless Chrome, 390×844) and `Live API` (MSP-98, test vault)
- Confidence gap or residual risk it addresses: real runtime argument shapes and real TOOL_LOG timing on the phone
- Browser validation needed: yes; the change is the phone's Activity UI
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed: reused IMP-02 (desktop Activity parity) and the unit suite; the desktop components only read the new builders. No Electron shell change.
- Effect on any already-running desktop application: `None` (the user's AutoByteus app on port 29695 and `~/.autobyteus` were not touched)
- Behavior not directly proven: the conversation tool card for an AGY `write_to_file` has the same gap as the phone row (shared summary; CR-1); not run in a desktop window

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-activity-details-cases.mjs` MSP-97 | Added | MSP-97 | — |
| `autobyteus-web/tests/e2e/mobile-activity-details-cases.mjs` MSP-98 (gated `RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1` + test vault) | Added | MSP-98 | — |
| `autobyteus-web/tests/e2e/mobile-activity-details-cases.mjs` `withNodeAndPhones` (optional launch/tools/instructions/reply timeout; `say`) | Updated | MSP-94…98 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (passes `root` to the activity cases) | Updated | MSP-97 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (failure-origin review)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted `agy-failure-cli.mjs` (`mcp_calls`, `auto_compaction`, `linked_skills`, `native_arguments`) | no real AGY account in tests; the cases replay real step shapes | argument shapes as the node's fixtures record them |
| Phone | headless Chrome 390×844 on the production phone bundle | no device (DEC-005) | WebView rendering |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/api590` (HOME, TMPDIR, probe outputs, logs) | Yes | kept until the ticket closes; removed when the Solution Designer asks | kept |
| Probe nodes alpha, beta, iota, theta, kappa, lambda and their browsers | Yes | stopped by the probe | stopped (no `mobile-shell-probe` or `dist/app.js` process of this worktree left) |
| `autobyteus-web/dist-mobile-demo/`, `dist/public` | Yes (rebuilt) | ignored build outputs; `dist/public` holds the phone bundle again | left |

## Preliminary Classification (On `Fail`)

- `Local Fix` — owner: implementation engineer.
  - **F-1** (AC-001, REQ-001): the shared summary does not read Antigravity's `TargetFile` (`write_to_file`, `replace_file_content`), so those rows (and conversation tool cards) show only the tool name. `grep_search` (`Query`, `SearchPath`), `find_by_name` (`Pattern`, `SearchDirectory`) and `list_dir` (`DirectoryPath`) show nothing either; whether those get a summary (text/folder) is the implementer's call within REQ-001 ("its file, its text argument"). The handoff's claim that `CommandLine`/`Path`/`AbsolutePath` are the only AGY argument names is not what the node's own AGY translation shows (CR-1). Acceptance: MSP-97 passes; a `toolDisplaySummary.spec` case for `TargetFile`.
  - **F-2** (process, minor): the TESTING.md change is committed together with `nuxt.config.ts` in `767cb3b61a`; TESTING.md says to commit it on its own as `docs(testing): <reason>`.
- Outside this ticket (follow-up candidate for the Solution Designer): MSP-44/MSP-45 stale since autobyteus-576 (WS-2).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: AC-001 not proven (F-1); physical phone `Accepted Unverified Risk (DEC-005)`
- Evidence decisions requested: `None` (AC-003's live logs were proven on a real runtime, MSP-98)
- Preliminary classification and recommended owner: `Local Fix` (F-1, F-2) → implementation engineer, through the failure-origin review
- Next recipient from `get_handoff_rules`: `/code_reviewer`
- Notes: decision 1 is right for the keys it adds and incomplete; decision 2 confirmed (MSP-96). Next round: MSP-97 and the whole `test:e2e:mobile-shell` after the fix, MSP-98 with its gate, FS-1 fresh-start build, U-1 rerun.
