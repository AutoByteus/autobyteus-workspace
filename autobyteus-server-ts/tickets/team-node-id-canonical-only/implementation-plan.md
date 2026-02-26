# Implementation Plan

## Scope Classification
- Classification: `Small`

## Plan Maturity
- Current Status: `Finalized`

## Solution Sketch
- Remove node-id alias service.
- Keep canonical remote node resolution in federated catalog (by discovery/baseUrl).
- Restore strict placement validation (no alias translation).
- Update tests to canonical-only semantics.

## Dependency And Sequencing Map
| Order | File/Module | Depends On | Why |
| --- | --- | --- | --- |
| 1 | `src/distributed/node-directory/node-id-alias-service.ts` | None | Remove obsolete compatibility layer |
| 2 | `src/federation/catalog/federated-catalog-service.ts` | 1 | Remove alias coupling; keep canonical resolver |
| 3 | `src/distributed/member-placement/member-placement-resolver.ts` | 1 | Remove alias translation from runtime placement |
| 4 | Test files | 2,3 | Verify behavior |

## Step-By-Step Plan
1. Remove alias service and imports/usages.
2. Keep canonical catalog path without alias registration.
3. Restore strict placement canonicalization rules.
4. Update unit/integration tests.
5. Run focused + distributed verification.
