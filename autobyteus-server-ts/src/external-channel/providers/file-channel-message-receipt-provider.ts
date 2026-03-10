import {
  parseExternalChannelProvider,
  type ExternalChannelProvider,
} from "autobyteus-ts/external-channel/provider.js";
import {
  parseExternalChannelTransport,
  type ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import type {
  ChannelDispatchTarget,
  ChannelIngressReceiptInput,
  ChannelSourceContext,
  ChannelTurnReceiptBindingInput,
} from "../domain/models.js";
import type { ChannelMessageReceiptProvider } from "./channel-message-receipt-provider.js";
import {
  normalizeNullableString,
  normalizeRequiredString,
  parseDate,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";

type ChannelMessageReceiptRow = {
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  externalMessageId: string;
  turnId: string | null;
  agentRunId: string | null;
  teamRunId: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
};

const toThreadStorage = (threadId: string | null): string => normalizeNullableString(threadId) ?? "";
const fromThreadStorage = (threadId: string): string | null => normalizeNullableString(threadId);

const sortByReceivedThenUpdatedDesc = (rows: ChannelMessageReceiptRow[]): ChannelMessageReceiptRow[] =>
  [...rows].sort((a, b) => {
    const receivedDiff = parseDate(b.receivedAt).getTime() - parseDate(a.receivedAt).getTime();
    if (receivedDiff !== 0) {
      return receivedDiff;
    }
    return parseDate(b.updatedAt).getTime() - parseDate(a.updatedAt).getTime();
  });

const sortByUpdatedThenReceivedDesc = (rows: ChannelMessageReceiptRow[]): ChannelMessageReceiptRow[] =>
  [...rows].sort((a, b) => {
    const updatedDiff = parseDate(b.updatedAt).getTime() - parseDate(a.updatedAt).getTime();
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    return parseDate(b.receivedAt).getTime() - parseDate(a.receivedAt).getTime();
  });

const toSourceContext = (row: ChannelMessageReceiptRow): ChannelSourceContext => ({
  provider: parseExternalChannelProvider(row.provider),
  transport: parseExternalChannelTransport(row.transport),
  accountId: row.accountId,
  peerId: row.peerId,
  threadId: fromThreadStorage(row.threadId),
  externalMessageId: row.externalMessageId,
  receivedAt: parseDate(row.receivedAt),
  turnId: normalizeNullableString(row.turnId),
});

export class FileChannelMessageReceiptProvider implements ChannelMessageReceiptProvider {
  constructor(
    private readonly filePath: string = resolvePersistencePath(
      "external-channel",
      "message-receipts.json",
    ),
  ) {}

  async recordIngressReceipt(input: ChannelIngressReceiptInput): Promise<void> {
    const now = new Date().toISOString();
    await updateJsonArrayFile<ChannelMessageReceiptRow>(this.filePath, (rows) => {
      const index = rows.findIndex(
        (row) =>
          row.provider === input.provider &&
          row.transport === input.transport &&
          row.accountId === input.accountId &&
          row.peerId === input.peerId &&
          row.threadId === toThreadStorage(input.threadId) &&
          row.externalMessageId === input.externalMessageId,
      );

      if (index < 0) {
        const created: ChannelMessageReceiptRow = {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
          turnId: normalizeNullableString(input.turnId ?? null),
          agentRunId: normalizeNullableString(input.agentRunId),
          teamRunId: normalizeNullableString(input.teamRunId),
          receivedAt: input.receivedAt.toISOString(),
          createdAt: now,
          updatedAt: now,
        };
        return [...rows, created];
      }

      const current = rows[index] as ChannelMessageReceiptRow;
      const next = [...rows];
      next[index] = {
        ...current,
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        receivedAt: input.receivedAt.toISOString(),
        updatedAt: now,
      };
      return next;
    });
  }

  async bindTurnToReceipt(input: ChannelTurnReceiptBindingInput): Promise<void> {
    const now = new Date().toISOString();
    await updateJsonArrayFile<ChannelMessageReceiptRow>(this.filePath, (rows) => {
      const index = rows.findIndex(
        (row) =>
          row.provider === input.provider &&
          row.transport === input.transport &&
          row.accountId === input.accountId &&
          row.peerId === input.peerId &&
          row.threadId === toThreadStorage(input.threadId) &&
          row.externalMessageId === input.externalMessageId,
      );

      if (index < 0) {
        const created: ChannelMessageReceiptRow = {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
          turnId: normalizeRequiredString(input.turnId, "turnId"),
          agentRunId: normalizeNullableString(input.agentRunId),
          teamRunId: normalizeNullableString(input.teamRunId),
          receivedAt: input.receivedAt.toISOString(),
          createdAt: now,
          updatedAt: now,
        };
        return [...rows, created];
      }

      const current = rows[index] as ChannelMessageReceiptRow;
      const next = [...rows];
      next[index] = {
        ...current,
        turnId: normalizeRequiredString(input.turnId, "turnId"),
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        receivedAt: input.receivedAt.toISOString(),
        updatedAt: now,
      };
      return next;
    });
  }

  async getLatestSourceByAgentRunId(agentRunId: string): Promise<ChannelSourceContext | null> {
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    const rows = await readJsonArrayFile<ChannelMessageReceiptRow>(this.filePath);
    const found = sortByReceivedThenUpdatedDesc(rows).find(
      (row) => row.agentRunId === normalizedAgentRunId,
    );
    return found ? toSourceContext(found) : null;
  }

  async getLatestSourceByDispatchTarget(
    target: ChannelDispatchTarget,
  ): Promise<ChannelSourceContext | null> {
    const rows = await readJsonArrayFile<ChannelMessageReceiptRow>(this.filePath);
    const sorted = sortByReceivedThenUpdatedDesc(rows);

    const agentRunId = normalizeNullableString(target.agentRunId);
    if (agentRunId) {
      const byAgent = sorted.find((row) => row.agentRunId === agentRunId);
      if (byAgent) {
        return toSourceContext(byAgent);
      }
    }

    const teamRunId = normalizeNullableString(target.teamRunId);
    if (!teamRunId) {
      return null;
    }

    const byTeam = sorted.find((row) => row.teamRunId === teamRunId);
    return byTeam ? toSourceContext(byTeam) : null;
  }

  async getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null> {
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    const normalizedTurnId = normalizeRequiredString(turnId, "turnId");
    const rows = await readJsonArrayFile<ChannelMessageReceiptRow>(this.filePath);
    const found = sortByUpdatedThenReceivedDesc(rows).find(
      (row) => row.agentRunId === normalizedAgentRunId && row.turnId === normalizedTurnId,
    );
    return found ? toSourceContext(found) : null;
  }
}

export type { ExternalChannelProvider, ExternalChannelTransport };
