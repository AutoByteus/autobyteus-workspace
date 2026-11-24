## Private GitHub repositories for agent packages and skills

- You can now import a private GitHub repository as an agent package, or as a skill source, with the node's GitHub token. Paste the repository's address as for a public one. When GitHub says it cannot see the repository, the import box tells you it is private or not found and offers **Connect GitHub** right there: paste a token and Save, and the import goes on. The import areas of Agent Packages and Skill sources show a **GitHub connection** line (`GitHub · connected as @you`, or `not connected — needed only for private repositories`) with **Connect GitHub**, **Replace token** and **Disconnect**.
- Update checks and updates of a private package or skill source work like a public one, on the same schedule, including automatic updates. A package whose check cannot proceed keeps its installed content and shows the reason.
- The token is checked with GitHub when you save it, kept in this node's secret vault and never shown again. It is only ever sent to GitHub, as a request header: it does not appear in addresses, logs, errors, records or responses.
- The messages say what is wrong: not connected, GitHub rejected the token (expired or revoked: reconnect), or the token cannot read this repository (give it **Contents: Read-only** on that repository).
- A Docker node has its own connection: connect GitHub in that node's window.
- The Update checks card in Settings now says where the token goes: "No account is used. This node's GitHub token is sent only to GitHub, and only for private repositories. Nothing is sent to AutoByteus."

### Good to know

- Public repositories work as before and never use the token, so a token that was rejected cannot break them.
- Create a fine-grained token on GitHub and choose only the repositories you need, with **Repository permissions → Contents: Read-only**.
- The connection is the node's one GitHub token. It is the same token the GitHub integration uses, so agents that have the GitHub integration can read the repositories the token can read. Pick the repositories with that in mind.
- Application packages still import public repositories only.
- A package or skill source that GitHub no longer shows without the token fails with the same message as a missing repository: GitHub answers both with "not found".
