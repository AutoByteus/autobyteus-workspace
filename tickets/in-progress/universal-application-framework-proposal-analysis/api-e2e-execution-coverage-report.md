# API/E2E Execution Coverage Report — Universal Application Dual-Host Foundation

## Report Meta

- Current validation: `API-REV-008`
- Trigger: `CRR-022` source-review Pass for `IR-013`, reviewed HEAD `235be4529bf4c34e3047632453ca80adf25e1972`
- Prior result: `API-REV-007 — Fail / 88%`
- Result: **Pass**
- Final confidence: **97%** (`97.3%`)
- Broader-validation decision: `Required — completed`
- Independent historical diagnostic: `APIE2E-REPO-005` remains `Unclear` and non-gating; it is not attributed to IR-012/IR-013.

## Result Summary

`APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` is resolved. A fresh real standalone Brief run used the exact package-owned Codex/Luna team, authenticated Agent Tools, published researcher and writer artifacts, delivered the recipient-name writer handoff, projected artifacts/revisions into application state, and reached `in_review`. No direct-file or SQLite operation is credited as publication or handoff.

IR-012/IR-013 lifecycle boundaries also pass direct durable and live checks: application versus general-process session scope, graph-local publication ownership, team-before-agent shutdown, idempotence and aggregation, lifecycle ordering, active host stop, restart with new run allocation, dual-host Studio publication/remount, package immutability, and leak-free cleanup.

## Scenario Matrix

| Scenario | Result | Direct evidence |
| --- | --- | --- |
| `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` | **Pass; prior failure resolved** | actual Agent Tools call results, standalone DB/browser state |
| Real `publish_artifacts` | Pass | researcher and writer MCP calls return `success: true` with revision IDs |
| Recipient-name `send_message_to` / writer handoff | Pass | real call returns `Delivered message to writer.`; writer run/thread publishes |
| App projection | Pass | `brief_artifacts`, `brief_artifact_revisions`, `in_review`, browser `2` outputs / `1 final` |
| Active graph stop/restart | Pass | real second team/member active at stop; ports/processes clear; restart allocates a new team/member and completes |
| Old application scope vs general process scope | Pass | direct real registry authority test proves application revocation, general survival, and process-close clear |
| Shutdown/lifecycle failure behavior | Pass | direct tests prove team-before-agent, both-owner aggregation, continuation, exact cleanup placement and idempotence |
| Graph isolation / worker recovery | Pass | graph-local session/publication/run identities and current worker host suite pass; live worker/host stop and restart pass |
| Studio setup/entry/remount | Pass | package team ready; one iframe; explicit reload produces a fresh launch ID with one iframe |
| Studio real publication parity | Pass | real Codex/Luna team; non-empty research/final artifacts; app/browser `in_review` |
| Package identity and immutability | Pass | exact current package used by both hosts; `73/73` pre/post hashes identical |
| Controlled browser prerequisite | Pass | installed Google Chrome through Playwright; real hosts retain `--no-open` |
| Maintained commands | Pass | server/devkit; Brief and Socratic build/validate/backend typecheck; Brief standalone and Studio live |

## Repository Coverage

### Final requirement-linked server selection

```bash
pnpm -C autobyteus-server-ts exec vitest run <21 API/E2E-owned server test files>
```

Result: `21 files / 63 tests Pass`.

The final set includes Agent Tools route/process/session scope, standalone composition, application REST/WS/custom transport/context capabilities, imported Brief projection, package team prompts/defaults, definition refresh, current REST boundaries, worker host recovery, graph isolation, run authorities, shutdown authority, and platform lifecycle.

### Frontend selected-resource coverage

```bash
pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run \
  components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts \
  components/applications/setup/__tests__/ApplicationTeamLaunchProfileEditor.spec.ts \
  composables/__tests__/useApplicationLaunchSelectionPreviews.spec.ts
```

Result: `3 files / 7 tests Pass`.

### Builds and maintained packages

- Server TypeScript build-config no-emit: Pass.
- Full server build and sanitized bootstrap smoke: Pass.
- Devkit build and full tests: `19/19 Pass`.
- Brief Studio build, validate, backend typecheck: Pass.
- Socratic Math Teacher build, validate, backend typecheck: Pass.

## Durable Coverage Changes

### Added this round

- `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tools-mcp-process-authority.test.ts`
- `autobyteus-server-ts/tests/unit/application-platform/application-run-shutdown-authority.test.ts`

### Updated this round

- `autobyteus-server-ts/tests/unit/application-platform/application-run-authorities.test.ts`
- `autobyteus-server-ts/tests/unit/application-platform/application-platform-lifecycle.test.ts`
- `autobyteus-server-ts/tests/unit/application-platform/application-platform-runtime-graph-isolation.test.ts`
- `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/standalone-application-composition.integration.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts`

These changes reconcile the explicit IR-012 dependencies and directly protect session-scope separation, exact graph authorities, graph-owned shutdown, lifecycle order/aggregation, and member-session cleanup. No durable test was removed in round 8. The two earlier stale predecessor resource-configuration test removals and all prior API-owned durable paths remain part of the cumulative dirty package for proportional review.

