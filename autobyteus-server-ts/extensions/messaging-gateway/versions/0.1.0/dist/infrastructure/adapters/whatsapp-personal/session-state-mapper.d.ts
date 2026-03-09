import type { SessionState } from "../../../domain/models/session-provider-adapter.js";
export type PersonalConnectionUpdate = {
    connection?: "open" | "connecting" | "close";
    disconnectCode?: number;
};
export declare function toSessionState(update: PersonalConnectionUpdate, previous: SessionState): SessionState;
//# sourceMappingURL=session-state-mapper.d.ts.map