# Runtime Simulation (Restore + Continue) - TypeScript

This is a **code-aligned** call stack simulation based on the current Autobyteus TS runtime and the proposed restore design.

## 1) Restore Flow (cache-first with fallback rebuild)

```
agent/factory/agent-factory.ts:restoreAgent(agentId, config, memoryDir?)
├── agent/factory/agent-factory.ts:createRuntimeWithId(agentId, config, memoryDirOverride?, restoreOptions?)
│   ├── agent/context/agent-runtime-state.ts:constructor(agentId, workspace, customData)
│   ├── memory/store/file-store.ts:constructor(baseDir, agentId)
│   ├── memory/store/working-context-snapshot-store.ts:constructor(baseDir, agentId)
│   ├── memory/memory-manager.ts:constructor({ store, workingContextSnapshotStore, ... })
│   └── agent/context/agent-context.ts:constructor(agentId, config, state)
│
├── agent/agent.ts:start()  # starts worker loop
│   └── agent/runtime/agent-worker.ts:asyncRun()
│       ├── agent/runtime/agent-worker.ts:runtimeInit()
│       ├── agent/runtime/agent-worker.ts:initialize()
│       │   └── agent/handlers/bootstrap-event-handler.ts:handle(event, context)
│       │       ├── agent/bootstrap-steps/workspace-context-initialization-step.ts:execute(context)
│       │       ├── agent/bootstrap-steps/mcp-server-prewarming-step.ts:execute(context)
│       │       ├── agent/bootstrap-steps/system-prompt-processing-step.ts:execute(context)
│       │       │   └── agent/system-prompt-processor/*:process(systemPrompt, ...)
│       │       └── agent/bootstrap-steps/working-context-snapshot-restore-step.ts:execute(context)  # restore-only
│       │           ├── agent/context/agent-runtime-state.ts:restoreOptions  # set by restoreAgent
│       │           └── memory/restore/working-context-snapshot-bootstrapper.ts:bootstrap(memoryManager, systemPrompt, options)
│       │               ├── memory/store/working-context-snapshot-store.ts:exists(agentId)
│       │               ├── memory/store/working-context-snapshot-store.ts:read(agentId)
│       │               ├── memory/working-context-snapshot-serializer.ts:validate(payload)
│       │               ├── memory/working-context-snapshot-serializer.ts:deserialize(payload)
│       │               └── memory/memory-manager.ts:resetWorkingContextSnapshot(snapshotMessages)
│       │
│       │               # Fallback path if cache is missing/invalid
│       │               ├── memory/retrieval/retriever.ts:retrieve(maxEpisodic, maxSemantic)
│       │               ├── memory/memory-manager.ts:getRawTail(tailTurns)
│       │               ├── memory/compaction-snapshot-builder.ts:build(systemPrompt, bundle, rawTail)
│       │               └── memory/memory-manager.ts:resetWorkingContextSnapshot(snapshotMessages)
```

## 2) Normal Turn After Restore

```
agent/agent.ts:postUserMessage(agentInput)
└── agent/runtime/agent-runtime.ts:submitEvent(event)
    └── agent/runtime/agent-worker.ts:asyncRun()
        └── agent/handlers/user-input-message-event-handler.ts:handle(event, context)
            ├── agent/input-processor/memory-ingest-input-processor.ts:process(message, context, triggeringEvent)
            │   └── memory/memory-manager.ts:ingestUserMessage(llmUserMessage, turnId, sourceEvent)
            │
            ├── agent/message/multimodal-message-builder.ts:buildLlmUserMessage(message)
            └── agent/handlers/llm-user-message-ready-event-handler.ts:handle(event, context)
                ├── agent/llm-request-assembler.ts:prepareRequest(processedUserInput, currentTurnId, systemPrompt)
                │   ├── memory/memory-manager.ts:getWorkingContextMessages()
                │   ├── llm/prompt-renderers/openai-chat-renderer.ts:render(messages)
                │   └── memory/memory-manager.ts:workingContextSnapshot.appendMessage(message)
                │
                ├── llm/base.ts:streamMessages(messages, renderedPayload, ...)
                ├── memory/memory-manager.ts:ingestToolIntent(...)   # if tool calls
                └── memory/memory-manager.ts:ingestAssistantResponse(response, turnId, sourceEvent)
                    └── memory/memory-manager.ts:requestCompaction()  # only sets flag
```

## 3) Compaction Timing (real path)

```
# After response:
agent/handlers/llm-user-message-ready-event-handler.ts:handle(event, context)
└── memory/memory-manager.ts:requestCompaction()

# Next LLM call:
agent/llm-request-assembler.ts:prepareRequest(...)
└── memory/compaction/compactor.ts:compact(turnIds)
    ├── memory/compaction/summarizer.ts:summarize(traces)
    ├── memory/store/file-store.ts:add(items)          # episodic + semantic
    ├── memory/store/file-store.ts:pruneRawTraces(...)
    ├── memory/compaction-snapshot-builder.ts:build(systemPrompt, bundle, rawTail)
    └── memory/memory-manager.ts:resetWorkingContextSnapshot(snapshotMessages)
        └── memory/memory-manager.ts:persistWorkingContextSnapshot()
```

---

## Notes / Risks
- **Cache staleness** between tool results and assistant response (snapshot changes but not persisted). Mitigation: persist on tool call/result or accept fallback rebuild on restore.
- **System prompt mismatch**: snapshot cache assumes the current system prompt matches what produced it.
- **Tool payload size**: large/non-JSON tool results should be normalized or truncated.
