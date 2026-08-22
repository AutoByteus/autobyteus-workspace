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
  assertAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";

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
): AgentTeamAddress | null => input.targetMemberAddress?.trim()
  ? assertAgentTeamAddress(input.targetMemberAddress)
  : null;

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
  const record = input as Record<string, unknown>;
  const unsupported = ["targetMemberName", "targetMemberRouteKey", "targetMemberPath"]
    .find((key) => Object.prototype.hasOwnProperty.call(record, key));
  if (unsupported) {
    throw new Error(`${unsupported} is not supported; use targetMemberAddress.`);
  }
};
