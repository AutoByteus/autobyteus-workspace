# Design Review Report — update-checks-and-auto-updates

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/requirements-doc.md` (SR-005, Approved)
- Upstream Investigation Notes: `.../investigation-notes.md` (AF-01..AF-16, probes)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-005)
- Reviewed Design Spec: `.../design-spec.md` (SR-005, Ready, revised), worktree commit `3a0ea2238e`; round 1 reviewed SR-004 at `1b338eabe9`
- Supplemental Task Artifacts Reviewed:
  - Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` (Approved, `5f5fb4c`; journeys UXJ-001..012, TR-101..120, Data/Mock Boundaries, Open Decisions);
  - `handoff-architecture-review.md`.
- Relevant Solution Revision IDs: SR-005 (revision for AR-001..AR-007, DEC-020 restated, AC-022), SR-004 (design and UI), SR-001..SR-003
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-005 revision for the recheck of ARCH-REV-001 (handoff section "Round 2 (SR-005)"; design spec "SR-005 Revision Notes"), 2026-10-23
- Prior Review Round Reviewed: round 1 (ARCH-REV-001, Fail, Design Impact; AR-001..AR-007)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: code read at `origin/personal` `d2820672c3` in the worktree, plus three read-only probes run by the reviewer on 2026-10-23:
  - server:
    - `update-check-scheduler.ts`;
    - `update-notification-service.ts`, `update-notification-store.ts`, `domain/update-notification.ts`;
    - `update-notifications-composition.ts`, `build-studio-server.ts`, `agent-runtime-status-composition.ts`;
    - `agent-runtime-status-service.ts`, `agent-runtime-types.ts`, `codex-agent-runtime-strategy.ts`, `runtime-source-fetch.ts`;
    - `public-github-request.ts`, `github-rate-limit-gate.ts`, `github-repository-source.ts`;
    - `docs/design/data_migration_guideline.md`;
  - shell: `appUpdater.ts` (499 lines), `electronApplication.ts`, `appUpdateErrorDisplay.ts`;
  - web: `windowNodeContextStore.ts`, `AgentRuntimesManager.vue`, `useAgentRuntimes.ts`;
  - probes:
    - v2 `ls-refs` on `AutoByteus/autobyteus-agents`: 200, 84 bytes, `<sha> HEAD symref-target:refs/heads/main`;
    - a missing repository: 401;
    - `github.com/openai/codex/releases/latest`: 302 to `/releases/tag/rust-v0.164.0`;
    - codeload archive for the renamed `zeit/next.js`: 200.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three runtimes; a new GitHub protocol endpoint; automatic replacement of agent content; concurrency between the pass, user actions and vendor processes; new persisted settings and record fields; new GraphQL, feed and IPC contracts. Confirmed.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements / intended behavior understood: Yes.
  - Per-category intervals with jitter, through quota-free checks.
  - Back-off persisted per family.
  - Opt-in automatic updates per kind (packages and skill sources after a one-time confirmation; runtimes on the desktop's own node, never while their agents run).
  - Visible outcomes, one notice per revision.
  - The app's periodic check and its switch, with truthful status.
  - The app is never updated automatically.
- Relevant existing behavior and evidence confirmed:
  - AF-01 scheduler, AF-03/AF-04 records and store, AF-10 runtime service semantics, AF-12 `appUpdater.ts` 499 lines and startup check, AF-13 quiet startup errors, AF-14 own-node rule: all confirmed at the cited lines.
  - AF-08 and AF-09 confirmed by the reviewer's own probes.
- Scope guardrail confirmed: Yes (UC-001..UC-006; Out of Scope; Preserved Behavior Boundary; Review Authority).
- Approved change, preserved behavior and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding traceable to an approved ID: `Yes` (see Findings).
- Remaining material ambiguity: None. DEC-020 and AC-022 were restated at SR-005 (Solution Designer within REQ-020, user informed). The restatement matches the UI spec's Open Decisions note that a browser window of a server node gets no runtime category.
- Statements about existing code the design relies on, opened at their cited lines:
  - Correct: AF-01 (`update-check-scheduler.ts:3-6, 51-80`), AF-03 (`update-notification-service.ts:63-74, 142-185`), AF-04 (`update-notification-store.ts:13-32`), AF-10 (`agent-runtime-status-service.ts:133-176, 221-265`), AF-12 (`appUpdater.ts` 499 lines; IPC registration `:423-435`), AF-13 (`appUpdateErrorDisplay.ts:38-42`), AF-14 (`AgentRuntimesManager.vue:99-100`).
  - Round 1 corrections, now in the design: the composition order (`build-studio-server.ts:288` vs `:350`, AR-006) and the refusals in `startUpdate` (`agent-runtime-status-service.ts:145-150, 286-295`, AR-001).
  - SR-005's new citations, checked: `serverRuntimeEnv.ts:109-133` (`buildServerProcessEnv`, called from `baseServerManager.ts:342`), where no embedded-node variable exists today (AF-17); and `appUpdater.ts:37-71`, which holds the four module helpers named for the move.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002, BEH-007 | System/User | Pass | Pass | Pass (DS-005: launch, timer and settings; one owner) | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (per-candidate re-reads; DS-008 rows) | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass (probes) | Pass | Confirmed | — |
| BEH-008 | System/User | Pass | Pass | Pass (`runUpdate` owns its refusals; runtime kind only on the desktop's embedded node, traced for three node kinds) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| UI/UX spec + VIS-001..037 (`5f5fb4c`) | Pass | Pass | Pass | Pass (TR-107 honoured by per-candidate re-reads; VIS-035..037 and the Open Decisions note match the restated DEC-020) | Pass | — |

Both supplement tables now list the approved 210 UI/UX spec (SR-005).

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature plus a cadence/transport behavior change | — |
| Root-cause classification is explicit and evidence-backed | Pass | Scheduler responsibility drift (AF-01) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Pass split, IPC move, Codex source through the transport | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership Map, Removal Plan, File Mapping. `appUpdater.ts` sheds the IPC block (`:423-435`) and the helpers (`:37-71`), about 47 lines, with a ≤ 470 target. | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 checks | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 automatic update | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 runtime Update from the panel | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 settings | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 app periodic check | Primary | Pass | Pass | Pass | Pass | Pass (one owner, `AppUpdateCheckSchedule`; R-6 on wording) | Pass | Pass |
| DS-006 back-off | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 timer | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 records and outcomes | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-002 and DS-005 redrawn in call order from the SR-005 text:

```text
UpdatePass (per kind; the runtime kind only when isDesktopEmbeddedNode())
  → notifications.listAutomationCandidates(kind)
  → for each candidate:
      closed? · isChecksEnabled() · isAutomatic(kind) · gate.isBlocked(web) [GitHub kinds]   re-read each time
      → owner update method (runtimes: runUpdate → beginUpdate refusals → vendor process)
      → owner announces → reconcile (handled; stale outcome cleared)
      → map result: updated → AUTO_UPDATED{candidateFrom} | AGENTS_RUNNING → AUTO_WAITING
                    | BUSY / NOT_INSTALLED → nothing | failed / thrown → AUTO_FAILED{candidateLatest}
      → recordOutcome → applied | not_applied

electronApplication → AppUpdater.startAutoCheck() → AppUpdateCheckSchedule.start()   (launch; 8 s if enabled)
AppUpdateCheckSchedule timer → enabled · !AppUpdater.isBusy() · net.isOnline()
  → AppUpdater.checkForUpdates('startup' | 'periodic') → re-arm
renderer → IPC set-auto-check → AppUpdateCheckSchedule.setSettings (validate, write, re-arm)
  → change notification → AppUpdater.applyState({ autoCheck })
```

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRuntimeStatusService` | Pass | Pass | Pass | Pass | Refusals in the shared private `beginUpdate` (AR-001 resolved) |
| `AgentPackageService` / `SkillSourceService` | Pass | Pass | Pass | Pass | Pass calls the public update methods |
| `UpdateNotificationService` | Pass | Pass | Pass | Pass | Outcomes only through `recordOutcome` |
| `publicGitHubRequest` / gate | Pass | Pass | Pass | Pass | See R-3 on the tag read's redirect |
| `AppUpdater` / `AppUpdateCheckSchedule` | Pass | Pass | Pass | Pass | The schedule is the only writer of its settings file (AR-004 resolved) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `update-notifications` → owners, transport, settings | Pass | Pass | Pass | Pass | Owners know a `() => void` listener only |
| Codex strategy → `integrations/github` | Pass | Pass | Pass | Pass | — |
| Shell schedule ↔ `AppUpdater` | Pass | Pass | Pass | Pass | Schedule → `checkForUpdates`, `isBusy`; `AppUpdater` → `schedule.start()`, `settings()`; changes come back as a notification (R-6) |
| Web components → stores | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `fetchDefaultBranchHead(owner, repo)` | Pass | Pass | Pass | Low | Pass (probe-confirmed) |
| `fetchLatestReleaseTag(owner, repo)` | Pass | Pass | Pass | Low | Pass (R-3) |
| `AgentRuntimeStatusService.runUpdate(kind)` → `RuntimeUpdateResult` | Pass | Pass | Pass | Low | Pass |
| `checkInBackground(kind)` | Pass | Pass | Pass | Low | Pass (versions only) |
| `listAutomationCandidates(kind)`, `recordOutcome(kind, id, outcome)` → applied / `not_applied` | Pass | Pass | Pass | Low | Pass |
| GraphQL settings query / `setUpdateCheckInterval` / `setAutomaticUpdates` | Pass | Pass | Pass | Low | Pass |
| IPC `app-update:set-auto-check` → `AppUpdateCheckSchedule.setSettings` | Pass | Pass | Pass | Low | Pass |
| `isDesktopEmbeddedNode()`; GraphQL `desktopEmbeddedNode` | Pass | Pass | N/A | Low | Pass |
| `publicGitHubRequest(url, { method, body, followRedirects })` | Pass | Pass | Pass | Low | Pass (R-3 resolved; `location` validated) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Update execution | Pass | Pass | N/A | Pass | Owners' own update methods (runtime: AR-001) |
| Gate, feed, settings, capability factory, `useAgentRuntimes`, `ConfirmationModal` | Pass | Pass | N/A | Pass | — |
| Head read | Pass | Pass | Pass | Pass | Measured quota-free and constant size |
| App preferences | Pass | Pass | Pass | Pass | Channel-store pattern |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `update-notifications` (pass, settings, records) | Pass | Pass | Pass | Pass | — |
| `integrations/github` | Pass | Pass | Pass | Pass | — |
| `runtime-management/agent-runtimes` | Pass | Pass | Pass | Pass | — |
| `config/desktop-embedded-node.ts` + shell `serverRuntimeEnv.ts` | Pass | Pass | Pass | Pass | One node fact, set by its one writer |
| `electron/updater` | Pass | Pass | Pass | Pass | — |
| Web | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `UpdateSourceState` | Pass | Pass | Pass | Pass | — |
| `RuntimeUpdateState` | Pass | Pass | Pass | Pass | Explicit `checked` flag (no behavior by absence) |
| Own-node rule (`utils/ownNodeWindow.ts`) | Pass | Pass | Pass | Pass | One rule for page, panel and card |
| Runtime update refusals | Pass | N/A | Pass | Pass | One private `beginUpdate` |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Record + outcome fields | Pass | Pass | Pass | N/A | Pass | Transition rules: AR-003 |
| `*Revision` fields carrying runtime versions | Pass, with a recorded reading | Pass | Pass | N/A | Pass | R-1 recorded in the design's Conflicts line |
| `githubWaitUntil` | Pass | Pass | Pass | N/A | Pass | One field, the later family time |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Records, gate, transport, runtime `startUpdate`, `AppUpdateState`, the quiet rule, `ConfirmationModal` and the own-node rule are each listed with a decision.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server files | Pass | Pass | Pass | Pass | — |
| `appUpdater.ts`, `appUpdateCheckSchedule.ts`, `appUpdateCheckSettingsStore.ts`, `appUpdateIpc.ts`, `appUpdateStateFormat.ts`; `electronApplication.ts` (unchanged); `serverRuntimeEnv.ts` | Pass | Pass | N/A | Pass | — |
| Web files | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All named paths | Pass | Pass | Low | Pass | `git-ls-refs.ts` beside its only caller |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| REST metadata in check/update; interval constants; Codex API URL; left anchor; startup-only quiet rule; IPC block; single-time gate | Pass | Pass | Pass | Pass | — |
| `startAutoCheck`'s own 8 s timer (`appUpdater.ts:149-160`) | Pass | Pass | Pass | Pass | Replaced by the schedule; callers keep calling `startAutoCheck()` |
| Running-agents check copied into the pass | Pass | Pass | Pass | Pass | Not introduced (AR-001) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Check transport | No | Pass | Pass | Head read is the one check path |
| Gate file | No | Pass | Pass | Old shape reads as not blocked |
| Stored field names | No | Pass | Pass | R-1 |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `notifications.json` (+ outcome fields, + `AGENT_RUNTIME`) | Directly Usable | Pass (`update-notification-store.ts:13-32`) | Pass | N/A | Pass | Absent outcome = `null` is truthful |
| `github/rate-limit.json` → `{ api, web }` | Discard or Rebuild | Pass | Pass | N/A | Pass | Costs at most one refused request after the upgrade restart. Recommendation: keep `blockedUntil` as the `api` field name and add `webBlockedUntil`; that needs no old-shape code and loses nothing. |
| App config keys (six) | New, absent = default | Pass | Pass | N/A | Pass | — |
| `app-update-checks.json` | New | Pass | Pass | N/A | Pass | Only writer: `AppUpdateCheckSchedule` |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server | Pass | Pass | Pass | Pass |
| Shell | Pass | Pass | Pass | Pass |
| Web | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Package automatic update, head-read body, switching on | Yes | Pass | Pass | Pass | — |
| "Runtime update awaited" | Yes | Pass | Pass | Pass | `beginUpdate` shared by both paths |
| Serialized/automation outcome and node kinds | Yes | Pass | N/A | Pass | DS-008 rows; SR-005 Revision Notes node-kind trace |

## Material Premise Validation

### `MP-001` — An automatic runtime update starts while that runtime already runs a vendor process

- Related approved requirement or established contract: REQ-021 ("the same vendor update as Settings → Agent Runtimes … with the same rule"); REQ-022; BEH-008 preserved (vendor commands; at most one running vendor process per runtime, `agent-runtime-status-service.ts:67-71, 291-293`).
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `User` + `System`.
- Independent trigger:
  - the user presses Sign in (Codex, Grok) or Update on Settings → Agent Runtimes or in the panel;
  - the runtime automatic switch is on and a runtime record is waiting (REQ-022);
  - the pass ticks every 60 s (DS-007).
- Forward path:
  1. The user's `startSignIn` or `startUpdate` sets `row.process` and `row.operation` running.
  2. Within 60 s the pass finds the waiting runtime record as a candidate and checks `runningAgents(kind)` (0).
  3. It calls `runUpdate(kind)`, which per the design carries no BUSY refusal.
  4. A second vendor process starts and replaces `row.process`.
- Consequence: two vendor processes on one runtime (for example `codex update` during `codex login`). The first one's result is dropped (`row.process !== process`, `:160`). This breaks the service's own invariant.
- Reachability: `Reachable`.
- Review consequence: AR-001. Resolved in SR-005: `runUpdate` applies the BUSY, NOT_INSTALLED and AGENTS_RUNNING refusals through the shared `beginUpdate`, so a second vendor process cannot start.

### `MP-002` — The user turns an automatic switch off while the pass is applying updates of that kind

- Related approved requirement or established contract: REQ-005; UXJ-003 / TR-107 ("Turning off applies at once and cancels the pending application"); REQ-017 (Update checks off stops automatic updates).
- Relevant behavior ID(s): BEH-004, BEH-005.
- Initiating basis kind: `User`.
- Independent trigger: the user turns packages on in the panel, sees "N waiting updates will be installed within about a minute" (UXJ-003), and turns it off again.
- Forward path:
  1. The pass reads `isAutomatic(AGENT_PACKAGE)` once (DS-002) and lists N candidates.
  2. It updates them one by one; each package update stages, validates, reloads and commits, which takes seconds.
  3. The user's switch-off is stored, but the pass does not read it again.
- Consequence: the remaining packages are replaced, with local changes lost irreversibly (REQ-007), after the user turned automatic updates off.
- Reachability: `Reachable`.
- Review consequence: AR-002. Resolved in SR-005: the switch, the checks setting, the gate and `closed` are re-read before every candidate.

### `MP-003` — A manual Update after an automatic failure

- Related approved requirement or established contract: UXJ-006 ("Retry by hand": red box, Update); REQ-008, REQ-009, AC-009.
- Relevant behavior ID(s): BEH-004.
- Initiating basis kind: `User`.
- Independent trigger: after an `AUTO_FAILED` outcome, the user presses Update on that row (the approved journey).
- Forward path:
  1. The manual update succeeds, and the owner announces.
  2. `reconcileRecords` marks the record handled with `{ ...record, handledRevision, handledAt }` (`update-notification-service.ts:176`), so `outcome = AUTO_FAILED` and its reason stay.
- Consequence: a handled row carries a failure outcome. DS-008 does not say what the row, the counts (unread outcomes) or `markAllRead` do with it. The same applies to a runtime's `AUTO_WAITING` that ends through a manual update.
- Reachability: `Reachable`.
- Review consequence: AR-003. Resolved in SR-005: the handled transition clears outcomes, and `recordOutcome` returns an explicit `not_applied`.

### `MP-004` — A Docker or remote node with installed runtimes, viewed from a desktop window

- Related approved requirement or established contract:
  - REQ-020 ("The desktop's own node checks its installed agent runtimes");
  - Out of Scope ("Runtime notifications, Update or automatic update on remote or Docker nodes");
  - REQ-016 / AC-016 (every network call described honestly);
  - AC-022 / VIS-037 (no runtime contact line in a window of another node);
  - DEC-020 (a browser window served by a node is "own").
- Relevant behavior ID(s): BEH-008, BEH-006.
- Initiating basis kind: `System`.
- Independent trigger: the user's own setup of a desktop app plus three Docker nodes (requirements Problem section). Update checks are on by default; runtimes are installed in the node's image.
- Forward path:
  1. Each node runs the same `UpdatePass` with the runtime kind; the server has no "desktop's own node" fact (none found in `autobyteus-server-ts/src`; the rule exists only in the web, `windowNodeContextStore.ts:55`).
  2. Each Docker node checks its runtimes every 60 minutes: Claude, Antigravity and Grok vendor sources, and Codex on github.com. `check()` also reads sign-in, which for Codex acquires the app-server.
  3. A desktop window bound to that node shows the card without the runtime interval, switch or contact line.
- Consequence: the node makes runtime network calls that its card, as seen from that window, does not describe (REQ-016). REQ-020 and Out of Scope say only the desktop's own node checks runtimes; the design does not say what other nodes do. Through a browser window of that node (DEC-020: "own"), its runtime switch can be turned on, and the node then updates runtimes automatically, which Out of Scope excludes.
- Reachability: `Reachable`.
- Review consequence: AR-005. Resolved in SR-005 with option (a): `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1` is set by the shell; the runtime kind runs only there; the web shows runtime parts only for that node in its own window. DEC-020 and AC-022 are restated so that REQ-020, the Out of Scope line and AC-022 hold on all three node kinds.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Supplement tables (round 1) | Cross-artifact consistency | Updated in SR-005 | Resolved |
| Runtime category per node kind (MP-004) | — | AR-005 resolved | Resolved |
| `design-spec.md` line 6 still names "`requirements-doc.md` at SR-004"; the requirements are at SR-005 | Stale reference only; SR-005 changed DEC-020 and AC-022 | Correct it at the next edit | Open (non-blocking) |

## Review Decision

`Pass`. The behavior basis is confirmed. AR-001..AR-007 and the round 1 residual notes R-1..R-3 are resolved in the SR-005 design spec, requirements doc and investigation notes. I verified this against the canonical text at `3a0ea2238e` and the newly cited code (`serverRuntimeEnv.ts:109-133`, `appUpdater.ts:37-71`), not only the revision notes. Every structural verdict passes, and no in-scope machinery depends on an unsupported premise.

## Findings

None open. See the prior-finding table in `architecture-review-revision-record.md`, ARCH-REV-002.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`), per the pass rule.

## Residual Risks

- R-1..R-3 (round 1): resolved in SR-005. R-1 is recorded as a reading in the design's Conflicts line; R-2: the runtime kind is not gated by GitHub's `web` gate; R-3: `followRedirects: false` with `location` validation.
- R-4: the design records these risks: GitHub's undocumented throttling of anonymous git traffic; automatic replacement as a supply-chain path (opt-in, confirmed); `net.isOnline()` accuracy.
- R-5: `design-spec.md` line 6 still says the requirements baseline is SR-004. Correct it at the next edit; it does not change the design.
- R-6 (implementation note): DS-005 says "`AppUpdater` never calls the schedule", but `AppUpdater.startAutoCheck()` starts it and `AppUpdater` reads `schedule.settings()`. The intended rule is clear: the schedule alone decides when to check and writes its settings, and `AppUpdater` only starts it, reads it, and receives its change notification. Keep it that way; `AppUpdater` must not re-arm or write settings.
- R-7 (implementation note): `buildServerProcessEnv` spreads the caller's environment under the `inherit-caller` policy. Set `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE` after `inherited` (and after `runtimeOverrides`, or keep it out of them), so the shell's value always wins.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002, SR-005)
- Material-Premise Gate: `Pass` (MP-001..MP-004 Reachable; the SR-005 design addresses each)
- Notes: task_size `Large`, architectural_risk `High` confirmed. Next: implementation.
