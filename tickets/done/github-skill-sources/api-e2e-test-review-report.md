# API/E2E Test Review Report — github-skill-sources

## Review Meta
- Review Round: **1** proportional test review; cumulative code-review revision **CRR-002**, 2026-10-04.
- Trigger: API/E2E Engineer's **API-REV-002 Pass** request, following completed corrected-scope validation.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources`; branch `codex/github-skill-sources`; target `origin/personal` unchanged.
- Reviewed cumulative API delta: `0bfd39f46..2ee7a5505`, including `5561d2cb3` and `2ee7a5505`. All seven durable paths reviewed; no removed tests. Production source unchanged from CRR-001, independently confirmed by diff.
- Requirements context: `requirements-doc.md`, `approved-requirements-sr006.md`, **SR-006 / USER-APPROVAL-006**; behavior/acceptance basis unchanged.
- Investigation / solution history / design: `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` **SR-008**, especially DS-005/008 and MP-001.
- Supplements: `approval-request.md`, `architecture-handoff.md`; Product-owned behavior supplement **N/A — not applicable**.
- Architecture context: `design-review-report.md`, `architecture-review-revision-record.md`, current **ARCH-REV-002 Pass**; old ARCH-REV-001 Fail is historical.
- Implementation context: `implementation-handoff.md`, `implementation-revision-record.md` **IR-001**.
- Original source review: `code-review-report.md` **CRR-001 Pass**, unchanged by this proportional review; cumulative history `code-review-revision-record.md`.
- Current API context: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md`; **API-REV-002 Pass** supersedes API-REV-001 Blocked.
- API/E2E Final Validation Confidence: **95%, attributed to API/E2E Engineer**, not rescored here.
- Delivery revision: **N/A — not applicable yet**.
- Prior unresolved test-review findings: **None**; initial proportional test review.
- Supported Product Scenario Basis Confirmed: **Yes**.

Unqualified artifact paths refer to `tickets/in-progress/github-skill-sources/` in the workspace above.

### Current validation scope
Carry the explicit user correction recorded by API-REV-002: **Windows and Electron-specific shell testing are Out Of Scope**, not blockers or unexecuted passes. The feature is validated through the real web frontend/backend. This supersedes the old platform gate in CRR-001's historical downstream list; it does not waive source ownership, archive safety, failed-update retention, or other approved behavior. No additional product requirement or scope reopening is imposed here.

## Changed Durable Test Scope
| Durable test path | Change | Related scenario / requirement | Coherent responsibility / review notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` | Added | SCN-001–005, REQ-001–008; MP-001 | Actual renderer query/mutation selections against production schema/source/catalog/archive; five source cases plus 24 adapter/scope/generation-retention/release-order combinations. Assertions cover real files, revisions, conflicts and holder lifetime. |
| `autobyteus-server-ts/tests/e2e/skills/github-skill-runtime-harness.ts` | Added | MP-001, REQ-005/007, DS-008 | Reusable actual Codex/Claude bootstrap and Grok ACP factory setup; supplied agent/workspace and external provider boundaries only. Cleans acquired holders/backends and restores fixture environment. |
| `autobyteus-server-ts/tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts` | Updated | REQ-004/007; existing name/default/package contract | Reset newly separated source singleton between fixtures; feed the same controlled HTTP implementation to extracted metadata client and installer. Existing assertions preserved. |
| `autobyteus-server-ts/tests/e2e/skills/skills-graphql.e2e.test.ts` | Updated | REQ-007; local skills/source continuity | Reset source/catalog singletons around test-owned data. Existing assertions unchanged. |
| `autobyteus-web/tests/e2e/github-skill-sources-probe.mjs` | Added | SCN-001–004/005; MP-001; AC-001/003/005/006/007 | One sequential real-stack source lifecycle: import/Files, A, check/cancel, failed update/retry/reopen, actual header ＋/Send B, interrupted download, restart/REMOVING retry/local preservation. Named case recording makes the shared journey navigable. |
| `autobyteus-web/tests/e2e/fixtures/github-skill-upstream.mjs` | Added | SCN-002/003/005 | Owned child-process preload controls external GitHub revisions/archives/failure/download hold; does not replace application APIs or storage. Request log proves no download on check/cancel. |
| `autobyteus-web/tests/e2e/fixtures/skill-codex-app-server.mjs` | Added | MP-001; future-run consumption | External CLI surrogate speaks real stdio protocol and records actual workspace skill bytes at thread/turn start. No model/auth/quality claim; v1/v2 UI markers are corroborated by byte assertions. |

