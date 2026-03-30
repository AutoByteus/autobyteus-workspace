# Investigation Notes

- Ticket: `run-bash-posix-spawn-failure`
- Date: `2026-03-22`
- Scope Triage: `Small`
- Triage Rationale: The defect is concentrated in the shared terminal session startup path and XML tool-argument decoding path inside `autobyteus-ts`. The likely implementation touches are limited and can be validated with targeted unit/integration coverage.

## User-Reported Symptoms

- `run_bash` fails for simple commands such as `mkdir -p ...`, `touch ...`, or `pwd`.
- The first failure may show `posix_spawn failed`.
- A later command in the same context may then show `Session not started`.
- XML-embedded commands may contain encoded entities such as `&amp;&amp;` that are not decoded before execution.

## Investigated Entry Points And Boundaries

- Foreground shell execution:
  - `autobyteus-ts/src/tools/terminal/tools/run-bash.ts`
  - `autobyteus-ts/src/tools/terminal/terminal-session-manager.ts`
  - `autobyteus-ts/src/tools/terminal/session-factory.ts`
  - `autobyteus-ts/src/tools/terminal/pty-session.ts`
  - `autobyteus-ts/src/tools/terminal/direct-shell-session.ts`
- Background shell execution sharing the same session-factory decision:
  - `autobyteus-ts/src/tools/terminal/background-process-manager.ts`
- XML tool-call parsing and argument extraction:
  - `autobyteus-ts/src/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.ts`
  - `autobyteus-ts/src/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.ts`
  - `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts`
  - `autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts`
- Server/runtime adapters primarily consume the parsed arguments and are not the first defect source:
  - `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-tool-helper.ts`

## Reproduction Evidence

### 1. Existing targeted tests

Executed:

```bash
pnpm -C autobyteus-ts exec vitest --run \
  tests/integration/tools/terminal/terminal-tools.test.ts \
  tests/integration/tools/terminal/direct-shell-session.test.ts \
  tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts \
  tests/unit/agent/streaming/parser/invocation-adapter.test.ts \
  tests/unit/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.test.ts \
  tests/unit/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.test.ts \
  tests/unit/tools/terminal/terminal-session-manager.test.ts \
  tests/unit/tools/terminal/pty-session.test.ts
```

Observed:

- Parser/unit tests all pass.
- `DirectShellSession` integration passes.
- All `terminal-tools` PTY-backed integration tests are skipped because `detectNodePtyRuntimeAvailable()` returns `false`.

Interpretation:

- The current environment cannot rely on `node-pty`, but production code still defaults to `PtySession` on non-Windows/non-Android hosts.

### 2. Low-level PTY spawn probe

Executed:

```bash
pnpm -C autobyteus-ts exec node -e "import('node-pty').then(({spawn})=>{try{spawn('bash',['--norc','--noprofile','-i'],{name:'xterm-256color',cwd:process.cwd(),env:process.env,cols:80,rows:24});console.log('spawn returned');}catch(error){console.error('SPAWN_ERR', error instanceof Error ? error.message : String(error));process.exit(1);}})"
```

Observed:

- `SPAWN_ERR posix_spawnp failed.`

Interpretation:

- The low-level PTY backend fails exactly with the same startup error seen by the user.

### 3. End-to-end `runBash(...)` foreground reproduction

Executed:

```bash
pnpm exec node --loader ts-node/esm -e "import { runBash } from './src/tools/terminal/tools/run-bash.ts'; const ctx={workspaceRootPath:process.cwd()}; runBash(ctx,'pwd').catch((error)=>{console.error('RUN_BASH_ERR', error instanceof Error ? error.message : String(error)); process.exit(1);});"
```

Observed:

- `RUN_BASH_ERR posix_spawnp failed.`

Interpretation:

- The user-visible `run_bash` failure is reproducible through the normal foreground tool path.

### 4. Cascading second-call failure reproduction

Executed:

```bash
pnpm exec node --loader ts-node/esm -e "import { runBash } from './src/tools/terminal/tools/run-bash.ts'; const ctx={workspaceRootPath:process.cwd()}; for (const command of ['mkdir -p test_folder && touch test_folder/test_file','pwd']) { try { await runBash(ctx, command); } catch (error) { console.error('ERR', command, error instanceof Error ? error.message : String(error)); } }"
```

Observed:

- First call: `posix_spawnp failed.`
- Second call: `Session not started`

Interpretation:

- After the initial PTY startup failure, state is left in a form that allows the next call to surface a misleading downstream error instead of a clean recovery or fallback.

### 5. XML entity decoding probe

Executed:

```bash
pnpm exec node --loader ts-node/esm -e "import { parseXmlArguments } from './src/agent/streaming/adapters/tool-call-parsing.ts'; const xml='<arguments><arg name=\"command\">mkdir -p test_folder &amp;&amp; touch test_folder/test_file</arg></arguments>'; console.log(JSON.stringify(parseXmlArguments(xml)));"
```

Observed:

- Output: `{\"command\":\"mkdir -p test_folder &amp;&amp; touch test_folder/test_file\"}`

Interpretation:

- XML argument parsing currently preserves entity-encoded text instead of decoding it to executable shell text.

## Root-Cause Findings

1. `getDefaultSessionFactory()` always returns `PtySession` on non-Windows/non-Android hosts, even when the runtime cannot actually spawn PTYs.
2. `TerminalSessionManager.ensureStarted(...)` does not recover from PTY startup failure by clearing/replacing the failed backend or falling back to `DirectShellSession`.
3. `BackgroundProcessManager.startProcess(...)` shares the same default session-factory choice and therefore likely has the same PTY-unavailable failure mode.
4. XML tool-argument extraction in `parseXmlArguments(...)` does not decode XML entities, so `run_bash` commands can reach execution with literal `&amp;`, `&quot;`, and related sequences.
5. The current test suite covers PTY success paths and XML structure parsing, but it does not contain regression coverage for:
   - fallback from PTY startup failure to direct shell execution;
   - prevention of the `Session not started` cascade after startup failure;
   - XML entity decoding for command arguments.

## Likely Fix Shape

- Add a safe fallback path from `PtySession` to `DirectShellSession` when PTY startup fails or dies during startup.
- Ensure failed startup does not leave a stale session object behind.
- Reuse the same fallback policy for `BackgroundProcessManager`.
- Decode XML entities in XML tool-argument parsing so `run_bash` receives executable command text.
- Add targeted unit/integration tests for both fallback execution and XML entity decoding.

## Constraints And Risks

- Fallback logic should not change Windows or Android session behavior unless explicitly intended.
- Fallback should preserve existing stateful-session semantics for successful PTY environments.
- XML decoding must happen exactly once to avoid corrupting already-decoded text.
