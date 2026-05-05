import { BROWSER_TOOL_NAMES } from "../../agent-tools/browser/browser-tool-contract.js";
import { PUBLISH_ARTIFACTS_TOOL_NAME } from "../../services/published-artifacts/published-artifact-tool-contract.js";

const SEND_MESSAGE_TO_TOOL_NAME = "send_message_to";

const asTrimmedToolName = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export type ConfiguredAgentToolExposure = {
  configuredToolNames: string[];
  enabledBrowserToolNames: string[];
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
    sendMessageToConfigured: configuredToolNameSet.has(SEND_MESSAGE_TO_TOOL_NAME),
    publishArtifactsConfigured: configuredToolNameSet.has(PUBLISH_ARTIFACTS_TOOL_NAME),
  };
};

export const toConfiguredAgentToolNameSet = (
  exposure: ConfiguredAgentToolExposure,
): Set<string> => new Set(exposure.configuredToolNames);
