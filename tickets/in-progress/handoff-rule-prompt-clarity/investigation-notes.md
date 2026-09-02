# Requirements Investigation Notes

## Investigation Meta

- Request / ticket: `HRPC-2026-09-01` — Handoff-rule prompt clarity
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/handoff-rule-prompt-clarity`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/handoff-rule-prompt-clarity` / `requirements/handoff-rule-prompt-clarity`
- Base or reference revision: `773bce779f195c22194c6bed1b242be6e222d06e` (`personal` at worktree creation)
- Bootstrap result: Dedicated clean task worktree created successfully.
- Bootstrap blocker: None.
- Current requirements revision ID: `RER-002`
- Investigation status: Complete; user approved the single-most-specific-rule, single-recipient behavior and final normative paragraph on 2026-09-02.

## Initial Request And Clarifications

- Original request: Locate the fixed backend Team communication text behind wording like "The handoff rules require notifying every matching owner" / "notify every matching target," because it causes confusion.
- Clarifications received: The user confirmed that a completion/blocker handoff is for one recipient, accepted selection of the single rule whose condition most specifically applies, approved the final sentence, and requested work to start on 2026-09-02.
- User-supplied facts and constraints: The "every matching" mandate is causing problems.
- Initial ambiguity: Resolved. The final policy is one most specifically applicable rule and one recipient per outcome; returned order is not introduced as a priority contract.

## Product And Domain Understanding

