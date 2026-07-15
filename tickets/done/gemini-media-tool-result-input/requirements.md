# Requirements Doc — Direct Gemini `.m4a` Media Tool Result Input

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Fix the direct Gemini 3.1 Pro Preview media handoff bug where an agent successfully calls `read_media_file` on a `.m4a` audio file, but the following Gemini request is rendered without the audio media part. The model then receives only text/tool history, which explains the unexpectedly tiny prompt-token count for a 36+ minute audio file.

User clarification on 2026-07-03: this is **direct Gemini 3.1 Pro Preview**, not an RPA-backed model. The design scope has been corrected accordingly.

## Investigation Findings

- `read_media_file` is not the failing component. It returns a `ContextFile` for the `.m4a` file.
- `ContextFileType.fromPath()` recognizes `.m4a` as `ContextFileType.AUDIO`.
- `ToolResultContinuationBuilder`, `AgentInputPipeline`, and `LLMRequestAssembler` preserve that audio context file into the next `LLMUserMessage.audio_urls` and append it to the request context.
- The failure occurs at direct Gemini rendering: `GeminiPromptRenderer` calls `mediaSourceToBase64()`, which delegates local-file validation to `media-payload-formatter.isValidMediaPath()`.
- `isValidMediaPath()` has a separate hard-coded media extension allowlist and **omits `.m4a`**.
- As a result, `.m4a` is accepted by the context-file/tool layer but rejected by the Gemini media payload layer.
- `GeminiPromptRenderer` currently catches the conversion error, logs it, and continues. That turns an intended media request into a text-only request instead of failing loudly.
- A focused probe confirmed the behavior: local `.m4a` resolves MIME `audio/mp4`, but `isValidMediaPath()` returns `false`, `mediaSourceToBase64()` throws, and Gemini renders only the text part. A comparable `.mp3` renders text plus `inlineData`.
- The user's actual audio file exists and is `26,794,681` bytes (`26M`), so this is not a missing-file problem.
- After re-reading the design principles and examples, the design issue is classified as duplicated policy / shared-structure looseness: two code owners make contradictory decisions about the same subject, “is this file supported media?”

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix with required small refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination + Shared Structure Looseness + Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `ContextFileType` and `media-payload-formatter` each maintain media extension policy. They disagree on `.m4a`. Gemini then silently skips the declared media.
- Requirement or scope impact: The fix must remove the duplicated media-extension authority and enforce an invariant that declared media either renders as media or fails explicitly. Merely adding `.m4a` to one second whitelist is not sufficient design-wise.

## Recommendations

- Create one shared media-kind classifier for image/audio/video extension policy.
- Make both context-file typing and LLM media payload validation depend on that classifier.
- Ensure `.m4a` is supported as audio and renders to Gemini `inlineData` with MIME `audio/mp4`.
- Remove the duplicate local media whitelist from `media-payload-formatter`.
- Change direct Gemini rendering so declared media conversion failure is surfaced instead of silently producing a text-only prompt.
- Add durable tests for the full `read_media_file -> .m4a ContextFile -> LLMUserMessage.audio_urls -> Gemini inlineData` path.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-small

## In-Scope Use Cases

- UC-001: Direct Gemini 3.1 Pro Preview agent calls `read_media_file` on `.m4a`; the next Gemini request includes an audio media part.
- UC-002: Shared media classification consistently treats `.m4a` as audio in both context-file inference and media payload conversion.
- UC-003: Declared media conversion failures do not silently downgrade the request to text-only.
- UC-004: Existing supported image/audio/video formats continue to render correctly.

## Out of Scope

- RPA-specific media forwarding or browser automation behavior.
- AudioTranscriber prompt changes.
- New transcription features or provider/model selection changes.
- Committing private user audio as a fixture.
- Fabricating token counts. Token usage should reflect provider metadata; if future API/E2E proves media was sent but provider usage under-reports it, that should be handled as a follow-up usage-reporting task.

## Functional Requirements

