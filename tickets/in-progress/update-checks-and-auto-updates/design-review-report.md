# Design Review Report — update-checks-and-auto-updates

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/requirements-doc.md` (SR-004, Approved)
- Upstream Investigation Notes: `.../investigation-notes.md` (AF-01..AF-16, probes)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-004)
- Reviewed Design Spec: `.../design-spec.md` (SR-004, Ready), worktree commit `1b338eabe9`
- Supplemental Task Artifacts Reviewed:
  - Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` (Approved, `5f5fb4c`; journeys UXJ-001..012, TR-101..120, Data/Mock Boundaries, Open Decisions);
  - `handoff-architecture-review.md`.
- Relevant Solution Revision IDs: SR-004 (design), SR-001..SR-003 (requirements basis)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Architecture Design Complete (Large / High), 2026-10-23
- Prior Review Round Reviewed: N/A (first review)
- Latest Authoritative Round: 1
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

- Overall Basis Status: `Confirmed` for the approved intent. The design's target paths need correction (rows below).
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
- Remaining material ambiguity: AR-005, the node kinds for the runtime category.
- Statements about existing code the design relies on, opened at their cited lines:
  - Correct: AF-01 (`update-check-scheduler.ts:3-6, 51-80`), AF-03 (`update-notification-service.ts:63-74, 142-185`), AF-04 (`update-notification-store.ts:13-32`), AF-10 (`agent-runtime-status-service.ts:133-176, 221-265`), AF-12 (`appUpdater.ts` 499 lines; IPC registration `:423-435`), AF-13 (`appUpdateErrorDisplay.ts:38-42`), AF-14 (`AgentRuntimesManager.vue:99-100`).
  - Not accurate as written: "build-studio-server: pass the runtime service handle to the composition" (AR-006). The handle exposes only `close()`, and update notifications are composed before the runtime service exists (`build-studio-server.ts:288` vs `:350`).
  - Missing from the design: today's runtime update refusals live in `startUpdate` (`agent-runtime-status-service.ts:145-150, 286-295`), so the automatic path that calls `runUpdate` directly would skip them (AR-001).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002, BEH-007 | System/User | Pass | Pass | Fail: launch and set-auto-check entry forms not drawn; `startAutoCheck` disposition missing | Needs Correction | AR-004 |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Fail: no per-candidate re-check of switch/checks/gate; outcome transitions incomplete | Needs Correction | AR-002, AR-003 |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass (probes) | Pass | Confirmed | — |
| BEH-008 | System/User | Pass | Pass | Fail: automatic `runUpdate` skips the service's refusals; node kinds not traced | Needs Correction | AR-001, AR-005 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| UI/UX spec + VIS-001..037 (`5f5fb4c`) | Pass | Pass | Pass | Fail on two points. TR-107 / UXJ-003: turning off "cancels the pending application", but the design does not re-check per candidate (AR-002). VIS-037 / AC-022: a remote window hides the runtime contact line while the design checks runtimes on every node (AR-005). | Pass | AR-002, AR-005 |

Note: the investigation notes' Supplemental Artifact Inventory lists only the 209 artifacts. It should also list the approved 210 UI/UX spec, which the requirements and design link as Approved. The requirements doc's Supplemental Artifacts table still says the Product request is "To be written after approval". Update both with the revision.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature plus a cadence/transport behavior change | — |
| Root-cause classification is explicit and evidence-backed | Pass | Scheduler responsibility drift (AF-01) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Pass split, IPC move, Codex source through the transport | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership Map, Removal Plan, File Mapping. The `appUpdater.ts` budget also depends on AR-004: moving the 12-line IPC block alone does not leave room for the additions. | AR-004 |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 checks | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 automatic update | Primary | Pass | Pass | Pass | Pass | Fail: the running-agents rule is applied by the pass and by the service; the service's BUSY/NOT_INSTALLED refusals are skipped. The switch, checks and gate are read once per kind, not before each candidate. | Pass | Fail (AR-001, AR-002) |
| DS-003 runtime Update from the panel | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 settings | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 app periodic check | Primary | Pass | Partial | Fail | Pass | Fail: the launch entry (`electronApplication.ts:396, 401` → `startAutoCheck`) and the set-auto-check IPC entry are not drawn. `AppUpdater` ↔ `AppUpdateCheckSchedule` calls go both ways, and the writer of `app-update-checks.json` is not named. | Pass | Fail (AR-004) |
| DS-006 back-off | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 timer | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 records and outcomes | Bounded local | Pass | Pass | N/A | Pass | Fail: transitions incomplete | Pass | Fail (AR-003) |

