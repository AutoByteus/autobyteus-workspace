# Delivery Revision Record — cross-node-agent-communication (autobyteus-191)

The latest docs sync report, handoff summary and release/deployment report remain authoritative. This record keeps the baseline and each later delivery round.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | CRR-007 Pass (after API-REV-003 Pass), from the code reviewer | N/A | Integrated and docs synced. Verification open: AC-113 user check, RC-10 test race sent to API/E2E | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `follow-ups.md` (FU-005 renumbered, FU-006 added), `evidence/delivery/` |
| DR-002 | CRR-008 Pass on API-REV-004 (RC-10 fix, API-23b), from the code reviewer | DR-001: verification open | RC-10 race closed and AC-110 evidence replaced (accepted). Second integration refresh blocked: merging `origin/personal` `3b9014215e` conflicts in five server source files; merge aborted, sent to implementation | `delivery-revision-record.md`, `release-deployment-report.md` |
| DR-003 | CRR-009 Pass / API-REV-005 Pass / CRR-010 N/A on the IR-005 integration, from the code reviewer | DR-002: integration blocked | Integrated with `origin/personal` `d9439919e2` (clean merge `a58fbab73c`); DEL-08 … DEL-12 pass apart from FU-009 (outside the ticket); verification open only for AC-113 | `handoff-summary.md`, `release-deployment-report.md`, `follow-ups.md` (FU-009), `evidence/delivery/DEL-08…12` |
| DR-004 | The user's confirmation of AC-113 and request to finalize (2026-10-20) | DR-003: verification open (AC-113) | Verified; no release; ticket archived; finalized into `origin/personal` (see `release-deployment-report.md` § Finalization Record) | `handoff-summary.md`, `release-deployment-report.md`, `delivery-revision-record.md`, ticket folder moved to `tickets/done/` |
| DR-005 | The user's release request, 2026-10-21 ("now release a new beta") | DR-004: finalized, no release | Released as beta `v1.5.8-beta.5`: all four workflows succeeded, 17 assets, Docker `1.5.8-beta.5` = `:beta` | `release-deployment-report.md` § DR-005 Addendum, `delivery-revision-record.md` |

## Revision Entries

### DR-001 — Integration refresh, docs sync, verification opened

- Delivery round and trigger: first delivery round, from the code reviewer's validated package (CRR-006 source review, API-REV-003, CRR-007 test-code review).
- Triggering upstream report, verification, or evidence: `code-review-report.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-review-report.md`.
- Prior authoritative result: N/A.
- Current authoritative result:
  - Base `3b2c86ca9e` merged (`4f03cce09d`, one additive conflict), after a checkpoint of the reviewer's documents (`770715dfa8`).
  - Docs synced: SR-017 admission rule; remote link shape.
  - Integrated-state checks DEL-01 … DEL-07 pass, apart from the pre-existing FU-006 and one RC-10 failure (a race in the test) that passes on rerun.
  - Verification from evidence: AC-101 … AC-112 proven.
  - AC-113 needs the user's check, and the RC-10 test fix is sent to API/E2E.
- Docs sync report: `docs-sync-report.md`
- Handoff summary: `handoff-summary.md`
- Release/publication/deployment report: `release-deployment-report.md`
- Integration and post-integration verification: merge; DEL-01 … DEL-07 in `evidence/delivery/`.
- Verification (evidence judgement or user check) and finalization state: evidence sufficient except AC-113 (user check pending); not finalized, not pushed.
- Terminal return to the Solution Designer: `Not yet eligible`
- Terminal return message/reference: —
- Why this baseline or delivery revision was recorded: delivery paused before finalization on an open user check and a test-code fix.
- Next recipient/action:
  - API/E2E engineer: RC-10 race fix, then test-code review.
  - The user: AC-113 check, and the release decision for how to get a build that contains this change.
- Remaining blockers, rollback concerns, or untested scope: AC-113 (real desktop + Docker networking and real runtimes); RSK-106 / FU-002; RSK-103 until S6.

