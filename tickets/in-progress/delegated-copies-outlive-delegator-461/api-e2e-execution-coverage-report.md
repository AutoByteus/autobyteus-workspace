# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-014`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 14, on CRR-047 (code review passed, round 33). Code under test `4062c809d2` (HEAD `84ef73e99f`, docs only since). Server `dist/` rebuilt; web from source.
- Prior round reviewed: API-REV-013 (`Fail`: F-60, F-67 … F-73; CRR-046 routed them as CR-461-086 … -093).
- Scope, per CRR-047: the peer cases (RC-31 … RC-34, RTP-04/05/08); RRT-05 several times; Settings (DCP, SSR-002, SSR-004, DCR-003, AFS-002, RSM); the phone in full; PLN-09; the held items (the delegator's Stop from Settings with SSR-002 repeated, the extended runtime switch, BR-011, LE-O1's later step, D-IMP-1's frequency); API-F01 (the contract packages changed again); regression runs (the remote and projects server folders, SDV, PMU, LRL).
- Refusal wording: FU-030; no new wording-only difference.
- Deviations from the plan, and why:
  - **LE-O1 blocked by the environment:** DeepSeek answered "402 Insufficient Balance" twice; the test vault's DeepSeek account is out of credit. Not a 461 result.
  - **Probe reads corrected** (all stale under the design, not product changes): MSP-17 (the Org's delegated run found in its view and read as its own run; its composer is its own, rule 2), MSP-20 (a child's turn sent on its own stream, rule 2), MSP-34 (a reopen gives a row notice only when the node lists the run again), DCP-001/003/005 (the recorded "settings" origin, V-11), DCP-002 (the lead resumes on its own launch, F-39), DCR-002 (copies read as their own runs; `/lead`), PLN-09 (after the refusal, the delegated runs are stopped by their own Stop and "Archive all" completes), RTP-05 (waits for the stop icon), and two server suites (ad-hoc: the second root's copy stopped before its delete, REQ-007; stories: send after CONNECTED).
- Evidence folder: `evidence/api-e2e/` (round 14 files carry `r14`; `API-r14-runs.txt` lists every run; `API-r14-open-findings.json` holds the open findings' records).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `4062c809d2` | macOS 26.5.2 (Darwin 25.5.0), arm64 | In-process and built servers, scripted AGY (`RUN_AGY_FAILURE_E2E=1`) | remote-collaboration, projects folders; extended runtime switch |
| ENV-2 | `4062c809d2` | as ENV-1 | Probe-owned stack: built server, Nuxt dev, headless Chrome; scripted runtimes | Clean env; never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe | Owned by the probe |
| ENV-4 | as ENV-2, base `827f1e68dc` | as ENV-1 | Two built-server nodes | Tree, title, API-P04 |
| ENV-5 | HEAD, fresh clone | as ENV-1 | `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` (unsigned) | API-F01 |
| ENV-6 | `4062c809d2` | as ENV-1 | DeepSeek through the test vault | Blocked: 402 Insufficient Balance |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Peer server suite | REQ-009, REQ-013; SR-082/083; CR-461-090/091 | Two server processes | `vitest run tests/e2e/remote-collaboration` | ENV-1 | Pass | `API-r14-runs.txt` | 45/45 | RC-31 … RC-37 |
| Peer rows in the window | as above; AR-403 | Two nodes, real browser | `remote-runs-in-tree-probe.mjs`, twice | ENV-4 | **Fail** (F-70) | `API-r14-open-findings.json` | RTP-04, RTP-05, RTP-08 | RTP-04 Pass (live answer; F-71 resolved); RTP-05 and RTP-08 fail twice |
| API-P04 | rule 3 rows | Two nodes | capture vs the round-12 base capture | ENV-4 | Pass for rows | `API-P04-r14-peer-shape-compare.json` | peer rows | as round 13 (`open_target`, `launches`) |
| RRT-05 (CR-461-093) | autobyteus-278 titles | Two nodes | three runs | ENV-4 | Pass | `API-r14-runs.txt` | the Team row's title | 3/3: F-72 not seen |
| Settings | DS-12; SR-064; V-11; F-39; CR-461-086/089 | Real browser | DLD, SSR, RSM | ENV-2 | Pass, except D-IMP-1 | `API-r14-runs.txt` | the saved card, the stored launches, the resume | DCP-001 … 005, DCR-001 … 003, SSR 4/4, SSR-002 ×3, RSM 7/7 |
| D-IMP-1 | AFS (autobyteus-366 D-IMP-1) | Real browser | AFS-002, three runs | ENV-2 | **Fail** 3/3 | `API-r14-open-findings.json` | Settings stay open across focus | Focusing the running Org's copy closes Settings every time |
| Delegator Stop from Settings with working copies | REQ-001 | Real browser | SSR-002 ×3 | ENV-2 | Pass 3/3 | | the run stops | F-68 not seen |
| PLN-09 | AC-008 | Real browser | with diagnostics | ENV-2 | Pass | | the reason shown, then archived | F-67 resolved |
| The phone | SR-082/083; autobyteus-426/435 | Phone shell | full, then reruns | ENV-3 | **Fail** (F-74, F-75) | `API-r14-open-findings.json` | rows, screens, background reads, revoked phone | 49/55, F-73 resolved; MSP-50/51 not 461 |
| Open targets, regression | SR-083 step 3 | Real browser | SDV, PMU | ENV-2 | Pass | | | SDV 7/7, PMU 25/25 |
| Server regression | | Server | projects folder | ENV-1 | Pass after stale fixes | | | ad-hoc 3/3, stories 3/3 rerun |
| Extended runtime switch (held) | | Built server | twice | ENV-1 | Pass | | 5/5 twice | Cleared |
| BR-011 (held) | restart | Real browser | `--cases BR-008…BR-011` | ENV-2 | Fail | | | The same step as rounds 12 and 13 |
| LE-O1 (held) | SR-081 | DeepSeek | `-t LE-O1` | ENV-6 | Blocked | | | 402 Insufficient Balance |
| API-F01 | build inputs | Fresh clone | TESTING.md | ENV-5 | Pass | | exit 0 | |

### Findings

- **Resolved from round 13:** F-60, F-67, F-69, F-71, F-73 (F-72 not seen in 3 runs; F-68 not seen in 3 runs).

| ID | Case | Expected (authority) | Observed (`4062c809d2`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-70 (remains, in the window) | RTP-05, RTP-08 (two runs each) | SR-082/083: a peer run's status by its run ID; CR-461-085/090: Retry observes again, live again after a turn | The server suite passes (45/45), but in the window: RTP-05 the peer row reads `offline` (in the second run its stop icon showed within 30 s and was gone at the click), so Stop cannot be used; RTP-08 the probe's own `/ws/run-status` subscription on alpha reads the peer run `idle` (run 1) or `offline` (run 2) before the outage, `offline` at it, and after Retry from the row and the notice and a new turn on beta, no change at all | `Local Fix` |
| D-IMP-1 (held) | AFS-002, three runs | autobyteus-366 D-IMP-1: Settings stay open across focus changes inside a run | Focusing the running Org's copy row closes the Org's Settings in 3 of 3 runs (reopened, the copy's card shows) | `Local Fix` (web; `AgentOrgWorkspaceView.vue`, per the implementer's note) |
| F-74 | MSP-32 (two runs) | autobyteus-426: a revoked phone stops; it sends no refused request | After MSP-13 revokes the phone's credential, its `/ws/run-status` connection keeps reconnecting: 980 connections refused with 4401 in 17 minutes (77 in the short rerun). Its other requests stopped (`refused: []`) | `Local Fix` (web, phone) |
| F-75 | MSP-25 (two runs) | autobyteus-435 AC-006 / E-25: no read while the phone is in the background | 2.35 s after the page is hidden, the phone reads a listed run's view (`GetAgentRunCollaboration`) and `GetTaskWorkerTasks`, before the Task closes (2.9 s) | `Local Fix` (web, phone) |

**BR-011 classified (after CRR-048): 461's.** Base `827f1e68dc`, with its own probe, passes BR-008 … BR-011 in 2 of 2 runs; the branch fails BR-011 at the same step ("org: conversation after restart": the reactivated Org worker's conversation after the second real backend restart) in rounds 12, 13 and 14. The probe now records which markers the window shows and a screenshot at that step. A branch rerun with that record was cut short: the worktree's `autobyteus-ts/dist` was being rebuilt by the implementer's work in progress, so the probe's restarted backend could not load (`ERR_MODULE_NOT_FOUND`); not a product result.

**Blocked:** LE-O1 (DeepSeek balance).

**Stale, still waiting:** the live suite's LE-A1 … LE-T1 (their run is blocked by the same balance); the large-hub redesign.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 … AC-007 | Yes | server suites; SDV, PMU | Proven | — |
| AC-008 | Yes | server suites; PLN-09 | Proven | — |
| AC-010 (REQ-006) | Yes | DCP, DCR, SSR, RSM | Proven | — |
| AC-016 / REQ-009, REQ-013 (peers) | Yes | RC-31 … RC-37; RTP | Proven at the server; not in the window (F-70) | — |
| AC-017 (statuses by run ID) | Yes | round 13's FOLLOW cases; MSP-12, MSP-20 | Proven locally; not for peers in the window (F-70) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 91% | 91% | Five findings resolved; Settings, archive, phone rows proven | F-70, F-74, F-75, D-IMP-1 | The fixes |
| Changed-boundary execution directness | 94% | 94% | Two nodes, phone, server folders, fresh build | — | — |
| Cross-boundary integration realism and mock gap | 86% | 86% | Two real server processes | No live model run (DeepSeek balance) | A funded test account |
| Environment, configuration, identity, and fixture fidelity | 92% | 92% | Base with its own install | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 87% | 87% | Outages, revocation, restarts | F-70 after Retry; BR-011 | The fixes |
| User-surface, browser, and desktop-shell confidence | 85% | 85% | SDV, PMU, DCP, SSR, phone 49/55 | F-70, F-74, F-75, D-IMP-1 | The fixes |
| Durable regression coverage quality and relevance | 91% | 91% | Probes follow the design | LE-A1 … LE-T1 | After the fix |

- Overall post-repository confidence: 89%
- Overall final confidence: 89%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (peers in the window: F-70)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-70, F-74, F-75, D-IMP-1; BR-011; no live model run

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Worker or Distributed`
- The confidence gap it addresses, and the expected gain: the rendered peer rows, the phone's background behavior and revocation.
- Browser validation needed, and why or why not: yes; F-70, F-74, F-75 and D-IMP-1 are visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack; the fresh-clone desktop build (API-F01).
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: signing, notarization and the other platforms (runner only).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10).
- Cases proving the migration outcome: the projects folder's migration suites (pass).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none new.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage updated this round: `Yes`: `mobile-shell-probe.mjs` (MSP-17, MSP-20), `mobile-closed-task-rows-cases.mjs` (MSP-34), `delegated-launch-defaults-probe.mjs` (DCP-001/002/003/005), `delegated-copy-own-file-cases.mjs` (DCR-002), `projects-left-navigation-probe.mjs` (PLN-09), `remote-runs-in-tree-probe.mjs` (RTP-05), `ad-hoc-task-delegation.e2e.test.ts`, `collaboration-contract-stories.e2e.test.ts`.
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every probe run's model | Scripted AGY CLI; the Grok and LM Studio stand-ins | Deterministic (TESTING.md) | The live run was blocked (DeepSeek balance) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, peer nodes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| `p04-capture-probe.mjs`, fresh clone | Yes | Removed after use | Removed |
| `/tmp/api461/` logs | Yes | Kept; extracts committed (home paths shortened, secret scan clean) | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix`: F-70 (peer statuses in the window), F-74, F-75 (phone), D-IMP-1 (held, now 3/3).
- `Local Fix` candidate: BR-011 (461's; base passes). Blocked: LE-O1.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: peers in the window (F-70); the phone's background reads (F-75) and revocation (F-74); Settings across focus in an Org (D-IMP-1).
- Recommended owner: per the failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round: recheck RTP-05/08, MSP-25, MSP-32, AFS-002; BR-011; LE-O1 and LE-A1 … LE-T1 once the DeepSeek test account has balance.
