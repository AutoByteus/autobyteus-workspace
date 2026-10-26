import { randomUUID } from 'node:crypto';
import type { AgentBackgroundTaskViewRow } from '../../../domain/agent-background-task-view.js';
import { asObject, type JsonObject } from '../codex-app-server-json.js';

type Identity = { itemId: string; processId: string };
type Command = Identity & {
  originTurnId: string | null;
  background: boolean;
  terminal: boolean;
  row: AgentBackgroundTaskViewRow;
};
type Completion = Identity & {
  turnId: string;
  status: AgentBackgroundTaskViewRow['status'];
  exitCode: number | null;
  observedIdle: boolean;
};
export type CodexBackgroundTerminal = Identity & { description: string };
const id = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value : null;
/** Conflicting explicit native identity is never repaired by the current turn. */
const exactId = (...values: unknown[]): string | null => {
  const supplied = values.filter(value => value !== undefined);
  if (!supplied.length || supplied.some(value => !id(value))) return null;
  return new Set(supplied).size === 1 ? supplied[0] as string : null;
};
const eventTurnId = (params: Readonly<JsonObject>): string | null => {
  const item = asObject(params.item), turn = asObject(params.turn);
  return exactId(params.turnId, params.turn_id, item?.turnId, item?.turn_id, turn?.id);
};
const eventThreadId = (params: Readonly<JsonObject>): string | null => {
  const item = asObject(params.item);
  return exactId(params.threadId, params.thread_id, item?.threadId, item?.thread_id);
};
const keyOf = ({ itemId, processId }: Identity): string => JSON.stringify([itemId, processId]);
const terminalStatus = (status: AgentBackgroundTaskViewRow['status']) =>
  status === 'completed' || status === 'failed' || status === 'stopped';

