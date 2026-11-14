# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-013`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 13, on CRR-045 (code review passed, round 32). Code under test `58cc542572` (HEAD `d3e52f5f4b`, docs only since). I rebuilt the server (`/tmp/api461/r13-build.log`, exit 0); the probes run the web from source.
- Prior round reviewed: API-REV-012 (`Fail`: F-60 … F-66; CRR-043 routed them to the fixes).
- Scope, per CRR-045 (SR-082 item 3): everything that shows or opens runs and statuses; the peer suite and API-P04; open targets (SDV, PMU, PLN; FU-031); Settings (RSM, DCP, AFS, an Org or stopped-Team copy's card); LRL-001, LRL-004, LE-O1 under SR-081, PLN-09, BR-011; regression runs for the rest; API-F01 (the contract packages changed again).
- Refusal wording: FU-030 applies; no new wording-only difference this round (the damaged-log refusal's new text is checked by file and line).
- Deviations from the plan, and why:
  - **Probes and suites moved to `/ws/run-status`** (SR-082 removed the view status frames and the status poll they read). A shared probe client, `tests/e2e/fixtures/run-status-client.mjs`, reads a run's statuses by run ID as a window does. Rewritten: the phone probe's MSP-12 and MSP-20, the closed-task-rows cases, the stories' S17, the lazy-member suite, the follow-child suite, the idle-lifetime suite, SUN-E2E-002, RC-31/RC-32. Checks added: FOLLOW-L (a listed, not-open delegator gets `RUN_TREE_CHANGED`), FOLLOW-D (a stopped delegator's child stays live), RTP-08 (a peer run's status after the unasked end, Retry and a new turn).
  - **The live suite's LE-O1 rewritten** to SR-081 and rule 2 (the copy members' conversations and messages read through their own team). LE-A1 … LE-T1 are not in this round's list and stay stale (they read copies through the delegator's package, the host projection and the host stream).
  - **A typecheck ran during the full server E2E job.** Every file that failed in that job was rerun alone.
  - **No base comparison for the phone:** at base the phone probe stops at load ("duplicate case IDs MSP-32"), base's own defect.
