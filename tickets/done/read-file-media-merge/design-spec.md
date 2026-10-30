# Design Spec — read-file-media-merge (autobyteus-328)

## Solution And Approval Basis

- Current solution revision ID: `SR-006`
- Approved requirements: `requirements-doc.md` at SR-004 (SR-002 baseline; SR-004 adds REQ-009, the user's decision), approved by the user on 2026-10-29 (reference in its Document Status); basis: the user's option (a) in autobyteus-327.
- Behavior-defining supplements: none.
- Design status: `Ready`
- Investigation notes: `investigation-notes.md` (and `autobyteus-327/investigation-notes-327.md`).
- Authorities read (2026-10-29): `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`.
- Conflicts or discrepancies: DESIGN.md rule 10 (stored names follow renames) versus the user's decision DEC-001: this is a tool removal whose capability is absorbed by a tool every native agent always has, not a rename of a stored field; no current code maps the old name (unknown names are skipped by the existing generic rule), so no second name lives in current code. Recorded, no conflict to resolve.

## Current-State Read

Two tools in `autobyteus-ts` read files for the native AutoByteus runtime (327 notes): `read_file` (`tools/file/read-file.ts`, functional tool, text, the shared resolver `resolveFileToolPath` with denied paths) and `read_media_file` (`tools/multimedia/media-reader-tool.ts`, class tool, returns a `ContextFile`; own path rule; refuses only images when unsupported). The agent loop turns any `ContextFile` in any tool result into an attachment of the tool-continuation message (`agent/loop/tool-continuation-input-builder.ts` L39-82); `buildLLMUserMessage` sends images, audio and video as media parts. No server API, web code or persisted shape depends on `read_media_file`, except the Work Journal renderer, the Daily Assistant template and stored agent definitions (left as they are, DEC-001).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: one owner (the `autobyteus-ts` file tools) gains a media branch in a new file; one class tool and its exports and registration are removed; about ten `autobyteus-ts` tests are renamed or adapted; three `autobyteus-ts` docs; on the server, one Work Journal renderer with its test and fixture, the Daily Assistant template and its bootstrapper test.
- Architectural risk: `Low`
- Risk rationale: no persisted data, no server API or GraphQL change, no web change, no concurrency or lifecycle change. The agent-facing tool set changes (`read_media_file` removed), but the change is absorbed: a definition that names it keeps starting (unknown names skipped, `autobyteus-agent-tool-resolver.ts` L133-137) and keeps reading media through `read_file`, which every native agent has (`autobyteus-runtime-tool-exposure.ts` L8-13). The path rule for media becomes the stricter shared one (denied paths now apply).
- Escalation trigger: a caller or package in this repository that depends on `read_media_file`'s result or name beyond the inventory; the model's capabilities not reachable on the tool's context in some runtime path; any text-read output difference (AC-001).

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| `tools/file/workspace-path-utils.ts` L30-58 | the shared resolver: absolute or relative with absolute `base_dir`; `FILE_TOOL_PATH_DENIED` | media reads use it (REQ-004) |
| `utils/media-file-kind.ts` L5-23 | the media extensions | the kind switch (REQ-002) |
| `tools/multimedia/media-reader-tool.ts` L95-122 | existence, regular file, empty file, image refusal text | moved into the media branch, generalised to audio and video (REQ-003) |
| `agent/context/agent-context.ts` L51; `tools/functional-tool.ts` L78-82 | `read_file` receives the agent context with `llmInstance` | capability check reads `context.llmInstance?.model?.multimodalCapabilities` |
| `agent/loop/tool-continuation-input-builder.ts` L39-82 | context files from any tool's result | no loop change |
| `autobyteus-translation.ts` L74-97, L128-133 | `readFile` renders text; `readMediaFile` renders a media marker from the recorded context-file value | `readFile` renders the media marker when its recorded value is a context file; `readMediaFile` kept for recorded history |
| `built-in-agent-bootstrapper.ts` L65-133 | template copied at every start | template edit only |

## Intended Change

`read_file` reads by kind; `read_media_file` is removed; the Work Journal and the Daily Assistant follow.

## Change Scope (Mandatory)

- In scope: UC-001..UC-003. Areas: `autobyteus-ts/src/tools/file/` (read by kind), `autobyteus-ts/src/tools/multimedia/` (reader removed), `autobyteus-ts/src/tools/{index,register-tools}.ts`, `autobyteus-ts/tests/**` (the listed tests), `autobyteus-ts/docs/` (three docs), `autobyteus-server-ts/src/agent-work-journal/rendering/runtimes/autobyteus-translation.ts` with its test and fixture, `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent-config.json` with `built-in-agent-bootstrapper.test.ts`.
- Derived consumers: `read_file`'s result is now `string | ContextFile`. Readers: the agent loop's context-file extraction (already generic), the working context tool-result payload (objects sent as JSON text, as for `read_media_file` today), the memory and raw-trace recorders (record the value as they do for `read_media_file` today), the Work Journal renderer (changed), the web activity summary (by argument `path`, unchanged).
- Deliberately left alone: stored agent definitions and the public packages (DEC-001/002, another ticket); `download_media` (same `multimedia/` folder, unrelated); other runtimes; the LLM layer's silent drop of media in user-attached messages (FU-002); reading binary documents' content (only refused here, REQ-009).
- Follow-ups: FU-002 (FU-001 moved into this ticket as REQ-009 by the user).

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | Trigger | Target path |
| --- | --- | --- |
| BEH-001 | native agent calls `read_file` on a text file | `readFile` → `resolveFileToolPath` → text read (unchanged) |
| BEH-002/003/006 | native agent calls `read_file` on a media file | `readFile` → `resolveFileToolPath` → media kind → `readMediaFileAsContextFile` (exists, regular, non-empty, capability) → `ContextFile` → loop → continuation attachment → provider media part |
| BEH-004/005 | arguments and paths | the shared resolver for both kinds; line ranges refused for media |
| BEH-009 | Work Journal render | `readFile` converter: context-file value → media marker; text → as today; `readMediaFile` converter for recorded history |

## Relevant Supplemental Task Artifacts

`autobyteus-327/` (the investigation report and notes, evidence for this design).

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (with removal).
- Current design issue found: `Yes`: two owners for one action ("read this file"), with two path rules (F-2) and two capability rules (F-1).
- Structural triggers: Legacy cleanup (Principle 8) fires: `read_media_file` removed. Several kinds or forms (Principle 1) fires: one tool serves text and three media kinds; each kind traced (text unchanged; image/audio/video share one branch and one capability rule). Vocabulary drift (Principle 15): two verbs for one action, resolved by one name. Not firing: persisted-data transition (no stored shape changes), ambiguous boundary (one path argument shape), shared-structure tightness (`ContextFile` unchanged).
- Root cause: `Duplicated Policy Or Coordination` (two path and capability policies for one action).
- Refactor needed now: `Yes`, the merge itself.
- Design response: one owner (`read_file`), its media branch in its own file, the class tool removed.

## Terminology

`context file` (GLOSSARY: a file attached to a turn): what a media read returns. `media file`: an image, audio or video file by extension (`media-file-kind.ts`).

## Legacy Removal Policy (Mandatory)

- Obsolete: `read_media_file` (Removal Plan).
- Compatibility wrappers kept: `None`. No alias tool, no name mapping. The Work Journal's `read_media_file` renderer stays because past runs recorded that call (history read as recorded, DESIGN.md rule 7), not to serve new calls.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: `toolNames` in agent definitions. Decision: `Not Affected` in this ticket (the user's DEC-001): the reader skips unknown tool names today, and the agent keeps the capability through `read_file`. Recorded Work Journals and raw traces keep their recorded `read_media_file` calls; their renderer stays.

