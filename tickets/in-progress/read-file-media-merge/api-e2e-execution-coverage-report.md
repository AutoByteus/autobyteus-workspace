# API/E2E Execution Coverage Report — read-file-media-merge (autobyteus-328)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct low-risk route)
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

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-005's durable live test in AI Studio mode (the user: the Google project's quota or a working key); the ACs as written are otherwise proven, and F-1 and F-2 are real-use failures of UC-002 and BEH-011.
- Preliminary classification and recommended owner: F-1 `Requirement Gap` and F-2 `Design Impact`/`Requirement Gap` (Solution Designer, user decision); F-3 `Local Fix` (implementation).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review of an execution failure).
- Notes: follow-up FU-005 added.
