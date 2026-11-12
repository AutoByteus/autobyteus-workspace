# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3, the code review pass CRR-015 at `da80596b0a` (merged state `8a47481617`).
- Prior round reviewed: API-REV-002 (round 2, at `f75cf6b96b`, `Fail`: F-6 … F-10).
- Order of work (the reviewer's list):
  1. the stale tests first (autobyteus-agents-107);
  2. API-E02;
  3. API-B01;
  4. the deferred cases.
- Deviations from the plan, and why:
  - **The stale rewrites found product failures.** `collaboration-prompt-wording` was checked against the requirements before rewriting. Its failures are not stale: the requirements' non-goal says "No change to what an agent reads: … collaboration texts". So it is kept and its failures are F-11 … F-13.
  - **The round ends at a product `Fail`.** Under the skill, the stale files not yet rewritten wait for the fix and come first in the next round (`Next Round`). The investigation lists each one. The same applies to the deferred cases API-E01 (full run), API-I01, API-B03, API-L01 and API-F01.
  - **Prior failures were rechecked before routing.** API-E02 and API-B01 rechecked F-6 … F-10 on this code, so the fix round starts from their current state.
  - **Peer children in the rendered views.** The listed run's peer row on the phone and desktop, and the agent-run view's peer-child Team tab (CR-461-022), need a second paired node in the browser probes; no probe has one. SR-057's server answer is proven directly in API-E02 (S17). The rendered part is `Next Round` (probe stack to extend).
  - **Two power-offs.** One interrupted the desktop probe during startup; it was rerun.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/`. Round 3 files carry `r3`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `da80596b0a` (merged state `8a47481617`). Server `dist/` rebuilt from it (`pnpm prebuild && pnpm build`, `/tmp/api461/r3-build.log`) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1. Built server `dist/app.js` per test-owned data root, or the in-process Studio server. Scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_CASE=linked_skills`) | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`. Fresh temp data roots, removed after. No provider keys. Never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | as ENV-1 | ENV-1 server, Nuxt dev frontend and headless Chrome, all owned by the probe | Desktop viewport |
| ENV-3 | as ENV-1. Phone bundle rebuilt from it (`pnpm -C autobyteus-web build:mobile-web`, 14:58) | as ENV-1 | The mobile-shell probe's node `eta` serves the production phone bundle at `/mobile`. A headless Chrome of its own maps `192.168.77.31` to 127.0.0.1, and the phone pairs through Phone Access | 390×844 phone viewport, touch. The base's duplicate `MSP-32` is gone (renumbered), so no temporary copy is needed |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all (unit parts) | Server unit tests | Reused: the implementation's latest unit runs (Checks Run of IR-005 … IR-007 and the CR-461-017 … -029 fixes) | — | Pass (reused) | IMP rows | as recorded there | Ran on the code under test |
| API-R02 | — | Type gates, contracts, web specs | Reused: the implementation's type gates and web specs of the same rounds | — | Pass (reused) | IMP rows | `[typecheck] PASS` | Same |
| API-E02 | AC-001 … AC-006, AC-011, AC-015 data; design Validation; SR-057; C8-09 | Built servers (two paired nodes for §5.1), real GraphQL, WebSocket and scoped MCP. Files are compared with the contract model after every step | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 CONTRACT_STORIES_CONTINUE=1 CONTRACT_STORIES_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch`; then the same with `-t "5.1"` after the K-9 correction | ENV-1 | **Pass** | `API-E02-r3-contract-stories-5.1.txt`, `-5.2.txt`, `-5.3.txt` | Every state's `"diffs": []`. §5.1: `Tests 1 passed`, 26/26 states. §5.3 O6/O7: the dev lead's `send_message_to` returns | §5.2 9/9 and §5.3 9/9 in the first run. F-6 is resolved (S4, S7, S9 return `"Message delivered."`) and so is F-7 (O6, O7). **C8-09:** no delivery leaves the sender's tool call waiting; every send in §5.1 … §5.3 returned. The first run's only §5.1 difference was S11, `"Message delivered. <run> continues with its conversation."`. That is K-9 with its text corrected: the base appends the sentence to the run-ID delivery text, and round 2 had quoted the F-6-changed text. **SR-057** (added in S17): M's `runCollaborationStatuses` lists node B's research team with `node.nodeId` = B and `statuses: []` |
| API-E03 | AC-014 | Built server, faithful upgrade on hand-built data | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs DRO_E2E_EVIDENCE_DIR=<dir> pnpm exec vitest run tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-E03-r3-delegated-runs-own-runs-startup.txt` | `"Scanned 14; migrated 14; skipped 0; failed 0."`, `"changed": []` | Rerun. The migration code is unchanged since round 2, but the run-history readers it reads through changed (`team-run-service.ts`, `agent-run-history-service.ts`, `run-own-agents-reader.ts`) |
| API-E01 (CPW) | REQ-009 (non-goal: no change to what an agent reads); contract §2.3, §2.5; wording §3, §8 | In-process Studio server, real roots, scoped MCP tools | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts --no-watch`, plus focused `-t` runs | ENV-1 | **Fail** | `API-E01-r3-CPW-findings.txt` | Rows 2–5 `"You can delegate tasks …"` instead of `"You are a task agent: …"`; row 8 (org) without the organization line; `B sending to A's address read: {"accepted":false,"code":"COLLABORATION_TARGET_NOT_FOUND"…}` next to a header with A's address; `RUN_NOT_FOUND "AgentRun '…' is not in Agent root '…'"` and `TEAM_SEND_MESSAGE_REJECTED` | F-11, F-12, F-13. The assertions are the approved wording. Round 3 adds soft row checks, B's reach of A by the address it is shown, CPW-M5 (the team view), and view messages that fail on their refusal |
| API-E01 (rewritten suites) | AC-001 … AC-013 (regressions) | In-process and built servers | `pnpm exec vitest run <files> --no-watch --no-file-parallelism` (clean env as above) | ENV-1 | Partly Pass | `/tmp/api461/r3-batch1b.log` (summary in the progress log) | `delegated-copy-project-folder (8 tests)`, `owner-scoped-member-file-changes (2 tests)`, `team-task-event-current-contract (2 tests)` ✓ | Rewritten and passing: those three, plus `project-run-history`, `daily-assistant-collaborator` and `hand-started-run-refusal` (batch 1). `agent-run-collaboration-member-file-changes` was removed (its query and route are removed: CR-461-022; own-run reads are covered by `owner-scoped-member-file-changes`). Still failing: `delegation-forest-restore` (DF-1 … DF-3) and `project-task-boundaries` (4 tests); with the other stale files they are `Next Round` |
| API-B01 | AC-007, REQ-002, REQ-004 (SCN-005); O-1; F-8, F-9 | Browser, desktop: a stopped delegator's view (agent, team, org) | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER pnpm test:e2e:stopped-delegator-views --output-dir <dir>` (run 2; run 3 with the strict helper step) | ENV-2 | **Fail** | `API-B01-r3-SDV-evidence.txt`, `API-B01-r3-SDV-01-helper-row-missing.png`, `API-B01-r3-SDV-03-helper-row-missing.png`, `API-B01-r3-SDV-02-second-message-refused.png`, `API-B01-r3-SDV-02-worker-team-tab.png` | SDV-01/03: `"helperRunId": "helper_…"` and `"rowsShown": ["worker_…"]`. SDV-02: the screenshot's `"already has a pending Team message admission."`. `"workerTeamTab": "…No team messages yet…"`. `"rootStayedStopped": true` | The worker answers live in all three, and the stopped root stays stopped. F-8's lost message is now deterministic: the second message is refused (F-15). F-9 is resolved. New: F-14 (a run the worker delegated to is not shown under the worker). Round 2's probe never checked that step: its query found no helper, and it skipped the step |
| API-B01 (phone) | AC-007, REQ-002; O-1; F-10 | Phone shell (production bundle) | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/mobile-shell-probe.mjs --output-dir=<dir> --cases=MSP-50,MSP-51,MSP-52` | ENV-3 | Pass | `API-B01-r3-phone-MSP-50-52-evidence.txt`, `API-B01-r3-phone-MSP-51-worker-answered.png`, `API-B01-r3-phone-MSP-52-worker-answered.png`, `API-B01-r3-phone-MSP-51-root-started.png` | `"result": "Pass"` ×3; `"rootRowStatus"` all `"offline"`; `"markerInWorkerRun": true`; `"rootActiveAfterChild": false`; `"rootStartedOnOwnMember": true`; MSP-51/52 `"ownRows"` list the worker | F-10 is resolved. The first run failed after the worker step on a probe defect, fixed: it looked for the Manager's row without returning to the list, and by the definition's name |
| API-B02 | C3-06 | Browser: the agent-run view after a WebSocket 1000 close | SDV-01 in API-B01 run 3 (its first part, before the F-14 step) | ENV-2 | Pass | `API-B01-r3-SDV-evidence.txt` | SDV-01 `"streams": [{"closed": true, "frames": 6}, {"closed": false, "frames": 5}]`, `"workerRowKept": true` | Rechecked on this code |
| API-B01 (peer children, rendered) | REQ-002 (peer rows), SR-057, CR-461-022 | Browser and phone with a paired peer node | — | — | Next Round | — | — | The browser probes have no second paired node; the server answer is proven in API-E02 S17 |
| API-E01 (full run) | AC-001 … AC-013 | Whole server E2E | — | — | Next Round | — | — | After the remaining rewrites |
| API-I01 | AC-005, AC-009, AC-012 | Server integration | `test:integration:prepare`, `test:integration` | — | Next Round | — | — | Runs on the fixed code |
| API-B03 | AC-005, AC-012 | Web probes naming removed events | per probe | — | Next Round | — | — | Partly rewritten this round, not yet run (investigation, "Web probes") |
| API-L01 | AC-001 (real runtime) | Real runtime, test vault | — | — | Next Round | — | — | Runs on the fixed code |
| API-F01 | build inputs | Fresh clone, the release job's install and build | TESTING.md "Fresh-start build" | — | Next Round | — | — | Runs on the fixed code |

### Findings

Round 2's findings, rechecked:
- F-6 (the run-ID delivery text): resolved. §5.1 S4, S7, S9 pass.
- F-7 (a delegated team's member messaging the org): resolved. §5.3 O6, O7 pass, and the sender's call returns (C8-09).
- F-8 (the team view's message to its worker lost): the first message is now delivered and answered live. The second one is refused every time: F-15.
- F-9 (the worker's Team tab error panel): resolved. It shows "No team messages yet".
- F-10 (the phone's stopped team and org without their workers): resolved. MSP-51, MSP-52 pass.

| ID | Case / Contract Case | Expected (authority) | Observed | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-11 | API-E01 CPW-P1 row 2, CPW-P2 row 3, CPW-P3 rows 4, 5, 8 | Requirements non-goal: "No change to what an agent reads: tool names, parameters, results and collaboration texts" (TC-12's addresses excepted). Today, a delegated agent gets the task agent's section (wording §4.2, `collaboration-prompt-sections.ts` `TASK_AGENT_SECTION`): "You are a task agent: another agent delegated a task to you. …", and "Use `send_message_to` for a purpose: to report your result, …". A delegated agent at an org's configured address keeps that address's handoff rules and the org's instruction (row 5). A delegated team's member inside an org keeps the organization line (row 8), and under contract §2.3 step 2 it still reaches the org's agents | Every delegated agent run gets the standalone agent's section: `StandaloneHostMemberContextBuilder.build` always sets `collaborationRole: "standalone_agent"`, so it is no longer told to report back. Row 5 has no `## Team Instruction` and no `### Handoffs`. Row 8 lacks "You can also talk with the organization's other agents and agent teams at their addresses." | `Local Fix` (server). For row 5, failure-origin review decides whether the design must say where a delegated run at a configured org address takes its rules and instruction from |
| F-12 | API-E01 CPW-H1 (Agent root: the host delegates to A; A delegates to B) | Contract §2.5: the receiver sees the sender's address only when it can use it to reach the sender. Otherwise it sees the run ID only (§5.4.3 E-4: runs of one Task → run ID only). B works on sub-work of the host's Task, and A is not a standing agent of the assigning run (§2.3 step 2) | B's task header: `You have a new task from the agent with sender address "/cpw_outsider_…" and sender run id "…"`, telling B to use `recipient_address`. B's `send_message_to(recipient_address: "/cpw_outsider_…")` returns `COLLABORATION_TARGET_NOT_FOUND`. The delegator's address seems to be computed in the delegator's own run (where A is the host) rather than from B's position | `Local Fix` (server) |
| F-13 | API-E01 CPW-M2, CPW-M4 (agent view), CPW-M5 (team view, added) | Wording §8 and AR-011: the user's message to a child row of a view is delivered to the child, with the `@` note decided for that child, as it was when the child was hosted | A message with an `@` mention to a one-hop child row is refused before anything is posted. On the agent view: `AGENT_COMMAND_ACK rejected RUN_NOT_FOUND "AgentRun '<child>' is not in Agent root '<delegator>'."` (`agent-collaboration-stream-handler.ts`: `root.resolveCollaboratorMentions({ focusedAgentRunId: child })` on the delegator's root). On the team view: `ERROR TEAM_SEND_MESSAGE_REJECTED "AgentRun '<child>' is not in root '<team>'."` The org view's handler has the same shape (`agent-org-stream-handler.ts:132`), not run. The same message without `@` is delivered | `Local Fix` (server) |
| F-14 | API-B01 SDV-01 (agent), SDV-03 (org) | REQ-002: "A delegated run, whoever delegated it, is shown under the run that delegated it, once, … in the desktop and phone layouts". The contract's tree is multi-level (e.g. §5.1 S5: `product_team` under E, under M). In the stopped root's open view, the run the worker delegates to appears under the worker's row, live | The worker's `delegate_task` returns `"delegated":true` with the helper's run ID, and the worker's own `runCollaborationStatuses` lists the helper. But in 30 s no helper row appears under the worker: `rowsShown` = the worker only (screenshots). The web gets an open view's rows from its one-hop stream (DS-8) and the poll only from top-level listed runs (`runHistoryListedRuns.ts`), and a delegated run is neither, so a two-hop run has no source in the list | `Design Impact` (preliminary). DS-8 and the SR-055 poll give one hop, and REQ-002 needs every level; failure-origin review decides between design and implementation |
| F-15 | API-B01 SDV-02 (team) | AC-007 / SR-048: in a stopped team's view, the user messages the delegated worker's row repeatedly. Each message reaches the worker, and the team stays stopped | The first message is delivered and answered live. The second is refused in the browser: "An Error Occurred: AgentRun 'worker_…' already has a pending Team message admission." The composer keeps the text, and nothing is sent. `TeamSendAdmissions` (`services/agentStreaming/teamSendAdmission.ts`) settles an admission only on the team stream's `MEMBER_INPUT_MESSAGE` for that identity. A delegated child's input is logged in its own run, so the first admission never settles. This is round 2's F-8, now deterministic | `Local Fix` (web; server if the team stream should acknowledge a child's input) |

