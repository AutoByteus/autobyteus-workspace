# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed / Reused dedicated ticket worktree
- Current Status: Design-ready investigation complete; requirements refined; design spec produced for architecture review
- Investigation Goal: Capture current self-evolution work-trace implementation, clarify the shared Agent Work Trace Projection boundary, and record the first-ticket scope before memory compaction redesign proceeds.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The ticket is a refactor/extraction across self-evolution, agent-memory raw trace reading, run-history projection rendering, filesystem layout, and tests. It intentionally avoids memory compaction behavior changes.
- Scope Summary: Extract the raw-trace-to-readable-work-trace projection from self-evolution-specific ownership into a common subsystem, store derived work traces at `<memoryDir>/work_traces/`, and migrate self-evolution to consume that common projection.
- Primary Questions To Resolve:
  1. Where should the shared Agent Work Trace Projection subsystem live in `autobyteus-server-ts`?
  2. Which current self-evolution DTOs/services should be moved/renamed versus replaced?
  3. How should the path change from `<memoryDir>/self_evolution/work_traces/` to `<memoryDir>/work_traces/` be covered by tests?
  4. Can old self-evolution work trace files be ignored/regenerated because raw traces remain canonical?

## Request Context

The user identified that the raw-trace-to-readable-work-trace transformation is not self-evolution-specific. Memory compaction also needs a readable form of prior agent work before it can compact that work into episodic/semantic/compacted memory. Therefore the first implementation ticket should refactor work traces into a shared subsystem before starting the memory compaction redesign.

User-confirmed direction from the upstream compaction/work-trace design conversation:

- Raw trace remains canonical internal evidence.
- Work trace is a derived, readable, on-demand projection of the agent's work/process.
- Demand sources include self-evolution now and memory compaction later.
- Transform on demand, not continuously on every raw trace write.
- Shared work trace files should be stored under the current target run memory directory at `<memoryDir>/work_traces/`.
- Output file names should remain simple: `work_trace_active.md`, `work_trace_000000.md`, `work_traces_manifest.json`.

