# Withdrawn — link-existing-run-to-task (Project Task autobyteus-11)

- The adoption feature ("give a saved Task to a run the user started") was merged in `4e738acc66` and released in v1.5.6-beta.5. It was **withdrawn by the user on 2026-10-18** (SR-018). The full-adoption revision (SR-010 … SR-017) was cancelled unmerged.
- Removal: `ffeea43dac` (revert of the merge's product changes, keeping later tickets' changes and the standalone-useful fixes, RM-006). Delivered in the withdrawal round (delivery-revision-record.md, DR-004) and released in v1.5.6-beta.7.
- Why the attempt is kept here: the documents in this folder record what was tried, AC-007's refusal on the user's install (DR-003), and the decisions.
- Behavior now: `delegate_task` with a run id that is not one of the delegator's task agents is refused with the pre-adoption text ("… is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address.").
