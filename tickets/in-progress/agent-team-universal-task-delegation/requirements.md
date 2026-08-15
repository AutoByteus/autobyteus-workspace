# Requirements Doc

## Status (`Refined — User Approved; SR-009 Corrects CRR-001 CR-F-004 And Preserves CR-F-001–CR-F-003 For Implementation`)

The user approved the product direction, the exact three-file execution model, execution-tree navigation behavior, one-manager-per-TeamRun ownership boundary, migration requirement, and wider clean-cut implications. ARCH-REV-004 passed cumulative SR-008. CRR-001 then found that MGR-005 destroyed a task execution before its fallible settlement write, contradicting the already-approved committed-only release rule. SR-009 corrects that design without changing product behavior or persisted shape: terminal task status remains a task-record transition; settlement becomes a one-file execution-tree commit guarded by a reversible local quiescence capability; destructive local teardown begins only after that tree commit is durable. CR-F-001–CR-F-003 remain explicit implementation corrections.

## Goal / Problem Statement

Make AgentTeam collaboration obey one intuitive model inside one rooted TeamRun:

- a canonical absolute logical address selects any mounted Agent or AgentTeam placement;
- `delegate_task` creates a fresh execution for the selected placement;
- an AgentRun ID selects one exact existing Agent execution for `send_message_to`;
- a TeamRun ID selects one exact Team execution internally and in UI/runtime contracts;
- execution-tree containment says where a concrete execution lives;
- a task record says who delegated work to which fresh execution; and
- a communication record says which exact AgentRun sent an ordinary message to which exact AgentRun.

`delegate_task` must no longer resolve a valid same-root placement and then reject it because the placement is not a direct child of the caller's immediate Team. The refactor must also remove the parallel path/route/composite-execution identity structures that make the current behavior difficult to extend and reason about.

The target is universal **within one rooted TeamRun**, never global across unrelated roots.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Both tools accept absolute and relative expressions; `delegate_task` later rejects valid non-direct recipients. | Both tools accept only canonical absolute non-root `recipient_address`. Any mounted same-root Agent or non-root AgentTeam is task-capable except the caller's exact logical Agent placement. | One root-bounded topology lookup and deterministic address failures remain. | R-001–R-003, R-006; AC-001–AC-004 |
| BEH-002 | Durable task identity is root-scoped, but live services and ledgers are split by current TeamRun. | Exactly one root task authority and one private command queue own allocation, current-state authorization/derivation, activation ordering, every durable transition, notification, settlement, restart repair, and disposal. Terminal task status commits before settlement; one reversible local quiescence capability protects the later tree-only settlement commit. | The exact delegating Agent execution alone retains review authority. | R-007, R-010–R-012; AC-008–AC-011 |
| BEH-003 | Direct Agent targets create task Agents; direct child Team targets create task TeamRuns. | Any resolved Agent creates one fresh task AgentRun. Any resolved non-root AgentTeam creates one fresh task TeamRun and enters through its configured coordinator; all fallible execution preparation remains sealed before its activation command writes either file. | Fresh identity, inherited configured launch facts, and coordinator-based Team ingress remain mandatory. | R-004–R-005, R-019, R-025–R-026; AC-005, AC-025–AC-027 |
| BEH-004 | Concrete execution is located by a composite `TeamExecutionAddress` containing logical address plus task-Team chain and optional task Agent ID. | Logical placement uses only canonical `address`; exact Agent and Team executions use only `agentRunId` and `teamRunId`; concrete ancestry derives only from execution-tree containment. | Root TeamRun remains the isolation boundary. | R-008–R-010, R-032–R-035; AC-012–AC-018, AC-033–AC-038 |
| BEH-005 | Submit/review/settlement infer current or parent TeamRun from locality and composite-chain position. | Root lifecycle operations resolve caller, task execution, ingress AgentRun, owner TeamRun, and ancestry from one root execution index plus the task record, then execute activation, submit, review, interruption, or settlement in command-admission order against the latest task/tree state. Settlement first obtains reversible quiescence, commits only the execution-tree `settledAt` change, then performs destructive local cleanup. | Submission, review, revision, acceptance, notification, interruption, and safe settlement semantics remain. | R-010–R-012, R-034–R-035, R-040; AC-009–AC-011, AC-036–AC-038 |
| BEH-006 | Frontend runtime state uses a map keyed by serialized composite execution addresses and separately materializes task nodes; Team WebSocket open separately reads leaf Agent status from `TeamRun`. | One root snapshot barrier projects immutable execution containment, task/message overlays, and recursively collected canonical Agent status into one frontend aggregate; live events use the same mapper/DTO/reducer. | The configured topology remains immutable and address-based; `TeamRun.getLeafAgentStatusSnapshots()` remains the status source. | R-015–R-016, R-036–R-037, R-047–R-048; AC-017–AC-018, AC-039–AC-041, AC-052–AC-055 |
| BEH-007 | Prompt/tool copy teaches two address forms and a direct-child task restriction. | Every Agent-facing surface teaches one action: copy an exact canonical absolute address. Both tools allow any mounted same-root recipient; providers do not own targeting policy. | AutoByteus, Codex, and Claude receive the same contract. | R-013–R-014; AC-019–AC-021 |
| BEH-008 | Handoffs are optional guidance, not authorization. | Preserve that behavior. Omitted or empty handoffs do not restrict correct direct tool use. | `get_handoff_rules` remains minimal ordered `{when,recipient_address}` rows. | R-022; AC-022 |
| BEH-009 | Runtime history is split across schema-v3 `team_run_metadata.json`, task records, communication records, token rows, external-channel state, and application copies. | A root TeamRun has exactly three JSON authorities: execution tree, task delegation records, and communication messages. Task commands derive cumulatively inside one root task queue; terminal status and execution settlement use their existing separate file authorities rather than a two-file settlement snapshot; message appends derive cumulatively inside the root mutation lock; every runtime write reports `not_renamed`, `renamed_finalization_indeterminate`, or `committed`. Token/external/application projections use exact run IDs and root context rather than composite execution addresses. | Existing physical Agent memory directories and run IDs are preserved. | R-032–R-044; AC-033–AC-048 |
| BEH-010 | Non-direct recipients return an adjacency error; relative forms are normalized. | Remove adjacency and relative admission. Reject malformed, relative, root-only, absent, foreign-root, self-Agent, forged, contradictory, and lifecycle-invalid calls before active mutation. | No global search, kind guess, route alias, or fallback is introduced. | R-006, R-017, R-019; AC-003–AC-004, AC-024 |
| BEH-011 | Successful delegation does not expose active assignee contact; work packets do not expose exact delegator contact; Team messages dispatch before accepted-message history can be made durable. | Active delegation exposes exact bidirectional contact, and same-root Team messages reserve the receiver FIFO, enter one root-ordered append plan, derive and durably record one exact-endpoint row from the current state, then release that reservation. Ordinary quiescence waits for every already-submitted reservation to commit or cancel; it never deletes that reservation. A post-rename finalization-indeterminate outcome fail-stops the root and emits no ordinary accepted/rejected result. | Formal task state changes remain exclusive to task tools; AgentRun remains the sole FIFO/admission owner. | R-025–R-031, R-037, R-040; AC-025–AC-032, AC-037 |
| BEH-012 | A server restart does not restore live task runtimes, but predecessor records can remain nonterminal. | Startup or explicit reopen strictly reloads the three files, repairs whichever final pathname survived an interrupted or finalization-indeterminate commit, marks stale nonterminal tasks `interrupted`, settles their task executions, removes orphan unreleased task nodes, and validates before exposure. | Live task recovery and message replay remain out of scope. | R-040–R-041; AC-042–AC-044 |
| BEH-013 | Current released framework-owned stores contain composite execution addresses and historical task-Team identities. | One new isolated migration reconstructs each three-file target where evidence is unambiguous, converts its dependent framework-owned rows, excludes and preserves an ambiguous root for retry, then exposes only validated V1 roots to forward-only runtime. | Application framework data is unsupported/disposable and rebuilt; no application compatibility reader or migration exists. | R-042–R-046; AC-045–AC-051 |
| BEH-014 | Every materialized TeamRun already has one `MixedTeamManager`, but that manager also owns or reaches into root routing, task directories, composite-chain resolution, listener/barrier, and root disposal concerns. | Preserve one manager per TeamRun and narrow it to direct local execution handles/lifecycle. One `RootTeamRun` public boundary owns root subject services; exact cross-tree work reaches the selected local `TeamRun` through the execution index and one root `TeamRunResolver`. | Recursive TeamRun composition, lazy configured-member launch, provider handles, local status/open-work checks, and recursive local termination remain. | R-007, R-012, R-040, R-048; AC-055–AC-056 |

