# Design Review Report — mobile-experience-redesign (autobyteus-277)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/requirements-doc.md` (SR-006: REQ-002a, AC-002a and DEC-013 revised; DEC-015 release)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-01…E-38)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001…SR-006)
- Reviewed Design Spec: `…/design-spec.md`, sections "Revision For ARCH-REV-003 (SR-006)" and "Revision For CRR-003 (SR-005)", and the canonical sections AR-010 touched, at commit `df7560a3ce`
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-007 widened); the Product spec at `e6ca7b6098` (unchanged)
- Relevant Solution Revision IDs: `SR-005`, `SR-006`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4` (scoped: AR-009, AR-010 and the sections they touch)
- Trigger: the Solution Designer's SR-006 revision for ARCH-REV-003.
- Prior Review Round Reviewed: round 3 (`ARCH-REV-003`, Fail).
- Latest Authoritative Round: `4`
- Current-State Evidence Basis: `df7560a3ce`. Re-opened `agentRunCollaborationStore.ts:248-258` (`syncHost`); the round-3 code evidence still holds (the code is unchanged).

## Routing Classification Review

- `Large` / `High`, unchanged and justified. Independent review required: `Yes`.

## Basis Confirmation (Round 4)

- Overall Basis Status: `Confirmed`.
- **REQ-002a, AC-002a and DEC-013 are revised to desktop parity.** A delegated row under a run that is not open shows the state last read. For those rows only, this narrows REQ-002's "each row shows its live state".
  - The Solution Designer records this as within the user's direction ("I think it should follow how it is from the desktop"), consistent with DEC-001 (the list is the desktop Runs view). The user is informed, and FU-007 covers the live state for both surfaces.
  - This is a requirements-owner decision. I do not re-decide it. I note it here so it stays visible.
- Technically, the basis is coherent: the phone and the desktop share one owner and one behavior, and no new machinery is added.

| Item | Status | Evidence |
| --- | --- | --- |
| AR-009 | Resolved | `refreshListedRoots` and `readRevision` are removed (no remaining mention in design-spec, apart from the F-08 row's "not added"). Nothing re-reads or republishes on the poll, so MP-004's consequence no longer exists. The reason is measured: E-38, a 1,235,612-byte view |
| AR-010 | Resolved | Constraints (`No iOS change … Android only for the insets`), Task Size/Risk (SR-005 additions; no new permission or dependency), Change Scope (in scope, derived consumers, left alone), the file mapping and Sequence steps 7–9 now carry the SR-005 changes. I checked the ten id-helper call sites against my round-3 `grep` |
| Residuals of round 3 | Taken | Org task rows show the name, as in the desktop's Org tree. `TeamLaunchDraft.ts:106` adopts the helper. The double-padding check is in the Guidance |

## Material Premise Validation

- `MP-004`: no longer applicable. The poll-driven re-read is removed.

## Review Decision

`Pass`. The design is ready for implementation.

## Findings

None open. AR-009 and AR-010 are resolved; AR-001…AR-008 were resolved in ARCH-REV-002.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks (Current, Non-Blocking)

- **"Updates when that run is opened" holds when the run is running.** Opening a running root attaches its live stream. Opening a stopped root whose stored view is already settled (`phase: 'historical'`) reuses that view, with no re-read (`agentRunCollaborationStore.ts:255-258`, autobyteus-358 DS-004). So a stopped root's delegated rows keep their last-read state even after it is opened. This is the same as the desktop. AC-002a's probe should use a running root, or record this parity case explicitly. FU-007 covers the server-side fix.
- **Carried from ARCH-REV-003:** none beyond the Android double-padding check, which is in the Guidance.
- **Carried from ARCH-REV-002:** the pending-open commit attribution guard; the rewritten list entry after a failed open; the Org `mode` key; R-001 and R-002.
- **DEC-015:** a beta release after finalization, for delivery. It does not affect the architecture.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `Large` / `High`. `ARCH-REV-004` over SR-006, at commit `df7560a3ce`.

---

## Round 3 Record (ARCH-REV-003, SR-005)

Its F-01, F-02, F-06, F-07 and F-09 verdicts remain authoritative. AR-009 and AR-010 are resolved above.

### Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Both are unchanged and justified: SR-005 adds more shared owners (the collaboration store, Task summaries, the id helper) and an Android shell change.
- Independent Architecture Review required: `Yes`.

### Upstream Behavior And Production-Path Basis Confirmation (Round 3)

- Overall Basis Status: `Confirmed`.
- The user's answers for DEC-009…DEC-011 are recorded in his words. DEC-012…DEC-014 were decided by the Solution Designer within the approved direction. REQ-003a is a clarification of REQ-003, and DEC-014 rests on a documented supported edge (`docs/remote_access.md`).
- Scope guardrail: Out of Scope now reads "Android and iOS shell changes, except REQ-011".
- Prospective blocking finding traceability: `Yes`. AR-009 protects REQ-002a/AC-002a, QR-003 and R-001.

| Behavior / Change | Design Alignment | Current-State Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| F-01 / REQ-003a: an Org run opens its first configured member through `select` | Pass | Pass. `select(address)` takes the configured selection; a direct agent or a team coordinator (`agentOrgExecutionContext.ts:123-128`; E-34) | Pass. One sequence owner as before; `agentOrgRouteQuery` gets the same address | Confirmed | — |
| F-02 / DEC-014: one guarded id helper | Pass | Pass. The bare calls exist at the cited lines | Pass | Confirmed | Residual: `types/agent/TeamLaunchDraft.ts:106` is unlisted (desktop-only team launch) |
| F-06 / REQ-002a: second lines | Pass | Pass. The client gate is at `useTaskWorkerTasks.ts:28`; a remote title is in `remoteRunsStore.ts:24, 79-80` | Pass | Confirmed | Residual: Org task rows |
| F-07 / DEC-009: rows lifted as on the desktop | Pass | Pass | Pass (no code change) | Confirmed | — |
| F-08 / REQ-002a "live state … while the list is shown" | Pass | Pass. `read` exists (E-33) | **Fail**: each re-read is a full republish with side effects, on a trigger that repeats every poll | Needs Correction | AR-009 |
| F-09 / REQ-011: Android insets | Pass | Pass. targetSdk 35; `androidx.core` is present, so `ViewCompat` needs no new dependency; no permission change | Pass | Confirmed | — |
| Canonical design sections vs SR-005 | — | — | **Fail**: Constraints, Change Scope and Task Size still say "no Android changes" and do not list the SR-005 shared changes | Needs Correction | AR-010 |

### Round-3 Structural Verdicts (Changed Owners Only)

| Owner / Change | Ownership And Boundary | Interface | Derived Consumers (P11) | Dependency Direction | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agentOrgFirstMemberAddress` in `utils/agentOrgHistoryRows.ts` | Pass (the Org row owner) | Pass (pure, one subject) | Pass (used by the phone only; the desktop is unchanged) | Pass | Pass | — |
| `utils/randomId.ts` `createRandomId()` | Pass (one owner for the rule) | Pass | Pass (four guarded copies adopt it; five bare calls change) | Pass | Pass | Keep each caller's prefix (`client_`, `upload:` …) |
| `useTaskWorkerTasks` gate split | Pass | Pass (`taskOf` everywhere; `locate` gated) | Pass (two desktop callers, `AgentRunTaskRows.vue:68` and `WorkspaceTeamExecutionTree.vue:126`, already have Projects) | Pass | Pass | — |
| `useRunHistorySectionLoad.readRevision` | Pass | Pass | Pass | Pass | Pass | — |
| `agentRunCollaborationStore.refreshListedRoots` | Pass (the store owns reads) | Pass | **Fail**: the consumers of a republished view are not listed or decided | Pass | **Fail** | AR-009 |
| Android shell insets (`WebShellScreen.kt`, `ConnectionScreen.kt`, `MainActivity.kt`) | Pass | N/A | Pass | Pass | Pass | Verify that the WebView's `env(safe-area-inset-*)` reads 0 inside the padded container, so the bottom inset is not padded twice |

