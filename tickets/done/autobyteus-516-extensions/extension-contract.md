# Extension Contract (autobyteus-516, Stage 1)

Status: **Approved by the founder** (2026-11-22, SR-005), current as of 2026-11-26 with
the additions and DEC-016 changes marked below (all optional or AutoByteus-internal). Rule: **a field
exists only if something in Stage 1 reads it.** The contract grows only by optional
fields (like the frozen node-update contracts C1–C4 in DESIGN.md); nothing is renamed or
removed; `contractVersion` changes only for a change an older AutoByteus cannot handle.
This contract is a deliberate exception to DESIGN.md rule 9 (founder's decision
DEC-012): extensions are released separately from the app.

Parts 1–5 are what extensions depend on. Parts 6–7 are AutoByteus-internal (one
release) and listed so the walks are complete.

## 1. The description file: `extension.json` (package root)

```json
{
  "id": "voice-input",
  "name": "Voice Input",
  "description": "Dictate instead of typing. Speech becomes text on this computer. Uses the microphone; downloads about 2 GB on install.",
  "version": "1.0.0",
  "contractVersion": 1,
  "offeredOn": "desktop-node",
  "platforms": ["darwin-arm64", "darwin-x64", "linux-x64", "win32-x64"]
}
```

| Field | Meaning | Written by | Read by |
| --- | --- | --- | --- |
| `id` | unique name, lowercase with dashes | the extension's author | state key, folder name, routes; matched with the catalog entry |
| `name` | card title | author | card |
| `description` | card text, including what it needs (microphone, administrator approval, download size) | author | card |
| `version` | semantic version | author (each release) | card; Update offered when the catalog's version is higher |
| `contractVersion` | integer contract version it needs | author | AutoByteus refuses an unsupported one, with a message |
| `offeredOn` | `desktop-node` (only the desktop app's own node; used by every window) or `every-node` | author | which nodes list it (REQ-011) |
| `platforms` | `<os>-<cpu>` values it supports | author | "Not available on this computer" before any download; install refused elsewhere |

Optional (added 2026-11-26, DEC-015): `translations`, e.g.
`{ "zh-CN": { "name": "语音输入", "description": "…" } }`: read by the card when the app's
language has an entry; otherwise the English text. Left out: icon, author, licence,
homepage, a "needs" list (the description says it), price, permissions, entry paths
(fixed layout), dependencies, minimum app version (`contractVersion` covers it).

## 2. The package

One `.tar.gz` with a fixed layout:

```
extension.json
server/index.mjs    one self-contained ES module: the server part (part 4); .mjs, so Node loads it as a module (CP finding)
ui/index.html       the extension's own page (part 5); may load files next to it in ui/ (see below)
```

What the page may load (added 2026-11-26 after architecture review ARCH-REV-001 AR-003; checked
against the node's origin rule): inline scripts and styles, and classic scripts
(`<script src>`), stylesheets and images from `ui/`; fonts only as `data:` URLs. Not module
scripts loaded from files and not font files: from a sandboxed page these are CORS loads with
`Origin: null`, which the node refuses. A bundler builds the page as classic scripts or inlines it.

## 3. The catalog: which extensions exist

One catalog at a URL built into the app, with its signature:
`https://github.com/AutoByteus/autobyteus-extensions/releases/download/catalog/extensions-catalog.json`
and the same URL with `.sig` (Ed25519 over the exact bytes; the public key is built into
AutoByteus, as for the signed server package description today). Both are the assets of the
fixed release tag `catalog` of the one public repository `AutoByteus/autobyteus-extensions`, which
also holds every extension's package (DEC-018; the programs an extension downloads live in their
own repositories). The catalog release replaces those two assets; package releases use their own
tags (`<id>-v<version>`) and never touch `catalog`. Every released app keeps this URL, so it never
changes (ARCH-REV-001 AR-005). Only extensions
in a catalog signed by AutoByteus can be installed (DEC-011).

```json
{ "extensions": [ { "id": "voice-input", "name": "Voice Input", "description": "…", "version": "1.0.0", "contractVersion": 1, "offeredOn": "desktop-node", "platforms": ["darwin-arm64", "darwin-x64", "linux-x64", "win32-x64"], "packageUrl": "https://github.com/AutoByteus/…/voice-input-1.0.0.tar.gz", "sha256": "…" } ] }
```

Each entry is the extension's `extension.json` plus:

| Field | Read by |
| --- | --- |
| `packageUrl` | Install and Update: where to download the package |
| `sha256` | Package Installer: the download must match; with the signed catalog this proves the package is ours (packages need no signature of their own) |

On install AutoByteus also checks that the package's `extension.json` equals the catalog
entry. Left out: size, release notes, dates, a catalog version. A private or paid
source later changes how `packageUrl` is fetched, not this shape (payment: DEC-013,
later).

## 4. The server part: `server/index.mjs`

```ts
export default {
  install(ctx: InstallContext): Promise<void>,   // Install and Update: fetch and prepare its programs inside ctx.dir
  status(ctx: Context): Promise<{ ready: boolean; message: string }>,
  stop(ctx: Context): Promise<void>,             // turned off, updated, removed, or the node stops
  actions: { [name: string]: (ctx: Context, input: { json: unknown; bytes: Uint8Array | null }) => Promise<unknown> }
}
type Context = { dir: string; platform: string; log(line: string): void };
type InstallContext = Context & { progress(p: { message: string; percent: number | null }): void };
```

| Item | Meaning | Read by |
| --- | --- | --- |
| `install` | download and prepare its programs into `ctx.dir`; it deletes downloaded archives after unpacking (UP finding: 1.7 GB otherwise) | Extension Manager on Install / Update / first start after the move |
| `status` | ready or not, and a message | card state; AutoByteus features (the microphone button appears only when ready) |
| `stop` | stop what it runs | on off, update, remove, node stop |
| `actions` | the extension's own operations, by name; only these names can be called (an inherited name such as `constructor` is refused, CP) | the action route (part 6) |
| `ctx.dir` | its own folder (programs, models, its settings); kept on update, deleted on remove | the extension |
| `ctx.platform`, `ctx.log`, `progress` | build to fetch, its log, install progress | the extension; card |

The server part registers no routes and opens no ports: AutoByteus routes every call
(part 6). Optional `start(ctx)` (added 2026-11-26): run when the node starts and when the extension is turned on; Voice Input uses it to start its worker, which with runtime 0.3.2 loads the model before it reports ready (~850 MB while running, stopped after 30 minutes idle) (REQ-012), Private Network to run its program. Left out until an extension needs it: events, a settings API (an extension keeps its own
settings in `ctx.dir`), any access to agents, runs, Projects or credentials.

## 5. The page's bridge: `ui/index.html` ↔ AutoByteus

Shown inside its card in a frame with `sandbox="allow-scripts"` and
`connect-src 'none'`: no network access (the desktop adds the owner credential to every
request to a node, so the page must not make requests itself), no access to the
AutoByteus page. It talks only through `postMessage`, only to its own extension's
actions:

```json
page → AutoByteus   { "id": "7", "call": "setLanguage", "input": { "language": "en" } }
AutoByteus → page   { "id": "7", "ok": true, "output": { … } }
AutoByteus → page   { "id": "7", "ok": false, "error": "…" }
page → AutoByteus   { "resize": { "height": 320 } }      (added 2026-11-24: optional, no reply; clamped to 48–2000 px)
AutoByteus → page   { "locale": "zh-CN" }                (added 2026-11-26: sent once when the page loads; the page shows its texts in that language when it has them)
```

The page loads only what part 2 allows. AutoByteus accepts messages only from that extension's own frame (`event.source`; a
sandboxed page's origin is `null`) and replies to that frame. `resize` is not an action
call (no `id`, no `call`), so it cannot collide with an action named `resize`. Left out:
theme, navigation, events pushed to the page, bytes from the page.

## 6. Routing on the node (AutoByteus-internal, owner credential only)

| Endpoint | Does | Checks |
| --- | --- | --- |
| GraphQL: list, install, update, remove, turn on/off, read log | lifecycle (Extension Manager) | the resolver checks the owner credential (GraphQL as a route is open to phones too, SP-1) |
| `POST /rest/extensions/:id/actions/:action` | calls one action: `application/json` → `input.json`; `audio/wav` → `input.bytes` (a route-scoped parser with its own body limit: Fastify refuses `audio/wav` by default, SP-2) | added to the owner-only routes (a new `/rest/extensions/...` route is open to phones by default, SP-1); installed and on; the action is one of its own |
| `GET /rest/extensions/:id/ui/...` | serves its page from the installed package | owner only; sent with the sandbox CSP |

List states: `notAvailableHere` (platform, or needs a newer AutoByteus) · `notInstalled` ·
`installing {message, percent}` · `updating {message, percent}` ·
`installed {version, enabled, ready, starting, message, update}` · `failed {message}`
(an unreadable package, a `status()` that fails, or an install that failed). The list also says
whether the catalog is verified, unverified or unreachable; installed extensions are listed
in every case. The exact payload: design-spec.md, Data Contract.

## 7. What the node stores

```
<extensions folder>/state.json            { "voice-input": { "enabled": true } }
<extensions folder>/<id>/package/          the unpacked package (replaced on update)
<extensions folder>/<id>/data/             ctx.dir (deleted on remove)
<extensions folder>/<id>/extension.log
```

The extensions folder is `<data dir>/extensions` on every node (the desktop's own node:
`~/.autobyteus/server-data/extensions`). Changed 2026-11-26 with DEC-016: the desktop no
longer needs its own location, because nothing is moved into it.

| Fact | Owner | Lifecycle |
| --- | --- | --- |
| `enabled` (the only fact AutoByteus keeps per extension) | Extension Manager | written `true` when an install succeeds (On, DEC-015) and by the on/off switch; removed with the extension; an installed extension without an entry is Off |
| installed version | read from `package/extension.json` | replaced on update |
| install progress | Extension Manager, in memory | while installing |
| "installed" | a valid `package/extension.json` exists | install → remove. Install unpacks into `package.new/`, runs `install(ctx)` from there, and only then renames it to `package/`: an install cut short (app closed) leaves no `package/` and is cleaned up by the next Install. Update does the same and swaps the folders at the end; a failed update keeps the old package working |

Reading is tolerant: an unreadable `state.json` means nothing is on, is logged and is
not rewritten until a change; an unreadable package shows that extension Failed and is
never deleted (UP: V12).

**Existing data (Principle 5): the old desktop Voice Input (DEC-016, founder
2026-11-26).** Not moved. The desktop deletes `<base data folder>/extensions` (today's
`registry.json` and `voice-input/`) once, when the new version first starts, before its
node starts; nothing reads it afterwards. Voice Input then shows Not installed and is
installed again from its card (measured 75 s, ~1.7 GB, UP V2). The move by rename was
validated (UP V3) and is kept in the history as the rejected option: it would have saved
only the speech-model download, because the new package wraps runtime 0.3.2.

## Voice Input on this contract

- Package `voice-input` 1.0.0 in its own repository, wrapping voice runtime 0.3.2 (0.3.0 with
  the readiness fix, PRE-001 → autobyteus-655, delivered 2026-11-26). Its `start` runs the worker
  and waits for `ready` (now written only when it can transcribe); no warm-up clip. A failed start
  is the worker's one-line reason (e.g. `ffmpeg` missing on Apple Silicon), shown on the card.
- Actions:

| Action | Input | Output | Caller |
| --- | --- | --- | --- |
| `transcribe` | `bytes`: the WAV recording (mono, 16-bit, the device's rate) | `{ text, noSpeech, detectedLanguage }` | AutoByteus's microphone button and Test |
| `getSettings` | — | `{ language, runtimeVersion, model, folder }` | its page |
| `setLanguage` | `{ language: "auto" \| "en" \| "zh" }` | `{ language }` | its page |

- The microphone button, the microphone choice and the Test stay AutoByteus's own
  (microphone IDs belong to the page that records; a sandboxed page has another origin).

## Decided 2026-11-26 (DEC-015, delegated by the founder)

- Install ends **On** (`enabled: true` written by install).
- Optional `translations` (§1) and the `locale` message (§5).
- No Reinstall / Open folder (Remove + Install; the folder path with Copy on the page).
- Voice Input warms its speech model in the background when on (REQ-012): the server
  part gets the optional `start` step (run at node start and when turned on) and stops
  the program after a long idle time.

## Validation

- [probes/contract-probe](probes/contract-probe/README.md): 31/31 with the real voice
  runtime and the browser bridge test (2026-11-21); use-case probe 12/12: fresh install
  with real downloads, the move of the founder's install, the log, containment
  (2026-11-24).
- [probes/spine-probes](probes/spine-probes/README.md): SP-1 route permissions, SP-2
  audio upload (2026-11-24).
- Walks per use case: [use-case-spines.md](use-case-spines.md) Part V (V1–V13).
