# Design Spec — Verified Google Generate Speech Expansion

## Solution And Approval Basis
- Package `gemini-tts-voice-schema-audit`; current design round **SR-014** (execution-base clarification of SR-013); status **Ready / Architecture Design Complete**.
- Approved requirements: canonical `requirements-doc.md`, **SR-012**, same intended behavior as SR-010 explained in SR-011. User reference `USER-APPROVAL-2026-10-02-SPEECH-SR011`: “thanks lets go i aprove your suggestion. now design after your design tell me the schema you designed”; resumed with “continue”.
- Approved: additional prebuilt/Extended ID synthesis and distinct per-turn dialogue styles; preserve existing defaults/choices/calls. Deferred: creation, replication, discovery UI and unrelated output/runtime work. No behavior-defining Product supplement.
- Canonical investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/investigation-notes.md`.
- Technical contract supplement: `generate-speech-schema.json`, the Gemini-configured tool's projected JSON schema; this design owns its semantics. Examples below are contract illustrations, not a new approved product surface.

## Current-State Read
The server-owned `MediaAutobyteusTool` exposes `generate_speech`, resolves its schema from the configured audio model, parses prompt/path/config, and invokes `MediaGenerationService`. That service chooses the configured model/runtime, creates an audio client, generates audio and publishes the first returned URL to the requested path before returning `{file_path}`. GeminiAudioClient owns text-turn parsing, Google request mapping and decoded WAV validation/temporary output. Its single-speaker enum check blocks extra IDs; two-speaker parsing assigns the same global style to every turn.

The relevant 3.8 code baseline is **c6586a07f3c2585aa13673875c1bc34c971b6e5e** in the separate `gemini-38-tts-upgrade` worktree. The audit worktree is still based on **e04cfef23550c3b78286a53befc6bd5d71fb1061**. Refreshed `origin/personal` at **5e3cb2f720e6fc80173099075daf55594ed58de9** does not contain the 3.8 baseline; its factory still lists 3.1/2.5 TTS. **Implementation admission gate (clarified SR-014): the independently source-reviewed candidate commit c6586a07f3c2585aa13673875c1bc34c971b6e5e is sufficient for isolated development; old-package finalization is NOT required before coding/checks.** Its integrated source review is CRR-008 Pass; API-REV-007 supplies integrated executable context, not live/audible coverage of this expansion. Implementation Engineer owns establishing the task-local execution base: first checkpoint/preserve only this task’s owned documents, then merge the exact pinned dependency commit into the existing isolated audit branch, recording the resulting commit/ancestry and inspecting affected source/locks. This is development dependency incorporation, not updating origin/personal or completing the old ticket. Do not rewrite commits, mutate the old upgrade worktree/branch/owned artifacts or cherry-pick a guessed subset. If conflict resolution would change the reviewed dependency or out-of-scope behavior, stop and return Design Impact/workspace prerequisite evidence rather than guessing. Rebuild/focused checks verify the resulting task base before this delta is declared implemented.

**Delivery/finalization is a separate gate:** old upgrade currently remains at its Delivery Engineer’s user-verification/finalization hold (DR-004). Development on its reviewed snapshot does not mark it accepted, finalized or released. Delivery Engineer retains latest-base integration, explicit user verification, merge/push/release/cleanup authority. The new package must disclose the unfinalized dependency at delivery and must not use its own finalization to smuggle that held package into the target; the existing old-package Delivery gate must be resolved through its owner/user before a transitive target merge. No old-task finalization is requested or performed by this design clarification.

## Task Size And Architectural Risk
- **task_size: Medium.** Four existing production files (core factory/client/voice descriptions, server speech description), focused existing tests and documentation. No new service, UI, DB or orchestration owner. Investigation/content history volume is not implementation size.
- **architectural_risk: High.** The single-speaker enum becomes a provider-ID string and a nullable indexed array is added to the model-derived tool contract exposed to multiple agent/LLM surfaces. Request validation/mapping must stay aligned across schema, client and installed SDK; error sanitization is security-relevant. Audible style success is not yet proven, and implementation has an explicit 3.8-baseline dependency.
- Escalate back to Solution Designer if schema formatters cannot consume the contract, new route/persistence/voice lifecycle is required, transcript parsing must change incompatibly, or validation suggests intended behavior must change. Do not downgrade risk because the implementation diff is short.

## Architecture Investigation Evidence
Detailed evidence and commands are in `investigation-notes.md#architecture-investigation-after-approval-sr-013`.
| Evidence | Observation | Decision supported / remaining uncertainty |
| --- | --- | --- |
| 3.8 factory, audio client, voices | Model-derived schema and client gate extra IDs; existing metadata maps to correct SDK shape | Modify current owners, not add a parallel Google service. |
| ParameterSchema and BaseTool | Nested objects/arrays project; raw item schema supported; required checks aren't complete runtime type checks | Use raw nullable string union for style items; adapter enforces values/cardinality. |
| Server parser/service/manifest/path resolver | generation_config passed as object, result published through existing path boundary | No top-level argument or result change; no publication/runtime rewrite. |
| Mocked SDK 2.24.0 wire probe | anyOf string/null item serialized as nullable STRING for AI Studio and Vertex Express; 2 mocked fetches, 0 real requests | Current SDK can serialize schema. Provider tool acceptance remains a validation gate, not proven by mocked fetch. |
| Raw history projection and AudioModel defaults | Historical args retained as generic dictionaries; defaults in memory | Optional new field doesn't require historical rewrite. |
| SR-010 live probes | One extra ID and distinct-style dialogue generated WAV; create404; no audition | Include only requested synthesis upgrades, defer lifecycle; retain audible acceptance gate. |

