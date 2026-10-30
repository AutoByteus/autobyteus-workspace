# API/E2E Execution Coverage Report — read-file-media-merge (autobyteus-328)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-004`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct low-risk route); round 2, IR-002 (SR-005) (§ Round 2); **round 3 (current), IR-003 (SR-006)** (§ Round 3)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-06's run 1 assertions read the tool path from the result event, which does not carry the arguments; the probe was fixed to take them from `TOOL_EXECUTION_STARTED` and rerun (run 2). The run-1 receipt is kept.
  - Cases API-08 (a measurement matrix), API-09 and API-10 were added after API-06 run 1 showed OpenAI models sending line arguments on media reads, to measure how general it is and to reach the capability refusal on a real model.
  - Anthropic and Kimi cells could not run: Anthropic's key has reached its usage limit until 2026-11-01, Kimi's account is suspended for insufficient balance (`API-06-provider-availability.log`).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge/tickets/in-progress/read-file-media-merge/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (no durable test code changed by API/E2E)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `3a336f7a4a` (last code commit `16b3e2452d`) | macOS 26.5 arm64 | `autobyteus-ts` vitest; Node 22.23.1, pnpm 10.28.2 | `env -i PATH HOME=<resolved temp> TMPDIR`; test vault `~/.autobyteus-test/vault` with `RUN_LIVE_PROVIDER_TESTS=1`, `AUTOBYTEUS_LIVE_STRICT=1` |
