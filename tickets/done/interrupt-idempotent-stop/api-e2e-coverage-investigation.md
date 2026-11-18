# API/E2E Coverage Investigation — autobyteus-533 (interrupt-idempotent-stop)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: `evidence/reproduction/`, `evidence/spine-validation/sr-003-stop-spines-by-run-kind.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Code Reviewer, CRR-002 Pass, routed to API/E2E (branch `codex/interrupt-idempotent-stop` at `a0d81bbe18`, code through `71f9a5d13e`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

A user's Stop (`INTERRUPT_GENERATION`) is harmless to repeat. The node answers a Stop that finds nothing to stop (no active turn, the turn ended inside the runtime, or the run / Team / Org no longer active) as `accepted` on `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/agent-collaboration` and `/ws/peer-run` (REQ-001, D-S1, D-S2); Claude, Codex and native answer `NO_ACTIVE_TURN` when the turn is gone (AC-005, D-S3). On the web, `runInterrupt` owns every Stop (D-W3): after the first press the button shows a spinner and "Stopping…" (`aria-busy`, disabled) and sends nothing more until the run's status leaves Running (REQ-003); an accepted Stop shows nothing (REQ-004); a Stop whose connection is lost is held until the rebind's status (REQ-005, D-W7); only `not_sent` and `refused` show one plain message naming the agent as the view shows it, with no run id or internal words (REQ-006). Every run kind: standalone, Team member, Org member (direct and in an Org-internal Team), delegated agent, delegated Team member, peer run, on desktop and phone (UC-004). Preserved: a single Stop ends the turn; Stop never starts a run; terminate, send and tool approval unchanged (REQ-007).

## Supported Scenarios And Real Usage

