## What's New
- Reworked agent `run_bash` execution so commands run through a stateless, non-interactive shell instead of an interactive PTY session.
- Added PID-based background process visibility for shell-native background jobs, including `get_background_processes` for listing active managed processes.

## Improvements
- Large generated files, including standalone HTML apps written through heredocs or redirects, now preserve exact bytes without terminal prompt, echo, or wrapping corruption.
- Background commands now use ordinary shell syntax such as `command > log 2>&1 &`, with process output and stop actions keyed by public numeric PIDs.
- Terminal documentation now clearly separates agent `run_bash` behavior from server/web interactive terminal sessions.

## Fixes
- Removed the legacy `run_bash` background parameter from parser, schema, formatter, and prompt usage surfaces.
- Preserved server/web interactive terminal behavior while isolating agent command execution from PTY-specific artifacts.
