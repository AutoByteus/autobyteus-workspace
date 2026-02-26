import type { PersonalSessionPeerCandidate } from "../../../domain/models/session-peer-candidate.js";

export type DiscordPeerCandidate = PersonalSessionPeerCandidate;

export type DiscordPeerCandidateObservation = DiscordPeerCandidate & {
  accountId: string;
};

export type ListDiscordPeerCandidatesOptions = {
  accountId: string;
  includeGroups?: boolean;
  limit?: number;
};

export type ListDiscordPeerCandidatesResult = {
  accountId: string;
  updatedAt: string;
  items: DiscordPeerCandidate[];
};

export type DiscordPeerCandidateIndexConfig = {
  maxCandidatesPerAccount: number;
  candidateTtlSeconds: number;
};

type StoredObservation = DiscordPeerCandidateObservation & {
  observedAtMs: number;
};

export class DiscordPeerCandidateIndex {
  private readonly byAccount = new Map<string, Map<string, StoredObservation>>();
  private readonly maxCandidatesPerAccount: number;
  private readonly candidateTtlMs: number;
  private lastUpdatedAt = new Date(0).toISOString();

  constructor(config: DiscordPeerCandidateIndexConfig) {
    this.maxCandidatesPerAccount = normalizePositiveInteger(
      config.maxCandidatesPerAccount,
      "maxCandidatesPerAccount",
    );
    this.candidateTtlMs =
      normalizePositiveInteger(config.candidateTtlSeconds, "candidateTtlSeconds") * 1000;
  }

  recordObservation(observation: DiscordPeerCandidateObservation): void {
    const accountId = normalizeRequiredString(observation.accountId, "accountId");
    const observedAtMs = parseObservedAt(observation.lastMessageAt);
    const now = Date.now();

    this.pruneExpired(now);

    const byKey = this.byAccount.get(accountId) ?? new Map<string, StoredObservation>();
    const key = buildCandidateKey(observation.peerId, observation.threadId);
    byKey.set(key, {
      ...observation,
      accountId,
      observedAtMs,
      lastMessageAt: new Date(observedAtMs).toISOString(),
    });

    enforceMax(byKey, this.maxCandidatesPerAccount);
    this.byAccount.set(accountId, byKey);
    this.lastUpdatedAt = new Date(now).toISOString();
  }

  listCandidates(options: ListDiscordPeerCandidatesOptions): ListDiscordPeerCandidatesResult {
    const accountId = normalizeRequiredString(options.accountId, "accountId");
    const includeGroups = options.includeGroups ?? true;
    const limit = normalizeLimit(options.limit, this.maxCandidatesPerAccount);
    const now = Date.now();

    this.pruneExpired(now);

    const byKey = this.byAccount.get(accountId);
    if (!byKey || byKey.size === 0) {
      return {
        accountId,
        updatedAt: this.lastUpdatedAt,
        items: [],
      };
    }

    const items = [...byKey.values()]
      .filter((candidate) => includeGroups || candidate.peerType !== "GROUP")
      .sort((left, right) => right.observedAtMs - left.observedAtMs)
      .slice(0, limit)
      .map((candidate) => ({
        peerId: candidate.peerId,
        peerType: candidate.peerType,
        threadId: candidate.threadId,
        displayName: candidate.displayName,
        lastMessageAt: candidate.lastMessageAt,
      }));

    return {
      accountId,
      updatedAt: this.lastUpdatedAt,
      items,
    };
  }

  pruneExpired(nowMs = Date.now()): void {
    const minObservedAt = nowMs - this.candidateTtlMs;
    for (const [accountId, byKey] of this.byAccount.entries()) {
      for (const [key, candidate] of byKey.entries()) {
        if (candidate.observedAtMs < minObservedAt) {
          byKey.delete(key);
        }
      }
      if (byKey.size === 0) {
        this.byAccount.delete(accountId);
      }
    }
  }
}

const enforceMax = (
  byKey: Map<string, StoredObservation>,
  maxCandidatesPerAccount: number,
): void => {
  if (byKey.size <= maxCandidatesPerAccount) {
    return;
  }

  const ranked = [...byKey.entries()].sort(
    (left, right) => right[1].observedAtMs - left[1].observedAtMs,
  );
  byKey.clear();
  for (const [key, candidate] of ranked.slice(0, maxCandidatesPerAccount)) {
    byKey.set(key, candidate);
  }
};

const buildCandidateKey = (peerId: string, threadId: string | null): string =>
  `${peerId}::${threadId ?? ""}`;

const normalizeRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
};

const parseObservedAt = (value: unknown): number => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("lastMessageAt must be an ISO timestamp string.");
  }
  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  if (Number.isNaN(timestamp)) {
    throw new Error("lastMessageAt must be an ISO timestamp string.");
  }
  return timestamp;
};

const normalizePositiveInteger = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return value;
};

const normalizeLimit = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error("limit must be a positive integer.");
  }
  return Math.min(value, fallback);
};
