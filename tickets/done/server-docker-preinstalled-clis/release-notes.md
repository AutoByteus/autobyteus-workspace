# Release Notes — Server Docker preinstalled CLIs

Published as v1.4.91-beta.3 after user testing on 2026-09-28; all four release workflows succeeded. The beta helper uses GitHub-generated notes; these archived functional notes remain supporting context, not injected into the generated beta notes.

- Production server images now preinstall official Antigravity (`agy`) and Grok (`grok`) alongside Codex and Claude Code.
- Supported cache-busted builds resolve latest releases. Existing running images do not automatically update; rebuild/pull a newly published image and recreate, retaining volumes.
- Native executables live outside persisted `/root`; installation fails closed on missing/unusable artifacts. No credentials baked in; authenticate separately at runtime as the backend user.
- No new runtime selectors/adapters, base/Node changes, migration or volume reset. Personal images, ZCode and DSH remain out of scope.
- API validation passed default/zh × arm64/amd64 (amd64 emulated), offline clean/reused-home CLI checks, server/Chromium bridge and preservation across recreation. Latest versions remain mutable; live auth/keyring/inference, native x86 hardware, full noVNC UI and Electron were not validated.
- Delivery merged updated origin/personal and passed 19 focused checks; the four-image matrix predates that merge, with Docker packaging unchanged. No claim of a new full matrix build on the merged application state.
