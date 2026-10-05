export declare const APPLICATION_IFRAME_CHANNEL: "autobyteus.application.host";
export declare const APPLICATION_IFRAME_CONTRACT_VERSION: "4";
export declare const APPLICATION_IFRAME_READY_EVENT: "autobyteus.application.ui.ready";
export declare const APPLICATION_IFRAME_BOOTSTRAP_EVENT: "autobyteus.application.host.bootstrap";
export declare const APPLICATION_IFRAME_QUERY_CONTRACT_VERSION: "autobyteusContractVersion";
export declare const APPLICATION_IFRAME_QUERY_APPLICATION_ID: "autobyteusApplicationId";
export declare const APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID: "autobyteusIframeLaunchId";
export declare const APPLICATION_IFRAME_QUERY_HOST_ORIGIN: "autobyteusHostOrigin";
type UnknownRecord = Record<string, unknown>;
export type ApplicationHostTransport = {
    backendBaseUrl: string | null;
    backendNotificationsUrl: string | null;
    backendWebSocketBaseUrl: string | null;
    agentCommunicationWebSocketBaseUrl: string | null;
};
export type ApplicationIframeLaunchHints = {
    contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION;
    applicationId: string;
    iframeLaunchId: string;
    hostOrigin: string;
};
export type ApplicationIframeEnvelope<TPayload extends UnknownRecord = UnknownRecord> = {
    channel: typeof APPLICATION_IFRAME_CHANNEL;
    contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION;
    eventName: string;
    payload: TPayload;
};
export type ApplicationUiReadyPayload = {
    applicationId: string;
    iframeLaunchId: string;
};
export type ApplicationIframeReadySignal = ApplicationUiReadyPayload & {
    iframeOrigin: string;
};
export type ApplicationUiReadyEnvelope = ApplicationIframeEnvelope<ApplicationUiReadyPayload> & {
    eventName: typeof APPLICATION_IFRAME_READY_EVENT;
};
export type ApplicationBootstrapPayload = {
    host: {
        origin: string;
    };
    application: {
        applicationId: string;
        localApplicationId: string;
        packageId: string;
        name: string;
    };
    iframeLaunchId: string;
    requestContext: {
        applicationId: string;
    };
    transport: ApplicationHostTransport;
};
export type ApplicationHostBootstrapEnvelope = ApplicationIframeEnvelope<ApplicationBootstrapPayload> & {
    eventName: typeof APPLICATION_IFRAME_BOOTSTRAP_EVENT;
};
export declare const normalizeApplicationHostOrigin: (origin: string | null | undefined, protocol?: string | null) => string;
export declare const doesApplicationHostOriginMatch: (expectedNormalizedHostOrigin: string, actualOrigin: string | null | undefined) => boolean;
export declare const isApplicationIframeEnvelope: (value: unknown) => value is ApplicationIframeEnvelope<UnknownRecord>;
export declare const isApplicationUiReadyPayload: (value: unknown) => value is ApplicationUiReadyPayload;
export declare const isApplicationUiReadyEnvelope: (value: unknown) => value is ApplicationUiReadyEnvelope;
export declare const isApplicationBootstrapPayload: (value: unknown) => value is ApplicationBootstrapPayload;
export declare const isApplicationHostBootstrapEnvelope: (value: unknown) => value is ApplicationHostBootstrapEnvelope;
export declare const createApplicationUiReadyEnvelope: (payload: ApplicationUiReadyPayload) => ApplicationUiReadyEnvelope;
export declare const createApplicationHostBootstrapEnvelope: (payload: ApplicationBootstrapPayload) => ApplicationHostBootstrapEnvelope;
export declare const readApplicationIframeLaunchHints: (search: string) => ApplicationIframeLaunchHints | null;
export {};
//# sourceMappingURL=application-iframe-contract.d.ts.map