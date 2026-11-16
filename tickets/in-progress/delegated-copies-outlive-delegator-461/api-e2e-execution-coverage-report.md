# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-018`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 18, on CRR-056 (code review passed IR-038). Code under test `bac59031c3` (HEAD `c7dcdc371f`, docs only since). Server `dist` and the phone bundle rebuilt at the start; web from source.
- Scope, in CRR-056's order:
  1. the probe items (CFR, DLD, PMU-019/021/024, MSP, TS-003/005 … 007, `team-group-icon` B01, `agent-org-task-team-disclosure`) to the approved rules, with CR-461-108 for the row clicks;
  2. the F-80 … F-83 and F-86 rechecks and the triage's fixes (MSP-33/46/52/53, MSP-06, AFS-002);
  3. every area with open or unclassified cases rerun, so the result is complete;
  4. LE-O1 and LE-A1 … LE-T1;
  5. FU-030 for wording-only refusal differences.
- Prior round reviewed: API-REV-017 (`Fail`: F-80 … F-86; CRR-055 found F-84 stale and the two mocked probes base drift).
- Deviations: LE-O1 and LE-A1 … LE-T1 blocked by the provider account (402 on the first turn).
- Evidence: `evidence/api-e2e/API-r18-runs.txt`; raw logs `/tmp/api461/r18`.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`.
- Result route: `Fail` → Code Reviewer, failure-origin review (F-87; F-88 and F-89 for a decision).
- Proportional test-code review decision: `Required` (this round's probe changes, listed below).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `bac59031c3` | macOS 26.5.2 (Darwin 25.5.0), arm64 | Server E2E folder, scripted AGY | Clean env per run |
| ENV-1b | base `827f1e68dc` | as ENV-1 | Base's suite, with base's own install and build | Base worktree |
| ENV-1L | `bac59031c3` | as ENV-1 | Live DeepSeek (`RUN_DEEPSEEK_E2E=1`); keys from the test vault only | |
| ENV-2 | `bac59031c3` | as ENV-1 | Probe-owned stacks: built server, Nuxt dev, headless Chrome | Never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe, bundle rebuilt | |
| ENV-4 | as ENV-2 | as ENV-1 | Two built-server nodes | Tree probe |
| ENV-5 | as ENV-2 | as ENV-1 | Mocked web probes (Nuxt with a fixture page) | |

## Cases

| Case ID | Criteria | Env | Result | Notes |
| --- | --- | --- | --- | --- |
| Full server E2E | all | ENV-1 | Pass after reruns | 871 passed, 4 failed. Alone: interrupt-resend 3/3 and EXC 7/7 (the first run hit the AGY model-discovery timeout), provider-secret 6/6 (the first run's 392 ms vs a 250 ms budget was load). DCF-E2E-007 is in the next row |
| DCF-E2E-007 (package live refresh) | not 461 | ENV-1, 1b | Not 461 | DCF-E2E-007 alone: base fails the same check ("to include 'APAR Fresh Scout'", 300 ms after the write) in 3 of 4 runs; the branch in 2 of 3, its fourth run an AGY discovery timeout. The suite's other file-watch cases (DCF-002, DCF-003) also fail at random on both trees (base 2 of 3 full runs, branch 2 of 3) |
| F-80 recheck (composer) | rule 2 | ENV-2 | Resolved | CFR 10/10: each copy's attachments go under its own draft owner; CF-009 removed (its premise is impossible under rule 2) |
| F-81 recheck | AC-016 | ENV-4 | Resolved | RTP-06 Pass ×2 (remote-runs-in-tree Pass ×2) |
| F-82 recheck | CR-461-108 | ENV-2 | Resolved | PMU 25/25 (PMU-003/018/019) |
| F-83 recheck | closure | ENV-2 | Resolved | task-closure-tree 16/16 (BR-003) |
| F-84 (stale) | SR-082, REQ-001 | ENV-2 | Pass | TS 7/7 after the rework: on TS-003 a Team row reads its own members; TS-005 … 007 run with the outer Team expanded |
| F-86 recheck | rule 2 | ENV-2 | Resolved | DCP-002 Pass |
| Triage fixes | | ENV-2/3 | Pass | MSP-06, 33, 46, 52, 53 Pass; AFS-002 Pass |
| MSP | phone | ENV-3 | 52/55 | MSP-02, 03, 05, 07, 20, 22, 29 Pass after the rework; MSP-24 is F-88; MSP-50/51 not 461 |
| DLD | Settings, launches | ENV-2 | 23/29 | DCP-002/003/005, DCR-003, DLP-003/004/007, AFS-002 and LRL Pass; AFS-001 is F-87; DCR-001/002 are F-89 (their models are right); SIR-001/002 not 461; DLP-006 retired |
| SDV, BR-008 … 011, osfr, RSM, title, PLN | | ENV-2/4 | Pass | 7/7, Pass, 8/8, 7/7, Pass, 10/11 (PLN-04 not 461) |
| Mocked probes | CR-461-108, FU-031 | ENV-5 | Pass | `team-group-icon` B01 … B04; `agent-org-task-team-disclosure` B01 … B08 |
| LE-O1, LE-A1 … LE-T1 | live | ENV-1L | Blocked | The 5 cases ran on DeepSeek with keys from the test vault; each one stopped at its first turn with "402 Insufficient Balance" (ERROR frame, `provider_status` 402). Nothing of 461 was reached |

### Findings

- **Resolved:** F-80, F-81, F-82, F-83, F-86. F-84 was stale; the reworked probe passes 7/7.
- **F-87 (new): a stopped Agent copy's Settings card shows its earlier model after Save.** Seen in AFS-001 twice. A's model is changed and Save shows "Saved. Changes apply when this run resumes."; A's own run stores the new model (`aStored: dlc-alt-model`). But A's card still reads "Gemini test", with the origin "Agent default", 10 s later as well (`/tmp/api461/r18/dld2/AFS-001-failure.png`). D-IMP-3 and the design-spec's row `launch` (origin "settings" after an edit, V-11) say the card shows the saved model.
- **F-88 (new, low): the phone reads a listed run's tree again without a rows notice.** Seen in MSP-24 twice:
  - each Task close's `RUN_TREE_CHANGED` gets its one `GetRunTree` (at 349 and 1248 ms), and nothing is read while quiet;
  - about 5 s later the phone re-reads its run list (`ListWorkspaceRunHistory` and `ListCollaborationRootHistory` at 5039 ms), and 8 ms later reads the PTM's tree with no notice (5047 ms).

  Base made no read after the closes. The design reads a listed run's tree "when it is first shown and again on its `RUN_TREE_CHANGED`".
- **F-89 (new; design question): a copy opened from its row is named differently from its row.** In DCR-001/002, the Team's copies' rows read "worker" and the Org's read "writer". The opened copy's view uses its definition's name: "Slot Worker 0528", and "Org Writer b8b2 - 3BBD" in the header (`/tmp/api461/r18/dld3/DCR-002-failure.png`). Base named both after the slot ("worker"). Each copy's model is right (AC-004). Rule 2 makes the copy's context its own run's, and REQ-014 says "the same row behaves the same"; neither one names the copy. The probe now asserts that the context names the copy as its row does. The Solution Designer decides which name is right.
- **Not 461:** SIR-001/002 (round 13), DLP-006 (retired), MSP-50/51 (round 11), PLN-04 (round 11). `existing-run-model-config` and `interrupt-result-presentation` are base drift (CRR-055).
- **Recorded:** `delegated-team-default-collapse-probe.mjs` (line 466) still asserts the retired `task_execution_started` / `task_executions_closed` events. It is outside this round's scope and was not run.
- **FU-030:** no new wording-only refusal difference.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-016 (peers) | Yes | RC-31 … 46, RTP-01 … 09 ×2 | Proven |
| AC-017 (statuses by run ID) | Yes | RC-45, FOLLOW-L/D, SDV-01, BR-010, TS-001 … 007 | Proven |
| REQ-001 | Yes | FOLLOW-D, RC-43, RC-46, TS-001/003/004, AFS-001's B | Proven |
| Rule 2 (opens by its own path) | Yes | OST-1, RC-46, SDV-03/06/07, PMU-012/016, RTP-04, CFR, DCP-002 | Proven; the copy's name (F-89) is open |
| REQ-014 (one server-built tree) | Yes | PMU, TCT, MSP-02/03/05/07/29, mocked disclosure probes | Proven except F-88 (an extra read) |
| D-IMP-3 (a saved copy's card) | Yes | AFS-001 | Not proven (F-87) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Final Score | Residual Uncertainty |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 86% | F-87; F-89 to decide |
| Changed-boundary execution directness | 92% | — |
| Cross-boundary integration realism and mock gap | 82% | no live model run (DeepSeek 402) |
| Environment, configuration, identity, and fixture fidelity | 90% | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | — |
| User-surface, browser, and desktop-shell confidence | 84% | F-87, F-89 |
| Durable regression coverage quality and relevance | 88% | — |

- Overall final confidence: 87% (simple average). Every critical acceptance criterion directly proven: `No` (D-IMP-3). Target 95% met: `No`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` and executed (browser, two nodes, phone, mocked probes, base comparison, live).

