# Implementation Handoff — standalone-run-messages-565 (autobyteus-565)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High) and passed: ARCH-REV-002 on SR-004.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/requirements-doc.md` (Approved, SR-002; DEC-002 correction SR-004)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/design-spec.md` (SR-004)
- Supplemental task artifacts: None.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/design-review-report.md` (the reviewer's round-2 edits are uncommitted in the worktree; I left them untouched)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/architecture-review-revision-record.md` (uncommitted, the reviewer's)
- Triggering rework report, revision record, or evidence: N/A (initial implementation).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`, `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001` (Fail, AR-001 … AR-005), `ARCH-REV-002` (Pass)
- Related code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: N/A
- Code commits on `codex/standalone-run-messages-565` (base `origin/personal` `a728fbcad3`):
  - `56e39312b0`: step 1 pins (Team/Org and non-host stored outcomes, written and passing before any change);
  - `ffec4d785d`: the implementation (119 files, 61 of them source), with tests, docs and the rebuilt contracts `dist/`;
  - `143edb93f8`: the Team participant read's integration test, on the new page shape and the process reader.
  Ticket documents and evidence are in the commit after those.

What it does: a standalone agent run (a person's or a task agent's) offers Messages on the desktop (right-panel tab "Messages") and the phone (⋮ menu). It lists every message its own agent sent or received: its task agents and teams (open or closed Task), other runs on this node, and runs on other nodes. The list is newest first, 50 at a time with "Load more", and live messages appear without a reload. Server side, one rule decides what a view shows, live and stored (`MessageViewScope`). Each publishing commit hands the feed one publication with the message's `relation` and its two parties. A line of an unrelated or cross-node message records the other agent (`counterpart: {address, nodeId}`). Cross-node requests carry the sender's address and answers carry the receiver's. A paged reader (`ParticipantMessagesReader`, `CounterpartIdentities`) answers `collaborationParticipantMessages(…, before)`. Team and Org Messages show the same rows as before, paged.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 61 source files across the subsystems the design names: the message engine and its publishing commits, the feed and view rule, the three root kinds, remote collaboration (wire fields on two requests and their answers), run history (reader, identities), the contracts package, and the web store, view contract, desktop and phone. No escalation trigger fired:
  - no migration;
  - no new peer route;
  - Team/Org rows unchanged (step-1 pins green);
  - nothing hosts or wakes anything new.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Implementation choices that differ from the spec's wording are listed under Deviations, each with its reason.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Phone: Messages in the ⋮ menu (DEC-001) | `MobileRunTargetView.vue` `showMessages = 'collaborationMessages' in target` → `MobileRunMenu`; `MobileMessages.vue` (chip, Load more); `agentRunCollaborationStore.runMessagesView` without the gate → `activeContextStore` target | `MobileRunScreen.spec` table: standalone with a view → Messages, application-owned (no view) → none; `MobileViews.spec` new case |
| BEH-002 | Desktop: a "Messages" tab for standalone runs (DEC-001, DEC-003) | `useRightSideTabs.ts` label `shell.rightTabs.messages` for `rootKind: 'agent'`; scope key `standalone:<rootRunId>`; default Activity for standalone | `useRightSideTabs.spec`, `…contextualDefault.spec` new cases |
| BEH-003 | Stored read includes unrelated and cross-node messages for the run's own agent | GraphQL `collaborationParticipantMessages` → `ParticipantMessagesReader.read` → `runRecordsOfRootOwners` + `openRunsBelow` → `MessageViewScope.participantFilter` (`isOwnAgentList`) → page → `CounterpartIdentities.of` | Reproduction case (host m2/m3 now listed) fails when the own-list rule is switched off (mutation, IMP-08); Team/Org pins unchanged |
| BEH-004 | Unrelated and cross-node messages reach the run's own view live | `deliver` (same_run) / receiver's `acceptFromRun` (related, unrelated) / `commitSentToRemote`, `acceptFromRemote` (remote) → `port.publishMessage(MessagePublication)` → `RunMessagesFeed.publish` → `MessageViewScope.inView` per open stream → `standaloneRootMessageEvent({message, parties})` → web `AgentRunCollaborationContext.applyEvent` → `store.append(…, parties)` | `run-messages-feed.test`, `root-communication-engine-publication.test`, `remote-message-view-sequence.test` (Agent root shows all four, Org root local only), `running-agents-messaging.test` (PRB-002, AC-006 now publish once per message) |
| BEH-005 | Cross-node counterpart's node and address recorded from now on (DEC-002) | `remote-endpoint.transmission(message, senderAddress)` → `PeerClient.deliverMessage` (`sender.address`; strict `receiverAddress`) → `PeerGateway` (`senderRef`) → `RemoteMessageReceiver` (`answerOf` `receiverAddress`) → engine `acceptFromRemote` / `commitSentToRemote` write `counterpart`; `message-log.ts encodeLine` | `standalone-remote-delegation.test` checks both logs' records; `message-log.test` new cases; `peer-client/gateway/receiver` tests |
| BEH-006 | Paging, newest first, Load more; no message lost or doubled (DEC-004) | Server: `participantMessageOrder`, cursor strictly after, `hasMore`. Web: store `loadMore` (one at a time; dropped on a root reload), `mergeById`, `cursor`, `moreStatus`; panel and phone "Load more" | Reader paging case (120 messages, ties across the boundary, cursor inside a tie); store cases (live during loadMore, failure and retry, reload drops an answer in flight) |
| REQ-006 | Team/Org Messages unchanged | Team/Org events carry no parties; non-own lists drop unnamed rows as before; scope keeps base's rule for them | Step-1 pins (`56e39312b0`) green after the change; store case "any other list … ignores parties" |
| REQ-007 / AC-006 (older lines) | Older linked line: name and node from the Task entry; older unlinked: run ID, no chip | `CounterpartIdentities` precedence: past → line record → linked Task entry → `run_metadata.json` → run ID | Reader identity cases |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New (server):
  - `src/agent-collaboration/delegation/message-view-scope.ts`;
  - `src/agent-collaboration/execution/communication/message-publication.ts` (the publication and party types; AR-008-style addition to the design's file list);
  - `src/run-history/services/participant-messages-reader.ts`, `counterpart-identities.ts`;
  - `src/run-history/services/run-records-source.ts`: the records owners per root kind, moved unchanged out of the GraphQL type (AR-008-style addition).
- Removed: `src/services/agent-streaming/public-message-scope.ts` (`isPublicMessage`, dead after the scope).
- Engine and publishing:
  - `execution/communication/root-communication-engine.ts`, `root-communication-port.ts`, `collaboration-communication-message.ts` (+ `counterpart`, `messageFields`) and `…-schema.ts`;
  - `delegation/run-messages-feed.ts`, `run-view-stream.ts`;
  - `communication/cross-run-message-delivery.ts`, `cross-run-accept-input.ts`;
  - the three ports and the three roots' `commitSentToRun`;
  - event constructors (`standalone-root-event.ts`, `team-run-event.ts`, `agent-org-run-event.ts`);
  - projectors (`agent-collaboration-view-projector.ts`, `agent-org-execution-view-projector.ts`).
- Remote: `execution/remote/{remote-endpoint,remote-message-send,remote-run-channel,remote-run-links}.ts`, `task-delegation.ts`, the three root message deliveries, `remote-collaboration/{domain/remote-requests,channel/peer-gateway,channel/peer-client,inbound/remote-message-receiver}.ts`.
- Composition: `compositions/collaboration-composition.ts`: the scope on TaskSide; step 8 creates the reader and sets the process reader.
- GraphQL: `api/graphql/types/collaboration-participant-messages.ts` (`before` argument). Web generated types regenerated (`codegen:local`).
- Contracts: `autobyteus-collaboration-stream-contracts/src/{collaboration-participant-messages-dtos,agent-run-collaboration-dtos}.ts` and `dist/`.
- Web:
  - `services/collaborationMessages/{collaborationParticipantMessages,participantMessagesQuery,participantMessageRows,participantMessagesStatusText}.ts`;
  - `types/workspace/collaborationMessagesContextView.ts`;
  - `services/agentCollaboration/agentRunCollaborationContext.ts`;
  - `stores/agentRunCollaborationStore.ts`;
  - `composables/useRightSideTabs.ts`;
  - `components/workspace/collaboration/{CollaborationMessagesPanel,CollaborationMessagesSection}.vue`;
  - `components/mobile/views/MobileMessages.vue`, `components/mobile/runScreen/MobileRunTargetView.vue`;
  - localization en and zh-CN (`shell.ts`, `workspace.ts`);
  - `test-support/participantMessagesStub.ts`, which now pages like the server.
- Test helper: `tests/helpers/view-streams.ts`: `testViewStreams` passes a real `MessageViewScope`; `messageFeedInto(stream, event, view)` applies `inView`.
- Docs:
  - `docs/design/collaboration_model.md` (CM-9, CM-13 and their status rows);
  - `docs/modules/agent_communication.md` (entry-form table, publications, the unrelated path);
  - `docs/modules/remote_collaboration.md` (address fields, counterpart record);
  - web `docs/chat.md` (Messages), `agent_execution_architecture.md`, `agent_artifacts.md`.
- Migration implementation: N/A (`Directly Usable — No Migration`).

## Important Assumptions

- A standalone run's own agent is the run (`rootRunId === agentRunId`); "own list" means exactly that, on the server (`MessageViewScope.isOwnAgentList`) and the web (`isOwnAgentList(key)`).
- A task agent run is an Agent root, so its own view now shows its unrelated and remote messages too (design-review-report residual note). Under its delegator it is selected with its own key (`delegatedRunMessagesKey`). Documented in CM-13.
- Peers run the same release (DESIGN.md rule 9): `sender.address` is required on the wire, and an answer without `receiverAddress` is a malformed answer.

## Deviations From The Design Spec's Wording (Principle notes)

1. **Parties are carried by the Agent root's event only, and used only for the own list.** The design says the stream event carries `parties` and `append(message, parties)` names unknown counterparts. Team/Org events keep their shape (`team-stream-contracts` unchanged). In the web store, live names from parties live apart from the server's counterparts (`liveCounterparts`) and are used only for an own list. Reason (the reviewer's REQ-006 watch item): naming a live row in a Team/Org list from parties could show a row a reload hides, for example a coordinator ↔ delegator message. Keeping live names apart also keeps `reloadNamingUnknown` asking the server when a tree agent leaves (so it becomes `past`, not `run`).
2. **Process reader.** The resolver calls `getParticipantMessagesReader()`, set by the composition root (`setProcessParticipantMessagesReader`) like the run managers' process bindings. It is not built in the GraphQL type: the reader needs the tree, the scope and `peerName` the composition root owns. If the reviewer prefers the Studio API services container (`configureStudioApplicationApiServices`), that is a small move.
3. **`isPublicMessage` file removed** (`public-message-scope.ts`), not only the read filter's lines: after the scope nothing used it.
4. **`agentAddress` on `AgentOperationResult`.** The engine's accepted result names the receiving agent's address, so `CrossRunMessageDelivery` can record the receiver on the sender's line and `RemoteMessageReceiver` can answer `receiverAddress`. CrossRun strips it from what it returns to the router.
5. **`moreStatus()` on the view contract**, beside `hasMore()`/`loadMore()`: the button needs its loading state, and a failed page needs its reason (DESIGN.md rule 7).
6. **An own list shows a row nothing names by its run ID** (`kind: 'run', address: null`). Other lists keep dropping unnamed rows (REQ-006).
7. **Desktop detail header has no node chip.** The render check showed the chip, which never shrinks, crowding out the label and name in a narrow detail pane. The chip is on the row; the participant details have a "Node" line.
8. **Tab scope key.** `standalone:<rootRunId>` for every `rootKind: 'agent'` target, so selecting a run it delegated keeps the chosen tab. The default stays Activity for a standalone run, as the design says. Note: a run with delegated runs used to open on its Team tab and now opens on Activity.
9. **Phone ⋮ Messages for every target with a messages view**, so task agents too (`agent_run_task_agent`, `agent_org_task_agent`), as the desktop tab already did. This follows the design's removal row ("target has `collaborationMessages`").

## Known Risks

- Two-node behavior over HTTP is unverified until the two-server E2E runs (UNK-001). In process, both directions are covered with the real PeerClient/Gateway/Receiver (only `fetch` replaced).
- A peer of an older release breaks cross-node messaging both ways: its requests lack `sender.address` (400) and its answers lack `receiverAddress` (malformed). Accepted by DESIGN.md rule 9 (one release); the design's rejection log says so.
- Paging changes what Team/Org lists hold at first: 50 rows, with older rows behind "Load more". The rows themselves are unchanged.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: one rule replaces three copies (`inViewOf`, the read filter, `isPublicMessage`), and a relation replaces a per-caller boolean.
- Implementation matched the reviewed assessment: `Yes`
- Shared structures (`MessagePublication`, `MessageParty`, `MessageCounterpart`) have one owner each; `messageFields` keeps the views' message to its seven fields.
- `root-communication-engine.ts` is 407 non-empty lines, `peer-client.ts` 429, both under the 500 hard limit.

## Legacy / Compatibility Removal Check

- `publishToViews`: removed (engine, CrossRun accept input, delivery).
- `RunMessagesFeed.inViewOf`: removed.
- The read's filter lines and `isPublicMessage`: removed.
- `pastParticipants` (DTO, store, stub): replaced by `counterparts` (`kind: 'past'`).
- `hasDelegatedRuns` gate and getter: removed (unused).
- `MEMBER_KINDS` (phone): removed.
- No dual path, no version check.

## Persisted Data Transition Check (When Applicable)

- New optional line field `counterpart: {address: string | null, nodeId: string | null}`, written only on unrelated and remote lines. Existing lines are unchanged and read as before (`message-log.test`: a line without it reads as before; a malformed record names its file and line).
- The released reader ignores unknown keys (design § Persisted Data, Case 14). Decision: `Directly Usable — No Migration`, as reviewed.

## Environment Or Dependency Notes

- Ran `pnpm -C autobyteus-server-ts prepare:source`, `nuxt prepare` (web), `pnpm -C autobyteus-server-ts test:integration:prepare`. They left untracked `dist/` folders (application SDKs, devkit, brief-studio); not committed.
- On this machine `fs.watch` delivers no events (a `/tmp` probe saw 0 events). Two consequences:
  - the folder-watcher tests time out (FU-002);
  - a Nuxt dev server does not see edits; I restarted it after each edit for the render check.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/tickets/in-progress/standalone-run-messages-565/evidence/`. All on macOS 26 (Darwin 25.5.0), Node 22.23.1.

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `143edb93f8` | server `src` and tests | all | Pass | `server-typecheck.log` | `[typecheck] PASS`; `production errors: 0`; tests at baseline 1006 |
| IMP-02 | `pnpm -C autobyteus-web typecheck` (then `node ./scripts/typecheck.mjs` after the last test-type fix) | `ffec4d785d` (web unchanged after) | web, electron, cross-package tests | all | Pass | `web-typecheck.log` | `[typecheck] PASS`; tests at baseline 87 |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | working tree before `ffec4d785d` (later edits: peer-gateway test, five view-stream fixtures, remote tests; all rerun in IMP-05) | whole server unit suite | all | 10 failures, each explained | `server-unit-full.log` | `Tests 10 failed \| 8519 passed`. Causes: peer-gateway ×2 (answer now has `receiverAddress`; fixed, IMP-05); tracked-imports (new files not yet added; passes in IMP-05); web-generated-graphql (codegen not rerun; regenerated, passes in IMP-05); message-log migration ×1 (5,153 ms against 5 s under load; passes alone, IMP-05); folder-watcher ×5 (no file events on this machine, FU-002) |
| IMP-04 | `NUXT_TEST=true vitest run` (web, whole) | working tree before the two render fixes (rerun in IMP-06) | whole web unit suite | all | 1 failure, base | `web-unit-full.log` | `Tests 1 failed \| 5860 passed`; `ServerSettingsBasicsPanel.spec:51` fails on the base (FU-001) |
| IMP-05 | `vitest run` remote-collaboration, agent-collaboration, api, standalone-agent-run-root, agent-team-execution, agent-org-execution, services, run-history, tracked-imports, web-generated-graphql, append-only-message-logs-v1 | `ffec4d785d` | every changed server area and the three tests that failed in IMP-03 | BEH-003 … BEH-006, REQ-006, AC-002 … AC-006 (unit level) | Pass | `server-changed-areas.log` | `Tests 1944 passed (1944)` |
| IMP-06 | `NUXT_TEST=true vitest run` collaboration components, mobile, collaborationMessages, agentCollaboration, the two run stores, the two tab specs | `ffec4d785d` | every changed web area | BEH-001, BEH-002, BEH-004, BEH-006, REQ-006 | Pass | `web-changed-areas.log` | `Tests 257 passed (257)` |
| IMP-07 | `pnpm -C autobyteus-collaboration-stream-contracts test` | `ffec4d785d` | DTOs, cursor, counterparts, the Agent event's parties | REQ-003, REQ-005 | Pass | `contracts-test.log` | `# pass 39`, `# fail 0` |
| IMP-08 | Mutation: `MessageViewScope` own-list and unrelated/remote rules forced off, the scope/reader/feed/remote tests run, the file restored (diff empty) | `ffec4d785d` | the one rule, live and stored | BEH-003, BEH-004 | The mutation fails 11 tests, the reproduction among them | `mutation-scope-off.log` | `Tests 11 failed \| 167 passed` |
| IMP-09 | `vitest run tests/integration/api/team-communication-api.integration.test.ts` (after `test:integration:prepare`) | `143edb93f8` | GraphQL read through the composed process reader, Team root | REQ-006 | Pass | `integration-team-communication-api.log` | `Tests 4 passed (4)` |
| IMP-10 | Measurement: first page of a 2,500-message own list, and the read of a 2,500-message log from disk (unit cases, 3 runs) | `ffec4d785d` | reader + identities; `MessageLog.read` | AC-004 (payload measured) | First page 5.5–9.3 ms (50 rows, 40 named); log read 10.8 ms | test output `[autobyteus-565 measure]` lines; recorded here | The page is 50 rows whatever the log's size (the PM's 5.4 MB answer is now one page of 50) |
| IMP-11 | Localization: `pnpm guard:localization-boundary`, `pnpm audit:localization-literals` (web) | `ffec4d785d` | new strings en, zh-CN | — | Pass | — | `Passed`, `zero unresolved findings` |

