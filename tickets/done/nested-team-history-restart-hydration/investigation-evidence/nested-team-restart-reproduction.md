# Nested-Team Restart Reproduction Evidence

## Status And Purpose

- Status: Complete investigation evidence; approval not applicable.
- Purpose: Retain the browser, API, filesystem, and restart evidence that isolates the nested-member history defect on Docker node `http://localhost:8001`.
- Scope: One existing Codex/GPT-5.6 run supplied by the user and one controlled AutoByteus/DeepSeek V4 Flash nested-team run created from the user's private fixture package.
- Related behavior and requirement IDs: BEH-001 through BEH-004; REQ-001 through REQ-006; AC-001 through AC-009.

## Environment

- Docker container: `autobyteus-server-0`
- HTTP mapping: host `8001` to container `8000`
- Durable data mount: Docker volume `autobyteus-server-0-data` at `/home/autobyteus/data`
- Private package already imported in the node: `local:%2Fhome%2Fautobyteus%2Fworkspace%2Fautobyteus-private-agents`
- Private fixture source: `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test`
- Browser client: repository frontend started on `http://127.0.0.1:3001` with its backend node base URL set to `http://localhost:8001`; reproduction used browser `open_tab` and DOM interaction.

## Existing User Run: Codex Control And Failure

### Identities

| Subject | Identifier / Address |
| --- | --- |
| Root TeamRun | `software_development_department_eadcb92704314c3cba0854663b3dcbb3` |
| Direct root member | `/head_of_software_development` / `head_of_software_development_5807f28f243d4a4ea714c602af4a4890` |
| Nested team | `/requirements_engineering_team` / `requirements_engineering_team_263fe4c023e6404ea76863f4acd7342c` |
| Affected nested member | `/requirements_engineering_team/product_prototyper` / `product_prototyper_ca1272ff21cf40a7919d25466bd516f9` |
| Runtime / model | `CODEX` / `gpt-5.6-sol` |

The stored nested member trace exists at the flat writer path:

```text
/home/autobyteus/data/memory/agent_teams/
  software_development_department_eadcb92704314c3cba0854663b3dcbb3/
  product_prototyper_ca1272ff21cf40a7919d25466bd516f9/
  raw_traces_active.jsonl
```

At inspection it contained 110 lines and 505,163 bytes. It also had a 1,070,029-byte rotated segment, a manifest, and `file_changes.json`.

The cold reader derives this canonical hierarchical path, which is absent:

```text
/home/autobyteus/data/memory/agent_teams/
  software_development_department_eadcb92704314c3cba0854663b3dcbb3/
  requirements_engineering_team_263fe4c023e6404ea76863f4acd7342c/
  product_prototyper_ca1272ff21cf40a7919d25466bd516f9/
  raw_traces_active.jsonl
```

After a Docker restart, GraphQL returned:

| Subject | Conversation entries | Activity entries | `lastActivityAt` | GraphQL errors |
| --- | ---: | ---: | --- | --- |
| Direct root member | 3 | 1 | `2026-08-22T04:09:13.679Z` | None |
| Affected nested member | 0 | 0 | `null` | None |

The independent root-scoped Team Communication query still returned all 6 stored inter-agent messages. This demonstrates that Team messages are preserved and are not the failing storage/read path.

### Browser Captures

- [Direct root-member control after restart](./root-member-history-control.png): the historical `hello` conversation and one Activity event remain visible.
- [Affected Codex nested member after restart](./affected-codex-nested-member-post-restart.png): the same historical team run remains in the tree, but the selected nested product prototyper has a blank conversation and `0 Events` / `No activity history yet.`

## Controlled AutoByteus / DeepSeek V4 Flash Reproduction

### Procedure

1. Opened **Agent Teams** in the browser and selected **Nested Classroom Test Team** from the already-imported private package.
2. Selected runtime **AutoByteus** and model `deepseek-v4-flash`.
3. Started the team in the default temporary workspace.
4. Sent:

   ```text
   Please test nested team delegation. Delegate one task to /StudentStudyGroup and ask the students to return exactly NESTED_CLASSROOM_RESTART_OK. Accept the result if it matches.
   ```