Related upstream artifacts from prior compaction investigation:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/compression-current-behavior/tickets/in-progress/compression-current-behavior/compaction-design-assessment.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/compression-current-behavior/tickets/in-progress/compression-current-behavior/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/compression-current-behavior/tickets/in-progress/compression-current-behavior/requirements.md`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection`
- Current Branch: `codex/shared-work-trace-projection`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` succeeded on 2026-07-07 during original bootstrap and succeeded again during resumed solution-design work on 2026-07-07.
- Base SHA At Worktree Creation: `af277ad891dca3a20017314e2a7504571ca9cfe8`
- Current HEAD After Refresh/Fast-Forward: `f2c6643ed94d839a06f662bbfbbd3bc8ca4b9628`
- Current Upstream After Refresh: `origin/personal` @ `f2c6643ed94d839a06f662bbfbbd3bc8ca4b9628`
- Relevant-Code Impact Of Latest Fast-Forward: Latest base includes raw-trace active filename rename (`raw_traces_active.jsonl`) plus ticket/delivery docs. The shared work-trace design remains valid but must explicitly rely on `RawTraceFileSourceService` / canonical raw-trace filename constants and update projection test fixtures away from old `raw_traces.jsonl`.
- Task Branch: `codex/shared-work-trace-projection`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / `origin/personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This task intentionally precedes the memory compaction redesign. Do not start changing compaction semantics in this ticket. Ticket artifacts are untracked in git at investigation time and should remain part of the task branch's durable artifact package.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-07 | Command | `git fetch origin` | Refresh tracked remote refs before creating ticket worktree during original bootstrap | Succeeded; `origin/personal` resolved to `af277ad891dca3a20017314e2a7504571ca9cfe8` | No |
| 2026-07-07 | Command | `git worktree add -b codex/shared-work-trace-projection /Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection origin/personal` | Create mandatory dedicated ticket worktree/branch during original bootstrap | Worktree created and branch tracks `origin/personal` | No |
| 2026-07-07 | Command | `pwd`; `git status --short --branch`; `git rev-parse --show-toplevel`; `git rev-parse HEAD`; `git rev-parse @{u}` | Verify resumed solution-design environment | Current worktree is the dedicated ticket worktree on `codex/shared-work-trace-projection`; HEAD and upstream are both `af277ad891dca3a20017314e2a7504571ca9cfe8`; only ticket artifacts are untracked | No |
| 2026-07-07 | Command | `git fetch origin` from `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection` | Confirm base freshness before deeper investigation/design | Fetch succeeded; `origin/personal` still `af277ad891dca3a20017314e2a7504571ca9cfe8` | No |
| 2026-07-07 | Command | `git log --oneline --decorate --stat HEAD..origin/personal -- autobyteus-server-ts/src/self-evolution autobyteus-server-ts/src/agent-memory autobyteus-server-ts/src/run-history autobyteus-server-ts/tests/self-evolution`; `git merge --ff-only origin/personal` | Check and integrate remote advancement before handoff | Remote had advanced by one docs-only commit (`4bc35319905224d8622256a6cec92c49b21fd969`); no relevant source/test files in inspected paths changed; branch fast-forwarded successfully | No |
| 2026-07-07 | Command | `git fetch origin`; `git log --oneline --decorate --stat HEAD..origin/personal -- autobyteus-server-ts/src/agent-memory autobyteus-server-ts/src/self-evolution autobyteus-server-ts/src/run-history autobyteus-server-ts/tests autobyteus-ts/src/memory`; `git merge --ff-only origin/personal` | Respond to user report that `origin/personal` changed active raw trace naming | Worktree was behind by 3 commits; fast-forwarded to `f2c6643ed94d839a06f662bbfbbd3bc8ca4b9628`. Relevant commit `33305e40` renames canonical active raw trace file to `raw_traces_active.jsonl`; self-evolution work-trace projection test fixtures were updated upstream to write `raw_traces_active.jsonl` while still expecting old self-evolution work-trace output path until this ticket changes it. | Update design artifacts for active filename alignment |
| 2026-07-07 | Code | `autobyteus-ts/src/memory/store/memory-file-names.ts` | Verify canonical raw trace file constant after latest base update | Exports `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME = 'raw_traces_active.jsonl'`; old ambiguous active filename constant is removed from steady-state source | Shared source reader should not hardcode old filename |
| 2026-07-07 | Code | `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | Verify current raw trace file source boundary after latest base update | Active source uses `RunMemoryFileStore.getRawTracesPath()` and reports `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME`; chronological ordering still returns complete segments then active source | Shared work-trace source reader can stay behind this boundary |
| 2026-07-07 | Doc | `autobyteus-server-ts/docs/modules/agent_memory.md` | Check durable docs for active raw trace contract | Docs state runtime steady state reads/writes only `raw_traces_active.jsonl`; old `raw_traces.jsonl` is migration-only, not compatibility alias | Design must reject old-filename fallback |
| 2026-07-07 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/bootstrap-handoff.md` | Understand ticket origin and prior scope | Confirms shared work-trace projection should precede memory compaction redesign; records target disk layout and non-goals | No |
| 2026-07-07 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/requirements.md` | Resume requirements basis | Existing requirements were Draft and correctly identified shared extraction scope; refined to Design-ready | No |
| 2026-07-07 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/compression-current-behavior/tickets/in-progress/compression-current-behavior/compaction-design-assessment.md` | Preserve upstream compaction rationale without changing compaction now | Confirms follow-up compaction should use file-backed work traces and that shared `<memoryDir>/work_traces/` is preferred | No |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts` | Identify current work-trace orchestration owner | Self-evolution service reads raw trace sources, renders Markdown, writes trace files/manifest, reuses unchanged archive projections, and computes summary hash | Move/rename/generalize into shared owner |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts` | Identify current disk layout and file naming | Store writes to `<memoryDir>/self_evolution/work_traces/`; file names already match desired common convention | Change root path to `<memoryDir>/work_traces/` under shared store |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts` | Understand raw trace rendering behavior | Renderer builds historical replay events and renders readable Markdown for messages, reasoning, tools, errors/results, and compaction boundaries; title is self-evolution-specific | Move/rename/generalize; preserve semantics but use shared title |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-redactor.ts` | Check redaction behavior | Redacts auth tokens/secrets/emails/backend fields and truncates rendered text | Move/rename as shared rendering concern |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/domain/work-traces.ts` | Identify self-evolution-specific domain types | Work trace source/file/manifest/package types are self-evolution-prefixed but mostly general; they import `SelfEvolutionTargetRef` | Move/rename to shared work-trace domain with shared target/context type |
| 2026-07-07 | Code | `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts` | Understand raw trace source reading | Reader lists active/archive raw trace files, fingerprints records, returns self-evolution-specific source DTOs, and imports self-evolution context/types from `agent-memory` | Move/rename into shared work-traces subsystem; keep dependency on raw trace file service |
| 2026-07-07 | Code | `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | Understand underlying raw trace file boundary | Lists active and archived raw trace source files, reads selected file records, normalizes raw trace records | Reuse from shared work-trace source reader |
| 2026-07-07 | Code | `autobyteus-server-ts/src/agent-memory/services/raw-trace-record-normalizer.ts` | Verify snake_case raw trace normalization | Converts raw JSONL fields (`trace_type`, `tool_call_id`, etc.) into `MemoryTraceEvent` | Preserve reuse via `RawTraceFileSourceService` |
| 2026-07-07 | Code | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Understand transformation from raw trace records to readable events | Existing transformer converts user/assistant/reasoning/tool/provider_compaction_boundary records into historical replay events and merges tool calls/results | Reuse as shared projection internals |
| 2026-07-07 | Code | `autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts` | Confirm event shape renderer consumes | Event union covers message, reasoning, tool, and compaction events | No |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | Verify self-evolution consumer sequence | Calls `workTraceProjectionService.ensureCurrent(context)` before launching/posting to companion and stores `summaryHash` as evidence hash | Update import/dependency type to shared projection service |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts` | Verify trigger request type dependency | `SelfEvolutionCompanionTriggerRequest.workTracePackage` imports self-evolution work trace package type | Update to shared `AgentWorkTracePackage` type |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Verify self-evolution consumer contract | Companion prompt already sends work trace manifest/root/file paths, not inline trace content; metadata keys are self-evolution-specific state keys | Update shared paths/types only; keep path-only behavior |
| 2026-07-07 | Test | `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` | Identify existing projection coverage | Tests assert old `<memoryDir>/self_evolution/work_traces/` path, renderer content, backend-field hiding, archived+active backfill, and unchanged archive reuse | Move/update to shared projection tests and assert `<memoryDir>/work_traces/` |
| 2026-07-07 | Test | `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` | Identify consumer coverage | Tests build path-only companion messages and session state using old self-evolution work trace paths | Update mocked paths to shared root and keep metadata assertions |
| 2026-07-07 | Test | `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` | Identify self-evolution orchestration coverage | Tests mock projection service and verify refreshed work traces before each companion trigger | Update dependency type/mocked paths to shared package |
| 2026-07-07 | Command | `pnpm exec vitest run tests/self-evolution/self-evolution-work-trace-projection-service.test.ts --runInBand` from `autobyteus-server-ts` | Attempt focused baseline test execution | Failed before execution: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`; no `node_modules` present in worktree | Downstream validation should install dependencies or use standard repo setup before running tests |
| 2026-07-07 | Command | `find . -maxdepth 3 -type d -name node_modules`; `test -x node_modules/.bin/vitest` | Confirm why focused test command failed | No local `node_modules` / vitest binary found | No for design; yes for validation setup |
| 2026-07-07 | Command | `rg -n "SelfEvolutionWorkTrace|workTracePackage|RawTraceWorkTraceSourceReader|self_evolution_work_trace" autobyteus-server-ts/src autobyteus-server-ts/tests` | Locate production/test references | References are concentrated in self-evolution work-trace files, `agent-memory` source reader, self-evolution service/session/message builder, and tests | Implementation should update/remove these cleanly |
| 2026-07-07 | Command | `find autobyteus-server-ts/src -maxdepth 2 -type d` and targeted tree listings | Understand codebase folder conventions | Top-level capability-area folders are common; `agent-memory`, `run-history`, and `self-evolution` are separate subsystems | Design can create a new `agent-work-traces` capability area |
| 2026-07-07 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Apply required shared design language | Design must be spine-first, ownership-first, no compatibility wrappers, explicit removals, dependency rules, and boundary-bypass prevention | No |
| 2026-07-07 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | Use example shapes for runtime/shared-boundary design clarity | Examples reinforce explicit spines, main-line owners, off-spine concerns, thin facade distinction, and avoiding generic mixed-subject surfaces | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: self-evolution requests a current work trace package for a target run via `SelfEvolutionWorkTraceProjectionService.ensureCurrent(context)`.
- Current execution flow:

