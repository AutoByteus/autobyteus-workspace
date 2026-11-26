# Requirements Document — AutoByteus Extensions, Stage 1: the extension foundation, proven by migrating Voice Input

## Document Status

- Status: `Approved` (SR-005). Founder 2026-11-22, after repeated requests for a yes on the contract and DEC-011/012/013 plus the voice move: "Okay let's continue" — taken as approval of extension-contract.md (as validated) and those points; recorded for correction if misread.
- Current solution revision ID: `SR-006`
- Package identifier: `autobyteus-516-extensions`
- Request / ticket: autobyteus-516, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; proposal *AutoByteus Extensions — Design Proposal* (2026-11-17)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-21
- Approved by and reference: the founder, 2026-11-21. DEC-001 in his words ("the extension should be actually server side feature"); then, asked to approve the Stage 1 requirements and DEC-002, he told the Solution Designer to stop asking case by case and to decide the abstraction the way it is typically done ("can you just think I don't ask each case"). Taken as approval of the Stage 1 requirements as presented, with DEC-002 decided by the Solution Designer as recommended; the founder still approves the Stage 1 design before anything is built.
- Exact approved requirements baseline / solution revision: SR-001 (recorded approved in SR-002)
- Behavior-defining supplements and their approved versions: none. `staged-plan.md` is informative (the whole direction); it is not approved by approving Stage 1.

