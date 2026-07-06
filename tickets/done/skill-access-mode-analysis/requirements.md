# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready.

## Goal / Problem Statement

Simplify agent and agent-team launch by removing `GLOBAL_DISCOVERY` / "All installed skills" as a product behavior and by no longer asking users to choose a launch-time skill access mode in the normal frontend flow.

The product invariant should be: a running agent can use the skills explicitly configured on its agent definition. A general/orchestrator agent is represented by explicitly configuring all desired skills on that agent definition; it is not represented by a separate global discovery mode.

## Background / User Rationale

The user reported that the `Skill Access` dropdown shown when starting an agent or agent team adds complexity and has never been useful in day-to-day launches. Across runtimes, the user has consistently left the default value selected. The user also clarified that the product should expose only the skills an agent needs, and that any broad/orchestrator agent should be manually configured with the broad skill set it is allowed to use.

The initial reason for considering global discovery was a possible future pattern where an orchestrator dynamically creates a task agent with selected skills. The user clarified that AutoByteus does not currently have that dynamic skill-assigned sub-agent capability. If such a feature is built later, it should still use explicit selected `skillNames[]` for the child run rather than giving the child global discovery.

## Product Decision

Remove `GLOBAL_DISCOVERY` from the product. Skill exposure shall derive from configured skills, not from a launch-time "all installed skills" mode.

## In-Scope Use Cases

- UC-SAM-001: A user starts a single agent run from the frontend.
- UC-SAM-002: A user starts an agent team run from the frontend.
- UC-SAM-003: A user starts a run for any supported runtime (`AutoByteus`, `Codex`, `Claude`) without needing to understand skill access modes.
- UC-SAM-004: A general/orchestrator agent is created by explicitly configuring all skills it is allowed to use.
- UC-SAM-005: A persisted historical run, team member, or external channel preset contains the old `GLOBAL_DISCOVERY` value.
- UC-SAM-006: An agent runtime skill tool is invoked and must not expose non-configured skills through a bypass path.

## Out of Scope

- Building dynamic/ad-hoc sub-agent creation by name + selected skills.
- Redesigning the entire skill CRUD/source system.
- Changing model selection, workspace selection, or runtime selection UX except where it currently references skill access.
- Making every historical UI/editor remove all traces of skill metadata in one pass, beyond what is required to remove `GLOBAL_DISCOVERY` safely.
- Supporting backward-compatible `GLOBAL_DISCOVERY` requests after this change.

## Functional Requirements

- REQ-SAM-001: Normal single-agent launch shall not show a `Skill Access` selector.
- REQ-SAM-002: Normal team launch shall not show a team-level `Skill Access` selector.
- REQ-SAM-003: External channel binding setup shall not ask users to choose `Skill Access` for launch presets.
- REQ-SAM-004: New runs shall expose only skills explicitly configured for the selected agent definition.
- REQ-SAM-005: New team runs shall expose each leaf agent member only to skills explicitly configured for that member's agent definition.
- REQ-SAM-006: `GLOBAL_DISCOVERY` shall be removed from runtime/shared enums, frontend unions, GraphQL enum values, app SDK contracts, labels, and tests.
- REQ-SAM-007: No code path shall default an agent with zero configured skills to all installed/global skills.
- REQ-SAM-008: If an agent has no configured skills, the runtime shall expose no AutoByteus-managed skills by default.
- REQ-SAM-009: Runtime skill tools that list, read, or load skills for an agent shall enforce the configured-skill allowlist instead of allowing arbitrary installed-skill access.
- REQ-SAM-010: Existing persisted `GLOBAL_DISCOVERY` values in run/team metadata and external channel launch presets shall be migrated to configured-only behavior.
- REQ-SAM-011: API/client inputs that still include `GLOBAL_DISCOVERY` after the change shall be rejected by the new enum/validation rather than silently preserving the legacy behavior.
- REQ-SAM-012: Codex and Claude runtime skill materialization shall remain based on configured skills only; removing `GLOBAL_DISCOVERY` shall not introduce any all-installed-skill materialization path.

## Non-Functional Requirements

- NFR-SAM-001: The product model should become easier to explain: configure an agent's skills once; launching the agent uses those configured skills.
- NFR-SAM-002: The change should be a clean cut: do not retain hidden `GLOBAL_DISCOVERY` compatibility branches.
- NFR-SAM-003: Data migration should be deterministic, idempotent, and consistent with the existing app-data migration framework.
- NFR-SAM-004: The implementation should avoid broad rewrites unrelated to skill exposure.