- My own probe errors, corrected and rerun: AFS-001 read the view's `state` instead of the copy's `status`; the Org tree helper missed a delegated Team's address; DCR-001 used a wrong projection field; the idle-lifetime suite's new signal type.
- Evidence folder: `evidence/api-e2e/` (round 13 files carry `r13`; `API-r13-runs.txt` lists every run).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `58cc542572` | macOS 26.5.2 (Darwin 25.5.0), arm64 | In-process and built servers, scripted AGY CLI (`RUN_AGY_FAILURE_E2E=1`) | Full `tests/e2e` folder; clean env |
| ENV-2 | `58cc542572` (server `dist/` rebuilt; web from source) | as ENV-1 | Probe-owned stack: built server, Nuxt dev, headless Chrome; scripted AGY, Grok and LM Studio stand-ins | Clean env; never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe | Owned by the probe |
| ENV-4 | as ENV-2, and base `827f1e68dc` (its own install) | as ENV-1 | Two built-server nodes paired by invite | API-P04, the tree and title probes |
| ENV-5 | HEAD, fresh clone | as ENV-1 | `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` (unsigned) | API-F01 |
| ENV-6 | `58cc542572` | as ENV-1 | In-process server, AutoByteus runtime on DeepSeek | `AUTOBYTEUS_TEST_VAULT`, `RUN_DEEPSEEK_E2E=1`, `AIC_ROOT_RUNTIMES=autobyteus` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-E01 (full server E2E) | regression; SR-082 statuses | Server | `vitest run tests/e2e` | ENV-1 | **Fail** | `API-r13-runs.txt` | 853 passed, 18 failed → after the stale fixes, reruns alone | The rest: remote-delegation-two-server (F-70, F-71, cascades), the extended runtime switch (unclassified) |
| Statuses by run ID, local | SR-082 item 1; REQ-001 | Server | follow-child FOLLOW-A/T/E/L/D, lazy-member, idle-lifetime, SUN-E2E-002, stories S17 | ENV-1 | Pass | `API-r13-runs.txt` | a child's stop and restore with the view open; `RUN_TREE_CHANGED` for a listed, not-open delegator; a stopped delegator's child live | Agent, Team and Org delegators |
| Statuses by run ID, peer | SR-082/083; CR-461-085; AR-403 | Server, two nodes, real browser | RC-31, RC-32; RTP-04, RTP-05, RTP-08 | ENV-1, ENV-4 | **Fail** (F-70) | `API-r13-F70-F71-RTP-04-peer-offline-no-live-answer.png` | the peer row's status live | `offline` at the unasked end, then never live again (RC-32, RTP-08), so the row's stop icon is hidden (RTP-05) |
| Peer live output | AC-802 (autobyteus-278); rule 2/3 | Two nodes, real browser | RTP-04; RC-31, RC-33, RC-34 | ENV-1, ENV-4 | **Fail** (F-71) | as above; `API-P04-r13-peer-shape-compare.json` | the owner's message answered live in the opened peer run | Commit `445f1ed947` removed `remote_agent_presentation` |
| API-P04 | Rule 3 (rows), SR-083 | Two nodes | the same probe at base and on the branch, capturing key shapes | ENV-4 | Pass for the row shapes | `API-P04-r13-peer-shape-compare.json` | peer rows | Branch adds `open_target`; `launches` on both (F-66 resolved); the only base-only peer frames are the live output ones (F-71) |
| Open targets | SR-083 step 3; FU-031, FU-024 | Real browser | SDV 7/7, PMU 25/25, PLN 9/11 | ENV-2 | Pass | `API-r13-runs.txt` | SDV-07 in Agent, Team, Org trees | PLN-04 not 461; PLN-09 below |
| Settings | DS-12; SR-064; V-11; F-39; CR-461-079/080 | Real browser | RSM, DLD (DCP, DCR, AFS), SSR | ENV-2 | **Fail** (F-60, F-69) | `API-r13-F60-*.png` | the saved card; the stored launches | RSM 7/7; AFS-001 (F-62 resolved), DLP-004, DCR-001 pass; AFS-002's Org copy card shows (F-61 resolved) |
| Delegator Stop from Settings with working children | REQ-001; DS-13 | Real browser | SSR-002 (first run), DCR-002 | ENV-2 | **Fail** (F-68, intermittent) | `API-r13-F68-SSR-002-delegator-stop-refused.png` | the run reads Stopped | |
| LRL-001, LRL-004 | large-runs-load-less AC-003, AC-006; CR-461-082/083 | Real browser | DLD LRL cases | ENV-2 | Pass | `API-r13-runs.txt` | one load; the refusal names the file and line | F-64, F-65 resolved |
| PLN-09 | AC-008 (REQ-007) | Real browser | with archive diagnostics | ENV-2 | **Fail** (F-67) | `API-r13-F67-PLN-09-archive-diagnostics.json` | the refusal's reason in the window | |
| Phone | SR-082 item 1; SR-083 step 3 | Phone shell | `mobile-shell-probe.mjs` | ENV-3 | **Fail** (F-73) | `API-r13-F73-phone-list-no-delegated-rows.png` | delegated rows, Team run screens | 18/30, then aborted; MSP-12 passes (no status poll) |
| Remote title | autobyteus-278 titles | Two nodes | `remote-run-title-probe.mjs` | ENV-4 | **Fail** (F-72, minor) | `API-r13-runs.txt` | the Team row's title stays | |
| LE-O1 live | SR-081 | DeepSeek | `-t LE-O1`, two runs | ENV-6 | Partly | `API-r13-runs.txt` | the correction | The SR-081 step passes in both runs; both then stop at the mounted lead's teammate delegation (unclassified) |
| BR-008 … BR-011 | restart | Real browser | `task-closure-tree-probe.mjs` | ENV-2 | 15/16 | `API-r13-runs.txt` | | BR-011: "org: conversation after restart", the same step as round 12 |
| `owner-scoped-file-reads` (seeded) | AC-001 … AC-012 | Real browser, phone | seeded | ENV-2 | Pass | | B-001 … B-007, T-API | T-API's rule-2 form passes |
| API-F01 | build inputs | Fresh clone, release desktop build | TESTING.md "Fresh-start build" | ENV-5 | Pass | `API-r13-runs.txt` | exit 0 | Signing and other platforms: runner only |

### Findings

- **Resolved from round 12:** F-61 (an Org copy's own card), F-62 (a live copy shown live and locked after its delegator's Stop), F-63 (the correction before step 2), F-64, F-65, F-66. FU-031: SDV-07 passes in all three trees.

