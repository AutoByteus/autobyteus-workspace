# Testing AutoByteus

This is the global testing strategy for the AutoByteus workspace. Every task follows it
when it plans and runs validation: which test layers exist, which one proves what, how
environments, credentials and data are handled, and the rules every run obeys.

## When this file may be updated

Keep this file short and global. Change it only when the change applies to **every
future task's testing**, for example:

- a test layer, tool or harness is added, removed or renamed, or its command changes;
- a rule about environments, credentials, isolation, data safety or cleanup changes;
- a recurring failure teaches a general rule that every task must follow.

Do **not** add:

- descriptions of one suite or probe, its cases, fixtures, timings or costs. Put them
  in that test file's header (purpose, prerequisites, gate variable, command, cases).
  A new probe is found through its `package.json` script and its file;
- validation results, evidence, coverage lists or "what this run proves". Those belong
  in the ticket's validation report;
- anything only one ticket needs.

When you change this file, remove what has become obsolete, and commit it on its own as
`docs(testing): <reason>`.

## Test layers

Run commands from the repository root. `pnpm -C <dir>` runs a package's script.

| Layer | What it proves | Command |
| --- | --- | --- |
| Web unit and component tests | Nuxt components, stores, composables, utilities (colocated `__tests__`) | `pnpm -C autobyteus-web test:nuxt` |
| Electron main-process tests | Electron main, preload, launch profile, server manager, updater | `pnpm -C autobyteus-web test:electron` |
| Web guards | Web boundary and localization rules | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` |
| Workspace native-to-web integration | Native producer/FIFO and web hydration at a workspace-owned boundary (`test-support/`) | `pnpm test:native-input-history` |
| Server unit / integration | Backend logic and in-process integration | `pnpm -C autobyteus-server-ts test:unit`; `test:integration:prepare` once, then `test:integration`; one file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| Server typecheck | Production `src` under the build type policy | `pnpm -C autobyteus-server-ts typecheck` |
| Server E2E | Real HTTP/GraphQL/WebSocket boundaries on a test-owned server and database (`tests/e2e/`) | `pnpm test:e2e`, or one file with `vitest run` as above |
| Gated runtime suites | Real or scripted runtimes and providers (`RUN_*` gates in `autobyteus-server-ts/tests/e2e/`) | The gate and command are in the test file |
| Release smoke | New runs with configured skills start on every runtime, in the user's skill setup | `python3 scripts/release_smoke.py`; see [RELEASE.md](RELEASE.md#release-smoke-check) |
| Core library tests | `autobyteus-ts` runtime, tools, LLM layer | `pnpm -C autobyteus-ts exec vitest run tests/unit` |
| Other packages | SDKs, contracts, message gateway | `pnpm -C <package> test` |
| Browser probes | Renderer journeys in headless Chrome, against fixture pages or a probe-owned real stack | `pnpm -C autobyteus-web test:e2e:<name>` (sources in `autobyteus-web/tests/e2e/`) |
| Packaged Electron harness | Packaged launch, isolation and cleanup | `pnpm -C autobyteus-web test:e2e:electron`, `test:e2e:electron:isolation`, `test:e2e:isolated-app` |
| Isolated desktop instance | The real desktop app of a worktree build, driven like a user | `pnpm --silent isolated-app start --build`; see [Isolated AutoByteus Instances](docs/isolated-app-instances.md) |
| iOS wrapper (macOS + Xcode) | Release contract, core unit tests, simulator smoke | See [autobyteus-ios/README.md](autobyteus-ios/README.md) |

## Choosing the path

Start with the smallest layer that directly proves the change, then add the layer that
closes the remaining confidence gap.

| The change affects… | Prove it with… |
| --- | --- |
| Backend logic, APIs, persistence, runtimes | Server tests (+ server E2E for API journeys) |
| Core agent runtime or tools | `autobyteus-ts` tests (+ server tests for integration) |
| Renderer UI, stores, client–server behavior that also runs in a browser | Web unit tests + a browser probe |
| Desktop-shell behavior: Electron main, preload/IPC, updater, windows, lifecycle, embedded server startup, packaging | Electron main-process tests + an isolated desktop instance |
| A full real-product journey a user would perform | An isolated desktop instance of a worktree build |
| Behavior against real model or search providers | A gated live suite, or an isolated instance with keys imported |
| Launch profile, isolation or packaged-launch mechanics | Packaged Electron harness |

These are separate evidence layers; none substitutes for another. A browser probe proves
web-equivalent behavior, not the Electron shell. A scripted runtime proves the transport,
not paid inference. Agent-run testing is not the user's verification.

**Rerun by impact.** A run that passed stays valid for the code it ran on. Plan each later
round (review fixes, a merge, a rebase) before running anything:

1. Record every case with the commit it last passed on, in the ticket's validation ledger.
2. List what changed since then: `git diff --name-only <validated> HEAD`.
3. Mark each recorded case **Still valid** (nothing it exercises changed) or **Rerun**
   (its own files or the code it exercises changed), with the reason. Add cases for new
   behavior. Find what a test exercises by reading what it drives. For server E2E,
   `vitest --changed` does not narrow anything, because every test starts the whole server.
4. Mark everything **Rerun** when a shared foundation changed: dependencies or the
   lockfile, the database schema or migrations, `autobyteus-ts`, the contract packages,
   the test harness or fixtures, or build configuration.
5. Run only the cases marked Rerun or new, and record their new commit.

The plan, with the validated commit and the diff, goes in the validation report.

## Environments, credentials and data

- **Install and build first.** `pnpm install`, then `pnpm -C autobyteus-server-ts prebuild`
  (Prisma client) and `pnpm -C autobyteus-web exec nuxt prepare`. Suites and probes that run
  `autobyteus-server-ts/dist/app.js` need a current build of this worktree:
  `pnpm -C autobyteus-server-ts build`. Never use an installed app or an older build as
  proof of current source.
- **Serialize builds and dev servers within one worktree.** Parallel builds or Nuxt dev
  servers in the same package overwrite each other's outputs.
- **Green server suites.** Server `test:unit`, `test:integration` and `typecheck` are kept
  passing. Every failure there is a real failure: find its cause and fix or report it
  (Rule 9). Run `test:integration:prepare` once per worktree and after changing server or
  SDK source; `test:integration` names any missing build output and exits.
- **Server test isolation.** For `tests/unit/` and `tests/integration/`,
  `tests/setup/test-environment-isolation.ts` removes every inherited variable except system
  essentials and test-owned knobs (`RUN_*`, `TEST_*`, `FAKE_*`, `AGY_*`,
  `ANTIGRAVITY_CLI_COMMAND`), so results never depend on the shell or `~/.autobyteus`. A new
  opt-in gate variable for those folders goes into `TEST_ENVIRONMENT_ALLOWLIST`.
- **Clean environment elsewhere.** E2E folders, `autobyteus-ts` integration tests and live
  suites inherit the shell, which carries the live app's variables and provider keys. Run
  them with a clean environment, e.g. `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" …`,
  or unset the inherited `AUTOBYTEUS_*` roots, as the test file states. Give the temp `HOME`
  its resolved path (`HOME="$(cd "$(mktemp -d)" && pwd -P)"`): on macOS `/var` is a symlink to
  `/private/var`, and the terminal e2e compares the shell's `$PWD` with `HOME`. A live suite that
  uses a signed-in CLI (`claude`, `codex`) also needs the real `HOME` and, on macOS,
  `USER` and `LOGNAME`; without them the CLI reports "Not logged in" and the run hangs
  until its step timeout.
