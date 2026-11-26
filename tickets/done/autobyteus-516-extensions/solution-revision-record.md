# Solution Revision Record — autobyteus-516-extensions

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Stage 1) | N/A | N/A | Ready for Approval | BEH-001..009, REQ-001..010, AC-001..012, DEC-001..008 | Presented to the founder |
| SR-002 | Mixed | Founder approval + Stage 1 architecture design | N/A | Ready for Approval | Approved; design in progress | DEC-001, DEC-002 | Requirements approved; design written |
| SR-003 | Requirements | Founder conversation 2026-11-21 | N/A | Approved | Approved | REQ-011, AC-004, DEC-009 | Voice offered only on the desktop's own node; names Private Network / Shared Folder |
| SR-004 | Requirements | Founder 2026-11-21: extensions as separate (private, paid) packages | N/A | Approved | Ready for Approval | DEC-004 replaced; DEC-010..014 | Requirement Gap; Stage 1 scope grows; founder decisions pending |
| SR-005 | Mixed | Founder 2026-11-22: continue; network validation | N/A | Ready for Approval | Approved | DEC-011..013, contract | Contract approved; Private Network probe 10/10 |
| SR-006 | Requirements | Founder 2026-11-26: delete the old Voice Input install instead of moving it | N/A | Approved | Approved (founder) | BEH-007, UC-005, REQ-007, AC-008, SCN-004, DEC-007→DEC-016; REQ-003/AC-003 wording (DEC-015) | Stage 1 design without the move |
| SR-007 | Design | Stage 1 design spec | N/A | Approved | Design approved by the founder (2026-11-26) | all Stage 1 IDs | design-spec.md; Large/High → architecture review |

## Revision Entries

### SR-001 — Stage 1 baseline: extension foundation proven by migrating Voice Input

- Phase and classification: Requirements, Initial Baseline.
- Triggering input: autobyteus-516 description and comments (2026-11-17 proposal; 2026-11-18 founder: FS, network, voice extensions, extension vs integration; 2026-11-21 founder: architecture first, voice migration as proving milestone).
- Triggering finding IDs: N/A.
- Prior status: N/A. Current: requirements Ready for Approval; design not started.
- IDs affected: all initial.
- Scenario basis: SCN-001..009 established from the current code, the founder's live voice install (read-only) and the proposal's principles.
- Why recorded: first coherent baseline for the founder's approval.
- Canonical sections: requirements-doc.md (all), investigation-notes.md (all), staged-plan.md (new, informative).
- Supplements: staged-plan.md (informative, not approved with Stage 1).
- Product design evidence: N/A.
- Intended behavior changed: N/A (baseline).
- Approval impact: pending the founder (DEC-001, DEC-002 Needs user).
- Behavior-defining supplements: none.
- Design/review basis: N/A.
- Task-size/risk classification: N/A (before design).
- Handoff: none; approval hold in the Solution Designer's conversation with the founder.
- Remaining gaps: DEC-001, DEC-002; ASM-001, ASM-002; U-001 (what is wrong with voice for the founder).
- Next action: on approval, architecture design for Stage 1, then the founder's design approval before implementation.
- Update 2026-11-21 (same baseline, no behavior change): the founder answered DEC-001: extensions are a server-side (node) feature, so a Docker node can have them too. Recorded in requirements-doc.md Decisions. DEC-002 and overall approval still pending.

### SR-002 — Founder approval of the Stage 1 requirements; Stage 1 design

- Phase and classification: Mixed (approval record + design), Refinement.
- Trigger: founder 2026-11-21: (1) "the extension should be actually server side feature" (DEC-001); (2) asked about DEC-002 and overall approval, he asked the Solution Designer to think the abstraction through the way it is typically implemented instead of asking case by case.
- Intended behavior changed: No. SR-001 requirements unchanged; DEC-001 founder-decided, DEC-002 decided by the Solution Designer as recommended under the founder's delegation.
- Approval: Stage 1 requirements baseline SR-001 approved by the founder (references above). Design approval by the founder still required before implementation (Task direction).
- Canonical sections changed: requirements-doc.md Document Status, Decisions, Readiness; design-spec.md created.
- Next action: present the design to the founder; on his approval, classify and route.

