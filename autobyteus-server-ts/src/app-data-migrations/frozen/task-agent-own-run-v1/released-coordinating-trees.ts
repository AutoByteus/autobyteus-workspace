import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../server/agent-memory/store/agent-memory-layout.js";
import type { CollaborationHandoff } from "../server/agent-collaboration/domain/collaboration-handoff.js";
import {
  parseTaskExecutions,
  validateAgentOrgRunExecutionTreePayload,
  validateStandaloneRootTreePayload,
  validateTeamRunExecutionTreePayload,
  type ConfiguredAgentExecutionNode,
  type ConfiguredTeamExecutionNode,
  type TaskExecution,
} from "../released-run-package-shapes/released-trees-before-task-agent-own-run.js";

/**
 * The migration's source side (design D-8): coordinating trees as released before task-agent-own-run,
 * read only through the frozen module. A tree is in the input shape when its non-task structure passes the
 * frozen parser, every task entry is a full record the frozen parser accepts or an already reduced link (a
 * retry may find both), and it holds no collaborator entries.
 */

type Json = Record<string, unknown>;
export type CoordinatingFamily = "agent" | "agent_team" | "agent_org";
/** Released tree writers by what they convert (contract §5.4). */
export type PredecessorRole = "team_tree_v1" | "team_tree_v2" | "org_flat_families" | "collaborators";

/** Which predecessors can still convert a tree of this family whose structure the frozen parser rejects. */
const STRUCTURE_CONVERTERS: Readonly<Record<CoordinatingFamily, readonly PredecessorRole[]>> = Object.freeze({
  agent: [],
  agent_team: ["team_tree_v1", "team_tree_v2", "org_flat_families"],
  agent_org: ["org_flat_families"],
});

export const TREE_FILE_NAMES: Readonly<Record<CoordinatingFamily, string>> = Object.freeze({
  agent: "collaboration_tree.json",
  agent_team: "team_run_execution_tree.json",
  agent_org: "agent_org_run_execution_tree.json",
});

/** One task entry as stored: a full record (to migrate) or a link (already reduced). */
export type ReleasedTaskEntry =
  | Readonly<{ kind: "record"; raw: Json; record: TaskExecution }>
  | Readonly<{ kind: "link"; raw: Json; runId: string }>;

/** One task list of a coordinating tree and the folder its records' memory sits in before the move. */
export type ReleasedTaskList = Readonly<{ key: string; containerDir: string; entries: readonly ReleasedTaskEntry[] }>;

export type ReleasedCoordinatingTree = Readonly<{
  family: CoordinatingFamily;
  runId: string;
  /** The coordinating run's package folder (the current stores' directory argument). */
  dir: string;
  treePath: string;
  raw: Json;
  lists: readonly ReleasedTaskList[];
  configuredPlaces: readonly (ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode)[];
  handoffs: readonly CollaborationHandoff[];
}>;

export type ReleasedTreeRead =
  | Readonly<{ kind: "input"; tree: ReleasedCoordinatingTree }>
  /** `convertibleBy`: the tree-writing predecessors that could still turn this tree into the input shape. */
  | Readonly<{ kind: "not_input"; family: CoordinatingFamily; runId: string; treePath: string; reason: string; convertibleBy: readonly PredecessorRole[] }>
  /** A task agent team's own tree under `agent_teams/`: not a coordinating run. */
  | Readonly<{ kind: "task_agent_team" }>;

const isRecord = (value: unknown): value is Json => !!value && typeof value === "object" && !Array.isArray(value);
const isLink = (entry: Json): boolean => !("platformAgentRunId" in entry) && !("members" in entry);
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

/** The coordinating tree files under one memory root (never `imports/`), by family. */
export const listCoordinatingTreeFiles = async (memoryDir: string): Promise<Array<Readonly<{
  family: CoordinatingFamily; runId: string; dir: string; treePath: string;
}>>> => {
  const layout = new AgentMemoryLayout(memoryDir);
  const roots: Array<[CoordinatingFamily, string]> = [
    ["agent", layout.getStandaloneRootDirPath()], ["agent_team", layout.getTeamRootDirPath()], ["agent_org", layout.getOrgRootDirPath()],
  ];
  const files: Array<Readonly<{ family: CoordinatingFamily; runId: string; dir: string; treePath: string }>> = [];
  for (const [family, root] of roots) {
    const entries = await fs.readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (const entry of entries.filter((item) => item.isDirectory() && !item.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name))) {
      const dir = family === "agent" ? layout.getAgentRunCollaborationDirPath(entry.name) : path.join(root, entry.name);
      const treePath = path.join(dir, TREE_FILE_NAMES[family]);
      if (await fs.access(treePath).then(() => true, () => false)) files.push({ family, runId: entry.name, dir, treePath });
    }
  }
  return files;
};

