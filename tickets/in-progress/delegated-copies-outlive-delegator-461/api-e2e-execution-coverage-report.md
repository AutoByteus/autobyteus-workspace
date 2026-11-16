# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-017`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 17, on CRR-054 (code review passed, round 37). Code under test `568dea0159` (HEAD `c41eb7fc1d`, docs only since). Server `dist` and the phone bundle rebuilt at the start; web from source.
- Scope, in CRR-054's order:
  1. my stale tests (CRR-053);
  2. the F-76 … F-79 and CR-461-105 rechecks;
  3. the unclassified items;
  4. the rendered peer checks;
  5. LE-O1 / LE-A1 … LE-T1;
  6. FU-030.
- Prior round reviewed: API-REV-016 (`Fail`: F-76 … F-79, routed as CR-461-101 … -104; the stale clients and mocked probes mine).
- Deviations: LE-O1 and LE-A1 … LE-T1 not run (the vault's DeepSeek account). Two mocked probes of other tickets not finished (below).
- Evidence: `evidence/api-e2e/API-r17-runs.txt`; raw logs `/tmp/api461/r17`.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`.
- Result route: `Fail` → Code Reviewer, failure-origin review.
- Proportional test-code review decision: `Required` (this round's test changes, listed below).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `568dea0159` | macOS 26.5.2 (Darwin 25.5.0), arm64 | Server E2E folder, scripted AGY | Clean env per run |
| ENV-1b | base `827f1e68dc` | as ENV-1 | Base's own `team-status-live-probe.mjs` | Base worktree, own install and build |
| ENV-2 | `568dea0159` | as ENV-1 | Probe-owned stacks: built server, Nuxt dev, headless Chrome | Never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe, bundle rebuilt | |
| ENV-4 | as ENV-2 | as ENV-1 | Two built-server nodes | Tree probe |

## Cases

| Case ID | Criteria | Env | Result | Notes |
| --- | --- | --- | --- | --- |
| Full server E2E | all | ENV-1 | Pass after test-side fixes | 870 passed, 5 failed; the five fixed test-side (clients now wait for `CONNECTED`; `sequence` set aside) and rerun alone: Pass, apart from the AGY model-discovery timeout on two suites' first case (environmental, as on base) |
| Stale `/ws/agent` clients (CRR-053) | SR-085/087 | ENV-1 | Pass | one shared reader (`helpers/agent-stream-frames.ts`); the hand-built handlers with a sequence; the contract test rewritten to the tree messages |
| F-76 recheck | rule 3 | ENV-1 | Resolved | CF-005, interrupt-resend, linked E04/E10, the Anthropic team restore |
| F-77 recheck | rule 2 | ENV-2/4 | Resolved | SDV-03/06/07, PMU-012/016, osfr B-003, RTP-04's peer Org row ×2 |
| F-78 recheck | statuses | ENV-2 | Resolved | SDV-01 (with IMP-111's wait), BR-010 ×2; TS-004 reaches a REQ-001-stale step (below) |
| F-79, CR-461-105 | leaving rows, AC-011 | ENV-2 | Resolved | BR-001/002 |
| Rendered peer checks | CR-461-099 | ENV-4 | Pass ×2 | RTP-04: node label, files "on {node}", no `@` (with its local control) |
| SDV, BR-008 … 011, osfr, RSM, title, PLN | | ENV-2/4 | Pass | 7/7, 4/4 ×2, 8/8, 7/7, Pass, 10/11 (PLN-04 not 461) |
| RTP-06 | AC-016 | ENV-4 | Fail ×2 | F-81 |
| TS-003, TS-005 … 007 | universal Team status | ENV-2, ENV-1b | Fail (base 7/7) | F-84 |
| PMU-003/018/019 | PMU journeys | ENV-2 | Fail | F-82 |
| BR-003 | closure | ENV-2 | Fail | F-83 |
| CF-006/009 (composer) | attachments | ENV-2 | Fail | F-80 |
| DLD | Settings, launches | ENV-2 | 14/29 | DCP-002 F-86; LRL-001 … 005 Pass; the rest unclassified |
| MSP | phone | ENV-3 | 40 Pass, 15 Fail | ran to the end; unclassified |

### Findings

- **Resolved:** F-76, F-77, F-78 (its probe items), F-79, CR-461-105.
- **F-80 (new): a delegated Org run's composer cannot attach files.** It uploads under an Org member's draft owner (`org_member_draft` with the task agent's run ID); the server refuses "Unable to resolve Org context-file owner '<org run>/<task agent>'" (`composer-context-file-removal` CF-006, CF-009; backend log 4×).
- **F-81 (new): a peer row under a Team delegator does not read "Couldn't reach {node}"** when the node is stopped (RTP-06, 2 of 2; the standalone and Org families do). RTP-06 passed in round 15.
- **F-82 (new; design question): a delegated Team opened at its coordinator is folded.** From its row (PMU-003) or its Task card (PMU-018, PMU-019) the coordinator opens, but the Team row is folded, so the coordinator's row is hidden and not shown selected. Round 14: 25/25. CR-461-104's unified click folds a Team row; base's Agent tree opened the coordinator without folding, base's Org tree folded and inspected, base's Team tree only expanded.
- **F-83 (new): in an Org, the view does not return to the delegating Manager** when the open delegated run's row leaves at its Task's closure (BR-003; the Agent family passes; round 15 Pass).
- **F-84 (new): Team status rows differ from base.** TS-003: a Team run's own row no longer reads busy while only its delegated agents work. TS-005/006/007: with the outer delegated Team collapsed, the nested delegated Team's row is gone. Base's own probe passes all seven cases.
- **F-86 (new): Settings of a delegated Team copy opened in a Team tree shows the delegating Team** ("Home Team" while the copy's lead is selected; DCP-002 screenshot `d-dld/DCP-002-failure.png`).
- **Test-side, done this round:** the stale `/ws/agent` clients; clients that sent before `CONNECTED` (four server suites, LRL's Team send, the phone's node clients); TS-001 and TS-004 per REQ-001 (TS-004's last step still to adjust); SDV-01's wait (IMP-111).
- **Mocked probes of other tickets:** `existing-run-model-config` and `interrupt-result-presentation` fail on base drift (operations and model menus that exist at base); `team-group-icon` B01 and `agent-org-task-team-disclosure` not finished (their expectations are base's per-view row semantics; FU-031 and F-82 decide what they should assert).
- **Unclassified:** DLD DCP-003/005, DCR-001/002/003, DLP-003/004/007, AFS-001/002; MSP-02, 03, 05, 06, 07, 20, 22, 24, 29, 33, 46, 52, 53; PMU-021/024. SIR-001/002 not 461 (round 13), DLP-006 retired, MSP-50/51 not 461.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-016 (peers) | Yes | RC-31 … 46, RTP-01 … 05, 07 … 09 | Proven except the Team family's unreachable notice (F-81) |
| AC-017 (statuses by run ID) | Yes | RC-45, FOLLOW-L/D, SDV-01, BR-010 | Proven at the server; TS-003/005 … 007 differ from base (F-84) |
| REQ-001 | Yes | FOLLOW-D, RC-43, RC-46, TS-001 | Proven |
| Rule 2 (opens by its own path) | Yes | OST-1, RC-46, SDV-03/06/07, PMU-012/016, RTP-04 | Proven; Settings of a Team copy (F-86) and the folded Team (F-82) remain |
| Others | — | — | Not all proven this round (Fail) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Final Score | Residual Uncertainty |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 72% | F-80 … F-86; unclassified DLD and MSP |
| Changed-boundary execution directness | 88% | — |
| Cross-boundary integration realism and mock gap | 82% | no live model run |
| Environment, configuration, identity, and fixture fidelity | 88% | — |
| Failure, edge-case, lifecycle, and recovery evidence | 78% | closure in an Org (F-83) |
| User-surface, browser, and desktop-shell confidence | 62% | F-80 … F-86; DLD, MSP |
| Durable regression coverage quality and relevance | 82% | two mocked probes unfinished |

- Overall final confidence: 79% (simple average). Every critical acceptance criterion directly proven: `No`. Target 95% met: `No`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` and executed (browser, two nodes, phone, base comparison).

## Desktop Application Validation

- Probe-owned real stacks. Effect on any already-running desktop application: `None`.

## Persisted-Data Transition Checks

- `Migration Required` (DS-10): the migration suites pass in the full run. No version-specific runtime branch observed.

## Compatibility / Legacy Scope Check

- Compatibility-only behavior observed or covered: `No`.

## Durable Coverage Changed In The Codebase

- `Yes`:
  - server: `helpers/agent-stream-frames.ts` (new: batch items, live frames, shown text, `waitConnected`); about 25 `runtime` suites and the two live harnesses take frames through it; the Claude websocket and correlated-status harnesses attach an `AgentStreamSequence`; `team-task-event-current-contract` rewritten; four suites wait for `CONNECTED`; correlated-status sets `sequence` aside; two suites keep `receivedAt`;
  - web: `team-status-live-probe.mjs` (TS-001 per REQ-001; the shared row's label, fold and layout for Org rows); `stopped-delegator-views-probe.mjs` (SDV-01 waits for the loaded view); `composer-context-file-removal-probe.mjs` (tree reads, Org selectors, the session wait); `large-runs-load-less-cases.mjs` and `mobile-live-reconnect-cases.mjs` (wait for `CONNECTED`); `existing-run-model-config-probe.mjs` (answers `GetRunTree`).
- Added or updated paths attached for proportional test-code review: `Yes` (this round's commit).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every run's model | Scripted AGY CLI | Deterministic (TESTING.md) | No live model run |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, nodes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| `/tmp/api461/r17` logs | Yes | Kept; extract committed | Kept |

## Latest Authoritative Result

- Result: `Fail`
- New findings: F-80, F-81, F-82 (design question), F-83, F-84, F-86.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review).
- Next round: the unclassified DLD and MSP cases after the fixes; TS-004's last step per REQ-001; `team-group-icon` and `agent-org-task-team-disclosure` once F-82's click semantics are settled; LE-O1 and LE-A1 … LE-T1 once DeepSeek has balance.
