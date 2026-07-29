export declare const STANDALONE_APPLICATION_BOOTSTRAP_CONTRACT_VERSION: "1";
export declare const STANDALONE_APPLICATION_PLATFORM_PATH_PREFIX: "/_autobyteus/";
export type StandaloneApplicationBootstrapPayload = {
    contractVersion: typeof STANDALONE_APPLICATION_BOOTSTRAP_CONTRACT_VERSION;
    application: {
        applicationId: string;
        localApplicationId: string;
        packageId: string;
        name: string;
    };
    transportPaths: {
        backendBasePath: string;
        backendNotificationsPath: string | null;
        backendWebSocketBasePath: string | null;
        agentCommunicationWebSocketBasePath: string | null;
    };
};
export declare const isConfinedStandalonePlatformPath: (value: unknown) => value is string;
export declare const isStandaloneApplicationBootstrapPayload: (value: unknown) => value is StandaloneApplicationBootstrapPayload;
export declare const validateStandaloneApplicationBootstrapPayload: (value: unknown) => StandaloneApplicationBootstrapPayload;
//# sourceMappingURL=standalone-application-bootstrap.d.ts.map