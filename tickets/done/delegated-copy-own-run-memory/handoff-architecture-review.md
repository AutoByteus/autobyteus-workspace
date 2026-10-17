# Handoff — Architecture Design Complete (SR-005 … SR-009, re-review after ARCH-REV-003 Pass)

- Package identifier: `delegated-copy-own-run-memory` (Project Task 8641c0ac)
- Result classification: `Architecture Design Complete`
- Current SR entries: `SR-005` (a task agent is a normal run; memory layout contract), `SR-006`
  (Memory Sync coherent in this ticket; test impact inventory) and `SR-007` (recovery from
  ARCH-REV-001: ARCH-F-001..005 addressed; contract revision 3)
- Classification: `task_size=Large`, `architectural_risk=High` (evidence: `design-spec.md`
  §Task Size And Architectural Risk)
- Route (from `get_handoff_rules`): Large/High → `/software_engineering_team/architecture_reviewer`.
  No other rule matched. Delivered 2026-10-17 (run `architecture_reviewer_d2af87d46b0c4b3dafa46389c06d9241`).
- Sent by: `/software_engineering_team/solution_designer`, 2026-10-17 (first round); re-review sent
  2026-10-17 after SR-007.

## Re-review: what changed since ARCH-REV-003 (SR-009)

- Implementer clarifications U-1..U-5 (design-spec §Implementer Clarifications; contract §3.1, §3.2, §6, S12):
  U-4 corrected — a copy created from a configured place keeps following the place (`taskAgent.origin:
  "configured_place"`), no snapshot; U-5 — team links never carry `taskExecutions` (CM-7; data: 9 member delegations,
  all at the coordinating run).
- Scope added by the user: version-free names in current code (REQ-019, AC-023, D-10, DESIGN.md rule 8, contract §3.5);
  mechanical, separate commit; no on-disk change.
- AC-024 (configured-place copies unchanged).

## Re-review: what changed since ARCH-REV-002 (SR-008)

- Base: `origin/personal` `66429d6f31` (worktree fast-forwarded; includes the nested task-team cleanup, Task 9942a43c,
  merge `8a8d322144`; it added no migration).
- ARCH-F-006 confirmed and resolved (contract §5.4 rewritten): no declared prerequisites (registry order); per-run
  input gate — `WAITING_FOR_PREDECESSOR` (non-terminal, retried) while a tree-writing predecessor (team tree v1, v2,
  org flat families, collaborators-v1) is not `SUCCEEDED*`, otherwise `PRESERVED_UNSUPPORTED_TREE` (warning);
  predecessor retry after the move harmless per class (step 3); F-PENDING-FAILED (AC-020); REQ-017 corrected.
- Nested-team support dropped: placement without a nested level, F-C2N / AC-022 / S32 withdrawn; the frozen parser
  rejects the retired shape.
- Investigation notes: §Resume After The Nested Task-Team Cleanup; status line updated to SR-008.

## Re-review: what changed since ARCH-REV-001

See `design-spec.md` §Review Response for the finding → resolution table. In short:

- ARCH-F-001 confirmed **and widened**: `20261015_collaborators_to_delegated_runs_v1` writes trees
  through the current stores and is pending for every user upgrading from a release before
  2026-10-15. Through the new stores its converted records would get own files at L1 before their
  memory moved, and the new migration would skip them (S27). Resolution D-9 / contract §5.4: every
  released migration that imports a changed module is repointed to a migration-owned frozen copy of
  today's behavior (shared under `legacy/released-run-package-shapes/`); the others are shown
  unaffected with the reason; the new migration's prerequisites are every earlier `memory/`
  migration; F-PENDING / AC-020. A minimum upgrade-from version was rejected (it would strand stable
  users).
- ARCH-F-002: superseded in SR-008 — the nested task-team cleanup (Task 9942a43c) removed nested members; placement has no nested level.
- ARCH-F-003: step 5 merges into any existing own log for every task agent at L1; F-RERUN-MSG / AC-021.
- ARCH-F-004: no baseline state; every save is computed against the files inside the lock (contract L6).
- ARCH-F-005: requirements and investigation notes reconciled.
- **New, found while verifying (please check):** `validateTeamRunStatePackage` /
  `validateAgentOrgStatePackage` require every message endpoint in the index, and the stores rewrite
  whole logs from the loaded list. Contract **L6** therefore states: only available task agents (own
  file exists) are loaded; a record not yet migrated is hidden, not restorable, and written back
  unchanged; views show messages whose endpoints are loaded; message saves add the new message(s)
  from `commitAppend` to their logs and never rewrite a log from the loaded list (REQ-018).
- Residuals taken: unreadable tree → preserved exclusion with a warning; `memory_sync.md` line for
  organization-coordinated task agents in imports.
- Supersedes the 2026-10-15 SR-002 handoff of the same name. That package was never reviewed (held
  back on request); its design (back-link descriptor `delegated_run.json`, facts in the coordinating
  tree, delete removes task agents) is superseded. Treat this as the first review of this ticket.

## Original Request

Project Task from `/project_task_manager` (user direction 2026-10-15): a task agent's memory follows
the normal structure (its own run), not the delegating run's folder; the coordinating run keeps only
coordination data; existing data migrates safely. Since then the user directed (2026-10-17) that a
task agent also owns its own facts in its own `run_metadata.json` (with a `taskAgent` section), the
coordinating run ("hub") keeps only links, and that a **contract describing the whole behavior is
validated (including by simulation) before anything is built**. The contract governs the design.

## Goals / Expected Output From Review

