# Delivery Anthropic Authentication Recheck

## Scope

- Dependency: `EXT-ANTHROPIC-AGENT-SDK-AUTH`
- Recheck date: 2026-07-27
- Candidate: Round 21 implementation/test authority at
  `ec0df6b1a9d216366e08262cd96f5280686b04d0`; delivery safety checkpoint and
  current integrated state `c265d1a96da2a92846ec8a2629cc2abdb1a8bc8a`.
- Purpose: delivery/release risk recheck for the preserved exact Claude
  `auto|cli|api-key` selector, with `cli` as the default. This record is not
  legal clearance and does not authorize an authentication redesign.
- Implemented boundary: `auto` and `cli` retain established local caller
  environment and Claude account/configuration behavior without a vault lookup.
  Only explicit `api-key` resolves the
  `agentRuntime/claude_agent_sdk/apiKey` consumer from the Anthropic vault slot
  immediately before launch and replaces `ANTHROPIC_API_KEY` in the otherwise
  established environment. AutoByteus adds no Claude login UI, authentication
  broker, pooled account, credential relay, or hosted subscription traffic.

## Official Sources Rechecked

1. [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
   - The page remains dated June 16, 2026 and retains the June 15 pause notice.
   - The active notice says the proposed change is paused and that Agent SDK,
     `claude -p`, and third-party app usage still draw from subscription usage
     limits for now. The rest of the page is explicitly historical material.
2. [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
   - The setup path directs developers to an Anthropic API key or a supported
     cloud-provider authentication method.
   - Unless previously approved, third-party developers may not offer
     Claude.ai login or rate limits and are directed to the documented API-key
     methods.
3. [Claude Code legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)
   - OAuth is described as intended for subscribers' ordinary use of Claude
     Code and other native Anthropic applications.
   - Product and Agent SDK developers are directed to API keys or supported
     cloud providers and may not offer Claude.ai login or route Free/Pro/Max
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
- All four approved official pages were fetched again on 2026-07-27. Their
  material guidance remains tensioned but unchanged for this decision: API-key
  or supported cloud-provider authentication is the directed product path;
  third parties must not offer or relay Claude.ai login; and the separate June
  16 pause notice currently says Agent SDK/third-party usage can still draw from
  a subscriber's usage limits.
- The code and documentation therefore preserve the reviewed selector exactly:
  `auto|cli|api-key`, default `cli`, and vault resolution only for explicit
  `api-key`. Delivery did not add a fallback, login surface, identity
  impersonation, hosted relay, credential pooling, or a claim that `auto`/`cli`
  is permitted for every deployment model.
- This recheck does not establish permission, legal clearance, or safe-harbor
  interpretation for the local/self-hosted continuity path. Anyone deploying a
  product or service for others remains responsible for the applicable
  Anthropic terms and guidance.
- Repeat this recheck if finalization/release occurs later or an official source
  changes. If authoritative guidance unambiguously prohibits the exact approved
  path, stop release and route the behavior decision through
  `solution_designer`; delivery must not remove, convert, or fall back between
  modes on its own.
