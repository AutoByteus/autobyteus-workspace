# Design Review Report — Remote Delegated Runs In The Run Tree (autobyteus-278)

## Review Round Meta

- Upstream Requirements Doc: `…/requirements-doc.md` (Approved, SR-003; REQ-803 / AC-803 clarified at SR-004)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-01 … E-10)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-004)
- Reviewed Design Spec: `…/design-spec.md` at commit `fee1d70cda` (SR-004)
- Supplemental Task Artifacts Reviewed: the approved UI/UX package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md` (scoped to what the server design must supply); the contract `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-11); `follow-ups.md` (FU-001)
- Relevant Solution Revision IDs: SR-001 … SR-004
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` (SR-004)
- Prior Review Round Reviewed: N/A (first review of this package)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: code and docs read in the worktree at `fee1d70cda` (base `3b09fbe308`):
  - `standalone-agent-run-root/domain/standalone-host-agent-handle.ts` (the host is its own `AgentRun`; `ensureReady` activates or restores it);
  - `standalone-agent-run-root/domain/standalone-agent-run-root.ts:142, 207, 375-395` (`StandaloneHostIdleShutdown` watches the host through `onHostReady`; `onAgentExecutionEvent` publishes child events to the root publisher);
  - `standalone-host-idle-shutdown.ts` (idle shutdown terminates the host `AgentRun`; the root stays registered);
  - `docs/modules/standalone_agent_run_root.md:16-17, 169-178` ("The host is still streamed on `/ws/agent/:runId`"; collaboration-stream "Commands target children only … a command to the host is rejected (`AGENT_ROOT_HOST_COMMAND_REJECTED`)");
  - `agent-collaboration/execution/services/root-event-publisher.ts` (root events are non-persisted);
  - `active-collaboration-root-directory.ts:42-113` (`reserve` / `commit` / `unregister`);
  - `remote-collaboration/inbound/remote-team-run-starter.ts:79-94` and `agent-collaboration/execution/remote/remote-delegation.ts:91-135` (A's stored Team-link members are already mounted at the link's address);
  - `autobyteus-web/stores/runHistoryTeamExecutionRows.ts` (transient rows come from the opened root's view, so remote rows from the root view match how local copies appear);
  - `api/security/remote-access-route-policy.ts:71`.

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree/tickets/in-progress/remote-runs-in-tree`

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`
- Classification rationale reviewed: yes. It adds a server-to-server stream, a peer's user driving runs, and shared stream contracts. It touches three root kinds and three window families, and the observation lifecycle runs against root and host lifecycles on both nodes.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - remote runs appear under their delegator with node, title, status and reachability;
  - an opened remote run shows its conversation, live;
  - the user can message, stop and terminate it;
  - a failure shows as a plain error (phase 1, DEC-807);
  - this works for Agent and Team, for every delegator root kind, on desktop and web.
- Relevant existing behavior and evidence confirmed: mostly. One premise does not hold for the remote **Agent** case (AR-401): "B: a root's sequenced events are available while the root is active" is true for Team roots, but a standalone run's host output and commands do not pass through its root.
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Remaining material ambiguity: none in intent.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-801 rows | User | Pass | Pass | Pass | Confirmed | AR-402 (member identity) |
| BEH-802 live view | User | Pass | Fail | Fail | Needs Correction | AR-401 (remote Agent source), AR-402, AR-403 |
| BEH-803 talk to it | User | Pass | Fail | Fail | Needs Correction | AR-401 (host command path) |
| BEH-804 unreachable | User | Pass | Pass | Fail | Needs Correction | AR-403 (a dropped stream shows nothing) |
| BEH-805 real state after idle | System | Pass | Fail | Fail | Needs Correction | AR-401 (the host is replaced while the root stays) |

## The Five Points The Handoff Asks About

1. **A's root as the owner of remote children, with `RemoteRunObservation` shared by the three roots: sound.**
   - It removes the ownership gap at its cause: the delegator's root is the one place that knows its links and has the window's stream.
   - The viewer-count trigger, one observation per link and Retry live once, in `RemoteRunObservation`, with thin calls from the three roots (principle 13).
   - Root events are non-persisted (`RootEventPublisher`), so nothing of B's content is stored on A (CM-8).
   - Using a **distinct domain event** (`remote_agent_presentation`) that only the DTO projector maps to `agent_presentation` is right. Server-side consumers of local `agent_presentation` cannot pick up a peer's output by accident. N-402 makes that an explicit invariant.
2. **The frame-to-`agent_presentation` mapping and member addresses: needs correction (AR-402).**
   - A computes "the link's address plus the member's address" from B's frame, but A's stored Team link already holds each member's mounted address (247's `RemoteTeamRunStarter` mounts them).
   - Nothing says which agents' frames B sends: a remote run's agents can include B-local delegated copies that A's tree does not have.
3. **B's directory activation listener as the attach mechanism (DS-006): correct for Team roots, wrong for remote Agents (AR-401).**
   - A peer-started Team root unregisters on its quiet idle shutdown (247), so `onActivated` / `onDeactivated` follow it.
   - A remote Agent is a standalone root whose **host** is a separate `AgentRun`. Its output is not on the root's events, commands to it are rejected by the root's child path, and idle shutdown replaces the host while the root stays active. The existing "host became ready" hook (`onHostReady`) is the attach point there.
4. **The phase-1 boundary (no reconnect or catch-up): accepted, with one gap (AR-403).** No reconnect, no catch-up and Retry as the only recovery fit DEC-807. But a stream that ends while a view is open must not leave a view that looks live and isn't: REQ-804 requires the failure to show plainly.
5. **The REQ-803 clarification: accepted.**
   - A user's composer message to a run is that run's input (its memory and trace), not a run-to-run message (CM-9). That is also how a local delegated copy records it today, so "no difference" holds.
   - Recording it on A would need new storage, which the approved data decision excludes.
   - DEC-803's owner is the Solution Designer and nothing visible changes in the normal path, so no re-approval is required. Since the user approved the earlier wording, I recommend telling him in the next summary (non-blocking).

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose Clear? | Linked? | Complete? | Consistent? | Status Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` (Product-owned, approved) | Pass | Pass | Pass | Pass | Pass | — (PA-805 is confirmed by the presentation DTOs; the server must supply what AR-401 … AR-403 fix) |
| `collaboration_model.md` CM-11 | Pass | Pass | Pass | Pass | Pass | Update with AR-401's per-kind source once revised |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | § Task Design Health Assessment | — |
| Root cause explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`: no owner represented a linked-not-hosted run (CM-7) | — |
| Refactor decision explicit | Pass | No broad refactor; a directory listener and a shared observation owner | — |
| Supported by concrete sections | Fail | The B side assumes every remote run is a root whose agents publish into its root events | AR-401 |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative? | Facade Vs Owner? | Naming? | Ownership? | Off-Spine? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 rows and summaries | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 live output | Primary | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-401: the source on B for a remote Agent; AR-402) |
| DS-003 stored conversation | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (for a remote Agent, B's own window reads the run projection of the host; say so when revising) |
| DS-004 owner commands | Primary | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-401: the host's command path) |
| DS-005 A's observation lifecycle | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass (AR-403 adds the unexpected-end case) |
| DS-006 B's attach lifecycle | Bounded local | Pass | Fail | N/A | Pass | Fail | Pass | Fail (AR-401) |

## Boundary Encapsulation Verdict

| Boundary | Entry Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| A: root → `RemoteRunObservation` → `RemoteRunChannel` | Pass | Pass | Pass | Pass | A root projector never calls `PeerClient` (forbidden, explicit) |
| A: commands → `RemoteRunLinks.ownerCommand` | Pass | Pass | Pass | Pass | — |
| B: `PeerGateway` → `RemoteRunViewProvider` → roots via `RemoteRootDirectory` | Pass | Fail | Fail | Fail | AR-401: "B root executes" and "attaches to the run's root" stop at the root. A standalone host is reached through the root's host handle and its own command port, which the provider must not reach around; give the root one owned API for its paired agents |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-collaboration` → roots only through `RemoteRootDirectory` (N-304) | Pass | Pass | Pass | Pass | AR-401's per-kind source must sit behind this boundary, not in the provider |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `POST /rest/remote/run-summaries`, `/agent-projection`, `/owner-commands` | Pass | Pass | Pass | Low | Pass |
| `GET /rest/remote/run-observations` (WebSocket) | Pass | Pass | Fail | Medium | Fail (AR-402: the frame's agent identity; N-401: the responder's identity) |
| `RemoteRunChannel` extension | Pass | Pass | Pass | Low | Pass |
| Window: `remote_task_executions[]`, `remote_task_execution_summary`, `REFRESH_REMOTE_TASK_EXECUTIONS` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Rendering and stores on the window | Pass | Pass | N/A | Pass | Remote rows enter the same root view, as transient local copies do (`runHistoryTeamExecutionRows.ts`) |
| B: the source of a remote Agent's output and its readiness | Fail | Fail | N/A | Fail | AR-401: the existing `onHostReady` hook and the host's own event stream are the owners |
| B: commands to a remote Agent | Fail | Fail | N/A | Fail | AR-401: the root's host command path (`postToHost`, host interrupt, `stopRoot`) |
| Admission, bounds, link authority | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Clear? | Sound? | Supports Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/remote/remote-run-observation.ts` | Pass | Pass | Pass | Pass | — |
| `remote-collaboration/inbound/remote-run-view-provider.ts` | Pass | Pass | Fail | Fail | AR-401 |
| `ActiveCollaborationRootDirectory` listener | Pass | Pass | Pass | Pass | Correct for root replacement; see AR-401 for host replacement |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RemoteRunObservation` for the three A roots | Pass | Pass | Pass | Pass | — |
| The member address of a remote agent | Fail | N/A | Fail | Fail | AR-402: one source, the stored link |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning? | Redundant Removed? | Overlap Controlled? | Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Observation frame `{agentRunId, memberAddress, message}` | Pass | Fail | Fail | N/A | Fail | AR-402: `memberAddress` duplicates what A's link stores |
| `remote_task_execution_summary {node, run, title?, statuses[], reachable}` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| A-side files | Pass | Pass | N/A | Pass | — |
| B-side files | Pass | Fail | N/A | Fail | AR-401: the standalone root (host source, host commands) is missing from the B file list |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None (additive) | Pass | N/A | Pass | Pass | Dead code in touched files removed as found |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path? | Clean Cut? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| A peer without the new routes | No | Pass | Pass | Rule 9: it fails like any call |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate? | Migration | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| None new | Not Affected | Pass | Pass | N/A | Pass | Root events are non-persisted; summaries and projections are read on demand |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1 … 6 | Pass | Pass | Pass | Pass (once AR-401 adds the standalone root to step 2) |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Sidebar rows | Yes | Pass | N/A | Pass | — |
| B's per-kind source and command path | Yes | Fail | N/A | Fail | AR-401 |

