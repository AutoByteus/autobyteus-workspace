# Investigation Notes

## Investigation Status

- Bootstrap Status: `Partial bootstrap completed; dedicated task branch/worktree not created because remote refresh / branch bootstrap was blocked during the earlier restricted-environment pass.`
- Current Status: `Requirements remain approved; design spec revised again after code-review structural blocker CR-003 on ProviderAPIKeyManager and prepared for architect re-review`
- Investigation Goal: `Understand current localization readiness and define a design-ready requirements basis and target design for multilingual UI support.`
- Scope Classification (`Small`/`Medium`/`Large`): `Large`
- Scope Classification Rationale: `No existing i18n foundation, English literals distributed broadly across app surfaces, and future-language extensibility is required in addition to immediate Simplified Chinese support.`
- Scope Summary: `Design an app-wide localization foundation for autobyteus-web that supports English and Simplified Chinese now, defaults to system language, allows manual override from Settings, prevents wrong-locale first paint, and scales to future locales.`
- Primary Questions To Resolve:
  - `Resolved: Chinese means Simplified Chinese for v1.`
  - `Resolved: first release covers all product-owned UI.`
  - `Resolved: language selection lives in Settings with System Default + manual override.`
  - `Resolved in design: first product UI paint is gated until localization runtime is ready.`
  - `Resolved in design: system locale precedence and normalization rules are explicit.`
  - `Resolved in design: migration completion requires authoritative inventory + mandatory guard/audit closure.`
  - `Resolved in design: the ProviderAPIKeyManager settings surface is decomposed into bounded owners before M-002 can close.`

## Request Context

- User request: `i would like to support multilanguage. currently i only have english support. now i would like to support chinese. and maybe in the future i wanna support other languages as well.`
- Approved clarifications:
  - `Simplified Chinese`
  - `all product-owned UI`
  - `Settings + System Default`
