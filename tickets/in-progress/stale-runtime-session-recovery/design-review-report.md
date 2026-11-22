# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/stale-runtime-session-recovery-599/tickets/in-progress/stale-runtime-session-recovery/requirements-doc.md` (SR-001, Approved within the direction; founder informed)
- Upstream Investigation Notes: `…/stale-runtime-session-recovery/investigation-notes.md`
- Upstream Solution Revision Record: `…/stale-runtime-session-recovery/solution-revision-record.md`
- Reviewed Design Spec: `…/stale-runtime-session-recovery/design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed: `probes/README.md` and the probe scripts (evidence); `follow-ups.md` (FU-001); `solution-designer-handoff.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `…/stale-runtime-session-recovery/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-002, the Solution Designer's response to ARCH-REV-001 (handoff "Round 2" section)
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`: AR-001, AR-002)
- Round 2 evidence:
  - design-spec Change Scope table (rows 1–5), Removal plan, Interface mapping, File mapping, DS-002;
  - a search of `src` and `tests` for the staged activation: `src` has only the handle and the flat-team wrapper; `tests` has `configured-agent-switch-activation.test.ts`, `configured-agent-execution-handle.test.ts`, `task-publication-handles.ts` and `root-recovery-command.test.ts`;
  - the users of the renamed replacement type and mutators (7 `src` files, all in the mapping).
- Correction to round 1: AR-002's evidence said "no caller in `src` or `tests`". Tests do call the staged activation; my search was cut short by an output limit. The finding stands under Principle 7's "code that only its own tests call", as SR-002 records.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/stale-runtime-session-recovery-599` at `0da6bfbfc1`. Files read:
  - Switch domain and memory: `agent-execution/domain/runtime-switch.ts` (whole); `agent-memory/services/runtime-switch-recorder.ts` (whole); `agent-memory/services/runtime-handover-reader.ts:5, 23`; `runtime-handover-notices/services/runtime-handover-notice-service.ts:22, 78`; `runtime-handover-notice-builder.ts:20-47`.
  - Activation: `agent-execution/services/agent-run-activation-operation.ts:65-85`; `standalone-agent-run-lifecycle-service.ts:205-232, 321-334`.
  - Member handle and planner: `configured-agent-execution-handle.ts:240-275, 378-400`; `configured-agent-activation-planner.ts:55-112, 162`.
  - Binding changes and their consumers: `collaboration-agent-platform-binding.ts` (whole); `agent-team-execution/local/flat-team-agent-execution-handle.ts:1-40, 88-89, 180-205`; `agent-team-execution/services/team-agent-platform-binding-committer.ts:25-55`; `agent-org-execution/domain/agent-org-run.ts:240-265`.
  - Searches: every `change.kind ===` consumer; every caller of `prepareConfiguredActivation` / `stagedNoConversationBindingReplacements` / `PreparedConfiguredAgentActivation` in the repository; `restoreStarted` / `platform_restore` callers; `DESIGN.md` (rule 13 is not on this base).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`. The change resequences activation in two owners, changes Claude's open timing on restore, writes persisted run data on a new trigger, and widens a stored name (D-1).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - Only on a runtime's exact "this session does not exist" signal, the activation continues the run in a fresh session of the same runtime and model, through the runtime-switch steps.
  - The marker shows the REQ-004 line, and the hand-over notice goes to the new session.
  - It is idempotent per lost session; it covers standalone runs, Team and Org members and delegated copies, on five runtimes.
  - Every other failure behaves as today.
