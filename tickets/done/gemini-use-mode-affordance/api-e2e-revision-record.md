# API/E2E Revision Record

## Revision Index

| Revision ID | Trigger | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- |
| `API-REV-001` | Initial icon-only/check-circle contract | `N/A` | Historical `Pass` / `95%`; superseded |
| `API-REV-002` | CRR-003 visible text/badge rework | API-REV-001 superseded | Historical `Pass` / `95%`; superseded |
| `API-REV-003` | CRR-005 plain-check icon rework | API-REV-002 superseded | Historical `Pass` / `95%`; superseded |
| `API-REV-004` | CRR-008/F-001 pending visual fix | API-REV-003 superseded | Historical `Pass` / `95%`; superseded by palette revision |
| `API-REV-005` | CRR-010/SR-005 palette revision, commit `0f9fa87dc` | API-REV-004 superseded and not reused | Current `Pass` / `95%` |

## API-REV-001 — Initial baseline

- Initial API/E2E result for the then-approved icon-only/check-circle contract: `Pass` / `95%`.
- Status: historical and superseded by later approved contract revisions.
- No prior result existed before this baseline.

## API-REV-002 — Superseded visible-text contract

- Trigger: CRR-003, implementation commit `38327b315`, round 2.
- Result: `Pass` / `95%` for visible `Use this mode` action text, visible `Active`, pending text, narrow wrapping, and hover/focus.
- Status: superseded by later contract revisions and not current sign-off.

## API-REV-003 — Superseded plain-check contract

- Trigger: CRR-005, implementation commit `35cc293c2`, round 3.
- Result: `Pass` / `95%` for icon-only plain check and its then-approved pending/narrow/hover/focus behavior.
- Status: superseded and not current sign-off.

## API-REV-004 — Superseded localized Activate/Activating contract

- Trigger: CRR-008/F-001, implementation commit `67d047d3f`, round 4.
- Result: `Pass` / `95%` for localized visible Activate/Activating, spinner/disabled, active/no action, narrow, hover/focus, gating, and English/Simplified Chinese.
- Status: historical only for the pre-SR-005 palette; fresh validation was required and performed for the approved palette revision.

## API-REV-005 — Current blue Activate / emerald Active palette

- Triggering review: `code-review-report.md` / CRR-010; source review passed for SR-005/IR-007 commit `0f9fa87dc`.
- Prior result checked: API-REV-004 was explicitly classified as superseded; no prior confidence or scenario result was reused.
- Current result: `Pass` / `95%`.
- Current scenarios: `API-GEMINI-501` through `API-GEMINI-507`.
- Repository evidence: focused Gemini 1 file / 7 tests; provider/manager 6 files / 26 tests; localization and web boundary guards; localization literal audit; targeted changed source/test diff check.
- Browser evidence: actual running `pnpm dev:test` Nuxt route in Chrome at desktop and 768px; blue idle/hover/focus palette, emerald Active badge, contrast, pending spinner/disabled/no idle label, gating, and English/Simplified Chinese locale surfaces all passed with no page errors.
- Contrast evidence: idle blue text 6.16:1, hover blue text 7.15:1, emerald Active text 4.84:1 against their rendered backgrounds.
- Durable API/E2E changes: none. Temporary browser probe only; proportional test-code review is `Not Applicable`.
- Residual risk: pre-existing full Settings shell off-canvas at 320px; 768px card-level narrow path passed. Electron shell and external Gemini provider are out of scope for this presentation-only change.
- Environment state: user-requested `pnpm dev:test` remains running for visual inspection; browser contexts and held requests were cleaned up.
- Handoff: send current authoritative reports and cumulative package to `code_reviewer` for proportional test-code review, then delivery.