Updated during execution: the wire carries every `/ws/` socket of the page (a run's status also comes over `/ws/run-status`), and "not connected" also opens a working run while the path is down (SGD-07/08 `a2`).


- Designer scenarios covered: SCN-001…SCN-006, for every run kind of UC-004.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-003a "Stopped from another window": the user has the run open in two windows (desktop and phone); the other window's Stop ends the turn while this window, on a slower path, still shows Running; the user presses Stop here. Trigger: a second client's `INTERRUPT_GENERATION` (the probe's own socket, as the existing probes send "other window" commands), and the phone's network path delayed (latency both ways).
  - SCN-005a "Stop lost in transit": the connection drops after the press but before the Stop reached the node; after the rebind the run is still Running, so Stop is offered again (DS-002b's Running branch). Trigger: the page's network path drops (the probe's routed socket closes) while a Stop is on the wire.
  - SCN-007 "Send right after a Stop took the AGY run offline" (CG-07, REQ-007 send unchanged): every Stop round of the probes is followed by the next message to the same run, which restores it. Each round measures whether that send reached the node.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none in the requirements; CG-05 (Stop to a non-member of a stopped Team/Org) was rejected by code review as unsupported and is not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 single Stop | Preserved + Changed (Stopping state) | REQ-003, REQ-007, D-W2 | Real stack per run kind: Stopping seen, turn ends, Send returns |
| BEH-002 second press | Changed (sends nothing) | REQ-002, REQ-003 | Count `INTERRUPT_GENERATION` frames the page sends per double press |
| BEH-003/004 Stop after turn ended / stale status | Changed (accepted, quiet) | REQ-001, REQ-004 | Real stack: the node's ack `accepted`, no toast, per run kind |
| BEH-005/006/007 Team, Org, peer | Changed | REQ-001, REQ-006, DEC-007 | Real stack on every kind, phone and desktop |
| BEH-008 loss while Stopping | Changed (held until rebind) | REQ-005, D-W7 | Real stack: drop the page's path while Stopping; both rebind outcomes |
| BEH-009/010 real failures | Changed (one plain message) | REQ-006 | Real stack: not connected; a refusal (emulated at the page's socket in the node's answer shape); beta stopped under an open peer run |
| Ack meaning on 5 streams | Changed | Design risk rationale | Whole server `test:integration` and `pnpm test:e2e` (AGY gate on) |
| Backend turn-gone answer (Claude, Codex, native) | Changed | AC-005, D-S3 | Server unit (IMP-03, IMP-11); no live paid runtime |
| Domain `AgentRun.interrupt()` result | Preserved | D-S1 | Whole server suites (shutdown fence, termination) |
| Send / terminate / tool approval | Preserved | REQ-007 | Whole suites; SCN-007 measurement |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `userInterruptOutcome`, backends' turn-gone answer | Server unit (IMP-03, IMP-11) | Other suites relying on the old ack | Whole server integration + E2E |
| API / transport / contract | Yes | Ack meaning on five WebSocket streams | IMP-02 (agent, Team), IMP-04 | Org, collaboration and peer-run streams only unit-tested | Real stack with Org, delegated and peer runs (two nodes) |
| Frontend component / state | Yes | `runInterrupt`, `interruptPending`, `stopping` action, outcomes | Web unit (IMP-07), fixture probe (IMP-08) | Mocked streams | Real-stack browser |
| Browser integration / user journey | Yes | Composer Stop on every run kind | IMP-09/10 (standalone, scratch) | Team, Org, delegated, peer never in a real stack; phone never | Durable desktop probe + phone cases |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same composer in the desktop app | IMP-09/10 | — | Desktop probe (nuxt dev renderer) |
| Desktop shell / Electron-specific integration | No | No main/preload change | — | — | None |
| Process / lifecycle | Yes | AGY run offline after Stop; connection loss and rebind | IMP-10 (one latency run) | Deterministic loss while Stopping | Probe-controlled path drop |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | Yes | Peer relay `/ws/peer-run`; Org member on alpha | Unit only | Two-node relay | Phone cases on alpha + beta |
| External integration | No | Live provider runtimes not exercised | Unit per backend | Live Claude/Codex/native turn-gone race | Not run (paid; unit-proven) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop`
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/WebSocket server (`autobyteus-server-ts`), Nuxt web and Electron desktop (`autobyteus-web`), phone bundle `/mobile`; Node 22.23.1.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/TESTING.md` (no closer `TESTING*.md`).
- Conflicting, missing, or unclear project instructions: none. The guideline names `pnpm -C autobyteus-web test:nuxt`; the implementation ran the same suite as `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run`.
- Changed build-input paths: `None` (`git diff --name-only bd2053ee51...HEAD` has no manifest, lockfile, tsconfig, baseline, scripts, nuxt config, contracts, workflows or prisma path; no new cross-package import). No fresh-start build case.
- Required environment variables or secrets available: `N/A` (scripted AGY and the recorded Grok ACP replay; no provider key).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path | Layers and commands | `test:integration:prepare` then `test:integration`; `pnpm test:e2e`; browser probes `pnpm -C autobyteus-web test:e2e:<name>`; phone behavior proven in `test:e2e:mobile-shell` |
| `TESTING.md` § Environments | Isolation | Node 22; built `dist` of this worktree; E2E with a clean env (`env -i PATH HOME=<resolved temp> TMPDIR`); one heavy run at a time; scripted AGY `ANTIGRAVITY_CLI_COMMAND`, `RUN_AGY_FAILURE_E2E=1` |
| `TESTING.md` § Browser probes | Probe rules | Probe owns ports, data root, Nuxt dev, Chrome; `AUTOBYTEUS_ALLOWED_ORIGINS` = the probe frontend; owner credential (`fixtures/probe-node-access.mjs`); fail on browser errors; fresh `--output-dir`; cleanup receipt |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | Phone stack | alpha + beta built servers, phone bundle (`build:mobile-web`), `--cases=`; case IDs unique across `*-cases.mjs` modules |
| `autobyteus-server-ts/tests/e2e/agent-run/stop-nothing-to-stop.e2e.test.ts` header | Gate | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture>` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree root | `pnpm -C autobyteus-server-ts build` | before any built-server probe | `dist/app.js` fresh | — |
| Phone bundle | worktree root | `pnpm -C autobyteus-web build:mobile-web` | `dist/public` served by alpha at `/mobile` | `dist/public/index.html` | — |
| Probe nodes (desktop probe: one; phone: alpha + beta) | `autobyteus-server-ts` | spawned by the probe from `dist/app.js` | own temp data root, HOME, free ports | `/rest/health` | probe `finally` (receipt in evidence) |
| Nuxt dev | `autobyteus-web` | spawned by the probe | free port | HTTP 200 | probe `finally` |
| Headless Chrome | — | Playwright `chromium.launch` | the probe's own | — | probe `finally` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agents, Teams, Org, runs, delegations, remote runs | Public GraphQL/WebSocket in the probes (mobile-shell `setUp`, the cases' own runs) | Temp data roots; never `~/.autobyteus` | Removed with the data root |
| Node credential | `probeNodeEnvironment`, `attachToBrowserContext`, `ownerSocketUrl` | Never written to evidence (`redactCredentials`) | Process lifetime |
| Phone credential | Phone Access pairing in mobile-shell | Redacted | Data root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-run/stop-nothing-to-stop.e2e.test.ts` | Standalone + Team member: idle, together, after the turn ended → all `accepted`, one turn end | AC-001…AC-004 | Still Valid | IMP-02 | Run in API-06 |
| `autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts` | `/ws/agent` interrupt acks (rewritten) | AC-001, AC-011 | Still Valid | IMP-04 | Run in API-05 |
| `team-conversation-target-websocket`, `team-agent-tools-mcp-lifecycle` integration | Team stream commands; their `NO_ACTIVE_TURN`/`RUN_NOT_FOUND` mocks are not interrupt-ack assertions | AC-011 | Still Valid | IMP-04 | API-05 |
| Gated AGY suites sending `INTERRUPT_GENERATION` (`agy-interrupt-resend-transport`, `agy-background-task-transport`, `agy-skill-update-notice-transport`, `remote-delegation-two-server`, …) | Assert `accepted` or no failed ack | AC-011 | Still Valid (searched: none asserts a non-accepted interrupt ack; `remove-built-in-project-task-manager-startup`'s `RUN_NOT_FOUND` is a SEND_MESSAGE ack) | grep | API-06 with the AGY gate |
| Live runtime suites (Claude, Codex, Grok, DeepSeek, native) sending interrupts | Live provider turns | AC-005, AC-011 | Out Of Scope for this round (paid; backends unit-tested) | — | Not run |
| `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs` | Fixture page: Stopping, refused, not sent, loss + rebind | AC-006…AC-009, QR-003 | Still Valid (rewritten by implementation) | IMP-08 | Reused |
| `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | Scratch reproduction, no assertions | AC-010 | Replace | Design removal plan | Replaced by `stop-generation-probe.mjs`; removed |
| Web unit specs (`runInterrupt.spec`, `orgInterruptOutcome.spec`, `AgentUserInputTextArea.stopping.e2e.spec`, streaming/admission/store specs, `stopInterruptCatalog.spec`) | Per run kind units | AC-006…AC-009 | Still Valid | IMP-07 | Reused; `stores/__tests__/agentOrgRetainedRecovery.spec.ts` changed after IMP-07: rerun |
| `autobyteus-web/tests/e2e/mobile-run-settings-cases.mjs`, `mobile-every-run-settings-cases.mjs` | Settings stop icon (terminate), not the composer Stop | Out of scope (terminate unchanged) | Out Of Scope | Read | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003…AC-005, AC-011 | Server unit | Reused | IMP-03 + IMP-11 | Server code changed since IMP-03 only in the native backend and its test, rerun in IMP-11 at `71f9a5d13e` |
| API-02 | AC-006…AC-009, QR-001 | Web unit | Reused + Existing Test | IMP-07; rerun `stores/__tests__/agentOrgRetainedRecovery.spec.ts` (changed after IMP-07) | Web source unchanged since `1f92302096` |
| API-03 | — | Typechecks | Reused | IMP-11 (both typechecks at the CR-001 fix) | No source change since; `.mjs` probes are not type-checked (checked in API-12) |
| API-04 | AC-006…AC-009, QR-003 | Fixture browser probe | Reused | IMP-08 | Web code unchanged since `45cae5ebd2` |
| API-05 | AC-001, AC-003, AC-004, AC-011 | Server integration (whole) | Existing Test | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | Ack meaning changed on five streams |
| API-05b | — | FSEvents measurement and the two failing watcher files alone | Existing Test | measurement script; `vitest run` of the two files when `fseventsd` is calm | Added after API-05: TESTING.md asks for the measurement before diagnosing watcher timeouts |
| API-06 | AC-001…AC-004, AC-011 | Server E2E (whole, AGY gate) | Existing Test | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm test:e2e` | Same; scripted gated suites are the ones that drive real interrupts |
| API-07 | AC-002, AC-006, AC-007, AC-008, AC-009, AC-010, QR-001, QR-003 | Desktop renderer, real stack, loopback | Durable | `pnpm -C autobyteus-web test:e2e:stop-generation --output-dir <fresh>` (cases SGD-01…SGD-06: standalone + Team member) | Replaces the scratch reproduction |
| API-08 | AC-008, AC-010 | Desktop renderer, real stack, 150 ms each way | Durable | same with `--latency-ms 150` | Phone/remote path timing |
| API-09 | AC-003, AC-004, AC-006, AC-007, AC-009, AC-010, QR-003 | Phone bundle, alpha + beta, every run kind | Durable | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=MSP-75,…,MSP-80` | TESTING.md: phone behavior on the phone bundle; UC-004 run kinds incl. Org, delegated and peer on two nodes |
| API-09b | — | MSP-50…52 alone | Existing Test | `--cases=MSP-50,MSP-51,MSP-52` | Added after API-09: rule 9 rerun of the case whose browser error failed the probe's verdict (FU-007) |
| API-10 | REQ-007 (CG-07) | Real stack: send right after a Stop took AGY offline | Temporary Probe (measurement inside API-07/08/09 rounds) + focused repeat if it reproduces | Each Stop round's next send is checked for its node ack; on a stall: logs, then a focused loop on HEAD and, if the cause is not found, the base | An open observation, not a requirement; measured where it occurs |
| API-11 | — | Scratch removal | Durable (removal) | `git rm autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | Design removal plan |
| API-12 | — | Web guards / typecheck scope of the new probe files | Existing Test | `pnpm -C autobyteus-web guard:web-boundary`; check the typecheck scope | New files under `autobyteus-web/tests/e2e` |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07, API-08 | `autobyteus-web/tests/e2e/stop-generation-probe.mjs` (+ `package.json` script `test:e2e:stop-generation`) | The desktop real-stack journey for AC-010 with assertions (the scratch had none); loss/rebind and real-failure presentation through the real node |
| API-09 | `autobyteus-web/tests/e2e/mobile-stop-generation-cases.mjs` (imported by `mobile-shell-probe.mjs`) | AC-010 phone case (standalone, Team member) and UC-004's remaining kinds in a real two-node stack |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-09 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Import and run the new cases; give the phone's socket route a hook for latency, a path drop and frame observation | The hook defaults to pass-through, so other cases are unchanged |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | No assertion; a hand-over reproduction printing toasts | Design "Removal / Decommission Plan"; requirements Supplemental Artifacts ("replaced by the durable probe") | `stop-generation-probe.mjs` (API-07, API-08) |

## Desktop Application Validation Plan

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Testing guideline used: TESTING.md § Choosing the path ("Renderer UI, stores, client–server behavior that also runs in a browser → web unit tests + a browser probe").
- Web-equivalent behavior: everything in this ticket (composer, stores, streams).
- Shell-specific or lifecycle behavior: none changed.
- Chosen approach: browser probe against a probe-owned built server + `nuxt dev` (desktop renderer), and the phone bundle in mobile-shell.
- How the run avoids disturbing an already-running desktop application: own ports, data roots and HOMEs; the user's AutoByteus (port 29695) is not touched.

## Live Environment And Fixture Plan

- Startup order: build server; build phone bundle; probes start their own nodes, Nuxt and Chrome.
- Environment choices that matter: scripted AGY (`HOLD_TURN` keeps a turn running; a Stop takes the AGY run offline); the page's sockets routed through Playwright so the probe can add latency, drop the path and observe frames; English locale.
- Health / readiness checks: `/rest/health`, Nuxt HTTP 200, warm-up reload.
- Seed data: public GraphQL; the cases create their own runs.
- Requirement-linked journeys: per run kind — double press (gaps 0…600 ms), Stop after the turn ended (other window), loss while Stopping (Stop delivered / Stop lost), not connected, refused.
- Evidence: per-case JSON (frames sent/received, button states over time, toasts, node status), screenshots, server logs.
- Owned processes and temporary state: nodes, Nuxt, Chrome, temp roots — removed in `finally`.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-005 on live Claude / Codex / native turns | Paid providers; the turn-gone race needs artificial timing; backends unit-tested (IMP-03, IMP-11) | Low | No | None |
| A node-side refusal from a real local runtime | No scripted runtime refuses an interrupt (AGY always stops); the refusal's presentation is proven with the wire answering the page's Stop in the node's own failed-answer shape (the Stop never reaches the node, so the run keeps working as after a real refusal) | Low | No | None |
| A real peer-unreachable refusal on the phone | With beta stopped, the phone at once shows the peer run "Not reachable" with no composer (MSP-79 `betaDown`), so no Stop can be pressed | Low | No | None |
| Electron shell | Not changed | None | No | None |

## Ambiguities Or Reroute Triggers

None at planning time. Found during execution, all outside this ticket and recorded as follow-ups: FU-005 (Team stream recovery after a blip), FU-006 (a send before the session is ready is lost: the cause of CG-07), FU-007 (run-open race guard error).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed; see the execution report)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: case results go to the execution report; progress to `api-e2e-test-progress.md`.
