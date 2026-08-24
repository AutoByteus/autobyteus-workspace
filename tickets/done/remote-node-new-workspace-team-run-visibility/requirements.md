# Remote-Node New-Workspace Team-Run Visibility Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — root cause reproduced and requirements basis approved by the user on 2026-08-24.

## Goal / Problem Statement

Ensure the workspace mode and path visibly selected in the Team run form are the workspace values actually used by `Run Team`. Choosing `New` and entering a valid remote-node path must not silently revert internally to the previously selected Temp/Existing workspace when the user later changes runtime, model, thinking, auto-approve, or member settings.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | `WorkspaceSelector` owns visible local `mode`/path, while `RunConfigPanel` separately owns `pendingWorkspaceInput`. Any immutable Team config edit triggers a broad parent watcher that resets only the parent state to `{ mode: 'existing', pendingPath: '' }`; the child can continue showing `New` and the entered path. | The visible workspace state and launch workspace state cannot diverge. Unrelated Team configuration edits preserve the selected workspace mode/path. | Existing immutable Team config editing remains supported. | FR-001, FR-002, FR-003; AC-001, AC-002, AC-005 |
| BEH-002 | When the hidden parent state has reverted, `Run Team` skips `createWorkspace` and launches the Team with the draft's previous workspace, normally Temp Workspace. The requested workspace never appears because no registration request is made. | A launch visibly configured with `New` must register/resolve that path first and launch exactly one Team under its canonical workspace. It must never silently fall back to Temp/Existing. | Explicitly selecting `Existing` or Temp Workspace continues to launch there. | FR-003, FR-004, FR-005; AC-001, AC-003, AC-004 |
| BEH-003 | If runtime/model/settings are chosen first and `New` path is entered last, the current flow succeeds. The source-browser control run registered the path and revealed the Team correctly. | Successful current ordering remains successful, while configuration order no longer changes the result. | Remote server remains authoritative for its filesystem path; an existing directory is valid `New` registration input. | FR-002, FR-003, FR-006; AC-001, AC-002, AC-006 |
| BEH-004 | Resetting the complete pending workspace state is currently coupled to every effective agent/team config object replacement instead of actual draft/selection identity changes. | Pending workspace input resets only for a real context transition—such as opening a different draft/selected run—or an explicit user workspace-mode change, not for edits within the same draft. | Completed-run selection and read-only configuration behavior remain unchanged. | FR-001, FR-004; AC-002, AC-003, AC-005 |

## Investigation Findings

- The user's newest Electron attempt is confirmed in `8006` logs at `2026-08-24T07:36:50Z`: there is no workspace-create mutation, and the backend logs `Resolved configured temp workspace root to TempWorkspace` before creating TeamRun `software_engineering_team_f7589167f330406383ba79a7a2404d58`.
- The server registry still contains the requested workspace only because the separate source-browser control run registered it. The user's newest TeamRun is stored under `/home/autobyteus/workspace`, not `/home/autobyteus/workspace/autobyteus-workspace`.
- The failure is now reproducible in browser-equivalent UI: select runtime/model, choose `New`, enter the path, then change `Auto approve tools`. The UI still shows `New` and the path, but clicking `Run Team` makes no workspace-create request and creates TeamRun `software_engineering_team_3727756fc425443e8c3922038c64b0d6` under Temp Workspace.
- Control experiment: when all other Team settings are changed before selecting `New` and entering the path, the workspace-create request occurs and TeamRun `software_engineering_team_55738d16ba3b40c1877e230df167b592` appears under the requested workspace.
- Exact source cause: `RunConfigPanel.vue:404-413` watches the entire effective config objects and resets parent `pendingWorkspaceInput`; `WorkspaceSelector.vue:363` independently watches/emits its local `mode` and `tempPath`, so it does not visually reflect the parent-only reset.

