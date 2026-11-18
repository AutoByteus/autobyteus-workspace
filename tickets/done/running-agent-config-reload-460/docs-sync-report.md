# Docs Sync Report — autobyteus-460

## Scope

- Ticket: `running-agent-config-reload-460` (autobyteus-460): a running agent takes skills added to its definition, and is told about skills added and removed.
- Trigger: code review `CRR-002` Pass (post-API/E2E test-code review), after API/E2E `API-REV-001` Pass and code review `CRR-001` Pass. Route: `Reviewed` (Large / High).
- Bootstrap base reference: `origin/personal` @ `7b8bcf932fca35e8937dd3158d6a05ebbca5e227`
- Integrated base reference used for docs sync: `origin/personal` @ `ca0a8c0b5b0a24369245c4ed9eff3805f03e0ab4`, merged into the ticket branch as `dbd7462dc2` (8 new base commits: autobyteus-24, web only)
- Post-integration verification reference: `evidence/delivery/DEL-01-post-integration-checks.log` (archived: `tickets/done/running-agent-config-reload-460/evidence/delivery/DEL-01-post-integration-checks.log`)

## Why Docs Were Updated

- Summary: Before this ticket, a running agent was told only when the files of a skill it already used changed. Now a skill added to the agent's definition is set up in the running agent's runtime (Claude, Codex, Grok, DeepSeek workspace links; Antigravity run capsule) and announced; a removed skill is announced (nothing unlinked). A restored run is told about skills it now has and never saw. GitHub added to a running agent says that its access starts at restart. The implementation updated the eight module docs it touched; delivery checked them against the code and the evidence, and closed two gaps in neighbouring docs that still described the old behavior.
- Why this should live in long-lived project docs: the next change to skill delivery, run lifecycle release ordering, or a runtime backend must start from the single-holder rule (`RunWorkspaceSkills`, `closed` guard), the Claude "folder must exist at process start" fact, and the "notices drive setup" scope of a subsystem whose name says only "notices".

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; the ticket's design cases | No change | Rules unchanged. The design's recovery cases (21, 22) live in `docs/design-cases.md`, which the implementation updated |
| `TESTING.md` | New scripted AGY suite and updated live suite | No change | Lines 223ff already describe the scripted AGY CLI (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND`) generally; the new suite uses only existing gates (`RUN_AGY_FAILURE_E2E`, `RUN_GITHUB_PROXY_E2E`, `RUN_LIVE_SKILL_DEFINITION_E2E`). No command in it stopped working |
| `RELEASE.md` | Finalization and release rules | No change | No release step, workflow or check is affected; `scripts/release_smoke.py` already starts runs with configured skills on all five runtimes |
| `docs/design-cases.md` | Recovery cases the design cites | No change (updated by the implementation) | Case 21 repeat (SR-004) and Case 22 (the guard read `isActive()`), diff `7b8bcf932f..HEAD`: +12 / −1 |
| `autobyteus-server-ts/docs/modules/skill_update_notices.md` | The subsystem's own doc | No change (updated by the implementation; checked) | Scope, TS source, tracked runs, definition changes, delivery text (now available / restart sentence), restored-run rule (DEC-002), ownership. Checked against the source file names and the evidence JSON |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | New backend contract and holder | No change (updated by the implementation; checked) | New section "Skills Added To A Running Agent's Definition": `applyDefinitionSkills`, `RunWorkspaceSkills` (single holder, `closed` guard, release paths), Claude's `.claude/skills` folder (SR-004), Antigravity capsule, native no-op. `run-workspace-skills.ts`, `codex-workspace-skill-request-planner.ts` and `workspaceSkillsRootSegments` exist at the named paths |
| `autobyteus-server-ts/docs/modules/tool_list_updates.md` | Shares `AgentDefinitionChangeSignal` | No change (updated by the implementation) | Cross-reference to skill notices |
| `autobyteus-server-ts/docs/modules/codex_integration.md`, `grok_build_runtime.md`, `deepseek_harness_runtime.md`, `antigravity_cli_runtime.md` | Per-runtime behavior | No change (updated by the implementation) | A few lines each: mid-run links and release (AGY: capsule link, manifest, kept for resume, no link for a run interrupted mid-turn; Codex: a live thread listing the new folder is not proven, the notice gives the path) |
| `autobyteus-server-ts/docs/modules/credential_proxy.md` | Read-only pass state | No change (updated by the implementation) | `grantedIntegrationIds`, `integrationsStartingOnRestart`; nothing is granted mid-run |
| `autobyteus-server-ts/docs/modules/skills.md` | "Skill Changes During Active Runs" | **Updated** | Said only folder edits are announced |
| `autobyteus-server-ts/docs/modules/agent_package_definitions.md` | Says who hears about definition changes | **Updated** | Said skill changes are announced "separately" without the new definition-driven path |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | `seen_skill_versions.json` | No change | The file's shape and meaning are unchanged (persisted-data decision `Directly Usable — No Migration`) |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | No change | The skill update notices row already exists |
| `autobyteus-web/docs/agent_execution_architecture.md` (line 1903) | Notice card label | No change | The card label, sender and header are unchanged (API-08); only the body text is new, rendered as ordinary notice content |
| `autobyteus-ts/docs/agent_memory_design.md` | Native input-preface tag | No change | Native runs behave as before: the notice is a platform input preface; the system prompt is not changed (FU-006) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/skills.md` | Behavior | "Skill Changes During Active Runs" now says that a skill added to or removed from the agent's definition while a run is going is announced the same way; an added skill is also set up in the run's runtime before the notice; a removed skill is announced and not unlinked | The section described only folder edits, so a reader would conclude that adding a skill to a running agent does nothing |
| `autobyteus-server-ts/docs/modules/agent_package_definitions.md` | Cross-reference | The feed paragraph now says the skill notice subsystem also listens to the definition change signal, so a skill added to or removed from a definition reaches the running agents of it | The paragraph said skill changes are told "separately" and did not name this path |

Updated earlier in the ticket (implementation commits `07d5d69b30`, `c7685b20c6`) and checked here: the eight module docs and `docs/design-cases.md` in the table above.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One holder of a run's workspace skill links | `RunWorkspaceSkills` holds the links from preparation to release; every release path calls `release()`, which sets `closed`, waits for the add in flight, then releases; guards read `closed`, never `isActive()` (true on Claude and Codex until cleanup ends) | design-spec SR-003, AR-001 | `agent_execution.md`; `docs/design-cases.md` Case 22 |
| Claude lists a mid-run skill only if its skills folder existed at process start | Preparation (new and restore) creates `<workspace>/.claude/skills` and never removes it; a failure is logged and never fails the run | SR-004, DI-001, `evidence/live/IMP-07…09, IMP-13` | `agent_execution.md`; `docs/design-cases.md` Case 21 |
| Notices drive setup | The subsystem named "notices" also asks the run to set an added skill up, before the notice; failures are logged and never stop the notice | design-spec, DEC-001 | `skill_update_notices.md` |
| Removal is a message only | Nothing is unlinked on removal (user decision DEC-007; FU-007) | requirements DEC-007 | `skill_update_notices.md`, `agent_execution.md` |
| Restored runs hear about skills they now have | The seen record is not seeded with unseen names; they are announced as now available (DEC-002) | requirements DEC-002 | `skill_update_notices.md` |
| Integration access does not start mid-run | The notice says GitHub's access starts at restart; the pass is read, never written | DEC-004, API-05c | `skill_update_notices.md`, `credential_proxy.md` |
| Antigravity capsule | A mid-run add is linked into the run capsule and its manifest (atomic rewrite); kept for resume | design-spec | `antigravity_cli_runtime.md`, `agent_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Seeding of unseen skill names for a restored run | Announcing them as "now available" at its next input (DEC-002) | `skill_update_notices.md` ("Seen versions") |
| Preparation lists and run-context skill lists; `ProviderPreparationGuard.ownSkill` (design SR-003) | `RunWorkspaceSkills` holder, passed in `ProviderPreparationGuard.workspaceSkills` | `agent_execution.md` |
| A guard reading the backend's `isActive()` for the add | `closed` fact of `RunWorkspaceSkills` | `agent_execution.md`; `docs/design-cases.md` Case 22 |

## No-Impact Decision

Not applicable: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive the ticket, commit, push, finalize into `personal` (Release Decision: no release).
- Notes:
  - Observation, not a docs problem: API/E2E's first API-04 run hit one scripted-AGY discovery timeout (the `agy --help` 3 s probe) while five E2E files started servers in parallel; the file passes alone and the discovery code is untouched. API/E2E classified it harness contention and recorded it in the execution report (case API-04). Nothing changed in `TESTING.md`.
  - No new follow-up was found by delivery. The ticket's `follow-ups.md` lists FU-001…FU-005 and FU-007 unsent and FU-006 sent on 2026-11-13; the Solution Designer sends the unsent ones when the ticket leaves the team.
