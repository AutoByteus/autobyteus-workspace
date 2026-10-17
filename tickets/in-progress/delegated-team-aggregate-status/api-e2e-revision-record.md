# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-003 (req SR-002), IR-001, ARCH-REV N/A, CRR N/A | N/A | Pass / 95% |
| API-REV-002 | Delivery Engineer, DR-004 evidence request (user: this evidence is the AC-011 verification), round 2 | DR-004, merge `45cb47aefc` (`origin/personal` `db00ba16a9`), HEAD `ebf5ca614c` | Pass / 95% | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline validation of the universal Team status

- Triggering role, report path, and round: `/software_engineering_team/implementation_engineer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/implementation-handoff.md`, round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-003 (design), SR-002 (requirements, AP-001), IR-001 (implementation). Architecture and code review: N/A (direct route).
- Why recorded: first completed API/E2E result on the direct Medium/Low route.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/team-status-live-probe.mjs` (`test:e2e:team-status-live`, TS-001..TS-004).
  - Added a `HOLD_TURN` marker to `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`linked_skills`).
  - Added a routing case to `agy-failure-cli-routing.test.ts`.
  - Added a `TESTING.md` section.
  - All existing specs and probes judged Still Valid. `team-activity-presentation-probe.mjs` (running surface) is Out Of Scope (follow-up).
- Cases added, changed, removed, or rechecked: RC-001..RC-005 run; TS-001..TS-004 added and run (attempt 1: TS-004 failed on a probe selector, fixed; attempt 2 and two repeats pass).
- Commands, environment, fixture, or broader-validation delta:
  - Server `prebuild` + `build`.
  - Built backend + Nuxt dev + Chrome 154, with the scripted AGY CLI.
  - Documented `test:nuxt --run`: 590 files / 4035 tests pass.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution coverage report (all), test-case ledger (all)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (no category below 90%)
- New or remaining failure IDs: none
- Recommended owner: Delivery (next stage)
- Remaining risks, blocked evidence, or untested scope: AC-011 explicit user verification (Delivery/user); accepted freshness assumption ASM-001; packaged-renderer rendering is covered only by AC-011.

### API-REV-002 — Merged HEAD re-validation and AC-011 in the packaged desktop app

- Triggering role, report path, and round: `/software_engineering_team/delivery_engineer`, DR-004 in `delivery-revision-record.md`, round 2. The user's instruction (2026-10-17) makes this evidence the AC-011 verification.
- Triggering finding or case IDs: DR-004 items 1–3
- Related revision IDs: DR-004; merge `45cb47aefc`; Delivery test fixes `1455045654`, `ebf5ca614c`; IR-001; SR-003. The user-requested code and test reviews are context only.
- Why recorded: re-validation after a 705-commit base refresh, plus explicit desktop evidence.
- Coverage decisions or durable test paths changed (uncommitted):
  - `nested-team-aggregate-status-probe.mjs` and `team-group-icon-probe.mjs`: baseline fix. They now serve `/ws/agent-package-definitions`, which upstream `e89085f3e3` opens from `app.vue`; the probes failed on the base too.
  - `team-status-live-probe.mjs`: merged-row layout checks (dot, icon, name, Task summary, per-copy Stop) in TS-001/003/004.
  - Ticket-owned desktop driver: `api-e2e-evidence/rev002/desktop/scripts/ac011-desktop.mjs`.
- Cases added, changed, removed, or rechecked:
  - TS-001..004 rechecked (layout assertions added).
  - NTAS-BR-001..004 and B01..B04 rechecked.
  - New desktop steps A1–A3, B1, C1, C2.
- Commands, environment, fixture, or broader-validation delta:
  - The three browser probes on HEAD `ebf5ca614c`.
  - `isolated-app start --build` (instance `iso-55445-b74c`, throwaway `CODEX_HOME`).
  - Codex attempt blocked by the usage limit. Switched to the scripted AGY CLI through `updateServerSetting` + `restart` on that instance only.
  - Instance stopped and its data root removed.

#### Prior Failure Resolution

None. API-REV-001 had no open failures. This round's intermediate failures:

| Failure | Classification | Resolution |
| --- | --- | --- |
| Fixture probes: refused `/ws/agent-package-definitions` | Local Fix (probe drift, baseline) | Feed routed in both probes; 4/4 each |
| Desktop attempt 1: Codex usage limit | Environment (provider quota) | Scripted AGY runtime in the same packaged instance |
| Desktop attempt 2: gray colour assertion | Local Fix (my assertion) | Neutral-gray check; attempt 3 Pass 6/6 |

- Canonical artifacts and sections updated: execution coverage report (meta, "Round 2 — API-REV-002", Latest Authoritative Result); ledger (round-2 events); coverage investigation (round-2 addendum)
- Prior result and confidence: Pass, 95%
- Current result and confidence: Pass, 96%
- New or remaining failure IDs: none
- Recommended owner: Delivery (finalization on the user's standing approval)
- Remaining risks, blocked evidence, or untested scope: no real-model desktop run (Codex quota until 2026-10-22); the accepted ASM-001 freshness assumption.

