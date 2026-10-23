# Implementation Handoff — remote-runs-in-tree (autobyteus-278)

Paths below are relative to the worktree, `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree`. The base is `origin/personal` `3b09fbe308`, the ticket's design is at `bd70ada7bb` (SR-008, ARCH-REV-005), and the implementation head is `580e1cac5b` (IR-005). No release.

## Upstream Artifact Package

- **Upstream review and handoff rule:** independent architecture review was selected (Large/High) and passed: ARCH-REV-002 on SR-005, ARCH-REV-003 on the SR-006 delta, and ARCH-REV-005 on the SR-008 delta (the window Retry rule, FU-004 pulled in by the user). Code Reviewer is next (Targeted Delta Review of IR-005, CRR-006 F-006).
- **Requirements doc:** `tickets/in-progress/remote-runs-in-tree/requirements-doc.md`
- **Investigation notes:** `tickets/in-progress/remote-runs-in-tree/investigation-notes.md`
- **Solution revision record:** `tickets/in-progress/remote-runs-in-tree/solution-revision-record.md` (SR-008)
- **Design spec:** `tickets/in-progress/remote-runs-in-tree/design-spec.md`
- **Supplemental:** the UI/UX spec (normative; VIS-001…021, PA-801…809), `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md`; `follow-ups.md`.
- **Design review report:** `tickets/in-progress/remote-runs-in-tree/design-review-report.md`
- **Architecture review revision record:** `tickets/in-progress/remote-runs-in-tree/architecture-review-revision-record.md`
- **Triggering rework:** Code Reviewer CRR-006 (failure origin of API/E2E API-REV-002 F-005), Local Fix F-006. Earlier: SR-008 / ARCH-REV-005 (IR-004), CRR-003 F-002 … F-005 (IR-003), CRR-001 F-001 (IR-002).

## Current Implementation Summary

