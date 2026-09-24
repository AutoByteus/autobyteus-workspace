# Implementation Handoff — Gemini 3.8 TTS upgrade

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected; ARCH-REV-002 Pass. Large/High implementation-owned Local Fix returns to `/code_reviewer` for source re-review.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/requirements-doc.md` (approved SR-004).
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/investigation-notes.md`.
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/solution-revision-record.md`.
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/design-spec.md` (SR-006).
- Supplemental task artifacts: N/A — none. User screenshot is investigation evidence, not a normative UI supplement.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/design-review-report.md`.
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/architecture-review-revision-record.md`.
- Triggering rework evidence: `code-review-report.md` and `code-review-revision-record.md` in this ticket directory (`CRR-001`, `CR-001` Local Fix). Reviewed revised solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/solution-handoff-sr006.md`.

## Current Implementation Summary

Current-only Gemini 3.8 Flash/Flash-Lite TTS is wired through the existing audio catalog and adapter. The saved retired-ID transition is isolated to shared `AppConfig.initialize()` and reuses the durable one-key writer. The shared Google SDK is 2.24.0 in both lockfiles. Gemini LLM/image/video production adapters and LLM catalog IDs remain unchanged. In IR-002 the WAV validator now enforces supported PCM `fmt` fields and frame-aligned nonempty data before reporting success, addressing the implementation-owned CR-001 finding. Focused installed-SDK and unit checks pass; no provider or secret-vault result is claimed.

- Implementation cycle: Rework (IR-002 Local Fix following initial IR-001).
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/implementation-revision-record.md`.
- Current implementation revision ID: IR-002.
- Related solution revision IDs: SR-004, SR-006.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: CRR-001 (Fail / Local Fix).
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Triggering finding IDs: CR-001.

## Routing Classification

- Task size: **Large**.
- Architecture risk: **High**.
- Design classification reference: `design-spec.md` “Task Size And Architectural Risk”.
- Classification confirmed: Yes. Shared major SDK cutover, provider wire/output change, private persisted-setting migration, and cross-modality blast radius remain material. No new architecture/requirements gap was found; CR-001 is an implementation-local audio validation fix.
- Selected route: **Code Review** per `get_handoff_rules` result, recipient `/code_reviewer`.
- Lightweight direct-route self-review: Not Applicable; independent source review selected.
- New design impact or escalation trigger: None.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved change / preserved outcome | Implemented production path / key files | Result / notes |
| --- | --- | --- | --- |
| BEH-001 | Two exact 3.8 Google TTS choices, Flash fallback, saved retired choice transition; preserve other providers | AudioClientFactory → `gemini-model-mapping.ts`; server/web `media-default-model-settings`; `AppConfig.initialize()` → `config/migrations/retired-speech-model-selection.ts` → durable assignment writer | Current catalog has only Flash/Lite Google TTS and retains OpenAI. Known retired file selection becomes Flash before runtime; inherited retired override fails value-safely; non-retired file/override unchanged. |
| BEH-002 | Existing speech tool input/file contract; verbatim transcript, style/voice/speaker metadata, playable audio or explicit error | `generate_speech` schema → MediaGenerationService (unchanged) → factory → `GeminiAudioClient.generateSpeech` → SDK `generateContent` → WAV-validated temp file → existing media path writer | Strict single and labeled one/two-speaker turns; exact nested voice config; WAV header/chunk/PCM-format/frame-alignment validation or explicitly described PCM wrapping; no style-as-text or silent fallback. |
| BEH-003 | Isolated credential-safe live validation | Existing `pnpm secrets:import`/isolated vault and live runner retained; `test-support/live-e2e/live-e2e-scenarios.mjs` audio model changed to Flash | Implementation does not read owner `.env`, import credentials or run live provider. API/E2E must classify real outcomes. |
| BEH-004 | Latest stable shared SDK, preserve LLM/image/video and assess LLM catalog without unapproved change | `autobyteus-ts/package.json`, root and nested lockfiles → existing `GeminiLLM`, `GeminiImageClient`, `GeminiVideoClient` → SDK; installed-SDK LLM wire unit/integration checks | npm stable rechecked as 2.24.0. Builds and focused LLM/image/video checks pass, including installed-SDK nonstream and stream requests. Existing LLM catalog unchanged; upstream official-source assessment found no warranted LLM model-ID change. Real existing Gemini LLM provider check remains mandatory downstream. |

