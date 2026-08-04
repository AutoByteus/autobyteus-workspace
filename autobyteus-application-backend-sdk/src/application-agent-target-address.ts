import type {
  ApplicationAgentBinding,
  ApplicationAgentTargetAddress,
  ApplicationAgentTeamBinding,
} from "@autobyteus/application-sdk-contracts";

type StructuralBinding = {
  bindingId?: unknown;
  runtime?: {
    subject?: unknown;
    members?: unknown;
  };
};

const requireBindingId = (binding: StructuralBinding | null | undefined): string => {
  const bindingId = typeof binding?.bindingId === "string" ? binding.bindingId.trim() : "";
  if (!bindingId) {
    throw new Error("Application agent target address requires binding.bindingId.");
  }
  return bindingId;
};

const requireRuntimeSubject = (
  binding: StructuralBinding,
  expectedSubject: "AGENT_RUN" | "TEAM_RUN",
): void => {
  if (binding.runtime?.subject === expectedSubject) return;
  if (expectedSubject === "AGENT_RUN") {
    throw new Error("Application agent target address requires an AGENT_RUN binding.");
  }
  throw new Error("Application agent-team target address requires a TEAM_RUN binding.");
};

export const createApplicationAgentTargetAddress = (
  binding: ApplicationAgentBinding,
): ApplicationAgentTargetAddress => {
  const bindingId = requireBindingId(binding);
  requireRuntimeSubject(binding, "AGENT_RUN");
  return {
    bindingId,
    target: { kind: "AGENT_RUN" },
  };
};

export const createApplicationAgentTeamTargetAddress = (
  binding: ApplicationAgentTeamBinding,
): ApplicationAgentTargetAddress => {
  const bindingId = requireBindingId(binding);
  requireRuntimeSubject(binding, "TEAM_RUN");
  return {
    bindingId,
    target: { kind: "AGENT_TEAM_RUN" },
  };
};

export const createApplicationAgentTeamMemberTargetAddress = (
  binding: ApplicationAgentTeamBinding,
  memberAddress: string,
): ApplicationAgentTargetAddress => {
  const bindingId = requireBindingId(binding);
  requireRuntimeSubject(binding, "TEAM_RUN");

  const normalizedMemberAddress = typeof memberAddress === "string" ? memberAddress.trim() : "";
  if (!normalizedMemberAddress.startsWith("/")) {
    throw new Error("Application agent-team member target requires canonical memberAddress.");
  }

  const members = Array.isArray(binding.runtime.members) ? binding.runtime.members : [];
  if (!members.some((member) => member?.memberAddress === normalizedMemberAddress)) {
    throw new Error(
      `Application agent-team binding '${bindingId}' does not contain memberAddress '${normalizedMemberAddress}'.`,
    );
  }

  return {
    bindingId,
    target: {
      kind: "AGENT_TEAM_MEMBER",
      memberAddress: normalizedMemberAddress,
    },
  };
};
