import { createAgentTeamAddress, type AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamExecutionIndex } from "../../../agent-team-execution/services/team-execution-index.js";
import type {
  TeamCommunicationMessageV1,
  TeamCommunicationMessagesSnapshot,
} from "../../../services/team-communication/team-communication-v1-types.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../services/team-communication/team-communication-v1-schema.js";
import { normalizePredecessorTeamExecutionAddress } from "./predecessor-team-execution-address-normalizer.js";
import {
  addressKey,
  array,
  object,
  referencePaths,
  text,
  type TokenExecutionEvidence,
} from "./predecessor-team-run-evidence.js";

const optionalText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const aliased = (
  row: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
  label: string,
): unknown => {
  const camel = row[camelKey];
  const snake = row[snakeKey];
  if (
    camel !== undefined
    && camel !== null
    && snake !== undefined
    && snake !== null
    && JSON.stringify(camel) !== JSON.stringify(snake)
  ) {
    throw new Error(`${label}.${camelKey} contradicts ${label}.${snakeKey}.`);
  }
  return camel ?? snake;
};

const timestamp = (value: unknown, label: string): string => {
  const raw = text(value, label);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} is not a valid timestamp.`);
  return parsed.toISOString();
};

const corroboratingAddress = (
  row: Record<string, unknown>,
  prefix: "sender" | "receiver",
  label: string,
): AgentTeamAddress | null => {
  const rawPath = aliased(
    row,
    `${prefix}MemberPath`,
    `${prefix}_member_path`,
    label,
  );
  const rawRoute = aliased(
    row,
    `${prefix}MemberRouteKey`,
    `${prefix}_member_route_key`,
    label,
  );
  const path = rawPath === undefined || rawPath === null
    ? null
    : Array.isArray(rawPath)
      ? rawPath.map((entry, index) => text(entry, `${label}.${prefix}MemberPath[${index}]`))
      : (() => { throw new Error(`${label}.${prefix}MemberPath must be an array.`); })();
  const route = optionalText(rawRoute)?.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "") ?? null;
  if (path && route && path.join("/") !== route) {
    throw new Error(`${label}.${prefix} member route/path corroboration contradicts.`);
  }
  const segments = path ?? route?.split("/").filter(Boolean) ?? [];
  return segments.length ? createAgentTeamAddress(segments) : null;
};

const resolveAddress = (
  raw: unknown,
  rootTeamRunId: string,
  label: string,
  index: TeamExecutionIndex,
  evidence: ReadonlyMap<string, TokenExecutionEvidence>,
): string => {
  const address = normalizePredecessorTeamExecutionAddress(raw, rootTeamRunId, label);
  if (address.taskAgentRunId) {
    const agent = index.requireAgent(address.taskAgentRunId);
    if (agent.address !== address.memberAddress) {
      throw new Error(`${label} task Agent address contradicts the execution tree.`);
    }
    return agent.agentRunId;
  }
  if (!address.taskTeamRunIds.length) {
    const configured = index.getConfiguredPlacement(address.memberAddress);
    if (!configured || !("agentRunId" in configured)) {
      throw new Error(`${label} configured Agent '${address.memberAddress}' was not found.`);
    }
    return configured.agentRunId;
  }
  const token = evidence.get(addressKey(address));
  if (!token) throw new Error(`${label} task-Team Agent lacks exact run evidence.`);
  const agent = index.requireAgent(token.runId);
  if (agent.address !== address.memberAddress) {
    throw new Error(`${label} token evidence contradicts the execution tree.`);
  }
  return agent.agentRunId;
};

const resolveOlderParticipant = (
  row: Record<string, unknown>,
  prefix: "sender" | "receiver",
  label: string,
  index: TeamExecutionIndex,
): string => {
  const runId = text(
    aliased(row, `${prefix}RunId`, `${prefix}_run_id`, label),
    `${label}.${prefix}RunId`,
  );
  const matches = index.listAgentExecutions().filter((agent) => agent.agentRunId === runId);
  if (matches.length !== 1) {
    throw new Error(`${label}.${prefix}RunId '${runId}' does not resolve uniquely in this TeamRun.`);
  }
  const corroboration = corroboratingAddress(row, prefix, label);
  if (corroboration && matches[0]!.address !== corroboration) {
    throw new Error(`${label}.${prefix} route/path corroboration contradicts AgentRun '${runId}'.`);
  }
  return runId;
};

/** Converts either released communication projection directly to V1 in memory. */
export const convertPredecessorTeamCommunication = (input: {
  rootTeamRunId: string;
  tree: TeamRunExecutionTreeSnapshot;
  communicationFile: unknown | null;
  evidence: ReadonlyMap<string, TokenExecutionEvidence>;
}): TeamCommunicationMessagesSnapshot => {
  const file = input.communicationFile
    ? object(input.communicationFile, "Communication records")
    : null;
  const fileTeamRunId = file ? optionalText(file.teamRunId) : null;
  if (fileTeamRunId && fileTeamRunId !== input.rootTeamRunId) {
    throw new Error(
      `Communication records teamRunId '${fileTeamRunId}' does not match '${input.rootTeamRunId}'.`,
    );
  }
  const rawMessages = file
    ? array(file.messages, "Communication records.messages")
    : [];
  const index = new TeamExecutionIndex(input.tree);
  const messages: TeamCommunicationMessageV1[] = rawMessages.map((raw, position) => {
    const label = `messages[${position}]`;
    const row = object(raw, label);
    const senderAddress = aliased(row, "senderAddress", "sender_address", label);
    const receiverAddress = aliased(row, "receiverAddress", "receiver_address", label);
    const hasAddressProjection = senderAddress !== undefined || receiverAddress !== undefined;
    const senderAgentRunId = hasAddressProjection
      ? resolveAddress(
        senderAddress,
        input.rootTeamRunId,
        `${label}.senderAddress`,
        index,
        input.evidence,
      )
      : resolveOlderParticipant(row, "sender", label, index);
    const receiverAgentRunId = hasAddressProjection
      ? resolveAddress(
        receiverAddress,
        input.rootTeamRunId,
        `${label}.receiverAddress`,
        index,
        input.evidence,
      )
      : resolveOlderParticipant(row, "receiver", label, index);
    return Object.freeze({
      messageId: text(row.messageId ?? row.message_id, `${label}.messageId`),
      senderAgentRunId,
      receiverAgentRunId,
      content: typeof row.content === "string" ? row.content : "",
      messageType: optionalText(row.messageType ?? row.message_type) ?? "agent_message",
      referenceFiles: referencePaths(
        row.referenceFiles
          ?? row.reference_files
          ?? row.referenceFileEntries
          ?? row.reference_file_entries,
      ),
      createdAt: timestamp(
        row.createdAt ?? row.created_at ?? row.updatedAt ?? row.updated_at,
        `${label}.createdAt`,
      ),
    });
  });
  return validateTeamCommunicationMessagesV1Payload({
    schemaVersion: 1,
    rootTeamRunId: input.rootTeamRunId,
    messages,
  }, input.rootTeamRunId);
};
