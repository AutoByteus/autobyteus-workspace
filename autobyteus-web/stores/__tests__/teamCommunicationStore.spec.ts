import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTeamCommunicationStore } from '../teamCommunicationStore';

describe('teamCommunicationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('hydrates and groups focused-member sent and received messages by counterpart', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-1', [
      {
        messageId: 'message-sent',
        teamRunId: 'team-1',
        senderRunId: 'focused-run',
        senderMemberName: 'Focused',
        receiverRunId: 'reviewer-run',
        receiverMemberName: 'Reviewer',
        content: 'Please review the implementation.',
        messageType: 'handoff',
        createdAt: '2026-04-08T00:00:01.000Z',
        updatedAt: '2026-04-08T00:00:01.000Z',
        referenceFiles: [{ referenceId: 'ref-1', path: '/tmp/implementation.md', type: 'file', createdAt: '2026-04-08T00:00:01.000Z', updatedAt: '2026-04-08T00:00:01.000Z' }],
      },
      {
        messageId: 'message-received',
        teamRunId: 'team-1',
        senderRunId: 'designer-run',
        senderMemberName: 'Designer',
        receiverRunId: 'focused-run',
        receiverMemberName: 'Focused',
        content: 'Please implement the reviewed design.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:02.000Z',
        updatedAt: '2026-04-08T00:00:02.000Z',
        referenceFiles: [],
      },
    ]);

    const perspective = store.getPerspectiveForMember('team-1', 'focused-run');

    expect(perspective.sentGroups).toEqual([
      expect.objectContaining({
        counterpartRunId: 'reviewer-run',
        counterpartMemberName: 'Reviewer',
        messages: [expect.objectContaining({ messageId: 'message-sent', direction: 'sent' })],
      }),
    ]);
    expect(perspective.receivedGroups).toEqual([
      expect.objectContaining({
        counterpartRunId: 'designer-run',
        counterpartMemberName: 'Designer',
        messages: [expect.objectContaining({ messageId: 'message-received', direction: 'received' })],
      }),
    ]);
    expect(perspective.messages.map((message) => message.messageId)).toEqual(['message-received', 'message-sent']);
  });

  it('matches a focused subteam perspective by route and path without a member run id', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-build-squad',
        teamRunId: 'team-1',
        senderRunId: 'pm-run',
        senderMemberKind: 'agent',
        senderMemberName: 'program_manager',
        senderMemberPath: ['program_manager'],
        senderMemberRouteKey: 'program_manager',
        receiverRunId: 'internal-child-team-run',
        receiverMemberKind: 'agent_team',
        receiverMemberName: 'BuildSquad',
        receiverMemberPath: ['BuildSquad'],
        receiverMemberRouteKey: 'BuildSquad',
        content: 'Please coordinate this build.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:03.000Z',
        updatedAt: '2026-04-08T00:00:03.000Z',
        referenceFiles: [],
      },
    ]);

    const perspective = store.getPerspectiveForMember('team-1', {
      memberKind: 'agent_team',
      memberRouteKey: 'BuildSquad',
      memberPath: ['BuildSquad'],
    });

    expect(perspective.receivedGroups).toEqual([
      expect.objectContaining({
        counterpartMemberRouteKey: 'program_manager',
        messages: [expect.objectContaining({ messageId: 'message-to-build-squad', direction: 'received' })],
      }),
    ]);
    expect(perspective.messages.map((message) => message.messageId)).toEqual(['message-to-build-squad']);
  });

  it('matches a nested leaf by route/path when the runtime run id is stale', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-review-lead',
        teamRunId: 'team-1',
        senderRunId: 'pm-run',
        senderMemberKind: 'agent',
        senderMemberName: 'program_manager',
        senderMemberPath: ['program_manager'],
        senderMemberRouteKey: 'program_manager',
        receiverRunId: 'new-review-run',
        receiverMemberKind: 'agent',
        receiverMemberName: 'review_lead',
        receiverMemberPath: ['BuildSquad', 'review_lead'],
        receiverMemberRouteKey: 'BuildSquad/review_lead',
        content: 'Please review this implementation.',
        messageType: 'handoff',
        createdAt: '2026-04-08T00:00:04.000Z',
        updatedAt: '2026-04-08T00:00:04.000Z',
        referenceFiles: [],
      },
    ]);

    const perspective = store.getPerspectiveForMember('team-1', {
      memberRunId: 'stale-review-run',
      memberKind: 'agent',
      memberRouteKey: 'BuildSquad/review_lead',
      memberPath: ['BuildSquad', 'review_lead'],
    });

    expect(perspective.messages).toEqual([
      expect.objectContaining({
        messageId: 'message-to-review-lead',
        direction: 'received',
        counterpartMemberRouteKey: 'program_manager',
      }),
    ]);
  });

  it('matches represented-subteam communication when the visible participant is the child representative leaf', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-review-lead-representing-build-squad',
        teamRunId: 'team-1',
        senderRunId: 'pm-run',
        senderMemberKind: 'agent',
        senderMemberName: 'program_manager',
        senderMemberPath: ['program_manager'],
        senderMemberRouteKey: 'program_manager',
        receiverRunId: 'review-run',
        receiverMemberKind: 'agent',
        receiverMemberName: 'review_lead',
        receiverMemberPath: ['BuildSquad', 'review_lead'],
        receiverMemberRouteKey: 'BuildSquad/review_lead',
        receiverRepresentedSubTeam: {
          memberKind: 'agent_team',
          memberName: 'BuildSquad',
          memberPath: ['BuildSquad'],
          memberRouteKey: 'BuildSquad',
          memberRunId: 'build-squad-run',
          teamDefinitionId: 'build-squad-team',
          address: {
            teamRunId: 'team-1',
            memberPath: ['BuildSquad'],
            memberRouteKey: 'BuildSquad',
          },
        },
        content: 'Please coordinate the child team.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:05.000Z',
        updatedAt: '2026-04-08T00:00:05.000Z',
        referenceFiles: [],
      },
    ]);

    const subteamPerspective = store.getPerspectiveForMember('team-1', {
      memberKind: 'agent_team',
      memberRouteKey: 'BuildSquad',
      memberPath: ['BuildSquad'],
    });
    expect(subteamPerspective.messages).toEqual([
      expect.objectContaining({
        messageId: 'message-to-review-lead-representing-build-squad',
        direction: 'received',
        counterpartMemberRouteKey: 'program_manager',
      }),
    ]);

    const senderPerspective = store.getPerspectiveForMember('team-1', {
      memberKind: 'agent',
      memberRouteKey: 'program_manager',
      memberPath: ['program_manager'],
    });
    expect(senderPerspective.sentGroups).toEqual([
      expect.objectContaining({
        counterpartMemberRouteKey: 'BuildSquad/review_lead',
        counterpartRepresentedSubTeam: expect.objectContaining({
          memberRouteKey: 'BuildSquad',
        }),
      }),
    ]);
  });

  it('normalizes represented-subteam metadata from live websocket payloads', () => {
    const store = useTeamCommunicationStore();

    store.upsertFromBackendPayload({
      messageId: 'live-message-1',
      teamRunId: 'team-1',
      senderRunId: 'pm-run',
      senderMemberKind: 'agent',
      senderMemberName: 'program_manager',
      senderMemberPath: ['program_manager'],
      senderMemberRouteKey: 'program_manager',
      receiverRunId: 'review-run',
      receiverMemberKind: 'agent',
      receiverMemberName: 'review_lead',
      receiverMemberPath: ['BuildSquad', 'review_lead'],
      receiverMemberRouteKey: 'BuildSquad/review_lead',
      receiverRepresentedSubTeam: {
        memberKind: 'agent_team',
        memberName: 'BuildSquad',
        memberPath: ['BuildSquad'],
        memberRouteKey: 'BuildSquad',
        memberRunId: 'build-squad-run',
        teamDefinitionId: 'build-squad-team',
        address: {
          teamRunId: 'team-1',
          memberPath: ['BuildSquad'],
          memberRouteKey: 'BuildSquad',
        },
      },
      content: 'Live represented message.',
      messageType: 'assignment',
      createdAt: '2026-04-08T00:00:06.000Z',
      updatedAt: '2026-04-08T00:00:06.000Z',
      referenceFiles: [],
    });

    expect(store.getMessagesForTeam('team-1')).toEqual([
      expect.objectContaining({
        messageId: 'live-message-1',
        receiverRepresentedSubTeam: expect.objectContaining({
          memberRouteKey: 'BuildSquad',
        }),
      }),
    ]);
  });

  it('shows child-internal communication under the parent team run by nested route/path', () => {
    const store = useTeamCommunicationStore();

    store.upsertFromBackendPayload({
      messageId: 'child-internal-message',
      teamRunId: 'team-parent',
      senderRunId: 'review-run',
      senderMemberKind: 'agent',
      senderMemberName: 'review_lead',
      senderMemberPath: ['BuildSquad', 'review_lead'],
      senderMemberRouteKey: 'BuildSquad/review_lead',
      receiverRunId: 'qa-run',
      receiverMemberKind: 'agent',
      receiverMemberName: 'qa_specialist',
      receiverMemberPath: ['BuildSquad', 'qa_specialist'],
      receiverMemberRouteKey: 'BuildSquad/qa_specialist',
      content: 'Please test this.',
      messageType: 'child_internal',
      createdAt: '2026-04-08T00:00:07.000Z',
      updatedAt: '2026-04-08T00:00:07.000Z',
      referenceFiles: [],
    });

    expect(store.getMessagesForTeam('team-parent')).toEqual([
      expect.objectContaining({
        messageId: 'child-internal-message',
        teamRunId: 'team-parent',
      }),
    ]);
    const qaPerspective = store.getPerspectiveForMember('team-parent', {
      memberKind: 'agent',
      memberRouteKey: 'BuildSquad/qa_specialist',
      memberPath: ['BuildSquad', 'qa_specialist'],
    });
    expect(qaPerspective.messages).toEqual([
      expect.objectContaining({
        messageId: 'child-internal-message',
        direction: 'received',
        counterpartMemberRouteKey: 'BuildSquad/review_lead',
      }),
    ]);
  });

  it('upserts live derived team communication payloads with reference files', () => {
    const store = useTeamCommunicationStore();

    store.upsertFromBackendPayload({
      messageId: 'message-1',
      teamRunId: 'team-1',
      senderRunId: 'sender-run',
      senderMemberName: 'Sender',
      receiverRunId: 'receiver-run',
      receiverMemberName: 'Receiver',
      content: 'Please inspect the attachment.',
      messageType: 'handoff',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
      referenceFiles: [
        {
          referenceId: 'ref-1',
          path: '/tmp/report.md',
          type: 'file',
          createdAt: '2026-04-08T00:00:00.000Z',
          updatedAt: '2026-04-08T00:00:00.000Z',
        },
      ],
    });

    expect(store.getMessagesForTeam('team-1')).toEqual([
      expect.objectContaining({
        messageId: 'message-1',
        referenceFiles: [expect.objectContaining({ referenceId: 'ref-1', path: '/tmp/report.md' })],
      }),
    ]);
  });
});
