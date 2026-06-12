# Design Spec

## Current-State Read

Latest `origin/personal` already contains the major self-evolver communication architecture. `send_message_to` is a shared agent-communication tool with two exact selectors: team-local `recipient_name` and global live-only `target_agent_run_id`. `SingleAgentEvolverStrategy` launches a visible Skill Self-Evolver helper run, registers a one-use direct-message grant, posts anonymized evidence and editable skill roots to the helper, and summarizes grant usage into the self-evolution record.

The current mismatch is small but user-visible to the target agent contract: the helper is instructed and granted to send `message_type: "self_evolution_outcome"`. That string describes the producer workflow rather than the receiver-visible business event. The target run receives a message whose business meaning is: durable skill guidance has been updated. Also, since a skill is a package directory and the self-evolver can update/create/reorganize supporting files inside listed skill roots, `reference_files` guidance must be dynamic and based on actual changed/relevant files, not fixed to `SKILL.md`.

## Intended Change

Replace the self-evolver target-facing direct message type with `skill_update`, tighten helper instructions so target messages are sent only after meaningful durable skill package file changes, and update final `reference_files` guidance to be chosen dynamically from changed/relevant surviving files inside editable skill roots. Preserve the existing `send_message_to(target_agent_run_id=...)` router, direct-message grant mechanism, self-evolution record lifecycle, and visible helper run behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Contract Cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, small semantic contract/naming drift.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness / Naming Drift.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No broad refactor; yes clean-cut target-facing message contract replacement.
- Evidence: `self_evolution_outcome` appears in `single-agent-evolver-strategy.ts`, built-in evolver instructions, tests, and docs. The routing/grant architecture itself is healthy.
- Design response: Reuse existing self-evolution and agent-communication owners. Replace only the target-facing message type/prompt/metadata/docs/tests. Do not introduce a new notification path.
- Refactor rationale: The existing spine and owners are correct; a larger refactor would duplicate already-merged work.
- Intentional deferrals and residual risk, if any: Automatic runtime skill reload is deferred; the current product behavior remains model-visible direct instruction to the active target run.

## Terminology

- `skill_update`: target-facing `send_message_to.message_type` meaning the target's durable skill package guidance was meaningfully updated.
- `editable skill root`: an absolute skill package directory listed in the self-evolver task prompt and allowed by the direct-message grant as a reference-file root.
- `target run`: the active `AgentRun.runId` supplied to the helper as `target_agent_run_id`.

## Design Reading Order

Read the design as: user-triggered self-evolution spine -> helper direct-message return spine -> file responsibility mapping.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove `self_evolution_outcome` as the target-facing direct-message type. Do not keep a dual accepted target-facing contract.
- No obsolete router/service files are removed because the architecture remains correct.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User clicks Self improve | Skill Self-Evolver receives task prompt and editable roots | `SelfEvolutionService` / `SingleAgentEvolverStrategy` | Establishes the helper launch and prompt contract. |
| DS-002 | Return-Event | Helper makes durable skill package changes | Target run receives `skill_update` direct message | `send_message_to` dispatcher/router with self-evolution grant | This is the contract being changed. |
| DS-003 | Bounded Local | Helper considers final report | Sends or does not send direct message | Skill Self-Evolver prompt/instruction | Controls no-change behavior and dynamic references. |
| DS-004 | Bounded Local | Direct message delivery attempt | Grant usage summary recorded | `GlobalAgentRunMessageRouter` / `DirectAgentRunMessageGrantRegistry` | Preserves safety and record summary. |

## Primary Execution Spine(s)

`SelfEvolutionComposerCta -> GraphQL SelfEvolutionResolver -> SelfEvolutionService -> SingleAgentEvolverStrategy -> Skill Self-Evolver AgentRun`

