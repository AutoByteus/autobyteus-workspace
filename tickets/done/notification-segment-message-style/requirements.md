# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The frontend `SYSTEM_TASK_NOTIFICATION` / `system_task_notification` conversation segment currently looks visually out of place in the normal chat stream. It renders as a prominent purple card with an inbox emoji, visible `System Task Notification` title, and monospaced `<pre>` content. Now that the backend has already been corrected to provide concise, human-readable notification content, the frontend should present that content like an ordinary chat/agent message segment rather than as a special alert card.

The desired target is a lightweight inline notification segment that follows the same reading rhythm as the existing agent `TextSegment` / normal message content. It may preserve notification semantics through DOM/test/accessibility attributes, but it should not visually dominate or look like a separate purple system panel.

## Investigation Findings

- The relevant frontend package is `autobyteus-web`.
- `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` maps each WebSocket `SYSTEM_TASK_NOTIFICATION` payload directly into an AI message segment with `{ type: 'system_task_notification', senderId, content }`.
- `autobyteus-web/components/conversation/AIMessage.vue` owns per-segment dispatch inside an AI message and delegates `segment.type === 'system_task_notification'` to `SystemTaskNotificationSegment.vue`.
- `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` owns the current visual treatment. It renders a heavy card: `my-4 p-4 border rounded-lg bg-purple-50 border-purple-200`, an emoji (`📥`), a visible heading, and the content inside `pre` / `font-mono` / purple background.
- Existing normal agent text uses `TextSegment.vue`, which delegates to `MarkdownRenderer.vue` inside a simple `mb-4` wrapper. User text uses ordinary `whitespace-pre-wrap break-words text-gray-900 leading-6` text. Existing inter-agent notifications were previously made compact and low-noise by rendering inline with normal markdown content and hiding metadata by default.
- The recently completed `tickets/done/improve-task-system-notifications` ticket explicitly kept frontend notification UI redesign out of scope while making backend notification content natural and task-centered. This request is the frontend follow-up to that out-of-scope item.
- Existing backend/docs establish `SystemTaskNotificationSegment` as the canonical visible UI surface for runtime-neutral system notifications. The frontend should restyle that component, not change the event type or convert notifications into user messages.
- Focused frontend tests could not be run in the newly created task worktree because `autobyteus-web/node_modules` is absent there (`cross-env: command not found`). Downstream implementation should run tests after installing/linking dependencies or in a hydrated frontend worktree.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: The segment routing and data model are already correctly owned; the mismatch is isolated to `SystemTaskNotificationSegment.vue` presentation classes/markup.
- Requirement or scope impact: Requirements should target a local component rendering/styling replacement while preserving the existing event, segment, and handler boundaries.

## Recommendations

- Restyle `SystemTaskNotificationSegment.vue` as a lightweight inline/chat-style segment.
- Prefer reusing `MarkdownRenderer.vue`, the same renderer used by agent `TextSegment`, so notification content follows normal message typography and still supports lists, line breaks, links, and markdown.
- Remove the visible purple card treatment, oversized emoji, visible title, nested colored `<pre>`, and monospace content style from the default notification presentation.
- Preserve notification semantics without visual heaviness, for example with `data-testid="system-task-notification-segment"`, the existing `system-task-notification` class, and/or an accessible `aria-label` using the current localized label.
- Do not change backend notification content generation, `SYSTEM_TASK_NOTIFICATION` transport shape, `system_task_notification` segment type, or `AIMessage.vue` segment dispatch except as needed for tests.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: A viewer reads a standalone runtime-neutral system notification (for example self-evolution completion) in the conversation stream and it looks like normal chat content rather than a purple alert panel.
- UC-002: A viewer reads a task-delegation activation/result/revision notification in a team/member conversation and it visually fits the adjacent agent messages.
- UC-003: Accessibility/testing can still identify the content as a system task notification even though the visual treatment is no longer a special card.

## Out of Scope

- Backend notification generation or copy changes.
- Task-delegation routing, delivery, de-duplication, persistence, or settlement behavior.
- WebSocket event names or payload shapes.
- Converting system notifications into user messages or ordinary AI text segments at the data/model level.
- Broad redesign of user message, agent message, inter-agent message, tool call, media, or error segment visuals.
- Rich structured notification cards beyond normal markdown/text rendering.

## Functional Requirements

