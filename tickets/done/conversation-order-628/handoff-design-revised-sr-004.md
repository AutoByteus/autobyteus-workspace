# Handoff: Architecture Design Complete, revised (autobyteus-628, SR-004)

- Result: `Architecture Design Complete`, task_size `Large`, architectural_risk `High`. Route: architecture review.
- Package, worktree, branch and base: as in `handoff-architecture-design-complete.md`.
- What changed: the founder's rule "the server records the time; the client only shows it" (REQ-004, DEC-004, approved by the user).
  - **D-3:** `occurred_at` (ISO, required) on every `AgentPresentationMessage`. It is stamped once by AgentRun's dispatch as `AgentRunEvent.occurredAt`, which the memory recorder also uses as the trace `ts` for external runtimes. The web takes every row's time from the server (frames, the echo, stored `ts`) and never from its own clock.
  - FU-001 (compaction placement) is resolved in this ticket.
  - D-1 and D-2 (SR-001/SR-002) are unchanged. Implementation has built them and is holding the handoff.
- The data contract and its validation come first in the D-3 section of `design-spec.md`.
- Earlier rounds:
  - SR-002: D-2's rule covers native.
  - SR-003: the real reload path sorts by `ts`.
- Documents: `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `probes/`.
