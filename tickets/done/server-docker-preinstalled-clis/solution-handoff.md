# Solution Handoff — Architecture Design Complete

- Package server-docker-preinstalled-clis; revision SR-004; status Architecture Design Complete.
- task_size=Small; architectural_risk=Low; design Ready. Classification evidence: three local files within existing packaging ownership, no runtime adapter/schema/auth/identity/Node/base/topology changes. Escalate on changed platform/dependency/security/auth boundary.
- Original request analysed agy/grok/zcode/dsh; user narrowed to agy/grok and clarified preinstall like Codex/Claude, latest versions at image build. Final explicit approval: “yesss. i know. currently the behavior for codex and claude code is the same experience i want to have for antigravity and grok”; then “continue”. Approval applies to SR-003 behavior, captured SR-004. No behavior supplements.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis; branch codex/server-docker-preinstalled-clis. Refreshed base origin/personal fcdfcd2ca4200dff27ef766e477c38d0969e55f6; target origin/personal. Shared checkout/browser base untouched. No implementation/release performed or push authorized.

## Required Outcome
Preinstall latest official agy/grok in production Dockerfile.monorepo alongside Codex/Claude. Same existing cache-busted scripted/release build experience, no startup updater. Preserve root HOME/state mounts/browser bridge, Node and base, existing runtime integration behavior, both Linux architectures and default/zh variants. Defer ZCode/DSH and personal-stack parity. REQ/AC-001–006, SCN/BEH-001–004 are authoritative.

## Technical Design and Evidence
Use global npm @xai-official/grok@latest and official https://antigravity.google/cli/install.sh with fresh scratch target then publish /usr/local/bin/agy. Existing CLI_INSTALL_CACHE_BUSTER must govern both. Grok postinstall writes home state AND creates native global entry: isolate build-only GROK_HOME, require native global resolution after scratch cleanup, never persist override. AGY setup can swallow failures: explicit executable/nonempty version checks required. No home-preferring runtime wrapper. Source probes in E-013–017; no Linux execution claimed.

## Constraints / Risks / Validation
Latest may drift; fail/report incompatibility rather than silently pin/fallback. No root-volume deletion, runtime schema change or credential copy. Keep auth after startup; AGY keyring behavior is not proven by packaging. Require source regression plus real image/native path/version checks, both architectures/variants and reused disposable root-home fixture. Build-time checks must not authenticate or invoke inference. Use safe isolated backend data for any integrated checks.

## Canonical Package
- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/requirements-doc.md (Approved SR-004).
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/investigation-notes.md (cumulative E-001–017).
- Design: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/design-spec.md (Ready; exact files, sequence, validation, risk).
- History: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/solution-revision-record.md (SR-001–004).
- Earlier analysis/context: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/investigation-result.md (historical; superseded status by this handoff).
- Current result: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/solution-handoff.md.
- Product UI/UX and independent review artifacts: N/A — not applicable. No previous review pass asserted.

## Expected Next Action
Implementation Engineer implements completed design in isolated task worktree, runs implementation checks, then routes according to configured result rules for executable validation/delivery. Do not treat source investigation as passing builds. No further user scope approval is needed for this unchanged basis.

## Routing
get_handoff_rules matched Architecture Design Complete + Small/Low. Selected exact recipient /implementation_engineer (direct implementation, independent architecture review N/A). Approved requirements, investigation, design, history and historical analysis included. Sending current packet via send_message_to; dispatch confirmation belongs to tool result.
