# Implementation Handoff — remote-runs-in-tree (autobyteus-278)

Paths below are relative to the worktree, `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree`. The base is `origin/personal` `3b09fbe308`, the ticket's design is at `8dc717e39c`, and the implementation head is `1bdcff8ae2` (IR-002). No release.

## Upstream Artifact Package

- **Upstream review and handoff rule:** independent architecture review was selected (Large/High) and passed: ARCH-REV-002 on SR-005. Code Reviewer is next.
- **Requirements doc:** `tickets/in-progress/remote-runs-in-tree/requirements-doc.md`
- **Investigation notes:** `tickets/in-progress/remote-runs-in-tree/investigation-notes.md`
- **Solution revision record:** `tickets/in-progress/remote-runs-in-tree/solution-revision-record.md` (SR-005)
- **Design spec:** `tickets/in-progress/remote-runs-in-tree/design-spec.md`
- **Supplemental:** the UI/UX spec (normative; VIS-001…021, PA-801…809), `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md`; `follow-ups.md`.
- **Design review report:** `tickets/in-progress/remote-runs-in-tree/design-review-report.md`
- **Architecture review revision record:** `tickets/in-progress/remote-runs-in-tree/architecture-review-revision-record.md`
- **Triggering rework:** Code Reviewer `code-review-report.md` CRR-001, Local Fix F-001 (`code-review-revision-record.md`).

## Current Implementation Summary

- **Implementation cycle:** Rework.
- **Implementation revision record:** `tickets/in-progress/remote-runs-in-tree/implementation-revision-record.md`
- **Current implementation revision:** IR-002 (Local Fix for CRR-001 F-001; IR-001 is the baseline).
- **Related revisions:** SR-005; ARCH-REV-002; CRR-001; API-REV and DR: N/A.
- **Triggering finding IDs:** F-001.

A remote delegated run is a child of its delegator's root, like a local copy, and its facts come from its node.

- **A (the delegating node):**
  - Each root (standalone, Team, Org) owns one `RemoteRunObservation` over its `remoteTaskExecutions`. It fetches the runs' summaries per viewer and holds one observation stream per link while the root has viewers.
  - It turns B's frames into the root's own events.
  - It routes the owner's commands through `RemoteRunLinks.ownerCommand`.
  - The member-projection resolvers read a remote agent's stored conversation from its node.
- **B (the node that runs it):**
  - One inbound owner, `RemoteRunViewProvider`, answers only for runs the caller's delegation started (stored back-link check), and only about the paired agents.
  - It answers through each root kind's `PairedAgentAccess` behind `RemoteRootDirectory`.
- **The window:** remote rows, contexts and run views as the UI spec gives them, with one window registry (`useRemoteRunsStore`).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation spans:
  - a new server-to-server WebSocket and three new peer requests;
  - a peer's owner driving runs on this node, limited to runs that peer started;
  - shared stream contracts (three packages);
  - all three root kinds on both nodes;
  - the window's three tree families.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-801, DS-001 | Remote rows under the delegator with node, title, status and reachability | Views: `remote-task-execution-dto-projection.ts:36` → `agent-collaboration-view-projector.ts:52`, `team-execution-view-projector.ts:70`, `agent-org-execution-view-projector.ts:67`; the GraphQL views `agent-run-collaboration.ts`, `agent-org-run-service.ts`, `team-run-history.ts:103`. Summaries: `remote-run-observation.ts:87` (`viewerAttached`) → `PeerClient.runSummaries` (`peer-client.ts:176`) → B `remote-run-view-provider.ts:59`. Web: `agentRunCollaborationContext.ts:161`, `teamExecutionViewState.ts` (SUMMARY), `agentOrgExecutionContext.ts:261`; row `WorkspaceTransientExecutionRow.vue:79` | Implemented. Unit: `remote-run-observation.test.ts`, `remote-run-view-provider.test.ts`, the three web remote specs. Rendered (IMP-09). Stored views without a live stream have no summaries (FU-002) |
