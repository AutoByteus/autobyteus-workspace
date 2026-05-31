# Backend Docker / Browser Base Update Analysis Summary

Latest recheck completed against backend `origin/personal` at `2f545609` (`v1.3.34`) and browser Docker `origin/main` at `2bc0b4a` / browser Docker `1.3.6`.

Recommendation: backend still needs an update.

Why:
- Latest `browser_docker` still requires downstream images to mount `/home/vncuser/.config/chromium` for persistent Chromium state.
- Browser Docker `1.3.6` now also adds stale Chromium profile lock cleanup, which only matters for downstream users if the profile is actually persisted.
- Latest backend `origin/personal` removed the old `mobile-safe` profile, but active backend launch surfaces still do not mount `/home/vncuser/.config/chromium`.
- Published `autobyteus/autobyteus-server:latest` / `1.3.34` does not yet include the browser Docker `1.3.6` lock-cleanup entrypoint, so it should be rebuilt/released after browser base `1.3.6`.

Recommended implementation files:
- `scripts/public/docker/autobyteus-docker.sh`
- `scripts/public/docker/autobyteus-docker.ps1`
- `scripts/tests/test_public_docker_launcher_shared_workspace.py`
- `autobyteus-server-ts/docker/docker-compose.yml`
- `docker/compose.personal-test.yml`
- `README.md`
- `autobyteus-server-ts/docker/README.md`

Recommended changes:
- Add `<node>-chromium-profile:/home/vncuser/.config/chromium` to public launcher run args.
- Add source-helper and all-in-one named Chromium profile volumes.
- Include this volume in launcher config hash and bump from `v5` to `v6`.
- Update storage output, docs, and tests.
- Rebuild/publish `autobyteus/autobyteus-server` after the backend code update so the image also picks up browser Docker `1.3.6`.

Detailed recheck report:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/latest-recheck-2026-05-30.md`
