# API-F001 source evidence (read-only)

Target `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts:232..236` constructs ClaudeSessionManager with an authority containing activateForRun only. Base `git show 32aca0818e:<target>` contains exactly the same incomplete authority. Current public `src/agent-tools/mcp/agent-tool-mcp-session-authority.ts` requires both activation and `deactivateForRun(runId: string): number`. Current real `src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts:49..52` release closes admission, calls deactivateForRun(runId), and clears activation. Returning not_exposed during activation does not make the release method optional.

`ClaudeSessionCleanup.cleanupSessionResources` independently attempts process/listener/skills/MCP proof and throws if any fails. `ClaudeSessionManager.releaseExactSession` deletes the exact registered session only after that succeeds. Thus the retained hasRunSession=true observation is correct for the malformed test dependency, not a production-release defect.

Both target-1 and clean serial target-2 per-case serialized error trees contain only missing deactivateForRun TypeError and retained-session assertion for every deterministic case. Original body/physical-child/IO assertions emit no failure. These cases remain failed; no patched-source candidate was run. Fixture test correction requires focused origin/owner review first.

Read-only whitespace and scope checks: `git diff --check` clean; `git diff --quiet 32aca0818e HEAD -- autobyteus-server-ts/src autobyteus-server-ts/tests/fixtures/claude-owned-sdk-cli.mjs` exit 0. No durable API/test or production source modification occurred.
