# Design Review Report — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

Latest complete result: round 2 (`ARCH-REV-002`). Round 1 (`ARCH-REV-001`, Fail) is in `architecture-review-revision-record.md`.

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-004, `Approved`; one sentence added to REQ-001 for a host saved together with its delegated copies; PRE-1 delivered)
- Upstream Investigation Notes: `investigation-notes.md` (F-01…F-37)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-004 notes 1–11)
- Reviewed Design Spec: `design-spec.md` (status `Ready` for round 2)
- Supplemental Task Artifacts Reviewed: `run-runtime-switch-contract.md` (v2, revised), `follow-ups.md` (FU-001, -003, -004, -005, -008), `prerequisite-stored-runtime-names.md` (context), `solution-designer-handoff.md` (Round 2 section); evidence and probes from round 1 (unchanged, synthetic data)
- Relevant Solution Revision IDs: SR-004 (notes 8–11)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer revision after `ARCH-REV-001` (Fail): ARCH-F-001…005; autobyteus-343 delivered; user decision on the rename (option A, 2026-10-31)
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume`, branch `codex/cross-runtime-resume`, head `f3252f1d1a` (includes `origin/personal` with autobyteus-343 `31eb1fb5d3`). Re-opened in code: `standalone-agent-run-lifecycle-service.ts` (`persistAndPublish`, `isExactTarget`, `isExactOriginalPrepared`), `agent-run-history-catalog-service.ts` (`recordRunStarted`), `standalone-agent-run-root-manager.ts` (`resolveRootAndEnsureHost`, `stopRoot`, `updateStoredTree`, `load`, `launchConfigurationOf`), `standalone-agent-run-root.ts` (hostIdle only with `delegatedFrom`; `terminate`; `enterFailStop`), `delegated-launch-selection-service.ts:142-160`, `memory-search/runs/memory-run-discovery.ts:146`, `journals-step.ts`, `agent-run-platform-notices.ts`, the 343-merged writers (`RuntimeKind.*` in the payload builders, `runtimeKindFromString` in the recorder, migration folder `raw-trace-manifest-runtime-names`), the web `ExistingRunSettings.vue`, `ExistingRunConfigEditor.vue`, `ChatModelMenu.vue`, `existingRunModelConfigMutationClient.ts`, and a grep of every name in the rename list.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged and still right (three packages, eight subsystems, new persisted field and boundary type, retry-sensitive activation, derived-data ownership change, GraphQL clean cut; the rename adds a clean-cut across server, GraphQL and web but no new risk class).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: settings of a stopped standalone Agent run offer another runtime and model; saving records a pending switch (REQ-001, REQ-013); the first message makes it real with marker, rotation, notice and per-file journal runtime (REQ-002, 003, 007, 010–012); chat marker (REQ-011). Teams, Org members, delegated copies, application-/system-owned runs and agent/Router-started switches are out of scope.
- Relevant existing behavior and evidence confirmed: all round-1 citations re-opened; the root hop and the combined Save are now traced (below).
- Scope guardrail confirmed: yes.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: not applicable; no blocking finding.
- Remaining material ambiguity, if any: none.
- Statements about existing code the design relies on, opened at their cited lines: all hold. Checked this round: `recordRunStarted` overrides only `runtimeKind`, `platformAgentRunId`, `startedAt` and resets the row's `terminatedAt` (so the new `clearPendingRuntimeSwitch` input is the minimal fix and creates no second writer); `resolveRootAndEnsureHost` → `root.ensureHostReady()` → handle `ensureReady` → `activateHost`; `hostIdle` exists only when `delegatedFrom` is set (`standalone-agent-run-root.ts:147`); `terminate()` calls `onTerminated` → unregister and `enterFailStop` schedules `terminate()`; `stopRoot` unregisters; the combined Save is `delegated-launch-selection-service.ts:142-160` (case `AGENT`); the journal target runtime is supplied by `memory-run-discovery.ts:146`; `AgentRunPlatformNotices` hands over the first notice it gets; 343 is on the branch.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (updater seam; both callers: the plain Save and the combined Save of a host with its copies) | Pass | Confirmed | None |
| BEH-002 | System | Pass | Pass (root hop, lifecycle, commit writer) | Pass (DS-002 now starts at `AgentRunService.activate`) | Confirmed | None |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | None |
| BEH-007 | System | Pass | Pass (343 delivered: a segment's runtime is `runtimeKindFromString(entry.runtime_kind)`) | Pass (open file via `openRawTraceRuntimeKind`) | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `run-runtime-switch-contract.md` v2 | Pass | Pass | Pass: §3.1 undo keeps a different model; §3.2 names the open-file owner; §3.3 step 4 shows stored before/after and the retry flag; I-4, I-6, I-9 amended | Pass with the text corrections of ARCH-F-006 | Pass (approved with the design) | None blocking |
| `follow-ups.md` | Pass | Pass | Pass (FU-006 and FU-007 removed; FU-008 added) | Pass | Pass | None |
| `prerequisite-stored-runtime-names.md` | Pass | Pass (requirements PRE-1) | Pass | Pass (delivered) | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Section present | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Shared Structure Looseness` with F-24 | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Per-file journal runtime now; rename now (removal plan row); team names deferred (FU-003) | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, file mapping | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Settings save | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | First message → notice + marker | Pass | Pass: surface (`AgentRunService.activate`) → root manager → root → host handle → lifecycle (lane) → candidate → recorder → commit → register → dispatch → preface → provider → live marker | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Journal per-file runtime | Pass | Pass | Pass | Pass | Pass: segment → entry's `runtime_kind`; open file → `openRawTraceRuntimeKind` | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Lifecycle service / `recordRunStarted` | Pass | Pass: the lifecycle stays the only activation writer; the catalog method is the one writer of the commit | Pass | Pass | |
| `WorkJournalService`, `RuntimeSwitchRecorder`, `RuntimeHandoverNoticeService` | Pass | Pass | Pass | Pass | |
| Root manager / root / host handle | Pass: unchanged and named; the switch relies on them (MP-1) | Pass | Pass | Pass | |
| `selectionContextFor` (new, `agent-execution/services`) | Pass: one owner of the "fresh selection" context, used by the updater and the root manager's host validation | Pass | Pass | Pass | Root → `agent-execution` is the existing direction |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Two ports owned by `agent-execution`; optional `switching` dependency | Pass: supervisor site passes it, application site passes none and fails closed; the save of a switch is rejected for such runs | Pass | Pass | Pass | Both construction sites named |
| Notice service, journal, recorder, web | Pass | Pass | Pass | Pass | |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `updateStoppedAgentRunSelection` (+ renamed chain) | Pass | Pass | Pass | Low | Pass |
| `recordRunStarted({…, clearPendingRuntimeSwitch?})` | Pass | Pass | Pass | Low | Pass |
| `unchangedIsRetryable` / `isExactOriginal` | Pass | Pass: a flag and a data comparison; no function passed to reach another collaborator | Pass | Low | Pass |
| `openRawTraceRuntimeKind(metadata)` | Pass | Pass | Pass | Low | Pass |
| `RuntimeSwitchMemory.record`, `RuntimeHandoverNotices.register(runId)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Activation commit | Pass | Pass: the existing writer gets one input | N/A | Pass | |
| Everything in round 1's reuse table | Pass | Pass | Pass | Pass | |
| Stored runtime spelling | Pass | Pass: 343's `RuntimeKind` values and `runtimeKindFromString`; no mapping file | N/A | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All subsystems in the allocation table, plus `standalone-agent-run-root` (decision only) | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider binding `Pick<…>`; `RuntimeSwitch`; fresh-selection context | Pass | Pass | Pass | Pass | The label table is gone (343) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `pendingRuntimeSwitch {requestedAt, from}` | Pass | Pass | Pass | N/A | Pass | |
| Journal manifest per-file `runtime_kind` (`null` ≠ absent) | Pass | Pass | Pass | N/A | Pass | |
| Raw manifest `runtime_switch` entry; `RuntimeSwitch` | Pass | Pass | Pass | N/A | Pass | |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Round-1 gaps now covered: the root's inherited launch base and the member view (no change; reasoned), the combined Save (second caller, carries the runtime), the two construction sites, token usage (no change, test), discovery (`openRawTraceRuntimeKind`).

Each domain word the design uses or introduces keeps one meaning, and each concept one name, across code, data, wire, tools, UI, and docs (Principle 15): `Pass`. The stored spelling is now `RuntimeKind` everywhere new; the `…ModelConfig` drift is removed by the rename (the kept names are the ones that stay accurate: team family, shared `RunModelConfig*` result types, `StudioRunModelConfigService`, `commitAgentRunModelConfig`). One agent-specific web type name is missing from the rename list (ARCH-F-006).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Files in the mapping (now including the catalog service, discovery, supervisor, application builder decision, combined-Save files, selection context) | Pass | Pass | N/A | Pass | `ExistingRunConfigEditor.vue` is missing (ARCH-F-006) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New and renamed paths | Pass | Pass | Low | Pass | `openRawTraceRuntimeKind` is placed in the metadata types file; a function in a types file works, the new `agent-run-pending-runtime-switch.ts` is the more natural home (ARCH-F-006) |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Run-level journal runtime; runtime lock for eligible runs; model-only input; the `…ModelConfig` names; `unchangedPreparedIsRetryable` and `isExactOriginalPrepared` | Pass | Pass | Pass | Pass | |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Journal manifest, mutation input, rename (no alias) | No | Pass | Pass | |
| Stored spelling | No (343 migrated the manifests) | Pass | Pass | Imports and old trace records keep old labels by the user's decision; a non-`RuntimeKind` value reads as unknown |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `run_metadata.json` `pendingRuntimeSwitch` | `Directly Usable — No Migration` | Pass; the clear-write is now expressed | Pass | N/A | Pass | |
| `raw_traces_manifest.json` `runtime_switch` type | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | `runtime_kind` of the archived segment is `from.runtimeKind`, same spelling as 343's migrated data |
| `work_journal_manifest.json` per-file runtime | `Discard or Rebuild` | Pass (lazy rebuild; one journal-change notice per run, identical text) | Pass | N/A | Pass | |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 0–9 | Pass: PRE-1 first (delivered), library → memory → journal → metadata → catalog writer → settings and rename → activation → web → real run | Pass (none) | Pass | Pass (the numbering of the first lines is garbled, ARCH-F-006) |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Activation commit | Yes | Pass: stored before / after metadata in contract §3.3 step 4 | N/A | Pass | |
| Others | — | Pass | Pass | Pass | |

## Material Premise Validation (Only When Needed)

### `MP-1` — A root of the switched run is still registered (host offline) when the switch is saved or the first message is sent

- Related approved requirement or established contract: REQ-001, REQ-013, AC-001.
- Relevant behavior ID(s): BEH-001, BEH-002.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: the user stops the run (explicit Stop, or history delete/archive), then saves the settings and sends a message.
- Support evidence: exposed surface and action: Stop of a run. `stopRoot`/`endRoot` call `unregister`; `terminate()` calls `onTerminated`, which unregisters; `enterFailStop` schedules `terminate()`; the settings of a run are editable only when `getActiveRun` is null.
- Forward current or approved target production caller/event path: Stop → root unregistered → save (metadata changes) → first message → `resolveRootAndEnsureHost` → `load(metadata)` builds a new root with `launchConfigurationOf(metadata)` from the new metadata → `ensureHostReady`.
- Lifecycle preconditions and material consequence at the claimed point: none for this path; a root with an offline host exists only for `delegatedFrom` runs (idle shutdown, `standalone-agent-run-root.ts:147`), which are not eligible for a switch. A host that goes offline without a Stop while its root stays registered was not shown to exist; if it does, the existing model-only edit already has the same stale inherited base.
- Reachability: `Not Reachable` for the supported path; `Unclear` for an unproven provider-specific interrupt path.
- Review consequence / proportionate response: no machinery; recorded as FU-008 and an escalation trigger in the design. Accepted.

### `MP-2` — The journal of a run with a pending switch is rendered before the switch is made (round 1)

- Reachability: `Reachable` (memory-search Rebuild or first index pass; low consequence).
- Review consequence / proportionate response: resolved by `openRawTraceRuntimeKind` (ARCH-F-003).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

Round-1 findings: all resolved (see the prior-finding table in the revision record). One new Low, non-blocking item:

### ARCH-F-006 — Text and inventory corrections (Low, non-blocking, `Design Impact`, Within Approved Scope)

- Approved authority protected: Principles 14, 15; the design spec's own consistency.
- Evidence and required update (no re-review needed):
  1. Stale statements in `design-spec.md`: the status line (line 8) still says ARCH-F-004/-005 "wait for the user's decisions"; line 5 says "notes 1–8"; the DS-001 narrative names the "Stopped-run model-config updater" (now `StandaloneStoppedRunSelectionUpdater`); the notes path says "F-01…F-32" (now F-37); the persisted-data text still counts "3,786 entries in 820 runs" (343 re-measured 825 manifests, 3,794 entries); the change sequence has a garbled "1 … 0 … 2" line; the removal-plan wording "model-only mutation input" and the discrepancy list should not say "the `…Selection` names" before the code exists, only "will be". Also correct `AgentRunMetadata`-based tables in the contract where they still say "825 manifests in the user's 820 runs".
  2. The rename list omits the web type `AgentModelConfigMutationResult` (`existingRunModelConfigMutationClient.ts:17`, agent-specific; rename it to the selection wording), while `ExistingRunModelConfigMutationResult` (shared with the team client) correctly stays. The docs that name the old mutation (`autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/settings.md`) belong in the same change.
  3. `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue` is missing from the web file mapping: it maps the draft onto `ExistingRunSettings`, supplies `:root-locked-models="lockedModelsFor('/')"` (the current runtime's replacements) and handles `change-root`. For an eligible agent root it must handle a runtime change in the draft and must not pass the old runtime's locked list (without `runtimeLocked`, `ChatModelMenu` uses the catalog of the chosen runtime, `ChatModelMenu.vue:294`). Add it to the mapping.
  4. Optional: put `openRawTraceRuntimeKind` in the new `agent-run-pending-runtime-switch.ts` beside the pending-switch schema instead of the metadata types file.

## Classification

`Pass`. No Design Impact, Requirement Gap or Unclear blocks implementation.

## Recommended Recipient

Primary pass: `/software_engineering_team/implementation_engineer`, with a hold until the user's final approval of the design (the Task requires it before any build). Informational notice: `/software_engineering_team/solution_designer`.

## Residual Risks

- A hand-over notice is held in memory; a restart between the activation and its delivery loses it (the marker and journals remain). Accepted by the design as outside the supported scenarios.
- A failed activation followed by an undo leaves a marker for a switch that did not happen.
- A host that goes offline without a Stop while its root stays registered (MP-1): not shown to exist; FU-008 and the escalation trigger cover it.
- The native writer holding the active raw-trace file across rotation (escalation trigger; none known).
- Imports and old trace records keep the old stored spelling by the user's decision; a segment with a non-`RuntimeKind` value is rendered with the no-runtime rules.
- Scripted runtimes cannot show a real backend writing a record between `prepare()` and the marker; the real run asserts I-7 on each runtime pair tried.
- Continuation quality is the new agent's model's work; no promise.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: ARCH-F-001…005 are resolved and verified against the code, with no structural change. The activation commit is now expressible and retry-safe (one explicit input on the existing writer, one generalized flag), the first-message path and both callers and construction sites are traced, the open file's runtime has one owner, the stored spelling needs no mapping (343), and the rename is a complete clean cut apart from one web type name. One Low text/inventory correction (ARCH-F-006) is listed for the Solution Designer.