5. Approved the Teacher's `delegate_task` invocation. The runtime created a nested task-team execution and invoked `student_one`.
6. Verified the nested student's raw trace before shutdown. It contained five events: system instructions, the delegated user task, reasoning, an assistant event, and a pending `submit_task_result` tool call with `NESTED_CLASSROOM_RESTART_OK`.
7. Terminated the controlled TeamRun so it became historical.
8. Restarted only `autobyteus-server-0`, waited for `/rest/health`, reloaded the browser, expanded the nested team, and selected `student_one`.

### Identities

| Subject | Identifier / Address |
| --- | --- |
| Root TeamRun | `nested_classroom_test_team_a08b28dae0b44777975057b34312cd64` |
| Direct Teacher AgentRun | `test_teacher_7a13e97ab00b4f3090e42de72c238431` |
| Configured nested team | `student_study_group_926bb177a2ac46499bc94c13f356b80f` |
| Delegated task TeamRun | `team_local_team_nested_classroom_test_student_st_48643099eea24a4e9b66b78fc8f915ce` |
| Nested task member | `/StudentStudyGroup/student_one` / `student_one_00cd10fd99cc4414beadf1e176b07183` |
| Runtime / model | `AUTOBYTEUS` / `deepseek-v4-flash` |

### Physical And API Result

The nested student's 10,297-byte active trace remained at the flat writer path after restart:

```text
/home/autobyteus/data/memory/agent_teams/
  nested_classroom_test_team_a08b28dae0b44777975057b34312cd64/
  student_one_00cd10fd99cc4414beadf1e176b07183/
  raw_traces_active.jsonl
```

The reader requested the absent task-team-scoped path:

```text
/home/autobyteus/data/memory/agent_teams/
  nested_classroom_test_team_a08b28dae0b44777975057b34312cd64/
  team_local_team_nested_classroom_test_student_st_48643099eea24a4e9b66b78fc8f915ce/
  student_one_00cd10fd99cc4414beadf1e176b07183/
  raw_traces_active.jsonl
```

Server log:

```text
Memory file missing: /home/autobyteus/data/memory/agent_teams/nested_classroom_test_team_a08b28dae0b44777975057b34312cd64/team_local_team_nested_classroom_test_student_st_48643099eea24a4e9b66b78fc8f915ce/student_one_00cd10fd99cc4414beadf1e176b07183/raw_traces_active.jsonl
```

Post-restart GraphQL returned:

| Subject | Conversation entries | Activity entries | `lastActivityAt` | GraphQL errors |
| --- | ---: | ---: | --- | --- |
| Direct Teacher | 13 | 5 | `2026-08-23T05:16:20.270Z` | None |
| Nested `student_one` | 0 | 0 | `null` | None |

[Controlled nested member after restart](./controlled-autobyteus-nested-member-post-restart.png) shows the historical run and nested member in the workspace tree while the selected member renders a blank conversation and `0 Events` / `No activity history yet.`

## Restart Evidence

The controlled restart changed the container start time from `2026-08-23T05:08:09.094509096Z` to `2026-08-23T05:16:28.631077424Z`. `/rest/health` returned successfully five seconds later. The persisted source trace's modification time remained before the restart.

## Root-Cause Conclusion Supported By The Reproduction

- The defect is runtime/model independent: it reproduces with both Codex/GPT-5.6 and AutoByteus/DeepSeek V4 Flash.
- Docker durability is working: the trace files, execution tree, history index, and Team Communication records survive restart.
- The frontend renders the successful empty projection it receives; this is not a missing workspace-history row or a Team panel persistence failure.
- The writer and cold reader disagree on the physical memory scope for nested configured and nested task-team members. The writer uses the root plus AgentRun only; the reader uses root plus physical ancestor TeamRun IDs plus AgentRun.
- Direct root members work because their canonical ancestor list is empty, so writer and reader accidentally agree.

## Cleanup

- The controlled TeamRun was terminated before the final restart.
- No private package, provider secret, or user history was deleted or rewritten.
- Only `autobyteus-server-0` was restarted; the frontend investigation server is temporary and is stopped separately when investigation closes.
