# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/in-progress/multilingual-ui-support/requirements.md`
- Investigation notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/in-progress/multilingual-ui-support/investigation-notes.md`
- Design spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/in-progress/multilingual-ui-support/proposed-design.md`
- Design review report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/in-progress/multilingual-ui-support/design-review-report.md`

## What Changed

Implemented the reviewed multilingual UI foundation in `autobyteus-web`, then completed multiple follow-up local-fix rounds for migration closure, audit enforcement, and zh-CN glossary consistency.

Foundation delivered in this implementation package:
- Added the client localization runtime with persisted locale preference (`system`, `en`, `zh-CN`), explicit system-locale resolution, English fallback merge behavior, and a first-paint bootstrap gate.
- Kept deterministic bootstrap failure behavior: if locale bootstrap fails, the runtime falls back to English, marks `bootstrapState = 'failed'`, and still releases the neutral boot surface instead of leaving the app stuck in boot.
- Added Nuxt plugin/composable/type wiring so Vue templates use `$t(...)` and script code uses `useLocalization()`.
- Added the Settings language manager and Electron locale bridge.
- Added localization boundary/audit scripts and build hooks.
- Migrated broad UI surface copy from inline literals to translation keys across pages, layouts, components, and messaging setup flows.

Round-1 local-fix closure already completed:
- Reworked `scripts/audit-localization-literals.mjs` to inspect mixed Vue templates per literal instead of false-passing a whole template when any `$t(...)` call exists.
- Added audit-library coverage and executable tests for mixed-template detection and selected TS producer detection.
- Closed the first reviewed raw-literal surfaces in applications, skills, right-side tabs, and messaging verification/provider flows.

Round-2 local-fix closure completed in this update:
- Expanded audit producer-family coverage beyond the first repaired narrow pattern so the enforcement path now checks the reviewed feedback-producer families in `stores/`, `composables/`, and `services/` for:
  - `appUpdate*`
  - `extensions*`
  - `voiceInput*`
  - `messaging*`
  - `useRightSideTabs`
- Added targeted Vue `<script setup>` / script-side literal auditing for the reviewed SFC surfaces that were still bypassing localization in code, specifically:
  - `components/app/AppUpdateNotice.vue`
  - `components/settings/AboutSettingsManager.vue`
  - `components/settings/VoiceInputExtensionCard.vue`
- Kept the audit executable and deterministic with regression tests covering:
  - mixed-template detection
  - TS producer toast detection
  - targeted Vue script-side detection in reviewed app/settings surfaces
- Closed the remaining reviewed raw-literal surfaces by routing product-owned copy through localization resources/runtime in:
  - `components/app/AppUpdateNotice.vue`
  - `components/settings/AboutSettingsManager.vue`
  - `components/settings/VoiceInputExtensionCard.vue`
  - `stores/appUpdateStore.ts`
  - `stores/extensionsStore.ts`
  - `stores/voiceInputStore.ts`
- Added/expanded manual catalog coverage needed for these update/extension/voice-input surfaces in:
  - `localization/messages/en/shell.ts`
  - `localization/messages/zh-CN/shell.ts`
  - `localization/messages/en/settings.ts`
  - `localization/messages/zh-CN/settings.ts`

Round-3 local-fix closure completed in this update:
- Cleared the two remaining blocking audit findings from refreshed API/E2E validation:
  - localized the fallback generated audio-input device label in `stores/voiceInputStore.ts`
  - localized the workspace display formatting used by `composables/useMessagingChannelBindingSetupFlow.ts`
- Added the supporting catalog keys in:
  - `localization/messages/en/settings.ts`
  - `localization/messages/zh-CN/settings.ts`
- Re-ran the blocking executable evidence successfully:
  - `node ./scripts/guard-localization-boundary.mjs`
  - `node ./scripts/audit-localization-literals.mjs`
  - refreshed targeted Vitest bundle `89/89`

Round-4 local-fix closure completed in this update:
- Corrected the packaged-build user-verification translation issue in the Chinese shell navigation catalog:
  - `shell.navigation.agents`: `代理` -> `智能体`
  - `shell.navigation.agentTeams`: `代理团队` -> `智能体团队`
- Also aligned the shared mobile shell agent label to the same glossary:
  - `shell.mobile.agent`: `代理` -> `智能体`
- Updated file:
  - `localization/messages/zh-CN/shell.ts`
- Re-ran executable enforcement after the catalog correction:
  - `node ./scripts/guard-localization-boundary.mjs`
  - `node ./scripts/audit-localization-literals.mjs`

Round-5 local-fix closure completed in this update:
- Performed a broader zh-CN glossary sweep across shared shell/navigation/settings/agents/teams/workspace surfaces instead of treating the earlier left-navigation fix as isolated.
- Corrected reused product terminology and copy in the zh-CN catalogs so shared product terms now consistently use the approved glossary in:
  - `localization/messages/zh-CN/shell.generated.ts`
  - `localization/messages/zh-CN/settings.generated.ts`
  - `localization/messages/zh-CN/settings.ts`
  - `localization/messages/zh-CN/agents.generated.ts`
  - `localization/messages/zh-CN/agentTeams.generated.ts`
  - `localization/messages/zh-CN/workspace.generated.ts`
  - `localization/messages/zh-CN/memory.generated.ts`
  - `localization/messages/zh-CN/applications.generated.ts`
  - `localization/messages/zh-CN/tools.generated.ts`
- Concrete glossary/copy fixes made in this sweep included:
  - `代理` / `代理团队` / `代理定义` -> `智能体` / `智能体团队` / `智能体定义`
  - `代理包` / `代理套餐` -> `智能体包`
  - mistranslations such as `所有代理商`, `前往代理商`, `特工团队`, `我的经纪人`, `队伍`, `会员`, `工作空间`, and `跑步`-style run labels were normalized to product-appropriate zh-CN copy
  - shared run/workspace/member wording was aligned to `运行`, `工作区`, and `成员` where the earlier machine-translated copy was inconsistent with product terminology
- Added durable regression coverage for the broader glossary sweep in:
  - `localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts`
- Re-ran executable enforcement and the new glossary regression suite successfully:
  - `node ./scripts/guard-localization-boundary.mjs`
  - `node ./scripts/audit-localization-literals.mjs`
  - `pnpm exec vitest run localization/messages/__tests__/shellCatalog.spec.ts localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts`

## Key Files Or Areas

Core runtime and integration:
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/runtime/localizationRuntime.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/runtime/systemLocaleResolver.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/runtime/catalogRegistry.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/composables/useLocalization.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/plugins/05.localization.client.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/types/localization.d.ts`

