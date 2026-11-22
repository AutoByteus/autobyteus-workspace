# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 2; `/implementation_engineer` IR-002, the Local Fix for CRR-001 (`70f7040ee1` F-1; F-2 history split), tree `3de03fef6e`, tested with my MSP-97 update at `648a8e0299`
- Prior round reviewed: round 1 (API-REV-001, Fail: F-1, F-2). Round 1 tested `f411294735`; after the F-2 rewrite its tree equals `b39c109265` (hash map in `implementation-handoff.md`); round-1 rows below keep the hashes they ran on
- Deviations from the investigation's plan, and why: RR-1 (build-only Desktop Release run) added: the 586 change edits what the web typecheck gate reads, including a Windows-only folder (RELEASE.md "Build-only release run", DESIGN.md rule 12). U-1 overlapped another agent's page-load measurement (other repository) for about 5 minutes; my later heavy runs waited for theirs to end
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details/tickets/in-progress/phone-activity-details/evidence/api-e2e/` (round-2 folders start with `R2-`, plus `FS-1-fresh-start-build.log`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (the code reviewer read MSP-97/98 in the failure-origin review, CRR-001)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `648a8e0299` (round 1: `f411294735` + my then-uncommitted MSP-97/98) | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | server `dist` and phone bundle built from this tree; Chrome (Playwright) 390×844, touch | clean env `env -i PATH HOME=/private/tmp/api590/home TMPDIR=/private/tmp/api590/tmp/`; probe-owned nodes and data roots; scripted AGY CLI |
| ENV-2 | as ENV-1 | same | same; node `lambda` with the test vault (`AUTOBYTEUS_TEST_VAULT=/Users/normy/.autobyteus-test/vault`, read-only), native runtime, `gpt-5.4-mini` | `RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1`; only lambda reads the vault |
| ENV-3 | `f411294735` (`nuxt.config.ts` identical at `648a8e0299`: `git diff 767cb3b61a 7a2a62dcee -- autobyteus-web/nuxt.config.ts` empty, unchanged since) | same | `build:mobile-web --demo` output `dist-mobile-demo/` (13M) present | — |
| ENV-4 | `648a8e0299` | same | fresh `git clone --no-local` in `/tmp/api590/fs-1`, `pnpm install --frozen-lockfile`, the release job's macOS arm64 build | the job's environment variables (TESTING.md Fresh-start build) |
| ENV-5 | `648a8e0299` (pushed as `codex/phone-activity-details`) | GitHub Actions runners (macOS arm64/x64, Linux x64/arm64, Windows) | Desktop Release build-only run 45029500186 (`pnpm release:test`), publishes nothing | — |

## Cases

Round 2:

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-CR-1 | AC-001 (F-1) | The fix's keys vs. the node's AGY arguments | `git show 70f7040ee1` against `evidence/api-e2e/CR-1-agy-argument-names.md` | ENV-1 | Pass | — | `FILE_ARG_KEYS` adds `'TargetFile', 'DirectoryPath'`; `TEXT_ARG_KEYS` adds `'Query', 'Pattern'`; 6 spec cases | `SearchPath`/`SearchDirectory` left out on purpose (a file key would win over the query); the search's folder stays in the details. Sound: what the search looks for says more on a one-line row |
| R2-TD-2 | F-2 | TESTING.md commit on its own | `git show --stat 37ed9cdf00 7a2a62dcee`; `git diff 5b9979ba05 c48316e28b` (my round-1 commits after the rewrite) | ENV-1 | Pass | — | `37ed9cdf00 docs(testing): a demo build no longer breaks the web typecheck, …` with only `TESTING.md`; `7a2a62dcee` only `autobyteus-web/nuxt.config.ts`; the rewrite diff is empty | — |
| R2-U-1 | AC-001…AC-006 (unit) | Whole web unit suite and guards | `env -i … pnpm -C autobyteus-web test:nuxt`; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | ENV-1 | Pass | `evidence/api-e2e/R2-U-1/summary.log` | `Test Files  796 passed (796)`; `Tests  6046 passed (6046)`; `[guard:web-boundary] Passed.`; `[guard:localization-boundary] Passed.`; `[audit:localization-literals] Passed with zero unresolved findings.` | — |
| R2-WS-1 | AC-001…AC-005; regression | Whole `test:e2e:mobile-shell` (incl. MSP-94…97) after a phone bundle rebuild | `pnpm -C autobyteus-web build:mobile-web`; `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/api590/r2-ws-1` | ENV-1 | Pass for this ticket (2 outside failures) | `evidence/api-e2e/R2-WS-1-whole-mobile-shell/` | 96 cases, 94 Pass; `MSP-94 Pass` … `MSP-97 Pass`; MSP-97 rows `write_to_file` / `replace_file_content` ×2 / `view_file` → `workspace/marker.txt`, `grep_search` → `AFTER`, `find_by_name` → `*.txt`, `list_dir` → `kappa/workspace`, `run_command` → `printf NATIVE_ARGUMENTS_PREFIX_VERIFIED` (`MSP-97-native-tool-rows.png`); `MSP-44 Fail`, `MSP-45 Fail` (FU-006); `MSP-98 skipped` (gate) | Unknown browser error 1: MSP-55 (Pass) `phone-eta console: Failed to load resource: net::ERR_SOCKET_NOT_CONNECTED`. Cause: MSP-55 resets every new connection while its link is down (`sever()`, on purpose); Chrome reports a reset during connection setup as `ERR_SOCKET_NOT_CONNECTED`, and MSP-55's allowlist accepts only `ERR_CONNECTION_RESET` (MSP-21's already accepts this code, ticket 522 evidence). The file is untouched by this ticket: follow-up candidate |
| R2-MSP-98 | AC-003 (logs grow while open) | Live native `run_bash` details on the phone | `env -i … AUTOBYTEUS_TEST_VAULT=/Users/normy/.autobyteus-test/vault RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1 pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/api590/r2-msp-98 --cases=MSP-98` | ENV-2 | Pass | `evidence/api-e2e/R2-MSP-98-live-tool-logs/` | `MSP-98 Pass`; `runningStatus` Running with 2 log lines → `endStatus` Success with 30 | — |
| FS-1 | build input `nuxt.config.ts` | Fresh-start build | `git clone --no-local … /tmp/api590/fs-1`, checkout `648a8e0299`; `pnpm install --frozen-lockfile`; `cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; the job's "Verify bundled Prisma ARM64 engine target" and "Verify packaged terminal runtime ARM64" steps (`/tmp/api590/scripts/fs-1.sh`) | ENV-4 | Pass | `evidence/api-e2e/FS-1-fresh-start-build.log` | `commit 648a8e0299…`; `test-file errors: 86 in 36 files (baseline 86 in 36 files)`; `build exit 0`; `verify prisma exit 0`; `[terminal-runtime] ok: node-pty spawn probe`; `script exit 0`; `AutoByteus_personal_macos-arm64-1.5.14-beta.7.dmg` | Signing and notarization need the runner (not tested here) |
| RR-1 | build input/gate (rule 12) | Build-only Desktop Release on the runners | `scripts/check_secrets.sh origin/personal..HEAD` (`secret gate: PASS`, 16 commits); `git push origin HEAD:refs/heads/codex/phone-activity-details`; `pnpm release:test --ref codex/phone-activity-details` → run 45029500186 | ENV-5 | Pass | `evidence/api-e2e/RR-1-release-run.txt` | `conclusion: success`; `Build macOS Intel x64: success`, `Build macOS ARM64: success`, `Build Linux ARM64: success`, `Build Windows x64: success`, `Build Linux x64: success`; signing and publish `skipped` | head `648a8e0299…`; https://github.com/AutoByteus/autobyteus-workspace/actions/runs/45029500186 |

