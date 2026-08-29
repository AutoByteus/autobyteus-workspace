import type {
  ApplicationAgentBinding,
  ApplicationAgentMemberAddress,
  ApplicationAgentTargetAddress,
  ApplicationAgentTeamBinding,
} from "@autobyteus/application-sdk-contracts";
import { parseApplicationAgentMemberAddress } from "@autobyteus/application-sdk-contracts";

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

const requireRootRuntimeSubject = (binding: StructuralBinding): void => {
  if (binding.runtime?.subject === "AGENT_RUN" || binding.runtime?.subject === "TEAM_RUN") return;
  throw new Error("Application agent target address requires an AGENT_RUN or TEAM_RUN binding.");
};

const requireTeamRuntimeSubject = (binding: StructuralBinding): void => {
  if (binding.runtime?.subject === "TEAM_RUN") return;
  throw new Error("Application agent-team target address requires a TEAM_RUN binding.");
};

export const createApplicationAgentTargetAddress = (
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
): ApplicationAgentTargetAddress => {
  const bindingId = requireBindingId(binding);
  requireRootRuntimeSubject(binding);
  return {
    bindingId,
    memberAddress: null,
  };
};

export const createApplicationAgentTeamMemberTargetAddress = (
  binding: ApplicationAgentTeamBinding,
  memberAddress: ApplicationAgentMemberAddress,
): ApplicationAgentTargetAddress => {
  const bindingId = requireBindingId(binding);
  requireTeamRuntimeSubject(binding);

  const normalizedMemberAddress = parseApplicationAgentMemberAddress(memberAddress);
  if (!normalizedMemberAddress) {
    throw new Error("Application agent-team member target requires a canonical memberAddress.");
  }

  const members = Array.isArray(binding.runtime.members) ? binding.runtime.members : [];
  if (!members.some((member) => member?.memberAddress === normalizedMemberAddress)) {
    throw new Error(
      `Application agent-team binding '${bindingId}' does not contain memberAddress '${normalizedMemberAddress}'.`,
    );
  }

  return {
    bindingId,
    memberAddress: normalizedMemberAddress,
  };
};