Detailed evidence is in [investigation-notes.md](./investigation-notes.md). Intended UI/state behavior is in [ui-ux-spec.md](./ui-ux-spec.md).

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Status | Approval Applicability |
| --- | --- | --- | --- |
| [ui-ux-spec.md](./ui-ux-spec.md) | Defines the authoritative workspace-input state, preserved edits, allowed resets, launch behavior, and preserved interaction/accessibility semantics. | `Approved` | Approved with this requirements document on 2026-08-24. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Duplicated Policy Or Coordination` (primary), with a `Local Implementation Defect` in the overly broad reset watcher.
- Refactor posture: `Likely Needed`, narrowly bounded to ownership/synchronization of pending workspace input for the run form.
- Evidence basis: Two independent representations govern one user-visible workspace choice. A config-object identity watcher mutates only one representation, producing a split-brain UI/launch state and an order-dependent result.
- Requirement or scope impact: Establish one authoritative pending workspace value or an explicit controlled contract. Do not redesign workspace persistence, Team execution, history, or the left tree.

## Recommendations

- Make pending workspace mode/path a single authoritative state for both rendering and launch, or make `WorkspaceSelector` a controlled component whose rendered state follows the parent's authoritative value.
- Reset pending workspace state only when draft/selection identity actually changes.
- Add ordering regressions that mutate each relevant Team setting after a `New` path is entered.
- Keep broader launch-error/result hardening as a separate non-blocking follow-up; it is not necessary to correct this reproduced defect.

## Scope Classification (`Small`/`Medium`/`Large`)

`Small`: the root cause and correction are localized to frontend run-form workspace-state ownership plus focused regression coverage. Backend and persistence changes are not required.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Enter a remote-node `New` workspace path, then edit any Team configuration field, then launch.
- `UC-002`: Enter the `New` path last and launch.
- `UC-003`: Explicitly switch from `New` to `Existing`/Temp and launch.
- `UC-004`: Move between drafts or selected runs and receive an intentional workspace-input reset/rehydration.

### Out of Scope

- Backend workspace, TeamRun, history, or Docker changes.
- General left-tree redesign or a new optimistic run registry.
- Model execution and Team behavior after creation.
- Broad launch error/reconciliation redesign unrelated to the reproduced workspace-state divergence.
- Changing `New` into directory creation or renaming the mode.

### Preserved Behavior Boundary

- Local and remote nodes keep the same server-authoritative path semantics.
- `Existing`, Temp Workspace, standalone-agent, selected-run/read-only, and successful Team launch flows retain their behavior.
- Workspace registry and run-history records remain directly usable without migration.
- Explicit workspace removal remains separate and does not delete files, memories, or history.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- New product behavior, migration, security policy, or broader orchestration changes are `Requirement Gap` findings and require renewed user approval.
- Adjacent concerns may be recorded non-blockingly but cannot expand implementation scope automatically.

## Functional Requirements

- `FR-001` — Authoritative state: the Team run form must have one authoritative pending workspace selection containing both mode (`existing` or `new`) and its corresponding workspace ID/path, and the UI and launch handler must read that same state.
- `FR-002` — Preserve across edits: after the user chooses `New` and enters a path, changes to runtime, model, thinking/configuration values, reasoning effort, fast mode, global auto-approve, member overrides, or panel expansion must preserve the pending workspace mode/path.
- `FR-003` — Launch what is shown: if the form visibly shows `New` with a non-empty path when `Run Team` is activated, the app must create/resolve that workspace registration and apply its canonical identity to the Team draft before creating the Team. Hidden fallback to another workspace is prohibited.
- `FR-004` — Intentional transitions only: pending workspace selection may change when the user explicitly chooses another workspace mode/value, when a genuinely different draft/selected run becomes active, or when successful workspace resolution replaces the pending path with its canonical registered identity. Unrelated config object replacement is not a reset trigger.
- `FR-005` — Single launch: the corrected flow must create at most one workspace registration request and one TeamRun for one accepted activation, and reveal/select the created Team under the canonical workspace.
- `FR-006` — Bound-node authority: the current window's bound server interprets/canonicalizes the absolute path; the desktop host must not validate or rewrite the Docker-local path.
- `FR-007` — No silent mismatch: if visible workspace state cannot be resolved into a valid launch value, block launch with the existing workspace validation/error surface rather than using a hidden prior workspace.

## Acceptance Criteria

- `AC-001` — Given a window bound to `http://localhost:8006`, Software Engineering Team, Codex App Server, GPT-5.6-Sol, `New`, and `/home/autobyteus/workspace/autobyteus-workspace`, changing `Auto approve tools` after entering the path and then clicking `Run Team` sends `CreateWorkspace` for that path and creates exactly one TeamRun whose workspace root is that path.
- `AC-002` — The outcome in `AC-001` is unchanged when each of runtime, model, thinking/config values, reasoning effort, fast mode, global auto-approve, or a member override is edited after the `New` path is entered.
- `AC-003` — While those edits occur, the form continues to show `New` and the exact path, and launch state remains the same. Explicitly choosing `Existing` and Temp Workspace changes both visible and launch state to Temp.
- `AC-004` — No regression test ordering produces a TeamRun under Temp Workspace while the form visibly shows `New` with the requested path.
- `AC-005` — Switching to a different draft/selected run resets or rehydrates workspace input according to that new context without carrying the prior draft's pending path.
- `AC-006` — The control ordering—choose all other settings first, then enter `New` path—continues to register/reveal one workspace and one Team row, and the row remains after history refresh/reload.
- `AC-007` — Invalid/empty `New` path remains blocked with an actionable workspace error and never falls back to the prior workspace.
- `AC-008` — Existing local-node, `Existing`, Temp Workspace, standalone-agent, read-only selected-run, and explicit workspace-removal coverage remains valid.
- `AC-009` — State and validation meet [ui-ux-spec.md](./ui-ux-spec.md), including keyboard mode changes, authoritative `aria-selected`, stable input value, disabled/pending behavior, and visible workspace errors.

