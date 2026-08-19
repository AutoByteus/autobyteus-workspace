import { type ApplicationHostBootstrapEnvelopeV4 } from '@autobyteus/application-sdk-contracts';
export type DevBootstrapSession = {
    hostOrigin: string;
    iframeLaunchId: string;
    localApplicationId: string;
    applicationId: string;
    applicationName: string;
    iframePath: string;
    launchQueryString: string;
    bootstrapEnvelope: ApplicationHostBootstrapEnvelopeV4;
};
export declare const buildLaunchQueryString: (input: {
    applicationId: string;
    iframeLaunchId: string;
    hostOrigin: string;
}) => string;
export declare const createDevBootstrapSession: (input: {
    hostOrigin: string;
    iframeLaunchId: string;
    localApplicationId: string;
    applicationId: string;
    applicationName: string;
    backendBaseUrl: string;
    backendNotificationsUrl: string | null;
    backendWebSocketBaseUrl: string | null;
    agentCommunicationWebSocketBaseUrl: string | null;
    entryHtml?: string | null;
}) => DevBootstrapSession;
export declare const renderDevHostPage: (session: DevBootstrapSession) => string;
//# sourceMappingURL=dev-host-page.d.ts.map