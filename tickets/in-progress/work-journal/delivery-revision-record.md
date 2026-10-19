# Delivery Revision Record

The latest docs-sync-report.md, handoff-summary.md and release-deployment-report.md are authoritative.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | CRR-003 Pass (after API-REV-001 Pass) | N/A | Integrated, verified and audited; Blocked: user verification, SD rollback decision, probes decision | docs-sync-report.md, delivery-evidence-audit.md, handoff-summary.md, release-deployment-report.md |
| DR-002 | CRR-005 Pass (round 2: SR-018, IR-003 docs only, API-REV-002) | DR-001 Blocked | Round 2 integrated and audited; rule docs reviewed; Blocked: user verification and release decision | delivery-evidence-audit.md, handoff-summary.md, release-deployment-report.md, docs-sync-report.md |

## Revision Entries

### DR-001 — Initial integrated delivery baseline

- Delivery round and trigger: round 1, CRR-003 test review Pass on b105dc9b1b.
- Prior authoritative result: N/A. No earlier delivery is inferred.
- Current authoritative result: Large / High reviewed route (unchanged). Checkpoint ea30b1c98e, then merge of origin/personal e2e21402b1 → b0c81c8f20, with no conflicts. Focused suites, the rebuilt-dist E2Es and the hygiene and licensing checks pass. The evidence audit confirms every checked API/E2E claim and adds the suite JSON report to evidence. Docs are accurate; TESTING.md is unchanged by policy.
- Rollback finding: improver_session.json written by this build is unreadable to the released strict reader. Routed to /solution_designer as Design Impact.
- User verification/finalization state: pending.
- Terminal return to `/solution_designer`: `Not yet eligible`.
- Next recipient/action: SD decision on rollback; user verification, release decision and probes decision.
- Remaining blockers, rollback concerns, or untested scope: as above; N2 on slower hardware; Grok not live; full E2E suite not re-run after the AOML-1 fix (AOML passes alone).

#### DR-001 addendum — rollback decision received (2026-10-19)
- /solution_designer decided option (a), a code fix, recorded as SR-016: the improver_session.json writer keeps the existing `schemaVersion: 1` (same name, value and meaning). The tolerant reader ignores it, and it keeps the released strict reader working after a rollback.
- Route: /architecture_reviewer → /implementation_engineer (small IR) → the reviewed route back to delivery.
- Delivery state: held. On the revised package, delivery will re-integrate, rerun the post-integration checks, re-audit the changed evidence, and add a check that a session file written by the new build is accepted by the released reader. A new DR entry will record that round.
- probes/: SD recommends keeping it uncommitted (samples of the user's real memory). This matches the delivery default; the user's decision is still invited.

#### DR-001 addendum — rollback decision superseded (SR-018, 2026-10-19)
- The user corrected the rollback rule itself; /solution_designer withdrew option (a) (SR-016) as SR-018.
- New rule: rollback data compatibility is required only for releases with an app-data migration that converts existing user data. Ordinary writer changes need none.
- The improver_session.json writer stays as in IR-002 (no schemaVersion). After a rollback, Skill Improvement starts a fresh improver session once. This is recorded as an accepted rollback effect.
- The ticket's own migration (deleting the derived work_traces/ exports) satisfies the rule: the older build regenerates them on demand (confirmed in DR-001).
- The rule change is part of this ticket: RELEASE.md "Rollback" and data_migration_guideline.md §4 "Rolling back after a migration" were edited by SD (uncommitted) and are to be included in finalization. Delivery reviewed both: they are consistent with each other and with this ticket's migration.
- The revised package returns through /architecture_reviewer and the reviewed route. Delivery stays held until it arrives, then re-integrates and re-checks.

### DR-002 — Round 2 (SR-018) integrated delivery state

- Trigger: CRR-005 (round-2 test delta Not Applicable; cumulative Pass) on 6a4209ea75. Revisions: SR-018 (SR-016 withdrawn), ARCH-REV-005, IR-003 (docs only), CRR-004, API-REV-002 (Pass 93.5%).
- Prior authoritative result: DR-001, Blocked on the rollback decision, user verification and probes.
- Integration: origin/personal still e2e21402b1 (fetched 2026-10-19), already merged at b0c81c8f20, so no new base commits. Since b0c81c8f20 the only non-ticket change is b9d04998a4 (RELEASE.md "Rollback" and data_migration_guideline.md §4), identical to what delivery reviewed. Product code (server, web) is unchanged, so the DR-001 post-integration reruns still apply; no executable rerun was needed.
- Audit: the round-2 Codex live run (API-03c-codex-round2.log, API-03-live-round2/codex) passes. 5 tool calls, each linked exactly once; 0 unresolved links; 0 `Tool:` lines; the failed `sed -i` is shown as failed, then the python retry. Secret scan clean.
- Rollback: resolved by SR-018 (rule correction); the accepted effect is recorded in release-deployment-report.md.
- Commit: all uncommitted ticket artifacts (review, design and delivery records, the evidence JSON) checkpointed; probes/ excluded (user data). Evidence files keep exact journal bytes (whitespace not normalized, to preserve recorded hashes).
- User verification/finalization state: pending (verification, release decision; the probes default is to keep it out).
- Terminal return: `Not yet eligible`.
