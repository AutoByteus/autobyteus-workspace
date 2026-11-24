# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 2; `/code_reviewer` CRR-004 (targeted delta, Pass) on IR-003 after delivery's DR-001 Blocked: `ba25165c1e` (SR-007: stored traces keep their write time; only the external user trace keeps its admission time), `2dbfe43c28` (the contract packages' own suites carry `occurred_at`/`accepted_at`); the merged tree `2d3f46b223` (delivery's merge of `origin/personal`, `54cee15c8e`)
- Prior round reviewed: round 1 (API-REV-001, Pass on `a9e22b4ea4`); its rows below keep an `R1` prefix
- Deviations from the investigation's plan, and why: FS-1 rerun on the merged tree although no build input changed in IR-003: the merge brought other tickets' code, and no fresh-start build of the merged commit existed (delivery's DR-001 evidence has none). The first live run was stopped by the application's restart (an update) before it recorded a result; it was run again
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/evidence/api-e2e/` (round-2 folders start with `R2-`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (no test-code change this round; MSP-106/107 were reviewed in CRR-003)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `2d3f46b223` (merged); round 1: `a9e22b4ea4` + `ea6505c3eb` | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | server `dist` and phone bundle of the round's tree; Chrome (Playwright) 390×844 touch | clean env `env -i PATH HOME=<tmp>/home TMPDIR=<tmp>/tmp/`; probe-owned nodes; scripted AGY |
| ENV-2 | as ENV-1 | same | node `nu` with the test vault read-only; test-owned Claude (`CLAUDE_AGENT_SDK_AUTH_MODE=api-key`, the node's own HOME and `CLAUDE_CONFIG_DIR`), Claude haiku; native AutoByteus with gpt-5.4-mini; phones offset ±2 s | `RUN_MOBILE_SHELL_LIVE_ORDER=1` |
| ENV-3 | as ENV-1 | same | server integration and E2E suites; the three contract packages' suites | clean env as ENV-1 |
| ENV-4 | round 2: `2d3f46b223` in a new fresh clone; round 1: `ea6505c3eb` | same | `pnpm install --frozen-lockfile`, the release job's macOS arm64 build and verify steps; the packaged-app check | the job's environment variables |

## Cases

Round 2:

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-CS-1 | DR-001 Finding 1; AC-005 | the contract packages' own suites | `pnpm -C autobyteus-agent-presentation-contracts test`; same for `autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts` | ENV-3 | Pass | `evidence/api-e2e/R2-contract-suites/` | `# pass 24` / `# pass 39` / `# pass 14`, `# fail 0` each | delivery found them red in DR-001 |
| R2-MSP-105…107 | AC-001, AC-002, AC-003, AC-006 (SR-007) | as round 1: MSP-105 scripted; MSP-106 Claude Team `/lead` (rule a), 3 rounds; MSP-107 native standalone with a skill update (rule b), 2 rounds | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_MOBILE_SHELL_LIVE_ORDER=1 pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/r2-live --cases=MSP-105,MSP-106,MSP-107` | ENV-1, ENV-2 | Pass | `evidence/api-e2e/R2-MSP-105-107-live/` | `MSP-105 Pass`, `MSP-106 Pass`, `MSP-107 Pass`; every round live and reopened `ok`; node `["message:user","system_task_notification","message:assistant"]`; phone state minus stored time, live: user `3`/`4`/`4`/`-3`/`-5` ms, agent message `-4`/`-5`/`-11`/`0`/`0` ms; reopened `0` | SR-007: the stored `ts` is now the write time, a few ms from the live `occurred_at`; within the 500 ms bound, with the phone's clock 2 s off |
| R2-SI-1 | AC-005; regression | whole server integration | `test:integration:prepare`; `test:integration` | ENV-3 | Pass | `evidence/api-e2e/R2-SI-SE/r2-integration-summary.log` | `Test Files  92 passed | 21 skipped (113)`; `Tests  523 passed | 71 skipped (594)` | — |
| R2-SE-1 | AC-005; regression | whole server E2E | `pnpm test:e2e` | ENV-3 | Fail (outside this ticket) | `R2-SI-SE/r2-e2e-summary.log` | `Test Files  2 failed | 125 passed | 169 skipped (296)`; only RRB-1 and SID-2 | autobyteus-609 FU-007 (base; with a short `TMPDIR`, round 1 SE-1) |
| R2-WS-1 | all phone; AC-005 | whole `test:e2e:mobile-shell` | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/r2-ws-1` | ENV-1 | Pass for this ticket (6 outside) | `evidence/api-e2e/R2-WS-1-whole-phone-probe/` | 103 cases, 97 Pass; MSP-105, 99, 66, 75, 76, 77 Pass; failing MSP-17, 58, 65, 82, 87 (FU-002) and MSP-61 (609 FU-006), the same messages as round 1 and IMP-11; unknown browser errors 0 | — |
| R2-FS-1 | build inputs (the ticket's contract `src`/`dist`); hint 5 | fresh-start build of the merged tree; the packaged app's node and web | a new `git clone --no-local` of `2d3f46b223`; as round 1 (`fs-1.sh`) | ENV-4 | Pass | `evidence/api-e2e/R2-FS-1-fresh-start-build.log` | `commit 2d3f46b223…`; `test-file errors: 86 in 36 files (baseline 86 in 36 files)`; `build exit 0`; `verify prisma exit 0`; `[terminal-runtime] ok: node-pty spawn probe`; `server stampForDelivery files: 3`; `web refusal text in: <Resources>/app.asar`; `script exit 0` | a new clone (round 1's clone held build outputs) |
| R2-U-1 | unit | server: Reused IMP-18 (`pnpm test:unit`, typecheck, contract-dist on `ba25165c1e`+`2dbfe43c28`); web: Reused DEL-04/DEL-01 (delivery, merged state) | — | — | Pass (reused) | `evidence/delivery/DEL-04-web-whole-suite.log`, `DEL-01-web-typecheck.log` | `Test Files  803 passed (803)`; web typecheck `86 in 36 files (baseline 86 in 36 files)` | no source change after `2dbfe43c28` (`git diff --name-only 2dbfe43c28 HEAD` lists only tickets); IR-003 changed no web code |

Round 1 (kept as run; IDs prefixed `R1`):

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 MSP-106 | AC-001, AC-002, AC-003, AC-006 (D-2 rule (a)) | a Team whose `/lead` runs on Claude; its tools change before each round ("Tools updated" preface); phones 2 s behind sending, 2 s ahead sending, 2 s behind watching (another client sends) | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_MOBILE_SHELL_LIVE_ORDER=1 pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/live-3 --cases=MSP-106,MSP-107` | ENV-2 | Pass | `evidence/api-e2e/MSP-106-107-live/` (`mobile-shell-probe.json` `MSP-106`, 6 PNGs) | each round `live.ok` and `reopened.ok` true; node `kinds: ["message:user","system_task_notification","message:assistant"]`; phone state vs node e.g. behind-sends `user 1795485497279` vs `nodeUser 1795485497277`, reply `1795485497285` vs `nodeNotice 1795485497285` (phone clock `-2001` ms); `userIsNodeTime` and `replyIsNodeTime` true live and reopened in all 3 rounds | `MSP-106-behind-sends-live.png`: You, "Tools updated", the reply. Two earlier attempts failed on my harness (pairing waited for a tree on an empty node; the reader parsed `ts` seconds as ms and missed the Team view's members) |
| R1 MSP-107 | AC-001, AC-003, AC-006 (D-2 rule (b)) | a standalone native run (a real model) whose agent uses a skill; `updateSkill` before each round ("Skill updated" preface); phones 2 s behind and ahead send | same run | ENV-2 | Pass | same (`MSP-107`, 4 PNGs) | both rounds `live.ok`/`reopened.ok`; node notice right after the message; state times within 3 ms of the node's (e.g. `user 1795485528573` vs `nodeUser 1795485528576`); `afterSend` (150 ms after Enter) already the node's time | the founder's own notice; the agent also made a real `read_file` call (`MSP-107-ahead-sends-reopened.png`) |
| R1 SI-1 | AC-005; regression | whole server integration | `test:integration:prepare`; `test:integration` | ENV-3 | Pass | `evidence/api-e2e/SI-SE/integration-summary.log` | `Test Files  92 passed | 21 skipped (113)`; `Tests  523 passed | 71 skipped (594)` | — |
| R1 SE-1 | AC-005; regression | whole server E2E | `pnpm test:e2e` | ENV-3 | Fail (outside this ticket) | `SI-SE/e2e-summary.log` | `Test Files  2 failed | 125 passed | 165 skipped (292)`; RRB-1 and SID-2 `Unknown system error -102 … node-access/local-control.sock` | autobyteus-609 FU-007 (base). IMP-12 showed them passing because its `TMPDIR` (the system `/var/folders/…`, 49 chars) makes the socket path about 123 bytes, over macOS's 104: the node then opens no socket (`local-control-socket.ts` `localControlSocketPath`), so the snapshot has nothing to trip on. My `TMPDIR` gives 98 bytes, so the socket exists |
| R1 WS-1 | all phone; AC-005 | whole `test:e2e:mobile-shell` | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/ws-1` | ENV-1 | Pass for this ticket (6 outside) | `evidence/api-e2e/WS-1-whole-phone-probe/` | 103 cases, 97 Pass; `MSP-105 Pass`, `MSP-99 Pass`, MSP-66/75/76/77 Pass; failures MSP-17, MSP-58, MSP-65, MSP-82, MSP-87 (FU-002) and MSP-61 (autobyteus-609 FU-006), messages identical to IMP-11's, which fail on the base `1f761bc8db` too (IMP-11 base comparison); unknown browser errors 0; MSP-98, MSP-106/107 skipped (gates) | — |
| R1 FS-1 | build inputs (contract `dist/`); hint 5 | fresh-start build of `ea6505c3eb`; the packaged app's node and web from this commit | fresh clone; `pnpm install --frozen-lockfile`; `cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; the job's verify steps; then the packaged `AutoByteus.app`: `stampForDelivery` in its server `dist`, the web parser's refusal text in its renderer | ENV-4 | Pass | `evidence/api-e2e/FS-1-fresh-start-build.log` | `commit ea6505c3eb…`; `test-file errors: 86 in 36 files (baseline 86 in 36 files)`; `build exit 0`; `verify prisma exit 0`; `[terminal-runtime] ok: node-pty spawn probe`; `server stampForDelivery files: 3`; `server agent-run-event.js has occurredAt: 5`; `web refusal text in: <Resources>/app.asar`; `script exit 0` | the packaged app's node and web are this commit's (D-3 on both sides; mixed versions are unsupported by design). Signing and notarization need the runner (IMP-15 built every target) |
| R1 U-1 | unit | web, server, autobyteus-ts units; both typechecks; guards; contract-dist | Reused: IMP-16 | — | Pass (reused) | — | — | no source change after `eaebb94304` |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | R2-MSP-105…107 (Claude, native, scripted), R2-WS-1, U-1 | Proven | — |
| AC-002 | Yes | R2-MSP-105…107 (MSP-106 behind-watches; MSP-105), R2-WS-1 | Proven | — |
| AC-003 | Yes | R2-MSP-105…107 (rule a on Claude, rule b on native, reopened order and node order after SR-007), R2-WS-1, U-1 (IMP-02, IMP-09, IMP-18) | Proven | — |
| AC-004 | Yes | U-1 (IMP-01, IMP-07 compaction cases) | Proven (web specs, as its verification intent states) | — |
| AC-005 | Yes | R2-WS-1 (MSP-99, notice cases), R2-SI-1, R2-SE-1 (all but FU-007's two), R2-CS-1, R2-U-1 | Proven | — |
| AC-006 | Yes | R2-MSP-105…107 (state times equal the node's: live within 11 ms of the stored write time, reopened equal, ±2 s clock), U-1, R2-FS-1 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 97% | every AC; AC-001…003 and AC-006 on real runtimes | AC-004 by web specs only | — |
| Changed-boundary execution directness | 93% | 96% | real Claude and native runs through the node's delivery stamp, the stored traces and the replay, read by the production phone bundle | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | a real CLI and a real model; scripted AGY in the whole probe | Codex not run (same writer as Claude) | — |
| Environment, configuration, identity, and fixture fidelity | 93% | 96% | clean env; test-owned Claude; the vault read-only; FS-1 | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 92% | clock behind and ahead; sending and watching; reopen | N-5 (a message appended into a notice's own turn) by unit only | — |
| User-surface, browser, and desktop-shell confidence | 92% | 95% | phone screenshots; the packaged app holds this commit's node and web | the desktop window not opened (same window builder) | — |
| Durable regression coverage quality and relevance | 92% | 95% | MSP-106, MSP-107 (gated) on top of MSP-105 | live cases run only with their gate | — |

- Overall post-repository confidence: 92.0% (round 1); round 2 repeats every case on the merged tree with the same results
- Overall final confidence: 95.1% (mean of the seven final scores; unchanged in round 2)
- Calculation method: mean of the final category scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: N-5 by unit only; Codex not run

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (production phone bundle), `Live API` (Claude, OpenAI through the test vault), server suites, `Project Desktop Validation` (FS-1)
- Confidence gap or residual risk it addresses: the Downstream Coverage Hints 1, 2, 3 and 5
- Browser validation needed: yes; the change is the conversation the founder reads
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed: FS-1 builds and packages the app from a fresh clone and checks that it holds this commit's node and web. The desktop conversation uses the same `buildRecentEventMonitorPresentation` the web specs drive; no desktop window journey was added.
- Effect on any already-running desktop application: `None` (the user's AutoByteus app and `~/.autobyteus` were not touched; `~/.claude` neither)
- Behavior not directly proven: the desktop window's rendering of the order (same code as the phone's window)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (a timed frame without `occurred_at` is refused)
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-conversation-order-live-cases.mjs` (new; gated `RUN_MOBILE_SHELL_LIVE_ORDER=1` + test vault) | Added | MSP-106, MSP-107 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (registers it after MSP-105) | Updated | MSP-106, MSP-107 | — |

- Commit: `ea6505c3eb`
- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (whole probe) | scripted `agy-failure-cli.mjs` | the probe's default runtime | covered by real runtimes in MSP-106/107 |
| The phone's clock | an init script replacing `Date` (offset ±2 s; timers still run) | a device clock cannot be set per test | none for ordering and times |
| Phone | headless Chrome 390×844 on the production phone bundle | no device | WebView rendering |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/api628` (HOME, TMPDIR, logs, probe outputs, the fresh clone `fs-1/`) | Yes | kept until the ticket closes; removed when the Solution Designer asks | kept |
| Probe nodes (incl. `nu` and its test-owned Claude config), browsers; the suites' servers | Yes | stopped by the probe and the suites | stopped |
| Paid inference | Yes | Claude haiku: 4 short turns; gpt-5.4-mini: 3 short turns (final run), plus the same in two earlier attempts | — |

## Preliminary Classification (On `Fail`)

Not applicable. Outside this ticket: FU-002 (this ticket's follow-ups: MSP-17, 58, 65, 82, 87), autobyteus-609 FU-006 (MSP-61) and FU-007 (RRB-1, SID-2; shows only with a short `TMPDIR`, see SE-1).

## Latest Authoritative Result

- Result: `Pass` (round 2, merged tree `2d3f46b223`)
- Criteria not proven, parts only the user can check, or accepted as unverified risk: `None`
- Evidence decisions requested: `None`
- Preliminary classification and recommended owner (on `Fail`): —
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Pass, Large / High: proportional test-code review; no test-code change this round)
- Notes: SR-007 holds on real runtimes: reopened order and the node's entry order are unchanged, and the stored write times sit within 11 ms of the live times. The contract suites delivery found red pass. Outside: FU-002, 609 FU-006, 609 FU-007.
