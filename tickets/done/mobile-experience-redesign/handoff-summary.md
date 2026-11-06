# Handoff Summary — mobile-experience-redesign (autobyteus-277)

## Classification And Route

- `task_size`: Large. `architectural_risk`: High. Route: independent review (architecture review, code review CRR-001…010, API/E2E rounds 1–4).

## What Ships

- The `/mobile` shell rebuilt on the desktop's shared owners: the run list with delegation trees, the run screen with a ⋮ menu (Artifacts, Files, Messages, Activity), an agent-only New run and the connection sheet. The phone's old model, Home, tabs, team launch and Attach are removed.
- Narrow shared extractions; the desktop is unchanged (DSK-01…03 and the updated desktop probes pass on the merged tree).
- Android shell insets (`SystemBarInsets.kt`, REQ-011): no new permission, targetSdk unchanged.

## Integration

- Method: merge of `origin/personal` into `codex/mobile-experience-redesign`.
  - First refresh (`97` commits): conflicted with autobyteus-388 in `RunSectionPanel.vue`, `runHistoryStore.ts` and `runHistoryReadWindow.spec.ts`. Routed as a Local Fix to implementation, which merged it (`ed20da1cd1`, IR-006); reviewed in CRR-009 and validated in API-REV-004 with MSP-15.
  - Second refresh: `origin/personal` `9e0681bf39` (7 commits, autobyteus-402), merged cleanly as `944c902b02`.
- Post-integration check on `944c902b02` (`evidence/delivery/DEL-01-post-integration-checks.log`): web typecheck PASS (production 0, test-file errors 96 = baseline); localization and web-boundary guards pass; the Docker launcher tests the base changed: 35 passed, 2 skipped.

## Verification From Evidence

- Report: `api-e2e-execution-coverage-report.md`, round 4 on the merged tree (`54e2eb4d07`). Final confidence 95%, no category below 90%; every critical AC directly proven apart from the user-only parts.
- Opened and checked (`evidence/api-e2e/round-4/`):
  - `MSP-run-6/mobile-shell-probe.json`: `result: Pass`, 15/15 cases Pass (MSP-01…15), no unknown browser errors.
  - `ADR-run-6-api35/android-journey.json`: 8 Pass, 0 Fail; ADR-07 `gapToKeyboard` 62, `conversationScrollTop` 0. `ADR-run-7-api34/android-journey.json`: 3 Pass, 0 Fail, the same values.
  - `IOS-run-3/ios-webkit-journey.json`: `Pass`.
  - `FSB/steps.log`: fresh clone, frozen install, `build:electron:mac -- --arm64`, `result: Pass` (Prisma and terminal runtime verified).
  - `DSK-01.log`, `DSK-03.log`, `DSK-02/*.log`: every desktop probe passes.
- Judgement: the evidence proves the change works on every surface a machine can reach.
- **User-only checks** (API/E2E showed what it tried: the same journeys on the probe stack and on the API 35/34 emulators with this branch's APK):
  - QR-003: the list within 2 s on his phone over Tailscale with his history (0.47 s on the probe stack);
  - AC-005: his confirmation on his phone;
  - AC-010, AC-011: on his own Android device.
  - Status: asked of the user, with the choice of checking before the merge or on the beta. He answered "remove a new beta please waive for codex" (2026-11-06). This was read as "release a new beta", so he checks on the beta, and a problem he finds ships fixed in the next beta. These checks are open at finalization and are recorded as the user's, not as proven.

## Docs Sync

- `docs-sync-report.md`: seven long-lived docs updated, the probe header comment fixed; FU-008 added.

## Release

- Decision: a new **beta** carrying this ticket (DEC-015, the user's words). Release notes: `release-notes.md` (with "What you need to do": update the node; install the APK on Android).
- Smoke waiver, in the user's own words: "remove a new beta please waive for codex" (2026-11-06). It covers Codex for this beta only; Codex's quota holds until Nov 10, 10:31.
- Build-only run on the ticket branch: not required. The ticket changes no release workflow, packaging, runner or build step; its only build-input change is one test script in `autobyteus-web/package.json`, and API/E2E's fresh-start build passed.

## Follow-Ups

- FU-001…FU-008 in `follow-ups.md`; the Solution Designer sends them when the ticket leaves the team.
