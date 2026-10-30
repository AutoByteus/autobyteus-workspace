## Docker nodes: update the server in place

- **New: update a Docker node's server without a new image.** Run `autobyteus-docker update` (one node), `autobyteus-docker update --all` (every node), or add `--version <version>` for an exact release. The node downloads only the server (about 0.3 GB instead of about 1.4 GB for a new image) and keeps its container. It checks the AutoByteus signature and that the server fits the image, tries the new version once, and only then switches to it.
- **Failed updates leave the old version running.** A refused or failed update changes nothing. If the new version does not come up after the switch, the node goes back to the old version, on its data as it was before the update.
- **`autobyteus-docker status`** now shows the server version each node runs, an update in progress, and why a node cannot update in place.
- **Each release publishes signed server packages** for Linux x64 and arm64 next to the other downloads.
- **Older images do not start an older server over newer data.** If you move a node to an image older than a version it already ran, it starts no server. Instead it names the image to use, which you can see with `docker exec <container> node /opt/autobyteus/starter/cli.mjs status`.

### Action needed for Docker launcher users

Once, reinstall the launcher and recreate your nodes:

```bash
curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
autobyteus-docker upgrade --all
```

Nodes created by an older launcher have no volume for installed servers. Until you do this, they refuse `update` with `NO_PACKAGES_VOLUME` and say why. `upgrade --all` keeps all your existing volumes and data.

### Notes

- In-place updates start from this release: the first update by command is to the next release after it.
- Agent CLIs inside a Docker node stay at the image's versions until you move it to a new image with `autobyteus-docker upgrade --all`.
