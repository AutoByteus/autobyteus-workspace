# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-003, ARCH-REV-002 | Implemented at `1b113a8313`; local checks pass; to code review |

## Revision Entries

### IR-001 — Native per-architecture Server Docker build, merge by digest, build-only mode

- Triggering role, report path, and round: `/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/design-review-report.md`, round 2 (ARCH-REV-002 Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete at commit `1b113a8313`; IMP-01..03 pass; Medium / High confirmed
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation of the reviewed design
- Approved behavior or requirement IDs affected: BEH-001..008; REQ-001..009
- Implementation delta: `build-and-push` replaced by the `build` matrix (native runners, push by digest, digest artifact) and `publish-image` (dry-run index check before any push, tags push, `version_tag` check, checked-digest outputs, summary, `Move beta tag` with its own treeless checkout); `publish-server-package` extracts from `needs.publish-image.outputs`, checks the arch, signs under the package's own version in build-only, waits 60 min and uploads only when publishing; new `build_only` input with its own concurrency group; QEMU, GHA cache, duplicate zh step and unconditional disk cleanup removed. Deviations recorded in the handoff: per-architecture digest file names inside the artifacts (merge-multiple), summaries via `env:`.
- Changed files or areas: `.github/workflows/release-server-docker.yml`; `scripts/tests/test_release_channel_workflow_steps.py`, `test_server_package_release.py`, `test_server_docker_cli_latest_defaults.py`, `test_docker_build_context_sources.py`; `RELEASE.md`; `autobyteus-server-ts/docker/README.md`
- Local validation and result: IMP-01 (73 tests OK), IMP-02 (actionlint exit 0), IMP-03 (five workflow mutations each fail the tests)
- Next recipient or routing: `/code_reviewer` (High risk)
- Remaining limitations or risks: U-001 (native arm64 time, dry-run output shape) until the build-only run; R-001, R-002 accepted; build-only without `release_ref` builds the branch by name
