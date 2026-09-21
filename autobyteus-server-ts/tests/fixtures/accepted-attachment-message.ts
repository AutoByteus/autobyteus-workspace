import { vi, expect } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { UserMessageReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { MemoryIngestInputProcessor } from "autobyteus-ts/agent/input-processor/memory-ingest-input-processor.js";
import { MemoryManager } from "autobyteus-ts/memory/memory-manager.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRun } from "../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../src/agent-execution/domain/agent-run-context.js";
import type { AgentRunBackend } from "../../src/agent-execution/backends/agent-run-backend.js";
import { AgentRunMemoryRecorder } from "../../src/agent-memory/services/agent-run-memory-recorder.js";
import type { AgentRunProviderInputNormalizer } from "../../src/agent-execution/input/agent-run-provider-input-normalizer.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";

/** Real admission, adaptation, original observer/queue, native clone/processor and storage.
 * Only the provider backend is bounded; this does not simulate an actual provider reply. */
export async function recordAcceptedAttachmentMessage(input: {
  id: string; memoryDir: string; runtimeKind: RuntimeKind; message: AgentInputUserMessage;
  normalizer: AgentRunProviderInputNormalizer;
}) {
  const recorder = new AgentRunMemoryRecorder();
  const store = new RunMemoryFileStore(input.memoryDir);
  const memoryManager = new MemoryManager({ store });
  const turnId = "attachment-turn";
  const config = new AgentRunConfig({
    runtimeKind: input.runtimeKind, memoryDir: input.memoryDir, agentDefinitionId: "definition",
    llmModelIdentifier: "bounded", autoExecuteTools: false, skillAccessMode: SkillAccessMode.NONE,
  });
  const context = new AgentRunContext({ runId: input.id, config, runtimeContext: null });
  const forwarded = vi.fn();
  const dispatchUserInput = vi.fn(async (dispatch) => {
    if (input.runtimeKind === RuntimeKind.AUTOBYTEUS) {
      const original = AgentInputUserMessage.fromDict(dispatch.message.toDict());
      const processed = AgentInputUserMessage.fromDict(original.toDict());
      await new MemoryIngestInputProcessor().process(processed, {
        agentId: input.id, state: { memoryManager, activeTurn: { turnId } },
      } as any, new UserMessageReceivedEvent(original));
    }
    return { forwarded: true, turnId };
  });
  const backend: AgentRunBackend = {
    runId: input.id, runtimeKind: input.runtimeKind, inputCapabilities: { activeTurnAppend: "unsupported" },
    getContext: () => context, isActive: () => true, getPlatformAgentRunId: () => "platform",
    getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
    subscribeToSourceEventBatches: () => () => {},
    dispatchUserInput, approveToolInvocation: async () => ({ accepted: true }),
    interrupt: async () => ({ accepted: true }), terminate: async () => ({ accepted: true }),
  };
  const run = new AgentRun({
    context, backend, providerInputNormalizer: input.normalizer,
    commandObservers: [recorder, { onUserMessageForwarded: forwarded }],
  });
  const detach = recorder.attachToRun(run);
  const accepted = await run.postUserMessage(input.message);
  expect(accepted.accepted).toBe(true);
  await vi.waitFor(() => expect(forwarded).toHaveBeenCalledOnce());
  await recorder.waitForIdle(input.id);
  expect(dispatchUserInput).toHaveBeenCalledOnce();
  expect(forwarded.mock.calls[0][0].message).toBe(input.message);
  expect(store.listTurnRawTracesOrdered()).toHaveLength(1);
  detach();
  return { store, providerMessage: dispatchUserInput.mock.calls[0][0].message as AgentInputUserMessage };
}
