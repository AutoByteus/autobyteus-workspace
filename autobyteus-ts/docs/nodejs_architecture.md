# Node.js Architecture & Migration Notes

This document captures the Node.js/TypeScript architecture patterns, conventions, and migration-specific decisions for the `autobyteus-ts` codebase. It is intended to be read alongside `ARCHITECTURE.md`, `migrate_nodesjs_ticket/MIGRATION_STRATEGY.md`, and `migrate_nodesjs_ticket/MIGRATION_PROGRESS.md`.

## 1. Purpose

- Preserve the common Node.js patterns adopted during migration.
- Provide a single reference for registration conventions, testing structure, and runtime design decisions.
- Keep context small for future contributors or agents after context compaction.

## 2. Composition Roots & Registration

Python uses metaclasses to auto-register tools and processors at import time. In Node.js/TypeScript we keep the same "it just works" experience, but we make registration deterministic by funneling it through a single bootstrap entrypoint.

### Tools
- Pattern: `registerTools()` (in `src/tools/register-tools.ts`) is called once at startup.
- What it does:
  - Registers functional tools via their `registerXTool()` helpers (which also return a cached instance).
  - Registers class-based tools via `registerToolClass(...)`.
- Where it is called: `AgentFactory` constructor (framework-owned, not user-facing).
- Rationale: avoid user manual steps, keep parity with Python auto-registration, and prevent import-order issues by centralizing registration.

### Processors
- Input processors: explicit registration if used (metaclass removed).
- Tool invocation preprocessors, tool result processors, LLM response processors, lifecycle processors: follow the same explicit registration pattern.

Native system-instruction completion is not a configurable processor category.
During bootstrap, `SystemPromptProcessingStep` directly appends the
platform-owned configured-skill catalog, validates the complete instruction,
and configures the LLM. Agent configuration cannot inject another prompt
mutation or reorder that terminal append.

## 3. Testing Structure

- Unit tests live in `autobyteus-ts/tests/unit/...`.
- Integration tests live in `autobyteus-ts/tests/integration/...`.
- Runner: `pnpm exec vitest --run <test-paths>`.
- Environment: `.env.test` contains API keys and runtime settings for integration tests.
- Policy: tests are migrated from Python to preserve behavior and coverage; avoid dummy tests.
- If integration tests are blocked by unmigrated dependencies or external services, mark them as **Deferred** in `MIGRATION_PROGRESS.md` with a reason.

## 4. Agent Runtime Concurrency (Node.js Design)

Python runs each agent in its own thread and private asyncio event loop. In Node.js we preserve the same isolation and ordering guarantees using an **actor-style mailbox** per agent.

### 4.1 Core Pattern: Actor + Mailbox

- Each agent owns a **single serialized async loop** and a **mailbox (queue)**.
- All agent state mutations happen inside that loop (no shared concurrent mutation).
- External callers submit events by enqueuing into the mailbox (no cross-thread scheduling needed in-process).
- This mirrors Python’s “one thread per agent” semantics without OS threads.

### 4.2 Queue Semantics (Parity with Python)

- Maintain **multiple input queues** (user, inter-agent, tool invocation, tool result, tool approval, internal system).
- Preserve **deterministic priority ordering** (same priority list as Python).
- Implement the two-phase selection (buffered items first; otherwise wait on all queues, buffer completed, cancel pending) to avoid reordering.

### 4.3 Lifecycle Phases

- **Runtime init**: initialize event store, status deriver, input queues.
- **Bootstrap**: run bootstrap steps inside the agent loop (workspace, MCP prewarm, system prompt processing).
- **Main loop**: await next input event, dispatch to handlers, yield to loop.
- **Shutdown**: run shutdown orchestrator inside the agent loop after exit.

### 4.4 When to Use worker_threads

- Use **worker_threads** only for CPU-heavy workloads or hard isolation needs.
- Default remains single-process async loops with mailbox isolation.
- Optional hybrid: shared worker pool for CPU tasks, agents remain in main loop.

### 4.5 Design Goals

- Preserve per-agent isolation and ordering.
- Keep deterministic status transitions and event handling.
- Avoid implicit global state mutation.
  

## 5. Source of Truth for Migration State

- Strategy: `migrate_nodesjs_ticket/MIGRATION_STRATEGY.md`
- Progress tracking: `migrate_nodesjs_ticket/MIGRATION_PROGRESS.md`
- Architecture map: `ARCHITECTURE.md` (with Node.js additions)

## 6. Native CLI / TUI Removed

The TypeScript package no longer owns a native interactive CLI/TUI surface. The
former single-agent console runner and Ink-based agent-team TUI were removed
with `src/cli/**` so `autobyteus-ts` remains a programmatic runtime/library
package.

Supported interaction paths are the programmatic agent/team APIs and the
server/web surfaces. Do not reintroduce `src/cli/**`, `runAgentCli`,
`runAgentTeamCli`, Ink widgets, or CLI/TUI compatibility wrappers without a new
design.

Terminal runtime tooling under `src/tools/terminal/**` is separate from the
removed native UI surface and remains part of the runtime tool subsystem.
