# Code Review Revision Record

Package `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction`.

The latest `code-review-report.md` or `api-e2e-test-review-report.md` remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 — `IR-001` from `/implementation_engineer` | N/A | Pass (9.3/10) | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 — `API-F-001` (`API-REV-001`) from `/api_e2e_engineer` | Pass | Fail — `Local Fix` → `/implementation_engineer` | `CR-001` (new) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 — `IR-002` delta (`63e6fb0e4`) from `/implementation_engineer` | Fail | Pass (9.3/10) | `CR-001` (resolved) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review, round 1 — `API-REV-002` pass from `/api_e2e_engineer` | N/A (first test review) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of Projects slice 1

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-report.md`
- Review entry point and round: Implementation Review, round 1.
- Triggering role, report path, and finding or scenario IDs:
  - Role: `/implementation_engineer`.
  - Report: `implementation-handoff.md` (`IR-001`), covering commits `6563fd69f` and `816fd4db5` on base `1676bede9`.
  - Scenarios: `SCN-001` to `SCN-006`.
- Relevant solution revision IDs: `SR-001`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - This is the initial baseline.
  - The full diff was reviewed against the approved requirements, the `SR-003` design, and the `ARCH-REV-002` residual risks.
  - The reviewer re-ran the changed-area tests: server 83/83 and web 254/254 pass, and both localisation guards pass.
  - A clean base worktree confirmed that the 4 Skill Improvement test failures are pre-existing.
- Supported product scenario / material-premise basis changes: None. `P-001` to `P-003` are confirmed in the code. Candidates C-01 to C-11 were all rejected with reasons (see the report's Candidate Gate).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (baseline). Task size `Large` and architectural risk `High` are confirmed.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: see the report's Residual Risks:
  - the handoff under-reports the base-failing SI notification tests;
  - `WorkspaceSelector` has pre-existing English literals;
  - `ProjectDialogFrame` is Projects-local;
  - the branch is 15 commits behind its target;
  - browser-level AC-011, AC-001, AC-002 and AC-009 coverage is still pending.

### CRR-002 — Failure-origin review of API-F-001 (keyboard link of an existing workspace)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-report.md`. The round 2 meta, the Failure-Origin Analysis, C-12, `CR-001`, scorecard row 8, the Classification and the Latest Authoritative Result were updated.
- Review entry point and round: API/E2E Failure-Origin Review, round 2.
- Triggering role, report path, and finding or scenario IDs:
  - Role: `/api_e2e_engineer`.
  - Report: `api-e2e-execution-coverage-report.md` (`API-REV-001`).
  - Finding and scenario: `API-F-001`, `E2E-007` (AC-011, REQ-013, QR-003).
- Relevant solution revision IDs: `SR-001`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (`CRR-001`)
- Current authoritative result: `Fail`, classified as `Local Fix` (implementation-owned).
- What changed in the review result and why:
  - The failure is confirmed as a real product defect on a supported normal scenario: the SCN-003 default path under AC-011.
  - `SearchableSelect.vue`, the shared control embedded through `WorkspaceSelector`, does two things wrong here:
    - it teleports its popover outside `ProjectDialogFrame`'s keyboard-owning panel;
    - it renders pointer-only options.
  - As a result, a keyboard-only user cannot select an existing workspace, and focus escapes the modal.
  - The test is valid, and the environment and execution are sound: the failure was deterministic in 5 of 5 runs.
  - The design's reuse decision is adequate. The fix is an additive keyboard/focus correction in the shared control's owner, with explicit constraints and a `Design Impact` escalation condition.
- Supported product scenario / material-premise basis changes: None. C-12 was added and promoted to `CR-001`.

#### Prior Finding Resolution

None. No findings were open in `CRR-001`.

- New or remaining finding IDs: `CR-001` (open, High)
- Material score or classification changes:
  - The round 1 Runtime Correctness score (9.0) is invalidated by `CR-001`, and the next source-review round re-scores it.
  - Review gap acknowledged: CRR-001 accepted the `ProjectDialogFrame` focus trap (C-01) without reading the embedded `SearchableSelect`, where both defects were visible. The defect was reasonably detectable in source review.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - The fix touches a shared control. Pointer and visual behavior must stay unchanged for the run-config and application-setup consumers.
  - Escalate as `Design Impact` if the fix cannot stay additive.
  - The durable API/E2E test files remain unreviewed until a passing rerun.

