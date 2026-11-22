import fs from "node:fs";
import path from "node:path";
import { vi } from "vitest";
import { createBackendPreparation } from "../../src/agent-execution/backends/agent-run-backend-preparation.js";
import type { AgentRunBackendPreparationRequest } from "../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunContext } from "../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunBackendInputDispatch } from "../../src/agent-execution/input/agent-run-input-contract.js";
import { SavedRuntimeSessionMissingError } from "../../src/agent-execution/errors.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { turnRecords } from "../agent-work-journal/raw-trace-folder-fixtures.js";

/**
 * A Claude provider for session-renewal wiring tests (autobyteus-599, AC-008), behind the real backend-factory contract: a
 * restore of the lost session fails with the typed error, as the real Claude factory's check does; a new session is a backend
 * that records every input it is given. Everything above the factory (run manager, input preface, lifecycle) is real.
 */
export const LOST_SESSION = "11111111-2222-4333-8444-555555555555";
export const FRESH_SESSION = "66666666-7777-4888-8999-aaaaaaaaaaaa";
export const HANDOVER_NOTICE_START = "[System: runtime hand-over]";

/** `restoresBeforeLoss`: how many restores still find the session before the runtime loses it (default none). */
export const lostSessionClaudeFactory = (options: { restoresBeforeLoss?: number } = {}) => {
  const inputs: string[] = [];
  const restores: string[] = [];
  let found = options.restoresBeforeLoss ?? 0;
  const stops: Array<() => void> = [];
  const factory = {
    beginPreparation: vi.fn((request: AgentRunBackendPreparationRequest) => createBackendPreparation({
      prepare: async () => {
        let platformAgentRunId = FRESH_SESSION;
        if (request.kind === "restore") {
          const sessionId = String((request.context.runtimeContext as { sessionId?: string } | null)?.sessionId ?? LOST_SESSION);
          restores.push(sessionId);
          if (found-- <= 0) throw new SavedRuntimeSessionMissingError(RuntimeKind.CLAUDE_AGENT_SDK, sessionId);
          platformAgentRunId = sessionId;
        }
        const context = request.kind === "restore" ? request.context
          : new AgentRunContext({ runId: request.runId, config: request.config, runtimeContext: null });
        let turns = 0;
        let active = true;
        const listeners = new Set<(events: AgentRunEvent[]) => unknown>();
        const emit = (eventType: AgentRunEventType, turnId: string) => {
          for (const listener of listeners) void listener([{ eventType, runId: context.runId, payload: { turn_id: turnId }, statusHint: null }]);
        };
        stops.push(() => { active = false; });
        return {
          runId: context.runId, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          compactionRecovery: { kind: "unsupported" },
          backgroundTaskInspection: { kind: "event-stream", current: () => [] },
          backgroundTaskNotices: { kind: "unsupported" },
          inputCapabilities: { activeTurnAppend: "unsupported" },
          getContext: () => context, getPlatformAgentRunId: () => platformAgentRunId, isActive: () => active,
          getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
          subscribeToSourceEventBatches: (listener: (events: AgentRunEvent[]) => unknown) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
          },
          dispatchUserInput: vi.fn(async (dispatch: AgentRunBackendInputDispatch) => {
            inputs.push(String(dispatch.message.content));
            const turnId = `turn-${++turns}`;
            // Each turn starts and ends at once, as a short answer does.
            setTimeout(() => { emit(AgentRunEventType.TURN_STARTED, turnId); emit(AgentRunEventType.TURN_COMPLETED, turnId); }, 0);
            return { forwarded: true as const, turnId };
          }),
          approveToolInvocation: vi.fn(), interrupt: vi.fn(async (turnId: string | null) => ({ accepted: true, turnId })),
          terminate: vi.fn(async () => { active = false; return { accepted: true }; }),
          applyDefinitionTools: vi.fn(), getToolNames: () => [],
        } as never;
      },
      releaseResources: async () => undefined,
    })),
  };
  /** The latest session's process ends (its backend reports inactive), as a runtime that exits does. */
  const endLatest = () => stops.at(-1)?.();
  return { factory, inputs, restores, endLatest };
};

/** The provider factories of a composition: only Claude is used. */
export const providerFactoriesWith = (claude: unknown) => ({
  autoByteus: {} as never, codex: {} as never, claude: claude as never, antigravity: {} as never, grok: {} as never, deepSeekHarness: {} as never,
});

/** A run folder with earlier work, as a run whose Claude session was later lost has. */
export const seedEarlierWork = (runDir: string): string => {
  fs.mkdirSync(runDir, { recursive: true });
  const file = path.join(runDir, "raw_traces_active.jsonl");
  fs.writeFileSync(file, turnRecords("t1", "git status", "clean").map((record) => JSON.stringify(record)).join("\n") + "\n");
  return fs.readFileSync(file, "utf8");
};