- **Gates.** Live and costly tests stay skipped unless their gate is set. A skip is not a
  pass. Real-provider runs spend the user's credits: run them only when the change needs
  real-provider proof.
- **Real-provider credentials** live in the encrypted vault of the target database. Import
  them with `pnpm secrets:import -- --source <file> --database-url file:<absolute db path>`
  (wrap in `script -q /dev/null …` on macOS without a terminal), never by editing `.env`.
  `pnpm test:e2e:real:preflight` reports what is configured; missing capabilities are
  reported, never counted as passed. See
  [Secret Management](autobyteus-server-ts/docs/modules/secret_management.md).
- **Local model servers share limited compute.** LM Studio and Ollama run on this machine. Run at
  most one agent run or suite that uses a local model at a time, never in parallel, and prefer a
  small, fast model (for example `qwen/qwen3.6-35b-a3b`, the gated LM Studio suite's default via
  `LMSTUDIO_TARGET_TEXT_MODEL`). Unload any model your run loaded just-in-time when you finish.
- **Runtimes without a model.** `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`
  (`ANTIGRAVITY_CLI_COMMAND=<absolute path>`, `RUN_AGY_FAILURE_E2E=1`) is a scripted AGY CLI:
  a message containing `CALL_TOOL:{…}` makes that agent call the real tool. Use it to drive
  real delegation, Tasks and streams without provider calls.
