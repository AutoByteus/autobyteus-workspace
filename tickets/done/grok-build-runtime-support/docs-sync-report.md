# Docs Sync Report — `grok-build-runtime-support`

## Scope

- Ticket: `grok-build-runtime-support` (task_size `Large`, architectural_risk `High`, route: reviewed — Architecture Review → Code Review → API/E2E → test-code review)
- Trigger: `/code_reviewer` CRR-004 Pass (proportional test-code review after API-REV-002 Pass, 95%) on implementation `d7d4aa2ad`
- Bootstrap base reference: `origin/personal` @ `e06080b00`
- Integrated base reference used for docs sync: `origin/personal` @ `e06080b00` (re-fetched 2026-09-26; `git ls-remote` confirms; branch already current, 0 new base commits)
- Post-integration verification reference: delivery smoke run on the handoff working tree — 14 files / 78 tests passed (ACP/Grok unit suites + capability GraphQL e2e + Grok replay e2e); see `release-deployment-report.md`

## Why Docs Were Updated

- Summary: a new runtime (`grok_build`) and a new shared subsystem (runtime-neutral ACP layer) were added; the `autobyteus` catalog Grok row moved from `grok-4.6` to `grok-4.7`. Long-lived docs listed only four runtimes, named `grok-4.6` as the curated flagship, and had no description of the ACP layer boundary.
- Why this should live in long-lived project docs: the ACP layer's neutrality rule, the profile split, the exact-resume/replay-suppression contract, the turn-end classification (deny → completed), per-call usage semantics, and the known application-launch gap are durable operating knowledge that future ACP agents (e.g. DSH) and maintainers need beyond the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Design step 9: new runtime + ACP layer doc | Updated (new) | Canonical runtime doc |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Curated list (line 324 `grok-4.6`); external-runtime replacement rule | Updated | `grok-4.7`; Grok 4.6 retired; Grok Build in replacement rule |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Provider projection table; instruction transparency list | Updated | Grok Build row + capture point |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime list / provider pointers | Updated | Grok Build pointer paragraph |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Per-member backend list; external member runtimes | Updated | Grok Build added |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Materializer consumers | Updated | Grok HTTP `mcpServers` + readiness gate |
| `autobyteus-server-ts/docs/modules/run_history.md` | Stopped-run replacement rule lists external runtimes | Updated | Grok Build added |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | Updated | Grok Build Runtime row |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend event rendering per runtime; replacement rule | Updated | Grok Build paragraph + replacement list |
| `autobyteus-web/docs/settings.md` | Replacement eligibility list | Updated | Grok Build added |
| `autobyteus-ts/docs/provider_model_catalogs.md`, `llm_module_design*.md` | `grok-4.7` row | No change (already updated in implementation commit `2b31b046d`) | Verified |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Precedent runtime | No change | AGY behavior unchanged (REQ-014) |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Runtime/ingestion kinds | No change | Kinds are open strings; no runtime list present; Grok per-call semantics documented in the Grok doc |
| `autobyteus-web/docs/remote_access.md` | Auto-approve default policy | No change | Statement "default remains off for non-AGY runtimes" is still true for Grok |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | New module doc | Scope/ownership, source layout + dependency/neutrality rule, availability/catalog/auth, process/session/identity (create, restore, state machine), events/tool projection/approvals/turn-end classification/interrupt, per-call usage, skills, persistence, known limits, validation | Design step 9; REQ-018 knowledge |
| `llm_management.md` | Correction | Curated list `grok-4.7`; "Retired Grok 4.6 and Grok 4.5"; Grok Build in offered-catalog replacement rule | REQ-013, BEH-002 |
| `prompt_engineering.md` | Table row + list item | Grok Build `_meta.rules` projection; capture after `session/new` | REQ-006 |
| `agent_execution.md` | Pointer | Grok Build paragraph | Discoverability |
| `agent_team_execution.md` | List + pointer | Grok Build member runtime | REQ-001 |
| `agent_tools_mcp_server.md` | Consumer note | Grok HTTP MCP + readiness gate | REQ-007 |
| `run_history.md` | List | Grok Build replacement rule | BEH-002 |
| `docs/modules/README.md` | Index | New row | Discoverability |
| `autobyteus-web/docs/agent_execution_architecture.md` | Paragraph + list | Grok canonical tools, standard auto-execute default, deny rendering | BEH-003/004 |
| `autobyteus-web/docs/settings.md` | List | Grok Build replacement eligibility | BEH-002 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| ACP layer boundary | `acp/` is runtime-neutral; only profiles read `_x.ai`/`_meta`; neutrality test | design-spec (Ownership, Dependency Rules) | `grok_build_runtime.md` |
| Exact resume | `session/load` with stored `sessionId`, replay dropped, no rules re-injection, terminal mismatch | design-spec DS-006; ARC-13/23 | `grok_build_runtime.md` |
| Turn-end classification | Denial → completed; interrupt → interrupted; provider error → one turn-terminal ERROR | design-spec SR-011; AC-004 amended | `grok_build_runtime.md` |
| Per-call usage | One record per `response_completed`, `base_excludes_cache`, per-request tier pricing | design-spec AR-002 resolution | `grok_build_runtime.md` |
| Tool restriction | Env switches, `--no-leader`, user config untouched | implementation-handoff step 5 | `grok_build_runtime.md` |
| Start-time error surfacing | Provider text via `AgentCreationError`; restore keeps it as cause (AR-006) | implementation-handoff IR-002 | `grok_build_runtime.md` |
| Application launch gap | `unsupported` credential authority blocks Grok/AGY app launch; deferred (STC-002) | requirements AC-015, design BEH-013 | `grok_build_runtime.md` Known limits |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus` catalog row `grok-4.6` (no alias) | `grok-4.7` | `llm_management.md`; `autobyteus-ts/docs/provider_model_catalogs.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary + release notes, then hold for explicit user verification.
- Notes: two non-blocking test tidy-ups (replay line 162 default-effort assertion; live line 194 stale comment) are not docs items and are recorded as follow-ups in the handoff summary.
