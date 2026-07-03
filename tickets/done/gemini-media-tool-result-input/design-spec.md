# Design Spec — Direct Gemini `.m4a` Media Tool Result Input

## Current-State Read

The relevant user path is direct Gemini 3.1 Pro Preview, not RPA. The current execution path is:

`User request -> AgentTurnRunner -> ReadMediaFile -> ContextFile -> ToolResultContinuationBuilder -> AgentInputPipeline / buildLLMUserMessage -> LLMRequestAssembler -> GeminiPromptRenderer -> mediaSourceToBase64 -> Gemini contents[].parts`

The code is correct until provider rendering:

- `ReadMediaFile` validates the file and returns `ContextFile(absolutePath)`.
- `ContextFileType.fromPath()` classifies `.m4a` as `AUDIO`.
- `ToolResultContinuationBuilder` collects the returned context file.
- `AgentInputPipeline` uses `append_user_message` because context files are present.
- `buildLLMUserMessage()` maps the context file into `audio_urls`.
- `LLMRequestAssembler` appends that media-bearing message before render.
- `GeminiPromptRenderer` attempts to encode media by calling `mediaSourceToBase64()`.
- `mediaSourceToBase64()` only reads local files that pass `isValidMediaPath()`.
- `isValidMediaPath()` has its own duplicated extension allowlist and does not include `.m4a`.
- `GeminiPromptRenderer` catches the conversion error, logs it, and continues, so the provider payload becomes text-only.

This is a design issue, not just a typo. Two components own the same policy — “which file extensions are supported context media?” — and they disagree. The right design is one authoritative media classification owner, with context-file typing and media payload conversion depending on it.

## Intended Change

Make context media classification authoritative and enforce direct Gemini media rendering:

1. Add one shared, semantically tight media-kind classifier for image/audio/video file extensions.
2. Remove duplicated media extension policy from `ContextFileType` and `media-payload-formatter`.
3. Use the shared classifier so `.m4a` is consistently audio.
4. Make direct Gemini render `.m4a` as `inlineData` with MIME `audio/mp4`.
5. Stop direct Gemini from silently downgrading declared media requests to text-only prompts when conversion fails.
6. Add tests that fail if a `.m4a` tool result reaches Gemini as text only.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix with required refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination + Shared Structure Looseness + Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `.m4a` is audio according to `ContextFileType`, but invalid according to `media-payload-formatter.isValidMediaPath()`. Direct Gemini then suppresses the error and sends text only.
- Design response: create one shared media classifier, make both callers depend on it, and make declared media conversion failure explicit.
- Refactor rationale: Adding `.m4a` to the second whitelist fixes today but leaves the duplicated authority that caused the bug. Design principles require extracting repeated policy into one owned structure and removing obsolete duplicates.
- Intentional deferrals and residual risk, if any: Token usage/reporting changes are deferred unless API/E2E proves Gemini receives media but still reports misleadingly low input. The in-scope root bug is media not being rendered into the request.

## Terminology

- `Context media`: image/audio/video file sources that may be attached to an LLM user message.
- `MediaFileKind`: a tight classification of a source extension as `image`, `audio`, or `video`.
- `Declared media`: any source present in `Message.image_urls`, `Message.audio_urls`, or `Message.video_urls`; it is intended model input and must not be silently ignored.
- `Provider renderer`: the adapter that transforms internal `Message`s into provider-specific request payloads.

## Design Reading Order

1. Primary media execution spine.
2. Bounded local shared media-classification spine.
3. Ownership map and duplicate-policy removal.
4. File responsibilities and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the duplicate media extension list in `media-payload-formatter.isValidMediaPath()`.
- Required action: remove media-specific extension cases from `ContextFileType.fromPath()` and delegate them to the shared media classifier.
- Required action: remove silent Gemini text-only fallback for declared media conversion failure.
- The design is invalid if it keeps two media allowlists or adds `.m4a` to one list while leaving the other as a separate authority.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `read_media_file` tool result | Gemini `contents[].parts.inlineData` | Agent runtime + Gemini renderer | This is the user-visible path that currently drops `.m4a`. |
| DS-002 | Bounded Local | Media source string | `MediaFileKind | null` | Shared media classifier | This is the invariant owner that removes duplicated extension policy. |
| DS-003 | Return-Event | Gemini `usageMetadata` | Token Meter usage event | Existing token usage path | Used as validation signal only; not the root fix. |

