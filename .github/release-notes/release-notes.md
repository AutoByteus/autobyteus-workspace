## Improvements
- Improved terminal command reliability on macOS when the interactive shell backend cannot start cleanly.

## Fixes
- Fixed `run_bash` so failed terminal startup no longer leaves later commands stuck with `Session not started`.
- Fixed background shell commands to recover under the same startup-failure conditions as foreground commands.
- Fixed XML-formatted `run_bash` calls so encoded chained commands execute with the intended shell operators and quoting.
