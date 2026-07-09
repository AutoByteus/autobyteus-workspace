# Docs Sync Report

## Scope

- Ticket: `skill-improvement-naming-refactor`
- Trigger: Delivery-stage docs sync after API/E2E validation passed with no repository-resident durable coverage changes during API/E2E.
- Bootstrap base reference: `origin/personal` at `45442c8a771b4c90db323e52bf6a69d20fcb7291` when API/E2E handed off to delivery.
- Integrated base reference used for docs sync: `origin/personal` at `84f7de18c7a2648af07cefa10e62433e0d270570` after `git fetch origin --prune` on 2026-07-09.
- Post-integration verification reference: Local checkpoint commit `97de8f6a9e826597619cb0c7ee0ce8e9b8370110`; merge commit `3888cfbf2f87c687bd612d901393c97f09c00d38`; `git diff --check` passed; focused server Vitest passed (`13` files / `43` tests); `pnpm -C autobyteus-web exec nuxi prepare` passed; focused web Vitest passed (`9` files / `144` tests); integrated active stale-term scan passed with `unexpected_matches=0`.

## Why Docs Were Updated

- Summary: This ticket performs the broad clean-cut rename from development-phase `self-evolution` / `evolver` / `companion` terminology to the final Skill Improvement model. Long-lived docs now describe the active source/API module as `skill-improvement`, GraphQL fields and settings as Skill Improvement names, runtime persistence under `skill_improvement` / `improvement_runs` / `improver_session.json`, the clean built-in id `autobyteus-retrospective-skill-improver`, and the Retrospective Skill Improver actor model.
- Why this should live in long-lived project docs: The rename changes active server and web public contracts, settings keys, persisted clean-state paths, GraphQL names, source ownership boundaries, and user-facing UI copy. Future developers need the new names and the narrow historical allowlist documented to avoid reintroducing stale compatibility paths or old `self-evolution` names.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Top-level module summary references the Skill Improvement runtime and work-trace consumer boundary. | Updated | Now points to `src/skill-improvement`, the Retrospective Skill Improver actor, and the clean path-based trigger model. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Project-wide feature/module overview. | Updated | Uses Skill Improvement naming for the active feature. |
| `autobyteus-server-ts/docs/README.md` | Server docs index / overview. | Updated | Cross-references the renamed Skill Improvement module doc. |
| `autobyteus-server-ts/docs/features/memory_sync.md` | Cross-feature docs can mention run memory and historical cleanup. | Updated | References are consistent with the new Skill Improvement naming. |
| `autobyteus-server-ts/docs/modules/README.md` | Module index. | Updated | Replaces `self_evolution.md` entry with `skill_improvement.md`. |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Built-in agent sync docs own product-managed infrastructure agent ids. | Updated | Documents `autobyteus-retrospective-skill-improver` and the new setting key. |
| `autobyteus-server-ts/docs/modules/agent_work_traces.md` | Work-trace docs mention Skill Improvement as first consumer. | Updated | Consumer references now use Skill Improvement naming while preserving the work-trace storage/format contract. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run history docs include historical migration notes and UI/history behavior. | Updated | Active references use Skill Improvement; old `self_evolution` remains only in the historical migration id allowlist. |
| `autobyteus-server-ts/docs/modules/skill_improvement.md` | Canonical server module contract for the renamed feature. | Updated | Replaces `self_evolution.md`; documents settings, GraphQL surface, runtime paths, improver session lifecycle, records, and limitations. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend runtime/store docs mention helper runs, history, and CTA behavior. | Updated | Uses Skill Improvement / Retrospective Skill Improver names. |
| `autobyteus-web/docs/agent_management.md` | Agent management docs can mention feature eligibility and skills. | Updated | Uses new user-facing terminology. |
| `autobyteus-web/docs/agent_teams.md` | Team workspace docs mention member-scoped improvement. | Updated | Uses new user-facing terminology. |
| `autobyteus-web/docs/settings.md` | Settings docs own capability toggle copy. | Updated | Describes the Skill Improvement setting/toggle rather than Self Evolution. |
| `autobyteus-web/docs/skills.md` | Skills docs explain how improved skill files relate to active runs. | Updated | Uses Skill Improvement naming and notes reload/runtime boundaries. |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/SKILL.md` | Durable built-in improver guidance, not a docs folder but product guidance. | Updated | Keeps the actor/package guidance aligned with the clean renamed runtime. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/self_evolution.md` -> `autobyteus-server-ts/docs/modules/skill_improvement.md` | Module doc rename/rewrite | Renamed the module doc and updated source folder, setting keys, GraphQL fields, run/session paths, record terminology, and actor names. | The source/API module is now Skill Improvement; old module docs would preserve stale ownership. |
| `autobyteus-server-ts/docs/modules/README.md`, `autobyteus-server-ts/docs/README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md`, `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Cross-reference update | Replaced Self Evolution module references with Skill Improvement references. | Keep module indexes and top-level architecture navigable after the doc/source rename. |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Built-in id/settings update | Replaced old built-in/default id references with `autobyteus-retrospective-skill-improver` and `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`. | The clean-state runtime no longer uses `autobyteus-skill-evolver` or old setting keys. |
| `autobyteus-server-ts/docs/modules/agent_work_traces.md` | Consumer naming update | Replaced the consumer name with Skill Improvement while preserving work-trace body/manifest/storage semantics. | Work traces are still shared; only the first consumer’s active feature name changed. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Historical/active terminology update | Active text now uses Skill Improvement; old `self_evolution` remains only as a historical migration id note. | Satisfy the allowlist requirement without hiding historical cleanup facts. |
| `autobyteus-web/docs/agent_execution_architecture.md`, `agent_management.md`, `agent_teams.md`, `settings.md`, `skills.md` | Frontend docs update | Updated UI feature names, settings wording, CTA/skill-file behavior, and workspace/team references. | Keep user-facing and frontend architecture docs aligned with renamed stores/components/GraphQL. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Clean-cut rename boundary | Active source/API/UI/runtime names are Skill Improvement; old aliases/fallbacks are intentionally not retained because the feature is development-phase. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/skill_improvement.md`, server/web architecture docs |
| Runtime settings and built-in id | Clean-state settings are `ENABLE_SKILL_IMPROVEMENT` and `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`; default built-in id is `autobyteus-retrospective-skill-improver`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/skill_improvement.md`, `agent_definition.md`, `autobyteus-web/docs/settings.md` |
| Persistence paths | Skill Improvement run records are global under `memory/skill_improvement/improvement_runs`; target-scoped improver session state is `<target memoryDir>/skill_improvement/improver_session.json`; work traces remain under `work_traces`. | `requirements.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/skill_improvement.md`, `agent_work_traces.md` |
| GraphQL and web contracts | Public GraphQL fields/mutations/types and frontend stores/documents/components use Skill Improvement names only. | `requirements.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/skill_improvement.md`, `autobyteus-web/docs/settings.md`, `agent_execution_architecture.md` |
| Historical old-term allowlist | Remaining old terms are limited to historical migration ids/classes/fixtures and docs that explain historical cleanup; active runtime compatibility is not allowed. | `requirements.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/skill_improvement.md`, `run_history.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/` and active `SelfEvolution*` source/test names | `autobyteus-server-ts/src/skill-improvement/`, `SkillImprovement*`, and `Improver*` source/test names. | `autobyteus-server-ts/docs/modules/skill_improvement.md` |
| GraphQL `selfEvolution*` queries/mutations/types and `*SelfEvolution*` input/type names | `skillImprovement*` GraphQL boundary with `improvementRunId`, `improverRunId`, and `improverAgentDefinitionId`. | `autobyteus-server-ts/docs/modules/skill_improvement.md` |
| Settings `ENABLE_SELF_EVOLUTION` and `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID` | `ENABLE_SKILL_IMPROVEMENT` and `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`. | `autobyteus-server-ts/docs/modules/skill_improvement.md`, `agent_definition.md`, `autobyteus-web/docs/settings.md` |
| Built-in default id `autobyteus-skill-evolver` | `autobyteus-retrospective-skill-improver`. | `autobyteus-server-ts/docs/modules/agent_definition.md`, `skill_improvement.md` |
| Runtime paths `<memory>/self_evolution/evolution_runs` and `<target memoryDir>/self_evolution/evolver_session.json` | `<memory>/skill_improvement/improvement_runs` and `<target memoryDir>/skill_improvement/improver_session.json`. | `autobyteus-server-ts/docs/modules/skill_improvement.md` |
| Web `selfEvolution*` stores/components/GraphQL documents/types/localization keys | `skillImprovement*` stores/components/documents/types/keys and Improve Skills CTA wording. | `autobyteus-web/docs/settings.md`, `agent_execution_architecture.md`, `skills.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs updated`
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Delivery refresh found `origin/personal` advanced by four commits after API/E2E handoff. A local checkpoint commit was created before integration, latest `origin/personal` merged cleanly, and post-integration focused server/web checks plus stale-term scan passed. No additional long-lived docs edits were needed during delivery because the integrated implementation already had the durable docs/guidance aligned with the final renamed behavior.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
