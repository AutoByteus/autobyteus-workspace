# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-001, SR-002, ARCH-REV-002; CRR/API-REV/DR N/A | Implemented at `df789a89a5`; local checks IMP-01–IMP-10 pass; to code review |

## Revision Entries

### IR-001 — Superseded node-update failures and the desktop release order

- Triggering role, report path, and round: architecture reviewer, `tickets/in-progress/node-update-failure-and-release-order/design-review-report.md`, round 2 (ARCH-REV-002, Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete at `df789a89a5` (upstream documents committed as received at `90330172be`); `Medium` / `High` confirmed
- Related solution revision IDs: SR-001 (requirements), SR-002 (design)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation of the SR-002 design
- Approved behavior or requirement IDs affected: REQ-001 to REQ-007; BEH-001 to BEH-005; AC-001 to AC-009
- Implementation delta:
  - FU-003: the rule `isSupersededFailure`, `NodeAutoUpdateRecord.remove`, the superseded rule applied first in `NodeAutoUpdater.reconcile`, `NodeAutoUpdater.recheckFailure` (steps 1–8), IPC `node-auto-update:recheck` with the wiring reordered, the preload method and both typings, `nodeAutoUpdateStore.recheck`, and the combined-key `immediate` watch in `NodeServerUpdate.vue`.
  - FU-004: `latest*.yml` removed from both softprops lists in `publish-release`; new steps "Wait for the server packages" (120 × 30 s, skipped without `system-level.json`, fails naming the tag and the missing files) and "Publish the desktop updater files" (`gh release upload --clobber`, four explicit paths).
  - Docs: RELEASE.md and three web docs.
- Changed files or areas: `autobyteus-web/electron/nodeAutoUpdate/*`, `autobyteus-web/shared/nodeAutoUpdateTypes.ts`, `autobyteus-web/electron/{application/electronApplication.ts,preload.ts,types.d.ts}`, `autobyteus-web/types/electron.d.ts`, `autobyteus-web/stores/nodeAutoUpdateStore.ts`, `autobyteus-web/components/settings/nodes/NodeServerUpdate.vue`, `.github/workflows/release-desktop.yml`, `RELEASE.md`, `autobyteus-web/docs/{electron_packaging,settings,github-actions-tag-build}.md`. Tests: four `electron/nodeAutoUpdate/__tests__` specs (one new), `components/settings/nodes/__tests__/NodeAutoUpdate.spec.ts`, and the new `scripts/tests/test_desktop_release_server_package_wait.py`.
- Local validation and result:
  - IMP-01: the RUN-02 reproduction fails before the fix.
  - IMP-02 to IMP-09: all pass (88 node auto-update tests, 444 Electron tests, 67 Nodes component tests, 1544 settings/stores tests, 11 + 43 workflow tests, typecheck at its baseline, guards).
  - IMP-10: the new tests fail on the AR-001 watch shape and on the old workflow.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Medium/High)
- Remaining limitations or risks:
  - The packaged desktop + isolated Docker node run is left to API/E2E.
  - The Fresh-start build decision is left to API/E2E and delivery.
  - The real-tag asset order (RSK-002) is checked by delivery.
  - RSK-001; the card address vs `baseUrl`; P-003 (cosmetic).