## Intended Change
1. Keep `prompt`, `output_file_path` and `generation_config`; model selection remains configured Settings, not a new per-call field.
2. Change Gemini single-speaker `voice_name` from ENUM to STRING with default `Kore`, no old-list membership check. Known IDs remain help/examples, not an exhaustive allowlist. Forward ID exactly.
3. Add optional Gemini-only `turn_styles` array ordered exactly like dialogue lines; string/null items, no default array. Global `style_instructions` remains fallback. Preserve current speaker mappings and one-call maximum two featured prebuilt voices.
4. Retain existing Google `models.generateContent` mapping and WAV handling. No Interactions migration, new SDK bump, custom workflow or hidden provider switch.

## Relevant Behavior And Production-Path Map
| Behavior | Kind / approved IDs | Trigger / existing evidence | Change or preserved outcome | Target path / lifecycle |
| --- | --- | --- | --- | --- |
| BEH-001 | User; REQ-001 / AC-001 | Agent discovers configured speech schema; current factory descriptions | Featured 30 plus one tested extra advertised, no full-catalog claim | Model factory -> server schema projection -> tool definition, DS-001 |
| BEH-002 | User; REQ-002 / AC-002 | Call existing speech tool with text/voice | Additional string ID forwarded; Kore preserved; unavailable ID errors | Tool -> service -> Gemini client -> provider -> output publication, DS-002 / DS-004 |
| BEH-003 | User; REQ-003 / AC-003 | Existing Speaker: utterance dialogue and mapping | Optional per-turn style with global fallback; no spoken directions | Same request/output path, turn normalization DS-003 / DS-005 |
| BEH-006 | Contract; REQ-006/007 / AC-006/007 | Provider rejects input/access/quota; secret-managed configured runtime | Safe explicit error, no output success/substitution; unrelated providers unchanged | Validation/provider error return, DS-002/003/004 |
| BEH-004/005 | Deferred | Requested creation/replication, no current-route successful lifecycle | No delivered new lifecycle | N/A; no spine invented |