Round 1 (kept as run; IDs prefixed `R1`):

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 CR-1 | AC-001 (decision 1) | Summary keys vs. the node's AGY argument names | Read `utils/toolDisplaySummary.ts` (keys), `agy-stream-event-converter.ts:199-208` (arguments pass through), `agent-work-journal/rendering/runtimes/antigravity-translation.ts` (AGY tools and arguments), `tests/fixtures/agy-native-arguments-turn.mjs` | ENV-1 | Fail | `evidence/api-e2e/CR-1-agy-argument-names.md` | `write_to_file`/`replace_file_content` → `TargetFile`; `grep_search` → `Query`, `SearchPath`; `find_by_name` → `Pattern`, `SearchDirectory`; `list_dir` → `DirectoryPath` — none a summary key | `CommandLine`, `Path`, `AbsolutePath` are right; the claim "the only AGY argument names the node's code and recordings show" is not |
| R1 CR-2 | AC-006 | No `contextText` in the web app | `grep -rn contextText` over web source (no build outputs) | ENV-1 | Pass | — | only `services/runHydration/__tests__/runProjectionActivityHydration.spec.ts` (node input; asserts `not.toHaveProperty('contextText')`) | — |
| R1 B-1 | prerequisite | Server dist, phone bundle | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | ENV-1 | Pass | `evidence/api-e2e/B-1-builds.log` | `server exit 0`; `The /mobile build holds no demo code.`; `mobile exit 0` | — |
| R1 MSP-94 | AC-001, AC-002, AC-003, AC-004, REQ-006 | Phone rows/details (scripted AGY `mcp_calls`), en-US + zh-CN | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/api590/msp-94-97 --cases=MSP-94,MSP-95,MSP-96,MSP-97` | ENV-1 | Pass | `evidence/api-e2e/MSP-94-97-round1/` | `[mobile-shell] MSP-94 Pass`; `MSP-94-activity-rows.png` | also Pass in the second run (`MSP-94-98-first-run/`) |
| R1 MSP-95 | AC-004 | Compaction details (`auto_compaction`) | same run | ENV-1 | Pass | same | `MSP-95 Pass`; `MSP-95-compaction-details.png` | — |
| R1 MSP-96 | AC-001, AC-003, AC-005 (decision 2) | AGY background task unfold; running call's details change live | same run | ENV-1 | Pass | same | `MSP-96 Pass`; `MSP-96-background-task-expanded.png` | decision 2 confirmed: the title unclamps on expand (`whitespace-pre-wrap`) |
| R1 MSP-97 | AC-001 (decision 1) | Phone rows for AGY's own tools (`native_arguments`) | same run | ENV-1 | Fail | `evidence/api-e2e/MSP-94-97-round1/MSP-97-native-tool-rows.png`, `mobile-shell-probe.json` | `MSP-97 Fail: AC-001 an Antigravity write_to_file row shows its file (TargetFile); AC-001 an Antigravity replace_file_content row shows its file (TargetFile)`; rows `write_to_file` / `replace_file_content` ×2 / `grep_search` / `find_by_name` / `list_dir` with `"summary":null`; `view_file` → `workspace/marker.txt`, `run_command` → `printf NATIVE_ARGUMENTS_PREFIX_VERIFIED` | F-1. Same result in the second run |
| R1 MSP-98 | AC-003 (logs grow while open) | Phone details of a running native `run_bash` (real model) | `env -i … AUTOBYTEUS_TEST_VAULT=/Users/normy/.autobyteus-test/vault RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1 pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/api590/msp-98 --cases=MSP-98` | ENV-2 | Pass | `evidence/api-e2e/MSP-98-live-tool-logs/` | `MSP-98 Pass`; `MSP-98-live-logs-running.png` "Running", "Logs (1)"; `MSP-98-live-logs-ended.png` "Success", "Logs (3)" with `[TOOL_RESULT] exitCode: 0` | First run failed on my assertion (one-line match on a multi-line log entry; `MSP-94-98-first-run/`), the behavior was already right: 2 lines while running → 33 after |
| R1 TC-1 | AC-007 | Nuxt type project with `dist-mobile-demo/` present | `pnpm -C autobyteus-web build:mobile-web --demo`; `/usr/bin/time -l pnpm -C autobyteus-web typecheck` | ENV-3 | Pass | `evidence/api-e2e/TC-1-demo-build.log`, `TC-1-typecheck-with-demo-build.log` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`; `3814735872  maximum resident set size`; `13M	autobyteus-web/dist-mobile-demo` | — |
| R1 TD-1 | AC-007 | TESTING.md sentence | `git diff 0da6bfbfc1..HEAD -- TESTING.md` | ENV-1 | Pass | — | the "remove it before the typecheck" sentence is gone from the GraphQL/demo row | committed with `nuxt.config.ts` in `767cb3b61a`, not alone as `docs(testing): …` (F-2) |
| R1 U-1 | AC-001…AC-006 (unit) | Whole web unit suite, typecheck, guards | Reused: IMP-03 | — | Pass (reused) | — | — | Tree unchanged since `597f2dc6d6` except docs and my probe files |
| R1 DP-1 | AC-006 | Desktop Activity parity | Reused: IMP-02 | — | Pass (reused) | — | — | desktop components unchanged since `60ee161388` |
| R1 WS-1 | Regression (every case; row markup changed) | Whole `test:e2e:mobile-shell` | `env -i PATH="$PATH" HOME=/private/tmp/api590/home TMPDIR=/private/tmp/api590/tmp/ pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/api590/ws-1` | ENV-1 | Fail (outside this ticket, apart from MSP-97) | `evidence/api-e2e/WS-1-whole-mobile-shell/` | 96 cases, 93 Pass; `MSP-97 Fail` (F-1); `MSP-44 Fail` / `MSP-45 Fail: locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded … a[href="other.md#x"]`; `MSP-98 skipped: set RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1 …`; `unknownBrowserErrors` 0 | First attempt `WS-1-setup-abort/`: `Error: alpha serves the phone bundle at /mobile` (my build order). MSP-44/45: see WS-2 |
| R1 WS-2 | Cause of MSP-44/45 | Heading-links cases alone | same with `--cases=MSP-44,MSP-45 --output-dir=/tmp/api590/msp-44-45`; code read of `mobile-heading-links-cases.mjs` `followNothing` and `8c3810df95` | ENV-1 | Fail (reproduces; base cause) | `evidence/api-e2e/MSP-44-45-alone/` | both fail the same way alone; `followNothing` clicks `other.md` and then looks for `other.md#x` in the same viewer | Since autobyteus-576 (`8c3810df95`, in this base) a relative link in a workspace file's or skill's Markdown preview opens the linked file, so after `other.md` the viewer shows another document and the next link is not there. The cases still assert the pre-576 "a link with no scheme does nothing". This ticket touches neither the renderer nor the previewer: a follow-up (FU candidate), not this ticket |
| R1 FS-1 | build input `nuxt.config.ts` | Fresh-start build | — | — | Next Round | — | — | after the fix |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | R2-WS-1 (MSP-94, MSP-96, MSP-97), R2-CR-1, R2-U-1 | Proven | — |
| AC-002 | Yes | R2-WS-1 (MSP-94, MSP-97), R2-U-1 | Proven | — |
| AC-003 | Yes | R2-WS-1 (MSP-94 open/Back scroll, MSP-96 live status), R2-MSP-98 (Logs grow while open), R2-U-1 | Proven | — |
| AC-004 | Yes | R2-WS-1 (MSP-94 failed call's full error, MSP-95), R2-U-1 | Proven | — |
| AC-005 | Yes | R2-WS-1 (MSP-96), R2-U-1 | Proven | — |
| AC-006 | Yes | R1 DP-1 (desktop components unchanged since), R2-U-1, R1 CR-2 | Proven | — |
| AC-007 | Yes | R1 TC-1 (`nuxt.config.ts` unchanged since), R1 TD-1, R2-TD-2, FS-1 | Proven | — |
| DEC-005 (physical phone) | No | — | Accepted Unverified Risk (DEC-005) | no device; the production phone bundle is the phone evidence |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | every AC proven: R2-WS-1, R2-MSP-98, R2-U-1, TC-1, FS-1 | physical phone (DEC-005) | — |
| Changed-boundary execution directness | 95% | 96% | the production phone bundle against built nodes; MSP-97 on AGY's own tool shapes | — | — |
| Cross-boundary integration realism and mock gap | 92% | 94% | scripted AGY with recorded shapes; MSP-98 with a real model on the native runtime | real AGY binary not used (scripted); Codex TOOL_LOG not exercised | — |
| Environment, configuration, identity, and fixture fidelity | 93% | 97% | clean env, own nodes, read-only test vault; FS-1 fresh clone; RR-1 on the runners | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 94% | failed call's details, terminate while open, live Logs growth | — | — |
| User-surface, browser, and desktop-shell confidence | 93% | 94% | phone screenshots (rows, details, zh-CN); desktop parity (DP-1); packaged desktop build (FS-1) | physical device WebView (DEC-005) | — |
| Durable regression coverage quality and relevance | 95% | 96% | MSP-97 (all AGY native rows asserted), MSP-98 (gated live), the fix's 6 spec cases | MSP-98 runs only with its gate | — |

- Overall post-repository confidence: 93.7%
- Overall final confidence: 95.4% (mean of the seven final scores)
- Calculation method: mean of the final category scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: physical phone (DEC-005, accepted); MSP-44/45 (FU-006) and MSP-55's allowlist (follow-up candidate) are outside this ticket

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (production phone bundle in headless Chrome, 390×844), `Live API` (MSP-98, test vault), `Project Desktop Validation` (FS-1 packaged macOS arm64 build), build-only release run (RR-1)
- Confidence gap or residual risk it addresses: real runtime argument shapes and TOOL_LOG timing on the phone; the changed type-project excludes on a fresh runner
- Browser validation needed: yes; the change is the phone's Activity UI
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed: reused IMP-02 (desktop Activity parity) and the unit suite (desktop components read the same builders, unchanged since IMP-02); FS-1 builds and packages the desktop app from a fresh clone, with the job's verify steps. No Electron shell change.
- Effect on any already-running desktop application: `None` (the user's AutoByteus app on port 29695 and `~/.autobyteus` were not touched)
- Behavior not directly proven: the conversation tool card's AGY summaries in a desktop window (same `getToolDisplaySummary`, through `toolCardPresentation.ts`; unit-covered)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-activity-details-cases.mjs` MSP-97 (round 1, `464d484e17`) | Added | MSP-97 | — |
| same, MSP-97 asserts the search and listing rows (round 2, `648a8e0299`) | Updated | MSP-97 | — |
| same, MSP-98 (gated `RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1` + test vault; round 1) | Added | MSP-98 | — |
| same, `withNodeAndPhones` (optional launch/tools/instructions/reply timeout; `say`; round 1) | Updated | MSP-94…98 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (passes `root` to the activity cases; round 1) | Updated | MSP-97 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route; MSP-97/98 were read in CRR-001)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted `agy-failure-cli.mjs` (`mcp_calls`, `auto_compaction`, `linked_skills`, `native_arguments`) | no real AGY account in tests; the cases replay recorded step shapes | argument shapes as the node's fixtures record them |
| Phone | headless Chrome 390×844 on the production phone bundle | no device (DEC-005) | WebView rendering |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/api590` (HOME, TMPDIR, probe outputs, logs, `fs-1` clone, `scripts/fs-1.sh`) | Yes | kept until the ticket closes; removed when the Solution Designer asks | kept |
| Probe nodes and their browsers | Yes | stopped by the probe | stopped |
| Remote branch `codex/phone-activity-details` (pushed for RR-1) | Yes | delivery owns it from here (merge, then branch cleanup) | left |
| `autobyteus-web/dist-mobile-demo/`, `dist/public` in the worktree | Yes (rebuilt) | ignored build outputs; `dist/public` holds the phone bundle | left |

## Preliminary Classification (On `Fail`)

Not applicable this round. Round 1's F-1 and F-2 are resolved (see the revision record). Outside this ticket, for the Solution Designer's follow-ups: FU-006 (MSP-44/45, already recorded) and MSP-55's browser-error allowlist (`net::ERR_SOCKET_NOT_CONNECTED` from its own deliberate link cut; R2-WS-1).

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: physical phone `Accepted Unverified Risk (DEC-005)`
- Evidence decisions requested: `None`
- Preliminary classification and recommended owner (on `Fail`): —
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (Pass, direct route, Medium / Low)
- Notes: decision 1 now complete (`70f7040ee1`), decision 2 confirmed. The branch is pushed (`648a8e0299`) for RR-1; its upstream stays `origin/personal`.
