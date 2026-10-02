# Design Review Report — Gemini 3.8 TTS upgrade

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/design-spec.md`
- Supplemental Task Artifacts Reviewed: None; the announcement screenshot is source evidence, not a behavior-defining supplement.
- Relevant Solution Revision IDs: `SR-004` approved requirements; `SR-006` revised architecture (`SR-005` historical).
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Revised `Architecture Design Complete` package, `SR-006`, in response to `DR-001/002`; user emphasized a real existing Gemini LLM regression check after SDK upgrade.
- Prior Review Round Reviewed: `ARCH-REV-001` Fail; both prior findings rechecked against corrected design and source.
- Latest Authoritative Round: 2, this report.
- Current-State Evidence Basis: Approved artifacts; direct re-read of `BaseLLM`/`GeminiLLM`, image/video adapters and server media service against revised `DS-005–008`, plus prior audio/config/source evidence; [Google 3.8 TTS guide](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation) and [SDK releases](https://github.com/googleapis/js-genai/releases). No secret contents, implementation change or live provider call was inspected/performed in this review.

## Routing Classification Review

- Task size: `Large`.
- Architectural risk: `High`.
- Classification rationale reviewed: Provider wire/output rewrite, shared SDK major upgrade, one-key private `.env` migration, and cross-package regression surface; not catalog row count alone.
- Independent Architecture Review required by the classification: `Yes`.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` — approved intent/current triggers remain established; `SR-006` corrects both prior target-path defects without changing the approved behavior.
- Approved requirements / intended behavior understood: REQ-001–008 and AC-001–010; Flash default, Lite choice, three retired built-ins, saved-setting transition, current-only 3.8 speech, safe isolated validation, SDK upgrade with non-TTS preservation, LLM assessment only.
- Relevant existing behavior and evidence confirmed: Settings and speech-tool paths, 2.5 fallback, `.env`/process precedence and both `AppConfig.initialize()` callers, current multi-speaker `voiceConfig` nesting, and distinct Google SDK use by LLM (`generateContent`/stream), image (`generateContent`) and video (Interactions/files) are corroborated by source.
- Scope guardrail confirmed: In scope UC-001–006; out of scope voice library/design, streaming, UI redesign, LLM catalog changes, production vault mutation and unsupported runtime guarantees. Preserved BEH-002 public speech/file contract, BEH-003 secret boundary, BEH-004 unrelated Google operations. This review does not redefine those decisions.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`.
- Remaining material ambiguity, if any: None in intended behavior or design ownership. Provider entitlement and SDK metadata serialization remain explicit validation-stage unknowns; the real Gemini LLM check uses the approved safe import path and reports an unavailable credential/access honestly.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Settings/admin and startup selection | Pass | Pass — Settings selector, `MediaModelResolver`, AppConfig `.env` and both startups | Pass — target selection and migration sequencing are concrete | Confirmed | None. |
| BEH-002 | Speech tool/client contract | Pass | Pass — real `generate_speech`/client path and Google 3.8 contract | Pass — nested speaker voice config, per-turn metadata and provider speaker limit are explicit | Confirmed | None. `DR-002` resolved. |
| BEH-003 | Explicit operator import/live test | Pass | Pass — importer, TTY, isolated vault, live runner | Pass — explicit pass/skip/failure path | Confirmed | None. |
| BEH-004 | Existing Gemini LLM/image/video and SDK | Pass | Pass — actual existing request/adapter/SDK paths and real LLM scenario | Pass — `DS-005–007` are production request/result spines; `DS-008` is secondary validation | Confirmed | None. `DR-001` resolved. |

## Supplemental Artifact Coherence Verdict

None. The investigation notes inventory says none; core artifacts consistently treat the screenshot as evidence rather than an approval-bearing supplement.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design's Behavior Change / SDK / migration assessment. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Legacy request/PCM assumptions match current `GeminiAudioClient`; catalog/default distribution is evidenced. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Narrow audio refactor and migration owner chosen. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Current-only adapter, file mapping and removal plan; entitlement deferred to validation. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Settings/default and related startup migration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Speech request to provider/output | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Audio response/result | Pass | Pass | N/A — return path | Pass | Pass | Pass | Pass |
| DS-004 | Operational import/live validation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Gemini LLM nonstream/stream request and return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Gemini image tool to file result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Gemini video tool to file result, with owned poll/download | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | SDK upgrade and scoped validation workflow | Pass | Pass | N/A — operational secondary | Pass | Pass | Pass | Pass |

The startup migration's normal server/standalone entry and pre-runtime completion remain spelled out in its migration plan; no additional speculative lifecycle spine is required. Existing video polling is now explicitly described as a bounded local spine owned by `GeminiVideoClient` and is not redesigned by the SDK upgrade.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Audio factory / Gemini adapter | Pass | Pass | Pass | Pass | Server service does not build provider parts. |
| Settings service / AppConfig | Pass | Pass | Pass | Pass | Historical IDs remain in config migration, not resolver. |
| Importer / live runner | Pass | Pass | Pass | Pass | Explicit isolated vault path, not an implicit owner `.env` read. |
| Shared Gemini SDK / non-TTS adapters | Pass | Pass | Pass | Pass | `DS-005–007` identify each adapter's public boundary, SDK operation and returned result; callers do not parse provider objects. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Media service → factory/client | Pass | Pass | Pass | Pass | No provider request construction in server tool. |
| AppConfig → migration/writer | Pass | Pass | Pass | Pass | No runtime resolver/file bypass. |
| Live runner → importer/vault | Pass | Pass | Pass | Pass | No secret import in production startup. |
| Non-TTS Gemini adapters → shared SDK | Pass | Pass | Pass | Pass | `DS-005–007` and bypass rules keep SDK details within each modality owner. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AudioClientFactory.createAudioClient` / `BaseAudioClient.generateSpeech` | Pass | Pass | Pass | Low | Pass |
| `AppConfig.initialize` / named setting read-write | Pass | Pass | Pass | Low | Pass |
| `pnpm secrets:import` | Pass | Pass | Pass | Low | Pass |
| Existing Gemini LLM/image/video adapter methods | Pass | Pass | Pass | Low | Pass — no new generic interface proposed. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Google audio protocol | Pass | Pass | N/A | Pass | Refactor existing adapter, not parallel provider. |
| Saved setting transition | Pass | Pass | Pass | Pass | Config-owned one-key migration reuses writer. |
| Credential-safe live test | Pass | Pass | N/A | Pass | Existing importer and runner reused. |
| Shared SDK compatibility | Pass | Pass | N/A | Pass | Existing adapters remain owners; `DS-008` targets deterministic checks and a scoped real Gemini LLM scenario without creating a new secret path. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared audio catalog / adapter | Pass | Pass | Pass | Pass | Factory owns IDs, client owns wire/audio. |
| Server config / Settings | Pass | Pass | Pass | Pass | Shared initialization covers both production boot paths. |
| SDK-backed LLM/image/video | Pass | Pass | Pass | Pass | Distinct `DS-005–007` now anchor each adapter in a supported production request/result path. |
| Live test/import | Pass | Pass | Pass | Pass | Existing operational ownership. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `SpeechTurn` and provider payload | Pass | Pass | Pass | Pass | Local audio-owned type; generic Google helper rejected with reason. |
| Retired-ID list | Pass | Pass | Pass | Pass | Migration-owned, not shared runtime alias. |
| Server/web fallback literal | Pass | Pass | Pass | Pass | Separate projections with equality tests; no cross-package runtime dependency. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Local `SpeechTurn` / existing public speech config | Pass | Pass | Pass | Pass | Pass | Verbatim text and optional speaker/style have distinct meanings; no public schema split. |
| Historical/current model ID representations | Pass | Pass | Pass | N/A | Pass | Historical list isolated to migration. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `audio-client-factory.ts`; `gemini-audio-client.ts`; `gemini-model-mapping.ts` | Pass | Pass | Pass | Pass | Correct owners; corrected `voiceConfig` guidance stays in the audio adapter. |
| `app-config.ts`; proposed `config/migrations/retired-speech-model-selection.ts`; existing assignment writer | Pass | Pass | Pass | Pass | Migration stays at startup config boundary. |
| Server/web fallback files; speech-tool schema | Pass | Pass | N/A | Pass | Existing projections and wording. |
| SDK declaration/lockfiles, Gemini LLM/image/video adapters and focused tests | Pass | Pass | N/A | Pass | `SR-006` maps each production path to owned v2 checks and keeps operational work secondary. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/multimedia/audio/` | Pass | Pass | Low | Pass | Existing factory/provider depth retained. |
| `autobyteus-server-ts/src/config/migrations/` | Pass | Pass | Low | Pass | Historical config transform only. |
| Server tool and web Settings folders | Pass | Pass | Low | Pass | No provider serialization leakage. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Three old Google TTS rows and runtime maps | Pass | Pass | Pass | Pass | Historical catalog IDs only in migration/tests/history. |
| 2.5 defaults and 3.1 live fixture | Pass | Pass | Pass | Pass | Both server/web and live scenario named. |
| Style-as-text and implicit missing-MIME PCM | Pass | Pass | Pass | Pass | Current-only 3.8 builder and validated output. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Runtime catalog/resolver/audio request | No | Pass | Pass | No old-ID alias or dual request builder. |
| Startup saved-setting migration | No | Pass | Pass | Isolated historical transition, not normal runtime compatibility. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEFAULT_SPEECH_GENERATION_MODEL` in server data-dir `.env` | Migration Required for three saved retired IDs | Pass | Pass | Pass | Pass | `AppConfig.get` prefers process env; old explicit file ID wins over fallback and fails current-only lookup. One-key, mode-preserving atomic replacement; target value marks completion; retry/no-op, error and override handling described. Secret content need not be read during review. |
| Test-vault SQLite credentials | Not Affected | Pass | Pass | N/A | Pass | Import is explicit validation operation, not speech-setting migration. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| SDK/catalog/audio cutover | Pass | Pass | Pass | Pass |
| Startup setting transition | Pass | Pass | Pass | Pass |
| Live test and docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Single-speaker request | Yes | Pass | Pass | Pass | Verbatim text/style/voice distinction is concrete. |
| Multi-speaker request | Yes | Pass | Pass | Pass | Exact speaker-entry nesting and per-part speaker metadata are now unambiguous; `DR-002` resolved. |
| Migration | Yes | Pass | Pass | Pass | Provenance, ordering and no-op/recovery are concrete. |
| SDK non-TTS preservation | Yes | Pass | Pass | Pass | LLM/image/video spines show distinct SDK calls and returned effects; `DR-001` resolved. |

