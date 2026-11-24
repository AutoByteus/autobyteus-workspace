# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, design-review-report.md round 2 (ARCH-REV-002); Solution Designer, design-spec.md SR-002 | N/A (N-4, N-5 applied) | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001, ARCH-REV-002 | D-1…D-4 implemented and checked locally; ready for code review |

## Revision Entries

### IR-001 — Ranged message references, native audio with the media rename, the Files layout by width, one language table

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/file-viewer-media-642/design-review-report.md`, round 2 (ARCH-REV-002, Pass); Solution Designer, `design-spec.md` at SR-002.
- Triggering finding IDs: N/A (baseline). Reviewer notes applied: N-1…N-3 (already in SR-002), N-4 (the extension is read from the file the URL names), N-5 (WebM video on iOS now takes the page path; recorded in the iOS docs and the handoff).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented and checked locally; `Large` / `High`, routed to code review.
- Related solution revision IDs: SR-001, SR-002.
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002.
- Related code-review, API/E2E and delivery revision IDs: N/A.
- Why this baseline is recorded: the ticket's first implementation handoff.
- Approved behavior or requirement IDs affected: UC-001…UC-004; REQ-001…REQ-004; AC-001…AC-004; DEC-001…DEC-003.
- Implementation delta (commits on `codex/file-viewer-media-642`, base `5c0db3a801`):
  - `76b29d70a9` D-1: the reference reader returns the file (path, size, modification time from one `stat`), and the route serves it through `sendUserFile` with its `no-store`. That was the last `stream` content, so `UserFileContent` is the file shape alone: its `stream` variant and `kind` tag are removed.
  - `531af6cea7` D-4: `languageDetector.ts` is one table of file types with each engine's name; `getMonacoLanguage` and `getPrismLanguage` replace `getLanguage`; `highlightService.ts` loads the Prism grammars of the new types (`ini` too, which REQ-004 lists).
  - `3d8326eb83` D-3: `FileExplorerLayout.vue` measures its own width and splits only at 150 + 1 + 400 px or more; in split the tree is shown at `min(treeWidth, width − 401)` and the divider stops there.
  - `8d27fb14f5` D-2 web: `useNativeMediaPlayback(kind)`, `playMedia`, `hello.mediaPlayer: { video, audio }`; the audio viewer and the chat's audio tile.
  - `18163b3c1b` D-2 Android: `video/` → `media/`; `MediaKind` with Media3's extension lists; the bridge's `playMedia` and `hello.mediaPlayer`; the player screen's audio branch, its kind in the Intent.
  - `2e2a98a51e` D-2 iOS: `Video/` → `Media/`; `MediaKind` with AVPlayer's lists; `NodeMediaPlayRequest.kind`; the player's audio branch; the loader types the asset by the file's extension.
  - `c2f93e7c2b` docs; `4024239e07` the org-units migration test that read a reference as a stream.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: IMP-01…IMP-10 in the handoff's Checks Run table.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks: see the handoff's Known Risks.