Boot gate and settings UX:
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/app/AppLocalizationGate.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/app.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/settings/LanguageSettingsManager.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/pages/settings.vue`

Round-2 reviewed closure surfaces:
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/app/AppUpdateNotice.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/settings/AboutSettingsManager.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/components/settings/VoiceInputExtensionCard.vue`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/stores/appUpdateStore.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/stores/extensionsStore.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/stores/voiceInputStore.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts`

Manual catalogs and migration closure additions:
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/en/index.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/zh-CN/index.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/en/applications.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/zh-CN/applications.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/en/skills.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/zh-CN/skills.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/en/shell.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/zh-CN/shell.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/en/settings.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/zh-CN/settings.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/audit/migrationScopes.ts`

Audit/guard and validation wiring:
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/scripts/guard-localization-boundary.mjs`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/scripts/audit-localization-literals.mjs`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/scripts/lib/localizationLiteralAudit.mjs`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/scripts/__tests__/localizationLiteralAudit.spec.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/package.json`

Electron locale bridge:
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/electron/main.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/electron/preload.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/electron/types.d.ts`
- `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/types/electron.d.ts`

## Important Assumptions

- Supported locales remain exactly `en` and `zh-CN`.
- English remains the authoritative fallback catalog for missing keys and failure recovery.
- The authoritative localization boundary for in-scope product UI is `LocalizationRuntime` exposed through `$t(...)`, `useLocalization()`, or direct runtime lookup inside reviewed producer surfaces that emit UI copy.
- The current audit is still context-driven rather than a repo-wide arbitrary-string detector. It now covers mixed Vue templates, the reviewed app/settings script-side UI surfaces, and the reviewed feedback-producer families in `stores/`, `composables/`, and `services/` that were part of this fix round.

## Known Risks

- Migration volume and copy-normalization effort remain high. The reviewed blockers are closed, but dense migrated surfaces still carry regression risk.
- Audit tuning risk remains visible. The audit is more truthful than the earlier narrow implementation, but it still uses targeted user-facing context detection and reviewed producer-family coverage rather than a whole-repo semantic proof engine.
- Catalog quality risk remains visible. Some generated or normalized catalog copy may still need product-copy refinement even though key resolution is correct.
- Broader regression coverage is still needed beyond the targeted suites listed below.
- The audit still emits a Node warning about `migrationScopes.ts` being reparsed as an ES module because `package.json` does not declare `type: module`; this is non-blocking for current execution.
- Pre-existing file-size/ownership pressure remains visible in touched surfaces such as `components/settings/ServerSettingsManager.vue`, `components/settings/ProviderAPIKeyManager.vue`, and `components/skills/SkillsList.vue`; the local-fix rounds prioritized closure correctness first.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `No (blocked)`
- Notes:
  - No dual-path localization architecture was added; the runtime remains the single authority for locale resolution and translation lookup.
  - This ticket still contains touched oversized source files already called out in review; they were not further split in the closure-fix rounds because the blocking localization/evidence defects had priority.

## Environment Or Dependency Notes

- Implementation and validation were run in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web`.
- No new package dependency was added.
- `vitest.config.mts` loads `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/tests/setup/localization.ts` so component tests can mount localized components without per-test `$t` wiring.

