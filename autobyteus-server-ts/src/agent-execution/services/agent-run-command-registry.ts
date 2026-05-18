import type {
  AgentRunCommandErrorCode,
  AgentRunCommandRecord,
  AgentRunCommandState,
} from "./agent-run-command-types.js";

const TERMINAL_STATES = new Set<AgentRunCommandState>([
  "COMPLETED",
  "FAILED",
  "REJECTED",
]);

const IN_FLIGHT_STATES = new Set<AgentRunCommandState>([
  "STARTING",
  "FORWARDED",
]);

const nowIso = (): string => new Date().toISOString();

export type AgentRunCommandBeginResult =
  | { kind: "accepted"; record: AgentRunCommandRecord }
  | { kind: "duplicate"; record: AgentRunCommandRecord }
  | { kind: "busy"; record: AgentRunCommandRecord; busyRecord: AgentRunCommandRecord };

export class AgentRunCommandRegistry {
  private readonly recordsByRunId = new Map<string, Map<string, AgentRunCommandRecord>>();

  constructor(private readonly terminalRetentionMs = 15 * 60 * 1000) {}

  begin(input: {
    runId: string;
    messageId: string;
    dedupeKey: string;
  }): AgentRunCommandBeginResult {
    this.purgeExpiredTerminalRecords();
    const runRecords = this.getRunRecords(input.runId);
    const existing = runRecords.get(input.messageId);
    if (existing) {
      return { kind: "duplicate", record: existing };
    }

    const busyRecord = Array.from(runRecords.values()).find((record) =>
      IN_FLIGHT_STATES.has(record.state),
    );
    if (busyRecord) {
      const rejected = this.createRecord({
        ...input,
        state: "REJECTED",
        code: "RUN_COMMAND_IN_PROGRESS",
        message: "Another command is already in progress for this run.",
      });
      runRecords.set(input.messageId, rejected);
      return { kind: "busy", record: rejected, busyRecord };
    }

    const record = this.createRecord({ ...input, state: "STARTING" });
    runRecords.set(input.messageId, record);
    return { kind: "accepted", record };
  }

  markForwarded(input: {
    runId: string;
    messageId: string;
    turnId?: string | null;
  }): AgentRunCommandRecord | null {
    return this.update(input.runId, input.messageId, (record) => ({
      ...record,
      state: "FORWARDED",
      turnId: input.turnId ?? record.turnId ?? null,
    }));
  }

  markCompleted(input: {
    runId: string;
    messageId: string;
    turnId?: string | null;
  }): AgentRunCommandRecord | null {
    return this.transitionTerminal({
      ...input,
      state: "COMPLETED",
    });
  }

  markFailed(input: {
    runId: string;
    messageId: string;
    code: AgentRunCommandErrorCode;
    message?: string;
    turnId?: string | null;
  }): AgentRunCommandRecord | null {
    return this.transitionTerminal({
      ...input,
      state: "FAILED",
    });
  }

  getRecord(runId: string, messageId: string): AgentRunCommandRecord | null {
    return this.recordsByRunId.get(runId)?.get(messageId) ?? null;
  }

  getInFlightRecord(runId: string): AgentRunCommandRecord | null {
    const runRecords = this.recordsByRunId.get(runId);
    if (!runRecords) {
      return null;
    }
    return Array.from(runRecords.values()).find((record) =>
      IN_FLIGHT_STATES.has(record.state),
    ) ?? null;
  }

  hasInFlightCommand(runId: string): boolean {
    return this.getInFlightRecord(runId) !== null;
  }

  clear(): void {
    this.recordsByRunId.clear();
  }

  private transitionTerminal(input: {
    runId: string;
    messageId: string;
    state: "COMPLETED" | "FAILED" | "REJECTED";
    code?: AgentRunCommandErrorCode;
    message?: string;
    turnId?: string | null;
  }): AgentRunCommandRecord | null {
    const terminalAt = nowIso();
    return this.update(input.runId, input.messageId, (record) => ({
      ...record,
      state: input.state,
      terminalAt,
      ...(input.code ? { code: input.code } : {}),
      ...(input.message ? { message: input.message } : {}),
      turnId: input.turnId ?? record.turnId ?? null,
    }));
  }

  private update(
    runId: string,
    messageId: string,
    mutate: (record: AgentRunCommandRecord) => AgentRunCommandRecord,
  ): AgentRunCommandRecord | null {
    const runRecords = this.recordsByRunId.get(runId);
    const current = runRecords?.get(messageId) ?? null;
    if (!current || !runRecords) {
      return null;
    }
    const next = {
      ...mutate(current),
      updatedAt: nowIso(),
    };
    runRecords.set(messageId, next);
    return next;
  }

  private getRunRecords(runId: string): Map<string, AgentRunCommandRecord> {
    let runRecords = this.recordsByRunId.get(runId);
    if (!runRecords) {
      runRecords = new Map<string, AgentRunCommandRecord>();
      this.recordsByRunId.set(runId, runRecords);
    }
    return runRecords;
  }

  private createRecord(input: {
    runId: string;
    messageId: string;
    dedupeKey: string;
    state: AgentRunCommandState;
    code?: AgentRunCommandErrorCode;
    message?: string;
  }): AgentRunCommandRecord {
    const now = nowIso();
    return {
      runId: input.runId,
      messageId: input.messageId,
      dedupeKey: input.dedupeKey,
      state: input.state,
      createdAt: now,
      updatedAt: now,
      terminalAt: TERMINAL_STATES.has(input.state) ? now : null,
      ...(input.code ? { code: input.code } : {}),
      ...(input.message ? { message: input.message } : {}),
      turnId: null,
    };
  }

  private purgeExpiredTerminalRecords(): void {
    const cutoff = Date.now() - this.terminalRetentionMs;
    for (const [runId, runRecords] of this.recordsByRunId.entries()) {
      for (const [messageId, record] of runRecords.entries()) {
        if (!record.terminalAt || !TERMINAL_STATES.has(record.state)) {
          continue;
        }
        if (Date.parse(record.terminalAt) <= cutoff) {
          runRecords.delete(messageId);
        }
      }
      if (runRecords.size === 0) {
        this.recordsByRunId.delete(runId);
      }
    }
  }
}

let cachedAgentRunCommandRegistry: AgentRunCommandRegistry | null = null;

export const getAgentRunCommandRegistry = (): AgentRunCommandRegistry => {
  if (!cachedAgentRunCommandRegistry) {
    cachedAgentRunCommandRegistry = new AgentRunCommandRegistry();
  }
  return cachedAgentRunCommandRegistry;
};
