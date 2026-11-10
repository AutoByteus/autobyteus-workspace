# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-002 (Pass), round 1 of implementation | N/A | `Initial Baseline` | SR-002, ARCH-REV-002; CRR/API-REV/DR: N/A | All 12 items implemented on `codex/small-follow-ups-batch-435` (commits `e5ca0e1da7`, `6ca743fee0`); ready for code review |
| IR-002 | Code reviewer CRR-001 (CR-001) → Solution Designer SR-003 → architecture reviewer ARCH-REV-003 (Pass, AR-005), round 2 | CR-001; AR-005; C-05 | `Design Impact` (resolved upstream; implemented here) | SR-003, ARCH-REV-003, CRR-001; API-REV/DR: N/A | DS-006 entry form 2 and DS-006b implemented (commits `d0943a71ac`, `f9cb6f7153`); ready for the Targeted Delta Review |
| IR-003 | Architecture reviewer ARCH-REV-004 (Pass) on SR-004 (items 13, 14 added by the Task), round 3 | N/A (new items) | `Initial Baseline` for items 13, 14 | SR-004, ARCH-REV-004; CRR/API-REV/DR: N/A | Items 13 and 14 implemented (commit `432d1c3af2`); ready for source review |
| IR-004 | API/E2E API-REV-001 (Fail: F1, F2) → code reviewer CRR-003 (CR-002, CR-003) → SR-005 → ARCH-REV-005 (Pass), round 4 | CR-002, CR-003 (F1, F2); ARCH-REV-005 residual (API 26–29 keyboard) | `Design Impact` (resolved upstream; implemented here) | SR-005, ARCH-REV-005, CRR-003, API-REV-001 | DS-002 and DS-005 implemented (`9ee362778e`, `7e53b46d80`) plus a labelled baseline test fix (`06a072014f`); ready for source review |

## Revision Entries

### IR-001 — Twelve follow-ups implemented (baseline)

