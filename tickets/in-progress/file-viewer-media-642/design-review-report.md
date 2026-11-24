# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/requirements-doc.md` (SR-001, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/design-spec.md` (SR-001)
- Supplemental Task Artifacts Reviewed: `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-001
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/tickets/in-progress/file-viewer-media-642/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer's `Architecture Design Complete` (SR-001), 2026-11-24
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: branch `codex/file-viewer-media-642` at `922e0f067f` (base `origin/personal` `5c0db3a801`). Checked:
  - `git fetch --tags; git tag --contains 7cbab1f7c2`: empty, so 574 is unreleased;
  - web `utils/remoteAccess/shellBridge.ts:11-19,81-88` (`ShellHello` = `nodeCount`, `deviceName`, `nodeName`, `videoPlayer`; no platform field) and `composables/mobile/useNativeVideoPlayback.ts:57`.
  The investigation's citations for items 1, 3 and 4 were taken as read and are consistent with 574's merged code.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: the web↔app bridge contract changes across three codebases (the rename); a server route changes; the web layout and both highlighting engines change. No security change (NA-8 unchanged).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`, except REQ-002's platform rule, which the contract cannot express (AR-001).
- Approved requirements / intended behavior understood: Yes (REQ-001…004; DEC-001…003).
- Relevant existing behavior and evidence confirmed: Yes. 574's native path, `sendUserFile`'s `kind: 'file'`, the split-by-mode layout and the one map with Prism names are all as described.
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → REQ-002, AC-002).
- Statements about existing code the design relies on:
  - "574 is unreleased": confirmed (no tag contains `7cbab1f7c2` after fetching tags), so the clean `playVideo` → `playMedia` rename needs no compatibility path (Principle 8, DESIGN.md rule 9).
  - "On iOS, an `.ogg` or `.opus` keeps the page path (the composable's audio kind accepts only types AVPlayer plays)": the composable runs in the page, and the page cannot tell iOS from Android. `ShellHello` has no platform field, and `mediaPlayer` is designed as a plain boolean. See AR-001.

