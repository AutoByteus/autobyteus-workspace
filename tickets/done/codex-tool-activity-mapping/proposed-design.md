# Proposed Design Document

## Design Version
- Current Version: `v4`

## Revision History
| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Define canonical tool lifecycle anchor strategy across backend adapter + frontend generic fallback | 1 |
| v2 | Re-opened bug: empty `edit_file` arguments | Add file-change argument normalization rules (`change`/`file_change`/`changes[]`) and empty-string sanitization in backend adapter | 3 |
| v3 | Re-opened bug: empty `run_bash.command` arguments | Add canonical command extraction/hydration across adapter metadata + frontend segment/activity argument updates and live E2E guard | 6 |
| v4 | Re-opened gap: web-search not visible as canonical tool | Normalize `webSearch` to canonical `search_web` tool-call lifecycle, suppress mirror `web_search_*` noise, and hydrate tool-call args generically in frontend | 8 |

## Artifact Basis
- Investigation Notes: `tickets/in-progress/codex-tool-activity-mapping/investigation-notes.md`
- Requirements: `tickets/in-progress/codex-tool-activity-mapping/requirements.md`
- Requirements Status: `Refined`

## Summary
- Backend Codex adapter remains runtime-specific translation boundary and becomes more resilient in classifying tool-like item types.
- Frontend remains runtime-agnostic: tool lifecycle handler adds a generic "ensure lifecycle anchor" fallback when TOOL_* arrives before SEGMENT_START.
- Backend maps Codex `webSearch` items to canonical tool-call semantics (`search_web`) and suppresses mirror `codex/event/web_search_*` noise.
- Frontend tool-call argument projection remains generic by hydrating canonical metadata arguments, without runtime-specific branches.
- This preserves separation of concerns while closing ordering/shape gaps.

## Goals
- Satisfy `R-001..R-009` with minimal surface-area changes.
- Keep UI components unchanged; only stream-handler layer logic changes.
- Add regression tests for both normal and missing-segment-start paths.

## Legacy Removal Policy (Mandatory)
- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no legacy branch added; canonical lifecycle handling is strengthened in-place.

## Requirements And Use Cases
| Requirement | Description | Acceptance Criteria | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Tool-like item classification from Codex variants | AC-001 | UC-001 |
| R-002 | No-segment-start recovery for TOOL_* | AC-002 | UC-002 |
| R-003 | Canonical lifecycle monotonicity | AC-003 | UC-003, UC-004 |
| R-004 | Runtime-agnostic frontend | AC-004 | UC-005 |
| R-005 | Regression test coverage | AC-005 | UC-001..UC-005 |
| R-006 | File-change argument normalization for `edit_file` | AC-006 | UC-006 |
| R-007 | Command argument normalization for `run_bash` | AC-007 | UC-007 |
| R-008 | Web-search canonical tool-call mapping | AC-008 | UC-008 |
| R-009 | Mirror web-search noise suppression | AC-009 | UC-009 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)
| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Codex runtime events are normalized in server adapter, forwarded via websocket, consumed by frontend handlers. | `codex-runtime-event-adapter.ts`, `runtime-event-message-mapper.ts`, `AgentStreamingService.ts` | Full payload variants from all codex versions |
| Current Naming Conventions | Canonical protocol uses `SEGMENT_*` + `TOOL_*`; frontend segment types are runtime-neutral (`terminal_command`, `tool_call`, etc.). | `models.ts`, `messageTypes.ts`, `segmentTypes.ts` | N/A |
| Impacted Modules / Responsibilities | Backend adapter performs runtime-specific mapping; frontend handlers manage lifecycle state + activity store. | `codex-runtime-event-adapter.ts`, `segmentHandler.ts`, `toolLifecycleHandler.ts` | Invocation id variant frequency |
| Data / Persistence / External IO | Real-time WS only; no schema migration needed. | `agent-stream-handler.ts` | N/A |

## Current State (As-Is)
- Tool lifecycle visibility depends on prior SEGMENT_START of tool-like type.
- TOOL_* handlers do not create missing tool anchors.
- Codex tool-like item type normalization can degrade to `text` for unknown variants.

