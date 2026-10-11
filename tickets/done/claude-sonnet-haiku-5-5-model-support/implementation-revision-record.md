# Implementation Revision Record — `claude-sonnet-haiku-5-5-model-support`

The current code (branch `codex/claude-5-5-model-support`) and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | solution_designer / solution-handoff.md (SR-004..SR-006) / initial | N/A | `Initial Baseline` | `SR-004`, `SR-005`, `SR-006`; `ARCH-REV-*`, `CRR-*`, `API-REV-*`, `DR-*`: N/A | Implemented; local checks pass; commit `22c3c89fa` (rebased as `bc1777e02` in IR-002) |
| IR-002 | solution_designer / solution-handoff.md + design-spec "Revision SR-007" (from independent CRR-001) / rework 1 | CR-001 (rebase part), CR-002, CR-003, CR-004 | `Design Revision Applied` | `SR-007`; `CRR-001`; `API-REV-001/002`, `DR-001/002` (prior); `ARCH-REV-*`: N/A | Rebased on `228cd9b5e`; SR-007 code in `b38d0a909`; local checks pass; no payload change |

## Revision Entries

### IR-002 — SR-007: discriminated policy type, model-named errors, explicit Sonnet 4.6 row, rebase

- Triggering role, report path, and round: `solution_designer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/solution-handoff.md` (SR-007), from the independent code review `/Users/normy/autobyteus_org/independent-reviews/claude-sonnet-haiku-5-5-model-support/independent-code-review-report.md` (CRR-001). This is the first implementation rework round.
- Triggering finding IDs: CR-001 (rebase and `TESTING.md` part only), CR-002, CR-003, CR-004 → design items D-SR7-4, D-SR7-1, D-SR7-2, D-SR7-3.
- Classification: `Design Revision Applied` (bounded; no requirement change)
- Prior authoritative result: IR-001 on base `ff227eb72` (`22c3c89fa`, `30541612c`). CRR-001 returned Changes required (bounded).
- Current authoritative result: branch on `origin/personal` @ `228cd9b5e`, with commits `bc1777e02`, `68269cfae` and `b38d0a909`. Classification is Small/Low (confirmed); route is Direct API/E2E.
- Related solution revision IDs: `SR-007` (on top of `SR-004`..`SR-006`)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`, `API-REV-002` (prior validation; D-SR7-5 is pending with API/E2E)
- Related delivery revision IDs: `DR-001`, `DR-002` (prior; D-SR7-6 is pending with Delivery)
- Why this change is recorded: to apply the SR-007 design revision.
- Approved behavior or requirement IDs affected: none in behavior. BEH-002 structure and messages changed; REQ-012 and AC-010 are preserved (no payload change); AC-012 docs were corrected.
- Implementation delta:
  - Rebase: I discarded the uncommitted `TESTING.md` edit and ran `git rebase --autostash 228cd9b5e`. The only conflict was `TESTING.md`, resolved by taking origin's version unchanged. The `token_usage.md` edit is kept uncommitted for Delivery.
  - The policy type is a union keyed by `thinkingMode`; `thinkingOffShape` exists only on `adaptive`. I removed the unreferenced `AnthropicThinkingMode`.
  - Added an explicit `claude-sonnet-4-6` row that shares `LEGACY_BUDGET_POLICY`. The resolver comment was updated.
  - Both `adaptive_required` errors are now built from `modelValue`.
  - Policy test: deleted the unsupported-ID `it.each`, and the helpers use `AnthropicThinkingOffShape`.
  - Added one test for the full Opus 5.5 error texts.
  - Fixed the two docs (explicit Sonnet 4.6 row; no dated-ID claim).
- Changed files or areas:
  - `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts`
  - `autobyteus-ts/src/llm/api/anthropic-llm.ts` (two messages)
  - `autobyteus-ts/tests/unit/llm/api/anthropic-model-request-policy.test.ts`
  - `autobyteus-ts/tests/unit/llm/api/anthropic-llm-claude-5-5.test.ts` (one new `describe`; `ModelId` widened to include `claude-opus-5-5`)
  - `autobyteus-ts/docs/provider_model_catalogs.md`
  - `autobyteus-ts/docs/llm_module_design_nodejs.md`
  - `TESTING.md` (origin's version via the rebase)
- Local validation and result:
  - `tsc -p tsconfig.build.json --noEmit` is clean.
  - `tests/unit/llm`: 524/524. Core `tests/unit`: 1974/1974. Server `token-cost-calculator.test.ts`: 15/15.
  - The five existing Anthropic test files are unchanged against the base.
  - `git merge-tree` against `origin/personal` is clean.
- Next recipient or routing: per `get_handoff_rules` (Small/Low, so direct API/E2E).
- Remaining limitations or risks:
  - No live re-run was done (no payload change). That decision belongs to API/E2E.
  - D-SR7-5 (test headers) and D-SR7-6 (docs sync, `token_usage.md` commit) are pending with their owners.
  - Reviewer residual risks 1–4 and C-10 are unchanged and out of scope.

### IR-001 — Sonnet 5.5 + Haiku 5.5 on an exact-value Anthropic request policy

- Triggering role, report path, and round: `solution_designer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/solution-handoff.md`, initial round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete on `ff227eb72` + `22c3c89fa`; classification confirmed Medium/Low; route Direct API/E2E.
- Related solution revision IDs: `SR-004` (design), `SR-005` (base `ff227eb72`), `SR-006` (re-verification and test guidance)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..003; REQ-001..REQ-013; AC-001..AC-012.
- Implementation delta:
  - Added `anthropic-model-request-policy.ts`: an exact-value table plus resolver, with unknown values getting the legacy budget policy.
  - Refactored `applyAnthropicRequestParams` to use that policy. The steps are strict validation, then explicit-thinking sanitize, then toggle build, then sampling strip or `temperature: 0`.
  - Removed `matchesAnthropicModelFamily`, the old policy type and resolver, `sanitizeThinkingParam`, `buildThinkingParam` and both Opus 5.5 blocks.
  - Added catalog rows `claude-sonnet-5-5` (new `claudeSonnet55Schema`) and `claude-haiku-5-5` (tiered pricing). Both have `maxOutputTokens: 128_000`.
  - Added the new tests and updated the docs.
- Changed files or areas:
  - `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts` (new)
  - `autobyteus-ts/src/llm/api/anthropic-llm.ts`
  - `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts`
  - `autobyteus-ts/tests/unit/llm/api/anthropic-model-request-policy.test.ts` (new)
  - `autobyteus-ts/tests/unit/llm/api/anthropic-llm-claude-5-5.test.ts` (new)
  - `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`
  - `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts`
  - `autobyteus-ts/docs/provider_model_catalogs.md`
  - `autobyteus-ts/docs/llm_module_design_nodejs.md`
- Local validation and result:
  - The existing Anthropic tests pass unchanged (59/59).
  - `tests/unit/llm`: 528/528. Core `tests/unit`: 1978/1978.
  - Core build passes. Server `tests/unit/token-usage`: 111/111. Server typecheck passes.
  - AC-011 live smoke: 13/13 pass.
- Next recipient or routing: per `get_handoff_rules` (Medium/Low, so direct API/E2E).
- Remaining limitations or risks:
  - Explicit-thinking edge tightening on adaptive models, per the design matrix.
  - The `adaptive_required` messages name Opus 5.5.
  - Live signed-thinking replay was not exercised, because the models did not think on the smoke prompt. Unit-level byte-identical replay is covered.
  - No rendered check of the frontend menu was done.
