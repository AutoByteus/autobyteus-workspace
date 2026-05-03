# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; design-ready requirements produced.
- Investigation Goal: Identify where Claude Code Agent SDK read-only file events are being classified as Artifacts rows and define the correct fix/validation path.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The code change is likely small, but the affected data-flow crosses Claude event normalization, shared run-file-change classification, live websocket emission, persisted `file_changes.json`, historical hydration, and frontend rendering.
- Scope Summary: Prevent read-only Claude SDK file reads from becoming run-file-change/artifact rows while preserving activity events, Claude file mutation rows, generated-output rows, and Codex behavior.
- Primary Questions To Resolve:
  - Which event/data shape is produced for Claude `Read` events? **Resolved.** `ClaudeSessionEventConverter` emits `TOOL_EXECUTION_STARTED` / `TOOL_EXECUTION_SUCCEEDED` with `tool_name: "Read"` and `arguments.file_path`.
  - Where does the system derive the artifact list from run events? **Resolved.** `RunFileChangeService` emits `FILE_CHANGE_UPDATED`; frontend `fileChangeHandler` writes to `runFileChangesStore`; `ArtifactsTab` renders `runFileChangesStore.getArtifactsForRun(...)`.
  - Does the false classification happen in Claude-specific mapping, shared backend projection, frontend projection, or UI rendering? **Resolved.** The false classification happens in shared backend generated-output discovery, not frontend rendering.
  - What executable test can reproduce the bug with logged event details? **Resolved.** A focused converter-to-service probe reproduced the false `FILE_CHANGE_UPDATED` event and is stored under this ticket's `probes/` folder.

## Request Context

