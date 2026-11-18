## Improvements

- A run whose saved model its runtime no longer offers is now refused when it starts, with a message that names the model and says what to do, instead of failing later. Settings marks each team member whose saved model is affected, so you can pick another one.
- Refusal messages, for example when a delegation or a model is not available, now say what happened, why, and what to do next.
- A team's token total now counts only that team's runs.
- Files attached to a delegated run's messages now belong to that run itself, so they keep opening wherever the run is shown.

## Upgrade Notes

- On first start, the app converts the stored links of files attached to delegated runs, once. Before it rewrites a file it keeps a copy under the app data folder (`app-data-migration-backups`). On a large data folder this takes about half a minute; later starts are not slowed.
- Going back to the previous release (1.5.13) after this update is possible: it reads the converted links.