## Relevant Supplemental Task Artifacts
All package-relative paths are under the canonical ticket root above. The complete inventory is in investigation notes.
| Artifact | Purpose / IDs | Design relationship / authority |
| --- | --- | --- |
| generate-speech-schema.json | Concrete projected contract; REQ-001–003 | Technical design supplement, not separate intent approval. |
| voice-feature-probe-sr010.md | Full safe experiment; REQ-001–007 | Runtime feasibility/limits, not formal sign-off. |
| speech-value-recommendation-sr011.md | Approved recommendation context; REQ-001–003 | Explains value; canonical requirements remain authority. |
| voice-schema-audit-report.md, voice-provider-probe-sr005.md | App gap/Express listing failure | Historical evidence; later results supersede then-untested statements. |
| solution-proposal-sr004.md, voice-scope-update-sr008.md, voice-capability-clarification-sr009.md | Scope evolution | Historical unapproved proposals, not competing specification. |
| test-vault-usability-assessment-sr006.md, test-vault-runtime-explanation-sr007.md | Adjacent testing mechanics | Explanation only, no importer improvement work. |

## Task Design Health Assessment
- Posture: Feature / bounded Behavior Change. Current issue: Yes, old-list-only restriction now contradicts approved ID-capable selection; style is limited to one global value. Root category: Missing Invariant / Shared Structure Looseness (external contract versus local validation), not an accusation that the old approved subset was defective.
- **Refactor needed now: No broad structural refactor.** Existing adapter owns parsing/validation and provider mapping; registry owns model schema, server owns tool/publication. Extend the existing pure turn function and replace single-voice validation in place. No mixed-level callers, new persisted owner or catch-all helper introduced.
- Narrow cleanup is required: remove single-speaker list restriction and unconditional global-style assignment. Keep featured-list validation for dialogue, where it is still the approved constraint. Separate known local failures from sanitized external failures within the current adapter.
- Deferrals: custom lifecycle and full catalog discovery stay outside scope. Indexed-array drift is prevented by exact-length validation and immediate normalization into one canonical turn array. No duplicated text/source of truth introduced.

## Terminology
- **Featured voices:** existing 30 convenient prebuilt names; authoritative restricted set for this round's dialogue, not whole Google catalog.
- **Verified addition:** provenance-backed extra ID exercised in SR-010; verification means audio generation on that route/key/time, not general access/quality guarantee.
- **Turn:** one accepted existing `Speaker: utterance` line; the first colon splits label/text and subsequent colons belong to text.

## Public Schema And Validation Contract
`generate-speech-schema.json` gives the emitted Gemini JSON-schema shape. ParameterSchema supplies descriptions/defaults/patterns and nested types; semantic constraints remain adapter-owned.

| Field | Type / default | Runtime rules |
| --- | --- | --- |
| prompt | required string | Existing nonempty server parser and dialogue syntax unchanged. No new transcript representation. |
| output_file_path | required string | Existing path/publication policy unchanged; use .wav for Gemini. |
| generation_config | optional object | Gemini-specific fields below only when configured audio model is Gemini. |
| mode | enum single-speaker / multi-speaker; single-speaker default | Existing mode selection; unsupported string fails. |
| voice_name | string; Kore default | Single-speaker only: supplied value must be nonempty string without leading/trailing whitespace; preserve case/ID exactly. Do not check featured membership or invent a provider-ID regex. Other availability determined by Google. |
| style_instructions | optional string | Existing global style trimming/behavior preserved. Keep outside transcript. |
| speaker_mapping | optional array of {speaker:string, voice:featured enum} | Required in multi mode: 1–2 unique nonempty trimmed speaker names, matching transcript exactly; voice must be one of 30. Every mapped speaker used; no unmapped turns. Existing limits remain. |
| turn_styles | optional array of string or null | Multi mode only; when supplied, **exactly one entry per parsed line**. Null/empty/whitespace entry inherits global style; nonempty trimmed string overrides. Omission inherits for all turns. Wrong type/count, explicit top-level null or supply in single mode fails locally. No default [] and no holes invented. |

`voice_name` in multi mode and `speaker_mapping` in single mode retain their current inactive-field semantics; do not broaden dialogue IDs using single-speaker support. Unknown config fields retain current not-forwarded behavior, not an arbitrary SDK passthrough.

