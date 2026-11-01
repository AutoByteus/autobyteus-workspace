# API/E2E Test Review Report — integrations-page (autobyteus-337)

## Review Meta

- Review Round: `1`
- Trigger: API/E2E pass, API-REV-001 (test `b4b3c5a07d`, reports `62e541c9ae`; code under validation `9e8264614e`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-009; REQ-001…010, AC-001…009, DEC-002, DEC-015)
- Investigation Notes Reviewed As Context: through the design only
- Solution Revision Record Reviewed As Context: SR-009
- Design Spec Reviewed As Context: `design-spec.md` (SR-009; DS-004, DS-005)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-004 added by API/E2E)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95.4%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: root `TESTING.md`, as the coverage investigation records it. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (DEC-002 all installed skills; team-local members, DS-004; DEC-015 removal on the Skills page)

## Changed Durable Test Scope

`git diff --name-only 9e8264614e..HEAD` outside `tickets/` lists exactly the file below. The worktree is clean apart from untracked `dist/`.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | Updated (+95 −1): three no-model AGY cells | REQ-005, DEC-002, DEC-015, DS-004 (team-local) | The same surface as before: a run's own shell reaching GitHub through the proxy, and the access lifecycle | Header updated; the cells reuse the suite's helpers (`connect`, `startRun`, `readProbe`, `expectVariables`, `call`, `terminate`, `tokenScan`, `writeSummary`) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each cell is named for its rule and decision ID (DEC-002, DEC-015) |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The three cells assert the following:<ul><li>**All installed skills:** variables present; disabled → `403 INTEGRATION_NOT_ALLOWED`; enabled → 200; stopped → `RUN_PASS_INVALID`.</li><li>**Team-local member:** variables present; stopped → `RUN_PASS_INVALID`.</li><li>**Source removed on the Skills page:** 200 before; source no longer listed; no cards; the stored login is null; the next call → `INTEGRATION_NOT_ALLOWED`; a re-import shows `NEEDS_TOKEN`.</li></ul> The re-import check would fail if the removal had not disconnected, because a kept login and token would read `CONNECTED`. So DEC-015 is proven even if the file shape ever changed |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The team-local team is written once in `beforeAll` in the file-authored shape; its member ID comes from the product's own `buildTeamLocalAgentDefinitionId` |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | The removal cell is last and says why (it ends the connection for later cells); vitest runs a file's cases in order. The disabled skill is enabled again inside its cell. Run alone with `-t`, each cell still works, because each calls `connect` |
| Large files remain coherent and navigable | Pass | One surface; the new cells sit with the other scripted cells |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Gate-driven skips only |
| Added coverage agrees with the coverage investigation and execution evidence | Pass | API-02 (7 scripted cells) and the summaries `agy-all-installed.json` and `agy-source-removed-on-skills-page.json`. The vacuous first-run assertion (a top-level key) was fixed to `integrations.github.login` and rerun (`API-02-source-removal-cell-rerun.log`) |
| Test callers and fixtures exercise an independently established supported scenario | Pass | DEC-002 (the user's decision), DS-004 team-local, DEC-015 removal from either page |
| Each test enters through its scenario's real trigger and follows the real actor's steps | Pass | Real triggers throughout: `createAgentDefinition` with `skillScope: ALL_INSTALLED`, `disableSkill`/`enableSkill`, `createAgentTeamRun` with a first message (as the team view does), and the Skills page's own `removeSkillSource` mutation. Every call goes to real GitHub through the real proxy |

## Findings

None.

Note, not a finding: the connections-file assertion reads `?.login ?? null`, so on its own it would also pass if the file or key were missing. The re-import `NEEDS_TOKEN` assertion closes that gap.

## Follow-ups

- Follow-ups this review added: None. API/E2E added FU-004: the 9 e2e files that fail outside this ticket, the same ones as in autobyteus-311. I agree it is outside this ticket.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the one above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer` (`/software_engineering_team/delivery_engineer`)
- Notes: residual risks carry to delivery:
  - DEC-016 on a real GitHub revision (stub-covered, IMP-04);
  - the application bundle copy is proven by a repository test only;
  - the AC-008 run was started through the API;
  - the AC-009 README is unpushed.
