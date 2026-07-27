# Delivery Anthropic Authentication Recheck

## Scope

- Dependency: `EXT-ANTHROPIC-AGENT-SDK-AUTH`
- Recheck date: 2026-07-27
- Candidate: Round 16 at final HEAD
  `53dd05ecaac6e3196497597cceba0799f8093aba`
- Purpose: delivery/release risk recheck for the approved exact Claude `cli` /
  `managed-secret` behavior. This record is not legal clearance.
- Implemented path: local/self-hosted AutoByteus reuses pre-existing node-local
  Claude account state in `cli` mode and provides no Claude login UI,
  authentication broker, pooled account, or hosted credential relay. Explicit
  `managed-secret` mode uses the centrally managed Anthropic API key only for
  the exact SDK child.

## Official Sources Rechecked

1. [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
   - The page remains dated June 16, 2026 and retains the June 15 pause notice.
   - It says the proposed change is paused and, for now, Agent SDK, `claude -p`,
     and third-party app usage still draw from subscription usage limits.
2. [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
   - The setup path directs developers to API-key or supported cloud-provider
     authentication.
   - It says third-party developers may not offer Claude.ai login or rate limits
     unless previously approved.
3. [Claude Code legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)
   - Subscription OAuth is described as intended for subscribers' ordinary use
     of native Anthropic applications.
   - Product developers, including Agent SDK integrations, are directed to API
     keys and may not offer Claude.ai login or route Free/Pro/Max credentials on
     behalf of users.
4. [Log in to your Claude account](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account)
   - API-key authentication remains the preferred third-party route.
   - The page also says Anthropic may allow some paid subscribers with usage
     credits to use certain third-party tools, while prohibiting identity
     misrepresentation and routing third-party traffic against subscription
     limits.

## Delivery Decision

- Result: `Maintained external dependency; no silent mode change`.
- The four official pages were fetched again on 2026-07-27. Their material
  guidance is unchanged from the reviewed dependency: product developers are
  directed to API keys and cannot offer/reroute Claude.ai login, while the June
  16 pause notice and account page still acknowledge bounded third-party
  subscription-authenticated usage.
- This recheck does not establish permission. It adds no unambiguous new
  prohibition specifically resolving the approved local/self-hosted,
  no-login-broker path beyond the ambiguity already reviewed in the solution
  package.
- The reviewed `cli` and `managed-secret` modes remain unchanged for the Round
  16 user-verification candidate. No delivery code, credential mode, fallback,
  or authentication UI changed.
- Repeat the recheck if finalization/release occurs on a later date or an
  official source changes. If authoritative guidance unambiguously prohibits
  the exact path, stop release and route the behavior decision through
  `solution_designer`; delivery must not remove, convert, or fall back between
  modes on its own.
