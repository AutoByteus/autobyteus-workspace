# Requirements — Google TTS verified speech capability expansion

## Document status and approval authority
- Package: `gemini-tts-voice-schema-audit`; approved baseline: **SR-012 — Approved** (same intended behavior as SR-010, explained in SR-011).
- Original goal: investigate public voice/schema parity, then improve speech, including voice creation if it works. User's latest boundary: include successfully tested new features; leave unsuccessful features out.
- Approval reference `USER-APPROVAL-2026-10-02-SPEECH-SR011`: user says **“thanks lets go i aprove your suggestion. now design after your design tell me the schema you designed”**, then **“continue”** after interruption. Approval applies to the SR-011 presented recommendation: additional voice-ID synthesis and per-turn dialogue styles, existing choices/defaults preserved, creation/replication/discovery UI deferred. Earlier experiment authorization was investigation-only; earlier model-upgrade approval remains separate.
- Approval captured in SR-012; [SR-011 priorities](speech-value-recommendation-sr011.md) are the recommendation the user approved. The canonical behavior and ACs below operationalize those two upgrades and their preservation/verification boundaries; no additional feature was inferred.
- Approved intended-behavior authority: this document, SR-012. [Probe result](voice-feature-probe-sr010.md) and [investigation](investigation-notes.md) are factual supporting evidence, not separate behavior authorities. Product/behavior-defining supplements: N/A.
- Architecture: see `design-spec.md` after SR-013 completes; no production implementation in this Solution Designer round. Task-size/risk are design-owned; review artifacts N/A until independent review.

## Problem, current behavior and desired outcome
The existing `generate_speech` tool accepts 30 featured Google voices, a global style and up to two prebuilt speakers. Its enum and runtime validation block other provider voice IDs. It cannot assign different styles to dialogue turns. “Generate image” in this conversation referred to speech: actual image generation is outside scope.

Extend **the existing speech tool/configuration**, without a new voice-management UI, so users/agents can select valid additional Google catalog voices and give dialogue turns different styles. Preserve the basic speech contract. Do not promise the complete Google catalog or create/replicate voices in this first round.

### Evidence qualified for this proposal
- Vertex Express `gemini-3.8-flash-tts` accepted genuine additional ID `ar-001-advisor-1` and returned a nonempty 370,538-byte RIFF/WAVE. Catalog display name: `Authoritative Advisor 1`, language `ar-001`. An English transcript was used; Arabic pronunciation/language quality was **not** validated.
- The same route accepted two-speaker dialogue with different turn styles and returned a nonempty 529,898-byte RIFF/WAVE. No listening/transcription: audible style compliance and directions-not-spoken are **not yet verified**.
- Synthetic `voices.create` on Vertex Express returned HTTP 404; no voice created. Defer creation **for this route/round**, not globally. Replication was not tested.
- Read-only AI Studio catalog lookup returned 1,000 records and a next-page token. No full pagination or all-voice testing. Speech must not silently depend on that other credential or switch routes.

## Scope guardrail
**In scope:** tested additional voice choices; a provider-ID-capable single-speaker schema; optional per-turn styles on existing two-prebuilt-speaker dialogue; preservation, explicit errors and privacy/regression checks.

**Preserved:** the 30 featured choices and `Kore` default voice; 3.8 Flash default model and separate Flash-Lite option; transcript/global-style/output-file behavior; two-prebuilt-speaker mapping; other providers and Gemini LLM/image/video behavior; no old-model fallback.

**Out of scope/deferred:** dynamic catalog browser/list/search, new UI, voice design/create/preview/manage, stored-custom/stateless support promises, replication, custom-voice dialogue assembly, more than two speakers in one call, streaming, new output formats/rates, Live API, credential/runtime changes and test-vault improvements. No recording ingestion or persistent voice profile state. Existing recordings/output files are not migrated or deleted.

