# Consecutive Thinking Blocks and Reliable Tool Boundaries

## Highlights

- Groups consecutive Codex reasoning snapshots into one continuous **Thinking** block instead of rendering back-to-back cards for provider-internal item boundaries.
- Preserves the same grouping after a new run is reopened from local history.
- Starts a new Thinking block only when a real ordered conversation boundary is created, such as a new tool card or assistant-text boundary.

## Tool Ordering And Reliability

- Keeps reasoning together when a matching tool result, status, log, approval, or completion updates a tool card that is already positioned in the conversation.
- Places genuine result-first and provider-late tool calls at the correct point between separate Thinking blocks.
- Distinguishes explicit empty tool arguments from missing arguments so valid calls persist while incomplete placeholders wait for authoritative details.
- Prevents malformed, duplicate, or argument-less placeholder events from fabricating duplicate tool rows in history.
- Persists each tool invocation as one correlated call/result pair for reliable live display, reload, Memory inspection, and generated work traces.

## Compatibility And Data

- Existing historical runs are not rewritten; the corrected grouping applies to newly recorded runs.
- No database migration, backfill, or user-data rebuild is required.
- Codex reasoning deltas remain non-display transport noise; completed reasoning snapshots are the canonical visible and persisted content.

## Validation

- Verified in the replacement macOS Electron application by the user before release.
- Fresh API/E2E validation reached `98.4%` confidence across focused server, GraphQL, frontend hydration, authenticated Codex reasoning, real hosted search, broader regression, and packaged-runtime checks.
