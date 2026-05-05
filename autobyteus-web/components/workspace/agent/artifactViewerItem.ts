import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import type { MessageFileReferencePerspectiveItem } from '~/stores/messageFileReferencesStore';

export type ArtifactViewerItem = AgentArtifactViewerItem | MessageReferenceArtifactViewerItem;

export interface AgentArtifactViewerItem extends RunFileChangeArtifact {
  kind: 'agent';
  itemId: string;
  artifact: RunFileChangeArtifact;
}

export interface MessageReferenceArtifactViewerItem {
  kind: 'message_reference';
  itemId: string;
  id: string;
  referenceId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberName?: string | null;
  receiverRunId: string;
  receiverMemberName?: string | null;
  counterpartRunId: string;
  counterpartMemberName?: string | null;
  direction: 'sent' | 'received';
  path: string;
  type: MessageFileReferencePerspectiveItem['type'];
  status: 'available';
  createdAt: string;
  updatedAt: string;
  reference: MessageFileReferencePerspectiveItem['reference'];
}

export const toAgentArtifactViewerItem = (
  artifact: RunFileChangeArtifact,
): AgentArtifactViewerItem => ({
  ...artifact,
  kind: 'agent',
  itemId: `agent:${artifact.id}`,
  artifact,
});

export const toMessageReferenceArtifactViewerItem = (
  reference: MessageFileReferencePerspectiveItem,
): MessageReferenceArtifactViewerItem => ({
  kind: 'message_reference',
  itemId: `message_reference:${reference.direction}:${reference.referenceId}`,
  id: reference.referenceId,
  referenceId: reference.referenceId,
  teamRunId: reference.teamRunId,
  senderRunId: reference.senderRunId,
  senderMemberName: reference.senderMemberName ?? null,
  receiverRunId: reference.receiverRunId,
  receiverMemberName: reference.receiverMemberName ?? null,
  counterpartRunId: reference.counterpartRunId,
  counterpartMemberName: reference.counterpartMemberName ?? null,
  direction: reference.direction,
  path: reference.path,
  type: reference.type,
  status: 'available',
  createdAt: reference.createdAt,
  updatedAt: reference.updatedAt,
  reference: reference.reference,
});
