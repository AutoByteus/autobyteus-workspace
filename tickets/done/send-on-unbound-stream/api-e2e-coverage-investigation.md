# API/E2E Coverage Investigation — autobyteus-540 (send-on-unbound-stream)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results and confidence are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: `evidence/spine-validation/sr-003-send-spines-by-run-kind.md`, `evidence/reproduction/`
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Code Reviewer, CRR-001 Pass (branch `codex/send-on-unbound-stream` at `0127302f7f`; code `f70d3cb968` server, `49ed8967f0` web)
- Prior Investigation Reviewed: None (first round). Related: autobyteus-533's API-10 (the CG-07 stall this ticket fixes, FU-006 there).
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

A message the user sends is never lost silently (REQ-001…REQ-004). An agent message (standalone, delegated, peer) leaves only after the node's `CONNECTED` on the current connection (`whenBound`, 10 s; D-1) and every agent send waits for the node's answer (D-2). A send lost with a recovering connection is held and decided after the rebind's `AGENT_STREAM_SNAPSHOT`, which now carries the active run's `input_state` (D-3, D-8): found (stored, live turn or queued) → nothing shown; missing with an input state → text (a); missing with none (stopped run, peer) → text (b); a final close → (b). Team and Org classify their transport failures the same way (D-5). Every route ends in `failLocalSubmission` `'returned_draft'`: (a) removes the message, the draft comes back to an empty box, one plain notice above the box (en, zh-CN), the status unchanged (D-4, D-6). A not-delivered first message of a new run keeps its prepared run (CG-01). The probes fail on a lost send (D-7).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003 for UC-004's run kinds (standalone, delegated agent, peer run, Team member, Org member), desktop and phone.
- Real-use scenarios added from the implemented behavior:
  - SCN-002q "Queued by the node": the run's node queues the message because a turn is running that this page does not show yet (another window started it; this page's downlink is slower). Trigger: a second client's `SEND_MESSAGE` and a slowed downlink. It is how a page's own send reaches a running run (while this page shows Running, its button is Stop and the user cannot send).
  - SCN-001r "Send during a reconnect": the page's whole path drops and the user sends while it reconnects. Trigger: the probe's wire drops every socket of the page at once.
- Contrived, not tested: none.

## Changed Behavior Summary

| Behavior | Change | Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002 send after `CONNECTED` | Changed | D-1 | Real stack: every `SEND_MESSAGE` after its link's `CONNECTED`; no `SESSION_NOT_READY` across many sends after Stops and reconnects |
| BEH-003 peer send | Changed | D-1, D-4 | Real two-node stack (phone): not bound → (a), draft kept; lost in flight → (b) |
| BEH-004 Team/Org failures | Changed | D-5 | Real stack: Team lost → (b), Team timeout → (a); Org lost → (b), not ready → (a); status unchanged |
| BEH-005 lost in flight | Changed | D-3, D-8 | Real stack: delivered (ack lost), queued (found through `input_state`), missing on a live run → (a), missing on a stopped run → (b) |
| BEH-006 not bound in 10 s | Changed | D-1, D-4 | Real stack: (a) after ~10 s, message removed, draft back |
| Snapshot payload `input_state` | Added | D-8 | Whole server integration and E2E (clients that build or assert the snapshot) |
| BEH-007 protocol | Preserved | — | Whole server suites |

## Changed Surface And Boundary Classification

| Surface | Affected | Changed Boundary | Repository Evidence | Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | snapshot `input_state` (active / stored / peer) | IMP-02 | other snapshot clients | Whole server suites |
| API / transport / contract | Yes | `AGENT_STREAM_SNAPSHOT` payload; send after `CONNECTED` | IMP-02, IMP-07 (fake socket) | the real node's timing, reconnects | Real-stack probes |
| Frontend component / state | Yes | send outcome, held sends, notice, draft | IMP-07 (unit), IMP-09 (rendered fixture) | real streams | Real-stack probes |
| Browser integration / journey | Yes | composer send on every kind | IMP-08 (Stop probe, 20 sends) | lost sends, Team/Org/peer, phone | Desktop probe + phone cases |
| Authentication / session | No | — | — | — | — |
| Desktop renderer | Yes | same composer | IMP-08 | — | Desktop probe |
| Desktop shell | No | — | — | — | — |
| Process / lifecycle | Yes | reconnect, rebind, AGY offline after Stop | unit | real reconnects | Probe-controlled path |
| Persisted data | No | `Not Affected` | — | — | — |
| Distributed | Yes | peer relay snapshot (`input_state: null`) | IMP-02 unit | two nodes | Phone cases on alpha + beta |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream`
- Stack: pnpm monorepo; Fastify/WebSocket server, Nuxt web, phone bundle; Node 22.23.1.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/TESTING.md` (no closer `TESTING*.md`).
- Conflicts: none.
- Changed build-input paths: `None` (`git diff --name-only 914eb36577...HEAD`: no manifest, lockfile, tsconfig, baseline, scripts, nuxt config, contracts, workflows; the snapshot field is added to a server type, not to a contract package).
- Secrets: N/A (scripted AGY).

| Instruction | Purpose | Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Environments, Browser probes, Rules | layers, isolation, probes | as in autobyteus-533: built `dist`, clean env for E2E, one heavy run at a time, probe-owned stacks, phone behavior on the phone bundle |
| `mobile-shell-probe.mjs` header | phone stack | alpha + beta, `--cases=`, unique case IDs across modules |
| `stop-generation-probe.mjs`, `mobile-stop-generation-cases.mjs` (autobyteus-533, changed here by D-7) | sends after Stops | `holdTurn` now fails at once on a lost send |

