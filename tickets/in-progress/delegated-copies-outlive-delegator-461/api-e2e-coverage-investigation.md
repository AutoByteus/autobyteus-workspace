# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/`; the ticket folder is `tickets/in-progress/delegated-copies-outlive-delegator-461/`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-018 baseline; TC-12 exception SR-035)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (through SR-074)
- Design Spec: `design-spec.md` (DS-1 … DS-15; Validation in DS-10 item 9)
- Supplemental Task Artifacts: `target-collaboration-contract.md` (revision 8, the authority), `evidence/collaboration-model/{model.py,stories.py,walkthrough.py}`, `collaboration-walkthrough.md`, `evidence/data-model-validation/`
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (through IR-020)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-026, round 20, Pass; earlier CRR-023, CRR-018, CRR-015, CRR-011, CRR-007; failure-origin CRR-016, CRR-021, CRR-024)
- Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md` (created after the first result)
- Current API/E2E Revision ID: `API-REV-006`
- Current Investigation Round: 6
- Trigger: code review pass CRR-026 at code `958cb22462` (docs `a2e2d00c1b`), from `/software_engineering_team/code_reviewer`. Earlier: round 5 CRR-023 at `56e4ce773b`; round 4 CRR-018 at `49f3db1047`; round 3 CRR-015 at `da80596b0a`; round 2 CRR-011 at `f75cf6b96b`; round 1 CRR-007 at `bc223a8ae0`
- Prior Investigation Reviewed: this file, round 5 (API-REV-005)
- Latest Authoritative Investigation: this file, round 6

Code under test: branch `codex/delegated-copies-outlive-delegator-461`, base `origin/personal` `827f1e68dc`, round 6 code `958cb22462` (head `fcd7e9d541`, docs only after the code). Round 5 was `56e4ce773b`.

## Current Requirement And Design Basis

A delegated run (agent or team, local or on a peer) is an ordinary run with its own root, idle shutdown, Stop and restart resume. Nothing hosts it. The delegation is stored once per side as `delegatedFrom`: on the Task entry and on the run's own file. The in-memory `DelegationTree` relates runs for messages, views, token totals, restart and the run list. Stop stops a run's own parts only (REQ-001). A message wakes a stopped receiver (REQ-003). Opening a view never starts a run (REQ-004). The Task rules are unchanged (REQ-005). One startup migration converts existing data (REQ-011).

Since SR-045/046/048 a view's stream lives with the open view: a stopped Team or Org view is served from its stored file ("stored mode") and switches to live with one in-band snapshot when a message to one of its own members restores the run. The GraphQL `restoreAgentTeamRun` / `restoreAgentOrgRun` were removed (CR-461-008). The hosting events (`task_execution_started`, `TASK_EXECUTIONS_CLOSED`, `…_REOPENED`, `closed_task_executions`, `closedTaskExecutionsDigest`) are replaced by `CHILD_RUNS_CHANGED` / `child_runs_changed`.

Acceptance criteria to prove: AC-001 … AC-015 (requirements); the design's Validation list (DS-10 item 9): the contract's stories against the server, one check per §5 case ID, TC-13, AR-017 interleavings, the migration's shapes and a start on converted data.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 … SCN-010 (all `Supported Normal`, SCN-006 `Supported Explicit Edge`).
- Real-use scenarios added from the implemented behavior:
  - RU-1: a stopped Team or Org run is continued by the user's message to one of its members on its open view (the product's only restore path since CR-461-008).
  - RU-2: the agent-run view's WebSocket closes normally (1000), e.g. a server restart or a network handover; the view reconnects (C3-06).
  - RU-3: a stopped delegator's view is open in the phone layout while its child works.
- Contrived / unsupported: none recorded by the designer.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Delegation, messaging, closure, Stop, idle, restart, run list, guards | IMP-19, IMP-22, IMP-26 (unit) | Whole flows across roots and processes | Server E2E (scripted AGY), stories acceptance test |
| API / transport / contract | Yes | Two stream contracts (events removed, `CHILD_RUNS_CHANGED`), GraphQL (`delegatingRun`, mutations removed) | IMP-13, IMP-25 | Real WebSocket sequences | Server E2E, browser |
| Frontend component / state | Yes | Stream lifetime, stored/live, send settlement, poll rule | IMP-23, IMP-24 | Real event sequences | Browser probes |
| Browser integration / user journey | Yes | SCN-005 / AC-007, live child rows, Task page navigation | none rendered | All | Probe-owned real stack, desktop and phone layouts |
| Authentication / session | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | as frontend | — | — | Browser probes |
| Desktop shell | No | No Electron main/preload change found in the diff | — | — | None |
| Process / lifecycle | Yes | Restart resume bottom-up, idle shutdown, startup migration | unit, migration tests | Built-server starts and restarts | Built-server E2E |
| Persisted-data transition | Yes | `20261111_delegated_runs_own_runs_v1` over Task records, run files, trees, logs, busy-run record, history rows | migration tests on fixtures | A real start on converted data | Built-server start on hand-built data of every shape (never user data) |
| Worker / queue / distributed coordination | Yes | Each run's own gate; peer delegation | unit | Two server processes | Two-server E2E |
| External integration | Partly | Real runtimes (AC-001 "real runtime") | gated live suites | A real model's turn surviving the delegator's Stop | Gated live suite with the test vault (decided after the scripted cases) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript server, Nuxt web, Electron desktop.
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md`.
- Conflicting, missing, or unclear instructions: none.
- Changed build-input paths: the two stream contract packages (`autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`, src and dist), `typecheck-baseline.json`, `autobyteus-web/generated/**` → fresh-start build case API-F01.
- Required secrets: only for a gated live case (test vault); none for the scripted cases.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | layers, scripted AGY CLI, clean env, built server for built-server suites, probes own their stack, fresh-start build, migrations on hand-built data only |
| `AGENTS.md` | Repository rules | test vault for real keys |
| `autobyteus-web/tests/e2e/*.mjs` headers | Probes | `--output-dir`, `--cases`, built server `dist/app.js` |
| `tests/e2e/helpers/collaboration-root-harness.ts`, `built-studio-roots.ts` | Server E2E harnesses | Real roots on in-process or built servers with the scripted AGY CLI |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (DS-10).
- Representative existing-data setup: hand-built data root holding every stored shape of contract §6 (E1 … E12), built from the released fixtures (`tests/fixtures/app-data-migrations/released-delegation-shape-fixtures.ts`), never user data.
- Evidence planned: the migration's own tests (implementation, reused) and a built-server start on that data root: the migration completes, every run has the contract's shape, conversations/logs/Task records intact, a second start changes nothing, an unconvertible run is preserved and reported, and the converted runs work (view, message, delegate, close).

