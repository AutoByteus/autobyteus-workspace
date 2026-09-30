import { describe, expect, it } from 'vitest'
import { deriveCollaboratorAddFailures, parseDelegateTaskResult } from '../collaboratorAddFailures'

const call = (invocationId: string, recipient: string, result: unknown, toolName = 'delegate_task') => ({
  type: 'tool_call', invocationId, toolName, arguments: { recipient_address: recipient, description: 'x' },
  status: 'success', logs: [], result, error: null,
})
const names = new Map([['/marketing_team', 'Marketing Team'], ['/code_reviewer', 'Code Reviewer']])

describe('collaborator add failures', () => {
  it('reads the delegate result from objects, JSON strings, text parts and wrappers', () => {
    expect(parseDelegateTaskResult({ target_agent_run_id: null, message: 'why' })).toEqual({ target_agent_run_id: null, message: 'why' })
    expect(parseDelegateTaskResult('{"target_agent_run_id":"run-1"}')?.target_agent_run_id).toBe('run-1')
    expect(parseDelegateTaskResult([{ type: 'text', text: '{"target_agent_run_id":null,"message":"m"}' }])?.message).toBe('m')
    expect(parseDelegateTaskResult({ structuredContent: { target_agent_run_id: null, message: 's' } })?.message).toBe('s')
    expect(parseDelegateTaskResult('not json')).toBeNull()
  })

  it('reports null delegations to collaborators in the current turn only', () => {
    const conversation = { messages: [
      { type: 'user', text: 'first' },
      { type: 'ai', segments: [call('old', '/marketing_team', { target_agent_run_id: null, message: 'old reason' })] },
      { type: 'user', text: 'ask @Marketing Team and @Code Reviewer' },
      { type: 'ai', segments: [
        { type: 'text', content: 'bringing them in' },
        call('i1', '/marketing_team', { target_agent_run_id: null, message: 'The model is not available.' }),
        call('i2', '/code_reviewer', { target_agent_run_id: 'run-9' }),
        call('i3', '/writer', { target_agent_run_id: null, message: 'configured member, not a collaborator' }),
        call('i4', '/code_reviewer', '{"target_agent_run_id":null,"message":"busy"}', 'mcp__autobyteus_agent_tools__delegate_task'),
      ] },
    ] } as never
    expect(deriveCollaboratorAddFailures({ conversation, collaboratorNames: names })).toEqual([
      { invocationId: 'i1', address: '/marketing_team', name: 'Marketing Team', reason: 'The model is not available.' },
      { invocationId: 'i4', address: '/code_reviewer', name: 'Code Reviewer', reason: 'busy' },
    ])
  })

  it('a new send replaces the notice', () => {
    const conversation = { messages: [
      { type: 'user', text: 'ask @Marketing Team' },
      { type: 'ai', segments: [call('i1', '/marketing_team', { target_agent_run_id: null, message: 'no' })] },
      { type: 'user', text: 'never mind' },
    ] } as never
    expect(deriveCollaboratorAddFailures({ conversation, collaboratorNames: names })).toEqual([])
  })
})
