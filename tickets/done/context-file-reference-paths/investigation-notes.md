# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Deep code investigation complete; artifacts refined after user clarification and architecture review finding AR-CTXREF-001.
- Investigation Goal: Locate the backend/runtime message construction paths for frontend context files and determine where to append absolute reference-file paths to the initial runtime-visible user message without disrupting runtime multimodal inputs.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Behavior spans frontend-submitted context files, context-file storage/finalization, backend websocket/GraphQL/application input construction, native AutoByteus input processing, and direct Codex/Claude runtime adapters.
- Scope Summary: Add text-level absolute local file path references for user-attached context files in runtime-visible user messages while preserving existing multimodal payload behavior. Do not change inter-agent `send_message_to` reference-file behavior.
- Primary Questions To Resolve:
  - Where are context file attachments represented in frontend/backend contracts?
  - Which backend owners construct `AgentInputUserMessage` from websocket/GraphQL/application input?
  - Which runtime owners transform `AgentInputUserMessage` into provider-specific LLM input?
  - Where are final uploaded context-file locators resolved to local filesystem paths?
  - Which runtime input construction paths must append the user-context-file `Reference files:` section?
  - Which direct runtime paths need `ContextFileLocalPathResolver` because they bypass `UserInputContextBuildingProcessor`?

## Request Context

User reports that context files attached from the agent input/editor area are sent to multimodal LLM runtimes as raw inputs, but the LLM-visible user text does not include the server-side file paths. This prevents later agents, especially validation/review agents in a multi-agent workflow, from finding or reattaching the original files because only the earlier agent saw the raw multimodal content. Requested improvement: append a `Reference files` section containing complete absolute server-side context file paths below the user message text during user-message construction.

