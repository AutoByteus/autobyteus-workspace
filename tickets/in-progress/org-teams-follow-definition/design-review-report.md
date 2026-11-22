# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/requirements-doc.md` (Approved SR-007)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/investigation-notes.md`
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/solution-revision-record.md` (SR-001..SR-012)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-spec.md` (SR-012, commit `cbee164d55`; structure as passed at SR-010; Change Scope and Removal Plan rows aligned)
- Supplemental Task Artifacts Reviewed: `org-container-storage-contract.md` (normative, SR-011, aligned at SR-012: §5 recording rule, §9, new §11), `contract-validation.md`, `follow-ups.md`
- Relevant Solution Revision IDs: SR-011, SR-012
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-007`
- Current Review Round: `7`
- Trigger: SR-012 contract alignment after ARCH-REV-006 Fail (AR-008, AR-009)
- Prior Review Round Reviewed: 6 (`ARCH-REV-006`, Fail)
- Latest Authoritative Round: 7
- Current-State Evidence Basis: base `9f6add773b`. Opened for this round:
  - `agent-execution/services/standalone-agent-run-eligibility.ts:1-16`: an agent run with `applicationExecutionContext` is not collaboration-eligible;
  - `agent-execution/services/standalone-run-ports.ts:70-85` (`APPLICATION_HOST_STANDALONE_RUNS`);
  - `run-history/store/agent-run-metadata-types.ts:20` (`applicationExecutionContext` is a metadata field);
  - who can create an application-bound Org: `agent-org-run-service.ts:48,126` takes an optional `applicationBinding`. Its only creation caller is GraphQL `createAgentOrgRun` (`api/graphql/types/agent-org-run.ts:213-217`), whose `CreateAgentOrgRunInput` (`:40-45`) has no binding field. `application-orchestration/` and `application-platform/` never create Org runs (grep).
  
  ARCH-REV-006 evidence for `cross-run-message-delivery.ts:205-223` and `root-communication-engine.ts:286-289,315` still applies.

## Routing Classification Review

- Task size `Large`; architectural risk `High`. Independent review required: `Yes`. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The requirements are unchanged (SR-007).
- The contract now matches the reused code and the design:
  - §5 pins the recording rule for `same_container` pairs at the two code points. `counterpart` goes on both lines with Org addresses; the receiver line takes the boundary's `toOrg` sender address, never `senderIdentity.memberAddress`. There is a test comparing live and converted lines.
  - §11 gives one application-ownership rule for both unit kinds.
  - §9 and the design's Removal Plan agree that the task-records file stays as inert residue.

| Behavior ID | Status | Notes |
| --- | --- | --- |
| BEH-001..BEH-006, REQ-006, REQ-009, DEC-006 | Confirmed | As ARCH-REV-005; the contract matches |
| BEH-003 both logs, naming after reload (REQ-003, CM-9) | Confirmed | Contract §5 (AR-008 resolved) |
| Application-bound Orgs (Out of Scope) | Confirmed | Contract §11 and design Change Scope agree. See MP-09 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope | Linked | Internally Complete | Consistent With Core Artifacts | Status And Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `org-container-storage-contract.md` | Pass | Pass | Pass | Pass | Pass (normative) | — |
| `contract-validation.md` | Pass | Pass | Pass | Pass | Pass | — |

## Structural Verdicts

Every structural section of ARCH-REV-005 stands unchanged, because the design structure did not change: spines, boundaries, dependencies (Principle 16), interfaces (empty indirection Pass), reuse, allocation, structures, file mapping, placement, removal (task-records residue now consistent), legacy, persisted-data transition, change safety and examples. The two rows ARCH-REV-006 failed now pass:

| Section | Row | Verdict | Notes |
| --- | --- | --- | --- |
| Shared Structure / Data Model Tightness | Cross-unit log line `counterpart` | Pass | One stored shape for live and converted lines (contract §5, §9) |
| Shared Structure / Data Model Tightness | Unit application ownership | Pass | One rule for both kinds (contract §11) |

## Material Premise Validation

- `MP-08` (cross-unit naming after reload): resolved by contract §5.

### `MP-09` — An application-bound Org whose agent units carry `applicationExecutionContext`

- Related contract: Out of Scope ("application-bound runs keep their current behavior"); contract §11
- Initiating basis kind: `User`/`Operational`. An application, or the user, starts an Org bound to an application.
- Forward path: no supported surface does this. `AgentOrgRunService.create` accepts a binding (`agent-org-run-service.ts:48,126`), but its creation caller, GraphQL `createAgentOrgRun`, passes `CreateAgentOrgRunInput`, which has no binding field (`api/graphql/types/agent-org-run.ts:40-45`). Application orchestration never creates Org runs.
- Lifecycle consequence if it were reachable: an agent unit with `applicationExecutionContext` is not collaboration-eligible (`standalone-agent-run-eligibility.ts:7-8`), so it would lose `send_message_to` and `get_handoff_rules` across the Org.
- Reachability: `Not Reachable` today.
- Review consequence: no finding; a residual note for implementation.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. AR-008 and AR-009 are resolved, and AR-001..AR-007 stay resolved.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation, per the handoff rules, together with the storage contract. Implementation is in progress on SR-010.

## Residual Risks

Notes for implementation:

- **Live and converted lines:** implement contract §5's two code points (`cross-run-message-delivery.ts:214` treats `same_container` as not related for recording; `root-communication-engine.ts:315` takes the boundary's sender Org address). Add the reload test comparing a live line with the converted line for the same pair.
- **MP-09 (not reachable today):** if application-bound Orgs ever become reachable, `isCollaborationEligibleStandaloneRun` would exclude their agent units from collaboration. It would then need a contained-run exception. Not in scope now.
- **Contract examples:** the §2–§4 examples are normative fixtures. The released `skillAccessMode` key (F-1) belongs in the §9 migration fixtures.
- **Earlier notes (ARCH-REV-005) still apply:** coordinator self-target; migration registry classification and §9 fixtures, never run on real data; the exactly-once composition test; the release-note lines; FU-001.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-08 resolved; MP-09 Not Reachable)
- Notes: the storage contract is aligned with the reused writer and the design, and is ready to be normative for implementation. Classification is Large / High.
