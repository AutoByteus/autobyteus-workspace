# Send Message vs Delegate Task Semantics — Requirements Investigation Notes

## Investigation Meta

- Request / ticket: Clarify and enforce the distinct orchestration semantics of `send_message_to` and `delegate_task`
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics` / `codex/send-message-delegate-task-semantics`
- Base or reference revision: `personal` at `9d0fd7c570d58da1af2c7a40279327c8a20a8093`
- Bootstrap result: Dedicated task worktree and branch created successfully; canonical draft artifacts created under `tickets/in-progress/send-message-delegate-task-semantics/`.
- Bootstrap blocker: None
- Current requirements revision ID: `RER-003`
- Investigation status: Requirements visualization returned and integrated; package ready for user decision and approval

## Initial Request And Clarifications

- Original request: Analyze why agents—especially a planner/coordinator exposed to both tools—confuse `send_message_to` with `delegate_task`, and capture the intended non-interchangeable semantics. The user's real-world analogy is that `send_message_to` talks to the one existing person/recipient, whereas `delegate_task` assigns work and creates a task-specific Agent or AgentTeam execution.
- Clarifications received: None after intake.
- User-supplied facts and constraints: `send_message_to` and `delegate_task` are distinct orchestration modes; `delegate_task` creates a task Agent or task AgentTeam instance; using delegation and then sending the same assignment again to the original mounted recipient is semantically wrong because that recipient definition/configured execution is not the task execution that owns the delegated work.
- Initial ambiguity: The word “synchronous” may mean communication with an already existing/live recipient rather than blocking request/response timing. The phrase “first delegate task, later send a message again doesn't make sense” may mean (A) forbid redundant re-dispatch of the same work to the logical recipient, or (B) forbid every delegator-to-task-assignee ordinary follow-up. Current authoritative behavior explicitly permits genuine follow-up by exact run ID, so the distinction is material.
- Later user request: On 2026-08-26 the user explicitly asked Requirements Engineering to send the requirement to Product Prototyper so they can review a visualized requirement before deciding/approving it.

## Product And Domain Understanding

- Product area: Backend AgentTeam orchestration contracts, provider-shared system prompt guidance, and first-party Agent tools.
- Affected actors or systems: Team-bound planners/coordinators and members; configured/persistent Agent and AgentTeam executions; fresh task Agent and task Team executions; task lifecycle; AutoByteus, Codex, and Claude runtime projections.
- Existing user or operational purpose: Let an Agent either communicate with an existing execution or create independently tracked work, while retaining unambiguous logical placement and exact execution identity.
- Relevant terminology:
  - **Logical `recipient_address`:** canonical mounted Agent or non-root AgentTeam placement in one rooted AgentTeam.
  - **Configured ingress:** the live configured Agent execution selected by logical messaging; for an AgentTeam this is its configured coordinator.
  - **Fresh task execution:** a new task AgentRun or task TeamRun created by one successful delegation.
  - **Exact `target_agent_run_id`:** one currently active concrete Agent execution, including the task Agent or task Team coordinator returned by successful delegation.
  - **Task lifecycle:** delegation, bound result submission, review, and settlement; ordinary message text has no lifecycle effect.

## Source Log

| Source ID | Date | Source Type (`Code`/`Doc`/`Runtime`/`Data`/`Contract`/`Web`/`User`/`Command`/`Other`) | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- |
| SRC-001 | 2026-08-26 | User | Current request | Establish reported behavior and intended organizational analogy | User identifies tool confusion and fresh task-execution creation as the key distinction | Clarify blanket post-delegation ban versus duplicate-dispatch ban |
| SRC-002 | 2026-08-26 | Contract | `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Verify current task/message lifecycle contract | `delegate_task` creates one bounded task and execution; `send_message_to` is ordinary communication, not result/review/finalization | Integrate preserved lifecycle into requirements |
| SRC-003 | 2026-08-26 | Contract | `tickets/done/agent-team-universal-task-delegation/task-delegation-interaction-contract.md` | Verify approved composition semantics | Contract says tools are composable but not interchangeable; delegation returns exact task ingress run ID for genuine ordinary follow-up; logical address is not a task alias | Raise DEC-001 instead of silently banning all follow-up |
| SRC-004 | 2026-08-26 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-collaboration-instruction-renderer.ts` | Inspect current shared prompt guidance | Prompt gives separate one-sentence descriptions but no explicit “delegation already delivers packet / do not resend same work / original address is not fresh task” rule | Require intent-first decision rule and negative example |
| SRC-005 | 2026-08-26 | Code | `autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-contract.ts`; `.../send-message-to-dispatcher.ts` | Verify message surface | Description focuses on selectors; logical delivery uses Team context, exact delivery uses active run router; no task creation | Preserve schema/routing; clarify description |
| SRC-006 | 2026-08-26 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts`; `.../team-recipient-resolver.ts`; `src/services/team-communication/team-communication-service.ts` | Trace logical-address messaging | Logical Agent address selects configured Agent; logical AgentTeam address selects configured coordinator; ordinary message is persisted/projected without task mutation | Explicitly distinguish configured ingress from fresh task execution |
| SRC-007 | 2026-08-26 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts`; parameter schemas | Inspect model-facing delegation cue | Description says fresh task Agent/Team and complete task details but does not explicitly warn against a second work-message call or mention returned exact run ID | Align prompt/tool cues |
| SRC-008 | 2026-08-26 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Verify actual activation | Service builds and passes work packet during fresh execution preparation, commits one active task, and returns exact task ingress run ID | Delegation is already assignment/delivery; duplicate send is unnecessary and can target wrong execution |
| SRC-009 | 2026-08-26 | Code / Contract | `.../task-delegation-record.ts` | Verify public result shape | Successful result contains `{task_id,status:"active",target_agent_run_id}`; failure contains `not_started` and no run ID | Exact-run clarification can be explicit; no fallback on failure |
| SRC-010 | 2026-08-26 | Code | `.../carpenter-prompt-composer.ts`; provider backend tests | Verify propagation | Shared Team collaboration instruction is composed for Team-bound runs and used by AutoByteus/Codex/Claude paths | Require provider parity, not per-Agent authored fixes |
| SRC-011 | 2026-08-26 | Test | `tests/unit/agent-team-execution/member-collaboration-instruction-provider-parity.test.ts` | Identify durable verification seam | Exact prompt wording and intrinsic tools are pinned once across shared/native prompt composition | Update semantic assertions and retain one-block invariant downstream |
| SRC-012 | 2026-08-26 | Code | MCP adapter providers for messaging/task delegation | Verify shared tool descriptions | MCP projections consume the same send description and task manifest | One shared semantics update can reach external runtimes; architecture owns exact edit boundary |
| SRC-013 | 2026-08-26 | Contract | `tickets/done/pure-task-delegation-protocol/design-spec.md` | Check prior confusion history | Prior design explicitly removed task result/revision/acceptance dependence on free-form messaging because models confused lifecycle messages with formal actions | Retain strong lifecycle separation |
| SRC-014 | 2026-08-26 | Doc | `autobyteus-server-ts/docs/modules/agent_tools.md` and adjacent active docs | Audit consistency | Some wording still mentions relative/direct-child task constraints that differ from current absolute/universal runtime contract | Include documentation consistency requirement |
| SRC-015 | 2026-08-26 | Command | `rg` scans; `git log`/`git blame`; targeted `sed` source traces | Find active contracts and provenance | Collaboration wording was currentized during universal delegation work but remains too terse for the observed behavioral failure | Record static evidence; live probe not required before user semantics decision |
| SRC-016 | 2026-08-26 | Command | `test -d node_modules` in dedicated worktree | Assess executable test availability | No root or server `node_modules` is installed in this worktree | Static source/test inspection is adequate for requirements; downstream validation must install/prepare dependencies |
| SRC-017 | 2026-08-26 | User | “Can you send a message to the product prototype? I want to see the visualized requirement.” | Apply the Product Experience Evidence Gate | User explicitly requests an interactive requirements visualization before approval | Classify `Requirements Visualization Needed` and send the focused cumulative package through dynamic handoff rules |
| SRC-018 | 2026-08-26 | Product-owned artifact | `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-review.md`; `prototype-ticket.md`; `validation-evidence.md` | Reconcile the returned requirements visualizer with the canonical package | `VIS-R04` covers existing-execution messaging, fresh-task delegation, wrong logical-address duplicate dispatch, DEC-001 Option A/B, identifier separation, formal lifecycle, and delegation failure; all content is illustrative and DEC-001 remains unapproved | Link the review package and present its URL to the user without inferring approval |
| SRC-019 | 2026-08-30 | Command / Runtime | `npm run dev -- --host 0.0.0.0 --port 4179`; `http://127.0.0.1:4179` | Make returned exploratory evidence reviewable | Vite visualizer started successfully at the Product-owned review URL | Ask user to review and decide DEC-001 |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Production Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Team-bound Agent prompt/tool exposure | Shared prompt composer + collaboration renderer; shared exposure resolver/adapters | Both tools are always available, but only terse separate descriptions explain choice | SRC-004, SRC-010–SRC-012 | High |
| BEH-002 | System / Contract | `send_message_to` with logical or exact selector | Shared parser/dispatcher -> logical root delivery or exact active-run router -> Agent input | Existing execution receives ordinary message; no task creation/lifecycle mutation | SRC-005, SRC-006 | High |
| BEH-003 | System / Contract | `delegate_task` with valid logical target | Root task owner -> fresh execution preparation/work packet -> durable task activation -> work release | One fresh task execution receives complete packet; active result returns exact ingress run ID | SRC-007–SRC-009 | High |
| BEH-004 | Contract | Post-delegation conversation | Returned exact run ID -> `send_message_to(target_agent_run_id)` | Genuine additional communication can reach fresh task execution; logical address remains configured ingress | SRC-003, SRC-005, SRC-006, SRC-008, SRC-009 | High; user intent on preserving this is open |
| BEH-005 | Contract | Task result/review | Bound `submit_task_result`; delegator `review_task_result(task_id,...)` | Only task tools change lifecycle; ordinary messages do not | SRC-002, SRC-003, SRC-013 | High |
| BEH-006 | Operational | Provider prompt/tool materialization | Shared composer/descriptions -> AutoByteus local tools or Agent Tools MCP for Codex/Claude | One shared contract reaches providers | SRC-004, SRC-010–SRC-012 | High |
| BEH-007 | Contract | Maintainer reads active docs/tests | Module docs and exact-string tests | Some active prose appears stale or incomplete relative to current runtime | SRC-014 | Medium; full doc inventory deferred downstream |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question Deferred Downstream |
| --- | --- | --- | --- |
| `member-collaboration-instruction-renderer.ts` | Provider-neutral addressing and collaboration system-prompt block | Clarified choice must remain concise, exact, and provider-shared | Whether this remains the only normative prompt-copy owner |
| `carpenter-prompt-composer.ts` | Composes shared Team instruction into provider prompts | Avoid per-provider divergence | Exact composition/test update strategy |
| `send-message-to-tool-contract.ts` | Shared message tool name/description/field descriptions | Message semantics should not imply task assignment | Which descriptions should repeat versus reference shared wording |
| `task-delegation-tool-manifest.ts` | Shared delegation description and adapter manifest | Delegation cue must say packet is already delivered and no duplicate send is needed | Exact shared text and schema-description balance |
| `root-team-run.ts` / `team-recipient-resolver.ts` | Logical recipient resolution and task delegation entry | Logical address has operation-specific execution effect | No target architecture change authorized |
| `task-delegation-service.ts` | Creates, activates, and releases fresh task execution with work packet | Current backend behavior already supports intended distinction | No lifecycle redesign authorized |
| `task-delegation-record.ts` | Public inputs/results | Returned run ID is the valid exact follow-up selector | Preserve shape unless user chooses broader Option B ticket |
| Provider parity tests/MCP adapters | Pin one shared prompt and descriptions across runtimes | Durable verification must cover semantic consistency | Proportional live-model/eval coverage design |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Static lifecycle trace | Planner delegates work to `/reviewer`, then messages `/reviewer` with the same packet | Delegation already injected the work packet into a fresh execution; logical-address messaging resolves the configured reviewer execution, not the fresh task Agent | Same-work sequence is both redundant and potentially delivered to the wrong concrete execution | Source paths in SRC-005–SRC-008 |
| Static selector trace | Planner delegates, then has genuinely new clarification | Successful result exposes exact task ingress run ID; exact-run messaging can address it while active | Preserve this capability under recommended DEC-001 Option A | Approved interaction contract and `task-delegation-record.ts` |
| Dependency availability check | Targeted unit test execution | Worktree has no installed dependencies, so no tests were run | Requirements evidence is static; downstream verification must execute targeted tests | Source log SRC-016 |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User / product owner | Stop planners from confusing message delivery with task delegation and sequencing both as one assignment | Direct / strong | Make non-interchangeability and fresh execution explicit | Does “never send later” include genuine exact-run clarification? |
| Existing approved product contract | Preserve bidirectional exact-run ordinary communication with active task executions | Authoritative prior approval / strong | Avoid silently removing a supported capability | DEC-001 requires renewed user choice if changed |
| Runtime/provider owners | One semantics across three runtimes | Code/test evidence / strong | Shared contract and parity acceptance criteria | Exact implementation design deferred |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Universal task delegation approved package | User-approved ticket state on current `personal` | Tools are composable, not interchangeable; fresh task/exact run identity is authoritative | Ticket requirements and interaction contract | New user request may intentionally refine only the prompt or may reverse follow-up capability |
| AutoByteus/Codex/Claude tool projection | Current source at base revision | Shared prompt and descriptors must remain semantically aligned | Composer/adapters/parity tests | Live model adherence varies; representative E2E recommended |

