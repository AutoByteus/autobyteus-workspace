# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-001
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
| REQ-001 | The message-reference route serves ranges, `ETag` and 304 like the other file routes, and keeps its `no-store` | Must | 574 FU-001 |
| REQ-002 | In both apps, a node audio file plays through the app's native player: streaming by range, the credential only in the header, the cache reused on reopen, exactly as video (574 REQ-001…003). The player shows the file name and standard audio controls, and Back returns | Must | 574 FU-002 |
| REQ-003 | In the desktop Files tab, the file viewer is never narrower than 400 px while the panel is at least 400 px wide. When the panel cannot fit the tree beside a 400 px viewer, the tree goes above the viewer (stacked); when it can, they sit side by side, and dragging the divider never takes the viewer below 400 px | Must | 618 FU-002; DEC-001 |
| REQ-004 | `.yaml`/`.yml`, `.toml`, `.sh`/`.bash`/`.zsh`, `.go`, `.rs`, `.java`, `.xml`, `.ini`, `Dockerfile` are highlighted in the file viewer (Monaco) and in chat file previews (Prism). `.html` and `.vue` are highlighted in the file viewer too (they are not today) | Must | 618 FU-003; DEC-002 |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | `GET` a message reference with `Range` returns 206 with the exact bytes, `ETag`, `Accept-Ranges` and `Cache-Control: no-store`; 416; 304; 200 | Server unit and integration tests |
| AC-002 | REQ-002 | Android emulator and iOS simulator, throttled test node: an audio file (MP3 and M4A) plays in under 2 s, seeks with a ranged request carrying the header, and a reopen fetches only the probe. No credential in any URL, log or cache. Video unchanged | App tests and probes as in 574 |
| AC-003 | REQ-003 | Desktop window 1280×800 and 1440×900 at the default panel width: the Files tab is stacked and the viewer is at least 400 px wide (a wrapped line shows 40+ characters). Widen the panel to 700 px: split, the viewer at least 400 px, and the divider stops at 400 px | Rendered probe measuring widths; web unit spec of the layout rule |
| AC-004 | REQ-004 | For each listed type, a sample opens in the file viewer with more than one Monaco token class, and a chat file preview with Prism token spans. Python, TypeScript, JSON and Markdown are unchanged | Web unit tests per type (the map and both engines); a rendered probe of the viewer |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Which layout fix (narrower tree, collapsible tree, or stack by width) | The panel is 400–450 px by default, so any side-by-side tree leaves the viewer too narrow. A narrower tree only moves the problem, and a collapse control adds a click to every reading. Choosing stacked or split by the space available reuses the stacked layout the app already has and needs no new control. **Stack below a panel width that fits tree + 400 px; split above it, with the divider bounded** | Solution Designer | Decided; user informed |
| DEC-002 | One language map with two vocabularies | Monaco and Prism name languages differently (`html` vs `markup`; Monaco has no `toml` or `vue`). **One table of file types, each with its Monaco name and its Prism name.** Monaco: TOML as `ini` (the closest grammar), Vue as `html`. Prism: TOML `toml`, shell `bash`, Dockerfile `docker`; the needed Prism components are loaded by the highlighting service | Solution Designer | Decided |
| DEC-003 | Names now that the native player plays audio | 574 is unreleased (no tag contains its merge), so no installed app knows `playVideo`. **Rename clean:** `playMedia` with `kind: 'video' \| 'audio'`, `hello.mediaPlayer`, and "media" names for the player, data source, cache and URL helpers on all three sides (Principle 15). No compatibility for `playVideo`: nothing shipped it | Solution Designer | Decided |
