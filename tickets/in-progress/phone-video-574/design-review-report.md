# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574/tickets/in-progress/phone-video-574/requirements-doc.md` (SR-002, Approved; DEC-001 (b) and DEC-002 (a) by the user; REQ-005/AC-005 refined at SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574/tickets/in-progress/phone-video-574/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574/tickets/in-progress/phone-video-574/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574/tickets/in-progress/phone-video-574/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: `probes/` (P1–P3 prototypes and the test server); `follow-ups.md` (FU-001, FU-002); `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574/tickets/in-progress/phone-video-574/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer's revised design SR-002 after ARCH-REV-001 (committed at `c262064727`), 2026-11-24
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail, AR-001)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: branch `codex/phone-video-574` at `d807dc6756` (base `origin/personal` `4b73fccae2`). Opened:
  - server `api/rest/user-file-reply.ts` (headers today: CSP, nosniff, Content-Length; no `Cache-Control`, no validator); `rg Cache-Control api/rest` (only `collaboration-message-references.ts:33` and `run-file-changes.ts:41` set `no-store`);
  - web `stores/fileExplorerContentActions.ts:261-270` (desktop media viewers put the content URL straight into the element); `composables/useAuthorizedObjectUrl.ts:18-40` (the phone path reads with `no-store`); `utils/remoteAccess/shellBridge.ts`;
  - Android `web/ShellBridge.kt:17-111` (`addWebMessageListener` with the entry's origin rule; main frame and same origin checked; no body logging);
  - iOS `Shell/ShellBridgeHandler.swift:51-99` (main frame and origin checked; no body logging).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: the credential reaches native code (NA-8 change, user-approved); a new bridge message; new HTTP behavior on every file route; disk caches of user files; new native dependencies (a build input, rule 12).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 2: D-1 now sends `Cache-Control: no-cache` and no `Last-Modified`; the desktop and browser readers are walked; AR-001 resolved).
- Approved requirements / intended behavior understood: Yes (REQ-001…005; DEC-001 native players; DEC-002 per-playback handoff, in memory only).
- Relevant existing behavior and evidence confirmed: Yes. Prototypes P1–P3 are measured; the whole-download path and the disabled Android fullscreen are confirmed in code.
- Scope guardrail confirmed: Yes (browser phone path, desktop, audio, images/PDF out; AC-006 preserves them).
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → AC-006 preserved behavior; REQ-005).
- Statements about existing code the design relies on:
  - The bridge is bound to the node's origin and main frame on both apps and logs no message body. True (Android `ShellBridge.kt:44-51,111-112`; iOS `ShellBridgeHandler.swift:78-99`). So the credential crossing it stays inside the trusted page → app channel.
  - One reply owner, `sendUserFile`, has ten callers, and all but the message references have a file. True by the design's citations; FU-001 records the exception.
  - The desktop's media viewers load the content URL directly (`<img>`, `<video>`, PDF), with the browser's HTTP cache applying. Only the phone's object-URL path reads with `no-store`. True (`fileExplorerContentActions.ts:261-264`; `useAuthorizedObjectUrl.ts:22-26`). See AR-001.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (DS-1) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (ETag-keyed caches) | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass (native fullscreen; D-6 for in-page) | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass (SR-002: `no-cache` + `ETag`; rewrite → 200 new bytes, unchanged → 304) | Confirmed | AR-001 resolved |