## Data-Flow Spine Inventory

| Spine | Scope | BEH | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | 001-006 | `read_file` call | text result, or a context file attached to the next turn | `readFile` (`tools/file/read-file.ts`) |
| DS-002 | Primary | 009 | Work Journal render of a recorded call | command line with text or media marker | `autobyteus-translation.ts` |

## Primary Execution Spine(s)

- DS-001: `agent tool call → readFile (validate args) → resolveFileToolPath (path rule, denied paths) → mediaFileKind(path)? → [media] readMediaFileAsContextFile → ContextFile → ToolContinuationInputBuilder → buildLLMUserMessage (media part) → provider` / `[binary: NUL byte in the first 8,000 bytes] refusal` / `[text] UTF-8 read → numbered lines → tool result`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | `readFile` validates its arguments, resolves the path with the shared rule, then asks the media kind of the resolved path. A media file goes to the media branch, which refuses line ranges, a missing or non-regular file, an empty file, and a kind the model's capability marks `unsupported`, and otherwise returns a `ContextFile`; the loop attaches it to the next turn. Any other file is read as text exactly as today. | `readFile` |
| DS-002 | The renderer of a recorded `read_file` call checks its recorded value: a context-file record renders the media marker with the `cat <path>` command; anything else renders as today. Recorded `read_media_file` calls keep their renderer. | the AutoByteus translation |

