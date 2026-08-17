# Solution Revision Record

The latest `requirements.md`, `investigation-notes.md`, `design-spec.md`, and `solution-self-validation.md` are authoritative. This file records solution rounds and routing only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User-reported live Team Codex output failure; initial solution round | N/A | Initial Baseline | Design-ready; pending complete architecture review |
| SR-002 | `architecture_reviewer`; `design-review-report.md`; ARCH-REV-001 | DR-001 | Design Impact | Design-ready; self-validation Pass; pending complete architecture re-review |
| SR-003 | `architecture_reviewer`; `design-review-report.md`; ARCH-REV-002 | DR-001 (narrowed) | Design Impact | Design-ready; self-validation Pass; pending complete architecture re-review |

## Revision Entries

### SR-001 — Exact Team status projection and truthful stream recovery

- Triggering role, report path, and round: user report reproduced and investigated on 2026-08-17; initial solution round; no prior architecture-review report.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: `Design-ready; self-validation Pass; pending complete architecture review`.
- Why this baseline or revision entry is recorded: the real Classroom Simulation/Codex path produced and persisted output but the live browser remained empty. Investigation proved one strict live-status projection failure consumed root sequences and one frontend control-flow branch discarded the only recovery effect.
- Resolution: preserve the rooted TeamRun and strict transport architecture; split snapshot/live status outputs around a private status-details core; replace overlapping browser handshake booleans with one synchronization phase; fail closed once on a detected sequence gap; use the existing complete Team reopen/hydration boundary rather than claiming a structural snapshot restores Agent conversations; keep persisted data directly usable with no migration.
- Approved behavior or requirement IDs affected: BEH-001–BEH-005; R-001–R-011; AC-001–AC-016.
- Canonical artifacts and sections updated: complete `requirements.md`, `investigation-notes.md`, and `design-spec.md`; the requirements' internal target effect name was tightened to `team_stream_recovery_required` without changing approved user behavior.
- Supplemental artifacts updated, added, or removed: added `solution-self-validation.md` as N/A-approval validation evidence. Retained `investigation-evidence/` remains non-normative.
- Downstream and architecture-review impact: implementation is blocked until a complete architecture review passes. Review should verify the specialized projector boundary, browser phase ownership, fail-closed recovery, hydrated service replacement, no-migration decision, and exact real validation contract.
- Next recipient or routing: `architecture_reviewer` with the cumulative absolute-path package.
- Remaining gaps or risks: automatic mid-turn semantic recovery and silent ordinary-transport-outage recovery remain explicitly deferred because no root-sequence-correlated full conversation snapshot/replay authority exists. Codex is the mandatory live witness; downstream coverage should re-evaluate another provider proportionately.

### SR-002 — Exposed checkpointed Team-stream recovery

- Triggering role, report path, and round: `architecture_reviewer`; `design-review-report.md`; ARCH-REV-001 on 2026-08-17.
- Triggering finding IDs: DR-001; material premises AR-MP-001 and AR-MP-002.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: `Design-ready; self-validation Pass; pending complete architecture re-review`.
- Why this revision is recorded: the initial design did not route the actual run-tree selection past its healthy local-context reuse branch, and it could describe a replacement stream as ready even when per-Agent hydration missed conversation events covered by the later structural snapshot base.
- Resolution: extend the real selection owner so a registered `reopen_required` root invokes `reopenTeamRunAfterStreamLoss`; keep healthy local focus unchanged. Reuse RootTeamRun's existing open-work fact and publisher sequence as one non-persisted `TeamRunExecutionCheckpoint`. Require strict successful recovery reads, the same quiescent checkpoint before and after hydration, and the same base on the candidate snapshot; publish the candidate context/service only after that handshake succeeds. A successful null Agent projection remains verified empty, while a read failure aborts. Failure retains the old failed entries and provides a stable wait/retry instruction.
- Approved behavior or requirement IDs affected: BEH-003–BEH-004; R-006–R-007; AC-007–AC-010. Approved user behavior did not change.
- Canonical artifacts and sections updated: `investigation-notes.md` source/reachability/file/risk maps; complete `design-spec.md`; complete `solution-self-validation.md`; this revision record.
- Supplemental artifacts updated, added, or removed: `solution-self-validation.md` advanced to SR-002; retained reproduction evidence remains unchanged and non-normative.
- Downstream and architecture-review impact: implementation remains blocked. Complete review should verify the actual selection route, checkpoint coherence, candidate isolation/commit, exact snapshot-base rule, background no-resurrection, and preservation of all status/strict-contract/no-migration decisions already accepted in ARCH-REV-001.
- Next recipient or routing: `architecture_reviewer` with the cumulative absolute-path package and triggering review artifacts.
- Remaining gaps or risks: automatic userless recovery and silent ordinary transport outage recovery remain deferred. No replay, outbox, persisted revision, second sequence, provider-specific branch, fallback, or compatibility path is introduced.

### SR-003 — Exact non-null recovery projection result

- Triggering role, report path, and round: `architecture_reviewer`; `design-review-report.md`; ARCH-REV-002 on 2026-08-17.
- Triggering finding IDs: narrowed DR-001; AR-MP-003 was separately classified Not Reachable and drives no mechanism.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: `Design-ready; self-validation Pass; pending complete architecture re-review`.
- Why this revision is recorded: SR-002 invented a successful-null Agent projection and distinct provider-failure branch even though current production has one non-null GraphQL payload and the server normalizes missing/failing local projection material into an exact empty bundle.
- Resolution: remove the unsupported nullable/provider-failure recovery machinery. Preserve `AgentRunViewProjectionService`'s projection-or-empty result, Team-member root/AgentRun mapping, the non-null GraphQL field, and generated non-null payload. Recovery consumes exactly that payload for every AgentRun; empty history is the payload object with empty arrays. Only GraphQL/transport/identity failure before payload admission aborts the candidate. Normal hydration retains its existing best-effort wrapper.
- Approved behavior or requirement IDs affected: BEH-004; R-006–R-007; AC-009–AC-010. Approved user behavior did not change.
- Canonical artifacts and sections updated: `investigation-notes.md` source/reachability/file maps; `design-spec.md` current-state, ownership, interfaces, files, examples, change sequence, risks, and guidance; `solution-self-validation.md`; this revision record.
- Supplemental artifacts updated, added, or removed: `solution-self-validation.md` advanced to SR-003; retained reproduction evidence remains unchanged and non-normative.
- Downstream and architecture-review impact: implementation remains blocked. Complete review should verify the exact server service -> Team-member service -> non-null GraphQL/generated payload -> recovery hydration spine and confirm no result variant or unsupported failure machinery remains.
- Next recipient or routing: `architecture_reviewer` with the cumulative absolute-path package and triggering review artifacts.
- Remaining gaps or risks: automatic userless recovery and silent ordinary transport outage recovery remain deferred. AR-MP-003 adds no durability barrier. No replay, outbox, persisted revision, second sequence, migration, provider-specific path, fallback, or compatibility path is introduced.