## Real Standalone Execution

```bash
pnpm -C applications/brief-studio dev -- --port 43124 --no-open
```

- Fresh owned data root; installed Chrome; headless Playwright 1600x1100.
- Package defaults: Codex App Server / `gpt-5.6-luna`.
- First run: team `brief_studio_team_d130f60668e247b4a5b4c066d6aac59b`; researcher `brief_studio_researcher_dadfa335b241414da361903c080f88a7`; writer `brief_studio_writer_93ad650792ee4bba9b99280832aa7689`.
- Researcher publishes and sends the named writer handoff. Writer publishes. The app reaches `in_review` with two projected artifacts/revisions; browser shows two outputs and one final.
- One writer file was empty due the model's own incorrect shell-stdin write, but publication/projection succeeded. The independent post-restart run produced non-empty research (`1688` bytes) and final (`2334` bytes) artifacts, eliminating a framework artifact-content concern.

### Active stop/restart

A second real run started team `brief_studio_team_d40564af00964cafb0d8f752443cfca3` and researcher `brief_studio_researcher_23ad38223f4e488583d50ba4ca3387d5`; the host was stopped while active. All owned listeners and child processes cleared. On restart no prior child/session survived. A user-level relaunch allocated new team `brief_studio_team_61cfd050923940dca848ec015ee89c5f` and researcher `brief_studio_researcher_3a8a9721e47f4aa4892dab77e4007112`, then completed with non-empty artifacts.

Raw old descriptor secrets are intentionally not retained, so a post-restart bearer replay was not stored or repeated. The exact same registry boundary is instead directly covered: application close changes the old session to `revoked`, preserves the general-process session, and process close changes the general session to `missing_session`.

## Real Studio Execution

```bash
pnpm dev
pnpm -C applications/brief-studio dev:studio
```

The current package was imported/refreshed through Studio. The setup gate used the exact bundle team, entered successfully, mounted one iframe, and explicit Reload application produced a fresh iframe launch while retaining exactly one iframe. A real Studio Brief run (`brief_studio_team_b7021522d75d4810bb860d2aed0d9127`) completed through Codex/Luna with non-empty research (`1678` bytes) and final (`2273` bytes) artifacts. App and browser state both show `in_review`, two outputs, and one final.

Nuxt emitted transient `#app-manifest` pre-transform diagnostics during warmup, then built and reported both `DEV_SERVER_READY` and `DEV_WEB_READY`; the exercised page, iframe, remount, and publication journey passed. This diagnostic did not affect current evidence.

## Confidence Scorecard

| Category | Final | Basis |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 96% | Critical publication, handoff, projection, lifecycle, parity, identity and immutability are direct. |
| Changed-boundary execution directness | 100% | Exact authorities plus actual authenticated calls and live stop/restart. |
| Cross-boundary realism / mock gap | 98% | Real server, workers, Chrome, Codex/Luna, Agent Tools, WebSocket/GraphQL, app DB and UI. |
| Environment/configuration/identity fidelity | 98% | Fresh standalone, fresh Studio, exact current package/defaults and run identities. |
| Failure/lifecycle/recovery evidence | 95% | Direct failure aggregation plus active stop/restart and leak checks; bearer secret intentionally not retained. |
| User-surface/browser confidence | 98% | Standalone and Studio semantic DOM/state; explicit fresh iframe remount. |
| Durable regression quality/relevance | 96% | Narrow exact-authority regressions and full cumulative changed-test pass. |

Overall: `97%` (`97.3%`). No applicable category is below `90%`; no critical criterion is missing or failing.

## Evidence Inventory

Key round-8 evidence is under `tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/`:

- `api-rev-008-repository-core.log`
- `api-rev-008-all-durable-server.log`
- `api-rev-008-web-selected-resource.log`
- `api-rev-008-build-brief.log`
- `api-rev-008-maintained-builds-devkit.log`
- `api-rev-008-actual-tools-dispatch.json`
- `api-rev-008-standalone-state-success.log`
- `api-rev-008-brief-standalone-final-browser.json` / `.png`
- `api-rev-008-active-shutdown-cleanup.log`
- `api-rev-008-restart-recovery-state.log`
- `api-rev-008-prelive-hashes.log` / `api-rev-008-postlive-hashes.log`
- `api-rev-008-studio-remount-browser.json` / `.png`
- `api-rev-008-studio-state-success.log`
- `api-rev-008-studio-publication-final-browser.json` / `.png`
- `api-rev-008-cleanup.log`

## Cleanup And Result

- Ports 43124, 9229, 8000, and 3000: clear.
- Owned standalone/Studio data roots: removed.
- Owned worker, Codex, server, watcher, Nuxt, and browser processes: absent.
- Temporary API-REV-008 scripts: removed.
- Brief package/authoring hashes: `73/73` identical.
- JSON evidence parse, `git diff --check`, and retained-secret scan: Pass.

**Final result: Pass / 97%.** Return the cumulative package to `code_reviewer` for the separate proportional durable-test review; do not route directly to delivery.
