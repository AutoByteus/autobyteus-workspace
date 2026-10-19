# Released run-package shapes (frozen)

Verbatim copies, as of `origin/personal@f2924a2b0`, of the Team tree v2 / Org tree v1 contracts,
the v2-era shared execution records and **strict** schemas, Team and Org task-records v1 (types,
schemas, stores), the Org state-package v1 validator and the Org execution index v1. Only import
paths were remapped.

Why they exist: current execution trees are read tolerantly (unknown fields ignored, no version
field), and the task-records runtime code is deleted. Released app-data migrations
(`20260814`, `20260819`, `20260824`, `20260901`, and the records read in `20260905`) use strict
validators as classifiers ("already current" versus "old shape") and read records files, so they
depend on these frozen copies to keep their released behavior on skip-version installs.

## Before task-agent-own-run (as of `origin/personal@66429d6f31`)

Named after the migration they precede (`20261017_task_agent_own_run_v1`; DESIGN.md rule 8). Before
it, a coordinating run's tree embeds every task agent's facts and a task agent's memory sits nested
inside its coordinating run. The current stores, readiness validator and location services compose
task agents from their own files instead, so the released migrations that still run on the old
layout read through these copies (contract §5.4):

- `released-trees-before-task-agent-own-run.ts` (+ folder): verbatim tree records, types and parsers
  (team, org, standalone) and whole-file readers of trees and message logs. Used by
  `20261015_collaborators_to_delegated_runs_v1`, `20260905_agent_org_history_first_message_summary_v1`
  and `20261017_task_agent_own_run_v1` (its source side).
- `released-root-packages-before-task-agent-own-run.ts`: today's root-package validator (nested
  owners) and the Org package catalog over it. Used by `20260926_team_context_file_execution_locators_v1`
  and `20260905_agent_org_history_first_message_summary_v1`.
- `released-memory-locations-before-task-agent-own-run.ts`: today's runtime memory location
  classifier and stored location derivation. Used by both `20260731` working-context snapshot migrations.

These modules (and `20260905` directly) keep using the current execution indexes, state-package
validators and Org history-row projector on these released trees: their results are unchanged by
task-agent-own-run and by delegated-copy-own-file-complete (which makes a copy's `source` required). The
released tree reaches them only through `asSourceIndependentIndexInput` in
`released-trees-before-task-agent-own-run.ts`, whose comment lists the calls that may be made with it; none
reads a copy's `source`. Whoever makes one of them read `source` must first freeze it for these migrations.

Current runtime code must never import this module.

## Message logs before and after append-only message logs (as of `origin/personal@65cf41c6b4`)

- `released-message-logs-before-append-only.ts`: the JSON message logs as released before
  `20261018_append_only_message_logs_v1` (one file per log with an envelope): file names, path helpers,
  envelope types, the strict envelope and seven-field message validators, and the JSON task-log merge of
  `20261017_task_agent_own_run_v1`. Every released migration that reads or writes a JSON message log
  imports it, and so does the append-only conversion (its source side).
- `released-message-log-files-from-append-only.ts`: a frozen reader of the append-only layout
  (`<base>_<6 digits>.jsonl` sealed files, then `<base>_active.jsonl`). Used by the same-ID repairs of
  the released migrations that may run after the conversion on a pending install: the message readers in
  `released-trees-before-task-agent-own-run/released-run-package-file-readers.ts` (R-A), the package
  validator in `released-root-packages-before-task-agent-own-run.ts` (R-B) and the locators-v1 message
  sources in `src/context-files/services/context-file-record-locators.ts` (R-C).

Current runtime code must never import these modules.

## Task agents' own files with `origin` (as of `origin/personal@f171032e88`)

- `released-task-agent-own-files-with-origin.ts`: the own files of delegated copies as
  `20261017_task_agent_own_run_v1` writes them: the `taskAgent` section with `origin`
  (`catalog` | `configured_place`), an agent own file whose launch is all `null` when never recorded, a
  task team member whose launch is present only when it runs on its own agent default; their readers, the
  two released writers and the own-file reads and writes under one memory root. Used by
  `20261017_task_agent_own_run_v1` (every own-file read and write) and by
  `20261019_delegated_copy_own_file_complete_v1` (its classifier of the released shape).

Current runtime code must never import this module.
