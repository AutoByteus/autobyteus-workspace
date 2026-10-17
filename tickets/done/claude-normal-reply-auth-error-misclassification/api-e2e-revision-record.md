# API/E2E Revision Record

## API-REV-001 (baseline)

- Date: 2026-10-12
- Validated: implementation `fc87231ba` (IR-001, SR-001), direct route, Small / Low
- Trigger: Implementation Complete from implementation_engineer (initial round)
- Result: **Pass**. Confidence **96%**. Broader validation (browser/desktop) `Not Required`.
- Cases:
  - R-1, R-2, R-3: Pass.
  - E-AC001 on path-claude and sdk-bundled-claude: Pass.
  - E-AC002 on path-claude and sdk-bundled-claude: Pass.
  - E-RED: AC-001 fails against the pre-fix classifier, as expected.
- Durable coverage:
  - Added `tests/e2e/runtime/claude-agent-auth-marker-reply.e2e.test.ts`.
  - Baseline fix to `tests/e2e/helpers/claude-live-agent-harness.ts` and `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` (`ownSession` drift).
- Open baseline item, with another owner: fake-CLI block of `claude-agent-websocket-interrupt-resume.e2e.test.ts` fails on the base (opening protocol drift).
- Prior failures rechecked: N/A (initial)
- Test review: `Not Required — direct low-risk route`
