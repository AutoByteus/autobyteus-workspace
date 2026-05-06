# Investigation Notes

Scope: Small UI ordering fix.

## Findings

- `autobyteus-web/stores/teamCommunicationStore.ts` already returns focused-member perspective messages in global descending order through `compareMessagesDesc`.
- `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` splits `perspective.messages` into `sent` and `received` sections before rendering.
- The visual headers were removed earlier, but the component still renders sent messages first and received messages second, so the visible order is not email-like.
- The fix should use the store-provided ordered list directly in the component instead of regrouping by direction.

## Risk

- Low. The change is isolated to the Team communication panel list rendering and its default selection source.
- Existing reference rows need focused regression coverage because they are nested visually under each message row.
