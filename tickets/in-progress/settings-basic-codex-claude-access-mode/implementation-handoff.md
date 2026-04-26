# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/in-progress/settings-basic-codex-claude-access-mode/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/in-progress/settings-basic-codex-claude-access-mode/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/in-progress/settings-basic-codex-claude-access-mode/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/in-progress/settings-basic-codex-claude-access-mode/design-review-report.md`

## What Changed

- Added a Codex-owned sandbox setting source of truth under `runtime-management/codex` with the canonical key, supported values, default, type guard, and pure normalizer.
- Updated Codex thread config/bootstrap behavior to use the shared sandbox type/normalizer and removed bootstrapper-local default/valid-value constants.
- Registered `CODEX_APP_SERVER_SANDBOX` as a predefined server setting with editable/non-deletable metadata and allowed-value validation before `AppConfig.set`.
- Added a Codex-only Basic Settings card that presents the three sandbox modes, falls back to `workspace-write` when the stored value is absent/invalid, preserves dirty local edits across store refreshes, and saves through `serverSettingsStore.updateServerSetting('CODEX_APP_SERVER_SANDBOX', value)`.
- Added localized English and Simplified Chinese copy, including explicit `danger-full-access` wording that filesystem sandboxing is disabled.
- Added focused backend/runtime/frontend tests for normalization, server-side validation/metadata, card sync/save behavior, and page composition.

## Key Files Or Areas

- `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts`
- `autobyteus-server-ts/src/services/server-settings-service.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts`
- `autobyteus-web/components/settings/CodexSandboxModeCard.vue`
- `autobyteus-web/components/settings/ServerSettingsManager.vue`
- `autobyteus-web/localization/messages/en/settings.ts`
- `autobyteus-web/localization/messages/zh-CN/settings.ts`
- Tests:
  - `autobyteus-server-ts/tests/unit/runtime-management/codex/codex-sandbox-mode-setting.test.ts`
  - `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - `autobyteus-web/components/settings/__tests__/CodexSandboxModeCard.spec.ts`
  - `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts`

## Important Assumptions

- Claude remains out of scope; no Claude UI, Claude runtime behavior, or generic multi-runtime access-mode abstraction was added.
- Frontend option values intentionally mirror the backend canonical values for display and selection, while backend validation remains authoritative.
- Existing invalid persisted/env values are not silently rewritten on read; runtime and the Basic card fall back to `workspace-write` until a valid canonical value is saved.
- Generated localization catalogs did not require edits for these explicit `settings.ts` keys; `settings.ts` is imported after generated settings catalogs, and localization guards/audit pass.

## Known Risks

- `ServerSettingsManager.vue` already exceeds the team source-file size guardrail before this change. This implementation limited page edits to composition only (+render/import for the new card) to preserve the reviewed design and avoid a broad unrelated settings-page split.
- Full repository web and server typecheck commands expose existing/baseline configuration and type errors outside this change; see local check notes below.
- API/E2E validation should still confirm the persisted setting is visible through GraphQL/Advanced Settings and affects future Codex sessions in a real running server setup.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `No (pre-existing ServerSettingsManager.vue is already >500 effective non-empty lines; implementation kept the required page-composition delta to two lines and did not add new page-owned state)`
- Notes: Bootstrapper-local `DEFAULT_SANDBOX_MODE` and `VALID_SANDBOX_MODES` were removed/replaced by imports from the new Codex-owned setting file. No Claude compatibility path or alternate setting key was introduced.

## Environment Or Dependency Notes

- Ran `pnpm install` in the worktree because package dependencies were not installed in this worktree.
- Ran `pnpm -C autobyteus-web exec nuxi prepare` to generate `.nuxt/tsconfig.json` before Nuxt tests.
- Ran `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` before source build typecheck; the first `tsc -p tsconfig.build.json --noEmit` attempt failed because Prisma client types had not been generated in this fresh worktree.
- Ignored/generated local artifacts from those setup commands remain untracked/ignored (`node_modules`, `.nuxt`, test tmp files, etc.).

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/codex/codex-sandbox-mode-setting.test.ts tests/unit/services/server-settings-service.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts --no-watch` — Passed (3 files, 26 tests).
- `pnpm -C autobyteus-web test:nuxt components/settings/__tests__/CodexSandboxModeCard.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts --run` — Passed after `nuxi prepare` (2 files, 20 tests). First attempt failed because `.nuxt/tsconfig.json` was absent in the fresh worktree.
- `pnpm -C autobyteus-web guard:localization-boundary` — Passed.
- `pnpm -C autobyteus-web audit:localization-literals` — Passed with zero unresolved findings; emitted existing Node module-type warning for `localization/audit/migrationScopes.ts`.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Passed after `prisma generate`.
- `git diff --check` — Passed.
- `pnpm -C autobyteus-server-ts typecheck` — Failed on existing TS6059 rootDir/include mismatch because `tsconfig.json` includes `tests` while `rootDir` is `src`; failures list unrelated test files outside this change.
- `pnpm -C autobyteus-web exec nuxi typecheck` — Failed with broad pre-existing/unrelated type errors across build scripts, tests, stores, generated GraphQL types, Electron API typings, and utilities; no failure was specific to the new Codex sandbox card in the reported output.

## Downstream Validation Hints / Suggested Scenarios

- Through GraphQL/API, verify `getServerSettings` returns `CODEX_APP_SERVER_SANDBOX` as predefined metadata (editable, non-deletable) when present, not as a custom user-defined setting.
- Through GraphQL/API or Advanced Settings, verify saving invalid values such as `full-access` or `danger_full_access` is rejected before persistence and the error lists the canonical values.
- In the UI, verify Basic Settings shows `Workspace write` when the setting is absent or currently invalid, and that `Full access` visibly says no filesystem sandboxing.
- In a real Codex runtime run, save each canonical mode and confirm new/future Codex sessions receive the selected `sandbox` value; existing sessions should not be expected to change.

## API / E2E / Executable Validation Still Required

Yes. Implementation-scoped unit/component/build checks have passed where targeted, but API/E2E validation of GraphQL behavior, integrated UI behavior, and real Codex future-session runtime propagation remains owned by downstream validation.
