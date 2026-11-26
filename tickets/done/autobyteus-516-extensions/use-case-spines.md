# Use cases → business flows → data-flow spines → validation

Status: Draft 2026-11-24 (founder: "have business flow for each use case … turn those
business flows into data flow spines … then validate your data flow spine for each use
case"). Part V is Stage 1 (approved requirements); Part N is the Private Network stage
(Tailscale / Headscale types; requirements not yet approved). These spines become the
spine inventory of design-spec.md.

> **Update 2026-11-25 (founder):** "Add a machine" and the connection code made on the
> desktop are replaced by the **access code made on the target node** and pasted in
> AutoByteus under Nodes → Add node (pairing-contract.md §6); Tailscale machines join by
> **sign-in** (no join key needed); Headscale / host machines join with an **invite
> code** (§7). Sections below that mention "Add a machine" or a connection code are
> history; the contract is the authority.

How each spine step is validated (the column **Proof**):

- **CP-n / NP-n / PP-n**: a check of `probes/contract-probe`, `probes/network-probe`,
  `probes/pairing-probe` (Measured with the real voice runtime, the real `tsnet`
  library and Headscale).
- **UP**: `probes/contract-probe/run-usecase-probe.sh` (Measured: real downloads, a clone of the founder's install, a second extension).
- **SP-n**: `probes/spine-probes` (Measured against this repository's real code or
  dependency versions).
- **Code**: read in the real code, with file and line.
- **New**: target code that does not exist yet; its contract part is cited. Proved
  only when built.

Target owners on the server (new subsystem `autobyteus-server-ts/src/extensions/`,
names provisional for the design): **Catalog** (reads and verifies the signed catalog),
**Extension Manager** (lifecycle, `state.json`, the §6 states, in-memory progress),
**Package Installer** (download, checksum, unpack, compare with the catalog), **Server
Part Host** (imports `server/index.mjs`, gives each its context, calls install /
status / stop / actions), **Extension Log**. Transport: GraphQL for list and lifecycle
(owner-only resolvers), one REST route `POST /rest/extensions/:id/actions/:action` for
action calls (JSON or audio bytes, owner-only).

---

## Part V — Voice Input on the extension container (Stage 1)

### V1 — See the extensions of a node (UC-001, SCN-001/006)

Business flow: the owner opens Settings → Extensions in a window; the page lists the
extensions offered on that window's node with their state.

Spine: `Extensions page → node GraphQL (owner credential attached by the desktop) →
owner check → Extension Manager.list → Catalog (signed list) + state.json + installed
package/extension.json + Server Part Host.status → §6 states → page cards`

| Step | Proof |
| --- | --- |
| The desktop attaches the window's node credential to every request to that node | Code: `electron/nodeAccess/nodeCredentialAttacher.ts:30-42` |
| GraphQL reaches phones too at route level; resolvers must check owner | SP-1 (`/graphql → owner+phone`); precedent Code: `api/graphql/types/remote-collaboration-settings.ts:77-81` (`requireOwner`) |
| Signed catalog verified; offeredOn and platform filter; states | CP: "signed catalog verifies", "desktop-node extension not listed on another node", "unsupported platform shows notAvailableHere", "after install: installed, off, ready" |
| No owner credential → nothing listed | Code: node access gate NA-1 (`api/security/node-access-gate.ts`), DEC-005 |

### V2 — Install an extension (UC-002, SCN-002)

Business flow: Install → progress → Installed (Off, pending the founder's decision).

Spine: `Card Install → GraphQL installExtension (owner) → Extension Manager.install →
Package Installer (download packageUrl, sha256, unpack, compare extension.json with the
catalog) → Server Part Host.install(ctx with progress) → voice server part downloads
runtime + model into ctx.dir → state.json {enabled:false} → list shows installing →
installed`

| Step | Proof |
| --- | --- |
| Download, checksum, unpack, compare with catalog; refusals | CP: "package with wrong checksum refused", "package whose extension.json differs from the catalog refused" |
| Server part imported as `server/index.mjs` and run | CP (all install checks); finding: `.mjs` |
| Progress while installing | CP host keeps progress in memory (`host.mjs`); voice fresh download path: today's code Code: `electron/extensions/voice-input/voiceInputRuntimeService.ts:256-366` (moves into the server part) |
| A long install must not hold the GraphQL request | New: install starts and returns; the page polls the list (today's pattern Code: `stores/extensionsStore.ts:72-77`) |
| Fresh download of runtime + model inside the server part | UP: "V2 fresh install: real runtime and model downloaded, installed Off and ready" (75 s; runtime from GitHub, model from Hugging Face; 1.7 GB on disk incl. the kept archive), "V2 dictation works on the fresh install" (first call 29.5 s) |

### V3 — Adopt the founder's existing Voice Input on upgrade (UC-005, SCN-004, REQ-007)

> **Replaced 2026-11-26 (DEC-016, founder):** the old install is **deleted** once at the first
> start of the new version (`<base data folder>/extensions`), and Voice Input is installed
> again from its card (V2). The move below was validated and rejected; kept as history.
> New spine: `Desktop start → one-time deletion of <base data folder>/extensions (sealed client-data
> migration, before the embedded node starts) → node starts → Extensions page: Voice Input Not installed → V2`.

Business flow: the founder updates the app; Voice Input is still On, English, his
microphone; nothing big is downloaded.

Spine: `Desktop start → one-time move (desktop side, before the embedded node starts):
~/.autobyteus/extensions/voice-input/{runtime,models} → <extensions folder>/voice-input/data/,
language → data/settings.json, enabled → state.json, microphone → AutoByteus setting →
embedded node starts → Extension Manager sees state entry without package → Package
Installer fetches the small package → server part install() adopts runtime + model → On`

| Step | Proof |
| --- | --- |
| Runtime keeps working from a new folder (relocatable) | CP: "install adopts existing runtime without downloading" (12 ms), transcription from the moved copy |
| Founder's real data shape | Measured (read-only): `investigation-notes.md` persisted-data facts |
| The move itself (rename, no copy), language → settings.json, on → state.json, microphone handed back for the AutoByteus setting; first start fetches the small package and adopts | UP: "V3 move: today's install recognised and moved by rename", "V3 move: new layout", "V3 first start: … still On with English, nothing big downloaded" (15 ms), "V3 dictation works after the move"; unrelated files (Finder's .DS_Store) are left alone |

### V4 — Turn on / off (UC-002)

Spine: `Card switch → GraphQL setExtensionEnabled (owner) → Extension Manager →
state.json; off → Server Part Host.stop → voice worker stops`

| Step | Proof |
| --- | --- |
| Off stops the worker; actions refused while off | CP: "turning off stops the worker", "action refused while turned off" |

### V5 — Dictate (UC-004, SCN-003, REQ-006)

Business flow: the user presses the microphone button (composer, Task description,
Project description, Memory search), speaks, stops; text appears in the draft, not sent.

Spine: `Microphone button → AutoByteus recorder (this window, chosen microphone) → WAV
(mono, 16-bit, the device rate) → POST <this computer's node>/rest/extensions/voice-input/actions/transcribe
(audio/wav, owner credential attached) → route permission (owner) → Extension Manager
(installed + on) → Server Part Host.call('transcribe', {bytes}) → voice server part →
temp file → worker (JSON line) → Whisper → {text, noSpeech, detectedLanguage} → draft`

| Step | Proof |
| --- | --- |
| Recorder output format: mono, 16-bit, the AudioContext's rate (typically 48 kHz), no length limit | Code: `workers/voice-input-recorder.worklet.js:24-29,48`, `stores/voiceInputStore.ts:258` |
| The route must be owner-only: by default a new `/rest/extensions/...` route is open to phones | SP-1 (`→ owner+phone` today); New: add to the owner actions in `api/security/node-route-permissions.ts` |
| Audio bytes reach the route: Fastify 5.12.7 refuses `audio/wav` by default (415); a route-scoped parser with its own body limit accepts a 30 s recording (2.9 MB) | SP-2 |
| transcribe through the action: English, Chinese, silence; cold ~30 s, warm 0.2 s | CP: "English transcription (cold/warm)", "Chinese transcription", "silence reports no speech" |
| Worker gets the user's PATH when the server spawns it | Code: `electron/server/serverRuntimeEnv.ts:106-136` (login-shell PATH for the embedded server); runtime finds Python via PATH Code: runtime `bin/voice-input-worker` `find_python` |

### V6 — Dictate in a window of another node (UC-004, SCN-005, REQ-008)

Spine: as V5, but the window's page sends the WAV to **the embedded node's** address,
not the window's node.

| Step | Proof |
| --- | --- |
| Every window knows the embedded node's address | Code: `stores/nodeStore.ts:171-173` |
| A window can call a node other than its own | Code: `services/nodeCollaboration/directNodeApolloClient.ts:17-31` (in use for peers) |
| The credential is attached by request address, whatever window sends it | Code: `nodeCredentialAttacher.ts:30-42` |

### V7 — Change language on the extension's page (UC-002)

Spine: `Voice Input page (sandboxed frame) → postMessage {id, call:'setLanguage'} →
AutoByteus card (accepts only its frame's event.source) → POST .../actions/setLanguage
(JSON) → Server Part Host → voice server part writes ctx.dir/settings.json → reply →
page`

| Step | Proof |
| --- | --- |
| Bridge calls, unknown action refused, page cannot fetch or reach the parent | CP bridge test (browser tab): getLanguage, setLanguage, unknownAction refused, directFetch blocked, parent blocked |
| Settings survive update | CP: "update kept the language setting" |

### V8 — Microphone choice and Test (AutoByteus's own section)

Spine: `Microphone picker / Test (AutoByteus page) → recorder → as V5 → result shown in
the card`

| Step | Proof |
| --- | --- |
| Device IDs belong to the page that records | Design finding (contract): a sandboxed page has an opaque origin (CP bridge test: origin `null`) |
| Test uses the same transcribe path | as V5 |

### V9 — Update (UC-002)

Spine: `Catalog has a higher version → card "Update to x.y.z" → GraphQL update (owner) →
stop → Package Installer replaces package/, keeps data/ → install(ctx) → still on`

| Proof | CP: "newer catalog version shows Update", "after update: 1.0.1, still on, ready", "transcription works after update" |
| --- | --- |

### V10 — Remove (UC-002)

Spine: `Remove (confirmed) → GraphQL remove (owner) → stop → delete <id>/ → state entry
removed`

| Proof | CP: "remove deletes the folder and the state entry", "no worker left after remove" |
| --- | --- |

### V11 — View log (UC-003)

Spine: `View log → GraphQL extensionLog(id) (owner) → last lines of <id>/extension.log`

| Proof | CP: "extension log written"; UP: "V11 the card can read the extension's last log lines" |
| --- | --- |

### V12 — A broken extension does not break the node (UC-003, SCN-008, REQ-009)

Spine: `Node start / list → Extension Manager reads state.json and each package →
unreadable entry or a status() that throws → that card "Failed: message", warning
logged with the extension's ID, nothing deleted → other extensions and the node work`

| Proof | UP: "V12 the broken extension shows Failed with a message", "V12 the other extension keeps working", "V12 nothing is deleted or rewritten", "V12 an unreadable state file: the list still works (everything shown Off)" |
| --- | --- |

### V13 — Refusals (UC-002, SCN-007, REQ-005)

| Refusal | Proof |
| --- | --- |
| No owner credential / phone credential on lifecycle and action calls | SP-1 shows the gap to close; Code: gate NA-1/NA-7 |
| Tampered catalog, other signing key, wrong checksum, mismatched package, unsupported contract or platform | CP refusal checks |
| Inherited property used as an action name | CP: "inherited property is not an action" |

---

## Part N — Private Network for Tailscale / Headscale (Private Network stage)

Target owners: the **Private Network** extension (server part + the AutoByteus Network
program), and in the node: **Pairing** (node key, peer records, grants, pending
requests, signed requests; pairing-contract §1–§6) and **Discovery** (§7). In the
probes the "node" was `mini-node.mjs`; in the product these live in the server's node
access and remote collaboration subsystems (design decision of that stage).

### N1 — Install and join (private-network-types §1–§2)

Business flow: install → turn on → sign in with Tailscale / paste a join key / Headscale
URL + key → joined: this machine, my machines.

Spine: `Private Network page → bridge → server part → start the network program (start
step) → program joins the coordination server (key or login link) → {ip, account} →
page`

| Step | Proof |
| --- | --- |
| Join with a key, no administrator rights, no network device, real Tailscale untouched | NP: "three machines joined…", "no VPN device created", "your real Tailscale untouched" |
| Machine list with account and online | NP: "ryan-mac lists the other machines with who added them" |
| Program must run all the time: contract needs `start` | NP finding 1 |
| Sign-in link, real Tailscale keys, device approval, key expiry | **Not proved** (provisional) |

### N2 — Visible on my private network

Spine: `Nodes switch → node setting (one boolean) → /autobyteus/info answered or not`

| Proof | PP discovery checks; switch itself: New (one boolean, pairing-contract §7) |
| --- | --- |

### N3 — Discover nodes

Spine: `Nodes tab → node → network program status (machine list) → for each online
machine: POST /autobyteus/info over the private network → AutoByteus nodes → minus
paired → "Found on your private network"`

| Proof | PP: "auto-discovery finds the AutoByteus nodes … not other machines" (0.7 s), "the discovery answer needs the private network" |
| --- | --- |

### N4 — Pair your own node (one click)

Spine: `Pair → desktop (owner of both) → found node mints a grant for this node's machine
→ this node sends /pair with the grant over the private network → found node checks
grant + network caller → both store peer records (keys) → Nodes list mark`

| Proof | PP: "one click: … paired (keys exchanged)", "signed requests work both ways", "a used grant is refused", "grant … refused from another machine", "an expired grant is refused" |
| --- | --- |

### N5 — Teammate: Connect / Allow / Reject / Cancel

Spine: `Connect → /pair without grant → pending on B ("bob-laptop, added by bob") → B's
owner Allow → B calls A /pair-accepted → A (only with an outstanding Connect) stores
teammate peer` · Reject → `/pair-rejected` · Cancel → A drops the Connect

| Proof | PP: "teammate Connect shows …", "Allow pairs both sides as teammates", "a teammate is never an owner", "a forged accepted … refused"; Reject and Cancel: New (pairing-contract §4, added from the Product round) |
| --- | --- |

### N6 — Collaborate (every request between paired nodes)

Spine: `Node A sends a signed request (nodeId, timestamp, signature) through the network
program → B's network program attaches the caller's machine and account → B checks
peer record, signature, time, caller machine → handled`

| Proof | PP: "a found but unpaired node is refused", "a forged signature is refused", "a replayed old request is refused", "stolen key … from another machine is refused", "after unpairing, requests are refused" |
| --- | --- |

### N7 — Add a machine (connection code) and the first-run page

Spine: `Add a machine (owner pastes a one-time network key, or Headscale API makes one)
→ code {joinKey, owner, grant, expiresAt} → pasted on the new node's first-run page
(loopback, no owner) → expiry checked → join → /pair with the grant → owned + paired →
appears in the desktop's Nodes list`

| Proof | PP: "one paste: the new node joins … paired and owned" (3.0 s), "owner node can perform owner actions", "pasting again on an owned node is refused", "same code … refused on another node", "expired code is refused", "first-run page cannot be reached over the network"; the early expiry check: New (finding 2); the desktop list entry: New |
| --- | --- |

### N8 — Unpair, remove a machine, leave

| Flow | Proof |
| --- | --- |
| Unpair | PP: "after unpairing, requests are refused" |
| Remove a machine on the coordination server | NP: "removed machine can no longer reach your servers" (11.1 s), "disappears from your machine list" |
| Leave / switch network type | New (private-network-types common section) |

### N9 — "Trust machines I added" (opt-in, receiving side)

| Proof | PP: "opt-in switch on: a same-account machine pairs without a click"; off by default: PP "fake machine on your account without your click is only a pending request" |
| --- | --- |

### N10 — Restart

| Proof | NP: "restarted machine rejoins without any key" (reachable after 12.6 s) |
| --- | --- |

---

## What the validation changed or added

- **SP-1:** a new `/rest/extensions/...` route is open to phones by default → it must be
  added to the owner actions; GraphQL resolvers check owner (V5, V13).
- **SP-2:** the transcribe route needs its own `audio/wav` parser and body limit; the
  recorder has no length limit, so the design sets one (V5).
- Earlier probes: `.mjs`; bridge `event.source`; runtime relocatable (adoption by
  move); `start` step; stable machine ID; `expiresAt` in the code.

- **UP:** a fresh install takes ~75 s and 1.7 GB (the design deletes the downloaded
  archive after unpacking); the first transcription after the voice program starts takes
  ~30 s on this Mac every time (cold model load), so the slow-note rule stands; the move
  must leave unrelated files alone; an unreadable `state.json` shows everything Off and
  is logged, never rewritten.

## Not proved (needs building or the founder's devices)

Voice Input: none left at prototype level; what remains is the production code itself
(the design builds exactly these spines). Private Network: N1 real Tailscale sign-in, keys, approval, expiry; real networks, relays,
mobile, Android; the product's own pairing owners (the probes used a mini node).

---

## Part T — Private Network for Tailscale, detailed spines (2026-11-24)

With the action routing of Part V: the Private Network extension exposes actions
(`signIn`, `join`, `status`, `machines`, `leave`, `relayAddress`); AutoByteus's own
**Discovery** and **Pairing** owners call them through the Server Part Host. The
**AutoByteus Network program** (tsnet) talks to Tailscale's coordination server and
relays, forwards connections arriving on the private network to a **private-network
listener** of the AutoByteus server (only the program uses it; it attaches the caller's
machine ID and account), and offers a **local relay** for the server's outgoing calls.

Three gaps found while writing these out (not covered by the probes; for the Private
Network design):

- **G1. The desktop app cannot reach private addresses by itself.** The network runs
  inside the node's program (userspace), not on the computer, so the desktop window's
  requests to a node's private address must go through the embedded node's local relay
  (an Electron proxy rule for the private range). Not proved.
- **G2. A brand-new node must get the Private Network extension before it can join.**
  The first-run page installs it from the catalog (needs the internet), then joins.
- **G3. How the desktop gets owner access to a node added with a code.** Proposal: in
  its pair answer the new node hands the owner node a one-time **setup code** (today's
  mechanism, NA-5) over the encrypted private network; the desktop exchanges it for an
  owner credential as today. Not proved.

- **G4. "Only this computer" for a Docker node's first-run page.** Today's setup code
  for a Docker node comes through the node's local control socket inside the container
  (`autobyteus-docker setup-code`), which is provably local. A browser request to a
  Docker node arrives through the port the launcher publishes; inside the container it
  may not come from a loopback address, so "this request is from this computer" needs
  its own check (for example: the first-run page is answered only on the launcher's
  `127.0.0.1` publication, or the launcher opens it with a one-time local token). Not
  proved; decide in the Private Network design.

T1 Install and sign in:
`Card Install → GraphQL (owner) → Extension Manager → Package Installer → server part
install (downloads the network program) → On → start step: server part starts the
program → page "Sign in with Tailscale" → bridge → action signIn → server part →
program asks Tailscale for a login link → page shows it → user approves on Tailscale's
site (device approval may make it wait) → program Running {private IP, account, machine
ID} → status ready → page: This machine, My machines`
(join key instead: action `join {key}`; then the same.)

T2 Node restart: `node start → Extension Manager → start step → program with saved state
→ rejoins → status ready` (NP: ~12.6 s until reachable)

T3 "Visible on my private network": `Nodes switch → GraphQL (owner) → Discovery
setting (one boolean) → private-network listener answers /autobyteus/info only when on`

T4 Discovery:
`Nodes tab → GraphQL foundNodes (owner) → Discovery → action machines (Server Part Host →
server part → program: Tailscale's machine list: name, machine ID, account, online,
private IP) → for each online machine: POST /autobyteus/info through the local relay →
WireGuard (direct or Tailscale relay) → that machine's program → its private-network
listener (caller attached) → its Discovery: switch on? → {nodeId, name} → back → minus
already paired → marked: yours (this desktop holds its owner credential) / someone
else's / unknown on your account → "Found on your private network"`

T5 Pair your own node:
`Pair → desktop (through its embedded node's relay, G1) → node B: mint grant for A's
machine ID (owner) → desktop → node A: pairWith(B's private IP, grant) (owner) → A's
Pairing → POST /pair {nodeId, name, publicKey, grant} via A's relay → B's program → B's
listener (caller = A's machine ID, account) → B's Pairing checks the grant (one use,
expiry, for this machine) → stores A {public key, machine ID, account, own} → answers
B's identity → A stores B → Nodes list mark`

T6 Teammate: `Connect → /pair without grant → B pending ("bob-laptop, added by bob") →
B's owner Allow → B → /pair-accepted → A (only with its Connect outstanding) stores
teammate · Reject → /pair-rejected · Cancel → A drops the Connect`

T7 Collaborate: `agent on A delegates to a shared agent on B → Remote Collaboration →
Pairing signs (node ID, time, signature) → A's relay → B's program → B's listener
(caller) → B's Pairing verifies peer, signature, time, machine → Remote Collaboration
on B → answer back`

T8 Access code (founder 2026-11-25, replaces "Add a machine"): `new node's first-run page
(that computer, no owner; G4 on Docker) → installs the Private Network extension (G2) →
Sign in with Tailscale → joined → "Create access code" → code {nodeId, address = private
address, setupCode, expiresAt} → owner pastes it in AutoByteus: Nodes → Add node → expiry
checked → the app reaches the address through its own node's relay (G1) → setup exchange
(today's) → owner credential → node listed → Pair as T5` (G3 is no longer needed: the
setup code travels inside the access code.)

T9 Unpair / remove / leave: `Unpair → peer records deleted → requests refused` ·
`machine removed in the Tailscale admin console → access ends everywhere (~11 s)` ·
`Leave → action leave → program logs out and stops → network state forgotten`

T10 "Trust machines I added": `/pair without a grant from a machine of your own account
→ switch on? paired : pending`

Proof: as Part N (NP/PP for join with keys, machine list, who-is, discovery, pairing,
refusals, revocation, restart). Not proved: Tailscale sign-in, real auth keys, device
approval, key expiry, sharing, G1, G2, G3, real networks and relays.

---

## Validation summary per use case (2026-11-25)

Checked against extension-contract.md and pairing-contract.md as rewritten on 2026-11-25
(consistency audit: stale catalog wording in requirements REQ-002/REQ-003/AC-003/QR-001/
DEC-004 and the old "Add a machine" texts corrected the same day).

| Spine | Status | Proof |
| --- | --- | --- |
| V1 list | Validated | CP, SP-1, code |
| V2 install (fresh, real downloads) | Validated | UP V2 |
| V3 move of the founder's install | Validated | UP V3 (clone) |
| V4 on/off | Validated | CP |
| V5 dictate | Validated | CP, SP-1, SP-2, code |
| V6 dictate in another node's window | Validated by reading | code (attacher, embedded address, direct client) |
| V7 language on the page | Validated | CP bridge test |
| V8 microphone and Test | Validated by design | CP origin finding; V5 path |
| V9 update / V10 remove | Validated | CP |
| V11 log | Validated | UP V11 |
| V12 containment | Validated | UP V12 |
| V13 refusals | Validated | CP, SP-1 |
| T1 join | Partly: Headscale key yes; Tailscale sign-in no | NP |
| T2 restart | Validated | NP |
| T3 discoverable | Validated | PP |
| T4 discovery | Validated | PP |
| T5 pair your own node | Validated | PP |
| T6 teammate Pair/Accept/Reject/Cancel | Validated | PP, AP |
| T7 collaborate (signed requests) | Validated | PP |
| T8 access code | Validated (relay via SOCKS5 in the probe; the desktop's own relay: not proved) | AP |
| T9 unpair / remove / leave | Unpair, remove validated; leave by design | PP, NP |
| T10 trust switch | Validated | PP |

Remaining unproved, all for the Private Network stage: Tailscale sign-in and real
Tailscale keys; the desktop app's relay (Electron, HTTP CONNECT, see G1); G4 (Docker
first-run page locality); real networks, relays and mobile; the product's own pairing
code. Voice Input (Stage 1): nothing left unproved at prototype level.


> **2026-11-26 (founder):** "Trust machines I added" is removed (pairing-contract §9); the trust-switch parts above (N9, T10, "trust switch" mentions) are history.


---

## Part T current (2026-11-26) — supersedes T3, T4, T8, T9, T10 above

Founder decisions since Part T was written: access code from the command (no first-run
page), no "Trust machines I added", no Remote collaboration switch, Manage Nodes sections
(This node · Asking to pair · Controlled nodes · Paired nodes · Found on your private
network), "Visible on my private network", "Create access code", one Add node form.

T3 Visible: `This node → "Visible on my private network" → GraphQL (owner) → node record
visible (boolean) → /autobyteus/info answered only while on`

T4 Discovery: `Found section → GraphQL foundNodes (owner) → Discovery → network program
machine list → /autobyteus/info over the private network → AutoByteus nodes → minus
nodes this app controls and nodes this node is paired with → marked: someone else's /
machine on your account this app does not control → Found rows (Pair / Control)`

T5 Pair your own node (Controlled nodes row, or "Pair with it" after adding): `Pair →
app (controls both) → B mints a grant for A's machine → A sends /pair with it → B checks →
both peer records → row: Paired + Unpair` (no Accept, no dialog)

T6 Someone else's node (Found row): `Pair → A sends /pair without grant (outstanding) →
B: "Asking to pair" → Accept → /pair-accepted → teammate records → A's "Paired nodes" ·
Reject → /pair-rejected → "declined" · Cancel → A drops it`

T8 Access code: `node's computer: autobyteus-docker access-code <node> (or node-access-cli
access-code; or new-container's last line) via the local control socket → abps_{nodeId,
address, setupCode, expiresAt} → app: Add node form (Access code field fills the address)
or Found row → Control, or the Needs-connecting row → expiry checked → reach the address
(through this app's node relay when private, G1) → setup exchange → owner credential →
"Controlled nodes"` · a node that controls the target: `This node → Create access code →
same code`

T9 Unpair / Remove / Leave: `Unpair (inline confirmation) → own record removed → signed
/unpaired → other side removes its record → own node stays in Controlled nodes (Pair
again), a teammate's node returns to Found` · `Remove → unpair first if paired → this
app's owner credential revoked on the node (NA-11) → out of the list` · `Leave → network
program logs out, state forgotten; peer records stay, unreachable`

T10 (removed): the trust switch no longer exists; every request from a node this app does
not control waits for Accept.

Validation of these against the design at 374aa79c: see the final check below.

## Final check of the design at 374aa79c (2026-11-26)

Against extension-contract.md, pairing-contract.md (§0–§9 as of 2026-11-26) and the
current spines (Part V; Part T current). Method: the design change log DC-001…DC-080,
the round-5 coverage table for what did not change since, and the live reference (desktop
window, `nodes_user`, `network_joined`): Manage Nodes sections and texts, an Unpair → Pair
of docker (one click, no dialog: §3 case 1), the Docker Guide's access-code card and
connect steps, the Extensions page (no trust switch; "Visible on your private network").

| Spine | Result |
| --- | --- |
| V1–V13 | Match (unchanged since the round-5 validation; 2 GB, no percent, on at once, Not available / offline / unverified catalog) |
| T1 join | Match (in the node's own window; Tailscale sign-in provisional) |
| T2 restart | Match |
| T3 visible | Match ("Visible on my private network" on This node) |
| T4 discovery | Match (Found = neither controlled nor paired; Control / Pair) |
| T5 pair own node | Match (one click from the row or "Pair with it"; no dialog, also for a node added by address) |
| T6 someone else's node | Match (Pair → Asking to pair → Accept / Reject; Cancel; Paired nodes) |
| T7 collaborate | Match (no switch; signed requests; server only) |
| T8 access code | Match, except one refusal text: an invalid code on the Needs-connecting row still says "The setup code is not valid… Create a new one on the node's computer" (`NodeAccessNotice.vue:88`, key `access.errorCode`); and two unused keys `access.codeLabel` / `access.codePlaceholder` ("Setup code…") |
| T9 unpair / remove / leave | Match (inline Unpair, /unpaired; Remove revokes access, unpairs first) |
| T10 | Removed by the founder; nothing left in the design |

Open for the founder, kept as recommended: install ends On/Off, translations, Reinstall /
Open folder, one click for own nodes, "Pair with it"; proposals not yet answered: show
"Create access code" only where the code can work, "Controlled by … Revoke".

## Final check of Stage 1 (2026-11-26, after DEC-015…DEC-019 and runtime 0.3.2)

Founder: "if you think like the data flow spine works for every use case then it's approved".
Each Voice Input use case walked through extension-contract.md (current) and design-spec.md
(spines DS-001…DS-009), with the founder's later decisions applied.

| Use case | Walk (contract part → design spine) | Result |
| --- | --- | --- |
| V1 list | §3 signed catalog (one repository, DEC-018) → §6 list with catalog status → DS-001; Docker window: `desktop-node` filtered by `isDesktopEmbeddedNode()`; no owner / phone: resolver refuses → page note | Works |
| V2 install | §3 entry → §2 package → `package.new/` → §4 `install(ctx)` with progress → `package/` → §7 `enabled: true` (DEC-015) → `start` (0.3.2: ready only when loaded) → `starting` shown → DS-002 | **Gap fixed:** an install cut short now leaves no half package (unpack and `install` in `package.new/`, renamed at the end) |
| V3 old install | DEC-016: `<base data folder>/extensions` deleted once in the background → Voice Input Not installed → V2 → DS-008 | Works (replaces the move) |
| V4 on/off | §7 `enabled` → `stop` / `start` → DS-003 | Works |
| V5 dictate | recorder → `POST …/actions/transcribe` (`audio/wav`) → owner route → Manager gate → §4 action → worker (started, or started now in ~1.3 s after idle unload) → text → DS-004; start failure (e.g. no ffmpeg) → `ready: false` + reason → button hidden | **Gap fixed:** upload limit 25 MB would refuse recordings over ~4 min (today: no limit) → 100 MB (~17 min), refused with a clear code |
| V6 other node's window | WAV to the embedded node's address; credential attached by origin; CORS reflects the request headers (`node-access-plugin.ts:44-47`) | Works |
| V7 language | §5 bridge (frame `event.source`) → `setLanguage` (JSON) → `data/settings.json`; `getSettings` gives folder for Copy; `locale` sent on frame load | Works |
| V8 microphone, Test | renderer localStorage (one packaged origin for all windows) → Test = V5 | Works |
| V9 update | catalog version higher → `updating` → new package in `package.new/` → `install(ctx)` → swap → start if On | **Gap fixed:** a failed update keeps the old version working ("Update to x failed", Update still offered) instead of "Failed / Install again"; AC-003 updated |
| V10 remove | stop → delete `<id>/` → delete entry; microphone choice stays | Works |
| V11 log | `extensionLog` → last 200 lines of `<id>/extension.log` | Works |
| V12 broken | unreadable package → that card Failed, nothing deleted; unreadable `state.json` → installed extensions Off (installed = valid package; no entry = Off) | Works, consistent with the approved screen V12-02 |
| V13 refusals | phone / no credential; catalog unverified or unreachable (Install/Update off; installed keep working); checksum / mismatch; higher `contractVersion` ("Needs a newer AutoByteus", also for a newer version of an installed one); unknown or inherited action; Off; busy | Works |
| REQ-012 warm | `start` after the node listens and on turn-on/install; `starting` → card "Getting ready"; stopped after 30 min idle | Works (no clip with 0.3.2) |
| Paid later (DEC-013 direction) | visible to all; optional fields + higher `contractVersion` | Fits the contract; no Stage 1 change |

Contract changes from this check: §3 names the one repository; §6 lists `updating`, `starting`,
`update`, the catalog status and the two "not available" reasons; §7 says an installed extension
without an entry is Off and describes `package.new/`. Parts 1, 2, 4 and 5 (what extensions build on)
are unchanged.
