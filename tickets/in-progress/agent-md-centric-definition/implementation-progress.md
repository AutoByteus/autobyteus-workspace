# Implementation Progress — Agent-MD-Centric Definition

- **Stage**: 6
- **Started**: 2026-03-05

| Task | File | Status | Notes |
|------|------|--------|-------|
| T-01 C-034 | `store-utils.ts` — add `writeRawFile` | Completed | |
| T-02 C-014 | `app-config.ts` — add path helpers | Completed | |
| T-03 C-015 | `agent-md-parser.ts` — new file | Completed | |
| T-04 C-016 | `team-md-parser.ts` — new file | Completed | |
| T-05 C-001 | `agent-definition/domain/models.ts` | Completed | |
| T-06 C-006 | `agent-team-definition/domain/models.ts` | Completed | |
| T-07 C-002 | `file-agent-definition-provider.ts` — rewrite | Completed | |
| T-08 C-003+004 | Remove prompt mapping providers | Completed | |
| T-09 C-005 | `agent-definition-service.ts` | Completed | |
| T-10 C-009 | `prompt-loader.ts` — move + rewrite | Completed | Runtime now loads instructions from `agent.md` body via `agent-definition/utils/prompt-loader.ts`. |
| T-11 C-007 | `file-agent-team-definition-provider.ts` — rewrite | Completed | Team persistence migrated to `team.md` + `team-config.json` with `ref/refType`. |
| T-12 C-008 | Remove `src/prompt-engineering/` | Completed | Removed server prompt-engineering module and prompt agent-tools directory. |
| T-13 C-010 | `api/graphql/types/agent-definition.ts` | Completed | Added `instructions/category`, templates query, and duplicate mutation; removed prompt/version fields. |
| T-14 C-011 | Remove `api/graphql/types/prompt.ts` | Completed | Prompt GraphQL type removed and schema registration updated. |
| T-15 C-012+033 | `api/graphql/types/agent-team-definition.ts` | Completed | Team GraphQL migrated to `instructions/category` and `ref/refType`; template query added. |
| T-16 C-013 | `sync/services/node-sync-service.ts` | Completed | Node sync export/import now transports raw `agent.md`/`agent-config.json` and `team.md`/`team-config.json`. |
| T-17 C-017–021,032 | Remove prompt-engineering frontend | Completed | Removed prompt components, stores, GraphQL prompt docs, and `/prompt-engineering` page route; removed sidebar prompt navigation entries. |
| T-18 C-025+026 | Agent GraphQL documents | Completed | Added `instructions`/`category` fields to agent query and create/update/duplicate mutation payloads. |
| T-19 C-024 | `agentDefinitionStore.ts` | Completed | Store migrated to md-centric model; prompt-schema coupling removed; duplicate action added. |
| T-20 C-022+023 | `AgentDefinitionForm.vue` + detail view | Completed | Agent form now captures `instructions` and `category`; detail view renders both and wires duplicate action. |
| T-21 C-029+030 | Team GraphQL documents | Completed | Team query/mutations migrated to `instructions`/`category` and node fields `ref`/`refType`. |
| T-22 C-028 | `agentTeamDefinitionStore.ts` | Completed | Team store migrated to `instructions`/`category` + `ref`/`refType` model, decoupled from stale generated types. |
| T-23 C-027 | `AgentTeamDefinitionForm.vue` | Completed | Team form now captures instructions/category and submits node refs via `ref`/`refType`. |
| T-24 C-031 | `AgentDuplicateButton.vue` (new) | Completed | Added new duplicate button component and integrated in `AgentDetail.vue` action panel. |
| T-25 Stage7 Re-entry | Server API/E2E test suites migrated to md-centric schema/contracts | Completed | Updated `agent-definitions-graphql.e2e`, `agent-team-definitions-graphql.e2e`, `node-sync-graphql.e2e`, `json-file-persistence-contract.e2e`; removed legacy prompt/version assertions and legacy sync payload shape. |
| T-26 Stage7 Re-entry | Added server integration coverage for parse error + prompt-loader behavior | Completed | Added `tests/integration/agent-definition/md-centric-provider.integration.test.ts`. |
| T-27 Stage7 Re-entry | Added frontend integration/unit assertions for md-centric payloads and prompt-UI removal | Completed | Added `tests/integration/agent-definition.integration.test.ts`; updated `LeftSidebarStrip.spec.ts`, `AppLeftPanel.spec.ts`, `agentDefinitionStore.spec.ts`. |
| T-28 Stage7 Re-entry | Preserve unknown `agent-config.json` fields during update round-trip (REQ-002) | Completed | Updated `file-agent-definition-provider.ts` update flow to merge existing config keys, then added integration assertion in `md-centric-provider.integration.test.ts`. |
| T-29 Stage7 Re-entry | Enforce team coordinator/member consistency (REQ-004) | Completed | Added service-level validation in `agent-team-definition-service.ts` and GraphQL E2E assertion for invalid coordinator input. |
| T-30 Stage7 Re-entry | Add server removal contract test for prompt-engineering module (REQ-011) | Completed | Added `tests/integration/prompt-engineering-removal.integration.test.ts`. |
| T-31 Stage7 Re-entry | Strengthen node-sync payload tests for no-legacy fields (REQ-016/017) | Completed | Added assertions that exported sync payload excludes legacy `agent`, `team`, and `promptVersions` keys. |
| T-32 Stage7 Re-entry | Add agent form instructions contract coverage (REQ-020) | Completed | Added `components/agents/__tests__/AgentDefinitionForm.spec.ts` (required placeholder + submit payload). |
| T-33 Stage7 Re-entry | Add frontend GraphQL document contract coverage (REQ-023) | Completed | Added `tests/integration/md-centric-graphql-documents.integration.test.ts`. |
| T-34 Stage7 Re-entry | Add frontend prompt-engineering removal contract coverage (REQ-019) | Completed | Added `tests/integration/prompt-engineering-removal.integration.test.ts`. |
| T-35 Stage7 Re-entry | Full backend failure triage with `RUN_CODEX_E2E=1` | Completed | Classified failures into: legacy prompt-engineering suites (removed surface), stale md-centric contracts, and codex runtime timing flake. |
| T-36 Stage7 Re-entry | Migrate stale server tests to md-centric contracts | Completed | Updated run-history/codex-team/sync/tool/unit/integration tests to require `instructions`, use `ref/refType`, and remove prompt-version assumptions. |
| T-37 Stage7 Re-entry | Stabilize codex generate-image metadata websocket assertion | Completed | `codex-runtime-graphql.e2e` now resolves once valid metadata arguments are observed, reducing idle-status timing race. |
| T-38 Stage7 Re-entry | Retire legacy prompt-engineering suites from active backend run | Completed | Added vitest excludes for deleted prompt-engineering unit/integration directories and replaced prompts GraphQL E2E with removal-contract assertion. |
| T-39 Stage7 Re-entry | Codex-enabled targeted regression re-run | Completed | `12` targeted files passed after migrations (`50` passed, `1` skipped). |
| T-40 Stage7 Re-entry | Codex-enabled full backend verification re-run | Completed | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run` => `226` files passed, `5` skipped; `1055` tests passed, `30` skipped. |
| T-41 Stage8 Local-Fix | Remove residual prompt-loader compatibility APIs | Completed | `agent-definition/utils/prompt-loader.ts` now exports only canonical `promptLoader` singleton; removed legacy aliases (`getPromptLoader`, `invalidateCache`). |
| T-42 Stage8 Local-Fix | Remove remaining backend compatibility aliases for team/runtime/workspace models | Completed | Removed `NodeType` re-export and `TeamCodexRuntimeEventBridge` alias exports; removed backend `root_path` fallback in workspace runtime. |
| T-43 Stage8 Local-Fix | Enforce canonical team-member tool payload shape only | Completed | `create_agent_team_definition` and `update_agent_team_definition` now accept only `member_name/ref/ref_type` inputs (no `reference_*` fallback). |
| T-44 Stage8 Local-Fix | Align run managers with md-centric prompt-loader boundary | Completed | `agent-run-manager.ts` and `agent-team-run-manager.ts` use canonical prompt-loader import and md-centric prompt logs/messages. |
| T-45 Stage8 Local-Fix | Remove frontend fallback mapping for legacy team member fields | Completed | `AgentTeamDefinitionForm.vue` now maps/serializes only `ref/refType` and md-centric team category/instructions fields. |
| T-46 Stage8 Local-Fix | Update impacted backend unit tests for canonical team model fields | Completed | Updated team-management unit tests to use `instructions/category` and `ref/refType` shape (no `referenceId/referenceType`). |
| T-47 Stage8 Local-Fix | Re-validate local-fix deltas (backend+frontend) before Stage 7 gate | Completed | Targeted suites passed: backend (`6` files, `16` tests) + frontend impacted suites (`4` files, `11` tests). |
| T-48 C-035 | `app-config.ts` definition source path parsing (`AUTOBYTEUS_DEFINITION_SOURCE_PATHS`) | Completed | Added `getAdditionalDefinitionSourceRoots()` with absolute-path validation, dedupe, and warnings for invalid entries. |
| T-49 C-036 | New backend `DefinitionSourceService` for list/add/remove + cache refresh | Completed | Added `src/definition-sources/services/definition-source-service.ts` with source-root validation and cache refresh hooks. |
| T-50 C-037 | GraphQL definition-source API surface + schema registration | Completed | Added `definitionSources`, `addDefinitionSource`, `removeDefinitionSource` resolver and registered it in schema. |
| T-51 C-038 | Agent provider multi-source read aggregation + precedence | Completed | `FileAgentDefinitionProvider` reads default + additional sources (first-hit-wins), while writes stay default-owned. |
| T-52 C-039 | Agent-team provider multi-source read aggregation + precedence | Completed | `FileAgentTeamDefinitionProvider` reads default + additional sources (first-hit-wins), while writes stay default-owned. |
| T-53 C-040 | Frontend definition-source GraphQL documents | Completed | Added `autobyteus-web/graphql/definitionSources.ts` query/mutation docs. |
| T-54 C-041 | Frontend definition-source store | Completed | Added `autobyteus-web/stores/definitionSourcesStore.ts` (fetch/add/remove + error/loading state). |
| T-55 C-042 | Settings Definition Sources manager component | Completed | Added `components/settings/DefinitionSourcesManager.vue` with list, counts, add/remove, success/error feedback. |
| T-56 C-043 | Settings page wiring for Definition Sources section | Completed | Updated `pages/settings.vue` and `pages/__tests__/settings.spec.ts` to include nav + section rendering. |
| T-57 C-044 | AppConfig unit coverage for definition source parsing | Completed | Added `getAdditionalDefinitionSourceRoots` test coverage in `tests/unit/config/app-config.test.ts`. |
| T-58 C-045 | Backend API/E2E for definition source management and aggregated reads | Completed | Added `tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts`. |
| T-59 C-046 | Frontend settings/component tests for definition source UX + reload coverage | Completed | Added `DefinitionSourcesManager.spec.ts`; updated `AgentList.spec.ts` and `AgentTeamList.spec.ts` reload assertions. |
| T-60 Stage10 Local-Fix | Duplicate UX refinement: remove browser prompt and route duplicate directly to edit | Completed | Updated `AgentDuplicateButton.vue` collision-safe auto-name flow and `AgentDetail.vue` duplicate navigation; added focused frontend tests. |
| T-61 Stage10 Local-Fix | Add and execute legacy DB-to-file migration utility for agents/teams/prompts | Completed | Added `scripts/migrate-legacy-agent-db-to-files.py`; executed dry-run + apply in main-allinone container and verified idempotence + GraphQL visibility after restart. |

## Stage 6 Verification Evidence

- Server API/E2E + integration verification (`34` passed):  
  `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts tests/e2e/sync/node-sync-graphql.e2e.test.ts tests/e2e/sync/json-file-persistence-contract.e2e.test.ts tests/integration/agent-definition/md-centric-provider.integration.test.ts tests/integration/prompt-engineering-removal.integration.test.ts`
- Frontend integration/unit verification (`47` passed):  
  `pnpm -C autobyteus-web exec vitest run tests/integration/agent-definition.integration.test.ts tests/integration/agent-team-definition.integration.test.ts tests/integration/md-centric-graphql-documents.integration.test.ts tests/integration/prompt-engineering-removal.integration.test.ts stores/__tests__/agentDefinitionStore.spec.ts stores/__tests__/agentTeamDefinitionStore.spec.ts components/layout/__tests__/LeftSidebarStrip.spec.ts components/__tests__/AppLeftPanel.spec.ts components/agents/__tests__/AgentList.spec.ts components/agents/__tests__/AgentDetail.spec.ts components/agents/__tests__/AgentDefinitionForm.spec.ts components/agentTeams/__tests__/AgentTeamList.spec.ts components/agentTeams/__tests__/AgentTeamDetail.spec.ts components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts components/settings/__tests__/NodeManager.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts`
- Full backend verification (`RUN_CODEX_E2E=1`):  
  `pnpm -C autobyteus-server-ts test -- --run`  
  Result: `226` files passed, `5` skipped; `1055` tests passed, `30` skipped.
- Stage 8 Local-Fix delta verification (`2026-03-06`):
  - Backend targeted:
    `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest --run tests/unit/agent-tools/agent-team-management/get-agent-team-definition.test.ts tests/unit/agent-tools/agent-team-management/list-agent-team-definitions.test.ts tests/unit/agent-tools/agent-team-management/create-agent-team-definition.test.ts tests/unit/agent-tools/agent-team-management/update-agent-team-definition.test.ts tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts tests/unit/workspaces/workspace-manager.test.ts`
    Result: `6` files, `16` tests passed.
  - Frontend impacted:
    `pnpm -C autobyteus-web exec vitest run tests/integration/agent-team-definition.integration.test.ts components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts stores/__tests__/agentTeamDefinitionStore.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
    Result: `4` files, `11` tests passed.

