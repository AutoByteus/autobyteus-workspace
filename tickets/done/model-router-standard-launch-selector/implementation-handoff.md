# Implementation Handoff — model-router-standard-launch-selector (autobyteus-313)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector`, branch
`codex/model-router-standard-launch-selector`, base `origin/personal` `1c54ffec6a`.

**Task Done-when (carried):** "The Configuration tab uses the standard selector; the router starts with the stored launch
configuration, including the thinking level; the names match the rest of the app on all four tabs; covered by tests;
merged to personal." Constraints: the user's router configuration must not be lost (DESIGN.md rule 10); prove from a
clean clone; no release unless asked.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Architecture Design Complete`, Medium/Low → direct
  implementation (no independent architecture review), from the Solution Designer (`handoff-implementation.md`).
- Requirements doc: `tickets/in-progress/model-router-standard-launch-selector/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `tickets/in-progress/model-router-standard-launch-selector/investigation-notes.md` (B-01…B-15)
- Solution revision record: `tickets/in-progress/model-router-standard-launch-selector/solution-revision-record.md`
- Design spec: `tickets/in-progress/model-router-standard-launch-selector/design-spec.md` (SR-001)
- Supplemental task artifacts: the autobyteus-32 Product UI/UX specification (normative for everything this ticket does
  not change); `follow-ups.md` (FU-001; FU-002 added here).
- Design review report / architecture review revision record: `N/A — not applicable` (independent architecture review
  not selected).
- Triggering rework report: N/A (initial implementation).

The ticket's design documents are the Solution Designer's and stay uncommitted; I committed only my own files in the
ticket folder (this handoff, the revision record, `evidence/implementation/`).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/model-router-standard-launch-selector/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A

