# Working Context Snapshot Persistence + Restore (TypeScript)

## Goal
Persist a derived Working Context Snapshot cache so agent restore can be fast and deterministic. If the cache is missing or invalid, rebuild from memory (episodic/semantic/raw tail) and system prompt.

## Non-Goals
- Perfect replay of in-flight execution (queues, pending tool calls, streaming state)
- Replacing the memory store as the source of truth
- Changing compaction policy or retrieval strategy

## Design Summary
- Treat Working Context Snapshot as a **cache**.
- Persist to `memory/agents/<agentId>/working_context_snapshot.json`.
- On restore, **prefer cache** if valid; otherwise rebuild via Compaction Snapshot.
- Restore runs inside bootstrap via a **restore-only** `WorkingContextSnapshotRestoreStep` gated by `restoreOptions`.
- Keep persistence/restore logic separate from agent runtime and memory store.

---

## Files and Responsibilities

### 1) `src/memory/working-context-snapshot.ts`
**Responsibility:** Generic, append-only message list for the current compaction epoch.

**APIs:**
- `appendMessage(message: Message): void`
- `appendUser(content: string): void`
- `appendAssistant(content: string | null, reasoning?: string | null): void`
- `appendToolCalls(toolCalls: ToolCallSpec[]): void`
- `appendToolResult(toolCallId: string, toolName: string, toolResult: unknown, toolError?: string | null): void`
- `buildMessages(): Message[]`
- `reset(snapshotMessages: Iterable<Message>, lastCompactionTs?: number | null): void`

---

### 2) `src/memory/working-context-snapshot-serializer.ts` (new)
**Responsibility:** Pure serialization/deserialization of `WorkingContextSnapshot` and `Message` objects.

**APIs:**
- `serialize(snapshot: WorkingContextSnapshot, metadata: Record<string, unknown>): Record<string, unknown>`
- `deserialize(payload: Record<string, unknown>): { snapshot: WorkingContextSnapshot; metadata: Record<string, unknown> }`
- `validate(payload: Record<string, unknown>): boolean`

**Notes:**
- Must support tool payloads (tool calls/results), media URLs, reasoning.
- Normalize tool payloads and ensure JSON-safe values.

---

### 3) `src/memory/store/working-context-snapshot-store.ts` (new)
**Responsibility:** File IO only for working context snapshot cache.

**APIs:**
- `exists(agentId: string): boolean`
- `read(agentId: string): Record<string, unknown> | null`
- `write(agentId: string, payload: Record<string, unknown>): void`

**Storage Path:**
- `memory/agents/<agentId>/working_context_snapshot.json`

---

### 4) `src/memory/restore/working-context-snapshot-bootstrapper.ts` (new)
**Responsibility:** Restore strategy (cache-first, fallback to rebuild).

**APIs:**
- `bootstrap(memoryManager: MemoryManager, systemPrompt: string, options: WorkingContextSnapshotBootstrapOptions): void`

**Behavior:**
1. If cache exists and is valid:
   - Deserialize and `memoryManager.resetWorkingContextSnapshot(messages)`.
2. Else:
   - `Retriever.retrieve(maxEpisodic, maxSemantic)`
   - `memoryManager.getRawTail(rawTailTurns)`
   - `CompactionSnapshotBuilder.build(systemPrompt, bundle, rawTail)`
   - `memoryManager.resetWorkingContextSnapshot(snapshot)`

**Options (defaults):**
- `maxEpisodic`, `maxSemantic`
- `rawTailTurns` (override compaction policy if set)

---

### 5) `src/memory/memory-manager.ts` (update)
**Responsibility:** Trigger persistence at safe boundaries.

**Add:**
- `persistWorkingContextSnapshot(): void`

**Call sites:**
- After `resetWorkingContextSnapshot(...)` (compaction snapshot applied)
- After `ingestAssistantResponse(...)` (end of turn)

---

### 6) `src/agent/bootstrap-steps/working-context-snapshot-restore-step.ts` (new)
**Responsibility:** Restore working context snapshot during bootstrap when in restore mode.

**Behavior:**
- Checks `context.state.restoreOptions`.
- If missing: no-op.
- If present: call `WorkingContextSnapshotBootstrapper.bootstrap(...)` using processed system prompt.

---

### 7) `src/agent/context/agent-runtime-state.ts` (update)
**Responsibility:** Carry restore intent through bootstrap.

**Add:**
- `restoreOptions: WorkingContextSnapshotBootstrapOptions | null = null`

---

### 8) `src/agent/factory/agent-factory.ts` (update)
**Responsibility:** Add a restore entrypoint on the factory.

**APIs:**
- `restoreAgent(agentId: string, config: AgentConfig, memoryDir?: string | null): Agent`

**Behavior:**
1. Create runtime with the **existing agentId** (new helper, e.g. `createRuntimeWithId`).
2. Initialize `MemoryManager` with `FileMemoryStore(baseDir, agentId)` and `WorkingContextSnapshotStore`.
3. Set `runtimeState.restoreOptions` so `WorkingContextSnapshotRestoreStep` runs during bootstrap.
4. Return `Agent` (caller can `start()`).

---

## Data Format (working_context_snapshot.json)
```
{
  "schema_version": 1,
  "agent_id": "agent_123",
  "epoch_id": 4,
  "last_compaction_ts": 1738100000.0,
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "...", "reasoning_content": "..."},
    {"role": "tool", "tool_payload": {"tool_call_id": "...", "tool_name": "..."}}
  ]
}
```

---

## Why This Separation Works
- **Serializer**: pure data mapping, no IO.
- **Store**: pure IO, no logic.
- **Bootstrapper**: restore strategy only.
- **MemoryManager**: triggers persistence, stays memory-focused.
- **AgentFactory.restoreAgent**: construction-only; bootstrap executes restore in the normal lifecycle.