### Single speaker example
```json
{
  "prompt": "Hello. Welcome to our story.",
  "output_file_path": "audio/narration.wav",
  "generation_config": {
    "voice_name": "ar-001-advisor-1",
    "style_instructions": "warm and conversational"
  }
}
```
### Two-speaker example
```json
{
  "prompt": "Narrator: Everything is ready.\nGuest: Wonderful! Let us begin.",
  "output_file_path": "audio/dialogue.wav",
  "generation_config": {
    "mode": "multi-speaker",
    "speaker_mapping": [
      {"speaker": "Narrator", "voice": "Kore"},
      {"speaker": "Guest", "voice": "Puck"}
    ],
    "style_instructions": "natural conversational delivery",
    "turn_styles": ["calm and reassuring", "excited and cheerful"]
  }
}
```
For a three-line dialogue, `["calm", null, "excited"]` styles lines 1 and 3 and inherits global style on line 2. It is **per turn**, not per speaker: the same speaker can have different delivery on later lines. A two-entry list for three lines is an error, never silently truncated/padded.

## Legacy Removal Policy
No backward-compatibility wrappers, versioned config, dual request path or old-model fallback. Existing valid calls remain valid because `turn_styles` is an optional input to **one current normalization path**, not because legacy/new implementations are retained. Remove the replaced single-speaker enum gate and unconditional style propagation. The featured 30 remain legitimate current choices/dialogue constraints, not removable legacy data.

## Persisted Data / State Transition Decision
- **Directly Usable — No Migration** for generic historical tool argument dictionaries; **Not Affected** for settings, credential vault, WAV files and voice profiles (none added).
- Stored subject: existing run-history tool args; historical `{prompt,output_file_path,generation_config:{voice_name:"Kore"}}` stays meaningful under the same current runtime. New optional array has an absent = global-style meaning. Raw trace/replay projections carry args as generic dictionaries; no voice-enum deserializer/migration required.
- AudioModel defaults are built in memory from ParameterSchema; no new settings key or persistence writer. Files and configured model semantics unchanged. Production private histories were not inspected; volume/bytes requiring rewrite: **zero** by this decision, not a measured population count.
- Canonical server `docs/design/data_migration_guideline.md` reviewed. No transformation/admission gate designed; predecessor migration dispositions N/A because no historical data transformation. No schema version, journal, startup scan, deletion or raw recording persistence.
- Invariants: old valid args remain directly usable; default model/key remain configured; historical audio untouched. If implementation finds a typed persisted schema needing transformation, return Design Impact before adding migration.

## Data-Flow Spine Inventory
| Spine | Scope / behaviors | Start -> end | Governing owner / significance |
| --- | --- | --- | --- |
| DS-001 | Primary schema discovery; BEH-001 | Configured audio model -> usable agent tool schema | AudioClientFactory model schema; server projects it without another voice policy. |
| DS-002 | Primary single speech; BEH-002/006 | Agent tool invocation -> saved output path | MediaGenerationService orchestrates; GeminiAudioClient owns request invariants. |
| DS-003 | Primary dialogue; BEH-003/006 | Dialogue invocation -> saved output path | Same service/client, different approved speech mode. |
| DS-004 | Return/error | Provider reply/error -> tool result/error | Adapter audio/error normalization; service publication only after successful audio. |
| DS-005 | Bounded local normalization; BEH-003 | Prompt lines/styles/mapping -> canonical ordered turns | GeminiAudioClient pure parsing functions; no external calls. |

## Primary Execution Spines
- DS-001: configured model selection -> AudioClientFactory/AudioModel.parameterSchema -> server buildMediaToolParameterSchema -> tool definition/formatter -> agent sees available input contract.
- DS-002: agent -> MediaAutobyteusTool/manifest/parser -> MediaGenerationService -> AudioClientFactory/GeminiAudioClient -> configured runtime + SDK generateContent -> decoded validated temporary WAV -> MediaPathResolver output publication -> `{file_path}`.
- DS-003: same user-to-output path; within client, prompt plus ordered styles and mappings become typed turns, then provider parts/multiSpeakerVoiceConfig. No custom-voice stitching or additional provider calls.

