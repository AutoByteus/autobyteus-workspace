# Investigation Notes

## Investigation Meta

- Package identifier: `chat-media-path-playback` (Project Task autobyteus-572)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback`; branch `codex/chat-media-path-playback`
- Base: `origin/personal` at `bfd95f73a9` (fetched 2026-11-20); finalization target `origin/personal`
- Bootstrap: worktree created; `pnpm install --frozen-lockfile`, server prebuild + build, `nuxt prepare`, `build:mobile-web` passed (Node v22.23.1)
- Current solution revision ID: `SR-001`
- Authorities read (this conversation): `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`; `TESTING.md`; `DESIGN.md`; `autobyteus-server-ts/docs/design/node_access_model.md` (NA-8); `reflections/lessons.md`
- Status: requirements investigation complete; one decision needs the user (DEC-001).

## Request

Founder (2026-11-20, two Android screenshots): asked the Product Video Producer (a delegated agent under the Project Task Manager) for the video path; tapping the absolute `.mp4` path in chat on the phone opened the viewer with a black screen and "Video URL is not available." File exists (1920×1080, 80 s, 9.7 MB). Check phone and desktop, paths inside/outside the run's folder and relative, and audio/image/PDF; keep authentication and path-security rules; synthetic fixtures only.

## Source Log

| Type | Source | Finding |
| --- | --- | --- |
| Code | `autobyteus-web/components/fileExplorer/viewers/VideoPlayer.vue:1-23` (and `AudioPlayer.vue`, same shape) | "Video URL is not available." is shown whenever the player has no resolved URL and no error, i.e. also **while** its URL is being loaded |
| Code | `composables/useAuthorizedObjectUrl.ts:41-75` | On a paired phone (`activeCredential` set) a protected node URL is downloaded whole (`fetchAuthorizedResourceBlob`, `no-store`) into an object URL before the element gets it; `resolvedUrl` stays null during the download |
| Code | `utils/remoteAccess/authorizedResourceUrl.ts:6-61` | `/rest/workspaces/`, `/rest/node-files/`, … are protected; only a phone credential triggers the download (`stores/mobileNodeSessionStore.ts:113`: the credential exists only in a paired phone session) |
| Code | `composables/mobile/mobileFileOpening.ts:20-44` | The phone opens an absolute path inside the open agent's folder as a workspace file (`openFile` → store → `buildWorkspaceContentUrl`, url set at once, `fileExplorerContentActions.ts:261-266`), outside it as a node file (`useMobileNodeFile.ts:40-60`: downloaded whole while the viewer shows "Opening…", then an object URL) |
| Code | `components/mobile/views/MobileFileViewer.vue:19-33` | The phone viewer shows "Opening…" only while the open file is loading; a workspace media file is "loaded" at once (it has a URL), so the player's own download runs under the player's placeholder text |
| Code | `autobyteus-server-ts/src/api/rest/workspaces.ts:16-58`, `node-files.ts:11-19`, `user-file-reply.ts` | The node's file routes always stream the whole file: no `Accept-Ranges`, no 206; a media element cannot seek or start on a part |
| Code | `autobyteus-web/electron/local-file-protocol/local-file-response.ts:41-151` | The desktop app's own `local-file:` protocol (embedded window, absolute paths) supports Range (206) |
| Code | `autobyteus-server-ts/docs/design/node_access_model.md` NA-8 | "Credentials never leave their owner. Not in URLs (except the browser WebSocket `access_token`, which the phone needs)": a `<video>`/`<audio>` element cannot send the phone's header, so the phone cannot stream a protected file today without a URL-borne grant |
| Node log (read-only) | `~/.autobyteus/server-data/logs/server.log` | No entry names the founder's file (content reads are not logged); whether his download later finished is unknown |

## Relevant Existing Behavior

| Behavior ID | Trigger | Current outcome | Evidence |
| --- | --- | --- | --- |
| BEH-001 | Phone: tap a video/audio path inside the run's folder | Viewer opens; the player shows "Video URL is not available." / "Audio URL is not available." for the whole download, then plays from memory | Reproduced |
| BEH-002 | Phone: tap a video/audio path outside the run's folder | "Opening…" for the whole download, then plays from memory | Reproduced |
| BEH-003 | Phone: image / PDF paths | Downloaded whole, then shown (MSP-28/30 cover them) | Read + existing probes |
| BEH-004 | Desktop embedded window: absolute path | `local-file:` with Range: plays at once, seeks | Read |
| BEH-005 | Desktop window: workspace media path | `<video src>` with the node URL directly (no phone credential): plays progressively; no Range, so seeking past the loaded part does not work | Read |
| BEH-006 | Desktop window not embedded (remote/Docker node): absolute path outside the folder | Node file downloaded whole ("Loading content"), then plays | Read |
| BEH-007 | A download that fails | The player shows "Video could not be played." with Retry | Read |

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Evidence |
| --- | --- | --- | --- | --- |
| Phone probe (production phone bundle, built node, headless Chrome 390×844, paired; scratch case `MSP-572` in `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs`): `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-572 --output-dir=<dir>` (in `autobyteus-web`) | Loopback; 3 s video and audio inside and outside the folder; 1.7 MB video | All play (`blob:` URLs, `readyState 4`); every file is first downloaded whole (`fetch` of `/rest/workspaces/…/content` or `/rest/node-files/content`) | Reproduced | `evidence/reproduction/phone-media-links-loopback.json` |
| same, `SD572_THROTTLE_KBPS=8000` (phone page throttled by CDP, ~1 MB/s) | A 9.7 MB video inside the folder (the founder's size) | **"Video URL is not available." for 9.6 s**, then the video plays; small inside files show the same text briefly ("Audio URL is not available." for audio); outside files show "Opening…" | Reproduced | `evidence/reproduction/phone-media-links-8mbps.json`, `phone-big-video-8mbps-after-load.png` |

**Root cause.**
1. The phone cannot hand a protected node URL to `<video>`/`<audio>` (the element cannot send the phone's credential header, and NA-8 keeps credentials out of URLs), so it downloads the whole file into memory first.
2. During that download the player shows "Video URL is not available." (its "no URL" text), which reads as a failure. The founder's screenshot (taken ~3 s after the tap) matches this exactly, on the inside-folder route his path takes (the agent wrote a path inside its marketing workspace).
3. The node's file routes have no Range support, so even a direct URL could not stream or seek.

How long the wrong message stays: the time to download the whole file over the phone's link (9.6 s for 9.7 MB at 8 Mbit/s; a 100 MB video over a slower link: minutes, and the whole file in the phone's memory).

- Desktop: the message cannot appear (no phone credential; the player gets the URL at once). Desktop workspace media play progressively but cannot seek beyond what is loaded (no Range); embedded absolute paths stream fully (`local-file:`).
- Temporary diagnostics: None. Scratch probe case (hand-over): `MSP-572` above; replaced by durable cases.

## Notes For Design

- The decision DEC-001 (requirements) decides whether the phone streams (a new short-lived file grant, a node access model change) or keeps downloading with an honest loading state.