Contract-model notes, to the Solution Designer. The test lists each with its reason and matches it exactly:
- K-1 … K-8 and K-10 as in round 1;
- K-11 and K-12 as in round 2;
- K-9, now with today's text corrected: `"Message delivered. X continues with its conversation."`. The SR-054 model writes `"Message delivered."`.

Observation for the reviewer (not a finding): the team stream DTO still requires `task_executions` (the server always sends `[]`) and `follows_team` in a task team's source members. These look like hosting leftovers in a touched contract (`team-task-event-current-contract` passes them).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-E02 (§5.1 S5–S9, §5.2 U3–U5), API-R01 | Not Proven: the real runtime is API-L01 (Next Round) | — |
| AC-002 … AC-006 | Yes | API-E02 (§5.1 26/26, §5.2 9/9, §5.3 9/9) | Proven for the contract's stories. REQ-009's agent-facing texts fail elsewhere (F-11, F-12) | — |
| AC-007 | Yes | API-B01 desktop (SDV-01, -02, -03), phone (MSP-50 … 52); API-B02 | Not Proven (F-14, F-15) | — |
| AC-008 … AC-013 | mixed | API-R01; API-E01 (partly; F-11 … F-13 under REQ-009, AC-012) | Not Proven | — |
| AC-014 | Yes | API-E03 (rerun on this code) | Proven | — |
| AC-015 | — | API-E02 | Proven for the stories' data | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 70% | API-E02 full Pass; phone Pass; F-6 … F-10 rechecked | F-11 … F-15; real runtime | The fix round, API-L01 |
| Changed-boundary execution directness | 80% | 80% | Built servers on two nodes, real streams, browser and phone, SR-057 on the real poll | Stale suites not yet rewritten | Their rewrite |
| Cross-boundary integration realism and mock gap | 70% | 70% | Real HTTP/WS/MCP; scripted AGY only | Real runtime | API-L01 |
| Environment, configuration, identity, and fixture fidelity | 85% | 85% | Clean env, fresh data roots, rebuilt server and phone bundle | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 65% | 65% | Stopped-root journeys on three kinds and two layouts, restore by a member message | Stop/idle/restart suites still stale; integration | API-E01, API-I01 |
| User-surface, browser, and desktop-shell confidence | 65% | 65% | MSP-50 … 52, SDV-0x, the Team tab | F-14, F-15; peer rows rendered | The fix round; a peer node in the probes |
| Durable regression coverage quality and relevance | 65% | 65% | Stories with SR-057, stricter CPW and SDV, phone cases, rewritten suites | Remaining stale files | The rewrite (per file in the plan) |

