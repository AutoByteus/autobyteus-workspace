# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial baseline and each later implementation delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (`Pass`), handoff message 2026-11-10 | N/A (non-blocking IG-1, IG-2, IG-3 applied) | `Initial Baseline` | SR-003, ARCH-REV-002; CRR/API-REV/DR: N/A | Implementation complete for UC-001..UC-006; routed to source review (Large / High) |

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