## Key Files Or Areas

- Audio catalog/voices/adapter: `autobyteus-ts/src/multimedia/audio/{audio-client-factory.ts,gemini-tts-voices.ts,api/gemini-audio-client.ts}`.
- Runtime map: `autobyteus-ts/src/utils/gemini-model-mapping.ts`.
- Startup setting transition: `autobyteus-server-ts/src/config/{app-config.ts,migrations/retired-speech-model-selection.ts}`; existing assignment writer reused.
- Defaults/tool: `autobyteus-server-ts/src/config/media-default-model-settings.ts`, `autobyteus-web/components/settings/mediaDefaultModelSettings.ts`, `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts`.
- SDK/fixture: `autobyteus-ts/package.json`, `pnpm-lock.yaml`, `autobyteus-ts/pnpm-lock.yaml`, `test-support/live-e2e/live-e2e-scenarios.mjs`.
- Focused tests: audio factory/adapter, model map, AppConfig/migration/settings, LLM installed-SDK wire, web Settings component. Existing LLM/image/video tests exercised unchanged adapters.

## Important Assumptions

- Current Google API accepts the installed SDK's canonical camelCase JSON `speechMetadata` and `speechConfig`; deterministic installed-SDK wire test proves serialization, while live provider acceptance remains unverified.
- 3.8 response is a nonempty WAV by default; explicit PCM is accepted only with valid rate and channel metadata. Unknown/empty response is an error.
- Deployment stops old writer before the new startup migration as specified; no concurrent two-version `.env` writes are supported.

## Known Risks

- 3.8 model entitlement/region and actual provider audio format are not locally proven.
- The current LLM, image and video unit/installed-SDK checks do not substitute for the scoped real existing Gemini LLM scenario, nor for broader API/E2E validation.
- The owner-private `.env` was never read. If an inherited retired speech ID is present in deployment, startup requires operator remediation; this is deliberate, not a runtime alias.
- The nested lockfile also updates stale Anthropic/MCP resolutions to match already-current package declarations while pinning Google 2.24.0; review lock diff for unintended drift.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change plus bounded configuration migration and shared SDK major upgrade.
- Reviewed root-cause classification: legacy/compatibility pressure and local Google TTS adapter defect.
- Reviewed refactor decision: Refactor Needed Now, narrowly in existing audio and config owners.
- Implementation matched reviewed assessment: Yes.
- If challenged, routed as Design Impact: N/A — not challenged.
- Evidence: Old speech prompt/voice/PCM path replaced in one adapter; historical IDs exist only in migration/tests/history; no new public interface or runtime alias.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None.
- Legacy old-behavior retained in scope: No.
- Dead/obsolete code, files, helpers, flags and dormant replaced paths removed in scope: Yes — old catalog/runtime maps, style-prefixed string request, implicit missing-MIME PCM, old live fixture and stale expectations removed.
- Shared structures remain tight: Yes — audio-owned voice vocabulary extracted and used by factory/adapter; local SpeechTurn has one text meaning.
- Canonical shared design guidance reapplied: Yes.
- Changed source implementation files within size guardrails: Yes. AppConfig remains exactly 500 effective nonempty lines; audio adapter remains below 500 effective nonempty lines; audio factory 228. Initial audio replacement crossed the >220 changed-line signal and was checked for cohesive ownership; shared voice vocabulary was extracted, rather than creating a generic provider helper.

## Persisted Data Transition Check

