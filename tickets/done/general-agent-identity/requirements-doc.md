# General Agent identity — approved requirements

## Status and approval
- Package: `general-agent-identity`; approved requirements baseline: `SR-002`; owner: Solution Designer.
- Status: **Approved**; date: 2026-10-03.
- Explicit user approval reference: latest user message, **“coool. lets go approved”**, following the saved complete prompt link. This approves the exact prompt v1 and proceeding with the original internal-agent change.
- Approved supplement: `general-agent-prompt.md` v1, SHA-256 `d410e6f60d923ff66849961fd8b15c461fc6c08d254ef66a7d4a92a8299cbe1a`. Its contents remain unchanged.
- Approval scope: internal platform-owned default Chat agent in this software workspace; rename its displayed identity and apply the approved prompt, with existing specialist discovery made available. The public agents repository supplied role context, not an instruction for cross-repository synchronization.
- Historical SR-001 authoring-only hold is superseded by this explicit go-ahead; historical records preserved in solution-revision-record.md and result.md.

## Problem and desired outcome
Daily Assistant is general-purpose but its name does not clearly distinguish it from specialists. The internal default agent should identify itself as **General Agent**, use the exact approved prompt, discover available specialists when useful, and use its available skills or direct reasoning/tools for its own work.

## Relevant current, desired and preserved behavior
| Behavior | Current evidence | Approved behavior | Preserved boundary | Scenario |
| --- | --- | --- | --- | --- |
| BEH-001 | Built-in name/self-introduction are Daily Assistant; role General Agent. | Current built-in definition and newly launched Chat identity say General Agent, using the complete approved supplement. | It remains the same default general-purpose agent; existing runs and references are not migrated or reset. | SCN-001 |
| BEH-002 | list_available_agents is implemented but not selected by this built-in definition. | Enable existing discovery for supported runs; approved prompt describes accessible agents/teams and appropriate collaboration. | Existing eligibility, contracts, communication tools and approval boundaries stay authoritative; no automatic discovery for every simple question. | SCN-002 |
| BEH-003 | Broad tools and ALL_INSTALLED skill scope support practical work. | Use relevant available skill for direct work; without one, use reasoning/tools; handle missing discovery/capabilities honestly. | ALL_INSTALLED scope and existing tools/default launch behavior retained. | SCN-003 |

## Actors and scope guardrail
- User: obtains a clearly identified general-purpose default Chat agent.
- General Agent: handles simple/direct work and uses suitable specialist collaboration when appropriate.
- Implementation Engineer: applies exact approved wording, not an independently rewritten prompt.
- UC-001: Current internal default-agent identity and prompt in new Chat (SCN-001).
- UC-002: Existing specialist discovery and collaboration awareness (SCN-002).
- UC-003: Available-skill and direct-work fallback (SCN-003).
- In scope: internal definition name/description/prompt, enabling existing opt-in discovery, aligned focused tests and current docs/comments for affected behavior.
- Out of scope: public `autobyteus-agents` repository edits; data migrations, history rewriting/resets, changing collaborator eligibility, routing algorithms, permission/security policy, runtime/API refactors, or release/deployment without later applicable authorization.
- Non-goal: forced specialist-first or skill-first routing; judgment follows the exact prompt.
- Preserve BEH-001–003 and existing collaboration/run/skill behavior. No loss or reset of existing user data.
- Review authority: blocking findings must trace to approved REQ/AC/BEH IDs; scope-changing proposals require renewed approval.

