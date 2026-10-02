# Voice Feature Investigation Result — SR-010

## Result, context and approval boundary
- Package `gemini-tts-voice-schema-audit`, date 2026-10-02, owner Solution Designer.
- **Exploratory investigation complete; narrowed requirements Ready for Approval, not Approved.** Not formal API/E2E sign-off or an implementation handoff.
- Original goal: investigate public voice/schema parity; improve speech using working core features; create voices if feasible. Latest user authorization: create a synthetic sample independently, test new capabilities, include successful ones and leave unsuccessful ones out; following importer interruption, `continue`.
- Performed: synthetic create attempt on Vertex Express, disclosed read-only AI Studio catalog lookup, Vertex Express catalog-ID and per-turn-style synthesis. No real-person replication, AI Studio creation/synthesis or production source change.
- Approval pending for [requirements SR-010](requirements-doc.md); previous model-upgrade approval does not cover this expansion. Design, Product/behavior-defining supplement, independent review, completed size/risk and delivery receipt: N/A.
- Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit`, branch `codex/gemini-tts-voice-schema-audit`, base `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`, target `origin/personal` / `personal`.
- Execution used built feature code in `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade`, commit `c6586a07f`, installed `@google/genai` 2.24.0. Production source and specialist reports there were not changed.

## Safe setup and interrupted-import recovery
1. Metadata-only check of `/Users/normy/.autobyteus/server-data/.env`: regular current-owner file, `0600`, 3,679 bytes. No direct content read/display or modification.
2. Test-owned directory `/tmp/autobyteus-voice-feature-probe-WBhw2r` (`0700`); target `file:/tmp/autobyteus-voice-feature-probe-WBhw2r/test.db`. Not production vault.
3. Supported importer commands from feature root:

   ```sh
   pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/tmp/autobyteus-voice-feature-probe-WBhw2r/test.db --dry-run
   pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/tmp/autobyteus-voice-feature-probe-WBhw2r/test.db
   ```

   Dry-run about 16.2s: INITIALIZATION_REQUIRED, CREATE 10, BLOCKED 0. Initial TTY execution interrupted before IMPORT. Verified matching test-target processes and terminated on resume; directory remained empty/DB absent, no import/provider call in that attempt. Resumed TTY execution received manual IMPORT, exited 0: 26 migrations, READY, CONFIGURED 10. No overwrite/implicit target.
4. Inline `node --input-type=module` ESM probes from feature `autobyteus-server-ts` bound Prisma/vault to that **same explicit DB**, used semantic audio key resolver and Gemini runtime initializer. Prisma imported via ESM `repository_prisma`, avoiding prior duplicate-module mistake. READY preflight; key resolution in memory, no direct `.env` loading by probe.
5. Speech stayed Vertex Express. AI Studio used **only** for two disclosed read-only catalog calls. This is investigation, not a product mode switch.
6. Voices `maxRetries:0`; generation `retryOptions:{attempts:1}`. Catalog timeout 15s; other calls 60s. No blind retry.

## Six actual provider operations
| # | Route/request | Observation | Limit of evidence |
| --- | --- | --- | --- |
| 1 | Vertex Express `voices.create`, v1beta1, store:true, VOICE_TYPE_PROMPTED | HTTP 404 in about 1.98s; no ID/preview/resource | Failed for exact route/key/request, not global Google failure. |
| 2 | AI Studio `voices.list`, v1beta, type:['prebuilt'], page_size:1000 | Pass: 1,000 records, next-page token; no pagination | Catalog obtainable on separate authorized route; not full enumeration. |
| 3 | Vertex Express exact `gemini-3.8-flash-tts`, `achernar` | Pass: 287,978-byte RIFF/WAVE | Lowercase catalog ID works; existing Achernar identity, **not extra**. |
| 4 | AI Studio same one-page list | Pass: 1,000 records, next-page token | Corrected local case-sensitive selection mistake, not provider defect. |
| 5 | Vertex Express exact model, genuine extra `ar-001-advisor-1` | Pass: 370,538-byte RIFF/WAVE | At least one additional-library voice synthesizes despite prior Express list 404. |
| 6 | Vertex Express exact model, Kore/Puck dialogue with separate turn styles | Pass **generation only**: 529,898-byte RIFF/WAVE | Metadata accepted/audio generated; audible compliance not auditioned. |

**6 HTTP operations**, retries disabled: 1 failed create, 2 read-only lists, 3 audio generations. No remote voice created, thus no delete request. No replication, Flash-Lite, AI Studio speech, streaming or output-format/rate experiment.

### Synthetic create request
Prompt described a fictional adult narrator with warm/clear delivery, neutral American accent and calm pacing, explicitly not imitating a real person. Request used display_name, language_code:'en-US', prompted.input, VOICE_TYPE_PROMPTED, store:true; omitted voice.model per documented stored-voice shape. Failure at create; prepared preview/synthesis/delete stages **not executed**. No custom ID, sample, stored voice or deletion was tested successfully.

### Corrected extra-ID provenance and exact wire field
First selector compared case-sensitively against 30 names and mistook `achernar` for extra. Retain its result only as exact-ID feasibility evidence. After comparing both ID and display name case-insensitively, selected genuinely new catalog record:

```json
{"id":"ar-001-advisor-1","display_name":"Authoritative Advisor 1","language_code":"ar-001"}
```

Vertex synthesis passed that ID unchanged in `config.speechConfig.voiceConfig.voice`, responseModalities:['AUDIO'], short English transcript. Checked nonempty audio, RIFF/WAVE signatures and declared RIFF length equals actual bytes. No saved audio. This is generation success, **not Arabic quality, all-voice or full-catalog verification**. Direct SDK feasibility probe bypassed the current app's enum; app support is **not implemented**.

### Dialogue wire and quality limitation
Two ordered parts had verbatim text and speechMetadata speaker/style:
- Narrator, Kore: calm/slow/reassuring delivery.
- Guest, Puck: energetic/cheerful/animated delivery.

Correct nested legacy field: `multiSpeakerVoiceConfig.speakerVoiceConfigs[].voiceConfig.prebuiltVoiceConfig.voiceName`. Nonempty RIFF/WAVE and length checks passed. No listening/transcription: speaker identity/order, audible style difference and directions-not-spoken remain **unproven**, captured as later acceptance checks. Do not promote header-only success to semantic-quality Pass.

## Cleanup/privacy
All probes closed client/vault/Prisma in finally. Expected regular test files only: test.db, test.db.secret.key, verified-extra-voice.json; no created-voice ID file/remote voice. Removed test-owned directory; absence rechecked. Audio memory-only, no retained sample/runtime/importer. Source after check: 0600, 3,679 bytes, owner 501; no modification. Production vault untouched. No key, source/consent clip or raw provider failure body in evidence.

## Proposed requirement disposition and uncertainty
Keep existing speech tool/defaults; add tested extra choice and prebuilt/Extended ID-capable strings with truthful errors; expose per-turn style while preserving global style and requiring later audible-quality check. Advertise only individually tested additions, not every accepted string as verified. User must approve this distinction.

Defer create/manage this round under user leave-failed-features-out direction. Exact Express 404 cause unknown; no global/full-Vertex/AI Studio create conclusion. Replication/custom-ID synthesis untested/deferred; no fabricated consent. Dynamic discovery UI excluded; successful AI Studio investigation listing does not require another production credential/UI. No further paid call, silent switch, fallback or old-model restoration authorized by this result.

## Primary sources checked 2026-10-02
- [Speech generation](https://ai.google.dev/gemini-api/docs/speech-generation): additional-library selection and turn-level styles documented, not proof for every route/key.
- [Legacy speech contract](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation): ID and nested dialogue wire shape.
- [Voices API](https://ai.google.dev/api/voices): paginated listing and separate lifecycle; one page isn't entire catalog.
- [Full-project voice design](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/text-to-speech/voice-design): stored prompted shape, different endpoint from Express.
- [Express REST](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/express-mode/api-reference): no listed Voices resource. **Inference:** route/access support leads explanation for create 404, but precise cause unproven.
- Current feature audio factory/client/voices and server media-tool-parameter-schemas source: old enum/runtime rejection and global style, recorded in canonical investigation source log.

## Full cumulative context and next action
Canonical root: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/`.
- Canonical requirements-doc.md, investigation-notes.md, solution-revision-record.md.
- Full result: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit/tickets/in-progress/gemini-tts-voice-schema-audit/voice-feature-probe-sr010.md`.
- Still-relevant historical supplements: voice-schema-audit-report.md, solution-proposal-sr004.md, voice-provider-probe-sr005.md, voice-scope-update-sr008.md, voice-capability-clarification-sr009.md. Earlier scope/evidence superseded only as identified in SR-010; not separate approval authorities.
- Adjacent explanation-only test-vault-usability-assessment-sr006.md, test-vault-runtime-explanation-sr007.md; no approved vault-tooling changes.
- Prior basic speech: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/tickets/in-progress/gemini-38-tts-upgrade/solution-current-key-probe-sr014.md`.
- Next: user approves/revises SR-010, then Solution Designer completes architecture/classification. No implementation-ready handoff.
- Routing: `get_handoff_rules` checked 2026-10-02 after full result persistence. Returned conditions require approved/completed architecture for review or implementation, or a Delivery Completed receipt evidence gap. **None matches** this exploratory result/requirements approval hold. Return to user; no specialist message or implementation handoff.
