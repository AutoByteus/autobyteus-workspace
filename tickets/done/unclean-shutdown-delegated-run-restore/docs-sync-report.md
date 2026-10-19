# Docs Sync Report

## Scope

- Ticket: `unclean-shutdown-delegated-run-restore` (Project Task `project_task_08d76577-e89b-484d-9f38-cc1ed94ef95e`)
- Trigger: delivery package from `/software_engineering_team/code_reviewer` after CRR-002 (Pass); reviewed route, `task_size=Medium`, `architectural_risk=High`
- Bootstrap base reference: `origin/personal` @ `f171032e88`
- Integrated base reference used for docs sync: `origin/personal` @ `8b15c5a274`, merged into the ticket branch as `af350d65ee`
- Post-integration verification reference: `evidence/DLV-01-*` (all Pass on `af350d65ee`)

## Why Docs Were Updated

- Summary: the restore check, the memory store's JSONL handling and the refusal wording changed. Two long-lived docs described the old behavior: `agent_memory.md` said `indeterminate` covers any malformed active file, and the core memory design said the reader "truncates only a malformed final physical record" (the decoded-string cut that caused the defect). Neither described the append guard, the zero-byte rule or the refusal text.
- Why this should live in long-lived project docs: the JSONL line rule is a persistence-format rule shared by all runtimes and by the restore check; future readers of the store, the inspector and the task-execution adapters need it to reason about restore after an unclean shutdown.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | "Conversation Activity Classification For Restore" owns the inspector contract | Updated | Named by the code reviewer |
| `autobyteus-ts/docs/agent_memory_design.md` | Canonical core memory design; owns the store's JSONL read and repair rule | Updated | Old sentence described the replaced reader |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Wake-on-message describes `assertRestorableChain` and `TASK_EXECUTION_CONTEXT_UNAVAILABLE` | Updated | One clause + link |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Mentions `TASK_EXECUTION_CONTEXT_UNAVAILABLE` on the same-root path | No change | Names the code only; still accurate |
| `autobyteus-server-ts/docs/modules/run_history.md` | Mentions `TASK_EXECUTION_CONTEXT_UNAVAILABLE` for a copy without a conversation | No change | Still accurate |
| `autobyteus-server-ts/docs/modules/projects.md` | Reactivation refusal table row "Saved conversation missing" | No change | Code unchanged; "It cannot be restored" still summarizes the message |
| `autobyteus-ts/docs/agent_memory_design.md` §5 ("not … whole-machine-power-loss durability") | Could be read as contradicted by durable replace | No change | It is about multi-file publication; still true (appends are not synced, FU-001) |
| `autobyteus-web/docs/*` | Frontend unchanged | No change | The error card renders the frame's `message` unchanged |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Rewrite of one section | The inspector reads with the shared line rule; a damaged end is ignored; `indeterminate` only for other damage, with a reason table (`line N of <file> is damaged`, …); the store cuts a damaged end, logged, at open-for-use and before the first append; no startup scan; member-activation error carries the reason; the refusal function and its two message forms | Code reviewer item 2; old text said any malformed active file is `indeterminate` |
| `autobyteus-ts/docs/agent_memory_design.md` | Replace one paragraph | The line rule (absent edge zeros/whitespace, interior zeros never complete, damaged end vs `JsonlLogDamagedError`), `repairJsonlDamagedEnd`, the append guard `jsonlLogEndsCleanly` (≤64 KiB tail scan with full-repair fallback), sealed segments never cut, `replaceFileDurably` for whole-file replacements, appends not synced | The old paragraph described the removed reader |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Clause + cross-link | A damaged end does not count against the ingress; the refusal names the Agent/Team, coordinator, reason and next step | Keep the wake-on-message description consistent |
| `tickets/done/unclean-shutdown-delegated-run-restore/design-spec.md` (ticket artifact) | Correction | DS-002 narrative and the Guidance end-check bullet now describe `jsonlLogEndsCleanly` (tail scan with the shared rule, full-repair fallback) instead of "last byte `\n` → append"; `jsonlLogEndsCleanly` added to Interface Boundary Mapping | Code reviewer item 3 (CRR-001 C-01); the design now matches the reviewed code |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Memory JSONL line rule | Byte-offset rule; edge zeros absent; interior zeros = damage; only the damaged end is ever cut | `design-spec.md` (Concrete Examples), `investigation-notes.md` | `autobyteus-ts/docs/agent_memory_design.md` |
| Lazy repair, append guard | Cut at open-for-use and before the first append per path per instance; no startup scan; 64 KiB tail check | `design-spec.md` DS-002, CRR-001 C-01 | `autobyteus-ts/docs/agent_memory_design.md`, `agent_memory.md` |
| Restore classification and refusal reasons | `present`/`none`/`indeterminate` with plain-words reasons; refusal wording | `design-spec.md` Refusal reasons (R-1) | `autobyteus-server-ts/docs/modules/agent_memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `readJsonl` / `writeJsonl` / `writeJson` in `run-memory-file-store.ts` (decoded-string cut, non-synced tmp+rename) | `jsonl-log-file.ts` (`readJsonlRecords`, `repairJsonlDamagedEnd`, `jsonlLogEndsCleanly`), `durable-file-replace.ts` (`replaceFileDurably`) | `autobyteus-ts/docs/agent_memory_design.md` |
| `readJsonlStrict` in the inspector (any malformed line → `indeterminate`) | `readJsonlRecords` + plain-words reasons | `autobyteus-server-ts/docs/modules/agent_memory.md` |
| Per-adapter "… is unavailable (indeterminate); it cannot be restored." message | `taskExecutionConversationUnavailable` | `autobyteus-server-ts/docs/modules/agent_memory.md` |

## No-Impact Decision

- Not applicable (docs updated).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, finalization
- Notes: the server display readers (`autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts`) still use their own lenient loop (FU-002); the docs do not claim otherwise.
