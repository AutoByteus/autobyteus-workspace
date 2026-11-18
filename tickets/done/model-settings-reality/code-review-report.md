# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 4, after the round-3 `API/E2E Failure-Origin Review`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only: Current-State Read sources)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: `evidence/probe-results-2026-11-10.md` (evidence only), `follow-ups.md`
- Relevant Solution Revision IDs: SR-003, SR-004 (round 4)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass, IG-1..IG-3)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003 (round 4)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003 (round 4)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: 4
- Review Scope: `Full Re-Audit` (round 4). Evidence: the SR-004 delta `git diff a3b87f061..dfa0faa76` changes a shared GraphQL data shape (`RunModelOptionsObject.modelListReadable: Boolean!`, inherited by the Team-scope, Org-scope and delegated option objects) and the web options state; all structural checks and the full scorecard were rechecked against the code at `dfa0faa76`. Earlier rounds: round 3 failure-origin, round 2 `Targeted Delta Review`, round 1 `Full Review`; round-2 scope evidence:
- Review Scope Evidence (round >1): `git diff f31fa1821..817bd9950` changes only the files of CR-001..CR-003 and what their removal made unused (RuntimeModelConfigFields.vue and its two specs, `useRuntimeScopedModelSelection` `loadCatalog` option and its one passer, the deleted `RuntimeModelConfigSchemaState.ts`, six locale keys, `ModelListUnavailableError`, GLOSSARY.md); no data-flow spine, shared contract or data shape changed; c491a79bb is documents and evidence only
- Trigger: Implementation Engineer, IR-003 (SR-004, ARCH-REV-003), resolving CR-004; round 3 trigger was API/E2E round 1 Fail on API-14
- Prior Review Round Reviewed: round 3 (CRR-003, Fail — Design Impact)
- Latest Authoritative Round: 4
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API/E2E round 1 (commits f6ce6c78e, a748eb48e, a3b87f061)
- Delivery fields: N/A
- Failing Scenario IDs: API-14 (REQ-010, REQ-011, QR-001; AC-010 alternate outcome as it applies to saved-run menus; SCN-008)
- Exact Failing Commands / Execution Mode: `PATH=/tmp/pnpm-shim:$PATH AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node tickets/in-progress/model-settings-reality/probes/real-stack/model-list-journeys-probe.mjs --output-dir <dir> --browser-executable /usr/bin/chromium --cases API-14` (real Chromium, Nuxt dev, built server at 817bd9950, real Claude CLIs); unit reproduction `probes/locked-menu-failed-refresh.repro.spec.ts` copied to `autobyteus-web/stores/__tests__/`, `NUXT_TEST=true corepack pnpm exec vitest run <spec>`
- Failure Evidence Paths: `evidence/API-11-12-14-real-stack/evidence.json`, `API-14-4-locked-menu-refresh-failed.png`, `API-14-5-card-after-failed-refresh.png`, `evidence/API-14-repro-unit.log`
- Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality`, branch `codex/model-settings-reality`; round 1 `git diff fd0eb664c..f31fa1821` (106 files); round 2 delta `git diff f31fa1821..817bd9950`. Round-2 code commit `817bd9950`; round 4 delta `git diff a3b87f061..dfa0faa76`, final code commit `dfa0faa76`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review` (rounds 1, 2, 4); `API/E2E Failure-Origin Review` (round 3)
- Independent source review required by the classification: `Yes` (round 3 is the failure-origin entry point)
- Classification evidence or correction required: confirmed. Three packages; shared contracts changed as designed (`model_list_unavailable` / `MODEL_LIST_UNAVAILABLE`, catalog empty-list throw, `LLMFactory` raw-config contract, new-run writer, concurrent web refresh). No new risk surface beyond the design.

## Review Scope