- Product area: AgentTeam provider-shared prompt composition and rule-based handoff guidance.
- Affected actors or systems: Team-bound Agents, configured handoff recipients, AutoByteus/Codex/Claude Team-member prompts.
- Existing user or operational purpose: Guide an Agent at stage completion or blocker time to inspect configured outgoing conditions and communicate the outcome to the appropriate next owner.
- Relevant terminology: `get_handoff_rules` returns possible outgoing `{when, recipient_address}` entries; it does not execute condition matching.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-01 | Code | `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:119-128` | Locate disputed fixed text. | Exact current text says: "Apply every matching rule and notify each exact returned recipient_address" and then "follow distinct recipients in their returned order." | Replace with the approved single-recipient paragraph. |
| 2026-09-01 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-collaboration-instruction-renderer.ts` | Trace how fixed text enters prompts. | Renderer appends `AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION` after addressing for every Team-bound member. | Preserve shared rendering. |
| 2026-09-01 | Code | `autobyteus-server-ts/src/agent-communication/services/get-handoff-rules-service.ts` and tool contract | Verify result semantics. | Service flattens caller outgoing rules into ordered `{when, recipient_address}` entries. It performs no matching. Description calls them "possible handoffs." | Prompt should preserve this distinction. |
| 2026-09-01 | Doc | `autobyteus-server-ts/docs/modules/agent_communication.md:80-99` | Confirm durable documented contract. | Docs say the tool returns only the caller's ordered outgoing compiled handoff rules. | No schema change required. |
| 2026-09-01 | Doc | `autobyteus-server-ts/docs/modules/prompt_engineering.md:160-206` | Confirm provider scope and source ownership. | The fixed collaboration section is shared across AutoByteus, Codex App Server, and Claude Agent SDK composition. | Update durable wording if approved. |
| 2026-09-01 | Test | `autobyteus-server-ts/tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts` | Identify exact prompt contract guard. | SHA-256 pins the complete collaboration prompt. Any wording change requires intentional hash update and semantic assertions. | Focused test update required. |
| 2026-09-01 | Test | `autobyteus-server-ts/tests/unit/agent-team-execution/member-collaboration-instruction-provider-parity.test.ts` | Verify common-provider behavior. | Test asserts the collaboration block appears exactly once in native/shared prompt paths and not for standalone Agents. | Preserve parity. |
| 2026-09-01 | Version history | `git blame -L 112,132 ...`; `git show 7e54677e8d^:...member-collaboration-instruction-renderer.ts` | Determine origin and prior wording. | Current wording entered in commit `7e54677e8d` on 2026-08-30. Prior text said "If a returned rule applies, notify its recipient_address" but still instructed following distinct recipients in order. | Reverting only the first sentence may not resolve multi-recipient ambiguity. |
| 2026-09-01 | User | Initial request | Establish problem evidence. | User reports the every-matching-owner interpretation is causing problems. | Clarify intended routing semantics. |
| 2026-09-02 | User | Clarification and approval messages | Resolve DEC-001 and approve intended behavior. | A handoff is for one recipient; select the single rule whose `when` condition most specifically applies, notify only its recipient, do not notify additional recipients, and finish normally when none applies. The user approved the final sentence and requested work to start. | Complete requirements and route to direct implementation. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Team-bound Agent completes owned work or is blocked. | Fixed prompt tells Agent to call `get_handoff_rules`, apply every matching rule, notify each returned destination, combine same-recipient reasons, and follow distinct recipients in order. | The instruction explicitly supports multi-recipient fan-out, contrary to the approved one-recipient-per-outcome policy. | Shared prompt constant and renderer. | High; desired behavior approved on 2026-09-02. |
| BEH-002 | Contract | Team-bound Agent calls the read-only tool. | Service returns every configured outgoing rule for the caller, flattened and ordered. The LLM evaluates natural-language `when` text. | Result is possible rules, not server-evaluated matches. Empty list succeeds. | Service, docs, unit tests. | High. |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question Deferred Downstream |
| --- | --- | --- | --- |
| `.../agent-team-collaboration-llm-contract.ts` | Owns fixed collaboration prompt and collaboration tool descriptions. | Primary content surface. | None currently. |
| `.../member-collaboration-instruction-renderer.ts` | Combines member address block with shared collaboration instruction. | Shared across Team-bound runtime prompts; do not fork provider wording. | None currently. |
| `.../get-handoff-rules-service.ts` | Returns ordered possible outgoing rules. | Prompt must not claim the tool has pre-matched recipients. | None; tool behavior should remain unchanged. |
| `.../agent-team-collaboration-llm-contract.test.ts` | Hash-pins exact approved text. | Intentional test update required. | None. |
| `.../member-collaboration-instruction-provider-parity.test.ts` | Guards shared/native prompt parity and standalone exclusion. | Preserve and extend semantic assertions. | None. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: Fixed prompt string; prompt hash expectation; prompt-engineering documentation.
- Existing readers, writers, or contracts that consume them: Member collaboration renderer and provider prompt composers.
- Evidence paths: Source/test/doc paths in Source Log.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: Shared prompt composition only; no evidence of required API, persistence, security, concurrency, deployment, migration, or ownership-boundary change.
- Existing structural surfaces that can support the approved behavior: Existing shared constant and renderer.
- Evidence paths: Renderer and provider parity test.

### Potential Architecture-Design Triggers

- API or external-contract change: Absent if tool/result shapes remain unchanged.
- Persistence schema or invariant change: Absent.
- Security or privacy boundary change: Absent.
- Concurrency or lifecycle change: Absent.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: Absent based on current scope.
- Confirmed absent, present, or unknown: Confirmed absent for the current bounded content/test/doc change; routing assessment awaits approval.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Targeted `rg`, `sed`, service trace, and git history inspection | Locate fixed disputed text and construction path. | One authoritative current fixed string contains the exact every-matching semantics; renderer shares it across Team runtimes. | The approved single-recipient paragraph can replace the current content through existing shared surfaces. | Source Log paths. |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | Stop the confusing instruction that implies every matching owner must be notified. | Direct product-owner report and explicit approval. | Select the single rule whose condition most specifically applies and notify only its recipient. | None. |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Internal provider-shared prompt contract | Current repository revision | One collaboration instruction is shared across three Team-member runtime paths. | Prompt engineering docs and parity tests. | LLM behavior remains probabilistic; wording must be direct and tested at contract level. |

## Persisted Data And State Facts

- Affected stored or external subject: None.
- Location and representative shape: N/A.
- Approximate volume: N/A.
- Current readers and writers: N/A.
- Current unknown/extra-field behavior: N/A.
- Required semantics or data that must be preserved: Existing Team definitions and histories.
- Acceptable loss, reset, rebuild, or regeneration: None required.
- Privacy, retention, compliance, downtime, or operational constraints: None identified.
- Remaining evidence gap: None for data.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: N/A — not applicable
- Requirement / behavior IDs involved: N/A
- Product decision, uncertainty, or experience to understand or evolve: N/A
- Critical journey and states: N/A
- Known constraints and non-goals: N/A
- Relevant existing-product or frontend context supplied or established: N/A
- Product Design request artifact / message reference: N/A
- Established separate prototype repository/root and ticket reference, when applicable: N/A

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/handoff-rule-prompt-clarity/tickets/in-progress/handoff-rule-prompt-clarity/requirements-revision-record.md` | Requirements Engineer | Requirements-round history. | Entire package. | All | Current | Part of approval basis. |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Assumption | Desired overlap policy for two distinct possibly applicable recipients. | Determines the authoritative routing instruction. | Resolved by user: choose the single most specifically applicable rule and only its recipient. | Resolved 2026-09-02 |
| RSK-001 | Risk | Reverting only the first sentence would leave "follow distinct recipients" and preserve the same fan-out interpretation. | A partial edit would not meet the approved behavior. | Replace the complete rule-based handoff paragraph and assert absence of both fan-out instructions. | Mitigated in approved requirements |

## Requirement Implications

The reported text is not team-authored content. It is an authoritative shared backend prompt constant. The tool returns possible outgoing conditions without evaluating them, while the prompt explicitly tells the LLM to apply every matching condition and notify all distinct recipients. The user approved replacing the complete paragraph with a one-recipient policy based on the single rule whose condition most specifically applies, without turning returned order into a new priority contract. The safe implementation boundary is a prompt/test/doc change that preserves tool and delivery contracts.

## Notes For Downstream Architecture Design Or Direct Implementation

Implementation should update the one shared collaboration instruction with the exact REQ-003 paragraph, its exact prompt hash/semantic assertions, provider parity assertions as appropriate, and directly affected durable prompt documentation. Preserve the `get_handoff_rules` result schema, compilation, canonical addressing, messaging, task delegation, and standalone prompt behavior. Validate SCN-001, including at-most-one-recipient behavior and absence of the old fan-out wording.