User reports that many `Read` files are showing in the right `Artifacts` area for Claude Code Agent SDK runs. Screenshots show multiple left-side `Read` activity events and the `Artifacts` tab listing source files such as `server.py`, `README.md`, `runner.py`, `config.py`, and tests. User states Codex works correctly and asks for analysis plus an E2E or focused test that reads files and logs events.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts`
- Current Branch: `codex/claude-read-artifacts`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-03.
- Task Branch: `codex/claude-read-artifacts`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts are in this dedicated ticket worktree, not the original `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout. `pnpm install --offline --frozen-lockfile` was run in the worktree to allow focused Vitest probes/checks; generated `node_modules/` is ignored.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-03 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git branch --show-current; git rev-parse --abbrev-ref --symbolic-full-name @{u}; git remote show origin` | Bootstrap environment discovery | Original checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal` tracking `origin/personal`; untracked `.claude/` exists in original checkout. Remote default/integration branch is `personal`. | No |
| 2026-05-03 | Command | `git worktree list --porcelain; git fetch origin --prune` | Check existing worktrees and refresh remote refs before creating task worktree | No existing `codex/claude-read-artifacts` worktree found. Remote refresh completed. | No |
| 2026-05-03 | Command | `git worktree add -b codex/claude-read-artifacts /Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts origin/personal` | Create mandatory dedicated ticket worktree/branch | Created branch and worktree at `49eeb656` (`chore(release): bump workspace release version to 1.2.91`). | No |
| 2026-05-03 | Other | User screenshots in prompt | Understand reported UI behavior | Claude SDK `Read` activity entries correlate with source files listed in `Artifacts` tab. | Reproduced via focused probe |
| 2026-05-03 | Doc | `autobyteus-web/docs/agent_artifacts.md` | Identify the current Artifacts ownership model | Artifacts tab is backed by one run-scoped file-change model covering `write_file`, `edit_file`, and generated outputs discovered from successful non-file tools; frontend renders directly from `runFileChangesStore`. | Update docs if implementation changes semantic rules |
| 2026-05-03 | Code | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Confirm UI source for right-side Artifacts list | `ArtifactsTab` renders sorted entries from `runFileChangesStore.getArtifactsForRun(activeRunId)` and does no classification/filtering of tool events. | No frontend fix should be primary |
| 2026-05-03 | Code | `autobyteus-web/stores/runFileChangesStore.ts` and `autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts` | Trace live `FILE_CHANGE_UPDATED` ingestion | Live payloads are normalized and upserted directly; any backend false `FILE_CHANGE_UPDATED` event becomes an Artifacts row. | No |
| 2026-05-03 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Find backend sidecar attachment point | Every active run gets `RunFileChangeService.attachToRun(activeRun)`. | No |
| 2026-05-03 | Code | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` | Trace event-to-artifact derivation | For non-`write_file`/`edit_file` tool successes, `handleGeneratedOutputSuccess` calls `extractCandidateOutputPath(...)` against success args/result, cached start args, and cached candidate path, then emits `sourceTool: "generated_output"`. | Fix classification here |
| 2026-05-03 | Code | `autobyteus-server-ts/src/utils/artifact-utils.ts` | Inspect output-path extraction semantics | `extractCandidateOutputPath(...)` returns any string under keys matching output/destination patterns **or key exactly `file_path`**. `file_path` is too broad and is the direct false-positive cause for Claude `Read`. | Tighten/split helper |
| 2026-05-03 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Verify Claude normalized event shape | Claude command execution events preserve tool names and arguments. `Read` remains `tool_name: "Read"`; `arguments.file_path` is preserved. | Regression should use this converter |
| 2026-05-03 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Check current Claude event coverage | Existing tests cover `Write` with `file_path` and prove converter preserves that shape, but no read-artifact regression exists. | Add new focused coverage |
| 2026-05-03 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-file-change-payload-helper.ts`, `codex-item-event-converter.ts`, `codex-tool-payload-parser.ts` | Compare Codex behavior | Codex file mutations have explicit file-change event handling (`item.type=fileChange`, `ITEM_FILE_CHANGE_*`) and normalized `edit_file` events. This explains why Codex reads are not hit by the same `file_path` false positive in the user's report. | Protect non-regression |
| 2026-05-03 | Setup | `pnpm install --offline --frozen-lockfile` | Install workspace dependencies in the dedicated worktree for Vitest probes | Completed using local pnpm store; no downloads. `node_modules/` ignored. | No |
| 2026-05-03 | Trace | Temporary probe command: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/run-file-changes/claude-read-artifact-probe.test.ts --reporter verbose`; probe source later moved to `tickets/in-progress/claude-read-artifacts/probes/claude-read-artifact-probe.test.ts` | Reproduce bug with logs at converter-to-service boundary | Failed as expected. Logs show Claude `Read` events with `arguments.file_path` produced one `FILE_CHANGE_UPDATED` with `path: src/server.py`, `status: available`, `sourceTool: generated_output`, `sourceInvocationId: read-1`, and one projection entry. | Convert into durable passing regression during implementation |
| 2026-05-03 | Trace | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/run-file-changes/run-file-change-service.test.ts tests/unit/utils/artifact-utils.test.ts --reporter dot` | Check current targeted tests after removing temporary failing probe from the test tree | Passed: 2 files, 9 tests. Confirms current suite lacks coverage for the Claude read false-positive invariant. | Add coverage |
| 2026-05-03 | Repo | `git blame -L 1,80 -- autobyteus-server-ts/src/utils/artifact-utils.ts`; `git show --name-only 58fc24370` | Identify when broad helper appeared | `file_path` output-candidate behavior was introduced in commit `58fc2437 feat(artifacts): unify effective file content handling`, which moved Artifacts to the unified file-change/generated-output model. | Design should tighten this earlier broadening without reverting unified model |
| 2026-05-03 | Doc | `tickets/done/artifact-effective-file-content-investigation/*` | Understand prior unified Artifacts design intent | Prior design intentionally made generated outputs part of run-file-changes and used invocation-cache output-path discovery, but did not specify that `file_path` alone must not imply generated output. Architect review noted heuristic path extraction needed representative verification. | Current bug is missing invariant from that design |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Claude SDK emits tool lifecycle data; local code normalizes it through `ClaudeSessionToolUseCoordinator` and `ClaudeSessionEventConverter` into `AgentRunEvent`s.
- Current execution flow:
  1. Claude `Read` tool use is observed with input `{ file_path: "..." }`.
  2. `ClaudeSessionEventConverter` emits `TOOL_EXECUTION_STARTED` and `TOOL_EXECUTION_SUCCEEDED` with `tool_name: "Read"` and `arguments.file_path`.
  3. `RunFileChangeService.attachToRun(...)` receives those events for the active run.
  4. On started, invocation cache records tool name, arguments, and `candidateOutputPath = extractCandidateOutputPath(arguments, null)`. Because `file_path` is accepted, the read path is cached as a candidate output path.
  5. On success, `Read` is not `write_file` or `edit_file`, so `handleGeneratedOutputSuccess(...)` runs.
  6. `handleGeneratedOutputSuccess(...)` resolves the same path from success args and/or cached invocation context, canonicalizes it, upserts a row with `sourceTool: "generated_output"`, emits `FILE_CHANGE_UPDATED`, and persists metadata to `file_changes.json`.
  7. The websocket mapper sends `FILE_CHANGE_UPDATED`; frontend handler upserts it into `runFileChangesStore`; `ArtifactsTab` renders it.
