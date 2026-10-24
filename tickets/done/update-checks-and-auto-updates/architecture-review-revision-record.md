# Architecture Review Revision Record — update-checks-and-auto-updates

The latest `design-review-report.md` is authoritative. This record keeps the review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / High), 2026-10-23 | SR-004 | N/A | Fail (Design Impact) | AR-001..AR-007 |
| ARCH-REV-002 | Round 2 / SR-005 recheck, 2026-10-23 | SR-005 | Fail (Design Impact) | Pass | AR-001..AR-007 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: the core approach holds; the automation, app-check and node-kind sequences need work

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/design-review-report.md`
- Review round and trigger: round 1; Architecture Design Complete from the Solution Designer (`handoff-architecture-review.md`), commit `1b338eabe9`.
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md`; N/A.
- Relevant solution revision IDs: SR-004.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` (Design Impact).
- What changed in the review result or what baseline was established: baseline.
  - The behavior basis is confirmed. The code citations hold, except the composition "handle" (AR-006).
  - AF-08 and AF-09 were confirmed by the reviewer's own probes (ls-refs 84 bytes; 401 for a missing repository; Codex 302; codeload for a renamed repository).
  - Four reachable premises (MP-001..MP-004) drive the blocking findings.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (blocking): runtime refusals are skipped by the automatic `runUpdate`, and the running-agents rule has two owners.
  - AR-002 (blocking): the automation step does not re-check the switch, checks setting and gate per candidate (TR-107).
  - AR-003 (blocking): DS-008 outcome transitions are incomplete (handled with a stale outcome; `AUTO_UPDATED` cases).
  - AR-004 (blocking): the app check's launch and settings entry forms have no single owner; `startAutoCheck` is not addressed.
  - AR-005 (blocking): the runtime category is not traced per node kind; a requirements revision may be needed.
  - AR-006 (non-blocking): composition order and the runtime service handle.
  - AR-007 (non-blocking): the background runtime check should read versions only.
- Material classification changes: none (Large / High confirmed).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: R-1..R-4 in the report.

### ARCH-REV-002 — Recheck of SR-005: AR-001..AR-007 resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-005 revision (`handoff-architecture-review.md`, "Round 2 (SR-005)"; design spec "SR-005 Revision Notes"), commit `3a0ea2238e`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md`, `requirements-doc.md`, `investigation-notes.md` at SR-005; AR-001..AR-007.
- Relevant solution revision IDs: SR-005 (SR-004 basis).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed in the review result:
  - I confirmed the behavior basis again. DEC-020 and AC-022 were restated within REQ-020 (Solution Designer, user informed), consistent with the UI spec's Open Decisions note.
  - I redrew DS-002 and DS-005 in call order.
  - I checked the new citations (`serverRuntimeEnv.ts:109-133`, `appUpdater.ts:37-71`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open, blocking | Resolved | SR-005 | Ownership Map: `runUpdate` → `RuntimeUpdateResult`, with refusals in the private `beginUpdate` shared with `startUpdate`. DS-002 maps the results. The Gates table lists NOT_INSTALLED, BUSY and AGENTS_RUNNING. The example replaces the copied running-agents check. |
| AR-002 | Open, blocking | Resolved | SR-005 | DS-002 and `UpdatePass`: `closed`, checks-enabled, `isAutomatic(kind)` and the `web` gate (GitHub kinds) are re-read before every candidate. |
| AR-003 | Open, blocking | Resolved | SR-005 | DS-008 rows: handled clears outcomes; `AUTO_UPDATED` is applied by `candidateFrom`, so a newer installed head counts; a removed or replaced record gives `not_applied`. `AUTO_FAILED` and `AUTO_WAITING` are applied by `candidateLatest`. |
| AR-004 | Open, blocking | Resolved | SR-005 | DS-005 shows launch, timer and settings with one owner (`AppUpdateCheckSchedule`, the only writer of `app-update-checks.json`). `startAutoCheck` only starts it, and its 8 s timer is removed. The `appUpdater.ts` split names the IPC block and the helpers at `:37-71` (≤ 470 lines). |
| AR-005 | Open, blocking | Resolved | SR-005, DEC-020 restated, AC-022, AF-17 | `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1` is set in `buildServerProcessEnv` and read once by `config/desktop-embedded-node.ts`. The runtime kind runs only on that node. The web requires `desktopEmbeddedNode` and an own window. The Revision Notes trace three node kinds. |
| AR-006 | Open, non-blocking | Resolved | SR-005 | File Mapping: update notifications are composed after `composeAgentRuntimeStatus`, with the service passed in. |
| AR-007 | Open, non-blocking | Resolved | SR-005 | `checkInBackground` reads versions only. |

- New or remaining finding IDs: none. Residual notes: R-5 (stale "SR-004" on design-spec line 6), R-6 (DS-005 wording), R-7 (env precedence).
- Material classification changes: none (Large / High).
- Recommended recipient: implementation engineer; informational notification to the Solution Designer.
- Remaining risks or uncertainty: R-4..R-7 in the report.
