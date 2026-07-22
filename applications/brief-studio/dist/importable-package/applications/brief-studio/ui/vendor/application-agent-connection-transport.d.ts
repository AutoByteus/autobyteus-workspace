export type ApplicationAgentBrowserWebSocket = {
    send: (data: string) => void;
    close: (code?: number, reason?: string) => void;
    addEventListener: (type: string, listener: (event: any) => void) => void;
    removeEventListener: (type: string, listener: (event: any) => void) => void;
};
export type ApplicationAgentBrowserWebSocketFactory = (url: string) => ApplicationAgentBrowserWebSocket;
export type ApplicationAgentConnectionTransportClose = {
    code: number;
    reason: string;
    wasClean: boolean;
};
export type ApplicationAgentConnectionTransport = {
    send: (data: string) => void;
    close: (code?: number, reason?: string) => void;
    onMessage: (listener: (data: unknown) => void) => () => void;
    onError: (listener: () => void) => () => void;
    onClose: (listener: (event: ApplicationAgentConnectionTransportClose) => void) => () => void;
};
export declare const createApplicationAgentConnectionTransport: (input: {
    url: string;
    webSocketFactory?: ApplicationAgentBrowserWebSocketFactory;
}) => ApplicationAgentConnectionTransport;
//# sourceMappingURL=application-agent-connection-transport.d.ts.map