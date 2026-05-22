# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Users can attach context files in the frontend agent input form. The backend already carries those attachments as `ContextFile` data and sends media files to multimodal-capable runtimes as raw image/audio/video inputs. The missing behavior is narrower: the first runtime-visible user message text does not consistently include the server-side local file paths for those context files.

This creates a continuity gap in multi-agent/team workflows: an early agent may see an attached image as raw multimodal input, but later validation/review agents cannot reference or reattach that same file by absolute path unless the first agent manually knows or discovers the path. The requested behavior is to enhance the constructed user/runtime input message itself so that, when local context files are present, the text also includes a clear `Reference files:` section listing each complete absolute server-side path.

## Investigation Findings

- Frontend websocket send paths submit context attachments as `context_file_paths` / `contextFilePaths`; backend websocket handlers convert those entries into `ContextFile` objects and construct `AgentInputUserMessage` instances.
- Browser-uploaded composer files are finalized into run/member-owned `context_files/` storage and represented by `/rest/.../context-files/...` locators. `ContextFileLocalPathResolver` can resolve those locators back to absolute local paths.
- Native AutoByteus runtime input flows through `AgentInputPipeline`. The mandatory server-side `UserInputContextBuildingProcessor` resolves context file locators/relative paths into absolute local paths and mutates `message.contextFiles`; `buildLLMUserMessage` then supplies media arrays but currently leaves the text content without a reference-path section.
- Codex runtime bypasses `AgentInputPipeline` and uses `toCodexUserInput`. It maps image context files to `localImage`/image inputs but does not include those image local paths in the text item.
- Claude Agent SDK runtime bypasses `AgentInputPipeline` and currently sends only `message.content`; it does not surface `message.contextFiles` paths to the model.
- Existing inter-agent `send_message_to.reference_files` behavior is not the problem and is out of scope. When an agent explicitly passes `reference_files`, that path already works. This ticket only changes user/runtime input construction for attached context files.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Small local extraction likely needed
- Evidence basis: Context files are represented structurally and can resolve to absolute paths, but path rendering is missing in the runtime-visible text for native multimodal messages, Codex image input, and Claude direct text input.
- Requirement or scope impact: Add one shared current-user-context-file text augmentation utility and call it only from the runtime input construction paths for native AutoByteus, Codex, and Claude.

## Recommendations

Introduce a small shared current-user-context-file reference text utility, then use it only from:

1. native `buildLLMUserMessage` for processed `AgentInputUserMessage.contextFiles`,
2. Codex `toCodexUserInput` for direct app-server input mapping,
3. Claude `ClaudeSession.sendTurn` for direct SDK text submission, using `ContextFileLocalPathResolver` through the shared utility's `resolveUri` callback for finalized context-file locators.

Do not modify existing inter-agent message/reference-file builders for this ticket. They are already controlled by the agent's explicit `send_message_to.reference_files` tool arguments.

The utility should collect only usable local absolute file paths, including resolved `file://` URLs and server-resolved context-file locators when a runtime-specific resolver is supplied, dedupe them, and append exactly one `Reference files:` section to the user/runtime text while preserving current media inputs.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user submits text plus one or more context files from the agent input form.
- UC-002: A browser-uploaded context file has a finalized `/rest/.../context-files/...` locator that the backend can resolve to a local absolute path.
- UC-003: A workspace/local context file is already an absolute path or can be resolved to one by the current runtime path-resolution owner.
- UC-004: Native multimodal runtimes receive media arrays exactly as before, plus a `Reference files:` text section in the user message sent to the LLM.
- UC-005: Codex runtime receives image inputs exactly as before, plus a text item with the local image/file reference paths.
- UC-006: Claude Agent SDK runtime receives a text turn that includes local context-file reference paths even though it does not send raw multimodal file payloads.
- UC-007: Later agents, validators, and team handoff messages can read/copy the absolute paths from prior user-message text if they need to pass them explicitly as `reference_files`.
- UC-008: Text-only messages without local context files are not changed.

## Out of Scope

- Changing frontend attachment UI behavior or thumbnail rendering.
- Changing upload/finalization storage layout.
- Granting new filesystem access permissions to agents/runtimes.
- Automatically creating team communication `reference_files` metadata by scanning natural-language message content.
- Automatically re-attaching files to downstream agents.
- Modifying existing inter-agent `send_message_to` reference-file builders or delivery behavior.
- Adding new raw multimodal support to Claude Agent SDK runtime.
- Exposing non-local HTTP/data URLs as `Reference files` entries.

## Functional Requirements

