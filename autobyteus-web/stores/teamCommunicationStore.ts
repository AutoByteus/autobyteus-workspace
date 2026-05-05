import { defineStore } from 'pinia';
import type { InterAgentMessagePayload } from '~/services/agentStreaming/protocol/messageTypes';

export type TeamCommunicationReferenceFileType = 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
export type TeamCommunicationDirection = 'sent' | 'received';

export interface TeamCommunicationReferenceFile {
  referenceId: string;
  path: string;
  type: TeamCommunicationReferenceFileType;
  createdAt: string;
  updatedAt: string;
}

export interface TeamCommunicationMessage {
  messageId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberName?: string | null;
  receiverRunId: string;
  receiverMemberName?: string | null;
  content: string;
  messageType: string;
  createdAt: string;
  updatedAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
}

export interface TeamCommunicationPerspectiveMessage extends TeamCommunicationMessage {
  direction: TeamCommunicationDirection;
  counterpartRunId: string;
  counterpartMemberName: string | null;
  message: TeamCommunicationMessage;
}

export interface TeamCommunicationPerspectiveGroup {
  counterpartRunId: string;
  counterpartMemberName: string | null;
  messages: TeamCommunicationPerspectiveMessage[];
}

export interface TeamCommunicationPerspective {
  sentGroups: TeamCommunicationPerspectiveGroup[];
  receivedGroups: TeamCommunicationPerspectiveGroup[];
  messages: TeamCommunicationPerspectiveMessage[];
}

interface TeamCommunicationState {
  messagesByTeam: Map<string, TeamCommunicationMessage[]>;
}

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

const timestampOrNow = (value: unknown): string => readString(value) ?? new Date().toISOString();

