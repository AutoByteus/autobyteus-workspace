# API/E2E Coverage Investigation — autobyteus-450

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003, `Ready`); `handoff-sr-003.md`
- Supplemental Task Artifacts: `evidence/repro/file-open-repro.mjs`; `follow-ups.md` (FU-001)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (not selected)
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-002 (Medium / Low, direct API/E2E)
- Latest Authoritative Investigation: this file, round 1

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450`, branch `codex/conversation-file-open-450`, base `6884309283`; source as of `5f06b08ce9` (`33cea361ce` adds ticket documents).

## Current Requirement And Design Basis

- REQ-001 / AC-001: on the phone, a message's attached image and a composer draft image show as thumbnails loaded with the phone's key; the draft's full-screen view too; no 401.
- REQ-002 / AC-002: on the phone a tap on an attachment (uploaded, draft, workspace path, a path on another node) opens the phone viewer (a draft image: the composer's full-screen view); Back returns; no page navigation to a node URL; another node's path shows "This file is available only on the host workspace." (DEC-006).
- REQ-003 / AC-003, AC-004: every explicit open shows current content (desktop and phone), including the same open file again; unsaved edits stay.
- REQ-004 / AC-005: Android keeps the page on a main-frame navigation to `/rest/…` or `/graphql`; the phone page's own load errors unchanged.
- REQ-005 / AC-006: preserved: desktop attachments, 436 node files, MSP-13 (real rejection → pairing), 426 preview frames, route policy.
- Design risks for validation: ASM-001 (the Android pairing screen comes from the main-frame 401 of `window.open`), media reload in a real browser (IMP-02).

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (phone attachments), SCN-002 (re-open after a rewrite), SCN-003 (Android navigation).
- Added from investigating the implementation:
  - A **workspace-path attachment** comes from a message sent with a context path (as the desktop composer sends it); the phone shows that message.
  - A **path attachment of a run on another node**: a run the phone's node delegated to its peer; the peer's own client sends that run a message with a path on the peer.
  - The real app with **the old phone page** (a node not yet updated) and the new APK: the old page's `window.open` is a main-frame `/rest/` navigation; the new APK keeps the page (AC-005 in the real app). With the old APK too: the pairing screen (ASM-001).
- Contrived (not tested): none named.

## Changed Surface And Boundary Classification

| Surface | Affected? | Changed Boundary | Repository Evidence | Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Backend | No | — | — | — | — |
| API / transport | No (key rules unchanged) | — | — | — | — |
| Frontend component / state | Yes | `UserMessage`, composer, phone opener, `useMobileNodeFile`, store reload rule, media viewers | IMP-03, IMP-05, IMP-12, IMP-13 (unit, mocked fetch) | Real key-carrying loads, real viewers (pdf.js, images), real navigation | Phone-bundle probe |
| Browser integration / journey | Yes | phone conversation → viewer → Back; desktop link → viewer, Files tab, editor | IMP-11 repro (PNG, links) | PDF/text, drafts, workspace path, other node, images rewritten, editor draft | `test:e2e:mobile-shell` cases |
| Authentication | Indirect | loads carry the phone key; no credential in URLs | IMP-11 (`thumbnailRequests: []`) | every attachment kind | probe network log |
| Desktop renderer | Yes | reload rule, media reload | IMP-05 | real Monaco draft, Files tab | desktop window (`nuxt dev`) |
| Desktop shell / Electron | No (renderer only; `local-file:` read path only for embedded windows) | — | IMP-05 unit | packaged app | not required (no shell change) |
| Android app | Yes | `TrustedNavigationPolicy`, `AutoByteusWebView` (`KeepPage`) | IMP-06 (94 unit tests) | the real WebView, ASM-001 | emulator |
| Persisted data | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root). Phone behavior is proven by a `test:e2e:mobile-shell` case; the Android app by its unit tests and a device or emulator.
- Changed build-input paths: none (`git diff --name-only 6884309283...HEAD` has no manifest, lockfile, config, script, contract or Gradle file) → no fresh-start build.
- Secrets: N/A.

| Instruction | Learned |
| --- | --- |
| `TESTING.md` | one heavy run at a time; phone cases in `test:e2e:mobile-shell`; fresh `--output-dir` |
| `mobile-shell-probe.mjs` header, `fixtures/probe-node-access.mjs` | owner credential, `pairNodes`, desktop window on alpha |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | a node serves `<server>/../autobyteus-web/dist/public` at `/mobile`: a base worktree's node serves the old page |
| `autobyteus-android/README.md` | `./gradlew :app:assembleDebug`, `ANDROID_HOME` (no `local.properties` here) |
| autobyteus-446 FU-003 | on this base the full probe's verdict is `Fail` on the revoked main phone's refused reads; read cases one by one |

| Component | Start | Stop |
| --- | --- | --- |
| Builds | IMP-09 (server, no change since) / IMP-13 (bundle from `5f06b08ce9`); verified before the run | — |
| Probe stack + new nodes epsilon and zeta (peers) | the probe | probe / cases `finally` |
| Emulator (own read-only instance) and two harness nodes (new and base page) | harness | `emu kill`, harness `finally` |
| Base worktree (old page, old APK) | `git worktree add` at `6884309283`, install, server and `build:mobile-web`, `assembleDebug` | `git worktree remove` |

| Data | Method | Cleanup |
| --- | --- | --- |
| epsilon: agent run with workspace files (`posts/post.md`, `images/chart.png`, `notes/brief.txt`); a remote run on zeta; test PNG/PDF/text files | public GraphQL; `CALL_TOOL:` delegation; messages over the run streams with `context_file_paths` | probe root |
| alpha (desktop case): a run on alpha's workspace with `docs/reopen-450.md` | public GraphQL; messages | probe root |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Action |
| --- | --- | --- | --- | --- |
| web specs listed in IMP-03, IMP-05, IMP-12 (opener, loader, store reload, viewers, composer drafts, notices) | unit | AC-001…004 | Still Valid | Reuse |
| `RightSideTabs.workspaceTarget.spec.ts` | updated to two reads for two opens | REQ-003 | Still Valid (updated to approved behavior) | Reuse (IMP-07/13) |
| `TrustedNavigationPolicyTest.kt` | main-frame `/rest/`, `/graphql` → `KeepPage`; subframes allowed | AC-005 | Still Valid | Reuse (IMP-06) |
| `mobile-shell-probe.mjs` MSP-01…27 | phone shell regression: MSP-13 rejected credential → pairing; MSP-16/17 file links; 426 preview frames | AC-006 | Still Valid | Run (full probe) |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | REQ-001…004 (unit) | web specs | Reused | IMP-03, IMP-05, IMP-12 | same source (`5f06b08ce9` or code unchanged since `486ba3c395` for IMP-03/05: `git diff --name-only 486ba3c395 5f06b08ce9` touches the composer, thumbnail, `UserMessage` classes and the opener) — IMP-12/13 cover those |
| API-02 | REQ-005 | full web suite, typecheck, guards | Reused | IMP-13 | ran on `5f06b08ce9` |
| API-03 | AC-005 (unit) | Android unit suite | Reused | IMP-06 | Android unchanged since `e470edf165` |
| API-04 | DS-002 premise | Chrome same-URL image | Reused | IMP-02 | browser behavior |
| MSP-28 | AC-001, AC-002 | phone bundle (epsilon): drafts (PNG, PDF, text), sent attachments, a workspace-path attachment | Durable | new case | Every kind, Back, network log (no 401, no main-frame node navigation, no new window) |
| MSP-29 | AC-002 (DEC-006) | phone bundle: a path attachment of a run on zeta | Durable | new case | The other-node notice |
| MSP-30 | AC-004 | phone bundle: a workspace text file and image rewritten, new and old links opened again | Durable | new case | Phone reload incl. media |
| MSP-31 | AC-003 | desktop window on alpha: link, rewrite, new link, same link, Files tab; an unsaved edit kept | Durable | new case | Desktop reload and the draft rule |
| API-05 | AC-006, regression | full phone probe | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-05-mobile-shell-probe` | MSP-13, MSP-16/17, 426 frames, and the new cases |
| API-06 | AC-002, AC-005 (real app), ASM-001, BEH-007 | Android emulator: (a) new APK + new page: taps → viewer, never pairing; a revoked device → pairing; (b) new APK + old page: the old `window.open` tap → the page stays; (c) old APK + old page: → pairing screen (ASM-001) | Journey (temporary harness) | harness in `evidence/API-06-emulator/` | Device behavior; not a package probe |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update

| Case ID | Path | Why |
| --- | --- | --- |
| MSP-28…31 | `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` (new), called from `mobile-shell-probe.mjs` after the other case modules | TESTING.md; the design's step 4. Own nodes keep uploads, delegation and rewrites off alpha (except MSP-31, which needs alpha's desktop window and runs last) |
| — | `mobile-shell-probe.mjs` | header lines, the call, runtime note |

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? | Follow-up |
| --- | --- | --- | --- | --- |
| Packaged Electron window (local-file reads of an embedded window) | renderer change only; unit-covered (IMP-05) | Low | No | — |
| A viewer left open refreshing by itself | out of scope | known | No | FU-001 |

## Ambiguities Or Reroute Triggers

None at planning.

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes`; reroute: `No`.
