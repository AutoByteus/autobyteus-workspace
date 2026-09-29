# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Solution Designer result `Architecture Design Complete` (SR-003), `task_size=Small`, `architectural_risk=Low` → direct implementation. Architecture review `N/A — not applicable`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/requirements-doc.md` (Approved 2026-09-29, basis SR-002)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/design-spec.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/solution-handoff.md`
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)

## Current Implementation Summary

`pnpm isolated-app start` without `--control-port` now picks a free control port through the shared `selectListenerPort` helper and confirms it with the dual-address `isPortAvailable` check (up to 10 attempts; exhaustion → `CONTROL_PORT_IN_USE`, nothing launched). `DEFAULT_CONTROL_PORT = 9333` is removed with no fallback. An explicit `--control-port` is validated and busy-checked exactly as before; only the busy message changed to "omit --control-port to use a free port, or pass another port". `restart`, `stop`, `list`, the registry, the record schema, the JSON envelope, error codes and exit codes are unchanged. The docs, skill, README and the external browser-automation SKILL.md now use the reported `controlPort`/`instanceId`.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Repositories and branches:

- Superrepo worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports`, branch `codex/isolated-app-parallel-control-ports` (base `origin/personal` @ `f2924a2b0`). Finalization target `origin/personal`.
- `autobyteus_mcps` worktree `/Users/normy/autobyteus_org/autobyteus_mcps-isolated-app-parallel-control-ports`, branch `codex/isolated-app-parallel-control-ports` (base `origin/main` @ `d0fb10d`). Finalization target `origin/main`. The dirty main checkout `/Users/normy/autobyteus_org/autobyteus_mcps` was not touched.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: The change stayed inside `instanceLifecycle.start` (one local picker function, one resolve function, one injectable dependency) plus the CLI usage text. No new modules, no contract/flag/error-code/exit-code change, no record-schema change, no security change (control endpoint still loopback per probe assertion), `launchPorts.mjs` untouched. No escalation trigger observed: no consumer depending on 9333 was found outside the listed docs (repo-wide grep; remaining `9333` occurrences are arbitrary fixture values in registry/process/launchPorts unit tests and browser-automation unit tests).
- Selected route: `Direct API/E2E` (per `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes` (see below)
- New design impact or escalation trigger: `None`

### Lightweight Self-Review

- Explicit-port path is byte-for-byte the same sequence as before (validate → isolation gate → busy check), so REQ-002/AC-003 are preserved; `details.instanceId` is still attached for an owned port.
- Validation of an explicit port moved into an `options.controlPort !== undefined` guard; usage errors still fire before build/launch/port work.
- Ordering preserved: isolation gate → control port → server port → data root → launch. An auto-pick failure therefore leaves no data root and no record (unit-tested).
- One small addition inside the policy owner: the auto pick excludes an explicitly requested `--server-port`, so a random pick cannot produce a spurious "`--server-port` must differ from the control port" usage error. It adds no behavior beyond REQ-001 (the explicit server port is still honored exactly).
- `selectServerPort` now uses the same injected picker (`processDeps.selectListenerPort`, default the real `selectListenerPort`), so the test seam is one coherent dependency rather than control-only.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Free control port when `--control-port` is omitted | `instanceLifecycle.mjs`: `start` → `resolveControlPort(undefined, serverPort)` → `selectAutoControlPort` (`pickListenerPort(undefined, {exclude})` + `portAvailable`, ≤10 attempts) → `selectServerPort(…, controlPort)` excludes it → `launchRecord` (`--remote-debugging-port=<picked>`) | Implemented. Unit tests: default start, busy-candidate skip, exhaustion, two starts distinct, explicit-server-port exclusion. Real-port sanity check (fake spawn) with 9333 held: 3 concurrent starts → 6 distinct ports, none 9333. |
| BEH-002 | Explicit `--control-port` honored exactly or `CONTROL_PORT_IN_USE`; message no longer says "stop it" | `start` → `assertValidListenerPort` → `resolveControlPort(n)` → `assertControlPortFree(n)` | Preserved; message changed. Unit tests for 9444 free/busy (owned and foreign) assert "omit --control-port" and not "stop it". Probe LC-002 asserts the new wording. |
| BEH-003 | Result fields unchanged | `describeInstance` untouched | Preserved. Id still `iso-<controlPort>-xxxx`. |
| BEH-007 | `restart` keeps the control port | `restart` untouched (uses `record.controlPort`) | Preserved; existing unit test and probe LC-003 unchanged and passing (unit). |
| BEH-006 | Docs/skill use reported `controlPort` / `instanceId` | `skills/autobyteus-isolated-app/SKILL.md`, `docs/isolated-app-instances.md`, `autobyteus-web/docs/electron_packaging.md`, root `README.md`, external `browser-automation/SKILL.md` | Implemented. No `9333` left in those files or in `scripts/isolated-app/*.mjs`. |

## Key Files Or Areas

Superrepo:

- `autobyteus-web/scripts/isolated-app/instanceLifecycle.mjs` — removed `DEFAULT_CONTROL_PORT`; added `processDeps.selectListenerPort`, `selectAutoControlPort`, `resolveControlPort`; new busy messages.
- `autobyteus-web/scripts/isolated-app/cli.mjs` — `USAGE`: `[--control-port <n>]` plus "Control and server ports default to free ports; read them from the result."
- `autobyteus-web/scripts/isolated-app/__tests__/instanceLifecycle.node-test.mjs` — 9333 assertions replaced; new tests (b)(c)(d)(e) + explicit-server-port exclusion + explicit 9444; list test uses explicit ports; unsupported-app test no longer relies on 9333.
- `autobyteus-web/scripts/isolated-app/__tests__/cli.node-test.mjs` — new test: parser adds no default, usage has no `9333`.
- `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` — new `LC-007 Concurrent starts without --control-port get distinct loopback-only control ports`; LC-002 conflict check also asserts the "omit --control-port" wording; header comment updated.
- `skills/autobyteus-isolated-app/SKILL.md`, `docs/isolated-app-instances.md`, `autobyteus-web/docs/electron_packaging.md`, `README.md` — guidance.

External (`autobyteus_mcps`):

- `browser-automation/SKILL.md:36` — "(control port 9333)" → "(use the `controlPort` it reports)", example `=9333` → `=<controlPort>`. No other change.

## Important Assumptions

- ASM-003 (OS-assigned ports make concurrent collisions negligible). Observation: on this macOS host, ephemeral assignment advances sequentially (65518…65523 in the sanity check) rather than randomly; that still hands concurrent pickers different ports, so the assumption holds for distinctness.

## Known Risks

- Residual pick-to-bind window (accepted in SR-002). If AC-002 shows a collision in practice, it is a Design Impact escalation trigger.
- Agents remembering 9333 will get `BROWSER_UNAVAILABLE`; the docs changes mitigate.
- Two repositories must be finalized together (superrepo → `origin/personal`, `autobyteus_mcps` → `origin/main`).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Local Implementation Defect`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: The policy landed entirely in the existing owner; the existing `processDeps` seam was extended by one dependency.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (no 9333 preference or fallback)
- Dead/obsolete code removed in scope: `Yes` (`DEFAULT_CONTROL_PORT` export and test import removed)
- Shared structures remain tight: `Yes` (no shape changes)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (`instanceLifecycle.mjs` 386 non-empty lines; source delta well under 220)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` → "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes` (record schema v1 unchanged; existing 9333 records remain valid)
- Direct-use evidence: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- Node.js built-in test runner (`node --test`); no new dependencies.
- No `TESTING*.md` exists at the repository root or in `autobyteus-web`; commands taken from the design spec and `autobyteus-web/package.json` (`test:e2e:isolated-app`).

## Local Implementation Checks Run

- `node --test autobyteus-web/scripts/isolated-app/__tests__/*.node-test.mjs autobyteus-web/scripts/electron-launch/__tests__/*.node-test.mjs` → 51 tests, 51 pass, 0 fail.
- `node --check autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` → OK (syntax only; the probe was **not** run).
- Narrow real-port sanity check (throwaway script, not committed): `createInstanceLifecycle` with the real `selectListenerPort`/`isPortAvailable` and a fake spawn/readiness, 9333 held on 127.0.0.1 by the script, 3 concurrent `start({app})` → control ports 65518/65522/65520, server ports 65519/65523/65521; all 6 distinct, none 9333.
- Grep check (design step 6): no `9333` in `autobyteus-web/scripts/isolated-app/*.mjs` (non-test), `skills/autobyteus-isolated-app/`, `docs/isolated-app-instances.md`, `electron_packaging.md`, root `README.md`, or `browser-automation/SKILL.md`/`README.md`.

These are implementation-scoped checks only, not API/E2E sign-off.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable` — dev tooling (CLI script) and documentation only; no rendered frontend changed.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: hold 9333 (e.g. `nc -l 127.0.0.1 9333` or a started instance with `--control-port 9333`), then `start` without `--control-port` → succeeds on another port; `CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1 … list-tabs` shows only this instance's `/renderer/index.html` tab.
- AC-002: `pnpm --dir autobyteus-web test:e2e:isolated-app --app <packaged build>` runs the new LC-007 (3 concurrent default starts: distinct ports, one main window each, distinct tab ids, loopback-only control listener held by each instance's own process group, stop by id). Installed `/Applications/AutoByteus.app` carries `isolated-launch.json` on this host; a packaged worktree build also exists at `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (different branch — prefer a build of this worktree or the installed app).
- Optionally run three `start`s from three different worktree shells to mirror SCN-002 exactly.
- AC-003/AC-004: covered by unit tests; probe LC-002/LC-003 re-exercise them against the real app.
- AC-005: doc review of the five doc files listed above.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Real packaged run of the isolated-app lifecycle probe including new LC-007 (AC-001, AC-002, QR-001 loopback-only).
- Confirmation that browser-automation attach on the reported port sees only the owning instance's window.
- Doc review for AC-005, including the external `browser-automation/SKILL.md` change.
