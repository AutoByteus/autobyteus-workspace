import type { MemberExecutionContext } from "../../../../agent-collaboration/execution/domain/member-execution-context.js";
import { PUBLISH_ARTIFACTS_TOOL_NAME } from "../../../../services/published-artifacts/published-artifact-tool-contract.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import { GET_HANDOFF_RULES_TOOL_NAME } from "../../../../agent-communication/services/get-handoff-rules-tool-contract.js";
import { LIST_AVAILABLE_AGENTS_TOOL_NAME } from "../../../../agent-tools/agent-discovery/list-available-agents-contract.js";
import type { RuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import { buildClaudeAgentToolsMcpToolName } from "../agent-tools-mcp/claude-agent-tools-mcp-tool-name.js";

export type ClaudeSessionToolingOptions = {
  sendMessageToToolingEnabled: boolean;
  getHandoffRulesToolingEnabled: boolean;
  enabledBrowserToolNames: string[];
  enabledMediaToolNames: string[];
  enabledTaskDelegationToolNames: string[];
  enabledProjectTaskToolNames: string[];
  taskDelegationToolingEnabled: boolean;
  publishArtifactsToolingEnabled: boolean;
  listAvailableAgentsToolingEnabled: boolean;
  agentToolsMcpToolingRequested: boolean;
  agentToolsMcpEnabledToolNames: string[];
  allowedTools: string[];
};

export const resolveClaudeSessionToolingOptions = (input: {
  runtimeToolExposure: RuntimeAgentToolExposure;
  hasMaterializedSkills: boolean;
  memberExecutionContext: MemberExecutionContext | null;
  agentToolsMcpEnabledToolNames?: Iterable<string> | null;
}): ClaudeSessionToolingOptions => {
  const enabledBrowserToolNames = [
    ...input.runtimeToolExposure.enabledBrowserToolNames,
  ];
  const enabledMediaToolNames = [
    ...input.runtimeToolExposure.enabledMediaToolNames,
  ];
  const enabledProjectTaskToolNames = [...input.runtimeToolExposure.enabledProjectTaskToolNames];
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
    Boolean(input.memberExecutionContext) && enabledTaskDelegationToolNames.length > 0;
  const listAvailableAgentsToolingEnabled = input.runtimeToolExposure.listAvailableAgentsEnabled
    && Boolean(input.memberExecutionContext?.collaboration.listAvailableAgents);
  const configuredAgentToolsMcpToolNames = collectConfiguredAgentToolsMcpToolNames({
    sendMessageToToolingEnabled,
    getHandoffRulesToolingEnabled,
    enabledBrowserToolNames,
    enabledMediaToolNames,
    enabledTaskDelegationToolNames,
    enabledProjectTaskToolNames,
    taskDelegationToolingEnabled,
    publishArtifactsToolingEnabled,
    listAvailableAgentsToolingEnabled,
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
    enabledProjectTaskToolNames,
    taskDelegationToolingEnabled,
    publishArtifactsToolingEnabled,
    listAvailableAgentsToolingEnabled,
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
  enabledProjectTaskToolNames: string[];
  taskDelegationToolingEnabled: boolean;
  publishArtifactsToolingEnabled: boolean;
  listAvailableAgentsToolingEnabled: boolean;
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
  for (const name of input.enabledProjectTaskToolNames) toolNames.add(name);
  if (input.taskDelegationToolingEnabled) {
    for (const toolName of input.enabledTaskDelegationToolNames) {
      toolNames.add(toolName);
    }
  }
  if (input.publishArtifactsToolingEnabled) {
    toolNames.add(PUBLISH_ARTIFACTS_TOOL_NAME);
  }
  if (input.listAvailableAgentsToolingEnabled) {
    toolNames.add(LIST_AVAILABLE_AGENTS_TOOL_NAME);
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
