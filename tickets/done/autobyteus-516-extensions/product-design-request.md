# Product Design Request — AutoByteus Extensions UI (autobyteus-516)

- Classification: `Product Design Requested`, purpose `New Request`
- From: Solution Designer, Software Engineering Team (run `solution_designer_b2b085ced16d45479c46350d19ae49a2`), for the founder
- Date: 2026-11-22
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/tickets/in-progress/autobyteus-516-extensions/`
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions`, `codex/autobyteus-516-extensions`, from `origin/personal` @ `b768c503f9761242089cdee35e47dc2bf65ab8ea`
- Project: `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, Task autobyteus-516 (the Product Team's work is part of this Task)

## The founder's request, in his words

2026-11-22: "I strongly suggest … now if you validated the flow then … delegate a task to the product team that works on the UI now."

Context from the same conversation (his words): extensions are "just a container" with
their own UI ("one extension UI it's just the one HTML … we still use iframe to render";
"most extension UI are extremely simple"); he wants nodes to be found automatically
("in the nodes area … auto-discover all the nodes … the user has to enable it first … a
toggle … allow this to be auto discovered … then I can just click pair and the pairing
process goes on automatically, strictly following the pairing process"); adding a new
machine should be "generate something directly from the network module … paste it
somewhere else", not a command line; "Private Network" is his chosen name.

## What the design should help decide

The visible experience of AutoByteus Extensions, in two parts:

### Part A — Stage 1 (approved requirements; built first)

1. **Settings → Extensions page with extension cards.** A common card frame drawn by
   AutoByteus for every extension: name, description (says what it needs), version,
   state (`notAvailableHere` · `notInstalled` · `installing` with message and percent ·
   `installed` with on/off, ready/not ready, message, update available · `failed` with
   message), buttons Install / Turn on·off / Update / Remove / View log. Only extensions
   offered on the window's node are listed (Voice Input only on the desktop app's own
   node).
2. **The extension's own page inside its card** (one HTML page in a sandboxed frame,
   shown when the card is opened). For Voice Input: language (Auto / English / Chinese)
   and what is installed.
3. **Voice Input's microphone pieces stay AutoByteus's own UI**: the microphone button on
   every voice surface (composer, Task description, Project description, Memory search),
   the microphone choice and the Test recording with live level (today inside the Voice
   Input card; they move out of the extension page because microphone IDs belong to the
   AutoByteus page). Where the microphone choice and Test live now is a design question.

Today's surfaces to start from: `autobyteus-web/components/settings/ExtensionsManager.vue`,
`autobyteus-web/components/settings/VoiceInputExtensionCard.vue` (549 lines; install
phases, progress, language, microphone, Test panel), `pages/settings.vue`.

### Part B — Private Network (exploratory: flows and contract validated by prototypes; its requirements are not yet approved)

4. **Private Network card**: choose the network (Tailscale account, own Headscale server),
   join (sign in / paste a join key), this machine and its private address, my machines
   (online/offline, direct/relayed), the switch **"Let my private network find this
   node"** (off by default, offered on joining), and the opt-in switch **"Trust machines I
   added to my private network"** (off by default; when on, own machines pair without a
   click — security trade-off must be clear).
5. **Nodes tab: "Found on your private network"**: discovered AutoByteus nodes with name,
   who added them, online state; per node: **Pair** (your own node: one click),
   **Connect** (someone else's node), and for incoming requests **Allow / Reject**
   ("bob-laptop, added by bob, wants to connect"); an **unknown machine on your own
   account** is flagged, never paired by one click; paired teammates are peers, never
   owners; Unpair.
6. **"Add a machine" → connection code**: a one-time, expiring code (text ~240 characters
   and QR) shown on a node you already use, with "treat it like a password" guidance.
7. **First-run page of a brand-new node** (opened in a browser on that machine itself,
   only while it has no owner): paste the connection code → joined, paired, owned. Also
   works the other way round (code generated here, pasted on your Mac).

Today's surfaces: `autobyteus-web/components/settings/NodeManager.vue`,
`NodeManagerTabs.vue`, the Nodes tab's pairing and the phone setup tabs.

## Established constraints and non-goals

- Only AutoByteus-signed extensions; no store, prices or payments in this work.
- Extension pages cannot make network requests or reach the AutoByteus page; they talk only
  through a small message bridge to their own extension.
- Managing extensions and pairing are owner actions (desktop with owner access); phones
  cannot.
- Nothing is exposed to the public internet; found ≠ trusted; every pairing is a decision
  (one click for own nodes, Connect + Allow for others).
- Security texts must not overstate: automatic trust is opt-in; connection codes are secrets.
- Keep the app's existing Settings and Nodes visual language and localization (English and
  Chinese).
- Out of scope: Shared Folder UI, local inference, the AutoByteus-hosted paid network,
  phone UI changes.

## Feasibility status (do not design on unproven claims)

| Element | Status |
| --- | --- |
| Extension card states, install/update/remove, signed catalog, extension page bridge | Validated (probe `probes/contract-probe`, 31/31 + browser bridge test) |
| Voice transcription through the extension (English, Chinese, silence) | Validated (same probe; first call after install can take ~30 s) |
| Join without admin rights, machine list with owner and online state, who-is identity | Validated locally (`probes/network-probe`, 10/10) |
| Pair / Connect / Allow / Unpair, refusals, connection code one-paste, discovery | Validated locally (`probes/pairing-probe`, 28/28) |
| Direct vs relayed state, different networks, mobile data, Android, real Tailscale invites | **Not proved** (needs the founder's devices) — show as provisional |
| Restart / revocation take ~11–13 s | Measured; the UI may need a "connecting…" state |

## Open questions for the design

- Where the microphone choice and Test live once the Voice Input page no longer holds them.
- How a card opens its extension page (expand in place, side panel, own page).
- How install progress and long first transcription are communicated.
- How "Found on your private network", pending requests and unknown-machine warnings sit in
  the Nodes tab next to today's nodes and peers.
- How the connection code is shown and pasted (text + QR, expiry countdown).

## Files

- `requirements-doc.md` (Stage 1 approved; REQ-001..011, AC-001..012, DEC-001..014)
- `extension-contract.md` (validated), `pairing-contract.md` (validated, Private Network stage)
- `staged-plan.md` (whole direction, Private Network user flow)
- `investigation-notes.md`, `solution-revision-record.md`
- Probe results: `probes/contract-probe/README.md`, `probes/network-probe/README.md`, `probes/pairing-probe/README.md`

## Expected return

The Product Team's own package for the founder's review (its choice of mode and
artifacts), reported back to this Solution Designer run with its approval state, so the
approved decisions can be integrated into the Stage 1 design and the Private Network
requirements.
