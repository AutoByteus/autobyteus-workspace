## Improvements

- Opening the files of a team member, an org member or a delegated copy in the Artifacts tab (desktop and mobile) is now fast. Before, it could take one to two seconds on machines with many saved runs. The app now reads only the run the agent belongs to, so the time no longer grows with the number of saved runs.
- Files written by a team's or an org's task agents now open in the Artifacts tab like other members' files.
- While a team or org run is still running, a member's Artifacts list shows files that are still being written, and opening one says it is not ready yet.

## Upgrade Notes

- The desktop app updates its built-in server together with the app. If you connect the app to a separately run server, such as the Docker server, update both to this version. An older app connected to a newer server shows no files for team, org or copy members.
- No data changes. Rolling back to an earlier version is possible.
