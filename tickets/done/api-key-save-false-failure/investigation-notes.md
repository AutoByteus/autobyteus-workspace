# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Root cause identified, fix implemented, focused validation completed
- Investigation Goal: Determine why built-in provider saves show failure despite successful persistence, then fix and validate it.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: The bug is localized to frontend provider-save state synchronization and regression coverage.
- Scope Summary: Backend save succeeds, but frontend built-in-provider/Gemini flows mutate hydrated provider rows in place after success. Replacing that with immutable store updates fixes the false failure.
- Primary Questions To Resolve:
  - Does the live backend actually return success? -> Yes.
  - Is the bug shared by built-in providers and Gemini but not custom providers? -> Yes.
  - What frontend-only difference explains that split? -> Built-in/Gemini flows mutate hydrated provider rows in place; custom provider flow reloads instead.

## Request Context

- User reported that saving Gemini and other fixed providers shows failure even though the save itself succeeds.
- User clarified that custom OpenAI-compatible provider creation works correctly while fixed providers fail.
- User explicitly allowed live backend probing against the already running server and suggested direct backend calls for confirmation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-save-false-failure`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-save-false-failure/tickets/in-progress/api-key-save-false-failure`
- Current Branch: `codex/api-key-save-false-failure`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-save-false-failure`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` completed without reported errors on 2026-04-18
- Task Branch: `codex/api-key-save-false-failure`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: none
- Notes For Downstream Agents: worktree uses symlinked `node_modules` from the main checkout for local validation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-18 | Command | `pwd` | Resolve workspace root for bootstrap | Workspace root confirmed before worktree creation. | No |
| 2026-04-18 | Command | `git rev-parse --is-inside-work-tree && git branch --show-current && git status --short --branch && git remote show origin ...` | Discover repo/base context | User checkout was `personal`; remote default resolved to `personal`. | No |
| 2026-04-18 | Command | `git fetch origin` | Refresh remote refs before task worktree creation | Refresh succeeded. | No |
| 2026-04-18 | Command | `git worktree add -b codex/api-key-save-false-failure ... origin/personal` | Create dedicated task worktree | Dedicated worktree/branch created successfully. | No |
| 2026-04-18 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/autobyteus-solution-designer-3225/design-principles.md` | Read required design guidance | Used as shared design reference. | No |
| 2026-04-18 | Code | `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | Inspect frontend save owner | Gemini runtime directly mutated hydrated provider row after successful save. | Yes |
| 2026-04-18 | Code | `autobyteus-web/stores/llmProviderConfig.ts` | Inspect store save path | Built-in provider save directly mutated hydrated provider row after successful mutation. Custom-provider flow reloaded instead. | Yes |
| 2026-04-18 | Code | `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts`, `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | Inspect existing regression coverage | Existing tests covered success/failure messaging but not immutable hydrated rows. | Yes |
| 2026-04-18 | Command | `curl http://127.0.0.1:8000/graphql ... setLlmProviderApiKey`, `curl http://127.0.0.1:8000/graphql ... setGeminiSetupConfig` | Probe standalone backend save response | Standalone backend returned success strings for both mutations. | No |
| 2026-04-18 | Command | `curl http://127.0.0.1:29695/graphql ... setLlmProviderApiKey`, `curl http://127.0.0.1:29695/graphql ... setGeminiSetupConfig` | Probe actual embedded desktop backend | Embedded backend also returned success strings for both mutations, ruling out backend response failure. | No |
| 2026-04-18 | Command | `npx asar list /Applications/AutoByteus.app/.../app.asar` + extraction of `dist/renderer/_nuxt/llmProviderConfig...js` | Verify packaged frontend code path | Packaged app used the same in-place mutation logic as source. | No |
| 2026-04-18 | Setup | symlink worktree `node_modules` to main checkout; copy `autobyteus-web/.env` and `autobyteus-server-ts/.env`; `pnpm ... exec nuxt prepare` | Enable local validation in worktree | Worktree became runnable/testable without full reinstall. | No |
| 2026-04-18 | Command | `pnpm --dir .../autobyteus-web test:nuxt --run tests/stores/llmProviderConfigStore.test.ts components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` | Validate focused regression coverage | 13 tests passed after the fix. | No |
| 2026-04-18 | Trace | Source Nuxt frontend on `127.0.0.1:3300` bound to embedded backend `127.0.0.1:29695` + headless Playwright save flows | Validate real UI save behavior after fix | OpenAI save showed `API key for OpenAI saved successfully`; Gemini save showed `Gemini setup saved successfully`. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `ProviderAPIKeyManager.vue` delegates save actions into `useProviderApiKeySectionRuntime`, which delegates built-in provider state synchronization into `useLLMProviderConfigStore`.
- Current execution flow (before fix):
  - Built-in provider: UI -> `saveProviderApiKey` -> `store.setLLMProviderApiKey` -> GraphQL success -> direct nested mutation of hydrated `providersWithModels[row].provider.apiKeyConfigured`
  - Gemini: UI -> `saveGeminiSetup` -> `store.setGeminiSetupConfig` -> GraphQL success -> runtime direct nested mutation of hydrated `providersWithModels[row].provider.apiKeyConfigured`
  - Custom provider: UI -> `saveCustomProviderDraft` -> `store.createCustomProvider` -> provider reload/hydration
