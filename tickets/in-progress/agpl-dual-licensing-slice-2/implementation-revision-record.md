# Implementation Revision Record — agpl-dual-licensing, Slice 2

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline and later deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `solution-handoff.md` / Slice 2 initial | N/A | `Initial Baseline` | `SR-007`; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Slice 2 implemented at `411bac9c9`; local checks, a macOS desktop build and the released server image build pass |

## Revision Entries

### IR-001 — Licence in shipped software, CLA, licensing release gate

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2/tickets/in-progress/agpl-dual-licensing-slice-2/solution-handoff.md`, Slice 2 initial round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Every entry in the design's Final File Responsibility Mapping is implemented in commit `411bac9c9` on `codex/agpl-dual-licensing-slice-2` (19 files).
- Related solution revision IDs: `SR-007`
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: Initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-004 (REQ-007), BEH-005 (REQ-008), BEH-001…003 (REQ-010); REQ-011 note carried.
- Implementation delta:
  - Desktop: licence constants module, `build.ts` copyright, extra resources and preflight, plus an integration test.
  - Docker: COPY of the licence files and the OCI label in 4 Dockerfiles.
  - Gateway: licence copy and verification in the runtime-package script.
  - Gate: licensing checker and unittest, plus a gate step in 4 release workflows.
  - Docs: CLA.md, CONTRIBUTING.md, the PR template, and LICENSING/README pointers.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: all pass; see `implementation-handoff.md` § Local Implementation Checks Run. Highlights:
  - checker unittests 12/12; checker exits 0 on the tree and 1 on deliberate edits;
  - packaging integration tests 12/12 with the packaged-output assertions running;
  - macOS desktop build: resources, `LICENSE` sha256 and `NSHumanReadableCopyright` verified;
  - `Dockerfile.monorepo` image: `/app` licence files and the OCI label verified;
  - actionlint clean on all 4 workflows.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct route, Medium/Low).
- Remaining limitations or risks:
  - The gateway runtime package and the `remote-server`/`allinone` images cannot be built end-to-end on the base commit, for reasons that predate this slice (upstream discrepancy UD-001/UD-002 in the handoff).
  - The iOS gate is placed after the release-ref checkout (IMPL-NOTE-001).
  - Signing and notarization were not exercised locally (no identity).
  - Lawyer review is still needed (REQ-011).
