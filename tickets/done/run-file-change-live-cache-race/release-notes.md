## Fixes

- Files written by a running agent no longer go missing from its Artifacts list. Before, if the list loaded at the moment the agent recorded its first file, that file could stay missing, and opening it said the file was not found. This affected standalone runs, team and org members, and delegated copies.
- Files that went missing in earlier versions cannot be restored, because the app no longer has a record of them. Files written from this version on are kept.

## Upgrade Notes

- No data changes. Rolling back to an earlier version is possible.
