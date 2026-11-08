## What you need to do

- **Update your nodes to this version.** The security changes below take effect on a node only when it runs this version. For Docker nodes on the beta track, run `autobyteus-docker update --all`. The desktop's own node updates with the desktop.
- **Nodes now check the name each request is addressed to.** If you reach a node through a public domain name it cannot recognise, add that name to the node setting `AUTOBYTEUS_ALLOWED_HOSTS` (in the node's environment or `.env`, then restart the node). This applies to a reverse proxy that keeps a company domain, a peer node or desktop entry added by a DNS name, and a Docker node addressed by a dotted service name. The setting takes a comma-separated list; an entry such as `.example.com` covers every name under it. Until the name is added, requests get `403 REMOTE_ACCESS_HOST_REFUSED`, and the node log names the refused host. Nothing is needed for IP addresses, `localhost`, `.local`, `.lan`, `.home.arpa`, `.internal`, dotless and `*.ts.net` (Tailscale) names, the address in `AUTOBYTEUS_SERVER_HOST`, or paired phones.
- **Pages served from another localhost port are no longer trusted by a node.** If one of your own tools calls a node from a local web page (for example `http://localhost:5173`), add its exact origin to `AUTOBYTEUS_ALLOWED_ORIGINS`. The desktop app, the phone shell and the in-app browser's own pages need nothing.

**Full Changelog**: https://github.com/AutoByteus/autobyteus-workspace/compare/v1.5.12-beta.7...v1.5.12-beta.8

**Full Changelog**: https://github.com/AutoByteus/autobyteus-workspace/compare/v1.5.12-beta.7...v1.5.12-beta.8

