# API-REV-005 — Team New-Workspace Registration Does Not Continue To Launch

## Classification

- Failure ID: `API-E2E-F-002`
- Scenario ID: `API-E2E-014`
- Result: `Fail`
- Preliminary origin: implementation source / frontend reactivity sequencing
- Current owner requested for confirmation: `/code_reviewer` focused failure-origin review
- Reviewed contract: `FR-003`, `FR-005`, `AC-001`, and UI/UX transition `Launch valid New -> Create/resolve workspace, then create Team` from the accepted latest-base ticket.

## Environment

- Integrated source HEAD: `5dc5105b14d5c215a70254ce317ad725d130f16e`
- Integrated merge: `bd4e2403fd6630622e7789967e2f2815cc6f37f5`
- Current macOS arm64 package: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- Browser surface: real current Nuxt renderer through AutoByteus `open_tab`, proxying the isolated packaged backend.
- Fixture: complete local `/Users/normy/autobyteus_org/autobyteus-private-agents` package, Team `nested-classroom-test`.
- Configuration before activation:
  - `/`: `codex_app_server` / `gpt-5.6-luna`, active `New`, path ending `workspaces/root-api-rev-005`.
  - `/StudentStudyGroup`: `autobyteus` / `deepseek-v4-flash`, active `New`, path ending `workspaces/students-api-rev-005`.
  - Both pending paths remained visible across later runtime/model/auto-approve edits; Run was enabled.

## Expected

One accepted `Run Team` activation must:

1. register/resolve each active New Team-scope workspace exactly once;
2. apply the canonical workspace identities to the draft; and
3. continue in the same activation to create exactly one TeamRun and open/select it.

The user must not need to click `Run Team` a second time after successful registration.

## Observed

### First activation

- The backend received two `create workspace metadata` mutations, one for `/` and one for `/StudentStudyGroup`.
- Both workspace IDs were created and the UI changed both selectors from New to canonical Existing selections.
- No TeamRun was created; the Team history index remained empty at that point.
- The configuration panel remained open and `Run Team` became enabled again.

### Second activation

- The already registered workspaces were reused.
- A single TeamRun was then created (`nested_classroom_test_team_11122136fdbb4ad48c3bb22c29360d65`, `createdAt` `2026-08-24T19:19:17.573Z`).
- Its V2 tree correctly stored root Codex/Luna and nested AutoByteus/DeepSeek, showing that configuration projection itself was correct; only automatic continuation after registration failed.

## Source Correlation

`RunConfigPanel.vue::handleRun` awaits `ensurePendingWorkspaceLoadedForRun()`, which invokes exact-address `teamRunConfigStore.setWorkspaceLoaded(...)`. It then immediately checks `teamLaunchReadiness.value.canLaunch`. The observed real-runtime ordering is consistent with that computed projection still reporting the pre-registration missing-workspace issue at the immediate check, causing `handleRun` to return; a later activation sees the recomputed ready state and launches. This is a preliminary source correlation for reviewer confirmation, not a final origin determination.

This correlation explains why the durable component test passed: its store mock updates the readiness object synchronously in the same call stack, masking the real computed-store scheduling boundary. No implementation source was changed during API-REV-005.

## Evidence

- First/second action ordering and workspace registration/reuse:
  - `api-rev-005-team-first-and-second-click-server-excerpt.txt`
- Team created only after the second activation:
  - `api-rev-005-launched-history-index.json`
  - `api-rev-005-team-history-after-terminate.json`
- Correct eventual V2 configuration:
  - `api-rev-005-launched-disk-v2.json`
- Rendered root/nested configuration before activation:
  - `api-rev-005-open-tab-root-nested-config.png`
- Direct source:
  - `autobyteus-web/components/workspace/config/RunConfigPanel.vue` (`ensurePendingWorkspaceLoadedForRun`, `handleRun`)

## Scope And Non-Findings

- Standalone Agent New-workspace handling did not reproduce this failure: one `Run Agent` activation advanced to the run surface; the first message created/started a real AutoByteus/DeepSeek run and returned exact `AGENT_RUN_OK`. The on-disk metadata retained the selected workspace, model, runtime, and auto-approve values.
- After correcting the test-harness prerequisite (creating the registered local workspace directories and supplying an absolute Codex command), an Existing-workspace retry of the same private nested Team successfully executed root Codex/Luna, nested AutoByteus/DeepSeek, ordinary Team messaging, formal delegation, exact submission, and accepted review. This confirms the provider/message/task/runtime path is sound and does not resolve the first-activation New-workspace defect.
- The initial Codex `ENOENT` was environment setup: the registered metadata path did not exist as a local directory, making it an invalid process `cwd`; it is not classified as a product failure in this round.
