# API/E2E Execution Coverage Report — autobyteus-278 (Remote delegated runs in the run tree)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree/tickets/in-progress/remote-runs-in-tree`; evidence in `…/evidence/api-e2e/`.

## Round 4 — CRR-007 rerun (authoritative)

### Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 4 note)
- Progress log: `…/api-e2e-test-progress.md` (rows 28–30)
- Revision: `API-REV-003`; round 4
- Trigger: CRR-007 (a Targeted Delta Review of IR-005).
  - Code `580e1cac5b` (docs `59d63920ed`): a Team view focuses and commits a remote member first, then reads it (`readRemoteTeamMember`).
  - The change is web only. The server is unchanged since `e37ad88b98`, so E2E run 4 (37/37, round 3) stands.
  - Classification: Large / High.
- **Result: Pass.**
  - **F-005 is resolved** (the code reviewer's F-006). In the Team family, with beta down, the remote run opens and shows the notice, the row has one red line, and the notice Retry loads the conversation once beta is back.
  - Every RTP case passes in two consecutive runs, with no browser errors.
- Durable coverage changed: Yes (small). RTP-07 now also asserts one red line on the row: no "Couldn't load".

### Cases

| Case | Criteria | Env | Result | Evidence and what to look for |
| --- | --- | --- | --- | --- |
| API-01 run 4 (round 3) | the whole two-server E2E | ENV-3 | **37/37** (stands: the server is unchanged) | `API-01-run4*` |
| **API-02 runs 21 and 22** | AC-801 … 804, 806, REQ-808, CRR-001 F-001, F-005 | ENV-4 on `580e1cac5b` | **7/7 in both runs**; `browserErrors: []`; cleanup complete | `API-02-run21/`, `API-02-run22/` (`remote-runs-in-tree-probe.json`, screenshots). Run 22 has the one-red-line assertion; run 21's row texts show the same thing |

**API-02 runs 21 and 22 cases** (the two runs match):
- **RTP-01 … RTP-03: Pass.** As in round 3.
- **RTP-04: Pass, four families.**
  - **Each family:** chip `beta-node`; ⚙ 0 and ＋ 0; "Message {agent} on beta-node…"; the Files note; Context Files 0; upload 0; `@` menu 0.
  - **The `@` control:** it opens the menu on this node's own run (1).
  - **Owner message:** the live answer shows, there is one owner message, and the heading shows.
- **RTP-05: Pass.** Stop on the row stops the run on beta.
- **RTP-06: Pass, four families** (Retry from the row): "Couldn't reach beta-node." with Retry, 0–0.2 s after the root opens, with no title element. With beta back, Retry clears it and shows the title or the Task line.
- **RTP-07: Pass, four families** (Retry from the opened notice).
  - **Each family:** the view shows "beta-node isn't reachable … Retry" under the remote header ("Offline"). The row has one red line: "Couldn't reach beta-node. Retry". With beta back, the notice Retry removes the notice and loads the conversation.
  - **Team family:** the view is "P / publisher / beta-node / Offline / beta-node isn't reachable". Round 3 stayed on helper, with "Couldn't load activity."

### Acceptance-Criteria Proof

| AC | Proven by | Status |
| --- | --- | --- |
| AC-801 | RC-31, RC-33, RC-34; RTP-01 … RTP-03 | Proven |
| AC-802 | RC-31, RC-33, RC-34; RTP-04 live answer | Proven |
| AC-803 | RC-31 (heading, N-405), RC-33, RC-34; RTP-04 | Proven |
| AC-804 | RC-37; RTP-06 and RTP-07 in four families | Proven (F-005 resolved) |
| AC-805 | RC-36 | Proven |
| AC-806 | RC-31, RC-33, RC-34; RTP-01 … RTP-07 (four families) | Proven |
| DEC-804, C-2 | RC-31, RC-32, RTP-05 | Proven |
| REQ-808 | RTP-04, RTP-07 (four families) | Proven |
| Security | RC-35 | Proven |
| AC-807 | — | the user's check (desktop ↔ Docker) |

### Validation Confidence Scorecard (Mandatory)

These are scored over what can be proven without the user.

| Category | Score | Basis | Residual uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | every AC proven, across four families, by the two-server E2E and the browser | AC-807 is the user's |
| Changed-boundary execution directness | 96% | the real WebSocket route and the streams of three root kinds; the window in Chrome against real servers | — |
| Cross-boundary integration realism and mock gap | 93% | real processes; the proxy forwards upgrades; beta stopped and started for real | loopback; a scripted CLI instead of a model |
| Environment, configuration, identity, and fixture fidelity | 95% | clean roots and HOMEs, `env -i`; a third registered node for security | — |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | unreachable, Retry from the row and the notice ×4, idle restore, interrupt, both Stops, security | — |
| User-surface, browser, and desktop-shell confidence | 95% | four families rendered, two Retry cycles each, two consecutive passing runs | the desktop shell (Electron) isn't driven; same web app |
| Durable regression coverage quality and relevance | 95% | 37 E2E cases; a 7-case probe over four families with a working `@` control | the probe's tree opening depends on the tree's current markup |

- Overall final confidence: 95%
- Every critical AC directly proven: `Yes`
- Target met: `Yes`

### Broader Validation Decision (Mandatory)

- **Decision:** `Required` (executed, API-02 runs 21 and 22).
- **Mode:** `Browser` with two server processes; beta is stopped and started.

### Durable Coverage Changes (this round)

`autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs`: RTP-07 also requires that the row at opening has no "Couldn't load" line (SR-008, one owner of the run's error).

### Decision

Pass (Large / High). This goes to the code reviewer for the proportional test-code review of the cumulative test changes:
- **The probe:** the Org Team family, the `@` control, RTP-06 per family, RTP-07, the tree helper, and the one-red-line assertion.
- **The two-server E2E:** the proxy's WebSocket upgrade forwarding; the `sentRequests` "nothing sent" counts; RC-31 … RC-37; RC-20.

---

## Round 3 — CRR-005 rerun (superseded by round 4)

### Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 3 note)
- Progress log: `…/api-e2e-test-progress.md` (rows 19–27)
- Revision: `API-REV-002`; rounds 2 (CRR-004, held for FU-004) and 3 (CRR-005)
- Trigger: CRR-005. Code `f60f962d9d` (docs `13280c1e62`): IR-003 / SR-006 (F-001 … F-004) and IR-004 / SR-008 (FU-004, one Retry rule). The server is unchanged since `e37ad88b98`. Classification: Large / High.
- **Result: Fail.** One new finding:
  - **F-005 (Medium):** in the **Team family**, opening the remote run while beta is down does not open it. The window stays on the previous run, so there is no "beta-node isn't reachable" notice and no notice Retry. The row gets a second red line, "Couldn't load activity. Retry", under the "Couldn't reach beta-node. Retry" line. Reproduced in probe runs 19 and 20.
- Round 1's findings are resolved:
  - **F-001:** the live frame of an Agent active at open arrives (RC-31; RTP-04's live answer).
  - **F-002:** the affordances are right in all four families.
  - **F-003:** beta's own Stop gives a final offline summary (RC-32).
  - **F-004:** the owner heading `From the owner of node "alpha-node":` appears on beta and in alpha's window, as one user message (N-405). It is checked by content; there is no `remote_owner` scan any more.
- Everything else asked in CRR-005 passes:
  - RTP-04 in all four families (Standalone, Team, Org Agent, Org Team member): chip, no ⚙/＋, placeholder, Files note, no Context Files or upload, and no `@` menu. The `@` check now has a working control.
  - Retry from the row in all four families (RTP-06).
  - Retry from the opened notice in three families: Standalone, Org Agent and Org Team (RTP-07). The Team family has no notice (F-005).
  - The full two-server E2E: 37/37.
- Durable coverage changed: Yes. Only the browser probe changed this round: four families, two Retry cycles per family, the `@` control, and the tree helper. The E2E test is unchanged since round 2 (`77d4fd50fe`).

### Environment

| ID | Code | Machine | Servers | Data |
| --- | --- | --- | --- | --- |
| ENV-3 | `f60f962d9d`. Server dist API-00 round 2 (`e37ad88b98`; the server is unchanged since) | macOS 26.5.2, Node v22.23.1 | the two-server E2E: alpha and beta behind capturing proxies (HTTP and WebSocket upgrades), scripted AGY CLI; RC-27/RC-35 add a third server | temp roots and HOMEs, `env -i`; removed |
| ENV-4 | as ENV-3, the web app from the worktree (`nuxt dev`) | as ENV-3; Chrome 1440×1100 (playwright-core, headless) | the probe: alpha and beta dist servers, scripted AGY CLI; beta is stopped and started on its own port and data | temp root removed, no server left (`cleanup` in each probe JSON) |

### Cases

| Case | Criteria | Env | Result | Evidence and what to look for |
| --- | --- | --- | --- | --- |
| API-01 run 4 | the whole two-server E2E | ENV-3 | **37/37** | `API-01-run4.log`, `API-01-run4/remote-two-server-receipt.json` |
| RC-31 | AC-801 … 803, DEC-804; F-001, F-004 / SR-006, N-405 | ENV-3 | Pass | `liveSeen: true`. The frames are `CONNECTED`, `ROOT_EXECUTION_VIEW_SNAPSHOT`, `ROOT_LIFECYCLE`, `agent_presentation`, `remote_task_execution_summary`, `agent_presentation_batch`, `AGENT_COMMAND_ACK`. `ownerEntry` is `{role: user, content: "From the owner of node \"alpha-node\":\n\nstatus? Marker OWNER-FROM-ALPHA"}`, and the marker appears once in alpha's re-read. Interrupt, then Stop `STOPPED`; `finalSummary.statuses: []` |
| RC-32 | C-2 / DS-006; F-003 | ENV-3 | Pass | after beta's own `terminateAgentRun`, a summary with `statuses: []` arrives in alpha's open view without Retry (`summariesAfterOwnerStop`) |
| RC-36 | AC-805 | ENV-3 | Pass | the quiet run reads `{reachable: true, statuses: []}` (listed, not gone); a message restores it (`--conversation` relaunch) |
| RC-01 … RC-30, RC-33 … RC-35, RC-37, RC-20 | preserved and round 1 cases | ENV-3 | Pass | run 4 |
| API-02 runs 14–18 | — | ENV-4 | probe debugging (see the progress log) | `API-02-run14` … `API-02-run18` |
| **API-02 runs 19 and 20** | AC-801, 802, 803, 804, 806, REQ-808, CRR-001 F-001 | ENV-4 | **RTP-01 … RTP-06 Pass; RTP-07 Fail (F-005)**, the same in both runs | `API-02-run19/`, `API-02-run20/` (`remote-runs-in-tree-probe.json`, screenshots), cases below |

**API-02 run 20 cases** (run 19 is the same):
- **RTP-01 … RTP-03: Pass.** These cover the Standalone remote Team with its members, the Team order (local A, remote, local B), and the Org row with its chip, title and status dot.
- **RTP-04: Pass, in all four families:**
  - **Families:** `standaloneTeamMember`, `teamAgent`, `orgAgent`, `orgTeamMember` (new: the Org lead's second delegation, to `/studio_team`).
  - **Each family:** header chip `beta-node`; ⚙ 0 and ＋ 0; placeholder "Message {lead|publisher} on beta-node…"; Files note "On beta-node …"; Context Files 0; upload 0; `@` menu 0.
  - **The `@` control:** typing `@` in this node's own standalone run gives `role=combobox` and `aria-expanded=true`, so the remote "0" is meaningful (`mentionProbe`).
  - **Owner message:** the live answer shows without a reload, there is exactly one owner message, and the heading `From the owner of node "alpha-node":` shows.
- **RTP-05: Pass.** Stop on the row stops the run on beta.
- **RTP-06: Pass, in all four families** (Retry from the row):
  - **Beta stopped, after a reload:** opening each family's root (this node's own run in it) makes the row read "Couldn't reach beta-node." with Retry within 0–0.2 s (bound 20 s), with no title element, as the spec's row state requires. This node's own run still opens.
  - **Beta started:** the row's Retry clears the error and shows the title again (Org) or the Task line (Standalone, Team).
- **RTP-07: Fail in the Team family (F-005); Pass in the other three** (Retry from the opened notice). For each family: beta is stopped, the page is reloaded, the root is opened, and the remote run is opened by its agent's name.
  - **Standalone, Org Agent, Org Team:** the view shows "beta-node isn't reachable / This run's conversation can't be loaded right now. Your other runs work. Retry when the node is back. / Retry". With beta started, the notice Retry removes the notice and the conversation loads.
  - **Team:** see F-005.
- **Browser errors:** only F-005's `Failed to open team member run: Error: Node "beta-node" could not be reached (fetch failed)`, from `selectTreeRunFromHistory` and `onSelectTeamMember`.

### Failures

| ID | Severity | Criteria | Observed | Expected | Evidence | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| F-005 | Medium: a stopped peer is the case AC-804 is about, and the Team family is a delegator kind the ticket supports (AC-806) | AC-804 "Beta stopped: opening its run shows the error within 20 s"; UI/UX spec, row state not reachable: "Open (shows the notice)", one red line; REQ-808 notice; SR-008 / FU-004 one owner for a remote run's Retry and loading | **Team family, beta stopped:** clicking the remote publisher's name (after opening the Team's own helper run) does not open it. The window stays on helper, so there is no notice and no notice Retry. The console says `Failed to open team member run: Error: Node "beta-node" could not be reached (fetch failed)` from `selectTreeRunFromHistory` and `onSelectTeamMember`. The row then shows two red lines: the Team member inspection's "Couldn't load activity. Retry" and the remote "Couldn't reach beta-node. Retry". **The other families open the run and show the notice:** Standalone (a remote Team member, through the collaboration child hydration) and Org (Agent and Team member). Row Retry works in the Team family (RTP-06) | the run opens with the notice and its Retry, as in the other three families, and the row keeps one red line | `API-02-run19/`, `API-02-run20/`: RTP-07 `noticeRetry["team (remote Agent)"]` (`viewAtOpen`, `rowAtOpen.text`), `RTP-07-2-beta-down.png`, `browserErrors` | Preliminary: **Local Fix (Implementation Engineer).** `openTeamMemberRunFromHistory` (`stores/runHistorySelectionActions.ts`) commits the selection only after `openTeamRun` reads the member's projection. The remote read in `teamMemberProjectionHydrationService.ts` marks the run unreachable and rethrows, so the selection isn't committed, and `setTeamMemberInspectionError` writes the second error. The Standalone and Org paths commit the view and show the notice. A second loading or error owner in the Team family is the kind of drift FU-004 removed for Retry, so the code reviewer may judge a design impact instead |

### Acceptance-Criteria Proof

| AC | Proven by | Status |
| --- | --- | --- |
| AC-801 | RC-31, RC-33, RC-34; RTP-01 … RTP-03 | Proven |
| AC-802 | RC-31 (live frame of an active Agent), RC-33, RC-34; RTP-04 live answer | Proven (F-001 resolved) |
| AC-803 | RC-31 (heading, N-405), RC-33, RC-34; RTP-04 (one message with the heading, live answer) | Proven (F-004 resolved by SR-006) |
| AC-804 | RC-37; RTP-06 (row, four families); RTP-07 (notice, three families) | **Failed in the Team family's opened run (F-005)**; proven for the rows of all four families and the opened run of the other three |
| AC-805 | RC-36 | Proven |
| AC-806 | RC-31, RC-33, RC-34; RTP-01 … RTP-04 (four families) | Proven for rows and opened views; the Team family's unreachable opening fails (F-005) |
| DEC-804, C-2 | RC-31 (interrupt, Stop), RC-32 (beta's own Stop), RTP-05 | Proven (F-003 resolved) |
| REQ-808 | RTP-04 (four families, with the `@` control) | Proven; the Team family's notice is F-005 |
| Security | RC-35 | Proven |
| AC-807 | — | the user's check |

### Validation Confidence Scorecard (Mandatory)

These are scored over what can be proven without the user. A failing critical criterion blocks Pass.

| Category | Score | Basis | Residual uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | everything but AC-804's opened run in the Team family | F-005 |
| Changed-boundary execution directness | 96% | the real WebSocket route and the real streams of three root kinds; the window in Chrome | — |
| Cross-boundary integration realism and mock gap | 93% | real processes; the proxy forwards upgrades; beta stopped and started for real | loopback; scripted CLI |
| Environment, configuration, identity, and fixture fidelity | 95% | clean roots and HOMEs; a third registered node for security | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | unreachable, Retry from the row (×4) and the notice (×3), idle restore, interrupt, both Stops, security | F-005 |
| User-surface, browser, and desktop-shell confidence | 90% | four families rendered with the `@` control; two Retry cycles per family; reproduced twice | F-005 |
| Durable regression coverage quality and relevance | 94% | 37 E2E cases; a 7-case probe over four families | the probe's tree opening depends on the tree's current markup |

- Overall final confidence: 91%
- Every critical AC directly proven: `No` (AC-804 in the Team family)
- Target met: `No`

### Broader Validation Decision (Mandatory)

- **Decision:** `Required` (executed, API-02).
- **Mode:** `Browser` with two server processes; beta is stopped and started.
- **What it addressed:** the Retry cycles had been checked in one family (round 1). Per family they found F-005, which the unit specs and the in-process tests can't see: the Team family's selection path with a real failed read.

### Durable Coverage Changes (this round)

`autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs`:
- **Org Team family:** the Org lead also delegates `/studio_team`, and RTP-04 opens its member (`orgTeamMember`).
- **`@` control:** it opens this node's own standalone run (`workspace-agent-run-row[data-run-id]`), so the remote "no menu" is checked against a menu that does open.
- **RTP-06:** Retry from the row in all four families. Each family's root is opened first, as the window asks the node only for an opened root (AC-804). The 20 s bound and "no title" are asserted.
- **RTP-07 (new):** Retry from the opened notice in all four families. Rows are opened by the agent's name; the row's middle can be its Task link.
- **The tree helper:** clicks only group-level disclosures, each bounded to 1.5 s. It opens the Team run and the Org run deliberately, at most once per 5 s each, because they open the run and collapse each other.

### Decision

Fail. This goes to the code reviewer for failure-origin review of F-005 (preliminary: Local Fix, Implementation Engineer). After the fix, rerun the browser probe (RTP-06 and RTP-07 in all four families). The two-server E2E needs a rerun only if the server changes.

---

## Round 1 (history, superseded by round 3)

### Report Meta (round 1)
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

### Environment (round 1)

| ID | Code | Machine | Servers | Data |
| --- | --- | --- | --- | --- |
| ENV-1 | `1bdcff8ae2` (dist API-00) + the test changes | macOS 26.5.2, Node v22.23.1 | two-server E2E: alpha and beta behind capturing proxies (now also forwarding WebSocket upgrades), scripted AGY CLI; RC-27/RC-35 add a third server | temp roots and HOMEs, `env -i`; removed |
| ENV-2 | as ENV-1 | as ENV-1; Chrome 1440×1100 (playwright-core, headless) | the probe: alpha and beta dist servers, scripted AGY CLI, `nuxt dev` against alpha | temp root removed; nothing left |

### Cases (round 1)

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

### Failures (round 1)

| ID | Severity | Criteria | Observed | Expected | Evidence | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | High: the live view of the most common case, a remote Agent active when the owner opens the tree | AC-802, AC-803 (answer live), REQ-802, N-401 | Beta's `/rest/remote/run-observations` route sends the run's current state (`AGENT_INPUT_STATE`) before `{nodeId}`. A direct observation of a live run shows the agent frame first, then `{nodeId}`. Alpha's client requires `{nodeId}` first, so it ends the stream: no `agent_presentation` reaches the window (RC-31; RTP-04's answer). It works when the run is offline at open (RC-34) and in the Team-target case (RC-33) | `{nodeId}` first, then frames | `F-001-observation-first-frame-order.log`; run 2 RC-31; the diagnostic run | Preliminary: **Local Fix (Implementation Engineer).** In `src/api/rest/remote.ts`, the sink is live from `openRunObservation(body, sink)`, whose subscription replays state at once, and `{nodeId}` is sent only after it resolves. Holding frames until `{nodeId}` has gone fixes it (diagnostic: 36/37). The in-process two-node test doesn't use the WebSocket route, so it can't see this; a route-level test would |
| F-002 | Medium | REQ-808, UI/UX spec (header chip, no ⚙/＋, text-only composer "Message {agent} on {node}…") | In the Team family, the opened remote run shows no chip, shows ⚙ and ＋, and the composer reads "Type a message...". In the Org family, the composer reads "Type a message...". The standalone family is right. The Files note shows in all three | the same affordances in every family (REQ-806) | `API-02-run9` RTP-04 (`views`), `RTP-04-opened-remote-run.png` | Preliminary: **Local Fix (Implementation Engineer).** The affordances live in `AgentWorkspaceSurface.vue` (chip, ⚙/＋) and `AgentWorkspaceView.vue` (placeholder). The Team family's member view, and the Org view's composer, don't use them. Not checked: whether those composers also still offer attachments or `@` |
| F-003 | Medium | DS-006 / C-2 (code review held it for this evidence), REQ-805 "the row always shows the real state" | Beta's owner stops the run (`terminateAgentRun`) while alpha views it: alpha's view gets no summary and keeps the last state until Retry. Independent of F-001 (also in the diagnostic run) | beta ends the run's observations on any stop, so alpha reads the final state (AR-403) | RC-32 in `API-01-run2` and `API-01-diagnostic-nodeid-first` | Preliminary: **Local Fix (Implementation Engineer).** Deviation 7 ends observations only for a terminate through owner-commands. Beta's own Stop (and other ends of the run, for example the idle shutdown) don't end them |
| F-004 | Low | AC-803 "marked as from alpha's owner", REQ-803 / DEC-803 "recorded … as from the owner of this node" | The owner message reaches beta's run as an ordinary user message. The `remote_owner` metadata is posted with it, but nothing in beta's stored data for the run contains it (raw traces, journal, metadata, conversation), and neither window shows a mark | a recorded, visible "from alpha's owner" mark, if the requirement means that | RC-31 `ownerMarks: []` (a search of beta's memory) | Preliminary: **Unclear (Solution Designer).** The design says "metadata naming the peer owner"; the requirement says "recorded … as from the owner of this node". Whether a transient mark is enough is a requirement question |

### Acceptance-Criteria Proof (round 1)

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

### Validation Confidence Scorecard (Mandatory) (round 1)

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

### Broader Validation Decision (Mandatory) (round 1)

- **Decision:** `Required` (executed, API-02).
- **Mode:** `Browser` with two server processes.
- **What it addressed:** the Team and Org families had never been rendered (IMP-09 covered only the standalone family). It found F-002.

### Durable Coverage Changes (round 1)

- `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`:
  - the proxy forwards WebSocket upgrades;
  - helpers for root events, summaries, live checks and commands;
  - new cases RC-31 … RC-37;
  - RC-20 audits the four new routes;
  - RC-06, RC-09 … RC-11, RC-22 and RC-23 count only message and start requests as "sent";
  - RC-35 passes `nodeId` to `addPeerNode`.
- `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` (new), with its script `test:e2e:remote-runs-in-tree` in `autobyteus-web/package.json`.

### Decision (round 1)

Fail. This goes to the code reviewer for failure-origin review:
- F-001, F-002 and F-003: preliminary Local Fix (Implementation Engineer);
- F-004: Unclear (Solution Designer).

After fixes, rerun the two-server E2E (whole suite) and the browser probe.