## Spine Narratives
DS-001 uses the selected model's schema as the sole parameter source; help names convenient voices while allowing single IDs as strings. DS-002 forwards provider identity unchanged through the normal tool/service and configured client; Google resolves availability. The reply must become playable WAV before the service publishes a success. DS-003 parses the existing labelled dialogue once, verifies each style entry aligns with a turn and each speaker with one approved mapping, then sends text and metadata separately. DS-004 never synthesizes a successful result from an error; DS-005 has no key/catalog/provider activity.

## Spine Actors / Ownership Map
| Node | Owns |
| --- | --- |
| MediaAutobyteusTool / manifest | Thin supported tool entry, argument shape/parsing; not Google voice policy. |
| AudioClientFactory / AudioModel | Catalog model registration and model-owned parameter/default contract. |
| MediaGenerationService | Configured model choice, client lifecycle and result publication sequence. |
| GeminiAudioClient | Local semantic validation, turn normalization, SDK mapping, audio normalization and value-safe error boundary. |
| Gemini runtime/key resolvers | Existing explicit configured credential/mode selection; no new fallback. |
| MediaPathResolver | Existing path interpretation and media copy/write. |
| Google | Availability, synthesis and model/voice access decisions. |

## Thin Entry Facades
Tool/manifest/schema projection stay thin; upstream callers must not start doing Gemini voice validation, importing vault data, selecting another key or writing adapter outputs directly. Public `generateSpeech(prompt, config)` stays the authoritative adapter boundary for all callers including direct tests.

## Removal / Decommission Plan
| Remove | Replacement / scope |
| --- | --- |
| single-speaker voice_name ENUM and includes gate | STRING plus local shape validation and provider access decision; in this change. |
| unconditional same-style assignment across turns | one effective-style resolution per normalized turn; in this change. |
| metadata label suggesting complete voice catalog | explicit featured subset plus tested addition section; in this change. |
| provider raw error.message interpolation at external failure boundary | static safe category/status, no raw body/message/cause attached; in this change. |
No files/old models are reintroduced or removed beyond the existing upgrade's authority. No existing proper dialogue featured-list constraint removed.

## Return Or Event Spines
DS-004: SDK inline audio -> decode/MIME/container checks -> temp WAV -> service/path resolver writes requested path -> tool `{file_path}`. Failure: validation or configured-runtime/provider rejection -> safe adapter error -> service finally cleanup -> tool failure; no generated success publication. Existing pre-existing user output is not deleted on failure. No new event bus or streaming callbacks.

## Bounded Local / Internal Spines
DS-005 parent GeminiAudioClient: validate transcript/mode -> parse lines at first colon -> validate supplied styles type/exact count -> resolve global/turn style -> validate speaker mapping -> emit one canonical `SpeechTurn[]` and speechConfig. Reject before getClient/SDK call; do not zip permissively. For single mode, retain one transcript part and validate selected ID separately.

## Off-Spine Concerns Around The Spine
| Concern | Spines / served owner | Responsibility / boundary |
| --- | --- | --- |
| Featured/verified descriptive metadata | DS-001, factory | Help/provenance, not single-ID admission authority or dynamic catalog. |
| Secret/runtime selection | DS-002/003, client | Existing semantic vault resolver; no credentials in schema/transcripts. |
| Model mapping | DS-002/003, client | Existing resolveModelForRuntime; preserve 3.8 identifiers/no fallback. |
| Audio and path I/O | DS-004, client/service | Existing validation/temp save/publication; no reimplementation. |
| Error privacy | DS-004, client | Distinguish fixed local messages, known safe runtime categories and safe SDK HTTP category. Raw provider text must not enter user/tool history/logs. |

