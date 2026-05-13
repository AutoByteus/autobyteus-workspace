# Requirements: Docker Guide command hotfix

Status: Design-ready

## User intent

Fix the frontend Settings → Nodes → Docker Guide page because it still advertises removed `autobyteus-docker start` and `start --new` commands after the public launcher was redesigned.

## Requirements

- Update frontend Docker Guide command definitions to match the released launcher command model:
  - `autobyteus-docker new-container`
  - `autobyteus-docker upgrade --all`
  - `autobyteus-docker destroy --all`
  - `autobyteus-docker reset`
  - keep useful informational/management commands such as `urls`, `status`, `logs`, and `stop`.
- Remove visible references to `autobyteus-docker start` and `autobyteus-docker start --new` from the frontend guide.
- Update English localization strings for titles/descriptions/next-step text.
- Update frontend tests for launcher command generation and Docker guide rendering.
- Update frontend settings documentation that lists the guide commands.
- Update adjacent server Docker README references so published docs no longer advertise removed launcher commands.
- Preserve existing install command text, with wording adjusted to “install or replace” rather than ambiguous “install or update”.

## Acceptance criteria

- Unit tests covering Docker guide commands pass.
- Source grep confirms no old public launcher references to `autobyteus-docker start`, `start --new`, or `autobyteus-docker update` remain in current user-facing docs/scripts, except negative test assertions and historical completed tickets.
- Release a hotfix version after merge.
