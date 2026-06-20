# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/done/simplify-provided-tools/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/done/simplify-provided-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/done/simplify-provided-tools/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/done/simplify-provided-tools/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/done/simplify-provided-tools/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/done/simplify-provided-tools/code-review-report.md`
- Current Investigation Round: `2` (`Round 5` superseding implementation, commit `058f1342`)
- Trigger: Code-review pass for superseding Round 5 implementation migrating `load_skill` to server-owned Skills tools.
- Prior Investigation Reviewed: `Yes`; prior API/E2E artifacts in this path are superseded and not final evidence for Round 5.
- Latest Authoritative Investigation: `2`

## Current Requirement And Design Basis

The Round 5 approved state is a clean-cut cleanup plus ownership migration. The local/server Skills tool category must contain exactly `get_available_skills`, `get_skill_content`, and migrated `load_skill`; `load_skill` must no longer be registered from `autobyteus-ts` core under `General`. The five local `Tool Management` agent tools and `create_skill_version` must remain removed. Built-in skill versioning must remain removed from backend services, GraphQL schema, frontend documents/store/UI/generated types, tests, and docs.

Migrated `load_skill` remains distinct from inspection-oriented `get_skill_content`: it is runtime/use-oriented and must return skill base-path context, path-resolution guidance, rewritten resolvable Markdown links/absolute-path formatting, and enforce skill-access policy from tool context. It must reject unmanaged arbitrary path-like input unless the path resolves to a server-managed skill root. Normal skill catalog/CRUD/source reload/file workspace operations and product `/tools` browsing/MCP management must remain. Skill creation through service/GraphQL/UI must create the skill directory and `SKILL.md` only, without `.git`; existing `.git` directories are user data and must not be deleted or managed.

Implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms, no legacy old behavior retained, dead/obsolete paths removed, and changed source files under guardrails. Code review Round 2 passed with no findings and explicitly says prior API/E2E artifacts are superseded for Round 5.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Server Skills tool group registers exactly `get_available_skills`, `get_skill_content`, `load_skill` | Changed / Added | REQ-004, REQ-004A, AC-002, AC-003; implementation handoff Round 5 | Need catalog/registry category check and runtime execution check for all three tools. |
| Legacy core/General `load_skill` source/registration | Removed after migration | REQ-004A, AC-012; design dependency rules; implementation handoff | Need active-source scan/build and catalog check that `load_skill` is not under `General`. |
| Migrated server `load_skill` runtime/use output | Added / Preserved by migration | REQ-004B, AC-004; code-review focus | Need direct durable unit coverage and a real-service temporary probe for base path, guidance, link rewriting. |
| `load_skill` arbitrary unmanaged path registration/loading | Removed | REQ-004C; implementation handoff notes path-like rejection | Need direct unit coverage and temporary real-service probe for unmanaged rejection and managed path acceptance. |
| `load_skill` skill access modes (`NONE`, `PRELOADED_ONLY`) | Preserved / Changed owner | REQ-004B; code-review focus | Need durable unit coverage plus temporary real-service probe. |
| Tool Management local agent tools and `create_skill_version` | Removed | REQ-001 through REQ-003, REQ-005, REQ-012 | Need registry/catalog absence and active-source scan. |
| Skill versioning backend/GraphQL/frontend | Removed | REQ-006 through REQ-010, AC-006 through AC-009 | Need GraphQL schema absence, frontend Skill Detail/store checks, active-source scan. |
| Skill creation and file workspace | Preserved without versioning side effects | REQ-007, REQ-009, AC-005, AC-008 | Need GraphQL/service tests, UI component tests, temporary `.git` preservation probe. |
| Product Tools/MCP browsing/management | Preserved | REQ-011, AC-010 | Need Tools/MCP frontend tests and catalog e2e. |
| Existing `.git` directories in skills | Preserved as user data | Out of scope/constraints; implementation assumption | Use temporary probe to verify normal GraphQL/file operations do not delete/manage `.git`. |
| Stale persisted definitions with removed tool-management/versioning names | Accepted residual missing-tool behavior | Design/code-review residual risks | Use temporary resolver probe; no compatibility alias coverage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | After core `registerTools()` and server `loadAllAgentTools()`, LOCAL catalog excludes removed tools/categories, includes `get_available_skills`, `get_skill_content`, `load_skill`, has Skills group exactly those three, and General does not contain `load_skill`. | AC-001, AC-002, AC-003, REQ-011, REQ-012 | Still Valid | Current source explicitly asserts Round 5 category/absence/presence behavior. | Execute as Round 5 API/E2E coverage. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/load-skill.test.ts` | Migrated `load_skill` returns base path/guidance/link rewriting, allows managed path-like input, rejects unmanaged path, blocks PRELOADED_ONLY disallowed/path loads, blocks NONE. | REQ-004A/B/C, AC-004 | Still Valid | Current source covers the new Round 5 focus in direct unit form. | Execute; supplement with real-service temp probe. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/get-available-skills.test.ts` | Retained skill discovery tool returns JSON list and errors correctly. | REQ-004, AC-004 | Still Valid | Retained behavior remains required. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/get-skill-content.test.ts` | Retained inspection/content tool returns SKILL.md and file tree and handles errors. | REQ-004, AC-004 | Still Valid | Distinguishes inspection tool from runtime/use `load_skill`. | Execute. |
| `autobyteus-server-ts/tests/e2e/skills/skills-graphql.e2e.test.ts` | GraphQL skill create/query no `.git`, removed skill-versioning schema absent, file upload/content/tree/reload/delete preserved. | AC-005, AC-006, AC-007, REQ-007, REQ-008 | Still Valid | Current test titles cover GraphQL/API skill surface. | Execute. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` | SkillService CRUD/file/configured skill behavior; create leaves no `.git`. | REQ-006, REQ-007, normal Skills preservation | Still Valid | Current source includes no-`.git` and CRUD/file tests. | Execute. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-sources-management.test.ts` | Multi-source skill discovery/source management and nested skill loading. | REQ-004C, normal source-managed path model | Still Valid | Validates server-managed skill sources that `load_skill` relies on. | Execute. |
| `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts` | Core prompt guidance mentions `load_skill` only when tool is actually available; NONE/PRELOADED_ONLY/global discovery prompt behavior. | REQ-004A/B, prompt-guidance migration | Still Valid | Current source covers gating on actual tool exposure and link rewriting in prompt details. | Execute. |
| `autobyteus-ts/tests/integration/agent/agent-skills.test.ts`, `tests/unit/skills/loader.test.ts`, `tests/integration/skills/loader.test.ts` | Core skill registry/loader and agent skill injection continue after core `load_skill` removal. | Core prompt/skill preservation after migration | Still Valid | Listed in implementation/code-review checks. | Execute. |
| Deleted `autobyteus-ts/src/tools/skill/load-skill.ts` and old direct core tests | Old core/General `load_skill` implementation/direct tests. | REQ-004A, AC-012 | Stale / Remove | Core/General ownership is obsolete after migration. | Confirm absent via scan; do not restore. |
| Deleted server Tool Management direct tests and `create_skill_version` tests | Removed internal diagnostics and versioning tool exist. | REQ-001 through REQ-006, REQ-012 | Stale / Remove | Behavior intentionally removed. | Confirm absent via scan; do not restore. |
| Deleted skill-versioning service/integration tests and frontend versioning panel/modal/diff parser tests | Built-in skill versioning service/UI exists. | REQ-006 through REQ-010, REQ-012 | Stale / Remove | Built-in versioning intentionally removed. | Confirm absent via scan; do not restore. |
| `autobyteus-web/components/skills/SkillDetail.spec.ts`, `SkillsList.spec.ts`, `pages/__tests__/skills.spec.ts`, `stores/__tests__/skillStore.spec.ts` | Skill Detail/page/store behavior without versioning controls/actions. | REQ-009, REQ-010, AC-008, AC-009 | Still Valid | Frontend Skill Detail/file workspace unchanged by Round 5 but still in scope. | Execute. |
| `autobyteus-web/stores/__tests__/toolManagementStore.mcpGateway.spec.ts`, `McpGatewayPanel.spec.ts`, `McpManagementTabs.spec.ts`, `McpServerFormModal.spec.ts` | Product Tools/MCP UI/store remains functional. | REQ-011, AC-010 | Still Valid | Product tools/MCP must remain. | Execute. |
| Full live browser UI and full real LLM/runtime websocket suites | End-to-end browser/LLM flows | Broad runtime confidence | Out Of Scope for required final run | A lower-flake combination of GraphQL catalog, registry-created tool execution, frontend component/store tests, and build proves changed boundaries. | Do not run unless a targeted check reveals a gap. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/tools/skill/load-skill.test.ts` and `autobyteus-ts/tests/integration/tools/skill/load-skill.test.ts` | Core/General `load_skill` exists and owns skill loading. | `load_skill` is migrated to server Skills; core implementation/registration must be removed. | REQ-004A, AC-012, implementation handoff Round 5. | `autobyteus-server-ts/tests/unit/agent-tools/skills/load-skill.test.ts`; catalog e2e. | Direct core tests would preserve wrong owner/category. |
| `autobyteus-server-ts/tests/unit/agent-tools/tool-management/*.test.{ts,js}` | Five internal diagnostic local tools exist. | Tool Management agent tools are intentionally removed. | REQ-001 through REQ-003. | Catalog absence e2e and active-source scan. | No direct replacement for deleted diagnostics. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/create-skill-version.test.{ts,js}` | `create_skill_version` tool exists. | Built-in skill versioning is removed. | REQ-005, REQ-006, REQ-012. | Registry/catalog absence and GraphQL schema absence. | No replacement for removed versioning tool. |
| Skill-versioning service/integration tests | Git tag/diff/activate lifecycle exists. | Backend no longer owns skill Git versioning. | REQ-006, REQ-007, REQ-012. | No-`.git` create coverage, schema absence, `.git` preservation probe. | Version lifecycle intentionally removed. |
| Frontend SkillVersioningPanel/CompareModal/diff parser tests | Built-in versioning UI exists. | Skill Detail must not expose versioning. | REQ-009, AC-008. | Skill Detail no-versioning tests and build/source scan. | No replacement for removed UI flow. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | None planned by API/E2E after code review | Existing implementation-updated durable coverage already covers Round 5 public contracts and passed code review. | N/A | API/E2E will not add repository-resident durable coverage unless execution reveals a real gap. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | None planned by API/E2E after code review | None. | N/A | Round 5 durable tests were implementation-owned and already reviewed. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A this round | No additional API/E2E removals planned. | N/A | Stale coverage was already removed before code review. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-R5-001 | Temporary Vitest probe under `autobyteus-server-ts/tests/.tmp` using real `SkillService`, core `registerTools()`, server `loadAllAgentTools()`, and registry-created tools. | Real registry/runtime path exposes exactly the three Skills tools, not core/General `load_skill`; `load_skill` returns base path/guidance/re-written links; `get_available_skills` and `get_skill_content` remain callable; stale removed names skip generically. | Existing durable catalog/unit tests cover stable contracts; this combines boundaries for current task evidence only. |
| TEMP-R5-002 | Temporary GraphQL/SkillService probe with a pre-existing `.git/HEAD` marker and normal skill query/update/upload/tree operations. | Existing `.git` user data is not deleted/managed while normal skill APIs/workspace still work. | Accepted residual no-migration behavior; durable tests already cover no `.git` creation. |
| TEMP-R5-003 | Static active-source scans excluding `tickets`, `node_modules`, build output. | Removed symbols absent; old core `load_skill` source/registration absent; migrated server `load_skill` and prompt guidance are the only expected load-skill-related matches. | Scan evidence is task-specific and does not need repository test code. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live browser run for `/tools` and Skill Detail | Backend GraphQL e2e, frontend component/store tests, and Nuxt build cover changed contracts without needing a full browser server. | Low; browser-only integration issues remain possible but UI code is component/build covered. | None unless targeted checks fail. |
| Full real LLM/runtime websocket invocation | `load_skill` runtime/tool behavior can be proven through registry-created tool execution and direct resolver path without external model/binary dependencies. | Low for this ownership migration. | None unless registry/tool probe fails. |
| Delivery reconciliation of untracked superseded delivery artifacts | Delivery owns final ticket artifact reconciliation and integrated-state refresh. | Low; untracked delivery artifacts could confuse final handoff if not reconciled. | Delivery engineer follow-up after API/E2E pass. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Round 5 requirements/design/implementation/code review align. | N/A |

## Execution Plan

1. Run `git diff --check`.
2. Run active-source scans for removed tool/versioning symbols, legacy core `load_skill` registration/source, and scoped `activeVersion`/`isVersioned` results.
3. Run core build and prompt/skill coverage:
   - `pnpm -C autobyteus-ts build`
   - `pnpm -C autobyteus-ts exec vitest run tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts tests/integration/agent/agent-skills.test.ts tests/unit/skills/loader.test.ts tests/integration/skills/loader.test.ts`
4. Run server API/E2E/unit coverage:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/skills/get-available-skills.test.ts tests/unit/agent-tools/skills/get-skill-content.test.ts tests/unit/agent-tools/skills/load-skill.test.ts tests/unit/skills/services/skill-service.test.ts tests/unit/skills/services/skill-sources-management.test.ts tests/e2e/skills/skills-graphql.e2e.test.ts tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts`
5. Run temporary Round 5 probes `TEMP-R5-001` and `TEMP-R5-002`; remove probe file afterward.
6. Run frontend coverage:
   - `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/skills/SkillDetail.spec.ts components/skills/SkillsList.spec.ts pages/__tests__/skills.spec.ts stores/__tests__/skillStore.spec.ts stores/__tests__/toolManagementStore.mcpGateway.spec.ts components/tools/__tests__/McpGatewayPanel.spec.ts components/tools/__tests__/McpManagementTabs.spec.ts components/tools/__tests__/McpServerFormModal.spec.ts`
7. Run builds/guards:
   - `pnpm -C autobyteus-server-ts build`
   - `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals && pnpm -C autobyteus-web build`
8. If all pass and no durable coverage is changed by API/E2E, update the execution report and hand off to `delivery_engineer`. If any durable coverage edit is required, return the cumulative package to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Prior API/E2E artifacts are superseded. This investigation is the canonical Round 5 pre-execution coverage decision for commit `058f1342`.
