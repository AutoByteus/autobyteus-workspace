## Improvements
- Improved `edit_file` context-mismatch feedback with precise hunk details and safe reread-and-retry guidance.

## Fixes
- Fixed unterminated final patch records so added text cannot join untouched file content.
- Preserved explicit no-final-newline edits through the standard `\ No newline at end of file` marker.
- Kept failed multi-hunk edits atomic so diagnostic candidates are never applied and no partial write occurs.

- **Performance:** Optimized `run_bash` JSON output to omit empty or default fields (`stdout`, `stderr`, `timedOut`, `backgroundProcesses`), saving LLM context tokens on successful silent commands.
