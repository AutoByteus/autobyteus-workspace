# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-015`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 15, on CRR-049 (code review passed, round 34). Code under test `77f24482a8` (HEAD `e2db923419`, docs only since). I rebuilt `autobyteus-server-ts/dist` myself before the runs (the implementer had confirmed it free of traces); web from source.
- **A targeted check only**, as CRR-049 asks: the user has decided to build the run trees on the backend in 461 (FU-034); the Solution Designer is revising the design, and the full rerun follows that implementation.
- Prior round reviewed: API-REV-014 (`Fail`: F-70 in the window, F-74, F-75, D-IMP-1; BR-011 classified 461's; CRR-048 routed them as CR-461-094 … -098).
- Scope (CRR-049):
  1. CR-461-094: RTP-01 … RTP-08, the new RC-45, and a churn check (a view with peer rows open for minutes: the status settles and alpha does not re-observe beta in a loop);
  2. CR-461-096/097: MSP-32 and MSP-25 (`GetTaskWorkerTasks` from `/ws/projects` is base's and outside AC-006);
  3. CR-461-098: BR-008 … BR-011, several runs;
  4. CR-461-095: AFS-002.
- Refusal wording: FU-030; no new difference.
- Deviations: none from the request. LE-O1 still waits for the test vault's DeepSeek top-up (402 Insufficient Balance in round 14).
- **The churn check's method (new, RTP-09):** the two-node probe puts a counting TCP proxy in front of beta: beta advertises the proxy's address, so every connection to beta (alpha's and the probe's own) goes through it, and each new connection's first request line is recorded. A view with peer rows stays open for three minutes; the case counts the `run-observations` connections alpha opens to beta in that window and the peer run's status changes on a `/ws/run-status` subscription. A loop like round 31's (about 33,000 re-observations per run) would show as many connections per second.
- Evidence folder: `evidence/api-e2e/` (`API-r15-targeted-checks.json`); raw logs `/tmp/api461/r15`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` for this round's probe change (`remote-runs-in-tree-probe.mjs`: the counting proxy and RTP-09; `task-closure-tree-probe.mjs`: the BR-011 step record from round 14's addendum)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `77f24482a8` | macOS 26.5.2 (Darwin 25.5.0), arm64 | Two real server processes, scripted AGY (`RUN_AGY_FAILURE_E2E=1`) | `tests/e2e/remote-collaboration` |
| ENV-2 | `77f24482a8` | as ENV-1 | Probe-owned stack: built server, Nuxt dev, headless Chrome; scripted runtimes | Clean env; never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe | Owned by the probe |
| ENV-4 | as ENV-2 | as ENV-1 | Two built-server nodes; beta behind the probe's counting proxy | RTP-09 |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Peer server suite incl. RC-45 | CR-461-094; SR-083 | Two server processes | `vitest run tests/e2e/remote-collaboration` | ENV-1 | Pass | `API-r15-targeted-checks.json` | 46/46 | RC-45: a peer run's status on alpha follows again after an outage, for a run no open view shows |
| RTP-01 … RTP-08 | CR-461-094; AC-016 | Two nodes, real browser | `remote-runs-in-tree-probe.mjs`, two runs | ENV-4 | Pass ×2 | as above | the row's status and stop icon; live again after the outage and Retry | F-70 resolved in the window |
| RTP-09 (churn, new) | CR-461-094 | Two nodes, beta behind a counting proxy | three minutes with the view open | ENV-4 | Pass ×2 | as above | `run-observations` connections; status changes | 0 observations opened and 0 status changes in each 180 s window (6 observations before the window, while the rows were first shown); final statuses settled (`idle`, `offline` for the never-started member) |
| MSP-25, MSP-32 | CR-461-096/097; autobyteus-426/435 | Phone shell | `--cases=MSP-13,MSP-21,MSP-22,MSP-25,MSP-32` | ENV-3 | Pass | as above | no reads while hidden; no refused sockets after the revoke | F-74, F-75 resolved |
| BR-008 … BR-011 | CR-461-098 | Real browser, real backend restarts | three runs | ENV-2 | Pass ×3 | as above | the reactivated Org worker's conversation after the second restart | BR-011 resolved |
| AFS-002 | CR-461-095 (D-IMP-1) | Real browser | three runs | ENV-2 | Pass ×3 | as above | Settings stay open across focus in an Org | D-IMP-1 resolved |

### Findings

- **Resolved:** F-70 (in the window), F-74, F-75, D-IMP-1, BR-011.
- **No new finding.**
- **Observation (not a finding):** in the first of the two tree runs the browser logged once "Failed to open team: Error: Team context '…' became mounted while it was loading." (`teamRunOpenCoordinator.ts:60`, a guard present at base `827f1e68dc`), while opening the Remote Squad team; every case of that run passed and its rows opened. The second run logged no browser error. Recorded for the reviewer's judgement.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-016 / REQ-009, REQ-013 (peers) | Yes | RC-31 … RC-45; RTP-01 … RTP-09 | Proven (this round's scope) | — |
| AC-017 (statuses by run ID) | Yes | RC-45, RTP-08/09, MSP-25/32 | Proven (this round's scope) | — |
| Others | — | rounds 13 and 14 | As recorded there; the full rerun follows the FU-034 implementation | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 92% | Every requested check passes, repeated | Targeted scope only | The full rerun after FU-034 |
| Changed-boundary execution directness | 94% | 94% | Two real nodes, phone, real restarts, a wire-level count | — | — |
| Cross-boundary integration realism and mock gap | 87% | 87% | Two real server processes | No live model run (DeepSeek balance) | A funded test account |
| Environment, configuration, identity, and fixture fidelity | 92% | 92% | Server rebuilt after the implementer's trace build | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 92% | Outage and Retry, revocation, two restarts ×3 | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 90% | RTP, MSP, AFS repeated | One base-guard console error in 1 of 2 runs | — |
| Durable regression coverage quality and relevance | 92% | 92% | RTP-09 adds a churn guard | — | — |

- Overall post-repository confidence: 91%
- Overall final confidence: 91%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` for this round's scope
- Any final applicable category below `90%`: `Yes` (no live model run)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: the targeted scope (the full rerun follows FU-034); no live model run until the DeepSeek top-up

## Broader Validation Decision (Mandatory)

- Decision: `Required` (deferred to the full rerun after FU-034, per CRR-049)
- Execution mode: `Browser`, `Worker or Distributed`
- The confidence gap it addresses, and the expected gain: this round's fixes, repeated; the churn at the wire.
- Browser validation needed, and why or why not: yes; done for this round's scope.

## Desktop Application Validation

- Approach executed: probe-owned real stack.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: the full suites (next round).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10); not in this round's scope.
- Cases proving the migration outcome: round 14.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none new.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added this round: `Yes`.
  - `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs`: a counting TCP proxy in front of beta (`startCountingProxy`; beta's advertised address is the proxy's); RTP-09, the churn check (`--churn-ms`, default 180000); the proxy's connection counts in the evidence.
  - `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`: the BR-011 step records its markers and a screenshot on a timeout (round 14's addendum).
- Added or updated paths attached for proportional test-code review: `Yes` (the two files above).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every probe run's model | Scripted AGY CLI | Deterministic (TESTING.md) | No live model run this round |
| Network path alpha → beta | A local TCP pass-through proxy (counts connections; changes no bytes) | To count observations at the wire | None for behavior |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, peer nodes, proxies | Yes | The probes' `finally` (proxies closed); homes removed by the runner script | Removed |
| `/tmp/api461/r15` logs | Yes | Kept; extract committed (home paths shortened, secret scan clean) | Kept |

## Latest Authoritative Result

- Result: `Pass` (targeted check of CR-461-094 … -098)
- Criteria not proven: none in this round's scope.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review of the two probe changes)
- Notes for the next round: the full rerun after the FU-034 implementation (every suite and probe); LE-O1 and LE-A1 … LE-T1 once the DeepSeek test account has balance; the base-guard console error (1 of 2 tree runs) is watched.
