# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Initial API/E2E round for superseded icon-only contract | `CRR-001` | `N/A` | Historical `Pass` / `95%` — superseded |
| API-REV-002 | Fresh API/E2E round after CRR-003 / IR-002 revised text/badge contract | `SR-001`, `IR-002`, `CRR-003` | Superseded API-REV-001; not current sign-off | `Pass` / `95%` |

## Revision Entries

### API-REV-001 — Initial Gemini icon-only contract validation (historical)

- Triggering role/report/round: Initial code review `CRR-001`; initial API/E2E round 1.
- Why recorded: First completed API/E2E result before the approved SR-001 clarity revision.
- Result: Historical `Pass` / `95%` for the then-approved check-circle/icon-only contract.
- Current status: Superseded by SR-001/IR-002 and must not be treated as current sign-off.
- Canonical historical artifacts: `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` history was replaced with current authoritative state; retained evidence remains under `evidence/` for traceability.

### API-REV-002 — Revised visible action/state text contract

- Triggering role, report path, and round: `code_reviewer` CRR-003 implementation rework pass; `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/code-review-report.md`; fresh API/E2E round 2.
- Triggering finding/scenario IDs: `SR-001`; revised `REQ-001`–`REQ-005`, `AC-001`–`AC-006`; current scenarios `API-GEMINI-201`–`API-GEMINI-206`.
- Related upstream revisions: `SR-001`, `IR-002`, `CRR-003`; implementation commit `38327b315`.
- Why this revision was recorded: The approved contract changed from icon-only/check-circle activation to visible `Use this mode` action text and visible `Active` badge/text. Fresh coverage was required; API-REV-001 was explicitly not reused as sign-off.
- Coverage decisions/durable paths changed: Prior icon assertions are stale/superseded. No durable API/E2E test file changed; current implementation-owned component test was rerun.
- Scenarios rechecked: Visible text action and semantics, active badge/no action, pending spinner + `Activating...` + disabled, hover/focus, 768px wrap/min-height/no overflow, unavailable gating, provider manager/runtime and localization guards.
- Commands/environment/browser delta: Focused Gemini 1/7, provider/manager 6/26, localization/web guards and audit pass, targeted diff check pass. Reused user-requested `pnpm dev:test` (test backend 8000, Nuxt 3000), Chrome 1440px and 768px. Playwright used deterministic setup response and held `UseGeminiMode` response without external credentials or persistent mutation. Browser contexts closed; dev:test intentionally remains running for user inspection.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-REV-001 check-circle/icon-only scenarios | Superseded contract, not a failure | Replaced by visible text/badge scenarios; no icon assertion remains current | Revised requirements/design, CRR-003, current focused test and browser log. |

- Canonical artifacts/sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, and `evidence-revision-002/`.
- Prior result/confidence: API-REV-001 historical `Pass` / `95%`, superseded and not reused.
- Current result/confidence: `Pass` / `95%` for revised text/badge contract.
- New/remaining failure IDs: None in scope. A 320px whole Settings off-canvas observation is recorded as surrounding-layout residual, not a changed-card failure.
- Recommended recipient: `code_reviewer` for separate proportional test-code review; `Not Applicable` because no durable API/E2E test changed.
- Remaining risks/untested scope: Production external Gemini API and Electron shell are out of scope; 320px full Settings shell has existing ProviderModelBrowser layout limitation, while 768px narrow card wrapping passed. Keep `pnpm dev:test` running until user inspection completes.
