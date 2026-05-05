import type { MemberTeamContext } from "../../../../agent-team-execution/domain/member-team-context.js";
import type { ConfiguredAgentToolExposure } from "../../../shared/configured-agent-tool-exposure.js";
import { CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME, CLAUDE_SEND_MESSAGE_TOOL_NAME } from "../claude-send-message-tool-name.js";

const CLAUDE_BROWSER_MCP_TOOL_PREFIX = "mcp__autobyteus_browser__";
const CLAUDE_PUBLISHED_ARTIFACT_MCP_TOOL_NAME =
  "mcp__autobyteus_published_artifacts__publish_artifacts";

export type ClaudeSessionToolingOptions = {
  sendMessageToToolingEnabled: boolean;
  enabledBrowserToolNames: string[];
  publishArtifactsToolingEnabled: boolean;
  allowedTools: string[];
};

export const resolveClaudeSessionToolingOptions = (input: {
  configuredToolExposure: ConfiguredAgentToolExposure;
  hasMaterializedSkills: boolean;
  memberTeamContext: MemberTeamContext | null;
}): ClaudeSessionToolingOptions => {
  const enabledBrowserToolNames = [
    ...input.configuredToolExposure.enabledBrowserToolNames,
  ];
  const sendMessageToToolingEnabled =
    input.configuredToolExposure.sendMessageToConfigured &&
    Boolean(input.memberTeamContext?.sendMessageToEnabled) &&
    (input.memberTeamContext?.allowedRecipientNames ?? []).length > 0;
  const publishArtifactsToolingEnabled =
    input.configuredToolExposure.publishArtifactsConfigured;
  const allowedTools = resolveAllowedToolNames({
    sendMessageToToolingEnabled,
    enabledBrowserToolNames,
    publishArtifactsToolingEnabled,
    hasMaterializedSkills: input.hasMaterializedSkills,
  });

  return {
    sendMessageToToolingEnabled,
    enabledBrowserToolNames,
    publishArtifactsToolingEnabled,
    allowedTools,
  };
};

const resolveAllowedToolNames = (input: {
  sendMessageToToolingEnabled: boolean;
  enabledBrowserToolNames: string[];
  publishArtifactsToolingEnabled: boolean;
  hasMaterializedSkills: boolean;
}): string[] => {
  const allowedTools = new Set<string>();
  if (input.sendMessageToToolingEnabled) {
    allowedTools.add(CLAUDE_SEND_MESSAGE_TOOL_NAME);
    allowedTools.add(CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME);
  }
  if (input.hasMaterializedSkills) {
    allowedTools.add("Skill");
  }
  for (const toolName of input.enabledBrowserToolNames) {
    allowedTools.add(toolName);
    allowedTools.add(`${CLAUDE_BROWSER_MCP_TOOL_PREFIX}${toolName}`);
  }
  if (input.publishArtifactsToolingEnabled) {
    allowedTools.add("publish_artifacts");
    allowedTools.add(CLAUDE_PUBLISHED_ARTIFACT_MCP_TOOL_NAME);
  }
  return [...allowedTools];
};
