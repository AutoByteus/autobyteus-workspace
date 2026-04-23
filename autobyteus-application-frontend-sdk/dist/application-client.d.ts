import type { ApplicationGraphqlRequest, ApplicationNotificationMessage, ApplicationRequestContext, ApplicationRouteRequest, ApplicationRouteResponse } from "@autobyteus/application-sdk-contracts";
import type { ApplicationClientTransport } from "./application-client-transport.js";
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
export type ApplicationClient = ReturnType<typeof createApplicationClient>;
//# sourceMappingURL=application-client.d.ts.map