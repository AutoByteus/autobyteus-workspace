# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-019`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 19, on CRR-058 (code review passed IR-039). Code under test `2b20fd0898` (HEAD `63edb246c4`, docs only since). Server `dist` and the phone bundle rebuilt at the start; web from source; the desktop app built from this worktree.
- Scope, in CRR-058's order:
  1. F-87 (AFS-001), F-88 (MSP-24) and F-89 (DCR-001/002 under SR-091) rechecked;
  2. every area rerun, because SR-091 changes names on the server and in most views;
  3. LE-O1 and LE-A1 … LE-T1, now that DeepSeek has balance.
- Added at the user's request:
  - the live suite on the CLI runtimes (Codex, Claude, Antigravity, Grok), on the user's own logins;
  - real-user journeys on an isolated Electron instance of this worktree, across runtimes.
- Prior round reviewed: API-REV-018 (`Fail`: F-87, F-88, F-89; CRR-057 routed them as CR-461-111 … -113).
- Deviations: none.
- Evidence: `evidence/api-e2e/API-r19-runs.txt`; raw logs, recordings and screenshots under `/tmp/api461/r19`.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`.
- Result route: `Fail` → Code Reviewer, failure-origin review (F-90).
- Proportional test-code review decision: `Required`: `dc00f57d64` and this round's test changes, listed below.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `2b20fd0898` | macOS 26.5.2 (Darwin 25.5.0), arm64 | Server E2E folder, scripted AGY | Clean env per run |
| ENV-1b | base `827f1e68dc` | as ENV-1 | Base's own suites | Base worktree |
| ENV-1L | `2b20fd0898` | as ENV-1 | Live: DeepSeek (test vault); Codex, Claude, Antigravity, Grok (the user's logins, approved) | Each server has its own temporary data root |
| ENV-2 | `2b20fd0898` | as ENV-1 | Probe-owned stacks: built server, Nuxt dev, headless Chrome | Never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe, bundle rebuilt | |
| ENV-4 | as ENV-2 | as ENV-1 | Two built-server nodes | Tree probe |
| ENV-5 | as ENV-2 | as ENV-1 | Mocked web probes | |
| ENV-6 | `2b20fd0898` | as ENV-1 | Isolated Electron instance of this worktree (`isolated-app start --build`), driven like a user | Its own ports and temporary data root; stopped and removed afterwards |

## Cases

| Case ID | Criteria | Env | Result | Notes |
| --- | --- | --- | --- | --- |
| Full server E2E | all | ENV-1 | Pass after reruns | 862 passed, 6 failed:<br>• `project-change-feed` ×5: a stale test (its query lacked the Task root's new `displayName`); fixed, 7/7<br>• `delegated-copy-project-folder`: AGY discovery timeout; 8/8 alone<br>• RC-10: 46/46 alone |
| F-87 recheck | D-IMP-3 | ENV-2, ENV-6 | Resolved | AFS-001 Pass; desktop J1: after Save, the stopped copy's card shows the saved model |
| F-88 recheck | AR-028 | ENV-3 | Resolved | MSP-24 Pass (phone 53/55; MSP-50/51 not 461) |
| F-89 recheck | SR-091 | ENV-2, ENV-6 | Resolved | DCR-001/002 Pass: each copy reads its slot name in its row, own context, header, Settings, run list, and on its Task card and Task view where it has a Task of its own. DCR-001's copies are sub-work of their delegator's Task: no Task of their own, as on `personal`. Desktop: rows, headers and Task cards read the slot names |
| Web probes | all | ENV-2/4/5 | Pass | SDV 7/7, TS 7/7, PMU 25/25, CFR 10/10, osfr 8/8, tree ×2, title, RSM 7/7, task closure 16/16 alone, mocked probes, PLN 10/11 (PLN-04 not 461), DLD (SIR-001/002, DLP-006 not 461) |
| Live, Agent root | REQ-001, rule 2 | ENV-1L | Pass | LE-A1/A2/A3 Pass on DeepSeek, Codex, Claude and Antigravity |
| Live, Team root (LE-T1) | AC-001, AC-006 | ENV-1L, 1b | Fail on 3 runtimes | Antigravity Pass; Codex, Claude, DeepSeek F-90 |
| Live, Org root (LE-O1) | AC-012, AC-013 | ENV-1L | Pass | Codex, Claude, Antigravity Pass. DeepSeek: the model declined to make the requested call (model behaviour) |
| Live, Claude LE-F1 / Grok | — | ENV-1L, 1b | Not 461 | LE-F1's stale model is back in Claude's catalog. Grok fails every Agent Tools call, on base too |
| Desktop J1 (Agent) | rule 2, REQ-001, D-IMP-3, SR-091 | ENV-6 | Pass | Hub (Codex) → worker (Claude) → Settings switch to AutoByteus DeepSeek → resumed |
| Desktop J2 (Team) | CR-461-108, SR-082 | ENV-6 | Pass | A Team copy on Antigravity: click opens and selects the coordinator, only the chevron folds, each row its own status |
| Desktop J3 (closure) | AC-001 (closure) | ENV-6 | Pass | DONE by the delegator → the Team copy's rows leave in 9 s |
| Desktop J4 (restart) | persistence, rule 2 | ENV-6 | Pass | After a restart, the tree, names and the copy's conversation return; one message resumes the copy, its Hub stays stopped |

### Findings

- **Resolved:** F-87, F-88, F-89.
- **F-90 (new): a catalog Agent copy delegated in a Team root has no `get_handoff_rules`.**
  - Branch, LE-T1:
    - Claude: "no tool by that name is available in this session";
    - Codex: "`get_handoff_rules` was unavailable";
    - AutoByteus/DeepSeek: "there's no get_handoff_rules tool available to me".
    - Each reported the blocker to `/coord` instead.
  - Base `827f1e68dc`, its own Claude LE-T1: Pass. The same copy calls the tool and gets no rules.
  - The tool's gate is unchanged from base; the run's tool exposure differs. Base hosted the copy as a member of the Team root; 461 makes it a run of its own.
  - The requirements' scope says: "No change to what an agent reads: tool names, parameters, results and collaboration texts." Every agent's collaboration instructions also tell it to call `get_handoff_rules` when it finishes.
- **Observations, classified by CRR-059:**
  - observation 1: an opened copy's header reads "worker" in a Team-root tree (Team surface) and "writer - E997" in an Org tree (Agent surface). Routed as CR-461-115 (Local Fix).
  - observation 2, now **F-91 (low; addendum on CRR-059)**: after a cross-runtime switch, the live chat shows the "Agent runtime changed" notice twice, with an extra copy after the previous reply.
    - It happens on a user-started run as well as on a delegated copy.
    - The identical `runtime-switch-probe` RSW-01 on both trees:
      - base `827f1e68dc`: 1 notice live, 1 after a reload;
      - branch: 2 notices live, 1 after a reload.
    - Base's desktop build doesn't start here: its packaging drops part of `application-sdk-contracts`. That's a base build issue.
    - Evidence: `API-r19-runs.txt` §7.
- **Not 461:** SIR-001/002, DLP-006 (retired), MSP-50/51, PLN-04, Grok (base fails the same), Claude LE-F1's precondition, DeepSeek LE-O1's model choice.
- **FU-030:** no new wording-only refusal difference.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-016 (peers) | Yes | RC-31 … 46, RTP-01 … 09 ×2 | Proven |
| AC-017 (statuses by run ID) | Yes | RC-45, SDV-01, BR-010, TS-001 … 007, desktop J1/J2 | Proven |
| REQ-001 | Yes | FOLLOW-D, RC-43/46, TS, live LE-A2/A3, desktop J1/J4 | Proven |
| Rule 2 (opens by its own path) | Yes | OST, RC-46, SDV, PMU, CFR, DCP-002, live, desktop J1/J2/J4 | Proven |
| REQ-014 / SR-091 (one tree, one name) | Yes | PMU, TCT, MSP, DCR-001/002, desktop | Proven |
| D-IMP-3 (a saved copy's card) | Yes | AFS-001, desktop J1 | Proven |
| Scope: no change to what an agent reads | Yes | live LE-T1, base comparison | Not met (F-90) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Final Score | Residual Uncertainty |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | F-90 |
| Changed-boundary execution directness | 94% | — |
| Cross-boundary integration realism and mock gap | 93% | Grok not usable on this machine |
| Environment, configuration, identity, and fixture fidelity | 93% | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | — |
| User-surface, browser, and desktop-shell confidence | 93% | the two observations |
| Durable regression coverage quality and relevance | 90% | the live suite's rework is new |

- Overall final confidence: 92% (simple average). Every critical acceptance criterion directly proven: `No` (F-90). Target 95% met: `No`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` and executed: browser, two nodes, phone, mocked probes, base comparisons, live models on five runtimes, and the desktop app.

