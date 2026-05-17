import { defineStore } from 'pinia';
import type { TeamCommunicationMessagePayload } from '~/services/agentStreaming/protocol/messageTypes';

import type {
  TeamCommunicationDirection,
  TeamCommunicationMemberAddress,
  TeamCommunicationMemberKind,
  TeamCommunicationMessage,
  TeamCommunicationParticipantSelector,
  TeamCommunicationPerspective,
  TeamCommunicationPerspectiveGroup,
  TeamCommunicationPerspectiveMessage,
  TeamCommunicationReferenceFile,
  TeamCommunicationReferenceFileType,
  TeamCommunicationRepresentedSubTeam,
} from './teamCommunicationTypes';

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

const readMemberKind = (value: unknown): TeamCommunicationMemberKind | null =>
  value === 'agent' || value === 'agent_team' ? value : null;

const readStringPath = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const path = value.map((entry) => readString(entry)).filter((entry): entry is string => Boolean(entry));
  return path.length > 0 ? path : null;
};

const readMemberAddress = (value: unknown): TeamCommunicationMemberAddress | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const teamRunId = readString(record.teamRunId ?? record.team_run_id);
  const memberPath = readStringPath(record.memberPath ?? record.member_path);
  const memberRouteKey = normalizeRouteKey(record.memberRouteKey as string | null | undefined)
    ?? normalizeRouteKey(record.member_route_key as string | null | undefined);
  if (!teamRunId || !memberPath || !memberRouteKey) return null;
  return { teamRunId, memberPath, memberRouteKey };
};

const readRepresentedSubTeam = (value: unknown): TeamCommunicationRepresentedSubTeam | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const memberName = readString(record.memberName);
  const memberPath = readStringPath(record.memberPath);
  const memberRouteKey = normalizeRouteKey(record.memberRouteKey as string | null | undefined);
  const memberRunId = readString(record.memberRunId);
  const teamDefinitionId = readString(record.teamDefinitionId);
  const childTeamRunId = readString(record.childTeamRunId ?? record.child_team_run_id);
  const address = readMemberAddress(record.address);
  if (!memberName || !memberPath || !memberRouteKey || !memberRunId || !teamDefinitionId || !address) return null;
  return {
    memberKind: 'agent_team',
    memberName,
    memberPath,
    memberRouteKey,
    memberRunId,
    teamDefinitionId,
    childTeamRunId,
    address,
  };
};

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
    senderMemberKind: message.senderMemberKind ?? null,
    senderMemberName: message.senderMemberName ?? null,
    senderMemberPath: message.senderMemberPath ?? null,
    senderMemberRouteKey: message.senderMemberRouteKey ?? null,
    senderRepresentedSubTeam: message.senderRepresentedSubTeam ?? null,
    receiverRunId: message.receiverRunId,
    receiverMemberKind: message.receiverMemberKind ?? null,
    receiverMemberName: message.receiverMemberName ?? null,
    receiverMemberPath: message.receiverMemberPath ?? null,
    receiverMemberRouteKey: message.receiverMemberRouteKey ?? null,
    receiverRepresentedSubTeam: message.receiverRepresentedSubTeam ?? null,
    content: message.content,
    messageType: message.messageType || 'agent_message',
    createdAt,
    updatedAt: timestampOrNow(message.updatedAt || createdAt),
    referenceFiles: normalizeReferenceFiles(message.referenceFiles, createdAt),
  };
};

