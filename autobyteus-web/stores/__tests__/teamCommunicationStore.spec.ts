import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTeamCommunicationStore } from '../teamCommunicationStore';
import type { ConversationTargetAddress } from '~/types/agent/ConversationTargetAddress';

const member = (memberRouteKey: string): ConversationTargetAddress => ({
  segments: [{ kind: 'member', memberRouteKey }],
});

const taskAgent = (memberRouteKey: string, taskAgentRunId: string): ConversationTargetAddress => ({
  segments: [
    { kind: 'member', memberRouteKey },
    { kind: 'task_agent', taskAgentRunId },
  ],
});

const taskTeamRoot = (logicalTeamRouteKey: string, taskTeamRunId: string): ConversationTargetAddress => ({
  segments: [
    { kind: 'member', memberRouteKey: logicalTeamRouteKey },
    { kind: 'task_team', taskTeamRunId },
  ],
});

const taskTeamChild = (
  logicalTeamRouteKey: string,
  taskTeamRunId: string,
  childRouteKey: string,
): ConversationTargetAddress => ({
  segments: [
    { kind: 'member', memberRouteKey: logicalTeamRouteKey },
    { kind: 'task_team', taskTeamRunId },
    { kind: 'member', memberRouteKey: childRouteKey },
  ],
});

const taskTeamChildTaskAgent = (
  logicalTeamRouteKey: string,
  taskTeamRunId: string,
  childRouteKey: string,
  taskAgentRunId: string,
): ConversationTargetAddress => ({
  segments: [
    { kind: 'member', memberRouteKey: logicalTeamRouteKey },
    { kind: 'task_team', taskTeamRunId },
    { kind: 'member', memberRouteKey: childRouteKey },
    { kind: 'task_agent', taskAgentRunId },
  ],
});