## Ownership Boundaries / Encapsulation Map
| Authoritative boundary | Encapsulates | Required callers / forbidden bypass |
| --- | --- | --- |
| MediaGenerationService.generateSpeech | model/path/client lifecycle | Tool calls service; must not call Google, vault or path writers directly. |
| GeminiAudioClient.generateSpeech | local normalization and provider request | All library speech callers use client; server must not parse Google turns or create raw SDK speech calls. |
| Model.parameterSchema | Gemini speech public config | Server projects schema; no second handwritten generation_config schema in production. |
| Semantic runtime/key resolver | configured access | Adapter uses existing resolver; cannot read .env or select AI Studio from an imported extra slot. |

## Dependency Rules
Keep server -> core factory/client; core must not depend on server/testing/vault-import implementation. Factory and client may use provider-specific featured metadata; the single-ID validator must not use that list as an exhaustive provider catalog. Formatters/ParameterSchema remain generic and unchanged. Tests may intercept fetch/use synthetic credentials, never expose real keys. SDK parts come only from normalized turns, not arbitrary config key forwarding.

## Interface Boundary Mapping / Check
| Interface | Subject / identity | Responsibility singular / selector risk |
| --- | --- | --- |
| generate_speech | prompt + local output path, configured model | Yes; path/model responsibility unchanged. |
| generation_config.voice_name | exact provider voice ID scoped to configured Google runtime | Yes; no display-name lookup or cross-project portability promise. |
| speaker_mapping | speaker label -> featured voice name | Yes; not the same identity domain as unrestricted single ID; namespaced by dialogue mode. |
| turn_styles | zero-based ordered position in accepted prompt turns | Yes; Medium alignment risk, exact count then immediate canonical normalization. |
| generateSpeech | transcript + model config -> SpeechGenerationResponse | Yes; no voice-resource lifecycle actions added. |

## Main Domain Subject Naming Check
Keep established `voice_name` despite accepting IDs (description makes identity explicit); don't add overlapping `voice_id` alias. `turn_styles` distinguishes turn delivery from speaker identity/global style. `SpeechTurn` has one speaker/text/effective-style value, not two competing styles. Existing names remain natural enough; no vague manager/helper.

## Existing Capability / Subsystem Reuse Check
| Need | Existing capability / decision |
| --- | --- |
| Schema/defaults | Extend core AudioClientFactory existing Gemini schema. |
| Turn parsing/request mapping | Extend existing GeminiAudioClient private pure functions. |
| Provider mode/key | Reuse existing Gemini runtime/key resolution unchanged. |
| Output/history | Reuse existing service/path/history projections unchanged. |
| Nullable schema | Reuse existing raw arrayItemSchema support; no shared type enum overhaul. |
No new subsystem/service/registry introduced.

## Subsystem / Capability-Area Allocation
Core multimedia/audio owns voice/config/provider mapping. Server agent-tools/media owns projection/entry/publication. Existing secret-management and Gemini runtime utilities remain access owners. Test-support/live-e2e supplies isolated validation under its own engineer, not production behavior.

## Draft File Responsibility Mapping
Factory schema, Gemini client and voice descriptions are the bounded implementation candidates; server speech parameter description may explain ordered styles. Do not create new request DTO/service just to forward calls, or put Google normalization into server parser. Existing tests cover each boundary and must be extended.

## Reusable Owned Structures / Shared Model Tightness Check
- Existing `SpeechTurn` remains private to the Gemini adapter; one canonical normalized representation. No duplicated prompt/speaker/text DTO in public config.
- `turn_styles` is parallel to existing required text only at the public input; exact-count validation immediately resolves it into turns. Risk Medium, bounded by one owner; never maintain parallel arrays downstream.
- `GEMINI_TTS_VOICES` remains featured 30. Add descriptive `GEMINI_VERIFIED_EXTENDED_VOICES` metadata (id/displayName/languageCode), not another validation list. Distinct meanings avoid conflating featured choices and complete provider catalog.
- Both 3.8 models reuse the same current schema object; no copies in server or model-specific parallel builders. Null/string union uses existing generic schema support. No extraction needed beyond these existing owned structures.

