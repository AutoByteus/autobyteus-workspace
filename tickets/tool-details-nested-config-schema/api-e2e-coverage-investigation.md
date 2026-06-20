# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema/tickets/tool-details-nested-config-schema/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema/tickets/tool-details-nested-config-schema/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema/tickets/tool-details-nested-config-schema/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema/tickets/tool-details-nested-config-schema/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema/tickets/tool-details-nested-config-schema/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema/tickets/tool-details-nested-config-schema/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and routed the review-passed implementation to API/E2E coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a Tool Details/schema-projection fix only. The backend GraphQL tool-definition projection must expose per-parameter nested JSON Schema so object parameters such as `generate_speech.generation_config` carry nested properties (`voice`, `format`, `instructions`) to the frontend. The frontend Tool Details modal must render nested object properties under their parent parameter, preserve the invocation relationship (`generation_config.voice`, not top-level `voice`), keep flat parameter rendering working, and update an already-open modal after successful Reload Schema without close/reopen. Runtime Agent Tools MCP schema-cache behavior and paid real speech-generation calls remain out of scope.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms, no legacy old-behavior retention, no provider-specific voice-list duplication, and the stale reload-prop comment was removed. Code review confirmed no compatibility wrapper or legacy dual path was introduced.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| GraphQL `ToolParameterDefinition` includes per-parameter `jsonSchema` populated from `ParameterDefinition.toJsonSchemaProperty()` | Added | REQ-001, AC-006, design DS-001, implementation handoff "What Changed" | Needs API/E2E coverage at the GraphQL query boundary, not only converter unit coverage. |
| Tool Details modal displays nested object properties under the parent row with path/depth context | Changed | REQ-002, REQ-004, AC-001 through AC-004, design DS-001/DS-003 | Existing component/mapper durable coverage remains valid and should be executed. Browser E2E is not required if component coverage proves the UI rendering boundary and the API boundary is separately exercised. |
| Nested metadata display includes required/default/enum/description when present | Changed | REQ-003, AC-002 | Existing mapper/modal tests cover enum/default/required; execute them. |
| Tool invocation contract remains nested object input; no top-level `voice` parameter | Preserved | REQ-004, AC-003, design examples and backward-compatibility rejection log | Coverage should assert `voice` is under `generation_config.jsonSchema.properties`, not a top-level parameter. |
| Flat-only tools continue to render as before | Preserved | REQ-005, AC-004 | Existing mapper test for top-level row retention and modal rendering should be executed; no separate browser E2E needed. |
| Reload Schema in an already-open modal updates selected tool from returned mutation payload | Changed | REQ-006, AC-005, AC-007, design DS-002, architecture review AR-001 resolution | Existing parent-wired component coverage remains valid and should be executed. |
| Runtime Agent Tools MCP schema-cache refresh | Preserved / Out Of Scope | Requirements Out of Scope and implementation/code-review residual notes | Do not add or execute coverage for runtime MCP schema cache behavior. |
| Real OpenAI speech generation invocation | Out Of Scope | Requirements Out of Scope | Do not execute paid external OpenAI calls. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/api/graphql/converters/tool-definition-converter.test.ts` | Converter projects a nested `generation_config` object parameter JSON Schema with nested enum properties. | REQ-001, AC-006, DS-001 | Still Valid | Added by implementation; code review ran it successfully. It proves the converter, but not GraphQL schema query selection. | Execute as focused durable backend projection coverage. |
| `autobyteus-web/components/tools/__tests__/toolParameterDisplayRows.spec.ts` | Pure mapper expands object `jsonSchema.properties` into nested rows and preserves unsupported top-level rows. | REQ-002, REQ-003, REQ-004, AC-001 through AC-004, DS-003 | Still Valid | Added by implementation; covers `generation_config.voice`, `format`, `instructions`, required, default, enum, and graceful degradation. | Execute as focused durable frontend display mapping coverage. |
| `autobyteus-web/components/tools/__tests__/ToolDetailsModal.spec.ts` | Modal renders nested object rows with parent path and enum values. | REQ-002, REQ-003, REQ-004, AC-001 through AC-004, DS-001 | Still Valid | Added by implementation; code review ran it successfully. | Execute as focused durable frontend presentation coverage. |
| `autobyteus-web/components/tools/__tests__/ToolsManagementWorkspace.reloadSchema.spec.ts` | Already-open modal rerenders from the returned tool after Reload Schema without close/reopen. | REQ-006, AC-005, AC-007, DS-002 | Still Valid | Added by implementation after architecture review AR-001; code review ran it successfully. | Execute as focused durable reload synchronization coverage. |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Media tools execute through local registry with mocked providers and dynamic model schemas update when default settings change. | Invocation-contract preservation and media schema source context | Needs Update | Existing test proves media schema/invocation flow but does not query the GraphQL tool-definition boundary or assert nested `jsonSchema` for `generate_speech`. It already has safe mocked media-model setup suitable for this API boundary. | Add one API/E2E scenario here to query GraphQL `tools(origin: LOCAL)` after registering mocked OpenAI TTS model schema and assert nested `generation_config.jsonSchema.properties.voice/format/instructions`. |
| `autobyteus-server-ts/tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | GraphQL local tool catalog excludes obsolete MCP wrapper management tools. | Out-of-scope tool catalog cleanup | Out Of Scope | Discovery run passed; it does not exercise media schema or nested `jsonSchema`. | Do not change for this ticket. |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` execution invocation scenario | `generation_config` is passed as nested object to the mocked speech client, not top-level. | AC-003 invocation relationship preservation | Still Valid | Existing scenario asserts `speechCalls` includes `generationConfig: { voice: "Test" }`. | Execute updated media e2e file; no invocation implementation changes needed. |
| `autobyteus-web/generated/graphql.ts` operation/result types | Generated/frontend operation types include `jsonSchema` in tool query/mutation return shapes. | GraphQL/frontend type alignment constraint | Still Valid, manual alignment caveat | Code review confirmed manual alignment because codegen endpoint was unavailable. | Inspect/generated alignment already reviewed; attempt codegen only if a suitable backend schema endpoint is available. Otherwise record blocker and execute focused tests. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | GraphQL `tools(origin: LOCAL)` exposes `generate_speech.generation_config.jsonSchema.properties.voice`, `format`, and `instructions` for a configured `gpt-4o-mini-tts` speech model, and `voice` is not promoted to a top-level parameter. | REQ-001, REQ-004, AC-001, AC-002, AC-003, AC-006, design DS-001 | Update `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Existing converter unit coverage is not enough to prove the actual GraphQL query/API boundary. Existing media e2e setup already safely mocks providers and avoids paid calls. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-001 | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Add in-process GraphQL schema query scenario using mocked OpenAI TTS parameter schema. | REQ-001, AC-001, AC-002, AC-003, AC-006 | This is a repository-resident durable coverage update and must return through `code_reviewer` before delivery. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Execute the focused backend converter test and the updated media API/E2E file through Vitest. | Confirms projection implementation and GraphQL API boundary. | Commands are evidence; durable assertions live in tests. |
| TEMP-002 | Execute focused frontend Nuxt/Vitest component tests for mapper, modal rendering, and reload synchronization. | Confirms UI behavior without standing up a browser app. | Component tests are durable; no extra temporary browser harness needed for this read-only display path. |
| TEMP-003 | Run `pnpm -C autobyteus-web codegen` only if a schema endpoint is reachable; otherwise record endpoint blockage. | Confirms generated types can be regenerated. | Codegen is an environment check; no temporary test artifact should remain. |
| TEMP-004 | Run `git diff --check`. | Confirms patch formatting and no whitespace errors. | Formatting check evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live browser E2E against a running Nuxt UI and backend | Existing durable component tests cover the Tools UI rendering/reload boundary; the API boundary will be covered in-process via GraphQL. Full app E2E setup would add cost without materially increasing confidence for this read-only modal display fix. | Low: split coverage still proves backend API data and frontend rendering/reload behavior. | None unless downstream delivery requires a full manual/browser smoke. |
| `pnpm -C autobyteus-web codegen` against `http://localhost:8000/graphql` | Implementation handoff and code review state no suitable backend endpoint was reachable. | Medium manual-generated-file drift risk, already reviewed. | Attempt if endpoint becomes available; otherwise delivery should record the caveat. |
| Broad frontend `nuxi typecheck` | Implementation handoff records unrelated pre-existing app/test type errors. | Low for this change because focused tests compile changed code paths. | No reroute; delivery may preserve residual caveat. |
| Runtime Agent Tools MCP schema-cache behavior | Explicitly out of scope. | None for approved ticket. | No coverage or reroute. |
| Real paid OpenAI speech generation call | Explicitly out of scope. | None for approved ticket. | No coverage or reroute. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Upstream requirements/design are explicit; code review found no blocking issues or compatibility wrappers. | N/A |

## Execution Plan

1. Add durable API/E2E coverage `API-001` to `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts`, using the existing mocked media-provider setup to configure `DEFAULT_SPEECH_GENERATION_MODEL=gpt-4o-mini-tts`, query the in-process GraphQL schema, and assert nested `generation_config.jsonSchema` contains `voice`, `format`, and `instructions` while `voice` is not top-level.
2. Run focused backend checks:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/graphql/converters/tool-definition-converter.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/media/server-owned-media-tools.e2e.test.ts`
   - `pnpm -C autobyteus-server-ts run build`
3. Run focused frontend checks:
   - `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/tools/__tests__/toolParameterDisplayRows.spec.ts components/tools/__tests__/ToolDetailsModal.spec.ts components/tools/__tests__/ToolsManagementWorkspace.reloadSchema.spec.ts`
4. Attempt codegen only if practical; otherwise record the endpoint blockage inherited from implementation.
5. Run `git diff --check`.
6. Write the execution coverage report with evidence and route back to `code_reviewer` because repository-resident durable coverage was updated after the prior code review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Durable API/E2E coverage is required for the GraphQL query boundary. Because this modifies repository-resident coverage after code review, a pass must return to `code_reviewer` before delivery.