Independent review of the package against the approved requirements, the contract, `DESIGN.md`, the
Collaboration Model (CM-5, CM-7, CM-8, CM-9), the Data Migration Guideline (as corrected in
`8a970f214c`) and TESTING.md. Pay particular attention to:

1. **D-1 compose at load, split at save** in the three tree stores (standalone, team, org): the
   in-memory record types (`TaskAgentExecution`, `TaskTeamExecution`) stay unchanged so their 28
   consumers stay untouched. Is the store the right single boundary, and is the split write correct
   (link only when the own file exists — L4; only changed own files written)? Is compose-read safe
   (never throws for one task agent — L5)?
2. **Guards G1 / G2 (D-3):** `AgentRunMetadataStore.readMetadata` hides metadata with a `taskAgent`
   section (so ~20 readers stay unchanged); a team tree with a `taskAgent` section is never admitted
   as a team run (readiness check, team history catalog, offline index repair).
3. **Placement (D-2, `AgentRunMemoryPlacement`)** separate from `RootExecutionPhysicalScope`, which
   keeps its logical meaning; writer/reader agreement.
4. **Per-run message logs (D-4):** receiver's log then sender's under the coordinating run's lock
   (DEC-011); views compose the union de-duplicated by `messageId`; today's whole-file write is kept
   (append-only is a follow-up).
5. **Migration D-8 `20261017_task_agent_own_run_v1`:** STARTUP_ONLY after
   `20261015_collaborators_to_delegated_runs_v1`; frozen source module; steps (already done? → write
   own file in place → rename to L1 → reduce tree per record under L4 → build logs); dispositions
   MIGRATED / SKIPPED_ALREADY_CURRENT / SKIPPED_UNMATERIALIZED / FAILED; the app always starts and the
   runner retries next start (no lockout; unpredictable stops handled only by resumability).
6. **Hub rules H1–H4** and the accepted known cost of H2 (composing views reads one small file per
   task agent; lazy loading is a follow-up).
7. **Delete keeps task agents (D-7)**, detached state (contract §10), and the confirmation text.
8. **Memory Sync and tests (SR-006, REQ-015/016):** no Memory Sync source change; tests and fixtures
   encoding the old layout are planned updates; implementation starts with a test impact inventory.

## Approval Basis

- Requirements: `Approved` by the user (SR-005, SR-006; 2026-10-17 in the Solution Designer
  conversation). SR-007 additions (REQ-017, REQ-018, AC-020..022, REQ-012 merge) approved by the
  Solution Designer within the user's direction ("never lose, never lock out"), user informed.
- Behavior-defining supplement: `memory-layout-contract.md` revision 3 (revision 2 + ARCH-REV-001 corrections) — validated against code and
  data (V-1..V-18) and by 26 simulations (S1–S26); **read and approved by the user** (V-13,
  2026-10-17: "I think we're good to go"). The user also confirmed the nested case (a member of a
  task agent team delegates → coordinating run = topmost run, delegator = the member; S9) and the
  three visible UI differences under P7 (Memory page Agents list; delete keeps task agents with the
  confirmation saying so; imports from a not-yet-updated node show no task agents).
- Product Design: N/A — not applicable.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/requirements-doc.md`
- Memory layout contract (behavior-defining supplement): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/memory-layout-contract.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/solution-revision-record.md`
- Data Migration Guideline (authority, corrected in `8a970f214c`): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/autobyteus-server-ts/docs/design/data_migration_guideline.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/handoff-architecture-review.md`
- Prior review artifacts: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001) in the ticket folder.

## Workspace / Base / Finalization

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory`,
  branch `codex/delegated-copy-own-run-memory`
- Base: `origin/personal` at `db00ba16a9` (fetched and fast-forwarded 2026-10-17 from `8a970f214c`;
  docs-only difference)
- Finalization target: `origin/personal`
- Ticket artifacts are untracked, uncommitted files in the worktree.

## Scope Summary

- In scope: placement of new task agents in all three run families (L1: `agents/<agentRunId>/`,
  `agent_teams/<teamRunId>/`); own `run_metadata.json` / team tree with a `taskAgent` section; links
  in the coordinating run; guards G1/G2; per-run message logs; Memory page Agents list attribution;
  delete keeps task agents; startup migration of all shapes C1–C7; Memory Sync coherence and test
  updates (REQ-015/016).
- Out of scope (follow-ups): append-only message log (already sent to the Project Task Manager);
  Memory page view of detached task agents; lazy hub loading of task agents; new Memory Sync
  capability (org runs themselves, selected-run sync, per-run status, residue cleanup, cross-node
  delegation); downgrade.

## Evidence Highlights

- Shape inventory (read-only, user data): 88 task agents — C1 11, C2 51, C3 13, C4 7, C5 4, C6 2,
  C7 0; 6 without `source`, 4 without delegator, 5 + 6 Settings edits; no stored absolute paths.
- Proof is on hand-built faithful fixtures (F-C1..F-C7, F-NS, F-ND, F-SE, F-MSG, F-RERUN,
  F-UNMATERIALIZED, F-DETACHED, F-SYNC-NEW, F-SYNC-OLD), never real data or a copy of it
  (TESTING.md; guideline item 5), plus a real-app run on a test-owned data root (AC-016).
- Simulation S15 found a data-loss case (saving while a migration is unfinished) → L4.

## Open Risks

- Store-level compose/split correctness across three families (mitigated by D-1's single boundary
  and the shape-faithful fixtures).
- H2 known cost on large hubs (accepted; follow-up).
- Old-layout Memory Sync imports show no task agents until the source node updates (documented).

## Next Expected Action

Architecture reviewer reviews and applies its own handoff rules (Pass → implementation;
Fail/Blocked with Design Impact / Requirement Gap / Unclear → Solution Designer).
