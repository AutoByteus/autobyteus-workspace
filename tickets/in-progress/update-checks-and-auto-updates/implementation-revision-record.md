# Implementation Revision Record — update-checks-and-auto-updates

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-005, ARCH-REV-002 | Implemented; code review Fail (CRR-001, CR-001, CR-002) |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 | CR-001, CR-002 | `Local Fix` | SR-005, ARCH-REV-002, CRR-001 | Fixed at `985246c53b`; Targeted Delta Review Pass (CRR-002); with API/E2E |

## Revision Entries

### IR-001 — Check intervals, the app's own check, automatic updates and agent runtimes

- Triggering role, report path, and round: architecture reviewer (`/software_engineering_team/architecture_reviewer`), `design-review-report.md` round 2, Pass (ARCH-REV-002 against SR-005).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A (autobyteus-209's update notifications as the base)
- Current authoritative result: implementation complete at `62082fc36e` (server `95a608c456`, desktop shell `802ffd917a`, web and web docs `25609abdf7`, two test type fixes `62082fc36e`); handoff documents and evidence in the following ticket commit.
- Related solution revision IDs: SR-005 (SR-001..SR-004 as its basis)
- Related architecture-review revision IDs: ARCH-REV-002 (AR-001..AR-007, R-1..R-3 resolved in SR-005; reviewer notes R-6 and R-7 applied; R-5 noted for the Solution Designer)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed SR-005 design.
- Approved behavior or requirement IDs affected: BEH-001, 002, 004..008; REQ-001..REQ-025; AC-001..AC-022 (see the handoff's trace).
- Implementation delta: see `implementation-handoff.md`, Reviewed Behavior Implementation Trace and Key Files.
- Changed files or areas: `autobyteus-server-ts/src/{integrations/github,update-notifications,runtime-management/agent-runtimes,agent-packages/services,skills,config,compositions,api/graphql/types,services/server-settings-service.ts}` and their tests; `autobyteus-web/{electron/updater,electron/server,shared,types,components,stores,composables,services,graphql,utils,localization}`; docs.
- Local validation and result: IMP-00..IMP-12 in the handoff; Pass (IMP-07 after the font-audit fix and a rerun of two suites hit by a concurrent rebuild).
- Next recipient or routing: code reviewer (Large/High route), from `get_handoff_rules`.
- Remaining limitations or risks: the handoff's Known Risks (the 209 server E2E suite needs API/E2E's revision; Electron-only and runtime surfaces not exercised in a real shell; `net.isOnline()` in a packaged build).

### IR-002 — Fresh GitHub wait on the card; no automatic promise with the switch off (CR-001, CR-002)

- Triggering role, report path, and round: code reviewer (`/software_engineering_team/code_reviewer`), `code-review-report.md`, CRR-001 (Fail, 9.2/10; Runtime Correctness 8.6).
- Triggering finding IDs: CR-001, CR-002
- Classification: `Local Fix`
- Prior authoritative result: IR-001 at `62082fc36e`: the Update checks card read `githubWaitUntil` through `ensureResolved()` only, which returns the cached settings, so a wait learned after the window connected never showed; a runtime row with `AUTO_WAITING` kept promising an automatic update after the runtime switch was turned off.
- Current authoritative result: `985246c53b`. The card re-reads the node's settings when it opens (the 30 s expiry stays); the row shows the automatic sentence only while the agent-runtime switch is on.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: CR-001 (REQ-004, AC-004; UI spec line 312, VIS-019), CR-002 (REQ-022, AC-020, REQ-010).
- Approved behavior or requirement IDs affected: BEH-006, BEH-008; REQ-004, REQ-010, REQ-022.
- Implementation delta: `UpdateChecksCard.vue` `onMounted` → `automation.refresh()` when resolved (else `ensureResolved()`); `NotificationRow.vue` `runtimeAutomatic` from `updateAutomationStore`.
- Changed files or areas: `autobyteus-web/components/settings/UpdateChecksCard.vue`, `components/notifications/NotificationRow.vue`; tests `components/settings/__tests__/UpdateChecksCard.githubWait.spec.ts` (new), `UpdateChecksCard.spec.ts` (store mock gains `refresh`), `components/notifications/__tests__/NotificationCenter.automation.spec.ts` (one case); `autobyteus-web/docs/settings.md` (one clause).
- Local validation and result: IMP-13 — the two new tests fail without the fix and pass with it; affected web suites 1,373 tests pass; guards pass.
- Next recipient or routing: code reviewer (Targeted Delta Review), from `get_handoff_rules`.
- Remaining limitations or risks: unchanged from IR-001 (the handoff's Known Risks).
- Review result: Pass, CRR-002 (Targeted Delta Review of `985246c53b`, CR-001 and CR-002 resolved, `code-review-report.md`); the code reviewer handed the package to API/E2E.
