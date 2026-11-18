# Solution Designer Handoff — autobyteus-343 (package `stored-runtime-names`)

Result: **Architecture Design Complete**. Current solution revision: **SR-002**. Prerequisite of autobyteus-316.

## Identity and context
- Task: `autobyteus-343` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "One spelling for the agent runtime in stored raw-trace data: write and migrate to the RuntimeKind values". Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names/tickets/in-progress/stored-runtime-names/`
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names`, branch `codex/stored-runtime-names`, base `origin/personal` @ `e4bebdc858`; finalization target `origin/personal`.

## Original request, goals, constraints
Raw-trace manifests and the backends' compaction payloads store `CODEX/CLAUDE/ANTIGRAVITY/GROK_BUILD/AUTOBYTEUS` in `runtime_kind` while everything else stores the `RuntimeKind` values. The user decided (2026-10-30) to fix this first, with a data migration, so autobyteus-316 reads the stored runtime without a mapping (DESIGN.md rule 10). In scope: the writers write the `RuntimeKind` values; a sealed app-data migration rewrites the manifests of this node's own runs; fixtures for every shape; docs. Out: the 7,532 label copies inside old trace records, the field name, any other stored name, the `...ModelConfig` rename (316), Memory Sync imports (DEC-2, the user), per-file backups (DEC-3, the user). Constraints: isolated copies only; the user's real data changes only on his approval of the design and through the released migration; no release unless asked. Done-when (Task): the user approved the design; then writers and manifests use the `RuntimeKind` values, shown by tests and a migration run on an isolated copy; merged to personal. Do not add "the user has verified" to any Done-when.

## Approval basis
Requirements `Approved` (SR-002): DEC-1 (migrate), DEC-2 (imports not rewritten) and DEC-3 (no per-file backup) are the user's decisions ("i like your recommended solution", 2026-10-30); the rest within the direction. The user's approval of the DESIGN before any build is still required (Task) and is asked after the architecture review.

## Classification
`task_size` **Medium**; `architectural_risk` **High** (rewrites persisted user data in place at startup; side effects on memory search and Memory Sync are bounded and one-time). Escalation trigger: a reader of the stored label missed by the grep; a common unknown manifest shape; Memory Sync rejecting or re-uploading changed manifests/imports.

## Design in one paragraph
Seven writer edits (Claude, Codex x2, Antigravity, Grok payload builders, native `run-memory-file-store.ts` x2, the payload type) write the `RuntimeKind` value; the recorder validates the payload's `runtime_kind` with `runtimeKindFromString`. A new sealed migration `raw-trace-manifest-runtime-names` (two files, registered last, `STARTUP_ONLY`, prerequisites `20260617_raw_trace_rotation_layout` and `20260707_raw_trace_active_file_name`) visits `agents/*`, `agent_teams/*/*`, `agent_orgs/*/*/*`, decides current / convert / unusable by structure with a frozen old-label table, validates a temporary file and renames it over the manifest; unusable content is kept and reported (warning success). No table or old-spelling reader in current code.

## Evidence
Read-only census of the user's manifests: 962 manifests / 4,550 entries (live families 825 / 3,794; imports 137 / 756); only the four labels occur. Nothing reads the stored label today (grep of server, library, web). Framework, guideline and precedents read in full. No experiment has written anywhere; the isolated validation is planned in the design.

## Open points for the reviewer
Whether Memory Sync's scanner/hub handles a changed manifest as the design assumes (one upload); whether the fixed-depth discovery misses any family; the choice to leave imports untouched.

## Follow-ups
None recorded for 343. (Autobyteus-316 has its own.)

## Documents
`solution-designer-handoff.md` (this file), `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`; supplement `task-brief-from-316.md`. All in the ticket folder above.

## Expected output
Architecture review (`design-review-report.md`, `architecture-review-revision-record.md`): pass, or findings routed to the owner.

## Route
Rule matched: Architecture Design Complete with architectural_risk=High → `/software_engineering_team/architecture_reviewer`.
