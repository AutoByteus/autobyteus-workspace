# User Verification Handoff — Gemini 3.8 TTS

## Ready for verification, not yet released

- Ticket: `gemini-38-tts-upgrade`; Large / High, independently reviewed route.
- Candidate: `codex/gemini-38-tts-upgrade` merge `c6586a07f3c2585aa13673875c1bc34c971b6e5e`, current with `origin/personal` `b0b077b02571098a6bf7993ab46b67a69fdb8f9d` at the 2026-10-01 delivery refresh. Docs/report changes after the merge are local and uncommitted until user verification.
- Integrated gates: `ARCH-REV-002` Pass; `IR-003` lock integration; `CRR-008` source Pass; `API-REV-007` Pass / 95.0% with broader validation executed; `CRR-009` test-code review Not Applicable (no new durable test changes) and prior `CRR-007` five-path test-code Pass retained. Delivery docs sync: Pass (`docs-sync-report.md`). DR-001's conflict is resolved in DR-002.

## What changed

- Gemini speech choices are `gemini-3.8-flash-tts` (the blank/default speech selection) and separate `gemini-3.8-flash-lite-tts`. Retired built-in 3.1 Flash preview, 2.5 Flash and 2.5 Pro TTS IDs are removed without runtime aliases. OpenAI audio choice remains.
- The Gemini client sends verbatim transcript text with separate speech style/speaker metadata, supports the existing single-/multi-speaker input contract, and returns a validated nonempty WAV file or explicit error rather than treating malformed output as success.
- A saved retired built-in speech selection in the server data `.env` is durably changed to 3.8 Flash while preserving other assignments. An inherited retired process-environment setting instead blocks startup and requires operator correction. No production database/vault migration is required.
- Shared `@google/genai` is upgraded to 2.24.0; Gemini LLM/image/video behavior was regression-checked but their catalogs were not changed.

## Verification evidence and limits

- On integrated merge `c6586a07f`: frozen offline install and server build passed; core Google/OpenAI audio/LLM/image/video tests **76/76**, server config/migration tests **80/80**, web Settings tests **27/27**, server API E2E **23/23**, live-helper/harness tests **22/22**. Rendered Settings on an isolated built backend showed default 3.8 Flash, separate Flash-Lite and preserved OpenAI choice, without retired Google choices. Exact scoped audio/LLM no-import preflight **2/2** was ready but had expected missing secrets; it did not call Google.
- A genuine **pre-integration** one-call Vertex Express `gemini-3.8-flash-tts` request on 2026-10-01 produced a nonempty >44-byte RIFF/WAVE file after adapter validation (`API-REV-005`). The integrated merge did not change the adapter/model/mode/SDK identity and passed current deterministic/API/browser checks; no additional paid call was made. Historical AI Studio quota failure is a separate mode/key limit. Future provider access is not guaranteed, and no human listened to the output during validation.

## Requested user check and decision

### Electron test build (2026-10-02)

An Apple Silicon **personal** macOS build of this candidate completed from
`c6586a07f` (local package version `1.4.92-beta.5`):

- App: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.92-beta.5.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.92-beta.5.zip`

The worktree build is **unsigned/unnotarized** and not an installed or published
release. An isolated-launch smoke test reached the embedded backend and main
window; its disposable instance was stopped and its data root removed. To test
without touching your installed app or production data, run from this worktree:

```bash
pnpm --silent isolated-app start --from-worktree
# use the reported instanceId when finished:
pnpm --silent isolated-app stop <instanceId>
```

The upstream `personal` branch has since advanced to `e04cfef23` (42 commits
beyond this candidate, including version `1.4.92-beta.9`). This local build
tests the reviewed Gemini candidate, **not** those later base changes. Delivery
must refresh and assess the target again before finalization; a material
change requires renewed verification and possibly a rebuilt app.

**Active user test instance (2026-10-02):** At your request, the isolated app
was started and left running as `iso-64476-efa6` with backend
`http://127.0.0.1:64477`. Its test-owned database is
`file:/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-isolated-root-pmDaYI/server-data/db/production.db`.
This is not the installed app or production data. When finished, tell Delivery
to stop it or run `pnpm --silent isolated-app stop iso-64476-efa6` from this
worktree; the automatically created test data root will then be removed.

1. In a build of this candidate (not the already-installed app), inspect **Settings → Server Settings → Default media models → Speech generation**. Confirm 3.8 Flash is the blank/default selection, 3.8 Flash-Lite can be selected, OpenAI remains, and old Gemini speech IDs are absent.
2. If you have an authorized Gemini setup in an isolated/test instance, generate a short single-speaker clip with 3.8 Flash and listen to it; optionally check style and a two-speaker mapping. This is a user check, not a claim that Delivery performed manual listening. Do not put owner credentials into a production vault just for this test.
3. Confirm whether the integrated behavior is accepted for finalization, and choose **stable release**, **beta release**, or **merge only/no release**. A stable release uses the prepared `release-notes.md` through the documented root `pnpm release` flow after merging to `personal`; a beta uses generated notes. No release or deployment has occurred.

Please report any mismatch, or explicitly confirm verification/acceptance and the desired release path. Delivery will refresh `origin/personal` again before finalization; any material change to this verified state requires renewed verification.