- Ownership or boundary observations:
  - `RunFileChangeService` is the correct authoritative owner for Artifacts rows; frontend correctly trusts its `FILE_CHANGE_UPDATED` contract.
  - `artifact-utils.extractCandidateOutputPath(...)` is too semantically loose for the run-file-change owner's classification responsibility.
  - There is no meaningful frontend-only fix because false rows are already emitted/persisted upstream.
- Current behavior summary: Claude read-only file paths are misinterpreted as generated output paths because `file_path` is treated as output evidence globally.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; supporting Shared Structure Looseness.
- Refactor posture evidence summary: A small refactor is needed now to split output-path detection from file-mutation target-path detection. Directly special-casing `tool_name === "Read"` in one branch would leave the same loose `file_path` invariant available to pollute future non-output tools.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `artifact-utils.ts` | `file_path` is accepted by `extractCandidateOutputPath(...)` | Generic input path and output path semantics are conflated | Split/tighten helper |
| `run-file-change-service.ts` | Generated-output success is run for every successful non-`write_file`/`edit_file` tool | The owner lacks the invariant “explicit output signal only” | Implement invariant in owner/helper |
| Focused probe | Claude `Read` emitted `FILE_CHANGE_UPDATED` with `sourceTool: generated_output` | Reproduces the reported UI symptom before frontend rendering | Add durable regression |
| `ArtifactsTab.vue` | UI renders store rows directly | UI is not root cause | Do not fix with UI filter |
| Prior unified Artifacts docs/ticket | Generated-output discovery was intended but heuristic extraction was called out for verification | This is a gap in the unified model, not reason to abandon the model | Preserve model while tightening semantics |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` | Live owner of run-scoped touched/generated Artifacts rows | Processes all run events, caches invocation context, emits `FILE_CHANGE_UPDATED`, persists `file_changes.json`; currently misclassifies `Read` as generated output through loose path extraction | Remains governing owner; add explicit classification invariant here |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-invocation-cache.ts` | Retains tool start context when success payloads omit args | Currently stores pre-extracted candidate path for all tools | Keep owner but store only semantically valid output candidates |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-event-payload.ts` | Extracts generic tool names, args, invocation ids, observed paths | `extractObservedPath` only handles `path`, not Claude `file_path`; service therefore leaned on output helper for `file_path` | Add/extend file-mutation target path extraction under run-file-change ownership |
| `autobyteus-server-ts/src/utils/artifact-utils.ts` | Artifact type inference and current generic output-path candidate extraction | `file_path` acceptance directly causes the bug | Remove/split loose output extraction; keep type inference if useful |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Normalizes Claude session events into `AgentRunEvent`s | Correctly preserves `Read` as an activity/tool event and keeps `arguments.file_path` | No need to remove read metadata; classification should not consume it as output |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Observes raw Claude tool-use/tool-result blocks and emits Claude session events | Preserves built-in Claude tool names such as `Read`, `Write`, `Bash` with their inputs | File-change service should understand mutation tool names where needed |
| `autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts` | Applies `FILE_CHANGE_UPDATED` websocket payloads to frontend store | Trusts backend classification | No primary change needed |
| `autobyteus-web/stores/runFileChangesStore.ts` | Frontend owner of Artifacts rows per run | Upserts backend rows directly | No primary change needed |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Renders right-side Artifacts list/viewer | Renders exactly what backend provided | No primary change needed |
| `autobyteus-web/docs/agent_artifacts.md` and `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Long-lived docs for unified Artifacts model | Current docs say generated outputs are discovered from successful non-file tools but do not define input-vs-output path semantics | Update docs after implementation if behavior/invariant changes |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-03 | Setup | `pnpm install --offline --frozen-lockfile` | Dependencies installed in dedicated worktree from local store. | Enabled focused Vitest probe/checks. |
| 2026-05-03 | Probe | Temporary `autobyteus-server-ts/tests/unit/services/run-file-changes/claude-read-artifact-probe.test.ts` then moved to `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/probes/claude-read-artifact-probe.test.ts` | Probe creates a temp workspace file, converts Claude `Read` started/completed events, feeds them to `RunFileChangeService`, and expects zero file-change rows. | The exact converter-to-service path is enough to reproduce without a live Claude API call. |
| 2026-05-03 | Trace | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/run-file-changes/claude-read-artifact-probe.test.ts --reporter verbose` | Failed as expected. Log: `CLAUDE_READ_PROBE_FILE_CHANGE_EVENTS` contained one `FILE_CHANGE_UPDATED` with `path: src/server.py`, `status: available`, `sourceTool: generated_output`, `sourceInvocationId: read-1`. | Confirms backend false event is the source of the UI pollution. |
| 2026-05-03 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/run-file-changes/run-file-change-service.test.ts tests/unit/utils/artifact-utils.test.ts --reporter dot` | Passed: 2 files, 9 tests. | Existing tests are insufficient; add read false-positive and file-mutation/output positive cases. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None needed.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: Local normalized event and run-file-change code fully explains the bug.
- Why it matters: The fix should be against local classification semantics rather than upstream Claude SDK behavior.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for focused reproduction. The probe uses temp directories and in-memory run harness.
- Required config, feature flags, env vars, or accounts: None for focused reproduction.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `pnpm install --offline --frozen-lockfile` in `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts`.
- Cleanup notes for temporary investigation-only setup:
  - Temporary failing test was moved out of the active Vitest include tree to `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/probes/claude-read-artifact-probe.test.ts`.
  - `node_modules/` is ignored and may remain for downstream validation convenience.

