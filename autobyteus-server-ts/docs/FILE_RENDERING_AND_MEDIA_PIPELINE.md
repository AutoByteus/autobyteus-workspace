# File Rendering and Media Pipeline (TypeScript)

## Scope

This document describes how media files are stored, served, and transformed in `autobyteus-server-ts`.

## Core Components

- Media storage service: `src/services/media-storage-service.ts`
- REST media routes: `src/api/rest/media.ts`
- File serving routes: `src/api/rest/files.ts`
- Upload endpoint: `src/api/rest/upload-file.ts`
- URL transformation processors:
  - `src/agent-customization/processors/response-customization/media-url-transformer-processor.ts`
  - `src/agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.ts`

## Storage Layout

Media is stored under `<app-data-dir>/media`:

- `images/`
- `audio/`
- `video/`
- `documents/`
- `others/`
- `ingested_context/`

`MediaStorageService` creates directories on initialization.

## URL Generation

Absolute URLs are based on `AppConfig.getBaseUrl()`.

All media URLs therefore depend on correct `AUTOBYTEUS_SERVER_HOST` configuration.

## Request Flow

1. File arrives via upload/tool/media endpoint.
2. File category and destination are resolved.
3. Physical file is persisted in app data media directory.
4. API response returns URL pointing to `/rest/files/...` path.

## Operational Notes

- Filenames are sanitized and collision-safe.
- Missing directories are created automatically.
- Invalid path/category access throws explicit errors.
