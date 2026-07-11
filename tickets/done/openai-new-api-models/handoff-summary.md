# OpenAI GPT-5.6 API Models — Delivery Handoff

## Status

`Completed — repository finalized and release v1.4.8 published`

Round 2 supersedes the earlier held/provisional round-1 delivery artifacts. The
user tested the README-guided local Electron build and explicitly requested
finalization plus a new release version. Release `v1.4.8` is the next patch
version after the current `1.4.7` package/tag state.

## Integrated State

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models`
- Ticket branch: `codex/openai-new-api-models`
- Round-2 reconciliation commit: `96f73433a5ddc5e05d343b04d3852d1825b90234`
- Round-2 source-review handoff commit: `df071972`
- Round-2 API/E2E report/evidence commit: `4cbacf72b1b8aabc968324054545a50b490bd3fb`
- Recorded finalization target: `origin/personal`
- Bootstrap base: `3effb76ab56d4d1bb876ad0623a8e5eb7093a584`
- Delivery refresh: `git fetch origin personal` on 2026-07-10
- Latest tracked base after refresh: `origin/personal` at `3effb76ab56d4d1bb876ad0623a8e5eb7093a584`
- Ref result: branch ahead 6 / behind 0; merge-base is the recorded base.
- Integration method/result: `Already current`; the base did not advance, so no merge, rebase, or delivery checkpoint commit was required.
- Post-refresh executable rerun: Not required because no base commit entered the round-2 reviewed/validated candidate. Delivery ran static diff and documentation assertions after updating round-2 docs and handoff artifacts.

## Delivered Scope

- Registered exactly these built-in OpenAI API IDs:
  - `gpt-5.6-sol`
  - `gpt-5.6-terra`
  - `gpt-5.6-luna`
- Added curated 1,050,000 context-token and 128,000 output-token limits.
- Added a GPT-5.6-only reasoning schema with `none`, `low`, `medium`, `high`, `xhigh`, and `max`; default is `medium`.
- Added trusted standard and >272K input tiers with input, output, cache-read, and generic cache-write prices.
- Mapped documented direct OpenAI API `cache_write_tokens` details into the existing generic cache-creation usage component while retaining gross-input semantics.
- Preserved the existing server-authoritative live-event/ledger/GraphQL/frontend Token Meter path; no frontend production pricing branch or cost recomputation was added.
- Preserved the separate current Codex app-server source contract without production changes: cached input maps to reads, missing cache writes remain unknown/null, the uncached remainder remains standard input, and a trusted write rate without a quantity creates no write cost or row.
- Added durable direct-API accounting/GraphQL/frontend convergence coverage and strengthened Codex source-versus-injected/no-fabrication coverage.

## Important Changed Areas

Production:

- `autobyteus-ts/src/llm/supported-model-definitions.ts`
- `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`
- `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts`

Round-2 durable reconciliation coverage:

- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`

Existing valid direct-API/server/frontend coverage includes:

- `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts`
- `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`
- Focused catalog/request/normalizer and Token Meter component tests listed in the implementation and API/E2E reports.

## Validation And Review

- Architecture review round 2: `Pass`.
- Implementation source review round 2: `Pass`, score `9.63/10`, no findings.
- API/E2E round 2: `Pass`, final confidence `96.6%`; every category is at least `95%`.
- Separate round-2 proportional durable test-code review: `Pass`, no findings.
- Current generated-protocol gate: PATH Codex `0.144.1` and Codex.app resource `0.144.0-alpha.4` generated identical relevant token types with only total/input/cached-input/output/reasoning fields and zero write-key matches.
- Deterministic execution passed:
  - focused `autobyteus-ts` catalog/request/normalizer coverage: 36 tests;
  - focused Codex no-fabrication coverage: 31 tests;
  - broader affected server coverage: 84 tests across 17 files;
  - server GPT-5.6 accounting/GraphQL E2E: 2 cases;
  - focused frontend store/Token Meter coverage: 19 tests;
  - broader affected frontend coverage: 27 tests across 6 files;
  - production builds for `autobyteus-ts`, `autobyteus-server-ts` (`build:full`), and `autobyteus-web`.
- Repository-wide `autobyteus-server-ts typecheck` remains a pre-existing configuration limitation: it reports exactly 519 `TS6059` diagnostics because `rootDir: src` conflicts with included tests. This is baseline-only; production `build:full` passes.
- Browser execution was proportionately not required: no frontend production or Electron/shell boundary changed, Nuxt rendered/accessibility states passed, null/no-row behavior passed, and the web production build passed.

