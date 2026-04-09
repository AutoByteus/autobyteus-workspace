# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Do not treat this document as an as-is trace of current behavior.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/skill-source-removal-refresh/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/skill-source-removal-refresh/implementation.md`

## Use Case Index

| use_case_id | Spine ID(s) | Governing Owner | Requirement ID(s) | Use Case Name |
| --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | `SkillSourcesModal` + `skills.vue` | `REQ-001`, `REQ-002`, `REQ-003` | Remove a skill source and reconcile the list plus selection |
| `UC-003` | `DS-002` | `SkillDetail` | `REQ-004` | Request a missing skill and recover without indefinite loading |

## Use Case: UC-001 [Remove a skill source and reconcile the list plus selection]

### Goal

After source removal succeeds, refresh the authoritative skills list and clear the selected skill if it no longer exists.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/skills/SkillSourcesModal.vue:confirmRemove()
├── autobyteus-web/stores/skillSourcesStore.ts:removeSkillSource(path) [ASYNC]
│   └── autobyteus-web/graphql/skillSources.ts:REMOVE_SKILL_SOURCE -> GraphQL mutation [IO]
├── autobyteus-web/stores/skillStore.ts:fetchAllSkills() [ASYNC]
│   └── autobyteus-web/graphql/skills.ts:GET_SKILLS -> GraphQL query [IO]
├── autobyteus-web/stores/skillStore.ts:skills.value = data.skills [STATE]
└── autobyteus-web/pages/skills.vue:watch(skills, selectedSkillName) [STATE]
    ├── if selected skill name still exists -> keep detail open
    └── if selected skill name no longer exists -> selectedSkillName = null [STATE]
```

### Fallback / Error Paths

```text
[ERROR] if removeSkillSource fails
autobyteus-web/components/skills/SkillSourcesModal.vue:confirmRemove()
└── leave current skill list untouched and surface existing modal error handling
```

```text
[ERROR] if fetchAllSkills fails after successful removal
autobyteus-web/components/skills/SkillSourcesModal.vue:confirmRemove()
└── modal/store error surfaces and the page avoids silently claiming a successful full refresh
```

## Use Case: UC-003 [Request a missing skill and recover without indefinite loading]

### Goal

Distinguish active loading from missing/error state so a removed skill never leaves the detail view spinning forever.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/skills/SkillDetail.vue:loadSkillDetails()
├── autobyteus-web/components/skills/SkillDetail.vue:set isLoading = true, clear loadError [STATE]
├── autobyteus-web/stores/skillStore.ts:fetchSkill(name) [ASYNC]
│   └── autobyteus-web/graphql/skills.ts:GET_SKILL -> GraphQL query [IO]
├── autobyteus-web/stores/skillStore.ts:currentSkill.value = null [STATE] # when query returns null
├── autobyteus-web/components/skills/SkillDetail.vue:detect null result [STATE]
├── autobyteus-web/components/skills/SkillDetail.vue:set loadError = "Skill not found..." [STATE]
└── autobyteus-web/components/skills/SkillDetail.vue:render recovery state with back action [STATE]
```

### Fallback / Error Paths

```text
[ERROR] if fetchSkill throws
autobyteus-web/components/skills/SkillDetail.vue:loadSkillDetails()
└── set a recoverable loadError message and stop loading
```
