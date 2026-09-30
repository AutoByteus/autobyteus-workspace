# chat-entry-desk-package — fake test data for chat-interface-entry desktop validation

Import in the isolated app: Settings → Agent Packages → path of this folder → Import.

- `agents/desk-lead` — configured agent (skill `desk-alpha`), team coordinator.
- `agents/desk-helper` — configured agent owning two bundled skills:
  - `desk-alpha` → reply marker `DESK-ALPHA-OK`
  - `desk-beta`  → reply marker `DESK-BETA-OK`
- `agent-teams/desk-team` — Desk Team: `lead` (coordinator, shared `desk-lead`) + `helper` (shared `desk-helper`).

The Daily Assistant (ALL_INSTALLED) sees both bundled skills after import.