### CRR-003 — Delta review of IR-002 (SearchableSelect keyboard fix for CR-001)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/code-review-report.md`. The round 3 meta, the "Round 3 — `IR-002` Delta Review" section, `CR-001` status, scorecard row 8, Residual Risks, the Classification and the Latest Authoritative Result were updated.
- Review entry point and round: Implementation Review (delta), round 3.
- Triggering role, report path, and finding or scenario IDs:
  - Role: `/implementation_engineer`.
  - Report: `implementation-handoff.md` (`IR-002`), commit `63e6fb0e4`.
  - Finding and scenario: `CR-001`; `E2E-007` / SCN-003 / AC-011.
- Relevant solution revision IDs: `SR-001`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`, `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` — `Local Fix` (`CRR-002`)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - `IR-002` adds combobox/listbox keyboard and focus handling to `SearchableSelect.vue` only, and meets every constraint from `CRR-002`:
    - the owner is the shared control, with no cross-awareness;
    - the change is additive: teleport, positioning, filtering, props and emits are unchanged;
    - `WorkspaceSelector` and the dialog are untouched;
    - no escalation trigger was hit.
  - The required specs are present and pass. `SearchableSelect.keyboard.spec.ts` has 8 tests. `ProjectWorkspaceLinkDialog.keyboard.spec.ts` has 3 tests with the real components mounted in the document.
  - The reviewer ran the affected suites: 29 files / 221 tests pass. The broader run's only failures are the known base-failing `agentTeamRunStore` and `WorkspaceAgentRunsTreePanel.regressions` specs, which do not use the changed component.
  - Both localisation guards pass.
- Supported product scenario / material-premise basis changes: None. C-13 to C-16 were rejected with reasons.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (High) | Resolved | `IR-002`, commit `63e6fb0e4`; `CRR-002` Required correction | `SearchableSelect.vue` diff (ARIA roles; Arrow/Home/End/Enter; Escape and Tab `preventDefault` + `stopPropagation` + focus return to the trigger; selection focuses the trigger); `SearchableSelect.keyboard.spec.ts` 8/8; `ProjectWorkspaceLinkDialog.keyboard.spec.ts` 3/3 (keyboard-only link emits `saved`, two-step Escape, Tab back into the trap); `WorkspaceSelector` specs unchanged and passing |

- New or remaining finding IDs: None
- Material score or classification changes: scorecard row 8 is restored to 9.0, and the overall score is 9.3/10. Task size `Large` and architectural risk `High` are preserved.
- Recommended recipient: `/api_e2e_engineer`, with the informational pass notice to `/implementation_engineer`.
- Remaining risks or uncertainty:
  - Pointer users of the shared picker see a focus ring after selecting (cosmetic).
  - OS-level keyboard confirmation is pending in the E2E-007 rerun.
  - The durable API/E2E test files are still awaiting the proportional test-code review after a passing rerun.

### CRR-004 — Proportional test-code review after the API/E2E pass (API-REV-002)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/api-e2e-test-review-report.md` (new). `code-review-report.md` is unchanged and remains at `CRR-003` Pass.
- Review entry point and round: Proportional API/E2E Test-Code Review, round 1.
- Triggering role, report path, and finding or scenario IDs:
  - Role: `/api_e2e_engineer`.
  - Report: `api-e2e-execution-coverage-report.md` (`API-REV-002`, Pass, 95%).
  - Scenarios: E2E-001 to E2E-013, API-001 to API-006.
- Relevant solution revision IDs: `SR-001`, `SR-003`
- Relevant architecture-review revision IDs: `ARCH-REV-002`
- Relevant implementation revision IDs: `IR-001`, `IR-002`
- Relevant API/E2E revision IDs: `API-REV-001`, `API-REV-002`
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review; the source review was `CRR-003` Pass.
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Three durable test changes were reviewed proportionately:
    - the un-mocked server GraphQL e2e (`tests/e2e/projects/projects-graphql.e2e.test.ts`);
    - the browser probe (`tests/e2e/projects-feature-probe.mjs`);
    - the `test:e2e:projects` script.
  - All are scenario-aligned, isolated, cleaned up, and consistent with repository conventions.
  - The round-2 E2E-007 assertion change was judged a correct alignment with the combobox-popup contract accepted in `CRR-003`. It still forbids focus escaping to the page behind the modal and proves a persisted keyboard-only link.
  - No rerun was needed.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None. No test-review findings were open.

- New or remaining finding IDs: None
- Material score or classification changes: None. Task size `Large` and architectural risk `High` are preserved.
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - Optional cleanups: a shared registry-reset helper, and polling instead of `sleep(200)` in E2E-007.
  - Carried API/E2E residuals: the screen-reader exposure of the teleported listbox was not exercised; the registration-failure path is covered by spec only; Electron was not executed; zh-CN shows pre-existing selector literals; the branch is behind its target.
  - The durable tests are uncommitted, and delivery should commit them.
