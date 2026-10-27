# Design Spec — Model Router: standard launch selector (autobyteus-313)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001 (Approved within the Task's direction; user informed 2026-10-27)
- Design status: `Ready`
- Investigation notes: `investigation-notes.md` (B-01…B-15)
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rules 7, 9, 10), `GLOSSARY.md`, `docs/design-cases.md` (incl. Case 11 of autobyteus-32), the autobyteus-32 design (archived, `tickets/done/delegated-runtime-model-routing/design-spec.md`) and its UI/UX specification.
- Project design-principle conflicts: none.

## Current-State Read

The Model Routing page's Configuration builds its own runtime/model choice from the autobyteus-303 report with native selects (B-01) and a private name map (B-11); the server stores runtime and model only (B-04) and starts the router on the model's defaults (B-05). The app's launch controls (`ChatModelMenu`, `ChatThinkingControl`, `ChatModelOptionControl`) are already reused by the composer and run Settings, prop-driven, over `useChatModelCatalog` (B-02, B-03). Every launch is validated by `RunModelSelectionService` (B-07).

## Intended Change

Configuration drives the router's launch with the app's launch controls and saves runtime, model and model settings; the server validates the launch like any agent launch, stores the settings in one added key, and starts (or re-creates) the router's run with them. The page drops its own runtime-name map and uses the app's name functions on every tab.

## Change Scope

- Server (`autobyteus-server-ts`):
  - `src/model-routing/model-routing-settings.ts` — `MODEL_ROUTER_LLM_CONFIG_SETTING_KEY = "AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG"` (JSON object; empty/absent = no settings); `ModelRouterLaunch = {runtimeKind, llmModelIdentifier, llmConfig: Record<string, unknown> | null}`; `readModelRouterLaunch` reads the third key (unparsable JSON or a non-object → `null` settings with one logged warning, DESIGN.md rule 7); `ModelRoutingSettings.setRouterLaunch(launch)` validates first through the `RunModelSelectionService` port (`validate({runtimeKind, selection: {llmModelIdentifier, llmConfig}})`; any non-valid result → refused with its message), then writes the three keys.
  - `src/services/server-settings-service.ts` — register the new key beside the other two (same visibility and handling).
  - `src/api/graphql/types/model-routing.ts` — `setModelRouterLaunch(runtimeKind, llmModelIdentifier, llmConfig: JSON | null)` (clean cut, DESIGN.md rule 9); status JSON's `routerLaunch` carries `llmConfig`.
  - `src/model-routing/services/model-router-agent.ts` — `createAgentRun({…, llmConfig: launch.llmConfig})`; `model-router-agent.json` adds `llmConfig` (a state without it reads as `null`, B-05; REQ-005); reuse only when runtime, model and settings are equal (structural equality of the two settings objects, `null` = `{}` is **not** assumed: `null` equals only `null`).
  - `src/model-routing/services/model-router.ts` — passes the full launch; the status check is unchanged (settings validity is checked on save).
- Web (`autobyteus-web`):
  - `components/settings/model-routing/ModelRoutingSetup.vue` — replace the two selects with `ChatModelMenu` (`placement="auto"`, `align="left"`), `ChatThinkingControl` and one `ChatModelOptionControl` per `buildModelOptions(schema, llmConfig)`, disabled while Model Routing is off or saving (wrap with the existing disabled styling). A new composable `components/settings/model-routing/modelRouterLaunchControls.ts` mirrors `components/chat/chatDraftModelControls.ts` over the status's `routerLaunch` (runtimeKind, model, `llmConfig`, `modelLabel`, `thinkingSchema`); a model choice emits `{runtimeKind, llmModelIdentifier, llmConfig: explicitChatModelConfig(schemaFor(...), current)}` exactly as `chatDraftStore.setModel` does; thinking/option updates emit the same launch with the new `llmConfig`. Reuse, do not copy, `explicitChatModelConfig`: if it is private to `chatDraftStore`, move it to `utils/` and import it from both.
  - `components/settings/model-routing/ModelRoutingManager.vue`, GraphQL document and `generated/graphql.ts`, `types/modelRouting.ts` — the launch with `llmConfig`.
  - `components/settings/model-routing/modelRoutingPresentation.ts` — remove `RUNTIME_NAMES`/`runtimeName`; runtime alone → `runtimeKindToLabel` (`types/agent/AgentRunConfig.ts`); model with runtime → the model menu's label: `useChatModelCatalog().modelLabel(runtime, model)` and `runtimeShortLabel(runtime)` (`utils/chat/chatDefaults.ts`), the same pair the menu trigger shows (`ChatModelMenu.vue:13-18`). Decisions, Overview (legend, rows, details), the problem line and Configuration use these.
  - Runtimes tab (`AvailableAgentRuntimeRow.vue`, `AvailableModelList.vue`) — runtime heading `runtimeKindToLabel(entry.runtime)`; model rows the catalog label for `(entry.runtime, model.id)` with the report's name only when the catalog has no entry.
  - i18n: no new texts expected; any new aria/hint text in en and zh-CN.