- **REQ-001:** `SYSTEM_TASK_NOTIFICATION` payloads must continue to create `system_task_notification` segments with `senderId` and `content` through the existing frontend streaming handler.
- **REQ-002:** `SystemTaskNotificationSegment.vue` must render notification content with the same lightweight chat-message typography/rhythm as existing normal agent text segments, preferably by reusing `MarkdownRenderer.vue`.
- **REQ-003:** The default notification segment must not render as a purple/card-like alert: no visible purple container, no oversized emoji, no visible `System Task Notification` heading, no nested colored panel, and no monospaced `<pre>` treatment for the main content.
- **REQ-004:** Notification content must remain readable for the backend-provided multi-line display templates, including blank lines, task ids, descriptions, and markdown/list-like reference file sections.
- **REQ-005:** The component must retain machine/accessibility semantics that distinguish it from ordinary text without adding visual noise. Acceptable mechanisms include a stable class/test id and an accessible label or screen-reader-only label.
- **REQ-006:** The change must preserve existing light/dark readability and must not alter AI message avatar/name behavior, feed ordering, auto-scroll, token cost display, or inter-agent sender-name mapping.
- **REQ-007:** Durable frontend coverage should be added or updated for the system notification component's lightweight rendering and the existing streaming-handler segment creation behavior.

## Acceptance Criteria

- **AC-001:** Dispatching or handling a `SYSTEM_TASK_NOTIFICATION` payload still appends a segment matching `{ type: 'system_task_notification', senderId: <payload.sender_id>, content: <payload.content> }` to the target AI conversation message.
- **AC-002:** Mounting `SystemTaskNotificationSegment.vue` with sample content such as `You have a new task.

Task ID: task_0001

Task:
Write a summary.` renders the content in normal message/markdown flow, not inside a `<pre>` element.
- **AC-003:** The rendered default notification does not show the localized `System Task Notification` heading as visible text and does not render the inbox emoji as a primary visual element.
- **AC-004:** The rendered default notification does not depend on the old purple alert/card classes (`bg-purple-*`, `border-purple-*`, `text-purple-*`) or `font-mono` for the main content.
- **AC-005:** The component exposes a stable semantic hook such as `.system-task-notification` or `data-testid="system-task-notification-segment"`, and/or an accessible label so automated coverage and assistive tech can still distinguish it.
- **AC-006:** Existing `AIMessage.vue` behavior for other segment types (`text`, `tool_call`, `inter_agent_message`, `media`, `error`) remains unchanged.
- **AC-007:** Focused frontend tests for `SystemTaskNotificationSegment.vue`, `AIMessage.vue` segment dispatch if touched, and `systemTaskNotificationHandler.ts` pass in a hydrated frontend environment.

## Constraints / Dependencies

- Use the existing `SystemTaskNotificationSegment.vue` owner for visual rendering.
- Preserve the backend-owned visible notification content boundary from `tickets/done/improve-task-system-notifications`; frontend must not rewrite task-delegation copy heuristically.
- Preserve localization boundaries. If the visual heading is removed, the existing localization key may remain only for accessibility/screen-reader labeling, or unused stale keys should be cleaned up according to the project localization practice.
- Frontend test execution requires dependencies in the task worktree; the current worktree does not have `autobyteus-web/node_modules`.

## Assumptions

- The user's “notification segment” refers to `SystemTaskNotificationSegment.vue` for `system_task_notification` segments in the conversation feed.
- The preferred “agent message segment” target is the existing AI text rendering path (`TextSegment.vue` + `MarkdownRenderer.vue`) rather than the inter-agent segment specifically.
- A subtle semantic/accessibility marker is acceptable as long as the visible presentation reads like normal chat content.

## Risks / Open Questions

- If product wants a small visible “Notification” prefix instead of no visible label, that should be a deliberate variant; default analysis recommends no prominent visible heading to satisfy the “normal message” direction.
- Markdown rendering may format backend templates more richly than the old `<pre>` block. This is intended, but implementation should verify common task notification samples remain readable.
- If generated localization catalogs are expected to contain only used keys, removing the visible title may require catalog cleanup.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 standalone runtime-neutral notification | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007 |
| UC-002 task-delegation notification | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007 |
| UC-003 semantic/test identification | REQ-005, REQ-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Protect the existing streaming/data model boundary. |
| AC-002 | Ensure the core visual shift from alert/preformatted panel to normal message flow. |
| AC-003 | Remove the visible special-system heading and icon noise the user objected to. |
| AC-004 | Prevent old purple/card/monospace styling from persisting. |
| AC-005 | Preserve semantic hooks despite the low-noise visual treatment. |
| AC-006 | Prevent collateral segment-rendering regressions. |
| AC-007 | Ensure downstream implementation is locally verifiable. |

## Approval Status

Approved by user in conversation on 2026-06-29. User clarified: "just render that normal, make it feel like it's just a message" and requested the ticket be kicked off.