| REQ-802, DS-002 | The live view of an opened remote run | B `observe` (`remote-run-view-provider.ts:100`) → `StandalonePairedAgentAccess.observePairedAgents` (follows host to host via `onHostReady`) / `TeamPairedAgentAccess` (`team-paired-agent-access.ts:57`) → WS `remote.ts:43` → A `openPeerRunObservation` (`peer-run-observation-client.ts:31`) → `RemoteRunObservation` → `remote_agent_presentation` → `agent_presentation` (DTO projectors only: `agent-collaboration-view-projector.ts:76`, `agent-org-execution-view-projector.ts:90`; Team: `team-remote-event-projector.ts:24`) | Implemented. Seen live in IMP-09 step 4. N-402 pinned by `remote-child-output-projection.test.ts` |
| REQ-802, DS-003 | The stored conversation of a remote agent | `remoteChildOf` / `remoteMemberProjection` in `standalone-root-member-view-projection-service.ts:66`, `team-member-run-view-projection-service.ts:57`, `agent-org-member-run-view-projection-service.ts:70` → `agentProjection` → B projection services | Implemented (N-403). Web marks the run unreachable on failure |
| REQ-803, REQ-805, DEC-804, DS-004 | Owner message, interrupt and terminate | Root command routing: standalone `:369`, Team `:366`, Org `:403` → `executeRemoteChildCommand` (`remote-child-commands.ts:41`) → `RemoteRunLinks.ownerCommand` (`remote-run-links.ts:162`) → B `command` (`remote-run-view-provider.ts:85`) → `PairedAgentAccess.executeOwnerCommand`. A message is a user message with `remote_owner {node_id, node_name}` (`paired-agent-access.ts:30`); it restores an idle run. Stop: `stopRemoteChild` (`remote-child-commands.ts:55`; Team through its coordinator), called at standalone `:246`, Team `:226`, Org `:197` | Implemented. The in-process two-node case in `standalone-remote-delegation.test.ts` covers the message, live frame and Stop. IMP-09 steps 4 and 7 |
| REQ-804 | Errors are plain; the rest of the tree works | Failed summaries → `reachable:false` summary events; failed reads → `markReachable(false)`. Retry: `retryRemote` (`agentRunCollaborationStore.ts:133`, `agentOrgContextsStore.ts:150`), `registerTeamRemoteRuns` (`teamRemoteRunRegistry.ts:16`) → `REFRESH_REMOTE_TASK_EXECUTIONS` and/or a re-read; "Checking" always settles | Implemented. IMP-09 steps 8–10. `agentRunCollaborationRemoteRetry.spec.ts`, `teamRunContextHydrationService.spec.ts` |
| REQ-806 | Agent and Team runs; standalone, Team and Org delegators | All three roots share `RemoteRunObservation` and `remote-child-commands.ts`; the web shares `remoteChildren.ts` (`mergeByStartTime`) and `remoteAgentContext.ts`. Every family lists remote runs among the delegator's copies in delegation order: standalone `agentRunCollaborationContext.listTaskRows`, Org `agentOrgHistoryRows.ts`, Team `teamNavigationRowsWithRemote` (`teamRemoteExecutions.ts`; the members keep their place first) | Implemented. Only the standalone root was rendered (IMP-09); the Team and Org roots are covered by unit specs, including the Team order (`teamExecutionRemoteRuns.spec.ts`, IR-002) |
| REQ-807 | Docs | `collaboration_model.md` § 3/4/5, `remote_collaboration.md` § Remote runs in the run tree, web `agent_execution_architecture.md` § Remote Delegated Runs In The Tree | Done (`678e81a501`) |
| REQ-808 | Run-view affordances | Header chip, no ⚙/＋, notice: `AgentWorkspaceSurface.vue:27`. Text-only composer and placeholder: `AgentWorkspaceView.vue:70`, `AgentUserInputForm`, `useComposerTarget` (no mention scope). Panel notes: `RightSideTabs.vue:33`. "Delegated copies" lists local copies only by construction (`ExistingRunConfigEditor.vue` reads `taskExecutions` only) | Implemented. IMP-09 steps 3, 5, 6 |
| DS-005 | Viewer 0→1 / 1→0 | `viewerAttached` / `viewerDetached` from the three stream handlers (`agent-collaboration-stream-handler.ts:112`, `agent-team-stream-handler.ts:152`, `agent-org-stream-handler.ts:106`) | Implemented. `remote-run-observation.test.ts` |
| DS-006, AR-401 | B follows the run (host for an Agent, root for a Team) | B runs the stored-link check first (`RemoteRootDirectory.storedLinkCheck`, query kind `owner`, `remote-run-links.ts:49`, `admitsOwner` `:136`), then the managers' `PairedAgentAccess` behind `RemoteRootDirectory.pairedAgents` (`remote-message-receiver.ts:37`) | Implemented. `paired-agent-access.test.ts`, `remote-run-view-provider.test.ts` |
| N-401 | The stream's first frame is `{nodeId}` | `peer-run-observation-client.ts` requires the pinned node; anything else ends the stream | `peer-run-views-client.test.ts` |
| AR-402 | Frames `{agentRunId, message}` for paired agents only | B sends paired agents only; A maps each frame through the stored link and drops unknown IDs | `remote-run-observation.test.ts`, `paired-agent-access.test.ts` |
| AR-403 | Phase 1: no reconnect; an end A did not cause runs one summary fetch | `remote-run-observation.ts:135` (`onEnd`) | `remote-run-observation.test.ts` |
| N-404 | Tell the user about the REQ-803 clarification | — | Solution Designer's |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