## Material Premise Validation

None. The rechecked corrections and scoped real Gemini LLM validation serve approved `SCN-003–005` and the user's explicit validation request; no additional hypothetical lifecycle trigger is used.

## Unresolved Approved-Behavior Or Current-State Gaps

None. The prior design corrections are verified resolved; no missing user intent or current-state evidence blocks implementation.

## Review Decision

**Pass** — the `SR-006` design is implementation-ready against approved `SR-004` requirements. No new intended behavior or renewed user approval is needed.

## Findings

None. `DR-001` and `DR-002` are resolved with verification evidence in `ARCH-REV-002`'s Prior Finding Resolution table; they are not silently dropped or treated as new findings.

## Classification

N/A — no current finding.

## Recommended Recipient

`/implementation_engineer` primary pass handoff; `/solution_designer` informational pass notification after the primary handoff succeeds, as required by returned rules.

## Residual Risks

- Live 3.8 availability in configured runtimes, SDK metadata serialization, actual output formats and credential alias remain honest validation gates; none supports a silent old-model fallback. A scoped real existing Gemini LLM scenario must be attempted through the explicit isolated-vault path and classified as pass/skip/failure truthfully.
- The existing assignment writer fsyncs its temp file before rename but not the containing directory. Idempotent restart recovery is specified; no additional crash-consistency machinery is required here without an applicable operational contract.

## Latest Authoritative Result

- Review Decision: `Pass`.
- Material-Premise Gate: `Pass` — no unsupported material premise drives a finding or new machinery.
- Notes: `ARCH-REV-002`, `SR-004`/`SR-006`; `DR-001` and `DR-002` resolved. Task size `Large`, architectural risk `High`.
