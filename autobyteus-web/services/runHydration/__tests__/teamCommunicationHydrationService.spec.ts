import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { fetchAndHydrateTeamCommunicationForTeam } from '../teamCommunicationHydrationService';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';

const address = (
  memberAddress: string,
  taskTeamRunIds: string[] = [],
  taskAgentRunId: string | null = null,
) => ({
  __typename: 'TeamExecutionAddressObject',
  rootTeamRunId: 'root-team-run-1',
  taskTeamRunIds,
  memberAddress,
  taskAgentRunId,
});

const reference = () => ({
  __typename: 'TeamCommunicationReferenceFileObject',
  referenceId: 'reference-1',
  path: '/tmp/mobile-reference.txt',
  type: 'file',
  createdAt: '2026-08-12T12:00:00.000Z',
  updatedAt: '2026-08-12T12:00:01.000Z',
});

const message = (input: {
  messageId: string;
  senderAddress: ReturnType<typeof address>;
  receiverAddress: ReturnType<typeof address>;
  referenceFiles?: ReturnType<typeof reference>[];
}) => ({
  __typename: 'TeamCommunicationMessageObject',
  messageId: input.messageId,
  senderAddress: input.senderAddress,
  receiverAddress: input.receiverAddress,
  content: `content:${input.messageId}`,
  messageType: 'message',
  createdAt: '2026-08-12T12:00:02.000Z',
  referenceFiles: input.referenceFiles ?? [],
});

const clientReturning = (getTeamCommunicationMessages: unknown[]) => ({
  query: vi.fn().mockResolvedValue({ data: { getTeamCommunicationMessages } }),
});

describe('teamCommunicationHydrationService Apollo boundary', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('projects exact Apollo persistent and ordered task-Team messages before real store admission', async () => {
    const client = clientReturning([
      message({
        messageId: 'persistent-message',
        senderAddress: address('/Teacher'),
        receiverAddress: address('/StudentStudyGroup/student_one'),
        referenceFiles: [reference()],
      }),
      message({
        messageId: 'task-team-message',
        senderAddress: address('/StudentStudyGroup/student_one', ['task-team-outer', 'task-team-inner']),
        receiverAddress: address('/Teacher'),
      }),
    ]);

    await fetchAndHydrateTeamCommunicationForTeam({
      client,
      teamRunId: 'root-team-run-1',
    });

    const messages = useTeamCommunicationStore().getMessagesForTeam('root-team-run-1');
    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({
      variables: { teamRunId: 'root-team-run-1' },
      fetchPolicy: 'network-only',
    }));
    expect(messages).toEqual([
      expect.objectContaining({
        messageId: 'persistent-message',
        senderAddress: {
          rootTeamRunId: 'root-team-run-1',
          taskTeamRunIds: [],
          memberAddress: '/Teacher',
          taskAgentRunId: null,
        },
        referenceFiles: [{
          referenceId: 'reference-1',
          path: '/tmp/mobile-reference.txt',
          type: 'file',
          createdAt: '2026-08-12T12:00:00.000Z',
          updatedAt: '2026-08-12T12:00:01.000Z',
        }],
      }),
      expect.objectContaining({
        messageId: 'task-team-message',
        senderAddress: {
          rootTeamRunId: 'root-team-run-1',
          taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
          memberAddress: '/StudentStudyGroup/student_one',
          taskAgentRunId: null,
        },
      }),
    ]);
    expect(JSON.stringify(messages)).not.toContain('__typename');
    expect(Object.keys(messages[0]!.senderAddress)).toEqual([
      'rootTeamRunId',
      'taskTeamRunIds',
      'memberAddress',
      'taskAgentRunId',
    ]);
  });

  it('rejects the complete Apollo collection when one row has an unsupported identity field', async () => {
    const invalid = message({
      messageId: 'invalid-message',
      senderAddress: address('/Teacher'),
      receiverAddress: address('/StudentStudyGroup/student_one'),
    }) as ReturnType<typeof message> & { senderAddress: ReturnType<typeof address> & { memberPath?: string[] } };
    invalid.senderAddress.memberPath = ['Teacher'];
    const client = clientReturning([
      message({
        messageId: 'otherwise-valid-message',
        senderAddress: address('/Teacher'),
        receiverAddress: address('/StudentStudyGroup/student_one'),
      }),
      invalid,
    ]);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await fetchAndHydrateTeamCommunicationForTeam({
      client,
      teamRunId: 'root-team-run-1',
    });

    expect(useTeamCommunicationStore().getMessagesForTeam('root-team-run-1')).toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      "[runHistoryStore] Failed to fetch team communication messages for team 'root-team-run-1'",
      expect.objectContaining({
        message: 'Team communication message[1].senderAddress has unsupported or missing GraphQL fields.',
      }),
    );
    warning.mockRestore();
  });
});
