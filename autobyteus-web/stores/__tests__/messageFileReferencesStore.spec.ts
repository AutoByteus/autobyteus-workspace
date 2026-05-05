import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMessageFileReferencesStore, type MessageFileReferenceArtifact } from '~/stores/messageFileReferencesStore';

const buildReference = (overrides: Partial<MessageFileReferenceArtifact> & { referenceId: string; path: string }): MessageFileReferenceArtifact => ({
  referenceId: overrides.referenceId,
  teamRunId: overrides.teamRunId ?? 'team-1',
  senderRunId: overrides.senderRunId ?? 'sender-run-1',
  senderMemberName: overrides.senderMemberName ?? 'Sender',
  receiverRunId: overrides.receiverRunId ?? 'receiver-run-1',
  receiverMemberName: overrides.receiverMemberName ?? 'Receiver',
  path: overrides.path,
  type: overrides.type ?? 'file',
  messageType: overrides.messageType ?? 'handoff',
  createdAt: overrides.createdAt ?? '2026-04-08T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-04-08T00:00:00.000Z',
});

describe('MessageFileReferencesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('stores canonical referenced artifacts by team without receiver-scoped projections', () => {
    const store = useMessageFileReferencesStore();

    store.replaceProjection('team-1', [
      buildReference({
        referenceId: 'ref-1',
        teamRunId: 'ignored-team',
        senderRunId: 'sender-run-1',
        receiverRunId: 'receiver-run-1',
        path: '\\Users\\normy\\report.md',
        type: 'not-a-real-type' as any,
      }),
    ]);
    store.replaceProjection('team-2', []);

    expect(store.getReferencesForTeam('team-1')).toEqual([
      expect.objectContaining({
        referenceId: 'ref-1',
        teamRunId: 'team-1',
        senderRunId: 'sender-run-1',
        receiverRunId: 'receiver-run-1',
        path: '/Users/normy/report.md',
        type: 'file',
      }),
    ]);
    expect(store.getReferencesForTeam('team-2')).toEqual([]);
  });

  it('upserts newer backend declarations and preserves the original createdAt for the same reference id', () => {
    const store = useMessageFileReferencesStore();

    store.upsertFromBackend(buildReference({
      referenceId: 'ref-1',
      path: '/tmp/report.md',
      updatedAt: '2026-04-08T00:00:01.000Z',
    }));

    store.upsertFromBackend(buildReference({
      referenceId: 'ref-1',
      senderMemberName: 'Older Name',
      messageType: 'older',
      path: '/tmp/stale.md',
      updatedAt: '2026-04-08T00:00:00.000Z',
    }));

    store.upsertFromBackend(buildReference({
      referenceId: 'ref-1',
      senderMemberName: 'Reviewer 2',
      messageType: 'revision',
      path: '/tmp/report-v2.md',
      createdAt: '2026-04-08T00:00:02.000Z',
      updatedAt: '2026-04-08T00:00:02.000Z',
    }));

    expect(store.getReferencesForTeam('team-1')).toEqual([
      expect.objectContaining({
        referenceId: 'ref-1',
        senderMemberName: 'Reviewer 2',
        messageType: 'revision',
        path: '/tmp/report-v2.md',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:02.000Z',
      }),
    ]);
  });

  it('derives sent and received perspective groups for the focused member', () => {
    const store = useMessageFileReferencesStore();

    store.replaceProjection('team-1', [
      buildReference({
        referenceId: 'sent-1',
        senderRunId: 'focused-run',
        senderMemberName: 'Focused',
        receiverRunId: 'reviewer-run',
        receiverMemberName: 'Reviewer',
        path: '/tmp/sent.md',
        updatedAt: '2026-04-08T00:00:02.000Z',
      }),
      buildReference({
        referenceId: 'received-1',
        senderRunId: 'worker-run',
        senderMemberName: 'Worker',
        receiverRunId: 'focused-run',
        receiverMemberName: 'Focused',
        path: '/tmp/received.md',
        updatedAt: '2026-04-08T00:00:01.000Z',
      }),
      buildReference({
        referenceId: 'unrelated-1',
        senderRunId: 'other-sender',
        receiverRunId: 'other-receiver',
        path: '/tmp/unrelated.md',
      }),
    ]);

    const perspective = store.getPerspectiveForMember('team-1', 'focused-run');

    expect(perspective.sentGroups).toEqual([
      expect.objectContaining({
        counterpartRunId: 'reviewer-run',
        counterpartMemberName: 'Reviewer',
        items: [expect.objectContaining({ direction: 'sent', referenceId: 'sent-1' })],
      }),
    ]);
    expect(perspective.receivedGroups).toEqual([
      expect.objectContaining({
        counterpartRunId: 'worker-run',
        counterpartMemberName: 'Worker',
        items: [expect.objectContaining({ direction: 'received', referenceId: 'received-1' })],
      }),
    ]);
  });

  it('clears team projections explicitly', () => {
    const store = useMessageFileReferencesStore();

    store.upsertFromBackend(buildReference({ referenceId: 'ref-1', teamRunId: 'team-1', path: '/tmp/a.md' }));
    store.upsertFromBackend(buildReference({ referenceId: 'ref-2', teamRunId: 'team-2', path: '/tmp/b.md' }));

    store.clearTeam('team-1');
    expect(store.getReferencesForTeam('team-1')).toEqual([]);
    expect(store.getReferencesForTeam('team-2')).toHaveLength(1);
  });
});
