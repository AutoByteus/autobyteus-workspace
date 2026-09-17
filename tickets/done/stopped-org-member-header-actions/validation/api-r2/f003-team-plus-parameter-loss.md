# F-003 — Standalone Team Plus loses just-saved model parameters

Ticket ORG-STOPPED-CONFIG-20260917-001; API-REV-002; B04 / SCN-004 / AC-006 / REQ-006 preservation control. Actual failure, origin **Unclear** pending focused Code Reviewer assessment. Not a proven new regression or authorization for a Team redesign.

## Actual frontend reproduction
Owned real backend51081 → transparent observer51082 → Nuxt51083, real Chrome native UI. Synthetic Team Control (control-team), AutoByteus / gpt-5.4-mini, manual tool policy.
1. Catalog Run, choose mini, Run Team, ordinary Send `Reply exactly TEAM-CONTROL-917. Do not call tools.` Real provider response renders TEAM-CONTROL-917.
2. UI Stop, actual header Settings, choose reasoning_effort low, explicit Save. Success message shown; transport request670 UpdateStoppedTeamRunModelConfigs patches CONFIGURED_TEAM / and CONFIGURED_AGENT /lead to low. Backend response succeeds.
3. Back shows retained history. Actual header Plus, expand advanced root and member controls. Both display none, not saved low. No model/runtime edit was performed in the new draft.
4. Ordinary Run Team; real Create request747 sends llmConfig:null for root and member. Newly allocated Team tree persists null. This is not merely a display/default ambiguity.
5. Stop new Team, reselect original, Settings: low still displayed, Save disabled unchanged. Original canonical tree remains low; no source data loss.

## Identity/evidence
Original Team team_control_ef5f8cb76cf74bd680919d02e743811a; member control_worker_76fc3c6f4bce461d93b3d1972d7ef7fc. New Team team_control_f2c734aa0b4e42afa48d4e4848b84ea1.
- team-plus-observed-none.txt: actual new draft root and leaf none.
- team-source-reopened-low.txt: original reopened Settings low.
- f003-team-transport.json: observed actual UI requests/responses602/670/747; no direct API mutation probe.
- team_control_ef5f8cb76cf74bd680919d02e743811a-tree.json: source root/member low.
- team_control_f2c734aa0b4e42afa48d4e4848b84ea1-tree.json: new root/member null.
- provider-metadata.jsonl / backend.log: native control completion and lifecycle, not mock transport.

## Origin limits / requested review
Expected inherited configuration semantics follow the user's explicit Team/Org Plus explanation and standalone preservation requirement. Org direct and mounted Plus now both succeed; standalone Agent Save→Plus also preserves low. Team failure does not imply Org seed failure.
Read-only trace: TeamWorkspaceView.createNewTeamRun calls buildEditableTeamRunSeed(source.view.getConfigurationView()), then teamRunConfig.setConfig. Those three owner files are byte-identical to HEAD (f003-owner-source-comparison.json). Shared RuntimeModelConfigFields/MemberOverrideItem changed this ticket; unchanged owners alone do not establish baseline behavior or root cause. No original-HEAD live control or source-state injection was performed. Do not assert which publication/hydration/field boundary loses low without a focused probe. Reviewer should decide pre-existing vs changed-boundary regression, scope disposition and owner before any fix. API has not edited source/tests.

Task historical read-only control and additional live genuine-invalid-model negative case remain incomplete, deferred after this reproducible failure. All owned roots stopped; tab/services cleaned; source34/authored14/original Org runtime8 hashes unchanged. No user data or process affected.
