export interface RunTemplateCandidate {
  config: {
    workspaceId: string | null;
    llmModelIdentifier: string;
  };
  state: {
    conversation: {
      updatedAt?: string | null;
    };
  };
}

export interface ResolveRunnableModelIdentifierInput {
  candidateModels: Array<string | null | undefined>;
  getKnownModels: () => string[];
  ensureModelsLoaded?: () => Promise<void>;
}

const normalizeModelIdentifier = (value: string | null | undefined): string => {
  const normalized = (value || '').trim();
  return normalized;
};

const toTimestamp = (isoTime: string | null | undefined): number => {
  if (!isoTime) {
    return 0;
  }
  const timestamp = Date.parse(isoTime);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const pickPreferredRunTemplate = <T extends RunTemplateCandidate>(
  candidates: T[],
  workspaceId: string,
): T | null => {
  const sorted = [...candidates].sort(
    (a, b) =>
      toTimestamp(b.state.conversation.updatedAt) - toTimestamp(a.state.conversation.updatedAt),
  );

  const sameWorkspace = sorted.find(
    candidate =>
      candidate.config.workspaceId === workspaceId &&
      Boolean(normalizeModelIdentifier(candidate.config.llmModelIdentifier)),
  );
  if (sameWorkspace) {
    return sameWorkspace;
  }

  const crossWorkspace = sorted.find(candidate =>
    Boolean(normalizeModelIdentifier(candidate.config.llmModelIdentifier)),
  );
  return crossWorkspace || null;
};

export const resolveRunnableModelIdentifier = async (
  input: ResolveRunnableModelIdentifierInput,
): Promise<string> => {
  for (const candidate of input.candidateModels) {
    const normalized = normalizeModelIdentifier(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (input.ensureModelsLoaded) {
    try {
      await input.ensureModelsLoaded();
    } catch {
      // Best-effort fetch. Caller decides whether empty result is acceptable.
    }
  }

  const knownModels = input.getKnownModels();
  return normalizeModelIdentifier(knownModels[0]);
};
