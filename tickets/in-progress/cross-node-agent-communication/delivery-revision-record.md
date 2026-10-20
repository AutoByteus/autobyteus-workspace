# Delivery Revision Record — cross-node-agent-communication (autobyteus-191)

The latest docs sync report, handoff summary and release/deployment report remain authoritative. This record keeps the baseline and each later delivery round.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | CRR-007 Pass (after API-REV-003 Pass), from the code reviewer | N/A | Integrated and docs synced. Verification open: AC-113 user check, RC-10 test race sent to API/E2E | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `follow-ups.md` (FU-005 renumbered, FU-006 added), `evidence/delivery/` |
| DR-002 | CRR-008 Pass on API-REV-004 (RC-10 fix, API-23b), from the code reviewer | DR-001: verification open | RC-10 race closed and AC-110 evidence replaced (accepted). Second integration refresh blocked: merging `origin/personal` `3b9014215e` conflicts in five server source files; merge aborted, sent to implementation | `delivery-revision-record.md`, `release-deployment-report.md` |

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
