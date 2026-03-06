# API/E2E Testing

## Testing Scope

- Ticket: `agent-md-centric-definition`
- Scope classification: `Large`
- Re-entry path: `Stage 8 Local Fix` (`8 -> 6 -> 7 -> 8`) + `Requirement Gap` addendum path (`10 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7`) + `Stage 10 Local Fix` (`10 -> 6 -> 7 -> 8`)
- Objective: prove executable coverage for `REQ-001` through `REQ-024`, plus reopened addendum coverage for `REQ-025` through `REQ-033`
- Workflow state source: `tickets/in-progress/agent-md-centric-definition/workflow-state.md`

## Requirement Coverage Matrix (REQ-001..REQ-024)

| Requirement ID | Requirement Summary | Scenario ID(s) | Evidence Type | Status |
| --- | --- | --- | --- | --- |
| REQ-001 | `agent.md` frontmatter/body format + parse safety | AV-001, AV-002 | Server GraphQL E2E + integration | Passed |
| REQ-002 | `agent-config.json` schema defaults + unknown-field preservation + no `activePromptVersion` | AV-001, AV-002, AV-003, AV-013 | Server GraphQL E2E + integration | Passed |
| REQ-003 | `team.md` frontmatter/body format | AV-005, AV-013 | Server GraphQL E2E | Passed |
| REQ-004 | `team-config.json` schema (`coordinatorMemberName`, `members`, `ref/refType`) | AV-005, AV-011, AV-013 | Server GraphQL E2E | Passed |
| REQ-005 | Template subfolder convention (`_` prefix + dedicated queries) | AV-001, AV-005 | Server GraphQL E2E | Passed |
| REQ-006 | `FileAgentDefinitionProvider` md-centric read/write lifecycle | AV-001, AV-013 | Server GraphQL E2E | Passed |
| REQ-007 | `AppConfig` md-centric path helpers | AV-010 | Server unit | Passed |
| REQ-008 | `AgentDefinition` model update (`instructions/category`, remove prompt fields) | AV-001, AV-003, AV-009 | Server GraphQL E2E + frontend integration | Passed |
| REQ-009 | `AgentTeamDefinition` model update (`instructions/category`, `ref/refType`) | AV-005, AV-006 | Server GraphQL E2E | Passed |
| REQ-010 | `PromptLoader` reads `agent.md` body | AV-002 | Server integration | Passed |
| REQ-011 | Remove server prompt-engineering module/mappings | AV-004, AV-012 | Server GraphQL E2E + integration | Passed |
| REQ-012 | Updated `AgentDefinition` GraphQL output type | AV-003 | Server GraphQL introspection E2E | Passed |
| REQ-013 | Updated create/update agent inputs (`instructions/category`, remove prompt version) | AV-003 | Server GraphQL introspection E2E | Passed |
| REQ-014 | Updated `AgentTeamDefinition` GraphQL output type | AV-006 | Server GraphQL introspection E2E | Passed |
| REQ-015 | Remove prompt GraphQL API | AV-004 | Server GraphQL E2E | Passed |
| REQ-016 | `SyncAgentDefinition` bundle payload uses raw md/config file content | AV-007 | Server Node Sync GraphQL E2E | Passed |
| REQ-017 | `SyncAgentTeamDefinition` bundle payload uses raw md/config file content | AV-007 | Server Node Sync GraphQL E2E | Passed |
| REQ-018 | Node sync import writes md/config files and refreshes API-visible state | AV-008 | Server Node Sync GraphQL E2E | Passed |
| REQ-019 | Remove frontend prompt-engineering module/routes/stores/docs | AV-014, AV-015 | Frontend integration + unit | Passed |
| REQ-020 | Agent form includes required `instructions` textarea with expected placeholder | AV-016 | Frontend component integration | Passed |
| REQ-021 | Agent detail renders instructions | AV-017 | Frontend component integration | Passed |
| REQ-022 | Team form includes required `instructions` textarea with expected placeholder | AV-018 | Frontend component integration | Passed |
| REQ-023 | Frontend GraphQL docs include `instructions/category`; no `activePromptVersion` | AV-019, AV-009 | Frontend integration + store integration | Passed |
| REQ-024 | `agentDefinitionStore` md-centric state and no prompt fields | AV-009 | Frontend store integration | Passed |

