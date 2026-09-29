# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `SR-002`, approved by the user in conversation on 2026-09-29 (REQ-001..004, AC-001..005, DEC-001, DEC-003; DEC-004 = no `--port` flag)
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/investigation-notes.md`

## Current-State Read

`pnpm isolated-app start` (owner: `createInstanceLifecycle().start` in `autobyteus-web/scripts/isolated-app/instanceLifecycle.mjs`) resolves the control port as `options.controlPort ?? DEFAULT_CONTROL_PORT (9333)`. It then checks that the port is free (`assertControlPortFree`), picks a free server port, launches the app with `--remote-debugging-port=<controlPort>` and returns `controlPort`/`controlEndpoint`. The server port already comes from the shared free-port helper. The fixed default and the docs that hardcode 9333 are the only causes of the parallel-worktree collision (BEH-001, BEH-006). Ownership and boundaries are healthy; this is a local policy change plus guidance.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: One production script function (`start` port policy) plus its CLI usage text, one unit test file, one real-probe scenario, and doc text in four repository docs and one line in the external browser-automation SKILL.md. There are no new modules, APIs or owners.
- Architectural risk: `Low`
- Risk rationale:
  - The CLI flags, JSON envelope, output fields, error codes and exit codes are unchanged. Only the default value's policy changes, and callers already read `controlPort` from the result.
  - No persistence change: the ephemeral record schema is unchanged.
  - No security change: the endpoint is still bound by Chromium to loopback, verified by the existing probe.
  - No new concurrency mechanism: the change reuses the existing free-port helper that the server port already uses.
  - Dev tooling only; the production app is untouched.
- Escalation trigger: Return a Design Impact if any of these turn up:
  - a real run shows Electron not binding the chosen port on loopback;
  - concurrent auto-port starts collide in practice;
  - a consumer depends on 9333 being the default (for example a script outside the listed docs).

## Architecture Investigation Evidence

| Source | Exact Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `electron-launch/launchPorts.mjs:22-64` | OS-assigned free-port picker plus dual-address availability check exist | Reuse both for the control port | None |
| Code | `isolated-app/instanceLifecycle.mjs:98-104,262-281` | Injectable `processDeps` pattern; start ordering (isolation gate → port → data root → launch) | Keep the ordering. Add an injectable picker. | None |
| Tests | `__tests__/instanceLifecycle.node-test.mjs` | Hardcoded 9333 assertions | Update the tests | None |
| Probe | `tests/e2e/isolated-app-lifecycle-probe.mjs` | Only explicit ports are exercised | Add a concurrent auto-port scenario | Real packaged build needed (API/E2E) |
| Repo state | `autobyteus_mcps` main checkout dirty with unrelated changes | Use a separate worktree for DEC-003 | None |

## Intended Change

1. Without `--control-port`, `start` picks a free control port the same way it picks the server port. With `--control-port`, behavior is unchanged.
2. Remove the 9333 default constant and every "9333 as the value to use" instruction. Guidance becomes: use the `controlPort` and `instanceId` from your own `start` result.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior / Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001 / AC-001, AC-002 | `isolated-app start` without `--control-port` | Fixed 9333 (`instanceLifecycle.mjs:263`) | Free port chosen automatically | DS-001 |
| BEH-002 | Operational | REQ-002 / AC-003 | `start --control-port <n>` | Validate → busy check → use | Preserved. The busy message no longer suggests stopping another instance. | DS-001 |
| BEH-003 | Operational | REQ-001 | `start` result | `describeInstance` | Preserved (same fields) | DS-001 |
| BEH-007 | Operational | REQ-003 / AC-004 | `restart <id>` | Reuses `record.controlPort` | Preserved, no code change | DS-002 (unchanged) |
| BEH-006 | Operational | REQ-004 / AC-005 | Engineer reads skill/docs | 9333 hardcoded | Reported `controlPort` / `instanceId` | Docs |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`, a local policy defect: a fixed shared default for a per-instance resource.
- Root cause classification: `Local Implementation Defect`
- Refactor needed now: `No`
- Evidence: The server port in the same function already uses the shared free-port helper. The control port is the single exception.
- Design response: Apply the same policy to the control port inside the existing owner.
- Refactor rationale: The owner, boundary and file placement are healthy. Making one dependency injectable follows the existing `processDeps` pattern.
- Deferrals: None.

