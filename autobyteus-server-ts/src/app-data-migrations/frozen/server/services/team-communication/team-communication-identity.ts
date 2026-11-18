import { createHash } from "node:crypto";
import { normalizeAgentRunFilePathDisplay } from "../../agent-execution/domain/agent-run-file-path-identity.js";

const normalizeIdentityPart = (value: string | null | undefined): string =>
  (value ?? "").trim();

export const normalizeTeamCommunicationReferencePath = (value: string): string =>
  normalizeAgentRunFilePathDisplay(value);

export const buildTeamCommunicationReferenceId = (input: {
  teamRunId: string;
  messageId: string;
  path: string;
}): string => {
  const hashInput = [
    normalizeIdentityPart(input.teamRunId),
    normalizeIdentityPart(input.messageId),
    normalizeTeamCommunicationReferencePath(input.path),
  ].join("\0");
  return `teamref_${createHash("sha256").update(hashInput).digest("base64url").slice(0, 32)}`;
};