Authoritative validation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/api-e2e-execution-coverage-report.md`.

## Documentation Sync

Updated long-lived documentation:

- `autobyteus-ts/docs/provider_model_catalogs.md`
- `autobyteus-ts/docs/llm_module_design.md`
- `autobyteus-ts/docs/llm_module_design_nodejs.md`
- `autobyteus-server-ts/docs/modules/token_usage.md`

The final docs explicitly distinguish direct OpenAI API cache-write observability from the current Codex app-server no-write-field contract. Frontend docs were reviewed and require no change because the existing provider-neutral conditional display contract already remains accurate. Details: `docs-sync-report.md`.

Release notes were updated in place at `tickets/done/openai-new-api-models/release-notes.md`. No version or release action has been selected or executed.

## Residual Risk And Explicit Non-Claims

- The configured OpenAI API credential is valid but not entitled to `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna`. All three minimal live calls returned the limited-preview `model_not_found` response.
- Therefore successful live Responses invocation and an actual raw direct API `cache_write_tokens` payload are **unverified and not claimed** under conditional `AC-010`.
- Current Codex app-server events expose no write quantity. Codex may perform internal writes, but AutoByteus cannot observe, separately price, or display them and must not infer them from gross input minus cached reads.
- Upstream Codex source evidence is `tokenUsage` and selected `raw_usage_json`. AutoByteus-enriched `raw_event_json` can contain injected canonical null reconciliation metadata and must not be mistaken for an upstream write field.
- Repository-wide server typecheck has the pre-existing 519-diagnostic `TS6059` configuration baseline; production `build:full` passes.
- In the reviewed write-only Token Meter fixture/state, the neighboring `Cache hits` row remains an accepted empty row. This existing presentation is not a delivery blocker.
- No model alias, entitlement fallback/substitution, SDK update, compatibility wrapper, speculative Codex write alias, provider-specific frontend branch, database migration, or historical usage rewrite was introduced.

## Local Electron Test Build

At the user's request, delivery followed `autobyteus-web/README.md` and built a
local macOS ARM64 Electron package with the integrated backend.

- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac`
- Result: `Pass`.
- Build flavor/version: `enterprise` / `1.4.7`.
- App: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.7.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.7.zip`
- Signing: local test path only; no Developer ID/notarization/timestamp claim. macOS may require **right-click -> Open**.
- Evidence: `tickets/done/openai-new-api-models/electron-test-build-report.md` and `evidence/round2-electron-test-build.log`.
- Cleanup: the local test package was removed with the dedicated ticket
  worktree after the user verified it and release finalization completed.

The build was created after confirming `origin/personal` was still the recorded
base. It does not authorize or perform repository finalization.

## User Verification Received

- Verification: `Yes`.
- User reference: `i tested. now finalize and release a new version`.
- Verified artifact: README-guided enterprise `1.4.7` macOS ARM64 Electron
  package recorded in `electron-test-build-report.md`.
- Authorized action: archive the ticket, commit/push the ticket branch, merge
  into `personal`, publish release `v1.4.8`, and clean up the dedicated ticket
  worktree/branches after safe finalization.

Delivery refreshed `origin/personal` after verification and confirmed it still
matched the verified handoff base. Finalization and release completed as
recorded below.

## Finalization And Release Completion

- Archived ticket/finalization commit: `67090a7236b0fc03af0b83e1595a51013fede3a9`.
- Ticket branch push: completed before merge; remote branch removed after
  release.
- Finalization target: `origin/personal`.
- Target integration: fast-forwarded from
  `3effb76ab56d4d1bb876ad0623a8e5eb7093a584` to `67090a7236b0fc03af0b83e1595a51013fede3a9`.
- Release commit: `d3d75c5b7aff708bf8a6fa9946d7c7023975c807`.
- Release tag: `v1.4.8`; annotated tag object
  `d4cc60079d4c9030ae8c85451cc9ffd6c8101086`.
- GitHub release: `https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.8`.
- Release workflows: Desktop, Android APK, iOS App Store Connect, Messaging
  Gateway, and Server Docker all completed successfully.
- Docker image: `autobyteus/autobyteus-server:1.4.8`, multi-platform manifest
  digest `sha256:0301a2d12986a5774bd3bb5ae986991e5258e76a0bee0438b9fccf0186a4f9fc`
  for `linux/amd64` and `linux/arm64`.
- Cleanup: dedicated ticket worktree removed; local and remote
  `codex/openai-new-api-models` branches deleted; worktree metadata pruned.
- Release evidence: `release-v1.4.8.log`,
  `release-workflow-status-v1.4.8.log`,
  `release-v1.4.8-github-release.json`,
  `release-v1.4.8-github-runs.json`, and
  `release-v1.4.8-docker-manifest.log`.
