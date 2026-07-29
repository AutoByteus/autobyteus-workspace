import type {
  ApplicationAgentInput,
  ApplicationRuntimeInput,
  ApplicationRuntimeInputContextFile,
} from "@autobyteus/application-sdk-contracts";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import type { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import {
  selectorFromMemberPath,
  selectorFromMemberRouteKey,
  selectorToRouteKey,
  type TeamMemberSelector,
} from "../../agent-team-execution/domain/team-run-member-identity.js";

const normalizeContextFiles = (
  contextFiles: ApplicationRuntimeInputContextFile[] | null | undefined,
): ContextFile[] =>
  (contextFiles ?? []).map(
    (contextFile) =>
      new ContextFile(
        contextFile.uri,
        (contextFile.fileType ?? undefined) as ContextFileType | undefined,
        contextFile.fileName ?? null,
        contextFile.metadata ?? {},
      ),
  );

export const buildRuntimeInputMessage = (
  input: ApplicationRuntimeInput | ApplicationAgentInput,
): AgentInputUserMessage =>
  new AgentInputUserMessage(
    input.text,
    SenderType.USER,
    normalizeContextFiles(input.contextFiles),
    input.metadata ?? {},
  );

export const buildApplicationRuntimeInputTargetSelector = (
  input: ApplicationRuntimeInput,
): TeamMemberSelector | null => {
  const targetMemberPath = Array.isArray(input.targetMemberPath)
    ? input.targetMemberPath
    : null;
  const targetMemberRouteKey = input.targetMemberRouteKey?.trim() || null;
  if (targetMemberPath && targetMemberPath.length > 0) {
    const pathSelector = selectorFromMemberPath(targetMemberPath);
    if (targetMemberRouteKey) {
      const routeSelector = selectorFromMemberRouteKey(targetMemberRouteKey);
      if (selectorToRouteKey(pathSelector) !== selectorToRouteKey(routeSelector)) {
        throw new Error("targetMemberPath and targetMemberRouteKey refer to different team members.");
      }
    }
    return pathSelector;
  }
  return targetMemberRouteKey ? selectorFromMemberRouteKey(targetMemberRouteKey) : null;
};

export const rejectUnsupportedApplicationAgentInput = (
  input: ApplicationAgentInput,
): void => {
  const allowed = new Set(["text", "contextFiles", "metadata"]);
  const unknown = Object.keys(input as Record<string, unknown>).find(
    (key) => !allowed.has(key),
  );
  if (unknown) {
    throw new Error(`${unknown} is not supported in application agent input.`);
  }
  if (typeof input.text !== "string") {
    throw new Error("Application agent input text must be a string.");
  }
};

export const rejectUnsupportedApplicationRuntimeTargetName = (
  input: ApplicationRuntimeInput,
): void => {
  if (Object.prototype.hasOwnProperty.call(input as Record<string, unknown>, "targetMemberName")) {
    throw new Error("targetMemberName is not supported; use targetMemberRouteKey or targetMemberPath.");
  }
};
