# Docs Sync Report

## Scope

- Ticket: `deepseek-dsh-runtime-investigation` (autobyteus-387), DeepSeek Harness (dsh) as an ACP runtime through the credential proxy's provider relay. `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (ARCH-REV-003, CRR-002, API-REV-002, CRR-004).
- Trigger: delivery handoff from the code reviewer after the post-API/E2E test-code review CRR-004 (Pass).
- Bootstrap base reference: `origin/personal` `3ef5e33eec`.
- Integrated base reference used for docs sync: `origin/personal` `d6bcff577b`, merged into the ticket branch as `7c1117e209` (after the delivery checkpoint `ad14d15d1f`).
- Post-integration verification reference: `evidence/delivery/DEL-00…DEL-04`. Server unit suite: one failure that comes from this ticket, not from the merge (see `release-deployment-report.md`, Escalation). Docs below describe the final behavior, which the pending fix does not change (it is a test assertion or type location; no behavior).

## Why Docs Were Updated

- Summary: implementation updated the dsh-owned docs (`deepseek_harness_runtime.md`, `credential_proxy.md`, `agent_runtimes.md`, `secret_management.md`, `grok_build_runtime.md`, the module index, `GLOSSARY.md`; `3514947952`), and API/E2E added a Fresh-start build section to `TESTING.md` (`1063e5d89d`). Delivery found two gaps in the integrated state. (1) The base added its own `## Fresh-start build` section to `TESTING.md` (autobyteus-390), so after the merge TESTING.md had two sections with the same heading. (2) Ten cross-module docs list each runtime's behavior per runtime and still stopped at Grok Build, so a reader would conclude dsh does not take part (Teams, Agent Tools MCP, prompts, usage, compaction, model replacement, Settings → Agent Runtimes).
- Why this should live in long-lived project docs: those docs are where a reader looks up "what does runtime X do for concern Y". dsh now takes part in each concern, as the evidence proves (API-05, API-12/13, API-20/22, API-30).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules vs the final change | No change | No rule changed; rule 12 (fresh-start build) was followed (API-35). |
| `TESTING.md` | Testing guideline; merge produced a duplicate section | Updated | Duplicate Fresh-start build section removed; its one extra build input kept in the base's section. |
| `RELEASE.md` (from `origin/personal` `d6bcff577b`) | Release guide | Needs follow-up | Release smoke check covers five runtimes, not dsh: FU-003 (project rule, user's decision). |
| `GLOSSARY.md` | Merged both branches' additions | No change | Run Section (base) and Provider relay / dsh terms (ticket) both present, consistent. |
| `autobyteus-server-ts/docs/modules/deepseek_harness_runtime.md` | dsh's own doc | Updated | Tests section listed only the live suite. |
| `autobyteus-server-ts/docs/modules/credential_proxy.md`, `agent_runtimes.md`, `secret_management.md`, `grok_build_runtime.md`, `README.md` | Updated by implementation | No change | Checked against the code; accurate. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Per-runtime provider paragraphs | Updated | |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Member runtime list | Updated | |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Per-runtime MCP delivery | Updated | |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Per-runtime instruction projection and transparency | Updated | |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Per-runtime usage and compaction threshold | Updated | |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Provider compaction boundaries per runtime | Updated | |
| `autobyteus-server-ts/docs/modules/run_history.md`, `llm_management.md` | Stopped-run model replacement and rotation lists | Updated | |
| `autobyteus-web/docs/settings.md` | Settings → Agent Runtimes and replacement choices | Updated | |
| `autobyteus-web/docs/agent_execution_architecture.md` | Per-runtime event conversion and replacement | Updated | |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Merge reconciliation | Kept the base's `## Fresh-start build` (the one the in-file anchors link to). Removed the ticket's second section and added its one missing build input, the contract packages `autobyteus-*-contracts/**`, to the base's "When" list. | Two sections with one heading. Everything else in the ticket's list was already covered (package files, lockfile, tsconfig, `generated/**`, Prisma, workflows, scripts, test files a type check compiles). |
| `deepseek_harness_runtime.md` | Tests | Added the collaboration, scripted-provider and standalone-host suites with their gates and prerequisites. | API/E2E added them as durable coverage. |
| `agent_execution.md` | New runtime paragraph | `deepseek_harness` on the ACP layer; relay supplies usage, compaction, liveness. | Runtime list stopped at Grok. |
| `agent_team_execution.md` | Runtime list + paragraph | dsh as a member runtime, bound to the dsh `sessionId`, restored by `session/resume`. | Proven by API-20. |
| `agent_tools_mcp_server.md` | Runtime delivery | Same HTTP `mcpServers` entry on `session/new`/`session/resume`, no readiness wait. | Checked in `acp-session-launcher.ts:143-155`. |
| `prompt_engineering.md` | Projection table row + transparency line | Shared Carpenter prompt → per-run instructions file → dsh home plugin (`interpolate: false`), written at every launch; recorded after `session/new`. | `acp-agent-run-backend-factory.ts:106-116,135-139`. |
| `token_usage.md` | New runtime section + compaction table row | One observation per relay-observed call (`deepseek_harness_call` / `deepseek_harness_compaction_call`), input excludes cache, no window/threshold. | `deepseek-harness-call-usage.ts`. |
| `agent_memory.md` | Runtime lists + boundary bullet | Relay-observed compaction: `relay_compaction_started` (non-rotating), `…_completed` (rotation-eligible), `…_failed`/`…_cancelled`/`…_abandoned` (non-rotating, `failed`). | `deepseek-harness-compaction-status-payload.ts`; `AcpCompactionPhase`. |
| `run_history.md`, `llm_management.md` | Runtime lists | dsh among the runtimes whose replacement needs fresh offered-catalog membership. | `run-model-selection-service.ts:28,63`. |
| `autobyteus-web/docs/settings.md` | Agent Runtimes + replacement list | dsh in the list; account "API key set"/"API key not set" with the API Keys pointer (remote: "… of that node"), no Sign in; Update runs `npm install -g @deepseek-ai/dsh@latest`. | `AgentRuntimeRow.vue`, `agentRuntimesSettings.ts`; API-30 screenshots. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Runtime paragraph + replacement list | dsh through the same ACP conversion; approvals only for sandbox escalation. | `deepseek_harness_runtime.md` Sessions; API-05 approve/reject turns. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Relay-sourced usage and compaction | dsh reports neither over ACP; the provider relay's call observations are the source | `design-spec.md`, IMP/API evidence API-12/13 | `token_usage.md`, `agent_memory.md` |
| Instructions delivery | dsh keeps no instructions with a session; they are re-supplied at every launch through the home plugin, literally | `design-spec.md`, AC-006 evidence | `prompt_engineering.md` |
| dsh test layers | Which dsh suites exist, their gates, which need a key | `api-e2e-execution-coverage-report.md` | `deepseek_harness_runtime.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Duplicate `TESTING.md` Fresh-start build section (`1063e5d89d`) | The base's section (autobyteus-390) with the contract-package input added | `TESTING.md` |
| Supervisor input type inside `general-process-run-supervisor.ts` | `general-process-run-supervisor-input.ts` (CR-001, `cb132711f6`) | Code; the architecture test still reads the old location (blocker, see report) |

## Delivery Continuation

- Result: `Blocked` (not by docs: docs sync is complete for the integrated state).
- Next delivery action: after the implementation Local Fix, rerun the failed architecture test and the server unit suite and the remaining planned checks, then verify, finalize.
- Notes: docs edits are committed on the ticket branch with the delivery checkpoint so the fix starts from a clean tree.
