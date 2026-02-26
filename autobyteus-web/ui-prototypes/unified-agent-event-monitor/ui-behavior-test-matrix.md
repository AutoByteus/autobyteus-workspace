# UI Behavior Test Matrix

| flow | screen | trigger | expected next state image | acceptance check | open question / risk |
| --- | --- | --- | --- | --- | --- |
| agent-conversation-flow | event-monitor-unified (default) | User sends a message | `images/web/agent-conversation-flow/event-monitor-unified-default.png` | New user turn appears in same shared conversation surface with avatar + role chip only; no timestamp displayed. | Should token/cost text remain hidden in all future variants as a hard rule? |
| agent-conversation-flow | event-monitor-unified (default) | Agent responds | `images/web/agent-conversation-flow/event-monitor-unified-default.png` | Agent turn appears directly in sequence with same spacing rhythm and no vertical connector line. | Should agent tool-metadata be shown inline or only in Activity panel? |
| agent-conversation-flow | event-monitor-unified (default) | Composer focused for next input | `images/web/agent-conversation-flow/event-monitor-unified-default.png` | Composer remains visually attached to conversation card and does not appear detached. | Confirm desired focus/hover treatment for accessibility contrast in implementation. |
