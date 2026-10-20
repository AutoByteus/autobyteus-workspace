# Implementation Revision Record — autobyteus-ts-dependency-hygiene

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-sr-001.md` (direct route) → initial implementation | N/A | `Initial Baseline` | SR-001; ARCH-REV/CRR/API-REV/DR `N/A` | Implemented; ready for direct API/E2E validation |

## Revision Entries

### IR-001 — Remove the standalone lockfile, the dead nested workflow and the unused `hono`

- Triggering role, report path, and round: Solution Designer, `handoff-sr-001.md`, SR-001 (architecture review not selected: Small/Low)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented at `54c9259858` on `codex/autobyteus-ts-dependency-hygiene`. Checks IMP-01…IMP-08 pass.
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the design
- Approved behavior or requirement IDs affected: REQ-001…REQ-004 (BEH-001…BEH-004)
- Implementation delta:
  - Deleted `autobyteus-ts/pnpm-lock.yaml` and `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml`, which leaves no `.github` folder.
  - Removed `"hono": "^4.0.0"` from `autobyteus-ts/package.json`.
  - The root `pnpm-lock.yaml` loses only the 3 `hono` lines of the `autobyteus-ts` importer.
- Lockfile method:
  - A plain `pnpm install` after the manifest edit re-resolves the lockfile. That also deduplicates `eventsource-parser` 3.0.6 to 3.1.1 under `@modelcontextprotocol/sdk@1.32.1`, a change outside the expected diff.
  - The committed lockfile is the base lockfile minus the importer's `hono` lines instead. pnpm accepts it as current: `--frozen-lockfile` reports "Lockfile is up to date", and a later plain `pnpm install` keeps it byte-identical (IMP-01).
- Changed files or areas: the 4 files above
- Local validation and result: IMP-01…IMP-08 in `implementation-handoff.md` Checks Run, all Pass (including the packaged macOS smoke check)
- Next recipient or routing: API/E2E engineer (direct route, Small/Low)
- Remaining limitations or risks: the packaged check ran on macOS arm64 only; Linux, Windows and Docker were not built here. Follow-up FU-002 is recorded.
