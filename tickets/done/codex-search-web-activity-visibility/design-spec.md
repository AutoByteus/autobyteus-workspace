# Design Spec

## Current-State Read

There are two related live-stream inconsistencies in the current ticket.

1. **Backend Codex `search_web` conversion gap**: Codex app-server emits built-in web search as `item/started` / `item/completed` with `item.type: "webSearch"`. Before this ticket's first implementation pass, `convertCodexItemEvent` converted those events only to transcript `SEGMENT_START` / `SEGMENT_END`. That explained why `search_web` appeared in the middle transcript but not Activity.
2. **Frontend segment-first Activity gap**: The middle transcript is created by `SEGMENT_*` handlers, while the Activity panel is populated only by `TOOL_*` lifecycle handlers. When a tool-like `SEGMENT_START` appears before lifecycle events, the middle card appears immediately but Activity is empty until a later lifecycle or terminal event.

Git history confirms the user's suspicion. Commit `29247822` (`fix(claude): split tool transcript and activity lanes`, 2026-05-01) removed Activity writes from `segmentHandler.ts` and added tests asserting segment-created tool cards do **not** create Activity. Before that commit, `handleSegmentStart` called `useAgentActivityStore().addActivity(...)` for `tool_call`, `write_file`, `run_bash`, and `edit_file`, and `handleSegmentEnd` synchronized tool name/status/arguments back into Activity. The refactor solved duplication/ordering pressure by making Activity lifecycle-owned, but it also broke the product invariant the user expects: the right Activity area should appear when the middle tool card appears.

The correct refined design is not to simply paste the old segment-store code back into `segmentHandler.ts`; that would reintroduce duplicated policy. Instead, Activity projection should become a small shared owner used by both segment and lifecycle handlers.

## Intended Change

- Preserve the current ticket's backend Codex `webSearch` lifecycle fan-out.
- Refactor frontend live Activity projection into a shared helper module.
- Make eligible tool-like `SEGMENT_START` seed/upsert one Activity entry immediately when the middle tool segment is created or enriched.
- Keep `TOOL_*` lifecycle events authoritative for execution and terminal status, updating the same Activity entry by invocation id/aliases.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary/ownership issue from the `29247822` frontend refactor; Activity projection became lifecycle-only even though segment-start is also a first visible tool invocation boundary.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `git show 29247822 -- segmentHandler.ts` shows removal of `useAgentActivityStore` from segment handling and deletion of segment-start/segment-end Activity synchronization.
  - `segmentHandler.spec.ts` was changed in the same commit to assert tool-call segments are created "without creating Activity state".
  - User screenshot shows this invariant is wrong for product behavior: middle running `generate_speech` card appears while Activity lacks that entry.
  - Backend live Codex logs confirm `search_web` also needs lifecycle fan-out; that backend fix remains valid.
- Design response: Extract a shared Activity projection helper and make segment/lifecycle handlers reuse it.
- Refactor rationale: Restoring old behavior directly in `segmentHandler.ts` would duplicate Activity typing/context/argument/status policy already present in `toolLifecycleHandler.ts`. A shared projection owner keeps segment and lifecycle lanes synchronized without duplicate entries.
- Intentional deferrals and residual risk, if any: None for in-scope live Activity synchronization. Live Codex E2E remains supplemental because tool selection is model-dependent.

## Terminology

- **Transcript segment lane**: `SEGMENT_START` / `SEGMENT_CONTENT` / `SEGMENT_END` handled by `segmentHandler.ts`; creates middle conversation cards.
- **Tool lifecycle lane**: `TOOL_APPROVAL_REQUESTED`, `TOOL_EXECUTION_STARTED`, terminal lifecycle events, and `TOOL_LOG` handled by `toolLifecycleHandler.ts`.
- **Activity projection owner**: New shared helper that turns normalized segment/lifecycle facts into `agentActivityStore` entries/updates.

## Design Reading Order