**Contracts** (with `dist/` rebuilt):
- `autobyteus-agent-presentation-contracts/src/remote-task-execution-dtos.ts`;
- `autobyteus-collaboration-stream-contracts/src/{agent-run-collaboration-dtos,agent-org-execution-dtos,root-execution-view-dtos}.ts`;
- `autobyteus-team-stream-contracts/src/team-stream-{server,client}-message.ts`.

**Server, A side:**
- In `agent-collaboration/execution/remote/`:
  - `remote-run-channel.ts` (port);
  - `remote-run-links.ts`;
  - `remote-run-observation.ts` (new);
  - `remote-child-commands.ts` (new);
  - `paired-agent-access.ts` (new).
- The three roots: `standalone-agent-run-root.ts`, `root-team-run.ts`, `agent-org-run.ts`.
- Projectors and handlers in `services/agent-streaming/`, including `remote-task-execution-dto-projection.ts` and `team-remote-event-projector.ts` (both new).
- The three member-projection services.
- GraphQL `agent-run-collaboration.ts` and `team-run-history.ts`.

**Server, B side:**
- In `remote-collaboration/`:
  - `domain/remote-requests.ts`;
  - `channel/{peer-client,peer-gateway,peer-run-view-answers,peer-run-observation-client}.ts`;
  - `inbound/{remote-run-view-provider,remote-message-receiver}.ts`.
- `api/rest/remote.ts`;
- `compositions/remote-collaboration-composition.ts`;
- `standalone-agent-run-root/services/standalone-paired-agent-access.ts`;
- `agent-team-execution/services/team-paired-agent-access.ts`.

**Web:**
- `stores/remoteRunsStore.ts`;
- `services/remoteRuns/*`;
- `services/teamExecution/{teamRemoteExecutions,teamRemoteRunRegistry}.ts`;
- the standalone, Team and Org contexts, hydrations and stores;
- `components/workspace/remote/*` and `WorkspaceTransientExecutionRow.vue`;
- `AgentWorkspaceSurface.vue`, `AgentWorkspaceView.vue`, `RightSideTabs.vue`;
- `localization/messages/{en,zh-CN}/remoteRuns.ts`;
- `graphql/queries/runHistoryQueries.ts` with `generated/graphql.ts` (edited by hand for the new `remoteTaskExecutions` field; codegen needs a running server).

