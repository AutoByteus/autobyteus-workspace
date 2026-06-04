# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace/tickets/in-progress/default-terminal-home-workspace/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace/tickets/in-progress/default-terminal-home-workspace/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace/tickets/in-progress/default-terminal-home-workspace/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace/tickets/in-progress/default-terminal-home-workspace/design-review-report.md`

## What Changed

- Backend `/ws/terminal/:sessionId` now treats omitted `cwd` and omitted `rootPath` as a first-class default request and resolves it to `os.homedir()` before canonicalization/stat validation.
- Explicit terminal targets remain explicit: `cwd`/`rootPath` query values, including an explicit empty `cwd=`, are not converted to server home and still flow to backend validation/rejection.
- Frontend `useTerminalSession()` now supports `defaultCwd: "server-home"`; in that mode a missing target connects to `/ws/terminal/{sessionId}` with no `cwd` or `rootPath` query parameters.
- Workspace `Terminal.vue` now passes the server-home default mode, removes the local no-workspace-root blocking banner, keeps real session/server errors, uses a `server-home` vs `explicit:{rootPath}:{workspaceId}` reconnect key, and changes the xterm startup copy to generic text.
- Removed the obsolete `no_terminal_root_path` localization entries after confirming no remaining references.
- Updated frontend/backend terminal docs to describe omitted-cwd server-home behavior and no workspace/File Explorer materialization.
- Added/updated targeted frontend and backend tests for default-home URL construction, no-local-banner component behavior, explicit empty target preservation, workspace-root regression behavior, reconnect to server-home mode, and backend omitted-cwd resolution.

## Key Files Or Areas

- `autobyteus-server-ts/src/api/websocket/terminal.ts`
- `autobyteus-web/composables/useTerminalSession.ts`
- `autobyteus-web/components/workspace/tools/Terminal.vue`
- `autobyteus-web/components/workspace/tools/__tests__/Terminal.spec.ts`
- `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts`
- `autobyteus-server-ts/tests/integration/terminal/terminal-websocket.integration.test.ts`
- `autobyteus-web/docs/terminal.md`
- `autobyteus-server-ts/docs/modules/terminal.md`
- `autobyteus-web/localization/messages/en/workspace.ts`
- `autobyteus-web/localization/messages/zh-CN/workspace.ts`

## Important Assumptions

- `os.homedir()` is the intended default terminal cwd for the backend/server process and is the only default path authority.
- Frontend clients should request the default by omission, not by sending `~`, an empty fake path, or a browser/electron-local home path.
- Explicit terminal targets should remain explicit even when malformed; backend validation remains responsible for rejection.
- File Explorer/workspace metadata stores remain independent and are not touched by the terminal home fallback.

## Known Risks

- Container/all-in-one deployments may resolve server home to `/root`; this remains the reviewed product/deployment risk.
- Because the right-side Terminal tab is the default active tab, an empty workspace page can now create a real home PTY immediately instead of only showing the prior local error.
- The branch is still behind `origin/personal`; delivery must refresh/integrate per team process.
- The package-level `pnpm -C autobyteus-server-ts typecheck` command currently fails on existing `TS6059` rootDir/include configuration issues for test files. A source-only build config typecheck passes after Prisma client generation.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` — small terminal boundary refactor
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: Default cwd policy moved to the backend terminal route; frontend session boundary gained an explicit server-home default mode; Terminal UI no longer blocks no-workspace state locally and still does not compute server home or mutate workspace/File Explorer state.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `TerminalTarget` remains explicit-root only. Server-home default is represented by a narrow session option, not by overloading `TerminalTarget`. Changed implementation source files are below 500 effective non-empty lines; source diff deltas are below the 220-line pressure threshold.

## Environment Or Dependency Notes

- The dedicated worktree initially had no installed dependencies, so I ran `pnpm install --frozen-lockfile --offline` to create ignored local `node_modules` links from the pnpm store.
- I ran `pnpm -C autobyteus-web exec nuxi prepare` to generate ignored `.nuxt` types required by the frontend Vitest setup.
- I ran `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` before the source-only TypeScript check because the generated Prisma client was not present in the fresh worktree.
- These setup outputs are ignored/generated artifacts and are not part of the intended tracked diff.

## Local Implementation Checks Run

Record only implementation-scoped checks here; this is not downstream API/E2E validation sign-off.

- `git diff --check` — Passed.
- `pnpm -C autobyteus-web exec vitest run components/workspace/tools/__tests__/Terminal.spec.ts composables/__tests__/useTerminalSession.spec.ts` — Passed (`15` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts` — Passed (`8` tests).
- `pnpm -C autobyteus-server-ts typecheck` — Attempted; failed before useful source checking because existing `tsconfig.json` includes `tests` while `rootDir` is `src`, producing `TS6059` for many test files outside `rootDir`.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Passed.

## Downstream Validation Hints / Suggested Scenarios

- Open the workspace page with no selected agent/team/run config and confirm Terminal connects without the old red no-workspace-root banner.
- Run `pwd` in the no-context Terminal and confirm it reports the backend/server user's home directory for the deployment.
- Select or open a workspace-backed run/config and confirm Terminal reconnects to the active workspace root.
- Exercise an explicit invalid `cwd`/`rootPath` request and confirm the backend closes with `4004` / `Terminal cwd unavailable` and creates no PTY session.
- Confirm File Explorer state/watchers are not created by the home fallback.

## API / E2E / Executable Validation Still Required

- Full downstream API/E2E/executable validation remains owned by `api_e2e_engineer` after code review.
- Broader integrated-state validation should include the reviewed residual risks: container home may be `/root`, Terminal default active tab can create a home PTY on first workspace-page open, and branch refresh against `origin/personal` is still pending for delivery.
