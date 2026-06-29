# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/notification-segment-message-style/tickets/done/notification-segment-message-style/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/notification-segment-message-style/tickets/done/notification-segment-message-style/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/notification-segment-message-style/tickets/done/notification-segment-message-style/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/notification-segment-message-style/tickets/done/notification-segment-message-style/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/notification-segment-message-style/tickets/done/notification-segment-message-style/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/notification-segment-message-style/tickets/done/notification-segment-message-style/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review-passed handoff for frontend `SYSTEM_TASK_NOTIFICATION` / `system_task_notification` normal-message rendering.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed behavior is a frontend-only presentation replacement for conversation `system_task_notification` segments. The existing backend `SYSTEM_TASK_NOTIFICATION` transport payload, stream handler mapping, `system_task_notification` segment identity, and `AIMessage.vue` dispatch boundary must remain unchanged. The `SystemTaskNotificationSegment.vue` visual treatment must move from the old purple alert/card presentation to normal lightweight chat-message/agent-text rendering, preferably by reusing `MarkdownRenderer.vue`. The default visible UI must not include the old purple container/classes, inbox emoji, visible `System Task Notification` heading, nested colored `<pre>`/`code` panel, or `font-mono` treatment for main content. Representative multiline backend notification content with blank lines, task ids, task descriptions, and reference-file lists must remain readable. Semantic/test/accessibility hooks must remain through stable class/test id and/or accessible labeling. Other AI message segment behavior, feed ordering, avatar/name behavior, token cost display, and sender-name mapping must remain unchanged.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, no legacy old-card behavior is retained in scope, and obsolete visual elements were removed from the component.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `SystemTaskNotificationSegment.vue` renders notification content via lightweight wrapper and `MarkdownRenderer` | Changed | REQ-002, AC-002; design spec intended change; implementation handoff "What Changed" | Keep review-passed component coverage and execute it; add temporary browser surface probe to verify the rendered conversation surface. |
| Old purple alert/card visuals, emoji, visible heading, nested colored `<pre><code>`, and `font-mono` treatment | Removed | REQ-003, AC-003, AC-004; design spec legacy removal policy; code review legacy verdict | Keep component coverage that asserts absence; browser probe should also inspect the rendered feed DOM for absence. |
| `SYSTEM_TASK_NOTIFICATION` payload to `system_task_notification` segment mapping | Preserved | REQ-001, AC-001; design spec dependency rules; implementation handoff says handler contract unchanged | Existing service/handler durable coverage remains valid and should be re-executed. |
| `AIMessage.vue` segment dispatch to `SystemTaskNotificationSegment` | Preserved | AC-006; design spec says dispatcher must not absorb notification presentation | Existing dispatch smoke coverage remains valid and should be re-executed; browser probe should exercise feed -> AIMessage -> notification component path. |
| Semantic hooks for system notification identity | Preserved / Added | REQ-005, AC-005; implementation handoff records `system-task-notification`, `data-testid`, `role="note"`, `aria-label` | Component coverage remains valid; browser probe should assert semantic hook exists in the real feed DOM. |
| Backend notification copy generation and transport shape | Preserved / Out of scope | Requirements out-of-scope; design spec ownership map | No backend/API durable coverage changes required for this frontend presentation task. |
| Browser/Electron visual spacing | Unclear residual visual risk | Code review residual risk says actual browser/Electron visual spacing was not manually inspected | Use a temporary Nuxt browser probe page and Chrome/Playwright-core inspection; do not keep it as durable coverage because review-passed component/service tests already cover the lasting behavioral contract. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | Directly mounts the notification segment with multiline task content; verifies semantic hook, `role="note"`, aria label, visible content, markdown list/link rendering, no `<pre>`, no visible title/emoji, and no old purple/font-mono classes. | REQ-002, REQ-003, REQ-004, REQ-005; AC-002 through AC-005 | Still Valid | Reviewed source test and code review report; assertions match the approved new behavior rather than the obsolete card behavior. | Re-execute in final focused suite. |
| `autobyteus-web/components/conversation/__tests__/AIMessage.spec.ts` system task notification dispatch scenario | Verifies `AIMessage.vue` passes a `system_task_notification` segment to `SystemTaskNotificationSegment` without inlining or rewriting it. | AC-006; design dispatch boundary preservation | Still Valid | Reviewed source test; it protects the dispatcher/component boundary named in the design. | Re-execute in final focused suite. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/systemTaskNotificationHandler.spec.ts` | Verifies `handleSystemTaskNotification` preserves `sender_id` and `content` as `{ type: 'system_task_notification', senderId, content }`. | REQ-001; AC-001 | Still Valid | Reviewed source test; it targets the handler boundary added by implementation. | Re-execute in final focused suite. |
| `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` standalone notification case | Dispatches standalone `SYSTEM_TASK_NOTIFICATION` and asserts conversation segment creation with sender/content. | REQ-001; AC-001; UC-001 | Still Valid | Existing test was identified in upstream investigation and inspected during this coverage investigation. | Re-execute in final focused service suite. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` member notification case | Receives team/member `SYSTEM_TASK_NOTIFICATION`, routes it to the targeted member conversation, and asserts segment creation with sender/content. | REQ-001; AC-001; UC-002 | Still Valid | Existing test was identified in upstream investigation and inspected during this coverage investigation. | Re-execute in final focused service suite. |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | UI-to-WebSocket interrupt behavior for focused team member. | Unrelated to notification rendering. | Out Of Scope | File name is E2E-like, but scenario concerns input interruption, not notification segment display or streaming. | Do not execute for this task. |
| `autobyteus-web/guard:localization-boundary` and `audit:localization-literals` scripts | Guard localization boundaries and literal/audit policy. | Constraint: localized title may remain only for non-visible accessibility semantics or be cleaned up if unused. | Still Valid as executable guards | Implementation uses existing localization key as non-visible `aria-label`; code review already ran these guards. | Re-execute to confirm no localization regression. |
| `autobyteus-web/guard:web-boundary` script | Guard web/Electron boundary constraints. | Scope preserves frontend web/electron boundary and does not add backend/electron shortcuts. | Still Valid as executable guard | Code review already ran this guard; source change is web component only. | Re-execute to confirm no boundary regression. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found | N/A | Existing in-scope tests either already assert current behavior or were implementation-added for the current behavior. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | N/A | Existing review-passed durable component, dispatcher, handler, standalone stream, and team stream tests cover the durable contract for this small frontend presentation change. | N/A | N/A |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | No stale or inadequate existing durable coverage found that requires repository-resident edits after code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-UI-001 | Temporary Nuxt page under `autobyteus-web/pages/__api_e2e_notification_probe.vue`, served by `pnpm -C autobyteus-web dev`, inspected in Google Chrome via `playwright-core`, then removed. | Real Nuxt/browser conversation surface renders `AgentConversationFeed -> AIMessage -> SystemTaskNotificationSegment -> MarkdownRenderer`; representative multiline task notification appears inline with normal markdown, retains semantic hook, and lacks old purple alert/card/pre/title/emoji treatment. | It is a one-off visual/runtime probe for residual browser-surface risk. The durable lasting behavior is already covered by focused component/dispatcher/stream tests; keeping a permanent ad hoc route would pollute product routing. |
| TEMP-UI-002 | Temporary Nuxt/Vitest mounted feed probe under `autobyteus-web/tmp-api-e2e/SystemTaskNotificationSurface.probe.spec.ts`, then removed. | Happy-DOM/Nuxt runtime mount of `AgentConversationFeed` with adjacent normal text and notification segments exercises the realistic component chain and validates DOM semantics/absence of obsolete styling. | It is broader than unit coverage but duplicative as a durable test. It is useful execution evidence without permanently adding test surface after the earlier code review. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full Electron packaged-app rendering | The task is a frontend conversation component presentation change; no Electron-specific code path, installer, updater, lifecycle, or native process behavior is in scope. Browser/Nuxt rendering plus existing web/electron boundary guard is sufficient for this stage. | Low; Electron uses the same Nuxt-rendered component path for this UI surface. | None unless the browser probe exposes a runtime-only visual/layout issue. |
| Pixel-perfect visual design approval | No product screenshot baseline or exact spacing spec exists; requirements define absence of old alert-card visuals and normal-message rendering, not pixel values. | Low to medium; user could prefer further spacing adjustment after seeing the UI. | Delivery/user verification can review the final UI if desired; no reroute needed absent a functional/layout failure. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | Upstream artifacts are clear; implementation and code review found no remaining compatibility/legacy or design issue. | N/A |

## Execution Plan

1. Execute the review-passed focused Nuxt/Vitest suite for component rendering, `AIMessage` dispatch, direct handler mapping, standalone stream service, and team stream service.
2. Create and execute a temporary Nuxt/Vitest feed-level probe for `AgentConversationFeed -> AIMessage -> SystemTaskNotificationSegment -> MarkdownRenderer`, then remove the temporary probe file.
3. Create a temporary Nuxt page for representative standalone/team-style notification content, serve it through the Nuxt dev server, inspect it in Google Chrome using `playwright-core`, capture a screenshot artifact in the ticket folder, then stop the dev server and remove the temporary page/script.
4. Re-run localization and web boundary guards plus `git diff --check`.
5. Record execution evidence in the canonical API/E2E execution coverage report.
6. If no repository-resident durable coverage is added, updated, or removed after code review and all execution passes, hand the cumulative package to `delivery_engineer`. If a durable coverage edit becomes necessary, update this investigation first and route through `code_reviewer` after execution.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is sufficient and current. API/E2E will add temporary runtime/browser probes only, remove temporary scaffolding before handoff, and avoid repository-resident durable coverage changes after the initial code review unless final execution exposes a new gap.