## Investigation Findings

1. `TaskDelegationToolService` already resolves logical targets through the root `TeamRun`; direct-child rejection occurs later in `TaskDelegationTargetMapper`.
2. Removing only that guard is unsafe because live ledgers, host selection, task-Team parent lookup, notification, settlement, and frontend materialization assume locality.
3. `TeamRunConfig.rootTeam` and `TeamRunTreeIndex` already provide one rooted logical topology. No second topology, route key, or placement path is needed.
4. Every task Agent and every task-Team member already receives a globally collision-aware `agentRunId`; every task Team receives a fresh `teamRunId`. Those are sufficient exact execution identities.
5. Current `TeamExecutionAddress` is an external ancestry locator rather than one node's intrinsic identity. Task-Team Agent streaming must already add `agentRunId` outside that composite, proving the composite is not a uniform exact Agent identity.
6. Recursive TeamRun composition already represents concrete containment. Persisting that same containment as one execution tree makes `taskTeamRunIds`, `taskAgentRunId`, owner-route keys, and serialized frontend keys derivable and removable.
7. The truthful task host is the exact Team execution for the target placement's logical parent. Select the caller's nearest enclosing concrete Team subtree whose logical address contains that parent address, then follow only configured Team members inside that same subtree to the exact parent TeamRun. The structural root naturally selects the persistent branch for cross-branch work.
8. The task relationship may cross branches and therefore cannot be represented by containment. The task record owns that edge using exact delegator AgentRun ID, chosen logical recipient, and exact fresh task execution reference.
9. Ordinary communication is not a task transition or a structural edge. Exact sender/receiver AgentRun IDs are sufficient.
10. Representative on-disk data proves task-Team AgentRun IDs can be recovered from physical Agent memory directories, token ledger `run_id`, task TeamRun ancestry, and logical addresses when those sources agree. Unprovable allocations must not be invented.
11. The existing local cohort contains 501 Team metadata files, 343 communication files, 2 task files with 5 task-Team records, and token rows carrying exact AgentRun IDs. The schema change therefore requires migration rather than a target-only filename switch.
12. Application framework data is not a supported predecessor cohort. Its SDK/manifest/backend definitions take a direct target-only V6 cut and application data/fixtures are discarded or rebuilt.
13. A disposable strict validator accepted all 15 normative scenario files and checked exact keys, identities, containment, task correlation, lifecycle, and message endpoints.
14. Current restore behavior already treats Team/Agent instructions as definition-authored, Team backend as the supported `MIXED` invariant, and workspace ID as derived from workspace root. The target tree must not copy those facts; an application-bound Team root stores one application/binding pair and derives exact per-Agent producer identity.
15. Current factories already create one `TeamRun` and `MixedTeamManager` for each materialized root, configured subteam, and task subteam. The refactor should preserve this natural local boundary while moving root recipient/task/message/persistence/event authority out of child managers.
16. Serial physical writes do not prevent lost updates when overlapping message calls derive complete snapshots before entering the root lock. Message current-state read, dedup/reference validation, next-state derivation, write, memory/event commit, and FIFO release must be one root-locked logical append.
17. The same lost-update shape applies to independently supported task submit/review/settlement operations if they derive complete task snapshots before serialized writes. One private `TaskDelegationService` command queue must span latest-state read, authorization, derivation, physical commit, no-throw memory/event commit, and result for every lifecycle mutation.
18. Rename precedes required directory synchronization. A writer that swallows sync errors cannot prove durability, while a writer that throws after rename cannot truthfully report ordinary clean failure. The three current Team JSON stores require a narrow phase-aware result and root fail-stop/reload handling for `renamed_finalization_indeterminate`.
19. A terminal task record with an unsettled execution is already a supported durable state while child/local work drains. Therefore settlement needs no new persisted lifecycle: reserve and reversibly quiesce the exact local execution, commit only its execution-tree `settledAt` change, then detach and terminate it. A pre-rename failure cancels quiescence and leaves the current execution intact; post-rename uncertainty remains root fail-stop territory.

