# API/E2E Coverage Investigation — autobyteus-278 (Remote delegated runs in the run tree)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree/tickets/in-progress/remote-runs-in-tree`

## Investigation Meta

- Requirements: `…/requirements-doc.md` (Approved, SR-003), AC-801 … AC-807
- UI/UX spec (normative): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md` (VIS-001 … VIS-021, PA-801 … PA-809)
- Design: `…/design-spec.md` (SR-005; DS-001 … DS-006, AR-401 … AR-403, N-401 … N-404); design review ARCH-REV-002 Pass
- Implementation handoff: `…/implementation-handoff.md` (IR-002, code `1bdcff8ae2`, docs `4abf57451a`)
- Code review: `…/code-review-report.md` (CRR-002 Pass; C-2 held for evidence)
- Follow-ups: `…/follow-ups.md` (FU-001 … FU-003)
- Classification: `Large / High`, reviewed route; a pass goes to the code reviewer for test-code review
- Revision record: `…/api-e2e-revision-record.md`; `API-REV-001`; round 1
- Testing guideline: the worktree's `TESTING.md`

## What Must Be Proven

| Criterion | What | Where |
| --- | --- | --- |
| AC-801 (REQ-801) | Remote rows under the delegator: an Agent, or a Team with its members, the node name, title and status | the root view's snapshot (`remote_task_executions`) and summary events, for standalone, Team and Org roots |
| AC-802 (REQ-802) | Opening shows the conversation; live output appears without a reload | the member projection through alpha; live `agent_presentation` frames in alpha's root view while beta's run works |
| AC-803 (REQ-803) | An owner message from alpha's window reaches the run on beta as its input, marked as from alpha's owner; its answer shows in alpha's window; it is not a message-log line | the root view's `SEND_MESSAGE` (Team: the Team stream) → beta's conversation; alpha's live view and re-read |
| AC-804 (REQ-804) | Beta stopped: errors within 20 s; the rest of the tree works; Retry recovers | `reachable: false` summary, projection error, `REFRESH_REMOTE_TASK_EXECUTIONS` |
| AC-805 (REQ-805) | After the idle shutdown the row reads offline, not gone; a message from the window restores the run | summary with no statuses; relaunch with `--conversation` |
| AC-806 (REQ-806) | Agent and Team targets; standalone, Team and Org delegators | RC-31 (standalone/Agent), RC-33 (Team delegator: Agent and Team targets), RC-34 (Org) |
| DEC-804 | Interrupt and Stop from alpha | `INTERRUPT_GENERATION`; `stopDelegatedExecution`; the final summary offline |
| DS-006 / C-2 | Beta's own owner stops the run while alpha views it: alpha's view ends offline | beta's `terminateAgentRun` |
| Security | A registered peer that didn't start the run is refused on the four routes; an agent outside the run is refused; summaries omit others' runs | direct requests to beta from a third registered node and from alpha |
| REQ-808, F-001 (CRR-001) | The opened run's affordances; the Team family order | browser probe |

## Supported Scenarios And Real Usage

- SCN: the Project Task Manager or any delegator delegates to a peer; the owner watches and talks to the remote run.
- RU-1: beta's own owner works in the run while alpha watches (live frames that alpha didn't cause).
- RU-2: beta's own owner stops the run (C-2).
- RU-3: a third node registered on beta probes alpha's run (security).
- RU-4: the window's Retry after the peer comes back.

## Changed Surface And Boundary Classification

| Surface | Boundary | Repository evidence | Material risk not exercised there | Mode |
| --- | --- | --- | --- | --- |
| Peer routes (3 POST and 1 WebSocket) | inter-node contract, B's link check | unit: provider, gateway, client; in-process two-node case (no real WebSocket route) | the real WebSocket route and its frame order; real link checks; capture audit | Two-server E2E |
| A's roots and streams | summaries, live projection, owner commands | unit, in-process | the window's actual WebSocket views of three root kinds | Two-server E2E |
| Web tree and run view | rows, view, composer, notes, Retry, Team order | unit specs; IMP-09 (standalone only) | the rendered Team and Org families, F-001 order | Browser probe |

## Existing Durable Coverage Inventory

| Path | Validity | Action |
| --- | --- | --- |
| two-server E2E RC-01 … RC-30 | Still Valid | run (preserved) |
| its `CapturingProxy` | Needs Update | forward WebSocket upgrades (the new observation stream goes through the registered peer URL) |
| RC-20 audit | Needs Update | the four new routes |
| unit and in-process (IMP-03 … IMP-08) | Still Valid | Reused |

## Planned Cases

| Case | Criteria | Kind |
| --- | --- | --- |
| API-00 | build | Existing |
| API-R1 | unit, integration, specs | Reused (IMP-01 … IMP-08) |
| API-01 (RC-31) | AC-801, 802, 803, DEC-804 (standalone, Agent target) | Durable, new |
| API-01 (RC-32) | DS-006 / C-2 | Durable, new |
| API-01 (RC-33) | AC-801 … 803, 806 (Team delegator; Agent and Team targets; a member) | Durable, new |
| API-01 (RC-34) | AC-801, 803, 806 (Org delegator) | Durable, new |
| API-01 (RC-35) | security | Durable, new |
| API-01 (RC-36) | AC-805 | Durable, new |
| API-01 (RC-37) | AC-804 | Durable, new |
| API-01 (RC-20) | contract audit of the new routes | Durable, updated |
| API-02 | REQ-808, VIS, F-001 order, Team and Org families rendered | Browser probe (durable, `autobyteus-web/tests/e2e`) |

- Test progress log: `Yes`

## Not Tested / Deferred

| Behavior | Reason | User only? |
| --- | --- | --- |
| AC-807 desktop ↔ Docker | the user's nodes | Yes |

## Investigation Decision

- Proceed: `Yes`; durable coverage changes: `Yes`; reroute: `No`

## Round 3 Note (CRR-005, API-REV-002)

- **Code:** `f60f962d9d` (docs `13280c1e62`): IR-003 / SR-006 (F-001 … F-004) and IR-004 / SR-008 (FU-004, one window owner for Retry). The server is unchanged since `e37ad88b98`, so the round 2 dist is reused.
- **What the reviewer asked for:**
  - RC-31: the live frame and the owner heading, without a `remote_owner` scan;
  - RC-32: beta's own Stop, with AC-805 (RC-36) kept;
  - RTP-04 in all four families, with a working `@` control;
  - Retry from a row and from the opened notice, in each family;
  - the full E2E and the probe.
- **Plan:** E2E unchanged (round 2 already made the checks hard). Probe:
  - the Org Team family;
  - the `@` control on this node's own run;
  - RTP-06 (row Retry ×4);
  - RTP-07 (notice Retry ×4).
- **Testing note:** the window asks a node about a remote run only for an opened root (AC-804: "opening its run"), so the probe opens each family's root before it expects the row's error.

## Round 4 Note (CRR-007, API-REV-003)

- **Code:** `580e1cac5b` (IR-005). A Team view commits a remote member first, then reads it. The change is web only, so the E2E stands.
- **Plan:** rerun the probe twice: RTP-06 and RTP-07 in four families, and the other RTP cases. Add an assertion of one red row line (no "Couldn't load") to RTP-07, the criterion the code reviewer named.
