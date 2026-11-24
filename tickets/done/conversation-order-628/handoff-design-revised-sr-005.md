# Handoff: Architecture Design Complete, revised (autobyteus-628, SR-005)

- Result: `Architecture Design Complete` (revised after ARCH-REV-001), `Large` / `High`. Route: architecture review.
- Package, worktree, branch and base: unchanged. Documents at the branch head after `e4fd2564d0`.

## AR-001 (the D-3 section of design-spec.md, rewritten)

- **The three boundaries:** `/ws/agent` (its mapper and parser, snapshot `turn_frames`, peer relay), `/ws/agent-team` (member DTOs built on the shared payload schemas) and Org (`AgentPresentationMessage`). Each has its field, writer, web reader and one example frame.
- **One field definition:** `occurred_at` (`serverTimeSchema`, in agent-presentation-contracts), only on the timed messages. Each is listed with the web handler that times it. Pending input entries get `accepted_at`.
- **One stamp point:** an AgentRun method through which every listener delivery passes: the processed pipeline, the input state, the canonical status and the subscribe snapshot.
- **The placeholder:** an own send has a `null` time until the node confirms it (`received_at` or `accepted_at`). That holds for an empty conversation too. `updatedAt` is derived from row times.
- **Re-walked per stream:** SCN-001…004, the first message of a new run, and the reconnect snapshot.

## AR-002 (requirements and design text aligned with REQ-004)

Out of Scope, Non-Goals, BEH-003, Traceability (REQ-004 / AC-006), the baselines, and D-1's left-alone list.

## Also

- A design case was added (docs/design-cases.md Case 2).
- D-1 and D-2 are unchanged. ARCH-REV-001 passed them, and implementation holds them.
