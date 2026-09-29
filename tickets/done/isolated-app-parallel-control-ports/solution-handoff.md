# Solution Handoff — Architecture Design Complete

- Package identifier: `isolated-app-parallel-control-ports`
- Result: `Architecture Design Complete`
- Current solution revision: `SR-003`
- Classification: `task_size=Small`, `architectural_risk=Low` (rationale in `design-spec.md` → Task Size And Architectural Risk)
- Selected route (from the handoff rules): direct implementation → `/implementation_engineer`. Architecture review is not selected: `N/A — not applicable` (Small/Low).
- Approval state: Requirements `Approved` by the user in conversation on 2026-09-29, basis SR-002 (REQ-001..004, AC-001..005, DEC-001, DEC-003; DEC-004 = do not add `--port` to the browser CLI)

## Original Request

Several API/E2E engineers in different worktrees build and launch the Electron app and control it through the browser-automation skill. The isolated-app control (CDP) port defaults to the fixed 9333, so parallel engineers collide or end up driving each other's app. Each engineer must get its own port. The user asked to keep the solution simple.

## Goal / Expected Output

- `pnpm isolated-app start` without `--control-port` picks a free control port automatically (the same way the server port already works) and reports it. An explicit `--control-port` is unchanged. `restart` keeps the port.
- Remove the `DEFAULT_CONTROL_PORT = 9333` default. There is no fallback to 9333.
- Busy-explicit-port messages say "omit --control-port to use a free port, or pass another port" (not "stop it").
- Update the unit tests. Add a real probe scenario with 3 concurrent default-port starts.
- Update the docs and skill to use the reported `controlPort` and `instanceId` (no hardcoded 9333; always pass the own `instanceId` to `stop`/`restart`).
- One-line wording fix in the external `autobyteus_mcps/browser-automation/SKILL.md:36`.

## Workspace / Base / Finalization

- Superrepo worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports`, branch `codex/isolated-app-parallel-control-ports`, base `origin/personal` @ `f2924a2b0962a0fb5e7fd95e83315e3ddf55d465`. Finalization target: `origin/personal`.
- External repository `autobyteus_mcps`: create a **separate** worktree/branch from `origin/main` for the SKILL.md edit. The main checkout `/Users/normy/autobyteus_org/autobyteus_mcps` has unrelated uncommitted changes (`README.md` modified, `computer-use-mcp/README.md` deleted); do not touch them. Finalization target: `origin/main`.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/solution-revision-record.md`
- Supplements: None
- Architecture review report: `N/A — not applicable` (Small/Low direct route)

## Key Sources

- `autobyteus-web/scripts/isolated-app/instanceLifecycle.mjs` (policy owner)
- `autobyteus-web/scripts/isolated-app/cli.mjs`
- `autobyteus-web/scripts/electron-launch/launchPorts.mjs` (reuse; do not change)
- `autobyteus-web/scripts/isolated-app/__tests__/instanceLifecycle.node-test.mjs`, `cli.node-test.mjs`
- `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs`
- `skills/autobyteus-isolated-app/SKILL.md`, `docs/isolated-app-instances.md`, `autobyteus-web/docs/electron_packaging.md`, root `README.md`

## Constraints

- No backward-compatibility fallback to 9333.
- CLI flags, JSON envelope, output fields, error codes and exit codes are unchanged.
- No record-schema change.
- Out of scope: `launchPorts.mjs` semantics (shared with `test:e2e:electron`), registry worktree scoping, readiness identity proof, and any browser-automation code change or `--port` flag.

## Scenarios / Evidence Uncertainty

- SCN-001..004 are supported normal scenarios.
- Residual (accepted in SR-002): a negligible pick-to-bind window. Escalate as a Design Impact if it is observed.
- Real concurrent packaged validation (AC-002) is still to be run by API/E2E.

## Open Risks

- Agents that remember "9333" will get `BROWSER_UNAVAILABLE` (not someone else's app). The docs fix mitigates this.
- Two repositories must be finalized together.

## Next Expected Action

Implementation Engineer implements per `design-spec.md` (Final File Responsibility Mapping and Change Sequence), runs the implementation-scoped checks and produces its implementation handoff.

## Applied Handoff Rule

- Matching rule: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/implementation_engineer`.
- No other rule matches.