1. Backend Codex `webSearch` raw event -> normalized segment+lifecycle fan-out.
2. Frontend segment-first path -> immediate Activity seed.
3. Frontend lifecycle path -> deduped Activity update and terminal status.
4. Tests that replace the old lifecycle-only invariant.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the old test/contract that segment-created tool cards do not create Activity. Do not keep a lifecycle-only special case for Codex dynamic/file/search tools.
- No dual Activity authority: segment and lifecycle lanes must call one shared projection helper.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Tool-like `SEGMENT_START` | Right-side Activity running/pending entry | Shared frontend Activity projection helper | Restores Activity sync when the middle card appears. |
| DS-002 | Primary End-to-End | Codex app-server `webSearch` item | Activity lifecycle entry | Codex event converter + shared Activity projection | Fixes `search_web` missing lifecycle. |
| DS-003 | Return-Event | Tool-like `SEGMENT_START` | Middle transcript tool card | `segmentHandler.ts` | Must remain unchanged visually while adding Activity sync. |
| DS-004 | Bounded Local | Later `TOOL_*` lifecycle event | Existing Activity entry update | Shared Activity projection helper via `toolLifecycleHandler.ts` | Prevents duplicate Activity entries and status regressions. |

## Primary Execution Spine(s)

1. `SEGMENT_START(tool-like) -> segmentHandler creates/merges segment -> toolActivityProjection.upsertFromSegment(...) -> agentActivityStore -> ActivityFeed`
2. `TOOL_EXECUTION_STARTED/SUCCEEDED/FAILED -> toolLifecycleHandler hydrates segment -> toolActivityProjection.update... -> agentActivityStore -> ActivityFeed`
3. `Codex webSearch item -> CodexThreadEventConverter -> SEGMENT_* + TOOL_* -> frontend paths above`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When the normalized stream says a tool segment has started, the middle card and Activity entry are created in the same UI moment. | Segment payload, tool segment, Activity projection, Activity store | Shared Activity projection helper | Tool name/argument extraction from metadata |
| DS-002 | Codex built-in web search is normalized as both a transcript segment and a lifecycle tool invocation. | Codex item, normalized events, websocket messages | Codex event converter | Web-search arguments/result/error parsing |
| DS-003 | Transcript segment creation remains the source of the middle card. | Segment payload, AI message, tool segment | `segmentHandler.ts` | Segment identity, metadata merging |
| DS-004 | Lifecycle events update existing Activity entries instead of creating duplicates. | Lifecycle payload, tool segment, Activity projection, Activity store | Shared Activity projection helper | Alias resolution, status transition rules |

## Spine Actors / Main-Line Nodes

- Raw Codex `webSearch` item
- `CodexThreadEventConverter` / `convertCodexItemEvent`
- `AgentRunEventMessageMapper`
- `AgentStreamingService` / `TeamStreamingService`
- `segmentHandler.ts`
- `toolLifecycleHandler.ts`
- New `toolActivityProjection.ts`
- `agentActivityStore.ts`
- `ActivityFeed.vue`

## Ownership Map

