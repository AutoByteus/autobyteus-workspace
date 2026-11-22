# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-015; REQ-004, REQ-009, AC-004, AC-008, DEC-002, DEC-005)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-015)
- Design Spec Reviewed As Context: `design-spec.md` (DS-006: "Org planner (pure: stored container + Org definition view + units' current members) → locked container write (units, formerUnits, Org rules)"; R-6)
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md` (the container keeps the Org rules; presence is derived at each read)
- Relevant Solution Revision IDs: SR-007, SR-015
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-010)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-005, ARCH-REV-010
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (§ IR-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-004 (`cd6a777b24`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Current Review Round: `6`
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E round 2 (API-REV-002, commit `9cd1e8d191`) failed on F-5 only; every round-1 finding is resolved and AC-001..AC-008 are otherwise proven
- Prior Review Round Reviewed: CRR-005 (implementation review, Pass)
- Latest Authoritative Round: 6
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-002
- Failing Scenario IDs: OC-13 (and the same warning observed in OC-04)
- Exact Failing Commands / Execution Mode: `tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` (built server, package files edited on disk)
- Failure Evidence Paths: `evidence/api-e2e/round-2/OC-01-13/OC-13.json` (`AGENT_ORG_DEFINITION_NOT_FOLLOWED: AgentOrg 'oc_org_6dcd80_…' keeps its units: Org definition 'oc-org-6dcd80' cannot be used (AgentOrg endpoint '/team/writer' was not found.).`)

Implementation reviewed against: `cd6a777b24` (unchanged since CRR-005).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review` (this round: API/E2E failure-origin review)
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None (unchanged from CRR-001).

## Review Scope

- Confirmed that OC-13 represents approved behavior, then traced only the Org-follow planning path. No general test review, no full audit; CRR-005's result stands for everything else.
- Established by `Read`, confirmed by API/E2E's runtime evidence (the exact warning text above, produced by the code path below).

## Failure-Origin Findings

### F-5 — a running Org stops following its Org definition while an Org rule names a member removed from its Team (OC-13)

- Scenario still approved: **Yes**.
  - REQ-004 / DEC-005: "an Org rule from or to a member no longer in its Team is left out until it returns". AC-004's trigger is exactly this state (the rule stays in the Org definition while the Team definition drops the member).
  - REQ-009 / DEC-002: the Org follows its Org definition (mount/unmount Teams, add/remove agents, Org rules).
  - Design DS-006: the Org planner works from the stored container, the Org definition view and **the units' current members**.
  - So the state is a supported, temporary one, not an invalid definition. Every other Org change must still be followed, and the rule kept for when the member returns.
- Production path (`Read`):
  - An Org definition change (or reopen) reaches `AgentOrgContainers.followDefinition` (`agent-org-containers.ts:58`), then `OrgMembershipPlanner.viewFor` (`org-membership-planner.ts:46-55`).
  - That calls `AgentOrgRunPlanner.resolveConfiguration`, the launch page's resolution, which compiles every Org handoff strictly (`CollaborationHandoffCompiler.compileOrg` → `resolveOrgEndpoint`, `collaboration-handoff-compiler.ts:153-179`).
  - `/team/writer` is checked against the mounted Team's **current definition**, which no longer has `writer`, and throws `AgentOrg endpoint '/team/writer' was not found.`
  - The catch turns the throw into `notFollowed`, so the Org keeps its units and rules and ignores every other change while the rule names the absent member.
  - `planAgentOrgContainer` compiles the Org rules a second time the same way (`agent-org-container-plan.ts:79`).
  - Only the read side (`OrgContainerDirectory.orgRulesFrom`) filters by presence, as DS-006 and DEC-005 intend.
- Origin: **implementation defect**, and an **earlier review gap** (mine). In CRR-001 I traced DS-006's follow path as sound but did not check that it reuses the launch page's strict compile, which REQ-004's own state fails. AC-004's tests (OF-04, OC-04's rule parts) pass because they make no Org change during the gap.
- Classification: `Local Fix` (implementation). The behavior is already decided (DEC-005, DS-006): the container keeps the Org rules as the Org definition writes them, and presence is derived at each read.
- Required action:
  - In the Org-follow planning (`viewFor` and `planAgentOrgContainer`'s Org-rule compile), accept an Org rule endpoint `P/x` when `P` is a mounted Team and `x` is not in its current definition (the member is gone from its Team). Keep the rule as written in the container's Org rules, so `orgRulesFrom` leaves it out until `x` returns and puts it back then, with the notices as today.
  - Keep refusing every other invalid rule as now (unknown direct placement, an Agent as an intermediate segment, more than two segments, empty or untrimmed rules).
  - One rule in one place. Do not loosen the shared compiler for other callers.
  - Tests:
    - a unit test of `OrgMembershipPlanner.viewFor` with such a definition: a view is returned, the rule is kept in the plan, a new unit or agent is planned, and a genuinely invalid endpoint is still not followed;
    - the reopen path (follow on reopen) with the same definition.
  - OC-13 then reruns.
- Launching a **new** Org from such a definition: the launch page's strict refusal is today's behavior, and REQ-004 speaks of a running Org's rules. Unchanged; not part of this fix. A new launch whose rule names a member its Team lacks was refused before this ticket as well.

## Review Scorecard (Mandatory)

Not repeated for a failure-origin round. Affected rationale: CRR-005's `Runtime Correctness And Behavioral Fidelity` 9.4 does not hold while F-5 stands (a REQ-009 behavior is blocked in a REQ-004 state). The bar of at least 9.4 in every category applies again at the next implementation review.

## Findings

| ID | Finding | Evidence | Required Action | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| F-5 | A running Org ignores every Org-definition change while an Org rule names a member removed from its Team: the follow planner compiles Org rules strictly, as the launch page does | Read; OC-13 runtime warning | Accept a mounted Team's absent member as a kept Org-rule endpoint in the follow planning only; other invalid rules still refused; tests (planner, reopen); OC-13 rerun | `Local Fix` | Implementation engineer |

## Follow-ups

- Follow-ups this review added: None.

## Classification

- F-5: `Local Fix`, implementation-owned. Large/High preserved.

## Recommended Recipient

Implementation engineer (`get_handoff_rules`: failure-origin review confirms an implementation defect). After the fix: source review (targeted delta), then API/E2E reruns the OC file. Launches are unchanged, so OF, `stopped-org-workspace` and OCU-05 need no rerun unless the fix touches the launch path.

## Residual Risks

- A user cannot launch a new Org from a definition whose Org rule names a member its Team lacks, while a running Org follows it. This is today's launch rule, outside REQ-004.
- FU-001 remains.

## Latest Authoritative Result

- Review Decision: `Fail` (API/E2E failure confirmed as implementation-owned)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Fail` (REQ-009 Org follow blocked in a REQ-004 state)
- Material-Premise Gate: `Pass` (the failing scenario is approved behavior)
- Score Summary: not rescored (failure-origin round)
- Failure Origin: F-5: implementation defect, also my earlier review gap
- Recommended Recipient: Implementation engineer
- Notes: The round-2 test changes (OC-04 asserts DEC-007; OC-12 and OC-13 added) match the approved behavior; no test-owned cause.
