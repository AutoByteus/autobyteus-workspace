# Code Review Report — autobyteus-247 Remote Agent Teams

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/tickets/in-progress/remote-agent-teams`

## Current Result — Implementation Review Round 2 (CRR-003)

This section is the latest result. Earlier results follow: CRR-002 (F-001 origin) and CRR-001 (round 1).

- Review Entry Point: `Implementation Review`, round 2
- Current Code Review Revision ID: `CRR-003`
- Trigger: IR-002 (fix `351b4dd93f`, documents `8df22369d9`), the Local Fix for F-001
- Review Scope: `Targeted Delta Review`. The delta `d69676f1d4..351b4dd93f` touches three source files (the result contract, the serializer, and one comment) and two test files. There is no change to a spine, an interface beyond the additive optional field, or the data model.
- Classification: `Large` / `High`, unchanged.

### Verification

| CRR-002 requirement | Evidence | Status |
| --- | --- | --- |
| `node` (optional, non-blank) on the Team variant of `DelegateTaskResultSchema` | `task-delegation-result-contract.ts:29`; the MCP output schema derives from it (`task-delegation-runtime-descriptions.test.ts` asserts the Team branch's optional `node`) | Done |
| The serializer copies `node` for both kinds | `toDelegateTaskResult`: `node` moved into the shared `extras`; the Agent result keeps the same keys and order | Done |
| Tests for a remote Team (with `node`) and a local Team (without), through the serializer and the schema | `collaboration-result-contracts.test.ts`, plus a remote Agent keeping `node`, a blank `node` refused, and the MCP output schema accepting a Team result with `node` | Done |
| C-7 (comment) | `team-run-remote-links.ts` now says "(flat) layout" | Done |
| C-1 (optional, `startedTeams` → `WeakMap`) | Not taken; it was optional | Still a note |

Checks relied on, at `351b4dd93f`, nothing rerun:
- IMP-07: typecheck and 443 tests across agent-tools, launch-source projection and remote collaboration.
- IMP-08: full server unit suite, 6,436 tests.

### Result

- Review Decision: `Pass`. F-001 is resolved in source; there are no new findings.
- Score: CRR-001's 9.3 overall stands; Runtime Correctness 9.2 (F-001 fixed at the tool edge).
- Next: API/E2E reruns the whole two-server E2E on a rebuilt dist (RC-21's `expect.soft` must pass), plus the new unit tests.

## Earlier Result — API/E2E Failure-Origin Review (CRR-002)

This section was the CRR-002 result; F-001 is resolved in CRR-003. The round-1 implementation review (CRR-001, Pass) follows, superseded by this failure.

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-002`
- Review Scope: `N/A` (failure-origin)
- Trigger: API/E2E round 1 (API-REV-001, commit `d69676f1d4`, on code `13131733b9`), failure F-001
- Coverage Investigation / Execution Report / API-E2E Revision Record reviewed: `…/api-e2e-coverage-investigation.md`, `…/api-e2e-execution-coverage-report.md`, `…/api-e2e-revision-record.md`
- Failing Scenario IDs: RC-21 (AC-301; REQ-304)
- Exact failing command / mode: the two-server E2E `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`, runs 2 and 3, failing at `:962` (`expect.soft`); reproduced independently by API-26's browser setup
- Failure Evidence Paths: `…/evidence/api-e2e/F-001-remote-team-result-without-node.log`
- Project testing guideline: `TESTING.md`; no conflict.

### Scenario basis

- REQ-304 states the remote Team result shape exactly: `{delegated: true, target_kind: "team", target_team_run_id, target_team_coordinator_agent_run_id, node}`.
- SCN-301 is Supported Normal. The test enters through the real `delegate_task` tool call on two real servers, so the test is valid.

### Origin

