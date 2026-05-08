# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis/tickets/done/server-owned-media-tools-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis/tickets/done/server-owned-media-tools-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis/tickets/done/server-owned-media-tools-analysis/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review request from `solution_designer` after user approval on 2026-05-05.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the upstream package and inspected current implementations for `autobyteus-ts/src/tools/multimedia/image-tools.ts`, `autobyteus-ts/src/tools/multimedia/audio-tools.ts`, `autobyteus-ts/src/tools/register-tools.ts`, `autobyteus-ts/src/tools/index.ts`, `autobyteus-server-ts/src/startup/agent-tool-loader.ts`, browser and published-artifact server-owned tool patterns, `configured-agent-tool-exposure.ts`, Codex dynamic tool bootstrap/projection files, Claude MCP/allowed-tool/session files, media input path preprocessor, file-change generated-output semantics, `ParameterSchema`/`ToolDefinition` caching, and image/audio client factories.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | No | Pass | Yes | Design is actionable and aligned with current server-owned tool patterns. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/server-owned-media-tools-analysis/tickets/done/server-owned-media-tools-analysis/design-spec.md` for the server-owned media tools refactor.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Spec identifies this as a refactor / larger requirement, not a small file move. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Spec classifies the issue as `Boundary Or Ownership Issue` with duplicated-coordination risk. Current code confirms media tools are local `autobyteus-ts` `BaseTool` classes while Browser/publish cross-runtime tools are server-owned projections. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Spec says refactor is needed now for cross-runtime first-party tool exposure, while deferring image capability metadata and long-lived client pooling. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, ownership map, file responsibilities, dependency rules, migration/removal plan, and backward-compatibility rejection log all reflect the boundary move. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | N/A |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Cross-runtime exposure | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Media execution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Result/event/generated-output projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Default model/schema resolution | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Path normalization/safety | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server media tools | Pass | Pass | Pass | Pass | New `agent-tools/media` subsystem is justified because no current server owner exists for media execution across runtimes. |
| AutoByteus local-tool projection | Pass | Pass | Pass | Pass | Server-owned wrappers keep AutoByteus compatibility while moving orchestration out of `autobyteus-ts`. |
| Codex dynamic projection | Pass | Pass | Pass | Pass | Extends explicit server-owned dynamic tool pattern; no direct provider/client calls allowed here. |
| Claude MCP projection | Pass | Pass | Pass | Pass | Extends current in-process MCP projection pattern and allowed-tool handling. |
| Multimedia provider library (`autobyteus-ts/src/multimedia`) | Pass | Pass | Pass | Pass | Correctly remains reusable provider/client infrastructure. |
| Event/file-change pipeline | Pass | Pass | Pass | Pass | Existing generated-output allowlist already includes canonical and `mcp__autobyteus_image_audio__*` media names; design adds normalization only where needed. |
| Server settings/config | Pass | Pass | Pass | Pass | Neutral media default constants prevent settings service and media tools from depending on each other. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool names/type guards/contracts | Pass | Pass | Pass | Pass | `media-tool-contract.ts` is the right canonical owner and avoids scattered string checks. |
| Tool manifest entries | Pass | Pass | Pass | Pass | `MediaToolManifest` is the correct projection source, matching the browser pattern. |
| Default model keys/fallbacks | Pass | Pass | Pass | Pass | `src/config/media-default-model-settings.ts` is neutral and reusable by settings service and resolver. |
| Model/default/schema lookup | Pass | Pass | Pass | Pass | `MediaModelResolver` is needed to prevent env/catalog/schema logic from being duplicated per runtime. |
| Path normalization | Pass | Pass | Pass | Pass | `MediaPathResolver` gives the security-sensitive policy one owner. |
| Result serialization/normalization | Pass | Pass | Pass | Pass | Runtime-local serialization/normalization is appropriate because result envelope shapes differ. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MediaToolName` | Pass | Pass | Pass | Pass | Pass | Exact union from the media tool-name list is appropriately narrow. |
| `GenerateImageInput` | Pass | Pass | Pass | Pass | Pass | Advertised string shape can remain stable while parser defensively accepts arrays and normalizes internally. |
| `EditImageInput` | Pass | Pass | Pass | Pass | Pass | Internal `inputImages` and `maskImage` are clear and service-owned. |
| `GenerateSpeechInput` | Pass | Pass | Pass | Pass | Pass | Prompt/output/config responsibilities are singular. |
| `MediaToolExecutionContext` | Pass | Pass | Pass | Pass | Pass | Keeping only run/agent/workspace fields avoids passing a mixed runtime context blob. |
| `MediaToolResult` | Pass | Pass | Pass | N/A | Pass | Single canonical `{ file_path }` field preserves generated-output extraction. |
| `MediaDefaultModelSetting` constants | Pass | Pass | Pass | N/A | Pass | Keys/fallbacks are not mixed with settings metadata or execution policy. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `GenerateImageTool` registration in `autobyteus-ts/src/tools/register-tools.ts` | Pass | Pass | Pass | Pass | Must be removed before final state to avoid registry overwrite/duplicate ownership. |
| `EditImageTool` registration in `autobyteus-ts/src/tools/register-tools.ts` | Pass | Pass | Pass | Pass | Same as above. |
| `GenerateSpeechTool` registration in `autobyteus-ts/src/tools/register-tools.ts` | Pass | Pass | Pass | Pass | Same as above. |
| Old `autobyteus-ts/src/tools/multimedia/image-tools.ts` tool-boundary classes | Pass | Pass | Pass | Pass | Delete or reduce only if no reusable non-tool logic remains; no compatibility wrappers. |
| Old `autobyteus-ts/src/tools/multimedia/audio-tools.ts` tool-boundary class | Pass | Pass | Pass | Pass | Same as above. |
| `autobyteus-ts/src/tools/index.ts` exports for old media tool classes | Pass | Pass | Pass | Pass | Export removal is correctly treated as old boundary cleanup unless a standalone product requirement appears. |
| Old media tool tests | Pass | Pass | Pass | Pass | Behavior tests migrate to server-owned subsystem; client/factory tests stay in the library. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/media-default-model-settings.ts` | Pass | Pass | N/A | Pass | Neutral config constants only. |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-contract.ts` | Pass | Pass | Pass | Pass | Canonical names, guards, and input/result/context types. |
| `media-tool-input-parsers.ts` | Pass | Pass | Pass | Pass | Parser/normalizer boundary stays separate from execution. |
| `media-tool-model-resolver.ts` | Pass | Pass | Pass | Pass | Owns setting lookup, fallback, catalog lookup, and model schema fragments. |
| `media-tool-parameter-schemas.ts` | Pass | Pass | Pass | Pass | Reuses resolver and builds runtime-neutral `ParameterSchema`. |
| `media-tool-path-resolver.ts` | Pass | Pass | Pass | Pass | Security-sensitive path policy has one owner. |
| `media-generation-service.ts` | Pass | Pass | Pass | Pass | Governing execution owner for side effects. |
| `media-tool-manifest.ts` | Pass | Pass | Pass | Pass | Canonical projection source. |
| `media-autobyteus-tools.ts` / `register-media-tools.ts` | Pass | Pass | Pass | Pass | Thin AutoByteus adapter and registry entrypoint. |
| Codex media projection files | Pass | Pass | N/A | Pass | Runtime transport only; no model/path/provider logic. |
| Claude media projection/normalizer files | Pass | Pass | N/A | Pass | MCP transport and event/result envelope handling only. |
| `autobyteus-ts/src/multimedia/*` | Pass | Pass | N/A | Pass | Provider/client library remains below server boundary. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server media subsystem | Pass | Pass | Pass | Pass | May import `autobyteus-ts` multimedia factories and generic schema/file utilities; must not import runtime-specific Codex/Claude SDK code. |
| Runtime projections | Pass | Pass | Pass | Pass | May import media manifest/contracts and runtime SDK helpers; must not create clients, read env defaults, or resolve paths directly. |
| `ServerSettingsService` | Pass | Pass | Pass | Pass | May import neutral media default constants only. |
| `autobyteus-ts` provider library | Pass | Pass | Pass | Pass | Must not import server code; remains reusable dependency. |
| Frontend/settings UI | Pass | Pass | Pass | Pass | Must not infer backend media tool execution behavior. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `MediaToolManifest` | Pass | Pass | Pass | Pass | Projection builders depend on manifest rather than redefining names/descriptions/schemas. |
| `MediaGenerationService` | Pass | Pass | Pass | Pass | All provider calls/downloads/result shaping live here. |
| `MediaModelResolver` | Pass | Pass | Pass | Pass | Prevents scattered `process.env.DEFAULT_*` reads and duplicated catalog lookup. |
| `MediaPathResolver` | Pass | Pass | Pass | Pass | Prevents per-runtime path safety drift. |
| `ImageClientFactory` / `AudioClientFactory` | Pass | Pass | Pass | Pass | Only the media service should create clients. |
| `ConfiguredAgentToolExposure` | Pass | Pass | Pass | Pass | Categorizes enabled tool names; does not own schemas or execution. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getMediaToolManifestEntry(toolName)` | Pass | Pass | Pass | Low | Pass |
| `MediaGenerationService.generateImage(context, input)` | Pass | Pass | Pass | Low | Pass |
| `MediaGenerationService.editImage(context, input)` | Pass | Pass | Pass | Low | Pass |
| `MediaGenerationService.generateSpeech(context, input)` | Pass | Pass | Pass | Low | Pass |
| `resolveMediaDefaultModel(toolName/media kind)` | Pass | Pass | Pass | Medium | Pass |
| `buildMediaDynamicToolRegistrationsForEnabledToolNames(options)` | Pass | Pass | Pass | Low | Pass |
| `buildClaudeMediaMcpServer(options)` | Pass | Pass | Pass | Low | Pass |
| `registerMediaTools()` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/media/` | Pass | Pass | Low | Pass | Correct server-owned tool capability folder. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/media/` | Pass | Pass | Low | Pass | Correct Codex transport/projection folder. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/media/` | Pass | Pass | Low | Pass | Correct Claude transport/projection folder. |
| `autobyteus-server-ts/src/config/media-default-model-settings.ts` | Pass | Pass | Low | Pass | Neutral config location is justified. |
| `autobyteus-ts/src/multimedia/` | Pass | Pass | Low | Pass | Provider/client library remains reusable and server-independent. |
| `autobyteus-ts/src/tools/multimedia/` | Pass | Pass | Low | Pass | Explicitly becomes legacy local tool boundary and is removed/decommissioned. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider clients/model catalogs | Pass | Pass | N/A | Pass | Existing `autobyteus-ts/src/multimedia` remains the correct owner. |
| Server tool loader | Pass | Pass | N/A | Pass | Extend `agent-tool-loader.ts`. |
| AutoByteus local registry | Pass | Pass | N/A | Pass | Keep `defaultToolRegistry` as runtime surface with server-owned wrappers. |
| Codex dynamic tools | Pass | Pass | N/A | Pass | Existing dynamic-tool mechanism fits. |
| Claude MCP projection | Pass | Pass | N/A | Pass | Existing MCP server builders/allowed-tool path fits. |
| Server settings persistence | Pass | Pass | N/A | Pass | Existing `ServerSettingsService`/`appConfigProvider` path fits. |
| Canonical media execution service | Pass | Pass | Pass | Pass | New service is justified because no existing owner spans all runtimes. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old `autobyteus-ts` media tool classes/registrations | No target retention | Pass | Pass | Clean-cut removal is explicit and required in final state. |
| Public tool names | No alternate names | Pass | Pass | Preserve `generate_image`, `edit_image`, `generate_speech`. |
| Per-runtime copied implementations | No | Pass | Pass | Design rejects copying execution logic into Codex/Claude. |
| External/user-configured media MCP dependency | No | Pass | Pass | Server-owned built-in projection is the target. |
| Raw env default lookup scattered across files | No | Pass | Pass | Central resolver reads server config. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Server media subsystem creation | Pass | Pass | Pass | Pass |
| AutoByteus wrapper/loader registration | Pass | Pass | Pass | Pass |
| Old `autobyteus-ts` media tool decommission | Pass | Pass | Pass | Pass |
| Exposure resolver + Codex projection | Pass | Pass | Pass | Pass |
| Claude MCP projection + event/result normalization | Pass | Pass | Pass | Pass |
| Schema refresh/default-model change handling | Pass | Pass | Pass | Pass |
| Tests and validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime projection shape | Yes | Pass | Pass | Pass | Codex good/bad examples make the authoritative boundary clear. |
| Duplicate registration removal | Yes | Pass | Pass | Pass | Explicitly rejects relying on registry overwrite warnings. |
| Default model resolver identity | Yes | Pass | Pass | Pass | Shows typed tool/media-kind input rather than raw env strings. |
| Claude MCP naming | Yes | Pass | Pass | Pass | Explains why `autobyteus_image_audio` is intentionally stable. |
| Path handling | Yes | Pass | Pass | Pass | Clarifies service-owned safe path normalization. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | Requirements and design cover AutoByteus, Codex, Claude, generated-output semantics, default model settings, removal, and tests. | N/A | Closed for architecture review |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A. No design-review findings require upstream rework.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implement the path policy exactly behind `MediaPathResolver`. Existing `resolveSafePath` allows workspace, Downloads, and temp roots; if implementation changes allowed roots for input images, document and test that explicitly so cross-runtime exposure does not broaden filesystem access.
- Ensure default-model setting changes refresh or rebuild dynamic media schemas for future AutoByteus sessions. `ToolDefinition` caches schemas; the final implementation should either invalidate the three media tool definitions on setting change or rebuild/reload schemas before run bootstrap.
- If Claude has user-provided MCP servers with the same `autobyteus_image_audio` name, the server-owned MCP projection may collide. The chosen stable name is approved, but implementation should avoid silent overwrite where the current MCP server map merge path can detect it.
- Removing `autobyteus-ts` media tool class exports is approved as clean-cut boundary removal. If downstream build/typecheck reveals real standalone package consumers, route back only if that becomes an explicit product requirement rather than adding hidden compatibility wrappers.
- Keep per-invocation client creation or a short-lived service-owned lease in the first pass; any cache must be keyed by exact model identifier and invalidated behind `MediaGenerationService`.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Route to implementation with the requirements, investigation notes, design spec, and this design review report.
