# Design Review Report — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-004, `Approved` by the Solution Designer within the direction; DEC-4 is the user's own decision)
- Upstream Investigation Notes: `investigation-notes.md` (F-01…F-32)
- Upstream Solution Revision Record: `solution-revision-record.md`
- Reviewed Design Spec: `design-spec.md` (status `Ready`, SR-004 notes 1–7)
- Supplemental Task Artifacts Reviewed: `run-runtime-switch-contract.md` (v2), `follow-ups.md`, `solution-designer-handoff.md`, `evidence/*.txt` and `probes/*` (read, not re-run); `work-journal-neutral-vocabulary-contract.md` and `journal-neutrality-analysis.md` (autobyteus-331 history, not part of this package's behavior; not reviewed)
- Relevant Solution Revision IDs: SR-004 (notes 1–7)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `task_size=Large`, `architectural_risk=High`
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume`, branch `codex/cross-runtime-resume`, base `origin/personal` @ `9d59ab82ec`, head `620b0179f1`. Code opened at the cited lines: `agent-execution/services/standalone-agent-run-lifecycle-service.ts` (whole file), `standalone-stopped-run-model-config-updater.ts`, `standalone-agent-run-eligibility.ts`, `agent-run-manager.ts` (`beginActivation`), `agent-run-activation-operation.ts`, `agent-run-platform-notices.ts`, `agent-run-input-preface*.ts`, `run-history/services/agent-run-history-catalog-service.ts` (`recordRunStarted`, `commitRunModelConfig`), `agent-run-model-config-commit.ts`, `agent-run-metadata-store.ts`, `agent-work-journal/services/work-journal-service.ts`, `store/work-journal-store.ts`, `memory-search/pipeline/journals-step.ts`, `agent-memory/services/raw-trace-file-source-service.ts`, `runtime-memory-event-accumulator.ts`, `standalone-agent-run-root/**` (manager, handle, collaborators), `run-history/services/delegated-launch-selection-service.ts`, `studio-run-model-config-service.ts`, `compositions/build-studio-server.ts`, web `stores/existingRunConfigStore.ts`; `DESIGN.md` (root) rules 1–10.

## Routing Classification Review

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architectural risk (`Low`/`High`): `High`
- Classification rationale reviewed: three packages, eight subsystems, about 30 files; new persisted field and manifest boundary type; ordered retry-sensitive activation case in the transition lane; derived-data ownership change in the journal; GraphQL clean cut.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. The finding ARCH-F-001 below confirms the `High` risk (the activation commit is the riskiest step and is not yet expressible).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed` for BEH-001, BEH-005, BEH-007; `Needs Correction` for BEH-002 (activation commit and the root hop; see the table). No row is `Contradicted`.
- Approved requirements / intended behavior understood: a stopped standalone Agent run gets a runtime and model choice in its settings; saving records a pending switch; the first message makes it real (fresh session, rotation behind a marker, hand-over notice, per-file journal runtime); the chat shows a marker; the journal reads each file with its own runtime. Teams, Org members, delegated copies, application-/system-owned runs and agent/Router-started switches are out of scope.
- Relevant existing behavior and evidence confirmed: the two activation cases and `persistAndPublish` (lifecycle service, whole file read); the retry predicate is prepared-run-only (`isExactOriginalPrepared`, `unchangedPreparedIsRetryable`) as the design says; the preface route and `AgentRunPlatformNotices` (first notice wins, one per input); the journal service uses one runtime per run (`work-journal-service.ts:166,222`) as F-24 says; the library store appends by path (`autobyteus-ts/.../run-memory-file-store.ts:404`).
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): Yes, all four present. Review authority: findings cite REQ/AC/BEH; new behavior is a `Requirement Gap`.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): Yes (ARCH-F-001: REQ-010, AC-002, AC-009; ARCH-F-002: REQ-001, REQ-013, AC-001, AC-007).
- Remaining material ambiguity, if any: none in the requirements. The user decision on the stored runtime spelling is open (ARCH-F-004).
- Statements about existing code the design relies on, opened at their cited lines: all but two hold. (1) "`isExactTarget` … handles the removed pending field" (design spec, bounded local spine) is true of the comparison but not of the writer it compares against: `recordRunStarted` does not remove the field (ARCH-F-001). (2) "Derived consumers: … no reader needs the field except the lifecycle service and the updater" is incomplete (ARCH-F-002).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (updater seam, F-25 confirmed; `delegated-launch-selection-service.ts:150` is a second caller of the changed input, not listed) | Pass | Confirmed | List the second caller (ARCH-F-002) |
| BEH-002 | System | Pass | Pass for the lifecycle code; `Fail` for the first-message path of an eligible run, which goes through `AgentRunService.activate` → `resolveRootAndEnsureHost` → `StandaloneHostAgentHandle.ensureReady` → `activateHost` (`agent-run-service.ts:307-310`, `standalone-host-agent-handle.ts:60`) and the spine starts at the lifecycle | Fail: step "commit metadata (pending cleared)" is not expressible with `recordRunStarted` | Needs Correction | ARCH-F-001, ARCH-F-002 |
| BEH-005 | User | Pass | Pass (marker as notice, F-28; live notice not in `RECORDED_SYSTEM_NOTICE_SENDER_IDS`, confirmed at `runtime-memory-event-accumulator.ts:25-30,258`) | Pass | Confirmed | None |
| BEH-007 | System | Pass | Pass (F-24 confirmed; the journals step skips unchanged runs by raw-trace fingerprint, `journals-step.ts:45-70`) | Pass for archived files and for runs that never switched; the open file during the pending window is unspecified | Confirmed, with one correction | ARCH-F-003 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `run-runtime-switch-contract.md` v2 | Pass | Pass (design spec lists it; investigation inventory lists it) | Fail: §3.3 step 4 and I-6 assume the commit clears the pending field through `persistAndPublish`; I-4 and I-9 say the open file's runtime is `run_metadata.runtimeKind`, which is false while a switch is pending | Fail on the same two points | Pass (v2, approved with the design) | ARCH-F-001, ARCH-F-003 |
| `follow-ups.md` | Pass | Pass | Pass | Pass; FU-006 cites "DESIGN rule 15", which should be DESIGN rule 10 / Principle 15 (ARCH-F-005) | Pass | ARCH-F-005 |
| `evidence/*.txt`, `probes/*` | Pass | Pass | Pass: synthetic data, real classes; they prove the rotation/marker/journal behavior, not the lifecycle commit | Pass | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Section "Task Design Health Assessment" | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Shared Structure Looseness` for the journal manifest, with F-24 reproduced and measured | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Per-file journal runtime now (small); label mapping and `ModelConfig` names deferred with FU-006/007 | None (but see ARCH-F-004 on FU-006) |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, file mapping, rejection log | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Settings save | Pass | Pass | Pass (facades named) | Pass | Pass | Pass | Pass (second caller to list, ARCH-F-002) |
| DS-002 | First message → notice + marker | Pass | Pass | N/A | Pass | Fail: starts at `StandaloneAgentRunLifecycleService.resolve`, omitting the hops that drive an eligible run's activation (`AgentRunService.activate` → root `resolveRootAndEnsureHost` → `StandaloneHostAgentHandle.ensureReady`); the commit node is not expressible (ARCH-F-001) | Pass | Fail |
| DS-003 | Journal per-file runtime | Pass | Pass | Pass | Pass | Pass: owner of the open-file runtime fact is not named for the pending window (ARCH-F-003) | Pass | Pass with ARCH-F-003 |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `StandaloneAgentRunLifecycleService` | Pass | Pass | Pass | Pass | Only writer of `run_metadata.json` at activation; `recordRunStarted` is its catalog collaborator |
| `WorkJournalService` | Pass | Pass | Pass | Pass | Notice builder reads only `ensureCurrent`/`listJournalFiles` |
| `RuntimeSwitchRecorder` (memory) | Pass | Pass | Pass | Pass | Lifecycle never touches raw traces |
| `RuntimeHandoverNoticeService` | Pass | Pass | Pass | Pass | Needs `runReleased`/`runPublished` (it must satisfy `AgentRunPlatformNoticeSource`); see Recommendations |
| `StandaloneAgentRunRootManager` / root | Fail: not named in the design although it owns the eligible run's activation and builds its launch base from the metadata (`launchConfigurationOf`, `standalone-agent-run-root-manager.ts:73,400`) | — | — | Fail | ARCH-F-002 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution` → two ports in `agent-execution/domain/` | Pass | Pass | Pass: `agent-memory` and the notice subsystem already import `agent-execution` types (accumulator imports `agent-execution/domain/system-task-notification-senders.js`); the precedent for ports in this area is `agent-execution/services/standalone-run-ports.ts` and the preface port in `domain/` — both placements exist | Pass | The wiring chain is incomplete: the lifecycle service is built in `agent-execution/runtime/general-process-run-supervisor.ts:311` (options come from `build-studio-server.ts`) and in `application-platform/execution/application-execution-scope-kernel-builder.ts:257` (application-owned runs). The design names only `build-studio-server.ts` (ARCH-F-002) |
| Notice service → `WorkJournalService` | Pass | Pass | Pass | Pass | |
| Journal → label mapping | Pass | Pass | Pass | Pass | |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `updateStoppedAgentRunModelConfig` (+`runtimeKind`) | Pass | Pass (one decision: model-only / switch / undo, one owner) | Pass | Low | Pass; the name discrepancy is recorded (ARCH-F-005 asks only to correct one sentence) |
| `commitAgentRunRuntimeSwitch` | Pass | Pass | Pass | Low | Pass |
| `RuntimeSwitchMemory.record`, `RuntimeHandoverNotices.register(runId)` | Pass | Pass | Pass | Low | Pass |
| `persistAndPublish` retry check supplied by the caller | Pass | Pass | Pass | Low | Pass in shape: it is a policy over metadata, not a handle to another collaborator, so Principle 13 is not breached. A boolean on the existing parameter would be simpler (Recommendations) |
| The committing writer for the switch activation | Fail: not named; `recordRunStarted` cannot express it | — | — | — | Fail (ARCH-F-001) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Settings save, rotation primitive, notice route, marker as notice, journal listing, runtime display name | Pass | Pass | N/A | Pass | Sound reuse; confirmed in code |
| Writer of the activation commit | Pass (reused `persistAndPublish`) | Fail: the existing catalog writer (`recordRunStarted`) is reused without checking that it can write the new shape | N/A | Fail | ARCH-F-001 |
| Runtime label mapping | Pass | Pass for the code shape; the permanent mapping itself needs the user's decision | Pass | Pass with ARCH-F-004 | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution`, `run-history`, `agent-memory`, `agent-work-journal`, `llm-management`, `api/graphql`, web, `autobyteus-ts` | Pass | Pass | Pass | Pass | `run-history` must also own the clear-pending write (ARCH-F-001) |
| `standalone-agent-run-root` | Fail: absent from the allocation | — | — | Fail | ARCH-F-002 |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider binding (`RunProviderBinding = Pick<AgentRunMetadata, …>`) | Pass | Pass | Pass | Pass | |
| `RuntimeSwitch` built once | Pass | Pass | Pass | Pass | Key, names and marker sentence in one place |
| Label ⇄ `RuntimeKind` mapping | Pass | Pass | Pass | Pass | The five backends still write their own literals (FU-006): add a round-trip test so the new table cannot drift from them (Recommendations) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `pendingRuntimeSwitch {requestedAt, from}` | Pass | Pass | Pass | N/A | Pass | Undo with a different model of the original runtime is not specified (Recommendations) |
| Journal manifest file `runtime_kind` (`null` = no-runtime rules, absent = render again) | Pass | Pass | Pass | N/A | Pass | The parser must tell `null` from absent |
| Raw manifest `boundary_type: runtime_switch` | Pass | Pass | Pass | N/A | Pass | |
| `RuntimeSwitch` | Pass | Pass | Pass | N/A | Pass | |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Fail`. Missing: (a) `StandaloneAgentRunRootManager.launchConfigurationOf(metadata)` and the root's inherited launch base (`standalone-root-collaborators.ts:30`), (b) `standalone-root-member-view-projection-service.ts:140`, (c) `delegated-launch-selection-service.ts:150` (caller of the changed input), (d) the token-usage readers of `runtimeKind` (F-19 listed them "not yet checked"; `token-usage/providers/*` already aggregate several runtime kinds per run — `observed_runtime_kinds`, per-identity facets — so the likely decision is "no change", to be recorded), (e) `memory-run-discovery.ts:146` (supplies the journal target's runtime, ARCH-F-003). → ARCH-F-002.

Each domain word the design uses or introduces keeps one meaning, and each concept one name, across code, data, wire, tools, UI, and docs (Principle 15): `Pass` for the new words; the two recorded discrepancies are judged in ARCH-F-004 and ARCH-F-005.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Files in the mapping table | Pass | Pass | Pass | Pass | Lifecycle file 376 lines + about 60: stays under 500; decision stated |
| Files missing from the mapping | Fail | — | — | Fail | `run-history/services/agent-run-history-catalog-service.ts` (clear-pending write), `agent-execution/runtime/general-process-run-supervisor.ts` and `application-platform/execution/application-execution-scope-kernel-builder.ts` (construction/wiring of the lifecycle service), `run-history/services/delegated-launch-selection-service.ts` (caller), `standalone-agent-run-root/**` (decision only). ARCH-F-001, ARCH-F-002 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New files in the mapping | Pass | Pass | Low | Pass | `runtime-handover-notices/` mirrors `tool-list-updates/`, `skill-update-notices/` |
| `runtime-handover-notices/runtime-handover-notices.ts` | Pass | Pass | Low | Pass | Conditional; drop if it only constructs the service |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Run-level journal `runtime_kind`; `runtime-locked` for eligible runs; model-only mutation input | Pass | Pass | Pass | Pass | Dead-code check named for implementation (`lockedModels`, store's model-only path) |
| `unchangedPreparedIsRetryable` / `isExactOriginalPrepared` after generalization | Fail: not named; if the caller supplies the check, the two private pieces become dead or change meaning | Pass | Fail | Fail (minor) | Name them in the removal plan when ARCH-F-001 is revised |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Journal manifest run-level field; mutation input | No | Pass | Pass | |
| Stored runtime spelling mapping | Yes — a permanent mapping from a stored name to a code name | Not applicable: a recorded, deliberate deviation from DESIGN rule 10 and Principle 15 | Pass with ARCH-F-004 | The user's decision is required |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `run_metadata.json` `pendingRuntimeSwitch` | `Directly Usable — No Migration` | Pass: optional field with its own parse, precedent `delegatedFrom`; the normalizer (`agent-run-metadata-store.ts:34-56`) must carry it; run rows hold no runtime (`normalizeRow`, catalog service :77-89), so nothing else is denormalized | Pass | N/A | Pass | The write that clears it is the open question (ARCH-F-001) |
| `raw_traces_manifest.json` `boundary_type: runtime_switch` | `Directly Usable — No Migration` | Pass (3,786 entries read; none has the value; readers do not branch) | Pass | N/A | Pass | |
| `work_journal_manifest.json` per-file runtime | `Discard or Rebuild` | Pass: derived; `readManifest` drops invalid entries; the journals step re-ensures a run only when its raw-trace fingerprint changes, so the rebuild is lazy and bounded; identical text means unchanged evidence hash and the index pipeline already tolerates a repeat (`memory-index-pipeline.ts:174-178`) | Pass | N/A | Pass | Dropping an entry that lacks the field rewrites identical files once and fires one journal-change notice per run: cheap, no action |
| Stored runtime spelling | Keep (FU-006), one mapping file | Pass as evidence; the choice conflicts with DESIGN rule 10 | Needs the user's explicit decision | N/A | Pass with ARCH-F-004 | |

No migration is required, and none is demanded.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–9 of "Change / Refactor Sequence" | Pass in order: library → memory → journal → metadata → settings → activation → web | Pass (none needed) | Pass | Pass, but step 6 cannot be built until ARCH-F-001 names the commit writer and step 5/6 list the root hop and wiring (ARCH-F-002) |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Where the switch happens, marker, notice | Yes | Pass | Pass | Pass | |
| The activation commit | Yes | Fail: no shape for what `persistAndPublish` writes and compares in the switch case | N/A | Fail | Show the stored and target metadata of a switch (pending present → absent, `platformAgentRunId` null → S) and which writer produces the target (ARCH-F-001) |

## Material Premise Validation (Only When Needed)

### `MP-1` — A root of the switched run is still registered (host offline) when the settings are saved and the first message is sent

- Related approved requirement or established contract: REQ-001, REQ-013, AC-001.
- Relevant behavior ID(s): BEH-001, BEH-002.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: the user stops the run (explicit Stop) → `StandaloneAgentRunRootManager.stopRoot` → root unregistered (`standalone-agent-run-root-manager.ts:202-216`); then saves the settings and sends a message.
- Support evidence: exposed surface: run Stop and the settings of a stopped run. For this trigger the root is gone at save time, and the first message builds a new root from the current metadata (`:380-400`), so `rootLaunchConfiguration` is correct.
- Forward current or approved target production caller/event path: Stop → `stopRoot` → `unregister`; save → lifecycle `updateStoppedModelConfig`; first message → `resolveRootAndEnsureHost` → new root → `ensureReady` → `activateHost`.
- Lifecycle preconditions and material consequence at the claimed point: none for this trigger. A root surviving with its host offline is documented only for idle shutdown of a run a peer node delegated to this node (`:237` comment; `standalone-host-idle-shutdown.ts` header), which is out of scope. Whether a host that fails without a user Stop (the usage-limit case) leaves its root registered was not established in the design or by this review.
- Reachability: `Unclear` for a host that fails and is not stopped; `Not Reachable` for the Stop path.
- Review consequence / proportionate response: no machinery is required. The design must state which case holds, from the code (does the settings save or the first message ever meet a registered root of a switched run, and what does a registered root's `rootLaunchConfiguration` do then?). ARCH-F-002 asks for that statement only.

### `MP-2` — The journal of a run with a pending switch is rendered before the switch is made

- Related approved requirement or established contract: REQ-012, AC-006.
- Relevant behavior ID(s): BEH-007.
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger or applicable governing contract: the user's Rebuild of the memory index (`regenerate`), or the first index pass over a run not yet indexed (stored fingerprint differs from the current one) — both normal memory-search operations independent of this design.
- Support evidence: `journals-step.ts:45-70` calls `ensureCurrent({runId, memoryDir, runtimeKind: run.runtimeKind}, {regenerate})`; `memory-run-discovery.ts:146` takes `runtimeKind` from `metadata.runtimeKind`.
- Forward current or approved target production caller/event path: save switch (metadata.runtimeKind = new runtime B, active file still holds the previous runtime A's records) → memory-search pass → `ensureCurrent` with B → open file rendered with B's rules under the design's rule "open file: the run's current runtime".
- Lifecycle preconditions and material consequence at the claimed point: wrong tool wording in the derived open-file journal (the same defect F-24 reproduces) until the first message; self-healing, because the switch archives that file and the new files are rendered with the right runtime. A run may stay pending for a long time.
- Reachability: `Reachable` (low consequence).
- Review consequence / proportionate response: ARCH-F-003 (state the rule; no new machinery).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Which writer clears `pendingRuntimeSwitch` at the activation commit | The success path of every switch would be quarantined | ARCH-F-001 | Open |
| The root hop and the construction/wiring sites of the lifecycle service | The first-message spine and the ports' wiring are incomplete | ARCH-F-002 | Open |
| The open-file runtime while a switch is pending | Invariants I-4/I-9 are false in that window | ARCH-F-003 | Open |
| The user's decision on the permanent label mapping (DESIGN rule 10) | A mandatory project rule is deviated from | ARCH-F-004 | Open — user approval |

## Review Decision

`Fail`

## Findings

### ARCH-F-001 — The activation commit cannot clear the pending switch; every switch would be quarantined

- Type: `Design Impact`
- Severity: High (blocking)
- Approved requirement / acceptance criterion protected: REQ-010, REQ-002 (the first input after a switch), AC-002 ("the runtime receives the notice then the user's text … a second message has no notice"), AC-009 ("the run usable"); BEH-002.
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Affected behavior / existing behavior: step 4 of the activation (design spec, "Bounded Local / Internal Spines"; contract §3.3 step 4: "Commit metadata through the lifecycle's existing `persistAndPublish`: new `platformAgentRunId`, `pendingRuntimeSwitch` removed").
- Evidence: `persistAndPublish` writes with `this.historyCatalogService.recordRunStarted(input.target)` (`standalone-agent-run-lifecycle-service.ts`, first lines of `persistAndPublish`). `recordRunStarted` (`run-history/services/agent-run-history-catalog-service.ts:202-232`) takes only `{runId, platformAgentRunId?, runtimeKind?, startedAt?}`, reads the stored metadata and writes `{...metadata, runtimeKind, platformAgentRunId, startedAt}`; every other field of the `target` is ignored, so `pendingRuntimeSwitch` stays in the file. Then `isExactTarget(persisted, target)` compares `JSON.stringify` of metadata that still has the field with a target that does not: false; the re-read is the same; the prepared-retry branch does not apply; the result is `abortForIndeterminateCommit`, which quarantines the run until restart (`quarantines.set` in `resolveInsideTransition`). This happens on the success path, not only on a failure. The design records this as an "escalation trigger" ("`recordRunStarted` cannot express removal of the pending field") although the code shows it does today. The design's premise check (`isExactTarget … handles the removed pending field`) examined the comparison but not the writer. The folder and data-model probes do not exercise the lifecycle commit, so no evidence contradicts this reading.
- Material-premise validation: none needed (a static code fact on the supported first-message path).
- Required update: in `design-spec.md` and the contract (§3.3 step 4, I-6): (1) name the one writer of the activation commit for the switch case in `run-history` (either an explicit "clear the pending switch" input on `recordRunStarted`, or a dedicated catalog method used only by the switch activation) and add `agent-run-history-catalog-service.ts` (and its test) to the file mapping and the change inventory; (2) show the stored and target metadata of a switch commit as a short example (pending present → absent; `platformAgentRunId` null → the new session; `startedAt` unchanged); (3) state the retry rule for that commit: a commit that did not land leaves the stored metadata equal to the pending original, so the activation aborts its candidate and the next send retries. A boolean on the existing parameter (`unchangedPreparedIsRetryable` generalized to "unchanged is retryable", with `original` carrying the pending metadata) is enough; a passed-in function is not needed. Name the replaced private pieces in the removal plan; (4) turn the escalation trigger into a decided step.
- Why proportionate: it is the single step that makes the feature usable; the fix is one named writer and one tightened comparison inside owners the design already uses.
- Recommended recipient: Solution Designer.

### ARCH-F-002 — The first-message path, the callers and the wiring of the changed structures are not fully traced

- Type: `Design Impact`
- Severity: Medium (blocking)
- Approved requirement / acceptance criterion protected: REQ-001, REQ-013, AC-001, AC-007 (existing restore and model-only edit unchanged); BEH-001, BEH-002. Principles 1, 2, 11 (and the "several kinds or forms" trigger).
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Affected behavior: the activation and save paths of the ordinary standalone Agent run, which is a collaboration-eligible run with a `StandaloneAgentRunRoot`.
- Evidence (all verifiable without a premise):
  1. DS-002 starts at `StandaloneAgentRunLifecycleService.resolve`. For an eligible run the lifecycle is reached only through `AgentRunService.activate` → `standaloneRuns.resolveRootAndEnsureHost` → `StandaloneHostAgentHandle.ensureReady` → `activateHost` with the root-built member context (`agent-run-service.ts:307-310`, `standalone-host-agent-handle.ts:50-61`); `activateOnce` rejects an eligible run activated without one (`standalone-agent-run-lifecycle-service.ts`, `isCollaborationEligibleStandaloneRun … !== Boolean(input.memberExecutionContext)`). The root and the handle are not in the spine, the ownership map or the allocation table.
  2. `updateStoppedModelConfig`'s input gains a required `runtimeKind`, and a second caller exists: `run-history/services/delegated-launch-selection-service.ts:150` (case `"AGENT"`, the host's own model saved after the copies' tree). It is not in the file mapping or the derived-consumer list. The design must say what that path sends (its current runtime; model-only) and that it never creates a switch.
  3. The lifecycle service is constructed in two places: `agent-execution/runtime/general-process-run-supervisor.ts:311` (options from `build-studio-server.ts`) and `application-platform/execution/application-execution-scope-kernel-builder.ts:257` (application-owned runs, which cannot switch). The two ports have to reach the first through the supervisor's options; the design names only `build-studio-server.ts`. State whether the ports are required or optional at the second site, and how a missing port fails closed (a switch is never attempted there: `canSwitchRuntime` excludes those runs).
  4. The root builds an inherited launch base once, from the metadata, when it is created (`standalone-agent-run-root-manager.ts:73-80,400`; used by delegated copies at `standalone-root-collaborators.ts:30`), and the member view projection reads a launch's runtime (`standalone-root-member-view-projection-service.ts:140`). The updater does not look at the root (it checks only `getActiveRun`), whereas the sibling edit of a stored tree treats a registered root as active (`updateStoredTree`: `hasRoot` → `RUN_ACTIVE`). See `MP-1`: after an explicit Stop the root is gone and the first message builds a new one from the new metadata, so the common path is correct; the case of a registered root with an offline host is unestablished.
  5. The token-usage readers of `runtimeKind` (F-19 "not yet checked") are still unchecked in the design. `token-usage/providers/*` aggregate several runtime kinds per run (`observed_runtime_kinds`), so the expected decision is "no change"; record it.
- Material-premise validation: `MP-1` (`Unclear` for a failing host without a Stop; `Not Reachable` for the Stop path) — it asks for a statement, not for machinery.
- Required update: (a) extend DS-002 (and the ownership map) with the root hop, or state that the lifecycle is reached through it and that the switch activation relies on the root-built member context unchanged; (b) add the second caller, the two construction sites with the supervisor's options, and the root/member-view/token-usage readers to the derived-consumer list with a decision for each; (c) state, from the code, whether a registered root can exist when a switch is saved or the first message is sent, and the consequence for its inherited launch base; add machinery only if the answer is yes (for example refuse the save while a root is registered, as `updateStoredTree` does, or let the root read its launch base from the current metadata).
- Why proportionate: the changes are a complete inventory of what already exists; machinery is required only if the evidence in (c) shows a supported state.
- Recommended recipient: Solution Designer.

### ARCH-F-003 — The runtime of the open raw-trace file is wrong while a switch is pending

- Type: `Design Impact`
- Severity: Low (fix in the same revision; not blocking by itself)
- Approved requirement / acceptance criterion protected: REQ-012, AC-006; BEH-007; contract I-4, I-9.
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Evidence: the lookup rule (contract §3.2, design DS-003) gives the open file "the run's current runtime (`run_metadata.json`)". From the settings save until the first message the metadata holds the new runtime while the open file still holds the previous runtime's records; the previous runtime is `pendingRuntimeSwitch.from.runtimeKind`. The journal target's runtime is supplied by callers (`journals-step.ts:63`, from `memory-run-discovery.ts:146`; the live updater uses `run.runtimeKind`), so the window is reachable (`MP-2`). Invariants I-4 and I-9 as written fail in that window. The effect is the same wrong wording that F-24 reproduces, in derived files that the switch later replaces.
- Material-premise validation: `MP-2` (`Reachable`, low consequence).
- Required update: state the open file's runtime as "the runtime that wrote it": `pendingRuntimeSwitch.from.runtimeKind` while a switch is pending, otherwise `metadata.runtimeKind`; name the single owner that derives it (the discovery/target builder or the journal service, not both) and amend I-4 and I-9 to say so. No new mechanism.
- Why proportionate: one rule and two invariant sentences; it makes the invariants checkable.
- Recommended recipient: Solution Designer.

### ARCH-F-004 — The permanent runtime-label mapping deviates from DESIGN rule 10 and needs the user's explicit decision

- Type: `Requirement Gap` (user approval required)
- Severity: Medium (blocks the build until decided; the design already plans to ask the user)
- Approved requirement / acceptance criterion protected: none directly; REQ-012 needs the stored label. Authority: `DESIGN.md` rule 10 ("Never keep an old stored name behind a permanent mapping in current code") and Principle 5/15.
- Scope status: `Requirement Gap — User Approval Required`
- Required update changes approved behavior: `No` for the product; it is a project-rule exception.
- Evidence: the design adds `agent-memory/domain/raw-trace-runtime-label.ts` as the permanent owner of `RuntimeKind` ⇄ `CODEX/CLAUDE/ANTIGRAVITY/GROK_BUILD/AUTOBYTEUS` and keeps the five backends' own literals (FU-006). The design states the discrepancy honestly, but words it as the default ("Needs your OK if you want the migration instead"), and its principle audit table does not list DESIGN rule 10 at all (it lists rules 1, 4, 5, 7, 8, 9). A mapping is unavoidable if the stored spelling stays, since a new writer must pick a spelling and the journal must read the old ones. The alternative is a sealed migration of the `runtime_kind` values of 820 raw-trace manifests (small JSON files, not the traces); its weight is for the user to judge, not for this review.
- Required update: present the choice to the user as an exception to a mandatory rule that needs his approval (mapping now with FU-006, or a sealed migration first), cite rule 10, and record his answer in the design spec before the build. Add DESIGN rule 10 to the principle audit row. I do not prescribe either answer.
- Recommended recipient: Solution Designer (to obtain the decision).

### ARCH-F-005 — Documentation corrections in the vocabulary and audit records

- Type: `Design Impact`
- Severity: Low (non-blocking; correct with the next revision)
- Approved requirement / acceptance criterion protected: none (Principle 15, DESIGN rule 10; the Task constraint "GLOSSARY.md vocabulary").
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Evidence and required update:
  1. The design says both discrepancies "already exist; this change does not create them". For the stopped-run edit this is not accurate: before this change `…ModelConfig` named exactly what the edit did; with `runtimeKind` in the input, the name now says less than the operation does (Principle 15 signal "a tool or API name that says less … than it does"). Keeping the name until the teams follow-up is a reasonable recommendation for the user to accept (renaming the agent chain alone would split a family), but the text should say this change creates the drift and put it to the user as a decision, as FU-006 is.
  2. FU-006 and the discrepancy text cite "DESIGN rule 15"; `DESIGN.md` has rules 1–10, and the rule is 10 (Principle 15 is the general counterpart).
- Recommended recipient: Solution Designer.

## Classification

`Design Impact` (ARCH-F-001, -002, -003, -005) and `Requirement Gap — User Approval Required` (ARCH-F-004). Primary classification for routing: `Design Impact`.

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Recommendations (non-blocking; for the same revision)

- Notice source order: `AgentRunPlatformNotices` hands over the first notice it finds, one per input (`agent-run-platform-notices.ts:29-41`), and composition lists "tool list updates first, then skill notices" (`build-studio-server.ts:344`). State where the hand-over source goes (first, so a pending tool-list notice cannot delay it by one input) and test it.
- The notice service must satisfy `AgentRunPlatformNoticeSource = AgentRunInputPreface & AgentRunLifecycleObserver`: say what `runReleased` does with a pending hand-over (keep it, since a restored run of the same ID still has not received it) and what `runPublished` does.
- Undo with another model of the original runtime: say whether the chosen model and settings are written with `from.platformAgentRunId` restored (REQ-001 says the switch is undone; the model choice should not be lost silently).
- Real-backend check of I-7: scripted runtimes cannot show a real backend writing a raw-trace record between `prepare()` and the marker. In the real run, assert the archived segment holds only the previous runtime's records on each runtime pair tried.
- Add a round-trip test of the new label table against the labels each backend actually writes, so the table cannot drift while FU-006 is open.
- Recorder failure: say that a throw from the memory port aborts the candidate (`abortForRetry`) before the error propagates, as `validateCandidateOrAbort` does.

## Residual Risks

- A hand-over notice is held in memory; a restart between the activation and delivery loses it (the marker and journals remain). Accepted by the design as outside the supported scenarios; unchanged by this review.
- A failed activation followed by an undo leaves a marker for a switch that did not happen; accepted and stated.
- The native writer holding the active raw-trace file across rotation remains the stated escalation trigger; no such writer was found (`run-memory-file-store.ts:404` appends by path).
- Whether continuation quality is acceptable is the new agent's model's work; not promised, per the requirements.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` (MP-1 `Unclear` and requires only a statement; MP-2 `Reachable`, low; no in-scope machinery depends on an unsupported premise)
- Notes: The architecture is sound and well-reasoned: the three-case activation, the marker as a notice record, the ports owned by `agent-execution`, the persisted-data decisions (no migration; derived journal rebuilt lazily) and the per-file journal runtime hold up against the code. The Fail is for one concrete defect on the success path (ARCH-F-001: the commit cannot clear the pending switch), one incomplete trace of the first-message path and its callers (ARCH-F-002), plus small corrections. After a revision that fixes ARCH-F-001, -002, -003 and -005 and records the user's decision on ARCH-F-004, I expect a Pass without further structural change.
