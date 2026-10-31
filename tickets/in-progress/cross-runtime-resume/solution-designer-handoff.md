# Solution Designer Handoff — autobyteus-316 (package `cross-runtime-resume`)

Result: **Architecture Design Complete**. Current solution revision: **SR-004** (notes 1–7). Prepared for architecture review.

## Identity and context

- Task: `autobyteus-316` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "Cross-runtime resume: continue an agent's work on a different runtime from its work journal". Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/`
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume`, branch `codex/cross-runtime-resume`, base `origin/personal` (merged at `9d59ab82ec`); finalization target `origin/personal`. Latest commit of the documents: see `git log -1` of the branch (design commit `eccaa03e4c`).

## Original request and goals

When an agent's run stops because its runtime cannot continue (usage limit, signed out, model gone) or the user stopped it, the same agent must continue on another agent runtime and model, using its Work Journal as the runtime-neutral record. The user's decisions (all in force): same agent and same run (no linked run, no "Continue" action); the runtime is switched in the stopped run's settings and the user then just chats; a marker in the chat where the runtime changed; the raw-trace file is rotated at the switch; the next agent reads the journals and decides (no summary tool, no summary file, no limits, no stop reason, no excerpt fallback); the hand-over notice is written as one person handing over to another and names no agent runtime or model; first delivery = one standalone Agent run, teams later (2026-10-30). Task constraints: isolated copies for experiments, never write into the user's real memory without approval and a backup, no secrets in journals/logs, GLOSSARY.md vocabulary, prove from a clean clone, no release unless asked. Done-when (Task): the user has approved the design; then in the first slice a run stopped on one runtime continues on another with work carried over, shown by a test and a real run on isolated data; merged to personal.

## Approval basis

- Requirements: `Approved` (SR-004) by the Solution Designer within the direction, with the user informed; DEC-4 (single agent first) is the user's own decision relayed by the Project Task Manager.
- Design: the user asked (2026-10-30) to re-check the design against the design principles and, if clean, send it to architecture review. That re-check is recorded in SR-004 note 7 (clean after six consistency fixes). The user's final approval before any BUILD is still required by the Task and is asked after the architecture review.

## Classification (completed design)

- `task_size`: **Large** — three packages and eight subsystems, about 30 files plus tests.
- `architectural_risk`: **High** — new persisted fields and a manifest boundary type; an ordered, retry-safe activation sequence in the run's transition lane; a changed derived-data ownership rule (journal runtime per file); a GraphQL contract clean cut.
- Escalation trigger: a writer holding the active raw-trace file open across rotation (none known: the library store appends by path); `recordRunStarted` unable to express removal of the pending field.

## What to review (the design in one paragraph)

Settings save of a stopped standalone Agent run records only a pending switch (new binding + `pendingRuntimeSwitch.from`); the first message makes it real in a third activation case of `StandaloneAgentRunLifecycleService` (prepare a fresh session, write a marker notice record and rotate the raw traces through the existing idempotent primitive with a new boundary type `runtime_switch`, commit the metadata, publish, register a pending hand-over notice); the notice rides the existing `AgentRunInputPreface` route as a third source; the Work Journal renders each file with its own segment's runtime. Persisted data: no migration (optional metadata field, one new manifest type value; derived journal manifest rebuilt). Two ports owned by `agent-execution` keep the dependency direction.

## Evidence (all synthetic or read-only)

- Folder test and data-model validation on synthetic data with the real classes: `evidence/folder-test-output.txt`, `evidence/data-model-validation-output.txt` (probes in `probes/`). Invariants I-2, I-3, I-4, I-5, I-7, I-8 pass over two switches; today's journal renders a switched run wrongly (reproduced); 823 of 825 real journals are consistent with their segments' runtime labels (read-only count).
- Premise checks recorded in the design: `persistAndPublish`'s retry check is prepared-run-only (design passes it in); the library store appends by path.
- Principle audit: `design-spec.md` section "Design Principles Check".

## Open points for the reviewer (not blockers)

- Two documented vocabulary discrepancies that already exist and are recommended to stay (the user is told): stored runtime spelling vs `RuntimeKind` (FU-006); `…ModelConfig` names of the stopped-run edit (FU-007).
- Not shown yet (settled in the real run, not by design): the notice arriving before the first message and the named journals opening on a Claude → Codex switch on an isolated instance.

