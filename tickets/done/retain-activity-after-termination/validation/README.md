# IR-001 local implementation evidence

ACTIVITY-RETAIN-20260914-001, 2026-09-14. Not API/E2E acceptance.

- `../evidence/implementation-red.log`: corrected seven-test regression on base stop behavior, 3 expected retention failures / 4 controls pass. Successful Stop removes the rendered tool card, empties Activity and loses pending historical entry; tests do not assert the defect as success. Final suite adds normal restore/Send coverage.
- `implementation-tests.log`: final 11 relevant suites / 139 tests pass, including 12 new real lifecycle/context/Activity/render checks. Error output is expected rejected-command testing; unrelated empty fixture history warnings do not represent a live server.
- `implementation-typecheck.log`: `pnpm -C autobyteus-web exec tsc --noEmit` exit 2, 720 output lines. Plain tsc traverses existing cross-workspace sources and cannot resolve Vue SFC declarations, including three imports in the new tests. Not a strict typecheck pass; no unrelated repair attempted. This is current evidence, not a claimed verified baseline comparison.
- `install.log`, `shared-build.log`, `nuxt-prepare.log`: frozen install, repository prepare:shared and Nuxt prepare complete. Install has existing missing application-devkit CLI bin warnings. Untracked SDK dist output created by setup removed after preview; ignored build/dependency output remains local.
- `renderer.log`, `activity-retention-check.vue`: exact temporary Nuxt page used for narrow rendered self-validation, removed from pages afterwards. Owned renderer `BACKEND_NODE_BASE_URL=http://127.0.0.1:19876 pnpm -C autobyteus-web dev --port 3198`; no backend at that address, no real provider. Page substitutes the Apollo command only and uses real Team termination/context/Activity renderer. It does not implement actual application navigation or acceptance.

## Direct browser feedback
Chrome dedicated tab at http://localhost:3198/activity-retention-check, default 1512×828 viewport. Observed Idle, zero commands, two Activity entries (System instructions and successful send_message_to). Expanded System instructions and tool arguments, clicked Stop: same expanded cards/contents stayed visible; status became Offline, exactly one stubbed stop command. Expanded Result while stopped: Delivered to worker visible. Empty member showed 0 Events / No activity history yet; return to Lead restored its two existing entries, duplicate Stop kept command count at one. Standard component typography, spacing, status chips, details and empty layout remained coherent, no in-scope visual issue. No production styling change needed. Screenshots were inspected directly in CUA; no local browser screenshot files claimed.

Owned tab closed, renderer PID64129 stopped, port3198 confirmed no listener, temporary route moved here. No user process, server, conversation, credential, migration/reset or provider action. Browser later-Send and full Agent/Org placement journeys remain API owner acceptance. Unit-level normal Send uses real restore/hydration/commit/service admission with transport substitution, not an actual-provider pass.

## Independent API/E2E initial baseline
API-REV-001 **Pass95.9%**, separate ticket; ../api-e2e-execution-coverage-report.md is current authority, ../api-e2e-revision-record.md initial history, ../api-e2e-test-case-ledger.md checkpoints.
- api-narrow.log / api-broad.log: independent12 /139 tests, narrow included.
- api-build.log: current server/shared/Prisma/bootstrap Pass; not whole web build. Supplied implementation-typecheck.log remains Fail.
- api-runtime/team-*-dom.txt, team-continuation-once-proof.json: actual same-focus expanded Activity retention and later exact old/new entries; initial failed Codex tool explicitly qualified.
- api-runtime/agent-*, org-direct-*, org-mounted-*: actual native parity, drafts/status/markers, old IDs once/new events.
- api-runtime/retained-attachment-browser-dom.txt: actual frontend-opened retained attachment preview; REST seed/picker limitation separately recorded.
- api-runtime/team-stale-approval-no-dispatch-proof.json: real historical Approve click emits no WS approval or accepted message; exact GraphQL duplicate count only durable, not observed by fetch hook.
- api-runtime/team-failed-stop-dom.txt / expanded DOM / team-failed-stop.png / failed-stop-browser-errors.json: actual server crash then failed UI Stop preserves5/Idle known state and expandability.
- api-runtime/final-memory and final-trace-summary.json: test-only retained execution trees/raw traces/communication; no DB secrets.
- api-runtime/api-activity-observer.client.ts and telemetry.mjs: passive evidence methods, not production changes; installed plugin removed. api-finalization.log records exact owned cleanup/empty ports.
No API durable edits; implementation two new retained suites and adjusted existing Team test carried. Direct Small/Low passes to Delivery without proportional test review; no release/integration authority inferred.
