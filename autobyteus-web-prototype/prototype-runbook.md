# Prototype Runbook

## Identity

- Package: `initial-prototype-baseline`
- Revision: `RER-009` focused current-experience correction; baseline pin established under `RER-002`
- Status: approved current-state baseline including the user-confirmed RER-009 correction (`PPA-002`)
- Approved source pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Selected source repository: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web`
- Prototype: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype`
- Owning worktree: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline`
- Owning branch: `codex/initial-prototype-baseline`
- Canonical review URL: <http://127.0.0.1:3210>

The selected source worktree may be newer than the approved pin. Source-versus-prototype evidence must run from an exact export or detached worktree at `8ef282b...`; do not reset the selected source worktree and do not treat its current HEAD as correction authority.

## Clean Install And Run

Development:

```bash
cd /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype
corepack pnpm install --ignore-workspace --frozen-lockfile
corepack pnpm dev --port 3210
```

Production-build review on any free loopback port:

```bash
cd /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype
corepack pnpm build
PORT=3220 HOST=127.0.0.1 node .output/server/index.mjs
```

The independently runnable prototype needs no source observer, backend, Electron runtime, credentials, customer data, or network access after dependencies are installed. Monaco-backed viewers use the checked-in `public/prototype-assets/monaco/vs` mirror.

## Exercise The Corrected Team Launch Journey

Reset to the correction scenario from the browser console:

```js
localStorage.setItem('autobyteus.prototype.context', 'desktop')
localStorage.setItem('autobyteus.prototype.scenario', 'team_launch')
location.assign('/agent-teams?view=team-list')
```

Then:

1. Activate **Run** on `Product Review Team`.
2. Confirm navigation to `/workspace` and the Team launch draft.
3. Choose `/synthetic/prototype-workspace`.
4. Activate **Run Team**.
5. Confirm `Prototype Workspace` contains the selected `Product Review Team` row with `researcher` and `writer` members.
6. Activate the `/writer` member row and confirm it becomes selected while the center Team workspace header changes to `writer`.

The resulting IDs and state are synthetic and resettable. No real Team process starts.

## Select Other Scenarios

```js
window.__AUTOBYTEUS_PROTOTYPE__.setScenario('workspace_team_active', 'desktop')
location.assign('/workspace')
```

Examples:

```js
window.__AUTOBYTEUS_PROTOTYPE__.setScenario('empty', 'desktop')
location.assign('/agents?view=list')

window.__AUTOBYTEUS_PROTOTYPE__.setScenario('workspace_agent_error', 'desktop')
location.assign('/workspace')
```

The complete catalog is [prototype-scenarios.md](prototype-scenarios.md).

## Select An Electron Host Context

Electron-visible UI is a browser-side host simulation; no Electron package or process is present:

```js
localStorage.setItem('autobyteus.prototype.context', 'electron_internal')
localStorage.setItem('autobyteus.prototype.scenario', 'populated')
location.assign('/settings?section=extensions')
```

Use `electron_external` for the external-node window. Lifecycle scenarios include `electron_starting`, `electron_error`, `electron_restarting`, `electron_shutdown`, and `update_available`.

## Select Paired Mobile

Install the inert fixture session before `/mobile`:

```js
localStorage.setItem('autobyteus.remote_access.mobile_session.v1', JSON.stringify({
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'http://127.0.0.1:4310',
  credential: 'prototype_mobile_session',
  device: {
    deviceId: 'prototype-phone', displayName: 'Prototype phone',
    clientFacingBaseUrl: 'http://127.0.0.1:4310',
    createdAt: '2026-08-22T04:00:00.000Z',
    lastSeenAt: '2026-08-22T04:00:00.000Z', revokedAt: null
  },
  pairedAt: '2026-08-22T04:00:00.000Z'
}))
localStorage.setItem('autobyteus.prototype.context', 'paired')
localStorage.setItem('autobyteus.prototype.scenario', 'mobile_team_active')
location.assign('/mobile')
```

## Reset

```js
localStorage.removeItem('autobyteus.remote_access.mobile_session.v1')
window.__AUTOBYTEUS_PROTOTYPE__.reset()
location.assign('/agents?view=list')
```

## Prototype Validation

```bash
cd /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm validate:boundaries
corepack pnpm build
corepack pnpm validate:gap-009-package
corepack pnpm validate:gap-010-package
```

Do not run `capture:final-references` or modify `ui-ux-spec.md` during bootstrap correction. Those are Product Prototyper-owned post-acceptance artifacts.

## Reproduce PP-GAP-009 And PP-GAP-010 Source-Versus-Prototype Evidence

Create an exact temporary source export without changing the selected worktree:

```bash
SOURCE_REPO=/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web
SOURCE_EXPORT=/tmp/autobyteus-pin-8ef282ba
rm -rf "$SOURCE_EXPORT"
mkdir -p "$SOURCE_EXPORT"
git -C "$SOURCE_REPO" archive 8ef282ba77705180d985e7000d801f0e0068cdc1 | tar -x -C "$SOURCE_EXPORT"
ln -s /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/node_modules "$SOURCE_EXPORT/node_modules"
```

Use three separate terminals:

```bash
# 1. Controlled source-observation node
cd /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype
PROTOTYPE_MOCK_PORT=4311 corepack pnpm source-observation:start
```

```bash
# 2. Exact pinned source export
cd /tmp/autobyteus-pin-8ef282ba
BACKEND_NODE_BASE_URL=http://127.0.0.1:4311 \
ENABLE_APPLICATIONS=true \
corepack pnpm exec nuxt dev --host 127.0.0.1 --port 3110
```

```bash
# 3. Prototype
cd /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype
corepack pnpm dev --port 3210
```

Then run:

```bash
cd /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype
SOURCE_BASE_URL=http://127.0.0.1:3110 \
PROTOTYPE_BASE_URL=http://127.0.0.1:3210 \
MOCK_BASE_URL=http://127.0.0.1:4311 \
corepack pnpm validate:gap-010
```

Expected result: `JRN-050-A`–`JRN-050-E` all pass; `gap-010-summary.json` reports five passed checkpoints, no failures, zero source/prototype browser errors, and `journeyContractPassed: true`. The preserved `validate:gap-009` command remains available for the earlier four-checkpoint launch-only evidence.

## Capture And Validate The Approved Final Package

After explicit user confirmation and from the production-build review server:

```bash
cd /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype
PROTOTYPE_BASE_URL=http://127.0.0.1:3210 corepack pnpm capture:final-references
corepack pnpm validate:gap-009-package
corepack pnpm validate:gap-010-package
corepack pnpm validate:final-package
```

Expected result: `VIS-001`–`VIS-017` capture without browser errors or external resources; the first 15 approved hashes remain exact; `VIS-016` and `VIS-017` anchor launch-ready and launched-writer-focus states; correction package checks pass 20/20 and 25/25; terminal final-package checks pass 86/86.

## Process Isolation

Use one terminal per long-running process and stop it with `Ctrl-C`. Evidence ports are correction-only. Ordinary prototype review needs only the prototype. Mutable state is browser-local and resettable; the source observer accepts only loopback synthetic requests; no process writes to production services.
