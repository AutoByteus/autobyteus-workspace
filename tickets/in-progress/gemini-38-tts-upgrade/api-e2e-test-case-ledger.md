# API/E2E Test-Case Ledger — Gemini 3.8 TTS

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade`
- Investigation: `api-e2e-coverage-investigation.md` in this directory.
- Execution report: `api-e2e-execution-coverage-report.md` (pending); revision record: `api-e2e-revision-record.md` (pending).
- Scope: multi-case repository, browser, importer and live-provider validation; checkpoint immediately after each case.

| Case | Journey | REQ / AC | Planned surface and order |
| --- | --- | --- | --- |
| API-01 | Focused catalog, startup migration, speech adapter, SDK wire, Settings component | 001–004,007 / 001–005,009 | Vitest/build; 1 |
| API-02 | GraphQL settings/catalog, media tool output, non-TTS Gemini regression | 001–004,007 / 001–006,009 | server E2E and unit; 2 |
| API-03 | Rendered Settings default/selection with backend | 001–003 / 001–003 | browser; 3 |
| API-04 | Importer safety and isolated test-vault provisioning | 005–006 / 007–008 | metadata, dry-run, TTY; 4 |
| API-05 | Existing Gemini LLM real request | 007 / 009 | scoped live runner; 5 |
| API-06 | Gemini 3.8 speech real request | 004–005 / 004,007 | scoped live runner; 6 |
| API-07 | Failure/edge regression, lock/catalog assessment and cleanup | 003–004,007–008 / 003–006,009–010 | test/build/source; 7 |

## Execution events
| Seq | Case | Time | Event | Expected | Observed | Result | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-01 | 2026-09-24 | Started | Focused deterministic checks/build pass | Running | N/A | Narrow tests, then build |
| 2 | API-01 | 2026-09-24 | Completed | Focused checks/build pass | `autobyteus-ts` 58/58; server unit 79/79; server build/bootstrap pass; web component 4/4 | Pass | Commands/results in investigation; next API-02 |
| 3 | API-02 | 2026-09-24 | Started | GraphQL/media E2E and image/video regressions pass | Running | N/A | Focused E2E |
| 4 | API-02 | 2026-09-24 | Completed | GraphQL/media E2E and image/video regressions pass | Server E2E 17/17; Gemini image/video unit 17/17 | Pass | Mocked media factory in server E2E does not prove real 3.8/provider. Next API-03. |
| 5 | API-03 | 2026-09-24 | Started | Browser renders current Settings catalog/default with real backend | Running | N/A | Start owned isolated server and Nuxt dev proxy |
| 6 | API-03 | 2026-09-24 | Completed | Default Flash, Lite choice, no retired choices, saved Lite persists reload | Chrome AX: Settings → Speech generation `Gemini / gemini-3.8-flash-tts`; popup lists only 3.8 Flash/Lite and OpenAI; Lite selected, “Default media models saved”, reload shows Lite | Pass | Backend `127.0.0.1:55973`, web `127.0.0.1:3048`; both stopped, owned fixture deleted. Browser proves web-equivalent renderer only. |
| 7 | API-04 | 2026-09-24 | Started | Value-safe preflight/dry-run and TTY import to isolated test DB | Running | N/A | No owner-private file content read directly |
| 8 | API-04 | 2026-09-24 | Completed | Explicit safe import configures isolated Google Vertex Express slot, source unchanged | Dry-run READY/CREATE 9, direct TTY `IMPORT` configured 9 in `db/test.db`; post-preflight READY and Vertex Express configured; AI Studio missing. Source metadata mode/owner/size/mtime unchanged. | Pass | No credential bytes emitted. Vault/key retained only for API-05/06; remove after. |
| 9 | API-05 | 2026-09-24 | Started | Existing `gemini-3.8-flash` LLM returns nonempty real output | Running | N/A | Scoped `gemini.vertex-express.llm` live runner |
| 10 | API-05 | 2026-09-24 | Completed | Real LLM request reaches provider | Preflight READY, then live harness `activateGeminiMode` fails `TEST_GRAPHQL_REQUEST_FAILED` before provider call; harness selects nonexistent top-level GraphQL fields rather than `useGeminiMode.setup` | Fail | API/E2E-owned test-harness Local Fix; update investigation then query. Provider outcome still untested. |
| 11 | API-05 | 2026-09-24 | Started | Fixed mode query reaches provider and nonempty LLM output | Running | N/A | Rerun same scoped live scenario after harness correction. |
| 12 | API-05 | 2026-09-24 | Completed | Real `gemini-3.8-flash` LLM responds nonempty | Scoped runner 2/2 (preflight + execution), execution 2003 ms; assertion `response.content.trim().length > 0` passed after actual Vertex Express mode activation. | Pass | Initial harness-only failure resolved; no response/credential bytes recorded. Next API-06. |
| 13 | API-06 | 2026-09-24 | Started | Real `gemini-3.8-flash-tts` returns adapter-validated audio | Running | N/A | Scoped Vertex Express audio live runner |
| 14 | API-06 | 2026-09-24 | Completed | Real audio output | Preflight READY; provider operation fails (generic value-safe `LIVE_E2E_PROVIDER_OPERATION_FAILED`) at generateSpeech before audio assertion | Fail | Temporary fixed-code diagnostic to distinguish provider access vs output validation; no raw error output. |
| 15 | API-06 | 2026-09-24 | Started | Diagnostic rerun classifies failure without exposing values | Running | N/A | Temporary message-category probe in live test catch. |
| 16 | API-06 | 2026-09-24 | Completed | Classify real failure safely | Repeat preflight READY; fixed-category probe reports HTTP 404, provider-or-SDK stage, model-unavailable wording, no metadata/voice-config complaint. No audio returned; temporary diagnostic reverted. | Fail | Likely Vertex Express model availability/entitlement, not yet proven implementation defect. Code Reviewer failure-origin review required; AI Studio slot absent. |
| 17 | API-07 | 2026-09-24 | Started | Importer safety, GraphQL Gemini mode, SDK lock, old-ID absence, cleanup | Running | N/A | Run focused suites and remove owned vault/runtime after. |
| 18 | API-07 | 2026-09-24 | Completed | Safety/contract checks pass and owned data removed | Importer/GraphQL lifecycle 38/38; npm registry/installed/root+nested lock all `@google/genai` 2.24.0; retired IDs occur only in startup migration among production source; `git diff --check` pass. Owned live vault/key/runtime and browser fixture removed; source metadata unchanged. | Pass | AC-010 official-source assessment carried from SR-006; no LLM catalog change. |

## Re-entry/reconciliation
- Last event: API-07 Completed Pass; next: reconcile report and route API-06 failure.
- Completed: API-01–05 and API-07 (API-05 initial harness failure fixed and rerun passed); API-06 failed with HTTP 404. Running: none. Not started: none.
- Reconciled into `api-e2e-execution-coverage-report.md`: Yes, API-REV-001. API-06 remains Fail; no open in-flight case.

## Round 2 planned continuation (`SR-008`)
- Preserve round-1 events; repeat prior-failed API-06 on newly provisioned AI Studio route after safe API-04 import. Exact same AC-007, no acceptance-bar change.
- API-04: explicit new-target preflight/dry-run, direct TTY import, post-preflight and cleanup.
- API-06: `gemini.ai-studio.audio` live provider request with exact 3.8 Flash TTS; no raw error or secret output.
- API-05 (conditional): AI Studio real LLM control only if failure classification requires it; prior Vertex LLM Pass remains valid.
- API-07: focused fixture/contract check, value-safe evidence and cleanup.
- Round 2 not started at this checkpoint; next action update durable live scenario after the investigation decision above.

## Round 2 execution events
| Seq | Case | Time | Event | Expected | Observed | Result | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 19 | API-04 | 2026-09-24 | Started | New isolated vault and AI Studio source alias import safely | Running | N/A | Metadata-only source check, preflight, importer dry-run and TTY. |
| 20 | API-04 | 2026-09-24 | Checkpoint | Preflight server starts | `TEST_SERVER_START_FAILED` before vault preflight; prior-round cleanup removed untracked shared build outputs needed by built server. | N/A | Rebuild documented server/shared packages, then retry preflight; no provider/import attempt yet. |
| 21 | API-04 | 2026-09-24 | Completed | New AI Studio slot safely configured in isolated vault | Rebuild/bootstrap pass; preflight initially missing AI Studio; explicit dry-run READY/CREATE 10 incl. AI Studio; direct TTY `IMPORT` configured 10; post-preflight READY with AI Studio configured. Source mode/owner/size/mtime unchanged. | Pass | Target `autobyteus-server-ts/db/test.db`; vault/key retained only through API-06 then cleanup. |
| 22 | API-06 | 2026-09-24 | Started | Real AI Studio exact 3.8 Flash TTS returns validated nonempty WAV | Running | N/A | Scoped `gemini.ai-studio.audio` live runner; prior Vertex 404 remains historical. |
| 23 | API-06 | 2026-09-24 | Completed | Real AI Studio 3.8 audio returns | Preflight READY/configured, but `generateSpeech` failed in 189 ms with value-safe `LIVE_E2E_PROVIDER_OPERATION_FAILED`; no file/audio assertion reached. | Fail | Run AI Studio LLM control and fixed-category diagnostic; do not infer key validity from vault configuration. |
| 24 | API-05 | 2026-09-24 | Started | AI Studio LLM control establishes credential/route validity | Running | N/A | Scoped existing `gemini.ai-studio.llm` scenario. |
| 25 | API-05 | 2026-09-24 | Completed | AI Studio LLM control returns nonempty text | Preflight READY/configured but provider operation fails with generic value-safe error; no LLM output. Prior Vertex Express LLM Pass remains historical. | Fail | Need category-only diagnostic to distinguish auth/access from model/request error; no raw provider text. |
| 26 | API-05 | 2026-09-24 | Started | Classify AI Studio LLM rejection without credential/raw provider text | Running | N/A | Temporary fixed-category diagnostic, then revert. |
| 27 | API-05 | 2026-09-24 | Completed | Classify LLM rejection | HTTP 429 with quota wording, no auth/model-unavailable wording; no successful AI Studio LLM response. | Fail | Suggests quota/rate-limit condition, not proof of working generation. Next classify audio. |
| 28 | API-06 | 2026-09-24 | Started | Classify AI Studio TTS rejection without raw provider text | Running | N/A | Same temporary fixed-category diagnostic. |
| 29 | API-06 | 2026-09-24 | Completed | Classify audio rejection | HTTP 429 with quota wording, no auth/model-unavailable wording; no WAV or audio URL. Temporary diagnostic removed. | Fail | AI Studio live speech remains unproven; likely quota/rate-limit prerequisite, not a validated usable key. |
| 30 | API-07 | 2026-09-24 | Started | Verify changed live fixture/test, safe evidence and cleanup | Running | N/A | Focused preflight/runner evidence, server typecheck, diff and owned-resource cleanup. |
| 31 | API-07 | 2026-09-24 | Completed | Durable fixture and cleanup verified | New AI Studio audio scenario preflight 1/1; both real AI Studio attempts reached provider and failed 429; `git diff --check` pass; source metadata unchanged; owned vault/key/runtime and generated shared build outputs removed. `pnpm -C autobyteus-server-ts typecheck` blocked by existing tsconfig rootDir/include conflict (752 TS6059 errors across tests), not a specific changed-file error. | Pass with known unrelated typecheck limitation | Retain focused Vitest execution as changed-test evidence; no successful audio. |

Round 2 reconciliation: API-04 Pass; API-05 AI Studio control Fail (429), while round-1 Vertex LLM Pass remains historical; API-06 AI Studio TTS Fail (429); API-07 Pass with unrelated typecheck limitation. No running/unstarted case. Reconciled into `api-e2e-execution-coverage-report.md` API-REV-002.

## Round 3 execution events — user-reported balance top-up
| Seq | Case | Time | Event | Expected | Observed | Result | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 32 | API-04 | 2026-09-24 | Started | Fresh isolated AI Studio test vault after user balance top-up | Running | N/A | Rebuild documented server, preflight, explicit dry-run/TTY import; no owner-private content read directly. |
| 33 | API-04 | 2026-09-24 | Completed | Explicit isolated import establishes AI Studio test credential | Server build pass; preflight missing before import; dry-run READY/CREATE 10; direct TTY `IMPORT` configured 10; post-preflight READY with AI Studio slot configured. Source metadata unchanged. | Pass | Test vault/key retained only for scoped live call, then cleanup. |
| 34 | API-06 | 2026-09-24 | Started | Real AI Studio `gemini-3.8-flash-tts` returns nonempty valid WAV after top-up | Running | N/A | Scoped existing live runner, no fallback. |
| 35 | API-06 | 2026-09-24 | Completed | Real TTS audio after top-up | Preflight READY/configured; generation failed in 183 ms with value-safe generic provider-operation code; no WAV output. | Fail | One fixed-category diagnostic retry needed to classify whether prior 429 persists; no raw provider text. |
| 36 | API-06 | 2026-09-24 | Started | Classify post-top-up rejection safely | Running | N/A | Temporary fixed-category diagnostic then revert. |
| 37 | API-06 | 2026-09-24 | Completed | Determine whether quota rejection persists | Provider returned HTTP 429 with quota wording again; no auth/model wording and no audio. Temporary diagnostic reverted. | Fail | Balance top-up did not yield a successful provider call at this time. Do not claim key works for generation. |
| 38 | API-07 | 2026-09-24 | Started | Reconcile value-safe evidence and clean owned state | Running | N/A | No changed test/source since round 2; verify diff and cleanup. |
| 39 | API-07 | 2026-09-24 | Completed | Owned state cleaned, no secret/source mutation | `git diff --check` pass; isolated vault/key/runtime and generated shared build outputs removed; owner source metadata unchanged. | Pass | No further provider retries without changed external state; no audio success. |

Round 3 reconciliation: API-04 Pass; API-06 Fail (HTTP 429/quota after user-reported balance top-up); API-07 Pass. API-05 was not rerun because API-06's repeat 429 was already quota-category and round-2 AI Studio LLM also returned 429. No running/unstarted case. To be indexed as API-REV-003.

## Round 4 planned continuation (`SR-009`, 2026-09-26)
- Preserve all prior events and results. API-04: explicit owner-private source / isolated target preflight, dry-run, TTY-confirmed import. API-06: **one** actual `gemini.vertex-express.audio` call for exact 3.8 Flash TTS, with category-only diagnostic in that call; no retry or AI Studio call. API-07: revert diagnostic, clean only owned vault/runtime/build outputs, reconcile evidence. Broader validation Required; prior result Fail / 82.1%.

## Round 4 execution events
| Seq | Case | Time | Event | Expected | Observed | Result | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 40 | API-04 | 2026-09-26 | Started | Fresh isolated Vertex Express vault via value-safe explicit importer | Running | N/A | Source metadata only, server build, preflight, dry-run and direct TTY import. |
| 41 | API-04 | 2026-09-26 | Completed | Vertex Express configured in isolated vault without secret disclosure | Server/shared build pass; initial preflight READY/missing; explicit dry-run READY/CREATE 10; direct TTY `IMPORT` configured 10; post-preflight READY/configured Vertex slot. | Pass | Source metadata only; vault/key retained for single audio call, then cleanup. |
| 42 | API-06 | 2026-09-26 | Started | One real Vertex Express exact 3.8 Flash TTS call yields nonempty valid WAV or fixed-category failure | Running | N/A | Temporary category-only catch; no AI Studio call or retry. |
| 43 | API-06 | 2026-09-26 | Completed | Real audio yields nonempty valid WAV | Preflight READY/configured; one real call failed at provider operation. Fixed category: HTTP 404, model-unavailable wording, auth=false, quota=false. Runner 1 passed / 1 failed; no audio assertion reached. | Fail | Historical Vertex 404 repeated today; no AI Studio call, no retry, no raw provider response or secret printed. |
| 44 | API-07 | 2026-09-26 | Started | Revert temporary category catch, clean owned vault/runtime/build outputs, verify source unchanged | Running | N/A | No further provider calls. |
| 45 | API-07 | 2026-09-26 | Completed | Temporary diagnostic removed; only owned data cleaned | Isolated `db/test.db`, adjacent key, live runtime and generated shared `dist` absent; owner source metadata unchanged (`0600`, size 3459, mtime 1790249189); `git diff --check` pass. | Pass | No further provider call; report Fail and wait as user directed. |

Round 4 reconciliation: API-04 Pass; API-06 Fail (one real Vertex Express HTTP 404/model-unavailable, no audio); API-07 Pass. No AI Studio or LLM rerun. No running or unstarted selected case; reconcile into API-REV-004.

## Round 5 planned continuation (`SR-011`, 2026-10-01)
- Renewed user direction permits **one** current Vertex Express call despite `SR-010` hold. Reuse API-04 isolated importer/preflight; API-06 one exact `gemini.vertex-express.audio` request with fixed-category diagnostic already in its only call; API-07 revert/cleanup/reconcile. No AI Studio, fallback or repeated provider call. Prior API-REV-004 Fail / 82.1%; CRR-005 origin Unclear.

## Round 5 execution events
| Seq | Case | Time | Event | Expected | Observed | Result | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 46 | API-04 | 2026-10-01 | Started | Fresh isolated Vertex Express vault with value-safe explicit import | Running | N/A | Source metadata only; documented build/preflight; dry-run and direct-TTY import. |
| 47 | API-04 | 2026-10-01 | Completed | Vertex Express configured safely in isolated vault | Server/shared build pass; preflight READY/missing before import; explicit dry-run READY/CREATE 10; direct TTY `IMPORT` configured 10; post-preflight READY/configured Vertex slot. | Pass | Test vault/key retained only for one audio call; no source-value inspection. |
| 48 | API-06 | 2026-10-01 | Started | One exact 3.8 Flash Vertex Express call yields nonempty valid WAV or fixed-category rejection | Running | N/A | Temporary fixed-category catch; no AI Studio or diagnostic retry. |
| 49 | API-06 | 2026-10-01 | Completed | Real exact-model audio request yields nonempty WAV | Preflight READY/configured; scoped runner 2/2 passed, including real `gemini.vertex-express.audio` execution. The live test asserted audio URL, on-disk file >44 bytes, RIFF/WAVE header; production adapter validates PCM WAV structure. | Pass | Historical Vertex 404 resolved for this key/route at test time. No AI Studio, fallback or repeat call. |
| 50 | API-07 | 2026-10-01 | Started | Revert temporary diagnostic; clean owned vault/runtime/build outputs; reconcile evidence | Running | N/A | No further provider call. |
| 51 | API-07 | 2026-10-01 | Completed | Temporary probe reverted; only owned resources cleaned | Diagnostic absent from final diff; isolated `db/test.db`, adjacent key, live runtime and generated shared `dist` absent; source metadata unchanged (`0600`, size 3679, mtime 1790849262); `git diff --check` pass. | Pass | Provider success recorded; no further call. |

Round 5 reconciliation: API-04 Pass; API-06 Pass (one real exact 3.8 Flash TTS request, nonempty RIFF/WAVE output); API-07 Pass. No AI Studio/LLM/browser rerun. All selected cases terminal; reconcile into API-REV-005.

## Round 6 planned Local Fix (`CRR-006 / TR-001`, 2026-10-01)
- Correct the shared live-audio assertion without changing provider/production code. API-08: nonempty bytes for all audio routes, WAV-only checks for Gemini, synthetic OpenAI/Gemini positive/negative branch tests. API-07: focused non-paid audio factory/client/live-harness regression, diff and resource-state check, report reconciliation. Preserve one-call API-REV-005 Vertex success; **no live provider call**.

## Round 6 execution events
| Seq | Case | Time | Event | Expected | Observed | Result | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 52 | API-08 | 2026-10-01 | Started | TR-001 shared-format assertion corrected and tested without paid calls | Running | N/A | Add focused test-support helper and synthetic OpenAI/Gemini cases; run narrow Vitest. |
| 53 | API-08 | 2026-10-01 | Completed | Shared live assertion accepts OpenAI MP3, rejects empty files, enforces Gemini WAV | Pure helper added; shared live branch delegates to it; focused synthetic Vitest 3/3 pass (OpenAI nonempty MP3; both empty; Gemini WAV/MP3/header-only). Owned generated-file cleanup unchanged. | Pass | No provider call; next API-07 focused audio regression and reconciliation. |
| 54 | API-07 | 2026-10-01 | Started | Focused non-paid factory/client/live test regression and artifact reconciliation | Running | N/A | Run existing audio suites and relevant test import/compile; verify diff/resource state. |
| 55 | API-07 | 2026-10-01 | Checkpoint | Non-paid live test import/compile runs | Audio factory/OpenAI/Gemini unit 27/27 pass; first server live-harness+skipped-live-test run failed at module resolution before tests because prior cleanup removed generated `@autobyteus/application-sdk-contracts/dist`. | N/A | Rebuild documented server/shared packages, then rerun exact focused command; no provider attempt occurred. |
| 56 | API-07 | 2026-10-01 | Checkpoint | Rebuilt harness unit/live-test import succeeds | Build pass; rerun imported the live test (skipped without RUN_REAL_E2E) and passed 18 harness tests, but 1 unrelated facade test fails because harness `AgentRun` wrapper lacks required provider input normalizer. | N/A | API/E2E-owned stale fixture now documented in investigation; focus-fix with product normalizer and non-paid rerun. No provider call. |
| 57 | API-09 | 2026-10-01 | Started | Restore live harness facade unit validity under current AgentRun constructor | Running | N/A | Add no-op-path product normalizer to test-only wrapper; run focused non-paid suite. |
| 58 | API-09 | 2026-10-01 | Completed | Harness facade/normalizer contract valid under current AgentRun | Focused server Vitest 22/22 pass across audio assertion unit and live-harness unit; real provider test file transformed and skipped with `RUN_REAL_E2E` unset. | Pass | No provider call; next preflight both audio routes and cleanup. |
| 59 | API-07 | 2026-10-01 | Completed | Non-paid regression and cleanup complete | Audio factory/OpenAI/Gemini 27/27; server helper/harness 22/22; preflight `openai.audio,gemini.vertex-express.audio` 2/2 READY/missing (no import/provider). Initial module-resolution and stale-normalizer failures resolved by documented build and harness fixture repair. Owned preflight vault/key/runtime/shared outputs absent; `git diff --check` pass. | Pass | API-REV-005 real Vertex audio pass retained; reconcile API-REV-006 without another paid call. |

Round 6 reconciliation: API-08 Pass (TR-001 format correction), API-09 Pass (incidental harness facade fixture), API-07 Pass (focused non-paid suites/preflight/cleanup). No provider call or imported credential in this round; all selected cases terminal. To be indexed as API-REV-006.