Detailed source, runtime, and persistence evidence is in `investigation-notes.md`. Exact schemas and data-flow spines are in `team-run-persistence-architecture-contract.md`.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- |
| `universal-task-delegation-behavior-contract.md` | Universal target, host-selection, and failure behavior | R-001–R-024; AC-001–AC-024 | User-approved / self-validated | Defines the complete logical delegation matrix. |
| `task-delegation-interaction-contract.md` | Task/message interaction and result contract | R-025–R-031; AC-025–AC-032 | User-approved / self-validated | Defines exact bidirectional contact and formal lifecycle separation. |
| `agent-team-collaboration-system-instruction.md` | Exact provider-neutral prompt copy | R-013–R-014, R-022 | User-approved / self-validated | Provides absolute-address explanation and collaboration wording. |
| `team-execution-ownership-analysis.md` | Current-state and target ownership analysis | R-007–R-012, R-032–R-044 | Reconciled with SR-009 / N/A as separate product behavior | Proves the separation of topology, containment, task relationships, and messages. |
| `team-run-persistence-architecture-contract.md` | Exact three-file schemas, invariants, ownership, recovery, and migration | R-032–R-046; AC-033–AC-051 | User-approved / self-validated | Governs target storage and runtime ownership. |
| `team-execution-tree-ui-ux-spec.md` | Exact live execution-tree navigation, task labels, focus, and Team expansion behavior | R-015–R-016, R-047; AC-018, AC-039–AC-041, AC-052–AC-054 | User-approved / self-validated | Governs the product projection of the runtime model. |
| `team-run-management-contract.md` | Exact `RootTeamRun`/`TeamRun`/`MixedTeamManager` ownership, naming, routing, and event-order boundary | R-007, R-012, R-040, R-048; AC-055–AC-056 | User-approved / self-validated | Preserves one manager per TeamRun while removing root-wide concerns from local managers. |
| `persistence-scenarios/README.md` and its 15 JSON files | Normative exact examples for five states | R-032–R-041; AC-033–AC-044 | User-approved; strict validation passed | Pins exact keys and cross-file relationships. |
| `execution-model-visualization.html` | Explanatory visualization; not product UI | N/A | Context / N/A | Illustrates the joined frontend projection without defining storage. |
| `solution-self-validation.md` | Design-principle audit and complete use-case/spine coverage | All current IDs | Completed / Pass / approval N/A | Records the final solution-quality evidence without adding behavior. |

Absolute paths and complete inventory are maintained in `investigation-notes.md`.

## Design Health Assessment (Mandatory)

- Change posture: Behavior Change / Architectural Refactor / Schema Contraction / Cleanup
- Initial design issue signal: Yes
- Root cause classification: Boundary And Ownership Issue / Duplicated Identity / Duplicated Policy / Persisted-Structure Drift
- Refactor posture: Required in this change
- Evidence basis: a simple universal targeting rule crosses root resolution, per-Team lifecycle services, composite ancestry identities, duplicated persisted facts, and frontend task materialization. Preserving those structures would require more exceptions and would keep exact Agent execution identity split across fields.
- Requirement or scope impact: the public contract becomes smaller; backend, persistence, application contracts, events, token/external projections, and frontend state must take one coordinated clean cut.

## Recommendations

1. Keep one canonical logical `address` and one root `TeamRecipientResolver` for both tools.
2. Use `agentRunId` and `teamRunId` as the only concrete execution identities.
3. Persist concrete ancestry only through recursive execution-tree containment.
4. Put exactly three current-schema JSON authorities under each root TeamRun; add no manifest, journal, or frontend projection file.
5. Use one public `RootTeamRun` boundary with explicit owners for the execution tree/index, task lifecycle, accepted-message history, persistence ordering, exact TeamRun lookup, and event publication; do not create a vague root state blob.
6. Keep task and message relationships in their own records and join them onto execution nodes only in projections.
7. Migrate supported released framework data once at startup; reject ambiguity without mutation; remove every runtime compatibility path.
8. Use one frontend execution aggregate keyed by exact run IDs, with topology/task/message overlays supplied by one backend projector and one reducer.
9. Group task executions underneath the logical placement they instantiate; label them from task description, and expand task Team rows into their exact fresh TeamRun members.
10. Preserve one `MixedTeamManager` per materialized `TeamRun`, narrow it to local handles/lifecycle, and remove parent-boundary, composite-chain, root-directory, root-listener, and root-disposal concerns from it.

## Scope Classification (`Large`)

The public behavior is simple, but the required clean cut spans logical resolution, execution hosting, lifecycle authority, persisted schemas, history, communication, token and external-channel identity, application SDK contracts, GraphQL/WebSocket DTOs, frontend focus/state, migration, restart repair, and three provider paths.

## In-Scope Use Cases

- **UC-001:** A persistent Agent delegates to any other Agent in the same root, including deep and cross-branch targets.
- **UC-002:** A persistent Agent delegates to any non-root mounted AgentTeam, including sibling, descendant, immediate, and ancestor Teams.
- **UC-003:** `send_message_to.recipient_address` and `delegate_task.recipient_address` accept canonical absolute addresses only.
- **UC-004:** A task-Team Agent delegates inside its current task-Team subtree and the assignee is hosted by the exact configured TeamRun inside the caller's nearest enclosing task-Team subtree.
- **UC-005:** A task-scoped Agent delegates outside its current task-Team subtree and the assignee is hosted by the persistent target-owner Team execution.
- **UC-006:** A task Agent delegates nested work; the task edge remains exact even when execution containment differs.
- **UC-007:** Direct peer-Agent and child-Team delegation continue under the generalized rule.
- **UC-008:** Live and restored frontend projections show truthful execution containment and independently joined task/message relationships.
- **UC-009:** Invalid addresses, identities, records, or state fail before externally visible active mutation.
- **UC-010:** AutoByteus, Codex, and Claude expose identical tool and system-instruction semantics.
- **UC-011:** Delegator and assignee exchange ordinary exact-run messages while formal submit/review remains task-owned.
- **UC-012:** Multiple tasks to the same logical target create independent run identities and lifecycles.
- **UC-013:** Root teardown removes only that root's state, indexes, and live task executions.
- **UC-014:** A root with no tasks persists an execution tree plus empty task/message files.
- **UC-015:** Active Agent and AgentTeam tasks persist exact task roots and can be projected after read.
- **UC-016:** Settled task executions remain durable history but are excluded from the live UI tree.
- **UC-017:** Startup terminalizes nonrecoverable live tasks and removes orphan unreleased nodes before listening.
- **UC-018:** Supported predecessor Team/history/task/message/token/external data migrates once to the current schema without runtime dual readers.
- **UC-019:** Application framework packages take a direct V6 current-contract cut; unsupported application data is discarded/rebuilt.
- **UC-020:** In live Team navigation, an Agent task appears underneath its logical Agent placement and focuses its exact AgentRun; an AgentTeam task appears underneath its logical Team placement and expands into the exact fresh TeamRun members.
- **UC-021:** A cross-branch message, command, task activation, or settlement is authorized at `RootTeamRun`, resolved to one exact containing `TeamRun`, and executed by that TeamRun's local manager without child-to-root bubbling or global-directory access from the manager.

## Out of Scope

- Delegation across unrelated rooted TeamRuns.
- Global catalogs, bare-name lookup, relative paths, traversal, fuzzy search, or compatibility fallback.
- `target_agent_run_id` as a `delegate_task` selector.
- Making handoffs an ACL or requiring handoff configuration.
- Removing the AgentTeam coordinator requirement or changing Team task ingress.
- Live task recovery or reactivation across a server restart.
- Message content changing formal task lifecycle.
- Product visual redesign beyond projecting the same information from the target execution aggregate.
- Moving or renaming physical Agent memory directories.
- Migrating, quarantining, or adapting unsupported application framework databases/bundles.
- Changing AgentRun FIFO ordering, active-input selection, interrupt, provider segment, or collaboration policy inherited from the base. A narrow AgentRun-owned input reservation/commit/release seam is in scope only to make accepted Team-message history truthful without adding another queue.