- Ownership or boundary observations: the store is the correct authoritative boundary for provider configured-state synchronization; the runtime-level Gemini row mutation bypassed that owner and duplicated responsibility.
- Current behavior summary: backend saves succeeded, but the built-in/Gemini post-save path used unsafe direct mutation of hydrated provider rows and could throw after the successful mutation.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | Provider config query/mutation owner | Built-in provider save mutated hydrated provider row in place; custom provider flow reloaded provider data instead. | Store should own immutable provider configured-state replacement. |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | Settings UI runtime orchestration | Gemini runtime duplicated provider-row mutation after store success. | Remove duplicated runtime mutation; keep state sync in store. |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | Store regression coverage | No immutable-hydrated-row save regression coverage existed. | Add frozen-row regression test. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` | Runtime regression coverage | No Gemini immutable-row regression coverage existed. | Add frozen-row Gemini regression test. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-18 | Probe | Direct GraphQL mutation against `http://127.0.0.1:29695/graphql` for OpenAI and Gemini | Both mutations returned successful strings. | Backend contract is not the false-failure source. |
| 2026-04-18 | Trace | Packaged renderer chunk extraction from `app.asar` | Packaged frontend still used direct nested mutation after successful save. | Bug exists in shipped frontend logic. |
| 2026-04-18 | Test | Frozen-row store/runtime tests | Pre-fix shape would fail; post-fix immutable replacements pass. | Root-cause fix is frontend immutable state synchronization. |
| 2026-04-18 | Repro | Headless Playwright against source Nuxt frontend bound to embedded backend | OpenAI and Gemini now both show success toasts after save. | Live UI validation passed after fix. |

## External / Public Source Findings

- none needed

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures:
  - Embedded backend from installed AutoByteus app on `127.0.0.1:29695`
  - Source Nuxt frontend from worktree on `127.0.0.1:3300`
- Required config, feature flags, env vars, or accounts:
  - `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695` when running the source frontend for UI validation
- Setup commands that materially affected the investigation:
  - `pnpm --dir .../autobyteus-web exec nuxt prepare`
  - `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm exec nuxt dev --host 127.0.0.1 --port 3300`
- Cleanup notes for temporary investigation-only setup:
  - temp Playwright scripts in `autobyteus-web/.tmp-playwright-*.mjs`

## Findings From Code / Docs / Data / Logs

- The actual desktop backend is healthy and returns successful save responses.
- The shipped frontend bundle still contained direct nested mutation logic on hydrated provider rows.
- The bug split exactly matches the code split: custom provider path reloads, built-in/Gemini paths mutate in place.

## Constraints / Dependencies / Compatibility Facts

- Preserve current GraphQL mutation contracts for this ticket.
- Keep provider configured-state synchronization inside the provider-config store.

## Open Unknowns / Risks

- The precise runtime mechanism that makes hydrated rows effectively immutable can vary, but the in-place mutation remains unsafe and redundant regardless.

## Notes For Architect Reviewer

- Small frontend-only fix. The authoritative boundary stays the store; runtime-side Gemini mutation is removed; built-in/Gemini configured-state updates become immutable replacements.
