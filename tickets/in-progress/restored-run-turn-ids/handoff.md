# Handoff — autobyteus-526 round 1 (`restored-run-turn-ids`)

- Result (SR-002): `Architecture Design Complete`, `task_size: Medium`, `architectural_risk: High` → architecture review (SR-001 was Medium / Low, direct implementation)
- From: Solution Designer, 2026-11-18; revision `SR-001`
- Project Task `autobyteus-526` (part of `autobyteus-530`), requested by `/project_task_manager` for the user; round 1 scope from the founder's dispatch comment (2026-11-18): FU-002 (unique turn ids across restores; conversation no longer merges two turns, desktop and phone) and the restart reminder's time in the reader's local time. Later rounds (FU-001/008/009, FU-004, FU-007) are not in this round.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids`, branch `codex/restored-run-turn-ids`, base `origin/personal` @ `2e9ac1e65b` (beta.10); finalization `origin/personal`; release only on the founder's word
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids/tickets/in-progress/restored-run-turn-ids/`
- Package: `requirements-doc.md` (Approved by the Solution Designer within the direction), `investigation-notes.md`, `design-spec.md` (Ready), `solution-revision-record.md`
- Classification evidence: two local changes in existing owners (turn-tracker seed in `MemoryManager`; the notice card), no contract, store shape or route change
- Each round ends with cleanup and a record copy (founder's direction)
- Route SR-001: rule "Small or Medium and Low" → `/implementation_engineer`
- SR-002 (2026-11-18): validation F-1 / CRR-001 Design Impact: the doubled card has a second cause (notices carry no identity across the snapshot and live paths). Design-spec section "SR-002 — One identity per notice". Route: rule "Large or High" → `/architecture_reviewer`. Reproduction: MSP-75, `evidence/V-04-desktop/`
