# Design Review Report — Remote Agent Teams (autobyteus-247)

## Review Round Meta

- Upstream Requirements Doc: `…/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `…/investigation-notes.md`
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-005)
- Reviewed Design Spec: `…/design-spec.md` at commit `73fd1e77ecf4b4d1cd88bf6487fb07e4cb623092` (SR-005)
- Supplemental Task Artifacts Reviewed: `validation-cases.md` (C-01 … C-35, G-1 … G-9, P-1 … P-4); the contract `autobyteus-server-ts/docs/design/collaboration_model.md`; `follow-ups.md` (FU-001)
- Relevant Solution Revision IDs: SR-001 … SR-005
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` (SR-005)
- Prior Review Round Reviewed: N/A (first review of this package)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: code and docs read in the worktree at `73fd1e77ec` (base `4a05909457`):
  - `standalone-agent-run-root/services/standalone-host-idle-shutdown.ts` (the mirror the design names: fire-time `tryPrepareAgentRunTerminationIfQuiescent` inside the root's gate, plus `hasOpenChildWork`);
  - `docs/modules/agent_team_execution.md` § Stop (lines ~355-380: Stop interrupts and terminates every member) and § Delegated Child Lifecycle (lines ~586-600: idle shutdown only when `tryPrepareTerminationIfQuiescent` succeeds; tool-approval waits and running background tasks are never quiet; "A Team copy is quiet only when every member is");
  - `agent-team-execution/task-delegation/team-task-execution-adapter.ts:243-244` (`tryShutDownIfQuiet` vs `shutDownForUser`);
  - `agent-team-execution/services/team-run-service.ts:99-150` (`createTeamRun` re-plans the layout from the definition through the planner);
  - `team-run-config.ts:53-60` (`TeamAgentLaunchSettings` / `TeamScopeLaunchSettings` = `AgentLaunchConfiguration` + address);
  - the validation evidence and P-1 … P-4.

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/tickets/in-progress/remote-agent-teams`

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`
- Classification rationale reviewed: yes. A new Team host path on B, a contract change in both directions, new persisted fields, a lifecycle addition, and auto-approve for every member.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: delegate to a shared Agent Team on a peer like a local Team copy. Any member is reachable and wakeable both ways with the delegator. Idle shutdown "once every member is quiet" and restore. Fence on Task closure; a saved Task to a remote Team refused. 245's launch rules.
- Relevant existing behavior and evidence confirmed: yes. `validation-cases.md` is an excellent, code-grounded basis; the cases I spot-checked hold.
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-301 | Contract | Pass | Pass | Pass | Confirmed | N-302 (member mapping into `createTeamRun`) |
| BEH-302 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-303 | Contract | Pass | Pass | Pass | Confirmed | N-301 (one representation of the pair rule) |
| BEH-304 | System | Pass | Pass | Fail | Confirmed (basis) | AR-301 (the idle stop must be quiet-checked) |
| BEH-305 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear? | Linked? | Complete? | Consistent? | Status Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `validation-cases.md` | Pass | Pass | Pass | Pass | Pass | — (C-16 / G-8 frame the idle stop as "stop the root"; AR-301 refines it) |
| `collaboration_model.md` (contract) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | § Task Design Health Assessment | — |
| Root-cause classification is evidence-backed | Pass | `Shared Structure Looseness`: one paired agent per endpoint; `coordinatingRun` for one direction only; the target run ID doubling as a root ID on B (G-1, G-2) | — |
| Refactor decision is explicit | Pass | Bounded: `targetRoot` both ways, paired sets, kinded links | — |
| Supported by concrete sections | Pass | Contract, ownership, removal plan | — |

The `targetRoot` cleanup is a good catch. It removes a rule that was true only by accident for standalone hosts.

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner Clear? | Naming Clear? | Ownership Clear? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 delegate to a remote Team | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 delegator → member | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 member → delegator | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 idle stop of a peer-started Team | Bounded local | Pass | Fail | N/A | Pass | Fail | Pass | Fail (AR-301) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RemoteRunLinks` (kinded links, back-link pairs, `teamLinkFor`) | Pass | Pass | Pass | Pass | Still membership plus `deliver` |
| `RemoteTeamRunStarter` → `TeamRunService.createTeamRun` | Pass | Pass | Pass | Pass | One owner of the mapping (G-9); N-302 |
| `RemoteMessageReceiver` (`targetRoot` by kind) | Pass | Pass | Pass | Pass | One rule both ways |
| `RemoteTeamIdleShutdown` → the Team root's lifecycle | Pass | Fail | Fail | Fail | AR-301: it reaches for the user Stop instead of the Team's quiet-shutdown mechanism |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-collaboration/inbound` → `TeamRunService`, `CollaboratorAdmission` | Pass | Pass | Pass | Pass | — |
| `agent-team-execution/services/remote-team-idle-shutdown.ts` → the Team root | Pass | Pass | Pass | Pass | Placement is fine |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `/rest/remote/messages` with `targetRoot {kind, runId}` + `target {agentRunId}` | Pass | Pass | Pass | Low | Pass |
| Delegated-runs answer union (`kind: agent` / `agent_team`) | Pass | Pass | Pass | Low | Pass |
| `RemoteEndpointLookup.isRemoteEndpoint` / `isRemoteTeam` | Pass | Pass | Pass | Low | Pass (split by subject) |
| `RemoteRunLinks.endpointFor` / `teamLinkFor` | Pass | Pass | Pass | Low | Pass |
| `RootTeamRun.acceptRemoteWorkPacket` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Team resolution and launches | Pass | Pass | N/A | Pass | 245's admission, port and resolver |
| Lazy member start, restore | Pass | Pass | N/A | Pass | P-1, P-2, P-4 |
| Idle shutdown of a Team | Pass | Fail | Fail | Fail | AR-301: the quiet-shutdown rules for Teams already exist (§ Delegated Child Lifecycle: "A Team copy is quiet only when every member is"; `tryPrepareTerminationIfQuiescent`); the design uses the user Stop instead |
| Team creation | Pass | Pass | Pass | Pass | `createTeamRun` plus `delegatedFrom` |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/remote/` | Pass | Pass | Pass | Pass | — |
| `agent-team-execution/` (Team root back-link, work packet, idle) | Pass | Pass | Pass | Pass | AR-301 is about the idle behavior, not the placement |
| `remote-collaboration/inbound/` (starter) | Pass | Pass | Pass | Pass | — |
| `run-history/store/` (kinded links, Team `delegatedFrom`, `agentRunIdsOfTree`) | Pass | Pass | Pass | Pass | One endpoint-set rule (SR-017) |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `delegatedFrom` type and parser on Team trees | Pass | Pass | Pass | Pass | The same `delegated-from-schema.ts` |
| `agentRunIdsOfTree` covering every store and validator | Pass | Pass | Pass | Pass | The standalone back-link parameter moves in |
| Peer-started root idle schedule (standalone and Team) | Pass | Fail | Fail | Fail | AR-301: build both on the same quiet-shutdown rule |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Remote Team link `{address, teamRunId, nodeId, coordinatorAddress, members, delegatorAgentRunId, startedAt}` | Pass | Pass | Pass | Pass | Pass | The coordinator is stored once (SR-004) |
| `RemoteTaskExecution` kinded union | Pass | Pass | Pass | Pass | Pass | — |
| Message body (`targetRoot`; `coordinatingRun` removed from messages) | Pass | Pass | Pass | N/A | Pass | — |
| Endpoint core: `allowsSender` / `allowsTarget` plus `pairedAgentRunIds` | Pass | Fail | Fail | Pass | Pass (non-blocking) | N-301 |

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-team-run-starter.ts` (new) | Pass | Pass | N/A | Pass | N-302 |
| `remote-team-idle-shutdown.ts` (new) | Pass | Pass | N/A | Fail | AR-301 |
| The rest of the mapping | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-collaboration/inbound/remote-team-run-starter.ts` | Pass | Pass | Low | Pass | — |
| `agent-team-execution/services/remote-team-idle-shutdown.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `REMOTE_TEAMS_NOT_SUPPORTED`, the message `coordinatingRun`, `pairedAgentRunId`, the standalone `backLinkEndpoint` parameter, the interim-refusal tests | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `coordinatingRun` → `targetRoot` in messages; the answer without `kind` | No | Pass | Pass | Rule 9 |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A's tree: the remote Team link | Not Affected (new optional fields) | Pass | Pass | N/A | Pass | Validated (members non-empty, coordinator among them); invalid → left out with a warning |
| B's Team tree: `delegatedFrom` | Not Affected | Pass | Pass | N/A | Pass | Tolerant read, exact write, key-set test |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1 … 6 (`targetRoot` on the Agent path first, kept green) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Team link JSON, spines, answer union | Yes | Pass | N/A | Pass | — |
| Idle stop decision | Yes | Fail | N/A | Fail | AR-301 |

## Material Premise Validation

### `MP-301` — The idle timer of a peer-started Team fires while a member is not quiet

- Related requirement: REQ-306 ("shut down after the idle grace period … **once every member is quiet**"), BEH-304; RSK-302.
- Initiating basis: `System`. A member of B's Team run (auto-approve on, REQ-303) starts a long tool action that the runtime runs in the background. Examples: a Claude `run_in_background` task, or an AGY background step (`agent_team_execution.md` § Delegated Child Lifecycle). Or the member waits for tool approval. That can only happen if approval mode applies, which it doesn't for remote runs, so the background case is the material one.
- Forward path: the member's status turns `idle` while its background task runs. With every member idle or offline, `RemoteTeamIdleShutdown` arms the grace timer. On fire, the design "stops the root through the manager's normal Stop", which interrupts and terminates every member (§ Stop).
- Material consequence: the member's running background work is killed, although the Team was not quiet. That contradicts REQ-306 and differs from every other idle shutdown in the product: delegated children and Team copies shut down only when `tryPrepareTerminationIfQuiescent` succeeds, and the standalone mirror checks the same at fire time.
- Reachability: `Reachable` (a supported runtime behavior, documented)
- Review consequence: AR-301.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Fail` (`Design Impact`, AR-301). Apart from AR-301 this is a strong design. The generalization is bounded, every G-point has a single owner, the contract cleanup removes an accidental rule, and the premises are reproduced. One correction is needed in the idle stop.

## Findings

### AR-301 — The idle stop of a peer-started Team must be a quiet shutdown, not the user Stop

- Type: Design Impact
- Severity: Medium (blocking)
- Protects: REQ-306 ("once every member is quiet"), BEH-304; preserved behavior: idle shutdown never interrupts open work anywhere in the product (§ Delegated Child Lifecycle); RSK-302
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: MP-301. Design § Ownership: "on fire stops the root through the manager's normal Stop". § Stop: Stop interrupts and terminates every member. The mirror it names, `StandaloneHostIdleShutdown`, does not do that: at fire time, inside the root's gate, it requires `!hasOpenChildWork()` and `tryPrepareAgentRunTerminationIfQuiescent`, and otherwise waits for the next quiet signal. The Team rule already exists for Team copies: "A Team copy is quiet only when every member is", with background tasks and approval waits never quiet.
- Required update: specify DS-004 as a quiet shutdown with the existing Team rules.
  - **Arm:** on idle, offline or error status of every started member, on a background-task end, and on a live-lease release. Cancel on `running` or `initializing`. This is the same signal set as the child schedule and the standalone mirror.
  - **Fire,** inside the Team root's gate:
    - skip if the root has open child work (delegated copies of its members) or a live lease;
    - prepare quiescent termination for **every started member**, all or nothing (`tryPrepareTerminationIfQuiescent`); if any member is not quiet, cancel the prepared ones and change nothing;
    - only then commit the stop of the root, keeping the package as Stop does.
  - **Reuse:** the quiet predicate and preparation the delegated Team-copy shutdown already uses (`team-task-execution-adapter.ts` `tryShutDownIfQuiet`), or extract that shared Team-quiet step. Do not write a second rule.
  - Add a unit case: a member with a running background task while idle → no stop.
- Why proportionate: it reuses an existing rule; the change is in one new file's behavior.
- Recommended recipient: Solution Designer

### Non-blocking notes

- N-301, one representation of the pair rule: the endpoint core gets the kind's `allowsSender` / `allowsTarget` rules and `pairedAgentRunIds`, "a set for display and wake lookup". For the `delegator` kind both say the same thing (the paired local agents). Derive the rule from the set, or the set from the rule, so they cannot diverge.
- N-302, member mapping into `createTeamRun`: `createTeamRun` re-plans the layout from the definition (`flat-team-topology-planner`), while the resolved `TaskTeamExecutionSource` comes from `CollaboratorEntryBuilder`. `RemoteTeamRunStarter` maps by `memberAddress`. It should pass a config for every planned member, and refuse (`AGENT_CANNOT_RUN`) if the planner's member set differs from the source's, so no member silently takes another launch. A unit test on a Team with a nested sub-team covers the flattening.
- N-303, link check before restore (optional): `RemoteMessageReceiver` restores the root named by `targetRoot` and only then runs the link check. A registered peer naming any Team run on B therefore makes B load that root before refusing. Slice 1 has the same order for standalone roots, and loading starts no runtime (P-1), so this is acceptable under RSK-101 / S6. Reading `delegatedFrom` from the stored tree before restoring is a cheap tightening if wanted.

## Classification

`Design Impact` (AR-301).

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`)

## Residual Risks

- RSK-201: every member auto-approves (accepted).
- RSK-301: an unused Team run on B after a failure on A, stopped by the idle schedule (accepted).
- RSK-302: Stop through the idle schedule must keep the package and restore cleanly; AR-301 makes it a quiet shutdown.
- FU-001 (global send across nodes) unchanged.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-301 reachable with a complete witness)
- Notes: classification `Large` / `High` confirmed. Design at commit `73fd1e77ec` (SR-005). One finding: AR-301. Three non-blocking notes: N-301 … N-303.
