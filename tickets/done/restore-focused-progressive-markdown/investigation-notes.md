# Investigation Notes — Restore Focused Progressive Rich Markdown

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete — Design-ready`
- Investigation Goal: Verify the merged active/plain rendering behavior, locate the authoritative selected-conversation presentation path, and define the smallest clean-cut reversal that restores progressive rich Markdown without disturbing backend cadence or expanding into background-contention work.
- Scope Classification: `Small`
- Scope Classification Rationale: One local presentation-selection policy and its tests/file become obsolete; no backend, protocol, schema, persistence, settings, or new subsystem is needed.
- Scope Summary: Restore `MarkdownRenderer` for active text and expanded active reasoning in the already-mounted selected/focused conversation. Remove `LiveTextRenderer` and presentation-only completion wiring. Preserve stream completion metadata used outside rendering.
- Primary Questions To Resolve:
  - Is raw Markdown until completion the actual merged behavior? `Yes`.
  - Does the existing UI already mount only the selected/focused conversation? `Yes` for the main standalone, team-member, and mobile surfaces inspected.
  - Is a new progressive parser or focus contract needed? `No`.
  - Can backend cadence remain untouched? `Yes`.

## Request Context

The user observed that the merged performance change keeps active response Markdown raw until the whole segment completes, which materially worsens UX. The user confirmed that the already-merged 500 ms server cadence greatly improves performance and can be manually raised to 1,000 ms, so the focused frontend should return to its original rich progressive rendering. The user explicitly separated this quick ticket from a later investigation into microphone and context-file delays while an unfocused agent is working.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-focused-progressive-markdown`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-focused-progressive-markdown/tickets/in-progress/restore-focused-progressive-markdown`
- Current Branch: `codex/restore-focused-progressive-markdown`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-focused-progressive-markdown`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal --prune` succeeded on 2026-08-08; `origin/personal` resolved to `647b1119a9dc3ba2ba301243e1b5e752943454db`, equal to local `personal` at bootstrap (`0 0` divergence).
- Task Branch: `codex/restore-focused-progressive-markdown`, created directly from refreshed `origin/personal`.
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared main checkout contains unrelated local changes; all task artifacts and edits must remain in this dedicated clean worktree. Do not resurrect the removed prior worktree.

## Supplemental Task Artifact Inventory

None. The small behavior reversal is fully described by the three core artifacts.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-08 | Command | `git fetch origin personal --prune`; `git rev-parse origin/personal`; `git rev-list --left-right --count personal...origin/personal` | Refresh and verify authoritative base | Fetch succeeded; base `647b1119a`; local and remote personal matched | No |
| 2026-08-08 | Setup | `git worktree add -b codex/restore-focused-progressive-markdown /Users/normy/autobyteus_org/autobyteus-worktrees/restore-focused-progressive-markdown origin/personal` | Isolate the ticket | Clean dedicated task branch/worktree created from refreshed remote | No |
| 2026-08-08 | Repo | `git log -12 --oneline --decorate` | Confirm prior ticket merged | `cacf3c053` merged `codex/runtime-streaming-performance-followup` into personal; current HEAD is later `647b1119a` | No |
| 2026-08-08 | Doc | `tickets/done/runtime-streaming-performance-followup/{requirements.md,design-spec.md}` | Recover the merged intent and explicit tradeoff | Prior FR-007 deliberately chose safe plain active text and deferred incremental Markdown; backend 500 ms cadence is independent and merged | No |
| 2026-08-08 | Code | `autobyteus-web/components/conversation/segments/{TextSegment.vue,ThinkSegment.vue}` | Verify active/live presentation selector | Both mount `LiveTextRenderer` when `presentationComplete=false` and `MarkdownRenderer` otherwise | No |
| 2026-08-08 | Code | `autobyteus-web/components/conversation/segments/renderer/{LiveTextRenderer.vue,MarkdownRenderer.vue}`; `autobyteus-web/composables/useMarkdownSegments.ts` | Compare plain and rich owners | Plain renderer only escapes/preserves whitespace; rich owner already owns all Markdown parsing/presentation features | No |
| 2026-08-08 | Code | `autobyteus-web/components/conversation/AIMessage.vue`; `autobyteus-web/services/agentStreaming/handlers/segmentIdentity.ts` | Trace presentation completion | `AIMessage` derives a presentation-only boolean from message/segment completion; completion metadata also serves non-presentation event-monitor logic and should remain | No |
| 2026-08-08 | Code | `AgentWorkspaceView.vue`, `AgentTeamEventMonitor.vue`, `MobileChat.vue`, `AgentEventMonitor.vue`, `AgentConversationFeed.vue` | Verify focus/selection path | Main desktop/mobile surfaces pass only selected standalone context or focused team member into the shared conversation feed | No |
| 2026-08-08 | Code | `EventMonitorBrowseAssistantRow.vue` and callers of `TextSegment` | Check non-live reuse | Browse and test fixtures already omit the completion prop and therefore render richly; target keeps that behavior | No |
| 2026-08-08 | Repo | `git show 3b5144a0b -- <affected presentation files>` | Establish clean reversal boundary | Commit added `LiveTextRenderer`, conditional branches, completion props, AIMessage helper, and focused tests; these presentation pieces can be removed without reverting backend work | No |
| 2026-08-08 | Doc | `autobyteus-web/docs/content_rendering.md` | Identify durable content-rendering documentation impact | Conversation Active/Final Rendering documents the now-rejected split and will require delivery-stage sync | Yes — delivery |
| 2026-08-08 | Doc | `autobyteus-web/docs/agent_execution_architecture.md:815-825` | Check whether the agent-execution architecture independently specifies the active/final presentation contract | It explicitly says `AIMessage` passes completion, incomplete segments use `LiveTextRenderer`, and completion switches to `MarkdownRenderer`; it must be synchronized alongside `content_rendering.md` | Yes — delivery |
| 2026-08-08 | Doc | `tickets/in-progress/restore-focused-progressive-markdown/design-review-report.md` (`ARCH-REV-001`, `ARCH-001`) and `architecture-review-revision-record.md` | Process architecture-review design impact | Source architecture passed; review found the second durable documentation contract was omitted from the solution mapping | Resolved in SR-002; re-review required |
| 2026-08-08 | Command | `test -d autobyteus-web/node_modules` and package script inspection | Assess local baseline execution | New worktree has no `node_modules`; focused source/test behavior is directly asserted by existing tests. Dependency setup and execution belong downstream | Yes — implementation/API-E2E |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User selects a standalone agent or focused team member while it streams text | Server shaped `SEGMENT_CONTENT` -> frontend streaming service/handler appends delta -> selected conversation reactive feed -> `AIMessage` derives incomplete -> `TextSegment` -> `LiveTextRenderer`; `SEGMENT_END` flips to `MarkdownRenderer` | Current content remains visible but Markdown stays raw until completion | Source files and existing `TextSegment.spec.ts` / `AIMessage.spec.ts` |
| BEH-002 | User | User expands Thinking while an identified reasoning segment is active | Same selected conversation path -> `ThinkSegment` disclosure -> incomplete branch -> `LiveTextRenderer`; completion flips rich | Disclosure remains user-controlled; visible active reasoning is raw | `ThinkSegment.vue` and `ThinkSegment.spec.ts` |
| BEH-003 | System | Agent/team WebSocket session receives canonical runtime content | Canonical events -> merged server WebSocket egress -> configured fixed window -> existing `SEGMENT_CONTENT` -> frontend immediate dispatch | Backend owns normal content cadence and ordering; frontend has no second normal timer | Completed ticket artifacts and merged source at current base |
| BEH-004 | User | User changes selected standalone agent, focused team member, or mobile context | Workspace/mobile selector -> one `AgentEventMonitor` -> one `AgentConversationFeed` for the selected context | Rich DOM presentation is mounted for the selected/focused context; background stores can still process events independently | `AgentWorkspaceView.vue`, `AgentTeamEventMonitor.vue`, `MobileChat.vue` |
| BEH-005 | User/System | User loads/reopens history or browses completed active-trace content | Hydration/browse projection -> shared segment components without incomplete presentation gate -> `MarkdownRenderer` | Completed/historical content is rich and retains established features | `EventMonitorBrowseAssistantRow.vue`, `AIMessage.vue`, rendering docs |

## Design Health Assessment Evidence

- Change posture: `Behavior Change`
- Candidate root cause classification: `Local Implementation Defect`
- Refactor posture evidence summary: The existing Markdown renderer and selected-conversation spine remain healthy. The defect is the prior local choice to substitute a plain renderer for active content. A clean deletion/reconnection is sufficient; no architecture refactor is justified.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TextSegment.vue` / `ThinkSegment.vue` | One conditional selects between two presentation owners | Remove the rejected branch; do not create a third renderer | No |
| `AIMessage.vue` | Completion is consulted only to choose live/plain vs rich | Remove presentation-only prop derivation while retaining domain lifecycle metadata | No |
| Selected-context workspace components | Existing mount boundary already represents focus | Reuse it; a new focus prop/store would duplicate policy | No |
| Merged server egress | Cadence now has a backend owner | Frontend can restore rich UX without restoring frontend batching | No |
| User screenshots/background report | Unrelated foreground interactions lag while another agent works | Separate reachable performance problem; insufficient evidence to prescribe its owner in this ticket | Yes — later ticket |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/TextSegment.vue` | Text-segment presentation wrapper and file-action propagation | Selects plain vs rich based on prop | Restore unconditional rich owner and remove prop/import |
| `autobyteus-web/components/conversation/segments/ThinkSegment.vue` | Thinking disclosure and reasoning presentation | Selects plain vs rich when expanded | Preserve disclosure; restore unconditional rich owner |
| `autobyteus-web/components/conversation/AIMessage.vue` | Segment dispatch and agent metadata presentation | Computes/passes presentation completion to text/reasoning only | Remove presentation selector/plumbing; keep segment dispatch |
| `autobyteus-web/components/conversation/segments/renderer/LiveTextRenderer.vue` | Escaped active plain text | Becomes unused under approved behavior | Delete cleanly |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Authoritative rich Markdown, Mermaid, math, images, links, sanitization, file-action rendering | Already handles reactive content updates | Reuse unchanged |
| `autobyteus-web/services/agentStreaming/handlers/segmentIdentity.ts` | Segment lookup identity and presentation-completion lifecycle metadata | Completion remains used by event-monitor completion logic | Do not delete or reshape in this ticket |
| Focused component tests | Assert current live/plain split | Tests encode rejected behavior | Replace with progressive-rich assertions and retain disclosure/history coverage |
| `autobyteus-web/docs/content_rendering.md` | Durable content-rendering architecture documentation | Conversation Active/Final Rendering documents the rejected plain-live/completion switch | Delivery must describe progressive rich text/reasoning under server-shaped cadence and state that completion metadata remains lifecycle/event-monitor state, not a render gate |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable agent-stream execution architecture documentation | Lines 815–825 independently document `AIMessage` completion prop passing, `LiveTextRenderer`, and the completion-time switch | Delivery must replace that contract with direct progressive `MarkdownRenderer` delegation while retaining segment completion metadata for lifecycle/event-monitor consumers |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-08 | Repro | User-observed installed Electron behavior described in conversation | Raw Markdown flows until final segment completion, then converts to rich output | Matches the inspected conditional path exactly |
| 2026-08-08 | Test inspection | Existing `TextSegment.spec.ts`, `ThinkSegment.spec.ts`, `AIMessage.spec.ts` | Tests explicitly require plain active presentation and completion-time switch | Durable tests must be updated, not preserved as valid expectations |
| 2026-08-08 | Setup | New worktree dependency check | `autobyteus-web/node_modules` absent | No local test execution claimed during solution investigation |

## External / Public Source Findings

- None required. This is a local reversal of a known merged behavior using existing owners; no unstable external contract or library choice affects the design.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing frontend component tests can prove render selection. Browser/Electron validation should stream Markdown-rich text through a selected conversation using the already-configured server cadence.
- Required config, feature flags, env vars, or accounts: None for component coverage. Real streaming validation needs the normal local server/runtime setup already owned by API/E2E.
- External repos, samples, or artifacts cloned/downloaded: None.
- Setup commands that materially affected the investigation: Remote fetch and dedicated worktree creation recorded above.
- Cleanup notes: No temporary files or services created.

## Findings From Code / Docs / Data / Logs

1. The reported UX is not a timing accident. `presentationComplete=false` deliberately prevents `MarkdownRenderer` from mounting.
2. A `SEGMENT_END` or message terminal fallback marks presentation complete, causing the abrupt final conversion the user observed.
3. The pre-change behavior is recoverable by removing the local conditional. No incremental parser is necessary.
4. Because backend shaping is merged, rich parsing occurs only for shaped content frames rather than the former fine-grained runtime delta rate, subject to the server egress invariant.
5. The selected/focused feed is already a presentation boundary. This ticket must not add focus state merely to label behavior that current composition already enforces.
6. Both `docs/content_rendering.md` and `docs/agent_execution_architecture.md` durably state the active/plain completion-switch contract. They must be synchronized after the integrated source change: active text and visible active reasoning render progressively through `MarkdownRenderer`; completion metadata remains for lifecycle/event-monitor consumers but no longer selects a renderer.
7. Background WebSocket/store/reactivity work can still occur even when its transcript is not mounted. That separate problem cannot be solved or disproved by this rendering reversal.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Existing run history, raw traces, hydrated conversation state, and server settings; no stored shape is modified.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal readers and writers: Unchanged.
- Required semantics and invariants preserved by direct use: `Yes` — the target only changes which existing Vue presentation component consumes the already-projected string.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Not applicable.
- Concrete benefit, cost, and risk of migration: No benefit; migration would be unrelated and prohibited by scope.

## Constraints / Dependencies / Compatibility Facts

- `MarkdownRenderer` is shared by conversation, file-preview, and other surfaces; this ticket changes its callers, not its internals.
- Event Monitor absolute-path actions are capability-gated through existing props and event propagation; unconditional rich rendering must retain that propagation.
- Thinking remains collapsed by default, so its renderer is mounted only after user expansion.
- Current stream identity completion remains relevant outside renderer selection and must not be removed globally.
- No compatibility dual path is required; the user explicitly approved returning to progressive rich presentation.

## Open Unknowns / Risks

- Very large accumulated rich Markdown may still produce long individual render tasks. The user accepts cadence-based control and prefers rich UX; implementation should not invent a new fallback.
- The exact cause and scale of unfocused/background renderer contention remain unknown and require a subsequent ticket with controlled profiling.
- No unknown blocks this small presentation change.

## Notes For Architecture Reviewer

- Judge this as a clean-cut local behavior reversal, not a request for a new streaming parser.
- Confirm the implementation removes, rather than hides, `LiveTextRenderer` and presentation-only completion wiring.
- Confirm backend cadence/settings/egress and lifecycle identity files stay outside the source change except if a test import cleanup is strictly necessary.
- Confirm the existing selected/focused component composition is reused and no new focus state or background-performance claim is introduced.
- Confirm the delivery mapping covers both `autobyteus-web/docs/content_rendering.md` and `autobyteus-web/docs/agent_execution_architecture.md`, with completion metadata explicitly retained as lifecycle/event-monitor state.
