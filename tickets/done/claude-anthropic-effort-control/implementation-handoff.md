# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected for SR-004/SR-005 (risk raised to High) and passed (ARCH-REV-002). Rule matched: "implementation complete, task_size Large or architectural_risk High, ready for independent source review" → `/software_engineering_team/code_reviewer`.
- Requirements doc: `tickets/in-progress/claude-anthropic-effort-control/requirements-doc.md` (SR-005 basis: SR-002 requirements + DEC-011 and AC-012/AC-013, approved by the User 2026-10-29)
- Investigation notes: `.../investigation-notes.md` (SRC-022, SRC-023 for this round)
- Solution revision record: `.../solution-revision-record.md` (SR-001..SR-005)
- Design spec (required on every route): `.../design-spec.md` (SR-005: "SR-005 Delta", "SR-004 Delta"; SR-003 superseded; SR-002 delta for IR-001)
- Supplemental task artifacts: `.../evidence/SD-PRB-003-omitted-thinking-round-trip.log` (designer probe)
- Design review report: `.../design-review-report.md` (round 2, pass, with guidance IG-1, IG-2)
- Architecture review revision record: `.../architecture-review-revision-record.md` (ARCH-REV-001, ARCH-REV-002). Note: at handoff time both files have uncommitted edits by the architecture reviewer in the worktree; they are the reviewer's and are not part of the implementation commits.
- Triggering rework report, revision record, or evidence: `code-review-report.md` CR-FO-001 (CRR-001), from API/E2E round 1 (`api-e2e-execution-coverage-report.md`, API-REV-001: API-04, API-06 Fail); implementation Design Impact DI-1/DI-2 on SR-003 (sent to the Solution Designer, resolved by SR-004/SR-005).

All paths are relative to the worktree `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control`, branch `codex/claude-anthropic-effort-control`.

## Current Implementation Summary

Every Claude model in the AutoByteus catalog now offers Anthropic effort. Rows with a thinking switch (Fable 5, Opus 5, Sonnet 5.5, Sonnet 5, Haiku 5.5) show one Thinking list, Off · Low · Medium · High · Xhigh · Max. Opus 5.5 and Fable 5.1, whose thinking cannot be turned off, show the effort levels only.

`AnthropicLLM` sends the chosen level as `output_config.effort`. It sends none while thinking is off and never sends `thinking.display`, so Anthropic's default `omitted` applies. From a run's stored config it reads only `thinking_enabled` and `reasoning_effort`, so a stale stored key such as `thinking_display` in real saved runs is inert. The Claude rows below generation 5 (Opus 4.8, Opus 4.7, Sonnet 4.6) are removed, together with the fixed-budget thinking code only they used. There is no thinking display setting anywhere.

IR-002 (this round) makes saved settings that hold such a key editable and launchable again, for every runtime. The server's model-settings check (`validateModelConfigSchema`, reached through `RunModelSelectionService`) now leaves top-level keys the selected model's schema does not declare out of the canonical config instead of refusing them, and a model without a schema canonicalizes any config to `null`. Declared keys are checked exactly as before. Every caller of the check saves or launches only the canonical selection it gets back. The two callers that used their raw input now use it too:
- **Org launch** builds the execution tree from each placement's validated config, from the plan resolved once (IG-1).
- **The launch-usability check** returns canonical launches for usable candidates and for the inherited (delegator's) launch, and the collaborator resolver launches those (IG-2).

No client code changes and no stored data is rewritten.

- Implementation cycle: `Rework`
- Implementation revision record: `tickets/in-progress/claude-anthropic-effort-control/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003` (superseded), `SR-004`, `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: CR-FO-001; DI-1, DI-2; AR-001, AR-002; IG-1, IG-2
- Implementation commits: IR-001 `574aa0bd7` (+ handoff `a2a5d0e47`); IR-002 `47f44c3df` (+ the handoff commit that adds this document, the revision record entry and evidence; no production code).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High` (raised by the design at SR-004; carried unchanged)
- Design classification section / evidence reference: design-spec.md "SR-004 Delta" / "SR-005 Delta" Classification; "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - IR-002 changes a documented shared validation contract used by every runtime's save, edit and launch admission (reject → omit), which is the reason for High. The delta matches the design: 5 server src files (validator, Org planner and service, launch-usability check, collaborator resolver), +81/−49 lines, no new file, API, route or persistence code. Planner contract change (`build` takes the resolved plan) has one caller, so escalation trigger (a′) did not fire.
  - IR-001: the production delta is in the 3 autobyteus-ts files and 4 web files the design maps, at +183/−322 lines.
  - IR-001 escalation triggers checked:
    - (a) Resuming a saved run whose stored config holds `thinking_display` works end to end (IMP-13 live, IMP-14 in the app); no server validation blocks it.
    - (b) No production caller relies on raw forwarding of Anthropic config keys (see Known Risks RISK-2 for the generic application `extra_params` container, unused in the repository).
    - (c) Every remaining model accepted its documented levels live (IMP-05, IMP-11).
    - (d) `AnthropicLLM` is constructed only from the catalog rows (`rg AnthropicLLM` over `src`).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High route; my self-review notes are below for the reviewer, not a substitute)
