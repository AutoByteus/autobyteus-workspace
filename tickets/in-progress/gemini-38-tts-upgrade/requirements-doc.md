# Requirements Document — Gemini 3.8 TTS upgrade

## Document Status
- Status: **Approved**
- Current solution revision: `SR-004`; package: `gemini-38-tts-upgrade`
- Request: User message and image, 2026-09-24; owner: Solution Designer
- Approval reference / exact approved baseline: User message of 2026-09-24 (“yes ... the requirement is clear. lets go”) approving the preceding complete rollout proposal including automatic saved-setting transition, plus requesting a Gemini LLM currency assessment. Approved baseline: this `SR-004` requirements document; supplements N/A.
- Behavior-defining supplements: N/A

## Problem And Desired Outcome
Autobyteus's Google audio catalog offers 3.1 Flash preview, 2.5 Flash, and 2.5 Pro TTS models. Its existing live Google audio scenario selects 3.1 Flash preview, while its server/web fallback default is `gemini-2.5-flash-tts`. Google released GA `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts` on September 22. A model-ID-only substitution is unsafe: Google's 3.8 migration guide requires verbatim transcript text, structured style/speaker metadata, and accounts for a new default WAV output. The current client prepends style to text.

**Confirmed user direction:** replace the legacy Google TTS entries with the current generation; make **Gemini 3.8 Flash TTS the default** and offer **3.8 Flash-Lite separately**. Remove the three old built-in TTS entries found in the repository: 3.1 Flash preview, 2.5 Flash, and 2.5 Pro. Upgrade the Google GenAI SDK to the latest stable version while preserving unrelated Google operations. **Approved continuity choice:** if an explicit saved setting names one of those removed built-in TTS IDs, automatically change that setting to 3.8 Flash; preserve all unrelated settings. The source has 3.1 Flash preview, not a 3.5 Flash TTS preview entry. “Latest” does not establish superiority for every quality, latency, cost, or language use case.

## Relevant Current And Desired Behavior
| ID | Kind / Scenarios | Evidence-backed current behavior | Approved desired behavior | Intentionally preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | User/System; SCN-001 | Audio catalog has 3.1 preview and 2.5 models; server/web fallback is 2.5 Flash; an explicit setting can override fallback. | Remove all three legacy built-in Google TTS entries; offer both 3.8 choices; blank setting uses 3.8 Flash in server/web. | Preserve other providers/media defaults; a stored legacy Google TTS selection transitions to 3.8 Flash without losing unrelated settings. |
| BEH-002 | System/Contract; SCN-002/003 | Gemini client calls `generateContent`, prepends `style_instructions` to prompt, maps speaker names to voices, saves returned audio. | For 3.8, keep transcript separate from delivery style, preserve single-/multi-speaker options, return playable audio. | Existing speech input/config/output-path contract and explicit errors, without silent model substitution. |
| BEH-003 | Operational; SCN-004 | `pnpm secrets:import` requires explicit SQLite target and TTY confirmation; live Gemini audio scenario pins 3.1 preview. | Isolated, value-safe 3.8 live validation when suitable credential/provider access exists. | Test/import do not modify owner source `.env` or production vault; no secrets in Git/evidence. |
| BEH-004 | System/Contract; SCN-002/003/005 | `autobyteus-ts` declares `@google/genai` `^1.38.0`; root lock resolves 1.42.0, nested lock 1.40.0. The SDK is also used by Gemini LLM, image, and video paths. | Upgrade to latest stable SDK (2.24.0 verified 2026-09-24), or reverify latest at implementation, and retain supported existing Google operations. | Existing non-TTS Gemini request behavior; assess Gemini LLM model currency without automatically changing model offerings. |

