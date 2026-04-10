# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Design-ready`

## Metadata

- Ticket: `multilingual-ui-support`
- Owner: `solution_designer`
- Branch: `personal`
- Last Updated: `2026-04-09`

## Goal / Problem Statement

The current `autobyteus-web` app is effectively English-only. There is no app-wide internationalization framework, no locale selection or persistence boundary, and a large amount of product-owned UI copy is hard-coded directly in Vue templates, stores, composables, and action-feedback messages. The product now needs a multilingual foundation that supports English and Simplified Chinese immediately, defaults to the user's system language, allows manual override from Settings, and keeps future language additions structurally straightforward.

## Investigation Findings

- `autobyteus-web` is a Nuxt 3 SPA/Electron app with Pinia stores and no existing app-wide i18n dependency or `$t()`/`t()` usage.
- User-facing English copy is currently spread across pages, layouts, components, stores, composables, modal configs, and toast/error messages.
- There is already one language-specific product area (`Voice Input`) with `Auto / English / Chinese` options, but that is feature-specific and not a general UI-localization system.
- The current architecture will require one authoritative localization boundary rather than ad hoc per-component string constants.
- The scope is large because the requested rollout is all product-owned UI, not a small pilot surface.

## Recommendations

- Build a reusable app-wide localization foundation first, not a Chinese-only patch.
- Treat English as the fallback/source locale and add Simplified Chinese as the first additional locale.
- Add a persisted user language preference with `System Default` as the default mode.
- Add a `Language` menu item/section in `Settings` for manual override.
- Localize product-owned UI strings only in this scope; do not translate user-authored content, model output, file names, or external provider payloads.
- Normalize all new UI copy through one translation lookup boundary so future languages can be added without changing component logic.

## Scope Classification

- Classification: `Large`
- Rationale:
  - There is no existing app-wide i18n framework.
  - Product-owned strings are widely distributed across the app shell, settings, pages, components, stores, composables, and runtime feedback.
  - The feature needs both current-language delivery (`en`, `zh-CN`) and a forward-compatible foundation for future locales.

## In-Scope Use Cases

- `UC-001`: User opens the app in the default configuration and product-owned UI text is shown in the resolved system language when supported.
- `UC-002`: User whose system language resolves to English sees the app in English by default.
- `UC-003`: User whose system language resolves to Simplified Chinese sees the app in Simplified Chinese by default.
- `UC-004`: User opens `Settings` and sees a `Language` menu item/section.
- `UC-005`: User selects `System Default`, `English`, or `Simplified Chinese` from the `Language` settings UI.
- `UC-006`: User selects Simplified Chinese and the product-owned UI switches to Chinese without per-screen code changes.
- `UC-007`: User restarts the app and the chosen language preference is retained.
- `UC-008`: Product-owned shell/navigation/settings/toast/error/loading/empty-state text uses the same localization system rather than mixed ad hoc implementations.
- `UC-009`: Developers add a new user-facing string in the future and do so through the shared localization boundary.
- `UC-010`: Developers add a third language later without redesigning the localization architecture.
- `UC-011`: On first product UI paint, the app does not briefly flash English and then switch to the resolved locale.
- `UC-012`: The implementation closes the all-product-owned-UI migration only after the scoped inventory and required localization audits pass.

## Out Of Scope / Non-Goals

- Automatic translation of user-authored content.
- Automatic translation of LLM responses, tool output, logs, file contents, or external provider data.
- Localizing documentation, tickets, or internal developer-only comments.
- Delivering Traditional Chinese in the first iteration.
- Locale-prefixed routing / SEO-oriented web internationalization.
- Translating server-side persisted domain data whose source of truth is not product-owned UI copy.

## Constraints / Dependencies

