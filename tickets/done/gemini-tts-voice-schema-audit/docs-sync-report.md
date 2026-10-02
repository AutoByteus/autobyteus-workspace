# Current DR-005 Docs Authority

**Docs synchronization Pass** on checked combined source; canonical3docs remain current at the published beta. Integrated source/checks and finalization/publication/cleanup now complete; current exact receipt in release-deployment-report.md. Earlier waiting/preparation statements below describe historical rounds, not current gates.

# Docs Sync Report — Gemini Voice/Turn Styles

## Scope

- Package: `gemini-tts-voice-schema-audit`; `task_size=Medium`, `architectural_risk=High`, reviewed route.
- Trigger: `CRR-002` successful-API test-code review Pass following `API-REV-003` Pass / reported 95.0% and distinct `CRR-001` source Pass.
- Bootstrap: `origin/personal` `e04cfef23550c3b78286a53befc6bd5d71fb1061`; pinned old 3.8 source dependency `c6586a07f3c2585aa13673875c1bc34c971b6e5e` incorporated by `332cbb2ad`.
- Integrated base for docs: `origin/personal` `5e3cb2f720e6fc80173099075daf55594ed58de9`, fetched on 2026-10-02 and merged into this ticket as `b76e65f291a48fbcc69490ae61f23569d36477e7` after local checkpoint `52db1b32b`.
- Post-integration verification: `delivery-evidence/post-integration.log`; current-worktree server prebuild/build/sanitized bootstrap Pass, core 4 files / 83 tests, API 4 files / 26 tests and server 10 files / 133 tests Pass. No source/SDK/lock or voice-test delta from this delivery merge.

## Why Docs Were Updated

The long-lived provider catalog still listed retired TTS rows, while media docs did not explain the implemented voice-ID string boundary, ordered nullable turn styles or sanitized failures. Docs now describe the effective integrated code, including the inherited reviewed 3.8 prerequisite, without accepting or finalizing the old ticket.

## Long-Lived Docs Reviewed

| Doc | Result | Reason / notes |
| --- | --- | --- |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Updated | Replaced obsolete TTS rows and promoted the actual voice/style/SDK/WAV/error contracts with explicit evidence limits. |
| `autobyteus-server-ts/docs/modules/multimedia_management.md` | Updated | Public tool argument shape/example, default/featured/dialogue boundaries, no new migration for voice/styles and inherited saved-model transition. |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Updated | Configured route only, sanitized speech errors, catalog/preflight vs paid generation, bounded authorization and test vault. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | No change | Existing media tool names/ownership remain valid; detailed speech arguments belong in multimedia docs. |
| `TESTING.md`, server `AGENTS.md` | No change | Already define the current build/prebuild, core/server/API and isolated-provider path. |
| Root `README.md`, release helper instructions | No change | Existing stable/beta/merge-before-release method remains valid; no release choice yet. |

## Docs Updated

| Doc | What changed | Why |
| --- | --- | --- |
| Provider model catalogs | Two exact 3.8 TTS rows; blank Flash default; no old aliases; 30 featured vs single-speaker string IDs; tested `ar-001-advisor-1`; per-turn normalization; WAV validation and safe failures. | Accurate durable model/runtime knowledge, no whole-library/language-quality inference. |
| Multimedia management | Existing `generate_speech` fields and dialogue JSON example; exact per-line styles/global fallback; two featured speakers; local negatives before paid request; preserved output; inherited configuration transition. | Users and maintainers need the actual current tool contract rather than ticket-only prose. |
| Secret management | Voice/style calls use only configured mode; no catalog/key fallback; safe external error boundary; explicit isolated import and consumed paid-call authorization. | Prevents unsafe credential or evidence assumptions. |

## Durable Design / Runtime Knowledge Promoted

| Topic | Ticket authority/evidence | Long-lived home |
| --- | --- | --- |
| Single-speaker ID capable, not catalog-wide verified | Approved requirements SR-012, design SR-015, implementation IR-002; current factory/client/help | Provider catalogs; multimedia management |
| Ordered nullable style entries / one canonical turn array | Design + `generate-speech-schema.json`; adapter and 13-case public E2E | Provider catalogs; multimedia management |
| Privacy, failure and configured-mode preservation | Requirements AC-006/007; source CRR-001, API deterministic negatives | Provider catalogs; multimedia and secret management |
| Provider/audible evidence limits | API-REV-003 and live evidence log; CRR-002 | Qualified docs statements; handoff retains exact provenance/counts |
| Inherited 3.8 model/default/setting transition | Effective pinned prerequisite source; separate old CRR-008/API-REV-007 | Provider catalogs; multimedia management; old acceptance is NOT inferred |

## Removed / Replaced Concepts Recorded

- Old-list-only single-speaker voice enum/rejection → nonempty exact ID string with qualified featured/tested help; dialogue enum remains featured-only.
- Global-only style limitation → optional per-line string/null style overrides; old global-only calls still use the same path.
- Raw provider/SDK error interpolation → fixed categories and safe HTTP status, no provider body/message/cause disclosure.
- Stale long-lived TTS rows → current 3.8 Flash/Flash-Lite rows, no retired aliases.

## Delivery Continuation

- Docs sync result: **Pass / Updated**, not a no-impact decision.
- Checks: `git diff --check` plus local doc/schema/link consistency check; no production or durable test edit by Delivery.
- Next action: explicit user delivery verification/acceptance and release decision. Separately reconcile old `gemini-38-tts-upgrade` DR-004 verification/finalization hold before any transitive target merge/push/release.
- API-REV-003 remains the upstream validation authority for the b1416a4bb candidate, reported 95.0%; Delivery's fresh non-paid tests separately cover b76e65f integration. Exactly three historical authorized Vertex Express calls remain three; no new call/import/private-source read or audition. User “sounds great.” is bounded qualitative listening evidence, not delivery acceptance or broad acoustic/language quality.

## DR-003 Latest Accepted Combined State

Post-signal latest origin/personal777548b05 integrated via97775019d; old authoritative package carried througheda59e585/archived39b9f473e. Same non-ticket source/docs tree; Gemini source/SDK/lock/schema behavior unchanged by unrelated base,271 current focused tests/install/serverbuild Pass. Three canonical docs remain truthful and unchanged; no extra semantic doc edit required. Old3docs-only reconciliation selected current richer combined docs, preserving saved-setting transition. User combinedacceptance/beta choice received; old verificationhold is no longer current. Current docs sync **Pass**.