## Persisted Data And State Facts

- Affected stored or external subject: None; current TeamRun task/message data must remain unchanged.
- Location and representative shape: Existing task and communication persistence under root TeamRun; exact paths are outside this prompt-contract scope.
- Approximate volume: Not applicable; no migration or rewrite authorized.
- Current readers and writers: Existing task delegation and team communication services.
- Current unknown/extra-field behavior: Not relevant.
- Required semantics or data that must be preserved: Task IDs/status/submissions/reviews, exact AgentRun/TeamRun identities, ordinary message history, and active run routing.
- Acceptable loss, reset, rebuild, or regeneration: No persisted-data loss. Prompt/test snapshots may be updated.
- Privacy, retention, compliance, downtime, or operational constraints: None identified.
- Remaining evidence gap: None material for requirements; full doc/test inventory belongs downstream.

## Product Prototype Decision

- Prototype needed: `Yes — Requirements Visualization` (exploratory; not a final product prototype)
- Decision rationale: Although the target behavior is backend/system-prompt/tool-contract behavior, the user explicitly requested a visualized requirement. A small interactive visualizer can materially clarify the difference between configured/mounted execution, fresh delegated execution, logical address, exact run ID, and the two DEC-001 policy options.
- Requirement / behavior IDs involved: BEH-001–BEH-007; REQ-001–REQ-011
- Product decisions or uncertainties to resolve: DEC-001—preserve genuine exact-run clarification after delegation while forbidding duplicate work dispatch (recommended Option A), or prohibit all delegator-to-assignee ordinary follow-up (Option B). The visualizer must also prove that a logical-address message after delegation targets the mounted/configured ingress, not the fresh task execution.
- Critical journey and states: Initial mounted AgentTeam topology; ordinary message to configured Agent/AgentTeam ingress; fresh Agent task activation; fresh AgentTeam task activation; incorrect duplicate logical-address work message; genuine exact-run clarification; formal result submission/review; delegation activation failure.
- Known constraints and non-goals: No runtime lifecycle/schema/router/UI change; no combined tool or heuristic enforcement.
- Alternative evidence path / next action when no prototype is used: N/A — user explicitly selected visualization.
- Prototype request artifact / message reference: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-brief.md`; returned Product package `SMDS-RV-001` / `VIS-R04`
- Established separate prototype repository/root and ticket reference, when applicable: `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype`; `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/prototype-ticket.md`

## Prototype Findings

- Prototype package path (external Product Design & Prototyping repository): `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics`
- Approved UI/UX specification path: N/A — not applicable
- Review URL: `http://127.0.0.1:4179`
- Explicit user-confirmation reference: None for DEC-001 or requirements approval; Product records only prior requests to refine visualizer motion/presentation
- Journeys and scenarios validated: Existing-execution message, fresh-worker delegation, incorrect duplicate logical-address resend, DEC-001 Option A exact-run clarification versus Option B no-follow-up, AgentTeam parity, identifier distinction, formal result/review, delegation `not_started`, reduced-motion, and mobile presentation
- Final visual-reference paths: N/A — exploratory visualization only; supporting non-normative references are under `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/visual-references`
- Product decisions supported by evidence: The visualizer makes the same-work duplicate error and Option A/B trade-off concrete but does not resolve DEC-001
- Alternatives rejected or still open: DEC-001 remains open
- Mocked boundaries and production gaps: Actors, addresses, IDs, packets, timing, motion, and state are deterministic browser fixtures; no production messaging, delegation, lifecycle, persistence, routing, provider parity, or model behavior is exercised
- Requirements sections affected: Document status; UI/interaction evidence; supplemental inventory; traceability; readiness check

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/orchestration-decision-table.md` | Requirements Engineering | Make the message/delegation/result/review choice concrete with examples | Contract semantics only | REQ-001–REQ-007, REQ-010; AC-001–AC-008 | Proposed | Behavior-defining; awaiting user approval |
| `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-brief.md` | Requirements Engineering | Define the focused exploratory question, scenarios, and review objective for Product Prototyper | Requirements Visualization only | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Delivered | Request brief; user approval applies to decisions later clarified, not to this brief as a final UI/UX spec |
| `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-review.md` | Product Design & Prototyping | Record the review-ready `VIS-R04` journey, evidence, and limitations | Requirements Visualization only | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Ready for user review | Exploratory evidence; does not itself approve behavior |
| `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/visual-references` | Product Design & Prototyping | Preserve supporting screenshots of the explanatory states | Requirements Visualization only | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Available | Non-normative evidence; no final UI/UX approval applies |

## Assumptions, Unknowns, And Risks

| ID | Type (`Assumption`/`Unknown`/`Risk`) | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | User primarily wants to forbid redundant same-work dispatch, not genuine exact-run clarification | Determines whether current approved capability is preserved | DEC-001 / user | Open |
| ASM-002 | Assumption | “Synchronous” means existing-recipient communication, not transport timing | Prevents accidental unsupported API guarantee | REQ-010 / user approval | Open |
| RSK-001 | Risk | Updating only prompt prose but not tool descriptions/docs can leave contradictory cues | Models consume both system prompt and tool metadata | Downstream architecture/design | Open |
| RSK-002 | Risk | Adding too much copy can reduce rather than improve salience | Prompt instructions are already substantial | Downstream design/eval | Open |
| RSK-003 | Risk | Blanket prohibition of all post-delegation messaging would break prior approved interaction scenarios and bidirectional clarification | Would be a material behavior change, not a clarification | User decision | Open |
| RSK-004 | Risk | Deterministic exact-string tests can pass while real planners still choose both tools | Model behavior is probabilistic | Representative configured-runtime validation | Open |

## Requirement Implications

1. The runtime already has the correct deep distinction: logical message delivery targets a configured live ingress; delegation creates a fresh task execution, injects the work packet, records lifecycle state, and returns exact task ingress identity.
2. The observed problem is primarily an Agent-facing decision-contract gap. Separate one-sentence tool summaries do not state that delegation is already the delivery step or that logical address messaging cannot address the new task execution.
3. The safe default is not “these tools can never both appear in one task lifecycle.” The current approved model deliberately composes them for genuine later clarification through `target_agent_run_id`. The required prohibition is dispatching the same work through both or treating logical-address messaging as task/failure/lifecycle fallback.
4. Task submission/review separation must remain prominent because prior product history already showed agents confuse free-form lifecycle wording with formal actions.
5. Provider parity and active documentation alignment are part of the requirement because ambiguous or stale secondary cues can undo a central prompt fix.

## Notes For Downstream Architecture Design

- Verify the complete active Agent-facing wording inventory before selecting edit owners; the shared collaboration renderer and shared tool descriptions are authoritative evidence but exact target structure is an architecture decision.
- Preserve current public tool schemas/results and backend task/message behavior.
- Consider a concise intent table or adjacent contrast instead of only longer standalone descriptions; the requirement is salience and semantic parity, not a prescribed format.
- Proportional validation should include deterministic shared-copy/tool-description assertions and representative planner behavior for message-only, task-only/no-duplicate, exact-run clarification, failure, and formal result/review scenarios across supported runtime projections.
- Treat any proposal to block ordinary messages at runtime, remove exact-run task contact, alter returned fields, or merge the tools as a requirement gap requiring renewed user approval.