### SR-003 — Where each extension is offered; names

- Phase: Requirements, Refinement (intended behavior changed: Yes, small).
- Trigger: founder 2026-11-21: voice on every server would need a runtime per server ("this is getting weird"); proposal: each extension declares the computer it is for; founder: "Yeah". Founder chose the name "Private Network" ("Private network is great name"); "Shared Folder" used for the Shared File System extension.
- Changed: REQ-011 and DEC-009 added; AC-004 reworded (Voice Input not listed on Docker/Linux nodes); out-of-scope names.
- Approval: founder, 2026-11-21 ("Yeah", reply to the explicit proposal).
- Staged plan: Private Network stage refined (providers; companion program; network-vouched pairing) — informative, its own approval later.

### SR-004 — Extensions as separately distributed packages (Requirement Gap)

- Trigger: founder 2026-11-21: extensions in separate (maybe private) repositories, downloaded on install, sold later ("the platform is basically free and they can buy those our extensions"); each with its own UI.
- Effect: DEC-004 (catalog and UI inside the app release) replaced by DEC-010; new DEC-011..014. Stage 1 now needs a package format, signature check, server-part loading, a UI panel host and a stable extension contract; Voice Input becomes the first separately packaged extension. Size grows to Large / High risk.
- Approval: pending the founder on DEC-011, DEC-012, DEC-013. Design waits.
- Update: founder 2026-11-21 "Most extension in UI are extremely simple" → DEC-014 changed to a declarative panel drawn by AutoByteus; no extension UI code in Stage 1.
- Update: founder 2026-11-21 "one extension UI it's just the one HTML … we still use iframe" → DEC-014 changed again: one sandboxed HTML page per extension inside a common card frame, message bridge only, no direct network access.
- Update: founder 2026-11-21 "design the data and the contract first … never contain attribute more than we need" → extension-contract.md drafted (minimal: a field exists only if Stage 1 reads it); microphone choice and Test move to AutoByteus's voice connection point; awaiting founder approval.
- Update: founder asked for a self-validation; probe probes/contract-probe passed 31/31 + bridge in browser; contract changed: server/index.mjs, bridge accepts only its own frame, existing install moved (no download of runtime/model).

### SR-005 — Contract approved; Private Network validated locally