- No durable test file changed: **No**. Removed durable tests: **None**.
- Ticket probes/logs/screenshots/JSON are evidence, not additional durable test-code paths.
- No implementation-source line thresholds, full source scorecard, forced splitting or duplicate E2E execution applied.

## Proportional Test-Code Checks
| Check | Result | Evidence / notes |
| --- | --- | --- |
| Scenario grouping/names make intent clear | Pass | Named GraphQL cases and explicit adapter matrix; browser case IDs correspond to one coherent source journey. |
| Assertions prove approved requirements, not incidental implementation details | Pass | Revision/root/content/local-edit retention, exact catalog membership, conflict error paths, source exclusion/retry, real exposed bytes and release-order link lifetime. Internal paths are inspected where filesystem ownership is the actual contract. |
| Meaningful setup/helpers/builders reused | Pass | Shared GraphQL exec/import/catalog helpers, runtimeFixture, browser source/dialog/record/start/stop helpers and isolated external fixtures. |
| Isolation/determinism appropriate to boundary | Pass | Private temp data/config/HOME/workspaces and fresh Chrome; controlled upstream versions; singleton/global/env reset; scoped chmod restored; process groups owned. Fixed delays in provider simulation do not replace outcome waits. |
| Larger files coherent/navigable | Pass | GraphQL lifecycle/adapter coverage and browser ordered lifecycle each have a single concern; shared state reflects the intended update journey. |
| No stale/disabled/compatibility-only coverage | Pass | Both fixture repairs follow current ownership without dropping assertions or adding a compatibility branch. No skipped new case presented as passed. |
| Coverage changes agree with investigation/execution | Pass | Seven-path inventory matches cumulative diff. Final logs show 28 files/321 server tests and 6 files/28 web tests; final browser receipt has eight passing cases, no page errors and cleanup receipts. Counts are not additive. |
| Fixtures reproduce independently supported scenarios | Pass | SCN-001–005 establish source commands; MP-001 establishes same-workspace New chat while A lives. Faults reproduce the approved retention/removal contracts, not invented product features. |
| Tests enter the appropriate real trigger and follow supported steps | Pass | Source tests import/update through actual GraphQL. Adapter matrix consumes those committed catalog states through actual adapter preparation. Browser submits Sources controls and actual header ＋/Send; interrupt/update and cleanup queries use supported APIs. Temporary permission/download faults reproduce explicitly supported operational failures. |

## Evidence Reconciliation / Boundaries
Reviewed `evidence/api-r2-regression.txt`, `evidence/api-r2-web-unit.txt`, final `evidence/web-r2-final/result.json`, `provider.jsonl`, and the current investigation/report/ledger alongside the tests. The final receipt records eight Pass results, both explorer connections closed, no page errors, browser/children stopped, both ports released and private data removed. Provider receipts contain v1 and v2 skill bytes for distinct thread IDs in the same workspace. The browser assertions separately verify A remains active when B begins and correct link cleanup afterward.

The real-header journey covers Codex; the matrix covers the distinct Codex/Claude/Grok preparation paths, both scopes, retained/deleted old trees and both release orders. These are not three real-model UI journeys. GitHub update responses and external CLI inference are controlled; application schema/storage/archive/adapter and browser/backend transport remain real. Prior live public GitHub and Linux evidence remains API-owner-attributed supplementary proof. Current-reader reconstruction in the GraphQL cases is not mislabeled process restart; the browser explicitly restarts/kills its owned backend.

No rerun was needed to judge the changed assertions from source and retained evidence. No source/test fixes made. No independent confidence score or new full-suite/build claim. Known unrelated baseline failures remain documented by the owning reports.

## Findings
**None.** No actionable durable test-code correctness, isolation or maintainability defect identified. No hypothetical platform/concurrent-workflow requirement introduced.

## Latest Authoritative Result
- Result: **Pass** — proportional API/E2E test-code review, **CRR-002**.
- Changed durable test paths reviewed: **All seven**, cumulatively from CRR-001 input through `2ee7a5505`.
- Unresolved finding IDs: **None**.
- Failure classification: **N/A — Pass**.
- Task classification: **Large / High**, unchanged.
- Recommended recipient: **Delivery Engineer**, exact address determined by completed-result handoff rules.
- Notes: Preserve corrected Windows/Electron-shell scope and mock-boundary qualifications. Documentation synchronization, explicit user verification, finalization/release gates remain Delivery-owned; this is not Delivery Completed.

## Handoff Rule Evaluation
After report/history persistence, `get_handoff_rules` selected the specific post-API/E2E durable test-code Pass rule → **`/delivery_engineer`**. Full cumulative package and all seven durable paths accompany that handoff. No failure-origin, duplicate implementation review or additional recipient rule applies. Tool receipt establishes dispatch success.
