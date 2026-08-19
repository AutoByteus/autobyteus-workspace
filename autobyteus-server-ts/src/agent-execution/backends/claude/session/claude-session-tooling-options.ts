import type { MemberTeamContext } from "../../../../agent-team-execution/domain/member-team-context.js";
import { PUBLISH_ARTIFACTS_TOOL_NAME } from "../../../../services/published-artifacts/published-artifact-tool-contract.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import { GET_HANDOFF_RULES_TOOL_NAME } from "../../../../agent-communication/services/get-handoff-rules-tool-contract.js";
import type { RuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import { buildClaudeAgentToolsMcpToolName } from "../agent-tools-mcp/claude-agent-tools-mcp-tool-name.js";

export type ClaudeSessionToolingOptions = {
  sendMessageToToolingEnabled: boolean;
  getHandoffRulesToolingEnabled: boolean;
  enabledBrowserToolNames: string[];
  enabledMediaToolNames: string[];
  enabledTaskDelegationToolNames: string[];
  taskDelegationToolingEnabled: boolean;
  publishArtifactsToolingEnabled: boolean;
  agentToolsMcpToolingRequested: boolean;
  agentToolsMcpEnabledToolNames: string[];
  allowedTools: string[];
};

export const resolveClaudeSessionToolingOptions = (input: {
  runtimeToolExposure: RuntimeAgentToolExposure;
  hasMaterializedSkills: boolean;
  memberTeamContext: MemberTeamContext | null;
  agentToolsMcpEnabledToolNames?: Iterable<string> | null;
}): ClaudeSessionToolingOptions => {
  const enabledBrowserToolNames = [
    ...input.runtimeToolExposure.enabledBrowserToolNames,
  ];
  const enabledMediaToolNames = [
    ...input.runtimeToolExposure.enabledMediaToolNames,
  ];
  const enabledTaskDelegationToolNames = [
    ...input.runtimeToolExposure.enabledTaskDelegationToolNames,
  ];
  const sendMessageToToolingEnabled =
    input.runtimeToolExposure.sendMessageToEnabled;
  const getHandoffRulesToolingEnabled =
    input.runtimeToolExposure.getHandoffRulesEnabled;
  const publishArtifactsToolingEnabled =
    input.runtimeToolExposure.publishArtifactsEnabled;
  const taskDelegationToolingEnabled =
    Boolean(input.memberTeamContext) && enabledTaskDelegationToolNames.length > 0;
  const configuredAgentToolsMcpToolNames = collectConfiguredAgentToolsMcpToolNames({
    sendMessageToToolingEnabled,
    getHandoffRulesToolingEnabled,
    enabledBrowserToolNames,
    enabledMediaToolNames,
    enabledTaskDelegationToolNames,
    taskDelegationToolingEnabled,
    publishArtifactsToolingEnabled,
  });
  const agentToolsMcpEnabledToolNames = normalizeToolNames(
    input.agentToolsMcpEnabledToolNames ?? configuredAgentToolsMcpToolNames,
  );
  const allowedTools = resolveAllowedToolNames({
    agentToolsMcpEnabledToolNames,
    hasMaterializedSkills: input.hasMaterializedSkills,
  });

  return {
    sendMessageToToolingEnabled,
    getHandoffRulesToolingEnabled,
    enabledBrowserToolNames,
    enabledMediaToolNames,
    enabledTaskDelegationToolNames,
    taskDelegationToolingEnabled,
    publishArtifactsToolingEnabled,
    agentToolsMcpToolingRequested: agentToolsMcpEnabledToolNames.length > 0,
    agentToolsMcpEnabledToolNames,
    allowedTools,
  };
};

const collectConfiguredAgentToolsMcpToolNames = (input: {
  sendMessageToToolingEnabled: boolean;
  getHandoffRulesToolingEnabled: boolean;
  enabledBrowserToolNames: string[];
  enabledMediaToolNames: string[];
  enabledTaskDelegationToolNames: string[];
  taskDelegationToolingEnabled: boolean;
  publishArtifactsToolingEnabled: boolean;
}): string[] => {
  const toolNames = new Set<string>();
  if (input.sendMessageToToolingEnabled) {
    toolNames.add(SEND_MESSAGE_TO_TOOL_NAME);
  }
  if (input.getHandoffRulesToolingEnabled) {
    toolNames.add(GET_HANDOFF_RULES_TOOL_NAME);
  }
  for (const toolName of input.enabledBrowserToolNames) {
    toolNames.add(toolName);
  }
  for (const toolName of input.enabledMediaToolNames) {
    toolNames.add(toolName);
  }
  if (input.taskDelegationToolingEnabled) {
    for (const toolName of input.enabledTaskDelegationToolNames) {
      toolNames.add(toolName);
    }
  }
  if (input.publishArtifactsToolingEnabled) {
    toolNames.add(PUBLISH_ARTIFACTS_TOOL_NAME);
  }
  return [...toolNames];
};

const normalizeToolNames = (toolNames: Iterable<string> | null | undefined): string[] => [
  ...new Set(
    Array.from(toolNames ?? [])
      .map((toolName) => toolName.trim())
      .filter(Boolean),
  ),
];

const resolveAllowedToolNames = (input: {
  agentToolsMcpEnabledToolNames: string[];
  hasMaterializedSkills: boolean;
}): string[] => {
  const allowedTools = new Set<string>();
  if (input.hasMaterializedSkills) {
    allowedTools.add("Skill");
  }
  for (const toolName of input.agentToolsMcpEnabledToolNames) {
    allowedTools.add(toolName);
    allowedTools.add(buildClaudeAgentToolsMcpToolName(toolName));
  }
  return [...allowedTools];
};