- Changed implementation and behavior reviewed: UC-001..UC-006 (BEH-001..BEH-012) across autobyteus-ts (Anthropic policy/catalog/adapter, `projectRawLlmConfig`, `LLMFactory`), autobyteus-server-ts (Claude SDK normalizer/session/client, setting-key exports, `new-run-llm-config-projection.ts`, provisioning and team creation, catalog empty-list rule, validator kind, `run-model-selection-refusal.ts` and the eight sites, application validator, availability), autobyteus-web (store refresh, composables, `ModelListRefreshControl`, chat menu/list, `SearchableGroupedSelect`, `RuntimeModelConfigFields`, mobile sheet, application editors, saved-run reload via provide/inject, result outcomes, thinking adapter, i18n), docs and glossary.
- Files / areas reviewed: every production file in the diff; the new and changed unit tests for projection, factory, refusal, store refresh, locked refresh, thinking adapter (proportionately).
- Explicit exclusions: gated live suites and realistic Electron journeys (not run; API/E2E). No check was rerun by the reviewer: round 1 relied on IMP-01..IMP-06; round 2 relies on IMP-07 (web suite, web and server type gates, guards, 48 server unit files, rendered probe R1..R6 at 817bd9950), which covers every file in the delta.
- Round 2 delta reviewed: `RuntimeModelConfigFields.vue` (388 → 242 lines, new-launch mode only; compared rule by rule with the round-1 new-launch branches: loading, unavailable-model, seed, schema, validation, disabled and emit logic unchanged for that mode), its spec and `RuntimeCapabilityReadiness.spec.ts` (now assert the DOM), `useRuntimeScopedModelSelection` (`loadCatalog` had no caller passing `false`), the six removed locale keys (no reader left: `rg`), `ModelListUnavailableError`, GLOSSARY.md.

## Round 4 — SR-004 Implementation Review (CRR-004)

Behavior basis: SCN-008 (supported normal), REQ-010, REQ-011, QR-001, REQ-013; design-spec SR-004 (DS-005 "SR-004 saved-run options contract", Change Scope consumer 2, Interface Boundary rows), ARCH-REV-003. Status: `Confirmed`.

| Check | Result | Evidence |
| --- | --- | --- |
| One read-failure classification | Pass | `readCatalog` in `run-model-selection-service.ts` serves `validateWithEvidence` (`model_list_unavailable` + diagnostic) and `optionsWithEvidence` (`modelListReadable: false`, empty options, `modelListUnreadableText(runtime, diagnostic)`); the options path's own text is gone |
| Explicit contract, no inference (Principle 13; IG-4) | Pass | `RunModelOptionsObject.modelListReadable: Boolean!`; every producer spreads the service answer (`studio-run-model-config-service.ts`, `agent-org-run-service.ts`, `delegated-launch-selection-command.ts`); the web decides only from the flag (`optionsStateOfAnswer`), and both clients refuse an answer without it |
| Readable answers stay `true` | Pass | external list without the model, unverified native capacity (its `unavailableReason` text kept, now with `currentModel`), server unit cases |
| Dead `supportedRuntime` gate removed | Pass | every `RuntimeKind` is AutoByteus or external (`runtime-kind-enum.ts`); the gate could not fail |
| QR-001 on reload | Pass | `mergeReloadedOptions`: readable row replaces; unreadable row keeps a shown `ready` row, else `unavailable` with the message; `complete=false` → `reloadModelOptions` / `reloadOptions` resolve `false` → `provideLockedModelOptionsRefresh` sets `failed` → `ModelListRefreshControl` "Couldn't refresh models" + Retry (Retry calls the options-backed refresh, since run-settings passes no `lockedModelsState`); stale answers still `true` and not applied |
| No "No longer offered" for an unreadable list | Pass | `ExistingRunConfigEditor.modelUnavailable` requires `ready`; unreadable rows are `unavailable` (first read included); `schemaStateFor` keeps the own model editable and shows the server's message for another model |
| Former C-08 (reload supersedes the first read, then fails) | Resolved by design | an unreadable or failed reload now leaves `unavailable` or the shown state, never a stuck `loading` from the superseded read when the server answers |
| One shared mapper and merge for both stores (deviation 7) | Pass | `services/runConfigEditing/existingRunModelOptionsState.ts`, used by both clients and both stores; no duplicated policy |
| Generated GraphQL types regenerated (deviation 8) | Pass | `generated/graphql.ts` 13+/5-; server architecture test `web-generated-graphql-current` passes (IMP-08) |
| File sizes | Pass | `run-model-selection-service.ts` 134, `delegatedLaunchDraftStore.ts` 192, `existingRunConfigEditActions.ts` 100 non-empty lines; new file 28 lines |
| Dead code in touched files | Pass | removed gate and free text; nothing left unread in the delta (`rg`) |
| Docs and glossary | Pass | `llm_management.md`, `autobyteus-web/docs/chat.md`, GLOSSARY "Offered models" describe the flag as the only signal |
| Tests | Pass | server: both flag values and the shared classification; web: mapper, merge (per row, mixed rows), both clients (flag required), both stores (keep shown + `false`, first read `unavailable`, stale not a failure), editor (no "No longer offered", own model editable). The reload cases fail on the pre-change stores (IMP-08) |
| Checks | Pass | IMP-08: server 174 files / 1446 tests, `tests/architecture` 12/12, typecheck baseline; web 741/742 (FU-005 only), typecheck baseline, three guards; IMP-09: API-14 real stack Pass (self-check) |

