# Design Spec

## Current-State Read

The current system notification UI path is already correctly routed and owned, but its presentation is visually mismatched with the normal conversation stream.

Current execution path:

1. Backend/server emits a WebSocket `SYSTEM_TASK_NOTIFICATION` payload with `{ sender_id, content }` and optional team identity fields.
2. `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` handles the payload, calls `findOrCreateAIMessage(context)`, and appends a `SystemTaskNotificationSegment` data object: `{ type: 'system_task_notification', senderId, content }`.
3. `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` renders conversation messages through `AIMessage.vue` for AI messages.
4. `autobyteus-web/components/conversation/AIMessage.vue` iterates `message.segments` and delegates `segment.type === 'system_task_notification'` to `SystemTaskNotificationSegment.vue`.
5. `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` currently renders a visually heavy alert card: purple border/background/text classes, a large inbox emoji, visible `System Task Notification` title, and content inside a monospaced `<pre>` block.

Relevant existing normal-message references:

- `TextSegment.vue` renders agent text with a minimal `mb-4` wrapper and `MarkdownRenderer`.
- `UserMessage.vue` renders normal user text with plain `whitespace-pre-wrap break-words text-gray-900 leading-6` typography.
- `InterAgentMessageSegment.vue` is a precedent for keeping semantic metadata available while making notification-like content compact and low-noise.

The backend notification content was recently corrected by `tickets/done/improve-task-system-notifications` to be concise and display-oriented. That ticket explicitly left frontend `SystemTaskNotificationSegment` visual redesign out of scope. This ticket is therefore a frontend-only presentation follow-up.

## Intended Change

Make `SystemTaskNotificationSegment.vue` render the notification content like a normal message segment.

The target state:

- Keep the `SYSTEM_TASK_NOTIFICATION` payload, handler, and `system_task_notification` segment type unchanged.
- Replace the purple alert/preformatted UI with lightweight normal-message rendering.
- Reuse `MarkdownRenderer.vue` so backend-provided multiline content reads naturally and matches agent message rendering.
- Preserve a subtle semantic/test/accessibility hook for the notification segment without a prominent visible label, icon, or card.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence:
  - `systemTaskNotificationHandler.ts` maps backend payload to a strongly typed segment and does not rewrite content. This boundary is correct.
  - `AIMessage.vue` already owns AI segment dispatch and delegates to the notification component. This boundary is correct.
  - The visual problem is isolated to `SystemTaskNotificationSegment.vue` markup/classes.
  - Existing `TextSegment.vue` already provides the normal agent-message rendering capability to reuse.
- Design response:
  - Apply a clean-cut local replacement of the notification component's visual structure.
  - Do not introduce a parallel notification renderer, compatibility mode, or frontend content rewriting.
- Refactor rationale:
  - No refactor is needed because current owner, boundary, API shape, file placement, and data structures remain healthy for this scope. The component already owns exactly the concern that must change: notification segment presentation.
- Intentional deferrals and residual risk, if any:
  - No rich structured notification card is introduced. If product later wants structured task notification fields, that should be a separate backend/frontend contract design. Current scope intentionally renders backend text normally.

## Terminology

- `System notification segment`: frontend `system_task_notification` segment rendered by `SystemTaskNotificationSegment.vue`.
- `Normal message rendering`: the lightweight text/markdown rendering rhythm used by agent text messages, not a special alert/card.
- `Semantic hook`: non-prominent attribute/class/accessible label that preserves machine/test/accessibility identification without visual noise.

## Design Reading Order

1. Follow the notification event-to-render data-flow spine.
2. Preserve existing handler and segment identity boundaries.
3. Replace only the visual owner component.
4. Add focused component coverage.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the old default alert-card presentation from `SystemTaskNotificationSegment.vue` in this change.
- Obsolete in-scope behavior: visible purple card, large inbox emoji, visible notification heading, nested purple content panel, and monospaced `<pre>` main content.
- No dual visual mode should remain for the old card style.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Backend WebSocket `SYSTEM_TASK_NOTIFICATION` payload | Normal-message-style notification content in conversation feed | Frontend conversation rendering, with `SystemTaskNotificationSegment.vue` owning final presentation | Shows the full path and confirms only the leaf presentation owner changes. |
| DS-002 | Bounded Local | `SystemTaskNotificationSegment.vue` props | `MarkdownRenderer` output inside a semantic wrapper | `SystemTaskNotificationSegment.vue` | Captures the local rendering replacement that removes the old alert card. |

## Primary Execution Spine(s)

