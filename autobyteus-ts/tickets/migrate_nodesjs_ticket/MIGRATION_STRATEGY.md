# Migration Strategy: Python to Node.js

This document outlines the strategy for migrating `autobyteus` from Python to Node.js.

## 1. Goal

Convert the existing Python-based agentic framework to a modern Node.js/TypeScript architecture while maintaining feature parity and architectural integrity.

## 2. Technology Stack

| Component      | Python (Current)     | Node.js (Target)          | Rationale                                                   |
| -------------- | -------------------- | ------------------------- | ----------------------------------------------------------- |
| **Language**   | Python 3.11+         | **TypeScript**            | Static typing, better tooling for complex logic.            |
| **Validation** | Pydantic             | **Zod**                   | Runtime validation, type inference, similar DX to Pydantic. |
| **Testing**    | Pytest               | **Vitest**                | Fast, modern, compatible with Jest API, good TS support.    |
| **TUI**        | Textual / Rich       | **Ink** (React for CLI)   | Component-based, reactive UI model similar to Textual.      |
| **PTY**        | Python `pty` / `asyncio` + OS tools | **node-pty** (primary) | De-facto Node.js PTY implementation; used by VS Code and others. citeturn1search0 |
| **HTTP**       | Aiohttp / Requests   | **Axios** / Native Fetch  | Standard industry HTTP clients.                             |
| **LLM SDKs**   | Official Python SDKs | **Official Node.js SDKs** | Direct equivalents available for OpenAI, Anthropic, Google. |

## 3. Migration Phasing

### Phase 1: Foundation & Core Utilities

- **Goal**: Establish the project structure and migrate shared types/helpers.
- **Tasks**:
  - Initialize `package.json`, `tsconfig.json`.
  - Setup ESLint, Prettier, Vitest.
  - Create `src/core` and `src/utils` directories.
  - Migrate simple helper functions and data structures.

### Phase 2: LLM Interface

- **Goal**: Enable the system to talk to AI models.
- **Tasks**:
  - implementations of `BaseLLM` interface.
  - specialized wrappers for OpenAI, Anthropic, Google Vertex.
  - Streaming handling (parsing chunks).

### Phase 3: Core Engine & Event Loop

- **Goal**: Replicate the event-driven architecture.
- **Tasks**:
  - Implement `EventBus` and `Queue` logic.
  - Implement the Agent Runtime/Lifecycle loop.
  - Ensure async concurrency equivalence (Python `asyncio` -> Node.js Event Loop).
  - Follow the **Actor + Mailbox** runtime design documented in `docs/nodejs_architecture.md` (per-agent serialized async loop, priority queues, bootstrap inside loop, shutdown orchestrator inside loop).

### Phase 4: Capabilities (Tools & Skills)

- **Goal**: Allow agents to affect the world.
- **Tasks**:
  - Port standard tools (File I/O, Terminal, etc.).
  - Implement the Tool Schema generation (Zod -> JSON Schema).

### Phase 5: TUI & CLI

- **Goal**: User interface.
- **Tasks**:
  - Rebuild the dashboard using Ink.

### Out of Scope (Explicitly Skipped)

- **RPC module** (`autobyteus/rpc`): removed from the Python codebase; will not be migrated.
- **Workflow module** (`autobyteus/workflow`): not used in current runtime; will not be migrated.

## 4. Workflow

> [!WARNING]
> **One File at a Time & Test-Driven**:
>
> 1. Migrate **one file**.
> 2. **Find and Migrate** its corresponding **tests** (Unit & Integration). Do not write new tests from scratch unless coverage is missing.
> 3. **Verify** it passes before moving to the next file.
>
> **Integration Tests One File at a Time**:
> - When a file has integration coverage in Python, create the matching Node.js integration test **in the same step** as the file migration.
> - Avoid batching multiple unrelated integration tests together; keep changes scoped to the current file/module.
> - **Run integration tests one file at a time.** Execute a single test file, fix failures, then move to the next file.
>
> **Strict Test Parity**:
>
> - Integration tests MUST use the **exact same LLM model name** as the original Python tests (e.g., if Python uses `gpt-5.2`, TS uses `gpt-5.2`).
> - Do not downgrade models (e.g., to `3.5-turbo`) unless strictly necessary for debugging.
>
> **Order of Operations**:
>
> 1. Core Interfaces (`BaseLLM`, `LLMModel`) - **Done**
> 2. **Tools Module** (`Tools`, `ToolRegistry`, `Formatters`) - **CRITICAL PREREQUISITE**
> 3. Providers (`OpenAI`, `Anthropic`) - Depend on Tools for function calling tests.

