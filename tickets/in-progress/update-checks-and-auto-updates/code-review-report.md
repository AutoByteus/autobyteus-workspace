# Code Review Report — update-checks-and-auto-updates

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AF-01..AF-15), as cited by the design spec
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005, Ready; line 6 still names SR-004, recorded as R-5 by the architecture reviewer)
- Supplemental Task Artifacts Reviewed As Context: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` (Approved, `5f5fb4c`); project `DESIGN.md`
- Relevant Solution Revision IDs: SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass; notes R-4..R-7)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation engineer's handoff of IR-001, 2026-10-23. Review range `3a0ea2238e..9f4dea898e` (code `95a608c456`, `802ffd917a`, `25609abdf7`, `62082fc36e`; ticket `9f4dea898e`); base `origin/personal` `d2820672c3`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E / Delivery records: N/A (implementation review)
- Failing Scenario IDs / Commands / Evidence: N/A
- Shared guidance applied: `design-principles.md` and `design-examples.md` as updated 2026-10-23 (Principle 1 kinds/entry forms and cited claims; Principle 2 call-order spines; Principle 11 derived consumers; Principle 13 one owner per sequence and no behavior by absence).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Confirmed against the diff: 111 files across server, shell and web; an opt-in automatic replacement path for agent content; a new GitHub endpoint and POST method; new persisted settings and record fields; new GraphQL, feed, IPC and state contracts; concurrency between the pass, user actions and vendor processes.

## Review Scope

- Changed implementation and behavior reviewed: the code diff `3a0ea2238e..62082fc36e`, traced along DS-001..DS-008.
- Files / areas reviewed:
  - Server: `integrations/github/{git-ls-refs,public-github-request,github-rate-limit-gate,github-repository-client}.ts`; `agent-packages/services/{github-agent-package-updates,agent-package-service}.ts`; `skills/services/skill-source-service.ts`, `skills/installers/github-skill-repository.ts`; `runtime-management/agent-runtimes/{agent-runtime-status-service,agent-runtime-types,runtime-source-fetch}.ts`, `strategies/codex-agent-runtime-strategy.ts`; `update-notifications/**` (domain, store, feed messages, records, service, pass, scheduler, settings service, runtime source); `config/desktop-embedded-node.ts`; compositions; GraphQL type; `services/server-settings-service.ts`.
  - Shell: `electron/updater/{appUpdateCheckSchedule,appUpdateCheckSettingsStore,appUpdateIpc,appUpdateStateFormat,appUpdater,appUpdateController,disabledAppUpdater}.ts`, `electron/server/serverRuntimeEnv.ts`, `shared/appUpdateTypes.ts`, preload and type declarations.
  - Web: `stores/{updateNotificationsStore,updateAutomationStore,notificationCenterStore,appUpdateStore}.ts`; `services/updateNotifications/updateNotificationChangeFeed.ts`; `components/notifications/*`; `SidebarNotificationsEntry.vue`; `UpdateChecksCard.vue`, `UpdateIntervalField.vue`, `AboutSettingsManager.vue`; `ConfirmationModal.vue`; `useAgentRuntimes.ts`, `AgentRuntimesManager.vue`; `utils/{ownNodeWindow,updateInterval,appUpdateErrorDisplay}.ts`; en strings.
  - Tests: names and setup of the new server, Electron and web tests; the request-budget test.
- Explicit exclusions: visual fidelity beyond IMP-12; Electron-only and own-node surfaces in a real shell (API/E2E's isolated instances); recorded checks were not rerun (they ran on the reviewed commits).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes — per-kind intervals with spreading; quota-free checks; back-off with a card banner; opt-in automatic updates per kind (packages, skill sources; runtimes on the desktop's own node) through the owners' own update methods, with a one-time confirmation for packages and skill sources; visible outcomes; the app's periodic check with its switch, interval and truthful status; no automatic app update.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: round 2, Pass (ARCH-REV-002). AR-001..AR-007, R-1..R-3 resolutions and notes R-6, R-7 are in the code.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `UpdateCheckScheduler` (60 s + random 0–60 s, then 60 s after each pass) → `UpdatePass.run` → per kind `dueSourceIds` (interval + per-process jitter ≤ min(interval/5, 5 min)) → owner check → `fetchDefaultBranchHead` (one `github.com` POST, `web` gate) | — |
| BEH-004 | Confirmed (CR-002 affects one runtime line of text) | `UpdatePass.applyAutomaticUpdates` → `listAutomationCandidates` → re-read closed / checks / switch / `web` gate before every candidate → `updateAgentPackage` / `updateGitHubSkillSource` / `runUpdate` → owner announce (reconcile queued) → `recordOutcome` (`applyOutcome`) | — |
| BEH-005 | Confirmed | `AutoUpdateSwitch` (panel and card, one component, confirmation for packages and skill sources) → `updateAutomationStore.setAutomatic` → `setAutomaticUpdates` → `UpdateAutomationSettingsService` → `update_settings_changed` → every window `refresh()` | — |
| BEH-006 | Confirmed (CR-001: the card shows a stale wait state) | `publicGitHubRequest` → `gate.learnFrom(family)` → persisted `{ api, web }` → `GitHubRateLimitError` → pass stops at `isBlocked("web")`; `updateAutomationSettings.githubWaitUntil` → card banner | Card reads `githubWaitUntil` through `ensureResolved()` only; see CR-001 |
| BEH-002, BEH-007 | Confirmed | `AppUpdater.startAutoCheck` → `AppUpdateCheckSchedule.start` (8 s launch check, then interval after last run; skip busy/offline) → `checkForUpdates('startup'|'periodic')`; `set-auto-check` IPC → `schedule.setSettings` → listener → `AppUpdateState.autoCheck`; quiet `periodic-check` errors; `checkedAt` set on result or failed check | — |
| BEH-008 | Confirmed (CR-002) | `buildServerProcessEnv` sets `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1` last → `isDesktopEmbeddedNode()` → composition gives the runtime service to the pass and the notification service; `checkInBackground` (versions only); `runUpdate` returns refusals; web `showsAgentRuntimeUpdates` (own window and node fact) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001..SCN-011 | BEH-001..BEH-008 | as in the requirements | as in the requirements | as in the requirements | as in the requirements | Normal / Explicit Edge (SCN-007, SCN-009) | DS-001..DS-008 | as in the requirements | requirements-doc, design-spec, ARCH-REV-002 | Supported (as classified upstream) | Use |
| RSC-001 | BEH-006; REQ-004, AC-004; UI spec "Card / GitHub wait: the node reports a wait → amber banner" (line 312), VIS-019 | System → User | The node's pass meets a GitHub limit; later the user opens the card | Learn why updates stopped and until when | GitHub answers 429/503 on the git endpoint (SCN-009) while a window of that node stays connected; the user opens Server Settings → Basics | Explicit Edge | `publicGitHubRequest` → `gate.learnFrom("web")` → owner records a quiet check failure → no broadcast → user opens the card → `automation.ensureResolved()` returns the settings read at connect time | Banner "GitHub asked this node to wait until HH:MM" | SCN-009 is a Supported Explicit Edge; AC-004 names the banner | Supported Explicit Edge Scenario | Use |
| RSC-002 | BEH-008; REQ-022, AC-020; REQ-010 (the switch says what it means) | User | User with runtime automatic updates on and agents of that runtime running | Stop automatic runtime updates after seeing the row wait | Panel: the "Update automatically" switch of the Agent runtime updates category, right above the waiting row; or the card | Normal | Pass records `AUTO_WAITING` → row shows "Update unavailable while N agents are running. It will be updated automatically once no agent is running." → user turns the switch off → `setAutomatic(false)`; the record keeps `outcome = AUTO_WAITING` (no rule clears it) → row still promises an automatic update | Row tells the truth about what will happen | Switch and row are on the same panel card (UI spec UIS-002, VIS-009/010); turning a switch off is a supported action (REQ-010, AC-010 alternate) | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The card's GitHub wait banner reflects the settings as read at feed connect or the last settings change; a wait learned later never appears until a reconnect, a rebind or another settings change | RSC-001 | GitHub's 429/503 on the git endpoint during a pass | `gate.learnFrom` persists the time but nothing tells the web; the owner's quiet failure changes no record, so not even `update_notifications_changed` goes out; `UpdateChecksCard` `onMounted` → `automation.ensureResolved()`, which returns at once when `status === 'resolved'` (`updateAutomationStore.ts:48-55`); `deliverUpdateNotificationChange` refreshes settings only on `connected` and `update_settings_changed` (`updateNotificationChangeFeed.ts:39-42`) | Code read; `UpdateChecksCard.spec.ts:104` sets `automation.resolved` directly, so the read path is not exercised; IMP-12 saw `githubWaitUntil: null` only | Promote → CR-001 | This ticket | Read the settings fresh when the card opens (see CR-001) |
| C-02 | A runtime row keeps "It will be updated automatically once no agent is running." after the user turns runtime automatic updates off | RSC-002 | User turns the switch off | `NotificationRow.vue` shows `runtime.blockedAuto` whenever `row.outcome === 'AUTO_WAITING'`; the record keeps that outcome until it is replaced or handled (`update-notification-records.ts`, DS-008); the pass no longer acts (`applyAutomaticUpdates` returns when `isAutomatic` is false) | Code read | Promote → CR-002 | This ticket | Show the sentence only while the kind's switch is on |
| C-03 | An automatic update attempted while offline or limited is announced as "automatic update failed" | DS-008, REQ-008/009 | Switch turned on while offline, or a retry after the interval | First failure unread (REQ-008 asks for it); repeats for the same revision stay read (`applyOutcome`), and the candidate waits one interval (REQ-009) | `update-notification-records.ts:84-100`, `update-notification-service.ts:105-116` | Reject | — | Matches the approved outcome rules; noise is bounded |
| C-04 | Two source-state types: `GitHubSourceUpdateState` (integrations/github, non-null `repositoryUrl`) and `UpdateSourceState` (update-notifications domain, nullable links) | Dependency rule "owners know only a listener"; Principle 11 | — | GitHub owners cannot import the notifications domain; their type is a structural specialization the service accepts | `github-source-update-state.ts`, `update-notification.ts:66-80` | Reject | — | Required by the dependency direction; no parallel meaning |
| C-05 | Interval range validated in the web, the server and the shell | Principle 11 (one derivation, others verify) | — | The server and the shell are each the authority for their own setting; the web field verifies for feedback; the server refuses with `UPDATE_CHECK_INTERVAL_OUT_OF_RANGE` | `domain/settings.ts`, `shared/appUpdateTypes.ts`, `utils/updateInterval.ts` | Reject | — | Verification at boundaries, not recomputation of a fact |
| C-06 | `checkedAt` no longer set on download events; a periodic check skipped while busy/offline counts as a run | DS-005, REQ-014/015 | — | Truthful "Last Checked"; no check while busy or offline | `appUpdater.ts`, `appUpdateCheckSchedule.ts:109-127` | Reject | — | Choices inside the design's room, recorded in the handoff |
| C-07 | The 209 server E2E suite imports removed constants and asserts replaced behavior | Ownership of durable E2E tests | — | `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` will not run until revised | Implementation handoff Known Risks | Reject as a finding | — | API/E2E owns that suite and is the next stage; carried as a residual for API/E2E |
| C-08 | The agent package installer's archive download is a plain `fetch` (not gated); skill archives are gated | Design "the update pipelines' own steps … left alone" | — | Unchanged from 209 | handoff Important Assumptions | Reject | — | Out of the Change Scope |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Pass split from the scheduler; IPC and helpers out of `appUpdater.ts` (499 → 467); Codex through the transport; record rules in the pure `update-notification-records.ts` | — |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Strings match (IMP-11); panel, switch, confirmation, card, Settings → Updates follow the spec; CR-001 (banner per UI spec line 312, VIS-019) and CR-002 (runtime waiting text) | CR-001, CR-002 |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-008 map to code in call order; one governing owner per spine | — |
| Ownership boundary preservation and clarity | Pass | Owners alone write source state and run updates; the pass calls public methods only; the service alone writes records; the schedule alone writes `app-update-checks.json` (R-6) | — |
| Off-spine concern clarity | Pass | Gate, jitter, store, hub, settings store, own-node helper each serve one owner | — |
| Existing capability/subsystem reuse check | Pass | Gate, feed, settings service, capability factory, `useAgentRuntimes`, `ConfirmationModal` reused | — |
| Reusable owned structures check | Pass | `UpdateSourceState`, `RuntimeUpdateResult`, one `AutoUpdateSwitch`, one `UpdateIntervalField` | — |
| Shared-structure/data-model tightness check | Pass | Facts-only projections; one `githubWaitUntil`; outcome fields singular (C-04 rejected) | — |
| Repeated coordination ownership check | Pass | One pass owns check/update order and gates; one `beginUpdate` for both runtime update forms | — |
| Empty indirection check | Pass | Resolver, IPC module and composition are transport/wiring | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | One concern per new file | — |
| Ownership-driven dependency check | Pass | `update-notifications` → owners; owners → listener only; `integrations/github` gains nothing new | — |
| Authoritative Boundary Rule check | Pass | The pass never calls `GitHubAgentPackageUpdates`, registries or processes; components never call GraphQL or `window.electronAPI` directly for notifications | — |
| File placement check | Pass | As the design's mapping | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Kind enum on every new mutation; explicit `RuntimeUpdateResult` | — |
| Naming quality and naming-to-responsibility alignment | Pass | `UpdatePass`, `AppUpdateCheckSchedule`, `fetchDefaultBranchHead`; revision field reuse documented (R-1) | — |
| No unjustified duplication of code / repeated structures | Pass | `CHECK_OPERATIONS` list repeated in `AboutSettingsManager.vue` and `appUpdater.ts` across the process boundary; small | — |
| Patch-on-patch complexity control | Pass | Initial round | — |
| Dead code removed in the touched files and modules | Pass | Removal plan items gone (`fetchRepositoryRevisionMetadata` only for import; old constants; Codex REST URL; anchor; startup-only quiet rule; updater's own timer and IPC body); searched | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Pass, outcomes, gate, request budget (100 sources), runtime automation, schedule, auto-check, card, switch tests; the card's banner test sets the store directly (CR-001 untested path) | Add a test with CR-001 |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `agent-runtime-status-fixtures.ts` extracted; new tests in new files | — |
| No stale, duplicated, or compatibility-only tests are retained | Pass (with residual) | Unit tests updated; the 209 E2E suite is left for API/E2E (C-07) | API/E2E revises it |
| API/E2E readiness for the next workflow stage | Pass | Embedded-node env, test feed, scripted runtimes and coverage hints in place | — |

## Source File Size And Structure Audit

| Source File | Effective Lines Before (base) | After (total) | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/updater/appUpdater.ts` | 434 | 410 (467) | Pass (shrunk by the named split) | Pass | Pass | Pass | — | None |
| `autobyteus-server-ts/src/runtime-management/agent-runtimes/agent-runtime-status-service.ts` | 296 | 385 (417) | Pass | Pass (+125/−29) | Pass | Pass | — | None |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | 359 | 369 (430) | Pass | Pass | Pass | Pass | — | None |
| `autobyteus-web/stores/updateNotificationsStore.ts` | 193 | 284 (308) | Pass | Pass (+128/−31) | Pass | Pass | — | None |
| `autobyteus-server-ts/src/update-notifications/services/update-pass.ts` | new | 163 (182) | Pass | Pass | Pass | Pass | — | None |
| `autobyteus-web/localization/messages/en/settings.ts` | — | 448 total | Pass (strings moved to `updateNotifications.ts`) | — | Pass | Pass | — | None |
| Other changed sources | — | ≤ 406 effective | Pass | Pass | Pass | Pass | — | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Tolerant readers only, as decided |
| No legacy old-behavior retention in changed scope | Pass | No REST fallback for checks |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Notification file directly usable; old gate file reads as not blocked; new keys/files need nothing |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None in the source. The 209 E2E suite (C-07) is for API/E2E's revision.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new cadence, transport, automatic updates, runtime category, app schedule.
- Files or areas likely affected: updated in the code commits (`update_notifications.md`, `agent_runtimes.md`, `agent_packages.md`, `skills.md`, `autobyteus-web/docs/settings.md`, `electron_packaging.md`). No change needed for CR-001/CR-002.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None changed. RSC-001 and RSC-002 are recorded in the scenario gate above.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.2
- Overall score (`/100`): 92
- Score calculation note: simple average; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Every spine is visible in call order with one owner (pass, schedule, settings service) | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | Single writers kept; the pass reaches owners only through their public methods; R-6 respected | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Kind enums; refusals as results; `followRedirects` explicit | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Pure record rules split from the service; IPC and helpers out of the updater | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Facts-only projections; documented field reuse for runtime versions (R-1) | Two source-state types by dependency necessity (C-04) | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Clear names and rule comments | — | — |
| `7` | `API/E2E Readiness` | 9.0 | Isolated-instance hooks ready | The 209 E2E suite needs API/E2E's revision (C-07) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.6 | Pass ordering, gates, outcome rules, runtime update path and the app schedule match the approved rules | CR-001: the card's GitHub wait banner is stale (REQ-004, AC-004); CR-002: a runtime row promises an automatic update after the switch is off (REQ-022, REQ-010) | Fix both (Findings) |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean cut to the head read; no dual path | — | — |
| `10` | `Cleanup Completeness` | 9.4 | Removal plan complete | — | — |

## Findings

### CR-001 — The Update checks card shows a stale GitHub wait (Local Fix, implementation)

- Basis: RSC-001 / C-01. REQ-004 ("the Update checks card says until when"), AC-004 ("the Update checks card shows 'GitHub asked this node to wait until HH:MM'"), UI spec line 312 / VIS-019.
- Evidence:
  - The node learns a wait in the transport (`publicGitHubRequest` → `gate.learnFrom`) and nothing announces it: the owner's quiet check failure keeps the known latest revision, so reconcile changes no record and publishes nothing.
  - The web reads `githubWaitUntil` only through `updateAutomationStore.refresh()`, called on the feed's `connected` and `update_settings_changed` (`updateNotificationChangeFeed.ts:39-42`). `UpdateChecksCard.vue` `onMounted` calls `automation.ensureResolved()`, which returns at once once resolved (`updateAutomationStore.ts:48-55`).
  - So in the usual case (the window has been connected since start; GitHub throttles a later pass) the card opens with the connect-time value and shows no banner. The unit test sets `automation.resolved` directly (`UpdateChecksCard.spec.ts:104`), and IMP-12 never had a wait.
- Required outcome: opening the card shows the node's current wait (for example, the card re-reads the settings when it mounts instead of relying on a resolved cache). Keep the client clock that clears the banner when the wait ends. Add a test where the store was resolved without a wait and the node reports one when the card opens. A live banner while the card stays open is not required by the spec.
- Classification: `Local Fix`, implementation (the design's DS-006 ends at "`updateAutomationSettings.waitUntil` → card banner"; how the card reads it is implementation).

### CR-002 — A runtime row promises an automatic update after the switch is off (Local Fix, implementation)

- Basis: RSC-002 / C-02. REQ-022 / AC-020 (automatic runtime updates only with the switch on), REQ-010 (the switch says what it means); UI spec line 108 ("the row says it waits" under runtime automatic updates).
- Evidence: `NotificationRow.vue` appends `runtime.blockedAuto` ("It will be updated automatically once no agent is running.") whenever `row.outcome === 'AUTO_WAITING'`. The record keeps `AUTO_WAITING` until it is replaced or handled (DS-008; `update-notification-records.ts`), while `UpdatePass.applyAutomaticUpdates` stops acting as soon as `isAutomatic(kind)` is false. After the user turns the runtime switch off (on the same panel card), the row still promises an automatic update that will not happen.
- Required outcome: show the sentence only while the agent-runtime automatic switch is on (the store already reads `automation.resolved`); add a component test for switch off with an `AUTO_WAITING` row.
- Classification: `Local Fix`, implementation.

## Follow-ups

- Follow-ups this review added: None.

## Classification

- `Local Fix` (CR-001, CR-002), owned by implementation.

## Recommended Recipient

- Implementation engineer, `/software_engineering_team/implementation_engineer` (rule: source review identifies an implementation-owned Local Fix that must be corrected before executable coverage).

Routing note: after the fixes, a Targeted Delta Review of CR-001 and CR-002, then API/E2E.

## Residual Risks

- The 209 server E2E suite (`tests/e2e/update-notifications/update-notifications-live.e2e.test.ts`) imports removed constants and asserts replaced behavior (REST requests, 6-hour cadence, `{ blockedUntil }`); API/E2E must revise it (C-07).
- Not exercised by implementation (API/E2E's isolated instances): the app's periodic check against a test feed, `net.isOnline()` in a packaged build (a design escalation trigger), the runtime category on a real desktop's own node, real GitHub throttling of the git endpoint.
- Design-spec line 6 still names SR-004 (R-5, Solution Designer's document).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.2/10 (92/100); Runtime Correctness 8.6 (CR-001, CR-002); all other categories ≥ 9.0
- Failure Origin (when applicable): N/A
- Recommended Recipient (when applicable): `/software_engineering_team/implementation_engineer`
- Notes: two bounded web Local Fixes. The server pass, gate families, head read, outcome rules, runtime update path and the shell schedule match the approved requirements and the SR-005 design.