- DS-001: `SYSTEM_TASK_NOTIFICATION payload -> systemTaskNotificationHandler -> system_task_notification segment -> AgentConversationFeed -> AIMessage segment dispatch -> SystemTaskNotificationSegment -> MarkdownRenderer normal message output`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The stream handler receives the existing backend notification payload and preserves it as a `system_task_notification` segment. Conversation rendering reaches `AIMessage.vue`, which delegates the segment to its component. The component then renders the backend-provided content using the normal markdown/message path instead of the old special card. | Stream payload, conversation segment, AI message dispatch, notification segment renderer | `SystemTaskNotificationSegment.vue` for final visual presentation | Accessibility/test hook, markdown rendering reuse |
| DS-002 | Inside the notification component, the segment content is passed directly to `MarkdownRenderer`; the wrapper is lightweight and semantic rather than visually alert-like. | Segment props, markdown renderer, semantic wrapper | `SystemTaskNotificationSegment.vue` | Screen-reader label or data-testid |

## Spine Actors / Main-Line Nodes

- `SYSTEM_TASK_NOTIFICATION` payload from backend/server.
- `handleSystemTaskNotification(...)` streaming handler.
- AI conversation message segment array.
- `AIMessage.vue` segment dispatcher.
- `SystemTaskNotificationSegment.vue` presentation owner.
- `MarkdownRenderer.vue` content renderer.

## Ownership Map

| Node | Owns |
| --- | --- |
| Backend task/runtime notification producers | Notification content and routing semantics. Not modified in this ticket. |
| `systemTaskNotificationHandler.ts` | Payload-to-segment mapping. Must remain a thin, content-preserving boundary. |
| `AIMessage.vue` | Segment dispatch inside AI messages. Must not absorb notification-specific presentation policy. |
| `SystemTaskNotificationSegment.vue` | Visual rendering and semantic wrapper for `system_task_notification` segments. This is the only required code owner change. |
| `MarkdownRenderer.vue` | Safe markdown rendering of message content. Reused, not changed. |

If a public facade or entry wrapper exists, `systemTaskNotificationHandler.ts` is a thin frontend stream boundary; it does not govern visual design.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `handleSystemTaskNotification(...)` | `SystemTaskNotificationSegment.vue` for visual presentation; backend for content semantics | Converts WebSocket payloads into conversation segments | Visual copy/styling policy or content rewriting |
| `AIMessage.vue` segment dispatch | Segment components | Chooses the right component for each segment type | Notification component internals |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Purple alert-card wrapper classes in `SystemTaskNotificationSegment.vue` | User wants the segment to feel like a normal message | Lightweight semantic wrapper in the same component | In This Change | Remove `bg-purple-*`, `border-purple-*`, `text-purple-*` default presentation. |
| Large inbox emoji visual | Adds special notification-card feel and visual noise | No visible icon by default | In This Change | Do not replace with another prominent icon. |
| Visible `System Task Notification` title | Makes segment feel like a system panel rather than a message | Optional screen-reader/accessibility label only | In This Change | Keep localization key only if used non-visibly; otherwise cleanup can be implementation-owned if required by audits. |
| `<pre><code>` / `font-mono` main content block | Makes normal prose look like a debug/protocol block | `MarkdownRenderer` normal message output | In This Change | Backend content is display text, not code. |
| Empty scoped style block | No longer useful | Remove or replace only with needed scoped markdown margin tweaks | In This Change | Avoid dead style blocks. |

## Return Or Event Spine(s) (If Applicable)

No new return/event spine is introduced. Existing backend-to-WebSocket notification events remain unchanged.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `SystemTaskNotificationSegment.vue`
- Chain: `Receive segment prop -> render semantic wrapper -> pass segment.content to MarkdownRenderer -> normalize markdown margins if necessary`
- Why it matters: this is the only behavior change and prevents accidental movement of copy policy into the handler or AI dispatcher.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Accessibility/test semantics | DS-001, DS-002 | `SystemTaskNotificationSegment.vue` | Provide `data-testid`, existing class, and/or `aria-label` / screen-reader-only label | Allows tests and assistive tech to identify a system notification without visible card treatment | A visible heading/icon returns and defeats the normal-message goal. |
| Markdown rendering reuse | DS-002 | `SystemTaskNotificationSegment.vue` | Render content through existing message renderer | Keeps typography consistent with agent text and avoids duplicate markdown/plain-text handling | A new ad hoc renderer would drift from normal message behavior. |
| Localization title key | DS-002 | Accessibility label if used | Keep localized notification name available non-visibly if helpful | Avoids product-literal or unused-key churn depending on implementation | Visible title comes back or localization audits fail. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Normal message content rendering | `MarkdownRenderer.vue` used by `TextSegment.vue` and `InterAgentMessageSegment.vue` | Reuse | Already owns safe markdown rendering and normal message typography behavior | N/A |
| Stream payload-to-segment mapping | `systemTaskNotificationHandler.ts` | Reuse unchanged | Correctly preserves backend payload identity/content | N/A |
| Segment dispatch | `AIMessage.vue` | Reuse unchanged | Already delegates by segment type | N/A |
| Notification display component | `SystemTaskNotificationSegment.vue` | Extend/modify | This component is the exact current presentation owner | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend conversation segments | Segment presentation and per-segment components | DS-001, DS-002 | `SystemTaskNotificationSegment.vue` | Extend | Local component presentation change only. |
| Frontend agent streaming | WebSocket payload-to-conversation segment mapping | DS-001 | `systemTaskNotificationHandler.ts` | Reuse | No change expected. |
| Markdown rendering | Safe message markdown rendering | DS-002 | `MarkdownRenderer.vue` | Reuse | Import into notification component. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` | Frontend conversation segments | System notification visual owner | Render notification segment as normal message content with semantic wrapper | Existing component already owns this segment type | Yes: `MarkdownRenderer.vue` |
| `autobyteus-web/components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | Frontend conversation segment tests | Component test | Verify normal-message rendering and old-card removal | Focused coverage belongs next to segment tests | Test utilities only |
| Existing streaming tests (`AgentStreamingService.spec.ts`, `TeamStreamingService.spec.ts`) | Frontend streaming tests | Stream behavior tests | Preserve payload-to-segment behavior | Existing tests already cover segment creation | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Markdown rendering | Existing `MarkdownRenderer.vue` | Conversation segment renderer | Already shared across text/inter-agent content | N/A | N/A | A notification-specific renderer |