## Material Premise Validation

### `MP-401` — The user opens a remote **Agent** (the slice 1 / 245 case) and watches it

- Initiating basis: `User`. AC-801 / AC-802: alpha's agent delegated an Agent to beta; the user opens it in alpha's window.
- Path on B: the delegation created a standalone run whose host is an `AgentRun` held by `StandaloneHostAgentHandle`. The host's output is published on its own Agent stream (`/ws/agent/:runId`; `standalone_agent_run_root.md:16-17`). The root's publisher carries its **children's** `agent_presentation` (`standalone-agent-run-root.ts:375-385`). DS-002 / DS-006 attach to "the run's root" events.
- Consequence: no frames reach A for the remote Agent's own output, so REQ-802 fails for remote Agents.
- Reachability: `Reachable` (every remote Agent delegation).

### `MP-402` — A remote Agent idles out, then the user's message wakes it

- Initiating basis: `System` / `User`. AC-805.
- Path on B: `StandaloneHostIdleShutdown` terminates the host `AgentRun`; the root stays registered, so no `onDeactivated`. The owner's message restores the host through `ensureReady` (a new `AgentRun`; `onHostReady` fires). No `onActivated` fires, because the root never left the directory.
- Consequence: a subscription bound to the old host is stale, and DS-006's "A sees output again after a message wakes the run" does not hold for Agents. Separately, DS-004's "B root (link checked) executes" a post: for a standalone host, root commands to the host are rejected (`AGENT_ROOT_HOST_COMMAND_REJECTED`), and host input goes through `postToHost`.
- Reachability: `Reachable`.

