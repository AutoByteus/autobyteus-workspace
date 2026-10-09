# Testing AutoByteus

This is the testing guideline for the AutoByteus workspace. Read it before
planning validation for a change. It tells you which test layers exist, which
commands run them, which path to choose for a given change, and the rules every
test run must follow. Details live in the linked documents; this file is the
map.

## Test layers and commands

Run commands from the repository root unless noted. `pnpm -C <dir>` runs a
package's script from its own directory.

| Layer | What it proves | Command |
| --- | --- | --- |
| Web unit and component tests | Nuxt renderer components, stores, utilities (colocated `__tests__`) | `pnpm -C autobyteus-web test:nuxt` |
| Workspace native-to-web integration | Native producer/FIFO and saved/live web hydration at a workspace-owned test boundary (`test-support/native-input-history/`) | `pnpm test:native-input-history` |
| Electron main-process tests | Electron main, preload, launch profile, server manager, updater | `pnpm -C autobyteus-web test:electron` |
| All web tests | Both of the above | `pnpm -C autobyteus-web test` |
| Server tests | Backend unit, integration and E2E suites (Vitest) | `pnpm -C autobyteus-server-ts test` — one file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| Server unit / integration baseline | The green server `tests/unit` and `tests/integration` suites (see [Server unit and integration baseline](#server-unit-and-integration-baseline)) | `pnpm -C autobyteus-server-ts test:unit`; `pnpm -C autobyteus-server-ts test:integration:prepare` once, then `pnpm -C autobyteus-server-ts test:integration` |
| Server typecheck | Production `src` under the build type policy | `pnpm -C autobyteus-server-ts typecheck` |
| Core library tests | `autobyteus-ts` agent runtime, tools, LLM layer | `pnpm -C autobyteus-ts test` |
| Other packages | SDKs, contracts, message gateway | `pnpm -C <package> test` (each package with a `test` script) |
| Server E2E (deterministic) | Server E2E suite with its own test-owned database and runtime | `pnpm test:e2e` |
| Real-provider E2E | Configured external providers, explicitly | `pnpm test:e2e:real:preflight`, then `pnpm test:e2e:real` |
| Grok Build compaction live E2E | Real `grok` CLI automatic compaction (interrupted, then completed) and `/compact` through the server, with raw-trace rotation | `RUN_GROK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/grok-build-compaction-live.e2e.test.ts --no-watch` (temporary `GROK_HOME` with a symlinked `auth.json` and a 10% auto-compaction threshold; never writes `~/.grok`; one four-turn run on the user's Grok credits; set `GROK_E2E_EVIDENCE_DIR` to keep evidence on failure, never `auth.json`). Zero-credit replay of the same flows (automatic, Stop, `/compact`) through the real server with the fake Grok CLI, no gate: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/grok-build-compaction-replay.e2e.test.ts --no-watch` |
| Codex runtime live E2E | Codex App Server transport | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run`; the interrupted-compaction cases alone (interrupt, terminate and app-server crash during an automatic compaction): `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts --no-watch` (lowers the test app server's auto-compaction limit; a few turns of Codex quota per case); a send after the Codex app server crashed (the previous runtime is released, then the same thread is restored): `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-exit-resend.e2e.test.ts --no-watch` |
| Claude compaction live E2E | Real Claude CLI/SDK `/compact`, Stop and CLI process exit during compaction, raw-trace rotation and reopened history, on every installed Claude CLI (PATH and SDK-bundled) | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts --no-watch`; add `RUN_CLAUDE_AUTO_COMPACTION_E2E=1` for the costly auto-compaction case (~300K input tokens) |
| Claude background-task live E2E | Real Claude CLI/SDK background Bash tasks for a standalone agent and a team member: `BACKGROUND_TASK_UPDATED` snapshots with the shell `command` (explicit background and CLI auto-background, which the test enables itself), completion, failure, Stop+terminate and CLI crash, on every installed Claude CLI (PATH and SDK-bundled) | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-background-task.e2e.test.ts tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts --no-watch` |
| Delegated background-task idle shutdown live E2E | A delegated copy is not idle-shut-down while its background task runs (grace set to 60 s by the test), then is shut down one grace period after it is quiet. Claude (Team root, Claude coordinator): a `run_in_background` task longer than the grace completes, the copy reports to its delegator, then goes offline. AGY (Team root, Claude coordinator, AGY worker): a daemon running 180 s outlives two grace periods with the same AGY process and answers a follow-up; its own exit finishes the task and the copy goes offline one grace period later | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts --no-watch` (optional `CLAUDE_E2E_TOOL_MODEL`, default `haiku`); `RUN_AGY_BACKGROUND_E2E=1 RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts --no-watch` (optional `AGY_E2E_MODEL`; leave `ANTIGRAVITY_CLI_COMMAND` unset). `DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR` keeps JSON receipts. About 4 and 6 minutes; uses Claude and AGY quota |
| Antigravity (AGY) runtime E2E, fake CLI | AGY stream conversion through the real server (WebSocket, history, Files, compaction rotation in `agy-compaction-rotation-transport.e2e.test.ts`, compaction version gate off in `agy-compaction-gate-off-transport.e2e.test.ts`, Stop then an immediate send for a standalone run and a Team member in `agy-interrupt-resend-transport.e2e.test.ts`, uploaded/pasted context files reaching AGY's stdin text for a standalone run and a Team member in `agy-context-files-transport.e2e.test.ts`, and Token Meter usage in `agy-token-usage-transport.e2e.test.ts`: the `usage_report` case replays the 11 `result` events of a recorded AGY 1.2.16 run, whose `input_tokens` excludes cache reads, and the run record must count gross = input + cache read and miss = input) with a scripted CLI; no model call. `AGY_FAKE_VERSION` overrides the fake CLI's `--version` output | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<absolute path>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/<file> --no-watch` |
| Antigravity (AGY) runtime live E2E | The installed `agy` CLI with real model calls | One variable per file, named in the file header: `RUN_AGY_E2E=1`, `RUN_AGY_CAPABILITY_E2E=1`, `RUN_AGY_BACKGROUND_E2E=1`, `RUN_AGY_CONTEXT_FILES_E2E=1` (`agy-context-files-live.e2e.test.ts`: uploaded and pasted images and a note opened with `view_file` and answered from their content, standalone and Team member), `RUN_AGY_RECOVERY_E2E=1` (`agy-runtime-stop-recovery-live.e2e.test.ts`: crash, terminate and shutdown recovery, plus Stop mid-turn then an immediate send for a standalone run and a Team member, `LIVE-STANDALONE-INT` and `LIVE-TEAM-INT`) or `RUN_AGY_COMPACTION_E2E=1` (automatic compaction from ~90K-token turns; uses AGY quota, leave `ANTIGRAVITY_CLI_COMMAND` unset; add `AGY_COMPACTION_E2E_CHECKPOINTS=2` to continue until a second compaction), then the same `vitest run` command |
| Browser dev-path probes | Renderer journeys in headless Chrome | `pnpm -C autobyteus-web test:e2e:<name>` (scripts in `autobyteus-web/package.json`, sources in `autobyteus-web/tests/e2e/`) |
| Composer voice lifetime regression | Unchanged Team publication vs genuine destination cancellation through run/Chat composers and native browser capture | `pnpm -C autobyteus-web test:e2e:composer-voice-lifetime --output-dir <fresh-dir>` |
| Packaged Electron harness | Packaged app launch, isolation and cleanup | `pnpm -C autobyteus-web test:e2e:electron`, `test:e2e:electron:isolation`, `test:e2e:isolated-app` |
| Team Reload member freshness (real product) | Completed local source edits, cold/warm scoped/shared member inspection, repeated Reload, required-read error/retry, source preservation and owned cleanup | `pnpm -C autobyteus-web test:e2e:team-reload-member-freshness` |
| Isolated desktop instances | The real desktop app, driven like a user | `pnpm --silent isolated-app start --build` (then drive with the browser-automation skill; `pnpm --silent isolated-app stop`) |
| iOS wrapper (macOS + Xcode) | Release contract, core unit tests, and simulator UI smoke against a fake node (the same UI tests gate `release-ios.yml` before upload) | `python3 autobyteus-ios/scripts/ios-release-contract-check.py`; `autobyteus-ios/scripts/ios-simulator-smoke.sh <evidence-dir>`; slow-host reproduction with `fake-mobile-server.py --status-delay-seconds` as described in [autobyteus-ios/README.md](autobyteus-ios/README.md) |

Notes:

- **Workspace native-to-web integration** is owned by `test-support/`, outside
  the web package. The web must not depend on the core, including its local
  test setup. Do not move a core import into a web test-only folder or hide it
  behind an alias, dynamic import, server re-export or helper.
  `pnpm test:native-input-history` first runs the unchanged web boundary guard,
  then an explicit workspace harness using the existing Nuxt test environment.
  It uses current core `dist` outputs (build changed core source first with
  `pnpm -C autobyteus-ts build`) and controlled model/provisioning/Apollo doubles.
  Both native Agent and hosted-Team cases retain fresh raw-history, FIFO and
  hydration assertions. They do not prove HTTP or packaged renderer reload.
  Web guard contract checks run with `pnpm -C autobyteus-web test:nuxt
  tests/integration/web-boundary-guard.integration.test.ts --run`.
  A guard pass is only a build prerequisite, not a full build or product pass.
- **Real-provider credentials** live in the encrypted vault of the target
  database. Provision them with the importer, never by editing `.env` files:
  `pnpm secrets:import -- --source <file> --database-url file:<absolute db path>`
  (answer the `IMPORT` prompt; agents without an interactive terminal can wrap
  the command in `script -q /dev/null …` on macOS or `script -qc "…" /dev/null`
  on Linux). Preflight reports what is configured; missing capabilities are
  reported, never counted as passed. See
  [Secret Management](autobyteus-server-ts/docs/modules/secret_management.md).
- **Browser dev-path probes** document their prerequisites in the file header.
  Most start their own Nuxt dev server against mocked backend routes; others
  take a `--base-url` of a running frontend. For a real local stack use
  `pnpm dev` (backend `http://127.0.0.1:8000`, frontend
  `http://127.0.0.1:3000`); see
  [Local full-stack development](README.md#local-full-stack-development).
- **Isolated desktop instances** are full AutoByteus desktop apps with their
  own ports and data folder. Start, control, screenshot, record and stop them as
  described in [Isolated AutoByteus Instances](docs/isolated-app-instances.md).
  Control them with the browser-automation skill
  (`autobyteus_mcps/browser-automation`), using
  `CHROME_REMOTE_DEBUGGING_PORT=<controlPort>` (as reported by `start`) and
  `BROWSER_AUTOMATION_ATTACH_ONLY=1`.

### Server unit and integration baseline

The server `tests/unit` and `tests/integration` suites and the `typecheck`
script are expected to pass on the base branch. A failure there is caused by
your change, or it is a new base failure to fix under Rule 9. From the
repository root, after `pnpm install`:

```bash
pnpm -C autobyteus-server-ts prebuild
pnpm -C autobyteus-server-ts test:unit
pnpm -C autobyteus-server-ts test:integration:prepare   # once per worktree, and after changing server or SDK source
pnpm -C autobyteus-server-ts test:integration
pnpm -C autobyteus-server-ts typecheck
```

- **Integration prerequisites.** Some integration tests load build outputs: the
  server `dist` watcher runtime, the application SDK and devkit `dist`, and the
  Brief Studio importable package. `test:integration` checks them first. If any
  is missing, it names the missing files and the prepare command, and exits
  before running the suite. `test:integration:prepare` builds them in order.
  It packs Brief Studio with the devkit CLI directly, so no re-install is
  needed for the `autobyteus-app` bin. The SDK and Brief Studio `dist/`
  folders are untracked build output; stage paths explicitly.
- **Environment isolation.** Agent shells inherit the live app's variables
  (data, memory and database paths, package/skill roots, settings, provider
  modes and keys). For every file under `tests/unit/` and `tests/integration/`,
  `tests/setup/test-environment-isolation.ts` removes every variable except
  system essentials and test-owned knobs before the file imports anything. The
  knobs are opt-in gates and fake-CLI or fixture inputs such as `RUN_*`,
  `TEST_*`, `FAKE_*`, `AGY_*` and `ANTIGRAVITY_CLI_COMMAND`. The same commands
  therefore give the same results in any shell and never resolve to
  `~/.autobyteus`. Tests that need an app variable set and restore it
  themselves. When you add an opt-in gate variable to a unit or integration
  test, add its name to `TEST_ENVIRONMENT_ALLOWLIST`. E2E and the other test
  folders keep the inherited environment.
- **Opt-in gates.** Live tests stay skipped unless their gate is set, for
  example `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, `RUN_LMSTUDIO_E2E`, `AGY_LIVE`,
  `RUN_GITHUB_AGENT_PACKAGE_E2E` and the Google MCP credentials. Platform-gated
  tests (Windows/WSL) skip elsewhere. A skip is not a pass for that capability.
- **Typecheck scope.** `typecheck` runs `tsc -p tsconfig.build.json --noEmit`,
  the production compilation unit that `pnpm build` compiles, with semantic
  checking on. Test files are not type-checked yet; their existing type errors
  are a separate follow-up.
- **Known exception.** Two cases in
  `tests/integration/agent/agent-status-websocket.integration.test.ts` (the
  content-cadence window cases) fail because of a reported product defect: an
  `AGENT_INPUT_STATE` frame published after every event batch flushes the
  content cadence buffer early. They are not skipped. Remove this note when
  that defect is fixed.

### Event Monitor Native File Preview Regression

Run `pnpm -C autobyteus-web test:e2e:event-monitor-file-preview --output-dir <fresh-dir>`.
This builds the current worktree by default and owns an isolated desktop instance,
free ports, private data and A/B/C file fixtures. Graphical macOS/Linux, a non-root account and installed
dependencies are required; no model credentials are used. `--skip-build` is valid
only for a verified source-current worktree artifact, never the installed user app.
Optional `--ledger-file <initialized-absolute-path>` records each case immediately.

Saved Org/member projections and initial metadata failure are controlled at GraphQL;
subsequent metadata/registration HTTP, Markdown action, lazy monitor, shell, Files,
preload/main and native file bytes are real. Cases assert selected null-ID recovery,
one-activation visible read-only content/error, full metadata, focus/Escape/Return,
other-tab preservation/dedupe, owned permission-denied errors, actual relative-content
HTTP/path denial, no writes and stale metadata after member navigation.
Narrow/short/wide-hidden presentation cases use CDP **renderer device-metrics
emulation**, not OS window resizing. Remote/mobile containment has colocated owner
coverage; this probe does not certify a paired phone, remote native window, exact
installed user state, permission dialogs or other operating systems. Inspect retained
JSON/DOM-backed case results, screenshots and cleanup receipts: only owned resources
are removed, and both reported ports must be free.

### Team Reload Member Freshness Regression

Run `pnpm -C autobyteus-web test:e2e:team-reload-member-freshness` from the
repository root. This probe builds the current worktree's packaged app by default,
starts its own isolated instance, imports disposable sources through the normal
UI, and asserts real source/HTTP/DOM behavior. Only one required Agent read is
fault-injected to verify loading, visible failure, and same-button retry.
No model credentials are needed. Prerequisites are installed workspace
dependencies, a graphical macOS/Linux environment, and isolated-launch support;
Linux execution requires the display setup described in the isolated-instance
guide (the initial validation was macOS only).

`--skip-build` is valid only when this worktree's packaged artifact was rebuilt
from its current source; never reuse an installed app or a pre-change binary as
proof. Use `--output-dir <dir>` for retained JSON, HTTP responses, DOM, screenshots,
and launch/cleanup logs. Relative output paths resolve from `autobyteus-web/`;
the default is `autobyteus-web/test-results/team-reload-member-freshness`.
The optional `--ledger-file <absolute-path>` appends case results as they finish.
The probe stops its exact instance and removes its own data/source fixtures on
success or failure. Inspect cleanup results as well as case results; unrelated
instances and the user's app/data must remain untouched.

### Project Mutation Regressions

From the repository root with installed workspace dependencies:

```bash
pnpm -C autobyteus-server-ts prebuild
pnpm -C autobyteus-server-ts build
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts tests/e2e/projects/project-mutation-node-locality.e2e.test.ts --no-watch
```

The HTTP boundary suite covers selected native/MCP Project creation and partial
metadata/link replacement, strict validation/authorization/collision and exact
Project/Task/context/assignment/registry/folder preservation. Original Task and
full-form API coverage remains. The sibling node-locality suite and
`tests/fixtures/project-mutation-http-node.mjs` use **current dist**, two private
HOME/data/SQLite nodes and free ports, real public registration/HTTP/GraphQL,
direct MCP Project tool calls and graceful restart. Rebuild before running it; do not use
an installed or pre-change backend. Serialize shared-output builds in the same
worktree: clean/rebuild operations can invalidate another build's module graph.

Session/actor acquisition is scripted; the stored assignment is representative
current-format state, and the opaque history sentinel proves non-interference
only. This is not live delegation/history replay, managing-agent Chat/`@`, desktop,
paid inference or explicit user-verification proof. Absolute node-local folder paths
and the complete desired list are caller inputs. Project Save needs no workspace
registration or folder existence; global workspace registration IDs remain unchanged.
The suites assert path-only acknowledgements/storage, canonical duplicates and
invalid-patch atomicity, no registration/mkdir side effects, equal-path references
on separate nodes and Project-identity isolation. Historical migration fixtures
retain their released ID/timestamp fields; current reads project paths without
rewriting them and ordinary Project saves emit only path/description.
Inspect actual saved-value and cleanup receipts: owned children must exit,
listeners close and private roots disappear. Never use the user's app/data.

### Project and Task Description Voice Regression

Run the full Projects browser/API probe with optional native-browser voice cases:

```bash
pnpm -C autobyteus-web test:e2e:projects --voice-input --output-dir=<fresh-directory>
```

The existing probe builds this worktree's server, creates disposable SQLite
nodes, and owns Nuxt/Chrome and cleanup. Its core cases also prove picker/manual
path authoring, exact two-field Project JSON, no Save registration, special-character
path edit/unlink/reload and canonical duplicate/invalid-patch rejection. Chrome
and installed dependencies are required; `--skip-server-build` is valid only after a current-worktree server build.
`--ledger-file=<initialized-absolute-path>` appends every case's result. Relative
output paths resolve from `autobyteus-web/`; existing output directories are refused.

The six optional cases use real project/task routes, editors, voice store,
native browser capture/AudioWorklet and real API/database reads/writes. They cover
create/edit append, typing and explicit save, optional blank descriptions,
quiet success, error/no-speech retry, recording cancellation and late-result
rejection after navigation. Extension discovery and transcription IPC are fixture
responses; Chrome supplies synthetic microphone input with a test permission
grant. This does not prove physical microphones, OS permission dialogs, model
quality, Electron IPC or packaged-shell behavior. No user app/data is used.

### Composer Voice Lifetime Regression

Run from the repository root after installing workspace dependencies, building
the required workspace contracts and running
`pnpm -C autobyteus-web exec nuxt prepare`:

```bash
pnpm -C autobyteus-web test:e2e:composer-voice-lifetime --output-dir <fresh-evidence-directory>
```

The durable CLI and fixture live in `autobyteus-web/tests/e2e/`. Chrome must be
available; pass `--browser-executable <path>` or set
`PLAYWRIGHT_CHROME_EXECUTABLE_PATH` if it is not discovered. Relative output
paths resolve from `autobyteus-web/`; the default is
`autobyteus-web/test-results/composer-voice-lifetime`. An existing `evidence.json`
or installed probe page is refused rather than overwritten. Optional
`--ledger-file <initialized-absolute-path>` appends case progress; initialize
that file before running and keep evidence in the ticket or test-output folder.

Seven journeys exercise the actual run and Chat composer callers, Team
publication/projection and selection stores, voice adapter/button/store, native
media APIs and production AudioWorklet. They assert repeated background
publications preserve capture past startup, manual/keyboard Stop appends once
to an existing draft without Send, startup/pending-transcription refreshes
preserve the owner, and genuine member changes/unmount dispose capture or
reject late results. Exact-context, eligibility, binding and multiple-owner
guards are additionally covered by the colocated adapter tests and
`tests/integration/composer-voice-lifetime.integration.test.ts`.

The probe owns a free-port Nuxt server, temporary fixture route, fresh headless
Chrome and synthetic PCM microphone input with a test permission grant. Team
events enter the actual view locally; transcription IPC/results are fixtures.
This is renderer/native-browser proof, not real microphone/OS permissions,
network Team producer, official model/native Electron IPC, packaged desktop,
full Team/mobile product or comprehensive accessibility certification. It never
uses the user's app/data. Inspect `evidence.json` case results, page errors and
cleanup receipts as well as screenshots: the probe disposes native capture,
closes owned Chrome, terminates its exact Nuxt process group/listener and removes
its temporary page on success or failure.

See [Capture Startup And Ownership](autobyteus-web/docs/electron_packaging.md#capture-startup-and-ownership)
for the stable exact-destination sink contract; wrapper recreation alone is not
a destination change.

### Antigravity Native Argument Capture Regression

From the repository root, with installed dependencies and the current workspace
build outputs, run:

```bash
RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts --no-watch
```

This deterministic suite uses the real Studio HTTP/WebSocket, recorder, history
and GraphQL restore paths; only the external CLI/model is emulated. It creates
its disposable HOME before provider modules load and owns its server, data,
workspace, sockets and CLI processes. Do not substitute the user's provider
conversation or application data. Without the opt-in flag and executable fake
CLI, the suite skips; a skip is not argument-capture proof.

Assertions cover typed first STARTED and immediate raw-disk inputs before a
terminal event, repeated same-path edits, verified command-prefix expansion,
background-close snapshot reuse, source-free saved history, and actual
terminate/restore with exact CLI conversation binding. Future enriched calls
must preserve the old summary-only raw prefix and projected entries. Missing or
ambiguous detail must complete with verified summaries, not count as successful
full-input capture. The companion `agy-failure-cli-routing.test.ts` under
`tests/unit/agent-execution/backends/antigravity/` protects coexistence of native
argument, runtime-error and existing fixture routes.

Fake-CLI coverage does not prove installed-provider input availability or
rendered Activity. For those boundaries, separately compare actual native inputs
to first canonical events, raw history and live/reloaded production rendering
using owned services and data. Web-equivalent browser evidence is not packaged
Electron navigation/restart or explicit user verification. See the
[AGY runtime contract](autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md).

### Scoped Org History And Publication Regressions

Build the current server and its shared dependencies before built-process
history checks (cleaned SDK outputs must be recreated):

```bash
pnpm -C autobyteus-server-ts prebuild
pnpm -C autobyteus-server-ts build
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts --no-watch
RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts --no-watch
```

The first suite exercises public scoped/list history, guards, stored identities
and bytes through Stop/restore/restart with a controlled native model. The
second uses actual HTTP/WebSocket/scoped MCP admission, owned references,
Agent/Team task publication, ACKs, reconnect and persisted conversation/tree
continuity; only the external actor is scripted. Both own their server/data and
cleanup. Neither substitutes for exact Codex/GPT model configuration or
packaged performance proof, or proves paid/live inference. The shared AGY
fixture's native-argument and scoped-MCP CALL_TOOL modes must coexist; run the
native-argument regression above when integrating changes to that fixture.

The native outer fixture's current admission factory and acquired-resource
cleanup are checked separately with
`tests/integration/standalone-agent-run-root/native-root-fixture-cleanup.integration.test.ts`.
Its five cases cover defined successful/rejected setup paths after the
underlying native fixture returns and preserve the original setup error. They
are not an exhaustive infrastructure-failure guarantee; keep the workspace
native-to-web and shared compaction/termination assertions intact.

### Project Task Agent Run Resources And Projects Migration Regressions

Start with the current worktree and the smallest relevant server layer:

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-collaboration tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/integration/standalone-agent-run-root/native-root-termination.integration.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects --no-watch
```

What these suites cover:
- **Project unit tests.** The per-folder store and Delete, which keeps
  `agent_run_resources.json`. Task agent run resources: roles, link-before-
  resources, closed until the assigner reactivates, current assignments versus
  `assignmentsUnavailable`, and the damaged-file policy (Q-3). Also saved-ID
  payloads, compact business results, DONE close-then-stop, retry by repeated
  DONE with nothing about the stop persisted, and reopen. Reactivation (reopen
  the Task, then the assigner messages the run ID) is covered on the Task side by
  `tests/unit/projects/task-agent-resource-reactivation.test.ts` and in the
  runtime by `tests/unit/agent-collaboration/root-task-reactivation.test.ts`
  (sequencing and refusals) and `task-reactivation-backends.test.ts` (actual
  registries for all three root kinds).
- **RootTeam/catalog helper integration.** Same-address helpers isolated per
  Task, borrowed advisers that are never adopted, exact stop sets, and closed
  ingress.
- **Native hosted children.** Their own admission and termination boundary.
  The Native fixture lives under `standalone-agent-run-root/`, not the retired
  `agent-run-collaboration/` location.
- **Migration unit test and `projects-startup-migration.e2e.test.ts`.** The
  STARTUP_ONLY `20261005_projects_per_folder_v1` migration: released fixtures,
  invalid/residue/duplicate/conflict skips, the retained
  `projects.pre-folders.json`, retry after a failed move, and the no-op on
  restart. The e2e runs it through **both** startup entrypoints (Studio and the
  standalone host). The `PROJECTS_MIGRATION_PENDING` gate must block only
  Projects, never the rest of the app.
- **The e2e needs a rebuilt dist.** It drives the built startup entrypoints, so
  rebuild before running it. The rebuilt `dist/` of the application SDK
  packages and `autobyteus-web/electron-dist/` are untracked build output.
  Stage paths explicitly; never `git add -A`.

Task closure in the Workspaces tree (a Task's runs leave the tree when it
becomes DONE, for Agent, Team and Org roots) has two durable checks beyond the
unit suites. The server E2E is gated like the sibling scripted-AGY suites and
skips cleanly when not gated, so it is part of `tests/e2e/projects` but needs
the variables to actually run. The browser probe drives a probe-owned built
backend and Nuxt dev server, so rebuild the server first.

```bash
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-closure-root-visibility.e2e.test.ts --no-watch
pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh evidence dir>
```

- **`task-closure-root-visibility.e2e.test.ts`.** At the real server/wire
  boundary for all three roots: `task_executions_closed` /
  `TASK_EXECUTIONS_CLOSED` is published before the first stop frame, the
  snapshot and stored reads carry `closed_task_executions`, a repeated DONE
  re-publishes, a root that was stopped at DONE shows the closure on its next
  read, and Task delete keeps the closure. Conversations and files stay on disk.
- **`test:e2e:task-closure-tree`.** In a real browser: the leave motion (fade and
  collapse, instant under reduced motion), selection and focus hand-off (to the
  Agent run row, or to the delegating Manager in a Team or Org), the last task
  rows under an Agent run, the Team tab keeping messages, and closed runs staying absent after
  reload and a real backend restart. The probe cleans up its own processes and
  data root; check `cleanup` in its `evidence.json`.

Reactivation (after DONE the agent reopens the Task, then the assigner messages
the run ID `delegate_task` returned) has the same two layers:

```bash
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts --no-watch
pnpm -C autobyteus-web test:e2e:task-closure-tree --cases BR-008,BR-009,BR-010,BR-011 --output-dir <fresh evidence dir>
```

- **`task-reactivation-root-visibility.e2e.test.ts`.** Real HTTP/WS/scoped MCP
  with the scripted AGY actor, in all three roots. It covers:
  - `target_kind` (`agent` / `team`) on `delegate_task` results;
  - while the Task is DONE, a message is refused with the reopen-first hint and
    the Task files are byte-identical;
  - a status change alone reopens nothing;
  - helper, non-assigner (a Task copy or a configured teammate) and Team member
    refusals;
  - the assigner's message reopens exactly the worker:
    - one `task_executions_reopened` / `TASK_EXECUTIONS_REOPENED` event;
    - the snapshot without it;
    - the same run, its earlier conversation and its provider-conversation
      binding;
    - only its `closedAt` back to `null`; `task.json` untouched;
  - an unchanged second message;
  - DONE → TODO → reactivate again;
  - a Team copy restored as a whole via its coordinator;
  - a deleted Task (`TASK_NOT_FOUND`);
  - a Task with no Project reopened by `task_id`;
  - a DONE from another root racing the message. Every allowed ordering leaves
    a DONE Task with a closed entry, no live worker process and refused input.

  CLS-E2E-001/002 (Agent and Team roots) run the same journey with CANCELLED
  (dropped as not needed): live closure and no live worker process, a repeated
  CANCELLED re-publishing with no file change, `delegate_task {task_id}` and the
  run-ID message refused naming CANCELLED, DONE ↔ CANCELLED as a repeated DONE,
  reopen (nothing starts) and the assigner's reactivation, a Task with no
  Project cancelled by `task_id`, and every `/ws/projects` frame (CANCELLED views
  included) matching the strict server schema.

  With `RUN_CLAUDE_E2E=1` and a logged-in `claude`, one more case gives the
  worker a real Claude model. It must recall a codeword from before DONE.
  `TASK_REACTIVATION_E2E_EVIDENCE_DIR` keeps a JSON receipt.
- **`test:e2e:task-closure-tree` BR-008..BR-011.** In a real browser for Agent,
  Team and Org roots:
  - nothing reappears while the Task is DONE or on a status change alone;
  - the assigner's message brings the worker row back live, and a Task Team
    and its members via the coordinator;
  - helpers stay hidden;
  - the conversation continues and a fresh load keeps the rows.

  BR-011 (needs BR-008..010 in the same run) adds two real backend restarts. The
  rows survive the first; then DONE, a restart, reopen and a message reactivate
  the worker live with its whole conversation. Before sending to a stopped
  root, the probe calls the root's restore mutation, as the app does.

Live Projects pages, Task roots and Temp tasks (the per-node `/ws/projects`
feed) have a gated server E2E and a browser probe. Rebuild the server first.

```bash
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-change-feed.e2e.test.ts --no-watch
pnpm -C autobyteus-web test:e2e:project-manager-ux --output-dir <fresh evidence dir>
```

- **`project-change-feed.e2e.test.ts`.** At the real server/wire boundary:
  - **Feed contract:** `connected` first on every connection; no replay; broadcast to every client. A rejected `access_token` closes the socket exactly like the sibling sockets (4401). Every frame of the run must match the strict server schema.
  - **Write paths:** an agent's own tool writes (Project, Task, status, DONE) and UI writes arrive live. The feed's view of each Task must equal the GraphQL snapshot (roots included).
  - **Agent root:** named, hosted and started, with worker status `running` → `idle` (never a final Initializing after a wake). The worker's helper is never the root. DONE views arrive in commit order and end Offline. A reopen stays Offline until the assigner's message reactivates the worker.
  - **Start failure:** a real one (a Team member configured with a model its runtime does not offer) yields a failed root with its reason. Re-delegation replaces it.
  - **Other roots:** a task Team root, and an Org-hosted root.
  - **Temp tasks:** the no-Project scope through DONE, reopen and reactivation. Deleting the chat removes its Temp tasks.
  - **Load:** a UI write on a 60-Task Project with a busy worker arrives within 2 s.

  `PROJECT_CHANGE_FEED_E2E_EVIDENCE_DIR` keeps a JSON receipt with frame counts.
- **`test:e2e:project-manager-ux`** (PMU-001..PMU-016) in a real browser:
  - live list, board and highlights;
  - root lines and opening them for Agent, Team and Org hosts;
  - DONE → Offline;
  - a deleted host;
  - Temp tasks;
  - F-006;
  - restart and reconnect, and narrow layouts;
  - left-panel state across pages, and every row kind opening from Projects;
  - Temp reopen → Offline → reactivation, then deleting the chat from the left panel;
  - a rendered "Couldn't start" from a real start failure;
  - two windows on one node;
  - an Org-hosted root opened before its Org run is loaded.
  - compact cards for real-length descriptions (~10,000 words; multi-line) on the Project board and Temp tasks at 1440 and 1024 px: ≤2+2 rendered lines, short labels, full text on the Task pages (PMU-013).
  - compact-card edges at 1440, 1024 and 390 px: exactly 2 lines, a CJK hard cut, a 5,000-character unbroken token without horizontal overflow, a long card keeping its context-file and worker lines, and a short delete-confirmation summary (PMU-014).
  - Cancelled Tasks (PMU-017): an agent's CANCELLED hides the row live behind a "Cancelled (N)" toggle right before Refresh (absent at 0, `aria-pressed`, Enter/Space), which shows the Cancelled lane as the last column after Done (four equal columns at 1440 px, stacked last at 390 px and in the right panel); search ignores hidden Cancelled Tasks; a muted "Cancelled" pill unlike Done; card open counts; a live reopen back to To Do; the Temp tasks board, header count and page; the right-panel board and Task detail.
  - the right-panel Projects tab (PMU-015):
    - first tab, with a live board beside the chat;
    - a worker opens in the center and the tab stays selected;
    - card → detail → back;
    - the choice is remembered after reload.
  - the Projects tab in Team and Org conversations, with the tab kept when a worker opens, and at a constrained width the strip and drawer list Projects first (PMU-016).

  Every case fails on any browser error. PMU-007 allows errors only while the backend restarts. On failure, `evidence.json` keeps each page's URL, center text and its last console lines. PMU-004 and PMU-007 depend on earlier cases in the same run.

  Before the first case, the probe warms the Nuxt dev server. It visits its routes and waits until the server has stopped re-optimizing dependencies (`evidence.warmup`). On a cold cache, that "optimized dependencies changed. reloading" can wipe a page's first reads, such as the left panel's run history. The packaged app has no such reload.

Idle shutdown of delegated copies with runtime background tasks has a gated
server E2E for all three roots (about 3 minutes, no model calls):

```bash
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts --no-watch
```

- **`task-copy-idle-lifetime.e2e.test.ts`.** Real HTTP/WS/scoped MCP, idle-shutdown
  lifecycle and AGY background-task monitor; the scripted AGY actor's
  `BACKGROUND_STEP:{"seconds":N}` route leaves a daemon step open at turn end
  and writes AGY's exit message after N seconds (under a disposable `HOME`).
  The grace setting is stored at its 60 s minimum. In the Agent, Team and Org
  roots at once:
  - an Agent copy and a Team copy (its coordinator) with a 100 s step are not
    shut down while it runs, and are shut down one grace period after it exits
    (no turn follows an AGY exit);
  - a quiet copy is shut down after one grace period and the Manager's message
    restores it (a relaunch with `--conversation`);
  - Task DONE and root stop stop copies whose step still runs, at once.

  Shutdown is proven by the copy's CLI process disappearing as well as by
  `offline` on the root's view. `TASK_COPY_IDLE_LIFETIME_E2E_EVIDENCE_DIR`
  keeps a JSON receipt with the measured times.

Delegated Team copies start only the members that work reaches. A gated
server E2E covers this for all three roots (about 2 minutes, no model calls):

```bash
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts --no-watch
```

- **`delegated-team-lazy-member-activation.e2e.test.ts`.** Real HTTP/WS/scoped
  MCP, Task services, root lifecycle and the AGY backend, with the scripted AGY
  actor. AGY starts one CLI process per activation, so the launch log
  (`AGY_FAKE_ARGV_LOG`) counts provider sessions exactly. In the Agent, Team
  and Org roots, a 4-member copy is delegated (by `task_id` in the Agent root,
  by description in the others). The suite checks:
  - only the coordinator launches; the other members have no process, a
    `null` saved binding and `offline` in the root view's `agent_statuses`;
  - a teammate message starts only its recipient;
  - Agent and Team roots: a copy member delegating the Team creates a
    Team-hosted copy, and only its coordinator starts;
  - Org root: a member whose model was retired after the Org was configured
    (`AGY_FAKE_EXTRA_MODELS` offers it only during creation) fails the sender's
    delivery with `AGENT_RUN_ACTIVATION_FAILED` naming the cause, shows `error`
    and one conversation error card, while the coordinator keeps working;
  - idle shutdown (grace stored at 60 s), Task DONE → reopen → reactivation,
    and a stopped root whose saved tree has the pre-fix shape (an unused member
    bound with no conversation) each resume only the lead (`--conversation`),
    and that member's first work starts a fresh session;
  - a coordinator that cannot start fails `delegate_task` and launches no
    member.

  `DELEGATED_TEAM_LAZY_E2E_EVIDENCE_DIR` keeps a JSON receipt. With
  `RUN_CLAUDE_E2E=1` and a logged-in `claude`, one more case delegates an Org
  Team whose members run on real Claude (haiku): only the coordinator gets a
  Claude session. With `RUN_CLAUDE_E2E=1` the whole suite, not only that case,
  runs under your real `HOME` (the CLI reads its login there); otherwise the
  suite runs under a disposable `HOME`. Status checks
  accept a member that went idle and was then shut down by the 60 s grace
  before the check (a slow step on a loaded host); the receipt lists each such
  case under `graceShutdownAccepted`.
  The rendered tree is covered by `test:e2e:task-closure-tree` BR-008..BR-010:
  right after delegation, the Task Team's coordinator row renders Idle and the
  member no work has reached renders Offline.

`@` delegation and ad-hoc Tasks (Tasks with no Project, created by a described
`delegate_task` and closed by `create_or_update_task({task_id, status: "DONE"})`)
have a gated server E2E beside the closure suite and a live browser probe:

```bash
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts --no-watch
env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS \
  RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts --no-watch
pnpm -C autobyteus-web test:e2e:cross-scope-agent-mentions --runtime claude_agent_sdk --output-dir <fresh dir>
```

- **`ad-hoc-task-delegation.e2e.test.ts`.** Real HTTP/WS/scoped MCP with the
  scripted AGY actor, for all three roots. The hosts have no Project tool
  selected. It covers:
  - a `@` send adds no collaborator and stores the `delegate_task` note;
  - `delegate_task` returns `task_id` and writes a text-only
    `<appData>/ad-hoc-tasks/<id>/`;
  - the copy's own sub-delegation stays in that Task;
  - the strict `create_or_update_task` modes (`project_id` with `task_id`
    rejected, unknown id, create without a Project, a Project Task patched by
    id);
  - DONE by `task_id` alone: a live closure, a fenced run-ID message, and a
    repeated DONE;
  - Projects listing excludes the ad-hoc Task;
  - delegation and DONE while `projects/projects.json` (the pending migration)
    exists;
  - a brought-in collaborator survives Stop/restore;
  - definitions already in the run (that collaborator; a Team/Org run's
    configured members) are `@` candidates, while the run's own definition is
    not offered to the run itself (the host, or a Team/Org run). Mentioning one
    stores `…, already in this run` with the in-run guidance and adds nothing;
  - permanent delete removes only that run's ad-hoc Tasks.

  Set `AD_HOC_TASK_E2E_EVIDENCE_DIR` to keep a JSON receipt. The in-process
  server inherits `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` (and the skill and
  application root variables) from your shell and then lists those packages as
  candidates too. It only reads them, but prefix the command with
  `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`
  for a run that does not depend on your machine.
- **`delegated-copy-member-contact-host.e2e.test.ts`.** The same server and
  scripted AGY actor. One standalone Agent run (the host) delegates a Team copy
  and an Agent copy, and the members of those copies contact the host:
  - DCM-001: `@` candidates per `focusedAgentRunId`. The host never sees itself.
    A copy member sees the host plus exactly the host's list. An Agent-root
    query without `focusedAgentRunId` is an error.
  - DCM-002/003: the user's `@<host>` post to a not-yet-started copy member
    stores the `the run's own agent` note with the `send_message_to` sentence
    and adds nothing. The member's `send_message_to(<host address>)` then
    reaches the existing host run.
  - DCM-004: `list_available_agents` lists the host for copy members, not for
    the host, and a message to the listed address reaches the same host run.
  - DCM-005: `delegate_task` to the host is refused, with no copy or
    collaborator added.
  - DCM-006: the host's own `@<host>` and an ineligible mention are rejected.
  - DCM-007: after Stop, the stored run answers per focused agent, and a
    restored member's message reaches the same host run.

  Set `DELEGATED_COPY_CONTACT_E2E_EVIDENCE_DIR` to keep a JSON receipt.
- **`test:e2e:cross-scope-agent-mentions`.** The same journeys with a real
  model, browser, Nuxt and built backend. It needs a logged-in Claude or Codex
  CLI (`--runtime codex_app_server`). Reporting copies may be closed by their
  delegator on its own; the user-driven close is asserted on a copy that never
  reports. It includes Stop, a real backend restart, a stored bring-in
  collaborator that is then `@`-mentioned (listed, noted as already in the run,
  never duplicated), Team/Org/New chat menus that offer configured members, the
  menu and notice copy, an ineligible mention, first-send mentions and the
  permanent delete. `--ledger-file <abs path>` appends case results. `L01`/`L02` need
  `--runtime antigravity_cli` and are reported Not Applicable otherwise.

Agent-attached Task context files (`create_or_update_task` `context_files`) have
two ungated cases in `project-task-boundaries.e2e.test.ts` and a gated
delegation suite:

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts --no-watch
env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS \
  RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts --no-watch
```

- **CTX-E2E-001 / CTX-E2E-002** (boundaries suite, ungated). Create and patch
  with `context_files` over MCP and the native tool: the copies are saved,
  readable through GraphQL, REST and listing, and outlive their deleted
  sources. Invalid entries fail naming the path and change nothing, including
  no DONE closure.
- **`project-task-context-files-delegation.e2e.test.ts`** (CTX-E2E-003, gated
  like the sibling scripted-AGY suites; skips cleanly otherwise). Real
  HTTP/WS/scoped MCP: the Manager attaches files by tool, `delegate_task({task_id})`
  hands the saved copies to a live worker that reads them (the fixture CLI's
  `READ_REFERENCE_FILES` route replies with each file's size and SHA-256), DONE
  with a bad file keeps the worker's run open, and a Task with no Project
  refuses files. `TASK_CONTEXT_FILES_E2E_EVIDENCE_DIR` keeps a JSON receipt.
  Neither suite proves the packaged-app Task page; that is user verification.
- **CLS-API-001** (boundaries suite, ungated). The CANCELLED status contract over
  MCP, the native tools and GraphQL: both tool schemas and descriptions, the
  GraphQL enum (no status input), CANCELLED closing an open run entry, retry and
  DONE ↔ CANCELLED leaving it untouched, input errors before closure, the
  `list_project_tasks` CANCELLED filter, the four-value error text, refused create
  with a status, open counts, the stored key set and a status-only reopen.

`projects-per-folder-v1` already uses its frozen `released-project-folder-v1.ts`
for Project target classification/validation and its frozen
`readReleasedTaskFileV1` (three statuses) for Tasks; never reconnect it to the
current tolerant `readProjectFile` or `readTaskFile`. It still imports current
`ProjectsLayout`: freeze it before changing its released
contracts (data_migration_guideline §4). Rerun migration and actual startup tests
when changing current Project readers or these historical boundaries.

These controlled model/backend checks do not certify paid inference or
universal OS teardown. Production `tsc`, the scoped Org/publication checks,
recursive public-tree projection tests and the existing web history consumers
cover separate contract gaps.

The following are separate evidence layers, and none substitutes for another:
- public HTTP/WS/scoped MCP tests;
- controlled SDK real-child exit/IO tests;
- actual model execution;
- a whole-app restart on the same profile;
- a real desktop upgrade from a released app.

A business DONE acknowledgement or an Offline row is not proof of a physical
stop.

A full product journey needs a newly built isolated desktop app and owned
Project/context/workspace data. Do not treat an older asar as proof of a
refreshed source state. Record the exact build, IDs, checks and limitations,
and stop only the instance you own. Keep Delivery-owned rerun evidence separate
from the API owner's ledger. Agent-run testing is not explicit user
verification for finalization.

### GitHub Skill Sources Regression

Run from the repository root with installed workspace dependencies and Chrome:

```bash
pnpm -C autobyteus-server-ts prebuild
pnpm -C autobyteus-server-ts build
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills tests/integration/skills tests/unit/skills --no-watch
pnpm -C autobyteus-web test:nuxt components/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts --run
node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs <fresh-output-directory>
```

The browser probe owns a real built backend, disposable SQLite/data/HOME,
free-port Nuxt frontend and fresh Chrome. Its output path resolves from the
current directory and must not exist. An optional second positional argument
appends case results to a ledger; use a delivery-owned ledger for delivery
reruns rather than modifying API-owner history. Normal prebuild regenerates
cleaned SDK outputs; rebuild current server source before the browser check.

Eight sequential cases cover Sources import, Files/socket lifecycle,
check/cancel, failed update/retry, current files, actual header ＋/Send in the
same workspace while an older run remains active, interrupted download, and
permission-denied removal followed by restart/UI retry with local preservation.
Outbound GitHub revisions/errors and an external Codex CLI are controlled;
the CLI reads the real exposed skill bytes. Frontend stores, HTTP/GraphQL,
archives, catalog, runtime adapter and filesystem are real. The 24-combination
GraphQL adapter matrix separately covers Codex/Claude/Grok preparation, both
skill scopes, retained/deleted old generation and both holder release orders.
It is not three live-model browser journeys or paid inference proof.

Inspect `result.json`, provider byte receipts, page errors and cleanup receipts.
The probe closes Chrome, stops owned process groups, checks released ports and
removes its private data even on failure. It never uses the installed app or
user data. Controlled upstream fixtures do not replace a separately attributed
public GitHub transport smoke. These are web/backend feature checks, not
Windows or Electron-shell certification, nor exhaustive process-crash proof.

### Chat Draft Rows Regression

Run from the repository root with installed workspace dependencies, Chrome and a
logged-in CLI for the selected runtime (default Codex):

```bash
pnpm -C autobyteus-server-ts prebuild
pnpm -C autobyteus-server-ts build
pnpm -C autobyteus-web exec nuxt prepare
pnpm -C autobyteus-web test:e2e:chat-draft-rows-live --output-dir <fresh-dir> [--ledger-file <initialized absolute path>] [--cases D00,D04] [--runtime codex_app_server] [--model <id>]
```

The probe owns a built backend (`dist/app.js`), Nuxt dev, a disposable
SQLite/data root on free ports and a fresh headless Chrome. It never touches a
running desktop app or the user's data. `--output-dir` resolves from
`autobyteus-web/`. `--serve-only` starts the owned stack, prints its URLs and
waits for Ctrl+C. Cases D00–D14 cover the New chat Draft rows under the Chat
row:

- drafts kept across Chat, the pencil, Run, `+` and workspace-tree `+`;
- re-entry with an uploaded attachment, `×` discard and "Empty draft";
- row geometry, tokens, motion and reduced motion;
- the narrow drawer with touch, the collapsed strip, keyboard order and focus;
- reload with nothing stored, and zh-CN;
- real Agent and Team first sends. Only these call the model, with tiny prompts.
  The sent row keeps its text until the run opens.

Failed sends are injected as GraphQL error responses, so the real client
failure paths run but the server-side causes are not reproduced. Inspect
`chat-draft-rows-live-evidence.json`, the screenshots and the cleanup receipts.
This is a web-equivalent check, not packaged Electron proof.

## Choosing the path

Start with the smallest layer that directly proves the change, then add the
layer that closes the remaining confidence gap.

| The change affects… | Prove it with… |
| --- | --- |
| Backend logic, APIs, persistence, runtimes | Server tests (+ `pnpm test:e2e` for API journeys) |
| Core agent runtime or tools | `autobyteus-ts` tests (+ server tests for integration) |
| Renderer UI, stores, client–server behavior that also runs in a browser | Web unit tests + a browser dev-path probe |
| Desktop-shell behavior: Electron main process, preload/IPC, updater, windows, app lifecycle, embedded server startup, packaging | Electron main-process tests + an **isolated desktop instance** of a worktree build |
| A full real-product journey a user would perform | An **isolated desktop instance** of a worktree build |
| Behavior against real model or search providers | Real-provider E2E (preflight first), or an isolated instance with keys imported |
| Launch profile, isolation or packaged-launch mechanics | Packaged Electron harness |

Browser probes are fast and headless; use them for web-equivalent behavior.
An isolated desktop instance is slower (it needs an app build) but exercises the
real desktop app; use it whenever desktop-shell behavior or the full product
matters.

## Fresh Agent/Team approval regressions

- `pnpm -C autobyteus-web test:e2e:fresh-run-auto-approval --output-dir <dir>`
  exercises production Library/config/mobile/Chat/copy surfaces through a
  test-owned Nuxt page and Chrome. Install dependencies and run
  `pnpm -C autobyteus-web exec nuxt prepare` first; use `--browser-executable`
  if Chrome is not discovered. The eight cases check fresh true, permitted
  opt-out, member inheritance/overrides, runtime locks and client launch inputs.
  Mutations deliberately reject **after** capture: this is client-network-boundary
  proof, not backend/model/runtime-enforcement certification. A cold Nuxt
  dependency optimization reload can disrupt selection; preserve the failed
  attempt separately if repeating after warmup, never suppress its assertions.
- `pnpm -C autobyteus-web test:e2e:existing-run-model-config --output-dir <dir>`
  includes explicit saved Agent/root/member false preservation assertions in
  the existing six reader cases. These are controlled renderer-reader checks,
  not database migration or desktop restart proof.
- `pnpm -C autobyteus-web test:e2e:team-reload-member-freshness --check-fresh-approval --output-dir <dir>`
  optionally adds E-008 (real catalog Reload → fresh Team true/permitted off)
  and E-009 (actual owned application restart → fresh Agent true/permitted off
  and Team true) to the existing seven product cases. It builds the current
  worktree by default; prerequisites are installed dependencies, graphical
  macOS/Linux and isolated-launch support. Use `--skip-build` only for that
  worktree's already-current packaged artifact. The probe owns/cleans its
  isolated app, data and fixtures; it performs setup/restart, not model sends.
- Optional `--ledger-file <absolute path>` records per-case progress for these
  probes. Keep outputs/ledger in the ticket. Never point a probe at the user's
  installed app or data. Product restart metadata and cleanup receipts are
  distinct from browser reload evidence.

## Rules

1. **Test unreleased changes on a worktree build.** The installed app does not
   contain your change. Use `pnpm --silent isolated-app start --build` (or
   `--from-worktree` when that worktree's app is already built). Builds without
   isolated-launch support are refused with `APP_ISOLATION_UNSUPPORTED`.
2. **Never test against the user's running AutoByteus** or its data
   (`~/.autobyteus`, the OS application-data folders). Only isolated instances,
   test-owned databases and the development stack are test targets.
3. **Use the ports `start` reports.** Without `--control-port`, `start` picks
   a free control port, so parallel instances do not collide. Keep the reported
   `instanceId` and `controlPort`: pass that `controlPort` to browser-automation
   and that `instanceId` to `restart`/`stop`.
4. **Credentials go through the importer** into the target database, then
   `pnpm --silent isolated-app restart <instanceId>` for an isolated instance.
5. **Stop what you started.** `pnpm --silent isolated-app stop <instanceId>` for instances,
   `Ctrl+C` for `pnpm dev`. Leave other processes and data alone.
6. **Assertions first.** Prove behavior with test assertions, API results and
   DOM/state checks. Screenshots and recordings are supporting evidence, not
   proof on their own.
7. **Page dialogs are answered by the agent.** When an action may raise a
   native page dialog (`confirm`, `prompt`, "Leave site?"), pass the decision
   with it: `run-script … --dialog accept` or `--dialog dismiss`
   (`--prompt-text` for prompts, which exist in browsers only, not in the
   Electron app). Without a decision the command fails with
   `DIALOG_DECISION_REQUIRED` and the dialog's message; re-run with your
   decision. OS dialogs (file pickers) and dialogs left open in other tabs are
   answered on screen — by the user, or with an OS-level screen-control
   (computer-use) tool where one is available. While
   such a dialog is open, browser commands fail with `PAGE_BLOCKED` (within
   about 8 s) until it is answered.
8. **Linux:** use `--from-worktree`/`--build` or an extracted AppImage
   (`--app <dir>/squashfs-root/autobyteus`), a real or virtual display, and
   `ffmpeg` for recordings. See
   [Isolated instances on Linux](docs/isolated-app-instances.md#linux).
9. **Fix failures that also fail on the base; don't just note them.** "Also
   fails on the base" shows your change did not cause a failure. It does not
   close the failure. Find out why it fails.
   - When the cause is in the test or is a small local fix, fix it in the same
     branch as its own commit, labelled as a baseline fix. Name the test and
     the cause in your handoff or report.
   - When the fix is a product change or too large for the current work, report
     it to the accountable owner as its own item, with the cause you found.

   Never leave a known baseline failure unexplained, or it comes back in every
   later change.

## Evidence and cleanup

- Keep test artifacts (screenshots, recordings, logs) in the ticket or test
  output folder, not in the repository root.
- Record in the validation report which layers ran, the exact commands, and
  anything not covered and why.
- After a run, `pnpm --silent isolated-app list` should show no instances you
  started.

## Related documentation

- [README: Packaged Electron API/E2E testing](README.md#packaged-electron-apie2e-testing)
- [README: Local full-stack development](README.md#local-full-stack-development)
- [README: Testing (Codex Runtime)](README.md#testing-codex-runtime)
- [Frontend testing](autobyteus-web/README.md#testing) and
  [packaged E2E launches](autobyteus-web/README.md#packaged-electron-e2e-launches)
- [Server tests](autobyteus-server-ts/README.md#tests)
- [Isolated AutoByteus Instances](docs/isolated-app-instances.md)
- [Secret Management](autobyteus-server-ts/docs/modules/secret_management.md)

### Native workspace folder picker regression

`pnpm -C autobyteus-web test:e2e:workspace-folder-picker --output-dir <fresh-dir>`
builds and owns an isolated desktop, private backend/data and API-created Agent,
Team, Org and directory fixtures. Requires installed dependencies and a graphical
macOS/Linux session. `--skip-build` is only for this worktree's verified current
packaged artifact. `--ledger-file <initialized absolute path>` records each case.

Add `--native-assisted` to exercise the real OS directory picker. The probe prints
the owned path to select and pauses (up to five minutes); answer on screen with
an OS-level computer-use tool or as a human. Bind an auto-launching OS tool only
while the reported owned PID is alive and the probe is awaiting native input;
do not reopen the bundle after probe cleanup. It also requests native Cancel and
Escape. Never substitute a mocked bridge response. Without this option, manual
caller coverage runs and the native cancellation case is **Not Tested**; the
probe's pass is not native certification. Keep native-operation observations
beside `evidence.json` and screenshots.

The probe checks real Agent/Team/Org/member input and explicit apply, known reuse,
no browse-triggered registration, pending/focus, narrow layout, active/saved
Org locks, stopped member draft then explicit Save with real API readback,
and Settings-owned Chinese layout. Org Run creates a no-message run only;
no model turn, provider secrets or paid inference is requested. It stops its
exact instance and removes only its own data/fixtures. Device metrics emulate
renderer widths, not OS window resizing or physical mobile. Error/empty response
and browser/remote/mobile gating use the colocated native-folder and gate tests;
this probe does not induce OS permission failures or certify other platforms.

### Team identity glyph regression

From the workspace root, build dependencies with `pnpm --filter 'autobyteus^...' build`,
then `pnpm -C autobyteus-web exec nuxt prepare` and
`pnpm -C autobyteus-web test:e2e:team-group-icon --output-dir <fresh-dir>`.
Serialize builds/tests/dev within the worktree. Chrome is required; override discovery
with `PLAYWRIGHT_CHROME_EXECUTABLE_PATH`. Relative output paths resolve from the web
package. Optional `--ledger-file <initialized-absolute-path>` appends each case immediately.

The probe owns free-port Nuxt, a temporary page and fresh headless Chrome. It checks
actual Iconify SVG paths/sizes, Agent context/store and Team tree rows, real Org
projection, compact/detail Task worker states and Memory configured/task/nested groups,
with keyboard/pointer/disclosure/focus and 1440/768px renderer widths. Bootstrap HTTP
and public Team-row inputs are controlled; parent source projections and avatar
preservation have colocated coverage. No real backend/model, full worker/page navigation,
Electron shell, physical mobile or explicit user acceptance is certified. Inspect
`result.json`, screenshots and cleanup receipts; route, exact child group, browser
and ports must be released, without touching the user app/data.