- **Test-only runtime CLI settings.** Never edit the user's CLI config (`~/.codex`,
  `~/.claude`, `~/.grok`). Give the test its own config instead:
  - **A throwaway home.** For example `CODEX_HOME=<temp>` containing a `config.toml` with
    only the settings the test needs, plus a symlink to the user's `auth.json` for the login.
    Every CLI started under it uses that config, and its sessions are written there; an
    exported home applies to every CLI started from that shell.
  - **A per-run override.** Where the test launches the CLI itself, pass the setting on the
    command line, e.g. `codex app-server -c <key>=<value>`.
  - **Antigravity CLI (`agy`) sign-in state.** `agy` keeps its sign-in and state under
    `$HOME/.gemini/antigravity-cli/` and has no home variable of its own, so isolate it with a
    throwaway `HOME`, which also hides the other CLIs' logins from that process. An empty
    `HOME` gives a signed-out `agy`. For a signed-in one, copy only
    `antigravity-oauth-token` into the throwaway home; never symlink it or point at the
    user's real folder, because `agy` writes into that folder. Never print or commit it.
    Known gap: `agy` 1.3.5 has no `antigravity-oauth-token` file, and a throwaway `HOME`
    gives a signed-out `agy` (checked 2026-10-14). No isolated signed-in recipe is known for
    that version yet. Until one is, live AGY suites run on the host login with the real
    `HOME`; each run adds its own conversations to the user's `agy` history. Say so in your
    report.
  - **Isolated desktop instances.** The embedded server receives only a system-baseline
    environment. Of the CLI homes, only `CODEX_HOME` passes through, so start (and
    `restart`) the instance with it set. Other runtime variables reach only in-process
    server suites.
