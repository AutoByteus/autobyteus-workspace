# Handoff: Architecture Design Complete (round 9)

- Result: `Architecture Design Complete`
- Task: `autobyteus-461` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` ("Stopping an agent (e.g. the Project Task Manager) must not stop the task agents and task agent teams it delegated to")
- Package identifier: `delegated-copies-outlive-delegator-461`
- Current solution revision: `SR-033`
- From: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`). Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Date: 2026-11-11
- Classification: `task_size = Large`, `architectural_risk = High` (unchanged)

## Status and approval

- Requirements `Approved` (SR-018), with the contract as their behavior-defining supplement.
- The contract now stands at revision 8, built on the user's direction. The decisions since round 8 (TC-12 revised, TC-13, the peer member addresses, §2.4) were taken by the Solution Designer within that direction, and the user was informed.
- The user's direction for this round (2026-11-11):
  - the contract records every collaboration case, local and across nodes: the address, the data change and the transition of each;
  - it is validated as such;
  - the code is implemented from it, and refactored where it differs.
- The user asked for the package to go to review.
- Design `Ready`, self-validated.

## What happened since your round 8 (ARCH-REV-008 failed SR-024 with AR-018)

| SR | Change | Why |
| --- | --- | --- |
| SR-025 | **TC-12 revised: every team run is rooted at `/`**, a delegated one too. The delegation address is the Task entry's `recipientAddress`, now on every entry. A handoff `to` outside a delegated team is an external target, resolved when it is sent by the assigner's standing agents. | Answers AR-018: no reader of `/` changes, and the peer path already roots at `/`. |
| SR-025 | **Contract §5.4.1, every address case**, replayed on the user's 6,646 stored addressed sends. Every delivered send reaches the same receiver, except 53 older sends to a delegated run that today's code already refuses. 0 sends are newly found, and 0 addresses collide. | The user asked for every address, written exactly and checked. |
| SR-026 | **The contract as one file, every case.** **TC-13: one place for an agent run's message log**, the run's own folder (DS-10 step 5b moves 8 logs). Extra message copies in former hosts' logs are kept. | Collecting the cases showed two log locations, 8 runs in `collaboration/` and 42 in the run folder. |
| SR-027 … SR-029 | The cases are organized by the run the user starts (a standalone agent, a team, an org), then walked as states of the disk. | The user. |
| SR-030 | The contract's JSON examples are checked against its rules (`validate_contract_examples.py`). Three wrong transitions were fixed, closure/deletion and the assigner's continuation among them. **A peer team's members are stored with their own addresses** (`/lead`): node B's answer no longer mounts them, and the migration drops the prefix from 4 stored addresses. | Self-validation; P8 (every address belongs to its run's own space). |
| SR-031 | **The contract as an executable model.** `evidence/collaboration-model/model.py` holds the rules as code; `stories.py` holds three stories; `walkthrough.py` generates `collaboration-walkthrough.md`, every state file by file, peer node included. `--check` keeps the contract, the walkthrough and the §3 … §4 examples equal to the model. | Hand-written transitions had been wrong. The user wants the code built from a validated record. |
| SR-032 | **Contract §2.4, which Task a delegation belongs to.** A run that works on a Task cannot use `task_id`. Sub-work joins the run's newest open entry, and is refused only when none is open. | Raised by the Implementation Engineer and decided on the model's merits. Both rules equal today's code. |
| SR-033 | The §2.4 rules as states: S12 … S15, S23. | The user. |

## What to review

1. **AR-018's answer (TC-12 revised).**
   - Readers: none that equates the root or the team scope with `/` changes. The handoff compiler keeps a delegated team's outside `to` as an external target. Node B's answer stops mounting peer members.
   - Migration: DS-10 step 4 rebases a delegated team's members and handoffs (153 of 153 without a collision) and fills `recipientAddress` (30 of 30). The members of the 11 open delegated teams are told their new addresses.
   - Tests: the design's test list.
2. **The contract's rules (§2), records (§3), tree (§4) and cases (§5).**
   - Are they complete?
   - Is each rule right for the data model? For example: the address steps; rules (a) and (b); §2.4; TC-13; peer member addresses.
3. **The executable model as the reference.**
   - Does `model.py` express §2 … §4 faithfully?
   - Do the stories cover the cases a reviewer would expect?
   - The design makes the stories the ticket's acceptance test: they run against the server (two instances for the peer node), and the server's files are compared with the walkthrough after every step.
4. **DS-10 additions**: step 3 (peer member prefix), step 4 (rebasing to `/`, `recipientAddress`), and step 5b (moving logs, with an unfinished `20261018_…` item left for its own retry).

## How to check

From the ticket folder:
- `python3 -I evidence/collaboration-model/walkthrough.py --check target-collaboration-contract.md` must print three "match" lines.
- `python3 -I evidence/data-model-validation/validate_contract_examples.py collaboration-walkthrough.md` prints 0 findings.
- `python3 -I evidence/data-model-validation/validate_every_case.py <server-data dir>`, read-only on the user's data. Its saved output is `every-case-2026-11-11.txt`, and every line starts with its case ID.

## Known limits (proposed as follow-up work, not blocking)

- The model is not run on the user's data. The rules are checked there by `validate_every_case.py`, a second implementation of the same rules. Running the migrated data through the model itself would leave one implementation.
- The migration (E1 … E12) is not yet a story of the model. A delegation to a peer from an org, or from a delegated team, is not yet a story. Idle shutdown, restart and legacy runs are prose only.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`
- Branch: `codex/delegated-copies-outlive-delegator-461` (not pushed); ticket documents up to `9db7b74e7b` and this handoff
- Base: `origin/personal` `827f1e68dc`
- Implementation is in progress on the same branch, by the Implementation Engineer, who has been informed of each SR.

## Documents

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/`

- `target-collaboration-contract.md` (revision 8): principles, addresses and rules, records with their code owners, the tree, every case (§5), existing data before and after (§6), decisions, and the validation index
- `collaboration-walkthrough.md`: generated; 41 states
- `evidence/collaboration-model/`: `model.py`, `stories.py`, `walkthrough.py`
- `design-spec.md` (SR-033)
- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md` (SR-025 … SR-033 since your last round)
- `evidence/data-model-validation/`: read-only scripts and their outputs
- `follow-ups.md`
- Your `design-review-report.md` and `architecture-review-revision-record.md`

## Constraints

- `DESIGN.md`, `TESTING.md`, `RELEASE.md`; the Data Migration Guideline; the Collaboration Model, which this change rewrites.
- Never run a migration or a startup on the user's data.

## Route

`get_handoff_rules`: "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
