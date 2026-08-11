import { defineStore } from 'pinia';
import {
  parseTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import type {
  TeamCommunicationDirection,
  TeamCommunicationMessage,
  TeamCommunicationPerspective,
  TeamCommunicationPerspectiveGroup,
  TeamCommunicationPerspectiveMessage,
  TeamCommunicationReferenceFile,
  TeamCommunicationReferenceFileType,
} from './teamCommunicationTypes';

interface TeamCommunicationState { messagesByTeam: Map<string, TeamCommunicationMessage[]> }
export interface TeamCommunicationProjectionPayload {
  messageId: string;
  teamRunId: string;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  content: string;
  messageType: string;
  createdAt: string;
  referenceFiles: Array<{ referenceId: string; path: string; type: TeamCommunicationReferenceFileType; createdAt: string; updatedAt: string }>;
}
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const referenceTypes = new Set<TeamCommunicationReferenceFileType>(['file', 'image', 'audio', 'video', 'pdf', 'csv', 'excel', 'other']);

const parseReference = (value: unknown): TeamCommunicationReferenceFile | null => {
  const item = record(value);
  const referenceId = text(item?.referenceId);
  const path = text(item?.path);
  const type = text(item?.type) as TeamCommunicationReferenceFileType | null;
  const createdAt = text(item?.createdAt);
  const updatedAt = text(item?.updatedAt);
  return referenceId && path && type && referenceTypes.has(type) && createdAt && updatedAt
    ? { referenceId, path, type, createdAt, updatedAt }
    : null;
};

const parseMessage = (value: unknown): TeamCommunicationMessage | null => {
  const item = record(value);
  if (!item || !Array.isArray(item.referenceFiles)) return null;
  const messageId = text(item.messageId);
  const content = typeof item.content === 'string' ? item.content : null;
  const messageType = text(item.messageType);
  const createdAt = text(item.createdAt);
  const references = item.referenceFiles.map(parseReference);
  if (!messageId || content === null || !messageType || !createdAt || references.some((entry) => !entry)) return null;
  try {
    return {
      messageId,
      senderAddress: parseTeamExecutionAddress(item.senderAddress),
      receiverAddress: parseTeamExecutionAddress(item.receiverAddress),
      content,
      messageType,
      createdAt,
      referenceFiles: references as TeamCommunicationReferenceFile[],
    };
  } catch { return null; }
};

const compareMessagesDesc = (left: TeamCommunicationMessage, right: TeamCommunicationMessage): number =>
  right.createdAt.localeCompare(left.createdAt) || left.messageId.localeCompare(right.messageId);

export const formatTeamCommunicationAddressLabel = (address: TeamExecutionAddress): string => {
  const task = address.taskAgentRunId ?? address.taskTeamRunIds.at(-1) ?? null;
  return task ? `${address.memberAddress} · ${task}` : address.memberAddress;
};

const perspectiveMessage = (message: TeamCommunicationMessage, direction: TeamCommunicationDirection): TeamCommunicationPerspectiveMessage => {
  const counterpartAddress = direction === 'sent' ? message.receiverAddress : message.senderAddress;
  return {
    ...message,
    direction,
    counterpartAddress,
    counterpartKey: serializeTeamExecutionAddress(counterpartAddress),
    counterpartLabel: formatTeamCommunicationAddressLabel(counterpartAddress),
    message,
  };
};

const groups = (messages: TeamCommunicationPerspectiveMessage[]): TeamCommunicationPerspectiveGroup[] => {
  const byAddress = new Map<string, TeamCommunicationPerspectiveGroup>();
  messages.forEach((message) => {
    const group = byAddress.get(message.counterpartKey) ?? {
      counterpartAddress: message.counterpartAddress,
      counterpartKey: message.counterpartKey,
      counterpartLabel: message.counterpartLabel,
      messages: [],
    };
    group.messages.push(message);
    byAddress.set(message.counterpartKey, group);
  });
  return [...byAddress.values()].map((group) => ({ ...group, messages: group.messages.sort(compareMessagesDesc) }));
};

export const useTeamCommunicationStore = defineStore('teamCommunication', {
  state: (): TeamCommunicationState => ({ messagesByTeam: new Map() }),
  getters: {
    getMessagesForTeam: (state) => (teamRunId: string): TeamCommunicationMessage[] =>
      [...(state.messagesByTeam.get(teamRunId) ?? [])].sort(compareMessagesDesc),
    getPerspectiveForAddress: (state) => (teamRunId: string, address: TeamExecutionAddress | null | undefined): TeamCommunicationPerspective => {
      if (!teamRunId || !address) return { sentGroups: [], receivedGroups: [], messages: [] };
      let key = '';
      try { key = serializeTeamExecutionAddress(address); } catch { return { sentGroups: [], receivedGroups: [], messages: [] }; }
      const messages = state.messagesByTeam.get(teamRunId) ?? [];
      const sentGroups = groups(messages.filter((message) => serializeTeamExecutionAddress(message.senderAddress) === key).map((message) => perspectiveMessage(message, 'sent')));
      const receivedGroups = groups(messages.filter((message) => serializeTeamExecutionAddress(message.receiverAddress) === key).map((message) => perspectiveMessage(message, 'received')));
      return { sentGroups, receivedGroups, messages: [...sentGroups, ...receivedGroups].flatMap((group) => group.messages).sort(compareMessagesDesc) };
    },
  },
  actions: {
    replaceProjection(teamRunId: string, messages: unknown[]) {
      this.messagesByTeam.set(teamRunId, messages.map(parseMessage).filter((item): item is TeamCommunicationMessage => Boolean(item)));
    },
    upsertMessage(teamRunId: string, message: unknown) {
      const parsed = parseMessage(message);
      if (!parsed) return null;
      const messages = this.messagesByTeam.get(teamRunId) ?? [];
      const index = messages.findIndex((item) => item.messageId === parsed.messageId);
      index < 0 ? messages.push(parsed) : messages.splice(index, 1, parsed);
      this.messagesByTeam.set(teamRunId, messages);
      return parsed;
    },
    upsertFromBackendPayload(payload: TeamCommunicationProjectionPayload) {
      const teamRunId = text(payload.teamRunId);
      return teamRunId ? this.upsertMessage(teamRunId, payload) : null;
    },
    clearTeam(teamRunId: string) { this.messagesByTeam.delete(teamRunId); },
  },
});
