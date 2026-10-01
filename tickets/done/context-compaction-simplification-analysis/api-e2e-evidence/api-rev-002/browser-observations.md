# API-C09 integrated browser evidence — 2026-09-26

- Actual Chrome via CUA (tab1211483147), Nuxt development renderer http://127.0.0.1:55719, bound backend http://127.0.0.1:55688; isolated owned SQLite/app data. In-app browser unavailable; used available Chrome. No mocked transport or alternate rendered component page. Tab closed after checks; no task popup remained. User tabs/desktop untouched.
- Normal /settings → Server Settings → Compaction configuration. Initial selector “Use current parent model”, trigger80%, save disabled; no algorithm/category/child selector.
- Selected live-discovered `LM Studio / qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234`; saved with normal Save compaction configuration button. HTTP GraphQL and actual `.env` confirmed exact tuple. Reloaded full page then reopened Server Settings: same selection. Selected current-parent and saved; HTTP confirmed both fields null. Artifacts API-C09-explicit-tuple.json / inherit-tuple.json.
- Invalid ratio draft0 displayed “Enter a percentage from 1 to 100.” and save remained disabled. Restored80 without Save. No invalid value committed.
- Seeded explicit unavailable model + temperature0.2 via normal HTTP mutation. Full reload → Server Settings displayed exact `api-rev-002-unavailable-model`, “Saved model is unavailable; it will not be silently replaced: api-rev-002-unavailable-model”, and Use model defaults. HTTP confirmed original tuple unchanged by UI. Restored owned null/null via HTTP before further live runs. Artifacts API-C09-unavailable-{seed,retained}.json.
- Created synthetic historical run using current serializer (strict-v5 validation), metadata store and raw store; separate historical episodic/semantic files. First seed attempt supplied wrong serializer metadata argument, rejected locally before any snapshot write; corrected to `{agent_id}` then validated before HTTP/browser use. No production guard changed.
- Normal /memory list → `api-rev-002-historical-agent` → `api-rev-002-historical-v5` → Memory Inspector.
  - Working Context: exact system head, historical audit-only INC-042/no-deployment/unrun-check summary, pending risk assessment, latest retained rollback request.
  - Episodic: `Historical inventory phase completed; no deployment.`
  - Semantic: `Historical owner: Mira Chen.`
  - Raw Traces: `raw_traces_active.jsonl (active) — 1 records`, `user #1 Synthetic raw request INC-042`.
  - All seeded file SHA256 values unchanged after navigation. API-C09-history-fixture.json / history-readonly.json.
- Accessibility state and supporting screenshots were observed through CUA in the execution conversation. No screenshot file is claimed. These are actual seeded reader/UI checks, not generation/resume of an existing private history.
- Live compaction status WebSocket→browser transition, browser failure→retry, complete saved-run launch/resume and Electron shell **Not Tested** this round; repository status/retry/core restore evidence remains separately attributed. Settings button from Memory did not change the browser page; explicit supported /settings route worked. No shell behavior certified or navigation defect origin inferred.
