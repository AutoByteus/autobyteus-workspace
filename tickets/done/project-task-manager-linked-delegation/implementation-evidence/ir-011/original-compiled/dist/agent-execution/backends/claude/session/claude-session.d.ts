import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { type ClaudeSessionConfig } from "./claude-session-config.js";
import type { ClaudeSessionStateInput } from "./claude-session-state-input.js";
import { type ClaudeInputDispatch } from "./claude-turn-tracker.js";
type ClaudeSessionStatus = "OFFLINE" | "IDLE" | "RUNNING" | "ERROR";
export type ClaudeSessionInputResult = Readonly<{
    accepted: true;
    turnId: string;
}> | Readonly<{
    accepted: false;
    code: string;
    message: string;
}>;
/**
 * One Claude AgentRun session: a run-lifetime Claude CLI process (streaming input),
 * canonical turns derived from its stream, mid-turn input delivery, and interrupt.
 */
export declare class ClaudeSession {
    readonly runContext: ClaudeRunContext;
    private readonly dependencies;
    readonly listeners: Set<(event: ClaudeSessionEvent) => void>;
    private currentStatus;
    private isInterruptingActiveTurn;
    private rawClaudeChunkSequence;
    private readonly agentToolsMcpSessionState;
    private readonly providerSessionLifecycle;
    private readonly taskRegistry;
    private readonly turnTracker;
    private readonly process;
    private readonly interruptTasks;
    private textProjector;
    private openProcess;
    private selectedBinding;
    private closing;
    private closingTurn;
    constructor(input: ClaudeSessionStateInput);
    get runId(): string;
    get sessionConfig(): ClaudeSessionConfig;
    get sessionId(): string;
    get hasCompletedTurn(): boolean;
    get activeTurnId(): string | null;
    get processState(): import("./claude-session-process.js").ClaudeSessionProcessState;
    getStatusSnapshotSource(): {
        currentStatus: ClaudeSessionStatus;
        activeTurnId: string | null;
        isInterrupting: boolean;
    };
    get model(): string;
    get workingDirectory(): string;
    get permissionMode(): ClaudeSessionConfig["permissionMode"];
    isActive(): boolean;
    subscribeRuntimeEvents(listener: (event: ClaudeSessionEvent) => void): () => void;
    releaseAgentToolsMcp(): void;
    clearRuntimeListeners(): void;
    emitRuntimeEvent(event: ClaudeSessionEvent): void;
    /**
     * Starts a canonical turn or appends to the active one, then writes the message into the
     * live session (opening or resuming the process on first use). Failures after the input
     * is registered fail its canonical turn visibly; the input still counts as forwarded.
     */
    submitInput(message: AgentInputUserMessage, dispatch: ClaudeInputDispatch): Promise<ClaudeSessionInputResult>;
    approveTool(invocationId: string, approved: boolean, reason?: string | null): Promise<void>;
    /** Ends the current canonical turn only; the process and background tasks stay alive. */
    interrupt(turnId: string): Promise<void>;
    /** Bounded canonical handoff; listeners must survive this, not the physical exit. */
    closeTurnForTermination(pendingToolApprovalReason: string): Promise<void>;
    /** Canonical interrupted handoff followed by retained exact CLI/background cleanup. */
    closeProcess(pendingToolApprovalReason: string): Promise<void>;
    terminate(): Promise<void>;
    private interruptActiveTurn;
    private beginOpenStreamingSession;
    private handleProcessOpened;
    private handleFrame;
    private handleProcessExit;
    private createTrackerListener;
    private handleTurnStarted;
    private projectTurnFrame;
    private handleTurnSettled;
    private flushPendingToolApprovalResponses;
}
export {};
//# sourceMappingURL=claude-session.d.ts.map