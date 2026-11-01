# API/E2E Test Review Report — restart-resume (autobyteus-285)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/`.

## Review Meta

- Review Round: 1
- Trigger:
  - API/E2E engineer, API-REV-002 (round 2), `Pass`, final confidence 95.1%.
  - Code `82932a8b48` + `7d9a305627`, from a clean checkout of `8fd49bd25a`; evidence `c46702ca34`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002; REQ-003 as redefined in SR-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: SR-001 to SR-005
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001 to FU-004; FU-004 absorbed in SR-005)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-001 to ARCH-REV-003 (untracked; owned by the architecture reviewer)
- Implementation Revision Record Reviewed As Context: IR-001, IR-002
- Original Code Review Report: `code-review-report.md` (CRR-001 to CRR-003)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: API-REV-001, API-REV-002
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` (API-REV-002)
- Final Validation Confidence: 95.1%
- Prior unresolved test-review findings rechecked: None
- Project testing guideline applied: `TESTING.md`. Temporary data only; the user's app, data and containers were untouched. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-A, SCN-B; the race cases contracted by AR-002 and SR-005)

## Changed Durable Test Scope

Temporary probes, logs and screenshots are evidence, not durable test code. `evidence/API-285-server-probe.mjs` and `evidence/API-285-desktop-probe.mjs` are temporary probes kept as evidence.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| — | — | — | — | No repository test code was added, updated or removed during API/E2E (API-REV-001 or API-REV-002). `git diff --name-only 8fd49bd25a c46702ca34` outside `tickets/` is empty. |

- No durable test file changed: `Yes`
- Review result when no durable test file changed: `Not Applicable`
- The branch's durable tests are the implementation's, reviewed in CRR-001 and CRR-003.

### Evidence-quality note on the probes

The probes are not reviewed as test code, but F-API-001's resolution rests on their per-target verdicts, so I read them.
- `API-285-server-probe.mjs:340-351` checks SR-005's rules directly:
  - more than one notice;
  - an archived run (archive `success: true`) that was resumed, has a notice or had a model turn;
  - for a messaged run: the user message lost; a resumed run without exactly one notice; a notice after the user message; a first model call that wasn't the notice; a notice turn after the user message in history; a run not resumed but carrying a notice.
- These are outcome checks (log outcome, projection, model-call order), not ones that trivially pass. The 0 violations in API-04E (3 samples, 42 targets) are meaningful evidence.

## Proportional Test-Code Checks

N/A: no durable test changed during API/E2E.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.
- Notes for delivery, not findings:
  - **O-2:** an archive that lands during the restore is logged at warn level, "could not resume …: not accepting execution operations", and counted as `failed`, not `skipped`. Nothing is posted, so the behavior is correct and only the log classification is imprecise.
  - **Durable gap that API/E2E recorded:** that a user's post and the notice reach the same `AgentRun` instance (the property the first-input rule relies on) is proven live 45 times, but no repository test covers it end to end. The unit tests cover the rule on a real `AgentRun` and the restore-posts-no-input behavior per place.

## Latest Authoritative Result

- Result: `Not Applicable` (pass to delivery)
- Changed durable test paths reviewed: none
- Unresolved finding IDs: None
- Recommended Recipient: delivery engineer
- Notes:
  - Code under delivery: `ab4ba6e7dc`, `b4d770d364`, `b50e2354ab`, `82932a8b48`, `7d9a305627`.
  - The architecture reviewer's `design-review-report.md` and `architecture-review-revision-record.md` are still untracked in the worktree; delivery should get them committed by their owner, or confirm their status.
  - The real Squirrel install is user-only. The Docker in-place update was not testable (it needs a signed feed and a matching image).
