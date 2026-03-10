# Requirements

- Status: `Design-ready`
- Ticket: `agent-skill-runtime-support-investigation`
- Owner: `Codex`
- Last Updated: `2026-03-10`

## Goal / Problem Statement

Codex runtime and Claude runtime currently drop agent-configured `skillNames`, even though the agent definition already stores them and the native `autobyteus` runtime uses them. This ticket must make agent-configured skills available in both runtimes so switching runtime does not silently remove an agent's configured skill behavior.

Follow-up investigation also showed that the Codex app-server integration currently reuses one global client/process regardless of workspace path. That is too coarse for Codex's `cwd`-scoped operating model. This ticket now also hardens the Codex client boundary so runs in the same workspace/worktree reuse one client, while different workspaces do not share one global client.

Further raw Codex probing showed that direct turn-level `skill` attachments are not a sufficient Codex integration contract for custom agent-configured skills. Codex discovers and successfully invokes custom skills when they exist as repo-scoped workspace skills under `.codex/skills/<name>/` with `SKILL.md` plus `agents/openai.yaml`. This ticket therefore also needs a Codex workspace-skill materialization strategy.

## Scope Classification

- Classification: `Medium`
- Rationale: the change crosses shared agent-runtime resolution plus two runtime implementations (`codex_app_server` and `claude_agent_sdk`) and requires design, runtime modeling, and verification updates.

## In-Scope Use Cases

| use_case_id | Name | Description | Source Requirement IDs |
| --- | --- | --- | --- |
| UC-001 | Resolve configured runtime skills | Runtime bootstrap resolves agent instructions, configured skills, and effective skill access mode from the agent definition before session startup. | `R-001`, `R-004` |
| UC-002 | Codex configured skill exposure | Codex run creation/restore materializes the agent's configured skills as repo-scoped workspace skills so Codex can discover and invoke them without manual user skill setup. | `R-001`, `R-002`, `R-004` |
| UC-003 | Claude turn skill exposure | Claude run creation/restore keeps the agent's configured skills available to the Claude model on each turn without manual user skill setup. | `R-001`, `R-003`, `R-004` |
| UC-004 | Disabled or missing runtime skill exposure | `NONE` mode or unresolved skill names do not expose skills and do not break run creation. | `R-004`, `R-005` |
| UC-005 | Codex client isolation by workspace path | Codex runtime reuses one app-server client within the same canonical `cwd` / worktree and isolates different workspace paths into different clients. | `R-006` |

## Requirements