| ID | Case | Expected (authority) | Observed (`58cc542572`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-60 (remains) | DCP-001, DCP-003, DCP-005; SSR-004 | V-11 / CR-461-078: an edited agent shows no origin; the edit is the run's own launch; CR-461-079 rows from the view with their launch | After a copy's Save the card still shows the old origin ("Agent default", `data-source="agent_default"`; a Team copy member "Team default"). SSR-004: the thinking saved `xhigh` is stored on the member's own run, yet the reopened card shows `High`. So the Settings rows keep the launch they were read with | `Local Fix` (web) |
| F-67 | PLN-09 | AC-008: refused, "and the reason is shown" | "Archive all" under P sends `ArchiveStoredRun` per run; the server refuses one: "This run can't be archived while a run it delegated to is working (/fact_checker_924b). …"; the window shows only "Archived 1 run. 1 failed." (`archiveRunRecord` drops the message) | `Local Fix` (web) |
| F-68 | SSR-002 (one of two runs), DCR-002 | REQ-001: the delegator stops; its delegated runs keep working | Stopping a delegator from its Settings while its delegated runs work: an Agent Manager with two working Team copies showed "Couldn't terminate this run. Try again." and stayed Running (the second run stopped normally); an Org with working copies kept "Running" in its Settings with "Org configuration changed topology, identity, or locked fields. Refresh" while its tree showed its members stopped | `Unclear` (intermittent; web or server) |
| F-69 | SSR-002, DCR-003 | Design (SR-075, F-39): a team-level choice on a stopped delegated team "changes the team's default, and each member keeps its own saved launch" | After a team-level Save, the copy team's own file has its default **and its following lead** on the new model (SSR-002 stored: lead `dlc-alt-model` → `gemini-3.8-flash-low`; DCR-003 stored lead = the team choice). Members with their own default or their own earlier save keep theirs | `Local Fix` (server) |
| F-70 | RC-32, RTP-08, RTP-04, RTP-05 | SR-082/083: a peer run's statuses through its handle on `/ws/run-status`; CR-461-085: Retry observes again | On alpha a peer run's agents read `offline` (snapshot) and never change: not after beta's owner turns it, not after the outage, Retry and a new turn on beta (RTP-08 `changesAfterRetry: []`). The opened peer run's header says Offline while it works; the row's stop icon is hidden, so RTP-05 cannot stop it | `Local Fix` (server) |
| F-71 | RTP-04; RC-31, RC-33, RC-34; API-P04 | AC-802 (autobyteus-278): a remote run's live output shows in the delegating window | The owner's message reaches the peer run, but its answer never shows live; the delegator views carry no peer output (`remote_agent_presentation` removed in `445f1ed947`). Design line 411 (rule 2) moves a child's output to its own stream, but a peer child has no such stream on the delegating node | `Unclear` (design: where a peer child's output is shown) |
| F-72 (minor) | RRT-05 | A Team row keeps its stored title (autobyteus-278 SR-004) | On the peer node, a peer-started Team's row shows the delegated task message as its title for ~100 ms after the owner's message, then its title. **Base comparison (after CRR-046):** the same probe (identical at base) at `827f1e68dc` passes RRT-05 twice, the row showing only its title; the branch flashed in both runs that completed (a third stopped in setup on the scripted CLI's model discovery timeout) | `Local Fix` candidate (461; base does not flash) |
| F-73 | Phone MSP-02, -03, -05, -06, -08, -11, -14, -16, -17, -20, -33, -43 | SR-083 step 3 (the phone opens where the server says); the phone list as the desktop (autobyteus-426) | The phone list shows no delegated rows under a listed run (the Project Task Manager with delegated work has no disclosure), and a Team run's screen does not open (`team:delivery_team…`); the desktop shows the same rows | `Local Fix` (web, phone) |

**Unclassified:**
- `runtime-switch-members-extended-built-server`: on the branch it failed three ways in three runs (EX-01 "attempt: outcome"; EX-04 `SESSION_NOT_READY` on the native first turn; the setup's `providerModelCatalogSnapshots` request); base `827f1e68dc` passes 5/5.
- LE-O1's later step (the mounted lead's teammate delegation, the same in two runs; the model's tool arguments are not in the server log).
- AFS-002's later step: in a fresh page, the stopped Org's direct agent's Settings did not open.
- BR-011 (now the same step twice).

**Stale, rewritten this round** (each now follows the requirements and design): the status reads listed under Deviations; `topRun` in the change feed (SR-080); the "settings" origin in the stopped-run model-config suite and RS-02 (CR-461-078); RC-31's row (`launches`, `open_target`); C1 read as its own run and the copies stopped by their own Stop after the root's (DCR-001, DCR-002; REQ-001); the Org tree's Team copy address in the probe helper; SDV-07 to FU-031; RTP-08 added.

**Stale, still waiting:** the live suite's LE-A1 … LE-T1; the large-hub probe's redesign.

**Not 461:** PLN-04; the base phone probe's duplicate case IDs.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 … AC-006 | Yes | rounds 8 … 10; this round's full server E2E | Proven | — |
| AC-007 | Yes | SDV 7/7, PMU 25/25 | Proven | — |
| AC-008 | Yes | server suites; PLN-09 | Not Proven in the window (F-67) | — |
| AC-010 (REQ-006) | Yes | DCP, DCR, SSR, AFS, RSM | Not Proven (F-60, F-69) | — |
| AC-016 / REQ-009, REQ-013 (peers) | Yes | RTP, RC, API-P04 | Not Proven (F-70, F-71) | — |
| AC-017 (statuses by run ID) | Yes | FOLLOW-A/T/E/L/D, lazy-member, idle-lifetime, MSP-12 | Proven locally; not for peers (F-70) or the phone's rows (F-73) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 84% | 84% | Six findings resolved; local statuses proven | F-60, F-67 … F-73 | The fixes |
| Changed-boundary execution directness | 94% | 94% | Full server E2E, two nodes, phone, live, fresh build | — | — |
| Cross-boundary integration realism and mock gap | 88% | 88% | Live DeepSeek; base/branch capture | Scripted AGY elsewhere | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 92% | Base with its own install | No base phone probe | — |
| Failure, edge-case, lifecycle, and recovery evidence | 84% | 84% | Restarts, outages, Retry | F-68, F-70; BR-011 | The fixes |
| User-surface, browser, and desktop-shell confidence | 76% | 76% | SDV, PMU, RSM, LRL | F-60, F-67, F-71, F-73 | The fixes |
| Durable regression coverage quality and relevance | 90% | 90% | Run-status client; FOLLOW-L/D, RTP-08 added; 20 probes and suites updated | LE-A1 … LE-T1 | After the fix |

- Overall post-repository confidence: 87%
- Overall final confidence: 87%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-008, AC-010, AC-016, AC-017 partly)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-60, F-67 … F-73; the unclassified items

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Worker or Distributed`, live runtime
- The confidence gap it addresses, and the expected gain: rendered statuses, Settings and peer rows on the new status spine.
- Browser validation needed, and why or why not: yes. F-60, F-67, F-70, F-71 and F-73 are visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack; the fresh-clone desktop build (API-F01).
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: signing, notarization and the other platforms (runner only).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10); CR-461-078's `"settings"` origin is for new writes only (design).
- Cases proving the migration outcome: the full server E2E's migration suites (pass).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none new.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - Added: `autobyteus-web/tests/e2e/fixtures/run-status-client.mjs`; FOLLOW-L and FOLLOW-D (`delegator-view-follows-child.e2e.test.ts`); RTP-08 (`remote-runs-in-tree-probe.mjs`).
  - Server suites updated: `delegated-team-lazy-member-activation`, `collaboration-contract-stories` (S17), `delegator-view-follows-child`, `task-copy-idle-lifetime`, `project-change-feed`, `ad-hoc-task-delegation` (delete diagnostics), `stopped-run-model-config-graphql`, `runtime-switch-native-built-server` (RS-02), `agy-skill-update-notice-roots` (SUN-E2E-002), `remote-delegation-two-server` (RC-31, RC-32), `agent-initiated-collaborators` (LE-O1).
  - Web probes updated: `mobile-shell-probe` (MSP-12, MSP-20), `mobile-closed-task-rows-cases`, `stopped-delegator-views-probe` (SDV-07), `large-runs-load-less-cases` (LRL-004), `projects-left-navigation-probe` (PLN-09), `agent-settings-focused-cases` (AFS-001), `delegated-copy-own-file-cases` (DCR-001/002/003), `delegated-launch-defaults-probe` (Org Team addresses), `settings-saved-model-refresh-cases` (SSR captures).
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every probe run's model | Scripted AGY CLI; the Grok and LM Studio stand-ins | Deterministic (TESTING.md) | The live LE-O1 covers a real model |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes, peer nodes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| `p04-capture-probe.mjs` | Yes | Generated for the capture, removed after it; never committed | Removed |
| Fresh clone `/tmp/api461/r13-f01-clone` | Yes | Removed after the round | Removed |
| Base worktree `461-base-827f1e68` | Yes | Kept for the next base comparison | Kept |
| `/tmp/api461/` logs | Yes | Kept; extracts committed (home paths shortened, secret scan clean) | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix`: F-60 (web), F-67 (web), F-69 (server), F-70 (server), F-73 (web, phone).
- `Unclear`: F-68 (intermittent), F-71 (where a peer child's live output is shown), F-72 (minor).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-008 in the window (F-67); AC-010 (F-60, F-69); peers AC-016 / REQ-009 / REQ-013 (F-70, F-71); the phone's rows (F-73); a delegator's Stop with working children from Settings (F-68).
- Recommended owner: per the failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round: recheck F-60, F-67 … F-73 (DCP-001/003/005, SSR-002/004, DCR-002/003, PLN-09, RC-31 … RC-37, RTP-04/05/08, RRT-05, the phone probe in full); then the unclassified items and LE-A1 … LE-T1.
