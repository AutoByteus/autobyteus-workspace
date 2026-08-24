# Prototype Runbook

## Identity

- Package: `initial-prototype-baseline`
- Revision: `RER-007` repository-root placement correction; approved
  observable baseline established under `RER-002`
- Mode: approved current-experience baseline in corrected owning repository
- Source: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web`
- Pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Prototype: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Owning repository: `/home/autobyteus/workspace/autobyteus-workspace`
- Owning branch: `personal`
- Review URL: <http://127.0.0.1:3200>

## Clean Install And Run

Development:

```bash
cd /home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype
corepack pnpm install --ignore-workspace --frozen-lockfile
corepack pnpm dev --port 3200
```

Production-build review:

```bash
cd /home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype
corepack pnpm build
PORT=3200 HOST=127.0.0.1 node .output/server/index.mjs
```

The independently runnable prototype needs no backend, source-observation mock, Electron runtime, credentials or network access after dependencies are installed.
Monaco-backed file/reference viewers load from the checked-in
`public/prototype-assets/monaco/vs` mirror; ordinary review does not reach a CDN.

## Select A Desktop Or Workspace Scenario

Open the destination route, then use the browser console:

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

The host adapter is installed during page bootstrap, so set storage and reload/navigate:

```js
localStorage.setItem('autobyteus.prototype.context', 'electron_internal')
localStorage.setItem('autobyteus.prototype.scenario', 'populated')
location.assign('/settings?section=extensions')
```

External-node Electron window:

```js
localStorage.setItem('autobyteus.prototype.context', 'electron_external')
localStorage.setItem('autobyteus.prototype.scenario', 'populated')
location.assign('/settings?section=server-settings&mode=advanced')
```

Lifecycle/update examples replace the scenario with `electron_starting`, `electron_error`, `electron_restarting`, `electron_shutdown`, or `update_available`.

## Select Paired Mobile

Install the synthetic local session before entering `/mobile`:

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

The loopback URL and credential are inert fixture text. Integration actions are intercepted; no node needs to be running during independent prototype review.

## Reset

```js
localStorage.removeItem('autobyteus.remote_access.mobile_session.v1')
window.__AUTOBYTEUS_PROTOTYPE__.reset()
location.assign('/agents?view=list')
```

## Prototype Validation

```bash
cd /home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm validate:boundaries
corepack pnpm audit:presentation
corepack pnpm audit:interactions
corepack pnpm build
corepack pnpm capture:final-references
corepack pnpm validate:final-package
corepack pnpm validate:repository-placement
```

`capture:final-references` is a post-confirmation Product Prototyper evidence
command. It requires the production-build prototype to be available at
`http://127.0.0.1:3200` and rewrites `final-reference-screenshots/`.

## Reproduce Source-Versus-Prototype Evidence

Start the source-observation-only local fixture:

```bash
cd /home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype
PROTOTYPE_MOCK_PORT=4310 corepack pnpm source-observation:start
```

Start the pinned source:

```bash
cd /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web
BACKEND_NODE_BASE_URL=http://127.0.0.1:4310 \
ENABLE_APPLICATIONS=true \
corepack pnpm exec nuxt dev --host 127.0.0.1 --port 3100
```

Start the prototype on `3200`, then run serially because each harness resets the shared observation fixture:

```bash
cd /home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype
corepack pnpm capture:parity
corepack pnpm capture:correction
corepack pnpm capture:matrix
corepack pnpm capture:correction-matrix
corepack pnpm validate:browser
corepack pnpm validate:correction-journeys
```

Optional targeted correction row:

```bash
CORRECTION_IDS=HOST-001,WKS-005,MOB-009 corepack pnpm capture:correction
```

The evidence ports are required only for source comparison. Ordinary review at `3200` remains independent.

## Process Isolation

Use a separate terminal for each long-running process. Stop with `Ctrl-C`. The source observer accepts only loopback synthetic requests; the prototype itself blocks external integration requests and production WebSockets. Mutable data is browser-local and resettable.
