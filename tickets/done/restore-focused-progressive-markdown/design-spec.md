# Design Spec — Restore Focused Progressive Rich Markdown

## Current-State Read

The merged runtime-streaming performance work established two independent presentation decisions:

1. server WebSocket egress became the single content-cadence owner, with a configurable 500 ms default; and
2. active frontend text/reasoning stopped using `MarkdownRenderer` and instead used `LiveTextRenderer` until completion.

The first decision is now the accepted performance boundary and remains unchanged. The second creates the reported UX regression: shaped content remains visibly raw until `SEGMENT_END` or message completion flips `presentationComplete`, at which point the whole accumulated segment abruptly becomes rich.

The existing ownership layout is otherwise healthy. The server egress owns delivery cadence; frontend streaming services own protocol-to-conversation projection; the workspace/team/mobile composition already mounts the selected or focused conversation; `AIMessage` dispatches segment types; `TextSegment` and `ThinkSegment` own their presentation shells; and `MarkdownRenderer` owns rich Markdown parsing and presentation. The correct response is a clean local reversal: reconnect active text/reasoning to the established rich owner and delete the obsolete plain-live branch. Background event processing remains outside this ticket.

Two durable project documents describe the rejected active/final split: `autobyteus-web/docs/content_rendering.md` and `autobyteus-web/docs/agent_execution_architecture.md:815-825`. Both are part of the clean-cut documentation synchronization after source integration. Their target wording must distinguish presentation from lifecycle: active text and visible active reasoning use `MarkdownRenderer` for every server-shaped revision, while stream-segment completion metadata remains authoritative for lifecycle/event-monitor consumers and no longer selects a renderer.

## Intended Change

- Make `TextSegment` always use `MarkdownRenderer`, including while its stream identity remains incomplete.
- Make expanded `ThinkSegment` always use `MarkdownRenderer`, including while reasoning remains incomplete.
- Stop `AIMessage` from deriving or passing presentation completion solely for renderer selection.
- Delete `LiveTextRenderer` and its dedicated coverage.
- Replace tests that encode raw-until-complete behavior with tests proving progressive rich presentation across active content revisions.
- Synchronize both durable rendering contracts—`docs/content_rendering.md` and `docs/agent_execution_architecture.md`—to the progressive-rich path while explicitly retaining completion metadata for lifecycle/event-monitor consumers.
- Keep server egress, server settings, frontend streaming dispatch, segment lifecycle/identity, selected-context composition, history/hydration, and Markdown features unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | FR-001, FR-003 / AC-001, AC-002 | User watches the currently displayed conversation while text streams | Investigation BEH-001; current `AIMessage -> TextSegment -> LiveTextRenderer` path | Every shaped active text revision uses existing rich Markdown immediately | Server shaped message -> frontend projection -> selected feed -> `AIMessage` -> `TextSegment` -> `MarkdownRenderer` (DS-001, DS-003) |
| BEH-002 | User | FR-001, FR-003 / AC-003 | User expands Thinking while reasoning is active | Investigation BEH-002; current incomplete branch is plain | Expanded active reasoning uses rich Markdown while preserving disclosure lifecycle | User activation -> `ThinkSegment` disclosure -> `MarkdownRenderer` over current content (DS-002, DS-003) |
| BEH-003 | System | FR-002, FR-004 / AC-004, AC-006 | Canonical runtime content reaches a WebSocket client | Investigation BEH-003; merged configurable server egress | Preserve cadence, message ordering, protocol, and immediate frontend projection unchanged | Canonical event -> server egress -> WebSocket -> current frontend projection (DS-001) |
| BEH-004 | User | FR-005 / AC-007 | User selects an agent/member/mobile context | Investigation BEH-004; selected context alone is mounted in shared feed | Reuse current selection boundary; make no background-contention claim | Context selection -> `AgentEventMonitor` -> selected feed (DS-001, DS-002) |
| BEH-005 | User/System | FR-004 / AC-005, AC-006 | Completed/history/browse content is loaded | Investigation BEH-005; rich path already used | Preserve rich output, hydration, browse, and features | Existing projection/browse -> segment presentation -> `MarkdownRenderer` (DS-001, DS-003) |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `No`
- Root cause classification: `Local Implementation Defect`
- Refactor needed now: `No`
- Evidence: The current owners, API shapes, folder placement, selected-context boundary, and rich-rendering subsystem remain coherent. The reported regression is produced by a single local renderer-selection branch introduced when frontend rendering rather than backend cadence was also used as a performance control.
- Design response: Remove the rejected conditional path and reconnect active presentation to the existing `MarkdownRenderer` owner.
- Refactor rationale: Adding a new focus service, progressive parser, wrapper, flag, or adapter would create ownership and policy that this small reversal does not need.
- Intentional deferrals and residual risk: Very large accumulated Markdown can still create individual long render tasks, and background streams can still consume renderer work outside mounted transcript rendering. The user accepted server cadence as the focused-render tradeoff; background contention will be investigated separately.