- Step 1 of the Change Sequence (pins before any change) is `56e39312b0`. Its two Team/non-host pins passed on the base and pass after the change.
- Not run, and why: the server E2E suite and the two-server E2E (UNK-001) are API/E2E's (built servers). The whole `test:integration` was not run either; only IMP-09, the one integration test that reads participant messages.

## Frontend Rendered-Result Check (When Applicable)

- Setup: a temporary fixture page (not committed) rendered the production `CollaborationMessagesSection`/`CollaborationMessagesPanel` at the right panel's 420 px and the production `MobileMessages` at 390 px. Its view was an own-list view with a remote agent (chip), a local other run, a delegated agent, a past agent and an unnamed older run. It was served by a backend-less Nuxt dev server and driven in headless Chrome. The only console errors were the app shell's sockets to the absent backend; no page errors.
- States: more, loading, error, done, empty. Screenshots and DOM facts are in `evidence/render-ir-001-after-fix/` (`render-facts.json`, `render-script.mjs`).
- Asserted:
  - six rows, newest first, on both;
  - a chip `ryan-ai-linux` ("Runs on ryan-ai-linux") on the two remote rows only;
  - "Load more" present with older messages, "Loading…" and disabled while loading, the reason shown on failure with the button still enabled, absent when done;
  - "No messages yet" when empty;
  - two clicks reach `loadMore`;
  - the participant details show the address, run and node for the remote agent, and only the run ID for the unnamed one;
  - no horizontal overflow.
