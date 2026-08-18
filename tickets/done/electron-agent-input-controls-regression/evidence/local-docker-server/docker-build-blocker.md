# Local Docker Server Build Blocker

## Result

- Ticket: `electron-agent-input-controls-regression`
- Delivery revision: `DR-005`
- Requested action: build the current finalized source as an isolated Docker server, start it, verify health, and provide the Backend URL for **Nodes -> Manage Nodes -> Add Remote Node**.
- Result: `Blocked — Local Fix`
- Repository finalization status: remains completed and remotely verified; this failure occurred only in the later requested Docker packaging action.

## Source And Isolation

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation`
- Branch: `codex/agent-team-universal-task-delegation`
- Source revision: `469b0b26b133ab4c5246a4e819ab90efa9b65ea1`
- Pre-build refresh: local and refreshed remote target matched with divergence `0 0`; worktree was clean.
- Documented helper: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/autobyteus-server-ts/docker/docker-start.sh`
- Command: `./docker-start.sh up -p electron-agent-input-controls-regression-dr005 --build-local`
- Compose project: `electron-agent-input-controls-regression-dr005`
- Reserved Backend URL for retry: `http://127.0.0.1:52704`
- Isolation: unique Compose project, collision-safe ports, and project-scoped named volumes. No existing AutoByteus container, volume, production profile, or active Electron process was changed.

## Failure

The build stopped at `Dockerfile.monorepo` builder step `RUN pnpm install --no-frozen-lockfile`:

```text
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND In autobyteus-server-ts: "@autobyteus/team-stream-contracts@workspace:*" is in the dependencies but no package named "@autobyteus/team-stream-contracts" is present in the workspace
```

`pnpm-workspace.yaml` and `autobyteus-server-ts/package.json` correctly include `autobyteus-team-stream-contracts`, but `autobyteus-server-ts/docker/Dockerfile.monorepo` does not copy that workspace package into the builder. Because the root `.dockerignore` excludes built `dist` directories, a complete fix must also ensure the contracts package is built and available to the server in the runtime image rather than only adding its manifest for install resolution.

The related `docker/Dockerfile.remote-server` and `docker/Dockerfile.allinone` show the same stale workspace-copy pattern and should be assessed proportionately so another current-source Docker path does not retain the same omission.

## Runtime Outcome

- Image build: `Failed` (exit `1`).
- Container start: `Not reached`.
- Health check: `Not run`; no container exists for this project.
- User URL: not yet usable.
- Reserved state file retained for deterministic retry: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/autobyteus-server-ts/docker/.runtime/electron-agent-input-controls-regression-dr005.env` (ignored by Git; contains only selected ports and `AUTOBYTEUS_SKIP_SYNC=1`).

## Required Reroute

- Classification: `Local Fix` — Docker packaging/build-context dependency completeness.
- Recipient: `/implementation_engineer`
- Expected implementation validation: make the current-source server Docker build complete, preserve runtime resolution for `@autobyteus/team-stream-contracts`, rebuild the isolated project, and return the normal source/test/build evidence through the required review gates before delivery resumes the container start and health verification.

## Evidence

- Full sanitized build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/evidence/local-docker-server/build-and-start.log`
