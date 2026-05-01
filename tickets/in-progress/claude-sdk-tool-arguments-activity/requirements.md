# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Claude Agent SDK tool calls must be normalized into the same runtime-neutral event contract as Codex tool calls. The original user-visible bug was that Claude Activity cards showed only `Result` and omitted `Arguments`; investigation proved Claude raw SDK events already contain `tool_use.input`, so the missing arguments were lost in our event normalization path. During implementation we found a broader design asymmetry: Codex normal tool calls generally emit both transcript segment events and tool lifecycle events, while Claude normal tool calls only emitted lifecycle events after the narrow fix. This ticket now intentionally includes the refactor to align Claude with the same two-lane contract:

1. **Segment lane**: `SEGMENT_START` / `SEGMENT_END` owns conversation/transcript structure for the tool call.
2. **Lifecycle lane**: `TOOL_APPROVAL_*` and `TOOL_EXECUTION_*` owns Activity status, approval state, arguments, result/error, memory/tool traces, and executable state.

The target outcome is not a Claude-specific frontend workaround. Claude should issue both segment and lifecycle events for normal tools so the frontend can handle transcript and Activity consistently across providers.

## Investigation Findings

The original missing-arguments issue is from our side, not from missing Claude SDK data.

- The local Claude Agent SDK package is `@anthropic-ai/claude-agent-sdk@0.2.71`; emitted assistant messages include `tool_use` blocks whose `input` contains tool arguments.
- A Claude runtime e2e run with raw-event logging captured non-empty arguments in raw SDK events, e.g. a `Bash` tool_use block with `input.command` and a `Write` tool_use block with `input.file_path`/`input.content`.
- The initial bug path was in `ClaudeSessionToolUseCoordinator.processToolLifecycleChunk`: it tracked assistant `tool_use` arguments internally but did not emit `ITEM_COMMAND_EXECUTION_STARTED` for raw-observed tool_use blocks, and completion payloads omitted tracked arguments.
- The narrow implementation already fixed that lifecycle bug by emitting `TOOL_EXECUTION_STARTED.arguments` and preserving tracked arguments on completion.
- Broader analysis shows the lifecycle-only Claude shape remains asymmetric with Codex: `codex-item-event-converter.ts` emits both `SEGMENT_START` and `TOOL_EXECUTION_STARTED` for dynamic tool calls and file changes, while Claude normal `tool_use` / `tool_result` currently does not synthesize `ITEM_ADDED` / `ITEM_COMPLETED` segment events.
- The frontend currently has two potential Activity creation paths: `segmentHandler.ts` creates Activity entries from executable segment starts, and `toolLifecycleHandler.ts` also creates Activity entries from lifecycle starts with dedupe. That dual ownership is why provider asymmetry easily turns into frontend special cases or ordering-sensitive fixes.
- Claude `send_message_to` is a special team-communication path: it already synthesizes segment events for conversation/team display and suppresses generic lifecycle noise through the converter. That special-case behavior should be preserved unless a separate team-communication Activity lane is intentionally designed.

Evidence files:

- Raw Claude SDK JSONL log: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/logs/claude-raw-events/claude-run-12670a43-469e-4352-9b92-d37f5cd85384.jsonl`
- E2E/runtime console log: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/in-progress/claude-sdk-tool-arguments-activity/logs/claude-tool-lifecycle-e2e.log`

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue + Duplicated Policy Or Coordination
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed Now
- Evidence basis: Raw Claude `tool_use.input` contains arguments; Codex converter already emits both segment and lifecycle events for normal tools; Claude normal tool observation currently emits lifecycle only; frontend segment and lifecycle handlers can both create Activity entries.
- Requirement or scope impact: The ticket expands from a narrow lifecycle argument fix to a runtime-neutral two-lane tool event contract and frontend Activity ownership cleanup.

## Recommendations

- Yes: Claude normal tool calls should emit both segment and lifecycle events. The reason is semantic separation, not just argument visibility:
  - Segment events tell the transcript that the assistant invoked a tool.
  - Lifecycle events tell Activity/memory/history what is executing, awaiting approval, succeeded, failed, or denied.