- Approved decision: **Migration Required** for only three saved retired `DEFAULT_SPEECH_GENERATION_MODEL` catalog IDs.
- Design reference: `design-spec.md` “Persisted Data / State Transition Decision” and “Migration Plan”.
- Implementation follows decision without unapproved migration/runtime fallback: Yes.
- Migration: `AppConfig.initialize()` captures inherited process value before dotenv load, parses file, rejects inherited retired override, performs one-key atomic mode-preserving replacement for a retired file value, re-parses target for validation, updates in-memory file value and only non-inherited process value. Repeated target is no-op. No SQLite/vault change.
- Focused checks: Three retired IDs, absent/blank/current/Lite/non-Google/unknown, repeated initialize, inherited current/retired, mode/unrelated bytes, pre-rename failure cleanup all passed using synthetic temp `.env` files.
- Deviation: None.

## Environment Or Dependency Notes

- `npm view @google/genai version dist-tags --json` on 2026-09-24 returned stable `latest=2.24.0`; both lockfiles updated. Root `pnpm install --frozen-lockfile` succeeded. No real Google credentials were imported or used.
- No change to production Gemini LLM/image/video adapter files or model IDs was needed for TypeScript and focused installed-SDK checks.

## Local Implementation Checks Run

- PASS: `pnpm --filter autobyteus-ts build`; `pnpm --filter autobyteus-server-ts build` (including sanitized server bootstrap smoke).
- PASS after CR-001 fix: focused `vitest` audio adapter/catalog/map plus LLM/image/video set: 68 tests (21 audio-adapter tests, including seven malformed-WAV cases); AppConfig/migration/settings set: 77 tests. Prior broader audio suite and web component checks remain recorded in IR-001.
- PASS after CR-001 fix: Gemini LLM installed-SDK wire/nonstream/stream: 4 tests; LLM unit: 11; image unit: 6; video unit: 11. Audio installed-SDK metadata wire and malformed-WAV tests included in the 21 adapter tests.
- PASS: web Settings component test: 4 tests; `git diff --check`.
- These are local implementation checks, not API/E2E sign-off. Server GraphQL E2E expectation was updated but not executed by this role.

## Frontend Rendered-Result Check

- Affected journey: Settings media default speech selector and blank fallback label; no layout or component redesign.
- References: REQ-001–003, SCN-001, design DS-001; existing `MediaDefaultModelsCard.vue`, `useMediaDefaultModelsCard.ts`, shared selector styling and component test reviewed.
- Preview: Read `autobyteus-web/README.md`; launched Nuxt dev renderer at `localhost:3048` and opened `/settings` in Chrome.
- Inspection result: Browser showed a blank surface, while dev proxy reported `/rest/health` `ECONNREFUSED` because no backend was running. No selector, loading/error interaction, viewport or visual layout claim is made. The adjacent component's focused 4-test suite passed, including fallback projection; API/E2E should inspect rendered Settings with a backend/test fixture.
- No visual defect was identified or corrected; rendered state remains unverified due to environment limitation. This IR-002 backend-only validator fix does not alter that frontend state.

## Downstream Coverage Hints / Suggested Scenarios

- Source reviewer: recheck CR-001 against new `fmt`/frame-alignment guard and seven deterministic malformed-WAV cases; retain prior migration, SDK wire, lockfile and non-TTS context.
- API/E2E: exercise Settings catalog/default/saved transition and speech tool output; validate malformed dialogue/mapping and provider failures; confirm no old choices or silent alias.
- **User-emphasized real Gemini LLM regression:** safely import only through explicit `pnpm secrets:import` dry-run + direct TTY confirmation to an isolated SQLite vault, then run scoped `gemini.vertex-express.llm` or `gemini.ai-studio.llm` through the existing runner and assert a nonempty real response. Run scoped 3.8 audio similarly when configured. Report pass/skip/failure truthfully; no safe access is a skip/blocker, not a pass. Never target production vault, read owner `.env` implicitly or print secret values.
- Current-source LLM catalog assessment remains “no model-ID change warranted” per SR-006 official-source research; Delivery should recheck/report and sync model catalog docs without bundling an unapproved LLM offering.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. The API/E2E engineer owns broader executable validation, live scoped provider calls, isolated test-vault procedure, pass/skip/failure classification, and final confidence. Implementation did not perform those gates. CR-001 source re-review must pass first.