## Terminology

- **Progressive rich Markdown:** Re-running the existing full `MarkdownRenderer` over the current accumulated segment whenever an already-shaped content revision reaches the displayed conversation. It does not mean incremental AST reconciliation.
- **Focused conversation:** The conversation already mounted by the selected standalone agent, focused team member, or selected mobile context.
- **Shaped revision:** A frontend content update already coalesced by the merged server WebSocket-egress cadence.

## Design Reading Order

Follow the current-state/behavior map, then DS-001 for the complete stream-to-presentation path, DS-002 for Thinking activation, and DS-003 for the bounded Markdown-render cycle. File changes are a direct projection of those owners.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Delete `LiveTextRenderer.vue`, its dedicated test, both live/plain branches, and presentation-only completion plumbing/tests.
- Stream-segment completion metadata is not legacy: it remains part of segment/event-monitor lifecycle logic and stays intact.
- No flag, dual path, fallback, wrapper, or hidden plain-live mode is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Run history, raw traces, hydrated conversation records, and persisted server settings; volumes vary by user.
- Relevant code-model, serialization, semantic, or physical-store change: None. Only Vue component selection changes.
- Normal reader/writer behavior and representative evidence: Existing readers project stored content to segment strings; writers and schemas are untouched.
- Required semantics and invariants under direct use: Exact content, identity, order, lifecycle, and settings remain unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: None introduced.
- Decision: `Not Affected`
- Decision rationale: No stored representation or reader/writer changes; migration would have no correctness benefit and unacceptable unrelated risk.
- Acceptance criteria or design constraints supported by this decision: AC-005, AC-006.

### Migration Plan

N/A — no persisted-data change.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-004, BEH-005 | Canonical runtime content for the selected conversation | Rich DOM presentation in the selected feed | Existing streaming projection plus conversation presentation owners | Shows cadence remains backend-owned while rich presentation returns at the established frontend boundary |
| DS-002 | Primary End-to-End | BEH-002, BEH-004 | User expands the selected conversation's Thinking disclosure | Current reasoning rendered richly | `ThinkSegment` | Preserves user-controlled disclosure while removing the completion gate |
| DS-003 | Bounded Local | BEH-001, BEH-002, BEH-005 | Reactive `content` prop revision | Parsed/sanitized Markdown segments and post-render bindings | `MarkdownRenderer` / `useMarkdownSegments` | Makes the accepted per-shaped-revision work and residual cost explicit |

## Primary Execution Spine(s)

### DS-001 — Selected live text

`Runtime canonical event -> AgentStreamWebSocketEgress -> WebSocket -> AgentStreamingService/TeamStreamingService -> segmentHandler content mutation -> selected AgentConversationFeed -> AIMessage -> TextSegment -> MarkdownRenderer`

### DS-002 — Expanded live reasoning

`User expands Thinking in selected feed -> ThinkSegment disclosure -> current reasoning content -> MarkdownRenderer -> rich reasoning DOM`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Server egress emits a shaped content message under its existing configured window. The existing frontend service resolves the standalone/team target and appends the delta to the canonical conversation segment. Vue updates the already-mounted selected feed; `AIMessage` dispatches the text segment; `TextSegment` delegates rich transformation to `MarkdownRenderer` without consulting completion. | Egress, stream projection, conversation segment, selected feed, segment presenter, Markdown renderer | Existing owners at each boundary; no new coordinator | Segment identity/lifecycle, file actions, managed images, auto-scroll |
| DS-002 | The user opens the existing Thinking disclosure. If reasoning is still streaming, the currently accumulated value is still delegated directly to `MarkdownRenderer`; later shaped revisions update that renderer while the disclosure remains open. | Thinking disclosure, reasoning segment, Markdown renderer | `ThinkSegment` for disclosure; `MarkdownRenderer` for rich content | Motion/accessibility, reasoning lifecycle |
| DS-003 | A content prop change invalidates the existing computed Markdown model. `useMarkdownSegments` normalizes/parses supported Markdown and `MarkdownRenderer` updates sanitized HTML/Mermaid segments and post-render bindings. This repeats only when the displayed component receives shaped revisions. | Content prop, Markdown model, render segments, DOM bindings | `MarkdownRenderer` | Sanitization, Prism, KaTeX, Mermaid, managed images, Event Monitor file actions |

