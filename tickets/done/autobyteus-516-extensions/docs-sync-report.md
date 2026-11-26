# Docs Sync Report — autobyteus-516 Stage 1

## Scope

- Ticket: `autobyteus-516-extensions` (Stage 1: the extension foundation on every node, proven by moving Voice Input onto it)
- Trigger: code reviewer's `Pass` (CRR-002 implementation review, CRR-003 test-code review) after API/E2E `API-REV-001` `Pass` at 95%. Route: `Reviewed` (architecture review ARCH-REV-002, source review, API/E2E, test-code review). `task_size` `Large`, `architectural_risk` `High`.
- Bootstrap base reference: `origin/personal` @ `fdde5406fa`
- Integrated base reference used for docs sync: `origin/personal` @ `fdde5406fa` (fetched at the start of delivery; it had not advanced, so the branch was already current and no merge was needed)
- Post-integration verification reference: not needed (no new base commits). The branch head reviewed and validated was `9002db14e6`; docs sync starts from it.

## Why Docs Were Updated

- Summary: this change moves the extension manager from Electron to every node, deletes the desktop-only Voice Input install, and adds a second repository with a signing key. The docs the change added match the code. Docs that described the removed desktop manager, and the release guide, needed to follow.
- Why this should live in long-lived project docs: a reader of the packaging doc would look for the Voice Input install under `~/.autobyteus/extensions` and in Electron IPC, which no longer exist, and a delivery engineer cutting the next release would not know that the app's catalog key and the extensions repository are release prerequisites.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | The ticket added rule 9's second exception and rule 13; the project design document | Updated | The rules match the code and the module doc. One example in rule 13 said the extension contract was proved by prototypes "with the real voice runtime and a real Tailscale library". The Tailscale prototype (`probes/network-probe`) proved the Private Network design, not the extension contract; the contract probe (`probes/contract-probe`, 31/31 with the real voice runtime) changed three details (`server/index.mjs`, the bridge accepting only its own frame, the existing install moved). The example now says that. The rule itself is untouched. |
| `TESTING.md` | The testing guideline; new probes and a gated real-release test were added | No change | It says not to describe one suite or probe; the new probe `test:e2e:extensions-page` and `test:voice-input-real-release` (server) are found through `package.json` and their file headers. It never named the removed web `test:voice-input-real-release`. No discrepancy recorded by the ticket's reports. |
| `RELEASE.md` | The release guide; a second repository with a signing key and a built-in public key now exist | Updated | See Docs Updated. |
| `GLOSSARY.md` | The ticket added the Extensions section | No change | Terms (extension, catalog, offered on, server part, action, extension page) match the code and the module doc. |
| `autobyteus-server-ts/docs/modules/extensions.md` | New module doc | No change | Spot-checked against the code: the 10 s catalog bound, 5 s status and stop bounds, 100 MB action body, 1 MB log with 200-line tail, the six error codes and their HTTP statuses, `AUTOBYTEUS_EXTENSIONS_CATALOG_URL`/`_PUBLIC_KEY`, 30 min idle stop, the `<data dir>/extensions` folder (the packaged run shows `server-data/extensions/voice-input/data`). |
| `autobyteus-server-ts/docs/design/node_access_model.md` | NA-7 wording and NAS-42/43 added | No change | Matches the route table and the API-10/API-12 401 results. |
| `autobyteus-web/docs/electron_packaging.md` | Described the removed Electron managed extension | Updated | See Docs Updated. |
| `autobyteus-web/docs/projects.md` | Names the Electron Voice Input extension and IPC doubles | Updated | See Docs Updated. |
| `autobyteus-web/docs/memory.md` | Memory search voice button | No change | "With the local Voice Input extension available" is still true (this computer's Voice Input). |
| `autobyteus-server-ts/docs/README.md` | Module index | No change | It names a few modules as examples, not every module; `extensions.md` sits in `modules/` like the others. |
| `tickets/in-progress/autobyteus-516-extensions/design-spec.md` | The code reviewer named line 241 | Updated | See Docs Updated. |
| `autobyteus-extensions/README.md` (the second repository) | Its release order and key setup | No change | Matches the node's docs and the code. The repository is local only. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Corrected | "Managed Voice Input Extension" is now "Voice Input Extension": the node's Extension Manager installs it from the signed catalog; install location `~/.autobyteus/server-data/extensions/voice-input/data`; lifecycle (Install ends On, Turn on/off, Update keeps settings and a failed update keeps the old version, Remove); the microphone choice and Test belong to the renderer; the old `~/.autobyteus/extensions` install is deleted once by the sealed client-data step. The Data Directories tables name `server-data/extensions` and drop `<isolated-root>/extensions/` (the E2E path plan no longer creates it, CR-001). The capture section says "transcription request" where it said IPC, and "Extension HTTP test fixtures … catalog entry or runtime manifest". | The text described the Electron manager and its IPC, which this change deleted. |
| `autobyteus-web/docs/projects.md` | Corrected | "The existing installed/enabled local Electron Voice Input extension" is now this computer's Voice Input (installed, on and ready on the desktop's own node); "uncancellable IPC" and "worker/IPC doubles" now say transcription request; the `--voice-input` probe paragraph says the extension availability read and the transcription request are fixtures answered at the network. | Same reason; the probe change is API-02/API-03's (commit 75eab7845a). |
| `DESIGN.md` | Corrected (an example, not a rule) | Rule 13's example no longer credits a Tailscale prototype with proving the extension contract. | The ticket's own record (SR-004, `probes/contract-probe`) shows which prototype proved it. |
| `RELEASE.md` | Added (two sections, no existing rule changed) | **Extensions catalog check** under Checks Before Tagging: before every beta and stable tag the built-in `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` must be non-empty and equal the extensions repository's `catalog-public-key.pem`, and the `catalog` release must hold the catalog and its `.sig` and list `voice-input`; a failing check is a blocker. **AutoByteus Extensions** in the Workflow Reference: the separate repository, its two workflows, the signing secret, the public key built into the app, key changes are a coordinated change. | The app's first start deletes the old Voice Input install, and nodes install only from the signed catalog, so a tag without a working catalog takes dictation away. The founder's decision that releases need his word and that the empty key is a blocker was relayed by the Solution Designer and the code reviewer; the two sections write that down. Proposed to the founder for confirmation (see the release report). |
| `tickets/in-progress/autobyteus-516-extensions/design-spec.md` (Solution Designer's document) | Corrected | Line 241: the catalog is fetched "when the Extensions page opens (…; the approved UI has no "Try again" control, so opening the page again is the retry)". | The approved UI has no such control; the code comment was already corrected in IR-002. |
| `tickets/in-progress/autobyteus-516-extensions/follow-ups.md` | Added | FU-005 (below). | A problem outside this ticket found in docs sync. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The extension contract, version 1 | Parts 1–5 are frozen across versions; the node's own API and stored state are one release with the app | `extension-contract.md`, `design-spec.md` | `autobyteus-server-ts/docs/modules/extensions.md`, `DESIGN.md` rule 9 (second exception) — already promoted by implementation, checked here |
| Extension versus integration | An extension runs code on the node and comes only from the signed catalog; an integration is imported content | `requirements-doc.md` (DEC-002) | `GLOSSARY.md`, the module doc — already promoted, checked here |
| Owner-only extension routes | Phones and unauthenticated clients are refused | `use-case-spines.md` (NAS-42/43) | `node_access_model.md` — already promoted, checked here |
| Where Voice Input lives and how it is transcribed | The embedded node's extension, installed under `server-data/extensions`, used by every window through the node's action route | `design-spec.md`, `implementation-handoff.md` | `electron_packaging.md` (updated), `projects.md` (updated) |
| The catalog and its key as a release prerequisite | The built-in public key, the second repository and its secret, the check before tagging | `implementation-handoff.md` (Known Risks), the founder's blocker | `RELEASE.md` (added) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Electron `ManagedExtensionService`, `extensionCatalog`, `voiceInputRuntimeService`, `extensionIpcHandlers`, preload members | The node's Extension Manager (`autobyteus-server-ts/src/extensions/`) and the Voice Input package | `modules/extensions.md`, `electron_packaging.md` |
| `VoiceInputExtensionCard.vue` (Settings → Extensions card of the desktop) | `ExtensionsManager.vue` with `ExtensionCard`, `ExtensionDialogs`, `ExtensionPageFrame`, `VoiceMicrophonePanel` | `modules/extensions.md`, `electron_packaging.md` |
| `~/.autobyteus/extensions` (old install root) and `<isolated-root>/extensions/` | `<server data>/extensions` of each node; the old folder is deleted once by the sealed client-data step | `electron_packaging.md` (Data Directories, Voice Input Extension) |
| Electron IPC transcription (`transcribeVoiceInput`) | `POST /rest/extensions/voice-input/actions/transcribe` on the embedded node | `modules/extensions.md`, `electron_packaging.md`, `projects.md` |
| Web `test:voice-input-real-release` | `autobyteus-server-ts` `test:voice-input-real-release` | the test's header; no project document named the old one |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used; docs were updated.

## Findings Outside This Ticket

- FU-005 (`follow-ups.md`): `autobyteus-web/scripts/lib/localizationLiteralAudit.mjs` still names the deleted `settings/VoiceInputExtensionCard` in `VUE_SCRIPT_AUDIT_FILE_PATTERN`. Harmless (the audit passes: `[audit:localization-literals] Passed with zero unresolved findings.`, rerun by delivery), in an untouched file, so a follow-up.
- Not touched and not a finding: `frontend-execution-evidence/` at the repository root holds old tracked logs that name the removed files. They are evidence of an earlier change, not documentation.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, move the ticket to `tickets/done/`, commit, Secret Gate, finalize.
- Notes: a claim in the module doc that no reviewer could have checked against a published catalog (the built-in URL `https://github.com/AutoByteus/autobyteus-extensions/releases/download/catalog/…`) is unverified until the founder creates the repository; the packaged run reached the catalog through the documented developer override.