- `CodexThreadEventConverter` / `convertCodexItemEvent`: owns raw Codex item -> canonical runtime event fan-out.
- `CodexToolPayloadParser`: owns Codex web-search argument/result/error extraction.
- `segmentHandler.ts`: owns transcript segment creation/metadata merging/finalization and calls Activity projection when a visible tool-like segment is available.
- `toolLifecycleHandler.ts`: owns lifecycle state transitions on tool segments and calls Activity projection for Activity updates.
- `toolActivityProjection.ts` (new): owns Activity type/context inference, activity upsert, alias-aware dedupe, argument merge, tool-name sync, status update, result/error/log sync.
- `agentActivityStore.ts`: owns storage/mutation of Activity entries per run id.
- `ActivityFeed.vue` / `ActivityItem.vue`: display facades only.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ActivityFeed.vue` | `agentActivityStore` | Display right-side Activity entries | Segment/lifecycle parsing |
| `AgentStreamingService` / `TeamStreamingService` | Message-specific handlers | Dispatch websocket messages to correct handlers/context | Cross-message Activity policy |
| `segmentHandler.ts` | Transcript state + shared Activity projection call | Keeps segment lane readable | Duplicated Activity store policy |
| `toolLifecycleHandler.ts` | Lifecycle state + shared Activity projection call | Keeps lifecycle lane readable | Duplicated Activity store policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Segment-start-without-Activity test invariant | Product requirement says Activity should appear with middle card | Segment-start Activity upsert tests | In This Change | Update `segmentHandler.spec.ts` and `toolLifecycleOrdering.spec.ts`. |
| Private duplicated Activity helpers inside `toolLifecycleHandler.ts` | Must be shared by segment and lifecycle paths | `toolActivityProjection.ts` | In This Change | Move/reuse, do not duplicate. |
| Lifecycle-only Codex dynamic/file/search Activity expectation | Causes missing running entries until lifecycle arrives | Shared projection from `SEGMENT_START` | In This Change | Replace with dedupe/status expectations. |

## Return Or Event Spine(s) (If Applicable)

- Transcript spine remains: `SEGMENT_START -> segmentHandler -> AI message segment -> middle card`.
- Activity spine expands to: `SEGMENT_START -> shared Activity projection -> ActivityFeed` plus lifecycle updates.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `toolActivityProjection.ts`.
- Chain: `upsertActivityFromToolSegment -> resolve canonical/alias invocation id -> infer Activity type/context/arguments -> add or update Activity -> apply status/result/log updates through store`.
- Why it matters: Segment-first and lifecycle-first orderings must converge to one Activity entry.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Tool name placeholder handling | DS-001, DS-004 | Activity projection | Avoid blank/noisy Activity titles; update when concrete name arrives | Some providers stream incomplete metadata | Bad Activity rows or missed updates |
| Activity type inference | DS-001, DS-004 | Activity projection | Map `run_bash`/command to terminal, patch/path to edit/write, default to tool_call | Used by both lanes | Divergent display between segment/lifecycle paths |
| Alias handling | DS-004 | Activity projection | Dedupe lifecycle ids and segment ids | Existing code uses invocation aliases | Duplicate Activity cards |
| Web-search parsing | DS-002 | Codex converter | Extract query/action/result/error | Backend normalization only | Frontend raw provider coupling |
| Live Codex logging | DS-002 | Validation | Prove actual event path | User requested evidence | Flaky if used as sole gate |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Codex web-search lifecycle events | Codex event converter | Extend | Existing owner for raw Codex normalization | N/A |
| Activity storage | `agentActivityStore` | Reuse | Store already supports generic activities and transition guards | N/A |
| Activity projection from normalized events | Existing private lifecycle helpers | Extract into new shared helper | Needed by both segment and lifecycle handlers | Keeping it private duplicates policy or misses segment path |
| Visual Activity rendering | `ActivityFeed` / `ActivityItem` | Reuse | Existing `parsing`/`executing` display maps to Running | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex runtime event normalization | Raw Codex item -> canonical events | DS-002 | `CodexThreadEventConverter` | Extend | Already implemented in current ticket state; preserve. |
| Frontend transcript segment handling | Middle card creation and segment hydration | DS-001, DS-003 | `segmentHandler.ts` | Extend | Calls shared Activity projection after tool-like segment creation/merge/finalize. |
| Frontend Activity projection | Activity upsert/update/dedupe | DS-001, DS-004 | New `toolActivityProjection.ts` | Create | Small extraction from lifecycle handler. |
| Frontend lifecycle handling | Segment lifecycle state transitions | DS-004 | `toolLifecycleHandler.ts` | Reuse/trim | Remove private Activity projection duplication. |
| Validation | Unit/handler/live probes | All | Test suites | Extend | Update frontend tests to refined invariant. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex runtime event normalization | Raw Codex item converter | Emit `SEGMENT_*` plus `TOOL_*` for `webSearch` | Existing fan-out owner | `CodexToolPayloadParser` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts` | Codex payload parsing | Parser helper | Web-search args/result/error | Existing tool parser owner | N/A |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Frontend Activity projection | Shared projection helper | Activity upsert/update/dedupe/type/context/args/status/result/log | Prevents duplicate policy in segment/lifecycle handlers | `agentActivityStore`, `buildInvocationAliases` |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Transcript segment state | Segment handler | Call projection after eligible tool-like segment start/merge/end | Keeps transcript owner but delegates Activity policy | `toolActivityProjection` |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Tool lifecycle state | Lifecycle handler | Use projection helper instead of private Activity helpers | Keeps lifecycle state owner | `toolActivityProjection` |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Frontend unit tests | Segment contract | Assert segment-start seeds Activity for visible tools | Old invariant lives here | Pinia Activity store |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts` | Frontend ordering tests | Dedupe/status regression | Segment-first/lifecycle-first single Activity | Existing ordering suite | Pinia Activity store |

## Target File Responsibility Mapping

Same as draft. No new store or component file is required unless implementation finds an existing helper better suited than `toolActivityProjection.ts`.

## Interface Boundary Design

### `toolActivityProjection.ts` suggested public surface

Implementation may adjust names, but it should expose a small, explicit interface similar to:

```ts
export type ProjectableToolSegment = ToolCallSegment | WriteFileSegment | TerminalCommandSegment | EditFileSegment;

