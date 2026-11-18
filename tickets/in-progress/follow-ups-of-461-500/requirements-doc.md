# Requirements Document

## Document Status

- Status: `Approved` (SR-014): delivery 1 at SR-006 plus REQ-016 (SR-011), D-13 (SR-013), D-13b and D-14 (SR-014); delivery 2 at SR-010
- Current solution revision ID: `SR-017`
- Package identifier: `follow-ups-of-461-500`
- Request / ticket: Project Task `autobyteus-500` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: "All follow-ups of autobyteus-461 in one Task"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), at the founder's word (2026-11-17)
- Requirements owner: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`)
- Date: 2026-11-17
- Approved by and reference: the user decided D-1 and D-8 (2026-11-17, quoted in Open Decisions). The rest was approved by the Solution Designer within the Task's direction, and the user was informed in the conversation (2026-11-17)
- Exact approved requirements baseline / solution revision: this document at SR-006 (delivery 1)
- Behavior-defining supplements: `source-follow-ups-461.md` (the Task's context file: the follow-up rows FU-*, as leads, not decisions)

## Problem And Desired Outcome

- **Problem:** the delivered autobyteus-461 (`v1.5.13-beta.7`) left 22 recorded follow-ups, in six groups:
  1. hosting-era names in the web (FU-019, FU-020);
  2. migration safety (FU-027, FU-032, FU-028, FU-029, FU-033);
  3. server naming and dependency cleanup (FU-006, FU-010, FU-007, FU-011, FU-018, FU-013, FU-002);
  4. refusal wording (FU-030);
  5. tests and tooling (FU-016, FU-021, FU-022, FU-023);
  6. new at delivery (FU-035 Grok's refused tool calls; FU-036 silent drop of an early command).
- **Desired outcome (the Task's goal):**
  - no behavior change, except where a name hid a bug or the founder decided otherwise;
  - green and reliable gates;
  - no silent loss;
  - clear refusals.
- **Done when:** each group is delivered or explicitly dropped with the founder's word, finalized on the base branch. A release happens only on his word.

## Constraints From The Task (the founder's rules)

- Any change to the founder's real data needs his approval and a backup first. No data migration by default.
- FU-027's scope is open with the founder: ask him directly before designing it.
- The Grok waiver rule stays: only the founder's own standing words apply to a Grok smoke case that fails solely on a usage limit.
- Follow `DESIGN.md` and `TESTING.md`.

## Open Decisions

| ID | Decision | Owner | Status |
| --- | --- | --- | --- |
| D-1 | FU-027's scope (the migration runner's order and late-run rules) | **The user**, 2026-11-17 | **Decided: option 1, guards only.** The user: "I feel like a simple guard would be enough … a guard which protects the current order so somebody can only put it in as the latest … being enough for migration." So: the released order is protected (learned from the latest release tag, not a hand-kept list), and a new migration can only be appended as the latest (its ID's date later than the last entry's), by test. The runner is unchanged. Late-running migrations stay handled per migration, by the guideline's rule (461's follow-up pattern). FU-028 and FU-029 are fixed individually. The minimum supported upgrade version (option 3) is not taken. |
| D-2 | Staging of the six groups into deliveries | Solution Designer (user informed) | proposed 2026-11-17 |

| D-2 | Staging: **delivery 1** = groups 1, 3, 4, 5, 6; **delivery 2** = group 2 | Solution Designer (user informed 2026-11-17) | Decided. Delivery 1 is mostly renames and local fixes, with no data. Delivery 2 depends on D-1 and touches the migration code |
| D-3 | FU-036: a command sent before a stream is ready | Solution Designer | **Refuse clearly:** the Org and agent-collaboration streams answer `SESSION_NOT_READY`, as the agent and Team streams already do (`api/websocket/agent.ts`, `attachRunStream`). No command is dropped. This is the existing pattern; queueing would add state |
| D-4 | FU-030's scope and style | Solution Designer | **Scope:** the five collected wordings, plus every refusal on the surfaces they come from: `delegate_task` / `send_message_to` results, archive and delete of a run, a delegated run's Settings save, and delegation launch notes. **Style:** say what happened and why, then what to do next, with the run named by its name (SR-091). Outcomes don't change |
| D-5 | FU-007: the Task record's names (stored and code) | **The user**, 2026-11-17 (SR-004, narrowed SR-006) | **Decided: no change this round, in code or data.** SR-004 kept the stored names and planned a code-only rename ("task execution" → "delegated run"); at SR-006 the user dropped that too ("i guess we could drop this as well"). The whole of FU-007, stored and code names, is follow-up FU-500-01 |
| D-6 | FU-013: one ID for team and org token totals | Solution Designer | **The query states the run kind**, and the resolver stops guessing. The stored usage field (`root_team_run_id`) is left as it is: renaming it needs a data migration, which isn't worth it for a name. It's recorded as a known leftover in the glossary |
| D-7 | FU-002: two files over 500 lines | Solution Designer | **Already resolved by 461:** `standalone-agent-run-root.ts` is 323 lines and its manager 429. Nothing to do |
| D-8 | FU-020: attachments to a delegated child are named through its delegator | **The user**, 2026-11-17 | **Decided: (b), clean code and clean data.** The user: "Basically the code and the data both should be clean … I think the data migration guideline mentioned this." New attachments use the child's own link. The host-scoped owner kind, its route and `DelegatedChildLocations` go. The 425 stored links in 143 message files are rewritten to the child's own link by a data migration (the guideline's current-only runtime: no legacy reader). The founder's rule applies: **a backup before any file is rewritten**. The migration follows `data_migration_guideline.md`, including the new "Registry order and late predecessors" rules. Correction (SR-003, evidence only): beta.7 no longer writes these links (`e19ed3819f`, CR-461-106); the migration converts every link written before it (231 structured links, all in the child's own folder) |
| D-10 | FU-028: a late `20260901_agent_org_flat_team_families_v1` writes `launchConfiguration.skillAccessMode` | Solution Designer, at the user's word (2026-11-17: "you decide, I think now you have very good understanding of the project") | **Decided: dropped, as not a defect.** Evidence (investigation notes, "Delivery 2"): no current code reads or writes `skillAccessMode` (`git grep` outside `src/app-data-migrations` finds none); no migration removes the field: `20260706_remove_global_skill_discovery_mode` only rewrites the value `GLOBAL_DISCOVERY` (`remove-global-skill-discovery-mode-migration.ts:74-80`), so every older stored launch still carries the field, and the late writer's `"NONE"` (461 evidence `API-E01-r9-F53-team-run-retry-tree.txt`) is the same ignored residue. Removing it everywhere would be a migration for a representation only, which `data_migration_guideline.md` §3 rejects (an obsolete field is ignored on read and dropped on the next save) |
| D-11 | Where the released order comes from (D-1: "learned from the latest release tag, not a hand-kept list") | Solution Designer | **Recorded by the release itself:** the release script writes the registry's IDs, in order, to a file in the release commit, so the tag holds exactly what it shipped; the order test reads that file. Reading old tags from git is not possible in a test (a registry is code, and CI clones may hold no tags) |
| D-12 | The Task's comment of 2026-11-17 (from autobyteus-508 FU-001): a stored run or member whose saved model its saved runtime doesn't offer | Solution Designer, within the direction (the PM added it to group 4) | **Shown and refused clearly.** Settings marks each member, not only the root, with the existing "not offered" note. Activation of such a stored launch (a standalone run's restore, a member's activation) is refused with one message naming the agent, runtime and model, and saying how to repair it. It is refused only when the runtime's list was read and lacks the model. An unreadable list starts as today, so a slow or failed catalog never blocks a run whose model may be fine. The text follows FR-1 … FR-4 |
| D-13 | FU-021: the OS loses file events under heavy load (Reproduced: raw chokidar 1/5 and Node `fs.watch` 2/8 rounds with no event within 60 s, none of our code) | Solution Designer, within the direction (the user informed) | The watcher test asserts outcomes and classifies a timeout: an environment probe tells "the OS delivered no file event" from a product failure. AC-005's watcher part is met where the OS delivers events. Making the File Explorer recover from OS-dropped events is a feature: follow-up FU-500-06 |
| D-14 | FU-035 step 0 blocked by Grok's 24-hour free-usage limit (IMP-011: 429 `free-usage-exhausted`, 609,708 of 600,000 tokens) | Solution Designer (sequencing only; nothing is waived) | The rest goes to code review now. Step 0 runs when the window resets, as a later implementation round (IR-002) with its branch A or B, and its own code review. A usage limit is not a result: FU-035 stays open until a live run shows the cause. Waiving it needs the founder's own words |
| D-13b | FU-021: no in-run classification can prove a product fault under load (IMP-012: the OS drops events per stream, so a probe on another stream that gets its event doesn't show the watcher's stream got its own) | Solution Designer | A hang-guard timeout says only what is known. ENVIRONMENT when the probe also got nothing. Otherwise "INCONCLUSIVE: the watcher saw no change, a fresh stream did; the OS can drop one stream's events under load (FU-500-06)". It never says "product failure". AC-005's watcher part is proven where the OS delivers file events reliably: the API/E2E engineer runs the file 5 of 5 on Linux (inotify, a Docker container from the worktree) and, when available, on a quiet macOS. Runs on a loaded macOS are recorded as evidence, not as the gate |
| D-15 | The migration IDs after `v1.5.14-beta.1` released 491's `20261118_remove_retired_built_in_agents` ahead of this ticket's two | Solution Designer | New IDs dated `20261119`, appended after 491's entry. 491 is classified `none` against FU-020 (disjoint data). The released record becomes beta.1's 46 IDs (design SR-017) |
| D-9 | FU-035: Grok's refused tool call reaches the agent only as "Tool execution failed." | Solution Designer | `Unclear` until reproduced. The text may be lost in our projection (`grok-build-tool-projection.ts:37`, which only affects what we display) or inside the Grok CLI (what the model sees, an external dependency). It is investigated with a live Grok run, under the Grok waiver rule: a usage limit alone is not a failure, only the founder's words decide |

## Requirements (delivery 1)

| ID | Requirement | Follow-ups |
| --- | --- | --- |
| REQ-001 | The web names a delegated run by what it is, a run of its own bound to its Task: no "transient execution" types, kinds or component names. No behavior change | FU-019 |
| REQ-002 | The server's run runtimes and their helpers are named for one run, not a hosted tree (no "root" meaning a host). The children of a run, local or on a peer, have one name per concept, and so does a delegated run, in code and in public result codes where a code names the old concept. No behavior change. `collaboration_model.md`, `GLOSSARY.md` and the module docs follow | FU-006, FU-010 |
| REQ-003 | *Dropped by the user (SR-006); FU-007 is follow-up FU-500-01.* | FU-007 |
| REQ-004 | No owner is reached through a process-wide `bind*` / `find*` / `get*` lookup that silently does nothing when unbound. Required owners are passed in, and a missing one fails at composition | FU-011 |
| REQ-005 | No class decides behavior by whether an optional collaborator was passed in (`AgentRunService`, `TaskExecutionResourceRelease`). Each host states its stop and activation path explicitly | FU-018 |
| REQ-006 | Token totals are asked for with an explicit run kind (team or org), and no resolver guesses the kind of an ID (D-6) | FU-013 |
| REQ-007 | Refusals on the surfaces of D-4 are clear and consistent: what happened, why, and what to do. Outcomes are unchanged | FU-030 |
| REQ-008 | The gates are reliable: `mobile-shell-probe.mjs` has unique case IDs; `file-system-watcher.integration.test.ts` passes under load; `agent-runtime-names.test.mjs` covers every runtime (`deepseek_harness`); the web type gate counts each error once | FU-016, FU-021, FU-022, FU-023 |
| REQ-009 | A command sent to any stream before it is ready gets `SESSION_NOT_READY`. None is dropped silently (D-3) | FU-036 |
| REQ-010 | A refused tool call on `grok_build` reaches the agent with the server's reason and guidance, as on the other runtimes (D-9: the cause is investigated first) | FU-035 |
| REQ-016 | A stored run or member whose saved model is not offered by its saved runtime is marked in Settings (each member row, as the root already is) and refused at start with one clear message (agent, runtime, model, repair), instead of an opaque runtime error (D-12) | autobyteus-508 FU-001 |
| REQ-011 | Attachments to a delegated child belong to the child's own run, in code and in stored data: new links name the child's own run, and existing links are converted once, with a backup first (D-8) | FU-020 |

## Acceptance Criteria (delivery 1)

| ID | Requirement | Observable outcome |
| --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | No current name in web or server source implies hosting ("transient execution", a "root" that hosts others, "copy"; `TaskExecution…` names stay, D-5); the Task schema module keeps only its one documented mapping (D-5). All tests pass, changed in names only |
| AC-002 | REQ-004, REQ-005 | A composition with a required owner missing fails at start, with the owner named; no class has an optional collaborator whose absence changes behavior |
| AC-003 | REQ-006 | A team's and an org's token totals are read through queries that state the kind; there is no kind guessing |
| AC-004 | REQ-007 | Each refusal of D-4's surfaces is listed with its new text; each says what happened, why and what to do; their outcomes are unchanged (the existing tests' outcome assertions pass) |
| AC-005 | REQ-008 | The four gates pass repeatedly: the probe guard, the runtime-names test, the web type gate at its baseline, and the watcher test 5 of 5 on Linux (inotify) and, when available, a quiet macOS (D-13b). On a loaded macOS a failure is labeled ENVIRONMENT or INCONCLUSIVE, never as a product failure |
| AC-006 | REQ-009 | An integration test sends on open to `/ws/agent-org/:id` and to the agent-collaboration stream, and receives `SESSION_NOT_READY` |
| AC-007 | REQ-010 | A live Grok run shows the server's reason for a refused call, with a test (or, if the cause is in the Grok CLI, the founder decides, per D-9) |
| AC-012 | REQ-016 | A team run whose member's saved model the member's runtime doesn't offer shows the note on that member row in Settings. Opening it and sending a message is refused with the D-12 text, and no runtime is started. The same holds for a standalone run's restore. With the list unreadable, the start proceeds as today |
| AC-008 | REQ-011 | A new attachment's link names the child's own run. After the migration, no stored link names a delegator, every rewritten link opens its file, a backup of each rewritten file exists, and a second start changes nothing |

## Requirements (delivery 2)

| ID | Requirement | Follow-ups |
| --- | --- | --- |
| REQ-012 | The released migration order is recorded by the release and protected by a test: the released entries keep their order, and a new migration can only be appended, dated after the newest entry. Nobody updates a list by hand. The runner is unchanged (D-1, D-11) | FU-027 |
| REQ-013 | A late `20260521_team_run_history_index_v2` (failed and retried, or waiting behind a failed prerequisite) keeps every team run whose folder exists listed in history (its row kept, or rebuilt in the current row shape), and removes only rows whose folder is gone: a same-ID repair | FU-029 |
| REQ-014 | The web probe's skill-improvement removal case asserts the migration's real rule: its data names the server helper run in a session, as the server test SID-2 does | FU-033 |
| REQ-015 | FU-028: no change; dropped (D-10) | FU-028 |

| AC | Requirement | Observable outcome |
| --- | --- | --- |
| AC-009 | REQ-012 | Moving a released entry, inserting one before it, or appending one dated earlier fails the order test; the release script writes the file and the release commit contains it; no hand step in `RELEASE.md` |
| AC-010 | REQ-013 | On released-shape data where the migration runs late over a pre-v2 index, every user-started and delegated team run whose folder holds a current tree is listed through the current reader (a legacy row is rebuilt, a valid row is kept), a row whose folder is gone is removed, and a second start changes nothing |
| AC-011 | REQ-014 | `skill-improvement-removal-cases` SIR-002 passes against the unchanged migration |

## Scope Guardrail

- **In scope (delivery 1):** groups 1, 3, 4, 5, 6 as above.
- **Delivery 2:** group 2 under D-1: the order guard (FU-027 option 1), FU-028, FU-029 and FU-033. **No reordering of released entries:** the user's "protect the current order". **FU-032 is dropped by the user** (SR-007): "currently no one has reported any problem yet even they jump from old versions"; many users are new and have no old data. Its requirements are written when delivery 2 starts.
- **Out of scope:** the withdrawn and done follow-ups listed in the Task; any data migration without the founder's approval and a backup; a release without his word.
- **Preserved:** every behavior, except where a requirement above says otherwise.
