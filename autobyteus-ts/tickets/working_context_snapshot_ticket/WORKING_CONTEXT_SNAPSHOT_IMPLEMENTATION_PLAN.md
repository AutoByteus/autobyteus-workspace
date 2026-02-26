# Implementation Plan (TDD, Bottom-Up)

## Phase 1: Low-Level Building Blocks
1. **WorkingContextSnapshotSerializer**
   - Unit tests for serialize/deserialize/validate.
   - Implement serializer.

2. **WorkingContextSnapshotStore (file IO)**
   - Unit tests for exists/read/write.
   - Implement store.

## Phase 2: Restore Orchestration (Memory Layer)
3. **WorkingContextSnapshotBootstrapper**
   - Unit tests for cache-hit and cache-miss paths.
   - Implement bootstrapper.

4. **MemoryManager persistence hooks**
   - Unit tests to confirm `persistWorkingContextSnapshot` on reset and assistant response.
   - Implement `persistWorkingContextSnapshot` and integrate hooks.

## Phase 3: Bootstrap Integration
5. **WorkingContextSnapshotRestoreStep**
   - Unit test: no-op without restore flag.
   - Unit test: calls bootstrapper when restore flag set.
   - Implement step and register in bootstrap sequence.

6. **AgentFactory.restoreAgent**
   - Integration test: create cache, restore agent, ensure snapshot loaded after bootstrap.
   - Implement factory restore path and runtime creation with existing `agentId`.

## Phase 4: Integration Tests
7. **Integration: persistence + bootstrapper**
   - Use FileMemoryStore + WorkingContextSnapshotStore to write cache.
   - Ensure bootstrapper loads cache and restores snapshot.

8. **Integration: fallback rebuild**
   - No cache file; write episodic/semantic/raw tail.
   - Ensure bootstrapper builds snapshot and resets working context snapshot.