## Scenario Catalog

| Scenario ID | Coverage | Command/Harness | Status |
| --- | --- | --- | --- |
| AV-001 | Agent create/update/duplicate/delete, disk contract, template query split, no `prompt-v*.md` | `tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts` | Passed |
| AV-002 | Malformed `agent.md` error, `PromptLoader` body load, unknown config-key preservation on update | `tests/integration/agent-definition/md-centric-provider.integration.test.ts` | Passed |
| AV-003 | Agent GraphQL/output and input contract introspection + removed `activePromptVersion` field failure | `tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts` | Passed |
| AV-004 | Removed prompt GraphQL query (`prompts`) failure | `tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts` | Passed |
| AV-005 | Team create/update/delete, template query split, `ref/refType` member shape | `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | Passed |
| AV-006 | Team GraphQL output contract introspection (`instructions/category/nodes`) | `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | Passed |
| AV-007 | Node sync export payload shape for agent/team files (`files.agentMd/agentConfigJson/teamMd/teamConfigJson`) and no legacy payload keys | `tests/e2e/sync/node-sync-graphql.e2e.test.ts` | Passed |
| AV-008 | Node sync import applies md/config payloads; disk + follow-up API queries reflect imported state | `tests/e2e/sync/node-sync-graphql.e2e.test.ts`, `tests/e2e/sync/json-file-persistence-contract.e2e.test.ts` | Passed |
| AV-009 | Frontend create payload is md-centric and store has no prompt fields | `tests/integration/agent-definition.integration.test.ts`, `stores/__tests__/agentDefinitionStore.spec.ts` | Passed |
| AV-010 | `AppConfig` helper coverage for md-centric file paths | `tests/unit/config/app-config.test.ts` | Passed |
| AV-011 | Team coordinator validation (`coordinatorMemberName` must exist in nodes) | `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | Passed |
| AV-012 | Prompt-engineering server modules/providers remain removed | `tests/integration/prompt-engineering-removal.integration.test.ts` | Passed |
| AV-013 | JSON persistence defaults/shape for `agent-config.json` and `team-config.json` | `tests/e2e/sync/json-file-persistence-contract.e2e.test.ts` | Passed |
| AV-014 | Prompt-engineering frontend files/routes/stores/docs remain removed | `tests/integration/prompt-engineering-removal.integration.test.ts` | Passed |
| AV-015 | No prompt-engineering entry points in left navigation/runtime panel | `components/layout/__tests__/LeftSidebarStrip.spec.ts`, `components/__tests__/AppLeftPanel.spec.ts` | Passed |
| AV-016 | Agent form instructions textarea placeholder/required + submit payload | `components/agents/__tests__/AgentDefinitionForm.spec.ts` | Passed |
| AV-017 | Agent detail renders instructions and category | `components/agents/__tests__/AgentDetail.spec.ts` | Passed |
| AV-018 | Team form instructions textarea placeholder/required + submit payload | `components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts` | Passed |
| AV-019 | Frontend GraphQL document contract (`instructions/category`, no prompt docs/version fields) | `tests/integration/md-centric-graphql-documents.integration.test.ts` | Passed |

## Full Stage 7 Execution Evidence

- Server verification command:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts tests/e2e/sync/node-sync-graphql.e2e.test.ts tests/e2e/sync/json-file-persistence-contract.e2e.test.ts tests/integration/agent-definition/md-centric-provider.integration.test.ts tests/integration/prompt-engineering-removal.integration.test.ts`
  - Result: `7` files, `34` tests passed.
