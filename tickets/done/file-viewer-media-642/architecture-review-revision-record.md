# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-11-24) | SR-001 | N/A | Fail (Design Impact) | AR-001 |
| ARCH-REV-002 | Round 2 / Design revised SR-002 (2026-11-24) | SR-002 | Fail | Pass | AR-001 (resolved) |
| ARCH-REV-003 | Round 3 / Design revised SR-003 after CRR-001 (2026-11-24) | SR-003 | Pass | Fail (Design Impact) | AR-002 |
| ARCH-REV-004 | Round 4 / Design revised SR-004 (2026-11-24) | SR-004 | Fail | Pass | AR-002 (resolved) |
| ARCH-REV-005 | Round 5 / Design revised SR-005, DEC-007 (2026-11-25) | SR-005 | Pass | Pass | None (N-7, N-8 non-blocking) |
| ARCH-REV-006 | Round 6 / Design revised SR-006, DEC-008 (2026-11-25) | SR-006 | Pass | Pass | None (N-9 non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline review: the bridge needs the app's playable audio types

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/design-review-report.md`
- Review round and trigger: round 1; `handoff-architecture-design-complete.md` (branch at `922e0f067f`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-001; N/A.
- Relevant solution revision IDs: SR-001.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: baseline.
  - These pass: D-1, D-3, D-4, the clean rename (574 unreleased, verified with `git tag --contains 7cbab1f7c2`) and the classification (Large / High).
  - AR-001: REQ-002 makes the audio formats differ by app (iOS keeps Ogg/Opus on the page). The page decides native vs page, but `hello` has no platform and `mediaPlayer` is a boolean. Have the app tell the page what it plays, or revise REQ-002 to one shared list.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001.
- Material classification changes: None.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: N-1 (which tree width the layout rule uses), N-2 (rule 12 if `project.yml` or Gradle changes), N-3 (Monaco `shell` for shell files).

### ARCH-REV-002 — The apps state the media types they play: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/design-review-report.md`
- Review round and trigger: round 2; SR-002 (committed at `a5fd87067e`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` and `requirements-doc.md` at SR-002; AR-001.
- Relevant solution revision IDs: SR-002.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed in the review result:
  - AR-001 resolved. `hello.mediaPlayer: { video: string[], audio: string[] }` holds the lowercase extensions each app's player plays, written by the app and read by `useNativeMediaPlayback`; absent means the page path. REQ-002 is revised to match. The walks cover `.ogg` (Android native, iOS page), `.mp3` (both native) and `.webm` video (iOS page).
  - N-1…N-3 adopted.
  - New notes: N-4 (take the extension from the file path the URL names, for example the `path` query) and N-5 (the `.webm` on iOS correction changes 574's behavior for one broken type; record it).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-002 Data Contract (`hello.mediaPlayer`), validation walks, REQ-002 | Read at `a5fd87067e` |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: N-4, N-5; implementation confirms each app's extension lists against its platform.

### ARCH-REV-003 — A reference's media needs its file name for the native decision

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/design-review-report.md`
- Review round and trigger: round 3; SR-003 section of `design-spec.md` (committed at `f270e067dd`), after code review CRR-001 (CR-001 Requirement Gap; C-2).
- Triggering role, report path, and finding IDs: Solution Designer (from CRR-001); `design-spec.md` SR-003, `requirements-doc.md` REQ-001/REQ-002/AC-001; `code-review-report.md` CR-001, C-2.
- Relevant solution revision IDs: SR-003.
- Prior authoritative decision: Pass (ARCH-REV-002).
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result:
  - SR-003's desktop path, its probe, the unchanged text/PDF/image read and iOS C-2 pass.
  - AR-002: the phone app's native path for a reference cannot work as designed. `useNativeMediaPlayback` takes the type and title from the file the URL names, and a reference URL (`…/references/:referenceId/content`) names none. So `modeFor` answers `page` and the app downloads the file whole, against SR-003's REQ-001.
  - Fix: pass the file's name, which `FileViewer` already has as `file.path`, into the decision.
  - This also corrects my round-2 note N-4, which assumed every media URL names its file.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved | — | Unchanged by SR-003 |

- New or remaining finding IDs: AR-002.
- Material classification changes: None (Large / High).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: none beyond AR-002.

### ARCH-REV-004 — The file name is an explicit input: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/design-review-report.md`
- Review round and trigger: round 4; SR-004 section of `design-spec.md` (committed at `5de17dc4b4`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-004; AR-002.
- Relevant solution revision IDs: SR-004.
- Prior authoritative decision: Fail (ARCH-REV-003).
- Current authoritative decision: Pass.
- What changed in the review result:
  - AR-002 resolved. `modeFor(url, fileName)` and `play(url, fileName)` replace the URL-derived name, which is removed.
  - `VideoPlayer`/`AudioPlayer` take a required `fileName` from their only host `FileViewer` (`file.path`, which is `reference.path` for references).
  - `MediaSegment` names its own `/rest/files/<relativePath>` URLs. I verified that media segment URLs come only from generated-media URLs or external URLs.
  - The walks hold.
  - Non-blocking N-6: the tile label in `MediaSegment.vue:37` should use the same name.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-002 | Open (blocking) | Resolved | SR-004 (decision, derived consumers, walks, tests) | `FileViewer.vue:39-40,86-87`; `CollaborationMessageReferenceViewer.vue:60-72,111`; media segment sources `runProjectionConversation.ts:184-190`, `segmentTypes.ts:185`, `media-storage-service.ts:241` |
| AR-001 | Resolved (ARCH-REV-002) | Resolved | — | Unchanged |

- New or remaining finding IDs: None blocking; N-6 non-blocking.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: N-5 (the `.webm` on iOS correction, recorded); rule 12 if `project.yml` or Gradle changes.

### ARCH-REV-005 — iOS audio session while the native player is open: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/design-review-report.md`
- Review round and trigger: round 5; SR-005 section of `design-spec.md` (committed at `0bcba9ed6a`), from API/E2E's evidence request.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-005, `requirements-doc.md` REQ-002 and DEC-007; N/A.
- Relevant solution revision IDs: SR-005.
- Prior authoritative decision: Pass (ARCH-REV-004).
- Current authoritative decision: Pass.
- What changed in the review result:
  - Verified that no `AVAudioSession` category is set in the iOS app (`git grep` empty), so the Ring/Silent switch silences the player.
  - DEC-007 is sound: `.playback`/`.moviePlayback` is activated by the player's lifetime owner on present and deactivated with `notifyOthersOnDeactivation` on close; there is no background mode, Android is unchanged, and verification is named (test host plus the physical iPhone).
  - Non-blocking: N-7 (deactivate on every close path, through the owner's disappearance), N-8 (restore the prior category on close, so in-page media keeps today's behavior).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved | — | Unchanged |
| AR-002 | Resolved | Resolved | — | Unchanged |

- New or remaining finding IDs: None blocking; N-7, N-8 non-blocking.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: the switch and the sound are verifiable only on a physical iPhone (named for before a release).

### ARCH-REV-006 — Chat highlighting is code blocks; the dead FileDisplay goes: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/design-review-report.md`
- Review round and trigger: round 6; SR-006 section of `design-spec.md` (committed at `b0dcf5e94b`), from API/E2E's Unclear on AC-004.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-006, `requirements-doc.md` REQ-004, AC-004 and DEC-008; N/A.
- Relevant solution revision IDs: SR-006.
- Prior authoritative decision: Pass (ARCH-REV-005).
- Current authoritative decision: Pass.
- What changed in the review result:
  - Verified that `FileDisplay.vue` is mounted nowhere (no template, auto-import name or dynamic use; only an audit list names it) and that `getPrismLanguage` has no other reader.
  - DEC-008 is sound: remove both, the table's Prism column and the audit entry (Principle 7); keep the Prism grammars for message code blocks (`markdownItPrism` → `highlightService`), with the `rs`/`zsh` aliases registered there; REQ-004/AC-004 retarget to the reachable surface.
  - Non-blocking N-9: a stale comment at `highlightService.ts:28`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved | — | Unchanged |
| AR-002 | Resolved | Resolved | — | Unchanged |

- New or remaining finding IDs: None blocking; N-9 non-blocking.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: none new.
