import type { ApplicationGraphqlRequest, ApplicationNotificationMessage, ApplicationRequestContext, ApplicationRouteRequest, ApplicationRouteResponse } from "@autobyteus/application-sdk-contracts";
import type { ApplicationClientTransport } from "./application-client-transport.js";
import { createApplicationBackendMountTransport, deriveApplicationBackendMountEndpoints } from "./create-application-backend-mount-transport.js";
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
    query: (queryName: string, input?: unknown) => Promise<unknown>;
    command: (commandName: string, input?: unknown) => Promise<unknown>;
    graphql: (request: ApplicationGraphqlRequest) => Promise<unknown>;
    route: (request: ApplicationRouteRequest) => Promise<ApplicationRouteResponse | unknown>;
    subscribeNotifications: (listener: (message: ApplicationNotificationMessage) => void) => {
        close: () => void;
    };
};
export { createApplicationBackendMountTransport, deriveApplicationBackendMountEndpoints, };
export type { ApplicationBackendMountEndpoints, ApplicationBackendMountTransport, ApplicationBackendMountTransportOptions, ApplicationBackendMountRouteRequest, } from "./create-application-backend-mount-transport.js";
export type { ApplicationClientTransport } from "./application-client-transport.js";
export type { ApplicationGraphqlRequest, ApplicationNotificationMessage, ApplicationRequestContext, ApplicationRouteRequest, ApplicationRouteResponse, } from "@autobyteus/application-sdk-contracts";
//# sourceMappingURL=index.d.ts.map