### `MP-403` — B sends frames for a B-local delegated copy inside the remote run

- Initiating basis: `System`. A remote coordinator (247) delegates further on B (C-26 of 247: "local delegation works"). Its copy's `agent_presentation` is published on B's Team root.
- Path: DS-002 says "frames … of the linked run's agents". A's link knows only the remote run's own agents (host or members).
- Consequence: A would build a `member_address` for an agent that is not in A's tree. The window's row builders throw on rows they cannot place (`runHistoryTeamExecutionRows.ts` throws on inconsistent rows).
- Reachability: `Reachable`.
- Review consequence: AR-402.

### `MP-404` — The observation stream drops while a remote run is open

- Initiating basis: `Operational`. B restarts or the network drops (REQ-804 names this failure class).
- Path: DS-002 "When the stream ends or fails, the observation stops. The next viewer or Retry reopens it." Nothing publishes a state change.
- Consequence: the open view keeps its last frame and looks live. REQ-804 requires the failure to show plainly.
- Reachability: `Reachable`.
- Review consequence: AR-403.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Current-State Read: "B: a root's sequenced events are available while the root is active" | True for Team roots; a standalone root's host output is not on its root events | Correct it in the revision (AR-401) | Open |

## Review Decision

`Fail` (`Design Impact`, AR-401 … AR-403). A-side ownership is right and well argued. The B side needs to account for how a remote **Agent** actually runs on its node.