## Existing Durable Coverage Inventory

The baseline run of the whole server E2E (API-E01, first run) gives the per-file decisions; they are recorded in the execution report's triage table. Known before the run:

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| 35 files calling `restoreAgentTeamRun` / `restoreAgentOrgRun` (handoff Known Risks + `tests/fixtures/codex-native-multi-agent-system.mjs`) | Restore a stopped Team/Org run before continuing | CR-461-008, SR-046/048 | `Needs Update` | `grep` | Restore by a message to one of the run's own members on its view stream (the product path) |
| 18 E2E files and probes naming removed events/fields | Hosting events and closed sets | SR-041 … SR-044 | `Needs Update` / `Replace` | `grep` | `CHILD_RUNS_CHANGED` / child rows from the Task entries |
| Suites asserting hosting (delegated runs inside the delegator's tree, copy records, `taskExecutions`) | Hosting model | DS-1 … DS-11 | `Needs Update` / `Stale` per case | baseline run | Per triage |
| Unit/integration (IMP-19 … IMP-26) | Every owner | all | `Still Valid` | CRR-007 | Reuse; integration rerun (API-I01) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | all (unit parts) | Server unit, migrations, architecture | Reused | IMP-26 (`a54e78ccb7`), IMP-19 | Ran on the code under test |
| API-R02 | — | Typechecks, contracts, web specs | Reused | IMP-23 … IMP-26 | Same |
| API-I01 | AC-005, AC-009, AC-012 | Server integration | Existing Test | `test:integration:prepare`, `test:integration` | Last run on `4a3f221c72`; CR-461-008 changed code after |
| API-E01 | AC-001 … AC-013 | Whole server E2E (scripted AGY) | Existing Test (rewrite) | `vitest run tests/e2e` | Baseline, then after the rewrite |
| API-E02 | AC-001 … AC-006, AC-011, AC-015 data; design Validation | The contract's stories against the server, two nodes for §5.1; files compared with `collaboration-walkthrough.md` after every step | Durable (new) | new suite | The ticket's acceptance test |
| API-E03 | AC-014 | Built server on hand-built data of every shape; second start | Durable (new or extended) | new suite | A start on converted data |
| API-B01 | AC-007, REQ-002, REQ-004 (SCN-005) | Browser: stopped delegator's views (agent-run, team, org) in stored and live modes, child rows and output live, child message wakes only the child, stopped org starting on its first input; desktop and phone | Durable probe (new or extended) | probe | No rendered check exists |
| API-B02 | C3-06 | Browser: agent-run view reconnect after a WebSocket 1000 close | Durable probe case | probe | The source cannot show it |
| API-B03 | AC-005, AC-012 | Existing web probes that name removed events | Existing Test (rewrite) | per probe | Keep the rendered coverage of closure, reopen, follow-up Task |
| API-L01 | AC-001 (real runtime) | Gated live suite or isolated instance with a real model | Journey | decided after API-E01/E02 | AC-001's verification intent names a real runtime |
| API-F01 | build inputs | Fresh clone, release desktop build | Existing (release job) | TESTING.md "Fresh-start build" | Contracts and generated types changed |
| CPW | REQ-009 non-goal (texts), contract §2.3, §2.5, wording §3, §8 | Prompt rows, sender headers, `@` notes through real roots | Existing Test (strengthened in round 3) | `collaboration-prompt-wording` | F-11 … F-13 under SR-058 … SR-060 |
| API-P01 … P04, API-C01 | AC-016, AC-008, REQ-002 (peer), rule 3, C14-01 | Two paired built-server nodes; history read timing | Durable (new) | new suite, capture and measurement | Rounds 11–14 (SR-066, SR-067, rule 3, C14-01) |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

**Round 6 plan (API-REV-006), on code `958cb22462`.** Since round 5:
- **CRR-024's Local Fixes:**
  - CR-461-048: the 461 migration is registered last, with a registry-order test (F-25);
  - CR-461-049: F-19b;
  - CR-461-050: F-28;
  - CR-461-051: F-29, now checked before the root loads;
  - CR-461-052: F-35;
  - CR-461-053: F-33 and F-34.
- **SR-072 … SR-074:**
  - the Team tab composes X's log with its open subtree's logs, by one in-view rule for the read and for live (F-26);
  - the decisions on F-23, F-24, F-27, F-30, F-31 (the user confirmed one hop), F-32 (SR-073: as at base), F-36 and K-13.
- **The model:** 49 states. §5.1 moves S23/S24 before S16 and adds the assigner's refused message to S10; §5.2 adds U11.

Order: the rechecks first, then the decision-only expectation changes, the Team tab, then the Next Round list.

| Item | Coverage | Where |
| --- | --- | --- |
| F-25 (SID-2) | The kept copy's `run_metadata.json` leaves the byte-identical set (461 converts it, E6); its converted `delegatedFrom` is asserted; the copy's folder stays | `remove-skill-improvement-data-startup` |
| F-19b, F-35, F-36 | The soft checks become hard with the decided values (base's text; `TASK_DISPATCH_FAILED`; `/lead`) | EXC-005; peer RC-25, RC-33 |
| F-28, F-29 | As they are (base's self-target refusal; no model request) | `delegated-team-lazy-member-activation`, `get-project-task-worker-scope` |
| F-23 | Step 11: while DONE the assigner's message to the team member is refused with base's Task-side text; after IN_PROGRESS it continues the run (R-6) and reopens the team | `task-reactivation-root-visibility` |
| F-24 | TKD as base (accepted); new U11 in the stories | `task-existing-copy-assignment`; stories §5.2 |
| F-27 | RS-03: the copy's own runtime switch is accepted (pending until its input) | `runtime-switch-native-built-server` |
| F-30 | S26 (idle counts as working) | stories §5.1 |
| F-31 | SRE-01/02: copy two and copy three carry copy one's launch; the host's next input is the user's message on its own stream | `stopped-run-edit-root-built-server` |
| F-32 … F-34 | MSP-51/52 open the team or org first (SR-073), then the "once" check before and after opening | phone probe |
| K-13, S10, U11 | Drivers follow the regenerated fixture (S23/S24 on the normal path) | stories |
| Closure race | TDR-001: a refused message is neither written nor shown (SR-072) | `teammate-delivery-task-closure-race` |
| Team tab (SR-074) | New TT-1: a two-hop message in the top run's tab, live (`communication` event) and after a reload. TT-2: a message between a run below X and X's delegator, in X's tab neither live nor after a reload | new `team-tab-subtree-messages` |

**Round 5 plan (API-REV-005), on code `56e4ce773b`.** CRR-023 asks, in this order:
1. Round 4's Next Round: the remaining stale rewrites; phone MSP-50 … 52; the two-node peer cases and rule 3's peer capture; DS-15 restart resume and C15-03's rendered two-view check; API-E01 full, API-I01, API-B03, API-L01, API-F01.
2. Rechecks: F-14 (team view), F-16 … F-22, SDV-01 … 03 (SDV-01 failed twice for the implementer before `eb5e9df040`).
3. New checks:
   - C17-02: from a run two hops down, delegate to an address only the top run's catalog offers, compared with base;
   - CR-461-042: the reopened row rendered;
   - SR-071's refusals end to end: R-8 before R-7, R-12 for a team run's ID live and stopped, a member's ID in `delegate_task`.

How each is covered:

| Item | Coverage | Where |
| --- | --- | --- |
| Stale rewrites | Rule 1 / rule 2 rewrites of round 4's list, each decided against the contract, not the code. Contract §3.1's Task entry (`delegatedFrom {delegatingRun, delegatorAgentRunId}`, `recipientAddress`, `agentRun`, peer `nodeId` / `members`) replaces `assignedBy` / `hostRoot` in stored-entry assertions | per file (execution report triage) |
| F-14, F-22, SDV-01 … 03 | Desktop probe as it is | `stopped-delegator-views-probe.mjs` |
| CR-461-042 | New SDV-04: the Manager sets the worker's Task DONE (the row leaves), then IN_PROGRESS and messages the worker (the row is back), rendered | same probe |
| Phone MSP-50 … 52 | The phone cases; the probe's call to `runStoppedDelegatorCases` was lost when the web folder was restored to base (round 4) and is put back | `mobile-shell-probe.mjs` |
| C17-02 | New CPW-M7: org Manager → squad (lead) → outsider A; A delegates to `/sibling`, an address only the org's catalog offers. Base accepts (`delegated:true`, `target_kind:"agent"`) | `collaboration-prompt-wording` |
| SR-071 R-8 before R-7 | Stories S20 (R-8) and U9 (R-7) | `collaboration-contract-stories` (§5.1, §5.2) |
| R-12 live | U10; EXC-E2E-001 … 005 | stories §5.2; `task-existing-copy-assignment` |
| R-12 stopped | EXC-E2E-005 updated: its last step asserted the stopped team's ID is *not* `TARGET_IS_TEAM_RUN` (the old contract). SR-071 says the coordinator is named whether the team runs or not. The step now stops the delegator and the team, then expects `TARGET_IS_TEAM_RUN` with the coordinator. The F-19b text check above it is soft so the step still runs | `task-existing-copy-assignment` |
| Member's ID in `delegate_task` | EXC-E2E-001 … 003 `memberAsAgent`: base's "… is not one of your task agents …" | same |
| Model §5.1 S23 … S27, §5.2 U9, U10 | Drivers for the regenerated model (28 / 11 / 9 states). DS-15 fences a closed Task's run against user input, so S23/S24 call the agent's own scoped MCP endpoint (`callDirect`) | stories |
| Peer cases API-P01, P02 | New RC-38 (AC-016 with stopped solo, team and org delegators; peer Agent and Team) and RC-39 (AC-008 / SR-067 guard), plus rule 2 rewrites of the suite (links from alpha's Task entries) | `remote-delegation-two-server` |

**Round 4 plan (API-REV-004), on code `49f3db1047`.** Rounds 11–14 (SR-058 … SR-069) changed the contract the tests stand on:
- **Rule 1** brought back base's shapes. Base's events and reads return (`TASK_EXECUTION_STARTED`, `task_executions_closed` / `_reopened`, `agentRunCollaborationStatuses`, `closed_task_executions`, `hasCollaboration`), with rows at every depth. `runCollaborationStatuses` and `CHILD_RUNS_CHANGED` are gone.
- **Rule 2:** a delegated run is reached only through its own path: its own stream, reads, commands, Settings save and Stop. The delegator's view has no command for a local child. Its member reads refuse a delegated run. `agentRunCollaborationMemberProjection` serves peer agents only. Removed: `stopDelegatedExecution`, `updateDelegatedLaunchSelections` and `delegatedLaunchModelOptions`.
- **Peer runs** are reached through their own handles.

So several of my round-3 rewrites are stale again. The web folder was restored to base `3228eff74b` (commit `12ea5a05d6`). That deleted this ticket's two probes (`stopped-delegator-views-probe.mjs`, `mobile-stopped-delegator-cases.mjs`) and the desktop probe's script line, as a side effect. They are restored from `7442bd3bc2` and moved to rule 1 and rule 2.

Found by reading the change (the names above) and by a discovery run of the whole server E2E (`/tmp/api461/r4-E01-discovery.log`: 47 files failed, 137 passed, 71 skipped). The discovery's failures are only input to this plan: each file is decided against the requirements and the design, not against the code.

Tests this ticket's change made untrue are this ticket's work. Each is rewritten or removed with its reason before the ticket can pass. A file marked **Check** may hide a product failure, so it is compared with the contract before any rewrite.

### Shared helpers and restored files

| File | Decision | What changes |
| --- | --- | --- |
| `helpers/collaboration-root-harness.ts` | Update | Children from the view's rows (`taskAgentsIn(liveTree())`, base's reads, rows at every depth). Every agent that is not the root's own is messaged on its own run's stream (rule 2) and read by its own run |
| `helpers/own-run-reads.ts` | Update | The `runCollaborationStatuses` helpers are removed; a shared "conversation by own run" read for suites with their own drivers |
| `runtime/team-task-event-current-contract` | Replace (base's file) | Base's `TASK_EXECUTION_STARTED` contract is back (rule 1); base's file passes 2/2 |
| `runtime/{agy,claude}-delegated-background-task` | Update (gated live, with API-L01) | Base's event name back; the child's output, background tasks and follow-up message are now on its own stream (rule 2) |
| Web `stopped-delegator-views-probe.mjs`, `mobile-stopped-delegator-cases.mjs`, `package.json` script | Restore, then update | Rule 1 reads for children; rule 2 for the child row |

### Server suites (per file)

| File | Decision | Reason / what changes |
| --- | --- | --- |
| `projects/{ad-hoc-task-delegation,task-agent-several-tasks,task-existing-copy-assignment,task-reactivation-root-visibility,get-project-task-worker-scope,collaboration-model-contract,delegated-copy-member-contact-host,project-task-comments-live,project-task-context-files-delegation,project-task-parts-live,delegated-copy-model-change}`, `agent-definitions/agent-package-definitions-live-refresh`, `personal-settings/personal-tools-in-runs`, `runtime/{agy-skill-update-notice-roots,agent-initiated-collaborators}` | Update (rule 2) | Each has its own driver and reads (or messages) a delegated child through the delegator. These are now refused: "is not a run … delegated to a peer node", "was not found in root TeamRun". Read and message the child by its own run. Each remaining assertion is then checked (several-tasks: a `delegated:false` expectation; parts-live: a count) |
| `projects/{project-change-feed,task-existing-copy-assignment}` | Update | `TaskRoot.hostRoot` → `delegatingRun` (contract rename, SR-068) |
| `memory/memory-collaboration-graphql` | Update | `isTaskTeam` stays removed (SR-068); delegated runs are listed as runs of their own |
| `projects/delegated-copy-model-change`, `runtime/{agy-switch-back,runtime-switch-native,runtime-switch-members-extended,runtime-switch-members-live}-built-server` | Update (rule 2) | A child's Settings save is its own stopped-run save (`UpdateStoppedAgentRunSelection` / `UpdateStoppedTeamRunSelections`), its model options its own queries, its Stop its own terminate (SR-064, SR-065) |
| `app-data-migrations/delegated-runs-own-runs-startup` (API-E03) | Update | "P is E's sub-work, not M's child" asserted one hop in M's view. Rows at every depth (SR-058) put P under E in M's view: assert the placement (P under E), not absence |
| `projects/{delegated-launch-config-defaults,delegated-team-lazy-member-activation,task-copy-idle-lifetime}` | Check | "owned cleanup: expected [] …": runs or processes left after the suite. Compare with the idle-shutdown and closure rules before rewriting |
| `projects/{task-closure-root-visibility,teammate-delivery-task-closure-race}` | Check | Timed out on the Manager's messages; delivery outcome missing. May be the driver's child reads, or a product failure |
| `projects/collaboration-contract-stories` (API-E02) | Update + Check | The SR-057 check uses the removed poll: rewrite it to base's peer rows (rule 1). §5.3 O8 (no result of `delegate_task`): check |
| `projects/closed-run-attachments` | Check | "Unable to resolve Org context-file owner '<org>/<writer>'" (400): a delegated run's files by its own identity (rule 2)? |
| `projects/delegated-copy-project-folder` | Check | Capsule timeout for a checker run (passed in round 3) |
| `projects/project-task-boundaries` | Update | As round 3: reader reconstruction, `PROJECT_OPERATION_UNCONFIRMED` |
| `projects/unclean-shutdown-delegated-team-restore`, `agent-org-runs/controlled-org-publication-http` | Update | Removed restore mutations and member reads of delegated teams (as round 2's plan) |
| `remote-collaboration/remote-delegation-two-server` | Update, each failure checked | The rule 2 / SR-066 peer handles, `hostRoot`, `stopDelegatedExecution`; a 400 where 200 was expected, and `delegatingRun` shapes. Possible product failures |
| `runtime/stopped-run-edit-root-built-server` | Check | "copy one delegates copy two: rejected": may be rule 2 (the command via the delegator) or a product failure |
| `model-routing/model-routing-delegation` | Check | Routed members never started on Grok |
| `agent/standalone-error-termination-lifecycle`, `agent-org-runs/stopped-org-workspace-graphql` | Check | GraphQL error; subject mismatch |
| `app-data-migrations/{collaborators-to-delegated-runs-startup,task-agent-own-run-startup,team-run-v1-production-upgrade,append-only-message-logs-startup,remove-skill-improvement-data-startup}`, `run-history/{open-task-tree-upgrade-startup,standalone-unreadable-tree-containment}` | Update | As round 2's plan: the 461 migration runs after the migration they test. Assert the end state after both (no `collaboration_tree.json`, delegated runs as their own, child reads by own run) |
| `agent-team-runs/team-run-config-graphql`, `run-history/stopped-run-model-config-graphql`, `runtime/autobyteus-anthropic-stored-config-resume` | Update (test) | As round 2's plan: the restore helper's provider error; send after `CONNECTED` |
| `terminal/terminal-websocket-lifecycle` | Check (likely environment) | The expected HOME path vs the temp HOME; not a collaboration surface |

### Web probes (API-B03)

The web folder is base's again, so base's probes match rule 1's shapes. Rule 2 changes the parts that reach a child through the delegator:
- `stopDelegatedExecution`, `updateDelegatedLaunchSelections` and `delegatedLaunchModelOptions` move to the run's own calls;
- the member file and trace reads of a local child move to its own reads;
- the restore mutations are replaced by a member message;
- `hostRoot` becomes `delegatingRun`.

Each probe that uses one of these is updated (`grep` of these names in `autobyteus-web/tests/e2e`). The rest run as they are.

### New coverage this round

| Case | What | Where |
| --- | --- | --- |
| API-P01 | AC-016 / REQ-013: with the delegator stopped (standalone, team member, org agent), a peer Agent and a peer Team child each get Stop, message and interrupt, and the stored conversation opens. The live status stays in the open view. An offline node gives "Couldn't reach {node}." | New two-node built-server suite |
| API-P02 | AC-008 / SR-067 G-1: archive and delete are refused while a peer child works. An unreachable node is named and does not block | Same suite |
| API-P03 | REQ-002 peer rows in the list and views, base's shapes (rule 1, SR-057): the listed delegator shows the peer row with its node and no request to the peer | Same suite; rendered in a probe if a peer node can join it |
| API-P04 | Rule 3's two-node peer capture: base `827f1e68dc` and the branch give the same keys for a peer row's snapshot, events and list reads | Capture at base (temporary worktree build), fixture, branch comparison |
| API-C01 | C14-01: the history list read's time with many delegated runs under listed Teams and Orgs, against no delegated runs | Built server, measured |

## Desktop Application Validation Plan

- Web-equivalent behavior: all of this change's visible behavior (views, streams, rows).
- Shell-specific behavior: none changed.
- Approach: probe-owned real stack (built server, Nuxt dev, headless Chrome) with the scripted AGY CLI, desktop and phone (`/mobile`) layouts, as TESTING.md asks for renderer behavior the phone offers too.
- The user's running app and `~/.autobyteus` are never touched.

## Not Tested / Infeasible / Deferred

Round 6 ends at a product `Fail` (report: F-37 … F-45, K-14).

**Done this round:**
- the rechecks of round 5;
- the Team tab (new suite);
- the decision-only expectation changes;
- the phone and desktop probes;
- the stories, the peer suite;
- API-L01 (new live suite);
- API-I01;
- batches R6-A … R6-C.

**`Next Round`** (waiting for the fix; the first item comes first):
- **The remaining stale rewrites**, each with the cause found this round:
  - `projects/unclean-shutdown-delegated-team-restore`: a delegated team's member read through the root team (rule 2: its own team's reads);
  - `run-history/standalone-unreadable-tree-containment`, `run-history/open-task-tree-upgrade-startup` OT-1/2: `collaboration_tree.json` (removed, contract §6); OT-3 to check after;
  - `agent-org-runs/controlled-org-publication-http`: `restoreAgentOrgRun` (removed; a member's message restores);
  - `app-data-migrations/task-agent-own-run-startup`: TAU-2 uses `UpdateDelegatedLaunchSelections` (removed; each run's own save); TAU-1 and TAU-3 to check against the 461 end state;
  - `agent-org-runs/stopped-org-workspace-graphql`: `taskExecutions` (removed);
  - `app-data-migrations/append-only-message-logs-startup`: the `collaboration/` log path (TC-13);
  - `app-data-migrations/collaborators-to-delegated-runs-startup`: delegated runs read from the host tree (now their own runs);
  - `app-data-migrations/team-run-v1-production-upgrade`: member shape after 461, and the restore helper's answer (`the view sent no snapshot` with an ERROR);
  - `projects/closed-run-attachments`: a delegated run's file through the Org (`Unable to resolve Org context-file owner`; rule 2: by its own identity);
  - `projects/project-task-boundaries`: its `reset()` releases the composed Project Task service mid-test (`TASK_ENTRIES_LISTENER_UNSET`); reconstruct through the composition;
  - `agent/standalone-error-termination-lifecycle`: builds the GraphQL schema without the composition root ("AgentRunHistoryService is created by the composition root");
  - `agent-team-runs/team-run-config-graphql`, `run-history/stopped-run-model-config-graphql`: the restore helper's real provider call (`LLM_PROVIDER_ERROR`);
  - `runtime/autobyteus-anthropic-stored-config-resume`: a send before `CONNECTED` (`SESSION_NOT_READY`);
  - `projects/task-copy-idle-lifetime`: the own-stream follow starts after the background task's "running" event;
  - `model-routing/model-routing-delegation` MR-02 and `projects/delegated-copy-project-folder` DCF-02: repeatable; classify (EX-03 with F-39);
  - `runtime/agent-initiated-collaborators` and the two delegated background-task suites (live, rule 2).
- **The phone** MSP-51 after F-44.
- **The peer cases left:** API-P03 (peer rows rendered), API-P04 (rule 3's two-node capture at base, also the nesting of a copy's copy).
- **DS-15:**
  - restart resume skipping a closed run: extend API-E03's restart-resume data with a busy run whose Task is closed;
  - C15-03's rendered two-view check.
- **API-B03 web probes.**
- **Then:** API-E01 in full and API-F01 on the fixed code.

`Not Tested` (could not run): none.

## Ambiguities Or Reroute Triggers

- **F-39:** a delegated team's followers and its team-level choice (base: they follow; the team save now changes the default only).
- **F-40:** whether a run's own name is listed by `list_available_agents` (base listed it).
- **F-41:** a delegated member's conversation error card in the delegator's view (agent and team views carry it, the Org view not; rule 2 reads it on its own stream).
- **K-14:** the model keeps a deleted chat's Temp task (task-keys AC-021 removes it).
- **F-45:** a delegated run's own Stop and its history row's `terminatedAt` (the model records it).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