## Stage 6 Addendum Verification (Definition Sources V1)

- Backend implementation verification:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts`
  - Result: `4` files, `23` tests passed.
- Frontend implementation verification:
  - `pnpm -C autobyteus-web exec vitest run pages/__tests__/settings.spec.ts components/settings/__tests__/DefinitionSourcesManager.spec.ts components/agents/__tests__/AgentList.spec.ts components/agentTeams/__tests__/AgentTeamList.spec.ts`
  - Result: `4` files, `24` tests passed.

## Stage 6 Local-Fix Verification (Duplicate UX)

- Frontend duplicate UX verification:
  - `pnpm -C autobyteus-web exec vitest run components/agents/__tests__/AgentDuplicateButton.spec.ts components/agents/__tests__/AgentDetail.spec.ts`
  - Result: `2` files, `3` tests passed.

## Stage 6 Local-Fix Verification (Legacy DB Migration Utility)

- Migration script syntax check:
  - `python3 -m py_compile scripts/migrate-legacy-agent-db-to-files.py`
  - Result: passed.
- Migration dry-run execution (containerized real DB):
  - `docker exec autobyteus-workspace-superrepo-main-allinone-1 python3 /tmp/migrate-legacy-agent-db-to-files.py --mode dry-run --db-path /home/autobyteus/data/db/production.db --data-root /home/autobyteus/data`
  - Result: `agents total=3 created=1 skipped=2`, `teams total=1 created=0 skipped=1`.
- Migration apply execution (containerized real DB):
  - `docker exec autobyteus-workspace-superrepo-main-allinone-1 python3 /tmp/migrate-legacy-agent-db-to-files.py --mode apply --db-path /home/autobyteus/data/db/production.db --data-root /home/autobyteus/data`
  - Result: created `agents/superagent/{agent.md,agent-config.json}` from DB row + active prompt mapping.
- Idempotence re-run:
  - same apply command as above.
  - Result: `created=0`, `skipped_existing=3` agents and `1` team.
- Runtime visibility verification:
  - restarted container and queried GraphQL: `agentDefinitions` now includes `superagent`.
