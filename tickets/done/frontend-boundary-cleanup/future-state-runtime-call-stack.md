# Future-State Runtime Call Stack

- Ticket: `frontend-boundary-cleanup`
- Date: `2026-04-03`

## Primary Spine A — touched-files invocation identity reuse

1. `toolLifecycleHandler.ts` or `agentArtifactsStore.ts` receives an invocation id
2. caller asks `invocationAliases` utility for aliases or matching
3. caller applies the result inside its own owned logic
4. touched-files / lifecycle state stays unchanged, but alias policy is now centralized

## Primary Spine B — web prepare-server packaging boundary

1. `autobyteus-web/package.json` runs `pnpm prepare-server`
2. `prepare-server-dispatch.mjs` selects the platform-specific web script entrypoint
3. web prepare-server script builds/deploys `autobyteus-server-ts` through the server boundary only
4. `autobyteus-server-ts` owns any internal shared dependency preparation it needs
5. web script stages the packaged server bundle into `autobyteus-web/resources/server`

## Return/Event Spine — boundary guard enforcement

1. `pnpm guard:web-boundary` scans active web source folders and active web scripts
2. if any direct `autobyteus-ts` dependency is found, the guard fails the command
3. build/test flow stops before packaging proceeds

## Bounded Local Spine — latest visible artifact surface

1. touched-files store announces latest visible artifact only when still required by active callers
2. dead public reset API is removed
3. existing UI latest-visible behavior continues through the remaining active signal flow
