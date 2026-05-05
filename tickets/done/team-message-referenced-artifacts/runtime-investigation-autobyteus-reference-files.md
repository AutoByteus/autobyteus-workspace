# Runtime Investigation: AutoByteus Team `reference_files` Reaches Recipient But Does Not Produce Artifacts

## Status

- Date: 2026-05-04
- Investigator: solution_designer
- Classification: Runtime integration bug / missing AutoByteus event-pipeline parity; bounded design addendum required.
- User-observed symptom: In the Electron build, AutoByteus runtime `send_message_to` accepts `reference_files`, the recipient can read the referenced file, but the Artifacts tab remains empty.

## Runtime Evidence

Runtime log source:

- `/Users/normy/.autobyteus/logs/app.log`

Team memory source:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_74c892f3`

Observed identities:

- Team run: `team_classroomsimulation_74c892f3`
- Sender/professor: `professor_2a3e8466fb6a249c`
- Receiver/student: `student_9a9a19ad85b5e20f`
- Runtime kind in team metadata: `autobyteus`
- Workspace root: `/Users/normy/.autobyteus/server-data/temp_workspace`

The successful professor `send_message_to` call included explicit `reference_files`:

```json
{
  "recipient_name": "student",
  "content": "Hello Students,... The problem is detailed in the attached file: math_problem.md ...",
  "reference_files": [
    "/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.md"
  ],
  "message_type": "direct_message"
}
```

Evidence:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_74c892f3/professor_2a3e8466fb6a249c/raw_traces.jsonl`
- Tool call id: `call_cb9dce744ece4fb8b291152f`
- Tool result: `Message dispatch for recipient 'student' has been successfully requested.`

The first attempted `reference_files` value was relative and correctly failed validation:

```text
[message-file-reference] invalid reference_files validation toolName=send_message_to reason=`reference_files[0]` must be an absolute local file path.
```

That validation failure is expected behavior and not the UI bug.

The recipient received the generated reference-files block and used it successfully:

```text
Reference files:
- /Users/normy/.autobyteus/server-data/temp_workspace/math_problem.md
```

Evidence:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_74c892f3/student_9a9a19ad85b5e20f/raw_traces.jsonl`
- Student then called `read_file` with `/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.md` and got the file content.

The referenced file exists:

- `/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.md`

But no derived artifact projection was written for this team:

- No `message_file_references.json` under `team_classroomsimulation_74c892f3`.
- No `file_changes.json` under the professor/student member directories for this run.

This matches the screenshot: the Artifacts tab shows no touched files and no message-reference rows.

## Static Code Evidence

Relevant AutoByteus backend path:

- `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`

`AutoByteusTeamRunBackend.deliverInterAgentMessage` currently posts the recipient input message and returns accepted, but it does not synthesize/process the accepted `INTER_AGENT_MESSAGE` through `publishProcessedTeamAgentEvents` the way Codex and Claude managers do.

`AutoByteusTeamRunBackend.subscribeToEvents` converts native AutoByteus stream events with `AutoByteusStreamEventConverter`, then directly publishes the converted `AgentRunEvent` to team listeners. It does not run those converted events through `AgentRunEventPipeline` before fanout.

Relevant contrast:

- Codex: `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` calls `publishProcessedTeamAgentEvents` after accepted inter-agent delivery.
- Claude: `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` does the same.
- Shared helper: `autobyteus-server-ts/src/agent-team-execution/services/publish-processed-team-agent-events.ts` runs `getDefaultAgentRunEventPipeline()` and publishes source + derived events.
- Default pipeline includes:
  - `FileChangeEventProcessor`
  - `MessageFileReferenceProcessor`

Additional AutoByteus-specific issue:

- Native `InterAgentMessageReceivedEventHandler` includes `reference_files` in the notifier payload, but it does not include team-level provenance such as `team_run_id`, `receiver_run_id`, or receiver name.
- `MessageFileReferenceProcessor` requires `team_run_id` and sender/receiver run identity. The AutoByteus bridge should enrich converted native `INTER_AGENT_MESSAGE` events with team/member provenance before pipeline processing.

## Root Cause

The explicit `reference_files` contract works in the AutoByteus tool and recipient-message path, but the AutoByteus team event bridge does not feed accepted/converted agent events through the same derived-event pipeline used by the other runtimes.

Because the pipeline is bypassed:

- `MessageFileReferenceProcessor` never emits `MESSAGE_FILE_REFERENCE_DECLARED` for the accepted AutoByteus inter-agent message.
- `MessageFileReferenceService` never writes `message_file_references.json`.
- `FileChangeEventProcessor` also does not write `file_changes.json` for the successful AutoByteus `write_file`, explaining the empty “No touched files yet” state.

This is a bounded runtime parity bug, not a reason to redesign the feature.

## Required Design / Implementation Action

1. Update the AutoByteus team event bridge so converted native member events are processed through the default `AgentRunEventPipeline` before team-event fanout.
2. Ensure AutoByteus converted `INTER_AGENT_MESSAGE` events are enriched before processing with:
   - `team_run_id`
   - `receiver_run_id`
   - `receiver_agent_name`
   - `sender_agent_name` when resolvable from sender run/native id
   - existing `reference_files`
3. Avoid duplicate conversation messages: process and publish the converted native source event once plus derived events; do not separately synthesize and publish a second `INTER_AGENT_MESSAGE` that duplicates the native one.
4. Preserve Codex/Claude behavior; this is AutoByteus parity work.
5. Add/adjust tests for AutoByteus team converted events:
   - `write_file` produces `FILE_CHANGE` and persists `file_changes.json`.
   - `send_message_to` with absolute `reference_files` produces `MESSAGE_FILE_REFERENCE_DECLARED` and persists team-level `message_file_references.json`.
   - The conversation receives one inter-agent message, not duplicates.

## Validation Scenario

Re-run the classroom scenario in AutoByteus runtime:

1. Professor writes `math_problem.md` in temp workspace.
2. Professor sends to student with:

```json
"reference_files": [
  "/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.md"
]
```

Expected after fix:

- `file_changes.json` exists for the professor run, so normal file artifacts/touched files can show.
- `message_file_references.json` exists under the team run.
- The professor perspective shows the referenced file as a sent/team message artifact according to the current UI model.
- The student perspective shows the same canonical reference according to the current UI model.
- The student still receives the self-contained message plus generated `Reference files:` block and can read the file.
