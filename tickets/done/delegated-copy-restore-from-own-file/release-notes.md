## Improvements

- Delegated runs now always continue with the settings they started with. Before, when an Agent or Team was started from a member of a Team or Org run, it read that member's settings again every time it was reopened. Changing the member's model in a stopped run then also changed runs that had already been delegated. Now each delegated run keeps its own definition, model, model settings, workspace and auto-approve. A change to the member applies to the next delegation.
- Settings and the run view show the settings a delegated run actually uses, including its own conversation. Before, they could show the member's current settings instead. Names are unchanged.
- In a delegated Team, each member keeps its own settings and whether it follows a model chosen for the whole Team. A member with its own auto-approve but the Team's model still follows a Team-level model choice.

## Upgrade Notes

- **Back up your AutoByteus data before upgrading.** On first start, the app converts the saved files of existing delegated runs once, so that each run keeps exactly the settings it uses today. Nothing visible changes for these runs.
- A delegated run whose Team or Org member no longer exists is left unchanged on disk and is not opened. The app starts and works normally.
- Delegated runs mirrored from another node that has not been upgraded yet may be missing from that node's imported runs, or listed under "Unattributed runs" on the Memory page, until the node is upgraded and synced again. Nothing is lost.
- This release cannot be rolled back: earlier builds are not made to read the converted files. If you need to go back to an earlier version, contact support instead of installing an older build.
