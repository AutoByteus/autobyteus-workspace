import type { RunScopedTeamBindingRegistry } from "../runtime-binding/run-scoped-team-binding-registry.js";
import type { RunScopedMemberBinding } from "../runtime-binding/run-scoped-member-binding.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-agent-id.js";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeNodeIdForOwnership = (nodeId: string | null | undefined): string | null => {
  const normalized = normalizeOptionalString(nodeId);
  if (!normalized) {
    return null;
  }
  if (normalized === "embedded-local" || normalized === "local") {
    return "embedded-local";
  }
  return normalized;
};

const resolveMemberBinding = (
  memberBindings: RunScopedMemberBinding[],
  targetMemberName: string,
): RunScopedMemberBinding | null => {
  const normalizedTarget = normalizeMemberRouteKey(targetMemberName);
  for (const binding of memberBindings) {
    const bindingRouteKey = normalizeMemberRouteKey(binding.memberRouteKey ?? binding.memberName);
    if (bindingRouteKey === normalizedTarget) {
      return binding;
    }
  }
  return null;
};

export type WorkerMemberDispatchOwnership =
  | "WORKER_OWNS_TARGET_MEMBER"
  | "RUN_BINDING_NOT_FOUND"
  | "TARGET_MEMBER_NOT_BOUND"
  | "TARGET_MEMBER_OWNED_BY_OTHER_NODE";

export const resolveWorkerMemberDispatchOwnership = (input: {
  selfNodeId: string;
  teamRunId: string;
  targetMemberName: string;
  runScopedTeamBindingRegistry: Pick<RunScopedTeamBindingRegistry, "tryResolveRun">;
}): WorkerMemberDispatchOwnership => {
  const runBinding = input.runScopedTeamBindingRegistry.tryResolveRun(input.teamRunId);
  if (!runBinding) {
    return "RUN_BINDING_NOT_FOUND";
  }

  const memberBinding = resolveMemberBinding(runBinding.memberBindings, input.targetMemberName);
  if (!memberBinding) {
    return "TARGET_MEMBER_NOT_BOUND";
  }

  const bindingNodeId = normalizeNodeIdForOwnership(memberBinding.hostNodeId);
  const selfNodeId = normalizeNodeIdForOwnership(input.selfNodeId);
  if (!bindingNodeId || !selfNodeId) {
    return "TARGET_MEMBER_OWNED_BY_OTHER_NODE";
  }
  return bindingNodeId === selfNodeId
    ? "WORKER_OWNS_TARGET_MEMBER"
    : "TARGET_MEMBER_OWNED_BY_OTHER_NODE";
};

export const shouldDispatchToWorkerLocalMember = (input: {
  selfNodeId: string;
  teamRunId: string;
  targetMemberName: string;
  runScopedTeamBindingRegistry: Pick<RunScopedTeamBindingRegistry, "tryResolveRun">;
}): boolean =>
  resolveWorkerMemberDispatchOwnership(input) === "WORKER_OWNS_TARGET_MEMBER";