- Frontend verification command:
  - `pnpm -C autobyteus-web exec vitest run tests/integration/agent-definition.integration.test.ts tests/integration/agent-team-definition.integration.test.ts tests/integration/md-centric-graphql-documents.integration.test.ts tests/integration/prompt-engineering-removal.integration.test.ts stores/__tests__/agentDefinitionStore.spec.ts stores/__tests__/agentTeamDefinitionStore.spec.ts components/layout/__tests__/LeftSidebarStrip.spec.ts components/__tests__/AppLeftPanel.spec.ts components/agents/__tests__/AgentList.spec.ts components/agents/__tests__/AgentDetail.spec.ts components/agents/__tests__/AgentDefinitionForm.spec.ts components/agentTeams/__tests__/AgentTeamList.spec.ts components/agentTeams/__tests__/AgentTeamDetail.spec.ts components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts components/settings/__tests__/NodeManager.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts`
  - Result: `18` files, `47` tests passed.

## Post-Reentry Full Backend Validation (Codex Enabled)

- Full backend command:
  - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run`
  - Result: `226` files passed, `5` skipped; `1055` tests passed, `30` skipped.
- Failure triage outcome from the pre-fix full run:
  - Legacy prompt-engineering suites were still being discovered even though prompt-engineering source modules were intentionally removed.
  - Active suites had stale contract usage (`instructions` missing, old `referenceId/referenceType`, old prompt-version fields).
  - One codex websocket metadata assertion had a timing race.
- Remediation applied:
  - Active suites migrated to md-centric contracts.
  - Prompt GraphQL E2E converted to removal-contract assertion; deleted-prompt module test directories excluded from backend run discovery.
  - Codex metadata assertion stabilized by resolving on valid metadata argument observation.
- Residual non-deterministic external dependency blockers after remediation:
  - None observed in the final full codex-enabled backend run.

## Round 5 Re-Validation (2026-03-06, Stage 8 Local-Fix Path)

- Compatibility-removal delta verification (backend targeted):
  - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest --run tests/unit/agent-tools/agent-team-management/get-agent-team-definition.test.ts tests/unit/agent-tools/agent-team-management/list-agent-team-definitions.test.ts tests/unit/agent-tools/agent-team-management/create-agent-team-definition.test.ts tests/unit/agent-tools/agent-team-management/update-agent-team-definition.test.ts tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts tests/unit/workspaces/workspace-manager.test.ts`
  - Result: `6` files, `16` tests passed.
- Compatibility-removal delta verification (frontend impacted):
  - `pnpm -C autobyteus-web exec vitest run tests/integration/agent-team-definition.integration.test.ts components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts stores/__tests__/agentTeamDefinitionStore.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
  - Result: `4` files, `11` tests passed.
- Codex-enabled full backend regression:
  - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run`
  - Result: `226` files passed, `5` skipped; `1055` tests passed, `30` skipped.

## Failure Escalation Log

- Initial trigger (resolved): requirement-level executable evidence gaps for `REQ-007`, `REQ-012`, `REQ-013`, `REQ-014`, `REQ-017`, `REQ-021`, `REQ-022`.
- Additional hardening (resolved in this pass): `REQ-002` unknown-field preservation and `REQ-004` coordinator/member validation now covered by executable tests.

## Feasibility And Risk Record

- Infeasible scenarios: `No`
- User waiver required: `N/A`
- Residual risk: low; all `REQ-001..REQ-024` now map to executable evidence in this Stage 7 pass.

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All mapped executable requirements passed: `Yes`
- Unresolved escalation items: `No`
- Ready for Stage 8: `Yes`

---

## Definition Sources V1 Addendum (REQ-025..REQ-032)

### Requirement Coverage Matrix

