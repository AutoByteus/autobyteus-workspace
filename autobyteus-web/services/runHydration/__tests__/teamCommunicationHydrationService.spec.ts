import { describe, expect, it, vi } from 'vitest';
import { fetchTeamCommunicationForTeam } from '../teamCommunicationHydrationService';

const reference = () => ({
  __typename: 'TeamCommunicationReferenceFileObject',
  referenceId: 'reference-1', path: '/tmp/mobile-reference.txt', type: 'file',
  createdAt: '2026-08-12T12:00:00.000Z', updatedAt: '2026-08-12T12:00:01.000Z',
});

const message = (messageId: string, senderAgentRunId = 'teacher-run') => ({
  __typename: 'TeamCommunicationMessageObject',
  messageId,
  senderAgentRunId,
  receiverAgentRunId: 'task-student-run',
  content: `content:${messageId}`,
  messageType: 'peer_message',
  createdAt: '2026-08-12T12:00:02.000Z',
  referenceFiles: [reference()],
});

describe('teamCommunicationHydrationService exact Apollo boundary', () => {
  it('projects complete exact AgentRun messages and structured references', async () => {
    const client = { query: vi.fn().mockResolvedValue({
      data: { getTeamCommunicationMessages: [message('persistent-to-task')] }, errors: [],
    }) };
    const messages = await fetchTeamCommunicationForTeam({ client, teamRunId: 'root-team-run-1' });

    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({
      variables: { teamRunId: 'root-team-run-1' }, fetchPolicy: 'network-only',
    }));
    expect(messages).toEqual([{
      message_id: 'persistent-to-task',
      sender_agent_run_id: 'teacher-run',
      receiver_agent_run_id: 'task-student-run',
      content: 'content:persistent-to-task',
      message_type: 'peer_message',
      created_at: '2026-08-12T12:00:02.000Z',
      reference_files: [{
        reference_id: 'reference-1', path: '/tmp/mobile-reference.txt', type: 'file',
        created_at: '2026-08-12T12:00:00.000Z', updated_at: '2026-08-12T12:00:01.000Z',
      }],
    }]);
    expect(JSON.stringify(messages)).not.toContain('__typename');
  });

  it('rejects the complete collection when one row has an unsupported compatibility field', async () => {
    const invalid = { ...message('invalid-message'), senderAddress: '/Teacher' };
    const client = { query: vi.fn().mockResolvedValue({
      data: { getTeamCommunicationMessages: [message('valid-message'), invalid] }, errors: [],
    }) };

    await expect(fetchTeamCommunicationForTeam({ client, teamRunId: 'root-team-run-1' }))
      .rejects.toThrow('Team communication message[1] has unsupported or missing GraphQL fields.');
  });
});
