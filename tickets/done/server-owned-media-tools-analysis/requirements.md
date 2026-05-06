# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by the user on 2026-05-05 to proceed as a refactoring/design ticket.

## Goal / Problem Statement

The existing `generate_image`, `edit_image`, and `generate_speech` tools are implemented as `autobyteus-ts` local tools, so they are naturally available to the AutoByteus runtime. The user wants to evaluate moving the tool ownership into `autobyteus-server-ts`, following the existing server-owned patterns for Browser tools and `publish_artifacts`, so the same media-generation capabilities can be exposed consistently to all runtimes, including Codex app-server and Claude.

## Investigation Findings

- The media-generation tool implementations currently live in `autobyteus-ts/src/tools/multimedia/image-tools.ts` and `autobyteus-ts/src/tools/multimedia/audio-tools.ts` and are registered by `autobyteus-ts/src/tools/register-tools.ts`.
- Server-owned tools already exist in `autobyteus-server-ts/src/agent-tools/*` and are loaded by `autobyteus-server-ts/src/startup/agent-tool-loader.ts`.
- Browser tools use a canonical server manifest/service plus runtime projections: AutoByteus local-tool registration, Codex dynamic tool registration, and Claude MCP projection.
- `publish_artifacts` follows the same server-owned pattern for AutoByteus local-tool registration plus Codex dynamic tool and Claude MCP exposure.
- Codex and Claude currently do not generically expose all `defaultToolRegistry` local tools; server-owned cross-runtime tools must be explicitly projected into their runtime-specific tool surfaces.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed if this is accepted as implementation scope
- Evidence basis: current media tool orchestration is inside the runtime package, while cross-runtime tool exposure is governed by the server through Browser and Published Artifact tool projections.
- Requirement or scope impact: The target is not a file move only; it requires a server-owned media tool contract/service and runtime-specific adapters.

## Recommendations

- Treat this as a separate follow-up ticket, not as a small extension of the server-settings dropdown UI ticket.
- Move the media *tool boundary/orchestration* into `autobyteus-server-ts`, while keeping multimedia model/client factories in `autobyteus-ts` as shared provider/client infrastructure.
- Reuse the Browser tool pattern: canonical server manifest + service + AutoByteus local wrapper + Codex dynamic registration + Claude MCP projection.
- Remove or decommission duplicate `autobyteus-ts` direct tool registration once server-owned wrappers provide the AutoByteus local-tool surface.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

## In-Scope Use Cases

- UC-001: An AutoByteus-runtime agent configured with `generate_image`, `edit_image`, or `generate_speech` can continue using those tools with the same public tool names and argument semantics.
- UC-002: A Codex app-server runtime agent configured with those tools receives equivalent server-owned dynamic tools without requiring an external image/audio MCP server.
- UC-003: A Claude runtime agent configured with those tools receives equivalent server-owned MCP-projected tools.
- UC-004: Generated files are written to the run workspace or another allowed safe output path and continue to produce artifact/file-change projections.
- UC-005: Default model settings continue to use `DEFAULT_IMAGE_EDIT_MODEL`, `DEFAULT_IMAGE_GENERATION_MODEL`, and `DEFAULT_SPEECH_GENERATION_MODEL`.

## Out of Scope

- Changing provider implementation behavior for OpenAI/Gemini/AutoByteus multimedia clients.
- Replacing the broader MCP server management system.
- Reworking the Media Library UI.
- Changing the already-created default media model selector UI except where needed to align docs/labels with server-owned semantics.

## Functional Requirements

- REQ-001: The server project must own canonical tool contracts for `generate_image`, `edit_image`, and `generate_speech`.
- REQ-002: The server-owned media tool service must execute generation/edit/speech requests using the existing multimedia client factories.
- REQ-003: The server-owned media tools must be projectable into AutoByteus, Codex app-server, and Claude runtime tool surfaces.
- REQ-004: Runtime projections must not duplicate tool-name ownership or expose conflicting implementations for the same canonical tool name.
- REQ-005: Output path resolution must be safe and runtime-context-aware.
- REQ-006: Model selection must read the server settings/env keys at execution/schema-build time and support future setting changes for new sessions/tool clients.
- REQ-007: Tool results and events must remain compatible with existing generated-output artifact/file-change classification.
- REQ-008: The old `autobyteus-ts` direct media tool classes/registrations must be removed or decommissioned so the server-owned implementation is the only authoritative first-party implementation for these tool names.

## Acceptance Criteria

- AC-001: `generate_image`, `edit_image`, and `generate_speech` appear as configurable local tools from the server-owned registration path.
- AC-002: AutoByteus runtime can execute each canonical tool and writes output to the resolved path.
- AC-003: Codex app-server runtime exposes and executes each canonical tool as a dynamic tool when configured for the agent.
- AC-004: Claude runtime exposes and executes each canonical tool through a server-owned MCP projection when configured for the agent.
- AC-005: No runtime receives two active implementations for the same canonical tool name.
- AC-006: Existing generated-output artifact/file-change semantics continue to detect successful media outputs.
- AC-007: Unit/integration tests cover manifest/schema building, model default resolution, safe path handling, and each runtime projection builder.
- AC-008: The final implementation has no duplicate active registration path for `generate_image`, `edit_image`, or `generate_speech`; the server-owned registration is the active first-party path.

## Constraints / Dependencies

- `autobyteus-server-ts` may depend on `autobyteus-ts`; `autobyteus-ts` must not depend on the server.
- Codex and Claude require explicit projection builders; adding a local tool to `defaultToolRegistry` is insufficient for those runtimes.
- Current multimedia client factories and models are in `autobyteus-ts` and should remain shared provider infrastructure.
- Existing tool names are public behavior and should remain `generate_image`, `edit_image`, and `generate_speech`.

## Assumptions

- The goal is first-party built-in availability across runtimes, not only availability through user-configured external MCP servers.
- Backward compatibility should preserve public tool names and arguments, but not preserve duplicated old internal ownership.

## Risks / Open Questions

- Image model capability metadata currently does not clearly distinguish generation-only vs edit-capable image models.
- Codex/Claude dynamic projections need their own path normalization for `input_images` and `mask_image`; current media input path normalization is an AutoByteus tool-invocation preprocessor.
- Client caching/lifecycle needs to be redesigned so setting changes and model changes do not leave stale clients attached to long-lived server singletons.
- Validation may require real provider credentials or test doubles for media clients.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008
- UC-002: REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007
- UC-003: REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007
- UC-004: REQ-005, REQ-007
- UC-005: REQ-006

## Acceptance-Criteria-To-Scenario Intent

- AC-001/AC-005/AC-008 ensure tool catalog and ownership cleanup.
- AC-002/AC-003/AC-004 ensure all runtime projections work.
- AC-006 protects existing artifact/file-change behavior.
- AC-007 ensures maintainable validation for the new server-owned boundary.

## Approval Status

Approved by the user in chat on 2026-05-05: “I completely agree… let’s just start to work on this new ticket… it’s going to be a refactoring ticket.”
