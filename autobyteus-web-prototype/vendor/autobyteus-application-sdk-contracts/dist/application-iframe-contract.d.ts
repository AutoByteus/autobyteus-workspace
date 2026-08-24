export declare const APPLICATION_IFRAME_CHANNEL: "autobyteus.application.host";
export declare const APPLICATION_IFRAME_CONTRACT_VERSION_V4: "4";
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
    contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V4;
    applicationId: string;
    iframeLaunchId: string;
    hostOrigin: string;
};
export type ApplicationIframeEnvelopeV4<TPayload extends UnknownRecord = UnknownRecord> = {
    channel: typeof APPLICATION_IFRAME_CHANNEL;
    contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V4;
    eventName: string;
    payload: TPayload;
};
export type ApplicationUiReadyPayloadV4 = {
    applicationId: string;
    iframeLaunchId: string;
};
export type ApplicationIframeReadySignal = ApplicationUiReadyPayloadV4 & {
    iframeOrigin: string;
};
export type ApplicationUiReadyEnvelopeV4 = ApplicationIframeEnvelopeV4<ApplicationUiReadyPayloadV4> & {
    eventName: typeof APPLICATION_IFRAME_READY_EVENT;
};
export type ApplicationBootstrapPayloadV4 = {
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
export type ApplicationHostBootstrapEnvelopeV4 = ApplicationIframeEnvelopeV4<ApplicationBootstrapPayloadV4> & {
    eventName: typeof APPLICATION_IFRAME_BOOTSTRAP_EVENT;
};
export declare const normalizeApplicationHostOrigin: (origin: string | null | undefined, protocol?: string | null) => string;
export declare const doesApplicationHostOriginMatch: (expectedNormalizedHostOrigin: string, actualOrigin: string | null | undefined) => boolean;
export declare const isApplicationIframeEnvelopeV4: (value: unknown) => value is ApplicationIframeEnvelopeV4<UnknownRecord>;
export declare const isApplicationUiReadyPayloadV4: (value: unknown) => value is ApplicationUiReadyPayloadV4;
export declare const isApplicationUiReadyEnvelopeV4: (value: unknown) => value is ApplicationUiReadyEnvelopeV4;
export declare const isApplicationBootstrapPayloadV4: (value: unknown) => value is ApplicationBootstrapPayloadV4;
export declare const isApplicationHostBootstrapEnvelopeV4: (value: unknown) => value is ApplicationHostBootstrapEnvelopeV4;
export declare const createApplicationUiReadyEnvelopeV4: (payload: ApplicationUiReadyPayloadV4) => ApplicationUiReadyEnvelopeV4;
export declare const createApplicationHostBootstrapEnvelopeV4: (payload: ApplicationBootstrapPayloadV4) => ApplicationHostBootstrapEnvelopeV4;
export declare const readApplicationIframeLaunchHints: (search: string) => ApplicationIframeLaunchHints | null;
export {};
//# sourceMappingURL=application-iframe-contract.d.ts.map