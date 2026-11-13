# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer handoff 2026-11-13 (Large / High) | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001 (blocking), AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / SR-003 revision for ARCH-REV-001 | SR-003 | Fail | Pass | AR-001…AR-004 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: mid-run link guard does not order against release on Claude and Codex

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460/tickets/in-progress/running-agent-config-reload-460/design-review-report.md`
- Review round and trigger: round 1; `handoff-architecture-design-complete.md` from the Solution Designer
- Triggering role, report path, and finding IDs: Solution Designer; design-spec.md at SR-002; N/A
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: baseline. Behavior basis confirmed. Persisted-data decision, `RunWorkspaceSkills` ownership, the read-only integration read and the naming deviation accepted. DS-003's guard ("run is active") is not the fact that orders a mid-run add against the release of the held list on Claude and Codex (MP-001, Reachable), so a link can outlive its run (AC-011, AC-012).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (blocking), AR-002, AR-003, AR-004 (non-blocking, to fold into the same revision)
- Material classification changes: none; Large / High stands
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: integration sentence may lag a pass re-issued by a Claude process generation or ACP reopen (pre-existing grant behavior); U-001 unchanged

### ARCH-REV-002 — Round 2: single link holder with a `closed` fact; all findings resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460/tickets/in-progress/running-agent-config-reload-460/design-review-report.md`
- Review round and trigger: round 2; `handoff-architecture-design-complete.md` section "Round 2" (SR-003)
- Triggering role, report path, and finding IDs: Solution Designer; design-spec.md at SR-003; AR-001, AR-002, AR-003, AR-004
- Relevant solution revision IDs: SR-003 (requirements unchanged at SR-002)
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result: behavior basis re-confirmed (unchanged requirements); DS-003 redrawn: preparation `acquire` → mid-run `addFrom` (per name, serialized, guard `closed`) → `release()` (close, await add, release) as the only release path on Claude, Codex, ACP. Verified against the code that every user of the removed lists (`materializedConfiguredSkills`, `ownSkill`, factory arrays, `owner.skills`) is in the SR-003 mapping, that every `onAcquired` push is followed by an `assertAccepting` (`workspace-skill-materializer.ts:134, 142`), and that AGY's "no release ordering" reason holds (MP-002).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-003; design DS-003, Ownership Map, Interface Mapping, File Mapping, Removal Plan, Examples, Sequence step 2, Guidance; investigation-notes correction; `docs/design-cases.md` Case 22 | `closed` set synchronously in `release()` before any held link is read; every release path (Claude cleanup `skills` stage and failed preparation; Codex `releasePreparation` from `terminateThread`, `:214`, `:270`, and factory `releaseResources`; ACP `releaseResources`) calls it; search of `materializedConfiguredSkills`/`ownSkill` users matches the mapping |
| AR-002 | Open | Resolved | DS-003; Examples; Guidance | One materializer call per name with per-name catch; AGY one binding per linker call, manifest lists successes |
| AR-003 | Open | Resolved | Risks; Interface `hasSkills()` | Auto-execute approval cited (`claude-session-tool-use-coordinator.ts:248-251`); live check named |
| AR-004 | Open | Resolved | DS-001 narrative; Interface Mapping; Guidance AC-004 walk-through | Added/removed in `skillDirs` terms; delivery decided by the `seen` diff (`skill-version-diff.ts:15`) |

- New or remaining finding IDs: none
- Material classification changes: none (Large / High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: stale "is active" row in the design's Architecture Investigation Evidence table (follow DS-003); AR-002 retry happens at the next pass that adds a name, not every save; `release()` must stay retryable after a failed release; AGY after an interrupt gets no capsule link until a new start (notice still gives the path, FU-002); integration sentence timing (carried); U-001
