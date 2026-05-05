import { describe, expect, it } from 'vitest'
import { LMStudioChatRenderer } from '../../../../src/llm/prompt-renderers/lmstudio-chat-renderer.js'
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../../src/llm/utils/messages.js'

describe('LMStudioChatRenderer', () => {
  it('flattens prior tool calls into assistant text history', async () => {
    const renderer = new LMStudioChatRenderer()
    const rendered = await renderer.render([
      new Message(MessageRole.ASSISTANT, {
        tool_payload: new ToolCallPayload([
          { id: 'call_1', name: 'publish_artifacts', arguments: { artifacts: [{ path: 'draft.md' }] } },
        ]),
      }),
    ])

    expect(rendered).toEqual([
      {
        role: 'assistant',
        content: '[TOOL_CALL] publish_artifacts {"artifacts":[{"path":"draft.md"}]}',
      },
    ])
  })

  it('flattens tool results into user text history instead of tool-role messages', async () => {
    const renderer = new LMStudioChatRenderer()
    const rendered = await renderer.render([
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call_1', 'publish_artifacts', { ok: true }),
      }),
    ])

    expect(rendered).toEqual([
      {
        role: 'user',
        content: '[TOOL_RESULT] publish_artifacts {"ok":true}',
      },
    ])
  })
})
