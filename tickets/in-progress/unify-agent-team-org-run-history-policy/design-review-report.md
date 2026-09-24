# Design Review Report — Unified Team/Org run-history policy

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-spec.md`
- Supplemental Task Artifacts Reviewed: None; branch and prior fixture are evidence references, not supplements.
- Relevant Solution Revision IDs: `SR-001`–`SR-004`; approved baseline `SR-002`; triggering correction `SR-004`.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: `SR-004` revised Architecture Design Complete resolving ARCH-REV-001/DR-001.
- Prior Review Round Reviewed: 1 — ARCH-REV-001 Fail / DR-001.
- Latest Authoritative Round: 2.
- Current-State Evidence Basis: investigation source log, direct inspection of family catalogs, managers, index stores, run services, GraphQL mutations and workspace history UI in the isolated worktree; recorded representative index fixture. No executable test pass is claimed.

## Routing Classification Review

- Task size: `Medium`.
- Architectural risk: `High`.
- Classification rationale reviewed: Existing capability area, but cross-family persistence authority, queue scope, multi-file compensation and explicit repair are materially risky.
- Independent Architecture Review required by the classification: `Yes`.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` — SR-004 aligns the Team archive gate with the approved lifecycle and actual manager lane.
- Approved requirements / intended behavior understood: Index-authoritative admitted rows; read-only catalog queries; lifecycle-maintained rows; imported memory read-only; explicit offline/local repair; missing empty, corrupt error/no overwrite.
- Relevant existing behavior and evidence confirmed: Team index-only query and memory-directory state; Org first-instance tree reconciliation; manager create/admit before history event; current Team archive uses only an outside-queue active check, whereas Team delete and Org archive/delete enter manager transition gates. SR-004 explicitly changes Team archive/unarchive to the existing per-root lane.
- Scope guardrail confirmed: UC-001–004 in scope; standalone Agent, execution-tree schema, unrelated UI/API and historical migration redesign out of scope; supported lifecycle, admission, data continuity and failed-mutation behavior preserved; review cannot add policy.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` — REQ-002/004 and AC-002.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | None. |
| BEH-002 | System/user | Pass | Pass | Pass | Confirmed | SR-004 specifies queue → per-root manager lane → inside-lane inactive check → full transaction/compensation. |
| BEH-003 | User/operational | Pass | Pass | Pass | Confirmed | Conditional Org source integration remains tied to branch merge. |
| BEH-004 | Operational/contract | Pass | Pass | Pass | Confirmed | Keep explicit repair separate from reads/startup. |

## Supplemental Artifact Coherence Verdict

None. Investigation inventory and core artifacts consistently identify no behavior-defining supplements. The unmerged memory branch and prior fixture are explicitly evidence-only.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for current posture | Pass | Design has a dedicated refactor assessment. | None. |
| Root cause explicit/evidence-backed | Pass | Divergent initialization/state and Org memory bypass match current code. | None. |
| Refactor decision explicit | Pass | Refactor now; standalone and migration work deferred. | None. |
| Concrete design supports decision | Pass | Narrow core, family adapters, removal, manager-gated Team archive and tests are mapped. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | History listing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Create/restore/events | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Archive/delete | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Memory inspection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Offline repair | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Bounded core queue | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-003 now distinguishes the shared family catalog queue from the per-root manager transition lane, states queue → lane order for both families, and keeps the inactive check and compensation inside the lane. The SR-004 supported user-path and deterministic interleaving example make the scope concrete.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Family history catalogs / shared core | Pass | Pass | Pass | Pass | Core is internal; consumers use family IDs and catalog queries. |
| Family manager transition gate | Pass | Pass | Pass | Pass | SR-004 generalizes Team’s lane-gated deletion callback to archive/unarchive and retains Org’s gate. |
| Readiness / imported memory | Pass | Pass | Pass | Pass | Admission remains separate; imported source uses read-only owner query when merged. |
| Offline repair | Pass | Pass | Pass | Pass | Separate dry-run-first local command, no runtime caller. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Family adapters → core/stores/managers | Pass | Pass | Pass | Pass | Family transactions remain specialized. |
| Mixed history / memory sources → catalogs | Pass | Pass | Pass | Pass | Direct Org store bypass is removed conditionally. |
| Maintenance → app-data profile/readiness/stores | Pass | Pass | Pass | Pass | No reverse dependency from runtime. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Family `listCatalogRows` / `getCatalogRow` | Pass | Pass | Pass | Low | Pass |
| Core family-keyed row/queue operations | Pass | Pass | Pass | Low | Pass |
| Family archive/delete operation | Pass | Pass | Pass | Low | Pass |
| Offline repair command | Pass | Pass | Pass | Low | Pass |

The revised Team manager callback names an exact root ID and exposes managed/completed outcomes; the core remains internal and family-specific adapters retain the transaction.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog state/policy | Pass | Pass | Pass | Pass | Reuses run-history area and current stores. |
| Admission | Pass | Pass | N/A | Pass | Reuses shared readiness owner. |
| Repair | Pass | Pass | Pass | Pass | Existing standalone repair is posture precedent, not reused policy. |
| Team archive gate | Pass | Pass | N/A | Pass | SR-004 uses the existing Team `withRootTransition` lane through a generalized inactive-history callback. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services` core and adapters | Pass | Pass | Pass | Pass | Narrow shared policy, specialized tree transactions. |
| Family run managers | Pass | Pass | Pass | Pass | Team’s generalized inactive-history callback now owns the per-root transition check and transaction lifetime. |
| `run-history/maintenance` | Pass | Pass | Pass | Pass | Offline boundary. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Family-keyed row state/init/queue/admission/summary | Pass | Pass | Pass | Pass | No generic tree transaction or union row. |
| Family-specific projector/compensation | Pass | Pass | Pass | Pass | Correctly remains specialized. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Core `Row` plus `idOf` | Pass | Pass | Pass | Pass | Pass | No second persisted representation. |
| `(resolved memoryDir, family)` state | Pass | Pass | Pass | Pass | Pass | State excludes injected manager/tree dependencies. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New `collaboration-run-history-catalog-core.ts` | Pass | Pass | Pass | Pass | State/queue/index-only read. |
| Team and Org catalog services | Pass | Pass | Pass | Pass | Family tree/transaction work retained; SR-004 specifies the Team gate correction. |
| Repair service and command | Pass | Pass | Pass | Pass | Separate from normal runtime. |
| Org memory source after merge | Pass | Pass | N/A | Pass | Conditional file not present on base. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services` core/adapters | Pass | Pass | Low | Pass | Existing flat capability folder is proportionate. |
| `run-history/maintenance` + script | Pass | Pass | Low | Pass | Command isolated from queries/startup. |
| Existing migration files | Pass | Pass | Low | Pass | Remain migration-owned. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org read-time reconciliation, `initialize`, `listRows` | Pass | Pass | Pass | Pass | Callers/tests updated. |
| Org memory direct store read | Pass | Pass | Pass | Pass | Conditional on branch merge. |
| Team diagnostic index service | Pass | Pass | Pass | Pass | Final import search required. |
| Historical migration writer/reconciler | Pass | N/A | Pass | Pass | Retained for one-time migration only. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Normal history catalog | No | Pass | Pass | No tree-scan fallback or Org alias. |
| Historical migrations | No | Pass | Pass | Isolated existing migration owners are not runtime compatibility paths. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Current Team/Org index arrays and package trees | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current strict readers accept existing eight-field shapes; representative isolated 1 Team/4 Org rows; no path/schema change; executable fixture validation remains implementation work. |
| Missing-row local repair | Explicit repair, not migration | Pass | Pass | N/A | Pass | Never rewrites valid rows or corruption; reports unrecoverable index-only fields and per-family completion. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Core introduction / family rewiring | Pass | Pass | Pass | Pass |
| Team archive gate and compensation | Pass | Pass | Pass | Pass |
| Offline repair / conditional memory source | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org create without preinit | Yes | Pass | Pass | Pass | Fresh-process example explains duplicate avoidance. |
| Team archive transition/queue ordering | Yes | Pass | Pass | Pass | SR-004 supplies Restore-first and Archive-first user-path interleavings plus deterministic barriers. |
| Repair loss limits | Yes | Pass | Pass | Pass | Missing versus corrupt and existing-row preservation are clear. |

## Material Premise Validation (Only When Needed)

### PM-001 — Team archive can pass a stale active check while the same run is restored

- Related approved requirement or established contract: REQ-002/004; AC-002 concurrent writes, preserved archive/restore outcomes and manager gates.
- Relevant behavior ID(s): BEH-002.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: One user archives an inactive retained Team run from the workspace-history action while another resumes the same retained run by sending a message from its Team context; AC-002 explicitly requires concurrent lifecycle writes to serialize.
- Support evidence: `autobyteus-web/composables/useWorkspaceHistoryMutations.ts:138-145` exposes archive; `autobyteus-web/stores/agentTeamRunStore.ts:246-260` issues `RestoreAgentTeamRun` when submitting to an inactive Team; GraphQL resolvers call the corresponding history/run services.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Workspace history archive → run-history store → `archiveStoredTeamRun` GraphQL → Team history service → catalog `setArchived`; concurrent message submission → Team run store → `restoreAgentTeamRun` GraphQL → Team run service → `AgentTeamRunManager.restoreTeamRun` under `withRootTransition`. `setArchived` currently checks `hasManagedTeamRun` before catalog enqueue, then later reads/writes the tree without entering `withRootTransition` (`team-run-history-catalog-service.ts:188-203`). Thus restore may register a managed run after the archive check and before the archive write.
- Lifecycle preconditions and material consequence at the claimed point: A retained inactive Team row/tree is visible for archive and can also be resumed by a user. The archive request can return success while the run is active, violating the preserved inactive-only archive boundary and making the tree/index archived while the run is managed. The shared history queue serializes catalog writes, not manager restore.
- Reachability: `Reachable` under two supported user actions and the approved concurrent-write contract; no hidden-file mutation or test-only trigger is needed.
- Review consequence / proportionate response: SR-004 now requires Team archive/unarchive to use the existing per-run transition lane with queue → lane acquisition, inside-lane inactive recheck, full transaction/compensation and deterministic interleaving tests. The reachable premise is addressed without new product behavior or generalized machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None. DR-001 was resolved by the verified SR-004 design correction; see ARCH-REV-002 prior-finding resolution.

## Review Decision

`Pass` — the approved behavior basis and target production paths are coherent, and the prior gate/lock-order defect is corrected in the authoritative design. This is a design pass, not an implementation or executable-test pass.

## Findings

None. DR-001 is resolved in ARCH-REV-002, not silently dropped.

## Classification

N/A — no open finding.

## Recommended Recipient

`/implementation_engineer` under the primary pass rule; `/solution_designer` receives the required informational pass notification after primary handoff succeeds.

## Residual Risks

- Executable compatibility and multi-instance/concurrency validation have not run in the fresh worktree because Vitest is absent; implementation/validation owns that check.
- The unmerged memory branch needs owner-query integration when it lands; the review does not claim its tests ran.
- Explicit repair cannot reconstruct absent index-only summary/termination; the design reports this and requires acknowledgement rather than pretending lossless recovery.

## Latest Authoritative Result

- Review Decision: `Pass`.
- Material-Premise Gate: `Pass` — PM-001 has an independent supported user-action path; no unsupported machinery was accepted.
- Notes: ARCH-REV-001/DR-001 is resolved by SR-004’s exact Team manager-lane and queue contract. Index-only policy, direct-use transition and offline/local repair boundary remain sound. No implementation or test-pass claim is made.
