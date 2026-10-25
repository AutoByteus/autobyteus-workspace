# Requirements Document — Agent Runtimes Tool `list_available_agent_runtimes` (autobyteus-303)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `available-agent-runtimes-tool`
- Request / ticket: Project Task **autobyteus-303**, part of **autobyteus-32** (model routing), which depends on it
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-10-25
- Approved by and reference: Solution Designer within the direction (user informed). The user set the direction in the Solution Designer conversation of 2026-10-24/25: the tool first, as its own ticket; name `list_available_agent_runtimes`; each runtime with its models and live limits, one strategy per runtime; AutoByteus providers without a key are not usable; a Model Routing page in Settings. The Task text (from handoff PRE-001) carries the rest. No decision below needs the user. Reference: the Solution Designer's conversation message of 2026-10-25 (SR-001).
- Exact approved requirements baseline: this document at SR-003 (SR-002 text aligned for ARCH-REV-002 AR-006, no change in intent; SR-001 refined: the user asked on 2026-10-25 for only useful information in the answer; architecture review ARCH-REV-001 clarifications). Approved by the Solution Designer within the direction, user informed in the conversation of 2026-10-25.
- Behavior-defining supplements: none.

## Problem And Desired Outcome

- Problem: nothing in AutoByteus tells an agent (or the user) which agent runtimes on a node can run right now, which models they offer, and how much of their usage limits is left. The Model Router (autobyteus-32) cannot choose without it; the user cannot see it either (on 2026-10-24 Codex was at 100% of its weekly limit and Antigravity's Claude/GPT models at 0%, unseen in the app).
- Desired outcome: an opt-in agent tool and a Settings page that show, for the node, every available agent runtime with its models and its live usage limits, read from the runtimes themselves.
- Observable definition of success: on the desktop's node and on a Docker node, an agent with the tool and the Model Routing page both show the same runtimes, models and limits, and they match what the runtimes themselves report.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | No tool reports runtimes, models or limits | `list_available_agent_runtimes` returns them for the agent's node | Other tools unchanged | investigation notes |
| BEH-002 | User | SCN-003 | Agent Runtimes page: installed, version, sign-in, running agents, update; no models or limits | New Settings → Model Routing page, section "Agent runtimes now", same data as the tool | Agent Runtimes page unchanged | `AgentRuntimesManager.vue` |
| BEH-003 | System | SCN-001 | Limits are not read anywhere | Read live per runtime, 0 tokens: Codex, Claude, Antigravity, Grok; AutoByteus per provider where readable | — | A-15…A-19 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| An agent given the tool (later the Model Router) | Know what can run now and how much is left | One call, structured, true facts | No credentials or account identities in the answer |
| User | See and check runtime limits | Page with the same data | Read on open and on "Check again" only |
| Node | Answer for itself | Runs on every node (desktop, Docker) | Reads only; spends no tokens |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent whose definition lists the tool calls `list_available_agent_runtimes` | SCN-001, SCN-002 |
| UC-002 | The user opens Settings → Model Routing and reads "Agent runtimes now", and presses "Check again" | SCN-003 |

### Out Of Scope

- The Model Router, routing during delegation, its knowledge note, decision statistics, the internal-agent attribute, the feature switch, the other page sections (all autobyteus-32).
- Reading another node's runtimes (each node answers for itself; an agent on a peer node calls its own node's tool).
- Changing the Agent Runtimes page; signing runtimes in; the GLM endpoint question (FU-003 of autobyteus-32).
- Any limit reading that spends tokens or sends a model request.

### Non-Goals

- Caching or background polling of limits (read live when asked).
- Readers for providers with no readable limit data (OpenAI, Gemini, Mistral, Qwen, MiniMax, GLM, custom providers): they say "limits not reported".

### Preserved Behavior Boundary

