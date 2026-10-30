# API/E2E Coverage Investigation — read-file-media-merge (autobyteus-328)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-004, approved)
- Investigation Notes: `investigation-notes.md`; `autobyteus-327/investigation-notes-327.md`, `autobyteus-327/requirements-doc-327.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec (required on every route): `design-spec.md` (SR-004)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001 moved in as REQ-009; FU-002..FU-004); `evidence/` (IMP-01..IMP-09)
- Design Review Report: `N/A — not applicable` (Medium / Low, direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (after the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 from `/software_engineering_team/implementation_engineer`, 2026-10-29 (direct low-risk route)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file, round 1

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge/tickets/in-progress/read-file-media-merge/`. Code: branch `codex/read-file-media-merge`, HEAD `3a336f7a4a` (last code commit `16b3e2452d`; after it only ticket documents), base `origin/personal` `e82d03b0f9`.

## Current Requirement And Design Basis

`read_file` (native AutoByteus runtime, `autobyteus-ts`) reads by kind after the shared path rule: an image, audio or video file (by extension) is returned as a `ContextFile` that the loop attaches to the next model turn, refused for line ranges, empty files and a kind the model marks `unsupported` (`unknown` loads); any other file with a NUL byte in its first 8,000 bytes is refused as binary; everything else reads as text exactly as before. `read_media_file` is removed; stored definitions that name it keep starting (unknown names skipped; `read_file` always present); the Work Journal renders a media `read_file` as the media marker and keeps rendering recorded `read_media_file` calls; the Daily Assistant template lists `read_file` only. No migration (DEC-001), no package change (DEC-002).

## Supported Scenarios And Real Usage

- Designer scenarios covered: UC-001 (a native agent reads a text file), UC-002 (a native agent reads an image, audio or video file), UC-003 (removal; stored and packaged names).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1: a user asks a native agent, through the app's server (GraphQL + agent WebSocket), to look at an image, listen to audio and watch a video on disk; the agent calls `read_file` with absolute paths and answers from the media (real provider).
  - SCN-A2: the same request on a model that takes images but not audio or video: the image is answered, audio and video are refused with the message, the run continues.
  - SCN-A3: the user asks the agent to read real documents: a PDF from the system print pipeline and from Chrome's "Save as PDF", a DOCX, a ZIP, and PDFs as they exist on a real machine.
  - SCN-A4: an agent whose stored definition still names only `read_media_file` (AC-006) and the built-in Daily Assistant (AC-008) run SCN-A1/A2.
  - SCN-A5: the user opens the run's Memory page (Work Journal) after these runs.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 text read | Preserved | IMP-03 (201,273 identical comparisons) | reuse |