## Primary Execution Spine(s)

`ReadMediaFile -> ContextFile -> ToolResultContinuationBuilder -> AgentInputPipeline / LLMUserMessage.audio_urls -> LLMRequestAssembler -> GeminiPromptRenderer -> Gemini inlineData part`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The media file returned by the tool is carried as a context file, mapped to `audio_urls`, appended to LLM context, and rendered as a Gemini `inlineData` part. | Tool result, context file, LLM user message, Gemini rendered message | Agent runtime for continuation; Gemini renderer for provider shape | Media kind classification, MIME lookup, base64 encoding, error handling |
| DS-002 | Callers ask one shared classifier whether a source extension is image/audio/video. `ContextFileType` and media validation no longer make separate decisions. | Media source string, extension, media kind | Shared media classifier | URL/path extension extraction, extension map tests |
| DS-003 | Gemini usage metadata returns through the existing token usage observation/event path. It helps validate the fix but does not own media rendering. | Usage metadata, usage observation, token usage event | Existing token usage path | Provider metadata limitations |

## Spine Actors / Main-Line Nodes

- `ReadMediaFile`: validates file path and returns `ContextFile`.
- `ContextFile`: carries URI and file type across tool/result/message boundaries.
- `ToolResultContinuationBuilder`: constructs same-turn continuation from tool results.
- `AgentInputPipeline` / `buildLLMUserMessage`: converts context files into LLM media arrays.
- `LLMRequestAssembler`: appends media-bearing message into working context.
- `GeminiPromptRenderer`: owns Gemini-specific media part creation.

## Ownership Map