## Functional Requirements

- **R-001 — One logical resolver:** Both tools shall pass `recipient_address` to the same root `TeamRecipientResolver` and receive the same immutable logical placement result.
- **R-002 — Universal same-root target set:** Every resolved non-root mounted Agent or AgentTeam shall be task-capable regardless of depth, branch, or parent relationship.
- **R-003 — Exact Agent self rejection:** `delegate_task` shall reject only the caller's exact logical Agent address as self. A Team target creates a fresh execution and is not Agent self-targeting.
- **R-004 — Agent target:** An Agent target shall allocate and start one fresh task AgentRun inheriting the addressed configured Agent's definition and launch configuration.
- **R-005 — AgentTeam target:** An AgentTeam target shall allocate and start one fresh task TeamRun subtree through the addressed configured Team's coordinator.
- **R-006 — Absolute non-root boundary:** Agent-facing `recipient_address` shall already be canonical, absolute, and non-root. Relative, bare, traversal, backslash, whitespace-changing, repeated/trailing-separator, and `/` inputs shall fail rather than normalize.
- **R-007 — Root task authority:** One `TaskDelegationService` belonging to the public `RootTeamRun` boundary shall own allocation, one private FIFO task-command queue, authoritative current task state, activation, submit, review, interruption, settlement, notification, restart repair, and task-record disposal. Every lifecycle mutation shall enter that queue exactly once and shall read, authorize/revalidate, derive, durably commit, swap memory/event state, and determine its result before the next task command executes. An `interrupt` first commits the terminal task record through the task-file transition; a later `settle` command may change only the execution tree. Child TeamRuns host direct executions and own reversible local quiescence/destructive cleanup mechanics but no competing task ledger or task queue.
- **R-008 — Deterministic concrete scope selection:** Let `targetParent` be the logical Team address that must contain the final Agent or fresh Team endpoint. Walk the caller's concrete Team ancestors deepest first and select the first ancestor whose canonical address is a segment-aware ancestor-or-self of `targetParent`; structural root `/` matches every target parent. From that exact TeamRun, follow configured Team-member edges only to the unique TeamRun at `targetParent`. That TeamRun is the message scope or task host. Do not traverse sibling task executions, search globally, or fall back after an inconsistent selected subtree.
- **R-009 — Truthful containment:** The selected Team execution shall host the fresh task Agent or task Team. No caller task ancestry or delegation relationship shall be copied into a separate execution-address chain.
- **R-010 — Exact caller authorization:** Before mutation, the root authority shall validate root membership, caller AgentRun ID, caller logical placement, live/settled state, enclosing TeamRun, and bound task when applicable through one execution index.
- **R-011 — Exact result/review ownership:** Submit shall accept only the exact task AgentRun or exact configured coordinator AgentRun of the bound task TeamRun. Review shall accept only the exact original delegator AgentRun. Authorization and source-state validation shall occur at the head of the root task-command queue against the latest committed record; two commands for one task shall not both succeed from the same source state.
- **R-012 — Lifecycle/settlement:** Activation shall be durable before work release. Revision, acceptance, notification, interruption, and settlement shall resolve exact runs through the root index and shall block while open child tasks or runtime work remain. Commands for different tasks shall derive cumulatively in queue-admission order; activation and transition commands shall share that same order. No lifecycle caller shall pass a precomputed complete task/tree snapshot into the queue.
- **R-013 — Public tool contract:** `delegate_task` keeps required `recipient_address`, `description`, and optional absolute local `reference_files`; it accepts no run-ID selector. Server-owned schemas/descriptions expose the universal absolute rule.
- **R-014 — Agent instruction/discovery:** Provider-neutral prompt copy, current identity context, roster, and `get_handoff_rules` shall expose canonical absolute addresses only and identical semantics to all Team-bound providers.
- **R-015 — Frontend authority:** One frontend execution aggregate shall own immutable topology, concrete execution graph/index, task lifecycle overlay, communication activity overlay, canonical Agent status, focus/open/history, timeline, and terminal cleanup. Its initial state shall include root-collected leaf Agent status for configured and active task executions. Consumers shall use APIs/selectors, not serialized composite keys.
- **R-016 — History equivalence:** Initial restore and live updates shall project the same exact AgentRun/TeamRun identities, containment, task state, message endpoints, and canonical Agent status through the same backend projector/status mapper/shared DTO and frontend reducer. Snapshot admission shall queue later root events so no status change is lost.
- **R-017 — Clean removal:** Remove adjacency eligibility/codes, relative parsing/copy, per-Team task ledgers, inferred parent routing, duplicate task target/reply shapes, composite execution address/path/route models, duplicated application producer context, and frontend serialized composite-key consumers.
- **R-018 — Durable documentation:** Current task, communication, prompt, provider, storage, application, and Team execution docs shall describe only the final target behavior. Historical completed evidence need not be rewritten.
- **R-019 — Fail closed:** Invalid syntax, root-only/missing/foreign target, Agent traversal, root mismatch, forged/inactive/settled caller, exact self-Agent, missing coordinator, contradictory persisted identity, and any known pre-rename task-activation failure shall reject deterministically with no exposed active mutation. All preparation, construction, registration reservation, event sealing, validation, and fallible publication setup shall occur before the task command writes either file; post-commit memory publication, registration, event enqueue, and work-gate release shall be synchronous no-throw operations with subscriber failures isolated. A write that has renamed the final pathname but cannot complete required directory finalization is not a clean rejection: it shall atomically latch the root into persistence fail-stop, release no work or reserved message, emit no domain success/rejection result, and require strict reload/reconciliation before that root can serve again.
- **R-020 — Repository coverage:** Durable coverage shall exercise all target/host branches, caller kinds, lifecycle transitions, persistence cases, restart repair, migration, frontend restore/live behavior, teardown isolation, and cleanup scans.
- **R-021 — Provider/runtime validation:** API/E2E shall use the maintained imported nested-classroom AgentTeam and exercise AutoByteus, Codex, and Claude with disposable state and inherited credential/database protections.
- **R-022 — Optional handoffs:** Omitted or empty handoffs shall not change tool eligibility. Handoff results remain ordered advisory rows with mounted canonical addresses.
- **R-023 — Reference files:** Absolute-local validation, packet inclusion, durable content retrieval, submit/review references, and rejection-before-mutation remain. Persist only paths where reference IDs/types/timestamps are deterministic from their parent record.
- **R-024 — No logical topology mutation:** Delegation creates concrete task executions only; it shall not rewrite mounted logical nodes, coordinator addresses, configured launch settings, or persistent run IDs.
- **R-025 — Dedicated execution:** Every successful call creates one fresh assignee execution; repeated calls to one logical target create distinct task and execution identities.
- **R-026 — Minimal active result:** Active result is exactly `{task_id,status:"active",target_agent_run_id}`. Agent targets return the task AgentRun; Team targets return the task Team coordinator AgentRun. `not_started` omits the run ID.
- **R-027 — Work-packet contact:** The work packet shall say `Task delegator address` and `Task delegator AgentRun ID`, using exact caller facts; it omits the task ID and review-owner terminology.
- **R-028 — Task-ID ownership:** The assignee shall not choose or echo its bound task ID. The delegator retains the task ID for review and result notifications.
- **R-029 — Bidirectional exact messaging:** While active, either participant may message the other by known exact AgentRun ID. Exact-run failure shall never fall back to logical address.
- **R-030 — Visible sender identity:** Team-bound ordinary message copy shall expose sender canonical address and AgentRun ID. Same-root exact-run delivery re-enters the root communication boundary; standalone/cross-root exact-run delivery remains direct and creates no Team history.
- **R-031 — Lifecycle separation:** Ordinary message content shall never transition task state. Only delegate, submit, review, restart repair, and teardown interruption own formal transitions.
- **R-032 — Exact three-file package:** Each root TeamRun directory shall have exactly `team_run_execution_tree.json`, `task_delegation_records.json`, and `team_communication_messages.json` as current Team runtime JSON authorities. There is no manifest, journal, or persisted frontend projection.
- **R-033 — Execution-tree schema:** The execution file shall contain schema version, root timestamps, optional single root application binding, handoffs, one root Team execution, persistent configured members with launch configuration, and recursively hosted task executions with exact run IDs/timestamps. It shall not contain message/task edges, composite execution addresses, copied authored instructions, a constant Team backend field, derived workspace IDs, or repeated per-Agent application producer objects.
- **R-034 — Concrete identity:** `agentRunId` is the only exact Agent execution identity and `teamRunId` the only exact Team execution identity. Logical `address` identifies the configured placement. Parent/owner/ancestry derive from containment and are not persisted as parallel fields. The Team-bound provider/tool identity bundle is exactly `{rootTeamRunId, memberAddress, agentRunId}`; enclosing Team/config/coordinator/task facts are derived rather than copied into Agent context.
- **R-035 — Structural variants:** Persistent Agent, persistent Team, task Agent root, task Team root, task-Team Agent binding, and nested task-Team binding shall be discriminated by their exact required key sets; no redundant `kind`, `relationshipToParent`, member path, route key, or task-Team chain is persisted.
- **R-036 — Task-record schema:** The task file shall store root TeamRun ID and ordered records containing task ID, delegator AgentRun ID, recipient address, one structural AgentRun/TeamRun task-execution reference, description, reference paths, materialized status, immutable updates, and creation time.
- **R-037 — Message schema and meaning:** The communication file shall store root TeamRun ID and ordered messages containing message ID, sender AgentRun ID, receiver AgentRun ID, content, message type, reference paths, and creation time. Same-root Team delivery shall first obtain one unreleased reservation from the receiver AgentRun's existing FIFO owner and immediately submit one sealed append plan containing the immutable row, reservation, and prevalidated event slot. Under the root mutation lock, the plan shall validate the current root/endpoints/reservation and message-ID absence, derive the next snapshot from the authoritative current message state, write it to a phase-aware durable result, then on `committed` synchronously swap memory, commit the event slot and exact reservation, release the FIFO entry, and return accepted. Current-reference/message-ID conflict shall cancel with `TEAM_MESSAGE_COMMIT_CONFLICT`; `not_renamed` shall cancel with `TEAM_MESSAGE_HISTORY_COMMIT_FAILED`; `renamed_finalization_indeterminate` shall preserve the hidden reservation/event state until root fail-stop teardown and shall emit no ordinary collaboration result. A row means the exact receiver AgentRun accepted the input into its FIFO admission boundary, not that a provider processed it; the file is communication history, not an input/outbox queue, and shall never replay delivery.
- **R-038 — Tight task execution bindings:** Task Agent/Team nodes shall inherit immutable definition, role/description, coordinator, and launch facts through their canonical configured placement. Task nodes persist only fresh execution bindings, nested containment, and task-execution timestamps.
- **R-039 — Strict cross-file validation:** All three files shall reject unknown/mixed fields and validate root correlation, unique run IDs, configured placement references, coordinator membership, task-to-execution correlation, status/update replay, timestamps, and exact message endpoints before exposure.
- **R-040 — Serialized logical and physical commits:** One private FIFO task-command queue inside `TaskDelegationService` shall linearize every activation, submit, review, interruption, and settlement against authoritative current task/tree state. One `TeamRunPersistenceCoordinator` belonging to `RootTeamRun` shall serialize subject-specific physical commits with the root mutation lock. Its task boundary shall accept only typed activation, record-transition, and tree-only settlement plans produced at the task-queue head; its message boundary shall accept only `PreparedTeamMessageAppend`; neither shall accept a caller-derived stale full snapshot or generic mutate callback. Before a settlement write, the selected local `TeamRun` shall return one `PreparedTaskSettlement` that reserves the exact execution, closes new Agent input, waits for every earlier reservation/dispatch to resolve, rechecks idle/open-work eligibility, and performs no backend termination, registry deletion, or TeamRun unregistration. Each of the three Team JSON stores shall use one strict phase-aware writer returning `not_renamed`, `renamed_finalization_indeterminate`, or `committed` after same-directory temp write, file sync, rename, and directory sync. For settlement, `not_renamed` shall synchronously cancel the prepared capability and reopen the unchanged execution before releasing the root lock; `committed` shall synchronously swap tree/event state and make quiescence irrevocable before returning a committed local-teardown capability; provider/handle teardown shall run only after the root lock unwinds. Teardown failure after committed truth fail-stops that root and cannot be mapped as a clean persistence rejection. `renamed_finalization_indeterminate` shall synchronously fail-stop the root, retain hidden preparation, publish/release nothing, produce no normal domain result, and defer authority selection to strict reload/reconciliation. Activation `finalization_indeterminate` likewise preserves hidden preparation and has no ordinary `not_started` mapping; successful activation opens its already-prevalidated work gate synchronously inside the commit closure. No persisted settlement state, persisted revision, retry/replay loop, outbox, second task ledger/input queue, or fourth Team file is permitted.
- **R-041 — Restart/reopen repair:** Before listening or re-exposing a failed root, package discovery shall exclude/remove any incomplete target-only root-creation residue that has no predecessor source, then strict-load all three final paths for each complete target package; remove unreferenced unreleased task nodes; interrupt every stale nonterminal task; settle its execution; retain accepted/terminal history; retain but never replay any surviving communication row; persist any repairs through the same phase-aware writer; and validate the complete package. A repair `not_renamed` or `renamed_finalization_indeterminate` outcome keeps the root unavailable. Do not resume task work.
- **R-042 — Migration required:** A new independently pending migration record shall own predecessor schema-v3 Team metadata/task/message conversion and dependent token/external identity conversion. It shall not rely on changing or rerunning a completed predecessor migration ID.
- **R-043 — Evidence-only reconstruction:** Migration may correlate predecessor IDs using Team metadata, task records, physical Agent memory paths, token `run_id`, external records, and root/task TeamRun ancestry only when all available facts agree. It shall never invent an unobserved AgentRun/TeamRun binding or guess between conflicting fields.
- **R-044 — Isolated, retryable migration:** Migration shall discover roots independently, stage and strictly validate each complete target package, create protected backups, promote only complete roots, and remain idempotent. The token schema cut is independent of root catalog admission because every supported token row already owns exact `run_id` and derives optional root context directly; one protected predecessor token backup shall retain correlation evidence, and one store-owned transaction shall convert the complete supported token cohort to target columns with rollback proof. A transient failure may receive bounded in-run retries. A still-failing or ambiguous root shall retain its predecessor Team-package bytes, produce an actionable diagnostic, remain excluded from the target root catalog, and keep the migration record `FAILED`/retryable for the next startup or explicit retry; it shall not block unrelated valid roots, new Team creation, or server listen after the migration attempt finishes. If no predecessor root succeeds, the server starts with no restored historical TeamRun rather than a legacy runtime path.
- **R-045 — Target-only runtime:** After migration, production readers/writers, GraphQL, events, WebSocket, providers, applications, and frontend accept only target models. Historical knowledge remains isolated in migration code; no dual reader/writer, alias, fallback serializer, or lazy conversion is allowed.
- **R-046 — Forward-only application cut:** Application backend-definition and frontend SDK Team execution contracts shall move atomically from V5 to V6 exact run-ID models. Project-owned packages/artifacts/manifests move together; unsupported application data/bundles are discarded/rebuilt, not migrated or adapted.
- **R-047 — Execution-tree navigation:** The live Team workspace shall group concrete executions under the canonical logical placement they instantiate. Each Agent or AgentTeam task is one indented row labeled `Task:` plus a normalized, visually truncated prefix of the authoritative task description, with no secondary task/run ID. Selecting an Agent task focuses its exact `agentRunId`; selecting an AgentTeam task toggles expansion of the exact fresh `teamRunId` subtree, whose Agent members remain separately focusable by exact AgentRun ID.
- **R-048 — One-TeamRun manager boundary:** Every materialized TeamRun shall own exactly one `MixedTeamManager`. That manager shall own only direct configured-member, task-Agent, and task-Team handles plus local lifecycle/status/open-work/reversible-quiescence/destructive-cleanup mechanics. It shall expose a prepared settlement capability through `TeamRun`, never its registries or handles. `TeamRun.getLeafAgentStatusSnapshots()` shall be the recursive status boundary, including offline configured leaves and live task leaves. Root logical/exact routing, task/message records and policy, persistence order, root status collection/event subscription/change ordering, and exact TeamRun lookup shall belong to `RootTeamRun` subject owners. Public callers use `RootTeamRun`; root services use `TeamRun`; neither may bypass into a manager or registry.

