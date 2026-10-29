import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Synthesized app data in the shapes the released Skill Improvement feature (and its earlier name, self
 * evolution) left on installs (design Shape Inventory F-1..F-8b). Hand-built, never copied from user data
 * (TESTING.md). `writeFeatureDataRoot` writes the feature data next to unrelated data that must stay byte-identical.
 */

export const IMPROVER_ID = "autobyteus-retrospective-skill-improver";
/** F-5: helper runs of the built-in improver (no `launchPurpose`), each with a history row. */
export const IMPROVER_RUNS = ["retrospective_skill_improver_1111", "retrospective_skill_improver_2222", "retrospective_skill_improver_3333"];
/**
 * F-5b: an improver run launched from a user-chosen improver definition (`launchPurpose: "server_helper"`), with a
 * history row. Only its session file names it (autobyteus-280 REQ-008).
 */
export const SERVER_HELPER_RUN = "helper_run_5555";
/** A v1.4.92-beta.5-era compaction run: also `launchPurpose: "server_helper"`, but not the feature's; it is kept. */
export const COMPACTOR_RUN = "memory_compactor_4444";
/** F-2: runs the self-evolution records name; their folders are absent, one still has a stale history row. */
export const EVOLVER_RUNS = ["skill_evolver_7777", "skill_evolver_8888", "skill_evolver_9999"];
/** Unrelated standalone runs (F-8), some with the per-run session folders of F-3 and F-4. */
export const USER_RUNS = ["daily_assistant_aaaa", "daily_assistant_bbbb", "daily_assistant_cccc", "daily_assistant_dddd", "daily_assistant_eeee", "daily_assistant_ffff"];
/** A delegated copy's own file naming the improver definition: it belongs to its coordinating run and is kept. */
export const IMPROVER_TASK_COPY = "improver_task_copy_6666";

export type FeatureDataPaths = Readonly<{
  /** What the migration deletes, relative to the data root. */
  deleted: readonly string[];
  /** Helper run ids whose history rows the migration removes. */
  removedRows: readonly string[];
}>;

export const put = async (file: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};

const T0 = "2026-07-20T10:00:00.000Z";
const rawTrace = (id: string, text: string) => `${JSON.stringify({ id, turn_id: "turn_1", seq: 1, ts: 1790000000, trace_type: "user", content: text })}\n`;
const runMetadata = (memory: string, runId: string, agentDefinitionId: string, extra: Record<string, unknown> = {}) => ({
  runId, agentDefinitionId, workspaceRootPath: "/work/project", memoryDir: path.join(memory, "agents", runId),
  llmModelIdentifier: "gpt-5", llmConfig: null, autoExecuteTools: false, runtimeKind: "codex_app_server",
  platformAgentRunId: null, startedAt: T0, applicationExecutionContext: null, ...extra,
});
export const historyRow = (runId: string, agentDefinitionId: string, agentName: string) => ({
  runId, agentDefinitionId, agentName, workspaceRootPath: "/work/project", summary: `Run ${runId}`,
  createdAt: T0, archivedAt: null, terminatedAt: null,
});
/** A released improvement / evolution record (only the fields the migration reads, plus a few context fields). */
const record = (idField: string, recordId: string, runIdField: string, runId: string | null) => ({
  [idField]: recordId, status: "completed", requestedAt: T0, completedAt: T0,
  target: { kind: "agent_run", runId: USER_RUNS[0] }, [runIdField]: runId, errors: [],
});

/**
 * A released per-run session state file (`improver_session.json` / `evolver_session.json`): it names the helper
 * runs the session launched, the current one and the earlier ones.
 */
export const session = (runDir: string, dirName: "skill_improvement" | "self_evolution", file: string, runs: { current?: string | null; prior?: string[] } = {}) =>
  put(path.join(runDir, dirName, file), dirName === "skill_improvement"
    ? { target: { kind: "agent_run", runId: path.basename(runDir) }, status: "active", currentImproverRunId: runs.current ?? null,
      priorImproverRunIds: runs.prior ?? [], improverAgentDefinitionId: null, runtimeKind: "codex_app_server", updatedAt: T0 }
    : { schemaVersion: 1, target: { kind: "agent_run", runId: path.basename(runDir) }, status: "replaced", currentEvolverRunId: runs.current ?? null,
      priorEvolverRunIds: runs.prior ?? [], evolverAgentDefinitionId: null, updatedAt: T0 });

