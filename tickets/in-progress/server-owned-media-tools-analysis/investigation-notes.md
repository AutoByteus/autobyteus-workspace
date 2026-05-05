# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Design investigation complete; user approved proceeding with the refactoring design
- Investigation Goal: Determine whether and how `generate_image`, `edit_image`, and `generate_speech` can move from AutoByteus-runtime-local implementation into server-owned cross-runtime tooling.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Requires canonical server contracts/services, AutoByteus local wrappers, Codex dynamic tool projection, Claude MCP projection, event/path normalization, duplicate decommission, and tests.
- Scope Summary: Move media tool orchestration into `autobyteus-server-ts` while keeping multimedia provider clients/factories in `autobyteus-ts`.
- Primary Questions To Resolve: Is it possible? What should move? Which runtime adapters are required? What are the risks?

## Request Context

The user observed that the image generation, image editing, and speech generation tools are currently available only to the AutoByteus runtime and asked whether moving them into the server project would make them available to all runtimes, similar to Browser tools and `publish_artifacts`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis/tickets/in-progress/server-owned-media-tools-analysis`
- Current Branch: `codex/server-owned-media-tools-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: previously refreshed with `git fetch origin --prune` during this analysis ticket setup
- Task Branch: `codex/server-owned-media-tools-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This is analysis-only unless user approves turning it into an implementation ticket.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Code | `autobyteus-ts/src/tools/multimedia/image-tools.ts` | Inspect current image tool ownership | `GenerateImageTool` and `EditImageTool` are `BaseTool` classes in `autobyteus-ts`, read `DEFAULT_IMAGE_*` env vars, use `ImageClientFactory`, resolve output path through `resolveSafePath`, and download first returned URL. | Yes |
| 2026-05-05 | Code | `autobyteus-ts/src/tools/multimedia/audio-tools.ts` | Inspect current speech tool ownership | `GenerateSpeechTool` is a `BaseTool` in `autobyteus-ts`, reads `DEFAULT_SPEECH_GENERATION_MODEL`, uses `AudioClientFactory`, downloads first returned URL. | Yes |
| 2026-05-05 | Code | `autobyteus-ts/src/tools/register-tools.ts` | Confirm registration path | Media tools are registered by core runtime `registerTools()`. | Yes |
| 2026-05-05 | Code | `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Inspect server-owned tool loading | Server loads Tool Management, Skills, Browser, and Published Artifact tool groups. | Yes |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-tools/browser/*` | Understand browser cross-runtime tool pattern | Browser tools define canonical contract/manifest/service and register AutoByteus wrappers. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts` | Inspect Codex projection | Browser manifest is converted to Codex dynamic tool specs/handlers. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/browser/*` | Inspect Claude projection | Browser manifest is converted to Claude SDK tool definitions and exposed through an `autobyteus_browser` MCP server. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifacts-tool.ts` and related Codex/Claude projection files | Compare non-browser server-owned tool | `publish_artifacts` has server-owned AutoByteus wrapper plus Codex dynamic and Claude MCP projections. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Inspect runtime gating | Current explicit cross-runtime exposure extraction knows browser tools, `send_message_to`, and `publish_artifacts`; media tools would need to be added. | Yes |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.ts` | Inspect media path normalization | Current image input path normalization applies only inside AutoByteus runtime tool invocation preprocessing and only for AutoByteus LLM provider. Cross-runtime server tools need equivalent service-level normalization. | Yes |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts` | Check artifact/file-change handling | Existing generated-output allowlist already includes canonical media tool names and `mcp__autobyteus_image_audio__...` forms. | Maybe |
| 2026-05-05 | Code | `autobyteus-ts/src/multimedia/image/image-client-factory.ts`, `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | Inspect provider/client dependency direction | Factories and model catalogs are shared provider infrastructure and can be imported by the server because server already depends on `autobyteus-ts`. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/config/app-config-provider.ts`, `autobyteus-server-ts/src/config/app-config.ts` | Inspect settings/env ownership | Server settings set `process.env` and `.env`; server-owned media tool can resolve defaults through `appConfigProvider.config.get(...)` or equivalent. | No |

| 2026-05-05 | Code | `autobyteus-ts/src/utils/parameter-schema.ts`, `autobyteus-ts/src/tools/base-tool.ts`, `autobyteus-ts/src/tools/registry/tool-definition.ts` | Inspect schema, validation, and cache behavior for AutoByteus local-tool wrappers | `ParameterSchema` can provide JSON schema; `ToolDefinition` caches argument schemas until `reloadToolSchema`; `BaseTool` validates required/type compatibility. | Yes |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts`, `codex-item-event-payload-parser.ts` | Check dynamic tool result/argument event parsing | Codex dynamic tool text results are parsed as JSON when possible; dynamic tool arguments are resolved from payload/item argument fields. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`, `claude-browser-tool-result-normalizer.ts` | Check Claude MCP event/result normalization | Browser MCP tool names/results are normalized by an allowlisted prefix; media tools need equivalent canonicalization or must use an already allowlisted generated-output prefix for artifacts. | Yes |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/file-change/*` | Check generated-output file-change semantics | Successful media outputs are detected from known tool names and either explicit output path arguments or `{ file_path }` results. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Agent tool selection/configuration chooses a tool name registered in `defaultToolRegistry` for AutoByteus runtime, while Codex/Claude use explicit server-owned dynamic/MCP projections for selected server-owned tools.
- Current execution flow:
  - AutoByteus runtime: `AgentDefinition.toolNames` -> `defaultToolRegistry.createTool(name)` -> `BaseTool._execute(...)` in `autobyteus-ts`.
  - Codex runtime: configured tool names are reduced to known exposure groups -> explicit dynamic tool registrations are attached to the Codex thread config.
  - Claude runtime: configured tool names are reduced to known exposure groups -> explicit Claude SDK tool definitions are projected as MCP servers and allowed tools.
- Ownership or boundary observations:
  - Media tool orchestration is owned by `autobyteus-ts`, which is the wrong owner if the goal is first-party tool availability across all server-managed runtimes.
  - Browser/publish tools show that cross-runtime tools are owned by `autobyteus-server-ts` and only adapted down into each runtime.
- Current behavior summary: Moving the implementation is feasible, but it requires server-owned canonical tool contracts and runtime-specific adapters; local `BaseTool` registration alone will not reach Codex or Claude.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: The existing functionality is not broken locally; the pressure comes from the tool ownership boundary being below the server runtime orchestration boundary.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/register-tools.ts` | Media tools are first-party `autobyteus-ts` local tools. | Good for AutoByteus runtime, insufficient for server-managed cross-runtime exposure. | Yes |
| Browser server tool files | Server owns the contract/service and projects to each runtime. | This is the correct reusable pattern for media tools. | Yes |
| Codex/Claude projection builders | No generic local-tool projection exists. | Media must get explicit projection builders. | Yes |
| Media path preprocessor | Path normalization is runtime-specific and provider-conditional. | Server-owned service must own path normalization for all runtimes. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/multimedia/image-tools.ts` | Image tool classes | Owns model default lookup, dynamic schema, client creation, input path list parsing, output download. | Move orchestration to server; keep reusable multimedia factory imports. |
| `autobyteus-ts/src/tools/multimedia/audio-tools.ts` | Speech tool class | Owns model default lookup, dynamic schema, client creation, output download. | Move orchestration to server; avoid stale client caching. |
| `autobyteus-ts/src/multimedia/*/*-client-factory.ts` | Multimedia provider/client catalog | Already suitable shared provider infrastructure. | Keep in `autobyteus-ts`; server imports it. |
| `autobyteus-server-ts/src/agent-tools/browser/*` | Browser server-owned tool subsystem | Demonstrates canonical manifest + service + AutoByteus wrapper. | Use as target pattern. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/browser/*` | Codex dynamic projection | Converts server manifest to Codex dynamic tools. | Add media equivalent. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/browser/*` | Claude MCP projection | Converts server manifest to Claude MCP server tools. | Add media equivalent. |
| `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Cross-runtime configured tool gating | Only recognizes browser/send-message/publish groups. | Add media group. |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts` | File-change generated output classification | Already includes canonical and MCP-prefixed media tool names. | Validate behavior after moving; may need Claude MCP media prefix if different. |

## Runtime / Probe Findings

No live media provider execution was run for this analysis. This was source-level architecture investigation.

## External / Public Source Findings

None.

## Reproduction / Environment Setup

- Dedicated worktree used: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis`.
- No provider credentials or external services were required.
- Additional design-read commands inspected schema/cache behavior, Codex dynamic tool parsing, Claude MCP event normalization, and generated-output file-change extraction.

## Findings From Code / Docs / Data / Logs

- Browser tools are server-owned and loaded by startup, then exposed to AutoByteus through `defaultToolRegistry`, to Codex as dynamic tools, and to Claude through server-created MCP definitions.
- `publish_artifacts` proves the same pattern is not browser-specific.
- Media tools currently rely on runtime-local `AgentContext.workspaceRootPath`; Codex/Claude dynamic/MCP handlers will need server-side run/workspace context injection.
- Existing generated-output file-change logic already knows canonical media tool names.

## Constraints / Dependencies / Compatibility Facts

- Public tool names should remain unchanged.
- `autobyteus-server-ts` already depends on `autobyteus-ts`, so importing multimedia factories from server is allowed.
- `autobyteus-ts` should not import `autobyteus-server-ts`; server-owned wrappers cannot live below `autobyteus-ts` without reversing dependency direction.
- The old direct `autobyteus-ts` registration must be removed or replaced to prevent duplicate tool definitions.

## Open Unknowns / Risks

- Exact output path policy for Codex/Claude media dynamic tools must be aligned with existing workspace resolver and artifact policy.
- Media model capability metadata may need tightening before exposing separate edit/generate dropdowns/tools across all runtimes.
- Need decision whether to expose Claude media tools under an `autobyteus_media` MCP server name or another stable server name; event normalizers must know any MCP-prefixed forms if UI requires canonical tool names.

## Notes For Architect Reviewer

User approved this as a refactoring/design ticket on 2026-05-05. The design spec is `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis/tickets/in-progress/server-owned-media-tools-analysis/design-spec.md`. Primary target spine: `AgentDefinition.toolNames -> Runtime tool exposure resolver -> Server media tool manifest/projection -> Server media generation service -> Multimedia client factory -> output file/artifact projection`.