- FR-001: `read_media_file` results that hydrate to media `ContextFile`s must continue into same-turn LLM continuation as media-bearing `LLMUserMessage`s.
- FR-002: The codebase must have one authoritative media extension-to-kind policy for context media, including `.m4a` as audio.
- FR-003: `ContextFileType.fromPath()` must use that shared media policy for image/audio/video classification rather than owning its own media extension switch.
- FR-004: `media-payload-formatter.isValidMediaPath()` must use that shared media policy rather than owning its own media whitelist.
- FR-005: Direct Gemini rendering must convert a local `.m4a` audio source into an `inlineData` part with MIME `audio/mp4` and base64 payload.
- FR-006: Direct Gemini rendering must not silently omit declared media when media conversion fails; it must surface an actionable error before provider invocation or fail the request assembly.
- FR-007: Existing media types currently supported by either context-file media classification or media payload conversion must remain covered unless implementation discovers a provider-specific unsupported type and records that as an explicit error path.
- FR-008: Durable tests must fail if a `.m4a` tool result reaches Gemini as text only.

## Acceptance Criteria

- AC-001: Unit tests for the shared media classifier verify `.m4a -> audio` and verify the expected image/audio/video extension set from the old two lists is represented once.
- AC-002: `ContextFileType.fromPath('sample.m4a')` returns `ContextFileType.AUDIO` through the shared classifier.
- AC-003: `isValidMediaPath()` returns `true` for an existing local `.m4a` file and `mediaSourceToBase64()` returns its base64 bytes.
- AC-004: `GeminiPromptRenderer` with a local `.m4a` in `audio_urls` renders a Gemini message containing both text and an `inlineData` part with `mimeType: 'audio/mp4'`.
- AC-005: A renderer/request test verifies an invalid or unreadable declared media source does not produce a text-only Gemini request; it surfaces a media conversion error.
- AC-006: The `read_media_file` continuation integration test includes `.m4a` and verifies the final request message has the `.m4a` path in `audio_urls` and uses `append_user_message` mode.
- AC-007: Existing `.mp3`, image, and video media formatter/renderer tests continue to pass, adjusted only to use the shared classifier.
- AC-008: No durable test fixture contains private user audio or secrets; generated/temp synthetic media is used instead.

## Constraints / Dependencies

- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input`.
- Branch: `codex/gemini-media-tool-result-input`.
- Base/finalization target: `origin/personal` / `personal`.
- Current refreshed base commit: `5832196cca5215f4771b29a72d4f3fe20a0a8d8b`.
- `.env.test` was copied into `autobyteus-ts/.env.test` and `autobyteus-server-ts/.env.test`; do not print or commit secret values.
- Private user audio path must not be committed as a fixture.

## Assumptions

- Direct Gemini media input accepts `.m4a` audio when supplied as inline data with MIME `audio/mp4`.
- A small synthetic `.m4a` file is sufficient to test request construction; transcription quality does not need to be tested with private audio.
- Existing context-file audio/video/image support represents intended AutoByteus context-media support unless implementation discovers an explicit provider incompatibility.

## Risks / Open Questions

- OQ-001: If Gemini usage metadata still reports unexpectedly low input after media is confirmed sent, that is a separate provider usage-reporting investigation, not the root media-drop bug.
- OQ-002: Some video extensions in the existing allowlists may not be accepted by every provider. The shared classifier should represent AutoByteus context-media recognition; provider-specific unsupported cases must fail explicitly, not silently skip.
- OQ-003: Tightening Gemini renderer behavior may reveal previously hidden invalid media references. This is intentional but should have clear error messages.

## Requirement-To-Use-Case Coverage

- UC-001: FR-001, FR-005, FR-006, FR-008
- UC-002: FR-002, FR-003, FR-004
- UC-003: FR-006, FR-008
- UC-004: FR-002, FR-007

## Acceptance-Criteria-To-Scenario Intent

- AC-001 through AC-003 protect the shared media classification invariant.
- AC-004 protects direct Gemini media rendering for `.m4a`.
- AC-005 protects against silent text-only downgrade.
- AC-006 protects the tool-result continuation path.
- AC-007 protects regression safety for existing formats.
- AC-008 protects privacy and secret hygiene.

## Approval Status

Refined after user clarified the direct Gemini model path and explicitly requested design-principles/design-examples-based redesign. Ready for architecture review.