## Acceptance Criteria

- **AC-001:** `/requirements_team/requirements_lead` delegates to `/engineering_team/developer`; a fresh task Agent activates instead of adjacency rejection.
- **AC-002:** The same caller delegates to peer, deep descendant, cross-branch, immediate Team, and ancestor Team targets by exact absolute address.
- **AC-003:** Relative, bare, traversal, noncanonical, root-only, absent, and Agent-intermediate addresses fail with deterministic codes and zero task/message mutation.
- **AC-004:** Another root is never searched; exact logical Agent self-target fails; the adjacency error/code is absent.
- **AC-005:** Delegating to `/engineering_team` creates a fresh TeamRun and returns its configured coordinator AgentRun ID.
- **AC-006:** `/` is rejected for both tools; the root coordinator's explicit Agent address works.
- **AC-007:** Every Team target uses the one configured coordinator mapping; missing/inconsistent ingress fails before activation.
- **AC-008:** Concurrent calls from different child TeamRuns in one root receive unique task IDs and serialized root activation decisions through the same task-command queue used by every lifecycle mutation.
- **AC-009:** Exact task Agent submit and exact delegator review work across branches; forged address-equivalent identities fail. Two valid transitions for different tasks forced to read the same initial test barrier both remain in the committed file and memory in command-admission order; two transitions for the same task revalidate so only the first source-state-valid command succeeds.
- **AC-010:** Team submit succeeds only from the exact fresh Team coordinator AgentRun.
- **AC-011:** Accepted/interrupted Agent or AgentTeam tasks settle only after root-ledger child tasks close and the selected local execution can obtain one reversible quiescence capability. Quiescence rejects new input, waits every already-submitted message reservation and released dispatch to resolve, then rechecks local idle/open-work state without terminating or unregistering the execution before durability.
- **AC-012:** A caller inside task Team `/qa` delegates to `/qa/automation/tester`; `/qa` is the nearest enclosing compatible Team subtree, configured-member descent selects that task subtree's `/qa/automation` TeamRun, and the fresh Agent is hosted there rather than under persistent `/qa/automation`.
- **AC-013:** A caller inside nested task Team `/qa/automation` delegates to `/qa/tester`; `/qa/automation` does not contain target parent `/qa`, so the caller's exact ancestor task TeamRun `/qa` is selected and hosts the fresh task Agent.
- **AC-014:** A caller in task `/research` delegates to `/qa/tester`; persistent `/qa` hosts the task while the task record keeps the exact delegator AgentRun edge.
- **AC-015:** A caller in task `/research` delegates to `/qa`; persistent root hosts the fresh `/qa` task Team, not the caller's `/research` task Team.
- **AC-016:** A Team target below a compatible task-Team subtree is hosted at its exact parent TeamRun reached through configured-member descent and recursively receives fresh TeamRun/AgentRun bindings without chain fields.
- **AC-017:** Backend admission validates actual tree ancestry and exact runs without requiring delegator and assignee to share a parent.
- **AC-018:** Live/restored frontend state renders AC-012–AC-016 under truthful tree parents and joins task edges independently.
- **AC-019:** AutoByteus, Codex, and Claude receive the same exact `{rootTeamRunId,memberAddress,agentRunId}` Team identity, expose identical fields/results, and add no provider-specific target restriction.
- **AC-020:** Rendered Team instruction states absolute-only universal same-root collaboration; relative/direct-child copy is absent.
- **AC-021:** Tool schemas, roster/handoff output, and current docs expose only canonical absolute recipient addresses.
- **AC-022:** Absent and empty handoffs produce identical successful direct delegation for a valid address.
- **AC-023:** Absolute local reference validation and content retrieval work from the reduced persisted path arrays.
- **AC-024:** An allowlist scan finds no production adjacency policy, relative resolver, per-provider task policy, per-child task ledger, inferred parent chain, duplicate task target/reply model, or compatibility path.
- **AC-025:** Active Agent delegation returns the fresh AgentRun only after exact-run routing can resolve it.
- **AC-026:** Active Team delegation returns the fresh coordinator AgentRun, never the TeamRun ID.
- **AC-027:** Injected failure in preparation, TeamRun-registration reservation, event sealing/budget validation, or a writer outcome of `not_renamed` returns `not_started` without `target_agent_run_id`, releases no work, publishes no activation/status event, and exposes no active task/execution. After a `committed` task-file result, the synchronous commit/event-enqueue/work-gate sequence—including the no-throw `releaseWork()` latch—is complete before the coordinator returns; provider/listener work still drains only behind the lower owner's existing scheduling boundary. A `renamed_finalization_indeterminate` result preserves the hidden preparation/resolver/event reservations, closes the rooted execution surface with no task result and no work release, and is never caught/remapped to ordinary `not_started`; strict reload either removes an orphan or interrupts the surviving durable task.
- **AC-028:** Work packet contains exact task delegator address/run ID and no task ID or review-owner wording.
- **AC-029:** An assignee uses the delegator run ID to contact the exact delegator; the delegator uses returned assignee run ID.
- **AC-030:** Team-task clarification reaches the exact fresh coordinator rather than an address-equivalent persistent/other execution.
- **AC-031:** Recipient-visible Team messages show sender canonical address/run ID for persistent, task-Agent, and task-Team Agent senders.
- **AC-032:** Ordinary content containing “finished,” “accept,” or “revise” leaves task status unchanged.
- **AC-033:** All 15 normative JSON examples parse through strict target validators without aliases or normalization.
- **AC-034:** Persistent-only root reads to one tree with nested TeamRun/AgentRun indexes and empty task/message ledgers.
- **AC-035:** Active task Agent and active nested task Team examples project the exact run hierarchy shown in the fixture and derive coordinator ingress without copied fields.
- **AC-036:** Every task record resolves one and only one task execution root whose logical address equals `recipientAddress`.
- **AC-037:** Every message endpoint resolves one exact Agent node by AgentRun ID. AgentRun reservation rejection produces no row; injected current-reference/message-ID conflict or `not_renamed` file outcome cancels the unreleased reservation and dispatches no provider input. An injected `renamed_finalization_indeterminate` outcome latches root fail-stop, returns no normal accepted/rejected envelope, publishes no event, dispatches no provider input, and is reconciled only by strict reload without message replay. Two overlapping sends to the same receiver and two to different receivers, forced to reserve before either write completes, retain one row per accepted call because each next snapshot is derived under the root lock from the latest committed message state. Same-receiver provider dispatch follows reservation/root-plan submission order; different-receiver history follows root commit order. Concurrent later input cannot overtake an unresolved reservation. Ordinary AgentRun/task settlement quiescence waits for a submitted reservation to commit or cancel and never removes it; only root fail-stop may exceptionally dispose a hidden indeterminate reservation. No message record needs a logical/composite address.
- **AC-038:** Duplicate run IDs, invalid coordinator, invalid host containment, mixed variant keys, unknown fields, contradictory task status/history, or missing task execution fail before exposure.
- **AC-039:** Initial backend snapshot and live events use the same exact tree/task/message/status projector, canonical `TeamAgentStatusSnapshot` mapping, and strict status DTO; frontend uses one reducer and no separate task or status materializer. Initial status includes configured lazy leaves, active task Agents, and active task-Team Agents, while settled task executions are absent.
- **AC-040:** Focus/open/history/status/timeline operate by AgentRun/TeamRun IDs; repeated tasks to one address remain distinct; a status change racing initial snapshot capture is either represented in the snapshot or delivered as the next queued `changeSequence`, never lost or reconstructed in the browser.
- **AC-041:** Accepted/interrupted task records remain in durable history but are absent from the live execution projection only after the tree-only settlement commit. Before that commit, the exact task execution remains registered and reversible-quiesced; after `committed`, it becomes non-routable synchronously and the same local capability owns recursive teardown. No new persisted `settling` status exists.
- **AC-042:** Activation phase injection retains the established two-file behavior: a task-record `not_renamed` result after a committed activation-tree write returns `not_started`, never releases work, and restart removes the unreleased orphan; activation `renamed_finalization_indeterminate` produces no normal result and preserves hidden preparation for fail-stop/reload. Settlement phase injection is one-file and different: `not_renamed` synchronously cancels reversible quiescence before root-lock release and leaves the terminal task record plus live execution unchanged; `committed` swaps tree/event state and irrevocably detaches the execution before post-lock local teardown; `renamed_finalization_indeterminate` retains hidden quiescence and fail-stops with no ordinary result. Forced local teardown rejection after a committed settlement does not restore the execution or report persistence failure; it fail-stops the affected root for cleanup. Process loss after durable activation or settlement returns no false clean result and reload never replays task work.
- **AC-043:** Restart converts active/awaiting-review records to interrupted exactly once and writes matching settled timestamps.
- **AC-044:** Root package validation completes before GraphQL/WebSocket/runtime exposure. An injected new-root write failure never publishes that root; strict package scan admits a fully committed three-file package and removes/excludes an incomplete target-only creation residue.
- **AC-045:** Representative persistent, task-Agent, task-Team, nested-task, communication, token, and external-channel predecessor data migrates to exact target models while preserving known run IDs/content/timestamps.
- **AC-046:** A previously completed older migration record does not suppress the new migration owner.
- **AC-047:** Forced failure in the all-supported-row token table conversion rolls back every target row/table change; its bounded retry succeeds from the protected predecessor backup without a mixed-schema runtime. Forced unsafe JSON correlation for one root leaves that root's Team-package source bytes unchanged, excludes it from target catalog admission, records exact identifiers, and leaves the migration retryable without blocking other valid roots or new Team use.
- **AC-048:** A later retry skips already-valid target roots, retries only unresolved predecessor roots and their dependent rows, and performs no duplicate mutation. Once every discoverable supported root is current or safely absent, the migration reports success.
- **AC-049:** Server listen waits for the current startup migration attempt to finish, not for global exact success. `FAILED`/retryable roots remain unavailable and are retried on a later startup; successful target roots and new Team creation remain available. Runtime code never reads predecessor files or supplies an empty compatibility projection for an excluded root.
- **AC-050:** Current runtime/source allowlist contains no `TeamExecutionAddress`, `taskTeamRunIds`, `taskAgentRunId`, `memberRouteKey`, `memberPath`, or `entryExecutionAddress` outside isolated historical migration evidence.
- **AC-051:** Application V6 packages/manifests/backend definitions accept only the exact run-ID Team identity model; V5 project fixtures and application data are removed/rebuilt with no adapter or migration.
- **AC-052:** An active task Agent at `/qa/tester` renders as a distinct indented `Task: <description prefix>` row beneath the `/qa/tester` placement; selecting it focuses the exact task AgentRun rather than the persistent AgentRun at the same address.
- **AC-053:** An active task AgentTeam at `/qa` renders beneath the `/qa` placement; selecting it expands the exact fresh TeamRun members, nested Team rows expand recursively, and no row silently substitutes persistent-Team AgentRuns or treats the Team as its coordinator Agent.
- **AC-054:** Agent and AgentTeam task rows expose no secondary task ID, AgentRun ID, or TeamRun ID in ordinary navigation; repeated tasks remain distinct internal rows, status and full accessible description remain truthful, and settlement removes only the affected live task subtree with valid focus repair.
- **AC-055:** Root, configured child, task Team, and nested task Team creation each produce exactly one local `MixedTeamManager`; an exact cross-branch message/command/task operation is resolved by the root index and `TeamRunResolver`, then reaches only the selected `TeamRun` and its direct local handle. Initial status collection likewise enters through the root `TeamRun` and recurses through `TeamRun.getLeafAgentStatusSnapshots()` without manager bypass.
- **AC-056:** Production source contains no `parentBoundary`, manager-owned root recipient resolver/listener set/activation barrier, task-specific active-run directory, composite-chain manager routing, local disposal of root resources, `RootTeamRunState`, precomputed `commitTaskActivation(nextTree,nextTasks)`/`commitTaskTransition(nextTasks)` boundary, destructive `settleDirectTask()`-before-persistence path, two-file settlement snapshot, Team-store use of best-effort `atomicWriteJsonFile()`, or bare stream `revision`; root live updates use a non-persisted monotonic `changeSequence` owned by `TeamRunEventPublisher`, and a sequence gap causes one fresh snapshot.

