# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/simplify-provided-tools/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/simplify-provided-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/simplify-provided-tools/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/simplify-provided-tools/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/simplify-provided-tools/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/simplify-provided-tools/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code-review pass for `simplify-provided-tools`; API/E2E coverage investigation required before final execution.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `1`

## Current Requirement And Design Basis

The approved task is a clean-cut cleanup/behavior change. The registry-driven local agent-tool surface must stop registering the local `Tool Management` tool group and must stop exposing `create_skill_version`. Only the agent-facing skill tools `get_available_skills` and `get_skill_content` remain. Built-in skill versioning must be removed from backend services, GraphQL schema, frontend documents/store/UI/generated types, tests, and docs. Normal skill catalog/CRUD/source reload/file workspace operations and product `/tools` browsing/MCP management must remain. Skill creation through service/GraphQL/UI must create the skill directory and `SKILL.md` only, without `.git` initialization, commits, or tags. Existing `.git` directories are user data: this change must not run a migration or cleanup that deletes or manages them. No compatibility aliases, no-op wrappers, hidden registration paths, dual-path versioning behavior, or schema shims may remain.

Implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms introduced, no legacy old behavior retained, obsolete files/tests/helpers removed in scope, and active-source removal scans passed. The code-review report independently passed that verdict and found no actionable findings.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| First-party local agent `Tool Management` tool group registration | Removed | REQ-001 through REQ-003; DS-001; implementation handoff "Removed the agent-facing local `Tool Management` tool group" | Need registry and GraphQL `/tools` LOCAL catalog absence checks for category and five names. |
| `create_skill_version` agent tool and `Skill Management` versioning surface | Removed | REQ-005, REQ-006, REQ-012; DS removal plan | Need registry/catalog absence and stale direct coverage removal. |
| `get_available_skills` and `get_skill_content` | Preserved | REQ-004, AC-002, AC-004; DS-002 | Need retained tool registration/runtime execution checks and unit behavior checks. |
| Product GraphQL `ToolManagementResolver`, frontend `/tools`, and MCP management | Preserved | REQ-011, AC-010; DS-004; design review subsystem verdict | Need ensure catalog still resolves retained LOCAL tools and MCP-origin store/UI coverage remains valid. |
| `SkillService.createSkill()` and GraphQL `createSkill` | Changed | REQ-007, AC-005, AC-006; implementation handoff | Need service and GraphQL/API execution proving no `.git` is created and normal skill query works. |
| Skill GraphQL version fields/queries/mutations/types | Removed | REQ-008, AC-006, AC-007; design interface mapping | Need schema introspection absence coverage. |
| Frontend Skill Detail versioning controls/compare modal/version actions | Removed | REQ-009, AC-008; user screenshot; implementation handoff | Need component/store/document/generated checks confirming no versioning UI calls remain and workspace still renders. |
| Normal skill file workspace, source reload, CRUD, enable/disable | Preserved | REQ-009 through REQ-010; DS-003 | Need GraphQL file tree/content/upload/reload and frontend Skill Detail/page/store coverage. |
| Existing skill `.git` directories | Preserved as user data, no AutoByteus management | Out of scope and constraints in requirements; design residual risks; implementation assumption | Existing durable coverage covers no `.git` creation; use a focused temporary probe for non-deletion/non-management of a pre-existing `.git` marker during normal API operations. |
| Persisted agent definitions containing removed tool names | Preserved as accepted residual risk: no migration/alias; missing tools skip/warn | Design review missing-use-case entry; code-review residual risk | Use a focused temporary resolver probe to verify removed names are absent and existing missing-tool behavior skips without compatibility aliases. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | GraphQL `toolsGroupedByCategory(origin: LOCAL)` and `defaultToolRegistry` do not include removed MCP wrapper tools plus this task's five `Tool Management` names and `create_skill_version`; retained skill tools are present. | REQ-001, REQ-002, REQ-005, REQ-011, AC-001, AC-002, AC-003 | Still Valid | Current file explicitly checks removed names/category absent and retained `get_available_skills`/`get_skill_content` present after `loadAllAgentTools()`. | Execute as final API/E2E coverage. |
| `autobyteus-server-ts/tests/e2e/skills/skills-graphql.e2e.test.ts` | GraphQL skill create/query does not create `.git`; removed version fields/operations/types absent; upload/read/tree/reload/delete still work. | REQ-007, REQ-008, AC-005, AC-006, AC-007, DS-003 | Still Valid | Current test titles and source cover create/query, schema absence, file workspace APIs, catalog reload, and delete. | Execute as final API/E2E coverage. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/get-available-skills.test.ts` | Retained `get_available_skills` returns JSON list and propagates listing failures. | REQ-004, AC-004, DS-002 | Still Valid | Retained direct unit behavior remains required. | Execute targeted unit coverage. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/get-skill-content.test.ts` | Retained `get_skill_content` formats skill content/file tree and handles missing skill/tree errors. | REQ-004, AC-004, DS-002, file workspace preservation | Still Valid | Retained direct unit behavior remains required. | Execute targeted unit coverage. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | SkillService CRUD/file/configured skill behavior; current version includes create without `.git`. | REQ-006, REQ-007, normal skill preservation | Still Valid | Current test asserts `createSkill()` leaves no `.git`; broad CRUD/file tree tests remain applicable. | Execute targeted unit coverage. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-sources-management.test.ts` | Multi-source skill discovery and deletion/source behavior. | Normal skill source reload preservation, AC-006 | Still Valid | Source reload remains in scope and GraphQL e2e depends on it. | Execute targeted unit coverage. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Full runtime websocket/LLM suites; implementation only removed `SkillVersioningService.resetInstance()` setup calls. | Runtime preservation broad smoke | Out Of Scope for final required run; setup edit still valid | These suites are broad and environment-gated/slow; changed lines only remove obsolete version-service reset. Missing-tool residual risk can be proved with narrower resolver probe. | Do not run full runtime e2e; use temporary resolver probe for stale tool-name behavior. |
| `autobyteus-server-ts/tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts` | Existing configured-tool exposure normalization and legacy task-tool exclusion. | Persisted definitions and no compatibility alias policy adjacent | Still Valid but not directly sufficient | It does not include this task's removed tool names; adding durable coverage now is not necessary because authoritative resolver behavior is generic. | Use temporary resolver probe rather than durable edit. |
| Deleted `autobyteus-server-ts/tests/unit/agent-tools/tool-management/*.test.{ts,js}` | Direct tests for removed local `Tool Management` tool implementations. | REQ-003, REQ-012 | Stale / Remove | Tests imported deleted implementations and asserted obsolete internal diagnostic tools. | Already removed by implementation before API/E2E; do not restore. |
| Deleted `autobyteus-server-ts/tests/unit/agent-tools/skills/create-skill-version.test.{ts,js}` | Direct tests for removed `create_skill_version`. | REQ-005, REQ-006, REQ-012 | Stale / Remove | Asserts built-in versioning tool behavior that is intentionally obsolete. | Already removed by implementation before API/E2E; do not restore. |
| Deleted `autobyteus-server-ts/tests/unit/skills/services/skill-versioning-service.test.{ts,js}` and `tests/integration/skills/skill-versioning-integration.test.{ts,js}` | Git init/tag/list/diff/activate behavior. | REQ-006, REQ-012 | Stale / Remove | Built-in skill versioning service/domain are deleted by design. | Already removed by implementation before API/E2E; no replacement beyond schema absence and no-`.git` create coverage. |
| `autobyteus-web/components/skills/SkillDetail.spec.ts` | Skill Detail missing state, compact header, no `Enable Versioning` text, description expansion. | REQ-009, AC-008, Skill Detail workspace preservation | Still Valid | Current test removes versioning fixtures/actions and asserts absence of visible enable-versioning control. | Execute targeted frontend component coverage. |
| Deleted `autobyteus-web/components/skills/SkillVersioningPanel.*`, `SkillVersionCompareModal.vue`, `utils/skillDiffParser.ts`, `utils/__tests__/skillDiffParser.test.ts` | Frontend built-in versioning UI and diff parsing. | REQ-009, REQ-010, REQ-012 | Stale / Remove | Only supported removed compare/versioning workflow. | Already removed by implementation before API/E2E; do not restore. |
| `autobyteus-web/graphql/skills.ts`, `graphql/skillSources.ts`, `stores/skillStore.ts`, `types/skill.ts`, `generated/graphql.ts` | Frontend skill documents/store/local/generated types without version fields/actions. | REQ-010, AC-009 | Still Valid | Current source scan and build are needed to prove no stale frontend versioning references. | Execute frontend targeted tests and build; active-source scan. |
| `autobyteus-web/stores/__tests__/skillStore.spec.ts`, `components/skills/SkillsList.spec.ts`, `pages/__tests__/skills.spec.ts` | Skill store reload/missing skill behavior and skills page/list preservation. | Normal Skills page CRUD/file workspace preservation | Still Valid | Current fixtures omit version fields and still exercise core skill state/page behavior. | Execute targeted frontend tests. |
| `autobyteus-web/stores/__tests__/toolManagementStore.mcpGateway.spec.ts`, `components/tools/__tests__/McpGatewayPanel.spec.ts`, `McpManagementTabs.spec.ts`, `McpServerFormModal.spec.ts` | MCP gateway/store/UI remains operational. | REQ-011, AC-010, DS-004 | Still Valid | Product Tools/MCP preservation is in scope even though local diagnostic tool cards are removed. | Execute representative MCP/tool frontend tests. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/tool-management/*.test.{ts,js}` | The five internal diagnostic local agent tools exist and introspect registry/processors. | Tool-management agent tools are intentionally removed from active source and startup. | REQ-001 through REQ-003; design removal plan; implementation handoff deleted folder. | `tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` asserts registry/catalog absence and retained skill tools. | Direct tests for deleted implementations would preserve obsolete behavior. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/create-skill-version.test.{ts,js}` | `create_skill_version` exists and creates skill Git versions. | `create_skill_version` is intentionally removed with the built-in versioning subsystem. | REQ-005, REQ-006, REQ-012; design backward-compat rejection log. | Registry/catalog absence and GraphQL schema absence tests. | No direct replacement because no versioning tool should exist. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-versioning-service.test.{ts,js}` | `SkillVersioningService` initializes/list/diffs/tags skills. | Backend no longer owns skill Git tag lifecycle. | REQ-006, REQ-007; design says external Git/GitHub ownership is outside backend. | SkillService/GraphQL no-`.git` creation tests; schema absence. | No replacement for removed version lifecycle. |
| `autobyteus-server-ts/tests/integration/skills/skill-versioning-integration.test.{ts,js}` | End-to-end built-in skill versioning integration works. | Built-in versioning is removed, not preserved as a compatibility path. | REQ-012; design clean-cut GraphQL removal. | `skills-graphql.e2e.test.ts` introspection absence and create-without-`.git`. | No replacement for version activation/diff flows. |
| `autobyteus-web/components/skills/SkillVersioningPanel.spec.ts` and versioning components/modal/diff parser tests | Frontend versioning badge/button/list/compare flows render and work. | Skill Detail must not expose built-in versioning controls or compare workflow. | REQ-009, AC-008; user screenshot request; design UI removal. | `SkillDetail.spec.ts` asserts no `Enable Versioning` text and still renders loaded skill header. | No replacement for removed UI; normal workspace tests remain. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | None this round | Existing implementation-updated durable coverage already covers required API/E2E/unit/frontend boundaries and was reviewed by code reviewer. | N/A | API/E2E will not add repository-resident durable coverage after code review unless final execution reveals a gap. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | None this round | None planned after code review. | N/A | Implementation already updated durable tests before code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A this round | No additional removals planned after code review. | N/A | Stale coverage was already removed by implementation and reviewed by code reviewer. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Temporary Vitest probe under `/tmp` using `loadAllAgentTools()`, `defaultToolRegistry`, temp app data dir, and retained tool execution. | Retained skills tools are reachable through the runtime registry path, removed names are absent, `get_available_skills`/`get_skill_content` execute against real `SkillService`, and a stale removed configured tool name is skipped by `resolveAutoByteusAgentTools()` without compatibility alias. | Existing durable registry/unit tests cover the same stable contracts; the probe combines multiple boundaries for this task's evidence only. |
| TEMP-002 | Temporary Vitest/GraphQL probe with a pre-existing `.git/HEAD` marker under a skill directory, followed by GraphQL `skill`, `updateSkill`, `uploadSkillFile`, and `skillFileTree`. | Existing `.git` directory is not deleted or managed during normal skill API/file workspace operations; no migration/cleanup is performed. | Pre-existing `.git` preservation is an accepted residual/user-data non-migration check; durable service/API tests already cover no `.git` creation. |
| TEMP-003 | Active-source scan excluding `node_modules`, build output, and task tickets. | No active source/docs/tests/frontend generated artifacts retain removed agent tool names or skill-versioning symbols, except unrelated managed-messaging `activeVersion`. | Scan is execution evidence, not a durable test artifact. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live browser UI against a running backend for `/tools` and Skill Detail | Current durable backend GraphQL e2e, frontend component/store tests, and Nuxt build cover the affected contracts without standing up a browser app. Starting a full browser stack would add little beyond existing evidence for this cleanup. | Low; browser-only integration issues are possible but affected UI code is component-tested and build-tested. | None unless targeted tests/build fail. |
| Full LLM/runtime websocket run using real model providers | Removed tool-name behavior can be proved at resolver/registry boundary; full runtime depends on external binaries/models and is broader than this change. | Low for this cleanup; stale persisted names use existing generic skip/warn path. | None unless resolver probe fails. |
| Delivery integrated-state refresh against latest `origin/personal` | Delivery owns branch refresh/integrated-state check per team process; worktree is behind `origin/personal` by 4 commits per code review. | Integration conflicts or docs drift may appear later. | Delivery engineer must refresh and recheck integrated state. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Upstream requirements/design/code review all align on clean-cut removal and preservation boundaries. | N/A |

## Execution Plan

1. Run repository hygiene/static checks: `git diff --check` and active-source removed-symbol scan excluding historical task artifacts/build output.
2. Run backend API/E2E and retained-tool/service coverage:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/skills/get-available-skills.test.ts tests/unit/agent-tools/skills/get-skill-content.test.ts tests/unit/skills/services/skill-service.test.ts tests/unit/skills/services/skill-sources-management.test.ts tests/e2e/skills/skills-graphql.e2e.test.ts tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts`
3. Run temporary executable probes `TEMP-001` and `TEMP-002` from `/tmp`; remove temporary files afterward.
4. Run frontend executable coverage for Skill Detail/store/page and product Tools/MCP preservation:
   - `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/skills/SkillDetail.spec.ts components/skills/SkillsList.spec.ts stores/__tests__/skillStore.spec.ts pages/__tests__/skills.spec.ts stores/__tests__/toolManagementStore.mcpGateway.spec.ts components/tools/__tests__/McpGatewayPanel.spec.ts components/tools/__tests__/McpManagementTabs.spec.ts components/tools/__tests__/McpServerFormModal.spec.ts`
5. Run build/compile confidence where practical:
   - `pnpm -C autobyteus-server-ts build`
   - `pnpm -C autobyteus-web guard:web-boundary`, `pnpm -C autobyteus-web guard:localization-boundary`, `pnpm -C autobyteus-web audit:localization-literals`, and `pnpm -C autobyteus-web build`.
6. If all pass and no durable coverage is edited in this API/E2E stage, write the execution coverage report and hand off to `delivery_engineer`. If any API/E2E-stage durable coverage edit becomes necessary, update this investigation/report and route to `code_reviewer` before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing implementation-updated durable coverage is valid and already passed code review. API/E2E will add only task artifacts and temporary probes unless a final execution failure reveals a real coverage gap.