- **Classification: implementation defect** (`Local Fix`, owner Implementation Engineer). The code is this ticket's: the Team result shape is new here.
  - `RemoteDelegation.delegate` (`remote-delegation.ts:69`) sets `node` on every delegated remote outcome; that part is correct.
  - `toDelegateTaskResult` (`agent-tools/task-delegation/task-delegation-tool-serialization.ts:36-40`) copies `node` only in the `agent` branch.
  - **Also required:** the Team variant of `DelegateTaskResultSchema` (`agent-team-execution/task-delegation/task-delegation-result-contract.ts:24-31`) is a `strictObject` without `node`. Only the Agent variant has `node` optional. Adding `node` to the serializer alone would produce a result the strict contract rejects, wherever the result is validated against it.
- **Required fix:**
  - add `node` (optional, non-blank) to the Team variant of `DelegateTaskResultSchema`;
  - copy `outcome.node` in the serializer's Team branch;
  - add unit tests for a remote Team outcome (`node` present) and a local Team outcome (`node` absent) through the serializer and the schema.

  The contract comment already says "`node` is present only when the task agent runs on a peer node", which covers Teams too.
- **Review gap: yes.** In CRR-001 I recorded BEH-301's result as "the existing `{teamRunId}` target plus `node`" without opening the serializer and the result schema. Both are pre-existing files outside the change set that had to change for REQ-304. This was detectable by following the outcome to the tool edge.
- Not: a test, fixture or environment problem, a design impact (the design's file mapping names the Team result with `node`), or a requirement gap.

### Routing

- Recipient: Implementation Engineer (`/software_engineering_team/implementation_engineer`), per the rule "API/E2E failure-origin review confirms that the owning problem is an implementation defect".
- Then: a targeted source review of the fix, then API/E2E reruns the whole two-server E2E (rebuilt) plus the new unit test. API-25 and API-26 stay valid (serialization only).

## Earlier Result — Implementation Review Round 1 (CRR-001)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `…/requirements-doc.md` (approved SR-002)
- Investigation Notes Reviewed As Context: `…/investigation-notes.md`, `…/validation-cases.md` (as cited by the design)
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-006)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed As Context: `…/follow-ups.md` (FU-001 … FU-003); `collaboration_model.md` (CM-10 … CM-12, updated in this branch)
- Relevant Solution Revision IDs: SR-004 … SR-006
- Design Review Report Reviewed As Context: `…/design-review-report.md` (ARCH-REV-002 Pass; AR-301; N-301 … N-304)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `…/implementation-handoff.md` (including the nine Important Assumptions)
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: IR-001; code `9ec78440e2` and `13131733b9`, documents `824562b6a2`; range `173d336a2a..13131733b9`, excluding `tickets/`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`. The contract changes in both directions, new persisted fields are added (the Team link, and `delegatedFrom` on Team trees), a lifecycle addition (the quiet idle shutdown), and every member auto-approves.
- Independent source review required: `Yes`. Classification evidence: confirmed (about 58 source files across six subsystems).

## Review Scope

- Reviewed closely:
  - `remote-endpoint.ts`, `remote-run-links.ts`, `remote-delegation.ts`, `remote-task-activation.ts`, `remote-run-channel.ts`;
  - `peer-client.ts`, `peer-gateway.ts`, `remote-requests.ts`, `remote-refusals.ts`, `remote-refusal-codes.ts`;
  - `remote-delegation-receiver.ts`, `remote-team-run-starter.ts`, `remote-message-receiver.ts`, the composition;
  - `root-team-run.ts`, `team-run-message-delivery.ts`, `team-run-remote-links.ts`, `remote-team-idle-shutdown.ts`, `flat-team-topology-planner.ts` (typed error), `team-run-service.ts`, `agent-team-run-manager.ts`;
  - the stored-link checks in the standalone, Team and Org managers;
  - `root-task-execution-lifecycle.ts`, `root-task-execution-resource-scope.ts`, `task-execution-live-holds.ts`;
  - the data model (`run-execution-tree-shared-records.ts`, `run-execution-tree-shared-record-schemas.ts`, `remote-task-execution-links.ts`, `task-execution-tree-split.ts`, `coordinating-tree-shapes.ts`, `team-run-execution-tree-schema.ts`, the standalone store);
  - the web messages.
- Tests read: `team-remote-delegation.test.ts` (in-process A↔B), `remote-team-run-starter.test.ts`, `remote-message-receiver.test.ts`, `team-tree-delegated-from.test.ts`, and the changed remote and store tests.
- Exclusions: the two-server E2E. Its line 622 still expects `REMOTE_TEAMS_NOT_SUPPORTED`; the E2E for AC-301 … AC-306 is API/E2E's.

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`. No changed or newly discovered behavior.

