# Handoff Summary

## Summary Meta

- Ticket: `autobyteus-516-extensions` (Project Task `autobyteus-516`; requested by `/project_task_manager` for the founder). This is **Stage 1** of AutoByteus Extensions: the extension foundation on every node, proven by moving Voice Input onto it. Later stages (`staged-plan.md`) are separate work.
- Date: `2026-11-26`
- Classification: `task_size: Large`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-002 Pass; source review CRR-001 Local Fix then CRR-002 Pass; API/E2E API-REV-001 Pass at 95%; test-code review CRR-003 Pass).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/autobyteus-516-extensions`, base `origin/personal` `fdde5406fa` at bootstrap and at delivery (the base had not advanced; integration method: already current).
- Delivery rounds: `DR-001` delivered (`delivery-revision-record.md`).
- Second repository: `AutoByteus/autobyteus-extensions` does not exist on GitHub yet (the founder creates it). Its content is a local git repository, `/Users/normy/autobyteus_org/autobyteus-extensions`, branch `main` @ `4d00904`, clean. Delivery did not push or publish it.

## Delivery Summary

- Delivered scope:
  - **Every node has an Extension Manager** (`autobyteus-server-ts/src/extensions/`): signed catalog (Ed25519), package installer (SHA-256, safe unpack), Server Part Host, `state.json`, per-extension log. Transport is owner-only: GraphQL `extensions`, `extensionLog` and four lifecycle mutations; `POST /rest/extensions/:id/actions/:action`; `GET /rest/extensions/:id/ui/*`.
  - **Voice Input is an extension** of the desktop's own node (package in the second repository), used by every window, including windows of other nodes. The Electron manager, IPC, preload members and the old card are removed (about 3,670 lines of web code).
  - **Settings → Extensions** page: node line, cards (install, on/off, update, remove, log), sandboxed extension page with a message bridge, the microphone panel and Test. en and zh-CN.
  - **The old desktop Voice Input install is deleted once** at the first start after the update (sealed client-data step, DEC-016: `Discard or Rebuild`); Voice Input is installed again from its card.
  - **Docs:** GLOSSARY, `modules/extensions.md`, DESIGN.md rule 9 (second exception) and rule 13, `node_access_model.md` (NA-7, NAS-42/43).
- Docs synced by delivery (`docs-sync-report.md`): `electron_packaging.md` and `projects.md` (they described the removed Electron manager and IPC), `DESIGN.md` rule 13's example, `RELEASE.md` (an Extensions catalog check before tagging, and an AutoByteus Extensions section), the ticket's `design-spec.md` line 241 ("Try again").
- Durable coverage: server unit and integration tests for the manager, parts and routes; a gated real-release test (`test:voice-input-real-release`); the Extensions page probe (`test:e2e:extensions-page`) with the update cases U1/U2; the voice probes repaired; three baseline fixes in the Projects probe (Rule 9).

## Delivery's round

- **DR-001** fetched the base (unchanged), read the evidence behind each critical criterion, synced the docs (above), wrote the release notes and finalized. It found no defect. It found one follow-up (FU-005).

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001 to AC-011) is directly proven; AC-012 (docs) is proven by review and delivery's docs sync. Nothing needs the user's check. No evidence decision (`DEC-*`) accepted an unverified risk; the two parts the report leaves out of its proof (the real OS window focus event in AC-009, the real microphone device) are named below.
- Final confidence 95% (96, 96, 95, 95, 96, 95, 95); no category below 90%; the default target is met.
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001, AC-002, AC-005, AC-007: the packaged window's install (API-10): 101 s, phases "Downloading Voice Input 1.0.0" to "Preparing the speech model…" to "On"; `refused: []`; the page's frame is `sandbox="allow-scripts"` on `/rest/extensions/voice-input/ui/index.html`; Test 360 ms with the transcript "Please summarize the meeting notes and send them to the team."
  - AC-003: API-11: 1.0.1 updated while On with one worker; 1.0.2 failed with "Update to 1.0.2 failed: Could not download …v0.3.99/voice-input-runtime-manifest.json: HTTP 404", the version stays 1.0.1, and the Test after the failure transcribes (332 ms).
  - AC-004, AC-010: API-12: the Docker node's window (screenshot opened) lists that node's own extensions, no Voice Input card, the voice note, and "There is no build for this computer, Linux (ARM). Offered for macOS (Apple silicon), Linux (x64)."
  - AC-006: node-access scenarios NAS-42/43 in the unit suite; API-10 and API-12 show 401 `NODE_CREDENTIAL_REQUIRED` without a credential on a real embedded and a real Docker node.
  - AC-008: API-08/API-09: "Removed the old desktop Voice Input install …" in start 1, nothing in start 2, Install works; a locked file logs "Could not remove …" and the start continues, the next start removes it.
  - AC-009: API-13: dictation in the Docker node's window went to the embedded node (`127.0.0.1:56339`), not to the Docker node; after Off, a focus event moved `readGeneration` 9 to 10 and `micButtons` 1 to 0; a stale press gives 409 `EXTENSION_OFF`.
  - AC-011: API-12: a failing status probe shows only that card Failed; Hello Node still answers; the node restarted with the same states.
  - Whole-change checks: API-01 server e2e "Tests 575 passed", no `×`; API-05 fresh-start build "[typecheck] PASS", build `exit 0`; API-15 the build-only release run succeeded on all five desktop targets (run 45869596069); API-14 warm transcription +16 ms (limit +500 ms).
- Integrated-state checks by delivery: the base had not advanced, so none were needed; delivery's only code-adjacent run was `pnpm -C autobyteus-web audit:localization-literals` (passes) and `scripts/check_repository_artifact_hygiene.py` (passes).

## Residual Risks For The User

- **Release blocker: the catalog key.** `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` (`autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts`) is empty until the founder creates the catalog key. Until then, every node shows `unverified` and nothing installs. A release made now would delete users' working Voice Input at the first start with no way to install it again. The second repository also needs `catalog-public-key.pem`, the secret `EXTENSIONS_CATALOG_SIGNING_KEY`, the first voice-input package release and then the catalog release (the order is in its README).
- **The real OS window focus event** (AC-009) was proven with a dispatched `focus` event in the packaged renderer plus the two other real triggers (surface reopen and a stale press).
- **The microphone** was emulated in the packaged window; the OS device path is unchanged by this ticket.
- **Signing, notarization and the other operating systems' installs** run only on the release runners; the build-only run covers their build.
- **Server parts run in the node's process** (an accepted deviation): a server part that blocks the event loop blocks the node. Status and stop are bounded at 5 s.
- **Voice runtime 0.3.2 needs Homebrew `ffmpeg` on Apple Silicon**; a failed start shows the worker's reason ("Could not start: …"), unit-tested with a scripted worker.
- **The built-in catalog URL** has not been reached on a published catalog; the packaged runs used the documented developer override.

## Follow-ups

`follow-ups.md` lists, for the Solution Designer to send (none sent yet; none urgent):

- **FU-001:** align the phone vocabulary with the founder's naming rule (pair = two nodes; access code = a client gets control of a node).
- **FU-002:** the Settings page on narrow widths (the Product Team's DC-064).
- **FU-003:** split `voiceInputStore.ts` (496 effective lines, the next change crosses the 500-line guardrail).
- **FU-004:** `projects-feature-probe.mjs` PT-E2E-017 timed out once under load (pre-existing).
- **FU-005:** `localizationLiteralAudit.mjs` still names the deleted `VoiceInputExtensionCard` (found by delivery).

## Release

- No release: none was asked for, and `RELEASE.md` makes none the default; the founder releases only on his word. A release is available once the blocker above is cleared: `release-notes.md` holds the user-facing notes, with a `## What you need to do` section (install Voice Input again). The `RELEASE.md` Extensions catalog check must pass before any tag.
