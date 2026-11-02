# Design Review Report — autobyteus-348 (runtime switch for Team members, Org members and delegated copies)

Latest complete result: round 2 (`ARCH-REV-002`). Round 1 (`ARCH-REV-001`, Fail) is in `architecture-review-revision-record.md`. Verdicts that round 2 did not touch keep their round-1 evidence and are marked "unchanged".

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-001; REQ-002, REQ-006, AC-004 reworded in the revision)
- Upstream Investigation Notes: `investigation-notes.md` (F-01…F-14; F-02, F-03 restated, F-10…F-14 added)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-001 note 1)
- Reviewed Design Spec: `design-spec.md` (status `Ready`; user design approval `Not required`)
- Supplemental Task Artifacts Reviewed: `switch-member-record-contract.md` (M-2, M-6, M-7, §2, §6), `follow-ups.md` (FU-001), `solution-designer-handoff.md` (Round 2)
- Relevant Solution Revision IDs: SR-001 (note 1)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: revision after `ARCH-REV-001` (Fail, ARCH-F-001…006)
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members`, branch `codex/runtime-switch-members`, documents `36f33e3b4d` (base `origin/personal` @ `c952758a81`). I did not take the revision record as proof: each claimed update was checked in the documents, and the new claims were opened in code. Round-1 code reads still stand. New reads this round: `flat-team-execution-factory.ts` (the member contexts' construction), `flat-team-member-config-resolver.ts`, `registries/configured-agent-execution-registry.ts` (`getOrCreate`, `remove`), `registries/task-agent-execution-registry.ts` (`restore`), `root-agent-execution-registry.ts` (`restoreTask`), `team-run-context.ts` (`TeamAgentMemberRuntimeContext`), `delegated-launch-selection-command.ts` (`update`, `whileTaskExecutionsStopped`, `publishSelectionsChanged`), `pnpm`-free: the strict contract schemas as before, the server's contract dependencies (`autobyteus-server-ts/package.json`). Not done: the web planner, every `userLaunchSelection` site, the Org and Agent-root adopt mutators beyond their call sites; no experiment was run.

## Routing Classification Review

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architectural risk (`Low`/`High`): `High`
- Classification rationale reviewed: now includes the two contracts packages (about 55 files plus tests). Agreed.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`, with the clarifications of ARCH-F-007…010
- Approved requirements / intended behavior understood: unchanged from round 1; the revision rewords REQ-002 (a pending switch on every affected started copy member; the activation decides history), REQ-006 (the web shows effective runtimes, which needs the contracts to carry a copy's runtime) and AC-004. Intended behavior is unchanged; these are narrowing technical rewordings.
- Relevant existing behavior and evidence confirmed: see the table.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): yes.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: not applicable; no blocking finding.
- Remaining material ambiguity, if any: what "started" means for a copy member (ARCH-F-007).
- Statements about existing code the design relies on, opened at their cited lines (an unsourced or false one is a finding; Principle 1):

