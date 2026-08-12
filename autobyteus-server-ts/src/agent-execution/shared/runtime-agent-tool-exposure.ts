import { BROWSER_TOOL_NAMES } from "../../agent-tools/browser/browser-tool-contract.js";
import { MEDIA_TOOL_NAMES } from "../../agent-tools/media/media-tool-contract.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAMES,
} from "../../agent-tools/task-delegation/task-delegation-tool-contract.js";
import { PUBLISH_ARTIFACTS_TOOL_NAME } from "../../services/published-artifacts/published-artifact-tool-contract.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../agent-communication/services/send-message-to-tool-contract.js";
import type { MemberTeamContext } from "../../agent-team-execution/domain/member-team-context.js";

export const AUTOMATIC_TEAM_TOOL_NAMES = [
  SEND_MESSAGE_TO_TOOL_NAME,
  DELEGATE_TASK_TOOL_NAME,
] as const;

const asTrimmedToolName = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export type RuntimeAgentToolExposure = {
  requestedToolNames: string[];
  enabledBrowserToolNames: string[];
  enabledMediaToolNames: string[];
  enabledTaskDelegationToolNames: string[];
  sendMessageToEnabled: boolean;
  publishArtifactsEnabled: boolean;
};

export const resolveRuntimeAgentToolExposure = (agentDefinition: {
  toolNames?: string[] | null;
} | null, memberTeamContext?: MemberTeamContext | null): RuntimeAgentToolExposure =>
  buildRuntimeAgentToolExposure(agentDefinition?.toolNames ?? null, memberTeamContext);

export const buildRuntimeAgentToolExposure = (
  toolNames: Iterable<unknown> | null | undefined,
  memberTeamContext?: MemberTeamContext | null,
): RuntimeAgentToolExposure => {
  const normalizedConfiguredNames = Array.from(toolNames ?? [])
    .map((value) => asTrimmedToolName(value))
    .filter((value): value is string => Boolean(value));
  const requestedToolNames = Array.from(new Set([
    ...normalizedConfiguredNames,
    ...(memberTeamContext ? AUTOMATIC_TEAM_TOOL_NAMES : []),
  ]));
  const requestedToolNameSet = new Set(requestedToolNames);

  return {
    requestedToolNames,
    enabledBrowserToolNames: requestedToolNames.filter((toolName) =>
      BROWSER_TOOL_NAMES.has(toolName),
    ),
    enabledMediaToolNames: requestedToolNames.filter((toolName) =>
      MEDIA_TOOL_NAMES.has(toolName),
    ),
    enabledTaskDelegationToolNames: requestedToolNames.filter((toolName) =>
      TASK_DELEGATION_TOOL_NAMES.has(toolName),
    ),
    sendMessageToEnabled: requestedToolNameSet.has(SEND_MESSAGE_TO_TOOL_NAME),
    publishArtifactsEnabled: requestedToolNameSet.has(PUBLISH_ARTIFACTS_TOOL_NAME),
  };
};

export const toRuntimeAgentToolNameSet = (
  exposure: RuntimeAgentToolExposure,
): Set<string> => new Set(exposure.requestedToolNames);