- Triggering role, report path, and round: architecture reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-review-report.md` (ARCH-REV-002, Pass); first implementation round.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation complete for REQ-001…REQ-012 at commits `e5ca0e1da7` and `6ca743fee0` (regenerated web GraphQL types for the digest field's description); implementation-scoped checks in `implementation-handoff.md` § Checks Run.
- Related solution revision IDs: `SR-002`.
- Related architecture-review revision IDs: `ARCH-REV-002`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-012; REQ-001…REQ-012.
- Implementation delta: the design spec's change sequence, steps 1–8 (see the handoff's behavior trace and its "Implementation decisions inside the design" list).
- Changed files or areas: `autobyteus-web` (app shell, Nodes probe and words, live-stream lifecycle, five stream owners, five registries, phone navigation/opening/tree/restore/shell, Clipboard sheet, run-list refresh, probe), `autobyteus-server-ts` (root manager inactive digest, GraphQL description, key imports), `autobyteus-collaboration-stream-contracts` (key export, tracked `dist`), `autobyteus-android` (full-screen controller, insets, mapper words, pairing Retry), docs.
- Local validation and result: IMP-01 (reproduction fails on base: MSP-32 and 62 unknown browser errors); IMP-10 full phone probe `Pass` after; IMP-02…IMP-12 in the handoff (all `Pass` after the two fixes recorded there: socket doubles, GraphQL codegen).
- Next recipient or routing: code reviewer (Medium / High route), per `get_handoff_rules`.
- Follow-ups added: FU-004 (the browser's `/favicon.ico` request is answered 401; pre-existing).
- Remaining limitations or risks: see the handoff's Known Risks (emulator checks, the Electron-app check of item 2, item 11's live run, and other cutout devices are for API/E2E).

### IR-002 — The phone route follows a New run draft to the node's run

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001, CR-001: Create run wrote the draft's `temp-*` ID, never updated on promotion); the Solution Designer revised the design (SR-003: DS-006 entry form 2 corrected, DS-006b, AC-005-8, DEC-016); architecture reviewer passed it (`design-review-report.md`, ARCH-REV-003, AR-005 non-blocking). Implementation round 2.
- Triggering finding IDs: CR-001; AR-005 (applied); CRR-001 C-05 (optional tidy, applied).
- Classification: `Design Impact` (resolved upstream in SR-003; this entry implements it).
- Prior authoritative result: IR-001 at `49c64e47ee` (CR-001 open).
- Current authoritative result: DS-006b implemented at `d0943a71ac` (code, specs) and `f9cb6f7153` (doc); everything outside DS-006 unchanged.
- Related solution revision IDs: `SR-003`.
- Related architecture-review revision IDs: `ARCH-REV-003`.
- Related code-review revision IDs: `CRR-001`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this implementation revision is recorded: CR-001 rework.
- Approved behavior or requirement IDs affected: BEH-005; REQ-005; AC-005-6, AC-005-8; DEC-016.
- Implementation delta: the desktop's D-13 promotion rule extracted (moved, not copied) to `composables/useDraftRunPromotionRouteSync.ts`, used by `pages/chat.vue` and the new `composables/mobile/useMobileRouteRunSync.ts` (records draft → node run per page; replaces the current entry's `row` at the send and on Back to a recorded draft key); `useMobileNavigation.replaceRowKey`; `utils/runListProjection.ts` `agentRunIdOfRowKey` (also used by the restore, C-05); `MobilePairedShell` mounts the sync; `autobyteus-web/docs/remote_access.md`.
- Changed files or areas: `autobyteus-web/composables/useDraftRunPromotionRouteSync.ts` (moved from `composables/chat/useChatRouteRunSync.ts`), its spec (moved), `pages/chat.vue`, `composables/mobile/useMobileRouteRunSync.ts` (+ spec), `composables/mobile/useMobileNavigation.ts`, `composables/mobile/useMobileSubjectRestore.ts`, `components/mobile/MobilePairedShell.vue`, `components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`, `utils/runListProjection.ts`, `docs/remote_access.md`.
- Local validation and result: IMP-13 (web typecheck and full suite `Pass`), IMP-14 (rendered Create run across the send and reloads `Pass`), IMP-15 (full phone probe `Pass`, MSP-07 included). IMP-01…IMP-12 remain valid for code outside DS-006 (unchanged since `e5ca0e1da7`/`6ca743fee0`); the server and Android code did not change.
- Next recipient or routing: code reviewer (Targeted Delta Review), per `get_handoff_rules`.
- Remaining limitations or risks: entries other than the current one cannot be rewritten (History API); an entry pushed before the send and first visited after a reload still names the draft and gives the list (accepted in SR-003).

### IR-003 — Items 13 and 14: self-delegation words; System instructions shown whole

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` ARCH-REV-004 (Pass) on SR-004; round 3.
- Triggering finding IDs: N/A (new items from the Task's comments).
- Classification: `Initial Baseline` for items 13 and 14.
- Prior authoritative result: IR-002 (items 1–12).
- Current authoritative result: items 13 and 14 at `432d1c3af2`.
- Related solution revision IDs: `SR-004`. Architecture review: `ARCH-REV-004`. Code review, API/E2E, delivery: `N/A`.
- Why recorded: new items.
- Approved behavior or requirement IDs affected: BEH-013, BEH-014; REQ-013, REQ-014; AC-013-1, AC-014-1, AC-014-2; DEC-017, DEC-018.
- Implementation delta: see the handoff's "IR-003 delta".
- Changed files or areas: server `collaborator-errors.ts`, `catalog-delegation.ts`, four test files, four server docs; web `SystemInstructionActivityItem.vue` (+ spec), `docs/agent_execution_architecture.md`.
- Local validation and result: IMP-16 (server and web tests `Pass`), IMP-17 (rendered on the phone and the desktop panel `Pass`).
- Next recipient or routing: the IR-003 handoff was not sent separately (the session ended before it); it goes to the code reviewer with IR-004.
- Remaining limitations or risks: item 13 was not run through a real agent's tool call (API/E2E).

### IR-004 — DS-002 reads a readable Host-gate refusal; DS-005 turns decor fitting off in full screen below API 35

- Triggering role, report path, and round: API/E2E `API-REV-001` (Fail: F1 on Android 14, `evidence/api-e2e/API-18-android14-full-screen.txt`; F2 in the Electron window, `API-13-electron-nodes-page.txt`) → code reviewer CRR-003 (CR-002, CR-003) → Solution Designer SR-005 (DEC-019, DEC-020) → architecture reviewer ARCH-REV-005 (Pass, with a residual on the API 26–29 keyboard); round 4.
- Triggering finding IDs: CR-002 (F1), CR-003 (F2); the ARCH-REV-005 residual.
- Classification: `Design Impact` (resolved upstream in SR-005; implemented here).
- Prior authoritative result: IR-003 at `432d1c3af2` (F1, F2 open).
- Current authoritative result: `9ee362778e` (item 2), `7e53b46d80` (item 5), `06a072014f` (baseline test fix).
- Related solution revision IDs: `SR-005`. Architecture review: `ARCH-REV-005`. Code review: `CRR-003`. API/E2E: `API-REV-001`. Delivery: `N/A`.
- Why recorded: rework for F1, F2.
- Approved behavior or requirement IDs affected: BEH-002, BEH-004; REQ-003, REQ-004; AC-003-1…3, AC-004-1; DEC-019, DEC-020.
- Implementation delta: see the handoff's "IR-004 delta".
- Changed files or areas: web `utils/nodeIdentityProbe.ts`, `utils/nodeConnectionErrorText.ts`, `localization/messages/{en,zh-CN}/nodesPage.ts`, two specs, `docs/settings.md`; Android `ui/DesktopFullScreenController.kt`, two unit tests, three instrumented tests.
- Local validation and result: IMP-18 (web), IMP-19 (Android unit), IMP-20 (instrumented suite on API 34 and API 29: the page spans the cutout in full screen and only the keyboard pads it; soft-input mode observed; `adjustResize` not declared, with reasons).
- Next recipient or routing: code reviewer (source review of IR-003 and IR-004), per `get_handoff_rules`.
- Remaining limitations or risks: API 28 and API 26–27 not run on a device; the Electron and Docker-node re-checks of F1/F2 are API/E2E's.