## Terminology

- **Control port**: the instance's Chromium remote-debugging (CDP) port that browser-automation attaches to.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove `DEFAULT_CONTROL_PORT` (export and uses). Do not keep a "try 9333 first" preference or a fallback to 9333.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Instance records (ephemeral, OS temp dir) keep schema v1 and the same fields. Existing records with 9333 remain valid records.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 003 | CLI `start` | JSON result with `controlPort` | `instanceLifecycle.start` | Where the port policy lives |
| DS-002 | Primary End-to-End | BEH-007 | CLI `restart` | Same ports relaunched | `instanceLifecycle.restart` | Must stay unchanged |

## Primary Execution Spine(s)

`cli.mjs parseArgs → lifecycle.start → resolveControlPort (explicit: validate + assertControlPortFree | auto: selectAutoControlPort) → selectServerPort(exclude control) → data root → launchRecord(--remote-debugging-port=<port>) → waitForInstanceReady → describeInstance`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | `start` validates options, builds if asked, resolves and gates the executable, then resolves the control port. An explicit port is validated and must be free (unchanged); otherwise a free port is picked and confirmed free on both wildcard and loopback. The server port is then picked excluding the control port. Launch and readiness are unchanged, and the result reports the ports. | parseArgs, start, port resolution, launchRecord | `instanceLifecycle.start` | Free-port picking (`launchPorts.mjs`) |
| DS-002 | Unchanged: `restart` reuses the recorded control port. | restart | `instanceLifecycle.restart` | — |

## Spine Actors / Main-Line Nodes

`cli.mjs` (argument parsing, usage text), `instanceLifecycle.start` (port policy), `launchRecord` (spawn + readiness).

## Ownership Map

- `instanceLifecycle.start` owns the control-port policy (explicit versus automatic) and its error messages.
- `launchPorts.mjs` owns OS port mechanics (unchanged, reused).
- `cli.mjs` is a thin boundary. It owns parsing and usage text only.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| `cli.mjs` | `instanceLifecycle` | CLI envelope | Port defaults (no default port in the parser) |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `export const DEFAULT_CONTROL_PORT = 9333` | Fixed default is the defect | Auto port selection in `start` | In This Change | Remove the import from tests |
| `[--control-port <n>=9333]` in `USAGE` | Wrong default | `[--control-port <n>]` plus "default: a free port" | In This Change | |
| Docs instructing `9333` / id-less `stop` as the normal path | Causes cross-instance control | `<controlPort>` / `<instanceId>` placeholders | In This Change | See file mapping |
| `(control port 9333)` + `=9333` example in browser-automation SKILL.md | Same | "the `controlPort` reported by `pnpm isolated-app start`" | In This Change (separate repository) | DEC-003 |

## Return Or Event Spine(s)

N/A

## Bounded Local / Internal Spines

Auto-port confirm loop inside `start`: `pick candidate (selectListenerPort) → isPortAvailable(candidate) → accept | retry (max 10) → CONTROL_PORT_IN_USE`. This keeps the macOS wildcard-versus-loopback distinction already handled by `isPortAvailable`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Free-port picking | DS-001 | `start` | OS-assigned candidate | Shared with server-port and the E2E harness | Duplicated port logic |

## Ownership Boundaries

`start` decides the policy. `launchPorts.mjs` provides the mechanics. Neither the CLI nor the docs define a default port.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `lifecycle.start` | Control/server port selection | `cli.mjs`, probe (via CLI), tests | CLI or docs choosing a default port | — |

## Dependency Rules