- The current app is Nuxt 3 + Pinia + Electron and has no existing app-wide i18n runtime.
- The solution must work in both browser-style Nuxt runtime and Electron-packaged runtime.
- The solution must support future language additions without changing component control flow.
- Missing translations must fail safely through a deterministic fallback path.
- Product-owned enumerations/messages rendered from stores/composables still need localization access without depending on component-only APIs.
- `System Default` must use host runtime locale detection with explicit precedence and fallback to English.
- The solution should avoid route-level locale prefixes unless a later requirement explicitly introduces them.
- Completion for this ticket must include a mandatory migration inventory plus mandatory enforcement/audit for forbidden bypass imports and remaining raw product literals in scoped surfaces.

## Assumptions

- `Chinese` means `Simplified Chinese` / `zh-CN` for v1.
- `English` remains the source/fallback locale.
- The intended scope is all product-owned app UI, not content translation.
- Language switching should apply at runtime without reinstalling the app.
- The first user-facing selector lives in `Settings` as a dedicated `Language` item/section.

## Risks To Track

- The current number of hard-coded strings is high, so incomplete migration could leave mixed-language UI.
- Some UI text originates from stores/composables/toast helpers, so a component-only translation API would be insufficient.
- Product copy may be duplicated or inconsistent today, which can complicate translation-key design.
- Full product-owned UI coverage is materially larger than a narrow pilot.

## Requirements (Verifiable)

- `R-001` (App-Wide Localization Boundary):
  - Expected outcome: The app exposes one authoritative localization boundary for product-owned UI text instead of continuing hard-coded per-component strings.

- `R-002` (Locale Set v1):
  - Expected outcome: The app supports at least `en` and `zh-CN` / Simplified Chinese in the first multilingual release.

- `R-003` (Future-Locale Extensibility):
  - Expected outcome: Adding a new locale after this work requires adding locale resources and registration, not redesigning the app architecture.

- `R-004` (Default System Language Mode):
  - Expected outcome: The default language mode is `System Default`, which resolves the UI locale from the host runtime with fallback to English.

- `R-004A` (Settings Language Surface):
  - Expected outcome: `Settings` includes a `Language` menu item/section where users can manage language behavior.

- `R-004B` (First Localized Product Paint):
  - Expected outcome: Product-owned UI surfaces do not render in the wrong locale before localization initialization completes.

- `R-005` (Persisted Language Preference):
  - Expected outcome: Users can select the app language mode and the preference persists across app restarts.

- `R-006` (Manual Override Options):
  - Expected outcome: The `Language` settings UI supports `System Default`, `English`, and `Simplified Chinese`.

- `R-007` (Runtime Language Switching):
  - Expected outcome: Changing the selected language updates visible product-owned UI text during app runtime.

- `R-008` (Fallback Behavior):
  - Expected outcome: Missing or unsupported translation keys fall back deterministically to English rather than rendering blank or crashing.

- `R-008A` (System Locale Normalization Contract):
  - Expected outcome: `System Default` follows one explicit normalization and precedence policy for Electron host locale, browser locale, supported Chinese variants, and fallback-to-English outcomes.

- `R-009` (All Product-Owned UI Coverage):
  - Expected outcome: All product-owned UI copy in scope is localized through the shared localization boundary rather than left as hard-coded English.

- `R-010` (Shell and Navigation Coverage):
  - Expected outcome: Core shell/navigation surfaces use localized product copy through the shared localization boundary.

- `R-011` (Settings and Action Feedback Coverage):
  - Expected outcome: Settings labels, action copy, toast messages, and product-owned error/loading/empty-state messages are localizable through the same system.

- `R-012` (Non-Component Access):
  - Expected outcome: Stores, composables, and service-like UI helpers that emit product copy can resolve localized strings without bypassing the authoritative localization boundary.

- `R-013` (Developer Guardrail):
  - Expected outcome: New product-owned UI strings in scoped areas are added through localization resources instead of introducing new hard-coded English literals.

- `R-013A` (Migration Inventory Closure):
  - Expected outcome: The implementation maintains an authoritative migration inventory for all in-scope product UI areas and does not mark the ticket complete until each inventory area is localized and closed.

- `R-013B` (Mandatory Enforcement / Audit):
  - Expected outcome: Completion requires a mandatory enforcement/audit path that fails forbidden bypass imports and reports zero unresolved raw product literals in migrated/in-scope surfaces.

