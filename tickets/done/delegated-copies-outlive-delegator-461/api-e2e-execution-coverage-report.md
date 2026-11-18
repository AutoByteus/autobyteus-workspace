# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-022`
- Test progress log: `api-e2e-test-progress.md`
- **Round 22 (the release smoke, the Delivery Engineer's request, 2026-11-17):**
  - Trigger: `python3 scripts/release_smoke.py` failed before tagging on `d978347600`. The failing case was `workspace-skill-links-live` "brand-new team member" on Claude, Codex and Grok, with `SESSION_NOT_READY`.
  - Done: reproduced; compared with base; classified test-side (from this stage); fixed; the local check added.
  - Code under test: `368b093846` plus this round's test-only changes. No product file changed.
  - Evidence: `evidence/api-e2e/API-r22-release-smoke-triage.txt`; raw logs `/tmp/api461/r22`.
  - The rest of this report is round 21's, which this round does not change. The round-22 cases and finding are marked "r22".
- Round and trigger (round 21): round 21, on CRR-062 (the base merge reviewed, Pass). Code under test is `339602ff36`, the merge of `origin/personal` `1e8b6e5d0a`; HEAD `ed33e2452c` has only doc commits since. The server `dist` and the phone bundle are as the Implementation Engineer rebuilt them from the merged tree; web from source.
- Scope, by the user's decision (2026-11-16) and CRR-062:
  1. the full server E2E folder, once, on the merged code;
  2. the RRT-05 base comparison, 5 runs each at the current base `1e8b6e5d0a` and on the branch, plus `827f1e68dc`;
  3. the merged areas: the composer probe (CF-013, CF-014) and the base's phone size-limit cases.
- Earlier rounds stand for what this round did not rerun:
  - API-REV-020 for the live suite (four runtimes), the desktop journeys and the web probes;
  - API-REV-019 for the full web set.
  - The merge changed none of 461's paths beyond the five conflict files (CRR-062).
- Prior round reviewed: API-REV-020 (`Pass`).
- Deviations: none. Grok is a follow-up (FU-035, the user's decision).
- Evidence: `evidence/api-e2e/API-r21-runs.txt`; raw logs `/tmp/api461/r21`.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`.
- Result route: `Pass` → Code Reviewer, proportional test-code review, then delivery (a beta, the user's decision).
- Proportional test-code review decision: `Required` (`dc00f57d64`, `2ecdb8b356`, `8df4a7ee41`, `67d8ea56bc`, round 21's commit, and round 22's test commit).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `339602ff36` | macOS 26.5.2 (Darwin 25.5.0), arm64 | Server E2E folder, scripted AGY | Clean env per run |
| ENV-2 | `339602ff36` | as ENV-1 | Probe-owned stacks: built server, Nuxt dev, headless Chrome | Never the user's app or `~/.autobyteus` |
| ENV-2b | base `1e8b6e5d0a`, base `827f1e68dc` | as ENV-1 | Each base's own worktree, install and build | The `1e8b6e5d0a` worktree was created for this round and removed afterwards |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe, the merged phone bundle | |

## Cases

| Case ID | Criteria | Env | Result | Notes |
| --- | --- | --- | --- | --- |
| Full server E2E | all | ENV-1 | Pass | 886 passed, 0 failed (193 files; 343 live-gated skips) |
| RRT-05 base comparison | REQ-014 (titles) | ENV-2, 2b | Not a finding | 15/15 Pass. The peer Team row's first text is its title within 2–18 ms on all three trees; the task message never shows |
| Composer probe | context files, rule 2 | ENV-2 | Pass | 12/12, including the base's CF-013 and CF-014 |
| Phone MSP-53 … 58 | the base's size limits; AC-007 stopped delegators | ENV-3 | Pass | 6/6 alone, after one environmental AGY discovery timeout in setup. The merge's ID clash was fixed (below) |
| LIVE-1, LIVE-2 (AC-001, real runtime) | AC-001 | ENV-1 + live DeepSeek | Pass | Rerun on `339602ff36` for the proof table: 2/2 (`delegated-run-outlives-delegator-live`, test vault) |
| Type gates | — | — | Pass | Server production 0 (tests at baseline); web production 0 (tests at baseline), cross-package 0 |
| SMOKE-AC105 (r22) | AC-105 of skill links; the stream protocol | ENV-1 + Claude, Codex (the user's CLI logins) | Fail → Pass after the test fix | Before: the branch fails 2/2 and base `827f1e68dc` passes 2/2. After: the case passes 2/2 (Claude, Codex) and the whole file 6/6. Command: `env -i PATH HOME="$HOME" USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts --no-watch`. Evidence: `API-r22-release-smoke-triage.txt` §1, §5 |
| CONNECT-TIMING (r22, temporary) | the stream protocol | ENV-1, both trees | Cause shown | Base: CONNECTED in the open's tick (0 ms ×7); the on-open send is accepted. Branch: CONNECTED 1–9 ms after the open; the on-open send gets `SESSION_NOT_READY`. §2 |
| STREAM-WAIT-CHECK (r22, durable) | the stream protocol | unit run, no gate | Pass | `tests/unit/e2e-helpers/team-stream-clients-wait-for-connected.test.ts` 2/2. The same rule over HEAD before the fix flags exactly the 10 stale files. §4 |
| AGY image, scripted (r22) | — | ENV-1, fake AGY | Pass | `agy-native-image-multi-artifact-preview` 2/2 with its CONNECTED wait. §5 |
| Server typecheck (r22) | — | — | Pass | Production 0; tests 1012 in 316 files = baseline |

### Findings

- **No open findings.**
- **Round 22, test-side from this stage, fixed: F-92, test clients that send before `CONNECTED`.**
  - Ten E2E files sent a command on a Team/Org socket's `open`, against the protocol (`api/websocket/agent.ts`: "Retry after CONNECTED message"). Nine are live-gated, and one is a scripted suite that passed by luck.
  - 461 sends a Team/Org view's `CONNECTED` after its reads (F-76, CR-461-101), so such a send is now always refused. The product client waits (`agentTeamRunStore.ensureTeamStreamConnected`).
  - Round 17 fixed the scripted clients but found them by running suites, so gated files no run executed kept the bug.
  - Fixed: the clients wait for `CONNECTED`. The stage that let it through gets a check that runs without gates (STREAM-WAIT-CHECK) and a TESTING.md Gates rule.
  - Grok's other two smoke failures are HTTP 429 (quota exhausted), not code; Grok is FU-035.
- **Test-side, fixed this round (from the merge):**
  - the base's phone size-limit cases and 461's stopped-delegator cases both used MSP-53 … 55, and the probe skips a second case with a used ID;
  - 461's cases are renumbered MSP-56 … 58;
  - the probe's start-up duplicate check now also reads `journey('ID'`, so such a clash stops the probe before any stack starts.
- **A collision, recorded:** my first start of this round (before the reviewer's hold reached me) ran a server build that removed `dist`. The Implementation Engineer rebuilt it from the merged tree.
- **Not 461:** SIR-001/002, DLP-006, MSP-50/51, PLN-04, Claude LE-F1's precondition; Grok (FU-035).

## Acceptance-Criteria Proof

### How to read this table

- **Evidence files** are in `evidence/api-e2e/`:
  - **X** `API-r21-ac-proof-extract.txt`: the pass lines from round 21 on the merged state `339602ff36`, under `== <suite>` headings;
  - **R21** `API-r21-runs.txt`; **R20** `API-r20-runs.txt`; **R19** `API-r19-runs.txt`; **R18** `API-r18-runs.txt`.
- **Pre-merge (M):** every proof from a round before 21 holds on the merged state for two reasons:
  - the merge changed none of 461's paths beyond the five conflict files, and each resolution keeps both sides (CRR-062);
  - the full server folder reran on `339602ff36` (886/886).
- **Real runtime:** live models with keys from the test vault, or the user's own CLI logins (approved 2026-11-16). Grok is FU-035.

### Proof by criterion

| AC | Cases (round) | Evidence | Pre-merge note |
| --- | --- | --- | --- |
| **AC-001**<br>The delegated run outlives its delegator's Stop | **Real runtime:** LIVE-1 (an Agent child's real turn finishes after the delegator's Stop) and LIVE-2 (a Team child's coordinator), live DeepSeek, rerun in round 21 on `339602ff36`.<br>**Scripted:** FOLLOW-A/T for agent, team and org delegators (r21); contract stories §5.1 S5–S9 (r21), where S8 stops copy E, the runs E's member delegated keep working, and S9 messages them.<br>**Edge, a run delegated by a delegated run:** stories S5/S8/S9 (r21); live LE-A3 (a copy member's copy is kept after the Stop) on DeepSeek, Codex, Claude and Antigravity (r20).<br>**Desktop:** J1, the copy keeps running after the Hub's Stop (r20) | X `== delegated-run-outlives-delegator-live`: LIVE-1 ✓, LIVE-2 ✓ (`Tests 2 passed`)<br>X `== delegator-view-follows-child` (3 ✓)<br>X `== collaboration-contract-stories` ("§5.1 S0 … S27" ✓)<br>R20 §2 (LE per runtime)<br>R20 §6 J1 | M for LE-A3 and J1 |
| **AC-002**<br>Reports by run ID and by address | Stories (r21):<br>• S7: a delegated Team's member reports by address (`/project_task_manager`) and by run ID;<br>• S18: a delegated lead reports to M by run ID;<br>• U4 by address; U10 by run ID.<br>The harness compares the run files after every step with the contract walkthrough, so each report is in the delegator's conversation exactly once.<br>FOLLOW-A/T (r21): the child's report restores the stopped delegator.<br>Live LE-A1/A2 (r20): copies report back by run ID | X `== collaboration-contract-stories` (§5.1, §5.2 ✓)<br>X `== delegator-view-follows-child`<br>R20 §2 | M for LE |
| **AC-003**<br>Resume the stopped delegator; it messages its delegated runs | FOLLOW-A/T (r21): the delegator restores and its view follows the child.<br>Stories S4, S11, S12 (r21): messages and a reassignment by run ID; S11 wakes the idle run.<br>Web SDV-01 … 07 (r19): the stopped delegator's views, where a message wakes only the addressed run.<br>Desktop J4 (r20): after a restart, one message resumes the run and it receives later messages | X `== delegator-view-follows-child`, `== collaboration-contract-stories`<br>R19 §3 ("SDV 7/7")<br>R20 §6 J4 | M for SDV and J4 |
| **AC-004**<br>A stopped delegated run A; B keeps running; B wakes A | Stories §5.1 (r21):<br>• S5, S6, S13: SD, inside the delegated Team copy E, delegates `/product_team`, `/image_maker` and `/upscaler`;<br>• S8: the user stops E;<br>• S9: the product designer's message to SD by run ID wakes SD.<br>DRO-1 (r21): nested runs E → P → I, each nested under its delegator | X `== collaboration-contract-stories`<br>X `== delegated-runs-own-runs-startup` (DRO-1 ✓) | — |
| **AC-005**<br>Task closure while the delegator is stopped and while it runs | Stories (r21):<br>• S10: the assigner's message while DONE is refused with base's closed-Task text;<br>• S11: reopened, the message continues the run;<br>• S14, S19: DONE, and sub-work stays closed.<br>CLS-E2E-001/002 and the reactivation journeys in three roots (r21); task-closure-root-visibility in three roots (r21); FENCE-1 … 3 (r21).<br>**Edge, a follow-up Task by run ID:** U11 (r21); TKD in `task-existing-copy-assignment` (r21); SEV-E2E-003 (r21).<br>Web task-closure-tree BR-001 … 016 (r19, 16/16). Desktop J3 (r20): closure by the delegator removes the rows | X `== task-reactivation-root-visibility` (6 ✓)<br>X `== task-closure-root-visibility` (3 ✓)<br>X `== closed-task-input-fence` (3 ✓)<br>X `== collaboration-contract-stories`<br>R21 §1 (TKD, SEV-E2E-003 in the full run, 886/886)<br>R19 §3 (task-closure-tree)<br>R20 §6 J3 | M for BR and J3 |
| **AC-006**<br>A team member's or an org agent's delegated run outlives the team/org run's Stop | FOLLOW-T, team and org delegators (r21); stories §5.2 U3–U10 and §5.3 O5–O8 (r21); task-closure-root-visibility for Team and Org roots: closing the Task stops the delegated run (r21).<br>Live LE-T1 and LE-O1 (Stop, then reopen) on DeepSeek, Codex, Claude and Antigravity (r20).<br>Web TS-001 … 004 (r19): the stopped Team/Org run's delegated rows stay live.<br>**Edge, a report while the team run is stopped:** FOLLOW-T (r21); stories U10 (r21) | X `== delegator-view-follows-child`, `== collaboration-contract-stories`, `== task-closure-root-visibility`<br>R20 §2 (LE-T1/O1 per runtime) | M for LE and TS |
| **AC-007**<br>Live output of a running delegated run under a stopped run, desktop and phone | Phone MSP-56 … 58 (agent, team and org roots), rerun alone in round 21 on `339602ff36` (6/6 with MSP-53 … 55).<br>OST-1 … 3, a run's own stream (r21). Web SDV-01 … 07 (r19).<br>Desktop J1 (r20): the copy opened after the Hub's Stop shows its live output; the Hub stays stopped; a message to the copy wakes only it | R21 §3 (MSP-53 … 58 6/6)<br>X `== own-stream-turns-read-once`<br>R19 §3 (SDV 7/7)<br>R20 §6 J1 | M for SDV and J1 |
| **AC-008**<br>Archive/delete refused while a delegated run works; then allowed | Stories (r21):<br>• S26: delete refused while the research agent works; the reason names it;<br>• S27: after its Stop, the delete succeeds, and its report to the deleted run is refused.<br>RC-44 (r21): a peer child working blocks archive and delete; an unreachable node is named.<br>TAU-3 (r21): deleting a hub removes only its folder; its delegated runs' folders stay, listed as runs of their own.<br>Web PLN-09 (r19): archive refused with the reason shown | X `== collaboration-contract-stories`<br>X `== remote-delegation-two-server` (RC-44 ✓)<br>X `== task-agent-own-run-startup` (TAU-3 ✓)<br>R19 §3 (PLN) | M for PLN |
| **AC-009**<br>Shutdown and start | **Update restart:** DRO-1/DRO-3 (r21). Restart resume brings back the busy delegated run that an update restart interrupted; every other run stays stopped, including the stopped delegator. The notice's text itself is not asserted by API/E2E.<br>**Plain restart:** USR-5, a new process reads every log fresh (r21); UC-2 (r21); RC-13, peer restart (r21); desktop J4 (r20): each run offline with its conversation, continued by its next message | X `== delegated-runs-own-runs-startup` (DRO-1, DRO-3 ✓)<br>X `== unclean-shutdown-delegated-team-restore` (USR-5 ✓)<br>X `== standalone-unreadable-tree-containment` (UC-2 ✓)<br>X `== remote-delegation-two-server` (RC-13 ✓)<br>R20 §6 J4 | M for J4 |
| **AC-010**<br>Model saves on a stopped run with a running delegated run, and on a stopped delegated run | DCM-001 … 010 in three roots (r21). RS-03 (r21): a host with a delegated copy saves its own runtime and the copy's model in one Save. MSR-001 … 003 and the stopped-run config lifecycle (r21).<br>Web AFS-001 (r19), DCR-001/002 (r20).<br>Desktop J1 (r20): a stopped copy switched from Claude to AutoByteus DeepSeek and saved; the card shows it, and the next message runs on it | X `== delegated-copy-model-change`<br>X `== runtime-switch-native-built-server` (RS-03 ✓)<br>X `== stopped-run-model-config-graphql`<br>R19 §1 (AFS-001)<br>R20 §3 (DCR), §6 J1 | M for AFS, DCR and J1 |
| **AC-011**<br>Peers; the peer-started run's `delegatedFrom` | RC-05 (r21): the peer-started run's `run_metadata.json` `delegatedFrom` equals `{ nodeId: alpha, delegatingRun: { kind: "agent", runId }, delegatorAgentRunId }` (test line 1011). RC-43, RC-46 (r21); stories S17 and S25 to a peer (r21).<br>Web RTP-01 … 09, two nodes (r19, ×2) | X `== remote-delegation-two-server` (RC-05, RC-43, RC-46 ✓)<br>R19 §3 (remote-runs-in-tree) | M for RTP |
| **AC-012**<br>REQ-009's preserved operations; an application's termination | The full server folder on `339602ff36` (r21: 886/886), the verification's "existing tests adapted or green"; it includes CM-E2E-1 … 3, ad-hoc-task-delegation, task-existing-copy-assignment and project-task-context-files-delegation.<br>Application termination: `application-reload-repair` RE-01 … 05 (r21).<br>Web composer 12/12 (r21); osfr B-001 … 007, files (r19); PMU 25/25, Task page (r19). Desktop J1 … J3 (r20): delegate, Task page and closure | R21 §1<br>X `== collaboration-model-contract`, `== ad-hoc-task-delegation`, `== project-task-context-files-delegation`, `== application-reload-repair`<br>R21 §3 (composer)<br>R19 §3<br>R20 §6 | M for osfr, PMU and J1 … J3 |
| **AC-013**<br>Idle shutdown and wake | `task-copy-idle-lifetime` (r21): quiet copies shut down after the grace in every root; background copies outlive it. SEV-E2E-004 (r21): a copy shut down while idle wakes with its conversation.<br>**Edge, waiting for tool approval:** proven at unit level, the verification's "Server tests". `DelegatedRunIdleShutdown` "keeps the host when it is not quiet", and AgentRun "returns null … when quiescent preparation sees an active turn" (server unit, IMP-126). 461's change to `agent-run.ts` does not touch quiescence.<br>The live E2E for this edge (`mixed-task-delegation` LIVE-002) needs LM Studio, Codex and Claude together, and was not run | X `== task-copy-idle-lifetime`<br>X `== task-agent-several-tasks.*SEV-E2E-004`<br>Unit: `tests/unit/standalone-agent-run-root/delegated-run-idle-shutdown.test.ts`, `tests/unit/agent-execution/agent-run.test.ts:793` | — |
| **AC-014**<br>Migration | DRO-1 … 3, TAU-1 … 3, OT-1 … 3, UC-1/2 (r21), plus `collaborators-to-delegated-runs-startup` and `team-run-v1-production-upgrade` in the full run (r21). Each starts the built server, the same one the desktop embeds, on hand-built data of each shape, and a second start changes nothing. An isolated desktop instance started on such data was not run | X `== delegated-runs-own-runs-startup`, `== task-agent-own-run-startup`, `== open-task-tree-upgrade-startup`, `== standalone-unreadable-tree-containment` | — |
| **AC-015**<br>The two documents | Document review, not an API/E2E case. The documents are `collaboration_model.md` and `GLOSSARY.md`.<br>• Updated by the Implementation Engineer (`implementation-handoff.md`, REQ-012 "Updated").<br>• The Code Reviewer's docs verdict (`code-review-report.md`, Round 1, "Docs-Impact Verdict") is the last recorded review.<br>• The current text is for the delivery engineer's docs sync to confirm. API/E2E did not review the documents | `code-review-report.md` Docs-Impact Verdict; `implementation-handoff.md` REQ-012 | — |
| **AC-016**<br>Peer children with the delegator stopped | RC-43, RC-45, RC-46 (r21). Web RTP-01 … 09, two nodes (r19, ×2), with RTP-06's unreachable-node notice | X `== remote-delegation-two-server` (RC-43, RC-45, RC-46 ✓)<br>R19 §3 | M for RTP |
| **AC-017**<br>One server-built tree; statuses by run ID | **Server:** stories S17, the peer row in M's tree, where M's status answer carries no peer status and the peer's own answer lists its agents (r21); RC-45 (r21).<br>**Web:** TS-001 … 007 (r19); SDV-01 and BR-010 (r19); PMU (r19); RSM (r20).<br>**Phone:** MSP-02, 03, 05, 07, 29 (r18).<br>**Desktop:** J1/J2, each row's own status (r20) | X `== collaboration-contract-stories`<br>X `== remote-delegation-two-server` (RC-45 ✓)<br>R19 §3<br>R20 §5, §6<br>R18 §3 | M for the web, phone and desktop rows |

- Every criterion has a proving case. Two clauses are proven below API/E2E level, and both are recorded above:
  - AC-013's approval edge, at unit level;
  - AC-009's restart-notice text.
- There is no finding.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Final Score | Residual Uncertainty |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | — |
| Changed-boundary execution directness | 95% | — |
| Cross-boundary integration realism and mock gap | 95% | — |
| Environment, configuration, identity, and fixture fidelity | 94% | base desktop not available for comparison |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | — |
| User-surface, browser, and desktop-shell confidence | 96% | — |
| Durable regression coverage quality and relevance | 95% | — |

- Overall final confidence: 95% (simple average). Every critical acceptance criterion directly proven: `Yes`. Target 95% met: `Yes`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` and executed. This round: the full server folder, the base comparisons and the merged areas. Earlier rounds: live models on four runtimes and the desktop journeys (API-REV-020).

## Desktop Application Validation

- Not rerun this round. API-REV-020's isolated-instance journeys stand: the merge changed no desktop path of 461.
- Effect on any already-running desktop application: `None`.

## Persisted-Data Transition Checks

- `Migration Required` (DS-10): the migration suites pass in the full run.

## Compatibility / Legacy Scope Check

- Compatibility-only behavior observed or covered: `No`.

## Durable Coverage Changed In The Codebase

- `Yes`:
  - Round 22:
    - new `autobyteus-server-ts/tests/unit/e2e-helpers/team-stream-clients-wait-for-connected.test.ts`;
    - the clients wait for `CONNECTED` after the open in `autobyteus-server-ts/tests/e2e/runtime/`: `workspace-skill-links-live`, `agent-semantic-memory-live`, `agy-delegated-background-task`, `agy-native-image-multi-artifact-preview`, `claude-delegated-background-task`, `claude-team-inter-agent-roundtrip`, `claude-team-member-background-task`, `codex-team-inter-agent-roundtrip`, `grok-build-live-runtime`, `team-busy-member-mid-turn-delivery` (`.e2e.test.ts`);
    - `TESTING.md` Gates: find every test client by search, gated files included; a rule readable from the source goes in a unit check.
  - Round 21:
  - `autobyteus-web/tests/e2e/mobile-stopped-delegator-cases.mjs`: 461's phone cases renumbered MSP-56 … 58;
  - `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`: the start-up duplicate check also reads `journey('ID'`; the case comment updated.
- Added or updated paths attached for proportional test-code review: `Yes`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Run models in these suites | Scripted AGY CLI | Deterministic (TESTING.md) | Live models covered in API-REV-020 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| Base worktree at `1e8b6e5d0a` | Yes | `git worktree remove` | Removed |
| `/tmp/api461/r21` logs | Yes | Kept; extract committed | Kept |
| Temporary timing test (r22), copied into the branch and base worktrees | Yes | Deleted after the runs; 0 copies left | Removed |
| `/tmp/api461/r22` logs | Yes | Kept; extract committed | Kept |

## Latest Authoritative Result

- Result: `Pass` (round 22). The release smoke case SMOKE-AC105 failed from a test-side defect of this stage (F-92), which is fixed; the case passes 2/2 and its file 6/6.
- New findings: F-92 (test-side, fixed in this round).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review), then delivery.
