# Follow-ups — clean-runner-build-order

| ID | Found by | What is wrong, where | Evidence | Why outside this ticket | Urgent | Suggested Task | Sent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-1 | Solution Designer, notes F-09 | No workflow type-checks the web or server from a clean runner on a push or pull request; the only fresh-runner check of the gates is the build-only release run, run late (before a tag) | `.github/workflows` has only the four release workflows | The fix works without it; a new CI workflow has cost and runner-time implications | No | "Add a CI job that runs on pushes to `personal` and pull requests: checkout, `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web typecheck` and `pnpm -C autobyteus-server-ts typecheck` on one Linux runner, so a gate that reads an unbuilt package fails at merge time (DESIGN.md rule 12)." | Not yet |
