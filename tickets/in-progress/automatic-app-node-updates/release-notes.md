## Release notes: update the app and Docker nodes automatically

(For the release that includes this change. User-facing. No user action is needed, so there is no "What you need to do" section: both switches are off until you turn them on.)

### Update the app automatically

- **Notifications → Software update** and **Settings → Updates** have a new **Update automatically** switch for the desktop app. It is off by default.
- With it on, a new version on your update channel (stable, or beta if you receive beta updates) downloads by itself. As soon as it is ready, it installs and the app restarts, with no click.
- On macOS, the system updater first prepares its own copy of the update. This takes about half a minute, or longer when the computer is busy. The app and its agents keep working until then.
- Agents that were in the middle of a task continue after the restart, each told once that the app restarted.
- After the restart, the update shows as **Updated automatically to <version>** until you have seen it.
- If an automatic update fails, nothing is changed and the app keeps running on its version. You see **Automatic update failed. Nothing was changed.** with a plain reason. A failed download is tried again at the next check. A version that failed to install is not tried again automatically, but you can still install it yourself, and a newer version is tried as usual.

### Update Docker nodes automatically

- Each Docker node in **Nodes** has an **Update automatically** switch. It is off by default.
- With it on, the desktop updates the node to the desktop's own version whenever the node is older, using the node's in-place update, which is signed, checked and rolled back on failure. A node never moves ahead of the desktop. A node updates only while a desktop that manages it is running.
- The node's row then shows **Updated automatically to <version>**. A failed update shows the node's reason and is not tried again for that version. A node that cannot be reached is tried again later.

### Rolling back

- No data migration. The switches are stored on the desktop only. Earlier versions ignore them.
