import type { ApplicationBootstrapPayload } from "./application-iframe-contract.js";
export type ApplicationRuntimeBootstrap = {
    contractVersion: "1";
    application: {
        applicationId: string;
        localApplicationId: string;
        packageId: string;
        name: string;
    };
    transport: {
        backendBaseUrl: string;
        backendNotificationsUrl: string | null;
        backendWebSocketBaseUrl: string | null;
        agentCommunicationWebSocketBaseUrl: string | null;
    };
};
export declare const isApplicationRuntimeBootstrap: (value: unknown) => value is ApplicationRuntimeBootstrap;
export declare const normalizeStudioIframeBootstrap: (payload: ApplicationBootstrapPayload) => ApplicationRuntimeBootstrap;
//# sourceMappingURL=application-runtime-bootstrap.d.ts.map