import type { ApplicationGraphqlRequest, ApplicationNotificationMessage, ApplicationRequestContext, ApplicationRouteRequest, ApplicationRouteResponse } from "@autobyteus/application-sdk-contracts";
import type { ApplicationClientTransport } from "./application-client-transport.js";
import type { ApplicationBackendWebSocketConnectOptions } from "./application-backend-websocket-connection.js";
import type { ApplicationAgentConnectionOptions } from "./application-agent-connection.js";
import type { ApplicationAgentTargetAddress } from "@autobyteus/application-sdk-contracts";
export type ApplicationClientOptions = {
    applicationId: string;
    requestContext?: ApplicationRequestContext | null;
    transport: ApplicationClientTransport;
};
export declare const createApplicationClient: (options: ApplicationClientOptions) => {
    getApplicationInfo: () => {
        applicationId: string;
        requestContext: ApplicationRequestContext | null;
    };
    agentCommunication: {
        connect: (address: ApplicationAgentTargetAddress, connectOptions?: ApplicationAgentConnectionOptions) => import("./application-agent-connection.js").ApplicationAgentConnection;
    };
    notifications: {
        subscribe: (listener: (message: ApplicationNotificationMessage) => void) => {
            close: () => void;
        };
    };
    backend: {
        query: (queryName: string, input?: unknown) => Promise<unknown>;
        command: (commandName: string, input?: unknown) => Promise<unknown>;
        graphql: (request: ApplicationGraphqlRequest) => Promise<unknown>;
        route: (request: ApplicationRouteRequest) => Promise<ApplicationRouteResponse | unknown>;
        connectWebSocket: (path: string, connectOptions?: ApplicationBackendWebSocketConnectOptions) => import("./application-backend-websocket-connection.js").ApplicationBackendWebSocketConnection;
    };
};
export type ApplicationClient = ReturnType<typeof createApplicationClient>;
//# sourceMappingURL=application-client.d.ts.map