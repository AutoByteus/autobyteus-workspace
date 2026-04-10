import { generateReadableAgentId } from "autobyteus-ts/agent/factory/agent-id.js";

export const generateStandaloneAgentRunId = (
  agentName: string | null | undefined,
  agentRole: string | null | undefined,
): string => generateReadableAgentId(agentName, agentRole);