## Constraints / Dependencies

- Bootstrap base: `origin/codex/agent-team-hierarchical-handoffs` at `3e121efb32462c314f4ef1c4e051f30d2f9b3e58`. Current ticket HEAD and merge base were reverified equal before this revision.
- Preserve `AgentTeamAddress`, the rooted configured topology, recursive TeamRun runtime composition, provider-neutral AgentRun input admission, coordinator-based Team ingress, and inherited provider behavior.
- Preserve operational database, credential, safe-launcher, protected-stash/backup, and no-unapproved-rollback constraints in later phases.
- Runtime remains forward-only. Only the isolated migration boundary may understand predecessor fields.
- No implementation may begin until the user approves the solution package and architecture review passes.

## Persisted Data Outcome (When Applicable)

- **Framework-owned Team/history/task/communication/token/external data:** `Migration Required`.
- **Physical Agent memory directories:** directly retained; no relayout.
- **Application framework data and old application bundles:** `Discard or Rebuild`; no migration or compatibility admission.
- **Application association already embedded in a supported TeamRun history package:** preserved as that root execution tree's single `applicationBinding`; this does not make the separate application catalog/database a supported predecessor cohort.
- Must preserve: known root TeamRun IDs, persistent and provable task AgentRun/TeamRun IDs, logical addresses, launch settings, task/message content, reference paths, timestamps, token amounts, and unambiguous external-channel bindings.
- Unacceptable loss: silently dropping known history, inventing execution IDs, guessing contradictory topology, partial token conversion, or admitting mixed old/new runtime data.
- Availability: the current migration attempt and restart repair for admitted target roots complete before server listen. Unsafe or failed predecessor roots are diagnosed and excluded/retryable without blocking unrelated target roots or new Team creation.
- Transformation mechanics are authoritative in `team-run-persistence-architecture-contract.md` and `design-spec.md`.

