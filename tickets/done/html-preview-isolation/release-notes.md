## What's changed

- **HTML previews run isolated.** An HTML page you preview (a workspace file in Files, an agent's artifact, a file reference, or a local file, on the desktop and on the phone app) now runs in a sealed-off sandbox. It can no longer read or control the AutoByteus window, use the app's internal functions, read the app's stored data (including a paired phone's sign-in), or use a node's terminal or API with your rights. This closes a way a malicious HTML file, for example one an agent downloaded or wrote, could take over the app or your node.
- Workspace HTML files stay isolated even when their preview address is opened outside the preview, for example in the in-app browser or a browser tab.
- Previews still render pages and run inline and regular scripts. They still load stylesheets and images, including ones next to the file in the workspace, and scripts, styles and images from other websites (such as CDN libraries).
- **What previewed pages can no longer do:**
  - load JavaScript modules from the workspace (`<script type="module">` with a relative path);
  - read workspace files with `fetch` or XHR;
  - load web fonts from the workspace;
  - start Web Workers;
  - use browser storage (`localStorage`, `sessionStorage`, IndexedDB) or cookies.

## What you need to do

- Nothing, if your HTML previews are ordinary pages.
- If you preview a page that needs one of the features above, such as a web app built with JavaScript modules, run it from a local server and open it in the in-app browser instead. For example, ask an agent to start a development server in the workspace.

## Rolling back

Rolling back is possible: this release stores no new data. Installing an earlier version removes the preview isolation.