/** Where each family keeps task lists and collaborators, and which folder holds the lists' memory today. */
const taskListsOf = (family: CoordinatingFamily, raw: Json, dir: string): Array<{ key: string; containerDir: string; entries: unknown[]; container: Json }> => {
  if (family === "agent") return [{ key: "root", containerDir: dir, entries: asArray(raw.taskExecutions), container: raw }];
  const container = family === "agent_team" ? raw.rootTeam : raw.rootOrg;
  if (!isRecord(container)) throw new Error(`${family === "agent_team" ? "rootTeam" : "rootOrg"} must be an object.`);
  const lists = [{ key: "root", containerDir: dir, entries: asArray(container.taskExecutions), container }];
  if (family === "agent_org") {
    for (const member of asArray(container.members)) {
      if (isRecord(member) && typeof member.teamRunId === "string") {
        lists.push({ key: `configured_team:${member.teamRunId}`, containerDir: path.join(dir, member.teamRunId), entries: asArray(member.taskExecutions), container: member });
      }
    }
  }
  return lists;
};

const asArray = (value: unknown): unknown[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("taskExecutions must be an array.");
  return value;
};

/** The tree with every task list emptied, for the frozen parser's check of everything else. */
const withoutTasks = (family: CoordinatingFamily, raw: Json): Json => {
  const copy = structuredClone(raw);
  for (const list of taskListsOf(family, copy, "")) list.container.taskExecutions = [];
  return copy;
};

const validateStructure = (family: CoordinatingFamily, raw: Json, runId: string) => {
  switch (family) {
    case "agent":
      validateStandaloneRootTreePayload(withoutTasks(family, raw), runId);
      return { configuredPlaces: [], handoffs: [] };
    case "agent_team": {
      const tree = validateTeamRunExecutionTreePayload(withoutTasks(family, raw), runId);
      return { configuredPlaces: tree.rootTeam.members, handoffs: tree.handoffs };
    }
    case "agent_org": {
      const tree = validateAgentOrgRunExecutionTreePayload(withoutTasks(family, raw), runId);
      return { configuredPlaces: tree.rootOrg.members, handoffs: tree.handoffs };
    }
  }
};

const hasCollaborators = (container: Json): boolean => Array.isArray(container.collaborators) && container.collaborators.length > 0
  || (container.collaborators !== undefined && !Array.isArray(container.collaborators));

/** Reads one coordinating tree and decides whether it is in the input shape (contract §5.4, §8 step 0). */
export const readReleasedCoordinatingTree = async (file: Readonly<{
  family: CoordinatingFamily; runId: string; dir: string; treePath: string;
}>): Promise<ReleasedTreeRead> => {
  const notInput = (reason: string, convertibleBy: readonly PredecessorRole[]): ReleasedTreeRead =>
    ({ kind: "not_input", family: file.family, runId: file.runId, treePath: file.treePath, reason, convertibleBy });
  let raw: unknown;
  try { raw = JSON.parse(await fs.readFile(file.treePath, "utf8")); }
  catch (error) { return notInput(`The tree cannot be read: ${message(error)}`, []); }
  if (!isRecord(raw)) return notInput("The tree is not a JSON object.", []);
  if (file.family === "agent_team" && "taskAgent" in raw) return { kind: "task_agent_team" };
  try {
    const lists = taskListsOf(file.family, raw, file.dir);
    if (lists.some((list) => hasCollaborators(list.container))) return notInput("The tree still holds collaborator entries.", ["collaborators"]);
    const structure = validateStructure(file.family, raw, file.runId);
    return {
      kind: "input",
      tree: {
        family: file.family, runId: file.runId, dir: file.dir, treePath: file.treePath, raw,
        configuredPlaces: structure.configuredPlaces, handoffs: structure.handoffs,
        lists: lists.map((list) => ({
          key: list.key,
          containerDir: list.containerDir,
          entries: list.entries.map((entry, index): ReleasedTaskEntry => {
            if (!isRecord(entry)) throw new Error(`${list.key}[${index}] must be an object.`);
            if (!isLink(entry)) return { kind: "record", raw: entry, record: parseTaskExecutions([entry], `${list.key}[${index}]`)[0]! };
            const runId = typeof entry.agentRunId === "string" ? entry.agentRunId : entry.teamRunId;
            if (typeof runId !== "string" || typeof entry.address !== "string" || typeof entry.startedAt !== "string") {
              throw new Error(`${list.key}[${index}] is neither a released record nor a link.`);
            }
            return { kind: "link", raw: entry, runId };
          }),
        })),
      },
    };
  } catch (error) {
    return notInput(message(error), STRUCTURE_CONVERTERS[file.family]);
  }
};
