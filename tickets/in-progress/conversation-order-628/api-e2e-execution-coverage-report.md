# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; `/code_reviewer` CRR-002 Pass (Large / High), tree `a9e22b4ea4`, tested with my test commit `ea6505c3eb`
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: None
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628/tickets/in-progress/conversation-order-628/evidence/api-e2e/` (paths inside shortened to `<tmp>` and `~`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (the new live cases)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `a9e22b4ea4` + `ea6505c3eb` | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | server `dist` and phone bundle of this tree; Chrome (Playwright) 390×844 touch | clean env `env -i PATH HOME=<tmp>/home TMPDIR=<tmp>/tmp/`; probe-owned nodes and data roots; scripted AGY |
| ENV-2 | as ENV-1 | same | node `nu` reading the test vault read-only (`AUTOBYTEUS_TEST_VAULT=/Users/normy/.autobyteus-test/vault`); a test-owned Claude: `CLAUDE_AGENT_SDK_AUTH_MODE=api-key`, the node's own HOME and `CLAUDE_CONFIG_DIR`; Claude haiku; native AutoByteus with OpenAI gpt-5.4-mini; phones whose `Date` is offset ±2 s | `RUN_MOBILE_SHELL_LIVE_ORDER=1`; nothing of `~/.claude` read or written |
| ENV-3 | as ENV-1 | same | server integration and E2E suites | clean env as ENV-1 |
| ENV-4 | `ea6505c3eb` | same | fresh `git clone --no-local`, `pnpm install --frozen-lockfile`, the release job's macOS arm64 build and verify steps | the job's environment variables |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MSP-106 | AC-001, AC-002, AC-003, AC-006 (D-2 rule (a)) | a Team whose `/lead` runs on Claude; its tools change before each round ("Tools updated" preface); phones 2 s behind sending, 2 s ahead sending, 2 s behind watching (another client sends) | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_MOBILE_SHELL_LIVE_ORDER=1 pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/live-3 --cases=MSP-106,MSP-107` | ENV-2 | Pass | `evidence/api-e2e/MSP-106-107-live/` (`mobile-shell-probe.json` `MSP-106`, 6 PNGs) | each round `live.ok` and `reopened.ok` true; node `kinds: ["message:user","system_task_notification","message:assistant"]`; phone state vs node e.g. behind-sends `user 1795485497279` vs `nodeUser 1795485497277`, reply `1795485497285` vs `nodeNotice 1795485497285` (phone clock `-2001` ms); `userIsNodeTime` and `replyIsNodeTime` true live and reopened in all 3 rounds | `MSP-106-behind-sends-live.png`: You, "Tools updated", the reply. Two earlier attempts failed on my harness (pairing waited for a tree on an empty node; the reader parsed `ts` seconds as ms and missed the Team view's members) |
| MSP-107 | AC-001, AC-003, AC-006 (D-2 rule (b)) | a standalone native run (a real model) whose agent uses a skill; `updateSkill` before each round ("Skill updated" preface); phones 2 s behind and ahead send | same run | ENV-2 | Pass | same (`MSP-107`, 4 PNGs) | both rounds `live.ok`/`reopened.ok`; node notice right after the message; state times within 3 ms of the node's (e.g. `user 1795485528573` vs `nodeUser 1795485528576`); `afterSend` (150 ms after Enter) already the node's time | the founder's own notice; the agent also made a real `read_file` call (`MSP-107-ahead-sends-reopened.png`) |
| SI-1 | AC-005; regression | whole server integration | `test:integration:prepare`; `test:integration` | ENV-3 | Pass | `evidence/api-e2e/SI-SE/integration-summary.log` | `Test Files  92 passed | 21 skipped (113)`; `Tests  523 passed | 71 skipped (594)` | — |
| SE-1 | AC-005; regression | whole server E2E | `pnpm test:e2e` | ENV-3 | Fail (outside this ticket) | `SI-SE/e2e-summary.log` | `Test Files  2 failed | 125 passed | 165 skipped (292)`; RRB-1 and SID-2 `Unknown system error -102 … node-access/local-control.sock` | autobyteus-609 FU-007 (base). IMP-12 showed them passing because its `TMPDIR` (the system `/var/folders/…`, 49 chars) makes the socket path about 123 bytes, over macOS's 104: the node then opens no socket (`local-control-socket.ts` `localControlSocketPath`), so the snapshot has nothing to trip on. My `TMPDIR` gives 98 bytes, so the socket exists |
| WS-1 | all phone; AC-005 | whole `test:e2e:mobile-shell` | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/ws-1` | ENV-1 | Pass for this ticket (6 outside) | `evidence/api-e2e/WS-1-whole-phone-probe/` | 103 cases, 97 Pass; `MSP-105 Pass`, `MSP-99 Pass`, MSP-66/75/76/77 Pass; failures MSP-17, MSP-58, MSP-65, MSP-82, MSP-87 (FU-002) and MSP-61 (autobyteus-609 FU-006), messages identical to IMP-11's, which fail on the base `1f761bc8db` too (IMP-11 base comparison); unknown browser errors 0; MSP-98, MSP-106/107 skipped (gates) | — |
| FS-1 | build inputs (contract `dist/`); hint 5 | fresh-start build of `ea6505c3eb`; the packaged app's node and web from this commit | fresh clone; `pnpm install --frozen-lockfile`; `cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; the job's verify steps; then the packaged `AutoByteus.app`: `stampForDelivery` in its server `dist`, the web parser's refusal text in its renderer | ENV-4 | Pass | `evidence/api-e2e/FS-1-fresh-start-build.log` | `commit ea6505c3eb…`; `test-file errors: 86 in 36 files (baseline 86 in 36 files)`; `build exit 0`; `verify prisma exit 0`; `[terminal-runtime] ok: node-pty spawn probe`; `server stampForDelivery files: 3`; `server agent-run-event.js has occurredAt: 5`; `web refusal text in: <Resources>/app.asar`; `script exit 0` | the packaged app's node and web are this commit's (D-3 on both sides; mixed versions are unsupported by design). Signing and notarization need the runner (IMP-15 built every target) |
| U-1 | unit | web, server, autobyteus-ts units; both typechecks; guards; contract-dist | Reused: IMP-16 | — | Pass (reused) | — | — | no source change after `eaebb94304` |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-106 (Claude), MSP-107 (native), WS-1 (MSP-105 scripted), U-1 (IMP-01) | Proven | — |
| AC-002 | Yes | MSP-106 (behind-watches), WS-1 (MSP-105), U-1 | Proven | — |
| AC-003 | Yes | MSP-106 (rule a), MSP-107 (rule b), WS-1 (MSP-105), U-1 (IMP-02, IMP-09) | Proven | — |
| AC-004 | Yes | U-1 (IMP-01 compaction cases, IMP-07) | Proven (web specs, as its verification intent states) | — |
| AC-005 | Yes | WS-1 (MSP-99, notice cases), SI-1, SE-1 (all but FU-007's two), U-1 | Proven | — |
| AC-006 | Yes | MSP-106, MSP-107 (the phone's state times equal the node's, ±2 s clock), U-1 (IMP-06, IMP-07, IMP-16), FS-1 | Proven | — |

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

- Overall post-repository confidence: 92.0%
- Overall final confidence: 95.1% (mean of the seven final scores)
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

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: `None`
- Evidence decisions requested: `None`
- Preliminary classification and recommended owner (on `Fail`): —
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Pass, Large / High: proportional test-code review)
- Notes: Downstream Coverage Hints: 1 MSP-106 (Claude; Codex not run, same writer); 2 MSP-107 (native, skill update); 3 MSP-106/107 (state times; a standalone own send's time is the node's); 4 not tested live (unit IMP-09); 5 FS-1 (the packaged app's node and web are this commit's).
