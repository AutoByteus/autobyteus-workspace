# Evidence Decision — DEC-006 (grok-release-smoke-551, AC-006)

- From: Solution Designer, 2026-11-22 · To: `/api_e2e_engineer` · Request: API/E2E round 1 (API-REV-001), HEAD `07f03530ff`
- Criterion: AC-006 — two release-smoke runs at load ≥ 40 with Grok passing and Grok start-up times recorded.
- Decision: **use the existing evidence and accept the bounded gap** (your option (b)).
  - Evidence: API-04 run 2 (exit 0, 13/13, grok-4.7, load 45–172, start-ups 213–441 ms); API-04 run 1 (exit 0, 13/13, grok-4.7, partly loaded: 10.5 → 39–51; live AC-003 stale case, pid 6299); API-01 scripted 35 s `initialize` (branch passes; base fails at 15.45 s / 30.2 s).
  - Accepted untested scope: a second smoke run held at load ≥ 40 throughout; a live Grok start-up above 30 s (as DEC-004). Record run 1's load as this accepted gap under DEC-006.
  - No third live run; no follow-up Task (the next release smoke runs the same check at release load before any tag).
- Who decided: Solution Designer, within the direction; user informed. Recorded in `requirements-doc.md` (DEC-006) and `solution-revision-record.md` (SR-003); both edits are uncommitted in the worktree for your round's commit.
