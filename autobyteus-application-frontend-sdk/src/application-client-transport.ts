import type {
  ApplicationGraphqlRequest,
  ApplicationNotificationMessage,
  ApplicationRequestContext,
  ApplicationRouteRequest,
  ApplicationRouteResponse,
  ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationAgentConnection,
  ApplicationAgentConnectionOptions,
} from "./application-agent-connection.js";
import type {
  ApplicationBackendWebSocketConnection,
  ApplicationBackendWebSocketConnectOptions,
} from "./application-backend-websocket-connection.js";

export type ApplicationClientTransport = {
  connectAgentCommunication: (
    address: ApplicationAgentTargetAddress,
    options?: ApplicationAgentConnectionOptions,
  ) => ApplicationAgentConnection;
  invokeQuery: (args: {
    applicationId: string;
    queryName: string;
    requestContext: ApplicationRequestContext | null;
    input: unknown;
  }) => Promise<unknown>;
  invokeCommand: (args: {
    applicationId: string;
    commandName: string;
    requestContext: ApplicationRequestContext | null;
    input: unknown;
  }) => Promise<unknown>;
  executeGraphql: (args: {
    applicationId: string;
    requestContext: ApplicationRequestContext | null;
    request: ApplicationGraphqlRequest;
  }) => Promise<unknown>;
  invokeRoute?: (args: {
    applicationId: string;
    requestContext: ApplicationRequestContext | null;
    request: ApplicationRouteRequest;
  }) => Promise<ApplicationRouteResponse | unknown>;
  subscribeNotifications?: (
    args: {
      applicationId: string;
      listener: (message: ApplicationNotificationMessage) => void;
    },
  ) => { close: () => void };
  connectWebSocket?: (
    path: string,
    options?: ApplicationBackendWebSocketConnectOptions,
  ) => ApplicationBackendWebSocketConnection;
};
