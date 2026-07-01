import { defineStore } from 'pinia';
import type { TeamCommunicationMessagePayload } from '~/services/agentStreaming/protocol/messageTypes';
import type {
  ConversationTargetAddress,
  ConversationTargetSegment,
} from '~/types/agent/ConversationTargetAddress';
import {
  buildConversationTargetKey,
  cloneConversationTargetSegments,
  normalizeConversationRouteKey,
  routeKeyFromConversationPath,
} from '~/utils/teamConversationTargetSegments';
import type {
  TeamCommunicationDirection,
  TeamCommunicationMessage,
  TeamCommunicationPerspective,
  TeamCommunicationPerspectiveGroup,
  TeamCommunicationPerspectiveMessage,
  TeamCommunicationReferenceFile,
  TeamCommunicationReferenceFileType,
} from './teamCommunicationTypes';

interface TeamCommunicationState {
  messagesByTeam: Map<string, TeamCommunicationMessage[]>;
}

type RawTeamCommunicationMessage = TeamCommunicationMessage & Record<string, unknown>;

const normalizePath = (value: string): string => value.replace(/\\/g, '/').trim();

const normalizeType = (value?: string | null): TeamCommunicationReferenceFileType | null => {
  switch (value) {
    case 'image':
    case 'audio':
    case 'video':
    case 'pdf':
    case 'csv':
    case 'excel':
    case 'other':
      return value;
    default:
      return null;
  }
};

const inferType = (filePath: string): TeamCommunicationReferenceFileType => {
  const lower = filePath.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) return 'audio';
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return 'video';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.csv')) return 'csv';
  if (/\.(xlsx|xls)$/.test(lower)) return 'excel';
  return 'file';
};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readStringPath = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const path = value.map((entry) => readString(entry)).filter((entry): entry is string => Boolean(entry));
  return path.length > 0 ? path : null;
};

const timestampOrNow = (value: unknown): string => readString(value) ?? new Date().toISOString();

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
);

const normalizeMemberSegment = (record: Record<string, unknown>): ConversationTargetSegment | null => {
  const memberRouteKey = normalizeConversationRouteKey(readString(record.memberRouteKey) ?? readString(record.member_route_key));
  const memberPath = readStringPath(record.memberPath ?? record.member_path);
  const pathRouteKey = routeKeyFromConversationPath(memberPath);
  if (memberRouteKey && pathRouteKey && memberRouteKey !== pathRouteKey) return null;
  if (memberRouteKey) return { kind: 'member', memberRouteKey };
  if (memberPath) return { kind: 'member', memberPath };
  return null;
};

const normalizeSegment = (value: unknown): ConversationTargetSegment | null => {
  const record = asRecord(value);
  if (!record) return null;
  const kind = readString(record.kind);
  if (kind === 'member') return normalizeMemberSegment(record);
  if (kind === 'task_team') {
    const taskTeamRunId = normalizeConversationRouteKey(readString(record.taskTeamRunId) ?? readString(record.task_team_run_id));
    return taskTeamRunId ? { kind: 'task_team', taskTeamRunId } : null;
  }
  if (kind === 'task_agent') {
    const taskAgentRunId = normalizeConversationRouteKey(readString(record.taskAgentRunId) ?? readString(record.task_agent_run_id));
    return taskAgentRunId ? { kind: 'task_agent', taskAgentRunId } : null;
  }
  return null;
};

const normalizeAddress = (value: unknown): ConversationTargetAddress | null => {
  const record = asRecord(value);
  const rawSegments = record?.segments;
  if (!Array.isArray(rawSegments)) return null;
  const segments = rawSegments.map(normalizeSegment);
  if (segments.length === 0 || segments.some((segment) => !segment)) return null;
  return { segments: cloneConversationTargetSegments(segments as ConversationTargetSegment[]) };
};