## Validation Hints / Suggested Scenarios

Run from `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web`:

- Boundary + migration closure:
  - `node ./scripts/guard-localization-boundary.mjs`
  - `node ./scripts/audit-localization-literals.mjs`
- Targeted validation rerun completed locally and passing:
  - `pnpm exec vitest run scripts/__tests__/localizationLiteralAudit.spec.ts components/app/__tests__/AppUpdateNotice.spec.ts components/settings/__tests__/AboutSettingsManager.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts stores/__tests__/appUpdateStore.spec.ts stores/__tests__/extensionsStore.spec.ts stores/__tests__/voiceInputStore.spec.ts components/settings/messaging/__tests__/SetupVerificationCard.spec.ts pages/__tests__/settings.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts components/settings/__tests__/LanguageSettingsManager.spec.ts localization/runtime/__tests__/systemLocaleResolver.spec.ts localization/runtime/__tests__/localizationRuntime.spec.ts components/app/__tests__/AppLocalizationGate.spec.ts __tests__/app.spec.ts`
- Targeted glossary-sweep rerun completed locally and passing:
  - `pnpm exec vitest run localization/messages/__tests__/shellCatalog.spec.ts localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts`
- Manual product checks:
  - Launch in browser mode with stored preference absent and verify first paint waits briefly, then renders the resolved locale.
  - Switch Settings → Language between `System`, `English`, and `简体中文`; verify labels update without reload.
  - Force a bootstrap failure path and verify the app renders English UI instead of remaining on the neutral gate.
  - In Electron, verify system locale resolution follows `app.getLocale()`.
  - Spot-check the reviewed closure surfaces: applications pages, skills management dialogs, right-side shell tabs, messaging setup verification, update notice, updates settings panel, and voice-input extension flows.

## What Needs Validation

- Refresh API/E2E validation because the audit contract and closure evidence changed again in this local-fix round.
- Reconfirm that the reviewed blockers are closed:
  - the update/voice-input/extension surfaces no longer render product-owned English literals directly
  - the repaired audit now catches the reviewed app/settings script-side bypasses
  - the reviewed producer families for app updates, extensions, voice input, messaging, and right-side tab labels are covered by executable audit enforcement
  - the final blocking `voiceInputStore` fallback label and messaging-binding workspace label formatting now resolve through localization resources instead of raw literals
