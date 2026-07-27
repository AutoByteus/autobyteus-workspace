# Secure Centralized Secret Provisioning — Round 17 Verification Handoff

## Status

`Blocked after failed user verification; implementation-owned packaged terminal
regression confirmed.`

- Ticket branch: `codex/secure-centralized-secret-provisioning`
- Final reviewed implementation HEAD:
  `dd1d37f90d00331d427bad1b36e4401a3a733038`
- Local validated-state checkpoint:
  `3877b39bdcad2e8c88bb9f86d190308aaf034829`
- Tracked base checked:
  `origin/personal@d6983612c5a77fb94d9266df85a9d03fe2d1c68b`
- Integration result: already current after fetch (checkpoint ahead 46, behind 0;
  merge-base equals the tracked base)
- Delivery integrated-state check: actual built-server custom-provider-v1 E2E
  3/3, removed-authority checks, runner syntax, and `git diff --check` passed
- Architecture: Pass
- Implementation source review: Round 41 Pass, 9.62/10
- API/E2E: Round 17 Pass, 98.9%; every applicable category >=98%
- Proportional durable-test review: Round 9 Pass; no unresolved finding and
  `TCR-001`–`TCR-006` remain resolved

The reviewed candidate state has a local safety checkpoint only. No ticket
archive, push, merge, tag, publication, deployment, or worktree cleanup has
been performed. The user's 2026-07-27 packaged Electron verification exposed a
terminal-session regression, so this candidate must not be finalized or
released.

## Failed User Verification: Packaged Terminal

The user opened the actual worktree-packaged Electron candidate and clicked the
Terminal pane. The application server stayed healthy on port `29695`, but
session `dd9a6eb8-1d5f-49b4-b4ea-cf22d16ced43` failed during isolated PTY bridge
startup.

Delivery inspected the live logs and package without stopping or modifying the
user's running processes. The native arm64 `node-pty` binary and
`spawn-helper` are present and executable, and a safe packaged probe passed
when the Electron executable was explicitly run with
`ELECTRON_RUN_AS_NODE=1`.

The confirmed failure origin is the ticket-added sanitized child environment:
the packaged embedded server runs through the Electron executable with
`ELECTRON_RUN_AS_NODE=1`, but `buildAgentChildEnvironment(...)` drops that
runtime discriminator before `IsolatedPtySession` spawns its bridge using
`process.execPath`. The child consequently relaunches Electron application mode
instead of Node bridge mode. Its first stderr line, `Overwriting existing tool
definition for name: 'search_web'`, is captured as the bridge startup error; it
is a symptom, not the root cause.

Classification: `Local Fix` owned by `implementation_engineer`. The fix must
preserve the secret-environment hardening rather than restoring broad parent
environment inheritance, and must return through source review and realistic
packaged API/E2E terminal validation.

The required AutoByteus `send_message_to` capability was unavailable after
bounded discovery attempts in this delivery session. The reroute is therefore
recorded but not represented as delivered; no Codex-native substitute agent was
created.

## Direct Answer: How API/E2E Started The Backend And Frontend

### Real development/browser stack

From the worktree root, the combined command was:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning
pnpm dev:test
```

That command:

1. builds `autobyteus-server-ts`;
2. validates the committed non-secret `autobyteus-server-ts/.env.test`;
3. materializes only the fixed launch settings into
   `autobyteus-server-ts/tests/.tmp/live-e2e-runtime/.env`;
4. launches the actual built server entry with a sanitized environment,
   `--host 127.0.0.1 --port 8000 --data-dir
   autobyteus-server-ts/tests/.tmp/live-e2e-runtime`; and
5. launches the Nuxt frontend from `autobyteus-web` with
   `pnpm dev --host 127.0.0.1 --port 3000` and
   `BACKEND_NODE_BASE_URL=http://127.0.0.1:8000`.

The same processes can be started in two terminals:

```bash
# Terminal 1, worktree root
pnpm server:test

# Terminal 2, worktree root
pnpm web:test
```

The browser URL is `http://127.0.0.1:3000`. This is the real built backend plus
real Nuxt frontend; it is not the packaged desktop application.

### Packaged Electron path

The Round 17 macOS candidate was built with:

```bash
pnpm --filter autobyteus-web build:electron:mac
```

The packaged executable exercised by API/E2E was:

```text
/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus
```

For this path there is no separate frontend command: Electron loads the bundled
generated renderer and starts its bundled server on fixed port `29695` with the
selected home directory's `.autobyteus/server-data` root. API/E2E launched this
actual executable six times across three isolated synthetic existing-user
profiles, verified REST health, preload IPC, assembled GraphQL, the rendered
Settings UI, migration/reset/reconfiguration, and restart, then shut down every
owned process.

The first packaged attempt correctly refused to continue while the user's
installed `/Applications/AutoByteus.app` owned port `29695`. No user process was
terminated. Execution resumed only after the user explicitly quit it. The
current delivery check found that installed app running again and deliberately
did not disturb it.

## What Round 17 Fixed And Proved

The user-visible failure was traced to the supported previous application
writing plaintext custom-provider schema v1 while the earlier candidate runtime
accepted only secret-free schema v2. Round 17 adds one bounded startup
transition:

- a valid one- or multi-provider v1 set migrates all-or-nothing into encrypted
  vault entries plus secret-free v2 metadata;
- provider IDs/names and configured/READY behavior survive restart;
- the exact aged zero-byte lock left by the supported old writer is recoverable,
  while a live positive-PID owner remains protected;
