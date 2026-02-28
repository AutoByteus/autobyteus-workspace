import type { Agent } from "autobyteus-ts/agent/agent.js";
import { WorkspaceInfo } from "../types/workspace.js";
import { AgentRun } from "../types/agent-run.js";
import { TempWorkspace } from "../../../workspaces/temp-workspace.js";
import {
  canonicalizeWorkspaceRootPath,
  workspaceDisplayNameFromRootPath,
} from "../../../run-history/utils/workspace-path-normalizer.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

type AgentLike = Agent & {
  context?: {
    config?: { name?: string; role?: string };
    workspaceRootPath?: string | null;
    customData?: Record<string, unknown>;
    currentStatus?: unknown;
  };
  currentStatus?: unknown;
};

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toWorkspaceInfo = (domainAgent: AgentLike): WorkspaceInfo | null => {
  const customData = domainAgent.context?.customData ?? {};
  const workspaceRootPath =
    asNonEmptyString(domainAgent.context?.workspaceRootPath) ??
    asNonEmptyString(customData.workspace_root_path);
  if (!workspaceRootPath) {
    return null;
  }

  let normalizedRootPath = workspaceRootPath;
  try {
    normalizedRootPath = canonicalizeWorkspaceRootPath(workspaceRootPath);
  } catch {
    // Keep original path string when canonicalization fails unexpectedly.
  }

  const workspaceId =
    asNonEmptyString(customData.workspace_id) ?? `root:${normalizedRootPath}`;
  const workspaceName =
    asNonEmptyString(customData.workspace_name) ??
    workspaceDisplayNameFromRootPath(normalizedRootPath);
  const isTempFlag = customData.workspace_is_temp;
  const isTemp =
    typeof isTempFlag === "boolean"
      ? isTempFlag
      : workspaceId === TempWorkspace.TEMP_WORKSPACE_ID;

  return {
    workspaceId,
    name: workspaceName,
    config: { rootPath: normalizedRootPath },
    fileExplorer: null,
    absolutePath: normalizedRootPath,
    isTemp,
  };
};

export class AgentRunConverter {
  static async toGraphql(domainAgent: AgentLike): Promise<AgentRun> {
    // autobyteus-ts runtime exposes the run identifier as `agentId`.
    const agentRunId = domainAgent.agentId;
    try {
      const workspaceInfo: WorkspaceInfo | null = toWorkspaceInfo(domainAgent);

      const status = domainAgent.currentStatus ?? domainAgent.context?.currentStatus;

      return {
        id: agentRunId,
        name: domainAgent.context?.config?.name ?? "unknown",
        role: domainAgent.context?.config?.role ?? "unknown",
        currentStatus: typeof status === "string" ? status : String(status ?? "unknown"),
        workspace: workspaceInfo,
        agentDefinitionId:
          (domainAgent.context?.customData?.agent_definition_id as string | undefined) ?? null,
      };
    } catch (error) {
      logger.error(
        `Failed to convert Agent to GraphQL type for run ID ${agentRunId}: ${String(error)}`,
      );
      throw new Error(`Failed to convert Agent to GraphQL type: ${String(error)}`);
    }
  }
}
