# Implementation Handoff — list-running-agents (autobyteus-492)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High) and passed: ARCH-REV-003 on SR-007, ARCH-REV-004 on the SR-008 delta (SR-009 corrects AR-008's wording only).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/requirements-doc.md` (Approved; SR-008 adds DEC-014 and REQ-011's run-view sentence)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/design-spec.md` (SR-009)
- Supplemental task artifacts: None.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/design-review-report.md` (the reviewer's round-4 edits are uncommitted in the worktree; I left them untouched)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/architecture-review-revision-record.md` (uncommitted, the reviewer's)
- Triggering rework report, revision record, or evidence: N/A (initial implementation).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002: CRR-001 Local Fixes CR-001, CR-002)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-007`, `SR-008`, `SR-009`
- Related architecture-review revision IDs: `ARCH-REV-003`, `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001` (Fail: CR-001, CR-002), `CRR-002` (Pass on IR-002; `code-review-report.md`, `code-review-revision-record.md`)
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: CR-001, CR-002 (IR-002)
- Code commit: `deacacf948` on `codex/list-running-agents` (base `origin/personal` `bd2053ee51`); IR-002 Local Fix `5f89ecbdf5` (the 461 contract model's row 13, two comments). Ticket documents and evidence: the commits after each.

What it does: `send_message_to(target_agent_run_id)` reaches any running agent of this node (a different Task is no longer refused); with the new `node` field it reaches any running agent of a paired peer (`POST /rest/remote/run-messages`, a one-message `unlinked_run` endpoint). A message no Task relates reaches only a running agent, in its active root, never woken, and stays out of run views (G-1). Task-related wake, reopen and the closed-Task refusal are unchanged; `closedPeerRunRefusal` refuses a fenced peer run with and without `node`. `RunningAgents` is the one "running" owner (from each root's own live statuses). The opt-in `list_running_agents` lists the running Agent and Team runs a person started, here or on a peer (`POST /rest/remote/running-agents`, read strictly), on every runtime.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 56 source files over the subsystems the design names (collaboration, communication, the three root kinds, remote collaboration, tools/MCP, compositions), two new peer routes, a changed tool contract and the collaboration model (CM-13). No escalation trigger fired: no root kind needed a restore to answer "running", nothing new is stored, both peer requests go through `PeerGateway`, and Task wake/reopen/closure are untouched.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (implementation choices that differ from the spec's wording are listed under Deviations, each with its reason).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-002 | `list_running_agents` (DS-001, DS-002) | `list-running-agents-contract.ts` → `RunningAgentsListing.list({caller, filters})` (`running/running-agents-listing.ts`) → `RunningAgents.liveRoots/statusesOf` + `RunOwnAgentsReader.listingFactsOf` + node catalog addresses + `readRunProjectContext`; with `node`: `PeerDiscoveryChannel.listRunningAgents` → `PeerNodeDiscovery` → `PeerClient.runningAgents` → B's `PeerGateway.listRunningAgents` → listing (no caller) → strict reader `peer-running-agents-answer.ts` → `onNode` | Entry shape per REQ-002/DEC-013 (`running/running-agent-entry.ts`); AC-001…AC-004 covered by unit and in-process tests |
| BEH-003 | Any running agent of this node by run ID (DS-003) | `GlobalAgentRunMessageRouter` → `CrossRunMessageDelivery.route` → `admit` returns `unrelated` → `deliverUnrelated`: `RunningAgents.rootOf` → `activeReceiverRoot` (`CollaborationRootResolver.resolveActive`) → prepare/accept(`publishToViews: false`)/commit | PRB-002 turned green with real standalone roots (`running-agents-messaging.test.ts`); a mutation that disables the branch fails it |
| BEH-004 | Any running agent of a paired node with `node` (DS-004 … DS-006) | Router `deliverToPeer`: `findPeer` → `closedPeerRunRefusal` → root `deliverToPeerRun` → `RemoteMessageSend.sendToPeerRun` (linked & paired, else `unlinkedRunEndpoint`) → engine → `PeerClient.deliverMessage(run_message)` → `/rest/remote/run-messages` → `RemoteMessageReceiver.acceptRunMessage` → `RunningAgents.rootOf` → root `acceptPeerRunMessage` → `engine.acceptFromRemote` | Send and reply both ways in process, both nodes' logs, header names the node |
| BEH-005 | Wake, reopen, CLOSED preserved; unrelated stopped run not woken (DEC-003); fenced peer run refused here with and without `node` (DEC-011) | `admit` unchanged for related/reopened/closed; `closedPeerRunRefusal` called by the router's `node` path and by `route`'s peer-run branch | Existing R-1…R-8 tests unchanged and green; rows 13 tested both ways |
| BEH-006 | Team-run-ID refusal, also from a peer | Local: router step unchanged (text moved to `targetIsTeamRunText`); peer: `acceptRunMessage` → `RunningAgents.teamCoordinatorOf` (team's own root); A words it with `node` (`remote-refusals.ts`) | Residual-risk note of ARCH-REV-003 applied: the peer text tells the agent to keep `node` |
| BEH-007 | A message waits for the receiver's turn | Same reservation path (`commitReserved`) for every new path | In-process test asserts the reservation committed |
| BEH-008 | `delegate_task` unchanged | Not touched | — |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New: `src/agent-collaboration/running/{running-agents,running-agents-listing,running-agent-entry}.ts`; `src/agent-tools/agent-discovery/list-running-agents-{contract,tool}.ts`; `src/agent-tools/mcp/providers/list-running-agents-mcp-adapter-provider.ts`; `src/remote-collaboration/channel/peer-running-agents-answer.ts`; `src/compositions/running-agents-composition.ts`.
- Message rule: `communication/cross-run-message-delivery.ts`, `cross-run-accept-input.ts` (`publishToViews`), `execution/communication/root-communication-engine.ts`, `agent-communication/services/global-agent-run-message-router.ts`, the send_message_to parser/contract/schema/dispatcher, `domain/agent-team-collaboration-llm-contract.ts` (texts).
- Remote: `execution/remote/{remote-endpoint,remote-message-send,remote-run-channel,remote-run-links,remote-refusal-codes,peer-discovery-channel}.ts`; the three roots and their message deliveries; `remote-collaboration/{channel/peer-gateway,channel/peer-client,inbound/remote-message-receiver,discovery/peer-node-discovery,domain/remote-requests,domain/remote-refusals,remote-collaboration-services}.ts`; `api/rest/remote.ts`.
- `src/compositions/collaboration-root-resolver.ts` — **Modify: `resolveActive(root)`** (active root of each kind, never restores); its `standaloneRoots` dependency gains `getActive` (AR-008).
- Compositions: `collaboration-composition.ts`, `remote-collaboration-composition.ts`, `build-studio-server.ts`, `standalone-application-host/start-standalone-application-host.ts`.
- Tool exposure: `runtime-agent-tool-exposure.ts`, `agent-tool-mcp-session-registry.ts`, `claude-session-tooling-options.ts`, `autobyteus-agent-tool-resolver.ts`, `register-agent-discovery-tools.ts`, `default-agent-tool-mcp-adapter-providers.ts`, the Work Journal converter.
- Docs: `docs/design/collaboration_model.md` (§1 terms, CM-5/CM-11 wording, new CM-13, §4, §5), `docs/modules/{agent_communication,agent_tools,remote_collaboration}.md`. `projects.md` and `node_access_model.md` hold no statement the change makes false (node access covers `/rest/remote/*` as a prefix), so they are unchanged.
- Contract fixture: `tests/fixtures/collaboration-contract/contract-states.json`, regenerated from the 461 model after updating it to CM-13 (`tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/{model.py,stories.py}`): U9 (R-7) is now delivered, S27's not-running text is the new one, U10/U11 carry U9's message on disk.

## Important Assumptions

- "Running" = a live status other than `offline` in the root's own `pairedAgentStatuses` (Team: dormant members report `offline`; `initializing` counts as running, as DEC-009 says for `state`).
- A deleted Agent definition still listed: its `name` is the definition ID (the run's file keeps only the ID). A Team's name is the `teamDefinitionName` its own tree recorded.
- An application-bound Team run a person started is listed like any Team run (the requirements name no exclusion; application-owned Agent runs never become collaboration roots).

## Deviations From The Design Spec's Wording (Principle notes)

1. **Where `RunningAgents` and the listing are created.** The spec says `collaboration-composition.ts`. Remote collaboration is composed *before* `composeCollaboration` (`build-studio-server.ts:303-316`), and its receiver and gateway need the same instances. So `compositions/running-agents-composition.ts` creates both once, right after the run services, and the studio host passes the result to both compositions (the application host to `composeCollaboration` only). One instance each; creation order visible in the host.
2. **A process binding for the listing (Principle 16).** The spec lists "Process-wide lookups added: None". The tool definitions and MCP adapter providers are created without a composition (as `list_available_agents` with `node` reaches `PeerDiscoveryChannel` through `findProcessPeerDiscoveryChannel`), so `list_running_agents` without `node` reaches the listing through `getProcessRunningAgentsListing()`. The three conditions hold: `composeCollaboration` binds it (`bindProcessRunningAgentsListing`) before any run starts and releases it with the rest; a missing binding throws ("list_running_agents is not available: …"), never falls back; it hides no cycle (the listing depends on nothing tool-side). The test passes its listing explicitly (`listRunningAgentsFor(…, { listing })`).
3. **Listing depends on `RunningAgents` alone.** DS-001 reads `liveRoots` from the directory and statuses from `RunningAgents`; I gave `RunningAgents` a `liveRoots()` so the listing has one boundary for "what runs" (Principle 3), not the directory plus its combiner.
4. **Router collaborators.** The router takes `crossRun` (`route`, `closedPeerRunRefusal`), `coordinators` and `channel`; it does not need `runningAgents` (the "not running" answer follows from the cross-run route returning `null`).
5. **Receiver shapes.** `RemoteMessageReceiver` takes `running` (`rootOf`, `teamCoordinatorOf`) as a fourth constructor argument; `RemoteRootDirectory` gains `liveRoot(root)` (the resolver's `resolveActive`); the inbound root type is a new `RemotePeerRunRoot` (`acceptPeerRunMessage`) instead of widening `RemoteMessageRoot`, so existing linked-message doubles are unaffected.
6. **Endpoint typing.** `RemoteEndpoint = LinkedRemoteEndpoint | UnlinkedRunEndpoint`; `RemoteRunLinks` returns only `LinkedRemoteEndpoint`, which encodes "never stored" in the types; the roots' `assertPeerEntryOpen` readers compile unchanged.
7. **Removal plan, `allowsSender`.** Kept: it has a reader, the endpoint choice in `RemoteMessageSend.choose` (paired → link, else unlinked). Removed: `refusals`, `pairRefusals`, `REMOTE_ROOT_REFUSAL_TEXT.notPermitted`, `ownershipChain` (every builder and the type), `OTHER_TASK_REFUSAL`, the CONFLICT throw, R-9, CONFLICT in the engine's message refusal check (now `code === "TASK_AGENT_RESOURCE_CLOSED"`).
8. **In-gate re-check on Team and Org roots** (`acceptPeerRunMessage`) uses each delivery's existing `isLiveAgent`; the standalone root checks its host's live run. The outer check is `RunningAgents.rootOf`; the race between them is MP-003 (not supported), as the design records.
9. **Texts in the wording authority.** `targetAgentNotRunningText`, `targetIsTeamRunText`, `SEND_MESSAGE_TO_NODE_*` live in `agent-team-collaboration-llm-contract.ts`; `remoteTargetNotRunning` (B's text) beside the codes; A's wording in `remote-refusals.ts`. The result catalogue test withdraws M-06, updates M-11 and adds M-46 … M-50.
10. **The 461 contract model** in a done ticket's evidence folder is edited (it is the fixture's generator and authority; `--check` passes). If the team prefers the model to move out of the done ticket, that is a follow-up, not done here.
11. The collaboration prompt sections (`collaboration-prompt-sections.ts`) are unchanged (not in the design's change scope); the tool descriptions carry the new guidance.

## Known Risks

- Two-node behavior over real HTTP is unverified until the two-server E2E runs (UNK-001); the in-process test uses the real client, gateway and receiver with only `fetch` replaced.
- `workspace` sends this node's local path to a paired peer (DEC-013, founder's request); the strict reader accepts it.
- The gated contract-story E2E step U9 now expects delivery to `image_maker_44a1`; a delegated run that idle-shuts-down before U9 would be refused not running. Its timing is API/E2E's to confirm.
- E2E assertions that encode the old rule (see "still required" below) will fail until API/E2E updates them.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (with a new tool)
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes` (the CONFLICT branch, R-9 and the outbound pair refusal are replaced, not wrapped)
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: deviations above are wiring and typing choices inside the design's owners.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (item 7 above)
- Dead code found elsewhere, added to `follow-ups.md`: None (FU-001 … FU-003 are test-timing defects, not dead code)
- Shared structures remain tight: `Yes` (entry is a `kind` union; `RunAcceptInput.publishToViews` is one boolean with one meaning)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: Principle 16, item 2 (process binding with the three conditions).
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest after the change: `root-team-run.ts` 454 non-empty lines (+10), `peer-client.ts` 424 (+24); largest delta `cross-run-message-delivery.ts` (+83/−28).
- Notes: the server typecheck baseline shrank (1012 → 1009 test-file errors); `typecheck-baseline.json` updated by `typecheck:update-baseline`.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes` (messages use the existing `CollaborationCommunicationMessage` log shape; the list reads run files read-only)
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: None

## Environment Or Dependency Notes

- The worktree had no `node_modules`; I ran `pnpm install --frozen-lockfile` (no lockfile change). The typecheck builds left untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`; not committed.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/evidence/`

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `deacacf948` (TypeScript identical; run just before the commit) | macOS 26 (Darwin 25.5.0), Node 22.23.1 | server `src` and tests | all | Pass | `IMP-01-server-typecheck.log` | `[typecheck] PASS`; `production errors: 0` |
| IMP-02 | `pnpm -C autobyteus-web typecheck` | same | same | web, cross-package tests compiling server `src` | all | Pass | `IMP-02-web-typecheck.log` | `[typecheck] PASS` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | same (later edits: contract fixture JSON, the 461 model, docs; no unit test reads them) | same | whole server unit suite | all | Pass for the change (6 failures, none in changed code) | `IMP-03-server-unit-suite.log` | `Tests  6 failed \| 8382 passed`: 4 folder-watcher timeouts (FU-001), 1 `ENOTEMPTY` cleanup (FU-002), 1 tracked-imports (new files untracked before the commit; passes after it, IMP-07) |
| IMP-04 | `vitest run` tracked-imports + every changed area (`agent-collaboration`, `agent-communication`, `remote-collaboration`, `agent-tools`, the three roots, `restart-resume`, `services/agent-streaming`, `agent-execution/shared`, `standalone-application-host`, `api/rest`) | `deacacf948` | same | the changed owners and their callers | BEH-002 … BEH-007, AC-001 … AC-008 (unit level) | Pass (first run 237/237 files; a second run hit only IMP-07's timeout) | `IMP-04-changed-areas-unit.log` | `Tests  1 failed \| 1759 passed` (the timed-out wrapper) |
| IMP-05 | `python3 -I …/export_contract_states.py <461 model> …/contract-states.json --check` | `deacacf948` | Python 3 | contract fixture vs. the updated model | REQ-008, REQ-010 (U9, S27) | Pass | `IMP-05-contract-fixture-check.log` | `contract-states.json matches the model` |
| IMP-06 | `vitest run tests/unit/remote-collaboration/running-agents-messaging.test.ts` | `deacacf948` | same | real standalone roots, router, CrossRun, RunningAgents, listing, PeerClient/Gateway/Receiver (only `fetch` replaced) | PRB-002/AC-005, AC-006, AC-004, AC-001, AC-007, rows 8/9, G-1 | Pass | `IMP-06-in-process-scenarios.log` | `Tests  6 passed (6)` |
| IMP-05 (IR-002 rerun) | the same `--check` against the fixed model | `5f89ecbdf5` | Python 3 | contract fixture vs. the model after CR-001 | REQ-011, AC-008 row 13 | Pass (fixture unchanged) | `IMP-05-contract-fixture-check.log` (IR-001 run); output identical | `contract-states.json matches the model` |
| IMP-08 | `python3 -I evidence/IMP-08-row13-probe.py <461 model> S18`, then `S19` | `5f89ecbdf5` | Python 3 | the model's cross-node admission (CR-001) | REQ-011, AC-008 row 13, DEC-011 | Pass | `IMP-08-row13-probe.log`, `IMP-08-row13-probe.py` | after S19 all four senders of A `REFUSED TASK_AGENT_RESOURCE_CLOSED`; after S18 all `DELIVERED` |
| IMP-09 | `vitest run tests/unit/agent-collaboration/execution/communication` | `5f89ecbdf5` | macOS, Node 22.23.1 | the engine and append files whose comments changed | — | Pass | — (comment-only change) | `Tests  23 passed (23)` |
| IMP-07 | `python3 scripts/check_repository_artifact_hygiene.py --only tracked-imports`; the vitest wrapper | `deacacf948` | same | new files tracked | — | Checker Pass; wrapper times out (FU-003) | `IMP-07-tracked-imports.log` | `Tracked-import check passed. Tracked files scanned: 98533` |

Also done, not as a separate row: a mutation check (the unrelated branch's `rootOf` forced to `null`) made IMP-06's PRB-002 case fail, then the code was restored (diff empty).

- Not run, and why: `test:integration` and the server E2E suite (`pnpm test:e2e`), which TESTING.md requires for a tool-exposure change, are API/E2E's; the two-server E2E (UNK-001) and the gated contract-story E2E need built servers and the AGY scripted runtime. Before the change could be shown failing as a server test (PRB-002), its failure on the base is the live probe PRB-002 and the base's own tests asserting CONFLICT (router R-9 test, cross-run R-7 test), which this change rewrote.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: server-side agent tools and messaging; no rendered frontend changes.

## Downstream Coverage Hints / Suggested Scenarios

- Two servers (A, B) paired: AC-004 (`list_running_agents(node)` lists B's PM with `node`; switch off / unknown / unreachable refusals), AC-006 (send with `node`, reply with `node` from the header; both nodes' logs), row 8 (stopped on B: `REMOTE_TARGET_NOT_RUNNING`, B not woken), row 11 (team run ID on B: `TARGET_IS_TEAM_RUN` with "send to its coordinator with node"), QR-003 (unsigned `run-messages` / `running-agents` refused at the gate), AC-008 remote part (rows 13 and 14: a fenced run on B refused CLOSED from any root of A with and without `node`; delivered from B or a third node while it runs), DS-006 (a teammate of the delegator messaging the delegated run: goes unlinked, delivered while running).
- One node: PRB-002 on the real app (two PM roots), an Org agent and a task agent as senders (row 3), a Team member as target (statuses offline vs running), `list_running_agents` filters and the Team entry's `team_coordinator_agent_run_id` / `workspace`.
- Run views (G-1): an unrelated message appears in neither run's Team tab, live and after reload; a related message still does.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Existing E2E assertions that encode the old rule and need API/E2E's update:
  - `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`: `:158` `liveOnlyRefusal` (old not-running text); `:1098` and `:1376` expect the removed outbound text "That run is on another node and is not linked with you …" (now an unlinked delivery while running, DS-006). `:1181`, `:1794`, `:1813` assert `REMOTE_TARGET_NOT_PERMITTED` at the linked `/messages` gateway, which still holds; confirm.
  - `tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts`: `:248-260` (CPW-R2 expects "You can't message this agent: it works on a different Task.") and `:313` (old not-running text).
  - `tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` U9 now expects delivery (fixture regenerated); check idle-shutdown timing at that step.
- The whole `test:integration` and `pnpm test:e2e` per TESTING.md (tool exposure changed), and the search of gated suites for exact tool lists: I found only opt-in references to `list_peer_nodes` (`available-agent-runtimes-live-agents.e2e.test.ts`, the two-server suite); no exact list includes every discovery tool.
