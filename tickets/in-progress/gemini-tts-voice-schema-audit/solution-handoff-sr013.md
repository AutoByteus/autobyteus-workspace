# Architecture Design Complete — Generate Speech Expansion (SR-013)

## Result and expected next work
- Stable package `gemini-tts-voice-schema-audit`; result **Architecture Design Complete** / Ready. **task_size Medium; architectural_risk High**.
- Original user request: inspect public Google voice/schema parity, improve current speech for successful features, create voices if possible. Experiments found additional-ID generation and distinct-style dialogue generation success; Vertex Express create404, replication untested. User accepted our narrowed recommendation and asks to see the designed schema.
- Explicit approval `USER-APPROVAL-2026-10-02-SPEECH-SR011`: “thanks lets go i aprove your suggestion. now design after your design tell me the schema you designed”, then “continue”. Captured in **requirements SR-012**, unchanged intended behavior from SR-010/SR-011. Not an approval of new UI/lifecycle, source finalization or unbounded provider requests.
- Approved scope: existing generate_speech, single-speaker additional prebuilt/Extended IDs, optional per-turn styles, preservation/error/privacy obligations. Featured30/Kore/3.8Flash defaults and separate Flash-Lite preserved. Defer creation/replication/discovery UI/output-format/streaming/credential/test-vault changes.
- Expected next specialist output: independent architecture review of SR-013 against SR-012, especially shared model-to-tool schema, nullable positional style items, single-ID versus restricted dialogue identity, explicit error privacy and baseline integration gate. If passed, selected next owner must enforce prerequisites before implementation. User receives schema explanation now.

## Design in brief
- Keep prompt/output_file_path/generation_config; no per-call model selector or new transcript representation.
- voice_name STRING/default Kore, exact ID forwarding; displayed featured/tested choices are not exhaustive runtime allowlist.
- turn_styles optional array of string/null, ordered by existing Speaker: utterance prompt lines. Exact count required; nonempty override, null/blank fallback to global style. Wrong count/type/single-mode use errors before SDK call.
- speaker_mapping remains one/two unique mapped speakers with featured 30 prebuilt names. Exact wire path includes speakerVoiceConfigs[].voiceConfig.prebuiltVoiceConfig.voiceName; text/styles separate.
- Existing client/service/runtime/path boundaries remain; no new subsystem. Replace local restriction and style assignment in one normalization path; reuse installed SDK2.24.0 and WAV validator. Sanitize external status/error category, no raw provider message/body/cause.
- Medium code delta (four existing production files plus tests/docs), High risk due shared tool contract, nullable projection, privacy and outstanding audible validation—not the number of historical notes/catalog records.

## Workspace and hard implementation-base prerequisite
- Authoring root `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit`, branch `codex/gemini-tts-voice-schema-audit`.
- Original refreshed base `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`; finalization target `origin/personal` / `personal`.
- Refreshed origin/personal now **5e3cb2f720e6fc80173099075daf55594ed58de9**, still predecessor 3.1/2.5 audio. Audit's HEAD remains e04cfef23. No integration attempted.
- Reviewed 3.8 source evidence/design prerequisite: **c6586a07f3c2585aa13673875c1bc34c971b6e5e**, separate `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade`. Before coding, establish a proper isolated execution base containing finalized/reviewed 3.8 code through normal team workspace/finalization ownership. Do not apply new features to predecessor code, independently redo the old upgrade or modify its specialist-owned delivery artifacts. If the prerequisite is unavailable, report a workspace dependency blocker rather than claim implementation-ready execution.
- Current task itself has no new DB/recording/profile store or migration. Generic historical args remain directly usable, WAV files/settings/vault unchanged. Production private state not inspected.

## Evidence and remaining acceptance gates
- Full SR-010 direct exploratory results: 6 provider operations; genuine extra ar-001-advisor-1 produced 370,538-byte RIFF/WAVE on current Vertex Express; two-speaker distinct-style request produced 529,898-byte WAV; voice create404 with no resource. AI Studio used only read-only catalog source. Lowercase achernar was existing identity, not an extra; corrected selection disclosed. No wholecatalog/custom/Flash-Lite/live-quality guarantee.
- Post-approval deterministic investigation: ParameterSchema raw nullable item union serializes through installed SDK2.24.0 as nullable STRING in AI Studio and Vertex Express with mocked fetch (2 interceptions, **zero real provider requests**). Initial server-package import resolution failed locally; corrected core package invocation. No source/dependency change or formal test pass claimed.
- Verification ownership: Implementation performs focused self-checks; configured independent code review/realistic API-E2E and delivery remain their specialists' work. Existing real E2E basic audio branch doesn't cover new IDs/per-turn semantics; extend coverage proportionately.
- AC-003 audible style/order/directions-not-spoken is **unverified**: no listening/transcription yet. Need authorization-bound live checks through implemented adapter/tool and a listening/transcription acceptance record. Mocked/header-only audio not sufficient.
- Fresh live calls require explicit bounded authorization and dry-run/direct-TTY isolated import under TESTING.md, not production vault/reused deleted test state/blind retry. No paid call/import/source implementation this design round. Previous test DB/key/audio cleaned.
- Provider create404 precise cause unproven; deferred rather than globally unsupported. No silent credential switch, old-model fallback or acceptance weakening.

## Canonical package paths (absolute)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/requirements-doc.md` — approved SR-012 intent/ACs.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/investigation-notes.md` — factual product/architecture evidence and supplement inventory.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/solution-revision-record.md` — cumulative SR-001–013 history/approval.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/design-spec.md` — complete SR-013 technical design/classification.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/generate-speech-schema.json` — concrete designed Gemini tool schema.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/solution-handoff-sr013.md` — this full result/context.

Still-relevant supporting supplements under that same canonical ticket root:
- voice-feature-probe-sr010.md (full safe runtime experiment).
- speech-value-recommendation-sr011.md (recommendation user approved).
- voice-schema-audit-report.md, voice-provider-probe-sr005.md (provider comparison/list probe).
- solution-proposal-sr004.md, voice-scope-update-sr008.md, voice-capability-clarification-sr009.md (historical scope, superseded where canonical approved baseline says so).
- test-vault-usability-assessment-sr006.md, test-vault-runtime-explanation-sr007.md (adjacent explanation, no approved tooling change).
- Prior basic success: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/solution-current-key-probe-sr014.md`.

New expansion design-review/code-review/implementation/API-E2E/delivery artifacts: **N/A — not yet applicable/produced**. Old-upgrade reviews are upstream baseline context, not passes of SR-013. Product-owned artifact: **N/A — not requested**. Handoff includes owned canonical package and all still-relevant supporting history; no specialist artifact modified.

## Relevant sources and next-action boundary
Current code exact paths/commands and TESTING.md are in canonical evidence. Primary [legacy Google speech contract](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation) rechecked 2026-10-02 supports request field placement, not every-key availability. Prior [extended voice guide](https://ai.google.dev/gemini-api/docs/speech-generation) and [Voices API](https://ai.google.dev/api/voices) supply catalog context, not a mandate to add product discovery/lifecycle.

`get_handoff_rules` checked after full persistence, 2026-10-02. The most specific matching condition is Architecture Design Complete with architectural_risk High and approved requirements; exact returned recipient **/architecture_reviewer**. Medium/Low direct implementation and delivery-receipt-gap conditions do not match. Send this same full result as a reference with the cumulative package; no direct implementation handoff or duplicate forwarding after reviewer Pass.
