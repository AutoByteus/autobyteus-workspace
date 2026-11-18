# Requirements Document — read-file-media-merge-investigation (autobyteus-327)

## Document Status

- Status: `Approved` (the user chose option (a), 2026-10-29)
- Current solution revision ID: `N/A` (investigation report; an SR record starts with the follow-up change)
- Request: Task `autobyteus-327`; requested by `/project_task_manager` for the user.
- Requirements owner: Solution Designer. Date: 2026-10-29.
- Approved by: the user, in this conversation (2026-10-29): "I meant that because the readMedia file is also readFile, it has ambiguity, that's a problem … we can also change the readMedia to be absolute … I see like an agent, they use the read file directly to read images … If we can use one tool, why not? Basically, media files are also files."

## Problem

The user asks whether `read_media_file` can be folded into `read_file`, so native agents have one file-reading tool. Evidence: `investigation-notes.md` (what each tool does, where it appears, F-1..F-3).

## Options

| Option | What changes | Gains | Costs and risks |
| --- | --- | --- | --- |
| (a) Merge into `read_file` | `read_file` returns text for text files and a context file for image/audio/video extensions; `read_media_file` removed; line-range arguments refused for media; the stored tool name renamed in every agent definition (DESIGN.md rule 10: a sealed migration with a backup); 16 package files and the Daily Assistant updated (packages through the Agent Package Creator); Work Journal keeps rendering recorded `read_media_file` calls (history) and learns the new media result of `read_file` | one tool name; one path rule and the denied paths for media too; no garbled image reads | `read_file`'s definition grows (~40-60 tokens) in **every** native agent's prompt, while the saving (~100 tokens) reaches only the 13 agents that select `read_media_file`; a stored-name migration of user agent definitions; media paths become trusted-local (skills that say "workspace-relative" change); every agent with `read_file` can now pull media into the next turn (larger requests) |
| (b) Keep two tools, remove the duplicate parts (recommended) | `read_media_file` uses the file tools' path rule, parameter names (`path`, `base_dir`) and denied paths; it refuses audio and video, like images, when the model cannot take them (F-1); `read_file` refuses a media extension with a short pointer to `read_media_file` instead of returning garbled bytes (F-3) | the consistency the user wants (one path rule, one parameter shape, clear routing), the two real defects fixed, no token increase, no migration | two names remain; the `file_path` → `path` parameter rename touches the 4 skills' wording and recorded-call rendering (no stored definition data changes: tool names stay) |
| (c) Keep as is | nothing | nothing to do | F-1 (silent audio/video drop), F-2 (two path rules, denied paths bypassed), F-3 (garbled reads) stay |

## Reasoning and recommendation

- The merge's main promised gain, fewer tool definitions and tokens, mostly does not hold: `read_file` is a default tool of every native agent, `read_media_file` is opt-in in 13 agents, so a merge moves tokens from 13 agents to all of them.
- "One word, one meaning" (Principle 15) favours two names here: the results differ in kind (text in the tool result vs a media attachment the next turn sees), so two verbs name two different things.
- What the user wants from one tool (simpler, consistent) is mostly available without a rename: one path rule, one parameter shape, and each tool pointing to the other where an agent picks the wrong one.
- Recommendation: (b). If the user prefers (a), the migration plan is in the table (sealed stored-name migration with a backup, packages through the Agent Package Creator, Work Journal keeps rendering history).

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Which option? | The Solution Designer recommended (b) on token and naming grounds. The user chose (a): agents already use `read_file` for images (and get garbled bytes, F-3, measured), so two tools are ambiguous in practice; media are files; media paths follow `read_file`'s trusted-local rule. The token difference (~40-60 tokens in the shared definition) is smaller than wrong-tool reads. | User | Decided: (a) |
| DEC-002 | F-1 (audio/video silently dropped) | Part of (a): the merged `read_file` refuses any media kind the model cannot take, with the same kind of message as for images today | Solution Designer | Decided |

## Places that would change

- (a): `autobyteus-ts` `tools/file/read-file.ts`, `tools/multimedia/media-reader-tool.ts` (removed), `tools/multimedia/index.ts`, `tools/index.ts`, `tools/register-tools.ts`, the live m4a test, unit tests of both tools; `autobyteus-server-ts` Daily Assistant config, a new app-data migration for stored `toolNames`, Work Journal `autobyteus-translation.ts`; `autobyteus-agents` 16 files; docs naming the tools.
- (b): `autobyteus-ts` `tools/multimedia/media-reader-tool.ts` (shared resolver, parameters, audio/video refusal), `tools/file/read-file.ts` (media refusal pointer), their tests and the live m4a test's call shape; `autobyteus-server-ts` Work Journal `autobyteus-translation.ts` (parameter name of recorded calls, keeping old recorded calls readable); `autobyteus-agents` 4 skills that describe the argument.

## Follow-up plan for option (a) (to be designed in the follow-up Task)

1. `read_file` reads by kind: a text file as today (unchanged result and size; line ranges and line numbers), an image, audio or video file (by extension, `media-file-kind.ts`) as a context file the next turn sees; line-range arguments refused for media; a media kind the current model cannot take refused with a clear message (images, audio and video alike, F-1); empty files refused; trusted-local path rule and denied paths for both kinds (F-2). The description gains one sentence; no other prompt grows.
2. `read_media_file` removed (tool, exports, registration, its tests; the gated Gemini m4a live test moves to `read_file`).
3. Stored agent definitions: a sealed app-data migration replaces `read_media_file` with `read_file` in each definition's `toolNames` (no duplicate entry), with a backup of each file it changes (DESIGN.md rule 10, the Data Migration Guideline); the built-in Daily Assistant template updated.
4. Packages: the 16 `autobyteus-agents` files (12 agent configs, 4 skills) updated through the Agent Package Creator, wording to absolute paths.
5. Work Journals: recorded `read_media_file` calls in past runs still render (history is read as recorded); `read_file` calls that loaded media render as the media marker.
6. Docs and GLOSSARY wording where the two tools are named.