- `ReadMediaFile` owns file existence validation and context-file production. It must not know provider request formats.
- `ContextFileType` owns broad context type inference. It should delegate media extension decisions to the shared classifier.
- Shared media classifier owns only extension-to-`MediaFileKind` policy. It must not perform file I/O, MIME lookup, provider rendering, or byte encoding.
- `media-payload-formatter` owns source-to-bytes conversion and MIME resolution. It must not own an independent media extension list.
- `GeminiPromptRenderer` owns Gemini part shape and must treat declared media as required request content.
- Token usage remains a return-path validation signal. It must not decide whether media was attached.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ContextFileType.fromPath()` | Shared media classifier for media extensions; local switch for non-media document/code extensions | Public context-file type inference | Independent media allowlist |
| `isValidMediaPath()` | Shared media classifier + filesystem stat | Public media path validation for payload conversion | Independent media allowlist |
| `GeminiPromptRenderer.render()` | Gemini renderer + media payload formatter | Provider request rendering | Media support policy duplicated from classifier |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `validExtensions` set inside `media-payload-formatter.isValidMediaPath()` | Duplicates media support policy and caused `.m4a` rejection | Shared media classifier | In This Change | Preserve old supported extensions plus `.m4a`. |
| Media extension `case` blocks inside `ContextFileType.fromPath()` | Duplicates media support policy | Shared media classifier mapped to `ContextFileType` enum | In This Change | Keep non-media cases local. |
| Gemini catch-and-skip behavior for declared media conversion errors | Silently converts media request to text-only request | Explicit media conversion failure | In This Change | Error should include media source and provider context. |

## Return Or Event Spine(s) (If Applicable)

Existing return path:

`Gemini usageMetadata -> createGeminiTokenUsageObservation -> LlmPhase.notifyAgentTokenUsageUpdated -> token ledger/server -> Token Meter`

No design change is required here for the root bug. API/E2E should use this path to verify that after media is rendered, usage no longer looks like a tiny text-only call. If provider metadata remains low despite confirmed media `inlineData`, that becomes a separate token-usage reporting task.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: shared media classifier.

`Source string -> extract URL/path pathname -> lower-case extension -> lookup in extension map -> MediaFileKind | null`

This local spine matters because it becomes the single authority used by both context-file inference and media payload validation.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Media extension classification | DS-001, DS-002 | `ContextFileType`, `media-payload-formatter` | One source of truth for image/audio/video extensions | Prevents contradictory `.m4a` decisions | Duplicate whitelists reappear |
| MIME resolution | DS-001 | `media-payload-formatter`, Gemini renderer | Determine `audio/mp4` for `.m4a` | Gemini inlineData needs MIME | Context-file typing starts owning provider details |
| Base64 encoding | DS-001 | Gemini renderer via formatter | Convert file bytes to inlineData payload | Provider request contract | Tool layer reads media bytes too early |
| Error reporting | DS-001 | Gemini renderer | Fail declared media conversion explicitly | Prevents text-only downgrade | Silent prompt corruption continues |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Context media extension policy | No single existing authority | Create New | Required by both agent message and LLM utility layers | `multimedia/` is provider/model generation-focused, not generic context-media typing; `llm/utils` would be too provider-adjacent. |
| Media byte conversion | `llm/utils/media-payload-formatter.ts` | Extend | Already owns base64/data URI conversion | N/A |
| Gemini request rendering | `GeminiPromptRenderer` | Extend | Already owns Gemini payload shape | N/A |
| Tool-result continuation | Agent loop/input pipeline | Reuse | Current flow is correct | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared TypeScript utilities | Media extension-to-kind classification | DS-002 | Agent message and LLM formatter | Create New file | Dependency-neutral. |
| Agent message/runtime | Context-file continuation and mapping | DS-001 | Agent runtime | Reuse/Extend tests | Code likely already correct. |
| LLM media utilities | File/URL/data/base64 conversion and MIME | DS-001 | Provider renderers | Extend | Remove duplicate list. |
| Gemini provider adapter | Gemini `inlineData` parts and conversion failure behavior | DS-001 | Direct Gemini model | Extend | Main behavior fix. |
| Token usage | Usage return path | DS-003 | Existing meter | Reuse | No design change unless future evidence requires. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/utils/media-file-kind.ts` | Shared utilities | Media classifier | `MediaFileKind`, extension map, extraction/lookup functions | One tight concern | N/A |
| `autobyteus-ts/src/agent/message/context-file-type.ts` | Agent message | Context typing | Delegate media classification; keep non-media extension logic | Existing public enum owner | Yes |
| `autobyteus-ts/src/llm/utils/media-payload-formatter.ts` | LLM utilities | Media formatter | Validate local media paths via classifier; convert to base64/data URI; resolve MIME | Existing conversion owner | Yes |
| `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Gemini adapter | Provider renderer | Render media parts and fail on conversion failure | Existing provider shape owner | Indirect |
| Tests under existing test folders | Coverage | Regression tests | `.m4a` classifier, formatter, continuation, Gemini renderer | Existing test placement by owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Image/audio/video extension policy | `autobyteus-ts/src/utils/media-file-kind.ts` | Shared utilities | Needed by two current owners; currently duplicated | Yes | Yes | A kitchen-sink media descriptor with MIME/file-size/provider fields |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MediaFileKind` | Yes | Yes | Low | Keep as only `image`, `audio`, `video`. |
| Supported extension map | Yes | Yes | Low | Store each extension once and map to one kind. Do not include MIME or provider fields. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/utils/media-file-kind.ts` | Shared utilities | Media classifier | Export `MediaFileKind`, `getMediaFileKindFromPath(source)`, `isSupportedMediaFileExtension(ext)`, and extension sets if tests need them | One authoritative concern | N/A |
| `autobyteus-ts/src/agent/message/context-file-type.ts` | Agent message | Context typing | Use classifier for media; keep non-media extension switch | Existing public enum owner | Yes |
| `autobyteus-ts/src/llm/utils/media-payload-formatter.ts` | LLM utilities | Media payload formatter | Use classifier in `isValidMediaPath`; keep file I/O/conversion/MIME | Existing conversion owner | Yes |
| `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Gemini adapter | Gemini renderer | Build `inlineData`; throw/surface media conversion errors | Existing provider owner | Formatter uses classifier |
| `autobyteus-ts/tests/unit/utils/media-file-kind.test.ts` or nearest existing utility test folder | Tests | Classifier tests | One map, `.m4a` audio, existing extension coverage | Matches new owner | N/A |
| `autobyteus-ts/tests/unit/llm/utils/media-payload-formatter.test.ts` | Tests | Formatter coverage | Existing `.m4a` valid path/base64 | Existing owner test | Yes |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts` | Tests | Gemini renderer coverage | `.m4a` inlineData and invalid-media failure | Existing owner test | Yes |
| `autobyteus-ts/tests/integration/agent/read-media-file-continuation-flow.test.ts` | Tests | End-to-end local continuation coverage | `.m4a` in `audio_urls`, append mode | Existing integration owner | Yes |

## Ownership Boundaries

- Context-file typing may classify media but must not encode media.
- Media payload formatter may encode media but must not decide media support independently.
- Gemini renderer may decide Gemini payload shape but must not own extension policy.
- Tool-result continuation may carry context files but must not provider-render them.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Shared media classifier | Extension map and source extension extraction | `ContextFileType`, `media-payload-formatter` | Local extension lists in callers | Add classifier functions/export needed by caller |
| `media-payload-formatter` | File read/download/base64/data URI/MIME | Gemini renderer | Renderer manually reading files or validating extensions | Add formatter method or improve formatter |
| `GeminiPromptRenderer` | Gemini content parts | Gemini LLM adapter | LLM adapter constructing inlineData itself | Strengthen renderer behavior/tests |

## Dependency Rules

- `ContextFileType` may import the shared media classifier.
- `media-payload-formatter` may import the shared media classifier.
- Shared media classifier must not import from agent, LLM provider, filesystem, Axios, server, or frontend code.
- Gemini renderer must use `media-payload-formatter` for conversion.
- No file other than the shared classifier may maintain image/audio/video extension support policy.
- No provider renderer may catch a declared media conversion failure and continue with text only.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getMediaFileKindFromPath(source: string): MediaFileKind | null` | Context media source | Classify supported media extension | Local path, file URL, HTTP URL, or similar source string | No file I/O. |
| `isSupportedMediaFileExtension(extension: string): boolean` | Extension support | Test or validate explicit extension | Extension string with or without leading dot | Optional if useful. |
| `isValidMediaPath(filePath: string): Promise<boolean>` | Existing local media file | Confirm supported media path exists and is file | Local filesystem path | Uses classifier + fs stat. |
| `mediaSourceToBase64(mediaSource: string): Promise<string>` | Media source bytes | Convert supported source to base64 | Data URI, URL, valid local media path, base64 | `.m4a` must work. |
| `GeminiPromptRenderer.render(messages)` | Gemini request payload | Convert internal messages to Gemini contents | `Message[]` | Declared media conversion failure must surface. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getMediaFileKindFromPath` | Yes | Yes | Low | Keep to classification only. |
| `isValidMediaPath` | Yes | Yes | Low | Do not reintroduce extension map. |
| `GeminiPromptRenderer.render` | Yes | Yes | Low | Provider request shape only; use formatter for conversion. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared media classifier | `media-file-kind.ts` / `MediaFileKind` | Yes | Low | Avoid vague `media-helper`. |
| Declared media failure | `Gemini media conversion failed for <source>` | Yes | Low | Include provider/source in error. |

## Applied Patterns (If Any)

- Shared classifier / registry-like lookup: appropriate because there is a repeated, stable extension-to-kind policy.
- Provider adapter: `GeminiPromptRenderer` remains the provider-specific adapter and does not absorb generic media policy.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/utils/media-file-kind.ts` | File | Shared media classifier | Supported media extension-to-kind policy | Neutral cross-cutting owner for agent + LLM | File I/O, MIME, provider-specific details |
| `autobyteus-ts/src/agent/message/context-file-type.ts` | File | Context typing | Broad context type inference with delegated media classification | Existing public enum owner | Duplicate media extension cases |
| `autobyteus-ts/src/llm/utils/media-payload-formatter.ts` | File | Media payload conversion | Base64/data URI/MIME/file checks | Existing conversion owner | Independent media allowlist |
| `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | File | Gemini renderer | Gemini contents parts and explicit media failure | Existing provider owner | Extension policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/utils` | Off-Spine Concern | Yes | Low | Existing neutral area; one small classifier is clearer than a new one-file top-level subsystem. |
| `autobyteus-ts/src/llm/utils` | Off-Spine Concern | Yes | Low | Formatter remains LLM payload support. |
| `autobyteus-ts/src/llm/prompt-renderers` | Provider Adapter | Yes | Low | Gemini renderer stays provider-specific. |
| `autobyteus-ts/src/agent/message` | Agent Message | Yes | Low | Context-file enum remains here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Shared classification | `ContextFileType.fromPath('a.m4a') -> getMediaFileKindFromPath('a.m4a') -> AUDIO`; `isValidMediaPath('a.m4a') -> same classifier -> true when file exists` | Add `.m4a` to `media-payload-formatter` but leave both files with separate lists | Prevents recurrence. |
| Gemini rendering | `{ role: 'user', parts: [{ text: '...' }, { inlineData: { mimeType: 'audio/mp4', data: '<base64>' } }] }` | `{ role: 'user', parts: [{ text: '...' }] }` after a console error | Captures the actual bug. |
| Failure behavior | Throw/surface `Failed to process Gemini media /path/file.m4a: <cause>` | `console.error(...); continue;` | Declared media is required user input, not optional decoration. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Only add `.m4a` to formatter whitelist | Smallest code patch | Rejected | Shared classifier replaces duplicate lists. |
| Keep Gemini log-and-skip for failed media | Avoid behavior change | Rejected | Declared media conversion failure must be explicit. |
| Add token-meter heuristic warning based on low token count | Would address visible symptom | Rejected for this scope | Fix media rendering; token reporting follow-up only if needed after media is confirmed sent. |

