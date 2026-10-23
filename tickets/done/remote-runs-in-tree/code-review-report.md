# Code Review Report — remote-runs-in-tree (autobyteus-278)






## Round 7 — Targeted Delta Review of F-006 (CRR-007, authoritative)

- Review Entry Point: `Implementation Review`, round 7, `Targeted Delta Review`
- Trigger: implementation engineer, IR-005 (the Local Fix for CRR-006 F-006)
- Range: `2f4cb74bbe..59d63920ed` (code `580e1cac5b`). Web only.
- Review Scope Evidence: the Team open and inspection paths only:
  - `teamRunContextHydrationService.ts` (`selectInitialAgentRunId`);
  - `teamRunOpenCoordinator.ts` (`openTeamRun`, `reopenTeamRunAfterStreamLoss`);
  - `teamMemberInspectionCoordinator.ts`;
  - `runHistoryTeamMemberInspectionActions.ts` (the focused reconcile);
  - `teamRemoteRunRegistry.ts` (`readRemoteTeamMember`);
  - the new spec and the web doc.

### Verification

| Point | Evidence | Result |
| --- | --- | --- |
| A remote member never gates a commit | Mounted Team: `inspectMountedTeamMember` skips the pre-read for a remote member, commits, then calls `readRemoteTeamMember`. Unmounted: `selectInitialAgentRunId` accepts a remote member. Hydration fetches only the tree's own agents (`collectAgentExecutionLocations`), so nothing remote is read before the commit, and `openTeamRun` no longer requires a projection for a remote focus. Stream-recovery reopen: the read happens after the commit | Pass |
| One error owner | A remote read's failure only marks reachability (in the projection service). The focused reconcile reads lazily and clears its attempt without `setTeamMemberInspectionError`. `inspectMountedTeamMember` no longer rejects for a remote member | Pass |
| One lazy read | `readRemoteTeamMember` is used by all four paths and by the Team Retry adapter's `rereadAgent` (SR-008 kept) | Pass |
| Local members unchanged | Every new branch is guarded by "is remote"; local members load before focus as before | Pass |
| Tests | `teamRemoteMemberOpen.spec.ts` drives the real hydration, coordinators and store actions (only GraphQL is a fixture): an unmounted open with the node down commits and shows the notice, then Retry loads; a mounted selection commits with no inspection error, and the reconcile neither. Both fail on the old paths with the probe's errors (per IR-005) | Pass |
| Size | The touched files are well under 500 | Pass |
| Checks (IR-005) | Web 4800 passed, guards, focused 99, vue-tsc clean in the touched files; the server is unchanged | Relied on |

Note (not a finding): "is this a remote member" is read from two sources, `remoteRunsStore.runOfAgentRun` on the mounted paths and the candidate's `remoteTaskExecutions` on the open paths, because the registry is filled at commit. Both come from the same view DTO. A view-level `isRemoteAgentRun` on the Team view would give it one owner; it can wait for FU-006's split of the Team view state.

### Round 7 Result

