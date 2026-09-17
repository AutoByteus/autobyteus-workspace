# F-001 — Plus discards existing Org run configuration
Actual browser failure, 2026-09-17; API-REV-001 / B03 / SCN-002 / AC-004 / REQ-005.

## Expected authority
User explicitly clarified during this validation: Settings edits the existing stopped run; Plus starts a NEW Team/Org run **taking the existing one as the configuration**, allowing adjustments before creation. User then directed continuation and exact failure recording. Existing written REQ-005/AC-004 merely says ordinary new Org configuration. DS-004 and design lines99/139 preserve a definition-only route, leaving source-run configuration inheritance unspecified. Do not misrepresent the clarification as already covered by the narrower source gate.

## Exact synthetic source
Root config_lab_55cf971aeb934826aedbc1a7983e7ecc, definition config-lab. Native AutoByteus. Root default gpt-5.4-mini/null; direct /guide saved gpt-5.4/reasoning_effort=medium; mounted /squad/lead saved gpt-5.4/reasoning_effort=low. Whole root stopped; history, identities and synthetic attachment present. Source tree in f001-source-tree.json. Both root defaults and member overrides have nonempty model values: blank new draft is wrong under either interpretation, without inventing the eventual flatten/override representation.

## Actual UI steps
1. Owned app http://127.0.0.1:51083; reopen stopped /guide from sidebar.
2. Actual header gear → Settings: gpt-5.4, medium observed. Back to conversation.
3. Actual header Plus (localized New Agent) → new Org form.
4. Observe default model `Select a model`, Run disabled with /guide model not ready.
5. Expand Member Overrides then Config Guide: runtime/model Global Default, no inherited direct model/parameters.
6. Reopen stopped /squad/lead and click actual Plus. Same blank model, disabled Run.
No direct API command, fabricated response or replay substitutes used. Fault control={} throughout reproduction. Prior Claude catalog exploration discarded by normal Plus navigation; fresh direct and mounted reproductions both reset to AutoByteus.

## Evidence
f001-direct-source-settings.txt; f001-direct-plus-empty-draft.txt; f001-mounted-plus-empty-draft.txt; f001-source-tree.json; f001-preservation.json. AX evidence limited to test application, unrelated browser tabs excluded.

## Observed bounds
Old root remains stopped; one root only; four total actual native inference requests, none from Plus. The earlier B03 partial Pass is superseded for Plus. Settings Save/reopen/continuation and controlled response-loss checks remain valid supporting successes, NOT overall acceptance.

## Preliminary origin
Requirement Gap / Design Impact, accountable Code Reviewer to confirm. Existing AgentOrgWorkspaceView.openNewOrgRun (lines115–125) forwards only definitionId into configuration route, not source root/configuration. AgentOrgRunConfigPanel.initializeDraft calls begin from definition.defaultLaunchConfig; begin clears member overrides. Standalone Team source comparison (NOT live Team certification): createNewTeamRun uses buildEditableTeamRunSeed(source.view.getConfigurationView()). Existing Org route-only tests do not prove inheritance.
No production/test fix attempted. Revise authoritative requirement/design before extending seed ownership semantics; do not silently clone conversation/history or reuse runtime IDs in a new run.