| BEH-002 media read | Changed | IMP-01, IMP-07 (scripted model) | real provider journey (SCN-A1) |
| BEH-003 unsupported kind refused | Changed | unit/integration, IMP-07 | real model with image-only capabilities (SCN-A2) |
| BEH-004/005/006 arguments, paths, empty media | Changed | `read-file-media.test.ts` | reuse |
| BEH-007 removal | Removed | `git grep`; tests | grep recheck; Gemini m4a live test (AC-005) |
| BEH-008 stored names | Preserved | AC-006 resolver test | a real run of such a definition (SCN-A4) |
| BEH-009 Work Journal | Changed | `runtime-translations.test.ts` | rendered journal of real runs (SCN-A5) |
| BEH-010 Daily Assistant | Changed | bootstrapper test | a real Daily Assistant run (SCN-A4) |
| BEH-011 binary refused | Added | `read-file-binary.test.ts`, IMP-03 | real and generated documents (SCN-A3) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `read_file` dispatch, media branch, binary check | unit + integration (IMP-01..04) | real documents | temporary probe on real files |
| API / transport / contract | Yes | tool result `string \| ContextFile` through the server's stream | none through the server | serialization of a `ContextFile` result over the agent stream and into memory | server E2E journey |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | no web change | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | stored `toolNames` untouched | AC-006 resolver test | a real run of such a definition | journey (SCN-A4) |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | media reaching real providers (Gemini, OpenAI) | scripted model (IMP-07); Gemini live test skipped (IMP-08) | provider handling of the attachments | live journey; Gemini m4a live test |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge`
- Project type: pnpm workspace; `autobyteus-ts` (native runtime and tools), `autobyteus-server-ts` (Fastify/GraphQL/WebSocket); Node 22.23.1, pnpm 10.28.2; macOS 26.5 arm64.
- Testing guideline: `/TESTING.md` (worktree copy). No closer `TESTING*.md`.
- Conflicting or unclear instructions: none.
- Required secrets: test vault `~/.autobyteus-test/vault` (`pnpm test-vault status`: OpenAI, Anthropic, DeepSeek, Grok, Kimi, GLM, Google AI Studio, Google Vertex Express configured; values never read). The AI Studio key's project has a quota of 0 requests per minute in `europe-west1` (see Not Tested).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/TESTING.md` | testing guideline | clean env for E2E and live tests; test vault via `AUTOBYTEUS_TEST_VAULT` plus the test's gate; a missing key or provider refusal is a skip, never a pass; `AUTOBYTEUS_LIVE_STRICT=1` turns it into a failure; real-provider runs only when the change needs real-provider proof (it does: media reaching providers); local models one at a time; Rule 9 |
| `autobyteus-ts/tests/integration/agent/gemini-read-file-m4a-live.test.ts` | AC-005 live test | gates `RUN_LIVE_PROVIDER_TESTS=1`, `AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1`; AI Studio mode; model `gemini-3.1-pro-preview` |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | pattern for a live server journey | in-process studio server, `initializeLiveServerVault`, `createAgentDefinition`, `createAgentRun` (`runtimeKind: "autobyteus"`), `/ws/agent/<runId>`, `sendE2eSendMessageCommand` |
| `autobyteus-server-ts/src/llm-management/services/gemini-configuration-service.ts` | Gemini mode on the server | `GEMINI_SETUP_MODE=VERTEX_EXPRESS` selects the Vertex Express key |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | Memory page query | `getAgentRunMemoryView(runId, workJournal: {})` returns the rendered Work Journal lines |
| `autobyteus-ts/src/llm/supported-model-static-metadata.ts` | model media capabilities | three sets: image only; image, audio and video; none |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| in-process studio server (journey) | `autobyteus-server-ts` | a temporary gated vitest file under `tests/e2e/runtime/` | test-owned data root; test vault read-only | GraphQL answers | `app.close()`; temp folders removed; the temporary test file deleted |
| Gemini via Vertex Express | — | `GEMINI_SETUP_MODE=VERTEX_EXPRESS` in the data root's `.env` | small inputs | — | — |
| OpenAI | — | test vault | small inputs | — | — |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| media files | synthesized with `ffmpeg` (solid red PNG, solid blue MP4); `autobyteus-ts/tests/data/test_audio.m4a` (spoken "hello") | test-owned temp workspace | removed |
| documents | generated: `cupsfilter` PDF, Chrome `--print-to-pdf` PDF, `textutil` DOCX, `zip`; copies of OS-shipped PDFs (read-only source, copied into a temp folder) | no user data | removed |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected` (DEC-001). A definition naming only `read_media_file` is created through GraphQL and run (SCN-A4); its stored `toolNames` stay as created.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` `read-file*.test.ts` (unit, integration, media, binary) | text unchanged; media; binary refusal | AC-001..004, AC-009 | Still Valid | IMP-01..03 | reuse |
| `read-file-media-continuation-flow.test.ts`, `read-file-media-native-agent-flow.test.ts` | loop attaches the context file (scripted model) | AC-002, AC-003, AC-009 | Still Valid | IMP-07 | reuse |
| `gemini-read-file-m4a-live.test.ts` | m4a to real Gemini through `read_file` | AC-005 | Still Valid | IMP-08 (skipped) | run gated |
| server `autobyteus-agent-tool-resolver.test.ts` AC-006 case | stale name resolves with a warning | AC-006 | Still Valid | IMP-07 | reuse; plus a real run |
| server `runtime-translations.test.ts` | Work Journal rendering | AC-007 | Still Valid | IMP-05 | reuse; plus real runs |
| server `built-in-agent-bootstrapper.test.ts` | template | AC-008 | Still Valid | IMP-05 | reuse; plus a real run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..004, AC-006 (resolver), AC-007, AC-008 (template), AC-009 (synthesized) | `autobyteus-ts` and server repository checks | Reused | IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07 | code unchanged since they ran (`git diff --name-only 16b3e2452d HEAD` lists only ticket documents); each log has its header and result line |
| API-02 | AC-005 (removal) | repository content | Temporary Probe | `git grep -n read_media_file` in `autobyteus-ts` and `autobyteus-server-ts` (src, tests) | read-only check |
| API-03 | AC-005 (live, as written) | real Gemini, AI Studio | Existing Test | `env -i … AUTOBYTEUS_TEST_VAULT=… RUN_LIVE_PROVIDER_TESTS=1 AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1 AUTOBYTEUS_LIVE_STRICT=1 pnpm -C autobyteus-ts exec vitest run tests/integration/agent/gemini-read-file-m4a-live.test.ts` | strict, so a refusal shows its real cause |
| API-04 | AC-005 (live flow) | real Gemini, Vertex Express | Temporary Probe | a temporary copy of the m4a live test with `{ kind: 'vertexExpress' }`, same gates; deleted after | the endpoint and key are not the behavior under test; not durable because the durable test already exists and its mode is a credential choice |
| API-05 | AC-009, BEH-011 (real documents) | `read_file` on real and generated documents | Temporary Probe | a temporary `autobyteus-ts` vitest file calling the registered `read_file` on copies of: the `cupsfilter` PDF, the Chrome PDF, a DOCX, a ZIP, an RTF, and two OS-shipped PDFs whose first NUL is after byte 8,000 | the heuristic's real-world reach; temporary (machine-specific inputs) |
| API-06 | AC-002, AC-003, AC-006, AC-008, AC-009, BEH-011 | server journey on real providers | Temporary Probe | a temporary gated server E2E (in-process studio server, test vault, `GEMINI_SETUP_MODE=VERTEX_EXPRESS`): run R1 Gemini (all kinds supported) on a definition naming only `read_media_file`: read PNG, M4A, MP4, then the PDF, DOCX, ZIP; run R2 OpenAI (image only) as the built-in Daily Assistant: read PNG, M4A, MP4; assert tool results and the answers (red / hello / blue), refusals with their messages | the real server and provider boundary; temporary because it spends credits and depends on provider answers |
| API-07 | AC-007 | Work Journal of the API-06 runs | Temporary Probe | in API-06: `getAgentRunMemoryView(runId, workJournal: {})` lines | the Memory page's view of real runs |
| API-08 | AC-002 (real use) | an image read per model and agent | Temporary Probe | added after API-06 run 1: matrix in the journey probe (OpenAI, Anthropic, Gemini × Daily Assistant / plain) | measure how often models send line arguments on media |
| API-09 | AC-002 (real use) | text and image reads on more models | Temporary Probe | added: `gpt-5.4-mini` text; `gpt-5.5`, Grok, Kimi image | generality of F-1 |
| API-10 | AC-003 | capability refusal on a real model | Temporary Probe | added: Grok (image only) reads M4A and MP4 | the OpenAI calls never reached the capability check |