const normalizeMessageFromPayload = (
  payload: TeamCommunicationMessagePayload,
): TeamCommunicationMessage | null => {
  const teamRunId = readString(payload.teamRunId);
  const senderRunId = readString(payload.senderRunId);
  const receiverRunId = readString(payload.receiverRunId);
  if (!teamRunId || !senderRunId || !receiverRunId || typeof payload.content !== 'string') {
    return null;
  }
  const createdAt = timestampOrNow(payload.createdAt);
  return normalizeMessage(teamRunId, {
    messageId: readString(payload.messageId) || `${teamRunId}:${senderRunId}:${receiverRunId}:${createdAt}`,
    teamRunId,
    senderRunId,
    senderMemberKind: readMemberKind(payload.senderMemberKind),
    senderMemberName: payload.senderMemberName ?? null,
    senderMemberPath: readStringPath(payload.senderMemberPath),
    senderMemberRouteKey: payload.senderMemberRouteKey ?? null,
    senderRepresentedSubTeam: readRepresentedSubTeam(payload.senderRepresentedSubTeam),
    receiverRunId,
    receiverMemberKind: readMemberKind(payload.receiverMemberKind),
    receiverMemberName: payload.receiverMemberName ?? null,
    receiverMemberPath: readStringPath(payload.receiverMemberPath),
    receiverMemberRouteKey: payload.receiverMemberRouteKey ?? null,
    receiverRepresentedSubTeam: readRepresentedSubTeam(payload.receiverRepresentedSubTeam),
    content: payload.content,
    messageType: payload.messageType || 'agent_message',
    createdAt,
    updatedAt: timestampOrNow(payload.updatedAt || createdAt),
    referenceFiles: normalizeReferenceFiles(payload.referenceFiles, createdAt),
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
  target.senderMemberKind = source.senderMemberKind ?? null;
  target.senderMemberName = source.senderMemberName ?? null;
  target.senderMemberPath = source.senderMemberPath ?? null;
  target.senderMemberRouteKey = source.senderMemberRouteKey ?? null;
  target.senderRepresentedSubTeam = source.senderRepresentedSubTeam ?? null;
  target.receiverRunId = source.receiverRunId;
  target.receiverMemberKind = source.receiverMemberKind ?? null;
  target.receiverMemberName = source.receiverMemberName ?? null;
  target.receiverMemberPath = source.receiverMemberPath ?? null;
  target.receiverMemberRouteKey = source.receiverMemberRouteKey ?? null;
  target.receiverRepresentedSubTeam = source.receiverRepresentedSubTeam ?? null;
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

const normalizeRouteKey = (value: string | null | undefined): string | null =>
  readString(value)?.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '') || null;

const normalizeParticipantPath = (value: string[] | null | undefined): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const path = value.map((segment) => readString(segment)).filter((segment): segment is string => Boolean(segment));
  return path.length > 0 ? path : null;
};

const routeKeyFromPath = (path: string[] | null): string | null =>
  path && path.length > 0 ? normalizeRouteKey(path.join('/')) : null;

const pathsEqual = (left: string[] | null, right: string[] | null): boolean =>
  Boolean(left && right && left.length === right.length && left.every((segment, index) => segment === right[index]));

const normalizeParticipantSelector = (
  selector: string | TeamCommunicationParticipantSelector,
): Required<TeamCommunicationParticipantSelector> | null => {
  if (typeof selector === 'string') {
    const memberRunId = readString(selector);
    return memberRunId
      ? { memberRunId, memberKind: null, memberPath: null, memberRouteKey: null }
      : null;
  }

  const memberPath = normalizeParticipantPath(selector.memberPath);
  const memberRouteKey = normalizeRouteKey(selector.memberRouteKey) ?? routeKeyFromPath(memberPath);
  const memberRunId = readString(selector.memberRunId);
  const memberKind = readMemberKind(selector.memberKind);

  if (!memberRunId && !memberRouteKey && !memberPath && !memberKind) {
    return null;
  }

  return {
    memberRunId,
    memberKind,
    memberPath,
    memberRouteKey,
  };
};

const participantKindMatches = (
  selectorKind: TeamCommunicationMemberKind | null,
  messageKind: TeamCommunicationMemberKind | null | undefined,
): boolean => !selectorKind || !messageKind || selectorKind === messageKind;

const participantMatches = (
  selector: Required<TeamCommunicationParticipantSelector>,
  participant: {
    runId: string;
    memberKind?: TeamCommunicationMemberKind | null;
    memberPath?: string[] | null;
    memberRouteKey?: string | null;
    representedSubTeam?: TeamCommunicationRepresentedSubTeam | null;
  },
): boolean => {
  if (participantKindMatches(selector.memberKind, participant.memberKind)) {
    const participantPath = normalizeParticipantPath(participant.memberPath ?? null);
    const participantRouteKey = normalizeRouteKey(participant.memberRouteKey) ?? routeKeyFromPath(participantPath);

    if (pathsEqual(selector.memberPath, participantPath)) {
      return true;
    }

    if (selector.memberRouteKey && participantRouteKey) {
      return selector.memberRouteKey === participantRouteKey;
    }

    if (selector.memberRunId && selector.memberRunId === participant.runId) {
      return true;
    }
  }

  const represented = participant.representedSubTeam ?? null;
  if (represented) {
    if (!participantKindMatches(selector.memberKind, 'agent_team')) {
      return false;
    }
    const representedPath = normalizeParticipantPath(represented.memberPath);
    const representedRouteKey = normalizeRouteKey(represented.memberRouteKey) ?? routeKeyFromPath(representedPath);
    if (pathsEqual(selector.memberPath, representedPath)) {
      return true;
    }
    if (selector.memberRouteKey && representedRouteKey) {
      return selector.memberRouteKey === representedRouteKey;
    }
    if (selector.memberRunId && selector.memberRunId === represented.memberRunId) {
      return true;
    }
  }

  return false;
};

const messageSenderMatches = (
  message: TeamCommunicationMessage,
  selector: Required<TeamCommunicationParticipantSelector>,
): boolean => participantMatches(selector, {
  runId: message.senderRunId,
  memberKind: message.senderMemberKind,
  memberPath: message.senderMemberPath,
  memberRouteKey: message.senderMemberRouteKey,
  representedSubTeam: message.senderRepresentedSubTeam,
});

const messageReceiverMatches = (
  message: TeamCommunicationMessage,
  selector: Required<TeamCommunicationParticipantSelector>,
): boolean => participantMatches(selector, {
  runId: message.receiverRunId,
  memberKind: message.receiverMemberKind,
  memberPath: message.receiverMemberPath,
  memberRouteKey: message.receiverMemberRouteKey,
  representedSubTeam: message.receiverRepresentedSubTeam,
});

const buildPerspectiveMessage = (
  message: TeamCommunicationMessage,
  direction: TeamCommunicationDirection,
): TeamCommunicationPerspectiveMessage => ({
  ...message,
  direction,
  counterpartRunId: direction === 'sent' ? message.receiverRunId : message.senderRunId,
  counterpartMemberKind: direction === 'sent'
    ? (message.receiverMemberKind ?? null)
    : (message.senderMemberKind ?? null),
  counterpartMemberName: direction === 'sent'
    ? (message.receiverMemberName ?? null)
    : (message.senderMemberName ?? null),
  counterpartMemberPath: direction === 'sent'
    ? (message.receiverMemberPath ?? null)
    : (message.senderMemberPath ?? null),
  counterpartMemberRouteKey: direction === 'sent'
    ? (message.receiverMemberRouteKey ?? null)
    : (message.senderMemberRouteKey ?? null),
  counterpartRepresentedSubTeam: direction === 'sent'
    ? (message.receiverRepresentedSubTeam ?? null)
    : (message.senderRepresentedSubTeam ?? null),
  message,
});

const groupPerspectiveMessages = (
  messages: TeamCommunicationPerspectiveMessage[],
): TeamCommunicationPerspectiveGroup[] => {
  const groupsByCounterpart = new Map<string, TeamCommunicationPerspectiveGroup>();
  messages.forEach((message) => {
    const key = message.counterpartMemberRouteKey
      || message.counterpartMemberPath?.join('/')
      || message.counterpartRunId
      || message.counterpartMemberName
      || 'unknown';
    if (!groupsByCounterpart.has(key)) {
      groupsByCounterpart.set(key, {
        counterpartRunId: message.counterpartRunId,
        counterpartMemberKind: message.counterpartMemberKind,
        counterpartMemberName: message.counterpartMemberName,
        counterpartMemberPath: message.counterpartMemberPath,
        counterpartMemberRouteKey: message.counterpartMemberRouteKey,
        counterpartRepresentedSubTeam: message.counterpartRepresentedSubTeam,
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
      return (
        left.counterpartMemberRouteKey ||
        left.counterpartMemberPath?.join('/') ||
        left.counterpartMemberName ||
        left.counterpartRunId
      ).localeCompare(
        right.counterpartMemberRouteKey ||
        right.counterpartMemberPath?.join('/') ||
        right.counterpartMemberName ||
        right.counterpartRunId,
      );
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
      participantSelector: string | TeamCommunicationParticipantSelector,
    ): TeamCommunicationPerspective => {
      const selector = normalizeParticipantSelector(participantSelector);
      if (!teamRunId || !selector) {
        return { sentGroups: [], receivedGroups: [], messages: [] };
      }

      const teamMessages = state.messagesByTeam.get(teamRunId) || [];
      const sent = teamMessages
        .filter((message) => messageSenderMatches(message, selector))
        .map((message) => buildPerspectiveMessage(message, 'sent'));
      const received = teamMessages
        .filter((message) => messageReceiverMatches(message, selector))
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

    upsertFromBackendPayload(payload: TeamCommunicationMessagePayload) {
      const message = normalizeMessageFromPayload(payload);
      if (!message) return null;
      return this.upsertMessage(message);
    },

    clearTeam(teamRunId: string) {
      this.messagesByTeam.delete(teamRunId);
    },
  },
});