- `instanceLifecycle.mjs` may import `selectListenerPort` / `isPortAvailable` from `electron-launch/launchPorts.mjs` (already does).
- Do not modify `launchPorts.mjs` semantics; `test:e2e:electron` shares it.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `isolated-app start [--control-port <n>]` | Instance | Launch | Returns `instanceId`, `controlPort` | Default becomes "free port" |
| `createInstanceLifecycle({ processDeps: { selectListenerPort } })` | Test seam | Inject free-port picker | `(requested, {exclude}) => Promise<number>` | Defaults to the real `selectListenerPort` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `start` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Auto-port helper (local function in `start`'s closure) | `selectAutoControlPort` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Free port | `launchPorts.selectListenerPort` + `isPortAvailable` | Reuse | Same need as the server port |
| Test injection | `processDeps` | Extend | Existing pattern |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Owner | Decision |
| --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/isolated-app` | Control-port policy | DS-001 | `instanceLifecycle` | Extend |
| `autobyteus-web/scripts/electron-launch` | Port mechanics | DS-001 | `launchPorts` | Reuse |
| Docs / skills | Guidance | — | — | Update |

## Draft File Responsibility Mapping

See the final mapping below. No extraction is needed.

## Reusable Owned Structures Check

N/A. No repeated structures are introduced.

## Shared Structure / Data Model Tightness Check

N/A. The record and result shapes are unchanged.

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Change |
| --- | --- | --- | --- |
| `autobyteus-web/scripts/isolated-app/instanceLifecycle.mjs` | isolated-app | `start` | Remove `DEFAULT_CONTROL_PORT`. Add `processDeps.selectListenerPort` (default: the real one). Add the local `selectAutoControlPort()`: up to 10 attempts of `selectListenerPort(undefined)` followed by `portAvailable(candidate)`; on exhaustion throw `environmentError('CONTROL_PORT_IN_USE', 'Could not find a free control port …')`. In `start`: `controlPort = options.controlPort === undefined ? await selectAutoControlPort() : (validate + assertControlPortFree)`. `selectServerPort` still excludes it. Change the `assertControlPortFree` messages to: owned → ``Control port ${p} is used by isolated instance ${id}; omit --control-port to use a free port, or pass another port``; other → ``Control port ${p} is already in use; omit --control-port to use a free port, or pass another port`` (keep `details.instanceId`). |
| `autobyteus-web/scripts/isolated-app/cli.mjs` | isolated-app | CLI | `USAGE`: `[--control-port <n>]` and a note that the default is a free port. |
| `autobyteus-web/scripts/isolated-app/__tests__/instanceLifecycle.node-test.mjs` | tests | — | Replace the 9333 assertions. (a) Default start: `controlPort` is an integer ≥1024 and ≠29695, the args include `--remote-debugging-port=${controlPort}`, and the id matches `^iso-${controlPort}-`. (b) Scripted picker: first candidate busy → second used. (c) Scripted picker always busy → `CONTROL_PORT_IN_USE`, nothing spawned, no data root left. (d) Two default starts with a scripted picker give distinct ports, and the server port ≠ the control port. (e) The busy-explicit-port test uses an explicit port for both starts, and the message says "omit --control-port" and not "stop it". (f) The list test uses explicit ports. (g) The unsupported-app test does not rely on 9333. |
| `autobyteus-web/scripts/isolated-app/__tests__/cli.node-test.mjs` | tests | — | Keep. Add: usage text does not contain `9333`. |
| `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` | real probe | — | New scenario (e.g. `LC-00x Concurrent default control ports`): 3 concurrent `start` calls without `--control-port` → pairwise-distinct `controlPort`s; each has exactly one `/renderer/index.html` target on its own port; control listeners are loopback-only; each is stopped by its explicit `instanceId`. Existing explicit-port scenarios are unchanged. |
| `skills/autobyteus-isolated-app/SKILL.md` | docs | — | Step 1: `controlPort` is a free port chosen at start. Keep `instanceId` + `controlPort` from **your** result. Step 2: example with `CHROME_REMOTE_DEBUGGING_PORT=<controlPort>`. Steps 5/6: always pass your own `instanceId` to `restart`/`stop`. New short "Parallel use" note: several engineers or worktrees can run instances at once; `list` shows everyone's; never stop or restart an instance you did not start. Recovery: `CONTROL_PORT_IN_USE` only happens with an explicit `--control-port`; omit it. |
| `docs/isolated-app-instances.md` | docs | — | Guarantee table row: "(a free port unless `--control-port` is given)". Start comments/options. Example JSON with a non-9333 port. Connect examples and MCP snippet with `<controlPort>` (state that an MCP server config is fixed to one instance's port). List/stop/restart: pass the id when several instances exist. Troubleshooting `CONTROL_PORT_IN_USE` row. Brief "Parallel instances" subsection. |
| `autobyteus-web/docs/electron_packaging.md` (~line 921) | docs | — | "(default 9333; …)" → "(a free port unless `--control-port` is given; …)" |
| `README.md` (root, ~336-338) | docs | — | `pnpm isolated-app stop <instanceId>`; mention that the control port is reported by `start`. |
| `autobyteus_mcps/browser-automation/SKILL.md:36` (separate repository) | external docs | — | Replace "(control port 9333)" with "(use the `controlPort` it reports)" and the example `=9333` with `=<controlPort>`. No other change. |

## Applied Patterns

Dependency injection via the existing `processDeps` seam.

## Target Subsystem / Folder / File Mapping

No files are created, moved or deleted. All changes are in the files listed above.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/isolated-app/` | Main-Line | Yes | Low | Unchanged layout |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Port policy | `options.controlPort === undefined ? await selectAutoControlPort() : explicit` | `options.controlPort ?? 9333`, or "try 9333 then fall back" | Any preferred well-known port brings back collisions and copy-paste cross-control |
| Doc example | `env CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "<browser launcher>" list-tabs` | `…PORT=9333…` | Engineers copy examples verbatim |
| Stop | `pnpm --dir <root> isolated-app stop <instanceId>` | `isolated-app stop` with several engineers' instances recorded | Avoids acting on someone else's instance |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep 9333 as the preferred default, fall back to a free port | Familiar port for existing habits | Rejected | Always pick a free port; docs use the reported value |
| Keep the `DEFAULT_CONTROL_PORT` export for callers | Tests import it | Rejected | Tests updated |

## Derived Layering

N/A

## Change / Refactor Sequence

1. `autobyteus-workspace-superrepo` task branch `codex/isolated-app-parallel-control-ports`: update `instanceLifecycle.mjs`, then `cli.mjs`.
2. Update the unit tests and run `node --test autobyteus-web/scripts/isolated-app/__tests__/*.node-test.mjs` (plus the `launchPorts` tests unchanged).
3. Add the probe scenario (real packaged run by API/E2E: `pnpm --dir autobyteus-web test:e2e:isolated-app --app <worktree build>`).
4. Update the repository docs and the skill.
5. In `autobyteus_mcps`, create a separate worktree/branch from `origin/main` (do not use the dirty main checkout), edit `browser-automation/SKILL.md:36`, and finalize it with the same delivery.
6. Grep check: no remaining `9333` in `autobyteus-web/scripts/isolated-app/*.mjs` (non-test), `skills/autobyteus-isolated-app/`, `docs/isolated-app-instances.md`, `electron_packaging.md`, or the browser-automation SKILL.md, except where used as an explicit-port example that is clearly optional.

## Key Tradeoffs

- The port changes on every new `start` (it is stable across `restart`). This is accepted (DEC-001) because engineers read it from the result.
- A tiny window remains between picking the port and Chromium binding it. If another isolated instance bound the same randomly chosen port in that window, readiness (which accepts any AutoByteus window on the port) could accept that instance's window. With OS-assigned random ports this requires two concurrent starts drawing the same port within seconds, so it is negligible. The user accepted this residual risk in SR-002 by dropping the readiness identity check. If it is ever observed, it is the escalation trigger above.

## Risks

- Agents with cached memory of "9333" may still try it; they get `BROWSER_UNAVAILABLE` (not someone else's app). The docs fix reduces this.
- The external skill edit lands in a different repository; delivery must finalize both.

## Guidance For Implementation

- Keep the change inside `start`. `restart`, `stop`, `list`, the registry and `launchPorts.mjs` do not change.
- Keep error codes and exit codes unchanged.
- Do not add `--port` to the browser CLI (DEC-004).
- Leave the unrelated dirty changes in the `autobyteus_mcps` main checkout untouched.