## Desktop Application Validation

- Probe-owned real stacks. Effect on any already-running desktop application: `None`.

## Persisted-Data Transition Checks

- `Migration Required` (DS-10): the migration suites pass in the full run. No version-specific runtime branch observed.

## Compatibility / Legacy Scope Check

- Compatibility-only behavior observed or covered: `No`.

## Durable Coverage Changed In The Codebase

- `Yes` (web probes only):
  - `composer-context-file-removal-probe.mjs`: each copy's own draft owner; CF-009 removed;
  - `delegated-launch-defaults-probe.mjs`, `delegated-copy-own-file-cases.mjs`, `agent-settings-focused-cases.mjs`, `settings-saved-model-refresh-cases.mjs`:
    - Settings rows by tree row key;
    - DCR-001's records from `runTree`;
    - DCR-001/002 read each copy's own context and its row's name;
    - AFS-001 records the stored model before the card's check;
  - `project-manager-ux-probe.mjs`, `project-manager-ux-task-locator-cases.mjs`: PMU-019's active run; PMU-021's focus; PMU-024's tree hold;
  - `mobile-shell-probe.mjs`, `mobile-file-open-cases.mjs`, `mobile-closed-task-rows-cases.mjs`, `mobile-live-reconnect-cases.mjs`:
    - tree row keys and `GetRunTree`;
    - MSP-22's own socket;
    - MSP-24 ties each tree read to a `RUN_TREE_CHANGED` notice and records what was read around a read without one;
  - `team-status-live-probe.mjs`: TS-003 per SR-082 and REQ-001; TS-004's Stop; TS-005 … 007 with the outer Team expanded, each Team checked against its own members;
  - `team-group-icon-probe.mjs`, `agent-org-task-team-disclosure-probe.mjs` and its fixture page: CR-461-108 (a row opens and reveals; only the chevron folds), the shared transient row (FU-031), the seeded run tree.
- Added or updated paths attached for proportional test-code review: `Yes` (this round's commit).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every run's model | Scripted AGY CLI | Deterministic (TESTING.md) | Covered by the live row where it ran |
| The server (two probes) | Mocked GraphQL and sockets | The probes' own design | Row semantics only |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, nodes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| `/tmp/api461/r18` logs | Yes | Kept; extract committed | Kept |

## Latest Authoritative Result

- Result: `Fail`
- New findings: F-87; F-88 (low); F-89 (design question).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review).
- Next round: AFS-001 after F-87; MSP-24 and DCR-001/002 once F-88 and F-89 are decided.
