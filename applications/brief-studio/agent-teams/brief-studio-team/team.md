---
name: Brief Studio Team
description: Coordinates a researcher and writer to produce one reviewable brief.
category: Writing
---
The Brief Studio sample workflow is research-first.

Required team order:
- researcher starts the fresh run, writes `brief-studio/research.md`, publishes it with `publish_artifact` using the exact absolute path returned by the write step, and then hands off to the writer before drafting begins
- researcher should publish a short structured research checkpoint, not a long report
- if research is blocked, researcher must complete the same sequence for `brief-studio/research-blocker.md`
- writer begins only after that handoff arrives, then reviews the handed-off file, writes a concise reviewable writer checkpoint, and publishes it with `publish_artifact` using the exact absolute path returned by the write step
- `publish_artifact` is the end-of-checkpoint publication step after the file has been written, not the file-creation step
- when calling `publish_artifact`, use the exact absolute file path returned by the write step instead of reconstructing or guessing the path
- avoid freeform prose when a tool sequence is required

The application backend projects those publications into app-owned brief tables and review state.