| ENV-2 | `3a336f7a4a` | same | in-process studio server (`startStudioE2eRuntimeServer`, real GraphQL and `/ws/agent/<runId>`), native AutoByteus runtime; server built (`pnpm -C autobyteus-server-ts build`) | test-owned data root with `GEMINI_SETUP_MODE=VERTEX_EXPRESS`; test vault (read-only); models: `gemini-3.8-flash` (image, audio, video), `gpt-5.4-mini`, `gpt-5.5`, `grok-4.7` (image only, the default set); fixtures in `/tmp/ab328/fixtures` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..004, AC-006 (resolver), AC-007 (renderer), AC-008 (template), AC-009 (synthesized) | repository checks | Reused: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07 | (IMP) | Pass | (IMP) | (IMP) | `git diff --name-only 16b3e2452d HEAD` lists only ticket documents, so every IMP check ran on the code under test; IMP-04's failures outside this ticket are recorded with causes (FU-003, FU-004, baseline fix `16b3e2452d`) |
| API-02 | AC-005 (removal) | repository content | `git grep -n "read_media_file\|ReadMediaFile" -- autobyteus-ts autobyteus-server-ts` | ENV-1 | Pass | `API-02-read-media-file-grep.log` | 14 matches: `autobyteus-translation.ts` (recorded-history renderer, L106, L146), its test, the fixture key, the AC-006 test, `docs/tool_schema_and_configuration.md` L150, and two old files under `tickets/done/` | no live code path names it |
| API-03 | AC-005 (live, as written) | real Gemini, AI Studio | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_LIVE_PROVIDER_TESTS=1 AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1 AUTOBYTEUS_LIVE_STRICT=1 pnpm -C autobyteus-ts exec vitest run tests/integration/agent/gemini-read-file-m4a-live.test.ts` | ENV-1 | Blocked | `API-03-gemini-m4a-live-ai-studio.log` | `ApiError: {"error":{"code":429,"message":"Quota exceeded for quota metric 'Generate Content API requests per minute' …`; `"quota_limit_value":"0"`; `"quota_location":"europe-west1"`; reported as `provider refused Gemini: invalid_or_missing_credentials` | the AI Studio key's Google project has zero quota in its region; the helper misclassifies the 429 because `project_number:303290304011` contains `401` (FU-005). Only the user can raise the quota or replace the key |
| API-04 | AC-005 (live flow) | real Gemini, Vertex Express | temporary copy of the test with `{ kind: 'vertexExpress' }` (the only change; diff in the log), same gates, strict; deleted after | ENV-1 | Pass | `API-04-gemini-m4a-live-vertex-express.log` | `✓ … sends a read_file .m4a tool result continuation to direct Gemini 4814ms`; `Tests  1 passed (1)`; `temporary test removed: yes` | the test asserts the `read_file` result is an audio `ContextFile`, the rendered request carries the m4a as `inlineData` `audio/mp4`, and Gemini's answer contains `hello` |
| API-05 | AC-009, BEH-011 (real documents) | `read_file` on real and generated documents | temporary vitest file calling the registered `read_file` on copies; deleted after | ENV-1 | **Fail** | `API-05-real-documents-receipt.json`, `API-05-fixtures-and-pdf-sample.log` | refused: `cups.pdf` (first NUL at 313), `chrome.pdf` (476), `note.docx` (5), `note.zip` (5); **returned as text**: `os-keyboard.pdf` (first NUL at 32001): `resultChars 29857`, `replacementChars 1857`, `nulChars 13`; `os-premiumcard-logo.pdf` (42388): `resultChars 126833`, `replacementChars 33499`, `nulChars 292`; `note.rtf` read as text (a text format) | sample of 400 OS-shipped PDFs: 79 have no NUL in their first 8,000 bytes (77 have one later); their sizes 9.5–225 KB. Finding F-2 |
| API-06 | AC-002, AC-006, AC-008, AC-009, BEH-011 | server journey on real providers | temporary gated server E2E (probe saved as `API-06-journey-probe.e2e.test.ts.txt`, deleted from the tree): R1 `gemini-3.8-flash` on a new definition with `toolNames: ["read_media_file"]`: read `red.png`, `hello.m4a`, `blue.mp4`, then `cups.pdf`, `note.docx`, `note.zip`, `os-keyboard.pdf`; R2 `gpt-5.4-mini` as the built-in Daily Assistant: read the three media files | ENV-2 | **Fail** (R1 Pass, R2 Fail) | `API-06-server-journey.log`, `API-06-server-journey-receipt-run1.json`, `API-06-server-journey-receipt-run2.json` | R1 (both runs): three `TOOL_EXECUTION_SUCCEEDED` with results `{"uri":…"fileType":"image"…}`, `"audio"`, `"video"`; answer `IMAGE_COLOR=red`, `SPOKEN=hello`, `VIDEO_COLOR=blue`; turn 2: three `is a binary file and cannot be read as text` refusals and `os-keyboard.pdf` `TOOL_EXECUTION_SUCCEEDED` `text (29857 chars)`, the model then reporting `os-keyboard.pdf OK`. R2 (both runs): arguments `"start_line":1,"end_line":1,"include_line_numbers":true` on every media read, each refused `start_line and end_line apply to text files only; '/tmp/ab328/fixtures/red.png' is a image file.`; answer `IMAGE_COLOR=UNAVAILABLE` | AC-006: the definition naming only `read_media_file` started and read all three kinds through `read_file`. AC-008: the Daily Assistant ran with `read_file`. Findings F-1 (R2), F-2 (R1 turn 2), F-3 (wording `a image`) |
| API-07 | AC-007 | Work Journal of real runs | `getAgentRunMemoryView(runId, workJournal: {}) { workJournal { lines } }` for R1, R2, API-10 | ENV-2 | Pass | receipts (`workJournal`) | R1: `Command: cat /tmp/ab328/fixtures/red.png → ok` / `[image, not reproduced]`, the same for `[audio, …]` and `[video, …]`; binary refusals as `cat -n … → failed: The file '…' is a binary file …`; R2: `cat -n /tmp/ab328/fixtures/red.png \| sed -n '1,1p' → failed: start_line and end_line apply …` | the renderer works on recorded real runs |
| API-08 | AC-002 (real use) | an image read on image-capable models, per agent | in the journey probe: `"What is the main color of the image <red.png>? Look at it with the read_file tool, then answer with one word."`; `gpt-5.4-mini` × {Daily Assistant, a plain definition with `read_file`} × 3; Anthropic × 2 × 2; `gemini-3.8-flash` × Daily Assistant × 2 | ENV-2 | **Fail** | `API-06-server-journey-receipt-run2.json` (`matrix`) | `gpt-5.4-mini`: 6 of 6 runs `FAILED(lines 1-1)`, `imageSeen false`, no retry; `gemini-3.8-flash`: 2 of 2 `SUCCEEDED`, `imageSeen true`; Anthropic: no tool call, `is_error: true` (provider usage limit) | the matrix's `saidRed` column reads the wrong end of the text and is not used |
| API-09 | AC-002 (real use) | text and image reads on more models | the probe's API-09 cells: a 5-line `notes.txt` on `gpt-5.4-mini`; `red.png` on `gpt-5.5`, `grok-4.7`, `kimi-k3` (plain definition) | ENV-2 | **Fail** | `API-09-receipt.json` | `gpt-5.4-mini` text: `"start_line":1,"end_line":200` → `SUCCEEDED`, answer `line five: echo`; `gpt-5.5` image: **11 calls, every one with line arguments** (`0/0`, `1/1`, `-1/-1`, `1/999999`, …) → `start_line must be >= 1 when provided; got 0.` or `start_line and end_line apply to text files only…`, then the answer `Red` without the image ever loading; `grok-4.7`: `{"path":"/tmp/ab328/fixtures/red.png"}` → `SUCCEEDED`, answer `red`; Kimi: `429 … suspended due to insufficient balance` | the OpenAI tool schema requires only `path` (`additionalProperties: false`, strict mode off): the models fill the optional line arguments themselves |
| API-10 | AC-003 (real model) | capability refusal on an image-only model | the probe's API-10 cell: `grok-4.7` reads `hello.m4a` and `blue.mp4` | ENV-2 | Pass | `API-10-receipt.json` | `TOOL_EXECUTION_FAILED` `The selected model does not support audio input. The audio file was not loaded. Continue without audio analysis and do not claim to have inspected it.` and the video equivalent; the agent: `I could not hear it — the model does not support audio input …`; journal `cat -n /tmp/ab328/fixtures/hello.m4a → failed: The selected model does not support audio input …` | |
| API-11 | AC-002 (real use), F-1 generality (the user's request) | image reads on newer OpenAI models and LM Studio Qwen; neutral-name recheck | the API-11 probe (`API-11-probe.e2e.test.ts.txt`; deleted from the tree): run 1 stopped (a `gpt-6-sol` turn streamed > 300 s; results were saved only at the end); run 2: `gpt-5.6-terra`, `gpt-6-astra`, `gpt-6-luna`, `gpt-6-sol` ×2 each, `qwen/qwen3.6-35b-a3b` image ×2 and audio+video ×1; run 3: neutral file names (`picture.png` green, `recording.m4a` says "hello", `clip.mp4` yellow) on Qwen, Gemini 3.8 Flash, Grok 4.7. LM Studio had nothing loaded before; the model run 2 loaded was unloaded afterwards (`lms unload`) | ENV-2, LM Studio `localhost:1234` | Pass (Qwen, Gemini, Grok); Not Tested (newer OpenAI models) | `API-11-newer-openai-and-lmstudio.log`, `API-11-receipt-run2.json`, `API-11-receipt-run3.json` | run 2 OpenAI cells: `LLM_PROVIDER_ERROR` `Error in OPENAI Responses API streaming: You have no credits remaining.`; Qwen image: `{"path":"/tmp/ab328/fixtures/red.png"}` → `SUCCEEDED`; run 3: Qwen `Green` ×2 and `IMAGE_COLOR=GREEN; SPOKEN=UNAVAILABLE; VIDEO_COLOR=UNAVAILABLE` (audio and video loaded, `SUCCEEDED`, but not received by the model); Gemini `IMAGE_COLOR=green`, `SPOKEN=hello`, `VIDEO_COLOR=yellow`; Grok `Green`; `LM Studio after unloading …: No models are currently loaded.` | Qwen, Gemini and Grok send only `path`. The OpenAI test key ran out of credits during this round's runs, so whether `gpt-5.6`/`gpt-6` models also fill line arguments is unknown. Caveat fixed by run 3: API-06 R1 and API-09 used `red.png`, `hello.m4a`, `blue.mp4`, whose names give the answers; run 3's neutral names confirm the media reach Gemini, Grok and Qwen. LM Studio models have capability `unknown`, so audio and video load and are then not delivered to the model by the OpenAI-compatible path with no message (the LLM layer's silent drop, FU-002) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-03, IMP-04) | Proven | — |
| AC-002 | Yes | API-11 run 3 (neutral names: Gemini image, audio and video; Grok and Qwen image), API-06 R1, API-09, API-04 (M4A to Gemini), API-01 (IMP-07) | Proven as written (synthesized files reach the model as media); **real use fails on OpenAI models (F-1)** | — |
| AC-003 | Yes | API-10 (real model), API-01 | Proven | — |
| AC-004 | Yes | API-01 (`read-file-media.test.ts`) | Proven; the line-range refusal it requires is the cause of F-1 | — |
| AC-005 | Yes | API-02 (removal); API-04 (live flow, Vertex Express) | Proven for the flow; the durable test's AI Studio run is blocked by the project's zero quota | Raising the Google project's quota in `europe-west1`, or a working AI Studio key, is the user's; then run API-03's command once |
| AC-006 | Yes | API-06 R1 (a definition naming only `read_media_file` started and read all three kinds), API-01 | Proven | — |
| AC-007 | Yes | API-07, API-01 | Proven | — |
| AC-008 | Yes | API-06 R2, API-08 (the Daily Assistant runs with `read_file`), API-01 | Proven (template); the Daily Assistant on OpenAI cannot read images (F-1) | — |
| AC-009 | Yes | API-01 (synthesized), API-05, API-06 R1 turn 2 | Proven as written (its synthesized files); **BEH-011 does not hold for real PDFs whose first NUL is after byte 8,000 (F-2)** | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 70% | ACs as written proven (API-01..07, 10) | UC-002 fails on OpenAI GPT-5 models (F-1); BEH-011 fails for a class of real PDFs (F-2) | upstream decision, then rerun API-08/09 and API-05 |
| Changed-boundary execution directness | 75% | 95% | real server, real providers, real files | — | — |
| Cross-boundary integration realism and mock gap | 70% | 90% | Gemini, OpenAI, Grok live; scripted model only in IMP-07 | Anthropic and Kimi unavailable (account limits) | rerun when available |
| Environment, configuration, identity, and fixture fidelity | 90% | 92% | clean env, test vault, test-owned data roots, generated real-format documents | AI Studio quota (API-03) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 60% | refusals proven (API-05, 06, 10) | recovery after a line-range refusal does not happen on OpenAI models (F-1); late-NUL PDFs pass (F-2) | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no web or desktop change; the Memory page's query proven (API-07) | — | — |
| Durable regression coverage quality and relevance | 85% | 75% | IMP tests | no durable test covers a model that fills line arguments, or a PDF without an early NUL | after the upstream decision |

- Overall post-repository confidence: 82%
- Overall final confidence: 80% (simple average of the six applicable categories)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` as written; the real-use failures F-1 and F-2 are not covered by the ACs' wording
- Any final applicable category below `90%`: `Yes` — requirement proof, failure evidence, durable coverage
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (real providers through the server's GraphQL and agent WebSocket), `Other` (real documents through `read_file`)
- Confidence gap it addresses: the handoff's open items (a real-model journey, the Gemini live test) and BEH-011 on real files; it found F-1 and F-2.
- Browser validation needed: no (no web change; the Work Journal was read through the Memory page's query).

## Persisted-Data Transition Checks (When Applicable)

- Approved decision: `Not Affected` (DEC-001)
- Representative existing data used: a definition stored through GraphQL with `toolNames: ["read_media_file"]` (API-06 R1)
- Approved transition followed without an unnecessary migration: `Yes`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (`read_media_file` survives only in the recorded-history renderer, as designed)
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Gemini AI Studio endpoint | Vertex Express endpoint (API-04, API-06) | the AI Studio project has a zero quota | the endpoint, not `read_file`'s behaviour |
| Anthropic, Kimi | not run | account limits | no data for those providers |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| temporary test files (`zz-api05-…`, `zz-api04-…`, `zz-api06-…`, `zz-schema-probe…`) | Yes | deleted after each run; the journey probe kept as evidence text | removed (`git status` shows none) |
| in-process servers, data roots, temp HOMEs | Yes | `app.close()`, `rm -rf` | removed |
| fixtures and generated documents `/tmp/ab328` | Yes | removed after the report | removed |
| server `dist/` build | Yes (git-ignored build output) | kept | present |

## Preliminary Classification (On `Fail`)

- **F-1 — `Requirement Gap`** (owner: Solution Designer, with the user). OpenAI GPT-5 models fill `read_file`'s optional `start_line`/`end_line` on every call: `gpt-5.4-mini` sent line arguments in 12 of 12 media reads over 8 runs (R2 twice with 3 reads each, and the 6 matrix runs; Daily Assistant and a plain agent), `gpt-5.5` made 11 calls with line arguments (`0/0`, `-1/-1`, `1/1`, `1/999999` …) and none without. BEH-004 and AC-004 require refusing line ranges on media (the design rejected ignoring them), so these agents cannot read any image, audio or video: the Daily Assistant answered `IMAGE_COLOR=UNAVAILABLE`, and `gpt-5.5` answered `Red` without the image ever loading, which is the "claims to have inspected" outcome this ticket set out to remove. `read_media_file` took only `file_path`, so this is a regression for OpenAI users. Gemini and Grok send only `path` and work. Changing it changes approved behaviour (BEH-004): for example, ignore line arguments for media as `include_line_numbers` already is (and skip their range validation, since `0` and `-1` fail it first), so it needs the user's decision.
- **F-2 — `Design Impact` / `Requirement Gap`** (owner: Solution Designer). BEH-011 says a PDF is refused; the approved detection (DEC-004: a NUL byte in the first 8,000 bytes) misses PDFs whose first NUL comes later: 79 of 400 OS-shipped PDFs sampled, and the two tried returned 29,857 and 126,833 characters of garbled text (thousands of U+FFFD and embedded NULs), through the real server too (the model reported `OK`). Documents from Chrome, the macOS print pipeline, DOCX and ZIP are refused. Whether to widen detection (for example a `%PDF-` signature or other known binary signatures) or accept the limit is a design or user decision.
- **F-3 — `Local Fix`** (implementation): the line-range refusal reads `is a image file` (`read-file.ts` L80 chooses `an` only for audio); the handoff states `an image`.
- Not this ticket: FU-005 (the live-test helper misclassifies Gemini's 429 quota error as a credential error).

## Round 1 Result (superseded by § Round 2)

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-005's durable live test in AI Studio mode (the user: the Google project's quota or a working key); the ACs as written are otherwise proven, and F-1 and F-2 are real-use failures of UC-002 and BEH-011.
- Preliminary classification and recommended owner: F-1 `Requirement Gap` and F-2 `Design Impact`/`Requirement Gap` (Solution Designer, user decision); F-3 `Local Fix` (implementation).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review of an execution failure).
- Notes: follow-up FU-005 added.

## Round 2 — IR-002 (SR-005: `strict: false`, whole-file NUL scan, message and articles)

- Trigger: IR-002 (`53d149a4cc`, `815b6e175a`, `438e6c1cde`; HEAD `17e2dfbc6c`), answering CRR-001/CRR-002 after API-REV-001/002.
- Plan: investigation § Round 2. Environment: ENV-1 and ENV-2 as in round 1, at `17e2dfbc6c`; the OpenAI test key has credits again.

### Round 2 Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01b | AC-001, AC-004, AC-009, AC-010 (unit and live) | repository checks | Reused: IMP-10, IMP-11, IMP-12, IMP-13, IMP-14 | (IMP) | Pass | (IMP) | (IMP) | code unchanged since; IMP-12's "binary 296 (all refused)" is examined in API-12 |
| API-12 | BEH-001, BEH-011, DEC-006 | what the NUL scan refuses | census of tracked non-media files with a NUL byte | ENV-1 | **Fail** | `API-12-nul-file-census.log` | `first NUL after 8,000 bytes (newly refused by DEC-006): 95 [('.log', 94), ('.pdf', 1)]`; `tracked .log files: 21147 ; containing NUL: 173 ; Electron build logs among them: 167`; context `[nuxt] kit:compatibi…\x00…` | F-4. The files refused within the first 8,000 bytes are `.gz` 88, `.log` 79, `.z` 20, `.db`, `.jar`, `.bin` …: the 79 logs were already refused in round 1, which I did not catch (I accepted IMP-03's "201 NUL files refused" without looking at them) |
| API-05 (round 2) | AC-009, BEH-011 | real PDFs and generated documents | temporary probe (`API-05-API-14-round2-probe.test.ts.txt`, deleted from the tree): `read_file` on copies of the 79 OS-shipped PDFs the 8,000-byte window missed, and the generated PDFs, DOCX and ZIP | ENV-1 | Pass | `API-05-API-14-round2-receipt.json` (`documents`) | 77 of 79 `refused`; `text` only `024-ScriptSucceeded.pdf` and `025-ScriptFailed.pdf`, both `firstNul -1`; `chrome.pdf`, `cups.pdf`, `note.docx`, `note.zip` refused | the 2 are DEC-006's stated residual (no NUL at all) |
| API-14 | AC-004, CR-001/CR-003 | media line-range refusal | same probe: PNG, M4A, MP4 with `start_line`/`end_line` 1/1, 0/0, −1/−1, start only, end only; then no line arguments; a text range; the build log | ENV-1 | Pass | `API-05-API-14-round2-receipt.json` (`mediaLineRanges`, `textLineRange`, `buildLog`) | `… '/tmp/ab328/fixtures/picture.png' is an image file, so it was not loaded. Call read_file again without start_line and end_line, and do not claim …`; `is an audio file`; `is a video file`; 0/0 and −1/−1 get the same message; without line arguments `context file` per kind; text 2–3 `text`; build log `refused` | F-3 fixed |
| API-13 | AC-002, AC-003, AC-008, AC-010, BEH-012, F-4 | server journey on real providers | temporary probe (`API-13-round2-journey-probe.e2e.test.ts.txt`): neutral names (`picture.png` green, `recording.m4a` says "hello", `clip.mp4` yellow); image on `gpt-5.4-mini`, `gpt-5.5`, `gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-6-astra`, `gpt-6-luna`, `gpt-6-sol` (plain agent); `gpt-5.4-mini` as the Daily Assistant: image + audio + video, `pwd` in a working directory, lines 2–3 of a text file, an Electron build log (one NUL at byte 8,200); Gemini 3.8 Flash image + audio + video; Grok 4.7 image; the Work Journal of the Daily Assistant media run | ENV-2 | **Fail** (F-4); everything else Pass | `API-13-round2-journey.log`, `API-13-round2-receipt.json` | each OpenAI model: one call `{"path":"/tmp/ab328/fixtures/picture.png"}` → `SUCCEEDED`, answer `green`/`Green` (8 of 8); Daily Assistant: image `SUCCEEDED`, audio and video `The selected model does not support audio input. …` / `… video input …`, answer `IMAGE_COLOR=green / SPOKEN=UNAVAILABLE / VIDEO_COLOR=UNAVAILABLE`; `run_bash` `{"command":"pwd","cwd":"/tmp/ab328/fixtures/work","timeout_seconds":30}` → `/private/tmp/ab328/fixtures/work`; text `{"path":…notes.txt,"start_line":2,"end_line":3,"include_line_numbers":true}` → `2: line two: bravo 3: line three: charlie`; build log `read_file` `FAILED` `… is a binary file and cannot be read as text …`, then the agent ran `strings` through `run_bash`; Gemini `IMAGE_COLOR=green`, `SPOKEN=hello`, `VIDEO_COLOR=yellow`; Grok `Green.`; journal `cat /tmp/ab328/fixtures/picture.png → ok` / `[image, not reproduced]` and the two refusals | `timeout_seconds: 30` equals the schema's `defaultValue: 30` (`run-bash.ts`): no invented value. The OpenAI models use optional arguments when the request needs them (`cwd`, the line range) and leave them out otherwise |

### Round 2 Prior-Failure Resolution

| Failure | Round 2 Result | Proven By |
| --- | --- | --- |
| F-1 OpenAI models fill line arguments on media reads | Resolved: 8 of 8 OpenAI models send only `path` and see the image | API-13 |
| F-2 PDFs with a late NUL read as text | Resolved for 77 of 79; 2 without any NUL remain, as DEC-006 states | API-05 round 2 |
| F-3 `a image` | Resolved | API-14 |

### Round 2 Acceptance-Criteria Proof (changes from round 1)

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-01b (IMP-12) for files without NUL; API-12 | **Not Proven in real use**: 173 tracked text logs with a stray NUL, readable before this ticket, are refused (F-4) |
| AC-002 | Yes | API-13 (8 OpenAI models, Gemini, Grok, neutral names), round 1 | Proven |
| AC-003 | Yes | API-13 (Daily Assistant on `gpt-5.4-mini`), round 1 API-10 | Proven |
| AC-004 | Yes | API-14, API-01b | Proven |
| AC-008 | Yes | API-13 | Proven, and the Daily Assistant now reads images on OpenAI |
| AC-009 | Yes | API-05 round 2, API-14, API-01b | Proven as written |
| AC-010 | Yes | API-13 (8 models, `run_bash`, a text range), API-01b (IMP-10, IMP-14) | Proven |
| AC-005 | Yes | round 1 API-02, API-04 | as round 1: the durable live test in AI Studio mode needs the user (quota or key) |
| AC-006, AC-007 | Yes | round 1; API-13 journal | Proven |

### Round 2 Validation Confidence Scorecard

| Confidence Category | Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | API-13, API-14, API-05 | F-4: text files with a stray NUL refused | the upstream decision, then API-12/API-13 build-log case |
| Changed-boundary execution directness | 96% | real server, 10 real models, real files | — | — |
| Cross-boundary integration realism and mock gap | 94% | OpenAI ×8, Gemini, Grok live | Anthropic and Kimi accounts unavailable (round 1) | — |
| Environment, configuration, identity, and fixture fidelity | 94% | clean env, test vault, neutral names, real logs and PDFs | AI Studio quota (AC-005 durable test) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | refusals with the right messages; models recover or report honestly | F-4 | — |
| User-surface, browser, and desktop-shell confidence | N/A | no web or desktop change | — | — |
| Durable regression coverage quality and relevance | 85% | IMP-10/11/14 cover the fixes | no durable case for a text log with a stray NUL (it would pin the current refusal) | after the decision |

- Overall round-2 confidence: 87% (simple average of the six applicable categories); categories below 90%: requirement proof, failure evidence, durable coverage.

### Round 2 Failures

- **F-4 — text files with a stray NUL byte are refused as binary** (BEH-001, AC-001 in real use; REQ-009, DEC-004, DEC-006). The detection's premise "text files contain no NUL byte" does not hold for real logs: 173 of the repository's 21,147 tracked `.log` files contain NUL bytes (167 Electron build logs; typically one NUL inside readable text, e.g. `[nuxt] kit:compatibility\x00: 0.388ms`). Before this ticket `read_file` returned them as text; the 8,000-byte window (round 1) already refused 79 of them, and the whole-file scan (DEC-006) refuses all 173. On the real server, the Daily Assistant asked to read such a build log got `The file '…/build.log' is a binary file and cannot be read as text…`; it recovered through `run_bash strings`, which an agent with only `read_file` cannot do. Expected (BEH-001): text reads unchanged. Observed: refused. Round 1 missed it (I accepted the 201 refused files without looking at them).

## Preliminary Classification (round 2; superseded)

- **F-4 — `Requirement Gap`** (owner: Solution Designer, user decision). The refusal rule is approved behaviour (REQ-009 with DEC-004/DEC-006); keeping text with stray NUL bytes readable while refusing PDFs and archives needs a different rule, for example refusing only when the bytes are not mostly text (a NUL count or ratio, or invalid UTF-8 beyond a threshold), or known binary signatures (`%PDF-`, `PK\x03\x04`, gzip) plus a NUL ratio, or accepting the limit. Each changes approved behaviour or its documented limit.
- F-1, F-2, F-3: resolved.

## Round 2 Result (superseded by § Round 3)

- Result: `Fail` (round 2)
- Criteria not proven, or parts only the user can check: AC-001 in real use (F-4); AC-005's durable live test in AI Studio mode (the user: the Google project's quota or a working key).
- Preliminary classification and recommended owner: F-4 `Requirement Gap` (Solution Designer, user decision).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review of an execution failure).
- Notes: F-1, F-2 and F-3 are resolved; the OpenAI `strict: false` change works on all 8 models tried and keeps needed optional arguments (`cwd`, line ranges).

## Round 3 — IR-003 (SR-006, DEC-007: binary = a NUL byte and not valid UTF-8; DEC-008)

- Trigger: IR-003 (`063ddf845e`; HEAD `9438dfddd1`), answering CR-004 (F-4).
- Plan: investigation § Round 3. Environments as before, at `9438dfddd1`. The `read_file` description and schema are unchanged in this round.

### Round 3 Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01c | AC-001, AC-009 | repository checks | Reused: IMP-15 | (IMP) | Pass | (IMP) | (IMP) | code unchanged since |
| API-12 (round 3) | BEH-001, BEH-011 | the repository's tracked files with a NUL | temporary probe (`API-round3-read-file-probe.test.ts.txt`): the real `read_file` on each of the 296 tracked non-media files that contain a NUL | ENV-1 | Pass | `API-round3-read-file-receipt.json` (`trackedNul`) | `trackedNul 296 {"refused (binary)":103,"text":193}`; text: `.log` 172, `.z` 20, `.paths` 1; refused: `.gz` 88, `.db` 4, `.db-journal` 3, `.bin` 3, `.jar`, `.sqlite`, `.pdf`, `.tgz`, and 1 `.log` | the 20 `.z` files are `git status -z` outputs (NUL-separated file names: text); the one refused log (`delivery-round9-electron-launch-smoke.log`) contains raw SQLite pages (invalid UTF-8 at byte 40,110) |
| API-15 | BEH-011 | binaries and text encodings | same probe: generated files and 84 copies of OS binaries (`/usr/lib` dylibs, binary plists, fonts, `Assets.car`, `/bin` executables) | ENV-1 | Pass | `API-round3-read-file-receipt.json` (`generated`, `osBinaries`) | `osBinaries 84 {"refused (binary)":84}`; refused: `a.txt.gz`, `bin.plist`, `empty.db`, `filled.db`, `stored.zip`, `text.tar` (macOS tar), `utf16-bom.txt`, `utf16le-nobom.txt` (non-ASCII); text: `utf8.txt`, `utf8-bom.txt`, `latin1.txt` (`caf�`, as before the ticket), **`ustar-text.tar`** (`1: a.txt\0\0…`), **`zeros.bin`** | residuals: an uncompressed POSIX tar of ASCII files and an all-zero file are valid UTF-8 and read as text (their content is the archived text, or nothing); UTF-16 with BOM is refused (before the ticket: garbled text) |
| API-05 (round 3) | AC-009 | 400 OS PDFs | same probe | ENV-1 | Pass | `API-round3-read-file-receipt.json` (`osPdfs`) | `osPdfs 400 {"refused (binary)":398,"text":2}`; not refused: `ScriptSucceeded.pdf`, `ScriptFailed.pdf`, both `nul 0` | the stated residual (no NUL) |
| API-16 | AC-001, AC-002, BEH-011 (F-4) | server journey, `gpt-5.4-mini` | temporary probe (`API-16-round3-journey-probe.e2e.test.ts.txt`): a plain agent with only `read_file` and the Daily Assistant each read an Electron build log with a stray NUL; the plain agent reads a PDF and the green image | ENV-2 | Pass | `API-16-round3-journey.log`, `API-16-round3-receipt.json` | plain agent: `{"path":"/tmp/ab328/fixtures/build.log"}` → `SUCCEEDED` `1: # Electron macOS ARM64 personal build on v1.4.19 base …`, answer `The build was intentionally aborted by delivery because origin/personal advanced during the build, ending with exit status 130.`; journal `cat -n /tmp/ab328/fixtures/build.log → ok`; Daily Assistant: `SUCCEEDED` (it chose `start_line 1, end_line 400`), same answer; PDF `FAILED` `… is a binary file and cannot be read as text …`, the agent says it cannot read it; image `SUCCEEDED`, `green` | F-4 resolved in real use |

### Round 3 Prior-Failure Resolution

| Failure | Round 3 Result | Proven By |
| --- | --- | --- |
| F-4 text logs with a stray NUL refused | Resolved: 172 of 173 read (the 173rd holds raw database bytes); an agent with only `read_file` reads a build log | API-12 round 3, API-16 |
| F-1, F-2, F-3 | still resolved (code unchanged for F-1; F-2's 398/400 rechecked; F-3 wording unchanged) | round 2, API-05 round 3 |

### Round 3 Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-01c (IMP-15: 201,744 identical comparisons), API-12 round 3, API-16 | Proven |
| AC-002 | Yes | round 2 API-13 (8 OpenAI models, Gemini, Grok, neutral names), API-16 | Proven |
| AC-003 | Yes | round 2 API-13, round 1 API-10 | Proven |
| AC-004 | Yes | round 2 API-14 | Proven |
| AC-005 | Yes | round 1 API-02, API-04 (accepted by DEC-008) | Proven |
| AC-006 | Yes | round 1 API-06 R1 | Proven |
| AC-007 | Yes | round 1 API-07, round 2 API-13, API-16 | Proven |
| AC-008 | Yes | round 2 API-13, API-16 | Proven |
| AC-009 | Yes | API-05 round 3, API-15, API-01c | Proven |
| AC-010 | Yes | round 2 API-13, IMP-10, IMP-14 | Proven |

### Round 3 Validation Confidence Scorecard

| Confidence Category | Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | all ACs proven across rounds 1-3 on real files and real models | — | — |
| Changed-boundary execution directness | 96% | the real `read_file` on 793 real or generated files; the real server with real providers | — | — |
| Cross-boundary integration realism and mock gap | 95% | OpenAI ×8, Gemini, Grok, LM Studio Qwen | Anthropic and Kimi accounts unavailable; the media mechanism to providers is unchanged by this ticket | — |
| Environment, configuration, identity, and fixture fidelity | 95% | clean env, test vault, neutral names, real logs, PDFs and OS binaries | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | refusals with the right messages; agents report honestly; encodings and binaries probed | residuals: an uncompressed ASCII tar and an all-zero file read as text; 2 of 400 PDFs without NUL read as text; UTF-16 with BOM refused | — |
| User-surface, browser, and desktop-shell confidence | N/A | no web or desktop change | — | — |
| Durable regression coverage quality and relevance | 95% | IMP-10 (strict unit), IMP-11 (media message), IMP-14 (gated live), IMP-15 (build log, stray NUL, UTF-16) | no durable case pins the tar/all-zero residuals | — |

- Overall final confidence: 95.3% (simple average of the six applicable categories)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Broader validation decision: `Required`, executed (real server, real providers, real files).

### Open Point From The User (not a validation failure)

On 2026-10-30 the user said `read_file`'s schema "should be clearly said what kind of files are supported". The description today says: "Reads content from a specified file. … Image, audio and video files (by extension) are attached for the model to see in the next turn instead of being returned as text; line ranges do not apply to them, a kind the current model cannot take is refused, and other binary files are refused." It is not in SR-006; whether this ticket adds an explicit supported / not-supported list is the Solution Designer's and the user's decision.

## Latest Authoritative Result

- Result: `Pass` (round 3)
- Criteria not proven, or parts only the user can check: `None`
- Residual risks: an uncompressed POSIX tar of ASCII files and an all-zero file read as text; 2 of 400 macOS PDFs (no NUL byte) read as text; UTF-16 with BOM refused; Anthropic and Kimi untested (accounts); the user's open point on the schema wording (above).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (Pass, direct route, Medium / Low; test-code review `Not Required — direct low-risk route`, no durable test code changed by API/E2E).
