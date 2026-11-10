# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review applied (Large / High); ARCH-REV-002 `Pass` ("ready for implementation", findings AR-001..AR-003 resolved, implementation guidance IG-1..IG-3); ARCH-REV-003 `Pass` for the SR-004 delta (CR-004, implementation guidance IG-4).
- Requirements doc: [requirements-doc.md](requirements-doc.md) (SR-002, Approved)
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Solution revision record: [solution-revision-record.md](solution-revision-record.md) (SR-001..SR-004)
- Design spec (required on every route): [design-spec.md](design-spec.md) (SR-004, Ready)
- Supplemental task artifacts: [evidence/probe-results-2026-11-10.md](evidence/probe-results-2026-11-10.md), [probes/](probes/) (live-probe starting points; no behavior-defining supplements)
- Design review report: [design-review-report.md](design-review-report.md)
- Architecture review revision record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Triggering rework report, revision record, or evidence, when applicable: for IR-003: [design-review-report.md](design-review-report.md) round 3 (ARCH-REV-003), [code-review-report.md](code-review-report.md) CR-004 (CRR-003), API/E2E API-14 ([api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)), `evidence/API-14-repro-unit.log`, `probes/locked-menu-failed-refresh.repro.spec.ts`; IR-001 and IR-002 are as recorded in the revision record

## Current Implementation Summary

Implements Parts A–D of Project Task autobyteus-9 as designed in SR-003:

- **A. Truthful Claude settings.** AutoByteus runtime: Opus 5 Off sends `disabled` thinking (and no effort); Fable 5 and Fable 5.1 are always-on, effort-only rows (`adaptive_required`; a stored switch has no effect and never fails); the four switch rows default to On; the `omit` off shape is gone. Claude Agent SDK runtime: no thinking switch and no `thinking` option; effort only, at the SDK's levels, with no default (an unchosen effort sends nothing and reads "Default").
- **B. Declared settings only.** `LLMFactory` cuts a raw stored `llmConfig` to the selected model's declared settings (top-level and `extra_params`, standard fields kept) before any adapter sees it; new agent and team runs store the same canonical form (AutoByteus) or the setting keys their backend reads (external runtimes), with no catalog read.
- **C. Docs** synced with the catalog and the new contract; glossary entries added.
- **D. Model lists.** Every model picker re-reads its runtime's list when it opens and on "Refresh models" (list stays usable while it reads, last list kept on failure with Retry; concurrent reads share one server read). Saved-run menus re-read the run's options. A Save/launch refusal names the model and scope, says nothing was saved and what to do; an unreadable list is its own result (`model_list_unavailable` / `MODEL_LIST_UNAVAILABLE`).
- **D′ (SR-004, IR-003). A saved run's options say whether the list was read.** Every options answer carries `modelListReadable`; `false` means the runtime's list could not be read (empty options, the wording owner's text). The web merges a re-read per row: a readable row replaces, an unreadable row keeps the options already shown (else shows `unavailable` with the message) and the reload reports failure, so the locked menu keeps its models and shows "Couldn't refresh models" with Retry; "No longer offered" appears only for a readable answer.

- Implementation cycle: `Rework` (IR-003, SR-004 design revision after CRR-003 / ARCH-REV-003); the IR-001 and IR-002 summaries stand
- Implementation revision record: [implementation-revision-record.md](implementation-revision-record.md)
- Current implementation revision ID: `IR-003` (IR-001 baseline, IR-002 local fixes)
- Related solution revision IDs: SR-003, SR-004
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review revision IDs: CRR-001 (Fail, Local Fix: CR-001, CR-002, CR-003 fixed in IR-002), CRR-002 (Pass), CRR-003 (Fail, Design Impact: CR-004, implemented in IR-003)
- Related API/E2E revision IDs: API-REV-001 (API-14 Fail; rerun pending)
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-004 (IR-003); CR-001, CR-002, CR-003 (IR-002); N/A for IR-001
- Branch / worktree / commit: `codex/model-settings-reality`, `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality`, code commits `d78581eb2..dfa0faa76` (see Checks Run for the commit each check ran on). IR-001 code ended at `f31fa1821`; the IR-002 fixes are `817bd9950`; the IR-003 (SR-004) code, tests and docs are `dfa0faa76`.

## IR-002 Rework Summary (CRR-001, Local Fix)

All three findings are fixed; details and file lists are in [implementation-revision-record.md](implementation-revision-record.md) (IR-002).

- **CR-001:** `RuntimeModelConfigFields.vue` now holds only the new-launch mode (388 → 242 lines). Removed with it: the saved-run mode and the unused props the reviewer named, plus the other props no caller passes, the unheard `selection-change` / `schema-state` emits, the `loadCatalog` option of `useRuntimeScopedModelSelection`, six locale keys and the `RuntimeModelConfigSchemaState` type. Spec cases that existed only for the removed mode are deleted; the rest assert what the fields show. FU-004 is removed from `follow-ups.md`. **Beyond the list:** the removal leaves `ModelConfigSection.vue`'s `historical*` / `trackAutomaticChanges` props without a passer, and `utils/existingRunModelHelp.ts` already had no production caller; both are in files this ticket does not touch and are recorded as FU-006 (not removed here).
- **CR-002:** `ModelListUnavailableError` uses the runtime's display name and has no `runtimeKind` field; the three tests that pin its text were updated or added.
- **CR-003:** the GLOSSARY "Offered models" entry now says how "model list" appears in names.

## IR-003 Rework Summary (SR-004, CR-004)

Full delta and file list: [implementation-revision-record.md](implementation-revision-record.md) (IR-003). Start was the reproduction `probes/locked-menu-failed-refresh.repro.spec.ts` (red at `817bd9950`, `evidence/API-14-repro-unit.log`); it is now a durable case in `stores/__tests__/existingRunModelOptionsActions.spec.ts`.

- **Server:** `RunModelOptions.modelListReadable` / GraphQL `modelListReadable: Boolean!` on the agent, Team-scope, Org-scope and delegated option objects. `false` only when the list could not be read; then `currentModel: null`, `replacements: []`, `unavailableReason = modelListUnreadableText(runtimeKind, diagnostic)`. Validation and options share one `readCatalog` classification. The dead `supportedRuntime` gate (both paths) and the options path's own free text are removed.
- **Web:** both clients map an unreadable row to `{ status: 'unavailable', options: null, message }` through one helper (`optionsStateOfAnswer`) and refuse an answer without the flag. Both reload paths merge per row through one helper (`mergeReloadedOptions`): readable replaces, unreadable keeps a `ready` row (else `unavailable` with the message), `complete` false → the reload resolves `false` (a stale answer still resolves `true` and is not applied). Readability comes only from `modelListReadable` (IG-4): never from `unavailableReason` text or an empty list. `schemaStateFor` shows the state's message for another model. The committed `generated/graphql.ts` is regenerated.
- **Unchanged on purpose:** the menu (`ChatModelMenu`, `useLockedModelOptionsRefresh`) and `ExistingRunConfigEditor.modelUnavailable`: a `false` reload already drives "Couldn't refresh models" with Retry, and "No longer offered" already requires a `ready` state.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed` (IR-003 re-checked: one boolean on the existing options contract and a per-row merge in two stores; no new persistence, security, concurrency or ownership-boundary surface)
- Evidence and rationale for confirmation or change: the implementation touched the three packages and the shared contracts named in the design (result kind and GraphQL outcome, empty-list rule, `LLMFactory` raw-config contract, run-creation writer, concurrent web refresh). No new contract, persistence, security, concurrency or ownership-boundary surface appeared beyond the design; the deviations below are local.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review` (Large / High; for IR-003 a source review of the delta, then the API/E2E rerun of API-14, API-11, API-12, API-15)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The five escalation triggers were checked: no production caller relies on undeclared keys reaching a provider (`rg "extra_params|extraParams|thinking_enabled" applications` finds nothing; the server's only `extra_params` use is the portable launch schema, which the creation projection handles); projection at creation needs no runtime catalog read; no Claude CLI honoring `thinking: disabled` is known (the Solution Designer's `prb-sdk-off` results, not re-measured here; the SDK runtime now sends none); explicit adaptive thinking is accepted live for Fable 5 and 5.1 (IMP-02 passes); the web keeps a list usable during refresh without any GraphQL catalog change.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Opus 5 Off sends `disabled`, no effort | `anthropic-model-request-policy.ts` (`claude-opus-5` → `adaptive('disabled')`) → `AnthropicLLM` `buildThinkingFromToggle`; `anthropic-supported-model-definitions.ts` switch description | Unit (`anthropic-llm.test.ts`, `llm-factory-declared-settings.test.ts`); live: 0 thinking tokens (IMP-02) |
| BEH-002 | Fable 5: effort only; stored switch ignored | catalog `claudeEffortOnlySchema`; policy `adaptive_required`; `LLMFactory.composeEffectiveConfig` → `projectRawLlmConfig` drops `thinking_enabled` | Unit (request through the factory); live resume with stored Off + `max` accepted for Fable 5 and 5.1 (IMP-02) |
| BEH-003 | Switch rows default On | catalog `claudeThinkingSwitchSchema` default `true`; web default config reads the schema default (`getDefaultThinkingConfig`) | Unit (schema, adapter, thinking menu); rendered |
| BEH-004 | Off never fails on Sonnet 5 / 5.5 / Haiku 5.5 | unchanged policy entries; effort not sent while Off | Unit; live per row (IMP-02) |
| BEH-005 | SDK: no switch, no `thinking` | `claude-sdk-model-normalizer.ts` (`buildClaudeEffortConfigSchema`); `claude-session-config.ts`; `claude-sdk-client.ts` (option removed) | Unit (normalizer, session config, client); the live SDK session check is left to API/E2E |
| BEH-006 | SDK effort untouched: nothing sent, "Default" | same schema without default; web parameters menu + launch panel | Unit + rendered (R6: "Reasoning Effort: Default", Thinking on and locked) |
| BEH-007 | Only declared settings reach providers | `llm-config-overrides.ts` `projectRawLlmConfig`; `llm-factory.ts` | Unit per adapter family (`llm-factory-declared-settings.test.ts`) |
| BEH-008 | New runs store declared settings | `new-run-llm-config-projection.ts`; `agent-run-provisioning-service.ts`; `team-run-service.ts` `createTeamRun`; backend key exports | Unit (projection per runtime, provisioning, team creation) |
| BEH-009 | Docs synced | listed in Key Files | `rg -n "gemini-3.5-flash\|kimi-k2" autobyteus-ts/docs` → no hit |
| BEH-010 | Pickers re-read on open and on demand | web store `refreshCatalog`/`refreshModelList`; pickers; saved-run reload (`reloadModelOptions`, `reloadOptions`: per-row merge, SR-004) | Unit + rendered (R1..R5); saved-run locked menu on the real stack: API-14 Pass (IMP-09); the realistic journeys are API/E2E's |
| BEH-011 | Fresh server reads preserved | no server read-path change | Preserved |
| BEH-012 | Actionable refusals; unreadable list distinct | `run-model-selection-refusal.ts` at eight sites; `model_list_unavailable`; web result marking; options answer `modelListReadable` (`run-model-selection-service.ts`, GraphQL options objects) → `optionsStateOfAnswer` → locked menu error (SR-004) | Unit per site and kind; options answer unit cases; real-stack API-14 (IMP-09) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

**autobyteus-ts:** `src/llm/api/anthropic-model-request-policy.ts`, `api/anthropic-llm.ts`, `anthropic-supported-model-definitions.ts`, `utils/llm-config-overrides.ts` (`projectRawLlmConfig`), `llm-factory.ts` (`canonicalRunLlmConfig`, projection in `composeEffectiveConfig`).

**autobyteus-server-ts:** `llm-management/services/new-run-llm-config-projection.ts` (new), `run-model-selection-refusal.ts` (new), `run-model-selection-service.ts` (also IR-003: `modelListReadable`, shared `readCatalog`, `supportedRuntime` gate removed), `llm-management/domain/run-model-selection.ts` and `api/graphql/types/run-model-config.ts` (IR-003: the field), `model-catalog-service.ts`; `runtime-management/claude/client/claude-sdk-model-normalizer.ts`, `claude-sdk-client.ts`; `agent-execution/backends/{claude/session/claude-session-config.ts,codex/codex-app-server-model-normalizer.ts,acp/session/acp-session-launcher.ts}` (key exports); `agent-execution/services/agent-run-provisioning-service.ts`, `agent-team-execution/services/team-run-service.ts`; the eight refusal sites (`delegated-launch-selection-command.ts`, `team-run-delegated-launch-plan.ts`, `standalone-stopped-run-selection-updater.ts`, `standalone-agent-run-root-manager.ts`, `agent-org-run-manager.ts`, `agent-org-run-service.ts`, `launch-usability-check.ts`, `model-routing-settings.ts`); `application-launch-host-capability-validator.ts`; `available-agent-runtimes-service.ts`; `run-history/domain/run-model-config.ts` (outcome list).

**autobyteus-web:** `stores/llmProviderConfig.ts` (+ `llmProviderCatalogPublication.ts`, `llmProviderConfigSupport.ts`), `composables/{chat/useChatModelCatalog.ts,useRuntimeScopedModelSelection.ts,useLockedModelOptionsRefresh.ts (new)}`, `components/common/ModelListRefreshControl.vue` (new), `components/chat/{ChatModelMenu,ChatModelList}.vue`, `components/agentTeams/SearchableGroupedSelect.vue`, `components/launch-config/RuntimeModelConfigFields.vue`, `components/mobile/newRun/{MobileChoiceSheet,MobileRuntimeModelRows}.vue`, the three `components/applications/setup/*` editors, `components/workspace/config/ExistingRunConfigEditor.vue`, `stores/{existingRunModelOptionsActions.ts (new),existingRunConfigStore.ts,existingRunConfigResultActions.ts,delegatedLaunchDraftStore.ts,existingRunConfigEditActions.ts}`, IR-003: `services/runConfigEditing/{existingRunModelOptionsState.ts (new),existingRunModelOptionsClient.ts,delegatedLaunchSelectionClient.ts}`, `graphql/queries/runModelOptionsQueries.ts`, `types/agent/ExistingRunModelConfigDraft.ts`, `generated/graphql.ts` (regenerated), `utils/llmThinkingConfigAdapter.ts`, `localization/messages/{en,zh-CN}/chat.ts`.

**Docs:** `autobyteus-ts/docs/{llm_module_design,llm_module_design_nodejs,provider_model_catalogs}.md`, `autobyteus-server-ts/docs/modules/{llm_management,run_history}.md`, `autobyteus-web/docs/chat.md`, `GLOSSARY.md` (IR-003 touched `llm_management.md`, `chat.md`, `GLOSSARY.md`).

**Deviations from the design text (none changes ownership, a contract or a requirement):**

1. *Saved-run menu refresh is provided by the editor through Vue provide/inject* (`provideLockedModelOptionsRefresh` in `ExistingRunConfigEditor`, `injectLockedModelOptionsRefresh` in `ChatModelMenu`) instead of an emitted `refresh-locked-models` event relayed through `components/run-settings/*` (five pass-through components). The menu still only asks; the editor owns the reload. A menu outside an editor falls back to the runtime catalog.
2. *`reloadModelOptions()` / `reloadOptions()` have no `address` parameter.* The options query is per run (one server read answers every scope of the run), so the reload refreshes the run's scopes together without flipping any to `loading`.
3. *`existingRunConfigStore.refreshModelOptions` moved into the new `existingRunModelOptionsActions` mixin* (the store was already above 500 lines; it shrank from 507 to 479). Same code, same behavior.
4. *Found by the rendered check, fixed:* `ChatModelMenu` re-reads a runtime once per opening of the menu. As first written, opening the menu and then the current runtime's models started two sequential reads (two Claude CLI spawns) and the second erased the first read's error before it showed.
5. *Found by the rendered check, fixed:* the launch-config panel showed an interactive "Thinking: Off" toggle for the SDK effort-only schema (REQ-005: no on/off choice). `openAiState` in `llmThinkingConfigAdapter.ts` now treats an effort-only schema with no default and no `none` level as thinking on and not switchable, as Codex's effort-only schema already is; an unchosen effort reads "Default" and nothing is written.
6. *`refreshCatalog` never rejects* (its outcome is the snapshot). `createCustomProvider` therefore no longer fails after the provider was created when the follow-up catalog read fails.
7. *(IR-003) One shared mapper and merge for the two saved-run option stores.* The design names the per-row merge in `reloadModelOptions` and `reloadOptions` separately; both call `mergeReloadedOptions`, and both clients call `optionsStateOfAnswer`, in one new file `services/runConfigEditing/existingRunModelOptionsState.ts`, so the rule exists once. The state's `message` is optional (`message?: string | null`) so the loading and transport-failure states are unchanged.
8. *(IR-003) `generated/graphql.ts` regenerated.* The committed generated GraphQL types list the options objects and the four queries' result types; the server architecture test `web-generated-graphql-current` fails otherwise. Regenerated from the built server schema (`scripts/codegen-local.mjs --schema-file`); the diff is the field and the five query result types.

## Important Assumptions

- The Claude Agent SDK and CLI behaviors in the probe evidence (thinking `disabled` ignored, effort effective) still hold; RSK-001 remains.
- No in-repo application relies on undeclared keys reaching a provider (`rg` over server src and `applications/`); the design's escalation trigger (a) is therefore not met.

## Known Risks

- RSK-001 (a future CLI honors `thinking: disabled`): the SDK sends no `thinking`, so nothing changes if it does; re-measure on SDK upgrades.
- RSK-004: the switch default On raises token use for new runs on the four switch rows (saved runs keep their stored choice).
- IR-003: the first open of a saved run's menu with the CLI already failing is covered by unit and editor-level tests, not by a real-stack run (the API-14 journey starts with a readable list). The e2e schema-shape expectation of the options result type (`stopped-run-model-config-graphql.e2e.test.ts`) gained `modelListReadable` and was not run here.
- One Claude CLI read (≈2.3 s) per sequential picker opening; concurrent opens and repeated runtime opens inside one opening are coalesced (accepted in the design).
- The usability-check `detail` (collaborator-add refusals, remote-delegation refusals, recorded launch-source fallbacks) now carries the owner's text, including "Refresh the model list and choose again" where no picker is in front of the reader (for example an agent reading a remote refusal). Designed (DEC-D1, REQ-013); flagged for review in case a shorter text is preferred there.
- Server `test:unit` has 5 failing files that are environmental on this root-uid container (see Checks Run) and are not caused by this change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior change (+ bug fix, + feature)
- Reviewed root-cause classification: Missing Invariant + Duplicated Policy Or Coordination
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: refusal wording and the empty-list rule each have one owner now; no caller bypasses `RunModelSelectionService`, `LLMFactory` or the store.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the saved-run mode of `RuntimeModelConfigFields.vue` was removed in IR-002 after CRR-001; what that leaves unreachable in untouched files is FU-006). Removed: (the `supportedRuntime` gate and the options path's own unreadable-list text (IR-003), `omit` off shape and branches, SDK `thinking` path and schema parameter, `supportsAdaptiveThinking`/`supportsClaudeThinking`, the SDK effort default, per-site refusal strings, the availability empty-list check, `refreshLocalCatalog`)
- Dead code found elsewhere, added to `follow-ups.md`: FU-006 (`ModelConfigSection.vue` historical props; `existingRunModelHelp.ts`); FU-005 is a failing base test, not dead code
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`RunModelSelectionValidationResult` gained one variant; `model_unavailable` lost its read-failure diagnostic, which moved to the new variant)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (no file taken over `>500` or grown while already over it by this change; files already over it and not grown added to `follow-ups.md`; `>220` assessed/acted on): `Yes`
- Notes: largest changed source file `stores/llmProviderConfig.ts` is 495 non-empty lines (was 480; snapshot transitions moved to `llmProviderCatalogPublication.ts` to stay under 500). `existingRunConfigStore.ts` was 507 and is now 479. The largest per-file delta is 59 lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration` (run/definition/application `llmConfig`); launch-source fallback reasons `Not Affected`
- Design-spec decision reference: design-spec "Persisted Data / State Transition Decision", DEC-D1
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` (the projection is version-agnostic; no stored-shape branch; the fallback vocabulary is unchanged and a list-read failure keeps the reason `model_unavailable`)
- Direct-use evidence or discard/rebuild result, when applicable: stored Fable 5 `{thinking_enabled:false, reasoning_effort:'max'}` resumes and answers live (IMP-02); `llm-factory-declared-settings.test.ts` covers stored Off on Opus 5 and `extra_params` containers.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Install: `corepack pnpm install --frozen-lockfile` (done). `pnpm` is not on PATH; scripts that call `pnpm` internally (`prepare:shared`, the typecheck gates) need a `pnpm` shim (`exec corepack pnpm "$@"`) first on PATH.
- Server code resolves `autobyteus-ts` through its `dist`: after changing autobyteus-ts, run `pnpm -C autobyteus-server-ts prepare:shared` before server type checks or tests.
- Web specs need `nuxt prepare` once and `NUXT_TEST=true`.
- Live Anthropic checks use the test vault (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`, `RUN_LIVE_PROVIDER_TESTS=1`, `AUTOBYTEUS_LIVE_STRICT=1`).
- The container runs as uid 0 and has no working jsdom environment for the server's two Socratic suites; see Checks Run.

## Checks Run

The final code commit is `dfa0faa76` (IR-003); each row names the commit it ran on. Evidence files are in `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `cd autobyteus-ts && corepack pnpm exec vitest run tests/unit --no-watch`; `corepack pnpm exec tsc -p tsconfig.build.json --noEmit` | f31fa1821 (autobyteus-ts source unchanged since `d741d4340`) | Linux arm64 container, uid 0, node 22.23.3 | `src/llm/**` (policy, catalog, adapter, projection, factory) and their unit tests (new: `llm-factory-declared-settings.test.ts`; updated: anthropic, factory-composition, config-overrides, catalog tests) | BEH-001..004, BEH-007; AC-001..004, AC-007 (IG-1 cases) | Pass (2 environmental failures, identical on base) | `evidence/IMP-01-ts-unit.log` | `Tests  2 failed \| 2129 passed (2131)`; the 2 are `run-bash.test.ts` "inaccessible absolute cwd" (chmod ignored by uid 0); tsc exit 0 |
| IMP-02 | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 AUTOBYTEUS_LIVE_STRICT=1 corepack pnpm exec vitest run tests/integration/llm/api/anthropic-llm.test.ts --no-watch` | `d741d4340` (autobyteus-ts source unchanged since) | same; live Anthropic API through the test vault | `AnthropicLLM` through `LLMFactory` for every catalog Claude row | BEH-001, BEH-002, BEH-004; AC-001, AC-002, AC-004 | Pass | `evidence/IMP-02-live-anthropic.log` | `Tests  28 passed (28)`; "Off with a stored effort turns thinking off on claude-opus-5 (AC-001, AC-004)" asserts `reasoning_output_tokens` 0; "a stored Off switch and effort resume on claude-fable-5 / -5-1 without failing (AC-002)" |
| IMP-03 | `cd autobyteus-server-ts && corepack pnpm exec vitest run tests/unit tests/app-data-migrations tests/architecture tests/agent-work-journal --exclude "**/*.integration.test.ts" --no-watch`; `node ./scripts/typecheck.mjs` | suite `40b9d79e1`; two fixes `0129c7314` rerun; typecheck f31fa1821 | same (after `pnpm prepare:shared`) | server llm-management, run creation (agent, team), eight refusal sites, application validator, availability, Claude SDK normalizer/session/client | BEH-005..008, BEH-012; AC-005, AC-006, AC-008, AC-013 | Pass (5 environmental failing files; 2 caused by this change were fixed and rerun green) | `evidence/IMP-03-server-unit.log` | `Test Files  7 failed \| 964 passed` at `40b9d79e1`; causes listed per file (chmod as uid 0 ×3 files, jsdom environment ×2 files, 2 fixed); typecheck `production errors: 0; test-file errors: 1181 ... (baseline 1181 ...)` PASS |
| IMP-04 | `cd autobyteus-web && NUXT_TEST=true corepack pnpm exec vitest run`; `node ./scripts/typecheck.mjs` (after `nuxt prepare`); the three guards | suite `d67f77f62`; typecheck and guards f31fa1821 | same | store refresh, composables, chat menu/list, selectors, mobile sheet, saved-run reload, result state, thinking adapter | BEH-003, BEH-005, BEH-006, BEH-010; AC-003, AC-010, AC-011, QR-001, QR-002 | Pass (1 failing test, identical on base, FU-005) | `evidence/IMP-04-web.log` | `Test Files  1 failed \| 740 passed (741)`, `Tests  1 failed \| 5572 passed`; the failure is `projectRunsStore.spec.ts` (fails the same on base sources); typecheck PASS `test-file errors: 96 ... (baseline 96 ...)`; guards passed |
| IMP-05 | `node tickets/.../probes/rendered/model-list-refresh-probe.mjs --output-dir evidence/IMP-05-rendered-model-pickers` (Nuxt dev + headless Chromium, probe-owned GraphQL) | 817bd9950 (rerun after IR-002; first passed on f31fa1821) | same; `/usr/bin/chromium` | real chat model menu, launch-config picker, stores | BEH-006, BEH-010; AC-010, AC-011; QR-001, QR-002 | Pass | `evidence/IMP-05-rendered-model-pickers/evidence.json` and `R*.png` | `Pass: R1=Pass R2=Pass R3=Pass R4=Pass R5=Pass R6=Pass`; cleanup `devServer: terminated`, `temporaryPage: removed` |
| IMP-06 | `rg -n "gemini-3.5-flash\|kimi-k2" autobyteus-ts/docs` | f31fa1821 | same | LLM docs | BEH-009; AC-009 | Pass | `evidence/IMP-06-docs-grep.log` | `exit=1 (1 = no match)` |
| IMP-07 | IR-002 rework: web full unit suite; web typecheck gate (after `nuxt prepare`) and guards; server typecheck gate; `vitest run tests/unit/llm-management tests/unit/application-platform tests/unit/api/graphql/types tests/unit/available-agent-runtimes tests/unit/runtime-management/acp` | working tree of `817bd9950` (committed as `817bd9950`) | same | `RuntimeModelConfigFields.vue` and its specs, `useRuntimeScopedModelSelection.ts`, `MobileRuntimeModelRows.vue`, locale files, `ModelListUnavailableError` and the tests that pin its text | CR-001..CR-003; BEH-010, BEH-012; AC-013 | Pass (1 failing web test, identical on base, FU-005) | `evidence/IMP-07-rework-checks.log` | web `Test Files  1 failed \| 740 passed (741)`, `Tests  1 failed \| 5564 passed`; web typecheck `test-file errors: 96 ... (baseline 96 ...)` PASS; server typecheck `1181 ... (baseline 1181 ...)` PASS; server slice `Tests  310 passed (310)` |
| IMP-08 | IR-003 delta: reproduction red/green; the four new reload cases on the pre-change stores; server `vitest run tests/unit/llm-management tests/unit/run-history tests/unit/api/graphql tests/unit/agent-collaboration tests/unit/agent-org-execution`, `tests/architecture`, `node ./scripts/typecheck.mjs`; web full unit suite, `nuxt prepare` + typecheck gate, three guards; `codegen-local.mjs --schema-file` | `dfa0faa76` (working tree identical) | same | options answer and classification, both clients, both reload stores, editor refresh and label, generated types | BEH-010, BEH-012; REQ-010, REQ-011, REQ-013, QR-001; AC-010/AC-012 failure alternates; IG-4 | Pass (1 failing web test, identical on base, FU-005) | `evidence/IMP-08-sr004-delta-checks.log` | server `Test Files 174 passed`, `Tests 1446 passed`; architecture `12 passed`; web `Test Files  1 failed \| 741 passed (742)`, `Tests  1 failed \| 5582 passed`; typechecks `production errors: 0` with test-file errors equal to baseline (web 96, server 1181); the four new cases are `x` on the old stores and `ok` on the change |
| IMP-09 | `PATH=/tmp/pnpm-shim:$PATH AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node tickets/.../probes/real-stack/model-list-journeys-probe.mjs --output-dir evidence/IMP-09-api-14-real-stack --browser-executable /usr/bin/chromium --cases API-14` (API/E2E's probe, read-only use; real Chromium -> Nuxt dev -> rebuilt `dist/app.js` -> real Claude CLIs 2.1.280 / 2.1.322 / failing) | `dfa0faa76` (server `dist` rebuilt from it) | same; owned data root and ports | the saved Team's runtime-locked model menu, options query, both reload stores, editor refresh provider | BEH-010, BEH-012; REQ-010, REQ-011, QR-001; SCN-008 | Pass (implementation self-check; not API/E2E sign-off) | `evidence/IMP-09-api-14-real-stack/` (`model-list-journeys-evidence.json` key `API-14`, `run.log`, `API-14-*.png`, `README.md`) | `API-14 Pass`; with the CLI failing: `afterFailure.rows` still 4, `afterFailure.error` "Couldn’t refresh models", `afterFailure.button` "Retry", `noteAfterFailure: []` (no "No longer offered"), `findings: []`, `browserErrors: []` |

- Not run, and why (left to API/E2E, gated, needs a live system): the realistic isolated-Electron journeys (AC-010, AC-012: Claude CLI swap while the app runs, stopped team member and delegated copy switched to the SDK runtime, refusal texts in the app); a live Claude Agent SDK session asserting its query options (AC-005, AC-006); server `test:integration` and `tests/e2e` suites (gated or needing built outputs; `autobyteus-claude-5-5-live.e2e.test.ts` C55-E2E-001 was updated to the new default but not run); the rest of the real-stack journeys (API-11, API-12, API-15) and the first open of a saved run's menu with the CLI already failing (IMP-09 ran API-14 only); the `autobyteus-web` fresh-start build (no build input changed: `git diff --name-only fd0eb664c..HEAD` touches no `package.json`, tsconfig, script or workflow).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the chat model menu (runtime flyout and narrow drill-in), the launch-config model picker (`RuntimeModelConfigFields` / `SearchableGroupedSelect`), the launch panel's thinking control for an effort-only schema; the saved-run (locked) Team-settings menu was inspected for IR-003 on the real stack (IMP-09, API-14); the phone model sheet and the application launch-profile pickers are covered by component specs only.
- Approved UI/UX, interaction, requirement, or design references: requirements "UI, Interaction, And Experience Requirements" (refresh action inside each picker using its existing look; busy state with the list usable; error with Retry; "Default" for an unchosen SDK effort); no UI/UX supplement exists.
- Existing design system, shared components, and adjacent product surfaces reviewed: `ChatModelList`, `ChatModelMenu` (keyboard rows, popover placement), `SearchableGroupedSelect`, `ModelConfigSection`, `MobileChoiceSheet`/`MobileBottomSheet`; one new shared control (`ModelListRefreshControl`) uses the menu's own text size, colors and row spacing.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md "Renderer UI ... Web unit tests + a browser probe"; the probe starts the repository's Nuxt dev server and headless Chromium (`playwright-core`) against a fixture page of the real components and real Pinia stores, with the GraphQL boundary owned by the probe. It is not the Electron shell.
- States, layouts, viewports, and interactions inspected: list open (2 models); refreshing with the list usable and the control busy; new model appears and is chosen; failed refresh with the last list kept and Retry; Retry and "Refresh models" re-read; concurrent opens share one read; launch picker open, new model, failed refresh; 390×844 drill-in; launch panel thinking control. Keyboard row navigation is covered by the existing menu specs and the `data-row` handling of the busy button.
- Visual or interaction issues found and corrected: (1) opening the menu and then the current runtime started two sequential reads, the second hiding the first read's error: a runtime is now read once per opening (R2 asserts one read); (2) the busy text and "Refresh models" wrapped onto two lines in the 17rem flyout: text shortened to "Refreshing…" and kept on one line; (3) the launch panel showed an interactive "Thinking: Off" switch for the SDK effort-only schema: it now shows Thinking on, not switchable, with "Reasoning Effort: Default" (R6).
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-05 (`R1-1…R6` screenshots) and, for IR-003, IMP-09 (`API-14-*.png` and the DOM values: the locked Team menu opened, refreshed while busy, with the CLI failing and recovered; the card keeps the saved model without "No longer offered"). Unverified: the first open of a saved run's menu with the CLI already failing in a browser, the phone sheet and application editors in a browser, the Electron shell, dark mode of the control, and a real Claude CLI list changing (left to API/E2E).

## Downstream Coverage Hints / Suggested Scenarios

- **Realistic journey (AC-010, AC-012), left to API/E2E:** isolated Electron + test vault; make the Claude CLI change while the app runs with the probe technique in `evidence/probe-results-2026-11-10.md` (PRB-D3: `CLAUDE_CODE_EXECUTABLE_PATH` → symlink; swap the bundled CLI 2.1.280 for the system CLI 2.1.322): (1) new-run picker lists the new model on the next open without a restart; (2) a stopped team's member and a delegated copy switched to the Claude Agent SDK runtime list it, save, and the stored selection names it; (3) a Save naming a model the list no longer holds, and one with the CLI failing, show the two refusal texts and change nothing.
- AC-005/AC-006 live: a Claude Agent SDK session with a stored `{thinking_enabled:false, reasoning_effort:'xhigh'}` carries effort `xhigh` and no `thinking` option (assert on the query options the client sends; `probes/prb-sdk-off.mts` is the starting point).
- AC-008 on a launch: a definition default holding `{reasoning_effort:'low', thinking_display:'omitted'}` stores `{reasoning_effort:'low'}`; QR-003: launch time with Claude SDK adds no ≈2.3 s catalog read.
- IR-003 rerun set: API-14, API-11, API-12, API-15 (the saved-run options contract is shared by every saved-run menu and Save). Add the first open with the CLI already failing (Team settings opened while the failing CLI is in place: the menu opens with the error and Retry, the saved model stays editable and is not marked "No longer offered"). The GraphQL schema-shape expectation in `tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` gained `modelListReadable` and has not been executed.
- Regression areas: Model Router launch setting refusal text; Org launch refusal text (`AGENT_ORG_CONFIGURATION_INVALID` keeps the owner's detail); application launch issues `MODEL_UNAVAILABLE` / `RUNTIME_AUTHENTICATION_UNAVAILABLE` texts.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required (not done here): the realistic isolated-Electron journeys above, the live Claude Agent SDK session assertions, gated live suites that pin old defaults (`autobyteus-claude-5-5-live.e2e.test.ts` C55-E2E-001 was updated to the new `thinking_enabled` default `true`; the live runs themselves are API/E2E's), and API-level coverage of `MODEL_LIST_UNAVAILABLE` through GraphQL for the stopped-run Save mutations.
