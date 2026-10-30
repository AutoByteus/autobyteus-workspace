# Requirements Document — read-file-media-merge (autobyteus-328)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006`
- Package: `read-file-media-merge`; Task `autobyteus-328`; requested by `/project_task_manager`.
- Requirements owner: Solution Designer; date 2026-10-29.
- Approved by: `User` (SR-004 adds REQ-009: the user, 2026-10-29: "just make reading PDF and other binary not supported only support readable format right?" and "i think it could be done in this ticket no as follow up"); reference: the user, 2026-10-29: "The stored agent configuration can be, I mean, it belongs to a separate project, right? … if it belongs to the agent project, then it can be done after another tickets, you know, not in this tickets. Yeah, exactly." Baseline: this document at SR-002. Basis: the user's decision in autobyteus-327 (option (a), `autobyteus-327/requirements-doc-327.md`).

## Problem And Desired Outcome

- Problem: two native tools read files; agents pick `read_file` for images and get garbled bytes (F-3); `read_media_file` drops audio and video silently for models that cannot take them (F-1) and applies another path rule without the denied paths (F-2).
- Desired outcome: one `read_file` that reads every file kind correctly for the native AutoByteus runtime; `read_media_file` gone.

## Behaviour

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 text read | `read_file` returns text with line ranges and line numbers | unchanged | result text, arguments, errors, token cost of a text read |
| BEH-002 media read | `read_file` returns garbled bytes; `read_media_file` attaches the file | `read_file` on an image, audio or video file (by extension, `media-file-kind.ts`) attaches it as a context file the next turn sees, as `read_media_file` does today | how media reaches each provider (unchanged mechanism) |
| BEH-003 media the model cannot take | images refused; audio/video loaded and dropped silently | refused for image, audio and video alike when the model's capability is `unsupported`, with a message that says the file was not loaded and not to claim to have inspected it; `unknown` loads, as today | the image message's meaning |
| BEH-004 arguments | `read_media_file` takes `file_path`; `read_file` takes `path`, `base_dir`, line arguments | one argument set (`read_file`'s); `start_line`/`end_line` with a media file refused; `include_line_numbers` ignored for media | — |
| BEH-005 paths | two rules | `read_file`'s rule for both kinds: absolute, or relative with an absolute `base_dir`; denied paths refused for both | text behaviour |
| BEH-006 empty media | refused by `read_media_file` | an empty media file refused by `read_file` | empty text files return an empty result, as today |
| BEH-007 removal | `read_media_file` exists | removed: tool, exports, registration, tests; docs updated | — |
| BEH-008 stored tool names | definitions may list `read_media_file` | not changed in this ticket (DEC-001): agent definitions are the agent project's content | an agent listing `read_media_file` keeps working (unknown names are skipped; `read_file` is always present) |
| BEH-009 Work Journals | recorded `read_media_file` calls render as a media marker | they still do; a `read_file` call that attached media renders as the media marker | text `read_file` rendering |
| BEH-011 binary documents | `read_file` returns a PDF, DOCX, XLSX, ZIP or other binary file as garbled text | refused with a clear message: binary files are not read; `read_file` reads text, images, audio and video | text reads unchanged, also for text that contains stray NUL bytes (corrected premise, SR-006: 173 tracked build logs contain NULs inside readable UTF-8 text) |
| BEH-012 OpenAI tool arguments | OpenAI Responses requests omit `strict`, which the API treats as `true`, so GPT-5 models fill every optional argument of every tool (measured SD-02 run 2: 8 of 8 calls; image reads with `start_line`/`end_line`/`base_dir`, refused by BEH-004) | function tools are sent with `strict: false`, so optional arguments stay optional (measured: image reads send only `path`, 4 of 4) | Chat Completions and other providers unchanged |
| BEH-010 built-in and public packages | Daily Assistant template and 16 package files name `read_media_file` | Daily Assistant template names `read_file` only; public packages in a separate ticket after a stable release (DEC-002) | — |

## Scope Guardrail

- In scope: UC-001 a native agent reads a text file; UC-002 a native agent reads an image, audio or video file; UC-003 removal and the stored/packaged names.
- Out of scope: changing stored agent definitions and the public packages (another ticket, DEC-001/DEC-002); other runtimes (Claude, Codex, Antigravity, Grok use their own readers); reading the content of binary documents (PDF text extraction, attaching PDFs to models); size limits; how providers render media.
- Non-goals: no new media kinds; no change to text reads.
- Preserved: BEH-001; the image refusal's meaning; Work Journal history.
- Prerequisites: none.

## Requirements

| ID | Requirement | BEH | Feasibility evidence |
| --- | --- | --- | --- |
| REQ-001 | Text reads are unchanged | 001 | — |
| REQ-002 | Media reads attach the file as a context file | 002 | the loop takes context files from any tool result (327 notes) |
| REQ-003 | Media the model cannot take is refused for all three kinds | 003 | capabilities on the agent context (notes) |
| REQ-004 | One argument set and one path rule with the denied paths; line ranges refused for media; empty media refused | 004-006 | shared resolver (327 notes) |
| REQ-005 | `read_media_file` removed with its tests; docs updated; the gated Gemini m4a live test reads through `read_file` | 007 | — |
| REQ-006 | No change to stored agent definitions in this ticket; a definition naming `read_media_file` still starts and reads media through `read_file`; the release note names the change | 008 | resolver skips unknown names (notes) |
| REQ-007 | Work Journals render recorded `read_media_file` calls and media `read_file` calls as the media marker | 009 | — |
| REQ-009 | A non-media binary file is refused with a clear message instead of being returned as text (DEC-004); text with stray NUL bytes is read as before | 011 | DEC-007 rule measured (`evidence/SD-04-*`): 172/173 NUL logs read, 398/400 macOS PDFs refused, ZIP/gzip/SQLite refused, UTF-16/Latin-1 read |
| REQ-010 | OpenAI Responses requests send every function tool with `strict: false` (CR-001, found by API/E2E; root cause proven by the Solution Designer's experiment SD-02) | 012 | SD-02 run 2: strict omitted 8/8 calls fill every optional argument; `strict: false` image reads send only `path` 4/4, text reads only what the request needs |
| REQ-008 | Daily Assistant template updated; this ticket hands over the 16 package files and wording for the separate package ticket (DEC-002) | 010 | template synced at start (notes) |

## Acceptance Criteria

| AC | REQ | Outcome |
| --- | --- | --- |
| AC-001 | 001 | existing `read_file` tests pass unchanged; a text read's result is byte-identical to before |
| AC-002 | 002 | with synthesized PNG, WAV and MP4 files, `read_file` returns a context file of the right kind and the next model message carries it as media |
| AC-003 | 003 | for each kind with capability `unsupported`, `read_file` refuses with the message and attaches nothing |
| AC-004 | 004 | relative path without `base_dir`, a denied path, line ranges on media, an empty media file: each refused |
| AC-005 | 005 | no `read_media_file` in `autobyteus-ts` or server source and tests except recorded-history rendering; the gated Gemini m4a live test passes through `read_file` (small input; test vault) |
| AC-006 | 006 | a definition naming `read_media_file` (and not `read_file`) still starts and reads media through `read_file`; no app-data migration added |
| AC-007 | 007 | Work Journal tests for both cases |
| AC-008 | 008 | Daily Assistant reads media with `read_file` |
| AC-010 | 010 | unit: the Responses request body carries `strict: false` on each function tool; live (test vault, small input): a GPT-5 model reads a synthesized image through `read_file` and answers its color, with only `path` in its arguments; one other tool with optional arguments (for example `write_file` or `run_bash`) called by a GPT-5 model without invented optional values |
| AC-009 | 009 | real and synthesized files: an Electron build log with stray NULs (for example `tickets/done/…/delivery/electron-build-mac-20260814T174700Z.log` in the repo) returns its text byte-identical to before this ticket; a late-NUL PDF (a copy of a macOS PDF whose first NUL is after 8,000 bytes) and a ZIP are refused; a Latin-1 text file, a UTF-16 text file, UTF-8 text with non-ASCII characters and an empty text file read as before |

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Migrate stored `toolNames` (`read_media_file` → `read_file`) in agent definitions? | The Task lists a migration (it came from my autobyteus-327 plan). The new evidence weighs against it: (1) nothing breaks without it, because unknown tool names are skipped and `read_file` is always present for native agents; (2) a migration could only rewrite the app's own default package; your local package folders are not AutoByteus's to change, and GitHub copies are replaced by their source; (3) you ruled the same way for the `list_available_nodes` rename (290), and removed tools were not migrated in 294. Recommendation: **no migration**; a release note says that `read_media_file` is gone and `read_file` reads media; a leftover entry is harmless and can be removed from the agent's tool list in the editor. Decided by the user: no; agent definitions belong to the agent project and change in another ticket. | User | Decided |
| DEC-002 | When do the 16 public package files change? | A package without `read_media_file` loses media reading on any app build without this change, and package updates reach stable nodes too. Recommendation: the Agent Package Creator updates them (through the PM) once a **stable** release with this change is out; this ticket hands over the exact list and wording. Decided by the user: a separate ticket, not this one. | User | Decided |
| DEC-003 | Capability `unknown` | load, as today for images (refusing would break models whose capability is not recorded) | Solution Designer | Decided |
| DEC-005 | Fix the OpenAI `strict` default in this ticket? | Decided by the user (the user, 2026-10-30: "No, not a separate task … We want to do some testing to do some experiments like strict equal to false and to test again. If it's due to this problem, then we fix it immediately in this task."): experiment first, then fix here. Proven (SD-02 run 2). BEH-004's refusal of line ranges for media stays: with `strict: false` GPT-5 no longer sends them. | User | Decided |
| DEC-006 | Binary detection window (CR-002) | The first 8,000 bytes missed 79 of 400 macOS PDFs (API-05); `read_file` already reads the whole file, so the NUL scan covers the whole buffer: one pass, no format list, the user's DEC-004 unchanged in intent; residual: PDFs with no NUL byte (2 of 400 in that sample) | Solution Designer | Decided |
| DEC-007 | Binary detection rule (CR-004; replaces DEC-006's whole-file NUL scan and IR-001's 8,000-byte window) | Two NUL-only windows failed on real files (8,000 bytes let 79 PDFs through; the whole file refused 173 readable logs), so the rule changes instead of a third tuning: a file containing a NUL byte is refused only when its bytes are not valid UTF-8 (strict decode); otherwise it is text and read as today; files without NUL untouched. No threshold, no format list. Measured (`evidence/SD-04-*`): logs 172/173 read (the refused one embeds raw SQLite pages), PDFs 398/400 refused (the 2 without any NUL are read as before, the known residual), ZIP/gzip/SQLite refused, UTF-16/Latin-1 read. The user's DEC-004 (refuse binary, only readable formats, no format list) is kept unchanged. | Solution Designer | Decided |
| DEC-008 | AC-005's AI Studio run (quota 0) | the same live flow passed on Vertex Express with only the endpoint changed (API-04), which proves media reach Gemini through `read_file`; accepted as AC-005's evidence; an AI Studio run needs the user's quota or key and is not required | Solution Designer | Decided (user informed 2026-10-30) |
| DEC-004 | Non-media binary documents | Decided by the user ("just make reading PDF and other binary not supported only support readable format … it could be done in this ticket"): refused in this ticket. Detection: a NUL byte in the first 8,000 bytes (git's heuristic), checked after the media kind; no format list. | User | Decided |
