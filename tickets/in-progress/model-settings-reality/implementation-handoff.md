# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review applied (Large / High); ARCH-REV-002 `Pass` ("ready for implementation", findings AR-001..AR-003 resolved, implementation guidance IG-1..IG-3).
- Requirements doc: [requirements-doc.md](requirements-doc.md) (SR-002, Approved)
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Solution revision record: [solution-revision-record.md](solution-revision-record.md) (SR-001..SR-003)
- Design spec (required on every route): [design-spec.md](design-spec.md) (SR-003, Ready)
- Supplemental task artifacts: [evidence/probe-results-2026-11-10.md](evidence/probe-results-2026-11-10.md), [probes/](probes/) (live-probe starting points; no behavior-defining supplements)
- Design review report: [design-review-report.md](design-review-report.md)
- Architecture review revision record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

Implements Parts A–D of Project Task autobyteus-9 as designed in SR-003:

- **A. Truthful Claude settings.** AutoByteus runtime: Opus 5 Off sends `disabled` thinking (and no effort); Fable 5 and Fable 5.1 are always-on, effort-only rows (`adaptive_required`; a stored switch has no effect and never fails); the four switch rows default to On; the `omit` off shape is gone. Claude Agent SDK runtime: no thinking switch and no `thinking` option; effort only, at the SDK's levels, with no default (an unchosen effort sends nothing and reads "Default").
- **B. Declared settings only.** `LLMFactory` cuts a raw stored `llmConfig` to the selected model's declared settings (top-level and `extra_params`, standard fields kept) before any adapter sees it; new agent and team runs store the same canonical form (AutoByteus) or the setting keys their backend reads (external runtimes), with no catalog read.
- **C. Docs** synced with the catalog and the new contract; glossary entries added.
- **D. Model lists.** Every model picker re-reads its runtime's list when it opens and on "Refresh models" (list stays usable while it reads, last list kept on failure with Retry; concurrent reads share one server read). Saved-run menus re-read the run's options. A Save/launch refusal names the model and scope, says nothing was saved and what to do; an unreadable list is its own result (`model_list_unavailable` / `MODEL_LIST_UNAVAILABLE`).