const normalizeReferenceEntry = (
  rawReference: any,
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
  if (!rawReference || typeof rawReference !== 'object' || Array.isArray(rawReference)) {
    return null;
  }
  const normalizedPath = normalizePath(String(rawReference.path || ''));
  if (!normalizedPath) return null;
  return {
    referenceId: readString(rawReference.referenceId) || `reference:${fallback.index}:${normalizedPath}`,
    path: normalizedPath,
    type: normalizeType(rawReference.type) ?? inferType(normalizedPath),
    createdAt: timestampOrNow(rawReference.createdAt || fallback.timestamp),
    updatedAt: timestampOrNow(rawReference.updatedAt || rawReference.createdAt || fallback.timestamp),
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
  teamRunId: string,
  message: TeamCommunicationMessage,
): TeamCommunicationMessage => {
  const createdAt = timestampOrNow(message.createdAt);
  return {
    messageId: message.messageId,
    teamRunId,
    senderRunId: message.senderRunId,
    senderMemberName: message.senderMemberName ?? null,
    receiverRunId: message.receiverRunId,
    receiverMemberName: message.receiverMemberName ?? null,
    content: message.content,
    messageType: message.messageType || 'agent_message',
    createdAt,
    updatedAt: timestampOrNow(message.updatedAt || createdAt),
    referenceFiles: normalizeReferenceFiles(message.referenceFiles, createdAt),
  };
};

const normalizeMessageFromInterAgentPayload = (
  payload: InterAgentMessagePayload,
): TeamCommunicationMessage | null => {
  const teamRunId = readString(payload.team_run_id);
  const senderRunId = readString(payload.sender_agent_id);
  const receiverRunId = readString(payload.receiver_run_id) || readString(payload.agent_id);
  if (!teamRunId || !senderRunId || !receiverRunId || typeof payload.content !== 'string') {
    return null;
  }
  const createdAt = timestampOrNow(payload.created_at);
  const referenceSource = Array.isArray(payload.reference_file_entries)
    ? payload.reference_file_entries
    : payload.reference_files;
  return normalizeMessage(teamRunId, {
    messageId: readString(payload.message_id) || `${teamRunId}:${senderRunId}:${receiverRunId}:${createdAt}`,
    teamRunId,
    senderRunId,
    senderMemberName: payload.sender_agent_name ?? null,
    receiverRunId,
    receiverMemberName: payload.receiver_agent_name ?? payload.recipient_role_name ?? payload.agent_name ?? null,
    content: payload.content,
    messageType: payload.message_type || 'agent_message',
    createdAt,
    updatedAt: timestampOrNow(payload.updated_at || createdAt),
    referenceFiles: normalizeReferenceFiles(referenceSource, createdAt),
  });
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
  target.senderRunId = source.senderRunId;
  target.senderMemberName = source.senderMemberName ?? null;
  target.receiverRunId = source.receiverRunId;
  target.receiverMemberName = source.receiverMemberName ?? null;
  target.content = source.content;
  target.messageType = source.messageType;
  target.createdAt = target.createdAt || source.createdAt;
  target.updatedAt = source.updatedAt;
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

const buildPerspectiveMessage = (
  message: TeamCommunicationMessage,
  direction: TeamCommunicationDirection,
): TeamCommunicationPerspectiveMessage => ({
  ...message,
  direction,
  counterpartRunId: direction === 'sent' ? message.receiverRunId : message.senderRunId,
  counterpartMemberName: direction === 'sent'
    ? (message.receiverMemberName ?? null)
    : (message.senderMemberName ?? null),
  message,
});

const groupPerspectiveMessages = (
  messages: TeamCommunicationPerspectiveMessage[],
): TeamCommunicationPerspectiveGroup[] => {
  const groupsByCounterpart = new Map<string, TeamCommunicationPerspectiveGroup>();
  messages.forEach((message) => {
    const key = message.counterpartRunId || message.counterpartMemberName || 'unknown';
    if (!groupsByCounterpart.has(key)) {
      groupsByCounterpart.set(key, {
        counterpartRunId: message.counterpartRunId,
        counterpartMemberName: message.counterpartMemberName,
        messages: [],
      });
    }
    groupsByCounterpart.get(key)!.messages.push(message);
  });

  return Array.from(groupsByCounterpart.values())
    .map((group) => ({
      ...group,
      messages: group.messages.sort(compareMessagesDesc),
    }))
    .sort((left, right) => {
      const leftLatest = left.messages[0]?.createdAt || '';
      const rightLatest = right.messages[0]?.createdAt || '';
      const byCreatedAt = rightLatest.localeCompare(leftLatest);
      if (byCreatedAt !== 0) return byCreatedAt;
      return (left.counterpartMemberName || left.counterpartRunId)
        .localeCompare(right.counterpartMemberName || right.counterpartRunId);
    });
};

export const useTeamCommunicationStore = defineStore('teamCommunication', {
  state: (): TeamCommunicationState => ({
    messagesByTeam: new Map(),
  }),

  getters: {
    getMessagesForTeam: (state) => (teamRunId: string): TeamCommunicationMessage[] =>
      [...(state.messagesByTeam.get(teamRunId) || [])].sort(compareMessagesDesc),

    getPerspectiveForMember: (state) => (
      teamRunId: string,
      memberRunId: string,
    ): TeamCommunicationPerspective => {
      const normalizedMemberRunId = memberRunId.trim();
      if (!teamRunId || !normalizedMemberRunId) {
        return { sentGroups: [], receivedGroups: [], messages: [] };
      }

      const teamMessages = state.messagesByTeam.get(teamRunId) || [];
      const sent = teamMessages
        .filter((message) => message.senderRunId === normalizedMemberRunId)
        .map((message) => buildPerspectiveMessage(message, 'sent'));
      const received = teamMessages
        .filter((message) => message.receiverRunId === normalizedMemberRunId)
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
        messages.map((message) => normalizeMessage(teamRunId, message)),
      );
    },

    upsertMessage(message: TeamCommunicationMessage) {
      const normalized = normalizeMessage(message.teamRunId, message);
      const messages = ensureTeamMessages(this, normalized.teamRunId);
      const existing = messages.find((entry) => entry.messageId === normalized.messageId) || null;
      if (!existing) {
        messages.push(normalized);
        return normalized;
      }
      if (normalized.updatedAt.localeCompare(existing.updatedAt) >= 0) {
        applyMessageSnapshot(existing, normalized);
      }
      return existing;
    },

    upsertFromInterAgentPayload(payload: InterAgentMessagePayload) {
      const message = normalizeMessageFromInterAgentPayload(payload);
      if (!message) return null;
      return this.upsertMessage(message);
    },

    clearTeam(teamRunId: string) {
      this.messagesByTeam.delete(teamRunId);
    },
  },
});
