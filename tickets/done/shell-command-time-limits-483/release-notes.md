## Long commands run to the end, and the Activity tab says why a background task stopped

- Claude agents can now run a shell command for up to 2 hours, in the foreground or in the background. Before, a command was moved to the background after 2 minutes (10 minutes with an explicit time), and a background command was stopped after 30 minutes. If you set `BASH_DEFAULT_TIMEOUT_MS` or `BASH_MAX_TIMEOUT_MS` in the server's environment or in Claude Code's own settings, your value is kept.
- Codex, Grok, Antigravity and AutoByteus agents never stopped a long command on a clock. Each of them was checked with a 35-minute background command, and none changes.
- The Background Tasks panel and the phone's Activity screen now say why an ended task ended, in one line: "Stopped: it reached its time limit — not a failure of the command", "Stopped: the computer was low on memory", "Stopped: the run ended", or "Exit code N". When the runtime gives neither a reason nor an exit code, the runtime's own summary is shown as before.
- With no agent selected, the Background Tasks panel says "Select an agent to see its background tasks." instead of waiting for a run.
- Every agent's instructions now end with a short section on long commands, written for its own runtime: start a long build or test suite once, let it run in the background, act on its completion notice, and do not wait in loops of short sleeps or start a second copy.
- Known limit: in our check, a Grok agent was not woken when its background command ended. It can still wait for the command itself.
