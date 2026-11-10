# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial baseline and each later implementation delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (`Pass`), handoff message 2026-11-10 | N/A (non-blocking IG-1, IG-2, IG-3 applied) | `Initial Baseline` | SR-003, ARCH-REV-002; CRR/API-REV/DR: N/A | Implementation complete for UC-001..UC-006; routed to source review (Large / High) |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 (`Fail`, Local Fix), 2026-11-10 | CR-001, CR-002, CR-003 | `Local Fix` | SR-003, ARCH-REV-002, CRR-001; API-REV/DR: N/A | CR-001..CR-003 fixed; returned for targeted delta review |

## Revision Entries

### IR-001 — Truthful Claude settings, declared-settings projection, refreshable model lists

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-002, round 2, `Pass`), message of 2026-11-10 asking for implementation of design-spec SR-003.
- Triggering finding IDs: N/A (initial implementation). Implementation guidance IG-1 (top-level key wins over the `extra_params` container; unit cases in `llm-config-overrides.test.ts` and `llm-factory-config-composition.test.ts`), IG-2 (stored fallback `detail` of an unreadable list keeps the runtime diagnostic; `collaborator-launch-resolver.test.ts` DEC-D1 case), IG-3 (Fable 5/5.1 `adaptive_required`; no production sampling-kwarg caller; stored `temperature` never reaches the request) applied.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation matches the reviewed design SR-003 with the deviations listed in `implementation-handoff.md` (Key Files Or Areas → Deviations from the design text).
- Related solution revision IDs: SR-003 (requirements at SR-002).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation round of the approved package.
- Approved behavior or requirement IDs affected: REQ-001..REQ-014; AC-001..AC-013; BEH-001..BEH-012; QR-001..QR-003.
- Implementation delta:
  - **autobyteus-ts** — Anthropic policy/catalog/adapter: `omit` off shape removed; Opus 5 `adaptive('disabled')`; Fable 5 and Fable 5.1 `adaptive_required` and effort-only schemas; switch default `true`; Opus 5 switch text states Off really disables thinking and Anthropic's tool-call caveat. `projectRawLlmConfig` (llm-config-overrides.ts) and `LLMFactory.canonicalRunLlmConfig`; `composeEffectiveConfig` projects a raw record onto the model's declared settings.
  - **autobyteus-server-ts** — Claude SDK schema effort-only without default, `ClaudeSessionConfig.thinking` / SDK `thinking` option / `supportsAdaptiveThinking` / `supportsClaudeThinking` removed; each backend exports its setting keys (`CLAUDE_SESSION_SETTING_KEYS`, `CODEX_SESSION_SETTING_KEYS`, `ACP_SESSION_SETTING_KEYS`); `new-run-llm-config-projection.ts` called by `AgentRunProvisioningService` and `TeamRunService.createTeamRun`; `ModelCatalogService` throws `ModelListUnavailableError` for an empty external list and availability drops its duplicate check; `RunModelSelectionService` result kind `model_list_unavailable`; `run-model-selection-refusal.ts` is the one wording owner used by all eight refusal sites, the application launch validator and the usability fallback `detail`; outcome `MODEL_LIST_UNAVAILABLE`.
  - **autobyteus-web** — `llmProviderConfig` store: `refreshCatalog`, `refreshModelList`, snapshot `refreshing` / `refreshError`, shared `readRuntimeCatalog` (replaces `refreshLocalCatalog`); shared `ModelListRefreshControl`; `ChatModelMenu`, `ChatModelList`, `SearchableGroupedSelect` (`open`/`refresh`), `RuntimeModelConfigFields`, `MobileChoiceSheet`/`MobileRuntimeModelRows`, three application launch-profile editors; saved-run menus re-read options through `provideLockedModelOptionsRefresh` / `existingRunConfigStore.reloadModelOptions` / `delegatedLaunchDraftStore.reloadOptions`; `existingRunModelOptionsActions` mixin (moves `refreshModelOptions` out of the 507-line store); result state marks scopes for `MODEL_LIST_UNAVAILABLE`; thinking control treats an effort-only schema without default or `none` as thinking on (an unchosen SDK effort reads Default, not Off); i18n (en, zh-CN).
  - **Docs** — `autobyteus-ts/docs/{llm_module_design,llm_module_design_nodejs,provider_model_catalogs}.md`, `autobyteus-server-ts/docs/modules/{llm_management,run_history}.md`, `autobyteus-web/docs/chat.md`, `GLOSSARY.md` ("Offered models", "Declared settings").
- Changed files or areas: see `git diff --stat fd0eb664c..HEAD`; production source by package listed in the implementation handoff.
- Local validation and result: see the handoff Checks Run table (IMP-01..IMP-06).
- Next recipient or routing: Code Reviewer (Large / High), then API/E2E.
- Remaining limitations or risks: RSK-001, RSK-004; one Claude CLI read per sequential picker open (accepted); the AC-010/AC-012 realistic journey (isolated Electron + CLI symlink swap) is left to API/E2E.