## Findings From Code / Docs / Data / Logs

- The bug is not caused by the frontend `Artifacts` tab enumerating read files itself; it only renders backend run-file-change rows.
- The bug is not caused by Claude event conversion dropping semantics; preserving `Read` and `arguments.file_path` is correct for activity UI/debugging.
- The bug is caused by the run-file-change generated-output path treating `file_path` as an output path even for non-output tools.
- Codex works because its file mutation/artifact path is driven by explicit file-change events and canonical `edit_file`/`write_file` semantics; a read-only Codex activity does not become an output candidate in the observed flow.
- Prior unified Artifacts redesign is still the right structure; the missing invariant is a refinement of generated-output discovery, not a reason to restore a split artifact system.

## Constraints / Dependencies / Compatibility Facts

- Must preserve true generated-output discovery for output-path arguments/results.
- Must preserve file-change rows for write/edit/mutation tools, including Claude's built-in names.
- Must preserve activity/tool stream visibility for `Read`.
- Must avoid frontend-only filtering because persisted `file_changes.json` would remain polluted.
- No legacy compatibility for the false read-as-artifact behavior is required.

## Open Unknowns / Risks

- Full list of active Claude mutation tool names should be verified during implementation (`Write`, `Edit`, `MultiEdit`, and any notebook-specific variants supported by the SDK/version in use).
- If an existing generated-output MCP tool uses only `file_path` for its output path, this fix will stop auto-indexing it; such tools should expose `output_file_path`, `output_path`, `destination`, or result `{ output_file_url, local_file_path }` instead.
- Historical polluted rows can remain until manually cleaned. This is acceptable for current scope unless user explicitly requests a cleanup/remediation tool.

