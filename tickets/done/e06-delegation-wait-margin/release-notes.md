## Antigravity on a busy computer

- Antigravity is no longer reported as unavailable when its CLI is slow to start on a busy computer. The app now waits up to 10 seconds for the CLI's first answer and up to 30 seconds for its model list (before: 3 and 15 seconds). A CLI that does not answer in time is still reported with "Antigravity model discovery timed out; check the CLI and retry."
