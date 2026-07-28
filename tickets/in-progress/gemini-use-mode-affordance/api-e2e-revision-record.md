# API/E2E Revision Record

## Revision Index

| Revision ID | Trigger | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- |
| `API-REV-001` | Initial icon-only/check-circle contract | `N/A` | Historical `Pass` / `95%`; superseded |
| `API-REV-002` | CRR-003 visible text/badge rework | API-REV-001 superseded | Historical `Pass` / `95%`; superseded |
| `API-REV-003` | CRR-005 plain-check icon rework | API-REV-002 superseded | Historical `Pass` / `95%`; superseded |
| `API-REV-004` | CRR-008/F-001 pending visual fix, commit `67d047d3f` | API-REV-003 superseded and not reused | Current `Pass` / `95%` |

## API-REV-001 — Initial baseline

- Initial API/E2E result for the then-approved icon-only/check-circle contract: `Pass` / `95%`.
- Status: historical and superseded by later approved contract revisions.
- No prior result existed before this baseline.

## API-REV-002 — Superseded visible-text contract

- Trigger: CRR-003, implementation commit `38327b315`, round 2.
- Result: `Pass` / `95%` for visible `Use this mode` action text, visible `Active`, pending text, narrow wrapping, and hover/focus.
- Status: superseded by the later plain-check contract and not current sign-off.

## API-REV-003 — Superseded plain-check contract

- Trigger: CRR-005, implementation commit `35cc293c2`, round 3.
- Result: `Pass` / `95%` for icon-only `heroicons:check`, fixed 44x44 geometry, active/no-action, pending spinner, narrow, hover/focus, and gating.
- Status: superseded by SR-003/F-001 because the approved action is visible `Activate` and pending must show visible localized `Activating` text. It is historical only and not current sign-off.

## API-REV-004 — Current localized Activate / Activating contract

- Triggering review: `code-review-report.md` / CRR-008; source review passed for F-001/IR-005 commit `67d047d3f`.
- Prior result checked: API-REV-003 was explicitly classified as superseded; no prior confidence or scenario result was reused.
- Current result: `Pass` / `95%`.
- Current scenarios: `API-GEMINI-401` through `API-GEMINI-406`.
- Repository evidence: focused Gemini 1 file / 7 tests; provider/manager 6 files / 26 tests; localization and web boundary guards; localization literal audit; targeted changed source/test diff check.
- Browser evidence: actual running `pnpm dev:test` Nuxt route in Chrome at desktop and 768px; English and Simplified Chinese idle/active/pending labels, spinner/disabled substitution, no idle pending label, narrow layout, hover/focus, and gating all passed with no page errors.
- Durable API/E2E changes: none. Temporary browser probe only; proportional test-code review is `Not Applicable`.
- Residual risk: pre-existing full Settings shell off-canvas at 320px; 768px card-level narrow path passed. Electron shell and external Gemini provider are out of scope for this presentation-only change.
- Environment state: user-requested `pnpm dev:test` remains running for visual inspection; browser contexts and held requests were cleaned up; test server was restored/confirmed with Vertex Express active.
- Handoff: send current authoritative reports and cumulative package to `code_reviewer` for proportional test-code review, then delivery.
