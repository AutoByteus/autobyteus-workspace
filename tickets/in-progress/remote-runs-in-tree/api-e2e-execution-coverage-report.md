# API/E2E Execution Coverage Report — autobyteus-278 (Remote delegated runs in the run tree)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree/tickets/in-progress/remote-runs-in-tree`; evidence in `…/evidence/api-e2e/`.

## Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 1)
- Progress log: `…/api-e2e-test-progress.md`
- Revision record: `…/api-e2e-revision-record.md`
- Revision: `API-REV-001`; round 1
- Trigger: CRR-002 pass of IR-002. Code `1bdcff8ae2`, docs `4abf57451a`. Classification: Large / High.
- **Result: Fail.** Four findings:
  - **F-001 (High):** no live output in alpha's view of a remote Agent run that is active when the view opens. Beta's observation stream sends an agent frame before `{nodeId}`, and alpha correctly ends it.
  - **F-002 (Medium):** REQ-808's run-view affordances are missing in the Team family, and the Org family's composer text is not the remote one.
  - **F-003 (Medium):** C-2. When beta's own owner stops the run, alpha's open view isn't told.
  - **F-004 (Low, Unclear):** the "from alpha's owner" mark is not recorded or shown anywhere.
- Everything else passes: rows, titles and statuses for all three delegator kinds; projections; owner messages; interrupt; Stop; idle restore; unreachable and Retry; security on all four routes; the Team family order (CRR-001 F-001).
- Durable coverage changed: Yes.
  - **Two-server E2E:** the proxy forwards WebSocket upgrades; RC-31 … RC-37 are new; RC-06, RC-09 … RC-11, RC-22, RC-23 and RC-20 are updated.
  - **New browser probe:** `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs`.

## Environment

| ID | Code | Machine | Servers | Data |
| --- | --- | --- | --- | --- |
| ENV-1 | `1bdcff8ae2` (dist API-00) + the test changes | macOS 26.5.2, Node v22.23.1 | two-server E2E: alpha and beta behind capturing proxies (now also forwarding WebSocket upgrades), scripted AGY CLI; RC-27/RC-35 add a third server | temp roots and HOMEs, `env -i`; removed |
| ENV-2 | as ENV-1 | as ENV-1; Chrome 1440×1100 (playwright-core, headless) | the probe: alpha and beta dist servers, scripted AGY CLI, `nuxt dev` against alpha | temp root removed; nothing left |

## Cases

