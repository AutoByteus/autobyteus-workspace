import { ApplicationAgentConnectionError, type ApplicationAgentConnectionClose, type ApplicationAgentEvent, type ApplicationAgentInput, type ApplicationAgentTargetAddress } from "@autobyteus/application-sdk-contracts";
import type { ApplicationAgentConnectionTransport } from "./application-agent-connection-transport.js";
export type ApplicationAgentConnectionState = "connecting" | "open" | "closing" | "closed";
export type ApplicationAgentConnectionOptions = {
    signal?: AbortSignal;
};
export type ApplicationAgentConnection = {
    readonly address: ApplicationAgentTargetAddress;
    readonly state: ApplicationAgentConnectionState;
    readonly ready: Promise<void>;
    sendInput: (input: ApplicationAgentInput) => Promise<void>;
    onEvent: (listener: (event: ApplicationAgentEvent) => void) => () => void;
    onError: (listener: (error: ApplicationAgentConnectionError) => void) => () => void;
    onClose: (listener: (close: ApplicationAgentConnectionClose) => void) => () => void;
    close: () => void;
};
export declare const createApplicationAgentConnection: (input: {
    address: ApplicationAgentTargetAddress;
    transport: ApplicationAgentConnectionTransport;
    signal?: AbortSignal;
}) => ApplicationAgentConnection;
//# sourceMappingURL=application-agent-connection.d.ts.map