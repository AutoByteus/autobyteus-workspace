# Investigation Notes — read-file-media-merge-investigation (autobyteus-327)

## Investigation Meta

- Package: `read-file-media-merge-investigation`; Task `autobyteus-327` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the user (2026-10-29).
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge-investigation`, branch `codex/read-file-media-merge-investigation`, base `origin/personal` `e82d03b0f9`. Public packages read at `autobyteus-agents` `origin/main` `d50df67`.
- Authorities read: `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`, `handoff.md`; `DESIGN.md` (rules 7, 10), `GLOSSARY.md`, `TESTING.md`.
- Mode: investigation only (no code change before the user decides). Experiments used synthesized files only (a 1×1 PNG, a silent WAV header, a two-line text file) in a temporary vitest file, deleted after the run; no tracked change.

## What each tool does today

| | `read_file` (`autobyteus-ts/src/tools/file/read-file.ts`) | `read_media_file` (`autobyteus-ts/src/tools/multimedia/media-reader-tool.ts`) |
| --- | --- | --- |
| Result | text: the file as UTF-8, optional 1-based `start_line`/`end_line`, line numbers by default | a `ContextFile`; the loop attaches it to the tool-continuation message (`agent/loop/tool-continuation-input-builder.ts` L39-82) |
| What the model gets | the text in the tool result | images, audio, video as media parts (`agent/message/multimodal-message-builder.ts` L11-31); **any other kind only as a path in a "Reference files" list**, not its content (Measured, SD-01) |
| Parameters | `path`, `base_dir`, `start_line`, `end_line`, `include_line_numbers` | `file_path` |
| Path rule | trusted-local: absolute used directly; relative needs an absolute `base_dir`; never resolved from the workspace (`tools/file/workspace-path-utils.ts` L30-58) | relative paths resolved against the workspace and must stay inside it; absolute paths anywhere, **outside the workspace only logged as a warning** (L69-90; Measured) |
| Denied paths (database, WAL/SHM/journal, root key, test vault; `server-runtime.ts` L125-131) | refused (`FILE_TOOL_PATH_DENIED`) | **not applied** (does not use the shared resolver) |
| Model cannot take the kind | n/a | image: refused with "The selected model does not support image input …" (L113-120; Measured). **Audio and video: not checked**; loaded (Measured), then dropped by the LLM layer (`media-input-sanitizer.ts`; Anthropic, OpenAI Responses and Mistral renderers skip audio/video with a console warning), and `mediaDiagnostics` (`llm-request-assembler.ts` L113-121) has no consumer, so **the agent is never told** |
| Binary file | read as UTF-8: a PNG returns garbled "lines" (Measured: `1: \n2: \u001a\n3: IDATx…`) | — |
| Size limit | none | none (empty file refused) |
| Exposure | **default for every native agent** (`autobyteus-runtime-tool-exposure.ts` L8-13: `run_bash`, `read_file`, `edit_file`, `write_file`) | opt-in, only agents that list it |
| Other runtimes | not exposed: the Agent Tools MCP adapter set has no file readers (`default-agent-tool-mcp-adapter-providers.ts` L16-29); Claude, Codex, Antigravity, Grok use their own readers | same: native AutoByteus only |
| Description size | about 610 characters (~150 tokens) | about 260 characters (~65 tokens) |

Media kinds are fixed by extension (`autobyteus-ts/src/utils/media-file-kind.ts` L5-23: jpg/jpeg/png/gif/webp; mp3/wav/m4a/ogg/aac/flac; mp4/mpeg/mov/avi/webm/mkv). SVG is not media, so a by-extension switch would not turn editable SVG text into an image.

## Where `read_media_file` appears

- `autobyteus-ts`: `tools/multimedia/media-reader-tool.ts`, `tools/multimedia/index.ts` L2, `tools/index.ts` L22, `tools/register-tools.ts` L12, L31; test `tests/integration/agent/gemini-read-media-file-m4a-live.test.ts` (live, gated).
- `autobyteus-server-ts`: `built-in-agents/templates/daily-assistant/agent-config.json` L21; `agent-work-journal/rendering/runtimes/autobyteus-translation.ts` L86-97, L133 (renders recorded calls as a media marker).
- `autobyteus-agents` (16 files): agent configs of kids-picture-story-team (book-production-editor, picture-book-illustrator, picture-book-reviewer), marketing-team (marketing-content-creator, marketing-performance-analyst), middle-school-mathematics-team (experience-builder, mathematical-reviewer), supervised-research-team (research-supervisor, researcher), chemistry-teaching-assistant, computer-use-operator, deep-researcher; skills `book-production-editor`, `picture-book-illustrator`, `picture-book-reviewer`, `computer-use-operation`.
- User data: agent definitions the user created or imported store `toolNames`; a rename would reach them (count not read: real user data is not read in this investigation).
- Recorded history: Work Journals and run histories of past native runs contain `read_media_file` calls.

## Findings independent of the option chosen

- F-1: a native agent whose model cannot take audio or video gets "loaded" from `read_media_file`, the media is dropped silently, and the agent may claim it listened or watched (the image case is handled; audio/video are not).
- F-2: `read_media_file` does not apply the file tools' denied paths and allows absolute paths outside the workspace; low practical risk (non-media files reach the model only as a path, and `run_bash` can read any path), but two path rules for one action.
- F-3: `read_file` on an image or other binary returns garbled text (tokens for nothing).

## Evidence

- `evidence/SD-01-tool-probe-synthesized-files.json`: the probe's results (temporary test deleted).