Commits: `09f99eed32` (code, tests, docs, design Case 13, probes), `f9c58612e5` (fixes the rendered check found: the
page with no router launch yet, the menu's runtime name with no runtime, the control group's width) and `1357063994`
(the decisions probe expects the model menu's names).

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 7 server source files and 15 web files plus tests; the shared launch controls were reused (no
  prop added; one general fix in `ChatModelMenu`: with no runtime it names none, Assumption 7); the validator was usable without a run or team context (a context built from the router's
  workspace); one additive setting; the router-run reuse rule widened by the settings. No escalation trigger was hit.
- Selected route: per `get_handoff_rules` (the Medium/Low direct route goes to API/E2E without Code Reviewer; the team
  instruction notes code review still applies where the route selects it).
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001) | Configuration chooses the router's launch with the app's model menu, thinking control and model-option controls; no native select; usable only while on | `components/settings/model-routing/ModelRoutingSetup.vue` (the three chat components, `placement="auto"`, `align="left"`, inside an `inert`/`aria-disabled` group while off or saving) → `modelRouterLaunchControls.ts` → `choose-launch` → `ModelRoutingManager.vue` `setModelRouterLaunch` | Done. The shared components are unchanged. |
| BEH-002 (REQ-002, 003, 005; AC-002, 003, 005) | Stored launch = runtime, model, `llmConfig`; a model choice makes its settings explicit; a save is checked like any agent launch; the router run starts with the settings and is reused only when all three are equal; beta.11 data works unchanged | Server: `model-routing/model-routing-settings.ts` (`MODEL_ROUTER_LLM_CONFIG_SETTING_KEY`, `readModelRouterLaunch`, `normalizeModelRouterLlmConfigForPersistence`, `ModelRoutingSettings.setRouterLaunch` → `RunModelSelectionService.validate` → three keys), `services/server-settings-service.ts` (registered key), `compositions/model-routing-composition.ts` + `build-studio-server.ts` (validator, router workspace), `api/graphql/types/model-routing.ts` (`llmConfig: JSON`), `model-routing/services/model-router-agent.ts` (`createAgentRun({… llmConfig})`, state with `llmConfig`, `madeWith`: structural equality, `null` ≠ `{}`); web: `modelRouterLaunchControls.ts` (`explicitChatModelConfig` on a model choice, as `chatDraftStore.setModel`) | Done. A save stores the settings as the check normalized them; `{}`/none store an empty value. |
| BEH-003 (REQ-004; AC-004) | The app's names on Configuration, Decisions, Overview, Runtimes and the problem line (en, zh-CN) | `modelRoutingNames.ts` (runtime → `runtimeKindToLabel`; model with runtime → catalog `modelLabel` + `runtimeShortLabel`; Runtimes: catalog label else the report's name), used by `ModelRoutingDecisions.vue`, `ModelRoutingOverview.vue`, `ModelRoutingStatusStrip.vue`, `AvailableAgentRuntimeRow.vue`, `AvailableModelList.vue`; `modelRoutingPresentation.ts` (`RUNTIME_NAMES`/`runtimeName` removed; `routerProblem` takes the catalog's label) | Done. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/`): `src/model-routing/model-routing-settings.ts`, `src/model-routing/services/model-router-agent.ts`,
`src/services/server-settings-service.ts`, `src/compositions/model-routing-composition.ts`, `src/compositions/build-studio-server.ts`
(one argument), `src/api/graphql/types/model-routing.ts`; tests `tests/unit/model-routing/model-routing-settings.test.ts` (new),
`model-router-agent.test.ts`; `docs/modules/model_routing.md`.

Web (`autobyteus-web/`): `components/settings/model-routing/` (`ModelRoutingSetup.vue`, `modelRouterLaunchControls.ts` new,
`modelRoutingNames.ts` new, `modelRoutingPresentation.ts`, `ModelRoutingManager.vue`, `ModelRoutingDecisions.vue`,
`ModelRoutingOverview.vue`, `ModelRoutingStatusStrip.vue`, `AvailableAgentRuntimeRow.vue`, `AvailableModelList.vue`),
`components/chat/ChatModelMenu.vue` (no runtime → no runtime name), `types/modelRouting.ts`, `graphql/mutations/modelRoutingMutations.ts`, `generated/graphql.ts` (the mutation's args,
variables and document), `localization/messages/{en,zh-CN}/modelRoutingSettings.ts`, specs in `__tests__/`,
`tests/e2e/model-routing-{settings,decisions}-probe.mjs`, `docs/settings.md`. Repository: `docs/design-cases.md` Case 13.

## Important Assumptions

1. **The validator's context** is the router's own workspace (`ModelRouterAgent.workspacePath()`), passed to
   `ModelRoutingSettings` as a function; `currentModelIdentifier` is the chosen model (a fresh launch, so no
   replacement rule applies). On AutoByteus this skips the capacity comparison, which only applies to replacing a
   run's current model.
2. **What is stored** is the settings as the check normalized them (`result.selection.llmConfig`); none or `{}` is
   written as an empty value, so the reader returns `null`. The run's state records exactly the launch read back, so the
   reuse comparison is between like values.
3. **The disabled state** is a wrapper (`inert` + `aria-disabled` + dimmed) rather than a new prop on the three shared
   components: the design allowed a general prop only if needed, and `inert` blocks pointer, keyboard and focus.
4. **The runtime report is no longer read by the Manager** for Configuration (the shared menu lists runtimes and models
   from the app's catalog). DEC-004: a blocked router model is still reported by the problem line.
5. **The problem line's blocked texts** were reordered to the menu's "<model> <runtime>" order ("GPT Sol Codex is
   blocked until …"), en and zh-CN; no new texts. Removed keys only the old selects used: `setup.router.runtime`,
   `chooseRuntime`, `chooseModel`, `blockedUntil`, `blocked`.
6. **Runtimes tab models** use the catalog's label when the app's catalog has that model, else the report's name
   (`findModel`), so a provider model the catalog does not list keeps its readable name.
7. **`ChatModelMenu` with no runtime** (the router before it is set) showed "Choose a model AutoByteus", because
   `runtimeKindToLabel('')` falls back to the default runtime. With no runtime the menu now names none (trigger, title,
   aria-label). The composer and run Settings always pass a runtime, so they are unchanged (spec added).

## Known Risks

- RSK-001 (design): any thinking or option change starts a new router run; its conversation starts over, `knowledge.md`
  stays.
- RSK-002 (design): until a runtime's catalog loads, its models read as their IDs (as in the menu).
- Opening Configuration, Decisions, Overview or Runtimes loads the catalogs of the runtimes shown (as the composer
  does on open).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix` / alignment
- Reviewed root-cause classification: `Duplicated Policy`
- Reviewed refactor decision: `Refactor Needed Now` (small): the page's selects and name map deleted
- Implementation matched the reviewed assessment: `Yes` (`explicitChatModelConfig` was already shared in
  `utils/runSettings/explicitModelConfig.ts`, so nothing had to move)
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the old two-argument mutation is not kept; `llmConfig` is an
  optional argument of the one mutation, so callers that set no settings keep working)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (`RUNTIME_NAMES`/`runtimeName`, the selects, the Manager's
  report read, the five message keys only they used)
- Dead code found elsewhere, added to `follow-ups.md`: FU-002 (Settings → Agent Runtimes' own runtime name map);
  FU-003 (the development launcher passes the caller's `AUTOBYTEUS_*` environment) is a tooling follow-up
- Shared structures remain tight: `Yes` (`ModelRouterLaunch` is the launch-configuration shape)
- Changed source implementation files within size guardrails: `Yes` (`server-settings-service.ts` 441 non-empty lines,
  the largest touched)

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration` (new key; optional `llmConfig` in `model-router-agent.json`)
- Follows the decision: `Yes`
- Direct-use evidence: `readModelRouterLaunch(runtime, model, undefined)` → `llmConfig: null`; a beta.11-shaped
  `model-router-agent.json` without `llmConfig` is reused while the router has no settings (unit tests; AC-005).
- Migration implementation: N/A. Deviation: `None`.

## Lightweight Implementation Self-Review (direct route)

- Scope: only the four tabs, the stored router launch and the router run; workspace/approval controls not offered.
- Ownership: `ModelRoutingSettings` alone writes the launch (now checked); `ModelRouterAgent` alone creates the run; the
  page adapts the status to the shared controls and owns no launch logic.
- Failure paths: a refused save keeps the saved launch and shows the server's message (spec); unreadable stored
  settings count as none with one warning (spec).
- Naming: one name per concept on the page; the remaining name map elsewhere is FU-002.

## Environment Or Dependency Notes

- A fresh worktree needs `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-ts build`, the server `prebuild`, and
  `npx nuxt prepare` in `autobyteus-web` before the checks below.
- **The development stack inherits the caller's `AUTOBYTEUS_*` environment** (FU-003). An agent running inside
  AutoByteus carries the user's live settings (here `AUTOBYTEUS_MODEL_ROUTER_RUNTIME/MODEL`, package and skill roots,
  `AUTOBYTEUS_DATA_DIR`, an API key); the first `pnpm dev` showed the user's router launch on a fresh data root. The
  data, database, memory and logs were the worktree's own (`DEV_DATA_ROOT` in the log) and no setting was written; the
  stack was stopped and restarted with every `AUTOBYTEUS_*` variable removed, and IMP-04/05 ran on that stack. Testers
  and API/E2E should start dev stacks the same way until FU-003 is fixed.

## Checks Run

Evidence: `tickets/in-progress/model-router-standard-launch-selector/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck && pnpm -C autobyteus-server-ts test:unit` | `09f99eed32` (the server is unchanged after it) | macOS 26.5.2, node v22.23.1 | all server source and unit suites | REQ-002, 003, 005; AC-002, 003, 005 | Pass for this branch; 3 failures that are not | `IMP-01-server-typecheck-unit.log` | `typecheck exit=0`; `Test Files  2 failed \| 859 passed`; the two failing files are `secret-management/live-e2e-compaction-*` ("Native command host scope is required"), FU-010 of autobyteus-32 (fail on the base; the triage line at the end) |
| IMP-02 | `(autobyteus-web) NUXT_TEST=true npx vitest run components/settings components/chat components/run-settings utils localization stores`; the three guards | `09f99eed32` | same | the page, chat controls, run Settings, stores, copy | REQ-001, 004 | Pass for this branch (superseded by IMP-06) | `IMP-02-web-specs-guards.log` | `Test Files  1 failed \| 278 passed (279)`: `definitionMutationCache.spec.ts` (FU-006, a base failure) |
| IMP-03 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/model-routing/model-routing-delegation.e2e.test.ts` | server of `09f99eed32` | scripted Antigravity CLI, disposable HOME | routing end to end with the checked router launch | REQ-002 (no regression of autobyteus-32 MR-01…MR-09) | Pass | `IMP-03-model-routing-e2e.log` | `✓ tests/e2e/model-routing/model-routing-delegation.e2e.test.ts (9 tests)` |
| IMP-04 | `BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:8000/graphql pnpm -C autobyteus-web codegen` against the dev server, then `git diff generated/graphql.ts` | `09f99eed32` | dev stack | the hand-edited generated mutation types | — | Pass (matches) | `IMP-04-codegen-check.log` | only 3 scalar description comments differ; the mutation's args, variables and document match |
| IMP-05 | Dev stack (`pnpm dev` with every `AUTOBYTEUS_*` variable removed, fresh worktree data root, synthesized decision records) + `IMP-05-render-script.mjs` / `IMP-05-shot-script.mjs` in headless Chromium | `f9c58612e5` (fixes found here are in it) | same | Configuration with the real launch controls and the server; names on all tabs; zh-CN; 390 px | AC-001, AC-002, AC-004; REQ-005 (reload) | Pass | `IMP-05-rendered/` (`IMP-05-rendered-checks.json`, `IMP-05-*.png`, `IMP-05-dev-stack.log`) | 12 cases `ok: true`, `"failures": []`, `browserErrors: []`; `model-chosen`: `routerLaunch {"runtimeKind":"claude_agent_sdk","llmModelIdentifier":"opus","llmConfig":{"thinking_enabled":false,"reasoning_effort":"medium"}}`; `thinking-saved` |
| IMP-06 | as IMP-02 | `f9c58612e5` | same | as IMP-02 plus the `ChatModelMenu` no-runtime spec | REQ-001, 004 | Pass for this branch | `IMP-06-web-specs-guards.log` | `Test Files  1 failed \| 278 passed (279)` (FU-006); three guards `exit=0` |
| IMP-07 | `(autobyteus-web) node tests/e2e/model-routing-settings-probe.mjs --skip-server-build --output-dir=<fresh>` | `f9c58612e5` | two disposable nodes, scripted CLIs, no network | the Runtimes tab with the app's names | AC-004 (Runtimes) | Pass | `IMP-07-settings-probe/` | `Result: Pass`; `Pass MRP-01`…`MRP-07` (MRP-01 asserts each runtime heading equals the app's name) |
| IMP-08 | `(autobyteus-web) node tests/e2e/model-routing-decisions-probe.mjs --output-dir=<fresh>` | `1357063994` | two disposable nodes, scripted Antigravity CLI router, no network | Configuration (model menu), Decisions, Overview, run Settings rows, zh-CN with real routed data | AC-001, AC-004 | Pass | `IMP-08-decisions-probe/` | 8 cases `Pass` (MRD-01: `"launch": "Gemini test Antigravity", "nativeSelects": 0`); cleanup `tempRoot: removed`, `browserErrors: []`; the first run's MRD-02 failure (expected an ID, got the catalog label) is noted in the summary |

- Not run, and why: live routing with a real router and a thinking level (needs test-vault keys; API/E2E); the full
  server integration suite (unrelated prerequisites); the desktop app (the user).

## Frontend Rendered-Result Check

- Affected surfaces: Settings → Model Routing: Configuration (the router's launch), and the names on Decisions,
  Overview, Runtimes and the problem line.
- References: requirements AC-001…AC-004; the autobyteus-32 UI/UX specification (§ Visual Language permits the
  product's model menu); the composer (`ChatNewSurface.vue`) and run Settings (`RunSettingsCard.vue`) as the existing
  surfaces using the same controls.
- Surface: the development stack (README "Local full-stack development") on a fresh worktree data root, with every
  `AUTOBYTEUS_*` variable removed from the launcher's environment (see Environment); headless Chromium at 1440×900 and
  390×844; the composer's model menu opened on New chat for comparison.
- States inspected: off (controls inert, "Choose a model"); on and not set (problem line, menu opens with the same five
  runtimes as the composer, AutoByteus with its model count; Claude Agent SDK's submenu with search and descriptions);
  a model chosen (the server stores runtime, model and the model's settings made explicit); thinking changed (stored
  settings change, model kept); reload (the stored launch shows again); Decisions, Overview and Runtimes with the app's
  names; zh-CN; 390 px without overflow.
- Issues found and corrected (commit `f9c58612e5`): the page failed with "runtimeKind is required" before the router was
  set (the catalog was read with no runtime); the menu said "Choose a model AutoByteus" with no runtime; the control
  group stretched across the section. The earlier spec mock let the first pass; it now throws like the store.
- Not verified rendered: a model option control (Codex Fast mode) on the dev node (the chosen Claude model has none;
  covered by the page spec); "Talk to the router" with a real router run (would start a real runtime session).

## Downstream Coverage Hints / Suggested Scenarios

- AC-002/AC-003 live: set the router to Claude Agent SDK / claude-sonnet-5-5 with thinking High on Configuration;
  route a delegation; the router run's config carries the thinking level; change only the thinking level; the next
  routing starts a new run with it; `knowledge.md` unchanged; with no change the same run is reused.
- AC-005: start the new server on data written by v1.5.9-beta.11 (runtime + model set, router run recorded): status,
  Configuration and routing work and the run is reused.
- An invalid settings value saved through GraphQL is refused with the check's message.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- One live routing on one runtime with a thinking level set (keys only from the test vault).
- The desktop check is the user's; "prove from a clean clone" belongs to delivery.
