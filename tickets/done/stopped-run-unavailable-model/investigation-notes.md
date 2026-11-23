# Investigation Notes

## Investigation Meta

- Package identifier: `stopped-run-unavailable-model`
- Request / ticket: Project Task `autobyteus-53` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model`
- Repository mode: `Git`
- Task worktree / branch: the same path / `codex/stopped-run-unavailable-model`
- Resolved base remote / branch / revision:
  - `origin` / `personal` / `ec3f721622`, fetched 2026-11-01.
  - The branch was first created on 2026-10-18 at `2f211340ee`, with no commits. On 2026-11-01, at the user's request, it was fast-forwarded 1876 commits to `ec3f721622` and the investigation was redone.
- Finalization target: `origin` / `personal`
- Bootstrap result: OK. Bootstrap blocker: none.
- Current solution revision ID: `SR-003`
- Authorities read (requirements gate, 2026-11-01): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (updated skill package), `SKILL.md`; repository `AGENTS.md` (incl. the new `RELEASE.md` pointer).
- Investigation status: requirements-level investigation complete. Architecture-level checks are listed under Notes For Architecture Design.

## Initial Request And Clarifications

- Original request:
  - Task autobyteus-53: a stopped run whose model is no longer offered can't be continued. The app says "No longer offered by … Choose another model before this run resumes.", but the chooser shows "No models available" and the server refuses every switch.
  - "FIRST REPRODUCE IT ON THE CURRENT origin/personal … If it is gone, report the evidence and the Task closes; if it exists, fix it."
- Clarifications: the user (2026-11-01): "The Origin Personal Branch has been updated quite a lot … make this branch on top of the Origin Personal Branch and redo investigation … I have a strong feeling maybe this is not needed anymore."
- Evidence attached to the Task:
  - OBS-001 in the remove-autobyteus-remote-provider API/E2E report;
  - a screenshot (the native run "Native Runtime Check", model `gpt-4o:autobyteus@remote-llm…`, "No longer offered by AutoByteus…");
  - the test review report (TR-001).

## Source Log

| Date | Type | Source / Command | Finding | How established |
| --- | --- | --- | --- | --- |
| 2026-11-01 | Command | `git log 2f211340ee..HEAD -- …/run-model-selection-service.ts …/native-model-capacity.ts` | Only one change since: `d81709f15e` (runtime switch, autobyteus-316). `unchanged` requires a non-null current id, and the capacity check is skipped when `currentModelIdentifier === null` (a fresh selection after a runtime switch) | Read |
| 2026-11-01 | Code | `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts` (`validateWithEvidence`, `optionsWithEvidence`) | For `AUTOBYTEUS` with a non-null current id: capacities come only from `catalog.offeredModels`. Options: current capacity null → `unavailableReason` "The current model's context capacity could not be verified…", `replacements: []`. Validate: "Both models need verified context capacities before replacement." External runtimes: all offered models except the current one are replacements; no capacity rule | Read + Reproduced |
| 2026-11-01 | Probe | `tickets/in-progress/stopped-run-unavailable-model/probes/autobyteus-53-repro.test.ts`, run with `pnpm exec vitest run <probe> --no-watch` from `autobyteus-server-ts` (temporarily copied under `tests/unit/llm-management/`, then moved back out) | On `ec3f721622` with the real `NativeModelCapacityService` and an LM Studio-style catalog (`qwen-removed` gone; `qwen-big` 131072 and `qwen-small` 32768 with live capacities): **native** options `{currentModel:null, replacements:[], unavailableReason:"The current model's context capacity could not be verified…"}`; validate → `invalid` "Both models need verified context capacities before replacement." **External control** (Codex): both offered and valid. **Native fresh selection** (`currentModelIdentifier: null`, as after a runtime switch): valid | **Reproduced** (service level; the UI symptom follows from the empty list, see the next row) |
| 2026-11-01 | Code | `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue:299-307, 370-395` (`lockedModelsFor`, `delegatedLockedModelsFor`, `modelUnavailable`) | The saved-run model menu, and the delegated-copy menu, list only `options.currentModel` + `options.replacements` from the server. A native run whose model is gone therefore gets an empty menu, and `modelUnavailable` shows the "No longer offered" note | Read |
| 2026-11-01 | Doc | `tickets/done/cross-runtime-resume/requirements-doc.md` (autobyteus-316, SR-004) | A stopped **standalone Agent** run can now switch to **another runtime** and a model of it; the pair is validated as a fresh selection (no capacity rule). Selecting the original runtime again is a model-only edit. Team members, Org members and delegated copies **keep their runtime locked** (out of scope there, FU-003) | Read |
| 2026-11-01 | Code | Callers of `validateMany` / `listOptions(Many)`: `studio-run-model-config-service.ts`, `agent-org-run-service.ts`, `agent-org-run-manager.ts`, `team-run-delegated-launch-plan.ts`, `agent-team-run-manager.ts`, `standalone-agent-run-root-manager.ts`, `delegated-launch-selection-command.ts`, `collaborator-launch-resolver.ts` | Every stopped-run surface (standalone, Team, Org, delegated copies and collaborators) and the collaborator launch resolver use this one service | Read |
| 2026-11-01 | Code | `autobyteus-ts/src/llm/lmstudio-provider.ts:61-120` | LM Studio supplies `max_context_length` (live) and loaded-instance `context_length`, so LM Studio models have **verified** capacities | Read |
| 2026-11-01 | Code | `autobyteus-ts/src/agent/token-budget.ts:94-111`; `agent/loop/llm-phase-compaction.ts:28-80`; `memory/llm-request-recovery.ts` | Native compaction budgets derive from the model's request capacity; the trigger is evaluated from the **observed prompt tokens of the previous response**. No explicit context-overflow recovery was found (grep for overflow / context_length_exceeded: none) | Read (unverified at run time) |
| 2026-11-01 | Code | `autobyteus-web/localization/messages/en/workspace.ts:22` | Help text "Choose a verified model with at least the saved model's context capacity." | Read |

## Relevant Existing Behavior And Supported Product Paths

| ID | Kind | Trigger | Current path / outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | A stopped native AutoByteus run (standalone, Team member, Org member, delegated copy/collaborator) whose model is no longer offered; the user opens Settings | "No longer offered" note; empty model menu; Save refused | Probe; OBS-001 desktop screenshot | Reproduced (service), Read (web) |
| BEH-002 | User | The same, but the current model is still offered and has no verified capacity | Same empty menu ("capacity could not be verified") | Code | Read |
| BEH-003 | User | A stopped standalone run switches to **another runtime** (autobyteus-316) | Fresh selection; capacity rule skipped; works | Probe (fresh selection valid); autobyteus-316 | Reproduced (service) |
| BEH-004 | User | An external-runtime run whose model is gone | All offered models listed; switch accepted | Probe control | Reproduced |
| BEH-005 | System | A native run where both models are verified and offered | Target must be ≥ current | Code | Read |

## Persisted Data And State Facts

- No persisted change is needed for the rule. Saved selections keep the existing write path (the model + model settings pair).

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution / Owner | Status |
| --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether a resumed native run whose stored conversation is larger than the replacement model's context recovers (compaction before or after an overflow) or fails on the first request | Measure in the design phase: a native-runtime experiment on isolated data (e.g. a long history resumed on a small-context LM Studio or fake model) | Open |
| RSK-001 | Risk | A smaller replacement fails on resume | REQ-005: a visible error, history intact, the user can pick another model | Accepted in requirements |

## Requirement Implications

- The bug still exists on current `origin/personal`. The runtime switch (autobyteus-316) gives standalone runs an escape (another runtime), but:
  - a standalone run cannot stay on AutoByteus with another model;
  - Team members, Org members and delegated copies/collaborators (runtime locked) cannot continue at all.
- The fix sits in one shared rule, the native replacement rule when the current model's capacity is unknown.

## Notes For Architecture Design

- Owner: `RunModelSelectionService` (`optionsWithEvidence`, `validateWithEvidence`); one rule serves options and validation.
- Measure UNK-001.
- Web copy `workspace.runModelConfig.nativeModelHelp` must reflect the rule.
- Keep the external-runtime and fresh-selection paths unchanged.

## Hand-over Proposal Findings (SR-002, 2026-11-02)

Base fast-forwarded to `origin/personal` @ `c952758a81` (107 commits). The probe was not rerun on it; `run-model-selection-service.ts` has no newer commit than `d81709f15e`.

| Source | Finding | How established |
| --- | --- | --- |
| `agent-execution/services/standalone-stopped-run-selection-updater.ts`, `stopped-run-selection-context.ts` | Model-only edit vs switch is decided only by `input.runtimeKind !== metadata.runtimeKind`; a switch validates as a fresh selection (no capacity rule) | Read |
| `standalone-agent-run-lifecycle-service.ts` `activateSwitched`; `agent-execution/domain/runtime-switch.ts` | Activation is binding-based: fresh session, marker, segment rotation, metadata commit. The marker label includes the model, so nothing in this path requires the runtimes to differ | Read; a same-runtime switch has not been run |
| `tickets/done/cross-runtime-resume/run-runtime-switch-contract.md` 3.5 | A native activation on a folder with `working_context_snapshot.json` starts a fresh working context, so a same-runtime hand-over would not load the oversized context | Read (contract) |
| `standalone-agent-run-eligibility.ts` `canSwitchRuntime`; `cross-runtime-resume/follow-ups.md` FU-003 | Team members, Org members and delegated copies still cannot switch; FU-003 has not landed | Read |
| Commit `5dd930d8be` ("remove collaborators") | Collaborators may no longer exist as a surface; `requirements-doc.md` still lists them. Correct when requirements are rewritten | Read (commit title only) |

Consequences: UNK-001 applies only to runs that continue directly on a model of unknown fit. To check in design: the hand-over reads journals with the agent's tools, so an agent with no file or shell tool may not be able to read them.

## Re-check on the Newer Base (SR-003, 2026-11-07)

- Base fast-forwarded to `origin/personal` @ `677f61de0b` at the user's request ("analyze whether this ticket is still needed … we support switching the runtime for … agent team and organization as well, for … delegated copies as well").
- Authorities re-read 2026-11-07: updated `SKILL.md`, `references/ticket-scope.md`, `references/project-documents.md`.

| Source | Finding | How established |
| --- | --- | --- |
| `git log` (merge `046f089f2b`, 2026-11-02, autobyteus-348 runtime-switch-members; `3b4f10435a`) | The runtime switch now covers **Team members, Org members and delegated copies** (cross-runtime-resume FU-003 delivered). The user's premise is correct | Read |
| `run-model-selection-service.ts` (`validateWithEvidence`, `optionsWithEvidence`) | The native capacity rule and options are unchanged (only a DeepSeek-harness diagnostic was added) | Read |
| `agent-execution/services/stopped-run-selection-context.ts` | Shared by the standalone updater, the root manager, Team/Org saves and delegated-copy saves (autobyteus-348). The current model is kept as "current" when the **selected runtime equals the run's runtime** and no switch is pending, so a same-runtime model change still runs the capacity rule; only another runtime is a fresh selection | Read |
| The probe, rerun (copied into `tests/unit/llm-management/`, run, removed) | Same result on `677f61de0b`: native options `replacements: []` ("context capacity could not be verified"); validate `invalid` ("Both models need verified context capacities…"); external control valid; native fresh selection valid | **Reproduced** |
| `cross-runtime-resume/requirements-doc.md` REQ-001 | "Selecting the original runtime again before the next message undoes the pending switch", so a round trip back to AutoByteus in one save does not escape. Escaping needs a second runtime, a first message there, a stop, and a switch back | Read |

**Conclusion:**
- Every surface (standalone, Team, Org, delegated copies) can now continue a run whose native model is gone by switching to **another installed runtime**, which is a hand-over by journal.
- It still **cannot stay on AutoByteus with another model**: same empty menu, same refusal. A user with only AutoByteus and local models has no way out.
- The ticket is still needed for that case.
- DEC-004 (members and copies cannot hand over) is now moot: the user's SR-002 hand-over idea can apply uniformly.

## Base Refresh (2026-11-10)

- At the user's request ("make your branch based on the latest origin personal branch"), the branch was fast-forwarded 307 commits from `677f61de0b` to `origin/personal` @ `310fc27452` (2026-11-09). The branch has no commits of its own; the ticket folder is untracked.
- `git log 677f61de0b..HEAD` over `run-model-selection-service.ts`, `native-model-capacity.ts`, `stopped-run-selection-context.ts` and `ExistingRunConfigEditor.vue` shows no changes, so the SR-003 findings stand (Read; the probe was not rerun).
- New related ticket `tickets/done/switch-back-eexist` (autobyteus-440): it fixes switching back to Antigravity (an EEXIST on `agy-project`) and does not touch the native same-runtime model trap (Read).

## SR-004 — Re-check on `origin/personal` @ `8430d9ef12` (2026-11-19)

The user asked for another round after a large update (1436 commits since `310fc27452`). The branch was fast-forwarded; it has no commits of its own.

- **Probe** (updated for the new constructor, which now takes an on-demand model loader as its second argument): all 3 cases pass, so the bug still reproduces.
  - Native run, model gone: `currentModel: null`, `replacements: []`, "The current model's context capacity could not be verified…". Saving qwen-big is refused with "Both models need verified context capacities before replacement."
  - Control, external runtime: both models offered and accepted.
  - Native fresh selection after a runtime switch: accepted.
- **Unchanged:** the native capacity rule in `RunModelSelectionService.validateWithEvidence` / `optionsWithEvidence`, and `selectionContextFor` (the current model is kept while the runtime is unchanged).
- **New since the last round, and relevant:**
  - autobyteus-500 G-5 (`8e2d3b76c0`, `7eb78a701b`, `d8ffc77c8b`): `storedModelOffer`. A run whose saved model is not offered is now refused at start (`RUN_MODEL_NOT_OFFERED`: "…Stop it, then choose a runtime and model for {Agent} in Settings."), and Settings shows a per-member note (`modelUnavailable`, REQ-016 there). The problem is now reported clearly. On AutoByteus, though, the menu the note points to is still empty.
  - autobyteus-9 (`modelListReadable`): a list that can't be read no longer empties the menu. It doesn't touch this case, where the list was read and the model is absent.
  - Web: `lockedModelsFor` / `delegatedLockedModelsFor` still list `currentModel + replacements`, so the menu is empty here.
- **Escape that exists:** choose another runtime (autobyteus-316/348, every surface). **Missing:** staying on AutoByteus with another model. That is the main case for a removed LM Studio model when the user has no other runtime.
- **Conclusion:** the ticket is still needed. G-5's own refusal text ("choose a runtime and model") now promises something the native menu can't deliver.

## SR-005: Architecture investigation for the hand-over rule (2026-11-19, base `8430d9ef12`)

The user's go (2026-11-19): smaller or unknown context → a fresh session that continues from the journal; equal or bigger → the same session. All paths below are under `autobyteus-server-ts/src/` unless noted.

| ID | Source | Observation | Supports |
| --- | --- | --- | --- |
| A-01 | `run-history/domain/runtime-selection-rule.ts:41-82` (`applyRuntimeSelection`) | The one rule for every record with a binding. A pending switch plus the previous runtime means undo (l.48); the same runtime means a model-only edit (l.58); another runtime means a switch with `platformAgentRunId: null` and `pendingRuntimeSwitch` (first previous binding kept). Used by standalone metadata (`run-history/services/agent-run-runtime-switch-commit.ts:15-40`), Team members (`agent-team-execution/services/team-run-selection-mutator.ts:77`) and Org members (`agent-org-execution/services/agent-org-run-config-mutator.ts:107`), all through `applySelectionToConfiguredMember` (l.132) or `buildRuntimeSwitchMetadata` | The decision "same session or hand-over" belongs in this rule; today it is decided by the runtime alone |
| A-02 | `agent-execution/services/stopped-run-selection-context.ts:13-27` | `currentModelIdentifier` is the stored model only when the selection's runtime is the stored runtime and nothing is pending; otherwise `null` (a fresh selection, the capacity rule skipped) | The reference must become "the model the session last ran on" (`pendingRuntimeSwitch.from` when pending) |
| A-03 | `llm-management/services/run-model-selection-service.ts:110-128` (validate), `:161-186` (options) | The native capacity rule refuses unknown or smaller targets (l.120-125); options list nothing when the current capacity is unknown (l.180) and only ≥ models otherwise | The selection service owns the capacity evidence, so it decides the continuation |
| A-04 | Validation callers: `agent-execution/services/standalone-stopped-run-selection-updater.ts:135-151` (standalone and delegated copies), `agent-team-execution/services/team-run-delegated-launch-plan.ts:33-60` (stopped Team runs and delegated Team copies), `agent-org-execution/services/agent-org-run-manager.ts:284-310` (Org) | Each merges `validation.selection` into the patch that reaches the rule (A-01) | The continuation can travel with the selection to the rule; three call sites |
| A-05 | Options callers: `run-history/services/studio-run-model-config-service.ts:68-88` (agent, Team), `agent-org-execution/services/agent-org-run-service.ts:83-94` (Org) | They pass runtime, saved model and workspace only | Options need the same hand-over capability as validation |
| A-06 | `agent-execution/services/standalone-agent-run-eligibility.ts:15-16` (`canSwitchRuntime`) | A standalone run can switch when it is started, not application/system-owned and not peer-started; the updater refuses runtime changes otherwise (`standalone-stopped-run-selection-updater.ts:126-134`) | DEC-006: the same boundary decides whether a model hand-over is available |
| A-07 | `agent-execution/services/standalone-agent-run-lifecycle-service.ts:226, 262-298` | Activation branches on `pendingRuntimeSwitch` only (not on a runtime difference): a new session (`kind: "new"`), `memory.record` (archive and marker), commit and publish | A same-runtime pending switch activates through the same path with no change |
| A-08 | `agent-collaboration/execution/backends/configured-agent-activation-planner.ts:56, 95-99` | Members and copies: a pending switch means `beginSwitch` → `kind: "new"`, runtime-agnostic | The same for members |
| A-09 | `agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:163-165, 185-233`; `autobyteus-ts/src/agent/factory/agent-factory.ts:152-181` | A native `new` activation calls `createAgentWithId`, which builds the runtime without `restoreOptions`; only `restoreAgent` bootstraps the working-context snapshot | A native fresh session in the same run folder starts without the old conversation (feasibility of REQ-003) |
| A-10 | `agent-memory/services/runtime-switch-recorder.ts:23-40`; `autobyteus-ts/src/memory/store/run-memory-file-store.ts:276-322` | The archive needs only the switch key, the watermark and `previousRuntimeKind` (same runtime is fine) | No memory change |
| A-11 | `runtime-handover-notices/services/runtime-handover-notice-service.ts:44-80`, `…-builder.ts:28-47` | The notice is derived from the marker in the raw traces, for any run; its text names no runtime or model | Notice reused unchanged |
| A-12 | `agent-execution/domain/runtime-switch.ts:48` | Marker text "Agent runtime changed from {Runtime} ({model}) to {Runtime} ({model})." | DEC-008: a same-runtime text |
| A-13 | `tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` RS-01, RS-02, RS-08 (l.690-712) | Native as a switch target is proven with a fake LM Studio endpoint; RS-08 pins "a model edit while a switch to native is pending keeps the switch" | Feasibility; preserved behavior (AC-007); the E2E harness for AC-002 |
| A-14 | `run-history/store/agent-run-pending-runtime-switch.ts:10-30` | The parser doesn't require the two runtimes to differ | Persisted data directly usable |
| A-15 | `agent-team-execution/services/team-run-selection-mutator.ts:46-49, 85-109`; `agent-org-execution/services/agent-org-run-config-mutator.ts:49-63` | Team default (`/`), Org default (`/`) and an Org's team defaults are launch defaults with no session; a default change never goes through the rule | DEC-007: `no_session` |
| A-16 | Tests that pin the old rule: `tests/unit/llm-management/run-model-selection-service.test.ts:71-130`; `autobyteus-web/services/runConfigEditing/__tests__/existingRunModelOptionsState.spec.ts:22-26` (the capacity note as data); `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts:20` | To rewrite (REQ-008) | Change inventory |
| A-17 | `GLOSSARY.md:392-404` | "Agent runtime switch", "Pending agent runtime switch", "Hand-over notice", "Switch marker" | The glossary entries grow by the same-runtime case (Principle 15) |

## SR-006: Review round ARCH-REV-001 and base refresh (2026-11-23, base `1f761bc8db`)

- Fast-forwarded 757 commits to `1f761bc8db`. The probe still reproduces (3/3 pass, native refused and empty).
- Context builders (`git grep` of `validate(`, `validateMany(`, `listOptions(`, `listOptionsMany(`, `selectionContextFor(`):
  - saves: `standalone-stopped-run-selection-updater.ts:136`, `team-run-delegated-launch-plan.ts:35`, `agent-org-run-manager.ts:245/247`;
  - options: `studio-run-model-config-service.ts:70, 84`, `agent-org-run-service.ts:87`;
  - launch validators (AR-002): `agent-org-run-service.ts:157`, `launch-preferences/launch-usability-check.ts:158`, `model-routing/model-routing-settings.ts:137` (which uses this service's validator).
- autobyteus-599:
  - `runtime-switch.ts:59` `buildSessionRenewal`, a same-runtime fresh session; the switch text is at `:50`;
  - the shared fresh-session step is `standalone-agent-run-lifecycle-service.ts:269, 282` and `configured-agent-activation-planner.ts:98, 117, 127`;
  - glossary `:435-468`.
- Read-only scan of `~/.autobyteus/server-data` (python, no writes): 3 files hold `pendingRuntimeSwitch`, all under `memory/imports/docker-node-1/agent_teams/*/team_run_execution_tree.json`. Two are same-runtime (`claude_agent_sdk`/`sonnet` and `opus`, session `null`); one is `autobyteus` → `antigravity_cli`. The same-runtime state already exists in stored data.