| AC-006 (preserved) | User | Pass | Pass | Pass (a desktop reopen always revalidates; never stale) | Confirmed | AR-001 resolved |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/` P1–P3 | Pass | Pass | Pass (iOS cache not prototyped, stated) | Pass | Pass (evidence) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present and evidence-backed | Pass | The cause is that the element cannot carry the header, measured alternatives | — |
| Refactor decision explicit | Pass | New owners per platform; `sendUserFile` extended | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked Through It, With An Example Per Case? | Checked Against Existing Data And Real Dependencies It Relies On? | The Layers Above Follow It Without Mappings, Recomputed Facts Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| HTTP file reply | Pass (SR-002: `Cache-Control: no-cache` read by the desktop/browser/WebView HTTP caches; `Last-Modified` dropped; multi-range → 200) | Pass (ETag = version) | Pass (phone flows and the desktop/browser walk) | Pass (P2/P3 against the test server) | Pass | Pass |
| `UserFileContent` (file / stream) | Pass | Pass | Pass | Pass | Pass | Pass |
| Bridge `hello.videoPlayer` | Pass | Pass | Pass (older app → today's path) | Pass | Pass | Pass |
| Bridge `playVideo {url,title,credential}` | Pass | Pass (credential lifetime = one playback; never in Intent extras or saved state) | Pass (incl. refusals) | Pass (bridges are origin- and main-frame-bound) | Pass | Pass |
| App cache entry (key node/path/ETag; bytes; iOS range map) | Pass | Pass (LRU, per-node delete) | Pass | Pass for Android (P2); iOS range cache not prototyped, stated as a risk | Pass | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-1 play | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-2 close | Return | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-3 node removed | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-4 Android in-page fullscreen | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web `useNativeVideoPlayback` | Pass | Pass (components never read the credential) | Pass | Pass | — |
| Android `NativeVideoPlayback` / iOS loader | Pass | Pass (the cache never sees the credential) | Pass | Pass | — |
| `sendUserFile` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web components → playback owner → bridge/credential store | Pass | Pass | Pass | Pass | — |
| Apps: bridge → playback → player → cache | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass — deviation recorded, reason holds`. The Android in-memory handoff holder is set before `startActivity`, a missing entry finishes the activity loudly, and it hides no cycle (design-spec Dependency Rules).

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `sendUserFile(reply, content, request)` | Pass | Pass | Pass | Low | Pass |
| `NodeFileReader.open(path)` → file | Pass | Pass | Pass | Low | Pass |
| `ShellBridge.playVideo` / `hello.videoPlayer` | Pass | Pass | Pass | Low | Pass |
| `useNativeVideoPlayback().canPlay/play` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Credential transport | Pass (existing node-bound bridge) | Pass | N/A | Pass | — |
| Landscape/bars (Android) | Pass (432 controller) | Pass | N/A | Pass | — |
| iOS range cache | Pass (none built in) | Pass | Pass | Pass | Not prototyped (risk) |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Node REST, web, Android `video/`, iOS `Video/`, node access doc | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Range/validator logic in `sendUserFile` (one owner for ten routes) | Pass | Pass | Pass | Pass | — |

## Shared Structure Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `UserFileContent` (`file` / `stream`) | Pass | Pass | Pass | Pass (two kinds, real difference) | Pass | — |
| Reply validator (`ETag`) and freshness (`no-cache`) | Pass | Pass (`Last-Modified` dropped) | Pass | N/A | Pass | AR-001 resolved |

Derived consumers listed: `Pass` (SR-002 adds the desktop, browser and WebView HTTP caches with their walk).