## Follow-ups (in `follow-ups.md`, not yet sent; they go to the requester when the ticket leaves the team)

FU-001 (failed-turn record, for autobyteus-314), FU-003 (teams, Org members, delegated copies), FU-004 (agent- or Router-started switch), FU-005 (order with the restart notice of 283–289), FU-006 (stored runtime spelling), FU-007 (`ModelConfig` names).

## Documents (absolute paths, all in the ticket folder above)

`solution-designer-handoff.md` (this file), `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, supplement `run-runtime-switch-contract.md`, `follow-ups.md`; evidence `evidence/*.txt`, probes `probes/*`.

## Expected output from the next role

Architecture review of the requirements and design package (`design-review-report.md`, `architecture-review-revision-record.md`): pass, or findings routed to the owning role. A review Pass is informational for the Solution Designer.

## Route

Rule matched: Architecture Design Complete with task_size=Large and architectural_risk=High, requirements approved, package ready → `/software_engineering_team/architecture_reviewer` (the only matching rule). Sent 2026-10-30.


## Round 2 (2026-10-31) — after architecture review ARCH-REV-001 round 1 (Fail)

- Resolved: ARCH-F-001 (activation commit: `recordRunStarted` gets `clearPendingRuntimeSwitch`; retry flag generalized), ARCH-F-002 (root hop, second caller = combined Save of a host with its copies, two construction sites with the optional `switching` dependency, readers decided, MP-1 answered from the code), ARCH-F-003 (`openRawTraceRuntimeKind(metadata)` is the one owner of the open file's runtime; I-4, I-9), the non-blocking recommendations (hand-over source first; `AgentRunPlatformNoticeSource` semantics; undo keeps a different model; I-7 asserted in the real run; recorder failure aborts the candidate), ARCH-F-004 (the user decided to migrate first; autobyteus-343 is merged: no label mapping, `runtimeKindFromString`), ARCH-F-005 (the user decided option A: the single-agent chain is renamed `…ModelConfig` → `…Selection`; team family and shared result types keep their names). Details: `solution-revision-record.md` SR-004 notes 8–11; investigation notes F-33…F-37.
- Base: `origin/personal` merged into the branch (includes autobyteus-343, `31eb1fb5d3`); latest commit of the documents: see `git log -1`.
- Classification unchanged: Large, High. Requirements `Approved` (SR-004). The user's final approval of the design before any build is still required (Task) and is asked after your review.


## Round 3 (2026-10-31) — failure-origin review CRR-002 of the built system (Fail: F-1, F-2 Design Impact; F-3 Local Fix)

- Source: `code-review-report.md` (CRR-002), `api-e2e-execution-coverage-report.md` (API-REV-001), red test `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (RS-01), evidence under `evidence/api-e2e/`.
- Revised: SR-004 note 14, notes F-38…F-41, `design-spec.md`, `run-runtime-switch-contract.md` (3.3 order with the watermark, 3.7 what the chat reads, I-7, I-10), requirements REQ-010 (the candidate's own first records follow the marker) and REQ-014 + AC-010 (the chat after a reload, already the Task's observable success). Requirements stay `Approved`: no new product behavior; the user's go for the build (2026-10-31) stands.
- For architecture review round 3: (1) the activation order `begin (watermark) -> prepare -> validate -> record -> persistAndPublish -> register` and the failure guarantee (a failed start writes no marker and archives nothing; abandoning a failed attempt leaves no marker); (2) the new library method `RunMemoryFileStore.rotateActiveRawTracesForRuntimeSwitch` (a third wrapper of the existing `archiveAndRewriteActive`) and its idempotence; (3) the per-target prepare table (native and Grok write; Claude, Codex, Antigravity do not); (4) one chat reader (`readChatRawTraces` / `getChatRawTraceSnapshot`) for `buildProjection` and `buildActiveTracePage`, compaction's view unchanged; (5) the selection context rule while a switch is pending (F-3).
- Classification unchanged: Large, High. After the Pass the package returns to the implementation engineer (the code and tests exist; the fix starts from RS-01 red), then source review and API/E2E again.