- invalid/duplicated/colliding v1 is deleted with
  `SUCCEEDED_WITH_WARNINGS`, built-in Settings remains usable, and the user can
  create a new current provider;
- if safe v1 deletion is unavailable, startup and built-ins remain usable while
  custom-provider creation stays contained until the filesystem problem is
  fixed and the app restarts;
- there is no runtime v1 reader, compatibility fallback, backup/quarantine,
  partial migration, alternate source, or automatic `.env` import/update.

## macOS arm64 Electron Candidate

DMG:

```text
/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.dmg
```

ZIP:

```text
/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.zip
```

Direct app bundle:

```text
/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
```

Integrity rechecked by delivery on 2026-07-27:

- DMG SHA-256:
  `bb220cc8f73af78d795fbab6c1cd0a46534a21bca3ac3854d2faf9feca449fde`
- ZIP SHA-256:
  `4274a30f44984804a57aa2b76b55366bb9f0ad37dc7c361bf8d36cf2e6d1afa8`
- `hdiutil verify`: Pass
- `unzip -tq`: Pass
- Bundle: `com.autobyteus.app`, version `1.4.26`, arm64
- Signing: local ad-hoc/unsigned candidate; not a notarized publication artifact

## How To Verify Without Confusing It With The Installed App

The candidate has the same application identity and fixed embedded-server port
as `/Applications/AutoByteus.app`. It cannot run side by side with the installed
app.

1. Finish or save any work in the installed app, then quit it normally.
2. Confirm the fixed port is free:

   ```bash
   lsof -nP -iTCP:29695 -sTCP:LISTEN
   ```

   The command should print no listener.
3. Prefer a disposable macOS user account so the candidate gets a separate
   home directory and `.autobyteus` root. Otherwise make a coordinated backup
   first: the application DB and adjacent `.secret.key` are one inseparable
   restore/reset pair.
4. Open the current DMG:

   ```bash
   open "/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.dmg"
   ```

5. Copy `AutoByteus.app` to a temporary Applications folder. Control-click and
   choose **Open** if macOS warns because this local candidate is unsigned.
6. Verify startup, then open **Settings -> API Key Management**. Existing valid
   custom providers should appear once as configured/READY. If old data was
   invalid and reset, built-ins should still render and **New Provider** should
   work.
7. Quit the candidate normally before reopening the installed app.

Do not use **Reset Server Data** unless the selected application data is
intentionally disposable; reset removes the whole server app-data directory,
including the database and derived key.

## How To Capture A Remaining Startup Failure

If the candidate still reports `Server process exited with code 1`:

1. Click **Show technical details** and copy the value-safe text.
2. Capture:

   ```bash
   tail -n 200 ~/.autobyteus/logs/app.log
   lsof -nP -iTCP:29695 -sTCP:LISTEN
   ```

3. State whether the installed app was fully quit and whether this was a
   disposable or existing-user profile.

Do not share `.env`, `.env.test`, an assignment source, the application DB, the
`.secret.key`, or credential values.

## Validation Evidence

- Canonical execution report:
  `tickets/in-progress/secure-centralized-secret-provisioning/execution-coverage-report.md`
- Canonical durable-test review:
  `tickets/in-progress/secure-centralized-secret-provisioning/api-e2e-test-review-report.md`
- Packaged existing-user rerun (six real launches):
  `execution-evidence/264-round17-packaged-electron-existing-user-rerun.log`
- Packaged existing-user screenshots: evidence `247`, `248`, and `250`
- Final value-safety scan: evidence `265`
- Final API/E2E package check: evidence `266`
- Delivery latest-base and built-server E2E check: evidence `267`
- Delivery DMG/ZIP integrity recheck: evidence `268`
- Delivery final claim, boundary, artifact, and value-safety check: evidence
  `269`
- User-reported packaged terminal failure-origin analysis and safe native PTY
  probe: `execution-evidence/270-user-reported-packaged-terminal-failure-origin.log`

Round 17 also passed the full affected API/E2E regression matrix, exact
`repository_prisma@1.0.8` policy/integration suite, real configured-provider
matrix, web Settings suites, Docker build/restart/persistence, external Codex
and both Claude modes, Electron AppData/runtime suites, cleanup, and evidence
scanning.

## Preserved Boundaries And Truthful Limitations

- Claude modes remain exactly `cli` and `managed-secret`; external Codex remains
  unchanged. The 2026-07-27 official-source recheck is a maintained external
  dependency, not legal clearance or an authentication redesign.
- Claims remain `LOCAL_HARDENED`; Codex is excluded from its governed-child
  environment portion and `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0 remains.
- Docker topology, source/template immutability, explicit importer target
  authority, no automatic `.env` import/update, and `DASHSCOPE_API_KEY` as the
  sole Qwen mapping remain unchanged.
- Gemini AI Studio and Serper were not configured; no pass is claimed.
- Configured AutoByteus remote LLM/audio/image discovery was unavailable with
  `AUTOBYTEUS_LLM_DISCOVERY_FAILED`, `AUTOBYTEUS_AUDIO_DISCOVERY_FAILED`, and
  `AUTOBYTEUS_IMAGE_DISCOVERY_FAILED`; no alternate endpoint or pass was
  invented.

## Next Decision

The user's current result is recorded as **Failed**. Do not retry this candidate.
After the implementation fix passes source review and realistic packaged
API/E2E validation, delivery must produce a new candidate and request renewed
explicit user verification. Only that later **Verified** result can authorize
ticket archival and repository finalization.
