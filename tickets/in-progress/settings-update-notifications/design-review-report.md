# Design Review Report — settings-update-notifications

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/requirements-doc.md` (SR-003, Approved)
- Upstream Investigation Notes: `.../investigation-notes.md` (AF-01..AF-14)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-003)
- Reviewed Design Spec: `.../design-spec.md` (SR-003, status Ready), at worktree commit `0946bd3c10`
- Supplemental Task Artifacts Reviewed: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` (Approved, design repository `288ef06`); `follow-ups.md` (FU-001, FU-002); `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-003 (design), SR-001/SR-002 (requirements basis)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Architecture Design Complete (Large / High) from the Solution Designer, 2026-10-20
- Prior Review Round Reviewed: N/A (first review)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: code read at `origin/personal` `3d4d9d0a95` in the worktree:
  - server: `agent-package-service.ts` (528 lines), `agent-package-mappers.ts`, `skill-source-service.ts`, `skill-source.ts`, `public-github-request.ts`, `github-repository-client.ts`, `build-studio-server.ts`, `agent-package-definition-feed-composition.ts`, `studio-application-api-services.ts`, `skill-improvement-capability-service.ts`, `store-utils.ts`;
  - shell: `appUpdater.ts` (437 lines), `electronLaunchProfile.ts`;
  - web: `app.vue`, `appUpdateStore.ts`, `appUpdateErrorDisplay.ts`, `agentPackagesStore.ts`, `skillSourcesStore.ts`, `SkillSourceRow.vue`, `useAgentPackageDefinitionChangeFeed.ts`;
  - project `DESIGN.md` (rules 1–9, anti-patterns, project documents).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three runtimes (server, Electron shell, web); a new server capability area; two new persisted stores; a recurring background lifecycle; new concurrency against existing check/update pipelines; process-wide outbound-network policy; new GraphQL, websocket, IPC and launch-variable contracts; removal of a UI surface. Confirmed against the file mapping and the code.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Quiet notifications for app, GitHub package and GitHub skill source updates; background check per node, on by default, at most every 6 h per source, stopping at a rate limit; one record per source; read, handled and cleared state persisted; no skip; Update only through the existing explicit actions; the self-opening card is retired.
- Relevant existing behavior and evidence confirmed:
  - AF-04: both source owners are `getInstance()` singletons called directly by resolvers. Verified.
  - AF-05: `checkAgentPackageUpdates` lists records before the loop. `checkGitHubPackageUpdate` then writes `installedRevision` from that earlier read after awaiting GitHub. Verified; the race is real.
  - AF-06: package `canUpdate` depends on status; skill status puts `CHECK_FAILED` before a known newer revision; `SkillSourceRow.canUpdate` is status-only. Both keep `latestRevision` on failure. Verified.
  - AF-07: every `api.github.com` call of packages and skills goes through `publicGitHubRequest`, with no rate-limit handling. Verified.
  - AF-09: `downloadUpdate` requires `status === 'available'` in this process; `visible`, `dismissedVersion`, `shouldShow`, `dismissNotice` and the hide timer are read only by `AppUpdateNotice.vue`; `getAppUpdateNoticeErrorMessageKey` and `NOTICE_MESSAGE_KEYS` are used only by the card. Verified.
  - Update paths leave `latest = installed` after a successful update (`buildInstalledGitHubMetadata`; skill `observation(metadata)`), which the DS-007 "handled" rule relies on. Verified.
  - Both owners persist a last-check time on success and on failure (`latestCheckedAt`; `lastCheck.checkedAt`), which REQ-002's "any check counts, across restarts" relies on. Verified.
- Scope guardrail confirmed: Yes (UC-001..UC-007; Out of Scope; Preserved Behavior Boundary BEH-001..007 and REQ-015; Review Authority).
- Approved change, preserved behavior and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion or preserved-behavior ID: `Yes` (AR-001 → REQ-003, AC-013, QR-001; AR-002 → REQ-004, REQ-019, AC-003).
- Remaining material ambiguity: AR-001 and AR-002 (below).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-008 | System | Pass | Pass | Pass, except the rate-limit stop across a restart (AR-001) | Confirmed | AR-001 |
| BEH-009 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-010 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-001, BEH-003 (on-open checks) | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002, BEH-003 (update) | User | Pass | Pass | Pass (see AR-003 on the serialized re-read) | Confirmed | AR-003 (non-blocking) |
| BEH-004, BEH-005, BEH-006 | System/User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Operational | Pass | Pass | Unclear for the release link under a test feed (AR-002) | Confirmed | AR-002 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product UI/UX spec + VIS-001..028 (`288ef06`) | Pass | Pass | Pass | Pass. The design's web mapping, row actions, counts, browser and mobile rules, and Data/Mock Boundaries table match the spec. | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |
| `handoff-product-design-request.md` | Pass | Pass | Pass | Pass (historical context) | Pass | — |

Note: the investigation notes' Supplemental Artifact Inventory still lists the UI/UX spec as `Pending`. The requirements doc, the design spec and the Product Design Findings section record it as Approved. This is stale wording only; fix it with the revision.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature with a behavior change (card retired) | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` (AF-05, AF-06), verified in code | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded: serialization; split of the 528-line service; `ChangeFeedHub`; shared confirmation. FU-001 deferred. | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership Map, Removal Plan, File Mapping and Change Sequence carry each item | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 background check → pill | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 user action → reconcile | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 panel read/act/clear | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 app update | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 live feed | Return/Event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 scheduler loop | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass (AR-001 concerns the gate's lifetime, not the loop) |
| DS-007 reconcile table | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 setting | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-007 was traced against the approved transitions:
- new update: absent → waiting;
- newer revision: waiting `A→B` with latest `C` → replaced, unread (REQ-005);
- failed check: latest kept → unchanged (REQ-006);
- update from a row: installed `B ≠ from A` → handled (REQ-008);
- upstream back to installed with nothing installed: removed (DEC-015);
- source removed or `REMOVING`: deleted;
- handled, then a newer revision: new waiting record.

Every reachable transition has one row. The only uncovered combination (waiting, latest unchanged, installed changed to a non-latest revision) is not produced: both update paths set `latest = installed`.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentPackageService` | Pass | Pass (`github-agent-package-updates.ts` internal) | Pass | Pass | Scheduler and notification service use only public methods and the projection |
| `SkillSourceService` | Pass | Pass | Pass | Pass | — |
| `UpdateNotificationService` | Pass | Pass (store, hub) | Pass | Pass | See residual note R-1 on how the resolver reaches the composed instance |
| `publicGitHubRequest` / `GitHubRateLimitGate` | Pass | Pass | Pass | Pass | Scheduler reads `isBlocked` only |
| `AppUpdater` / `AppUpdateNotificationRecord` | Pass | Pass | Pass | Pass | Renderer sends intents only |
| Web `updateNotificationsStore` | Pass | Pass | Pass | Pass | Components never call GraphQL or IPC for notifications |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `update-notifications` → source owners, `integrations/github`, settings, `utils` | Pass | Pass | Pass | Pass | Owners know only an injected `() => void` |
| Transport adapters (GraphQL, ws) → `update-notifications` | Pass | Pass | Pass | Pass | — |
| Web stores → existing action stores | Pass | Pass | Pass | Pass | — |
| Shell `AppUpdater` → record, release link | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `listGitHubSourceUpdateStates()` (each owner) | Pass | Pass | Pass | Low | Pass |
| `setGitHubSourceStateListener` | Pass | Pass | N/A | Low | Pass |
| `UpdateNotificationService.listNotifications / markAllRead / clear(kind, sourceId) / reconcile` | Pass | Pass | Pass (compound identity) | Low | Pass |
| GraphQL query and mutations; capability query and mutation | Pass | Pass | Pass | Low | Pass |
| `/ws/update-notifications` | Pass | Pass | N/A | Low | Pass |
| `GitHubRateLimitGate.isBlocked`, `GitHubRateLimitError` | Pass | Pass | N/A | Low | Pass (lifetime: AR-001) |
| IPC `mark-notification-read`, `clear-notification`; `AppUpdateState.notification` | Pass | Pass | N/A | Low | Pass (`releasePageUrl` under a test feed: AR-002) |
| `AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL` | Pass | Pass | Pass (loopback only; e2e profile only) | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Checking / updating | Pass | Pass | N/A | Pass | Existing owner methods and web store actions; both web actions rethrow, so the row can show the reason |
| Live push | Pass | Pass | Pass | Pass | `NodeChangeFeed` + generic hub |
| Setting | Pass | Pass | Pass | Pass | Capability pattern (AF-08); dedicated card justified by the approved UI |
| JSON persistence | Pass | Pass | N/A | Pass | `readJsonArrayFile` throws on malformed JSON; the store must catch it, as the design states (QR-005) |
| Rate limit | Pass | Pass | Pass | Pass | Transport owner |
| Notification records | Pass | Pass | Pass | Pass | No existing owner |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/update-notifications` | Pass | Pass | Pass | Pass | Studio-only, composed in `buildStudioServer` (also used by remote server nodes via `server-runtime.ts`) |
| `src/agent-packages`, `src/skills` | Pass | Pass | Pass | Pass | — |
| `src/integrations/github` | Pass | Pass | Pass | Pass | Neutral home for the projection type both owners already depend on |
| `src/utils/change-feed-hub.ts` | Pass | Pass | Pass | Pass | FU-001 records the migration of the two old hubs |
| Electron updater, launch profile, isolated-app CLI | Pass | Pass | Pass | Pass | — |
| Web stores, components, localization | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Source update projection | Pass | Pass | Pass | Pass | — |
| Broadcast hub | Pass | Pass | Pass | Pass | — |
| Skill update confirmation | Pass | Pass | Pass | Pass | — |
| Node vs shell reconcile rules | Pass | N/A | N/A | Pass | Different processes; not shared code |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GitHubSourceUpdateState` | Pass | Pass | Pass | N/A | Pass | — |
| Stored `UpdateNotificationRecord` | Pass | Pass | Pass | N/A | Pass | State derived from `handledRevision`; no display fields stored |
| `UpdateNotificationView` | Pass | Pass | Pass | N/A | Pass | `compareUrl` built in the web |
| `AppUpdateNotification` | Pass | Pass | Pass | N/A | Pass | Release notes not duplicated |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server new files (domain, store, service, scheduler, capability, messages, composition, hub, gate, projection type) | Pass | Pass | Pass | Pass | — |
| `agent-package-service.ts` + `github-agent-package-updates.ts` | Pass | Pass | Pass | Pass | The split brings the over-limit file under 500 lines (ticket-scope rule) |
| `appUpdater.ts` + record + `appReleasePage.ts` | Pass | Pass | N/A | Pass | 437 lines today; the escalation trigger covers the 500-line limit |
| Web files | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/update-notifications/{domain,stores,services,changes}` | Pass | Pass | Low | Pass | Mirrors `projects/` |
| `src/compositions/update-notifications-composition.ts` | Pass | Pass | Low | Pass | — |
| `electron/updater/*` | Pass | Pass | Low | Pass | — |
| `components/notifications/*` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppUpdateNotice.vue` + spec + mount | Pass | Pass | Pass | Pass | — |
| Card-only `appUpdateStore` state | Pass | Pass | Pass | Pass | Grep confirms the card and the store are the only readers |
| `NOTICE_MESSAGE_KEYS`, `getAppUpdateNoticeErrorMessageKey` | Pass | N/A | Pass | Pass | Only the card uses them |
| `AppUpdateNotice.*` strings | Pass | Pass | Pass | Pass | — |
| Startup-check error toasts | Pass | Pass | Pass | Pass | DEC-016 |
| Inline confirmation body | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| App-update card, dismissal state | No | Pass | Pass | — |
| Web/server contract | No | Pass | Pass | DESIGN.md rule 9 |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Node `update-notifications/notifications.json` (new) | Not Affected; tolerant read, exact write | Pass | Pass | N/A | Pass | Malformed file reads as empty with a warning; acceptable loss per the Data Continuity section |
| Shell `app-update-notification.json` (new) | Same | Pass | Pass | N/A | Pass | — |
| Package / skill registries | No shape change | Pass | Pass | N/A | Pass | Existing installs with `latest ≠ installed` get waiting records at the first reconcile, which is the intended outcome |
| `ENABLE_UPDATE_CHECKS` | Absent = on | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server (transport → owners → capability area) | Pass | Pass | Pass | Pass |
| Shell | Pass | Pass | Pass | Pass |
| Web | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Change signal, reconcile cases, rate limit, app download after restart | Yes | Pass | Pass | Pass | — |
| Serialized package check | Yes | Partial | N/A | Pass | AR-003 asks for one sentence |

## Material Premise Validation

### `MP-001` — The automatic-request stop must hold across a node restart within GitHub's reset window

- Related approved requirement or established contract: REQ-003 ("no further automatic GitHub request is made before GitHub's reset time"), AC-013, QR-001 ("zero automatic requests before the reset time", per node). REQ-002 explicitly treats restarts as part of the cadence contract.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `User` + `System`.
- Independent trigger: SCN-005 (rate limit during a background pass; Supported Explicit Edge Scenario). Then the user quits and reopens the desktop app, or a server node restarts. Both are ordinary supported actions, and REQ-002 already names restarts.
- Support evidence: desktop app quit/start (embedded server restarts with it); server-node restart.
- Forward path:
  1. A pass gets a 403 with `x-ratelimit-remaining: 0`, and the gate is blocked until T.
  2. The scheduler stops; sources not reached keep their old `lastCheckedAt`, so they are still due.
  3. The process restarts before T, and the new process's gate is empty (in-memory only, per the design).
  4. At 60 s the scheduler sees `isBlocked() = false` and the first due source is checked.
  5. One automatic `api.github.com` request is made before T.
- Lifecycle preconditions and consequence: one automatic request (a 403) before the reset time, contrary to the literal REQ-003/AC-013 contract. Practical harm is small: the gate closes again at once.
- Reachability: `Reachable`.
- Review consequence: AR-001 (Minor). The design must make the restart behavior an explicit decision.

### `MP-002` — Release-page link when the app checks a test feed

- Related approved requirement or established contract: REQ-004 (release page link), REQ-019, AC-003 (with the test-feed opt-in: "release notes, release link").
- Relevant behavior ID(s): BEH-004, BEH-007.
- Initiating basis kind: `Operational`.
- Independent trigger: SCN-008. A tester starts an isolated instance with `--test-update-feed <url>` (approved UC-007).
- Support evidence: AF-11; the design's launch-variable contract.
- Forward path:
  1. An isolated packaged worktree build runs; its packaged `app-update.yml` still holds the build-time GitHub publish config (AF-10).
  2. `AppUpdater` uses `setFeedURL({ provider: 'generic', url })`, and the test feed offers version X.
  3. The record is created, and `appReleasePage.ts` reads `app-update.yml`, which gives `https://github.com/<owner>/<repo>/releases/tag/vX`.
- Lifecycle preconditions and consequence: the artifacts disagree on what should happen here.
  - AF-10 says "a test feed has no release page".
  - The mapping as written produces a link to a real-repository tag that probably does not exist.
  - AC-003 expects a release link in exactly this scenario.
  - Implementation and API/E2E cannot tell which outcome is correct.
- Reachability: `Reachable`.
- Review consequence: AR-002 (Minor).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Investigation notes' supplement inventory lists the UI/UX spec as `Pending` | Stale wording that disagrees with the approved status elsewhere | Update with the revision | Open (non-blocking) |

## Review Decision

`Fail`. The design is sound in structure, ownership, boundaries, persistence and removal. Two small, bounded decisions are missing against approved requirements (AR-001, AR-002). Both need a short Solution Designer decision before implementation. No other section needs rework; the next round needs to recheck only these items.

## Findings

### AR-001 — Rate-limit stop is lost on restart (Design Impact, Minor, blocking)

- Protects: REQ-003, AC-013, QR-001.
- Scope status: `Within Approved Scope`.
- Changes approved behavior: No.
- Affected behavior: BEH-008 / SCN-005; DS-006; `GitHubRateLimitGate` lifetime.
- Evidence: the design defines the gate as a process-wide in-memory singleton (`getGitHubRateLimitGate()`) with no persistence, and the scheduler's first pass runs 60 s after start. REQ-002 shows restarts are inside the approved cadence contract.
- Material premise: MP-001 (Reachable).
- Required update: state the gate's restart behavior explicitly. One of:
  - (a) Persist the gate's blocked-until time in node app data, read it at start, and record it with a tolerant reader. This is a tiny file or a field next to the notification store; the gate stays the owner.
  - (b) If the Solution Designer reads REQ-003 as limited to a running process, record that reading with its accepted cost (at most one automatic request after a restart inside the window). Inform the user, as with DEC-014..016.
- Why proportionate: a small, explicit decision. No new mechanism is required beyond (a)'s single timestamp.
- Recommended recipient: Solution Designer.

### AR-002 — The test feed's release link contradicts AF-10 (Design Impact, Minor, blocking)

- Protects: REQ-004, REQ-019, AC-003.
- Scope status: `Within Approved Scope`.
- Changes approved behavior: No (it chooses how the approved AC is met).
- Affected behavior: BEH-004 / BEH-007 / SCN-008; `appReleasePage.ts`; `AppUpdateNotification.releasePageUrl`.
- Evidence:
  - AF-10 and the Off-Spine table say a test feed has no release page.
  - `appReleasePage.ts` derives the link only from the packaged `app-update.yml`, which in an isolated packaged build is the real GitHub publish config.
  - AC-003 lists "release link" as an expected outcome under the test-feed opt-in.
- Material premise: MP-002 (Reachable).
- Required update: decide and write down the rule for the test feed, and how AC-003's "release link" is verified. Then make AF-10, the Off-Spine row and the Interface table agree. For example:
  - `releasePageUrl = null` when a test feed is set; AC-003's link is verified by an Electron unit test of `appReleasePage.ts` with a GitHub publish config; or
  - the link is always derived from the publish config, and AC-003 checks its shape only.
- Why proportionate: one rule plus text alignment; it removes an ambiguity API/E2E would otherwise hit.
- Recommended recipient: Solution Designer.

### AR-003 — Serialized package check must re-read inside the lock (Design Impact, Minor, non-blocking on its own)

- Protects: BEH-002 preserved outcome (an update's new installed revision is never overwritten); AF-05.
- Scope status: `Within Approved Scope`.
- Changes approved behavior: No.
- Evidence: `checkAgentPackageUpdates` reads all records before the loop, and `checkGitHubPackageUpdate(record)` writes `installedRevision` from that earlier read. Serializing each id while still passing the pre-read record leaves the AF-05 race open. `updateAgentPackage` also reads its record before any lock. `SkillSourceService` shows the correct shape: it re-reads `current` inside `serialize`.
- Required update: one sentence in the Ownership Map or Examples. Inside `serialize(id, …)`, each check and update re-reads its record before calling GitHub and writes from that fresh record. The Change Sequence test (check concurrent with update keeps the new installed revision) already states the outcome.
- Why proportionate: a one-line clarification of the key concurrency decision; include it with the AR-001/AR-002 revision.
- Recommended recipient: Solution Designer.

## Classification

`Design Impact` (AR-001, AR-002, AR-003).

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- R-1 (implementation note, no finding): the design does not say how the GraphQL resolver reaches the composed `UpdateNotificationService` and `UpdateChecksCapabilityService`. `registerGraphql(app)` takes no services. Use one existing pattern: `getInstance()` singletons wired by the composition, or the `configureStudioApplicationApiServices`-style configure/close handle. Do not create a second instance in the resolver.
- R-2: the scheduler checks the capability only at the start of a pass. Turning the switch off during a running pass lets that pass finish (seconds). Cheap to re-check per source next to the gate check; not required by an AC.
- R-3: application packages fetch GitHub through their own installer, not `publicGitHubRequest`, so the gate does not cover them. Out of scope (application packages are out of scope); "process-wide" means package and skill traffic.
- R-4: known risks the design records: generic-provider check in a packaged isolated build (escalation trigger); macOS install of a test build (Electron harness fallback); live row order (Product question).
- R-5: the gate also refuses manual requests until the reset. This is within the approved external contract ("honour reset/retry headers"). The user's outcome is the same as today (the check fails) but with a clearer message and no request.

## Latest Authoritative Result

- Review Decision: `Fail` (Design Impact; AR-001, AR-002 blocking; AR-003 non-blocking clarification)
- Material-Premise Gate: `Pass` (MP-001 and MP-002 are Reachable and drive AR-001 and AR-002; no machinery depends on an unsupported premise)
- Notes: task_size `Large`, architectural_risk `High` confirmed. Every other structural verdict passes and keeps its evidence for the next round.
