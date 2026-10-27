# Investigation Notes — Model Router: standard launch selector (autobyteus-313)

- Package: `model-router-standard-launch-selector`; Project Task **autobyteus-313** (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); follow-up FU-012 of autobyteus-32.
- Bootstrap: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector`, branch `codex/model-router-standard-launch-selector`, from `origin/personal` `1c54ffec6a` (2026-10-27, after `git fetch origin personal`); finalization target `origin/personal`.
- Authorities read: `solution-designer` SKILL.md (updated 2026-10-27: feasibility evidence per requirement, challenge contradicted direction), `references/requirements-engineering.md` (updated), `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rules 7, 9, 10), `GLOSSARY.md` (Agent Runtimes), autobyteus-32's archived design and the Product UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md`.

## Evidence

| ID | Source | Observation |
| --- | --- | --- |
| B-01 | `autobyteus-web/components/settings/model-routing/ModelRoutingSetup.vue:1-80` | Configuration: two native `<select>`s. Runtimes from the autobyteus-303 report (`entry.name`), models by `option.name` with a "· blocked until" suffix; emits `{runtimeKind, llmModelIdentifier}` only. No thinking level or model options. |
| B-02 | `autobyteus-web/components/chat/ChatNewSurface.vue:51-71`, `components/run-settings/RunSettingsCard.vue:45-149` | The app's standard launch controls, used by the run composer **and** run Settings: `ChatModelMenu` (runtimes grouped with model counts, search, `runtimeLocked` option), `ChatThinkingControl` (schema + `llmConfig`, emits the new config) and `ChatModelOptionControl` per model option (`buildModelOptions` / `applyModelOption`, e.g. Codex Fast mode). Prop-driven; catalog via `useChatModelCatalog` (`composables/chat/useChatModelCatalog.ts:94-181`: `modelLabel`, `schemaFor`). |
| B-03 | `autobyteus-web/stores/chatDraftStore.ts:400-420` | On a model choice the draft gets `explicitChatModelConfig(schemaFor(...), llmConfig)` (the model's settings made explicit); thinking/options replace the whole `llmConfig`. |
| B-04 | `autobyteus-server-ts/src/model-routing/model-routing-settings.ts` | Stored router launch: `AUTOBYTEUS_MODEL_ROUTER_RUNTIME` + `AUTOBYTEUS_MODEL_ROUTER_MODEL` (server settings); `ModelRouterLaunch = {runtimeKind, llmModelIdentifier}`; no model settings. |
| B-05 | `autobyteus-server-ts/src/model-routing/services/model-router-agent.ts:104-125, 150-155` | The router run is created without `llmConfig` (model defaults; so no thinking level); reuse when the stored state's runtime and model equal the settings (`model-router-agent.json` `{runId, runtimeKind, llmModelIdentifier}`). |
| B-06 | `autobyteus-server-ts/src/api/graphql/types/model-routing.ts:60-69` | `setModelRouterLaunch(runtimeKind, llmModelIdentifier)`; no settings validation beyond non-empty and a known runtime kind. |
| B-07 | `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts:37-80`; `launch-preferences/launch-usability-check.ts:138-155` | The shared validator for a launch (`validate` / `validateMany`: model offered, `llmConfig` valid for the model's schema), used for every agent launch (U5). |
| B-08 | `autobyteus-server-ts/src/launch-preferences/default-launch-config.ts` | An agent's stored launch configuration: `DefaultLaunchConfig {runtimeKind, llmModelIdentifier, llmConfig}` with `normalizeDefaultLaunchConfig`. |
| B-09 | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts:300-330` | An existing run's model and settings can be changed only while it is stopped (`updateStoppedAgentRunModelConfig`). The router's run is long-lived and usually live. |
| B-10 | `autobyteus-web/types/agent/AgentRunConfig.ts:6-28`; `utils/chat/chatDefaults.ts:19-28` | The app's runtime names: full `runtimeKindToLabel` (AutoByteus, Codex App Server, Claude Agent SDK, Antigravity CLI, Grok Build) and short `runtimeShortLabel` (AutoByteus, Codex, Claude SDK, Antigravity, Grok Build), shown as "<model label> <short runtime>" in the model menu. |
| B-11 | `autobyteus-web/components/settings/model-routing/modelRoutingPresentation.ts:6-9`, used by Decisions, Overview, the problem line and Configuration | A third name set `RUNTIME_NAMES` (Codex, Claude, Antigravity, Grok, AutoByteus) — the user's "Claude" vs "Claude Agent SDK". |
| B-12 | `AvailableAgentRuntimeRow.vue:4`, `AvailableModelList.vue:11` (Runtimes tab, autobyteus-303) | Runtime and model names come from the server report (`available-agent-runtimes-service.ts:47-57` `agentRuntimeDisplayName`: Codex, Claude, Antigravity, Grok; model `display_name`, e.g. "Sonnet 5.5"). |
| B-13 | `available-agent-runtimes-service.ts:56`; uses in `model-router.ts:51`, `model-routing-sessions.ts:120`, `launch-usability-check.ts:174` | The server's short names also appear in agent-facing texts (launch notes in `delegate_task` results, the router tool's errors, the English `reasonText`). |
| B-14 | `autobyteus-server-ts/src/app-data-migrations/migrations/*` | No migration has ever rewritten server settings (`.env`); all migrations rewrite run/project files. |
| B-15 | UI/UX specification § Visual Language "Controls" | Permitted variation: "the production implementation may use the product's existing model menu". |

## Feasibility

No uncertain technology: the components, validator and launch shape exist and are already used for every agent (B-02, B-07, B-08). `N/A` per requirement.

## Unknowns

None blocking. The router's `knowledge.md` is unaffected (workspace file).