| Design statement (revised) | Opened | Result |
| --- | --- | --- |
| F-02: one activation class, two construction sites; the Team wrapper has its own `config`, `FlatAgentExecutionContext` and commit adapter | `root-agent-execution-registry.ts`, `flat-team-agent-execution-handle.ts`, `flat-team-execution-factory.ts:56`, `configured-agent-execution-registry.ts` | Holds. The Team's per-member `TeamRunAgentNode` is `teamContext.teamNode.children` (a third holder, below) |
| D-8: conflict is thrown on a stale `switchId` or missing member; the change carries the member identity so a native `null` commits | `team-run-execution-tree-mutator.ts` (the other kinds throw `…CONFLICT`); `collaboration-agent-platform-binding.ts` (binding requires a non-empty id) | Holds as designed; consistent with the precedent |
| M-7 holders: handle spec and session; Team wrapper `config` and context; root tree and index | `configured-agent-execution-handle.ts:69,75,109`; `flat-team-agent-execution-handle.ts:38,176-192`; `flat-team-execution-context.ts` | Holds. One more holder exists and is harmless today: `teamContext.teamNode.children`, which `FlatTeamMemberConfigResolver.resolve` re-reads only in `getOrCreate`; the configured registry's `remove` has **no callers**, so a member's wrapper is created once per root lifetime. State that in M-7 (ARCH-F-009) |
| D-5/DS-002: a stopped copy's retained handle is refreshed through `replaceSelection` after the save | `delegated-launch-selection-command.ts:update` (the save runs inside `whileTaskExecutionsStopped`, commits the tree and publishes the selections event; it touches no handle); the only callers of `replaceModelChoice` are `root-agent-execution-registry.ts:249` (`restoreTask`) and `task-agent-execution-registry.ts:101` (`restore`) | **Mislocated.** The refresh happens at **restore**, from the node rebuilt from the tree, not at the save (ARCH-F-009) |
| D-3: three mirrors extended, parity test | the three rule functions; the server depends on both contract packages (`autobyteus-server-ts/package.json` dependencies) | Holds; a server test can import both mirrors, so the parity test has a natural home (name it) |
| Contract §6: the pending switch is not on the wire; the web needs only the effective runtime | the web's use of the mirrors (`agentSourceSelectors.ts`, `delegatedLaunchRows.ts`); `ExistingRunSettings.vue`'s runtime hint | Holds. The hint stays the draft-versus-saved comparison of 316; after a reload a saved-but-pending member shows its new selection, and undo is the server's decision |
| D-9: discovery reads the effective runtime and pending through one function over the four lists and the location read models | `memory-run-discovery.ts:95-150`; the files named exist (`collaboration-execution-location-service.ts`, `agent-org-execution-tree-location-service.ts`, `team-run-execution-tree-location-service.ts`, `agent-collaboration-view-projector.ts`, `agent-org-execution-view-projector.ts`) | Holds |
| D-6: `prepareConfiguredActivation` refuses a pending spec; the discard goes in `initializeReady`'s failure branch | the staged callers (all fresh task copies) and `:382-407` | Holds |

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | None |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | ARCH-F-007 (define "started"), ARCH-F-008, ARCH-F-009 |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | ARCH-F-008, -009 |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | None |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | ARCH-F-007 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `switch-member-record-contract.md` | Pass | Pass | Pass: §2 (identity in the change, thrown conflict), M-2, M-7, §6 (copy before/after and wire) are complete | Fail in two places: §1.2 last sentence still says "each following member that **has conversation history**" (contradicts M-6/D-5) | Pass | ARCH-F-008 |
| `follow-ups.md` | Pass | Pass | Pass | Pass, except the ID collision (ARCH-F-010) | Pass | ARCH-F-010 |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination` now matches what the code shows (three launch-rule copies, per-family commit); FU-001 records the convergence | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded refactor now; convergence of the three launch rules deferred as FU-001 with a parity test | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D-1, D-3, D-8, Ownership Map | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | One Owner Per Node, In Call Order? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Team/Org save | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Copy save | Pass | Narrative still says "recorded on each affected copy that has a conversation" and ends with a save-time handle update (ARCH-F-008, -009) | Pass | Pass | Pass: the save no longer reads memory | Pass | Pass with corrections |
| DS-003 | Activation | Pass: both construction sites, the wrapper's adapter, the root's commit, the failure branch | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Readers | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Handle (activation order), Team wrapper (adapter and caches), roots (durable commit) | Pass | Pass | Pass | Pass | |
| Record-level commit step | Pass: one function beside the save rule; families only locate | Pass | Pass | Pass | Resolves ARCH-F-005 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server ↔ contracts ↔ web | Pass: contracts first, then server and web in one cut (DESIGN rule 9) | Pass | Pass | Pass | |
| Handle → memory port default | Pass | Pass | Pass | Pass | Unchanged |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `CollaborationAgentPlatformBindingChange {runtime_switch, execution, switchId, platformAgentRunId\|null}` | Pass | Pass | Pass | Low | Pass in the contract and D-8; the spec's Interface table still shows the old shape `{switchId, binding\|null}` (ARCH-F-008) |
| `replaceSelection` (both implementations) | Pass | Pass | Pass | Low | Pass; its callers and call time to be corrected (ARCH-F-009) |
| Wire: `UserLaunchSelectionDto.runtimeKind?` / `runtime_kind?`, live event via `selection` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| All rows | Pass | Pass | N/A | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Allocation including both contracts packages, the Team local runtime, the location read models | Pass | Pass | Pass | Pass | `team-run-delegated-launch-plan.ts` (old names) is not in the mapping (ARCH-F-010) |

A mechanism that gets a function reaching another collaborator, a compound owner ("A + B"), or a kind or entry form the spine does not trace fails the row (Principles 1, 2, 13). None found; both construction sites are traced.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Effective-launch rule (3 mirrors) | Pass: extended in step with a parity test; convergence deferred as FU-001 | Pass | Pass | Pass | An accepted, recorded exception to "one owner per fact" with a guard |
| Record-level commit; save rule | Pass | Pass | Pass | Pass | |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `pendingRuntimeSwitch` (not on the wire), `UserLaunchSelection.runtimeKind?` (on the wire) | Pass | Pass | Pass | N/A | Pass | |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. The contracts, their mirrors, the live event, the web parsers and call sites, discovery and the read models, `buildRuntimeSwitch`, and the Team wrapper's caches are now listed with a decision.

Each domain word the design uses or introduces keeps one meaning, and each concept one name, across code, data, wire, tools, UI, and docs (Principle 15): `Pass` for the domain words; one finding on IDs (ARCH-F-010): "FU-001" now names two follow-ups (316's failed-turn record and this ticket's rule convergence).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mapping rows | Pass | Pass | N/A | Pass | `task-agent-execution-registry.ts` (restore call site) is the one row to name; ARCH-F-009 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| New and changed paths | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Corrected row: the "cannot change runtime kind" sentence is documentation only | Pass | Pass | Pass | Pass | |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Contracts, renames | No | Pass | Pass | Contracts, server and web in one cut |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Optional fields on records and the own-file section | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Unchanged. The wire gains one optional field |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Contracts first; shared core; activation at both sites; saves; readers; web in one cut | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Member and copy before/after with wire | Yes | Pass (contract §2, §6) | Pass | Pass | |

## Material Premise Validation (Only When Needed)

### `MP-1` — A switched member's handle is activated again in the same root lifetime (round 1)

- Reachability: `Reachable` (user Stop of a copy; a run that died).
- Review consequence / proportionate response: answered by M-7, D-8 and the test "switch → run ends → next input restores" at both construction sites. Checked: for a copy the restore site rebuilds the node from the tree and re-specs the retained handle, so `replaceSelection(sourceNode)` must also refresh the session ID and the pending switch (ARCH-F-009).

## Unresolved Approved-Behavior Or Current-State Gaps

None blocking.

## Review Decision

`Pass`

## Findings

Round-1 findings ARCH-F-001…006: resolved (see the revision record). Four new findings, all `Design Impact`, scope `Within Approved Scope`, changes to approved behavior `No`, **non-blocking**, recommended recipient Solution Designer. They are documentation contradictions or a missing definition; none needs re-review. ARCH-F-007 must be settled before the copy steps of the sequence (step 3); the rest should be folded in while implementation starts. Where documents disagree, the contract (§2, M-2, M-6, M-7) and decisions D-5/D-8 are authoritative.

### ARCH-F-007 — "started copy member" is undefined (REQ-002, AC-004, M-6)

- Severity: Medium (non-blocking; settle before step 3)
- Approved requirement protected: REQ-002, REQ-005, AC-004, AC-007; SCN-005.
- Evidence: REQ-002 and AC-004 say a pending switch is recorded "on every affected **started** copy member". The records offer no uniform "started" fact: `TaskTeamAgentExecution` has only `{address, agentRunId, platformAgentRunId}`; a native member never has a session ID even after a conversation; the planner decides history at activation (D-5/M-6). SCN-005 says a change on a member that never started is a "plain edit", while configured members (D-4) record the pending switch unconditionally and clear it at their first activation.
- Required update: define the rule once. Simplest and consistent with M-6: record the pending switch on every affected member whose effective runtime changes (a copy member that exists in the tree), and let the planner (`none` → plain start; `present` → switch) decide at activation; drop "started" from REQ-002/AC-004, and reword SCN-005 as "the observable behavior is a plain start". If "started" is kept, name the field that decides it for each of the three record kinds.

### ARCH-F-008 — Stale text contradicts the revised decisions

- Severity: Medium (non-blocking; an implementer reading the old line would build the old behavior)
- Approved requirement protected: REQ-002, REQ-003, AC-005, AC-006; Principle 14.
- Items in `design-spec.md` and the contract:
  1. Interface Boundary Mapping shows `CollaborationAgentPlatformBindingChange {kind:"runtime_switch", switchId, binding|null}`; D-8 and contract §2 define `{kind, execution, switchId, platformAgentRunId|null}`.
  2. Guidance for Implementation: "roots' commit (match by `switchId`; stale `switchId` changes nothing)" contradicts M-2/D-8 (a stale `switchId` or a missing member throws a conflict).
  3. DS-002 narrative: "recorded on each affected copy that has a conversation"; Off-Spine table: "History check — Copy save"; contract §1.2 last sentence: "each following member that has conversation history". The save no longer reads memory (D-5, M-6).
  4. Change Scope says the projections "carry the pending flag … no other reader" and "Follow-ups: none new"; the contract says the pending switch is not on the wire, and FU-001 exists. The investigation-notes path line says "F-01…F-09" (now F-14); the "Evidence" section and the escalation trigger still speak of F-09 (b) as open (it is answered by F-10…F-12).
  5. D-10: "(Team keeps `patches`→`selectionPatches` too)" is unclear; say that the Team input field `patches` is renamed to `selectionPatches` as well.

### ARCH-F-009 — The retained handle of a copy is refreshed at restore, not at the save; name the restore site and what it must refresh

- Severity: Low (non-blocking)
- Approved requirement protected: REQ-003, REQ-004, M-7; Principle 1.
- Evidence: the copy save runs inside `whileTaskExecutionsStopped`, commits the tree and publishes the selections event and touches no handle (`delegated-launch-selection-command.ts:update`). The only callers of `replaceModelChoice` are the **restore** sites `root-agent-execution-registry.ts:249` (`restoreTask`) and `task-agent-execution-registry.ts:101` (`restore`), which re-spec a retained stopped handle from the node rebuilt from the tree. D-5 and the DS-002 spine end at "replaceSelection on the live stopped handle" as if it were part of the save.
- Required update: say that the refresh is at restore; that `replaceSelection(sourceNode)` takes the effective runtime, model and settings, the session ID (null while pending; the committed id after a commit) **and** the pending switch from the node, in both implementations; that this also refreshes a retained handle after a committed switch (a second guard for M-7); and that the Team wrapper's `FlatAgentExecutionContext.runtimeKind` is not read through `TeamAgentMemberRuntimeContext` (its interface has no runtime), so its readonly value is harmless, or make the field follow the node. Add to M-7 that `teamContext.teamNode.children` (the resolver's source) is read only when a wrapper is created, once per member, because the registry's `remove` has no callers; if that changes, it is a holder.

### ARCH-F-010 — Follow-up ID collision and small inventory items

- Severity: Low (non-blocking)
- Approved requirement protected: Principle 15 ("two different IDs never share a name"); REQ-008.
- Items: (1) `FU-001` names 316's failed-turn follow-up (a Task item here) and this ticket's launch-rule convergence; give this ticket's follow-ups their own prefix or the next free number in the Task's list. (2) `team-run-delegated-launch-plan.ts` and `delegated-launch-selection-service.ts` carry the old names (notes F-14) but only the second is in the mapping; add the first. (3) Name the home of the parity test (a server test can import both contract mirrors: the server depends on both packages) and say that the two contract packages' own tests cover their mirror.

## Classification

`Pass`. No Design Impact, Requirement Gap or Unclear blocks implementation.

## Recommended Recipient

Primary pass: `/software_engineering_team/implementation_engineer`. Informational notice: `/software_engineering_team/solution_designer`.

## Recommendations (non-blocking)

- First tests, in this order, since they exercise both construction sites: (1) a Team member switch at the Team site (save → restart → first message → restore on a second message); (2) an Org member at the registry site; (3) the strict contract parse of a tree with a runtime in a choice; (4) the three-mirror parity test.
- Test a copy woken by a teammate's message (the restore site) and by the user.
- Test a Team-level choice that changes the runtime for followers while one follower has its own choice.

## Residual Risks

- The web planner and the full list of `userLaunchSelection` sites were not read by the reviewer; the first failing tests the design names remain the right start.
- Three mirrors of the launch rule stay until FU-001 is done; the parity test is the guard.
- A usage limit cannot be produced on demand; real runs stop members by hand, as in 316.
- Contracts, server and web must land in one cut; a partial deployment of the contracts would fail the strict parse (accepted by DESIGN rule 9).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: All six round-1 findings are resolved in substance and verified against the code and the documents: both construction sites and the Team wrapper's adapter and caches are traced; the commit throws on a stale `switchId` or a missing member and commits a native `null` through the carried identity; every in-memory holder refreshes (M-7); the copy rule no longer reads memory at save; the record-level commit is one function; the contracts, their three mirrors, the live event, the web parsers and call sites, and the discovery lists are in scope with a parity test and a one-cut sequence. What remains is a missing definition ("started") and stale lines that contradict the revised decisions.
