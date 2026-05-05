import { defineStore } from 'pinia';

export type MessageFileReferenceArtifactType = 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
export type MessageFileReferenceDirection = 'sent' | 'received';

export interface MessageFileReferenceArtifact {
  referenceId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberName?: string | null;
  receiverRunId: string;
  receiverMemberName?: string | null;
  path: string;
  type: MessageFileReferenceArtifactType;
  messageType: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageFileReferencePerspectiveItem extends MessageFileReferenceArtifact {
  direction: MessageFileReferenceDirection;
  counterpartRunId: string;
  counterpartMemberName: string | null;
  reference: MessageFileReferenceArtifact;
}

export interface MessageFileReferencePerspectiveGroup {
  counterpartRunId: string;
  counterpartMemberName: string | null;
  items: MessageFileReferencePerspectiveItem[];
}

export interface MessageFileReferencePerspective {
  sentGroups: MessageFileReferencePerspectiveGroup[];
  receivedGroups: MessageFileReferencePerspectiveGroup[];
}

interface MessageFileReferencesState {
  entriesByTeam: Map<string, MessageFileReferenceArtifact[]>;
}

const normalizePath = (value: string): string => value.replace(/\\/g, '/').trim();

const normalizeArtifactType = (value?: string | null): MessageFileReferenceArtifactType => {
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
      return 'file';
  }
};

const normalizeReference = (
  teamRunId: string,
  entry: MessageFileReferenceArtifact,
): MessageFileReferenceArtifact => ({
  referenceId: entry.referenceId,
  teamRunId,
  senderRunId: entry.senderRunId,
  senderMemberName: entry.senderMemberName ?? null,
  receiverRunId: entry.receiverRunId,
  receiverMemberName: entry.receiverMemberName ?? null,
  path: normalizePath(entry.path),
  type: normalizeArtifactType(entry.type),
  messageType: entry.messageType || 'agent_message',
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const ensureTeamEntries = (
  state: MessageFileReferencesState,
  teamRunId: string,
): MessageFileReferenceArtifact[] => {
  if (!state.entriesByTeam.has(teamRunId)) {
    state.entriesByTeam.set(teamRunId, []);
  }
  return state.entriesByTeam.get(teamRunId)!;
};

const applyReferenceSnapshot = (
  target: MessageFileReferenceArtifact,
  source: MessageFileReferenceArtifact,
): void => {
  target.referenceId = source.referenceId;
  target.teamRunId = source.teamRunId;
  target.senderRunId = source.senderRunId;
  target.senderMemberName = source.senderMemberName ?? null;
  target.receiverRunId = source.receiverRunId;
  target.receiverMemberName = source.receiverMemberName ?? null;
  target.path = source.path;
  target.type = source.type;
  target.messageType = source.messageType;
  target.createdAt = target.createdAt || source.createdAt;
  target.updatedAt = source.updatedAt;
};

const compareUpdatedDesc = (
  left: { updatedAt: string; path?: string },
  right: { updatedAt: string; path?: string },
): number => {
  const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt);
  if (byUpdatedAt !== 0) {
    return byUpdatedAt;
  }
  return (left.path || '').localeCompare(right.path || '');
};

const buildPerspectiveItem = (
  reference: MessageFileReferenceArtifact,
  direction: MessageFileReferenceDirection,
): MessageFileReferencePerspectiveItem => ({
  ...reference,
  direction,
  counterpartRunId: direction === 'sent' ? reference.receiverRunId : reference.senderRunId,
  counterpartMemberName: direction === 'sent'
    ? (reference.receiverMemberName ?? null)
    : (reference.senderMemberName ?? null),
  reference,
});

const groupPerspectiveItems = (
  items: MessageFileReferencePerspectiveItem[],
): MessageFileReferencePerspectiveGroup[] => {
  const groupByCounterpart = new Map<string, MessageFileReferencePerspectiveGroup>();
  for (const item of items) {
    const key = item.counterpartRunId || item.counterpartMemberName || 'unknown';
    if (!groupByCounterpart.has(key)) {
      groupByCounterpart.set(key, {
        counterpartRunId: item.counterpartRunId,
        counterpartMemberName: item.counterpartMemberName,
        items: [],
      });
    }
    groupByCounterpart.get(key)!.items.push(item);
  }

  return Array.from(groupByCounterpart.values())
    .map((group) => ({
      ...group,
      items: group.items.sort(compareUpdatedDesc),
    }))
    .sort((left, right) => {
      const leftLatest = left.items[0]?.updatedAt || '';
      const rightLatest = right.items[0]?.updatedAt || '';
      const byUpdatedAt = rightLatest.localeCompare(leftLatest);
      if (byUpdatedAt !== 0) {
        return byUpdatedAt;
      }
      return (left.counterpartMemberName || left.counterpartRunId)
        .localeCompare(right.counterpartMemberName || right.counterpartRunId);
    });
};

export const useMessageFileReferencesStore = defineStore('messageFileReferences', {
  state: (): MessageFileReferencesState => ({
    entriesByTeam: new Map(),
  }),

  getters: {
    getReferencesForTeam: (state) => (teamRunId: string) =>
      state.entriesByTeam.get(teamRunId) || [],

    getPerspectiveForMember: (state) => (
      teamRunId: string,
      memberRunId: string,
    ): MessageFileReferencePerspective => {
      const normalizedMemberRunId = memberRunId.trim();
      if (!teamRunId || !normalizedMemberRunId) {
        return { sentGroups: [], receivedGroups: [] };
      }

      const references = state.entriesByTeam.get(teamRunId) || [];
      const sent = references
        .filter((reference) => reference.senderRunId === normalizedMemberRunId)
        .map((reference) => buildPerspectiveItem(reference, 'sent'));
      const received = references
        .filter((reference) => reference.receiverRunId === normalizedMemberRunId)
        .map((reference) => buildPerspectiveItem(reference, 'received'));

      return {
        sentGroups: groupPerspectiveItems(sent),
        receivedGroups: groupPerspectiveItems(received),
      };
    },
  },

  actions: {
    replaceProjection(
      teamRunId: string,
      entries: MessageFileReferenceArtifact[],
    ) {
      this.entriesByTeam.set(
        teamRunId,
        entries.map((entry) => normalizeReference(teamRunId, entry)),
      );
    },

    upsertFromBackend(payload: MessageFileReferenceArtifact) {
      const teamRunId = payload.teamRunId;
      const references = ensureTeamEntries(this, teamRunId);
      const normalized = normalizeReference(teamRunId, payload);
      const existing = references.find((entry) => entry.referenceId === normalized.referenceId) || null;
      if (!existing) {
        references.push(normalized);
        return normalized;
      }
      if (normalized.updatedAt.localeCompare(existing.updatedAt) >= 0) {
        applyReferenceSnapshot(existing, normalized);
      }
      return existing;
    },

    clearTeam(teamRunId: string) {
      this.entriesByTeam.delete(teamRunId);
    },
  },
});
