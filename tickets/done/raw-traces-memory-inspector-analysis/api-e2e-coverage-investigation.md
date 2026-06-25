# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-traces-memory-inspector-analysis/tickets/done/raw-traces-memory-inspector-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass handoff to `api_e2e_engineer` for Memory Inspector raw-trace file selector validation.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed behavior to prove is a Memory Inspector Raw Traces file-selector flow. The Raw Traces tab must default to active `raw_traces.jsonl`, request raw trace file summaries while the raw tab is active, list active plus complete rotated segments with record counts, exclude pending/incomplete segments, select by backend-listed file name only, read the selected file only, preserve the normalized `MemoryTraceEvent` shape, preserve `rawTraceLimit` per selected file, support imported/read-only memory sources, and keep existing `includeArchive` merged-corpus behavior available for non-inspector callers. The implementation handoff's Legacy / Compatibility Removal Check is clean: no physical file rename, no compatibility fallback/wrapper, no old active-only hidden-segment behavior retained as the inspector behavior, and self-evolution-local source discovery was removed in favor of the shared agent-memory service.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| GraphQL memory view accepts `includeRawTraceFiles` and `rawTraceFileName`, returns `rawTraceFiles` and `selectedRawTraceFileName`. | Added | REQ-002 through REQ-006; design DS-001/DS-002/DS-004; implementation handoff "What Changed". | Needs live GraphQL-schema execution coverage, not only unit converter/type checks. |
| Backend selected-file mode defaults to active `raw_traces.jsonl` and reads only selected backend-known file. | Added / Changed | REQ-001, REQ-005, REQ-006; AC-001, AC-003, AC-005. | Existing unit coverage is useful; add durable GraphQL E2E around request/response behavior. |
| Complete rotated segment listing is active first, newest complete segments to oldest, with counts/timestamps, pending hidden. | Added | REQ-003, REQ-004, REQ-007; AC-002, AC-004; design ordering guidance. | Existing unit coverage is valid; live GraphQL E2E should assert ordering and pending exclusion. |
| Invalid absolute/path-like selector falls back to backend default instead of reading arbitrary path. | Added / Safety boundary | REQ-006; AC-005; code-review residual risk. | Existing service unit is valid; add GraphQL E2E because transport must forward the unsafe selector safely. |
| Imported/read-only memory source uses same selector behavior with warnings disabled. | Added / Preserved | UC-005; REQ/AC-007; resolver source handling. | Needs executable coverage through GraphQL `source: { type: IMPORTED }`. |
| Existing `includeArchive: true` merged corpus remains for non-selected-file callers. | Preserved | REQ-009; design legacy policy says merged corpus is intentional, not legacy. | Existing GraphQL E2E covers archive corpus; retain and extend with selected-file no-regression checks. |
| Frontend store/component render and send backend-listed filenames only. | Added / Changed | AC-005, AC-008; implementation handoff frontend changes. | Existing frontend unit/component tests are still valid; rerun them. No browser E2E is required for this backend-focused selector ticket. |
| Self-evolution work-trace projection uses shared raw-trace file source service. | Changed / Cleanup | REQ-010; implementation handoff. | Existing self-evolution targeted test is valid; rerun to guard preservation. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-service.test.ts` | Covers active raw trace reads/limit, includeArchive corpus, raw trace file listing, selected segment read, pending exclusion through expected list, invalid absolute selector fallback, missing run non-creation, include flags. | REQ-001, REQ-003, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009; AC-001 through AC-006. | Still Valid | Test assertions match approved current behavior and implementation handoff. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/api/graphql/converters/memory-view-converter.test.ts` | Maps domain raw trace file summaries and selected filename to GraphQL output model. | GraphQL return fields in design DS-004. | Still Valid | Unit verifies converter transport shape; still required but not sufficient for live GraphQL execution. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/api/graphql/types/memory-view-types.test.ts` | Type class assignment for rawTraceFiles and selectedRawTraceFileName. | GraphQL schema object additions. | Still Valid | Matches changed transport model. | Retain and rerun. |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` existing scenario | Builds current schema and executes `getAgentRunMemoryView` with `includeArchive: true`, proving merged archive+active raw trace response. | REQ-009 preservation; code-review residual includeArchive preservation. | Needs Update | The existing scenario is still valid for merged-corpus preservation but does not cover new raw trace file selector fields/args. | Extend with GraphQL E2E cases for active-only, segmented, invalid absolute selector fallback, imported read-only memory, and includeArchive preservation. |
| `autobyteus-web/tests/stores/memoryInspectorStore.test.ts` | Store default fetch omits raw traces; opening raw tab requests raw traces and file summaries; selecting raw trace file sends filename selector; team member variables preserved. | AC-005, AC-008; design DS-001/DS-002. | Still Valid | Store owns request state and backend-selected file reconciliation. | Retain and rerun. |
| `autobyteus-web/components/memory/__tests__/RawTracesTab.spec.ts` | Component renders dropdown labels/counts and emits selected filename; limit button still emits update. | REQ-002 through REQ-004; AC-002, AC-006, AC-008. | Still Valid | Presentation-only assertions match design; no browser E2E needed unless frontend unit fails. | Retain and rerun. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` | Self-evolution work-trace projection still sees raw trace source behavior after shared service refactor. | REQ-010; design decommission duplicate source listing. | Still Valid | Implementation handoff identifies this as targeted preservation coverage. | Retain and rerun. |
| `autobyteus-web/generated/graphql.ts` | Generated frontend GraphQL operation/type artifact manually aligned with query/schema changes. | Code-review residual risk; implementation handoff codegen note. | Needs Update / Verify | Live codegen requires a backend schema URL. If feasible after backend schema execution, run codegen against a generated/running updated schema and check no diff; otherwise record blocker. | Attempt feasible verification after GraphQL E2E. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No relevant durable coverage currently asserts the old Memory Inspector behavior as active-only with hidden segments. | Code review found no stale tests; existing active-only tests now represent default selected active-file behavior, not hidden-segment UX. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-GQL-RTF-001 | Active-only run GraphQL response returns only active file summary, selected active filename, and active records. | REQ-001, REQ-002, REQ-003, AC-001. | Update `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts`. | Proves schema/resolver/service integration for the default Memory Inspector raw-tab flow. |
| API-GQL-RTF-002 | Segmented run GraphQL response lists active plus complete segments newest-to-oldest, hides pending segment, and selecting a segment returns only that segment's records. | REQ-003, REQ-004, REQ-005, REQ-007; AC-002, AC-003, AC-004. | Update `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts`. | Existing unit coverage does not prove live GraphQL argument/field wiring. |
| API-GQL-RTF-003 | Invalid absolute selector falls back to default active file and does not return segment/path records. | REQ-006; AC-005; code-review residual. | Update `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts`. | Safety boundary should be durable at API boundary. |
| API-GQL-RTF-004 | Imported read-only memory source supports the same raw trace file selector behavior through GraphQL `source`. | UC-005; REQ/AC-007. | Update `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts`. | Imported source was explicitly in scope and not covered by existing unit tests. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-GQL-RTF-005 | `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` existing includeArchive scenario | Keep current merged corpus assertion and run it alongside new selected-file GraphQL scenarios. | REQ-009; code-review residual includeArchive preservation. | This is preservation, not compatibility-only legacy coverage. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | No stale/obsolete durable coverage found. | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-CODEGEN-001 | Attempt to validate/regenerate `autobyteus-web/generated/graphql.ts` against the updated schema if practical from the local checkout. | Generated frontend operation/types remain aligned with schema/query. | Codegen output is durable if changed, but a temporary generated-schema/server harness is only execution scaffolding. |
| TEMP-DIFF-001 | `git diff --check` after durable coverage edits. | No whitespace/conflict-marker issues. | Repository hygiene check only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser UI E2E for clicking the dropdown in a running Nuxt app | Existing component/store tests cover presentation and request state; the new high-risk boundary is backend GraphQL/service integration. Running full app E2E is disproportionate for this ticket and no existing browser Memory Inspector E2E harness was found. | Low to medium: CSS/rendering browser specifics are not directly exercised. | Delivery can perform manual UI smoke if desired; no reroute needed. |
| Full frontend typecheck | Implementation handoff records known baseline blockers (`vue-tsc` missing, `.nuxt` tsc broad unrelated declaration/type issues). | Low for this change because targeted frontend tests and guards cover changed files. | Record as known baseline; no reroute unless targeted tests fail. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently identified. | N/A | Upstream artifacts clearly specify filename selector, no absolute paths, imported source support, and includeArchive preservation. | N/A |

## Execution Plan

1. Add narrow durable GraphQL E2E coverage to `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` for API-GQL-RTF-001 through API-GQL-RTF-005.
2. Run the updated memory GraphQL E2E suite.
3. Run existing targeted backend unit/self-evolution coverage listed in the implementation handoff.
4. Run existing targeted frontend store/component coverage and frontend boundary/localization guards.
5. Attempt practical codegen verification for `autobyteus-web/generated/graphql.ts`; if live codegen cannot be supported, record the exact blocker and rely on schema E2E plus generated artifact diff review.
6. Run `git diff --check`.
7. Write the execution coverage report. Because durable repository-resident E2E coverage will be added/updated after code review, route the cumulative package back to `code_reviewer` for a narrow coverage-code review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable unit/frontend coverage is valid but insufficient at the GraphQL API/E2E boundary. Add durable GraphQL E2E coverage and return to code review after execution.
