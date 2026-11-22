import fs from "node:fs/promises";
import path from "node:path";
import { AGENT_LOG, ORG_LOG, TEAM_LOG, exists, writeFileAtomic } from "./org-unit-targets.js";

/**
 * The Org's message log split into its units' logs (storage contract §5, §9; CM-9): each line keeps its fields; a line
 * between two members of one Team goes to that Team's log unchanged; a line between two units goes to both units' logs,
 * each recording the other side's Org address (`counterpart`, `nodeId: null`); a line with one party outside the Org goes
 * to the member's unit log unchanged (its `counterpart` as stored). A line no unit has stays only in the Org log, which is
 * then kept as residue (named in the result).
 */
type Json = Record<string, unknown>;

/** Where an agent of the Org lives now: its unit run (and that run's log) and its Org address. */
export type UnitAgent = Readonly<{ unitRunId: string; unitDir: string; logName: typeof TEAM_LOG | typeof AGENT_LOG; orgAddress: string }>;

export type SplitPlan = Readonly<{
  /** Each unit log's lines, in the Org log's order, by unit folder. */
  logs: ReadonlyMap<string, Readonly<{ logName: string; lines: readonly string[] }>>;
  /** Lines no unit has (both parties unknown). */
  unrouted: number;
  lineCount: number;
}>;

const sealedPattern = new RegExp(`^${ORG_LOG}_(\\d{6})\\.jsonl$`);

/** The Org log's files, oldest first: its sealed segments, then its active file. A JSON log (unconverted) is refused. */
export const orgLogFiles = async (orgDir: string): Promise<string[]> => {
  if (await exists(path.join(orgDir, `${ORG_LOG}.json`))) {
    throw new Error(`${ORG_LOG}.json is not converted to an append-only log yet (20261018_append_only_message_logs_v1 has not converted it)`);
  }
  const names = await fs.readdir(orgDir).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return [] as string[]; throw error; });
  const sealed = names.filter((name) => sealedPattern.test(name)).sort();
  const active = names.includes(`${ORG_LOG}_active.jsonl`) ? [`${ORG_LOG}_active.jsonl`] : [];
  return [...sealed, ...active].map((name) => path.join(orgDir, name));
};

/** The Org log's lines (complete lines only; a partial last line is a write that never completed and is not a message). */
const readLines = async (files: readonly string[]): Promise<Json[]> => {
  const lines: Json[] = [];
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const parts = content.split("\n");
    for (const [index, part] of parts.entries()) {
      if (!part.trim() || (index === parts.length - 1 && !content.endsWith("\n"))) continue;
      const value = JSON.parse(part) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value) || typeof (value as Json).messageId !== "string") {
        throw new Error(`${path.basename(file)} line ${index + 1} is not a message`);
      }
      lines.push(value as Json);
    }
  }
  return lines;
};

const encode = (line: Json, counterpart?: Readonly<{ address: string }>): string => `${JSON.stringify({
  messageId: line.messageId, senderAgentRunId: line.senderAgentRunId, receiverAgentRunId: line.receiverAgentRunId, content: line.content,
  messageType: line.messageType, referenceFiles: line.referenceFiles, createdAt: line.createdAt,
  ...(counterpart ? { counterpart: { address: counterpart.address, nodeId: null } }
    : line.counterpart !== undefined ? { counterpart: line.counterpart } : {}),
})}\n`;

export const planLogSplit = async (orgDir: string, agents: ReadonlyMap<string, UnitAgent>): Promise<SplitPlan> => {
  const logs = new Map<string, { logName: string; lines: string[] }>();
  const add = (agent: UnitAgent, line: string) => {
    const log = logs.get(agent.unitDir) ?? { logName: agent.logName, lines: [] };
    log.lines.push(line);
    logs.set(agent.unitDir, log);
  };
  let unrouted = 0;
  const lines = await readLines(await orgLogFiles(orgDir));
  for (const line of lines) {
    const sender = agents.get(String(line.senderAgentRunId));
    const receiver = agents.get(String(line.receiverAgentRunId));
    if (sender && receiver && sender.unitRunId === receiver.unitRunId) { add(receiver, encode(line)); continue; }
    if (sender && receiver) {
      // Receiver first (CM-9's order), one message ID in both.
      add(receiver, encode(line, { address: sender.orgAddress }));
      add(sender, encode(line, { address: receiver.orgAddress }));
      continue;
    }
    const member = receiver ?? sender;
    if (member) { add(member, encode(line)); continue; }
    unrouted += 1;
  }
  return { logs, unrouted, lineCount: lines.length };
};

/** The append-only log's rotation limit (append-only message logs DEC-002), frozen here: an active file is sealed once it holds this many bytes. */
export const UNIT_LOG_ROTATION_LIMIT_BYTES = 4 * 1024 * 1024;

/**
 * One unit log in today's append-only layout (append-only message logs DS-003): lines in order, each sealed file
 * `<base>_<6 digits>.jsonl` closed once it holds at least the rotation limit, the rest in `<base>_active.jsonl` (possibly empty).
 */
export const unitLogFiles = (logName: string, lines: readonly string[], limit = UNIT_LOG_ROTATION_LIMIT_BYTES): Array<Readonly<{ name: string; content: string }>> => {
  const files: Array<{ name: string; content: string }> = [];
  let current: string[] = [];
  let bytes = 0;
  for (const line of lines) {
    current.push(line);
    bytes += Buffer.byteLength(line);
    if (bytes >= limit) {
      files.push({ name: `${logName}_${String(files.length + 1).padStart(6, "0")}.jsonl`, content: current.join("") });
      current = [];
      bytes = 0;
    }
  }
  files.push({ name: `${logName}_active.jsonl`, content: current.join("") });
  return files;
};

/**
 * Writes each unit's log whole, rotated as today's log rotates, replacing what an interrupted earlier attempt left (the
 * split is deterministic: a retry writes the same files with the same content).
 */
export const writeUnitLogs = async (plan: SplitPlan): Promise<void> => {
  for (const [unitDir, log] of plan.logs) {
    for (const file of unitLogFiles(log.logName, log.lines)) await writeFileAtomic(path.join(unitDir, file.name), file.content);
  }
};

/**
 * Removes the Org log once every unit log is written (a container has no log, contract §5). It runs before the container
 * file is written: a retry then finds no Org log, skips the split and keeps the unit logs (the node pass still visits them).
 */
export const removeOrgLog = async (orgDir: string): Promise<void> => {
  for (const file of await orgLogFiles(orgDir)) await fs.rm(file, { force: true });
};