/** Writes a standalone run folder: its metadata and a raw trace. */
export const writeRun = async (memory: string, runId: string, agentDefinitionId: string, extra: Record<string, unknown> = {}) => {
  await put(path.join(memory, "agents", runId, "run_metadata.json"), runMetadata(memory, runId, agentDefinitionId, extra));
  await put(path.join(memory, "agents", runId, "raw_traces_active.jsonl"), rawTrace(`rt_${runId}`, `hello from ${runId}`));
};

/** The released feature's data plus unrelated data, under `<root>/memory` and `<root>/agents`. */
export const writeFeatureDataRoot = async (root: string): Promise<FeatureDataPaths> => {
  const memory = path.join(root, "memory");
  const agents = path.join(root, "agents");

  // F-1: the skill-improvement records (index + 4 completed records naming the 3 improver runs).
  const improvementIds = ["impr_01", "impr_02", "impr_03", "impr_04"];
  const improverOf = (index: number) => IMPROVER_RUNS[Math.min(index, IMPROVER_RUNS.length - 1)]!;
  await put(path.join(memory, "skill_improvement", "index.json"), Object.fromEntries(improvementIds.map((id, index) =>
    [id, { improvementRunId: id, status: "completed", target: { kind: "agent_run", runId: USER_RUNS[0] }, requestedAt: T0, completedAt: T0, improverRunId: improverOf(index) }])));
  for (const [index, id] of improvementIds.entries()) {
    await put(path.join(memory, "skill_improvement", "improvement_runs", id, "record.json"), record("improvementRunId", id, "improverRunId", improverOf(index)));
  }
  // F-2: the self-evolution records (index + 3 records naming evolver runs whose folders are absent).
  const evolutionIds = ["evol_01", "evol_02", "evol_03"];
  await put(path.join(memory, "self_evolution", "index.json"), Object.fromEntries(evolutionIds.map((id, index) =>
    [id, { evolutionRunId: id, status: "completed", requestedAt: T0, evolverRunId: EVOLVER_RUNS[index] }])));
  for (const [index, id] of evolutionIds.entries()) {
    await put(path.join(memory, "self_evolution", "evolution_runs", id, "record.json"), record("evolutionRunId", id, "evolverRunId", EVOLVER_RUNS[index]!));
  }

  // F-5 / F-5b: helper runs.
  for (const runId of IMPROVER_RUNS) await writeRun(memory, runId, IMPROVER_ID);
  await writeRun(memory, SERVER_HELPER_RUN, "some-helper-agent", { launchPurpose: "server_helper" });

  // Unrelated runs (F-8); F-3 / F-4: their per-run session folders.
  for (const runId of USER_RUNS) await writeRun(memory, runId, "autobyteus-daily-assistant");
  await session(path.join(memory, "agents", USER_RUNS[0]!), "skill_improvement", "improver_session.json", { current: SERVER_HELPER_RUN, prior: [IMPROVER_RUNS[0]!] });   // F-3
  await session(path.join(memory, "agents", USER_RUNS[1]!), "skill_improvement", "improver_session.json");   // F-3
  await session(path.join(memory, "agents", USER_RUNS[2]!), "self_evolution", "evolver_session.json", { current: EVOLVER_RUNS[1]! });   // F-4
  for (const runId of USER_RUNS.slice(3)) await session(path.join(memory, "agents", runId), "self_evolution", "evolver_session.json");   // F-4 (3 more runs)
  // F-3b: a team member's session folder, next to its raw traces.
  const member = path.join(memory, "agent_teams", "article_team_tttt", "article_writer_mmmm");
  await put(path.join(member, "raw_traces_active.jsonl"), rawTrace("rt_m", "member"));
  await session(member, "skill_improvement", "improver_session.json");
  // A folder named like a session folder without the state file is not the feature's: kept.
  await put(path.join(memory, "agents", USER_RUNS[5]!, "skill_improvement", "notes.md"), "my own notes\n");
  // A delegated copy of the improver: its own file has a `taskAgent` section; it is kept with its coordinating run.
  await writeRun(memory, IMPROVER_TASK_COPY, IMPROVER_ID, { taskAgent: { coordinatingRun: { kind: "agent", runId: USER_RUNS[0] }, address: "/improver" } });

  // The run history index: unrelated rows, the helper rows, and a stale row of an evolver run without a folder.
  await put(path.join(memory, "run_history_index.json"), [
    historyRow(USER_RUNS[0]!, "autobyteus-daily-assistant", "Daily Assistant"),
    ...IMPROVER_RUNS.map((runId) => historyRow(runId, IMPROVER_ID, "Retrospective Skill Improver")),
    historyRow(USER_RUNS[1]!, "autobyteus-daily-assistant", "Daily Assistant"),
    historyRow(SERVER_HELPER_RUN, "some-helper-agent", "Helper"),
    historyRow(EVOLVER_RUNS[0]!, "autobyteus-skill-evolver", "Skill Self-Evolver"),
    { ...historyRow(USER_RUNS[2]!, "autobyteus-daily-assistant", "Daily Assistant"), archivedAt: "2026-08-01T00:00:00.000Z" },
    ...USER_RUNS.slice(3).map((runId) => historyRow(runId, "autobyteus-daily-assistant", "Daily Assistant")),
  ]);

  // F-6: the built-in improver's installed definition; the Skill Self-Evolver and a user agent are kept.
  await put(path.join(agents, IMPROVER_ID, "agent.md"), "---\nname: Retrospective Skill Improver\n---\n\nImprove skills.\n");
  await put(path.join(agents, IMPROVER_ID, "agent-config.json"), { skillNames: ["retrospective-skill-improver"] });
  await put(path.join(agents, IMPROVER_ID, "skills", "retrospective-skill-improver", "SKILL.md"), "# skill\n");
  await put(path.join(agents, "autobyteus-skill-evolver", "agent.md"), "---\nname: Skill Self-Evolver\n---\n\nEvolve.\n");
  await put(path.join(agents, "my-agent", "agent.md"), "---\nname: My Agent\n---\n\nMine.\n");

  // F-8b: a Memory Sync mirror holding the same shapes: never touched.
  const mirror = path.join(memory, "imports", "docker-node-1");
  await put(path.join(mirror, "skill_improvement", "index.json"), { impr_09: { improverRunId: "retrospective_skill_improver_9999" } });
  await put(path.join(mirror, "agents", "retrospective_skill_improver_9999", "run_metadata.json"), runMetadata(mirror, "retrospective_skill_improver_9999", IMPROVER_ID));
  await put(path.join(mirror, "agents", "daily_assistant_zzzz", "self_evolution", "evolver_session.json"), { kept: true });

  return {
    deleted: [
      "memory/skill_improvement",
      "memory/self_evolution",
      ...IMPROVER_RUNS.map((runId) => `memory/agents/${runId}`),
      `memory/agents/${SERVER_HELPER_RUN}`,
      `memory/agents/${USER_RUNS[0]}/skill_improvement`,
      `memory/agents/${USER_RUNS[1]}/skill_improvement`,
      ...USER_RUNS.slice(2).map((runId) => `memory/agents/${runId}/self_evolution`),
      "memory/agent_teams/article_team_tttt/article_writer_mmmm/skill_improvement",
      `agents/${IMPROVER_ID}`,
    ],
    removedRows: [...IMPROVER_RUNS, SERVER_HELPER_RUN, EVOLVER_RUNS[0]!],
  };
};

/** Relative path → sha256 for every file (and `dir` marker for every folder) under `dir`. */
export const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (current: string) => {
    for (const entry of await fs.readdir(current, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full).split(path.sep).join("/");
      if (entry.isSymbolicLink()) out[rel] = `link→${await fs.readlink(full)}`;
      else if (entry.isDirectory()) { out[`${rel}/`] = "dir"; await walk(full); }
      else out[rel] = createHash("sha256").update(await fs.readFile(full)).digest("hex");
    }
  };
  await walk(dir);
  return out;
};

/** The snapshot without everything under the given relative paths (and without those folders themselves). */
export const without = (files: Record<string, string>, removed: readonly string[]): Record<string, string> =>
  Object.fromEntries(Object.entries(files).filter(([rel]) => !removed.some((gone) => rel === `${gone}/` || rel.startsWith(`${gone}/`) || rel === gone)));

/** The history index text a removal leaves: the same serialization as run history's `writeIndex`. */
export const historyIndexWithout = async (memory: string, runIds: readonly string[]): Promise<string> => {
  const rows = JSON.parse(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")) as Array<{ runId: string }>;
  return `${JSON.stringify(rows.filter((row) => !runIds.includes(row.runId)), null, 2)}\n`;
};
