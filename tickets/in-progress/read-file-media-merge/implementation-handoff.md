# Implementation Handoff — read_file reads media; read_media_file removed; OpenAI tools strict: false (autobyteus-328)

## Upstream Artifact Package
All paths below are relative to the ticket directory
`/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge/tickets/in-progress/read-file-media-merge`.

- Requirements: `requirements-doc.md`, approved through SR-002 (DEC-001, DEC-002), SR-004 (DEC-004: REQ-009 / AC-009 / BEH-011) and SR-005 (DEC-005: REQ-010 / AC-010 / BEH-012; DEC-006: whole-file NUL scan).
- Investigation: `investigation-notes.md`; the earlier investigation `autobyteus-327/investigation-notes-327.md` and `autobyteus-327/requirements-doc-327.md`.
- Completed design: `design-spec.md` (SR-005; SR-003 base, SR-004 binary branch, SR-005 rows in Final File Responsibility Mapping); Task Size And Architectural Risk section.
- Solution history: `solution-revision-record.md` (SR-001…SR-005); `handoff-architecture-design-complete.md` (section Revision SR-005).
- Triggering reports for IR-002: `code-review-report.md` (CRR-001/CRR-002: CR-001, CR-002, CR-003, a failure-origin round after API/E2E failed), with `api-e2e-execution-coverage-report.md` (API-REV-001/002) and the Solution Designer's experiment `evidence/SD-02-*`.
- Follow-ups: `follow-ups.md` (FU-001 moved into this ticket by the user; FU-002…FU-006 stay follow-ups).
- Architecture review, Product design supplements: **N/A** (Medium / Low, direct route). Code review only as the failure-origin round above.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge`; branch `codex/read-file-media-merge`; base `origin/personal` `e82d03b0f9`.

## Current Implementation Summary
**Implementation Complete**, ready for API/E2E validation. Not a delivery, release or user-runtime pass.

`read_file` now reads by kind, in this order after the shared path rule:
1. **Media.** An image, audio or video file (by extension, `utils/media-file-kind.ts`) goes to the new `tools/file/read-file-media.ts`. It returns a `ContextFile`, which the agent loop attaches to the next turn. It refuses a missing or non-regular path, an empty file, and a kind the model's capability marks `unsupported`; `unknown` loads. Any `start_line`/`end_line` on a media file (including `0`, `-1`, or a reversed range) is refused before the numeric checks with `start_line and end_line apply to text files only; '<path>' is an image|an audio|a video file, so it was not loaded. Call read_file again without start_line and end_line, and do not claim to have inspected the file before it is loaded.`
2. **Binary.** Any other file is read once. If it contains a NUL byte anywhere (DEC-006; previously the first 8,000 bytes), it is refused with `The file '<path>' is a binary file and cannot be read as text. read_file reads text files and image, audio and video files.`
3. **Text.** Otherwise the same bytes are decoded as UTF-8 and processed exactly as before.

**OpenAI Responses** (REQ-010, IR-002): `OpenAIResponsesLLM.normalizeTools` sends every function tool with `strict: false`. The API treats an omitted `strict` as true, which made GPT-5 models fill every optional argument (SD-02), so image reads came with line ranges and were refused (CR-001). A tool already in Responses shape that sets its own `strict` keeps it; hosted tools pass through unchanged. `start_line`/`end_line` descriptions now read "First line to return (1-based, inclusive). Text files only; omit to start at line 1." and "Last line to return (1-based, inclusive). Text files only; omit to read to the end."

The removal and its follow-on changes:
- `ReadMediaFile` (`read_media_file`) is removed with its exports, registration and tests.
- The continuation flow test and the gated Gemini m4a live test now go through `read_file`.
- The Work Journal renders a `read_file` media result as the media marker and keeps the `read_media_file` renderer for recorded history.
- The Daily Assistant template no longer lists `read_media_file`.
- No migration and no package changes (DEC-001, DEC-002).

- Commits on the branch, oldest first:
  - `5b9eb0aba7` feat(ts): `read_file` reads image, audio and video files as context files
  - `a6ed2ec174` test(ts): the media continuation flow and the gated Gemini m4a live test go through `read_file`
  - `c1b0c88b44` refactor(ts): remove `read_media_file`
  - `a5baa8299b` feat(server): the Work Journal shows a `read_file` media read as the media marker
  - `9c5bcf7d44` feat(server): the Daily Assistant reads media with `read_file`
  - `020b9ef311` feat(ts): `read_file` refuses non-media binary files (REQ-009)
  - `90c6204a3b` test: `read_file` media through a native agent; a definition naming only `read_media_file` (AC-002, AC-003, AC-006, AC-009)
  - `16b3e2452d` test(ts): **baseline fix** (TESTING.md Rule 9): `tests/unit/utils/logger.test.ts` waits for the written lines instead of a fixed 25 ms (IMP-09)
  - IR-002 (SR-005):
    - `53d149a4cc` fix(ts): OpenAI Responses sends function tools with `strict: false` (REQ-010, CR-001)
    - `815b6e175a` fix(ts): `read_file` scans the whole file for NUL and says a refused media read was not loaded (CR-002, CR-001 message, CR-003, descriptions, docs)
    - `438e6c1cde` test(ts): gated live check of GPT-5 tool arguments through a native agent (AC-010)
- Implementation cycle: rework after a failure-origin code review. Current revision **IR-002** in `implementation-revision-record.md` (IR-001 initial).

## Routing Classification
- `task_size` **Medium**, `architectural_risk` **Low**: confirmed again for IR-002. SR-005 adds one field on the OpenAI Responses request (`strict: false`, the default the codebase already intended per `openai-tool-schema-normalizer.ts`) and local `read_file` changes; no contract, persistence or boundary change.
  - One owner, the `autobyteus-ts` file tools, gains a branch in a new 43-line file. One class tool is removed.
  - On the server: one renderer and one template line.
  - No persisted data, API, GraphQL, web, lifecycle or concurrency change.
- Selected route: **direct to API/E2E** (the Medium/Low implementation-complete rule).
- Lightweight self-review: **done** (IR-001 and again for IR-002: the `normalizeTools` branches for nested, flat and hosted tools, the media-before-range order and its effect on text errors, the whole-buffer scan, the messages). I reviewed the whole source and test delta against REQ-001…009, the dispatch order (media → binary → text), the text path's identity, and the error messages and their order. I checked imports against the design's dependency rule: `read-file-media.ts` imports only `context-file`, the `media-file-kind` and `multimodal-capabilities` types, and node `fs`. I also checked removal completeness (`git grep`) and the scope guardrail.
- New design impact: none.

## Behavior Implementation Trace
| Behavior / REQ / AC | Path / key files | Evidence |
| --- | --- | --- |
| BEH-001 / REQ-001 / AC-001 text read unchanged | `read-file.ts`: `resolveFileToolPath` → not media → line-range checks → one `fs.readFile` → no NUL anywhere → `toString('utf8')` → the unchanged line loop | Existing `read_file` tests pass unchanged. **Byte identity** against the base `read_file`: IR-001 201,273 comparisons (`IMP-03`); IR-002 with the whole-file rule 67,037 text files × 3 = 201,111 comparisons, all identical (`IMP-12`) |
| BEH-002 / REQ-002 / AC-002 media read | `read-file.ts` → `getMediaFileKindFromPath` → `read-file-media.ts` `readMediaFileAsContextFile` → `ContextFile` → `ToolContinuationInputBuilder` → next request | `read-file-media.test.ts` (per kind; failed on the base, `evidence/IMP-01`); `read-file-media-continuation-flow.test.ts`; **native agent:** `read-file-media-native-agent-flow.test.ts`, where a scripted model calls the real `read_file` through `AgentRuntime` and the next request carries the PNG, WAV and MP4 as `image_urls`/`audio_urls`/`video_urls`, with no file bytes in the text |
| BEH-003 / REQ-003 / AC-003 kind the model cannot take | `read-file-media.ts` capability check on `context.llmInstance.model.multimodalCapabilities[kind]` | Unit and integration cases for each kind with exact messages; only the unsupported kind is refused. Native-agent case: an image-`unsupported` model gets the refusal text in the tool result and no image, while audio and video still attach |
| BEH-004/005/006 / REQ-004 / AC-004 arguments, paths, empty media | The shared `resolveFileToolPath` for both kinds; the media line-range refusal in `read-file.ts`, before the numeric range checks; the empty check in `read-file-media.ts` | `read-file-media.test.ts`: relative path with no `base_dir`, a denied path, 7 line-range variants (incl. GPT's `0/0`, `-1/-1`, `1/999999`, and `5/2`) with the exact "was not loaded … do not claim to have inspected" message, the article per kind (CR-003), an empty file, a missing file, a directory named `.png`. 10 of these fail on the IR-001 code (`IMP-11`) |
| BEH-007 / REQ-005 / AC-005 removal | `media-reader-tool.ts` and its 2 tests deleted; `tools/index.ts`, `multimedia/index.ts`, `register-tools.ts`; 4 tests and 4 docs updated | `git grep read_media_file` in `autobyteus-ts` and the server's src and tests finds only recorded-history rendering, its test, the Work Journal fixture, docs, and the new AC-006 test. Gated Gemini m4a live test: see Local Checks |
| BEH-008 / REQ-006 / AC-006 stored names | No code change: the existing resolver skips unknown names, and `AUTOBYTEUS_DEFAULT_TOOL_NAMES` always adds `read_file` | New server case in `autobyteus-agent-tool-resolver.test.ts`: a definition naming only `read_media_file` resolves to `run_bash, read_file, edit_file, write_file` with a "not found in registry" warning and no error, and its stored `toolNames` are not modified. No migration added |
| BEH-009 / REQ-007 / AC-007 Work Journal | `autobyteus-translation.ts`: `readFile` renders a context-file value as `cat <path>` plus the media marker, and text as before; `readMediaFile` is kept for recorded history; shared `mediaReadRecorded` | `runtime-translations.test.ts`: `read_file` image, audio and error cases, plus the recorded `read_media_file` case |
| BEH-010 / REQ-008 / AC-008 Daily Assistant | `built-in-agents/templates/daily-assistant/agent-config.json` | `built-in-agent-bootstrapper.test.ts` expects the template without `read_media_file`. The 16 public package files are handed over below |
| BEH-011 / REQ-009 / AC-009 binary refusal | `read-file.ts`: after the media check, `fileBytes.includes(0)` on the single read (whole buffer, DEC-006) | `read-file-binary.test.ts` (refused: a PDF-like file, a PDF-like file whose first NUL is after 30 KB, a ZIP, seeded random bytes, an ELF, a 100 KB file whose only NUL is its last byte, a binary file with line arguments; read as before: non-ASCII UTF-8 numbered and plain, an empty text file). Failed before REQ-009 (`IMP-02`); the two late-NUL cases fail on the IR-001 code (`IMP-11`). Byte-identity run: all 296 tracked NUL files refused (`IMP-12`). Native-agent case: a PDF-like file is refused, no attachment, no `%PDF` in the request. Residual by design: a binary file with no NUL at all is decoded as text |
| BEH-012 / REQ-010 / AC-010 OpenAI tool arguments | `openai-responses-llm.ts` `normalizeTools`: nested function tools → Responses shape plus `strict: false`; flat function tools without `strict` get `strict: false`; others unchanged. Used by `sendMessages` and `streamMessages` | **Unit:** `provider-native-request-payloads.test.ts` asserts the exact `tools` body for both entry points (fails 2/2 before the fix, `IMP-10`). **Live** (test vault, real `AgentRuntime` + `OpenAILLM` + production `ToolSchemaProvider`): `openai-read-file-strict-live.test.ts` on `gpt-5.4-mini` and `gpt-5.5`, 2/2 each. One `read_file` call with only `path` on a synthesized red PNG, answer "Red"; `write_file` with exactly `path` and `content` (`IMP-14`) |

Scope guardrail respected: **Yes**. No change to:
- stored definitions, the public packages, or `download_media`;
- other runtimes, or the LLM layer's media sanitizer (FU-002);
- binary content extraction.

## Deviations From The Design (all small; none changes intended behaviour)
- **Work Journal fixture unchanged.** The design listed `work-journal-builtin-tools.json` as modified. That fixture is the oracle for the built-in table's *keys*, and the table still has both `read_file` and `read_media_file`, so it needs no change. The new `read_file` media cases live in `runtime-translations.test.ts`.
- **The old workspace-confinement case was not moved.** The removed `read_media_file` tests asserted that a path outside the workspace is refused. With the shared trusted-local rule that the design chose (REQ-004 / BEH-005), absolute paths anywhere are allowed for both kinds. The moved cases cover the rule as it now applies: relative path without `base_dir`, `base_dir` resolution, and denied paths.
- **Refusal messages beyond the design's list.** These match the existing `read_file` and `read_media_file` wording:
  - missing file: `The file at resolved path <p> does not exist.`, the same as text;
  - non-regular path: `The path <p> is not a regular file.`;
  - line ranges on media: `start_line and end_line apply to text files only; '<p>' is an image|an audio|a video file.`
- **A dead `try`/`catch` was removed.** The old text path wrapped the line processing in the read's `try`. Now only `fs.readFile` is inside the `try`, since string processing cannot throw. The "Could not read file at …" message for a read error is unchanged.
- **IR-002: the media line-range refusal now comes before the numeric range checks.** Otherwise `0`/`-1` on a media file (which GPT sent) would get `start_line must be >= 1`, which does not say the file was not loaded (CR-001 question 2). To do that, `resolveFileToolPath` now runs before the range checks. For text files this changes only which error is reported when *both* the path is rejected (relative without `base_dir`, or denied) and the range is invalid: the path error now comes first. Every valid read and every single-error case is unchanged (existing tests and `IMP-12`).
- **IR-002: a flat function tool without `strict` also gets `strict: false`.** The design names the nested shape (`normalizeTools` L148-160); the Responses-shaped pass-through branch would otherwise still omit `strict`. A caller's explicit `strict` there is kept.
- **Tests added beyond the design's list:**
  - `read-file-media-native-agent-flow.test.ts`: the native-agent outcome the design's Checks ask for, with a scripted model;
  - the AC-006 resolver case;
  - `read-file-binary.test.ts` for REQ-009.
- **Docs.** `docs/tool_schema_and_configuration.md` § 2.3 describes the media reads, the binary refusal and the removal; three more docs had their file names updated.

## Key Files
`autobyteus-ts`:
- `src/tools/file/read-file.ts`: dispatch by kind, the line-range refusal for media (before the numeric checks), the whole-file binary check, the descriptions; return type `string | ContextFile`.
- `src/llm/api/openai-responses-llm.ts`: `normalizeTools` sends function tools with `strict: false` (IR-002). `src/tools/usage/formatters/openai-tool-schema-normalizer.ts`: comment names the Responses default.
- `src/tools/file/read-file-media.ts` (new): `readMediaFileAsContextFile`, `MediaReadContext`.
- Removed: `src/tools/multimedia/media-reader-tool.ts`, `tests/unit/tools/multimedia/media-reader-tool.test.ts`, `tests/integration/tools/multimedia/media-reader-tool.test.ts`. Exports and registration removed from `src/tools/index.ts`, `src/tools/multimedia/index.ts` and `src/tools/register-tools.ts`.
- New tests:
  - `tests/integration/tools/file/read-file-media.test.ts` (25 cases);
  - `tests/integration/tools/file/read-file-binary.test.ts` (9);
  - `tests/integration/agent/read-file-media-native-agent-flow.test.ts` (3);
  - `tests/integration/agent/openai-read-file-strict-live.test.ts` (2, gated live, AC-010);
  - 2 cases in `tests/unit/llm/api/provider-native-request-payloads.test.ts` (Responses `strict: false`).
- Renamed tests: `tests/integration/agent/read-file-media-continuation-flow.test.ts`, `tests/integration/agent/gemini-read-file-m4a-live.test.ts`.
- Adapted tests: `tests/unit/tools/index.test.ts`, `tests/unit/agent/loop/tool-continuation-input-builder.test.ts`, `tests/unit/agent/message/tool-continuation-display-text.test.ts`, `tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts`, `openai-chat-renderer.test.ts`.
- Docs: `docs/tool_schema_and_configuration.md`, `docs/agent_runtime_loop_and_interrupt.md`, `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`.

`autobyteus-server-ts`:
- `src/agent-work-journal/rendering/runtimes/autobyteus-translation.ts` and `tests/agent-work-journal/rendering/runtime-translations.test.ts`.
- `src/built-in-agents/templates/daily-assistant/agent-config.json` and `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`.
- `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` (AC-006 case).

## Design Health / Removal / Size / Persistence
- Clean-cut removal: no alias, no compatibility shim, no dead export. `read_media_file` survives only where recorded history is rendered: the Work Journal converter and its fixture key, as the design says.
- Sizes (non-empty lines):
  - `read-file.ts` 115 → 139;
  - `read-file-media.ts` 43;
  - `openai-responses-llm.ts` 418 → 427;
  - `autobyteus-translation.ts` 127 → 139.
  - The source diff against the base `e82d03b0f9` is +150 / −181 lines.
- Persisted data: **Not Affected** (DEC-001). There is no migration; the stored `toolNames` stay and are skipped with a warning (AC-006 test).
- Prompt cost: the `read_file` description grows by one sentence, which the user accepted in 327.

## Hand-over For The Separate Package Ticket (DEC-002, REQ-008)
`autobyteus-agents` at `origin/main` `d50df67` names `read_media_file` in 16 files (from `autobyteus-327/investigation-notes-327.md`). Per DEC-002, change them only after a stable app release that contains this change; until then those packages need `read_media_file` on stable nodes.
- **12 agent configs: replace `read_media_file` with `read_file` in `toolNames`, with no duplicate entry.** If `read_file` is already listed, just remove `read_media_file`.
  - kids-picture-story-team: `book-production-editor`, `picture-book-illustrator`, `picture-book-reviewer`;
  - marketing-team: `marketing-content-creator`, `marketing-performance-analyst`;
  - middle-school-mathematics-team: `experience-builder`, `mathematical-reviewer`;
  - supervised-research-team: `research-supervisor`, `researcher`;
  - standalone: `chemistry-teaching-assistant`, `computer-use-operator`, `deep-researcher`.
- **4 skills: where they say to read an image with `read_media_file`, say "read the image with `read_file` and an absolute path".** The skills are `book-production-editor`, `picture-book-illustrator`, `picture-book-reviewer` and `computer-use-operation`. The shared path rule refuses a workspace-relative path that has no `base_dir`, and its message tells the agent to pass an absolute path.

## Local Implementation Checks
Evidence is in `evidence/`; each log starts with its command, commit, environment and date. I ran with a clean environment (`env -i PATH HOME=<temp> TMPDIR`), on synthesized data only, and never touched the user's running AutoByteus or its data.

1. **Reproductions first** (`IMP-01`, `IMP-02`).
   - `read-file-media.test.ts` on the base `read_file`: 15 of 18 fail. A PNG comes back as `1: \n2: \x1a\n3: …` instead of a context file.
   - `read-file-binary.test.ts` before REQ-009: 5 refusal cases fail and 3 text cases pass.
   - Both files pass after the change.
2. **Text identity** (`IMP-03`). The base and new `read_file` were compared over every tracked non-media file: 67,292 files, of which 67,091 text files × 3 argument sets gave 201,273 identical results, and all 201 NUL files were refused.
3. **File tools** `tests/{unit,integration}/tools/file`: 14 files, 140 tests passed, including the existing `read_file` tests, unchanged.
4. **Native-agent flow** (`IMP-07`): `read-file-media-native-agent-flow.test.ts`, 3 passed. Against the base `read_file` (swapped in temporarily, then restored) it fails 3 of 3.
5. **Full `autobyteus-ts` suite** (`IMP-04`). I ran three rounds; every changed or new test passed in each. Failures outside this ticket, each with its cause:
   - **Terminal tests**, rounds 1 and 3: `Command control deadline exceeded` / `ps` killed by its timeout. Cause: a 1,500 ms start budget containing `ps` snapshots limited to 500 ms, on a machine at load average up to 55 (the user's Chrome and AutoByteus are running). They pass alone, under artificial CPU load, and with all terminal files in parallel. This is product timing in the terminal subsystem, so it is recorded as **FU-003**, not fixed here.
   - **`logger.test.ts`**, round 2: a fixed 25 ms wait for an asynchronous write stream. Fixed in `16b3e2452d` as a baseline fix (`IMP-09`).
   - **`lmstudio-llm.test.ts` URL multimodal case**, round 3: timed out at 120 s doing real local inference under load. This case downloads its image from the user's running AutoByteus at a hard-coded LAN URL. Recorded as **FU-004** and not rerun. My first run JIT-loaded `qwen/qwen3.6-35b-a3b` in LM Studio; I unloaded it afterwards.
   - Round 3 totals: 389 files passed, 3 failed (above), 26 skipped. The 3 failed terminal and process-scope files then passed alone (25/25).
6. **Server** `test:unit` (`IMP-05`): exit 0. 864 files passed, 5 skipped; 7,303 tests passed. This includes `tests/agent-work-journal` (the new `read_file` media cases), `tests/architecture` and the Daily Assistant bootstrapper test. The AC-006 resolver file was collected before I added its case. Run alone it passes 9/9 (`IMP-07`).
7. **Typechecks** (`IMP-06`): `autobyteus-ts` `tsc -p tsconfig.build.json` exit 0; server `typecheck` exit 0. A fresh worktree first needs `pnpm -C autobyteus-server-ts prebuild` (exit 0).
8. **Gated Gemini m4a live test** (`IMP-08`): **skipped, not passed.** I ran it with the test vault and both gates. The provider refused the vault's Gemini credential (`invalid_or_missing_credentials`), so no request was sent. AC-005's live part remains open until the vault's Gemini key is valid.
9. `git grep read_media_file` (AC-005): see the trace above. `git diff --check e82d03b0f9..HEAD` is clean except API/E2E's `evidence/API-11-newer-openai-and-lmstudio.log` (one trailing space, not mine to edit).

### IR-002 checks (SR-005)
10. **Responses `strict: false`** (`IMP-10`): the new unit cases fail 2/2 before the fix (the tools lack `strict`) and pass after; the whole file passes 13/13.
11. **`read_file` changes** (`IMP-11`): against the IR-001 `read_file`, 12 new or changed cases fail: the 2 late-NUL cases, 7 media line-range variants, and 3 article cases. All pass now (binary 9/9, media 25/25). Focused run: 16 files, 164 tests passed, including the native-agent flow.
12. **Text identity again** (`IMP-12`): whole-file rule. 67,037 text files × 3 = 201,111 identical comparisons, and all 296 NUL files refused. That is 95 more files than the 8,000-byte window refused, as DEC-006 intends.
13. **AC-010 live** (`IMP-14`): `openai-read-file-strict-live.test.ts` with the test vault, run once on `gpt-5.4-mini` and once on `gpt-5.5`, 2/2 each.
    - Image: one `read_file` call with only `path`, no error, answer "Red".
    - `write_file`: exactly `path` and `content`.
    - I did not rerun the failing strict-omitted case live; SD-02 run 2 is that proof.
14. **Suites** (`IMP-13`, at `438e6c1cde`):
    - Full `autobyteus-ts`: 388 files passed, 4 failed. All 12 failures are in terminal, `run_bash` and approval files, at load average 54. They are FU-003 symptoms (`ps` killed, exit code `null`, a heredoc file never written), plus one new symptom recorded as **FU-006**: `pwd` printed the test process's directory instead of the workspace, cause not found. The 4 files pass alone (26/26). Every changed and new test passed.
    - The run JIT-loaded the LM Studio model again; I unloaded it.
    - Server: 16 files, 179 tests (Work Journal, native resolver, built-in agents). I did not rerun the full server `test:unit`: SR-005 changes no server code, and no server test refers to the changed strings or tool shape (searched).
    - Typechecks: `autobyteus-ts` and server both exit 0.

Not run: the realistic server or isolated-app journey with a real model after IR-002, Electron, and the web UI. This change has no web or UI part; the Work Journal is covered by unit rendering tests.

## Environment / Cleanup / Delivery Notes
- No server, app, browser or database was started. Temporary homes and test directories were under `/tmp`. The temporary comparison files (`src/tools/file/zz-read-file-base.ts`, `tests/zz-compare-text.test.ts`) were removed before committing.
- The untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` come from the server `prebuild`. They are build outputs: **do not stage them**.
- No push, merge, tag or release.
- The branch is based on `e82d03b0f9`; `origin/personal` is now `8760c83788`. The files this ticket changes are unchanged between them (checked for `read_file`, `media-file-kind` and the Responses LLM), but delivery must refresh the branch per RELEASE.md.
- Delivery: the release note should name the change. `read_media_file` was removed and `read_file` now reads images, audio and video and refuses other binary files. OpenAI GPT models (Responses) now get optional tool arguments as optional (`strict: false`); before, they filled every optional argument of every tool. A stored definition that names `read_media_file` keeps starting, with a warning, and reads media through `read_file`.
- The public-package change follows after a stable release (above, DEC-002).

