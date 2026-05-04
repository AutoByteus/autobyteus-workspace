import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetMessageFileReferences } from '~/graphql/queries/runHistoryQueries';
import {
  fetchAndHydrateMessageFileReferencesForTeam,
  hydrateMessageFileReferences,
} from '../messageFileReferenceHydrationService';

const { replaceProjectionMock } = vi.hoisted(() => ({
  replaceProjectionMock: vi.fn(),
}));

vi.mock('~/stores/messageFileReferencesStore', () => ({
  useMessageFileReferencesStore: () => ({
    replaceProjection: replaceProjectionMock,
  }),
}));

describe('messageFileReferenceHydrationService', () => {
  beforeEach(() => {
    replaceProjectionMock.mockReset();
  });

  it('hydrates the dedicated message-reference store from a team-level query', async () => {
    const client = {
      query: vi.fn(async () => ({
        data: {
          getMessageFileReferences: [
            {
              referenceId: 'ref-1',
              teamRunId: 'team-1',
              senderRunId: 'sender-run-1',
              senderMemberName: 'Sender',
              receiverRunId: 'receiver-run-1',
              receiverMemberName: 'Receiver',
              messageType: 'handoff',
              path: '/tmp/report.md',
              type: 'file',
              createdAt: '2026-05-04T00:00:00.000Z',
              updatedAt: '2026-05-04T00:00:00.000Z',
            },
          ],
        },
      })),
    };

    await fetchAndHydrateMessageFileReferencesForTeam({
      client,
      teamRunId: 'team-1',
    });

    expect(client.query).toHaveBeenCalledWith({
      query: GetMessageFileReferences,
      variables: {
        teamRunId: 'team-1',
      },
      fetchPolicy: 'network-only',
    });
    expect(replaceProjectionMock).toHaveBeenCalledWith('team-1', [
      expect.objectContaining({
        referenceId: 'ref-1',
        path: '/tmp/report.md',
      }),
    ]);
  });

  it('clears the team projection when historical reference hydration fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = {
      query: vi.fn(async () => ({
        errors: [{ message: 'backend unavailable' }],
        data: null,
      })),
    };

    try {
      await fetchAndHydrateMessageFileReferencesForTeam({
        client,
        teamRunId: 'team-1',
      });
    } finally {
      warnSpy.mockRestore();
    }

    expect(replaceProjectionMock).toHaveBeenCalledWith('team-1', []);
  });

  it('writes direct hydration snapshots to the message-reference store only', () => {
    hydrateMessageFileReferences('team-1', [
      {
        referenceId: 'ref-1',
        teamRunId: 'team-1',
        senderRunId: 'sender-run-1',
        senderMemberName: 'Sender',
        receiverRunId: 'receiver-run-1',
        receiverMemberName: 'Receiver',
        messageType: 'handoff',
        path: '/tmp/report.md',
        type: 'file',
        createdAt: '2026-05-04T00:00:00.000Z',
        updatedAt: '2026-05-04T00:00:00.000Z',
      },
    ]);

    expect(replaceProjectionMock).toHaveBeenCalledWith('team-1', [
      expect.objectContaining({
        referenceId: 'ref-1',
        path: '/tmp/report.md',
      }),
    ]);
  });
});
