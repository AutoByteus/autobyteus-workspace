# API/E2E Revision Record

## Revision Index

| Revision ID | Trigger | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- |
| `API-REV-001` | Initial icon-only/check-circle contract | `N/A` | Historical `Pass` / `95%`; superseded |
| `API-REV-002` | CRR-003 visible text/badge rework | API-REV-001 superseded | Historical `Pass` / `95%`; superseded |
| `API-REV-003` | CRR-005 plain-check icon rework, commit `35cc293c2` | API-REV-002 superseded and not reused | Current `Pass` / `95%` |

## API-REV-001 — Initial baseline

- Initial API/E2E result for the then-approved icon-only/check-circle contract: `Pass` / `95%`.
- Status: historical and superseded by the approved SR-001/IR-002 text contract, then by SR-002/IR-003 plain-check contract.
- No prior result existed before this baseline.

## API-REV-002 — Superseded visible-text contract

- Trigger: CRR-003, implementation commit `38327b315`, round 2.
- Result: `Pass` / `95%` for visible `Use this mode` action text, visible `Active`, pending text, narrow wrapping, and hover/focus.
- Status: superseded after SR-002 changed the action back to fixed 44x44 icon-only plain `heroicons:check`.
- It is retained only for traceability and must not be treated as current sign-off.

## API-REV-003 — Current plain-check contract

- Triggering review: `code-review-report.md` / CRR-005; source review passed for SR-002/IR-003 commit `35cc293c2`.
- Prior result checked: API-REV-002 was explicitly classified as superseded; no prior confidence or scenario result was reused.
- Current result: `Pass` / `95%`.
- Current scenarios: `API-GEMINI-301` through `API-GEMINI-306`.
- Repository evidence: focused Gemini 1 file / 7 tests; provider/manager 6 files / 26 tests; localization and web boundary guards; localization literal audit; targeted changed source/test diff check.
- Browser evidence: actual running `pnpm dev:test` Nuxt route in Chrome at desktop and 768px; real Iconify SVG/path, exact 44x44 geometry, active no-action state, not-configured gating, hover/focus, and held GraphQL pending state all passed with no page errors.
- Durable API/E2E changes: none. Temporary browser probe only; proportional test-code review is `Not Applicable`.
- Residual risk: pre-existing full Settings shell off-canvas at 320px; 768px card-level narrow path passed. Electron shell and external Gemini provider are out of scope for this presentation-only change.
- Environment state: user-requested `pnpm dev:test` remains running for visual inspection; browser contexts and held request were cleaned up.
- Handoff: send current authoritative reports and cumulative package to `code_reviewer` for proportional test-code review, then delivery.
