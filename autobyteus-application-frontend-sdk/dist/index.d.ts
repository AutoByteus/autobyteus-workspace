import type { ApplicationGraphqlRequest, ApplicationNotificationMessage, ApplicationRequestContext } from "@autobyteus/application-sdk-contracts";
export type ApplicationClientTransport = {
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
    subscribeNotifications?: (args: {
        applicationId: string;
        listener: (message: ApplicationNotificationMessage) => void;
    }) => {
        close: () => void;
    };
};
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
    subscribeNotifications: (listener: (message: ApplicationNotificationMessage) => void) => {
        close: () => void;
    };
};
export type { ApplicationGraphqlRequest, ApplicationNotificationMessage, ApplicationRequestContext, } from "@autobyteus/application-sdk-contracts";
//# sourceMappingURL=index.d.ts.map