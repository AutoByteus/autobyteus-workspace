# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-016`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 16, on CRR-052 (code review passed, round 36). Code under test `53f0ae2d4e` (HEAD `dfc0da08d8`, docs only since). Server `dist` and the phone bundle rebuilt at the start; web from source.
- **The full rerun after SR-084 … SR-090** (CRR-052): trees, a run's own stream, peers, statuses, Settings, the phone and the lifecycle.
- Prior round reviewed: API-REV-015 (`Pass`, targeted).
- Refusal wording: no new wording-only difference (FU-030 unchanged).
- Deviations:
  - the first full server run was stopped after 22 minutes: views carry their own parts only (stage A), so every suite that read delegated runs from a view or a resume config timed out on that read. Those reads were moved to `runTree` first (below), then the full run was repeated;
  - LE-O1 and LE-A1 … LE-T1 not run (the vault's DeepSeek account);
  - API-P04 (the peer shape characterization) not rerun: the design replaces it (rule 3 for trees, SR-084).
- Evidence: `evidence/api-e2e/API-r16-runs.txt`; raw logs `/tmp/api461/r16`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Result route: `Fail` → Code Reviewer, failure-origin review
- Proportional test-code review decision: `Required` (this round changed many test files; listed below)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `53f0ae2d4e` | macOS 26.5.2 (Darwin 25.5.0), arm64 | Server E2E folder, scripted AGY (`RUN_AGY_FAILURE_E2E=1`) | Clean env per run |
| ENV-1b | base `827f1e68dc` | as ENV-1 | The same suites, each alone | Base worktree with its own install and build |
| ENV-2 | `53f0ae2d4e` | as ENV-1 | Probe-owned stacks: built server, Nuxt dev, headless Chrome; scripted runtimes | Never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe | Phone bundle rebuilt |
| ENV-4 | as ENV-2 | as ENV-1 | Two built-server nodes | `remote-runs-in-tree-probe.mjs` |
| ENV-5 | HEAD, fresh clone | as ENV-1 | `build:electron:mac --arm64` (unsigned) | API-F01 |

## Cases

| Case ID | Criteria | Boundary / Surface | Env | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Full server E2E | all | `vitest run tests/e2e` | ENV-1 | Fail | 825 passed, 40 failed in 22 files, 349 skipped (live gates); classified below |
| Two-node suite | AC-016, AC-017; SR-083, SR-088 … SR-090 | Two server processes | ENV-1 | Pass | 47/47: RC-31 … 37, 43, 45 reworked; RC-35 covers the new agent-stream routes; RC-46 Pass |
| OST-1 … 3 (new) | CRR-052 item 2; SR-087, SR-089 | `/ws/agent`, real roots | ENV-1 | Pass | a delegated run opened from its tree row; reconnect, Stop, restore; an interrupted turn and an error-ended turn each read once |
| FOLLOW-L, FOLLOW-D | CRR-052 item 4 | `/ws/run-status` | ENV-1 | Pass | in the full run (`delegator-view-follows-child`) |
| Tree-read suites (reworked) | SR-084 | `runTree` | ENV-1 | Pass | change feed 7/7, open-task tree 3/3, unclean shutdown 8/8, worker scope 6/6, own-run migration 3/3, model change 11/11, stopped edit 1/1, and the suites that passed in the full run after the move (ad-hoc, closure, reactivation, copy assignment, launch defaults, lazy members, …) |
| F-76 base comparison | rule 3 (`CONNECTED` = ready) | Team socket | ENV-1/1b | Fail | E2E-CF-005, interrupt-resend, Anthropic team restore, linked-skills E04/E10: branch fail, base pass |
| Stream clients | IR-035 wire change | `/ws/agent` | ENV-1/1b | Fail (stale) | 17 cases; base passes those it reaches |
| RTP-01 … 04 | AC-016, CR-461-099 | Two nodes, browser | ENV-4 | Fail ×2 | RTP-01 … 03 Pass; RTP-04 stops at the peer Org row (F-77); the rendered node label, files and `@` checks were not reached |
| Remote run title | autobyteus-278 | Browser | ENV-4 | Pass | |
| RSM | runtime switch | Browser | ENV-2 | Pass | 7/7 |
| SDV, PMU, TSL, task-closure (BR), osfr, PLN | trees, opening rows, statuses | Browser | ENV-2 | Fail | rerun with the probes' command channels waiting for the session (`g-*`): F-77, F-78, F-79 and unclassified items |
| DLD (DCP, DCR, AFS, SSR, LRL, SIR) | Settings, launches | Browser | ENV-2 | Fail | 11/29; not triaged this round (after F-76 … F-79) |
| MSP | phone | Phone shell | ENV-3 | Fail | 20 Pass, 7 Fail, stopped at the live-reconnect warm-up |
| C35-04 | activation time | `large-run-activation-timing` (new, gated), 3 samples | ENV-1/1b | Measured | a run with about 75–90 MB stored (its memory folder; user messages of 4 MB): restore median branch 381 ms, base 269 ms (+112 ms: the predating read at activation); its stream opens with its snapshot in 343 ms on the branch, where base's window reads the same conversation by `getRunProjection` in 397 ms (branch 377 ms); first turn 64 vs 66 ms. A small run: restore 149 vs 160 ms. Watched, no finding |
| API-F01 | build | fresh clone | ENV-5 | Pass | |

### Findings

- **F-76 (new): a Team or Org view sends `CONNECTED` before its session takes commands.** `AgentTeamStreamHandler.connect` and `AgentOrgStreamHandler.connect` send `CONNECTED`, then await the view's snapshot and tree (`view.showCurrentMode()`, `view.open()`). The socket's session id is set only when `connect` resolves, so a command sent on `CONNECTED` is refused `SESSION_NOT_READY` ("Retry after CONNECTED message"). Base opens the snapshot connection first and sends `CONNECTED` last. Base comparison: E2E-CF-005, interrupt-resend, the Anthropic team restore and linked-skills E04/E10 pass at base and fail on the branch. Probes and helpers that send on `CONNECTED` (or on open) hit the same refusal.
- **F-77 (new): a delegated run does not open from a Team or Org surface.**
  - a Team root's Task card worker line: "Failed to open the Task root: AgentRun '…' is not retained in the mounted Team" (`openWorkspaceExecutionLink`); its tree row reads "Couldn't load activity" (PMU-016, PMU-018; screenshot `g-pmu/PMU-016-failure-0.png`);
  - an Org tree's delegated rows: selecting the delegated Team leaves "Choose an Agent or Team" (SDV-07, `sdv/sdv-07-org-failed.png`); the Org worker (SDV-03, PMU-012) and its file (osfr B-003); the peer Org row (RTP-04, both runs);
  - a Team delegator's agent worker (SDV-06).
  The Agent-delegator paths of the same cases pass.
- **F-78 (new): statuses in the trees.** A stopped root reads running in the run list (SDV-01); a Team's dot reads idle while its member rows read offline (TS-004, TS-007); a task Team's coordinator Idle with its unused member Offline is not shown (BR-010, 3 of 3).
- **F-79 (new): leaving rows are not `aria-hidden` and inert at once** (BR-001, BR-002).
- **Stale stream clients (route for failure-origin):** the agent stream's wire change (IR-035 known risk) left the repository's own `/ws/agent` clients behind: they read only `SEGMENT_CONTENT` (MCP tool call, background task, skill notice ×2, compaction ×2, Grok replay ×2), take the stopped run's snapshot as the turn (linked-skills E07), or build the handler by hand without an `AgentStreamSequence` (Claude websocket ×8, correlated status: `AGENT_STREAM_UNAVAILABLE`). About 40 files read content the same way, most behind live gates. `team-task-event-current-contract` still parses the removed `TASK_EXECUTION_STARTED`.
- **Stale mocked probes of other tickets:** `agent-org-task-team-disclosure` and `team-group-icon` (the removed `agent-org-task-*` rows), `existing-run-model-config` and `interrupt-result-presentation` (mock data with the removed `task_executions` keys; removed this round, not rerun), `composer-context-file-removal` (times out at "Agent copy delegated").
- **Unclassified (after F-76 … F-79):** DLD 18 cases, MSP-02/03/05/06/07/20/33 and the stopped live-reconnect cases, PMU-003/007/019/021/024, TS-001/003/005/006, BR-003/004/006/014, RPE-001 (default 5 s test timeout alone, passes in the full run).
- **Environmental:** context-files CF-001/004, and on base compaction ×2 and MCP (AGY model discovery timeout).
- **HEAD fails the server typecheck gate** (two-node suite 4 errors, baseline 3: RC-46's untyped parameter); typed this round.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-016 / REQ-009, REQ-013 (peers) | Yes | RC-31 … 46 | Proven at the server; the window's peer rows not proven (RTP-04, F-77) |
| AC-017 (statuses by run ID) | Yes | RC-45, FOLLOW-L/D | Proven at the server; rendered statuses fail (F-78) |
| REQ-001 (delegated runs outlive the Stop) | Yes | FOLLOW-D, RC-43, RC-46 | Proven at the server |
| Rule 2 (a delegated run opens by its own path) | Yes | OST-1, RC-46 | Proven at the server; the Team and Org surfaces fail (F-77) |
| Others | — | — | Not proven this round (Fail) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Final Score | What Supports It | Residual Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 60% | the server side proven | the window fails on F-77, F-78, F-79 |
| Changed-boundary execution directness | 85% | two real nodes, real browser, phone, base comparisons | — |
| Cross-boundary integration realism and mock gap | 80% | real servers and browser | no live model run |
| Environment, configuration, identity, and fixture fidelity | 85% | rebuilt dist and phone bundle | — |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | outage, Retry, restore, interrupted and error-ended turns at the server | the window's lifecycle cases unclassified |
| User-surface, browser, and desktop-shell confidence | 45% | RSM, title | F-77 … F-79; DLD and MSP unclassified |
| Durable regression coverage quality and relevance | 75% | the RC rework, OST, the tree reads | stale stream clients and mocked probes left |

- Overall final confidence: 71% (simple average)
- Every critical acceptance criterion directly proven: `No`
- Default final confidence target of 95% met: `No`

## Broader Validation Decision (Mandatory)

- Decision: `Required` and executed: browser, two nodes, phone.
- Execution mode: `Browser`, `Worker or Distributed`.

## Desktop Application Validation

- Approach executed: probe-owned real stacks; API-F01 fresh-clone desktop build.
- Effect on any already-running desktop application: `None`.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10).
- Cases: the migration suites in the full run (own-run, collaborators, message logs, delegated runs) pass after their tree reads were moved.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`.

## Compatibility / Legacy Scope Check

- Compatibility-only or legacy-retention behavior observed: `No`.
- Durable coverage added or retained only for compatibility-only behavior: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed this round: `Yes`.
  - New: `autobyteus-server-ts/tests/e2e/helpers/run-tree-delegated.ts` (a run's delegated runs from `runTree`; tree-change helpers; recorded sources); `tests/e2e/projects/own-stream-turns-read-once.e2e.test.ts` (OST-1 … 3); `tests/e2e/run-history/large-run-activation-timing.e2e.test.ts` (C35-04, gated); `autobyteus-web/tests/e2e/fixtures/run-tree.mjs`; `autobyteus-web/tests/e2e/fixtures/run-socket-ready.mjs`.
  - Reworked to the tree, `/ws/peer-run` and `/ws/run-status`: `remote-delegation-two-server.e2e.test.ts` (RC-31 … 37, 43, 45; RC-35's new routes; RC-46's helper shared); the harnesses `collaboration-root-harness.ts`, `built-studio-roots.ts` (also waits for `CONNECTED`); about 30 server suites in `projects`, `runtime`, `agent-org-runs`, `agent-definitions`, `agent-team-definitions`, `app-data-migrations`, `run-history`, `model-routing` (delegated reads; closures and reopenings as tree changes; the stories' S17; the change feed's `openTarget`).
  - Web probes: the tree reads (`run-tree.mjs`), the Org row selectors, and the command channels of SDV, PMU, TSL and the task-closure probe waiting for the session; two mocked probes' removed keys.
- Added or updated paths attached for proportional test-code review: `Yes` (the commit of this round).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every run's model | Scripted AGY CLI | Deterministic (TESTING.md) | No live model run |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, nodes | Yes | The probes' `finally`; homes removed by the runner scripts; the stopped first run's worker tree stopped and its home removed | Removed |
| The timing test copied into the base worktree | Yes | Removed after its run | Removed |
| `/tmp/api461/r16` logs | Yes | Kept; extract committed | Kept |

## Latest Authoritative Result

- Result: `Fail`
- New findings: F-76, F-77, F-78, F-79; the stale stream clients and mocked probes for failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round: rerun DLD, MSP and the unclassified web cases after F-76 … F-79; the rendered peer checks (RTP-04 … 09); LE-O1 and LE-A1 … LE-T1 once the DeepSeek account has balance.