## Acceptance Criteria

- AC-SAM-001: The start-agent form no longer renders the `Skill Access` dropdown.
- AC-SAM-002: The start-team form no longer renders the `Skill Access` dropdown.
- AC-SAM-003: Channel binding setup no longer renders a `Skill Access` dropdown.
- AC-SAM-004: `GLOBAL_DISCOVERY` cannot be selected from frontend UI and is absent from frontend skill-access type unions and generated GraphQL enum usage.
- AC-SAM-005: Shared/runtime `SkillAccessMode` no longer contains `GLOBAL_DISCOVERY`.
- AC-SAM-006: `resolveSkillAccessMode(null, 0)` or equivalent missing-mode handling no longer returns global discovery.
- AC-SAM-007: An agent definition with configured skills exposes exactly those configured skills.
- AC-SAM-008: An agent definition with no configured skills exposes no skills; it does not list or load all installed skills.
- AC-SAM-009: AutoByteus runtime prompt skill injection no longer has a branch that catalogs all registry skills.
- AC-SAM-010: `load_skill`, `get_available_skills`, and `get_skill_content` do not expose non-configured skills when invoked in an agent runtime context.
- AC-SAM-011: Codex and Claude runtime materializers only materialize configured skills, or no skills if internal no-skill suppression is explicitly used.
- AC-SAM-012: Persisted run/team/channel records containing `GLOBAL_DISCOVERY` are migrated to configured-only behavior before normal parsing/serialization depends on the new enum.
- AC-SAM-013: Tests that previously asserted or supplied `GLOBAL_DISCOVERY` are removed or updated to configured-only expectations.

## Constraints / Dependencies

- Agent and team definitions already encode configured skills through `skillNames`.
- Existing launch GraphQL inputs and metadata structures currently carry `skillAccessMode`.
- Current frontend defaults already use `PRELOADED_ONLY`.
- Codex/Claude materialization code currently treats non-`NONE` modes as configured-skill materialization; it does not implement all-installed AutoByteus skill discovery.
- App SDK contracts currently include `GLOBAL_DISCOVERY`; removing it is a breaking product-contract cleanup.
- Stored historical metadata may contain `GLOBAL_DISCOVERY` and must be migrated or normalized before enum removal reaches runtime parsing.

## Assumptions

- `PRELOADED_ONLY` / configured-only behavior is the desired product default.
- A run-level internal no-skill suppression mode may remain temporarily if current tests or internal runtime flows depend on it, but it must not be user-facing and must not preserve global discovery.
- Any future dynamic task-agent capability will pass an explicit `skillNames[]` allowlist to the child run.

## Risks / Open Questions

- Some external SDK/API callers may currently send `GLOBAL_DISCOVERY`; this change intentionally breaks that behavior.
- If any old metadata store is missed by migration, GraphQL enum serialization or metadata parsing may fail after enum removal.
- If `get_available_skills` or `get_skill_content` are used as non-agent administrative tools, enforcement must distinguish agent runtime context from control-plane/admin context instead of weakening the runtime boundary.
- Full removal of the run-level `skillAccessMode` attribute may be a later cleanup after `GLOBAL_DISCOVERY` is gone and no user-facing mode remains.

## Requirement-To-Use-Case Coverage

- REQ-SAM-001 -> UC-SAM-001, UC-SAM-003
- REQ-SAM-002 -> UC-SAM-002, UC-SAM-003
- REQ-SAM-003 -> UC-SAM-003
- REQ-SAM-004 -> UC-SAM-001, UC-SAM-004
- REQ-SAM-005 -> UC-SAM-002
- REQ-SAM-006 -> UC-SAM-001, UC-SAM-002, UC-SAM-003, UC-SAM-005
- REQ-SAM-007 -> UC-SAM-001, UC-SAM-002, UC-SAM-003
- REQ-SAM-008 -> UC-SAM-001, UC-SAM-002
- REQ-SAM-009 -> UC-SAM-006
- REQ-SAM-010 -> UC-SAM-005
- REQ-SAM-011 -> UC-SAM-005
- REQ-SAM-012 -> UC-SAM-003

## Approval Status

Product direction approved by user on 2026-07-06: remove global discovery to simplify the product.