## Findings

### AR-401 — On node B, a remote Agent's output, commands and readiness live on its host, not on its root

- Type: Design Impact
- Severity: High (blocking)
- Protects: REQ-802 (live view), REQ-803 (talk to it), REQ-805 / AC-805 (the real state after idle, and a message restores it), REQ-806 ("the same for Agent and Team runs"), DEC-804 (stop, terminate)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: MP-401, MP-402.
  - `standalone_agent_run_root.md:16-17, 169-178`: the host streams on `/ws/agent/:runId`; collaboration-stream commands target children only, and a host command is rejected.
  - `standalone-host-agent-handle.ts`: the host is its own `AgentRun`, made ready by `ensureReady`.
  - `standalone-host-idle-shutdown.ts`: idle shutdown terminates the host, not the root.
  - `standalone-agent-run-root.ts:207`: `onHostReady` is the existing hook where a new host is bound.
- Required update: give B one owned way to **observe and command a remote run's own agents**, per root kind, behind `RemoteRootDirectory`, so that `RemoteRunViewProvider` never knows the difference. A suggested shape:
  - a root API `observePairedAgents(onPresentation)` returning a subscription, plus `executeOwnerCommand(agentRunId, command)`, implemented by each root kind for its back-link's paired agents (247's `pairedAgentRunIds`);
  - **standalone (a remote Agent):** presentation from the host's own run events, adapted with the same presentation adapter the root uses for its children. The subscription follows the host through `onHostReady`, so a woken host is re-attached with no reconnect. Statuses come from the host. `post_message` goes through the host input path (`postToHost`, which makes it ready); `interrupt` goes to the host run; `terminate` → the manager's `stopRoot` (history kept). Projection: the host's run projection, as B's own window reads it;
  - **Team root (a remote Team):** the root publisher filtered to the members; root replacement after the quiet idle shutdown is followed through the directory listener (DS-006, as designed); member commands through the Team root's member command path; `terminate` → the Team manager's stop.

  Correct the Current-State Read and the CM-11 wording, and add the standalone root files to the B side of § Change Scope and the file mapping.
