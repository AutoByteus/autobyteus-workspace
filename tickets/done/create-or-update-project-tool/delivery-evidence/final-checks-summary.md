# Final Release / Cleanup Checks — DR-004

Recovery after user-reported power-off resumed only existing workflow monitoring;
no repeat merge, release/version/tag creation or duplicate dispatch.

- Desktop workflow 37412908817: completed/success at release SHA23d6c877ada66058453f3e466dd6c7d302972610.
- Android37412908744 and iOS37412908784: completed/success at same SHA; Android APK/checksum published. iOS workflow success is App Store Connect pipeline evidence, not device-install/store-rollout certification.
- Docker37412908727: completed/success, resumed watch exit0; actual Docker Hub version-tag JSON confirms amd64 and arm64.
- GitHub release: v1.4.95-beta.2, non-draft prerelease, exact target commit; 17 uploaded/nonempty assets including five desktop platform installers and Android APK/checksum.
- Downloaded four actual updater YAML assets: version matches; referenced binaries exist. Linux x64/arm64 canonical validate_linux_updater_metadata.py checks passed; merged mac metadata includes both architectures; Windows references expected .exe.
- GitHub release URL: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.95-beta.2.
- Local/remote annotated tag peeled SHA and web package version agree. Final metadata-only receipt commit will advance personal, not mutate this immutable release tag.
- Original ticket worktree contained no tracked edits/unexpected untracked files, only generated SDK dist. Candidate reachable from fetched origin/personal was proven before removal. Exact ticket worktree removed, worktree prune completed, local ticket branch removed in shared repo and target clone. Remote ticket branch retained (Not required to delete).
- Preview stop/list receipt: exact instance absent, both ports released; retained private --keep data not deleted. Unrelated instances/user app/data left untouched.
- Durable clean personal clone remains for authoritative archive, separate from dirty shared personal checkout. No unrelated checkout changes staged/reset/stashed.

Evidence: beta-workflow-final.json, beta-release-final.json,
all-release-workflows-final.json, android-workflow-final.json,
ios-workflow-final.json, docker-workflow-final.json, docker-version-tag.json,
updater-metadata/*.yml and cleanup-receipt.json. Original integrated 195-test
and initial-failure logs remain. Scope does not certify new live-model, desktop
installation or device updates; known generic TS6059 limitation unchanged.
