## What's New
- Added stronger Claude Agent SDK stream ordering so assistant text, tool cards, and later assistant conclusions stay in the order Claude produced them.

## Improvements
- Improved live single-agent, team stream, and memory trace consistency for Claude text/tool/text turns.

## Fixes
- Fixed Claude post-tool assistant text rendering above tool cards by giving distinct Claude text blocks their own backend segment identities.