User clarified after the first design draft that existing inter-agent reference-file builders are not in scope: if an agent calls `send_message_to` and passes `reference_files`, that already works; if the agent does not pass them, that is agent reasoning. This ticket only modifies the user/runtime message created from frontend context-file attachments.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-file-reference-paths`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-file-reference-paths/tickets/in-progress/context-file-reference-paths`
- Current Branch: `codex/context-file-reference-paths`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-file-reference-paths`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-22
- Task Branch: `codex/context-file-reference-paths`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Work must happen in the dedicated task worktree/branch above, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Command | `git rev-parse --show-toplevel`; `git status --short --branch`; `git remote -v`; `git symbolic-ref refs/remotes/origin/HEAD`; `git worktree list --porcelain` | Bootstrap repo/worktree/base context | Current shared checkout is on `personal`; remote HEAD is `origin/personal`; no exact worktree for this context-file reference path task existed | No |
| 2026-05-22 | Command | `git fetch origin --prune`; `git worktree add -b codex/context-file-reference-paths /Users/normy/autobyteus_org/autobyteus-worktrees/context-file-reference-paths origin/personal` | Create mandatory dedicated task branch/worktree from refreshed base | Worktree created successfully at latest `origin/personal` (`b64bfe508f1c8844a1f7e18f8a7fee4623c0e5d0`) | No |
| 2026-05-22 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Follow team solution-designer workflow | Requires draft requirements/investigation before deep investigation; design principles and design spec before architecture handoff | No |
| 2026-05-22 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference | Design must be spine-first, ownership-led, and avoid duplicated policy when a small owned structure is appropriate | No |
| 2026-05-22 | Command | `rg -n "Context Files|contextFiles|context files|context_files|reference_files|referenceFiles|context file|attachments|attached" ...` | Discover attachment/context/reference terminology across packages | Located core `ContextFile`, `AgentInputUserMessage`, multimodal builder, websocket handlers, Codex mapper, context-file storage docs/services, and existing inter-agent behavior | No |
| 2026-05-22 | Code | `autobyteus-ts/src/agent/message/context-file.ts` | Inspect context-file data model | `ContextFile` owns `uri`, `fileType`, `fileName`, and `metadata`; `uri` is the active path/locator/source used by runtime builders | No |
| 2026-05-22 | Code | `autobyteus-ts/src/agent/message/agent-input-user-message.ts` | Inspect runtime input envelope | `AgentInputUserMessage` carries `content`, `senderType`, `contextFiles`, and `metadata`; no built-in reference-file rendering exists | No |
| 2026-05-22 | Code | `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` | Inspect native LLM message conversion | `buildLLMUserMessage` copies `content` unchanged and moves image/audio/video context file URIs into media arrays. This is the native location where media survives but path text is omitted | Yes: modify |
| 2026-05-22 | Code | `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Inspect native turn input owner | Input processors run before `buildLLMUserMessage`; native message construction should be fixed at the builder layer, not transport handlers | No direct change expected |
| 2026-05-22 | Code | `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` | Determine history/memory impact | Memory ingest calls `buildLLMUserMessage`; changing that builder will also store reference-file text in memory raw trace for native runtime | No direct change expected |
| 2026-05-22 | Code | `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | Locate local path resolution in native runtime | Mandatory server input processor resolves final context-file locators and workspace-relative files to absolute paths, mutates `contextFile.uri`, and builds text context for readable files before `buildLLMUserMessage` | No direct change expected |
| 2026-05-22 | Code | `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | Inspect uploaded context-file locator resolution | Resolves `/rest/drafts/.../context-files/...` and `/rest/runs/...` / `/rest/team-runs/...` final locators to existing local paths under context-file layout | Reuse from direct server runtime mappers |
| 2026-05-22 | Doc | `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Understand storage/serving contract | Browser-uploaded composer context files stage under draft owners and finalize into run/member-owned `context_files/`; prompt-building/Codex mapping may translate final locators back to local files | Update docs after implementation |
| 2026-05-22 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Inspect standalone websocket send path | Parses `context_file_paths` and `image_urls`, builds `ContextFile[]`, then constructs `AgentInputUserMessage` and hands to `AgentRunCommandCoordinator` | No change expected |
| 2026-05-22 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Inspect team websocket send path | Same context file conversion for team run messages before `teamRun.postMessage` | No change expected |
| 2026-05-22 | Code | `autobyteus-server-ts/src/api/graphql/converters/user-input-converter.ts` and `src/api/graphql/types/agent-user-input.ts` | Inspect GraphQL input path | GraphQL input converts `contextFiles[{ path, type }]` to `ContextFile` and `AgentInputUserMessage` | No change expected |
| 2026-05-22 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` and `autobyteus-application-sdk-contracts/src/index.ts` | Inspect application runtime input path | Application runtime input carries `contextFiles` as `{ uri, fileType, fileName, metadata }`; host builds `AgentInputUserMessage` and delegates to agent/team run | No change expected |
| 2026-05-22 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | Inspect Codex direct runtime mapping | Codex maps image context files to `localImage`/image inputs and omits image path from text; non-image context files get ad hoc `Context file: ...` lines | Yes: modify user text item construction |
| 2026-05-22 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Inspect Codex turn submission | `CodexThread.sendTurn` posts `input: toCodexUserInput(message)` to app-server, bypassing native `AgentInputPipeline` | No direct change beyond mapper |
| 2026-05-22 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Inspect Claude direct runtime mapping | `sendTurn` uses only `asString(message.content)` for cached and executed turn content; `contextFiles` are not surfaced | Yes: modify text content assembly |
| 2026-05-22 | Code | `autobyteus-ts/src/agent/message/inter-agent-message.ts`; `autobyteus-ts/src/agent/message/send-message-to.ts`; `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Scope check after user clarification | Existing inter-agent flow already has explicit `reference_files`; user clarified this is not in ticket scope | Do not modify |
| 2026-05-22 | Doc | `tickets/in-progress/context-file-reference-paths/design-review-report.md` round 2 | Review corrected narrowed design | AR-CTXREF-001 found that Claude direct runtime bypasses native path processing and therefore must also use `ContextFileLocalPathResolver` for finalized `/rest/.../context-files/...` locators | Update design |
| 2026-05-22 | Tests | `autobyteus-ts/tests/unit/agent/message/multimodal-message-builder.test.ts`; `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Locate existing coverage points | Native multimodal builder tests currently assert content remains raw; Claude tests assert cached content equals sent content | Update/add focused tests |
| 2026-05-22 | Tests | `autobyteus-server-ts/tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts` | Inspect context-file storage runtime E2E | E2E already verifies finalized uploaded images are delivered to native runtime and working context stores final file paths. It does not currently assert LLM-visible reference-file text | Focused unit coverage is sufficient; E2E update optional |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Frontend context attachment UI stores attachments in `contextFilePaths`; websocket services send them as `context_file_paths` to backend.
- Current execution flow:
  1. Frontend sends user text plus context file locators/paths.
  2. `agent-stream-handler.ts` or `agent-team-stream-handler.ts` builds `ContextFile` objects and wraps them in `AgentInputUserMessage`.
  3. Native AutoByteus runs process that message through `AgentInputPipeline` and server input processors. `UserInputContextBuildingProcessor` resolves local paths and rewrites `message.content` into prompt sections; `buildLLMUserMessage` creates `LLMUserMessage` with media arrays.
  4. Codex runs bypass native pipeline and map `AgentInputUserMessage` through `toCodexUserInput` directly into app-server input items.
  5. Claude Agent SDK runs bypass native pipeline and use `message.content` directly for turn content; therefore the Claude direct path must resolve finalized context-file locators itself through `ContextFileLocalPathResolver` before the shared utility filters unresolved locators.
- Ownership or boundary observations:
  - `ContextFile` owns attachment identity/locator fields but not rendering policy.
  - `buildLLMUserMessage` is native runtime's authoritative conversion from `AgentInputUserMessage` to provider-neutral LLM input.
  - `toCodexUserInput` is Codex runtime's authoritative conversion from `AgentInputUserMessage` to app-server input items.
  - `ClaudeSession.sendTurn` is Claude runtime's authoritative conversion from `AgentInputUserMessage` to SDK text input and must supply `ContextFileLocalPathResolver.resolve(...)` to the shared utility because it bypasses `UserInputContextBuildingProcessor`.
  - Existing inter-agent message/reference-file builders are separate and should not be changed for this ticket.
