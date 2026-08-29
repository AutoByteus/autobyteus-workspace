# Solution Revision Record

The latest requirements, investigation notes, and design spec remain authoritative. This record preserves the concise solution-round baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User analysis request / initial round | N/A | Initial Baseline | Current behavior established; no implementation authorized |
| SR-002 | User feature request and stopped-only workflow approval / requirements and design round | BEH-001–BEH-007 | Requirement Gap | Approved stopped-only persisted model-configuration design ready for architecture review |
| SR-003 | Architecture review `ARCH-REV-001` and user clarification / rework round | F-001, MP-001 | Requirement Gap | Stopped existing-Team Reset removed from scope; corrected package ready for re-review |
| SR-004 | Code review `CRR-003` and user product-path correction / rework round | CR-F-002, MP-CR-001, MP-CR-002 | Requirement Gap | Sequential browser journey restored; only traced non-Settings runtime resolution retains lifecycle ordering; revision/multi-writer machinery removed from target design |
| SR-005 | Code review `CRR-006` / integrated-source rework round | CR-F-003, MP-CR-003, MP-CR-004; reclassified MP-SR4-004/006 | Design Impact | General/Application owner split reconciled through a durable Application binding lease and owner-aware Studio config service; sequential UI and separate managers preserved |

## Revision Entries

### SR-001 — Live Agent Definition edit visibility baseline

- Triggering role, report path, and round: User request; no report path; initial analysis round.
- Triggering finding IDs: N/A.
- Prior authoritative result: N/A.
- Current authoritative result: UI saves update definition persistence/catalog immediately, but newly configured skills/tools do not hot-refresh an active run; a new run is the reliable application boundary.
- Why this baseline or revision entry is recorded: Preserve the evidence-backed distinction among definition state, effective live runtime state, and source-file content freshness.
- Resolution: Analysis only; no code change.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-003; FR-001, FR-002; AC-001 through AC-005.
- Canonical artifacts and sections updated: `requirements.md`; `investigation-notes.md`; `design-spec.md`.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: No handoff required unless the user asks to implement live refresh.
- Next recipient or routing: User for current-state explanation.
- Remaining gaps or risks: Future live refresh semantics are undefined and require a new approved requirements round.

### SR-002 — Stopped-run model configuration editing

- Triggering role, report path, and round: User feature request and clarification round; no downstream report path; second solution round.
- Triggering finding IDs: BEH-001 through BEH-007.
- Prior authoritative result: SR-001 established that definition updates do not refresh an existing runtime and left live-refresh semantics undefined.
- Current authoritative result: A user manually stops an independent Agent Run or the entire root Team Run, edits only current-schema `llmConfig` values, and explicitly saves them while the subject remains stopped. The next message restores the same logical run/team with the saved settings. AutoByteus, Codex, and Claude must all honor the exposed values.
- Why this baseline or revision entry is recorded: The user converted the earlier analysis question into an approved feature and deliberately selected the simpler stopped-only lifecycle boundary instead of active-idle or hot-update behavior.
- Resolution: Refined and approved the requirements and UI/UX contract; completed architecture-level investigation and an implementation-ready design covering lifecycle serialization, persistence, validation, concurrency revisions, frontend drafts, Team scope semantics, and the Claude adapter gap.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-007; REQ-001 through REQ-015; AC-001 through AC-016.
- Canonical artifacts and sections updated: `requirements.md`; `investigation-notes.md`; all sections of the replacement `design-spec.md`; this revision record.
- Supplemental artifacts updated, added, or removed: Added and approved `ui-ux-spec.md` for stopped/active form states, contextual Save, Team hierarchy, error recovery, responsiveness, and accessibility.
- Downstream and architecture-review impact: Architecture review must decide whether the narrow Agent lifecycle refactor, Team root-lane extension, subject-specific GraphQL mutations, strict schema validation, and three-runtime restore application are ready for implementation.
- Next recipient or routing: `/architecture_reviewer` with the cumulative solution package.
- Remaining gaps or risks: Dynamic model/schema disappearance must fail closed; historical Team override provenance remains value-inferred; Team post-rename persistence may be indeterminate and requires canonical reconciliation; Claude behavior is designed against pinned SDK `0.3.231`.

### SR-003 — Remove Reset from stopped existing-Team editing