- **Implementation cycle:** Rework.
- **Implementation revision record:** `tickets/in-progress/remote-runs-in-tree/implementation-revision-record.md`
- **Current implementation revision:** IR-005 (CRR-006 F-006; IR-004 the window Retry rule, SR-008; IR-003 CRR-003 F-002 … F-005; IR-002 CRR-001 F-001; IR-001 is the baseline).
- **Related revisions:** SR-008; ARCH-REV-005; CRR-006; API-REV-002; DR: N/A.
- **Triggering finding IDs:** F-006 (CRR-006).

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
| REQ-803, REQ-805, DEC-804, DS-004 | Owner message, interrupt and terminate | Root command routing: standalone `:369`, Team `:366`, Org `:403` → `executeRemoteChildCommand` (`remote-child-commands.ts:41`) → `RemoteRunLinks.ownerCommand` (`remote-run-links.ts:162`) → B `command` (`remote-run-view-provider.ts:85`) → `PairedAgentAccess.executeOwnerCommand`. A message is a user message whose content is the owner's text under the heading `From the owner of node "<name>":` and a blank line (DS-004a; `remoteOwnerUserMessage`, `paired-agent-access.ts:37`, its one owner); `message_id` and `dedupe_key` pass through unchanged (N-405), and no other metadata is added. It restores an idle run. Stop: `stopRemoteChild` (`remote-child-commands.ts:55`; Team through its coordinator), called at standalone `:246`, Team `:226`, Org `:197` | Implemented. The in-process two-node case in `standalone-remote-delegation.test.ts` covers the message (with the heading and the unchanged IDs), live frame and Stop. `paired-agent-access.test.ts` pins the heading. IMP-09 steps 4 and 7 (before the heading) |
| REQ-804 | Errors are plain; the rest of the tree works | Failed summaries → `reachable:false` summary events; failed reads → `markReachable(false)`. Retry (SR-008): one rule, `remoteRunsStore.retry` (`stores/remoteRunsStore.ts:83`). It refreshes on the root's stream, reads the run's selected agent or else its first agent not loaded (no fallback when the selected agent is loaded: N-407, the pseudocode), and settles at once when neither asks anything. The families' `RemoteRunRetryAdapter`s: standalone `remoteRetryAdapter` (`agentRunCollaborationStore.ts`), Org `remoteRetryAdapter` (`agentOrgContextsStore.ts`; `AgentOrgExecutionContext.isRemoteAgentLoaded`, marked by `hydrateRemoteOrgMember`), Team `teamRemoteRetryAdapter` (`teamRemoteRunRegistry.ts`). The three copies are removed | Implemented. F-006 (IR-005): a remote Team member is focused and committed first and read lazily through `readRemoteTeamMember` (`teamRemoteRunRegistry.ts`, also the Team adapter's `rereadAgent`), in the Team open (`teamRunOpenCoordinator.ts`; `selectInitialAgentRunId` accepts a remote member), the mounted inspection (`teamMemberInspectionCoordinator.ts`) and the focused reconcile (`runHistoryTeamMemberInspectionActions.ts`); its read failure is only `markReachable(false)`, never a Team inspection error (`teamRemoteMemberOpen.spec.ts`). IMP-09 steps 8–10 (before SR-008). `remoteRunsStore.spec.ts` (the rule: refreshed or not, selected loaded or not, no unloaded agent, nothing started), `agentRunCollaborationRemoteRetry.spec.ts` (standalone), `agentOrgRemoteRetry.spec.ts` (Org), `teamRemoteRunRegistry.spec.ts` (Team), `teamRunContextHydrationService.spec.ts` |
| REQ-806 | Agent and Team runs; standalone, Team and Org delegators | All three roots share `RemoteRunObservation` and `remote-child-commands.ts`; the web shares `remoteChildren.ts` (`mergeByStartTime`) and `remoteAgentContext.ts`. Every family lists remote runs among the delegator's copies in delegation order: standalone `agentRunCollaborationContext.listTaskRows`, Org `agentOrgHistoryRows.ts`, Team `teamNavigationRowsWithRemote` (`teamRemoteExecutions.ts`; the members keep their place first) | Implemented. Only the standalone root was rendered (IMP-09); the Team and Org roots are covered by unit specs, including the Team order (`teamExecutionRemoteRuns.spec.ts`, IR-002) |
| REQ-807 | Docs | `collaboration_model.md` § 3/4/5, `remote_collaboration.md` § Remote runs in the run tree, web `agent_execution_architecture.md` § Remote Delegated Runs In The Tree | Done (`678e81a501`) |
| REQ-808, REQ-806 | Run-view affordances, every family | One owner, `useRemoteRunView` (`composables/remoteRuns/useRemoteRunView.ts`): the header chip, no ⚙/＋, the notice with Retry and the composer placeholder, used by both surfaces the families render, `AgentWorkspaceSurface.vue` (standalone; Org Agents) and `TeamWorkspaceSurface.vue` (Team members; Org Team members). Text-only composer: `AgentUserInputForm`, `useComposerTarget` (no mention scope), keyed on the run, so in every family. Panel notes: `RightSideTabs.vue:33`. "Delegated copies" lists local copies only by construction (`ExistingRunConfigEditor.vue` reads `taskExecutions` only) | Implemented (F-003). `RemoteRunViewAffordances.spec.ts`: 4 families × (chip, ⚙/＋, placeholder, notice + Retry). IMP-09 steps 3, 5, 6 (standalone) |
| DS-005 | Viewer 0→1 / 1→0 | `viewerAttached` / `viewerDetached` from the three stream handlers (`agent-collaboration-stream-handler.ts:112`, `agent-team-stream-handler.ts:152`, `agent-org-stream-handler.ts:106`) | Implemented. `remote-run-observation.test.ts` |
| DS-006, AR-401 | B follows the run (host for an Agent, root for a Team) across idle shutdown, and ends the stream when the run is stopped, terminated or deleted by any path | B runs the stored-link check first (`RemoteRootDirectory.storedLinkCheck`, query kind `owner`, `remote-run-links.ts:49`, `admitsOwner` `:136`), then the managers' `PairedAgentAccess` behind `RemoteRootDirectory.pairedAgents` (`remote-message-receiver.ts:37`). End (F-004): `observePairedAgents(runId, onPresentation, onEnded)`. Standalone: `StandaloneAgentRunRootManager.onRunEnded`, reported by `stopRoot` / `endRoot` after the host stopped (B's window and GraphQL terminate, history delete/archive, owner-command terminate); idle shutdown only replaces the host. Team: the lifecycle snapshot's `ending` (`team-run-lifecycle.ts`), set from the root's termination (`root-team-run.ts` `runTermination`: a quiet termination is `idle_shutdown`, any other `stopped`). The provider closes the sink on `onEnded` (`remote-run-view-provider.ts` `observe`); its terminate-only path is removed | Implemented. `paired-agent-access.test.ts` (end by any path, not idle, both kinds), `standalone-agent-run-root.test.ts` (end after the host stopped, Stop and delete), `agent-team-run-manager-lifecycle.test.ts` and the integration `agent-team-run-manager.integration.test.ts` (a real root's terminate is `stopped`), `team-remote-delegation.test.ts` (a real idle shutdown keeps the observation), `remote-run-view-provider.test.ts` |
| N-401 | The stream's first frame is `{nodeId}` | A: `peer-run-observation-client.ts` requires the pinned node; anything else ends the stream. B (F-002): the route `api/rest/remote.ts` holds frames the run produces while it is being subscribed until it has sent `{nodeId}`, then sends them in order | `peer-run-views-client.test.ts`; `tests/unit/api/rest/remote-run-observations-route.test.ts` through the real Fastify WebSocket route with A's real client and a live run that emits at once (fails without the fix) |
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
7. (Superseded by F-004, IR-003.) B ends a run's observations when the run is stopped, terminated or deleted by any path, reported by the root kinds behind `PairedAgentAccess` (DS-006), not only after an owner-command terminate.
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
  - No changed source file is over 500 effective lines. The largest are `root-team-run.ts` 499 (was 497; IR-003 added the `TeamRunEnding` import), `teamExecutionViewState.ts` 497 (was 479), `standalone-agent-run-root.ts` 489 (was 472) and `agentOrgStreamingService.ts` 481.
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

IR-004 and IR-005 changed web files only, so the server checks from IR-003 still apply: `a0fa3f2fb0` for IMP-01/03 (the only later server change, `e37ad88b98`, is one integration test, which IMP-04 ran) and `e37ad88b98` for IMP-04/05. The web checks ran on `580e1cac5b`. The contract packages are unchanged since `1046c6beb4` (IMP-02). Evidence is in `tickets/in-progress/remote-runs-in-tree/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `a0fa3f2fb0` | macOS, Node 22 | all server source | all | Pass | `IMP-01-server-typecheck.log` | `exit: 0` |
| IMP-02 | `pnpm -C <pkg> test` for the three contract packages | `1046c6beb4` | macOS, Node 22 | contract schemas | REQ-801, 802, 806 | Pass | `IMP-02-contract-tests.log` | `# pass 20`, `# pass 37`, `# pass 21`, `# fail 0` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` (full) | `a0fa3f2fb0` | macOS, Node 22, test isolation | server | all | Pass | `IMP-03-server-unit-full.log` | `Tests  6543 passed \| 7 skipped (6550)`, `exit: 0` |
| IMP-04 | `test:integration:prepare` then `test:integration` | `e37ad88b98` | macOS, Node 22, test isolation | server in-process integration | all | Pass | `IMP-04-server-integration.log` | `Tests  421 passed \| 69 skipped (490)`, `exit: 0` |
| IMP-05 | `vitest run tests/unit/remote-collaboration` + the observation route + Team lifecycle + standalone root + Team projection + Team history resolver tests | `e37ad88b98` | macOS, Node 22 | B provider and route, A client and observation, owner commands and heading, run end, N-402, the two-node in-process cases | DS-001…006, DS-004a, AR-401…403, N-401…405 | Pass | `IMP-05-server-focused-remote.log` | `Tests  194 passed (194)` |
| IMP-06 | `pnpm -C autobyteus-web test:nuxt --run` (full) | `580e1cac5b` | macOS, Node 22 | web | all | Pass | `IMP-06-web-full.log` | `Tests  4800 passed \| 5 skipped (4805)`, `exit: 0` |
| IMP-07 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `580e1cac5b` | macOS, Node 22 | web boundaries, strings | REQ-808 | Pass | `IMP-07-web-guards.log` | three `exit: 0` |
| IMP-08 | the 15 remote web specs (the store and its Retry rule, the three families' Retry adapters, the Team remote member open (F-006), the Team open coordinator, three families, Team hydration, row, surface, per-family affordances, right tabs, the owner-message echo) | `580e1cac5b` | macOS, Node 22 | the window side, including the Team order (F-001), every family's run view (F-003), the Retry rule (SR-008), N-405 and the Team remote member open (F-006) | REQ-801…808 | Pass | `IMP-08-web-focused-remote.log` | `Tests  99 passed (99)` |
| IMP-09 | Rendered check on a test-owned two-node stack (alpha + beta built servers, scripted AGY CLI, Nuxt dev against alpha), standalone delegator | server `188dc4b3ae`, web `188dc4b3ae` + `6695820605` | macOS, temp data/HOME/ports, ~810–850 px | rows, run view, owner message, Stop, notes, unreachable, Retry | REQ-801…805, 808; VIS | Pass after one fix | `IMP-09-rendered-check.md`, `IMP-09-a…e-*.png`, `IMP-09-stack.mjs.txt` | the table's 10 steps; step 9 is the defect fixed in `6695820605` |

- **Web type check:** `npx vue-tsc --noEmit` shows no errors in the touched source files. The errors it reports are in spec files whose lines predate this ticket (FU-003).
- **Not run, and why:**
  - The two-server E2E extension and the browser probe (design change sequence step 5) are API/E2E's, as are the Team and Org delegator scenarios against real servers (PA-808).
  - IMP-09 was not repeated after `53c6624aea` (Retry plumbing, the Team stored view), `1bdcff8ae2` (the Team order) IR-003 (the heading, the opening frame, the run end, the per-family view) IR-004 (the Retry rule) or IR-005 (the Team remote member open). Unit specs and the route test cover those changes (IMP-05, IMP-08); API/E2E reruns the two-server E2E and the browser probe.

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
  - An owner message arrives as a user message whose content starts with `From the owner of node "<alpha's name on beta>":`, then a blank line and the text (AC-803, DS-004a), and its answer shows. **RC-31 needs updating:** its exact `content: "status? Marker OWNER-FROM-ALPHA"` now includes the heading, and its `remote_owner` file scan is obsolete (the metadata is removed). N-405: alpha's view of the remote run shows exactly one user message, carrying the heading (the echo is replaced by `message_id` / `dedupe_key`).
  - F-002: a remote Agent that is live when alpha's view opens streams to alpha (its first frame no longer precedes `{nodeId}`).
  - F-004: beta's own window stop (and GraphQL terminate, and history delete) of an observed remote run ends alpha's stream; alpha reads the final summary (offline). An idle shutdown does not end it.
  - Interrupt, then terminate (the observation ends and the final summary shows the run offline).
  - A stopped peer: the row shows "Couldn't reach", Retry recovers, and the rest of the tree works.
  - Repeat for a Team and an Org delegator (PA-808), and with a Team target.
- **Browser probe:**
  - against the VIS references;
  - a Team delegator's remote run between two local copies keeps delegation order (F-001);
  - the Team and Org families' remote run views: chip, no ⚙/＋, the notice, the placeholder, no attachments and no `@` (F-003);
  - a stopped Team root listing its remote runs (the new resume-config field);
  - Retry (SR-008), per family: on a live stream with nothing selected the first unloaded agent is read too; a loaded selected agent is not re-read and, without a stream, Retry settles at once; a Team prefers its focused member;
  - N-405: alpha's view of the remote run shows exactly one user message after an owner message, carrying the heading (the window half is unit-tested in `memberInputMessageHandler.spec.ts`).
- **Security:** a peer that did not start the run gets `REMOTE_TARGET_NOT_PERMITTED` on all four routes, and naming an unpaired agent is refused.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The two-server E2E extension and the browser probe (design step 5), as above.
- The real-runtime behavior of an owner message restoring an idle remote run (seen in IMP-09 with the scripted CLI).
