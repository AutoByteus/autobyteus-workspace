# Repository Instructions

## Solution and architecture design

Follow this project's
[SOLUTION_DESIGN_BEST_PRACTICES.md](SOLUTION_DESIGN_BEST_PRACTICES.md). Read it
before drafting or revising a solution, architecture, or refactor plan, and
apply its Mandatory Design Rules, principles, and anti-pattern checks.

Especially for bigger tickets, first establish clean architecture and working
supported functionality with clear ownership and the smallest necessary design.
Do not front-load speculative performance optimizations, concurrency frameworks,
or handling for many imagined edge cases. Then exercise the working product,
observe actual problems, and refine the design for demonstrated needs.

Keep established correctness, security, and data-integrity obligations in the
functional baseline. A performance or concurrency concern already required by
the approved scope is a real requirement, not speculative optimization.
Revisit the guide during implementation and review when introducing guards,
abstractions, historical/global reads, discovery work, or UI projections.

Preserve user-approved behavior and real guarantees, not unnecessary mechanisms.
The guide does not replace explicit requirements approval or the team's workflow.

For validation planning and execution, read [TESTING.md](TESTING.md). Also follow
applicable package-level `AGENTS.md` instructions.