## Spine Actors / Main-Line Nodes

| Node | Direct Role |
| --- | --- |
| `AgentStreamWebSocketEgress` | Existing normal content cadence and outbound ordering owner |
| `AgentStreamingService` / `TeamStreamingService` plus handlers | Existing protocol routing and conversation projection |
| Selected `AgentEventMonitor` / `AgentConversationFeed` | Mounts and presents the selected/focused conversation |
| `AIMessage` | Dispatches each AI segment to its type-specific presenter |
| `TextSegment` / `ThinkSegment` | Own text layout/file-action propagation and reasoning disclosure |
| `MarkdownRenderer` | Own rich Markdown transformation and rendered interactions |

## Ownership Map

- Server egress continues to own **when** normal content revisions cross the WebSocket.
- Frontend streaming services continue to own **which conversation segment** receives each delta.
- Workspace/team/mobile composition continues to own **which conversation is mounted**.
- `AIMessage` owns segment-type dispatch only; it no longer owns live/final presentation selection.
- `TextSegment` and `ThinkSegment` own their local visual shell and delegate all content formatting to `MarkdownRenderer`.
- `MarkdownRenderer` remains authoritative for Markdown parsing, sanitization, rich feature delegation, and interaction binding.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. No new facade or wrapper is introduced. Existing components retain their established roles.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `components/conversation/segments/renderer/LiveTextRenderer.vue` | Approved behavior no longer has a plain active presentation | Existing `MarkdownRenderer.vue` | In This Change | Delete file, not hide it |
| `renderer/__tests__/LiveTextRenderer.spec.ts` | Tests a removed component | `TextSegment`/`ThinkSegment` rich active coverage | In This Change | Delete |
| `presentationComplete` props/conditional branches in `TextSegment` and `ThinkSegment` | Completion no longer selects renderer | Unconditional Markdown delegation | In This Change | Preserve unrelated props/events |
| `AIMessage.isSegmentPresentationComplete` and its imports/prop passing/tests | Presentation no longer depends on completion | Existing segment dispatch | In This Change | Do not remove lifecycle metadata itself |
| `autobyteus-web/docs/content_rendering.md` active/final presentation contract | Describes the rejected plain-live/completion switch | Progressive rich text/reasoning documentation under server-shaped cadence | In This Change | Delivery sync after integrated refresh; retain completion metadata as lifecycle/event-monitor state |
| `autobyteus-web/docs/agent_execution_architecture.md:815-825` active/final presentation contract | Independently names deleted `LiveTextRenderer` and completion-based renderer selection | Progressive rich text/reasoning documentation under server-shaped cadence | In This Change | Delivery sync after integrated refresh; do not erase completion metadata from dispatch/lifecycle architecture |

## Return Or Event Spine(s) (If Applicable)