- FR-001: When a user/runtime input includes one or more local context files, the runtime-visible user message text must include a clearly labeled `Reference files:` section.
- FR-002: The section must list the complete absolute server-side local filesystem path for each local context file that can be resolved.
- FR-003: Existing runtime-specific multimodal attachment behavior must continue: image/audio/video context files must still be supplied to multimodal-capable runtimes as they are today.
- FR-004: Messages without local context files must not receive an empty `Reference files:` section.
- FR-005: Current-user-context-file block formatting must be centralized in a small shared utility reused by native runtime, Codex runtime mapping, and Claude runtime text mapping.
- FR-006: The text augmentation must be deterministic and idempotent for a single message construction pass; it must not repeatedly append an identical duplicate `Reference files:` section when a message is reused or reconstructed.
- FR-007: Duplicate context-file paths must appear only once in the section, preserving first-seen order.
- FR-008: The section format must be easy for agents to copy into `send_message_to.reference_files`, but this ticket must not change `send_message_to` itself.
- FR-009: Local path collection must ignore remote HTTP(S) URLs, data URLs, empty values, malformed `file://` URLs, and unresolved `/rest/...` locators rather than emitting misleading non-file reference entries.
- FR-010: Where the server runtime has a locator resolver, finalized context-file locators must be resolved to local absolute paths before rendering the reference section, including both Codex and Claude direct runtime paths.

## Acceptance Criteria

- AC-001: Given native AutoByteus user text `Please analyze` and context files `/abs/a.png` and `/abs/b.pdf`, the resulting `LLMUserMessage.content` contains exactly one `Reference files:` section with `- /abs/a.png` and `- /abs/b.pdf`, and the media arrays still contain media context files as before.
- AC-002: Given native AutoByteus user text with no context files, `LLMUserMessage.content` is unchanged by reference-file rendering.
- AC-003: Given duplicate context files that resolve to the same absolute path, the reference section lists that path once.
- AC-004: Given Codex input with an image context file `/abs/proof.png`, the Codex app-server input contains both a `localImage` item for `/abs/proof.png` and a text item with `Reference files:\n- /abs/proof.png`.
- AC-005: Given Claude Agent SDK input with a context file `/abs/proof.png`, the cached/sent user content includes `Reference files:\n- /abs/proof.png`.
- AC-006: Given a finalized browser-uploaded locator resolvable by `ContextFileLocalPathResolver`, native, Codex, and Claude runtime text render the resolved absolute local path, not the `/rest/...` locator.
- AC-007: Given an unresolved REST locator, HTTP URL, or data URL, no misleading `Reference files` entry is produced for that value.
- AC-008: Existing inter-agent `send_message_to.reference_files` behavior remains unchanged.
- AC-009: Focused unit coverage verifies zero, one, multiple, duplicate, file-URL, unresolved locator/URL, native builder, Codex mapper, and Claude text-send cases.
- AC-010: The implementation does not modify inter-agent message/reference-file builders.

## Constraints / Dependencies

- Must respect existing backend/frontend SDK contracts for `ContextFile` and `AgentInputUserMessage`.
- Must not break provider-specific multimodal support.
- Must use absolute server-side paths for `Reference files`, not frontend blob URLs, display names, or unresolved REST locators.
- Must preserve current run-scoped context-file storage and resolver ownership.
- Must leave inter-agent `send_message_to.reference_files` behavior unchanged.

## Assumptions

- Context file records either already contain absolute local paths or can be resolved to them by the existing server-side path resolution owners before/while runtime input is built.
- Exposing absolute local paths in LLM-visible message text is intended by product direction for this local/server-side application trust model.
- Downstream agents can use absolute paths when they run on the same server/workspace filesystem or when handoff tools receive those paths as explicit `reference_files`.

## Risks / Open Questions

- RISK-001: Absolute paths may disclose host filesystem layout to remote model providers. This is explicitly requested, but implementation/release notes should acknowledge the exposure.
- RISK-002: Codex's direct runtime path currently has no workspace-root-aware relative path resolver in `toCodexUserInput`; this design only guarantees absolute/local/file-url/final-locator references there.
- RISK-003: Claude Agent SDK runtime still will not receive raw media bytes; the new behavior only exposes resolved local file paths in text.
- OQ-001: Should future work provide an explicit structured current-turn reference metadata channel for all runtime backends, instead of relying on text for agent discoverability? Out of scope for this change.

## Requirement-To-Use-Case Coverage

- UC-001: FR-001, FR-002, FR-004, FR-006, FR-007, FR-008
- UC-002: FR-002, FR-009, FR-010
- UC-003: FR-002, FR-009
- UC-004: FR-001, FR-003, FR-005
- UC-005: FR-001, FR-003, FR-005, FR-010
- UC-006: FR-001, FR-005
- UC-007: FR-008
- UC-008: FR-004

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates native positive formatting plus multimodal preservation.
- AC-002 validates no-op behavior for text-only messages.
- AC-003 validates dedupe/idempotent path collection.
- AC-004 validates Codex image continuity, the main failure case from the user report.
- AC-005 validates Claude direct-runtime text continuity.
- AC-006 validates browser-uploaded context-file locator resolution to absolute paths.
- AC-007 validates safe omission of non-local/unresolved references.
- AC-008 validates explicit non-regression for existing inter-agent behavior.
- AC-009 validates durable executable coverage.
- AC-010 validates scope containment.

## Approval Status

Refined after user clarification: scope is only user/runtime input message construction for attached context files. Existing inter-agent reference-file builders are out of scope and must not be changed for this ticket.
