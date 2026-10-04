# Coarse controller measurements / discarded attempts

These times include CUA transport/actions/snapshot work and are not frame-accurate timings. Use `passive-ui-events.jsonl` / `timing-summary.json` for actual browser click/change-to-DOM timings.

- First Org library click → snapshot: 298 ms.
- First Org config click → initial snapshot (members still loading): 203 ms.
- First Codex runtime switch → initial snapshot (models still loading): 123 ms.
- Model selection → schema snapshot: 383 ms.
- Warm library+Org config → members-ready: 195 ms.
- Warm Codex selection+GPT-6.1 Sol selection: 636 ms.
- Warm Run Org → workspace heading visible: 697 ms.
- First selected Software Engineering Team → coordinator composer snapshot: 164 ms.
- Team library first snapshot: 3857 ms, confounded by concurrent synthetic history population and first dev dependencies; not causal evidence.
- Team config click → initial snapshot with 20 idle Orgs: 130 ms.
- Renderer reload → empty snapshot: 1668 ms; not a readiness result (Team draft intentionally does not survive reload).
- A later CUA click failed before dispatch/deadline; no valid application latency was measured. A fresh snapshot resolved control and later experiments succeeded.
- First launch tried an incorrect `New Agent Org` completion selector. The Org was created and workspace confirmed, but that attempt has no usable end-to-end timing.
- First dev compilation emitted dynamic-import errors/dependency optimization reloads. Do not present this as an installed-app bug, clean startup pass, or provider inference timing.
- Rejected GraphQL fields `ModelDetail.displayName`, `WorkspaceMetadata.id`, `Query.listAgentOrgRunHistory` remain in raw probes as explicit errors; excluded from all successful timing claims.