- Current behavior summary: Attached media can reach the initial runtime as raw multimodal input, but the local path is not consistently placed in the runtime-visible user message text.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture evidence summary: A small shared user-context-file reference rendering utility avoids repeating path filtering/dedupe/section append logic across native, Codex, and Claude input constructors. No inter-agent refactor is needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `multimodal-message-builder.ts` | Media URIs are added to `image_urls`/`audio_urls`/`video_urls`; content is unchanged | Native runtime lacks invariant that context files remain text-referenceable by path | Modify builder |
| `codex-user-input-mapper.ts` | Image context files become app-server image inputs without text path references | Direct Codex runtime reproduces the user's reported issue | Modify mapper |
| `claude-session.ts` | Only `message.content` is sent/cached; `contextFiles` ignored; Claude bypasses native path processors | Direct Claude runtime cannot expose absolute paths for finalized locators unless it uses `ContextFileLocalPathResolver` via the shared utility | Modify send text assembly with resolver callback |
| User clarification | Existing inter-agent `reference_files` are controlled by the agent's explicit tool call | Inter-agent builders are outside ticket scope | Do not modify |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/context-file.ts` | Context file value object | Holds `uri`, type, display filename, metadata | Path rendering can derive from `uri` after path normalization |
| `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` | Native conversion from agent input to provider-neutral LLM user message | Correct owner for native media + text composition; currently omits reference paths | Extend through current-context-file reference utility |
| `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | Server native prompt preprocessing and context path resolution | Resolves final locators and relative paths to absolute local paths before native builder | No new native resolver needed after this processor |
| `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | REST context-file locator -> local path resolver | Existing owner for uploaded context-file local path resolution | Reuse from Codex mapper and any server direct path renderer |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | Codex app-server input mapping | Must both preserve image items and add text reference paths | Modify |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude turn text send/cache/execute boundary | Must append reference paths to content before cache/execution and must resolve finalized context-file locators through `ContextFileLocalPathResolver` | Modify |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Standalone websocket send command parsing | Already builds `ContextFile[]`; no rendering policy should be added here | No change expected |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Team websocket send command parsing | Already builds `ContextFile[]`; no rendering policy should be added here | No change expected |
| Existing inter-agent files | Agent-authored inter-agent delivery and explicit references | Already work when agent passes `reference_files` | Out of scope; no change |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-22 | Setup | Dedicated worktree creation | Worktree ready for isolated artifacts and later implementation | Proceeded to code investigation |
| 2026-05-22 | Static trace | `rg` plus direct file reads listed in Source Log | Found three runtime user-message construction boundaries: native builder, Codex mapper, Claude session | Design must cover all three; no frontend contract or inter-agent change required |

## External / Public Source Findings

No external/public sources consulted. This is an internal application behavior change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Focused unit tests are sufficient for formatter/native/Codex/Claude behavior. Existing context-file storage E2E can remain as broader evidence unless downstream validation chooses to extend it.
- Required config, feature flags, env vars, or accounts: None for focused tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add -b codex/context-file-reference-paths ... origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The web/server input boundaries already preserve `ContextFile` records, so the bug is not attachment loss at input parsing; it is missing/inconsistent rendering at runtime input construction boundaries.
- The native runtime is easiest to fix centrally because all native provider adapters receive `LLMUserMessage`; changing the builder covers OpenAI/Gemini/Ollama/Mistral/Anthropic native prompt renderers without provider-specific changes.
- Direct Codex/Claude backends do not use native `LLMUserMessage`, so they require explicit use of the same current-user-context-file text augmentation utility. Because both can receive finalized context-file locators, both must supply `ContextFileLocalPathResolver.resolve(...)` to the utility instead of relying on native input processors.
- Team communication persistence intentionally does not scan prose for file paths. This remains unchanged.

## Constraints / Dependencies / Compatibility Facts

- Must preserve current media arrays/input items.
- Must expose absolute server-side paths where resolvable.
- Must not render unresolved `/rest/...` locators or remote URLs as if they were local files.
- Must avoid touching existing inter-agent `send_message_to` reference-file behavior.

## Open Unknowns / Risks

- Codex direct mapper currently lacks workspace-root context, so relative context-file URIs cannot be reliably converted to absolute paths there without broadening the mapper signature. This design does not require that broader change.
- Claude runtime still lacks raw multimodal context-file submission; only text path visibility is in scope.
- Future structured metadata for current-turn context references may be desirable, but this change intentionally solves the immediate LLM-visible continuity gap.

## Notes For Architect Reviewer

This artifact was corrected after user clarification and AR-CTXREF-001. Please review the narrowed design: only native `buildLLMUserMessage`, Codex `toCodexUserInput`, and Claude `ClaudeSession.sendTurn` should be changed for user-attached context-file path visibility. Claude must call the shared utility with `ContextFileLocalPathResolver.resolve(...)` before content validation/cache/execution. Existing inter-agent `send_message_to` reference-file builders and delivery behavior are explicitly out of scope and should not be modified.
