# Handoff Summary — agent-isolated-app-recording

## Status

- Delivery state: **User verified (2026-09-29, "finalize and release the meta beta thanks.", read as a new beta).** The ticket is archived and finalized into `personal` (workspace) and `main` (mcps), and a new beta is released. See `release-deployment-report.md` for the final state.
- Evidence MP4s: kept (the default; the user raised no objection).
- **Final state (DR-002):**
  - workspace `personal@c84b57739`: the ticket fast-forwarded plus the `1.4.91-beta.6` release commit;
  - mcps `main@6b39562`: a `--no-ff` merge;
  - `v1.4.91-beta.6` published as a pre-release: 4/4 workflows green, and the published macOS arm64 build carries `isolated-launch.json`;
  - Docker `:beta` is now beta.6;
  - ticket worktrees and local branches are removed.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed (Solution Designer → Architecture Review → Implementation → Code Review → API/E2E → test-code review → Delivery).
- Review chain:
  - Architecture: ARCH-REV-005 Pass (SR-012).
  - Source review: CRR-001 Pass (9.3/10).
  - API/E2E: API-REV-001 Pass (94.9%; every in-scope AC is proven: AC-001..AC-010, AC-012..AC-014).
  - Test-code review: CRR-002 Pass.

| Repo | Worktree | Ticket branch | Finalization target | Candidate | Integrated base |
| --- | --- | --- | --- | --- | --- |
| workspace | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording` | `codex/agent-isolated-app-recording` | `origin/personal` | `c474cb9fc` (merge) + delivery artifacts (uncommitted) | `origin/personal@5d6179797` (1.4.91-beta.5), merged |
| autobyteus-mcps | `/Users/normy/autobyteus_org/autobyteus_mcps-agent-isolated-app-recording` | `codex/agent-isolated-app-recording` | `origin/main` | `c37b2b9` | `origin/main@f11098c`, already current |

- Local commits made by delivery (not pushed):
  - workspace `907475467`: checkpoint of the reviewed durable tests and ticket artifacts.
  - workspace `c474cb9fc`: merge of `origin/personal`, a clean merge that touched no ticket files.
  - mcps `c37b2b9`: the reviewed durable MCP tests.
- Build outputs `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` stay untracked and are never committed.

## What Changed

1. **`pnpm isolated-app start | list | stop | restart`** (workspace; `autobyteus-web/scripts/isolated-app/`, `scripts/electron-launch/`):
   - starts an isolated desktop instance with its own backend port, its own data root, a loopback control port (default 9333) and its own process group;
   - prints one JSON value per command;
   - supports `--from-worktree`/`--build`.
2. **Isolated-launch gate:** builds carry `isolated-launch.json`. Builds without it are refused (`APP_ISOLATION_UNSUPPORTED`), and packed AppImages are refused without being executed (`APPIMAGE_EXTRACTION_REQUIRED`).
3. **Server env policy** (`electron/server/serverRuntimeEnv.ts`): an isolated instance's server gets only the baseline allowlist plus Electron-owned values. Production composition is byte-identical.
4. **Disabled updates** in isolated instances (`DisabledAppUpdater`, `disabled` store state, About panel, en/zh-CN strings).
5. **Browser MCP** (mcps): attach-only mode, built-in presentation helper in `run_script` (cursor, captions, hit-testing with `OBSCURED`), async-arrow fix, and exactly two new tools `start_recording`/`stop_recording` (background worker → MP4).
6. **Docs/skills:** `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md`, READMEs, `electron_packaging.md`, `secret_management.md`; mcps `SKILL.md`/README/mapping.
7. **Durable tests:** lifecycle/launch node tests, electron/nuxt vitest, the updated `test:e2e:electron:isolation` probe, the new `test:e2e:isolated-app` probe, mcps unit tests, and real-Chrome integration tests (2 new MCP tests).

## Validation Evidence

- API/E2E (macOS 26.5.2 arm64): R-01..R-07 and live L-01..L-18 all pass. Live runs covered:
  - an unscrubbed agent shell;
  - two concurrent instances;
  - a 5-minute recording;
  - the importer and restart;
  - an agent run producing a tutorial clip entirely on its own;
  - a full `--build`.
  The main app was unaffected (L-18).
- Delivery re-run on the integrated state (2026-09-29, evidence in `delivery-evidence/`):
  - R-01 node tests: 55/55.
  - R-02 electron vitest: 103/103.
  - R-03 nuxt vitest: 49/49.
  - The web specs the base changed: 27/27.
  - R-07 `isolated-app-lifecycle-probe`: LC-001..LC-006 passed against the worktree build, with the production snapshot unchanged and no instances left running.
  - mcps R-04 unit: 138 passed.

## Verification Steps Given To The User

From the workspace worktree, with a packaged worktree build (`autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` exists; or use `--build`):

1. `pnpm isolated-app start --from-worktree`. You should get JSON with `backendUrl`, `controlEndpoint` (127.0.0.1:9333) and `dataRoot`. A second AutoByteus window opens with empty data, no update toast, and Settings → About showing updates "Disabled". Your main app keeps running unchanged.
2. `pnpm isolated-app start` (default: your installed app). This should be refused with `APP_ISOLATION_UNSUPPORTED`, and nothing should launch.
3. Optional: use the browser-automation skill with `CHROME_REMOTE_DEBUGGING_PORT=9333 BROWSER_AUTOMATION_ATTACH_ONLY=1` to take a screenshot, then run `start-recording` → a few `run_script` helper actions → `stop-recording`, and play the MP4.
4. `pnpm isolated-app list`, then `pnpm isolated-app stop <id>`. The instance is gone and its data root is removed.

Reply with explicit verification (for example "verified") to proceed. Please also say:

- **Release:** do you want a new beta (for example `1.4.91-beta.6`) after finalization? By default no release is cut. Note that the installed-app path only works isolated after a release that includes this change.
- **Evidence MP4s:** the ticket evidence includes about 9.5 MB of MP4s, 7.8 MB of which is `long-5min.mp4`. No earlier ticket committed MP4s (PNGs are common). Keep them all, or drop `long-5min.mp4` (or all MP4s) before the final commit? By default I keep them.

## Finalization Plan (after your verification)

1. Archive the ticket to `tickets/done/agent-isolated-app-recording/`, commit, and push the ticket branch.
2. Re-fetch `origin/personal`, merge the ticket branch, and push `personal`.
3. mcps: push the ticket branch, merge into `main` (no fast-forward, per repository convention), and push `main`.
4. Release only if you request it.
5. Clean up the worktrees and local ticket branches.

## Residual Risks / Items For Your Decision

- **OBS-2 (follow-up candidate; needs a Solution Designer decision):** `pnpm isolated-app` passes npm-script variables (`npm_config_prefix`, …) into the launched app. Electron's login-shell PATH then drops the nvm bin, so an agent *inside* an isolated instance can hit `pnpm: not found`. A bounded fix would drop `npm_config_*`/`npm_lifecycle_*`/`npm_package_*`/`PNPM_SCRIPT_SRC_DIR` in the launch overlay. That is a small change to the approved overlay rule.
- **OBS-1 (pre-existing, unchanged):** the embedded backend binds `*`, as production does. Only the control endpoint is loopback.
- **CR-C-07 (hardening):** the lifecycle registry lives under the shared OS temp dir. On multi-user Linux it is not per-user.
- **Linux is not validated** (your decision); you will validate it after delivery. The minimized-window recording case was waived.
- The durable probes are opt-in: they need a packaged build or real Chrome and are not in default CI.

## Artifacts

(`…` = `tickets/done/agent-isolated-app-recording` on `personal`)

- Upstream: `…/requirements-doc.md`, `…/investigation-notes.md`, `…/solution-revision-record.md`, `…/design-spec.md`, `…/handoff-architecture-design-complete.md`, `…/design-review-report.md`, `…/architecture-review-revision-record.md`
- Implementation: `…/implementation-handoff.md`, `…/implementation-revision-record.md`
- Reviews: `…/code-review-report.md`, `…/code-review-revision-record.md`, `…/api-e2e-test-review-report.md`
- API/E2E: `…/api-e2e-coverage-investigation.md`, `…/api-e2e-execution-coverage-report.md`, `…/api-e2e-test-case-ledger.md`, `…/api-e2e-revision-record.md`, `…/api-e2e-evidence/`
- Delivery: `…/docs-sync-report.md`, `…/release-notes.md`, `…/release-deployment-report.md`, `…/delivery-revision-record.md`, `…/delivery-evidence/`, this `handoff-summary.md`
- Product Design artifacts: N/A — not applicable
