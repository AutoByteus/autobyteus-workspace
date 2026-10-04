# IR-001 Local Implementation Evidence

2026-10-04; isolated macOS worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources`, branch `codex/github-skill-sources`, upstream `242f7bdac`.
These are **implementation-scoped checks, not independent API/E2E sign-off**.
Retained logs have trailing whitespace/extra EOF blank lines normalized only.
Commands below run from the worktree root. Tests use disposable fixtures/test database,
not production application data. No live skill imports/model requests were performed.

## Setup and dependencies
- Followed root `TESTING.md`, closer package guidance and package scripts.
- Added exact production dependency `tar@7.5.22`; committed lockfile is authoritative.
- `pnpm install --frozen-lockfile` and server prebuild (workspace shared builds + Prisma generation) succeeded.
- Generated SDK `dist/` directories were removed from the untracked diff after checks;
  normal `pnpm -C autobyteus-server-ts prebuild` regenerates them when needed.
- No migration, new credential, environment-secret or platform package requirement.

## Final server regression command — Pass
```sh
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/skills \
  tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts \
  tests/unit/agent-execution/backends/shared/workspace-skill-materializer-collision-policy.test.ts \
  tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts \
  tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts \
  tests/unit/agent-execution/backends/grok/grok-build-runtime-registration.test.ts \
  tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts \
  tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts \
  tests/unit/agent-execution/backends/acp/acp-agent-run-backend-factory.test.ts \
  tests/unit/agent-packages/agent-package-service.test.ts \
  tests/unit/agent-packages/agent-package-skill-name-validation.test.ts \
  tests/unit/agent-packages/github-agent-package-installer.test.ts \
  tests/unit/agent-packages/github-repository-source.test.ts --no-watch
```
**24 files, 277 tests passed**. [Full log](unit-complete.txt).

New fixture coverage includes strict URLs and bounded root/collection discovery, no-op
SHA preservation, metadata-only checks, duplicate/runtime-default policy, failed candidate
and commit rollback, committed cleanup warnings, corrupt registry, REMOVING retry,
concurrent final admission, interrupted imports, raw/PAX archive paths, unsafe/safe
link graphs, modes, metadata redirects and response errors.

The source→catalog→materializer suite has **15 tests**, including same-workspace
A→publish g2→acquire B while A holds, both release orders × both conflict policies ×
retained/deleted old trees, stale/native requests, concurrent acquisition, transfer
failure/retry, holder release during preparation, genuine different-source/exact-name
collisions and user replacement. This exercises real source-owner methods with a local
repository fixture, **not** a full GraphQL/header ＋/Send/product journey.
Claude bootstrap additionally asserts effective rather than stale configured roots.

```sh
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/workspaces/workspace-manager.test.ts \
  -t 'rebinds a cached skill workspace' --no-watch
```
**1 passed, 12 skipped** (intentional name filter). [Log](workspace-focused.txt).

```sh
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
pnpm -C autobyteus-server-ts build
```
**Pass**. Typecheck produced no diagnostics. Full server build includes sanitized
built-module/built-in agent bootstrap smoke with no DATABASE_URL. [Build log](server-build-final.txt).

## Frontend — Pass
```sh
pnpm -C autobyteus-web test:nuxt components/skills \
  stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts --run
pnpm -C autobyteus-web build
pnpm -C autobyteus-web guard:web-boundary
pnpm -C autobyteus-web guard:localization-boundary
pnpm -C autobyteus-web audit:localization-literals
```
**6 files, 28 tests passed** ([log](web-final.txt)); production build **Pass**
([log](web-build.txt)); all three guards/audits **Pass** ([log](web-guards.txt)).
Build/browser-data/KaTeX warnings are retained in logs, not represented as failures.

### Rendered implementation feedback loop
Actual Vue components served by the normal Nuxt development renderer at
`127.0.0.1:49799`, disposable preview route, isolated Pinia fixture actions and dummy
backend URL. Interacted directly with Chrome at desktop and **390×844**: local/GitHub
source tabs, check busy/failure, update confirmation/cancel/confirmed fixture success,
keyboard URL entry/Enter, skipped-result warnings and managed remove warning/cancel.
Inspected wrapping, vertical scrolling, focus rings, button states and modal stacking.
Corrected stale success feedback on check; confirmation uses shared component and the
source dialog is inert beneath it. Four screenshots retained:
- [Update confirmation](update-confirmation.jpg)
- [Removal confirmation](remove-confirmation.jpg)
- [Narrow check failure](narrow-check-failure.jpg)
- [Narrow GitHub input](narrow-github-input.jpg)

Temporary page removed, preview process and tab closed, viewport override reset; port
49799 had no listener at final cleanup. REMOVING/retry is component-tested but not a
real-backend rendered journey. No actual explorer socket or user New chat proof here.

## Existing / broader check failures and exclusions
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit`:
  fails existing TS6059 configuration (`tests` outside `rootDir: src`),
  [representative excerpt](typecheck-general-excerpt.txt). Production config passes.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-packages/package-root-summary.test.ts --no-watch`:
  **1 failed, 1 passed**, unchanged expected summary omits `applicationCount: 0`.
  Neither this test nor its production summary utility was modified; the final isolated
  rerun retains the failure ([log](package-summary-baseline.txt)). Not patched outside scope.
- Existing workspace test `removes a registered workspace entry without deleting workspace files`:
  **1 failed, 11 skipped** with a name filter; process AgentRunManager is not initialized.
  Reproduced using the upstream HEAD workspace source and test temporarily, then restored
  the current implementation. [Baseline reproduction](workspace-baseline.txt).
- Agent-package live GitHub integration without opt-in: **1 skipped** alongside 18 passing
  unit tests ([log](package-regression.txt)); skipped test is not coverage.
- Earlier development runs exposed old method/return-shape mocks and raw-PAX truncation
  handling. These were corrected; the final aggregate above is the current result.

## Final static / scope check
`git diff 242f7bdac..40a01fa18 --check`: Pass. Initial staged check caught an extra
blank EOF line in a new type file; normalized before final check. Changed production source checked by counting nonempty lines:
maximum 459 (existing agent-package service); shared materializer 412; source owner 258;
archive owner 151; modal 147. All below 500. >220 deltas assessed/split by ownership
(lifecycle / archive / storage / transport / row rendering), not split mechanically.
No old GitHub utility import or compatibility forwarding layer remains. Production
callers inspected: Codex bootstrap, Claude bootstrap, ACP backend used by Grok.

## Still required downstream
Independent source review and API/E2E: real public GitHub download/API responses,
source import→start A→update→header ＋/Send start B with A live, runtime adapter matrix,
process restart/publication fault tests, real file explorer teardown/rebind, native
Windows/Linux filesystem semantics, full agent-package regression, final user verification.
No release/deployment or overall confidence verdict is claimed.