No new reusable owned structure is needed.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SystemTaskNotificationSegment` type (`senderId`, `content`) | Yes | N/A | Low | Keep unchanged. |
| `SystemTaskNotificationPayload` (`sender_id`, `content`) | Yes | N/A | Low | Keep unchanged. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` | Frontend conversation segments | System notification visual owner | Lightweight normal-message rendering of `system_task_notification` content and semantic hooks | Existing file exactly owns this segment renderer | `MarkdownRenderer.vue` |
| `autobyteus-web/components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | Frontend conversation segment tests | Component-level durable coverage | Assert content renders normally, old purple/pre/icon/title treatment is absent, semantic hook remains | Focused and colocated with segment tests | Vue Test Utils |

## Ownership Boundaries

- Backend owns notification content semantics. Frontend must not inspect content strings or remove task-delegation phrases heuristically.
- Stream handler owns data conversion only. It must not own visual styling.
- `AIMessage.vue` owns segment selection only. It must not inline notification rendering.
- `SystemTaskNotificationSegment.vue` owns the visual change and can depend on `MarkdownRenderer.vue`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SystemTaskNotificationSegment.vue` | Wrapper markup, semantic hooks, `MarkdownRenderer` invocation | `AIMessage.vue` | `AIMessage.vue` rendering notification markdown/styling inline | Adjust props/component API, not dispatcher internals |
| Backend `SYSTEM_TASK_NOTIFICATION.content` contract | Task-delegation/self-evolution notification text | Frontend stream handler and component | Frontend rewriting content based on task strings | Fix backend content owner |

## Dependency Rules

Allowed:

- `SystemTaskNotificationSegment.vue` may import `MarkdownRenderer.vue`.
- `AIMessage.vue` may continue importing and rendering `SystemTaskNotificationSegment.vue` by segment type.
- Tests may mount `SystemTaskNotificationSegment.vue` directly and assert semantic hooks/classes.

Forbidden:

- Do not change `SystemTaskNotificationPayload` or `SystemTaskNotificationSegment` type for this visual change.
- Do not move notification rendering into `AIMessage.vue` or the stream handler.
- Do not add frontend string heuristics to clean backend task-delegation content.
- Do not keep an old/new dual visual branch for compatibility.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `handleSystemTaskNotification(payload, context)` | Stream notification payload | Create a conversation segment from backend payload | `sender_id` string + `content` string | Keep unchanged. |
| `SystemTaskNotificationSegment.vue` props | Notification segment presentation | Render `SystemTaskNotificationSegment` content normally | `segment: SystemTaskNotificationSegment` | Add no new required props. |
| `MarkdownRenderer.vue` `content` prop | Markdown content | Render markdown safely | `content: string` | Reuse unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SystemTaskNotificationSegment.vue` props | Yes | Yes | Low | Keep same `segment` prop. |
| `handleSystemTaskNotification` | Yes | Yes | Low | Keep unchanged. |
| `MarkdownRenderer` | Yes | Yes | Low | Reuse unchanged. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| System notification segment component | `SystemTaskNotificationSegment.vue` | Yes | Low | Keep name because segment semantics remain. |
| Normal message renderer | `MarkdownRenderer.vue` | Yes | Low | Reuse. |
| Stream handler | `handleSystemTaskNotification` | Yes | Low | Keep. |

## Applied Patterns (If Any)

- Component composition: `SystemTaskNotificationSegment.vue` composes `MarkdownRenderer.vue`, matching `TextSegment.vue` and `InterAgentMessageSegment.vue`.
- Thin boundary: stream handler remains a thin data conversion boundary.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` | File | System notification segment renderer | Render notification content like a normal message with semantic hooks | Existing segment component location | Backend copy policy, stream handling, old card mode |
| `autobyteus-web/components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | File | Segment component coverage | Verify normal rendering and removal of old visual treatment | Existing colocated segment test folder | Backend/protocol tests |

The layout remains flat within `components/conversation/segments` because this scope changes one existing segment component and mirrors existing segment test placement. Additional folders would be artificial.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/conversation/segments` | Main-Line Domain-Control for frontend segment rendering | Yes | Low | Existing segment components live here; one component change fits. |
| `components/conversation/segments/__tests__` | Off-Spine Concern: component tests | Yes | Low | Existing colocated test pattern. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Notification render shape | `<div class="system-task-notification mb-4" data-testid="system-task-notification-segment" :aria-label="$t(...)"><MarkdownRenderer :content="segment.content" /></div>` | Purple bordered card with emoji, visible title, `<pre class="font-mono bg-purple-100">` | Shows implementation should feel like normal message content while preserving a semantic hook. |
| Data boundary | `SYSTEM_TASK_NOTIFICATION -> handler appends segment -> component renders content` | Handler converts notification into a user message or text segment | Preserves canonical notification semantics and existing tests. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Prop or feature flag to keep old purple card | Could preserve previous visual behavior | Rejected | Replace old default visual outright; no dual visual branch. |
| Render normal style only for task-delegation notifications | Could target the most visible recent case | Rejected | All `system_task_notification` segments should use the normal-message treatment consistently. |
| Convert notification into `text` segment in handler | Would reuse text rendering automatically | Rejected | Keep segment semantics; reuse renderer inside notification component instead. |

## Derived Layering (If Useful)

- Transport/data layer: `SYSTEM_TASK_NOTIFICATION` payload and frontend handler.
- Conversation rendering layer: `AIMessage.vue` segment dispatch.
- Segment presentation layer: `SystemTaskNotificationSegment.vue` using `MarkdownRenderer.vue`.

Layering confirms dependency direction: lower data conversion does not own UI presentation, and segment presentation does not own backend copy.

## Migration / Refactor Sequence

1. Modify `SystemTaskNotificationSegment.vue`:
   - Import `MarkdownRenderer.vue`.
   - Replace card/emoji/title/pre markup with a lightweight semantic wrapper and `MarkdownRenderer`.
   - Add stable `data-testid="system-task-notification-segment"` and keep `system-task-notification` class.
   - Optionally use the existing localized title as `aria-label` or an `sr-only` label if no visible heading is desired.
   - Remove empty scoped styles or add only minimal margin normalization if markdown first/last-child spacing needs adjustment.
2. Add focused component test `SystemTaskNotificationSegment.spec.ts`:
   - Mount with multiline task-like content.
   - Assert content is rendered.
   - Assert no `pre` element, no visible title text, no inbox emoji, no old purple classes/font-mono.
   - Assert semantic hook exists.
3. Run focused frontend tests in a hydrated environment:
   - `pnpm -C autobyteus-web test:nuxt components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts components/conversation/__tests__/AIMessage.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts --run`
4. If localization/literal guards complain about the old title key, either keep it as an accessibility label or remove the stale generated key consistently with project practice.

## Key Tradeoffs

- Reusing `MarkdownRenderer` may render notification templates with markdown semantics instead of exact whitespace preservation. This is preferred because the backend content is display copy and should read like message prose.
- Keeping a non-visible semantic label preserves accessibility/testability without reintroducing the visual system-panel feel.
- No handler/data-model change means less risk and preserves prior notification routing work.

## Risks

- Actual browser/Electron visual spacing may need a small scoped first/last-child margin adjustment after implementation.
- If the old localization key becomes unused and audits enforce generated-catalog cleanup, implementation must handle that locally.
- The task worktree lacks frontend dependencies, so implementation may need dependency hydration before running tests.

## Guidance For Implementation

- Make the visual change only in `SystemTaskNotificationSegment.vue` unless tests reveal a necessary import/stub adjustment.
- Prefer this component shape:
  - class: `system-task-notification mb-4 text-gray-900 dark:text-slate-100`
  - test hook: `data-testid="system-task-notification-segment"`
  - accessibility: `:aria-label="$t('workspace.components.conversation.segments.SystemTaskNotificationSegment.system_task_notification')"`
  - content: `<MarkdownRenderer :content="segment.content" />`
- Do not display the localized title as normal visible text unless product explicitly asks for a subtle prefix later.
- Do not include emoji or colored alert styling.
- Keep backend and stream handler untouched.
