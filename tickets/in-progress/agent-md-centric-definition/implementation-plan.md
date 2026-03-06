# Implementation Plan — Agent-MD-Centric Definition

- **Status**: Active (2026-03-06 addendum planning)
- **Stage**: 3
- **Design Basis**: `proposed-design.md` v2 + definition-source v1 addendum
- **Date**: 2026-03-06

---

## Execution Order (Bottom-Up, Dependency-First)

### Phase 1 — Infrastructure Foundations
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-01 | C-034 | `src/persistence/file/store-utils.ts` | Add `writeRawFile()` helper | None |
| T-02 | C-014 | `src/config/app-config.ts` | Add 4 new path helpers | None |

### Phase 2 — Parser Utilities
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-03 | C-015 | `src/agent-definition/utils/agent-md-parser.ts` | Add (new file) | T-02 |
| T-04 | C-016 | `src/agent-team-definition/utils/team-md-parser.ts` | Add (new file) | T-02 |

### Phase 3 — Domain Models
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-05 | C-001 | `src/agent-definition/domain/models.ts` | Modify | None |
| T-06 | C-006 | `src/agent-team-definition/domain/models.ts` | Modify | None |

### Phase 4 — Backend Providers & Services
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-07 | C-002 | `src/agent-definition/providers/file-agent-definition-provider.ts` | Rewrite | T-01, T-02, T-03, T-05 |
| T-08 | C-003+C-004 | `file-agent-prompt-mapping-provider.ts` + `agent-prompt-mapping-persistence-provider.ts` | Remove | T-07 |
| T-09 | C-005 | `src/agent-definition/services/agent-definition-service.ts` | Modify | T-07, T-08 |
| T-10 | C-009 | `src/agent-definition/utils/prompt-loader.ts` (move from prompt-engineering) | Move + Rewrite | T-02, T-03 |
| T-11 | C-007 | `src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Rewrite | T-01, T-02, T-04, T-06 |
| T-12 | C-008 | `src/prompt-engineering/` (entire directory) | Remove | T-09, T-10 |

### Phase 5 — GraphQL API
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-13 | C-010 | `src/api/graphql/types/agent-definition.ts` | Modify | T-09 |
| T-14 | C-011 | `src/api/graphql/types/prompt.ts` | Remove | T-12 |
| T-15 | C-012+C-033 | `src/api/graphql/types/agent-team-definition.ts` | Modify + Add templates query | T-11 |

### Phase 6 — Node Sync
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-16 | C-013 | `src/sync/services/node-sync-service.ts` | Modify | T-02, T-09 |

### Phase 7 — Frontend Cleanup (Remove Prompt Engineering)
| Task | Change ID | Files | Type | Dependency |
|------|-----------|-------|------|------------|
| T-17 | C-017–C-021, C-032 | All prompt-engineering components, stores, GraphQL docs, routes | Remove | None |

### Phase 8 — Frontend Updates (Agent + Team Forms)
| Task | Change ID | Files | Type | Dependency |
|------|-----------|-------|------|------------|
| T-18 | C-025+C-026 | `graphql/mutations/agentDefinitionMutations.ts` + `queries/agentDefinitionQueries.ts` | Modify | T-17 |
| T-19 | C-024 | `stores/agentDefinitionStore.ts` | Modify | T-18 |
| T-20 | C-022+C-023 | `AgentDefinitionForm.vue` + `AgentDetail.vue` | Modify | T-19 |
| T-21 | C-029+C-030 | `graphql/mutations/agentTeamDefinitionMutations.ts` + queries | Modify | T-17 |
| T-22 | C-028 | `stores/agentTeamDefinitionStore.ts` | Modify | T-21 |
| T-23 | C-027 | `AgentTeamDefinitionForm.vue` | Modify | T-22 |
| T-24 | C-031 | `AgentDuplicateButton.vue` (new) | Add | T-19 |

---

## Addendum — Definition Sources V1 (Settings-Based Source Paths)

### Phase 9 — Backend Definition Source Registration + Multi-Source Reads
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-48 | C-035 | `src/config/app-config.ts` | Add `AUTOBYTEUS_DEFINITION_SOURCE_PATHS` parsing (`getAdditionalDefinitionSourceRoots`) | None |
| T-49 | C-036 | `src/definition-sources/services/definition-source-service.ts` (new) | Add service for list/add/remove source paths + cache refresh hooks | T-48 |
| T-50 | C-037 | `src/api/graphql/types/definition-sources.ts` (new) + `schema.ts` | Add GraphQL query/mutations for definition sources | T-49 |
| T-51 | C-038 | `src/agent-definition/providers/file-agent-definition-provider.ts` | Add multi-source read aggregation (default + additional roots, precedence) | T-48 |
| T-52 | C-039 | `src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Add multi-source read aggregation (default + additional roots, precedence) | T-48 |

### Phase 10 — Frontend Settings UX + Source Store
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-53 | C-040 | `autobyteus-web/graphql/definitionSources.ts` (new) | Add definition source GraphQL documents | T-50 |
| T-54 | C-041 | `autobyteus-web/stores/definitionSourcesStore.ts` (new) | Add Pinia store for source list/add/remove | T-53 |
| T-55 | C-042 | `autobyteus-web/components/settings/DefinitionSourcesManager.vue` (new) | Add settings manager component for source paths | T-54 |
| T-56 | C-043 | `autobyteus-web/pages/settings.vue` + settings tests | Add `Definition Sources` nav section and content rendering | T-55 |

### Phase 11 — Test Additions for V1 Source Behavior
| Task | Change ID | File | Type | Dependency |
|------|-----------|------|------|------------|
| T-57 | C-044 | `tests/unit/config/app-config.test.ts` | Add coverage for additional definition source path parsing | T-48 |
| T-58 | C-045 | `tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts` (new) | Add API/E2E for add/remove source and aggregated reads | T-50, T-51, T-52 |
| T-59 | C-046 | `autobyteus-web/components/settings/__tests__/DefinitionSourcesManager.spec.ts` (new) + `pages/__tests__/settings.spec.ts` | Add frontend integration/unit coverage for settings source UX | T-56 |