Evidence is detailed in `investigation-notes.md`; primary Google sources: [release notes](https://ai.google.dev/gemini-api/docs/changelog), [3.8 TTS migration guide](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation), [model comparison](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash-tts).

## Stakeholders And Outcomes
- Speech user/agent: gets correctly spoken, playable audio; style directions are not recited as transcript.
- Administrator: sees both 3.8 choices; unconfigured default is 3.8 Flash; saved removed-model settings follow the approved transition.
- Test operator: obtains genuine provider pass or precise value-safe skip/failure without altering production secrets.

## Scope Guardrail
### In-scope use cases
- `UC-001` Discover/select 3.8 speech models and use approved fallback when unconfigured (`SCN-001`).
- `UC-002` Generate single-speaker speech via existing prompt, voice, style, and output contract (`SCN-002`).
- `UC-003` Generate distinct multi-speaker speech via existing mapping inputs (`SCN-003`).
- `UC-004` Safely preflight and run a scoped real Google test against an isolated test vault (`SCN-004`).
- `UC-005` Upgrade the shared Google SDK without regressing existing supported Gemini LLM/image/video operations (`SCN-005`).
- `UC-006` Assess whether the currently offered Gemini LLM models need a separate update, using current official model guidance (`SCN-006`).
### Out of scope / non-goals
Voice design/replication/library, streaming, unrelated media or LLMs, UI redesign, new credential importer, rewriting non-legacy explicitly saved settings, unapproved removal of non-Google audio models, production database/vault mutation, and a guarantee of Vertex availability or subjective voice quality. These require separate authorization if later proposed.
### Preserved behavior and review authority
Transition only saved selections of the three retired built-in TTS IDs to 3.8 Flash while preserving every other setting, BEH-002 public speech/file contract, BEH-003 secret boundary, and BEH-004 non-TTS Google operations. A blocking downstream change must trace to an approved REQ/AC/preserved behavior. New policy, migration, security, or compatibility obligations require renewed user approval; reviewer commentary alone cannot extend scope.

## Requirements
| ID | Approved requirement | Behavior / priority | Rationale |
| --- | --- | --- | --- |
| REQ-001 | Offer exact `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts` Google audio IDs and send the corresponding exact model to supported runtime paths. | BEH-001 / Must | Google release and catalog contract |
| REQ-002 | Use `gemini-3.8-flash-tts` as the blank/unconfigured speech fallback consistently in server and web; offer 3.8 Flash-Lite as a separate selectable model. | BEH-001 / Must | Explicit user direction |
| REQ-003 | Remove the built-in `gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-tts`, and `gemini-2.5-pro-tts` choices; keep the existing `prompt`/`generation_config`/audio-file contract. Automatically transition an explicitly saved removed built-in ID to 3.8 Flash without changing unrelated settings. | BEH-001/002 / Must | Explicit user removal direction; data continuity |
| REQ-004 | For 3.8 speech, separate style from verbatim transcript, maintain supported voice and speaker mapping, produce usable audio, and surface configuration/provider failures without automatic substitution. | BEH-002 / Must | Google migration guide |
| REQ-005 | Add durable deterministic validation and attempt scoped real-provider 3.8 speech validation; report pass, skip, and failure truthfully. | BEH-003 / Must | User test suggestion/current live runner |
| REQ-006 | Keep credential bytes out of tracked/evidence files; use only supported explicit, dry-run-reviewed, confirmed import into an isolated test vault. | BEH-003 / Must | Secret management contract |
| REQ-007 | Upgrade the shared `@google/genai` dependency to the latest stable release verified during implementation (2.24.0 as of 2026-09-24) and preserve supported Gemini LLM/image/video behavior. | BEH-004 / Must | User SDK request; [Google SDK release](https://github.com/googleapis/js-genai/releases) |
| REQ-008 | Assess the current built-in Gemini LLM model offerings against current official Google model information and report whether a model update is warranted; do not change LLM offerings without separate intended-behavior approval. | BEH-004 / Must, assessment-only | User approval message requests this check |

## Acceptance Criteria
| ID | REQ | Scenario | Trigger and observable outcome | Alternate/failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | 001 | SCN-001 | Audio catalog lists both exact 3.8 IDs and maps each to correct API value. | No invented alias/old API ID. | Catalog tests |
| AC-002 | 002 | SCN-001 | Blank setting displays/executes 3.8 Flash; 3.8 Flash-Lite is separately selectable. | An explicit saved retired Google TTS ID transitions to 3.8 Flash; an unrelated explicit selection remains unchanged. | Server/web tests |
| AC-003 | 003 | SCN-001 | All three old built-in Google TTS IDs are absent from new choices; an explicitly saved removed ID is durably changed to 3.8 Flash while other settings remain unchanged. | No stale entry is silently treated as a successful provider call; no non-Google audio option is removed. | Catalog/settings/resolver tests |
| AC-004 | 004 | SCN-002 | Single-speaker transcript, voice and style produce structured request and nonempty playable audio file; style not appended to transcript. | Empty/malformed audio fails explicitly. | Adapter unit and provider test |
| AC-005 | 004 | SCN-003 | Valid mapped dialogue associates each supported speaker turn with selected voice and returns usable audio. | Missing/invalid mapping fails clearly. | Adapter unit and provider test where feasible |
| AC-006 | 003/004 | SCN-002/003 | Existing `generate_speech` tool/API prompt/config/output-path interface remains usable. | Auth/unavailable model errors surfaced; no silent fallback. | Server media E2E |
| AC-007 | 005/006 | SCN-004 | Isolated live run genuinely calls selected 3.8 model and validates nonempty audio; report is value-safe. | Missing credential/provider access is a recorded skip/blocker, never a pass; provider failure is failure. | Live E2E |
| AC-008 | 006 | SCN-004 | Credential import/live test leave owner source `.env` unchanged (apart from any separately approved speech-setting transition), use an explicit test SQLite target, and leave no secret in tracked artifacts/evidence. | Unsafe source/target or absent TTY confirmation prevents import. | Importer safety checks/operator review |
| AC-009 | 007 | SCN-005 | Installed/locked Google SDK is the latest stable version verified during implementation; existing supported Gemini LLM/image/video checks and 3.8 speech checks pass. | Breaking SDK changes are resolved or reported, not ignored. | Dependency/lock inspection and regression suites |
| AC-010 | 008 | SCN-006 | A source-backed assessment compares current built-in Gemini LLM models with current Google offerings and states whether a separate model update is recommended. | No unapproved LLM catalog change is bundled into the TTS upgrade. | Investigation note and final delivery summary |

## Relevant Scenarios And Journeys
| ID | Kind / actor / goal | Supported trigger and initial state | Product-level event sequence | Outcome / alternate | Validity and evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System; administrator selects default | Existing Settings audio-model selector and speech setting | Load catalog, optionally save model; later speech request reads explicit ID or fallback | New choices; 3.8 Flash fallback only when blank; saved retired Google choice transitions to 3.8 Flash | Supported Normal Scenario: `useMediaDefaultModelsCard.ts`, `media-tool-model-resolver.ts` | 001–003 / 001–003 |
| SCN-002 | User/System/Contract; single-voice speech | Existing `generate_speech` tool/client with Google model | Supply transcript, optional voice/style, output path; provider returns audio | Playable file or explicit error | Supported Normal Scenario: speech schema/service/client | 004 / 004,006 |
| SCN-003 | User/System/Contract; distinct speakers | Existing multi-speaker `generation_config` | Supply dialogue and speaker mapping; request returns audio | Distinct voices or mapping error | Supported Normal Scenario: factory schema/client and Google guide | 004 / 005,006 |
| SCN-004 | Operational; test operator validates Google | User-supplied owner-private `.env`, explicit importer, dedicated live-E2E runtime | Check safeguards, preview, confirm isolated test import, run scoped test | Genuine pass or value-safe skip/failure | Supported Explicit Edge Scenario: request, `secret_management.md`, live runner | 005–006 / 007–008 |
| SCN-005 | System/Contract; existing Gemini request | Existing Gemini LLM/image/video APIs after shared SDK upgrade | Existing supported request enters shared SDK and returns through same public contract | No regression from SDK major-version change; failure is surfaced | Supported Normal Scenario: imports in `gemini-llm.ts`, `gemini-image-client.ts`, `gemini-video-client.ts`; user upgrade request | 007 / 009 |
| SCN-006 | Operational; product maintainer assesses Gemini LLM catalog | User request to check LLM currency as part of SDK upgrade | Compare current built-in Gemini LLM IDs to current official Google models and record recommendation | Assessment only; any new LLM offering requires separate approval | Supported Explicit Edge Scenario: user request and built-in Gemini LLM catalog | 008 / 010 |

## UI, Quality And Data Continuity
- UI applicability: Existing Settings selector only; no Product Design request, prototype, new screen, or normative visual supplement (`N/A — not applicable`).
- `QR-001` (REQ-006/AC-007–008): no credential values in Git, snapshots, logs, or handoffs; test vault is isolated and explicitly targeted.
- `QR-002` (REQ-004/AC-004–006): nonempty playable output and explicit failure rather than silent substitution.
- Persisted state affected: explicit `DEFAULT_SPEECH_GENERATION_MODEL` may be stored in the server data-directory `.env` (or inherited process environment), not in the application database. Production vault and other settings must remain intact; only generated/test-only state may be cleaned. A saved retired built-in Google TTS ID must be changed to 3.8 Flash; unrelated settings and credentials must remain unchanged. Unknown whether this deployment has such an explicit selection; the owner-private `.env` contents have not been read.

## External Contracts, Assumptions And Decisions
| ID | Fact, assumption or decision | Status/owner |
| --- | --- | --- |
| DEC-001 | 3.8 Flash default, 3.8 Flash-Lite separate selectable option; remove 3.1 Flash preview, 2.5 Flash and 2.5 Pro TTS entries. | Decided by user on 2026-09-24 |
| DEC-002 | Automatically change an explicitly saved retired built-in Google TTS model selection to 3.8 Flash; preserve unrelated settings. | Approved by user on 2026-09-24 |
| ASM-001 | Supplied `.env` may contain an importable Google credential; existence and private `0600` mode checked, contents not read. | Test operator to verify safely |
| ASM-002 | 3.8 availability in Vertex Express/project runtime is not established by Gemini API release announcement. | API/E2E live check needed |

- Google contract: exact IDs, structured `speech_metadata`, unary WAV default ([guide](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation)).
- Import contract: absolute source, canonical absolute SQLite URL, dry-run, direct TTY confirmation; source is never modified (`autobyteus-server-ts/docs/modules/secret_management.md`).
- Behavior-defining supplements: N/A — not applicable.

## Traceability
| REQ | Use Case | BEH | AC | Scenario |
| --- | --- | --- | --- | --- |
| 001 | 001 | 001 | 001 | 001 |
| 002 | 001 | 001 | 002 | 001 |
| 003 | 001–003 | 001/002 | 003,006 | 001–003 |
| 004 | 002–003 | 002 | 004–006 | 002–003 |
| 005 | 004 | 003 | 007 | 004 |
| 006 | 004 | 003 | 007–008 | 004 |
| 007 | 005 | 004 | 009 | 005 |
| 008 | 006 | 004 | 010 | 006 |

## Architecture Phase Input — Approved Basis
Map SCN-001 through catalog/server/web setting precedence; SCN-002/003 through tool/client/Google payload and audio writer; SCN-004 through importer/live runner. Verify SDK 2.24.0+ support and breaking changes across Google modalities, WAV handling, 3.8 runtime availability, and the approved saved-setting/legacy transition. Do not infer a DB migration or add an importer from this request.

## Readiness Check
Current behavior evidence-backed: Yes. Desired/preserved behavior explicit: Yes. Scope/non-goals: Yes. REQ/AC testable and traced to supported scenarios: Yes. Product prototype: N/A. Data continuity/risks visible: Yes. **Explicit user approval received: Yes, 2026-09-24 message quoted above. Approved basis ready for architecture: Yes.**