- Trigger: founder 2026-11-22 "Okay let's continue … can you first do some validation … the second one is … tail scale … extension … using invite".
- Approval: extension-contract.md (as changed by the contract probe) and DEC-011 (only AutoByteus-signed), DEC-012 (contract as exception to DESIGN.md rule 9), DEC-013 (payment later), voice install moved not re-downloaded — taken from "Okay let's continue"; flagged to the founder for correction.
- Evidence: probes/network-probe (10/10): userspace tsnet nodes on a loopback Headscale, join keys, machine list with owners, who-is identity (same owner vs teammate), restart without key, revocation; founder's Tailscale untouched.
- Next: Stage 1 design (container + Voice Input); Private Network for Tailscale as the second extension (its own stage: start step, provides role, node access model change, real-device proof).
- Update 2026-11-22: founder's standing rule "we always write the contract first" (features with data: contract first, minimal fields, validated by a prototype) added to the project DESIGN.md as mandatory rule 13 and to its checklist; also stored in the node's global semantic memory.
- Update 2026-11-22: pairing-contract.md written first (founder: validate the pairing process); probes/pairing-probe 26/26; contract changed (stable machine ID, expiresAt in the connection code).
- Update 2026-11-22: auto-discovery added to the pairing contract (part 7) and validated (28/28).
- Update 2026-11-22: founder: discovery opt-in toggle per node and hub idea → pairing contract part 7 (discoverable switch, off by default; Pair follows sections 3–5; hub only for networks without a machine list, later).
- Update 2026-11-22: founder asked to delegate the UI to the Product Team now → Product Design Requested (New Request): product-design-request.md; delegated to /product_team (team run product_team_a280b4020674493e8a0808449b419369, coordinator product_ui_ux_designer_99d03915911a4b94a7d75dc5cb25283f). No Task of its own (part of autobyteus-516). Stage 1 design continues; approved Product decisions get integrated when returned.
- Update 2026-11-22: Product Team round 1 returned (Awaiting User Review, nothing approved): review-round-1.md in /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/extensions-ui-516/tickets/in-progress/extensions-ui-516/; UI reference on http://127.0.0.1:4516; 8 findings relayed to the founder (bridge resize message, translations, install ends Off, Reinstall/Open Folder, read-only list, removing Private Network, not-designed items, pairing time).
- Update 2026-11-24: Product Team asked for a workflow-fidelity check (A1–A9, B1–B12). Contract additions from it: extension bridge optional { resize: { height } } (no id/call); pairing pair-rejected (B→A, only while A has an outstanding Connect) and Cancel semantics. Corrections sent: A8 (no credential → no list), B1 (connection code only on first-run page), B4 (owned nodes are already in the Nodes list; Pair adds the peer relation), B8 (trust switch acts on B's side per §4), Add a machine/Tailscale sign-in provisional (join key source unvalidated for Tailscale).
- Update 2026-11-24: Product round 2 (branch design/extensions-ui-516 @ cb214cca) checked against both contracts and probes: confirmed; note sent that the Remote collaboration explanation (shared secret) is to be updated by the Private Network stage design. Product Team may now send the round to the founder. Founder decisions still open: install ends Off/On, Reinstall/Open Folder, translations.
- Update 2026-11-24: founder (via Product Team) asked to design every supported network type → private-network-types.md (draft): Tailscale and own Headscale (first release), Host a private network (designed now, built later), own VPN (minimal accepted range, no discovery/one-click pairing); NetBird and AutoByteus-hosted out. Sent to the Product Team.
- Update 2026-11-24: Product round 3 (per network type, @ ee481ac6) checked: 3 changes sent (no public join web page on the host; invites and keys carry the right Headscale user, security; own VPN accepts only private ranges, warns above /16) plus a Leave note; private-network-types.md updated to match.
- Update 2026-11-24: Product round 3 fixes (@ b7dd7685) confirmed; one text change (invite as a code, not a URL) and the round may go to the founder. Founder: design Shared Folder in this ticket but do not build it yet → contract first from the NFS tool's real data (staged-plan.md, Stage 3 note); Product Team told it will follow.
- Update 2026-11-24: founder: business flow per use case → data-flow spine → validate each. use-case-spines.md (V1–V13, N1–N10) with per-step proof; new probes: spine-probes SP-1 (extension route open to phones by default) and SP-2 (audio upload needs its own parser and body limit); use-case probe 12/12 (fresh install, move of the founder's install, log, containment). Voice Input spines all validated at prototype level; Private Network open only for real Tailscale account and devices.
- Update 2026-11-24: detailed Tailscale spines (Part T) written with action routing; three gaps found: G1 desktop must reach private addresses through the embedded node's relay, G2 first-run installs the Private Network extension before joining, G3 owner access for a coded node via an automatic setup code (proposal). For the Private Network design.
- Update 2026-11-24: founder decided owner access: the target node generates a code in its UI (first-run page, or its settings when it has an owner), copied to the desktop's Nodes → Add node (pairing-contract §6a: nodeId, address, setupCode, expiresAt = today's setup code from the UI plus the address). Dropped: one-click 'Manage this node', connection code made on the desktop. Pairing stays Pair/Accept. Tailscale join on the target by sign-in.
- Update 2026-11-24: Product round 4 (node code, @ 26ebb692) checked: confirmed; answers a (This node card is fine), b (owner-only), c (name read after reaching). New gap G4: 'only this computer' for a Docker node's first-run page (requests arrive through the published port, may not be loopback).
- Update 2026-11-25: founder named the node code 'access code' (no wording 'desktop' in its steps); pairing-contract §6a renamed; Product Team told. GLOSSARY entry 'Access code' to be added by the Private Network stage.
- Update 2026-11-25: founder's naming rule: pair = node with node (peers); access code = a client gets control of a node. FU-001 recorded: phones today 'pair' though they are clients getting access.
- Update 2026-11-25: founder asked to update the contract files first (design principle 17). extension-contract.md rewritten as current (approved status, routing part 6 with SP-1/SP-2, Voice Input actions, the move as the existing-data transition, open items); pairing-contract.md rewritten (vocabulary pair / access code / invite code; records with writer, reader, lifecycle; messages; pairing cases; access code §6; invite code §7; walks; gaps; history). private-network-types.md and use-case-spines.md marked: access code replaces Add a machine; T8 rewritten; G3 obsolete.
- Update 2026-11-25: founder asked to validate consistency and every spine. Consistency audit: requirements catalog wording (REQ-002, REQ-003, AC-003, QR-001, DEC-004→replaced by DEC-010), staged-plan and private-network-types 'Add a machine' corrected. New access probe 14/14 (access code, Reject/Cancel, G1 relay); pairing probe still 28/28. Finding: tsnet's local relay is SOCKS5-with-password only; Chromium has no SOCKS5 password support → the network program must offer its own relay for the desktop. Validation summary per spine added to use-case-spines.md.
- Update 2026-11-25: founder: the product will be built to the Product design, so it must match the validated workflow; iterate until the Solution Designer confirms. Round 5 requested from the Product Team: align with the rewritten contracts (Pair/Accept/Reject vocabulary replaces Connect/Allow; access code; invite code; Tailscale sign-in; Voice texts; open decisions listed; provisional G1/G4) plus a coverage table of every user-visible spine step V1–V13, T1–T10 for spine-by-spine validation.
- Update 2026-11-25: Product round 5 (@ 98f0669d) validated spine by spine: 19 match; corrections V2 (measured: runtime archive 3,365 bytes, the ~2 GB comes in 'prepare' without a byte total → no percent bar), V4 (Voice Input turns On at once; the program starts on first use), V13 (unsupported contract = Not available 'Needs a newer AutoByteus'; add the offline catalog case), T9 (Unpair, distinct from Remove). Questions a/b/c answered.
- Update 2026-11-25: Product round 5 corrections (@ bfe0d0df) re-checked: all 23 spines (V1–V13, T1–T10) match the contracts and probes; one small addition sent (installed extension whose newer version needs a newer AutoByteus: keeps working, no Update). Round released to the founder by the Product Team.
- Update 2026-11-25: Product round 6: DC-063 (narrow widths inside the extension and private-network UI) stays in this ticket; DC-064 (Settings shell on narrow widths, founder's request) split out: FU-002, its own Product ticket and engineering Task.
- Update 2026-11-25: founder decided: remove the Remote collaboration switch and the per-node collaboration toggles; Pair / Unpair are the only collaboration controls; no Pause. Recorded in pairing-contract §9 for the Private Network stage (transition of the stored ENABLE_REMOTE_COLLABORATION value to be decided in that design); Product Team told.
- Update 2026-11-25: Product round 7 (no collaboration switch) checked; pairing-contract changed: §2 adds signed POST /unpaired (A tells B; B removes its record), §4 Found lists only nodes not already in the app's Nodes list (one Pair per node). Corrections sent: remove the duplicate crossed-link icon; one Unpair confirmation style for every paired row.
- Update 2026-11-25: Product round 7 corrections (@ 45263084) confirmed. Correction of my own error: the row icon I called 'disconnect (pairing)' is 'Disconnect this desktop' (revokes this app's owner credential, NodeRow.vue:205-220, nodeConnectService.ts:110-131); removal kept because Remove already revokes access; Remove's wording now states that it gives up control.
- Update 2026-11-25: founder prefers the command to the first-run page ('I would rather run the setup code'). pairing-contract §6: the access code is printed by today's command (renamed access-code; also at the end of the start output), whatever the node's owners (NA-5, recovery); in AutoByteus only for nodes it controls (This node). First-run page dropped; joining the private network happens afterwards from the controlling app; G4 closed.
- Update 2026-11-25: Product round 8 (@ a3b4c649, first-run page dropped, access code from the command) checked against T1/T8: confirmed; server-install command named in the Needs-connecting text (node dist/node-access-cli.js access-code --data-dir <data folder>); contract §6 names both renamed commands.
- Update 2026-11-25: Product DC-073 (@ b289b24d, founder: one Add node form with an Access code field) checked against T8/§6: confirmed; 'Pair with it' after adding pairs without a further dialog (the tick is the decision, §3 case 1).
- Update 2026-11-26: founder decided the Manage Nodes structure: sections This node (incl. the two switches), Asking to pair, Nodes you control (with Add a node that isn't found), Paired nodes (teammates, no control), Found on your private network (Control via inline access code, or Pair); each node in exactly one section. Sent to the Product Team. Structure only; contracts unchanged.
- Update 2026-11-26: Product DC-075 (@ 2308c238, Manage Nodes sections) checked against T4–T6, T8, T9: confirmed.
- Update 2026-11-26: founder renamed section 'Nodes you control' → 'Controlled nodes' (zh-CN 受控节点), to match 'Paired nodes' (Product DC-076 @ a38d772f). Use 'Controlled nodes' in all documents.
- Update 2026-11-26: founder renamed the discovery switch 'Visible on my private network' (zh-CN 在我的私有网络中可见) (Product DC-078); pairing-contract §1/§2/§8 record renamed Visible (`visible`), spines and plan texts updated. DC-077: Add a node above the Controlled nodes list (layout only).
- Update 2026-11-26: founder removed the 'Trust machines I added' switch (UI as clean as possible): pairing-contract §1/§3/§8 updated (two facts decide a /pair; case 3 gone), spines/types/plan marked; Product Team told.
- Update 2026-11-26: founder renamed 'Make an access code' → 'Create access code' (button and section); contract and documents updated; Product Team told.
- Update 2026-11-26: founder asked (via the Product Team) for a final validation of the whole package at 374aa79c. Contract updated first (§4 Found excludes controlled and paired nodes; §6 Remove revokes access and unpairs first); spines Part T current added. Result: V1–V13 and T1–T9 match; T8 has one stale refusal text ('setup code') and two unused 'Setup code' keys; T10 removed. Sent to the Product Team.
- Update 2026-11-26: founder approved the Product design (374aa79c + text fix), open items as drawn; Product Team asked to finalize ui-ux-spec.md, final screenshots, integration and cleanup. Next: Stage 1 design spec.
- Update 2026-11-26: founder delegated the open items ('what is the most reasonable solution'): DEC-015 decided: install ends On; translations (optional contract fields + locale message); no Reinstall/Open folder; one click for own nodes; no 'Pair with it' checkbox; 'Create access code' only where it can work; 'Controlled by … Revoke'; voice warm-up REQ-012 (validated: tone warm-up 29.4 s in background → first dictation 0.25 s; silence does not warm; ~846 MB → unload after 30 min idle). AC-002 updated (ends On). Contract §1/§4/§5 optional additions.
- Update 2026-11-26: Product round 10 (@ b9cd440f, DEC-015 items) checked: install On, Copy, no Pair-with-it, one click, warm-up match; corrections: locale sent on frame load (not first resize); 'Create access code' rule = only when the node has an address another computer can reach (Docker on 127.0.0.1 hidden); Controlled by uses desktopName/createdAt/lastSeenAt. pairing-contract §6 records the rule and the Controlled by source.
- Update 2026-11-26: founder delegated the voice-runtime decision ('whatever is more reasonable architecture-wise … you will decide'): PRE-001 recorded (runtime 0.3.1: load the model at start, ready only when loaded, both backends); sent to the PM as a prerequisite Task; Stage 1 implementation waits for it, Stage 1 design proceeds.
- Update 2026-11-26: Product DC-090 (@ da118b6b) confirmed (locale on load; one reachability rule for Create access code; Controlled by with last used). All spines match; Product Team asked to finalize ui-ux-spec.md, final screenshots, integration, cleanup, and return the final package.
- Update 2026-11-26: PRE-001 created by the PM as autobyteus-655 (another team copy); autobyteus-516 depends on it; the PM will relay completion and the 0.3.1 artifact to pin. Stage 1 design continues.

### SR-006 — Delete the old Voice Input install instead of moving it

- Trigger: the founder, 2026-11-26, while the Stage 1 design was being written: "do you think there is a need to move them? or we simply delete them? and let the the process redownload those, what is your idea?"
- Solution Designer's recommendation: delete. The move saves only the speech-model download (the new package wraps runtime 0.3.1, PRE-001), but needs a sealed desktop migration for every released registry shape (v1 since v1.2.25, v2 since v1.2.28, `audioInputDeviceId` since v1.2.29), interruption handling, a hand-over of the microphone choice, a node rule to finish an install at start, and a second extensions location. A fresh install is measured (UP V2: 75 s, ~1.7 GB, dictation works).
- Founder's answer: "This is also what I'm thinking." → DEC-016, Decided (founder).
- Changed: BEH-007, UC-005, REQ-007 (delete once at first start, Install again), AC-008 (synthesized old install; folder gone, Not installed, Install works, second start does nothing; failure → warning, retried), SCN-004, Data Continuity, DEC-007 replaced by DEC-016. Consistency fixes from DEC-015: REQ-003 and AC-003 no longer name Reinstall; UI/UX reference and supplement rows updated; extension-contract.md status row Approved.
- Contract: §7 extensions folder is `<data dir>/extensions` on every node; `enabled` written when an install succeeds; the existing-data paragraph now says delete, not move; Voice Input package wraps runtime 0.3.1.
- Spines: V3 replaced (use-case-spines.md).
- Approval: the founder's own decision (deletion is hard to undo, so asked; answered yes).
- Design impact: the Stage 1 design has no move migration; the desktop gets a one-time deletion step in its sealed client-data migrations.

### SR-007 — Stage 1 design

- Trigger: requirements approved (SR-006); founder's direction requires his approval of the design before building.
- Written: design-spec.md (Large / High). Server subsystem `src/extensions/` (Extension Manager, Catalog, Package Installer, Server Part Host, State Store, Log); owner-only GraphQL (list, log, install, update, remove, on/off) and REST (actions, page); route table entry; web page, card, sandboxed frame and bridge; voice store via the embedded node's action route; microphone choice in the renderer's localStorage; Electron manager and IPC removed; one-time deletion of the old install (DEC-016); extension repository with the voice package, catalog build, signing and release workflow.
- Internal contract additions (part 6): list payload with `catalog` status, `updating`, `starting`, `update`, `notAvailableReason`; action error codes.
- Founder questions with the design: where the extension packages are published (recommend a public repository `AutoByteus/autobyteus-extensions`), and a separate catalog signing key he creates (never through chat).
- Approval: pending.
- Update 2026-11-26: Product final package received (`personal` @ 825434bc, ui-ux-spec.md, 113 references); linked from requirements, investigation notes and design-spec; design component names aligned with the spec (ExtensionDialogs.vue, VoiceMicrophonePanel.vue); the spec's REQ-007 row and VIS-V3-01 recorded as superseded by DEC-016.
- Update 2026-11-26: founder: each extension is its own project, some public, some private and paid (e.g. a hosted private network on our domain). Design updated: one repository per extension, one public catalog repository holding the signed list and the only signing key; paid packages/services stay a later stage (DEC-013) and fit the contract by optional fields. No contract change.
- Update 2026-11-26: PRE-001 delivered (PM, autobyteus-655): pin voice runtime **0.3.2** (0.3.1 published nothing). `ready` only after the model is loaded and one transcription is done → no warm-up clip; failed start = stderr reason + exit 1 → card shows it, microphone hidden; Apple Silicon needs Homebrew ffmpeg (present on the founder's Mac; removal is a separate runtime Task). Requirements, contract and design updated; REQ-012 unchanged (start at node start / turn-on, stop after 30 min idle).
- Update 2026-11-26: PM confirmed autobyteus-655 CLOSED on the founder's word (cleaned up); nothing changed: pin 0.3.2. The dependency is satisfied; Stage 1 implementation waits only for the founder's design approval.
- Update 2026-11-26: founder confirmed one repository per extension (DEC-017), for later commercial extensions (Shared Folder, hosted private network); explained what a private repository protects and what it cannot (installed package is readable; paid download and paid service are the real protection). Design already reflects it. Still open: design approval, catalog signing key.
- Update 2026-11-26: founder's direction for paid extensions (later stage, DEC-013): all extensions visible to every user, paid ones included; after payment Install works. Fits the contract (optional fields + higher contractVersion so older apps show 'Needs a newer AutoByteus'). No Stage 1 change.
- Update 2026-11-26: founder changed DEC-017 → DEC-018: **one public repository `AutoByteus/autobyteus-extensions`** with every extension's wrapper and the signed catalog (key as its secret); programs in their own repositories (private + paid download for commercial ones). DEC-019: the storage extension is named **Shared File System** (not Shared Folder). Design and documents updated.
- Update 2026-11-26: founder asked for a final self-validation of the contract and every use case ('then it's approved'). Walked V1–V13, REQ-012 and the paid direction (use-case-spines.md, Final check of Stage 1). Three gaps fixed: install/update into `package.new/` and swapped at the end (an install cut short leaves no half package); upload limit 100 MB instead of 25 MB (today no limit); a failed update keeps the old version working (AC-003 updated). Contract §3/§6/§7 updated (parts 1, 2, 4, 5 unchanged). Result: every use case works.
- Update 2026-11-26: **design approved by the founder** (conditional on the self-validation, which passed): "if you think like the data flow spine works for every use case then it's approved". Classified Large / High; routed by the handoff rules.

### SR-008 — Architecture review round 1 (ARCH-REV-001: Fail, Design Impact) resolved

- Trigger: `/architecture_reviewer`, design-review-report.md: AR-001…AR-005 (all Design Impact, none changes approved behavior); macro structure accepted and its rulings kept.
- AR-001: `voiceInputStore` owns this computer's Voice Input availability: reads the embedded node's `voice-input` item through `directNodeApolloClient` in every window; refreshed at window start, voice surface mount, window focus, after this window's lifecycle change, and on `EXTENSION_OFF`/`EXTENSION_NOT_INSTALLED`; added to DS-004 and the dependency rules.
- AR-002: catalog fetch policy: background once after listen, on page open / Try again (`refreshCatalog: true`), and at the start of Install/Update (must verify); 10 s bound; concurrent fetches shared; everything else uses the copy in memory and never waits.
- AR-003: chose to narrow the page loads (contract §2/§5): inline, classic scripts, stylesheets, images from `ui/`, fonts as `data:`; no file module scripts or font files; CSP narrowed; the node gate unchanged. AC-002 validation includes the packaged voice page through the real node and the desktop attacher. Solution Designer's decision: a constraint on our own extension packages, no user-visible change; founder informed.
- AR-004: removal plan completed (package.json script, two `vi.mock` specs, voiceInputStore spec, e2e fixtures, electron.d.ts lines); the real-release install test moves to `autobyteus-server-ts/tests/real-release/`.
- AR-005: catalog URL fixed: release tag `catalog` of `AutoByteus/autobyteus-extensions` (contract §3).
- Residual notes decided: per-load import counter; a late `start()` result ignored after Off; `message` precedence; override note in the module doc.
- Base refreshed: worktree fast-forwarded to `origin/personal` @ fdde5406fa; citations updated.
- Approval impact: none to intended behavior; contract §2/§3/§5 wording made exact (parts unchanged in shape). Route: back to `/architecture_reviewer` for round 2.
- Update 2026-11-26: architecture review round 2 **Pass** (ARCH-REV-002, at fdde5406fa; AR-001…AR-005 verified resolved; Large/High confirmed). The reviewer handed the package to `/implementation_engineer`; recorded only, no duplicate forwarding. Stale removal-plan citation corrected to `electron/application/electronApplication.ts:38-39,68,371,398`.

- Update 2026-11-26: implementation engineer (informational): the built-in catalog public key (extension-catalog-source.ts EXTENSIONS_CATALOG_PUBLIC_KEY_PEM) stays empty until the founder creates the Ed25519 key; until then nodes answer the catalog as unverified, and validation uses the development catalog override. Release-time item: the founder shares only the PUBLIC key PEM; the private key stays only as the EXTENSIONS_CATALOG_SIGNING_KEY secret of AutoByteus/autobyteus-extensions.
- Update 2026-11-26: implementation Design Impact (internal list payload, contract part 6): `ExtensionList.platform` added (the node's `<os>-<cpu>` from `thisPlatform()`; one reader: the approved VIS-V1-05 card text). Option (a) confirmed by the Solution Designer; no change to frozen parts 1–5 or to approved behavior.

