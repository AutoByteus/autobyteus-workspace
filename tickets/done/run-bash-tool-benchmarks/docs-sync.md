# Docs Sync

## Scope

- Ticket: `run-bash-tool-benchmarks`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/run-bash-tool-benchmarks/workflow-state.md`

## Why Docs Were Updated

- Summary: no long-lived human-facing project docs needed updates in this ticket.
- Why this change matters to long-lived project understanding: the source of truth for these tool contracts currently lives in tool schemas, formatter examples, tests, and the ticket artifacts rather than README-style documentation. The final local fix restored workspace-root-relative file-path support, and the in-code tool descriptions already reflect that truth.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `README.md` | check whether public project docs describe these tool contracts | No change | README does not document the tool-call contract details touched here |
| `autobyteus-ts/src/tools/usage/formatters/run-bash-xml-schema-formatter.ts` | verify in-code usage docs remain aligned with the terminal contract | No change | already updated in branch scope before this workflow pass |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-schema-formatter.ts` | verify in-code usage docs still describe `edit_file` as patch-oriented | No change | branch scope already reflects the current patch-only contract |
| `autobyteus-ts/src/tools/usage/formatters/write-file-xml-schema-formatter.ts` | verify in-code usage docs match the final explicit file-path semantics | No change | branch scope already reflects the current absolute-or-workspace-root-relative path contract |

## No-Impact Decision

- Docs impact: `No impact`
- Rationale: the durable truth for this ticket is already encoded in source-level tool descriptions, formatter examples, tests, and these workflow artifacts; there is no separate maintained repo doc that would become misleading if left unchanged.
- Why existing long-lived docs already remain accurate: README-level docs do not claim old cwd/file-edit semantics, so leaving them unchanged does not contradict the new behavior.

## Final Result

- Result: `No impact`
- Follow-up needed: if a future ticket introduces public-facing tool documentation, it should incorporate the finalized `run_bash` cwd contract and the split edit-tool family.