## Final File Responsibility / Target Folder Mapping
| Path relative to execution base | Action / responsibility | Must not contain |
| --- | --- | --- |
| autobyteus-ts/src/multimedia/audio/audio-client-factory.ts | Change voice_name STRING/default/help/pattern; add nullable turn_styles ARRAY to shared Gemini schema | New runtime/key/lifecycle policy; widening OpenAI schema. |
| autobyteus-ts/src/multimedia/audio/gemini-tts-voices.ts | Preserve featured names; add one provenance-backed tested extra descriptive entry; relabel help subset | Exhaustive catalog claim or runtime admission of every ID. |
| autobyteus-ts/src/multimedia/audio/api/gemini-audio-client.ts | Replace single gate; extend existing parsing/style resolution; sanitize external errors; preserve WAV mapping | SDK key fallback, creation/list calls, custom dialogue, arbitrary config passthrough. |
| autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts | Clarify optional model-offered turn styles follow prompt line order; continue model projection | Duplicate Google-specific schema/runtime validator. |
| autobyteus-ts/tests/unit/multimedia/audio/{audio-client-factory.test.ts,api/gemini-audio-client.test.ts} | Extend schema, deterministic mapping and SDK-mocked-wire/privacy regressions | Real private credentials or claimed audible semantics from fake WAV. |
| autobyteus-server-ts/tests/unit/agent-tools/media/{media-tool-parameter-schemas.test.ts,media-generation-service.test.ts} | Add Gemini speech projection and unchanged config forwarding/publication checks | Replaced image tests or a new server voice policy. |
| autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts and test-support/live-e2e | API/E2E engineer extends scoped checks proportionately after source review | Blind retries or relabeling prior basic speech as new feature coverage. |
| autobyteus-server-ts/docs/modules/multimedia_management.md; autobyteus-ts/docs/provider_model_catalogs.md | Document config/examples/tested subset and exclusions | Claiming all voices/Flash-Lite live parity before evidence. |
Folders already express provider adapter vs model metadata vs server entry. Compact placement is clear for a bounded change; no generic shared folder or new module grouping. Provider adapter remains within multimedia/audio/api; transport/schema projection stays in server/media.

## Applied Patterns / Derived Layering
Reuse existing factory, provider adapter and model-derived schema. Layering stays server tool/service -> core audio model/client -> SDK, with existing runtime/path concerns attached to owners. No new pattern for this feature.

## Concrete Shape Guidance
Good: existing prompt + ordered nullable styles -> validated normalized turns -> `{text, speechMetadata:{speaker,style}}`. Avoid a second structured `turns` transcript alongside prompt or embedding style directions in text. Good: exact `voiceConfig.voice` for single ID; for dialogue use **speakerVoiceConfigs[].voiceConfig.prebuiltVoiceConfig.voiceName**, never omit the voiceConfig level.

## Backward-Compatibility Rejection Log
| Candidate | Decision / clean-cut alternative |
| --- | --- |
| Old enum path for30 plus separate new-ID path | Rejected: one STRING validation and one provider field. |
| Old/global-only request builder plus new/per-turn builder | Rejected: one normalizer with optional style override. |
| Renamed voice_id plus voice_name alias | Rejected: retain one current public field. |
| AI Studio fallback when Express rejects voice | Rejected: exact configured route errors. |
| Versioned config/migration | N/A: optional addition and broader accepted identity, no versioned state. |

