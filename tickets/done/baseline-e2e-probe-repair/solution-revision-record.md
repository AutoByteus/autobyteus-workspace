# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Project Task 6834441c (initial baseline) | N/A | N/A | Requirements Approved; Design Ready | BEH-001..BEH-011; REQ-001..REQ-012; AC-001..AC-012 | Architecture Design Complete (Medium / Low) |
| SR-002 | Evidence | PTM message 2026-10-17 (task-keys-and-dependencies finding) | N/A | Approved / Ready | Approved (unchanged) / Ready | BEH-001, BEH-004, BEH-007; UC-001, UC-004, UC-007 | Upstream overlap recorded; implementation refreshes base; no re-approval |
| SR-003 | Requirements | IR-001 Requirement Gap (implementation engineer, 2026-10-17) | IR-001 UC-006 gap; REQ-011 warning-case classification | Approved (SR-001) / Ready | Approved (SR-003) / Ready | UC-006, REQ-006, AC-006, SCN-007; DEC-009, DEC-010 | UC-006 withdrawn (removed upstream with a stated reason); warning case accepted as not a defect |

## Revision Entries

### SR-001 — Baseline: repair 8 stale server e2e suites and 3 stale web probes

- Phase and classification: `Initial Baseline` (requirements and design in one round).
- Triggering input: Project Task 6834441c from `/project_task_manager`; evidence `origin/personal:tickets/done/collaboration-model-contract/api-e2e-execution-coverage-report.md` §Failures.
- Triggering finding IDs: N/A.
- Prior status: N/A.
- Current status: requirements `Approved`; design `Ready`.
- IDs affected: BEH-001..BEH-011, REQ-001..REQ-012, AC-001..AC-012, SCN-001..SCN-012, DEC-001..DEC-008.
- Scenario-basis changes: SCN-007 (three-level released history refused) recorded as a Supported Explicit Edge Scenario under flat-Orgs REQ-013/AC-008.
- Why recorded: first coherent baseline.
- Sections: all sections of `requirements-doc.md`, `investigation-notes.md`, `design-spec.md` created.
- Supplements: none behavior-defining; evidence logs under `evidence/`.
- Product design evidence: N/A.
- Intended behavior changed: `No` (test-only; product behavior preserved).
- Approval: Solution Designer within the direction, user informed in the Solution Designer conversation on 2026-10-17; baseline = `requirements-doc.md` at SR-001.
- Supplement approvals: N/A.
- Design/review basis invalidated: N/A.
- Classification: `task_size=Medium`, `architectural_risk=Low` (test files only, existing public boundaries, no structural surface).
- Handoff: see `handoff-sr-001.md`.
- Downstream impact: none yet.
- Remaining gaps: RSK-001 (verify upgraded content during implementation), RSK-002 (R03 environment).
- Next action: route per handoff rules.

### SR-002 — Upstream overlap: UC-001, UC-007 fixed upstream; UC-004 ledger part in `fa49138794`

- Phase and classification: `Refinement` (evidence-only clarification with a design note).
- Trigger: message from `/project_task_manager` relaying the task-keys-and-dependencies delivery engineer's finding on `team-run-v1-production-upgrade`, and asking whether PMU-021 is in scope.
- Prior status: requirements Approved (SR-001), design Ready.
- Current status: unchanged; design notes updated.
- IDs affected: UC-001, UC-004, UC-007 (AC-001, AC-004, AC-007); BEH-004.
- Evidence: the finding confirms the SR-001 diagnosis for UC-004. `fa49138794` (ledger rows derived from the startup's statuses) is on `origin/personal` but not in the branch (base `66429d6f31`). Other tickets fixed UC-001 (`e6ba249a96`, `2e70401f18`, `57d388a7fd`) and UC-007 (`149bce0be9`) before the branch base. The implementation's pending UC-004 patch duplicates the ledger change. PMU-021 is not one of this Task's probes.
- Canonical sections changed: investigation Source Log (5 rows); design-spec Change Scope (SR-002 upstream status) and the UC-004 row of Final File Responsibility Mapping.
- Intended behavior changed: `No`. Approval impact: none; SR-001 approval still applies.
- Classification: unchanged (`Medium` / `Low`; smaller remaining scope).
- Handoff: implementation engineer told to refresh onto `origin/personal`, keep `fa49138794`, drop its duplicate ledger change, and treat UC-001/UC-007 as verify-only. PTM told: no duplication; PMU-021 stays in a1dfb6dc; 0c7efc37 can drop `team-run-v1-production-upgrade`.
- Remaining gaps: RSK-001 / the UC-004 warning-case finding (the flat migration fails on the seeded invalid history index) is being investigated by implementation under REQ-011. It comes back to the Solution Designer if it is a product defect.
- Next action: implementation continues.

### SR-003 — UC-006 withdrawn; UC-004 warning case classified

- Phase and classification: `Requirement Gap` (scope reduced to match the base).
- Trigger: IR-001 from the Implementation Engineer: `implementation-handoff.md`, Routing Classification and Known Risks.
- Finding IDs: IR-001 UC-006 Requirement Gap; the IR-001 REQ-011 classification of the UC-004 warning case.
- Prior status: requirements Approved at SR-001, design Ready (SR-002).
- Current status: requirements Approved at SR-003; design Ready.
- IDs affected: UC-006, REQ-006, AC-006 withdrawn; SCN-007 reclassified `Technically Possible but Unsupported`; DEC-009 and DEC-010 added; QR-001 scope adjusted; follow-up FU-3 withdrawn, FU-4 and FU-5 added.
- Evidence: `nested-team-history-restart.e2e.test.ts` deleted upstream by remove-nested-task-team (merge `8a8d322144`; `tickets/done/remove-nested-task-team/requirements-doc.md` DEC-001 (e), DEC-008, REQ-003, AC-001; its api-e2e-coverage-investigation lists the removal). The remaining coverage: UC-004 (one-level continuity), `tests/unit/app-data-migrations/team-agent-memory-layout-app-data-migration.test.ts`, `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` (`runAppDataMigration`). UC-004 warning-case evidence: `evidence/implementation/uc004-warning-case-*.txt`.
- Sections changed: requirements Document Status, UC-006, REQ-006, AC-006, SCN-007, Decisions (DEC-009, DEC-010), Traceability, QR-001; design-spec revision ID, Change Scope (in-scope line, follow-ups), behavior map BEH-006, the UC-006 and fixture rows of the file mapping.
- Intended behavior changed: product `No`; ticket scope `Yes` (one suite withdrawn, as the Task's done-criteria allow).
- Approval: Solution Designer within the direction (the Task allows "removed with a stated reason"; the removal itself was the user's decision upstream). User informed in the Solution Designer conversation, 2026-10-17. Baseline: `requirements-doc.md` at SR-003.
- Design/review basis: no architecture review on the direct route. Implementation IR-001 stays valid for every other item.
- Classification: unchanged, `Medium` / `Low`.
- Handoff: `handoff-sr-003.md`.
- Remaining gaps: none blocking.
- Next action: Implementation Engineer updates its handoff to SR-003 and continues on its route to API/E2E.
