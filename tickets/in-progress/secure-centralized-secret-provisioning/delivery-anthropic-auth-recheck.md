# Delivery Anthropic Authentication Recheck

## Scope

- Dependency: `EXT-ANTHROPIC-AGENT-SDK-AUTH`
- Recheck date: 2026-07-21
- Purpose: delivery/release risk recheck for the approved exact Claude
  `cli` / `managed-secret` behavior. This record is not legal clearance.
- Implemented path in scope: local/self-hosted AutoByteus reuses pre-existing
  node-local Claude account state in `cli` mode, provides no Claude login UI,
  authentication broker, pooled account, or hosted credential relay, and uses
  the centrally managed Anthropic API key only in explicit `managed-secret`
  mode.

## Official Sources Rechecked

1. [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
   - The page is dated June 16, 2026 and retains the June 15 pause notice.
   - It says the planned credit change is paused and, for now, Agent SDK,
     `claude -p`, and third-party app usage still draw from subscription usage
     limits.
2. [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
   - The setup path directs developers to API-key or supported cloud-provider
     authentication.
   - It retains the warning that, unless previously approved, third-party
     developers may not offer Claude.ai login or subscription rate limits for
     their products.
3. [Claude Code legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)
   - It describes subscription OAuth as intended for subscribers' ordinary use
     of native Anthropic applications.
   - It says developers building products/services, including Agent SDK
     integrations, should use API-key authentication and may not offer
     Claude.ai login or route Free/Pro/Max credentials on behalf of users.
4. [Log in to your Claude account](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account)
   - It calls API-key authentication the preferred third-party route.
   - It also says Anthropic may, at its discretion, allow paid subscribers with
     usage credits to use certain third-party tools, while prohibiting identity
     misrepresentation or routing third-party traffic against subscription
     limits.

## Delivery Decision

- Result: `Maintained external dependency; no silent mode change`.
- The official set remains materially inconsistent for the exact
  local/self-hosted, no-login-broker path. The June 15–16 update and account
  page still acknowledge some third-party subscription-authenticated usage,
  while the SDK and legal pages direct product developers to API keys and
  prohibit offering login or routing subscription credentials on behalf of
  users.
- This recheck does not establish permission, but it also does not provide a
  new unambiguous prohibition targeted to the exact implemented self-hosted
  path. The reviewed `cli` and `managed-secret` modes therefore remain
  unchanged for the user-verification candidate.
- Before an eventual release, repeat this recheck if finalization occurs on a
  later date or any source changes. If authoritative guidance unambiguously
  forbids the exact path, stop release and return the behavior decision through
  `solution_designer`; do not convert, remove, or fall back between modes during
  delivery.