1.  **Pick a component** (refer to `MIGRATION_PROGRESS.md`).
2.  **Analyze** the Python source.
3.  **Research Dependencies**:
    > [!IMPORTANT]
    > For every Python library (especially LLM-related), do not guess. **Use the `search_web` tool** to find the most active, equivalent, and well-maintained Node.js counterpart. Document this choice in `MIGRATION_PROGRESS.md`.
4.  **Port** code to TypeScript using the mapped patterns.
5.  **Test** using Vitest (shadowing original Pytest cases).
6.  **Record** progress in `MIGRATION_PROGRESS.md`.
    - Update **Unit Tests** and **Integration Tests** columns for the file.
    - If tests are blocked by unmigrated dependencies, mark them **Deferred** with a short reason.
7.  **Commit**:
    > [!WARNING]
    > **Strict Commit Scope**:
    > Only commit files within the `autobyteus-ts` directory (and relevant migration docs).
    > NEVER use `git add .` or `git add -A`.
    > ALWAYS use `git add <file_path>` for specific files.

## 5. Common Migration Patterns

This reference maps common Python patterns to their Node.js/TypeScript equivalents.

### Singleton Pattern

| Python (Metaclass)                                             | TypeScript (Static Method)                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| Uses `class SingletonMeta(type): ...` to intercept `__call__`. | Uses `private static instance` and `public static getInstance()`. |

**Example (Inheritance Pattern):**

Use the `Singleton` generic base class (migrated to `src/utils/singleton.ts`) to avoid code duplication.

```typescript
import { Singleton } from "@/utils/singleton";

// 1. Inherit from Singleton
class MyService extends Singleton {
  public doSomething() {
    console.log("Service logic");
  }
}

// 2. Use getInstance()
const instance = MyService.getInstance();
```

### Tool Registration (Python MetaClass → Node.js Composition Root)

Python uses `ToolMeta` to auto-register tools at class definition time. In Node.js/TypeScript we avoid implicit
side effects on import and instead register tools explicitly at application bootstrap.

**Recommended pattern (best practice):**

1. Create a **composition root** that imports tool modules and registers them once.
2. Call this registration function during app startup (before tool usage and before LLM prompt construction).

**Example:**

```typescript
// src/tools/register_tools.ts
import { defaultToolRegistry } from './registry/tool_registry.js';
import { ToolDefinition } from './registry/tool_definition.js';
import { ToolOrigin } from './tool_origin.js';
import { MyTool } from './my_tool.js';

export function registerTools(): void {
  defaultToolRegistry.registerTool(new ToolDefinition(
    MyTool.getName(),
    MyTool.getDescription(),
    ToolOrigin.LOCAL,
    'general',
    () => MyTool.getArgumentSchema(),
    () => MyTool.getConfigSchema(),
    { toolClass: MyTool }
  ));
}
```

**When to call:**
- CLI entrypoint / server bootstrap, before creating any agent runtime or tool manifests.
- Do **not** call inside tool classes to avoid import‑order cycles.

### Processor Registration (Python MetaClass → Node.js Composition Root)

Python processor registries (system prompt, tool invocation preprocessors, tool result processors, LLM response processors, lifecycle processors) often rely on metaclasses to auto-register at class definition time. In Node.js/TypeScript, avoid import side effects and register processors explicitly at application bootstrap.

**Recommended pattern (best practice):**

1. Create a **composition root** that imports processor classes and registers them once.
2. Call this registration function during app startup (before agent runtime construction).

**Example (system prompt processors):**

```typescript
// src/agent/system_prompt_processor/register_system_prompt_processors.ts
import { defaultSystemPromptProcessorRegistry } from './processor_registry.js';
import { ProcessorDefinition } from './processor_definition.js';
import { ToolManifestInjectorProcessor } from './tool_manifest_injector_processor.js';
import { AvailableSkillsProcessor } from './available_skills_processor.js';

export function registerSystemPromptProcessors(): void {
  defaultSystemPromptProcessorRegistry.registerProcessor(
    new ProcessorDefinition(ToolManifestInjectorProcessor),
  );
  defaultSystemPromptProcessorRegistry.registerProcessor(
    new ProcessorDefinition(AvailableSkillsProcessor),
  );
}
```

