# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-011`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 11, on CRR-040. Code under test `a4641a0985` (CR-461-076, SR-080). I rebuilt the server myself (`/tmp/api461/r11-build.log`, exit 0); the probes run the web from source (Nuxt dev).
- Prior round reviewed: API-REV-010 (round 10, `Fail`: F-54; F-55 closed and O-10a rejected in CRR-039).
- Refusal wording: per the user's decision (FU-030), a refusal whose outcome is right but whose wording differs from base is recorded under FU-030's "Collected differences", not as a failure. This round added three entries (DLP-003, DLP-005, SIR-001).
- Order of work, following the reviewer's list:
  1. CR-461-076;
  2. API-B03's batch-1 open items and batch 2;
  3. the rest under the agreed rule.
- Deviations from the plan, and why:
  - **Product failures remain (F-56, F-57; F-59 a candidate), so under the agreed rule these wait for the fix:**
    - the remaining API-B03 rewrites (listed under "Stale, rewrite waiting");
    - the SSR cases;
    - API-P04;
    - API-F01: the web's GraphQL types were regenerated this round, so the fresh-start build is required; it runs on the fixed code;
    - the live `agent-initiated-collaborators`.
  - **Not Tested under the safety rules:** the delegated background-task live suites (the Claude CLI or real Antigravity CLI login).
- My own probe errors, corrected and rerun:
  - SDV-06's first form used a worker's `task_id` delegation, which a task agent cannot do (contract §2.1: "You are a task agent, so you can't use task_id");
  - the seeded probes were first run without their seed step.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 11 files carry `r11`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-2 | `a4641a0985` (server `dist/` rebuilt by this round; web from source) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Probe-owned stack: built server, Nuxt dev, headless Chrome; scripted AGY CLI (and the LM Studio stand-in, the Grok stand-in where the probe uses them) | Clean env `env -i PATH HOME=<resolved temp> TMPDIR USER`; never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-2 | Phone shell probe | Owned by the probe |
