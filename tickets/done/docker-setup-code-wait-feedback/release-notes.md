## Fixes

- **`autobyteus-docker setup-code` no longer looks stuck.** It now says what it is doing: checking the node's image (with Docker's own download progress), recreating the node's container when a newer image or a new launcher configuration needs it (its data is kept), or starting a stopped one. While the node is still starting it prints "Waiting for <node> to start (up to 90 seconds)..." and then the elapsed time every 10 seconds. Previously it printed nothing for the whole download, recreate and start. The messages go to standard error, so the setup code lines are still the only standard output, and the code never appears in a message. The Windows PowerShell launcher behaves the same.
- **`new-container` shows the same waiting message** before it prints the node's first setup code.
- **A node that stops answering can no longer hang the command.** One request to the node now gives up after 5 seconds and the wait continues, and the whole wait ends after 90 seconds with the node's name, the last error and the `autobyteus-docker logs` command to look at.

## What you need to do

- **Docker node owners:** to get the new launcher, run the launcher's install command again (`curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install`, or the Windows PowerShell command in the Docker README). Your nodes, their data and their setup codes are not touched, and no stored data changes.