/** Never retain raw command text, arguments, cwd or output. Uncertain syntax gets a generic label. */
export const safeCodexCommandDescription = (command: unknown): string => {
  if (typeof command !== 'string') return '';
  const leading = command.trimStart().split(/\s/, 1)[0] ?? '';
  if (!/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(leading.replace(/^\//, ''))) return '';
  return leading.split('/').at(-1)?.slice(0, 80) ?? '';
};

/** Validate a complete page before any of it can become authoritative view state. */
export const parseCodexBackgroundTerminalPage = (value: unknown): {
  data: CodexBackgroundTerminal[]; nextCursor: string | null;
} | null => {
  const page = asObject(value);
  if (!page || !Array.isArray(page.data) || (page.nextCursor !== null && !id(page.nextCursor))) return null;
  const data: CodexBackgroundTerminal[] = [];
  for (const raw of page.data) {
    const entry = asObject(raw);
    const itemId = id(entry?.itemId), processId = id(entry?.processId);
    if (!itemId || !processId) return null;
    data.push({ itemId, processId, description: safeCodexCommandDescription(entry?.command) });
  }
  return { data, nextCursor: page.nextCursor as string | null };
};

/** Pure per-thread observation state. CodexThread owns RPCs, deadlines and disposal. */
export class CodexBackgroundTaskView {
  private readonly commands = new Map<string, Command>();
  private readonly pendingCompletions = new Map<string, Completion>();
  private inspecting = false;

  beginInspection(): void { this.inspecting = true; }
  finishInspection(): void {
    this.inspecting = false;
    this.pendingCompletions.clear();
    for (const [key, command] of this.commands) {
      if (command.terminal && !command.background) this.commands.delete(key);
    }
    this.trimTerminalHistory();
  }
  clear(): void { this.commands.clear(); this.pendingCompletions.clear(); this.inspecting = false; }

  observeStarted(threadId: string, params: Readonly<JsonObject>): void {
    const item = asObject(params.item);
    const itemId = exactId(item?.id, params.itemId), processId = exactId(item?.processId, params.processId), turnId = eventTurnId(params);
    if (eventThreadId(params) !== threadId || item?.type !== 'commandExecution' || !itemId || !processId || !turnId) return;
    const key = keyOf({ itemId, processId });
    if (this.commands.has(key)) return;
    this.commands.set(key, {
      itemId, processId, originTurnId: turnId, background: false, terminal: false,
      row: this.newRow(safeCodexCommandDescription(item.command)),
    });
  }

  observeTurnCompleted(threadId: string, params: Readonly<JsonObject>, activeTurnId: string | null): void {
    const turnId = eventTurnId(params);
    if (!turnId || turnId !== activeTurnId || eventThreadId(params) !== threadId) return;
    for (const command of this.commands.values()) {
      if (command.originTurnId === turnId && !command.terminal) command.background = true;
    }
  }

  /** Called before the transcript turn gate, with explicit native identity only. */
  observeCompleted(threadId: string, params: Readonly<JsonObject>, idle: boolean): void {
    const item = asObject(params.item);
    const itemId = exactId(item?.id, params.itemId), processId = exactId(item?.processId, params.processId), turnId = eventTurnId(params);
    if (eventThreadId(params) !== threadId || item?.type !== 'commandExecution' || !itemId || !processId || !turnId) return;
    const exitCode = typeof item.exitCode === 'number' && Number.isInteger(item.exitCode) ? item.exitCode : null;
    const status = item.status === 'completed' && exitCode === 0 ? 'completed'
      : item.status === 'failed' || (exitCode !== null && exitCode !== 0) ? 'failed' : 'unknown';
    const fact: Completion = { itemId, processId, turnId, status, exitCode, observedIdle: idle };
    const key = keyOf(fact), command = this.commands.get(key);
    if (command) {
      if (command.originTurnId && command.originTurnId !== turnId) return;
      this.settle(command, fact);
      if (!command.background && !this.inspecting) this.commands.delete(key);
    } else if (this.inspecting) {
      // Only consumed if this exact identity appears in this thread's pending list.
      if (!this.pendingCompletions.has(key)) this.pendingCompletions.set(key, fact);
    }
    if (!this.inspecting) this.trimTerminalHistory();
  }

  reconcile(entries: CodexBackgroundTerminal[], idle: boolean): AgentBackgroundTaskViewRow[] {
    const present = new Set<string>();
    for (const entry of entries) {
      const key = keyOf(entry);
      present.add(key);
      let command = this.commands.get(key);
      const completion = this.pendingCompletions.get(key);
      if (!command) {
        // Unknown origins are never classified from RPC membership during an active turn.
        if (completion ? !completion.observedIdle : !idle) continue;
        command = {
          itemId: entry.itemId, processId: entry.processId, originTurnId: completion?.turnId ?? null,
          background: true, terminal: false, row: this.newRow(entry.description),
        };
        this.commands.set(key, command);
      }
      if (completion && (!command.originTurnId || command.originTurnId === completion.turnId)) this.settle(command, completion);
      if (!command.terminal) command.row.status = 'running';
    }
    for (const [key, command] of this.commands) {
      if (command.background && !command.terminal && !present.has(key)) command.row.status = 'unknown';
    }
    this.trimTerminalHistory();
    return [...this.commands.values()].filter(command => command.background)
      .map(command => ({ ...command.row })).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  private settle(command: Command, fact: Completion): void {
    if (command.terminal) return;
    command.originTurnId ??= fact.turnId;
    command.terminal = true;
    command.row.status = fact.status;
    command.row.exitCode = fact.exitCode;
  }
  private newRow(description: string): AgentBackgroundTaskViewRow {
    return { taskId: randomUUID(), kind: 'shell', description, command: null, status: 'running', exitCode: null, startedAt: new Date().toISOString() };
  }
  private trimTerminalHistory(): void {
    const terminal = [...this.commands.entries()].filter(([, command]) => command.background && terminalStatus(command.row.status));
    for (const [key] of terminal.slice(0, Math.max(0, terminal.length - 100))) this.commands.delete(key);
  }
}