```text
SelfEvolutionService.startFromEvolutionRequest
  -> SelfEvolutionWorkTraceProjectionService.ensureCurrent
  -> RawTraceWorkTraceSourceReader.listSources
  -> RawTraceFileSourceService.listFiles/readSource
  -> buildHistoricalReplayEvents
  -> SelfEvolutionWorkTraceRenderer.renderSource
  -> SelfEvolutionWorkTraceStore.writeTraceFile/writeManifest
  -> SelfEvolutionCompanionTriggerMessageBuilder sends manifest/root/file paths
```

- Ownership or boundary observations:
  - The projection itself is generic: raw trace records become readable work trace Markdown.
  - The current owner/path is self-evolution-specific, which will force memory compaction either to depend on self-evolution internals or duplicate the renderer/store/source DTOs.
  - `RawTraceWorkTraceSourceReader` currently sits under `agent-memory` but imports self-evolution types, which makes a low-level memory service depend on a feature owner.
  - `raw-trace-to-historical-replay-events.ts` is already outside self-evolution and acts as a reusable transformation building block.
  - Self-evolution's companion prompt is already correctly path-only and should remain a consumer, not the projection owner.
- Current behavior summary: Self-evolution gets an evidence package by projecting raw traces into Markdown work trace files under a self-evolution-specific folder and sending file paths to the companion agent.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / shared capability extraction
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness
- Refactor posture evidence summary: The current projection files own a capability needed by more than self-evolution, but their types, paths, and store location make self-evolution the apparent authoritative owner. The source reader also creates a mixed-level dependency by importing feature-specific types from `agent-memory`.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `SelfEvolutionWorkTraceProjectionService` | Generic orchestration is self-evolution-named and located under `self-evolution/services/work-traces` | Wrong owner for shared raw-trace-to-readable-work-trace capability | Extract shared service |
| `SelfEvolutionWorkTraceStore.getWorkTraceRootPath` | Writes under `self_evolution/work_traces` | Disk layout encodes self-evolution ownership | Move derived cache to `<memoryDir>/work_traces/` |
| `RawTraceWorkTraceSourceReader` | Located under agent-memory but imports self-evolution domain/context types | Mixed-level dependency into feature-specific types | Move/rename and depend on shared work-trace domain/context |
| `SelfEvolutionWorkTraceRenderer` | Uses general historical replay transformer and general readable rendering | Renderer semantics are not self-evolution-specific; title still is | Move/rename as shared renderer and generalize title |
| Future compaction design | Needs readable work traces before compacting into memory | Duplicating renderer would create duplicated policy/coordination | Build shared boundary first |
| Projection tests | Current durable coverage asserts old self-evolution-specific path | Tests will fail after clean-cut path move unless intentionally updated | Replace/update coverage |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts` | Orchestrates work trace projection for self-evolution | Core orchestration is generally useful; owns archive reuse and summary hash | Move/rename to shared `AgentWorkTraceProjectionService` |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts` | Writes work trace files and manifest | Uses desired file names but wrong root path | Shared store should write `<memoryDir>/work_traces/` |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts` | Renders source records to Markdown | Uses generic historical replay events; heading is self-evolution-specific | Move/rename; generalize heading |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-redactor.ts` | Redacts rendered content | Shared rendering concern | Move/rename as shared redactor |
| `autobyteus-server-ts/src/self-evolution/domain/work-traces.ts` | Defines self-evolution work trace DTOs | DTOs are shared projection shapes but import `SelfEvolutionTargetRef` | Move/rename to shared domain types |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts` | Reads raw trace files and builds work trace sources | Imports self-evolution domain/context | Move into shared work-trace subsystem; keep raw trace file service as dependency |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-file-source-service.ts` | Lists and reads active/archived raw trace files | Correct raw-trace owner; already supports chronological order | Reuse; do not duplicate raw trace file listing |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Converts raw trace records to historical replay events | Already shared-ish | Reuse; avoid duplicating this logic |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | Starts self-evolution and requests projection before companion trigger | Consumer sequence is correct but imports self-evolution projection class | Switch to shared projection service |
| `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts` | Defines trigger request/session types | `workTracePackage` type is self-evolution-specific | Switch to shared package type |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Sends work trace paths to companion agent | Consumer behavior is correct path-based model | Keep behavior; update types/paths in tests |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` | Projection behavior tests | Should become shared projection tests | Move/update to new shared test location |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` | Self-evolution path-only prompt/session tests | Must assert shared path consumption | Update mocks/assertions |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` | Self-evolution orchestration tests | Must type/mock shared package | Update mocks/assertions |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-07 | Static inspection | `sed`/`nl`/`rg` over current work-trace files and tests | Current behavior and dependency shape are evident from source and tests | Design can proceed without runtime setup |
| 2026-07-07 | Test attempt | `pnpm exec vitest run tests/self-evolution/self-evolution-work-trace-projection-service.test.ts --runInBand` | Failed before tests due missing `vitest` binary / absent local dependencies | Downstream implementation validation must install/use normal dependency setup |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Not applicable.
- Why it matters: Not applicable.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation.
- Required config, feature flags, env vars, or accounts: None identified for design investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `git fetch origin`
  - Original bootstrap: `git worktree add -b codex/shared-work-trace-projection /Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection origin/personal`
- Dependency setup: No `node_modules` were present; no install was performed during solution design.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Shared Concept

The desired shared concept is **Agent Work Trace Projection**:

```text
canonical raw trace records
  -> historical replay events
  -> readable Markdown work traces
  -> shared work trace manifest/package
  -> consumers: self-evolution now, memory compaction later
