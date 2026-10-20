# Implementation Revision Record — settings-update-notifications

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | Implemented; code review Fail (CRR-001, CR-001) |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 | CR-001 | `Local Fix` | SR-004, ARCH-REV-002, CRR-001 | Fixed at `c42bf2abc4`; back to code review |

## Revision Entries

### IR-001 — Initial implementation of update notifications (server, desktop shell, web)

- Triggering role, report path, and round: architecture reviewer (`/software_engineering_team/architecture_reviewer`), `design-review-report.md` round 2, Pass (ARCH-REV-002).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete at commit `71cfcd7d32` (server `da74c13406`, desktop shell `eba4674616`, web and docs `71cfcd7d32`); handoff documents and evidence in the following ticket commit.
- Related solution revision IDs: SR-004 (SR-001..SR-003 as its basis)
- Related architecture-review revision IDs: ARCH-REV-002 (AR-001..AR-003 resolved in SR-004 and implemented here)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed SR-004 design.
- Approved behavior or requirement IDs affected: BEH-001..BEH-010; REQ-001..REQ-020; AC-001..AC-021 (see the handoff's trace).
- Implementation delta: see `implementation-handoff.md`, Reviewed Behavior Implementation Trace and Key Files.
- Changed files or areas: `autobyteus-server-ts/src/{update-notifications,integrations/github,agent-packages/services,skills/services,api,compositions,utils,services/server-settings-service.ts}`; `autobyteus-web/{electron/updater,electron/launch-profile,electron/application,shared,scripts/isolated-app,scripts/electron-launch,stores,components,services,composables,graphql,types,utils,localization,app.vue}`; docs.
- Local validation and result: IMP-01..IMP-08 and IMP-10 in the handoff; all Pass at `71cfcd7d32` (IMP-03 is the reproduction of the AF-05 race without serialization).
- Next recipient or routing: code reviewer (Large/High route), from `get_handoff_rules`.
- Remaining limitations or risks: the handoff's Known Risks (packaged generic-feed check not exercised here; dialog/panel overlap at narrower windows is a Product question; macOS install of a test-feed build).

### IR-002 — One unreadable source owner no longer stops update notifications (CR-001)

- Triggering role, report path, and round: code reviewer (`/software_engineering_team/code_reviewer`), `code-review-report.md`, CRR-001 (Fail).
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001 at `71cfcd7d32`: `UpdateNotificationService.readSourceStates()` rejected the whole operation when any owner threw, so a malformed skill source registry stopped every node notification (listing, mark read, clear, reconcile).
- Current authoritative result: `c42bf2abc4`. Each owner is read on its own; a failing owner is logged as `UPDATE_NOTIFICATIONS_SOURCE_UNAVAILABLE:<kind>`; that kind's stored records are kept unchanged (not deleted as "source gone") and hidden; the other kinds are reconciled, persisted, listed, marked read and cleared; commands act on listed records only.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: CR-001 (DESIGN.md rule 7; `skills.md` "reported without disabling unrelated local skills").
- Approved behavior or requirement IDs affected: BEH-009, REQ-008 (DS-007 "Source gone" now applies only to a source absent from a readable owner), QR-005.
- Implementation delta: `readSourceStates()` returns `{ states, unavailableKinds }`; `reconcileRecords(stored, states, unavailableKinds, now)` keeps records of unavailable kinds; `run()` passes commands an `isListed` predicate; `markAllRead` and `clear` act on listed records only.
- Changed files or areas: `autobyteus-server-ts/src/update-notifications/services/update-notification-service.ts`; tests `tests/unit/update-notifications/update-notification-service.test.ts` (the full-rejection test replaced by four tests), `tests/unit/api/graphql/update-notifications-schema.test.ts` (real owners, malformed registry); `docs/modules/update_notifications.md` (one paragraph).
- Local validation and result: IMP-11 Pass; the new GraphQL test fails against the IR-001 service and passes with the fix.
- Next recipient or routing: code reviewer (Targeted Delta Review), from `get_handoff_rules`.
- Remaining limitations or risks: unchanged from IR-001.