- Agent Runtimes page, sign-in reading, model catalogs, agent runs: unchanged.
- No tool is added to any agent automatically.

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | An agent tool `list_available_agent_runtimes` (no parameters) returns the agent runtimes available on the node the calling agent runs on. It works the same on every runtime an agent runs on and is opt-in: an agent has it only when its definition lists it. | BEH-001 | Must | User direction; Task | DEC-001 |
| REQ-002 | **Available** means: the runtime is installed on the node and not known to be signed out (signed in, sign-in not required, or sign-in could not be checked, which the answer says). For AutoByteus, per provider: its API key is configured, or it is a local provider (Ollama, LM Studio) with models found. Not installed or signed-out runtimes and providers without a key are left out. | BEH-001 | Must | User: "provider doesn't have API key … obviously not usable" | DEC-002 |
| REQ-003 | Each listed runtime (and each AutoByteus provider) carries its offered models (identifier, name, context size where known). | BEH-001 | Must | User direction | — |
| REQ-004 | **(SR-002)** The answer carries only what is useful for choosing. Per runtime: its limits, each with a name (what it covers and its window, e.g. "Weekly", "Claude and GPT models · weekly"), remaining percent and reset time. Per model: id, name, context size where known, and `blocked: {until, by}` only when the model cannot run now (`until` = the reset time, or null when unknown; `by` = the limit's name, or the provider's reason). An AutoByteus provider's money balance is shown, since it is that provider's limit. Runtime plans, tiers, credit details, billing-period data, account data and vendor texts are not included; such facts are used only to decide whether a model is blocked. **(SR-004)** A runtime may add one short `limitsNote` next to its limits when a runtime-specific fact changes how to read its limits (e.g. "Weekly limit used up; running on paid credits."). | BEH-001, BEH-003 | Must | User 2026-10-25: "we only care about useful information" | DEC-003, DEC-007 |
| REQ-005 | Limits are read per runtime by its own reader: Codex `account/rateLimits/read`; Claude the Agent SDK `get_usage` request; Antigravity `agy -p "/usage" --output-format json`; Grok ACP `_x.ai/billing`. AutoByteus per provider: DeepSeek balance, Kimi balance, Anthropic API credit check, xAI key status. Every other provider: "limits not reported". | BEH-003 | Must | Probes A-15…A-19 | DEC-004 |
| REQ-006 | **Removed (SR-002).** No runtime-specific details part; the user asked for only useful information. | — | — | — | SR-002 |
| REQ-007 | When a step for a runtime fails or times out, nothing is guessed and the rest of the answer still arrives: limits → `"unknown: <reason>"`; models → `"unknown: <reason>"` (an empty model list is never shown as "no models"); sign-in → the runtime is listed with `signIn: "not checked"` (shown as "sign-in could not be checked"); install check → the runtime is treated as not installed (the Agent Runtimes page's rule). A provider whose limits are not readable says `"not reported"`. | BEH-001 | Must | Task; ARCH-REV-001 AR-002 | DEC-002 |
| REQ-008 | Reading never sends a model request or spends tokens, never returns, logs or stores credentials, and never returns account identities (email, account, user or team IDs). | BEH-003 | Must | Task constraints | — |
| REQ-009 | Settings gets a **Model Routing** page whose first section, **Agent runtimes now**, shows the same data as the tool for the node the window is bound to, read when the page opens and when the user presses "Check again". | BEH-002 | Must | User direction; Task | DEC-005 |
| REQ-010 | The whole answer arrives within 20 seconds; runtimes are read in parallel, each reader bounded by its own time-out. | BEH-001 | Must | Usable by an agent mid-task | QR-001 |

## Acceptance Criteria

| AC ID | Related REQ | BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | SCN-001 | Agent on AutoByteus runtime lists the tool; node has Codex, Claude, Antigravity, Grok installed and signed in | Answer lists the four runtimes plus AutoByteus with its keyed providers, each with models | A runtime signed out or not installed is absent | Server test with fake readers; user verification |
| AC-002 | REQ-001 | SCN-002 | Same agent definition run on Claude or Codex runtime | Same tool, same answer shape (through Agent Tools MCP) | — | Server MCP adapter test |
| AC-003 | REQ-004, REQ-005 | SCN-001 | Codex answers `usedPercent` 100 with a reset time and no credits (recorded fixture) | Codex listed; limit "Weekly" remaining 0% with reset time; every Codex model has `blocked: {until: <that reset time>, by: "Weekly"}` | With credits available, models are not blocked and `limitsNote` says "running on paid credits" (DEC-007) | Unit test from fixture |
| AC-004 | REQ-004, REQ-005 | SCN-001 | Antigravity `/usage` fixture: Claude and GPT group 0% left, Gemini 99% | Claude/GPT models have `blocked: {until: <reset>, by: "Claude and GPT models · weekly"}`; Gemini models have no `blocked`; limits named by group and window | A group that maps to no model applies to every model of the runtime | Unit test from fixture |
| AC-005 | REQ-004, REQ-005, REQ-008 | SCN-001 | Claude `get_usage` fixture (session 87%, weekly 22%) | Limits "5-hour" 13% and "Weekly" 78% with reset times; no model blocked; the Claude CLI was opened with an input that never yields a message | API-key auth (no plan limits) → `"not reported"` | Unit test from fixture + test that no prompt is written |
| AC-006 | REQ-005 | SCN-001 | Grok `_x.ai/billing` fixture | One limit "Billing period" with reset time = period end; remaining percent when `creditUsagePercent` is present, else null and `limitsNote` says Grok does not report how much is used | — | Unit test; user verification of the used-% field |
| AC-007 | REQ-002, REQ-005 | SCN-001 | AutoByteus: DeepSeek balance 0.14 USD; Kimi 0 available; Anthropic "credit balance too low"; OpenAI key set | DeepSeek listed with balance "0.14 USD"; Kimi and Anthropic listed with `blocked` and the reason, their models blocked; OpenAI listed "not reported"; providers without keys absent | — | Unit tests from fixtures |
| AC-008 | REQ-007 | SCN-001 | A step (install, sign-in, models, limits, provider) throws or times out | The entry follows REQ-007 for that step; others complete | — | Unit tests with failing/slow fakes per step |
| AC-009 | REQ-008 | SCN-001 | Any answer | Contains no key, token, email, account/user/team ID; no completion request was sent | — | Unit test on output; reader tests assert endpoints called |
| AC-010 | REQ-009 | SCN-003 | User opens Settings → Model Routing | "Agent runtimes now" shows the same runtimes, models, limits and reset times as the tool; "Check again" re-reads | Remote-node window shows that node's data | Web component test; user verification on desktop and Docker node |
| AC-011 | REQ-010 | SCN-001 | Slow fakes on every step of one runtime | Answer within 20 s; the slow steps end at their own time-out and their child processes are stopped | — | Unit test with slow fakes; live check |
| AC-012 | REQ-001 | — | An agent definition without the tool | The agent does not have the tool | — | Existing exposure tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Agent (AutoByteus runtime) | Know what can run now | Tool call | Definition lists the tool | Call → node reads runtimes in parallel → answer | Runtimes, models, limits | Reader failure → limits unknown | Supported Normal Scenario | Task | REQ-001..008, 010; AC-001, 003..009, 011 |
| SCN-002 | System | Agent on Claude/Codex/Antigravity/Grok runtime | Same | Tool call via Agent Tools MCP | Same | Same | Same | — | Supported Normal Scenario | Task "works on every runtime" | REQ-001; AC-002 |
| SCN-003 | User | User | See the node's runtimes and limits | Settings → Model Routing | Window bound to a node | Open page / Check again | Same data as the tool | Remote-node window: that node | Supported Normal Scenario | Task | REQ-009; AC-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (one new page section within existing Settings patterns).
- Product Design fields: N/A — not applicable (no Product Design requested).
- Required states: loading; per runtime row: name, the note "sign-in could not be checked" when it applies, limits (name, remaining %, reset time in local time) with the runtime's limits note under them when present, models (collapsed list; a blocked model shows "blocked until <time> (<limit or reason>)"); "limits not reported" and "limits unknown: reason" texts; models "unknown: reason"; AutoByteus with provider sub-rows (balance, or the blocked reason); empty state when no runtime is available; "Check again" with last-checked time. No plan, tier or credit details; no blocked badge on a limit (a used-up limit does not always block, e.g. Codex with credits).
- Illustrative / permitted variation: layout follows the Agent Runtimes page's row style; wording follows existing i18n patterns (en and zh-CN).
- Product decisions that need the user: none.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-010, AC-011 | Performance | Whole answer ≤ 20 s; readers parallel; per-reader time-out ≤ 15 s | Unit test with slow fake; live check |
| QR-002 | REQ-008, AC-009 | Security/Privacy | No credentials or account identities in answers, logs or storage | Output tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (live reads only).

## External Contracts And Dependencies

| Contract | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Codex app-server `account/rateLimits/read` | Windows with used %, reset, `rateLimitReachedType` | A-15, schema of codex-cli 0.164.0 | Field changes with Codex releases → limits unknown |
| Claude Agent SDK `get_usage` (`usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET`) | `limits[]`, `rate_limits` | A-16, SDK 0.3.280 | Marked experimental by Anthropic → limits unknown on change |
| `agy -p "/usage" --output-format json` | `command.data.groups[].buckets[]` | A-17 | CLI output may change |
| Grok ACP `_x.ai/billing` | `config.currentPeriod`, `subscription_tier`, `creditUsagePercent` (when present) | A-18, Grok 1.0.70 | Used % unconfirmed (UNK-001) |
| DeepSeek `/user/balance`, Kimi `/v1/users/me/balance`, Anthropic `count_tokens` error, xAI `/v1/api-key` | As probed | A-19 | Provider changes |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/limit-probes/` | Probe scripts and recorded results (fixtures source) | REQ-004, REQ-005 | Current | Evidence (not behavior-defining) |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Docker node images contain the same CLIs and auth paths, so the same readers work there | Done-when includes a Docker node | User verification on Docker node | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Tool name | Vocabulary (Principle 15) | `list_available_runtimes`, `list_available_agent_runtimes` | "Runtime" alone also means the LLM runtime (`LLMRuntime`, `ModelInfo.runtime`); "agent runtime" is unambiguous and matches the Agent Runtimes page; `list_available_*` matches `list_available_agents`. **`list_available_agent_runtimes`.** | User (2026-10-25) | Decided |
| DEC-002 | Runtime whose sign-in state can't be read | Strict "available" | Leave out, or include and say so | Leaving it out would hide a working runtime when its status command hiccups; including it with "sign-in could not be checked" is truthful. **Include with the note.** | Solution Designer | Decided |
| DEC-003 | A limit that a reader cannot map to specific models | Correct blocking | Ignore it, or apply it to the whole runtime | Ignoring could present a blocked model as usable; applying it to the whole runtime is safe (may hide a usable model, never shows a blocked one as usable). **Whole runtime.** | Solution Designer (in the Task) | Decided |
| DEC-004 | Use Claude's experimental `get_usage` | Stability | Use it; or skip Claude limits | It is the only zero-token source of Claude plan limits; a change only makes Claude "limits unknown" (REQ-007). **Use it.** | User (agreed 2026-10-24/25) | Decided |
| DEC-005 | Where the page lives; when it reads | Visibility; cost | Agent Runtimes page vs a new Model Routing page; polling vs on demand | The user chose a separate Model Routing page that grows with autobyteus-32. Reading spawns CLIs (Antigravity ~2.7 s), so read on open and on "Check again", no polling. | User (page); Solution Designer (reading) | Decided |
| DEC-006 | GLM | Endpoint uncertainty | Read its Coding Plan quota, or "not reported" | The account has no Coding Plan and the endpoint question is FU-003 of autobyteus-32. **"Limits not reported"** here. | Solution Designer | Decided |
| DEC-007 | Codex used-up window when the account has credits | Truthful "blocked" | Blocked by the window, or usable through credits | Codex continues on paid credits when a window is used up (its answer: `credits.hasCredits` / `unlimited`, `ordinaryUsageAllowed`). A model is blocked only when it cannot run now: window used up and no credits. Credits themselves are not shown (REQ-004). | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-012 | SCN-001, SCN-002 |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-007 | SCN-001 |
| REQ-003 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-004 | UC-001 | BEH-001, BEH-003 | AC-003..AC-006 | SCN-001 |
| REQ-005 | UC-001 | BEH-003 | AC-003..AC-007 | SCN-001 |
| REQ-007 | UC-001 | BEH-001 | AC-008 | SCN-001 |
| REQ-008 | UC-001, UC-002 | BEH-003 | AC-009 | SCN-001 |
| REQ-009 | UC-002 | BEH-002 | AC-010 | SCN-003 |
| REQ-010 | UC-001 | BEH-001 | AC-011 | SCN-001 |

## Architecture Phase Input

- Scenarios: SCN-001..003.
- Constraints: reads only; no tokens; no credentials/identities; opt-in tool; every runtime.
- Facts to verify: Claude SDK control call through the existing client; ACP extension call through the existing connection; AutoByteus provider key status and local providers.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (within the direction, user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
