import type {
  ApplicationBackendExposureSummary,
  ApplicationExecutionEventEnvelope,
  ApplicationPublishedArtifactEvent,
  ApplicationGraphqlRequest,
  ApplicationRequestContext,
  ApplicationRouteRequest,
  ApplicationAgentBindingListFilter,
  ApplicationAgentInput,
  ApplicationAgentTargetAddress,
  ApplicationAgentEvent,
  ApplicationAgentEventStreamError,
  ApplicationAgentEventStreamClose,
  ApplicationWebSocketRequest,
  ApplicationExecutionResourceKind,
  ApplicationExecutionResourceSource,
  ApplicationStartAgentInput,
  ApplicationStartAgentTeamInput,
  ApplicationStorageContext,
  ApplicationAgentToolCaller,
  ApplicationAgentToolResult,
} from "@autobyteus/application-sdk-contracts";

export const APPLICATION_ENGINE_NOTIFICATION_METHOD = "application.notification" as const;
export const APPLICATION_ENGINE_METHOD_LOAD_DEFINITION = "loadApplicationDefinition" as const;
export const APPLICATION_ENGINE_METHOD_GET_STATUS = "getApplicationStatus" as const;
export const APPLICATION_ENGINE_METHOD_INVOKE_QUERY = "invokeApplicationQuery" as const;
export const APPLICATION_ENGINE_METHOD_INVOKE_COMMAND = "invokeApplicationCommand" as const;
export const APPLICATION_ENGINE_METHOD_ROUTE_REQUEST = "routeApplicationRequest" as const;
export const APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL = "executeApplicationGraphql" as const;
export const APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER = "invokeApplicationEventHandler" as const;
export const APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER = "invokeApplicationArtifactHandler" as const;
export const APPLICATION_ENGINE_METHOD_INVOKE_AGENT_TOOL = "invokeApplicationAgentTool" as const;
export const APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY = "invokeContextCapability" as const;
export const APPLICATION_ENGINE_METHOD_OPEN_WEBSOCKET = "openApplicationWebSocket" as const;
export const APPLICATION_ENGINE_METHOD_WEBSOCKET_MESSAGE = "deliverApplicationWebSocketMessage" as const;
export const APPLICATION_ENGINE_METHOD_CLOSE_WEBSOCKET = "closeApplicationWebSocket" as const;
export const APPLICATION_ENGINE_METHOD_WEBSOCKET_ACTION = "invokeApplicationWebSocketAction" as const;
export const APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_EVENT = "application.agentStream.event" as const;
export const APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_ERROR = "application.agentStream.error" as const;
export const APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_CLOSED = "application.agentStream.closed" as const;
export const APPLICATION_ENGINE_METHOD_STOP = "stopApplication" as const;

export type ApplicationWorkerLoadDefinitionInput = {
  applicationId: string;
  entryModulePath: string;
  supportedExposures: ApplicationBackendExposureSummary["supportedExposures"];
  storage: ApplicationStorageContext;
  declaredAgentToolNames: string[];
};

export type ApplicationWorkerLoadDefinitionResult = {
  exposures: ApplicationBackendExposureSummary;
};

export type ApplicationWorkerInvokeQueryInput = {
  queryName: string;
  requestContext: ApplicationRequestContext | null;
  input: unknown;
};

export type ApplicationWorkerInvokeCommandInput = {
  commandName: string;
  requestContext: ApplicationRequestContext | null;
  input: unknown;
};

export type ApplicationWorkerRouteRequestInput = {
  requestContext: ApplicationRequestContext | null;
  request: ApplicationRouteRequest;
};

export type ApplicationWorkerExecuteGraphqlInput = {
  requestContext: ApplicationRequestContext | null;
  request: ApplicationGraphqlRequest;
};

export type ApplicationWorkerInvokeEventHandlerInput = {
  envelope: ApplicationExecutionEventEnvelope;
};

export type ApplicationWorkerInvokeArtifactHandlerInput = {
  event: ApplicationPublishedArtifactEvent;
};

export type ApplicationWorkerInvokeAgentToolInput = {
  toolName: string;
  arguments: Record<string, unknown>;
  caller: ApplicationAgentToolCaller;
};

export type ApplicationWorkerInvokeAgentToolResult = ApplicationAgentToolResult;

export type ApplicationWorkerContextCapabilityInput =
  | { capability: "agentExecution"; operation: "startAgent"; input: ApplicationStartAgentInput }
  | { capability: "agentExecution"; operation: "startAgentTeam"; input: ApplicationStartAgentTeamInput }
  | {
      capability: "agentExecution";
      operation: "sendInput";
      input: {
        address: ApplicationAgentTargetAddress;
        input: ApplicationAgentInput;
      };
    }
  | {
      capability: "agentExecution";
      operation: "subscribeEventStream";
      input: { subscriptionId: string; address: ApplicationAgentTargetAddress };
    }
  | {
      capability: "agentExecution";
      operation: "unsubscribeEventStream";
      input: { subscriptionId: string; reason: "UNSUBSCRIBED" | "ABORTED" };
    }
  | { capability: "agentExecution"; operation: "terminate"; input: { bindingId: string } }
  | { capability: "agentExecution"; operation: "get"; input: { bindingId: string } }
  | { capability: "agentExecution"; operation: "list"; input: ApplicationAgentBindingListFilter | null }
  | { capability: "agentExecution"; operation: "findByLaunchRequestId"; input: { launchRequestId: string } }
  | {
      capability: "agentResources";
      operation: "listAvailable";
      input: {
        source?: ApplicationExecutionResourceSource | null;
        kind?: ApplicationExecutionResourceKind | null;
      } | null;
    }
  | { capability: "agentResources"; operation: "requireRunnable"; input: { slotKey: string } }
  | { capability: "publishedArtifacts"; operation: "list"; input: { runId: string } }
  | {
      capability: "publishedArtifacts";
      operation: "readRevision";
      input: {
        runId: string;
        revisionId: string;
      };
    };

export type ApplicationWorkerNotificationParams = {
  topic: string;
  payload: unknown;
  publishedAt: string;
};

export type ApplicationWorkerStatusResult = {
  exposures: ApplicationBackendExposureSummary | null;
};

export type ApplicationExecutionEventDispatchResult = {
  status: "acknowledged" | "missing_handler";
};

export type ApplicationWebSocketIpcFrame =
  | { kind: "text"; text: string }
  | { kind: "binary"; dataBase64: string };

export type ApplicationWorkerOpenWebSocketInput = {
  sessionId: string;
  request: ApplicationWebSocketRequest;
};

export type ApplicationWorkerWebSocketMessageInput = {
  sessionId: string;
  frame: ApplicationWebSocketIpcFrame;
};

export type ApplicationWorkerCloseWebSocketInput = {
  sessionId: string;
  code: number;
  reason: string;
};

export type ApplicationWorkerWebSocketActionInput =
  | { action: "send"; sessionId: string; frame: ApplicationWebSocketIpcFrame }
  | { action: "close"; sessionId: string; code: number; reason: string };

export type ApplicationAgentStreamWorkerNotification =
  | { method: typeof APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_EVENT; params: { subscriptionId: string; event: ApplicationAgentEvent } }
  | { method: typeof APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_ERROR; params: { subscriptionId: string; error: ApplicationAgentEventStreamError } }
  | { method: typeof APPLICATION_ENGINE_NOTIFICATION_AGENT_STREAM_CLOSED; params: { subscriptionId: string; close: ApplicationAgentEventStreamClose } };