- Implementation cycle: `Initial`
- Implementation revision record: [implementation-revision-record.md](implementation-revision-record.md)
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A
- Branch / worktree / commit: `codex/model-settings-reality`, `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality`, commits `d78581eb2..` (see Checks Run for the commit each check ran on; final commit named in the handoff message)

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation touched the three packages and the shared contracts named in the design (result kind and GraphQL outcome, empty-list rule, `LLMFactory` raw-config contract, run-creation writer, concurrent web refresh). No new contract, persistence, security, concurrency or ownership-boundary surface appeared beyond the design; the deviations below are local.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review` (Large / High)
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
| BEH-010 | Pickers re-read on open and on demand | web store `refreshCatalog`/`refreshModelList`; pickers; saved-run reload | Unit + rendered (R1..R5); realistic journey left to API/E2E |
| BEH-011 | Fresh server reads preserved | no server read-path change | Preserved |
| BEH-012 | Actionable refusals; unreadable list distinct | `run-model-selection-refusal.ts` at eight sites; `model_list_unavailable`; web result marking | Unit per site and kind |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

**autobyteus-ts:** `src/llm/api/anthropic-model-request-policy.ts`, `api/anthropic-llm.ts`, `anthropic-supported-model-definitions.ts`, `utils/llm-config-overrides.ts` (`projectRawLlmConfig`), `llm-factory.ts` (`canonicalRunLlmConfig`, projection in `composeEffectiveConfig`).

**autobyteus-server-ts:** `llm-management/services/new-run-llm-config-projection.ts` (new), `run-model-selection-refusal.ts` (new), `run-model-selection-service.ts`, `model-catalog-service.ts`; `runtime-management/claude/client/claude-sdk-model-normalizer.ts`, `claude-sdk-client.ts`; `agent-execution/backends/{claude/session/claude-session-config.ts,codex/codex-app-server-model-normalizer.ts,acp/session/acp-session-launcher.ts}` (key exports); `agent-execution/services/agent-run-provisioning-service.ts`, `agent-team-execution/services/team-run-service.ts`; the eight refusal sites (`delegated-launch-selection-command.ts`, `team-run-delegated-launch-plan.ts`, `standalone-stopped-run-selection-updater.ts`, `standalone-agent-run-root-manager.ts`, `agent-org-run-manager.ts`, `agent-org-run-service.ts`, `launch-usability-check.ts`, `model-routing-settings.ts`); `application-launch-host-capability-validator.ts`; `available-agent-runtimes-service.ts`; `run-history/domain/run-model-config.ts` (outcome list).

**autobyteus-web:** `stores/llmProviderConfig.ts` (+ `llmProviderCatalogPublication.ts`, `llmProviderConfigSupport.ts`), `composables/{chat/useChatModelCatalog.ts,useRuntimeScopedModelSelection.ts,useLockedModelOptionsRefresh.ts (new)}`, `components/common/ModelListRefreshControl.vue` (new), `components/chat/{ChatModelMenu,ChatModelList}.vue`, `components/agentTeams/SearchableGroupedSelect.vue`, `components/launch-config/RuntimeModelConfigFields.vue`, `components/mobile/newRun/{MobileChoiceSheet,MobileRuntimeModelRows}.vue`, the three `components/applications/setup/*` editors, `components/workspace/config/ExistingRunConfigEditor.vue`, `stores/{existingRunModelOptionsActions.ts (new),existingRunConfigStore.ts,existingRunConfigResultActions.ts,delegatedLaunchDraftStore.ts}`, `utils/llmThinkingConfigAdapter.ts`, `localization/messages/{en,zh-CN}/chat.ts`.

**Docs:** `autobyteus-ts/docs/{llm_module_design,llm_module_design_nodejs,provider_model_catalogs}.md`, `autobyteus-server-ts/docs/modules/{llm_management,run_history}.md`, `autobyteus-web/docs/chat.md`, `GLOSSARY.md`.

**Deviations from the design text (none changes ownership, a contract or a requirement):**

1. *Saved-run menu refresh is provided by the editor through Vue provide/inject* (`provideLockedModelOptionsRefresh` in `ExistingRunConfigEditor`, `injectLockedModelOptionsRefresh` in `ChatModelMenu`) instead of an emitted `refresh-locked-models` event relayed through `components/run-settings/*` (five pass-through components). The menu still only asks; the editor owns the reload. A menu outside an editor falls back to the runtime catalog.
2. *`reloadModelOptions()` / `reloadOptions()` have no `address` parameter.* The options query is per run (one server read answers every scope of the run), so the reload refreshes the run's scopes together without flipping any to `loading`.
3. *`existingRunConfigStore.refreshModelOptions` moved into the new `existingRunModelOptionsActions` mixin* (the store was already above 500 lines; it shrank from 507 to 479). Same code, same behavior.
4. *Found by the rendered check, fixed:* `ChatModelMenu` re-reads a runtime once per opening of the menu. As first written, opening the menu and then the current runtime's models started two sequential reads (two Claude CLI spawns) and the second erased the first read's error before it showed.
5. *Found by the rendered check, fixed:* the launch-config panel showed an interactive "Thinking: Off" toggle for the SDK effort-only schema (REQ-005: no on/off choice). `openAiState` in `llmThinkingConfigAdapter.ts` now treats an effort-only schema with no default and no `none` level as thinking on and not switchable, as Codex's effort-only schema already is; an unchosen effort reads "Default" and nothing is written.
6. *`refreshCatalog` never rejects* (its outcome is the snapshot). `createCustomProvider` therefore no longer fails after the provider was created when the follow-up catalog read fails.

## Important Assumptions

- The Claude Agent SDK and CLI behaviors in the probe evidence (thinking `disabled` ignored, effort effective) still hold; RSK-001 remains.
- No in-repo application relies on undeclared keys reaching a provider (`rg` over server src and `applications/`); the design's escalation trigger (a) is therefore not met.

## Known Risks

- RSK-001 (a future CLI honors `thinking: disabled`): the SDK sends no `thinking`, so nothing changes if it does; re-measure on SDK upgrades.
- RSK-004: the switch default On raises token use for new runs on the four switch rows (saved runs keep their stored choice).
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
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`, with one recorded exception: `RuntimeModelConfigFields.vue` (touched for the open/refresh wiring) carries a saved-run mode and unused props reached only by its own spec (FU-004; removing them reshapes a third of a shared component and about six spec cases, outside the reviewed design). Removed: (`omit` off shape and branches, SDK `thinking` path and schema parameter, `supportsAdaptiveThinking`/`supportsClaudeThinking`, the SDK effort default, per-site refusal strings, the availability empty-list check, `refreshLocalCatalog`)
- Dead code found elsewhere, added to `follow-ups.md`: FU-004 (above; found in a touched file, so the reviewer may rule it a required correction instead)
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

The final code commit is `f31fa1821`; each row names the commit it ran on. Evidence files are in `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `cd autobyteus-ts && corepack pnpm exec vitest run tests/unit --no-watch`; `corepack pnpm exec tsc -p tsconfig.build.json --noEmit` | f31fa1821 (autobyteus-ts source unchanged since `d741d4340`) | Linux arm64 container, uid 0, node 22.23.3 | `src/llm/**` (policy, catalog, adapter, projection, factory) and their unit tests (new: `llm-factory-declared-settings.test.ts`; updated: anthropic, factory-composition, config-overrides, catalog tests) | BEH-001..004, BEH-007; AC-001..004, AC-007 (IG-1 cases) | Pass (2 environmental failures, identical on base) | `evidence/IMP-01-ts-unit.log` | `Tests  2 failed \| 2129 passed (2131)`; the 2 are `run-bash.test.ts` "inaccessible absolute cwd" (chmod ignored by uid 0); tsc exit 0 |
| IMP-02 | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 AUTOBYTEUS_LIVE_STRICT=1 corepack pnpm exec vitest run tests/integration/llm/api/anthropic-llm.test.ts --no-watch` | `d741d4340` (autobyteus-ts source unchanged since) | same; live Anthropic API through the test vault | `AnthropicLLM` through `LLMFactory` for every catalog Claude row | BEH-001, BEH-002, BEH-004; AC-001, AC-002, AC-004 | Pass | `evidence/IMP-02-live-anthropic.log` | `Tests  28 passed (28)`; "Off with a stored effort turns thinking off on claude-opus-5 (AC-001, AC-004)" asserts `reasoning_output_tokens` 0; "a stored Off switch and effort resume on claude-fable-5 / -5-1 without failing (AC-002)" |
| IMP-03 | `cd autobyteus-server-ts && corepack pnpm exec vitest run tests/unit tests/app-data-migrations tests/architecture tests/agent-work-journal --exclude "**/*.integration.test.ts" --no-watch`; `node ./scripts/typecheck.mjs` | suite `40b9d79e1`; two fixes `0129c7314` rerun; typecheck f31fa1821 | same (after `pnpm prepare:shared`) | server llm-management, run creation (agent, team), eight refusal sites, application validator, availability, Claude SDK normalizer/session/client | BEH-005..008, BEH-012; AC-005, AC-006, AC-008, AC-013 | Pass (5 environmental failing files; 2 caused by this change were fixed and rerun green) | `evidence/IMP-03-server-unit.log` | `Test Files  7 failed \| 964 passed` at `40b9d79e1`; causes listed per file (chmod as uid 0 ×3 files, jsdom environment ×2 files, 2 fixed); typecheck `production errors: 0; test-file errors: 1181 ... (baseline 1181 ...)` PASS |
| IMP-04 | `cd autobyteus-web && NUXT_TEST=true corepack pnpm exec vitest run`; `node ./scripts/typecheck.mjs` (after `nuxt prepare`); the three guards | suite `d67f77f62`; typecheck and guards f31fa1821 | same | store refresh, composables, chat menu/list, selectors, mobile sheet, saved-run reload, result state, thinking adapter | BEH-003, BEH-005, BEH-006, BEH-010; AC-003, AC-010, AC-011, QR-001, QR-002 | Pass (1 failing test, identical on base, FU-005) | `evidence/IMP-04-web.log` | `Test Files  1 failed \| 740 passed (741)`, `Tests  1 failed \| 5572 passed`; the failure is `projectRunsStore.spec.ts` (fails the same on base sources); typecheck PASS `test-file errors: 96 ... (baseline 96 ...)`; guards passed |
| IMP-05 | `node tickets/.../probes/rendered/model-list-refresh-probe.mjs --output-dir evidence/IMP-05-rendered-model-pickers` (Nuxt dev + headless Chromium, probe-owned GraphQL) | f31fa1821 | same; `/usr/bin/chromium` | real chat model menu, launch-config picker, stores | BEH-006, BEH-010; AC-010, AC-011; QR-001, QR-002 | Pass | `evidence/IMP-05-rendered-model-pickers/evidence.json` and `R*.png` | `Pass: R1=Pass R2=Pass R3=Pass R4=Pass R5=Pass R6=Pass`; cleanup `devServer: terminated`, `temporaryPage: removed` |
| IMP-06 | `rg -n "gemini-3.5-flash\|kimi-k2" autobyteus-ts/docs` | f31fa1821 | same | LLM docs | BEH-009; AC-009 | Pass | `evidence/IMP-06-docs-grep.log` | `exit=1 (1 = no match)` |

