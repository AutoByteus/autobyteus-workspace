# Handoff: architecture review of autobyteus-500, delivery 1 (SR-005)

- **From:** Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`).
- **Classification:** Architecture Design Complete, `task_size=Large`, `architectural_risk=High`.
- **Task:** `autobyteus-500` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-of-461-500`, branch `codex/follow-ups-of-461-500`, at `86b650c247`. Base: `origin/personal` `e4f4b3e176`. Finalization target: `personal`.

## The package (ticket folder `tickets/in-progress/follow-ups-of-461-500/`)

| File | Role |
| --- | --- |
| `requirements-doc.md` | Approved at SR-004. The user decided D-1, D-5 and D-8; the rest was decided within the direction, with the user informed |
| `investigation-notes.md` | Evidence, including "Architecture investigation (delivery 1)" and "FU-021" |
| `design-spec.md` | The design (SR-005) |
| `solution-revision-record.md` | SR-001 … SR-005 |
| `follow-ups.md` | FU-500-01 … FU-500-03 |
| `source-follow-ups-461.md` | The Task's context: 461's follow-up rows |

## Scope

Delivery 1 covers groups 1, 3, 4, 5 and 6, which is REQ-001 … REQ-011. Group 2 (migration safety) is delivery 2 and isn't part of this review.

## What most needs review

1. **The FU-020 migration** (design "Migration Plan" M-1 … M-10):
   - Admission: the link's own folder and file prove ownership, not the named host (111 of 231 links name an ancestor).
   - Backups are made under the founder's rule.
   - The late-predecessor classification: one writer, `20261017_task_agent_own_run_v1`, and therefore one follow-up.
   - The cost: one 8.6 GB byte pass at the first start.
2. **Naming rule N1:** "root" stays where it means a run at the top of its own membership tree. FU-006's suggested `…Runtime` renames were treated as a lead and not taken.
3. **DR-1 and DR-2:** explicit "off" or "not eligible" values from each composition, the studio server and the standalone application host, replace silent lookups and optional collaborators. Process getters that throw stay (FU-500-02).
4. **FU-013:** the team total serves team runs only. No client asks for an org's total.
5. **FU-035:** the implementation reproduces the problem first (step 0), and the fix takes one of two branches depending on what it finds.

## Items marked "to verify" in the design (lesson: code not yet read)

- N6: is `agents/{run}/collaboration/` still used?
- Is `'transient_execution'` persisted in the web's browser storage?
- `delegated_copy_own_file_complete_v1` moves no traces.
- The callers of `getAgentRunCommandCoordinator()`.
- Whether the application host uses the Task service.

## The user's constraints

- Any change to the founder's real data needs his approval and a backup first. D-8 approves this migration with a backup.
- Release only on his word.
- The Grok waiver rule: only the founder's own words apply to a Grok smoke case that fails solely on a usage limit.
- Real provider keys come only through `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`.
