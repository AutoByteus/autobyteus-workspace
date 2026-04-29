export declare const APPLICATION_IFRAME_CHANNEL: "autobyteus.application.host";
export declare const APPLICATION_IFRAME_CONTRACT_VERSION_V3: "3";
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
};
export type ApplicationIframeLaunchHints = {
    contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V3;
    applicationId: string;
    iframeLaunchId: string;
    hostOrigin: string;
};
export type ApplicationIframeEnvelopeV3<TPayload extends UnknownRecord = UnknownRecord> = {
    channel: typeof APPLICATION_IFRAME_CHANNEL;
    contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V3;
    eventName: string;
    payload: TPayload;
};
export type ApplicationUiReadyPayloadV3 = {
    applicationId: string;
    iframeLaunchId: string;
};
export type ApplicationIframeReadySignal = ApplicationUiReadyPayloadV3 & {
    iframeOrigin: string;
};
export type ApplicationUiReadyEnvelopeV3 = ApplicationIframeEnvelopeV3<ApplicationUiReadyPayloadV3> & {
    eventName: typeof APPLICATION_IFRAME_READY_EVENT;
};
export type ApplicationBootstrapPayloadV3 = {
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
export type ApplicationHostBootstrapEnvelopeV3 = ApplicationIframeEnvelopeV3<ApplicationBootstrapPayloadV3> & {
    eventName: typeof APPLICATION_IFRAME_BOOTSTRAP_EVENT;
};
export declare const normalizeApplicationHostOrigin: (origin: string | null | undefined, protocol?: string | null) => string;
export declare const doesApplicationHostOriginMatch: (expectedNormalizedHostOrigin: string, actualOrigin: string | null | undefined) => boolean;
export declare const isApplicationIframeEnvelopeV3: (value: unknown) => value is ApplicationIframeEnvelopeV3<UnknownRecord>;
export declare const isApplicationUiReadyPayloadV3: (value: unknown) => value is ApplicationUiReadyPayloadV3;
export declare const isApplicationUiReadyEnvelopeV3: (value: unknown) => value is ApplicationUiReadyEnvelopeV3;
export declare const isApplicationBootstrapPayloadV3: (value: unknown) => value is ApplicationBootstrapPayloadV3;
export declare const isApplicationHostBootstrapEnvelopeV3: (value: unknown) => value is ApplicationHostBootstrapEnvelopeV3;
export declare const createApplicationUiReadyEnvelopeV3: (payload: ApplicationUiReadyPayloadV3) => ApplicationUiReadyEnvelopeV3;
export declare const createApplicationHostBootstrapEnvelopeV3: (payload: ApplicationBootstrapPayloadV3) => ApplicationHostBootstrapEnvelopeV3;
export declare const readApplicationIframeLaunchHints: (search: string) => ApplicationIframeLaunchHints | null;
export {};
//# sourceMappingURL=application-iframe-contract.d.ts.map