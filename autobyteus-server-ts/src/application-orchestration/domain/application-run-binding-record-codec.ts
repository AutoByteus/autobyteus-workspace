import {
  parseApplicationAgentMemberAddress,
  type ApplicationAgentBindingStatus,
  type ApplicationAgentTeamBindingMember,
  type ApplicationExecutionResourceRef,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationAgentBindingRecord } from "./models.js";

const STATUSES = new Set<ApplicationAgentBindingStatus>([
  "ATTACHED", "TERMINATING", "TERMINATED", "FAILED", "ORPHANED",
]);

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const string = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
};

const nullableString = (value: unknown, label: string): string | null => {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${label} must be a string or null.`);
  return value.trim() || null;
};

const resourceRef = (value: unknown): ApplicationExecutionResourceRef => {
  const input = record(value, "Application execution resource reference");
  if ((input.source !== "bundle" && input.source !== "shared") ||
      (input.kind !== "AGENT" && input.kind !== "AGENT_TEAM")) {
    throw new Error("Application execution resource reference source or kind is invalid.");
  }
  return input.source === "bundle"
    ? Object.freeze({ source: "bundle", kind: input.kind, localId: string(input.localId, "Application execution resource localId") })
    : Object.freeze({ source: "shared", kind: input.kind, definitionId: string(input.definitionId, "Application execution resource definitionId") });
};

const member = (value: unknown): ApplicationAgentTeamBindingMember => {
  const input = record(value, "Application Agent Team binding member");
  const memberAddress = parseApplicationAgentMemberAddress(input.memberAddress);
  if (!memberAddress) throw new Error("Application Agent Team binding memberAddress is invalid.");
  return Object.freeze({
    memberAddress,
    displayName: string(input.displayName, "Application Agent Team binding member displayName"),
    agentRunId: string(input.agentRunId, "Application Agent Team binding member agentRunId"),
  });
};

export class ApplicationRunBindingRecordCodec {
  static decode(value: unknown): ApplicationAgentBindingRecord {
    const input = record(value, "Application run binding record");
    const status = input.status;
    if (typeof status !== "string" || !STATUSES.has(status as ApplicationAgentBindingStatus)) {
      throw new Error("Application run binding status is invalid.");
    }
    const runtime = record(input.runtime, "Application run binding runtime");
    const common = {
      bindingId: string(input.bindingId, "Application run binding bindingId"),
      applicationId: string(input.applicationId, "Application run binding applicationId"),
      launchRequestId: string(input.launchRequestId, "Application run binding launchRequestId"),
      status: status as ApplicationAgentBindingStatus,
      executionResourceRef: resourceRef(input.executionResourceRef),
      createdAt: string(input.createdAt, "Application run binding createdAt"),
      updatedAt: string(input.updatedAt, "Application run binding updatedAt"),
      terminatedAt: nullableString(input.terminatedAt, "Application run binding terminatedAt"),
      lastErrorMessage: nullableString(input.lastErrorMessage, "Application run binding lastErrorMessage"),
    };
    if (runtime.subject === "AGENT_RUN") {
      if (!Array.isArray(runtime.members) || runtime.members.length !== 0) {
        throw new Error("Application Agent binding members must be empty.");
      }
      return Object.freeze({
        ...common,
        runtime: Object.freeze({
          subject: "AGENT_RUN" as const,
          agentRunId: string(runtime.agentRunId, "Application Agent binding agentRunId"),
          definitionId: string(runtime.definitionId, "Application Agent binding definitionId"),
          members: Object.freeze([]) as [],
        }),
      });
    }
    if (runtime.subject !== "TEAM_RUN" || !Array.isArray(runtime.members)) {
      throw new Error("Application run binding runtime subject or members are invalid.");
    }
    const members = runtime.members.map(member);
    const addresses = new Set(members.map((entry) => entry.memberAddress));
    const runIds = new Set(members.map((entry) => entry.agentRunId));
    if (addresses.size !== members.length || runIds.size !== members.length) {
      throw new Error("Application Agent Team binding members must have unique addresses and Agent run IDs.");
    }
    return Object.freeze({
      ...common,
      runtime: Object.freeze({
        subject: "TEAM_RUN" as const,
        teamRunId: string(runtime.teamRunId, "Application Agent Team binding teamRunId"),
        definitionId: string(runtime.definitionId, "Application Agent Team binding definitionId"),
        members: Object.freeze(members) as ApplicationAgentTeamBindingMember[],
      }),
    });
  }
}