**When to call:**
- CLI entrypoint / server bootstrap, before agent bootstrap steps run.
- Do **not** call inside processor classes to avoid import‑order cycles.

### Browser Tools (brui_core dependency)

Browser‑related tools that depend on `brui_core` are **not** being migrated to Node.js.
They will be externalized to MCP instead. Keep these tools marked as skipped/deferred
in the migration progress and do not port their implementations.

### Terminal / PTY Implementation (Node.js)

**Primary choice:** `node-pty`. It is the standard PTY library for Node.js and is used in production by VS Code and other terminal integrations. citeturn1search0

**Prebuilt-only alternatives (optional):**
- `@lydell/node-pty` — fork with prebuilt binaries only (no node-gyp builds) and ConPTY-only Windows support. citeturn0search1
- `@homebridge/node-pty-prebuilt-multiarch` — fork providing prebuilt binaries across more architectures/targets. citeturn0search0

**Decision:** Use `node-pty` as the default backend. On Windows, `run_bash` runs inside WSL by spawning `wsl.exe` + bash through `node-pty` (no tmux). If install-time native builds become a blocker, consider switching to a prebuilt fork and update this strategy and dependency map accordingly.

**Build note:** `pnpm` blocks native build scripts by default. Run `pnpm approve-builds` and allow `node-pty` before running PTY-based integration tests.

## 6. Design Pattern Adaptations (Python-only Features)

Some Python patterns have no direct TypeScript equivalent (e.g., metaclasses, dynamic attributes,
descriptor protocols, magic methods). When this happens:

1. **Document the adaptation** in this strategy file (append to the list below).
2. **Record impacted files** and the rationale/tradeoffs.
3. **Keep behavior parity** as the highest priority unless explicitly agreed otherwise.

**Adaptation Log (append newest at top):**
- 2026-01-27 — Lifecycle event processors no longer auto-register via Python metaclass; Node.js uses explicit registration via `LifecycleEventProcessorRegistry` (no import-time side effects).
- 2026-01-27 — Sentinel headers that use legacy `run_terminal_cmd` are mapped to `SegmentType.RUN_BASH` so internal segment types remain consistent with the Node.js tool naming (`run_bash`). Sentinel extraction will surface `run_bash` for that legacy header.
- 2026-01-26 — Python system prompt processor metaclass auto-registration is replaced by explicit `registerSystemPromptProcessors()` calls in the composition root. No side-effect registration on import in Node.js.
- 2026-01-26 — Python ABC enforcement for system prompt processors (abstract class instantiation errors) is emulated via runtime constructor checks in `BaseSystemPromptProcessor` because TypeScript abstract methods do not emit runtime guards.
- 2026-01-26 — Python `WorkspaceConfig` relies on `__hash__`/`__eq__` for dict-key caching; JavaScript `Map` keys are identity-based, so the Node.js version exposes `hash()`/`equals()` and caches should key on the hash value instead.
- 2026-01-26 — Added `MultimediaProvider.AUTOBYTEUS` to reflect provider values returned by Autobyteus model discovery endpoints.
- 2026-01-26 — Remote multimedia parameter schemas can declare ENUM types without enum values; `ParameterSchema.fromConfig` now downgrades those to STRING to avoid discovery failures when pulling model metadata from Autobyteus servers.
- 2026-01-26 — Python `PIL.Image` objects from multimedia `load_image_from_url` are represented as `Buffer` data in Node.js. Callers are responsible for converting buffers to SDK-specific image payloads.
- 2026-01-26 — MCP TypeScript SDK APIs vary across versions; managed server transports use a loader with fallback export names (`Client`, `Stdio/StreamableHttp/WebSocket` transports) to stay compatible without hard pinning.
- 2026-01-26 — Python `AsyncExitStack`/context managers in MCP managed servers are replaced with an explicit cleanup stack in Node.js (`registerCleanup` + `try/finally` in `BaseManagedMcpServer`), ensuring deterministic teardown without language-level context managers.
- 2026-01-26 — BaseTaskPlan now extends the custom EventEmitter (EventManager-backed) to match Python event dispatch semantics.
- 2026-01-26 — Python `EventManager` inspects listener signatures to pass kwargs; Node.js lacks reliable runtime signature introspection, so listeners are invoked with `(payload, metadata)` where metadata includes `event_type`, `object_id`, and any extra fields. Listeners should read named fields from the metadata object when needed.
- 2026-01-26 — Pydantic schema conversion is replaced by a Zod-based converter (`zodToParameterSchema`) to generate `ParameterSchema` from Zod object schemas.
- 2026-01-26 — `@tool` schema inference relies on Python type hints; TypeScript lacks runtime type metadata, so the Node.js `tool()` helper accepts explicit `paramTypeHints`/`paramDefaults` to build `ParameterSchema`, defaulting to `STRING` when absent.
- 2026-01-26 — Python functional tools use keyword arguments; Node.js uses positional calls, so `FunctionalTool` invokes the wrapped function with positional args in signature order (including `context` and `tool_state` when present).
- 2026-01-26 — `ToolMeta` metaclass auto-registration has no direct TypeScript equivalent; tools are registered explicitly via `ToolRegistry`/`ToolDefinition` (no automatic class registration yet).
- 2026-01-26 — `ToolConfig` used Python `__bool__`/`__len__`; Node.js objects are always truthy, so we added `isEmpty`/`hasParams` and `size`/`length` accessors in `src/tools/tool_config.ts` and mirrored the behavior in tests.