- Triggering role, report path, and round: `/architecture_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-review-report.md`; `ARCH-REV-001`, review round 1, followed by explicit user clarification.
- Triggering finding IDs: `F-001`; material premise `MP-001`.
- Prior authoritative result: SR-002 extended the pre-launch inherited/customized presentation and Reset action into the stopped existing-Team design. Architecture review failed because an `llmConfig`-only Reset has no valid inherited result when a configured scope's fixed runtime/model differs from its parent.
- Current authoritative result: The stopped existing-Team editor offers no Reset-to-inherited action. Each configured scope can edit its own schema-supported `llmConfig`; a parent change propagates only through the draft-start immediate-parent value-matching chain, while any divergent or directly edited scope and its branch remain unchanged. A direct edit wins regardless of edit order. Existing pre-launch Reset behavior is preserved without modification.
- Why this baseline or revision entry is recorded: The user explicitly approved the simplest resolution and confirmed that the stopped-run ticket should not import a full launch-authoring action that conflicts with fixed runtime/model identity.
- Resolution: Updated REQ-008 and AC-006, Team UX journey/state/copy, DS-003 planner behavior, examples, file responsibilities, sequencing, risks, and coverage guidance. No server mutation shape, lifecycle boundary, persistence decision, or runtime-adapter design changed.
- Approved behavior or requirement IDs affected: BEH-005; REQ-001, REQ-008, REQ-010, REQ-015; AC-005, AC-006, AC-012, AC-014, AC-015.
- Canonical artifacts and sections updated: `requirements.md` behavior/findings/REQ-008/AC-006/constraints/approval; `investigation-notes.md` request/source/findings/risks/reviewer notes; `design-spec.md` intended change/BEH-005/DS-003/planner/examples/sequence/risks/guidance; this revision record.
- Supplemental artifacts updated, added, or removed: `ui-ux-spec.md` re-approved after removing stopped-run Reset from UXJ-003, the Team wireframe, accessibility/action copy, risks, and approval status.
- Downstream and architecture-review impact: Re-review should close `F-001` by confirming fixed-identity divergence is now a propagation boundary, direct edits validate against the child model, no stopped-run Reset is rendered, and pre-launch Reset remains outside the changed path.
- Next recipient or routing: `/architecture_reviewer` with the full SR-003 package plus `design-review-report.md` and `architecture-review-revision-record.md`.
- Remaining gaps or risks: Stored override provenance remains unavailable, so parent propagation intentionally uses draft-start value equality plus direct-edit markers rather than reconstructed intent. Other SR-002 risks remain unchanged and were coherent in `ARCH-REV-001`.

### SR-004 — Ground coordination in verified production paths