`Skill Self-Evolver AgentRun -> send_message_to(target_agent_run_id, message_type="skill_update") -> SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> Target AgentRun`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The UI starts a manual self-evolution run. The server resolves target context, writable skill roots, anonymized evidence, and launches the visible helper. The task prompt includes the exact target run id and tells the helper how to send a `skill_update` only after durable skill changes. | UI CTA, GraphQL resolver, self-evolution service, single-agent strategy, helper run | `SelfEvolutionService` and `SingleAgentEvolverStrategy` | Capability/eligibility, evidence projection, skill target resolution |
| DS-002 | After editing files inside editable skill roots, the helper calls `send_message_to` with `target_agent_run_id`, `message_type: "skill_update"`, concise content, and dynamic reference files. The global router validates the grant and posts a model-visible direct message to the target run. | Helper run, send-message dispatcher, global router, target run | `GlobalAgentRunMessageRouter` for delivery; `SingleAgentEvolverStrategy` for grant setup | Grant validation, reference root enforcement, event emission |
| DS-003 | If no durable file change was made, the helper does not message the target. Its own final response may explain no-op, and grant usage summary remains not attempted. | Helper prompt decision | Skill Self-Evolver prompt/instruction | Record summary of not-attempted delivery |
| DS-004 | The router records whether the allowed one-time direct message was accepted, rejected, target-inactive, or not attempted, and the strategy maps that usage into the record. | Grant registry, strategy summary, record lifecycle | `DirectAgentRunMessageGrantRegistry` and `SingleAgentEvolverStrategy` | Existing record lifecycle |

## Spine Actors / Main-Line Nodes

- `SelfEvolutionComposerCta`: user entrypoint; unchanged.
- `SelfEvolutionResolver`: GraphQL mutation/query boundary; unchanged.
- `SelfEvolutionService`: self-evolution orchestration; unchanged except downstream result semantics stay intact.
- `SingleAgentEvolverStrategy`: owner of helper launch, grant creation, and helper task prompt; main changed production file.
- `Skill Self-Evolver`: helper agent definition/instruction; main changed prompt file.
- `SendMessageToDispatcher` / `GlobalAgentRunMessageRouter`: existing delivery boundary; reused.
- `Target AgentRun`: receiver of model-visible `skill_update` message.

## Ownership Map

- `SingleAgentEvolverStrategy` owns the target-specific self-evolution task contract: exact target run id, editable roots, allowed message type, and completion summary from grant usage.
- `Skill Self-Evolver` owns reasoning over evidence, file edits inside roots, content of final skill update message, and dynamic `reference_files` selection.
- `agent-communication` owns `send_message_to` selector parsing, global routing, grant enforcement, target active-run lookup, runtime input construction, and direct event emission.
- `SelfEvolutionRecordLifecycle` owns persistence of summary status; it does not infer file changes or message content.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `startAgentRunSelfEvolution` / `startTeamMemberSelfEvolution` | `SelfEvolutionService` | API entrypoint for UI/manual starts | Prompt wording, grant semantics, message-type policy |
| `send_message_to` runtime tool wrapper | `SendMessageToDispatcher` / `GlobalAgentRunMessageRouter` | Runtime tool entrypoint | Self-evolution-specific prompt decisions |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Target-facing `self_evolution_outcome` message type in prompts/grants/docs/tests | Producer-oriented and semantically wrong for target agent | `skill_update` target-facing message type | In This Change | Clean-cut replacement; no dual accept list. |
| Metadata key `self_evolution_outcome_message_type` | Encodes stale outcome naming in helper task metadata | `self_evolution_target_message_type` or equivalent target-oriented key | In This Change | Keep only new key unless implementation finds no consumers. |
| Prompt wording that suggests reporting no durable change to target | Target should receive `skill_update` only if skills changed | Helper final response + record not-attempted summary | In This Change | No new notification path. |

## Return Or Event Spine(s) (If Applicable)

`Target AgentRun.postUserMessage -> accepted -> Target AgentRun.emitLocalEvent(INTER_AGENT_MESSAGE) -> frontend/direct run stream renders the direct inter-agent message through existing handlers`

No new `SYSTEM_TASK_NOTIFICATION` event is introduced.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `SingleAgentEvolverStrategy`.
  - `resolve settings -> create helper run -> register grant -> post task -> wait for completion -> summarize grant usage`.
  - Matters because the allowed message type must change in both grant and prompt atomically.
