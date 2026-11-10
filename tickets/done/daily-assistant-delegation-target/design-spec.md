# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (user informed through the first report to `/project_task_manager`, 2026-11-10 ~06:00 CET, and this result)
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-delegation-target/tickets/in-progress/daily-assistant-delegation-target/investigation-notes.md`
- Authorities read (design reading gate; 2026-11-10): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root; applicable: Mandatory Design Rules 1, 4, 5, 9, 11; project documents: GLOSSARY.md, Collaboration Model), `GLOSSARY.md` § Agent Definitions / Model Routing, `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-12). `references/design-examples.md`: not used.
- Project design-principle conflicts with the general principles, or discrepancies: None.

## Current-State Read

One owner decides collaboration eligibility: `CollaboratorCandidatePolicy` (`autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts`). Its `isEligibleAgent` (L211-214) requires a shared definition, rejects `EXCLUDED_AGENT_DEFINITION_IDS` (L68-69 = every ID in `BUILT_IN_AGENT_DEFINITIONS`) and rejects agents hidden by the internal-agent rule. Every surface goes through it (investigation notes, Source Log): `listEligible` (`list_available_agents` for standalone/team/org roots and a peer's `RemoteCatalogLister`), `requireEligible`/`requireAdmissible` (`@` admission, `delegate_task` catalog copies, remote delegation admission), `listCandidates` (`@` menu). The web's New chat `@` list (`autobyteus-web/utils/collaborators/draftMentionEligibility.ts:49`) mirrors the policy with a hand-kept built-in ID set (`autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts`), pinned to the server registry by `builtInAgentDefinitionIds.contract.spec.ts`.

The registry (`src/built-in-agents/built-in-agent-registry.ts`) has two built-ins: the Daily Assistant (not internal) and the Model Router (`"internal": true`). The policy equates "platform-owned built-in" with "never a collaborator"; only the Model Router is the latter (GLOSSARY: "it is never a collaboration member"). With "Show internal agents" on, only the built-in exclusion keeps the Model Router out (`model-routing-decisions-probe.mjs` L321-339 asserts it is never offered), so the Model Router needs an exclusion of its own.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: two server source files (registry: one field; policy: one set and its comments), one web utility renamed with its contract spec, one web caller, the unit tests that encode the old rule, two live probes' assertions and three module docs. One eligibility owner; no new component.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: no API, schema, persistence, lifecycle, concurrency or deployment change; the security-relevant guard (Model Router never a collaborator) is kept explicitly and tested also with internal agents shown; self/in-run/teammate guards untouched (policy L172-193 unchanged). Peers list their own Daily Assistant through the same policy once they run the new version (DESIGN.md rule 9: same version expected).
- Escalation trigger if implementation or validation discovers new impact: a surface that filters built-ins outside the policy and its web mirror; a delegated Daily Assistant copy that cannot report back to its delegator (RSK-001), or any need to change copy workspace/launch rules → return `Design Impact` / `Requirement Gap` to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `collaborator-candidate-policy.ts` L68-69, L211-214 | All built-ins excluded in the one eligibility predicate | Change the excluded set, nothing else | None |
| Code | `built-in-agent-registry.ts` L9-26 | Registry entry: id, templateDirName, displayName | Add the per-built-in fact `collaborationEligible` here | None |
| Code grep | `listEligible`/`requireEligible`/`requireAdmissible`/`BUILT_IN_AGENT_DEFINITIONS` callers (investigation notes) | Only the policy uses built-ins for eligibility; `personal-settings-service.ts:59,131` uses them for launch-default ownership (unrelated); bootstrapper for sync | No other surface to change; bootstrapper ignores the new field | None |
| Code | web `builtInAgentDefinitionIds.ts`, `draftMentionEligibility.ts:49`, contract spec | Set used only by draft `@` eligibility | Replace with an ineligible set, pinned to the registry's `collaborationEligible: false` entries | None |
| Code | `src/built-in-agents/templates/model-router/agent-config.json` | `"internal": true` | Model Router stays out by its own eligibility mark, independent of the internal rule | None |
| Command | server unit tests (investigation notes, Runtime findings) | Old rule reproduced: DA rejected by `requireAdmissible`, not listed, peer `/built_in` refused | Tests flip; new tests fail on base | None |
| Doc | `tickets/done/delegated-copy-project-workspace` REQ-001/002 | Copy workspace rule | Unchanged (REQ-004) | None |

## Intended Change

Make "may this built-in be a collaborator" an explicit fact of each built-in in the registry: Daily Assistant yes, Model Router no. The policy excludes only built-ins marked not eligible; the web mirror follows the same fact. Nothing else in collaboration changes.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas: built-in agent registry (one field), collaboration eligibility policy (excluded set), web draft `@` eligibility mirror (renamed set + contract spec), tests that encode the old rule, two live probes' assertions, module docs that state "never built-ins".
- Derived consumers (Principle 11): `BUILT_IN_AGENT_DEFINITIONS` gains `collaborationEligible`. Readers: (1) `CollaboratorCandidatePolicy` → derives its ineligible set from it (changed); (2) `BuiltInAgentBootstrapper` (L60-126) → reads id/templateDirName/displayName only (unchanged); (3) `personal-settings-service.ts:59` → reads ids for `BUILT_IN` ownership (unchanged); (4) web contract spec → parses `collaborationEligible: false` entries (changed); (5) tests importing the registry (`remote-catalog-lister.test.ts`, `remote-delegation-receiver.test.ts`, `collaborator-admission.test.ts`) → switch from `BUILT_IN_AGENT_DEFINITIONS[0]` (the DA) to the Model Router as the ineligible fixture (changed).
- Deliberately left alone: copy workspace and launch rules (autobyteus-97, launch resolver); the Daily Assistant's template (tools, prompt); internal-agent visibility rule; self/in-run/teammate/own-team guards; New chat target picker and `×` default; Org/Team eligibility; personal settings; the archived tickets' requirement texts.
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / ACs | Trigger | Existing Behavior / Evidence | Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002 / AC-001 | `list_available_agents` | DA, Router absent (policy L211-214) | DA listed at `/daily_assistant`; Router absent always | DS-002 |
| BEH-002 | System | REQ-001, REQ-004 / AC-002, AC-003 | `delegate_task('/daily_assistant')` | Refused, unknown address | DA copy created; workspace per autobyteus-97 (preserved) | DS-001 |
| BEH-003 | System | REQ-001, REQ-002 / AC-004 | peer list / remote delegation | DA absent / refused | Listed / admitted; Router absent / refused | DS-003 |
| BEH-004 | User | REQ-001…003 / AC-005 | `@` live run, New chat | DA never offered | Offered except in its own run/draft; Router never | DS-004 |
| BEH-005 | Contract | REQ-003 / AC-006 | self / in-run delegation | Refused | Preserved | DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (reported as a bug)
- Current design issue found: `Yes`
- Structural triggers that fire: **Vocabulary drift** (Principle 15): "built-in" (platform-owned, synced from a template) is used to mean "never a collaborator" (policy L68 comment, web mirror comment "the server never admits a built-in as an `@` candidate"); GLOSSARY separates built-in from internal. **Behavior by absence** (Principle 13): the Model Router's exclusion is a side effect of being in the bootstrap list, not an explicit rule. Triggers ruled out: Repeated coordination (one policy owner; web mirror is pinned by contract spec — kept, not duplicated further); Authoritative boundary (all callers go through the policy); Persisted-data transition (nothing stored).
- Root cause classification: `Missing Invariant` — the right owner exists, but the rule it enforces is "all built-ins" instead of the real invariant "agents marked never-a-collaborator".
- Refactor needed now: `No` beyond the explicit field and set rename.
- Evidence: investigation notes Source Log rows 1-7.
- Design response: an explicit `collaborationEligible` flag per built-in in the registry; the policy and the web mirror derive their ineligible set from it.
- Refactor rationale: smallest change that names the real rule at its owner.
- Intentional deferrals and residual risk: None.

## Terminology

- **Collaboration-eligible**: may be an `@` candidate, be listed by `list_available_agents` (locally and to peers) and be delegated to as a catalog copy. Matches the policy's existing "eligible" wording (policy L72-81). `GLOSSARY.md` needs no new entry: "built-in agent" and "internal agent" keep their meanings; the Model Router entry already says it is never a collaboration member.

## Section Fill Order

Followed.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the all-built-ins excluded set; the web `BUILT_IN_AGENT_DEFINITION_IDS` / `isBuiltInAgentDefinitionId` (replaced); stale test import `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` in `collaborator-admission.test.ts:4` (the registry no longer exports it).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` — eligibility is computed per call from definitions; nothing is stored. Built-in folders in app data and user data unchanged.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related BEH | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, BEH-005 | Agent's `delegate_task` | Daily Assistant copy runs the Task | `CollaboratorCandidatePolicy` (admission) | The refused path |
| DS-002 | Primary End-to-End | BEH-001 | Agent's `list_available_agents` | Entries returned | `CollaboratorCandidatePolicy.listEligible` | Discovery |
| DS-003 | Primary End-to-End | BEH-003 | Peer's list / remote delegation request | Peer gets entries / copy started on this node | same policy on the receiving node | Peer surfaces |
| DS-004 | Primary End-to-End | BEH-004 | User types `@` | Candidate list / admitted mention | server policy; web draft mirror before the run exists | Same rule in the UI |

## Primary Execution Spine(s)

- DS-001: `delegate_task tool -> root collaborators (standalone / team / org) -> CollaboratorAdmission -> CollaboratorCandidatePolicy.requireAdmissible (isEligibleAgent) -> CatalogAddressMap (/daily_assistant) -> CollaboratorLaunchResolver + copy launch (workspace per autobyteus-97) -> Daily Assistant copy run`
- DS-002: `list_available_agents tool -> root collaborators.listAvailable -> CollaboratorCandidatePolicy.listEligible (isEligibleAgent) -> CatalogAddressMap -> tool result`
- DS-003: `peer request -> RemoteCatalogLister / remote delegation receiver -> CollaboratorCandidatePolicy (listEligible / requireAdmissible) -> answer / copy`
- DS-004: `composer @ -> collaboratorMentionCandidates (server listCandidates) or draftMentionCandidates (web, before the run) -> chip -> requireEligible at send`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The address resolves through the catalog map built from eligible definitions; with the DA eligible it gets `/daily_assistant`, passes the own-definition and in-run checks, and launches like any copy | policy, admission, address map, launch | policy | built-in registry (eligibility fact) |
| DS-002 | Same eligibility, listed once at its address | policy | policy | registry |
| DS-003 | The receiving node applies its own policy | policy | policy | registry |
| DS-004 | Server list and web mirror apply the same fact; own definition excluded | policy; web mirror | policy (web mirrors) | contract spec pins mirror |

## Spine Actors / Main-Line Nodes

Tool handlers, root collaborators, `CollaboratorAdmission`, `CollaboratorCandidatePolicy`, `CatalogAddressMap`, copy launch. Only the policy's eligibility predicate input changes.

## Ownership Map

- `CollaboratorCandidatePolicy`: owns the eligibility rule (unchanged ownership; its ineligible set now comes from the registry flag).
- `built-in-agent-registry.ts`: owns the facts about each built-in, now including whether it may be a collaborator.
- Web `collaborationIneligibleAgentDefinitionIds.ts`: a pinned mirror, owns nothing beyond the ID set.

## Thin Entry Facades / Public Wrappers

N/A — no facade changes.

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `EXCLUDED_AGENT_DEFINITION_IDS` (all built-ins) in the policy | Wrong rule | `COLLABORATION_INELIGIBLE_AGENT_DEFINITION_IDS` from `collaborationEligible: false` | — |
| web `BUILT_IN_AGENT_DEFINITION_IDS`, `isBuiltInAgentDefinitionId`, file `utils/agents/builtInAgentDefinitionIds.ts` and its contract spec | Only reader is draft `@` eligibility | `utils/collaborators/collaborationIneligibleAgentDefinitionIds.ts` + contract spec | The web `MODEL_ROUTER_AGENT_DEFINITION_ID` constant moves with it; the `DEFAULT_CHAT_AGENT_DEFINITION_ID` import is dropped from it |
| `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` import and its fixture line in `collaborator-admission.test.ts` (L4, L27) | Dead: the registry exports no such constant (grep of `built-in-agent-registry.ts`); the fixture id is `undefined` | Plain shared-agent fixture if still needed | Touched file |

## Return Or Event Spine(s)

N/A — synchronous calls; no event change.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Built-in registry `collaborationEligible` | DS-001…004 | policy | States the per-built-in fact | One owner of facts about built-ins | Hard-coding the Router ID in the policy would split facts about built-ins across files |

## Ownership Boundaries

Callers use the policy only; nobody else filters built-ins for collaboration. The web mirror exists only because New chat has no run yet; it is pinned by its contract spec.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `CollaboratorCandidatePolicy` | ineligible set, internal-visibility check, own/in-run checks | admission, root collaborators, remote lister/receiver | A caller filtering built-in IDs itself | Extend the policy |

## Dependency Rules

- The policy may import the registry (as today). The registry imports nothing from collaboration.
- Forbidden: collaboration code testing `DAILY_ASSISTANT_AGENT_DEFINITION_ID` or `MODEL_ROUTER_AGENT_DEFINITION_ID` directly for eligibility; any surface other than the policy (and its pinned web mirror) deciding eligibility.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `BuiltInAgentDefinition.collaborationEligible: boolean` | built-in agent | whether it may be a collaborator | per registry entry | required field; `satisfies` enforces it for every entry |
| `isCollaborationIneligibleAgentDefinitionId(id)` (web) | agent definition id | mirror check | agent definition id | agents only |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `collaborationEligible` | Yes | Yes | Low | — |
| web mirror check | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| eligibility flag | `collaborationEligible` | Yes | Yes (policy's "eligible") | Low | — |
| ineligible set | `COLLABORATION_INELIGIBLE_AGENT_DEFINITION_IDS` (server policy and web) | Yes | Yes | Low | — |
| old name "built-in" for eligibility | removed | — | Fixes drift | — | Comments in policy L68, L74-81, L168-171 and web mirror reworded |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Per-built-in fact | built-in agent registry | Extend | Already the owner of built-in facts |
| Eligibility | `CollaboratorCandidatePolicy` | Reuse | Single owner |
| Web pin | existing contract spec pattern | Reuse | Same parsing approach |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Owners Served | Decision |
| --- | --- | --- | --- | --- |
| `built-in-agents` | `collaborationEligible` fact | all | policy | Extend |
| `agent-collaboration/collaborators` | ineligible set | all | — | Extend |
| web `utils/collaborators` | draft mirror | DS-004 | draft eligibility | Move from `utils/agents` |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction needed).

## Reusable Owned Structures Check

N/A — no repeated structure introduced.

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `BuiltInAgentDefinition` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | built-in agents | registry | add `collaborationEligible` (DA `true`, Model Router `false`), with a doc comment: the Model Router is never a collaborator (also with internal agents shown) |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts` | collaboration | policy | `COLLABORATION_INELIGIBLE_AGENT_DEFINITION_IDS` = registry entries with `collaborationEligible: false`; reword comments (L68, class doc L72-81 "the internal built-ins" → "the Model Router", `requireEligible` doc "non-built-in") |
| `autobyteus-web/utils/collaborators/collaborationIneligibleAgentDefinitionIds.ts` (renamed from `utils/agents/builtInAgentDefinitionIds.ts`) | web collaborators | mirror | `MODEL_ROUTER_AGENT_DEFINITION_ID`, `COLLABORATION_INELIGIBLE_AGENT_DEFINITION_IDS`, `isCollaborationIneligibleAgentDefinitionId` |
| `autobyteus-web/utils/collaborators/__tests__/collaborationIneligibleAgentDefinitionIds.contract.spec.ts` (renamed from `utils/agents/__tests__/builtInAgentDefinitionIds.contract.spec.ts`) | web tests | contract pin | parse registry entries with `collaborationEligible: false`, resolve their id constants, expect equality with the web set; also assert every registry entry declares the flag |
| `autobyteus-web/utils/collaborators/draftMentionEligibility.ts` | web | draft eligibility | use the new check; doc comment "shared Agent definitions that are not collaboration-ineligible (the Model Router)" |

## Applied Patterns

Registry (existing).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Change |
| --- | --- | --- |
| files in Final File Responsibility Mapping | File | Modify / Rename-Move |
| `autobyteus-server-ts/tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts` | File | Modify: DA offered/listed/admissible; Model Router (real id) not; remove dead MEMORY_COMPACTOR import/fixture; own-definition case for a DA run (AC-006) |
| `autobyteus-server-ts/tests/unit/agent-collaboration/collaborators/internal-agent-eligibility.test.ts` | File | Modify: add the real Model Router id, `internal: true`, with internal agents shown → still not listed/admitted (AC-001, QR-001) |
| `autobyteus-server-ts/tests/unit/remote-collaboration/remote-catalog-lister.test.ts`, `remote-delegation-receiver.test.ts` | File | Modify: ineligible fixture = Model Router; add DA listed and admitted (AC-004) |
| `autobyteus-server-ts/tests/unit/agent-tools/agent-discovery/list-available-agents-tool.test.ts` | File | Modify only if it asserts DA absence (check) |
| web draft eligibility spec (`utils/collaborators/__tests__/…draftMentionEligibility…`) | File | Modify/Add: DA offered for a non-DA target, not for a DA target; Router never (AC-005) |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (L507, L812, L1170-1223), `chat-entry-live-probe.mjs` (L298) | File | Modify assertions: DA offered where it is not the run's own definition; Router / Org never |
| `autobyteus-server-ts/docs/modules/agent_communication.md` L505, `remote_collaboration.md` L61, `agent_definition.md` L167-169 | File | Modify: "never built-ins" → "never the Model Router"; DA line notes it is a collaborator like any shared agent |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| web `utils/collaborators/` | Off-Spine Concern | Yes | Low | Next to its only reader |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Rule location | `{ id: MODEL_ROUTER_AGENT_DEFINITION_ID, templateDirName: "model-router", displayName: "Model Router", collaborationEligible: false }` and `new Set(BUILT_IN_AGENT_DEFINITIONS.filter((e) => !e.collaborationEligible).map((e) => e.id))` | `const EXCLUDED = new Set([MODEL_ROUTER_AGENT_DEFINITION_ID])` hard-coded in the policy, or relying on `internal: true` alone | The internal rule depends on a user setting; the fact belongs with the built-in's other facts |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep `isBuiltInAgentDefinitionId` on the web as an alias | Fewer renames | Rejected | Renamed set and check |
| Separate `@` vs delegation eligibility (DA delegable but not mentionable) | Keep old `@` menu | Rejected (DEC-002) | One rule |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Registry flag. 2. Policy set + comments. 3. Server tests (start from the flipped assertions failing on base). 4. Web rename + draft eligibility + contract spec + web unit spec. 5. Live probe assertions. 6. Module docs. 7. Server and web unit suites and type checks per TESTING.md; API/E2E on an isolated node: real PM-style `delegate_task('/daily_assistant')` with a saved Task (AC-002/003), `list_available_agents` (AC-001), a second isolated node as peer (AC-004).

## Key Tradeoffs

- One rule for `@` and delegation (DEC-002) over a split rule: one owner, at the cost of the DA appearing in other runs' `@` menus (intended).

## Risks

- RSK-001 (delegated DA copy reporting back) — verify in API/E2E; any failure there is general delegated-copy behavior → `Design Impact` back to the Solution Designer.

## Guidance For Implementation

- Reproduction to start from: `autobyteus-server-ts`: `npx vitest run tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts tests/unit/remote-collaboration/remote-catalog-lister.test.ts tests/unit/remote-collaboration/remote-delegation-receiver.test.ts` — write the new DA-eligible expectations first (they fail on base), then the fix turns them green.
- Do not touch the Daily Assistant template or the copy workspace/launch code.
