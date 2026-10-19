import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOrgRunExecutionTreeFile } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { StandaloneRootTreeFile } from "../../standalone-agent-run-root/domain/standalone-root-tree.js";
import type { ConfiguredExecutionNode, TaskExecution } from "../domain/run-execution-tree-shared-records.js";
import { objectRecord, requiredArray, requiredString } from "./run-execution-tree-shared-record-schemas.js";
import type { CoordinatingTreeShape } from "./task-execution-tree-split.js";

/** Where each coordinating tree family keeps its task executions, own parts and configured places (D-1). */

const ROOT = "root";
const configuredTeamKey = (teamRunId: string): string => `configured_team:${teamRunId}`;

const field = (raw: Record<string, unknown>, key: string): Record<string, unknown> => objectRecord(raw[key], key);
const list = (value: unknown, label: string): readonly unknown[] => value === undefined ? [] : requiredArray(value, label);
const runIds = (members: readonly unknown[], label: string): string[] =>
  members.map((member, index) => requiredString(objectRecord(member, `${label}[${index}]`).agentRunId, `${label}[${index}].agentRunId`));

export const TEAM_RUN_TREE_SHAPE: CoordinatingTreeShape<TeamRunExecutionTreeFile> = Object.freeze({
  coordinatingRun: (tree) => ({ kind: "agent_team", runId: tree.rootTeam.teamRunId }),
  coordinatingRunOfRaw: (raw) => ({ kind: "agent_team", runId: requiredString(field(raw, "rootTeam").teamRunId, "rootTeam.teamRunId") }),
  taskLists: (tree) => new Map([[ROOT, tree.rootTeam.taskExecutions]]),
  rawTaskLists: (raw) => new Map([[ROOT, list(field(raw, "rootTeam").taskExecutions, "rootTeam.taskExecutions")]]),
  withRawTaskLists: (raw, lists) => ({ ...raw, rootTeam: { ...field(raw, "rootTeam"), taskExecutions: lists.get(ROOT) ?? [] } }),
  ownAgentRunIdsOfRaw: (raw) => runIds(list(field(raw, "rootTeam").members, "rootTeam.members"), "rootTeam.members"),
  resolvePlace: (tree) => (address) => tree.rootTeam.members.find((member) => member.address === address) ?? null,
  handoffs: (tree) => tree.handoffs,
});

const orgPlace = (members: readonly ConfiguredExecutionNode[], address: AgentTeamAddress): ConfiguredExecutionNode | null => {
  for (const member of members) {
    if (member.address === address) return member;
    if ("teamRunId" in member) {
      const agent = member.members.find((candidate) => candidate.address === address);
      if (agent) return agent;
    }
  }
  return null;
};

export const AGENT_ORG_RUN_TREE_SHAPE: CoordinatingTreeShape<AgentOrgRunExecutionTreeFile> = Object.freeze({
  coordinatingRun: (tree) => ({ kind: "agent_org", runId: tree.rootOrg.orgRunId }),
  coordinatingRunOfRaw: (raw) => ({ kind: "agent_org", runId: requiredString(field(raw, "rootOrg").orgRunId, "rootOrg.orgRunId") }),
  taskLists: (tree) => {
    const lists = new Map<string, readonly TaskExecution[]>([[ROOT, tree.rootOrg.taskExecutions]]);
    for (const member of tree.rootOrg.members) {
      if ("teamRunId" in member) lists.set(configuredTeamKey(member.teamRunId), member.taskExecutions);
    }
    return lists;
  },
  rawTaskLists: (raw) => {
    const rootOrg = field(raw, "rootOrg");
    const lists = new Map<string, readonly unknown[]>([[ROOT, list(rootOrg.taskExecutions, "rootOrg.taskExecutions")]]);
    list(rootOrg.members, "rootOrg.members").forEach((value, index) => {
      const member = objectRecord(value, `rootOrg.members[${index}]`);
      if (typeof member.teamRunId === "string") {
        lists.set(configuredTeamKey(member.teamRunId), list(member.taskExecutions, `rootOrg.members[${index}].taskExecutions`));
      }
    });
    return lists;
  },
  withRawTaskLists: (raw, lists) => {
    const rootOrg = field(raw, "rootOrg");
    const members = list(rootOrg.members, "rootOrg.members").map((value) => {
      const member = objectRecord(value, "rootOrg.members[]");
      return typeof member.teamRunId === "string"
        ? { ...member, taskExecutions: lists.get(configuredTeamKey(member.teamRunId)) ?? [] }
        : member;
    });
    return { ...raw, rootOrg: { ...rootOrg, members, taskExecutions: lists.get(ROOT) ?? [] } };
  },
  ownAgentRunIdsOfRaw: (raw) => list(field(raw, "rootOrg").members, "rootOrg.members").flatMap((value, index) => {
    const member = objectRecord(value, `rootOrg.members[${index}]`);
    return typeof member.agentRunId === "string"
      ? [member.agentRunId]
      : runIds(list(member.members, `rootOrg.members[${index}].members`), `rootOrg.members[${index}].members`);
  }),
  resolvePlace: (tree) => (address) => orgPlace(tree.rootOrg.members, address),
  handoffs: (tree) => tree.handoffs,
});

/** An Agent root has no configured places: every task agent of a standalone run is a catalog copy. */
export const STANDALONE_ROOT_TREE_SHAPE: CoordinatingTreeShape<StandaloneRootTreeFile> = Object.freeze({
  coordinatingRun: (tree) => ({ kind: "agent", runId: tree.host.agentRunId }),
  coordinatingRunOfRaw: (raw) => ({ kind: "agent", runId: requiredString(field(raw, "host").agentRunId, "host.agentRunId") }),
  taskLists: (tree) => new Map([[ROOT, tree.taskExecutions]]),
  rawTaskLists: (raw) => new Map([[ROOT, list(raw.taskExecutions, "taskExecutions")]]),
  withRawTaskLists: (raw, lists) => ({ ...raw, taskExecutions: lists.get(ROOT) ?? [] }),
  ownAgentRunIdsOfRaw: (raw) => [requiredString(field(raw, "host").agentRunId, "host.agentRunId")],
  resolvePlace: () => () => null,
  handoffs: () => [],
});
