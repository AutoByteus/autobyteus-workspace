# Release Notes

- Fixed false prompt-file warnings in the desktop app when agent and team definitions are loaded from configured external definition sources.
- Updated runtime prompt resolution so each new run uses a fresh full definition snapshot, keeping instructions in sync with `agent.md` changes on the next run.