- Review Decision: `Pass`. F-006 is resolved; no new findings.
- Score Summary: 9.5/10 (unchanged from CRR-005).
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`, to rerun the browser probe (RTP-06/07 for all four families; the E2E only if the server changes). Informational notice to the implementation engineer.

## Round 6 — API/E2E Failure-Origin Review of API-REV-002 F-005 (CRR-006; superseded by round 7)

- Review Entry Point: `API/E2E Failure-Origin Review`
- Trigger: API-REV-002 (the CRR-005 rerun) Fail, 91%, finding F-005. Everything else passed:
  - E2E run 4: 37/37 (RC-31 live and heading, RC-32 B's own Stop, RC-36 AC-805);
  - probe runs 19–20: RTP-01 … 06 for all four families, and RTP-07 for Standalone, Org Agent and Org Team.
- Code under test: `f60f962d9d`. API/E2E commit `2f4cb74bbe`.
- Failing scenario: RTP-07, Team family. Beta is stopped; the user opens the Team run, then clicks the remote publisher row. The UI spec's row state is "Open (shows the notice)" (AC-804, REQ-808).
- Evidence:
  - `evidence/api-e2e/API-02-run19/`, `API-02-run20/remote-runs-in-tree-probe.json` (RTP-07 `noticeRetry["team (remote Agent)"]`, `browserErrors`);
  - `RTP-07-2-beta-down.png`;
  - the console: `Failed to open team member run: Error: Node "beta-node" could not be reached (fetch failed)`.
- Supported scenario basis: a normal user action (open a remote member while its node is down), the explicit edge SCN-803 (REQ-804), and the UI spec's open-row state. It is the same in the other families.

### Cause (source)

- `stores/runHistorySelectionActions.ts` `openTeamMemberRunFromHistory` → `services/runOpen/teamRunOpenCoordinator.ts` `openTeamRun` → `hydrateLiveTeamRunContext` loads the Team context with the focused member's projection. It commits (`commitTeamRunHydration`, `onCommitted`) only when `projectionByAgentRunId.get(focusedAgentRunId)` is present ("did not load its exact focused AgentRun").
- For a remote member, that read goes to its node (`teamMemberProjectionHydrationService.ts`: the remote read sets `markReachable(false)` and rethrows). An unreachable node therefore fails the whole open: the selection never commits, the window stays on the previous run, and no notice shows.
- The catch in `openTeamMemberRunFromHistory` then sets `setTeamMemberInspectionError`. The row ends up with a second error ("Couldn't load activity. Retry") beside the remote one: two owners of one failure.
- The standalone and Org families commit the selection first and read a remote child afterwards (`ensureChildHydrated` / `readRemoteMember`). Their failure sets only the remote run's reachability, which `useRemoteRunView` shows as the notice with Retry (SR-008's rule).

### Classification

| ID | API/E2E ID | Origin | Classification / Owner | Required Action |
| --- | --- | --- | --- | --- |
| F-006 | F-005 (Medium) | Implementation: the Team family's open path keeps its "focused member must load before commit" rule for a remote member, unlike the other two families. The design already names the owners this must follow: the remote run's reachability is `remoteRunsStore`'s, shown by `useRemoteRunView`'s notice; the re-read is SR-008's Retry rule with the Team adapter. No requirement or design change is needed | `Local Fix` / implementation | In the Team open path, a remote member's conversation must not gate the commit. Commit the Team view and focus on the remote member, then read its projection lazily, as the other families do (the Team adapter's `rereadAgent`, or the existing `ensureAuthoritativeTeamMemberProjection`). A failure sets only `markReachable(false)` and never `setTeamMemberInspectionError` (one error owner). Local members keep today's rule. Add specs: opening a remote member with the node down commits the selection, shows the notice and no inspection error; Retry then loads it. API/E2E reruns the probe (RTP-06/07 for all four families) |

### Review Gap

- Detectable in round 1: I read the Team member hydration change (`markReachable(false)`, then rethrow) but did not follow the throw to its caller, the Team open coordinator, whose commit depends on that read. This is the same lesson as CRR-003: trace each family's user-visible path, and follow a value or an error to its edge.

### Round 6 Result

- Review Decision: `Fail`, Local Fix (implementation).
- Recommended Recipient: `/software_engineering_team/implementation_engineer`.
- After the fix: a Targeted Delta Review, then API/E2E reruns the probe (and the E2E only if the server changes). The proportional test-code review follows a pass. It will cover the probe (Org Team family, the `@` control, RTP-06 per family, RTP-07, the tree helper) and the E2E's WebSocket proxy forwarding and `sentRequests` counts.

## Round 5 — Targeted Delta Review of FU-004 pulled in (CRR-005; superseded by round 6)

- Review Entry Point: `Implementation Review`, round 5, `Targeted Delta Review`
- Trigger: implementation engineer, IR-004 (the SR-008 window Retry rule; FU-004, pulled into this ticket by the user). ARCH-REV-005 Pass.
- Range: `bd70ada7bb..13280c1e62` (code `f60f962d9d`, docs `2aeccdd850`).
- Review Scope Evidence: web only. The code touches:
  - `remoteRunsStore.ts` (the rule);
  - the three families' adapters (`agentRunCollaborationStore.ts`, `agentOrgContextsStore.ts`, `teamRemoteRunRegistry.ts`);
  - the Org context's loaded set and its one writer (`hydrateRemoteOrgMember`);
  - specs and a test-support adapter.

  No server, contract or other shared shape changed.

### Verification

| Point | Evidence | Result |
| --- | --- | --- |
| One owner of the rule (Principle 13; design-examples Case 6) | `remoteRunsStore.retry` carries the SR-008 pseudocode line for line: checking, then `refreshOnStream`, then selected-or-first-unloaded target, then `rereadAgent`, then settle when neither asked. The three per-family copies are gone (no `retryRemote` / `retryTeamRemoteRun` left in the web source) | Pass |
| Adapters supply only mechanisms | Each family supplies only its own mechanisms. **Standalone:** its stream, `selection`, `isChildHydrated`, `ensureChildHydrated`. **Org:** its stream, the selected agent execution, the new `isRemoteAgentLoaded`, `readRemoteMember`. **Team:** `refreshTeamRemote`, `getFocusedAgentRunId`, `isTeamMemberProjectionAuthoritative`, `ensureAuthoritativeTeamMemberProjection`. Each `rereadAgent` returns `false` for a loaded agent, as the design requires | Pass |
| "Loaded" agrees with each reader's failure path | A failed read leaves the agent unloaded in every family: standalone hydration is not recorded, the Org `markRemoteAgentLoaded` runs only after a committed projection, and the Team projection is not authoritative. So a Retry after an unreachable read always reads it again. The Org loaded set lives on the context instance; a republished candidate starts empty, matching its fresh remote contexts. The set's only reader is the adapter (no mark without a reader; Case 3) | Pass |
| Behavior changes are the designed ones (N-407) | Standalone and Org read the first unloaded agent after a successful refresh; Team prefers the selected member. Both are stated in the SR-008 section | Pass |
| Tests | Shared rule: 5 cases (`remoteRunsStore.spec.ts`). Per family: standalone (extended), Org (new), Team (new). N-405 echo replacement (`memberInputMessageHandler.spec.ts`). The stream-only test adapter is used only by specs about rows and views | Pass |
| Size | All touched source files are well under 500 | Pass |
| Checks (IR-004) | Web 4798 passed, guards, focused 84, vue-tsc clean in the touched files; the server is unchanged | Relied on |

### Round 5 Result

- Review Decision: `Pass`. No new findings. FU-004 is resolved in this ticket.
- Score Summary: 9.5/10. Repeated coordination is now one owner; the other categories are as at CRR-004.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`, to resume the held full rerun on code head `f60f962d9d`. Informational notice to the implementation engineer.
- Remaining follow-ups: FU-002, FU-005, FU-006 (FU-003 pre-existing).

## Round 4 — Targeted Delta Review of F-002 … F-005 (CRR-004; superseded by round 5)

- Review Entry Point: `Implementation Review`, round 4, `Targeted Delta Review`
- Trigger: implementation engineer, IR-003 ("the CRR-003 fixes are implemented"). Design SR-006 / ARCH-REV-003 at `dfbfb28615`.
- Review range: `dfbfb28615..257cee507c`; code head `e37ad88b98`.
- Review Scope Evidence: the code commits `c7abe89186`, `57a022d0bb`, `0048cd8ae1` and `e37ad88b98` touch only:
  - the observation route;
  - the paired-agent accesses and the managers' end notifications (standalone `onRunEnded`; Team `TeamRunLifecycleSnapshot.ending` through `RootTeamRun.onTerminated`, the materializer and `unregister`);
  - the provider;
  - `remoteOwnerUserMessage`;
  - the two view surfaces with the new `useRemoteRunView`;
  - their tests.

  These are the files and behavior of F-002 … F-005. The Team lifecycle snapshot gains one field; its only other reader, the Team stream, sends `is_active` alone. No other shared shape changes.
