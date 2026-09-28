# Investigation Result — server-docker-preinstalled-clis

- Date 2026-09-28; SR-003; result: narrowed two-CLI requirements Ready for Approval (not implementation-ready).
- Original request: “in our server docker, we have used one browser vnc docker ... /Users/normy/autobyteus_org/browser_docker ... antigravity agy cli, grok, and zcode, dsh these cli preinstalled. please analyse.”
- Workspace / branch: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis / codex/server-docker-preinstalled-clis.
- Refreshed base: origin/personal fcdfcd2ca4200dff27ef766e477c38d0969e55f6. Candidate finalization target origin/personal; no integration/release authorized. Browser repository read-only at fb0f59372254b853e85c69046aa921f1d59d96c7.
- Approval: absent; no architecture design, classification or downstream implementation handoff. Review artifacts N/A — not applicable. Product not requested.

## Analysis and Candidate Direction
Production image owner is autobyteus-server-ts/docker/Dockerfile.monorepo, not just docker/Dockerfile.allinone. It already installs Codex and Claude; recommend extending server-specific packaging there rather than adding provider tools to generic browser base. Default/zh release workflow builds Linux amd64+arm64. Personal all-in-one/slim remote images are separate optional scope.

AGY has an official native installer (custom --dir, SHA512, Linux amd64/arm64). Grok has official native installer and scoped npm distribution with both Linux architectures. DSH official npm is 0.1.7-rc.2; supported Node floor is 22.19+ in the 22 line. ZCode has official standalone CLI source/distribution, but documented Node 24.14.0 differs from current image Node 22; an actual official hosted archive/install source is not yet verified. Do not substitute unofficial npm wrappers.

Production HOME=/root is persisted. Binaries installed under default ~/.local/bin or tool home can be masked or remain stale under reused volumes. Candidate system executable locations outside persisted home are preferable, while auth/config remain runtime state. Backend is root; VNC desktop is vncuser, with an existing browser-opening bridge. Do not confuse login identities or promise keyring persistence without testing.

On refreshed origin/personal, AGY and Grok runtime adapters exist; ZCode/DSH adapters do not. This proposed scope is preinstallation only, not new runtime integration. No Docker build, installation, login or paid model run performed. No source changed; only task analysis artifacts authored.

## Next Expected Action
User approves consolidated SR-002: preinstall only agy and grok in the production server image like existing Codex/Claude; preserve auth/state/runtime behavior and existing build-time freshness policy. No new runtime integrations. Technical Linux smoke checks and artifact selection remain later work; no build success claimed.

## Canonical Artifacts
- /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/investigation-result.md

## Primary Public Sources
- https://antigravity.google/docs/cli/install/
- https://antigravity.google/cli/install.sh
- https://docs.x.ai/build/overview
- https://registry.npmjs.org/@xai-official/grok/latest
- https://github.com/deepseek-ai/deepseek-harness
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/development.md
- https://registry.npmjs.org/@deepseek-ai/dsh/latest
- https://github.com/zai-org/ZCode/blob/main/README.en.md

## Routing
get_handoff_rules returned architecture-complete review/implementation routes and delivery-receipt-gap route. None matches this analysis/Draft requirements outcome. Return findings to user; no send_message_to required or performed.

## Current Scope Override — SR-002
The user narrowed to Antigravity/Grok and explicitly clarified preinstallation, like Codex/Claude. ZCode/DSH findings above are historical/deferred, not active requirements. No official architecture design or implementation authorized yet. Baseline Ready for Approval. Proposed boundaries: production image only, official distributions, build-time installation, existing Node/base/identity preserved, both released Linux architectures, usable with old home volumes, runtime login without baked credentials, no new adapters.

SR-002 routing: get_handoff_rules evaluated; no rule matches routine requirements approval hold. Return to user; no downstream message.

## Current Freshness Requirement — SR-003
User asks always installing latest. REQ-006/AC-006 require latest official agy/grok releases at each supported image build with cache invalidation and recorded installed versions. No fixed default version and no silent fallback after failed acquisition. Existing images require rebuild/recreation for packaged updates; no new startup updater. User preference is explicit; this build-time interpretation is being presented, not falsely recorded as whole-package approval. Requirements remain Ready for Approval; no code changed.

SR-003 routing: get_handoff_rules evaluated; no matching rule for requirements clarification. Return to user; no downstream handoff.

## Superseding Current Result — SR-004
Requirements are now Approved and design complete. Current authoritative routing/result packet: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/solution-handoff.md. Earlier pending-approval statements above are historical, not current status.