### DR-002 — RC-10 fix accepted; second integration refresh blocked by source conflicts

- Delivery round and trigger: CRR-008 (test-code review Pass) on API-REV-004, commit `a777af6b1d`, from the code reviewer.
- Triggering upstream report, verification, or evidence: `api-e2e-execution-coverage-report.md` (API-REV-004: r4-1 and r4-2 20/20; API-23b), `api-e2e-test-review-report.md` (CRR-008).
- Prior authoritative result: DR-001, verification open (AC-113; RC-10 race).
- Current authoritative result:
  - **RC-10:** closed. The test now takes the remote run from the task agent's `delegate_task` result. Delivery read the diff: the `delegatedFrom` exact match and the `delegated`/`node`/`task_id` assertions are kept, and `defs`/`ids` are split. Two runs passed 20/20.
  - **AC-110:** evidence replaced. `API-23b-isolated-beta-composer-message.png` (the integrated build, two isolated desktop instances, real model `deepseek-v4-flash`, watched by the user) shows:
    - the run under node-b-workspace → Text Reviewer (1);
    - its `send_message_to`;
    - the owner message "… Marker OWNER-COMPOSER-MSG.";
    - the answer.

    It matches `API-23b-isolated-app-journey.log`. The byte-identical round-2 PNG is removed. Proven.
  - **AC-113:** unchanged. The user watched two desktop instances on one Mac (API-23b), but the Docker node and desktop ↔ Docker networking in both directions are still the user's check.
  - **Base:** `origin/personal` advanced from `3b2c86ca9e` to `3b9014215e`. It brings autobyteus-205 (Skill Improvement removed, with the app-data migration `remove-skill-improvement-data-migration` that reads `launchPurpose` from run metadata) and the `1.5.8-beta.4` bump. The checkpoint `daff010bd7` committed the reviewer's CRR-008 documents.
  - **Merge:** it conflicts in five server source files:
    - `agent-run-provisioning-service.ts`, `agent-run-service.ts`, `agent-run-metadata-store.ts`, `agent-run-metadata-types.ts`: the base removed `launchPurpose` / `AgentRunLaunchPurpose`, and this branch added `delegatedFrom` on the adjacent lines;
    - `server-settings-service.ts`: the base removed the Skill Improvement setting next to the remote-collaboration setting.

    The merge was aborted and the branch is clean at `daff010bd7`. Integration conflicts in product source are routed to their owner, as autobyteus-205 did (INT-001 through implementation and code review).
- Docs sync report: unchanged since DR-001; recheck after the integration.
- Handoff summary: to be updated after the integration.
- Release/publication/deployment report: `release-deployment-report.md` § DR-002 addendum.
- Integration and post-integration verification: blocked (above). DR-001's merge `4f03cce09d` had one additive conflict in `server-settings-service.ts` that delivery resolved itself (both settings kept). It is named here so the code review of the new integration covers it too.
- Verification (evidence judgement or user check) and finalization state: AC-101 … AC-112 proven; AC-113 user check pending; not finalized, not pushed.
- Terminal return to the Solution Designer: `Not yet eligible`
- Terminal return message/reference: —
- Why this baseline or delivery revision was recorded: a new upstream round closed the evidence gap, and the integration refresh was blocked.
- Next recipient/action:
  - Implementation engineer: integrate `origin/personal` (Local Fix, integration), then code review of the merge. API/E2E reruns as the reviewers decide, then back to delivery.
  - The user: AC-113 and the release decision.
- Remaining blockers, rollback concerns, or untested scope: the integration conflicts; AC-113.

### DR-003 — autobyteus-205 integration accepted; latest base merged cleanly

