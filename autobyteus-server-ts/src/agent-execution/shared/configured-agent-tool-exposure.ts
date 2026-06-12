import { BROWSER_TOOL_NAMES } from "../../agent-tools/browser/browser-tool-contract.js";
import { MEDIA_TOOL_NAMES } from "../../agent-tools/media/media-tool-contract.js";
import { TASK_DELEGATION_TOOL_NAMES } from "../../agent-tools/task-delegation/task-delegation-tool-contract.js";
import { PUBLISH_ARTIFACTS_TOOL_NAME } from "../../services/published-artifacts/published-artifact-tool-contract.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../agent-communication/services/send-message-to-tool-contract.js";

const asTrimmedToolName = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export type ConfiguredAgentToolExposure = {
  configuredToolNames: string[];
  enabledBrowserToolNames: string[];
  enabledMediaToolNames: string[];
  enabledTaskDelegationToolNames: string[];
  sendMessageToConfigured: boolean;
  publishArtifactsConfigured: boolean;
};

export const resolveConfiguredAgentToolExposure = (agentDefinition: {
  toolNames?: string[] | null;
} | null): ConfiguredAgentToolExposure =>
  buildConfiguredAgentToolExposure(agentDefinition?.toolNames ?? null);

export const buildConfiguredAgentToolExposure = (
  toolNames: Iterable<unknown> | null | undefined,
): ConfiguredAgentToolExposure => {
  const configuredToolNames = Array.from(toolNames ?? [])
    .map((value) => asTrimmedToolName(value))
    .filter((value): value is string => Boolean(value));
  const configuredToolNameSet = new Set(configuredToolNames);

  return {
    configuredToolNames,
    enabledBrowserToolNames: configuredToolNames.filter((toolName) =>
      BROWSER_TOOL_NAMES.has(toolName),
    ),
    enabledMediaToolNames: configuredToolNames.filter((toolName) =>
      MEDIA_TOOL_NAMES.has(toolName),
    ),
    enabledTaskDelegationToolNames: configuredToolNames.filter((toolName) =>
      TASK_DELEGATION_TOOL_NAMES.has(toolName),
    ),
    sendMessageToConfigured: configuredToolNameSet.has(SEND_MESSAGE_TO_TOOL_NAME),
    publishArtifactsConfigured: configuredToolNameSet.has(PUBLISH_ARTIFACTS_TOOL_NAME),
  };
};

export const toConfiguredAgentToolNameSet = (
  exposure: ConfiguredAgentToolExposure,
): Set<string> => new Set(exposure.configuredToolNames);