No separate business return spine. File-action events already propagate `MarkdownRenderer -> TextSegment/ThinkSegment -> AIMessage -> AgentEventMonitor` and remain unchanged as an off-spine interaction path.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MarkdownRenderer`.
- DS-003 chain: `content prop -> computed useMarkdownSegments model -> Markdown-it/math/code/image/file-action processing -> sanitized HTML or Mermaid component -> post-render bindings`.
- Why it matters: this is the accepted work that now occurs once per shaped revision for mounted content; the task deliberately reuses rather than redesigns it.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Segment completion metadata | DS-001, DS-002 | Streaming projection/event monitor | Track stream identity and completed presentation state for lifecycle consumers | Existing correctness/hydration logic still needs it | Removing it as “unused presentation state” could regress completion logic |
| File-action propagation | DS-001, DS-002, DS-003 | Event Monitor presentation | Emit typed user-activated path actions | Preserve current Event Monitor capability | Mixing filesystem effects into parsing would violate boundary/security design |
| Managed images/links/Mermaid/math/highlighting | DS-003 | `MarkdownRenderer` | Existing rich feature processing | Provides approved rich UX | Reimplementing in segment wrappers would duplicate rendering policy |
| Server interval setting | DS-001 | Server egress | Configure 100–2,000 ms content window | User-controlled performance/latency tradeoff | A frontend timer would duplicate cadence and stack latency |
| Background-contention profiling | None in this ticket | Future investigation | Diagnose global renderer responsiveness | Separate reachable problem needs evidence | Adding speculative controls here would expand scope without root-cause proof |

## Ownership Boundaries

- The server egress boundary remains authoritative for content cadence; frontend presentation must neither query its internals nor add a parallel timer.
- Frontend streaming services remain authoritative for protocol projection; render components consume conversation state rather than WebSocket messages.
- Selected-context workspace components remain authoritative for focus/mount composition; segment presenters do not inspect stores to rediscover focus.
- `MarkdownRenderer` remains authoritative for rich content; `TextSegment` and `ThinkSegment` must not reproduce parsing or sanitization.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentStreamWebSocketEgress.send` | Timer, pending groups, merge/flush policy | Standalone/team handlers and broadcasters | Frontend or renderer creates another cadence | Extend egress in a separate reviewed ticket, not here |
| Frontend streaming service/handlers | Protocol routing, segment mutation, identity | WebSocket message dispatch | Vue component parses protocol directly | Extend typed projection handler |
| `MarkdownRenderer` props/events | Parser model, sanitization, rich delegates, action bindings | `TextSegment`, `ThinkSegment`, other established consumers | Wrapper calls `useMarkdownSegments` in parallel | Extend `MarkdownRenderer` contract if a real shared need appears |

## Dependency Rules

- `TextSegment` and `ThinkSegment` may depend on `MarkdownRenderer`; they must not depend on `LiveTextRenderer` after the change.
- `AIMessage` may dispatch segment objects to presenters; it must not compute completion solely to select content formatting.
- Presentation components may not depend directly on egress settings, WebSocket services, or focus stores.
- No frontend timer, feature flag, or plain fallback may bypass the clean-cut rich policy.
- Segment lifecycle/identity code must not depend on presentation components.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MarkdownRenderer` `content` prop | One Markdown source string | Produce established rich presentation reactively | Content string, optional existing resolver/action capability | Unchanged interface |
| `TextSegment` `content` prop | One text segment | Present text and relay file actions | Segment content string | Remove `presentationComplete` |
| `ThinkSegment` `content` prop | One reasoning segment | Disclose and present reasoning | Segment content string | Remove `presentationComplete` |
| `AIMessage` segment dispatch | One AI message | Route each typed segment to presenter | Existing typed `AIResponseSegment` union | No completion-format policy |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `MarkdownRenderer` | Yes | Yes | Low | None |
| `TextSegment` | Yes | Yes | Low | Remove obsolete completion prop |
| `ThinkSegment` | Yes | Yes | Low | Remove obsolete completion prop |
| `AIMessage` dispatch | Yes | Yes | Low | Remove obsolete presentation helper/imports |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Rich Markdown owner | `MarkdownRenderer` | Yes | Low | Reuse unchanged |
| Text presenter | `TextSegment` | Yes | Low | Reuse |
| Reasoning disclosure | `ThinkSegment` | Yes | Low | Reuse |
| Plain active renderer | `LiveTextRenderer` | Yes but obsolete | N/A | Delete |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Progressive rich presentation | Conversation rendering / `MarkdownRenderer` | Reuse | It is the existing authoritative rich owner and already reacts to content | N/A |
| Content cadence | Server WebSocket egress/settings | Reuse | Already merged, configured, and authoritative | N/A |
| Focus selection | Workspace/team/mobile composition | Reuse | Already mounts selected/focused conversation | N/A |
| Background performance diagnosis | None selected yet | Deferred to separate investigation | Root cause not established and explicitly out of scope | N/A for this ticket |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server agent-stream WebSocket egress | Normal content cadence and ordering | DS-001 | Server stream sessions | Reuse unchanged | No source changes |
| Frontend agent streaming | Protocol projection and segment lifecycle | DS-001 | Conversation context | Reuse unchanged | Remove no lifecycle metadata |
| Conversation presentation | Segment dispatch, text/reasoning shell, rich Markdown | DS-001, DS-002, DS-003 | Selected feed | Modify/reuse | Only in-scope source area |
| Workspace selection | Selected/focused conversation composition | DS-001, DS-002 | Workspace/mobile surfaces | Reuse unchanged | No new focus state |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `TextSegment.vue` | Conversation presentation | Text-segment presenter | Unconditional rich text delegation and file-action relay | Existing coherent wrapper | `MarkdownRenderer` |
| `ThinkSegment.vue` | Conversation presentation | Reasoning disclosure | Disclosure plus unconditional rich reasoning delegation | Existing coherent owner | `MarkdownRenderer` |
| `AIMessage.vue` | Conversation presentation | Segment dispatcher | Typed dispatch without completion-format policy | Existing coherent dispatcher | Typed segment union |
| Focused specs | Conversation tests | Component contracts | Active rich presentation and preserved disclosure | Located beside owners | Existing stubs |
| `docs/content_rendering.md` | Durable project documentation | Content-rendering architecture | Current progressive-rich conversation presentation contract | Existing rendering documentation owner | Source/design outcome |
| `docs/agent_execution_architecture.md` | Durable project documentation | Agent execution architecture | Current stream-to-presentation contract and lifecycle/presentation distinction | Existing execution documentation owner | Source/design outcome |

## Reusable Owned Structures Check

No new repeated structure or logic is introduced. The task reduces policy and reuses `MarkdownRenderer`; creating a shared selector/helper would be empty indirection.

## Shared Structure / Data Model Tightness Check

No shared type/schema/model changes. Existing stream identity remains semantically unchanged.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/TextSegment.vue` | Conversation presentation | Text presenter | Always render current content richly; relay file actions | Existing wrapper remains tight | `MarkdownRenderer` |
| `autobyteus-web/components/conversation/segments/ThinkSegment.vue` | Conversation presentation | Reasoning disclosure | Preserve disclosure; always render visible current reasoning richly | Disclosure and its content belong together | `MarkdownRenderer` |
| `autobyteus-web/components/conversation/AIMessage.vue` | Conversation presentation | Typed segment dispatcher | Remove presentation completion derivation/props only | Keeps dispatch responsibility singular | Existing segment types |
| `TextSegment.spec.ts`, `ThinkSegment.spec.ts`, `AIMessage.spec.ts` | Conversation tests | Component contracts | Replace rejected live/plain assertions with rich-active and no-gate expectations | Tests stay with owners | Test stubs |
| `LiveTextRenderer.vue` and spec | N/A after change | N/A | Delete | Obsolete | N/A |
| `autobyteus-web/docs/content_rendering.md` | Durable project documentation | Content-rendering architecture | Replace active/plain split with progressive-rich behavior; retain completion metadata rationale | One current rendering contract | Source/design outcome |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable project documentation | Agent execution architecture | Replace completion-selected renderer description; retain completion metadata for lifecycle/event-monitor consumers | One current execution contract | Source/design outcome |