| Behavior / REQ | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 (ranged message references) | Contract | Pass | Pass | Pass | Confirmed | — |
| REQ-002 (native audio, both apps; iOS-only exclusion) | User | Pass | Pass | Fail (the per-app format rule has no input on the page) | Needs Correction | AR-001 |
| REQ-003 (Files layout by width) | User | Pass | Pass | Pass (note N-1) | Confirmed | — |
| REQ-004 (one language table, two engine names) | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None beyond the handoff (consistent).

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Each item's cause is read: references open a stream; split chosen by mode; one map with two vocabularies (Principle 15) | — |
| Refactor decision explicit | Pass | The rename (Principle 15), and one table with two lookups | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked Through It, With An Example Per Case? | Checked Against Existing Data And Real Dependencies It Relies On? | The Layers Above Follow It Without Mappings, Recomputed Facts Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Bridge `playMedia {kind,url,title,credential}` | Pass | Pass (574's lifecycle) | Pass for formats both players play | Pass | Pass | Pass |
| Bridge `hello.mediaPlayer: boolean` | Fail: a boolean cannot tell the page which audio formats the app's player plays, and REQ-002 makes that differ by app (iOS excludes Ogg/Opus) | Pass | Fail: no walk for an Ogg on iOS vs Android | Pass | Fail: the composable would have to guess the platform, or apply one app's limits to both | Fail (AR-001) |
| `MessageReferenceContent` → `kind: 'file'` | Pass | Pass | Pass | Pass (`sendUserFile` from 574) | Pass | Pass |
| Language table entry `{ext/names, monaco, prism}` | Pass | Pass | Pass (examples) | Pass (Monaco 0.52.2 basic languages; Prism components) | Pass (one table, two lookups) | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reference read (D-1) | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Audio play (D-2) | Primary | Pass | Fail (the native-or-page decision for a format) | Pass | Pass | Pass | Pass | Fail (AR-001) |
| Files layout (D-3) | Local | Pass | Pass | N/A | Pass | Pass (the layout owns the rule) | Pass | Pass |
| Highlighting (D-4) | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useNativeMediaPlayback` | Pass | Pass | Pass | Pass | Decides native vs page; needs AR-001's input |
| `FileExplorerLayout` (width rule) | Pass | Pass | Pass | Pass | — |
| `languageDetector` (table) | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Components → playback composable → bridge | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass`.

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `getMonacoLanguage(path)`, `getPrismLanguage(path)` | Pass | Pass | Pass | Low | Pass (Principle 15: one word, one meaning) |
| `useNativeMediaPlayback(kind)` | Pass | Pass | Pass | Low | Pass |
| `MessageReferenceContentReader.resolve` → file | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `N/A`.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Ranged replies | Pass (574's `sendUserFile`) | Pass | N/A | Pass | — |
| Native audio | Pass (574's players, data sources, caches) | Pass | N/A | Pass | — |
| Stacked layout | Pass (existing) | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server, web (media, layout, highlighting), Android `media/`, iOS `Media/` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Language table | Pass | Pass | Pass | Pass | Replaces one map with a second meaning |

## Shared Structure Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Language table entry | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers listed: `Pass` (the rename's readers on three sides and the docs; the table's two readers; the layout's mode source).

Vocabulary: `Pass` (`media` for a player of video and audio; `getMonacoLanguage`/`getPrismLanguage` end the one name with two meanings).

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final File Responsibility Mapping | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Android `media/`, iOS `Media/`, `composables/mobile/useNativeMediaPlayback.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `Video`-named files, types and messages; `getLanguage`; the stream branch of the reference reader | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `playVideo` / `videoPlayer` | No (574 unreleased, verified) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 574's app caches (directory may follow the rename) | No migration | Pass (unreleased: no installed caches) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Mechanical rename, then the audio branch; both app suites and the web suite | Pass | Pass | Pass | Pass (note N-2 on rule 12) |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `playMedia`, table rows | Yes | Pass | N/A | Pass | Add an example for the format rule (AR-001) |

## Material Premise Validation (Only When Needed)

None. AR-001 rests on the approved requirement itself (REQ-002's iOS-only exclusion) and on the cited contract.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond AR-001.

## Review Decision

`Fail`

## Findings

### AR-001 — The page cannot apply REQ-002's per-app audio format rule: `hello.mediaPlayer` is a boolean and `hello` names no platform

- Type: Design Impact
- Severity: Medium (blocking; small fix)
- Protects: REQ-002 ("In both apps, a node audio file plays through the app's native player … On iOS, a format AVPlayer cannot play (Ogg, Opus) keeps the page path"); AC-002.
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Concrete problem: the native-or-page decision is made in the page (`useNativeMediaPlayback`). The design says its audio kind "accepts only types AVPlayer plays". But the page cannot tell the iOS app from the Android app: `ShellHello` has no platform, and `mediaPlayer` is a plain boolean. That leaves two outcomes, both wrong:
  - the AVPlayer list is applied on both apps, so an Ogg/Opus on Android takes the page path, against "in both apps … plays through the native player";
  - or the page guesses the platform (a user-agent sniff: a second, hidden source of an app fact).
  If an unsupported file were sent to the iOS player anyway, `playMedia` has no reply, so the failure would be on the native screen instead of the page path REQ-002 requires.
- Evidence: `shellBridge.ts:11-19,81-88`; design-spec Data Contract (`mediaPlayer: boolean`) and Risks ("the composable's audio kind accepts only types AVPlayer plays").
- Required update: let the app, which owns its player's abilities, tell the page what it plays, and let the page decide from that.
  - For example, `hello.mediaPlayer: { video: true, audioTypes: ['audio/mpeg','audio/mp4','audio/aac','audio/wav', …] }`, or a list of extensions, written by each app from its own player's support.
  - Name the writer on each app and the reader (`useNativeMediaPlayback`).
  - Walk an `.ogg` on Android (native) and on iOS (page path), and an `.mp3` on both (native).
  - Absent or false still means today's page path.
  - Alternatively, if one shared list is preferred, revise REQ-002 so Ogg/Opus keep the page path on both apps. That is a requirement change, for the Solution Designer within the direction.
- Why proportionate: one field in the existing `hello`, written by the owner of the fact.
- Recommended recipient: Solution Designer.

## Classification

`Design Impact` (AR-001).

## Recommended Recipient

Solution Designer (`/solution_designer`).

## Residual Risks

- N-1 (non-blocking, D-3 precision): "split when `width ≥ treeWidth + 1 + 400`". State which tree width: the current, possibly dragged, width or the minimum (150).
  - With the current width, shrinking a 700 px panel to 600 px with a 250 px tree switches to stacked. Clamping the tree to 199 px would still give a 400 px viewer.
  - Either choice meets REQ-003. Write the chosen rule down, so the spec and the probe test the same thing, and say whether the tree's dragged width is clamped or kept when the panel narrows.
- N-2 (non-blocking, rule 12): renaming Android source folders and iOS groups does not change a gate by itself. If `project.yml` (XcodeGen) or a Gradle file changes, run the fresh-start build and the build-only release run, as 574 did.
- N-3 (non-blocking): Monaco's id for `.sh`/`.bash`/`.zsh` is `shell`, not `bash`. The table should carry `monaco: 'shell'` and `prism: 'bash'` for those rows, which is the point of the two columns. Prism `go`/`java` need `clike`, which is already loaded.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (no added premise)
- Notes: D-1 (ranged references), D-3 (split by the layout's own width, one owner) and D-4 (one table, two engine names) pass. D-2's rename is clean, since 574 is unreleased (verified). Only the per-app audio format input is missing from the bridge contract.
