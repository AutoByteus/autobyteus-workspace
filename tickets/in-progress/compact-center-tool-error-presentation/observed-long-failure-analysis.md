# Observed Long Failure Analysis

## Evidence Identity

- Observed product surface: Code Reviewer team-member run shown in the supplied screenshots.
- Raw-trace root: `/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721`
- AgentRun trace: `software_engineering_team_570be46d520142849ac61785be03dca1/code_reviewer_cc67aa21ced94e779adfbbbff4a52ea1/raw_traces_active.jsonl`
- Turn ID: `01a0607d-753b-7da0-bea4-6d565983ea27`
- Tool invocation ID: `exec-b5a9620b-2113-41db-a5d9-dc9fc7de8667`
- Tool: `run_bash`
- Start event: `TOOL_EXECUTION_STARTED`, sequence 32
- Terminal event: `TOOL_EXECUTION_FAILED`, sequence 33
- Screenshot evidence:
  - `evidence/user-center-error-flood.png`
  - `evidence/user-activity-error-detail.png`

The raw trace is not copied into this ticket because its failure payload is very large and contains unrelated ticket/document content. This supplement retains only the minimum evidence needed to explain and verify the product issue.

## Observed Payload Facts

| Fact | Observation |
| --- | --- |
| Terminal event state | `TOOL_EXECUTION_FAILED` |
| `tool_result` | `null` |
| `tool_error` size | 348,978 characters |
| `tool_error` line count | 1,915 lines |
| First output marker | `--- IMPLEMENTATION HANDOFF CURRENT ---` |
| Later markers present | IR record, Requirements-relevant, and Design-relevant sections |
| Expected later marker absent | `--- ARCH REVIEW TAIL ---` |
| Final diagnostic suffix | `Exit code: 1` |

The content looks like successful/normal output because most of it is exactly that: the compound command printed several documents and search results before a later pipeline returned non-zero. The execution wrapper retained the already-produced output as the failure diagnostic and appended the exit code.

## Failure Mechanism

The command used `set -euo pipefail` and, in its Design-relevant stage, ran the equivalent of:

```bash
rg -n -C 4 '<large pattern>' design-spec.md | head -1400
```

Evidence from a controlled re-execution against the same worktree/file:

- The uncapped `rg` result contained 2,026 lines.
- `head -1400` accepted and emitted 1,400 lines successfully.
- `rg` returned status 1 after the downstream reader closed at its limit.
- With `pipefail`, the pipeline status was non-zero, and `set -e` stopped the compound command before the Architecture Review section.

The most likely explanation is the capped pipeline/broken-pipe interaction: `head` exits normally after 1,400 lines, `rg` detects the closed pipe and returns non-zero, and `pipefail` promotes that producer status to the whole pipeline. The raw trace does not include a textual “broken pipe” message, so this is an evidence-backed inference rather than a quoted provider diagnosis.

## Why The Center UI Flooded

The frontend deliberately duplicates the canonical error:

1. `handleToolExecutionFailed` applies the error to the conversation tool segment.
2. The same handler writes `segment.error` to the matching Activity item.
3. `buildToolCardPresentation` copies the segment error to `presentation.errorMessage`.
4. `ToolCallIndicator` interpolates the entire `presentation.errorMessage` into an inline whitespace-preserving red body.
5. `ToolActivityItem` independently interpolates the entire `activity.error` in its expandable Error section.

No center-specific maximum length, summary, or placement guard exists. Therefore a 348,978-character diagnostic is rendered twice, including once in the primary event stream.

This duplication is not accidental legacy code: delivered package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901` explicitly required identical detailed diagnostics in the center and Activity surfaces, and its unit/browser tests enforce that requirement. The current user request supersedes that UI choice while retaining the useful backend and Activity detail.

## Root-Cause Classification

| Question | Finding |
| --- | --- |
| Was the tool falsely marked failed by the frontend? | No evidence of a frontend misclassification. The process/pipeline returned non-zero and the terminal event is explicitly failed. |
| Why does the “error” contain normal output? | The tool error contains accumulated output emitted before the non-zero pipeline, followed by `Exit code: 1`. |
| Is loss/truncation of backend diagnostic required? | No. The user wants the complete detail preserved in Activity, not removed from the event contract. |
| What product defect should this ticket correct? | Information hierarchy: detailed failure output is duplicated into the center stream instead of remaining in the Activity diagnostic surface. |
| Should the one-off shell pipeline be changed by this ticket? | No. It explains the fixture but is not the requested product behavior change. |

## Verification Implications

- Use a deterministic large multiline diagnostic so validation proves center height/text is independent of error size.
- Assert the diagnostic is absent from center visible and accessible text, not merely clipped with CSS.
- Assert the same exact diagnostic remains in the matching Activity Error section and replayed state.
- Exercise click plus Enter/Space navigation/highlighting from the failed center card to Activity.
- Update the existing browser probe that currently requires both center and Activity to show identical diagnostic text.
- Preserve provider/backend error mapping, raw trace, and failure status.
