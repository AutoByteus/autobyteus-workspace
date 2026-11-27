# Extensions

An **extension** is an optional capability of a node, packaged and signed by AutoByteus: its description, a server
part the node runs, its own page, and the programs it downloads. Every node (the desktop's own node, a Docker node, a
Linux server) has one **Extension Manager**; the desktop shows and operates the extensions of each window's node. A
node works fully with no extension installed. The first extension is Voice Input (autobyteus-516).

Extension or integration? An **integration** lets agents use an outside service: it is imported content (a skill plus
authentication, never app code) from any repository, and its token stays in the vault. An **extension** adds a
capability to the node itself, runs code on it, and comes only from AutoByteus's signed catalog. They share words
(installed, on/off, status), not machinery.

## The extension contract (version 1)

Parts 1–5 are what extensions build on. They are **frozen across versions** (DESIGN.md rule 9, second exception):
they grow only by optional fields, and `contractVersion` changes only for a change an older AutoByteus cannot handle.
Part 6 and the stored state are AutoByteus-internal and change with the app.

### 1. `extension.json` (package root)

```json
{
  "id": "voice-input",
  "name": "Voice Input",
  "description": "Dictate instead of typing. … downloads about 2 GB on install.",
  "version": "1.0.0",
  "contractVersion": 1,
  "offeredOn": "desktop-node",
  "platforms": ["darwin-arm64", "darwin-x64", "linux-x64", "win32-x64"],
  "translations": { "zh-CN": { "name": "语音输入", "description": "…" } }
}
```

