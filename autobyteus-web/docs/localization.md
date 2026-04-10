# Localization

This document describes the current localization model for `autobyteus-web`.

## Overview

The app now localizes product-owned UI through a single client-side runtime.

- Supported locales: `en`, `zh-CN`
- Supported preference modes: `system`, `en`, `zh-CN`
- Default preference: `system`
- English is the fallback catalog for missing keys and bootstrap recovery

The authoritative runtime lives in:

- `localization/runtime/localizationRuntime.ts`
- `plugins/05.localization.client.ts`
- `composables/useLocalization.ts`

## Runtime Behavior

### Bootstrap and First Paint

- The localization plugin initializes before product UI is released.
- `AppLocalizationGate.vue` keeps the app on a neutral boot surface while localization is still booting.
- Once initialization completes, the gate releases the normal app shell.
- If initialization fails, the runtime falls back to English, sets `bootstrapState = 'failed'`, and still releases the app instead of leaving the UI stuck behind the gate.

### Locale Resolution

When the preference is `system`:

- browser mode reads `navigator.languages` and `navigator.language`
- Electron reads `app.getLocale()` through `window.electronAPI.getAppLocale()`

Resolution rules currently normalize to the supported catalog set:

- English variants resolve to `en`
- Simplified Chinese variants such as `zh-CN`, `zh-SG`, and `zh-Hans` resolve to `zh-CN`
- unsupported locales fall back to `en`

### Persistence

- The selected preference mode is stored in browser local storage
- storage key: `autobyteus.localization.preference-mode`
- changing the preference updates the active locale immediately without a reload

## Settings UX

Users can switch language from `Settings -> Language`.

The language section shows:

- the selected preference mode
- the currently resolved active locale
- the three available options: `System`, `English`, `简体中文`

The selection persists across reloads.

## Translation Authoring Rules

Use the shared localization boundary instead of inline product copy.

- In Vue templates, use `$t('translation.key')`
- In `<script setup>`, stores, and composables, use `useLocalization()` and call `t(...)`
- Add new keys to both locale catalogs, with English remaining the fallback source
- Keep product copy in the localization catalogs rather than in feature-local ad hoc string helpers
- For shared shell labels and other product-critical glossary choices, keep the terminology centralized in the shared catalog owner and add durable catalog tests when the wording is user-critical

Current catalog roots live under:

- `localization/messages/en/`
- `localization/messages/zh-CN/`

Generated locale content is layered with manual catalog owners for product-critical wording. When generated copy is not product-appropriate, normalize the shipped wording in the manual locale catalog owners instead of patching copy ad hoc in consuming components.

### Current zh-CN Shared Shell Glossary

The approved Simplified Chinese shared-shell terminology currently includes:

- `shell.navigation.agents` -> `智能体`
- `shell.navigation.agentTeams` -> `智能体团队`
- `shell.mobile.agent` -> `智能体`

Other shared zh-CN product wording normalized during delivery includes consistent use of:

- `运行`
- `工作区`
- `成员`
- `智能体定义`
- `智能体包`

## Required Validation

Before shipping new localized UI work, run the mandatory localization checks from `autobyteus-web/`:

```bash
pnpm guard:localization-boundary
pnpm audit:localization-literals
```

These commands are also wired into the Electron build commands, so packaged builds fail if the localization boundary or literal audit regresses.

For product-critical zh-CN wording, keep durable catalog tests alongside the locale messages. Current regression coverage includes shared shell glossary and action-label consistency checks under:

- `localization/messages/__tests__/`

## Scope Notes

- This foundation is for product-owned UI copy.
- English remains the durable fallback until additional locale catalogs are added.
- Future locales should extend the same runtime/catalog path instead of creating parallel translation systems.
