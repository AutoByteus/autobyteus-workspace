# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/done/claude-sdk-tool-arguments-activity/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/done/claude-sdk-tool-arguments-activity/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/done/claude-sdk-tool-arguments-activity/design-spec.md`
- Current Review Round: 3
- Trigger: Additional design-safety addendum after the user asked the team to verify Codex live Activity and historical run Activity hydration would not regress.
- Prior Review Round Reviewed: Round 2, expanded-scope pass with no blocking findings.
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Reviewed the updated requirements, investigation notes, design spec, and design impact rework note; rechecked current code paths for `CodexItemEventConverter`, `segmentHandler.ts`, `toolLifecycleHandler.ts`, `openAgentRun`, `runProjectionActivityHydration.ts`, `AgentRunViewProjectionService`, `ClaudeRunViewProjectionProvider`, `LocalMemoryRunViewProjectionProvider`, and historical activity transformers.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial narrow design review for missing Claude Activity arguments | N/A | No | Pass | No | Superseded by user-approved expanded scope; historical evidence only. |
| 2 | Design Impact rework for two-lane Claude normal-tool contract and frontend Activity ownership cleanup | No unresolved prior findings | No blocking findings | Pass | No | Superseded by Round 3 safety addendum. |
| 3 | Non-regression addendum for Codex live Activity and historical `projection.activities` hydration | No unresolved prior findings; Round 2 residual guardrails rechecked | No blocking findings | Pass | Yes | Updated design now includes explicit REQ/AC coverage for Codex live Activity, frontend historical hydration, and Claude standalone projection merge risk. |

## Reviewed Design Spec

Round 3 keeps the Round 2 architecture decision and adds explicit design-safety safeguards:

- Claude normal tools still use the two-lane contract: `SEGMENT_*` owns transcript shape; `TOOL_*` owns Activity/execution/memory state.
- Frontend Activity remains lifecycle-owned, but this must not regress Codex because Codex command execution, dynamic tool calls, and file changes already emit lifecycle starts.
- Historical Activity display is explicitly separate from live websocket handling: run open loads server `projection.activities` and `hydrateActivitiesFromProjection` populates `AgentActivityStore`.
- The design now identifies the standalone Claude history projection risk: `ClaudeRunViewProjectionProvider` can return conversation-only data, and `AgentRunViewProjectionService.getProjection` can treat that as usable before local-memory fallback is consulted. The implementation must preserve/merge local-memory activities when runtime-specific providers are complementary or conversation-only.

