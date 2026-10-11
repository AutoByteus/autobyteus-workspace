# Solution Revision Record — draft-run-id-validation

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Project Task 5f097b56 (OBS-001); resumed from the prior attempt's handover | N/A | N/A (prior attempt: investigation only, no approval) | Ready for Approval | BEH-001..008, REQ-001..008, AC-001..008, DEC-001..003 | Awaiting user approval |
| SR-002 | Mixed | User approval 2026-10-10 ("do it as you suggested"); architecture design | N/A | Ready for Approval | Approved; design Ready | REQ-001..009, AC-001..009 | design-spec.md; Small / High |
| SR-003 | Design | ARCH-REV-001 Fail (Design Impact) | AR-001, AR-002 | Design Ready (failed review) | Design Ready (revised) | REQ-008, REQ-002, AC-008 (wording only) | D2 dot-only rejection, tests, and removal of two dead exports |

## Revision Entries

### SR-001 — Requirements baseline

- Phase: Requirements — Initial Baseline.
- Trigger: `/project_task_manager` assignment 2026-10-10. The user decided "definitely do it now". The prior attempt was stopped (handover in Task context); its investigation notes were restored and re-verified on `origin/personal` @ `d28c56d5d`.
- Intended behavior: baseline. Approval pending; DEC-001..003 open.
- Design: N/A. Next action: user approval and DEC decisions, then architecture design.

- 2026-10-10 refinement within SR-001 (still pending approval): live re-probe confirmed BEH-001 on the running app. Recommendations were reasoned against industry practice at the user's request. DEC-002 is strengthened to a filename allowlist (REQ-008) and DEC-003 is revised to Yes (REQ-009, AC-009). The ID-rule rationale (shared `safeIdentity`, not a strict allowlist) is recorded. The worktree's git link had been pruned externally; it was recreated on the same branch with the ticket files preserved.

### SR-002 — Approval and design

- Approval: the user, 2026-10-10: "what is your suggestion, do it as you suggested." This approves the refined SR-001 baseline with DEC-001, DEC-002 (filename allowlist) and DEC-003 all Yes.
- Design: `design-spec.md`.
  - `safeIdentity` for `draftRunId`, `teamDraftId` and `agent_final.runId`.
  - Stored-filename allowlist.
  - Containment-guard error becomes a descriptor subclass (gives 400).
  - Agent-final route maps descriptor errors to 400.
  - Exact fields for `agent_draft` and `team_member_draft`.
  - `required()` removed.
- Classification: task_size Small, architectural_risk High (security trust boundary on a shared input contract).
- Next action: architecture review, per the handoff rules.

### SR-003 — Design revision for ARCH-REV-001

- Trigger: `/software_engineering_team/architecture_reviewer`, ARCH-REV-001 Fail (Design Impact). Report: `design-review-report.md`. Findings: AR-001 (Medium) and AR-002 (Low).
- AR-001:
  - D2 now states the dot-only rejection explicitly in the Intended Change, the Interface table and the Example.
  - Tests are added for `.` and `%2E` at three levels: codec unit tests, `INVALID_LOCATORS` integration cases (400 with `detail`, owner folder intact), and a draft `DELETE` probe row.
  - AC-008's trigger wording now names dot-only names explicitly. This is not a behavior change: REQ-008 already required "not dot-only", so no re-approval is needed.
- AR-002: the server exports `getStoredFilenameFromLocator` and `getDisplayNameFromStoredFilename` are confirmed dead (only their own unit test calls them). Both they and their test assertions are added to the removal plan. The web's separate same-named function is unaffected.
- Intended behavior changed: No. The approval basis (SR-002) is unchanged.
- Classification: unchanged (Small / High).
- Next action: re-review by the architecture reviewer.

### Review note: ARCH-REV-002 Pass (informational; not a new SR round)

- 2026-10-10: the round-2 architecture review **passed** on the SR-003 basis. AR-001 and AR-002 are verified as resolved.
- Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/design-review-report.md`.
- The reviewer routed the package to `/software_engineering_team/implementation_engineer`.
- No Solution Designer action is needed, and nothing is forwarded again.
