import type { DefaultDistributedRuntimeComposition } from "../../distributed/bootstrap/distributed-runtime-composition-factory.js";

export type TeamRunHistoryRuntimeDependencies = Pick<
  DefaultDistributedRuntimeComposition,
  | "hostNodeId"
  | "nodeDirectoryService"
  | "internalEnvelopeAuth"
  | "transportSecurityMode"
  | "runScopedTeamBindingRegistry"
>;

let runtimeDependencies: TeamRunHistoryRuntimeDependencies | null = null;

export const configureTeamRunHistoryRuntimeDependencies = (
  dependencies: TeamRunHistoryRuntimeDependencies | null,
): void => {
  runtimeDependencies = dependencies;
};

export const getTeamRunHistoryRuntimeDependencies = (): TeamRunHistoryRuntimeDependencies | null =>
  runtimeDependencies;