Persisted-data decision: unchanged (`Not Affected`). Legacy and compatibility: none added.

### Material Premise Validation (Round 3)

#### `MP-004` — A listed, not-open Agent root is re-read on every history poll

- Related requirement: REQ-002a and AC-002a (live states while the list is shown); QR-003 ("the poll does not make the phone sluggish"); R-001.
- Relevant behavior ID(s): BEH-001.
- Initiating basis kind: `User` + `System`.
- Trigger: the run list is shown (the normal main screen) while a listed Agent run has delegated work that is idle or running. Idle is not stopped, and task workers stay idle until their Task is DONE (VIS-001 shows several idle children).
- Forward path, following DEC-013 as written:
  - every 5 s poll: `readRevision` increments → `useMobileRunTree` → `refreshListedRoots`;
  - the "child not stopped" clause holds on every poll → `read(hostRunId)`, unless the root has a live stream (only the selected host is synced);
  - `read` runs `readAgentRunCollaboration` and then `publish`.
- What each `publish` does (`agentRunCollaborationStore.ts:67-82`):
  - `memberLoader().beginRoot()` starts a new generation, so no child is hydrated (`memberLoader.ts:60-63`);
  - `participantMessages.reloadRoot('agent', …)` reloads every loaded or loading message list of that root, because a stored view has no live sequence (`collaborationParticipantMessages.ts:106-120`);
  - `remoteRuns.register` runs for each remote execution;
  - `ensureChildHydrated(hostRunId, selection[hostRunId])` re-reads the remembered selected child's conversation, which is now not hydrated.
