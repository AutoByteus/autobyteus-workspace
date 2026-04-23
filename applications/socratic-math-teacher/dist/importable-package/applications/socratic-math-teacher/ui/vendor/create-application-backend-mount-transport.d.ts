import type { ApplicationRequestContext, ApplicationRouteMethod, ApplicationRouteRequest, ApplicationRouteResponse } from "./application-sdk-contracts/index.js";
import type { ApplicationClientTransport } from "./application-client-transport.js";
type FetchHeaders = Record<string, string>;
type FetchResponse = {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
    headers?: {
        get?: (name: string) => string | null;
    };
};
type FetchLike = (input: string, init?: {
    method?: string;
    headers?: FetchHeaders;
    body?: unknown;
}) => Promise<FetchResponse>;
type NotificationSocket = {
    addEventListener?: (type: string, handler: (event: {
        data?: unknown;
    }) => void) => void;
    close: () => void;
};
type NotificationSocketFactory = (url: string) => NotificationSocket;
export type ApplicationBackendMountRouteRequest = {
    method: ApplicationRouteMethod;
    path: string;
    headers?: Record<string, string> | null;
    query?: Record<string, string | string[] | null | undefined> | null;
    body?: unknown;
};
export type ApplicationBackendMountTransport = ApplicationClientTransport & {
    invokeRoute: (args: {
        applicationId: string;
        requestContext: ApplicationRequestContext | null;
        request: ApplicationRouteRequest;
    }) => Promise<ApplicationRouteResponse | unknown>;
};
export type ApplicationBackendMountTransportOptions = {
    backendBaseUrl: string;
    backendNotificationsUrl?: string | null;
    fetchImpl?: FetchLike;
    webSocketFactory?: NotificationSocketFactory;
};
export type ApplicationBackendMountEndpoints = {
    backendBaseUrl: string;
    queriesBaseUrl: string;
    commandsBaseUrl: string;
    graphqlUrl: string;
    routesBaseUrl: string;
};
export declare const deriveApplicationBackendMountEndpoints: (backendBaseUrl: string) => ApplicationBackendMountEndpoints;
export declare const createApplicationBackendMountTransport: (options: ApplicationBackendMountTransportOptions) => ApplicationBackendMountTransport;
export {};
//# sourceMappingURL=create-application-backend-mount-transport.d.ts.map