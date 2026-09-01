# Codex Failed-Command Probe

## Purpose

Determine whether Codex App Server supplies useful failure diagnostics for a
non-zero shell command and identify where AutoByteus loses them.

## Environment

- Date: 2026-09-01 UTC
- Codex CLI: `codex-cli 0.152.0`
- App-server transport: local stdio JSONL
- AutoByteus repository revision: `80e2bd195c42ea3ced778dbc051d4d00edaef16f`
- Probe script: `probe-codex-failed-command.py`
- Retained raw provider events: `codex-app-server-failed-command-raw.jsonl`

## Probe

The live turn required Codex to run this command exactly once:

```bash
/bin/bash -lc 'printf CODEX_FAILURE_STDERR_MARKER >&2; exit 23'
```

The provider's terminal `item/completed` notification contained:

```json
{
  "item": {
    "type": "commandExecution",
    "status": "failed",
    "aggregatedOutput": "CODEX_FAILURE_STDERR_MARKER",
    "exitCode": 23
  }
}
```

The overall Codex turn still completed normally after the failed command. The
command item, rather than the turn, is therefore the supported failure surface
that AutoByteus must project into the failed `run_bash` tool activity.

## Contract Corroboration

- The official Codex App Server documentation defines `commandExecution` with
  terminal `status`, `aggregatedOutput`, and `exitCode` fields and says final
  command items include those fields so clients can summarize execution and
  outcome: <https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md>
- `codex app-server generate-ts --out <temporary-directory>` against the local
  CLI generated the same nullable `aggregatedOutput` and `exitCode` fields on
  the `commandExecution` `ThreadItem` type.

## Current AutoByteus Projection

1. `CodexItemEventConverter` recognizes the terminal item as a command
   execution and delegates to `createTerminalToolExecutionEvent(...)`.
2. `CodexToolPayloadParser.resolveToolResult(...)` knows how to read
   `aggregatedOutput`, but the failed-event path does not publish a result.
3. `CodexToolPayloadParser.resolveToolError(...)` checks explicit
   `error`/`message`, result/content, and `output`, but not
   `aggregatedOutput` or `exitCode`.
4. With the observed provider payload, it therefore returns the fallback
   `Tool execution failed.`
5. Standalone and team streaming preserve that `error` string. The frontend
   Activity card and center tool card render it as received; they are not the
   loss boundary.

## Finding

This is an **AutoByteus Codex command-failure projection gap**, not a Codex
App Server omission and not a frontend-renderer defect. Codex supplied both the
diagnostic output and non-zero exit code. AutoByteus' Codex converter did not
map either field into the failed tool event's user-visible error detail.

The generic fallback remains appropriate only when the provider supplies no
useful explicit error, aggregated output, or exit-code evidence.