## Applied Patterns (If Any)

- Existing **strategy-by-segment-type** dispatch in `AIMessage` is retained.
- No new pattern is introduced. Direct reuse is clearer than a new strategy selector because only one approved text/reasoning renderer remains.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/AIMessage.vue` | File | Segment dispatcher | Remove completion-format selection | Existing dispatcher path | Egress timing or Markdown parsing |
| `autobyteus-web/components/conversation/segments/TextSegment.vue` | File | Text presenter | Direct rich delegation | Existing segment folder | Focus-store lookup or parser copy |
| `autobyteus-web/components/conversation/segments/ThinkSegment.vue` | File | Reasoning disclosure | Direct rich delegation while expanded | Existing segment folder | Cadence logic |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | File | Rich renderer | Reused unchanged | Existing renderer depth | WebSocket/focus policy |
| `autobyteus-web/components/conversation/segments/renderer/LiveTextRenderer.vue` | File | Obsolete | Delete | No approved owner remains | N/A |
| colocated `__tests__` files | File set | Component contract tests | Verify approved live-rich behavior | Existing test layout | Backend cadence assertions |
| `autobyteus-web/docs/content_rendering.md` | File | Durable content-rendering documentation | Describe direct progressive rich text/reasoning on shaped revisions and completion metadata's retained non-presentation role | Existing rendering architecture reference | Rejected `LiveTextRenderer`/completion-switch contract |
| `autobyteus-web/docs/agent_execution_architecture.md` | File | Durable agent-execution documentation | Describe the same progressive presentation inside the stream execution path while preserving lifecycle/event-monitor completion semantics | Existing execution architecture reference | Deleted component or presentation-gate claims |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/conversation/` | Main-Line Domain-Control / presentation | Yes | Low | AI message dispatch stays here |
| `components/conversation/segments/` | Main-Line presentation | Yes | Low | Type-specific segment wrappers remain coherent |
| `components/conversation/segments/renderer/` | Off-Spine rich-render concern | Yes | Low | Delete obsolete renderer; retain authoritative one |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Active text | First shaped revision `# Plan\n\n**Start**` is immediately displayed as a heading and bold text; a later shaped suffix updates the same rich renderer | Show `#` and `**` literally until `SEGMENT_END` | Pins down “progressive rich” as user-visible behavior |
| Cadence ownership | Server emits shaped revision at configured 500/1,000 ms window -> frontend renders it immediately | Server timer -> frontend timer -> renderer, or component reads setting | Prevents stacked latency and policy duplication |
| Focus ownership | Existing selected `AgentEventMonitor` mounts the conversation | Each segment queries a global focus store | Avoids duplicate focus state and hidden coupling |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `LiveTextRenderer` behind a flag | Could preserve prior performance fallback | Rejected | Delete component and branch; future alternatives require new evidence/approval |
| Keep optional `presentationComplete` props but ignore them | Minimizes call-site diff | Rejected | Remove obsolete props and callers so contract matches behavior |
| Add active/final renderer mode to Settings | Would make UX configurable | Rejected | Existing backend cadence is the approved control; one rich presentation policy |
| Restore old frontend cadence scheduler | Might bound renderer work | Rejected | Keep merged server egress as sole cadence owner |

