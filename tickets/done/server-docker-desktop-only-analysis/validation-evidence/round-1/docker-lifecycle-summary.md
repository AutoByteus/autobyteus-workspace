# Docker Lifecycle Validation Summary

- Run ID: 1780117585-24214
- Validation time UTC: 2026-05-30T05:07:17Z
- Isolated Docker daemon: Docker-in-Docker container autobyteus-validation-dind-1780117585-24214
- Inner Docker host: tcp://127.0.0.1:57008
- Launcher: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/scripts/public/docker/autobyteus-docker.sh
- State dir: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1/dind-host-1780117585-24214/state
- Evidence log: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1/docker-lifecycle-validation.log

## Scenarios

1. Profile option rejection: PASS
2. New container normal run shape: PASS
3. URLs/status/storage/logs reporting: PASS
4. Workspace apply --all recreation with changed shared workspace root: PASS
5. Upgrade --all image-change lifecycle: PASS
6. Reset lifecycle: PASS
7. Old v4/profile-managed state/container normalization: PASS

The Docker-in-Docker daemon and validation containers were removed during cleanup. Inspect JSON and command output files remain in this directory.
