# Design Impact: Self-Evolution Work Trace Layout Simplification

## Status
Design impact / implementation rework required.

## Trigger
API/E2E Round 3 observed live self-evolution work-trace storage under:

```txt
<memoryDir>/self_evolution/targets/<targetKey>/work_traces/
<memoryDir>/self_evolution/targets/<targetKey>/companion.json
```

Example target key included both a readable run id and a hash:

```txt
agent_run_<run-id>_<hash>
```

User questioned why the target key and `targets/` folder exist when the state is already nested under the target run/member memory directory.

## Decision
The user concern is valid. The implemented layout is over-nested relative to the finalized design direction.

Because `SelfEvolutionTargetContext.memoryDir` is already the target-specific memory directory, self-evolution evolver-session/work-trace state should live directly under that target memory directory:

```txt
<memoryDir>/self_evolution/work_traces/work_trace_000001.md
<memoryDir>/self_evolution/work_traces/work_trace_active.md
<memoryDir>/self_evolution/work_traces/work_traces_manifest.json
<memoryDir>/self_evolution/evolver_session.json
```

Do not include:

```txt
self_evolution/targets/<targetKey>/...
```

## Rationale
- Standalone target memory is already scoped by `memory/agents/<runId>/`.
- Team member target memory is already scoped by its member run memory directory.
- Adding `targets/<targetKey>` repeats the same identity and makes paths longer/harder to read.
- The hash was originally useful for a global `memory/self_evolution/targets/<key>` layout, but the implementation is target-memory-scoped, so the hash is no longer needed for path safety or uniqueness.
- The manifest/state can keep the explicit target object for audit. A hash-based `safeKey` should not be a path segment in this layout.

## Implementation Impact
Update:
- `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts`
  - `getWorkTraceRootPath(context)` should return `path.join(context.memoryDir, "self_evolution", "work_traces")`.
- `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-store.ts`
  - `getTargetRootPath(context)` should return `path.join(context.memoryDir, "self_evolution")` or remove the target-root method and resolve `evolver_session.json` directly under that folder.
- `autobyteus-server-ts/src/self-evolution/domain/work-traces.ts`
  - Remove path-level dependency on `buildSelfEvolutionTargetKey().safeKey`.
  - Keep target identity in manifest/package via `target`; remove `targetKey` from persisted manifest/state/package unless another non-path owner demonstrably needs it.
- `SelfEvolutionCompanionSessionService` and `SelfEvolutionWorkTraceProjectionService`
  - Stop using target key for path identity; if summary hashing needs identity, hash the structured `target` object internally without exposing a path key.
- Tests/docs/API-E2E expectations should be updated to the simplified paths.

## Expected Path Shape

```txt
<memoryDir>/self_evolution/
  evolver_session.json
  work_traces/
    work_traces_manifest.json
    work_trace_000001.md
    work_trace_000002.md
    work_trace_active.md
```

## Review Note
This is a design correction, not a new requirement. It aligns implementation with the user's repeated requirement that work trace storage mirror the raw trace layout and stay simple.

Additional naming refinement from the follow-up user review: the persisted state file should be named `evolver_session.json`, not `companion.json`, because it stores backend session/checkpoint state for the self-evolver rather than the companion itself.