| Behavior | Status | Implementation Path And Evidence |
| --- | --- | --- |
| BEH-301 | Confirmed | B: `RemoteDelegationReceiver` → `catalogTaskSourceOf` (Team source) → `RemoteTeamRunStarter.start` → `createTeamRun` with a config for every resolved member, the Team default (DEC-303), the temp workspace and auto-approve as resolved, and `delegatedFrom` on the tree. The answer union carries `coordinatorAddress` and the mounted `members`. A: `PeerClient` parses it strictly (coordinator among the members) → `RemoteDelegation.planActivation` gives target `{teamRunId}` with the coordinator as ingress → the Team link commit → a work packet with `targetRoot {agent_team}` to the coordinator. The result shape comes from the existing `{teamRunId}` target plus `node`. `REMOTE_TEAMS_NOT_SUPPORTED` is removed. |
| BEH-302 | Confirmed | `NO_DEFAULT_RUNTIME` now passes B's reason, which names the kind ("target agent team", REQ-302), and A adds the node. `AGENT_CANNOT_RUN` carries the specific reason. Layout drift (N-302): the planner's typed `TeamLayoutMismatchError` refuses before creation; a changed coordinator is detected after creation, the root is terminated, then refused. |
| BEH-303 | Confirmed | `delegated_team` endpoints, one per member (pair = the delegator; chain `[{teamRunId}]`; `targetRoot {agent_team}`). B's back-link pairs the delegator with every member (`peerStartedTeamMembers`). Inbound wake goes through the member's live lease (a not-started member starts on input). The work packet is for the coordinator only. Team-run-ID guidance (G-6) comes from `teamLinkFor`. Task closure fences the Team with `fenced_remote` (G-4). A saved Task for a remote Team is refused (G-3). |
| BEH-304 | Confirmed | `RemoteTeamIdleShutdown` (arm/cancel signals, an arm on open, an arm on lease release) → `RootTeamRun.shutDownIfQuiet()` in the gate: no open child work, no live lease, then the backend's `tryPrepareTerminationIfQuiescent()`. The prepared quiet termination is committed through `terminate(quiet)` without the freeze or fence, and a racing Stop cancels it. Restore: `storedLinkCheck` → `RemoteRootDirectory.team` → restore. Links on A and `delegatedFrom` on B persist through the shared split and the exact writer. |
| BEH-305 | Confirmed | B's Team run is an ordinary Team run (catalog row via `createTeamRun`). The work packet names the delegator's run ID and node. |

## Supported Product Scenario And Reachability Gate (Mandatory)