## Assumptions

- Every mounted non-root placement has one canonical absolute logical address and one configured kind.
- Every configured AgentTeam has one direct Agent coordinator.
- AgentRun and TeamRun allocators remain globally collision-aware within persisted/runtime identity domains.
- Live task work is intentionally not resumed after process restart.
- Physical Agent memory paths and token `run_id` remain available for supported predecessor identity correlation.

## Risks / Open Questions

- Product behavior and target data ownership have no open question for solution design.
- Architecture review must evaluate the user-approved exact three-file schemas, broad composite-identity removal, root/local manager boundary, migration, and complete spine package cumulatively.
- Migration must prove historical task-Team correlation over representative stores; any unresolved ambiguity must exclude and preserve that root rather than produce a partial target package or teach current runtime to read it.
- The source cut is large because composite execution identities cross server, contracts, application packages, and frontend consumers. The design must sequence one compiling slice at a time without temporary production dual models.
- Live provider checks remain credential-sensitive and must follow inherited API/E2E environment protections.

## Requirement-To-Use-Case Coverage

| Requirement Range | Covered Use Cases |
| --- | --- |
| R-001–R-006 | UC-001–UC-005, UC-007, UC-009 |
| R-007–R-012 | UC-004–UC-006, UC-008, UC-012–UC-013, UC-015–UC-017 |
| R-013–R-024 | UC-003, UC-008–UC-010, UC-013 |
| R-025–R-031 | UC-006, UC-011–UC-012 |
| R-032–R-041 | UC-008, UC-014–UC-017 |
| R-042–R-046 | UC-018–UC-019 |
| R-047 | UC-008, UC-012, UC-015–UC-016, UC-020 |
| R-048 | UC-001–UC-008, UC-011–UC-013, UC-021 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Range | Scenario Authority |
| --- | --- |
| AC-001–AC-011 | Universal target and lifecycle matrix in `universal-task-delegation-behavior-contract.md` |
| AC-012–AC-018 | Concrete host-selection and containment scenarios in the behavior/persistence contracts |
| AC-019–AC-024 | Prompt, provider, reference, and cleanup scenarios |
| AC-025–AC-032 | INT-001–INT-021 in `task-delegation-interaction-contract.md` |
| AC-033–AC-044 | Five normative directories under `persistence-scenarios/` plus failure-injection variants |
| AC-045–AC-051 | Migration, clean-cut, application V6, and allowlist coverage in the design spec |
| AC-052–AC-054 | UXJ-001–UXJ-005 and wireframes in `team-execution-tree-ui-ux-spec.md` |
| AC-055–AC-056 | MGR-001–MGR-008, boundary seams, and removal inventory in `team-run-management-contract.md` |

## Approval Status

- Product behavior and universal task/message interaction direction: user-approved.
- Exact three-file persistence schema and broader execution-identity contraction: user-approved and self-validated.
- Exact live execution-tree navigation and task-row presentation: user-approved and self-validated.
- Exact one-manager-per-TeamRun ownership and root/local boundary: user-approved and self-validated.
- Migration requirement and isolated forward-only transition: user-approved and self-validated.
- Architecture review: ARCH-REV-004 passed cumulative SR-008. CRR-001 later returned CR-F-004 / Design Impact because MGR-005 contradicted R-040 by deleting the local execution before a fallible settlement write. SR-009 preserves approved behavior and corrects that order for complete architecture re-review; CR-F-001–CR-F-003 remain pending implementation fixes after the design passes.
