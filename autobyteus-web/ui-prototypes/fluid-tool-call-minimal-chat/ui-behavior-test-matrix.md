# UI Behavior Test Matrix

| flow | screen | trigger | expected next state image | acceptance check | open question / risk |
| --- | --- | --- | --- | --- | --- |
| agent-conversation-flow | fluid-tool-call-minimal-default | Agent emits successful `write_file` tool event | `images/web/agent-conversation-flow/fluid-tool-call-minimal-default.png` | Chat shows only compact tool pulse; no arguments disclosure rendered in message body. | Confirm whether tool pulse should auto-fade after success in future iteration. |
| agent-conversation-flow | fluid-tool-call-minimal-default | User reads AI answer after tool completes | `images/web/agent-conversation-flow/fluid-tool-call-minimal-default.png` | Prose answer clearly dominates vertical rhythm and visual hierarchy. | Validate if chip spacing is still sufficient when multiple tool calls occur back-to-back. |
| agent-conversation-flow | fluid-tool-call-minimal-default | User clicks `View in Activity` on tool pulse | `images/web/agent-conversation-flow/fluid-tool-call-minimal-default.png` | Right panel clearly presents Arguments/Logs/Result as the inspection target. | Confirm whether click should also auto-highlight matching activity card. |
