# DR-001 Integrated Delivery Checks

2026-10-04; macOS arm64; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources`.
Commands run from that root. These are Delivery-owned post-integration reruns, not a new API confidence score or user verification.

## Integration
```sh
git status --short
git fetch origin personal
git rev-parse HEAD origin/personal
git log --oneline HEAD..origin/personal
git merge --no-edit origin/personal
```
Incoming worktree clean at `187cab01acd1ac24380fb1b99381f6af0fe014a8`.
Fetched target `1b9739cadba18125ac766b458fc2e4c0d392044e` had new commits (Claude compaction, collaboration rendering, docs/version work).
Merge strategy ort, no conflicts; merge commit `7bb0b639560924601af0298629d0c5202b755ff9`.
No feature source/test fix or manual conflict resolution. No checkpoint needed. All subsequent checks use this integrated code; Delivery's later changes are docs/evidence only.

## Fresh server setup / build — exit 0
```sh
pnpm -C autobyteus-server-ts prebuild
pnpm -C autobyteus-server-ts build
```
Pass including shared SDK/core rebuild, Prisma generation, production TypeScript build and sanitized built-module/built-in agent bootstrap without DATABASE_URL.
Logs: [prebuild](delivery-dr001-prebuild.log), [build](delivery-dr001-build.log).
General/global tsconfig was not rerun or claimed passing.

## Focused server regression — exit 0
```sh
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills tests/integration/skills tests/unit/skills tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/shared/workspace-skill-materializer-collision-policy.test.ts tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/grok/grok-build-runtime-registration.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts tests/unit/agent-execution/backends/acp/acp-agent-run-backend-factory.test.ts tests/unit/agent-packages/agent-package-service.test.ts tests/unit/agent-packages/agent-package-skill-name-validation.test.ts tests/unit/agent-packages/github-agent-package-installer.test.ts tests/unit/agent-packages/github-repository-source.test.ts --no-watch
```
**28 files / 321 tests Pass**, 105.26s. [Log](delivery-dr001-server.log).
Includes the 29 GitHub GraphQL cases (five lifecycle + 24 adapter matrix combinations), catalog/name preservation, archive safety, materializer holders and shared agent-package transport. Counts are not additive. Test-owned database/files only.

## Focused renderer regression — exit 0
```sh
pnpm -C autobyteus-web test:nuxt components/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts --run
```
**6 files / 28 tests Pass**, 27.90s. [Log](delivery-dr001-web.log).
No full web suite/build or Electron-shell pass implied.

## Real web/backend journey — exit 0
```sh
node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs tickets/in-progress/github-skill-sources/evidence/delivery-dr001-web
```
**8/8 Pass**, started 11:29:12 UTC, finished 11:31:09 UTC.
[Authoritative result](delivery-dr001-web/result.json), [provider byte receipts](delivery-dr001-web/provider.jsonl), [backend log](delivery-dr001-web/backend.log). Migration/frontend logs, eight case screenshots and two supplementary screenshots retained in the same directory. No API-owner ledger modified.

- Import collection + actual Files/socket; start A on version 1.
- Automatic check detects version 2; cancel leaves archive request count/content/local edit unchanged.
- Failed confirmed update preserves prior install; retry commits version 2 and refreshes Files, additions/deletions and local edit overwrite.
- Actual header ＋ and Send starts B in the same workspace while A is still active; external CLI records version 2 bytes; holder cleanup order checked.
- SIGKILL owned backend during observed download; restart retains old committed generation.
- Real host permission-denied removal persists REMOVING; restore permissions, restart, UI Retry removal succeeds while unrelated local skill survives.

Real frontend/stores/HTTP/GraphQL/schema/archive/catalog/files/watchers/adapter/stdio; controlled GitHub revisions/errors and scripted external Codex CLI, not model inference. Separate matrix covers actual Codex/Claude/Grok preparation; it is not three live-model browser journeys. No public GitHub rerun; API's prior live external evidence remains attributed upstream. No exhaustive instruction-level crash guarantee.

No page errors. Both connected file-explorer sockets closed. Browser result reports all five cleanup flags true: Chrome closed, children stopped, backend63638/frontend63639 released and owned `github-skills-web-8neLFu` private data removed. Nuxt HMR reconnect attempts in socket logs are not connected file-explorer leaks. Permissions restored before removal/cleanup. No user's app/data/process touched.

## Final static/data checks and cleanup
- Approval snapshot SHA256 unchanged: `65035d7ba2b63e33eef2e8c8bbd72066cfb0f4148eb129fc798aec004d4dccb8`.
- `git diff --check`: Pass after documentation sync. No production/test-code delta after merge.
- Normal prebuild-created untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` removed after execution; both were absent at intake and have no tracked files. Ignored current build artifacts retained locally, not released. Reruns require normal prebuild again.
- No new skip or failing attempt. Existing unrelated broader failures remain as recorded by upstream: general tsconfig rootDir, package-summary applicationCount and workspace-removal AgentRunManager setup. No full-suite pass inferred.
- Windows and Electron-shell testing Out Of Scope by explicit user direction; neither is counted as a pass or blocker.
- All delivery evidence belongs to DR-001. Logs copied from command capture; trailing whitespace normalized without changing diagnostics.
