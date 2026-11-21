# Follow-ups — cross-node-file-transfer-587 (autobyteus-587)

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, `requirements-doc.md` DEC-008 | The tool-call time limits of the Antigravity, Grok and ACP-based runtimes are unknown; a long file transfer may be cut by them | Our configs set only readiness timeouts (`grok-build-session-profile.ts:54`, `acp-agent-session-profile.ts:81`, `agy-mcp-config-materializer.ts`); measuring needs signed-in CLI runtimes | The transfer fails cleanly (RF-5); everything the ticket delivers works on Codex, Claude and AutoByteus | No | Measure each runtime's MCP tool-call limit with a slow stub tool in a signed-in test environment; where a setting exists, set it as for Codex and Claude; otherwise document the largest transfer that fits. | — |
