## Docker nodes: update the server from the Nodes page

- **New: see and update a Docker node's server from the app.** In **Nodes → Manage Nodes**, each remote node now shows its server version. When a node is older than this app, click **Update to <version>** to bring it to the app's version. The node keeps its container: it downloads only the server, checks its signature and that it fits the image, tries the new version once, and only then restarts into it. The row shows the progress (checking, downloading, preparing, restarting) and the result.
- **Updates happen only when you click.** The app never updates a node by itself.
- **A failed update leaves the old version running.** The row says why. If a release needs a newer Docker image, the row shows the command to get it, with a Copy command button.
- **Restart note:** an update restarts the node's server. Runs that are in the middle of a turn on that node stop, as with any restart.
- **Also new in the Docker Guide:** the command `autobyteus-docker update --all` updates the server in every node.

### If a node shows "Not reachable." under its server line

Nodes on Docker images from before v1.5.11-beta.6 cannot report their server version, so their line says "Not reachable.", even though the node itself works. Bring them up to date once:

```bash
curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
autobyteus-docker upgrade --all
```

Reinstalling the launcher adds the volume that in-place updates need. `upgrade --all` moves the nodes to the newest image and keeps all your volumes and data. A node made by an older launcher that is already on a new image shows "Reinstall the launcher, then run: autobyteus-docker upgrade --all" instead of an Update button; the same two commands fix it.
