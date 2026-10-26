import fs from "node:fs";
import path from "node:path";

/** Hand-built raw-trace run folders for memory search: never copied from real user data. */
export type Turn = Readonly<{ day: string; user: string; command?: string; output?: string; agent: string }>;

let counter = 0;

/** Raw records for turns; each turn's records are timed on its day (UTC noon onwards). */
export const turnsToRecords = (turns: readonly Turn[]): Array<Record<string, unknown>> => turns.flatMap((turn, index) => {
  const base = Date.parse(`${turn.day}T12:00:00Z`) / 1000 + index * 60;
  const record = (offset: number, fields: Record<string, unknown>) => {
    counter += 1;
    return { id: `mr_${String(counter).padStart(6, "0")}`, seq: counter, ts: base + offset, turn_id: `turn_${counter}`, ...fields };
  };
  const callId = `call_${counter + 2}`;
  return [
    record(0, { trace_type: "user", content: turn.user }),
    ...(turn.command ? [
      record(1, { trace_type: "tool_call", tool_name: "Bash", tool_call_id: callId, tool_args: { command: turn.command } }),
      record(2, { trace_type: "tool_result", tool_name: "Bash", tool_call_id: callId, tool_result: turn.output ?? "ok" }),
    ] : []),
    record(3, { trace_type: "assistant", content: turn.agent }),
  ];
});

/** Writes a run folder `<memoryDir>/<relPath>` with an active raw-trace file for the turns. */
export const writeRun = (memoryDir: string, relPath: string, turns: readonly Turn[]): string => {
  const runDir = path.join(memoryDir, relPath);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "raw_traces_active.jsonl"), turnsToRecords(turns).map((record) => `${JSON.stringify(record)}\n`).join(""), "utf-8");
  return runDir;
};

export const appendTurns = (runDir: string, turns: readonly Turn[]): void => {
  fs.appendFileSync(path.join(runDir, "raw_traces_active.jsonl"), turnsToRecords(turns).map((record) => `${JSON.stringify(record)}\n`).join(""), "utf-8");
};