| Field | Meaning |
| --- | --- |
| `id` | lowercase letters and digits with dashes; folder name, state key, route segment |
| `name`, `description` | the card's title and text; the description says what it needs (microphone, download size, administrator approval) |
| `version` | `x.y.z`; Update is offered when the catalog's version is higher |
| `contractVersion` | the contract version it needs; another one shows "Needs a newer AutoByteus" |
| `offeredOn` | `desktop-node` (only the desktop app's own node, used by every window) or `every-node` |
| `platforms` | `<os>-<cpu>` values it supports (`process.platform`-`process.arch`); elsewhere "Not available on this computer" |
| `translations` | optional; the card's name and description per app language |
| `provides` | optional (added for autobyteus-661): a role the node itself uses, today only `"private-network"` (the AutoByteus Network program). At most one extension that is on provides a role on a node. An unknown value reads as no role |

### 2. The package

One `.tar.gz` with a fixed layout: `extension.json`, `server/index.mjs` (one self-contained ES module), `ui/index.html`.
The page may use inline scripts and styles, and load classic scripts (`<script src>`), stylesheets and images from
`ui/`; fonts only as `data:` URLs. Not module scripts or font files loaded from files: from a sandboxed page these are
CORS loads with `Origin: null`, which the node refuses.

### 3. The catalog

`https://github.com/AutoByteus/autobyteus-extensions/releases/download/catalog/extensions-catalog.json` and the same
URL with `.sig` (base64 Ed25519 over the exact bytes; the public key is built into AutoByteus,
`src/extensions/catalog/extension-catalog-source.ts`: the repository's `catalog-public-key.pem`, fingerprint
`SHA256:75d4d2f80ed35374e7956d736aed66111e3eac76b911eb2367428a27dc64ad4c`, created on the founder's Mac on 2026-11-26 by
his approved setup script; the private half is only the repository's secret `EXTENSIONS_CATALOG_SIGNING_KEY` and his
backup, and the two change only together). `{ "extensions": [ … ] }`: each entry is the extension's
`extension.json` plus `packageUrl` and `sha256`. On install the package must match `sha256` and its `extension.json`
must equal the entry without those two fields.

### 4. The server part: `server/index.mjs`

```ts
export default {
  install(ctx: InstallContext): Promise<void>,   // Install and Update: fetch and prepare its programs inside ctx.dir
  start?(ctx: Context): Promise<void>,           // optional: at node start and when turned on (Install ends On)
  status(ctx: Context): Promise<{ ready: boolean; message: string }>,
  stop(ctx: Context): Promise<void>,             // turned off, updated, removed, or the node stops
  actions: { [name: string]: (ctx: Context, input: { json: unknown; bytes: Uint8Array | null }) => Promise<unknown> },
}
type Context = { dir: string; platform: string; log(line: string): void; privateNetwork?: PrivateNetworkContext };
type InstallContext = Context & { progress(p: { message: string; percent: number | null }): void };
type PrivateNetworkContext = { callerSocketPath: string | null; nodePort: number | null };
```

`ctx.privateNetwork` (optional, autobyteus-661) is given only to the extension with `provides: "private-network"`:
where its program hands each private-network connection to the node (a Unix socket, on Windows a named pipe new at
every start) and the node's port; `null` until the node listens. The provider's actions are its role: `status`,
`machines`, `relay` (and `signIn`, `useAuthKey`, `leave` for its page); the node reads their answers strictly (module
doc `private_network.md`).

`ctx.dir` is the extension's own folder (kept on update, deleted on remove); it deletes downloaded archives after
unpacking. Only the module's own `actions` keys can be called. It registers no routes and opens no ports. It runs inside
the node's process: a server part that blocks the event loop blocks the node, so long work goes to the programs it
starts. Everything it throws is contained to its own card.

### 5. The page bridge

The page is shown in its card in a frame with `sandbox="allow-scripts"` and `connect-src 'none'`: it cannot reach the
network (the desktop adds the owner credential to every request to a node) or the AutoByteus page. It talks only by
`postMessage` to its parent, and AutoByteus accepts messages only from that frame (`event.source`):

```text
page → AutoByteus   { "id": "7", "call": "setLanguage", "input": { "language": "en" } }
AutoByteus → page   { "id": "7", "ok": true, "output": { … } }   or   { "id": "7", "ok": false, "error": "…" }
page → AutoByteus   { "resize": { "height": 320 } }               (no reply; clamped to 48–2000 px)
AutoByteus → page   { "locale": "zh-CN" }                          (once, when the page loads)
```

## On the node (AutoByteus-internal)

Code: `src/extensions/` (`domain/`, `catalog/`, `packages/`, `server-parts/`, `storage/`, `services/extension-manager.ts`),
composed in `src/compositions/extensions-composition.ts`.

| Endpoint (owner credential only) | Does |
| --- | --- |
| GraphQL `extensions(refreshCatalog)` | the list: `catalog` (`verified` · `unverified` · `unreachable`), the node's `platform`, and one item per extension offered here plus every installed one, with its state (`notAvailableHere` · `notInstalled` · `installing` · `updating` · `installed` · `failed`) |
| GraphQL `extensionLog(id)` | the last 200 lines of its log |
| GraphQL `installExtension`, `updateExtension`, `removeExtension`, `setExtensionEnabled` | lifecycle; Install and Update return at once and the page polls the list |
| `POST /rest/extensions/:id/actions/:action` | one action: `application/json` → `input.json`, `audio/wav` (≤ 100 MB) → `input.bytes`; `200 { output }` or `{ code, message }` with `EXTENSION_NOT_INSTALLED`, `EXTENSION_OFF`, `EXTENSION_BUSY`, `UNKNOWN_ACTION`, `RECORDING_TOO_LONG`, `ACTION_FAILED` |
| `setExtensionEnabled(id, true)` for a second provider of a role | `EXTENSION_ROLE_TAKEN` (409 on REST): "<id> already provides this on this node: turn it off first" |
| `GET /rest/extensions/:id/ui/*` | its page files from `package/ui/`, with the sandbox CSP |

- **Catalog fetches** (each bounded at 10 s, shared while one runs): once after the node listens, when the Extensions
  page opens, and at the start of Install and Update, which refuse unless it verifies. Every other read uses the copy in
  memory. Installed extensions are listed whatever the catalog's state.
- **Stored state** (`<data dir>/extensions`): `state.json` `{ "<id>": { "enabled": true } }` (the only fact AutoByteus
  keeps; an installed extension without an entry is Off; an unreadable file reads as everything Off and is not
  rewritten until a change), and per extension `<id>/package/` (installed ⇔ a valid `package/extension.json`),
  `<id>/data/` (`ctx.dir`) and `<id>/extension.log` (1 MB, the older half dropped).
- **Install:** download and check into `<id>/package.new/`, run `install(ctx)` from there with progress, rename to
  `package/`, write `enabled: true`, then `start`. An install cut short leaves no `package/`. **Update:** the same, with
  the old package kept until the swap; a failed update keeps the old version running ("Update to x failed: …"). **Remove:**
  stop, delete `<id>/`, then its entry. One lifecycle operation per extension at a time.
- **Roles** (`provides`, autobyteus-661): `manager.enabledProvider(role)` names the extension that is on and provides it
  (the node resolves its Private Network through it at every call, never by importing the extension). Installing a
  second provider of a role that another extension provides leaves it Off.
- **Start and stop:** the extensions that are on start in the background after the node listens; turning one on starts
  it, off stops it (a late `start` result after Off is ignored); all stop with the node (5 s each).
- **Containment:** an unreadable package, a server part that cannot be loaded, or a `status()` that throws or takes more
  than 5 s shows that extension Failed with the reason, logs a warning naming it, and deletes nothing; the node and
  the other extensions keep working.

## Developing an extension

Extensions live in `AutoByteus/autobyteus-extensions` (one folder per extension; its README describes packing and
releasing). To try a package before it is released, point a node at your own signed catalog with
`AUTOBYTEUS_EXTENSIONS_CATALOG_URL` (the catalog JSON; the signature is the same URL with `.sig`) and
`AUTOBYTEUS_EXTENSIONS_CATALOG_PUBLIC_KEY` (a PEM), read once at startup. Whoever sets the node's environment already
controls that computer, so this is no way around "only AutoByteus-signed extensions".

To add an extension: write its folder to the contract above, release its package, add its entry to the catalog and
release the catalog. AutoByteus needs no change unless the extension needs something the contract does not have; that
is a contract change (an optional field, or a new `contractVersion`).

## Voice Input

Offered on the desktop's own node and used by every window: a window of any node records with this computer's
microphone and sends the WAV to the embedded node's `transcribe` action. The microphone button shows only when that
node lists Voice Input installed, on and ready. Its server part installs voice runtime 0.3.2 and its speech model into
`ctx.dir`, starts the worker in `start` (the model loads before it reports ready; "Getting ready…" meanwhile), stops it
after 30 minutes without dictation, and has the actions `transcribe`, `getSettings` and `setLanguage`. The microphone
choice and the Test are AutoByteus's own (the renderer's storage, shared by every window of the desktop app).

The desktop deletes the old desktop-only install (`<base data folder>/extensions`) once, in the background, at its first
start after the update; Voice Input is then installed again from its card.
