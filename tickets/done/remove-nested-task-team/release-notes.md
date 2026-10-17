## Improvements
- One bad saved run no longer affects the others. If a run's saved data can't be read, that run alone is left out or reports that its data can't be read. Every other run opens normally, the app still starts, and nothing on disk is changed.

## Upgrade Notes
- **Teams inside task agent teams are no longer supported.** Teams have been flat since v1.4.70: a team contains agents, and only an organization contains teams. Runs saved by v1.4.53–v1.4.69 that put a team inside a task agent team are not converted. An affected team or organization run is not shown. An affected standalone agent run stays in the list but reports that its saved data can't be read when you open it. No file is changed or deleted.
