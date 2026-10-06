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
| Core library tests | `autobyteus-ts` agent runtime, tools, LLM layer | `pnpm -C autobyteus-ts test` |
| Other packages | SDKs, contracts, message gateway | `pnpm -C <package> test` (each package with a `test` script) |
| Server E2E (deterministic) | Server E2E suite with its own test-owned database and runtime | `pnpm test:e2e` |
| Real-provider E2E | Configured external providers, explicitly | `pnpm test:e2e:real:preflight`, then `pnpm test:e2e:real` |
| Codex runtime live E2E | Codex App Server transport | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run`; the interrupted-compaction cases alone (interrupt, terminate and app-server crash during an automatic compaction): `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts --no-watch` (lowers the test app server's auto-compaction limit; a few turns of Codex quota per case) |
| Claude compaction live E2E | Real Claude CLI/SDK `/compact`, Stop and CLI process exit during compaction, raw-trace rotation and reopened history, on every installed Claude CLI (PATH and SDK-bundled) | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts --no-watch`; add `RUN_CLAUDE_AUTO_COMPACTION_E2E=1` for the costly auto-compaction case (~300K input tokens) |
| Claude background-task live E2E | Real Claude CLI/SDK background Bash tasks for a standalone agent and a team member: `BACKGROUND_TASK_UPDATED` snapshots with the shell `command` (explicit background and CLI auto-background, which the test enables itself), completion, failure, Stop+terminate and CLI crash, on every installed Claude CLI (PATH and SDK-bundled) | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-background-task.e2e.test.ts tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts --no-watch` |
| Antigravity (AGY) runtime E2E, fake CLI | AGY stream conversion through the real server (WebSocket, history, Files, compaction rotation in `agy-compaction-rotation-transport.e2e.test.ts`, compaction version gate off in `agy-compaction-gate-off-transport.e2e.test.ts`) with a scripted CLI; no model call. `AGY_FAKE_VERSION` overrides the fake CLI's `--version` output | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<absolute path>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/<file> --no-watch` |
| Antigravity (AGY) runtime live E2E | The installed `agy` CLI with real model calls | One variable per file, named in the file header: `RUN_AGY_E2E=1`, `RUN_AGY_CAPABILITY_E2E=1`, `RUN_AGY_BACKGROUND_E2E=1`, `RUN_AGY_RECOVERY_E2E=1` or `RUN_AGY_COMPACTION_E2E=1` (automatic compaction from ~90K-token turns; uses AGY quota, leave `ANTIGRAVITY_CLI_COMMAND` unset; add `AGY_COMPACTION_E2E_CHECKPOINTS=2` to continue until a second compaction), then the same `vitest run` command |
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
paid inference or explicit user-verification proof. Real workspace IDs and the
complete desired list remain caller inputs; no discovery tool is supplied.
Inspect actual saved-value and cleanup receipts: owned children must exit,
listeners close and private roots disappear. Never use the user's app/data.

### Project and Task Description Voice Regression

Run the full Projects browser/API probe with optional native-browser voice cases:

```bash
pnpm -C autobyteus-web test:e2e:projects --voice-input --output-dir=<fresh-directory>
```

The existing probe builds this worktree's server, creates disposable SQLite
nodes, and owns Nuxt/Chrome and cleanup. Chrome and installed dependencies are
required; `--skip-server-build` is valid only after a current-worktree server build.
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
  resources, closed-forever, current assignments versus `assignmentsUnavailable`,
  and the damaged-file policy (Q-3). Also saved-ID payloads, compact business
  results, DONE close-then-stop, retry by repeated DONE with nothing about the
  stop persisted, and reopen.
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

`@` delegation and ad-hoc Tasks (Tasks with no Project, created by a described
`delegate_task` and closed by `create_or_update_task({task_id, status: "DONE"})`)
have a gated server E2E beside the closure suite and a live browser probe:

```bash
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts --no-watch
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
    not. Mentioning one stores `…, already in this run` with the in-run
    guidance and adds nothing;
  - permanent delete removes only that run's ad-hoc Tasks.

  Set `AD_HOC_TASK_E2E_EVIDENCE_DIR` to keep a JSON receipt. The in-process
  server inherits `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` (and the skill and
  application root variables) from your shell and then lists those packages as
  candidates too. It only reads them, but prefix the command with
  `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`
  for a run that does not depend on your machine.
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

If you change `ProjectsLayout`, `readProjectFile` or `readTaskFile`, first
repoint `projects-per-folder-v1` to frozen copies (data_migration_guideline §4),
then rerun the migration tests.

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
