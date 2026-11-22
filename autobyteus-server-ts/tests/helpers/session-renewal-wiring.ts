import fs from "node:fs";
import path from "node:path";
import { vi } from "vitest";
import { createBackendPreparation } from "../../src/agent-execution/backends/agent-run-backend-preparation.js";
import type { AgentRunBackendPreparationRequest } from "../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunContext } from "../../src/agent-execution/domain/agent-run-context.js";
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

export const lostSessionClaudeFactory = () => {
  const inputs: string[] = [];
  const restores: string[] = [];
  const factory = {
    beginPreparation: vi.fn((request: AgentRunBackendPreparationRequest) => createBackendPreparation({
      prepare: async () => {
        if (request.kind === "restore") {
          const sessionId = String((request.context.runtimeContext as { sessionId?: string } | null)?.sessionId ?? LOST_SESSION);
          restores.push(sessionId);
          throw new SavedRuntimeSessionMissingError(RuntimeKind.CLAUDE_AGENT_SDK, sessionId);
        }
        const context = new AgentRunContext({ runId: request.runId, config: request.config, runtimeContext: null });
        let turns = 0;
        return {
          runId: request.runId, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          compactionRecovery: { kind: "unsupported" },
          backgroundTaskInspection: { kind: "event-stream", current: () => [] },
          backgroundTaskNotices: { kind: "unsupported" },
          inputCapabilities: { activeTurnAppend: "unsupported" },
          getContext: () => context, getPlatformAgentRunId: () => FRESH_SESSION, isActive: () => true,
          getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
          subscribeToSourceEventBatches: () => () => undefined,
          dispatchUserInput: vi.fn(async (dispatch: AgentRunBackendInputDispatch) => {
            inputs.push(String(dispatch.message.content));
            return { forwarded: true as const, turnId: `turn-${++turns}` };
          }),
          approveToolInvocation: vi.fn(), interrupt: vi.fn(async (turnId: string | null) => ({ accepted: true, turnId })),
          terminate: vi.fn(async () => ({ accepted: true })),
          applyDefinitionTools: vi.fn(), getToolNames: () => [],
        } as never;
      },
      releaseResources: async () => undefined,
    })),
  };
  return { factory, inputs, restores };
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
