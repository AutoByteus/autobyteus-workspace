# API/E2E Revision Record — manage-nodes-professional (autobyteus-363)

The latest coverage investigation and execution report are authoritative; this file records each round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` (IR-001), round 1, direct route | SR-002, IR-001 | N/A | Pass / 95% |
| API-REV-002 | Implementation engineer, IR-002 (DR-001 merge of origin/personal), round 2, direct route | IR-002, DR-001 | Pass / 95% | Pass / 95% |

## Revision Entries

### API-REV-001 — Desktop validation of the redesigned Manage Nodes tab

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), round 1.
- Triggering finding or case IDs: handoff § Downstream Coverage Hints and § Still Required: the update states, the desktop window, the medium tier, keyboard and live regions, zh-CN at 390.
- Related revision IDs: SR-002, IR-001.
- Why recorded: first validation.
- Coverage decisions or durable test paths changed: none. Reused IMP-01/02/03/07/08. The desktop journey `evidence/api-e2e/API-02-desktop-journey.mjs` is ticket-owned.
- Cases: API-01 (Electron build), API-02 (EL-01…EL-10, run 3), API-03 (presentation-only diff), API-04 (visual comparison); all pass.
- Commands, environment, fixture, or broader-validation delta: an isolated desktop instance of the worktree build, real host servers, and a test-owned starter on a Unix socket for the update states.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: all (new).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: delivery engineer.
- Remaining risks, blocked evidence, or untested scope: the real starter was not used (proven in 305; contract unchanged); comparison by inspection, not pixel diff.

### API-REV-002 — Rerun on the merged branch (IR-002)

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` § "IR-002 Reruns after the merge"; round 2.
- Triggering finding or case IDs: DR-001 (delivery: integration refresh, packaging Local Fix).
- Related revision IDs: IR-002, DR-001.
- Why recorded: rerun by impact. The merge `35e5853a22` changed shared foundations (`autobyteus-ts`, `package.json` files, `nuxt.config.ts`, Electron config), so TESTING.md rule 4 marks every case Rerun.
- Coverage decisions or durable test paths changed: none.
- Cases rechecked on `35e5853a22`:
  - API-01: build, `API-01-r2-electron-build.log`.
  - API-03: `API-03-r2-presentation-only-diff.log`. No stores, utils, localization, server or Electron delta over the new base, and no change to this ticket's files in the merge.
  - API-02: run 4, EL-01…EL-10 Pass, the same values as run 3.
  - API-04: run 4 screenshots, unchanged look.
  - The reused cases are now the implementation's round 2 reruns: IMP-10 (typecheck), IMP-11 (guards), IMP-12 (web suite 5020), IMP-13 (NP-01…12), IMP-16 (ND-01…05 on a test-owned image of this worktree's server package; IMP-14 with the released `beta` image failed on the environment, contracts older than 358).
- Commands, environment, fixture, or broader-validation delta: none; same journey script.

#### Prior Failure Resolution

None (round 1 passed).

- Canonical artifacts and sections updated: execution report (Round, ENV-1, Cases, the API-02 note, result), investigation meta.
- Prior result and confidence: Pass, 95%.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: delivery engineer.
- Remaining risks, blocked evidence, or untested scope: as API-REV-001. The Docker probe needs a test-owned image of this branch's server package until a released image carries the 358 contracts (IMP-15/16 recipe).