This addresses the user's specific non-regression concern and keeps the authoritative boundaries coherent: live Activity is lifecycle-owned, historical Activity is projection-owned, and runtime-specific history providers must not suppress local-memory activity rows.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements/design retain bug fix + behavior alignment + refactor classification and add non-regression scope. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Missing invariant, boundary/ownership issue, and duplicated policy are backed by raw Claude evidence, Codex converter evidence, frontend dual Activity creation, and projection-hydration code paths. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design keeps `Refactor needed now` and expands validation to live Codex and historical projection paths. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Updated REQ-013/REQ-014 and AC-011/AC-012/AC-013 map the new safety concerns to concrete files, tests, and migration steps. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved findings existed. | Round 1 report recorded `Findings: None`. | Round 1 is historical due scope expansion. |
| 2 | N/A | N/A | No unresolved findings existed. | Round 2 report recorded `Findings: None`. | Round 3 strengthens residual guardrails instead of resolving prior findings. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Claude normal tool start to `SEGMENT_START` + `TOOL_EXECUTION_STARTED` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Claude normal tool completion to `SEGMENT_END` + terminal lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Frontend live rendering split between segment state and Activity state | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Durable projection and historical Activity hydration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | `send_message_to` team-communication exception | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Codex live non-regression | Existing Codex lifecycle events to one Activity card after segment Activity removal | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Historical run open | `openAgentRun` projection payload to `hydrateActivitiesFromProjection` to Activity store | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Claude standalone projection merge | Runtime provider conversation plus local-memory tool traces to non-empty `projection.activities` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude runtime session | Pass | Pass | Pass | Pass | Still correct owner for raw Claude two-lane emission. |
| Claude event conversion | Pass | Pass | Pass | Pass | Stateless mapping remains correct. |
| Frontend live streaming handlers | Pass | Pass | Pass | Pass | Lifecycle owns live Activity; segment owns transcript. |
| Codex runtime conversion | Pass | Pass | Pass | Pass | Existing lifecycle events support live Activity non-regression; tests must cover command, dynamic tool, and file-change cases. |
| Frontend run-open / hydration | Pass | Pass | Pass | Pass | Historical Activity is projection-owned through `hydrateActivitiesFromProjection`, not live segment-owned. |
| Run-history projection service/providers | Pass | Pass | Pass | Pass | Design correctly assigns Claude standalone merge/fallback risk to projection service/provider validation and adjustment. |
| Memory/history/run-file projection | Pass | Pass | Pass | Pass | Lifecycle remains durable tool-trace owner; no duplicate tool traces from new segments. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude invocation projection state and flags | Pass | N/A | Pass | Pass | Local coordinator state remains the right scope. |
| Claude segment/lifecycle payload construction | Pass | N/A | Pass | Pass | Private coordinator helpers remain appropriate. |
| Frontend Activity helper flow | Pass | Pass | Pass | Pass | Existing lifecycle helper path remains the Activity owner. |
| Historical projection merge rows | Pass | Pass | Pass | Pass | Existing projection service merge utilities are the right capability area; implementation may need to invoke local-memory projection for standalone runtime projections. |
| Argument normalization | Pass | Pass | Pass | Pass | No parallel `input`/`tool_input` field. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Segment metadata `metadata.arguments` | Pass | Pass | Pass | N/A | Pass | Transcript metadata only. |
| Lifecycle payload `arguments` | Pass | Pass | Pass | N/A | Pass | Execution/Activity/memory arguments. |
| Invocation identity | Pass | Pass | Pass | N/A | Pass | Same ID reconciles segment/lifecycle lanes. |
| Live Activity state | Pass | Pass | Pass | N/A | Pass | One card per invocation from lifecycle. |
| Historical `projection.activities` | Pass | Pass | Pass | N/A | Pass | Server projection owns historical Activity source; frontend hydrates it directly. |
| Local-memory plus runtime-specific projection data | Pass | Pass | Pass | Pass | Pass | Complementary rows should merge rather than treating conversation-only runtime projection as complete. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Segment-created live Activity cards | Pass | Pass | Pass | Pass | Replaced by lifecycle-created live Activity; Codex lifecycle regression tests now required. |
| Segment-end live Activity updates | Pass | Pass | Pass | Pass | Replaced by terminal lifecycle handling. |
| Claude normal-tool lifecycle-only projection | Pass | Pass | Pass | Pass | Replaced by two-lane coordinator emission. |
| Historical Activity dependence on live handlers | Pass | Pass | Pass | Pass | Rejected; historical Activity must come from `projection.activities`. |
| Claude-specific frontend argument workaround | Pass | Pass | Pass | Pass | Rejected. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Pass | Pass | Pass | Pass | Claude normal-tool two-lane emission and duplicate suppression. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Pass | Pass | Pass | Pass | Stateless runtime-neutral mapping. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | Pass | Pass | N/A | Pass | Special team-communication segment path. |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Pass | Pass | Pass | Pass | Transcript only after refactor. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Pass | Pass | Pass | Pass | Live Activity and bounded synthetic segment backstop. |
| `autobyteus-web/stores/agentActivityStore.ts` | Pass | Pass | N/A | Pass | Store/dedupe state only. |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | Pass | Pass | N/A | Pass | Historical/live run open must continue hydrating projected activities. |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Pass | Pass | N/A | Pass | Historical `projection.activities` to Activity store rows. |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | Pass | Pass | Pass | Pass | Correct owner to merge/fallback local-memory activities with runtime-specific projections. |
| `autobyteus-server-ts/src/run-history/projection/providers/claude-run-view-projection-provider.ts` | Pass | Pass | N/A | Pass | Current provider can be conversation-only; design correctly prevents it from suppressing local-memory activities. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Pass | Pass | N/A | Pass | Lifecycle tool trace owner; validation target. |
| Targeted tests | Pass | Pass | N/A | Pass | AC-011/012/013 add the requested non-regression coverage. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude runtime coordinator | Pass | Pass | Pass | Pass | Raw Claude interpretation remains backend-owned. |
| Frontend live segment handler | Pass | Pass | Pass | Pass | Must not create Activity cards or require `AgentActivityStore` for executable segment starts/ends. |
| Frontend live lifecycle handler | Pass | Pass | Pass | Pass | May reconcile segment state; remains live Activity owner. |
| Frontend historical run open/hydration | Pass | Pass | Pass | Pass | Must consume server `projection.activities`; must not depend on live streaming handlers. |
| Run-history projection service | Pass | Pass | Pass | Pass | Must not let a conversation-only runtime provider bypass local-memory activities when memory traces exist. |
| UI components | Pass | Pass | Pass | Pass | Consume projected/live store state only; no raw-provider parsing. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude runtime coordinator | Pass | Pass | Pass | Pass | Encapsulates raw SDK state and two-lane emission. |
| Runtime event conversion | Pass | Pass | Pass | Pass | Adapter only. |
| Frontend live lifecycle | Pass | Pass | Pass | Pass | Live Activity owner. |
| Frontend historical hydration | Pass | Pass | Pass | Pass | Historical Activity owner from projection rows. |
| Run-history projection service | Pass | Pass | Pass | Pass | Correct merge/fallback boundary for provider + local-memory projections. |
| Team communication path | Pass | Pass | Pass | Pass | `send_message_to` exception remains explicit. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `processToolLifecycleChunk(runContext, chunk)` | Pass | Pass | Pass | Medium | Pass |
| `handleToolPermissionCheck(runContext, toolName, toolInput, options)` | Pass | Pass | Pass | Medium | Pass |
| `handleSegmentStart/End(payload, context)` | Pass | Pass | Pass | Low after refactor | Pass |
| `handleToolExecutionStarted/Succeeded/Failed/...` | Pass | Pass | Pass | Low | Pass |
| `openAgentRun(input)` | Pass | Pass | Pass | Low | Pass |
| `hydrateActivitiesFromProjection(runId, entries)` | Pass | Pass | Pass | Low | Pass |
| `AgentRunViewProjectionService.getProjection/getProjectionFromMetadata` | Pass | Pass | Pass | Medium | Pass |
| `ClaudeRunViewProjectionProvider.buildProjection` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/claude/session` | Pass | Pass | Low | Pass | Claude runtime owner. |
| `backends/claude/events` | Pass | Pass | Low | Pass | Adapter owner. |
| `autobyteus-web/services/agentStreaming/handlers` | Pass | Pass | Medium now / Low after refactor | Pass | Mixed today; design removes Activity side effects from segment handler. |
| `autobyteus-web/services/runOpen` | Pass | Pass | Low | Pass | Historical/live run open orchestration. |
| `autobyteus-web/services/runHydration` | Pass | Pass | Low | Pass | Projection hydration owner. |
| `autobyteus-server-ts/src/run-history/services` | Pass | Pass | Low | Pass | Projection composition/merge owner. |
| `autobyteus-server-ts/src/run-history/projection/providers` | Pass | Pass | Low | Pass | Runtime-specific projection providers. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude raw tool normalization | Pass | Pass | N/A | Pass | Extend coordinator. |
| Codex live Activity preservation | Pass | Pass | N/A | Pass | Reuse existing lifecycle events; add regression tests. |
| Historical Activity hydration | Pass | Pass | N/A | Pass | Reuse `hydrateActivitiesFromProjection`; add run-open regression. |
| Claude standalone projection merge | Pass | Pass | N/A | Pass | Reuse/adjust projection service/provider merge behavior. |
| Memory tool traces | Pass | Pass | N/A | Pass | Reuse lifecycle-owned local-memory traces. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Segment-created live Activity | No | Pass | Pass | Cleanly replaced by lifecycle Activity, with Codex regression coverage. |
| Historical Activity through live segment replay | No | Pass | Pass | Rejected; projection hydration is authoritative for history. |
| Conversation-only runtime projection suppressing local-memory activities | No | Pass | Pass | Design requires merge/fallback instead of treating it as complete. |
| Claude-specific frontend raw parsing | No | Pass | Pass | Rejected. |
| Historical backfill of old segment events | No | Pass | Pass | Explicitly out of scope. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Claude coordinator two-lane emission | Pass | Pass | Pass | Pass |
| Frontend live Activity ownership cleanup | Pass | Pass | Pass | Pass |
| Codex live Activity non-regression validation | Pass | Pass | Pass | Pass |
| Frontend historical `projection.activities` hydration validation | Pass | Pass | Pass | Pass |
| Server projection local-memory activity merge for Claude | Pass | Pass | Pass | Pass |
| Memory/history no-duplicate trace validation | Pass | Pass | Pass | Pass |
| Gated Claude e2e validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude raw start/completion | Yes | Pass | Pass | Pass | Two-lane examples remain clear. |
| Frontend Activity owner | Yes | Pass | Pass | Pass | Lifecycle vs segment ownership is explicit. |
| Historical Activity hydration | Yes | Pass | Pass | Pass | Updated design explains `projection.activities` hydration separate from live streaming. |
| Claude standalone projection merge | Yes | Pass | Pass | Pass | Updated design names the conversation-only provider risk and required local-memory merge/fallback. |
| Codex live Activity preservation | Yes | Pass | Pass | Pass | Updated AC-013 names command, dynamic tool, and file-change cases. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Non-Claude/non-Codex runtimes that may rely on segment-only Activity creation | Segment Activity removal is a global frontend change. | Confirm supported runtimes emit lifecycle for executable Activity or document an explicit product exception. | Accepted implementation guardrail. |
| Permission denial without a later raw `tool_result` | Segment state must not remain permanently open after denial. | Ensure lifecycle-denial handling terminalizes/reconciles segment state, adding segment end on denial only if implementation evidence supports backend-owned closure. | Accepted implementation guardrail. |
| Claude built-in tool names vs canonical UI/projection names | Could affect Activity type inference/file-change projection. | Normalize through existing runtime-neutral metadata/lifecycle rules if tests expose gaps; do not add parallel fields. | Accepted residual risk. |
| Standalone Claude local-memory merge strategy detail | Multiple implementations are possible: build local memory projection before primary merge, change fallback usability, or make Claude provider include local traces. | Implementation should choose the least mixed-boundary approach; preferred owner is `AgentRunViewProjectionService` composition, with provider tests proving `projection.activities` survives. | Accepted implementation choice, covered by AC-012. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Codex live Activity safety now depends on lifecycle regression tests for command execution, dynamic tool calls, and file changes after segment-created Activity is removed.
- Historical Activity safety depends on server `projection.activities`; frontend run-open tests alone are insufficient without the server Claude local-memory merge regression.
- The preferred architecture for the Claude standalone projection risk is projection-service composition/merge, not teaching frontend hydration about provider quirks.
- Existing Round 2 residual risks still apply: bounded synthetic segment fallback only, `send_message_to` suppression tests, and gated Claude e2e sensitivity.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The added non-regression safeguards are architecture-ready. The design now explicitly protects Codex live Activity, historical `projection.activities` hydration, and the Claude standalone conversation-only projection merge risk before implementation continues.
