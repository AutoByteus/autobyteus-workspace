import type {
  AgentRunCommandErrorCode,
  AgentRunCommandRecord,
  AgentRunCommandState,
} from "./agent-run-command-types.js";

const TERMINAL_STATES = new Set<AgentRunCommandState>([
  "COMPLETED",
  "FAILED",
  "REJECTED",
  "CANCELLED",
]);
const OUTSTANDING_STATES = new Set<AgentRunCommandState>([
  "STARTING",
  "ADMITTED",
  "FORWARDED",
]);
const nowIso = (): string => new Date().toISOString();

export type AgentRunCommandBeginResult =
  | { kind: "accepted"; record: AgentRunCommandRecord }
  | { kind: "duplicate"; record: AgentRunCommandRecord };

export class AgentRunCommandRegistry {
  private readonly recordsByRunId = new Map<string, Map<string, AgentRunCommandRecord>>();

  constructor(private readonly terminalRetentionMs = 15 * 60 * 1000) {}

  begin(input: { runId: string; messageId: string; dedupeKey: string }): AgentRunCommandBeginResult {
    this.purgeExpiredTerminalRecords();
    const runRecords = this.getRunRecords(input.runId);
    const existing = runRecords.get(input.messageId);
    if (existing) return { kind: "duplicate", record: existing };
    const record = this.createRecord({ ...input, state: "STARTING" });
    runRecords.set(input.messageId, record);
    return { kind: "accepted", record };
  }

  markAdmitted(input: { runId: string; messageId: string }): AgentRunCommandRecord | null {
    return this.updateOutstanding(input.runId, input.messageId, (record) => ({
      ...record,
      state: "ADMITTED",
    }));
  }

  markForwarded(input: {
    runId: string;
    messageId: string;
    turnId?: string | null;
  }): AgentRunCommandRecord | null {
    return this.updateOutstanding(input.runId, input.messageId, (record) => ({
      ...record,
      state: "FORWARDED",
      turnId: input.turnId ?? record.turnId,
    }));
  }

  associateIdentified(input: {
    runId: string;
    messageId: string;
    turnId: string;
  }): AgentRunCommandRecord | null {
    return this.updateOutstanding(input.runId, input.messageId, (record) => ({
      ...record,
      turnId: record.turnId && record.turnId !== input.turnId ? record.turnId : input.turnId,
    }));
  }

  markCompleted(input: {
    runId: string;
    messageId: string;
    turnId?: string | null;
  }): AgentRunCommandRecord | null {
    return this.transitionTerminal({ ...input, state: "COMPLETED" });
  }

  markFailed(input: {
    runId: string;
    messageId: string;
    code: AgentRunCommandErrorCode;
    message?: string;
    turnId?: string | null;
  }): AgentRunCommandRecord | null {
    return this.transitionTerminal({ ...input, state: "FAILED" });
  }

  markRejected(input: {
    runId: string;
    messageId: string;
    code: AgentRunCommandErrorCode;
    message?: string;
  }): AgentRunCommandRecord | null {
    return this.transitionTerminal({ ...input, state: "REJECTED" });
  }

  markCancelled(input: {
    runId: string;
    messageId: string;
  }): AgentRunCommandRecord | null {
    return this.transitionTerminal({
      ...input,
      state: "CANCELLED",
      code: "AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD",
      message: "AgentRun terminated before input forwarding.",
    });
  }

  getRecord(runId: string, messageId: string): AgentRunCommandRecord | null {
    return this.recordsByRunId.get(runId)?.get(messageId) ?? null;
  }

  getOutstandingRecords(runId: string): AgentRunCommandRecord[] {
    return [...(this.recordsByRunId.get(runId)?.values() ?? [])]
      .filter((record) => OUTSTANDING_STATES.has(record.state))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  getPresentedOutstandingRecord(runId: string): AgentRunCommandRecord | null {
    const records = this.getOutstandingRecords(runId);
    return records.find((record) => record.state === "FORWARDED") ?? records[0] ?? null;
  }

  hasOutstandingCommands(runId: string): boolean {
    return this.getOutstandingRecords(runId).length > 0;
  }

  clear(): void { this.recordsByRunId.clear(); }

  private transitionTerminal(input: {
    runId: string;
    messageId: string;
    state: "COMPLETED" | "FAILED" | "REJECTED" | "CANCELLED";
    code?: AgentRunCommandErrorCode;
    message?: string;
    turnId?: string | null;
  }): AgentRunCommandRecord | null {
    return this.updateOutstanding(input.runId, input.messageId, (record) => ({
      ...record,
      state: input.state,
      terminalAt: nowIso(),
      ...(input.code ? { code: input.code } : {}),
      ...(input.message ? { message: input.message } : {}),
      turnId: input.turnId ?? record.turnId,
    }));
  }

  private updateOutstanding(
    runId: string,
    messageId: string,
    mutate: (record: AgentRunCommandRecord) => AgentRunCommandRecord,
  ): AgentRunCommandRecord | null {
    const current = this.getRecord(runId, messageId);
    if (!current || !OUTSTANDING_STATES.has(current.state)) return current;
    const next = { ...mutate(current), updatedAt: nowIso() };
    this.recordsByRunId.get(runId)!.set(messageId, next);
    return next;
  }

  private getRunRecords(runId: string): Map<string, AgentRunCommandRecord> {
    let records = this.recordsByRunId.get(runId);
    if (!records) {
      records = new Map();
      this.recordsByRunId.set(runId, records);
    }
    return records;
  }

  private createRecord(input: {
    runId: string;
    messageId: string;
    dedupeKey: string;
    state: AgentRunCommandState;
  }): AgentRunCommandRecord {
    const now = nowIso();
    return {
      ...input,
      createdAt: now,
      updatedAt: now,
      terminalAt: null,
      turnId: null,
    };
  }

  private purgeExpiredTerminalRecords(): void {
    const cutoff = Date.now() - this.terminalRetentionMs;
    for (const [runId, records] of this.recordsByRunId) {
      for (const [messageId, record] of records) {
        if (
          record.terminalAt &&
          TERMINAL_STATES.has(record.state) &&
          Date.parse(record.terminalAt) <= cutoff
        ) {
          records.delete(messageId);
        }
      }
      if (records.size === 0) this.recordsByRunId.delete(runId);
    }
  }
}

let cachedAgentRunCommandRegistry: AgentRunCommandRegistry | null = null;
export const getAgentRunCommandRegistry = (): AgentRunCommandRegistry => {
  cachedAgentRunCommandRegistry ??= new AgentRunCommandRegistry();
  return cachedAgentRunCommandRegistry;
};