export function upsertActivityFromToolSegment(
  context: AgentContext,
  invocationId: string,
  segment: ProjectableToolSegment,
  argumentsPayload?: Record<string, any>,
): void;

export function syncActivityToolName(...): void;
export function updateActivityArguments(...): void;
export function updateActivityStatus(...): void;
export function setActivityResult(...): void;
export function addActivityLog(...): void;
```

Rules:

- The helper owns alias-aware lookup using `buildInvocationAliases`.
- The helper should not import `segmentHandler.ts` to avoid cycles.
- The helper should accept already-normalized tool segment/lifecycle facts; it must not parse raw Codex/provider payloads.
- Segment-start upsert should use segment status (`parsing`/`parsed`) until lifecycle updates it to `executing`/terminal.
- It may skip unnamed generic `tool_call` segments until a concrete tool name is present; fixed segment types (`run_bash`, `write_file`, `edit_file`) can use their inferred names.

## Dependency Rules

| From | May Depend On | Must Not Depend On |
| --- | --- | --- |
| `segmentHandler.ts` | `toolActivityProjection.ts`, segment factories/identity | `toolLifecycleHandler.ts` |
| `toolLifecycleHandler.ts` | `toolActivityProjection.ts`, lifecycle parsers/state, segment lookup | Segment-specific Activity store policy duplicated locally |
| `toolActivityProjection.ts` | `agentActivityStore`, `buildInvocationAliases`, placeholder/status utilities, segment types | `segmentHandler.ts`, `toolLifecycleHandler.ts`, raw Codex converter |
| Activity components | `agentActivityStore` | Event parsing/projection logic |

## Data / Identity Design

| Entity | Stable Identity | Notes |
| --- | --- | --- |
| Tool segment | `SegmentStartPayload.id` / `segment.invocationId` | Must match lifecycle `invocation_id` or alias. |
| Activity entry | `ToolActivity.invocationId` | Use segment/lifecycle invocation id; helper handles aliases. |
| Codex web search | raw `item.id` | Used for both segment id and lifecycle invocation id. |

## Migration / Refactor Sequence

1. Preserve existing backend Codex `search_web` lifecycle implementation.
2. Create `toolActivityProjection.ts` by moving reusable Activity helper logic out of `toolLifecycleHandler.ts`.
3. Update `toolLifecycleHandler.ts` to call the shared projection helper for all Activity writes.
4. Update `segmentHandler.ts`:
   - after creating a new eligible tool-like segment, call `upsertActivityFromToolSegment`;
   - after merging duplicate `SEGMENT_START` metadata, call projection sync again;
   - after `SEGMENT_END` finalizes metadata, call projection sync/update arguments without regressing terminal lifecycle status.
5. Update tests:
   - replace old “without creating Activity state” segment test;
   - revise Codex dynamic/file/search ordering expectation so segment-start creates Activity immediately;
   - add/keep `generate_speech` or generic `tool_call` segment-first case;
   - keep lifecycle-first dedupe/status regression tests.
6. Re-run frontend handler tests and backend Codex converter tests.

## Validation Plan

- Backend:
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
  - existing Codex event test directory.
- Frontend:
  - `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts`
  - `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts`
  - `toolLifecycleHandler.spec.ts` if helper extraction touches lifecycle behavior.
- Optional/supplemental:
  - Live Codex logging probe with `RUN_CODEX_E2E=1`, `RUNTIME_RAW_EVENT_DEBUG=1`, `CODEX_THREAD_RAW_EVENT_DEBUG=1`, and `CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/...`.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Duplicate Activity entries when both segment and lifecycle arrive | Shared projection helper must check aliases before adding. Tests cover segment-first and lifecycle-first order. |
| Status regression from terminal lifecycle back to parsed on late `SEGMENT_END` | Store transition guard and helper should avoid forcing non-terminal status over terminal state. Tests already cover terminal preservation; keep/update. |
| Blank generic tool activities from incomplete metadata | Helper can skip unnamed `tool_call` until tool name appears, while still handling fixed types. |
| Reintroducing old duplicated segment store policy | Extract one helper; do not paste old `useAgentActivityStore` blocks directly back into `segmentHandler.ts`. |

## Open Questions

None blocking. Implementation should choose exact helper names but preserve the ownership rules above.