| ENV-4 | as ENV-2 | as ENV-2 | Two built-server nodes (alpha, beta) paired by invite | Owned by the probe |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-461-076 recheck | AC-007; rule 2; SR-080 | Real browser | `node tests/e2e/project-manager-ux-probe.mjs --output-dir <dir>`, `projects-left-navigation-probe.mjs` | ENV-2 | Pass | `API-B03-r11-probes.txt` | PMU 25/25; PMU-003, PMU-018, PMU-019, PLN-05 `Pass` | PMU-019's selector corrected to `/editor` (TC-12) |
| Delegator kind × worker kind from the Task card (SDV-06, new) | SR-080 | Real browser, docked Projects panel | `stopped-delegator-views-probe.mjs --cases SDV-06` | ENV-2 | **Fail** (F-59, candidate) | `API-B03-r11-F59-agent-worker-from-panel-not-opened.png` | the worker's own conversation in the center | With the Agent delegator open, clicking the agent worker's line on its Task card leaves the center on the Manager. A worker two hops down is not a Task root (contract §2.1: a task agent cannot assign a Task; its delegation is sub-work), so it is not a case; a nested task-Team member is PMU-019 (Pass) |
| A running delegated Team opened from its row (SDV-07, new) | rule 2; CR-461-076 (the store fix) | Real browser | `--cases SDV-07` | ENV-2 | **Fail** (F-56) | `API-B03-r11-F56-team-delegator-team-row-not-opened.png` | the coordinator's conversation in the center | Agent delegator: the Team row opens the coordinator. Team delegator: the Team row does not, while the coordinator's own row below it does (two runs) |
| API-B03 batch 1 | AC-005, AC-012; rule 2 | Real browser | as above | ENV-2 | Partly | `API-B03-r11-probes.txt` | PMU 25/25; PLN 9/11; BR 15/16 | Stale cases rewritten: PMU-004 (REQ-001 / REQ-007 / TC-3), PMU-009 (REQ-007), PMU-024 (DS-11 / TC-9), PLN-06 (the closure read from the Task's root), BR-001 (no agent tree file), and the closure probe's view input after its snapshot. PLN-09 and BR-011: see the triage list |
| API-B03 batch 2 | rule 2; DS-12; SR-064 | Real browser | `runtime-switch-members`, `delegated-launch-defaults`, `existing-run-model-config`, `owner-scoped-file-reads` (seeded), `delegated-copies-large-hub` (seeded), phone MSP-44 … 46, MSP-50 … 52 | ENV-2, ENV-3 | **Fail** (F-57; stale rewrites waiting) | `API-B03-r11-probes.txt`, `API-B03-r11-F57-RSM-04-after-reopen.png` | RSM 5/7; DLD 9/29; MSP-44 … 46 `Pass` | See Findings and the triage lists |
| API-P03 | REQ-002 peer rows, rule 1 | Two nodes, real browser | `remote-runs-in-tree-probe.mjs`, `remote-run-title-probe.mjs` | ENV-4 | Pass | `API-B03-r11-probes.txt` | `remote-runs-in-tree probe: Pass`; `remote-run-title probe: Pass` | The peer row in the standalone, Team and Org families (node chip, title, status), the opened peer run, Stop, and the peer offline then back |
| API-P04, API-F01, the SSR cases, live `agent-initiated-collaborators` | as planned | — | — | — | Next Round | — | — | After the fix |

### Findings

- **Round 10's F-54:** resolved (CR-461-076).

| ID | Case | Expected (authority) | Observed (`a4641a0985`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-56 | SDV-07 | Rule 2: selecting a delegated row opens that run by its own path, as in the Agent delegator's view (CR-461-076's store fix applies to the row as well) | In a **Team** delegator's view, clicking the running delegated Team's row expands it but leaves the center on the Manager; the coordinator's own row below it opens the coordinator. In an Agent delegator's view, the same Team row opens the coordinator. Confirmed in two runs | `Local Fix` (web) |
| F-57 | `runtime-switch-members` RSM-04, RSM-06; `delegated-launch-defaults` AFS-001 (likely DCP-001) | SR-064: a delegated copy's launch, saved from its delegator's Settings, is saved through the copy's own save, and the editor's reload shows it | After Save, the copy's card shows nothing (RSM-04, `savedSummary: ""`) or the old model (RSM-06), until Settings are reopened; the reopened card shows the saved value (RSM-04 `reopenedSummary`: Antigravity CLI). AFS-001: "A's card shows the saved model" fails the same way. The save itself persists (the copy then runs on it) | `Local Fix` (web) |
| F-59 (candidate) | SDV-06 | SR-080: a Task card's worker line opens the worker as clicking its row does | With the Agent delegator selected in the workspace, clicking the agent worker's line on its Task card (docked Projects panel) leaves the center on the Manager after 30 s. PMU-018 (a Team worker from the panel) passes | `Local Fix` (web), to confirm in the fix round |

**Stale, rewrite waiting** (base probes using a removed path; rewrite after the fix, per the rule):
- `delegated-launch-defaults`:
  - the Settings row helper derives a team copy's address from its members' prefixed addresses (TC-12 makes them `/lead`): DLP-004, DLP-006, DLP-007;
  - DCP-002 and DCR-003 expect team "followers" (F-39);
  - DCR-001 reads `taskAgent.launchSource` (E6);
  - DCP-005 addresses a member under the delegation prefix (A-6, "Use /unoffered").
- Still to read: DCP-003, DCP-004, AFS-002, LRL-001, LRL-004, LRL-005.
- The SSR cases: SR-064 / SR-075.
- `owner-scoped-file-reads`: T-API, B-001 and B-005 read a delegated copy's file content through the host route; B-003's org task-agent row selector.
- `delegated-copies-large-hub`: its seed sends copy commands through the hub's stream (rule 2: the copy's own stream).
- `projects-left-navigation` PLN-09: "Archive all" under P is still refused after the squad's Stop. Another P run's delegated run is working (REQ-007); to find it.

**Not 461 (recorded):**
- `existing-run-model-config` (a mocked page): the Settings runtime UI changed on base in `817bd9950f` (2026-11-10), after the probe's last update (2026-11-02); 461's diff in that UI is one spec file.
- Phone MSP-50, MSP-51: desktop code-block wrapping (autobyteus-23).
- PLN-04: the composer's model menu option for a new Team run (the scripted CLI offers the model).

