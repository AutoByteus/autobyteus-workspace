import type { TeamCommandIngressError } from "../ingress/team-command-ingress-service.js";
import type { RemoteMemberExecutionGatewayDependencies } from "../worker-execution/remote-member-execution-gateway.js";
import {
  createDispatchRunBootstrapHandler,
  type CreateDispatchRunBootstrapHandlerDependencies,
} from "./remote-envelope-bootstrap-handler.js";
import {
  createRemoteEnvelopeMessageCommandHandlers,
  type CreateRemoteEnvelopeMessageCommandHandlersDependencies,
} from "./remote-envelope-message-command-handlers.js";
import {
  createRemoteEnvelopeControlCommandHandlers,
  type CreateRemoteEnvelopeControlCommandHandlersDependencies,
} from "./remote-envelope-control-command-handlers.js";
import type { ResolveBoundRuntimeTeam } from "./remote-envelope-command-handler-common.js";

type BootstrapDependenciesSubset = Pick<
  CreateDispatchRunBootstrapHandlerDependencies,
  | "hostNodeId"
  | "teamRunManager"
  | "runScopedTeamBindingRegistry"
  | "teamEventAggregator"
  | "hostNodeBridgeClient"
  | "workerRunLifecycleCoordinator"
  | "resolveWorkerTeamDefinitionId"
  | "ensureHostNodeDirectoryEntryForWorkerRun"
>;

type MessageHandlersDependenciesSubset = Pick<
  CreateRemoteEnvelopeMessageCommandHandlersDependencies,
  "selfNodeId" | "workerRunLifecycleCoordinator" | "runScopedTeamBindingRegistry"
>;

type ControlHandlersDependenciesSubset = Pick<
  CreateRemoteEnvelopeControlCommandHandlersDependencies,
  | "selfNodeId"
  | "teamRunManager"
  | "runScopedTeamBindingRegistry"
  | "teamEventAggregator"
  | "workerRunLifecycleCoordinator"
>;

export type CreateRemoteEnvelopeCommandHandlersDependencies = BootstrapDependenciesSubset &
  MessageHandlersDependenciesSubset &
  ControlHandlersDependenciesSubset & {
    resolveBoundRuntimeTeam: ResolveBoundRuntimeTeam;
    onTeamDispatchUnavailable: (code: string, message: string) => TeamCommandIngressError;
  };

export const createRemoteEnvelopeCommandHandlers = (
  deps: CreateRemoteEnvelopeCommandHandlersDependencies,
): Pick<
  RemoteMemberExecutionGatewayDependencies,
  | "dispatchRunBootstrap"
  | "dispatchUserMessage"
  | "dispatchInterAgentMessage"
  | "dispatchToolApproval"
  | "dispatchControlStop"
> => ({
  dispatchRunBootstrap: createDispatchRunBootstrapHandler(deps),
  ...createRemoteEnvelopeMessageCommandHandlers(deps),
  ...createRemoteEnvelopeControlCommandHandlers(deps),
});
