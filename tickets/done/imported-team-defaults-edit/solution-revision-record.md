# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-003 | Mixed (Requirements + Design) | User decision: "all of them are editable … keep it simple" (2026-10-14) | N/A | SR-002 under review (paused) | Requirements Approved; design Ready | All (replaced) | Registered packages writable for Teams/Orgs; personal preferences withdrawn; Small / Low |
| SR-002 | Design | ARCH-REV-001 Fail (2026-10-14) | AR-001 (resolved), AR-002 | Design Ready (SR-001) | Design Ready (revised) | REQ-001, AC-003 | Semantic diff; no provider write on a default-only Agent Save; effective-value compare; store mutex; Org-owned Teams |
| SR-001 | Mixed (Requirements + Design) | URGENT PM Task 70a4e762 (2026-10-14); user decision DEC-001 | N/A | N/A | Requirements Approved; design Ready | REQ-001..006; AC-001..009 | Personal launch defaults in app data for imported definitions; Medium / High |

## Revision Entries

### SR-001 — Personal launch defaults for imported definitions

- Triggering: Task `project_task_70a4e762-6aa2-4e87-88da-43b8cdd80900`. Investigation found that Team/Org saves are refused by the `external_read_only` policy, while Agent saves write into the package checkout (verified uncommitted `agent-config.json` changes in `/Users/normy/autobyteus_org/autobyteus-agents`).
- User decision: "it should be kept in the app … this kind of setting belongs to individual user themselves" (2026-10-14).
- Solution Designer decisions DEC-002..005, within the user's direction:
  - Agent default edits move to the app too;
  - other imported Team/Org fields stay read-only, with a clear message;
  - app-data definitions are unchanged;
  - one rule for all registered packages.
- Intended behavior changed: Yes (new behavior; approved by the user decision above)
- Design: a preference store, a service-level overlay, a split update; `task_size=Medium`, `architectural_risk=High`
- Applied handoff-rule outcome: `handoff-architecture-design-complete.md`
- Next action: architecture review (urgent)

- SR-001 naming correction (user, 2026-10-14): "definition launch preference" was too generic. The store is renamed to `AgentLaunchPreferenceStore` (`launch-preferences/agent-launch-preference-store.ts`), the file to `agent-launch-preferences.json`, and the overlay to `applyAgentLaunchPreference`. This covers agents, Agent Teams and Agent Orgs; keys keep the `agent:` / `agent_team:` / `agent_org:` kind prefix. No behavior change.
- SR-001 UX refinement (user question 2026-10-14, "do we make them … read only?"): imported Team/Org edit pages show non-default fields read-only with a one-line package note, and Save sends only the default (REQ-004/AC-006, DEC-006). Imported Agents' other fields are unchanged in this fix (DEC-007, follow-up).

### SR-002 — Response to ARCH-REV-001

- AR-002: a server-side semantic `agentDefinitionFieldsChanged` decides whether to write; a default-only Save never writes package files; the other-fields path preserves the file's `defaultLaunchConfig`; hash test with the real form payload.
- AR-001 precision (present and normalized-different keys only) and the non-blocking notes (effective-value compare, store mutex, Org-owned Team overlay) adopted.
- Intended behavior changed: No. Approval impact: none.
- Next action: architecture re-review (urgent)

### SR-003 — Keep it simple: registered packages are editable

- Triggering:
  - After discussing package vs personal settings (tools, skills and the tested runtime/model belong in the package; the avatar is personal), the user decided: "Let's make it as they're just, all of them are editable. … No need to store in personal for individual … keep a simple solution for now." (2026-10-14)
  - Earlier in that discussion, the Solution Designer proposed an author/user split by package origin; the user chose the simpler rule.
- Intended behavior changed: Yes.
  - SR-001/SR-002 (personal app settings; package untouched) are withdrawn.
  - Teams/Orgs from registered packages become writable like Agents.
  - The Task's "package files stay untouched" is overridden by the user.
- Decisions:
  - DEC-001 (user);
  - DEC-002: delete follows save;
  - DEC-003: rename `external_read_only` → `registered_package`.
- Design: a source-class rename and a writability rule; `task_size=Small`, `architectural_risk=Low` → direct route.
- Architecture review: SR-001/SR-002 reviews (ARCH-REV-001) apply to the withdrawn design. The reviewer was asked to pause on 2026-10-14.
- Follow-ups:
  - avatar as a personal setting;
  - personal overrides for GitHub packages;
  - Agent save writing empty fields.
- Next action: implementation (direct route), beta, user check

- Follow-up recorded (2026-10-14): `/project_task_manager` created one Task, `project_task_7b2e681f-dba5-408d-862c-17d62c9bceeb` ("Personal settings vs. package files for agents, teams and orgs"), TODO, covering all four items in `follow-up-task-request.md`.