## Constraints / Dependencies

- `WorkspaceSelector` currently owns local `mode` and `tempPath`; `RunConfigPanel` separately owns `pendingWorkspaceInput`.
- Team configs are intentionally immutable and are replaced for each edit, so object identity cannot serve as draft identity.
- Stable Team draft identity already exists as `selectedDraftId`/`draftId` and can distinguish context changes from within-draft edits.
- Backend contracts and the unified live/history navigation projection already behave correctly when given the intended workspace identity.

## Persisted Data Outcome (When Applicable)

- Stored subject/location: bound-node workspace registry and TeamRun history.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve: all workspace registrations, TeamRun IDs, histories, memories, and root-path associations.
- Unacceptable loss/corruption: deleting records, moving an existing run between workspaces, or mixing node state.
- Operational constraints: none; frontend correction only.
- Related IDs: FR-003, FR-005, FR-006; AC-001, AC-004, AC-006, AC-008.

## Assumptions

- The controlled source-browser sequence establishes one deterministic trigger for the same backend outcome observed in Electron; the Electron event ordering itself was not independently instrumented.
- The same Vue components/stores are used by packaged Electron and the source-browser renderer.
- Stable draft/selection identity is available without introducing persistence.

## Risks / Open Questions

- Regression coverage should include all config-edit emitters because any one currently replaces the immutable config object and triggers the broad watcher.
- Agent-run configuration uses the same outer watcher and must be checked for the same state divergence even though the report concerns Team runs; preserved behavior is authoritative, not automatic scope expansion unless the same local correction applies safely.
- Secondary unhandled launch-error behavior remains a non-blocking follow-up candidate, not part of this root-cause fix.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 |
| --- | --- | --- | --- | --- |
| FR-001 | Yes | Yes | Yes | Yes |
| FR-002 | Yes |  |  |  |
| FR-003 | Yes | Yes |  |  |
| FR-004 | Yes |  | Yes | Yes |
| FR-005 | Yes | Yes | Yes |  |
| FR-006 | Yes | Yes | Yes |  |
| FR-007 | Yes | Yes | Yes |  |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Exact reproduced ordering with auto-approve after path. |
| AC-002 | Full set of within-draft config-edit ordering variants. |
| AC-003 | Visible state and launch state synchronization plus explicit switch. |
| AC-004 | Negative invariant: no hidden Temp fallback. |
| AC-005 | Legitimate draft/selection identity transition. |
| AC-006 | Previously successful control ordering and durable tree visibility. |
| AC-007 | Invalid New input remains blocked. |
| AC-008 | Adjacent behavior preservation. |
| AC-009 | UI/accessibility conformance. |

## Approval Status

Approved by the user on 2026-08-24 after the deterministic reproduction and root-cause explanation: “since you found the problem ... go ahead and work on it.” Approval covers this requirements document and [ui-ux-spec.md](./ui-ux-spec.md).
