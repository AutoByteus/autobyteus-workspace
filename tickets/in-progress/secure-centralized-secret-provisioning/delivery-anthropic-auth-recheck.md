# Delivery Anthropic Authentication Recheck

## Scope

- Dependency: `EXT-ANTHROPIC-AGENT-SDK-AUTH`
- Recheck date: 2026-07-27
- Candidate: Round 22 reviewed/executed product HEAD
  `49c27b2fe3aeb8b8299759c6ae64f7ffddc09254`; delivery integrated checkpoint
  `57863a7005d13a0f5b68fa330b7f9c3ce5ce1dd7`.
- Purpose: mandatory delivery/release risk recheck for the preserved exact
  Claude `auto|cli|api-key` selector, with `cli` as the default. This record is
  not legal clearance and does not authorize an authentication redesign.
- Implemented boundary: `auto` and `cli` retain established local caller
  environment and Claude account/configuration behavior without a vault lookup.
  Only explicit `api-key` resolves
  `agentRuntime/claude_agent_sdk/apiKey` from the Anthropic vault slot
  immediately before launch and replaces `ANTHROPIC_API_KEY` in the otherwise
  established environment. AutoByteus adds no Claude login UI, authentication
  broker, pooled account, credential relay, or hosted subscription traffic.

## Official Sources Rechecked

All four approved official sources were fetched again during Round 22 delivery:

1. [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
   - The page is dated June 16, 2026 and still carries the June 15 pause notice.
   - The active notice says the proposed change is paused and that Agent SDK,
     `claude -p`, and third-party app usage still draw from subscription usage
     limits for now. The remainder is marked as preserved historical material.
2. [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
   - The setup path directs developers to an Anthropic API key or supported
     cloud-provider authentication.
   - Unless previously approved, third-party developers may not offer
     Claude.ai login/rate limits and should use the documented API-key methods.
3. [Claude Code legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)
   - OAuth is described for subscribers' ordinary use of Claude Code and native
     Anthropic applications.
   - Product and Agent SDK developers are directed to API keys or supported
     cloud providers and may not offer Claude.ai login or route Free/Pro/Max
     credentials on behalf of users.
4. [Log in to your Claude account](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account)
   - API-key authentication remains the preferred third-party path, and the
     developer section directs products/tools for others to that path.
   - Anthropic may discretionarily allow some paid subscribers with usage
     credits to use certain third-party tools, while prohibiting identity
     misrepresentation and attempts to route third-party traffic against
     subscription limits.

## Delivery Decision

- Result: `Maintained external dependency; no silent mode change`.
- The material guidance remains tensioned but unchanged for this delivery
  decision: API-key or a supported cloud provider is the directed product path;
  third parties must not offer or relay Claude.ai login; and the separate June
  16 pause notice currently says Agent SDK/third-party usage can still draw from
  a subscriber's limits.
- Preserve the reviewed selector exactly: `auto|cli|api-key`, default `cli`,
  vault resolution only for explicit `api-key`. Delivery did not add a fallback,
  login surface, identity impersonation, hosted relay, credential pooling, or a
  claim that `auto`/`cli` is permitted for every deployment model.
- This recheck does not establish permission, legal clearance, or safe-harbor
  interpretation for the local/self-hosted continuity path. Deployers remain
  responsible for applicable Anthropic terms and guidance.
- Repeat before a later release if an official source changes. If authoritative
  guidance unambiguously prohibits the approved path, stop release and route
  the behavior decision to `solution_designer`; delivery must not redesign the
  modes independently.