- Revalidate startup behavior for both successful bootstrap and `bootstrapState = 'failed'` fallback so the neutral boot surface never sticks.
- Revalidate the broader zh-CN glossary surfaces in browser/Electron packaging, especially shell navigation, shell generated copy, settings agent-package copy, agent/team pages, workspace run labels, and shared workspace wording.
- Run broader regression coverage beyond the targeted suites above.

## Local Fix Update — broader zh-CN untranslated action/control sweep (2026-04-09)

User verification found that packaged zh-CN UI still exposed English action copy (`Run`) and likely additional untranslated shared controls. This follow-up local-fix round broadened the sweep beyond glossary replacements and targeted reusable action/control surfaces that are visible across shipped agents/teams/settings/workspace flows.

### Findings Closed In This Round

- Localized remaining shared action/control labels and placeholders in high-frequency product-owned UI surfaces:
  - `components/agents/AgentDefinitionForm.vue`
  - `components/agents/GroupableTagInput.vue`
  - `components/agentTeams/AgentTeamDefinitionForm.vue`
  - `components/agentTeams/form/AgentTeamMemberDetailsPanel.vue`
  - `components/agentTeams/SearchableGroupedSelect.vue`
  - `components/workspace/running/AgentLibraryPanel.vue`
  - `components/settings/NodeManager.vue`
- Localized related reviewed user-facing producer strings so notifications and validation/error copy no longer fall back to raw English in these paths:
  - `components/agents/AgentEdit.vue`
  - `components/agentTeams/AgentTeamEdit.vue`
  - `components/agentTeams/form/useAgentTeamDefinitionFormState.ts`
- Expanded the manual overlay catalogs used by the shipped locale index for action/control coverage:
  - `localization/messages/en|zh-CN/agents.ts`
  - `localization/messages/en|zh-CN/agentTeams.ts`
  - `localization/messages/en|zh-CN/workspace.ts`
  - `localization/messages/en|zh-CN/settings.ts`
- Added regression coverage for the shared zh-CN action-label sweep:
  - `localization/messages/__tests__/zhCnActionLabelConsistency.spec.ts`
- Refreshed impacted component tests so localized rendering remains asserted under test-time translation mocks:
  - `components/agents/__tests__/AgentCard.spec.ts`
  - `components/agents/__tests__/AgentDefinitionForm.spec.ts`
  - `components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts`

### Executable Validation Rerun

Run from `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web`:

- `node ./scripts/guard-localization-boundary.mjs` ✅
- `node ./scripts/audit-localization-literals.mjs` ✅
- `pnpm exec vitest run localization/messages/__tests__/shellCatalog.spec.ts localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts localization/messages/__tests__/zhCnActionLabelConsistency.spec.ts components/agents/__tests__/AgentDefinitionForm.spec.ts components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts components/settings/__tests__/NodeManager.spec.ts components/agents/__tests__/AgentCard.spec.ts components/agents/__tests__/AgentList.spec.ts components/agentTeams/__tests__/AgentTeamList.spec.ts` ✅ (`9 files, 26 tests`)

### Residual Risk Visibility

- This round broadened the shipped zh-CN sweep meaningfully, but it is still a targeted local-fix pass rather than a full packaged-app screen-by-screen crawl.
- Generated catalogs outside the manually overridden shared surfaces may still contain copy-quality issues that require future normalization if user verification finds more examples.
- Final ticket closure still depends on refreshed API/E2E validation/review plus explicit user verification in the packaged app.

## Local Fix Update — ProviderAPIKeyManager zh-CN settings controls (2026-04-09)

API/E2E live browser validation found that `/settings` still exposed untranslated English controls in `ProviderAPIKeyManager` with zh-CN active (`PROVIDERS`, `Configured`, `Save Key`, and `Enter new key to update...`). This local-fix round closed the remaining settings-surface gap and added durable coverage for the translated state.