## Change / Refactor Sequence
1. Implementation Engineer checkpoints this task’s owned documents, merges pinned reviewed dependency c6586a07f into this task’s isolated audit branch, records ancestry/result and checks the effective source/locks. Reviewed candidate suffices for development; old finalization is not a coding prerequisite. Do not modify its worktree/artifacts/branch or any finalization target. Stop/report out-of-scope integration conflicts. Re-read affected code before applying this delta.
2. Extend descriptive metadata and factory schema together; add projection/schema assertions including absence of single enum and presence of unchanged mapping enum.
3. Replace single-voice gate and extend turn normalization; validate before SDK initialization. Keep text/mapping/WAV path unchanged. Capture safe external status without interpolating error.message/body/cause into thrown errors/logs; known local fixed messages remain actionable.
4. Extend deterministic client tests and real-installed-SDK mocked-fetch serialization checks. Add negative field/count/mapping tests asserting no generateContent call, and sentinel-secret provider error tests.
5. Run core/server focused tests/builds; no package bump or LLM/image/video rewrite. Independent source review and proportional API/E2E follow configured routing, not this author's execution.
6. API/E2E closes real adapter/tool output and audible style acceptance using **fresh explicit bounded authorization** and isolated import. Reuse real-E2E boundaries; no private production runtime. Report missing route/quality evidence as not-run/failure truthfully.
7. Delivery syncs docs, captures user verification and finalizes against target; no expanded feature claim without evidence.

## Verification Intent And Acceptance Mapping
- Core command (package test script is a placeholder): `pnpm -C autobyteus-ts exec vitest run tests/unit/multimedia/audio/audio-client-factory.test.ts tests/unit/multimedia/audio/api/gemini-audio-client.test.ts --no-watch`; then build with package script.
- Server focused command: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/media/media-tool-parameter-schemas.test.ts tests/unit/agent-tools/media/media-generation-service.test.ts --no-watch`; deterministic E2E according to TESTING.md.
- AC-001/002: schema STRING/default/help, featured 30 preserved, true extra and lowercase ID forwarded unchanged, wrong/empty/whitespace type rejected, unavailable provider ID safe failure and no published success.
- AC-003: old calls global style unchanged; three turns including repeated speaker map to distinct positional styles; null/empty/whitespace fallback; wrong-length/type/single-mode supplied array fail before calls; colon-in-text/order preserved; mapping constraints unchanged. Mocked SDK wire test covers actual nested shape, not only call-object assertion.
- AC-006/007: sentinel values in mocked HTTP404/429 provider bodies/messages never reach error/log/history; safe categories distinguish failure without global claims. Preserve exact configured key resolver; OpenAI/model catalogs and unrelated Gemini schema/request paths regression-tested. No route fallback.
- Live: exact configured Flash plus tested extra through implemented adapter/tool, valid playable WAV and path, and a short dialogue audibly reviewed for ordering/style contrast/directions-not-spoken. No live Flash-Lite/wholelibrary/custom success inferred. API/E2E may request a proportional additionally authorized Flash-Lite check if needed; absence never counted Pass.
- Browser/new UI: N/A, not changed. End-to-end tool surface is still required; author exploratory SDK calls alone don't satisfy executable validation.
- No live checks or source implementation performed by Solution Designer in this design round.

## Key Tradeoffs
Keep established prompt syntax and optional indexed style entries rather than inventing a breaking structured transcript API; exact count prevents silent misalignment. String IDs avoid hardcoding the complete catalog, but provider availability remains a runtime error. Preserve featured dialogue constraint independently rather than extend untested one-call custom/Extended dialogue. Reuse installed SDK/API shape to bound blast radius; changing to Interactions or bumping SDK is not needed by current evidence.

## Risks / Implementation Guidance
- Wholecatalog, custom synthesis, new-route capability and audible style compliance remain unproven; don't overclaim them.
- Nullable item serialized locally successfully, but actual provider tool schema acceptance must be checked by relevant tests; no formatter changes assumed.
- Early validation must not accidentally initialize/call SDK for malformed arrays; model/secret availability preflight is not synthesis evidence.
- Preserve exact IDs; reject surrounding whitespace, don't normalize case or turn display names into IDs. Verified metadata isn't a security/availability authorization list.
- Current output/cancellation/temp handling stays outside refactor scope; don't promise new cancellation guarantees or alter shared publication semantics.
- Presence of the exact reviewed dependency in the isolated execution base is a hard implementation prerequisite, owned by Implementation Engineer. Old-package finalization remains a separate delivery gate, not a coding prerequisite. If its worktree is later cleaned, use the pinned available git object and durable upstream review references; report an unavailable object rather than reconstructing a guessed feature fork.