- Delivery round and trigger: CRR-009 (source review of both merges, Pass), API-REV-005 (Pass, 95%) and CRR-010 (Not Applicable), from the code reviewer.
- Triggering upstream report, verification, or evidence: `code-review-report.md`, `api-e2e-execution-coverage-report.md` (r5-1 and r5-2 20/20), `implementation-handoff.md` (IR-005).
- Prior authoritative result: DR-002, integration blocked by source conflicts.
- Current authoritative result:
  - IR-005's merge `c59c6f7359` and its test `300bf4c09a` are accepted.
  - `origin/personal` had advanced again, to `d9439919e2` (dependency cleanup, Electron 42.11.16). Checkpoint `8183e45665`; clean merge `a58fbab73c`.
  - DEL-08 … DEL-12 pass, apart from one unit-suite failure outside the ticket (FU-009; passes 5/5 alone).
  - Docs: no change needed.
  - Verification: AC-101 … AC-112 proven; AC-113 pending with the user.
- Docs sync report: unchanged (no impact from these merges; recorded in `release-deployment-report.md` § DR-003 Addendum).
- Handoff summary: `handoff-summary.md` (updated).
- Release/publication/deployment report: `release-deployment-report.md` § DR-003 Addendum.
- Integration and post-integration verification: merge `a58fbab73c`; DEL-08 … DEL-12.
- Verification (evidence judgement or user check) and finalization state: AC-113 user check pending; not finalized, not pushed.
- Terminal return to the Solution Designer: `Not yet eligible`
- Terminal return message/reference: —
- Why this baseline or delivery revision was recorded: the integration blocker closed and the latest base was integrated.
- Next recipient/action: the user. AC-113, and the choice between a local desktop build plus Docker image before merge, and a beta `1.5.8-beta.5` after merge.
- Remaining blockers, rollback concerns, or untested scope: AC-113.

### DR-004 — AC-113 confirmed by the user; finalization

- Delivery round and trigger: the user, 2026-10-20: "ahhh. it was already checked earlier. so you can finalize" (in answer to what AC-113 is).
- Triggering upstream report, verification, or evidence: the user's confirmation of AC-113; DR-003's integrated-state checks.
- Prior authoritative result: DR-003, verification open for AC-113 only.
- Current authoritative result:
  - Verification complete.
  - Release decision: `No release`.
  - Base advance `1f5e0bf028` (another ticket's documents) merged as `623e0d830d`, with no rerun needed.
  - Ticket archived to `tickets/done/cross-node-agent-communication/`.
  - Repository finalization per `release-deployment-report.md` § Finalization Record.
- Docs sync report: unchanged.
- Handoff summary: updated (status, AC-113, release).
- Release/publication/deployment report: § DR-004 Addendum and § Finalization Record.
- Integration and post-integration verification: DEL-08 … DEL-12 on `a58fbab73c`, still valid for `623e0d830d`.
- Verification (evidence judgement or user check) and finalization state: AC-101 … AC-112 from the evidence; AC-113 the user's confirmation; finalization per the Finalization Record.
- Terminal return to the Solution Designer: after the finalization record is pushed.
- Terminal return message/reference: the message to `/software_engineering_team/solution_designer`.
- Why this baseline or delivery revision was recorded: the last verification gate closed, and the ticket was finalized.
- Next recipient/action: the Solution Designer (terminal receipt; it sends FU-002 … FU-006, FU-008 and FU-009).
- Remaining blockers, rollback concerns, or untested scope: none blocking; RSK-106 / FU-002; RSK-103 until S6. AC-113's earlier run has no artifact in the ticket.

### DR-005 — Beta v1.5.8-beta.5

- Delivery round and trigger: the user's release request, 2026-10-21 ("now release a new beta").
- Prior authoritative result: DR-004, finalized with no release.
- Current authoritative result:
  - Beta `v1.5.8-beta.5`: release commit `4a05909457` on `personal`.
  - All four release workflows succeeded.
  - The GitHub pre-release has 17 assets.
  - Docker `1.5.8-beta.5` and `:beta` share one image (`sha256:191a2073ebee…`); `:latest` is unchanged.
- Release/publication/deployment report: `release-deployment-report.md` § DR-005 Addendum.
- Terminal return to the Solution Designer: `Sent` (release result).
- Remaining blockers, rollback concerns, or untested scope: none. Rollback per `RELEASE.md`.
