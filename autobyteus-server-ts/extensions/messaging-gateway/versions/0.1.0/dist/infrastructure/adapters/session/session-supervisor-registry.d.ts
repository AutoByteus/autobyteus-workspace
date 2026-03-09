import type { SessionSupervisor, SessionSupervisorStatus } from "./session-supervisor.js";
export type SessionSupervisorRegistryEntry = Pick<SessionSupervisor, "start" | "stop" | "markDisconnected" | "getStatus">;
export declare class SessionSupervisorRegistry {
    private readonly supervisors;
    register(providerKey: string, supervisor: SessionSupervisorRegistryEntry): void;
    startAll(): Promise<void>;
    stopAll(): Promise<void>;
    markDisconnected(providerKey: string, reason: string): void;
    getStatusByProvider(): Record<string, SessionSupervisorStatus>;
}
//# sourceMappingURL=session-supervisor-registry.d.ts.map