- Keep the provider adapter responsible for provider-specific raw-event interpretation. Claude raw `tool_use.input` should be normalized once in the Claude runtime boundary, not recovered in the Vue Activity component.
- Make `ClaudeSessionToolUseCoordinator` the owner of Claude normal tool invocation state: it should upsert observed tool calls, emit a synthetic segment start once, emit lifecycle started once, preserve arguments for approval/completion, and emit segment end on `tool_result`.
- Tighten frontend ownership: lifecycle handlers should be the authoritative creator/updater of Activity entries; segment handlers should own conversation segments and may only enrich an existing Activity if needed, not create tool Activity cards directly.
- Preserve `send_message_to` semantics: continue segment-based conversation/team display and continue suppressing generic `TOOL_*` lifecycle noise for that tool unless a dedicated team-communication lane is explicitly introduced later.
- Keep existing Codex behavior stable while adding regression coverage proving Claude and Codex both project a consistent segment+lifecycle shape without duplicate Activity cards.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- Claude SDK emits assistant `tool_use` followed by user `tool_result` for a normal tool; the runtime emits both `SEGMENT_START`/`SEGMENT_END` and `TOOL_EXECUTION_STARTED`/terminal lifecycle events for the same invocation ID.
- Claude SDK permission callback path observes the same invocation as the raw `tool_use`; it must not duplicate segment starts or lifecycle starts.
- Claude SDK safe/auto-allowed tools that do not require approval still produce segment and lifecycle starts with arguments.
- Frontend conversation rendering receives Claude tool segments and displays them like other provider tool segments.
- Frontend Activity rendering receives lifecycle events and shows `Arguments`, status, result/error, and approval state without depending on segment-created Activity cards.
- Existing Codex runtime tool-call argument rendering and transcript rendering continue to work.
- Historical/memory projection retains tool-call arguments from lifecycle events and does not duplicate tool traces because of the added Claude tool segments.
- Opening a historical run from the run history UI still hydrates Activity cards from `projection.activities`; this must work for Codex, Claude, and team-member runs independently of live streaming handlers.
- Claude standalone historical projection must not lose local-memory tool activities just because the Claude session provider returns conversation-only session messages.
- Claude `send_message_to` keeps current team-communication segment display while generic lifecycle Activity noise remains suppressed.

## Out of Scope

- Changing Claude model/tool-selection behavior or upstream SDK behavior.
- Redesigning the Activity panel visual layout.
- Adding a Claude-only frontend side channel or Claude-specific `input` parsing in UI components.
- Backfilling or migrating already-recorded historical runs that lacked segment events.
- Introducing a separate team-communication Activity lane for `send_message_to`; this can be designed later if product needs it.
- Making empty-object arguments visually prominent; empty arguments can remain hidden if the payload is truly empty.

## Functional Requirements

- REQ-001: Every Claude SDK normal tool invocation with raw `tool_use.input` / `tool_use.arguments` must emit a normalized lifecycle start with `arguments`.
- REQ-002: Every Claude SDK normal tool invocation must emit a normalized segment start for a `tool_call` segment using the same invocation identity as the lifecycle lane.
- REQ-003: Every Claude SDK normal tool result must emit a normalized segment end for the same invocation identity and a terminal lifecycle event (`TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED`) with result/error.
- REQ-004: Claude runtime must avoid duplicate segment starts and duplicate lifecycle starts when both raw `tool_use` observation and permission callback observe the same invocation.
- REQ-005: `TOOL_EXECUTION_SUCCEEDED` and `TOOL_EXECUTION_FAILED` emitted by Claude should include tracked arguments when available as a defensive recovery path for downstream projection.
- REQ-006: Frontend Activity creation and status/result updates must be lifecycle-owned; executable segment handling must not be an independent Activity creation owner.
- REQ-007: Frontend segment handling must continue to own transcript/conversation segment creation and metadata enrichment for `tool_call`, `run_bash`, `write_file`, and `edit_file` segments.
- REQ-008: Segment and lifecycle processing must not produce duplicate Activity cards for one invocation when both lanes arrive in either order.
- REQ-009: Claude `send_message_to` must preserve current segment display and generic lifecycle suppression semantics.
- REQ-010: Existing Codex segment+lifecycle behavior must remain compatible with the tightened frontend ownership model.
- REQ-011: Memory/history/run-file projection must continue to derive tool call/result state from lifecycle events and must not duplicate tool traces because tool segments are now present.
- REQ-012: Executable validation must include backend fixture coverage, frontend handler/store coverage, and gated Claude e2e/raw-log evidence for the two-lane event shape.
- REQ-013: Historical run opening must continue to hydrate Activity cards from server `projection.activities` through `hydrateActivitiesFromProjection`; live segment-handler Activity creation must not be required for history display.
- REQ-014: Runtime-specific history projection must preserve complementary local-memory activities. In particular, a Claude session projection that returns conversation but no activities must be merged with or fallback to local memory activities when available.

## Acceptance Criteria