- Relevant existing behavior and evidence confirmed:
  - **Marker text is stored, not rebuilt.** The marker sentence is the record's stored content (`runtime-switch-recorder.ts:31`); the notice and the chat read the stored text (`runtime-handover-reader.ts:23`, `runtime-handover-notice-service.ts:78`).
  - **The notice names no runtime or model** (`runtime-handover-notice-builder.ts:22-47`).
  - **The recorder is idempotent by key** and takes any `RuntimeSwitch` (`runtime-switch-recorder.ts:7-13`).
  - **A failed preparation releases first, then rethrows the original error**, or an `AggregateError` when cleanup is quarantined (`agent-run-activation-operation.ts:75-79`).
  - **Activation owners:** standalone activation enters through `activateRunAgent` (`agent-run-service.ts:365`; the collaboration root via `general-process-run-supervisor.ts:292`) into `restoreStarted`. Team members (through `FlatTeamAgentExecutionHandle`, which wraps the handle) and Org members (`agent-org-execution-scope-builder.ts`) activate through `ConfiguredAgentExecutionHandle`.
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: yes (AR-001 → REQ-006, AC-005, REQ-005; AR-002 → Principle 7 in touched files, under UC-001's change).
- Remaining material ambiguity: none.
- Statements about existing code the design relies on, checked; two are incomplete:
  - "Applied by the same tree writer as `replace_without_conversation`". Binding-change kinds are consumed in five places, two of them tree writers (AR-001).
  - DS-002 places delegated copies under the member handle. They may activate through the standalone lifecycle with a member context (`general-process-run-supervisor.ts:292`). Both owners get the renewal, so there is no gap (N-2).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (PRB-002, PRB-007) | Pass (DS-001, DS-003) | Confirmed | — |
| BEH-002…004 | User | Pass | Pass (PRB-003…005, 008) | Pass (DS-004) | Confirmed | N-1 (Grok exactness) |
| BEH-005 | System | Pass | Pass | Pass (typed error only; `AggregateError` never renewed) | Confirmed | — |
| BEH-006 | Contract | Pass | Pass | Pass (stored marker text; key-idempotent recorder; runtime-neutral notice) | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass (`replace_lost_session` decided in all five consumers; AC-005 through the real Team and Org roots; delegated copies on DS-001) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/README.md` + scripts | Pass | Pass | Pass | Pass | Pass (evidence, not behavior-defining) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec § Task Design Health | — |
| Root cause explicit and evidence-backed | Pass | `Missing Invariant`; the probes and data counts | — |
| Refactor decision explicit | Pass | Extract `activateInFreshSession`; split `beginSwitch` | — |
| Refactor reflected in sections | Pass | The removal plan lists the staged activation, its wrapper, and their tests and doubles | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | standalone renewal | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | member renewal | Pass | Pass | Pass | Pass | Pass (the flat-team guard, the Team or Org compare-and-set, and the caches are on the spine) | Pass | Pass |
| DS-003 | Claude restore check | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | other recognitions | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backends (recognition) | Pass | Pass | Pass | Pass | They throw the typed error only; they never decide to renew |
| Activation owners (decision, sequence, commit) | Pass | Pass | Pass | Pass | Each calls begin, prepare, record and commit itself (no split sequence) |
| Switch memory port | Pass | Pass | Pass | Pass | — |
| Member binding change → root writers | Pass | Pass | Pass | Pass | Shared compare-and-set, with neutral names (`CollaborationAgentBindingReplacement`, `replaceAgentPlatformBindingInTree`, `replaceAgentOrgPlatformBinding`) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backends → typed error; owners → error, builder, switch memory | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass`. Nothing new is looked up; the member path keeps its existing `getDefaultRuntimeSwitchMemory()` use.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `SavedRuntimeSessionMissingError` (`runtimeKind`, `platformAgentRunId`) | Pass | Pass | Pass | Low | Pass |
| `buildSessionRenewal` / `cause` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSession.verifyResumable()` | Pass | Pass | Pass | Low | Pass |
| `AcpAgentSessionProfile.isMissingSession(error, sessionId)` | Pass | Pass | Pass (Grok ignores the id; N-1) | Low | Pass |
| `beginSessionRenewal(config, lostId)` | Pass | Pass | Pass | Low | Pass |
| Binding change `replace_lost_session` (`replacement: { binding, expectedPreviousPlatformAgentRunId }`) | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass` (no port or wrapper is added).

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Fresh session + archive + marker + commit | Pass | Pass | N/A | Pass | Reused, parameterized by `RuntimeSwitch` |
| Hand-over notice | Pass | Pass | N/A | Pass | Unchanged; runtime-neutral |
| Member compare-and-set replacement | Pass | Pass | Pass | Pass with AR-001 | A new kind is right: "without conversation" would be a wrong meaning (Principle 15). Its consumers must be decided. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| backends, domain, services, agent-collaboration | Pass | Pass | Pass | Pass | — |
| agent-team-execution, agent-org-execution (root commit writers, flat-team handle) | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Fresh-session steps per owner | Pass | Pass | Pass | Pass | No third service |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RuntimeSwitch.cause` | Pass | Pass | Pass | N/A | Pass | Required on both builders |
| `CollaborationAgentPlatformBindingChange` + `replace_lost_session` | Pass | Pass | Pass | Pass | Pass | One replacement payload for both replacement kinds, under a neutral name |

Derived consumers of a changed structure (Principle 11): `Pass` (Change Scope table, rows 1–5).

One vocabulary (Principle 15): `Pass — deviation recorded, reason holds` (D-1; see Review Of The Designer's Specific Questions).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final File Responsibility Mapping | Pass | Pass | Pass | Pass | Includes the flat-team handle, the Team committer and mutator, and the Org run and mutator |
| `configured-agent-session-renewal.ts` (new, small) | Pass | Pass | N/A | Pass | Removing the dead staged activation (AR-002) also takes lines out of the 529-line handle |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All named files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `activateSwitched` → `activateInFreshSession` | Pass | Pass | Pass | Pass | Generalized, not duplicated |
| Staged member activation, its wrapper, its tests and doubles | Pass | Pass (the production activation) | Pass | Pass | Only its own tests called it |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Stored `runtime_switch` (D-1) | No (one widened meaning, no reader branch) | Pass | Pass | — |
| `AGY_CONVERSATION_ID_CONFLICT` | No (still the outcome for a mismatch without the not-found line) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Raw-trace segment + marker; `platformAgentRunId` (metadata or tree) | Not Affected (existing shapes, new trigger) | Pass | Pass | N/A | Pass | `previousRuntimeKind` equals the current kind for a renewal; journals render per segment, so no reader breaks |

DESIGN.md rule 13 (the founder's contract-first rule) is not on this base. The ticket adds no data shape. The external contracts it depends on, the runtimes' not-found signals, were validated against the real CLIs (PRB-001…008), which is what that rule asks for.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass | Pass | Pass (removal first, then the renewal) | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Recognition, Claude check, sequence, marker, key | Yes | Pass | Pass | Pass | — |

## Review Of The Designer's Specific Questions

- **D-1: reusing the stored `runtime_switch` boundary type.** `Pass — deviation recorded, reason holds`.
  - Every reader treats a renewal exactly as a switch:
    - the chat and the journal show the stored marker text (`runtime-switch-recorder.ts:31`);
    - the notice names no runtime (`runtime-handover-notice-builder.ts:22-47`);
    - the recorder is cause-blind.
  - So "a new runtime session continues the run here; the earlier records are handed over" is one meaning. A second stored type would be two names for that one concept, and a rename would need a sealed migration for no behavior.
  - Condition, already in the plan: the glossary defines the boundary as that one widened meaning, and `cause` stays the only code discriminator.
  - If a reader ever needs to tell them apart, rename then, through a sealed migration (DESIGN.md rule 10).
- **The Claude eager open on restore (RSK-003).** `Pass`.
  - A platform restore is reached only through an activation: an input (`agent-run-service.ts:365`; the collaboration root, `general-process-run-supervisor.ts:292`; a member's activation), or restart-resume of a busy run. Each needs the process at once, and the opened process serves the first input (QR-002: one start per activation).
  - PRB-007 shows the check is exact and costs 0.26 s for a present session.
  - The design's unit test that pre-turn frames do not fail a turn is the right guard.
- **Exactness of each recognition (REQ-002, AC-003).**
  - Claude (the initialization rejection text with the same id), Codex (`no rollout found for thread id <same id>`), Antigravity (stderr `conversation "<expected id>" not found` and an id mismatch) and DeepSeek (`-32602 … not resumable: <same id>`) each bind to the requested id: `Pass`.
  - Grok binds only to `data.code === "FS_NOT_FOUND"` with no id (PRB-005 carries none). That is not exact by itself. See N-1: a bounded probe in implementation, not a design change.

## Material Premise Validation

### MP-001 — A Team member's renewal commit reaches the flat-team handle's binding-change guard

- Related: REQ-006, AC-005; SCN-005 (Supported Normal; the observed run is a Team member).
- Initiating basis kind: `User`, a message to a Team member whose Claude session was cleaned up.
- Forward path:
  1. `ConfiguredAgentExecutionHandle` commits through `callbacks.commitPlatformBindingChange(change)` (`configured-agent-execution-handle.ts:386`).
  2. For Team members that callback is `FlatTeamAgentExecutionHandle`'s guard (`flat-team-agent-execution-handle.ts:182-205`). It handles `runtime_switch` and `replace_without_conversation` and treats any other kind as an adoption: it throws when `previous !== null && previous !== change.binding.platformAgentRunId`.
  3. A `replace_lost_session` that carries `binding` (as the design's interface shape states) type-checks into that branch. `previous` is the lost id and the binding holds the new id, so it throws "Flat Team Agent execution has a conflicting provider binding."
- The Team writer (`team-agent-platform-binding-committer.ts:34-40`) and the Org writer (`agent-org-run.ts:251-254`) fall into their `replace_without_conversation` branch and read `change.replacement`. A shape without it fails to compile; a shape with it is written as a no-conversation replacement. Either way it is undecided.
- Reachability: `Reachable`. Consequence: AR-001, resolved in SR-002 (guard `previous === lostId`; cache and config take the new id; a re-activation test).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, and the design is ready for implementation.

## Findings

None open. AR-001 and AR-002 are resolved in SR-002 (see the revision record, ARCH-REV-002).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- **N-1 (Grok exactness; adopted as an implementation probe on an isolated home, pinned either way).** Run one more probe in implementation: `session/resume` of a present Grok session whose workspace folder (cwd) was removed.
  - If Grok answers `FS_NOT_FOUND` there and `session/new` in that same state would succeed, narrow the matcher (for example by `data.detail` or by the request), and record it.
  - If the fresh session would fail too, a wrong match changes nothing, because no marker is written before the fresh session is valid. Pin the result in a unit test and the investigation notes.
- **N-2.** Adopted: delegated copies are on DS-001.
- **N-3.** RSK-002 (DeepSeek "not resumable") is accepted as recorded. A session that exists but cannot be resumed is a dead end either way.
- **N-4.** Adopted: application-scope runs are on DS-001.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002, SR-002)
- Material-Premise Gate: `Pass` (MP-001 resolved)
- Notes: the member renewal now reaches all five binding-change consumers through one shared replacement payload, and the dead staged activation is removed first. D-1, the Claude check and the recognition rules stand as judged in round 1.