- Not run, and why (left to API/E2E, gated, needs a live system): the realistic isolated-Electron journeys (AC-010, AC-012: Claude CLI swap while the app runs, stopped team member and delegated copy switched to the SDK runtime, refusal texts in the app); a live Claude Agent SDK session asserting its query options (AC-005, AC-006); server `test:integration` and `tests/e2e` suites (gated or needing built outputs; `autobyteus-claude-5-5-live.e2e.test.ts` C55-E2E-001 was updated to the new default but not run); a rendered check of the saved-run (locked) Team-settings menu (covered by component specs only); the `autobyteus-web` fresh-start build (no build input changed: `git diff --name-only fd0eb664c..HEAD` touches no `package.json`, tsconfig, script or workflow).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the chat model menu (runtime flyout and narrow drill-in), the launch-config model picker (`RuntimeModelConfigFields` / `SearchableGroupedSelect`), the launch panel's thinking control for an effort-only schema; the phone model sheet, the application launch-profile pickers and the saved-run Team-settings menu are covered by component specs only.
- Approved UI/UX, interaction, requirement, or design references: requirements "UI, Interaction, And Experience Requirements" (refresh action inside each picker using its existing look; busy state with the list usable; error with Retry; "Default" for an unchosen SDK effort); no UI/UX supplement exists.
- Existing design system, shared components, and adjacent product surfaces reviewed: `ChatModelList`, `ChatModelMenu` (keyboard rows, popover placement), `SearchableGroupedSelect`, `ModelConfigSection`, `MobileChoiceSheet`/`MobileBottomSheet`; one new shared control (`ModelListRefreshControl`) uses the menu's own text size, colors and row spacing.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md "Renderer UI ... Web unit tests + a browser probe"; the probe starts the repository's Nuxt dev server and headless Chromium (`playwright-core`) against a fixture page of the real components and real Pinia stores, with the GraphQL boundary owned by the probe. It is not the Electron shell.
- States, layouts, viewports, and interactions inspected: list open (2 models); refreshing with the list usable and the control busy; new model appears and is chosen; failed refresh with the last list kept and Retry; Retry and "Refresh models" re-read; concurrent opens share one read; launch picker open, new model, failed refresh; 390×844 drill-in; launch panel thinking control. Keyboard row navigation is covered by the existing menu specs and the `data-row` handling of the busy button.
- Visual or interaction issues found and corrected: (1) opening the menu and then the current runtime started two sequential reads, the second hiding the first read's error: a runtime is now read once per opening (R2 asserts one read); (2) the busy text and "Refresh models" wrapped onto two lines in the 17rem flyout: text shortened to "Refreshing…" and kept on one line; (3) the launch panel showed an interactive "Thinking: Off" switch for the SDK effort-only schema: it now shows Thinking on, not switchable, with "Reasoning Effort: Default" (R6).
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-05 (`R1-1…R6` screenshots). Unverified: the saved-run locked menu rendering, the phone sheet and application editors in a browser, the Electron shell, dark mode of the control, and a real Claude CLI list changing (left to API/E2E).

