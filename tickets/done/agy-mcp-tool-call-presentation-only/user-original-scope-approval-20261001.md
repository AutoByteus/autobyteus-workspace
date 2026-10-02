# SR-006 explicit scope-reset approval — 2026-10-01

The Solution Designer proposed restoring only the original AGY presentation change, its directly related tests/documentation, and unchanged old stored runs; excluding both history/migration fixes and broader repairs while preserving them separately; building on latest origin/personal and validating before release.

User explicitly approved:
> I also think so. Let's do it. Let's don't include the additional test failure, because I remember that earlier we already fixed the ticket and later we increased the scope. And now we found the more problem, right? Let's only just release the original anti-gravity ticket.

This approves SR-006's reinstatement of original REQ-001..007, AC-001..008, BEH-001..006, SCN-001..004, UC-001..003 and DEC-001..005, and retirement from this release of SR-005's added requirements. It authorizes safe separation, not deletion of tests/work, falsifying results, or bypassing narrow-candidate checks and Delivery's user-verification/release gates. The original testing confirmation was of an earlier candidate; not renewed verification of this unbuilt candidate. User also reports that the built original personal product works; this is a user observation, not independent suite evidence or proof of no defects.

## New-ticket clarification in the same approval round

User additionally requested: "bootstrap [a] new ticket", apply the original Antigravity changes there, send for additional tests, release only if they work, and leave fixing the other tests to a future separate ticket. This confirms the same behavioral scope and adds a distinct ticket identity: `agy-mcp-tool-call-presentation-only`. No future broad-repair ticket is silently started. The parent ticket/worktree remains preserved as deferred context. SR-006 is the completed scope-reset/new-ticket round; prior SR IDs are inherited history, not fabricated new-ticket activity.
