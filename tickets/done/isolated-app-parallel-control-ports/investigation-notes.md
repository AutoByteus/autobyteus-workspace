# Investigation Notes

## Investigation Meta

- Package identifier: `isolated-app-parallel-control-ports`
- Request / ticket: Parallel E2E engineers in different worktrees collide on the fixed isolated-app control port (9333)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports` / `codex/isolated-app-parallel-control-ports`
- Resolved base remote / branch / revision: `origin/personal` @ `f2924a2b0962a0fb5e7fd95e83315e3ddf55d465` (fetched 2026-09-29)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from the refreshed `origin/personal`. The isolated-app sources on the base match the ones read in the main checkout (`git diff 39e512edd HEAD -- autobyteus-web/scripts skills docs/isolated-app-instances.md` shows no difference).
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Investigation status: Requirements-phase investigation complete. Architecture-phase probes are listed under "Notes For Architecture Design".

## Initial Request And Clarifications

- Original request (user, 2026-09-29, paraphrased): E2E can build and launch the Electron app, but the port is fixed. When several E2E engineers build and launch Electron at the same time, they all use the same port and interfere with each other's testing. Each engineer drives the app through the browser-automation skill. With, for example, three engineers in three worktrees, each must use a different port. Please analyze.
- Clarifications received: None yet.
- User-supplied facts and constraints: Several E2E engineers run concurrently, each in its own worktree. All use the browser-automation skill to control the Electron app.
- Initial ambiguity: Whether "the port" is the backend port or the control (CDP) port. The investigation shows it is the control port (the backend port is already chosen automatically).

## Product And Domain Understanding

- Product area: Developer/agent tooling. The `pnpm isolated-app` lifecycle, the `autobyteus-isolated-app` skill and guide, and the external browser-automation skill that attaches to the instance.
- Affected actors or systems: API/E2E engineer agents (and humans) running in parallel git worktrees on one machine and one OS user. `pnpm isolated-app`. The browser-automation CLI/MCP.
- Existing purpose: Start a disposable, isolated AutoByteus desktop instance (own data root, own backend port) and control, screenshot and record it through Chromium remote debugging.
- Terminology: **control port** = Chromium `--remote-debugging-port` (CDP) of the instance. **server port** = the embedded backend's HTTP port. **registry** = the instance records in `<OS temp>/autobyteus-isolated-app/`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-29 | Code | `autobyteus-web/scripts/isolated-app/instanceLifecycle.mjs:32,262-281` | Where the control port comes from | `DEFAULT_CONTROL_PORT = 9333`. `start` uses `options.controlPort ?? 9333`, then `assertControlPortFree` fails with `CONTROL_PORT_IN_USE` if the port is busy. There is no automatic alternative. | Core cause |
| 2026-09-29 | Code | `instanceLifecycle.mjs:153-159`, `electron-launch/launchPorts.mjs:51-64` | Backend port | Server port is already a free OS-assigned port (`listen(0)`), excluding the control port and 29695 | Server port is not the problem |
| 2026-09-29 | Code | `instanceLifecycle.mjs:141-151` | Busy-port message | If 9333 belongs to another recorded instance, the error names it: "used by isolated instance `<id>`; stop it or pass --control-port" | Invites one agent to stop another worktree's instance |
| 2026-09-29 | Code | `instanceRegistry.mjs:9-11,65-93` | Registry scope | One global registry per OS user in `os.tmpdir()/autobyteus-isolated-app/`, shared by all worktrees. Records have no owner/worktree field. `resolveId()` with no id picks "the only recorded instance" from any worktree. | Cross-worktree stop/restart hazard |
| 2026-09-29 | Code | `instanceProcess.mjs:95-130` | Readiness | Ready = own process group alive, backend `/rest/health` 200 on the own server port, and **any** page whose URL contains `/renderer/index.html` on `127.0.0.1:<controlPort>/json/list`. It does not check that this page belongs to the new instance. | Race: may attach to another instance's window |
| 2026-09-29 | Code | `instanceLifecycle.mjs:280` then `:206/215` | Check-then-bind | The port is checked free, then the app is spawned. Chromium binds seconds later, so two concurrent `start`s can both pass the check (TOCTOU). | Race exists even with explicit distinct defaults |
| 2026-09-29 | Doc | `skills/autobyteus-isolated-app/SKILL.md:26-37,61-62`, `docs/isolated-app-instances.md:28,72-83,150-161,268`, `autobyteus-web/docs/electron_packaging.md:916-927` | Guidance agents follow | Every example hardcodes `CHROME_REMOTE_DEBUGGING_PORT=9333`, including the MCP config snippet. Recovery for `CONTROL_PORT_IN_USE` is "Stop it, or start with `--control-port <n>`". | Guidance change needed |
| 2026-09-29 | Doc | `.claude/skills/browser-automation/SKILL.md:34-36` (symlink to `autobyteus_mcps/browser-automation`) | Browser-automation contract | Port comes from `CHROME_REMOTE_DEBUGGING_PORT` (default 9222). Attach-only mode is `BROWSER_AUTOMATION_ATTACH_ONLY=1`. Its own text says "(control port 9333)". | External doc mentions 9333 |
| 2026-09-29 | Code | `autobyteus_mcps/browser-automation/src/browser_automation/runtime/config.py:33`, `recording/state.py:3,29-32`, `runtime/chrome_launcher.py:106-113` | Is browser-automation itself port-unsafe? | Config is read per invocation from the environment. Recording state and establishment gates are keyed by `(port, tab_id)` / port. **Correct under parallel use when each caller passes its own port.** | No browser-automation code change needed |
| 2026-09-29 | Code | `autobyteus-web/electron/launch-profile/electronLaunchProfile.ts:86`, `electronLaunchProfilePaths.ts:73-76` | Electron userData location in the e2e profile | `userData = <dataRoot>/electron/user-data`, one per instance | Chromium's `DevToolsActivePort` file (written for `--remote-debugging-port=0`) would be per instance. Verify in architecture. |
| 2026-09-29 | Runtime | `ls $TMPDIR/autobyteus-isolated-app/` plus the record JSON | Live evidence of parallel use | Two records exist: `iso-9333-b35d` (worktree `chat-interface-entry` build, 07:29Z) and `iso-9336-d523` (installed app, 09:14Z, **manually moved to 9336**). No listener is currently on 9333/9222 (`lsof`), so both records are stale. | Confirms that collisions happen and that stale records accumulate across worktrees |
| 2026-09-29 | Code | `autobyteus-web/README.md:290-330`, `electron_packaging.md:860-880` | Other Electron E2E launch paths | `pnpm test:e2e:electron` and `test:e2e:electron:isolation` already pick a free backend port and temp root. They do not open a fixed CDP port (Playwright adapter uses its own transport). | Out of the problem scope |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | `pnpm isolated-app start` without `--control-port` | Uses control port 9333. Fails `CONTROL_PORT_IN_USE` if busy. | Only one default instance per machine. A second engineer must pick a port manually. | `instanceLifecycle.mjs:263,280` | High |
| BEH-002 | Operational | `start --control-port <n>` | Uses `<n>` or fails if busy | Works, but engineers must coordinate numbers themselves | `cli.mjs:67-69` | High |
| BEH-003 | Operational | `start` result | Returns `instanceId`, `controlPort`, `controlEndpoint`, `serverPort`, `databaseUrl`, `logPath` | The actual port is already machine-readable | `instanceLifecycle.mjs:65-82` | High |
| BEH-004 | Operational | `list` / `stop` / `restart` without id | Operate on the global per-user registry. With exactly one record (any worktree) that record is chosen. | An agent can stop or restart another worktree's instance without noticing | `instanceRegistry.mjs:74-91` | High |
| BEH-005 | Operational | `start` readiness | Accepts any `/renderer/index.html` page on the control port | A start that lost a port race can report ready while pointing at another instance's window | `instanceProcess.mjs:117-121` | High (by code). Not reproduced live. |
| BEH-006 | Operational | Browser-automation attach | Caller passes `CHROME_REMOTE_DEBUGGING_PORT=<port>` and `BROWSER_AUTOMATION_ATTACH_ONLY=1` | Drives whatever listens on that port. Copying the documented `9333` silently drives someone else's instance. | Skill docs; `config.py:33` | High |
| BEH-007 | Operational | `restart` | Reuses the recorded ports and data root | Tab id changes. Port must stay stable for the attached engineer. | `instanceLifecycle.mjs:365-389` | High |
| BEH-008 | Contract | Production app | Never opens a control port | Must remain so | `electron_packaging.md:925-926` | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `scripts/isolated-app/instanceLifecycle.mjs` | start/list/stop/restart, port policy | Default port policy changes here | Allocate by `--remote-debugging-port=0` + `DevToolsActivePort`, or pre-select a free port and verify? |
| `scripts/isolated-app/instanceRegistry.mjs` | Global record store | Records need an owner (worktree) for scoping | Which owner key: repository root of the CLI (`webRoot`/..), `INIT_CWD`, or git toplevel? |
| `scripts/isolated-app/instanceProcess.mjs` | Spawn, identity, readiness | Readiness must prove the CDP endpoint belongs to this instance | Can a CDP target be tied to the instance (renderer URL carries server port? `/json/version` browser pid?) |
| `scripts/electron-launch/launchPorts.mjs` | Shared port helpers | Reuse for free-port selection | Shared with the `test:e2e:electron` harness, so keep its semantics |
| Docs: `skills/autobyteus-isolated-app/SKILL.md`, `docs/isolated-app-instances.md`, `electron_packaging.md`, `README.md` | Agent guidance | Stop teaching a fixed 9333. Teach "use the returned `controlPort`". | — |
| External: `autobyteus_mcps/browser-automation/SKILL.md` line 36 | Mentions "(control port 9333)" | Wording should say "the instance's reported control port" | Separate repository. Treat as a coordinated doc touch or follow-up. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Instance record JSON (schemaVersion 1) in `<OS temp>/autobyteus-isolated-app/*.json`. Ephemeral.
- CLI JSON output (schemaVersion 1).

### Structural Surfaces

- CLI contract (`pnpm isolated-app`, flags, error codes, exit codes).
- Process lifecycle and concurrency (port allocation, concurrent starts, readiness).
- No product runtime or production-app change is expected, beyond possibly the renderer or launch args that are already e2e-profile-only.

### Potential Structural Impacts To Investigate

- API / external-contract change: The CLI default changes (no fixed 9333). Possibly a new record field and scoped id resolution.
- Persistence schema: Ephemeral record schema may gain an owner field. Old records can be treated as unowned. No durable data.
- Security/privacy: The control port stays loopback-only.
- Concurrency/lifecycle: Yes. Concurrent `start` race and readiness identity.
- Deployment/migration: None. Dev tooling only.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- |
| `ls $TMPDIR/autobyteus-isolated-app/` + record fields | Real parallel use today | Records from two different sources. One was forced to 9336 by hand. Both stale (no listener on 9333). | Collisions are real. Registry hygiene across worktrees matters. | This note, Source Log row "Runtime" |
| `lsof -iTCP:9333/9222 -sTCP:LISTEN` | Current listeners | None | Stale records make id-less `stop` fail with `INSTANCE_ID_REQUIRED` for everyone | — |

## Stakeholder And User Evidence

| Source / Actor | Need | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | Three (N) E2E engineers in different worktrees must each get their own port, without interfering | Direct statement | Automatic distinct ports, no cross-control | Whether a stable per-worktree port is wanted (DEC-001) |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Authority | Relevant Behavior | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Chromium `--remote-debugging-port=0` | Chromium/Electron | Binds a free port and writes `DevToolsActivePort` (port on line 1) into the user-data dir | Known Chromium behavior. Electron support must be verified. | If Electron does not write it for the configured `userData`, fall back to pre-select plus identity-verified readiness. |
| browser-automation CLI/MCP | `autobyteus_mcps` | Port per invocation via env. State keyed by port. | `config.py`, `recording/state.py` | None for code. Doc wording only. |

## Persisted Data And State Facts

- Affected subject: Ephemeral instance records in the OS temp dir (no durable product data).
- Acceptable loss: Old/stale records may be ignored or pruned. No migration is needed.

## Product Design Request Context

- Product Design request in the current input: `Not stated`

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether packaged Electron honors `--remote-debugging-port=0` and writes `DevToolsActivePort` under the e2e `userData` | Decides the race-free allocation mechanism | Architecture probe | Open |
| UNK-002 | Unknown | Whether a CDP target can be tied to its instance (e.g., renderer URL or `/json/version`) | Readiness identity check | Architecture probe | Open |
| RSK-001 | Risk | Agents keep copying `9333` from old docs or memory | Silent cross-control | Docs plus not defaulting to a well-known port | Open |
| RSK-002 | Risk | The external browser-automation SKILL.md still says 9333 | Minor confusion | Coordinated doc edit in `autobyteus_mcps` or follow-up | Open |

### Architecture-phase findings (SR-003, 2026-09-29)

| Source | Observation | Design Implication |
| --- | --- | --- |
| `autobyteus-web/scripts/electron-launch/launchPorts.mjs:51-64` | `selectListenerPort(undefined, {exclude})` asks the OS for a free port (`listen(0)` on `0.0.0.0`), rejecting ports below 1024 and 29695. `isPortAvailable` (`:22-30`) checks both `0.0.0.0` and `127.0.0.1`, because a loopback-only CDP listener does not always block a wildcard bind on macOS. | Auto control port = OS-assigned candidate, then confirmed with `isPortAvailable`. Reuse only; no change to this shared file. |
| `instanceLifecycle.mjs:102` | `isPortAvailable` is injectable via `processDeps`. `selectListenerPort` is imported directly (not injectable). | Make the free-port picker injectable (`processDeps.selectListenerPort`) so unit tests can script candidates. |
| `scripts/isolated-app/__tests__/instanceLifecycle.node-test.mjs:6,70-73,87,91-101,215,229` | Tests import `DEFAULT_CONTROL_PORT` and assert 9333 in results, args and list output. The busy-port test relies on the default. | These tests must move to "auto port" and explicit-port assertions. |
| `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs:251-330` | The real packaged probe always passes explicit `--control-port` (portA/portB/freePort). No scenario covers the default. | Add a real scenario: 3 concurrent starts without `--control-port`. |
| `instanceRegistry.mjs:65-68` | Id is `iso-<controlPort>-<hex>` | Still valid with auto ports. Record schema unchanged. |
| Docs with fixed 9333: `skills/autobyteus-isolated-app/SKILL.md:29,37,61-62`; `docs/isolated-app-instances.md:28,72,83,99-111,150-161,268`; `autobyteus-web/docs/electron_packaging.md:921`; `cli.mjs:13` usage; root `README.md:336-338` (id-less `stop`) | Guidance to update | Doc edits listed in the design |
| `/Users/normy/autobyteus_org/autobyteus_mcps/browser-automation/SKILL.md:36` | "(control port 9333)" and `CHROME_REMOTE_DEBUGGING_PORT=9333` example. The `autobyteus_mcps` main checkout (branch `main`) has **unrelated uncommitted changes** (`README.md` modified, `computer-use-mcp/README.md` deleted). `.claude/skills/browser-automation` symlinks to that checkout. | Make the DEC-003 edit in a separate `autobyteus_mcps` worktree/branch from `origin/main`. Do not touch the main checkout's working tree. |

## Requirement Implications

- The fixed default is the root cause (BEH-001). Automatic per-instance allocation is required.
- Distinct ports alone are not sufficient. The global unscoped registry (BEH-004), the unverified readiness (BEH-005) and the documented hardcoded port (BEH-006) each still let one engineer affect another.
- Browser-automation needs no code change. It must receive the instance's reported port.

## Notes For Architecture Design

- Verify UNK-001 with a real packaged worktree build: launch with `--remote-debugging-port=0` and read `<dataRoot>/electron/user-data/DevToolsActivePort`.
- Verify UNK-002. Otherwise identify the instance by probing CDP `/json/list` and confirming the page's backend (for example `Runtime.evaluate` of the renderer's configured server URL), or accept bind-verification via the `DevToolsActivePort` file.
- Owner key candidates: the repository root that hosts the invoked CLI (`path.resolve(webRoot, '..')`). This is the worktree when agents follow the skill's `pnpm --dir <root>` rule from their own worktree.
- Keep `launchPorts.mjs` semantics intact for `test:e2e:electron`.