## 6. Testing Strategy

> [!IMPORTANT]
> **Unit vs Integration**:
> We must maintain the distinction between Unit and Integration tests.
>
> - **Unit Tests** (`tests/unit/**/*`): Mock all external dependencies (API calls, network, disk). Fast and reliable.
> - **Integration Tests** (`tests/integration/**/*`): Real API calls. Slower, require environment variables.

### Environment Setup (`conftest.py` equivalent)

In Node.js/Vitest, we replace `conftest.py` with a global **setup file**.

1.  **File**: `tests/setup.ts`
2.  **Config**: `vitest.config.ts` points to this file.
3.  **Behavior**: Loads `.env.test` using `dotenv` before any test runs.

```typescript
// tests/setup.ts
import dotenv from "dotenv";
import path from "path";

// Load .env.test from root
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
```

### How to Run Tests (Node.js / Vitest)

Run tests from the `autobyteus-ts` directory:

```bash
cd autobyteus-ts
```

**Unit tests only**:

```bash
npx vitest --run tests/unit
```

**Integration tests (LLM + multimedia + tools)**:

```bash
npx vitest --run tests/integration
```

**Important integration-test notes (parity with Python):**
- Image generation calls can be slow; use per-test timeouts (e.g., `timeout: 60000`) for OpenAI/Gemini image tests.
- Gemini image **input-image** tests behave differently by runtime/region:
  - **API key runtime** (AI Studio): input-image test should run and succeed.
  - **Vertex runtime**: input-image can fail in EU regions; in US regions it is expected to work. We skip that specific test under Vertex in this repo because the configured region is EU, while still running the base generation test.
- Integration tests are expected to run when API keys are present in `.env.test`. If keys are missing, tests should skip rather than fail.
  - **Current repo configuration**: Gemini API-key runtime is not used; integration tests are run with Vertex credentials (`VERTEX_AI_PROJECT`, `VERTEX_AI_LOCATION`). Expect the Gemini input-image test to be skipped under Vertex.
- Autobyteus client integration tests are gated by `AUTOBYTEUS_RUN_CLIENT_TESTS=1` to avoid flaky server-side timeouts; enable when you want to validate live generation endpoints.

**Integration tests only**:

```bash
npx vitest --run tests/integration
```

**Single test file**:

```bash
npx vitest --run tests/unit/tools/tool_config.test.ts
```

**Single test by name**:

```bash
npx vitest --run tests/unit/tools/tool_config.test.ts -t "test_tool_config_creation_empty"
```

> Note: `package.json` currently does not provide a `test` script, so use `npx vitest` directly.
> If you're using pnpm, prefer `pnpm exec vitest --run ...` equivalents.

## 7. Verification
