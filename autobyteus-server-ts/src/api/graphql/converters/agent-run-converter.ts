import type { Agent } from "autobyteus-ts/agent/agent.js";
import { WorkspaceConverter } from "./workspace-converter.js";
import { WorkspaceInfo } from "../types/workspace.js";
import { AgentRun } from "../types/agent-run.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

type AgentLike = Agent & {
  context?: {
    config?: { name?: string; role?: string };
    workspace?: unknown | null;
    customData?: Record<string, unknown>;
    currentStatus?: unknown;
  };
  currentStatus?: unknown;
};

export class AgentRunConverter {
  static async toGraphql(domainAgent: AgentLike): Promise<AgentRun> {
    try {
      const workspace = domainAgent.context?.workspace;
      const workspaceInfo: WorkspaceInfo | null = workspace
        ? await WorkspaceConverter.toGraphql(workspace as any)
        : null;

      const status = domainAgent.currentStatus ?? domainAgent.context?.currentStatus;

      return {
        id: domainAgent.agentId,
        name: domainAgent.context?.config?.name ?? "unknown",
        role: domainAgent.context?.config?.role ?? "unknown",
        currentStatus: typeof status === "string" ? status : String(status ?? "unknown"),
        workspace: workspaceInfo,
        agentDefinitionId:
          (domainAgent.context?.customData?.agent_definition_id as string | undefined) ?? null,
      };
    } catch (error) {
      logger.error(
        `Failed to convert Agent to GraphQL type for ID ${domainAgent.agentId}: ${String(error)}`,
      );
      throw new Error(`Failed to convert Agent to GraphQL type: ${String(error)}`);
    }
  }
}
