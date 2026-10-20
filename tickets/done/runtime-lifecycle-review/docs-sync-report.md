# Docs Sync Report — runtime-lifecycle-review

## Scope

- Ticket: `runtime-lifecycle-review` (Settings → Agent Runtimes). `task_size=Large`, `architectural_risk=High`; reviewed route (architecture review, code review CRR-002, API/E2E API-REV-001, test-code review CRR-003).
- Trigger: code reviewer handoff after CRR-003 Pass (2026-10-20).
- Bootstrap base reference: `origin/personal` `aac5da3112`.
- Integrated base reference used for docs sync: `origin/personal` `5de6a698b9`, merged into the ticket branch as `1da2cc3c22`. Checkpoint commit `62aad6624d`.
- Post-integration verification reference: DEL-01…DEL-05 in `evidence/delivery/` (all Pass on `62aad6624d`).

## Why Docs Were Updated

- Summary: the ticket adds a new Settings section and a new server capability (`runtime-management/agent-runtimes/`, GraphQL `agentRuntimes` + four mutations). It also changes who reads Codex/Claude sign-in for Application launch readiness. Two module docs said AutoByteus has no Codex login/status API and no Grok login UI. Both are now wrong.
- Why this should live in long-lived project docs: future work on runtimes, readiness or Settings needs the ownership (status service, sign-in reader, strategies), the per-runtime rules, the running-agent rule and the privacy boundary. Today these exist only in the ticket's design spec.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Home of the Settings sections (API Keys, Server Settings, Embedding, Agent Packages) | Updated | New "Settings: Agent Runtimes" section |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | Updated | Index row for the new module doc |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | New capability had no doc | Updated (new) | Server module doc |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Said AutoByteus adds no Codex "login/status API" | Updated | Now names the Agent Runtimes sign-in surface and its boundary |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Said AutoByteus adds no Grok "login UI" | Updated | Now names the page's sign-in state and `grok login --oauth` |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` "Known limits" | Grok Application readiness stays `unsupported` | No change | Still true; the adapter change covers Codex/Claude only |
| `autobyteus-server-ts/docs/modules/secret_management.md` | "AutoByteus adds no Claude login UI" | No change | Still true: Claude has a command-line hint only |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | `AGY_SIGN_IN_REQUIRED` classification | No change | Reused unchanged by the Antigravity strategy |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude authentication failure markers during runs | No change | Execution unchanged |
| `autobyteus-server-ts/docs/modules/application_orchestration.md`, `applications.md` | Launch readiness | No change | Neither describes the adapter's commands; the new module doc records the reader delegation and the one changed time-out text |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | New section | Rows and states, finding runtimes (unchanged lookup, restart hint), independent checks, Update and its agents-running rule, Sign in (Codex/Grok) vs command-line hint (Claude/Antigravity), remote status-only, list-width layout rule (~58 rem, windows below ~1250 px stacked), polling 2 s/10 s, privacy, browser probe | New user-visible feature |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | New module doc | Source owners, per-runtime strategy table, GraphQL API and refusal codes, running-agent rule (process + Application agents), readiness adapter delegation, tests and how to run them | New server capability |
| `autobyteus-server-ts/docs/modules/README.md` | Index | Row for Agent Runtimes | Discoverability |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Correction | "login/status API" exclusion replaced by the Agent Runtimes surface (account read + `codex login`; credential never seen) | Was made untrue by this change |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Correction | "no login UI" replaced by the page's sign-in state and `grok login --oauth` | Was made untrue by this change |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Ownership | `AgentRuntimeStatusService` is the page's only boundary. `AgentRuntimeSignInReader` is the only sign-in owner, shared with the readiness adapter. Strategies hold no state. | `design-spec.md` Ownership Map | `agent_runtimes.md` |
| Per-runtime rules | Sign-in reads (incl. Claude JSON whatever the exit code), version sources, update and login commands | `design-spec.md` Final File Responsibility Mapping, SR-012 | `agent_runtimes.md` |
| Update result rule | exit 0 + same version is a failure (Homebrew "up to date") | `design-spec.md` Concrete Examples | `agent_runtimes.md` |
| Running-agent count | Process runs + Application agents through `hostManagement.activeAgentRuns` | `design-spec.md` SR-011 | `agent_runtimes.md`, `settings.md` |
| Layout rule | Switch follows the list width (container query), not the window | `requirements-doc.md` UI note (3) | `settings.md` |
| Privacy boundary | No URL, code, account detail or `detail` text leaves the server | `requirements-doc.md` REQ-008 | both |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Readiness adapter's own `runCommand`, `readCodexReadiness`, `readClaudeReadiness`, `commandRunner` option | `AgentRuntimeSignInReader` | `agent_runtimes.md` "Application Launch Readiness" |
| "No Codex login/status API", "no Grok login UI" statements | Settings → Agent Runtimes sign-in surface | `codex_integration.md`, `grok_build_runtime.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: not applicable (docs updated).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification (the user's check of the user-only parts), then finalization and the release the user decides.
- Notes: no follow-up was needed from docs sync.
