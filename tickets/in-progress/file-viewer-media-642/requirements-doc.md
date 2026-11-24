# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-005
- Package identifier: `file-viewer-media-642`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-24
- Approved by and reference: Solution Designer within the direction (the Task names each item and its outcome); user informed 2026-11-24. No `Needs user` decision.
- Exact approved baseline: this document at SR-001

## Problem And Desired Outcome

Four follow-ups:
1. A video or audio file reached through a message reference downloads whole.
2. Audio on the phone downloads whole before playing.
3. The desktop Files tab leaves the file viewer about 131–200 px wide at common window widths.
4. Common file types open without syntax highlighting.

Desired: each works as the Requirements say, with nothing else changed.

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case |
| --- | --- |
| UC-001 | Open a message reference's file (video, audio, any) |
| UC-002 | Play a node audio file in the Android or iOS app (Files, chat link, media message) |
| UC-003 | Read a file in the desktop Files tab at window widths 1280–1440 and up |
| UC-004 | Open YAML, TOML, shell, Go, Rust, Java, XML (and the others listed) in the file viewer and see them in chat file previews |

### Out Of Scope

- Audio in a plain browser (unchanged).
- Phone layouts (the Files screen is its own).
- Highlighting themes.
- Languages beyond the listed set.

### Preserved

- 574's video behavior, credential rule (NA-8) and caches.
- The browser and older-app paths (574 AC-006).
- The Files tab's drag resize.
- Highlighting of the languages highlighted today.

## Requirements

| ID | Requirement | Priority | Basis |
| --- | --- | --- | --- |
| REQ-001 | The message-reference route serves ranges, `ETag` and 304 like the other file routes, and keeps its `no-store`. **SR-003 (CRR-001 CR-001), what the user gets:** a reference's video or audio is not downloaded whole before it plays. On the desktop it streams by range; in the phone apps it plays in the native player (REQ-002's rules, types per app); in a phone browser it downloads as before. Text, PDF and image references keep today's whole read. A missing or deleted reference still shows its "not found" or "unavailable" message | Must | 574 FU-001; CRR-001 CR-001 |
| REQ-002 | In both apps, a node audio file plays through the app's native player: streaming by range, the credential only in the header, the cache reused on reopen, exactly as video (574 REQ-001…003). The player shows the file name and standard audio controls, and Back returns. On iOS the controls follow AVKit's standard behavior (they hide during playback and a tap shows them), over a placeholder with an audio symbol and the file name, so the screen is never blank (CRR-001 C-2). **SR-005:** a video's or audio's sound is heard when the user plays it, also with the iPhone's Ring/Silent switch on silent, as media apps do. Playing on after the screen locks or in the background is out of scope (it stops, as today). Each app states which file types its player plays; a type it does not list keeps the page path (for example Ogg/Opus on iOS, which AVPlayer cannot play; on Android, Media3 plays them natively) | Must | 574 FU-002; ARCH-REV-001 AR-001 |
| REQ-003 | In the desktop Files tab, the file viewer is never narrower than 400 px while the panel is at least 400 px wide. When the panel cannot fit the tree beside a 400 px viewer, the tree goes above the viewer (stacked); when it can, they sit side by side, and dragging the divider never takes the viewer below 400 px | Must | 618 FU-002; DEC-001 |
| REQ-004 | `.yaml`/`.yml`, `.toml`, `.sh`/`.bash`/`.zsh`, `.go`, `.rs`, `.java`, `.xml`, `.ini`, `Dockerfile` are highlighted in the file viewer (Monaco) and in chat file previews (Prism). `.html` and `.vue` are highlighted in the file viewer too (they are not today) | Must | 618 FU-003; DEC-002 |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | `GET` a message reference with `Range` returns 206 with the exact bytes, `ETag`, `Accept-Ranges` and `Cache-Control: no-store`; 416; 304; 200. **And** opening a reference's video or audio in the Messages panel (desktop) and the phone's reference viewer: the desktop's requests are ranged; the apps play it natively, with ranged requests carrying the header; a reference text, PDF or image shows as today; a deleted reference shows its message | Server tests; web specs of the viewer; a desktop request log; app probes as in AC-002 |
| AC-002 | REQ-002 | Android emulator and iOS simulator, throttled test node: an audio file (MP3 and M4A) plays in under 2 s, seeks with a ranged request carrying the header, and a reopen fetches only the probe. No credential in any URL, log or cache. Video unchanged | App tests and probes as in 574 |
| AC-003 | REQ-003 | Desktop window 1280×800 and 1440×900 at the default panel width: the Files tab is stacked and the viewer is at least 400 px wide (a wrapped line shows 40+ characters). Widen the panel to 700 px: split, the viewer at least 400 px, and the divider stops at 400 px | Rendered probe measuring widths; web unit spec of the layout rule |
| AC-004 | REQ-004 | For each listed type, a sample opens in the file viewer with more than one Monaco token class, and a chat file preview with Prism token spans. Python, TypeScript, JSON and Markdown are unchanged | Web unit tests per type (the map and both engines); a rendered probe of the viewer |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Which layout fix (narrower tree, collapsible tree, or stack by width) | The panel is 400–450 px by default, so any side-by-side tree leaves the viewer too narrow. A narrower tree only moves the problem, and a collapse control adds a click to every reading. Choosing stacked or split by the space available reuses the stacked layout the app already has and needs no new control. **Stack below a panel width that fits tree + 400 px; split above it, with the divider bounded** | Solution Designer | Decided; user informed |
| DEC-002 | One language map with two vocabularies | Monaco and Prism name languages differently (`html` vs `markup`; Monaco has no `toml` or `vue`). **One table of file types, each with its Monaco name and its Prism name.** Monaco: TOML as `ini` (the closest grammar), Vue as `html`. Prism: TOML `toml`, shell `bash`, Dockerfile `docker`; the needed Prism components are loaded by the highlighting service | Solution Designer | Decided |
| DEC-003 | Names now that the native player plays audio | 574 is unreleased (no tag contains its merge), so no installed app knows `playVideo`. **Rename clean:** `playMedia` with `kind: 'video' \| 'audio'`, `hello.mediaPlayer`, and "media" names for the player, data source, cache and URL helpers on all three sides (Principle 15). No compatibility for `playVideo`: nothing shipped it | Solution Designer | Decided |
| DEC-007 | iOS audio session (API/E2E's evidence request, 2026-11-25) | The app sets no `AVAudioSession` category, so it runs in Solo Ambient: on a real iPhone the Ring/Silent switch silences the native player's sound (audio, and 574's video). A simulator cannot show sound. Options: (a) accept as an unverified risk; (b) set the media category; (c) a user check | **(b), a design change:** while the native player is open, the app's audio session is `.playback` with mode `.moviePlayback` and active; on close it is deactivated with `notifyOthersOnDeactivation`. A tapped video or audio is heard on silent, as in media apps, and other apps' audio resumes after. Background or lock-screen playback stays out of scope (no `UIBackgroundModes audio`). Verification: a test-host check that the session's category is `.playback` while the player shows and is inactive after close. Untested on a simulator: the switch itself and the sound heard. Those stay for the physical-iPhone check before a release (574's recommendation) | Solution Designer (within REQ-002: "plays") | Decided; user informed |