## Target State (To-Be)
- Backend improves item-type classification robustness for tool-like Codex items.
- Frontend TOOL_* handlers ensure a lifecycle anchor exists before applying transitions.
- Activity feed and conversation tool segments stay synchronized even with out-of-order/missing SEGMENT_START.

## Architecture Direction Decision (Mandatory)
- Chosen direction: `Keep current layering, add resilience at existing boundaries`.
- Rationale:
  - complexity: low incremental complexity, no protocol expansion;
  - testability: direct unit tests at adapter/handler layers;
  - operability: robust to runtime payload drift/order variation;
  - evolution cost: supports future runtime integrations through canonical contracts.
- Layering fitness assessment: `Yes`
- Outcome: `Modify`

## Change Inventory (Delta)
| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` | same | Robust tool-like item type inference for SEGMENT_START mapping | Backend adapter | Runtime-specific concern only |
| C-002 | Modify | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | same | Ensure lifecycle anchor when TOOL_* arrives first | Frontend stream handler | Runtime-agnostic fallback |
| C-003 | Modify | `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts` | same | Validate classification and id mapping behavior | Backend tests | Regression coverage |
| C-004 | Modify | `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | same | Validate no-SEGMENT_START recovery path | Frontend tests | Regression coverage |
| C-005 | Modify | `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` | same | Normalize `edit_file` arguments by sanitizing empty placeholders and extracting from nested file-change payloads | Backend adapter | Runtime-specific concern only |
| C-006 | Modify | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | same | Hydrate `run_bash` command from canonical metadata on segment start/end and activity arg updates | Frontend stream handler | Runtime-agnostic use of canonical payload |
| C-007 | Modify | `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts` | same | Add live websocket regression guard for non-empty `run_bash` command metadata | Backend e2e tests | Real transport validation |
| C-008 | Modify | `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` | same | Map `webSearch` item lifecycle to canonical `tool_call` (`search_web`) and suppress mirror `codex/event/web_search_*` to no-op | Backend adapter | Runtime-specific concern only |
| C-009 | Modify | `autobyteus-web/services/agentStreaming/protocol/segmentTypes.ts`, `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | same | Hydrate generic `tool_call.arguments` from canonical metadata arguments/query fields | Frontend stream handler | Runtime-agnostic projection only |
| C-010 | Modify | `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | same | Add regression tests for web-search canonical mapping + tool-call argument hydration | Backend/frontend tests | Regression coverage |

## Target Architecture Shape And Boundaries (Mandatory)
| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Backend runtime adapter | Translate runtime-specific events to canonical protocol | Codex method/item-type normalization | UI behavior/state decisions | Codex-specific logic stays here |
| Frontend stream handler | Canonical protocol state application | Segment/activity lifecycle state + fallback anchor creation | Runtime-specific parsing branches | Fallback is protocol-level, runtime-neutral |
| Frontend components | Render segments/activity | Pure presentation | Event-shape heuristics | No changes required |

## File And Module Breakdown
| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` | Modify | Backend adapter | Codex->canonical event translation | `map(rawEvent)` | input: codex event, output: `ServerMessage` | method normalizer, serialization |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Modify | Frontend handler | TOOL_* state transitions with anchor upsert | `handleTool*` functions | input: TOOL payloads, output: context/store mutation | segment helpers, activity store |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts` | Modify | Tests | Adapter mapping regression validation | test cases | codex-like events -> canonical payload assertions | mapper |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Modify | Tests | Lifecycle fallback validation | test cases | TOOL_* without prior segment -> created anchor + activity | handler/store mocks |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Modify | Frontend handler | SEGMENT_* projection to canonical segment+activity fields | `handleSegmentStart/Content/End` | input: segment payload + metadata, output: segment/activity mutations | context + activity store |
| `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts` | Modify | Tests | Live codex runtime websocket contract validation | live e2e cases | input: real codex runtime run, output: protocol assertions | runtime stack + ws |
| `autobyteus-web/services/agentStreaming/protocol/segmentTypes.ts` | Modify | Frontend protocol mapping | Segment object creation from canonical metadata | `createSegmentFromPayload` | input: segment payload + metadata, output: typed segment state | segment type contracts |

## Layer-Appropriate Separation Of Concerns Check
- UI/frontend scope: no component-level runtime branching introduced.
- Non-UI scope: runtime-specific mapping remains in backend adapter.
- Integration scope: frontend fallback remains canonical, independent of specific runtime names.