- AC-001: A Claude SDK raw assistant `tool_use` fixture for `Bash` with `{ command: "pwd" }` produces both a `SEGMENT_START` payload with `segment_type === "tool_call"`/metadata arguments and a `TOOL_EXECUTION_STARTED` payload with `arguments.command === "pwd"`.
- AC-002: A Claude SDK raw `tool_result` fixture for that invocation produces both `SEGMENT_END` for the same ID and `TOOL_EXECUTION_SUCCEEDED` carrying the tracked arguments and result.
- AC-003: A Claude permission callback path for the same invocation does not emit duplicate segment-start or lifecycle-start events.
- AC-004: A frontend test for `SEGMENT_START(tool_call)` verifies conversation segment creation but no direct Activity creation from the segment handler.
- AC-005: A frontend lifecycle test verifies `TOOL_EXECUTION_STARTED` creates exactly one Activity card with non-empty arguments, and subsequent segment events do not create a duplicate.
- AC-006: An ordering test covers segment-before-lifecycle and lifecycle-before-segment arrival; both orders end with one conversation segment and one Activity card for the invocation.
- AC-007: A `send_message_to` regression test verifies segment display remains available and generic `TOOL_*` lifecycle events for that tool remain suppressed.
- AC-008: Codex regression tests continue to pass for dynamic tool calls/file changes with both segment and lifecycle events.
- AC-009: Memory/history projection tests show a tool call/result is recorded once from lifecycle events despite a matching tool segment being present.
- AC-010: The gated Claude e2e test (`RUN_CLAUDE_E2E=1`) asserts the approved target invocation's raw `tool_use.input` appears in normalized segment metadata and lifecycle arguments, and it does not select unrelated preliminary successes.
- AC-011: A frontend run-open/history regression test proves opening a historical run calls `hydrateActivitiesFromProjection` and the Activity store shows the projected tool card even though no live segment handler runs.
- AC-012: A server projection regression test proves a Claude runtime projection with conversation-only session data and local-memory tool traces returns activities from the local memory projection rather than an empty Activity list.
- AC-013: Codex live-regression tests prove command execution, dynamic tool calls, and file changes still create exactly one Activity card from lifecycle events after segment-created Activity behavior is removed.

## Constraints / Dependencies

- Runtime boundary must stay provider-normalized: frontend should consume `SEGMENT_*` and `TOOL_*` payloads, not Claude SDK raw messages.
- `ClaudeSessionEventConverter` already maps `ITEM_ADDED`/`ITEM_COMPLETED` to `SEGMENT_START`/`SEGMENT_END`; the Claude coordinator can reuse those existing session event names.
- Debug logging must remain opt-in through existing env vars (`CLAUDE_SESSION_RAW_EVENT_LOG_DIR`, `CLAUDE_SESSION_RAW_EVENT_DEBUG`, `RUNTIME_RAW_EVENT_DEBUG`) and must not enable broad raw-event logging by default.
- Do not introduce backward-compatible dual event shapes; use existing `metadata.arguments` on segments and existing lifecycle `arguments`.
- Tests may require `pnpm install --frozen-lockfile --offline` and `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` in a fresh worktree before e2e execution.

## Assumptions

- The screenshots are from the same Activity component; the UI already renders arguments when normalized runtime messages provide non-empty `arguments`.
- Claude SDK safe/auto-allowed tool calls may not invoke our `canUseTool` permission callback, so raw assistant `tool_use` observation must be treated as an authoritative invocation source.
- Normal tools and `send_message_to` have different product semantics; preserving `send_message_to` segment-only display is intentional, not a failure to apply the generic normal-tool lifecycle contract.

## Risks / Open Questions

- Frontend segment handler tests currently assert Activity creation from segments; those tests must be rewritten around transcript ownership rather than simply deleted.
- If any non-Codex/non-Claude runtime currently sends executable segments without lifecycle events and expects Activity cards, that provider must be aligned to emit lifecycle events or explicitly exempted with a documented product decision.
- Lifecycle-before-segment ordering may still require transient synthetic conversation segment support; if kept, it must be treated as lifecycle-owned transcript fallback and later reconciled by segment events, not as an Activity ownership bypass.
- Need to verify run-history hydration does not rely on live segment-created Activity entries. Hydration has its own projection path and should remain lifecycle/projection-owned.

## Requirement-To-Use-Case Coverage

- Claude raw `tool_use -> tool_result` normal tools: REQ-001, REQ-002, REQ-003, REQ-005, REQ-012
- Permission callback duplicate avoidance: REQ-004
- Frontend Activity ownership and no duplicates: REQ-006, REQ-008
- Frontend transcript rendering: REQ-007
- `send_message_to` preservation: REQ-009
- Codex no-regression: REQ-010
- Memory/history no-duplicate trace: REQ-011
- Historical Activity hydration: REQ-013, REQ-014

## Acceptance-Criteria-To-Scenario Intent

- AC-001 and AC-002 validate the two-lane Claude normal-tool contract.
- AC-003 validates duplicate suppression across raw observation and permission callback paths.
- AC-004 and AC-005 validate the cleaned frontend ownership split.
- AC-006 validates ordering resilience without duplicate Activity cards.
- AC-007 validates the team-communication exception.
- AC-008 validates cross-runtime parity with Codex.
- AC-009 validates historical/memory projection invariants.
- AC-010 validates live/e2e behavior and fixes the current e2e matcher fragility.
- AC-011 validates click/open historical run Activity hydration.
- AC-012 validates the Claude standalone history projection merge risk.
- AC-013 validates Codex live Activity non-regression.

## Approval Status

The user explicitly decided on 2026-05-01 to continue the broader refactor in this same ticket rather than creating a follow-up ticket. This refined requirements basis supersedes the previous narrow bug-fix-only scope.
