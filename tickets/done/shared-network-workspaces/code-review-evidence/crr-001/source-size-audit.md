# CRR-001 independent source-size audit

Basis `65b0e6e57a0f93d8343ccbefc1b5227642d7e557`. 139 changed non-ticket paths independently hash-matched; 99 implementation source files counted. Tests, fixtures, evidence, documentation, manifests and generated output are excluded from implementation thresholds.

| Source file | Before | After | Delta | >500 | >220 delta | SoC / placement | Classification / action |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `autobyteus-nfs/cmd/autobyteus-nfs/main.go` | 0 | 22 | +22 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/backend/apple.go` | 0 | 140 | +140 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/backend/apple_apply.go` | 0 | 129 | +129 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/backend/ganesha.go` | 0 | 54 | +54 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/backend/ganesha_native.go` | 0 | 133 | +133 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/backend/ubuntu_packages.go` | 0 | 111 | +111 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/cli/inputs.go` | 0 | 162 | +162 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/cli/install.go` | 0 | 123 | +123 | Pass | Pass | Pass — owned service package | Local Fix — CR-001 mode correction (not size) |
| `autobyteus-nfs/internal/cli/interactive-setup.go` | 0 | 92 | +92 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/cli/launcher.go` | 0 | 43 | +43 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/cli/run.go` | 0 | 190 | +190 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/cli/terminal.go` | 0 | 50 | +50 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/cli/verify-release.go` | 0 | 36 | +36 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/config/connection.go` | 0 | 138 | +138 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/config/source-marker.go` | 0 | 38 | +38 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/config/state.go` | 0 | 85 | +85 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/config/store.go` | 0 | 124 | +124 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/attachment.go` | 0 | 106 | +106 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/client.go` | 0 | 136 | +136 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/engine.go` | 0 | 140 | +140 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/exec.go` | 0 | 80 | +80 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/ownership.go` | 0 | 19 | +19 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/probe_cleanup.go` | 0 | 48 | +48 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/recovery.go` | 0 | 87 | +87 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/recreate.go` | 0 | 195 | +195 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/docker/snapshot.go` | 0 | 213 | +213 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/commands.go` | 0 | 78 | +78 | Pass | Pass | Pass — owned service package | Local Fix — CR-001 mode correction (not size) |
| `autobyteus-nfs/internal/platform/filesystem_darwin.go` | 0 | 22 | +22 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/filesystem_linux.go` | 0 | 35 | +35 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/handle_syscalls_linux_amd64.go` | 0 | 4 | +4 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/handle_syscalls_linux_arm64.go` | 0 | 4 | +4 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/handles_darwin.go` | 0 | 3 | +3 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/handles_linux.go` | 0 | 49 | +49 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/jobs.go` | 0 | 110 | +110 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/lock.go` | 0 | 21 | +21 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/mount-observation.go` | 0 | 106 | +106 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/mounts.go` | 0 | 156 | +156 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/platform/source.go` | 0 | 59 | +59 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/service/probe.go` | 0 | 155 | +155 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/service/supervisor.go` | 0 | 28 | +28 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/setup/apply.go` | 0 | 185 | +185 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/setup/detach_nodes.go` | 0 | 79 | +79 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/setup/lifecycle.go` | 0 | 143 | +143 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/setup/pending.go` | 0 | 104 | +104 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/setup/plan.go` | 0 | 187 | +187 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/setup/service.go` | 0 | 46 | +46 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/internal/setup/status.go` | 0 | 91 | +91 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-nfs/packaging/release.py` | 0 | 70 | +70 | Pass | Pass | Pass — owned service package | None |
| `autobyteus-server-ts/src/agent-execution/backends/acp/acp-private-skill-adapter.ts` | 0 | 9 | +9 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | 225 | 243 | +18 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | 133 | 137 | +4 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | 144 | 144 | +0 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 470 | 473 | +3 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/native-shared-workspace.ts` | 0 | 12 | +12 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | 58 | 63 | +5 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-context.ts` | 38 | 42 | +4 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | 121 | 129 | +8 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-resolver.ts` | 42 | 45 | +3 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-cleanup.ts` | 41 | 47 | +6 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-query-options.ts` | 50 | 56 | +6 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts` | 57 | 62 | +5 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-context.ts` | 32 | 36 | +4 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | 394 | 401 | +7 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-resolver.ts` | 41 | 44 | +3 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-private-skill-discovery.ts` | 0 | 25 | +25 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | 233 | 240 | +7 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/grok/grok-build-agent-run-backend-factory.ts` | 25 | 27 | +2 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/grok/grok-private-skills.ts` | 0 | 26 | +26 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/provider-preparation-guard.ts` | 8 | 10 | +2 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/shared/prepare-private-runtime-skills.ts` | 0 | 38 | +38 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/backends/shared/runtime-skill-profile.ts` | 0 | 130 | +130 | Pass | Pass | Pass — runtime-specific lifecycle/bootstrap | None |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | 344 | 350 | +6 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/agent-execution/services/shared-run-workspace-admission.ts` | 0 | 14 | +14 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/runtime-management/acp/acp-client-connection.ts` | 220 | 223 | +3 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-private-skill-discovery.ts` | 0 | 8 | +8 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | 460 | 466 | +6 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | 108 | 114 | +6 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/runtime-management/shared/scoped-project-git-environment.ts` | 0 | 11 | +11 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | 128 | 132 | +4 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/workspaces/shared-workspace-binding.ts` | 0 | 74 | +74 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-server-ts/src/workspaces/shared-workspace-mount-observation.ts` | 0 | 44 | +44 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-ts/src/tools/terminal/background-process-context.ts` | 22 | 24 | +2 | Pass | Pass | Pass — terminal execution | None |
| `autobyteus-ts/src/tools/terminal/direct-shell-session.ts` | 208 | 208 | +0 | Pass | Pass | Pass — terminal execution | None |
| `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts` | 345 | 345 | +0 | Pass | Pass | Pass — terminal execution | None |
| `autobyteus-ts/src/tools/terminal/pty-session.ts` | 253 | 253 | +0 | Pass | Pass | Pass — terminal execution | None |
| `autobyteus-ts/src/tools/terminal/terminal-child-environment.ts` | 0 | 8 | +8 | Pass | Pass | Pass — terminal execution | None |
| `autobyteus-ts/src/tools/terminal/terminal-session.ts` | 10 | 10 | +0 | Pass | Pass | Pass — terminal execution | None |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | 65 | 67 | +2 | Pass | Pass | Pass — terminal execution | None |
| `autobyteus-web/components/settings/NfsGuideCard.vue` | 0 | 74 | +74 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-web/components/settings/NodeManager.vue` | 325 | 332 | +7 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-web/components/settings/NodeManagerTabs.vue` | 42 | 54 | +12 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-web/localization/messages/en/settings.ts` | 400 | 427 | +27 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | 400 | 427 | +27 | Pass | Pass | Pass — owning feature/module | None |
| `autobyteus-web/utils/nfsLauncherCommands.ts` | 0 | 23 | +23 | Pass | Pass | Pass — owning feature/module | None |
| `scripts/public/docker/autobyteus-docker.d/bash/container-config.sh` | 0 | 54 | +54 | Pass | Pass | Pass — launcher configuration/lifecycle | None |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | 497 | 450 | -47 | Pass | Pass | Pass — launcher configuration/lifecycle | None |
| `scripts/public/docker/autobyteus-docker.d/bash/nfs-attachment.sh` | 0 | 35 | +35 | Pass | Pass | Pass — launcher configuration/lifecycle | None |
| `scripts/public/docker/autobyteus-docker.sh` | 236 | 242 | +6 | Pass | Pass | Pass — launcher configuration/lifecycle | None |
| `scripts/public/nfs/install.sh` | 0 | 45 | +45 | Pass | Pass | Pass — owning feature/module | Local Fix — CR-001 mode correction (not size) |

All >220 total-size files were responsibility-reviewed, in addition to the >220 delta gate. Runtime factory/session code remains in its runtime owner; shared profile policy is separated from discovery/process lifetime. Launcher runtime delegates container configuration and NFS attach policy instead of growing the earlier file. No changed source exceeds 500 nonempty lines; no source delta exceeds 220. Counts do not replace the structural review in the canonical report.
