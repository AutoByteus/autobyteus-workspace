# Handoff Summary — collaboration-model-contract

- Task size / architectural risk / route: Large / High / reviewed route (architecture review, implementation review, API/E2E, test-code review)
- Change: one collaboration model, enforced. Delegating to oneself, a teammate or one's own Team is refused with guidance. `send_message_to` is resolve-only and never creates a run. Collaborators and Task helper copies are removed. Stored collaborators are converted at startup into delegated runs. The canonical model document is published and referenced from `DESIGN.md`.
- Branch: `codex/collaboration-model-contract`; base `origin/personal` @ `8878625d94` (unchanged, already current). Implementation commits `5dd930d8be` and `44b5108b12` (CR-001).
- Validation: API/E2E 94%, no category below 90% (the default 95% target is missed by one point; accepted, see the report). Code review CRR-002 9.3/10, test-code review CRR-003 pass.
- Docs: implementation rewrote 25 docs; delivery verified them and fixed one dead anchor.
- Release: none requested. Release notes: release-notes.md.
- Behavior change: an agent that messages a converted collaborator by address now gets "not found" with `delegate_task` guidance. Reach converted runs by run ID.
- Imported Memory Sync data: `memory/imports/docker-node-1/agent_teams/` holds 2 Team trees with 3 collaborators. The migration does not touch imports. The current reader ignores the old key, so both runs still load, but those 3 members are not listed until docker-node-1 runs this release and re-syncs. No file is lost. This is in the release notes.
- Residual risks (accepted): Codex Team/Org live cases and Antigravity host-crash cases not run; wake of a converted run by run ID and the never-started Team's `TASK_EXECUTION_CONTEXT_UNAVAILABLE` proven by integration tests only; startup e2e uses synthesized data per TESTING.md; AutoByteus runtime texts proven at unit level only.
- Pre-existing failures, identical on base: 8 server e2e files / 27 tests, two web probes, run-settings-live R03, `agent-status-websocket` baseline exception. Owners are in the execution report.
- Process note: the implementation stage's real-data proof ran on a copy of local user memory (the original was not written). `TESTING.md` now forbids this. The ticket keeps only the script (`evidence/real-data-proof.test.ts.txt`), not the data.