- **Forcing compaction early.** Each runtime decides when to compact; lower its own
  threshold instead of filling a real context window:
  - Codex: `model_auto_compact_token_limit` in a temporary `CODEX_HOME`.
  - Native AutoByteus: the server settings `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` and
    `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`.
  - Claude: `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (in-process suites only), or a manual
    `/compact`.
- **Docker server nodes.** Never test against the user's node containers or their volumes
  (`/root` holds each node's CLI sign-ins). Start a test-owned container from the same image,
  bound to `127.0.0.1` on a free port and without the user's volumes, so its runtime CLIs
  start signed out. To run this worktree's server in it, mount
  `autobyteus-server-ts/dist` read-only over `/app/autobyteus-server-ts/dist`, after checking
  that the image's `dist` differs only in the files you changed. If a signed-in CLI is needed,
  stream only its credential file from a node container into the test container without
  writing it to the host, e.g. `docker exec <node> tar -C <dir> -cf - <file> | docker exec -i
  <test> tar -C <dir> -xf -`. Remove the container with `docker rm -f -v` afterwards.
- **Data.** Every run uses its own data root, database, ports and processes. Create data
  through public APIs or the UI, never by editing another run's files.
- **Migrations and upgrades are tested on small synthesized data.** The source is a few
  test-made records with the released structure, covering each shape that exists, older
  ones included; the target is what the new build makes of it. Learn the structure by
  reading real user data (read-only) or what a released build wrote, and check that the
  synthesized records have the same keys and shapes. Never copy real data into a test, and
  never run a migration, startup or conversion on real user data or a copy of it; use a
  test-owned data root, and never wake a converted run against real runtime sessions.
  Prove the conversion, that nothing is lost, and that a second start changes nothing.
- **Build outputs** such as the application SDK `dist/` folders and
  `autobyteus-web/electron-dist/` are untracked. Stage paths explicitly; never `git add -A`.
  Exception: the three contract packages (`autobyteus-agent-presentation-contracts`,
  `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts`) track
  their `dist/`, which their consumers import. After changing their source, rebuild with
  `pnpm -C <package> build` and commit the `dist/` changes too.

## Environment-specific setup: headless Linux and containers

The virtual-display and root-container recipes below apply **only when those
environment conditions exist**, such as a headless Linux testing container.
They are not the setup procedure for every developer's host desktop. On a normal
host desktop, use its existing graphical session and normal non-root account;
do not install Xvfb or switch numeric UID/GID just because you are running tests.
Use the supported platform's isolated-instance instructions. The global
test-layer, evidence, isolation and safety rules above still apply.

- A full product journey still needs the **actual isolated Electron worktree build**.
  A browser/component fixture is not a substitute for this layer.
- The validation agent owns ordinary setup: dependencies, a private HOME/temp root,
  an unprivileged runtime identity, and a real or owned virtual display. Do not
  hand routine test setup to the user when it can safely be prepared locally.
- Electron must not run as root. In a root-only container, build as the worktree
  owner, then launch the current unpacked build as an unprivileged user with
  isolated-app start --from-worktree. Preserve Chromium's sandbox; do not add
  --no-sandbox or change host security settings to force a pass.
- When Xvfb is needed, keep it alive for **start → automation → stop**. Wrap the
  complete owning probe/session in xvfb-run, not just the short-lived start command.
- Verify the reported instance/ports, packaged identity, renderer assertions and
  cleanup. A launch, skipped case, or screenshot alone is not a journey pass.
  If safe setup cannot work, report the precise missing dependency and attempted
  diagnostics—never a desktop pass based only on browser evidence.

The runnable preflight, root-container and virtual-display recipes are in
[Isolated instances on Linux](docs/isolated-app-instances.md#linux). Keep
shared setup guidance separate from ticket-specific journeys. Temporary
ticket-owned automation does not require a new global package command.

## Browser probes

- A probe owns its stack: free ports, a Nuxt dev server, fresh headless Chrome, and either
  fixture routes or a probe-owned backend and data root. It removes them on success or
  failure; check its cleanup receipt.
- Probes fail on browser errors. A probe whose fixture page renders product components must
  supply every boundary those components reach (GraphQL operations, WebSockets). Shared
  fixture helpers live in `autobyteus-web/tests/e2e/fixtures/`.
- Pass a fresh `--output-dir`; existing evidence is never overwritten. `--ledger-file`
  (where supported) records each case as it finishes.
- A cold Nuxt dev server re-optimizes dependencies and reloads pages. Warm it up before
  asserting; this is a harness effect, not product behavior.
- Assert DOM, state and API results. Screenshots support the evidence; they are not proof.

## Rules

1. **Test unreleased changes on a worktree build.** Use
   `pnpm --silent isolated-app start --build` (or `--from-worktree`). Builds without
   isolated-launch support are refused with `APP_ISOLATION_UNSUPPORTED`.
2. **Never test against the user's running AutoByteus** or its data (`~/.autobyteus`, the OS
   application-data folders). Only isolated instances, test-owned databases and the
   development stack are test targets.
3. **Use the ports `start` reports** and keep the `instanceId` and `controlPort` for
   browser automation (`CHROME_REMOTE_DEBUGGING_PORT=<controlPort>`,
   `BROWSER_AUTOMATION_ATTACH_ONLY=1`), `restart` and `stop`.
4. **Credentials go through the importer** into the target database, then
   `pnpm --silent isolated-app restart <instanceId>` for an isolated instance.
5. **Stop what you started**: `pnpm --silent isolated-app stop <instanceId>`, `Ctrl+C` for
   `pnpm dev`. Leave other processes and data alone. `pnpm --silent isolated-app list` should
   show no instance of yours afterwards.
6. **Assertions first.** Prove behavior with assertions, API results and DOM/state checks.
7. **Page dialogs are answered by the agent.** Pass the decision with the action
   (`run-script … --dialog accept|dismiss`, `--prompt-text` for prompts). OS dialogs are
   answered on screen. While one is open, browser commands fail with `PAGE_BLOCKED`.
8. **Linux:** use `--from-worktree`/`--build` or an extracted AppImage, a real or virtual
   display, and `ffmpeg` for recordings; see
   [Isolated instances on Linux](docs/isolated-app-instances.md#linux).
9. **Fix every failure you hit; find its cause first.** Diagnose it on your own worktree:
   read the failing assertion, reproduce it, and find why it fails. The cause shows whether
   your change produced it, so no base-branch run is needed to decide. Run the base only when
   you cannot find the cause, for example to bisect a regression.
   - Caused by your change: it is a defect in the change; route it as a failure.
   - A cause in the test, or a small local fix: fix it in the same branch as its own commit,
     labelled as a baseline fix, and name the test and cause in your report.
   - A product defect not caused by your change and too large for the current work: report
     it to the accountable owner as its own item, with the cause you found.

   Never close a failure as "pre-existing" or "flaky" without its cause.

## Evidence and cleanup

- Keep test artifacts (screenshots, recordings, logs) in the ticket or a test output folder,
  not in the repository root.
- Record in the validation report which layers ran, the exact commands, and anything not
  covered and why.

## Related documentation

- [README: Packaged Electron API/E2E testing](README.md#packaged-electron-apie2e-testing)
- [README: Local full-stack development](README.md#local-full-stack-development)
- [Frontend testing](autobyteus-web/README.md#testing)
- [Server tests](autobyteus-server-ts/README.md#tests)
- [Isolated AutoByteus Instances](docs/isolated-app-instances.md)
- [Secret Management](autobyteus-server-ts/docs/modules/secret_management.md)