const normalizeReferenceEntry = (
  rawReference: unknown,
  fallback: { index: number; timestamp: string },
): TeamCommunicationReferenceFile | null => {
  if (typeof rawReference === 'string') {
    const normalizedPath = normalizePath(rawReference);
    if (!normalizedPath) return null;
    return {
      referenceId: `reference:${fallback.index}:${normalizedPath}`,
      path: normalizedPath,
      type: inferType(normalizedPath),
      createdAt: fallback.timestamp,
      updatedAt: fallback.timestamp,
    };
  }
  const record = asRecord(rawReference);
  if (!record) return null;
  const normalizedPath = normalizePath(String(record.path || ''));
  if (!normalizedPath) return null;
  return {
    referenceId: readString(record.referenceId) || `reference:${fallback.index}:${normalizedPath}`,
    path: normalizedPath,
    type: normalizeType(record.type as string | null | undefined) ?? inferType(normalizedPath),
    createdAt: timestampOrNow(record.createdAt || fallback.timestamp),
    updatedAt: timestampOrNow(record.updatedAt || record.createdAt || fallback.timestamp),
  };
};

const normalizeReferenceFiles = (
  rawReferences: unknown,
  timestamp: string,
): TeamCommunicationReferenceFile[] => {
  const input = Array.isArray(rawReferences) ? rawReferences : [];
  const byPath = new Map<string, TeamCommunicationReferenceFile>();
  input.forEach((rawReference, index) => {
    const reference = normalizeReferenceEntry(rawReference, { index, timestamp });
    if (!reference) return;
    const existing = byPath.get(reference.path);
    if (!existing || reference.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      byPath.set(reference.path, reference);
    }
  });
  return Array.from(byPath.values());
};

const normalizeMessage = (
  message: RawTeamCommunicationMessage,
): TeamCommunicationMessage | null => {
  const senderAddress = normalizeAddress(message.senderAddress ?? message.sender_address);
  const receiverAddress = normalizeAddress(message.receiverAddress ?? message.receiver_address);
  if (!senderAddress || !receiverAddress || typeof message.content !== 'string') return null;
  const createdAt = timestampOrNow(message.createdAt ?? message.created_at);
  const messageId = readString(message.messageId ?? message.message_id);
  if (!messageId) return null;
  return {
    messageId,
    senderAddress,
    receiverAddress,
    content: message.content,
    messageType: readString(message.messageType ?? message.message_type) || 'agent_message',
    createdAt,
    referenceFiles: normalizeReferenceFiles(message.referenceFiles ?? message.reference_files, createdAt),
  };
};

const normalizeMessageFromPayload = (
  payload: TeamCommunicationMessagePayload,
): { teamRunId: string; message: TeamCommunicationMessage } | null => {
  const teamRunId = readString(payload.teamRunId ?? (payload as any).team_run_id);
  if (!teamRunId) return null;
  const message = normalizeMessage(payload as unknown as RawTeamCommunicationMessage);
  return message ? { teamRunId, message } : null;
};

const ensureTeamMessages = (
  state: TeamCommunicationState,
  teamRunId: string,
): TeamCommunicationMessage[] => {
  if (!state.messagesByTeam.has(teamRunId)) {
    state.messagesByTeam.set(teamRunId, []);
  }
  return state.messagesByTeam.get(teamRunId)!;
};

const applyMessageSnapshot = (
  target: TeamCommunicationMessage,
  source: TeamCommunicationMessage,
): void => {
  target.senderAddress = { segments: cloneConversationTargetSegments(source.senderAddress.segments) };
  target.receiverAddress = { segments: cloneConversationTargetSegments(source.receiverAddress.segments) };
  target.content = source.content;
  target.messageType = source.messageType;
  target.createdAt = target.createdAt || source.createdAt;
  target.referenceFiles = source.referenceFiles.map((reference) => ({ ...reference }));
};

