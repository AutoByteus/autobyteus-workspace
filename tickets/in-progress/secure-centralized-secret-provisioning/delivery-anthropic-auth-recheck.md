# Delivery Anthropic Authentication Recheck

## Scope

- Dependency: `EXT-ANTHROPIC-AGENT-SDK-AUTH`
- Recheck date: 2026-07-27
- Candidate: Round 17 at reviewed implementation HEAD
  `dd1d37f90d00331d427bad1b36e4401a3a733038`; local delivery checkpoint
  `3877b39bdcad2e8c88bb9f86d190308aaf034829`.
- Purpose: delivery/release risk recheck for the approved exact Claude `cli` /
  `managed-secret` behavior. This record is not legal clearance.
- Implemented path: local/self-hosted AutoByteus reuses pre-existing node-local
  Claude account state in `cli` mode and provides no Claude login UI,
  authentication broker, pooled account, credential relay, or account sharing.
  Explicit `managed-secret` mode uses the centrally managed Anthropic API key
  only for the exact SDK child.

## Official Sources Rechecked

1. [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
   - The page remains dated June 16, 2026 and retains the June 15 pause notice.
   - The active notice says the proposed change is paused and, for now, Agent
     SDK, `claude -p`, and third-party app usage still draw from subscription
     usage limits. The remainder is explicitly retained historical material.
2. [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
   - The setup path directs developers to an API key or supported cloud-provider
     authentication.
   - It states that, unless previously approved, third-party developers may not
     offer Claude.ai login or rate limits and should use the documented API-key
     methods.
3. [Claude Code legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)
   - OAuth is described as intended for subscribers' ordinary use of Claude
     Code and other native Anthropic applications.
   - Product/Agent SDK developers are directed to API keys or supported cloud
     providers and may not offer Claude.ai login or route Free/Pro/Max
     credentials on behalf of users.
4. [Log in to your Claude account](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account)
   - API-key authentication remains the preferred third-party path, and the
     developer section directs products/tools for others to that path.
   - The page also says Anthropic may allow some paid subscribers with usage
     credits to use certain third-party tools, while prohibiting identity
     misrepresentation and attempts to route third-party traffic against
     subscription limits.

## Delivery Decision

- Result: `Maintained external dependency; no silent mode change`.
- All four official pages were fetched again on 2026-07-27. Their material
  guidance is unchanged from the reviewed dependency: API-key/cloud-provider
  authentication is the directed product path and third parties must not offer
  or relay Claude.ai login; the separate June 16 pause notice still states that
  third-party Agent SDK usage presently draws from subscription usage limits.
- This recheck does not establish permission, legal clearance, or a safe-harbor
  interpretation for the approved local/self-hosted no-login-broker path. The
  official pages remain sufficiently tensioned that delivery must preserve the
  reviewed external dependency rather than invent a conclusion.
- The reviewed `cli` and `managed-secret` modes and external Codex behavior
  remain unchanged. No delivery code, credential fallback, authentication UI,
  pooled account, or hosted relay was added.
- Repeat the recheck if finalization/release occurs later or an official source
  changes. If authoritative guidance unambiguously prohibits the exact path,
  stop release and route the behavior decision through `solution_designer`;
  delivery must not remove, convert, or fall back between modes on its own.
