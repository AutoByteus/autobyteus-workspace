# Handoff Summary — autobyteus-355 (release-guide-notes-and-grok-smoke)

## What Changed

- **RELEASE.md, betas with a user action** (REQ-001/002):
  - a ticket whose change needs a user action writes it under `## What you need to do` in its `release-notes.md`;
  - at a beta, delivery collects those sections and, after all four workflows succeed, puts them above the generated notes with `gh release edit` (body only);
  - a beta without one keeps the generated notes alone.

  The template has the optional section. This replaces the hand-made deviation of beta.6, beta.7 and beta.8.
- **Release smoke check, live suite** (REQ-003..005):
  - each live runtime checks its model in its own `beforeAll`, so a miss fails only that runtime's cases;
  - without `GROK_E2E_MODEL`, Grok uses `grok-4.7` when offered, else the first offered model, and the summary says `grok-4.5 (pinned grok-4.7 not offered)`;
  - overrides and the Claude/Codex pins stay strict.

  Code: `tests/e2e/helpers/live-model-choice.ts`, `workspace-skill-links-live.e2e.test.ts`, `scripts/release_smoke.py`, a fake Grok ACP fixture, and tests.
- **Delivery's doc edits:**
  - step 2's command is `git log --merges --first-parent <previous-tag>..HEAD`;
  - the Workflow Reference link label is corrected;
  - a **Models** bullet in "Release smoke check".

## Classification And Route

- `Small` / `Low`, direct route: SR-001 → IR-001 → API-REV-001 Pass (95%, every category 95%). Architecture and code review `N/A — not applicable` (direct route).

## Integration

- `origin/personal` was `efd28d5c4a` at bootstrap and at every fetch, so the branch was already current and nothing was merged.
- DEL-01 on the delivered state:
  - `test_release_smoke.py` 23/23;
  - all script tests 186 (OK, 2 skipped);
  - `live-model-choice.test.ts` 5/5;
  - server typecheck;
  - the new RELEASE.md anchors resolve;
  - licensing, hygiene and Secret Gate.

## Verification

From the evidence, sufficient:
- AC-002: API-03, the real `main()` with `GROK_E2E_MODEL=grok-4.7`. Only the Grok rows are `skipped: … grok-4.7 is not offered; available: grok-4.5, grok-4.6`, while the Claude and Codex cases ran in the same suite.
- AC-003: API-02, models line `grok-4.5 (pinned grok-4.7 not offered)`.
- AC-004: API-03.
- AC-005: API-05, gitleaks "no leaks found" for both runs; 0 key-shape matches.
- AC-001: API-04, read-only on v1.5.11-beta.9, plus my read of the final wording.

Only the next releases show a real `gh release edit` at a beta with a user action, and a real Grok catalog without `grok-4.7`.

## For The User

The final RELEASE.md wording is in the terminal report to the Solution Designer, which shows it to the user, as the requirements ask.

## Release

None (out of scope).