Vocabulary: `Pass`.

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final File Responsibility Mapping | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Android `video/`, iOS `Video/`, web `composables/mobile/useNativeVideoPlayback.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None removed (the blob path stays for the browser and older apps) | Pass | N/A | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `hello.videoPlayer` for store-distributed apps | Yes (capability) | Pass — deviation recorded, reason holds (DEC-005: the app's own capability, not a node-version path) | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| New app-private video caches | New, rebuildable; no migration | Pass | Pass | N/A | Pass | No credential stored |

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| D-1 → web → Android → iOS → doc → device tests; rule 12 (Gradle, `project.yml`) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Bridge message, Range reply, Android handoff, iOS URL mapping | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A desktop viewer shows an old copy of a file an agent rewrote, because the reply now carries `Last-Modified` without `Cache-Control`

- Related approved requirement: AC-006 (desktop and the browser phone path unchanged); REQ-005 (validators so caches reuse only unchanged files).
- Initiating basis kind: `User` + `System` (normal product use).
- Independent trigger: on the desktop, the user opens an image, video or PDF an agent created in the workspace. The agent then rewrites the file at the same path (a regenerated chart, a re-rendered video), and the user opens it again or the preview re-mounts.
- Forward path: the desktop viewer sets the element's `src` to `…/workspaces/<id>/content?path=…` (`fileExplorerContentActions.ts:261-264`). Under D-1 the first 200 response carries `ETag` and `Last-Modified` and no `Cache-Control` (`user-file-reply.ts` sets none today; neither does the design). Chromium (Electron, desktop browsers) applies heuristic freshness to such a response, about 10% of the file's age at fetch. So a reopen within that window is served from the browser cache with no request. Today the reply has no validator and no `Last-Modified`, so there is no heuristic freshness, and every open fetches.
- Consequence: the desktop shows the old file for minutes to hours, depending on the file's age, after an agent changed it. That is a regression in preserved behavior (AC-006) on every `kind: 'file'` route, including the Markdown preview's `static/*` images.
- Reachability: `Reachable` (normal use; standard HTTP heuristic caching, RFC 9111 §4.2.2).
- Review consequence: AR-001 (round 1). Round 2: with `Cache-Control: no-cache` every reuse revalidates (304 or new bytes), so the premise's consequence is gone.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 2)

## Findings

None open. AR-001 below is `Resolved` (ARCH-REV-002) and kept for traceability.

### AR-001 — D-1's reply makes unchanged-looking files heuristically cacheable on the desktop; add an explicit freshness rule

- Status: `Resolved` (SR-002; verified in ARCH-REV-002)
- Type: Design Impact
- Severity: Medium (blocking in round 1; small fix)
- Protects: AC-006 (desktop and browser behavior preserved); REQ-005 (the validator lets a client reuse only an unchanged file).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Concrete problem: D-1 adds `ETag` and `Last-Modified` to every `kind: 'file'` reply and names no `Cache-Control`. `Last-Modified` with no explicit freshness lets Chromium serve the file from its cache, without asking the node, for a heuristic period. The desktop puts these URLs straight into `<img>`/`<video>`/PDF elements, so a file an agent rewrote can show stale (MP-001). The contract lists `Last-Modified` with no reader.
- Evidence: MP-001; `user-file-reply.ts` (no `Cache-Control` today); `fileExplorerContentActions.ts:261-264`; design-spec Data Contract row "`Last-Modified` … Read by —".
- Required update: in the Data Contract, give `sendUserFile` an explicit freshness rule for `kind: 'file'` replies that keeps today's "always current" behavior while allowing validation. For example, `Cache-Control: no-cache`: every use revalidates, 304 when the `ETag` matches, the new bytes when not. The routes that set `no-store` keep it.
  - Drop `Last-Modified` (no reader, Principle 17), or keep it with its reader named and covered by the same `no-cache`.
  - Add the desktop/browser readers to the derived consumers, with one walk: an agent rewrites an image and the desktop reopens it → 200 with the new bytes; unchanged → 304.
  - Add the header to AC-005's server tests.
  - The native players are unaffected: they send `Range`/`If-Range` themselves and keep their own caches.
- Why proportionate: one header in the one reply owner. No new machinery.
- Recommended recipient: Solution Designer.

## Classification

N/A (Pass). Round 1: `Design Impact` (AR-001, resolved).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational pass notice to the Solution Designer.

## Residual Risks

- Round 2: N-1 (redirects refused off the node's origin, one unit case per player), N-2 (multi-range → 200), N-3 (iOS range cache tests named in the file map) and N-4 (hashed cache file names) are all taken into SR-002's design. The round-1 notes below are kept for context.
- Pre-existing, unchanged: a desktop `<img>` re-rendered in the same document may reuse Chromium's in-memory image cache whatever the headers say. That was true before this ticket and is not changed by it.

- N-1 (non-blocking, REQ-003 precision): the design says the app sends the credential only to the node's origin. Neither player library guarantees that on its own across a redirect. Media3's `DefaultHttpDataSource` re-issues the request with the same request properties on a same-protocol redirect, and `URLSession` follows redirects by default. The node's file routes do not redirect, so no supported scenario reaches this. Still, enforce the stated rule in code: refuse any redirect, or any redirect off the node's origin, in the Android data source and in the iOS loader's `willPerformHTTPRedirection`. Add one unit case each.
- N-2 (non-blocking): the contract serves one range. Say what a multi-range request gets: `200` with the whole file, ignoring `Range` (RFC-allowed), so implementation does not answer 416 to a valid request.
- N-3 (non-blocking): the iOS range cache is our own code and was not prototyped (stated). Keep the risk visible in the implementation handoff with its tests (partial ranges, eviction, a new `ETag`).
- N-4 (non-blocking): if the cache key (node, path with query, ETag) becomes a file name, hash it. The paths are the user's own, but app-private storage need not spell them out.
- Rule 12: Android Gradle (Media3) and iOS `project.yml` are build inputs. Run the fresh-start build and the build-only release run.

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, SR-002)
- Material-Premise Gate: `Pass` (MP-001's consequence removed by `no-cache`)
- Round 2 notes: AR-001 resolved with `Cache-Control: no-cache` on `kind: 'file'` replies (`no-store` routes keep theirs), `Last-Modified` dropped, the desktop/browser readers walked, and AC-005 asserting the header and a never-stale reopen. N-1…N-4 are adopted. Classification Large / High; rule 12 (Gradle, `project.yml`).
- Round 1 decision: `Fail`
- Notes: the architecture is sound:
  - native players with a per-playback credential over the origin-bound bridge (user-approved);
  - one owner per platform;
  - a contract-first design with measured prototypes;
  - Range in the one reply owner;
  - ETag-keyed bounded caches with per-node deletion.
  Only D-1's freshness headers need a rule so the desktop does not regress.