- Test progress log needed: `Yes`.

## Durable Coverage To Add

None planned (see Planned Cases for why each probe is temporary).

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup: none outside vitest; the journey's server is in-process with a test-owned data root.
- Environment: `env -i PATH HOME=<resolved temp> TMPDIR` plus `AUTOBYTEUS_TEST_VAULT` and the gates; `AUTOBYTEUS_LIVE_STRICT=1`.
- Evidence: logs with headers; the journey writes a JSON receipt (tool results, answers, Work Journal lines) into the evidence folder.
- Cleanup: temporary test files deleted, temp data roots and workspaces removed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-005's durable live test in AI Studio mode | the AI Studio key's project returns HTTP 429 `RESOURCE_EXHAUSTED` with `quota_limit_value: "0"` for `GenerateContentRequestsPerMinutePerProjectPerRegion` in `europe-west1` (two probes a minute apart), which the live-test helper reports as `invalid_or_missing_credentials` | Low if API-04 passes (same flow, other Gemini endpoint) | Yes (the Google project's quota or a new AI Studio key) | ask the user via the result |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-2: real PDFs whose first NUL byte is after byte 8,000 (79 of 400 OS-shipped PDFs sampled) are read as text, while BEH-011 says a PDF is refused | `Design Impact` / `Requirement Gap` | API-05, API-06 R1 turn 2 | Solution Designer |
| F-1: OpenAI GPT-5 models send `start_line`/`end_line` on every `read_file` call; BEH-004 refuses them on media, so those agents cannot read media | `Requirement Gap` | API-06 R2, API-08, API-09 | Solution Designer (user decision) |
| F-3: `is a image file` wording | `Local Fix` | API-06 R2 | Implementation Engineer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`

## Round 1 addendum — API-11 (the user's request, 2026-10-30)

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-11 | AC-002 (real use), F-1 generality | image read on `gpt-5.6-terra`, `gpt-6-astra`, `gpt-6-luna`, `gpt-6-sol` (2 runs each) and on LM Studio `qwen/qwen3.6-35b-a3b` (2 runs); audio and video on the Qwen model (1 run) | Temporary Probe | the journey probe with API-11 cells (plain definition with `read_file`), same server setup; LM Studio at `localhost:1234`, nothing loaded before the run; the model the run loads is unloaded afterwards (TESTING.md: one local-model run at a time, unload what you loaded) | the user asked whether newer OpenAI models and the local default Qwen model also fill line arguments; LM Studio models' capabilities are `unknown`, so their media loads (DEC-003) |