**Design deviations and refinements** (each stays within the design's intent):
1. `autobyteus-team-stream-contracts` changed as well: the Team root's stream is its own contract.
2. `ActiveCollaborationRootDirectory` is unchanged. The Team manager's existing lifecycle notifications (`subscribeToLifecycle`) fire at the same points, so `TeamPairedAgentAccess` follows the root through them.
3. Added `remote_task_execution_started` / `REMOTE_TASK_EXECUTION_STARTED`, so a new remote row appears live. The web reloads the view for an unknown run; the Team stream recovers.
4. The remote DTOs live in `agent-presentation-contracts`, shared by the two stream contract packages.
5. `RemoteInboundQuery` gained the kind `owner` for B's stored link check.
6. B lists only live paired-agent statuses (one not listed is offline) and leaves out runs the caller did not start.
7. B ends a run's observations when the run is terminated through it.
8. Remote commands run outside the root's operation gate, because a peer call can take up to 20 s.
9. `getTeamRunResumeConfig` gained `remoteTaskExecutions`, so a stopped Team lists its remote runs like its local copies (REQ-801/806).
10. `collaboration_model.md` § 3 said remote links are `taskExecutions` entries; they have been in `remoteTaskExecutions` since autobyteus-191. I corrected the text, a doc fix only.

## Important Assumptions

- Both nodes run the same release (DESIGN.md rule 9). A peer without the routes answers 404, which A reads as unreachable.
- A remote run's statuses are live statuses only; B does not wake a run to answer a summary.

## Known Risks

- RSK-801: one socket per observed run while A has viewers (design, phase 2 if it matters).
- A root without a live stream lists its remote rows without the node's title or status, and the rows read Offline (FU-002).
- `remoteChildOf` in the member-projection services reads the stored tree for every projection request, adding one tree read per member projection.
- I edited `generated/graphql.ts` by hand (three spots) for the new field; a later codegen run reproduces them.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: a feature crossing existing owners.
- Reviewed root-cause classification: Boundary Or Ownership Issue (by design until now).
- Reviewed refactor decision: `No Refactor Needed` (no broad refactor).
- Implementation matched the reviewed assessment: `Yes`. The policy lives once (`RemoteRunObservation`, `remote-child-commands.ts`, `RemoteRunViewProvider`); the roots delegate thinly.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the one omission (`ActiveCollaborationRootDirectory` listener) is deviation 2.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None. FU-003 records pre-existing spec type errors.
- Shared structures remain tight: `Yes`. Remote links are a separate list and DTO, not optional fields on local task executions.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`
  - No changed source file is over 500 effective lines. The largest are `root-team-run.ts` 498 (was 497), `teamExecutionViewState.ts` 497 (was 479), `standalone-agent-run-root.ts` 489 (was 472) and `agentOrgStreamingService.ts` 481.
  - No per-file delta is over 220; the largest is the new `remote-run-observation.ts` at 184.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`. No stored shape changed; titles, statuses and conversations are read from B.
- Direct-use evidence: N/A.
- Migration implementation: N/A.
- Deviation: `None`.

## Environment Or Dependency Notes

- The fresh worktree needed `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` and `nuxt prepare`.
- The untracked `autobyteus-application-*/dist/` folders come from that prebuild and are not part of the change.
- A's observation client uses Node's global `WebSocket` (Node 22+ / Electron 42).

## Checks Run

The server and contract checks ran on `1046c6beb4`; IR-002 changed only web files, so they still apply. The web checks ran on `1bdcff8ae2`. Evidence is in `tickets/in-progress/remote-runs-in-tree/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `1046c6beb4` | macOS, Node 22 | all server source | all | Pass | `IMP-01-server-typecheck.log` | `exit: 0` |
| IMP-02 | `pnpm -C <pkg> test` for the three contract packages | `1046c6beb4` | macOS, Node 22 | contract schemas | REQ-801, 802, 806 | Pass | `IMP-02-contract-tests.log` | `# pass 20`, `# pass 37`, `# pass 21`, `# fail 0` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` (full) | `1046c6beb4` | macOS, Node 22, test isolation | server | all | Pass | `IMP-03-server-unit-full.log` | `Tests  6538 passed \| 7 skipped (6545)`, `exit: 0` |
| IMP-04 | `test:integration:prepare` then `test:integration` | `1046c6beb4` | macOS, Node 22, test isolation | server in-process integration | all | Pass | `IMP-04-server-integration.log` | `Tests  421 passed \| 69 skipped (490)`, `exit: 0` |
| IMP-05 | `vitest run tests/unit/remote-collaboration` + Team projection + Team history resolver tests | `1046c6beb4` | macOS, Node 22 | B provider, A client and observation, owner commands, N-402, the two-node in-process case | DS-001…006, AR-401…403, N-401…403 | Pass | `IMP-05-server-focused-remote.log` | `Tests  163 passed (163)` |
| IMP-06 | `pnpm -C autobyteus-web test:nuxt --run` (full) | `1bdcff8ae2` | macOS, Node 22 | web | all | Pass | `IMP-06-web-full.log` | `Tests  4778 passed \| 5 skipped (4783)`, `exit: 0`. An earlier run had one 5 s timeout in `CollaborationMessageReferenceViewer.spec.ts` under load; that test is unrelated and passed alone (13/13) and in this rerun |
| IMP-07 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `1bdcff8ae2` | macOS, Node 22 | web boundaries, strings | REQ-808 | Pass | `IMP-07-web-guards.log` | three `exit: 0` |
| IMP-08 | the 9 remote web specs (store, Retry, three families, Team hydration, row, surface, right tabs) | `1bdcff8ae2` | macOS, Node 22 | the window side, including the Team order (F-001) | REQ-801…808 | Pass | `IMP-08-web-focused-remote.log` | `Tests  59 passed (59)` |
| IMP-09 | Rendered check on a test-owned two-node stack (alpha + beta built servers, scripted AGY CLI, Nuxt dev against alpha), standalone delegator | server `188dc4b3ae`, web `188dc4b3ae` + `6695820605` | macOS, temp data/HOME/ports, ~810–850 px | rows, run view, owner message, Stop, notes, unreachable, Retry | REQ-801…805, 808; VIS | Pass after one fix | `IMP-09-rendered-check.md`, `IMP-09-a…e-*.png`, `IMP-09-stack.mjs.txt` | the table's 10 steps; step 9 is the defect fixed in `6695820605` |

- **Web type check:** `npx vue-tsc --noEmit` shows no errors in the touched source files. The errors it reports are in spec files whose lines predate this ticket (FU-003).
- **Not run, and why:**
  - The two-server E2E extension and the browser probe (design change sequence step 5) are API/E2E's, as are the Team and Org delegator scenarios against real servers (PA-808).
  - IMP-09 was not repeated after `53c6624aea` (Retry plumbing, the Team stored view) or `1bdcff8ae2` (the Team order). Unit specs cover those changes (IMP-08).

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:**
  - the Workspaces tree rows of remote runs;
  - the opened remote run (header, notice, composer, conversation, live output);
  - the right-panel notes;
  - Stop and Retry.
- **Approved references:** UI/UX spec VIS-001…021, PA-801…809 (normative).
- **Design system and adjacent surfaces reviewed:** `WorkspaceTransientExecutionRow`, `DelegatedStopButton`, `AgentWorkspaceSurface`, `RightSideTabs`. The ported `RemoteNodeChip`, `RemoteRunNotice` and `RemoteRunPanelNote` match the UI reference.
- **Surface used:** TESTING.md's web preview with `BACKEND_NODE_BASE_URL` against a test-owned server, plus a peer server.
- **States inspected** (narrow layout, ~810–850 px):
  - rows offline and idle;
  - title and Task line;
  - a remote Team expanded, with members that carry no chip;
  - the run view with chip and no ⚙/＋;
  - the composer placeholder;
  - a live owner message and its reply;
  - the Files note;
  - Stop;
  - the unreachable row and notice;
  - Retry after the node returned.
- **Issues found and corrected:** after the node returned, Retry cleared the notice but left the conversation empty (`6695820605`). Review then found that "Checking" could stay on, and that a stopped Team had no remote rows (`53c6624aea`).
- **Limitations:**
  - The browser tool's screenshots sometimes lagged the DOM, so states were read from the DOM; screenshots are attached where they matched.
  - The Team and Org roots and the desktop wide layout were not rendered.
  - Keyboard focus order was not exercised interactively; the aria-labels and roles were read.

## Downstream Coverage Hints / Suggested Scenarios

- **Two-server cases** (extend `remote-delegation-two-server.e2e.test.ts`):
  - With the delegator's root view open, the summaries carry title and statuses, and an unknown run is left out.
  - A live frame arrives while viewing.
  - The projection of a remote agent and of a remote Team member is readable.
  - An owner message arrives as a user message with `remote_owner` metadata and its answer shows; then interrupt, then terminate (the observation ends and the final summary shows the run offline).
  - A stopped peer: the row shows "Couldn't reach", Retry recovers, and the rest of the tree works.
  - Repeat for a Team and an Org delegator (PA-808), and with a Team target.
- **Browser probe:**
  - against the VIS references;
  - a Team delegator's remote run between two local copies keeps delegation order (F-001);
  - a stopped Team root listing its remote runs (the new resume-config field);
  - Retry from a row with nothing selected, without a stream.
- **Security:** a peer that did not start the run gets `REMOTE_TARGET_NOT_PERMITTED` on all four routes, and naming an unpaired agent is refused.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The two-server E2E extension and the browser probe (design step 5), as above.
- The real-runtime behavior of an owner message restoring an idle remote run (seen in IMP-09 with the scripted CLI).