- Parent owner: Skill Self-Evolver prompt.
  - `inspect evidence -> edit skill package files or no-op -> choose changed/relevant reference files -> send skill_update or no target message`.
  - Matters because reference files are dynamic and no-op behavior must not create a misleading skill update.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Eligibility/capability evaluation | DS-001 | `SelfEvolutionService` | Decide whether button/run can start | Existing behavior not changed | Would confuse this ticket with config work |
| Evidence projection | DS-001 | `SelfEvolutionEvidenceBuilder` | Build anonymized work history | Existing behavior not changed | Would enlarge scope unnecessarily |
| Direct-message grant validation | DS-002, DS-004 | `GlobalAgentRunMessageRouter` | Enforce target, message type, refs, count, expiry | Protects global direct messaging | Helper would gain arbitrary messaging power |
| Reference-file selection guidance | DS-003 | Skill Self-Evolver prompt | Tell helper how to select changed/relevant files | Skill package edits are dynamic | Hard-coded refs would be stale or wrong |
| Record lifecycle | DS-004 | `SelfEvolutionRecordLifecycle` | Persist final summary | Existing behavior not changed | Record layer would start inferring skill diffs |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Deliver target run message | `agent-communication` | Reuse | Already owns `send_message_to` and global direct routing | N/A |
| Limit helper message | `DirectAgentRunMessageGrantRegistry` | Reuse | Already restricts message type/reference roots/count/expiry | N/A |
| Helper launch/prompt | `self-evolution` strategy | Extend | Strategy already owns helper task contract | N/A |
| Helper durable instruction | built-in skill-evolver agent template | Extend | Template already owns durable helper behavior | N/A |
| UI notification | N/A | Do Not Create | Existing direct inter-agent message is the intended path | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `self-evolution` | Message type grant, helper prompt metadata, final delivery summary | DS-001, DS-003, DS-004 | `SingleAgentEvolverStrategy` | Extend | Main production change. |
| `built-in-agents/templates/skill-evolver` | Durable helper instruction | DS-003 | Skill Self-Evolver | Extend | Prompt-only change. |
| `agent-communication` | Direct route and grant validation | DS-002, DS-004 | Dispatcher/router/grant registry | Reuse | No production change expected. |
| Docs/tests | Contract validation and documentation | All | Downstream readers and coverage | Extend | Update stale literals. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `single-agent-evolver-strategy.ts` | self-evolution | Strategy | Change allowed message type, prompt rule, metadata key, optional internal grant purpose | Existing strategy owns this contract | Optional constant |
| `skill-evolver/agent.md` | built-in agents | Helper durable instruction | Change end-of-task instruction and dynamic refs guidance | Existing template owns helper persona/instructions | Optional constant not needed in markdown |
| `global-agent-run-message-router.test.ts` | agent-communication tests | Router/grant tests | Update self-evolver grant examples to `skill_update` | Existing tests cover grant behavior | N/A |
| `single-agent-evolver-strategy.test.ts` | self-evolution tests | Strategy tests | Verify prompt/metadata/grant new contract | Existing tests cover strategy prompt | N/A |
| docs | docs | Documentation | Replace stale direct-message contract | Existing docs locations | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_update` message-type literal | Optional `autobyteus-server-ts/src/self-evolution/domain/messages.ts` or local strategy constant | self-evolution | If used in strategy metadata/grant/tests, a constant prevents drift | Yes | Yes | A generic message-type registry |

Design recommendation: use at least a local exported self-evolution constant if implementation touches the same literal several times in production code. Do not create a broad cross-subsystem message-type registry for this small ticket.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `skill_update` message type | Yes | Yes | Low | Keep one exact target-facing message type. |
| Helper metadata key | Yes after rename | Yes | Low | Prefer `self_evolution_target_message_type`; remove stale outcome key. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | self-evolution | Strategy | Register `skill_update` grant, prompt helper to send only after durable file changes, set target-message metadata | Existing strategy owns helper task contract | Yes if constant added |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | built-in agents | Built-in helper instruction | Durable instruction for `skill_update`, no-change behavior, and dynamic reference files | Existing file owns helper role | No |
| `autobyteus-server-ts/tests/self-evolution/single-agent-evolver-strategy.test.ts` | self-evolution tests | Strategy coverage | Verify new prompt/metadata behavior | Existing test owner | Maybe constant import if exposed |
| `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts` | agent-communication tests | Router coverage | Verify grant message-type restrictions with `skill_update` examples | Existing test owner | No |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | docs | Self-evolution docs | Document `skill_update` and dynamic refs | Existing doc owner | No |
| `autobyteus-server-ts/docs/modules/agent_communication.md` and frontend docs containing old string | docs | Communication/architecture docs | Replace old message-type references | Existing docs owner | No |

## Ownership Boundaries

The self-evolution strategy remains authoritative for self-evolver launch and prompt/grant setup. The helper remains authoritative for content and dynamic reference-file selection because it knows what it actually changed. The agent-communication router remains authoritative for enforcing whether a direct message can be delivered. No caller should bypass the router or inspect raw file diffs to synthesize a target message.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SingleAgentEvolverStrategy.run` | helper run creation, grant registration, task prompt | `SelfEvolutionService` | Service constructing grants/prompt itself | Extend strategy input/output |
| `SendMessageToDispatcher.dispatch` | selector parsing, route split | runtime tool wrappers | Tool wrapper calling global router directly after ad hoc parsing | Extend dispatcher contract |
| `GlobalAgentRunMessageRouter.deliver` | active run lookup, grant validation, runtime message/event emission | dispatcher | Self-evolution service posting directly to target run | Extend router/grant contract |

