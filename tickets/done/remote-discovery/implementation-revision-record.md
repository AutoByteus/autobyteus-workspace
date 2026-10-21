# Implementation Revision Record — Remote Discovery (autobyteus-261)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-001 (Pass) | N/A (non-blocking notes N-401, N-402 implemented) | `Initial Baseline` | SR-003, ARCH-REV-001 | Implemented; to code review |

## Revision Entries

### IR-001 — Remote discovery, initial implementation

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/remote-discovery/design-review-report.md`, round 1 (ARCH-REV-001 Pass on design commit `3024a61dce`; review files committed in `900e84f1b7`).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented in `93dc932920`; implementation-scoped checks IMP-01 … IMP-04.
- Related solution revision IDs: SR-001 … SR-003
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-401, BEH-402, BEH-404; REQ-401 … REQ-409; DEC-401 … DEC-407; N-401, N-402.
- Implementation delta:
  - the one entry builder;
  - the two request kinds and `target {kind, name}`;
  - `RemoteCatalogLister` on B;
  - `RemoteNodeDiscovery` behind `RemoteDiscoveryChannel` on A, and the strict list parser in `PeerClient`;
  - `list_available_nodes` and `node` on `list_available_agents`, exposed on AutoByteus, Agent Tools MCP and Claude;
  - the DEC-406 texts; the docs.
  - See `implementation-handoff.md` § Current Implementation Summary.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result:
  - IMP-01 typecheck: pass.
  - IMP-02 focused: 538 tests pass.
  - IMP-03 architecture: 43 pass and 1 pre-existing failure (FU-002).
  - IMP-04 full server unit suite: 6455 pass and 1 load-timing flake in an untouched area, which passes 3 / 3 alone (IMP-05).
- Next recipient or routing: Code Reviewer (architectural risk High).
- Remaining limitations or risks:
  - FU-001 (application-owned runs; pre-existing policy question);
  - FU-002 (pre-existing architecture guard failure);
  - the two-server E2E and the user's AC-408 check are not run (API/E2E and the user).