DS-002 redrawn in call order, as the design states it. The ✗ marks the gaps:

```text
UpdatePass (per kind)
  → settings.isAutomatic(kind), gate.isBlocked(web)        once per kind  ✗ not per candidate (AR-002)
  → notifications.listAutomationCandidates(kind)
  → for each candidate:
      [runtime] runtimes.runningAgents(kind) > 0 → recordOutcome(AUTO_WAITING)  ✗ rule copy (AR-001)
      owner.update(id)   [runtime: runUpdate, which skips the BUSY/NOT_INSTALLED refusals]  ✗ (AR-001)
      → owner announces → reconcile
      → notifications.recordOutcome(AUTO_UPDATED | AUTO_FAILED)  ✗ undefined cases (AR-003)
```

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRuntimeStatusService` | Fail | Fail | Fail | Fail | `runUpdate` is public but carries no refusals; the pass re-implements one (AR-001) |
| `AgentPackageService` / `SkillSourceService` | Pass | Pass | Pass | Pass | Pass calls the public update methods |
| `UpdateNotificationService` | Pass | Pass | Pass | Pass | Outcomes only through `recordOutcome` |
| `publicGitHubRequest` / gate | Pass | Pass | Pass | Pass | See R-3 on the tag read's redirect |
| `AppUpdater` / `AppUpdateCheckSchedule` | Fail | Pass | Fail | Fail | AR-004 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `update-notifications` → owners, transport, settings | Pass | Pass | Pass | Pass | Owners know a `() => void` listener only |
| Codex strategy → `integrations/github` | Pass | Pass | Pass | Pass | — |
| Shell schedule ↔ `AppUpdater` | Fail | Fail | Fail | Fail | Two-way calls (AR-004) |
| Web components → stores | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `fetchDefaultBranchHead(owner, repo)` | Pass | Pass | Pass | Low | Pass (probe-confirmed) |
| `fetchLatestReleaseTag(owner, repo)` | Pass | Pass | Pass | Low | Pass (R-3) |
| `AgentRuntimeStatusService.runUpdate(kind)` | Pass | Fail | Pass | Medium | Fail (AR-001) |
| `checkInBackground(kind)` | Pass | Pass | Pass | Low | Pass (AR-007 non-blocking) |
| `listAutomationCandidates(kind)`, `recordOutcome(kind, id, outcome)` | Pass | Pass | Pass | Low | Fail on the outcome rules (AR-003) |
| GraphQL settings query / `setUpdateCheckInterval` / `setAutomaticUpdates` | Pass | Pass | Pass | Low | Pass |
| IPC `app-update:set-auto-check` | Pass | Pass | Pass | Low | Fail on the receiver (AR-004) |

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
| `runtime-management/agent-runtimes` | Fail | Pass | Fail | Fail | Refusal rule held by two owners (AR-001); node kinds not traced (AR-005) |
| `electron/updater` | Fail | Pass | Fail | Fail | AR-004 |
| Web | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `UpdateSourceState` | Pass | Pass | Pass | Pass | — |
| `RuntimeUpdateState` | Pass | Pass | Pass | Pass | Explicit `checked` flag (no behavior by absence) |
| Own-node rule (`utils/ownNodeWindow.ts`) | Pass | Pass | Pass | Pass | One rule for page, panel and card |
| Runtime update refusals | Fail | N/A | Fail | Fail | AR-001 |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Record + outcome fields | Pass | Pass | Pass | N/A | Pass | Transition rules: AR-003 |
| `*Revision` fields carrying runtime versions | Pass, with a recorded reading | Pass | Pass | N/A | Pass | R-1 (guideline line 105) |
| `githubWaitUntil` | Pass | Pass | Pass | N/A | Pass | One field, the later family time |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Records, gate, transport, runtime `startUpdate`, `AppUpdateState`, the quiet rule, `ConfirmationModal` and the own-node rule are each listed with a decision.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server files | Pass | Pass | Pass | Pass | — |
| `appUpdater.ts`, `appUpdateCheckSchedule.ts`, `appUpdateCheckSettingsStore.ts`, `appUpdateIpc.ts` | Fail | Fail | N/A | Fail | AR-004. Also, `electronApplication.ts` is missing from the mapping although its two `startAutoCheck` calls change. |
| Web files | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All named paths | Pass | Pass | Low | Pass | `git-ls-refs.ts` beside its only caller |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| REST metadata in check/update; interval constants; Codex API URL; left anchor; startup-only quiet rule; IPC block; single-time gate | Pass | Pass | Pass | Pass | — |
| `startAutoCheck` (`appUpdater.ts:149-160`, `AppUpdateController`, `DisabledAppUpdater`, `electronApplication.ts:396, 401`) | Fail | Fail | Fail | Fail | AR-004 |
| Running-agents check copied into the pass | Fail | Fail | Fail | Fail | AR-001 |

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
| `app-update-checks.json` | New | Pass | Pass | N/A | Pass | Writer owner: AR-004 |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server | Pass | Pass | Pass | Pass (AR-006: composition order) |
| Shell | Fail | Fail | Fail | Fail (AR-004) |
| Web | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Package automatic update, head-read body, switching on | Yes | Pass | Pass | Pass | — |
| "Runtime update awaited" | Yes | Fail | Pass | Fail | The shown `startUpdate { refusals(); void runUpdate }` puts the refusals outside the one path (AR-001) |
| Shell launch and settings change | Yes | Fail | N/A | Fail | AR-004 |

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
- Review consequence: AR-001.

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
- Review consequence: AR-002.

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
- Review consequence: AR-003.

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
- Review consequence: AR-005.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Investigation notes' supplement inventory lacks the 210 UI/UX spec; the requirements doc's Supplemental Artifacts row is stale | Cross-artifact consistency | Update with the revision | Open (non-blocking) |
| Runtime category per node kind (MP-004) | Requirements and design disagree on which nodes check and update runtimes | AR-005 | Open |

## Review Decision

`Fail`. The core choices are sound and checked against the code and real GitHub:
- the quota-free head read;
- the Codex redirect;
- two gate families;
- `UpdatePass` as the one sequence owner calling each owner's own update method;
- additive persistence;
- the derived-consumer table.

Five gaps need design work before implementation. Four are in the automatic-update and app-check sequences (AR-001..AR-004), and one is the node kinds for runtimes (AR-005). Each is bounded.

## Findings

### AR-001 — The automatic runtime update skips the service's refusals; the running-agents rule has two owners (Design Impact, Major, blocking)

- Protects: REQ-021, REQ-022, BEH-008 preserved behavior (vendor commands; one vendor process per runtime; the running-agent rule).
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence:
  - Today `startUpdate` holds every refusal: `requireIdleInstalledRow` gives NOT_INSTALLED and BUSY ("already updating or signing in"), and the running-agents check gives AGENTS_RUNNING (`agent-runtime-status-service.ts:145-150, 286-295`).
  - The design makes `startUpdate = refusals + void runUpdate`, and the pass calls `runUpdate` directly after its own `runningAgents(kind) > 0` check (DS-002; Ownership Map; example "Runtime update awaited").
  - The Manual Vs Automatic Gates table omits BUSY and NOT_INSTALLED.
- Material premise: MP-001 (Reachable).
- Required update: put the refusals inside the one update path, and let the pass drive the order, reacting to an explicit result.
  - `AgentRuntimeStatusService.runUpdate(kind)` applies the refusals first, synchronously, then runs the vendor update. It returns an explicit outcome, for example `updated{toVersion} | failed{message} | refused{AGENTS_RUNNING, count} | refused{BUSY} | refused{NOT_INSTALLED}`, or it throws the existing `AgentRuntimeError` codes.
  - `startUpdate` keeps throwing refusals to the resolver as today and does not await the vendor process.
  - The pass calls `runtimes.runUpdate(kind)`, then `notifications.recordOutcome(...)`, mapping each result to one outcome:
    - AGENTS_RUNNING → `AUTO_WAITING`;
    - BUSY → no outcome this tick;
    - failed → `AUTO_FAILED`;
    - updated → `AUTO_UPDATED`.
  - The pass no longer calls `runningAgents` itself.
  - Add BUSY (update or sign-in running) and NOT_INSTALLED to the gates table.
- Why proportionate: the rule moves into the method both paths already share; no new mechanism.
- Recipient: Solution Designer.

### AR-002 — Turning a switch off does not stop a running automation step (Design Impact, Major, blocking)

- Protects: REQ-005, REQ-017, TR-107 / UXJ-003 (approved UI spec), REQ-007's consent basis.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence: DS-002 reads `settings.isAutomatic(kind)` and the `web` gate once per kind, then updates every candidate. The DS-001 narrative stops checks when the setting turns off, but says nothing for the automation step. Today's scheduler re-reads its gates before every source (`update-check-scheduler.ts:66-69`).
- Material premise: MP-002 (Reachable; irreversible consequence).
- Required update: before each automatic update, the pass re-reads `isChecksEnabled()`, `isAutomatic(kind)`, `gate.isBlocked(web)` (GitHub kinds) and its own `closed`, and stops the kind's step when any of them fails. Draw this in DS-002.
- Why proportionate: four cheap reads per candidate, the same pattern as the existing per-source check gate.
- Recipient: Solution Designer.

### AR-003 — DS-008 outcome transitions are incomplete (Design Impact, Moderate, blocking)

- Protects: REQ-008, REQ-009, AC-009, UXJ-005/006.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence:
  - (a) The waiting → handled transition keeps every field (`update-notification-service.ts:176`). DS-008 clears outcomes only on replacement by a newer revision, so a manual update after `AUTO_FAILED` or `AUTO_WAITING` leaves a handled record carrying the stale outcome (MP-003). Its effect on rows, unread-outcome counts and `markAllRead` is undefined.
  - (b) `recordOutcome(AUTO_UPDATED, toRevision)` is defined only "on a record that the preceding reconcile marked handled with that revision". Two reachable cases are undefined:
    - The update installed a newer head than the record's `latestRevision`. This happens when automatic updates are turned on for an update found earlier and upstream moved since: the package update installs GitHub's current head.
    - The record was removed (DEC-015) or is not handled.
  - DS-002 also passes no revision to `recordOutcome`.
- Material premise: MP-003 (Reachable).
- Required update: state the rules in the DS-008 table.
  - On waiting → handled (any path), clear `AUTO_FAILED` and `AUTO_WAITING`.
  - `AUTO_UPDATED` attaches to the record if it is handled, whatever its `handledRevision`; the row shows "Updated automatically to <handledRevision>".
  - Otherwise `recordOutcome` returns an explicit "not applied" result: not a thrown error, and not a state reached because a lookup found nothing.
- Why proportionate: table rows in the existing state machine.
- Recipient: Solution Designer.

### AR-004 — The app check's launch and settings entry forms have no single owner, and `startAutoCheck` is not addressed (Design Impact, Major, blocking)

- Protects: REQ-013 / AC-013 (no automatic request at launch when off), REQ-012, REQ-014 / AC-014.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence:
  - The launch check is started by `electronApplication.ts:396` (e2e, test feed) and `:401` through `AppUpdateController.startAutoCheck()` (`appUpdater.ts:149-160`; also `DisabledAppUpdater`). Neither the Removal Plan nor the File Mapping lists `startAutoCheck` or `electronApplication.ts`. Yet DS-005 says the schedule itself fires 8 s after launch: either two launch checks run, or a launch check ignores the switch.
  - Calls go both ways: the schedule calls `AppUpdater.checkForUpdates('periodic')`, and the IPC `set-auto-check` goes `AppUpdater` → schedule. Who writes `app-update-checks.json` is not named.
  - `appUpdater.ts` is 499 lines. Moving the IPC block (`:423-435`, 12 lines) alone does not leave room for `autoCheck`, `setAutoCheck` and the periodic source.
- Required update: draw DS-005 for its three entry forms (launch, timer, set-auto-check) in call order, with one owner for the schedule and its settings, and list `startAutoCheck`'s disposition. One acceptable shape:
  - At launch, `electronApplication` → `appUpdateController.startAutoCheck()`, which only starts `AppUpdateCheckSchedule` (the disabled updater starts nothing).
  - The schedule owns its settings file, the timer, and the skip rules (off, busy, offline). When due, it calls `AppUpdater.checkForUpdates('startup' | 'periodic')`.
  - The IPC `set-auto-check` goes to the schedule's `setSettings` (validate, save, re-arm). `AppUpdater` reads `schedule.settings()` for `AppUpdateState.autoCheck` and receives a change notification to broadcast.
  - Whichever shape is chosen, name the file that leaves `appUpdater.ts` under 500 lines.
- Why proportionate: a wiring decision and a removal entry; no new mechanism.
- Recipient: Solution Designer.

### AR-005 — The runtime category is not traced per node kind (Design Impact, Major, blocking; may need a requirements revision)

- Protects: REQ-020, REQ-022, REQ-016 / AC-016, AC-022, the Out of Scope line (no runtime notifications or automatic updates on remote or Docker nodes), DEC-017.
- Scope status: `Within Approved Scope` for the trace. If the chosen behavior differs from REQ-020 or the Out of Scope line, the Solution Designer revises the requirements with the user's approval (`Requirement Gap — User Approval Required`).
- Changes approved behavior: possibly; see above.
- Evidence:
  - The server has no notion of "the desktop's own node". The rule is web-only: `isEmbeddedWindow`, `windowNodeContextStore.ts:55`, used at `AgentRuntimesManager.vue:99-100`.
  - The design's `UpdatePass` runs the runtime kind on every node. Its gates table only says the switch is shown in own windows.
- Material premise: MP-004 (Reachable).
- Required update: trace the runtime check, notification and automatic update for each node kind: the desktop's embedded node; a Docker or remote node seen from a desktop window; the same node seen from its own browser window (DEC-020). Then decide one of:
  - (a) Establish a server-side fact for "this node is a desktop's embedded node", for example set by the shell when it starts the embedded server, and run the runtime kind only there. In that case also restate DEC-020's browser-window case.
  - (b) Every node checks its runtimes. Then REQ-020, the Out of Scope line, AC-022 / VIS-037's hidden contact line and REQ-016's honest description must agree, through a requirements revision with the user.
- Why proportionate: it is a trace and a decision. (a) adds one launch fact; (b) adds only text changes.
- Recipient: Solution Designer.

### AR-006 — Composition order and the runtime service handle (Design Impact, Minor, non-blocking alone)

- Protects: the build-studio-server wiring the design relies on (DS-001 runtime source).
- Evidence:
  - `updateNotifications = composeUpdateNotifications()` runs at `build-studio-server.ts:288`. `composeAgentRuntimeStatus` runs at `:350`, after the application runtime it needs.
  - `AgentRuntimeStatusHandle` exposes only `close()`.
  - The resolver uses `UpdateNotificationService.getInstance()` (209 wiring), so the runtime source must be on that same instance.
- Required update:
  - say that update notifications are composed after the runtime status service and receive the service itself (or `getAgentRuntimeStatusService()`);
  - say how the singleton notification service gets its runtime source.
  - The closing order already fits: update notifications close before runtimes (`:100`, `:106`).
- Recipient: Solution Designer.

### AR-007 — The background runtime check should read versions only (Design Impact, Minor, non-blocking alone)

- Protects: REQ-020 (a version check); DESIGN.md "required data and dependencies are distinguished from unrelated state".
- Evidence: `check()` always reads sign-in (`agent-runtime-status-service.ts:255-257`). For Codex that acquires the app-server client (`codex-agent-runtime-strategy.ts:29-31`). The design does not say whether `checkInBackground` does the same every interval on every node.
- Required update: state that `checkInBackground` reads the installed and newest versions only. The sign-in state stays a page concern.
- Recipient: Solution Designer.

## Classification

`Design Impact` (AR-001..AR-007). AR-005 may lead to a requirements revision that the Solution Designer owns.

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- R-1: runtime versions are stored in `latestRevision`, `fromRevision` and `handledRevision`. The Data Migration Guideline says "Never reuse a field name with a different meaning" (`data_migration_guideline.md:105`). No old row is misread, because runtime rows are a new kind, and the design documents the meaning. Record this as a reading in the design's "conflicts or discrepancies" line, which currently says "none".
- R-2: the pass gates the runtime kind on GitHub's `web` gate as a whole. Only the Codex check uses GitHub; say whether Claude, Antigravity and Grok checks should skip while GitHub limits the node.
- R-3: `fetchLatestReleaseTag` needs the 302 itself. `publicGitHubRequest` follows redirects, and the target path `/releases/tag/…` is not in the allowed path list. The transport needs a "do not follow" option for this read.
- R-4: the design records these risks: GitHub's undocumented throttling of anonymous git traffic; automatic replacement as a supply-chain path (opt-in, confirmed); `net.isOnline()` accuracy.

## Latest Authoritative Result

- Review Decision: `Fail` (Design Impact; AR-001..AR-005 blocking; AR-006, AR-007 non-blocking)
- Material-Premise Gate: `Pass` (MP-001..MP-004 Reachable; each drives a finding)
- Notes: task_size `Large`, architectural_risk `High` confirmed. The structural verdicts not listed as failing keep their evidence for the next round.
