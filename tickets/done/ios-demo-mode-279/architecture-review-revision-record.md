# Architecture Review Revision Record — ios-demo-mode-279 (autobyteus-279)

The latest `design-review-report.md` is authoritative. This record keeps the baseline and, later, one entry per review round.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-001) | SR-001 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 (R-1…R-3 non-blocking) |
| ARCH-REV-002 | Round 2 / SR-002 answers ARCH-REV-001 | SR-002 | Fail | Pass | AR-001…AR-003 resolved; N-1…N-3 implementation notes |
| ARCH-REV-003 | Round 3 / SR-003 answers CRR-002 F-1 | SR-003 | Pass | Fail (Design Impact) | AR-004 (new); N-4 implementation note |
| ARCH-REV-004 | Round 4 / SR-004 answers ARCH-REV-003 | SR-004 | Fail | Pass | AR-004 resolved; N-4 stated; N-5 implementation note |

## Revision Entries

### ARCH-REV-001 — iOS demo mode: baseline review

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/design-review-report.md`
- Review round and trigger: round 1. Solution Designer `handoff-architecture-review.md` (Large/High)
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` SR-001; none prior
- Relevant solution revision IDs: SR-001
- Prior authoritative decision: N/A
- Current authoritative decision: Fail (Design Impact)
- What was established: the core mechanism (demo node at the wire, separate demo build, no-network iOS web view) is sound. Three integration gaps, each cited:
  - AR-001: the demo's session goes through `mobileNodeSessionStore`, and `demoBoot` must run before plugins 20, 21 and 30;
  - AR-002: the transport refuses the page's own app-manifest fetch;
  - AR-003: icons other than Heroicons.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (High), AR-002 (Medium), AR-003 (Medium).
  - Non-blocking: R-1 (widen the R-002 check: secure context, modules, SPA fallback, storage), R-2 (bundle-derived operation coverage), R-3 (`demo: true` status field meaning, one owner).
- Material classification changes: none (Large/High).
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: R-002 unverified; Apple's prior approval; app size.

### ARCH-REV-002 — Round 2: demo boot through the session owner; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/design-review-report.md`
- Review round and trigger: round 2; Solution Designer SR-002 ("Revision SR-002" table)
- Triggering role, report path, and finding IDs: Solution Designer; AR-001…AR-003, R-1…R-3
- Relevant solution revision IDs: SR-002
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: Pass
- What changed: each resolution was verified against the Ownership rows and the code. Re-read against the skill update of 2026-11-19, which changes no verdict.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-002, Ownership `demoBoot` | Plugin 00 order: transport → world → `mobileCredentialStorage.save(DEMO_SESSION)` (`mobileCredentialStorage.ts:37`). Then plugin 21 → `bindSession` → `bindNodeContext`, and plugin 30 captures the demo `fetch`. The token is non-secret and accepted only by the demo node; the store is non-persistent |
| AR-002 | Open (Medium) | Resolved | SR-002, Ownership `demoTransport` | The page origin (bundle, Nuxt manifest), `blob:` and `data:` pass through; only other network origins are refused. The Interfaces snippet is stale (N-1) |
| AR-003 | Open (Medium) | Resolved | SR-002, icons row, Verification | Generated subset of heroicons, mdi, vscode-icons and svg-spinners, including mapping-table names; API disabled; resolution test |
| R-1…R-3 | Recommendations | Adopted | Risks R-002; Verification; run list row | Widened first check; the bundle's operations as a second oracle; "demo" owned by the session `entryId` |

- New or remaining finding IDs: none. Implementation notes:
  - N-1: the stale Interfaces snippet;
  - N-2: the stale DS-001 arrow chain;
  - N-3: Nuxt auto-registers `plugins/`, so put the demo plugin under `demo/` and add it only in the demo build, or `ignore` it otherwise; the guard test also checks the plugin.
- Material classification changes: none (Large/High)
- Recommended recipient: implementation engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: R-002 (widened) unverified until step 3; Apple's prior approval; app size

### ARCH-REV-003 — Round 3: `displayName` migration accepted; native labels and the promised rename (AR-004)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/design-review-report.md`
- Review round and trigger: round 3. Solution Designer SR-003, answering the code reviewer's CRR-002 Design Impact F-1 (`code-review-report.md` CR-001); design case 24 in `docs/design-cases.md`
- Triggering role, report path, and finding IDs: code reviewer → Solution Designer; F-1 / CR-001
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: Fail (Design Impact)
- What changed:
  - The `displayName` migration (`Migration Required`, the existing `DataMigrations/` owner, backup, marker, restart) is verified against every writer and accepted.
  - New evidence changes what the user sees after it. `paired` is sent only after a pairing exchange (`MobilePairingBootstrap.vue:134`), so the promised rename never comes. The native labels read `displayName` (`NodeRowView.swift:38`), so a migrated computer is listed by its address, unlike Android's `shownName` (`NodeRow.kt:48`).
  - Rulings from ARCH-REV-002 stand.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-003 | Resolved (ARCH-REV-002) | Resolved, ruling holds | SR-002 | Unaffected by SR-003 |

- New or remaining finding IDs:
  - AR-004 (Medium): `knownName`/`shownName` as on Android for every native label; correct the accepted effect, Case 24 and API-04b's expectation.
  - N-4: the migration's write order (backup → entries → marker).
- Material classification changes: none (Large/High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: as in the report

### ARCH-REV-004 — Round 4: one name rule as on Android; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/design-review-report.md`
- Review round and trigger: round 4; Solution Designer SR-004 ("Revision SR-004"; Case 24 corrected in `docs/design-cases.md`)
- Triggering role, report path, and finding IDs: Solution Designer; AR-004, N-4
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: Fail (ARCH-REV-003)
- Current authoritative decision: Pass
- What changed: AR-004 and N-4 verified against the design text, Android's `SavedNodeEntry.kt:27-34`, and the iOS label sites (`NodeRowView.swift:38,57,92`, `RemoveNodeSheet.swift:24,51`, `NodeConnectionFlow.swift:134,143`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-004 | Open (Medium) | Resolved | SR-004, Persisted Data "Names, one rule as on Android"; Case 24 | `knownName` (trimmed; nil when empty or equal to the host, ignoring case) for the flow and `hello`; `shownName` (`knownName ?? "AutoByteus node"`) for every native label; no-`.displayName` check and a unit test; Accepted effect corrected (native name only after a re-pair); API-04b expectations restated |
| N-4 | Note | Stated | SR-004 Persisted Data | Backup → rewritten entries → marker; restore-and-rerun |
| AR-001…AR-003 | Resolved | Resolved, ruling holds | SR-002 | Unaffected |

- New or remaining finding IDs: none. N-5 (implementation note): SR-003's "Reader after this change" bullets and the "one write pass" sentence are superseded by the SR-004 Names section and the stated write order.
- Material classification changes: none (Large/High)
- Recommended recipient: implementation engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: as in the report
