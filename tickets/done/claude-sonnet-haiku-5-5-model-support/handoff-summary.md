# Handoff Summary — claude-sonnet-haiku-5-5-model-support

- Status: **Delivered.** The user verified it, it is merged into `personal`, and stable `v1.5.1` is released (delivery DR-004).
- task_size: `Small` (SR-007; originally `Medium`) · architectural_risk: `Low` · route: direct. Architecture review `N/A — not applicable`; test-code review `Not Required — direct low-risk route`. The user-requested independent code review CRR-001 was addressed by SR-007, IR-002 and API-REV-003.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support` was removed after finalization. Branch `origin/codex/claude-5-5-model-support` is kept as a review reference.

## Final state

- User verification: 2026-10-11, "verified finaliize and release a new stable version." (`user-verification.md`)
- Base change after verification: `96da4ba32` added only files under `tickets/done/delegated-copy-task-locator/`. It was merged into the ticket branch as `80b3ef38b`. The ts LLM unit suite (524/524) and `tsc` were re-run clean (`delivery-evidence/dr-004/post-integration-check.log`). Renewed verification was not needed.
- Ticket commits:
  - `bc1777e02`: feature
  - `68269cfae`: live E2E tests
  - `b38d0a909`: SR-007 refactor
  - `31132efcf`: live-test headers
  - `2aa2a6062`: delivery docs
  - `80b3ef38b`: base merge
  - `6530910b1`: ticket archive
- Merge into `personal`: `--no-ff` `5c5404a00`. Its tree is identical to the verified branch. Licensing, artifact-hygiene and Windows-path checks all passed. Pushed as `96da4ba32..5c5404a00`.
- Release: `v1.5.1` from release commit `c3ced6563` (1.5.1-beta.3 → 1.5.1, curated notes `release-notes-v1.5.1.md`).
  - The GitHub release is **Latest**, with 17 assets.
  - All four workflows succeeded on attempt 1.
  - The updater metadata reports 1.5.1.
  - Docker `:1.5.1`, `:latest` and `:beta` share digest `sha256:725e2ca8…f01a` (amd64, arm64).

## What changed

- Catalog rows `claude-sonnet-5-5` and `claude-haiku-5-5`: 1M context and 128K output, Standard pricing. Haiku is tiered at 100K prompt tokens, cache tokens included.
- Exact-value request policy `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts`. It is a union keyed by thinking mode, with an explicit row for every catalog model, including `claude-sonnet-4-6`.
  - Thinking Off: Sonnet sends `between_tools`, Haiku sends `disabled`. Thinking On sends `adaptive` plus the display setting.
  - No sampling parameters are sent. Sonnet 5.5 rejects a forced `tool_choice`.
  - Request payloads for existing models are unchanged. The Opus 5.5 local error text now names the model value.
- Docs updated:
  - `provider_model_catalogs.md`
  - `llm_module_design_nodejs.md`
  - `token_usage.md`
  - `secret_management.md`

## Validation evidence

- API-REV-003 (Pass, 95%) and the delivery post-integration rerun: ts LLM unit 524/524, `tsc` clean, server token-usage 111/111.
- API-REV-001/002 live evidence still applies:
  - live Claude 5.5 server E2E: 6/6
  - Haiku Token Meter tiers: exact
  - prompt-caching live: 7/7 on each 5.5 model
  - browser check
  - packaged desktop: 6/6 journeys

## Residual risks

1. Compaction on the 5.5 models is unit-proven only.
2. Prices checked against approved requirements, not Anthropic billing.
3. Changing Thinking on an active run not covered.
4. C-10 (Opus 5.5 rejects `thinking_enabled: false`) predates this ticket; held.
5. Forced `tool_choice` proven by unit tests only (no runtime trigger).

## Rollback

Revert release commit `c3ced6563` and merge `5c5404a00` on `personal`. Then supersede `v1.5.1` with a new stable or beta release. There is no data migration.
