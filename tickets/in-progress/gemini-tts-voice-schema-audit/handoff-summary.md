# Verification Handoff — Gemini Voice/Turn Styles

## Current state

Package `gemini-tts-voice-schema-audit`: **Medium / High / reviewed route**. Docs synchronized; **user accepted this package and selected stable publication on 2026-10-02; not finalized or released**. Current Delivery round DR-002.

- Candidate branch `codex/gemini-tts-voice-schema-audit`, integrated HEAD `b76e65f291a48fbcc69490ae61f23569d36477e7`, includes latest fetched `origin/personal` `5e3cb2f720e6fc80173099075daf55594ed58de9` (2026-10-02). Local safety checkpoint `52db1b32b`; clean base merge, no effective speech/SDK/lock/test delta. Delivery docs are uncommitted pending predecessor reconciliation/finalization; current-package acceptance is recorded below.
- Approved requirements SR-012; design SR-015 / ARCH-REV-002 Pass; IR-002; CRR-001 source Pass; API-REV-003 Pass / reported 95.0%; CRR-002 test-code Pass. Review results cover their named candidate; post-base-refresh Delivery build/checks cover the new integrated commit separately.
- After fresh server build/prebuild: core 83/83, registered API 26/26 (includes new 13-case speech-tool E2E), server media/harness/config regressions 133/133 passed. Log: `delivery-evidence/post-integration.log`. No paid call/import/private-source read was made by Delivery.

## Delivered scope for acceptance

- Single-speaker `voice_name` accepts a nonempty exact prebuilt/Extended ID string; omission still uses Kore. The same 30 voices are labelled featured, not the full catalog. Tested addition `ar-001-advisor-1` is `Authoritative Advisor 1` / `ar-001`; English generation is proven, Arabic quality is not.
- Existing one/two-featured-speaker dialogue gains optional ordered `turn_styles`, one string/null per prompt line. Nonempty overrides global style; null/empty/whitespace inherits it. Transcript/order/speaker/style remain separate and the old global-only path works.
- Invalid local arguments fail before paid generation. External errors are sanitized; no silent voice/model/mode/key substitution, failed output publication or overwrite of a prior file.
- Existing 3.8 Flash default, separate Flash-Lite, WAV/file contract and unrelated providers/modalities remain. No creation/replication/discovery UI, custom lifecycle, new recording/profile state or voice/styles migration is delivered.

## Live and listening evidence — do not broaden

Exactly **three** authorized Vertex Express operations on the pre-delivery-integration b1416a4bb candidate, one each: registered schema accepted by the existing Gemini LLM without tool execution; actual tool extra-ID generation published a validated 249,578-byte WAV; actual three-turn styled dialogue published a validated 656,618-byte WAV. The user's **“sounds great.”** replied directly to the clip and order/contrast/directions-not-spoken checklist: bounded qualitative USER listening confirmation only. Not engineer/reviewer audition, transcription, objective acoustic measurement or all-voice/Arabic/Flash-Lite/custom quality.

Those calls consumed their authorization. No repetition or private-source import is authorized just for docs/review. Current delivery integration changed no speech path/SDK and passed non-paid tests; it did not make a fresh provider call. All API-owned audio/vault/runtime/process state was cleaned.

## Separate prerequisite hold

The branch includes pinned reviewed source from **`gemini-38-tts-upgrade`**, but that ticket's external **DR-004 user-verification/finalization hold remains unresolved**. New test Pass and listening feedback do NOT accept, finalize or release it. Its user-test instance `iso-64476-efa6` was not queried/stopped or otherwise touched by this delivery round; its continuing runtime state is not freshly asserted.

External authorities are the existing old ticket's `delivery-revision-record.md` and `release-deployment-report.md`, not the inherited stale copies in this branch. Both packages must have their acceptance/finalization gates reconciled through the existing owner/user before any target merge/push/release. No bypass via this branch's transitive ancestry.

## Current user signal and remaining decision

User **“the task is done. finaliize and release a stable version”** is explicit acceptance/finalization approval for this package and selection of **stable publication**. Delivery refreshed target/tags after that signal: target still `5e3cb2f...`, so integrated handoff `b76e65f...` did not change and no rerun was needed solely for the fetch. Release preflight identifies next stable `1.4.92`; no version/tag changed. Evidence: `delivery-evidence/release-preflight.md`.

One question remains: does this approval also cover the earlier separately held **Gemini 3.8 model/SDK/default upgrade**, and should its test instance stop or remain? Clarification was presented once; no response has been received at this result. Do not infer old acceptance or stop permission. Reconcile that predecessor through its existing owner before final target promotion.

No new paid generation follows from acceptance. No archive, final commit/push, target merge, release or cleanup was attempted; terminal completion is not eligible while the prerequisite gate remains open.