const compareMessagesDesc = (
  left: { createdAt: string; messageId: string },
  right: { createdAt: string; messageId: string },
): number => {
  const byCreatedAt = right.createdAt.localeCompare(left.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;
  return left.messageId.localeCompare(right.messageId);
};

export const formatTeamCommunicationAddressLabel = (address: ConversationTargetAddress): string => (
  address.segments.map((segment) => {
    if (segment.kind === 'member') {
      return normalizeConversationRouteKey(segment.memberRouteKey) || routeKeyFromConversationPath(segment.memberPath) || 'member';
    }
    if (segment.kind === 'task_team') return `task team ${segment.taskTeamRunId}`;
    return `task agent ${segment.taskAgentRunId}`;
  }).join(' › ')
);

const buildPerspectiveMessage = (
  message: TeamCommunicationMessage,
  direction: TeamCommunicationDirection,
): TeamCommunicationPerspectiveMessage => {
  const counterpartAddress = direction === 'sent' ? message.receiverAddress : message.senderAddress;
  const counterpartKey = buildConversationTargetKey(counterpartAddress);
  return {
    ...message,
    direction,
    counterpartAddress: { segments: cloneConversationTargetSegments(counterpartAddress.segments) },
    counterpartKey,
    counterpartLabel: formatTeamCommunicationAddressLabel(counterpartAddress),
    message,
  };
};

const groupPerspectiveMessages = (
  messages: TeamCommunicationPerspectiveMessage[],
): TeamCommunicationPerspectiveGroup[] => {
  const groupsByCounterpart = new Map<string, TeamCommunicationPerspectiveGroup>();
  messages.forEach((message) => {
    if (!groupsByCounterpart.has(message.counterpartKey)) {
      groupsByCounterpart.set(message.counterpartKey, {
        counterpartAddress: message.counterpartAddress,
        counterpartKey: message.counterpartKey,
        counterpartLabel: message.counterpartLabel,
        messages: [],
      });
    }
    groupsByCounterpart.get(message.counterpartKey)!.messages.push(message);
  });

  return Array.from(groupsByCounterpart.values())
    .map((group) => ({ ...group, messages: group.messages.sort(compareMessagesDesc) }))
    .sort((left, right) => {
      const byCreatedAt = (right.messages[0]?.createdAt || '').localeCompare(left.messages[0]?.createdAt || '');
      return byCreatedAt !== 0 ? byCreatedAt : left.counterpartKey.localeCompare(right.counterpartKey);
    });
};

export const useTeamCommunicationStore = defineStore('teamCommunication', {
  state: (): TeamCommunicationState => ({
    messagesByTeam: new Map(),
  }),

  getters: {
    getMessagesForTeam: (state) => (teamRunId: string): TeamCommunicationMessage[] =>
      [...(state.messagesByTeam.get(teamRunId) || [])].sort(compareMessagesDesc),

    getPerspectiveForAddress: (state) => (
      teamRunId: string,
      address: ConversationTargetAddress | null | undefined,
    ): TeamCommunicationPerspective => {
      const normalizedAddress = normalizeAddress(address);
      if (!teamRunId || !normalizedAddress) {
        return { sentGroups: [], receivedGroups: [], messages: [] };
      }

      const addressKey = buildConversationTargetKey(normalizedAddress);
      const teamMessages = state.messagesByTeam.get(teamRunId) || [];
      const sent = teamMessages
        .filter((message) => buildConversationTargetKey(message.senderAddress) === addressKey)
        .map((message) => buildPerspectiveMessage(message, 'sent'));
      const received = teamMessages
        .filter((message) => buildConversationTargetKey(message.receiverAddress) === addressKey)
        .map((message) => buildPerspectiveMessage(message, 'received'));
      const sentGroups = groupPerspectiveMessages(sent);
      const receivedGroups = groupPerspectiveMessages(received);

      return {
        sentGroups,
        receivedGroups,
        messages: [
          ...sentGroups.flatMap((group) => group.messages),
          ...receivedGroups.flatMap((group) => group.messages),
        ].sort(compareMessagesDesc),
      };
    },
  },

  actions: {
    replaceProjection(teamRunId: string, messages: TeamCommunicationMessage[]) {
      this.messagesByTeam.set(
        teamRunId,
        messages
          .map((message) => normalizeMessage(message as RawTeamCommunicationMessage))
          .filter((message): message is TeamCommunicationMessage => Boolean(message)),
      );
    },

    upsertMessage(teamRunId: string, message: TeamCommunicationMessage) {
      const normalized = normalizeMessage(message as RawTeamCommunicationMessage);
      if (!normalized) return null;
      const messages = ensureTeamMessages(this, teamRunId);
      const existing = messages.find((entry) => entry.messageId === normalized.messageId) || null;
      if (!existing) {
        messages.push(normalized);
        return normalized;
      }
      if (normalized.createdAt.localeCompare(existing.createdAt) >= 0) {
        applyMessageSnapshot(existing, normalized);
      }
      return existing;
    },

    upsertFromBackendPayload(payload: TeamCommunicationMessagePayload) {
      const normalized = normalizeMessageFromPayload(payload);
      if (!normalized) return null;
      return this.upsertMessage(normalized.teamRunId, normalized.message);
    },

    clearTeam(teamRunId: string) {
      this.messagesByTeam.delete(teamRunId);
    },
  },
});