### IR-002 — Local fixes for CRR-001 (dead saved-run mode, error wording, glossary)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, CRR-001 (round 1, `Fail`, Local Fix).
- Triggering finding IDs: CR-001, CR-002, CR-003.
- Classification: `Local Fix`.
- Prior authoritative result: CRR-001 `Fail`.
- Current authoritative result: fixes complete at `817bd9950`, returned for targeted delta review.
- Related solution revision IDs: SR-003. Related architecture-review revision IDs: ARCH-REV-002. Related code-review revision IDs: CRR-001. Related API/E2E and delivery revision IDs: N/A.
- Why this revision is recorded: the reviewer ruled FU-004 (dead saved-run mode in a touched file) part of this ticket and asked for two minor naming/doc corrections.
- Approved behavior or requirement IDs affected: none changed. CR-001 touches only the definition launch-preferences picker (BEH-010 path, REQ-010/011) and removes unreachable code; CR-002 touches the REQ-013 text of an unreadable list (AC-013); CR-003 is documentation.
- Implementation delta:
  - **CR-001** `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` (388 → 242 lines) keeps only the new-launch mode its one caller (`DefinitionLaunchPreferencesSection.vue`) uses. Removed: the saved-run mode (`originalModelIdentifier`, `modelOptions`, `runChoice`, the replacement-options branches, `modelOptionsMessage`, the `track-automatic-changes` switch) and the new `originalModelIdentifier === undefined` guards of IR-001; the props `readOnly`, `runtimeSelectionLocked`, `modelSelectionLocked`, `modelConfigDisabled`, `modelConfigReadOnly`, `historicalModelConfig`, `missingHistoricalConfig`, `validationErrors`, the `historical*` texts, and also the other props no caller passes (`disabled`, `runtimeHelpText`, `modelHelpText`, `thinkingLabel`, `thinkingDescription`, `advancedInitiallyExpanded`, `controlVariant`); the `selection-change` and `schema-state` emits (no parent listens: `rg`); the `loadCatalog` option of `useRuntimeScopedModelSelection` (no caller passed `false`; Mobile's `loadCatalog: true` dropped); six locale keys (`workspace.runModelConfig.loadingOptions`, `replacementInvalid`, `noNativeReplacements`, `noCatalogReplacements`, `schemaUnavailable`, `modelRequired`, en and zh-CN) and `types/agent/RuntimeModelConfigSchemaState.ts`, which only the removed emit used. Specs: `RuntimeModelConfigFields.spec.ts` deleted the cases that exist only for the removed mode (historical/locked controls, saved-run picker, replacement labelling, display-catalog lag, saved-run default cases) and adapted the rest to DOM assertions; one case added (model/runtime choice emits); `RuntimeCapabilityReadiness.spec.ts` now asserts what the fields show (loading, unavailable reason, ready) instead of `schema-state`.
  - **CR-002** `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`: `ModelListUnavailableError` words its message with `agentRuntimeName` ("Claude Agent SDK returned no models.") and no longer stores the unread `runtimeKind`. Tests: `llm-provider.test.ts` (real error class through the resolver), `model-catalog-service.test.ts` (wording for two runtimes), `application-launch-host-capability-validator.test.ts` (new case: the application launch issue reads "The model list of Claude Agent SDK could not be read: Claude Agent SDK returned no models. Try again." and never the enum value).
  - **CR-003** `GLOSSARY.md`: "Offered models" now says how "model list" appears in names (`model_list_unavailable`, `MODEL_LIST_UNAVAILABLE`, `ModelListUnavailableError`, UI texts and `ModelListRefreshControl`), and that `model_unavailable` means the read worked and the model is not in it. No identifier renamed.
  - **Follow-ups:** FU-004 removed (done in this ticket). FU-006 added for what the removal leaves unreachable in files this ticket does not touch: `ModelConfigSection.vue`'s `historical*` / `trackAutomaticChanges` props (their only passer was the removed mode) and the pre-existing unused `utils/existingRunModelHelp.ts` with its three locale keys.
- Changed files or areas: the files named above; `git diff f31fa1821..817bd9950`.
- Local validation and result: web full unit suite (one failure, the base-identical `projectRunsStore.spec`, FU-005), web typecheck gate PASS (96 = baseline) and three guards, server typecheck gate PASS, 48 server unit files (310 tests) of the touched areas pass, rendered probe R1..R6 pass on the reworked component. See the handoff's Checks Run (IMP-07).
- Next recipient or routing: Code Reviewer (targeted delta review of CR-001..CR-003).
- Remaining limitations or risks: as in IR-001; `ModelConfigSection` historical props are now unreachable (FU-006), outside the touched files.