This document covers **Stage 1 only**: the extension foundation and the migration of the existing Voice Input extension onto it (the founder's 2026-11-21 sequencing). Later stages (Remote Network, Shared File System, integration, onboarding, local inference) each get their own requirements and the founder's approval of their design before anything is built; see [staged-plan.md](staged-plan.md).

## Problem And Desired Outcome

- Problem: AutoByteus already has an "extension" mechanism, but it was built for one extension: it lives only in the desktop app's Electron main process, its types and messages are Voice-Input-specific, and a node without the desktop app (a Linux agent server, a Docker node) has no extension concept at all. The next extensions the founder wants (private networking, shared storage) are host capabilities that must work on headless servers. Building them on the current mechanism would mean a second extension manager.
- Affected actors or systems: the owner using the desktop app; every node (embedded, remote server, Docker); later, phones.
- Desired outcome: one small extension foundation that every node has, desktop or headless, with a clear lifecycle (install, enable, disable, update, remove), settings, status and logs; and Voice Input running on it with no visible regression and no loss of the founder's existing install.
- Observable definition of success: the founder opens Settings → Extensions in any node window and sees that node's extensions; Voice Input works exactly as before on his Mac without re-installing; a Docker/Linux node shows its own extension list from a desktop window bound to it; the contract is documented so Remote Network and Shared File System can be added as entries, not as a new framework.

### What "extension" means in this product (proposed definition)

An **extension** is an optional, first-party capability of a node that brings or manages something outside the AutoByteus core process: a runtime the app downloads (Voice Input's speech worker, later a local inference engine) or a system service installed by its own official installer that the extension detects, guides and reports on (NetBird or Tailscale client, AutoByteus NFS). Each extension has an ID, name, version, the platforms it supports, what it needs (OS permission, administrator approval, download size), a lifecycle (install, enable, disable, update, remove), settings, a status with errors, and a log. A node works fully with no extension installed.

**Extension versus integration** (the founder's question, DEC-002):

| | Integration (exists: Integrations page) | Extension (this ticket) |
| --- | --- | --- |
| What it is for | Lets **agents** use an outside service (GitHub, Jira, SSH) | Adds a **capability to the node/app itself** (voice dictation, private network, shared file system, later local models) |
| What it contains | A skill (instructions and scripts) plus `integration.json`; never app code | A package signed by AutoByteus: its description, a server part the node runs, its own page, and the programs it downloads (or control of a system service) |
| What it can touch | Only the outside service, through the credential proxy; the token stays in the vault | The computer: processes, microphone (via the client), network interfaces, mounts; some steps need the OS administrator prompt |
| Who uses it | Agents that have its skill | The user and the node; agents only indirectly (for example a shared file system) |
| Where it comes from | Any GitHub repository or folder the user imports (third-party allowed) | Only AutoByteus's own extensions, listed in a catalog signed by AutoByteus; each in its own (possibly private) repository (DEC-010, DEC-011) |
| How it is updated | Skill-source update check | When the signed catalog lists a newer version: **Update** on its card, without touching anything else and without an app release (DEC-010) |

They share words (installed, on/off, status) but not machinery: an integration imports content, an extension runs binaries or controls root services. Merging them would either let imported repositories ship executable code or make every integration carry a runtime lifecycle it does not need. An extension may later *include* a skill for agents (for example "the shared file system is at …"), which is composition, not a merge.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Settings → Extensions shows one Voice Input card, managed by the desktop app (Electron) | The page lists the extensions of **the node of that window**, from a catalog with any number of entries, each with state, supported platforms and needs | Voice Input card's actions, phases, progress, language/microphone choices and Test panel | investigation-notes BEH-001 |
| BEH-002 | System | SCN-003 | Transcription runs in the desktop app's own process tree | Transcription is done by the Voice Input extension of a node | Text inserted into the draft, never auto-sent; no-speech / mic-denied / failure states | BEH-002 |
| BEH-003 | User | SCN-003 | Voice in composer, Task description, Project description, Memory search, Settings test | Same surfaces, same rule: shown when Voice Input is installed and enabled | All five surfaces unchanged | BEH-003 |
| BEH-004 | User | SCN-005 | A desktop window of a remote node uses this computer's voice runtime | Same: a desktop window of any node dictates with **this computer's** Voice Input | Unchanged for the user | BEH-004 |
| BEH-005 | Operational | SCN-006 | Headless nodes have no extensions | A headless node has the same extension list and lifecycle, managed from a desktop window bound to it | — | BEH-005 |
| BEH-006 | Contract | SCN-007 | No extension routes | Managing extensions needs the owner credential; a phone credential is refused | Node access model rules | BEH-006 |
| BEH-007 | Data | SCN-004 | Founder's Voice Input: installed 0.3.0, enabled, English, chosen microphone | After the upgrade: the old install is deleted once; Voice Input shows Not installed and is installed again with one click (DEC-016) | Nothing (founder 2026-11-26) | Persisted data facts |
| BEH-008 | System | SCN-008 | A broken install shows "Runtime installation is incomplete" | A broken or unreadable extension shows an error on its own card with a message and log; the node, the app and other extensions keep working | Error message and Reinstall path | BEH-001 |
| BEH-009 | User | — | Integrations page imports skill sources | Unchanged; documented as a different concept | Entire Integrations behavior | BEH-007 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder / owner (desktop) | Manage optional capabilities, dictate | One place per node; voice unchanged | No regression, no re-download |
| Headless node owner | Manage a Linux/Docker node's extensions | Same list and lifecycle from a desktop window | Owner credential only |
| Phone user | (Stage 1) none | Cannot change extensions | Node access model |
| Next extensions (Stages 2–3) | Join the foundation | Entry + implementation, no new framework | Privileged steps stay with the OS prompts |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | See a node's extensions with state, platform support and needs | SCN-001, SCN-006 |
| UC-002 | Install, enable, disable, update, reinstall and remove an extension; change its settings | SCN-002 |
| UC-003 | Read an extension's status, last error and log | SCN-002, SCN-008 |
| UC-004 | Dictate on every existing voice surface, in a window of any node | SCN-003, SCN-005 |
| UC-005 | Upgrade with an existing Voice Input install: the old install is removed, Voice Input is installed again (DEC-016) | SCN-004 |
| UC-006 | Read what an extension is and how it differs from an integration | SCN-009 |

### Out Of Scope

- Private Network (proposal: "Remote Network"), Shared File System (proposal: "Shared File System"), Local Inference Runtime extensions (Stages 2, 3, 6) and any change to network admission, the Docker launcher, NetBird, Tailscale or the NFS tool.
- Any change to the voice engine beyond PRE-001 (runtime 0.3.2 = 0.3.0 with the readiness fix; runtime v1.0.0 adoption is a later stage, DEC-003).
- Voice on the phone or in a plain browser (needs a secure-context answer; later stage).
- Third-party extensions or an extension marketplace (DEC-002).
- Any change to integrations, skill sources, agent/application packages.
- A command-line tool for extensions on headless nodes (DEC-006).

### Non-Goals

- Better transcription quality or speed (no engine change in Stage 1).
- A visual redesign of Settings → Extensions beyond what a multi-entry list needs.

### Preserved Behavior Boundary

BEH-002, BEH-003, BEH-004, BEH-007, BEH-009 outcomes; every existing voice test's user-visible outcome (`autobyteus-web` voice integration/lifetime tests).

### Prerequisites

PRE-001 (voice runtime readiness) is delivered (autobyteus-655, runtime 0.3.2, 2026-11-26); Stage 1 waits only for the founder's design approval (founder 2026-11-26: "whatever is more reasonable architecture-wise … you will decide"). Later stages have known dependencies in other functionality or Projects (network admission, Docker publishing, an unprivileged NFS status); they are listed in [staged-plan.md](staged-plan.md) and will be raised as Tasks when their stage starts.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| PRE-001 | Voice runtime 0.3.x reports "ready" before it has loaded anything: `voice_input_worker.py` emits `{"type":"ready"}` right after building the backend (lines 174–177); both backends load lazily inside the first transcription (MLX lines 87–93, faster-whisper 113–123), and silence is answered by an RMS check before any model use (lines 35–50, 203). Measured: every first dictation waits ~30 s; warming with silence loads nothing (warm-up probe 2026-11-26). Recorded as a known flaw in Aug 2026 (voice-input-runtime-reliability BEH-002). Without the fix, REQ-012 and an honest "Getting ready" state need a workaround outside the runtime (a tone clip). | REQ-012, AC-007; extension-contract §4 status/start | /project_task_manager → **autobyteus-655** (created 2026-11-26; assigned to software_engineering_team_2c4d41e9…, SD solution_designer_55a12a21…; branch from the v0.3.0 line; release only on the founder's word) | **Delivered and closed 2026-11-26** (PM verified; autobyteus-655 closed on the founder's word): voice runtime **v0.3.2** (v0.3.1 published nothing); `ready` only after the model is loaded and one transcription is done; a failed start writes the reason on stderr and exits 1; Apple Silicon needs Homebrew `ffmpeg` (removal is a separate runtime Task, not awaited). Pin 0.3.2 |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every node has one extension manager that works with or without the desktop app; the desktop shows and operates the extensions of the node of each window | BEH-001, BEH-005 | Must | Headless principle; one owner instead of two | N/A | Proposal §2.5, §6; DEC-001 |
| REQ-002 | Extensions come from a catalog signed by AutoByteus (first-party only; each extension a separately released package). Each entry states ID, name, description (including what it needs), version, supported platforms and where it is offered | BEH-001 | Must | Security; the user sees what an extension needs before installing | Validated: signed catalog and refusals (contract-probe) | Proposal §2.6; DEC-002, DEC-010, DEC-011; extension-contract.md §1, §3 |
| REQ-003 | Lifecycle per extension: install (with phase progress), enable, disable, update (when the signed catalog's version is newer than the installed one; settings kept), remove (Remove + Install replaces Reinstall, DEC-015); extension-owned settings. States include "not available on this platform" | BEH-001 | Must | Proposal: installed, configured, enabled, disabled, updated independently | v0.3.0 manifest lacks linux-arm64 (measured) | Proposal §1, §6 |
| REQ-004 | Each extension reports its state, a human message and its last error, and has a log the user can read from its card | BEH-008 | Must | Status and logging are in the proposal's minimum | N/A | Proposal §6 |
| REQ-005 | Changing a node's extensions or their settings needs the owner credential; other credentials are refused with the node access model's refusals | BEH-006 | Must | Secure by default; least privilege | N/A | Node access model; DEC-005 |
| REQ-006 | Voice Input runs as an extension of this foundation with the same user-visible behavior on all current voice surfaces (composer, Task description, Project description, Memory search, Settings test) | BEH-002, BEH-003 | Must | Founder's proving milestone | Existing voice tests (Read) | PM comment 2026-11-21 |
| REQ-007 | An existing Voice Input install from the desktop app (`<base data folder>/extensions`: `registry.json`, `voice-input/`) is deleted once when the new version first starts, before anything else reads it; Voice Input then shows Not installed and is installed again from its card (runtime and model downloaded; language and microphone chosen again). The app keeps no reader of the old install | BEH-007 | Must | The move would save only the speech model download (runtime 0.3.1 is new anyway) at the cost of the most delicate part of Stage 1; a fresh install is measured (75 s, ~1.7 GB, dictation works) | UP V2 fresh install (Measured) | DEC-016 (founder) |
| REQ-008 | In the desktop app, dictation in a window of any node uses this computer's Voice Input, as today | BEH-004 | Must | No regression for remote-node windows | A-001 to verify in design | DEC-001 |
| REQ-009 | A broken, incomplete or unreadable extension affects only its own card: the node starts, other extensions and the app keep working; nothing is deleted automatically | BEH-008 | Must | DESIGN.md rule 7 applied to extensions | N/A | DESIGN.md |
| REQ-012 | When Voice Input is on, its speech model is loaded in the background after AutoByteus starts (and after turning it on), so the first dictation does not wait ~30 s; it is unloaded after a long idle time to free memory | BEH-002 | Should | Measured: every first transcription after the voice program starts waited ~30 s (contract-probe, use-case probe V2/V3); later ones ~0.2 s | Measured (warm-up probe 2026-11-26): warming with a 1 s tone takes 29.4 s in the background, then the first dictation takes 0.25 s; silence does **not** warm it (answered "no speech" without loading); the warm worker holds ~850 MB, so it is unloaded after 30 minutes idle (the next dictation then shows the slow note) | DEC-015 |
| REQ-011 | Each extension states which computer it is for: the computer the user works at (Voice Input: offered only on the desktop's own node, used by every window) or the computer a server runs on (Private Network, Shared File System: offered on every node). A node lists only the extensions meant for it | BEH-001, BEH-004, BEH-005 | Must | Voice serves the person at the keyboard; network and storage serve the host (founder 2026-11-21) | N/A | DEC-009 |
| REQ-010 | The project documents say what an extension is, how it differs from an integration, and how a new extension joins the foundation (GLOSSARY and a module doc) | BEH-009 | Should | The founder's question; the contract for Stages 2–3 | N/A | DEC-002 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Desktop app, embedded node; Settings → Extensions | Voice Input card with name, description, version, supported platforms, needs, state | — | Rendered UI test + node API test |
| AC-002 | REQ-003 | SCN-002 | Voice Input not installed | Install shows phases (a percent only where the extension reports one); ends **Installed and On** (DEC-015); Turn on/off, Update, Remove work; Remove + Install replaces Reinstall; language and microphone saved | Download/checksum failure → Failed with message, log entry, Install again | Real-release install test + store/UI tests |
| AC-003 | REQ-003 | SCN-002 | Installed version older than the signed catalog's version | Card shows Update; Update installs the catalog's version, keeps settings and enabled state | Update fails → the old version keeps working; the card says "Update to x failed" with the reason, and Update is still offered | Test with a test-signed catalog |
| AC-004 | REQ-003, REQ-011 | SCN-006 | Desktop window bound to a Docker/Linux node | Voice Input is not listed there (it is offered only on the desktop's own node); a supported-platform check still applies where an extension is offered (on the desktop's own node, a platform without a voice asset shows "not available on this platform") | — | Node API test with platform stub + rendered page |
| AC-005 | REQ-004 | SCN-008 | Any failure during install or use | Card shows message and last error; the extension's log is readable from the card | — | Unit + rendered test |
| AC-006 | REQ-005 | SCN-007 | Request with a phone credential, or without credential | Install/enable/settings/remove refused with the node access refusal; reading the list follows the route table decided in design | — | Node access scenario test (named ID) |
| AC-007 | REQ-006 | SCN-003 | Voice installed and enabled | Dictation works on all five surfaces with the same states (recording, transcribing, no speech, mic denied, failure), text inserted, never sent | — | Existing voice integration/lifetime tests pass unchanged in outcome; real-runtime transcription test |
| AC-008 | REQ-007 | SCN-004 | An isolated base data folder with a synthesized old install (released `registry.json` shapes, `voice-input/` with small stand-in files; never real user data) | After the new version first starts: the old `extensions` folder is gone, the app and node start normally, Voice Input shows Not installed, Install works; a second start does nothing more | Deletion fails (e.g. a file in use) → logged warning, startup continues, tried again at the next start | Desktop startup test with a synthesized fixture (TESTING.md: migrations on synthesized data) |
| AC-009 | REQ-008 | SCN-005 | Desktop window bound to a remote (e.g. Docker) node without Voice Input | Dictation works using this computer's Voice Input | This computer's Voice Input disabled → no microphone button, as today | Desktop test with an embedded + a second node |
| AC-010 | REQ-001 | SCN-006 | Desktop window bound to a Docker/Linux node | Its Settings → Extensions lists that node's extensions and their state; actions apply to that node | — | Docker node test (test-owned container) |
| AC-011 | REQ-009 | SCN-008 | One extension record unreadable or its files missing | Node starts; that card shows an error; logged warning names the extension; nothing deleted | — | Unit test on the manager |
| AC-012 | REQ-010 | SCN-009 | Docs | GLOSSARY has "Extension" and the extension/integration difference; a module doc describes the contract for adding an extension | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Owner | See what optional capabilities this node has | Settings → Extensions | Any node window | Open page | Catalog with states | Node unreachable → page error | Supported Normal Scenario | Existing page | REQ-001/002, AC-001 |
| SCN-002 | User | Owner | Install and manage Voice Input | Card buttons | Not installed / installed | Install → Enable → (use) → Disable / Update / Reinstall / Remove; settings | States and progress as today | Failures shown with log | Supported Normal Scenario | Existing card | REQ-003/004, AC-002/003/005 |
| SCN-003 | User | Owner | Dictate text | Microphone button on a voice surface | Voice installed + enabled | Record → stop → text inserted | Draft contains text, not sent | No speech, mic denied, failure | Supported Normal Scenario | Five existing surfaces | REQ-006, AC-007 |
| SCN-004 | Operational | Founder | Use voice after updating the app | App update | His current install | Start new version → old install deleted → Voice Input Not installed → Install → set language and microphone | Voice works after one Install | Deletion fails → retried next start | Supported Normal Scenario | Measured registry; founder 2026-11-26 | REQ-007, AC-008 |
| SCN-005 | User | Owner | Dictate in a remote node's window | Microphone button | Desktop window bound to a remote node | Record → text | This computer's voice used | This computer's voice off → no button | Supported Normal Scenario | Current behavior | REQ-008, AC-009 |
| SCN-006 | Operational | Owner | Manage a headless node's extensions | Settings → Extensions in that node's window | Docker/Linux node paired as owner | Open page, act | That node's catalog and states | Unsupported platform shown | Supported Normal Scenario (proposal principle 5) | Proposal §2.5 | REQ-001/003, AC-004/010 |
| SCN-007 | Contract | Phone or unauthenticated client | Change extensions | API call | — | Call | Refused | — | Supported Explicit Edge Scenario (node access model) | node_access_model.md | REQ-005, AC-006 |
| SCN-008 | System | Node | Start with a broken extension | Node start / page open | Corrupt record or missing files | Start; open page | Node works; card shows error | — | Supported Explicit Edge Scenario (DESIGN rule 7; existing "incomplete" state) | DESIGN.md, current code | REQ-004/009, AC-005/011 |
| SCN-009 | Contract | Founder / contributors | Understand extension vs integration | Docs | — | Read | Clear definitions | — | Supported Normal Scenario (founder's question) | PM comment 2026-11-18 | REQ-010, AC-012 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small).
- UI/UX user-confirmation reference: the founder approved the Product Team's design, 2026-11-26: "if everything, based on your self-verification for each use case, will work, then let's go … let's say I approve the design"; the open items were decided by DEC-015 (founder delegated), drawn as DC-083…DC-090 and confirmed by the Solution Designer. Recorded in the spec's Status And User Confirmation. Superseded afterwards by DEC-016: the spec's REQ-007/AC-008 row and VIS-V3-01 (adopted install); after the update Voice Input shows the normal Not installed card (VIS-V2-01).
- Linked UI/UX supplement (final, Product-owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/ui-ux-spec.md`; normative references `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/visual-references/` (VIS-V* Stage 1, VIS-T* Private Network stage, VIS-L* Chinese, VIS-N* phone width); ticket and approval record `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/product-ticket.md`; change log `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/design-change-log.md`; design repository `personal` @ 825434bc.
- The page keeps the current Settings style; the Voice Input card keeps its controls. New visible elements: per-card version, supported platforms and needs, "not available on this platform", Update, View log. Exact wording and placement are design details within the current style.
- Product decisions that need the user: none beyond DEC-001/002.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-003 | Security | Extension packages are installed only from the signed catalog with a matching SHA-256, and the voice runtime only from its pinned release manifest after the SHA-256 matches (as today) | All installs/updates | Existing checksum tests |
| QR-002 | REQ-006 | Performance | Warm transcription of the same 5-second clip on the founder's kind of Mac (Apple Silicon) is no more than 0.5 s slower than today's path | Same machine, before/after builds | Measured before/after in an isolated home |
| QR-003 | REQ-009 | Reliability | No extension failure prevents the node from starting | Any extension state | AC-011 |
| QR-004 | REQ-005 | Security | No extension route is reachable without the owner credential except those the design classifies as read-only for the owner's own clients | All node kinds | Node access scenario tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`.
- Must be preserved: nothing of the old desktop Voice Input install (DEC-016, founder 2026-11-26). Its runtime and model are re-downloadable from their pinned, checksummed releases; its language and microphone are two choices the owner makes again.
- Deleted once: `<base data folder>/extensions` (`registry.json`, `voice-input/`), about 1.7 GB on the founder's Mac, when the new version first starts.
- Acceptable loss: the old install, its on/off state, language and microphone choice; transient install progress (an interrupted install shows Not installed or Failed and is installed again).
- Constraints: the founder's live files are never used by tests (TESTING.md).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Voice runtime v0.3.2 release (manifest + archives) | Pinned (PRE-001 delivered) | `AutoByteus/autobyteus-voice-runtime` | No linux-arm64 asset |
| Node access model | Owner-only management; new routes classified | `node_access_model.md` | Must be updated with the routes (same change) |
| Data Migration Guideline | Registry adoption | `data_migration_guideline.md` | Design |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| [extension-contract.md](extension-contract.md) | The extension contract and stored data (description file, package, signed catalog, server part, page bridge, node state); founder asked for it first, minimal fields only | REQ-002..005, REQ-007, REQ-011; DEC-010..016 | Approved (SR-005), with the DEC-015/DEC-016 changes | Behavior-defining; approved by the founder |
| [staged-plan.md](staged-plan.md) | Whole direction: stages, sizes, founder needs, PoC needs, other Projects, relation to 270/70/488 | REQ-010; DEC-001..008 | Draft | Informative; not approved with Stage 1 |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Every desktop runs its own embedded node on the same computer | REQ-008 routes dictation there | Architecture phase | Open |
| ASM-002 | The founder does not need voice from the phone in Stage 1 | Keeps Stage 1 minimal | Founder (message) | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where do extensions live: in the desktop app, or on each node? | Decides whether headless servers can have extensions, and whom Voice Input belongs to | (a) Desktop app (today): no headless; a second manager needed for network/FS. (b) Each node (server): one manager, headless for free, desktop shows the node of each window. | Network and storage are host capabilities that must work on Linux servers without a desktop (proposal principle 5), so the manager must be on the node; keeping voice in the desktop would mean two managers. Recommend (b), with REQ-008 keeping today's voice behavior in remote-node windows. **Founder 2026-11-21: (b)**: "the extension shouldn't be on the front end … if you want to make a docker node to also have the extension … the extension should be actually server side feature". | Founder | Decided (founder) |
| DEC-002 | Are integrations and extensions one thing? Third-party extensions? | Security boundary and product vocabulary | Table above; integrations never run app code; extensions run binaries/root services | Recommend two kinds with one vocabulary, first-party extensions only. Merging would let imported repositories ship executable code. Founder 2026-11-21 delegated the abstraction decisions ("can you just think I don't ask each case"): decided as recommended. | Solution Designer (delegated by founder) | Decided |
| DEC-003 | Does the Voice migration change the voice engine? | Size and risk of the proving milestone | Runtime v1.0.0 (better Chinese, bounded lifecycle) is unpublished (release blocked since Aug) and macOS-arm64-only | Migrate the current v0.3.0 engine unchanged; it isolates architecture problems from engine problems. Engine upgrade is its own later stage. The founder's direction says "migrate the existing extension"; this is within it. Question to him (not blocking): what is wrong with voice for him today? | Solution Designer | Decided |
| DEC-004 | How do extensions update? | "Updated independently" | (a) Remote catalog feed (b) Catalog pinned in each app release; runtime downloaded separately | (b): the catalog is app-owned and travels with the signed app release (DESIGN.md rule 9: one release); Update downloads only the extension. A remote feed adds a trust channel for code that runs on the computer. | Solution Designer | **Replaced by DEC-010** (founder 2026-11-21: separately released packages; the catalog is fetched, signed) |
| DEC-005 | Who may manage extensions? | Security | Owner / phone / peer credentials | Owner only, like other node administration; phones and peers refused. | Solution Designer | Decided |
| DEC-006 | How is a headless node's extension list managed? | Headless principle | (a) From a desktop window bound to the node (owner credential) (b) Also a CLI on the server | (a) in Stage 1: every owner already pairs a desktop with a node; a CLI waits for a real need (Stage 2/3 may need terminal steps anyway for administrator prompts). | Solution Designer | Decided |
| DEC-007 | The founder's existing install | Data continuity | Adopt vs reinstall | Adopt in place, no download. | Solution Designer | **Replaced by DEC-016** |
| DEC-016 | Move the existing Voice Input install into the new layout, or delete it and install again? (founder 2026-11-26: "do you think there is a need to move them? or we simply delete them? and let the process redownload those") | Deleting is hard to undo; the move was the most delicate part of Stage 1 | (a) Move by rename (validated, UP V3): a sealed desktop migration for every released registry shape, interruption-safe, microphone handed back, plus a node rule to finish an install at start. Saves only the speech model download, because the new package wraps runtime 0.3.1 (PRE-001). (b) Delete `<base data folder>/extensions` once at first start; Install again (measured 75 s, ~1.7 GB; language and microphone chosen again). | (b): one click and a few minutes once, against a migration, a special start rule and a second extensions location. Recommended by the Solution Designer; founder: "This is also what I'm thinking." | Founder | Decided (founder, 2026-11-26) |
| DEC-017 | How are extensions organised as projects? | Founder wants to sell some extensions later (e.g. Shared File System, a hosted private network on AutoByteus servers); Voice Input stays free | (a) one shared repository (b) one repository per extension, private or public, plus one public catalog repository holding the signed list and the only signing key | (b). Source protection: a private repository keeps the source and its history private; the package a user installs (description, server part, page) is readable on their computer once installed, and the programs it downloads can be compiled binaries; the paid download can later require the buyer's account (DEC-013); the strongest protection is a paid service AutoByteus runs (network server, file server), which a copy of the client does not include. Founder 2026-11-26: "I want each extension to have its own repository … commercialize some extensions in the future". | Founder | **Replaced by DEC-018** (founder, same day) |
| DEC-018 | One repository for all extensions, or one per extension? (founder 2026-11-26: "why don't we have one extensions … inside this extensions we have like all those extensions") | Fewer repositories; protection of paid work | (a) one repository per extension (DEC-017) (b) one public repository `AutoByteus/autobyteus-extensions` with every extension's package (wrapper) and the signed catalog, its signing key a secret of that repository; the programs the extensions download in their own repositories (voice runtime public; network and shared-file-system programs private, paid download later) | (b): a wrapper is readable once installed, so a private wrapper repository protects almost nothing; the value is in the programs and the services AutoByteus runs. Rule for every extension: anything valuable lives in its program or service, never in the wrapper. Each extension is still released on its own (tag per extension and version). Founder: "Yes please use one repository … I think it's much cleaner". | Founder | Decided (founder, 2026-11-26) |
| DEC-019 | Name of the storage extension | Vocabulary (Principle 15) | "Shared Folder" (SR-003) or "Shared File System" (the proposal's name) | Founder 2026-11-26: "instead of shared folder, but shared file system". Renamed in the ticket documents; the Product spec's out-of-scope mention is updated by that stage's Product round. | Founder | Decided (founder, 2026-11-26) |
| DEC-009 | Where is each extension offered? | Voice on every server would need a runtime per server; the founder found that wrong ("for different server they don't have the same voice runtime") | (a) every extension on every node (b) each extension declares the computer it is for | (b): Voice Input only on the desktop's own node, used by every window; Private Network and Shared File System on every node. Founder 2026-11-21: "Yeah" to this proposal. | Founder | Decided (founder) |
| DEC-010 | Are extensions shipped inside the app or as separate packages? | Business model (founder 2026-11-21: "the platform is basically free and they can buy those our extensions"; "the extension will be a separate repository maybe a private repository") | (a) inside each app release (SR-001..003, DEC-004) (b) separate packages downloaded on install | (b): replaces DEC-004. Each extension package carries its manifest, its server part, its own UI panel and its program downloads. | Founder | Decided (founder's direction), details below need him |
| DEC-011 | Who may publish extensions? | Extension code runs on the user's computer | (a) only packages signed by AutoByteus (b) anyone | (a): a node installs only AutoByteus-signed packages; a private or paid source changes where the package comes from, not who signs it. | Founder | Decided (founder, 2026-11-22 "Okay let's continue") |
| DEC-012 | Extensions released separately from the app need a stable contract | DESIGN.md rule 9 forbids cross-version compatibility, except the frozen node-update contracts | A small, versioned extension contract (manifest, server-part interface, UI-panel bridge), frozen like C1–C4; an extension states the contract version it needs and an app refuses one it does not support | Recommend; it is a deliberate exception to rule 9 and must be written into DESIGN.md | Founder | Decided (founder, 2026-11-22 "Okay let's continue") |
| DEC-013 | Paying for extensions | Business model | Licence/entitlement check, store, account | Not in Stage 1; Stage 1 only makes sure a package can later come from an authenticated (private/paid) source | Founder | Decided (founder, 2026-11-22 "Okay let's continue") Founder 2026-11-26 (direction for that stage): every user sees all extensions in the list, paid ones included, with what they do; after paying, Install works. Fits the contract: a paid entry is a catalog entry like any other; its purchase need is added then by optional fields, and it states a higher `contractVersion`, so an AutoByteus without payment support shows it as "Needs a newer AutoByteus" instead of offering an Install that would fail. |
| DEC-014 | Where and how an extension's UI appears | Consistency, security, separate releases | (a) declarative building blocks drawn by AutoByteus (a new block needs an app release) (b) **one HTML page per extension in a sandboxed iframe**, inside a common card frame AutoByteus draws (name, state, install/update/remove, progress, log); the page talks to its own server part only through a small message bridge; AutoByteus passes its theme | (b). Founder 2026-11-21: "one extension UI it's just the one HTML … we still use iframe to render". Fits separately released extensions: a new or changed panel needs no AutoByteus release. Security: page served sandboxed (opaque origin) with no direct network access (`connect-src 'none'`), because the desktop attaches the owner credential to every request to a node origin; all calls go through the bridge to the extension's own server part. Fixed connection points elsewhere (microphone button, Nodes-tab list, workspace picker) stay drawn by AutoByteus. | Founder (with Solution Designer's conditions) | Decided |
| DEC-015 | The open items of the approved design (founder 2026-11-26: "what is your suggestion … based on your reasoning, what is the most reasonable solution") | Founder delegated the choice | (1) Install ends On: installing already says "I want it"; Off costs a click and a moment of "why doesn't it work"; Off stays available as the switch. (2) Translations: yes, optional translated name/description in the description file and the app's language passed to the page (contract §1, §5, optional additions); the app is bilingual. (3) No Reinstall / Open folder: Remove + Install and "Install again" cover it; Open folder works only on this computer, a folder path with Copy works everywhere. (4) One click for your own nodes: the same person decides both sides. (5) No "Pair with it" checkbox: one Pair button on the node's row is the only pairing control. (6) "Create access code" shown only where the code can work (hidden on the desktop's own node without a private network). (7) "Controlled by … Revoke" on This node: who controls this node, revocable (server routes exist, NA-11). (8) Voice warm-up in Stage 1 (REQ-012). | Solution Designer, delegated by the founder | Decided (founder informed) |
| DEC-008 | Scope of Stage 1 | Size | Foundation + voice only | Remote Network and Shared FS start after Stage 1 is delivered and their designs are approved (founder's sequence). | Founder's direction | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-005 | AC-001, AC-010 | SCN-001, SCN-006 | DEC-001 |
| REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 | DEC-002, DEC-004 |
| REQ-003 | UC-002 | BEH-001 | AC-002, AC-003, AC-004 | SCN-002, SCN-006 | — |
| REQ-004 | UC-003 | BEH-008 | AC-005 | SCN-008 | — |
| REQ-005 | UC-002 | BEH-006 | AC-006 | SCN-007 | DEC-005 |
| REQ-006 | UC-004 | BEH-002, BEH-003 | AC-007 | SCN-003 | DEC-003 |
| REQ-007 | UC-005 | BEH-007 | AC-008 | SCN-004 | DEC-016 |
| REQ-008 | UC-004 | BEH-004 | AC-009 | SCN-005 | DEC-001 |
| REQ-009 | UC-003 | BEH-008 | AC-011 | SCN-008 | — |
| REQ-012 | UC-004 | BEH-002 | AC-007 | SCN-003 | DEC-015 |
| REQ-011 | UC-001, UC-004 | BEH-001, BEH-004, BEH-005 | AC-004, AC-009 | SCN-005, SCN-006 | DEC-009 |
| REQ-010 | UC-006 | BEH-009 | AC-012 | SCN-009 | DEC-002 |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-001..SCN-009 (after approval).
- Constraints: DESIGN.md rules 7, 9, 10, 12; node access model; Data Migration Guideline; no engine change; no change to integrations.
- Deferred to design: API shape (GraphQL vs REST, binary upload for transcription), route classification, where the registry lives and how it is adopted, worker lifetime under the server, Electron's remaining role, how remote-node windows reach this computer's node, log location.
- Technical facts to verify: ASM-001; server data dir vs `~/.autobyteus`; runtime PATH environment under the server; Docker node platform detection.
- Known risks: QR-002 latency; data adoption on the founder's machine.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None.

### Approved Basis Ready For Design

- Approval recorded: `Yes` (founder, 2026-11-21)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-001 baseline; staged-plan.md informative, not approved)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None.