- Interpreted product direction: `Deliver English + Simplified Chinese now, but architect for additional locales rather than building a one-off Chinese patch.`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/in-progress/multilingual-ui-support`
- Current Branch: `personal`
- Current Worktree / Working Directory: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `Unknown (remote refresh blocked during initial pass)`
- Remote Refresh Result: `Earlier attempt failed because github.com DNS/network access was unavailable in that environment.`
- Task Branch: `Not created`
- Expected Base Branch (if known): `Unknown`
- Expected Finalization Target (if known): `Unknown`
- Bootstrap Blockers:
  - `Fresh task-branch bootstrap from tracked remote state was not completed in the initial environment.`
- Notes For Downstream Agents:
  - `Design work proceeded from current repo state.`
  - `Requirements remain user-approved; review-driven refinements tightened execution/closure semantics without changing user-facing scope.`

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-09 | Command | `pwd`, `ls -la`, `find . -maxdepth 2 -type f` | Bootstrap repo context | Confirmed monorepo root and major packages; `autobyteus-web` is the main app candidate | No |
| 2026-04-09 | Doc | `.codex/skills/autobyteus-solution-designer-35bf/SKILL.md` | Follow required workflow | Confirmed need for requirements doc, investigation notes, user confirmation before design | No |
| 2026-04-09 | Doc | `.codex/skills/autobyteus-solution-designer-35bf/design-principles.md` | Align design investigation with team design rules | Confirmed authoritative-boundary and spine-led design expectations | No |
| 2026-04-09 | Command | `git branch --show-current && git status --short && git remote show origin` | Discover branch/bootstrap context | Current branch is `personal`; remote inspection failed in earlier environment | No |
| 2026-04-09 | Code | `autobyteus-web/package.json` | Identify app stack and delivery hooks | Nuxt 3 + Pinia + Electron app; existing `guard:web-boundary` script shows precedent for mandatory boundary guards | No |
| 2026-04-09 | Code | `autobyteus-web/nuxt.config.ts` | Verify runtime architecture constraints | SPA/Electron config with plugins/modules, but no app-wide i18n registration | No |
| 2026-04-09 | Command | `rg -n '(i18n|locale|locales|language|translate|translation)' autobyteus-web` and `rg -n '(\$t\(|t\()' autobyteus-web` | Check for existing localization system | No meaningful app-wide i18n usage found; no `$t()` or shared translation boundary detected | No |
| 2026-04-09 | Command | Hard-coded text scans across `pages`, `components`, `layouts`, `stores`, `composables`, `services` | Sample current product copy distribution | Found many English literals in layouts, pages, settings, status/loading/empty states, labels, and toasts | No |
| 2026-04-09 | Code | `autobyteus-web/pages/settings.vue` | Inspect settings ownership | Settings nav/content area contains direct English UI strings and is the correct location for a Language menu item | No |
| 2026-04-09 | Code | `autobyteus-web/components/layout/LeftSidebarStrip.vue`, `autobyteus-web/components/AppLeftPanel.vue`, `autobyteus-web/layouts/default.vue` | Inspect shell/navigation ownership | Core shell labels/tooltips/header text are hard-coded | No |
| 2026-04-09 | Code | `autobyteus-web/composables/useToasts.ts` | Check how action feedback is emitted | Toast helper is plain string-based; callers currently pass hard-coded English strings | No |
| 2026-04-09 | Code | `autobyteus-web/stores/applicationLaunchProfileStore.ts`, `autobyteus-web/stores/nodeStore.ts` | Inspect preference persistence patterns | Local-storage persistence patterns already exist and can inform locale preference ownership | No |
| 2026-04-09 | Code | `autobyteus-web/electron/preload.ts`, `autobyteus-web/types/electron.d.ts`, `autobyteus-web/electron/main.ts` | Inspect Electron boundary | No existing app-locale IPC surface exists today | No |
| 2026-04-09 | Code | `autobyteus-web/app.vue` | Resolve first-render gating options | App root already gates `NuxtLayout` behind `isAppReady`; this is the correct current surface to compose localization readiness into first product paint control | No |
| 2026-04-09 | Doc | `tickets/in-progress/multilingual-ui-support/design-review-report.md` | Process architect review findings | Review required explicit first-paint contract, migration closure/audit, and resolver precedence/normalization | No |
| 2026-04-09 | Doc | `tickets/in-progress/multilingual-ui-support/review-report.md` | Process resumed code-review findings after validation round 8 | Review reopened the ticket as `Design Impact` because `components/settings/ProviderAPIKeyManager.vue` is a 627-line mixed-concern touched source | No |
| 2026-04-09 | Code | `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | Inspect the concrete changed settings surface named in CR-003 | Confirmed one SFC currently mixes provider/model browser presentation, Gemini setup workflow, generic provider key editing, reload actions, notification lifecycle, and large template rendering | No |
| 2026-04-09 | Code | `autobyteus-web/stores/llmProviderConfig.ts` | Verify what the existing store already owns so the redesign does not create duplicate data/runtime owners | Store already owns provider/model query + reload + API-key + Gemini setup mutations and should remain the single backend-facing data owner | No |
| 2026-04-09 | Code | `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` | Inspect current durable behavior coverage for the touched settings surface | Current tests prove localized behavior and Gemini/key-save flows, so the blocker is structural file ownership rather than missing behavioral validation | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - `autobyteus-web/app.vue`
  - `autobyteus-web/layouts/default.vue`
  - `autobyteus-web/components/AppLeftPanel.vue`
  - `autobyteus-web/components/layout/LeftSidebarStrip.vue`
  - `autobyteus-web/pages/settings.vue`
- Current execution flow:
  - `Nuxt app bootstrap -> app.vue mounts product surfaces -> component/template literals or local label arrays -> direct English UI text visible to user`
  - `Store/composable action -> hard-coded English message string -> toast/modal/error UI`
- Ownership or boundary observations:
  - There is no authoritative localization boundary today.
  - Product-owned copy is fragmented across UI layers.
  - Store/composable-originated messages mean localization cannot live only in SFC templates.
  - There is no current `Language` settings section or persisted app-locale owner.
  - `app.vue` already owns a top-level readiness gate for embedded server status and is the natural place to compose localization readiness into first product paint behavior.
- Current behavior summary:
  - The app is effectively English-only, with hard-coded product copy rendered directly from many ownership points and no first-paint locale gate.

