# Implementation Revision Record — ios-demo-mode-279 (autobyteus-279)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | `SR-002`, `ARCH-REV-002` | Implemented; handed to Code Review |
| IR-002 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-004 (Pass on SR-004) | F-1 (API-REV-001), CR-001 (CRR-002), AR-004, N-4, N-5 | `Design Impact` (resolved upstream; implemented here) | `SR-003`, `SR-004`, `ARCH-REV-003`, `ARCH-REV-004`, `CRR-001`, `CRR-002`, `API-REV-001` | Implemented; handed to Code Review |

## Revision Entries

### IR-001 — The iOS app's built-in demo, the iOS start screen, the iPad layout, DC-007, DC-011, local icons

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/ios-demo-mode-279/design-review-report.md`, ARCH-REV-002 `Pass` on SR-002.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete for Change Sequence steps 1–4 at `df18856ea4` (plus the ticket documents commit); step 5 (the Solution Designer's sweep, then TestFlight on the founder's word) is downstream.
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation handoff.
- Approved behavior or requirement IDs affected: DS-001…DS-006; REQ-001…REQ-011, REQ-013 (REQ-012 and REQ-014 are device and submission steps on the founder's word).
- Implementation delta: the demo node in `autobyteus-web/demo/` and its `--demo` build; the demo identity, iPad layout, DC-007, DC-011 and local icons in the phone shell; on iOS Android's start screen and connect flow, the shell bridge, the demo web view, the demo code and link, the share handling, native sheets as iPad cards; the release workflow builds the bundled demo. Implementation decisions: handoff § Important Assumptions (15 items).
- Changed files or areas: handoff § Key Files Or Areas; 20 commits `12e85dcc05`…`df18856ea4` after `8430d9ef12`.
- Local validation and result: handoff § Checks Run (IMP-01…IMP-12), all `Pass`.
- Next recipient or routing: Code Reviewer (Large/High).
- Remaining limitations or risks: handoff § Known Risks and Not run (the build-only workflow run, the Fresh-start build, the share extension's own UI, device checks).

### IR-002 — Saved computers from the shipped app: the placeholder-name migration and one name rule

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/ios-demo-mode-279/design-review-report.md`, ARCH-REV-004 `Pass` on SR-004, carrying the code reviewer's CRR-002 (CR-001) on API/E2E's API-REV-001 F-1.
- Triggering finding IDs: F-1 (API-REV-001: after an update, a computer the shipped app saved shows "AutoByteus Desktop"); CR-001 (CRR-002, Design Impact); AR-004 and N-4 (ARCH-REV-003); N-5 (ARCH-REV-004, editorial).
- Classification: `Design Impact`, resolved in the design (SR-003, SR-004) and implemented in this round.
- Prior authoritative result: IR-001, code review `Pass` (CRR-001); API/E2E `Fail` (API-REV-001, F-1).
- Current authoritative result: implemented at `930477c533`; checks IMP-13…IMP-15 pass.
- Related solution revision IDs: `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-003`, `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001`, `CRR-002`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the shipped iOS app saved a computer with no name of its own as "AutoByteus Desktop" (its status check's default); IR-001's shell bridge handed that stored name to the page (`hello.nodeName`), and its native labels would show a typed computer's address.
- Approved behavior or requirement IDs affected: REQ-013 (Preserved Behavior Boundary), REQ-001 (the start screen's rows, Connecting, Can't reach), DS-001's bridge `hello`.
- Implementation delta:
  - `SavedNodeDisplayNamePlaceholderMigration` (new, `AutoByteusMobileCore/DataMigrations/`), run by `AppShellCoordinator.init` after `SavedNodeEntryKeysMigration` and before `SavedNodeStore`: an entry named exactly the placeholder gets its host; writes backup → rewritten entries → marker; a backup without the marker is restored and run again; the marker's next start removes the backup.
  - `SavedNodeEntry.knownName` / `shownName` / `unnamedNodeName` (Android's rule). `NodeConnectionFlow`: `hasKnownName` removed; `onPaired` renames when `knownName == nil`; `showConnecting` / `showCantReach` get `shownName`. `WebShellViewController.shellBridgeHello`: `knownName ?? ""`. `NodeRowView`, `RemoveNodeSheet`: `shownName`.
  - `RemoteAccessStatus.serverName` and its placeholder removed; `ConnectionDiagnosticMapper.phoneAccessDisabled()` without its name parameter (handoff assumption 16).
  - Tests: `SavedNodeDisplayNamePlaceholderMigrationTests` (7), `SavedNodeEntryNamesTests` (3), `NativeNodeNameReadsTests` (2), `NodeConnectionFlowTests` (+2, two expectations now "AutoByteus node"), `ConnectionValidatorTests` (two stale `serverName` assertions rewritten).
- Changed files or areas: handoff § Key Files Or Areas (IR-002 line); commit `930477c533`.
- Local validation and result: IMP-13 core tests (56, 0 failures), IMP-14 the iPhone smoke (every UI test, none skipped), IMP-15 the real app started over the shipped app's saved entries (migrated store; "AutoByteus node" in Can't reach, the row, its ⋮ and the Remove sheet; "Test Node 279" kept). Web unchanged (IMP-01…IMP-07 stand); the iPad demo tests (IMP-10) are unaffected by these files and were not rerun.
- Next recipient or routing: Code Reviewer (Large/High); then API/E2E reruns API-04a/b with a real node.
- Remaining limitations or risks: the accepted effect (a migrated computer has no native name until it is paired again); API-04a/b (update over the shipped app with a real isolated node, re-pair, a new pairing, a typed address with `hello.nodeName == ""`) are API/E2E's.