## Spine Actors / Main-Line Nodes

`readFile`; the media branch; the agent loop (unchanged).

## Ownership Map

- `tools/file/read-file.ts`: the tool, its arguments, the kind switch, the text read.
- `tools/file/read-file-media.ts` (new): reading a media file as a context file: kind, existence, emptiness, the capability refusal and its messages.
- The agent loop and LLM layer: unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/multimedia/media-reader-tool.ts` (`ReadMediaFile`) | its function moves into `read_file` (the user's decision) | `tools/file/read-file-media.ts` + `read_file` | |
| exports `tools/multimedia/index.ts` L2, `tools/index.ts` L22; registration `tools/register-tools.ts` L12, L31 | the class is removed | — | `download_media` stays |
| `tests/unit/tools/multimedia/media-reader-tool.test.ts`, `tests/integration/tools/multimedia/media-reader-tool.test.ts` | test the removed class | `read_file` unit and integration tests for media (same cases, new tool) | keep the asserted behaviours |
| `tests/integration/agent/read-media-file-continuation-flow.test.ts`, `tests/integration/agent/gemini-read-media-file-m4a-live.test.ts` | name the removed tool | the same flows through `read_file` (files renamed, for example `read-file-media-continuation-flow.test.ts`, `gemini-read-file-m4a-live.test.ts`) | the live test stays gated |
| `read_media_file` in the Daily Assistant template | `read_file` (already listed) covers it | — | |

## Return Or Event Spine(s) (If Applicable)

The continuation attachment (unchanged mechanism).

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| `media-file-kind.ts` | media branch | extension → kind (reused) |
| `resolveFileToolPath` | `readFile` | path rule, denied paths (reused) |

## Ownership Boundaries

The file tools own reading files; the loop owns turning context files into attachments; the LLM layer owns provider media parts. The media branch does not reach into the loop or the LLM layer.

## Boundary Encapsulation Map

N/A: no new boundary.

## Dependency Rules

`tools/file/read-file-media.ts` may import `agent/message/context-file.js`, `agent/message/context-file-type.js`, `utils/media-file-kind.js`, `llm/multimodal-capabilities.js` (type only), node `fs`. It does not import the loop or the LLM layer.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Shape |
| --- | --- | --- | --- |
| `read_file` tool | a file | read it | `path`, `base_dir?`, `start_line?`, `end_line?`, `include_line_numbers?` (unchanged); result: text, or a context file for a media file |
| `readMediaFileAsContextFile(context, resolvedPath, kind)` | a resolved media path | the media read | returns `ContextFile` or throws a refusal |

## Interface Boundary Check

| Interface | Singular | Explicit | Risk |
| --- | --- | --- | --- |
| `read_file` | Yes (read a file) | Yes | Low |
| `readMediaFileAsContextFile` | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Subject | Name | OK |
| --- | --- | --- |
| tool | `read_file` | Yes: one verb for reading a file (Principle 15) |
| media branch file | `read-file-media.ts` | Yes |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| path rule | `resolveFileToolPath` | Reuse |
| media kind | `getMediaFileKindFromPath` / `ContextFileType.fromPath` | Reuse |
| attachment | `ContextFile` + the loop | Reuse |

## Subsystem / Capability-Area Allocation

`autobyteus-ts` file tools (`tools/file/`). No new subsystem.

## Draft File Responsibility Mapping

Folded into the final mapping.

## Reusable Owned Structures Check

The media-marker rendering in `autobyteus-translation.ts` is shared by the `readFile` and `readMediaFile` converters (one local helper, for example `mediaReadRecorded(result)`).

## Shared Structure / Data Model Tightness Check

N/A: `ContextFile` unchanged.

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-ts/src/tools/file/read-file.ts` | Modify | after `resolveFileToolPath`, a media kind goes to `readMediaFileAsContextFile` (line arguments refused for media before reading); the description gains one sentence (below); `start_line`/`end_line` descriptions say "text files only" |
| `autobyteus-ts/src/tools/file/read-file.ts` (binary check, REQ-009) | Modify | after the media dispatch, read the file's bytes once; if the first 8,000 bytes contain a NUL byte, throw `The file '<path>' is a binary file and cannot be read as text. read_file reads text files and image, audio and video files.`; otherwise decode the same bytes as UTF-8 and continue exactly as today (one read, no second pass) |
| `autobyteus-ts/src/llm/api/openai-responses-llm.ts` `normalizeTools` (L148-160) | Modify (REQ-010) | each function tool sent with `strict: false`; a unit test asserts the request body; the comment in `tools/usage/formatters/openai-tool-schema-normalizer.ts` (strict off by default) now holds for the Responses API too |
| `autobyteus-ts/src/tools/file/read-file.ts` (CR-002, CR-003, line-argument texts) | Modify | binary rule (DEC-007): after the media dispatch, read the bytes once; if they contain a NUL byte and are not valid UTF-8 (`new TextDecoder('utf-8', { fatal: true })` throws), refuse as binary; otherwise decode and continue exactly as today (stray NULs stay in the text, as before this ticket); no window, no format list; the media-kind refusal says "an image/an audio/a video file" (article fix); line-range refusals for media say the file was not loaded and not to claim to have inspected it; `start_line`/`end_line` descriptions: "First line to return (1-based, inclusive). Text files only; omit to start at line 1." / "Last line to return (1-based, inclusive). Text files only; omit to read to the end." |
| `autobyteus-ts/src/tools/file/read-file-media.ts` | Add | `readMediaFileAsContextFile`: regular file, non-empty (`The media file '<path>' is empty and was not loaded.`), capability refusal per kind (`The selected model does not support <image/audio/video> input. The <kind> file was not loaded. Continue without <visual/audio/video> analysis and do not claim to have inspected it.`; capability `unknown` loads), returns `new ContextFile(resolvedPath)` |
| `autobyteus-ts/src/tools/multimedia/media-reader-tool.ts` | Remove | — |
| `autobyteus-ts/src/tools/multimedia/index.ts`, `src/tools/index.ts`, `src/tools/register-tools.ts` | Modify | drop `ReadMediaFile` |
| `autobyteus-ts/tests/unit/tools/file/read-file.test.ts`, `tests/integration/tools/file/read-file.test.ts` | Modify | media cases: PNG/WAV/MP4 → context file of the kind; unsupported per kind; empty; line ranges refused; denied path; relative without `base_dir`; text cases unchanged |
| `autobyteus-ts/tests/unit/tools/multimedia/media-reader-tool.test.ts`, `tests/integration/tools/multimedia/media-reader-tool.test.ts` | Remove | cases moved to `read_file` tests |
| `autobyteus-ts/tests/integration/agent/read-media-file-continuation-flow.test.ts` → `read-file-media-continuation-flow.test.ts` | Rename/Modify | the flow through `read_file` |
| `autobyteus-ts/tests/integration/agent/gemini-read-media-file-m4a-live.test.ts` → `gemini-read-file-m4a-live.test.ts` | Rename/Modify | the gated live flow through `read_file` |
| `autobyteus-ts/tests/unit/agent/loop/tool-continuation-input-builder.test.ts`, `tests/unit/agent/message/tool-continuation-display-text.test.ts`, `tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts`, `openai-chat-renderer.test.ts`, `tests/unit/tools/index.test.ts` | Modify | the tool name in fixtures and expectations |
| `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`, `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md` | Modify | name `read_file` |
| `autobyteus-server-ts/src/agent-work-journal/rendering/runtimes/autobyteus-translation.ts` | Modify | `readFile`: context-file value → media marker; shared helper with `readMediaFile` (kept, with a comment: recorded history) |
| `autobyteus-server-ts/tests/agent-work-journal/rendering/runtime-translations.test.ts`, `tests/fixtures/agent-work-journal/work-journal-builtin-tools.json` | Modify | a recorded `read_file` media call; the recorded `read_media_file` call stays |
| `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent-config.json`, `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | Modify | drop `read_media_file` |

New `read_file` description sentence (one): "Image, audio and video files (by extension) are attached for the model to see in the next turn instead of being returned as text; line ranges do not apply to them, a kind the current model cannot take is refused, and other binary files are refused."

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As in the Final File Responsibility Mapping; the media branch sits beside `read-file.ts` in `tools/file/`.

## Folder Boundary Check

| Path | Clear | Risk |
| --- | --- | --- |
| `tools/file/read-file-media.ts` | Yes | Low |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| dispatch | `const kind = getMediaFileKindFromPath(finalPath); if (kind) return readMediaFileAsContextFile(context, finalPath, kind);` after argument and path checks | a second tool name, an alias, or `read_file` returning base64 text |
| line ranges on media | `read_file(path: 'pic.png', start_line: 1)` → error "start_line/end_line apply to text files only" | silently ignoring them |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| keep `read_media_file` as an alias of `read_file` | Rejected | one tool; unknown stored names are skipped by the existing rule |
| accept `file_path` as a second argument name | Rejected | `path` only |
| migrate stored `toolNames` | N/A (the user's DEC-001) | another ticket |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add `read-file-media.ts` and the dispatch in `read-file.ts`, with the `read_file` media tests (they fail first on the base: `read_file` returns text for a PNG).
2. Move the continuation and live tests to `read_file`.
3. Remove `ReadMediaFile`, its exports, registration and tests; update the other tests and docs.
4. Server: Work Journal renderer + test + fixture; Daily Assistant template + bootstrapper test.
5. Checks: `pnpm -C autobyteus-ts test`; server `test:unit` (includes Work Journal and architecture), `typecheck`; the gated Gemini m4a live test once (a small input with a test-vault key; TESTING.md's live-compaction rule does not concern it); a native-agent end-to-end read of a synthesized image, audio and video on a model that supports them, and the refusal on one that does not (the Task's outcome to verify), with a scripted or local model where possible.

## Key Tradeoffs

- `read_file`'s description grows by one sentence in every native agent's prompt (~40 tokens); the user accepted this for one tool (327).
- Agents of the user's own definitions keep a stale `read_media_file` entry until the agent project removes it (DEC-001).

## Risks

- A text read accidentally changed: AC-001 guards it (existing tests unchanged, byte-identical output).
- Media paths given relative to the workspace by old skills fail with the shared rule's message until the packages are updated (another ticket); the message tells the agent to pass an absolute path.

## Guidance For Implementation

- Reproduction to start from: `autobyteus-327/investigation-notes-327.md` SD-01 (a PNG read through `read_file` returns garbled lines); the new `read_file` media tests fail on the base and pass after.
- Use synthesized files only.
- Hand over in the implementation handoff the 16 public package files and the replacement wording for the separate package ticket (DEC-002): replace `read_media_file` with `read_file` in `toolNames` (no duplicate entry), and in the 4 skills say "read the image with `read_file` and an absolute path".