## Independent Executable Coverage Still Required (API/E2E)
- The realistic native-agent journey through the server or the isolated app with a real model:
  - a synthesized image, audio and video read via `read_file`;
  - a model whose capability is `unsupported` for one kind;
  - a PDF, DOCX or ZIP refused;
  - Work Journal rendering of those runs.
- My native-agent test uses a scripted model in `autobyteus-ts`; it proves the loop wiring, not a provider's handling. AC-010's live test does use a real provider, but in `autobyteus-ts` rather than through the server.
- Re-run the failed API/E2E scenarios after IR-002:
  - SCN-F1: GPT-5 media reads through the real server (API-09/API-10). Newer OpenAI models (`gpt-5.6-*`, `gpt-6-*`) were not tested by anyone; the vault now has credits.
  - SCN-F2: the OS PDF sample (API-05), where 77 of the 79 misses should now be refused and 2 remain with no NUL.
  - SCN-F3: the message wording.
- Other OpenAI tools: `strict: false` affects every function tool on the Responses path, not only `read_file`. A quick tool-calling sanity pass on another tool with optional arguments (for example `run_bash` `cwd`/`timeout_seconds`) through the server is worth doing.
- The Gemini m4a live test (AC-005) once the test vault's Gemini key is valid. It is gated: `AUTOBYTEUS_TEST_VAULT`, `RUN_LIVE_PROVIDER_TESTS=1` and `AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1`, as in `IMP-08`. It uses a costly Pro model, so run it once.
