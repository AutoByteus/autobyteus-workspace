# Investigation Notes — autobyteus-646 Runtime fallback on a usage limit

- Ticket: autobyteus-646 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager`
- Worktree: `autobyteus-worktrees/usage-limit-fallback-646`, branch `codex/usage-limit-fallback-646`, base `origin/personal` `bc4351cad7`
  - The first worktree creation was cut off by the application restart (2026-11-25 06:54 UTC), which left a directory without git metadata. It was removed and the worktree created again; nothing was lost.
- Date: 2026-11-25. Owner: Solution Designer. Code facts read at this branch's HEAD.

## 1. The incident

| Fact | Evidence |
| --- | --- |
| The failed run is `computer_use_operator_b75dfef4…` on this Mac, delegated by the Project Task Manager, started 2026-11-25 06:42:29Z on `codex_app_server` / `gpt-6.1-terra` | `~/.autobyteus/server-data/memory/agents/computer_use_operator_b75dfef46cc34a278f1ea168db8ee4a8/run_metadata.json` |
| Its stored traces hold only the instructions and the task; no turn output, and no error text is stored or logged | `raw_traces_active.jsonl`; `logs/server.log` (15 lines for the run: websocket attach and missing-manifest notices only) |
| Codex was at its usage limit (weekly window, until 2026-11-27) | autobyteus-638 delivery report: "the host's Codex account has hit its usage limit until 2026-11-27" |
| Model Routing has never been on on this Mac: there is no `<appData>/model-routing/` folder (no router run, no decision record) | `ls ~/.autobyteus/server-data/model-routing` → absent |

**Why the delegation picked an exhausted runtime.** The launch check "can run now" already knows "out of limits" (U4) and "model blocked" (U4b), but it applies them **only while Model Routing is on** (`docs/modules/model_routing.md` "Which launch an agent of a copy gets"). With routing off, the agent's default (Codex) was used, and the first turn failed.

## 2. What already exists

| Capability | Where | What it gives |
| --- | --- | --- |
| Live usage limits per runtime, 0 tokens | `AgentRuntimeStrategy.readUsageLimits`, `usage-limits/` parsers; `AvailableAgentRuntimesService` (`docs/modules/agent_runtimes.md` "Limits") | Codex (`account/rateLimits/read`), Claude (`get_usage`), Antigravity (`/usage`), Grok (billing). Each model gets `blocked: {until, by}`. Read caps: install 4 s → sign-in 6 s → models ‖ limits 8 s each, at most 18 s |
| Launch usability (installed, signed in, model exists, not out of limits, not blocked) | `launch-preferences/launch-usability-check.ts` | Used by the delegation layer order; the blocked and signed-out checks apply only with routing on |
| Model Router | `src/model-routing/`; `docs/modules/model_routing.md` | Off by default. When on, an LLM agent chooses a delegated copy's launch when no default can run (40 s budget). It records decisions and statistics |
| Runtime switch of a stopped run, with hand-over | `run_history.md` (pending switch; `StandaloneAgentRunLifecycleService.activateSwitched`; `RuntimeSwitchMemory` begin/record/discard), members via `ConfiguredAgentSwitchAttempt` (autobyteus-316) | The next message makes the switch real. The previous runtime's records are archived as a `runtime_switch` segment, and a hand-over notice (`system.runtime_handover`) starts the new file; the new runtime continues from the work journal |
| Session renewal (autobyteus-599) | runtime-switch.ts | A lost session continues from the work journal |

**Not existing:**

- No runtime's turn error is classified as a usage limit: no handling of usage-limit or quota errors in `agent-execution/backends`.
- Nothing switches a runtime automatically.
- No stored "exhausted until" fact exists.

## 3. How each runtime signals the limit

| Runtime | Signal at the failing turn | Reset time |
| --- | --- | --- |
| Codex | structured: `ErrorNotification.error.codexErrorInfo = "usageLimitExceeded"`; also `rateLimitExceeded`, `apiKeySpendLimitExceeded`, … (schema generated from codex-cli 0.172.0, `codex app-server generate-json-schema`, scratch removed) | not in the error; from `account/rateLimits/read` (existing parser) |
| Claude, Antigravity, Grok | no structured code is handled today; the error text differs per runtime | from each runtime's limits read (existing parsers) |

A runtime-independent rule is possible: after a turn ends in a terminal error, read that runtime's limits (0 tokens). If the run's model is now blocked, the error was the usage limit, and `blocked.until` is the reset time. Codex's structured code can decide it at once.

## 4. History per agent (measured, this Mac, read-only)

Runs by runtime, from `memory/agents/*/run_metadata.json` (top-level and delegated Agent runs; team members not counted):

| Agent definition | Runs by runtime |
| --- | --- |
| computer-use-operator | Codex 10, Claude 2 |
| project-task-manager | Claude 7, Codex 4, Antigravity 2 |
| deep-researcher | Codex 3 |

Each run file names its runtime and model, so "the runtimes this agent used most" can be counted from data the node already has. The ranking differs per node: the founder sees Antigravity as #2 for the computer-use operator, presumably on another node.

## 5. Options

| # | Option | Verdict |
| --- | --- | --- |
| A | **Usage-limit fallback:** classify the failure; remember the exhausted runtime/model until its reset; pick the fallback from the agent's own history among usable runtimes; switch with the existing hand-over; post a notice; continue. The delegation launch check also skips a remembered-exhausted default | **Recommended** |
| B | Turn Model Routing on by default and let the Model Router agent choose every fallback | Rejected as the main path: a 40 s LLM call with tokens for a choice history answers at once, and it needs the router's runtime itself to have quota |
| C | Only skip exhausted defaults at delegation (no mid-run switch) | Partial: fixes the screenshot's case, but a run that hits the limit mid-work still stops in Error |

## 6. Supplement inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| investigation-notes.md, requirements-doc.md, solution-revision-record.md | This ticket | Current |
