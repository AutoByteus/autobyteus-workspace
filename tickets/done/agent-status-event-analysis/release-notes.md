## Improvements

- Standardized live agent status updates on the public four-state contract: `offline`, `idle`, `running`, and `error`.
- Improved single-agent termination so connected clients receive a terminal offline status before the stream closes.
- Improved team run recovery so an active team can show one running member while other members remain offline instead of copying aggregate running state to every member.
- Improved refresh/reopen handling so valid Stop generation affordances are preserved for active live runs, while stale stop affordances are cleared after offline, error, or non-interruptible idle status updates.