Candidates this round: none promoted. Noted for API/E2E, not a finding: `stopped-run-model-config-graphql.e2e.test.ts` had its field list edited but was not run by implementation; the first open of a saved-run menu with the CLI already failing is unit- and editor-covered only.

## API/E2E Failure-Origin Review (Round 3, CRR-003)

### Failing scenario still represents approved behavior

Yes. SCN-008 (Supported Normal Scenario): a user opens a stopped Team run's Team settings and uses its saved-runtime model menu. REQ-010 names stopped-run settings among the pickers that refresh on open; REQ-011 gives every picker "Refresh models"; QR-001: "a failed refresh never empties a list that loaded before"; the requirements' UI states: "refresh failed (last list kept + error + Retry)". The independent trigger is the user's Refresh (or a reopen) while the Claude CLI cannot list its models (AC-010 alternate, AC-013 "list unreadable (e.g. runtime CLI failing)"). The test enters through that real surface; nothing synthetic creates the state.

### Production path traced

1. `ChatModelMenu` (runtime-locked, inside `ExistingRunConfigEditor`) → `provideLockedModelOptionsRefresh` → `existingRunConfigStore.reloadModelOptions()` + `delegatedLaunchDraftStore.reloadOptions()`.
2. → `loadExistingRunModelOptions` → GraphQL `teamRunModelOptions` → `RunModelSelectionService.listOptionsMany` → `optionsWithEvidence`.
3. `ModelCatalogService.runtimeModelSelectionCatalog` throws `ModelListUnavailableError` (this ticket); `optionsWithEvidence` L122-123 catches every catalog error and answers `{ currentModel: null, replacements: [], unavailableReason: "Runtime model catalog is unavailable. Refresh this run to retry; …" }`, not a GraphQL error.
4. `loadExistingRunModelOptions` maps every row to `{ status: 'ready', options }` (no field says the read failed).
5. `reloadModelOptions` (`existingRunModelOptionsActions.ts` L37-52, added by this ticket) treats any resolved answer as success: it replaces the shown options and answers `true`, so `failed` stays false. The menu shows "No models available" and "Refresh models"; `modelUnavailable(address)` (`ExistingRunConfigEditor.vue` L442-452: `currentModel === null`) shows "No longer offered by Claude Agent SDK" on the card. `delegatedLaunchDraftStore.reloadOptions` has the same shape (`delegatedLaunchModelOptions` → same `optionsWithEvidence`).

Observed behavior (real stack and unit reproduction) matches this path exactly.

### Cause classification