## Dependency Rules

- `self-evolution` may depend on `agent-communication` grant/router-facing contracts only through existing public services/registries.
- Runtime tool wrappers must continue to use `SendMessageToDispatcher`.
- The helper prompt may instruct `send_message_to`; it must not instruct direct file edits outside editable roots or direct target-run internals.
- Do not add a server-authored notification path for this target update.
- Do not allow both `self_evolution_outcome` and `skill_update` as accepted target-facing self-evolver message types.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `send_message_to` | Agent message delivery | Deliver team-local or exact active-run message | exactly one of `recipient_name` or `target_agent_run_id` | Unchanged public tool shape. |
| `DirectAgentRunMessageGrantRegistry.register/evaluate` | Optional exact-run direct-message grants | Restrict sender/target/message/ref/count/expiry | sender run id + target run id + message type + references | Allow `skill_update` for this helper. |
| `SingleAgentEvolverStrategy.run` | Single-agent self-evolver execution | Launch helper and define task contract | target context + evidence + editable skill targets | Prompt/grant message type changes here. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `send_message_to` | Yes | Yes | Low | No shape change. |
| direct-message grant | Yes | Yes | Low | Change allowed message literal only. |
| strategy prompt metadata | Yes after rename | Yes | Low | Use target-oriented metadata key. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Target-facing message type | Current `self_evolution_outcome` | No | High | Replace with `skill_update`. |
| Internal grant purpose | Current `self_evolution_outcome`; proposed `self_evolution_skill_update` | Proposed Yes | Low | Optional internal rename. |
| Metadata key | Current `self_evolution_outcome_message_type`; proposed `self_evolution_target_message_type` | Proposed Yes | Low | Rename. |

## Applied Patterns (If Any)