## Relevant scenarios and journeys
| Stable IDs | Validity, actor/event and goal | Product sequence and expected outcome | Alternate / evidence |
| --- | --- | --- | --- |
| SCN-001 / UC-001 / BEH-001 | Supported Normal Scenario: user/agent selects a voice in the existing speech tool. | Inspect choices, select one, generate speech. Preserve 30 choices and expose tested additional IDs with accurate labels. | Never label a subset the full catalog. Current tool plus SR-010 evidence. |
| SCN-002 / UC-002 / BEH-002 | Supported Normal Scenario: user/agent has a legitimate prebuilt/Extended ID and wants single-speaker audio. New behavior approved by the reference above. | Supply transcript, ID and optional style; generate on configured route; receive WAV output path. Do not reject solely because ID is outside the old 30. | Invalid/unavailable ID yields a clear error, no substituted voice. Only explicitly tested IDs advertised as verified. One genuine extra ID tested, not every ID. |
| SCN-003 / UC-003 / BEH-003 | Supported Normal Scenario: user/agent prepares dialogue using existing up-to-two-prebuilt mapping. | Supply ordered turns and optional styles; generate one dialogue file, preserving text/order/speaker association. | Omitted/empty turn style inherits global style; nonempty style overrides it. Unknown speakers/mismatched turns/counts fail before paid generation. SR-010 proves generation, not audible semantics. |
| SCN-004 / UC-004 / BEH-004 | User-requested synthetic voice creation; deferred. | No create/preview/manage feature delivered in this round. | Express create returned 404; a future capable route needs new scope/approval. No silent AI Studio creation. |
| SCN-005 / UC-005 / BEH-005 | Real-person replication; deferred, not approved as a supported scenario. | No replication or consent-audio ingestion delivered. | No genuine adult reference/consent recordings or replication success. Synthetic design is not a replication substitute. |
| SCN-006 / UC-006 / BEH-006 | Supported Explicit Edge Scenario: configured provider rejects selected voice/request or is unavailable. | Request speech normally; receive truthful error, no fabricated output/result. | Distinguish local validation and provider/access/quota failure. No silent route/key/model fallback. Existing mode contract and live errors support this. |

## Approved requirements and acceptance criteria
| REQ | Intended behavior | Linked AC / observable verification |
| --- | --- | --- |
| REQ-001 | Preserve 30 featured choices; add only provenance-backed, successfully exercised IDs to **advertised verified choices**. Initial extra: `ar-001-advisor-1`. Distinguish featured, tested additional and untested caller-supplied IDs; no full-catalog claim. | AC-001 (SCN-001): old choices/default remain; exact additional ID and provider display name available via existing schema/help; catalog language recorded without claiming its quality tested. No untested entry labeled verified. |
| REQ-002 | Single-speaker `voice_name` accepts a nonempty prebuilt/Extended ID string and forwards it unchanged to configured provider. Remove old-list-only rejection. This is **ID-capable synthesis**, not guaranteed access to every ID; custom voice lifecycle/support not promised. | AC-002 (SCN-002): extra ID not locally blocked and yields nonempty valid WAV on authorized validation route; `Kore` still works; unavailable ID produces explicit provider error, no success artifact/substitution. Tests assert exact ID forwarding. |
| REQ-003 | Preserve existing dialogue/global style; optionally accept an ordered style entry for each dialogue turn. Strings or omitted/null entries: nonempty overrides global style; absent/empty inherits it. Directions separate from verbatim transcript. Dialogue choices remain existing up-to-two-prebuilt subset. | AC-003 (SCN-003): deterministic checks prove speaker/text/order/style association, override/inheritance and unchanged old calls; malformed style counts/types and unsupported speakers rejected before paid call. Authorized live validation yields WAV; listening/transcription additionally confirms dialogue order, requested delivery contrast and that directions are not spoken. Header-only checks insufficient for that last claim. |
| REQ-004 | **Deferred, not in scope:** prompted create/preview/list/get/delete. Stable ID retained from previous draft. | AC-004: N/A this baseline; no creation feature/success claim. Reopen only with suitable access and approved scope. |
| REQ-005 | **Deferred, not in scope:** replication and custom/stateless lifecycle. Stable ID retained. | AC-005: N/A this baseline; no replication/consent feature or success claim. |
| REQ-006 | Only configured speech mode/credential; truthful failures; preserve unrelated operations/providers. | AC-006 (SCN-006): no silent AI Studio/Vertex Project or old-model fallback; failures do not report success. Regressions preserve existing LLM/image/video/non-Google speech contracts. Do not infer global unavailability from route-specific failure. |
| REQ-007 | Keep credentials/raw provider errors out of logs/evidence; isolated state, bounded authorized live calls. No new recording/profile persistence. | AC-007 (SCN-001/002/003/006): deterministic privacy/regression and scoped live checks distinguish pass/fail/not-run; no credential/raw failure-body exposure; clean test-owned DB/key/audio, production vault/source untouched. |

## Approved decisions and next action
- DEC-001: existing `generate_speech` tool/schema only; no new UI/management tools.
- DEC-002: configured speech route only; no separate voice-service credential/fallback. AI Studio lookup was investigation-only, not a product dependency.
- DEC-003: defer design/replication after current-route create failure and absent consent-based success, following working-features-only boundary.
- DEC-004: advertise only tested additions, but accept caller-supplied prebuilt/Extended ID strings with explicit provider errors. A tested ID proves a capability, **not whole-library verification**. This distinction was included in the approved additional-ID recommendation; it does not imply catalog-wide verification.
- Status **Approved** by the explicit message above. No further paid call follows automatically; audible-quality verification remains an acceptance obligation, not claimed completed evidence.
- User specifically requests the designed schema after architecture. Complete design/classification and present that schema; configured rules select the next specialist. Implementation must use the 3.8-upgrade baseline, not restore predecessor TTS models.