- **Origin: inadequate reviewed design (Design Impact), with a review gap.** The options contract (`RunModelOptions`) has no explicit "the runtime's list could not be read" result; a read failure is folded into the free-text `unavailableReason`, which also carries "runtime does not support replacement" and "capacity could not be verified". The design's derived-consumer decision (design-spec Change Scope, consumer 2: "`listOptions*` → existing catch → 'Runtime model catalog is unavailable…' reason (accepted: correct text for this case)") did not consider DS-005, where the web reload must tell a failed read from a successful one to meet QR-001. The implementation followed that decision.
- **Why not a Local Fix:** the web could only infer failure from the shape `unavailableReason !== null && currentModel === null && replacements.length === 0`, i.e. one status counting as another (Principle 13, "Behavior by absence"; the same trigger this design itself fired for validation and fixed with `model_list_unavailable`). Doing it properly adds a field to a shared GraphQL contract, which belongs to the design.
- **Not** a test, fixture, environment or execution problem: the probe uses the real surface and the unit reproduction isolates the store with the server's real answer shape.
- **Not a Requirement Gap:** QR-001 and the UI states settle the expected behavior.
- **Review gap (CRR-001):** detectable in source review. My candidate C-08 recorded that `listOptions*` "turns catalog failures into a reason, not a thrown query", yet I did not follow that answer into `reloadModelOptions`' success branch, whose catch-only failure rule therefore never fires for an unreadable list. The invariant that should have been checked: a re-read whose catalog read failed must leave the shown options in place and report failure (QR-001).
- **Related, same signal:** `optionsWithEvidence` keeps its own wording for the unreadable list ("Refresh this run to retry"), outside the one wording owner `run-model-selection-refusal.ts` (`modelListUnreadableText`) that DS-006 introduced, and it points to an action the new "Refresh models" control replaces.
- **Pre-existing part:** on the *first* read of an edit with a failing CLI, the card already said "No longer offered" on the base (the Claude read returned `[]` then; `currentModel` null). This ticket did not introduce that, but the same explicit signal fixes it; whether it is in scope is the Solution Designer's call (it is the on-screen form of REQ-013's "not offered" vs "unreadable" distinction).

### Recommended design response (for the Solution Designer; not prescriptive)

- Give the stopped-run and delegated options answers an explicit read-failure result (for example a field mirroring `model_list_unavailable`), worded by `modelListUnreadableText`.
- Web: `loadExistingRunModelOptions` / delegated client carry it; `reloadModelOptions` and `reloadOptions` keep the shown options and answer `false` for it (menu shows "Couldn't refresh models" + Retry); the card does not show "No longer offered" for it.
- Tests: the API/E2E unit reproduction becomes a store spec; a server unit case for the options answer; API-14 rerun.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001..REQ-014, AC-001..AC-013, QR-001..QR-003, DEC-001..DEC-015).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-002 Pass; IG-1..IG-3 applied (verified: top-level wins over container in `projectRawLlmConfig`; DEC-D1 fallback detail keeps the diagnostic; Fable 5/5.1 `adaptive_required`).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | policy `claude-opus-5` → `adaptive('disabled')`; `buildThinkingFromToggle` returns `{type:'disabled'}`; effort skipped when `thinkingEnabled === false` (anthropic-llm.ts) | — |
| BEH-002 | Confirmed | catalog `claudeEffortOnlySchema('high')`; policy `adaptive_required`; `composeEffectiveConfig` → `projectRawLlmConfig` drops stored `thinking_enabled` before `validateStrictRequestRules` | — |
| BEH-003 | Confirmed | `claudeThinkingSwitchSchema` default `true` | — |
| BEH-004 | Confirmed | Sonnet 5 / 5.5 / Haiku 5.5 entries unchanged; `omit` branches removed | — |
| BEH-005 | Confirmed | `buildClaudeEffortConfigSchema`; `ClaudeSessionConfig.thinking` and the SDK `thinking` option removed | — |
| BEH-006 | Confirmed | SDK effort parameter has no default; adapter `alwaysOn` shows thinking on with "Default" and writes nothing | — |
| BEH-007 | Confirmed | `LLMFactory.composeEffectiveConfig` projects raw records; only production raw caller is `createAvailableLlm` | — |
| BEH-008 | Confirmed | `AgentRunProvisioningService.validateAndPrepareRunInput` and `TeamRunService.createTeamRun` call `projectNewRunLlmConfig`; no catalog read | — |
| BEH-009 | Confirmed | docs synced; IMP-06 | — |
| BEH-010 | Confirmed | store `refreshCatalog` / `refreshModelList` / `readRuntimeCatalog`; pickers call on open and on Refresh; saved-run menus via `provideLockedModelOptionsRefresh` | — |
| BEH-011 | Confirmed | server read path unchanged apart from the empty-list throw | — |
| BEH-012 | Confirmed | `model_list_unavailable`; `runModelSelectionRefusal` at all eight sites; web marks `MODEL_LIST_UNAVAILABLE` scopes | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

