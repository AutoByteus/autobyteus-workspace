# Docs Sync Report — atomic-agent-run-creation (autobyteus-349)

## Scope

- Ticket: `atomic-agent-run-creation`, Project Task `autobyteus-349`: a failed one-call creation is undone, and empty never-started runs are removed at startup. **This change deletes persisted user data** (DEC-001, approved by the user). `task_size` `Small`, `architectural_risk` `High`, route `Reviewed`.
- Trigger: CRR-004 (test-code review Not Applicable) from the code reviewer, after API-REV-002 Pass.
- Bootstrap base reference: `origin/personal` @ `e87e6bb2b1`.
- Integrated base reference used for docs sync: `origin/personal` @ `f7f331d96b`, merged as `7d1bc66ba3`. The one new commit holds only ticket documents.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: the change rewrote the creation and cleanup rules in `agent_execution.md` and added a design case. Delivery found two other docs that still described the removed age-based ("TTL", "stale-prepared") cleanup and corrected them.
- Why this should live in long-lived project docs: the startup removal deletes stored runs, so its exact rule (what is removed, what is always kept, that nothing expires by age) must be findable without the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Owns creation and the startup removal | Updated (by the change) | Matches `agent-run-service.ts` (undo), `agent-run-provisioning-service.ts` (`removeEmptyNeverStartedRuns`; no symlink follow; only directories and the top-level record are non-content), `server-runtime.ts` (stage before `prepareBeforeListen`) and IMP-01..03 |
| `autobyteus-server-ts/docs/modules/run_history.md` | Prepared identities | Updated (delivery) | Named "stale-prepared cleanup", which this change removed (`cleanupStalePreparedRuns` deleted); now names the undo and the startup removal; `preparedExpiresAt` written but not enforced |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Delegated prepared runs | Updated (delivery) | Said a prepared run without its work packet "expires (prepared-run TTL)"; nothing enforced that. Now: not expired by age; removed at the next start if its folder holds only its record |
| `docs/design-cases.md` | Case 4 entry (AR-002) | Updated (by the change) | — |
| `autobyteus-server-ts/docs/modules/projects.md` | `prepareAgentRun` / `createAgentRun` with `projectId` | No change | Describes inputs only |
| `autobyteus-web/docs/agent_execution_architecture.md`, `settings.md` | Web first-message flow (two-step creation) | No change | Two-step creation unchanged (REQ-003, API-04) |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Whether the startup removal is an app-data migration | No change | It is a startup stage that runs each start, not a migration; rollback position is recorded in `release-notes.md` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior (change) | "One-call creation is all or nothing"; "Empty never-started runs are removed at startup"; the TTL sentence removed | REQ-001, REQ-002 |
| `autobyteus-server-ts/docs/modules/run_history.md` | Stale-behavior correction (delivery) | Which paths remove prepared identities; no age-based cleanup | `cleanupStalePreparedRuns` removed by this change |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Stale-behavior correction (delivery) | A delegated prepared run without its packet is removed at the next start only when empty | Same |
| `docs/design-cases.md` | Design lesson (change) | Case 4: a destructive step gated on not finding something | ARCH-REV-001 AR-002 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Startup removal rule | Removed only when: standalone record readable, `preparedAt`, no `startedAt`, folder holds nothing but directories and the record (no symlink follow); everything else kept and logged; never fails startup; no age rule | requirements REQ-002, DEC-001; design-spec; ARCH-REV-002 | `agent_execution.md`, `run_history.md` |
| Hard-kill residual | A force-kill during activation can leave one entry with the system-instruction trace; kept by the strict rule (DEC-003, FU-005) | SR-005 | `release-notes.md` (user-facing); FU-005 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `cleanupStalePreparedRuns` (24 h TTL, never called in production) | `removeEmptyNeverStartedRuns` at startup, content-checked | `agent_execution.md`, `run_history.md` |
| "Prepared-run TTL" for delegated runs | Startup removal when empty | `remote_collaboration.md` |

## No-Impact Decision

Not applicable (docs updated).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, archive, finalization (no release by default).