- New design impact or escalation trigger: `None` (this round's DI-1/DI-2 were raised and resolved by SR-004/SR-005 before implementation)

### Self-review notes (IR-002)

- Validator: undeclared top-level keys are filtered with `Object.hasOwn` (the old truthy lookup would also have matched inherited names such as `constructor`). `required` is still checked against the submitted config, so a config holding only undeclared keys still fails a required declared key. Nested objects still refuse undeclared nested keys (unchanged, residual risk in the review).
- Empty canonical config: the SR-005 examples table says "empty canonical config is `null` (as today)", but today the validator returned `{}` for `{}` (nothing normalized it). I implemented the table's rows: a config whose keys were all omitted becomes `null`. I left a submitted `{}` as `{}`, today's behavior, so stored `{}` configs compare `UNCHANGED` as before. Reviewer: please confirm this reading (unit test "canonicalizes {} ..." pins it).
- Caller inventory re-checked with `rg "\.validate\(|\.validateMany\(" autobyteus-server-ts/src`: callers 1–5, 8–10 already used `selection`; only #6 and #7 changed.
- IG-1: `AgentOrgRunPlanner.build({ definition, plan, applicationBinding })` builds from the plan `resolveConfiguration` returned. `validateCompleteConfiguration` returns the same placements (same keys) with each one's `llmModelIdentifier`/`llmConfig` replaced by its own validated selection, so follow-team inheritance (already resolved in the plan) is unchanged. Unit test: the Team's lead keeps the Team's canonical config, not the root's.
- IG-2: the resolver launches `verdicts.inherited.launch` (canonical) when the inherited check passed. When it failed, the raw delegator copy is kept but never launched: `finish` refuses with the same message, and `teamLevel` records it only as the Team's unused default, the same as before the change.
- Test fakes: 8 test fakes returned a constant `{ llmModelIdentifier: "m"/"gpt", llmConfig: null }` for every validated input. That was harmless while callers ignored `selection`, and wrong now. I made them echo the input, which is what the real validator returns when every key is declared. The root-communication baseline contract (recorded from `0216c6fb14`) matches again with them.
- Behavior changes in existing tests (direct consequences of DEC-011 B, not regressions; flagged for review):
  - `delegated-launch-config-defaults` e2e and its web probe: `badsettings` used "AGY model without a schema + `{ temperature }`" as invalid settings; that is now a usable default. Switched to Grok + `{ reasoning_effort: "ultra" }` (an invalid value of a declared key).
  - `stopped-run-model-config-graphql`, `stopped-org-workspace-graphql`: the "refused, nothing written" cases used `{ unsupported_setting: true }`; switched to an invalid declared value.
  - `delegated-copy-model-change` AC-006 ("settings the model does not have are refused") now refuses a non-object config; settings the model does not declare are left out.

### Self-review (IR-001, direct route at the time)

- Read the full production diff against base `9ad7540c2`. Request shaping in `anthropic-llm.ts` follows the design's bounded spine: resolve policy → read owned keys → per-call kwargs → strict rules → sanitize explicit (kwargs) thinking → thinking from switch → effort (if set and not off) → strip sampling.
- Ownership: effort vocabulary only in the policy file; the catalog imports it; no effort rule in the menu/Vue code (the web xhigh/max rule and independent-effort group from SR-001 are fully reverted).
- Dead code: removed `filterInternalExtraParams`, the internal-key sets, the `cloneSafeProviderRequestKwargs` import, `adaptiveThinking`'s display branch, the `legacy_budget` branches, `ANTHROPIC_THINKING_REQUIRED_EFFORT_LEVELS`, web budget handling, and the numeric thinking-parameter path in `chatThinkingMenu.ts`/`ChatThinkingControl.vue`. Numeric thinking parameters only existed for `thinking_budget_tokens`; no server or catalog schema declares a numeric thinking key (checked `claude-sdk-model-normalizer.ts`, `grok-build-launch-profile.ts`, `codex-app-server-model-normalizer.ts` and the autobyteus-ts catalogs).
- Edge checked: a per-call `output_config` (e.g. a future structured-output `format`) is merged, not replaced (unit test).
- Edge checked: a per-call `thinking` still goes through the existing sanitizer.
- Edge checked: `thinking_enabled` of a non-boolean type is treated as unset.
- Edge checked: Opus 5.5 with `thinking_enabled:false` still fails locally (adaptive required). Its schema has no switch, so normal use never sends it.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Opus 5.5: effort list (default Medium), no display row, no "Not available" | catalog `claudeEffortOnlySchema('medium')` → web per-parameter menu (unchanged code path) | Pass: AC-001/006 (IMP-01, IMP-06, IMP-12, IMP-14) |
| BEH-002 | Switch rows: one list Off · levels; Fable 5.1 effort list | catalog `claudeThinkingSwitchSchema(...)`; web `PROVIDER_KEYS.claude = [thinking_enabled, reasoning_effort]`, `DEPENDENT_KEYS.claude = [reasoning_effort]` → existing merged menu | Pass: AC-001/005 (IMP-01, web specs in IMP-03, IMP-12) |
| BEH-003 | Effort sent when configured and thinking not off; unset → none | `anthropic-llm.ts` `readOwnedConfig` + `applyEffort` (merge into `output_config`) | Pass: AC-002/003/008 (IMP-01, IMP-05, IMP-14) |
| BEH-004 | Off: off shape and no effort, whatever is stored; no local refusal | `applyAnthropicRequestParams`: effort only when `thinkingEnabled !== false` | Pass: AC-003/004 (IMP-01, IMP-11 live on all 5 switch rows, IMP-14 case 2 in the app) |
| BEH-005 | Gen-4 Claude rows removed; unknown model value fails locally | catalog rows deleted; policy exact lookup throws | Pass: AC-007 (IMP-01, IMP-06, grep audit below, model menu in IMP-14) |
| BEH-006 | Claude Agent SDK presentation unchanged | web merged menu unchanged for `thinking_enabled` + dependent effort | Pass: existing Claude SDK menu/adapter specs (IMP-03) |
| BEH-007 | No display setting or `thinking.display`; stored stale keys never sent; saved runs resume | catalog (no `thinking_display`), `ADAPTIVE_THINKING` constant, owned-key read in `anthropic-llm.ts` | Pass: AC-010/011 (IMP-01, IMP-06, IMP-07, IMP-13, IMP-14 case 3) |
| BEH-007 edit leg (DEC-011, AC-012) | A stopped agent / team / Org run whose stored config holds a key the model no longer declares can save settings (`UPDATED`), saved without the key; an Org workspace-only edit succeeds and leaves untouched stored configs as they were; invalid declared values still refused | DS-004: caller (stopped-run save) → `RunModelSelectionService.validate(Many)` → `validateModelConfigSchema` (omit undeclared) → stores `validation.selection` (callers #1, #2, #4 unchanged) | Pass: IMP-17 AC-012 (a)/(b), IMP-20, IMP-21 (fails without the change), IMP-18 (refusal of invalid declared values kept) |
| AC-013 (SR-005) | A launch whose saved config holds such a key launches without it: Org launch tree; delegated copy from a catalog default (default used, not skipped) | caller #6 `AgentOrgRunService.validateCompleteConfiguration` → canonical plan → `AgentOrgRunPlanner.build`; caller #7 `LaunchUsabilityCheck` canonical verdicts → `CollaboratorLaunchResolver` | Pass: IMP-17 AC-013 (a)/(b), IMP-20 (Org unit, usability unit), IMP-18 (delegated-launch suites), IMP-19 (web probe DLP-003) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

AC-007 grep audit (outside `tickets/`, `node_modules`, build outputs): `rg "thinking_display|thinking_budget_tokens|legacy_budget|claude-opus-4[-.]8|claude-opus-4[-.]7|claude-sonnet-4[-.]6|summaryWithEffort|getIndependentThinkingParamKeys|THINKING_REQUIRED"`. The only hits are tests that assert absence or rejection: the stored-key cases in the adapter unit test, the AC-011 resume test, the live stored-config case, the "removed rows" loops, and the policy "unknown value" test.

## Key Files Or Areas

- `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts`: rows and schemas (`claudeEffortParameter`, `claudeThinkingSwitchSchema`, `claudeEffortOnlySchema`).
- `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts`: `ANTHROPIC_EFFORT_LEVELS`; exact lookup.
- `autobyteus-ts/src/llm/api/anthropic-llm.ts`: owned-key read, effort mapping, no display, legacy removal.
- `autobyteus-web/utils/llmThinkingConfigAdapter.ts`, `components/chat/chatThinkingMenu.ts`, `components/chat/ChatThinkingControl.vue`, `utils/llmConfigSchema.ts`: claude keys, budget/display removal, numeric-parameter path removal.
- IR-002 server:
  - `autobyteus-server-ts/src/llm-management/services/model-config-schema-validation.ts`: the omit rule.
  - `src/agent-org-execution/services/agent-org-run-planner.ts`: `build` from the resolved plan.
  - `src/agent-org-execution/services/agent-org-run-service.ts`: the canonical plan.
  - `src/launch-preferences/launch-usability-check.ts`: canonical verdicts, `InheritedLaunchVerdict`.
  - `src/agent-collaboration/collaborators/collaborator-launch-resolver.ts`: launches the canonical inherited launch.
- IR-002 docs: `autobyteus-server-ts/docs/modules/run_history.md` (stopped-run save contract), `docs/modules/llm_management.md` (validation rule + caller rule), `autobyteus-web/docs/settings.md` (stale key left out on save).
- IR-002 tests:
  - New: `tests/e2e/runtime/autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts` (AC-012, AC-013) and `tests/unit/launch-preferences/launch-usability-check.test.ts`.
  - Updated: `run-model-selection-service.test.ts` (examples table, null schema) and `agent-org-run-service-model-selection.test.ts` (canonical tree).
  - The 4 e2e suites and 8 fakes listed in Self-review notes, plus `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`.
- Docs: `autobyteus-ts/docs/provider_model_catalogs.md` (effort, run config keys, no display), `llm_module_design.md`, `llm_module_design_nodejs.md`; `autobyteus-web/docs/chat.md`, `settings.md`.
- Tests:
  - autobyteus-ts unit: `anthropic-llm.test.ts`, `anthropic-llm-claude-5-5.test.ts`, `anthropic-model-request-policy.test.ts`, `supported-model-definitions.test.ts`, `model-metadata-resolver.test.ts`, `llm-phase-summary-output-limit.test.ts`, `nonstreaming-finish.test.ts`, `compaction-single-attempt-transport.test.ts`, `provider-native-request-payloads.test.ts`.
  - autobyteus-ts integration: `llm-factory-metadata-resolution.test.ts`, live `anthropic-llm.test.ts` (per-model effort, Off + stored max, stored display), `anthropic-llm-image.test.ts`, `claude-tool-call-handler-live.test.ts`.
  - Server: new `tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` (AC-011); updated `autobyteus-claude-5-5-live`, `autobyteus-anthropic-prompt-caching-live`, `autobyteus-compaction-cache-reuse-live` (gated live suites; no display config), token-usage e2e, pricing unit, Claude event converter fixture.
  - Web: the adapter, menu and control specs, `llmConfigSchema.spec`, `ModelConfigSection.spec`, `chatDraftStore.spec`.
  - `test-support/live-e2e/live-e2e-scenarios.mjs`: Anthropic scenarios on `claude-haiku-5-5`.

## Important Assumptions

- Off on a switch row now writes `{thinking_enabled:false}` and keeps the stored effort, which the backend ignores while off (design DS-002). The web adapter is the base merged-menu code, so no effort rewriting happens in the UI.
- Live checks spend credits only where SR-002 changed the request shape (design Change Sequence 6). The IMP-05 effort-on results come from the SR-001 round. Their request shapes are unchanged: those configs carried no display key, and effort-on is identical.

## Known Risks

- RISK-1 (accepted, DEC-010): no Claude thinking text is shown any more, including Sonnet 5.5's progress notes between tool calls.
- RISK-2 (non-blocking; for the designer's awareness): applications can declare an AutoByteus launch config with a generic `extra_params` container (`autobyteus-server-ts/src/application-platform/launch-configuration/application-portable-launch-config-schemas.ts` L71). For Anthropic models, any keys there other than `thinking_enabled`/`reasoning_effort` are now ignored instead of being forwarded raw. No application in this repository uses `extra_params`. Other providers are unchanged.
- RISK-3: the Claude Agent SDK runtime still sends `effort` with thinking disabled when Off is picked over a stored xhigh/max (FU-003, out of scope).
- RISK-4: Opus 5 and Fable 5 "Off" still sends no `thinking` field (FU-001).
- RISK-5 (accepted with DEC-011 B, review residual): a mistyped top-level key sent through the API is now silently left out instead of refused.
- RISK-6 (behavior change for review): a saved launch preference or selection with settings on a model that has no settings schema (e.g. AGY models) was refused before and is now usable with `null` settings (existing test cases adjusted, see Self-review notes).
- RISK-7 (review residual): undeclared nested keys inside a declared object setting are still refused.
- FU-004 (open): resuming a saved run / launching a new standalone run does not go through the check; non-Anthropic adapters still forward stored `extraParams` raw.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature + Cleanup.
- Reviewed root-cause classification: Missing Invariant (raw config passthrough) + missing capability.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (local: owned-key read in `applyAnthropicRequestParams`).
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: IMP-07 shows the AC-011 test catches a reintroduced passthrough.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the owned-key read is generic; it never names `thinking_display`).
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (see Self-review)
- Dead code found elsewhere, added to `follow-ups.md`: FU-002 (stale Gemini/Kimi names in autobyteus-ts LLM docs).
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`ChatThinkingParameter` narrowed to choices only).
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes` (the SR-001 → SR-002 change was routed as a Requirement Gap).
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (IR-001: largest `anthropic-llm.ts` 381 effective lines, base 375; IR-002: largest `collaborator-launch-resolver.ts` 305, was 301; all 5 IR-002 files under 310).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision".
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence:
  - IMP-13: server-level stop → stored `thinking_display` → restore → send, against the real Anthropic API, on Opus 5.5 and Sonnet 5.5.
  - IMP-14 case 3: the same through the app. The stored file still holds the key afterwards, so no data is rewritten.
  - IR-002, IMP-17:
    - stopped agent, team and Org edits of runs holding the key save successfully, and the saved scopes drop it;
    - an Org workspace-only edit leaves untouched scopes' stored configs exactly as they were (the key stays on disk, inert);
    - Org launch and delegated copies record no undeclared key.
- Migration implementation and focused checks: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- pnpm runs only through `corepack pnpm`. Package scripts that call `pnpm` internally (web `typecheck`, server `build`/`prebuild`) need a shim on PATH: `printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > <dir>/pnpm`.
- Web unit tests need `pnpm -C autobyteus-web exec nuxt prepare` once, and the application contracts package built (`corepack pnpm -C autobyteus-application-sdk-contracts build`). Without the build, 6 application spec files fail to import `@autobyteus/application-sdk-contracts`.
- Server Vitest resolves `autobyteus-ts` to its `src` (tsconfig paths). `dist/app.js` uses `autobyteus-ts/dist`: rebuild it (`corepack pnpm -C autobyteus-ts build`) before any probe on `dist/app.js`.
- Test vault: `AUTOBYTEUS_TEST_VAULT=/root/.autobyteus-test/vault` holds the Anthropic key. A server you start yourself on a temp data dir logs `Secret vault: test vault … (read-only)`.

## Checks Run

Evidence files are in `tickets/in-progress/claude-anthropic-effort-control/evidence/`. "Clean env" means `env -i PATH="$PATH" HOME=<temp> TMPDIR=…`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `corepack pnpm -C autobyteus-ts exec vitest run tests/unit/llm tests/unit/agent/loop/llm-phase-summary-output-limit.test.ts` | 574aa0bd7 | Linux, Node 22 | catalog, policy, `AnthropicLLM`, other LLM adapters' tests touching Anthropic fixtures | AC-001..004, AC-007, AC-008, AC-010, AC-011 (adapter) | Pass | `IMP-01-ts-llm-unit.log` | `Test Files  71 passed (71)` / `Tests  556 passed (556)` |
| IMP-02 | `corepack pnpm -C autobyteus-ts test` (clean env) | 574aa0bd7 | Linux, Node 22, uid 0 | whole autobyteus-ts | regression | Pass for this change (3 pre-existing env failures) | `IMP-02-ts-full-suite-excerpt.log` | `Tests  3 failed \| 2323 passed`; failures only in `tools/terminal` (root uid, missing node-pty `spawn-helper`), no diff there |
| IMP-03 | `corepack pnpm -C autobyteus-web test:nuxt --run` | 574aa0bd7 | Linux, Node 22 | whole web unit suite incl. thinking adapter/menu/control, ModelConfigSection, chatDraftStore | AC-005, AC-006, BEH-006 | Pass (1 unrelated intermittent teardown error) | `IMP-03-web-full-suite-excerpt.log` | `Test Files  668 passed (668)`, `Tests  4857 passed`; `Errors 1` from `AgentRunTaskRowsLeave.spec.ts` (1 in 4 isolated reruns, not in base-reverted run) |
| IMP-04 | `autobyteus-ts build`; `autobyteus-server-ts typecheck`; `autobyteus-web typecheck`; web guards | 574aa0bd7 | Linux, Node 22 | builds/types of all changed packages | — | Pass | `IMP-04-typecheck-guards.log` | `[typecheck] PASS`, `production errors: 0`; three guards `Passed` |
| IMP-05 | live: `vitest run tests/integration/llm/api/anthropic-llm.test.ts -t 'effort per catalog model'` with test vault, `RUN_LIVE_PROVIDER_TESTS=1`, `AUTOBYTEUS_LIVE_STRICT=1` | SR-001 round (effort-on shapes unchanged in SR-002) | Linux, Node 22, real Anthropic | effort-on request on all 7 models | AC-002, AC-009 | Pass | `IMP-05-live-effort-per-model.log` | 7 `max`-with-thinking-on cases `✓` (the 5 SR-001 thinking-off/high cases are superseded by IMP-11) |
| IMP-06 | clean env: server `vitest run` pricing unit, Claude converter unit, 2 token-usage e2e, AC-011 resume (synthetic); autobyteus-ts `llm-factory-metadata-resolution` integration | 574aa0bd7 code; resume + pricing + converter rerun on 47f44c3df | Linux, Node 22 | server catalog consumers; restore path with stale stored key | AC-001, AC-007, AC-010, AC-011 | Pass | `IMP-06-server-targeted-tests.log` | `Tests  61 passed (61)`; `Tests  4 passed (4)`; rerun `Tests  58 passed (58)` (resume incl. API/E2E team + Org cases) |
| IMP-07 | Mutation: reinsert raw config forwarding in `anthropic-llm.ts` src, run AC-011 resume test, restore | 574aa0bd7 + temp line | Linux, Node 22 | AC-011 test sensitivity | AC-011 | Pass (test fails with the defect) | `IMP-07-ac011-tests-catch-the-defect.txt` | `expected { model: 'claude-opus-5-5', …(9) } to not have property "thinking_display"` |
| IMP-08 | Failing-first: updated adapter unit test against SR-001 `src` | 781823e77 src | Linux, Node 22 | adapter tests vs. old behavior | AC-003, AC-004, AC-010, AC-011 | Pass (10 fail on old src, 40/40 on new) | `IMP-08-adapter-tests-fail-on-sr001-src.txt` | `Tests  10 failed \| 30 passed (40)` |
| IMP-11 | live with test vault, strict: `-t 'thinking off\|stored config.*claude-(opus-5-5\|sonnet-5-5)$'` | 574aa0bd7 code | Linux, Node 22, real Anthropic | Off + stored `max` on all 5 switch rows; stored `thinking_display` on Opus 5.5 / Sonnet 5.5 | AC-003, AC-004, AC-009, AC-011 | Pass | `IMP-11-live-off-and-stored-config.log` | `Tests  7 passed \| 17 skipped (24)` |
| IMP-12 | Rendered check, no keys: real backend `dist/app.js` + Nuxt dev, headless Chrome; menus on Fable 5, Sonnet 5.5, Opus 5.5; run settings card | 574aa0bd7 | Linux, Node 22, Chrome | composer thinking menu, run settings Thinking row | AC-005, AC-006, REQ-010 | Pass | `IMP-12-rendered-one-list-menus.txt`, `IMP-12-*.png` | `Off ✓ \| Low \| Medium \| High \| Xhigh \| Max`; Opus 5.5 `Medium ✓`; "Thinking display" absent |
| IMP-13 | live with test vault: `RUN_ANTHROPIC_STORED_CONFIG_LIVE=1 AUTOBYTEUS_LIVE_STRICT=1 … vitest run tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` | 574aa0bd7 code + test live mode | Linux, Node 22, real Anthropic | create → send → stop → stored `thinking_display` → restore → send | AC-011 | Pass | `IMP-13-live-stored-config-resume.log` | `Tests  2 passed (2)` (asserts HTTP 200 and no stale key in the post-restore body) |
| IMP-14 | App with real replies: backend with `AUTOBYTEUS_TEST_VAULT` + Nuxt dev; 3 cases via the composer | 574aa0bd7 | Linux, Node 22, Chrome, real Anthropic | full user path: menu → server → `AnthropicLLM` → Anthropic | AC-002, AC-004, AC-006, AC-011 | Pass | `IMP-14-app-live-test-vault.txt`, `IMP-14-*.png` | replies `PINEAPPLE`, `MANGO` (stored `{"thinking_enabled": false, "reasoning_effort": "max"}`), `KIWI` after restore with stored `thinking_display` |
| IMP-15 | `corepack pnpm -C autobyteus-server-ts test:unit` | 47f44c3df tree | Linux, Node 22, uid 0 | whole server unit suite | regression | Pass for this change (failures pre-existing / environmental) | `IMP-15-server-unit-suite-excerpt.log` | `Tests  13 failed \| 7281 passed`; the one caused by this change (`remote-delegation-receiver` constant fake) fixed; every remaining one also fails with the 5 src files reverted (uid 0 permission tests, Socratic `No such built-in module: node:`, 5000 ms timeouts, intermittent ACP) |
| IMP-16 | `corepack pnpm -C autobyteus-server-ts typecheck` | 47f44c3df tree | Linux, Node 22 | server production types | — | Pass | `IMP-16-server-typecheck.log` | `exit 0` |
| IMP-17 | clean env: `vitest run tests/e2e/runtime/autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts` (synthetic vault, stubbed Anthropic) | 47f44c3df tree | Linux, Node 22, in-process server | stopped-run saves (agent, team, Org model + workspace), Org launch, delegated copy from a catalog default (scripted `delegate_task`) | AC-012 (a)/(b), AC-013 (a)/(b) | Pass | `IMP-17-e2e-stored-config-edit-launch.log` | `Tests  5 passed (5)` |
| IMP-18 | clean env: `stopped-run-model-config-graphql`, `stopped-org-workspace-graphql`; with `RUN_AGY_FAILURE_E2E=1` + AGY fixture: `delegated-copy-model-change`, `delegated-launch-config-defaults` | 47f44c3df tree | Linux, Node 22, scripted AGY / fake Grok | existing save/edit/launch suites under the new contract | AC-012, AC-013, preserved refusals | Pass | `IMP-18-e2e-updated-existing-suites.log` | `Tests  3 passed (3)`, `6 passed (6)`, `3 passed (3)` |
| IMP-19 | `corepack pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --cases DLP-003` (server `dist` rebuilt from 47f44c3df src, Nuxt dev, Chromium, AGY fixture) | 47f44c3df tree | Linux, Node 22, Chromium | launch notes in the UI from caller #7 | AC-013 (b) (UI notes) | Pass | `IMP-19-web-probe-dlp003.log`, `IMP-19-dlp003-squad-notes.png` | `DLP-003 Pass`, `Summary: 1 Pass, 0 Fail` |
| IMP-20 | `vitest run tests/unit/{llm-management,agent-collaboration,agent-org-execution,launch-preferences,model-routing,standalone-agent-run-root,agent-team-execution,remote-collaboration}` | 47f44c3df | Linux, Node 22 | validator, Org launch, usability, resolver, roots | AC-012, AC-013, IG-1, IG-2 | Pass | `IMP-20-server-unit-touched-areas.log` | `Test Files  151 passed (151)`, `Tests  1210 passed (1210)` |
| IMP-21 | Failing-first: IMP-17 + new/updated unit tests with the 5 changed src files stashed (574aa0bd7 state) | 574aa0bd7 src + IR-002 tests | Linux, Node 22 | test sensitivity | AC-012, AC-013 | Pass (tests fail without the change) | `IMP-21-new-tests-fail-on-sr002-src.log` | `Tests  14 failed \| 28 passed (42)`, all 5 e2e cases `×` |

- Not run, and why:
  - IR-002 changed only server code. IMP-01..IMP-05 and IMP-07..IMP-14 exercise autobyteus-ts, web or the restore path, and stay valid. Restore doesn't go through the check; the resume e2e was rerun anyway (IMP-06).
  - API-04/API-06 browser reruns and the Org edit path in the app: left to API/E2E as the design's downstream reruns. IMP-17 covers the same server paths.
  - Server `test:integration` not run (unchanged areas; requires `test:integration:prepare`).
  - Gated live server suites updated only for the removed display config (`autobyteus-claude-5-5-live`, `autobyteus-anthropic-prompt-caching-live`, `autobyteus-compaction-cache-reuse-live`). They are long and costly; their gates skip them by default (verified they load and skip). Rerunning them is left to API/E2E if wanted.
  - `test-support/live-e2e` scenarios: only the model name changed; not run.
  - Electron/desktop: not affected (web-only change); not run.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: composer thinking menu; run settings / Agent Configuration Thinking row; Advanced form effort select (ModelConfigSection).
- Approved UI/UX, interaction, requirement, or design references: requirements REQ-004/006/010, AC-005/006 (SR-002); design DS-002.
- Existing design system, shared components, and adjacent product surfaces reviewed: `ChatThinkingControl` and the existing merged-menu presentation, which the Claude Agent SDK and DeepSeek-style switches already use; no new component.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md browser-probe setup (real backend `dist/app.js` + Nuxt dev on an owned temp data root), driven with headless Chrome.
- States, layouts, viewports, and interactions inspected:
  - Fable 5 and Sonnet 5.5: Off default, pick High, pick Off.
  - Opus 5.5: default Medium, pick Max.
  - Run settings of a running Opus 5.5 run.
  - 1510×777 viewport.
  - In IMP-14, real replies after each pick.
- Visual or interaction issues found and corrected:
  - SR-001 round: the 3-group menu scrolled at the 240px popover height. That height increase was then dropped with the SR-002 revert.
  - SR-002: the one-list menu is 222px tall with no scrolling, which matches the existing Claude SDK list.
- Check IDs with the supporting evidence, and remaining unverified states or limitations:
  - IMP-12, IMP-14.
  - The narrow-width bottom sheet is not rechecked; it is unchanged shared code covered by `ChatThinkingControl.spec` placement tests.

## Downstream Coverage Hints / Suggested Scenarios

- IR-002 (design's downstream reruns):
  - API-04: stopped agent and team edits of runs holding `thinking_display`, now expected `UPDATED` and saved without it.
  - API-06: the browser stopped-run Edit Config Save on old agent and team runs.
  - The Org stopped-run edit path in the app: model edit and workspace-only edit of an Org whose stored configs hold the key.
- IR-002 regression checks: an invalid value of a declared setting is still refused with its field error (all three save paths), and a saved launch preference with an invalid declared value is still skipped with its note.

- Every switch row with thinking Off over a stored `xhigh`/`max`: accepted, request has the off shape and no `output_config`. IMP-11 covers it live at the adapter level; IMP-14 covers Sonnet 5.5 in the app.
- A saved run and a saved team run from before this change, with `thinking_display` (and optionally `thinking_budget_tokens`) in the stored config: restore, send, and the edit surfaces drop the stale key on save. IMP-13 covers single runs; team runs are not covered (user data SRC-019 has a team run holding it).
- A saved definition or run naming `claude-opus-4.8`, `claude-opus-4.7` or `claude-sonnet-4.6`: shows the existing unavailable-model state, not a crash (AC-007 alternate).
- Agent Configuration / Advanced form on a switch row: an effort select while Off turns thinking on (AC-005, form path).
- Claude Agent SDK runtime menus unchanged (BEH-006).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- After code review: rerun API-04, API-06 and the Org edit path (AC-012) and validate AC-013 at API/E2E level.

- Independent API/E2E validation of AC-001..AC-011 per the requirements, especially:
  - AC-011 for team runs and Org runs;
  - AC-007's unavailable-model state;
  - AC-005/006 on the Agent Configuration surface (definition editing), which this round did not render.
- Decide whether to rerun the gated live server suites listed under "Not run".
