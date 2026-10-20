# Code Review Report — settings-update-notifications

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AF-01..AF-14), as cited by the design spec and the architecture review
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts Reviewed As Context: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` (Approved, `288ef06`); `follow-ups.md` (FU-001, FU-002); project `DESIGN.md` (rule 7); `autobyteus-server-ts/docs/modules/skills.md`
- Relevant Solution Revision IDs: SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): the delta `71cfcd7d32..c42bf2abc4` touches only `update-notification-service.ts` (the CR-001 location), its unit test, the GraphQL schema test and one paragraph of `update_notifications.md`. The service's public methods, the GraphQL view shape and the web contract are unchanged; no other file or spine changed. Round-1 evidence for all other checks and scores carries forward.
- Trigger: implementation engineer's handoff of IR-002 (Local Fix for CR-001), 2026-10-20; fix commit `c42bf2abc4`, ticket commit `d76332c669`. Round 1 reviewed code commits `da74c13406`, `eba4674616`, `71cfcd7d32` on base `origin/personal` `3d4d9d0a95`.
- Prior Review Round Reviewed: round 1 (CRR-001, Fail, CR-001)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API/E2E Revision Record / Delivery: N/A (implementation review)
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Confirmed against the diff: three runtimes, about 100 files, new persisted files (node app data, Electron `userData`), a recurring server lifecycle, per-package concurrency control, new GraphQL / websocket / IPC / launch-variable contracts, a removed UI surface.

## Review Scope

- Changed implementation and behavior reviewed: the whole diff `3d4d9d0a95..71cfcd7d32` (server, desktop shell, web, docs), traced along DS-001..DS-008.
- Files / areas reviewed:
  - Server: `src/update-notifications/**`, `utils/change-feed-hub.ts`, `compositions/{update-notifications-composition,build-studio-server}.ts`, `api/graphql/types/update-notifications.ts`, `api/websocket/update-notifications.ts`, `integrations/github/{github-rate-limit-gate,public-github-request,github-source-update-state}.ts`, `agent-packages/services/{agent-package-service,github-agent-package-updates,agent-package-mappers}.ts` (compared with the base methods it moved), `skills/services/skill-source-service.ts`, `services/server-settings-service.ts`; the skill registry store's read contract.
  - Shell: `electron/updater/{appUpdater,appUpdateNotificationRecord,appReleasePage,appUpdateController,disabledAppUpdater}.ts`, `shared/appUpdateTypes.ts`, preload and type declarations, `electronLaunchProfile.ts`, `electronApplication.ts`, `scripts/isolated-app/{cli,instanceLifecycle}.mjs`, `scripts/electron-launch/launchEnvironment.mjs`.
  - Web: `stores/{updateNotificationsStore,notificationCenterStore,appUpdateStore}.ts`, `stores/capabilities/updateChecksCapabilityStore.ts`, `services/updateNotifications/updateNotificationChangeFeed.ts`, composable, `components/notifications/*`, `SidebarNotificationsEntry.vue`, `AppLeftPanel.vue`, `LeftSidebarStrip.vue`, `UpdateChecksCard.vue`, `SkillSourceUpdateConfirmation.vue`, `SkillSourcesModal.vue`, `SkillSourceRow.vue`, `app.vue`, `utils/{appUpdateErrorDisplay,notificationTime,nodeEndpoints}.ts`, en strings.
  - Tests: the new and changed server, Electron and web test names and the reconcile, scheduler, gate and race tests.
- Explicit exclusions: rendered visual fidelity against VIS-001..028 beyond the implementation's IMP-10 evidence; packaged isolated generic-feed behavior (API/E2E, the design's open escalation trigger). Recorded checks were not rerun (they ran on the reviewed commit). One temporary probe was run for CR-001 in round 1 and deleted.
- Round 2 (Targeted Delta Review): `git diff 71cfcd7d32 c42bf2abc4` — `update-notification-service.ts`, `update-notification-service.test.ts`, `update-notifications-schema.test.ts`, `docs/modules/update_notifications.md`. IMP-11 (tsc + 49 affected tests at `c42bf2abc4`, and the new GraphQL test failing against the round-1 service) was not rerun: it ran on the reviewed commit, and nothing else the earlier checks exercise changed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes — quiet notifications for the app, imported GitHub packages and skill sources; background checks per node (on by default, ≤ once per 6 h per source, stop on a rate limit across restarts); one record per source; read / handled / cleared persisted; no skip; Update only through each kind's existing explicit action; the self-opening card retired.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: round 2, Pass (ARCH-REV-002); AR-001..AR-003 resolutions are in the code (persisted gate, `releasePageUrl = null` under the test feed, re-read inside `serialize`).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-008 | Confirmed | `build-studio-server.ts` → `composeUpdateNotifications()` → `UpdateCheckScheduler.start()` (60 s, 30 min tick, 6 h due, packages then skills, oldest first; `isEnabled` and `isBlocked` before every source) → owners' `checkAgentPackageUpdates([id])` / `checkGitHubSkillSourceUpdates([id])` → `publicGitHubRequest` + `GitHubRateLimitGate` (persisted `<app-data>/github/rate-limit.json`, `api.github.com` only) | — |
| BEH-009 | Confirmed (CR-001 resolved in round 2: an owner that cannot be read leaves the other kinds working) | Owner listener → `UpdateNotificationService.reconcile` (one queued run; persist + publish only on change) → `ChangeFeedHub` → `/ws/update-notifications` → `UpdateNotificationChangeFeed` → `updateNotificationsStore.reload`; panel open → `markAllRead` (GraphQL + shell IPC); Clear → `clearUpdateNotification` / IPC | — |
| BEH-010 | Confirmed | Package failed check keeps `latestRevision` (`github-agent-package-updates.ts` catch); skill failed check keeps `lastCheck.latestRevision`; `canUpdate` from latest ≠ installed in `agent-package-mappers.ts` and `SkillSourceRow.vue`; reconcile keys on latest ≠ installed | — |
| BEH-001, BEH-003 (on-open) | Confirmed | Unchanged entry points; every check settles → listener → reconcile | — |
| BEH-002, BEH-003 (update) | Confirmed | `AgentPackageService.serialize(id, …)` around check / update / remove; moved update body identical to base (diffed); panel package Update → `agentPackagesStore.updateAgentPackage`; skill Update → shared `SkillSourceUpdateConfirmation` → `skillSourcesStore.githubOperation('update')` | — |
| BEH-004..006 | Confirmed | `AppUpdater`: `recordFound` / `recordNotAvailable` / start reconcile; re-check before Download when not `available`; IPC intents; `AppUpdateNotice` and its state removed; `isQuietStartupAppUpdateError` quiet for every startup-check error; Settings → Updates untouched | — |
| BEH-007 | Confirmed | `AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL` parsed only in the e2e profile (loopback `http` with port), rejected in production; inherited value dropped by `buildIsolatedLaunchEnvironment`; `AppUpdater({ testFeedUrl })` with `releasePageUrl` null | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001..SCN-008 | BEH-001..BEH-010 | as in the requirements | as in the requirements | as in the requirements | as in the requirements | Normal / Explicit Edge (SCN-005, SCN-008) | DS-001..DS-008 (table above) | as in the requirements | requirements-doc, design-spec, ARCH-REV-002 | Supported (as classified upstream) | Use |
| RSC-001 | BEH-009; REQ-004 (packages); DESIGN.md rule 7; `skills.md` ("Invalid registry data is preserved and reported without disabling unrelated local skills") | Contract | The node, while its GitHub skill-source registry is in the reported unreadable state | Bad data in one store stays contained; other features keep working | `SkillSourceService.getRegistryError()` → GraphQL `skillSourceRegistryError` → shown in Manage skill sources; `skills.md` tells the user to correct the reported filesystem problem | Explicit Edge | Any notification operation → `UpdateNotificationService.run` → `readSourceStates` → `SkillSourceService.listGitHubSourceUpdateStates()` → `GitHubSkillSourceStore.read()` throws | Package notifications should still be listed, created and cleared | The product surfaces and documents this state; every existing reader of the store contains it (`getSkillSources`, `listActiveSources`, `getDiagnostic`) | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | An unreadable skill-source registry makes every notification operation reject, so package notifications disappear too | RSC-001 | The skill registry in its reported error state | `listNotifications` / `reconcile` / `markAllRead` / `clear` reject → GraphQL `updateNotifications` errors → web `reload` only logs → no package rows, pill absent; the listener's reconcile after each package check/update fails (logged) | `skill-source-service.ts:80-87` (no containment, unlike lines 58 and the store's `listActiveSources`); `update-notification-service.ts:86-110`; the unit test "leaves the records untouched when a source owner cannot be read" asserts the whole call rejects; reviewer probe (temporary, deleted): registry `{not json` → `getRegistryError()` reports it and `listNotifications()` rejects while a package update is known | Promote → CR-001 | This ticket | Contain the failure per source owner; see CR-001 (resolved in round 2) |
| C-02 | `recordFound` replaces a waiting app record with any different offered version, not only a newer one (e.g., a channel switch) | DS-007 ("R.latest ≠ S.latest → new waiting") | Channel switch | Record follows what the channel offers | design-spec DS-007; electron-updater offers only versions above the running one | Reject | — | Matches the reviewed rule |
| C-03 | Release notes are not persisted; after a restart the app row's details lack notes until the startup check (8 s) | Design "Release notes stay in `AppUpdateState.releaseNotes`" | Restart | Notes reappear after the startup check | design-spec Shared Structure table | Reject | — | Approved shape |
| C-04 | A panel package/skill Update failure also sets the shared `agentPackagesStore.error` / `skillSourcesStore.error` | DS-003 delegation to existing stores | Failed Update from the panel | The Agent Packages page or skill dialog may later show the same error | Existing store behavior, reused as designed | Reject | — | Reuse of existing explicit actions is required (REQ-007); the message is true |
| C-05 | Confirmation dialog (`z-50`) overlaps the panel (`z-[90]`) below ~1100 px | Approved reference VIS-010; UI spec "below the confirmation dialog" | Narrow window | Buttons stay usable | IMP-10-skill-confirmation-overlap.png | Reject as a code finding | — | Product question already raised by implementation; for the Solution Designer / Product, not a source defect |
| C-06 | The four implementation choices in the handoff (handled app row with Clear; skills re-read after a panel skill update; "downloaded" toast once per download; no in-process "running version moved" branch) | REQ-008/009, REQ-012, DS-004 | — | Each matches an approved rule or existing behavior; the in-process branch is unreachable (running version is fixed for a process; the start reconcile handles it) | code read | Reject | — | No change needed |
| C-07 | Test-feed check needs a packaged build (`app.isPackaged`) | REQ-019, design escalation trigger | Isolated instance | Unverified until API/E2E | `appUpdater.ts` `startAutoCheck` | Hold for Evidence | — | Already the design's open trigger for API/E2E; no review action |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Serialization with fresh reads (IMP-03 reproduces the race without it); 528 → 439-line split; `ChangeFeedHub`; shared skill confirmation | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Panel, pill/strip, sections, rows, details, Show N more, handled/Clear, card, strings follow the UI spec; IMP-10 evidence; overlap is a recorded Product question | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-008 map 1:1 to code (composition → scheduler → owners → transport/gate → reconcile → hub → feed → store → UI) | — |
| Ownership boundary preservation and clarity | Pass | Owners remain the only writers; service reads only projections; scheduler only calls public checks; transport owns rate-limit policy; shell owns the app record | — |
| Off-spine concern clarity | Pass | Gate, store, hub, capability, record file, release-link resolver each serve one owner | — |
| Existing capability/subsystem reuse check | Pass | Capability factory, `NodeChangeFeed`, `writeJsonArrayFile`, `writeAtomicJsonSync`, existing action stores, `ConfirmationModal` reused | — |
| Reusable owned structures check | Pass | `GitHubSourceUpdateState` shared by both owners; `ChangeFeedHub` generic; confirmation body extracted | — |
| Shared-structure/data-model tightness check | Pass | Stored records carry no display fields; view adds them from the projection; `AppUpdateNotification` does not duplicate notes | — |
| Repeated coordination ownership check | Pass | Reconcile in one service; serialization in each owner; gate in the transport | — |
| Empty indirection check | Pass | Resolver, route and composition are thin transport/wiring, as designed | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | One concern per new file | — |
| Ownership-driven dependency check | Pass | `update-notifications` → owners; owners know only an injected listener; `integrations/github` gains nothing new | — |
| Authoritative Boundary Rule check | Pass | No caller depends on `AgentPackageService` and `GitHubAgentPackageUpdates` together; `GitHubAgentPackageUpdates` is constructed and called only by the service; resolver never touches the store | — |
| File placement check | Pass | Matches the design's mapping | — |
| Flat-vs-over-split layout judgment | Pass | `update-notifications/{domain,stores,services,changes}` mirrors `projects/` | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Compound `(kind, sourceId)` for clear; explicit per-owner projections; two IPC intents | — |
| Naming quality and naming-to-responsibility alignment | Pass | Names match the design's naming table | — |
| No unjustified duplication of code / repeated structures | Pass | Old hubs left for FU-001 as designed | — |
| Patch-on-patch complexity control | Pass | Initial round | — |
| Dead code removed in the touched files and modules | Pass | Card, its spec, store state, notice keys, 74 strings, duplicate restore branch removed; repository search finds no remaining references | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | DS-007, scheduler, gate, race, store, shell record, web store/panel tests are clear. Round 2: the full-rejection test is replaced by four owner-unavailable tests (other kinds listed and persisted with the warning; hidden records kept; mark read / clear on listed kinds only; records shown again once readable) and a GraphQL test with the real owners and a `{not json` skill registry | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Harnesses per owner; existing skill fixtures reused | — |
| No stale, duplicated, or compatibility-only tests are retained | Pass | `AppUpdateNotice.spec.ts` removed; `appUpdateStore.spec.ts` updated | — |
| API/E2E readiness for the next workflow stage | Pass | Isolated-app `--test-update-feed`, launch variable, docs and coverage hints present | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines Before (base) | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/updater/appUpdater.ts` | 377 | 434 (499 total) | Pass | Pass (+65/−3) | Pass (record and release link in own files) | Pass | — | None; close to 500 total lines, keep further growth out of it |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | 461 (528 total) | 382 (439 total) | Pass (brought under by the designed split) | Over (+75/−164): design-mandated move | Pass | Pass | — | None |
| `autobyteus-server-ts/src/agent-packages/services/github-agent-package-updates.ts` | new | 172 | Pass | Pass (moved code) | Pass | Pass | — | None |
| `autobyteus-server-ts/src/skills/services/skill-source-service.ts` | 258 | 283 | Pass | Pass | Pass | Pass | — | None (round 2 contains the failure in the notification service instead; the projection stays a plain read) |
| `autobyteus-server-ts/src/update-notifications/services/update-notification-service.ts` | new | 165 → 199 after round 2 (+43/−12 in round 2) | Pass | Pass | Pass | Pass | — | None |
| `autobyteus-web/stores/updateNotificationsStore.ts` | new | 193 | Pass | Pass | Pass | Pass | — | None |
| Other changed sources (all ≤ 395 effective lines, deltas ≤ 35 lines or new files ≤ 135) | — | — | Pass | Pass | Pass | Pass | — | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | Card and its state removed outright |
| Dead code removed in the touched files and modules | Pass | See Structural checks |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; three new files with tolerant readers / exact writers |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | No migration, as decided |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new module, background checks, setting, Notification Center, e2e variable and isolated-app option.
- Files or areas likely affected: already updated in `71cfcd7d32` (`update_notifications.md` + index, `agent_packages.md`, `skills.md`, `autobyteus-web/docs/settings.md`, `electron_packaging.md`, `docs/isolated-app-instances.md`). Round 2 added the owner-unavailable paragraph to `update_notifications.md` (`c42bf2abc4`); it matches the code.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 (rate-limit stop across a restart) | Confirmed | Gate persists and loads `blockedUntil`; tested across a new gate instance |
| MP-002 (release link under the test feed) | Confirmed | `currentNotification()` passes no config path when `testFeedUrl` is set |

New premises: RSC-001 is recorded in the scenario gate above (governing contract, Supported Explicit Edge, Reachable).

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93
- Score calculation note: simple average; the decision follows the findings. Round 2 changes only category 8 (CR-001 resolved); the other categories carry forward from round 1, whose evidence the delta does not touch.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Every designed spine is visible in code, start to end | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | Single writers kept; projection + listener pattern; no boundary bypass | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Compound identity, explicit per-owner projections, small IPC intents | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.3 | One concern per file; designed split done; `appUpdater.ts` kept under 500 | `appUpdater.ts` is at 499 total lines | Keep further updater growth in owned files |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.3 | Facts-only projection; stored records without display fields | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Natural names, short comments that state rules | — | — |
| `7` | `API/E2E Readiness` | 9.1 | Test feed, CLI option, docs and hints ready | Packaged generic-feed check still open (design trigger) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 | DS-007, serialization, gate, scheduler, shell record and web store match the approved rules; round 2: an owner that cannot be read is contained per kind (its records kept and hidden, the other kinds reconciled, listed, marked read and cleared), verified by unit and GraphQL tests | Remaining open items are API/E2E's (packaged test feed, real GitHub) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean removal of the card and its state | — | — |
| `10` | `Cleanup Completeness` | 9.4 | Dead code and strings removed; probe-free tree | — | — |

## Findings

No open findings. CR-001 is resolved in round 2 (see below and `code-review-revision-record.md`, CRR-002).

### CR-001 — An unreadable skill-source registry disables all node notifications (Local Fix, implementation) — Resolved (round 2)

- Resolution verified (`c42bf2abc4`):
  - `readSourceStates()` reads each owner on its own; a throwing owner is logged (`UPDATE_NOTIFICATIONS_SOURCE_UNAVAILABLE:<kind>`) and its kind marked unavailable.
  - `reconcileRecords()` drops a record as "source gone" only when its owner was read; records of an unavailable kind pass through unchanged (the per-state loop never sees them) and are written back with the other kinds' changes, so they survive.
  - `toViews()` hides them; `markAllRead` and `clear` act only on listed records (a hidden record answers "Update notification not found.", and its unread state is kept because the user has not seen it).
  - The replaced test and the four new ones cover each required outcome; the GraphQL test uses the real owners with a `{not json` registry and fails against the round-1 service (IMP-11).
  - Docs paragraph added to `update_notifications.md`.

Round-1 record:

- Basis: RSC-001 / C-01. DESIGN.md rule 7 (bad data contained; others keep working) and `skills.md` ("Invalid registry data is preserved and reported without disabling unrelated local skills"); protects BEH-009 and REQ-004 for agent packages, REQ-008/009 (Clear), REQ-010/011 (mark read, indicator).
- Evidence:
  - `skill-source-service.ts` `listGitHubSourceUpdateStates()` calls `this.store.read()` without containment. `GitHubSkillSourceStore.read()` throws on a malformed or unsafe registry by contract ("Invalid registries are never treated as writable empty data"). Every existing reader contains it: `getSkillSources()` (`try { records = this.store.read(); } catch { return sources; }`), `listActiveSources()`, `getDiagnostic()`.
  - `update-notification-service.ts` `run()` → `readSourceStates()` reads every owner; one throw rejects the whole operation. The unit test "leaves the records untouched when a source owner cannot be read" asserts exactly that the call rejects.
  - Reviewer probe (temporary test, deleted): a skill registry written as `{not json` → `getRegistryError()` returns "GitHub skill sources unavailable: …" (the state the dialog shows), and `listNotifications()` rejects while a package with installed ≠ latest is known.
- Consequence in the product: while the skill registry is in that reported state, GraphQL `updateNotifications`, `markUpdateNotificationsRead` and `clearUpdateNotification` fail; the web store only logs, so no package notification appears, the pill is absent, and every reconcile after a package check or update fails (logged). The user, told by the skill dialog to fix a skill-registry problem, also silently loses all agent package notifications.
- Required outcome (proportionate, local to the owners this ticket added code to):
  - A source owner that cannot list its sources does not stop the other kinds: their records are still reconciled, persisted, listed, marked read and cleared.
  - The failing kind's stored records are not deleted or rewritten as "source gone" because its owner could not be read (so read / handled / cleared state survives once the registry is fixed); they need not be shown while their source facts are unavailable.
  - Log a warning naming the owner, as the existing readers do.
  - Replace the current "rejects" test with tests for this behavior (one kind failing, the other served; the failing kind's records kept).
- Classification: `Local Fix`, owned by implementation. No requirement or design change: DS-007's "Source gone" means the owner reported the source absent, not that the owner failed; the design names no behavior for an unreadable owner, and the governing containment contract already exists.

## Follow-ups

- Follow-ups this review added: None.

## Classification

- None (round 2 passes). Round 1 was `Local Fix` (CR-001), owned by implementation, now resolved.

## Recommended Recipient

- API/E2E engineer, `/software_engineering_team/api_e2e_engineer` (rule: implementation review passes and the package is ready for API/E2E); then the informational pass notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Packaged isolated build checking a generic feed (design escalation trigger) and real-GitHub / real-instance acceptance criteria are left to API/E2E, as the handoff states.
- Product question (not a code finding): the confirmation dialog overlaps the panel below ~1100 px (IMP-10-skill-confirmation-overlap.png); the Solution Designer may take it to Product.
- `appUpdater.ts` is at 499 total lines (434 effective); later changes there should land in owned files.

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, CRR-002)
- Review Entry Point: `Implementation Review` (Targeted Delta Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10 (93/100); every category ≥ 9.1
- Failure Origin (when applicable): N/A
- Recommended Recipient (when applicable): `/software_engineering_team/api_e2e_engineer`
- Notes: CR-001 is resolved at `c42bf2abc4`. The implementation matches the approved requirements, the SR-004 design and the UI spec; the architecture-review resolutions AR-001..AR-003 are implemented and tested. Reviewed code head: `c42bf2abc4` (ticket commit `d76332c669`).
