# Runtime Investigation: Historical Content-Path Parser Miss Superseded By Explicit References

## Status

- Date: 2026-05-04
- Investigator: solution_designer
- Current Classification: Historical evidence for why content scanning is brittle; no longer an implementation target.
- Superseding Design: `send_message_to.reference_files` explicit-reference refactor.
- User-observed symptom from earlier runtime: `send_message_to` succeeded with an absolute file path in the message body, but the Artifacts UI did not show the expected Sent/Received referenced artifact.

## Supersession Note

This report originally identified a local parser coverage defect: Markdown-bolded absolute paths such as `**/Users/.../math_problem.txt**` were not detected by the content scanner. After further user discussion, the target design changed.

The implementation should **not** extend the Markdown/content parser as the main fix. Instead, the new design removes message-content path scanning and uses an explicit optional `reference_files` field on `send_message_to` as the only source for message-file-reference declarations.

The evidence below remains useful because it shows why natural-language/Markdown parsing is a fragile authority for artifact sharing.

## Runtime Evidence

Runtime log source:

- `/Users/normy/.autobyteus/logs/app.log`

Persisted team data source:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_4dcfd073`

Observed team/member identity:

- Team run: `team_classroomsimulation_4dcfd073`
- Sender: `professor_05df570f0f24846d` (`professor`)
- Receiver: `student_76dcd8a8a6f6fdee` (`student`)
- Runtime kind: `claude_agent_sdk`

The professor `send_message_to` tool call was accepted. Evidence from:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_4dcfd073/professor_05df570f0f24846d/raw_traces.jsonl`

Relevant historical payload shape:

```json
{
  "tool_name": "send_message_to",
  "tool_args": {
    "recipient_name": "student",
    "content": "Hello student!...\n\nYou can find it at:\n**/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.txt**\n\nIt's an Elliptic Curve Discrete Logarithm problem...",
    "message_type": "agent_message"
  },
  "tool_result": {
    "accepted": true,
    "code": null,
    "message": null
  }
}
```

The receiver did get the message. Evidence from:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_4dcfd073/student_76dcd8a8a6f6fdee/raw_traces.jsonl`

Relevant received user content included the same Markdown-bolded path:

```text
You can find it at:
**/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.txt**
```

The referenced file existed and was readable:

- `/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.txt`

No message-reference projection was created for that runtime dataset.

## Static Code Evidence From Historical Parser Design

Relevant parser file at the time of investigation:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-paths.ts`

The content scanner was designed around regex extraction from prose. The specific runtime miss happened because the slash in the absolute path was preceded by Markdown `*`, which the parser did not treat as a left delimiter in its earlier form.

This failure mode is no longer worth expanding into a broader Markdown parser because the user-approved refactor makes file-reference intent explicit in `reference_files`.

## Superseding Required Implementation Action

Owned by downstream implementation after architecture review:

1. Add optional `reference_files: string[]` to `send_message_to` schemas/contracts.
2. Validate/normalize explicit references at the tool argument boundary.
3. Carry `referenceFiles` through delivery and accepted `INTER_AGENT_MESSAGE.payload.reference_files`.
4. Render a generated **Reference files:** block in the recipient-visible runtime input when explicit references exist.
5. Refactor `MessageFileReferenceProcessor` to consume only `payload.reference_files`.
6. Remove/decommission `extractMessageFileReferencePathCandidates` and content-scanning fallback/tests.
7. Keep concise diagnostics around explicit reference count, validation failures, projection insert/update, skipped missing metadata, and content resolve failures.

## Validation Needed After Refactor

- `send_message_to` with:

```json
{
  "recipient_name": "student",
  "content": "I prepared the hard math problem. Good luck!",
  "reference_files": ["/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.txt"]
}
```

should produce:

- accepted delivery;
- recipient-visible input containing a generated **Reference files:** block;
- `INTER_AGENT_MESSAGE.payload.reference_files` containing the normalized path;
- one `MESSAGE_FILE_REFERENCE_DECLARED`;
- team-level `message_file_references.json` upsert;
- sender perspective row under **Sent Artifacts**;
- receiver perspective row under **Received Artifacts**.

- `send_message_to` with the same absolute path only in `content` and no `reference_files` should produce no message-file-reference declaration or artifact row.
