# Docs Sync Report

## Scope

- Ticket: `self-evolving-harness-feasibility`
- Trigger: Delivery-stage docs synchronization after API/E2E validation round 4 passed the full live browser self-evolution loop and code review round 6 passed the realpath-aware audit fix.
- Bootstrap base reference: reviewed/validated candidate was based on `origin/personal` at `1678dc82b705d24c58b073c75f363d96b5d4cc3c`; implementation/validation reported HEAD `1678dc82b705d24c58b073c75f363d96b5d4cc3c` with working-tree changes.
- Integrated base reference used for docs sync: `origin/personal` at `bd4803d457a1a0ba681cc2b7ccac63486f677a34` after `git fetch origin personal --prune` on 2026-06-04 and merge into `codex/self-evolving-harness-feasibility`.
- Post-integration verification reference: checkpoint commit `ac97c83fb4c633461ec484bc25aa8b22e6f02c65`, merge commit `ac1d98e3e2f4fceb8c794f5c2e45025e2cf55760`; delivery integrated checks passed in `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/delivery-integrated-checks-20260604.log`.

## Why Docs Were Updated

- Summary: Promoted the global self-evolution capability gate, run-owned snapshot model, GraphQL/manual action surface, realpath-aware direct-edit audit semantics, update-vs-benefit metrics, MVP limitations, and round 4 full-loop live browser validation scope into long-lived server and web docs/delivery artifacts.
- Why this should live in long-lived project docs: Self-evolution intentionally touches safety-sensitive durable skill files. Future runtime, Settings, run-history, skill, and API work must preserve the disabled-by-default gate, the run metadata snapshot authority, exact `SKILL.md` edit boundary, audit/metrics separation, and the fact that definition-owned self-evolution config was removed from the accepted design.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-server-ts/docs/modules/self_evolution.md` | New canonical backend module doc for the self-evolution subsystem. | `Updated` | Documents capability, snapshots, lifecycle, realpath-aware direct-edit audit, metrics, full-loop validation boundary, and limitations. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-server-ts/docs/modules/README.md` | Server module documentation index. | `Updated` | Added Self-Evolution to the module table. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-server-ts/docs/README.md` | Server documentation structure overview. | `Updated` | Notes the self-evolution module doc. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Server domain-area and doc-index overview. | `Updated` | Added manual skill self-evolution as a domain area and linked the module doc. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-server-ts/docs/ARCHITECTURE.md` | High-level runtime architecture. | `Updated` | Added a self-evolution runtime section with the control-plane/run-owned/audit summary. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-server-ts/docs/modules/run_history.md` | Canonical run metadata/history doc. | `Updated` | Added `selfEvolutionEffective` metadata snapshot semantics for standalone runs and team agent members. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-web/docs/settings.md` | Settings Basics docs for typed capability cards and raw server settings. | `Updated` | Added the Self-evolution card, `ENABLE_SELF_EVOLUTION`, evolver-agent raw setting, and eligibility caveats. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-web/docs/skills.md` | Durable user/developer doc for skill file management. | `Updated` | Added the direct-edit `SKILL.md` target/audit/rollback contract. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-web/docs/agent_execution_architecture.md` | Frontend run/history/orchestration architecture. | `Updated` | Added run-owned snapshots, typed stores, lazy eligibility, and manual history actions. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-web/docs/agent_management.md` | Agent definition/default launch docs. | `Updated` | Added that self-evolution is excluded from persisted agent definitions/defaults. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-web/docs/agent_teams.md` | Team definition/run-config docs. | `Updated` | Added team-run/member snapshot semantics and MVP exclusion of whole-team/subteam evolution. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/README.md` | Repo-level overview. | `No change` | Existing high-level repo setup/release docs do not need self-evolution detail; durable behavior belongs in server/web module docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | New backend module doc | Documented scope, gate/settings, run-owned snapshots, GraphQL surface, manual lifecycle, realpath-aware direct-edit audit, metrics, MVP limitations, and updated validation boundary after browser round 4. | Establishes canonical long-lived self-evolution runtime contract. |
| `autobyteus-server-ts/docs/modules/README.md` | Index update | Added Self-Evolution module entry. | Makes the new canonical doc discoverable. |
| `autobyteus-server-ts/docs/README.md` | Structure update | Notes that module docs include `modules/self_evolution.md`. | Keeps server docs structure current. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Domain/doc index update | Added manual skill self-evolution orchestration/metrics and module doc link. | Records the new domain area. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Architecture section | Added high-level self-evolution runtime summary. | Future architecture readers need the gate/run-owned/audit mental model. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Metadata contract | Added optional `selfEvolutionEffective` for standalone metadata and team agent-member metadata plus old-run ineligibility. | Manual starts and eligibility are snapshot-owned, not definition-owned. |
| `autobyteus-web/docs/settings.md` | Settings behavior | Added Self-evolution Settings Basics card, global gate semantics, advanced evolver setting, and history-action gating. | Settings is the product-facing capability owner. |
| `autobyteus-web/docs/skills.md` | Skill safety behavior | Added exact `SKILL.md` direct-edit target contract, realpath-aware backend eligibility/audit ownership, Git rollback recommendation, and no proposal/apply UI caveat. | Prevents future broad mutation assumptions and false path-alias expectations. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend run/history architecture | Added self-evolution snapshots, typed capability/eligibility stores, lazy eligibility, and manual start/record behavior. | Documents the frontend boundary without duplicating backend policy. |
| `autobyteus-web/docs/agent_management.md` | Definition ownership | Added that self-evolution is excluded from agent definitions/default launch preferences. | Records removed/rejected definition-owned config. |
| `autobyteus-web/docs/agent_teams.md` | Team launch/member semantics | Added team-run and member run-owned override/snapshot semantics and whole-team/subteam MVP exclusion. | Records team-member-scoped runtime ownership. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Global capability gate | `ENABLE_SELF_EVOLUTION` is disabled by default and every start mutation checks it before target resolution. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/self_evolution.md`, `autobyteus-web/docs/settings.md` |
| Run-owned effective snapshots | `selfEvolution` belongs to launch APIs and `selfEvolutionEffective` metadata snapshots; agent/team definitions do not own eligibility. Old runs with no snapshot are ineligible. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/self_evolution.md`, `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/agent_management.md`, `autobyteus-web/docs/agent_teams.md` |
| Manual-only MVP and strategy placeholders | Only `manual_only` + `single_agent` executes; scheduled/signal triggers and evolver teams are explicit not-implemented catalog entries. | `requirements-doc.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/self_evolution.md` |
| Visible helper run | The evolver launches as a separate visible `AgentRun` with `autoExecuteTools: true`, target workspace, and runtime/model fallback behavior. | `implementation-handoff.md`, `api-e2e-validation-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/self_evolution.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Direct-edit audit boundary | The helper may edit only exact configured writable `SKILL.md` paths; Git/file hash audit records valid changes, off-target changes, non-editable configured changes, warnings, and policy violations. Audit comparison is realpath-aware so `/tmp` and `/private/tmp` aliases of the same physical target are not false off-target violations, while supplied changed-skill paths remain user-facing. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/self_evolution.md`, `autobyteus-web/docs/skills.md` |
| Update vs benefit metrics | Changed files are update-production evidence, not proof of downstream benefit; benefit reports can remain `not_enough_data`/`not_collectible`. | `requirements-doc.md`, `design-spec.md`, `api-e2e-validation-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/self_evolution.md` |
| UI eligibility ownership | Settings owns the global toggle; history actions use backend eligibility and do not recompute policy locally. | `api-e2e-validation-report.md`, `code-review-report.md` | `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Full live browser loop evidence | Round 4 browser validation ran built backend/Nuxt frontend locally, created a disposable Git-backed target skill/agent/run, clicked `Improve skills from this run`, observed the visible evolver run, verified a real `SKILL.md` edit, verified target notification, queried record/metrics, and proved a post-evolution run answered from the updated skill. Evidence was credential-scanned and temporary runtime roots were removed. | `api-e2e-validation-report.md`, `browser-e2e-evidence/round4-real-loop-rerun-20260604/README.md` | `tickets/in-progress/self-evolving-harness-feasibility/handoff-summary.md`, `tickets/in-progress/self-evolving-harness-feasibility/release-notes.md` |
| MVP validation limitations | Durable validation covered GraphQL/services/component/build boundaries; round 4 live browser validation covered the full standalone target self-evolution loop. Scheduled/signal/team evolvers, service-mediated patch apply, and same-active-run behavioral improvement beyond notification remain not implemented or out of scope. | `api-e2e-validation-report.md`, `code-review-report.md`, `browser-e2e-evidence/round4-real-loop-rerun-20260604/README.md` | `autobyteus-server-ts/docs/modules/self_evolution.md`, `tickets/in-progress/self-evolving-harness-feasibility/handoff-summary.md`, `tickets/in-progress/self-evolving-harness-feasibility/release-notes.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Definition-owned self-evolution config on `AgentDefinition`, `TeamDefinition`, `agent-config.json`, or `team-config.json`. | Run-launch `selfEvolution` overrides and run/member metadata `selfEvolutionEffective` snapshots. | `autobyteus-server-ts/docs/modules/self_evolution.md`, `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_management.md`, `autobyteus-web/docs/agent_teams.md` |
| Treating skill file mutation as broad autonomous repository mutation. | Exact configured writable `SKILL.md` target edits with post-run file/Git audit and policy violations. | `autobyteus-server-ts/docs/modules/self_evolution.md`, `autobyteus-web/docs/skills.md` |
| Treating changed skill files as proof of successful downstream improvement. | Separate update-production metrics and benefit metrics that can report `not_enough_data`/`not_collectible`. | `autobyteus-server-ts/docs/modules/self_evolution.md` |
| Default team-member live reload after skill evolution. | MVP next-run-only/team-member notification semantics. | `autobyteus-server-ts/docs/modules/self_evolution.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A; long-lived docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Held`
- Next owner: `implementation_engineer`
- Notes: Docs sync was completed on the earlier integrated delivery state, but API/E2E round 6 subsequently superseded the prior pass with `AE2E-022`: the normal visible Daily Assistant/run-launch configuration path lacks a self-evolution eligibility control. Delivery is held until Local Fix, code review, and API/E2E re-validation complete. After the fix, delivery must recheck whether long-lived docs or release notes need further updates before final handoff.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