- Consequence:
  - **Network:** while the list is shown, for each such root, one collaboration read plus a rebuilt context every 5 s, indefinitely. A root whose child the user opened earlier also gets that child's conversation re-read, and its Messages lists reloaded, every 5 s.
  - **Cost:** the work does not follow change, and no payload was measured (E-25 measured only history, 36 KB).
- Reachability: `Reachable`. It is the normal list with delegated work.
- Review consequence: AR-009.

### Round 3 Review Decision (superseded by round 4)

`Fail`. AR-009 (Medium, blocking) and AR-010 (Low) need a design update. Everything else in SR-005 passes.

### Round 3 Findings (resolved in round 4)

#### AR-009 — Design Impact — Medium (blocking)

The refresh of listed roots (DEC-013) republishes on every poll, and its side effects are not decided.

- **Protects:**
  - REQ-002a and AC-002a (live states while the list is shown, at bounded cost);
  - QR-003 ("the poll does not make the phone sluggish"); R-001 (cellular data);
  - DESIGN.md rule 3 and best practice 4 ("Match payload and UI work to the change").
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:** MP-004.
  - The "child not stopped" clause is true on every poll for any root with an idle or running child.
  - `read` → `publish` is a full rebuild. It resets the member-loader generation, reloads the root's loaded message lists, and re-hydrates the remembered selected child.
  - The design lists none of these consumers (Principle 11) and gives no work count or payload.
- **Required update:** decide the refresh so that its work follows change, and state what a refresh does to each consumer of a republished view.
  - **Trigger.** For example: re-read when the root's history entry changed (`lastActivityAt`, which includes its delegated copies' memory files, E-33), or when its status changed. That catches the MSP-02 idle → offline case if it comes with a root change. Or show evidence for the child-state change that only the "not stopped" clause catches, and bound it.
  - **Consumers of a republish.** Decide for each of member-loader hydration, participant-message lists, remote run registration and the selected child's re-hydration: either the refresh avoids it, or the cost is accepted with a measured payload for a representative root.
  - The designer chooses the mechanism; I'm not prescribing one.
- **Proportionate because:** this is a recurring, open-ended cost on the phone's main screen, over cellular, which the requirements explicitly bound.
- **Recipient:** Solution Designer.

#### AR-010 — Design Impact — Low

The canonical design sections contradict SR-005.

