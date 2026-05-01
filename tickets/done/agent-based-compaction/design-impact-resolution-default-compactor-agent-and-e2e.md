# Design Impact Resolution: Default Compactor Agent and Codex E2E

## Status

Resolved by solution designer on 2026-04-28; pending architecture re-review.

## Trigger

After implementation handoff, the user asked whether production should provide an internal/default compactor agent instead of requiring every user to manually create one, and asked for an end-to-end scenario where a normal AutoByteus parent agent triggers compaction while the selected compactor agent uses Codex runtime.

This extends the already revised visible-normal-run design. In this note, “internal/default agent” means a **system-provided default agent definition**, not hidden/internal run semantics.

## Decisions

### 1. Add a system-provided default compactor agent definition

Yes. This ticket should add a default Memory Compactor agent definition so fresh installs have a clear production starting point.

- Default id: `autobyteus-memory-compactor`.
- Runtime location: existing app-data agents home:
  - `appConfigProvider.config.getAgentsDir()/autobyteus-memory-compactor/agent.md`
  - `appConfigProvider.config.getAgentsDir()/autobyteus-memory-compactor/agent-config.json`
- Template/source-of-truth: repo-owned default compactor template under the server compaction capability area, preferably:
  - `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent.md`
  - `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent-config.json`
  - If packaging makes raw template files awkward, equivalent typed constants in the same capability area are acceptable.
- Ownership scope: normal `shared` agent definition, not `application_owned`, because users must be able to edit instructions and default launch preferences through the existing agent editor.
- Seeding behavior:
  - On startup, create the default compactor directory/files if missing.
  - Do not overwrite any existing `autobyteus-memory-compactor` files. Existing user edits win.
  - If only one file is missing, create the missing file from the template and leave existing files untouched.
  - If existing user-edited content is invalid/unparseable, do not silently replace it; surface/log the normal agent-definition error and require user repair.
- Update/migration behavior:
  - Future improvements to the template must not silently overwrite the seeded user-editable definition.
  - Template updates require a separate explicit migration/version design if needed.
- Cache behavior:
  - Run seeding before agent-definition cache preloading or refresh the definition cache after seeding so normal listing/query paths see the default definition.

### 2. Select the default only when the compactor setting is blank

If `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is blank at startup and the default compactor definition exists/resolves successfully, persistently set the setting to `autobyteus-memory-compactor`.

If the setting already points to any user-selected agent, do not overwrite it.

If the default definition cannot be resolved because existing files are invalid, do not force-select it; leave the setting blank or unchanged and surface an actionable configuration error.

### 3. Keep the default compactor visible and use visible normal runs

Yes. The default compactor is visible in normal agent definition lists and editable through normal shared-agent update paths. Its executions are normal visible runs created through `AgentRunService.createAgentRun` and remain visible in run history.

This decision does **not** reintroduce hidden/internal child-run behavior.

### 4. Default launch config policy

The seeded default compactor must not assume Codex, LM Studio, Qwen, or any specific model/provider because runtime/model availability is node-specific.

The seed should use no environment-specific runtime/model, e.g. `defaultLaunchConfig: null` in `agent-config.json`. Users and E2E setup configure runtime/model on the default compactor through the normal agent editor/API.

If compaction is triggered while the selected compactor has no valid runtime/model, the parent run must fail compaction clearly with an actionable message such as “configure the compactor agent runtime/model.” It must not fall back to the parent model.

### 5. Codex-compactor E2E ownership

A real AutoByteus-parent + Codex-compactor scenario is required validation for this ticket, but it belongs to API/E2E validation after code review rather than implementation-scoped unit checks.

Required scenario intent:

1. Configure a normal AutoByteus parent agent/run using a local AutoByteus runtime/model such as LM Studio/Qwen.
2. Configure a very low effective context limit/compaction threshold so compaction is triggered deterministically.
3. Configure `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` to the selected/default compactor agent.
4. Configure that compactor agent's normal `defaultLaunchConfig` to use Codex runtime.
5. Start a real parent run and send enough content to trigger compaction.
6. Verify parent compaction status includes `compaction_run_id`.
7. Verify the compactor run is visible through normal run history/status and is inspectable.
8. Verify the parent continues only after compaction succeeds or reports a clear compaction failure.

If the required Codex runtime or local LM Studio/Qwen AutoByteus runtime is unavailable in the validation environment, the validation report must record an explicit environment blocker instead of claiming the scenario passed.

## Consequences For Implementation

- Add `DefaultCompactorAgentBootstrapper` under the server compaction capability area.
- Wire bootstrap during server startup before cache preloading/normal run use, or refresh the cache after seeding.
- Add template files or typed template constants for the default compactor.
- Add startup/bootstrap tests for seed creation, blank-setting default selection, user-selected setting preservation, visibility/listing, and edit preservation.
- Do not hardcode Codex or any model in the seeded default launch config.
- Keep using the revised visible normal run path for all compactor executions.
