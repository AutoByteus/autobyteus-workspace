# Handoff — Prerequisite PRE-001 of autobyteus-32: `list_available_agent_runtimes` tool

- From: Solution Designer (autobyteus-32, model routing)
- To: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Date: 2026-10-25
- Classification: `Waiting For Prerequisite` (autobyteus-32 waits for this Task)
- Decided by: the user, in the Solution Designer conversation of 2026-10-24/25: "This tool will deserve its own tickets … we work on this tool first."

## What is asked

Please create a new Project Task for the tool below, **part of autobyteus-32**, make autobyteus-32 depend on it, and give it to this Solution Designer (same copy, it holds the context). autobyteus-32 stays open and waits; it resumes with the Model Router once this Task is delivered.

## Suggested Task

**Title:** Agent runtimes tool: `list_available_agent_runtimes` (runtimes, models and live usage limits per node)

**Description (suggested text):**

An agent tool `list_available_agent_runtimes` that tells an agent, for the node it runs on, which agent runtimes can run now, which models each offers, and how much of each runtime's usage limits is left, with reset times. It is the fact source the Model Router (autobyteus-32) will use to choose runtimes and models; it is useful on its own and any agent can be given it.

- **Available** = installed and signed in on that node (AutoByteus: the provider's API key is configured). Not installed / signed out runtimes and providers without a key are left out. A runtime or model group whose quota is used up stays listed, marked `blocked`, with its reset time.
- **Per runtime, one strategy** (strategy pattern, beside the existing `AgentRuntimeStrategy` per runtime that already reads sign-in): how to read its limits.
  - Codex: app-server `account/rateLimits/read` (windows with used %, reset time, `rateLimitReachedType`).
  - Claude: Agent SDK control request `get_usage` (same data as `/usage`: 5-hour, weekly, per-model weekly; marked experimental by Anthropic).
  - Antigravity: `agy -p "/usage" --output-format json` (per model group: remaining fraction, reset time).
  - Grok: ACP extension method `_x.ai/billing` (credit period, tier; used % field to be confirmed).
  - AutoByteus (API keys): one strategy per provider where something is readable: DeepSeek `GET /user/balance`, Kimi `GET /v1/users/me/balance`, Anthropic API credit check (free `count_tokens` answers "credit balance is too low"), xAI key status (`GET /v1/api-key`). Others (OpenAI, Gemini, …): "limits not reported".
- **Models** come from the existing per-runtime model catalogs; each strategy maps its limits to the models they apply to (Antigravity groups models by family; Claude has scoped weekly limits). A limit it cannot map applies to the whole runtime.
- **Answer shape:** a common part (runtime, models, limits as window / remaining % / reset time / blocked) plus a runtime-specific part (plan, credits, groups). When a reader fails, that runtime says "limits unknown" with the reason; it never guesses.
- **Works on every runtime** an agent runs on (local tool + Agent Tools MCP adapter, like `list_peer_nodes`); opt-in on the agent definition.
- **Settings → Model Routing page**, first version with one section "Agent runtimes now" showing the same data as the tool (read on open and on "Check again"). The router sections come with autobyteus-32.
- **Tests** per strategy from the recorded probe results; the user checks in the desktop app that the page and the tool's answer match reality.

**Done when:** an agent with the tool, on the desktop's node and on a Docker node, gets the runtimes it can use there with their models and live limits; the Model Routing page shows the same; the user has verified it in the desktop app.

**Out of scope (autobyteus-32 or later):** the Model Router itself, routing during delegation, the router's knowledge note, decision statistics, the internal-agent attribute, the feature switch.

## Evidence (all measured 2026-10-24/25 on the user's Mac; 0 tokens spent)

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/evidence/limit-probes/` (README with results; scripts `codex-limits.mjs`, `claude-usage.mjs`, `grok-billing.mjs`, `api-limits.mjs`).

| Runtime / provider | Read time | Result that day |
| --- | --- | --- |
| Codex | 0.65 s | weekly 100% used, blocked until 2026-10-30 20:57 |
| Claude | 0.8 s | Max plan; 5-hour 87% used; weekly 22% |
| Antigravity | 2.7 s | Claude & GPT group 0% left until 2026-10-26; Gemini ~99–100%; Argon 40% |
| Grok | ~1 s | X Basic, weekly period 2026-10-22 → 29; used % not present in that answer |
| DeepSeek / Kimi | ~0.4 s | 0.14 USD / 0 available |
| Anthropic API | 0.24 s | "credit balance is too low" |

Investigation notes (A-04…A-19) and the related design discussion: `investigation-notes.md`, `requirements-doc.md` (§ Prerequisites, SR-006 direction) in the same ticket folder.

## Context for the Task Manager

- autobyteus-32's direction agreed with the user (to be written into its requirements when it resumes): defaults first; a built-in, internal Model Router agent per node (one long-lived conversation), off by default behind a feature switch, with the router's runtime/model chosen on the Model Routing page; a knowledge note the user teaches through the router's conversation; task kinds and decision statistics on the page; learning from outcomes as a later slice; `"internal": true` agent attribute with a "Show internal agents" server setting.
- Follow-up found (not urgent, not part of either Task): FU-003 in `follow-ups.md`: AutoByteus sends GLM requests to the GLM Coding Plan endpoint, while the user's GLM account has no Coding Plan (its quota endpoint says so); GLM models in AutoByteus may fail for this account (not verified with a real request).