- Overall post-repository confidence: 71%
- Overall final confidence: 71%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`
- Any final applicable category below `90%`: `Yes`: all seven
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-11 … F-15; the stale suites and probes (Next Round); the real runtime

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`, `Worker or Distributed`, phone shell
- The confidence gap it addresses, and the expected gain: the rendered stopped-delegator journeys (desktop and phone) and the contract stories on two nodes. Ran this round. It proved F-8 … F-10's fixes and found F-14 and F-15.
- Browser validation needed, and why or why not: yes. Selection, sending and nested rows are visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack, desktop (ENV-2) and phone (ENV-3).
- Cases: API-B01, MSP-50 … MSP-52. No shell-specific behavior changed.
- Effect on any already-running desktop application: `None`. Processes this run did not start were left untouched.
- Behavior not directly proven: two-hop rows (F-14); a second message to a team's child (F-15); peer rows rendered (Next Round).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Representative existing data used: as round 1 (hand-built released shapes)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: API-E03 (rerun on this code), API-R01
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: the migration-startup suites of earlier migrations still assert their pre-461 end state (Next Round rewrite)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the team stream DTO's `task_executions` / `follows_team` are noted for the reviewer as possible leftovers)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - **Server:**
    - `helpers/own-run-reads.ts`: `childRunsOf` and `descendantRunsOf` over `runCollaborationStatuses`.
    - `helpers/collaboration-root-harness.ts`: one-hop children from the poll; a deeper run is messaged on its own run's stream; a view message fails on its refusal (ack or `ERROR`).
    - `projects/collaboration-contract-stories` (SR-057 check in S17; K-9 text).
    - `projects/collaboration-prompt-wording` (soft rows; B's reach of A; CPW-M5; refusal detail).
    - `projects/{delegated-copy-project-folder,owner-scoped-member-file-changes,project-task-boundaries}`.
    - `runtime/team-task-event-current-contract` (rewritten for `CHILD_RUNS_CHANGED`).
    - `runtime/{agy,claude}-delegated-background-task` (`CHILD_RUNS_CHANGED`).
    - Removed: `projects/agent-run-collaboration-member-file-changes` (its query and route are removed, CR-461-022; replaced by the own-run reads in `owner-scoped-member-file-changes`).
  - **Web:**
    - `stopped-delegator-views-probe.mjs`: the poll; the Team-tab check; a strict helper step.
    - `mobile-stopped-delegator-cases.mjs`: the own-member step.
    - `mobile-shell-probe.mjs`, `mobile-closed-task-rows-cases.mjs`, `mobile-heading-links-cases.mjs`, `owner-scoped-file-reads-probe.mjs`, `delegated-team-default-collapse-probe.mjs`, `delegated-copies-large-hub-probe.mjs`: the new poll and own-run reads. These last ones were partly rewritten and not yet run (Next Round).
  - `autobyteus-server-ts/typecheck-baseline.json`: shrunk by the removed suite (`pnpm typecheck` PASS, 1013 test-file errors in 317 files).
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The agent runtime's model | Scripted AGY CLI | Deterministic, no provider keys (TESTING.md) | A real model's turn (API-L01) |
| In-process suites' delegation tree | `noDelegations()` and readers over it | Those suites start no delegated run | None for their subjects |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built server processes and data roots | Yes | Each suite's `afterAll` | Removed |
| Probe stacks (desktop and phone) | Yes | The probes' `finally` | Removed |
| `stopped-delegator-views-sXWr0P` temp root, left by the desktop run a power-off interrupted | Yes | Deleted | Removed |
| `/tmp/api461/` logs, homes and probe output | Yes | Kept; excerpts committed | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix` (server): F-11 (row 5 possibly design), F-12, F-13.
- `Design Impact` (preliminary): F-14.
- `Local Fix` (web, possibly server): F-15.
- Contract-model notes for the Solution Designer: K-9 (corrected text), K-11, K-12.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-001 (real runtime), AC-007, AC-008 … AC-013. Proven: AC-002 … AC-006 and AC-015 (the contract's stories), AC-014.
- Preliminary classification and recommended owner: `Local Fix` → Implementation Engineer (F-11, F-12, F-13, F-15). `Design Impact` → Solution Designer (F-14, and F-11 row 5 if the review agrees). Confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes:
  - Next round, first: the remaining stale-suite and probe rewrites, file by file (the investigation's plan), and a paired peer node in the browser probes for the rendered peer rows.
  - Then API-B01, CPW, API-E01 full, API-I01, API-B03, API-L01 and API-F01 on the fixed code.
