# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/in-progress/mcp-circular-tool-result/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/in-progress/mcp-circular-tool-result/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/in-progress/mcp-circular-tool-result/design-spec.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/in-progress/mcp-circular-tool-result/design-review-report.md`
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/in-progress/mcp-circular-tool-result/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/in-progress/mcp-circular-tool-result/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass requested API/E2E coverage investigation and execution for the Browser MCP Activity `[Circular]` result bug.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

Current approved behavior to prove:

- JSON-serializable Browser MCP tool results must survive Codex local MCP completion conversion, backend serialization, memory/projection, and Activity display as actual normalized result content instead of the serializer placeholder string `[Circular]`.
- Backend payload serialization must distinguish repeated shared references from true ancestor cycles. Shared result references must serialize as duplicated JSON-safe values; true cycle edges must still become `[Circular]` without crashing streaming or persistence.
- Browser MCP result normalization remains backend-owned. Browser MCP and frontend Activity rendering must not be changed to mask or reinterpret `[Circular]`.
- Non-Browser and unknown MCP behavior must remain unchanged except for corrected shared-reference serialization.
- Literal string `[Circular]` remains a legitimate tool result value and must not be broadly skipped by parser or UI fallback logic.
- Implementation handoff `Legacy / Compatibility Removal Check` is clean: no compatibility wrapper, no old behavior retained, and no frontend/parser workaround was introduced.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `serializePayload(...)` graph traversal for repeated shared object references | Changed | Requirements `REQ-002`, design DS-002, implementation handoff `What Changed`, code review report review scope | Retain and execute serializer durable unit coverage proving shared references duplicate as JSON-safe values and true cycles remain safe. |
| Browser MCP Codex local completion conversion with aliased `params.item.result` and top-level `params.result` | Changed / Covered regression shape | Requirements `AC-003`, design migration sequence, implementation handoff added converter regression | Retain and execute converter durable unit coverage proving Activity success payload emits normalized Browser result, not `[Circular]`. |
| Browser MCP result normalizer ownership and behavior | Preserved | Requirements `REQ-004`, design ownership map, code review no production normalizer change | Execute existing Browser normalizer tests; no update needed. |
| Frontend Activity rendering of backend-supplied result | Preserved | Requirements `AC-005`, design DS-003, implementation handoff no frontend workaround | Source-review current renderer and run backend event/projection checks; no frontend durable change needed. |
| Memory/run-history projection of tool result payloads | Preserved but in scope for verification | Requirements `REQ-001`, implementation handoff downstream hint, code review residual risk | Existing generic integration/API coverage remains valid; add a temporary cross-boundary probe to verify a normalized Browser result produced by converter persists/projects as object and not `[Circular]`. |
| Genuine circular payload cycle-edge placeholder | Preserved | Requirements `REQ-003`, design DS-002, implementation handoff | Execute serializer unit coverage. |
| Literal string `[Circular]` as legitimate tool result | Preserved | Requirements risk/open question; implementation handoff downstream hint; design rejects broad parser placeholder-skipping | Verify by direct Browser MCP probe returning literal string and by source review that no parser/UI placeholder skip was introduced. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/payload-serialization.test.ts` | Serializer returns `{}` for non-objects, handles true circular objects as `[Circular]`, preserves shared references as duplicated JSON-safe values, converts BigInt to string. | `REQ-002`, `REQ-003`, `AC-002`, design DS-002 | Still Valid | Static inspection confirms implementation-added shared-reference test and existing true-cycle test match approved behavior. | Execute as final durable coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex event converter maps local MCP completions, normalizes Browser MCP envelopes, and now covers aliased Browser MCP `run_script` result references without `[Circular]`. | `REQ-001`, `REQ-004`, `AC-003`, design DS-001 | Still Valid | Static inspection confirms new aliased Browser MCP regression exercises `params.item.result` and top-level `params.result` sharing one envelope. | Execute as final durable coverage. |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-mcp-result-normalizer.test.ts` | Browser result normalizer unwraps direct JSON, content text envelopes, nested envelopes, and `structuredContent`; leaves unknown non-Browser tools raw. | `REQ-004`, `REQ-005`, `AC-004` | Still Valid | Normalizer production code was reused unchanged; test assertions align with current ownership. | Execute as final durable coverage. |
| `autobyteus-server-ts/tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts` | Runtime memory writer persists tool args/result into raw traces and projects both conversation and Activity surfaces. | `REQ-001` memory/projection portion; implementation downstream hint for persisted run history | Still Valid | Test is generic and does not depend on old serializer behavior; it proves object tool results persist/project once event payload is correct. | Execute as final integration coverage. |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | GraphQL `getRunProjection` / team member projection returns local replay Codex tool rows with arguments and results. | `REQ-001` API/projection surface | Still Valid | Current GraphQL projection is generic over tool results; no stale expectations found. | Execute as final API/E2E coverage. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` and existing handler tests | Success event handler stores `parsed.result` into lifecycle segment and Activity store. | `REQ-001`, `AC-005`, design DS-003 | Still Valid | Source shows `setToolActivityResult(..., segment.result, null)` with no `[Circular]` workaround. Existing tests cover terminal success state and result assignment at segment level. | Source-review for this task; no durable update needed. |
| `autobyteus-web/components/progress/ToolActivityItem.vue` and `ToolActivityItem.spec.ts` | Activity card renders strings as-is and objects with `JSON.stringify`; no Activity-specific placeholder synthesis. | `AC-005`, design DS-003 | Still Valid | Source shows `formatJson` returns strings as-is and object JSON; grep shows `[Circular]` marker only in unrelated `uiErrorStore`, not Activity. Existing component test is status-only, but renderer has no changed code. | Source-review; no durable update needed. |
| `autobyteus-web/stores/uiErrorStore.ts` safe stringifier | UI error details use a local circular placeholder for error reporting only. | Out of changed Activity result scope | Out Of Scope | Grep found `[Circular]` here, but it is not the tool Activity renderer or backend event projection. | No action. |
| Full interactive Browser MCP Activity UI through a live Codex agent run | Would prove visible Activity panel against a real LLM/tool run. | `UC-001`, `REQ-001`, downstream code-review hint | Out Of Scope for durable automated coverage in this round | No deterministic repository harness was found for forcing a live Codex Browser MCP tool call through the full UI without model behavior/network variability. The corrected deterministic boundary is backend converter + serializer + memory/projection, with direct Browser MCP probe for real MCP output. | Use temporary direct MCP probe and temporary converter-to-memory/projection probe instead of durable browser/UI E2E. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale or obsolete durable coverage found in the relevant scope. | Requirements/design/code review all preserve current serializer safety, Browser normalizer ownership, memory projection, and frontend renderer contract. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing implementation-added durable unit coverage plus existing generic memory/API projection coverage is adequate for repository-resident regression coverage after source inventory. | N/A | No additional repository-resident durable coverage will be added in API/E2E round 1. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | None. | No existing relevant coverage asserted obsolete behavior or needed changed expected output. | N/A |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | None. | No stale coverage found. | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TMP-001` | Direct Browser MCP `open_tab` and `run_script` against `https://example.com` using the configured Browser MCP runtime. | Browser MCP itself returns JSON-serializable results as structured data and not top-level `[Circular]`. | It validates local runtime configuration and upstream MCP behavior; durable repository coverage should not depend on live browser session/network availability. |
| `TMP-002` | Direct Browser MCP `run_script` returning the literal string `[Circular]`. | Literal `[Circular]` can be legitimate result content and must not be globally treated as a placeholder. | Runtime probe documents the edge for this environment; durable parser skip was intentionally not added. |
| `TMP-003` | Temporary Vitest probe under `autobyteus-server-ts/tests/.tmp/` removed after execution. It converts an aliased Browser MCP `run_script` completion through `CodexThreadEventConverter`, writes the success event through `RuntimeMemoryEventAccumulator`, reads raw traces, builds replay/projection, and asserts result is normalized object and not `[Circular]`. | Cross-boundary proof from serializer/converter to persisted raw trace and run-history projection without adding another permanent overlapping test. | Existing permanent unit tests cover the corrected serializer/converter boundary; existing generic integration/API tests cover memory/projection. This one-off probe composes them for evidence without increasing durable test overlap. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full visible browser UI Activity panel driven by a real Codex agent run that chooses Browser MCP `run_script` | No deterministic repository-resident harness was found that forces a live Codex app-server LLM/tool call through the frontend without model/provider variability. The running Docker app also may not contain this branch's patched source. | Low-to-medium residual product confidence risk, mitigated by direct Browser MCP runtime probe, deterministic converter coverage, source review of frontend renderer, and memory/API projection checks. | Delivery can note manual UI smoke is useful after branch integration/deploy; no requirement/design gap found. |
| Historical already-persisted payloads that already contain `[Circular]` from the old serializer | Out of scope by requirements/design; implementation does not repair historical data. | Existing historical entries may still display old placeholder until regenerated. | Delivery should retain the known residual risk; no API/E2E reroute. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None found before execution. | N/A | Upstream requirements/design/code review are consistent; no compatibility wrapper, legacy branch, or stale coverage found. | N/A |

## Execution Plan

1. Run direct Browser MCP probes for `open_tab`, serializable `run_script`, and literal string `[Circular]` result.
2. Create a temporary Vitest probe under `autobyteus-server-ts/tests/.tmp/`, execute it, then remove it and confirm cleanup.
3. Execute durable backend focused coverage:
   - `corepack pnpm -C autobyteus-server-ts exec vitest tests/unit/services/agent-streaming/payload-serialization.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-tools/browser/browser-mcp-result-normalizer.test.ts`
4. Execute durable memory/API projection coverage:
   - `corepack pnpm -C autobyteus-server-ts exec vitest tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts`
   - `corepack pnpm -C autobyteus-server-ts exec vitest tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
5. Execute implementation health checks relevant after API/E2E:
   - `corepack pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`
   - `corepack pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
   - `git diff --check`
6. Write the execution coverage report with command results, probe evidence, cleanup, and routing decision.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: API/E2E round 1 will not add or remove durable test files. It will retain implementation-added durable unit coverage that already passed code review, execute existing integration/API projection coverage, and use temporary probes for live Browser MCP and cross-boundary persistence evidence.