- Design artifacts read: SR-006 (DS-004a, the owner heading, with its consumer table; N-405/N-406) and ARCH-REV-003 Pass.
- Re-read authority: the updated design-examples (Case 2, Case 3 with 278 F-005, Case 6 "one rule applied by several callers").

### Prior Finding Resolution

| Finding | Fix | Verification | Status |
| --- | --- | --- | --- |
| F-002 (live frame before `{nodeId}`) | `api/rest/remote.ts`: frames produced while subscribing are held, `{nodeId}` is sent, then the held frames are flushed in order. A sink closed before the answer closes the socket, and A runs its AR-403 summary fetch. A's N-401 check is unchanged | `tests/unit/api/rest/remote-run-observations-route.test.ts` drives the real Fastify WebSocket route, gateway and provider with A's real `openPeerRunObservation`, against a run that emits at once. Both cases fail without the fix (per IR-003). This closes the coverage gap of the in-process case | Resolved |
| F-003 (REQ-808 per family) | `useRemoteRunView`, the one owner of the chip, ⚙/＋ permission, unreachable notice with Retry and placeholder, used by `AgentWorkspaceSurface` (standalone and Org Agents) and `TeamWorkspaceSurface` (Team members and Org Team members). `AgentWorkspaceView` drops its own copy (no duplicate rule, Case 6). The text-only composer was already keyed on the run ID | `RemoteRunViewAffordances.spec.ts`: 4 families × (chip, ⚙/＋, placeholder; notice with Retry); 6 of 8 fail on the old surfaces | Resolved |
| F-004 (B's own Stop) | `observePairedAgents(runId, onPresentation, onEnded)`. Standalone: `onRunEnded`, reported by `stopRoot` (also with no active root) and `endRoot` (history delete/archive), after the host stopped. `AgentRunService.terminateAgentRun` goes through `stopRoot`. Team: `ending: "stopped"` vs `"idle_shutdown"` from `runTermination` (`committed` means quiet), carried to the lifecycle. `TeamPairedAgentAccess` ends on `stopped` and follows the restore on `idle_shutdown`. The provider's terminate-only `endObservations` is removed: one owner of the end per kind | Unit tests per kind; the in-process Team keeps its observation through a real idle shutdown; the integration test shows a real terminate reports `stopped` | Resolved |
| F-005 (owner mark) | DS-004a: `remoteOwnerUserMessage` is the one composer of `From the owner of node "<name>":` + a blank line + the text. The metadata mark is removed and `RemoteOwner` is `{nodeName}`. `message_id`/`dedupe_key` pass through (N-405), so A's window replaces its echo. The mark is now in the content, which every consumer in the design's table reads: B's stored conversation, both windows and the agent | `paired-agent-access.test.ts`; `remote-run-view-provider.test.ts` | Resolved |

### Candidates Considered This Round

| Candidate | Disposition | Reason |
| --- | --- | --- |
| Deleting the history of a peer-started Team that is idle-shut-down sends no lifecycle notice, so A's open observation stays silent | Reject | The row already reads offline after the idle shutdown, and A's viewer closing ends the stream. The consequence is not material |
| `root-team-run.ts` at 499 effective lines (one import added) | Reject (pressure noted) | Within the limit; the next change needs a split first |

### Round 4 Result

- Review Decision: `Pass`. F-002 … F-005 are resolved; no new findings.
- Score Summary: 9.4/10 as at CRR-002. Runtime Correctness stays 9.0 (the end-to-end confirmation of F-002 and F-004 is API/E2E's); REQ-808 per family now holds.
- Checks relied on (IR-003, on the code head): server typecheck; server unit 6543; integration 421; focused server 194; web 4786; guards; focused web 67; vue-tsc clean in the touched files. IMP-09 (rendered) was not repeated; the browser probe is API/E2E's.
- Follow-ups this review added (after CRR-004, at the user's request): FU-004 (one window owner for a remote run's Retry and loading; **pulled into this ticket by the user, 2026-10-23**: to be fixed before API/E2E's rerun, then a Targeted Delta Review), FU-005 (one end-of-run notion), FU-006 (split `root-team-run.ts` and `teamExecutionViewState.ts`). FU-002 stands.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to the implementation engineer.
- For API/E2E:
  - RC-31 must expect the heading and drop its `remote_owner` file scan.
  - Add N-405's single user message.
  - Rerun the full two-server E2E (RC-31 live frame, RC-32 B's own Stop) and the browser probe (RTP-04 per family, including attachments and `@` in the Team and Org composers).

## Round 3 — API/E2E Failure-Origin Review (CRR-003; superseded by round 4)

Rounds 1–2 below are the implementation review (Pass at CRR-002). This round classifies API-REV-001's four failures. It does not repeat the source audit or the scorecard.

### Failure Context

- Review Entry Point: `API/E2E Failure-Origin Review`
- Trigger: API/E2E API-REV-001 Fail (confidence 87%), findings API F-001 … F-004
- Code under test: `1bdcff8ae2`. API/E2E's tests, documents and evidence are in `7cfcb72af6`.
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md` (API-REV-001)
- Failing Scenario IDs:
  - RC-31 (live output of an active remote Agent; owner message answer);
  - RC-32 (B's own Stop);
  - RTP-04 (opened remote run in the Team and Org families);
  - RC-31 `ownerMarks`.
- Exact Commands / Execution Mode:
  - the two-server E2E `remote-delegation-two-server.e2e.test.ts` (run 2: 35/37; diagnostic with `{nodeId}` held first: 36/37);
  - the browser probe `pnpm -C autobyteus-web test:e2e:remote-runs-in-tree` (run 9: 5/6).
- Failure Evidence Paths (`evidence/api-e2e/`):
  - `F-001-observation-first-frame-order.log`;
  - `API-01-run2/`;
  - `API-01-diagnostic-nodeid-first/`;
  - `API-02-run9/remote-runs-in-tree-probe.json`;
  - `RTP-04-opened-remote-run.png`.
- Project testing guideline: TESTING.md (as the coverage investigation records it).
- Supported product scenario basis: SCN-802 (open, follow live, message), SCN-801/REQ-808 per family (REQ-806), DS-006 (B's own Stop), AC-803 (owner mark). All are approved behavior, triggered through the real product surfaces (the root view stream, the window, B's own Stop, the composer).

### Classification Per Failure

| ID (this report) | API/E2E ID | Failure | Confirmed Cause (source) | Origin | Classification / Owner | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| F-002 | F-001 (High) | No live output reaches alpha's view of a remote Agent that is active when the view opens (AC-802; AC-803's answer) | `api/rest/remote.ts`: the sink is live from `openRunObservation(body, sink)`, and `{nodeId}` is sent only after the gateway's promise resolves. `StandalonePairedAgentAccess.observePairedAgents` subscribes to the live host. `AgentRun.subscribeToEvents` (`agent-run.ts:161-170`) sends an input-state snapshot from its dispatch queue, so `AGENT_INPUT_STATE` can reach the socket before `{nodeId}`. A's `openPeerRunObservation` then ends the stream, correctly (N-401). The Team target and an offline Agent have no immediate frame, so they pass | Implementation defect. It was detectable in source review (review gap, below) | `Local Fix` / implementation | B must send `{nodeId}` before any frame. For example, the route holds the sink's frames until the accepted answer's `{nodeId}` has been sent, then flushes them in order; or the gateway answers before the observation subscribes. Do not relax A's N-401 check. Add a test through the real route (the WebSocket binding), not only the in-process two-node case, with a live run whose subscription sends a frame at once |
| F-003 | F-002 (Medium) | The opened remote run in the Team family shows ⚙/＋, no header chip and the generic placeholder; in the Org family, the generic placeholder (REQ-808 for every family, REQ-806) | The REQ-808 affordances were added to `AgentWorkspaceSurface.vue` (header chip, hidden ⚙/＋, notice) and the placeholder to `AgentWorkspaceView.vue`. The Team family renders through `components/workspace/team/TeamWorkspaceSurface.vue` / `TeamWorkspaceView.vue`, which were not changed. The Org family uses `AgentWorkspaceSurface` but its own `AgentOrgWorkspaceView.vue`, which has no remote placeholder. The text-only composer and the panel notes are shared (`AgentUserInputForm`, `useComposerTarget`, `RightSideTabs`), so they should hold in every family; API/E2E has not verified this | Implementation defect (one kind traced, the others assumed). Detectable in source review (review gap, below) | `Local Fix` / implementation | Give the Team family's member view the same remote affordances (chip, hidden ⚙/＋, the unreachable notice with Retry, the remote placeholder), and the Org view the remote placeholder. Prefer one shared owner for "a remote run's view affordances" (for example a composable the three views use) over copying the checks into each view. Add component specs per family. API/E2E rechecks attachments and `@` in the Team and Org composers |
| F-004 | F-003 (Medium) | When B's own owner stops the remote run, alpha's open view gets no final state until Retry (this was C-2, held for evidence in rounds 1–2) | DS-006: "B ends the stream only when A closes it, or when the run is stopped, terminated or deleted." `RemoteRunViewProvider.endObservations` runs only after a `terminate` sent through `owner-commands` (deviation 7). `StandalonePairedAgentAccess` / `TeamPairedAgentAccess` keep their subscriptions across a stop. For a standalone root, the stopped root instance is also left behind, so `onHostReady` on it never fires for a later restore. A gets neither an end (which would trigger AR-403's summary fetch) nor a final status frame | Implementation (a deviation from DS-006 that the handoff did not list). Held, not missed, in source review | `Local Fix` / implementation | End a run's observations when the run is stopped, terminated or deleted by any path: B's own window, GraphQL `terminateAgentRun`/`terminateTeamRun`, or owner-commands. Use the root kinds' own stop and terminate notifications behind `PairedAgentAccess`, so the provider is not the only place. Idle shutdown must not end it (the Agent follows host to host; the Team follows root restore). A then fetches the final summary (AR-403). Add RC-32-shaped unit coverage for each kind |
| F-005 | F-004 (Low) | The owner message is not marked as from alpha's owner anywhere stored or shown (AC-803 "marked as from alpha's owner"; REQ-803 "recorded … as coming from the owner of this node") | Implemented as designed: DS-004 says "a message is posted to the agent as user input, with metadata naming the peer owner, so its conversation shows the user's message"; `remoteOwnerUserMessage` sets `remote_owner {node_id, node_name}`. Neither the design nor the implementation established where that metadata is kept or who reads it. The stored conversation and projection do not keep it (RC-31 `ownerMarks: []`), no window shows it, and the agent does not see it. The design never traced the readers of the mark (the shape of design-examples Case 3: a reader of derived data left out) | Design: the design chose a mechanism without tracing it to the stored record, the views and the agent | `Design Impact` / Solution Designer | Decide where "marked as from alpha's owner" lives and who reads it: the stored user message (persisted metadata or a stored origin field), its projection to B's and A's windows, and whether the receiving agent sees it in its input. Then revise DS-004 with a consumer table. This ties in with N-404 (telling the user about the REQ-803 clarification) |

### Review Gaps (source review rounds 1–2)

- **F-002, detectable:** I read `remote.ts` and the observation client in round 1 and accepted the ordering. The sink becomes live inside `openRunObservation`, before the route sends `{nodeId}`; any frame sent during subscription precedes the opening frame. The invariant to check was "no frame before the opening frame", and it was visible in the route.
- **F-003, detectable:** I confirmed REQ-808 from the standalone view components only (`AgentWorkspaceSurface`, `AgentWorkspaceView`) and recorded "Confirmed" for every family. Principle 1 asks for each kind to be traced; the Team family's `TeamWorkspaceSurface` and the Org family's `AgentOrgWorkspaceView` were not.
- **F-004:** held as C-2 for evidence, as recorded; now confirmed.
- **F-005:** not identified in review. The mark's persistence was a design premise I did not trace.
- Lesson for later reviews: for each kind and family, trace the user-visible surface itself, not the shared component; for a stream, check the order of the first frames at the binding layer.

### Round 3 Result

- Review Decision: `Fail`. The failure origins are confirmed: three implementation `Local Fix`es (F-002, F-003, F-004) and one `Design Impact` (F-005).
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Fail`. DS-004's premise that the metadata marks the message is not met in the stored or shown record.
- Recommended Recipient: `/software_engineering_team/solution_designer` (the Design Impact). F-002 … F-004 are confirmed implementation-owned and need no design change; they can go to implementation with, or ahead of, the F-005 revision.
- After the fixes: a `Targeted Delta Review` of F-002 … F-005, then API/E2E reruns the full two-server E2E and the browser probe (`pnpm -C autobyteus-web test:e2e:remote-runs-in-tree`, after the server build).
- API/E2E test-side changes noted (the proxy forwards WebSocket upgrades; the "nothing sent" counts exclude summary reads) will be reviewed in the proportional test-code review after a pass.

## Rounds 1–2 — Implementation Review

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-003; REQ-801 … 808, AC-801 … 807, DEC-801 … 807)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005; DS-001 … DS-006)
- Supplemental Task Artifacts Reviewed As Context:
  - UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md` (normative);
  - `follow-ups.md` (FU-001 … FU-003).
- Relevant Solution Revision IDs: SR-005
- Design Review Report Reviewed As Context: `design-review-report.md`. AR-401 … 403 and N-401 … 404 are carried out (N-404 is the Solution Designer's).
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`, with its 10 deviations and the checks IMP-01 … IMP-09
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review` (round 2). Round 1 was a `Full Review` of `1c6614a481..34b5b133d5` (code head `1046c6beb4`).
- Review Scope Evidence (round >1): `34b5b133d5..4abf57451a`. The code change `1bdcff8ae2` touches only 3 web files: `teamRemoteExecutions.ts`, `teamExecutionViewState.ts` and their spec. These are exactly F-001's files and behavior; no server, contract or shared shape changed. `4abf57451a` changes documents only.
- Trigger: implementation engineer, IR-002, "Local Fix F-001 (CRR-001) is done".
- Prior Review Round Reviewed: round 1 (CRR-001)
- Latest Authoritative Round: 2
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The change adds a server-to-server stream, three peer requests, shared stream contracts and owner control of runs on another node, across all three root kinds and the three window families.

## Review Scope

- **Changed implementation and behavior reviewed:**
  - **A (the delegating node):**
    - `RemoteRunObservation` (viewer counting, streams, summaries, Retry, AR-403 end);
    - `remote-child-commands.ts` (`executeRemoteChildCommand`, `stopRemoteChild`, `remoteChildOf`, `remoteMemberProjection`);
    - `RemoteRunLinks.ownerCommand` / `admitsOwner` / `agentLinkFor`;
    - the port extension;
    - the three roots' wiring (view, events, gate-free remote commands, Stop, dispose, `onRemoteLinkCommitted`);
    - the three stream handlers (viewer hooks, Retry);
    - the three view projectors and the Team remote event projector;
    - the three member-projection resolvers;
    - GraphQL views.
  - **B (the running node):**
    - `RemoteRunViewProvider`;
    - `PeerGateway` (parsers and admission for the four kinds);
    - `PeerClient` and `peer-run-view-answers.ts` (strict readers);
    - `peer-run-observation-client.ts` (N-401);
    - routes, including the WebSocket;
    - composition and `RemoteRootDirectory.pairedAgents`;
    - `StandalonePairedAgentAccess` (host to host through `onHostReady`) and `TeamPairedAgentAccess` (publisher, members filter, lifecycle);
    - `storedRemoteLinkCheck` for `owner` queries (always against the back-link).
  - **Contracts:** `remote-task-execution-dtos.ts`, the three stream contract packages.
  - **Web:**
    - `remoteRunsStore`, `remoteChildren.ts`, `remoteAgentContext.ts`;
    - the standalone, Org and Team family contexts, indexes, hydrations, stores and streaming services;
    - `teamRemoteExecutions.ts`, `teamRemoteRunRegistry.ts`;
    - the row, header, notice, panel notes, composer and Delegated copies list.
- **Docs:** `remote_collaboration.md`, `collaboration_model.md`, web `agent_execution_architecture.md`.
- **Explicit exclusions:**
  - the two-server E2E, the browser probe and the Team/Org delegator scenarios (design step 5, PA-808), which are API/E2E's;
  - AC-807, the user's check;
  - `dist/` folders.
- **Check run by the reviewer:** `npx vitest run tests/architecture` in `autobyteus-server-ts` on `34b5b133d5`. It was not in the handoff's checks, and this change adds imports across subsystems. Result: 43 passed, 1 failed. The failure is the known pre-existing `SR-011 host definition` assertion on `agent-memory/services/agent-memory-explorer-service.ts`, a file this change does not touch; it is the failure recorded as autobyteus-261 FU-002, also failing at that ticket's base.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: yes.
- Design-spec behavior map verified against the implementation: yes, path by path (table below).
- Design review report and round confirmed: ARCH-REV-002 Pass on SR-005.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Status | Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| REQ-801 / DS-001 | Confirmed | Root views carry `remote_task_executions` via `remoteTaskExecutionDtos` (local peer names only; it never waits for a peer). Stream connect → `remoteChildren.viewerAttached()` → `fetchSummaries` (one `runSummaries` per node) → `remote_task_execution_summary` → DTO projectors → web `applyRemoteSummaryStatuses` (unlisted agent → Offline) and `remoteRunsStore.applySummary`. A failed call gives `reachable: false`; Retry sends `REFRESH_REMOTE_TASK_EXECUTIONS` → `refresh()` |
| REQ-802 / DS-002 | Confirmed | B `observe` → `pairedAgents(kind).observePairedAgents`: standalone follows host to host through `onHostReady` and the root's presentation adapter; Team uses the root publisher, filtered to `peerStartedTeamMembers`, and re-attaches on lifecycle. A `openPeerRunObservation` requires the first frame `{nodeId}` to equal the pinned peer (N-401) → `frame()` maps by the stored link and drops unknown IDs (AR-402) → `remote_agent_presentation` → `agent_presentation` in the three projectors only. N-402 is pinned by `remote-child-output-projection.test.ts`; the Team root's other consumers (the application stream source, mapper, idle shutdown) read only `AGENT` events |
| REQ-802 / DS-003 | Confirmed | The three resolvers call `remoteChildOf(stored or active tree's remoteTaskExecutions)` first, then `agentProjection`. B checks the link (`owner`, paired agent), then reads the agent or Team-member projection service. A failure is a GraphQL error; the web calls `markReachable(false)` |
| REQ-803 / REQ-805 / DEC-804 / DS-004 | Confirmed | The roots' `executeAgentCommand` (standalone; Team; Org `executeAgentCommandWithExecutionKind`) sends `remoteLinks.has` targets → `executeRemoteChildCommand`, outside the gate (deviation 8; the Team and Org stream handlers dispatch messages without awaiting each other) → `RemoteRunLinks.ownerCommand` (refuses the delegator endpoint) → B `command` → link check → `executeOwnerCommand`. A message becomes a user message with `remote_owner` (`postHostUserMessage` / the member `post_message`, restoring an idle run); interrupt; terminate is `stopRoot` / `terminateTeamRun`, after which B ends that run's observations. Stop on A: `stopRemoteChild` before the local Stop, in all three roots |
| REQ-804 | Confirmed | Failed summaries give `reachable:false`; failed reads give `markReachable(false)`; Retry always settles (`retry` clears `checking` when nothing could be asked) |
| REQ-806 | Confirmed (F-001 resolved in round 2) | All three roots share `RemoteRunObservation` and `remote-child-commands.ts`; all three families share `remoteChildren.ts` / `remoteAgentContext.ts`. Exception: row order in the Team family (F-001) |
| REQ-808 | Confirmed | Header chip; no ⚙/＋ (`AgentWorkspaceSurface`); text-only composer (`AgentUserInputForm` hides the attachments area; `useComposerTarget` gives no mention scope); the remote placeholder; panel notes for Files/Terminal/Artifacts/Screen (`RightSideTabs`); Delegated copies lists `taskExecutions` only |
| DS-005 / DS-006 | Confirmed | Viewer hooks in the three handlers (Team: on bind and unbind). On B, an `owner` query always reads the back-link, also for an active root (`query.kind !== "owner" && hasRoot` → `proceed`), so the "root checks in memory" shortcut never applies to owner requests |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-801 | REQ-801, REQ-806, AC-801, AC-806, UI/UX line 111 | User | Owner of alpha | See every run the delegator delegated (local and remote) as one list in delegation order | Workspaces tree under a standalone, Team or Org delegator | Normal | As DS-001 → each family's row builder | Rows with chip, title and status, in the order delegated | requirements, UI/UX spec line 111 ("one list in the order they were delegated") | Supported Normal | Use |
| SCN-802 | REQ-802/803, AC-802/803 | User | Owner of alpha | Open a remote run, follow it live, message, interrupt and stop it | Run view and composer | Normal | DS-002/003/004 | As REQ | Unit tests and IMP-09 (standalone, rendered) | Supported Normal | Use |
| SCN-803 | REQ-804, AC-804 | User | Owner of alpha | The node is down: plain error, Retry, the rest of the tree works | Row, notice | Explicit Edge | DS-001 failure → `reachable:false` → Retry | As REQ | IMP-09 steps 8–10, specs | Supported Explicit Edge | Use |
| SCN-804 | REQ-803, security direction (RSK-401) | Contract | Peer B | Serve only the peer whose delegation started the run, and only its paired agents | Four B routes | Contract | gateway admission → `storedLinkCheck(owner)` → `admitsOwner` | Refusal otherwise | `remote-run-links.ts` `admitsOwner`; the managers' `storedRemoteLinkCheck` | Supported (contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 (F-001) | In the Team family, the remote runs are appended after all of the Team tree's rows, not merged among the root's delegated copies in delegation order. The standalone and Org families do merge them (`mergeByStartTime`) | SCN-801, REQ-806, UI/UX spec line 111 | A Team delegator delegates locally and remotely, in any interleaving | `createTeamExecutionViewState.navigationRows` = `[...projectNavigationRows(tree), ...remoteNavigationRows(...)]` → `buildRunHistoryTeamExecutionRows` keeps that order. The sidebar order differs from the delegation order, unlike the other two kinds | `teamExecutionViewState.ts` `navigationRows`; `teamRemoteExecutions.ts` L42 ("after the tree's rows"); compare `agentRunCollaborationContext.ts` and `agentOrgHistoryRows.ts` (`mergeByStartTime`) | Promote | This ticket | A normative UI rule and "the same for every root kind"; a bounded fix in one family |
| C-2 | DS-006 says B ends a run's observation when the run is "stopped, terminated or deleted". B ends it only on a terminate sent through `owner-commands` (deviation 7); a Stop by B's own owner leaves A's stream open and silent | SCN-802 | B's owner stops the remote run in B's window while alpha's owner views it | A's row status then depends on the final status frames (offline), which were not traced end to end. An open silent stream is otherwise harmless: A closes it when its viewer leaves, and a host restored later streams again | `remote-run-view-provider.ts` `endObservations` only in `command`; `StandalonePairedAgentAccess` / `TeamPairedAgentAccess` keep their subscriptions | Hold for Evidence | — | Asked of API/E2E: the row on A shows offline after B's own Stop |
| C-3 | FU-002: a delegator root without a live stream lists its remote rows without title, and they read Offline | REQ-801/805 | The delegator is stopped, or the app restarted, while the remote run keeps working (a root's Stop fences remote children rather than stopping them) | The status may be wrong ("Offline" for a working run). The run can still be opened (the projection is read without a stream) | `follow-ups.md` FU-002; `RemoteRunObservation` runs only for stream viewers | Reject as a finding: a follow-up already recorded | Follow-up (FU-002) | DEC-807 phase 1 scopes the first version to the normal path, the design placed the summaries on the stream, and the ticket's ACs pass with a live delegator. The Solution Designer may want to tell the user that "Offline" here means "not asked", when sending FU-002 |
| C-4 | `root-team-run.ts` is at 498 effective lines; its multi-line imports were compacted to fit | Contract (size rule) | — | It is within the limit; the next addition will need a split | line counts (base 497) | Reject | — | Not over the limit. Noted as pressure in Residual Risks |
| C-5 | `generated/graphql.ts` edited by hand (3 spots) | Contract | — | It matches the new `remoteTaskExecutions` field; codegen reproduces it | handoff Known Risks | Reject | — | No defect |
| C-6 | `remoteOwnerCommandOf` sends only `content`; context files would be dropped | REQ-808 | — | The composer of a remote run offers no attachments or `@` | `AgentUserInputForm.vue`, `useComposerTarget.ts` | Reject | — | No supported path sends them |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | "A child it does not host": policy once (`RemoteRunObservation`, `remote-child-commands.ts`, `RemoteRunViewProvider`); the roots delegate thinly | — |
| Matches behavior-defining supplemental artifacts | Pass | Round 2: UI/UX spec line 111 now holds in all three families (F-001 resolved). Chip, title line, notice, panel notes, hidden ⚙/＋, text-only composer and Stop square match | — |
| Data-flow spine clarity | Pass | DS-001 … 004 each have one path, traced for all three root kinds and all three families (table above) | — |
| Ownership boundary preservation | Pass | A: one shared owner for observation, commands and projection reads; the roots own only the wiring. B: one inbound owner; the root kinds' own APIs behind `RemoteRootDirectory` (N-304) | — |
| Off-spine concerns | Pass | Strict answer readers and the observation client are channel concerns; the DTO projection is in the streaming services | — |
| Existing capability reuse | Pass | `PeerGateway.admit`, `PeerClient.call` (20 s), `RemoteRunLinks` endpoints, the presentation adapter, the projection services, the member-projection queries, `agent_presentation` | — |
| Reusable owned structures | Pass | `remoteChildren.ts` (rows, summaries, merge) and `remoteAgentContext.ts` are shared by the three families; `remote-task-execution-dtos.ts` is shared by both contract packages | — |
| Data-model tightness | Pass | Remote links are a separate DTO list, not optional fields on local task executions; `target {kind, runId}`; `RemoteOwnerCommand` is a closed union | — |
| Repeated coordination ownership | Pass | The remote-command, Stop and projection rules are each written once (N-403); the three roots' identical calls are thin | — |
| Empty indirection | Pass | `useRemoteRun` is a computed view of the store, used by four components | — |
| SoC / file responsibility | Pass | New files each have one subject | — |
| Ownership-driven dependencies | Pass | `remote-collaboration` imports only `agent-collaboration` ports and types; roots reach no `PeerClient`. Architecture tests: 43 pass, 1 pre-existing fail on an untouched file | — |
| Authoritative Boundary Rule | Pass | B's provider goes through `RemoteRootDirectory` only; A's roots go through `RemoteRunLinks` / `RemoteRunObservation`, never the channel's internals | — |
| File placement | Pass | `agent-collaboration/execution/remote/`, `remote-collaboration/{channel,inbound}/`, each manager's `services/`, web `services/remoteRuns/`, `components/workspace/remote/` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | Four peer kinds, each with one subject; `PairedAgentAccess` has three methods per root kind | — |
| Naming quality | Pass | "remote" on A, "peer" for transport, "owner command", "paired agents" | — |
| No unjustified duplication | Pass | The three families' Retry closures follow one pattern with a family-specific stream; acceptable | — |
| Patch-on-patch complexity | Pass | The two fix commits (`6695820605`, `53c6624aea`) are bounded and covered by specs | — |
| Dead code removed | Pass | The old inline route bodies were folded into `post(...)`; no dead branches found in touched files | — |
| Tests clear and requirement-aligned | Pass | Per-owner unit tests on server and web, including the in-process two-node case, N-401/402/403 and AR-402/403 | — |
| Test fixtures/helpers coherent | Pass | Fixtures gained `remote_task_executions: []` | — |
| No stale / compatibility-only tests | Pass | — | — |
| API/E2E readiness | Pass | Routes, streams, contracts and windows are wired; the handoff lists the two-server and browser scenarios | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/root-team-run.ts` | 497 | 498 | Pass (pressure) | Pass | Pass | OK | — (see Residual Risks) |
| `web/services/teamExecution/teamExecutionViewState.ts` | 479 | 497 | Pass (pressure) | Pass | Pass | OK | Round 2: the F-001 logic lives in `teamRemoteExecutions.ts` (98) |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 472 | 489 | Pass | Pass | Pass | OK | — |
| `web/stores/agentTeamRunStore.ts` | 486 | 488 | Pass | Pass | Pass | OK | — |
| `web/services/agentOrgExecution/agentOrgStreamingService.ts` | 475 | 483 | Pass | Pass | Pass | OK | — |
| `agent-collaboration/execution/remote/remote-run-observation.ts` | 0 | 184 | Pass | Pass | Pass | OK | — |
| all other changed source | — | ≤ 449 | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Rule 9. A peer without the routes answers 404, which reads as unreachable |
| No legacy old-behavior retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data transition | Pass | `Not Affected`; nothing new is stored |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, and done.
- `remote_collaboration.md` § Remote runs in the run tree matches the code: the four requests, B's owner, A's client and owner, views and commands, the phase 1 limits.
- `collaboration_model.md` § 3/4/5: the § 3 correction is accurate (remote links have been in `remoteTaskExecutions` since autobyteus-191).
- Web `agent_execution_architecture.md`.
- After F-001, the web doc's row-order statement should hold for the Team family as written.

## Additional Material Premise Validation

None new. AR-401 … 403 and N-401 … 403 are confirmed as in the table above. C-2 is held for evidence (API/E2E).

## Review Scorecard (Mandatory)

- Overall score: 9.4/10 (94/100)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.5 | Four spines, each traced through all three root kinds and families | — | — |
| 2 | Ownership / Boundaries | 9.5 | One owner per side; the root kinds' own APIs behind `RemoteRootDirectory` | — | — |
| 3 | API / Interface Clarity | 9.5 | Four peer kinds; `PairedAgentAccess`; a closed command union | — | — |
| 4 | SoC / File Placement | 9.0 | Clear; the F-001 logic is placed in `teamRemoteExecutions.ts` | `root-team-run.ts` 498, `teamExecutionViewState.ts` 497 | Split before the next addition |
| 5 | Data-Model Tightness / Reuse | 9.5 | A separate remote DTO list; shared web helpers | — | — |
| 6 | Naming / Readability | 9.0 | Consistent vocabulary | Imports compacted in `root-team-run.ts` to fit | — |
| 7 | API/E2E Readiness | 9.0 | Wired end to end; scenarios listed | Team/Org delegators not rendered yet | PA-808 in API/E2E |
| 8 | Runtime Correctness | 9.0 | The paths are correct for all kinds; the Team rows now follow delegation order | C-2 is held for evidence | API/E2E covers B's own Stop |
| 9 | No Backward Compat | 10.0 | Clean cut | — | — |
| 10 | Cleanup | 9.5 | — | — | — |

## Findings

Round 2: no open findings. F-001 is resolved (see `code-review-revision-record.md` CRR-002).

| Finding ID | Severity | Path | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| F-001 (resolved in round 2) | Low | `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` (`navigationRows`), `teamRemoteExecutions.ts` (`remoteNavigationRows`) | C-1 | List a Team delegator's remote runs among its root-level delegated copies in delegation order (`started_at`), as the standalone and Org families do with `mergeByStartTime` (UI/UX spec line 111; REQ-806). Members of the Team itself keep their place. Keep the new code in `teamRemoteExecutions.ts` (the view-state file is at 498). Add a spec with a remote run delegated between two local copies. | Local Fix / `implementation_engineer` |

## Follow-ups

- Follow-ups this review added: None. FU-002 (recorded by implementation) stands; see C-3 for a note the Solution Designer may pass on with it.

## Classification

- Round 2: N/A (Pass). Round 1 was `Local Fix`, now resolved.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (implementation review Pass), with an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- C-2 (held for evidence): when B's own owner stops the remote run while A views it, A's row should end offline. API/E2E should include it.
- FU-002: a stopped delegator's remote rows read Offline without a title, even when the run is working on its node.
- `root-team-run.ts` (498) and `teamExecutionViewState.ts` (497) are at the limit; the next change in either needs a split first.
- Only the standalone root was rendered (IMP-09). The Team and Org delegators and the Team target in the window are API/E2E's (PA-808).

## Latest Authoritative Result

- Review Decision: `Pass` (round 2). Superseded by round 3: `Fail` (see Round 3 Result at the top)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (C-2 held for evidence; it does not block)
- Score Summary: 9.4/10; every category ≥ 9.0
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - The architecture is sound and follows the reviewed design.
  - The 10 deviations are each justified and within the design's intent. Deviation 2 (the Team manager's lifecycle notifications instead of a new directory listener) is a reuse of an existing owner.
  - Round 2: `teamNavigationRowsWithRemote` keeps the leading rows (the root, each member and the copies at its address) first, then merges the root-level copy blocks (dated by `root.task_executions[].started_at`) with the remote run blocks through the shared `mergeByStartTime`. This matches `projectNavigationRows`, which emits members (with copies at their address) before root-level copies, so the split is exact. Copies at a member's address keep their pre-existing place next to their member (local behavior, unchanged).
  - New spec: a remote Team at 08:00 between local copies at 07:00 and 09:00; it fails without the fix (per IR-002).
  - Web full suite 4778 passed (IMP-06 on `1bdcff8ae2`). The server is unchanged, so IMP-01 … IMP-05 stand.
