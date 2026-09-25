# Release Notes — Memory explorer: fast team view and Agent Orgs memory

## Improvements

- **Agent Teams memory loads in about a second.** On a real library of 534 stored team runs:
  - the Agent Teams tab dropped from about 32 s to about 0.2 s;
  - opening a team dropped from over a minute to about 0.2 s.
- **Clicks respond immediately.** Selecting a card, run or member switches the view at once, shows a loading state and sends a single request. You no longer see another team's runs while the view loads.

## New

- **Agent Orgs memory tab.** Memory now has a third tab, **Agent Orgs**. It lists org definitions that have stored member memory. Open an org to browse its runs and members, then open any member in the Memory Inspector.
- **Full run structure for team and org runs.** A run's Members section now mirrors the run-history sidebar. It shows configured agents, configured teams, delegated task agents and delegated task teams, nested at any depth. Every agent run that has memory is reachable.
- **New memory sources appear without restarting.** Returning to the Memory home view refreshes the list of imported memory sources.

## Fixes

- Team member entries show the member's name again.
- A delegated task entry now opens its own memory, not the configured member's.

## Notes

- Imported (Memory Sync) sources do not include org memory yet, so the Agent Orgs tab shows its empty state for them.
