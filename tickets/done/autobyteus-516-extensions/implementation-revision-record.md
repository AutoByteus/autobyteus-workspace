# Implementation Revision Record — autobyteus-516 Stage 1

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, design-review-report.md, ARCH-REV-002 Pass | N/A | `Initial Baseline` | SR-006…SR-008 (+ the `platform` field confirmed by the Solution Designer during implementation), ARCH-REV-002 | Implemented; reviewed in CRR-001 |
| IR-002 | Code reviewer, code-review-report.md, CRR-001 (Fail, Local Fix) | CR-001, CR-002 | `Local Fix` | CRR-001; SR-007; ARCH-REV-002 | Fixed; back to code review (targeted delta) |

## Revision Entries

### IR-001 — Extension foundation on every node, Voice Input as its first extension

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented on `codex/autobyteus-516-extensions` (base `origin/personal` @ fdde5406fa) in commits 60a02aa667, 3982b0042e, d2934d630f, 8bf772e0e6, 38058ec630, cc3094a0cb; the extension package repository `AutoByteus/autobyteus-extensions` exists locally at `/Users/normy/autobyteus_org/autobyteus-extensions` (commit 4d00904, not pushed: the founder creates the GitHub repository and the signing key).
- Related solution revision IDs: SR-006, SR-007, SR-008; one design addition decided with the Solution Designer during implementation: `ExtensionList.platform` (option (a), confirmed 2026-11-26, recorded by the Solution Designer in design-spec.md and solution-revision-record.md).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A. Related API/E2E revision IDs: N/A. Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation of the approved Stage 1 design.
- Approved behavior or requirement IDs affected: REQ-001…REQ-012, AC-001…AC-012, BEH-001…BEH-009 (implementation-handoff.md, Reviewed Behavior Implementation Trace).
- Implementation delta: new server subsystem `src/extensions/` with GraphQL/REST transport and owner-only route entry; web Extensions page, card, frame, bridge, dialogs, microphone panel, extensions and voice stores on the node transport; Electron extension manager and IPC removed; sealed client-data step deleting the old desktop install; voice-input package with catalog check, signing and release workflows; docs.
- Changed files or areas: implementation-handoff.md, Key Files Or Areas.
- Local validation and result: implementation-handoff.md, Checks Run (IMP-01…IMP-08, IMP-R): all pass on the final commit except the recorded, explained items.
- Next recipient or routing: `/code_reviewer` (Large / High).
- Remaining limitations or risks: implementation-handoff.md, Known Risks and "Not run".

### IR-002 — CRR-001 local fixes: the retired folder's name and a stale comment

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md`, CRR-001 (round 1, Fail, Local Fix).
- Triggering finding IDs: CR-001, CR-002.
- Classification: `Local Fix`.
- Prior authoritative result: IR-001 (CRR-001 Fail on these two findings; the five points raised in the handoff accepted).
- Current authoritative result: both findings fixed in commit 3961790ab6.
- Related solution revision IDs: SR-007 (persisted-data checklist item 6: current code never names the old folder).
- Related architecture-review revision IDs: ARCH-REV-002. Related code-review revision IDs: CRR-001. Related API/E2E / delivery revision IDs: N/A.
- Why this revision is recorded: the code reviewer's round-1 findings.
- Approved behavior or requirement IDs affected: none changed (REQ-007/BEH-007 deletion step unchanged; dead code removed, Principle 7).
- Implementation delta:
  - CR-001: removed `getCanonicalExtensionsPath` (`autobyteus-web/electron/appDataPaths.ts`) and its expectation (`electron/__tests__/appDataPaths.spec.ts`); removed `E2EElectronPathPlan.extensions` and its value (`electron/launch-profile/electronLaunchProfile.ts`) and the expected key in `tests/e2e/electron-launch-profile-probe.mjs`. Nothing read either. Only the sealed deletion step names `<base data folder>/extensions` now.
  - CR-002: `autobyteus-server-ts/src/extensions/catalog/extension-catalog.ts` comment: fetched once after listen, when the Extensions page opens (`extensions(refreshCatalog: true)`), and at the start of Install and Update.
- Changed files or areas: the five files above.
- Local validation and result: IMP-09 (`evidence/IMP-09-crr-001-fixes.log`): appDataPaths and launch-profile specs 10/10; probe syntax check; server and web typechecks PASS (production errors 0). The packaged launch-profile probe itself (`test:e2e:electron`, needs a packaged build) was not run: its change is one removed expected key matching the removed plan key.
- Next recipient or routing: `/code_reviewer` (Large / High, targeted delta review).
- Remaining limitations or risks: unchanged from IR-001.