## Review-Driven Upstream Rework Notes

- Round-1 design review required explicit first-paint, locale-normalization, and migration-closure design contracts; these were incorporated into the revised design.
- Round-2 design review confirmed DI-001 and DI-003 resolved, but kept DI-002 open because the migration matrix omitted known in-scope user-facing clusters.
- The revised matrix now explicitly assigns the previously omitted known clusters:
  - `components/server/**`
  - `components/ui/**`
  - `components/agentInput/**`
  - `pages/index.vue` as part of the root/shell row
- The revised design also adds a `Known In-Scope Path Cluster Assignment Check` so the matrix remains authoritative against current repo reality.
- Code review round 5 / validation round 8 reopened the upstream work as `Design Impact` with `CR-003`: `components/settings/ProviderAPIKeyManager.vue` is `627` effective non-empty lines and remains a mixed owner across provider/model browser presentation, Gemini setup, generic provider key editing/saving, and local notification/reload orchestration.
- The revised design now treats this as an explicit `M-002` structural closure requirement: keep `ProviderAPIKeyManager.vue` as the Settings section entry, but split the implementation into a thin section shell plus dedicated owners for provider/model browser presentation, Gemini setup, generic provider API-key editing, and local section runtime/orchestration.
- The revised design keeps `useLLMProviderConfigStore` as the single backend/data owner; the split is view/runtime ownership cleanup, not a second provider store.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/app.vue` | App root shell and readiness gate | Already gates `NuxtLayout` with `isAppReady` | Correct surface to compose localization-ready gating for first product UI paint |
| `autobyteus-web/nuxt.config.ts` | App runtime configuration | No app-wide i18n module/plugin today | Need an explicit localization runtime boundary |
| `autobyteus-web/layouts/default.vue` | Top-level layout shell | Hard-coded header and accessibility text | Shell copy should resolve through shared localization |
| `autobyteus-web/components/AppLeftPanel.vue` | Primary shell navigation | Labels and footer Settings text are hard-coded | Navigation metadata should become locale-driven |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Collapsed navigation strip | Labels/tooltips stored as English literals in component data | Navigation metadata should become locale-driven |
| `autobyteus-web/pages/settings.vue` | Settings page shell and section nav | Large concentration of English product copy; no Language section exists | Correct owner for Language menu item/section |
| `autobyteus-web/composables/useToasts.ts` | Toast delivery helper | Accepts plain strings only; upstream callers supply English literals | Non-component message producers need localization access |
| `autobyteus-web/stores/applicationLaunchProfileStore.ts` | Local preference persistence example | Uses browser localStorage successfully | Locale preference can reuse established persistence patterns |
| `autobyteus-web/stores/nodeStore.ts` | More robust localStorage persistence example | Includes safe fallback/validation patterns | Good reference for persisted locale-setting ownership |
| `autobyteus-web/electron/preload.ts` / `autobyteus-web/types/electron.d.ts` / `autobyteus-web/electron/main.ts` | Electron renderer bridge | No app-locale IPC surface exists | Needed for authoritative system-locale resolution in Electron |
| `autobyteus-web/package.json` | Build/test script entrypoint | Existing boundary guard precedent already exists | A localization boundary guard and audit can be made mandatory via scripts/CI |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | Settings API-key management section | Current touched file is a 627-line mixed owner spanning browser UI, forms, reloads, and notifications | Must be reduced to a thin section shell with extracted bounded owners before delivery |
| `autobyteus-web/stores/llmProviderConfig.ts` | Provider/model data and mutation store | Already owns provider/model fetching, provider reload, generic API-key save, and Gemini setup mutation flows | The redesign should reuse this store rather than introducing a second backend-facing owner |
| `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` | Durable settings behavior coverage | Existing tests already cover the latest localized behavior and key Gemini/provider save paths | Structural split must preserve or redistribute this coverage without weakening it |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-09 | Probe | `rg -n '(\$t\(|t\()' autobyteus-web` | No meaningful translation API usage found | Need new localization boundary rather than extending an existing one |
| 2026-04-09 | Probe | Hard-coded text scans across `pages`, `components`, `layouts`, `stores`, `composables` | High volume of English literals across many layers | Scope is architectural, not a one-file patch |
| 2026-04-09 | Probe | Electron bridge inspection | No `getAppLocale()` style method exists | System-default resolution needs explicit renderer-accessible boundary |
| 2026-04-09 | Probe | App root inspection | `app.vue` already blocks `NuxtLayout` until `isAppReady` | Existing top-level gating mechanism can be extended to prevent wrong-locale first paint |
| 2026-04-09 | Probe | Script/build inspection | `package.json` already wires a hard boundary guard (`guard:web-boundary`) | Mandatory localization guard/audit is consistent with current repo delivery patterns |

## External / Public Source Findings

- None consulted.
- This investigation used repo-local evidence only.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures:
  - `None for the investigation pass.`
- Required config, feature flags, env vars, or accounts:
  - `None for the investigation pass.`
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - `None.`
- Setup commands that materially affected the investigation:
  - `Repository inspection commands only; no app runtime boot required yet.`
- Cleanup notes for temporary investigation-only setup:
  - `None.`

## Findings From Code / Docs / Data / Logs

1. There is no meaningful existing internationalization system in `autobyteus-web`.
2. Core product UI copy is hard-coded directly in many Vue templates.
3. Product copy also exists outside templates in stores, modal configs, labels, placeholders, and toast/error strings.
4. Any solution limited to SFC template translation helpers will be incomplete because non-component producers also emit UI copy.
5. Existing local-storage persistence patterns indicate locale selection can likely be persisted without introducing a new persistence technology.
6. Electron currently lacks a dedicated app-locale bridge, so `System Default` needs an explicit renderer-facing resolution path.
7. `app.vue` already contains a top-level readiness gate; the design can use that existing owner to hard-gate first localized product paint.
8. The repo already uses a mandatory boundary guard pattern in `package.json`, so a localization boundary guard plus literal audit is delivery-compatible.
9. The request is not just `add Chinese strings`; it implies a future-proof localization architecture for additional languages plus full current-product migration closure.
10. The latest implementation also exposed a settings-structure debt: `ProviderAPIKeyManager.vue` is now a touched oversized mixed owner, so `M-002` cannot close on localization behavior alone; the provider settings surface must be split into clearer local owners.

## Constraints / Dependencies / Compatibility Facts

- App stack: `Nuxt 3`, `Pinia`, `Electron` packaging.
- Current runtime is client-side rendered (`ssr: false`) in `nuxt.config.ts`.
- No existing i18n dependency or plugin registration is present.
- The app contains both web-style and Electron-style runtime code, so the localization solution must not depend on a browser-only assumption without fallback handling.
- Some product text is represented as inline data arrays or store messages rather than template literals.
- `AppUpdateNotice`, `UiErrorPanel`, `ToastContainer`, and `NuxtLayout` currently mount from `app.vue`, so first-paint gating must account for root-level product UI surfaces, not just page content.
- The current delivery bar for touched sources includes the hard file-size and ownership review checks; `components/settings/ProviderAPIKeyManager.vue` currently violates that bar and must be structurally decomposed as part of settings-scope closure.

## Open Unknowns / Risks

- Full product-owned UI migration may expose duplicated or inconsistent copy that should be normalized while introducing translation keys.
- Not every transient message payload should necessarily be retroactively re-localized after emission; the design should limit runtime switching to live UI surfaces and newly emitted feedback.
- If future locales need pluralization/number/date formatting beyond current UI copy, the localization boundary should remain extensible enough to add those concerns later.
- The required ProviderAPIKeyManager split must preserve the round-8 localized behavior and durable test coverage while reducing owner/file size pressure.

## Notes For Architect Reviewer

- Requirements remain user-approved and now explicitly include first-paint, normalization, and migration-closure semantics.
- Revised design uses `app.vue` readiness composition as the concrete first localized paint gate.
- Revised design makes migration closure authoritative through an explicit scope matrix plus mandatory guard/audit scripts.
- Revised design makes Electron-vs-browser locale precedence and Chinese/English normalization explicit.
