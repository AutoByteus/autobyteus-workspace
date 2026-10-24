# Handoff Summary: org-settings-save-stale-reread (autobyteus-265)

- Current status: verified from the evidence (the user directed this on 2026-10-24 in place of the AC-005 hands-on check), archived and finalized on `personal`. No release.
- Classification: `task_size=Small`, `architectural_risk=Low`, route Direct Low-Risk. Architecture review, code review and test-code review: `N/A — not applicable`.
- Revisions: SR-001 / IR-001 / API-REV-001 / DR-001 (verification hold) / DR-002 (finalization).
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread`, branch `fix/org-settings-save-stale-reread`. The final repository state is recorded in `release-deployment-report.md`.
- Finalization target: `origin/personal` (RELEASE.md).

## What Changed

- Problem: in a running Org, after a stopped delegated copy's model was saved in Settings, about 1 Save in 3 showed "Settings were saved, but could not be refreshed. Refresh before making more changes." and kept the old model until Refresh.
- Cause: `agentOrgContextsStore.readRunConfig` treated the Org view's own checkpointed reload (the designed answer to `delegated_launch_selections_changed`) as a stale target.
- Fix (`29b51ebcef`): `readRunConfig` reads again, up to 3 attempts, when only the same Org's view/context was refreshed during the read. It still refuses with the existing error when the target changed (context released, node binding changed, Org operation or inspection pending). The signature, the callers, the stream and the server are unchanged.
- Tests: new `autobyteus-web/stores/__tests__/agentOrgRunConfigRead.spec.ts` (7 cases; 4 fail on base).
- Docs: `autobyteus-web/docs/settings.md` "Save recovery" sentence.

## Integration

- Method: merge. `origin/personal` @ `5f085effbc` (autobyteus-290 node vocabulary, autobyteus-253 test hygiene, beta.4/beta.5 bumps) merged into the ticket branch as `57efcdeeaf`, with no conflicts. Neither the base nor the merge changed `agentOrgContextsStore.ts` or the new spec.
- Post-integration check DEL-01: `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/agentOrg stores/__tests__/existingRunConfig stores/__tests__/delegatedLaunchDraftStore.spec.ts stores/__tests__/nativeOrgCompactionTermination.spec.ts stores/__tests__/retainedOrgActivityTermination.spec.ts stores/__tests__/windowNodeContextStore.spec.ts services/agentOrgExecution components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts components/workspace/org/__tests__/AgentOrgWorkspaceConfigBoundary.spec.ts components/workspace/config --run` → `Test Files 34 passed (34)`, `Tests 369 passed (369)`, including the 7 new cases (`evidence/DEL-01-integrated-unit-org-settings-suites.log`). This is IMP-02's set plus `windowNodeContextStore.spec.ts`, because the base changed node-context code.
- `scripts/check_repository_artifact_hygiene.py` and `scripts/check_licensing.py` pass on `57efcdeeaf`.

## Verification From Evidence

- AC-001: proven. API-06 shows 12 of 12 Org-root Saves ending `Saved.` with the saved model, and the totals line `saved_shown=12 could_not_be_refreshed_outcomes=0`. In API-05, one Save met the race (2 `AgentOrgRunConfig` reads, then `Saved.`); screenshot checked. The API-07 base calibration shows the same loop failing 2 of 12, with a screenshot of the message.
- AC-002/AC-003: proven. IMP-01 passes 7/7, and IMP-00 fails 4/7 on the base store. DEL-01 reran them on the integrated state.
- AC-004: proven. IMP-02 passed 359 tests; API-05 shows `Summary: 8 Pass, 0 Fail` and `browserErrors: []`. BEH-002: `reload_after_save=12`. DEL-01 (369 tests) on the integrated state.
- AC-005: the requirements defined it as the user's own check. On 2026-10-24 the user directed: "If you have enough evidences, then follow your skill … if you have enough evidences, follow the skill to how to handle them." The skill says that a change proven by evidence needs no repeat check by the user. AC-005 is the same journey as AC-001, which ran 14 times on a worktree build (real backend, Nuxt, Chrome) and is proven. So AC-005 is closed by verification from the evidence. No hands-on user check is claimed.
- API/E2E final confidence: 94%, all categories ≥ 90%. The remaining risk is that a target change landing inside a real read window is proven only by unit tests.

## How To Check It In The App (optional, after the next build)

In an Org run: stop one delegated copy from its row in Run Settings, change its model and press Save. Settings shows "Saved." with the new model and no "could not be refreshed" message, without pressing Refresh. The fix is web-only (`autobyteus-web/stores/agentOrgContextsStore.ts`) and ships with the next release.

## Follow-ups

- FU-001 (Org/Agent views: record `delegated_launch_selections_changed` in place instead of a stream reconnect; not urgent). Recorded in `follow-ups.md`; the Solution Designer sends it.
- Seen in the evidence, but belongs to another ticket (autobyteus-208): Settings shows `writer_0120` where the sidebar shows `writer 0120`.

## Release

- Decision: no release, the RELEASE.md default. The user asked for no release and the Task asks for "finalization on personal". A beta or stable release is available on request.