## Notes For Architect Reviewer

- Recommended design posture: keep `RunFileChangeService` as the authoritative owner; add a small run-file-change-owned classifier/path helper that separates:
  - canonical file mutation tool names and target path extraction, where `file_path` is valid; and
  - generated-output path extraction, where `file_path` alone is invalid.
- Avoid a one-off `if toolName === "Read" return` patch because it would not fix the broader invariant for any future read/import/inspection tool using `file_path`.
- The probe source and summarized output are available at:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/probes/claude-read-artifact-probe.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/probes/claude-read-artifact-probe-output.txt`

## Follow-Up Architecture Investigation: Native File-Change Observation Events

After the initial design handoff, the user asked why `RunFileChangeService` derives from broad tool lifecycle events at all when file-impacting tools/runtimes can issue file-change events natively. Investigation confirms this is a real architecture issue: current `FILE_CHANGE_UPDATED` is the service's downstream projection event, not an upstream normalized file-change input. Because the service owns both detection and projection, it listens to broad `SEGMENT_*` / `TOOL_EXECUTION_*` events and guesses generated outputs. The cleaner target is to add a distinct upstream event such as `FILE_CHANGE_OBSERVED`, emitted by Codex/Claude/AutoByteus tool adapters only for known file-impacting operations, then make `RunFileChangeService` project only those explicit observations and emit `FILE_CHANGE_UPDATED` for the frontend. Detailed addendum: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/design-impact-native-file-change-events.md`.

## User-Driven Design Revision: Single FILE_CHANGE Event + Event Processor Chain

Date: 2026-05-03

The user rejected the two-event `FILE_CHANGE_OBSERVED` / `FILE_CHANGE_UPDATED` split as redundant and requested a cleaner design:

- Use one public normalized event named `FILE_CHANGE`.
- Do not keep `FILE_CHANGE_UPDATED` compatibility.
- Keep runtime-specific Claude/Codex/AutoByteus normalizers as the first normalization layer.
- Add a post-normalization event processor chain that can append derived normalized events.
- Implement file-change derivation as one processor in that chain.
- Let future processors emit custom/higher-level events through the same mechanism.
- Make `RunFileChangeService` consume `FILE_CHANGE` only and stop deriving/publishing file-change events from arbitrary tool lifecycle events.

Additional current-code evidence checked during the revision:

- `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts` currently declares `AgentRunEventType.FILE_CHANGE_UPDATED`.
- `autobyteus-server-ts/src/services/agent-streaming/models.ts` currently declares `ServerMessageType.FILE_CHANGE_UPDATED`.
- `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` maps `AgentRunEventType.FILE_CHANGE_UPDATED` to `ServerMessageType.FILE_CHANGE_UPDATED`.
- `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts` currently converts Claude session events and directly dispatches each converted normalized event.
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` currently converts Codex app-server messages and directly dispatches each converted normalized event.
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` currently converts AutoByteus stream events and directly dispatches each converted normalized event.
- Codex file-change items are already normalized into `edit_file` segment/tool lifecycle events in `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`, so the processor can derive `FILE_CHANGE` from normalized semantics without reading raw Codex event shapes.

The revised design supersedes the earlier tactical classifier-split design and the intermediate two-event observation/update addendum.


## Autobyteus-ts Generated Media Tool Evidence

Date: 2026-05-03

Checked `autobyteus-ts` generated media tool contracts:

- `autobyteus-ts/src/tools/multimedia/image-tools.ts` `GenerateImageTool` requires `output_file_path`, resolves it against the workspace root, downloads the generated image to that path, and returns `{ file_path: resolvedPath }`.
- `autobyteus-ts/src/tools/multimedia/image-tools.ts` `EditImageTool` follows the same output-path/result shape.
- `autobyteus-ts/src/tools/multimedia/audio-tools.ts` `GenerateSpeechTool` requires `output_file_path`, downloads the generated audio to that path, and returns `{ file_path: resolvedPath }`.
- `autobyteus-ts/src/agent/streaming/events/stream-events.ts` currently has no `StreamEventType.FILE_CHANGE`; it emits tool lifecycle events such as `TOOL_EXECUTION_STARTED` and `TOOL_EXECUTION_SUCCEEDED`.
- `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts` emits terminal tool lifecycle success/failure and has access to `ToolResultEvent.toolName`, `toolArgs`, `result`, `toolInvocationId`, and `turnId`, making it the correct lifecycle-level place to emit a native autobyteus-ts file-change event if standalone runtime consumers need it.

Design consequence: the server-side `FileChangeEventProcessor` must cover these tools at minimum. Optionally, `autobyteus-ts` can also gain native `StreamEventType.FILE_CHANGE`, but the server must avoid duplicate derivation if it consumes a native file-change event.


## Autobyteus-server-ts Customization Processor Check

Date: 2026-05-03

Reviewed `autobyteus-server-ts/src/agent-customization` and related AutoByteus backend factory wiring. Findings:

- Server-owned customization processors exist under `autobyteus-server-ts/src/agent-customization/processors/*`:
  - input processors: `WorkspacePathSanitizationProcessor`, `UserInputContextBuildingProcessor`;
  - LLM response processors: `TokenUsagePersistenceProcessor`, `MediaUrlTransformerProcessor`;
  - tool invocation preprocessor: `MediaInputPathNormalizationPreprocessor`;
  - no current server-owned tool execution result processor is registered.
- `autobyteus-server-ts/src/startup/agent-customization-loader.ts` registers input processors, LLM response processors, and the media input path tool-invocation preprocessor. It does not currently register a tool execution result processor or lifecycle processor.
- `AutoByteusAgentRunBackendFactory` supports multiple `autobyteus-ts` processor categories from agent definitions: input, LLM response, system prompt, tool execution result, tool invocation preprocessor, and lifecycle processors.
- `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts` applies `toolExecutionResultProcessors` before terminal success/failure lifecycle stream events are emitted, and each processor receives `ToolResultEvent` plus `AgentContext`.
- `autobyteus-ts/src/agent/lifecycle` also has lifecycle processors, but lifecycle processors are status-transition hooks (`BEFORE_TOOL_EXECUTE`, `AFTER_TOOL_EXECUTE`, etc.) and are less precise for per-tool output path emission than tool result processors.

Design consequence:

- Existing server customization processors are not a replacement for the proposed cross-runtime `AgentRunEventPipeline`, because they only participate in AutoByteus runtime construction/execution and do not see Claude/Codex normalized event streams.
- However, if we choose native AutoByteus emission (`StreamEventType.FILE_CHANGE`) for standalone `autobyteus-ts` consumers, the best existing customization hook is a mandatory `BaseToolExecutionResultProcessor` registered by `agent-customization-loader`. That processor can detect `generate_image`, `edit_image`, `generate_speech`, `write_file`, and `edit_file` after successful tool execution and ask the notifier to emit a native file-change stream event.
- For the server/web unified artifact behavior, the cross-runtime `FileChangeEventProcessor` after normalization remains the authoritative design unless native `autobyteus-ts` file-change events are added and mapped directly.


## Final Decision On AutoByteus Customization Processors

Date: 2026-05-03

After user review, the final design decision is to keep server/web file-change derivation in the cross-runtime `AgentRunEventPipeline`, not in AutoByteus customization processors. The pipeline checks known normalized tool names (`generate_image`, `edit_image`, `generate_speech`, `write_file`, `edit_file`, Claude `Write`/`Edit`/`MultiEdit`, Codex `edit_file`, etc.) and appends `FILE_CHANGE` events.

AutoByteus customization processors remain useful for AutoByteus-only input, LLM response, and invocation/result customization, but they are not the authoritative boundary for unified server Artifacts because they cannot cover Claude/Codex normalized event streams. Native `autobyteus-ts` `StreamEventType.FILE_CHANGE` is deferred/out of scope unless standalone `autobyteus-ts` consumers later need it.
