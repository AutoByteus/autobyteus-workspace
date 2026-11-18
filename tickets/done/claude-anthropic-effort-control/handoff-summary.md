# Handoff Summary — claude-anthropic-effort-control

- Project Task: `autobyteus-8`
- Classification: task_size `Medium`, architectural_risk `High` (raised from Low at SR-004). Route: `Reviewed` (architecture review ARCH-REV-001/002, code review CRR-001..003, API/E2E round 2 test-code review).
- Branch: `codex/claude-anthropic-effort-control`, integrated with `origin/personal` @ `5fb7f2918` (merge `257c1b9ea`).

## What changed for users

- Every Claude model on the AutoByteus runtime now has a thinking effort setting. The Thinking list is one list: Off · Low · Medium · High · Xhigh · Max. The default is Medium on Opus 5.5 and Haiku 5.5, and High on the other models. The chosen level goes to Anthropic as `output_config.effort`. Off turns thinking off and sends no effort.
- Opus 5.5 no longer shows "Thinking: Not available for this model".
- The Thinking display setting is gone. It is never sent, so Anthropic's default (`omitted`) applies. Saved runs that still hold it resume normally; the key is ignored.
- Claude Opus 4.8, Opus 4.7 and Sonnet 4.6 were removed. A saved run on one of them shows the existing "No longer offered" state.
- Server: model-settings validation now leaves out keys the model's current schema no longer declares, instead of refusing them. Editing an old stopped agent, team or Org run, Org workspace-only edits, and validated launches now succeed. An invalid value of a key the model still declares is still refused.

## Verification

- Verified from evidence (API-REV-002, 95% confidence, every critical AC directly proven; details in release-deployment-report.md "Verification"). No user check was needed.
- Integrated-state rerun on `257c1b9ea`: autobyteus-ts 9 files/192 tests, server unit 30 files/248 tests, web 6 files/101 tests, server stopped-run/Org edit e2e 2 files/3 tests, all pass. Typechecks for autobyteus-ts and server (build config) and web (`pnpm typecheck` PASS, test errors at baseline) also pass.

## Release

- No release requested. The change ships with the next release (RELEASE.md default). A beta or stable release is available on request.

## Follow-ups (for the Solution Designer to send)

- FU-001..FU-005 in `follow-ups.md`; none urgent.

## Known residuals

- FU-005: a standalone launch from a definition default config that holds an undeclared key copies that key into the new run. The key is inert for Anthropic.
- RISK-6: a schema-less model now saves `null` instead of refusing extra keys (confirmed in API-12, as designed).
