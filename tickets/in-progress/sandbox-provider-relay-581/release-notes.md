## Sandboxes: agents can run an agent package in a disposable node, and a node can use a paired node's provider credentials

(For the release that includes this change. User-facing. No user action is needed to upgrade, so there is no "What you need to do" section.)

## What's New

- **Sandboxes.** Three new agent tools, `create_sandbox`, `run_in_sandbox` and `destroy_sandbox`, let an agent run an agent package in a fresh, disposable AutoByteus node in its own container. The sandbox runs the same release as your node, is paired with your node as a peer, and holds **no API key and no login**: its model calls go through your node, which adds the credentials. Its workspace and run-memory folders are on your computer, so the agent reads what the package wrote and the transcripts directly. A sandbox is removed when the agent destroys it, when its lifetime ends (120 minutes by default, 480 at most), or when your node starts again. Your own agents, files and settings are never inside it.
  - **To use it:** turn on Remote Collaboration in Settings, give an agent the three tools in its definition's tool list, and have Docker Desktop running on a Mac. At most four sandboxes run at once.
  - **Folders.** An agent gives a sandbox its agent packages (copied in) and, optionally, folders it may read but not change. Your home folder and folders that hold credentials are refused.
  - **A skill for it.** The public skill `autobyteus-sandboxes` (in the AutoByteus skills package) tells an agent how to create a sandbox, delegate work to it, read the results safely and always destroy it.
- **A node can send its model calls through a paired node.** A node with a relay setting (the sandbox's, or one an owner sets on a node of their own) calls Claude, Codex, Grok, DeepSeek Harness and the AutoByteus native providers through the paired node, which attaches its own API key. The relayed node holds no provider key, and its Agent Runtimes page shows each runtime as signed in or out according to what the relay offers. The paired node accepts only nodes it is paired with and writes one line per relayed call to its activity log, with no key, token or request content in it.
- **Claude and Grok login tokens through a relay (off by default).** The paired node can use a Claude `setup-token` login or its own Grok sign-in instead of an API key when its owner turns the setting on. A Grok login is read as it is and never renewed, so an expired one asks you to sign in to Grok again.
- **The Nodes page marks a sandbox.** A paired node that your node created as a sandbox shows a "sandbox" label beside its name.

## Good to know

- Sandboxes work on a Mac with Docker Desktop for now. Other computers say so and create nothing.
- A sandbox has full network access, and your node treats it as any paired node: an agent in a sandbox can message the agents your node shares with its peers. Do not point an untrusted package at them.
- Antigravity agents cannot run in a sandbox or on a relayed node. Codex works through a relay with an API key only; Codex's ChatGPT sign-in cannot be relayed. Media generation tools and integrations such as GitHub are not available in a sandbox.
- Only the agent run that created a sandbox can use or remove it. Anything it forgets is removed at its expiry or when your node starts.
- A development build has no published image to start a sandbox from and says so.