## Requirements and acceptance criteria
| REQ | Requirement | AC | Observable acceptance | Behavior/scenario |
| --- | --- | --- | --- | --- |
| REQ-001 | Internal built-in displayed identity is General Agent. | AC-001 | Freshly resolved built-in definition, registry display name and newly launched default Chat use General Agent; default selection still selects the same definition. | BEH-001 / SCN-001 |
| REQ-002 | Explain specialist discovery/collaboration exactly as approved. | AC-002 | Installed template matches the approved file byte-for-byte; prompt distinguishes agents from skills and does not hard-code installed specialists. | BEH-002 / SCN-002 |
| REQ-003 | Use skills or direct work according to exact approved fallback policy. | AC-003 | Prompt contains “use a relevant skill available to you,” no-skill, no-specialist/discovery and capability-limit guidance. Existing ALL_INSTALLED and tools are retained. | BEH-003 / SCN-003 |
| REQ-004 | Preserve the exact complete wording as implementation authority. | AC-004 | Supplement v1/hash unchanged; shipped template and app-data copy after normal bootstrap match it. | BEH-001–003 / SCN-001–003 |
| REQ-005 | Make existing specialist discovery available to the internal agent. | AC-005 | Definition selects list_available_agents; with eligible collaboration context runtime exposure includes it and its result contains the existing names/kinds/addresses/descriptions contract. No suitable collaborator is not an error requiring invented agents. | BEH-002 / SCN-002 |
| REQ-006 | Preserve data and default-agent continuity without migration. | AC-006 | Same default identity selection remains usable; ordinary startup updates the built-in definition through its existing lifecycle. No historical data rewrite, migration, reset or duplicate default definition is introduced. | BEH-001–003 / SCN-001–003 |

## Supported scenarios and journeys
| ID | Actor / trigger / starting condition | Product-level sequence | Expected and alternate outcomes | Validity / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User opens New Chat after normal server startup, fresh or existing app-data root. | Startup refreshes platform-owned built-in; default Chat resolves it; new conversation uses General Agent name/prompt. | Same default selection and existing history retained. Historical stored display labels may remain as originally captured; no history migration promised. | Supported Normal Scenario; original internal rename request, approval and built-in/default Chat contracts. |
| SCN-002 | User asks General Agent for work benefiting from specialist expertise. | General Agent can inspect accessible agents/teams with existing discovery and collaborate when appropriate. | Discovery enabled where collaboration context exists; empty list or unavailable discovery falls back as stated in approved prompt. Simple requests do not require discovery. | Supported Normal Scenario; approved supplement and discovery/standalone collaboration contracts. |
| SCN-003 | General Agent performs work directly. | Use relevant available skill; otherwise reason/use available tools. | Keep ALL_INSTALLED scope. Missing capabilities/information require honest explanation or clarification. | Supported Normal Scenario; approved supplement and current skill scope. |

## Experience, quality, data and external contracts
- UI/UX: name/content changes in existing Chat surfaces only; no layout/interaction change. Product prototype and visual supplements N/A — not requested.
- QR-001: exact content fidelity (REQ-002/004, AC-002/004).
- QR-002: default/data continuity (REQ-006, AC-006).
- Production app-data built-in definition updates through existing refresh; historical runs and saved references preserved. User explicitly says no migration is needed; no reset/loss acceptable.
- Discovery contract is existing opt-in tool returning accessible shared agents AND teams, not skill contents. Existing collaboration tooling handles messaging/delegation; no new routing/eligibility policy.

## Supplements, decisions and traceability
- `general-agent-prompt.md` v1/hash above: authoritative exact identity/prompt, explicitly approved by latest user message.
- DEC-001: exact full prompt approved, closed.
- DEC-002: current scope is original internal default agent in this repository. No public repository synchronization authorized. Discovery selection realizes the approved behavior through the existing capability.
- Every REQ/AC maps to BEH/SCN in the table; UC-001→SCN-001, UC-002→SCN-002, UC-003→SCN-003.
- Material unresolved intended-behavior decisions: None for this bounded scope.

## Architecture input and readiness
Map SCN-001–003 through the current built-in template/bootstrap and runtime discovery owners. Preserve default/data continuity, exact supplement, existing tools/skill scope and no-migration constraint. Verify tool selection/context behavior and reader/writer lifecycle before design.

Readiness: evidence-backed current behavior Yes; desired/preserved boundaries Yes; testable traceability Yes; scenarios Yes; supplement integration and explicit approval Yes; Product N/A; open material decisions None. Approved requirements basis ready for design: Yes.