## Naming Decisions
| Item Type | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| API/Helper | n/a | `ensureToolLifecycleSegment` (internal helper) | Explicitly describes invariant restoration | Added inside tool lifecycle handler |

## Naming Drift Check
| Item | Current Responsibility | Does Name Still Match? | Corrective Action | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `codex-runtime-event-adapter.ts` | Codex-specific translation | Yes | N/A | C-001 |
| `toolLifecycleHandler.ts` | Canonical TOOL_* state transitions | Yes | N/A | C-002 |

## Existing-Structure Bias Check
| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Add runtime-specific frontend handler | Medium | Keep runtime logic in backend + generic frontend fallback | Change | Preserves decoupling |

## Anti-Hack Check
| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Ignore missing segment and only log warning | High | Upsert canonical lifecycle anchor in handler | Reject shortcut | Needed for deterministic UX |

## Dependency Flow And Cross-Reference Risk
| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| Codex adapter | runtime method normalizer | websocket clients | Low | keep pure mapping helpers |
| Tool lifecycle handler | segment lookup + activity store | activity feed + tool segments | Medium | add focused helper + tests |

## Allowed Dependency Direction (Mandatory)
- Allowed direction rules: `Runtime-specific backend adapter -> canonical websocket protocol -> frontend canonical handlers -> UI components`.
- Temporary boundary violations and cleanup deadline: none.

## Decommission / Cleanup Plan
| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| None | N/A | No compatibility branch added | tests |

## Error Handling And Edge Cases
- TOOL_* with missing/invalid invocation id remains dropped (existing parser contract).
- TOOL_* with unseen invocation id now creates lifecycle anchor.
- Unknown item type still falls back to `text` when no tool signal is present.
- File-change payloads with `arguments.path=""`/`arguments.patch=""` are treated as incomplete and backfilled from `change`/`file_change`/`changes[]` when available.
- Command-execution payloads with missing direct `payload.command` are backfilled from `item.command` and command-action variants before canonical `run_bash` metadata emission.
- Web-search payloads are canonicalized as `tool_call` with `tool_name=search_web`; mirror `codex/event/web_search_begin/end` are mapped to no-op content to avoid UI noise.

## Use-Case Coverage Matrix (Design Gate)
| use_case_id | Requirement | Use Case | Primary Path Covered | Fallback Path Covered | Error Path Covered | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001 | Tool-like item classification | Yes | N/A | Yes | UC-001 |
| UC-002 | R-002 | TOOL_* before SEGMENT_START | Yes | Yes | Yes | UC-002 |
| UC-003 | R-003 | Approval lifecycle mapping | Yes | N/A | Yes | UC-003 |
| UC-004 | R-003 | Execution/log/terminal states | Yes | N/A | Yes | UC-004 |
| UC-005 | R-004 | Non-tool unaffected | Yes | N/A | N/A | UC-005 |
| UC-006 | R-006 | File-change placeholder argument recovery | Yes | Yes | Yes | UC-006 |
| UC-007 | R-007 | Run-bash command argument recovery | Yes | Yes | Yes | UC-007 |
| UC-008 | R-008 | Web-search canonical tool-call lifecycle | Yes | Yes | Yes | UC-008 |
| UC-009 | R-009 | Mirror web-search event noise suppression | Yes | N/A | N/A | UC-009 |

## Change Traceability To Implementation Plan
| Change ID | Implementation Plan Task(s) | Verification | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | Backend unit tests | Planned |
| C-002 | T-002 | Frontend unit tests | Planned |
| C-003 | T-003 | Backend unit tests | Planned |
| C-004 | T-004 | Frontend unit tests | Planned |
| C-005 | T-006, T-007 | Backend unit tests | Planned |
| C-006 | T-008 | Frontend unit tests | Planned |
| C-007 | T-009 | Live E2E test | Planned |
| C-008 | T-010, T-012 | Backend unit tests | Planned |
| C-009 | T-011, T-012 | Frontend unit tests | Planned |
| C-010 | T-012 | Backend + frontend unit tests | Planned |

## Open Questions
- Need real-capture validation for codex payload variants that include approval-id decorated invocation ids.