## Desktop Application Validation

- An isolated Electron instance of this worktree build, driven like a user, in four journeys (J1 … J4, above).
- Effect on any already-running desktop application: `None`. Separate ports and data root; stopped with `isolated-app stop`, data root removed, none of mine listed afterwards.

## Persisted-Data Transition Checks

- `Migration Required` (DS-10): the migration suites pass in the full run. A desktop restart (J4) restores the runs, names and conversations.

## Compatibility / Legacy Scope Check

- Compatibility-only behavior observed or covered: `No`.

## Durable Coverage Changed In The Codebase

- `Yes`:
  - **server:**
    - `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts`, reworked to the 461 rules:
      - copies from the tree; definitions and delegators from each copy's own file;
      - own conversations, own team streams and own message logs;
      - placement as the row's parent; Stop per REQ-001;
      - refusals by their arguments, or the runtime's tool-exception frame;
      - refusal steps once the agent is quiet;
    - `tests/e2e/projects/project-change-feed.e2e.test.ts` selects the Task root's `displayName` and asserts the slot name;
  - **web:** `tests/e2e/delegated-copy-own-file-cases.mjs`:
    - DCR-001/002 assert one name everywhere (SR-091);
    - DCR-001's copies are sub-work with no Task of their own;
    - the header is read from either surface.
- Added or updated paths attached for proportional test-code review: `Yes` (with `dc00f57d64`).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Most runs' models | Scripted AGY CLI | Deterministic (TESTING.md) | Covered by the live and desktop runs this round |
| The server (two probes) | Mocked GraphQL and sockets | The probes' own design | Row semantics only |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, nodes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| Isolated Electron instance `iso-54643-8fe0` | Yes | `isolated-app stop` | Stopped, data root removed |
| `/tmp/api461/r19` logs, recordings, screenshots | Yes | Kept; extract committed | Kept |

## Latest Authoritative Result

- Result: `Fail`
- New findings: F-90; F-91 (low, addendum on CRR-059).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review).
- Next round: LE-T1 on Codex, Claude and DeepSeek after F-90. The two observations are for the reviewer to classify.
