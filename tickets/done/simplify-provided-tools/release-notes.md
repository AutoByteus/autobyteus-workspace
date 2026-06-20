## What's New
- Simplified the provided local agent tool surface while keeping useful skill-use tools together under `Skills`.
- Migrated `load_skill` from the legacy core `General` tool group into the server-owned `Skills` tool group, alongside `get_available_skills` and `get_skill_content`.
- Removed built-in AutoByteus skill-versioning controls, APIs, and the `create_skill_version` tool.

## Improvements
- `load_skill` now loads server-managed skills by name for runtime use, returns the skill base path and path-resolution guidance, and keeps resolvable skill Markdown links tool-ready as absolute paths.
- Skill creation and editing now manage normal skill files only; repository-backed skill history remains owned by external Git/GitHub workflows when needed.
- Product Tools/MCP browsing and management remain available while retired internal diagnostic tool cards disappear from the local tool catalog.

## Fixes
- Updated backend/core/frontend docs, GraphQL artifacts, localization, and targeted coverage to match the simplified Skills and provided-tools surface.
