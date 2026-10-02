# Code Review Revision Record

The latest `code-review-report.md` or `api-e2e-test-review-report.md` is authoritative for its current result. This record keeps the initial baseline and each later review delta.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `tickets/in-progress/agent-initiated-collaborators/code-review-report.md` | Implementation Review / IR-001 (`549510977`, `2dfbd1843`) | N/A | Pass | — |
| CRR-002 | `tickets/in-progress/agent-initiated-collaborators/code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 (Fail) | Pass | Fail (Local Fix) | CR-001, CR-002 (new) |
| CRR-003 | `tickets/in-progress/agent-initiated-collaborators/code-review-report.md` | Reclassification (user-directed) | Fail (Local Fix) | Fail (Design Impact) | CR-001 (reclassified), CR-002 |
| CRR-004 | `tickets/in-progress/agent-initiated-collaborators/code-review-report.md` | Implementation Review round 3 / IR-002 (`9b594693b`, SR-006) | Fail (Design Impact) | Pass | CR-001, CR-002 (resolved) |
| CRR-005 | `tickets/in-progress/agent-initiated-collaborators/code-review-report.md` | API/E2E Failure-Origin Review / API-REV-002 (Fail) | Pass | Fail (Design Impact) | DI-01 (new) |
| CRR-006 | `tickets/in-progress/agent-initiated-collaborators/code-review-report.md` | Implementation Review round 5 / IR-003 (`e2c658e3d`, SR-007) | Fail (Design Impact) | Pass | DI-01 (resolved) |
| CRR-007 | `tickets/in-progress/agent-initiated-collaborators/api-e2e-test-review-report.md` | Proportional API/E2E test-code review / API-REV-003 Pass | N/A (first test review) | Pass | — |

## Revision Entries

### CRR-001 — Initial implementation review: Pass

- Canonical review report updated: `code-review-report.md` (created).
- Review entry point and round: Implementation Review, round 1.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001). Scenarios RS-001 to RS-005.
- Relevant solution revision IDs: `SR-005`.
- Relevant architecture-review revision IDs: `ARCH-REV-003`.
- Relevant implementation revision IDs: `IR-001`.
- Relevant API/E2E revision IDs: `N/A`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: N/A.
- Current authoritative result: `Pass`. Score 9.3/10, with every category at 9.0 or above.
- What changed in the review result and why:
  - Initial baseline. BEH-001 to BEH-009 are confirmed against the code.
  - Typecheck is clean. The changed server tests pass 152/153; the one failure is pre-existing on base. Web passes 87/87.
  - The implementer's concurrency correction (the per-root `CollaboratorAdmissionQueue`) is accepted as an implementation-level mechanism for a supported scenario. The design's "serialize on the gate" premise was factually false (the gates are drain barriers), so this is not a Design Impact.
- Supported product scenario / material-premise basis changes:
  - The gate-serialization premise is reclassified (C-01).
  - The predecessor's C-08 rationale is corrected (C-02): the released behavior was fail-safe through the unique-address invariant.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none.
- Material score or classification changes: N/A (baseline).
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary). The implementation engineer gets an informational notice.
- Remaining risks or uncertainty:
  - AGY/ACP live exposure and the Team/Org UIs live.
  - The REQ-007 Org change.
  - Bring-in latency.
  - The pre-existing architecture-test failure.
  - C-11.

### CRR-002 — Failure-origin review: catalog Team copies lose their handoffs; Team-root copy rows unformatted

- Canonical review report updated: `code-review-report.md` (section "API/E2E Failure-Origin Review (Round 2)").
- Review entry point and round: API/E2E Failure-Origin Review, round 2.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001). F-01, F-02.
- Relevant solution revision IDs: `SR-005`.
- Relevant architecture-review revision IDs: `ARCH-REV-003`.
- Relevant implementation revision IDs: `IR-001`.
- Relevant API/E2E revision IDs: `API-REV-001`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Pass` (CRR-001).
- Current authoritative result: `Fail`, classified `Local Fix`, routed to the implementation engineer.
- What changed in the review result and why:
  - **F-01** is confirmed in all three roots. Member scope (handoffs and team instruction) is built from root-level or collaborator facts, never from a catalog copy's recorded `source`. In the Team root, catalog copy members also inherit the root team's authored instruction. This is a round-1 review gap: member-context construction for catalog copies was not traced.
  - **F-02** is confirmed: the Team-root `nameOf` formats only collaborator addresses.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None (no prior findings).