describe('teamCommunicationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('hydrates and groups focused-member sent and received messages by counterpart address', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-1', [
      {
        messageId: 'message-sent',
        senderAddress: member('focused'),
        receiverAddress: member('reviewer'),
        content: 'Please review the implementation.',
        messageType: 'handoff',
        createdAt: '2026-04-08T00:00:01.000Z',
        referenceFiles: [{ referenceId: 'ref-1', path: '/tmp/implementation.md', type: 'file', createdAt: '2026-04-08T00:00:01.000Z', updatedAt: '2026-04-08T00:00:01.000Z' }],
      },
      {
        messageId: 'message-received',
        senderAddress: member('designer'),
        receiverAddress: member('focused'),
        content: 'Please implement the reviewed design.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:02.000Z',
        referenceFiles: [],
      },
    ]);

    const perspective = store.getPerspectiveForAddress('team-1', member('focused'));

    expect(perspective.sentGroups).toEqual([
      expect.objectContaining({
        counterpartKey: 'member:reviewer',
        counterpartLabel: 'reviewer',
        messages: [expect.objectContaining({ messageId: 'message-sent', direction: 'sent' })],
      }),
    ]);
    expect(perspective.receivedGroups).toEqual([
      expect.objectContaining({
        counterpartKey: 'member:designer',
        counterpartLabel: 'designer',
        messages: [expect.objectContaining({ messageId: 'message-received', direction: 'received' })],
      }),
    ]);
    expect(perspective.messages.map((message) => message.messageId)).toEqual(['message-received', 'message-sent']);
  });

  it('matches static nested members by exact normalized address', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-review-lead',
        senderAddress: member('program_manager'),
        receiverAddress: member('BuildSquad/review_lead'),
        content: 'Please review this implementation.',
        messageType: 'handoff',
        createdAt: '2026-04-08T00:00:04.000Z',
        referenceFiles: [],
      },
    ]);

    const perspective = store.getPerspectiveForAddress('team-1', member('BuildSquad/review_lead'));

    expect(perspective.messages).toEqual([
      expect.objectContaining({
        messageId: 'message-to-review-lead',
        direction: 'received',
        counterpartKey: 'member:program_manager',
      }),
    ]);
  });

  it('matches task-agent messages by member plus task_agent segment', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-task-agent',
        senderAddress: member('program_manager'),
        receiverAddress: taskAgent('implementation_engineer', 'task-agent-run-1'),
        content: 'Please handle delegated work.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:05.000Z',
        referenceFiles: [],
      },
    ]);

    expect(store.getPerspectiveForAddress('team-1', taskAgent('implementation_engineer', 'task-agent-run-1')).messages)
      .toEqual([expect.objectContaining({ messageId: 'message-to-task-agent', direction: 'received' })]);
    expect(store.getPerspectiveForAddress('team-1', member('implementation_engineer')).messages).toEqual([]);
  });

  it('matches task-team root messages by member plus task_team segment', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-parent', [
      {
        messageId: 'message-to-task-team-root',
        senderAddress: member('program_manager'),
        receiverAddress: taskTeamRoot('BuildSquad', 'task-team-run-1'),
        content: 'Please coordinate the delegated team.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:05.500Z',
        referenceFiles: [],
      },
    ]);

    expect(store.getPerspectiveForAddress('team-parent', taskTeamRoot('BuildSquad', 'task-team-run-1')).messages)
      .toEqual([expect.objectContaining({ messageId: 'message-to-task-team-root', direction: 'received' })]);
    expect(store.getPerspectiveForAddress('team-parent', member('BuildSquad')).messages).toEqual([]);
  });

  it('isolates concurrent task-team child runs by exact task_team segment', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-parent', [
      {
        messageId: 'run-1-message',
        senderAddress: member('program_manager'),
        receiverAddress: taskTeamChild('BuildSquad', 'task-team-run-1', 'review_lead'),
        content: 'Run 1 only.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:06.000Z',
        referenceFiles: [],
      },
      {
        messageId: 'run-2-message',
        senderAddress: member('program_manager'),
        receiverAddress: taskTeamChild('BuildSquad', 'task-team-run-2', 'review_lead'),
        content: 'Run 2 only.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:07.000Z',
        referenceFiles: [],
      },
    ]);

    const perspective = store.getPerspectiveForAddress(
      'team-parent',
      taskTeamChild('BuildSquad', 'task-team-run-1', 'review_lead'),
    );

    expect(perspective.messages.map((message) => message.messageId)).toEqual(['run-1-message']);
  });

  it('matches task-agent messages inside task-team children by the full address', () => {
    const store = useTeamCommunicationStore();

    store.replaceProjection('team-parent', [
      {
        messageId: 'message-to-nested-task-agent',
        senderAddress: member('program_manager'),
        receiverAddress: taskTeamChildTaskAgent('BuildSquad', 'task-team-run-1', 'implementer', 'task-agent-run-9'),
        content: 'Please handle the delegated subtask inside the task team.',
        messageType: 'assignment',
        createdAt: '2026-04-08T00:00:08.000Z',
        referenceFiles: [],
      },
    ]);

    expect(store.getPerspectiveForAddress(
      'team-parent',
      taskTeamChildTaskAgent('BuildSquad', 'task-team-run-1', 'implementer', 'task-agent-run-9'),
    ).messages).toEqual([
      expect.objectContaining({ messageId: 'message-to-nested-task-agent', direction: 'received' }),
    ]);
    expect(store.getPerspectiveForAddress('team-parent', taskTeamChild('BuildSquad', 'task-team-run-1', 'implementer')).messages)
      .toEqual([]);
  });

  it('upserts live address-first payloads with reference files', () => {
    const store = useTeamCommunicationStore();

    store.upsertFromBackendPayload({
      messageId: 'message-1',
      teamRunId: 'team-1',
      senderAddress: member('sender'),
      receiverAddress: member('receiver'),
      content: 'Please inspect the attachment.',
      messageType: 'handoff',
      createdAt: '2026-04-08T00:00:00.000Z',
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
        senderAddress: member('sender'),
        receiverAddress: member('receiver'),
        referenceFiles: [expect.objectContaining({ referenceId: 'ref-1', path: '/tmp/report.md' })],
      }),
    ]);
  });
});