**Wording only (FU-030):** DLP-003, DLP-005, SIR-001 (added to `follow-ups.md`).

**Unclassified:**
- SIR-002: `helper_run_5555` (the server-helper run that 20261020 deletes; SID-2 passes on the server) is still present after a successful removal in this live upgrade around real runs.
- BR-011: after a real backend restart; its failing step varied across three runs.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 … AC-006 | Yes | rounds 8 … 10 (server, stories, live) | Proven | — |
| AC-007 | Yes | PMU 25/25, PLN-05, SDV-01 … 05 (round 9/10), SDV-07 Agent delegator | Not Proven in full (F-56: Team delegator's Team row; F-59 candidate) | — |
| AC-008 … AC-016 | mixed | rounds 8 … 10; API-P03 (peer rows rendered) | Proven | — |
| DS-12 (SR-064) | — | RSM, AFS, DCP | Not Proven in full (F-57) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 90% | Server criteria proven; PMU 25/25; peer rows rendered | F-56, F-57, F-59 | The fix |
| Changed-boundary execution directness | 92% | 92% | Real browser, two nodes, all server E2E (round 10) | — | — |
| Cross-boundary integration realism and mock gap | 85% | 85% | — | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | — | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 88% | Restarts, closures, peers offline | BR-011 varies | — |
| User-surface, browser, and desktop-shell confidence | 78% | 78% | PMU, PLN, peer probes | F-56, F-57, F-59; DLD rewrites | The fix and the rewrites |
| Durable regression coverage quality and relevance | 85% | 85% | SDV-06/07 added; 13 probes updated for rule 2 | DLD, SSR, seeded probes still stale | The rewrites |

- Overall post-repository confidence: 87%
- Overall final confidence: 87%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-007: F-56, F-59)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-56, F-57, F-59; the waiting rewrites; API-F01

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Worker or Distributed`
- The confidence gap it addresses, and the expected gain: the web's rule-2 paths across the base probes (in progress).
- Browser validation needed, and why or why not: yes. These paths are visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: the waiting rewrites; the Electron-built SSR cases.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome: rounds 9 and 10 (unchanged code this round).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: SIR-002 (unclassified).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - **Added:** SDV-06 and SDV-07 in `stopped-delegator-views-probe.mjs` (and a squad Team definition in its definitions).
  - **Updated for 461:**
    - `project-manager-ux-probe.mjs`: PMU-019 `/editor`; PMU-004 (REQ-001, REQ-007, TC-3); PMU-009 (REQ-007; the Temp-task query's ingress);
    - `project-manager-ux-task-locator-cases.mjs`: PMU-024 (DS-11, TC-9);
    - `projects-left-navigation-probe.mjs`: PLN-06's closure from the Task's root; PLN-09 stops the delegated squad;
    - `task-closure-tree-probe.mjs`: no agent tree file; view input after the snapshot;
    - `owner-scoped-file-reads-probe.mjs`: task agents read by their own run;
    - `delegated-copies-large-hub-probe.mjs`: team members through their own team.
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every run's model | Scripted AGY CLI; the probes' LM Studio and Grok stand-ins | Deterministic (TESTING.md) | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, peer nodes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| Seed folders (`/tmp/api461/r11-web/*-seed*`, synthesized) | Yes | Kept for the next round's rerun | Kept |
| `/tmp/api461/` logs and probe output | Yes | Kept; extracts committed (home paths shortened, secret scan clean) | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix` (web): F-56, F-57; F-59 (candidate).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-007 in a Team delegator's view and from a docked Task card (F-56, F-59 candidate); DS-12's saved-card refresh (F-57).
- Preliminary classification and recommended owner: Implementation Engineer (F-56, F-57, F-59), confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round:
  - First: recheck F-56 (SDV-07), F-57 (RSM-04/06, AFS-001), F-59 (SDV-06).
  - Then:
    - the waiting rewrites (DLD's Settings rows and copy cases, SSR, the seeded probes, PLN-09);
    - SIR-002 and BR-011;
    - API-P04;
    - API-F01;
    - the live `agent-initiated-collaborators`.