SCN-301 … SCN-305 are Supported Normal (requirements). The review relies on them and on the preserved boundary (local Team copies and Team runs; slice 1 and 245).

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| C-1 | `RemoteDelegation.startedTeams` (a `Map` keyed by team run ID) holds a Team answer from `planActivation` until `beginActivation`. If dispatch fails between them (Task link failure, root closing), the entry is never removed. | Reject as a finding; note | The supported failure path exists (RSK-301's window), but the consequence is a few bytes per such failure per process lifetime, with no behavior effect. Suggested tidy-up: a `WeakMap` keyed by the plan object, the pattern the task adapters already use (`this.plans`). |
| C-2 | `root-team-run.ts` is at 497 effective lines (from 471) | Reject (Pass) | Under 500. The work-packet logic was moved into `TeamRunMessageDelivery`. The next growth must go to an owned collaborator. |
| C-3 | `materializationGate` is a counting barrier, so `shutDownIfQuiet` does not exclude concurrent operations | Reject | In-flight deliveries hold live leases (`hasLiveLeases()` skips them). The per-agent quiescent preparation is the same all-or-nothing rule a Team copy's idle shutdown uses. A Stop racing it cancels the prepared termination. |
| C-4 | Agent-facing texts read "Agent" for a Team: `AGENT_CANNOT_RUN` "The Agent <Team> …" and `AGENT_NOT_FOUND`; and the `node` tool text "an agent on that node" | Reject as a finding; FU-002 and FU-003 stand | REQ-302's mandated text ("target agent team") is implemented. The others carry the specific reason. The wording owners are the design's text table and a user-approved pinned tool text, so a change belongs to the Solution Designer. Recorded by implementation as FU-002 and FU-003. |
| C-5 | A malformed `delegatedFrom` on a Team tree makes that tree unreadable | Reject | Contained to that run (the admission scan leaves it out), as for `run_metadata.json`. Consistent with DESIGN.md rule 7. |
| C-6 | A second work packet to the coordinator would post again | Reject | Not reachable: A sends the packet once and nothing retries (QR-101). |
| C-7 | The `peerStartedTeamMembers` comment mentions nested sub-team members, though Teams are flat (assumption 2) | Reject; note | A comment only |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | The three bounded refactors (`targetRoot`, paired sets, kinded links) are implemented as designed | — |
| Implementation matches behavior-defining supplements | Pass | The CM contract and `validation-cases.md` G-1 … G-9 are each addressed | — |
| Data-flow spine inventory clarity | Pass | DS-001 … DS-004 trace to code | — |
| Ownership boundary preservation | Pass | `RemoteTeamRunStarter` is the one owner of source → `createTeamRun`. The idle rule reuses the backend's quiescence. `RemoteRunLinks` is still the only reader of remote links outside the store. | — |
| Off-spine concern clarity | Pass | `team-run-remote-links.ts` is the one place of the Team back-link pairing, for the live root and the stored check | — |
| Existing capability reuse | Pass | `createTeamRun`, `TaskExecutionIdleShutdownSchedule`, `tryPrepareTerminationIfQuiescent`, `agentRunIdsOfTree`, `CollaboratorAdmission` | — |
| Reusable owned structures | Pass | `RemoteTaskExecution` union; `remoteTeamCoordinatorRunId`; `storedRemoteLinkCheck` shared by three managers | — |
| Shared-structure tightness | Pass | `pairedAgentRunIds` is the single pair representation (N-301). The Team link stores each fact once (the coordinator by address). | — |
| Repeated coordination ownership | Pass | The stored-link check uses the same `RemoteRunLinks.admitsInbound` as live roots | — |
| Empty indirection | Pass | Service-level `storedRemoteLinkCheck` methods are thin, but they keep `remote-collaboration` on the managers' public APIs (N-304) | — |
| SoC / file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass | `remote-collaboration` parses no root files (N-304); the managers read their stores | — |
| Authoritative Boundary Rule | Pass | The receiver depends on `RemoteRootDirectory` only | — |
| File placement | Pass | Matches the design's mapping | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `targetRoot` is explicit in both directions; the answer union is kinded; `isRemoteTeam` vs `isRemoteEndpoint` are split by subject | — |
| Naming | Pass | — | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch control | Pass | — | — |
| Dead code removed | Pass | `REMOTE_TEAMS_NOT_SUPPORTED`, the message `coordinatingRun`, `pairedAgentRunId`, and the standalone `backLinkEndpoint` parameter are gone | — |
| Tests clear and requirement-aligned | Pass | The in-process A↔B Team flow (AC-301, 303, 304, 305), the DS-004 cases, N-303, the starter's drift cases through the real planner, and the receiver | — |
| Fixtures/helpers reusable | Pass | — | — |
| No stale tests | Pass | The interim-refusal tests were removed. The two-server E2E line 622 is API/E2E's, as disclosed. | — |
| API/E2E readiness | Pass | — | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/root-team-run.ts` | 471 | 497 | Pass (pressure) | Pass | Pass | Pass | Future growth goes elsewhere |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 462 | 477 | Pass | Pass | Pass | Pass | — |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 472 | 472 | Pass | Pass | Pass | Pass | — |
| `agent-org-execution/services/agent-org-run-manager.ts` | 462 | 470 | Pass | Pass | Pass | Pass | — |
| `agent-team-execution/services/agent-team-run-manager.ts` | 435 | 448 | Pass | Pass | Pass | Pass | — |
| `remote-collaboration/inbound/remote-team-run-starter.ts` (new) | 0 | 97 lines | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | The message `coordinatingRun` is removed outright; answers without `kind` are malformed (rule 9) |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | `Not Affected`: new optional fields; stored Agent links read unchanged (no `kind` on disk) |
| No version-specific dual reads | Pass | — |
| Transition mechanics match | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

Docs impact: `Yes`, done in this change: `remote_collaboration.md`, `agent_team_execution.md` (peer-started Team runs, the quiet idle schedule), `agent_communication.md`, `agent_tools.md`, the CM contract, and the Nodes tab note (en, zh-CN).

## Additional Material Premise Validation

None new. AR-301 (quiet shutdown) is confirmed in code. N-302 is confirmed. N-303/N-304 are confirmed: the stored check runs behind the managers.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | DS-001 … DS-004 are readable; `targetRoot` removes the asymmetric guess | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | One starter, one pairing helper, one quiescence rule; N-304 respected | — | — |
| 3 | API / Interface Clarity | 9.3 | Kinded answer and links; `targetRoot` both ways | — | — |
| 4 | Separation of Concerns and File Placement | 9.0 | Placements are right | `root-team-run.ts` sits at 497 lines | Next growth goes to a collaborator |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One pair representation; the Team link stores each fact once | — | — |
| 6 | Naming Quality and Local Readability | 9.1 | Clear | Some long lines; the comment in C-7 | — |
| 7 | API/E2E Readiness | 9.2 | The in-process A↔B Team flow covers the ACs | The two-server E2E is not yet updated (API/E2E) | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | Drift, refusals, fence, quiet shutdown and stored checks are correct | C-1, a negligible leak on a failure path | A `WeakMap` keyed by plan |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.7 | Clean cuts | — | — |
| 10 | Cleanup Completeness | 9.4 | — | — | — |

## Findings

None.

Non-blocking notes for the Implementation Engineer, at their discretion:
- C-1: `RemoteDelegation.startedTeams` keeps an entry when dispatch fails between planning and activation. A `WeakMap` keyed by the plan object, as the task adapters key their `plans`, removes that.
- C-7: the `peerStartedTeamMembers` comment says "nested sub-team members included", while Agent Teams are flat (handoff assumption 2).

## Follow-ups

- Follow-ups this review added: None. FU-002 and FU-003 were already recorded by implementation; I agree they are outside this review's required corrections (C-4).

## Classification

N/A (Pass).

## Recommended Recipient

API/E2E Engineer (`/software_engineering_team/api_e2e_engineer`); informational notice to the Implementation Engineer.

## Residual Risks

- RSK-201: every member of a remote Team auto-approves (accepted).
- RSK-301: an unused Team run on B after a failure on A. It is stopped by the idle schedule, which also arms once at open.
- FU-001 (global send across nodes), FU-002 and FU-003 (wording).
- The two-server E2E still expects `REMOTE_TEAMS_NOT_SUPPORTED` at line 622 and has no Team cases yet. That is API/E2E's.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`, round 2 (CRR-003, targeted delta)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3 / 10; every category is at least 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer` (primary); informational notice to `/software_engineering_team/implementation_engineer`
- Notes: Classification `Large` / `High`, unchanged. Reviewed code `351b4dd93f`. Open findings: none. Notes: C-1 (optional).