- Strategy: existing `SingleAgentEvolverStrategy` remains the selected evolver strategy.
- Registry: existing `DirectAgentRunMessageGrantRegistry` remains the grant store/evaluator.
- Adapter/tool wrapper: existing runtime-specific `send_message_to` wrappers continue through the shared dispatcher.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | File | Self-evolution strategy | Prompt/grant/metadata target message type | Existing owner | Router internals |
| `autobyteus-server-ts/src/self-evolution/domain/messages.ts` or local strategy constant | File/constant | Self-evolution domain | Optional `skill_update` constant | Prevents repeated production literal drift | Generic global message registry |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | File | Helper instruction | Durable helper behavior | Existing built-in template | Runtime-specific code |
| `autobyteus-server-ts/tests/...` | Files | Test suites | Updated coverage | Existing coverage owners | Production behavior |
| `autobyteus-server-ts/docs/...`, `autobyteus-web/docs/...` | Files | Documentation | Updated contract docs | Existing docs | Stale old contract |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/self-evolution` | Main-Line Domain-Control | Yes | Low | Current owner of strategy/prompt contract. |
| `src/agent-communication` | Main-Line Domain-Control / Adapter boundary | Yes | Low | Reused unchanged. |
| `built-in-agents/templates/skill-evolver` | Off-Spine Concern serving helper bootstrap | Yes | Low | Existing built-in helper definition. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Target message call | `send_message_to({ target_agent_run_id, message_type: "skill_update", content: "Your skill guidance has been updated...", reference_files: ["/skill/SKILL.md", "/skill/references/checklist.md"] })` | `message_type: "self_evolution_outcome"` | Shows receiver-oriented contract. |
| Dynamic references | Include files actually changed or directly relevant inside editable roots; mention deleted files in content and reference surviving entrypoint/checklist files. | Always attach only `SKILL.md` regardless of actual edits. | Skill packages can contain many support files. |
| No-op behavior | Helper final answer: "No durable skill update was warranted"; no target direct message. | Send `skill_update` saying no change happened. | Avoids misleading target agent. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept both `self_evolution_outcome` and `skill_update` in self-evolver grant | Could avoid updating tests/docs all at once | Rejected | Update all in-scope literals to `skill_update`. |
| Keep old metadata key alongside new key | Could preserve any accidental consumers | Rejected | Replace with target-oriented key; update tests. |
| Add server notification in addition to helper direct message | Previous design history had notifications | Rejected | Keep helper-authored direct message only. |

## Derived Layering (If Useful)

Not needed beyond the spine/ownership mapping. The existing subsystem layering remains valid.

## Migration / Refactor Sequence

1. Add or define the self-evolution target message-type constant `skill_update` in the self-evolution owner if useful.
2. Update `SingleAgentEvolverStrategy`:
   - allowed message type becomes `skill_update`;
   - prompt says send only after durable skill package file changes;
   - prompt explains dynamic `reference_files` selection;
   - metadata key becomes target-oriented.
3. Update built-in Skill Self-Evolver instruction with the same target-oriented behavior.
4. Update tests that assert prompt/metadata/grant behavior and router grant examples.
5. Update self-evolution/agent-communication/frontend docs containing stale `self_evolution_outcome` direct-message contract.
6. Run focused tests selected by implementation engineer; API/E2E engineer later decides broader execution coverage.
7. Confirm static search no longer finds stale target-facing `self_evolution_outcome` contract references.

## Key Tradeoffs

- `skill_update` is shorter and target-oriented, but less explicit about producer. Internal grant purpose can retain self-evolution traceability if desired.
- Sending no target message on no-op avoids confusing the target but means no-op details live in the helper run/record rather than target conversation.
- Dynamic references require the helper to reason about changed/relevant files, but that is better than hard-coded stale references.

## Risks

- A helper may still forget to call `send_message_to`; existing grant usage summary records `send_message_not_attempted`.
- If target run becomes inactive, existing router rejects delivery and existing summary records target-inactive/rejected behavior.
- If users expect immediate automatic skill reload, this ticket will not satisfy that larger behavior.

## Guidance For Implementation

- Keep this as a small clean-cut contract update; do not refactor the router or add notification services.
- Prefer a single production constant for `skill_update` if it avoids repeated literals in production code.
- Ensure prompt wording clearly distinguishes changed files from relevant reference files and does not require `SKILL.md` if only support files changed.
- For deleted files, tell the helper to mention deletion in content and include a surviving relevant reference file instead.
- Update docs/tests in the same change so no stale `self_evolution_outcome` target-facing contract remains.
