import fs from "node:fs/promises";
import path from "node:path";
import { parseTeamExecutionAddress } from "../../legacy/team-execution-address.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamExecutionIndex } from "../../../agent-team-execution/services/team-execution-index.js";
import { object, text } from "./predecessor-team-run-evidence.js";

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const resolveAgentRunId = (
  rawAddress: unknown,
  trees: ReadonlyMap<string, TeamRunExecutionTreeSnapshot>,
): string => {
  const address = parseTeamExecutionAddress(JSON.stringify(object(rawAddress, "entryExecutionAddress")));
  const tree = trees.get(address.rootTeamRunId);
  if (!tree) throw new Error(`External output references unresolved root '${address.rootTeamRunId}'.`);
  const index = new TeamExecutionIndex(tree);
  if (address.taskAgentRunId) {
    const agent = index.requireAgent(address.taskAgentRunId);
    if (agent.address !== address.memberAddress) throw new Error("External task Agent address contradicts the execution tree.");
    return agent.agentRunId;
  }
  if (!address.taskTeamRunIds.length) {
    const configured = index.getConfiguredPlacement(address.memberAddress);
    if (!configured || !("agentRunId" in configured)) throw new Error(`External configured Agent '${address.memberAddress}' was not found.`);
    return configured.agentRunId;
  }
  const candidates = index.listAgentExecutions().filter((agent) => {
    if (agent.address !== address.memberAddress) return false;
    const taskTeamChain = [...index.listContainingTeamAncestorsForAgent(agent.agentRunId)]
      .reverse().filter((team) => team.executionKind === "task").map((team) => team.teamRunId);
    return JSON.stringify(taskTeamChain) === JSON.stringify(address.taskTeamRunIds);
  });
  if (candidates.length !== 1) throw new Error(`External task-Team Agent '${address.memberAddress}' is ambiguous.`);
  return candidates[0]!.agentRunId;
};

export const convertPredecessorExternalOutputDeliveries = async (input: {
  filePath: string;
  backupRoot: string;
  trees: ReadonlyMap<string, TeamRunExecutionTreeSnapshot>;
}): Promise<{ changed: number; backupPath: string | null }> => {
  let raw: unknown;
  try { raw = JSON.parse(await fs.readFile(input.filePath, "utf8")) as unknown; }
  catch (error) {
    if (missing(error)) return { changed: 0, backupPath: null };
    throw error;
  }
  if (!Array.isArray(raw)) throw new Error("External run-output deliveries must be an array.");
  let changed = 0;
  const converted = raw.map((value, index) => {
    const row = structuredClone(object(value, `run-output-deliveries[${index}]`));
    const target = object(row.target, `run-output-deliveries[${index}].target`);
    if (target.targetType !== "TEAM") return row;
    const rootTeamRunId = text(target.teamRunId, `run-output-deliveries[${index}].target.teamRunId`);
    const tree = input.trees.get(rootTeamRunId);
    if (!tree) throw new Error(`External output references unresolved root '${rootTeamRunId}'.`);
    if (typeof target.entryAgentRunId === "string" && target.entryAgentRunId.trim()) {
      if (!new TeamExecutionIndex(tree).getAgent(target.entryAgentRunId.trim())) {
        throw new Error(`External output AgentRun '${target.entryAgentRunId}' is outside root '${rootTeamRunId}'.`);
      }
      return row;
    }
    if (!Object.hasOwn(target, "entryExecutionAddress")) {
      throw new Error(`External Team output '${String(row.deliveryKey)}' lacks exact entry execution evidence.`);
    }
    target.entryAgentRunId = resolveAgentRunId(target.entryExecutionAddress, input.trees);
    delete target.entryExecutionAddress;
    row.target = target;
    changed += 1;
    return row;
  });
  if (!changed) return { changed: 0, backupPath: null };
  await fs.mkdir(input.backupRoot, { recursive: true });
  const token = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(input.backupRoot, `run-output-deliveries.${token}.json`);
  await fs.copyFile(input.filePath, backupPath);
  const tempPath = `${input.filePath}.${process.pid}.${token}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(converted, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, input.filePath);
  return { changed, backupPath };
};