- New or remaining finding IDs: CR-001 (High), CR-002 (Medium).
- Material score or classification changes: not rescored. Runtime Correctness and API/E2E Readiness from round 1 are superseded.
- Recommended recipient: `/software_engineering_team/implementation_engineer`.
- Remaining risks or uncertainty:
  - The Agent-root copy instruction is assumed null, by the same code reading; it was not verified live.
  - The durable test review is pending a passing run.

### CRR-003 — CR-001 reclassified to Design Impact (user-directed)

- Canonical review report updated: `code-review-report.md` (section "Reclassification (CRR-003, user-directed)").
- Review entry point and round: API/E2E Failure-Origin Review, round 2 (reclassification only; no new evidence).
- Triggering role, report path, and finding or scenario IDs: the user, in conversation ("it should be classified as design issue"). CR-001.
- Relevant solution revision IDs: `SR-005`.
- Relevant architecture-review revision IDs: `ARCH-REV-003`.
- Relevant implementation revision IDs: `IR-001`.
- Relevant API/E2E revision IDs: `API-REV-001`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Fail`, classified `Local Fix` (CRR-002).
- Current authoritative result: `Fail`, classified `Design Impact` (CR-001) plus `Local Fix` (CR-002), routed to the solution designer.
- What changed in the review result and why:
  - The user judged CR-001 serious enough to be a design issue.
  - It is supported structurally: there is no owner for member scope across the three roots (duplicated, root-level derivation), and the design and file mapping omitted it.
  - The CRR-002 routing to the implementation engineer is withdrawn.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open, `Local Fix` (CRR-002) | Open, `Design Impact` | CRR-003 | Code paths cited in the report |
| CR-002 | Open, `Local Fix` (CRR-002) | Open, `Local Fix` (unchanged) | CRR-003 | — |

- New or remaining finding IDs: CR-001, CR-002.
- Material score or classification changes: the CR-001 classification changed from `Local Fix` to `Design Impact`.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: none new.

### CRR-004 — Rework review (IR-002, SR-006): one member-scope owner; Pass

- Canonical review report updated: `code-review-report.md` (section "Implementation Review — Round 3").
- Review entry point and round: Implementation Review, round 3.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002). CR-001, CR-002.
- Relevant solution revision IDs: `SR-006`.
- Relevant architecture-review revision IDs: `ARCH-REV-004`.
- Relevant implementation revision IDs: `IR-002`.
- Relevant API/E2E revision IDs: `API-REV-001` (the trigger).
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Fail` (CRR-003: Design Impact plus Local Fix).
- Current authoritative result: `Pass`. Score 9.3/10, with every category at 9.0 or above.
- What changed in the review result and why:
  - `resolveMemberCollaborationScope` is the single owner of member handoffs and instruction in all three roots, fed by the hosting TeamRun's own context.
  - The special cases are removed.
  - Org cross-placement handoffs are preserved (AC-012).
  - A catalog Agent copy in a Team root no longer inherits the root-team instruction.
  - The Team-root row naming covers catalog copies.
  - Typecheck is clean; the affected suites are green apart from a base-verified pre-existing failure; web passes 87/87.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open, Design Impact (CRR-003) | Resolved | SR-006, ARCH-REV-004, IR-002 (`9b594693b`) | `member-instance-scope.ts` and its tests; `agent-org-member-scope.test.ts`; the Team-root and Agent-root copy-scope tests |
| CR-002 | Open, Local Fix | Resolved | IR-002 | `readsAsDisplayName`; `agentSourceSelectors.spec.ts`; `render-check-aic-team/` |

- New or remaining finding IDs: none.
- Material score or classification changes: the round-3 scorecard replaces round 1's. The result is Pass.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary). The implementation engineer gets an informational notice.
- Remaining risks or uncertainty:
  - Live recheck of the copy scope.
  - AGY/ACP live exposure.
  - The pre-existing base test failures (model-selection save; the architecture boundary test).

### CRR-005 — Failure-origin review of API-REV-002: Org copy placement is a Design Impact

