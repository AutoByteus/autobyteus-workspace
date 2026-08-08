# Release Notes

- **Performance:** Optimized `run_bash` JSON output to omit empty or default fields (`stdout`, `stderr`, `timedOut`, `backgroundProcesses`), saving LLM context tokens on successful silent commands.