- **Protects:** Scope guardrail (REQ-011's exception); Principle 14 (change inventory).
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:** in `design-spec.md`:
  - Constraints: "No Android or iOS changes" (`:82`);
  - Change Scope's "Deliberately left alone: the server, the Android and iOS shells" (`:176`);
  - Change Scope's shared-change and Derived consumers lists, which name none of `refreshListedRoots`, `readRevision`, the `useTaskWorkerTasks` split, `utils/randomId.ts` and its call sites, `agentOrgFirstMemberAddress`, or the Android files;
  - Task Size And Architectural Risk, which does not mention the Android shell.

  The SR-005 table says "Change Scope extension", but the sections implementation works from still say otherwise.
- **Required update:** bring Constraints, Change Scope (in scope, derived consumers, left alone), Task Size/Risk, the final file mapping and the Change / Refactor Sequence in line with SR-005.
- **Recipient:** Solution Designer.

### Round 3 Classification

`Design Impact`.

### Round 3 Recommended Recipient (superseded)

Solution Designer (`/software_engineering_team/solution_designer`).

### Residual Risks (Round 3, non-blocking)

- **Org task rows and Task summaries.** `useTaskWorkerTasks` takes `RunHistoryTeamExecutionRow`. The desktop's Org tree does not use it, so Org task rows show no summary on the desktop. REQ-002a says "a task agent or task team shows its current Task's summary". Under DEC-009/DEC-010 ("follow the desktop"), I read that as: Org task rows show their name only, like the desktop. Implementation should state this explicitly in the tests.
- **`types/agent/TeamLaunchDraft.ts:106`** keeps a bare `crypto.randomUUID()`. It is reachable only through team launch, which the phone removed, and the desktop runs in a secure context. List it with that decision, or let it adopt the helper too.
- **Double inset padding.** If the WebView reports a non-zero `env(safe-area-inset-bottom)` inside the padded container, the "+" button and the composer would be padded twice. Check this on the API 35 emulator.
- **Carried forward from ARCH-REV-002:** the pending-open commit attribution guard; the rewritten list entry after a failed open; the Org `mode` key; R-001 and R-002.

### Round 3 Result (superseded by round 4)

- Review Decision: `Fail`
- Material-Premise Gate: `Fail` (MP-004 `Reachable` drives AR-009)
- Notes: `Large` / `High`. The rest of SR-005 passes: F-01/DEC-012, F-02/DEC-014, F-06/DEC-010, F-07/DEC-009, F-09/DEC-011 and the TESTING.md rule. Round 4 will recheck only AR-009, AR-010 and the sections they touch.

---

## Round 2 Verdicts Kept (ARCH-REV-002, SR-004)

These verdicts remain authoritative for every section SR-005 does not change.

### Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged in substance. SR-004 adds `onOpenAgentRun`, `agentOrgRouteQuery`, `useRouteSelectedAgentOrg` and `mobileRunOpeningStore`, which widens the shared surface slightly.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

### Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes, unchanged at SR-003.
- Relevant existing behavior and evidence confirmed: Yes. E-28…E-32 match the code. Specifically:
  - `onCreateRun` is used only by `WorkspaceAgentRunsTreePanel.vue:256`, plus tests and fixtures;
  - `RunDefinitionGroups.vue:362-366` holds the `selectChild(run, null)` + `onSelectRun` copy;
  - the toast container is global.
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain).
- Remaining material ambiguity: none.
- Statements about existing code the design relies on: the call sites in Change Scope and Guidance were opened and are accurate.
  - Test files that also use `startPresetChat` / `onCreateRun` will change with the move (`useWorkspaceHistorySelectionActions.spec.ts:86-161`, `workspaceSelectionComposition.spec.ts:66`). The typecheck will flag them; this is not a design issue.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass: the pending open is decided by `mobileRunOpeningStore`; one navigation writer | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass: the Org keys stay on the list entry | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass: preselection resolves after an Org run | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |

### Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001…029 (rev `e6ca7b6098`) | Pass | Pass | Pass | Pass | Pass | None. Round-1 cosmetic slips fixed at `e6ca7b6098` |
| `follow-ups.md` (FU-001 = autobyteus-391) | Pass | Pass | Pass | Pass | Pass | — |

### Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design-spec | — |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership + duplicated policy (E-01, E-03, E-20, E-23) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, extractions, options | — |

### Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | History load and poll | Pass | Pass | N/A | Pass | Pass | Pass. The 401 rule reads the composable's returned result (AR-008) | Pass |
| DS-002 | Tree rows | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Open a row | Pass | Pass | Pass (`useMobileRunOpening` facade over the shared actions) | Pass | Pass. Sequence: `begin` → `openRun` (replace + push) → shared action → `commit`/`fail`, all driven by `useMobileRunOpening` | Pass (recovery toast off the main line) | Pass |
| DS-004 | Screen state | Pass | Pass | N/A | Pass | Pass. `useMobileNavigation` is the only `/mobile` writer, using the pure `agentOrgRouteQuery` | Pass | Pass |
| DS-005…DS-009 | Views, New run, connection, file link, streams | Pass | Pass | N/A | Pass | Pass | Pass | Pass (unchanged from round 1) |
| Pending open (local) | `idle → opening(key) → idle` | Pass | Pass | N/A | Pass | Pass | — | Pass |
| Run screen (local) | `opening` from the pending state → `open`; neither → list | Pass | Pass | N/A | Pass | Pass. The previous target is never rendered; no re-open | — | Pass |

### Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `activeContextStore.activeWorkspaceTarget` | Pass | Pass | Pass | Pass | — |
| `agentRunCollaborationStore` | Pass | Pass | Pass | Pass | — |
| Shared open actions | Pass | Pass | Pass | Pass | Mobile shell: no navigation; reports the outcome |
| `mobileRunOpeningStore` | Pass | Pass | Pass | Pass | Written only by `useMobileRunOpening`, read by `MobileRunScreen` |
| `useMobileNavigation` | Pass | Pass | Pass | Pass | Only writer of `/mobile`'s query |
| `useRunHistorySectionLoad` | Pass | Pass | Pass | Pass | — |

### Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone → shared (including `agentOrgRouteQuery`) | Pass | Pass | Pass | Pass | — |
| `useEventMonitorFilePreview` → `useMobileNavigation` | Pass | Pass | Pass | Pass | The existing runtime branch, rebound |
| Shared → phone | Pass | Pass | Pass | Pass | No new edge (AR-002 resolved) |

### Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `MobileRowOpen` | Pass | Pass | Pass | Low | Pass |
| `useMobileRunOpening().open` | Pass | Pass | Pass | Low | Pass |
| `mobileRunOpeningStore` (`begin`/`commit`/`fail`, key = row key) | Pass | Pass | Pass | Low | Pass |
| `useMobileNavigation` (`openRun({ orgQuery?, replace? })`, …) | Pass | Pass | Pass | Low | Pass |
| `useWorkspaceHistorySelectionActions({ shell })` + `onOpenAgentRun` | Pass | Pass | Pass | Low | Pass |
| `useWorkspaceHistorySubjectActions({ shell })` | Pass | Pass | Pass | Low | Pass |
| `agentOrgRouteQuery(run, command, isActive)` | Pass | Pass | Pass | Low | Pass (see the Residual Risks note on `mode`) |
| `useRouteSelectedAgentOrg()` | Pass | Pass | Pass | Low | Pass |
| `useRunHistorySectionLoad` result `{ ok } \| { ok:false, cause }` | Pass | Pass | Pass | Low | Pass |
| `useTargetConversation(target)` | Pass | Pass | Pass | Low | Pass (the name rule is stated) |
| `useRunListDisclosure({ defaultExpansion })` | Pass | Pass | Pass | Low | Pass |

### Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runs, tree sources, disclosure, target, peers/offers (`askAll`) | Pass | Pass | N/A | Pass | — |
| Recovery feedback | Pass | Pass | N/A | Pass | The desktop's toast and copy (E-31); no new copy |
| Opening the run's own agent | Pass | Pass | Pass | Pass | `onOpenAgentRun`, one owner, three users (AR-006) |
| Pending open | Pass | Pass | Pass | Pass | A small phone store; the run screen and the list both need it across components |

### Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared run history | Pass | Pass | Pass | Pass | — |
| Shared workspace conversation | Pass | Pass | Pass | Pass | — |
| Phone shell | Pass | Pass | Pass | Pass | — |

### Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useTargetConversation`, `useRunHistorySectionLoad`, `useRouteSelectedAgentOrg`, `agentOrgRouteQuery` | Pass | Pass | Pass | Pass | Each replaces two copies, or serves two shells |
| `MobileScreenBar`, `MobileBottomSheet` | Pass | Pass | Pass | Pass | — |

### Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MobileRunTreeRow` / `MobileRowOpen` | Pass | Pass | Pass | Pass | Pass | — |
| Route query (phone keys + Org keys) | Pass | Pass | Pass (one writer) | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` (AR-007 resolved).

Each domain word keeps one meaning (Principle 15): `Pass`.

### File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useMobileRunOpening.ts`, `mobileRunOpeningStore.ts` | Pass | Pass | N/A | Pass | — |
| `useMobileNavigation.ts` | Pass | Pass | N/A | Pass | — |
| `useWorkspaceHistorySubjectActions.ts` | Pass | Pass | N/A | Pass | — |
| `MobileRemoteAccessShell.vue` | Pass | Pass | N/A | Pass | Mounts the collaboration sync while paired |
| Others | Pass | Pass | Pass | Pass | — |

### Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/mobile/*`, `composables/mobile/`, `stores/mobileRunOpeningStore.ts`, `utils/mobile/` | Pass | Pass | Low | Pass | — |
| `composables/runHistory/` (load, route Org), `composables/workspace/` | Pass | Pass | Low | Pass | — |

### Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone model, screens, catalog, team launch, their tests | Pass | Pass | Pass | Pass | — |
| Mobile `stop` branch | Pass (not added) | N/A | Pass | Pass | — |
| `reopenSelected()` | Pass (removed) | N/A | Pass | Pass | MP-002 |
| Duplicate `selectChild(run, null)` rule; the two route-Org copies; `onCreateRun`/`startPresetChat` in the shared composable | Pass | Pass | Pass | Pass | — |

### Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Phone shell; shared options | No | Pass | Pass | — |

### Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mobileWorkStore` (memory), the new pending store (memory); pairing session | Not Affected | Pass | Pass | N/A | Pass | — |

### Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–2 (shared, desktop tests green) | Pass | Pass | Pass | Pass |
| Steps 3–8 (phone, rebind, removal, docs, verify) | Pass | Pass | Pass | Pass |

### Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tap → run screen order | Yes | Pass | Pass | Pass | — |
| Org open on the phone | Yes | Pass | Pass | Pass | — |
| Run screen target, task team row, Back, poll | Yes | Pass | Pass | Pass | — |

### Material Premise Validation (Only When Needed)

#### `MP-001` — A tap opens a run while the previous run is still the open target

- Reachability: `Reachable` (round 1).
- Review consequence: resolved. `opening` is decided by `mobileRunOpeningStore.pending`, the push precedes the action, and the screen never renders the target while pending (design-spec Bounded Local Spines, DS-003).

#### `MP-002` — Selection present but no target on entering the run screen

- Reachability: `Not Reachable` on the evidence (E-29); no witness found by either role.
- Review consequence: `reopenSelected()` is removed. Neither pending nor target → list.

#### `MP-003` — Returning to the list after opening an Org run

- Reachability: `Reachable` (round 1).
- Review consequence: resolved. `openRun` writes the Org keys onto the list entry, so the Org target, the row mark (`useRouteSelectedAgentOrg` → disclosure) and the preselection resolve after ←.

### Unresolved Approved-Behavior Or Current-State Gaps

None.

### Round 2 Review Decision (superseded by round 3)

`Pass`. The design is ready for implementation.

### Round 2 Findings

None open. AR-001…AR-008 are resolved; see `ARCH-REV-002` in the revision record.

### Round 2 Classification

N/A (Pass).

### Round 2 Recommended Recipient (superseded)

Implementation Engineer (`/software_engineering_team/implementation_engineer`).

### Round 2 Residual Risks

Non-blocking; for implementation and the next design touch.

- **Pending-open commit attribution.**
  - `emitRunSelected` is one callback for one shared instance, and the design maps it to "the pending key".
  - If an earlier open (A) commits after the user pressed ← and tapped B, but before B's shared action takes its selection intent, A's notification could commit B's key. That window is the `await openRun` of B.
  - A cheap guard either closes the window: `mobileRunOpeningStore.begin` calls `selectionStore.invalidateSelectionIntent()` (`agentSelectionStore.ts:54`), or the commit checks the emitted `runId` against the subject.
  - Implementation may take either; no design change is required.
- **A failed open leaves the list entry rewritten.** `openRun` rewrites the list entry before the action. After a failed Org open, the list keeps that Org's keys, so it may mark an Org whose open failed. After a failed agent/team open, a previously open Org's keys are gone. This is acceptable for an error path; note it in tests.
- **The Org `mode` key.** On the phone, `mode` comes from the history item's `isActive` before the open. On the desktop it comes from `context.isActive` after `openForInspection`. `activeWorkspaceTarget` only checks that `mode` is `active` or `history` (`activeContextStore.ts:73`), so this is harmless today. Keep `agentOrgRouteQuery` the single builder.
- **Stale text in design-spec** (editorial; the Ownership Map and the Revision table are authoritative):
  - E-19's row and the Return/Event Spine still say the run screen mounts `useAgentRunCollaborationSync`; the Ownership Map now puts it in the paired shell;
  - "Architecture evidence is E-10…E-27" omits E-28…E-32;
  - the Health Assessment's "Split sequence" line still says "the composable still calls the router itself", but in mobile mode it does not.
- **R-001 / R-002** as the design states; verify on a device.
- **The unified read-only rule:** test it per desktop surface.

### Round 2 Result (superseded by round 3)

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `task_size = Large`, `architectural_risk = High`. `ARCH-REV-002` over SR-004 (package commit `407f0ee8e9`, Product spec `e6ca7b6098`). Requirements unchanged at SR-003.
