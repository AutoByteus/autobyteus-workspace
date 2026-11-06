# Implementation Revision Record — S0 (autobyteus-402)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-architecture-design-complete.md`, round 1 | N/A | `Initial Baseline` | SR-001; ARCH-REV `N/A`; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented; local checks pass; ready for direct API/E2E |

## Revision Entries

### IR-001 — Publish only the backend and the loopback VNC Viewer port

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/docker-node-publish-needed-ports/handoff-architecture-design-complete.md`, round 1
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation commit `2575d870e8`; handoff documents and evidence in the following commit
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation of the approved S0 design
- Approved behavior or requirement IDs affected: REQ-001…REQ-006; AC-001…AC-007; BEH-001…BEH-004 (BEH-005 preserved)
- Implementation delta: two host ports per node (`-p B:8000`, `-p 127.0.0.1:N:6080`) in both launchers; VNC/debug port allocation, state keys, hash lines and output removed; `CONFIG_HASH_VERSION` v7 → v8; compose, `.env.example`, `docker-start.sh` aligned; output, help, docs and Docker Guide copy updated; launcher tests rewritten, plus new cases for the v7 → v8 recreate and for urls/help wording
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas"
- Local validation and result: IMP-01…IMP-07 pass; IMP-03 shows the rewritten tests fail (7) on the base launcher
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (Small + Low, direct route)
- Remaining limitations or risks: PowerShell checked statically only (no `pwsh`); the requirements' `start` command does not exist (docs name `upgrade --all` / `workspace apply`); AC-007 desktop viewer not run (RFB handshake is the transport proof)
