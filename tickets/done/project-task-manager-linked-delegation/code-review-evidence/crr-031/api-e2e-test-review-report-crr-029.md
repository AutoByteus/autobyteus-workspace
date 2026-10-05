# API/E2E Test Review Report — CRR-029

## Review Meta
- Review Round: proportional successful test-code review, round 3 (overall CRR-029). Prior: CRR-023, archived at `code-review-evidence/crr-029/prior-api-e2e-test-review-report-crr-023.md`.
- Trigger: `/api_e2e_engineer` **API-REV-020 Pass 95.00%** (broader validation Required — completed) on IR-013 `b61b8452f`, after the CRR-028 failure-origin re-baseline of FAPI-012.
- Context reviewed:
  - requirements-doc.md (REQ-BL-009 C-3 migration / no lockout; B-1–B-7; Q-1–Q-3)
  - data-model-draft.md
  - design-spec.md (SR-023/SR-024, Migration Plan)
  - implementation-revision-record.md (IR-013)
  - code-review-report.md (CRR-027 source Pass 9.3; CRR-028 origin)
  - api-e2e coverage investigation, execution coverage report, ledger and revision record (API-REV-019/020)
  - `docs/design/data_migration_guideline.md`
- API/E2E result: **Pass 95.00%**; all CRR-027 validation items covered on real changed builds; FAPI-012 withdrawn as a product failure (invalid oracle, re-baselined with (a) run-ID reply and (b) address-reply linked and unlinked controls).
- Prior unresolved test-review findings: none.
- Supported product scenario basis confirmed: **Yes**. The released-data upgrade at real startup, with no lockout and retry, is the user-directed C-3 and the design Migration Plan §2/§5.

## Changed Durable Test Scope
| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/projects-startup-migration.e2e.test.ts` | Added (uncommitted, untracked) | C-3 per-Project migration; no lockout; retained original; retry; both startup entrypoints; composition release on close (F06 successor) | Released Projects data upgraded once through the built Studio (`dist/app.js`) and standalone (`dist/index.js`) entrypoints | 3 cases, 304 lines; uses committed fixtures `tests/fixtures/projects-per-folder-v1/released-with-context-drafts-and-residue.json` and `tests/fixtures/projects-released-array.json` |
| `autobyteus-server-ts/tests/e2e/projects/projects-startup-no-write.e2e.test.ts` | Removed (unstaged deletion) | Superseded premise ("no startup rewrite", REQ-BL-008 no-migration) replaced by SR-024 / C-3 | — | Prior content archived at `code-review-evidence/crr-029/removed-projects-startup-no-write.e2e.test.ts` and `api-e2e-evidence/api-019/prior-…`; no remaining references (grep of tests/src/docs/TESTING.md) |

- No durable test file changed: **No**. FAPI-012 got no durable test, which is correct: it was not a defect.

## Proportional Test-Code Checks
| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One `describe` for the upgrade at both entrypoints. The three `it` names state the outcome: upgrade + skips + restart no-op; failure/partial move + retry; standalone no-lockout + compose/release. |
| Assertions prove approved requirements | Pass (one non-blocking note) | They assert user-visible and contract outcomes:<br>• migrated data served through GraphQL/REST (saved files, a moved draft usable for a new Task);<br>• the retained original is byte-equal;<br>• conflict target bytes preserved;<br>• gated read shows the clear message and is never empty, while write carries `PROJECTS_MIGRATION_PENDING`;<br>• no lockout: health and other GraphQL keep working;<br>• restart is a byte-level no-op;<br>• the retry completes without duplicating;<br>• the first write lands in `task.json`.<br>Note: `expect(attemptLog).not.toContain("dev-lifetime")` (line 156) is vacuous, because skip examples are recorded as `row N`, never by lifetime name. The silent-residue rule is independently proven by the unit test (`scannedCount: 4`, invalid-row `Count: 1`). Optional tightening: assert the invalid-row count instead. |
| Fixture/helper reuse | Pass | Shared `start`/`studio`/`standaloneEntry`/`snapshot`/`writeDraft` helpers; committed released-shape fixtures reused from the unit suite. The repeated 3-line root/.env setup is minor and acceptable. |
| Isolation and determinism | Pass | Per-test `mkdtemp` data root; port 0; a minimal env allowlist (no `AUTOBYTEUS_*`/provider inheritance; dead LM Studio host); `afterEach` stops children (SIGTERM → SIGKILL) and removes the root; no model requests; bounded waits. |
| Large file coherent | Pass | One surface (the startup upgrade), 304 lines, navigable. |
| No stale/duplicated/disabled tests | Pass | The obsolete no-write test is removed and its premise explicitly superseded; no skipped tests. |
| Coverage agrees with investigation/execution evidence | Pass | Matches the API-REV-019/020 ledger. The mutation controls (no-retire; leaked close binding) are reported as caught, consistent with the assertions on the retained original/source absence and on the second standalone start. |
| Callers exercise an independently established scenario | Pass | The C-3 user decision and the Migration Plan establish the scenario; the test reproduces it. |
| Real trigger, real steps, no unreal setup | Pass | Real built entrypoints, the real migration runner, HTTP/GraphQL. Pre-existing conflict target, blocked folder and unparsable source are the design's explicitly supported skip/FAILED/retry cases (Migration Plan §2.3a, §4, §5), not invented states. The prerequisite of a current `dist` is stated in the header comment. |

## Findings
None.

## Latest Authoritative Result
- Result: **Pass**
- Changed durable test paths reviewed:
  - `tests/e2e/projects/projects-startup-migration.e2e.test.ts` (added)
  - `tests/e2e/projects/projects-startup-no-write.e2e.test.ts` (removed)
- Unresolved finding IDs: none
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - CRR-027 source Pass 9.3 and API-REV-020 Pass 95.00 remain separate authorities.
  - Both durable test changes are **uncommitted**: the added file is untracked and the removal is an unstaged deletion. Delivery must stage them explicitly. Do not use `git add -A`, because rebuilt `dist/` output for the two SDK packages reappears untracked (CR24-F01).
  - Delivery's 8 uncommitted docs/TESTING.md paths describe the superseded lifetime model and need a resync to REQ-BL-009, plus the CRR-027 migration-repoint obligation.
  - DR-002 must not finalize `ccb5fbe3` or `4b04d9097`; the current candidate is IR-013 `b61b8452f` plus this durable delta.
  - The O-1 GraphQL code on the gated queries is non-blocking (CRR-028).