The review relies on the requirements' scenarios unchanged: SCN-001..SCN-008, all `Supported Normal Scenario`, `Use`. Scenario rows are not copied here; see requirements-doc "Relevant Scenarios And Journeys". One scenario detail the findings use:

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-008-alt (AC-013 alternate) | REQ-013, AC-013 | User | User | Launch/Save while the Claude CLI fails | application launch setup, run settings Save | Normal (named alternate in AC-013) | `ClaudeSdkClient.listModels` → `[]` on failure → `ModelCatalogService.runtimeModelSelectionCatalog` throws `ModelListUnavailableError` → `ApplicationLaunchHostCapabilityValidator` `RUNTIME_AUTHENTICATION_UNAVAILABLE` with `modelListUnreadableText(runtime, failure.message)` | User reads why the list could not be read | AC-013 "List unreadable (e.g. runtime CLI failing)"; code path read | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 (resolved round 2) | `RuntimeModelConfigFields.vue` keeps a saved-run mode (`originalModelIdentifier`, `modelOptions`, `runChoice`, replacement branches) and props (`readOnly`, `runtimeSelectionLocked`, `modelSelectionLocked`, `modelConfigDisabled`, `modelConfigReadOnly`, `historicalModelConfig`, `missingHistoricalConfig`, `validationErrors`, `historical*` texts) reached only by its own spec; this change adds new branches on that mode (`:refreshable="originalModelIdentifier === undefined"`, the `onModelPickerOpen` guard) | Contract: Core Principle 7 (dead code in touched files); DESIGN.md Mandatory Rule 11 (no production code only tests reach) | The change touched the file (open/refresh wiring) | The one production caller `DefinitionLaunchPreferencesSection.vue` L28-41 passes none of those props; the dead mode now also carries new refresh branches | `rg` for the props/kebab names outside the component and its spec finds nothing (FU-004 evidence, re-run 2026-11-10) | Promote | This ticket | Remove the mode, the props and the spec cases that exist only for them (CR-001). FU-004 becomes this ticket. |
| C-02 (resolved round 2) | `ModelListUnavailableError` words its message with the raw enum value (`The claude_agent_sdk runtime returned no models.`); for Claude SDK the application validator passes it as the diagnostic, so the user reads "The model list of Claude Agent SDK could not be read: The claude_agent_sdk runtime returned no models. Try again."; its public `runtimeKind` field has no reader | SCN-008-alt; REQ-013; Principle 15 (one name per concept: the runtime's display name); Principle 7 / Rule 11 (unused field) | Claude CLI failing while an application launch is validated | see SCN-008-alt | model-catalog-service.ts L71-76, L186; application-launch-host-capability-validator.ts L117-127 (`failure.message` for Claude); `llm-provider.test.ts` L255 shows the same text reaching GraphQL errors; `rg "\.runtimeKind"` on the error: no reader | Promote | This ticket (code this change added) | Word the message with `agentRuntimeName` (or without the runtime, since the outer text names it) and drop the unused field (CR-002). Minor. |
| C-03 (resolved round 2) | GLOSSARY "Offered models" says "model list" is UI copy only, not a second domain name, while the code this change adds names the concept with it: `model_list_unavailable`, `MODEL_LIST_UNAVAILABLE`, `ModelListUnavailableError`, `modelListUnreadableText`, `ModelListRefreshControl`, `modelListRefreshing` | Contract: Principle 15; the glossary is the vocabulary authority (DESIGN.md) | The change added both the glossary entry and the identifiers | A reader of the glossary is told the opposite of what the code does | GLOSSARY.md diff; identifiers above | Promote | This ticket | Make the glossary entry state truthfully how "model list" is used in names (e.g. the read of a runtime's offered models; `model_list_unavailable` = that read failed). Doc-only (CR-003). No rename asked: the design named these identifiers and ARCH-REV-002 passed them. |
| C-04 | Deviation 1: saved-run refresh through provide/inject instead of an emitted event relayed by five `run-settings/*` components | Design DS-005 ownership | — | The menu still only asks; the editor owns the reload; no pass-through layers | `useLockedModelOptionsRefresh.ts`, `ExistingRunConfigEditor.vue` L166-167, `ChatModelMenu.vue` L311-318 | Reject | — | Same ownership, fewer empty layers (Principle 13). Accepted. |
| C-05 | Deviation 2: `reloadModelOptions()` / `reloadOptions()` per run, not per address | Design interface table | — | The options query is one read per run | `existingRunModelOptionsActions.ts` | Reject | — | The address parameter would select nothing the read does not already return. Accepted. |
| C-06 | Usability fallback `detail` says "Refresh the model list and choose again" where no picker is in front of the reader | REQ-013, DEC-D1 | — | Designed wording; content required by REQ-013 | design-spec Derived consumers 1 | Reject | — | Approved behavior; a shorter text there would be a requirement change, not a defect. |
| C-07 | `refreshCatalog` never rejects; `createCustomProvider` no longer fails after the provider was created | REQ-011 | — | The provider is created; a failed follow-up read shows on the snapshot (`refreshError`) | `llmProviderConfig.ts` L205-209, L429 | Reject | — | More truthful than failing a create that succeeded. Accepted. |
| C-08 | A locked-menu reload started while the editor's first options read is in flight supersedes it; if the reload then fails, scopes stay `loading` | SCN-008 | Needs a transport failure of the options query inside the first read's window | Self-heals on the next menu opening (another reload) | `existingRunModelOptionsActions.ts` L37-52 | Reject | — | Infrastructure failure is outside scope by default (Principle 6); `listOptions*` turns catalog failures into a reason, not a thrown query. |
| C-09 | Thinking adapter `alwaysOn` could change non-Claude effort rows | REQ-005/006; FU-003 boundary | — | Applies only to an effort schema with no default and no `none` level | every other `reasoning_effort` definition has a default (`rg` in autobyteus-ts and server src) | Reject | — | Only the SDK schema reaches the new branch. |
| C-10 | Each locked-menu opening reads both the run's options and its delegated copies' options | DS-005; QR-001 | — | One extra read per opening; concurrent openings coalesce | `provideLockedModelOptionsRefresh` in-flight join | Reject | — | Accepted cost (design Key Tradeoffs: one read per open, no TTL). |
| C-11 | After CR-001, `ModelConfigSection.vue` props `historical`, `missingHistoricalConfig`, `historicalValueUnavailableMessage`, `historicalModelConfigTitle`, `trackAutomaticChanges` have no passer; `utils/existingRunModelHelp.ts` and its three locale keys have no production caller (FU-006) | Principle 7 scope (touched files vs elsewhere) | — | Their only passer was the saved-run mode, which no product path reached before this change either; `ModelConfigSection.vue` and `existingRunModelHelp.ts` are not touched | FU-006 `rg` evidence | Promote | Follow-up | Pre-existing dead code outside the touched files: FU-006 accepted as recorded. |
| C-12 | `workspace.runModelConfig.orgOwnershipUnavailable` (en, zh-CN) has no reader; it had none on the base branch either | Principle 7 | — | The locale catalogs were touched only to remove the keys CR-001 left unread | `rg orgOwnershipUnavailable` finds only the two catalogs; present at `fd0eb664c` | Promote | Follow-up (FU-007) | An app-wide message catalog touched for cleanup is not a reason to sweep it here; the key is unrelated to this ticket's behavior. When unsure, a follow-up (ticket-scope). |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Refusal wording has one owner; the empty-list rule lives in `ModelCatalogService`; the result kind is split | — |
| Implementation matches behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; probe evidence consistent | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-007 traced in code (see basis table) | — |
| Ownership boundary preservation and clarity | Pass | `NewRunLlmConfigProjection` sole creation owner; `LLMFactory` owns projection; store owns snapshots | — |
| Off-spine concern clarity | Pass | key exports per backend; refusal text owner; refresh control | — |
| Existing capability/subsystem reuse | Pass | extends `llm-config-overrides.ts`, store in-flight map and request ids, `reloadProvider` | — |
| Reusable owned structures | Pass | `ModelListRefreshControl` shared by four picker families; snapshot transitions in `llmProviderCatalogPublication.ts` | — |
| Shared-structure/data-model tightness | Pass | `model_unavailable` lost the diagnostic it no longer needs; `RuntimeCatalogSnapshot` gains two state fields with distinct meanings | — |
| Repeated coordination ownership | Pass | eight sites call `runModelSelectionRefusal`; the application validator and fallback use its two text functions | — |
| Empty indirection | Pass | provide/inject avoided five pass-through relays | — |
| Separation of concerns and file responsibility | Pass | `existingRunModelOptionsActions` mixin moves option reads out of a 501-line store | — |
| Ownership-driven dependency | Pass | server → autobyteus-ts only; projection → backend exports; backends import nothing back | — |
| Authoritative Boundary Rule | Pass | no caller reads `configSchema` or calls `applyRawLlmConfigOverrides` outside `LLMFactory`; components never query catalogs | — |
| File placement | Pass | new server files next to `run-model-selection-service.ts`; web control in `components/common` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | explicit identity shapes (runtime + model; runtime kind) | — |
| Naming quality; one meaning per word (Principle 15) | Pass | Round 2: the error reads "Claude Agent SDK returned no models."; the glossary states how "model list" appears in names | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | the two rendered-check fixes are local and tested | — |
| Dead code removed in touched files (Principle 7) | Pass | Round 2: saved-run mode, unused props and emits, `RuntimeModelConfigSchemaState.ts`, `loadCatalog` option, six locale keys and the error's `runtimeKind` field removed; leftovers outside the touched files are FU-006, FU-007 | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | AC IDs named in test titles; request-level assertions for Anthropic; per-runtime projection table | — |
| Test fixtures/helpers reusable, structure coherent | Pass | — | — |
| No stale, duplicated or compatibility-only tests | Pass | Round 2: saved-run-only spec cases deleted; readiness spec asserts what the fields show | — |
| API/E2E readiness | Pass | handoff lists the realistic journeys and live SDK checks | — |

## Source File Size And Structure Audit

All changed implementation files stay at or under 500 effective non-empty lines; none was over on the base except `existingRunConfigStore.ts` (501 → 479, shrunk).

| Source File | Before | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | 480 | 495 | Pass | Pass (+37/-22) | Pass (transitions moved out) | Pass | — | — |
| `autobyteus-web/stores/existingRunConfigStore.ts` | 501 | 479 | Pass (shrunk) | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/.../standalone-agent-run-root-manager.ts` | 480 | 483 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/.../agent-org-run-manager.ts` | 480 | 481 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/.../ApplicationTeamLaunchProfileEditor.vue` | 470 | 479 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/components/chat/ChatModelMenu.vue` | 399 | 428 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/.../RuntimeModelConfigFields.vue` | 375 | 242 (round 2) | Pass | Pass | Pass (one mode) | Pass | — | — |
| other changed files | ≤ 455 | ≤ 455 | Pass | Pass (largest delta 59) | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | stored keys are projected away, not translated |
| No legacy old-behavior retention in changed scope | Pass | `omit`, SDK `thinking`, SDK effort default, per-site wordings, availability empty check, `refreshLocalCatalog` removed |
| Dead code removed in touched files | Pass | CR-001, CR-002 resolved (round 2) |
| Approved persisted-data transition followed | Pass | `Directly Usable — No Migration`; fallback reason vocabulary unchanged (DEC-D1) |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining in the touched files (round 2). Round 1 items (`RuntimeModelConfigFields.vue` saved-run mode and props; `ModelListUnavailableError.runtimeKind`) are removed at `817bd9950`. Dead code found outside the touched files: FU-006, FU-007.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: LLM raw-config contract, Claude settings, refresh behavior, new outcome, glossary entries.
- Files: already updated (`autobyteus-ts/docs/*`, `llm_management.md`, `run_history.md`, `autobyteus-web/docs/chat.md`, `GLOSSARY.md`, with the round-2 wording fix).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (simple average; not the decision rule). Round 4 (Full Re-Audit): all categories rechecked; 3 and 8 re-scored.
- Round 2 (targeted delta): categories 4, 6 and 10 re-scored; the others carry forward from round 1 (their evidence is unaffected by the delta).

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every DS spine is visible in code in the designed order; projection sits at the two designed points | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner each for projection, empty-list rule, refusal wording, snapshot lifecycle; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Result kind split is explicit; refusal API takes explicit identity and `savedSettingsUnchanged`; round 4: options answers state readability explicitly (`modelListReadable`) | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Store kept under 500; `RuntimeModelConfigFields.vue` now owns one mode (242 lines) | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `model_unavailable` tightened; snapshot fields singular | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Runtime display names in user text; glossary matches the identifiers | — | — |
| 7 | API/E2E Readiness | 9.3 | Handoff names the realistic journeys and live SDK checks; unit coverage per AC | AC-007 is asserted on `LLMConfig.extraParams`, not on captured requests (adapters spread it; acceptable) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 (round 4) | Traced Opus 5 Off, Fable stored Off, SDK effort, projection, refresh coalescing and late-answer guards; live IMP-02; round 4: a failed saved-run re-read keeps the shown options and reports failure (CR-004 resolved, IMP-09 real stack) | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | Clean removals listed in the design are done | — | — |
| 10 | Cleanup Completeness | 9.3 | Design removal plan complete; the touched component, composable, type and locale keys cleaned | Dead code outside the touched files remains, recorded (FU-006, FU-007) | Follow-ups |

## Findings

No open findings. CR-001..CR-003 resolved (CRR-002); CR-004 resolved (CRR-004, SR-004 / IR-003 at `dfa0faa76`).

### CR-004 — Saved-run model options carried no explicit "list could not be read" result (Design Impact) — Resolved

- Found in round 3 (API-14). Resolution: design SR-004 (ARCH-REV-003) added `modelListReadable` to the options contract with the wording owner's text; IR-003 implemented it on the server and in both web stores. Verified in round 4 (section above).

## Follow-ups

- Follow-ups this review added: FU-007 (round 2).
- FU-004 ruled this ticket (CR-001) and resolved. FU-005 confirmed as a follow-up. FU-006 (added by implementation in round 2) confirmed as a follow-up: the files are not touched and the code was unreachable before this change.

## Classification

- Round 4: `Pass` (no classification). Round 3's `Design Impact` (CR-004) is resolved.

## Recommended Recipient

- API/E2E Engineer: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- RSK-001 (a future CLI honoring `thinking: disabled`): no effect now that nothing sends it.
- RSK-004: switch default On raises token use on new runs (approved, DEC-002).
- One Claude CLI read per locked or chosen-runtime menu opening (accepted design tradeoff).
- Not yet exercised in a real app: AC-010 / AC-012 Electron journeys with a CLI swap, live SDK session options (AC-005/006), saved-run locked menu rendering. API/E2E owns these.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 4, Full Re-Audit of the SR-004 delta)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3.
- Failure Origin: N/A this round (round 3: Design Impact, resolved)
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: API/E2E reruns API-14 (including the first-open-with-failing-CLI state on the real stack if feasible), API-11, API-12, API-15, and runs the edited `stopped-run-model-config-graphql.e2e.test.ts`.
