import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation'
import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentContext } from '~/types/agent/AgentContext'

// Frozen real API009 responses, not a durable promise that missing identity is valid.
const product = new URL('../product/', import.meta.url)
const read = (name: string) => JSON.parse(readFileSync(new URL(name, product), 'utf8'))
const view = read('real-reconnect-after.api.json').response.data.agentRunCollaboration.root_agent

describe('API009-F001 real native projection plus live held input', () => {
  it.each(['agent', 'team'])('reconnects hosted %s without duplicating the accepted held input', kind => {
    const projection = read(`finding-${kind}-projection.api.json`).response.data.agentRunCollaborationMemberProjection
    const input = view.agent_input_states.find((entry: any) => entry.agent_run_id === projection.agentRunId).state
    const held = input.entries[0]
    expect(input.entries).toHaveLength(1)
    expect(held.state).toBe('held')
    expect(projection.conversation.filter((entry: any) => entry.content === held.content)).toHaveLength(1)
    const state = new AgentRunState(projection.agentRunId,
      buildConversationFromProjection(projection.agentRunId, projection.conversation, {
        agentDefinitionId: 'api009', agentName: kind, llmModelIdentifier: 'local-fixture',
      }))
    const context = new AgentContext({ runtimeKind: 'autobyteus' } as any, state)
    expect(handleAgentInputState(input, context)).toBe(true)
    const copies = context.conversation.messages.filter(message => message.type === 'user' && message.text === held.content)
    // Must fail on current integrated code: one anonymous historical bubble plus one held bubble.
    expect(copies).toHaveLength(1)
    expect(copies[0]).toMatchObject({ messageId: held.message_id, pendingInput: { state: 'held' } })
  })
})
