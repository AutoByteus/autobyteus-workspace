# Initial Browser Automation Public-Surface Classification

The initial browser automation used a body-text occurrence condition that could count prompt text as completion. The browser itself and all provider calls were real, but that completion predicate was insufficient.

Authoritative public-surface reinspection classified:

- AutoByteus: complete (persistent nested handoff/peer/summary, exact same-task-Team peer round trip, exact submission, accepted review, final response, termination/restore).
- Codex: task lifecycle and same-task-Team peer round trip complete with exact final response, but the nested persistent summary had not yet reached `/Teacher` when the initial runner terminated the TeamRun. Superseded by a fresh bounded rerun.
- Claude: incomplete; the TeamRun was terminated while the task remained active and peer responses were still pending. Superseded by a fresh bounded rerun.

The initial JSON and screenshots remain retained as truthful setup/history evidence and are not counted as final Codex or Claude Pass rows. Final row classification requires authoritative GraphQL communication/task records and exact Teacher projection, not prompt/body token occurrence.
