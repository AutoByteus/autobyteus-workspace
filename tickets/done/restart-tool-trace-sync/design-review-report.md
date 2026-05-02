# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restart-tool-trace-sync/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested after user-approved real Codex E2E / `generate_image` proof.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed requirements, investigation notes, design spec, real evidence artifact paths, current Codex converter/parser/thread notification code, runtime memory accumulator, run-history projection transformers, and frontend run/team open + hydration paths in the task worktree.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review after E2E-confirmed live-to-history argument loss | N/A | None | Pass | Yes | Design is ready for implementation. |

## Reviewed Design Spec

The design fixes the source of persisted argument loss by making Codex MCP `item/started` events emit canonical `TOOL_EXECUTION_STARTED` lifecycle events with arguments, while preserving live `SEGMENT_START`. It hardens MCP terminal events to retain/merge arguments and tightens frontend run/team open behavior so projection conversation and Activity are applied together rather than Activity being hydrated independently while a live transcript is preserved.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as Bug Fix / Behavior Change / Small Refactor. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies Missing Invariant + Boundary/Ownership Issue; real Codex evidence shows raw/live args exist while persisted raw traces and projection args are `{}`. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor needed now at Codex conversion/pending-MCP correlation and frontend projection-application seams. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, dependency rules, migration sequence, and validation plan show how the refactor preserves memory/projection/front-end ownership boundaries. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Codex MCP start to persisted `tool_call` with args | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Codex MCP completion to persisted `tool_result` retaining args | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Projection to transcript + Activity after reload | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Existing live segment-start to Activity upsert | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex backend event conversion | Pass | Pass | Pass | Pass | Correct owner for raw Codex MCP item -> normalized event fanout. |
| Codex thread notification/pending MCP state | Pass | Pass | Pass | Pass | Correct owner for enriching local completion with pending call arguments before deletion. |
| Runtime memory persistence | Pass | Pass | Pass | Pass | Reused as canonical persistence owner; it should receive normalized fields, not parse Codex internals. |
| Run history projection | Pass | Pass | Pass | Pass | Reused; works once raw traces carry canonical args. |
| Frontend run/team open and hydration | Pass | Pass | Pass | Pass | Correct owner for projection-vs-live state application. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| MCP start fanout using dynamic-tool argument normalization | Pass | Pass | Pass | Pass | Design avoids a generic catch-all converter while reusing existing parser semantics. |
| Projection application decision | Pass | Pass | Pass | Pass | Existing `runOpenStrategyPolicy` and coordinators remain the right policy location. |
| Pending MCP call data | Pass | Pass | Pass | Pass | `CodexThread`/notification handler should expose pending calls without leaking map access broadly. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunEvent` lifecycle payload fields | Pass | Pass | Pass | N/A | Pass | `invocation_id`, `tool_name`, `arguments`, `result`, and `error` remain canonical. |
| `RawTraceItem.toolArgs` | Pass | Pass | Pass | N/A | Pass | Stores the persisted canonical args for both `tool_call` and `tool_result`. |
| Projection conversation/activity args | Pass | Pass | Pass | N/A | Pass | No frontend guessing/backfill is introduced. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| MCP `item/started` segment-only conversion | Pass | Pass | Pass | Pass | Replaced by segment + lifecycle fanout. |
| Agent `KEEP_LIVE_CONTEXT` Activity projection hydration | Pass | Pass | Pass | Pass | Activity hydration moves into projection replacement only. |
| Live team loader Activity side effect | Pass | Pass | Pass | Pass | Coordinator/apply path owns paired conversation + Activity application. |
| Existing `{}` history backfill | Pass | N/A | Pass | Pass | Explicitly deferred/out of scope; no compatibility guessing. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Pass | Pass | N/A | Pass | Add MCP start fanout and terminal args at the existing converter boundary. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Pass | Pass | N/A | Pass | Enrich completion from pending state before deletion. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Pass | Pass | N/A | Pass | Encapsulate pending MCP lookup/removal. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Pass | Pass | N/A | Pass | Correct unit target for converter behavior. |
| Memory/projection integration test file | Pass | Pass | N/A | Pass | Exact file can be chosen during implementation; responsibility is clear. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Pass | Pass | N/A | Pass | Correct gated real Codex validation target. |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | Pass | Pass | N/A | Pass | Owns agent projection-vs-live branch behavior. |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Pass | Pass | Pass | Pass | Loader should return projection data and avoid hidden Activity-only mutation. |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Pass | Pass | Pass | Pass | Owns team preserve-vs-replace application. |
| `autobyteus-web/services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts` and team-open tests | Pass | Pass | N/A | Pass | Correct frontend regression coverage. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex converter -> parser helpers | Pass | Pass | Pass | Pass | Memory must not parse nested Codex item shapes. |
| Notification handler -> CodexThread pending state | Pass | Pass | Pass | Pass | Pending state is runtime/thread-local, not converter-local mutable state. |
| Memory accumulator -> normalized lifecycle payloads | Pass | Pass | Pass | Pass | Correct dependency on canonical `AgentRunEvent` fields. |
| Frontend coordinators -> hydration/apply helpers | Pass | Pass | Pass | Pass | Loaders should not mutate Activity independently of projection application. |
| Projection transformers -> raw traces | Pass | Pass | Pass | Pass | No result-text argument guessing. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `CodexThreadEventConverter` | Pass | Pass | Pass | Pass | Emits canonical top-level tool fields. |
| `RuntimeMemoryEventAccumulator` | Pass | Pass | Pass | Pass | Persists normalized tool lifecycle facts; no Codex-specific repair. |
| `openAgentRun` / `openTeamRun` | Pass | Pass | Pass | Pass | Single place for preserve-vs-projection mutation policy. |
| Run projection provider/transformers | Pass | Pass | Pass | Pass | Project persisted facts to both surfaces. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentRunEvent` tool lifecycle payload | Pass | Pass | Pass | Low | Pass |
| `getRunProjection(runId)` | Pass | Pass | Pass | Low | Pass |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Pass | Pass | Pass | Low | Pass |
| `openAgentRun` / `openTeamRun` | Pass | Pass | Pass | Low | Pass |
| Frontend projection loaders | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/` | Pass | Pass | Low | Pass | Existing adapter/converter boundary. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Pass | Pass | Low | Pass | Existing thread notification/state boundary. |
| `autobyteus-server-ts/src/agent-memory/services/` | Pass | Pass | Low | Pass | Reused; no Codex-specific parsing added. |
| `autobyteus-web/services/runOpen/` | Pass | Pass | Low | Pass | Existing UI orchestration boundary. |
| `autobyteus-web/services/runHydration/` | Pass | Pass | Medium | Pass | Design tightens it by removing hidden Activity-only mutation. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Persist MCP args | Pass | Pass | N/A | Pass | Extend Codex converter and reuse memory accumulator. |
| Terminal args hardening | Pass | Pass | N/A | Pass | Extend pending MCP correlation. |
| Reload surface sync | Pass | Pass | N/A | Pass | Extend existing open/hydration strategy. |
| Historical projection mappers | Pass | Pass | N/A | Pass | Reuse; they are source-limited by raw traces. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| MCP segment-only persistence path | No desired retention | Pass | Pass | Replaced by canonical lifecycle start. |
| Memory parsing Codex-specific nested item args | No | Pass | Pass | Explicitly rejected. |
| Frontend argument inference/backfill | No | Pass | Pass | Existing `{}` rows remain a known residual risk. |
| Activity-only projection under live transcript preservation | No desired retention | Pass | Pass | Removed in favor of paired projection application. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend converter and pending-MCP enrichment | Pass | Pass | Pass | Pass |
| Backend memory/projection validation | Pass | Pass | Pass | Pass |
| Frontend projection application fix | Pass | Pass | Pass | Pass |
| Frontend open/coordinator tests | Pass | Pass | Pass | Pass |
| Real validation strategy | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| MCP start conversion | Yes | Pass | Pass | Pass | Clearly distinguishes lifecycle persistence from segment-only live metadata. |
| Frontend open strategy | Yes | Pass | Pass | Pass | Clearly forbids Activity projection under live transcript preservation. |
| History projection canonical data | Yes | Pass | Pass | Pass | Avoids frontend result-derived argument repair. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Existing already-persisted rows with `{}` | User may still see old incomplete history. | Out of scope unless a separate backfill ticket is requested. | Accepted residual risk. |
| Real `generate_image` E2E slowness/flakiness | Can slow validation and fail for upstream timeout unrelated to this bug. | Use cheaper Codex MCP `speak` plus integration memory/projection coverage as durable gate; keep generate_image evidence as proof. | Accepted residual risk. |
| Team live-loader refactor data shape | Removing loader-side Activity hydration requires coordinator/apply branch to still receive projection activity facts for fresh projection application. | Implementation should pass projection/activity facts through the coordinator or an explicit apply helper; do not silently drop fresh active-team Activity hydration. | Non-blocking implementation note. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no design-impact, requirement-gap, or unclear findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Existing historical raw traces with `{}` arguments are not repaired by this design.
- Gated real Codex image generation remains slow/flaky; deterministic converter + memory/projection tests should be the durable gate.
- During team-open refactor, implementation must preserve fresh projection Activity hydration while removing Activity-only hydration under live-context preservation.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation. Preserve raw Codex normalization at the converter boundary, keep memory generic over canonical lifecycle fields, and make frontend projection application atomic across transcript and Activity surfaces.
