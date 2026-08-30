# API-REV-001 Live Harness Stabilization Notes

The retained passing logs are authoritative. Before those runs, validation exposed and corrected only E2E-harness/expectation defects:

- The live model selector could choose a cloud Qwen catalog entry when LM Studio's dynamic catalog had not yet been ensured. The durable runtime tests now call `ensureProviderModelCatalog(providerId: "LMSTUDIO")` before selection.
- The task-Team scenario waited for a synthetic `SYSTEM_TASK` copy on the parent Team WebSocket even though the fresh task Team lead owns a distinct run stream. The stale parent-stream assertion was removed; the scenario directly validates the durable `TASK_TEAM_ACTIVATED` projection, fresh coordinator identity, task packet, and public result.
- The three-provider intent scenario was made deterministic without forcing a tool: it supplies the returned exact ingress byte-for-byte for clarification, keeps the task worker passive, and asserts exact content plus event counts.
- The unchanged optional all-runtime directed-message matrix was explored but not used as pass evidence because probabilistic recipient prose/tool turns were inconsistent. Experimental edits to that file were reverted. Logical Agent identity is directly covered by focused native/integration tests; exact Codex MCP identity is covered by the retained standalone live run; configured AutoByteus/Codex/Claude tool choice is covered by the retained three-provider live run.

No production source defect was identified by these stabilization attempts.