## Derived Layering (If Useful)

Explanatory only: `server transport shaping -> frontend projection -> selected conversation presentation -> rich-render concern`. No new layer is added.

## Change / Refactor Sequence

1. Update `TextSegment.vue` to render `MarkdownRenderer` unconditionally and remove the obsolete prop/import/branch.
2. Update `ThinkSegment.vue` similarly while preserving disclosure behavior.
3. Remove `AIMessage` presentation-completion prop passing, helper, and now-unused imports; do not change stream identity/lifecycle code.
4. Delete `LiveTextRenderer.vue` and its dedicated spec.
5. Replace focused tests with active rich-render assertions, content-revision assertions, preserved historical/final behavior, and preserved Thinking disclosure behavior.
6. Run implementation-scoped frontend unit/type/build checks available in the repository.
7. After code review, API/E2E investigates durable coverage and validates a real selected stream with Markdown syntax before and after completion; background contention is not part of that success claim.
8. Delivery refreshes against latest remote personal and updates both `autobyteus-web/docs/content_rendering.md` and `autobyteus-web/docs/agent_execution_architecture.md` to remove the obsolete `LiveTextRenderer`/completion-switch contract. Both must state that active text and visible active reasoning render progressively through `MarkdownRenderer` on each server-shaped revision, while stream-segment completion metadata remains in lifecycle/event-monitor logic and no longer selects presentation.

## Key Tradeoffs

- **UX over per-render minimization:** Full accumulated Markdown is parsed on each shaped revision, but normal revision frequency is already bounded server-side and the user explicitly prefers progressive rich output.
- **Simple reversal over incremental parsing:** Reusing the known renderer is smaller, safer, and easier to verify than building partial-AST/stable-block machinery without evidence that it is necessary at the new cadence.
- **Existing focus composition over new interest state:** The main transcript already mounts selected content. This ticket does not pretend that mount selection eliminates background WebSocket/store work.

## Risks

- A single very large/complex Markdown revision can still block the renderer even at low frequency. Preserve this as a known tradeoff and measure separately if it becomes a supported reproduction.
- Rich features such as Mermaid or managed images may update during streaming; existing renderer behavior and safety boundaries apply. Do not add special live exceptions in this quick ticket.
- Removing presentation completion from `AIMessage` must not lead implementation to delete stream-segment completion metadata still used by event-monitor completion logic.
- The user may perceive global slowness from background processing after this ticket. Delivery must not claim that separate issue is fixed.

## Guidance For Implementation

- Prefer the inverse of the exact presentation portion added by commit `3b5144a0b`; do not revert the entire commit because it also contains the approved backend egress/settings work.
- Keep the diff presentation-only. A backend, protocol, setting, streaming-service, or lifecycle-source change is a scope violation unless returned to solution design with new evidence.
- Use one renderer path, not `v-if="true"`, dead props, flags, or compatibility comments.
- Retain `enableEventMonitorFileActions` and `file-path-action` propagation unchanged.
- Tests should update `content` while the segment is incomplete and show that the Markdown renderer remains mounted and receives the new value.
- Implementation handoff must name both durable docs for delivery synchronization; implementation must not rewrite lifecycle metadata merely to make documentation simpler.
- Do not infer success on renderer-wide background contention from this ticket's browser validation.
