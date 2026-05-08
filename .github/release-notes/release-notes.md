## What's New
- Added origin-aware browsing on the Agents page: Featured agents, Team-local agents grouped by team, Application agents grouped by application, and Shared agents.
- Centralized server platform built-in agent provisioning for Memory Compactor under the backend built-in-agent subsystem.
- Moved Daily Assistant to the private/user-managed agent package model at definition id `daily-assistant`; it can be featured through Settings when the private package root is configured.

## Improvements
- Search on the Agents page stays flat and separate from grouped browsing while still matching team/application provenance.
- Team-local agents from application-owned teams show both application and team context in browse grouping.
- Fresh runtimes now seed only the platform Memory Compactor built-in and initialize `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` when blank.

## Fixes
- Removed server auto-seeding and auto-featuring for Daily Assistant.
- Prevented old Daily Assistant ids (`super-ai-assistant`, `autobyteus-super-assistant`) from resolving as active aliases.
- Preserved the private Daily Assistant config shape while renaming it to `daily-assistant`.