### Findings Closed In This Round

- Localized the remaining user-visible `ProviderAPIKeyManager` settings controls and placeholders in:
  - `components/settings/ProviderAPIKeyManager.vue`
- Localized related success/error notification copy in the same reviewed settings flow so it does not fall back to raw English when actions run.
- Expanded settings overlay catalogs with the additional provider-settings strings in:
  - `localization/messages/en/settings.ts`
  - `localization/messages/zh-CN/settings.ts`
- Added durable test coverage for the zh-CN provider-settings state in:
  - `components/settings/__tests__/ProviderAPIKeyManager.spec.ts`

### Executable Validation Rerun

Run from `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web`:

- `node ./scripts/guard-localization-boundary.mjs` ✅
- `node ./scripts/audit-localization-literals.mjs` ✅
- `pnpm exec vitest run components/settings/__tests__/ProviderAPIKeyManager.spec.ts localization/messages/__tests__/zhCnActionLabelConsistency.spec.ts` ✅ (`2 files, 7 tests`)

### Residual Risk Visibility

- This closes the specific round-7 live settings finding, but broader packaged-app zh-CN verification should still continue because other settings subsections may contain copy-quality issues not covered by this focused pass.
- Final ticket closure still depends on refreshed API/E2E validation/review plus explicit user verification.

## Implementation Update — ProviderAPIKeyManager structural split (2026-04-09)

Architecture review passed after the CR-003 design rework. This implementation round closed the remaining `M-002` structural requirement by decomposing the oversized provider-settings owner while preserving the already-passing round-8 localization behavior.

### Structural Changes Delivered

- Reduced `components/settings/ProviderAPIKeyManager.vue` to a thin section shell that now owns only section composition, loading/empty shells, and notification display.
- Added the bounded local runtime owner at:
  - `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
- Added dedicated child owners at:
  - `components/settings/providerApiKey/ProviderModelBrowser.vue`
  - `components/settings/providerApiKey/GeminiSetupForm.vue`
  - `components/settings/providerApiKey/ProviderApiKeyEditor.vue`
- Kept `useLLMProviderConfigStore` as the only backend-facing provider/model authority; the new local runtime wraps store fetch/save/reload orchestration, selected-provider state, provider-config hydration, and localized notification lifecycle without creating a second store/authority.
- Preserved localized user-facing behavior by keeping all provider-settings copy on the existing settings catalog boundary and adding the extracted Gemini mode-label keys in:
  - `localization/messages/en/settings.ts`
  - `localization/messages/zh-CN/settings.ts`

### Durable Coverage Added / Refreshed

- Refreshed integration coverage for the shell at:
  - `components/settings/__tests__/ProviderAPIKeyManager.spec.ts`
- Added extracted-owner coverage at:
  - `components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts`
  - `components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts`
  - `components/settings/providerApiKey/__tests__/ProviderApiKeyEditor.spec.ts`
  - `components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts`
- Re-ran page-level settings routing coverage in:
  - `pages/__tests__/settings.spec.ts`

### Executable Validation Rerun

Run from `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web`:

- `node ./scripts/guard-localization-boundary.mjs` ✅
- `node ./scripts/audit-localization-literals.mjs` ✅
- `pnpm exec vitest run components/settings/__tests__/ProviderAPIKeyManager.spec.ts components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts components/settings/providerApiKey/__tests__/ProviderApiKeyEditor.spec.ts components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts pages/__tests__/settings.spec.ts` ✅ (`6 files, 25 tests`)

### Residual Risk Visibility

- This closes the reviewed CR-003 / `M-002` structural blocker, but provider settings still need refreshed API/E2E validation because the shell/runtime wiring changed materially.
- The extracted local runtime must remain bounded; future edits should continue to keep backend-facing provider/model ownership in `useLLMProviderConfigStore` only.
- Broader user-verification/copy-quality risk remains separate from this structural split and still requires refreshed validation/review plus explicit user confirmation.
