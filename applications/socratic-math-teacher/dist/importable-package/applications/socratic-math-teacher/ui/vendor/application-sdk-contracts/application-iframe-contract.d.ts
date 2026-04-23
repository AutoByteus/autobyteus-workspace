export declare const APPLICATION_IFRAME_CHANNEL: "autobyteus.application.host";
export declare const APPLICATION_IFRAME_CONTRACT_VERSION_V2: "2";
export declare const APPLICATION_IFRAME_READY_EVENT: "autobyteus.application.ui.ready";
export declare const APPLICATION_IFRAME_BOOTSTRAP_EVENT: "autobyteus.application.host.bootstrap";
export declare const APPLICATION_IFRAME_QUERY_CONTRACT_VERSION: "autobyteusContractVersion";
export declare const APPLICATION_IFRAME_QUERY_APPLICATION_ID: "autobyteusApplicationId";
export declare const APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID: "autobyteusLaunchInstanceId";
export declare const APPLICATION_IFRAME_QUERY_HOST_ORIGIN: "autobyteusHostOrigin";
type UnknownRecord = Record<string, unknown>;
export type ApplicationHostTransport = {
    backendBaseUrl: string | null;
    backendNotificationsUrl: string | null;
};
export type ApplicationIframeLaunchHints = {
    contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V2;
    applicationId: string;
    launchInstanceId: string;
    hostOrigin: string;
};
export type ApplicationIframeEnvelopeV2<TPayload extends UnknownRecord = UnknownRecord> = {
    channel: typeof APPLICATION_IFRAME_CHANNEL;
    contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V2;
    eventName: string;
    payload: TPayload;
};
export type ApplicationUiReadyPayloadV2 = {
    applicationId: string;
    launchInstanceId: string;
};
export type ApplicationIframeReadySignal = ApplicationUiReadyPayloadV2 & {
    iframeOrigin: string;
};
export type ApplicationUiReadyEnvelopeV2 = ApplicationIframeEnvelopeV2<ApplicationUiReadyPayloadV2> & {
    eventName: typeof APPLICATION_IFRAME_READY_EVENT;
};
export type ApplicationBootstrapPayloadV2 = {
    host: {
        origin: string;
    };
    application: {
        applicationId: string;
        localApplicationId: string;
        packageId: string;
        name: string;
    };
    launch: {
        launchInstanceId: string;
    };
    requestContext: {
        applicationId: string;
        launchInstanceId: string;
    };
    transport: ApplicationHostTransport;
};
export type ApplicationHostBootstrapEnvelopeV2 = ApplicationIframeEnvelopeV2<ApplicationBootstrapPayloadV2> & {
    eventName: typeof APPLICATION_IFRAME_BOOTSTRAP_EVENT;
};
export declare const normalizeApplicationHostOrigin: (origin: string | null | undefined, protocol?: string | null) => string;
export declare const doesApplicationHostOriginMatch: (expectedNormalizedHostOrigin: string, actualOrigin: string | null | undefined) => boolean;
export declare const isApplicationIframeEnvelopeV2: (value: unknown) => value is ApplicationIframeEnvelopeV2<UnknownRecord>;
export declare const isApplicationUiReadyPayloadV2: (value: unknown) => value is ApplicationUiReadyPayloadV2;
export declare const isApplicationUiReadyEnvelopeV2: (value: unknown) => value is ApplicationUiReadyEnvelopeV2;
export declare const isApplicationBootstrapPayloadV2: (value: unknown) => value is ApplicationBootstrapPayloadV2;
export declare const isApplicationHostBootstrapEnvelopeV2: (value: unknown) => value is ApplicationHostBootstrapEnvelopeV2;
export declare const createApplicationUiReadyEnvelopeV2: (payload: ApplicationUiReadyPayloadV2) => ApplicationUiReadyEnvelopeV2;
export declare const createApplicationHostBootstrapEnvelopeV2: (payload: ApplicationBootstrapPayloadV2) => ApplicationHostBootstrapEnvelopeV2;
export declare const readApplicationIframeLaunchHints: (search: string) => ApplicationIframeLaunchHints | null;
export {};
//# sourceMappingURL=application-iframe-contract.d.ts.map