| Case | Criteria | What runs | Env | Result | Evidence and what to look for |
| --- | --- | --- | --- | --- | --- |
| API-00 | all | server build | ENV-1 | Pass | `API-00-server-build.log` |
| API-R1 | unit, integration, specs | IMP-01 … IMP-08 | — | Reused | the source is unchanged since then |
| Run 1 | — | whole two-server E2E | ENV-1 | 31/37 | `API-01-run1*`. RC-06, RC-22, RC-35 and RC-20 failed on my test assumptions, fixed: an open view now reads summaries, so "nothing sent" checks count only message and start requests; `addPeerNode` needs `nodeId` on this base; `sec-websocket-key` is not a credential. RC-31 and RC-32 failed on F-001 and F-003 |
| **Run 2** | — | the same, the tests fixed, the code as delivered | ENV-1 | **35/37**: only F-001 (RC-31's live checks) and F-003 (RC-32) | `API-01-run2.log`, `API-01-run2/` |
| Diagnostic | F-001 | the same, with beta's route holding frames until `{nodeId}` is sent (temporary, reverted) | ENV-1 | 36/37: only RC-32 (F-003) | `API-01-diagnostic-nodeid-first*` |
| RC-31 | AC-801, 802, 803, DEC-804 (standalone delegator, Agent target) | the root view `/ws/agent-collaboration/<delegator>` | ENV-1 | Fail (F-001); the rest passes | **Row:** exactly `{kind: agent, address: /publisher, agent_run_id, node_id: beta, node_name: beta-node, delegator_agent_run_id, started_at}`. **Summary:** `{reachable: true, title: "Tree work. Marker TREE-PACKET.", statuses: [{r9, idle}]}`. **Projection** through alpha is readable. **Owner message:** ACK accepted; beta's conversation has the `user` message and then "OK"; alpha's re-read has it; no message-log line on either node. **Interrupt:** a held turn reads `running`, then not running after `INTERRUPT_GENERATION` (ACK accepted). **Stop:** `STOPPED`, the CLI is gone, the last summary has `statuses: []`. **Live output:** never arrived (F-001) |
| RC-32 | DS-006 / C-2 | beta's own owner stops the run while alpha views it | ENV-1 | **Fail (F-003)** | No summary arrives in alpha's view after beta's `terminateAgentRun`, in run 2 and in the diagnostic too (so it isn't F-001). A Retry then reads `statuses: []` |
| RC-33 | AC-801 … 803, 806 (Team delegator; Agent and Team targets) | `/ws/agent-team/<Remote Squad>` | ENV-1 | Pass | rows for R2 (agent) and Studio Team (`agent_team`, `coordinator_address /studio_team/lead`, both members); summaries with the Studio title; live frames (`AGENT_STATUS`, `SEGMENT_*`, `TURN_COMPLETED`) while beta's owner writes to the coordinator; the checker's and R2's conversations through alpha; an owner message to the never-messaged checker reaches it |
| RC-34 | AC-801, 803, 806 (Org delegator) | `/ws/agent-org/<org>` | ENV-1 | Pass | row and summary (title "Org work. Marker ORG-PACKET."); projection; the owner message reaches R5; live output shown (R5 was offline when the view opened, so no frame came before `{nodeId}`) |
| RC-35 | security | direct requests to beta | ENV-1 | Pass | **From gamma** (registered on beta, did not start the run): summaries `runs: []`; projection, command and observation `REMOTE_TARGET_NOT_PERMITTED` (the observation's first frame, then close 1000). **From alpha:** beta's own run, and an agent outside alpha's run, are refused the same way; summaries list only alpha's run; nothing reached beta's run |
| RC-36 | AC-805 | after RC-12's idle grace | ENV-1 | Pass | the quiet run reads `{reachable: true, title: "Idle work. Marker IDLE-PACKET.", statuses: []}` (listed, not gone); a message from alpha's window restores it (one relaunch with `--conversation`) |
| RC-37 | AC-804 | beta stopped | ENV-1 | Pass | `reachable: false` after 0.3 s; the projection read errors in 16 ms ("Node \"beta-node\" could not be reached (fetch failed)."); the delegator's own conversation reads; beta back, `REFRESH_REMOTE_TASK_EXECUTIONS` → `reachable: true` with the title |
| RC-20 | contract | the audit, now with the four routes | ENV-1 | Pass | run 2: the new bodies have exact keys; the observation upgrades are on their path only; no credential |
| RC-01 … RC-30 | preserved | — | ENV-1 | Pass (run 2) | — |
| API-02 run 9 | AC-801, 804, 806, REQ-808, CRR-001 F-001 | the browser probe (`node tests/e2e/remote-runs-in-tree-probe.mjs`) | ENV-2 | **5/6; RTP-04 fails (F-002, F-001)** | `API-02-run9/remote-runs-in-tree-probe.json` and screenshots, cases below the table. Runs 1–8 debugged my probe's tree opening and checks; recorded in the progress log |

**API-02 run 9 cases:**
- **RTP-01 (standalone family): Pass.**
  - The remote Team row reads "beta-node · studio team · Cut the launch trailer. Marker REMOTE-TEAM.".
  - Its members, lead and checker, are listed below it without a chip.
- **RTP-02 (Team family): Pass.**
  - The order is local A, remote, local B (positions 3, 4, 5), as CRR-001 F-001's fix requires.
  - The remote row has the `beta-node` chip, a status dot and its Task line.
- **RTP-03 (Org family): Pass.** The row has the chip, title "Org work. Marker REMOTE-ORG." and a status dot.
- **RTP-04 (opened remote run): Fail.**
  - **Standalone family** (a remote Team member): ✓ chip, no ⚙/＋, "Message lead on beta-node…", Files note.
  - **Org family:** chip and no ⚙/＋, but the composer reads "Type a message..." (F-002).
  - **Team family:** no chip, ⚙ and ＋ shown, "Type a message..." (F-002).
  - **All families:** the Files note "On beta-node …" shows.
  - **Owner message:** it reached beta and the answer "OK" is stored there, but it did not appear in the window without a reload (F-001).
- **RTP-05: Pass.** Stop on the remote row stops the run on beta.
- **RTP-06: Pass.**
  - With beta stopped, the row reads "Couldn't reach beta-node." with Retry.
  - The opened run shows "beta-node isn't reachable … Retry".
  - This node's own runs list and open.
  - With beta back, Retry restores the title.

## Failures

| ID | Severity | Criteria | Observed | Expected | Evidence | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | High: the live view of the most common case, a remote Agent active when the owner opens the tree | AC-802, AC-803 (answer live), REQ-802, N-401 | Beta's `/rest/remote/run-observations` route sends the run's current state (`AGENT_INPUT_STATE`) before `{nodeId}`. A direct observation of a live run shows the agent frame first, then `{nodeId}`. Alpha's client requires `{nodeId}` first, so it ends the stream: no `agent_presentation` reaches the window (RC-31; RTP-04's answer). It works when the run is offline at open (RC-34) and in the Team-target case (RC-33) | `{nodeId}` first, then frames | `F-001-observation-first-frame-order.log`; run 2 RC-31; the diagnostic run | Preliminary: **Local Fix (Implementation Engineer).** In `src/api/rest/remote.ts`, the sink is live from `openRunObservation(body, sink)`, whose subscription replays state at once, and `{nodeId}` is sent only after it resolves. Holding frames until `{nodeId}` has gone fixes it (diagnostic: 36/37). The in-process two-node test doesn't use the WebSocket route, so it can't see this; a route-level test would |
| F-002 | Medium | REQ-808, UI/UX spec (header chip, no ⚙/＋, text-only composer "Message {agent} on {node}…") | In the Team family, the opened remote run shows no chip, shows ⚙ and ＋, and the composer reads "Type a message...". In the Org family, the composer reads "Type a message...". The standalone family is right. The Files note shows in all three | the same affordances in every family (REQ-806) | `API-02-run9` RTP-04 (`views`), `RTP-04-opened-remote-run.png` | Preliminary: **Local Fix (Implementation Engineer).** The affordances live in `AgentWorkspaceSurface.vue` (chip, ⚙/＋) and `AgentWorkspaceView.vue` (placeholder). The Team family's member view, and the Org view's composer, don't use them. Not checked: whether those composers also still offer attachments or `@` |
| F-003 | Medium | DS-006 / C-2 (code review held it for this evidence), REQ-805 "the row always shows the real state" | Beta's owner stops the run (`terminateAgentRun`) while alpha views it: alpha's view gets no summary and keeps the last state until Retry. Independent of F-001 (also in the diagnostic run) | beta ends the run's observations on any stop, so alpha reads the final state (AR-403) | RC-32 in `API-01-run2` and `API-01-diagnostic-nodeid-first` | Preliminary: **Local Fix (Implementation Engineer).** Deviation 7 ends observations only for a terminate through owner-commands. Beta's own Stop (and other ends of the run, for example the idle shutdown) don't end them |
| F-004 | Low | AC-803 "marked as from alpha's owner", REQ-803 / DEC-803 "recorded … as from the owner of this node" | The owner message reaches beta's run as an ordinary user message. The `remote_owner` metadata is posted with it, but nothing in beta's stored data for the run contains it (raw traces, journal, metadata, conversation), and neither window shows a mark | a recorded, visible "from alpha's owner" mark, if the requirement means that | RC-31 `ownerMarks: []` (a search of beta's memory) | Preliminary: **Unclear (Solution Designer).** The design says "metadata naming the peer owner"; the requirement says "recorded … as from the owner of this node". Whether a transient mark is enough is a requirement question |

## Acceptance-Criteria Proof

| AC | Proven by | Status |
| --- | --- | --- |
| AC-801 | RC-31, RC-33, RC-34; RTP-01 … RTP-03 | Proven (all three families, Agent and Team targets, rendered) |
| AC-802 | RC-31 (F-001), RC-33, RC-34; RTP-04 | **Failed (F-001)** for an active remote Agent; proven for the Team target and an Agent offline at open |
| AC-803 | RC-31, RC-33, RC-34; RTP-04 | Message and answer on beta, and in alpha's re-read: proven. Live answer: **failed (F-001)**. The mark: **F-004 (Unclear)** |
| AC-804 | RC-37, RTP-06 | Proven |
| AC-805 | RC-36 | Proven |
| AC-806 | RC-31, RC-33, RC-34; RTP-01 … RTP-03 | Proven for the data. The opened view fails in the Team and Org families (F-002) |
| DEC-804 | RC-31 (interrupt, Stop), RTP-05 | Proven. Beta's own Stop isn't reflected (F-003) |
| Security | RC-35 | Proven |
| AC-807 | — | the user's check |

## Validation Confidence Scorecard (Mandatory)

These are scored over what can be proven without the user. A failing critical criterion blocks Pass.

| Category | Score | Basis | Residual uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | AC-802 fails in the common case; REQ-808 fails in two families; C-2 fails | the four findings |
| Changed-boundary execution directness | 95% | the real WebSocket route and the real streams of three root kinds; the window in Chrome | — |
| Cross-boundary integration realism and mock gap | 92% | real processes; the proxy now forwards upgrades | loopback |
| Environment, configuration, identity, and fixture fidelity | 95% | clean roots; a third registered node for security | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | unreachable, Retry, idle restore, interrupt, Stop, security | F-003 |
| User-surface, browser, and desktop-shell confidence | 80% | three families rendered; the Team order; unreachable and Retry | F-002, F-001 in the window |
| Durable regression coverage quality and relevance | 92% | 7 new E2E cases; a 6-case browser probe | the probe's live check depends on F-001 |

- Overall final confidence: 87%
- Every critical AC directly proven: `No`
- Target met: `No`

## Broader Validation Decision (Mandatory)

- **Decision:** `Required` (executed, API-02).
- **Mode:** `Browser` with two server processes.
- **What it addressed:** the Team and Org families had never been rendered (IMP-09 covered only the standalone family). It found F-002.

## Durable Coverage Changes

- `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`:
  - the proxy forwards WebSocket upgrades;
  - helpers for root events, summaries, live checks and commands;
  - new cases RC-31 … RC-37;
  - RC-20 audits the four new routes;
  - RC-06, RC-09 … RC-11, RC-22 and RC-23 count only message and start requests as "sent";
  - RC-35 passes `nodeId` to `addPeerNode`.
- `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` (new), with its script `test:e2e:remote-runs-in-tree` in `autobyteus-web/package.json`.

## Decision

Fail. This goes to the code reviewer for failure-origin review:
- F-001, F-002 and F-003: preliminary Local Fix (Implementation Engineer);
- F-004: Unclear (Solution Designer).

After fixes, rerun the two-server E2E (whole suite) and the browser probe.
