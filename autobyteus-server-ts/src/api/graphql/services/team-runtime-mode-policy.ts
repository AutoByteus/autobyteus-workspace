import { DEFAULT_RUNTIME_KIND, type RuntimeKind } from "../../../runtime-management/runtime-kind.js";
import type { TeamRuntimeExecutionMode } from "../../../runtime-execution/runtime-adapter-port.js";
import type { RuntimeAdapterRegistry } from "../../../runtime-execution/runtime-adapter-registry.js";
import type { TeamRuntimeMemberConfig } from "./team-run-mutation-types.js";

const resolveRuntimeExecutionMode = (
  runtimeKind: RuntimeKind,
  runtimeAdapterRegistry: RuntimeAdapterRegistry,
): TeamRuntimeExecutionMode => {
  const adapter = runtimeAdapterRegistry.resolveAdapter(runtimeKind);
  return adapter.teamExecutionMode ?? "member_runtime";
};

export const resolveTeamRuntimeMode = (
  memberConfigs: TeamRuntimeMemberConfig[],
  runtimeAdapterRegistry: RuntimeAdapterRegistry,
): "native_team" | "member_runtime" => {
  const runtimeKinds = new Set<RuntimeKind>(memberConfigs.map((config) => config.runtimeKind));
  if (runtimeKinds.size === 0) {
    return resolveRuntimeExecutionMode(DEFAULT_RUNTIME_KIND, runtimeAdapterRegistry);
  }
  if (runtimeKinds.size > 1) {
    throw new Error(
      "[MIXED_TEAM_RUNTIME_UNSUPPORTED] Team members must use one runtime kind per team run.",
    );
  }
  const runtimeKind = Array.from(runtimeKinds)[0] ?? DEFAULT_RUNTIME_KIND;
  return resolveRuntimeExecutionMode(runtimeKind, runtimeAdapterRegistry);
};
