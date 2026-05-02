# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirement gap/design impact confirmed after delivery pause; refined requirements/design needed before implementation resumes.
- Investigation Goal: Ensure tool visibility is synchronized between the middle transcript and right-side Activity panel, including Codex `search_web` and any tool whose middle card appears before lifecycle completion.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The original Codex `search_web` backend conversion fix is localized, but the newly clarified UI timing requirement requires a small frontend ownership refactor so segment-start and lifecycle events share one Activity projection path.
- Scope Summary: A tool-like `SEGMENT_START` that creates a visible middle tool card must also seed/upsert an Activity entry immediately; later `TOOL_*` lifecycle events must update the same entry.
- Primary Questions Resolved:
  - Is `search_web` emitted into the same canonical activity event stream/history as other tools? **Originally no for live stream; the implemented first-stage backend change now adds lifecycle fan-out for Codex `webSearch`.**
  - Why can a middle tool card be visible while Activity is missing? **Frontend Activity entries are currently lifecycle-owned only; `SEGMENT_START` creates the middle tool card but does not create Activity.**
  - Is this now considered a regression/requirement gap? **Yes. User clarified that when the middle tool appears, the Activity area should also appear.**
  - What refactor is required? **Extract shared Activity upsert/sync behavior from lifecycle handling so both `segmentHandler.ts` and `toolLifecycleHandler.ts` use one deduplicating projection owner.**

## Request Context

Initial user report: with Codex runtime, `search_web` showed in the middle transcript but not in the Activity panel. User requested Codex event logging and a live search prompt. Live logging confirmed the raw event shape.

Refined user report: the same inconsistency exists more generally. In the screenshot, the middle area shows a running `generate_speech` tool card while the Activity panel does not show that running invocation. User clarified: “the right side, i meant the activity area. Basically when the middle[area] appear, the right side should also appear.” Delivery paused and classified this as `Requirement Gap` / `Design Impact`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/tickets/done/codex-search-web-activity-visibility`
- Current Branch: `codex/codex-search-web-activity-visibility`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-01.
- Task Branch: `codex/codex-search-web-activity-visibility`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This is a dedicated worktree. Dependency binaries are available in the shared checkout; previous implementation/validation used temporary ignored dependency symlinks as recorded in downstream artifacts.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-01 | Command | `git worktree add -b codex/codex-search-web-activity-visibility ... origin/personal` | Create mandatory dedicated task worktree/branch | Dedicated worktree created from `origin/personal`. | No |
| 2026-05-01 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design read | Design must identify authoritative owners and avoid duplicate/compatibility paths. | Apply in design spec |
| 2026-05-01 | Code | `autobyteus-web/components/progress/ActivityFeed.vue` | Locate Activity panel data source | Activity feed reads `activityStore.getActivities(currentAgentRunId.value)`. | No |
| 2026-05-01 | Code | `autobyteus-web/stores/agentActivityStore.ts` | Inspect Activity store constraints | Activity entries require `invocationId`; no tool-name deny-list; add/update actions are generic. | No |
| 2026-05-01 | Code | `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`, `TeamStreamingService.ts` | Trace websocket dispatch | `SEGMENT_*` routes to `segmentHandler`; `TOOL_*` routes to `toolLifecycleHandler`. | Refactor shared projection used by both handlers |
| 2026-05-01 | Code | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` and `protocol/segmentTypes.ts` | Explain middle card creation | `SEGMENT_START` creates tool-like middle segments and hydrates metadata/arguments, but never creates Activity. | Add segment-start Activity upsert via shared helper |
| 2026-05-01 | Code/Test | `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Check existing invariant | Test explicitly says a tool-call segment is created “without creating Activity state”; this old invariant conflicts with refined user requirement. | Update/remove assertion |
| 2026-05-01 | Code | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Inspect Activity creation owner | Private helpers `ensureActivityForSegment`, `syncActivityToolName`, `updateActivityArguments`, `updateActivityStatus`, `setActivityResult`, `addActivityLog` create/update Activity from lifecycle only. | Extract reusable Activity projection helper |
| 2026-05-01 | Code/Test | `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts` | Check current ordering coverage | Existing tests ensure dedupe when lifecycle and segments are both present. Newly added validation still asserts `SEGMENT_START` alone creates no Activity for `search_web`; that must be revised. | Update tests for segment-first Activity visibility |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Trace Codex raw item conversion | Original `webSearch` branch emitted segment-only; current in-progress implementation adds segment + lifecycle fan-out. | Preserve backend change |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts` | Inspect web-search parsing | Current in-progress implementation centralizes web-search arguments/result/error parsing. | Preserve backend change |
| 2026-05-01 | Code/Test | `autobyteus-server-ts/tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts` and `autobyteus-web/services/runHydration/*` | Check historical/reloaded behavior | Historical projection can hydrate pending/terminal tool entries separately from live stream. Refined issue is live frontend streaming. | No direct change expected |
| 2026-05-01 | Trace/Test | Live Codex probe with `RUN_CODEX_E2E=1 RUNTIME_RAW_EVENT_DEBUG=1 CODEX_THREAD_RAW_EVENT_DEBUG=1 CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-websearch-live-probe-20260501-212620/raw` | User-requested live raw event proof | Raw `webSearch` came as `item/started` then `item/completed`; pre-fix backend conversion produced only `SEGMENT_START`/`SEGMENT_END`. | Backend lifecycle fan-out needed and later implemented |
| 2026-05-01 | Artifact | `implementation-handoff.md`, `validation-report.md` | Understand current in-progress implementation state before refinement | Backend `search_web` lifecycle fan-out was implemented and validated. Frontend validation intentionally preserved lifecycle-only Activity ownership and asserted no Activity after `SEGMENT_START`; that is now the gap. | Rework frontend design/tests |
| 2026-05-01 | Artifact | `delivery-pause-note.md` and delivery engineer message | Confirm workflow state | Delivery paused due new `Requirement Gap` / `Design Impact`; prior delivery artifacts are provisional. | Route updated design through review/implementation/code review/validation |