- Triggering role, report path, and round: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-report.md`; `CRR-003`, followed by explicit user correction that normal browser use is Stop completion -> open Settings -> edit -> Save, not simultaneous tabs/users or hand-speed timing.
- Triggering finding IDs: `CR-F-002`; `MP-CR-001` reclassified Unclear; `MP-CR-002` reclassified Not Reachable for the asserted browser paths.
- Prior authoritative result: SR-003 and `ARCH-REV-002` accepted optimistic configuration revisions, stale-writer handling, Save/restore race scenarios, and broad lifecycle/persistence coordination. IR-001/IR-002 implemented those contracts through HEAD `08b11b3aa`.
- Current authoritative result: The browser path is strictly sequential and Settings entry—not Stop—owns a network-fresh canonical read before unlock. The public Save inputs/results contain no revision token or stale-writer outcome; the browser does not rebase concurrent drafts. A production-path caller audit established two supported independent runtime resolvers: external-channel ingress and Application Engine input can resolve stopped persisted runs without Settings action. The current per-run/root lane remains only to order Save against those verified paths. Other restore-aware Team callers were recorded as unclear overlap and drive no requirement or coverage. Revision policy and unrelated Team archive/delete expansion are removed from the target.
- Why this baseline or revision entry is recorded: It corrects the source/design overreach without weakening a real operational invariant. Mechanical browser possibilities no longer drive requirements, findings, implementation, or coverage, while existing non-Settings product behavior remains safe and traceable to its normal lifecycle owner.
- Resolution: Reworked the behavior map with BEH-008; REQ-009, REQ-014, AC-004, and AC-008; the UI loading/recovery states; current-branch investigation; data-flow spines; API/outcome shapes; ownership/removal/file maps; sequencing; risks; and coverage guidance. The target deletes `configurationRevision`, `expectedConfigurationRevision`, `STALE_REVISION`, the digest helper, revision-aware commit/store/rebase branches, concurrent-writer tests, and `withUnmanagedRootPersistence` archive broadening. It retains narrow Agent/Team mutations, lifecycle lanes for verified restore callers, Team propagation/no Reset, validation, physical persistence recovery, and runtime adapters.
- Approved behavior or requirement IDs affected: BEH-004 through BEH-008; REQ-005, REQ-009, REQ-011 through REQ-014; AC-004, AC-008, AC-010, AC-013.
- Canonical artifacts and sections updated: `requirements.md`; `investigation-notes.md`; all concurrency/current-state/API/ownership/removal/coverage sections of `design-spec.md`; this revision record.
- Supplemental artifacts updated, added, or removed: `ui-ux-spec.md` now makes Settings entry loading explicit, removes revision/multi-tab UX, and limits relock copy to verified independent system activation. No supplement was added or removed.
- Downstream and architecture-review impact: Architecture review must first decide whether the named non-Settings production triggers justify the retained owner lanes and whether every revision/archive/delete/concurrent-writer element is cleanly decommissioned. Only after Pass may implementation rework remove speculative source/tests. The API/E2E owner must then revise the existing draft investigation: API-E2E-003/004 may not run on their old browser premises and should be removed or replaced only by exact BEH-008 resolver coverage.
- Next recipient or routing: `/architecture_reviewer` with the cumulative package, including the current design/review/implementation/code-review/API-E2E artifacts for context.
- Remaining gaps or risks: Dynamic catalog/schema absence and physical write uncertainty still require fail-closed canonical recovery. Team override provenance remains value-inferred. Real-provider Claude execution remains environment-dependent, though the pinned SDK boundary is directly testable. Simultaneous browser writers are deliberately unspecified and require a separate approved ticket if ever productized.

### SR-005 — Reconcile integrated General and Application run ownership

- Triggering role, report path, and round: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-report.md`; `CRR-006`, implementation review round 5 after latest-base integration `IR-004` / `DR-001`.
- Triggering finding IDs: `CR-F-003`; new `MP-CR-003`, `MP-CR-004`; reclassified `MP-SR4-004`, `MP-SR4-006`.
- Prior authoritative result: SR-004 and `ARCH-REV-003` correctly restored the sequential human browser journey and removed revision/multi-client machinery, but incorrectly asserted that Application Engine input and Studio stopped Save converged on the same `StandaloneAgentRunLifecycleService` / `AgentTeamRunManager` instances.
- Current authoritative result: The sequential UI and all stopped-edit behavior remain unchanged. Integrated Application Engine and General Process retain their intentionally distinct managers, services, active maps, and transition lanes. Studio model-config access becomes owner-aware through two narrow additions: Application orchestration exposes a startup-ready exact-run ownership reader backed by canonical Agent/Team binding provenance, the global run lookup, and binding lifecycle; a host-composed `StudioRunModelConfigService` reads canonical history and guards the two resume reads and two update operations before delegating eligible work to General services. A nonterminal Application binding projects as locked/active and direct updates return `RUN_ACTIVE` with no write. Persisted provenance keeps the lease visible during supported post-start `reloadAndReenter` lookup rebuild. Application terminalization durably records terminal state before lookup release, after which normal Application input rejects that binding and later General stopped editing may proceed. Lookup/provenance inconsistency or readiness failure fails closed.
- Why this baseline or revision entry is recorded: CR-F-003 protects a normal Application launch/input path and the explicit active direct-update contracts, not an imagined browser race. Shared persisted IDs do not imply shared live authority; the solution must recognize the actual owner without merging managers or leaking Application internals into GraphQL.
- Resolution: Refined BEH-003/006/008, REQ-002/003/006/009/012, AC-003/004/008, constraints, and approval text; reclassified MP-SR4-004/006 and added MP-SR5-001/002/003; added DS-009; remapped DS-001/003/006/007, ownership/facade/dependency/interface/file boundaries, examples, implementation sequence, risks, and coverage. UI/UX adds no new controls or concurrency concept; owner-aware results reuse existing locked, loading/error, and `RUN_ACTIVE` presentation.
- Approved behavior or requirement IDs affected: BEH-003, BEH-006, BEH-008; REQ-002, REQ-003, REQ-006, REQ-009, REQ-012; AC-003, AC-004, AC-008; DS-001, DS-003, DS-005–DS-007, DS-009.
- Canonical artifacts and sections updated: `requirements.md`; `investigation-notes.md`; `design-spec.md`; this revision record.
- Supplemental artifacts updated, added, or removed: `ui-ux-spec.md` clarifies that Application live ownership reuses the existing locked/error states and that only General external restore shares the Save lane. No supplement was added or removed.
- Downstream and architecture-review impact: Architecture review must validate the ownership-lease invariants, startup-readiness and post-start reentry behavior, provenance/lookup cross-check, fail-closed handling, terminal-before-release ordering, composition seams, and absence of manager/store bypass. After Pass, implementation must add the two services and rewire only the four config operations; existing implementation and API/E2E results remain pre-SR-005 context until renewed source review and coverage investigation/execution.
- Next recipient or routing: `/architecture_reviewer` with the cumulative package, including CRR-006 and every still-relevant downstream artifact.
- Remaining gaps or risks: A live Application lease intentionally locks even a temporarily unmaterialized application runtime. Owner-aware Studio Stop/message/archive/delete routing and Application-specific stopped-config/resume APIs are outside this ticket. Dynamic schema absence, physical write uncertainty, Team override provenance, and real-provider Claude execution retain their existing bounded risks. Browser multi-writer behavior remains explicitly out of scope.
