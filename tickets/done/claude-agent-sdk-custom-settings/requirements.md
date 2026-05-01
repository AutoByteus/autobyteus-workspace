# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Make AutoByteus Claude Agent SDK automatically honor Claude Code filesystem configuration without adding a user-facing settings control. If a user configured Claude Code globally, AutoByteus should use that user-level configuration. If a run has a real project/workspace, AutoByteus should also allow that project's Claude Code configuration to participate. This should make Claude Agent SDK behavior match the user's mental model of "Claude Code as the engine under the SDK".

The immediate user case is a working local Claude Code setup where `~/.claude/settings.json` points at DeepSeek (`ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`, DeepSeek model aliases, auth token), while AutoByteus' Claude Agent SDK path does not currently pick that up.

## Investigation Findings

- Local Claude Code is installed at `/Users/normy/.local/bin/claude`, version `2.1.126`.
- `~/.claude/settings.json` exists and contains DeepSeek-related `env` values. Secrets were masked in the investigation artifact.
- Claude Agent SDK v0.2.71 docs/types say omitted `settingSources` means SDK isolation mode: no user/project/local filesystem settings are loaded.
- Current AutoByteus `ClaudeSdkClient` omits `settingSources` for normal turns and model discovery. It only passes `settingSources: ["project"]` when project skills are materialized.
- Live SDK probes proved the issue and fix:
  - AutoByteus-like SDK options without `settingSources` did not use DeepSeek and failed a `deepseek-v4-flash` turn.
  - Adding `settingSources: ["user"]` made SDK initialization list `deepseek-v4-flash` and the tiny DeepSeek turn succeeded.
- User clarified product intent: no settings-page selector is needed. If users change user-level Claude Code settings, they intend them to be used. If users provide a project, that already signals project-level Claude Code customizations should be used.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `ClaudeSdkClient` is the SDK boundary for both runtime and model discovery, but it does not consistently load Claude Code filesystem settings.
- Requirement or scope impact: Centralize settings-source composition inside the Claude runtime-management SDK boundary and remove the proposed settings UI/control from scope.

## Recommendations

- Do **not** add a settings-page selector or toggle.
- For actual Claude runtime turns, pass Claude Agent SDK filesystem settings sources automatically:
  - `user` always, so `~/.claude/settings.json` is loaded.
  - `project` and `local` when the SDK has a workspace `cwd`, so `.claude/settings.json` and `.claude/settings.local.json` can customize project runs.
- For global model discovery, pass at least `user` so gateway-backed models from user-level Claude Code config appear in the model catalog. Project-specific model discovery can be a later project-scoped catalog enhancement if needed.
- Preserve existing project-skill behavior by ensuring project settings remain included for skill materialization; the new automatic project/local loading should replace the special `["project"]` branch rather than compete with it.
- Keep an advanced environment escape hatch only if implementation/review requires it, e.g. `CLAUDE_AGENT_SDK_DISABLE_FILESYSTEM_SETTINGS=true`; do not expose it in the normal UI.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User configured Claude Code user settings for DeepSeek/Kimi and selects Claude Agent SDK in AutoByteus; runtime execution automatically uses those settings.
- UC-002: Claude runtime model discovery uses user-level Claude Code settings so gateway models/aliases appear.
- UC-003: User runs against a project/workspace with `.claude/settings.json` or `.claude/settings.local.json`; Claude Agent SDK runtime loads those project/local settings.
- UC-004: Existing AutoByteus Claude project skills continue to work.

## Out of Scope

- Adding a Server Settings UI control/card for Claude settings sources.
- Building a secret editor for Claude/DeepSeek/Kimi tokens.
- Creating or maintaining DeepSeek/Kimi gateway accounts.
- Implementing a custom Anthropic-compatible proxy.
- Changing Claude Code or Claude Agent SDK internals.
- Project-scoped model catalog filtering/parameters, unless implementation finds it is already available with low risk.
- Changing non-Claude runtimes.

## Functional Requirements

- R-001: Claude Agent SDK turn execution must pass `settingSources` including `user` by default.
- R-002: Claude Agent SDK turn execution for workspace/project runs must include `project` and `local` settings sources so project-level Claude Code customization is honored.
- R-003: Claude Agent SDK model discovery must pass `settingSources` including `user`.
- R-004: Settings-source composition must be centralized in the Claude runtime-management client boundary, not duplicated across session, catalog, and model-management code.
- R-005: Existing Claude executable path resolution and auth spawn environment behavior must remain unchanged.
- R-006: Existing Claude project skill loading must not regress; project settings must remain available when skills are materialized.
- R-007: No new UI or backend logs introduced by this change may expose token-like values.
- R-008: Focused tests must cover runtime query options, model discovery options, project/local source inclusion, and existing project-skill behavior.

## Acceptance Criteria

- AC-001: A normal Claude Agent SDK turn passes SDK `settingSources` containing `user`.
- AC-002: A Claude Agent SDK turn with a workspace `cwd` passes SDK `settingSources` containing `user`, `project`, and `local`.
- AC-003: Claude model catalog probing passes SDK `settingSources` containing `user`.
- AC-004: Existing project-skill turns no longer replace sources with `["project"]`; they preserve user settings and include project/local settings.
- AC-005: A focused SDK probe or unit test demonstrates that adding user settings is sufficient for DeepSeek/Kimi-style Claude Code config to be visible to SDK initialization.
- AC-006: Existing Claude project skill tests continue to pass.
- AC-007: No settings-page source selector/toggle is added.

## Constraints / Dependencies

- `@anthropic-ai/claude-agent-sdk@0.2.71` requires explicit `settingSources` for filesystem settings.
- `user` means the home directory of the process running AutoByteus server. In Docker this is typically `/root/.claude/settings.json`, not the host user's `~/.claude/settings.json` unless mounted/persisted.
- Programmatic `model` can override Claude Code's default model. The model catalog should surface user-level gateway aliases/models to make selection straightforward.
- Secrets must remain masked/not displayed.

## Assumptions

- Users who change user-level Claude Code settings want Claude-backed AutoByteus sessions to use those settings.
- Users who run against a project/workspace want project-level Claude Code customizations to apply.
- Users who want SDK isolation are advanced and can use environment-level controls if needed.

## Risks / Open Questions

- If AutoByteus runs under a different OS user/home than the interactive Claude CLI, user settings may still not be found. This should be documented in Docker/runtime docs, not solved by a normal settings selector.
- Project-specific model aliases may not appear in the global model picker because the current model catalog is not project-scoped. Runtime will still load project settings when a run starts.
- `local` settings can contain machine-specific choices. This is intentional for Claude Code parity, but it should be noted in docs if needed.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| R-001 | UC-001 |
| R-002 | UC-003 |
| R-003 | UC-002 |
| R-004 | UC-001, UC-002, UC-003 |
| R-005 | UC-001, UC-002 |
| R-006 | UC-004 |
| R-007 | UC-001, UC-002, UC-003 |
| R-008 | UC-001, UC-002, UC-003, UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves user-level Claude Code settings are loaded for runtime. |
| AC-002 | Proves project/local Claude Code customizations are loaded for workspace runs. |
| AC-003 | Proves model discovery sees user-level gateway configuration. |
| AC-004 | Protects existing project-skill behavior while adding user settings. |
| AC-005 | Preserves the empirical DeepSeek/Kimi finding. |
| AC-006 | Prevents configured-skill regression. |
| AC-007 | Confirms UI simplicity decision. |

## Approval Status

Refined and approved by user direction: implement automatic Claude Code settings inheritance without a settings-page selector.
