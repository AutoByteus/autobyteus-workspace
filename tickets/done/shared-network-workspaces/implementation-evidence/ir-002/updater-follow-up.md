# Follow-up: updater error classification depends on checkout path

Status: **out of scope, not a delivered NFS fix**. Follow-up for the project's
Tasks owner via the cumulative implementation/source-review package; no new Task
or delegated worker has been created for this finding.

## Reproduction / origin

The complete Nuxt and Electron suites each failed the same three existing
`appUpdateErrorClassifier.spec.ts` cases in this worktree. Both source and test are
byte-identical to reviewed upstream; see `updater-baseline-finding.json` and original
`web-unit-all.log` / `electron-unit-all.log` (not the candidate rerun logs).
`normalizeDiagnostic` includes Error.stack; the network regexp searches this
full diagnostic. A stack frame in `shared-network-workspaces/.../appUpdateErrorClassifier`
therefore satisfies `network.*error` and changes non-network error categories.

## Candidate only

`updater-candidate-not-applied.patch` contains the small diagnostic experiment:
classify Error instances by code/message/fallback, preserve full stack for logs,
and add an explicit misleading-stack-path regression. The candidate was tested
in the working tree after the authoritative complete suites failed. Its results
are separately recorded in `expanded-rerun-result.json`; they must NOT be treated
as validation of the final NFS source because this candidate is not included.

Any eventual fix needs its own approved scope, tests for relevant Error/non-Error
forms, and review of diagnostic-only vs classification fields. No automatic
application of this patch is requested.

## Scope decision

The implementation skill's Scope Guardrail and TESTING.md rule9's separate
product-change follow-up provision apply. This changes an unrelated
updater's production semantics and is not required to implement NFS; it is kept
as a follow-up rather than silently growing the ticket. The earlier intent to fix
it during this round is superseded by this disposition. Complete frontend and
Electron suites remain **non-green for this known baseline finding**; no test was
skipped or weakened to manufacture an all-green handoff.


Final disposition: candidate Nuxt612/4,262 and Electron36/192 passed, with existing
skips retained; see separate receipts. `updater-candidate-disposition.json` confirms
restoration of both files to reviewed bytes. Current-source Electron reproduces
the same three failures. This is a demonstrated follow-up, not an included fix.
The evidence patch uses zero context; no automatic application is requested.
