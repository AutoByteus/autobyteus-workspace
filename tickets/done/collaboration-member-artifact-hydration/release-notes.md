# Release Notes — Team and Agent Org member Artifacts after reload

## Fixed

- **Team and Agent Org members now show their full Artifacts list after a page reload and on historical runs.** Before this fix, a member's Artifacts tab could be empty ("No touched files yet") after a reload or when opening a past run, even though the member had produced files. Members now load their artifacts together with their conversation and activity, just like standalone agents. This includes members of nested Teams inside an Org. Files arriving live during the run are not duplicated or lost.