## Downstream Coverage Hints / Suggested Scenarios

- **Realistic journey (AC-010, AC-012), left to API/E2E:** isolated Electron + test vault; make the Claude CLI change while the app runs with the probe technique in `evidence/probe-results-2026-11-10.md` (PRB-D3: `CLAUDE_CODE_EXECUTABLE_PATH` → symlink; swap the bundled CLI 2.1.280 for the system CLI 2.1.322): (1) new-run picker lists the new model on the next open without a restart; (2) a stopped team's member and a delegated copy switched to the Claude Agent SDK runtime list it, save, and the stored selection names it; (3) a Save naming a model the list no longer holds, and one with the CLI failing, show the two refusal texts and change nothing.
- AC-005/AC-006 live: a Claude Agent SDK session with a stored `{thinking_enabled:false, reasoning_effort:'xhigh'}` carries effort `xhigh` and no `thinking` option (assert on the query options the client sends; `probes/prb-sdk-off.mts` is the starting point).
- AC-008 on a launch: a definition default holding `{reasoning_effort:'low', thinking_display:'omitted'}` stores `{reasoning_effort:'low'}`; QR-003: launch time with Claude SDK adds no ≈2.3 s catalog read.
- Rendered re-check of the saved-run (locked) menu in Team settings, which this round covers by component specs only.
- Regression areas: Model Router launch setting refusal text; Org launch refusal text (`AGENT_ORG_CONFIGURATION_INVALID` keeps the owner's detail); application launch issues `MODEL_UNAVAILABLE` / `RUNTIME_AUTHENTICATION_UNAVAILABLE` texts.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required (not done here): the realistic isolated-Electron journeys above, the live Claude Agent SDK session assertions, gated live suites that pin old defaults (`autobyteus-claude-5-5-live.e2e.test.ts` C55-E2E-001 was updated to the new `thinking_enabled` default `true`; the live runs themselves are API/E2E's), and API-level coverage of `MODEL_LIST_UNAVAILABLE` through GraphQL for the stopped-run Save mutations.
