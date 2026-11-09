# API/E2E Test Review Report — phone-registered-folders-436 (autobyteus-436)

## Review Meta

- Review Round: 1
- Trigger: API/E2E engineer, API-REV-001 (Pass, 95%); test commit `cf8035c849`; validated `ea51d4fddd` + `cf8035c849`; HEAD `5994057d86`
- Requirements / Design / Contract reviewed as context: `requirements-doc.md` (SR-004), `design-spec.md` (SR-005), `node_access_model.md` (NAS-39/40)
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`
- API/E2E Result: Pass; Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: `TESTING.md` § Browser probes (a probe's requests to a node carry a credential: through the window's attachment or attached by the probe). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs` (N-009) | Updated (+6/−3) | AC-006 (preserved desktop file preview); pre-existing breakage since autobyteus-437 | Reads workspace content inside and outside the root | The GraphQL read moves from the probe process's `fetch` (no credential → 401) to `page.evaluate` in the packaged app window, where the desktop's attacher adds the node credential. The assertions (status 200, inside content, outside denial) are unchanged. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names clear | Pass | N-009 name and comment unchanged; a one-line reason added |
| Assertions prove requirements | Pass | Unchanged assertions |
| Fixtures/helpers reuse | Pass | Small local helper; no new fixture needed in a packaged-app probe |
| Isolation/determinism | Pass | Same 10 s timeout; N-001…N-009 pass (`API-04-desktop/event-monitor-file-preview.log`) |
| Large files coherent | Pass | — |
| No stale/disabled tests | Pass | — |
| Coverage agrees with evidence | Pass | Report and log agree |
| Callers exercise an established scenario | Pass | The desktop window reading its own node is NAS-01 |
| Real trigger and steps | Pass | The request now takes the real path, the app window with the main-process attacher, instead of a credential-less side channel |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-003 and FU-004 were recorded by API/E2E; FU-004 is marked urgent).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs`
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: residuals are C-03 (Windows folder message, no Windows host), a large PDF on a real phone (the user's check), and assumption 4 covered by spec only.
