## What's New
- Updated the curated provider catalog to the current flagship model identifiers, with explicit reselection for retired saved model IDs.
- Added auditable latest-schedule DeepSeek V4 pricing selection using UTC peak/off-peak windows.

## Improvements
- Preserved safe original provider messages after redaction while carrying canonical native error codes and supplemental provider evidence.
- Kept the application-agent SDK error stream provider-neutral with the exact `{ type: "ERROR", message: string }` shape.

## Fixes
- Stabilized missing or blank provider-key mapping with actionable provider-specific setup messages.
- Corrected native, Team, and application error transport and the related live-E2E trace-store API usage.
