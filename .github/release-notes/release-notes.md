## Improvements
- Improved Codex and Claude agent startup so configured workspace skills are reconciled consistently before a run begins.
- Improved server diagnostics for agent preparation failures while keeping user-facing error messages safe and stable.

## Fixes
- Fixed agent startup failures caused by stale or broken workspace skill links after a configured skill moves or becomes unavailable.
- Fixed Codex skill discovery bypassing repair of the canonical configured workspace link.
- Fixed unavailable optional skills leaving broken runtime links that could block otherwise valid agent runs.