| Component | Start | Readiness | Cleanup |
| --- | --- | --- | --- |
| Server build / phone bundle | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | exit 0 (`evidence/api-e2e/build-server.log`) | — |
| Probe nodes, Nuxt, Chrome | spawned by each probe | `/rest/health`, HTTP 200 | probe `finally`, receipt in evidence |

| Data | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| agents, Team, Org, runs, delegations, peer runs | public GraphQL/WebSocket in the probes | temp data roots | with the data root |

## Existing Durable Coverage Inventory

| Path | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/stop-generation-probe.mjs` | Stop journeys; every round's next message after a Stop (D-7: fails at once on a lost send) | AC-002, AC-006 | Still Valid | Run with 40 gaps per kind (80 sends after Stops) |
| `autobyteus-web/tests/e2e/mobile-stop-generation-cases.mjs` (MSP-75…79) | phone Stop journeys with sends after Stops (D-7) | AC-002, AC-006 | Still Valid | Run in the whole mobile-shell |
| `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs` | the page's path | — | Needs Update | Add "lose / drop after the next message" and log the snapshot's `input_state` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | phone probe | AC-007 | Needs Update | Import and run the new phone cases |
| Server unit/integration/E2E building or asserting the snapshot shape | updated by implementation (IMP-02) | AC-007 | Still Valid | Whole suites |
| `interrupt-result-presentation-probe.mjs` and other web probes | — | — | Out Of Scope | — |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Command / Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003…AC-005, AC-007, QR-001, QR-002 | Web unit (whole) | Reused | IMP-07 | Web source unchanged since `49ed8967f0` |
| API-02 | AC-003 (server), AC-007 | Server unit + typechecks | Reused | IMP-02…IMP-05, IMP-06 | Server code unchanged since `f70d3cb968` |
| API-03 | AC-004 rendered | Notice on a fixture page | Reused | IMP-09 | Unchanged |
| API-04 | AC-007 | Server integration (whole) | Existing Test | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | Snapshot payload gained a field |
| API-05 | AC-007 | Server E2E (whole, scripted AGY gate) | Existing Test | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm test:e2e` | Same |
| API-06 | AC-002, AC-006 | Desktop: 80 sends right after a Stop took the AGY run offline | Existing Test | `pnpm -C autobyteus-web test:e2e:stop-generation --gaps <0,60,150,300,600 ×8> --cases SGD-01,SGD-02` | The 533 measurement that found the defect (1 lost of 80) |
| API-07 | AC-002, AC-003, AC-004, REQ-003 | Desktop real stack (`send-delivery-probe.mjs`, SDD-01…SDD-10) | Durable | `pnpm -C autobyteus-web test:e2e:send-delivery --output-dir <fresh>` | Sends after reconnects; lost-in-flight branches; Team; new run's first message |
| API-08 | AC-002, AC-003, AC-004 | Phone bundle on alpha + beta (`mobile-send-delivery-cases.mjs`) | Durable | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>` (whole; the phone's socket route serves every case) | Phone case for AC-002; Org and peer lost sends; TESTING.md phone rule |
| API-04b | — | FSEvents measurement | Existing Test | measurement script | Added after API-04's watcher failures (TESTING.md) |
| API-05b | AC-007 | The whole run's failed files, one at a time | Existing Test | `vitest run --fileParallelism=false <files>` | Added after API-05: rule 9 rerun |
| API-08b | — | MSP-39…42 alone | Existing Test | `--cases=MSP-39,MSP-40,MSP-41,MSP-42` | Added after API-08's MSP-41 |
| API-09 | AC-007 | Web guards with the new files | Existing Test | `guard:web-boundary`, `guard:localization-boundary` | New files under `tests/e2e` |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| API-07 | `autobyteus-web/tests/e2e/send-delivery-probe.mjs` (+ `test:e2e:send-delivery`) | The send journeys of REQ-001…004 on a real node, with the wire's lost and dropped sends |
| API-08 | `autobyteus-web/tests/e2e/mobile-send-delivery-cases.mjs` | The phone bundle for AC-002 and the Org and peer branches (two nodes) |

## Durable Coverage To Update

| Case ID | Path | Update |
| --- | --- | --- |
| API-07, API-08 | `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs` | `loseNextSend`, `dropAfterNextSend`; the snapshot's `input_state` in the log |
| API-08 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | import and run the new cases |

## Durable Coverage To Remove

None (the implementation removed the server scratch reproduction and the probes' second send).

## Desktop Application Validation Plan

- Web-equivalent renderer behavior only (composer, stores, streams); no Electron change. Desktop renderer (`nuxt dev`) and the phone bundle against probe-owned built nodes. The user's running app is not touched.

## Live Environment And Fixture Plan

- Built nodes with scripted AGY; the page's every `/ws/` socket through the wire (drop the whole path, lose or drop around one message, slow the downlink).
- Journeys: per case above. Evidence: per-case JSON (frames with the snapshot's `input_state`, the view: notice, draft, message count, status), screenshots, logs, the page console.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only | Follow-Up |
| --- | --- | --- | --- | --- |
| A runtime that queues while Running, other than AGY (native, ACP) | Native needs a model; the queueing is in the shared AgentRun admission, not the backend | Low | No | None |
| R-2 (no ack on a bound stream) | Needs a node defect | Low (by design) | No | None |

## Ambiguities Or Reroute Triggers

None at planning time. Found during execution: a Team member shows Initializing (Send disabled) while its stream is down, with or without a send (SDD-12 control): outside this ticket, FU-003. Added SDD-11 (a delivered message to a run a Stop took offline: either branch the design allows) and SDD-12 (the control).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed; see the execution report)
- Durable Coverage Added / Updated: `Yes`
- Reroute Required: `No`
