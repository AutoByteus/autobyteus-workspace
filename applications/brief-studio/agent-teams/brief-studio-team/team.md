---
name: Brief Studio Team
description: Coordinates a researcher and writer to produce one reviewable brief.
category: Writing
---
The Brief Studio sample workflow is research-first.

Required team order:
- each member's own `agent.md` is authoritative for its ordered work; `agent-config.json` selects only real routed capabilities and does not list the provider's built-in patch operation
- both maintained members stay on `codex_app_server` / `gpt-5.6-luna`
- researcher calls `get_brief_context` exactly once first, then uses Luna's built-in `apply_patch` without `run_bash` to create `brief-studio/research.md` and publishes that canonical relative path
- the researcher's single `/writer` handoff includes the exact marker, relative path, and complete 200-500-word research body verbatim
- writer calls `get_brief_context` exactly once after the handoff, matches `briefId`, uses the complete message body without `read_file` or cross-workspace access, and copies at least one complete non-marker `Key findings` bullet verbatim under final `Key evidence`
- writer uses Luna's built-in `apply_patch` without `run_bash` to create `brief-studio/final-brief.md` and publishes that canonical relative path
- neither role uses ordinary registry `read_file`/`write_file`, a shell fallback, or absolute publication paths
- each role reacts only to the provider-reported built-in patch success or failure and never inspects provider protocol events or internal normalized traces
- a context, handoff, built-in-patch, or publication failure stops normal publication and is reported truthfully without retrying context or fabricating an artifact
- `get_brief_context` derives identity from the application binding; prompts and launch input never supply routing identity
- `publish_artifacts` snapshots an already-created member-workspace-relative file; only the existing application reconciliation after final publication changes Brief business state

The application backend projects those publications into app-owned brief tables and review state.
