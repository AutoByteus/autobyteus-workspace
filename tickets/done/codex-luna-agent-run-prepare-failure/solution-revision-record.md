# Solution Revision Record

The latest `requirements.md`, `investigation-notes.md`, `design-spec.md`, and evidence supplements are authoritative. This record indexes solution rounds and rationale only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer initial approved baseline / 2026-08-21 | N/A | `Initial Baseline` | Ready for architecture review |
| SR-002 | Architecture reviewer / `design-review-report.md` / Round 1 (`ARCH-REV-001`) | `DI-001`, `DI-002`, `DI-003` | `Design Impact` | Revised design ready for architecture re-review |

## Revision Entries

### SR-001 — Broken workspace-skill link repair baseline

- Triggering role, report path, and round: Solution designer initial baseline after user approval; no prior review report.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: Design-ready solution package for architecture review.
- Why this baseline or revision entry is recorded: Production experiments proved the reported Daily Assistant/Codex/Luna failure is an AutoByteus stale workspace-skill link collision, not a model/provider or completed shell-CWD-ticket regression. The user approved link-only repair and warning/omission behavior.
- Resolution: Define resolver-owned safe resolved/unresolved bindings, one profile-driven Codex/Claude materialization state machine, guarded broken-link unlink/rebuild, fail-closed live collision behavior, on-demand `Discard or Rebuild` persisted-state handling, and manager-side original-cause logging while preserving generic UI errors.
- Approved behavior or requirement IDs affected: BEH-001–BEH-005; FR-001–FR-007; AC-001–AC-011.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/requirements.md` — approved behavior, scope, requirements, acceptance criteria, persisted-state outcome, coverage maps.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/investigation-notes.md` — bootstrap, exact production path/root cause, experiment evidence, current architecture, branch attribution, state/safety findings.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/design-spec.md` — shared owner, state decision table, binding/API changes, file/removal mapping, diagnostics, sequencing, implementation guidance.
- Supplemental artifacts updated, added, or removed:
  - Retained `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/experiment-report.md` and its raw evidence directory.
  - Added durable screenshot copy `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/evidence/reported-ui-error.png`.
- Downstream and architecture-review impact: Architecture reviewer should validate the shared-boundary extraction, binding union, exact link-state/mutation rules, persisted-state decision, and diagnostic boundary. Implementation must not touch the completed shell-CWD ticket or introduce model/UI changes.
- Next recipient or routing: `/architecture_reviewer` for initial design review.
- Remaining gaps or risks: No blocking requirement gap. Filesystem mutation races must use the specified guarded/linearized shared owner; no live collision may be auto-deleted or warning-only.

### SR-002 — Complete discovery, per-key, and failed-batch lifecycles

- Triggering role, report path, and round: Architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/design-review-report.md`; Round 1 / `ARCH-REV-001`.
- Triggering finding IDs: `DI-001`, `DI-002`, `DI-003`; reachability records `PREM-001`, `PREM-002`, `PREM-003`.
- Prior authoritative result: `Fail` — SR-001's owner direction was sound, but Codex discovery could bypass reconciliation, final cleanup was not serialized with a new acquire, and a later batch failure could strand earlier holders.
- Current authoritative result: SR-002 resolves all three Design Impact findings under the existing approved requirements and is ready for architecture re-review.
- Why this baseline or revision entry is recorded: All findings are reachable through supported activation/termination/multi-skill paths and protect FR-002/FR-007, AC-001/AC-006/AC-007, BEH-001/BEH-002, and UC-003. No requirement gap or renewed user approval is needed.
- Resolution:
  - `DI-001`: replace Codex binding deletion with a three-variant `WorkspaceSkillReconciliationRequest`; every active binding reaches the materializer, while `reconcile-discoverable` suppresses only initial-missing creation and still repairs a broken expected path.
  - `DI-002`: define one mapped per-key `acquiring → ready/held → releasing` lifecycle; final release publishes/retains `releasing` before any await, and new acquisitions wait for cleanup then retry/rematerialize.
  - `DI-003`: define a call-local descriptor-occurrence ledger; on later failure release all acquisitions made by that invocation in reverse order, preserve other holders, attempt all rollback releases, and rethrow the original error object.
- Approved behavior or requirement IDs affected: no approved behavior changed; design corrections protect BEH-001, BEH-002, BEH-003; FR-002, FR-007; AC-001, AC-006–AC-009; UC-003.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/design-spec.md`: current-state read, intended change, behavior/path map, design health, terminology, persisted-state lifecycle, DS-001/DS-003/DS-004/DS-005, ownership/boundaries/interfaces, shared structures/files, examples, sequence, tradeoffs, risks, and implementation guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/investigation-notes.md`: architecture review artifacts/source log, `PREM-001`–`PREM-003` evidence implications, affected components, constraints, risks, and Round 2 reviewer notes.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/codex-luna-agent-run-prepare-failure/requirements.md`: unchanged; remains the approved Design-ready authority.
- Supplemental artifacts updated, added, or removed: added the authoritative Round 1 `design-review-report.md` and `architecture-review-revision-record.md` to the cumulative context/inventory; production evidence supplements remain unchanged.
- Downstream and architecture-review impact: reviewer should verify that no binding is filtered from reconciliation, the registry entry remains mapped through cleanup, waiting acquisition cannot receive a releasing descriptor, and failed calls release exactly their own descriptor occurrences without replacing the original failure.
- Next recipient or routing: `/architecture_reviewer` for Round 2 review.
- Remaining gaps or risks: No known blocking gap. Unsupported arbitrary filesystem mutation remains outside scope; live/unowned collisions remain fail-closed and non-destructive.