- Found and fixed (before → after: `render-ir-001-before-fix/` → `render-ir-001-after-fix/`):
  - the phone's name line did not take the free width, so with a chip the name collapsed;
  - the desktop detail header's chip crowded out the label and name (Deviation 7).
  The before shots also show a fixture artifact (the phone frame squeezed to 185 px by the page's own flex row), fixed in the fixture.

## Downstream Coverage Hints / Suggested Scenarios

- Two servers (A, B) paired (UNK-001):
  - a PM on A messages B's PM with `node` and B's PM replies. Each PM's Messages shows both rows live, then after a reload, with "project task manager" and a chip naming the other node as that node calls it.
  - Both logs' lines carry `counterpart {address, nodeId}`.
  - A linked delegation (A delegates to B): the delegator's Messages names the remote run's agent with the chip.
  - An older unlinked line, without a record, shows its run ID and no chip.
- One node:
  - two PMs message each other (PRB-002): both Messages show both, live and stored; neither Team/Org view nor any ancestor run's view shows them.
  - A task agent's own Messages shows its messages with an unrelated run.
  - A run with no delegated runs has the Messages tab (default Activity) and the phone entry; an application-owned run has neither.
- Paging: a run with more than 50 messages; "Load more" brings the next 50; a live message during "Load more" appears once; a Team member with more than 50 rows keeps its rows.
- Fresh-start build: applies (TESTING.md § Fresh-start build). The contracts package (`src/`, `dist/`) and `autobyteus-web/generated/graphql.ts` changed.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Existing E2E and probe code that encodes the old wire or page shape and needs API/E2E's update:
- `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`:
  - request bodies without `sender.address`, now refused 400 by the gateway: `:855`, `:1141` (expected body), `:1219`, `:1642`, `:1660` (the malformed case may still be meant to be malformed);
  - `:1360-1363`: the stored read's type still says `pastParticipants`, and a list now holds at most 50.
- `autobyteus-server-ts/tests/e2e/node-access/node-access-model.e2e.test.ts:182`: a `messages` body without `sender.address`.
- `autobyteus-server-ts/tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts:203`, `:286`: `tab.pastParticipants` is now `counterparts` with `kind: "past"`.
- `autobyteus-server-ts/tests/e2e/helpers/built-studio-roots.ts:171`: the read's type (`pastParticipants`).
- Web probes reading `collaborationParticipantMessages(...).messages` as the whole list (now the newest 50):
  - `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs:221`, `:445` (`hubMessageCount` counts `messages.length`);
  - `large-runs-load-less-cases.mjs:60`, `:396`;
  - `cross-scope-agent-mentions-live-probe.mjs:268`.