## Derived Layering (If Useful)

- Shared utility layer: media extension classification only.
- Agent message/runtime layer: context-file creation and continuation.
- LLM utility layer: media source conversion.
- Provider adapter layer: Gemini payload shape.
- Token usage return path: validation/observation only.

## Migration / Refactor Sequence

1. Add `autobyteus-ts/src/utils/media-file-kind.ts` with a single extension-to-kind map including `.m4a` as audio and all currently recognized media extensions.
2. Add unit tests for the classifier.
3. Update `ContextFileType.fromPath()` to ask the classifier first or after non-media cases, then map `MediaFileKind` to `ContextFileType`.
4. Update `media-payload-formatter.isValidMediaPath()` to remove its local extension set and use the classifier.
5. Ensure `getMimeType()` returns `audio/mp4` for `.m4a` paths and handles current path/URL/data URI cases correctly.
6. Update `GeminiPromptRenderer` so media conversion errors for declared media are thrown/surfaced instead of skipped.
7. Add Gemini renderer `.m4a` inlineData and invalid-media failure tests.
8. Update `read-media-file-continuation-flow.test.ts` to include `.m4a` and assert `audio_urls` survives into the final request message.
9. Run focused tests:
   - media classifier tests
   - context-file type tests
   - media payload formatter tests
   - Gemini prompt renderer tests
   - read-media-file continuation integration
10. Keep `.env.test` and private audio out of commits.

## Key Tradeoffs

- A shared classifier is slightly more structure than a one-line `.m4a` patch, but it directly fixes the architectural cause.
- Throwing on declared media conversion failure is stricter than current behavior, but silent text-only downgrade is worse and violates user intent.
- Keeping the classifier extension-only avoids a loose shared object with MIME, size, provider, and file-I/O responsibilities.

## Risks

- Previously hidden invalid media paths may now fail visibly.
- Some existing tests might have assumed media conversion failures are non-fatal; update only if those expectations allowed silent data loss.
- If provider token metadata remains low after media is confirmed present, a separate token usage reporting investigation may be needed.

## Guidance For Implementation

- Do not touch `ReadMediaFile` unless tests reveal a real issue there.
- Do not create a generic `media-helper` with mixed responsibilities.
- Do not duplicate extension maps in tests; import/export stable classifier data if tests need to assert coverage.
- Keep error messages actionable and provider-specific.
- Use tiny synthetic `.m4a` files for tests; the bytes do not need to be valid speech to validate request construction.
