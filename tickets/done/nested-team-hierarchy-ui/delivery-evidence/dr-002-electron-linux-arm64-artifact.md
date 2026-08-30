# DR-002 Electron Verification Artifact

- README-selected command: `corepack pnpm build:electron:linux:arm64`
- Host: Linux ARM64 / aarch64
- Build result: `Pass`
- Built artifact: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/autobyteus-web/electron-dist/AutoByteus_enterprise_linux-arm64-1.4.62.AppImage`
- Artifact format: ELF 64-bit ARM aarch64 AppImage
- Mode: `755`
- Size: `523499461 bytes`
- SHA-256: `120754d5cc3674c41bc1508cea0395c660b11d8591c42c1ec3729b344964f061`
- AppImage runtime inspection with the container's versioned zlib exposed under the runtime's expected unversioned name: `Version: effcebc`
- Container runtime note: Direct AppImage runtime inspection initially reported missing `libz.so`; the container provides only `libz.so.1`. The artifact runtime was inspected successfully using an owned temporary `LD_LIBRARY_PATH` symlink. This is a host prerequisite note, not a build failure.
- Build log: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/delivery-evidence/dr-002-electron-linux-arm64-build.log`
- Publication status: Local verification artifact only; not a version bump, tag, release, upload, signing, deployment, or rollout.