- `R-014` (No User-Content Translation Side Effects):
  - Expected outcome: The localization system changes only product-owned UI copy and does not mutate user-authored or model-generated content.

## Acceptance Criteria

- `AC-001` English default path:
  - Measurable outcome: When the resolved system/default mode maps to English, the first product UI paint renders English product copy.

- `AC-002` Chinese default path:
  - Measurable outcome: When the resolved system/default mode maps to Simplified Chinese, the first product UI paint renders Simplified Chinese product copy.

- `AC-003` Settings visibility:
  - Measurable outcome: `Settings` renders a `Language` menu item/section.

- `AC-004` Override options:
  - Measurable outcome: `Language` settings presents `System Default`, `English`, and `Simplified Chinese`.

- `AC-005` Manual Chinese selection:
  - Measurable outcome: After selecting Simplified Chinese, scoped product-owned UI surfaces render Simplified Chinese copy.

- `AC-006` Preference persistence:
  - Measurable outcome: After app restart/reload, the previously selected language mode remains active.

- `AC-007` Safe fallback:
  - Measurable outcome: A missing Chinese translation for a key renders English fallback text instead of blank/error state.

- `AC-008` Shared-boundary usage:
  - Measurable outcome: Scoped pages/components/stores/composables no longer rely on hard-coded English strings for covered product UI text.

- `AC-009` Runtime switching:
  - Measurable outcome: Changing language updates already-mounted product UI without requiring a rebuild or reinstall.

- `AC-010` Non-content preservation:
  - Measurable outcome: User-entered text, LLM output, logs, and file content are unaffected by UI language selection.

- `AC-011` Explicit locale normalization:
  - Measurable outcome: Supported host locale inputs normalize deterministically to `en` or `zh-CN`, and unsupported inputs fall back to `en` according to the documented precedence rules.

- `AC-012` Migration inventory closure:
  - Measurable outcome: The authoritative migration inventory shows every in-scope product UI area closed before the ticket is complete.

- `AC-013` Mandatory audit closure:
  - Measurable outcome: The required localization boundary guard passes and the required raw-literal audit reports zero unresolved in-scope product literals before implementation handoff is considered complete.

## Requirement-To-Use-Case Coverage

- `R-001`, `R-012`, `R-013` -> `UC-008`, `UC-009`, `UC-010`
- `R-002`, `R-009`, `R-010`, `R-011` -> `UC-001`, `UC-002`, `UC-003`, `UC-006`, `UC-008`
- `R-003` -> `UC-010`
- `R-004` -> `UC-001`, `UC-002`, `UC-003`
- `R-004A`, `R-006` -> `UC-004`, `UC-005`
- `R-004B` -> `UC-011`
- `R-005` -> `UC-007`
- `R-007` -> `UC-006`
- `R-008`, `R-008A` -> `UC-001`, `UC-003`, `UC-006`
- `R-013A`, `R-013B` -> `UC-012`
- `R-014` -> boundary protection across all use cases

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` -> default English first-paint scenario
- `AC-002` -> default Simplified Chinese first-paint scenario
- `AC-003` -> settings discoverability scenario
- `AC-004` -> selector options scenario
- `AC-005` -> explicit Chinese override scenario
- `AC-006` -> restart persistence scenario
- `AC-007` -> partial-translation resilience scenario
- `AC-008` -> migration completeness scenario
- `AC-009` -> live runtime switch scenario
- `AC-010` -> non-product-content isolation scenario
- `AC-011` -> resolver precedence/normalization scenario
- `AC-012` -> scoped migration closure scenario
- `AC-013` -> mandatory audit/guard closure scenario

## Approval Status

- Status: `Approved by user`
- Approved On: `2026-04-09`
- Approved Decisions:
  - `Chinese` means `Simplified Chinese`
  - scope is `all product-owned UI`
  - UX is `Settings + System Default + manual override`
- Refinement Note:
  - `2026-04-09`: upstream refinement added explicit first-paint, normalization, and migration-closure requirements to match architect review and keep behavior/design alignment.
