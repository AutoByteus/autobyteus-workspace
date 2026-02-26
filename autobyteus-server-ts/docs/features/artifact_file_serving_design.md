# Artifact File Serving Design (TypeScript)

## Scope

Covers storage and retrieval design for agent-produced artifacts.

## Relevant TS Modules

- Artifact domain/service:
  - `src/agent-artifacts/domain`
  - `src/agent-artifacts/services/artifact-service.ts`
- GraphQL API:
  - `src/api/graphql/types/agent-artifact.ts`
- Media/file serving:
  - `src/api/rest/files.ts`
  - `src/services/media-storage-service.ts`

## High-Level Flow

1. Tool/result processor persists artifact metadata.
2. Artifact references include a retrievable URL/path.
3. File endpoints serve bytes by validated storage path.

## Requirements

- Path safety checks before serving.
- Stable URL construction using configured base URL.
- Clear handling for missing artifact files.