- Canonical review report updated: `code-review-report.md` (section "API/E2E Failure-Origin Review (Round 4, API-REV-002)").
- Review entry point and round: API/E2E Failure-Origin Review, round 4.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002). DI-01.
- Relevant solution revision IDs: `SR-006`.
- Relevant architecture-review revision IDs: `ARCH-REV-004`.
- Relevant implementation revision IDs: `IR-002`.
- Relevant API/E2E revision IDs: `API-REV-002`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Pass` (CRR-004).
- Current authoritative result: `Fail`, classified `Design Impact`, routed to the solution designer.
- What changed in the review result and why:
  - DI-01 is confirmed in the source. The Org adapter hosts every copy with the delegator's host (`agent-org-task-execution-adapter.ts:86`), as DS-003 ("host rule unchanged") prescribes, so an Org-level catalog copy delegated by a mounted Team member is persisted and shown under that Team.
  - The Team root places copies by address.
  - The design rule is inadequate and inconsistent across roots. This is not an implementation defect.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-004) | Resolved; live-confirmed | API-REV-002 | Copy `get_handoff_rules` names its own mate, and the mate is reached before the report (Claude, Codex, AGY) |
| CR-002 | Resolved (CRR-004) | Resolved; live-confirmed | API-REV-002 | Desktop Team-root names |

- New or remaining finding IDs: DI-01 (Design Impact).
- Material score or classification changes: none to source scores.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - The side effect for mounted members' copies of other Org-level addresses is for the designer to decide.
  - Stored-run placement continuity should be confirmed in the design.

### CRR-006 — Placement-by-address review (IR-003, SR-007): Pass

- Canonical review report updated: `code-review-report.md` (section "Implementation Review — Round 5").
- Review entry point and round: Implementation Review, round 5.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-003). DI-01.
- Relevant solution revision IDs: `SR-007`.
- Relevant architecture-review revision IDs: `ARCH-REV-005`.
- Relevant implementation revision IDs: `IR-003`.
- Relevant API/E2E revision IDs: `API-REV-002` (the trigger).
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: `Fail` (CRR-005, Design Impact).
- Current authoritative result: `Pass`. Score 9.3/10.
- What changed in the review result and why:
  - `resolveTaskCopyHost` is the one owner of copy placement in all three roots. It is behavior-identical for the Team root, and the Org and Agent roots are now address-based.
  - Stored copies restore in place.
  - Typecheck is clean, and the affected suites are green apart from the base-verified pre-existing failure.
- Supported product scenario / material-premise basis changes: C-13 (a root-level delegator's copy of a mounted-Team address goes to the root) is rejected as consistent with REQ-012 and prior behavior.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| DI-01 | Open, Design Impact (CRR-005) | Resolved | SR-007, ARCH-REV-005, IR-003 (`e2c658e3d`) | `task-copy-host.ts` and its test; the Org and Agent-root placement tests, including stored-copy restore in place |

- New or remaining finding IDs: none.
- Material score or classification changes: Ownership and Runtime Correctness each +0.1.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary). The implementation engineer gets an informational notice.
- Remaining risks or uncertainty:
  - The live Org placement check.
  - The pre-existing base failures.

### CRR-007 — Proportional test-code review after API-REV-003: Pass

- Canonical review report updated: `api-e2e-test-review-report.md` (created).
- Review entry point and round: successful API/E2E test-code review, round 1.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-003, Pass, 96%).
- Relevant solution revision IDs: `SR-007`.
- Relevant architecture-review revision IDs: `ARCH-REV-005`.
- Relevant implementation revision IDs: `IR-003`.
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`, `API-REV-003`.
- Relevant delivery revision IDs: `N/A`.
- Prior authoritative result: N/A for test review. The source result is CRR-006 Pass.
- Current authoritative result: `Pass`, routed to the delivery engineer.
- What changed in the review result and why:
  - 2 durable test paths were reviewed: `agent-initiated-collaborators.e2e.test.ts` (added) and `standalone-agent-collaborator-mention.e2e.test.ts` (updated).
  - All checks pass. The instruction checks are properly guarded per runtime.
  - The DeepSeek key is handled from the process environment through the existing test-vault helper.
  - The SC-004 setup reproduces a supported edge.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None for test review. The source findings stay as recorded (CR-001, CR-002 and DI-01 resolved).

- New or remaining finding IDs: none.
- Material score or classification changes: N/A.
- Recommended recipient: `/software_engineering_team/delivery_engineer`.
- Remaining risks or uncertainty:
  - Grok/ACP is not live because of the quota (it shares the MCP catalog verified on three runtimes).
  - The pre-existing base test failures (`team-run-model-selection-save`, `application-framework-boundaries`) need a separate cleanup.
  - Org and Agent root files are at 480 and 471 lines.
  - C-11.
