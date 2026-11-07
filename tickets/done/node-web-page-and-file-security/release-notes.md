## What you need to do

- **Nodes now check the name each request is addressed to.** If you reach a node through a public domain name it cannot recognise, add that name to the node setting `AUTOBYTEUS_ALLOWED_HOSTS` (in the node's environment or `.env`, then restart the node). This applies to a reverse proxy that keeps a company domain, a peer node or desktop entry added by a DNS name, and a Docker node addressed by a dotted service name. The setting takes a comma-separated list; an entry such as `.example.com` covers every name under it. Until the name is added, requests get `403 REMOTE_ACCESS_HOST_REFUSED`, and the node log names the refused host. Nothing is needed for IP addresses, `localhost`, `.local`, `.lan`, `.home.arpa`, `.internal`, dotless and `*.ts.net` (Tailscale) names, the address in `AUTOBYTEUS_SERVER_HOST`, or paired phones.
- **Pages served from another localhost port are no longer trusted by a node.** If one of your own tools calls a node from a local web page (for example `http://localhost:5173`), add its exact origin to `AUTOBYTEUS_ALLOWED_ORIGINS`. The desktop app, the phone shell and the in-app browser's own pages need nothing.

## Improvements

- **Nodes refuse DNS-rebinding pages.** A web page that re-points its own domain at your node can no longer use the node.
- **Web pages on other local ports cannot act as the app.** For example, a dev server that an agent starts and opens in the in-app browser still loads and works with its own server, but it can no longer call the node with the app's rights. The same applies to the MCP gateway and the node's internal tool listeners.
- **Files served by a node open walled off from it.** Workspace files, uploads, attachments, run file changes and message references still display everywhere they did, PDFs included. An HTML or SVG file's scripts still run, but they can no longer act as the node.
- **Local `file://` pages in the in-app browser can no longer act as the desktop app.** The page still loads and runs; its requests to nodes are refused.

Rolling back is possible: install the previous version. No stored data changes.