## Current Behavior / Current Flow

### Backend Codex `search_web` flow

- Original current state before implementation: raw Codex `webSearch` emitted only `SEGMENT_START`/`SEGMENT_END`, so Activity never received lifecycle events.
- In-progress implementation state: `webSearch` start now fans out `SEGMENT_START` + `TOOL_EXECUTION_STARTED`; completion fans out terminal lifecycle + `SEGMENT_END`.
- This fixes missing `search_web` lifecycle messages but does not alone fix the broader segment-first UI timing requirement.

### Frontend live-stream flow

1. Websocket `SEGMENT_START` arrives.
2. `AgentStreamingService` or `TeamStreamingService` dispatches to `handleSegmentStart`.
3. `segmentHandler.ts` creates the middle tool-like segment/card.
4. No Activity entry is created at this point.
5. A later lifecycle message (`TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, etc.) dispatches to `toolLifecycleHandler.ts`.
6. Only then does `toolLifecycleHandler.ts` create/update Activity.

This explains the user screenshot: the middle `generate_speech` card can be visible and spinning while Activity still lacks that running invocation.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary/ownership issue: Activity projection is private to lifecycle handling even though segment-start is also a first-class tool invocation visibility boundary.
- Refactor posture evidence summary: Refactor needed now. Shared Activity projection must be extracted from `toolLifecycleHandler.ts` and reused by `segmentHandler.ts` to avoid duplicated or conflicting segment-derived fallback logic.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot/refinement | Middle `generate_speech` tool card appears while Activity does not show that running invocation | Activity must be seeded when middle tool segment appears | Add segment-start Activity upsert |
| `segmentHandler.ts` | Creates/updates tool-like middle segments from `SEGMENT_START` and metadata | This is the earliest UI-visible tool boundary | Hook into shared Activity projection |
| `toolLifecycleHandler.ts` | Owns private Activity creation/update helpers | Good dedupe/status logic exists but is not reusable by segment handler | Extract helper module |
| `segmentHandler.spec.ts` | Old test title asserts tool segments do not create Activity | Test now encodes wrong requirement | Update tests |
| `toolLifecycleOrdering.spec.ts` | Newly added `search_web` test expects zero Activity after `SEGMENT_START` | Conflicts with refined requirement | Revise to expect immediate Activity |
| Live Codex logs | Confirm actual raw `webSearch` lifecycle shape and post-fix mapped lifecycle viability | Backend fix remains required | Preserve backend implementation |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Own conversation/transcript segment state | First creates visible tool cards from `SEGMENT_START` | Must call shared Activity projection for eligible tool-like segments |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Own lifecycle-driven segment hydration and Activity updates | Contains private reusable Activity sync logic | Extract Activity projection helpers out of this file |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` (new proposed file) | Shared Activity projection owner | Does not exist yet | Should own upsert/dedupe/status/argument/log/result sync used by both handlers |
| `autobyteus-web/stores/agentActivityStore.ts` | Store activities per run id | Generic enough; no deny-list | No store model change expected |
| `autobyteus-web/components/progress/ActivityItem.vue` | Display Activity entries | Already labels `parsing`/`executing` as Running | No visual styling change expected |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Segment handler contract tests | Contains outdated “without creating Activity” expectation | Update/add Pinia-backed Activity assertion |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts` | Ordering/dedupe regression tests | Correct place to validate segment-first and lifecycle-first dedupe | Add/refine tests |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/*` | Codex raw event normalization | Current ticket implementation adds `search_web` lifecycle events | Preserve; no further backend design change for segment-first Activity |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-01 | Test | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/node_modules/.bin/vitest run autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts --maxWorkers=1` | Baseline pre-fix converter tests passed 23 tests. | Existing tests lacked `webSearch` lifecycle coverage. |
| 2026-05-01 | Trace/Test | Live Codex probe under `/tmp/codex-websearch-live-probe-20260501-212620` | Raw `webSearch` was `item/started` then `item/completed`; pre-fix backend produced segment-only search events. | Confirms backend Codex lifecycle fan-out requirement. |
| 2026-05-01 | Artifact/Test | `validation-report.md` | Post-implementation live validation showed mapped `search_web` message types: `SEGMENT_START`, `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, `SEGMENT_END`. | Backend part of ticket is validated. |
| 2026-05-01 | Code/Test inspection | `toolLifecycleOrdering.spec.ts` current diff | Current durable frontend validation asserts `SEGMENT_START` alone creates no Activity. | This test must change to segment-first Activity creation. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: Local runtime event projection and frontend state ownership issue.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Frontend handler tests can reproduce the refined gap deterministically by calling `handleSegmentStart` with a tool-like payload and inspecting `useAgentActivityStore().getActivities(runId)` before lifecycle messages.
- Required config, feature flags, env vars, or accounts:
  - Live Codex E2E gate: `RUN_CODEX_E2E=1`.
  - Runtime normalized/mapped console logs: `RUNTIME_RAW_EVENT_DEBUG=1`.
  - Raw Codex thread console logs: `CODEX_THREAD_RAW_EVENT_DEBUG=1`.
  - Raw Codex thread JSONL logs: `CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-events`.
  - Frontend websocket logs: `localStorage.setItem('autobyteus.debug.streaming', 'true')` or `window.__AUTOBYTEUS_DEBUG_STREAMING__ = true`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: Temporary live and simulated Codex probes were removed after evidence capture. Retained `/tmp/codex-websearch-live-probe-20260501-212620` and later validation evidence paths are external evidence only.

## Findings From Code / Docs / Data / Logs

Root cause after refinement is not Activity filtering or visual styling. It is projection timing/ownership: the middle transcript and Activity panel are fed by separate handlers, and only lifecycle handling currently writes Activity. The first visible tool boundary can be `SEGMENT_START`; therefore Activity projection must be shared by segment and lifecycle paths, deduped by invocation id/aliases, and lifecycle events must remain authoritative for execution and terminal status.

## Constraints / Dependencies / Compatibility Facts

- Dedicated task branch/worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility` on `codex/codex-search-web-activity-visibility`.
- Base/finalization branch: `origin/personal` / `personal`.
- Current implementation changes are uncommitted and include backend Codex lifecycle fan-out plus docs/tests.
- Prior delivery artifacts are provisional after delivery pause and must not be treated as final.
- Avoid duplicate Activity entries: segment-start and lifecycle must share the same projection/upsert logic.
- Avoid raw-provider parsing in Activity UI; use normalized segment/lifecycle payloads only.

## Open Unknowns / Risks

- Placeholder or missing tool names on `SEGMENT_START` need careful handling to avoid blank/noisy Activity entries.
- Segment-start status may mean “model is forming/tool card is visible” rather than “tool process has begun.” The Activity label can still show Running for `parsing`; lifecycle events should update to `executing` and terminal states.
- Live Codex search prompting remains model-dependent; deterministic converter and frontend handler tests should be primary gates.

## Notes For Architect Reviewer

The revised design should supersede the earlier “Activity is lifecycle-only” invariant. This is not a request for ad hoc segment scraping inside the Activity panel component. The recommended refactor is a shared frontend Activity projection owner used by both `segmentHandler.ts` and `toolLifecycleHandler.ts`, preserving dedupe/status transition behavior while satisfying immediate Activity visibility when the middle tool card appears.