- Docs: `docs/model_routing.md` (Configuration controls, stored launch, reuse rule), `settings.md` (the new key).
- Deliberately left alone: the router's workspace and auto-approve (fixed by autobyteus-32; the composer's workspace and approval controls are not shown); server-side runtime names in agent-facing texts (FU-001); the model menu itself (no blocked marker, DEC-004); the optional reviewer notes on the Task comment.
- Follow-ups: FU-001 (server runtime display names in launch notes, tool output and `reasonText` still say "Claude"/"Codex").

## Behavior To Path Map

| Behavior | REQ / AC | Path |
| --- | --- | --- |
| BEH-001 choose | REQ-001; AC-001 | Configuration → launch controls composable → `choose-launch` → `setModelRouterLaunch` |
| BEH-002 store and start | REQ-002, 003, 005; AC-002, 003, 005 | `ModelRoutingSettings.setRouterLaunch` (validate → write 3 keys) → `readModelRouterLaunch` → `ModelRouterAgent.ensureRun` (compare full launch → reuse or create with `llmConfig`) |
| BEH-003 names | REQ-004; AC-004 | `modelRoutingPresentation` → app name functions → all tabs |

## Task Design Health Assessment

- Change posture: `Bug Fix` / alignment (a parallel control and a parallel name map duplicated existing ones).
- Root cause: `Duplicated Policy` — the page re-implemented the launch choice and runtime naming instead of reusing the app's (DESIGN principle: one owner per concern).
- Refactor needed now: `Yes`, small — delete the page's selects and name map; possibly move `explicitChatModelConfig` to `utils/` for sharing.
- Design case: add to `docs/design-cases.md` ("A second control and name map for something the app already has": a new surface built its own runtime/model choice and names; notice it by a new select or label map for runtimes or models).

## Persisted Data / State Transition Decision

| Subject | Change | Decision |
| --- | --- | --- |
| Server setting `AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG` | new key | New; absent/empty = no settings (`Directly Usable — No Migration`) |
| `AUTOBYTEUS_MODEL_ROUTER_RUNTIME`, `…_MODEL` | unchanged | No rename, so DESIGN.md rule 10 does not apply |
| `<appData>/model-routing/model-router-agent.json` | optional `llmConfig` | `Directly Usable — No Migration` (absent = `null`, REQ-005) |

## Ownership And Boundaries

- `ModelRoutingSettings` owns writing the router launch, now including validation through the shared `RunModelSelectionService` (a port, as the resolver already uses it); `ModelRouterAgent` stays the only creator of the router run. The web page owns no launch logic of its own: the composable only adapts the status to the shared controls' props and events.
- Dependency: `model-routing` → `llm-management` (validator port); never the reverse.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| GraphQL `setModelRouterLaunch(runtimeKind: String!, llmModelIdentifier: String!, llmConfig: JSON)` | adds `llmConfig`; refused (GraphQL error with the validator's message) when the launch is not valid |
| `modelRoutingStatus.routerLaunch` | `{runtimeKind, llmModelIdentifier, llmConfig}` |
| `ModelRouterLaunch` | + `llmConfig` |

## Backward-Compatibility Rejection Log

| Candidate | Decision |
| --- | --- |
| Keep the old two-argument mutation beside the new one | Rejected (rule 9) |
| One new combined launch key with a settings migration | Rejected (DEC-001: a rename with no user gain) |
| Keep the page's name map for "short" names | Rejected (one name per concept) |

## Change Sequence

1. Server: settings key, launch type, validation on save; GraphQL; `ModelRouterAgent` (create with settings, state, equality); tests incl. a beta.11-shaped fixture (AC-005).
2. Web: composable + Configuration with the shared controls; manager/types/GraphQL; names on all tabs; tests (en, zh-CN).
3. Docs; design case.

## Task Size And Architectural Risk

- Task size: `Medium` (about 15 source files plus tests, server and web, no new subsystem).
- Architectural risk: `Low` — reuses existing components, validator and launch shape; one additive setting; the router-run reuse rule widens by one field; no boundary, contract between nodes, migration or lifecycle change.
- Escalation trigger: the shared launch controls cannot run outside the composer/run Settings without changes to them; or the validator needs a run or team context the settings writer cannot give.

## Risks

- RSK-001 a thinking or option change restarts the router's run (DEC-002): its conversation history starts over; `knowledge.md` keeps what it learned. Visible and rare.
- RSK-002 the catalog for a runtime is not loaded when Decisions/Overview render: labels fall back to the model ID (as the menu does) until it loads.

## Guidance For Implementation And Validation

- Reuse the three chat components and their helpers as they are; if one needs a prop to work in Settings (e.g. disabled), add it generally, not router-specifically.
- Normal tests only (the user's standing direction): component tests per tab and state (off, on, not set, blocked; en, zh-CN), server unit tests for settings read/write/validation and run reuse, one live routing on one runtime with a thinking level set, and a screenshot of Configuration beside the composer's model menu.
- Real provider keys only from the test vault (TESTING.md); never the user's running AutoByteus or `~/.autobyteus`.
- Done-when: merged to personal; no release unless asked.