| requirement_id | Requirement | Expected Outcome | Use Case IDs |
| --- | --- | --- | --- |
| `R-001` | Runtime bootstrap must resolve agent-configured skills alongside existing instruction metadata. | Codex and Claude runtime launch paths receive the same agent-selected skill set derived from `AgentDefinition.skillNames`, plus the effective skill access mode derived from the launch request. | `UC-001`, `UC-002`, `UC-003` |
| `R-002` | Codex runtime must expose the agent-configured skills through Codex-discoverable workspace skill bundles. | When skill exposure is enabled, Codex session bootstrap materializes the agent's configured skills into workspace-local `.codex/skills` bundles that Codex can discover and invoke for that run. | `UC-002` |
| `R-003` | Claude runtime must expose the agent-configured skills to the Claude model during turn construction. | When skill exposure is enabled, each Claude turn includes the configured skill content needed for the model to follow the selected skills, including absolute root-path context for skill-relative files. | `UC-003` |
| `R-004` | Skill access rules must be respected consistently. | `NONE` disables configured skill exposure, while `PRELOADED_ONLY` and `GLOBAL_DISCOVERY` both expose the agent-selected skills; unresolved skill names are skipped with non-fatal handling. | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-005` | Verification must cover the new runtime skill wiring. | Tests prove create/restore/turn flows for Codex and Claude receive the configured skills and that suppression paths (`NONE`, unresolved skills) remain correct. | `UC-004` |
| `R-006` | Codex app-server client reuse must be scoped by canonical workspace path. | Runs sharing the same canonical `cwd` reuse one started Codex client, while runs from different workspace paths do not share one global client; the implementation must not create one Codex process per session/thread by default. | `UC-005` |

## Acceptance Criteria

| acceptance_criteria_id | Acceptance Criterion | Measurable Expected Outcome | Requirement IDs |
| --- | --- | --- | --- |
| `AC-001` | Runtime bootstrap resolves configured skills for member runtimes. | Unit coverage proves the runtime bootstrap result for a configured agent contains the selected skills and effective access mode used by Codex and Claude adapters. | `R-001`, `R-004` |
| `AC-002` | Codex workspace skill materialization occurs when enabled. | Unit coverage proves Codex session bootstrap materializes configured skills into workspace-local `.codex/skills` bundles with usable `SKILL.md` and `agents/openai.yaml`, and omits that materialization for `NONE`. | `R-002`, `R-004` |
| `AC-003` | Claude turn construction includes configured skill instructions when enabled. | Unit coverage proves Claude turn input contains the configured skill instruction block, including root-path guidance, and omits that block for `NONE` or empty skill sets. | `R-003`, `R-004` |
| `AC-004` | Missing skills do not fail runtime startup. | Unit coverage proves unresolved configured skill names are ignored without throwing, while resolved skills continue to be exposed. | `R-004` |
| `AC-005` | Adapter and runtime-service regression coverage is updated. | Tests cover Codex create/restore wiring, Claude create/restore wiring, and shared skill-resolution behavior introduced by this ticket. | `R-005` |
| `AC-006` | Codex client reuse matches the `cwd` boundary. | Unit coverage proves the process manager reuses one client for the same canonical workspace path, starts separate clients for different workspace paths, and releases per-`cwd` clients when the last holder closes. | `R-006` |

## Requirement Coverage Map To Call-Stack Use Cases

| requirement_id | use_case_ids |
| --- | --- |
| `R-001` | `UC-001`, `UC-002`, `UC-003` |
| `R-002` | `UC-002` |
| `R-003` | `UC-003` |
| `R-004` | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-005` | `UC-004` |
| `R-006` | `UC-005` |

## Acceptance-Criteria Coverage Map To Stage 7 Scenarios

| acceptance_criteria_id | stage7_scenario_ids |
| --- | --- |
| `AC-001` | `S7-001`, `S7-004` |
| `AC-002` | `S7-002`, `S7-007` |
| `AC-003` | `S7-003` |
| `AC-004` | `S7-004` |
| `AC-005` | `S7-005`, `S7-006`, `S7-007`, `S7-008` |
| `AC-006` | `S7-009` |

## Constraints / Dependencies

- `AgentDefinition.skillNames` remains the source of truth for configured skills.
- Existing instruction loading from `agent.md` or description fallback must remain intact.
- Existing runtime create/restore APIs and run-history flows must keep working.
- The implementation should avoid requiring manual global runtime skill configuration from users.
- Codex hardening must not degrade into one app-server process per session/thread.
- Codex custom-skill exposure should work even when the source skill only has `SKILL.md`; the integration may need to synthesize missing Codex-facing metadata such as `agents/openai.yaml`.
- Verification must stay inside the repository's current automated test surface unless a later stage records an infeasible external-runtime scenario.

## Assumptions

- Configured skills resolve through `SkillService` to local `SKILL.md`-backed skill directories.
- When `skillAccessMode` is omitted, existing `resolveSkillAccessMode(...)` semantics remain the source of truth.
- Missing or renamed configured skills should be handled the same way as the native runtime currently handles unresolved skills: skip and continue.
- Mirroring configured skills into a hidden workspace `.codex/skills` area is acceptable if the integration tracks and cleans up only the skill bundles it owns.

## Open Questions / Risks

- Raw Codex app-server probing shows that direct turn-level `skill` attachments alone do not make a custom skill invokable, while repo-scoped workspace skills under `.codex/skills/<name>` with `agents/openai.yaml` do work. The repository integration must align to that Codex-specific contract.
- Claude SDK native skill loading is filesystem-source based, so the cleanest per-agent exposure mechanism must avoid leaking unrelated global or project-wide skills.
- Large skill bodies can increase turn context size; the implementation should keep exposure limited to the agent's configured skills only.
- Runtime-native local raw-trace persistence for Codex/Claude remains weaker than desired when no websocket subscriber is attached; that broader follow-up is recorded but not added to this implementation slice.