- Why proportionate: it reuses the existing hooks (`onHostReady`, the presentation adapter, `postToHost`, `stopRoot`). It adds one root-owned API instead of a provider-side branch per kind.
- Recommended recipient: Solution Designer

### AR-402 — Remote frames must be identified by agent run ID against the stored link, and B sends only the linked run's own agents

- Type: Design Impact
- Severity: Medium (blocking)
- Protects: REQ-801 / REQ-802 (rows and views consistent with the tree), REQ-806; the window's row invariants
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - MP-403.
  - A's Team link already stores each member's mounted address: B's starter `mounted(...)`, and A's link built from it (`remote-team-run-starter.ts:87-94`, `remote-delegation.ts:135`).
  - DS-002 instead recomputes "the link's address plus the member's address" from B's frame. That is a second derivation of the same mount, and it accepts any agent B sends.
- Required update:
  - **B:** frames and summary statuses cover only the remote run's paired agents: the host, or the Team's members (the same set as AR-401's API). B-local delegated copies inside the remote run are not sent; they are visible in B's window (S3 or a later slice may add them).
  - **A:** `RemoteRunObservation` maps a frame by `agentRunId` to the stored link (an Agent link → its address; a Team link → the member's stored address). A frame for an unknown agent run ID is dropped with a warning. The frame then needs no `memberAddress` (`{agentRunId, message}`), or B's is ignored; say which.
- Why proportionate: one source of truth (the link) and one filter on each side.
- Recommended recipient: Solution Designer

### AR-403 — A stream that ends unexpectedly must show as a failure, not as a quiet view

- Type: Design Impact
- Severity: Low (blocking: it is phase 1's one failure behavior)
- Protects: REQ-804 ("when a request to the other node fails, the row or view shows the error plainly"), AC-804
- Scope status: Within Approved Scope (no reconnect added; DEC-807 kept)
- Changes approved behavior: No
- Evidence: MP-404. DS-002 / DS-005 stop the observation silently when the stream ends.
- Required update: when an observation stream ends without A closing it, `RemoteRunObservation` runs the same summary fetch as Retry, once. Its result sets the row truthfully: `reachable: false` → "Couldn't reach {node}." with Retry; or the run's real state (offline, or gone). There is still no automatic reconnect: Retry or the next viewer reopens the stream.
- Why proportionate: it reuses the existing summary fetch at the one owner; no new state.
- Recommended recipient: Solution Designer

### Non-blocking notes

- N-401, stream identity: request answers carry the responder's `nodeId`, and `PeerClient` checks it (191 AR-004). Do the same for the observation stream: B's first frame names its `nodeId`, and A accepts frames only after that check.
- N-402, invariant: no server-side consumer on A (title derivation, usage, history summaries) may treat `remote_agent_presentation` as a local `agent_presentation`. The DTO projector is the only place it becomes `agent_presentation`. State it in the design and pin it with a unit test.
- N-403: the three member-projection resolvers on A each "check their root's remote links first". If the check and the channel call are more than one line, put them in one shared helper beside `RemoteRunObservation` (principle 13).
- N-404 (REQ-803): tell the user about the clarification ("recorded on the remote run's node and shown here", not "recorded on both nodes") in the next summary, since he approved the earlier wording.

## Classification

`Design Impact` (AR-401, AR-402, AR-403).

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`)

## Residual Risks

- RSK-801: one socket per observed run while A has viewers (phase 2 measures).
- RSK-802: output during a viewer gap is not lost (B stores it); it appears in the next projection.
- RSK-201, RSK-401: unchanged. The new capability is limited to runs the caller's delegation started.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-401 … MP-404 reachable, with complete witnesses)
- Notes: classification `Large` / `High` confirmed. Design at commit `fee1d70cda` (SR-004).
