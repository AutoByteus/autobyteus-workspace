# Requirements Document — Diagnostic Scope

## Document Status
- Package: `codex-disable-multi-agent-20261006`; revision: `SR-003`.
- Status: Draft diagnostic scope; research complete. No implementation-ready claim.
- Owner: Solution Designer; date: 2026-10-06.
- Approval: user explicitly requested checking support and permitted experiments. No new intended product behavior, repository change, or personal config mutation requested/approved. Implementation/design approval N/A for this answer-only task.

## Problem And Desired Outcome
The user reports that disabling Codex app-server multi-agent at startup appears ineffective. Determine support and the effective switch on the installed version; distinguish documented settings, observed tool availability, and AutoByteus's existing launch behavior.

## Relevant Current And Desired Behavior
| ID | Scenario | Current evidence | Desired diagnostic outcome | Preserved behavior |
| --- | --- | --- | --- | --- |
| BEH-001 | SCN-001 | Installed binary is 0.160.1; default and old feature-disable flags advertise six collaboration tools for the tested model | Explain which startup setting actually removes those tools | Personal config, installed app, repository source, and unrelated processes/data remain unchanged |
| BEH-002 | SCN-002 | AutoByteus appends only the old multi_agent/multi_agent_v2 flags; an existing completed ticket deferred this known failure | Explain the relationship to the user's symptom without claiming a product fix | Existing AutoByteus collaboration behavior and finalized artifacts unchanged |

## Scope Guardrail
- UC-001: check documented/app-server operational configuration (SCN-001).
- UC-002: reproduce controlled configuration/tool-surface differences and inspect existing integration (SCN-001/002).
- Out of scope: source changes, config edits, upgrades, deployment, launching the user's app, disabling AutoByteus's own MCP collaboration, reopening the completed ticket.
- Non-goals: exhaustive compatibility across Codex versions/models, actual subagent runtime execution, full AutoByteus E2E certification.
- Preserved boundary: BEH-001/002. No downstream implementation route authorized.
- Review authority: diagnostic evidence is not amended product scope; any implementation would require a separate approved basis/design.

## Requirements And Acceptance Criteria
| REQ | Scope | AC | Observable outcome |
| --- | --- | --- | --- |
| REQ-001 | UC-001 / BEH-001 / SCN-001 | AC-001 | Exact installed version and official setting documented with source links |
| REQ-002 | UC-002 / BEH-001 / SCN-001 | AC-002 | Controlled default, old-disable and effective-disable requests captured; tool definitions compared, not just config values |
| REQ-003 | UC-002 / BEH-002 / SCN-002 | AC-003 | Existing startup arguments and prior deferred finding cited; recommendation clearly separated from changes |
| REQ-004 | UC-001/002 / BEH-001/002 | AC-004 | Isolated processes/data cleaned; no credentials or paid model requests used; coverage limits explicit |

## Relevant Scenarios And Journeys
- SCN-001 — Supported Normal Scenario (operational): operator starts app-server with documented CLI/config overrides, initializes a client and creates a thread. Expected diagnostic result: establish whether built-in collaboration tools are present or absent in the actual inference request. Evidence: official configuration/app-server/subagent docs and installed CLI help. Alternate: per-thread config can explicitly override process defaults, experimentally observed.
- SCN-002 — Supported Normal Scenario (integration): AutoByteus starts Codex for an agent. Goal: avoid Codex's built-in tools competing with AutoByteus collaboration. Evidence: production launch manager/config and previously approved REQ-014/AC-017 in the completed project-task-manager-linked-delegation package. This investigation does not assert that the full integration now passes.

## Quality And Data Continuity
REQ-004/AC-004 governs isolation. All experimental HOME/CODEX_HOME/cwd roots are test-owned and deleted, with retained sanitized diagnostics outside the repository. No production data transition or acceptable user-data loss exists.

## External Contracts, Supplements, And Unknowns
- Official OpenAI docs: configuration reference, subagents, app-server. Links in investigation notes.
- Supplements: `probe.py`, `probe-summary.json`, `assertions.txt`, generated binary schemas and per-case captures (evidence only, no behavior-defining supplement).
- Unknowns: installed/packaged AutoByteus runtime state was not inspected; other binaries/providers/models and old-version compatibility not certified.
- UI/Product design: N/A — no UI requested.
- Architecture phase: N/A — investigation-only, no target design or implementation package.
- Readiness: requested diagnostic evidence complete; no product requirements approval sought or inferred.


## SR-003 — User-directed live diagnostic extension
The user explicitly asks to ask Codex what tools it has, under the startup arguments, rather than relying only on request capture. Authorizes short real authenticated model turns for that diagnosis. This changes experiment scope, not intended application behavior, and is not authorization to edit source/personal settings.
- REQ-005 / AC-005 / UC-002 / BEH-001 / SCN-001: run the same tool-inventory question on default, existing AutoByteus feature-off, and agents.enabled=false startup; retain completed status, model answers, exact commands and cleanup. No spawning tools or unrelated actions requested.
- Isolation: private HOME/CODEX_HOME/cwd; temporary mode-0600 copy of user's existing CLI auth solely for these turns, never printed or retained; private credentials removed in finally. Private model-cache copy may preserve account-provided catalog context; no user config/MCP servers copied. Original credential/config bytes must remain unchanged.
- Prior AC-004 no-credentials/no-inference constraint applied to SR-001 mocked probes only. SR-003 permits authenticated inference as explicitly requested and requires secret-safe isolation/cleanup.
- Limits unchanged: no full product certification, older-version compatibility or actual spawn enforcement claim.