| Requirement ID | Requirement Summary | Scenario ID(s) | Evidence Type | Status |
| --- | --- | --- | --- | --- |
| REQ-025 | Definition source GraphQL query/mutations (`definitionSources`, `addDefinitionSource`, `removeDefinitionSource`) | DV-001, DV-002 | Server GraphQL E2E | Passed |
| REQ-026 | Source root structure and filesystem-only scope (`agents/` and/or `agent-teams/`, absolute path) | DV-002 | Server GraphQL E2E | Passed |
| REQ-027 | AppConfig parsing for `AUTOBYTEUS_DEFINITION_SOURCE_PATHS` | DV-003 | Server unit | Passed |
| REQ-028 | Multi-source read aggregation + precedence across agent/team providers | DV-001 | Server GraphQL E2E | Passed |
| REQ-029 | Cache refresh after add/remove source | DV-001 | Server GraphQL E2E | Passed |
| REQ-030 | Default-only write semantics (no copy-to-default during import/register) | DV-001 | Server GraphQL E2E + filesystem assertion | Passed |
| REQ-031 | Settings UI section for definition-source management | DV-004, DV-005 | Frontend page/component integration | Passed |
| REQ-032 | Reload compatibility for Agents/Teams list actions | DV-006 | Frontend component integration | Passed |

### Addendum Scenario Catalog

| Scenario ID | Coverage | Command/Harness | Status |
| --- | --- | --- | --- |
| DV-001 | Add/remove source path, source counts, aggregated agent/team reads, default precedence, no copy-to-default side effects | `tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts` | Passed |
| DV-002 | Reject invalid source inputs (URL-like path, missing root structure, non-existent path) | `tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts` | Passed |
| DV-003 | AppConfig parser for additional definition source roots | `tests/unit/config/app-config.test.ts` | Passed |
| DV-004 | Settings page includes Definition Sources section and query-param navigation support | `autobyteus-web/pages/__tests__/settings.spec.ts` | Passed |
| DV-005 | Definition Sources manager add/remove UX + success feedback | `autobyteus-web/components/settings/__tests__/DefinitionSourcesManager.spec.ts` | Passed |
| DV-006 | Existing Agent/Team Reload actions still dispatch reload store actions | `autobyteus-web/components/agents/__tests__/AgentList.spec.ts`, `autobyteus-web/components/agentTeams/__tests__/AgentTeamList.spec.ts` | Passed |

### Addendum Execution Evidence

- Backend focused verification:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts`
  - Result: `4` files, `23` tests passed.
- Frontend focused verification:
  - `pnpm -C autobyteus-web exec vitest run pages/__tests__/settings.spec.ts components/settings/__tests__/DefinitionSourcesManager.spec.ts components/agents/__tests__/AgentList.spec.ts components/agentTeams/__tests__/AgentTeamList.spec.ts`
  - Result: `4` files, `24` tests passed.
- Full codex-enabled backend regression:
  - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run`
  - Result: `227` files passed, `5` skipped; `1058` tests passed, `30` skipped.

### Addendum Stage 7 Decision

- Addendum Stage 7 complete: `Yes`
- All mapped executable requirements (`REQ-025..REQ-032`) passed: `Yes`
- Blockers/open failures: `No`
- Ready for Stage 8 addendum review: `Yes`

---

## Duplicate UX Local-Fix Addendum (REQ-033)

### Requirement Coverage Matrix

| Requirement ID | Requirement Summary | Scenario ID(s) | Evidence Type | Status |
| --- | --- | --- | --- | --- |
| REQ-033 | Duplicate flow avoids browser-native prompts and routes directly to edit view after success | UX-001 | Frontend component integration | Passed |

### Scenario Catalog

| Scenario ID | Coverage | Command/Harness | Status |
| --- | --- | --- | --- |
| UX-001 | Duplicate button generates collision-safe name without `window.prompt` and emits navigate-to-edit on completion | `components/agents/__tests__/AgentDuplicateButton.spec.ts`, `components/agents/__tests__/AgentDetail.spec.ts` | Passed |

### Execution Evidence

- Frontend duplicate UX verification:
  - `pnpm -C autobyteus-web exec vitest run components/agents/__tests__/AgentDuplicateButton.spec.ts components/agents/__tests__/AgentDetail.spec.ts`
  - Result: `2` files, `3` tests passed.

### Addendum Stage 7 Decision

- Addendum Stage 7 complete: `Yes`
- All mapped executable requirements (`REQ-033`) passed: `Yes`
- Blockers/open failures: `No`
- Ready for Stage 8 addendum review: `Yes`