```

### Disk Layout Decision

Target common location:

```text
<memoryDir>/work_traces/
  work_traces_manifest.json
  work_trace_active.md
  work_trace_000000.md
  work_trace_000001.md
```

Current self-evolution-only location to replace:

```text
<memoryDir>/self_evolution/work_traces/
```

### Naming Decision

- Code/domain capability: `AgentWorkTraceProjection` / `AgentWorkTraceProjectionService` / `AgentWorkTracePackage` are good names.
- File names: keep `work_trace_*` and `work_traces_manifest.json`; no `agent_` prefix.
- Markdown title should be shared/generic, not `Self-Evolution Work Trace`.

### On-Demand Projection Decision

Do not transform continuously on every raw trace write. Transform on demand when a consumer asks:

```text
self-evolution demand -> shared projection
memory compaction demand -> shared projection later
```

### Raw Trace Canonicality

Raw trace remains canonical. On the latest base, the canonical active raw trace file is `raw_traces_active.jsonl`; old `raw_traces.jsonl` is migration-only and not a steady-state read fallback. Work traces are derived artifacts/cache. Therefore old feature-specific work trace files are regenerable and should not require migration or dual writes unless later evidence shows an external reader; no such repository-local reader was found during this investigation.

### Test Baseline Constraint

Focused test execution was attempted but could not start because the ticket worktree lacks installed Node dependencies. This is an environment/setup constraint, not a source-code finding.

## Constraints / Dependencies / Compatibility Facts

- Self-evolution currently expects a `workTracePackage` containing `manifestPath`, `workTraceRootPath`, `manifest.files`, and `summaryHash`.
- The prompt/metadata contract in `SelfEvolutionCompanionTriggerMessageBuilder` is already path-based and should be preserved.
- Existing file names are already acceptable; only disk root and ownership need to change.
- The raw trace reader currently takes `SelfEvolutionTargetContext`, so a shared minimal context/input type is needed.
- The source DTO currently lives in `self-evolution/domain/work-traces.ts`, so shared DTO extraction is required to avoid dependency inversion.
- No backward-compatibility dual path is required for old generated work trace files because raw traces remain canonical and projection is on demand.

## Open Unknowns / Risks

- Existing tests assert old work-trace path strings and will require clean-cut updates. Projection test fixtures on latest base already use `raw_traces_active.jsonl` and should keep doing so.
- If any external non-repository consumer expects `<memoryDir>/self_evolution/work_traces/`, that was not visible in code search. The design intentionally avoids steady-state dual writes.
- Memory compaction redesign is intentionally deferred; do not add compaction-specific fields to shared work trace artifacts during this ticket.
- Dependency installation/test runtime is not prepared in the current worktree; validation stage must handle setup.

## Notes For Architect Reviewer

Architecture review should focus on:

- whether the shared projection owner is correctly placed outside self-evolution;
- whether dependency direction avoids self-evolution becoming an implicit shared library;
- whether `agent-memory` remains the raw-trace owner without importing shared/self-evolution projection types;
- whether the old self-evolution-owned path/classes are removed rather than retained as a second authoritative path;
- whether the disk layout cleanly represents work traces as per-run derived artifacts under `<memoryDir>/work_traces/`;
- whether the design avoids adding compaction-specific fields before the later memory compaction ticket.
