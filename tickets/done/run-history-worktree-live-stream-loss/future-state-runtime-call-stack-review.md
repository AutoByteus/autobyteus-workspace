# Future-State Runtime Call Stack Review

- Ticket: `run-history-worktree-live-stream-loss`
- Date: `2026-03-10`
- Review Goal: confirm the proposed team-row hydration, sticky-expansion flow, and local draft-removal paths close both reported bugs without introducing a new selection/state owner or coupling temp drafts to persisted-history delete APIs.

## Review Round 1

- Round Result: `Candidate Go`
- Status: `Clean`
- Missing-use-case sweep:
  - verified historical top-row click with no local context,
  - verified already-loaded live team top-row click,
  - verified switch from one team to another while keeping first team visible,
  - verified repeated click on the already selected team still supports explicit collapse,
  - verified empty draft agent removal stays local-only,
  - verified empty draft team removal stays local-only,
  - verified persisted inactive history delete remains on the existing confirmation path.
- Blockers: `None`
- Persisted artifact updates required: `None`
- Newly discovered use cases: `None`
- Files reviewed:
  - `requirements.md`
  - `proposed-design.md`
  - `future-state-runtime-call-stack.md`
- Notes:
  - The design keeps selection semantics aligned with an actual loaded member context.
  - The draft-removal flow stays inside existing local run/team stores instead of weakening persisted-history delete boundaries.
  - The design avoids broader run-history store changes and stays within existing layering.

## Review Round 2

- Round Result: `Go Confirmed`
- Status: `Clean`
- Missing-use-case sweep:
  - rechecked zero-member fallback risk,
  - rechecked live-vs-historical member-row path parity,
  - rechecked expansion persistence does not require a new global store,
  - rechecked temp draft actions do not shadow persisted delete actions,
  - rechecked unchanged persisted delete path for real inactive history rows.
- Blockers: `None`
- Persisted artifact updates required: `None`
- Newly discovered use cases: `None`
- Files reviewed:
  - `requirements.md`
  - `proposed-design.md`
  - `future-state-runtime-call-stack.md`
- Notes:
  - Two consecutive clean rounds are complete.
  - No requirement, design, or call-stack rewrite was needed between rounds.

## Review Decision

- Final Decision: `Go Confirmed`
- Code Edit Readiness: `Ready for Stage 6 unlock once implementation artifacts are initialized`
