import { type DevBootstrapSession } from './dev-host-page.js';
export type StartDevBootstrapServerOptions = {
    projectRoot: string;
    port?: number | null;
    applicationId?: string | null;
    backendBaseUrl?: string | null;
    backendNotificationsUrl?: string | null;
    backendWebSocketBaseUrl?: string | null;
    agentCommunicationWebSocketBaseUrl?: string | null;
    mockBackend?: boolean | null;
};
export type DevBootstrapServerHandle = {
    url: string;
    session: DevBootstrapSession;
    close: () => Promise<void>;
};
export declare const startDevBootstrapServer: (options: StartDevBootstrapServerOptions) => Promise<DevBootstrapServerHandle>;
//# sourceMappingURL=dev-bootstrap-server.d.ts.map