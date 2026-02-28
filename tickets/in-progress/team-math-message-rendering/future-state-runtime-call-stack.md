# Future-State Runtime Call Stack - team-math-message-rendering

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/team-math-message-rendering/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/team-math-message-rendering/implementation-plan.md`
- Source Design Version: `v1`

## Use Case Index

| use_case_id | Source Type | Requirement ID(s) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-002 | Student inter-agent message renders LaTeX math | Primary + Error |
| UC-002 | Requirement | R-003 | Student inter-agent message renders plain text + metadata | Primary |

## Use Case: UC-001 Student inter-agent message renders LaTeX math

### Goal

Render incoming inter-agent message content with markdown+KaTeX so inline and block math are visually displayed.

### Preconditions

- Team stream event `INTER_AGENT_MESSAGE` has payload `content` with markdown/LaTeX text.
- Student member conversation panel is focused.

### Expected Outcome

- Message body shows formatted markdown and rendered math (`.katex`/`.katex-display`) rather than raw delimiter text.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/handlers/teamHandler.ts:handleInterAgentMessage(payload, context)
├── autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:findOrCreateAIMessage(context) [STATE]
├── aiMessage.segments.push({ type: 'inter_agent_message', content, ... }) [STATE]
└── autobyteus-web/components/conversation/AIMessage.vue:render InterAgentMessageSegment
    ├── autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue:render sender/metadata + MarkdownRenderer
    ├── autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue:useMarkdownSegments(content)
    ├── autobyteus-web/composables/useMarkdownSegments.ts:normalizeMath + markdown-it + katex parse
    └── rendered HTML injected to message body [STATE]
```

### Error Path

```text
[ERROR] malformed/unsupported LaTeX expression
autobyteus-web/composables/useMarkdownSegments.ts:katex(... throwOnError=false)
└── fallback HTML renders with best-effort math/plain text (no crash)
```

### Coverage Status

- Primary Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Student inter-agent message renders plain text + metadata

### Goal

Ensure non-math messages remain readable and sender label/detail toggle behavior is preserved.

### Expected Outcome

- Sender line remains visible (`From <name>:`).
- Details toggle still works and metadata title is present.
- Plain text message body remains readable.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue
├── compute displaySender + metadataTitle
├── render sender label + MarkdownRenderer(content)
└── toggle details panel (message type + recipient role)
```

### Coverage Status

- Primary Path: `Covered`
