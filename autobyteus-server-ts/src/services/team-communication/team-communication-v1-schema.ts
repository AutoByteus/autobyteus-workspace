import {
  validateCollaborationCommunicationMessageArrayV1,
} from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1-schema.js";
import type { TeamCommunicationMessagesFileV1 } from "./team-communication-v1-types.js";

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Team communication messages must be an object.");
  return value as Record<string, unknown>;
};
const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value || value !== value.trim()) throw new Error(`${label} must be a non-empty trimmed string.`);
  return value;
};
export const validateTeamCommunicationMessagesV1Payload = (
  value: unknown,
  expectedRootTeamRunId?: string,
): TeamCommunicationMessagesFileV1 => {
  const payload = record(value);
  const actual = Object.keys(payload).sort();
  const expected = ["messages", "rootTeamRunId", "schemaVersion"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("Team communication messages has unsupported or missing field(s).");
  }
  if (payload.schemaVersion !== 1) throw new Error("Team communication schemaVersion must be 1.");
  const rootTeamRunId = required(payload.rootTeamRunId, "rootTeamRunId");
  if (expectedRootTeamRunId && rootTeamRunId !== expectedRootTeamRunId) {
    throw new Error(`Communication root '${rootTeamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  return Object.freeze({
    schemaVersion: 1,
    rootTeamRunId,
    messages: validateCollaborationCommunicationMessageArrayV1(payload.messages),
  });
};
