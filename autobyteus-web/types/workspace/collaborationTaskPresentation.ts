import type { TeamReferenceFile } from '~/types/teamReferenceFile';

export type DelegatedTaskEntryKind = 'task_agent' | 'task_team';
export type DelegatedTaskDisplayStatus = 'in_progress' | 'awaiting_review' | 'revision_requested' | 'accepted' | 'interrupted';

export interface CollaborationTaskHeadingPresentation {
  readonly taskId: string;
  readonly description: string;
  readonly displayStatus: DelegatedTaskDisplayStatus;
}

export type DelegatedTaskParticipant =
  | (Readonly<{ kind: 'named'; label: string }> & (
    | Readonly<{ targetKind: 'agent'; link: CollaborationTaskParticipantLink }>
    | Readonly<{ targetKind: 'task_team'; teamRunId: string; participants: readonly CollaborationTaskParticipantLink[] }>
    | Readonly<{ targetKind: 'unavailable' }>
  ))
  | Readonly<{ kind: 'delegator_fallback' }>
  | Readonly<{ kind: 'assignee_fallback' }>;

export type DelegatedTaskDirection =
  | Readonly<{
    kind: 'directed';
    from: DelegatedTaskParticipant;
    to: DelegatedTaskParticipant;
  }>
  | Readonly<{ kind: 'system'; assignment: Readonly<{ from: DelegatedTaskParticipant; to: DelegatedTaskParticipant }> }>;

interface DelegatedTaskLifecycleItemBase<TContent extends string | null = string> {
  readonly itemKey: string;
  readonly createdAt: string;
  readonly content: TContent;
  readonly direction: DelegatedTaskDirection;
  readonly referenceFiles: readonly TeamReferenceFile[];
}

export type DelegatedTaskLifecycleItem =
  | (DelegatedTaskLifecycleItemBase & Readonly<{ kind: 'assignment' }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
    kind: 'submission';
    resultOrdinal: number;
    revised: boolean;
  }>)
  | (DelegatedTaskLifecycleItemBase<string | null> & Readonly<{
    kind: 'review';
    decision: 'accept';
    reviewedResultOrdinal: number;
  }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
    kind: 'review';
    decision: 'request_revision';
    reviewedResultOrdinal: number;
  }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
    kind: 'interruption';
    referenceFiles: readonly [];
  }>);

export type CollaborationTaskParticipantLink = Readonly<{
  agentRunId: string;
  address: string;
  label: string;
}>;

export interface DelegatedTaskEntry {
  readonly kind: DelegatedTaskEntryKind;
  readonly entryKey: string;
  readonly root: Readonly<{ kind: 'agent_team' | 'agent_org'; runId: string }>;
  readonly taskId: string;
  readonly runId: string;
  readonly displayStatus: DelegatedTaskDisplayStatus;
  readonly lastActivityAt: string;
  readonly lifecycleItems: readonly [DelegatedTaskLifecycleItem, ...DelegatedTaskLifecycleItem[]];
}

export type DelegatedTaskItemLocator = Readonly<{
  entryKey: string;
  itemKey: string;
}>;

export type DelegatedTaskReferenceLocator = Readonly<{
  entryKey: string;
  itemKey: string;
  referenceId: string;
}>;
