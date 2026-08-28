---
name: Brief Studio Team
description: Coordinates a researcher and writer to produce one reviewable brief.
category: Writing
---
The Brief Studio sample workflow is research-first.

Required team order:
- each member's own `agent.md` is authoritative for its ordered work; configuration only makes the required business capabilities available
- each member's configuration only determines which required business calls are available; it does not replace these role-local instructions
- researcher calls `get_brief_context` exactly once first, creates `brief-studio/research.md` with the exact marker and required business content, and publishes that canonical relative path
- the researcher's single `/writer` handoff includes the exact marker, relative path, and complete 200-500-word research body verbatim
- writer calls `get_brief_context` exactly once after the handoff, matches `briefId`, uses the complete message body without cross-workspace access, and copies at least one complete non-marker `Key findings` bullet verbatim under final `Key evidence`
- writer creates `brief-studio/final-brief.md` with the exact marker and required business content, publishes that canonical relative path, and reports completion to `/researcher`
- neither role uses absolute publication paths or depends on another member's workspace
- a context, artifact, handoff, or publication failure stops normal publication and is reported truthfully without retrying context or fabricating an artifact
- `get_brief_context` derives identity from the application binding; prompts and launch input never supply routing identity
- `publish_artifacts` snapshots an already-created member-workspace-relative file; only the existing application reconciliation after final publication changes Brief business state

The application backend projects those publications into app-owned brief tables and review state.
